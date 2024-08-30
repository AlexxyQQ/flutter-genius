import * as fs from "fs";
import * as path from "path";
import { readSetting } from "../../../utils/read-settings";

// Function to get all .dart files excluding .g.dart files
// If uiGenerationEnabled is false, it will skip files whose path contains /view, /page, or /ui
export function getDartFiles(
  dir: string, // The directory to start searching in
  fileList: string[] = [] // Accumulator for storing the list of .dart files
): string[] {
  // Read all files and directories within the specified directory
  const files = fs.readdirSync(dir);

  // Read the setting for UI generation
  const uiGenerationEnabled = readSetting("export.uiGenerationEnabled");

  // Iterate through each file or directory
  files.forEach((file) => {
    // Construct the full path of the current file or directory
    const filePath = path.join(dir, file);
    // Get the statistics of the current file or directory (e.g., whether it's a file or a directory)
    const stat = fs.statSync(filePath);

    // If the current path is a directory, recursively search within it
    if (stat.isDirectory()) {
      getDartFiles(filePath, fileList);
    }
    // If it's a .dart file and not a .g.dart file
    else if (
      file.endsWith(".dart") &&
      (!file.endsWith(".g.dart") || file.endsWith(".freezed.dart"))
    ) {
      // If UI generation is disabled, skip files with /view, /page, or /ui in their path
      if (
        (!uiGenerationEnabled &&
          (filePath.includes("\\view") ||
            filePath.includes("\\page") ||
            filePath.includes("\\ui"))) ||
        filePath.includes("\\custom_widgets") ||
        filePath.includes("\\custom_widget") ||
        filePath.includes("\\widgets") ||
        filePath.includes("\\widget")
      ) {
        return; // Skip this file
      }
      // Otherwise, add the file to the fileList array
      fileList.push(filePath);
    }
  });

  // Return the accumulated list of .dart files
  return fileList;
}
