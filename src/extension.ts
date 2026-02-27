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
}

export function deactivate() {}
