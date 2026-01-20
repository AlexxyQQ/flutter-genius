import { FieldInfo } from "../utils/dart_parser";

export function generateNormalModelContent(
  modelClassName: string,
  entityClassName: string,
  entityImportPath: string,
  modelFileName: string,
  fields: FieldInfo[],
  imports: string[] // <--- NEW PARAMETER
): string {
  const baseName = modelFileName.replace(".dart", "");

  // 1. Clean Imports for Model
  // We need json_annotation. We don't need freezed.
  // We filtering out the imports that might cause conflicts or circular deps if not careful
  const cleanImports = imports
    .filter((i) => !i.includes("freezed_annotation"))
    .filter((i) => !i.includes(".freezed.dart"))
    .filter((i) => !i.includes(".g.dart"))
    .join("\n");

  const toModelType = (type: string) => type.replace(/Entity/g, "Model");

  // 2. Overrides
  const overrides = fields
    .filter((f) => f.isEntity)
    .map((f) => {
      const modelType = toModelType(f.type);
      return `  @override
  ${modelType} get ${f.name} => super.${f.name} as ${modelType};`;
    })
    .join("\n");

  // 3. Constructor
  const constructorParams = fields
    .map((f) => {
      if (f.isEntity) {
        const modelType = toModelType(f.type);
        const prefix = f.isNullable || f.defaultValue ? "" : "required ";
        let param = `    ${prefix}${modelType} super.${f.name}`;
        if (f.defaultValue) param += ` = ${f.defaultValue}`;
        return param + ",";
      }
      if (f.defaultValue) {
        return `    super.${f.name} = ${f.defaultValue},`;
      } else if (f.isNullable) {
        return `    super.${f.name},`;
      } else {
        return `    required super.${f.name},`;
      }
    })
    .join("\n");

  const toStringFields = fields.map((f) => `${f.name}: $${f.name}`).join(", ");

  return `import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';
import '${entityImportPath}';
${cleanImports} 
// Note: If you have nested Models, ensure they are imported here. 
// The generator copies imports from the entity, but you might need to change 'Entity' imports to 'Model' imports manually if strict separation is required.

part '${baseName}.g.dart';

@CopyWith()
@JsonSerializable(explicitToJson: true, fieldRename: FieldRename.snake)
class ${modelClassName} extends ${entityClassName} {

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
