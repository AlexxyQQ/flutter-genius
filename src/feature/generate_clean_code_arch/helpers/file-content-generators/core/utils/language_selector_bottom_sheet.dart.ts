export default function languageSelectorBottomSheetDart() {
  return `import '../common/exports.dart';

Future<dynamic> languageSelectorBottomSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: AppColors().background,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.only(
        topLeft: Radius.circular(20.r),
        topRight: Radius.circular(20.r),
      ),
    ),
    builder: (context) {
      return BlocBuilder<LocaleCubit, LocaleState>(
        builder: (context, state) {
          return SizedBox(
            height: 200.h,
            child: Column(
              children: [
                Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      vertical: 20.h,
                    ),
                    child: Text(
                      i10n.language,
                      style: Theme.of(context).textTheme.h5.copyWith(
                            color: AppColors().onBackground,
                          ),
                    ),
                  ),
                ),
                const Divider(
                  color: DarkSemantic.surfaceDim,
                  height: 0,
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: state.locales.length,
                    itemBuilder: (context, index) {
                      return ListTile(
                        title: Text(
                          state.locales[index].countryCode ?? "",
                          style: Theme.of(context).textTheme.mBM.copyWith(
                                color: AppColors().onBackground,
                              ),
                        ),
                        onTap: () {
                          context
                              .read<LocaleCubit>()
                              .changeLocale(state.locales[index]);
                          Navigator.of(context).pop();
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
      );
    },
  );
}
`;
}
