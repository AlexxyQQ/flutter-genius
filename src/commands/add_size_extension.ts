import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getPackageName } from '../utils/project_utils';
import { APP_SIZE_EXTENSION_CONTENT } from '../templates/size_extension_template';

const EXTENSION_PATH_REL = 'lib/core/common/presentation/extensions/size/app_size_extension.dart';

export async function addSizeExtensionCommand() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace opened.');
        return;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;
    
    // 1. CHECK PUBSPEC FOR FLUTTER_SCREENUTIL
    if (!checkDependency(rootPath, 'flutter_screenutil')) {
        const action = await vscode.window.showErrorMessage(
            '❌ Missing "flutter_screenutil" in pubspec.yaml. This extension depends on it.',
            'I will add it'
        );
        if (action === 'I will add it') {
            vscode.window.showInformationMessage('Please add "flutter_screenutil" to your pubspec.yaml and try again.');
        }
        return;
    }

    // 2. CREATE EXTENSION FILE
    const extensionAbsPath = path.join(rootPath, ...EXTENSION_PATH_REL.split('/'));
    ensureDirectoryExistence(extensionAbsPath);
    
    // Only write if it doesn't exist (or overwrite if you prefer forced updates)
    fs.writeFileSync(extensionAbsPath, APP_SIZE_EXTENSION_CONTENT, 'utf8');
    vscode.window.showInformationMessage(`✅ Created: ${EXTENSION_PATH_REL}`);

    // 3. RUN REFACTOR SCRIPT
    const packageName = getPackageName(rootPath);
    const importString = packageName 
        ? `import 'package:${packageName}/core/common/presentation/extensions/size/app_size_extension.dart';`
        : null;

    if (importString) {
        await runRefactoring(rootPath, importString);
    } else {
        vscode.window.showWarningMessage('Could not determine package name. Refactoring skipped.');
    }
}

// ======================= REFACTOR LOGIC =======================

async function runRefactoring(rootPath: string, importString: string) {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Refactoring UI to use Size Extensions...",
        cancellable: false
    }, async (progress) => {
        const files = await vscode.workspace.findFiles('lib/**/*.dart', '**/*.g.dart');
        let filesChangedCount = 0;

        for (const fileUri of files) {
            const filePath = fileUri.fsPath;
            // Avoid refactoring the extension file itself!
            if (filePath.endsWith('app_size_extension.dart')) continue;

            const originalContent = fs.readFileSync(filePath, 'utf8');
            let newContent = originalContent;

            // --- REGEX REPLACEMENTS ---
            // Note: We strip existing .w, .h, .r to avoid double scaling (since extension adds them)
            
            // 1. SizedBox(width: X) -> X.horizontalGap
            // Ensures NO 'child:' is present inside the definition
            newContent = newContent.replace(
                /SizedBox\s*\(\s*width:\s*(\d+(?:\.\d+)?)(?:\.w)?\s*\)/g, 
                '$1.horizontalGap'
            );

            // 2. SizedBox(height: X) -> X.verticalGap
            newContent = newContent.replace(
                /SizedBox\s*\(\s*height:\s*(\d+(?:\.\d+)?)(?:\.h)?\s*\)/g, 
                '$1.verticalGap'
            );

            // 3. EdgeInsets.all(X) -> X.allPadding
            newContent = newContent.replace(
                /EdgeInsets\.all\s*\(\s*(\d+(?:\.\d+)?)(?:\.w|\.h|\.r)?\s*\)/g, 
                '$1.allPadding'
            );

            // 4. EdgeInsets.symmetric(horizontal: X) -> X.horizontalPadding
            newContent = newContent.replace(
                /EdgeInsets\.symmetric\s*\(\s*horizontal:\s*(\d+(?:\.\d+)?)(?:\.w)?\s*\)/g, 
                '$1.horizontalPadding'
            );

            // 5. EdgeInsets.symmetric(vertical: X) -> X.verticalPadding
            newContent = newContent.replace(
                /EdgeInsets\.symmetric\s*\(\s*vertical:\s*(\d+(?:\.\d+)?)(?:\.h)?\s*\)/g, 
                '$1.verticalPadding'
            );

            // 6. EdgeInsets.only(...) -> X.bottomOnly, etc.
            newContent = newContent.replace(
                /EdgeInsets\.only\s*\(\s*bottom:\s*(\d+(?:\.\d+)?)(?:\.h)?\s*\)/g, 
                '$1.bottomOnly'
            );
            newContent = newContent.replace(
                /EdgeInsets\.only\s*\(\s*top:\s*(\d+(?:\.\d+)?)(?:\.h)?\s*\)/g, 
                '$1.topOnly'
            );
            newContent = newContent.replace(
                /EdgeInsets\.only\s*\(\s*left:\s*(\d+(?:\.\d+)?)(?:\.w)?\s*\)/g, 
                '$1.leftOnly'
            );
            newContent = newContent.replace(
                /EdgeInsets\.only\s*\(\s*right:\s*(\d+(?:\.\d+)?)(?:\.w)?\s*\)/g, 
                '$1.rightOnly'
            );

            // 7. BorderRadius.circular(X) -> X.rounded (returns BorderRadiusGeometry)
            // Note: extension has "BorderRadiusGeometry get rounded"
            newContent = newContent.replace(
                /BorderRadius\.circular\s*\(\s*(\d+(?:\.\d+)?)(?:\.r)?\s*\)/g, 
                '$1.rounded'
            );

            // 8. Radius.circular(X) -> X.circular
            newContent = newContent.replace(
                /Radius\.circular\s*\(\s*(\d+(?:\.\d+)?)(?:\.r)?\s*\)/g, 
                '$1.circular'
            );

            // 9. ShapeBorder / RoundedRectangleBorder (Complex)
            // Matches: RoundedRectangleBorder(borderRadius: BorderRadius.circular(X))
            newContent = newContent.replace(
                /RoundedRectangleBorder\s*\(\s*borderRadius:\s*BorderRadius\.circular\s*\(\s*(\d+(?:\.\d+)?)(?:\.r)?\s*\)\s*\)/g,
                '$1.roundShape'
            );

            // --- SAVE & IMPORT ---
            if (newContent !== originalContent) {
                // Add Import if missing
                if (!newContent.includes('app_size_extension.dart')) {
                    newContent = `${importString}\n${newContent}`;
                }
                
                fs.writeFileSync(filePath, newContent, 'utf8');
                filesChangedCount++;
                console.log(`Formatted: ${path.basename(filePath)}`);
            }
        }

        vscode.window.showInformationMessage(`🚀 Refactor Complete! Updated ${filesChangedCount} files.`);
    });
}

// ======================= UTILS =======================

function checkDependency(rootPath: string, depName: string): boolean {
    const pubspecPath = path.join(rootPath, 'pubspec.yaml');
    if (!fs.existsSync(pubspecPath)) return false;
    
    const content = fs.readFileSync(pubspecPath, 'utf8');
    // Simple check: looking for "flutter_screenutil:" inside dependencies
    // (Ignores comments roughly, but robust enough for this check)
    return content.includes(`${depName}:`);
}

function ensureDirectoryExistence(filePath: string) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}