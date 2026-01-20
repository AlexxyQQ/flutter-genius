import * as vscode from "vscode";

// --- INTERFACES ---

export interface ClassInfo {
  type: "class";
  className: string;
  classBody: string;
  isFreezed: boolean;
  start: number;
  end: number;
}

export interface FieldInfo {
  type: string;
  name: string;
  isNullable: boolean;
  isList: boolean;
  isMap: boolean;
  isEntity: boolean;
  cleanType: string;
  defaultValue?: string;
  isEnum?: boolean;
  converterName?: string;
}

export interface DeclarationInfo {
  type: "class" | "enum" | "mixin";
  name: string;
  body: string;
  isFreezed: boolean;
  start: number;
  end: number;
}

// --- FUNCTIONS ---

/**
 * Gets the Class definition at the current cursor position.
 */
export function getClassAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): ClassInfo | null {
  let startLine = position.line;
  let className = "";
  let foundStart = false;

  // 1. Scan upwards to find "class Name"
  for (let i = startLine; i >= 0; i--) {
    const lineText = document.lineAt(i).text;
    const match = lineText.match(/class\s+(\w+)/);
    if (match) {
      className = match[1];
      startLine = i;
      foundStart = true;
      break;
    }
  }

  if (!foundStart) return null;

  // 2. Read text from start line to end of doc to find closing brace
  let textFromStart = "";
  for (let i = startLine; i < document.lineCount; i++) {
    textFromStart += document.lineAt(i).text + "\n";
  }

  let openBraces = 0;
  let lengthOfClass = 0;
  let hasStartedBlock = false;

  for (let i = 0; i < textFromStart.length; i++) {
    if (textFromStart[i] === "{") {
      openBraces++;
      hasStartedBlock = true;
    } else if (textFromStart[i] === "}") {
      openBraces--;
    }

    if (hasStartedBlock && openBraces === 0) {
      lengthOfClass = i + 1;
      break;
    }
  }

  if (lengthOfClass === 0) return null;

  const classBody = textFromStart.substring(0, lengthOfClass);
  // Check for Freezed annotation or mixin
  const isFreezed =
    classBody.includes("@freezed") || classBody.includes("with _$");

  return {
    type: "class",
    className,
    classBody,
    isFreezed,
    start: document.offsetAt(new vscode.Position(startLine, 0)),
    end: document.offsetAt(new vscode.Position(startLine, 0)) + lengthOfClass,
  };
}

/**
 * Extracts fields from a Class body.
 * Handles both Freezed (factory) and Normal (final fields) styles.
 */
export function extractFields(
  classBody: string,
  isFreezed: boolean
): FieldInfo[] {
  const fields: FieldInfo[] = [];

  if (isFreezed) {
    // --- FREEZED PARSING ---
    // Look for: factory ClassName({ ... }) = _ClassName;
    // We capture the content inside ({ ... })
    const factoryRegex = /factory\s+\w+\s*\(\s*\{([^;]+)\}\s*\)/s;
    const factoryMatch = classBody.match(factoryRegex);

    if (factoryMatch) {
      const paramsBlock = factoryMatch[1];
      // Split by comma, but be careful of commas inside < > (generics)
      // For simplicity, splitting by comma is usually safe for standard fields,
      // but a more robust split handles nested Generics.
      // Here we assume standard formatting.
      const params = paramsBlock.split(",");

      for (const param of params) {
        const cleaned = param.trim();
        if (!cleaned) continue;
        if (cleaned.startsWith("//")) continue;

        // 1. Extract Default Value: @Default(10)
        let defaultValue: string | undefined;
        const defaultMatch = cleaned.match(/@Default\(([^)]+)\)/);
        if (defaultMatch) {
          defaultValue = defaultMatch[1];
        }

        // 2. Clean up annotations and 'required' keyword
        // Remove @Default(...), @JsonKey(...), required
        const noAnnotations = cleaned
          .replace(/@Default\([^)]+\)/g, "") // Remove @Default
          .replace(/@\w+(\([^)]*\))?/g, "") // Remove other annotations like @JsonKey
          .replace(/^required\s+/, "") // Remove required
          .trim();

        // 3. Extract Type and Name
        // Expected format: "String name" or "List<String> items"
        const lastSpaceIndex = noAnnotations.lastIndexOf(" ");
        if (lastSpaceIndex === -1) continue;

        const rawType = noAnnotations.substring(0, lastSpaceIndex).trim();
        const name = noAnnotations.substring(lastSpaceIndex + 1).trim();

        fields.push(processField(rawType, name, defaultValue));
      }
    }
  } else {
    // --- NORMAL CLASS PARSING ---
    const fieldRegex = /final\s+(.+?)\s+(\w+);/g;
    const defaults = extractDefaults(classBody);

    let match;
    while ((match = fieldRegex.exec(classBody)) !== null) {
      const rawType = match[1].trim();
      const name = match[2];

      if (!name.startsWith("_")) {
        fields.push(processField(rawType, name, defaults[name]));
      }
    }
  }

  return fields;
}

/**
 * Helper to extract default values from the constructor.
 * Looks for: this.fieldName = value
 */
function extractDefaults(classBody: string): Record<string, string> {
  const defaults: Record<string, string> = {};
  const defaultRegex = /this\.(\w+)\s*=\s*([^,)]+)/g;

  let match;
  while ((match = defaultRegex.exec(classBody)) !== null) {
    const fieldName = match[1];
    let defaultValue = match[2].trim();
    defaults[fieldName] = defaultValue;
  }
  return defaults;
}

/**
 * Analyzes the type string to determine properties (List, Map, Entity, Nullable)
 */
function processField(
  rawType: string,
  name: string,
  defaultValue?: string
): FieldInfo {
  const isNullable = rawType.endsWith("?");
  const isList = rawType.startsWith("List<");
  const isMap = rawType.startsWith("Map<");

  // Heuristic: If it contains "Entity", treat it as a nested object
  const isEntity = rawType.includes("Entity");

  let cleanType = rawType;

  if (isList) {
    const listMatch = rawType.match(/List<(.+)>/);
    if (listMatch) cleanType = listMatch[1].replace(/\?$/, "");
  } else if (isMap) {
    const mapMatch = rawType.match(/Map\s*<.+?,\s*(.+)>/);
    if (mapMatch) cleanType = mapMatch[1].replace(/>\??$/, "");
  } else {
    if (isNullable) cleanType = cleanType.substring(0, cleanType.length - 1);
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

export function extractImports(text: string): string[] {
  const lines = text.split("\n");
  const imports: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("import ")) {
      imports.push(trimmed);
    }
  }
  return imports;
}

/**
 * Scans the document for ALL Classes, Enums, and Mixins.
 */
export function getAllDeclarations(text: string): DeclarationInfo[] {
  const declarations: DeclarationInfo[] = [];
  const declRegex = /(class|enum|mixin)\s+(\w+)/g;
  let match;

  while ((match = declRegex.exec(text)) !== null) {
    const type = match[1] as "class" | "enum" | "mixin";
    const name = match[2];
    const startIndex = match.index;

    const openBraceIndex = text.indexOf("{", startIndex);
    if (openBraceIndex === -1) continue;

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

    if (endIndex !== -1) {
      const body = text.substring(startIndex, endIndex);
      const isFreezed = body.includes(`_$${name}`) || text.includes("@freezed");

      declarations.push({
        type: type,
        name: name,
        body: body,
        isFreezed,
        start: startIndex,
        end: endIndex,
      });
    }
  }

  return declarations;
}
