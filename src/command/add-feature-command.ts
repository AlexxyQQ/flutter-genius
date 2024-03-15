import * as vscode from "vscode";
import * as path from "path";
import { createFeatureStructure } from "./feature-structure-generator";
export function createAddFeatureCommand() {
  let addFeatureCommand = vscode.commands.registerCommand(
    "dart-entity-model-generator.addFeature",
    async (uri: vscode.Uri) => {
      // Extract the folder name from the URI
      const folderName = path.basename(uri.fsPath);

      // Check if the folder name is 'feature'
      if (folderName.toLowerCase() === "feature") {
        const featureName = await vscode.window.showInputBox({
          prompt: "What is the name of the feature?",
        });
        if (!featureName) {
          vscode.window.showErrorMessage("Feature name cannot be empty!");
          return;
        }

        createFeatureStructure(uri.fsPath, featureName);
        vscode.window.showInformationMessage(
          `Feature '${featureName}' has been created successfully in ${folderName}!`
        );
      } else {
        vscode.window.showErrorMessage(
          "This command can only be executed on a directory named 'feature'."
        );
      }
    }
  );

  return addFeatureCommand;
}