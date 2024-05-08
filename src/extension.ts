import * as vscode from "vscode";
import { registerAddFeatureCommand } from "./feature/add_feature/commands/register-add-feature-command";
import { createGenerateCleanCodeFolderStructureCommand } from "./feature/generate_clean_code_arch/commands/register-gen-clean-code-folder-structure-command";
import { convertJsonToDartCommand } from "./feature/dart_class_generator/register-convert-json-to-dart-command";

export function activate(context: vscode.ExtensionContext) {
  var addFeature = registerAddFeatureCommand();
  var generateCleanCodeFolderStructure =
    createGenerateCleanCodeFolderStructureCommand();
  var convertJsonToDart = convertJsonToDartCommand();
  context.subscriptions.push(addFeature);
  context.subscriptions.push(generateCleanCodeFolderStructure);
  context.subscriptions.push(convertJsonToDart);
}

export function deactivate() {}
