export default function settingHiveServiceDart() {
  return `
  import '../../exports.dart';

// ! DO NOT MODIFY THIS FILE
class SettingsHiveService {
  Future<void> init() async {
    await Hive.initFlutter();
    Hive.registerAdapter(AppSettingsHiveModelAdapter());
  }

  // ------------------ All Settings Queries ------------------ //

  Future<void> addSettings(AppSettingsHiveModel settings) async {
    var box = await Hive.openBox<AppSettingsHiveModel>(
      HiveTableConstant.appSettingsBox,
    );

    await box.put(0, settings);
  }

  Future<AppSettingsHiveModel> getSettings() async {
    var box = await Hive.openBox<AppSettingsHiveModel>(
      HiveTableConstant.appSettingsBox,
    );
    final data = box.values;
    if (data.isEmpty) {
      addSettings(AppSettingsHiveModel.empty());
      return AppSettingsHiveModel.empty();
    } else {
      return data.first;
    }
  }

  Future<void> updateSettings(AppSettingsHiveModel settings) async {
    var box = await Hive.openBox<AppSettingsHiveModel>(
      HiveTableConstant.appSettingsBox,
    );
    await box.putAt(0, settings);
  }

  Future<void> clearSettings() async {
    var box = await Hive.openBox<AppSettingsHiveModel>(
      HiveTableConstant.appSettingsBox,
    );
    await box.clear();
  }
}



    `;
}
