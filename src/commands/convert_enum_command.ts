import * as vscode from "vscode";
import { checkDependencies } from "../utils/pubspec_utils";

export async function convertEnumToJsonEnumCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  // 1. Check Dependencies
  if (workspaceFolder && !checkDependencies(workspaceFolder.uri.fsPath)) {
    return; // Stop if dependencies are missing
  }

  // 2. Get Selection or Current Enum Block
  const selection = editor.selection;
  let text = document.getText(selection);
  let range: vscode.Range = selection;
  // If no text selected, try to auto-select the enum block at cursor
  if (text.trim().length === 0) {
    const cursorRange = document.getWordRangeAtPosition(
      selection.active,
      /enum\s+\w+\s*\{[\s\S]*?\}/ // Regex to grab "enum Name { ... }"
    );

    if (!cursorRange) {
      vscode.window.showErrorMessage("No enum found at cursor.");
      return;
    }

    range = cursorRange;
    text = document.getText(range);
  }

  // 3. Parse the Enum
  // Regex breakdown: enum \s+ (Name) \s* { (Body) }
  const enumRegex = /enum\s+(\w+)\s*\{([\s\S]*?)\}/;
  const match = text.match(enumRegex);

  if (!match) {
    vscode.window.showErrorMessage("Invalid enum format selected.");
    return;
  }

  const enumName = match[1];
  const rawBody = match[2];

  // Clean up values (remove commas, newlines, trim)
  const enumValues = rawBody
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && !v.startsWith("//")); // Skip empty and comments

  if (enumValues.length === 0) {
    vscode.window.showErrorMessage("Enum must have at least one value.");
    return;
  }

  // 4. Generate New Content
  const defaultValue = enumValues[0]; // Default to the first item (e.g., 'pending')
  const converterName = `${enumName}Converter`;

  // Generate the annotated enum fields
  const newEnumBody = enumValues
    .map((val) => {
      return `  @JsonValue('${val}')\n  ${val}`;
    })
    .join(",\n\n");

  const generatedCode = `
@JsonEnum(alwaysCreate: true)
enum ${enumName} {
${newEnumBody};

  static ${enumName} fromString(String? value) => ${enumName}.values.firstWhere(
        (element) => element.name.toLowerCase() == value?.toLowerCase(),
        orElse: () => ${enumName}.${defaultValue},
      );
}

class ${converterName} implements JsonConverter<${enumName}, String?> {
  const ${converterName}();

  @override
  ${enumName} fromJson(String? json) {
    if (json == null) {
      return ${enumName}.${defaultValue};
    }
    return ${enumName}.values.firstWhere(
      (e) => e.name.toLowerCase() == json.toLowerCase(),
      orElse: () => ${enumName}.${defaultValue},
    );
  }

  @override
  String? toJson(${enumName} object) {
    return object.name;
  }
}`;

  // 5. Apply Edits
  await editor.edit((editBuilder) => {
    // Replace the old enum
    editBuilder.replace(range, generatedCode.trim());

    // Check for Import and Add if missing
    const importStatement =
      "import 'package:json_annotation/json_annotation.dart';";
    const fileText = document.getText();

    if (!fileText.includes("package:json_annotation/json_annotation.dart")) {
      editBuilder.insert(new vscode.Position(0, 0), importStatement + "\n\n");
    }
  });

  // 6. Format Document (Optional, triggers default formatter)
  await vscode.commands.executeCommand("editor.action.formatDocument");
  vscode.window.showInformationMessage(`Converted ${enumName} to JsonEnum!`);
}
