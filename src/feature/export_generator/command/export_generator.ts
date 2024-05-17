import * as fs from "fs";
import * as path from "path";

// Function to get all .dart files excluding .g.dart files
export function getDartFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getDartFiles(filePath, fileList);
    } else if (file.endsWith(".dart") && !file.endsWith(".g.dart")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}
