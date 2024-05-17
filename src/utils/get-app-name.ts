import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export async function findProjectName(): Promise<string | null> {
  try {
    const pubspecs = await vscode.workspace.findFiles("pubspec.yaml");

    if (pubspecs && pubspecs.length > 0) {
      const pubspec = pubspecs[0];
      const content = fs.readFileSync(pubspec.fsPath, "utf8");

      if (content && content.includes("name: ")) {
        let projectName: string | null = null;

        for (const line of content.split("\n")) {
          if (line.startsWith("name: ")) {
            projectName = line.replace("name:", "").trim();
            break;
          }
        }

        return projectName;
      }
    }
  } catch (error) {
    console.error("Error finding project name:", error);
  }

  return null;
}
