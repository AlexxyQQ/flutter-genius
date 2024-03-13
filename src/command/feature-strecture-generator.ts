import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Main function to create the feature structure.
export function createFeatureStructure(basePath: string, featureName: string) {
  // Access configuration settings specific to this extension.
  const config = vscode.workspace.getConfiguration("dartEntityModelGenerator");

  // Retrieve settings from configuration; default to true if not set.
  const createHive = config.get<boolean>("createHive", true);
  const createInjectionContainer = config.get<boolean>(
    "createInjectionContainer",
    true
  );

  // Construct the path for the new feature directory.
  const featureDirPath = path.join(basePath, featureName);

  // Generate the initial structure based on settings and feature name.
  let structure = getInitialStructure(
    featureName,
    createHive,
    createInjectionContainer
  );

  // Recursively create the directory and file structure.
  generateStructure(featureDirPath, structure, featureName);
}

// Function to initialize the folder and file structure based on user settings.
function getInitialStructure(
  featureName: string,
  createHive: boolean,
  createInjectionContainer: boolean
) {
  // Define the base structure object with predefined directories and files.
  let structure: any = {
    domain: {
      entity: ["test_entity.dart"],
      usecase: ["get_all_test_usecase.dart"],
      repository: ["test_repository.dart"],
    },
    data: {
      data_source: {
        local: {}, // Placeholder for local data sources; initially empty.
        remote: ["test_remote_data_source.dart"], // Predefined remote data source.
      },
      model: {}, // Placeholder for models; initially empty.
      repository: ["test_repository_impl.dart"], // Predefined repository implementation.
    },
    presentation: {
      cubit: ["test_state.dart", "test_cubit.dart"], // Predefined state and cubit files for Cubit state management.
      view: ["test_view.dart"], // Predefined view file.
      widget: {}, // Placeholder for widgets; initially empty.
    },
  };

  // If Hive setting is enabled, add Hive-specific files.
  if (createHive) {
    structure.data.model.hive = [`${featureName}_hive_model.dart`];
    structure.data.data_source.local.hive_service = [
      `${featureName}_hive_service.dart`,
    ];
  }

  // If Injection Container setting is enabled, add an injection container file.
  if (createInjectionContainer) {
    structure[featureName + "_injection_container"] = [
      `${featureName}_injection_container.dart`,
    ];
  }

  // Basic local data source and model files are always included.
  structure.data.data_source.local[""] = ["test_local_data_source.dart"];
  structure.data.model[""] = ["test_model.dart"];

  return structure;
}

// Recursive function to create directories and files as defined in the structure.
function generateStructure(
  basePath: string,
  structure: any,
  featureName: string
) {
  // Iterate over each directory in the structure.
  Object.keys(structure).forEach((dir) => {
    // Resolve the full path for the directory.
    const dirPath = path.join(basePath, dir);

    // Create the directory if it does not already exist.
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Get the contents of the directory, which could be subdirectories or files.
    const contents = structure[dir];

    // If contents is an array, it's a list of files to create in this directory.
    if (Array.isArray(contents)) {
      contents.forEach((file) => {
        // Construct the full path for the file and write a basic template.
        const filePath = path.join(dirPath, file);
        fs.writeFileSync(filePath, "// your code here\n");
      });
    } else {
      // If not an array, it's a subdirectory with its own structure, so call generateStructure recursively.
      generateStructure(dirPath, contents, featureName);
    }
  });
}

export function createAddFeatureCommand() {
  let addFeatureCommand = vscode.commands.registerCommand(
    "dart-entity-model-generator.addFeature",
    async (uri: vscode.Uri) => {
      // Extract the folder name from the URI
      const folderName = path.basename(uri.fsPath);

      // Check if the folder name is 'feature'
      if (folderName.toLowerCase() === "feature") {
        const featureName = await vscode.window.showInputBox({
          prompt: "What is the name of the feature?",
        });
        if (!featureName) {
          vscode.window.showErrorMessage("Feature name cannot be empty!");
          return;
        }

        createFeatureStructure(uri.fsPath, featureName);
        vscode.window.showInformationMessage(
          `Feature '${featureName}' has been created successfully in ${folderName}!`
        );
      } else {
        vscode.window.showErrorMessage(
          "This command can only be executed on a directory named 'feature'."
        );
      }
    }
  );

  return addFeatureCommand;
}
