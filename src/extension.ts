/**
 * extension.ts
 * ----------------
 * VSCode extension entry point.
 *
 * Responsibilities:
 *   - Called once by VSCode when the extension activates.
 *   - Registers all commands and pushes their disposables to the context.
 *
 * Adding a new command:
 *   1. Implement the command function in src/commands/<name>.ts.
 *   2. Import it here and register it with vscode.commands.registerCommand.
 *   3. Add the command ID to contributes.commands in package.json.
 */

import * as vscode from "vscode";
import { generateEntityToModelCommand } from "./commands/generate_entity_to_model";
import { separateClassesCommand } from "./commands/separate_classes";
import { generateJsonEnumCommand } from "./commands/generate_json_enum";

export function activate(context: vscode.ExtensionContext) {
  console.log("Flutter Genius is now active.");

  // -------------------------------------------------------------------------
  // Entity → Model generator
  // Converts a Dart entity class to a Freezed model with JSON serialization
  // and bidirectional mapping extensions.
  // -------------------------------------------------------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutter-genius.generateEntityToModel",
      generateEntityToModelCommand,
    ),
  );

  // -------------------------------------------------------------------------
  // Class Separator
  // Splits a multi-declaration Dart file into individual files.
  // Works on any Dart file — not just entity files.
  // -------------------------------------------------------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutter-genius.separateClasses",
      separateClassesCommand,
    ),
  );

  // -------------------------------------------------------------------------
  // JSON Enum Generator
  // Converts a plain enum to a @JsonEnum + JsonConverter pattern in-place.
  // -------------------------------------------------------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutter-genius.generateJsonEnum",
      generateJsonEnumCommand,
    ),
  );
}

export function deactivate() {}
