import * as fs from "fs";

import { appDart } from "../../generate_clean_code_arch/helpers/file-content-generators/app.dart";
import { mainDart } from "../../generate_clean_code_arch/helpers/file-content-generators/main.dart";
import { cubitFileContent } from "../helpers/file-content-generators/cubit-file-content";
import { dataSourceFileContent } from "../helpers/file-content-generators/data-source-file-content";
import { entityFileContent } from "../helpers/file-content-generators/entity-file-content";
import { injectionContainerFileContent } from "../helpers/file-content-generators/injection-container-file-contents";
import { modelFileContent } from "../helpers/file-content-generators/model-file-contents";
import { repositoryFileContent } from "../helpers/file-content-generators/repository-file-content";
import { viewFileContent } from "../helpers/file-content-generators/view-file-content";

export function writeToGeneratedFile(
  path: string,
  file: any,
  featureName: string
) {
  let fileContent: string;

  switch (file) {
    case `${featureName}_entity.dart`:
      fileContent = entityFileContent(featureName);
      break;
    case `${featureName}_model.dart`:
      fileContent = modelFileContent(featureName, false);
      break;
    case `${featureName}_hive_model.dart`:
      fileContent = modelFileContent(featureName, true);
      break;
    case `${featureName}_hive_service.dart`:
      fileContent = dataSourceFileContent(featureName, false, true);
      break;
    case `${featureName}_local_data_source.dart`:
      fileContent = dataSourceFileContent(featureName, true, false);
      break;
    case `${featureName}_repository.dart`:
      fileContent = repositoryFileContent(featureName, true);
      break;
    case `${featureName}_repository_impl.dart`:
      fileContent = repositoryFileContent(featureName, false);
      break;
    case `${featureName}_state.dart`:
      fileContent = cubitFileContent(featureName, true);
      break;
    case `${featureName}_cubit.dart`:
      fileContent = cubitFileContent(featureName, false);
      break;
    case `${featureName}_view.dart`:
      fileContent = viewFileContent(featureName);
      break;
    case `${featureName}_injection_container.dart`:
      fileContent = injectionContainerFileContent(featureName);
      break;
    case "main.dart":
      fileContent = mainDart();
      break;
    case "app.dart":
      fileContent = appDart();
      break;
    default:
      fileContent = "//! Your file content here.";
      break;
  }

  try {
    fs.writeFileSync(path, fileContent, { flag: "wx" });
  } catch (err) {
    // If file already exists or any other error occurs,
    // attempt to write with a different flag to overwrite it
    fs.writeFileSync(path, fileContent);
  }
}
