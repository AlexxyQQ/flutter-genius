import * as fs from "fs";

import { appDart } from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/app.dart";
import { mainDart } from "../feature/generate_clean_code_arch/helpers/file-content-generators/main.dart";
import { cubitFileContent } from "../feature/add_feature/helpers/file-content-generators/cubit-file-content";
import { dataSourceFileContent } from "../feature/add_feature/helpers/file-content-generators/data-source-file-content";
import { entityFileContent } from "../feature/add_feature/helpers/file-content-generators/entity-file-content";
import { injectionContainerFileContent } from "../feature/add_feature/helpers/file-content-generators/injection-container-file-contents";
import { modelFileContent } from "../feature/add_feature/helpers/file-content-generators/model-file-contents";
import { repositoryFileContent } from "../feature/add_feature/helpers/file-content-generators/repository-file-content";
import { viewFileContent } from "../feature/add_feature/helpers/file-content-generators/view-file-content";
import apiEndpointsConstantsDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/config/constants/api/api_endpoints_constants.dart";
import blocObserverDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/bloc/bloc_observer.dart";
import routesDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/config/routes/routes.dart";
import blocProvidersDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/bloc/bloc_providers.dart";
import hiveTableConstantDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/config/constants/hive/hive_table_constants.dart";
import imagePathConstantsDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/config/constants/images/image_path_constants.dart";
import { primitiveColorConstantDart } from "../feature/generate_clean_code_arch/helpers/file-content-generators/config/constants/colors/primitive_colors_constant.dart";
import { semanticsConstantDart } from "../feature/generate_clean_code_arch/helpers/file-content-generators/config/constants/colors/semantics_constant.dart";
import localeStateDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/bloc/locale/locale_state.dart";
import localeCubitDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/bloc/locale/locale_cubit.dart";

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
    // Config
    // -Constants
    // --API
    case "api_endpoints_constants.dart":
      fileContent = apiEndpointsConstantsDart();
      break;
    // --Colors
    case "primitive_colors_constants.dart":
      fileContent = primitiveColorConstantDart();
      break;
    case "semantics_constants.dart":
      fileContent = semanticsConstantDart();
      break;
    // --Hive
    case "hive_table_constants.dart":
      fileContent = hiveTableConstantDart();
      break;
    // --Images
    case "image_path_constants.dart":
      fileContent = imagePathConstantsDart();
      break;
    // -Routes
    case "routes.dart":
      fileContent = routesDart();
      break;
    //Core
    case "app.dart":
      fileContent = appDart();
      break;
    // -Bloc
    case "bloc_observer.dart":
      fileContent = blocObserverDart();
      break;
    case "bloc_providers.dart":
      fileContent = blocProvidersDart();
      break;
    // --Locale
    case "locale_state.dart":
      fileContent = localeStateDart();
      break;
    case "locale_cubit.dart":
      fileContent = localeCubitDart();
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
