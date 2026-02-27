/**
 * freezed_model.ts
 * ----------------
 * Template that produces a complete Freezed model file from parsed field data.
 *
 * Output shape (based on the Flutter project convention):
 *
 *   import 'package:freezed_annotation/freezed_annotation.dart';
 *   import '<relative_path_to_entity>';
 *   // TODO: import nested models here
 *
 *   part 'account_model.freezed.dart';
 *   part 'account_model.g.dart';
 *
 *   @freezed
 *   abstract class AccountModel with _$AccountModel {
 *     const AccountModel._();
 *
 *     @JsonSerializable(explicitToJson: true, fieldRename: FieldRename.snake)
 *     const factory AccountModel({
 *       @JsonKey(fromJson: ModelGeneratorHelper.generateUuidFromJson)
 *       required String id,
 *       @AccountTypeConverter() required AccountType type,
 *       DateTime? createdAt,
 *       ...
 *     }) = _AccountModel;
 *
 *     factory AccountModel.fromJson(Map<String, dynamic> json) =>
 *         _$AccountModelFromJson(json);
 *   }
 *
 *   // MODEL -> ENTITY
 *   // ENTITY -> MODEL
 *   // List helpers
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
// Public Function
// ---------------------------------------------------------------------------

/**
 * Generates the complete Dart source for a Freezed model file.
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
  const baseName = fileName.replace(".dart", "");

  const factoryParams  = buildFactoryParams(fields);
  const toEntityBody   = buildToEntityBody(fields);
  const toModelBody    = buildToModelBody(fields);

  return `import 'package:freezed_annotation/freezed_annotation.dart';
import '${importPath}';

// TODO: Ensure all nested models are imported here

part '${baseName}.freezed.dart';
part '${baseName}.g.dart';

@freezed
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
}
`;
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the indented factory constructor parameter list for the model.
 *
 * Rules applied per field:
 *   1. Entity types are renamed to their Model counterparts.
 *   2. Fields named "id", "createdAt", "updatedAt" get @JsonKey(fromJson: ...).
 *   3. Enum fields with a known converter get @ConverterName().
 *   4. Fields with a default value get @Default(value).
 *   5. Non-nullable fields without a default get "required".
 */
function buildFactoryParams(fields: FieldInfo[]): string {
  return fields
    .map((f) => {
      // Swap Entity → Model in the type string
      const fieldType = f.isEntity ? f.type.replace(/Entity/g, "Model") : f.type;

      const annotations: string[] = [];

      // @JsonKey for well-known fields (id, createdAt, updatedAt)
      if (JSON_KEY_HELPERS[f.name]) {
        annotations.push(`@JsonKey(fromJson: ${JSON_KEY_HELPERS[f.name]})`);
      }

      // @ConverterName() for enum types that have a JsonConverter
      if (f.isEnum && f.converterName) {
        annotations.push(`@${f.converterName}()`);
      }

      // Build the prefix: @Default(...) OR required OR nothing (nullable)
      let prefix = "";
      if (f.defaultValue) {
        annotations.push(`@Default(${f.defaultValue})`);
      } else if (!f.isNullable) {
        prefix = "required ";
      }

      // Render annotations on separate lines, indented
      const annotationLines = annotations
        .map((a) => `    ${a}`)
        .join("\n");

      const paramLine = `    ${prefix}${fieldType} ${f.name},`;

      return annotationLines ? `${annotationLines}\n${paramLine}` : paramLine;
    })
    .join("\n");
}

/**
 * Builds the toEntity() return statement body.
 * Nested entity models are mapped recursively via .toEntity() calls.
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
 * Builds the toModel() return statement body.
 * Nested entity fields are mapped recursively via .toModel() calls.
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
