import * as vscode from "vscode";
import * as path from "path";
import { getClassAtPosition, extractFields } from "../utils/dart_parser";
import { getRelativeImportPath, writeFile } from "../utils/file_manager";
// Import NEW templates
import { generateNormalEntityContent } from "../templates/normal_entity";
import { generateNormalModelContent } from "../templates/normal_model";
import { toSnakeCase } from "../utils/string_utils";
import { analyzeTypeForEnum } from "../utils/enum_detector";

export async function generateEntityToModelCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const entityDir = path.dirname(filePath);

  // 1. Detect Class at Cursor
  const cursorPosition = editor.selection.active;
  const classInfo = getClassAtPosition(document, cursorPosition);

  if (!classInfo) {
    vscode.window.showErrorMessage("No class found at cursor.");
    return;
  }

  const { className, classBody, isFreezed } = classInfo;

  if (!className.endsWith("Entity")) {
    vscode.window.showErrorMessage(
      `Class "${className}" must end in "Entity".`
    );
    return;
  }

  // 2. Extract Fields
  // We reuse the updated parser which handles Normal classes well
  let fields = extractFields(classBody, isFreezed);

  if (fields.length === 0) {
    vscode.window.showErrorMessage(`No fields found in ${className}.`);
    return;
  }

  // 3. Detect Enums (For @Converter annotations)
  const unannotatedEnums: string[] = [];
  fields = await Promise.all(
    fields.map(async (field) => {
      // Skip logic for primitives/maps/lists/entities
      if (
        !field.isList &&
        !field.isMap &&
        !field.isEntity &&
        !["String", "int", "double", "bool", "DateTime", "dynamic"].includes(
          field.cleanType
        )
      ) {
        const analysis = await analyzeTypeForEnum(field.cleanType);
        if (analysis.isEnum) {
          field.isEnum = true;
          if (analysis.hasAnnotation && analysis.converterName) {
            field.converterName = analysis.converterName;
          } else {
            // Track enums that might need attention
            unannotatedEnums.push(field.cleanType);
          }
        }
      }
      return field;
    })
  );

  // ---------------------------------------------------------
  // 4. REGENERATE ENTITY (To add @CopyWith and standard formatting)
  // ---------------------------------------------------------
  // We always regenerate the entity to ensure it matches the
  // CopyWithExtension requirements structure.

  const fileName = path.basename(filePath);
  const newEntityContent = generateNormalEntityContent(
    className,
    fileName,
    fields
  );

  await writeFile(filePath, newEntityContent);
  vscode.window.showInformationMessage(`Updated ${className} with @CopyWith!`);

  // ---------------------------------------------------------
  // 5. PREPARE MODEL PATHS
  // ---------------------------------------------------------
  // Logic to switch from /domain/entities -> /data/models
  let modelDir = "";
  if (entityDir.includes(path.join("domain", "entities"))) {
    modelDir = entityDir.replace(
      path.join("domain", "entities"),
      path.join("data", "models")
    );
  } else if (entityDir.includes("domain")) {
    modelDir = entityDir.replace("domain", path.join("data", "models"));
  } else {
    // Fallback: create ../data/models relative to current
    modelDir = path.join(path.dirname(entityDir), "data", "models");
  }

  const snakeClassName = toSnakeCase(className);
  let baseName = snakeClassName;
  // Remove _entity suffix for the model filename (user_entity -> user_model.dart)
  if (baseName.endsWith("_entity")) {
    baseName = baseName.substring(0, baseName.length - "_entity".length);
  }
  const modelFileName = `${baseName}_model.dart`;
  const targetPath = path.join(modelDir, modelFileName);

  // ---------------------------------------------------------
  // 6. GENERATE MODEL CONTENT
  // ---------------------------------------------------------
  const modelClassName = className.replace("Entity", "Model");
  const relativeImportPath = getRelativeImportPath(modelDir, filePath);

  const modelContent = generateNormalModelContent(
    modelClassName,
    className,
    relativeImportPath,
    modelFileName,
    fields
  );

  // ---------------------------------------------------------
  // 7. WRITE FILE & FEEDBACK
  // ---------------------------------------------------------
  try {
    await writeFile(targetPath, modelContent);

    // Open the new Model file for the user
    const doc = await vscode.workspace.openTextDocument(targetPath);
    await vscode.window.showTextDocument(doc);

    // Warning about Missing Enum Annotations
    if (unannotatedEnums.length > 0) {
      const unique = [...new Set(unannotatedEnums)].join(", ");
      vscode.window.showWarningMessage(
        `Generated Model! Warning: Enums [${unique}] may need manual @JsonEnum / Converter setup.`
      );
    } else {
      vscode.window.showInformationMessage(
        `Generated ${modelClassName} successfully!`
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to generate: ${error.message}`);
  }
}
