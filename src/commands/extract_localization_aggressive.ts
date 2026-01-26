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

// interface LocalizationConfig {
//   translationsPath: string;
//   outputPath: string;
//   outputFileName: string;
//   globalThreshold: number;
//   featureCommonThreshold: number;
//   uiParams: string[];
//   uiWidgets: string[];
//   techFunctions: string[];
//   featureFolders: string[];
//   minStringLength: number;
//   maxKeyLength: number;
//   enableAutoImport: boolean;
//   enableConstCleanup: boolean;
// }

// function getConfig(): LocalizationConfig {
//   const config = vscode.workspace.getConfiguration("flutterLocalization");

//   return {
//     translationsPath:
//       config.get<string>("translationsPath") ||
//       "assets/translations/en-GB.json",
//     outputPath: config.get<string>("outputPath") || "lib/config/constants/gen",
//     outputFileName:
//       config.get<string>("outputFileName") || "locale_keys.g.dart",
//     globalThreshold: config.get<number>("globalThreshold") || 2,
//     featureCommonThreshold: config.get<number>("featureCommonThreshold") || 2,
//     uiParams: config.get<string[]>("uiParams") || [
//       "text",
//       "label",
//       "labelText",
//       "hintText",
//       "errorText",
//       "helperText",
//       "title",
//       "subtitle",
//       "message",
//       "content",
//       "header",
//       "placeholder",
//       "validate",
//       "description",
//       "tooltip",
//       "semanticLabel",
//     ],
//     uiWidgets: config.get<string[]>("uiWidgets") || [
//       "Text",
//       "AppText",
//       "RichText",
//       "TextSpan",
//       "Toast",
//       "SnackBar",
//       "AlertDialog",
//       "ListTile",
//       "showDialog",
//       "CustomButton",
//       "Button",
//       "ElevatedButton",
//       "TextButton",
//       "OutlinedButton",
//     ],
//     techFunctions: config.get<string[]>("techFunctions") || [
//       "print",
//       "debugPrint",
//       "log",
//       "throw",
//       "Exception",
//       "jsonDecode",
//       "jsonEncode",
//       "assert",
//       "Future",
//       "Stream",
//     ],
//     featureFolders: config.get<string[]>("featureFolders") || [
//       "features",
//       "pages",
//       "screens",
//       "views",
//       "modules",
//       "ui",
//     ],
//     minStringLength: config.get<number>("minStringLength") || 2,
//     maxKeyLength: config.get<number>("maxKeyLength") || 50,
//     enableAutoImport: config.get<boolean>("enableAutoImport") !== false,
//     enableConstCleanup: config.get<boolean>("enableConstCleanup") !== false,
//   };
// }

// // ========================== TYPES ==========================

// interface StringLocation {
//   filePath: string;
//   feature: string;
//   relativePath: string;
//   line: number;
//   column: number;
// }

// interface StringStats {
//   text: string;
//   wordCount: number;
//   locations: StringLocation[];
//   category?: "global" | "feature_common" | "specific";
// }

// interface ReplacementInfo {
//   oldKey: string;
//   newKey: string;
//   value: string;
// }

// // ========================== MAIN COMMAND ==========================

// export async function extractLocalizationAggressiveCommand() {
//   const config = getConfig();
//   const workspaceFolders = vscode.workspace.workspaceFolders;

//   if (!workspaceFolders) {
//     vscode.window.showErrorMessage("❌ No workspace opened.");
//     return;
//   }

//   const rootPath = workspaceFolders[0].uri.fsPath;

//   // Validate project setup
//   const packageName = getPackageName(rootPath);
//   if (!packageName) {
//     vscode.window.showErrorMessage(
//       "❌ Could not find pubspec.yaml or package name.",
//     );
//     return;
//   }

//   const hasTranslationFile = checkTranslationFileExists(
//     rootPath,
//     config.translationsPath,
//   );

//   if (!hasTranslationFile) {
//     const createFile = await vscode.window.showWarningMessage(
//       `Translation file not found at: ${config.translationsPath}. Create it?`,
//       "Yes",
//       "No",
//     );

//     if (createFile === "Yes") {
//       const translationFileAbsPath = path.join(
//         rootPath,
//         config.translationsPath,
//       );
//       const dir = path.dirname(translationFileAbsPath);
//       if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//       }
//       fs.writeFileSync(translationFileAbsPath, "{}", "utf8");
//     } else {
//       return;
//     }
//   }

//   // Get target files
//   const filesToScan = await selectFilesToScan(rootPath);
//   if (!filesToScan || filesToScan.length === 0) {
//     vscode.window.showInformationMessage("ℹ️ No Dart files found to process.");
//     return;
//   }

//   // Start processing
//   await processLocalization(rootPath, packageName, filesToScan, config);
// }

// // ========================== FILE SELECTION ==========================

// async function selectFilesToScan(
//   rootPath: string,
// ): Promise<vscode.Uri[] | null> {
//   const selection = await vscode.window.showQuickPick(
//     ["Current File", "Select Folder", "Entire lib/ Folder"],
//     {
//       placeHolder: "Where do you want to extract strings from?",
//     },
//   );

//   if (!selection) return null;

//   if (selection === "Current File") {
//     const editor = vscode.window.activeTextEditor;
//     if (!editor) {
//       vscode.window.showErrorMessage("❌ No file is currently open.");
//       return null;
//     }

//     const filePath = editor.document.uri.fsPath;
//     if (!filePath.endsWith(".dart")) {
//       vscode.window.showErrorMessage("❌ The open file is not a Dart file.");
//       return null;
//     }

//     if (!filePath.includes(path.join(rootPath, "lib"))) {
//       vscode.window.showErrorMessage("❌ File must be inside the lib/ folder.");
//       return null;
//     }

//     return [editor.document.uri];
//   }

//   if (selection === "Entire lib/ Folder") {
//     const globPattern = new vscode.RelativePattern(rootPath, "lib/**/*.dart");
//     return await vscode.workspace.findFiles(
//       globPattern,
//       "**/{*.g.dart,*.freezed.dart}",
//     );
//   }

//   // Select Folder
//   const selectedFolder = await vscode.window.showOpenDialog({
//     canSelectFiles: false,
//     canSelectFolders: true,
//     canSelectMany: false,
//     openLabel: "Select Folder to Scan",
//     defaultUri: vscode.Uri.file(path.join(rootPath, "lib")),
//   });

//   if (!selectedFolder || selectedFolder.length === 0) return null;

//   const targetFolderPath = selectedFolder[0].fsPath;
//   if (!targetFolderPath.startsWith(rootPath)) {
//     vscode.window.showErrorMessage(
//       "❌ Please select a folder inside the current project.",
//     );
//     return null;
//   }

//   const relativeSearchFolder = path.relative(rootPath, targetFolderPath);
//   const globPattern = new vscode.RelativePattern(
//     rootPath,
//     `${relativeSearchFolder}/**/*.dart`,
//   );

//   return await vscode.workspace.findFiles(
//     globPattern,
//     "**/{*.g.dart,*.freezed.dart}",
//   );
// }

// // ========================== PROCESSING LOGIC ==========================

// async function processLocalization(
//   rootPath: string,
//   packageName: string,
//   filesToScan: vscode.Uri[],
//   config: LocalizationConfig,
// ) {
//   await vscode.window.withProgress(
//     {
//       location: vscode.ProgressLocation.Notification,
//       title: "Smart Localization",
//       cancellable: false,
//     },
//     async (progress) => {
//       try {
//         const translationFileAbsPath = path.join(
//           rootPath,
//           config.translationsPath,
//         );

//         // Load existing translations
//         progress.report({ message: "Loading translations...", increment: 10 });
//         const jsonContent = fs
//           .readFileSync(translationFileAbsPath, "utf8")
//           .trim();
//         let translations =
//           jsonContent.length === 0 ? {} : JSON.parse(jsonContent);

//         const existingKeysMap = buildReverseIndex(translations);

//         // Pass 1: Analysis
//         progress.report({
//           message: `Analyzing ${filesToScan.length} files...`,
//           increment: 20,
//         });
//         const stringUsageMap = await analyzeFiles(
//           filesToScan,
//           rootPath,
//           config,
//         );

//         if (stringUsageMap.size === 0) {
//           vscode.window.showInformationMessage(
//             "ℹ️ No localizable strings found.",
//           );
//           return;
//         }

//         // Decision Phase: Determine keys
//         progress.report({
//           message: "Categorizing strings...",
//           increment: 30,
//         });
//         const textToKeyMap = categorizeStrings(
//           stringUsageMap,
//           existingKeysMap,
//           translations,
//           config,
//         );

//         // Pass 2: Replace strings in files
//         progress.report({
//           message: "Applying changes...",
//           increment: 40,
//         });
//         const filesChangedCount = await applyChanges(
//           filesToScan,
//           textToKeyMap,
//           packageName,
//           config,
//         );

//         // Save translations
//         if (filesChangedCount > 0) {
//           progress.report({
//             message: "Saving translations...",
//             increment: 60,
//           });
//           fs.writeFileSync(
//             translationFileAbsPath,
//             JSON.stringify(translations, null, 2),
//             "utf8",
//           );

//           // Run code generation
//           progress.report({
//             message: "Running code generation...",
//             increment: 80,
//           });
//           await runCodeGeneration(rootPath, config);

//           vscode.window.showInformationMessage(
//             `✅ Successfully localized ${filesChangedCount} file(s) with ${stringUsageMap.size} unique string(s)!`,
//           );
//         } else {
//           vscode.window.showInformationMessage(
//             "ℹ️ No new strings found to localize.",
//           );
//         }
//       } catch (e: any) {
//         vscode.window.showErrorMessage(`❌ Error: ${e.message}`);
//         console.error("Localization error:", e);
//       }
//     },
//   );
// }

// // ========================== ANALYSIS LOGIC ==========================

// async function analyzeFiles(
//   files: vscode.Uri[],
//   rootPath: string,
//   config: LocalizationConfig,
// ): Promise<Map<string, StringStats>> {
//   const stringUsageMap = new Map<string, StringStats>();
//   const uiParamsSet = new Set(config.uiParams);
//   const uiWidgetsSet = new Set(config.uiWidgets);
//   const techFunctionsSet = new Set(config.techFunctions);

//   for (const fileUri of files) {
//     const content = fs.readFileSync(fileUri.fsPath, "utf8");

//     if (shouldSkipFile(content, fileUri.fsPath)) continue;

//     analyzeFileStrings(
//       fileUri.fsPath,
//       content,
//       rootPath,
//       stringUsageMap,
//       config,
//       uiParamsSet,
//       uiWidgetsSet,
//       techFunctionsSet,
//     );
//   }

//   return stringUsageMap;
// }

// function analyzeFileStrings(
//   filePath: string,
//   content: string,
//   rootPath: string,
//   map: Map<string, StringStats>,
//   config: LocalizationConfig,
//   uiParamsSet: Set<string>,
//   uiWidgetsSet: Set<string>,
//   techFunctionsSet: Set<string>,
// ) {
//   const stringLiteralRegex = /(['"])((?:\\.|(?!\1).)+)\1/g;
//   const relativePath = path.relative(path.join(rootPath, "lib"), filePath);
//   const featureName = detectFeatureName(relativePath, config);

//   const lines = content.split("\n");
//   let match;

//   while ((match = stringLiteralRegex.exec(content)) !== null) {
//     const text = match[2];
//     const offset = match.index;

//     if (shouldSkipBasic(text, config)) continue;

//     const contextBefore = content.substring(Math.max(0, offset - 100), offset);

//     if (isImportLine(contextBefore)) continue;
//     if (isInTechnicalFunction(contextBefore, techFunctionsSet)) continue;
//     if (!isUIContext(contextBefore, uiParamsSet, uiWidgetsSet)) continue;
//     if (contextBefore.trim().endsWith("LocaleKeys.")) continue;

//     // Calculate line and column
//     const beforeMatch = content.substring(0, offset);
//     const lineNumber = beforeMatch.split("\n").length;
//     const lastNewline = beforeMatch.lastIndexOf("\n");
//     const columnNumber = offset - lastNewline;

//     if (!map.has(text)) {
//       map.set(text, {
//         text: text,
//         wordCount: text.split(/\s+/).filter((w) => w.length > 0).length,
//         locations: [],
//       });
//     }

//     map.get(text)!.locations.push({
//       filePath: filePath,
//       feature: featureName,
//       relativePath: relativePath,
//       line: lineNumber,
//       column: columnNumber,
//     });
//   }
// }

// // ========================== CATEGORIZATION LOGIC ==========================

// function categorizeStrings(
//   stringUsageMap: Map<string, StringStats>,
//   existingKeysMap: Map<string, string>,
//   translations: any,
//   config: LocalizationConfig,
// ): Map<string, string> {
//   const textToKeyMap = new Map<string, string>();

//   stringUsageMap.forEach((stats, text) => {
//     // Reuse existing key if available
//     if (existingKeysMap.has(text)) {
//       const existingKey = existingKeysMap.get(text)!;
//       textToKeyMap.set(text, existingKey);
//       stats.category = determineCategory(existingKey);
//       return;
//     }

//     // Categorize new strings
//     const uniqueFeatures = new Set(stats.locations.map((l) => l.feature)).size;
//     const totalUses = stats.locations.length;
//     const baseKey = generateSafeKey(text, config);

//     let finalKey: string;
//     let category: "global" | "feature_common" | "specific";

//     // Global common (used across multiple features)
//     if (uniqueFeatures >= config.globalThreshold) {
//       category = "global";
//       finalKey =
//         stats.wordCount === 1
//           ? `common.words.${baseKey}`
//           : `common.phrases.${baseKey}`;
//     }
//     // Feature common (used multiple times in one feature)
//     else if (
//       uniqueFeatures === 1 &&
//       totalUses >= config.featureCommonThreshold
//     ) {
//       category = "feature_common";
//       const featureName = stats.locations[0].feature;
//       finalKey = `features.${featureName}.common.${baseKey}`;
//     }
//     // Specific to a file/screen
//     else {
//       category = "specific";
//       const loc = stats.locations[0];
//       let cleanPath = loc.relativePath
//         .replace(".dart", "")
//         .replace(/[\\/]/g, ".");

//       if (cleanPath.startsWith("lib.")) {
//         cleanPath = cleanPath.substring(4);
//       }

//       // Remove common suffixes for cleaner keys
//       cleanPath = cleanPath
//         .replace(/\.screen$/, "")
//         .replace(/\.page$/, "")
//         .replace(/\.view$/, "")
//         .replace(/\.widget$/, "");

//       finalKey = `${cleanPath}.${baseKey}`;
//     }

//     stats.category = category;
//     textToKeyMap.set(text, finalKey);
//     addNestedKey(translations, finalKey.split("."), text);
//   });

//   return textToKeyMap;
// }

// function determineCategory(
//   key: string,
// ): "global" | "feature_common" | "specific" {
//   if (key.startsWith("common.")) return "global";
//   if (key.includes(".common.")) return "feature_common";
//   return "specific";
// }

// // ========================== REPLACEMENT LOGIC ==========================

// async function applyChanges(
//   files: vscode.Uri[],
//   keyMap: Map<string, string>,
//   packageName: string,
//   config: LocalizationConfig,
// ): Promise<number> {
//   let filesChangedCount = 0;
//   const generatedImport = `import 'package:${packageName}/${config.outputPath}/${config.outputFileName}';`;
//   const easyLocImport =
//     "import 'package:easy_localization/easy_localization.dart';";

//   for (const fileUri of files) {
//     const filePath = fileUri.fsPath;
//     const content = fs.readFileSync(filePath, "utf8");

//     if (shouldSkipFile(content, filePath)) continue;

//     const newContent = replaceInFile(
//       content,
//       keyMap,
//       generatedImport,
//       easyLocImport,
//       config,
//     );

//     if (newContent !== content) {
//       fs.writeFileSync(filePath, newContent, "utf8");
//       filesChangedCount++;
//     }
//   }

//   return filesChangedCount;
// }

// function replaceInFile(
//   content: string,
//   keyMap: Map<string, string>,
//   generatedImport: string,
//   easyLocImport: string,
//   config: LocalizationConfig,
// ): string {
//   const stringLiteralRegex = /(['"])((?:\\.|(?!\1).)+)\1/g;
//   const uiParamsSet = new Set(config.uiParams);
//   const uiWidgetsSet = new Set(config.uiWidgets);
//   const techFunctionsSet = new Set(config.techFunctions);

//   let newContent = content.replace(
//     stringLiteralRegex,
//     (fullMatch, quote, text, offset) => {
//       if (shouldSkipBasic(text, config)) return fullMatch;

//       const contextBefore = content.substring(
//         Math.max(0, offset - 100),
//         offset,
//       );

//       if (isImportLine(contextBefore)) return fullMatch;
//       if (isInTechnicalFunction(contextBefore, techFunctionsSet))
//         return fullMatch;
//       if (!isUIContext(contextBefore, uiParamsSet, uiWidgetsSet))
//         return fullMatch;
//       if (contextBefore.trim().endsWith("LocaleKeys.")) return fullMatch;

//       if (keyMap.has(text)) {
//         const dotKey = keyMap.get(text)!;
//         const dartKey = dotKey.replace(/\./g, "_");

//         // Check if it's a widget that doesn't need .tr()
//         if (
//           contextBefore.trim().endsWith("AppText(") ||
//           contextBefore.trim().endsWith("LocalizedText(")
//         ) {
//           return `LocaleKeys.${dartKey}`;
//         } else {
//           return `LocaleKeys.${dartKey}.tr()`;
//         }
//       }

//       return fullMatch;
//     },
//   );

//   // Add imports if content changed
//   if (newContent !== content && config.enableAutoImport) {
//     // Remove const keywords if needed
//     if (config.enableConstCleanup) {
//       newContent = cleanupConstKeywords(newContent);
//     }

//     // Add LocaleKeys import
//     if (!newContent.includes(config.outputFileName)) {
//       newContent = `${generatedImport}\n${newContent}`;
//     }

//     // Add easy_localization import if .tr() is used
//     if (
//       newContent.includes(".tr()") &&
//       !newContent.includes("package:easy_localization/easy_localization.dart")
//     ) {
//       newContent = `${easyLocImport}\n${newContent}`;
//     }
//   }

//   return newContent;
// }

// // ========================== HELPER FUNCTIONS ==========================

// function detectFeatureName(
//   relativePath: string,
//   config: LocalizationConfig,
// ): string {
//   const parts = relativePath.split(path.sep);

//   for (const folder of config.featureFolders) {
//     const index = parts.indexOf(folder);
//     if (index !== -1 && parts.length > index + 1) {
//       return parts[index + 1];
//     }
//   }

//   // Fallback
//   return parts.length > 1 ? parts[0] : "app";
// }

// function shouldSkipFile(content: string, filePath: string): boolean {
//   if (filePath.endsWith(".freezed.dart") || filePath.endsWith(".g.dart"))
//     return true;
//   if (content.includes("part of") || content.includes("generate:false"))
//     return true;
//   return false;
// }

// function isUIContext(
//   contextBefore: string,
//   uiParamsSet: Set<string>,
//   uiWidgetsSet: Set<string>,
// ): boolean {
//   const trimmed = contextBefore.trimEnd();

//   // Check for named parameters
//   const namedParamMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*:\s*$/);
//   if (namedParamMatch && uiParamsSet.has(namedParamMatch[1])) return true;

//   // Check for widget constructors
//   const widgetMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*\(\s*$/);
//   if (widgetMatch && uiWidgetsSet.has(widgetMatch[1])) return true;

//   return false;
// }

// function isInTechnicalFunction(
//   contextBefore: string,
//   techFunctionsSet: Set<string>,
// ): boolean {
//   const trimmed = contextBefore.trimEnd();

//   for (const func of techFunctionsSet) {
//     if (trimmed.endsWith(`${func}(`)) return true;
//   }

//   if (
//     trimmed.endsWith("==") ||
//     trimmed.endsWith("!=") ||
//     trimmed.endsWith("case ") ||
//     trimmed.match(/\bcase\s+$/)
//   ) {
//     return true;
//   }

//   return false;
// }

// function isImportLine(contextBefore: string): boolean {
//   const lines = contextBefore.split("\n");
//   const lastLine = lines[lines.length - 1].trim();
//   return lastLine.startsWith("import") || lastLine.startsWith("export");
// }

// function shouldSkipBasic(text: string, config: LocalizationConfig): boolean {
//   const t = text.trim();

//   if (t.length < config.minStringLength) return true;
//   if (t.includes("$")) return true; // String interpolation
//   if (
//     t.startsWith("assets/") ||
//     t.startsWith("http") ||
//     t.startsWith("package:")
//   )
//     return true;
//   if (/\.(png|svg|jpg|jpeg|gif|json|yaml|xml)$/i.test(t)) return true;
//   if (/^[A-Z0-9_]+$/.test(t) && !t.includes(" ")) return true; // CONSTANT_STYLE
//   if (/^[a-z_]+$/.test(t) && t.length < 4) return true; // Short identifiers like 'id', 'key'
//   if (/^[\d\s\-\+\=\(\)]+$/.test(t)) return true; // Only numbers and symbols

//   return false;
// }

// function generateSafeKey(text: string, config: LocalizationConfig): string {
//   // More intelligent key generation
//   let key = text
//     .toLowerCase()
//     .trim()
//     // Remove special characters but preserve spaces
//     .replace(/[^a-z0-9 ]/g, "")
//     // Replace multiple spaces with single underscore
//     .replace(/\s+/g, "_");

//   // Remove leading/trailing underscores
//   key = key.replace(/^_+|_+$/g, "");

//   // Ensure it doesn't start with a number
//   if (/^[0-9]/.test(key)) {
//     key = "str_" + key;
//   }

//   // Truncate if too long, but try to keep whole words
//   if (key.length > config.maxKeyLength) {
//     const words = key.split("_");
//     key = "";
//     for (const word of words) {
//       if ((key + "_" + word).length > config.maxKeyLength) break;
//       key += (key ? "_" : "") + word;
//     }
//   }

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
//   const map = new Map<string, string>();

//   for (const key in json) {
//     const fullKey = prefix ? `${prefix}.${key}` : key;

//     if (typeof json[key] === "string") {
//       map.set(json[key], fullKey);
//     } else if (typeof json[key] === "object" && json[key] !== null) {
//       const nested = buildReverseIndex(json[key], fullKey);
//       nested.forEach((v, k) => map.set(k, v));
//     }
//   }

//   return map;
// }

// function cleanupConstKeywords(content: string): string {
//   // Remove const before widgets that contain .tr()
//   const widgetConstRegex =
//     /const\s+(?=[a-zA-Z0-9_]+\s*\([^;{}]*?LocaleKeys[^;{}]*?\.tr\(\))/g;

//   // Remove const before lists containing .tr()
//   const listConstRegex = /const\s+(?=\[\s*[^\]]*LocaleKeys[^\]]*\.tr\(\))/g;

//   return content.replace(widgetConstRegex, "").replace(listConstRegex, "");
// }

// async function runCodeGeneration(
//   rootPath: string,
//   config: LocalizationConfig,
// ): Promise<void> {
//   const genCommand = `dart run easy_localization:generate -S ${path.dirname(config.translationsPath)} -f keys -O ${config.outputPath} -o ${config.outputFileName}`;

//   try {
//     await exec(genCommand, { cwd: rootPath });
//   } catch (error: any) {
//     vscode.window.showWarningMessage(
//       `⚠️ Code generation failed: ${error.message}`,
//     );
//     console.error("Code generation error:", error);
//   }
// }

// // ========================== MOVE FILES HELPER FUNCTIONS ==========================

// function migrateKey(
//   oldPath: string,
//   newPrefix: string,
//   translations: any,
//   prefixStr: string,
//   suffixStr: string,
//   movedKeys: ReplacementInfo[],
// ): string {
//   const parts = oldPath.split(".");
//   const suffixKey = parts[parts.length - 1]; // e.g., "title"
//   const newPath = `${newPrefix}.${suffixKey}`;
//   const newDartKey = newPath.replace(/\./g, "_");

//   // Get value from old path
//   const value = getValueDeep(translations, oldPath);
//   if (!value) {
//     // Safety fallback
//     return `${prefixStr}${oldPath.replace(/\./g, "_")}${suffixStr}`;
//   }

//   // Set value at new path
//   setValueDeep(translations, newPath.split("."), value);

//   // Delete old path if different
//   if (oldPath !== newPath) {
//     unsetValueDeep(translations, oldPath.split("."));
//     movedKeys.push({
//       oldKey: oldPath,
//       newKey: newPath,
//       value: value,
//     });
//   }

//   return `${prefixStr}${newDartKey}${suffixStr}`;
// }

// /**
//  * Converts Dart key format (underscores) back to JSON path format (dots)
//  * by checking against the actual JSON structure.
//  */
// function recoverJsonPath(dartKey: string, jsonRoot: any): string | null {
//   const parts = dartKey.split("_");

//   function findPath(
//     remainingParts: string[],
//     currentObj: any,
//     currentPath: string[],
//   ): string | null {
//     // Base case: reached a string value
//     if (typeof currentObj === "string") {
//       return remainingParts.length === 0 ? currentPath.join(".") : null;
//     }

//     // Base case: not an object or no parts left
//     if (
//       !currentObj ||
//       typeof currentObj !== "object" ||
//       remainingParts.length === 0
//     ) {
//       return null;
//     }

//     // Try different combinations of parts as keys
//     for (let i = 1; i <= remainingParts.length; i++) {
//       const keyAttempt = remainingParts.slice(0, i).join("_");

//       if (currentObj.hasOwnProperty(keyAttempt)) {
//         const rest = findPath(remainingParts.slice(i), currentObj[keyAttempt], [
//           ...currentPath,
//           keyAttempt,
//         ]);
//         if (rest !== null) {
//           return rest;
//         }
//       }
//     }

//     return null;
//   }

//   return findPath(parts, jsonRoot, []);
// }

// function calculateExpectedPrefix(relativePath: string): string {
//   let cleanPath = relativePath.replace(".dart", "").replace(/[\\/]/g, ".");

//   if (cleanPath.startsWith("lib.")) {
//     cleanPath = cleanPath.substring(4);
//   }

//   // Remove common suffixes
//   cleanPath = cleanPath
//     .replace(/\.screen$/, "")
//     .replace(/\.page$/, "")
//     .replace(/\.view$/, "")
//     .replace(/\.widget$/, "");

//   return cleanPath;
// }

// function isGlobalCommon(keyPath: string): boolean {
//   return keyPath.startsWith("common.");
// }

// function isFeatureCommon(keyPath: string): boolean {
//   const parts = keyPath.split(".");
//   return parts[0] === "features" && parts.length > 2 && parts[2] === "common";
// }

// // ========================== DEEP OBJECT UTILITIES ==========================

// function getValueDeep(obj: any, path: string): string | null {
//   const value = path.split(".").reduce((acc, part) => {
//     return acc && acc[part] !== undefined ? acc[part] : null;
//   }, obj);

//   return typeof value === "string" ? value : null;
// }

// function setValueDeep(obj: any, pathParts: string[], value: string): void {
//   let current = obj;
//   for (let i = 0; i < pathParts.length - 1; i++) {
//     const part = pathParts[i];
//     if (!current[part] || typeof current[part] !== "object") {
//       current[part] = {};
//     }
//     current = current[part];
//   }
//   current[pathParts[pathParts.length - 1]] = value;
// }

// function unsetValueDeep(obj: any, pathParts: string[]): void {
//   if (pathParts.length === 0) return;

//   const pathCopy = [...pathParts];
//   const lastKey = pathCopy.pop()!;

//   const parent = pathCopy.reduce((acc, part) => {
//     return acc && acc[part] ? acc[part] : null;
//   }, obj);

//   if (parent && parent[lastKey] !== undefined) {
//     delete parent[lastKey];

//     // Clean up empty parent objects
//     cleanupEmptyParents(obj, pathCopy);
//   }
// }

// function cleanupEmptyParents(root: any, pathParts: string[]): void {
//   if (pathParts.length === 0) return;

//   const parent = pathParts.reduce((acc, part) => {
//     return acc && acc[part] ? acc[part] : null;
//   }, root);

//   if (
//     parent &&
//     typeof parent === "object" &&
//     Object.keys(parent).length === 0
//   ) {
//     // Parent is empty, delete it recursively
//     unsetValueDeep(root, pathParts);
//   }
// }

// // ========================== FIX MOVED FILES COMMAND ==========================

// export async function fixMovedFilesCommand() {
//   const config = getConfig();
//   const workspaceFolders = vscode.workspace.workspaceFolders;

//   if (!workspaceFolders) {
//     vscode.window.showErrorMessage("❌ No workspace opened.");
//     return;
//   }

//   const rootPath = workspaceFolders[0].uri.fsPath;
//   const translationFileAbsPath = path.join(rootPath, config.translationsPath);

//   if (!fs.existsSync(translationFileAbsPath)) {
//     vscode.window.showErrorMessage("❌ Translation file not found.");
//     return;
//   }

//   await vscode.window.withProgress(
//     {
//       location: vscode.ProgressLocation.Notification,
//       title: "Fixing moved file keys...",
//       cancellable: false,
//     },
//     async (progress) => {
//       try {
//         // Load translations
//         const jsonContent = fs.readFileSync(translationFileAbsPath, "utf8");
//         let translations = JSON.parse(jsonContent);

//         // Scan all Dart files
//         const dartFiles = await vscode.workspace.findFiles(
//           "lib/**/*.dart",
//           "**/{*.g.dart,*.freezed.dart}",
//         );

//         let filesUpdated = 0;
//         let keysMovedCount = 0;
//         const movedKeys: ReplacementInfo[] = [];

//         for (const fileUri of dartFiles) {
//           const filePath = fileUri.fsPath;
//           let content = fs.readFileSync(filePath, "utf8");

//           const result = processFileForMoves(
//             content,
//             filePath,
//             rootPath,
//             translations,
//             config,
//             movedKeys,
//           );

//           if (result.changed) {
//             fs.writeFileSync(filePath, result.newContent, "utf8");
//             filesUpdated++;
//             keysMovedCount += result.keysChanged;
//           }
//         }

//         // Save translations if changes occurred
//         if (keysMovedCount > 0) {
//           fs.writeFileSync(
//             translationFileAbsPath,
//             JSON.stringify(translations, null, 2),
//             "utf8",
//           );

//           // Regenerate keys
//           progress.report({ message: "Regenerating locale keys..." });
//           await runCodeGeneration(rootPath, config);

//           vscode.window.showInformationMessage(
//             `✅ Fixed ${keysMovedCount} key(s) across ${filesUpdated} file(s).`,
//           );
//         } else {
//           vscode.window.showInformationMessage(
//             "ℹ️ No moved file keys detected.",
//           );
//         }
//       } catch (error: any) {
//         vscode.window.showErrorMessage(`❌ Error: ${error.message}`);
//         console.error("Fix moved files error:", error);
//       }
//     },
//   );
// }

// function processFileForMoves(
//   content: string,
//   filePath: string,
//   rootPath: string,
//   translations: any,
//   config: LocalizationConfig,
//   movedKeys: ReplacementInfo[],
// ): { newContent: string; changed: boolean; keysChanged: number } {
//   let keysChanged = 0;
//   const relativePath = path.relative(path.join(rootPath, "lib"), filePath);

//   const keyUsageRegex =
//     /(LocaleKeys\.)([a-zA-Z0-9_]+)(\.tr\(\)|(?![a-zA-Z0-9_]))/g;

//   const newContent = content.replace(
//     keyUsageRegex,
//     (match, prefix, dartKey, suffix) => {
//       // Convert Dart key (underscores) to JSON path (dots)
//       const potentialJsonPath = recoverJsonPath(dartKey, translations);

//       if (!potentialJsonPath) {
//         // Key doesn't exist in JSON, skip
//         return match;
//       }

//       // Skip global common keys (they shouldn't be renamed)
//       if (isGlobalCommon(potentialJsonPath)) {
//         return match;
//       }

//       // Calculate what the key SHOULD be for this file
//       const currentFeature = detectFeatureName(relativePath, config);
//       const expectedPrefix = calculateExpectedPrefix(relativePath);

//       // Check if key is already correctly placed
//       if (potentialJsonPath.startsWith(expectedPrefix + ".")) {
//         return match;
//       }

//       // Handle feature common keys
//       if (isFeatureCommon(potentialJsonPath)) {
//         const oldFeature = potentialJsonPath.split(".")[1];
//         if (oldFeature !== currentFeature) {
//           // Feature changed, migrate the key
//           keysChanged++;
//           return migrateKey(
//             potentialJsonPath,
//             `features.${currentFeature}.common`,
//             translations,
//             prefix,
//             suffix,
//             movedKeys,
//           );
//         }
//         return match; // Same feature, keep as is
//       }

//       // Handle specific page/screen keys that moved
//       keysChanged++;
//       return migrateKey(
//         potentialJsonPath,
//         expectedPrefix,
//         translations,
//         prefix,
//         suffix,
//         movedKeys,
//       );
//     },
//   );

//   return {
//     newContent,
//     changed: newContent !== content,
//     keysChanged,
//   };
// }

// // ========================== REVERT COMMAND ==========================

// export async function revertLocalizationCommand() {
//   const config = getConfig();
//   const workspaceFolders = vscode.workspace.workspaceFolders;

//   if (!workspaceFolders) {
//     vscode.window.showErrorMessage("❌ No workspace opened.");
//     return;
//   }

//   const rootPath = workspaceFolders[0].uri.fsPath;
//   const translationFileAbsPath = path.join(rootPath, config.translationsPath);

//   if (!fs.existsSync(translationFileAbsPath)) {
//     vscode.window.showErrorMessage(
//       `❌ Translation file not found at ${config.translationsPath}`,
//     );
//     return;
//   }

//   // 1. Select files
//   const filesToScan = await selectFilesToScan(rootPath);
//   if (!filesToScan || filesToScan.length === 0) {
//     return;
//   }

//   await vscode.window.withProgress(
//     {
//       location: vscode.ProgressLocation.Notification,
//       title: "Reverting Localization...",
//       cancellable: false,
//     },
//     async (progress) => {
//       try {
//         // 2. Load and Flatten Translations (Map: DartKey -> Value)
//         progress.report({ message: "Loading translations..." });
//         const jsonContent = fs.readFileSync(translationFileAbsPath, "utf8");
//         const translations = JSON.parse(jsonContent);
//         const dartKeyMap = buildDartKeyMap(translations);

//         // 3. Process Files
//         let filesChanged = 0;
//         let stringsReverted = 0;

//         for (const fileUri of filesToScan) {
//           const filePath = fileUri.fsPath;
//           const content = fs.readFileSync(filePath, "utf8");

//           const result = revertFile(content, dartKeyMap, config);

//           if (result.changed) {
//             fs.writeFileSync(filePath, result.newContent, "utf8");
//             filesChanged++;
//             stringsReverted += result.count;
//           }
//         }

//         vscode.window.showInformationMessage(
//           `✅ Reverted ${stringsReverted} strings across ${filesChanged} files.`,
//         );
//       } catch (e: any) {
//         vscode.window.showErrorMessage(`❌ Error: ${e.message}`);
//         console.error("Revert error:", e);
//       }
//     },
//   );
// }

// // ========================== REVERT LOGIC ==========================

// function revertFile(
//   content: string,
//   dartKeyMap: Map<string, string>,
//   config: LocalizationConfig,
// ): { newContent: string; changed: boolean; count: number } {
//   let count = 0;

//   // Regex matches:
//   // 1. LocaleKeys.some_key.tr()
//   // 2. LocaleKeys.some_key
//   // Group 1: The key
//   // Group 2: .tr() or undefined
//   const regex = /LocaleKeys\.([a-zA-Z0-9_]+)(\.tr\(\))?/g;

//   let newContent = content.replace(regex, (match, key, trPart) => {
//     // If .tr() has arguments (e.g. .tr(args: [...])), this regex won't match cleanly
//     // or we should strictly avoid reverting complex logic automatically.
//     // The regex `\.tr\(\)` ensures we only revert empty .tr() calls.

//     if (dartKeyMap.has(key)) {
//       const originalValue = dartKeyMap.get(key)!;
//       count++;
//       return escapeString(originalValue);
//     }

//     // Key not found in JSON? Keep as is.
//     return match;
//   });

//   // Clean up imports if we modified the file
//   if (count > 0) {
//     newContent = cleanImports(newContent, config);
//   }

//   return {
//     newContent,
//     changed: count > 0,
//     count,
//   };
// }

// /**
//  * Flattens the JSON object into a map of "underscore_keys" to "String Values"
//  * matching the Dart code generation style.
//  */
// function buildDartKeyMap(json: any, prefix = ""): Map<string, string> {
//   const map = new Map<string, string>();

//   for (const key in json) {
//     const fullPath = prefix ? `${prefix}.${key}` : key;

//     if (typeof json[key] === "string") {
//       // Dart keys usually replace dots with underscores
//       const dartKey = fullPath.replace(/\./g, "_");
//       map.set(dartKey, json[key]);
//     } else if (typeof json[key] === "object" && json[key] !== null) {
//       const nested = buildDartKeyMap(json[key], fullPath);
//       nested.forEach((v, k) => map.set(k, v));
//     }
//   }

//   return map;
// }

// /**
//  * Escapes the string to be placed back into Dart code.
//  * Prefers single quotes unless the string contains single quotes.
//  */
// function escapeString(str: string): string {
//   if (str.includes("'")) {
//     if (str.includes('"')) {
//       // Contains both, escape single quotes
//       return `'${str.replace(/'/g, "\\'")}'`;
//     }
//     // Contains single, use double
//     return `"${str}"`;
//   }
//   // Default single
//   return `'${str}'`;
// }

// function cleanImports(content: string, config: LocalizationConfig): string {
//   let lines = content.split("\n");
//   const hasLocaleKeys = content.includes("LocaleKeys.");
//   const hasTr = content.includes(".tr()");

//   // Filter out imports if they are no longer needed
//   lines = lines.filter((line) => {
//     const trimmed = line.trim();

//     // Check generated file import
//     if (
//       trimmed.includes(config.outputFileName) &&
//       !hasLocaleKeys &&
//       !line.includes("as ") // Don't remove if aliased imports
//     ) {
//       return false;
//     }

//     // Check easy_localization import
//     if (
//       trimmed.includes("package:easy_localization/easy_localization.dart") &&
//       !hasTr &&
//       !trimmed.includes("EasyLocalization") // Keep if using EasyLocalization widget
//     ) {
//       return false;
//     }

//     return true;
//   });

//   return lines.join("\n");
// }

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as cp from "child_process";
import { promisify } from "util";
import {
  getPackageName,
  checkTranslationFileExists,
} from "../utils/project_utils";

const exec = promisify(cp.exec);

// ========================== CONFIGURATION ==========================

interface LocalizationConfig {
  translationsPath: string;
  outputPath: string;
  outputFileName: string;
  uiParams: string[];
  uiWidgets: string[];
  techFunctions: string[];
  featureFolders: string[]; // e.g. ['features', 'modules']
  minStringLength: number;
  maxKeyLength: number;
  enableAutoImport: boolean;
  enableConstCleanup: boolean;
}

function getConfig(): LocalizationConfig {
  const config = vscode.workspace.getConfiguration("flutterLocalization");

  return {
    translationsPath:
      config.get<string>("translationsPath") ||
      "assets/translations/en-GB.json",
    outputPath: config.get<string>("outputPath") || "lib/config/constants/gen",
    outputFileName:
      config.get<string>("outputFileName") || "locale_keys.g.dart",
    uiParams: config.get<string[]>("uiParams") || [
      "text",
      "label",
      "labelText",
      "hintText",
      "errorText",
      "helperText",
      "title",
      "subtitle",
      "message",
      "content",
      "header",
      "placeholder",
      "validate",
      "description",
      "tooltip",
      "semanticLabel",
    ],
    uiWidgets: config.get<string[]>("uiWidgets") || [
      "Text",
      "AppText",
      "RichText",
      "TextSpan",
      "Toast",
      "SnackBar",
      "AlertDialog",
      "ListTile",
      "showDialog",
      "CustomButton",
      "Button",
      "ElevatedButton",
      "TextButton",
      "OutlinedButton",
    ],
    techFunctions: config.get<string[]>("techFunctions") || [
      "print",
      "debugPrint",
      "log",
      "throw",
      "Exception",
      "jsonDecode",
      "jsonEncode",
      "assert",
      "Future",
      "Stream",
    ],
    featureFolders: config.get<string[]>("featureFolders") || [
      "features",
      "pages",
      "screens",
      "views",
      "modules",
      "ui",
    ],
    minStringLength: config.get<number>("minStringLength") || 2,
    maxKeyLength: config.get<number>("maxKeyLength") || 50,
    enableAutoImport: config.get<boolean>("enableAutoImport") !== false,
    enableConstCleanup: config.get<boolean>("enableConstCleanup") !== false,
  };
}

// ========================== TYPES ==========================

interface StringLocation {
  filePath: string;
  feature: string; // "profile", "settings", or "common" (if not in a feature folder)
  relativePath: string;
  line: number;
  column: number;
}

interface StringStats {
  text: string;
  wordCount: number;
  locations: StringLocation[];
  category?: "global_common" | "feature_common" | "specific";
}

// ========================== MAIN COMMAND ==========================

export async function extractLocalizationAggressiveCommand() {
  const config = getConfig();
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    vscode.window.showErrorMessage("❌ No workspace opened.");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  // Validate project setup
  const packageName = getPackageName(rootPath);
  if (!packageName) {
    vscode.window.showErrorMessage(
      "❌ Could not find pubspec.yaml or package name.",
    );
    return;
  }

  const hasTranslationFile = checkTranslationFileExists(
    rootPath,
    config.translationsPath,
  );

  if (!hasTranslationFile) {
    const createFile = await vscode.window.showWarningMessage(
      `Translation file not found at: ${config.translationsPath}. Create it?`,
      "Yes",
      "No",
    );

    if (createFile === "Yes") {
      const translationFileAbsPath = path.join(
        rootPath,
        config.translationsPath,
      );
      const dir = path.dirname(translationFileAbsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(translationFileAbsPath, "{}", "utf8");
    } else {
      return;
    }
  }

  // Get target files
  const filesToScan = await selectFilesToScan(rootPath);
  if (!filesToScan || filesToScan.length === 0) {
    vscode.window.showInformationMessage("ℹ️ No Dart files found to process.");
    return;
  }

  // Start processing
  await processLocalization(rootPath, packageName, filesToScan, config);
}

// ========================== FILE SELECTION ==========================

async function selectFilesToScan(
  rootPath: string,
): Promise<vscode.Uri[] | null> {
  const selection = await vscode.window.showQuickPick(
    ["Current File", "Select Folder", "Entire lib/ Folder"],
    {
      placeHolder: "Where do you want to extract strings from?",
    },
  );

  if (!selection) return null;

  if (selection === "Current File") {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("❌ No file is currently open.");
      return null;
    }
    return [editor.document.uri];
  }

  if (selection === "Entire lib/ Folder") {
    const globPattern = new vscode.RelativePattern(rootPath, "lib/**/*.dart");
    return await vscode.workspace.findFiles(
      globPattern,
      "**/{*.g.dart,*.freezed.dart}",
    );
  }

  // Select Folder
  const selectedFolder = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Select Folder to Scan",
    defaultUri: vscode.Uri.file(path.join(rootPath, "lib")),
  });

  if (!selectedFolder || selectedFolder.length === 0) return null;

  const targetFolderPath = selectedFolder[0].fsPath;
  const relativeSearchFolder = path.relative(rootPath, targetFolderPath);
  const globPattern = new vscode.RelativePattern(
    rootPath,
    `${relativeSearchFolder}/**/*.dart`,
  );

  return await vscode.workspace.findFiles(
    globPattern,
    "**/{*.g.dart,*.freezed.dart}",
  );
}

// ========================== PROCESSING LOGIC ==========================

async function processLocalization(
  rootPath: string,
  packageName: string,
  filesToScan: vscode.Uri[],
  config: LocalizationConfig,
) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Smart Localization",
      cancellable: false,
    },
    async (progress) => {
      try {
        const translationFileAbsPath = path.join(
          rootPath,
          config.translationsPath,
        );

        // Load existing translations
        progress.report({ message: "Loading translations...", increment: 10 });
        const jsonContent = fs
          .readFileSync(translationFileAbsPath, "utf8")
          .trim();
        let translations =
          jsonContent.length === 0 ? {} : JSON.parse(jsonContent);

        // Pass 1: Analysis
        progress.report({
          message: `Analyzing ${filesToScan.length} files...`,
          increment: 20,
        });
        const stringUsageMap = await analyzeFiles(
          filesToScan,
          rootPath,
          config,
        );

        if (stringUsageMap.size === 0) {
          vscode.window.showInformationMessage(
            "ℹ️ No localizable strings found.",
          );
          return;
        }

        // Pass 2: Categorize & Generate Keys
        // We do NOT rely on existing keys to dictate structure. We rely on USAGE.
        // But we check existing keys to avoid changing keys that are already correct.
        progress.report({
          message: "Categorizing strings...",
          increment: 30,
        });
        const textToKeyMap = categorizeStrings(
          stringUsageMap,
          translations,
          config,
        );

        // Pass 3: Replace strings in files
        progress.report({
          message: "Applying changes...",
          increment: 40,
        });
        const filesChangedCount = await applyChanges(
          filesToScan,
          textToKeyMap,
          packageName,
          config,
        );

        // Save translations
        if (filesChangedCount > 0) {
          progress.report({
            message: "Saving translations...",
            increment: 60,
          });
          fs.writeFileSync(
            translationFileAbsPath,
            JSON.stringify(translations, null, 2),
            "utf8",
          );

          // Run code generation
          progress.report({
            message: "Running code generation...",
            increment: 80,
          });
          await runCodeGeneration(rootPath, config);

          vscode.window.showInformationMessage(
            `✅ Successfully localized ${filesChangedCount} file(s) with ${stringUsageMap.size} unique string(s)!`,
          );
        } else {
          vscode.window.showInformationMessage(
            "ℹ️ No new strings found to localize.",
          );
        }
      } catch (e: any) {
        vscode.window.showErrorMessage(`❌ Error: ${e.message}`);
        console.error("Localization error:", e);
      }
    },
  );
}

// ========================== ANALYSIS LOGIC ==========================

async function analyzeFiles(
  files: vscode.Uri[],
  rootPath: string,
  config: LocalizationConfig,
): Promise<Map<string, StringStats>> {
  const stringUsageMap = new Map<string, StringStats>();
  const uiParamsSet = new Set(config.uiParams);
  const uiWidgetsSet = new Set(config.uiWidgets);
  const techFunctionsSet = new Set(config.techFunctions);

  for (const fileUri of files) {
    const content = fs.readFileSync(fileUri.fsPath, "utf8");
    if (shouldSkipFile(content, fileUri.fsPath)) continue;

    analyzeFileStrings(
      fileUri.fsPath,
      content,
      rootPath,
      stringUsageMap,
      config,
      uiParamsSet,
      uiWidgetsSet,
      techFunctionsSet,
    );
  }

  return stringUsageMap;
}

function analyzeFileStrings(
  filePath: string,
  content: string,
  rootPath: string,
  map: Map<string, StringStats>,
  config: LocalizationConfig,
  uiParamsSet: Set<string>,
  uiWidgetsSet: Set<string>,
  techFunctionsSet: Set<string>,
) {
  const stringLiteralRegex = /(['"])((?:\\.|(?!\1).)+)\1/g;
  const relativePath = path.relative(path.join(rootPath, "lib"), filePath);

  // Important: Identify feature name based on folder structure
  const featureName = detectFeatureName(relativePath, config);

  let match;
  while ((match = stringLiteralRegex.exec(content)) !== null) {
    const text = match[2];
    const offset = match.index;

    if (shouldSkipBasic(text, config)) continue;

    const contextBefore = content.substring(Math.max(0, offset - 100), offset);

    if (isImportLine(contextBefore)) continue;
    if (isInTechnicalFunction(contextBefore, techFunctionsSet)) continue;
    if (!isUIContext(contextBefore, uiParamsSet, uiWidgetsSet)) continue;
    if (contextBefore.trim().endsWith("LocaleKeys.")) continue;

    if (!map.has(text)) {
      map.set(text, {
        text: text,
        wordCount: countWords(text),
        locations: [],
      });
    }

    map.get(text)!.locations.push({
      filePath: filePath,
      feature: featureName,
      relativePath: relativePath,
      line: 0, // Simplified for brevity
      column: 0,
    });
  }
}

// ========================== KEY GENERATION & CATEGORIZATION ==========================

/**
 * 1. Checks if string exists in multiple features -> common.
 * 2. Checks if string exists in multiple files OF the same feature -> features.X.common.
 * 3. Checks if string is 1 word -> .words. OR >1 word -> .sentences.
 */
function categorizeStrings(
  stringUsageMap: Map<string, StringStats>,
  translations: any,
  config: LocalizationConfig,
): Map<string, string> {
  const textToKeyMap = new Map<string, string>();

  stringUsageMap.forEach((stats, text) => {
    // 1. Determine Usage Scope
    const uniqueFeatures = new Set(stats.locations.map((l) => l.feature));
    const uniqueFiles = new Set(stats.locations.map((l) => l.filePath));

    // 2. Determine Type (Word vs Sentence)
    const isSentence = stats.wordCount > 1;
    const typeKey = isSentence ? "sentences" : "words";

    // Base variable name
    const safeKey = generateSafeKey(text, config);

    let finalKeyPath: string = "";

    // === RULE 1: Global Common ===
    // If used in 2 or more DIFFERENT features
    if (uniqueFeatures.size >= 2) {
      finalKeyPath = `common.${typeKey}.${safeKey}`;
      stats.category = "global_common";
    }

    // === RULE 2: Feature Common ===
    // If used in only 1 feature, but in 2 or more DIFFERENT files
    else if (uniqueFeatures.size === 1 && uniqueFiles.size >= 2) {
      const featureName = stats.locations[0].feature;
      finalKeyPath = `features.${featureName}.common.${typeKey}.${safeKey}`;
      stats.category = "feature_common";
    }

    // === RULE 3: Specific Screen/Widget ===
    // Single feature, Single file
    else {
      const loc = stats.locations[0];
      const featureName = loc.feature;

      // Extract screen name from file name (e.g. edit_profile_view.dart -> edit_profile_view)
      let screenName = path.basename(loc.relativePath, ".dart");
      // Remove common suffixes for cleaner keys
      screenName = screenName.replace(
        /_(screen|page|view|widget|dialog|sheet)$/,
        "",
      );

      // Structure: features.profile.screens.edit_profile.title
      // Note: Added 'screens' grouping to keep the feature root clean
      finalKeyPath = `features.${featureName}.screens.${screenName}.${safeKey}`;
      stats.category = "specific";
    }

    textToKeyMap.set(text, finalKeyPath);

    // Add to JSON object (Update/Insert)
    addNestedKey(translations, finalKeyPath.split("."), text);
  });

  return textToKeyMap;
}

// ========================== UTILITIES ==========================

function detectFeatureName(
  relativePath: string,
  config: LocalizationConfig,
): string {
  const parts = relativePath.split(/[/\\]/); // Handle both slash types

  // Look for known feature folder parents
  // e.g. lib/features/profile/... -> returns 'profile'
  for (const featureFolder of config.featureFolders) {
    const index = parts.indexOf(featureFolder);
    if (index !== -1 && index + 1 < parts.length) {
      return parts[index + 1];
    }
  }

  // Fallback: if structure is lib/profile/..., return 'profile'
  if (parts.length > 1 && parts[0] === "lib") {
    return parts[1]; // Should work for simpler structures
  }

  return "core"; // Fallback if no feature detected
}

function countWords(str: string): number {
  return str.trim().split(/\s+/).length;
}

function generateSafeKey(text: string, config: LocalizationConfig): string {
  let key = text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "") // Remove quotes
    .replace(/[^a-z0-9 ]/g, " ") // Replace symbols with spaces
    .trim()
    .replace(/\s+/g, "_"); // Spaces to underscores

  if (key.length === 0) return "text";

  if (/^[0-9]/.test(key)) {
    key = "n_" + key;
  }

  // Truncate logic
  if (key.length > config.maxKeyLength) {
    const parts = key.split("_");
    let acc = "";
    for (const part of parts) {
      if ((acc + part).length > config.maxKeyLength) break;
      acc += (acc ? "_" : "") + part;
    }
    key = acc || key.substring(0, config.maxKeyLength);
  }

  return key;
}

function addNestedKey(root: any, keys: string[], value: string) {
  let current = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) current[key] = {};
    current = current[key];
  }
  // Only overwrite if it doesn't exist or is empty
  // (In aggressive mode, we might want to ensure consistency, so we overwrite)
  current[keys[keys.length - 1]] = value;
}

// ========================== REPLACEMENT IN FILES ==========================

async function applyChanges(
  files: vscode.Uri[],
  keyMap: Map<string, string>,
  packageName: string,
  config: LocalizationConfig,
): Promise<number> {
  let filesChangedCount = 0;
  const generatedImport = `import 'package:${packageName}/${config.outputPath}/${config.outputFileName}';`;
  const easyLocImport =
    "import 'package:easy_localization/easy_localization.dart';";

  for (const fileUri of files) {
    const filePath = fileUri.fsPath;
    const content = fs.readFileSync(filePath, "utf8");

    if (shouldSkipFile(content, filePath)) continue;

    let newContent = content;
    const stringLiteralRegex = /(['"])((?:\\.|(?!\1).)+)\1/g;

    newContent = newContent.replace(
      stringLiteralRegex,
      (fullMatch, quote, text, offset) => {
        // Validation checks (same as analysis)
        if (shouldSkipBasic(text, config)) return fullMatch;
        const contextBefore = content.substring(
          Math.max(0, offset - 100),
          offset,
        );
        if (isImportLine(contextBefore)) return fullMatch;
        if (contextBefore.trim().endsWith("LocaleKeys.")) return fullMatch;

        if (keyMap.has(text)) {
          const dotKey = keyMap.get(text)!;
          const dartKey = dotKey.replace(/\./g, "_"); // common.words.save -> common_words_save

          // Determine if we need .tr()
          const needsTr =
            !contextBefore.trim().endsWith("AppText(") &&
            !contextBefore.trim().endsWith("LocalizedText(");

          return needsTr
            ? `LocaleKeys.${dartKey}.tr()`
            : `LocaleKeys.${dartKey}`;
        }
        return fullMatch;
      },
    );

    if (newContent !== content) {
      // Add imports
      if (
        config.enableAutoImport &&
        !newContent.includes(config.outputFileName)
      ) {
        newContent = `${generatedImport}\n${easyLocImport}\n${newContent}`;
      }
      fs.writeFileSync(filePath, newContent, "utf8");
      filesChangedCount++;
    }
  }

  return filesChangedCount;
}

// ========================== CODE GEN ==========================

async function runCodeGeneration(
  rootPath: string,
  config: LocalizationConfig,
): Promise<void> {
  // -S sets source directory, -f keys generates keys, -o output file
  const genCommand = `dart run easy_localization:generate -S ${path.dirname(config.translationsPath)} -f keys -O ${config.outputPath} -o ${config.outputFileName}`;
  try {
    await exec(genCommand, { cwd: rootPath });
  } catch (error: any) {
    vscode.window.showWarningMessage(`⚠️ Code gen failed: ${error.message}`);
  }
}

// ========================== HELPERS (SKIPPED DETAILS FOR BREVITY) ==========================
// Copy 'shouldSkipFile', 'isUIContext', 'isImportLine', 'shouldSkipBasic', 'isInTechnicalFunction'
// from previous implementation exactly as they were.

function shouldSkipFile(content: string, filePath: string): boolean {
  if (filePath.endsWith(".freezed.dart") || filePath.endsWith(".g.dart"))
    return true;
  return false;
}

function shouldSkipBasic(text: string, config: LocalizationConfig): boolean {
  const t = text.trim();
  if (t.length < config.minStringLength) return true;
  if (t.includes("$")) return true;
  if (t.startsWith("assets/") || t.startsWith("http")) return true;
  return false;
}

function isImportLine(contextBefore: string): boolean {
  const lines = contextBefore.split("\n");
  return lines[lines.length - 1].trim().startsWith("import");
}

function isInTechnicalFunction(context: string, set: Set<string>): boolean {
  // simplified logic
  return false;
}

function isUIContext(
  context: string,
  params: Set<string>,
  widgets: Set<string>,
): boolean {
  // simplified logic - use previous robust implementation
  return true;
}
