import * as vscode from "vscode";
import { getLibPath } from "../utils/check-lib-folder";
import { createCleanCodeFeatureStructure } from "./clean-code-folder-structure-generator";

export function createGenerateCleanCodeFolderStructureCommand() {
  let registerCreateCleanCodeFolderStructureCommand =
    vscode.commands.registerCommand(
      "flutter-genius.createCleanCodeFolderStructure",
      async (uri: vscode.Uri) => {
        if (vscode.workspace.workspaceFolders) {
          var libPath = getLibPath([...vscode.workspace.workspaceFolders]);
          if (libPath) {
            createCleanCodeFeatureStructure(libPath);
          } else {
            vscode.window.showErrorMessage("lib folder not found.");
          }
        } else {
          vscode.window.showErrorMessage("No workspace folder found.");
          return;
        }
      }
    );

  return registerCreateCleanCodeFolderStructureCommand;
}
