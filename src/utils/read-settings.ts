import * as vscode from "vscode";

export function readSetting(key: string): any {
  return vscode.workspace.getConfiguration().get("flutterGenius." + key);
}
