import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:json_annotation/json_annotation.dart';

// Note: Ensure you have your project-specific imports here
// import 'package:your_project/core/theme/app_colors.dart';
// import 'package:your_project/core/theme/app_text_styles.dart';
// import 'package:your_project/core/utils/extensions.dart';
// import 'package:your_project/core/widgets/app_text.dart';

part 'app_text_field.freezed.dart';
part 'app_text_field.g.dart';

// ===========================================================================
// Enums & Converters
// ===========================================================================

@JsonEnum(alwaysCreate: true)
enum AppInputTypeEnum {
  @JsonValue('text')
  text,

  @JsonValue('password')
  password,

  @JsonValue('search')
  search,

  @JsonValue('datePicker')
  datePicker,

  @JsonValue('dateRangePicker')
  dateRangePicker,

  @JsonValue('timePicker')
  timePicker,

  @JsonValue('number')
  number,

  @JsonValue('phone')
  phone,

  @JsonValue('email')
  email,

  @JsonValue('multiline')
  multiline;

  static AppInputTypeEnum fromString(String? value) =>
      AppInputTypeEnum.values.firstWhere(
        (element) => element.name.toLowerCase() == value?.toLowerCase(),
        orElse: () => AppInputTypeEnum.text,
      );
}

class AppInputTypeEnumConverter
    implements JsonConverter<AppInputTypeEnum, String?> {
  const AppInputTypeEnumConverter();

  @override
  AppInputTypeEnum fromJson(String? json) {
    if (json == null) {
      return AppInputTypeEnum.text;
    }
    return AppInputTypeEnum.values.firstWhere(
      (e) => e.name.toLowerCase() == json.toLowerCase(),
      orElse: () => AppInputTypeEnum.text,
    );
  }

  @override
  String? toJson(AppInputTypeEnum object) {
    return object.name;
  }
}

// ===========================================================================
// Theme Configuration (Freezed)
// ===========================================================================

@freezed
abstract class FormFieldTheme with _$FormFieldTheme {
  const FormFieldTheme._();

  factory FormFieldTheme({
    // --- Core Configuration ---
    @AppInputTypeEnumConverter()
    @Default(AppInputTypeEnum.text)
    AppInputTypeEnum inputType,
    Key? key,
    FocusNode? focusNode,
    TextEditingController? controller, 

    // --- Styling ---
    KAppColor? fillColor,
    TextStyle? contentStyle,
    TextStyle? hintTextStyle,
    TextStyle? labelTextStyle,
    TextStyle? titleStyle,
    TextStyle? errorTextStyle,

    // --- Borders ---
    BorderRadius? borderRadius,
    KAppColor? enabledBorderColor,
    KAppColor? focusedBorderColor,
    KAppColor? errorBorderColor,
    KAppColor? disabledBorderColor,
    KAppColor? fillDisabledColor,
    double? borderWidth,
    bool? noBorder,
    bool? isCustomBorder,

    // --- Layout & Icons ---
    EdgeInsetsGeometry? contentPadding,
    bool? isDense,
    KAppColor? iconColor,
    Widget? prefixIcon,
    Widget? suffixIcon,
    BoxConstraints? prefixIconConstraints,

    // --- Behavior ---
    bool? readOnly,
    bool? enableSuggestions,
    bool? autocorrect,
    bool? obscureText, 
    bool? enableIMEPersonalizedLearning,
    int? maxLines,
    int? minLines,
    int? maxLength,
    int? errorMaxLines,

    // --- Input Logic ---
    TextInputAction? inputAction,
    List<String>? autofillHints,
    List<TextInputFormatter>? inputFormatters,
    TextInputType? keyboardType,
    @Default('*') String obscuringCharacter,

    // --- Validation/Requirements ---
    @Default('*') String requiredCharacter,
    @Default(KAppColor(0xFFF44336)) KAppColor? requiredColor,

    // --- Date/Time Specifics ---
    DateTime? minDate,
    DateTime? maxDate,
  }) = _FormFieldTheme;

  // --- Computed Properties & Helpers ---

  TextInputType get effectiveKeyboardType {
    if (keyboardType != null) return keyboardType!;

    return switch (inputType) {
      AppInputTypeEnum.text ||
      AppInputTypeEnum.password ||
      AppInputTypeEnum.search => TextInputType.text,
      AppInputTypeEnum.email => TextInputType.emailAddress,
      AppInputTypeEnum.number => TextInputType.number,
      AppInputTypeEnum.phone => TextInputType.phone,
      AppInputTypeEnum.multiline => TextInputType.multiline,
      _ => TextInputType.text,
    };
  }

  bool get isObscured =>
      obscureText ?? (inputType == AppInputTypeEnum.password);

  bool get isReadOnly =>
      readOnly ??
      (inputType == AppInputTypeEnum.datePicker ||
          inputType == AppInputTypeEnum.dateRangePicker ||
          inputType == AppInputTypeEnum.timePicker);

  TextStyle get effectiveContentStyle =>
      contentStyle?.copyWith(color: isReadOnly ? disabledBorderColor : null) ??
      AppTextStyles.inputText.copyWith(
        color: isReadOnly ? disabledBorderColor : null,
      );

  KAppColor get effectiveEnabledBorderColor => isReadOnly
      ? (disabledBorderColor ?? AppColors.transparent)
      : (enabledBorderColor ?? AppColors.transparent);

  TextStyle get requiredTextStyle =>
      titleStyle?.copyWith(color: requiredColor) ??
      AppTextStyles.inputText.copyWith(color: requiredColor);
}

class FormStyles {
  static FormFieldTheme getTheme(FormFieldTheme? theme) {
    final defaultTheme = FormFieldTheme(
      fillColor: AppColors.background,
      contentStyle: AppTextStyles.inputText,
      hintTextStyle: AppTextStyles.inputHint,
      titleStyle: AppTextStyles.inputLabel,
      errorTextStyle: AppTextStyles.inputError,
      fillDisabledColor: AppColors.disabled,
      iconColor: AppColors.icon,
      isDense: true,
      borderRadius: 12.borderCircular,
      contentPadding: 10.allPadding,
      enabledBorderColor: AppColors.border,
      focusedBorderColor: AppColors.selectedBorder,
      errorBorderColor: AppColors.errorBorder,
      disabledBorderColor: AppColors.disabledBorder,
      borderWidth: 0,
      noBorder: false,
      errorMaxLines: 1,
      enableSuggestions: true,
      autocorrect: true,
      enableIMEPersonalizedLearning: true,
      maxLines: 1,
      readOnly: false, 
      obscuringCharacter: '●',
      prefixIconConstraints: const BoxConstraints(minWidth: 24, minHeight: 24),
    );

    if (theme == null) {
      return defaultTheme;
    }

    return defaultTheme.copyWith(
      inputType: theme.inputType,
      focusNode: theme.focusNode ?? defaultTheme.focusNode,
      controller: theme.controller ?? defaultTheme.controller,
      fillColor: theme.fillColor ?? defaultTheme.fillColor,
      fillDisabledColor: theme.fillDisabledColor ?? defaultTheme.fillDisabledColor,
      iconColor: theme.iconColor ?? defaultTheme.iconColor,
      prefixIcon: theme.prefixIcon ?? defaultTheme.prefixIcon,
      suffixIcon: theme.suffixIcon ?? defaultTheme.suffixIcon,
      prefixIconConstraints: theme.prefixIconConstraints ?? defaultTheme.prefixIconConstraints,
      isDense: theme.isDense ?? defaultTheme.isDense,
      contentStyle: theme.contentStyle ?? defaultTheme.contentStyle,
      hintTextStyle: theme.hintTextStyle ?? defaultTheme.hintTextStyle,
      labelTextStyle: theme.labelTextStyle ?? defaultTheme.labelTextStyle,
      titleStyle: theme.titleStyle ?? defaultTheme.titleStyle,
      errorTextStyle: theme.errorTextStyle ?? defaultTheme.errorTextStyle,
      borderRadius: theme.borderRadius ?? defaultTheme.borderRadius,
      enabledBorderColor: theme.enabledBorderColor ?? defaultTheme.enabledBorderColor,
      focusedBorderColor: theme.focusedBorderColor ?? defaultTheme.focusedBorderColor,
      errorBorderColor: theme.errorBorderColor ?? defaultTheme.errorBorderColor,
      disabledBorderColor: theme.disabledBorderColor ?? defaultTheme.disabledBorderColor,
      borderWidth: theme.borderWidth ?? defaultTheme.borderWidth,
      contentPadding: theme.contentPadding ?? defaultTheme.contentPadding,
      noBorder: theme.noBorder ?? defaultTheme.noBorder,
      isCustomBorder: theme.isCustomBorder ?? defaultTheme.isCustomBorder,
      enableSuggestions: theme.enableSuggestions ?? defaultTheme.enableSuggestions,
      autocorrect: theme.autocorrect ?? defaultTheme.autocorrect,
      enableIMEPersonalizedLearning: theme.enableIMEPersonalizedLearning ?? defaultTheme.enableIMEPersonalizedLearning,
      maxLines: theme.maxLines ?? defaultTheme.maxLines,
      minLines: theme.minLines ?? defaultTheme.minLines,
      maxLength: theme.maxLength ?? defaultTheme.maxLength,
      readOnly: theme.readOnly ?? defaultTheme.readOnly,
      inputAction: theme.inputAction ?? defaultTheme.inputAction,
      autofillHints: theme.autofillHints ?? defaultTheme.autofillHints,
      inputFormatters: theme.inputFormatters ?? defaultTheme.inputFormatters,
      keyboardType: theme.keyboardType ?? defaultTheme.keyboardType,
      obscureText: theme.obscureText ?? defaultTheme.obscureText,
      obscuringCharacter: theme.obscuringCharacter, 
      minDate: theme.minDate ?? defaultTheme.minDate,
      maxDate: theme.maxDate ?? defaultTheme.maxDate,
      errorMaxLines: theme.errorMaxLines ?? defaultTheme.errorMaxLines,
      requiredCharacter: theme.requiredCharacter,
      requiredColor: theme.requiredColor ?? defaultTheme.requiredColor,
    );
  }
}

// ===========================================================================
// Core Logic Widget (Stateful)
// ===========================================================================

class KTextFormField extends StatefulWidget {
  const KTextFormField({
    super.key,
    this.hintText,
    this.labelText,
    this.titleText,
    this.initialValue,
    this.noteText,
    this.controller,
    this.validator,
    this.onChanged,
    this.onSaved,
    this.onFieldSubmitted,
    this.onEditingComplete,
    this.onTap,
    this.theme,
    this.clear,
    this.isRequired = false,
  });

  final String? hintText;
  final String? labelText;
  final String? titleText;
  final String? noteText;
  final String? initialValue;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final void Function(dynamic)? onChanged;
  final void Function(String?)? onSaved;
  final void Function(String?)? onFieldSubmitted;
  final void Function()? onEditingComplete;
  final void Function()? onTap;
  final FormFieldTheme? theme;
  final bool? clear;
  final bool? isRequired;

  @override
  State<KTextFormField> createState() => _KTextFormFieldState();
}

class _KTextFormFieldState extends State<KTextFormField> {
  late final TextFieldControllerManager _controllerManager;
  late final PickerHandler _pickerHandler;
  late final FieldInteractionHandler _interactionHandler;

  FormFieldTheme get _theme => FormStyles.getTheme(widget.theme);

  @override
  void initState() {
    super.initState();
    _initializeManagers();
  }

  @override
  void didUpdateWidget(covariant KTextFormField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.clear == true) {
      _controllerManager.resetToInitial(widget.initialValue);
      _pickerHandler.setDatePickerDefaultIfNeeded(_theme);
    }
  }

  @override
  void dispose() {
    _controllerManager.dispose();
    _interactionHandler.dispose();
    super.dispose();
  }

  void _initializeManagers() {
    _controllerManager = TextFieldControllerManager(
      externalController: widget.controller,
      initialValue: widget.initialValue,
    );

    _pickerHandler = PickerHandler(
      controller: _controllerManager.controller,
      onChanged: widget.onChanged,
    );

    _interactionHandler = FieldInteractionHandler(
      controllerManager: _controllerManager,
    );

    // Set initial date picker value if needed
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _pickerHandler.setDatePickerDefaultIfNeeded(_theme);
    });
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: _interactionHandler.isPasswordObscured,
      builder: (context, isObscured, _) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: widget.titleText?.isNotEmpty ?? false
              ? CrossAxisAlignment.start
              : CrossAxisAlignment.center,
          children: [
            FieldHeader(
              titleText: widget.titleText,
              noteText: widget.noteText,
              isRequired: widget.isRequired,
              theme: _theme,
            ),
            _buildTextFormField(isObscured),
          ],
        );
      },
    );
  }

  Widget _buildTextFormField(bool isObscured) {
    return TextFormField(
      key: widget.key,
      autofillHints: _theme.autofillHints,
      readOnly: _getReadOnlyState(),
      controller: _controllerManager.controller,
      keyboardType: _theme.keyboardType,
      obscuringCharacter: _theme.obscuringCharacter,
      obscureText: _getObscureTextState(isObscured),
      inputFormatters: _theme.inputFormatters,
      enableSuggestions: _theme.enableSuggestions ?? true,
      autocorrect: _theme.autocorrect ?? true,
      textInputAction: _theme.inputAction,
      autovalidateMode: AutovalidateMode.onUserInteraction,
      enableIMEPersonalizedLearning:
          _theme.enableIMEPersonalizedLearning ?? true,
      style: _theme.effectiveContentStyle,
      focusNode: _controllerManager.getFocusNode(_theme),
      maxLines: _theme.maxLines,
      maxLength: _theme.maxLength,
      decoration: FieldDecorationBuilder.build(
        theme: _theme,
        hintText: widget.hintText,
        labelText: widget.labelText,
        isObscured: isObscured,
        textNotifier: _controllerManager.textNotifier,
        onTogglePassword: _interactionHandler.togglePasswordVisibility,
        onClearSearch: () => _handleSearchClear(),
      ),
      validator: widget.validator,
      onChanged: widget.onChanged,
      onSaved: widget.onSaved,
      onFieldSubmitted: widget.onFieldSubmitted,
      onEditingComplete: widget.onEditingComplete,
      onTap: _getEffectiveOnTap(),
      onTapOutside: _interactionHandler.handleTapOutside,
    );
  }

  bool _getReadOnlyState() {
    return (_theme.readOnly ?? false) ||
        _theme.inputType == AppInputTypeEnum.datePicker ||
        _theme.inputType == AppInputTypeEnum.dateRangePicker ||
        _theme.inputType == AppInputTypeEnum.timePicker;
  }

  bool _getObscureTextState(bool isObscured) {
    return _theme.inputAction == TextInputAction.done
        ? isObscured
        : (_theme.obscureText ?? false);
  }

  void Function()? _getEffectiveOnTap() {
    if (_theme.inputType == AppInputTypeEnum.datePicker) {
      return () =>
          _pickerHandler.selectDate(context, _theme, widget.initialValue);
    }
    if (_theme.inputType == AppInputTypeEnum.dateRangePicker) {
      return () => _pickerHandler.selectDateRange(context);
    }
    if (_theme.inputType == AppInputTypeEnum.timePicker) {
      return () => _pickerHandler.selectTime(context);
    }
    return widget.onTap;
  }

  void _handleSearchClear() {
    _controllerManager.controller.clear();
    widget.onChanged?.call('');
  }
}

// ===========================================================================
// Helper Widgets & Builders
// ===========================================================================

class FieldHeader extends StatelessWidget {
  const FieldHeader({
    required this.theme,
    super.key,
    this.titleText,
    this.noteText,
    this.isRequired,
  });

  final String? titleText;
  final String? noteText;
  final bool? isRequired;
  final FormFieldTheme theme;

  @override
  Widget build(BuildContext context) {
    if ((titleText?.isEmpty ?? true) && (noteText?.isEmpty ?? true)) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (titleText?.isNotEmpty ?? false) _buildTitleRow(context),
        if (noteText?.isNotEmpty ?? false) _buildNoteRow(),
      ],
    );
  }

  Widget _buildTitleRow(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: 4.h),
      child: Row(
        children: [
          Flexible(
            child: AppText(
              titleText!,
              style: theme.titleStyle ?? context.textStyles.inputLabel,
            ),
          ),
          if (isRequired == true) ...[
            SizedBox(width: 4.w),
            AppText(
              theme.requiredCharacter,
              style: theme.requiredTextStyle,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildNoteRow() {
    return Padding(
      padding: EdgeInsets.only(bottom: 4.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, size: 16.r, color: Colors.lime),
          SizedBox(width: 4.w),
          Expanded(child: AppText(noteText!)),
        ],
      ),
    );
  }
}

class FieldDecorationBuilder {
  static InputDecoration build({
    required FormFieldTheme theme,
    required String? hintText,
    required String? labelText,
    required bool isObscured,
    required ValueNotifier<String> textNotifier,
    required VoidCallback onTogglePassword,
    required VoidCallback onClearSearch,
  }) {
    return InputDecoration(
      contentPadding: theme.contentPadding,
      counterText: '',
      errorMaxLines: theme.errorMaxLines,
      fillColor: _getFillColor(theme),
      filled: theme.fillColor != null,
      hintText: hintText,
      hintStyle: theme.hintTextStyle,
      labelText: labelText,
      hintTextDirection: TextDirection.ltr,
      isDense: theme.isDense,
      prefixIcon: FieldIconBuilder.buildPrefixIcon(theme),
      suffixIcon: FieldIconBuilder.buildSuffixIcon(
        theme: theme,
        isObscured: isObscured,
        textNotifier: textNotifier,
        onTogglePassword: onTogglePassword,
        onClearSearch: onClearSearch,
      ),
      disabledBorder: _buildBorder(theme, theme.disabledBorderColor),
      enabledBorder: _buildBorder(theme, theme.effectiveEnabledBorderColor),
      focusedBorder: _buildBorder(theme, theme.focusedBorderColor),
      errorBorder: _buildBorder(theme, theme.errorBorderColor),
      focusedErrorBorder: _buildBorder(theme, theme.errorBorderColor),
      border: _buildBorder(theme, theme.enabledBorderColor),
    );
  }

  static Color? _getFillColor(FormFieldTheme theme) {
    return (theme.readOnly == true) ? theme.fillDisabledColor : theme.fillColor;
  }

  static InputBorder? _buildBorder(FormFieldTheme theme, Color? borderColor) {
    if (theme.noBorder ?? false) return InputBorder.none;

    return OutlineInputBorder(
      borderSide: BorderSide(
        color: borderColor ?? Colors.transparent,
        width: theme.borderWidth ?? 1.0,
      ),
      borderRadius: theme.borderRadius ?? 12.borderCircular,
    );
  }
}

class FieldIconBuilder {
  static Widget? buildPrefixIcon(FormFieldTheme theme) {
    if (theme.prefixIcon == null) return null;

    return Padding(
      padding: EdgeInsets.only(left: 12.w, top: 8.h, bottom: 8.h),
      child: theme.prefixIcon,
    );
  }

  static Widget? buildSuffixIcon({
    required FormFieldTheme theme,
    required bool isObscured,
    required ValueNotifier<String> textNotifier,
    required VoidCallback onTogglePassword,
    required VoidCallback onClearSearch,
  }) {
    Widget? icon;

    if (theme.inputAction == TextInputAction.search) {
      return _buildSearchClearButton(textNotifier, onClearSearch);
    }

    if (theme.inputAction == TextInputAction.done) {
      icon = _buildPasswordToggle(isObscured, theme, onTogglePassword);
    } else if (theme.inputType == AppInputTypeEnum.datePicker) {
      icon = theme.suffixIcon ??
          Icon(Icons.calendar_today_outlined, color: theme.iconColor, size: 20);
    } else {
      icon = theme.suffixIcon;
    }

    if (icon == null) {
      return null;
    }

    return Padding(
      padding: EdgeInsets.only(right: 12.w, top: 8.h, bottom: 8.h),
      child: icon,
    );
  }

  static Widget _buildSearchClearButton(
    ValueNotifier<String> textNotifier,
    VoidCallback onClear,
  ) {
    return Padding(
      padding: EdgeInsets.only(right: 12.w, top: 8.h, bottom: 8.h),
      child: ValueListenableBuilder<String>(
        valueListenable: textNotifier,
        builder: (context, text, child) {
          if (text.trim().isEmpty) return const SizedBox.shrink();

          return GestureDetector(
            onTap: onClear,
            child: const Icon(Icons.close_rounded, size: 20),
          );
        },
      ),
    );
  }

  static Widget _buildPasswordToggle(
    bool isObscured,
    FormFieldTheme theme,
    VoidCallback onToggle,
  ) {
    return GestureDetector(
      onTap: onToggle,
      child: Icon(
        isObscured ? Icons.visibility_off : Icons.visibility,
        color: theme.iconColor,
        size: 20,
      ),
    );
  }
}

// ===========================================================================
// Facade Widget (Public API)
// ===========================================================================

class AppTextField extends StatelessWidget {
  /// Base Private Constructor
  const AppTextField._({
    super.key,
    required this.inputType,
    this.controller,
    this.hintText,
    this.labelText,
    this.titleText,
    this.noteText,
    this.initialValue,
    this.validator,
    this.onChanged,
    this.onSaved,
    this.onFieldSubmitted,
    this.onEditingComplete,
    this.onTap,
    this.themeOverrides,
    this.isRequired = false,
    this.clear,
    // specific overrides
    this.prefixIcon,
    this.suffixIcon,
    this.maxLines,
    this.minLines,
    this.maxLength,
    this.textInputAction,
    this.keyboardType,
    this.minDate,
    this.maxDate,
    this.readOnly,
  });

  final AppInputTypeEnum inputType;
  final TextEditingController? controller;
  final String? hintText;
  final String? labelText;
  final String? titleText;
  final String? noteText;
  final String? initialValue;
  final String? Function(String?)? validator;
  final void Function(dynamic)? onChanged;
  final void Function(String?)? onSaved;
  final void Function(String?)? onFieldSubmitted;
  final void Function()? onEditingComplete;
  final void Function()? onTap;
  final FormFieldTheme? themeOverrides;
  final bool isRequired;
  final bool? clear;

  // Specific Style/Behavior Overrides
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final int? maxLines;
  final int? minLines;
  final int? maxLength;
  final TextInputAction? textInputAction;
  final TextInputType? keyboardType;
  final DateTime? minDate;
  final DateTime? maxDate;
  final bool? readOnly;

  // ===========================================================================
  // Factory Constructors
  // ===========================================================================

  /// 1. Standard Text Input
  factory AppTextField.text({
    Key? key,
    TextEditingController? controller,
    String? hintText,
    String? labelText,
    String? noteText,
    String? titleText,
    String? initialValue,
    bool isRequired = false,
    bool? readOnly,
    String? Function(String?)? validator,
    void Function(dynamic)? onChanged,
    void Function(String?)? onSaved,
    void Function(String?)? onFieldSubmitted,
    void Function()? onEditingComplete,
    void Function()? onTap,
    int? maxLines = 1,
    int? maxLength,
    Widget? prefixIcon,
    Widget? suffixIcon,
    bool? clear,
    FormFieldTheme? theme,
  }) {
    return AppTextField._(
      key: key,
      inputType: AppInputTypeEnum.text,
      controller: controller,
      hintText: hintText,
      labelText: labelText,
      noteText: noteText,
      titleText: titleText,
      initialValue: initialValue,
      isRequired: isRequired,
      readOnly: readOnly,
      validator: validator,
      onChanged: onChanged,
      onSaved: onSaved,
      onFieldSubmitted: onFieldSubmitted,
      onEditingComplete: onEditingComplete,
      onTap: onTap,
      maxLines: maxLines,
      maxLength: maxLength,
      prefixIcon: prefixIcon,
      suffixIcon: suffixIcon,
      clear: clear,
      themeOverrides: theme,
    );
  }

  /// 2. Password Input
  factory AppTextField.password({
    Key? key,
    TextEditingController? controller,
    String? hintText = 'Enter password',
    String? labelText,
    String? noteText,
    String? titleText = 'Password',
    bool isRequired = true,
    bool? readOnly,
    String? Function(String?)? validator,
    void Function(dynamic)? onChanged,
    void Function(String?)? onSaved,
    void Function(String?)? onFieldSubmitted,
    void Function()? onEditingComplete,
    TextInputAction textInputAction = TextInputAction.done,
    FormFieldTheme? theme,
  }) {
    return AppTextField._(
      key: key,
      inputType: AppInputTypeEnum.password,
      controller: controller,
      hintText: hintText,
      labelText: labelText,
      noteText: noteText,
      titleText: titleText,
      isRequired: isRequired,
      readOnly: readOnly,
      validator: validator,
      onChanged: onChanged,
      onSaved: onSaved,
      onFieldSubmitted: onFieldSubmitted,
      onEditingComplete: onEditingComplete,
      maxLines: 1,
      textInputAction: textInputAction,
      prefixIcon: const Icon(Icons.lock_outline),
      themeOverrides: theme,
    );
  }

  /// 3. Email Input
  factory AppTextField.email({
    Key? key,
    TextEditingController? controller,
    String? hintText = 'example@email.com',
    String? labelText,
    String? noteText,
    String? titleText = 'Email',
    String? initialValue,
    bool isRequired = false,
    bool? readOnly,
    String? Function(String?)? validator,
    void Function(dynamic)? onChanged,
    void Function(String?)? onSaved,
    void Function(String?)? onFieldSubmitted,
    void Function()? onEditingComplete,
    FormFieldTheme? theme,
  }) {
    return AppTextField._(
      key: key,
      inputType: AppInputTypeEnum.email,
      controller: controller,
      hintText: hintText,
      labelText: labelText,
      noteText: noteText,
      titleText: titleText,
      initialValue: initialValue,
      isRequired: isRequired,
      readOnly: readOnly,
      validator: validator,
      onChanged: onChanged,
      onSaved: onSaved,
      onFieldSubmitted: onFieldSubmitted,
      onEditingComplete: onEditingComplete,
      maxLines: 1,
      keyboardType: TextInputType.emailAddress,
      prefixIcon: const Icon(Icons.email_outlined),
      themeOverrides: theme,
    );
  }

  /// 4. Search Input
  factory AppTextField.search({
    Key? key,
    TextEditingController? controller,
    String? hintText = 'Search...',
    void Function(dynamic)? onChanged,
    VoidCallback? onEditingComplete,
    void Function(String?)? onFieldSubmitted,
    bool? clear,
    FormFieldTheme? theme,
  }) {
    return AppTextField._(
      key: key,
      inputType: AppInputTypeEnum.search,
      controller: controller,
      hintText: hintText,
      onChanged: onChanged,
      onEditingComplete: onEditingComplete,
      onFieldSubmitted: onFieldSubmitted,
      clear: clear,
      textInputAction: TextInputAction.search,
      prefixIcon: const Icon(Icons.search),
      themeOverrides: theme,
    );
  }

  /// 5. Number/Phone Input
  factory AppTextField.number({
    Key? key,
    TextEditingController? controller,
    String? hintText,
    String? titleText,
    String? initialValue,
    bool isPhone = false,
    bool isRequired = false,
    bool? readOnly,
    String? Function(String?)? validator,
    void Function(dynamic)? onChanged,
    void Function(String?)? onSaved,
    void Function(String?)? onFieldSubmitted,
    void Function()? onEditingComplete,
    int? maxLength,
    FormFieldTheme? theme,
  }) {
    return AppTextField._(
      key: key,
      inputType: isPhone ? AppInputTypeEnum.phone : AppInputTypeEnum.number,
      controller: controller,
      hintText: hintText,
      titleText: titleText,
      initialValue: initialValue,
      isRequired: isRequired,
      readOnly: readOnly,
      validator: validator,
      onChanged: onChanged,
      onSaved: onSaved,
      onFieldSubmitted: onFieldSubmitted,
      onEditingComplete: onEditingComplete,
      maxLines: 1,
      maxLength: maxLength,
      keyboardType: isPhone ? TextInputType.phone : TextInputType.number,
      themeOverrides: theme?.copyWith(
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      ),
    );
  }

  /// 6. Multiline/Area Input
  factory AppTextField.multiline({
    Key? key,
    TextEditingController? controller,
    String? hintText,
    String? titleText,
    String? initialValue,
    bool isRequired = false,
    bool? readOnly,
    String? Function(String?)? validator,
    void Function(dynamic)? onChanged,
    void Function(String?)? onSaved,
    int minLines = 3,
    int maxLines = 5,
    int? maxLength,
    FormFieldTheme? theme,
  }) {
    return AppTextField._(
      key: key,
      inputType: AppInputTypeEnum.multiline,
      controller: controller,
      hintText: hintText,
      titleText: titleText,
      initialValue: initialValue,
      isRequired: isRequired,
      readOnly: readOnly,
      validator: validator,
      onChanged: onChanged,
      onSaved: onSaved,
      minLines: minLines,
      maxLines: maxLines,
      maxLength: maxLength,
      keyboardType: TextInputType.multiline,
      textInputAction: TextInputAction.newline,
      themeOverrides: theme,
    );
  }

  /// 7. Date Picker
  factory AppTextField.datePicker({
    Key? key,
    TextEditingController? controller,
    String? hintText = 'Select Date',
    String? titleText,
    String? initialValue,
    bool isRequired = false,
    bool? readOnly = true,
    String? Function(String?)? validator,
    void Function(dynamic)? onChanged,
    void Function(String?)? onSaved,
    DateTime? minDate,
    DateTime? maxDate,
    FormFieldTheme? theme,
  }) {
    return AppTextField._(
      key: key,
      inputType: AppInputTypeEnum.datePicker,
      controller: controller,
      hintText: hintText,
      titleText: titleText,
      initialValue: initialValue,
      isRequired: isRequired,
      readOnly: readOnly,
      validator: validator,
      onChanged: onChanged,
      onSaved: onSaved,
      minDate: minDate,
      maxDate: maxDate,
      suffixIcon: const Icon(Icons.calendar_month),
      themeOverrides: theme,
    );
  }

  /// 8. Time Picker
  factory AppTextField.timePicker({
    Key? key,
    TextEditingController? controller,
    String? hintText = 'Select Time',
    String? titleText,
    String? initialValue,
    bool isRequired = false,
    bool? readOnly = true,
    String? Function(String?)? validator,
    void Function(dynamic)? onChanged,
    void Function(String?)? onSaved,
    FormFieldTheme? theme,
  }) {
    return AppTextField._(
      key: key,
      inputType: AppInputTypeEnum.timePicker,
      controller: controller,
      hintText: hintText,
      titleText: titleText,
      initialValue: initialValue,
      isRequired: isRequired,
      readOnly: readOnly,
      validator: validator,
      onChanged: onChanged,
      onSaved: onSaved,
      suffixIcon: const Icon(Icons.access_time),
      themeOverrides: theme,
    );
  }

  // ===========================================================================
  // Build Method
  // ===========================================================================

  @override
  Widget build(BuildContext context) {
    // 1. Start with the user provided theme or a fresh one
    final baseTheme = themeOverrides ?? FormFieldTheme();

    // 2. Merge factory-specific overrides into the theme
    final effectiveTheme = baseTheme.copyWith(
      inputType: inputType,
      prefixIcon: prefixIcon ?? baseTheme.prefixIcon,
      suffixIcon: suffixIcon ?? baseTheme.suffixIcon,
      maxLines: maxLines ?? baseTheme.maxLines,
      minLines: minLines ?? baseTheme.minLines,
      maxLength: maxLength ?? baseTheme.maxLength,
      inputAction: textInputAction ?? baseTheme.inputAction,
      keyboardType: keyboardType ?? baseTheme.keyboardType,
      readOnly: readOnly ?? baseTheme.readOnly,
      minDate: minDate ?? baseTheme.minDate,
      maxDate: maxDate ?? baseTheme.maxDate,
    );

    // 3. Return the heavy-lifter widget
    return KTextFormField(
      key: key, // Pass the key down
      controller: controller,
      initialValue: initialValue,
      hintText: hintText,
      labelText: labelText,
      noteText: noteText,
      titleText: titleText,
      isRequired: isRequired,
      validator: validator,
      onChanged: onChanged,
      onSaved: onSaved,
      onFieldSubmitted: onFieldSubmitted,
      onEditingComplete: onEditingComplete,
      onTap: onTap,
      clear: clear,
      theme: effectiveTheme.copyWith(readOnly: readOnly),
    );
  }
}