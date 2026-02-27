/**
 * freezed_model.ts
 * ----------------
 * Templates that produce Freezed model file content from parsed field data.
 *
 * Two public entry points:
 *
 *   generateFreezedModelContent()
 *     → A complete file with ONE model class.
 *
 *   generateCombinedFreezedModelContent()
 *     → A complete file with MULTIPLE model classes.
 *
 * Both accept an optional ModelGenerationOptions object; all keys have
 * sensible defaults so existing call-sites continue to work unchanged.
 */

import { FieldInfo } from "../utils/dart_parser";

// ---------------------------------------------------------------------------
// Special field names that receive @JsonKey helpers from ModelGeneratorHelper
// ---------------------------------------------------------------------------

const JSON_KEY_HELPERS: Record<string, string> = {
  id: "ModelGeneratorHelper.generateUuidFromJson",
  createdAt: "ModelGeneratorHelper.generateCreatedAtFromJson",
  updatedAt: "ModelGeneratorHelper.generateUpdatedAtFromJson",
};

// ---------------------------------------------------------------------------
// Public Interfaces
// ---------------------------------------------------------------------------

/** All data needed to generate one model class and its mapping extensions. */
export interface ModelSpec {
  /** PascalCase model class name  (e.g. "AccountModel"). */
  modelClass: string;
  /** PascalCase entity class name (e.g. "AccountEntity"). */
  entityClass: string;
  /** Parsed field list from the entity. */
  fields: FieldInfo[];
}

/**
 * Options that control what the generated model file looks like.
 * All keys are optional — omitted keys fall back to their defaults.
 */
export interface ModelGenerationOptions {
  /**
   * `fieldRename` value used in @JsonSerializable.
   * Maps directly to Dart's `FieldRename.<value>`.
   * Default: "snake"
   */
  fieldRename?: "snake" | "none" | "pascal" | "kebab";
  /**
   * Whether to emit `explicitToJson: true` in @JsonSerializable.
   * Default: true
   */
  explicitToJson?: boolean;
  /**
   * Whether to emit the List<Model>/List<Entity> helper extension pairs.
   * Default: true
   */
  generateListMappers?: boolean;
  /**
   * Whether to add @JsonKey(fromJson: ModelGeneratorHelper.generate...) for
   * the special fields `id`, `createdAt`, and `updatedAt`.
   * Default: true
   */
  jsonKeyHelpers?: boolean;
}

const DEFAULTS: Required<ModelGenerationOptions> = {
  fieldRename: "snake",
  explicitToJson: true,
  generateListMappers: true,
  jsonKeyHelpers: true,
};

// ---------------------------------------------------------------------------
// Public Functions
// ---------------------------------------------------------------------------

/**
 * Generates a complete Dart file for a SINGLE Freezed model.
 */
export function generateFreezedModelContent(
  modelClass: string,
  entityClass: string,
  importPath: string,
  fileName: string,
  fields: FieldInfo[],
  options: ModelGenerationOptions = {},
): string {
  const opts = { ...DEFAULTS, ...options };
  const spec: ModelSpec = { modelClass, entityClass, fields };
  return buildFileHeader(importPath, fileName) + buildModelClassSection(spec, opts);
}

/**
 * Generates a complete Dart file for MULTIPLE Freezed models from the same
 * entity source file.
 */
export function generateCombinedFreezedModelContent(
  specs: ModelSpec[],
  entityImportPath: string,
  fileName: string,
  options: ModelGenerationOptions = {},
): string {
  const opts = { ...DEFAULTS, ...options };
  const header = buildFileHeader(entityImportPath, fileName);
  const sections = specs.map((s) => buildModelClassSection(s, opts)).join("\n\n");
  return header + sections + "\n";
}

// ---------------------------------------------------------------------------
// Private – File Header
// ---------------------------------------------------------------------------

function buildFileHeader(importPath: string, fileName: string): string {
  const baseName = fileName.replace(".dart", "");

  return `import 'package:freezed_annotation/freezed_annotation.dart';
import '${importPath}';

// TODO: Ensure all nested models are imported here

part '${baseName}.freezed.dart';
part '${baseName}.g.dart';

`;
}

// ---------------------------------------------------------------------------
// Private – Per-Class Section
// ---------------------------------------------------------------------------

function buildModelClassSection(
  spec: ModelSpec,
  opts: Required<ModelGenerationOptions>,
): string {
  const { modelClass, entityClass, fields } = spec;

  const jsonSerializable = buildJsonSerializableAnnotation(opts);
  const factoryParams    = buildFactoryParams(fields, opts);
  const toEntityBody     = buildToEntityBody(fields);
  const toModelBody      = buildToModelBody(fields);

  const listMappers = opts.generateListMappers
    ? `\n// -----------------------------------------------------------------------------\n` +
      `// HELPER LIST MAPPERS\n` +
      `// -----------------------------------------------------------------------------\n` +
      `extension ${modelClass}ListMapper on List<${modelClass}> {\n` +
      `  List<${entityClass}> toEntities() => map((e) => e.toEntity()).toList();\n` +
      `}\n` +
      `\n` +
      `extension ${entityClass}ListMapper on List<${entityClass}> {\n` +
      `  List<${modelClass}> toModels() => map((e) => e.toModel()).toList();\n` +
      `}`
    : "";

  return `@freezed
abstract class ${modelClass} with _$${modelClass} {
  const ${modelClass}._();

  ${jsonSerializable}
  const factory ${modelClass}({
${factoryParams}
  }) = _${modelClass};

  factory ${modelClass}.fromJson(Map<String, dynamic> json) =>
      _$${modelClass}FromJson(json);
}

// -----------------------------------------------------------------------------
// MODEL -> ENTITY
// -----------------------------------------------------------------------------
extension ${modelClass}Mapper on ${modelClass} {
  ${entityClass} toEntity() {
    return ${entityClass}(
${toEntityBody}
    );
  }
}

// -----------------------------------------------------------------------------
// ENTITY -> MODEL
// -----------------------------------------------------------------------------
extension ${entityClass}Mapper on ${entityClass} {
  ${modelClass} toModel() {
    return ${modelClass}(
${toModelBody}
    );
  }
}${listMappers}`;
}

// ---------------------------------------------------------------------------
// Private – @JsonSerializable Annotation Builder
// ---------------------------------------------------------------------------

function buildJsonSerializableAnnotation(opts: Required<ModelGenerationOptions>): string {
  const args: string[] = [];
  if (opts.explicitToJson) {
    args.push("explicitToJson: true");
  }
  if (opts.fieldRename !== "none") {
    args.push(`fieldRename: FieldRename.${opts.fieldRename}`);
  }
  return args.length === 0
    ? "@JsonSerializable()"
    : `@JsonSerializable(${args.join(", ")})`;
}

// ---------------------------------------------------------------------------
// Private – Factory Parameter Builder
// ---------------------------------------------------------------------------

function buildFactoryParams(
  fields: FieldInfo[],
  opts: Required<ModelGenerationOptions>,
): string {
  return fields
    .map((f) => {
      const fieldType = f.modelType ?? (f.isEntity ? f.type.replace(/Entity/g, "Model") : f.type);
      const annotations: string[] = [];

      if (opts.jsonKeyHelpers && JSON_KEY_HELPERS[f.name]) {
        annotations.push(`@JsonKey(fromJson: ${JSON_KEY_HELPERS[f.name]})`);
      }

      if (f.isEnum && f.converterName) {
        annotations.push(`@${f.converterName}()`);
      }

      let prefix = "";
      if (f.defaultValue) {
        annotations.push(`@Default(${f.defaultValue})`);
      } else if (!f.isNullable) {
        prefix = "required ";
      }

      const annotationLines = annotations.map((a) => `    ${a}`).join("\n");
      const paramLine = `    ${prefix}${fieldType} ${f.name},`;

      return annotationLines ? `${annotationLines}\n${paramLine}` : paramLine;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Private – Mapper Body Builders
// ---------------------------------------------------------------------------

function buildToEntityBody(fields: FieldInfo[]): string {
  return fields
    .map((f) => {
      if (f.isEntity) {
        const safe = f.isNullable ? "?" : "";
        if (f.isList) {
          return `      ${f.name}: ${f.name}${safe}.map((e) => e.toEntity()).toList(),`;
        }
        if (f.isMap) {
          return `      ${f.name}: ${f.name}${safe}.map((k, e) => MapEntry(k, e.toEntity())),`;
        }
        return `      ${f.name}: ${f.name}${safe}.toEntity(),`;
      }
      return `      ${f.name}: ${f.name},`;
    })
    .join("\n");
}

function buildToModelBody(fields: FieldInfo[]): string {
  return fields
    .map((f) => {
      if (f.isEntity) {
        const safe = f.isNullable ? "?" : "";
        if (f.isList) {
          return `      ${f.name}: ${f.name}${safe}.map((e) => e.toModel()).toList(),`;
        }
        if (f.isMap) {
          return `      ${f.name}: ${f.name}${safe}.map((k, e) => MapEntry(k, e.toModel())),`;
        }
        return `      ${f.name}: ${f.name}${safe}.toModel(),`;
      }
      return `      ${f.name}: ${f.name},`;
    })
    .join("\n");
}
