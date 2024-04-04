export default function blocProvidersDart() {
  return `
    import '../common/exports.dart';

class BlocProvidersList {
  static final blocList = [
    BlocProvider<LocaleCubit>(
      create: (context) => locator<LocaleCubit>(),
    ),
  ];
}

    `;
}
