export default function textThemesDart() {
  return `import '../../common/exports.dart';

  class KTextThemes {
    // Styles for body text
    static TextStyle bodyLarge = TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.15,
      color: AppColors().onBackground,
    );
  
    static TextStyle bodyMedium = TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.15,
      color: AppColors().onBackground,
    );
  
    static TextStyle bodySmall = TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.15,
      color: AppColors().onBackground,
    );
  
    // Styles for headings
    static TextStyle headingLarge = TextStyle(
      fontSize: 26,
      fontWeight: FontWeight.w900,
      letterSpacing: 0.15,
      color: AppColors().onBackground,
    );
  
    static TextStyle headingMedium = TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.15,
      color: AppColors().onBackground,
    );
  
    static TextStyle headingSmall = TextStyle(
      fontSize: 22,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.15,
      color: AppColors().onBackground,
    );
  
    // Styles for captions
    static TextStyle captionLarge = TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.15,
      color: AppColors().onBackground,
    );
  
    static TextStyle captionMedium = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.15,
      color: AppColors().onBackground,
    );
  
    static TextStyle captionSmall = TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      letterSpacing: 0.15,
      color: AppColors().onBackground,
    );
  
    static TextTheme lightTextTheme() {
      return TextTheme(
        bodyLarge: bodyLarge,
        bodyMedium: bodyMedium,
        bodySmall: bodySmall,
        headlineLarge: headingLarge,
        headlineMedium: headingMedium,
        headlineSmall: headingSmall,
        labelLarge: captionLarge,
        labelMedium: captionMedium,
        labelSmall: captionSmall,
      ).apply(
        displayColor: AppColors().onBackground,
        bodyColor: AppColors().onBackground,
      );
    }
  }
  `;
}
