# Entity

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../../config/constants/enums/app/account_type_enum.dart';
import '../../../bank/domain/entities/bank_entity.dart';
import '../../../notification/domain/entities/notification_entity.dart';

part 'account_entity.freezed.dart';

@freezed
abstract class AccountEntity with _$AccountEntity {
  const factory AccountEntity({
    required String id,
    required String name,
    required bool isDefault,
    required AccountType type,
    required double startingAmount,
    required double currentAmount,
    String? description,
    String? accountNumber,
    BankEntity? bank,
    NotificationEntity? notification,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _AccountEntity;

  const AccountEntity._();
}


```

or

# Entity 2

```dart

class AccountEntity {
  AccountEntity({
    required this.id,
    required this.name,
    required this.isDefault,
    required this.type,
    required this.startingAmount,
    required this.currentAmount,
    this.description,
    this.accountNumber,
    this.bank,
    this.notification,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final bool isDefault;
  final AccountType type;
  final double startingAmount;
  final double currentAmount;
  final String? description;
  final String? accountNumber;
  final BankEntity? bank;
  final NotificationEntity? notification;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

```

# Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';
import '../../../../config/constants/enums/app/account_type_enum.dart';
import '../../../../core/common/data/models/helpers/model_generation_helper.dart';
import '../../../bank/data/models/bank_model.dart';
import '../../../notification/data/models/notification_model.dart';
import '../../domain/entities/account_entity.dart';

// TODO: Ensure all nested models are imported here

part 'account_model.freezed.dart';
part 'account_model.g.dart';

@freezed
abstract class AccountModel with _$AccountModel {
  const AccountModel._();

  @JsonSerializable(explicitToJson: true, fieldRename: FieldRename.snake)
  const factory AccountModel({
    @JsonKey(fromJson: ModelGeneratorHelper.generateUuidFromJson)
    required String id,
    required String name,
    required bool isDefault,
    @AccountTypeConverter() required AccountType type,
    required double startingAmount,
    required double currentAmount,
    String? description,
    String? accountNumber,
    BankModel? bank,
    NotificationModel? notification,
    @JsonKey(fromJson: ModelGeneratorHelper.generateCreatedAtFromJson)
    DateTime? createdAt,
    @JsonKey(fromJson: ModelGeneratorHelper.generateUpdatedAtFromJson)
    DateTime? updatedAt,
  }) = _AccountModel;

  factory AccountModel.fromJson(Map<String, dynamic> json) =>
      _$AccountModelFromJson(json);
}

// -----------------------------------------------------------------------------
// MODEL -> ENTITY
// -----------------------------------------------------------------------------
extension AccountModelMapper on AccountModel {
  AccountEntity toEntity() {
    return AccountEntity(
      id: id,
      name: name,
      isDefault: isDefault,
      type: type,
      description: description,
      startingAmount: startingAmount,
      currentAmount: currentAmount,
      accountNumber: accountNumber,
      bank: bank?.toEntity(),
      notification: notification?.toEntity(),
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

// -----------------------------------------------------------------------------
// ENTITY -> MODEL
// -----------------------------------------------------------------------------
extension AccountEntityMapper on AccountEntity {
  AccountModel toModel() {
    return AccountModel(
      id: id,
      name: name,
      isDefault: isDefault,
      type: type,
      description: description,
      startingAmount: startingAmount,
      currentAmount: currentAmount,
      accountNumber: accountNumber,
      bank: bank?.toModel(),
      notification: notification?.toModel(),
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

// -----------------------------------------------------------------------------
// HELPER MAPPERS
// -----------------------------------------------------------------------------
extension AccountModelListMapper on List<AccountModel> {
  List<AccountEntity> toEntities() => map((e) => e.toEntity()).toList();
}

extension AccountEntityListMapper on List<AccountEntity> {
  List<AccountModel> toModels() => map((e) => e.toModel()).toList();
}

```

I need to make a converter that will convert the entity to the model.
