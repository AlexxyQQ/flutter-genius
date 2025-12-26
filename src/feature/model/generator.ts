import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('dart-entity-mapper.generateMapper', async () => {
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

        if (!className.endsWith('Entity')) {
            vscode.window.showErrorMessage(`Selected class "${className}" must end in "Entity".`);
            return;
        }

        // 2. Prepare Paths (domain/entities -> data/models)
        const entityDir = path.dirname(filePath);
        let modelDir = '';
        
        if (entityDir.includes(path.join('domain', 'entities'))) {
            modelDir = entityDir.replace(path.join('domain', 'entities'), path.join('data', 'models'));
        } else if (entityDir.includes('domain')) {
            modelDir = entityDir.replace('domain', path.join('data', 'models'));
        } else {
             modelDir = path.join(path.dirname(entityDir), 'data', 'models');
        }

        // --- NEW FILE NAMING LOGIC (Based on Class Name, not File Name) ---
        // This ensures UserEntity -> user_model.dart AND UserEntity2 -> user_entity2_model.dart
        // preventing overwrites when multiple entities exist in one file.
        const snakeClassName = toSnakeCase(className);
        let baseName = snakeClassName;
        
        if (baseName.endsWith('_entity')) {
            baseName = baseName.substring(0, baseName.length - '_entity'.length);
        }
        
        const modelFileName = `${baseName}_model.dart`;
        const targetPath = path.join(modelDir, modelFileName);

        // 3. Extract Fields (scoped to classBody only)
        const fields = extractFields(classBody);
        if (fields.length === 0) {
            vscode.window.showErrorMessage(`No final fields found in ${className} to map.`);
            return;
        }

        // 4. Generate Freezed Model Code
        const modelClassName = className.replace('Entity', 'Model');
        const relativeImportPath = getRelativeImportPath(modelDir, filePath);
        
        const fileContent = generateFreezedModelContent(
            modelClassName, 
            className, 
            relativeImportPath, 
            modelFileName, 
            fields
        );

        // 5. Write File
        try {
            await writeFile(targetPath, fileContent);
            
            const doc = await vscode.workspace.openTextDocument(targetPath);
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage(`Generated Freezed model: ${modelClassName}`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate model: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

// --- Helper Functions ---

/**
 * Finds the class definition enclosing the cursor or immediately preceding it.
 * Returns the class name and the isolated text body of that class.
 */
function getClassAtPosition(document: vscode.TextDocument, position: vscode.Position): { className: string, classBody: string } | null {
    // 1. Find the class declaration line by searching upwards
    let startLine = position.line;
    let className = '';
    let foundStart = false;

    // Search backwards for "class ClassName"
    for (let i = startLine; i >= 0; i--) {
        const lineText = document.lineAt(i).text;
        const match = lineText.match(/class\s+(\w+)/);
        if (match) {
            className = match[1];
            startLine = i;
            foundStart = true;
            break;
        }
    }

    if (!foundStart) return null;

    // 2. Extract the full text starting from that line to find the closing brace
    // We do a simple brace counting approach
    let textFromStart = '';
    for (let i = startLine; i < document.lineCount; i++) {
        textFromStart += document.lineAt(i).text + '\n';
    }

    let openBraces = 0;
    let endIndex = 0;
    let hasStartedBlock = false;

    for (let i = 0; i < textFromStart.length; i++) {
        if (textFromStart[i] === '{') {
            openBraces++;
            hasStartedBlock = true;
        } else if (textFromStart[i] === '}') {
            openBraces--;
        }

        // If we have started the block and returned to 0 braces, we found the end
        if (hasStartedBlock && openBraces === 0) {
            endIndex = i + 1;
            break;
        }
    }

    if (endIndex === 0) return null; // Could not find closing brace

    const classBody = textFromStart.substring(0, endIndex);
    return { className, classBody };
}

function toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

function extractFields(classBody: string): { type: string, name: string }[] {
    const fieldRegex = /final\s+([\w<>?]+)\s+(\w+);/g;
    let match;
    const fields: { type: string, name: string }[] = [];

    while ((match = fieldRegex.exec(classBody)) !== null) {
        fields.push({ type: match[1], name: match[2] });
    }
    return fields;
}

function getRelativeImportPath(fromDir: string, toFile: string): string {
    let rel = path.relative(fromDir, toFile);
    rel = rel.split(path.sep).join('/');
    if (!rel.startsWith('.')) {
        rel = './' + rel;
    }
    return rel;
}

function generateFreezedModelContent(
    modelClass: string, 
    entityClass: string, 
    importPath: string, 
    fileName: string,
    fields: { type: string, name: string }[]
): string {
    
    const factoryParams = fields
        .map(f => `    required ${f.type} ${f.name},`)
        .join('\n');

    const mapperFields = fields
        .map(f => `      ${f.name}: ${f.name},`)
        .join('\n');

    const baseName = fileName.replace('.dart', '');

    return `import 'package:freezed_annotation/freezed_annotation.dart';
import '${importPath}';

part '${baseName}.freezed.dart';
part '${baseName}.g.dart';

@freezed
class ${modelClass} extends ${entityClass} with _$${modelClass} {
  const ${modelClass}._();
	@JsonSerializable(explicitToJson: true)	
  const factory ${modelClass}({
${factoryParams}
  }) = _${modelClass};

  factory ${modelClass}.fromJson(Map<String, dynamic> json) => _$${modelClass}FromJson(json);

  ${entityClass} toEntity() {
    return ${entityClass}(
${mapperFields}
    );
  }
}
`;
}

async function writeFile(fsPath: string, content: string) {
    const uri = vscode.Uri.file(fsPath);
    const dir = path.dirname(fsPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const data = Buffer.from(content, 'utf8');
    await vscode.workspace.fs.writeFile(uri, data);
}

export function deactivate() {}