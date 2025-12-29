import * as vscode from 'vscode';

/**
 * Finds the Dart class definition enclosing the cursor or immediately preceding it.
 * * @param document The active text document.
 * @param position The current cursor position.
 * @returns An object containing the class name and the isolated text body of that class, or null.
 */
export function getClassAtPosition(document: vscode.TextDocument, position: vscode.Position): { className: string, classBody: string } | null {
    let startLine = position.line;
    let className = '';
    let foundStart = false;

    // 1. Search backwards from cursor for "class SomeName"
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

    // 2. Extract text from start line to end of document to find the closing brace
    let textFromStart = '';
    for (let i = startLine; i < document.lineCount; i++) {
        textFromStart += document.lineAt(i).text + '\n';
    }

    // 3. Brace counting to isolate the class body
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

        // If we opened a block and returned to 0 braces, that's the end of the class
        if (hasStartedBlock && openBraces === 0) {
            endIndex = i + 1;
            break;
        }
    }

    if (endIndex === 0) return null; 

    const classBody = textFromStart.substring(0, endIndex);
    return { className, classBody };
}

/**
 * Extracts final fields from a Dart class body string.
 * Supports complex types like Map<String, dynamic> via lazy matching.
 * * @param classBody The raw string content of the class.
 * @returns Array of field objects { type, name }.
 */
export function extractFields(classBody: string): { type: string, name: string }[] {
    // Regex Breakdown:
    // final\s+   -> Matches 'final' followed by whitespace
    // (.+?)      -> Capture Group 1 (Type): Matches lazily (handles generics like List<String>)
    // \s+        -> Whitespace between Type and Name
    // (\w+)      -> Capture Group 2 (Name): The variable name
    // ;          -> Ends with semicolon
    const fieldRegex = /final\s+(.+?)\s+(\w+);/g;
    
    let match;
    const fields: { type: string, name: string }[] = [];

    while ((match = fieldRegex.exec(classBody)) !== null) {
        fields.push({ 
            type: match[1].trim(), 
            name: match[2] 
        });
    }
    return fields;
}