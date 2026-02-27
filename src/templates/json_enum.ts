/**
 * json_enum.ts
 * ----------------
 * Template that produces the full Dart file content for a JSON-serializable
 * enum with an optional companion JsonConverter class.
 *
 * Supports configurable:
 *   - @JsonValue case format (snake_case, camelCase, SCREAMING_SNAKE_CASE, Title Case, none)
 *   - Converter class generation (on/off)
 *   - Null handling in converter (return first value, specific value, or null)
 */

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/** How enum value names are transformed into the @JsonValue string. */
export type JsonValueCase =
  | "snake_case"
  | "camelCase"
  | "SCREAMING_SNAKE_CASE"
  | "Title Case"
  | "none";

/**
 * What the converter's fromJson returns when the JSON value is null or unknown.
 *   "firstValue" — returns the first enum value (default)
 *   "null"       — returns null (converter type becomes nullable: EnumName?)
 */
export type NullHandling = "firstValue" | "null";

export interface JsonEnumOptions {
  /** How to convert the Dart identifier into the JSON string. */
  jsonValueCase: JsonValueCase;
  /** Whether to emit the companion EnumConverter class. */
  generateConverter: boolean;
  /**
   * How fromJson behaves on null / unknown input.
   * Ignored when generateConverter is false.
   */
  nullHandling: NullHandling;
  /**
   * Specific enum value name to use as default (e.g. "pending").
   * When set, overrides "firstValue" behaviour to use this value.
   * Must be one of the enumValues passed to generateJsonEnumContent.
   */
  defaultValue?: string;
}

const DEFAULT_OPTIONS: JsonEnumOptions = {
  jsonValueCase: "snake_case",
  generateConverter: true,
  nullHandling: "firstValue",
};

// ---------------------------------------------------------------------------
// Private — Case Conversion Helpers
// ---------------------------------------------------------------------------

/** camelCase / PascalCase → snake_case  (applePay → apple_pay) */
function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)
    .replace(/^_/, "");
}

/** camelCase / PascalCase → SCREAMING_SNAKE_CASE  (applePay → APPLE_PAY) */
function toScreamingSnake(name: string): string {
  return toSnakeCase(name).toUpperCase();
}

/** camelCase / PascalCase → Title Case  (applePay → Apple Pay) */
function toTitleCase(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (m) => m.toUpperCase())
    .trim();
}

/**
 * Converts a Dart enum value identifier to the JSON value string
 * according to the chosen case format.
 */
function toJsonValue(valueName: string, caseFormat: JsonValueCase): string {
  switch (caseFormat) {
    case "snake_case":
      return toSnakeCase(valueName);
    case "camelCase":
      return valueName;
    case "SCREAMING_SNAKE_CASE":
      return toScreamingSnake(valueName);
    case "Title Case":
      return toTitleCase(valueName);
    case "none":
      return valueName; // not actually used for annotations
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a complete Dart file for a JSON enum with an optional converter.
 *
 * @param enumName     PascalCase enum name (e.g. "AccountStatus").
 * @param enumValues   Ordered list of value names (e.g. ["active", "inactive"]).
 * @param baseName     File base name WITHOUT .dart (e.g. "account_status").
 *                     Used for the `part` directive.
 * @param extraImports Extra import lines to preserve from the original file.
 *                     Should NOT include json_annotation — added automatically.
 * @param options      Generation options (case format, converter, null handling).
 */
export function generateJsonEnumContent(
  enumName: string,
  enumValues: string[],
  baseName: string,
  extraImports: string[] = [],
  options: JsonEnumOptions = DEFAULT_OPTIONS,
): string {
  const { jsonValueCase, generateConverter, nullHandling, defaultValue } =
    options;

  // ── Import block ──────────────────────────────────────────────────────────
  const importLines = [
    "import 'package:json_annotation/json_annotation.dart';",
    ...extraImports,
  ].join("\n");

  // ── Annotated enum values ─────────────────────────────────────────────────
  // All values except the last end with ",".
  // The last value uses ";" (enhanced-enum syntax) so toJson / fromString can
  // be defined inside the enum body.
  const valuesBlock = enumValues
    .map((v, i) => {
      const terminator = i === enumValues.length - 1 ? ";" : ",";
      if (jsonValueCase === "none") {
        // No per-value annotation — rely on the generated EnumMap defaults.
        return `  ${v}${terminator}`;
      }
      const jsonVal = toJsonValue(v, jsonValueCase);
      return `  @JsonValue('${jsonVal}')\n  ${v}${terminator}`;
    })
    .join("\n");

  // ── Resolved default value expression ────────────────────────────────────
  const defaultExpr = defaultValue
    ? `${enumName}.${defaultValue}`
    : `${enumName}.values.first`;

  // ── Enum block ────────────────────────────────────────────────────────────
  let content =
    `${importLines}\n` +
    `\n` +
    `part '${baseName}.g.dart';\n` +
    `\n` +
    `@JsonEnum(alwaysCreate: true)\n` +
    `enum ${enumName} {\n` +
    `${valuesBlock}\n` +
    `\n` +
    `  String toJson() => _\$${enumName}EnumMap[this]!;\n` +
    `\n` +
    `  static ${enumName}? fromString(String? value) =>\n` +
    `      values.firstWhere(\n` +
    `        (element) => element.name.toLowerCase() == value?.toLowerCase(),\n` +
    `        orElse: () => values.first,\n` +
    `      );\n` +
    `}\n`;

  // ── Optional converter class ──────────────────────────────────────────────
  if (!generateConverter) {
    return content;
  }

  if (nullHandling === "null") {
    // Nullable converter: EnumName? fromJson / toJson
    content +=
      `\n` +
      `class ${enumName}Converter\n` +
      `    implements JsonConverter<${enumName}?, String?> {\n` +
      `  const ${enumName}Converter();\n` +
      `\n` +
      `  @override\n` +
      `  ${enumName}? fromJson(String? json) {\n` +
      `    if (json == null) return null;\n` +
      `    return ${enumName}.values\n` +
      `        .where((e) => e.name.toLowerCase() == json.toLowerCase())\n` +
      `        .firstOrNull;\n` +
      `  }\n` +
      `\n` +
      `  @override\n` +
      `  String? toJson(${enumName}? object) => object?.toJson();\n` +
      `}\n`;
  } else {
    // Non-nullable converter: returns defaultExpr on null/unknown
    content +=
      `\n` +
      `class ${enumName}Converter\n` +
      `    implements JsonConverter<${enumName}, String?> {\n` +
      `  const ${enumName}Converter();\n` +
      `\n` +
      `  @override\n` +
      `  ${enumName} fromJson(String? json) {\n` +
      `    if (json == null) return ${defaultExpr};\n` +
      `    return ${enumName}.values.firstWhere(\n` +
      `      (e) => e.name.toLowerCase() == json.toLowerCase(),\n` +
      `      orElse: () => ${defaultExpr},\n` +
      `    );\n` +
      `  }\n` +
      `\n` +
      `  @override\n` +
      `  String? toJson(${enumName} object) => object.toJson();\n` +
      `}\n`;
  }

  return content;
}
