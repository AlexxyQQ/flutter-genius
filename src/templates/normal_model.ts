import { FieldInfo } from "../utils/dart_parser";

export function generateNormalModelContent(
  modelClassName: string,
  entityClassName: string,
  importPath: string, // Path to the entity file
  modelFileName: string,
  fields: FieldInfo[]
): string {
  const baseName = modelFileName.replace(".dart", "");

  // Helper to swap "Entity" with "Model" in types
  // e.g., "List<UserEntity>?" => "List<UserModel>?"
  const toModelType = (type: string) => type.replace(/Entity/g, "Model");

  // 1. Generate Overrides for Getters (Only for Nested Entities)
  // We need to cast the parent field to the Model type
  const overrides = fields
    .filter((f) => f.isEntity)
    .map((f) => {
      const modelType = toModelType(f.type);
      return `  @override
  ${modelType} get ${f.name} => super.${f.name} as ${modelType};`;
    })
    .join("\n");

  // 2. Generate Constructor
  const constructorParams = fields
    .map((f) => {
      // If it is an Entity (nested), we must require the Model version in the constructor
      if (f.isEntity) {
        const modelType = toModelType(f.type);
        // e.g. required InnerModel super.inner
        // or InnerModel? super.inner
        const prefix = f.isNullable || f.defaultValue ? "" : "required ";

        let param = `    ${prefix}${modelType} super.${f.name}`;
        if (f.defaultValue) param += ` = ${f.defaultValue}`;

        return param + ",";
      }

      // Primitives / Enums
      // e.g. required super.name
      // e.g. super.name = "default"
      if (f.defaultValue) {
        return `    super.${f.name} = ${f.defaultValue},`;
      } else if (f.isNullable) {
        return `    super.${f.name},`;
      } else {
        return `    required super.${f.name},`;
      }
    })
    .join("\n");

  // 3. Generate toString (Optional, usually Entity toString is enough, but requested in prompt)
  const toStringFields = fields.map((f) => `${f.name}: $${f.name}`).join(", ");

  return `import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';
import '${importPath}';
// TODO: Add imports for Nested Models here

part '${baseName}.g.dart';

@CopyWith()
@JsonSerializable(explicitToJson: true, fieldRename: FieldRename.snake)
class ${modelClassName} extends ${entityClassName} {
  
  // --- Nested Object Overrides ---
${overrides}

  ${modelClassName}({
${constructorParams}
  });

  @override
  String toString() {
    return '${modelClassName}(${toStringFields})';
  }

  factory ${modelClassName}.fromJson(Map<String, dynamic> json) =>
      _$${modelClassName}FromJson(json);

  Map<String, dynamic> toJson() => _$${modelClassName}ToJson(this);
}
`;
}
