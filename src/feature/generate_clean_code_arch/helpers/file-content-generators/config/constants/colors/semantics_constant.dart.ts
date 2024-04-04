export function semanticsConstantDart() {
  return `
  
import 'package:flutter/scheduler.dart';
import '../../../core/common/exports.dart';

class DarkSemantic {
  static const primary = PrimitiveColors.primary800;
  static const onPrimary = PrimitiveColors.primary200;
  static const primaryContainer = PrimitiveColors.primary300;
  static const onPrimaryContainer = PrimitiveColors.primary900;
  static const primaryFixed = PrimitiveColors.primary900;
  static const primaryFixedDim = PrimitiveColors.primary800;
  static const onPrimaryFixed = PrimitiveColors.primary100;
  static const onPrimaryFixedVariant = PrimitiveColors.primary300;
  static const secondary = PrimitiveColors.secondary800;
  static const onSecondary = PrimitiveColors.secondary200;
  static const secondaryContainer = PrimitiveColors.secondary300;
  static const onSecondaryContainer = PrimitiveColors.secondary900;
  static const secondaryFixed = PrimitiveColors.secondary900;
  static const secondaryFixedDim = PrimitiveColors.secondary800;
  static const onSecondaryFixed = PrimitiveColors.secondary100;
  static const onSecondaryFixedVariant = PrimitiveColors.secondary300;
  static const tertiary = PrimitiveColors.tertiary800;
  static const onTertiary = PrimitiveColors.tertiary200;
  static const tertiaryContainer = PrimitiveColors.tertiary300;
  static const onTertiaryContainer = PrimitiveColors.tertiary900;
  static const tertiaryFixed = PrimitiveColors.tertiary900;
  static const tertiaryFixedDim = PrimitiveColors.tertiary800;
  static const onTertiaryFixed = PrimitiveColors.tertiary100;
  static const onTertiaryFixedVariant = PrimitiveColors.tertiary300;
  static const error = PrimitiveColors.error800;
  static const onError = PrimitiveColors.error200;
  static const errorContainer = PrimitiveColors.error300;
  static const onErrorContainer = PrimitiveColors.error900;
  static const errorFixed = PrimitiveColors.error900;
  static const errorFixedDim = PrimitiveColors.error800;
  static const onErrorFixed = PrimitiveColors.error100;
  static const onErrorFixedVariant = PrimitiveColors.error300;
  static const surfaceDim = PrimitiveColors.grey200;
  static const surface = PrimitiveColors.grey60;
  static const surfaceBright = PrimitiveColors.grey240;
  static const surfaceContainerLowest = PrimitiveColors.grey40;
  static const surfaceContainerLow = PrimitiveColors.grey100;
  static const surfaceContainer = PrimitiveColors.grey120;
  static const surfaceContainerHigh = PrimitiveColors.grey170;
  static const surfaceContainerHighest = PrimitiveColors.grey220;
  static const onSurface = PrimitiveColors.grey900;
  static const onSurfaceVariant = PrimitiveColors.greyVariant800;
  static const outline = PrimitiveColors.greyVariant600;
  static const outlineVariant = PrimitiveColors.greyVariant300;
  static const inverseSurface = PrimitiveColors.grey900;
  static const inverseOnSurface = PrimitiveColors.grey200;
  static const inversePrimary = PrimitiveColors.primary400;
  static const scrim = PrimitiveColors.grey0;
  static const shadow = PrimitiveColors.grey0;
  static const background = PrimitiveColors.grey60;
  static const onBackground = PrimitiveColors.grey960;
}

class LightSemantic {
  static const primary = PrimitiveColors.primary500;
  static const onPrimary = PrimitiveColors.primary1000;
  static const primaryContainer = PrimitiveColors.primary900;
  static const onPrimaryContainer = PrimitiveColors.primary100;
  static const primaryFixed = PrimitiveColors.primary900;
  static const primaryFixedDim = PrimitiveColors.primary800;
  static const onPrimaryFixed = PrimitiveColors.primary100;
  static const onPrimaryFixedVariant = PrimitiveColors.primary300;
  static const secondary = PrimitiveColors.secondary500;
  static const onSecondary = PrimitiveColors.secondary1000;
  static const secondaryContainer = PrimitiveColors.secondary900;
  static const onSecondaryContainer = PrimitiveColors.secondary100;
  static const secondaryFixed = PrimitiveColors.secondary900;
  static const secondaryFixedDim = PrimitiveColors.secondary800;
  static const onSecondaryFixed = PrimitiveColors.secondary100;
  static const onSecondaryFixedVariant = PrimitiveColors.secondary300;
  static const tertiary = PrimitiveColors.tertiary500;
  static const onTertiary = PrimitiveColors.tertiary1000;
  static const tertiaryContainer = PrimitiveColors.tertiary900;
  static const onTertiaryContainer = PrimitiveColors.tertiary100;
  static const tertiaryFixed = PrimitiveColors.tertiary900;
  static const tertiaryFixedDim = PrimitiveColors.tertiary800;
  static const onTertiaryFixed = PrimitiveColors.tertiary100;
  static const onTertiaryFixedVariant = PrimitiveColors.tertiary300;
  static const error = PrimitiveColors.error500;
  static const onError = PrimitiveColors.error1000;
  static const errorContainer = PrimitiveColors.error900;
  static const onErrorContainer = PrimitiveColors.error100;
  static const errorFixed = PrimitiveColors.error900;
  static const errorFixedDim = PrimitiveColors.error800;
  static const onErrorFixed = PrimitiveColors.error100;
  static const onErrorFixedVariant = PrimitiveColors.error300;
  static const surfaceDim = PrimitiveColors.grey870;
  static const surface = PrimitiveColors.grey980;
  static const surfaceBright = PrimitiveColors.grey980;
  static const surfaceContainerLowest = PrimitiveColors.grey1000;
  static const surfaceContainerLow = PrimitiveColors.grey960;
  static const surfaceContainer = PrimitiveColors.grey940;
  static const surfaceContainerHigh = PrimitiveColors.grey920;
  static const surfaceContainerHighest = PrimitiveColors.grey900;
  static const onSurface = PrimitiveColors.grey100;
  static const onSurfaceVariant = PrimitiveColors.greyVariant300;
  static const outline = PrimitiveColors.greyVariant500;
  static const outlineVariant = PrimitiveColors.greyVariant800;
  static const inverseSurface = PrimitiveColors.grey200;
  static const inverseOnSurface = PrimitiveColors.grey950;
  static const inversePrimary = PrimitiveColors.primary800;
  static const scrim = PrimitiveColors.grey0;
  static const shadow = PrimitiveColors.grey0;
  static const background = PrimitiveColors.grey960;
  static const onBackground = PrimitiveColors.grey60;
}

class AppColors {
  final bool inverseDarkMode;

  AppColors({this.inverseDarkMode = false});
  final _isDarkMode =
      SchedulerBinding.instance.platformDispatcher.platformBrightness ==
          Brightness.dark;

  Color get background => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.background
      : LightSemantic.background;

  Color get onBackground => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onBackground
      : LightSemantic.onBackground;

  Color get error => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.error
      : LightSemantic.error;

  Color get onError => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onError
      : LightSemantic.onError;

  Color get errorContainer => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.errorContainer
      : LightSemantic.errorContainer;

  Color get onErrorContainer => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onErrorContainer
      : LightSemantic.onErrorContainer;

  Color get primary => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.primary
      : LightSemantic.primary;

  Color get onPrimary => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onPrimary
      : LightSemantic.onPrimary;

  Color get primaryContainer => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.primaryContainer
      : LightSemantic.primaryContainer;

  Color get onPrimaryContainer => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onPrimaryContainer
      : LightSemantic.onPrimaryContainer;

  Color get primaryFixed => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.primaryFixed
      : LightSemantic.primaryFixed;

  Color get primaryFixedDim => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.primaryFixedDim
      : LightSemantic.primaryFixedDim;

  Color get onPrimaryFixed => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onPrimaryFixed
      : LightSemantic.onPrimaryFixed;

  Color get onPrimaryFixedVariant => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onPrimaryFixedVariant
      : LightSemantic.onPrimaryFixedVariant;

  Color get secondary => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.secondary
      : LightSemantic.secondary;

  Color get onSecondary => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onSecondary
      : LightSemantic.onSecondary;

  Color get secondaryContainer => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.secondaryContainer
      : LightSemantic.secondaryContainer;

  Color get onSecondaryContainer => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onSecondaryContainer
      : LightSemantic.onSecondaryContainer;

  Color get secondaryFixed => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.secondaryFixed
      : LightSemantic.secondaryFixed;

  Color get secondaryFixedDim => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.secondaryFixedDim
      : LightSemantic.secondaryFixedDim;

  Color get onSecondaryFixed => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onSecondaryFixed
      : LightSemantic.onSecondaryFixed;

  Color get onSecondaryFixedVariant => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onSecondaryFixedVariant
      : LightSemantic.onSecondaryFixedVariant;

  Color get tertiary => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.tertiary
      : LightSemantic.tertiary;

  Color get onTertiary => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onTertiary
      : LightSemantic.onTertiary;

  Color get tertiaryContainer => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.tertiaryContainer
      : LightSemantic.tertiaryContainer;

  Color get onTertiaryContainer => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onTertiaryContainer
      : LightSemantic.onTertiaryContainer;

  Color get tertiaryFixed => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.tertiaryFixed
      : LightSemantic.tertiaryFixed;

  Color get tertiaryFixedDim => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.tertiaryFixedDim
      : LightSemantic.tertiaryFixedDim;

  Color get onTertiaryFixed => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onTertiaryFixed
      : LightSemantic.onTertiaryFixed;

  Color get onTertiaryFixedVariant => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onTertiaryFixedVariant
      : LightSemantic.onTertiaryFixedVariant;

  Color get surface => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.surface
      : LightSemantic.surface;

  Color get surfaceDim => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.surfaceDim
      : LightSemantic.surfaceDim;

  Color get surfaceBright => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.surfaceBright
      : LightSemantic.surfaceBright;

  Color get surfaceContainerLow => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.surfaceContainerLow
      : LightSemantic.surfaceContainerLow;

  Color get surfaceContainerLowest => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.surfaceContainerLowest
      : LightSemantic.surfaceContainerLowest;

  Color get surfaceContainer => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.surfaceContainer
      : LightSemantic.surfaceContainer;

  Color get surfaceContainerHigh => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.surfaceContainerHigh
      : LightSemantic.surfaceContainerHigh;

  Color get surfaceContainerHighest => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.surfaceContainerHighest
      : LightSemantic.surfaceContainerHighest;

  Color get onSurface => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onSurface
      : LightSemantic.onSurface;

  Color get onSurfaceVariant => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.onSurfaceVariant
      : LightSemantic.onSurfaceVariant;

  Color get outline => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.outline
      : LightSemantic.outline;

  Color get outlineVariant => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.outlineVariant
      : LightSemantic.outlineVariant;

  Color get inverseSurface => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.inverseSurface
      : LightSemantic.inverseSurface;

  Color get inverseOnSurface => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.inverseOnSurface
      : LightSemantic.inverseOnSurface;

  Color get inversePrimary => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.inversePrimary
      : LightSemantic.inversePrimary;

  Color get scrim => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.scrim
      : LightSemantic.scrim;

  Color get shadow => (_isDarkMode != inverseDarkMode)
      ? DarkSemantic.shadow
      : LightSemantic.shadow;
}
`;
}
