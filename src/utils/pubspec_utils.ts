import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Checks if specific dependencies exist in pubspec.yaml.
 */
export function checkDependencies(rootPath: string): boolean {
  const pubspecPath = path.join(rootPath, "pubspec.yaml");

  if (!fs.existsSync(pubspecPath)) {
    vscode.window.showErrorMessage("❌ pubspec.yaml not found.");
    return false;
  }

  try {
    const fileContent = fs.readFileSync(pubspecPath, "utf8");

    // Check for json_annotation (usually in dependencies)
    const hasJsonAnnotation = fileContent.includes("json_annotation:");

    // Check for json_serializable (usually in dev_dependencies)
    const hasJsonSerializable = fileContent.includes("json_serializable:");

    if (!hasJsonAnnotation) {
      vscode.window.showErrorMessage(
        '❌ Missing dependency: "json_annotation". Please add it to pubspec.yaml.'
      );
      return false;
    }

    if (!hasJsonSerializable) {
      vscode.window.showWarningMessage(
        '⚠️ Missing dev_dependency: "json_serializable". Codegen might fail.'
      );
      // We return true here because the code generation *can* technically happen,
      // but the user won't be able to run the build_runner later.
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
