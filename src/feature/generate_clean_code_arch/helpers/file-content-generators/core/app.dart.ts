export function appDart() {
  return `
  import 'common/exports.dart';

class App extends StatefulWidget {
  const App({super.key});

  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> {
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: BlocProvidersList.blocList,
      child: ScreenUtilInit(
        designSize: MediaQuery.of(context).size,
        minTextAdapt: true,
        splitScreenMode: true,
        builder: (_, child) {
          return BlocBuilder<LocaleCubit, LocaleState>(
            builder: (context, state) {
              return MaterialApp(
                scaffoldMessengerKey: locator<SnackbarService>().messengerKey,
                navigatorKey: locator<NavigationService>().navigatorKey,
                title: locator<I10n>().common_appName,
                debugShowCheckedModeBanner: false,
                locale: state.selectedLocale,
                localizationsDelegates: const [
                  I10n.delegate,
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                supportedLocales: I10n.delegate.supportedLocales,
                localeResolutionCallback: (deviceLocale, supportedLocales) {
                  if (supportedLocales
                      .map((e) => e.languageCode)
                      .contains(deviceLocale?.languageCode)) {
                    return deviceLocale;
                  } else {
                    return state.selectedLocale;
                  }
                },
                theme: AppTheme.appLightTheme(),
                themeMode: ThemeMode.light,
                routes: AppRoutes.routes,
              );
            },
          );
        },
      ),
    );
  }
}

  
            `;
}
