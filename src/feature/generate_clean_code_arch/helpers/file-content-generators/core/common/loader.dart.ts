export default function loaderDart() {
  return `
    
  import 'exports.dart';

// ! DO NOT MODIFY THIS FILE

/// Loader - A Custom Loading Indicator Widget for Flutter Applications.
///
/// This widget provides a visually appealing and customizable loading indicator,
/// encapsulating the CircularProgressIndicator within a styled container. It's designed
/// to present a consistent loading experience across the application.
///
/// The Loader is center-aligned and features a container with adjustable dimensions
/// and color, based on the current theme context (dark or light). It is ideal for
/// indicating loading or processing states in various parts of the application.
///
/// Design:
///   - The container has a fixed height and width of 120, adjustable using ScreenUtil.
///   - It features rounded corners with a radius of 20.
///   - The background color of the container changes based on the theme brightness:
///     - Light background for dark themes.
///     - Dark background for light themes.
///   - The CircularProgressIndicator is centrally aligned with a distinct yellow color and
///     a stroke width of 6 for clear visibility.
///   - Additional padding is provided below the indicator.
///
/// Usage:
/// Simply add the \`Loader\` widget to your widget tree where a loading indicator is needed.
/// For example, it can be used in a FutureBuilder while waiting for data or during
/// asynchronous operations.
///
///
/// Note: This loader is designed for ease of use and consistency. You can modify the size,
/// color, and other properties to better fit your application's design needs.

class Loader extends StatelessWidget {
  const Loader({
    super.key,
    this.opacity = 0.96,
  });

  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        height: 120.h,
        width: 120.h,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: PrimitiveColors.grey900.withOpacity(opacity),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              color: PrimitiveColors.primary500,
              strokeWidth: 6,
              strokeCap: StrokeCap.round,
              semanticsValue: 'Loading...',
              semanticsLabel: 'Loading...',
            ),
            SizedBox(height: 10),
          ],
        ),
      ),
    );
  }
}

    `;
}
