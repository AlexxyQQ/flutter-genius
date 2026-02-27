/**
 * file_manager.ts
 * ----------------
 * Utilities for reading, writing, and resolving file paths within the extension.
 * All file I/O goes through here so it's easy to swap implementations later.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * Writes UTF-8 content to the given absolute file path.
 * Creates any missing parent directories automatically.
 */
export async function writeFile(
  fsPath: string,
  content: string,
): Promise<void> {
  const dir = path.dirname(fsPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const uri = vscode.Uri.file(fsPath);
  const data = new TextEncoder().encode(content);
  await vscode.workspace.fs.writeFile(uri, data);
}

/**
 * Returns the relative Dart import path from a directory to a target file.
 *
 * Example:
 *   fromDir  = /project/lib/features/account/data/models
 *   toFile   = /project/lib/features/account/domain/entities/account_entity.dart
 *   result   = ../../domain/entities/account_entity.dart
 *
 * Always uses forward slashes so the result is valid on all platforms.
 */
export function getRelativeImportPath(fromDir: string, toFile: string): string {
  let rel = path.relative(fromDir, toFile);
  rel = rel.split(path.sep).join("/"); // Normalize to forward slashes
  if (!rel.startsWith(".")) {
    rel = "./" + rel;
  }
  return rel;
}
