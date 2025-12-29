import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Reads the `pubspec.yaml` file in the project root to find the package 'name'.
 * @param rootPath The absolute path to the workspace root.
 * @returns The package name string, or null if not found.
 */
export function getPackageName(rootPath: string): string | null {
    const pubspecPath = path.join(rootPath, 'pubspec.yaml');

    if (!fs.existsSync(pubspecPath)) {
        vscode.window.showErrorMessage('❌ pubspec.yaml not found in project root.');
        return null;
    }

    try {
        const fileContent = fs.readFileSync(pubspecPath, 'utf8');
        
        // Simple regex to find "name: my_package_name"
        // Matches "name:", optional whitespace, then captures the rest of the line
        const nameMatch = fileContent.match(/^name:\s+(\S+)/m);
        
        if (nameMatch && nameMatch[1]) {
            return nameMatch[1].trim();
        } else {
            vscode.window.showErrorMessage('❌ Could not parse "name" from pubspec.yaml.');
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * Verifies if the translation file exists at the specified path.
 * @param rootPath The absolute path to the workspace root.
 * @param relativeTranslationPath The relative path (e.g. 'assets/translations/en-GB.json')
 * @returns True if file exists, False otherwise.
 */
export function checkTranslationFileExists(rootPath: string, relativeTranslationPath: string): boolean {
    const absPath = path.join(rootPath, relativeTranslationPath);
    
    if (fs.existsSync(absPath)) {
        return true;
    } else {
        vscode.window.showErrorMessage(`❌ Translation file not found at: ${relativeTranslationPath}`);
        return false;
    }
}