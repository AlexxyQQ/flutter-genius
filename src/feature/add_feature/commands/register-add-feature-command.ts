import * as vscode from "vscode";
import * as path from "path";
import { createFeatureStructure } from "./feature-structure-generator";
import { readSetting } from "../../../utils/read-settings";
export function registerAddFeatureCommand() {
  const createHive = readSetting("feature.createHive");

  let addFeatureCommand = vscode.commands.registerCommand(
    "flutter-genius.addFeature",
    async (uri: vscode.Uri) => {
      // Extract the folder name from the URI
      const folderName = path.basename(uri.fsPath);

      // Check if the folder name is 'feature'
      if (folderName.toLowerCase() === "features") {
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
        const terminal = vscode.window.createTerminal();
        terminal.sendText(
          "flutter pub add hive_flutter dio dartz flutter_bloc get_it"
        );
        if (createHive) {
          terminal.sendText(
            "flutter pub add --dev hive_generator build_runner flutter_gen"
          );
        }
        terminal.sendText("flutter pub get");
        terminal.sendText("dart fix --apply");
        terminal.show();
      } else {
        vscode.window.showErrorMessage(
          "This command can only be executed on a directory named 'features'."
        );
      }
    }
  );

  return addFeatureCommand;
}
