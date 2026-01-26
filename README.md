# FlutterGenius

## Description

FlutterGenius is a productivity extension for Flutter developers using **Clean Architecture** and **BLoC**. It automates repetitive boilerplate tasks such as generating data models from entities, creating BLoC structures with Freezed, extracting hardcoded strings for localization, and refactoring UI code for cleaner responsiveness.

## Features

- **Entity to Model Mapper**: Instantly generate a `Freezed` data model from a Clean Architecture `Entity` class.
- **Bloc Generator**: Create a full BLoC feature (Bloc, Event, State) using `Freezed` and `Equatable` via the context menu.
- **Smart Localization (AppText)**: Automatically extract strings wrapped in `AppText(...)` to your JSON translation file.
- **Aggressive Localization**: Select a folder to scan and extract _all_ hardcoded strings, converting them to `easy_localization` keys.
- **Size Extension & Refactor**: Auto-injects a responsive sizing extension and refactors your `SizedBox`, `Padding`, and `BorderRadius` code to use cleaner, fluent syntax.

---

## Usage

### 1. Entity to Model Mapper (Freezed)

Convert your Domain Entities into Data Models with zero typing.

1.  Open a Dart file containing your entity (e.g., `user_entity.dart`).
2.  Place your cursor anywhere inside the class definition.
3.  Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
4.  Run: **Dart: Generate Entity to Model**.

**What Happens:**

- Detects the class name (e.g., `UserEntity`).
- Creates a new file in `data/models/user_model.dart`.
- Generates `UserEntity` -> `UserModel` mapping logic (`toEntity`, `fromEntity`).
- Generates standard `Freezed` boilerplate (`fromJson`, `toJson`).

### 2. Create BLoC (Freezed)

Generate a complete BLoC structure with standard imports and boilerplate.

1.  Right-click on any folder in your file explorer.
2.  Select **Create BLoC (Freezed)**.
3.  Enter the name of your BLoC (e.g., `Login`).

**What Happens:**

- Creates a folder named `login_bloc`.
- Generates 3 files: `login_bloc.dart`, `login_event.dart`, and `login_state.dart`.
- Sets up `Equatable` for events and `Freezed` for state management.

### 3. Localization Extractor (AppText Only)

Ideal for maintaining existing projects using a custom `AppText` widget.

1.  Open the Command Palette.
2.  Run: **Dart: Extract AppText to Localization**.

**What Happens:**

- Scans `lib/` for usage of `AppText("String")`.
- Adds the key/value to `assets/translations/en-GB.json`.
- Replaces code with `AppText(LocaleKeys.generated_key)`.
- automatically runs `easy_localization:generate` to update your generated keys file.

### 4. Aggressive Localization (Targeted)

Best for localizing a new feature or cleaning up technical debt.

1.  Open the Command Palette.
2.  Run: **Dart: Extract Localization (Aggressive - Select Folder)**.
3.  Select the folder you want to clean (e.g., `lib/features/profile`).

**What Happens:**

- Scans **all** string literals (e.g., `'Profile'`, `"Settings"`).
- Intelligent filtering: Skips assets, imports, Map keys, and technical strings.
- Adds keys to `assets/translations/en-GB.json`.
- Replaces code with `LocaleKeys.generated_key.tr()`.

---

### 5. Smart Size Extensions & Refactor

**Refactor your entire codebase to use cleaner, fluent UI syntax.**

1.  Open the Command Palette.
2.  Run: **Flutter: Add Size Extension & Refactor UI**.

#### ⚠️ What will happen?

1.  **Dependency Check**: The extension checks `pubspec.yaml` for `flutter_screenutil`. If missing, it asks you to add it.
2.  **File Creation**: It creates a new file at:  
    `lib/core/common/presentation/extensions/size/app_size_extension.dart`  
    This file contains the logic for `.horizontalGap`, `.allPadding`, etc.
3.  **Global Scan**: It scans every `.dart` file in your `lib/` folder.
4.  **Refactoring**: It replaces verbose Flutter widgets with the new extension syntax.

#### 🔄 What exactly will change?

| Widget Type         | Before (Old Code)                                                 | After (Refactored Code) |
| :------------------ | :---------------------------------------------------------------- | :---------------------- |
| **Gaps (SizedBox)** | `SizedBox(width: 10)` <br> `SizedBox(width: 10.w)`                | `10.horizontalGap`      |
|                     | `SizedBox(height: 20)` <br> `SizedBox(height: 20.h)`              | `20.verticalGap`        |
| **Padding**         | `EdgeInsets.all(16)`                                              | `16.allPadding`         |
|                     | `EdgeInsets.symmetric(horizontal: 12)`                            | `12.horizontalPadding`  |
|                     | `EdgeInsets.symmetric(vertical: 8)`                               | `8.verticalPadding`     |
|                     | `EdgeInsets.only(bottom: 10)`                                     | `10.bottomOnly`         |
|                     | `EdgeInsets.only(top: 10)`                                        | `10.topOnly`            |
|                     | `EdgeInsets.only(left: 10)`                                       | `10.leftOnly`           |
|                     | `EdgeInsets.only(right: 10)`                                      | `10.rightOnly`          |
| **Border Radius**   | `BorderRadius.circular(15)`                                       | `15.rounded`            |
|                     | `Radius.circular(15)`                                             | `15.circular`           |
| **Shape**           | `RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))` | `12.roundShape`         |

> **Note**: The extension automatically adds the necessary import to `app_size_extension.dart` in every file it modifies.

---

## Requirements

To use the generated code effectively, your `pubspec.yaml` should include the following dependencies:

```yaml
dependencies:
  flutter_bloc: ^8.1.0
  freezed_annotation: ^2.4.0
  json_annotation: ^4.8.0
  equatable: ^2.0.5
  easy_localization: ^3.0.0
  flutter_screenutil: ^5.9.0

dev_dependencies:
  build_runner: ^2.4.0
  freezed: ^2.4.0
  json_serializable: ^6.7.0
```



Rule 1: Global Common Strings (Top Priority)

Condition: If a specific string (word or sentence) appears in two or more different Features (e.g., found in both Feature -> Profile and Feature -> Settings).

Action: Extract this string to the root-level common object.

JSON Structure:
JSON

{
  "common": {
    "words": {
      "save": "Save",
      "cancel": "Cancel"
    },
    "sentences": {
      "error_occurred": "An error occurred. Please try again."
    }
  }
}

Rule 2: Feature-Level Common Strings

Condition: If a specific string appears in multiple files, but ONLY within the same Feature (e.g., found in edit_profile.dart and profile_view.dart, both inside Feature -> Profile).

Action: Extract this string to a common object nested specifically inside that feature.

JSON Structure:
JSON

{
  "features": {
    "profile": {
      "common": {
        "sentences": {
          "edit_user_profile": "Edit User Profile"
        },
        "words": {
          "avatar": "Avatar"
        }
      },
      "screens": {
        // Specific strings that only appear in one file would go here
      }
    }
  }
}

Summary of Algorithm Flow

When processing a string found in the code, the script should follow this decision tree:

    Check Global Usage:

        Is this string used in Feature A AND Feature B?

        Yes: Place in root -> common.

        No: Proceed to step 2.

    Check Feature Usage:

        Is this string used in File 1 AND File 2 (both inside Feature A)?

        Yes: Place in features -> feature_a -> common.

        No: (It is unique to a single file) Place in features -> feature_a -> specific_screen.