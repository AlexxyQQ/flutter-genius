import * as vscode from "vscode";
import * as path from "path";
import {
  getClassAtPosition,
  extractFields,
  extractImports,
} from "../utils/dart_parser";
import {
  getRelativeImportPath,
  writeFile,
  fixRelativeImport,
} from "../utils/file_manager";
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
  const fullText = document.getText(); // Get full text to extract imports

  // 1. Detect Class
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

  // 2. Extract Imports
  const rawImports = extractImports(fullText);

  // 3. Extract Fields
  let fields = extractFields(classBody, isFreezed);

  if (fields.length === 0) {
    vscode.window.showErrorMessage(`No fields found.`);
    return;
  }

  // 4. Enum Analysis
  const unannotatedEnums: string[] = [];
  fields = await Promise.all(
    fields.map(async (field) => {
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
            unannotatedEnums.push(field.cleanType);
          }
        }
      }
      return field;
    })
  );

  // ---------------------------------------------------------
  // 5. REGENERATE ENTITY
  // ---------------------------------------------------------
  const fileName = path.basename(filePath);

  // Pass existing imports to the entity generator
  const newEntityContent = generateNormalEntityContent(
    className,
    fileName,
    fields,
    rawImports
  );

  await writeFile(filePath, newEntityContent);
  vscode.window.showInformationMessage(
    `Updated ${className} (preserved imports).`
  );

  // ---------------------------------------------------------
  // 6. PREPARE MODEL PATHS
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

  // ---------------------------------------------------------
  // 7. FIX IMPORTS FOR MODEL
  // ---------------------------------------------------------
  // Since the Model is in a different folder, relative imports (../enums/x.dart)
  // will break unless we recalculate them.
  const modelImports = rawImports.map((imp) => {
    return fixRelativeImport(imp, entityDir, modelDir);
  });

  // 8. Generate Model Content
  const modelClassName = className.replace("Entity", "Model");
  const relativeImportPath = getRelativeImportPath(modelDir, filePath);

  const modelContent = generateNormalModelContent(
    modelClassName,
    className,
    relativeImportPath,
    modelFileName,
    fields,
    modelImports // Pass the recalculated imports
  );

  // 9. Write Model File
  try {
    await writeFile(targetPath, modelContent);
    const doc = await vscode.workspace.openTextDocument(targetPath);
    await vscode.window.showTextDocument(doc);

    if (unannotatedEnums.length > 0) {
      vscode.window.showWarningMessage(
        `Generated Model. Warning: Check Enums [${unannotatedEnums.join(
          ", "
        )}].`
      );
    } else {
      vscode.window.showInformationMessage(
        `Generated ${modelClassName} successfully.`
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to generate: ${error.message}`);
  }
}
