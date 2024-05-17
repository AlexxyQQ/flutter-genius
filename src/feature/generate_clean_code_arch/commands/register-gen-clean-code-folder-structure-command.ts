import * as vscode from "vscode";
import { getLibPath } from "../utils/check-lib-folder";
import { createCleanCodeFeatureStructure } from "./clean-code-folder-structure-generator";
import * as fs from "fs";
import { createFeatureStructure } from "../../add_feature/commands/feature-structure-generator";

export function createGenerateCleanCodeFolderStructureCommand() {
  let registerCreateCleanCodeFolderStructureCommand =
    vscode.commands.registerCommand(
      "flutter-genius.createCleanCodeFolderStructure",
      async (uri: vscode.Uri) => {
        if (vscode.workspace.workspaceFolders) {
          var libPath = getLibPath([...vscode.workspace.workspaceFolders]);
          if (libPath) {
            createCleanCodeFeatureStructure(libPath);
            const filePath = libPath + "\\lib\\core\\common\\exports.dart";
            // Check if the file exists
            if (await fs.existsSync(vscode.Uri.file(filePath).fsPath)) {
              // Open the file
              vscode.workspace
                .openTextDocument(vscode.Uri.file(filePath))
                .then((doc) => {
                  // Show the document
                  createFeatureStructure(
                    libPath + "\\lib\\features\\",
                    "splash"
                  );
                  vscode.window.showTextDocument(doc);
                  vscode.window.showInformationMessage(
                    "Change the YOUR_PROJECT_NAME to your project name"
                  );
                  const terminal = vscode.window.createTerminal();
                  terminal.sendText(
                    "flutter pub add hive_flutter dio dartz flutter_bloc get_it connectivity_plus flutter_screenutil flutter_svg flutter_localization intl"
                  );
                  terminal.sendText(
                    "flutter pub add --dev hive_generator build_runner flutter_gen pretty_dio_logger"
                  );
                  terminal.sendText("flutter pub get");
                  terminal.sendText(
                    "dart run build_runner build --delete-conflicting-outputs"
                  );
                  terminal.sendText("dart fix --apply");
                  terminal.show();
                });
            } else {
              vscode.window.showErrorMessage(
                "The file doesn't exist at: " + filePath
              );
            }
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
