import * as vscode from "vscode";
import { getLibPath } from "../utils/check-lib-folder";
import { createCleanCodeFeatureStructure } from "./clean-code-folder-structure-generator";
import * as fs from "fs";
import * as path from "path";
import { createFeatureStructure } from "../../add_feature/commands/feature-structure-generator";

export function createGenerateCleanCodeFolderStructureCommand() {
  let registerCreateCleanCodeFolderStructureCommand =
    vscode.commands.registerCommand(
      "flutter-genius.createCleanCodeFolderStructure",
      async (uri: vscode.Uri) => {
        if (vscode.workspace.workspaceFolders) {
          const libPath = getLibPath([...vscode.workspace.workspaceFolders]);
          if (libPath) {
            createCleanCodeFeatureStructure(libPath);

            const pubspecPath = path.join(libPath, "pubspec.yaml");
            const intlConfig = `
flutter_intl:
  enabled: true
  class_name: I10n
  main_locale: en
  arb_dir: lib/core/localization/l10n
  output_dir: lib/core/localization/generated`;

            if (fs.existsSync(pubspecPath)) {
              let pubspecContent = fs.readFileSync(pubspecPath, "utf8");
              if (!pubspecContent.includes("flutter_intl:")) {
                pubspecContent += intlConfig;
                fs.writeFileSync(pubspecPath, pubspecContent, "utf8");
                vscode.window.showInformationMessage(
                  "flutter_intl configuration added to pubspec.yaml"
                );
              }

              vscode.workspace
                .openTextDocument(vscode.Uri.file(pubspecPath))
                .then((doc) => {
                  createFeatureStructure(
                    path.join(libPath, "lib", "features"),
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
              vscode.window.showErrorMessage("pubspec.yaml file not found.");
            }
          } else {
            vscode.window.showErrorMessage("lib folder not found.");
          }
        } else {
          vscode.window.showErrorMessage("No workspace folder found.");
        }
      }
    );

  return registerCreateCleanCodeFolderStructureCommand;
}
