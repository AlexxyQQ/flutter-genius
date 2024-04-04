import * as vscode from "vscode";
import { registerAddFeatureCommand } from "./feature/add_feature/commands/register-add-feature-command";
import { createGenerateCleanCodeFolderStructureCommand } from "./feature/generate_clean_code_arch/commands/register-gen-clean-code-folder-structure-command";

export function activate(context: vscode.ExtensionContext) {
  var addFeature = registerAddFeatureCommand();
  var generateCleanCodeFolderStructure =
    createGenerateCleanCodeFolderStructureCommand();
  context.subscriptions.push(addFeature);
  context.subscriptions.push(generateCleanCodeFolderStructure);
}

export function deactivate() {}
