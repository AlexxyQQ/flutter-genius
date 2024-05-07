export default function hiveServiceDart() {
  return `import '../../common/exports.dart';

  /// A service class for initializing and managing Hive database operations.
  ///
  /// This class provides functionalities to initialize Hive, open Hive boxes,
  /// and manage other related operations. It's used to set up the local database
  /// for the application using Hive.
  class HiveService {
    /// Initializes the Hive database.
    ///
    /// This method sets up the Hive database by providing it with a path to store
    /// its data. It also initializes other services that depend on Hive.
    Future<void> init() async {
      // Initialize Hive. This is where you can initialize other Hive services.
      if (kIsWeb) {
        await Hive.initFlutter();
      } else {
        // Get the directory where the app can store its documents.
        final appDocumentDirectory = await getApplicationDocumentsDirectory();
        // Initialize Hive with the path to the app's document directory.
        Hive.init(appDocumentDirectory.path);
      }
  
      // Initialize other Hive services. This is where you can initialize
      await SettingsHiveService().init();
    }
  
    /// Opens a Hive box.
    ///
    /// Attempts to open a Hive box with the given [boxName]. If opening the box fails,
    /// it retries once and throws an error if it fails again.
    ///
    /// [boxName]: The name of the Hive box to be opened.
    ///
    /// Throws an exception if the box cannot be opened after two attempts.
    Future<void> hiveOpen(String boxName) async {
      await Hive.openBox(boxName).onError(
        (error, stackTrace) async {
          // Retry opening the box. If it fails again, throw an exception.
          await Hive.openBox(boxName);
          throw 'Failed to open $boxName BoxError: $error';
        },
      );
    }
  }
  `;
}
