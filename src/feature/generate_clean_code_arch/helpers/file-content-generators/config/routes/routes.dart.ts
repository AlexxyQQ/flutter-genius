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
  
  
  // onGenerateRoute
  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    if (routes.containsKey(settings.name)) {
      // Get the function to create the route
      final routeBuilder = routes[settings.name];
      return MaterialPageRoute(builder: (context) => routeBuilder!(context));
    } else {
      // If the route is not found, navigate to unknownRoute
      return MaterialPageRoute(
        builder: (context) => const NoRoutePage(),
      );
    }
  }
}
    `;
}
