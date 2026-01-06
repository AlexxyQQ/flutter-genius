import * as vscode from "vscode";
import * as path from "path";
import { getClassAtPosition, extractFields } from "../utils/dart_parser";
import { getRelativeImportPath, writeFile } from "../utils/file_manager";
import { generateFreezedModelContent } from "../templates/freezed_model";
import { generateFreezedEntityContent } from "../templates/freezed_entity"; // Import new template
import { toSnakeCase } from "../utils/string_utils";
import { analyzeTypeForEnum } from "../utils/enum_detector";

export async function generateEntityToModelCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const entityDir = path.dirname(filePath);

  // 1. Detect Class
  const cursorPosition = editor.selection.active;
  const classInfo = getClassAtPosition(document, cursorPosition);

  if (!classInfo) {
    vscode.window.showErrorMessage(
      "No class found at current cursor position."
    );
    return;
  }

  const { className, classBody, isFreezed } = classInfo;

  if (!className.endsWith("Entity")) {
    vscode.window.showErrorMessage(
      `Selected class "${className}" must end in "Entity".`
    );
    return;
  }

  // 2. Extract Fields (Handles both Normal and Freezed via updated parser)
  let fields = extractFields(classBody, isFreezed);

  if (fields.length === 0) {
    vscode.window.showErrorMessage(`No fields found in ${className}.`);
    return;
  }

  // 3. ENUM DETECTION (Same as before)
  const unannotatedEnums: string[] = [];
  fields = await Promise.all(
    fields.map(async (field) => {
      if (
        !field.isList &&
        !field.isMap &&
        !field.isEntity &&
        !["String", "int", "double", "bool", "DateTime"].includes(
          field.cleanType
        )
      ) {
        const analysis = await analyzeTypeForEnum(field.cleanType);
        if (analysis.isEnum) {
          field.isEnum = true;
          if (analysis.hasAnnotation && analysis.converterName) {
            field.converterName = analysis.converterName;
          } else {
            unannotatedEnums.push(field.cleanType);
          }
        }
      }
      return field;
    })
  );

  // ---------------------------------------------------------
  // 4. IF NORMAL CLASS -> CONVERT TO FREEZED ENTITY (IN PLACE)
  // ---------------------------------------------------------
  if (!isFreezed) {
    const fileName = path.basename(filePath);
    const newEntityContent = generateFreezedEntityContent(
      className,
      fileName,
      fields
    );

    // Write to the CURRENT file
    await writeFile(filePath, newEntityContent);

    // Provide immediate feedback about the conversion
    vscode.window.showInformationMessage(
      `Converted ${className} to Freezed Entity! (Run build_runner)`
    );
  }

  // ---------------------------------------------------------
  // 5. PREPARE MODEL PATHS
  // ---------------------------------------------------------
  let modelDir = "";
  if (entityDir.includes(path.join("domain", "entities"))) {
    modelDir = entityDir.replace(
      path.join("domain", "entities"),
      path.join("data", "models")
    );
  } else if (entityDir.includes("domain")) {
    modelDir = entityDir.replace("domain", path.join("data", "models"));
  } else {
    modelDir = path.join(path.dirname(entityDir), "data", "models");
  }

  const snakeClassName = toSnakeCase(className);
  let baseName = snakeClassName;
  if (baseName.endsWith("_entity")) {
    baseName = baseName.substring(0, baseName.length - "_entity".length);
  }
  const modelFileName = `${baseName}_model.dart`;
  const targetPath = path.join(modelDir, modelFileName);

  // 6. GENERATE MODEL CONTENT
  const modelClassName = className.replace("Entity", "Model");
  const relativeImportPath = getRelativeImportPath(modelDir, filePath);

  const fileContent = generateFreezedModelContent(
    modelClassName,
    className,
    relativeImportPath,
    modelFileName,
    fields
  );

  // 7. WRITE MODEL FILE
  try {
    await writeFile(targetPath, fileContent);

    // Open the new Model file
    const doc = await vscode.workspace.openTextDocument(targetPath);
    await vscode.window.showTextDocument(doc);

    if (unannotatedEnums.length > 0) {
      const unique = [...new Set(unannotatedEnums)].join(", ");
      vscode.window.showInformationMessage(
        `Generated Model! ℹ️ Note: Enums [${unique}] lack JsonEnum annotations.`
      );
    } else {
      vscode.window.showInformationMessage(
        `Generated Freezed model: ${modelClassName}`
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to generate: ${error.message}`);
  }
}
import * as vscode from "vscode";

// --- INTERFACES ---

/**
 * Used for the 'Extract Classes' command.
 * Generic structure for Classes, Enums, and Mixins.
 */
export interface DeclarationInfo {
  type: "class" | "enum" | "mixin";
  name: string;
  body: string;
  isFreezed: boolean;
  start: number;
  end: number;
}

/**
 * Used for the 'Entity to Model' command.
 * Specific to Classes.
 */
export interface ClassInfo {
  type: "class";
  className: string;
  classBody: string;
  isFreezed: boolean;
  start: number;
  end: number;
}

export interface FieldInfo {
  type: string;
  name: string;
  isNullable: boolean;
  isList: boolean;
  isMap: boolean;
  isEntity: boolean;
  cleanType: string;
  defaultValue?: string;
  isEnum?: boolean;
  converterName?: string;
  enumFilePath?: string;
}

// --- FUNCTIONS ---

/**
 * Gets the Class definition at the current cursor position.
 * Returns null if the cursor is not inside a class definition.
 */
export function getClassAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): ClassInfo | null {
  let startLine = position.line;
  let className = "";
  let foundStart = false;
  let matchIndexInLine = 0;

  // 1. Find the line where "class Name" is defined
  for (let i = startLine; i >= 0; i--) {
    const lineText = document.lineAt(i).text;
    const match = lineText.match(/class\s+(\w+)/);
    if (match) {
      className = match[1];
      startLine = i;
      matchIndexInLine = match.index || 0;
      foundStart = true;
      break;
    }
  }

  if (!foundStart) return null;

  // 2. Read text from that line to the end of the file
  let textFromStart = "";
  for (let i = startLine; i < document.lineCount; i++) {
    textFromStart += document.lineAt(i).text + "\n";
  }

  // 3. Find the matching closing brace '}'
  let openBraces = 0;
  let lengthOfClass = 0;
  let hasStartedBlock = false;

  for (let i = 0; i < textFromStart.length; i++) {
    if (textFromStart[i] === "{") {
      openBraces++;
      hasStartedBlock = true;
    } else if (textFromStart[i] === "}") {
      openBraces--;
    }

    if (hasStartedBlock && openBraces === 0) {
      lengthOfClass = i + 1;
      break;
    }
  }

  if (lengthOfClass === 0) return null;

  const classBody = textFromStart.substring(0, lengthOfClass);

  // 4. Check if Freezed
  const isFreezed =
    classBody.includes(`_$${className}`) || textFromStart.includes("@freezed");

  // 5. Calculate Absolute Offsets
  const lineStartOffset = document.offsetAt(new vscode.Position(startLine, 0));
  const absoluteStart = lineStartOffset + matchIndexInLine;
  const absoluteEnd = lineStartOffset + lengthOfClass;

  return {
    type: "class", // FIXED: Added missing type property
    className,
    classBody,
    isFreezed,
    start: absoluteStart,
    end: absoluteEnd,
  };
}

/**
 * Scans the document for ALL Classes, Enums, and Mixins.
 */
export function getAllDeclarations(text: string): DeclarationInfo[] {
  const declarations: DeclarationInfo[] = [];

  // Regex to find "class Name", "enum Name", or "mixin Name"
  const declRegex = /(class|enum|mixin)\s+(\w+)/g;
  let match;

  while ((match = declRegex.exec(text)) !== null) {
    const type = match[1] as "class" | "enum" | "mixin";
    const name = match[2];
    const startIndex = match.index;

    // Find the opening brace
    const openBraceIndex = text.indexOf("{", startIndex);
    if (openBraceIndex === -1) continue;

    // Count braces to find the end of the block
    let openBraces = 1;
    let endIndex = -1;

    for (let i = openBraceIndex + 1; i < text.length; i++) {
      if (text[i] === "{") {
        openBraces++;
      } else if (text[i] === "}") {
        openBraces--;
      }

      if (openBraces === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (endIndex !== -1) {
      const body = text.substring(startIndex, endIndex);

      // Check for code generation markers
      const isFreezed = body.includes(`_$${name}`) || text.includes("@freezed");

      declarations.push({
        type: type,
        name: name,
        body: body,
        isFreezed,
        start: startIndex,
        end: endIndex,
      });
    }
  }

  return declarations;
}

/**
 * Extracts fields from a Class body (supports Normal and Freezed classes).
 */
export function extractFields(
  classBody: string,
  isFreezed: boolean
): FieldInfo[] {
  const fields: FieldInfo[] = [];

  if (isFreezed) {
    // --- FREEZED PARSING ---
    const factoryRegex = /factory\s+\w+\s*\(\s*\{([^;]+)\}\s*\)/;
    const factoryMatch = classBody.match(factoryRegex);

    if (factoryMatch) {
      const paramsBlock = factoryMatch[1];
      const params = paramsBlock.split(",");

      for (const param of params) {
        const cleaned = param.trim();
        if (!cleaned) continue;
        if (cleaned.startsWith("//")) continue;

        let defaultValue: string | undefined;
        const defaultMatch = cleaned.match(/@Default\(([^)]+)\)/);
        if (defaultMatch) {
          defaultValue = defaultMatch[1];
        }

        const noAnnotations = cleaned
          .replace(/@\w+\([^)]+\)/g, "")
          .replace(/@\w+/g, "")
          .replace(/^required\s+/, "")
          .trim();

        const lastSpaceIndex = noAnnotations.lastIndexOf(" ");
        if (lastSpaceIndex === -1) continue;

        const rawType = noAnnotations.substring(0, lastSpaceIndex).trim();
        const name = noAnnotations.substring(lastSpaceIndex + 1).trim();

        fields.push(processField(rawType, name, defaultValue));
      }
    }
  } else {
    // --- NORMAL CLASS PARSING ---
    const fieldRegex = /final\s+(.+?)\s+(\w+);/g;
    const defaults = extractDefaults(classBody);
    let match;
    while ((match = fieldRegex.exec(classBody)) !== null) {
      fields.push(processField(match[1].trim(), match[2], defaults[match[2]]));
    }
  }

  return fields;
}

function extractDefaults(classBody: string): Record<string, string> {
  const defaults: Record<string, string> = {};
  const defaultRegex = /this\.(\w+)\s*=\s*([^,)]+)/g;
  let match;
  while ((match = defaultRegex.exec(classBody)) !== null) {
    const fieldName = match[1];
    let defaultValue = match[2].trim();
    defaults[fieldName] = defaultValue;
  }
  return defaults;
}

function processField(
  rawType: string,
  name: string,
  defaultValue?: string
): FieldInfo {
  const isNullable = rawType.endsWith("?");
  const isList = rawType.startsWith("List<");
  const isMap = rawType.startsWith("Map<");
  const isEntity = rawType.includes("Entity");

  let cleanType = rawType;

  if (isList) {
    const listMatch = rawType.match(/List<(.+)>/);
    if (listMatch) cleanType = listMatch[1].replace(/\?$/, "");
  } else if (isMap) {
    const mapMatch = rawType.match(/Map\s*<.+?,\s*(.+)>/);
    if (mapMatch) cleanType = mapMatch[1].replace(/>\??$/, "");
  } else {
    if (isNullable) cleanType = cleanType.substring(0, cleanType.length - 1);
  }

  return {
    type: rawType,
    name,
    isNullable,
    isList,
    isMap,
    isEntity,
    cleanType: cleanType.trim(),
    defaultValue,
  };
}

export function extractImports(text: string): string[] {
  const lines = text.split("\n");
  const imports: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("import ") || trimmed.startsWith("part ")) {
      imports.push(trimmed);
    }
  }
  return imports;
}
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * writes content to a file. Creates directories if they don't exist.
 */
export async function writeFile(fsPath: string, content: string) {
    const uri = vscode.Uri.file(fsPath);
    const dir = path.dirname(fsPath);
    
    // Recursive directory creation
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const data = Buffer.from(content, 'utf8');
    await vscode.workspace.fs.writeFile(uri, data);
}

/**
 * Calculates the Dart import path from one file to another.
 * Ensures usage of forward slashes and local identifiers (./).
 */
export function getRelativeImportPath(fromDir: string, toFile: string): string {
    let rel = path.relative(fromDir, toFile);
    
    // Force forward slashes for Dart imports (even on Windows)
    rel = rel.split(path.sep).join('/');
    
    if (!rel.startsWith('.')) {
        rel = './' + rel;
    }
    return rel;
}
import { FieldInfo } from "../utils/dart_parser";

/**
 * Generates the full content for the Freezed Model file.
 * * Features:
 * - Swaps Entity types for Model types in the factory definition.
 * - Adds @Default() annotation if a default value was found in the Entity.
 * - Adds @ConverterName() annotation if an Enum with a JsonConverter was detected.
 * - Generates recursive toEntity() and toModel() extensions for Lists and Maps.
 */
export function generateFreezedModelContent(
  modelClass: string,
  entityClass: string,
  importPath: string,
  fileName: string,
  fields: FieldInfo[]
): string {
  const baseName = fileName.replace(".dart", "");

  // 1. Generate Factory Parameters
  const factoryParams = fields
    .map((f) => {
      let fieldType = f.type;

      // SWAP ENTITY -> MODEL IN TYPE DEFINITION
      // e.g. List<UserEntity> -> List<UserModel>
      if (f.isEntity) {
        fieldType = fieldType.replace(/Entity/g, "Model");
      }

      let prefix = "";

      // NEW: Add Converter Annotation if detected (for Enums)
      if (f.isEnum && f.converterName) {
        prefix += `@${f.converterName}() `;
      }

      // HANDLE DEFAULTS
      // If parsing found a default, add @Default(val)
      // If default exists, the field is technically not "required" in Freezed syntax
      if (f.defaultValue) {
        prefix += `@Default(${f.defaultValue}) `;
      } else if (!f.isNullable) {
        prefix += "required ";
      }

      return `    ${prefix}${fieldType} ${f.name},`;
    })
    .join("\n");

  // 2. Generate ToEntity Body
  const toEntityFields = fields
    .map((f) => {
      // If it is an Entity type, we need to map it
      if (f.isEntity) {
        const nullSafe = f.isNullable ? "?" : "";

        // CASE: List<Entity> -> List<Model>
        if (f.isList) {
          return `      ${f.name}: ${f.name}${nullSafe}.map((e) => e.toEntity()).toList(),`;
        }
        // CASE: Map<Key, Entity> -> Map<Key, Model>
        else if (f.isMap) {
          return `      ${f.name}: ${f.name}${nullSafe}.map((k, e) => MapEntry(k, e.toEntity())),`;
        }
        // CASE: Single Entity -> Single Model
        else {
          return `      ${f.name}: ${f.name}${nullSafe}.toEntity(),`;
        }
      }

      // Primitive Types or simple Enums (pass through)
      return `      ${f.name}: ${f.name},`;
    })
    .join("\n");

  // 3. Generate ToModel Body
  const toModelFields = fields
    .map((f) => {
      if (f.isEntity) {
        const nullSafe = f.isNullable ? "?" : "";

        // CASE: List<Entity>
        if (f.isList) {
          return `      ${f.name}: ${f.name}${nullSafe}.map((e) => e.toModel()).toList(),`;
        }
        // CASE: Map<Key, Entity>
        else if (f.isMap) {
          return `      ${f.name}: ${f.name}${nullSafe}.map((k, e) => MapEntry(k, e.toModel())),`;
        }
        // CASE: Single Entity
        else {
          return `      ${f.name}: ${f.name}${nullSafe}.toModel(),`;
        }
      }
      return `      ${f.name}: ${f.name},`;
    })
    .join("\n");

  return `import 'package:freezed_annotation/freezed_annotation.dart';
import '${importPath}';

// TODO: Ensure all nested models are imported here

part '${baseName}.freezed.dart';
part '${baseName}.g.dart';

@freezed
abstract class ${modelClass} with _$${modelClass} {
  const ${modelClass}._();

  @JsonSerializable(explicitToJson: true)
  const factory ${modelClass}({
${factoryParams}
  }) = _${modelClass};

  factory ${modelClass}.fromJson(Map<String, dynamic> json) => _$${modelClass}FromJson(json);
}

// -----------------------------------------------------------------------------
// MODEL -> ENTITY
// -----------------------------------------------------------------------------
extension ${modelClass}Mapper on ${modelClass} {
  ${entityClass} toEntity() {
    return ${entityClass}(
${toEntityFields}
    );
  }
}

// -----------------------------------------------------------------------------
// ENTITY -> MODEL
// -----------------------------------------------------------------------------
extension ${entityClass}Mapper on ${entityClass} {
  ${modelClass} toModel() {
    return ${modelClass}(
${toModelFields}
    );
  }
}

// -----------------------------------------------------------------------------
// HELPER MAPPERS
// -----------------------------------------------------------------------------
extension ${modelClass}ListMapper on List<${modelClass}> {
  List<${entityClass}> toEntities() => map((e) => e.toEntity()).toList();
}

extension ${entityClass}ListMapper on List<${entityClass}> {
  List<${modelClass}> toModels() => map((e) => e.toModel()).toList();
}
`;
}
import { FieldInfo } from "../utils/dart_parser";

export function generateFreezedEntityContent(
  className: string,
  fileName: string, // e.g. "user_entity.dart"
  fields: FieldInfo[]
): string {
  const baseName = fileName.replace(".dart", "");

  const constructorParams = fields
    .map((f) => {
      let prefix = "";

      // If default value exists, use @Default
      if (f.defaultValue) {
        prefix += `@Default(${f.defaultValue}) `;
      } else if (!f.isNullable) {
        prefix += `required `;
      }

      return `    ${prefix}${f.type} ${f.name},`;
    })
    .join("\n");

  return `import 'package:freezed_annotation/freezed_annotation.dart';

part '${baseName}.freezed.dart';

@freezed
class ${className} with _$${className} {
  const ${className}._();

  const factory ${className}({
${constructorParams}
  }) = _${className};
}
`;
}
/**
 * Utility functions for string manipulation.
 */

/**
 * Converts a PascalCase or camelCase string to snake_case.
 * * Examples:
 * - 'UserEntity' -> 'user_entity'
 * - 'myVarName'  -> 'my_var_name'
 *
 * @param str The input string (usually a class name).
 * @returns The snake_case version of the string.
 */
export function toSnakeCase(str: string): string {
    return str
        // Replace every uppercase letter with '_lowercase'
        .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        // Remove the leading underscore if the string started with an uppercase letter (PascalCase)
        .replace(/^_/, ''); 
}
import * as vscode from "vscode";
import { toSnakeCase } from "./string_utils"; // Ensure you have this exported

export interface EnumAnalysis {
  isEnum: boolean;
  hasAnnotation: boolean;
  converterName: string | null;
  foundFile: boolean;
}

/**
 * Analyzes a type name to see if it is an Enum and if it is ready for JSON serialization.
 */
export async function analyzeTypeForEnum(
  typeName: string
): Promise<EnumAnalysis> {
  // 1. Filter out non-candidates immediately
  const ignoredTypes = [
    "String",
    "int",
    "double",
    "bool",
    "num",
    "dynamic",
    "Object",
    "DateTime",
    "void",
    "List",
    "Map",
    "Set",
  ];

  if (
    ignoredTypes.includes(typeName) ||
    typeName.endsWith("Entity") ||
    typeName.endsWith("Model")
  ) {
    return {
      isEnum: false,
      hasAnnotation: false,
      converterName: null,
      foundFile: false,
    };
  }

  // 2. Try to locate the file defining this type.
  // Heuristic: Flutter standard is PascalCaseType -> snake_case_file.dart
  const snakeName = toSnakeCase(typeName);

  // Limit search to 1 result for speed
  const files = await vscode.workspace.findFiles(
    `**/${snakeName}.dart`,
    "**/.*",
    1
  );

  if (files.length === 0) {
    // We suspect it's an enum (not primitive/entity), but couldn't find the file.
    return {
      isEnum: true,
      hasAnnotation: false,
      converterName: null,
      foundFile: false,
    };
  }

  // 3. Read file content
  try {
    const doc = await vscode.workspace.openTextDocument(files[0]);
    const content = doc.getText();

    // Verify it is actually an enum
    const isEnum = content.includes(`enum ${typeName}`);
    if (!isEnum) {
      return {
        isEnum: false,
        hasAnnotation: false,
        converterName: null,
        foundFile: true,
      };
    }

    // Check for @JsonEnum annotation
    const hasJsonEnum = content.includes("@JsonEnum");

    // Check for a converter class definition in the same file
    // Regex looks for: class SomeConverter implements JsonConverter<ThisEnum, ...>
    const converterRegex = new RegExp(
      `class\\s+(\\w+)[^\\{]*implements\\s+.*JsonConverter\\s*<\\s*${typeName}`,
      "s"
    );
    const match = content.match(converterRegex);

    const converterName = match ? match[1] : null;

    return {
      isEnum: true,
      hasAnnotation: hasJsonEnum && !!converterName,
      converterName: converterName,
      foundFile: true,
    };
  } catch (e) {
    return {
      isEnum: true,
      hasAnnotation: false,
      converterName: null,
      foundFile: false,
    };
  }
}




update this code , i need to create this type of entity 

import 'package:copy_with_extension/copy_with_extension.dart';

import 'package:test_extension/features/generator_no_freezed/domain/entities/test_enum.dart';
import 'package:test_extension/features/generator_no_freezed/domain/entities/test_nest_entity.dart';

part 'test_entity.g.dart';

@CopyWith()
class TestEntity {
  final String simpleString;
  final String? nullableString;
  final String alreadySpecifiedString;

  final int simpleInt;
  final int? nullableInt;
  final int alreadySpecifiedInt;

  final bool simpleBool;
  final bool? nullableBool;
  final bool alreadySpecifiedBool;

  // --- Primitives (Double) ---
  final double simpleDouble;
  final double? nullableDouble;
  final double alreadySpecifiedDouble;

  // --- Date & Time (Common serialization pain point) ---
  final DateTime simpleDateTime;
  final DateTime? nullableDateTime;
  final DateTime alreadySpecifiedDateTime;

  // --- Enums ---
  final TestEnumTwo simpleEnum;
  @TestEnumConverter()
  final TestEnum? nullableEnum;
  @TestEnumConverter()
  final TestEnum alreadySpecifiedEnum;

  // --- Nested Custom Objects ---
  final InnerEntity simpleInnerEntity;
  final InnerEntity? nullableInnerEntity;
  final InnerEntity alreadySpecifiedInnerEntity;

  // --- Lists (Simple Types) ---
  final List<String> simpleStringList;
  final List<String>? nullableStringList;
  // A non-nullable list that might contain nulls (edge case)
  final List<String?> listWithNullableItems;

  // --- Lists (Complex Types) ---
  final List<InnerEntity> simpleObjectList;
  final List<InnerEntity>? nullableObjectList;

  // --- Maps ---
  final Map<String, int> simpleMap;
  final Map<String, InnerEntity>? nullableComplexMap;
  final Map<String, dynamic> dynamicMap;

  // --- Constructor ---
  TestEntity({
    required this.simpleDouble,
    this.nullableDouble,
    this.alreadySpecifiedDouble = 3.14,

    required this.simpleDateTime,
    this.nullableDateTime,
    required this.alreadySpecifiedDateTime,

    required this.simpleEnum,
    this.nullableEnum,
    this.alreadySpecifiedEnum = TestEnum.one,

    required this.simpleInnerEntity,
    this.nullableInnerEntity,
    required this.alreadySpecifiedInnerEntity,

    required this.simpleStringList,
    this.nullableStringList,
    required this.listWithNullableItems,

    required this.simpleObjectList,
    this.nullableObjectList,

    required this.simpleMap,
    this.nullableComplexMap,
    required this.dynamicMap,

    required this.simpleString,
    this.nullableString,
    this.alreadySpecifiedString = 'Test',

    required this.simpleInt,
    this.nullableInt,
    this.alreadySpecifiedInt = 10,

    required this.simpleBool,
    this.nullableBool,
    this.alreadySpecifiedBool = false,
  });

  @override
  String toString() {
    return 'TestEntity(simpleString: $simpleString, nullableString: $nullableString, alreadySpecifiedString: $alreadySpecifiedString, simpleInt: $simpleInt, nullableInt: $nullableInt, alreadySpecifiedInt: $alreadySpecifiedInt, simpleBool: $simpleBool, nullableBool: $nullableBool, alreadySpecifiedBool: $alreadySpecifiedBool, simpleDouble: $simpleDouble, nullableDouble: $nullableDouble, alreadySpecifiedDouble: $alreadySpecifiedDouble, simpleDateTime: $simpleDateTime, nullableDateTime: $nullableDateTime, alreadySpecifiedDateTime: $alreadySpecifiedDateTime, simpleEnum: $simpleEnum, nullableEnum: $nullableEnum, alreadySpecifiedEnum: $alreadySpecifiedEnum, simpleInnerEntity: $simpleInnerEntity, nullableInnerEntity: $nullableInnerEntity, alreadySpecifiedInnerEntity: $alreadySpecifiedInnerEntity, simpleStringList: $simpleStringList, nullableStringList: $nullableStringList, listWithNullableItems: $listWithNullableItems, simpleObjectList: $simpleObjectList, nullableObjectList: $nullableObjectList, simpleMap: $simpleMap, nullableComplexMap: $nullableComplexMap, dynamicMap: $dynamicMap)';
  }
}

and this type of model

import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';
import 'package:test_extension/features/generator_no_freezed/data/models/test_nest_model.dart';
import 'package:test_extension/features/generator_no_freezed/domain/entities/test_entity.dart';

import 'package:test_extension/features/generator_no_freezed/domain/entities/test_enum.dart';
import 'package:test_extension/features/generator_no_freezed/domain/entities/test_nest_entity.dart';

part 'test_model.g.dart';

@CopyWith()
@JsonSerializable(explicitToJson: true, fieldRename: FieldRename.snake)
class TestModel extends TestEntity {
  // Overrides For Classes
  @override
  InnerModel get simpleInnerEntity => super.simpleInnerEntity as InnerModel;
  @override
  InnerModel? get nullableInnerEntity =>
      super.nullableInnerEntity as InnerModel?;
  @override
  InnerModel get alreadySpecifiedInnerEntity =>
      super.alreadySpecifiedInnerEntity as InnerModel;
  @override
  List<InnerModel> get simpleObjectList =>
      super.simpleObjectList as List<InnerModel>;
  @override
  List<InnerModel>? get nullableObjectList =>
      super.nullableObjectList as List<InnerModel>?;
  @override
  Map<String, InnerModel> get nullableComplexMap =>
      super.simpleMap as Map<String, InnerModel>;

  TestModel({
    required super.simpleDouble,
    super.nullableDouble,
    super.alreadySpecifiedDouble = 3.14,

    required super.simpleDateTime,
    super.nullableDateTime,
    required super.alreadySpecifiedDateTime,

    required super.simpleEnum,
    super.nullableEnum,
    super.alreadySpecifiedEnum = TestEnum.one,

    required InnerModel super.simpleInnerEntity,
    InnerModel? super.nullableInnerEntity,
    required InnerModel super.alreadySpecifiedInnerEntity,

    required super.simpleStringList,
    super.nullableStringList,
    required super.listWithNullableItems,

    required List<InnerModel> super.simpleObjectList,
    List<InnerModel>? super.nullableObjectList,

    required super.simpleMap,
    Map<String, InnerModel>? super.nullableComplexMap,
    required super.dynamicMap,

    required super.simpleString,
    super.nullableString,
    super.alreadySpecifiedString = 'Test',

    required super.simpleInt,
    super.nullableInt,
    super.alreadySpecifiedInt = 10,

    required super.simpleBool,
    super.nullableBool,
    super.alreadySpecifiedBool = false,
  });

  @override
  String toString() {
    return 'TestModel (simpleString: $simpleString, nullableString: $nullableString, alreadySpecifiedString: $alreadySpecifiedString, simpleInt: $simpleInt, nullableInt: $nullableInt, alreadySpecifiedInt: $alreadySpecifiedInt, simpleBool: $simpleBool, nullableBool: $nullableBool, alreadySpecifiedBool: $alreadySpecifiedBool, simpleDouble: $simpleDouble, nullableDouble: $nullableDouble, alreadySpecifiedDouble: $alreadySpecifiedDouble, simpleDateTime: $simpleDateTime, nullableDateTime: $nullableDateTime, alreadySpecifiedDateTime: $alreadySpecifiedDateTime, simpleEnum: $simpleEnum, nullableEnum: $nullableEnum, alreadySpecifiedEnum: $alreadySpecifiedEnum, simpleInnerEntity: $simpleInnerEntity, nullableInnerEntity: $nullableInnerEntity, alreadySpecifiedInnerEntity: $alreadySpecifiedInnerEntity, simpleStringList: $simpleStringList, nullableStringList: $nullableStringList, listWithNullableItems: $listWithNullableItems, simpleObjectList: $simpleObjectList, nullableObjectList: $nullableObjectList, simpleMap: $simpleMap, nullableComplexMap: $nullableComplexMap, dynamicMap: $dynamicMap)';
  }

  factory TestModel.fromJson(Map<String, dynamic> json) =>
      _$TestModelFromJson(json);

  Map<String, dynamic> toJson() => _$TestModelToJson(this);
}

can you fix my code and , also comment every thing for what it does, AND GIVE ME FULL CODE 