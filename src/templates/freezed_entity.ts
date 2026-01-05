import { FieldInfo } from "../utils/dart_parser";

export function generateFreezedEntityContent(
  className: string,
  fileName: string, // e.g. "user_entity.dart"
  fields: FieldInfo[]
): string {
  const baseName = fileName.replace(".dart", "");

  const constructorParams = fields
    .map((f) => {
      let prefix = "";

      // If default value exists, use @Default
      if (f.defaultValue) {
        prefix += `@Default(${f.defaultValue}) `;
      } else if (!f.isNullable) {
        prefix += `required `;
      }

      return `    ${prefix}${f.type} ${f.name},`;
    })
    .join("\n");

  return `import 'package:freezed_annotation/freezed_annotation.dart';

part '${baseName}.freezed.dart';

@freezed
class ${className} with _$${className} {
  const ${className}._();

  const factory ${className}({
${constructorParams}
  }) = _${className};
}
`;
}
