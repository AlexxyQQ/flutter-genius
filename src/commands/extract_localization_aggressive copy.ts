// import * as vscode from "vscode";
// import * as path from "path";
// import * as fs from "fs";
// import * as cp from "child_process";
// import { promisify } from "util";
// import {
//   getPackageName,
//   checkTranslationFileExists,
// } from "../utils/project_utils";

// const exec = promisify(cp.exec);

// // ========================== CONFIGURATION ==========================
// const TRANSLATIONS_PATH = "assets/translations/en-GB.json";
// const EASY_LOC_IMPORT =
//   "import 'package:easy_localization/easy_localization.dart';";

// // UI Context Rules
// const UI_PARAMS = new Set([
//   "text",
//   "label",
//   "labelText",
//   "hintText",
//   "errorText",
//   "helperText",
//   "title",
//   "subtitle",
//   "message",
//   "content",
//   "header",
//   "placeholder",
//   "validate",
//   "description",
// ]);
// const UI_WIDGETS = new Set([
//   "Text",
//   "AppText",
//   "RichText",
//   "TextSpan",
//   "Toast",
//   "SnackBar",
//   "AlertDialog",
//   "ListTile",
//   "showDialog",
//   "CustomButton",
// ]);
// const TECH_FUNCTIONS = new Set([
//   "print",
//   "debugPrint",
//   "log",
//   "throw",
//   "Exception",
//   "jsonDecode",
//   "jsonEncode",
// ]);

// // Thresholds for sorting
// const GLOBAL_THRESHOLD = 1; // Used in 2+ features -> common.words
// const FEATURE_COMMON_THRESHOLD = 2; // Used in 2+ files inside ONE feature -> features.profile.common

// // ========================== TYPES ==========================

// interface StringStats {
//   text: string;
//   wordCount: number;
//   locations: Array<{
//     filePath: string;
//     feature: string;
//     relativePath: string;
//   }>;
// }

// // ========================== MAIN COMMAND ==========================

// export async function extractLocalizationAggressiveCommand() {
//   // 1. Setup - Check Workspace
//   const workspaceFolders = vscode.workspace.workspaceFolders;
//   if (!workspaceFolders) {
//     vscode.window.showErrorMessage("❌ No workspace opened.");
//     return;
//   }
//   const rootPath = workspaceFolders[0].uri.fsPath;

//   // 2. UTILS: Project Checks
//   const packageName = getPackageName(rootPath);
//   if (!packageName) {
//     vscode.window.showErrorMessage(
//       "❌ Could not find pubspec.yaml or package name.",
//     );
//     return;
//   }

//   const hasTranslationFile = checkTranslationFileExists(
//     rootPath,
//     TRANSLATIONS_PATH,
//   );
//   if (!hasTranslationFile) {
//     vscode.window.showErrorMessage(
//       `❌ Translation file not found at: ${TRANSLATIONS_PATH}`,
//     );
//     return;
//   }

//   // 3. SELECTION MENU: Current File or Folder?
//   const selection = await vscode.window.showQuickPick(
//     ["Current File", "Select Folder"],
//     {
//       placeHolder: "Where do you want to extract strings from?",
//     },
//   );

//   if (!selection) return;

//   let filesToScan: vscode.Uri[] = [];

//   // --- OPTION A: CURRENT FILE ---
//   if (selection === "Current File") {
//     const editor = vscode.window.activeTextEditor;
//     if (!editor) {
//       vscode.window.showErrorMessage("❌ No file is currently open.");
//       return;
//     }
//     const filePath = editor.document.uri.fsPath;
//     if (!filePath.endsWith(".dart")) {
//       vscode.window.showErrorMessage("❌ The open file is not a Dart file.");
//       return;
//     }
//     if (!filePath.includes(path.join(rootPath, "lib"))) {
//       vscode.window.showErrorMessage("❌ File must be inside the lib/ folder.");
//       return;
//     }
//     filesToScan = [editor.document.uri];
//   }
//   // --- OPTION B: SELECT FOLDER ---
//   else {
//     const selectedFolder = await vscode.window.showOpenDialog({
//       canSelectFiles: false,
//       canSelectFolders: true,
//       canSelectMany: false,
//       openLabel: "Select Folder to Scan",
//       defaultUri: vscode.Uri.file(path.join(rootPath, "lib")),
//     });

//     if (!selectedFolder || selectedFolder.length === 0) return;

//     const targetFolderPath = selectedFolder[0].fsPath;
//     if (!targetFolderPath.startsWith(rootPath)) {
//       vscode.window.showErrorMessage(
//         "❌ Please select a folder inside the current project.",
//       );
//       return;
//     }

//     const relativeSearchFolder = path.relative(rootPath, targetFolderPath);
//     const globPattern = new vscode.RelativePattern(
//       rootPath,
//       `${relativeSearchFolder}/**/*.dart`,
//     );
//     filesToScan = await vscode.workspace.findFiles(globPattern, "**/*.g.dart");
//   }

//   if (filesToScan.length === 0) {
//     vscode.window.showInformationMessage("ℹ️ No Dart files found to process.");
//     return;
//   }

//   // 4. Start Analysis Process
//   vscode.window.withProgress(
//     {
//       location: vscode.ProgressLocation.Notification,
//       title: "Smart Localization...",
//       cancellable: false,
//     },
//     async (progress) => {
//       try {
//         const translationFileAbsPath = path.join(rootPath, TRANSLATIONS_PATH);

//         // A. Load Existing Translations
//         const jsonContent = fs
//           .readFileSync(translationFileAbsPath, "utf8")
//           .trim();
//         let translations =
//           jsonContent.length === 0 ? {} : JSON.parse(jsonContent);

//         // Build map of { "Existing Value" : "key.path" }
//         let existingKeysMap = buildReverseIndex(translations);

//         // B. PASS 1: ANALYSIS (Scan & Count)
//         const stringUsageMap = new Map<string, StringStats>();
//         progress.report({
//           message: `Analyzing ${filesToScan.length} files...`,
//         });

//         for (const fileUri of filesToScan) {
//           const content = fs.readFileSync(fileUri.fsPath, "utf8");
//           if (shouldSkipFile(content, fileUri.fsPath)) continue;
//           analyzeFileStrings(fileUri.fsPath, content, rootPath, stringUsageMap);
//         }

//         // C. DECISION PHASE (Determine Keys)
//         const textToKeyMap = new Map<string, string>();

//         stringUsageMap.forEach((stats, text) => {
//           // 1. REUSE: If already localized in JSON, use that key
//           if (existingKeysMap.has(text)) {
//             textToKeyMap.set(text, existingKeysMap.get(text)!);
//             return;
//           }

//           // 2. SORT: New strings logic
//           const uniqueFeatures = new Set(stats.locations.map((l) => l.feature))
//             .size;
//           const totalUses = stats.locations.length;

//           let distinctKey = generateSafeKey(text);

//           // --- LOGIC: Global vs Feature vs Specific ---

//           // Case A: Used in Multiple Features (>= 2) -> GLOBAL COMMON
//           if (uniqueFeatures >= GLOBAL_THRESHOLD) {
//             distinctKey =
//               stats.wordCount === 1
//                 ? `common.words.${distinctKey}`
//                 : `common.sentences.${distinctKey}`;
//           }
//           // Case B: Used Multiple Times in ONE Feature -> FEATURE COMMON
//           else if (
//             uniqueFeatures === 1 &&
//             totalUses >= FEATURE_COMMON_THRESHOLD
//           ) {
//             const featureName = stats.locations[0].feature;
//             distinctKey = `features.${featureName}.common.${distinctKey}`;
//           }
//           // Case C: Used Once (or rarely) -> SPECIFIC PAGE KEY
//           else {
//             const loc = stats.locations[0];
//             let cleanPath = loc.relativePath
//               .replace(".dart", "")
//               .replace(/[\\/]/g, ".");
//             if (cleanPath.startsWith("lib."))
//               cleanPath = cleanPath.substring(4);

//             distinctKey = `${cleanPath}.${distinctKey}`;
//           }

//           textToKeyMap.set(text, distinctKey);
//           addNestedKey(translations, distinctKey.split("."), text);
//         });

//         // D. PASS 2: EXECUTION (Replace Strings)
//         progress.report({ message: "Applying changes..." });
//         let filesChangedCount = 0;
//         const generatedImport = `import 'package:${packageName}/config/constants/gen/locale_keys.g.dart';`;

//         for (const fileUri of filesToScan) {
//           const filePath = fileUri.fsPath;
//           const content = fs.readFileSync(filePath, "utf8");
//           if (shouldSkipFile(content, filePath)) continue;

//           const newContent = replaceInFile(
//             content,
//             textToKeyMap,
//             generatedImport,
//           );

//           if (newContent !== content) {
//             fs.writeFileSync(filePath, newContent, "utf8");
//             filesChangedCount++;
//           }
//         }

//         // E. Save & Run Generator
//         if (filesChangedCount > 0) {
//           fs.writeFileSync(
//             translationFileAbsPath,
//             JSON.stringify(translations, null, 2),
//             "utf8",
//           );

//           progress.report({ message: "Running code generation..." });
//           const genCommand = `dart run easy_localization:generate -S assets/translations -f keys -O lib/config/constants/gen -o locale_keys.g.dart`;

//           await exec(genCommand, { cwd: rootPath });
//           vscode.window.showInformationMessage(
//             `✅ Localized ${filesChangedCount} files successfully!`,
//           );
//         } else {
//           vscode.window.showInformationMessage(
//             "ℹ️ No new strings found to localize.",
//           );
//         }
//       } catch (e: any) {
//         vscode.window.showErrorMessage(`❌ Error: ${e.message}`);
//         console.error(e);
//       }
//     },
//   );
// }

// // ========================== ANALYSIS LOGIC ==========================

// function analyzeFileStrings(
//   filePath: string,
//   content: string,
//   rootPath: string,
//   map: Map<string, StringStats>,
// ) {
//   const stringLiteralRegex = /(['"])((?:\\.|(?!\1).)+)\1/g;

//   // --- FEATURE DETECTION ---
//   const relativePath = path.relative(path.join(rootPath, "lib"), filePath);
//   const featureName = detectFeatureName(relativePath);

//   let match;
//   while ((match = stringLiteralRegex.exec(content)) !== null) {
//     const text = match[2];
//     const offset = match.index;

//     if (shouldSkipBasic(text)) continue;

//     const contextBefore = content.substring(Math.max(0, offset - 50), offset);

//     if (isImportLine(contextBefore)) continue;
//     if (isInTechnicalFunction(contextBefore)) continue;
//     if (!isUIContext(contextBefore)) continue;
//     if (contextBefore.trim().endsWith("LocaleKeys.")) continue;

//     if (!map.has(text)) {
//       map.set(text, {
//         text: text,
//         wordCount: text.split(/\s+/).length,
//         locations: [],
//       });
//     }

//     map.get(text)!.locations.push({
//       filePath: filePath,
//       feature: featureName,
//       relativePath: relativePath,
//     });
//   }
// }

// // ========================== NEW HELPER ==========================

// function detectFeatureName(relativePath: string): string {
//   const parts = relativePath.split(path.sep);
//   if (
//     ["features", "pages", "screens", "views", "modules", "ui"].includes(
//       parts[0],
//     )
//   ) {
//     return parts.length > 1 ? parts[1] : parts[0];
//   }
//   return parts[0];
// }

// // ========================== REPLACEMENT LOGIC ==========================

// function replaceInFile(
//   content: string,
//   keyMap: Map<string, string>,
//   importString: string,
// ): string {
//   const stringLiteralRegex = /(['"])((?:\\.|(?!\1).)+)\1/g;

//   let newContent = content.replace(
//     stringLiteralRegex,
//     (fullMatch, quote, text, offset) => {
//       if (shouldSkipBasic(text)) return fullMatch;
//       const contextBefore = content.substring(Math.max(0, offset - 50), offset);

//       if (isImportLine(contextBefore)) return fullMatch;
//       if (isInTechnicalFunction(contextBefore)) return fullMatch;
//       if (!isUIContext(contextBefore)) return fullMatch;
//       if (contextBefore.trim().endsWith("LocaleKeys.")) return fullMatch;

//       if (keyMap.has(text)) {
//         const dotKey = keyMap.get(text)!;
//         const dartKey = dotKey.replace(/\./g, "_");

//         if (contextBefore.trim().endsWith("AppText(")) {
//           return `LocaleKeys.${dartKey}`;
//         } else {
//           return `LocaleKeys.${dartKey}.tr()`;
//         }
//       }
//       return fullMatch;
//     },
//   );

//   if (newContent !== content) {
//     newContent = cleanupConstKeywords(newContent);
//     if (!newContent.includes("locale_keys.g.dart")) {
//       newContent = `${importString}\n${newContent}`;
//     }
//     if (
//       newContent.includes(".tr()") &&
//       !newContent.includes("package:easy_localization/easy_localization.dart")
//     ) {
//       newContent = `${EASY_LOC_IMPORT}\n${newContent}`;
//     }
//   }
//   return newContent;
// }

// // ========================== HELPERS ==========================

// function shouldSkipFile(content: string, path: string): boolean {
//   if (path.endsWith(".freezed.dart") || path.endsWith(".g.dart")) return true;
//   if (content.includes("part of") || content.includes("generate:false"))
//     return true;
//   return false;
// }

// function isUIContext(contextBefore: string): boolean {
//   const trimmed = contextBefore.trimEnd();
//   const namedParamMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*:\s*$/);
//   if (namedParamMatch && UI_PARAMS.has(namedParamMatch[1])) return true;
//   const widgetMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*\(\s*$/);
//   if (widgetMatch && UI_WIDGETS.has(widgetMatch[1])) return true;
//   return false;
// }

// function isInTechnicalFunction(contextBefore: string): boolean {
//   const trimmed = contextBefore.trimEnd();
//   for (const func of TECH_FUNCTIONS)
//     if (trimmed.endsWith(`${func}(`)) return true;
//   if (
//     trimmed.endsWith("==") ||
//     trimmed.endsWith("!=") ||
//     trimmed.endsWith("case")
//   )
//     return true;
//   return false;
// }

// function isImportLine(contextBefore: string): boolean {
//   const lines = contextBefore.split("\n");
//   const lastLine = lines[lines.length - 1].trim();
//   return lastLine.startsWith("import") || lastLine.startsWith("export");
// }

// function shouldSkipBasic(text: string): boolean {
//   const t = text.trim();
//   if (t.length < 2) return true;
//   if (t.includes("$")) return true;
//   if (
//     t.startsWith("assets/") ||
//     t.startsWith("http") ||
//     t.startsWith("package:")
//   )
//     return true;
//   if (/\.(png|svg|jpg|json)$/i.test(t)) return true;
//   if (/^[A-Z0-9_]+$/.test(t)) return true; // ENUM style
//   return false;
// }

// function generateSafeKey(text: string): string {
//   let key = text
//     .toLowerCase()
//     .trim()
//     .replace(/[^a-z0-9 ]/g, "")
//     .replace(/\s+/g, "_");
//   if (/^[0-9]/.test(key)) key = "k_" + key;
//   if (key.length > 30) key = key.substring(0, 30);
//   return key || "text";
// }

// function addNestedKey(root: any, keys: string[], value: string) {
//   let current = root;
//   for (let i = 0; i < keys.length - 1; i++) {
//     const key = keys[i];
//     if (!current[key]) current[key] = {};
//     current = current[key];
//   }
//   current[keys[keys.length - 1]] = value;
// }

// function buildReverseIndex(json: any, prefix = ""): Map<string, string> {
//   let map = new Map<string, string>();
//   for (const key in json) {
//     if (typeof json[key] === "string") {
//       map.set(json[key], prefix ? `${prefix}.${key}` : key);
//     } else if (typeof json[key] === "object") {
//       const nested = buildReverseIndex(
//         json[key],
//         prefix ? `${prefix}.${key}` : key,
//       );
//       nested.forEach((v, k) => map.set(k, v));
//     }
//   }
//   return map;
// }

// function cleanupConstKeywords(content: string): string {
//   const widgetConstRegex =
//     /const\s+(?=[a-zA-Z0-9_]+\s*\([^;]*?LocaleKeys[^;]*?\.tr\(\))/g;
//   const listConstRegex = /const\s+(?=\[\s*.*LocaleKeys.*\.tr\(\))/g;
//   return content.replace(widgetConstRegex, "").replace(listConstRegex, "");
// }
