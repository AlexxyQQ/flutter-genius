import * as vscode from "vscode";
import * as path from "path";
import { getAllDeclarations, DeclarationInfo } from "../utils/dart_parser";
import { toSnakeCase } from "../utils/string_utils";
import { writeFile } from "../utils/file_manager";

export async function extractClassesCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const originalText = document.getText();
  const originalFilePath = document.uri.fsPath;
  const originalDir = path.dirname(originalFilePath);
  const originalFileName = path.basename(originalFilePath);

  // 1. Find all classes, enums, and mixins
  const allDecls = getAllDeclarations(originalText);

  if (allDecls.length === 0) {
    vscode.window.showWarningMessage("No declarations found to extract.");
    return;
  }

  // ---------------------------------------------------------
  // 2. CLEANUP LOGIC: Identify Redundant Subclasses
  //    (User wants to delete 'Extended' classes and use 'Entity' classes)
  // ---------------------------------------------------------

  // Map of Name -> Declaration
  const declMap = new Map<string, DeclarationInfo>();
  allDecls.forEach((d) => declMap.set(d.name, d));

  const replacements = new Map<string, string>(); // ChildName -> ParentName
  const keptDecls: DeclarationInfo[] = [];

  for (const decl of allDecls) {
    // Check if this class extends another class present in this file
    // Regex matches: "class Child extends Parent"
    // We strictly check for 'extends' to avoid mixins/implements for now,
    // assuming the user pattern is strict inheritance.
    const extendsMatch = decl.body.match(/class\s+\w+\s+extends\s+(\w+)/);

    if (extendsMatch) {
      const parentName = extendsMatch[1];

      // If the parent is ALSO defined in this file, we treat the Child as redundant
      if (declMap.has(parentName)) {
        // Mark for deletion and replacement
        replacements.set(decl.name, parentName);
        console.log(
          `Marking ${decl.name} for deletion (extends ${parentName})`
        );
        continue; // SKIP pushing to keptDecls
      }
    }

    keptDecls.push(decl);
  }

  // 3. APPLY REPLACEMENTS to Declarations
  //    (Replace usages of "JobType" with "JobTypeEntity" in remaining code)
  const processedDecls = keptDecls.map((decl) => {
    let newBody = decl.body;

    replacements.forEach((parentName, childName) => {
      // Use word boundaries (\b) to ensure we don't replace partial words
      const regex = new RegExp(`\\b${childName}\\b`, "g");
      newBody = newBody.replace(regex, parentName);
    });

    return { ...decl, body: newBody };
  });

  // ---------------------------------------------------------
  // 4. PREPARE EXTRACTION
  // ---------------------------------------------------------

  const existingImports = originalText
    .split("\n")
    .filter((line) => line.trim().startsWith("import "));

  // Map: ClassName -> FileName
  const declToFilenameMap: Map<string, string> = new Map();
  processedDecls.forEach((decl) => {
    declToFilenameMap.set(decl.name, `${toSnakeCase(decl.name)}.dart`);
  });

  const extractedFiles: string[] = [];
  let primaryDeclBody: string | null = null;
  let primaryDeclName: string | null = null;
  let primaryDeclIsFreezed = false;

  // 5. GENERATE FILES
  for (const decl of processedDecls) {
    const targetFileName = declToFilenameMap.get(decl.name)!;

    // CASE A: Primary Declaration (Keeps the original filename)
    if (targetFileName === originalFileName) {
      primaryDeclBody = decl.body;
      primaryDeclName = decl.name;
      primaryDeclIsFreezed = decl.isFreezed;
      continue;
    }

    // CASE B: Extracted Declaration
    extractedFiles.push(targetFileName);
    const filePath = path.join(originalDir, targetFileName);
    const headerLines = [...existingImports];

    // Import siblings
    declToFilenameMap.forEach((siblingFile, siblingName) => {
      if (siblingName !== decl.name) {
        headerLines.push(`import '${siblingFile}';`);
      }
    });

    // Add 'part' directives
    if (decl.body.includes(`_$${decl.name}`)) {
      headerLines.push("");
      headerLines.push(`part '${toSnakeCase(decl.name)}.g.dart';`);
      if (decl.isFreezed) {
        headerLines.push(`part '${toSnakeCase(decl.name)}.freezed.dart';`);
      }
    }

    const fileContent = `${headerLines.join("\n")}\n\n${decl.body}\n`;
    await writeFile(filePath, fileContent);
  }

  // 6. REWRITE ORIGINAL FILE
  const finalImports = [...existingImports];
  const finalExports: string[] = [];

  extractedFiles.forEach((file) => {
    finalImports.push(`import '${file}';`);
    finalExports.push(`export '${file}';`);
  });

  const finalParts: string[] = [];
  if (
    primaryDeclName &&
    primaryDeclBody &&
    primaryDeclBody.includes(`_$${primaryDeclName}`)
  ) {
    finalParts.push(`part '${toSnakeCase(primaryDeclName)}.g.dart';`);
    if (primaryDeclIsFreezed) {
      finalParts.push(`part '${toSnakeCase(primaryDeclName)}.freezed.dart';`);
    }
  }

  let newContent = "";
  newContent += finalImports.join("\n") + "\n\n";
  if (finalExports.length > 0) newContent += finalExports.join("\n") + "\n\n";
  if (finalParts.length > 0) newContent += finalParts.join("\n") + "\n\n";

  if (primaryDeclBody) {
    newContent += primaryDeclBody + "\n";
  } else {
    newContent += "// Generated Barrel File\n";
  }

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(originalText.length)
  );

  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, fullRange, newContent);
  await vscode.workspace.applyEdit(edit);

  const deletedCount = replacements.size;
  vscode.window.showInformationMessage(
    `Extracted ${processedDecls.length} items. Removed ${deletedCount} redundant subclasses.`
  );
}
