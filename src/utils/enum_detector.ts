/**
 * enum_detector.ts
 * ----------------
 * Detects whether a Dart type name refers to an enum, and whether that enum
 * has a ready-to-use JsonConverter class.
 *
 * Detection strategy:
 *   1. Ignore known primitive / built-in types.
 *   2. Search the workspace for a file named after the type (snake_case).
 *   3. Read the file and confirm "enum TypeName" exists.
 *   4. Check for @JsonEnum annotation and a JsonConverter<TypeName, ...> class.
 */

import * as vscode from "vscode";
import { toSnakeCase } from "./string_utils";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface EnumAnalysis {
  /** True when the type is confirmed (or suspected) to be a Dart enum. */
  isEnum: boolean;
  /**
   * True when both @JsonEnum and a JsonConverter class were found.
   * Only meaningful when isEnum is true.
   */
  hasConverter: boolean;
  /** The name of the JsonConverter class, if found. */
  converterName: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Types that are never enums — skip workspace search for these. */
const PRIMITIVE_TYPES = new Set([
  "String", "int", "double", "bool", "num",
  "dynamic", "Object", "DateTime", "void",
  "List", "Map", "Set",
]);

// ---------------------------------------------------------------------------
// Public Function
// ---------------------------------------------------------------------------

/**
 * Analyzes `typeName` to determine if it is a Dart enum.
 *
 * Returns quickly for primitive types and entity/model types.
 * For unknown types it searches the workspace for a matching .dart file.
 */
export async function analyzeTypeForEnum(typeName: string): Promise<EnumAnalysis> {
  const NOT_ENUM: EnumAnalysis = { isEnum: false, hasConverter: false, converterName: null };

  // Fast-path: skip primitives and domain objects
  if (
    PRIMITIVE_TYPES.has(typeName) ||
    typeName.endsWith("Entity") ||
    typeName.endsWith("Model")
  ) {
    return NOT_ENUM;
  }

  // Search workspace for "<snake_type>.dart"
  const snakeName = toSnakeCase(typeName);
  const files = await vscode.workspace.findFiles(`**/${snakeName}.dart`, "**/.*", 1);

  if (files.length === 0) {
    // File not found — we still suspect this might be an enum based on naming
    return { isEnum: true, hasConverter: false, converterName: null };
  }

  // Read and analyse the file
  try {
    const doc = await vscode.workspace.openTextDocument(files[0]);
    const content = doc.getText();

    // Confirm it actually declares this enum
    if (!content.includes(`enum ${typeName}`)) {
      return NOT_ENUM;
    }

    // Look for @JsonEnum annotation
    const hasJsonEnum = content.includes("@JsonEnum");

    // Look for: class SomeConverter implements JsonConverter<TypeName, ...>
    const converterRegex = new RegExp(
      `class\\s+(\\w+)[^{]*implements[^{]*JsonConverter\\s*<\\s*${typeName}`,
      "s" // dotAll flag so "." matches newlines
    );
    const converterMatch = content.match(converterRegex);
    const converterName = converterMatch ? converterMatch[1] : null;

    return {
      isEnum: true,
      hasConverter: hasJsonEnum && converterName !== null,
      converterName,
    };
  } catch {
    // If we can't read the file, assume it's an enum without a converter
    return { isEnum: true, hasConverter: false, converterName: null };
  }
}
