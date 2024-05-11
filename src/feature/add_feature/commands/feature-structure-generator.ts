import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { writeToGeneratedFile } from "../../../utils/write-to-generated-file";
import { readSetting } from "../../../utils/read-settings";

// Main function to create the feature structure.
export function createFeatureStructure(basePath: string, featureName: string) {
  // Access configuration settings specific to this extension.
  const config = vscode.workspace.getConfiguration("flutterGenius");
  // Retrieve settings from configuration; default to true if not set.
  const createHive = readSetting("feature.createHive");
  const createInjectionContainer = true;
  const createCubit = readSetting("feature.createCubit");
  const createLocalDataSource = readSetting("feature.localDataSource");

  // Construct the path for the new feature directory.
  const featureDirPath = path.join(basePath, featureName);

  // Generate the initial structure based on settings and feature name.
  let structure = getInitialStructure(
    featureName,
    createHive,
    createCubit,
    createLocalDataSource
  );

  // Recursively create the directory and file structure.
  generateStructure(featureDirPath, structure, featureName);
}
// Function to initialize the folder and file structure based on user settings.
function getInitialStructure(
  featureName: string,
  createHive: boolean,
  createCubit: boolean,
  createLocalDataSource: boolean
) {
  // Define the base structure object with predefined directories and files.
  let structure: any = {
    domain: {
      entities: [`${featureName}_entity.dart`],
      usecase: [`get_all_${featureName}_usecase.dart`],
      repository: [`${featureName}_repository.dart`],
    },
    data: {
      local: {}, // Placeholder for local data source files; initially empty.
      data_source: {
        remote: [`${featureName}_remote_data_source.dart`], // Predefined remote data source.
      },
      models: {}, // Placeholder for models; initially empty.
      repository: [`${featureName}_repository_impl.dart`], // Predefined repository implementation.
    },
    presentation: {
      view: [`${featureName}_view.dart`], // Predefined view file.
      widget: {},
    },
    di: [`${featureName}_di.dart`],
  };

  // If Cubit setting is enabled, add Cubit-specific files.
  if (createCubit) {
    structure.presentation.cubit = [
      `${featureName}_cubit.dart`,
      `${featureName}_state.dart`,
    ];
  }

  // If Hive setting is enabled, add Hive-specific files.
  if (createHive) {
    structure.data.models.hive_models = [`${featureName}_hive_model.dart`];
    structure.data.data_source.local = {}; // Initialize local data source object.
    structure.data.data_source.local.hive_service = [
      `${featureName}_hive_service.dart`,
    ];
  }

  // If Local Data Source setting is enabled, add local data source file.
  if (createLocalDataSource) {
    structure.data.data_source.local = {}; // Initialize local data source object.
    structure.data.data_source.local[""] = [
      `${featureName}_local_data_source.dart`,
    ];
  }

  // Basic model files are always included.
  structure.data.models[featureName] = [`${featureName}_model.dart`];

  // If Injection Container setting is enabled, add injection container file.

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
        const filePath = path.join(dirPath, file);
        writeToGeneratedFile(filePath, file, featureName);
      });
    } else {
      // If not an array, it's a subdirectory with its own structure, so call generateStructure recursively.
      generateStructure(dirPath, contents, featureName);
    }
  });
}
