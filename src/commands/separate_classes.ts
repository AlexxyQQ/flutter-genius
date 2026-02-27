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
 *      - Pick "Extract all" → the primary class (auto-detected from the file
 *        name) stays in the original file; everything else is extracted.
 *   3. Done — newly created files appear in the explorer.
 */

import * as vscode from "vscode";
import * as path from "path";
import { getAllDeclarations, DeclarationInfo } from "../utils/dart_parser";
import { separateDeclarations } from "../utils/entity_separator";

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

  // ── Step 2: Auto-detect the "primary" class for the "Extract all" option ──
  // The primary is the class whose name corresponds to this file. We try
  // three strategies in order:
  //   1. Class name matches the file name (snake_case → PascalCase).
  //      e.g. test_entity.dart → TestEntity
  //   2. First entity-named class (ends with "Entity").
  //   3. First class declaration in the file.
  const autoDetectedPrimary = detectPrimaryClass(declarations, filePath);

  // ── Step 3: Build QuickPick options ────────────────────────────────────────
  // One option per declaration (keep that one, extract the rest) plus an
  // "Extract all others" shortcut that uses the auto-detected primary.
  const declarationOptions = declarations.map((decl) => ({
    label: `${TYPE_ICON[decl.type]}  ${decl.name}`,
    description: `Keep this ${decl.type} in the original file — extract the rest`,
    value: decl.name,
  }));

  const extractAllOption = autoDetectedPrimary
    ? {
        label: "$(files)  Extract all into separate files",
        description: `"${autoDetectedPrimary}" stays in this file — all other declarations are extracted`,
        value: "__EXTRACT_ALL__",
      }
    : null;

  const items = extractAllOption
    ? [...declarationOptions, extractAllOption]
    : declarationOptions;

  const choice = await vscode.window.showQuickPick(items, {
    title: "Flutter Genius: Class Separator",
    placeHolder: `Found ${declarations.length} declarations. Which one should stay in this file?`,
    ignoreFocusOut: true,
  });

  if (!choice) {
    return; // User dismissed
  }

  // ── Step 4: Run the separation ─────────────────────────────────────────────
  // "Extract all" resolves to separateDeclarations with the auto-detected
  // primary — the original file is NOT cleared and NOT turned into a barrel.
  const primaryName =
    choice.value === "__EXTRACT_ALL__" ? autoDetectedPrimary! : choice.value;

  try {
    await separateDeclarations(document, declarations, primaryName, filePath);
    const extractedCount = declarations.length - 1;
    vscode.window.showInformationMessage(
      `"${primaryName}" kept in place. Extracted ${extractedCount} declaration(s) to separate files.`
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(`Class Separator failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Auto-detects which class should stay in the original file when the user
 * picks "Extract all". Tries three strategies in order:
 *
 *   1. Class name matches the file's base name converted to PascalCase
 *      (e.g. test_entity.dart → TestEntity).
 *   2. First entity-named class (ends with "Entity").
 *   3. First class declaration in the file.
 *
 * Returns null only when the file contains no class declarations at all.
 */
function detectPrimaryClass(
  declarations: DeclarationInfo[],
  filePath: string
): string | null {
  const fileName = path.basename(filePath, ".dart"); // e.g. "test_entity"

  // Convert snake_case file name → PascalCase expected class name
  const expectedName = fileName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(""); // "test_entity" → "TestEntity"

  // Strategy 1: exact name match
  const byName = declarations.find(
    (d) => d.type === "class" && d.name === expectedName
  );
  if (byName) {
    return byName.name;
  }

  // Strategy 2: first entity-named class
  const firstEntity = declarations.find(
    (d) => d.type === "class" && d.name.endsWith("Entity")
  );
  if (firstEntity) {
    return firstEntity.name;
  }

  // Strategy 3: first class
  const firstClass = declarations.find((d) => d.type === "class");
  return firstClass?.name ?? null;
}
