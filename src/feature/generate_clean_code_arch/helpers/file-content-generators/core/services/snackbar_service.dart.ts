export default function snackbarServiceDart() {
  return `import '../common/exports.dart';

class SnackbarService {
  final GlobalKey<ScaffoldMessengerState> messengerKey =
      GlobalKey<ScaffoldMessengerState>();

  void showSnackbar({
    required String message,
    bool isError = false,
    Duration duration = const Duration(milliseconds: 1200),
    Color backgroundColor = LightSemantic.surfaceContainerLowest,
    Color textColor = LightSemantic.onSurface,
  }) {
    messengerKey.currentState!.removeCurrentSnackBar();
    messengerKey.currentState!.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isError ? AppColors().error : backgroundColor,
        elevation: 2,
        content: Text(
          message,
          style: AllTextStyle.f12W5.copyWith(
            color: isError ? AppColors().onError : textColor,
          ),
        ),
        duration: duration,
      ),
    );
  }
}
`;
}
