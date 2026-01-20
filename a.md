import * as vscode from "vscode";

// --- INTERFACES ---

/**
 * Used for the 'Extract Classes' command.
 * Generic structure for Classes, Enums, and Mixins.
 */
export interface DeclarationInfo {
  type: "class" | "enum" | "mixin";
  name: string;
  body: string;
  isFreezed: boolean;
  start: number;
  end: number;
}

/**
 * Used for the 'Entity to Model' command.
 * Specific to Classes.
 */
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
  enumFilePath?: string;
}

// --- FUNCTIONS ---

/**
 * Gets the Class definition at the current cursor position.
 * Returns null if the cursor is not inside a class definition.
 */
export function getClassAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): ClassInfo | null {
  let startLine = position.line;
  let className = "";
  let foundStart = false;
  let matchIndexInLine = 0;

  // 1. Find the line where "class Name" is defined
  for (let i = startLine; i >= 0; i--) {
    const lineText = document.lineAt(i).text;
    const match = lineText.match(/class\s+(\w+)/);
    if (match) {
      className = match[1];
      startLine = i;
      matchIndexInLine = match.index || 0;
      foundStart = true;
      break;
    }
  }

  if (!foundStart) return null;

  // 2. Read text from that line to the end of the file
  let textFromStart = "";
  for (let i = startLine; i < document.lineCount; i++) {
    textFromStart += document.lineAt(i).text + "\n";
  }

  // 3. Find the matching closing brace '}'
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

  // 4. Check if Freezed
  const isFreezed =
    classBody.includes(`_$${className}`) || textFromStart.includes("@freezed");

  // 5. Calculate Absolute Offsets
  const lineStartOffset = document.offsetAt(new vscode.Position(startLine, 0));
  const absoluteStart = lineStartOffset + matchIndexInLine;
  const absoluteEnd = lineStartOffset + lengthOfClass;

  return {
    type: "class", // FIXED: Added missing type property
    className,
    classBody,
    isFreezed,
    start: absoluteStart,
    end: absoluteEnd,
  };
}

/**
 * Scans the document for ALL Classes, Enums, and Mixins.
 */
export function getAllDeclarations(text: string): DeclarationInfo[] {
  const declarations: DeclarationInfo[] = [];

  // Regex to find "class Name", "enum Name", or "mixin Name"
  const declRegex = /(class|enum|mixin)\s+(\w+)/g;
  let match;

  while ((match = declRegex.exec(text)) !== null) {
    const type = match[1] as "class" | "enum" | "mixin";
    const name = match[2];
    const startIndex = match.index;

    // Find the opening brace
    const openBraceIndex = text.indexOf("{", startIndex);
    if (openBraceIndex === -1) continue;

    // Count braces to find the end of the block
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

      // Check for code generation markers
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

/**
 * Extracts fields from a Class body (supports Normal and Freezed classes).
 */
export function extractFields(
  classBody: string,
  isFreezed: boolean
): FieldInfo[] {
  const fields: FieldInfo[] = [];

  if (isFreezed) {
    // --- FREEZED PARSING ---
    const factoryRegex = /factory\s+\w+\s*\(\s*\{([^;]+)\}\s*\)/;
    const factoryMatch = classBody.match(factoryRegex);

    if (factoryMatch) {
      const paramsBlock = factoryMatch[1];
      const params = paramsBlock.split(",");

      for (const param of params) {
        const cleaned = param.trim();
        if (!cleaned) continue;
        if (cleaned.startsWith("//")) continue;

        let defaultValue: string | undefined;
        const defaultMatch = cleaned.match(/@Default\(([^)]+)\)/);
        if (defaultMatch) {
          defaultValue = defaultMatch[1];
        }

        const noAnnotations = cleaned
          .replace(/@\w+\([^)]+\)/g, "")
          .replace(/@\w+/g, "")
          .replace(/^required\s+/, "")
          .trim();

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
      fields.push(processField(match[1].trim(), match[2], defaults[match[2]]));
    }
  }

  return fields;
}

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

function processField(
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
    if (trimmed.startsWith("import ") || trimmed.startsWith("part ")) {
      imports.push(trimmed);
    }
  }
  return imports;
}
