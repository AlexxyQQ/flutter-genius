# Changelog

All notable changes to Flutter Genius are documented here.

---

## [0.2.6] — 2026-02-27

### Added

- **Entity → Model settings** — six new settings under `flutterGenius.entityToModel.*` in `File > Preferences > Settings`:
  - `outputPath` — where the model file is written: `domainToData` (Clean Architecture default, `domain/entities → data/models`) or `sameDirectory` (next to the entity).
  - `autoConvertToFreezed` — whether plain entities are converted to Freezed: `always` (default), `ask` (QuickPick before converting), or `never` (skip conversion).
  - `fieldRename` — `@JsonSerializable` field rename strategy: `snake` (default), `none`, `pascal`, or `kebab`.
  - `explicitToJson` — whether to include `explicitToJson: true` in `@JsonSerializable` (default: `true`).
  - `generateListMappers` — whether to emit the `List<Model>.toEntities()` / `List<Entity>.toModels()` helper extensions (default: `true`).
  - `jsonKeyHelpers` — whether to add `@JsonKey(fromJson: ModelGeneratorHelper.generate...)` for `id`, `createdAt`, and `updatedAt` (default: `true`).

### Changed

- `freezed_model.ts` now accepts a `ModelGenerationOptions` object so all six of the above options flow through to the template. Defaults are backward-compatible — existing generated output is unchanged unless settings are modified.
- `generate_entity_to_model.ts` reads all settings from configuration at the start of each command invocation and passes them to the template; the `autoConvertToFreezed: "ask"` path shows an inline QuickPick.

---

## [0.2.5] — 2026-02-27

### Added

- **JSON Enum Generator command** (`Flutter Genius: Generate JSON Enum`) — converts a plain Dart enum into a fully wired `@JsonEnum` + `JsonConverter` pattern with a configurable multi-step QuickPick flow:
  - **@JsonValue case format**: snake_case (default), camelCase, SCREAMING_SNAKE_CASE, Title Case, or None.
  - **Converter toggle**: optionally skip the companion `EnumConverter` class entirely.
  - **Null handling**: return the first value, pick a specific default value, or return `null` (making the converter type nullable: `EnumName?`).
  - Existing non-`json_annotation` imports are preserved in the rewritten file.
  - Generated `toJson` in the converter delegates to the enum's own `toJson()` — no duplicated logic.
  - Available in the Command Palette and editor right-click menu for Dart files.

- **Extension settings** — all three JSON Enum Generator options are now configurable as persistent defaults in `File > Preferences > Settings` under **Flutter Genius**:
  - `flutterGenius.jsonEnum.caseFormat` — default @JsonValue case format (default: `snake_case`).
  - `flutterGenius.jsonEnum.generateConverter` — whether to generate a converter class by default (default: `true`).
  - `flutterGenius.jsonEnum.nullHandling` — default null-handling strategy (default: `firstValue`).
  - The QuickPick for each option shows the saved default at the top marked with **✦ saved default**.

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
