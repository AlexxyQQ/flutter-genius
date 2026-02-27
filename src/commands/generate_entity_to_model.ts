/**
 * generate_entity_to_model.ts
 * ----------------
 * VSCode command: "flutter-genius.generateEntityToModel"
 *
 * Full flow:
 *   1. Find the entity class under the cursor. Validate it ends in "Entity".
 *   2. Scan the file for other declarations (entities, enums, mixins).
 *   3. If multiple declarations exist, ask the user:
 *
 *        YES → Separate enums to lib/config/constants/enums/app_specifics/,
 *               other entities to the same directory, rewrite original file.
 *               Then generate a model file for the MAIN entity only.
 *
 *        NO  → Keep the source file as-is.
 *               If the file has multiple entity classes, generate ONE combined
 *               model file containing all of them.
 *               If there is only one entity, generate the single model file.
 *
 *   4. Extract fields, detect enums, optionally convert plain → Freezed.
 *   5. Write the model file and open it.
 */

import * as vscode from "vscode";
import * as path from "path";

import {
  getClassAtPosition,
  getAllDeclarations,
  extractFields,
  DeclarationInfo,
  FieldInfo,
} from "../utils/dart_parser";
import { analyzeTypeForEnum } from "../utils/enum_detector";
import { getRelativeImportPath, writeFile } from "../utils/file_manager";
import { toSnakeCase } from "../utils/string_utils";
import { separateDeclarations } from "../utils/entity_separator";
import { generateFreezedEntityContent } from "../templates/freezed_entity";
import {
  generateFreezedModelContent,
  generateCombinedFreezedModelContent,
  ModelSpec,
} from "../templates/freezed_model";

// ---------------------------------------------------------------------------
// Primitive types — skip enum detection for these
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

  // ── Step 1: Find the entity class at the cursor ────────────────────────────
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

  // ── Step 2: Check for other declarations in the file ──────────────────────
  const allDeclarations = getAllDeclarations(document.getText());
  const otherDeclarations = allDeclarations.filter((d) => d.name !== className);

  if (otherDeclarations.length > 0) {
    const enumCount  = otherDeclarations.filter((d) => d.type === "enum").length;
    const classCount = otherDeclarations.filter((d) => d.type === "class").length;

    const parts: string[] = [];
    if (classCount > 0) { parts.push(`${classCount} entity class${classCount > 1 ? "es" : ""}`); }
    if (enumCount  > 0) { parts.push(`${enumCount} enum${enumCount > 1 ? "s" : ""}`); }
    const foundDesc = parts.join(" and ");

    const choice = await vscode.window.showQuickPick(
      [
        {
          label: "$(files) Yes — separate into individual files",
          description: "Enums → lib/config/constants/enums/app_specifics/  |  Entities → same folder",
          picked: true,
          value: "yes",
        },
        {
          label: "$(file) No — keep everything in this file",
          description: "All models will be combined into one model file",
          value: "no",
        },
      ],
      {
        title: "Flutter Genius: Multiple Declarations Found",
        placeHolder: `Found ${foundDesc} alongside "${className}". Separate them first?`,
        ignoreFocusOut: true,
      }
    );

    if (!choice) {
      return; // User dismissed
    }

    if (choice.value === "yes") {
      // ── YES: separate → then generate model for the main entity only ──────
      await separateDeclarations(document, allDeclarations, className, filePath);
      vscode.window.showInformationMessage(
        `Separated ${otherDeclarations.length} declaration(s). Generating model for "${className}"...`
      );
      // Fall through to single-entity model generation below.

    } else {
      // ── NO: keep all entities in one file → combined model ────────────────
      const entityDecls = allDeclarations.filter(
        (d) => d.type === "class" && d.name.endsWith("Entity")
      );

      if (entityDecls.length > 1) {
        await generateCombinedModel(entityDecls, filePath, entityDir);
        return; // Done — skip the single-entity path below
      }
      // Single entity with non-entity declarations: fall through
    }
  }

  // ── Steps 3–8: Single-entity model generation ─────────────────────────────
  await generateSingleModel(className, classBody, isFreezed, filePath, entityDir);
}

// ---------------------------------------------------------------------------
// Single-entity model generation
// ---------------------------------------------------------------------------

/**
 * Generates a model file for one entity class.
 * Handles field extraction, enum detection, plain→Freezed conversion,
 * path resolution, file write, and opening the result.
 */
async function generateSingleModel(
  className: string,
  classBody: string,
  isFreezed: boolean,
  filePath: string,
  entityDir: string
): Promise<void> {
  // Extract and enrich fields
  let fields = extractFields(classBody, isFreezed);
  if (fields.length === 0) {
    vscode.window.showErrorMessage(`No fields found in "${className}".`);
    return;
  }

  const unannotatedEnums: string[] = [];
  fields = await Promise.all(
    fields.map((f) => enrichFieldWithEnumInfo(f, unannotatedEnums))
  );

  // Convert plain entity to Freezed in-place if needed
  if (!isFreezed) {
    const entityFileName = path.basename(filePath);
    await writeFile(filePath, generateFreezedEntityContent(className, entityFileName, fields));
    vscode.window.showInformationMessage(
      `Converted "${className}" to a Freezed entity. Run build_runner to regenerate parts.`
    );
  }

  // Resolve output path
  const modelDir      = resolveModelDirectory(entityDir);
  const modelFileName = `${deriveBaseName(className)}_model.dart`;
  const modelFilePath = path.join(modelDir, modelFileName);
  const modelClass    = className.replace("Entity", "Model");
  const importPath    = getRelativeImportPath(modelDir, filePath);

  const content = generateFreezedModelContent(
    modelClass, className, importPath, modelFileName, fields
  );

  await writeAndOpen(modelFilePath, content, modelClass, unannotatedEnums);
}

// ---------------------------------------------------------------------------
// Combined multi-entity model generation
// ---------------------------------------------------------------------------

/**
 * Generates a single combined model file for ALL entity classes found in the
 * source file. Called when the user chooses "No" and the file has >1 entity.
 */
async function generateCombinedModel(
  entityDecls: DeclarationInfo[],
  filePath: string,
  entityDir: string
): Promise<void> {
  const specs: ModelSpec[] = [];
  const allUnannotatedEnums: string[] = [];

  for (const decl of entityDecls) {
    const isFreezed = decl.isFreezed;
    let fields = extractFields(decl.body, isFreezed);

    if (fields.length === 0) {
      continue; // Skip empty entities rather than aborting everything
    }

    // Detect enums — run for each entity separately
    fields = await Promise.all(
      fields.map((f) => enrichFieldWithEnumInfo(f, allUnannotatedEnums))
    );

    // Convert plain entity to Freezed in-place if needed
    // (only for the entities that are plain — others keep their current form)
    if (!isFreezed) {
      // We can't easily rewrite individual classes within a multi-class file,
      // so we just use the parsed fields and note this in the TODO reminder.
      vscode.window.showWarningMessage(
        `"${decl.name}" is a plain Dart class. Add @freezed manually or run the command with "Yes" to separate.`
      );
    }

    specs.push({
      modelClass: decl.name.replace("Entity", "Model"),
      entityClass: decl.name,
      fields,
    });
  }

  if (specs.length === 0) {
    vscode.window.showErrorMessage("No fields found in any entity class.");
    return;
  }

  // Resolve output path — name the combined file after the source file
  const modelDir = resolveModelDirectory(entityDir);
  const sourceBaseName = path.basename(filePath, ".dart"); // e.g. "test_entity"
  const modelBaseName = sourceBaseName.endsWith("_entity")
    ? sourceBaseName.replace(/_entity$/, "_model")    // "test_entity" → "test_model"
    : `${sourceBaseName}_model`;
  const modelFileName = `${modelBaseName}.dart`;       // e.g. "test_model.dart"
  const modelFilePath = path.join(modelDir, modelFileName);
  const importPath    = getRelativeImportPath(modelDir, filePath);

  const content = generateCombinedFreezedModelContent(specs, importPath, modelFileName);
  const allModels = specs.map((s) => s.modelClass).join(", ");

  await writeAndOpen(
    modelFilePath,
    content,
    allModels,
    allUnannotatedEnums
  );
}

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

/**
 * Writes a model file, opens it in the editor, and shows the result message.
 */
async function writeAndOpen(
  modelFilePath: string,
  content: string,
  modelLabel: string,
  unannotatedEnums: string[]
): Promise<void> {
  try {
    await writeFile(modelFilePath, content);
    const doc = await vscode.workspace.openTextDocument(modelFilePath);
    await vscode.window.showTextDocument(doc);

    if (unannotatedEnums.length > 0) {
      const unique = [...new Set(unannotatedEnums)].join(", ");
      vscode.window.showWarningMessage(
        `Generated "${modelLabel}". Note: [${unique}] appear to be enums without a @JsonEnum / JsonConverter — add them manually.`
      );
    } else {
      vscode.window.showInformationMessage(`Generated "${modelLabel}" successfully.`);
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to write model file: ${error.message}`);
  }
}

/**
 * Runs enum detection on a field and mutates it with isEnum / converterName.
 */
async function enrichFieldWithEnumInfo(
  field: FieldInfo,
  unannotatedEnums: string[]
): Promise<FieldInfo> {
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
 * Mapping:
 *   .../domain/entities → .../data/models
 *   .../domain/...      → .../data/models
 *   anything else       → sibling "data/models"
 */
function resolveModelDirectory(entityDir: string): string {
  const domainEntities = path.join("domain", "entities");
  const domain         = "domain";

  if (entityDir.includes(domainEntities)) {
    return entityDir.replace(domainEntities, path.join("data", "models"));
  }
  if (entityDir.includes(domain)) {
    return entityDir.replace(domain, path.join("data", "models"));
  }
  return path.join(path.dirname(entityDir), "data", "models");
}

/**
 * Derives the snake_case base name for a single model file.
 * "AccountEntity" → "account"  →  "account_model.dart"
 */
function deriveBaseName(className: string): string {
  let base = toSnakeCase(className);
  if (base.endsWith("_entity")) {
    base = base.slice(0, -"_entity".length);
  }
  return base;
}
