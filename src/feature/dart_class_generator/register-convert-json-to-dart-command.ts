import * as vscode from "vscode";
import { ConvertJsonToDart } from "./json_to_dart_converter";
import * as path from "path";

export function convertJsonToDartCommand() {
  let registerCreateCleanCodeFolderStructureCommand =
    vscode.commands.registerCommand(
      "flutter-genius.convertJsonToDart",
      async (uri: vscode.Uri) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("No active text editor found.");
          return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        try {
          // Check if the selected text is valid JSON
          const jsonObj = JSON.parse(text);
          // Ask for the main class name
          const className = await vscode.window.showInputBox({
            prompt: "Enter the main class name",
          });
          if (!className) {
            return;
          }
          // path of current file
          const filepath = editor.document.fileName;
          // extract the folder path
          const folderPath = path.dirname(filepath).trim();

          const converter = new ConvertJsonToDart(text);
          converter.convert(className, folderPath);

          vscode.window.showInformationMessage(
            "Dart classes generated successfully."
          );
          vscode.window.showInformationMessage(
            "Export statement added successfully. Running dart fix --apply command..."
          );
          const terminal = vscode.window.createTerminal();
          terminal.sendText("flutter pub add hive_flutter");
          terminal.sendText(
            "flutter pub add --dev hive_generator build_runner flutter_gen"
          );
          terminal.sendText("flutter pub get");
          terminal.sendText("dart fix --apply");
          terminal.show();
        } catch (error: any) {
          console.log(`errorFound: ${error}`);
          vscode.window.showErrorMessage(error);
        }
      }
    );

  return registerCreateCleanCodeFolderStructureCommand;
}
