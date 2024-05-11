# FlutterGenius

## Description

FlutterGenius is a powerful extension for Flutter developers that streamlines the process of creating clean code folder structures, adding new features with automated folder structure generation, and converting JSON data to Dart classes seamlessly. With FlutterGenius, you can boost your productivity and focus more on building amazing Flutter applications rather than spending time on repetitive tasks.

## Features

- **Clean Code Folder Structure**: Quickly create organized folder structures for your Flutter applications with just a few clicks.
- **Automated Feature Generation**: Add new features to your Flutter app effortlessly, and let FlutterGenius generate the necessary folder structure and files for you.\*\*\*\*
- **JSON to Dart Class Conversion**: Convert JSON data to Dart classes effortlessly, saving you time and effort in manual data modeling.

## Usage

1. **Clean Code Folder Structure**:

   - Open your Flutter project in Visual Studio Code.
   - Use the FlutterGenius command to create a clean code folder structure.

   #### NOTE:

   1. In `lib\core\common\export.dart` file change the `YOUR_PROJECT_NAME` to your project name.
   2. After creating the folder structure you must add the following lines to your `pubspec.yaml` file to use the generated folder structure.

   ```yaml
   #dependencies
   flutter_screenutil: ^5.9.0
   flutter_bloc: ^8.1.4
   flutter_svg: ^2.0.10+1
   hive_flutter: ^1.1.0
   path_provider: ^2.1.2
   get_it: ^7.6.7
   dartz: ^0.10.1
   flutter_localizations:
     sdk: flutter
   connectivity_plus: ^6.0.3
   intl: ^0.18.1
   pretty_dio_logger: ^1.3.1
   dio: ^5.4.3+1

   #dev_dependencies
   flutter_lints: ^3.0.2
   build_runner: ^2.4.8
   hive_generator: ^2.0.1
   flutter_gen: ^5.4.0

   # Add this at the end of the file
   flutter_intl:
     enabled: true
     class_name: I10n
     main_locale: en
     arb_dir: lib/core/localization/l10n
     output_dir: lib/core/localization/generated
   ```

2. **Automated Feature Generation**:

   - Open your Flutter project in Visual Studio Code.
   - Use the FlutterGenius command to add a new feature.
   - Follow the prompts to specify the feature details.
   - FlutterGenius will generate the necessary folder structure and files for the new feature automatically.

3. **JSON to Dart Class Conversion**:
   - Open your Flutter project in Visual Studio Code.
   - Use the FlutterGenius command to convert JSON data to Dart classes.
   - Paste your JSON data or provide the JSON file path.
   - FlutterGenius will generate Dart classes based on the JSON data.
