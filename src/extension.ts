import * as vscode from "vscode";
import { generateEntityToModelCommand } from "./commands/generate_mapper";
import { extractLocalizationCommand } from "./commands/extract_localization";
import { extractLocalizationAggressiveCommand } from "./commands/extract_localization_aggressive";
import { createBlocCommand } from "./commands/create_bloc";
import { addSizeExtensionCommand } from "./commands/add_size_extension";
import { convertEnumToJsonEnumCommand } from "./commands/convert_enum_command";

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Dart Entity Mapper is now active!");

  // Register the command logic separated in the commands folder
  let disposable = vscode.commands.registerCommand(
    "flutter-genius.generateMapper",
    generateEntityToModelCommand
  );

  let locDisposable = vscode.commands.registerCommand(
    "flutter-genius.extractLocalization", // Ensure this ID matches package.json
    extractLocalizationCommand
  );

  let locAggressiveDisposable = vscode.commands.registerCommand(
    "flutter-genius.extractLocalizationAggressive",
    extractLocalizationAggressiveCommand
  );

  let createBlocDisposable = vscode.commands.registerCommand(
    "flutter-genius.createBloc",
    (uri: vscode.Uri) => createBlocCommand(uri)
  );

  let sizeExtDisposable = vscode.commands.registerCommand(
    "flutter-genius.addSizeExtension",
    addSizeExtensionCommand
  );

  let enumDisposable = vscode.commands.registerCommand(
    "flutter-genius.convertEnum",
    convertEnumToJsonEnumCommand
  );
  context.subscriptions.push(enumDisposable);

  context.subscriptions.push(sizeExtDisposable);
  context.subscriptions.push(createBlocDisposable);
  context.subscriptions.push(locAggressiveDisposable);
  context.subscriptions.push(locDisposable);
  context.subscriptions.push(disposable);
}

export function deactivate() {}
