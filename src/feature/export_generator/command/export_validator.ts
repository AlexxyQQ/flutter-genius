import * as fs from "fs";
import * as path from "path";

/**
 * Checks the existence of files specified in a Dart export file.
 * @param exportFilePath - Path to the export file.
 * @param rootFolderPath - Path to the root folder where files are checked.
 * @param projectName - Name of the Dart/Flutter project for package resolution.
 */
export async function checkExportedFilesExist(
  exportFilePath: string,
  rootFolderPath: string,
  projectName: string
): Promise<void> {
  try {
    // Read the export file content
    const fileContent = await fs.promises.readFile(exportFilePath, "utf-8");
    const lines = fileContent.split("\n");

    // Array to store valid lines
    const validLines = [];

    for (const line of lines) {
      // Trim whitespace and skip empty lines or comments
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("//")) {
        validLines.push(line);
        continue;
      }

      // Match export statements like `export 'file_path.dart';`
      const exportRegex = /export\s+['"](.*)['"];/;
      const match = exportRegex.exec(trimmedLine);

      if (match && match[1]) {
        const relativePath = match[1];
        let filePath = "";

        // Check if it's a package import or a relative path that starts with '../'
        if (relativePath.startsWith("package:")) {
          // Handle package imports (e.g., package:project_name/file.dart)
          const packagePath = relativePath.replace(
            `package:${projectName}/`,
            ""
          );
          if (!relativePath.includes(projectName)) {
            console.log(`Skipping Packages export: ${packagePath}`);
            validLines.push(line); // Retain the line since it's a valid package export
            continue;
          }
          filePath = path.join(rootFolderPath, packagePath); // Join the path with the lib folder
        } else if (relativePath.startsWith("../")) {
          // Handle relative paths that start with '../'
          filePath = path.resolve(path.dirname(exportFilePath), relativePath);
        } else {
          // Skip other exports that are not starting with '../'
          console.log(`Skipping non-relative export: ${relativePath}`);
          validLines.push(line); // Retain the line since it's a valid export
          continue;
        }

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          // Skip adding this line since the file does not exist
        } else {
          console.log(`File exists: ${filePath}`);
          validLines.push(line); // Add the line if the file exists
        }
      } else {
        validLines.push(line); // Add lines that don't match the export pattern
      }
    }

    // Write the updated content back to the export file
    await fs.promises.writeFile(exportFilePath, validLines.join("\n"), "utf-8");
  } catch (error) {
    console.error(`Error reading file: ${exportFilePath}`, error);
  }
}
