# Changelog

All notable changes to Flutter Genius are documented here.

---

## [0.2.6] — 2026-02-27

This release represents a massive overhaul of the Flutter Genius core, introducing a modular architecture for entity/model generation, smarter file manipulation, and deep JSON automation.

### Added

- **Entity → Model Generation (Full Rewrite)**: A new 7-step conversion flow that parses Dart entities and generates Freezed models with bidirectional mappers.
- **Recursive Mapping**: Automatically handles nested entities, lists, and maps (e.g., `?.toEntity()` / `?.toModel()`).
- **Smart Annotations**: Automatically adds `@JsonKey` helpers for `id`, `createdAt`, and `updatedAt`, and detects existing `JsonConverters` for enums.
- **In-place Conversion**: Plain Dart classes are automatically converted to Freezed before model generation.

- **Class Separator Command**: Splitting bloated Dart files into individual files via a QuickPick menu.
- Includes an **"Extract All"** mode that auto-detects the primary class and extracts the rest to the appropriate directory (e.g., enums to `lib/config/constants/enums/`).
- **Auto-rename**: Automatically appends "Entity" suffixes to helper classes and updates all references workspace-wide.

- **JSON Enum Generator**: Converts plain enums into `@JsonEnum` with a companion `JsonConverter`.
- Configurable via QuickPick for case formatting (snake, camel, etc.), null handling, and converter toggling.

- **Granular Extension Settings**: New persistent configuration options under `flutterGenius.*` for:
- **Entity/Model**: `outputPath`, `autoConvertToFreezed`, `fieldRename`, `explicitToJson`, `generateListMappers`, and `jsonKeyHelpers`.
- **JSON Enums**: Default case formats and null-handling strategies.

### Changed

- **Modular Architecture**: Introduced dedicated utilities for `dart_parser`, `enum_detector`, and `file_manager` to improve reliability.
- **Template Updates**: `freezed_model.ts` now supports a `ModelGenerationOptions` object for highly customized code generation.
- **Improved Context Menus**: Commands are now conveniently available via the editor right-click menu for all Dart files.

### Fixed

- **Bracket-Aware Parsing**: Fixed a bug where `extractConstructorDefaults` truncated nested collections (like lists or maps) at the first inner comma.
- **Phantom Class Detection**: Fixed a regex issue where comments containing the word "class" were incorrectly parsed as actual class declarations.
- **File Preservation**: Fixed "Extract All" behavior so it no longer overwrites the original file with barrel exports, preserving the primary entity instead.

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
