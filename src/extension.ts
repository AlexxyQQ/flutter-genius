import * as vscode from "vscode";
import { createAddFeatureCommand } from "./command/add-feature-command";

export function activate(context: vscode.ExtensionContext) {
  var addFeature = createAddFeatureCommand();
  context.subscriptions.push(addFeature);
}

export function deactivate() {}
