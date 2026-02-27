/**
 * freezed_model.ts
 * ----------------
 * Templates that produce Freezed model file content from parsed field data.
 *
 * Two public entry points:
 *
 *   generateFreezedModelContent()
 *     → A complete file with ONE model class. Used when a single entity is
 *       being converted (either standalone or after file separation).
 *
 *   generateCombinedFreezedModelContent()
 *     → A complete file with MULTIPLE model classes. Used when the user
 *       chooses NOT to separate a multi-entity source file — all models
 *       land in one combined file with a single set of part directives.
 *
 * Private helpers build the per-class factory params and mapper bodies and
 * are shared between both entry points.
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

// ---------------------------------------------------------------------------
// Public Functions
// ---------------------------------------------------------------------------

/**
 * Generates a complete Dart file for a SINGLE Freezed model.
 *
 * @param modelClass   PascalCase model class name  (e.g. "AccountModel").
 * @param entityClass  PascalCase entity class name (e.g. "AccountEntity").
 * @param importPath   Relative import path from the model file to the entity file.
 * @param fileName     The model .dart filename     (e.g. "account_model.dart").
 * @param fields       Parsed field list from the entity.
 */
export function generateFreezedModelContent(
  modelClass: string,
  entityClass: string,
  importPath: string,
  fileName: string,
  fields: FieldInfo[]
): string {
  const spec: ModelSpec = { modelClass, entityClass, fields };
  return buildFileHeader(importPath, fileName) + buildModelClassSection(spec);
}

/**
 * Generates a complete Dart file for MULTIPLE Freezed models from the same
 * entity source file.
 *
 * All models share one set of `part` directives because code generation tools
 * (build_runner) operate per file.
 *
 * @param specs          Array of model specs, one per entity class.
 * @param entityImportPath Relative path to the shared entity source file.
 * @param fileName       The combined model .dart filename (e.g. "test_model.dart").
 */
export function generateCombinedFreezedModelContent(
  specs: ModelSpec[],
  entityImportPath: string,
  fileName: string
): string {
  const header = buildFileHeader(entityImportPath, fileName);
  const sections = specs.map(buildModelClassSection).join("\n\n");
  return header + sections + "\n";
}

// ---------------------------------------------------------------------------
// Private – File Header
// ---------------------------------------------------------------------------

/**
 * Builds the top of the model file: imports, TODO reminder, and part directives.
 */
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

/**
 * Builds the `@freezed` class, `fromJson` factory, and all four mapping
 * extensions for a single model. No file-level imports or part directives.
 */
function buildModelClassSection(spec: ModelSpec): string {
  const { modelClass, entityClass, fields } = spec;

  const factoryParams = buildFactoryParams(fields);
  const toEntityBody  = buildToEntityBody(fields);
  const toModelBody   = buildToModelBody(fields);

  return `@freezed
abstract class ${modelClass} with _$${modelClass} {
  const ${modelClass}._();

  @JsonSerializable(explicitToJson: true, fieldRename: FieldRename.snake)
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
}

// -----------------------------------------------------------------------------
// HELPER LIST MAPPERS
// -----------------------------------------------------------------------------
extension ${modelClass}ListMapper on List<${modelClass}> {
  List<${entityClass}> toEntities() => map((e) => e.toEntity()).toList();
}

extension ${entityClass}ListMapper on List<${entityClass}> {
  List<${modelClass}> toModels() => map((e) => e.toModel()).toList();
}`;
}

// ---------------------------------------------------------------------------
// Private – Factory Parameter Builder
// ---------------------------------------------------------------------------

/**
 * Builds the indented factory constructor parameter list for the model.
 *
 * Rules applied per field:
 *   1. Entity types are renamed to their Model counterparts (Entity → Model).
 *   2. Fields named "id", "createdAt", "updatedAt" get @JsonKey(fromJson: ...).
 *   3. Enum fields with a known converter get @ConverterName().
 *   4. Fields with a default value get @Default(value).
 *   5. Non-nullable fields without a default get "required".
 */
function buildFactoryParams(fields: FieldInfo[]): string {
  return fields
    .map((f) => {
      const fieldType = f.isEntity ? f.type.replace(/Entity/g, "Model") : f.type;

      const annotations: string[] = [];

      // Well-known fields that need @JsonKey helpers
      if (JSON_KEY_HELPERS[f.name]) {
        annotations.push(`@JsonKey(fromJson: ${JSON_KEY_HELPERS[f.name]})`);
      }

      // Enum types that have a JsonConverter
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

/**
 * Builds the `toEntity()` return statement body.
 * Nested entity models are mapped recursively via `.toEntity()` calls.
 */
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

/**
 * Builds the `toModel()` return statement body.
 * Nested entity fields are mapped recursively via `.toModel()` calls.
 */
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
