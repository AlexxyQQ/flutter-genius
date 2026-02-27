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

  // ── Step 1: Resolve output paths ──────────────────────────────────────────
  const filePathMap = buildFilePathMap(declarations, primaryName, originalFilePath, originalDir, libRoot);

  // ── Step 2: Write each non-primary declaration to its own file ────────────
  for (const decl of declarations) {
    if (decl.name === primaryName) {
      continue; // Handled in step 3
    }
    const targetPath = filePathMap.get(decl.name)!;
    const content = buildFileContent(decl, path.basename(targetPath), path.dirname(targetPath), filePathMap);
    await writeFile(targetPath, content);
  }

  // ── Step 3: Rewrite original file with only the primary + imports ─────────
  const primaryDecl = declarations.find((d) => d.name === primaryName);
  if (primaryDecl) {
    const content = buildFileContent(
      primaryDecl,
      path.basename(originalFilePath),
      originalDir,
      filePathMap
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

  // ── Step 1: Resolve output paths (no primary — every decl is extracted) ───
  const filePathMap = buildFilePathMap(
    declarations,
    null,     // null = extract everything
    originalFilePath,
    originalDir,
    libRoot
  );

  // ── Step 2: Write every declaration to its own file ───────────────────────
  for (const decl of declarations) {
    const targetPath = filePathMap.get(decl.name)!;
    const content = buildFileContent(
      decl,
      path.basename(targetPath),
      path.dirname(targetPath),
      filePathMap
    );
    await writeFile(targetPath, content);
  }

  // ── Step 3: Rewrite original as a barrel ──────────────────────────────────
  const lines: string[] = [
    "// Barrel file — re-exports all separated declarations.",
    "// Note: enums were moved to lib/config/constants/enums/app_specifics/",
    "//       and are not re-exported here.",
    "",
  ];

  for (const [name, filePath] of filePathMap) {
    const decl = declarations.find((d) => d.name === name);
    // Only export files in the same directory (skip enums at a different path)
    if (decl && decl.type !== "enum") {
      const rel = getRelativeImportPath(originalDir, filePath);
      lines.push(`export '${rel}';`);
    }
  }

  lines.push("");
  await applyDocumentEdit(document, lines.join("\n"));
}

// ---------------------------------------------------------------------------
// Private — Path Resolution
// ---------------------------------------------------------------------------

/**
 * Builds the name → absolute-path map for all declarations.
 *
 * @param primaryName  The name of the class that stays in the original file,
 *                     or null when extracting everything (barrel mode).
 */
function buildFilePathMap(
  declarations: DeclarationInfo[],
  primaryName: string | null,
  originalFilePath: string,
  originalDir: string,
  libRoot: string | null
): Map<string, string> {
  const map = new Map<string, string>();

  for (const decl of declarations) {
    if (decl.name === primaryName) {
      // Primary stays in the original file
      map.set(decl.name, originalFilePath);
      continue;
    }

    if (decl.type === "enum") {
      // Enums → lib/config/constants/enums/app_specifics/
      const enumDir = libRoot
        ? path.join(libRoot, "config", "constants", "enums", "app_specifics")
        : path.join(originalDir, "enums");
      map.set(decl.name, path.join(enumDir, `${toSnakeCase(decl.name)}.dart`));
    } else {
      // All other declarations → same directory
      map.set(decl.name, path.join(originalDir, `${toSnakeCase(decl.name)}.dart`));
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
 *   - Any other separated declaration referenced by name in the body
 *     gets a relative import.
 *   - Freezed classes get `part '*.freezed.dart'`.
 *   - @JsonSerializable / JsonConverter classes get `part '*.g.dart'`.
 */
function buildFileContent(
  decl: DeclarationInfo,
  fileName: string,
  fileDir: string,
  allFilePaths: Map<string, string>
): string {
  const lines: string[] = [];
  const baseName = fileName.replace(".dart", "");

  // ── Package imports ───────────────────────────────────────────────────────
  if (decl.isFreezed) {
    lines.push("import 'package:freezed_annotation/freezed_annotation.dart';");
  }

  if (
    decl.type === "enum" &&
    (decl.body.includes("@JsonEnum") || decl.body.includes("JsonConverter"))
  ) {
    lines.push("import 'package:json_annotation/json_annotation.dart';");
  }

  // ── Relative imports for referenced declarations ──────────────────────────
  for (const [refName, refPath] of allFilePaths) {
    if (refName === decl.name) {
      continue; // No self-import
    }
    // Only import if the body actually uses this name
    if (new RegExp(`\\b${refName}\\b`).test(decl.body)) {
      const rel = getRelativeImportPath(fileDir, refPath);
      lines.push(`import '${rel}';`);
    }
  }

  // ── Part directives ───────────────────────────────────────────────────────
  const needsFreezedPart = decl.isFreezed;
  const needsJsonPart =
    decl.body.includes("@JsonSerializable") ||
    (decl.type === "enum" &&
      (decl.body.includes("@JsonEnum") || decl.body.includes("JsonConverter")));

  if (needsFreezedPart || needsJsonPart) {
    lines.push("");
    if (needsFreezedPart) {
      lines.push(`part '${baseName}.freezed.dart';`);
    }
    if (needsJsonPart) {
      lines.push(`part '${baseName}.g.dart';`);
    }
  }

  // ── Declaration body ──────────────────────────────────────────────────────
  lines.push("");
  lines.push(decl.body);
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
