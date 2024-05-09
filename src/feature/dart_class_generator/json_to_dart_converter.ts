import * as fs from "fs";
import * as path from "path";
import { toSnakeCase } from "../../utils/snake-case";
import { capitalizeFirstLetter } from "../../utils/capitalize_first_letter";
import { toCamelCase } from "../../utils/camel-case";
import { readSetting } from "../../utils/read-settings";

class JsonObject {
  [key: string]: any;
}

export class ConvertJsonToDart {
  json: string;
  classes: JsonObject[];

  constructor(jsonString: string) {
    this.json = jsonString;
    this.classes = [];
  }

  separateNestedClass(
    jsonObj: JsonObject,
    prefix: string = "",
    processed: Map<JsonObject, string> = new Map()
  ): void {
    // Check if the current object has already been processed
    if (processed.has(jsonObj)) {
      return;
    }

    // Add the current object to the processed map
    processed.set(jsonObj, prefix);

    for (const [key, value] of Object.entries(jsonObj)) {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "object"
      ) {
        // If the property is an array containing objects, process only the first object
        const nestedClassName = capitalizeFirstLetter(toCamelCase(key));
        this.separateNestedClass(value[0], nestedClassName, processed);
      } else if (typeof value === "object" && value !== null) {
        // For non-array objects, process them normally
        const nestedClassName = capitalizeFirstLetter(toCamelCase(key));
        this.separateNestedClass(value, nestedClassName, processed);
      }
    }

    const className = prefix || "Main"; // If prefix is empty, use 'Main' as class name
    this.classes.push({
      className: `${className}Entity`,
      content: this.generateEntityClassString(className, jsonObj),
    });
    // Check settings for enabling Hive
    var createModelEnabled = readSetting(
      "json.createModelForJSONToDartConvert"
    );
    console.log("createModelEnabled", createModelEnabled);
    if (createModelEnabled) {
      this.classes.push({
        className: `models/${className}Model`,
        content: this.generateModelClassString(className, jsonObj),
      });
    }
    var createHiveEnabled = readSetting("json.createHiveForJSONToDartConvert");
    if (createHiveEnabled) {
      this.classes.push({
        className: `hive_models/${className}HiveModel`,
        content: this.generateHiveClassString(className, jsonObj),
      });
    }
  }

  getType(value: any, key: string): string {
    if (value === null || value === undefined) {
      return "dynamic";
    } else if (typeof value === "string") {
      return "String";
    } else if (typeof value === "number") {
      // if the value is an integer
      if (Number.isInteger(value)) {
        return "int";
      } else if (value % 1 !== 0) {
        return "double";
      }
      return "int";
    } else if (typeof value === "boolean") {
      return "bool";
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object") {
        return `List<${capitalizeFirstLetter(toCamelCase(key))}>`;
      } else {
        return "List<dynamic>";
      }
    } else if (typeof value === "object") {
      return capitalizeFirstLetter(toCamelCase(key));
    } else {
      return "dynamic";
    }
  }

  generateEntityPropertyDeclaration(key: string, value: any): string {
    const type = this.getType(value, `${key}Entity`);
    const camelCaseKey = toCamelCase(key);
    return `  final ${type}? ${camelCaseKey};\n`;
  }

  generateHivePropertyDeclaration(
    index: number,
    key: string,
    value: any
  ): string {
    const type = this.getType(value, `${key}HiveModel`);
    const camelCaseKey = toCamelCase(key);
    return `  
    @HiveField(${index})
    final ${type}? ${camelCaseKey};\n`;
  }

  generateEntityConstructor(className: string, properties: JsonObject): string {
    let constructorString = `${className}Entity({\n`;
    for (const [key, _] of Object.entries(properties)) {
      const camelCaseKey = toCamelCase(key);
      constructorString += `    this.${camelCaseKey},\n`;
    }
    constructorString += "  });\n";
    return constructorString;
  }

  generateModelConstructor(className: string, properties: JsonObject): string {
    let constructorString = `${className}Model({\n`;
    for (const [key, _] of Object.entries(properties)) {
      const camelCaseKey = toCamelCase(key);
      constructorString += `    super.${camelCaseKey},\n`;
    }
    constructorString += "  });\n";
    return constructorString;
  }

  generateHiveConstructor(className: string, properties: JsonObject): string {
    let constructorString = `${className}HiveModel({\n`;
    for (const [key, _] of Object.entries(properties)) {
      const camelCaseKey = toCamelCase(key);
      constructorString += `    this.${camelCaseKey},\n`;
    }
    constructorString += "  });\n";
    return constructorString;
  }

  generateEntityClassString(className: string, properties: JsonObject): string {
    // imports
    let classString = `
    import 'dart:convert';
    import 'package:flutter/foundation.dart';
    `;

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === "object" && value !== null) {
        const nestedClassName = capitalizeFirstLetter(toCamelCase(key));
        classString += `import '${toSnakeCase(
          nestedClassName
        )}_entity.dart';\n`;
      }
    }

    classString += `
    class ${capitalizeFirstLetter(className)}Entity {\n`;

    for (const [key, value] of Object.entries(properties)) {
      classString += this.generateEntityPropertyDeclaration(key, value);
    }

    classString += this.generateEntityConstructor(
      capitalizeFirstLetter(className),
      properties
    );

    classString += this.generateCopyWithMethod(className, properties, "Entity");

    classString += this.generateToStringMethod(
      `${capitalizeFirstLetter(className)}Entity`,
      properties
    );

    classString += this.generateToMapMethod(properties);

    classString += this.generateFromMapMethod(
      `${capitalizeFirstLetter(className)}Entity`,
      properties,
      "Entity"
    );

    classString += this.generateToJsonFromJsonMethod(
      `${capitalizeFirstLetter(className)}Entity`,
      properties,
      "Entity"
    );

    classString += this.generateEqualityMethod(
      `${capitalizeFirstLetter(className)}Entity`,
      properties,
      "Entity"
    );

    classString += "}\n\n";

    return classString;
  }

  generateModelClassString(className: string, properties: JsonObject): string {
    let classString = `import '../${toSnakeCase(className)}_entity.dart';\n`;

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === "object" && value !== null) {
        const nestedClassName = capitalizeFirstLetter(toCamelCase(key));
        classString += `import '${toSnakeCase(nestedClassName)}_model.dart';\n`;
      }
    }

    classString += `class ${capitalizeFirstLetter(
      className
    )}Model extends ${capitalizeFirstLetter(className)}Entity{\n`;

    classString += this.generateModelConstructor(
      capitalizeFirstLetter(className),
      properties
    );

    classString += this.generateToStringMethod(
      `${capitalizeFirstLetter(className)}Model`,
      properties
    );

    classString += this.generateToMapMethod(properties);

    classString += this.generateFromMapMethod(
      `${capitalizeFirstLetter(className)}Model`,
      properties,
      "Model"
    );

    classString += "}\n\n";

    return classString;
  }

  generateHiveClassString(className: string, properties: JsonObject): string {
    // imports
    let classString = `
    import 'dart:convert';
    import 'package:flutter/foundation.dart';
    import 'package:hive_flutter/hive_flutter.dart';
    
    part '${toSnakeCase(className)}_hive_model.g.dart';
    `;

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === "object" && value !== null) {
        const nestedClassName = capitalizeFirstLetter(toCamelCase(key));
        classString += `import '${toSnakeCase(
          nestedClassName
        )}_hive_model.dart';\n`;
      }
    }
    classString += `
    @HiveType(
      typeId: 0, // Change this to a unique number
    )
    class ${capitalizeFirstLetter(className)}HiveModel {\n`;

    for (const [key, value] of Object.entries(properties)) {
      var index = Object.keys(properties).indexOf(key);
      classString += this.generateHivePropertyDeclaration(index, key, value);
    }

    classString += this.generateHiveConstructor(
      capitalizeFirstLetter(className),
      properties
    );

    classString += this.generateCopyWithMethod(
      className,
      properties,
      "HiveModel"
    );

    classString += this.generateToStringMethod(
      `${capitalizeFirstLetter(className)}HiveModel`,
      properties
    );

    classString += this.generateToMapMethod(properties);

    classString += this.generateFromMapMethod(
      `${capitalizeFirstLetter(className)}HiveModel`,
      properties,
      "HiveModel"
    );

    classString += this.generateToJsonFromJsonMethod(
      `${capitalizeFirstLetter(className)}HiveModel`,
      properties,
      "HiveModel"
    );

    classString += this.generateEqualityMethod(
      `${capitalizeFirstLetter(className)}HiveModel`,
      properties,
      "HiveModel"
    );

    classString += "}\n\n";

    return classString;
  }

  generateCopyWithMethod(
    className: string,
    properties: JsonObject,
    modelType: string = "Entity"
  ): string {
    let methodString = `  ${capitalizeFirstLetter(
      className
    )}${modelType} copyWith({\n`;

    for (const [key, value] of Object.entries(properties)) {
      const type = this.getType(value, `${key}${modelType}`);
      const camelCaseKey = toCamelCase(key);
      methodString += `    ${type}? ${camelCaseKey},\n`;
    }

    methodString += "  }) {\n";
    methodString += `    return ${capitalizeFirstLetter(
      className
    )}${modelType}(\n`;

    for (const [key, _] of Object.entries(properties)) {
      const camelCaseKey = toCamelCase(key);
      methodString += `      ${camelCaseKey}: ${camelCaseKey} ?? this.${camelCaseKey},\n`;
    }

    methodString += "    );\n";
    methodString += "  }\n";

    return methodString;
  }

  generateToStringMethod(className: string, properties: JsonObject): string {
    let methodString = "  @override\n";
    methodString += "  String toString() {\n";
    methodString += `    return '${className} {`;
    for (const [key, _] of Object.entries(properties)) {
      const camelCaseKey = toCamelCase(key);
      methodString += `"${camelCaseKey}": $${camelCaseKey}, `;
    }
    methodString += "}';\n";
    methodString += "  }\n";

    return methodString;
  }

  generateToMapMethod(properties: JsonObject) {
    let methodString = "  Map<String, dynamic> toMap() {\n";
    methodString += "    return {\n";
    for (const [key, values] of Object.entries(properties)) {
      const snakeCaseKey = toSnakeCase(key);
      const camelCaseKey = toCamelCase(key);

      if (values === null || values === undefined) {
        methodString += `      '${snakeCaseKey}': ${camelCaseKey},\n`;
      } else if (typeof values === "string") {
        methodString += `      '${snakeCaseKey}': ${camelCaseKey},\n`;
      } else if (typeof values === "number") {
        methodString += `      '${snakeCaseKey}': ${camelCaseKey},\n`;
      } else if (typeof values === "boolean") {
        methodString += `      '${snakeCaseKey}': ${camelCaseKey},\n`;
      } else if (Array.isArray(values)) {
        if (values.length > 0 && typeof values[0] === "object") {
          methodString += `      '${snakeCaseKey}': ${camelCaseKey}?.map((e) => e.toMap()).toList(),\n`;
        } else {
          methodString += `      '${snakeCaseKey}': ${camelCaseKey},\n`;
        }
      } else if (typeof values === "object") {
        methodString += `      '${snakeCaseKey}': ${camelCaseKey}?.toMap(),\n`;
      } else {
        methodString += `      '${snakeCaseKey}': ${camelCaseKey},\n`;
      }
    }
    methodString += "    };\n";
    methodString += "  }\n";

    return methodString;
  }

  generateFromMapMethod(
    className: string,
    properties: JsonObject,
    type: string = "Entity"
  ) {
    let methodString = `  factory ${className}.fromMap(Map<String, dynamic> map) {\n`;
    methodString += `    return ${className}(\n`;

    for (const [key, values] of Object.entries(properties)) {
      const snakeCaseKey = toSnakeCase(key);
      const camelCaseKey = toCamelCase(key);

      if (values === null || values === undefined) {
        methodString += `      ${camelCaseKey}: map['${snakeCaseKey}'],\n`;
      } else if (typeof values === "string") {
        methodString += `      ${camelCaseKey}: map['${snakeCaseKey}'],\n`;
      } else if (typeof values === "number") {
        if (Number.isInteger(values)) {
          methodString += `      ${camelCaseKey}:map['${snakeCaseKey}'] != null ? int.parse("\${map['${snakeCaseKey}']}") : null,\n`;
        } else if (values % 1 !== 0) {
          methodString += `      ${camelCaseKey}:map['${snakeCaseKey}'] != null ? double.parse("\${map['${snakeCaseKey}']}") : null,\n`;
        } else {
          methodString += `      ${camelCaseKey}: map['${snakeCaseKey}'],\n`;
        }
      } else if (typeof values === "boolean") {
        methodString += `      ${camelCaseKey}: map['${snakeCaseKey}'],\n`;
      } else if (Array.isArray(values)) {
        if (values.length > 0 && typeof values[0] === "object") {
          methodString += `      ${camelCaseKey}: map['${snakeCaseKey}']?.map((e) => ${capitalizeFirstLetter(
            toCamelCase(key)
          )}${type}.fromMap(e))?.toList(),\n`;
        } else {
          methodString += `      ${camelCaseKey}: map['${snakeCaseKey}'],\n`;
        }
      } else if (typeof values === "object") {
        methodString += `      ${camelCaseKey}:map['${snakeCaseKey}'] !=null ? ${capitalizeFirstLetter(
          toCamelCase(key)
        )}${type}.fromMap(map['${snakeCaseKey}']): null,\n`;
      } else {
        methodString += `      ${camelCaseKey}: map['${snakeCaseKey}'],\n`;
      }
    }

    methodString += "    );\n";
    methodString += "  }\n";

    return methodString;
  }

  generateEqualityMethod(
    className: string,
    properties: JsonObject,
    type: string
  ): string {
    const camelCaseKey = toCamelCase(Object.keys(properties)[0]);

    let methodString = "  @override\n";
    methodString += `  bool operator ==(covariant ${className} other) {\n`;
    methodString += `    if (identical(this, other)) return true;\n`;
    methodString += `    return`;
    // if value is array then user listEquals
    for (const [key, value] of Object.entries(properties)) {
      const camelCaseKey = toCamelCase(key);
      if (Array.isArray(value)) {
        methodString += `   listEquals(${camelCaseKey}, other.${camelCaseKey})`;
        // check of last element
        if (
          Object.keys(properties).indexOf(key) + 1 !==
          Object.keys(properties).length
        ) {
          methodString += " &&\n";
        }
      } else {
        methodString += `   ${camelCaseKey} == other.${camelCaseKey}`;
        if (
          Object.keys(properties).indexOf(key) + 1 !==
          Object.keys(properties).length
        ) {
          methodString += " &&\n";
        }
      }
    }
    methodString += ";\n";
    methodString += "  }\n";

    methodString += "  @override\n";
    methodString += "  int get hashCode {\n";
    methodString += "    return ";
    for (const [key, _] of Object.entries(properties)) {
      const camelCaseKey = toCamelCase(key);
      methodString += `${camelCaseKey}.hashCode`;
      if (
        Object.keys(properties).indexOf(key) + 1 !==
        Object.keys(properties).length
      ) {
        methodString += " ^\n";
      }
    }
    methodString += ";\n";
    methodString += "  }\n";

    return methodString;
  }

  generateToJsonFromJsonMethod(
    className: string,
    properties: JsonObject,
    type: string
  ): string {
    // String toJson() => json.encode(toMap());

    // factory DataEntity.fromJson(String source) =>
    //     DataEntity.fromMap(json.decode(source) as Map<String, dynamic>);

    let methodString = `  \n\nString toJson() => json.encode(toMap());\n\n`;

    methodString += `  factory ${className}.fromJson(String source) =>\n`;
    methodString += `    ${className}.fromMap(json.decode(source) as Map<String, dynamic>);\n\n\n`;

    return methodString;
  }

  convert(mainClassName: string, folderPath: string): void {
    const jsonObj: JsonObject = JSON.parse(this.json);
    this.separateNestedClass(jsonObj, mainClassName);
    this.classes.forEach(({ className, content }) => {
      const filePath = path.join(folderPath, `${toSnakeCase(className)}.dart`);
      const folder = path.dirname(filePath);

      // Create folder if it doesn't exist
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }

      fs.writeFileSync(filePath, content);
      console.log(`${className} class has been created at ${filePath}.`);
    });
  }
}
