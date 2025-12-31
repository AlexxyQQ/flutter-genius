import { FieldInfo } from "../utils/dart_parser";

/**
 * Generates the full content for the Freezed Model file.
 * * Features:
 * - Swaps Entity types for Model types in the factory definition.
 * - Adds @Default() annotation if a default value was found in the Entity.
 * - Adds @ConverterName() annotation if an Enum with a JsonConverter was detected.
 * - Generates recursive toEntity() and toModel() extensions for Lists and Maps.
 */
export function generateFreezedModelContent(
  modelClass: string,
  entityClass: string,
  importPath: string,
  fileName: string,
  fields: FieldInfo[]
): string {
  const baseName = fileName.replace(".dart", "");

  // 1. Generate Factory Parameters
  const factoryParams = fields
    .map((f) => {
      let fieldType = f.type;

      // SWAP ENTITY -> MODEL IN TYPE DEFINITION
      // e.g. List<UserEntity> -> List<UserModel>
      if (f.isEntity) {
        fieldType = fieldType.replace(/Entity/g, "Model");
      }

      let prefix = "";

      // NEW: Add Converter Annotation if detected (for Enums)
      if (f.isEnum && f.converterName) {
        prefix += `@${f.converterName}() `;
      }

      // HANDLE DEFAULTS
      // If parsing found a default, add @Default(val)
      // If default exists, the field is technically not "required" in Freezed syntax
      if (f.defaultValue) {
        prefix += `@Default(${f.defaultValue}) `;
      } else if (!f.isNullable) {
        prefix += "required ";
      }

      return `    ${prefix}${fieldType} ${f.name},`;
    })
    .join("\n");

  // 2. Generate ToEntity Body
  const toEntityFields = fields
    .map((f) => {
      // If it is an Entity type, we need to map it
      if (f.isEntity) {
        const nullSafe = f.isNullable ? "?" : "";

        // CASE: List<Entity> -> List<Model>
        if (f.isList) {
          return `      ${f.name}: ${f.name}${nullSafe}.map((e) => e.toEntity()).toList(),`;
        }
        // CASE: Map<Key, Entity> -> Map<Key, Model>
        else if (f.isMap) {
          return `      ${f.name}: ${f.name}${nullSafe}.map((k, e) => MapEntry(k, e.toEntity())),`;
        }
        // CASE: Single Entity -> Single Model
        else {
          return `      ${f.name}: ${f.name}${nullSafe}.toEntity(),`;
        }
      }

      // Primitive Types or simple Enums (pass through)
      return `      ${f.name}: ${f.name},`;
    })
    .join("\n");

  // 3. Generate ToModel Body
  const toModelFields = fields
    .map((f) => {
      if (f.isEntity) {
        const nullSafe = f.isNullable ? "?" : "";

        // CASE: List<Entity>
        if (f.isList) {
          return `      ${f.name}: ${f.name}${nullSafe}.map((e) => e.toModel()).toList(),`;
        }
        // CASE: Map<Key, Entity>
        else if (f.isMap) {
          return `      ${f.name}: ${f.name}${nullSafe}.map((k, e) => MapEntry(k, e.toModel())),`;
        }
        // CASE: Single Entity
        else {
          return `      ${f.name}: ${f.name}${nullSafe}.toModel(),`;
        }
      }
      return `      ${f.name}: ${f.name},`;
    })
    .join("\n");

  return `import 'package:freezed_annotation/freezed_annotation.dart';
import '${importPath}';

// TODO: Ensure all nested models are imported here

part '${baseName}.freezed.dart';
part '${baseName}.g.dart';

@freezed
abstract class ${modelClass} with _$${modelClass} {
  const ${modelClass}._();

  @JsonSerializable(explicitToJson: true)
  const factory ${modelClass}({
${factoryParams}
  }) = _${modelClass};

  factory ${modelClass}.fromJson(Map<String, dynamic> json) => _$${modelClass}FromJson(json);
}

// -----------------------------------------------------------------------------
// MODEL -> ENTITY
// -----------------------------------------------------------------------------
extension ${modelClass}Mapper on ${modelClass} {
  ${entityClass} toEntity() {
    return ${entityClass}(
${toEntityFields}
    );
  }
}

// -----------------------------------------------------------------------------
// ENTITY -> MODEL
// -----------------------------------------------------------------------------
extension ${entityClass}Mapper on ${entityClass} {
  ${modelClass} toModel() {
    return ${modelClass}(
${toModelFields}
    );
  }
}

// -----------------------------------------------------------------------------
// HELPER MAPPERS
// -----------------------------------------------------------------------------
extension ${modelClass}ListMapper on List<${modelClass}> {
  List<${entityClass}> toEntities() => map((e) => e.toEntity()).toList();
}

extension ${entityClass}ListMapper on List<${entityClass}> {
  List<${modelClass}> toModels() => map((e) => e.toModel()).toList();
}
`;
}
