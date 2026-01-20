import { FieldInfo } from "../utils/dart_parser";

export function generateNormalEntityContent(
  className: string,
  fileName: string,
  fields: FieldInfo[],
  imports: string[] // <--- NEW PARAMETER
): string {
  const baseName = fileName.replace(".dart", "");

  // 1. Clean Imports
  // Remove freezed annotation if present, remove the old .g.dart or .freezed.dart
  const cleanImports = imports
    .filter((i) => !i.includes("freezed_annotation"))
    .filter((i) => !i.includes(".freezed.dart"))
    .filter((i) => !i.includes(".g.dart"))
    .join("\n");

  // 2. Generate Fields
  const fieldDeclarations = fields
    .map((f) => {
      const annotation =
        f.isEnum && f.converterName ? `  @${f.converterName}()\n` : "";
      return `${annotation}  final ${f.type} ${f.name};`;
    })
    .join("\n");

  // 3. Generate Constructor
  const constructorParams = fields
    .map((f) => {
      let param = "";
      if (f.defaultValue) {
        param = `    this.${f.name} = ${f.defaultValue},`;
      } else if (f.isNullable) {
        param = `    this.${f.name},`;
      } else {
        param = `    required this.${f.name},`;
      }
      return param;
    })
    .join("\n");

  // 4. Generate toString
  const toStringFields = fields.map((f) => `${f.name}: $${f.name}`).join(", ");

  return `import 'package:copy_with_extension/copy_with_extension.dart';
${cleanImports}

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
