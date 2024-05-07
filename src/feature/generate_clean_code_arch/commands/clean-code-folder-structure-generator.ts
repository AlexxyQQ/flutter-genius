import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { writeToGeneratedFile } from "../../../utils/write-to-generated-file";

// Main function to create the structure.
export function createCleanCodeFeatureStructure(basePath: string) {
  const structure = {
    lib: {
      config: {
        constants: {
          api: { "api_endpoints_constants.dart": "" },
          colors: {
            "primitive_colors_constants.dart": "",
            "semantics_constants.dart": "",
          },
          hive: { "hive_table_constants.dart": "" },
          images: { "image_path_constants.dart": "" },
        },
        routes: { "routes.dart": "" },
      },
      core: {
        bloc: {
          "bloc_providers.dart": "",
          "bloc_observer.dart": "",
          locale: { "locale_cubit.dart": "", "locale_state.dart": "" },
        },
        common: {
          "loader.dart": "",
          "no_page_view.dart": "",
          "exports.dart": "",
          custom_widgets: {
            "custom_button.dart": "",
            "custom_text_field.dart": "",
            "custom_snackbar.dart": "",
          },
          hive: {
            hive_service: {
              "settings_hive_service.dart": "",
            },
            "app_settings_hive_model.dart": "",
          },
        },
        connections: {
          api: { "dio_service.dart": "", "dio_error_interceptor.dart": "" },
          hive: { "hive_service.dart": "" },
        },
        failure: { "error_handler.dart": "" },
        localization: {
          l10n: {
            "intl_en.arb": "",
          },
        },
        services: {
          "navigation_service.dart": "",
          "snackbar_service.dart": "",
        },
        themes: {
          text_theme: {
            "all_text_styles.dart": "",
            "default_text_styles.dart": "",
          },
          "app_theme.dart": "",
        },
        usecase: { "usecase.dart": "" },
        utils: {
          extensions: {
            "all_text_style_extension.dart": "",
            "app_text_style_extension.dart": "",
          },
          "connectivity_check.dart": "",
          "language_selector_bottom_sheet.dart": "",
        },
        "app.dart": "",
      },
      features: {},
      di: { "main_di.dart": "" },
      "main.dart": "",
    },
  };
  generateStructure(basePath, structure);
}

// Recursive function to generate the structure.
function generateStructure(basePath: string, structure: any) {
  Object.keys(structure).forEach((key) => {
    const contentPath = path.join(basePath, key);
    const content = structure[key];

    if (
      typeof content === "object" &&
      !Array.isArray(content) &&
      Object.keys(content).length > 0
    ) {
      // It's a directory with content, ensure the directory exists then recurse.
      if (!fs.existsSync(contentPath)) {
        fs.mkdirSync(contentPath, { recursive: true });
      }
      generateStructure(contentPath, content);
    } else if (content === "") {
      // It's a file marker, create the file if it doesn't exist.
      if (!fs.existsSync(contentPath)) {
        writeToGeneratedFile(contentPath, key, key);
      }
    }
  });
}
