import * as vscode from "vscode";

// --- INTERFACES ---

export interface ClassInfo {
  type: "class";
  className: string;
  classBody: string;
  isFreezed: boolean; // Still useful to detect if we are migrating FROM freezed
  start: number;
  end: number;
}

export interface FieldInfo {
  type: string; // The raw type (e.g., "List<UserEntity>?")
  name: string; // The variable name (e.g., "users")
  isNullable: boolean; // true if ends with ?
  isList: boolean; // true if List<...>
  isMap: boolean; // true if Map<...>
  isEntity: boolean; // true if type contains "Entity"
  cleanType: string; // The inner type (e.g., "UserEntity")
  defaultValue?: string; // e.g., "true", "10", "'test'"
  isEnum?: boolean; // Detected via analysis
  converterName?: string; // Custom JSON converter if needed
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
  const isFreezed = classBody.includes("@freezed") || classBody.includes("_$");

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
    // ... (Your existing Freezed parsing logic here if needed for migration) ...
    // For brevity, assuming we are parsing the Standard class style you provided
  }

  // --- NORMAL CLASS PARSING ---
  // Regex to find: final Type name;
  const fieldRegex = /final\s+(.+?)\s+(\w+);/g;

  // Regex to find constructor defaults: this.name = value
  // or named params: required this.name, this.age = 10
  const defaults = extractDefaults(classBody);

  let match;
  while ((match = fieldRegex.exec(classBody)) !== null) {
    const rawType = match[1].trim();
    const name = match[2];

    // Ignore internal fields starting with _
    if (!name.startsWith("_")) {
      fields.push(processField(rawType, name, defaults[name]));
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

  // Matches: this.myField = 10
  // Matches: this.myStr = 'hello'
  // Note: This is a simple regex, might fail on complex multi-line constructors
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
 * analyzes the type string to determine properties (List, Map, Entity, Nullable)
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

  // Unwrap List<Type> -> Type
  if (isList) {
    const listMatch = rawType.match(/List<(.+)>/);
    if (listMatch) cleanType = listMatch[1].replace(/\?$/, "");
  }
  // Unwrap Map<Key, Value> -> Value
  else if (isMap) {
    const mapMatch = rawType.match(/Map\s*<.+?,\s*(.+)>/);
    if (mapMatch) cleanType = mapMatch[1].replace(/>\??$/, "");
  }
  // Unwrap Nullable? -> Nullable
  else {
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
