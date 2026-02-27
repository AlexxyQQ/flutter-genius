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
 *
 * Behaviour is controlled by extension settings under flutterGenius.entityToModel.*
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
  ModelGenerationOptions,
  ModelSpec,
} from "../templates/freezed_model";

// ---------------------------------------------------------------------------
// Primitive types — skip enum detection for these
// ---------------------------------------------------------------------------
const PRIMITIVE_TYPES = new Set([
  "String", "int", "double", "bool", "DateTime",
]);

// ---------------------------------------------------------------------------
// Settings Types
// ---------------------------------------------------------------------------

type OutputPath = "domainToData" | "sameDirectory";
type AutoConvert = "always" | "ask" | "never";

interface CommandSettings {
  outputPath: OutputPath;
  autoConvertToFreezed: AutoConvert;
  modelOptions: ModelGenerationOptions;
}

// ---------------------------------------------------------------------------
// Command Entry Point
// ---------------------------------------------------------------------------

/**
 * Main command handler. Registered as "flutter-genius.generateEntityToModel".
 */
export async function generateEntityToModelCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const entityDir = path.dirname(filePath);

  // ── Read extension settings ───────────────────────────────────────────────
  const cfg = vscode.workspace.getConfiguration("flutterGenius");

  const settings: CommandSettings = {
    outputPath: cfg.get<OutputPath>("entityToModel.outputPath", "domainToData"),
    autoConvertToFreezed: cfg.get<AutoConvert>("entityToModel.autoConvertToFreezed", "always"),
    modelOptions: {
      fieldRename: cfg.get<"snake" | "none" | "pascal" | "kebab">(
        "entityToModel.fieldRename", "snake"
      ),
      explicitToJson: cfg.get<boolean>("entityToModel.explicitToJson", true),
      generateListMappers: cfg.get<boolean>("entityToModel.generateListMappers", true),
      jsonKeyHelpers: cfg.get<boolean>("entityToModel.jsonKeyHelpers", true),
    },
  };

  // ── Step 1: Find the entity class at the cursor ───────────────────────────
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

  // ── Step 2: Check for other declarations in the file ─────────────────────
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

    if (!choice) return;

    if (choice.value === "yes") {
      await separateDeclarations(document, allDeclarations, className, filePath);
      vscode.window.showInformationMessage(
        `Separated ${otherDeclarations.length} declaration(s). Generating model for "${className}"...`
      );
    } else {
      const entityDecls = allDeclarations.filter((d) => d.type === "class");

      if (entityDecls.length > 1) {
        await generateCombinedModel(entityDecls, filePath, entityDir, settings);
        return;
      }
    }
  }

  // ── Steps 3–8: Single-entity model generation ─────────────────────────────
  await generateSingleModel(className, classBody, isFreezed, filePath, entityDir, settings);
}

// ---------------------------------------------------------------------------
// Single-entity model generation
// ---------------------------------------------------------------------------

async function generateSingleModel(
  className: string,
  classBody: string,
  isFreezed: boolean,
  filePath: string,
  entityDir: string,
  settings: CommandSettings,
): Promise<void> {
  let fields = extractFields(classBody, isFreezed);
  if (fields.length === 0) {
    vscode.window.showErrorMessage(`No fields found in "${className}".`);
    return;
  }

  const unannotatedEnums: string[] = [];
  fields = await Promise.all(
    fields.map((f) => enrichFieldWithEnumInfo(f, unannotatedEnums))
  );

  // ── Auto-convert plain entity to Freezed ──────────────────────────────────
  if (!isFreezed) {
    const { autoConvertToFreezed } = settings;

    let shouldConvert = autoConvertToFreezed === "always";

    if (autoConvertToFreezed === "ask") {
      const answer = await vscode.window.showQuickPick(
        [
          {
            label: "$(check)  Yes — convert to Freezed",
            description: "Rewrites the entity file with @freezed in-place",
            value: true,
          },
          {
            label: "$(close)  No — leave as plain Dart class",
            description: "Model will still be generated",
            value: false,
          },
        ],
        {
          title: `Flutter Genius: "${className}" is not Freezed`,
          placeHolder: "Convert the entity to a Freezed class?",
          ignoreFocusOut: true,
        }
      );
      if (!answer) return;
      shouldConvert = answer.value;
    }

    if (shouldConvert) {
      const entityFileName = path.basename(filePath);
      await writeFile(filePath, generateFreezedEntityContent(className, entityFileName, fields));
      vscode.window.showInformationMessage(
        `Converted "${className}" to a Freezed entity. Run build_runner to regenerate parts.`
      );
    }
  }

  // ── Resolve output path ───────────────────────────────────────────────────
  const modelDir      = resolveModelDirectory(entityDir, settings.outputPath);
  const modelFileName = `${deriveBaseName(className)}_model.dart`;
  const modelFilePath = path.join(modelDir, modelFileName);
  const modelClass    = className.replace("Entity", "Model");
  const importPath    = getRelativeImportPath(modelDir, filePath);

  const content = generateFreezedModelContent(
    modelClass, className, importPath, modelFileName, fields, settings.modelOptions
  );

  await writeAndOpen(modelFilePath, content, modelClass, unannotatedEnums);
}

// ---------------------------------------------------------------------------
// Combined multi-entity model generation
// ---------------------------------------------------------------------------

async function generateCombinedModel(
  entityDecls: DeclarationInfo[],
  filePath: string,
  entityDir: string,
  settings: CommandSettings,
): Promise<void> {
  const specs: ModelSpec[] = [];
  const allUnannotatedEnums: string[] = [];

  const classToModelName = new Map<string, string>(
    entityDecls.map((d) => [
      d.name,
      d.name.endsWith("Entity")
        ? d.name.replace(/Entity$/, "Model")
        : `${d.name}Model`,
    ])
  );

  for (const decl of entityDecls) {
    const isFreezed = decl.isFreezed;
    let fields = extractFields(decl.body, isFreezed);

    if (fields.length === 0) continue;

    fields = await Promise.all(
      fields.map((f) => enrichFieldWithEnumInfo(f, allUnannotatedEnums))
    );

    fields = fields.map((f) => {
      if (f.isEntity || f.isEnum || f.isMap) return f;
      const modelName = classToModelName.get(f.cleanType);
      if (!modelName) return f;
      const modelType = f.type.replace(
        new RegExp(`\\b${f.cleanType}\\b`, "g"),
        modelName
      );
      return { ...f, isEntity: true, modelType };
    });

    if (!isFreezed) {
      vscode.window.showWarningMessage(
        `"${decl.name}" is a plain Dart class. Add @freezed manually or run the command with "Yes" to separate first.`
      );
    }

    const modelClass = classToModelName.get(decl.name)!;
    specs.push({ modelClass, entityClass: decl.name, fields });
  }

  if (specs.length === 0) {
    vscode.window.showErrorMessage("No fields found in any class.");
    return;
  }

  const modelDir = resolveModelDirectory(entityDir, settings.outputPath);
  const sourceBaseName = path.basename(filePath, ".dart");
  const modelBaseName = sourceBaseName.endsWith("_entity")
    ? sourceBaseName.replace(/_entity$/, "_model")
    : `${sourceBaseName}_model`;
  const modelFileName = `${modelBaseName}.dart`;
  const modelFilePath = path.join(modelDir, modelFileName);
  const importPath    = getRelativeImportPath(modelDir, filePath);

  const content = generateCombinedFreezedModelContent(
    specs, importPath, modelFileName, settings.modelOptions
  );
  const allModels = specs.map((s) => s.modelClass).join(", ");

  await writeAndOpen(modelFilePath, content, allModels, allUnannotatedEnums);
}

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

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
  if (!analysis.isEnum) return field;

  field.isEnum = true;

  if (analysis.hasConverter && analysis.converterName) {
    field.converterName = analysis.converterName;
  } else {
    unannotatedEnums.push(field.cleanType);
  }

  return field;
}

/**
 * Resolves the target model directory given the entity's directory and
 * the configured output path strategy.
 *
 * "domainToData":  .../domain/entities → .../data/models
 * "sameDirectory": model is placed next to the entity file
 */
function resolveModelDirectory(entityDir: string, outputPath: OutputPath): string {
  if (outputPath === "sameDirectory") {
    return entityDir;
  }

  // "domainToData" — default
  const domainEntities = path.join("domain", "entities");
  const domain = "domain";

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
