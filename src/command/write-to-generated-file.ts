import * as fs from "fs";

import { entityFileContent } from "../file-contents/entity-file-content";
import { modelFileContent } from "../file-contents/model-file-contents";
import { cubitFileContent } from "../file-contents/cubit-file-content";
import { dataSourceFileContent } from "../file-contents/data-source-file-content";
import { repositoryFileContent } from "../file-contents/repository-file-content";
import { viewFileContent } from "../file-contents/view-file-content";
import { injectionContainerFileContent } from "../file-contents/injection-container-file-contents";

export function writeToGeneratedFile(
  path: string,
  file: any,
  featureName: string
) {
  // for entity
  if (file === `${featureName}_entity.dart`) {
    var fileContent = entityFileContent(featureName);
    fs.writeFileSync(path, fileContent);
  }
  // for model
  if (file === `${featureName}_model.dart`) {
    var fileContent = modelFileContent(featureName, false);
    fs.writeFileSync(path, fileContent);
  }
  // for hive model
  if (file === `${featureName}_hive_model.dart`) {
    var fileContent = modelFileContent(featureName, true);
    fs.writeFileSync(path, fileContent);
  }
  // for hive service
  if (file === `${featureName}_hive_service.dart`) {
    var fileContent = dataSourceFileContent(featureName, false, true);
    fs.writeFileSync(path, fileContent);
  }
  // for local data source
  if (file === `${featureName}_local_data_source.dart`) {
    var fileContent = dataSourceFileContent(featureName, true, false);
    fs.writeFileSync(path, fileContent);
  }
  // for abstract repository
  if (file === `${featureName}_repository.dart`) {
    var fileContent = repositoryFileContent(featureName, true);
    fs.writeFileSync(path, fileContent);
  }
  // for repository impl
  if (file === `${featureName}_repository_impl.dart`) {
    var fileContent = repositoryFileContent(featureName, false);
    fs.writeFileSync(path, fileContent);
  }
  // for state
  if (file === `${featureName}_state.dart`) {
    var fileContent = cubitFileContent(featureName, true);
    fs.writeFileSync(path, fileContent);
  }
  // for cubit
  if (file === `${featureName}_cubit.dart`) {
    var fileContent = cubitFileContent(featureName, false);
    fs.writeFileSync(path, fileContent);
  }
  // for view
  if (file === `${featureName}_view.dart`) {
    var fileContent = viewFileContent(featureName);
    fs.writeFileSync(path, fileContent);
  }
  // for injection container
  if (file === `${featureName}_injection_container.dart`) {
    var fileContent = injectionContainerFileContent(featureName);
    fs.writeFileSync(path, fileContent);
  }
}
