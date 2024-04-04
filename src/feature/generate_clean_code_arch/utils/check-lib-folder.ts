import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function getLibPath(
  workspaceFolders: vscode.WorkspaceFolder[] | undefined
): string | null {
  if (!workspaceFolders || workspaceFolders.length === 0) {
    console.error("No workspace folder found.");
    vscode.window.showErrorMessage("Please open a project directory.");
    return null;
  }
  const currentProjectDir = workspaceFolders[0].uri.fsPath;
  const libDir = path.join(currentProjectDir, "lib");
  if (!fs.existsSync(libDir)) {
    vscode.window.showErrorMessage("lib folder not found.");
    return null;
  }
  return currentProjectDir;
}
