import * as vscode from "vscode";
import { toSnakeCase } from "./string_utils"; // Ensure you have this exported

export interface EnumAnalysis {
  isEnum: boolean;
  hasAnnotation: boolean;
  converterName: string | null;
  foundFile: boolean;
}

/**
 * Analyzes a type name to see if it is an Enum and if it is ready for JSON serialization.
 */
export async function analyzeTypeForEnum(
  typeName: string
): Promise<EnumAnalysis> {
  // 1. Filter out non-candidates immediately
  const ignoredTypes = [
    "String",
    "int",
    "double",
    "bool",
    "num",
    "dynamic",
    "Object",
    "DateTime",
    "void",
    "List",
    "Map",
    "Set",
  ];

  if (
    ignoredTypes.includes(typeName) ||
    typeName.endsWith("Entity") ||
    typeName.endsWith("Model")
  ) {
    return {
      isEnum: false,
      hasAnnotation: false,
      converterName: null,
      foundFile: false,
    };
  }

  // 2. Try to locate the file defining this type.
  // Heuristic: Flutter standard is PascalCaseType -> snake_case_file.dart
  const snakeName = toSnakeCase(typeName);

  // Limit search to 1 result for speed
  const files = await vscode.workspace.findFiles(
    `**/${snakeName}.dart`,
    "**/.*",
    1
  );

  if (files.length === 0) {
    // We suspect it's an enum (not primitive/entity), but couldn't find the file.
    return {
      isEnum: true,
      hasAnnotation: false,
      converterName: null,
      foundFile: false,
    };
  }

  // 3. Read file content
  try {
    const doc = await vscode.workspace.openTextDocument(files[0]);
    const content = doc.getText();

    // Verify it is actually an enum
    const isEnum = content.includes(`enum ${typeName}`);
    if (!isEnum) {
      return {
        isEnum: false,
        hasAnnotation: false,
        converterName: null,
        foundFile: true,
      };
    }

    // Check for @JsonEnum annotation
    const hasJsonEnum = content.includes("@JsonEnum");

    // Check for a converter class definition in the same file
    // Regex looks for: class SomeConverter implements JsonConverter<ThisEnum, ...>
    const converterRegex = new RegExp(
      `class\\s+(\\w+)[^\\{]*implements\\s+.*JsonConverter\\s*<\\s*${typeName}`,
      "s"
    );
    const match = content.match(converterRegex);

    const converterName = match ? match[1] : null;

    return {
      isEnum: true,
      hasAnnotation: hasJsonEnum && !!converterName,
      converterName: converterName,
      foundFile: true,
    };
  } catch (e) {
    return {
      isEnum: true,
      hasAnnotation: false,
      converterName: null,
      foundFile: false,
    };
  }
}
