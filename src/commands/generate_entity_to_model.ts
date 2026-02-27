/**
 * generate_entity_to_model.ts
 * ----------------
 * VSCode command: "flutter-genius.generateEntityToModel"
 *
 * What it does:
 *   1. Finds the entity class under the cursor.
 *   2. Validates it ends in "Entity".
 *   3. Extracts all fields from the class body.
 *   4. Runs enum detection on unknown types.
 *   5. If the entity is a plain Dart class, rewrites it as a Freezed entity in-place.
 *   6. Resolves the target model directory (domain/entities → data/models).
 *   7. Generates the Freezed model file and opens it in the editor.
 */

import * as vscode from "vscode";
import * as path from "path";

import { getClassAtPosition, extractFields, FieldInfo } from "../utils/dart_parser";
import { analyzeTypeForEnum } from "../utils/enum_detector";
import { getRelativeImportPath, writeFile } from "../utils/file_manager";
import { toSnakeCase } from "../utils/string_utils";
import { generateFreezedEntityContent } from "../templates/freezed_entity";
import { generateFreezedModelContent } from "../templates/freezed_model";

// ---------------------------------------------------------------------------
// Known primitive / built-in Dart types — skip enum detection for these
// ---------------------------------------------------------------------------
const PRIMITIVE_TYPES = new Set([
  "String", "int", "double", "bool", "DateTime",
]);

// ---------------------------------------------------------------------------
// Command Entry Point
// ---------------------------------------------------------------------------

/**
 * Main command handler. Registered as "flutter-genius.generateEntityToModel".
 */
export async function generateEntityToModelCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const entityDir = path.dirname(filePath);

  // ------------------------------------------------------------------
  // Step 1: Find the entity class at the cursor
  // ------------------------------------------------------------------
  const cursorPosition = editor.selection.active;
  const classInfo = getClassAtPosition(document, cursorPosition);

  if (!classInfo) {
    vscode.window.showErrorMessage("No class found at the current cursor position.");
    return;
  }

  const { className, classBody, isFreezed } = classInfo;

  if (!className.endsWith("Entity")) {
    vscode.window.showErrorMessage(
      `"${className}" does not end in "Entity". Place your cursor inside an entity class.`
    );
    return;
  }

  // ------------------------------------------------------------------
  // Step 2: Extract fields
  // ------------------------------------------------------------------
  let fields = extractFields(classBody, isFreezed);

  if (fields.length === 0) {
    vscode.window.showErrorMessage(`No fields found in "${className}".`);
    return;
  }

  // ------------------------------------------------------------------
  // Step 3: Detect enums in field types
  // ------------------------------------------------------------------
  const unannotatedEnums: string[] = [];

  fields = await Promise.all(
    fields.map((field) => enrichFieldWithEnumInfo(field, unannotatedEnums))
  );

  // ------------------------------------------------------------------
  // Step 4 (optional): Convert plain entity → Freezed entity in-place
  // ------------------------------------------------------------------
  if (!isFreezed) {
    const entityFileName = path.basename(filePath);
    const newEntityContent = generateFreezedEntityContent(className, entityFileName, fields);

    await writeFile(filePath, newEntityContent);

    vscode.window.showInformationMessage(
      `Converted "${className}" to a Freezed entity. Run build_runner to regenerate parts.`
    );
  }

  // ------------------------------------------------------------------
  // Step 5: Resolve model output directory and file path
  // ------------------------------------------------------------------
  const modelDir = resolveModelDirectory(entityDir);
  const baseName = deriveBaseName(className);
  const modelFileName = `${baseName}_model.dart`;
  const modelFilePath = path.join(modelDir, modelFileName);

  // ------------------------------------------------------------------
  // Step 6: Generate model file content
  // ------------------------------------------------------------------
  const modelClassName = className.replace("Entity", "Model");
  const entityImportPath = getRelativeImportPath(modelDir, filePath);

  const fileContent = generateFreezedModelContent(
    modelClassName,
    className,
    entityImportPath,
    modelFileName,
    fields
  );

  // ------------------------------------------------------------------
  // Step 7: Write model file and open it
  // ------------------------------------------------------------------
  try {
    await writeFile(modelFilePath, fileContent);

    const doc = await vscode.workspace.openTextDocument(modelFilePath);
    await vscode.window.showTextDocument(doc);

    if (unannotatedEnums.length > 0) {
      const uniqueEnums = [...new Set(unannotatedEnums)].join(", ");
      vscode.window.showWarningMessage(
        `Model generated. Note: [${uniqueEnums}] appear to be enums without a @JsonEnum / JsonConverter — add them manually.`
      );
    } else {
      vscode.window.showInformationMessage(`Generated "${modelClassName}" successfully.`);
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to write model file: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Runs enum detection on a field and mutates it with isEnum / converterName.
 * Also pushes to `unannotatedEnums` when an enum has no ready-to-use converter.
 */
async function enrichFieldWithEnumInfo(
  field: FieldInfo,
  unannotatedEnums: string[]
): Promise<FieldInfo> {
  // Only analyse types that could be enums (not primitives, lists, maps, entities)
  if (
    field.isList ||
    field.isMap ||
    field.isEntity ||
    PRIMITIVE_TYPES.has(field.cleanType)
  ) {
    return field;
  }

  const analysis = await analyzeTypeForEnum(field.cleanType);

  if (!analysis.isEnum) {
    return field;
  }

  field.isEnum = true;

  if (analysis.hasConverter && analysis.converterName) {
    field.converterName = analysis.converterName;
  } else {
    unannotatedEnums.push(field.cleanType);
  }

  return field;
}

/**
 * Resolves the target model directory given the entity's directory.
 *
 * Mapping rules (in priority order):
 *   .../domain/entities → .../data/models
 *   .../domain/...      → .../data/models
 *   anything else       → sibling "data/models" directory
 */
function resolveModelDirectory(entityDir: string): string {
  const domainEntitiesSegment = path.join("domain", "entities");
  const domainSegment = "domain";

  if (entityDir.includes(domainEntitiesSegment)) {
    return entityDir.replace(domainEntitiesSegment, path.join("data", "models"));
  }

  if (entityDir.includes(domainSegment)) {
    return entityDir.replace(domainSegment, path.join("data", "models"));
  }

  // Fallback: put the model next to a "data/models" sibling folder
  return path.join(path.dirname(entityDir), "data", "models");
}

/**
 * Derives the snake_case base name for the model file from the entity class name.
 *
 * Example:
 *   "AccountEntity" → "account"     → model file: "account_model.dart"
 */
function deriveBaseName(className: string): string {
  let baseName = toSnakeCase(className);
  if (baseName.endsWith("_entity")) {
    baseName = baseName.slice(0, -"_entity".length);
  }
  return baseName;
}
