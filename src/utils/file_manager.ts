import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * writes content to a file. Creates directories if they don't exist.
 */
export async function writeFile(fsPath: string, content: string) {
  const uri = vscode.Uri.file(fsPath);
  const dir = path.dirname(fsPath);

  // Recursive directory creation
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const data = Buffer.from(content, "utf8");
  await vscode.workspace.fs.writeFile(uri, data);
}

/**
 * Calculates the Dart import path from one file to another.
 * Ensures usage of forward slashes and local identifiers (./).
 */
export function getRelativeImportPath(fromDir: string, toFile: string): string {
  let rel = path.relative(fromDir, toFile);

  // Force forward slashes for Dart imports (even on Windows)
  rel = rel.split(path.sep).join("/");

  if (!rel.startsWith(".")) {
    rel = "./" + rel;
  }
  return rel;
}

/**
 * NEW: specific helper to recalculate imports when moving from Entity -> Model.
 * * @param originalImport The import string (e.g. "import '../enums/test_enum.dart';")
 * @param fromDir The directory of the original file (Entity folder)
 * @param toDir The directory of the new file (Model folder)
 */
export function fixRelativeImport(
  originalImport: string,
  fromDir: string,
  toDir: string
): string {
  // 1. Extract the path inside the quotes
  const match = originalImport.match(/['"](.+)['"]/);
  if (!match) return originalImport; // Return as is if parse fails

  const oldPath = match[1];

  // 2. If it's a package: or dart: import, return as is
  if (oldPath.startsWith("package:") || oldPath.startsWith("dart:")) {
    return originalImport;
  }

  // 3. Resolve the absolute path of the target file
  // path.resolve combines the current directory with the relative path to get absolute
  const absoluteTarget = path.resolve(fromDir, oldPath);

  // 4. Calculate the new relative path from the generated Model directory
  let newRelativePath = path.relative(toDir, absoluteTarget);

  // 5. Fix slashes for Dart (Windows uses backslashes by default in path module)
  newRelativePath = newRelativePath.split(path.sep).join("/");

  // 6. Ensure it starts with ./ or ../
  if (!newRelativePath.startsWith(".")) {
    newRelativePath = "./" + newRelativePath;
  }

  // 7. Reconstruct the import string
  return `import '${newRelativePath}';`;
}
