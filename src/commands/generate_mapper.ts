import * as vscode from "vscode";
import * as path from "path";
import { getClassAtPosition, extractFields } from "../utils/dart_parser";
import { getRelativeImportPath, writeFile } from "../utils/file_manager";
import { generateFreezedModelContent } from "../templates/freezed_model";
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

  const { className, classBody } = classInfo;
  if (!className.endsWith("Entity")) {
    vscode.window.showErrorMessage(
      `Selected class "${className}" must end in "Entity".`
    );
    return;
  }

  // 2. Prepare Paths & Directories
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

  // 3. Extract Fields
  let fields = extractFields(classBody);
  if (fields.length === 0) {
    vscode.window.showErrorMessage(`No final fields found in ${className}.`);
    return;
  }

  // --- NEW: ASYNC ENUM DETECTION ---
  const unannotatedEnums: string[] = [];
  const extraImports: string[] = [];

  // We must await the analysis of all fields
  fields = await Promise.all(
    fields.map(async (field) => {
      // Skip basic types and generic containers
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

            // Optional: Track file path to add import later
            // if (analysis.filePath) extraImports.push(analysis.filePath);
          } else {
            unannotatedEnums.push(field.cleanType);
          }
        }
      }
      return field;
    })
  );
  // ---------------------------------

  // 4. Determine File Names
  const snakeClassName = toSnakeCase(className);
  let baseName = snakeClassName;
  if (baseName.endsWith("_entity")) {
    baseName = baseName.substring(0, baseName.length - "_entity".length);
  }
  const modelFileName = `${baseName}_model.dart`;
  const targetPath = path.join(modelDir, modelFileName);

  // 5. Generate Code
  const modelClassName = className.replace("Entity", "Model");
  const relativeImportPath = getRelativeImportPath(modelDir, filePath);

  const fileContent = generateFreezedModelContent(
    modelClassName,
    className,
    relativeImportPath,
    modelFileName,
    fields
  );

  // 6. Write File
  try {
    await writeFile(targetPath, fileContent);
    const doc = await vscode.workspace.openTextDocument(targetPath);
    await vscode.window.showTextDocument(doc);

    // 7. Feedback
    if (unannotatedEnums.length > 0) {
      const unique = [...new Set(unannotatedEnums)].join(", ");
      vscode.window.showInformationMessage(
        `Generated! ℹ️ Note: Enums [${unique}] lack JsonEnum annotations.`
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
