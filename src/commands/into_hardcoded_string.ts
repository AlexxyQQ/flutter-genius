import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// ========================== CONFIG ==========================
function getConfig() {
  const config = vscode.workspace.getConfiguration("flutterLocalization");
  return {
    translationsPath:
      config.get<string>("translationsPath") ||
      "assets/translations/en-GB.json",
    outputFileName:
      config.get<string>("outputFileName") || "locale_keys.g.dart",
    outputPath: config.get<string>("outputPath") || "lib/config/constants/gen",
  };
}

// ========================== MAIN COMMAND ==========================
export async function intoHardcodedStringCommand() {
  const outputChannel = vscode.window.createOutputChannel(
    "EasyLocalization Hardcoder",
  );
  outputChannel.show(true);
  outputChannel.appendLine("🚀 Starting Hardcoder Command...");

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("❌ No workspace open");
    return;
  }
  const rootPath = workspaceFolders[0].uri.fsPath;
  const config = getConfig();

  try {
    // ---------------------------------------------------------
    // 1. SELECT SCOPE
    // ---------------------------------------------------------
    const scope = await vscode.window.showQuickPick(
      ["Current File", "Select Folder", "Entire lib/ Folder"],
      { placeHolder: "Where do you want to replace strings?" },
    );
    if (!scope) return;

    let filesToScan: vscode.Uri[] = [];

    if (scope === "Current File") {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("❌ No active editor found");
        return;
      }
      filesToScan.push(editor.document.uri);
    } else if (scope === "Entire lib/ Folder") {
      outputChannel.appendLine("🔍 Scanning entire lib folder...");
      filesToScan = await vscode.workspace.findFiles("lib/**/*.dart");
    } else if (scope === "Select Folder") {
      const folderSelected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Folder to Process",
        defaultUri: vscode.Uri.file(path.join(rootPath, "lib")),
      });
      if (!folderSelected || folderSelected.length === 0) return;
      const folderPath = folderSelected[0].fsPath;
      const relativePattern = new vscode.RelativePattern(
        folderPath,
        "**/*.dart",
      );
      filesToScan = await vscode.workspace.findFiles(relativePattern);
    }

    if (filesToScan.length === 0) {
      vscode.window.showWarningMessage("No Dart files found to process.");
      return;
    }

    // ---------------------------------------------------------
    // 2. LOCATE KEYS & TRANSLATIONS
    // ---------------------------------------------------------
    let localeKeysPath = path.join(
      rootPath,
      config.outputPath,
      config.outputFileName,
    );
    if (!fs.existsSync(localeKeysPath)) {
      const foundFiles = await vscode.workspace.findFiles(
        `**/${config.outputFileName}`,
      );
      if (foundFiles.length > 0) {
        localeKeysPath = foundFiles[0].fsPath;
      } else {
        outputChannel.appendLine("❌ Could not find locale_keys.g.dart.");
        return;
      }
    }

    const localeKeysContent = fs.readFileSync(localeKeysPath, "utf8");
    const varToKeyMap = new Map<string, string>();

    // Detect Class Name
    const classMatch = /abstract\s+class\s+(\w+)/.exec(localeKeysContent);
    const className = classMatch ? classMatch[1] : "LocaleKeys";

    // Parse Variables
    const keysRegex = /static\s+const\s+([a-zA-Z0-9_]+)\s*=\s*['"](.*?)['"]/g;
    let keyMatch;
    while ((keyMatch = keysRegex.exec(localeKeysContent)) !== null) {
      varToKeyMap.set(keyMatch[1], keyMatch[2]);
    }

    // Load Translations (Initial Load for Replacement)
    let translationPath = path.join(rootPath, config.translationsPath);
    if (!fs.existsSync(translationPath)) {
      const userSelected = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: "Select Translation JSON",
        filters: { "JSON files": ["json"] },
      });
      if (!userSelected || userSelected.length === 0) return;
      translationPath = userSelected[0].fsPath;
    }

    let translations = JSON.parse(fs.readFileSync(translationPath, "utf8"));

    // ---------------------------------------------------------
    // 3. PROCESS FILES
    // ---------------------------------------------------------
    const workspaceEdit = new vscode.WorkspaceEdit();
    let totalEdits = 0;
    const keysToDelete = new Set<string>();

    const strictRegex = new RegExp(
      `${className}\\s*\\.\\s*([a-zA-Z0-9_]+)(?:\\.tr\\(\\))?`,
      "g",
    );
    const uniqueVars = Array.from(varToKeyMap.keys());
    const looseRegex = new RegExp(
      `\\b(${uniqueVars.join("|")})\\b(?:\\.tr\\(\\))?`,
      "g",
    );

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Processing...",
        cancellable: true,
      },
      async (progress, token) => {
        const increment = 100 / filesToScan.length;

        for (const fileUri of filesToScan) {
          if (token.isCancellationRequested) break;
          if (fileUri.fsPath === localeKeysPath) continue;

          try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            const text = document.getText();
            const edits: vscode.TextEdit[] = [];

            let activeRegex = strictRegex;
            if (!text.match(strictRegex)) activeRegex = looseRegex;
            activeRegex.lastIndex = 0;

            let match;
            while ((match = activeRegex.exec(text)) !== null) {
              const fullMatchString = match[0];
              const variableName = match[1];
              const jsonKey = varToKeyMap.get(variableName);

              if (jsonKey) {
                // Get value from CURRENT translations in memory
                let finalValue = getNestedValue(translations, jsonKey);

                if (finalValue !== undefined && finalValue !== null) {
                  if (typeof finalValue !== "string") {
                    if (
                      typeof finalValue === "number" ||
                      typeof finalValue === "boolean"
                    ) {
                      finalValue = String(finalValue);
                    } else {
                      continue;
                    }
                  }

                  const startPos = document.positionAt(match.index);
                  const endPos = document.positionAt(
                    match.index + fullMatchString.length,
                  );
                  const range = new vscode.Range(startPos, endPos);
                  const safeValue = finalValue
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, "\\n");

                  edits.push(new vscode.TextEdit(range, `"${safeValue}"`));

                  // Mark this key for deletion
                  keysToDelete.add(jsonKey);
                }
              }
            }

            if (edits.length > 0) {
              workspaceEdit.set(fileUri, edits);
              totalEdits += edits.length;
            }
            progress.report({ increment: increment });
          } catch (err) {
            outputChannel.appendLine(
              `   ❌ Error reading ${fileUri.fsPath}: ${err}`,
            );
          }
        }
      },
    );

    // ---------------------------------------------------------
    // 4. APPLY CHANGES & DELETE KEYS
    // ---------------------------------------------------------
    if (totalEdits > 0) {
      const success = await vscode.workspace.applyEdit(workspaceEdit);

      if (success) {
        outputChannel.appendLine(`✅ Replaced ${totalEdits} strings in code.`);

        if (keysToDelete.size > 0) {
          const deleteConfirm = await vscode.window.showWarningMessage(
            `Replaced ${totalEdits} strings. Delete ${keysToDelete.size} keys from ${path.basename(translationPath)}?`,
            "Yes, Delete Keys",
            "No, Keep Keys",
          );

          if (deleteConfirm === "Yes, Delete Keys") {
            outputChannel.appendLine(
              "🔄 Reloading JSON from disk to ensure freshness...",
            );

            // 1. FRESH READ (Critical Fix)
            const freshJsonContent = fs.readFileSync(translationPath, "utf8");
            const freshTranslations = JSON.parse(freshJsonContent);

            let deletedCount = 0;
            keysToDelete.forEach((key) => {
              if (deleteNestedKey(freshTranslations, key, outputChannel)) {
                deletedCount++;
              }
            });

            // 2. WRITE BACK
            fs.writeFileSync(
              translationPath,
              JSON.stringify(freshTranslations, null, 2),
              "utf8",
            );

            vscode.window.showInformationMessage(
              `✅ Deleted ${deletedCount} keys from JSON.`,
            );
            outputChannel.appendLine(
              `🗑️ Successfully deleted ${deletedCount} keys.`,
            );
          }
        }
      } else {
        vscode.window.showErrorMessage("❌ Failed to apply code edits.");
      }
    } else {
      vscode.window.showWarningMessage("No replacements made.");
    }
  } catch (error: any) {
    outputChannel.appendLine(`❌ CRITICAL ERROR: ${error.message}`);
    vscode.window.showErrorMessage("Error: " + error.message);
  }
}

// Helper: Get Value
function getNestedValue(obj: any, key: string): any {
  return key.split(".").reduce((o: any, i: string) => (o ? o[i] : null), obj);
}

// Helper: Robust Delete with Logging
function deleteNestedKey(
  obj: any,
  key: string,
  output: vscode.OutputChannel,
): boolean {
  const parts = key.split(".");
  const last = parts.pop();

  if (!last) return false;

  let current = obj;
  const stack: { obj: any; key: string }[] = [];

  // Traverse down
  for (const part of parts) {
    if (current[part] === undefined) {
      output.appendLine(
        `   ⚠️ Could not delete '${key}': Parent '${part}' missing.`,
      );
      return false;
    }
    stack.push({ obj: current, key: part });
    current = current[part];
  }

  // Delete
  if (current[last] !== undefined) {
    delete current[last];
    output.appendLine(`   🗑️ Deleted key: ${key}`);

    // Recursive Cleanup (Remove empty parents)
    // We iterate backwards up the stack
    for (let i = stack.length - 1; i >= 0; i--) {
      const node = stack[i];
      // Check if the object we just deleted from is now empty
      // Note: 'current' was the object we deleted from in the previous step
      // In the first iteration of loop, 'current' is the direct parent of the deleted key.

      if (Object.keys(current).length === 0) {
        delete node.obj[node.key]; // Delete the empty object from its parent
        output.appendLine(`      🧹 Cleaned up empty parent: ${node.key}`);
        current = node.obj; // Move pointer up to parent for next iteration
      } else {
        break; // Not empty, stop cleaning
      }
    }
    return true;
  } else {
    output.appendLine(
      `   ⚠️ Could not delete '${key}': Key not found in JSON.`,
    );
    return false;
  }
}
