/**
 * dart_parser.ts
 * ----------------
 * Parses Dart source code to extract class definitions and their fields.
 * Supports both plain Dart classes and Freezed-annotated classes.
 *
 * Public API:
 *   - getClassAtPosition()  → Find the class under the cursor.
 *   - getAllDeclarations()   → Find all classes, enums, and mixins in a file.
 *   - extractFields()        → Extract typed fields from a class body.
 *   - extractImports()       → Extract all import/part lines from a file.
 */

import * as vscode from "vscode";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Represents a single field extracted from a Dart class. */
export interface FieldInfo {
  /** Full raw type as written in source (e.g. "List<BankEntity>?"). */
  type: string;
  /** Field name (e.g. "bank"). */
  name: string;
  /** True if the type ends with "?". */
  isNullable: boolean;
  /** True if the outer type is List<...>. */
  isList: boolean;
  /** True if the outer type is Map<...>. */
  isMap: boolean;
  /** True if the type contains "Entity" (i.e. it's a domain entity). */
  isEntity: boolean;
  /**
   * The inner/clean type after stripping List<>, Map<>, and "?".
   * For primitives this equals the type itself (without "?").
   * For List<BankEntity> this is "BankEntity".
   */
  cleanType: string;
  /** Default value found in the constructor (e.g. "false", "[]"). */
  defaultValue?: string;
  /** True when cleanType was detected as a Dart enum. */
  isEnum?: boolean;
  /** The JsonConverter class name if one exists for this enum type. */
  converterName?: string;
}

/** Represents a class found in the active document (used for entity→model). */
export interface ClassInfo {
  type: "class";
  className: string;
  classBody: string;
  isFreezed: boolean;
  /** Absolute offset where the class keyword starts. */
  start: number;
  /** Absolute offset just past the closing brace. */
  end: number;
}

/** Generic declaration (class | enum | mixin) used by the extract command. */
export interface DeclarationInfo {
  type: "class" | "enum" | "mixin";
  name: string;
  body: string;
  isFreezed: boolean;
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// Public Functions
// ---------------------------------------------------------------------------

/**
 * Returns the class definition that contains the given cursor position.
 * Walks backwards from the cursor to find "class <Name>", then forward to
 * find its matching closing brace.
 *
 * Returns null when the cursor is not inside any class.
 */
export function getClassAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): ClassInfo | null {
  let foundStartLine = -1;
  let className = "";
  let matchIndexInLine = 0;

  // Search backwards from the cursor for "class <Name>"
  for (let i = position.line; i >= 0; i--) {
    const lineText = document.lineAt(i).text;
    const match = lineText.match(/class\s+(\w+)/);
    if (match) {
      className = match[1];
      foundStartLine = i;
      matchIndexInLine = match.index ?? 0;
      break;
    }
  }

  if (foundStartLine === -1) {
    return null;
  }

  // Collect all text from the class keyword to end-of-file
  let textFromStart = "";
  for (let i = foundStartLine; i < document.lineCount; i++) {
    textFromStart += document.lineAt(i).text + "\n";
  }

  // Walk the text counting braces to find the matching "}"
  let openBraces = 0;
  let classLength = 0;
  let blockStarted = false;

  for (let i = 0; i < textFromStart.length; i++) {
    if (textFromStart[i] === "{") {
      openBraces++;
      blockStarted = true;
    } else if (textFromStart[i] === "}") {
      openBraces--;
    }

    if (blockStarted && openBraces === 0) {
      classLength = i + 1;
      break;
    }
  }

  if (classLength === 0) {
    return null;
  }

  const classBody = textFromStart.substring(0, classLength);
  const isFreezed =
    classBody.includes(`_$${className}`) || classBody.includes("@freezed");

  const lineOffset = document.offsetAt(new vscode.Position(foundStartLine, 0));

  return {
    type: "class",
    className,
    classBody,
    isFreezed,
    start: lineOffset + matchIndexInLine,
    end: lineOffset + classLength,
  };
}

/**
 * Scans an entire Dart source string and returns all top-level class, enum,
 * and mixin declarations with their source text and positions.
 */
export function getAllDeclarations(text: string): DeclarationInfo[] {
  const declarations: DeclarationInfo[] = [];
  const declRegex = /(class|enum|mixin)\s+(\w+)/g;
  let match: RegExpExecArray | null;

  while ((match = declRegex.exec(text)) !== null) {
    const type = match[1] as "class" | "enum" | "mixin";
    const name = match[2];
    const startIndex = match.index;

    const openBraceIndex = text.indexOf("{", startIndex);
    if (openBraceIndex === -1) {
      continue;
    }

    // Count braces to find the end
    let openBraces = 1;
    let endIndex = -1;

    for (let i = openBraceIndex + 1; i < text.length; i++) {
      if (text[i] === "{") {
        openBraces++;
      } else if (text[i] === "}") {
        openBraces--;
      }

      if (openBraces === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (endIndex === -1) {
      continue;
    }

    const body = text.substring(startIndex, endIndex);
    const isFreezed = body.includes(`_$${name}`) || text.includes("@freezed");

    declarations.push({ type, name, body, isFreezed, start: startIndex, end: endIndex });
  }

  return declarations;
}

/**
 * Extracts all fields from a class body.
 * Handles both Freezed factory constructors and plain "final Type name;" fields.
 */
export function extractFields(
  classBody: string,
  isFreezed: boolean
): FieldInfo[] {
  return isFreezed
    ? extractFreezedFields(classBody)
    : extractPlainFields(classBody);
}

/**
 * Extracts all import and part directive lines from Dart source text.
 */
export function extractImports(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("import ") || l.startsWith("part "));
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Parses fields from a Freezed factory constructor block.
 *
 * Example matched block:
 *   const factory Foo({
 *     @Default(0) int count,
 *     required String name,
 *   }) = _Foo;
 */
function extractFreezedFields(classBody: string): FieldInfo[] {
  const fields: FieldInfo[] = [];

  // Match everything inside the factory constructor's {} parameter list
  const factoryRegex = /factory\s+\w+\s*\(\s*\{([^;]+)\}\s*\)/;
  const factoryMatch = classBody.match(factoryRegex);
  if (!factoryMatch) {
    return fields;
  }

  const paramsBlock = factoryMatch[1];

  // Split on commas — note: this is a simplification; nested generics with
  // commas (e.g. Map<String, int>) are handled by stripping type annotations
  // before splitting, which is sufficient for the common Flutter patterns.
  const params = paramsBlock.split(",");

  for (const param of params) {
    const trimmed = param.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      continue;
    }

    // Extract @Default(...) value before stripping annotations
    let defaultValue: string | undefined;
    const defaultMatch = trimmed.match(/@Default\(([^)]+)\)/);
    if (defaultMatch) {
      defaultValue = defaultMatch[1];
    }

    // Strip all annotations like @JsonKey(...), @Default(...), @MyAnnotation
    const noAnnotations = trimmed
      .replace(/@\w+\([^)]*\)/g, "")
      .replace(/@\w+/g, "")
      .replace(/^required\s+/, "")
      .trim();

    // The last "word" is the field name; everything before it is the type
    const lastSpaceIndex = noAnnotations.lastIndexOf(" ");
    if (lastSpaceIndex === -1) {
      continue;
    }

    const rawType = noAnnotations.substring(0, lastSpaceIndex).trim();
    const name = noAnnotations.substring(lastSpaceIndex + 1).trim();

    if (!rawType || !name) {
      continue;
    }

    fields.push(buildFieldInfo(rawType, name, defaultValue));
  }

  return fields;
}

/**
 * Parses fields from a plain (non-Freezed) Dart class.
 * Looks for "final Type name;" declarations and optional default values
 * in the constructor body.
 */
function extractPlainFields(classBody: string): FieldInfo[] {
  const fields: FieldInfo[] = [];
  const defaults = extractConstructorDefaults(classBody);

  const fieldRegex = /final\s+(.+?)\s+(\w+);/g;
  let match: RegExpExecArray | null;

  while ((match = fieldRegex.exec(classBody)) !== null) {
    const rawType = match[1].trim();
    const name = match[2];
    fields.push(buildFieldInfo(rawType, name, defaults[name]));
  }

  return fields;
}

/**
 * Extracts default parameter values from "this.field = value" patterns
 * inside a constructor.
 */
function extractConstructorDefaults(classBody: string): Record<string, string> {
  const defaults: Record<string, string> = {};
  const defaultRegex = /this\.(\w+)\s*=\s*([^,)]+)/g;
  let match: RegExpExecArray | null;

  while ((match = defaultRegex.exec(classBody)) !== null) {
    defaults[match[1]] = match[2].trim();
  }

  return defaults;
}

/**
 * Builds a FieldInfo from a raw Dart type string and a field name.
 *
 * Handles:
 *   - Nullable types:        "String?"        → isNullable: true, cleanType: "String"
 *   - List types:            "List<BankEntity>"→ isList: true, cleanType: "BankEntity"
 *   - Map types:             "Map<String, int>"→ isMap: true, cleanType: "int"
 *   - Entity types:          "BankEntity"      → isEntity: true
 */
function buildFieldInfo(
  rawType: string,
  name: string,
  defaultValue?: string
): FieldInfo {
  const isNullable = rawType.endsWith("?");
  const isList = rawType.startsWith("List<");
  const isMap = rawType.startsWith("Map<");
  const isEntity = rawType.includes("Entity");

  let cleanType = rawType;

  if (isList) {
    // Extract inner type from List<T> or List<T?>
    const listMatch = rawType.match(/List<(.+)>/);
    if (listMatch) {
      cleanType = listMatch[1].replace(/\?$/, "");
    }
  } else if (isMap) {
    // Extract value type from Map<K, V>
    const mapMatch = rawType.match(/Map\s*<.+?,\s*(.+)>/);
    if (mapMatch) {
      cleanType = mapMatch[1].replace(/>\??$/, "");
    }
  } else {
    // For simple types just strip the trailing "?"
    if (isNullable) {
      cleanType = cleanType.slice(0, -1);
    }
  }

  return {
    type: rawType,
    name,
    isNullable,
    isList,
    isMap,
    isEntity,
    cleanType: cleanType.trim(),
    defaultValue,
  };
}
