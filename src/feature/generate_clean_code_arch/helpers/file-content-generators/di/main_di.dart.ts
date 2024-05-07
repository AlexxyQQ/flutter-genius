export default function mainDiDart() {
  return `
  import '../core/common/exports.dart';

final locator = GetIt.instance;

class MainDIContainer {
  void register() {
    // Default injection container
    locator.registerLazySingleton(() => NavigationService());
    locator.registerLazySingleton(() => SnackbarService());
    locator.registerLazySingleton(() => Api());
    locator.registerLazySingleton(() => SettingsHiveService());
    locator.registerLazySingleton(() => LocalAuthentication());
    locator.registerLazySingleton(() => I10n());
    locator.registerLazySingleton(
      () => LocaleCubit(
        settingsHiveService: locator<SettingsHiveService>(),
      ),
    );

    // Feature Containers
    //AuthenticationDIContainer().register();
  }
}

  `;
}
