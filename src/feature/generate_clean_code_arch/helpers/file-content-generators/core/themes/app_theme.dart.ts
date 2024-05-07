export default function appThemeDart() {
  return `
  import '../common/exports.dart';
  
  class AppTheme {
    static appLightTheme() {
      return ThemeData(
        brightness: Brightness.light,
        useMaterial3: true,
        // Font Family
        // Text Theme
        fontFamily: 'Lexend',
  
        textTheme: KTextThemes.lightTextTheme().apply(
          displayColor: AppColors().onBackground,
          bodyColor: AppColors().onBackground,
          fontFamily: 'Lexend',
        ),
  
        // App Bar Theme
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors().surfaceDim,
          elevation: 0,
          scrolledUnderElevation: 0,
          toolbarHeight: 50.h,
          iconTheme: IconThemeData(
            color: AppColors().onBackground,
          ),
        ),
        // Scaffold Background Color
        scaffoldBackgroundColor: AppColors().background,
        // Elevated Button Theme
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            foregroundColor: AppColors().onSurface,
            backgroundColor: AppColors().surface,
            textStyle: AllTextStyle.f16W8.copyWith(
              color: AppColors().onSurface,
            ),
            minimumSize: const Size(100, 30),
            maximumSize: const Size(400, 60),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            animationDuration: const Duration(milliseconds: 150),
          ),
        ),
        // Scrollbar Theme
        scrollbarTheme: ScrollbarThemeData(
          thumbColor: MaterialStateProperty.all(PrimitiveColors.primary550),
          trackColor: MaterialStateProperty.all(AppColors().onSurfaceVariant),
          interactive: true,
          thumbVisibility: MaterialStateProperty.all(true),
          radius: const Radius.circular(12),
          trackVisibility: MaterialStateProperty.all(false),
        ),
        // Drawer Theme
        drawerTheme: DrawerThemeData(
          elevation: 0,
          backgroundColor: AppColors().surface,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.only(
              topRight: Radius.circular(12),
              bottomRight: Radius.circular(12),
            ),
          ),
        ),
  
        // Text Button Theme
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            textStyle: AllTextStyle.f16W8.copyWith(
              color: AppColors().onSurface,
            ),
            elevation: 5,
            backgroundColor: Colors.transparent,
          ),
        ),
        iconTheme: IconThemeData(
          color: AppColors().onSurface,
        ),
        primaryIconTheme: IconThemeData(
          color: AppColors().primary,
        ),
      );
    }
  }
  `;
}
