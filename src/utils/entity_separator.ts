/**
 * entity_separator.ts
 * ----------------
 * Core logic for splitting a Dart file that contains multiple declarations
 * (classes, enums, mixins) into individual files.
 *
 * Two public entry points:
 *
 *   separateDeclarations()
 *     One declaration stays in the original file (the "primary"); everything
 *     else is extracted. Used by both the entity→model command and the
 *     standalone class separator command.
 *
 *   separateAllToBarrel()
 *     Every declaration is extracted to its own file. The original file is
 *     rewritten as a barrel that re-exports the in-directory files.
 *     Enum files (moved to lib/config/constants/enums/app_specifics/) are
 *     noted in a comment but not re-exported from the barrel.
 *
 * Routing rules:
 *   - Enums → lib/config/constants/enums/app_specifics/<snake_name>.dart
 *   - Everything else → same directory as the original file, <snake_name>.dart
 *
 * Entity renaming:
 *   When the source file contains at least one Entity-named class, any plain
 *   class without an "Entity", "Model", or "Mixin" suffix is automatically
 *   renamed on extraction (e.g. "Address" → "AddressEntity", file:
 *   address_entity.dart). References to the renamed type in all rewritten
 *   files are updated accordingly.
 */

import * as vscode from "vscode";
import * as path from "path";
import { DeclarationInfo } from "./dart_parser";
import { writeFile, getRelativeImportPath } from "./file_manager";
import { toSnakeCase } from "./string_utils";

// ---------------------------------------------------------------------------
// Public Helpers
// ---------------------------------------------------------------------------

/**
 * Locates the `lib/` directory by walking up from the given file path.
 * Returns null if no `lib/` ancestor directory is found.
 */
export function findLibRoot(filePath: string): string | null {
  const parts = filePath.split(path.sep);
  const libIndex = parts.lastIndexOf("lib");
  if (libIndex === -1) {
    return null;
  }
  return parts.slice(0, libIndex + 1).join(path.sep);
}

// ---------------------------------------------------------------------------
// Public Entry Point 1 — keep one class, extract the rest
// ---------------------------------------------------------------------------

/**
 * Extracts all declarations except `primaryName` into individual files.
 * The primary declaration stays in the original file (rewritten with proper
 * imports pointing to the extracted files).
 *
 * @param document        The VS Code document being edited.
 * @param declarations    All declarations found by getAllDeclarations().
 * @param primaryName     The declaration to keep in the original file.
 * @param originalFilePath Absolute path of the original file.
 * @returns Map of declaration name → absolute path where it was written.
 */
export async function separateDeclarations(
  document: vscode.TextDocument,
  declarations: DeclarationInfo[],
  primaryName: string,
  originalFilePath: string
): Promise<Map<string, string>> {
  const originalDir = path.dirname(originalFilePath);
  const libRoot = findLibRoot(originalFilePath);

  // Build rename map — plain classes in entity files get an "Entity" suffix.
  // The primary class is excluded so it is never renamed.
  const renameMap = buildEntityRenameMap(declarations, primaryName);

  // ── Step 1: Resolve output paths ──────────────────────────────────────────
  const filePathMap = buildFilePathMap(
    declarations,
    primaryName,
    originalFilePath,
    originalDir,
    libRoot,
    renameMap
  );

  // ── Step 2: Write each non-primary declaration to its own file ────────────
  for (const decl of declarations) {
    if (decl.name === primaryName) {
      continue; // Handled in step 3
    }
    const targetPath = filePathMap.get(decl.name)!;
    const content = buildFileContent(
      decl,
      path.basename(targetPath),
      path.dirname(targetPath),
      filePathMap,
      renameMap
    );
    await writeFile(targetPath, content);
  }

  // ── Step 3: Rewrite original file with only the primary + imports ─────────
  const primaryDecl = declarations.find((d) => d.name === primaryName);
  if (primaryDecl) {
    const content = buildFileContent(
      primaryDecl,
      path.basename(originalFilePath),
      originalDir,
      filePathMap,
      renameMap
    );
    await applyDocumentEdit(document, content);
  }

  return filePathMap;
}

// ---------------------------------------------------------------------------
// Public Entry Point 2 — extract ALL, turn original into barrel
// ---------------------------------------------------------------------------

/**
 * Extracts every declaration to its own file.
 * The original file is rewritten as a Dart barrel that re-exports all
 * in-directory files. Enum files (moved to a different directory) are noted
 * in a comment but not re-exported.
 *
 * @param document        The VS Code document being edited.
 * @param declarations    All declarations found by getAllDeclarations().
 * @param originalFilePath Absolute path of the original file.
 */
export async function separateAllToBarrel(
  document: vscode.TextDocument,
  declarations: DeclarationInfo[],
  originalFilePath: string
): Promise<void> {
  const originalDir = path.dirname(originalFilePath);
  const libRoot = findLibRoot(originalFilePath);

  // In barrel mode there is no primary, so all qualifying classes can be renamed.
  const renameMap = buildEntityRenameMap(declarations, null);

  // ── Step 1: Resolve output paths (no primary — every decl is extracted) ───
  const filePathMap = buildFilePathMap(
    declarations,
    null, // null = extract everything
    originalFilePath,
    originalDir,
    libRoot,
    renameMap
  );

  // ── Step 2: Write every declaration to its own file ───────────────────────
  for (const decl of declarations) {
    const targetPath = filePathMap.get(decl.name)!;
    const content = buildFileContent(
      decl,
      path.basename(targetPath),
      path.dirname(targetPath),
      filePathMap,
      renameMap
    );
    await writeFile(targetPath, content);
  }

  // ── Step 3: Clear the original file ──────────────────────────────────────
  // All declarations have been moved to separate files, so the original is
  // no longer needed. We clear it instead of making it a barrel — a barrel
  // would mask the individual files and confuse imports elsewhere.
  await applyDocumentEdit(
    document,
    "// All declarations in this file have been extracted to separate files.\n" +
    "// This file can safely be deleted.\n"
  );
}

// ---------------------------------------------------------------------------
// Private — Entity Rename Map
// ---------------------------------------------------------------------------

/**
 * Builds a map of original class name → renamed class name for extracted classes
 * that qualify for automatic Entity-suffix renaming.
 *
 * Renaming only kicks in when the source file already contains at least one
 * Entity-named class (i.e. it IS an entity file). Any plain class that lacks
 * an "Entity", "Model", or "Mixin" suffix gets renamed: "Address" → "AddressEntity".
 *
 * @param declarations  All declarations in the source file.
 * @param primaryName   The class staying in the original file; excluded from rename.
 *                      Pass null in barrel mode (no primary).
 */
function buildEntityRenameMap(
  declarations: DeclarationInfo[],
  primaryName: string | null
): Map<string, string> {
  const map = new Map<string, string>();

  // Only rename when this is clearly an entity file.
  const hasEntityClass = declarations.some(
    (d) => d.type === "class" && d.name.endsWith("Entity")
  );
  if (!hasEntityClass) {
    return map; // Nothing to rename
  }

  for (const decl of declarations) {
    if (
      decl.name === primaryName || // Never rename the primary
      decl.type !== "class" || // Only rename classes
      decl.name.endsWith("Entity") || // Already entity-named
      decl.name.endsWith("Model") || // Already model-named
      decl.name.endsWith("Mixin") // Already mixin-named
    ) {
      continue;
    }
    map.set(decl.name, `${decl.name}Entity`);
  }

  return map;
}

/**
 * Applies word-boundary name substitutions from renameMap to text.
 * E.g. "Address" → "AddressEntity" replaces all occurrences of the bare
 * word "Address" (not "AddressEntity", "MyAddress", etc.).
 */
function applyEntityRenames(
  text: string,
  renameMap: Map<string, string>
): string {
  let result = text;
  for (const [oldName, newName] of renameMap) {
    result = result.replace(new RegExp(`\\b${oldName}\\b`, "g"), newName);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Private — Path Resolution
// ---------------------------------------------------------------------------

/**
 * Builds the original-name → absolute-path map for all declarations.
 * Uses the RENAMED name for the file path when a rename applies, so that
 * e.g. "Address" (renamed → "AddressEntity") maps to address_entity.dart.
 *
 * @param primaryName  The declaration staying in the original file (null = barrel mode).
 * @param renameMap    Class rename substitutions (may be empty).
 */
function buildFilePathMap(
  declarations: DeclarationInfo[],
  primaryName: string | null,
  originalFilePath: string,
  originalDir: string,
  libRoot: string | null,
  renameMap: Map<string, string>
): Map<string, string> {
  const map = new Map<string, string>();

  for (const decl of declarations) {
    if (decl.name === primaryName) {
      // Primary stays in the original file — no rename, no move
      map.set(decl.name, originalFilePath);
      continue;
    }

    // Use the renamed name (if any) to derive the file name
    const effectiveName = renameMap.get(decl.name) ?? decl.name;

    if (decl.type === "enum") {
      // Enums → lib/config/constants/enums/app_specifics/
      const enumDir = libRoot
        ? path.join(libRoot, "config", "constants", "enums", "app_specifics")
        : path.join(originalDir, "enums");
      map.set(decl.name, path.join(enumDir, `${toSnakeCase(effectiveName)}.dart`));
    } else {
      // All other declarations → same directory, snake_case file name
      map.set(decl.name, path.join(originalDir, `${toSnakeCase(effectiveName)}.dart`));
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Private — File Content Builder
// ---------------------------------------------------------------------------

/**
 * Builds the complete Dart file content for a single declaration.
 *
 * Import strategy:
 *   - Freezed classes always get `freezed_annotation`.
 *   - Enums with @JsonEnum / JsonConverter get `json_annotation`.
 *   - Any other separated declaration referenced by name in the (renamed) body
 *     gets a relative import.
 *   - Freezed classes get `part '*.freezed.dart'`.
 *   - @JsonSerializable / JsonConverter classes get `part '*.g.dart'`.
 *
 * Rename strategy:
 *   - `renameMap` substitutions are applied to the declaration body before it
 *     is written, so class names and type references are updated in-place.
 *   - Import references are checked against the post-rename body text.
 *
 * @param allFilePaths  Map keyed by ORIGINAL declaration name → absolute path.
 * @param renameMap     Original → renamed class name substitutions.
 */
function buildFileContent(
  decl: DeclarationInfo,
  fileName: string,
  fileDir: string,
  allFilePaths: Map<string, string>,
  renameMap: Map<string, string>
): string {
  const lines: string[] = [];
  const baseName = fileName.replace(".dart", "");

  // Apply entity renames to the body so class names and type references are
  // updated before we emit the file (e.g. "class Address" → "class AddressEntity",
  // "Address primaryAddress" → "AddressEntity primaryAddress").
  const renamedBody = applyEntityRenames(decl.body, renameMap);

  // ── Package imports ───────────────────────────────────────────────────────
  if (decl.isFreezed) {
    lines.push("import 'package:freezed_annotation/freezed_annotation.dart';");
  }

  if (
    decl.type === "enum" &&
    (renamedBody.includes("@JsonEnum") || renamedBody.includes("JsonConverter"))
  ) {
    lines.push("import 'package:json_annotation/json_annotation.dart';");
  }

  // ── Relative imports for referenced declarations ──────────────────────────
  // Iterate over original-name keys; look for the RENAMED name in the renamed body.
  for (const [refName, refPath] of allFilePaths) {
    if (refName === decl.name) {
      continue; // No self-import
    }
    // Use the renamed name of the referenced declaration when checking the body,
    // because the body has already had renames applied.
    const renamedRefName = renameMap.get(refName) ?? refName;
    if (new RegExp(`\\b${renamedRefName}\\b`).test(renamedBody)) {
      const rel = getRelativeImportPath(fileDir, refPath);
      lines.push(`import '${rel}';`);
    }
  }

  // ── Part directives ───────────────────────────────────────────────────────
  const needsFreezedPart = decl.isFreezed;
  const needsJsonPart =
    renamedBody.includes("@JsonSerializable") ||
    (decl.type === "enum" &&
      (renamedBody.includes("@JsonEnum") || renamedBody.includes("JsonConverter")));

  if (needsFreezedPart || needsJsonPart) {
    lines.push("");
    if (needsFreezedPart) {
      lines.push(`part '${baseName}.freezed.dart';`);
    }
    if (needsJsonPart) {
      lines.push(`part '${baseName}.g.dart';`);
    }
  }

  // ── Declaration body (with renames applied) ───────────────────────────────
  lines.push("");
  lines.push(renamedBody);
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Private — Editor Helpers
// ---------------------------------------------------------------------------

/** Replaces the entire document content with `content` using a workspace edit. */
async function applyDocumentEdit(
  document: vscode.TextDocument,
  content: string
): Promise<void> {
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length)
  );
  edit.replace(document.uri, fullRange, content);
  await vscode.workspace.applyEdit(edit);
}
