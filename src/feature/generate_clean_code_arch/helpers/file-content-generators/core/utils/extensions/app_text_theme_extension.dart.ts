export default function appTextThemeExtensionDart() {
  return `import '../../common/exports.dart';

/// Extension on [TextTheme] to provide custom text styles for a Flutter app.
///
/// This extension adds custom styles to the standard Flutter text theme,
/// allowing for a consistent and easily manageable text styling throughout
/// the application. It includes styles for headings, body texts, and captions
/// in various weights and sizes.
///
/// Usage example:
/// \`\`\`dart
/// Text('Sample Text', style: Theme.of(context).textTheme.h1)
/// \`\`\`
extension AppCustomTextStyle on TextTheme {
  // Headings

  /// Custom style for heading 1.
  TextStyle get h1 => AllTextStyle.f36W7.copyWith(height: 1.3);

  /// Custom style for heading 2.
  TextStyle get h2 => AllTextStyle.f32W7.copyWith(height: 1.3);

  /// Custom style for heading 3.
  TextStyle get h3 => AllTextStyle.f28W7.copyWith(height: 1.3);

  /// Custom style for heading 4.
  TextStyle get h4 => AllTextStyle.f24W7.copyWith(height: 1.3);

  /// Custom style for heading 5.
  TextStyle get h5 => AllTextStyle.f20W7.copyWith(height: 1.3);

  /// Custom style for heading 6.
  TextStyle get h6 => AllTextStyle.f16W7.copyWith(height: 1.3);

  // Body Texts

  // Bold Body Texts
  TextStyle get bBL => AllTextStyle.f16W8;

  /// Bold Body Medium (Font Size: 14, Font Weight: 800).
  TextStyle get bBM => AllTextStyle.f14W8;
  TextStyle get bBS => AllTextStyle.f12W8;

  // Medium Body Texts
  TextStyle get mBL => AllTextStyle.f16W5;
  TextStyle get mBM => AllTextStyle.f14W5;
  TextStyle get mBS => AllTextStyle.f12W5;

  // Light Body Texts
  TextStyle get lBL => AllTextStyle.f16W3;
  TextStyle get lBM => AllTextStyle.f14W3;
  TextStyle get lBS => AllTextStyle.f12W3;

  // Captions

  // Bold Captions
  TextStyle get bC => AllTextStyle.f10W8;

  // Medium Captions
  TextStyle get mC => AllTextStyle.f10W5;

  // Light Captions
  TextStyle get lC => AllTextStyle.f10W3;
}
`;
}
