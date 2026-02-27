/**
 * entity_separator.ts
 * ----------------
 * Splits a Dart file that contains multiple declarations (entities, enums, mixins)
 * into individual files.
 *
 * Rules:
 *   - Enums          → lib/config/constants/enums/app_specifics/<snake_name>.dart
 *   - Other entities → same directory as the original file, <snake_name>.dart
 *   - Main entity    → stays in the original file (rewritten with proper imports)
 *
 * After separation the original file is rewritten to contain only the main entity
 * class plus the necessary imports for everything that was moved out.
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
 * Returns null if no `lib/` ancestor is found.
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
// Public Main Function
// ---------------------------------------------------------------------------

/**
 * Separates declarations from a multi-declaration file into individual files.
 *
 * @param document         The VS Code document being edited.
 * @param declarations     All declarations found by getAllDeclarations().
 * @param mainEntityName   The entity the user wants to convert (stays in original file).
 * @param originalFilePath Absolute path of the original file.
 * @returns A map of declaration name → absolute path where it was written.
 *          The main entity maps to the original file path.
 */
export async function separateDeclarations(
  document: vscode.TextDocument,
  declarations: DeclarationInfo[],
  mainEntityName: string,
  originalFilePath: string
): Promise<Map<string, string>> {
  const originalDir = path.dirname(originalFilePath);
  const libRoot = findLibRoot(originalFilePath);

  // ── Step 1: Resolve the output path for each declaration ──────────────────
  // name → absolute file path
  const filePathMap = new Map<string, string>();

  for (const decl of declarations) {
    if (decl.type === "class" && decl.name === mainEntityName) {
      // Main entity stays in the original file
      filePathMap.set(decl.name, originalFilePath);
      continue;
    }

    if (decl.type === "enum") {
      // Enums go to lib/config/constants/enums/app_specifics/
      const enumDir = libRoot
        ? path.join(libRoot, "config", "constants", "enums", "app_specifics")
        : path.join(originalDir, "enums");
      filePathMap.set(decl.name, path.join(enumDir, `${toSnakeCase(decl.name)}.dart`));
    } else {
      // Other classes/mixins go to the same directory as the original file
      filePathMap.set(decl.name, path.join(originalDir, `${toSnakeCase(decl.name)}.dart`));
    }
  }

  // ── Step 2: Write each separated declaration to its own file ──────────────
  for (const decl of declarations) {
    if (decl.type === "class" && decl.name === mainEntityName) {
      continue; // Handled in step 3 (rewrite)
    }

    const targetPath = filePathMap.get(decl.name)!;
    const targetDir = path.dirname(targetPath);
    const fileName = path.basename(targetPath);

    const content = buildFileContent(decl, fileName, targetDir, filePathMap);
    await writeFile(targetPath, content);
  }

  // ── Step 3: Rewrite the original file with only the main entity ───────────
  const mainDecl = declarations.find(
    (d) => d.type === "class" && d.name === mainEntityName
  );

  if (mainDecl) {
    const mainFileName = path.basename(originalFilePath);
    const content = buildFileContent(mainDecl, mainFileName, originalDir, filePathMap);

    // Apply the edit in-place so the open editor reflects the change immediately
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    edit.replace(document.uri, fullRange, content);
    await vscode.workspace.applyEdit(edit);
  }

  return filePathMap;
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the complete Dart file content for a single declaration.
 *
 * Import strategy:
 *   - Freezed classes always get `freezed_annotation`.
 *   - Enums with @JsonEnum / JsonConverter get `json_annotation`.
 *   - Any other separated declaration that is referenced by name in the body
 *     gets a relative import.
 *   - Freezed classes get `part '*.freezed.dart'`.
 *   - Classes with @JsonSerializable or JsonConverter get `part '*.g.dart'`.
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
    // Skip self-reference
    if (refName === decl.name) {
      continue;
    }
    // Only add if the body actually mentions this name
    // Use word-boundary check to avoid false matches inside longer names
    const wordBoundaryRegex = new RegExp(`\\b${refName}\\b`);
    if (wordBoundaryRegex.test(decl.body)) {
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
