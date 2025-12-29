import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { toSnakeCase } from '../utils/string_utils';
import { getBlocContent, getEventContent, getStateContent } from '../templates/bloc_templates';

export async function createBlocCommand(uri: vscode.Uri) {
    // 1. Determine target folder
    // If command triggered from context menu, 'uri' is valid. 
    // If via Command Palette, fallback to workspace root.
    let targetPath = uri ? uri.fsPath : '';
    if (!targetPath) {
        if (vscode.workspace.workspaceFolders) {
            targetPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        } else {
            vscode.window.showErrorMessage('Please open a workspace or right-click a folder to create a BLoC.');
            return;
        }
    }

    // Ensure we are inside a directory (if user clicked a file, get its parent)
    if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isFile()) {
        targetPath = path.dirname(targetPath);
    }

    // 2. Ask User for BLoC Name
    const blocNameInput = await vscode.window.showInputBox({
        prompt: 'Enter BLoC Name (e.g., "Apple" or "LoginScreen")',
        placeHolder: 'Apple'
    });

    if (!blocNameInput) return; // User cancelled

    // 3. Format Names
    const pascalName = toPascalCase(blocNameInput);
    const snakeName = toSnakeCase(pascalName);

    // 4. Create a dedicated folder for the BLoC? (Optional, but recommended)
    // E.g., lib/features/apple_bloc/
    const blocFolder = path.join(targetPath, `${snakeName}_bloc`);
    
    if (!fs.existsSync(blocFolder)) {
        fs.mkdirSync(blocFolder, { recursive: true });
    }

    // 5. Generate File Paths
    const blocFile = path.join(blocFolder, `${snakeName}_bloc.dart`);
    const eventFile = path.join(blocFolder, `${snakeName}_event.dart`);
    const stateFile = path.join(blocFolder, `${snakeName}_state.dart`);

    // 6. Write Files
    try {
        fs.writeFileSync(blocFile, getBlocContent(pascalName, snakeName));
        fs.writeFileSync(eventFile, getEventContent(pascalName, snakeName));
        fs.writeFileSync(stateFile, getStateContent(pascalName, snakeName));

        vscode.window.showInformationMessage(`✅ BLoC "${pascalName}" created successfully!`);
        
        // Open the main Bloc file
        const doc = await vscode.workspace.openTextDocument(blocFile);
        await vscode.window.showTextDocument(doc);

    } catch (error: any) {
        vscode.window.showErrorMessage(`Error creating BLoC: ${error.message}`);
    }
}

// Helper: Ensure we have a PascalCase converter
function toPascalCase(str: string): string {
    // 1. Remove non-alphanumeric chars (replace with space)
    // 2. Split by space
    // 3. Capitalize first letter of each word
    // 4. Join
    return str
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}