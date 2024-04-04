export default function routesDart() {
  return `
  import '../../core/common/exports.dart';

  class AppRoutes {
    // Initial Route
    static const String initialRoute = '/';
    static const String unknownRoute = '/unknown';
  
    // Example Routes
    static const String exampleRoute = '/example-page';
  
   // List of all routes
    static final Map<String, Widget Function(BuildContext)> routes = {
      initialRoute: (context) => const SplashView(),
    };
  }
  
    `;
}
