import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * writes content to a file. Creates directories if they don't exist.
 */
export async function writeFile(fsPath: string, content: string) {
    const uri = vscode.Uri.file(fsPath);
    const dir = path.dirname(fsPath);
    
    // Recursive directory creation
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const data = Buffer.from(content, 'utf8');
    await vscode.workspace.fs.writeFile(uri, data);
}

/**
 * Calculates the Dart import path from one file to another.
 * Ensures usage of forward slashes and local identifiers (./).
 */
export function getRelativeImportPath(fromDir: string, toFile: string): string {
    let rel = path.relative(fromDir, toFile);
    
    // Force forward slashes for Dart imports (even on Windows)
    rel = rel.split(path.sep).join('/');
    
    if (!rel.startsWith('.')) {
        rel = './' + rel;
    }
    return rel;
}