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
import loaderDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/common/loader.dart";
import noPageRouteDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/common/no_page_route.dart";
import customButtonDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/common/custom_widgets/custom_button.dart";
import customTextFormDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/common/custom_widgets/custom_text_form.dart";
import customSnackbarDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/common/custom_widgets/custom_snackbar.dart";
import settingHiveServiceDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/common/hive/hive_service/setting_hive_service.dart";
import appSettingsHiveModelDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/common/hive/app_settings_hive_model.dart";
import DioErrorInterceptorDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/connections/api/dio_error_interceptor.dart";
import hiveServiceDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/connections/hive/hive_service.dart";
import FailureDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/failure/error_handler.dart";
import intlEnArbTs from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/localization/l10n/intl_en.arb";
import allTextStylesDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/themes/text_themes/all_text_styles.dart";
import textThemesDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/themes/text_themes/text_themes.dart";
import appThemeDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/themes/app_theme.dart";
import useCaseDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/useCase/usecase.dart";
import allTextThemeExtensionDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/utils/extensions/all_text_theme_extension.dart";
import appTextThemeExtensionDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/utils/extensions/app_text_theme_extension.dart";
import connectivityCheckDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/utils/connectivity_check.dart";
import languageSelectorBottomSheetDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/utils/language_selector_bottom_sheet.dart";
import mainDiDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/di/main_di.dart";
import exportsDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/common/exports.dart";
import apiDart from "../feature/generate_clean_code_arch/helpers/file-content-generators/core/connections/api/api.dart";
import appLocales from "../feature/generate_clean_code_arch/helpers/file-content-generators/config/constants/locales/app_locales.dart";

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
    case `${featureName}_remote_data_source.dart`:
      fileContent = dataSourceFileContent(featureName, false, false);
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
    // --Locales
    case "app_locales.dart":
      fileContent = appLocales();
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
    // --Common
    // ---Loader
    case "loader.dart":
      fileContent = loaderDart();
      break;
    // ---No Page View
    case "no_page_view.dart":
      fileContent = noPageRouteDart();
      break;
    // ---Export
    case "exports.dart":
      fileContent = exportsDart();
      break;
    // --Custom Widgets
    // ----Custom Button
    case "custom_button.dart":
      fileContent = customButtonDart();
      break;
    // ----Custom Text Field
    case "custom_text_field.dart":
      fileContent = customTextFormDart();
      break;
    // ----Custom Snackbar
    case "custom_snackbar.dart":
      fileContent = customSnackbarDart();
      break;
    // ---Hive
    // ----Hive Service
    // -----Settings Hive Model
    case "app_settings_hive_model.dart":
      fileContent = appSettingsHiveModelDart();
      break;
    // ------Settings Hive Service
    case "settings_hive_service.dart":
      fileContent = settingHiveServiceDart();
      break;
    // --Connections
    // ---API
    // ----Dio Service
    case "dio_service.dart":
      fileContent = apiDart();
      break;
    // ----Dio Error Interceptor
    case "dio_error_interceptor.dart":
      fileContent = DioErrorInterceptorDart();
      break;
    // ---Hive
    // ----Hive Service
    case "hive_service.dart":
      fileContent = hiveServiceDart();
      break;
    // --Failure
    // ---Error Handler
    case "error_handler.dart":
      fileContent = FailureDart();
      break;
    // -Localization
    // --L10n
    // ---intl_en.arb
    case "intl_en.arb":
      fileContent = intlEnArbTs();
      break;
    // -Themes
    // --Text Theme
    // ---All Text Styles
    case "all_text_styles.dart":
      fileContent = allTextStylesDart();
      break;
    // ---Default Text Styles
    case "default_text_styles.dart":
      fileContent = textThemesDart();
      break;
    // --App Theme
    case "app_theme.dart":
      fileContent = appThemeDart();
      break;
    // -Usecase
    // --Usecase
    case "usecase.dart":
      fileContent = useCaseDart();
      break;
    // -Utils
    // --Extensions
    // ---All Text Style Extension
    case "all_text_style_extension.dart":
      fileContent = allTextThemeExtensionDart();
      break;
    // ---App Text Style Extension
    case "app_text_style_extension.dart":
      fileContent = appTextThemeExtensionDart();
      break;
    // --Connectivity Check
    case "connectivity_check.dart":
      fileContent = connectivityCheckDart();
      break;
    // --Language Selector Bottom Sheet
    case "language_selector_bottom_sheet.dart":
      fileContent = languageSelectorBottomSheetDart();
      break;
    // Features

    // DI
    // -Main DI
    case "main_di.dart":
      fileContent = mainDiDart();
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
