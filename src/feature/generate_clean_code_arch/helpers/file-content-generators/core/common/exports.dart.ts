export default function exportsDart(projectName: any) {
  return `
  export "package:dio/dio.dart";
export "package:pretty_dio_logger/pretty_dio_logger.dart";
export "package:${projectName}/config/constants/api/api_endpoints_constants.dart";
export 'dart:convert';
export 'package:connectivity_plus/connectivity_plus.dart';
export 'package:flutter/foundation.dart';
export 'package:flutter/material.dart';
export 'package:flutter/services.dart';
export 'package:flutter_bloc/flutter_bloc.dart';
export 'package:flutter_localizations/flutter_localizations.dart';
export 'package:flutter_screenutil/flutter_screenutil.dart';
export 'package:flutter_svg/flutter_svg.dart';
export 'package:get_it/get_it.dart';
export 'package:hive_flutter/hive_flutter.dart';
export 'package:path_provider/path_provider.dart';
export 'package:provider/provider.dart';
// 
// 
// CHANGE THE PACKAGE NAME
// 
// 
export 'package:${projectName}/config/constants/colors/primitive_colors_constants.dart';
export 'package:${projectName}/config/constants/colors/semantics_constants.dart';
export 'package:${projectName}/config/constants/hive/hive_table_constants.dart';
export 'package:${projectName}/config/constants/locales/app_locales.dart';
export 'package:${projectName}/config/routes/routes.dart';
export 'package:${projectName}/core/app.dart';
export 'package:${projectName}/core/bloc/bloc_observer.dart';
export 'package:${projectName}/core/bloc/bloc_providers.dart';
export 'package:${projectName}/core/bloc/locale/locale_cubit.dart';
export 'package:${projectName}/core/bloc/locale/locale_state.dart';
export 'package:${projectName}/core/common/custom_widgets/custom_button.dart';
export 'package:${projectName}/core/common/custom_widgets/custom_text_field.dart';
export 'package:${projectName}/core/common/hive/app_settings_hive_model.dart';
export 'package:${projectName}/core/common/hive/hive_service/settings_hive_service.dart';
export 'package:${projectName}/core/common/loader.dart';
export 'package:${projectName}/core/common/no_page_view.dart';
export 'package:${projectName}/core/connections/api/dio_error_interceptor.dart';
export 'package:${projectName}/core/connections/api/dio_service.dart';
export 'package:${projectName}/core/connections/hive/hive_service.dart';
export 'package:${projectName}/core/failure/error_handler.dart';
export 'package:${projectName}/core/localization/generated/l10n.dart';
export 'package:${projectName}/core/themes/app_theme.dart';
export 'package:${projectName}/core/themes/text_theme/all_text_styles.dart';
export 'package:${projectName}/core/themes/text_theme/default_text_styles.dart';
export 'package:${projectName}/core/useCase/usecase.dart';
export 'package:${projectName}/core/utils/extensions/all_text_style_extension.dart';
export 'package:${projectName}/core/utils/extensions/app_text_style_extension.dart';
export 'package:${projectName}/di/main_di.dart';
export 'package:${projectName}/features/splash/presentation/view/splash_view.dart';



    `;
}
