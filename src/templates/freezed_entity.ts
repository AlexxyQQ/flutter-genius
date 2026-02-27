/**
 * freezed_entity.ts
 * ----------------
 * Template that produces a Freezed entity class from parsed field data.
 *
 * Output shape:
 *
 *   import 'package:freezed_annotation/freezed_annotation.dart';
 *
 *   part 'foo_entity.freezed.dart';
 *
 *   @freezed
 *   abstract class FooEntity with _$FooEntity {
 *     const FooEntity._();
 *
 *     const factory FooEntity({
 *       required String id,
 *       String? name,
 *     }) = _FooEntity;
 *   }
 */

import { FieldInfo } from "../utils/dart_parser";

/**
 * Generates the complete Dart source for a Freezed entity file.
 *
 * @param className  PascalCase entity class name (e.g. "AccountEntity").
 * @param fileName   The .dart filename (e.g. "account_entity.dart").
 * @param fields     Parsed field list from the original entity.
 */
export function generateFreezedEntityContent(
  className: string,
  fileName: string,
  fields: FieldInfo[]
): string {
  const baseName = fileName.replace(".dart", "");
  const constructorParams = buildConstructorParams(fields);

  return `import 'package:freezed_annotation/freezed_annotation.dart';

part '${baseName}.freezed.dart';

@freezed
abstract class ${className} with _$${className} {
  const ${className}._();

  const factory ${className}({
${constructorParams}
  }) = _${className};
}
`;
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the indented constructor parameter list.
 * Each field gets either `required`, `@Default(value)`, or nothing (nullable).
 */
function buildConstructorParams(fields: FieldInfo[]): string {
  return fields
    .map((f) => {
      let prefix = "";

      if (f.defaultValue) {
        // Field has a default — use @Default annotation instead of required
        prefix = `@Default(${f.defaultValue}) `;
      } else if (!f.isNullable) {
        prefix = "required ";
      }

      return `    ${prefix}${f.type} ${f.name},`;
    })
    .join("\n");
}
