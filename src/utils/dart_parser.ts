import * as vscode from "vscode";

export interface ClassInfo {
  className: string;
  classBody: string;
}

export interface FieldInfo {
  type: string; // "Map<String, AddressEntity>?"
  name: string; // "warehouseLocations"
  isNullable: boolean; // true
  isList: boolean; // false
  isMap: boolean; // true
  isEntity: boolean; // true (if it contains "Entity" in value type or list type)
  cleanType: string; // "AddressEntity" (The core type we care about converting)
  defaultValue?: string; // "false", "'default_url'", etc.
  isEnum?: boolean;
  converterName?: string;
  enumFilePath?: string;
}

// ... getClassAtPosition function remains the same ...
export function getClassAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): ClassInfo | null {
  let startLine = position.line;
  let className = "";
  let foundStart = false;

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

  let textFromStart = "";
  for (let i = startLine; i < document.lineCount; i++) {
    textFromStart += document.lineAt(i).text + "\n";
  }

  let openBraces = 0;
  let endIndex = 0;
  let hasStartedBlock = false;

  for (let i = 0; i < textFromStart.length; i++) {
    if (textFromStart[i] === "{") {
      openBraces++;
      hasStartedBlock = true;
    } else if (textFromStart[i] === "}") {
      openBraces--;
    }

    if (hasStartedBlock && openBraces === 0) {
      endIndex = i + 1;
      break;
    }
  }

  if (endIndex === 0) return null;

  const classBody = textFromStart.substring(0, endIndex);
  return { className, classBody };
}

/**
 * Helper to extract default values from the constructor.
 * Matches: this.fieldName = defaultValue,
 */
function extractDefaults(classBody: string): Record<string, string> {
  const defaults: Record<string, string> = {};

  // Find the constructor block (simplified: looks for className({...}))
  // This regex looks for "this.varName = value" patterns commonly found in constructors
  const defaultRegex = /this\.(\w+)\s*=\s*([^,)]+)/g;

  let match;
  while ((match = defaultRegex.exec(classBody)) !== null) {
    const fieldName = match[1];
    let defaultValue = match[2].trim();
    defaults[fieldName] = defaultValue;
  }
  return defaults;
}

export function extractFields(classBody: string): FieldInfo[] {
  const fieldRegex = /final\s+(.+?)\s+(\w+);/g;
  let match;
  const fields: FieldInfo[] = [];
  const defaults = extractDefaults(classBody);

  while ((match = fieldRegex.exec(classBody)) !== null) {
    const rawType = match[1].trim();
    const name = match[2];

    const isNullable = rawType.endsWith("?");
    const isList = rawType.startsWith("List<");
    const isMap = rawType.startsWith("Map<");

    // Detect if the type involves an Entity
    // Note: For Maps, we check if the Value is an Entity
    const isEntity = rawType.includes("Entity");

    let cleanType = rawType;

    // Extraction logic to find the "Inner" type
    if (isList) {
      // Extract T from List<T>
      const listMatch = rawType.match(/List<(.+)>/);
      if (listMatch) {
        cleanType = listMatch[1];
        if (cleanType.endsWith("?")) cleanType = cleanType.slice(0, -1);
      }
    } else if (isMap) {
      // Extract V from Map<K, V>
      // This is a naive split by comma; for nested generics it needs a real parser,
      // but works for Map<String, Entity>
      const mapMatch = rawType.match(/Map\s*<.+?,\s*(.+)>/);
      if (mapMatch) {
        cleanType = mapMatch[1];
        // Remove trailing > or ?
        cleanType = cleanType.replace(/>\??$/, "");
      }
    } else {
      if (isNullable) cleanType = cleanType.substring(0, cleanType.length - 1);
    }

    fields.push({
      type: rawType,
      name,
      isNullable,
      isList,
      isMap,
      isEntity,
      cleanType: cleanType.trim(),
      defaultValue: defaults[name], // Attach detected default value
    });
  }
  return fields;
}
