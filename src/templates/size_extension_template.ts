export const APP_SIZE_EXTENSION_CONTENT = `import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

extension NumExtensionX on num {
  // --- VALUE CONVERTER ---
  /// Rounds the number to the nearest integer and ensures it's even by
  /// rounding up to the next even number if it's odd.
  double get _even {
    return toDouble();
  }

  // --- UI BORDERS & RADIUS ---
  /// Creates a \`RoundedRectangleBorder\` with a circular radius, ensuring the radius is an even number.
  ShapeBorder get roundShape =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(_even.r));

  /// Creates a \`BorderRadius\` with a circular radius for all corners, ensuring the radius is an even number.
  BorderRadius get borderCircular => BorderRadius.all(Radius.circular(_even.r));

  /// Creates a \`Radius.circular\`, ensuring the radius is an even number.
  Radius get circular => Radius.circular(_even.r);

  /// Creates a \`BorderRadius.circular\`, ensuring the radius is an even number.
  BorderRadiusGeometry get rounded => BorderRadius.circular(_even.r);

  /// Creates a \`BorderRadius\` with only the top corners rounded, ensuring the radius is an even number.
  BorderRadiusGeometry get roundedTop =>
      BorderRadius.vertical(top: Radius.circular(_even.r));

  /// Creates a \`BorderRadius\` with only the bottom corners rounded, ensuring the radius is an even number.
  BorderRadiusGeometry get roundedBottom =>
      BorderRadius.vertical(bottom: Radius.circular(_even.h));

  // --- UI PADDING & INSETS ---
  /// Creates an \`EdgeInsets.all\`, ensuring the value is an even number.
  EdgeInsets get allPadding => EdgeInsets.all(_even);

  /// Creates an \`EdgeInsets.only\` for the bottom, ensuring the value is an even number.
  EdgeInsets get bottomOnly => EdgeInsets.only(bottom: _even.h);

  /// Creates an \`EdgeInsets.only\` for the top, ensuring the value is an even number.
  EdgeInsets get topOnly => EdgeInsets.only(top: _even.h);

  /// Creates an \`EdgeInsets.only\` for the left, ensuring the value is an even number.
  EdgeInsets get leftOnly => EdgeInsets.only(left: _even.w);

  /// Creates an \`EdgeInsets.only\` for the right, ensuring the value is an even number.
  EdgeInsets get rightOnly => EdgeInsets.only(right: _even.w);

  /// Creates an \`EdgeInsets.symmetric\` for horizontal padding, ensuring the value is an even number.
  EdgeInsets get horizontalPadding => EdgeInsets.symmetric(horizontal: _even.w);

  /// Creates an \`EdgeInsets.symmetric\` for vertical padding, ensuring the value is an even number.
  EdgeInsets get verticalPadding => EdgeInsets.symmetric(vertical: _even.h);

  // --- UI SPACING ---
  /// Creates a \`SizedBox\` with a specified width, ensuring the width is an even number.
  SizedBox get horizontalGap => SizedBox(width: _even.w);

  /// Creates a \`SizedBox\` with a specified height, ensuring the height is an even number.
  SizedBox get verticalGap => SizedBox(height: _even.h);

  /// Alias for \`horizontalSpace\`.
  SizedBox get hBox => SizedBox(width: _even.h);

  /// Alias for \`verticalSpace\`.
  SizedBox get vBox => SizedBox(height: _even.w);

  // --- UTILITIES ---
  /// Returns the number if it's positive, otherwise returns 0.
  int get positiveOrZeroOnly {
    if (this < 0) {
      return 0;
    }
    return toInt();
  }

  /// Converts a double (e.g., 1.30) into a \`Duration\` of minutes and seconds.
  Duration get toDurationFromMinutes {
    final String timerString = toStringAsFixed(2);
    final int minutes = int.parse(timerString.split('.')[0]);
    final int seconds = int.parse(timerString.split('.')[1]);

    return Duration(minutes: minutes, seconds: seconds);
  }

  /// Formats the number as a timer string (e.g., "1\\n30s").
  String get toStringTimer {
    final int minutes = floor();
    final int seconds = ((this - minutes) * 60).round();

    final String result =
        '\${minutes == 0 ? '' : '\$minutes'}\\n'
        '\${seconds == 0 ? '' : '\${seconds}s'}';

    return result.trim();
  }

  /// Converts the number to a double with a specified precision.
  double toDoubleWithPrecision({int fractionDigits = 2}) {
    return double.parse(toStringAsFixed(fractionDigits));
  }
}
`;