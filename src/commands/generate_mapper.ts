import * as vscode from "vscode";
import * as path from "path";
import { getClassAtPosition, extractFields } from "../utils/dart_parser";
import { getRelativeImportPath, writeFile } from "../utils/file_manager";
import { generateFreezedModelContent } from "../templates/freezed_model";
import { generateFreezedEntityContent } from "../templates/freezed_entity"; // Import new template
import { toSnakeCase } from "../utils/string_utils";
import { analyzeTypeForEnum } from "../utils/enum_detector";

export async function generateEntityToModelCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const entityDir = path.dirname(filePath);

  // 1. Detect Class
  const cursorPosition = editor.selection.active;
  const classInfo = getClassAtPosition(document, cursorPosition);

  if (!classInfo) {
    vscode.window.showErrorMessage(
      "No class found at current cursor position."
    );
    return;
  }

  const { className, classBody, isFreezed } = classInfo;

  if (!className.endsWith("Entity")) {
    vscode.window.showErrorMessage(
      `Selected class "${className}" must end in "Entity".`
    );
    return;
  }

  // 2. Extract Fields (Handles both Normal and Freezed via updated parser)
  let fields = extractFields(classBody, isFreezed);

  if (fields.length === 0) {
    vscode.window.showErrorMessage(`No fields found in ${className}.`);
    return;
  }

  // 3. ENUM DETECTION (Same as before)
  const unannotatedEnums: string[] = [];
  fields = await Promise.all(
    fields.map(async (field) => {
      if (
        !field.isList &&
        !field.isMap &&
        !field.isEntity &&
        !["String", "int", "double", "bool", "DateTime"].includes(
          field.cleanType
        )
      ) {
        const analysis = await analyzeTypeForEnum(field.cleanType);
        if (analysis.isEnum) {
          field.isEnum = true;
          if (analysis.hasAnnotation && analysis.converterName) {
            field.converterName = analysis.converterName;
          } else {
            unannotatedEnums.push(field.cleanType);
          }
        }
      }
      return field;
    })
  );

  // ---------------------------------------------------------
  // 4. IF NORMAL CLASS -> CONVERT TO FREEZED ENTITY (IN PLACE)
  // ---------------------------------------------------------
  if (!isFreezed) {
    const fileName = path.basename(filePath);
    const newEntityContent = generateFreezedEntityContent(
      className,
      fileName,
      fields
    );

    // Write to the CURRENT file
    await writeFile(filePath, newEntityContent);

    // Provide immediate feedback about the conversion
    vscode.window.showInformationMessage(
      `Converted ${className} to Freezed Entity! (Run build_runner)`
    );
  }

  // ---------------------------------------------------------
  // 5. PREPARE MODEL PATHS
  // ---------------------------------------------------------
  let modelDir = "";
  if (entityDir.includes(path.join("domain", "entities"))) {
    modelDir = entityDir.replace(
      path.join("domain", "entities"),
      path.join("data", "models")
    );
  } else if (entityDir.includes("domain")) {
    modelDir = entityDir.replace("domain", path.join("data", "models"));
  } else {
    modelDir = path.join(path.dirname(entityDir), "data", "models");
  }

  const snakeClassName = toSnakeCase(className);
  let baseName = snakeClassName;
  if (baseName.endsWith("_entity")) {
    baseName = baseName.substring(0, baseName.length - "_entity".length);
  }
  const modelFileName = `${baseName}_model.dart`;
  const targetPath = path.join(modelDir, modelFileName);

  // 6. GENERATE MODEL CONTENT
  const modelClassName = className.replace("Entity", "Model");
  const relativeImportPath = getRelativeImportPath(modelDir, filePath);

  const fileContent = generateFreezedModelContent(
    modelClassName,
    className,
    relativeImportPath,
    modelFileName,
    fields
  );

  // 7. WRITE MODEL FILE
  try {
    await writeFile(targetPath, fileContent);

    // Open the new Model file
    const doc = await vscode.workspace.openTextDocument(targetPath);
    await vscode.window.showTextDocument(doc);

    if (unannotatedEnums.length > 0) {
      const unique = [...new Set(unannotatedEnums)].join(", ");
      vscode.window.showInformationMessage(
        `Generated Model! ℹ️ Note: Enums [${unique}] lack JsonEnum annotations.`
      );
    } else {
      vscode.window.showInformationMessage(
        `Generated Freezed model: ${modelClassName}`
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to generate: ${error.message}`);
  }
}
