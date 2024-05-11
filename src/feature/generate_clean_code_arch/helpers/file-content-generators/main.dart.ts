export function mainDart() {
  return `
  import 'core/common/exports.dart';

  void main() async {
    WidgetsFlutterBinding.ensureInitialized();
    // Main Bloc observer initialization
    // ! Comment this line to disable bloc observer
    Bloc.observer = AppBlocObserver();
    // Main app dependency injection container initialization
    MainDI().register();
    // Hive initialization
    await HiveService().init();
    runApp(
      const App(),
    );
  }
  
            `;
}
