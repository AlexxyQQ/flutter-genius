export default function localeStateDart() {
  return `
    
import '../../common/exports.dart';

class LocaleState {
  final bool isLoading;
  final bool isSuccess;
  final AppErrorHandler? error;
  final List<Locale> locales;
  final Locale selectedLocale;
  LocaleState({
    required this.isLoading,
    required this.isSuccess,
    required this.error,
    required this.locales,
    required this.selectedLocale,
  });

  factory LocaleState.initial() {
    return LocaleState(
      isLoading: false,
      isSuccess: false,
      error: null,
      locales: [
        const Locale(
          'en',
          'English',
        ),
        //? Add your supported languages here
      ],
      selectedLocale: const Locale(
        'en',
        'English',
      ),
    );
  }

  LocaleState copyWith({
    bool? isLoading,
    bool? isSuccess,
    AppErrorHandler? error,
    List<Locale>? locales,
    Locale? selectedLocale,
  }) {
    return LocaleState(
      isLoading: isLoading ?? this.isLoading,
      isSuccess: isSuccess ?? this.isSuccess,
      error: error ?? this.error,
      locales: locales ?? this.locales,
      selectedLocale: selectedLocale ?? this.selectedLocale,
    );
  }

  @override
  String toString() {
    return 'LocaleState(isLoading: $isLoading, isSuccess: $isSuccess, error: $error, locales: $locales, selectedLocale: $selectedLocale)';
  }

  @override
  bool operator ==(covariant LocaleState other) {
    if (identical(this, other)) return true;

    return other.isLoading == isLoading &&
        other.isSuccess == isSuccess &&
        other.error == error &&
        listEquals(other.locales, locales) &&
        other.selectedLocale == selectedLocale;
  }

  @override
  int get hashCode {
    return isLoading.hashCode ^
        isSuccess.hashCode ^
        error.hashCode ^
        locales.hashCode ^
        selectedLocale.hashCode;
  }
}
`;
}
