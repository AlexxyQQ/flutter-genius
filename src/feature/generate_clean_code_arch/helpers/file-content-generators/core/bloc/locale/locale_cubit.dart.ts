export default function localCubitDart() {
  return `
    import '../../common/exports.dart';
// Local Global Instance
final I10n i10n = locator<I10n>();
    
class LocaleCubit extends Cubit<LocaleState> {
  LocaleCubit({
    required this.settingsHiveService,
  }) : super(
          LocaleState.initial(),
        ) {
    getSavedLanguage();
  }
  final SettingsHiveService settingsHiveService;
  void changeLocale(Locale locale) async {
    emit(
      state.copyWith(
        selectedLocale: locale,
      ),
    );
    final settings = await settingsHiveService.getSettings();
    await settingsHiveService.updateSettings(
      settings.copyWith(
        languageCode: locale.languageCode,
        country: locale.countryCode,
      ),
    );
  }

  void getSavedLanguage() async {
    final settings = await settingsHiveService.getSettings();
    if (settings.languageCode == null) {
      emit(
        state.copyWith(
          selectedLocale: appLocales.first,
        ),
      );
    } else {
      emit(
        state.copyWith(
          selectedLocale: Locale(settings.languageCode!, settings.country!),
        ),
      );
    }
  }
}

    `;
}
