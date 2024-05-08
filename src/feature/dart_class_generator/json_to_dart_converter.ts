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
    let classString = `class ${capitalizeFirstLetter(className)}Entity {\n`;

    for (const [key, value] of Object.entries(properties)) {
      classString += this.generateEntityPropertyDeclaration(key, value);
    }

    classString += this.generateEntityConstructor(
      capitalizeFirstLetter(className),
      properties
    );

    classString += this.generateEntityCopyWithMethod(className, properties);

    classString += this.generateToStringMethod(
      `${capitalizeFirstLetter(className)}Entity`,
      properties
    );

    classString += this.generateToMapMethod(properties);

    classString += this.generateEntityFromMapMethod(
      `${capitalizeFirstLetter(className)}Entity`,
      properties,
      "Entity"
    );

    classString += "}\n\n";

    return classString;
  }

  generateModelClassString(className: string, properties: JsonObject): string {
    let classString = `class ${capitalizeFirstLetter(
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

    classString += this.generateEntityFromMapMethod(
      `${capitalizeFirstLetter(className)}Model`,
      properties,
      "Model"
    );

    classString += "}\n\n";

    return classString;
  }

  generateHiveClassString(className: string, properties: JsonObject): string {
    let classString = `
    import 'package:hive_flutter/hive_flutter.dart';

    part '${toSnakeCase(className)}_hive_model.g.dart';

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

    classString += this.generateHiveCopyWithMethod(className, properties);

    classString += this.generateToStringMethod(
      `${capitalizeFirstLetter(className)}HiveModel`,
      properties
    );

    classString += this.generateToMapMethod(properties);

    classString += this.generateEntityFromMapMethod(
      `${capitalizeFirstLetter(className)}HiveModel`,
      properties,
      "HiveModel"
    );

    classString += "}\n\n";

    return classString;
  }

  generateEntityCopyWithMethod(
    className: string,
    properties: JsonObject
  ): string {
    let methodString = `  ${capitalizeFirstLetter(
      className
    )}Entity copyWith({\n`;

    for (const [key, value] of Object.entries(properties)) {
      const type = this.getType(value, `${key}Entity`);
      const camelCaseKey = toCamelCase(key);
      methodString += `    ${type}? ${camelCaseKey},\n`;
    }

    methodString += "  }) {\n";
    methodString += `    return ${capitalizeFirstLetter(className)}Entity(\n`;

    for (const [key, _] of Object.entries(properties)) {
      const camelCaseKey = toCamelCase(key);
      methodString += `      ${camelCaseKey}: ${camelCaseKey} ?? this.${camelCaseKey},\n`;
    }

    methodString += "    );\n";
    methodString += "  }\n";

    return methodString;
  }

  generateHiveCopyWithMethod(
    className: string,
    properties: JsonObject
  ): string {
    let methodString = `  ${capitalizeFirstLetter(
      className
    )}HiveModel copyWith({\n`;

    for (const [key, value] of Object.entries(properties)) {
      const type = this.getType(value, `${key}HiveModel`);
      const camelCaseKey = toCamelCase(key);
      methodString += `    ${type}? ${camelCaseKey},\n`;
    }

    methodString += "  }) {\n";
    methodString += `    return ${capitalizeFirstLetter(
      className
    )}HiveModel(\n`;

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

  generateEntityFromMapMethod(
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
        methodString += `      ${camelCaseKey}: map['${snakeCaseKey}'],\n`;
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
        methodString += `      ${camelCaseKey}: ${capitalizeFirstLetter(
          toCamelCase(key)
        )}${type}.fromMap(map['${snakeCaseKey}']),\n`;
      } else {
        methodString += `      ${camelCaseKey}: map['${snakeCaseKey}'],\n`;
      }
    }

    methodString += "    );\n";
    methodString += "  }\n";

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
