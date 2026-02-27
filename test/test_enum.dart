// import 'package:json_annotation/json_annotation.dart';

// import '../../../core/common/presentation/views/components/app_color_component.dart';
// import '../colors/custom/custom_primitive_colors.dart';

// part 'application_status_enum.g.dart';

// @JsonEnum(alwaysCreate: true)
// enum EmployeeApplicationStatusEnum {
//   @JsonValue('pending')
//   pending,
//   @JsonValue('selected')
//   selected,
//   @JsonValue('rejected')
//   rejected,
//   @JsonValue('completed')
//   completed,
//   @JsonValue('discarded')
//   discarded,
//   @JsonValue('declined')
//   declined,
//   @JsonValue('confirmed')
//   confirmed,
//   @JsonValue('apple_pay')
//   applePay,
//   @JsonValue('google_pay')
//   googlePay;

//   String toJson() => _$EmployeeApplicationStatusEnumEnumMap[this]!;

//   static EmployeeApplicationStatusEnum? fromString(String? value) =>
//       values.firstWhere(
//         (element) => element.name.toLowerCase() == value?.toLowerCase(),
//         orElse: () => values.first,
//       );
// }

// class EmployeeApplicationStatusEnumConverter
//     implements JsonConverter<EmployeeApplicationStatusEnum, String?> {
//   const EmployeeApplicationStatusEnumConverter();

//   @override
//   EmployeeApplicationStatusEnum fromJson(String? json) {
//     if (json == null) {
//       return EmployeeApplicationStatusEnum.pending;
//     }
//     return EmployeeApplicationStatusEnum.values.firstWhere(
//       (e) => e.name.toLowerCase() == json.toLowerCase(),
//       orElse: () => EmployeeApplicationStatusEnum.pending,
//     );
//   }
// }
