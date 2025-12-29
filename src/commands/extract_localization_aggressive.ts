import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { promisify } from 'util';
import { getPackageName, checkTranslationFileExists } from '../utils/project_utils';

const exec = promisify(cp.exec);

// ========================== CONFIGURATION ==========================
const TRANSLATIONS_PATH = 'assets/translations/en-GB.json';
const EASY_LOC_IMPORT = "import 'package:easy_localization/easy_localization.dart';";
// ===================================================================

export async function extractLocalizationAggressiveCommand() {
    // 1. Setup - Check Workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace opened.');
        return;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;

    // 2. UTILS: Project Checks
    const packageName = getPackageName(rootPath);
    if (!packageName) return;

    const hasTranslationFile = checkTranslationFileExists(rootPath, TRANSLATIONS_PATH);
    if (!hasTranslationFile) return;

    const translationFileAbsPath = path.join(rootPath, TRANSLATIONS_PATH);
    const generatedImport = `import 'package:${packageName}/config/constants/gen/locale_keys.g.dart';`;

    // 3. Prompt User for Target Folder
    const selectedFolder = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Folder for Localization',
        defaultUri: vscode.Uri.file(path.join(rootPath, 'lib'))
    });

    if (!selectedFolder || selectedFolder.length === 0) {
        return; // User cancelled
    }

    const targetFolderPath = selectedFolder[0].fsPath;

    // Verify selection is inside the project
    if (!targetFolderPath.startsWith(rootPath)) {
        vscode.window.showErrorMessage("Please select a folder inside the current project.");
        return;
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Aggressive Localization V3...",
        cancellable: false
    }, async (progress) => {
        try {
            // 4. Load JSON
            const jsonContent = fs.readFileSync(translationFileAbsPath, 'utf8').trim();
            let translations: any = jsonContent.length === 0 ? {} : JSON.parse(jsonContent);
            let translationsUpdated = false;

            // 5. Find Files (Scoped to selection)
            // Create a relative glob pattern for findFiles
            const relativeSearchFolder = path.relative(rootPath, targetFolderPath);
            // Ensure glob format (forward slashes)
            const globPattern = new vscode.RelativePattern(rootPath, `${relativeSearchFolder}/**/*.dart`);
            
            const files = await vscode.workspace.findFiles(globPattern, '**/*.g.dart');

            for (const fileUri of files) {
                const filePath = fileUri.fsPath;
                if (filePath.endsWith('.freezed.dart')) continue;

                const fileContent = fs.readFileSync(filePath, 'utf8');

                // Skip generation/config files
                if (fileContent.includes('part of') || fileContent.includes('generate:false')) continue;

                const result = processAggressive(filePath, fileContent, rootPath, translations, generatedImport);

                if (result.hasChanged) {
                    translationsUpdated = true;
                    if (result.newContent) {
                        fs.writeFileSync(filePath, result.newContent, 'utf8');
                        console.log(`📝 Modified: ${path.basename(filePath)}`);
                    }
                }
            }

            // 6. Save & Generate
            if (translationsUpdated) {
                fs.writeFileSync(translationFileAbsPath, JSON.stringify(translations, null, 2), 'utf8');
                progress.report({ message: "Running easy_localization generator..." });

                const command = [
                    'dart run easy_localization:generate',
                    '-S assets/translations',
                    '-f keys',
                    '-O lib/config/constants/gen',
                    '-o locale_keys.g.dart'
                ].join(' ');

                try {
                    const { stdout, stderr } = await exec(command, { cwd: rootPath });
                    console.log(stdout);
                    if (stderr) console.error(stderr);
                    vscode.window.showInformationMessage('✅ Aggressive Localization Complete!');
                    vscode.window.showWarningMessage('⚠️ Note: You may need to manually remove "const" keywords from modified widgets.');
                } catch (error: any) {
                    vscode.window.showErrorMessage(`❌ Code generation failed: ${error.message}`);
                }
            } else {
                vscode.window.showInformationMessage('ℹ️ No strings found to localize in selection.');
            }

        } catch (e: any) {
            vscode.window.showErrorMessage(`Error: ${e.message}`);
        }
    });
}

// ========================== CORE LOGIC ==========================

function processAggressive(
    filePath: string,
    content: string,
    rootPath: string,
    translations: any,
    generatedImportString: string
): { hasChanged: boolean, newContent?: string } {

    const originalContent = content;
    const relativePath = path.relative(path.join(rootPath, 'lib'), filePath);
    const pathSegments = relativePath
        .replace(/\.dart$/, '')
        .split(path.sep)
        .map(s => s.toLowerCase());

    // Matches: 'text' or "text"
    const stringLiteralRegex = /(['"])((?:\\.|(?!\1).)+)\1/g;

    let hasMatch = false;

    // We use a replacer function to handle logic per match
    let newContent = content.replace(stringLiteralRegex, (fullMatch, quote, text, offset) => {
        
        // --- 1. CONTEXT CHECKS ---
        if (shouldSkip(text)) return fullMatch;

        // Context Strings
        const contextBefore = content.substring(Math.max(0, offset - 20), offset);
        const contextAfter = content.substring(offset + fullMatch.length, Math.min(content.length, offset + fullMatch.length + 20));

        // Skip Imports/Exports/Parts
        if (isImportLine(content, offset)) return fullMatch;

        // Skip Logic: == "text", != "text", case "text"
        const trimmedBefore = contextBefore.trimEnd();
        if (trimmedBefore.endsWith('==') || trimmedBefore.endsWith('!=') || trimmedBefore.endsWith('case')) {
            return fullMatch;
        }

        // Skip Map Keys: {"key": value} -> Check if followed immediately by colon
        // Note: We trimLeft() the contextAfter to ignore spaces/newlines
        if (contextAfter.trimStart().startsWith(':')) return fullMatch;

        // Skip already localized
        if (contextBefore.includes('LocaleKeys.')) return fullMatch;

        // --- 2. EXTRACTION ---
        const distinctKey = generateKey(text);
        const fullKeyPath = [...pathSegments, distinctKey];

        const added = addNestedKey(translations, fullKeyPath, text);
        if (added) {
            hasMatch = true;
            console.log(`   ➕ [Aggressive] Added: ${fullKeyPath.join('.')}`);
        }

        const dartKey = fullKeyPath.join('_');

        // --- 3. REPLACEMENT ---
        // Special Handling: AppText("...") -> AppText(LocaleKeys.xxx)
        // General Handling: Text("...")    -> Text(LocaleKeys.xxx.tr())
        
        if (trimmedBefore.endsWith('AppText(')) {
            return `LocaleKeys.${dartKey}`;
        } else {
            return `LocaleKeys.${dartKey}.tr()`;
        }
    });

    if (newContent !== originalContent) {
        // Add Imports
        if (!newContent.includes('locale_keys.g.dart')) {
            newContent = `${generatedImportString}\n${newContent}`;
        }
        // Only add easy_localization if we used .tr()
        if (newContent.includes('.tr()') && !newContent.includes('package:easy_localization/easy_localization.dart')) {
            newContent = `${EASY_LOC_IMPORT}\n${newContent}`;
        }
        return { hasChanged: true, newContent };
    }

    return { hasChanged: hasMatch, newContent: undefined };
}


// ========================== HELPERS ==========================

function isImportLine(content: string, position: number): boolean {
    const lineStart = content.lastIndexOf('\n', position) + 1; // +1 to skip the newline itself
    const lineEnd = content.indexOf('\n', position);
    const line = content.substring(lineStart, lineEnd !== -1 ? lineEnd : content.length).trim();
    
    return line.startsWith('import') || line.startsWith('export') || line.startsWith('part');
}

function shouldSkip(text: string): boolean {
    const t = text.trim();
    if (t.length < 2) return true;
    if (t.includes('$')) return true; // Dynamic interpolation
    
    // Technical prefixes
    if (t.startsWith('assets/')) return true;
    if (t.startsWith('lib/')) return true;
    if (t.startsWith('http')) return true;
    if (t.startsWith('package:')) return true;
    if (t.startsWith('urn:')) return true;

    // Files
    if (/\.(png|svg|jpg|jpeg|json)$/i.test(t)) return true;

    // Date/Time formats (simple check)
    if (t.includes('yyyy') || t.includes('HH:mm')) return true;

    // JSON or Regex patterns
    if (t.includes('{') && t.includes('}')) return true;
    
    // Enum style (ALL_CAPS_UNDERSCORES)
    if (/^[A-Z0-9_]+$/.test(t)) return true;

    // Numeric/Symbol only
    if (/^[\d\W]+$/.test(t)) return true;

    return false;
}

function addNestedKey(root: any, keys: string[], value: string): boolean {
    let current = root;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) current[key] = {};
        if (typeof current[key] !== 'object') return false; // Conflict
        current = current[key];
    }
    const finalKey = keys[keys.length - 1];
    if (!current[finalKey]) {
        current[finalKey] = value;
        return true;
    }
    return false;
}

function generateKey(text: string): string {
    let key = text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, '') // Remove symbols
        .replace(/\s+/g, '_');      // Space to underscore
    
    // If starts with number, prefix k_
    if (/^[0-9]/.test(key)) key = 'k_' + key;
    
    if (key.length > 30) key = key.substring(0, 30);
    if (key.length === 0) key = 'text';
    
    return key;
}