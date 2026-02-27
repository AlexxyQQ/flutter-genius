# Changelog

All notable changes to Flutter Genius are documented here.

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
