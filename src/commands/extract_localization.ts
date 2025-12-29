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

export async function extractLocalizationCommand() {
    // 1. Setup - Check Workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace opened.');
        return;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;

    // 2. UTILS: Get Dynamic Package Name
    const packageName = getPackageName(rootPath);
    if (!packageName) return;

    // 3. UTILS: Check Translation File
    const hasTranslationFile = checkTranslationFileExists(rootPath, TRANSLATIONS_PATH);
    if (!hasTranslationFile) return;

    const translationFileAbsPath = path.join(rootPath, TRANSLATIONS_PATH);
    const generatedImport = `import 'package:${packageName}/config/constants/gen/locale_keys.g.dart';`;

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Extracting AppText strings...",
        cancellable: false
    }, async (progress) => {
        
        try {
            // 4. Load JSON (SAFELY)
            const jsonContent = fs.readFileSync(translationFileAbsPath, 'utf8').trim();
            let translations: any = {};

            if (jsonContent.length === 0) {
                // Handle empty file case
                translations = {};
            } else {
                try {
                    translations = JSON.parse(jsonContent);
                } catch (parseError) {
                    vscode.window.showErrorMessage(`❌ Invalid JSON in ${TRANSLATIONS_PATH}. Ensure it contains valid JSON (at least '{}').`);
                    return; 
                }
            }
            
            let translationsUpdated = false;

            // 5. Find all Dart files in lib/
            const files = await vscode.workspace.findFiles('lib/**/*.dart', '**/*.g.dart'); 

            for (const fileUri of files) {
                const filePath = fileUri.fsPath;
                if (filePath.endsWith('.freezed.dart')) continue;

                const fileContent = fs.readFileSync(filePath, 'utf8');
                
                const result = processFile(filePath, fileContent, rootPath, translations, generatedImport);
                
                if (result.hasChanged) {
                    translationsUpdated = true;
                    if (result.newContent) {
                        fs.writeFileSync(filePath, result.newContent, 'utf8');
                        console.log(`📝 Modified: ${path.basename(filePath)}`);
                    }
                }
            }

            // 6. Save JSON and Run Generator
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
                    vscode.window.showInformationMessage('✅ Localization extraction and generation successful!');
                } catch (error: any) {
                    vscode.window.showErrorMessage(`❌ Code generation failed: ${error.message}`);
                }

            } else {
                vscode.window.showInformationMessage('ℹ️ No new AppText strings found to localize.');
            }

        } catch (e: any) {
            vscode.window.showErrorMessage(`Error: ${e.message}`);
        }
    });
}

// ... (Keep processFile, addNestedKey, shouldSkip, generateKey exactly as before)
// (I am omitting them here to save space, but make sure they are included in your file!)

function processFile(
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

    const regex = /AppText\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    let hasMatch = false;
    
    let newContent = content.replace(regex, (match, quote, text) => {
        if (text.includes('$')) return match;
        if (shouldSkip(text)) return match;

        const distinctKey = generateKey(text);
        const fullKeyPath = [...pathSegments, distinctKey];

        const added = addNestedKey(translations, fullKeyPath, text);
        if (added) {
            hasMatch = true;
            console.log(`   ➕ Added nested key: ${fullKeyPath.join('.')}`);
        }

        const dartKey = fullKeyPath.join('_');
        return `AppText(LocaleKeys.${dartKey}`;
    });

    if (newContent !== originalContent) {
        if (!newContent.includes('locale_keys.g.dart')) {
            newContent = `${generatedImportString}\n${newContent}`;
        }
        if (!newContent.includes('package:easy_localization/easy_localization.dart')) {
            newContent = `${EASY_LOC_IMPORT}\n${newContent}`;
        }
        return { hasChanged: true, newContent };
    }

    return { hasChanged: hasMatch || (newContent !== originalContent), newContent: newContent !== originalContent ? newContent : undefined };
}

function addNestedKey(root: any, keys: string[], value: string): boolean {
    let current = root;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) {
            current[key] = {};
        }
        if (typeof current[key] !== 'object') {
            console.warn(`⚠️ CRITICAL: Cannot nest under "${key}" because it is already a String value.`);
            return false;
        }
        current = current[key];
    }
    const finalKey = keys[keys.length - 1];
    if (!current[finalKey]) {
        current[finalKey] = value;
        return true;
    }
    return false;
}

function shouldSkip(text: string): boolean {
    if (!text || text.trim().length === 0) return true;
    if (text.includes('assets/')) return true;
    return false;
}

function generateKey(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '_');
}