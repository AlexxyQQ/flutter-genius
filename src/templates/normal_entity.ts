import { FieldInfo } from "../utils/dart_parser";

export function generateNormalEntityContent(
  className: string,
  fileName: string,
  fields: FieldInfo[]
): string {
  const baseName = fileName.replace(".dart", "");

  // 1. Generate Fields
  const fieldDeclarations = fields
    .map((f) => {
      // Add annotations if needed (e.g. custom converters for Enums)
      const annotation =
        f.isEnum && f.converterName ? `  @${f.converterName}()\n` : "";
      return `${annotation}  final ${f.type} ${f.name};`;
    })
    .join("\n");

  // 2. Generate Constructor Parameters
  const constructorParams = fields
    .map((f) => {
      let param = "";

      // If default exists: this.x = val
      if (f.defaultValue) {
        param = `    this.${f.name} = ${f.defaultValue},`;
      }
      // If nullable: this.x
      else if (f.isNullable) {
        param = `    this.${f.name},`;
      }
      // If required: required this.x
      else {
        param = `    required this.${f.name},`;
      }
      return param;
    })
    .join("\n");

  // 3. Generate toString()
  const toStringFields = fields.map((f) => `${f.name}: $${f.name}`).join(", ");

  return `import 'package:copy_with_extension/copy_with_extension.dart';
// TODO: Add imports for Enums or Nested Entities here

part '${baseName}.g.dart';

@CopyWith()
class ${className} {
${fieldDeclarations}

  ${className}({
${constructorParams}
  });

  @override
  String toString() {
    return '${className}(${toStringFields})';
  }
}
`;
}
