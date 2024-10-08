import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getLibPath } from "../../generate_clean_code_arch/utils/check-lib-folder";
import { getDartFiles } from "./export_generator";
import { findProjectName } from "../../../utils/get-app-name";
import { checkExportedFilesExist } from "./export_validator";
import { readSetting } from "../../../utils/read-settings";
import { sortExports } from "./export_sorter";

// Main function to create the export command
export function createExportCommand() {
  const registerExportGeneratorCommand = vscode.commands.registerCommand(
    "flutter-genius.createExportFile",
    async (uri: vscode.Uri) => {
      if (vscode.workspace.workspaceFolders) {
        const libPath = getLibPath([...vscode.workspace.workspaceFolders]);
        const projectName = (await findProjectName()) ?? "";

        if (libPath) {
          const targetDirectory = path.resolve(__dirname, `${libPath}/lib`);
          const outputFilePath = path.join(
            targetDirectory,
            "/core/common/exports.dart"
          );

          const dartFiles = getDartFiles(targetDirectory);

          const allExports = getAllExports(
            outputFilePath,
            dartFiles,
            projectName,
            targetDirectory
          );

          writeExportsToFile(outputFilePath, allExports);

          dartFiles.forEach((file) => {
            if (
              file.includes("exports.dart") ||
              file.includes(".g.dart") ||
              file.includes(".freezed.dart") ||
              file.includes("l10n.dart") ||
              file.includes("\\intl") ||
              file.includes(".gen.dart") ||
              file.includes(".gr.dart")
            ) {
              return;
            }

            prependExportLine(file, projectName);
          });

          // run dart fix --apply command after adding export statement
          vscode.window.showInformationMessage(
            "Export statement added successfully. Running dart fix --apply command..."
          );

          console.log(
            "outputFilePath" + outputFilePath,
            "rootFolderPath" + targetDirectory,
            "projectName" + projectName
          );
          const removeDeadFilesExport = readSetting(
            "export.removeDeadFilesFromExports"
          );

          if (removeDeadFilesExport) {
            await checkExportedFilesExist(
              outputFilePath,
              targetDirectory,
              projectName
            );
          }
          sortExports(outputFilePath, projectName);
          removeDuplicateLines(outputFilePath);
          const terminal = vscode.window.createTerminal();
          terminal.sendText("flutter pub get");
          terminal.sendText("dart fix --apply");
          terminal.show();
        } else {
          vscode.window.showErrorMessage("lib folder not found.");
        }
      }
    }
  );

  return registerExportGeneratorCommand;
}

// Function to get all exports, merging existing and new export statements
function getAllExports(
  outputFilePath: string,
  dartFiles: string[],
  projectName: string,
  targetDirectory: string
): string[] {
  let existingExports: string[] = [];

  if (fs.existsSync(outputFilePath)) {
    const existingContent = fs.readFileSync(outputFilePath, "utf8");
    existingExports = existingContent.split("\n").filter(Boolean); // Filter out empty lines
  } else {
    // Create the output directory if it doesn't exist
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
  }

  const newExports = dartFiles.map((file) => {
    const relativePath = path
      .relative(targetDirectory, file)
      .replace(/\\/g, "/");
    return `export 'package:${projectName}/${relativePath}';`;
  });

  // Merge existing exports with new exports, ensuring no duplicates
  return Array.from(new Set([...existingExports, ...newExports]));
}

// Function to write all export statements to the output file
function writeExportsToFile(
  outputFilePath: string,
  allExports: string[]
): void {
  fs.writeFileSync(outputFilePath, allExports.join("\n"), "utf8");
}

// Function to prepend export line to a Dart file
function prependExportLine(filePath: string, projectName: string): void {
  const exportLine = `import 'package:${projectName}/core/common/exports.dart';\n`;

  // Read the existing content of the file
  const fileContent = fs.readFileSync(filePath, "utf8");

  // Check if the export line already exists anywhere in the file
  if (!fileContent.includes(exportLine.trim())) {
    // Prepend the export line to the content
    const newContent = exportLine + fileContent;

    // Write the new content back to the file
    fs.writeFileSync(filePath, newContent, "utf8");
  }
}

/**
 * Removes duplicate lines from the given export file and writes back the unique lines.
 * @param outputFilePath - Path to the exports.dart file.
 */
function removeDuplicateLines(outputFilePath: string): void {
  try {
    // Read the file content
    const exportsFileContent = fs.readFileSync(outputFilePath, "utf8");

    // Split the content into lines, trim whitespace, and remove duplicates
    const lines = exportsFileContent.split("\n");
    const uniqueLines = Array.from(
      new Set(lines.map((line) => line.trim())) // Trim each line to avoid issues with extra spaces
    ).filter((line) => line !== ""); // Optional: Filter out any empty lines

    // Write the unique lines back to the file
    fs.writeFileSync(outputFilePath, uniqueLines.join("\n"), "utf8");
    console.log(`Duplicates removed from ${outputFilePath}`);
  } catch (error) {
    console.error(`Error processing file ${outputFilePath}:`, error);
  }
}
