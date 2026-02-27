/**
 * generate_json_enum.ts
 * ----------------
 * VSCode command: "flutter-genius.generateJsonEnum"
 *
 * Converts a plain Dart enum into a JSON-serializable enum with configurable:
 *   - @JsonValue case format (snake_case, camelCase, SCREAMING_SNAKE_CASE, Title Case, none)
 *   - Optional companion EnumConverter class
 *   - Null handling strategy in the converter
 *
 * The command rewrites the current file in-place.
 * Any existing imports (other than `json_annotation`) are preserved.
 *
 * After running, execute:
 *   dart run build_runner build --delete-conflicting-outputs
 */

import * as vscode from "vscode";
import * as path from "path";
import { getAllDeclarations, extractImports, DeclarationInfo } from "../utils/dart_parser";
import { writeFile } from "../utils/file_manager";
import {
  generateJsonEnumContent,
  JsonEnumOptions,
  JsonValueCase,
  NullHandling,
} from "../templates/json_enum";

// ---------------------------------------------------------------------------
// Command Entry Point
// ---------------------------------------------------------------------------

/**
 * Main command handler. Registered as "flutter-genius.generateJsonEnum".
 */
export async function generateJsonEnumCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Open a Dart file containing an enum.");
    return;
  }

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const text = document.getText();

  // ── Step 1: Find all enums in the file ──────────────────────────────────
  const declarations = getAllDeclarations(text);
  const enums = declarations.filter((d) => d.type === "enum");

  if (enums.length === 0) {
    vscode.window.showErrorMessage("No enums found in this file.");
    return;
  }

  // ── Step 2: Resolve which enum to convert ───────────────────────────────
  let targetEnum: DeclarationInfo;

  if (enums.length === 1) {
    targetEnum = enums[0];
  } else {
    const cursorOffset = document.offsetAt(editor.selection.active);
    const atCursor = enums.find(
      (e) => e.start <= cursorOffset && cursorOffset <= e.end,
    );

    if (atCursor) {
      targetEnum = atCursor;
    } else {
      const choice = await vscode.window.showQuickPick(
        enums.map((e) => ({
          label: `$(symbol-enum)  ${e.name}`,
          description: e.body.includes("@JsonEnum")
            ? "already has @JsonEnum — will regenerate"
            : "plain enum",
          value: e,
        })),
        {
          title: "Flutter Genius: JSON Enum Generator",
          placeHolder: "Select the enum to convert",
          ignoreFocusOut: true,
        },
      );
      if (!choice) return;
      targetEnum = choice.value;
    }
  }

  // ── Step 3: Confirm if already converted ────────────────────────────────
  if (targetEnum.body.includes("@JsonEnum")) {
    const confirm = await vscode.window.showWarningMessage(
      `"${targetEnum.name}" already has @JsonEnum. Regenerate?`,
      { modal: false },
      "Yes",
    );
    if (confirm !== "Yes") return;
  }

  // ── Step 4: Extract enum values ─────────────────────────────────────────
  const enumValues = extractEnumValues(targetEnum.body);
  if (enumValues.length === 0) {
    vscode.window.showErrorMessage(
      `No values found in enum "${targetEnum.name}". Make sure the enum has at least one value.`,
    );
    return;
  }

  // ── Step 5: Read saved settings (used as defaults in QuickPick) ─────────
  const cfg = vscode.workspace.getConfiguration("flutterGenius");
  const savedCaseFormat = cfg.get<JsonValueCase>("jsonEnum.caseFormat", "snake_case");
  const savedGenerateConverter = cfg.get<boolean>("jsonEnum.generateConverter", true);
  const savedNullHandling = cfg.get<NullHandling>("jsonEnum.nullHandling", "firstValue");

  // Helper: marks the saved-default item so it floats to the top.
  function withSaved<T extends { value: U }, U>(
    items: T[],
    savedValue: U,
  ): T[] {
    return [
      ...items
        .filter((i) => i.value === savedValue)
        .map((i) => ({ ...i, description: (i as { description?: string }).description + "  ✦ saved default" })),
      ...items.filter((i) => i.value !== savedValue),
    ];
  }

  // ── Step 6: Pick @JsonValue case format ─────────────────────────────────
  const caseItems = withSaved(
    [
      {
        label: "$(symbol-misc)  snake_case",
        description: "applePay → 'apple_pay'",
        value: "snake_case" as JsonValueCase,
      },
      {
        label: "$(symbol-misc)  camelCase",
        description: "applePay → 'applePay'",
        value: "camelCase" as JsonValueCase,
      },
      {
        label: "$(symbol-misc)  SCREAMING_SNAKE_CASE",
        description: "applePay → 'APPLE_PAY'",
        value: "SCREAMING_SNAKE_CASE" as JsonValueCase,
      },
      {
        label: "$(symbol-misc)  Title Case",
        description: "applePay → 'Apple Pay'",
        value: "Title Case" as JsonValueCase,
      },
      {
        label: "$(symbol-misc)  None",
        description: "No @JsonValue annotations — use enum name as JSON value",
        value: "none" as JsonValueCase,
      },
    ],
    savedCaseFormat,
  );

  const caseChoice = await vscode.window.showQuickPick(caseItems, {
    title: "Flutter Genius: JSON Enum — @JsonValue Format",
    placeHolder: "How should enum values be serialized to JSON?",
    ignoreFocusOut: true,
  });
  if (!caseChoice) return;
  const jsonValueCase = caseChoice.value;

  // ── Step 7: Generate converter class? ───────────────────────────────────
  const converterItems = withSaved(
    [
      {
        label: "$(check)  Yes",
        description: "Generate a companion JsonConverter class",
        value: true,
      },
      {
        label: "$(close)  No",
        description: "Enum only — skip the converter class",
        value: false,
      },
    ],
    savedGenerateConverter,
  );

  const converterChoice = await vscode.window.showQuickPick(converterItems, {
    title: "Flutter Genius: JSON Enum — Converter Class",
    placeHolder: "Generate a companion JsonConverter class?",
    ignoreFocusOut: true,
  });
  if (!converterChoice) return;
  const generateConverter = converterChoice.value;

  // ── Step 8: Null handling (only if converter is enabled) ─────────────────
  let nullHandling: NullHandling = "firstValue";
  let defaultValue: string | undefined;

  if (generateConverter) {
    const nullItems = withSaved(
      [
        {
          label: `$(symbol-enum)  Use first value`,
          description: `Return ${targetEnum.name}.${enumValues[0]} when null`,
          value: "firstValue" as const,
        },
        {
          label: `$(list-ordered)  Choose specific default`,
          description: "Pick which value to return when null",
          value: "specific" as const,
        },
        {
          label: "$(warning)  Return null",
          description: `Converter type becomes ${targetEnum.name}? (nullable)`,
          value: "null" as const,
        },
      ],
      savedNullHandling === "null" ? "null" : "firstValue",
    );

    const nullChoice = await vscode.window.showQuickPick(nullItems, {
      title: "Flutter Genius: JSON Enum — Null Handling",
      placeHolder: "What should fromJson return when the JSON value is null?",
      ignoreFocusOut: true,
    });
    if (!nullChoice) return;

    if (nullChoice.value === "specific") {
      const specificChoice = await vscode.window.showQuickPick(
        enumValues.map((v) => ({ label: v, value: v })),
        {
          title: "Flutter Genius: JSON Enum — Default Value",
          placeHolder: "Select the default enum value",
          ignoreFocusOut: true,
        },
      );
      if (!specificChoice) return;
      defaultValue = specificChoice.value;
      nullHandling = "firstValue";
    } else {
      nullHandling = nullChoice.value;
    }
  }

  // ── Step 9: Collect extra imports to preserve ────────────────────────────
  const extraImports = extractImports(text).filter(
    (line) =>
      line.startsWith("import ") && !line.includes("json_annotation"),
  );

  // ── Step 10: Generate and write the file ─────────────────────────────────
  const options: JsonEnumOptions = {
    jsonValueCase,
    generateConverter,
    nullHandling,
    defaultValue,
  };

  const baseName = path.basename(filePath, ".dart");
  const content = generateJsonEnumContent(
    targetEnum.name,
    enumValues,
    baseName,
    extraImports,
    options,
  );

  await writeFile(filePath, content);

  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  await vscode.window.showTextDocument(doc);

  const converterNote = generateConverter ? "" : " (no converter)";
  vscode.window.showInformationMessage(
    `"${targetEnum.name}" converted${converterNote}. Run \`dart run build_runner build\` to generate the .g.dart file.`,
  );
}

// ---------------------------------------------------------------------------
// Private — Enum Value Extractor
// ---------------------------------------------------------------------------

/**
 * Extracts the ordered list of value names from an enum body.
 *
 * Handles:
 *   - Simple inline:    `enum Foo { a, b, c }`
 *   - Multiline:        values on separate lines
 *   - With annotations: `@JsonValue('a') a,`
 *   - Enhanced enum:    last value ends with `;`, methods follow
 *
 * Strategy:
 *   1. Find the text between the outer `{` and `}`.
 *   2. Locate the first `;` — this marks the end of the values section
 *      (enhanced enum) or there is none (simple enum).
 *   3. Strip annotations from the values section.
 *   4. Split on commas, trim, filter to valid identifiers.
 */
function extractEnumValues(body: string): string[] {
  const openBrace = body.indexOf("{");
  const closeBrace = body.lastIndexOf("}");
  if (openBrace === -1 || closeBrace === -1) return [];

  const inner = body.substring(openBrace + 1, closeBrace);

  // Enhanced enum: values section ends at the first ";".
  // Simple enum: no ";" so the whole inner content is values.
  const semicolonIndex = inner.indexOf(";");
  const valuesSection =
    semicolonIndex !== -1 ? inner.substring(0, semicolonIndex) : inner;

  // Strip annotations: @Name or @Name(...) — handles @JsonValue('x'), @JsonEnum, etc.
  const cleanValues = valuesSection.replace(/@[\w.]+(?:\([^)]*\))?\s*/g, "");

  return cleanValues
    .split(",")
    .map((v) => v.trim())
    .filter((v) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v));
}
