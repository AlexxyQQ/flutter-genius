# Changelog

All notable changes to Flutter Genius are documented here.

---

## [0.2.4] — 2026-02-27

### Added

- **Class Separator command** (`Flutter Genius: Class Separator`) — splits any Dart file containing multiple classes, enums, or mixins into individual files via a QuickPick menu:
  - Pick one declaration to keep in the original file; all others are extracted.
  - "Extract all" option auto-detects the primary class from the file name (e.g. `test_entity.dart` → keeps `TestEntity`) and extracts everything else — no barrel file is generated.
  - Enums are routed to `lib/config/constants/enums/app_specifics/`.
  - **Auto-rename**: when extracting from an entity file, plain helper classes without an `Entity` suffix are automatically renamed (e.g. `class Address` → `class AddressEntity`, file `address_entity.dart`). All type references in rewritten files are updated accordingly.

- **Combined model generation**: when choosing "No" to file separation in the Entity → Model command, ALL classes in the file are now converted into a single combined model file — not just Entity-named classes. Cross-class field references are resolved (e.g. `Address primaryAddress` becomes `AddressModel primaryAddress`).

- `modelType` field on `FieldInfo`: explicit model-side type override for non-Entity-named sibling classes used in combined model generation.

### Fixed

- **`extractConstructorDefaults` truncation**: default values containing nested collections (e.g. `const ['a', 'b', 'c']`, `const [{'a': 1, 'b': 2}]`) were truncated at the first inner comma. Replaced `[^,)]+` regex with bracket-aware character scanning.

- **False declarations in Class Separator**: comments containing the word `class` (e.g. `// Deeply nested custom class`) caused the declaration regex to match across the newline and capture `final` as a phantom class name. Fixed by stripping single-line comments (preserving character positions) before running the regex.

- **"Extract all" destroying the original file**: selecting "Extract all" previously rewrote the original file as a barrel of `export` statements, making the primary entity inaccessible. The option now auto-detects the primary and preserves it in the original file.

---

## [0.2.3] — 2026-02-27

### Added

- **Entity → Model Generator** — fully rewritten from scratch with a clean, modular architecture:
  - `src/utils/dart_parser.ts` — parses Dart entity classes (both plain and Freezed).
  - `src/utils/enum_detector.ts` — workspace-aware enum detection with `JsonConverter` lookup.
  - `src/utils/file_manager.ts` — file I/O and relative import path resolution.
  - `src/utils/string_utils.ts` — `toSnakeCase` utility.
  - `src/templates/freezed_entity.ts` — generates a Freezed entity class in-place.
  - `src/templates/freezed_model.ts` — generates a full Freezed model with JSON serialization and bidirectional mappers.
  - `src/commands/generate_entity_to_model.ts` — orchestrates the 7-step conversion flow.

### Changed

- Command ID updated to `flutter-genius.generateEntityToModel`.
- Command is now available in the editor right-click context menu for Dart files.
- Model template now uses `@JsonSerializable(explicitToJson: true, fieldRename: FieldRename.snake)`.
- `@JsonKey(fromJson: ModelGeneratorHelper.generate...)` is automatically added for `id`, `createdAt`, and `updatedAt` fields.
- Enum fields with a detected `JsonConverter` class now receive the `@ConverterName()` annotation automatically.
- Nested entity fields are mapped recursively (`?.toEntity()` / `?.toModel()`) for both single objects and `List<>` / `Map<>` types.
- Plain (non-Freezed) entity classes are automatically converted to Freezed in-place before the model is generated.

---

## [0.2.2] — 2026-01-27

### Added

- Aggressive localization extractor: scan an entire folder and replace all hardcoded strings with `easy_localization` keys.
- `into_hardcoded_string.ts` command for reversing localization (useful for debugging).

### Changed

- Reduced output verbosity of the aggressive localization extractor.

---

## [0.2.1]

### Added

- BLoC generator via explorer right-click: scaffolds `bloc`, `event`, and `state` files with Freezed boilerplate.
- Enum to `@JsonEnum` converter command.
- Extract Classes command: splits a multi-class Dart file into individual files.

---

## [0.2.0]

### Added

- Size extension injector and UI refactor: converts `SizedBox`, `EdgeInsets`, and `BorderRadius` to fluent extension syntax.
- AppText localization extractor: scans `lib/` for `AppText("...")` and adds keys to `en-GB.json`.

---

## [0.1.0]

### Added

- Initial release.
- Basic entity-to-model mapper (first iteration).
