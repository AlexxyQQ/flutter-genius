# Flutter Genius

A productivity extension for Flutter developers using **Clean Architecture** and **BLoC**. It automates repetitive boilerplate — generating data models from entities, creating BLoC structures, and more.

---

## Features

| Feature | Description |
|---|---|
| **Entity → Model** | Generate a full Freezed model from any entity class — with JSON serialization and bidirectional mappers |
| **Class Separator** | Split a multi-declaration Dart file into individual files with one click — enums, classes, and mixins each get their own file |
| **BLoC Generator** | Scaffold a complete BLoC feature (Bloc, Event, State) via the right-click menu |
| **Localization (AppText)** | Extract strings wrapped in `AppText(...)` to your JSON translation file |
| **Aggressive Localization** | Scan a folder and extract all hardcoded strings to `easy_localization` keys |
| **Size Extension** | Inject a responsive sizing extension and refactor `SizedBox`, `Padding`, and `BorderRadius` to fluent syntax |

---

## Requirements

Your `pubspec.yaml` should include:

```yaml
dependencies:
  freezed_annotation: ^2.4.0
  json_annotation: ^4.8.0
  flutter_bloc: ^8.1.0
  equatable: ^2.0.5
  easy_localization: ^3.0.0
  flutter_screenutil: ^5.9.0

dev_dependencies:
  build_runner: ^2.4.0
  freezed: ^2.4.0
  json_serializable: ^6.7.0
```

---

## Commands

### 1. Entity → Model Generator (Freezed)

Converts a Clean Architecture entity class into a complete Freezed data model with JSON serialization and bidirectional mapping extensions.

**How to use:**

1. Open any Dart file containing an entity class (e.g. `account_entity.dart`).
2. Place your cursor **anywhere inside** the class definition.
3. Run the command via either:
   - Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Flutter Genius: Generate Model from Entity**
   - Right-click inside the editor → **Flutter Genius: Generate Model from Entity**

**What gets generated:**

- A new model file at `data/models/<name>_model.dart` (path resolved automatically from `domain/entities/`).
- `@freezed` class with `@JsonSerializable(explicitToJson: true, fieldRename: FieldRename.snake)`.
- `@JsonKey(fromJson: ...)` helpers for `id`, `createdAt`, and `updatedAt` via `ModelGeneratorHelper`.
- `@ConverterName()` annotations for detected enum types that have a `JsonConverter`.
- `fromJson` factory.
- `toEntity()` extension on `ModelClass` with recursive nested mapping.
- `toModel()` extension on `EntityClass` with recursive nested mapping.
- `List<Model>.toEntities()` and `List<Entity>.toModels()` helper extensions.

> **Bonus:** If your entity is a plain Dart class (not yet Freezed), it is automatically converted to a Freezed entity in-place before the model is generated.

**Multi-class files:** If your entity file contains multiple classes or enums, the command asks whether you want to separate them first:
- **Yes** → separates all declarations into individual files, then generates the model for the primary entity.
- **No** → generates a single combined model file covering all classes in the file. Plain helper classes (e.g. `Address`) are automatically mapped to their model counterparts (`AddressModel`).

---

#### Test Class — Complex Example

Use the class below to test the command end-to-end. It exercises nested entities, enums, `DateTime`, nullable fields, and lists.

**Input — `account_entity.dart`** (place in `domain/entities/`):

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../../config/constants/enums/app/account_type_enum.dart';
import '../../../bank/domain/entities/bank_entity.dart';
import '../../../notification/domain/entities/notification_entity.dart';
import '../../../transaction/domain/entities/transaction_entity.dart';

part 'account_entity.freezed.dart';

@freezed
abstract class AccountEntity with _$AccountEntity {
  const AccountEntity._();

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
    List<TransactionEntity>? transactions,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _AccountEntity;
}
```

**Expected output — `account_model.dart`** (generated in `data/models/`):

```dart
import 'package:freezed_annotation/freezed_annotation.dart';
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
    List<TransactionModel>? transactions,
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
      startingAmount: startingAmount,
      currentAmount: currentAmount,
      description: description,
      accountNumber: accountNumber,
      bank: bank?.toEntity(),
      notification: notification?.toEntity(),
      transactions: transactions?.map((e) => e.toEntity()).toList(),
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
      startingAmount: startingAmount,
      currentAmount: currentAmount,
      description: description,
      accountNumber: accountNumber,
      bank: bank?.toModel(),
      notification: notification?.toModel(),
      transactions: transactions?.map((e) => e.toModel()).toList(),
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

// -----------------------------------------------------------------------------
// HELPER LIST MAPPERS
// -----------------------------------------------------------------------------
extension AccountModelListMapper on List<AccountModel> {
  List<AccountEntity> toEntities() => map((e) => e.toEntity()).toList();
}

extension AccountEntityListMapper on List<AccountEntity> {
  List<AccountModel> toModels() => map((e) => e.toModel()).toList();
}
```

After generating, run:

```bash
dart run build_runner build --delete-conflicting-outputs
```

---

### 2. Class Separator

Splits any Dart file containing multiple top-level declarations (classes, enums, mixins) into individual files.

**How to use:**

1. Open any Dart file with multiple declarations.
2. Run the command via:
   - Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Flutter Genius: Class Separator**
   - Right-click inside the editor → **Flutter Genius: Class Separator**
3. A QuickPick lists every declaration in the file. Pick one of:
   - A specific declaration → that one stays in the original file; all others are extracted.
   - **"Extract all into separate files"** → the primary class (auto-detected from the file name) stays in the original file; everything else is extracted.

**Routing rules:**

| Declaration | Destination |
|---|---|
| Enum | `lib/config/constants/enums/app_specifics/<snake_name>.dart` |
| Class / Mixin | Same directory as the original file, `<snake_name>.dart` |

**Auto-rename (entity files only):** When extracting from a file that already contains Entity-named classes, any plain helper class without an `Entity` suffix is automatically renamed on extraction:
- `class Address` → `class AddressEntity` in `address_entity.dart`
- All type references in every rewritten file are updated to match.

---

#### Test Class — Class Separator Example

Use the file below to test the separator end-to-end. It covers enums, nested entity classes, plain helper classes, complex default values, and nullable types.

```dart
enum AccountStatus { active, inactive, suspended, pending }

enum Role { admin, moderator, user, guest }

class TestEntity {
  final String id;
  final int age;
  final List<String> friends;
  final List<String>? defaultFriends;
  final Map<String, dynamic>? defaultGroup;
  final List<Map<String, dynamic>>? defaultListedGroup;
  final AccountStatus status;
  final AccountStatus defaultStatus;
  final SubEntity mainSubEntity;
  final SubEntity? optionalSubEntity;
  final Address primaryAddress;
  final Address? secondaryAddress;
  final ProfileSettingsEntity settings;
  final List<Address> pastAddresses;

  const TestEntity({
    required this.id,
    required this.age,
    required this.friends,
    this.defaultFriends = const ['a', 'b', 'c'],
    this.defaultGroup = const {'a': 1, 'b': 2, 'c': 3},
    this.defaultListedGroup = const [
      {'a': 1, 'b': 2, 'c': 3},
      {'d': 4, 'e': 5, 'f': 6},
    ],
    required this.status,
    this.defaultStatus = AccountStatus.pending,
    required this.mainSubEntity,
    this.optionalSubEntity,
    required this.primaryAddress,
    this.secondaryAddress,
    required this.settings,
    this.pastAddresses = const [],
  });
}

class SubEntity {
  final String subId;
  final bool isActive;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const SubEntity({
    required this.subId,
    required this.isActive,
    required this.createdAt,
    this.updatedAt,
  });
}

class ProfileSettingsEntity {
  final Role userRole;
  final bool emailNotificationsEnabled;
  // Deeply nested custom class
  final Address? billingAddress;

  const ProfileSettingsEntity({
    required this.userRole,
    this.emailNotificationsEnabled = true,
    this.billingAddress,
  });
}

class Address {
  final String street;
  final String city;
  final double latitude;
  final double longitude;
  final bool isVerified;

  const Address({
    required this.street,
    required this.city,
    required this.latitude,
    required this.longitude,
    this.isVerified = false,
  });
}
```

**Expected result when "Extract all" is chosen on `test_entity.dart`:**

| File | Contains |
|---|---|
| `test_entity.dart` | `TestEntity` (kept, imports updated) |
| `sub_entity.dart` | `SubEntity` |
| `profile_settings_entity.dart` | `ProfileSettingsEntity` |
| `address_entity.dart` | `AddressEntity` (renamed from `Address`) |
| `lib/config/constants/enums/app_specifics/account_status.dart` | `enum AccountStatus` |
| `lib/config/constants/enums/app_specifics/role.dart` | `enum Role` |

---

### 3. BLoC Generator (Freezed)


Scaffold a complete BLoC feature folder via the explorer right-click menu.

1. Right-click any folder in the file explorer.
2. Select **Create BLoC (Freezed)**.
3. Enter the feature name (e.g. `Login`).

**Creates:**
```
login_bloc/
├── login_bloc.dart
├── login_event.dart
└── login_state.dart
```

---

### 4. Localization Extractor (AppText)

Extract strings from a custom `AppText` widget into your JSON translation file.

1. Open the Command Palette.
2. Run **Dart: Extract AppText to Localization**.

- Scans `lib/` for `AppText("String")` usages.
- Adds key/value to `assets/translations/en-GB.json`.
- Replaces code with `AppText(LocaleKeys.generated_key)`.
- Runs `easy_localization:generate` automatically.

---

### 5. Aggressive Localization (Folder Scan)

Extract **all** hardcoded strings in a folder.

1. Open the Command Palette.
2. Run **Dart: Extract Localization (Aggressive - Select Folder)**.
3. Pick the folder to scan (e.g. `lib/features/profile`).

- Intelligently skips assets, imports, Map keys, and technical strings.
- Replaces with `LocaleKeys.generated_key.tr()`.

---

### 6. Size Extension & Refactor

Inject a responsive sizing extension and refactor verbose widget code to fluent syntax.

1. Open the Command Palette.
2. Run **Flutter: Add Size Extension & Refactor UI**.

| Before | After |
|---|---|
| `SizedBox(width: 10)` | `10.horizontalGap` |
| `SizedBox(height: 20)` | `20.verticalGap` |
| `EdgeInsets.all(16)` | `16.allPadding` |
| `EdgeInsets.symmetric(horizontal: 12)` | `12.horizontalPadding` |
| `EdgeInsets.symmetric(vertical: 8)` | `8.verticalPadding` |
| `EdgeInsets.only(bottom: 10)` | `10.bottomOnly` |
| `BorderRadius.circular(15)` | `15.rounded` |
| `RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))` | `12.roundShape` |

> The extension automatically adds the required import to every modified file.
