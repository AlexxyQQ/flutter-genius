import * as fs from "fs";
import * as path from "path";

/**
 * Sorts exports from a Dart file into two groups: Packages and User Files, and sorts each group alphabetically.
 * @param exportFilePath - Path to the export file.
 * @param projectName - Name of the Dart/Flutter project for package resolution.
 * @returns An object containing sorted exports of packages and user files.
 */
export async function sortExports(
  exportFilePath: string,
  projectName: string
): Promise<{ packages: string[]; userFiles: string[] }> {
  try {
    // Read the export file content
    const fileContent = await fs.promises.readFile(exportFilePath, "utf-8");
    const lines = fileContent.split("\n");

    // Arrays to store package and user file exports
    const packageExports: string[] = [];
    const userFileExports: string[] = [];

    for (const line of lines) {
      // Trim whitespace and skip empty lines or comments
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("//")) continue;

      // Match export statements like `export 'file_path.dart';`
      const exportRegex = /export\s+['"](.*)['"];/;
      const match = exportRegex.exec(trimmedLine);

      if (match && match[1]) {
        const exportPath = match[1];

        // Classify as a user-created file or a package export
        if (
          exportPath.startsWith(`package:${projectName}`) ||
          exportPath.startsWith("../")
        ) {
          userFileExports.push(trimmedLine);
        } else {
          packageExports.push(trimmedLine);
        }
      }
    }

    // Sort each group alphabetically
    packageExports.sort((a, b) => a.localeCompare(b));
    userFileExports.sort((a, b) => a.localeCompare(b));

    // Combine the sorted groups with comments
    const sortedExports = [
      "// Package Exports",
      ...packageExports,
      "",
      "// User File Exports",
      ...userFileExports,
    ];

    // Optionally, write the sorted exports back to the file
    await fs.promises.writeFile(
      exportFilePath,
      sortedExports.join("\n"),
      "utf-8"
    );

    // Return the sorted exports for further processing if needed
    return { packages: packageExports, userFiles: userFileExports };
  } catch (error) {
    console.error(`Error reading or sorting file: ${exportFilePath}`, error);
    return { packages: [], userFiles: [] };
  }
}
