import * as vscode from 'vscode';
import * as path from 'path';
import { getClassAtPosition, extractFields } from '../utils/dart_parser';
import { getRelativeImportPath, writeFile } from '../utils/file_manager';
import { generateFreezedModelContent } from '../templates/freezed_model';
import { toSnakeCase } from '../utils/string_utils';

/**
 * The main logic for the 'dart-entity-mapper.generateMapper' command.
 */
export async function generateEntityToModelCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const document = editor.document;
    const filePath = document.uri.fsPath;

    // 1. Detect Class at Cursor
    const cursorPosition = editor.selection.active;
    const classInfo = getClassAtPosition(document, cursorPosition);

    if (!classInfo) {
        vscode.window.showErrorMessage('No class found at current cursor position.');
        return;
    }

    const { className, classBody } = classInfo;

    // Validate Naming Convention
    if (!className.endsWith('Entity')) {
        vscode.window.showErrorMessage(`Selected class "${className}" must end in "Entity".`);
        return;
    }

    // 2. Prepare Paths (Resolve domain/entities -> data/models)
    const entityDir = path.dirname(filePath);
    let modelDir = '';
    
    // Heuristic to switch from Clean Architecture 'domain' layer to 'data' layer
    if (entityDir.includes(path.join('domain', 'entities'))) {
        modelDir = entityDir.replace(path.join('domain', 'entities'), path.join('data', 'models'));
    } else if (entityDir.includes('domain')) {
        modelDir = entityDir.replace('domain', path.join('data', 'models'));
    } else {
         modelDir = path.join(path.dirname(entityDir), 'data', 'models');
    }

    // 3. Determine File Names
    // Converts UserEntity -> user_model.dart to prevent file overwrites
    const snakeClassName = toSnakeCase(className);
    let baseName = snakeClassName;
    
    if (baseName.endsWith('_entity')) {
        baseName = baseName.substring(0, baseName.length - '_entity'.length);
    }
    
    const modelFileName = `${baseName}_model.dart`;
    const targetPath = path.join(modelDir, modelFileName);

    // 4. Parse Fields
    const fields = extractFields(classBody);
    if (fields.length === 0) {
        vscode.window.showErrorMessage(`No final fields found in ${className} to map.`);
        return;
    }

    // 5. Generate Code Content
    const modelClassName = className.replace('Entity', 'Model');
    const relativeImportPath = getRelativeImportPath(modelDir, filePath);
    
    const fileContent = generateFreezedModelContent(
        modelClassName, 
        className, 
        relativeImportPath, 
        modelFileName, 
        fields
    );

    // 6. Write to Disk
    try {
        await writeFile(targetPath, fileContent);
        
        // Open the newly created file
        const doc = await vscode.workspace.openTextDocument(targetPath);
        await vscode.window.showTextDocument(doc);
        
        vscode.window.showInformationMessage(`Generated Freezed model: ${modelClassName}`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate model: ${error.message}`);
    }
}