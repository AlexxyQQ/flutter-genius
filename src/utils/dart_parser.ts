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
  /**
   * Override type for the model side when the class does not end in "Entity"
   * (e.g. "Address" → modelType: "AddressModel",
   *        "List<Address>" → modelType: "List<AddressModel>").
   * When set, this is used in the generated factory params instead of the
   * automatic Entity→Model substitution.
   */
  modelType?: string;
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

/**
 * Generic declaration (class | enum | mixin) used by the extract/separate command.
 * The `body` includes any preceding annotations (e.g. `@freezed`) so it can be
 * written directly to a new file.
 */
export interface DeclarationInfo {
  type: "class" | "enum" | "mixin";
  name: string;
  /** Full text from the first annotation (or class keyword) to the closing brace. */
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
 *
 * The returned `body` for each declaration includes any preceding annotations
 * (e.g. `@freezed`, `@JsonEnum`) and the `abstract` modifier so the body can
 * be written as-is to a new file.
 */
export function getAllDeclarations(text: string): DeclarationInfo[] {
  const declarations: DeclarationInfo[] = [];

  // Captures: optional annotations, optional "abstract", the keyword, and the name.
  // Using a non-capturing prefix for annotations so match[1]=keyword, match[2]=name.
  // match.index points to the start of the first annotation (or the keyword itself).
  const declRegex =
    /(?:@[\w.]+(?:\([^)]*\))?\s*\n\s*)*(?:abstract\s+)?(class|enum|mixin)\s+(\w+)/g;

  let match: RegExpExecArray | null;

  while ((match = declRegex.exec(text)) !== null) {
    const type = match[1] as "class" | "enum" | "mixin";
    const name = match[2];

    // match.index is where the full match begins (at the first annotation if any,
    // or at "abstract"/"class"/"enum" otherwise). The body will include annotations.
    let startIndex = match.index;

    // Find the first "{" that opens this declaration's block.
    // Start searching after the full match text (past the class name) so we skip
    // any "{" inside annotation arguments like @JsonEnum({...}).
    const afterMatchIndex = match.index + match[0].length;
    const openBraceIndex = text.indexOf("{", afterMatchIndex);
    if (openBraceIndex === -1) {
      continue;
    }

    // Count braces to find the closing "}"
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

    // A class is Freezed if it uses the _$ClassName mixin pattern or has @freezed
    const isFreezed =
      new RegExp(`with\\s+_\\$${name}`).test(body) || body.includes("@freezed");

    declarations.push({
      type,
      name,
      body,
      isFreezed,
      start: startIndex,
      end: endIndex,
    });
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
 *
 * Uses bracket-aware comma splitting so complex defaults like
 *   @Default([{'a': 1, 'b': 2}, {'c': 3}])
 * are not incorrectly split on the inner commas.
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

  // Use bracket-aware splitting to correctly handle commas inside:
  //   @Default([...]), @Default({...}), Map<String, int>, etc.
  const params = splitAtTopLevelCommas(paramsBlock);

  for (const param of params) {
    // Strip single-line (//) comments from the fragment before any processing.
    // A comment can appear on a line preceding a field within the same comma-separated
    // segment (e.g. "// bool\n    required bool isActive"). Without stripping, the
    // whole fragment would be skipped because it starts with "//".
    const withoutComments = param
      .split("\n")
      .map((line) => {
        const idx = line.indexOf("//");
        return idx !== -1 ? line.substring(0, idx) : line;
      })
      .join("\n")
      .trim();

    if (!withoutComments) {
      continue;
    }

    // Extract @Default(...) value before stripping other annotations.
    // We use bracket-aware extraction here too since defaults can be complex.
    let defaultValue: string | undefined;
    const defaultMatch = withoutComments.match(/@Default\(.+\)/s);
    if (defaultMatch) {
      defaultValue = extractDefaultValue(withoutComments);
    }

    // Strip all annotations: @Annotation(...) and bare @Annotation
    const noAnnotations = withoutComments
      .replace(/@\w[\w.]*(?:\([^)]*\))?/gs, "") // @Name(...) or @Name
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
 * Splits text on commas that are at depth 0 (not inside brackets/braces/parens/angles).
 * This correctly handles:
 *   @Default({'a': 1, 'b': 2})     — commas inside {} don't split
 *   @Default(['x', 'y'])           — commas inside [] don't split
 *   Map<String, int>               — commas inside <> don't split
 */
function splitAtTopLevelCommas(text: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of text) {
    if (ch === "(" || ch === "[" || ch === "{" || ch === "<") {
      depth++;
      current += ch;
    } else if (ch === ")" || ch === "]" || ch === "}" || ch === ">") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  if (current.trim()) {
    result.push(current);
  }

  return result;
}

/**
 * Extracts the inner value from an @Default(...) annotation.
 * Uses bracket-aware parsing to handle nested structures.
 *
 * @Default(['a', 'b']) → "['a', 'b']"
 * @Default({'k': 1})   → "{'k': 1}"
 * @Default(42)          → "42"
 */
function extractDefaultValue(paramText: string): string | undefined {
  const start = paramText.indexOf("@Default(");
  if (start === -1) {
    return undefined;
  }

  const parenOpen = start + "@Default(".length - 1;
  let depth = 0;
  let end = -1;

  for (let i = parenOpen; i < paramText.length; i++) {
    if (paramText[i] === "(") {
      depth++;
    } else if (paramText[i] === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    return undefined;
  }

  return paramText.substring(parenOpen + 1, end).trim();
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
 *
 * Uses bracket-aware scanning so complex defaults like
 *   this.tags = const ['a', 'b', 'c']
 *   this.meta = const [{'x': 1}, {'y': 2}]
 * are captured in full rather than stopping at the first inner comma or ")".
 */
function extractConstructorDefaults(classBody: string): Record<string, string> {
  const defaults: Record<string, string> = {};

  // Match "this.fieldName = " then use bracket-aware scanning for the value.
  const thisAssignRegex = /\bthis\.(\w+)\s*=\s*/g;
  let match: RegExpExecArray | null;

  while ((match = thisAssignRegex.exec(classBody)) !== null) {
    const name = match[1];
    const valueStart = match.index + match[0].length;

    // Scan forward, tracking bracket depth.
    // Stop at an unbracketed "," or ")".
    let depth = 0;
    let i = valueStart;

    for (; i < classBody.length; i++) {
      const ch = classBody[i];
      if (ch === "(" || ch === "[" || ch === "{") {
        depth++;
      } else if (ch === ")" || ch === "]" || ch === "}") {
        if (depth === 0) {
          break; // Unbracketed closing delimiter — end of value
        }
        depth--;
      } else if (ch === "," && depth === 0) {
        break; // Unbracketed comma — end of value
      }
    }

    const value = classBody.substring(valueStart, i).trim();
    if (value) {
      defaults[name] = value;
    }
  }

  return defaults;
}

/**
 * Builds a FieldInfo from a raw Dart type string and a field name.
 *
 * Handles:
 *   - Nullable types:        "String?"         → isNullable: true, cleanType: "String"
 *   - List types:            "List<BankEntity>" → isList: true, cleanType: "BankEntity"
 *   - Map types:             "Map<String, int>" → isMap: true, cleanType: "int"
 *   - Entity types:          "BankEntity"       → isEntity: true
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
