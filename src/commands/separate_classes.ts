/**
 * separate_classes.ts
 * ----------------
 * VSCode command: "flutter-genius.separateClasses"
 *
 * Splits a Dart file containing multiple top-level declarations (classes,
 * enums, mixins) into individual files. Works on ANY Dart file — not just
 * entity files.
 *
 * Routing rules (same as entity separator):
 *   - Enums  → lib/config/constants/enums/app_specifics/<snake_name>.dart
 *   - Others → same directory as the original, named <snake_name>.dart
 *
 * User flow:
 *   1. Run the command with a Dart file open.
 *   2. A QuickPick lists every declaration in the file.
 *      - Pick one → that declaration stays in the original file; everything
 *        else is extracted to its own file.
 *      - Pick "Extract all" → every declaration is moved to its own file;
 *        the original becomes a barrel that re-exports the in-directory files.
 *   3. Done — newly created files appear in the explorer.
 */

import * as vscode from "vscode";
import { getAllDeclarations, DeclarationInfo } from "../utils/dart_parser";
import {
  separateDeclarations,
  separateAllToBarrel,
} from "../utils/entity_separator";

// ---------------------------------------------------------------------------
// Type icons used in the QuickPick for readability
// ---------------------------------------------------------------------------
const TYPE_ICON: Record<DeclarationInfo["type"], string> = {
  class: "$(symbol-class)",
  enum: "$(symbol-enum)",
  mixin: "$(symbol-misc)",
};

// ---------------------------------------------------------------------------
// Command Entry Point
// ---------------------------------------------------------------------------

/**
 * Main command handler. Registered as "flutter-genius.separateClasses".
 */
export async function separateClassesCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Open a Dart file to use Class Separator.");
    return;
  }

  const document = editor.document;
  const filePath = document.uri.fsPath;

  // ── Step 1: Parse all declarations ────────────────────────────────────────
  const declarations = getAllDeclarations(document.getText());

  if (declarations.length === 0) {
    vscode.window.showInformationMessage("No classes, enums, or mixins found in this file.");
    return;
  }

  if (declarations.length === 1) {
    vscode.window.showInformationMessage(
      `Only one declaration ("${declarations[0].name}") found — nothing to separate.`
    );
    return;
  }

  // ── Step 2: Build QuickPick options ───────────────────────────────────────
  // One option per declaration (keep that one in the original file)
  // plus an "Extract all" option at the bottom.
  const declarationOptions = declarations.map((decl) => ({
    label: `${TYPE_ICON[decl.type]}  ${decl.name}`,
    description: `Keep this ${decl.type} in the original file — extract the rest`,
    value: decl.name,
  }));

  const extractAllOption = {
    label: "$(files)  Extract all into separate files",
    description: "Original file becomes a barrel that re-exports everything",
    value: "__EXTRACT_ALL__",
  };

  const choice = await vscode.window.showQuickPick(
    [...declarationOptions, extractAllOption],
    {
      title: "Flutter Genius: Class Separator",
      placeHolder: `Found ${declarations.length} declarations. Which one should stay in this file?`,
      ignoreFocusOut: true,
    }
  );

  if (!choice) {
    return; // User dismissed
  }

  // ── Step 3: Run the appropriate separation ─────────────────────────────────
  try {
    if (choice.value === "__EXTRACT_ALL__") {
      await separateAllToBarrel(document, declarations, filePath);
      vscode.window.showInformationMessage(
        `Extracted all ${declarations.length} declarations. Original file is now a barrel.`
      );
    } else {
      const primaryName = choice.value;
      await separateDeclarations(document, declarations, primaryName, filePath);
      const extractedCount = declarations.length - 1;
      vscode.window.showInformationMessage(
        `"${primaryName}" kept in place. Extracted ${extractedCount} declaration(s) to separate files.`
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Class Separator failed: ${error.message}`);
  }
}
