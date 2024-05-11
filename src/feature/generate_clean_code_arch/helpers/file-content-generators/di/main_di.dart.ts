export default function mainDiDart() {
  return `
  import '../core/common/exports.dart';

final locator = GetIt.instance;

class MainDI {
  void register() {
    // Default injection container
    locator.registerLazySingleton(() => Api());
    locator.registerLazySingleton(() => HiveService());
    locator.registerLazySingleton(() => SettingsHiveService());
    locator.registerLazySingleton(() => I10n());
    locator.registerLazySingleton(
      () => LocaleCubit(
        settingsHiveService: locator<SettingsHiveService>(),
      ),
    );

    // Feature Containers
    //AuthenticationDI().register();
  }
}

  `;
}
