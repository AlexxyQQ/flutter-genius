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

  getType(value: any): string {
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
        return `List<${capitalizeFirstLetter(toCamelCase(typeof value[0]))}>`;
      } else {
        return "List<dynamic>";
      }
    } else if (typeof value === "object") {
      return capitalizeFirstLetter(toCamelCase(typeof value));
    } else {
      return "dynamic";
    }
  }

  generateEntityPropertyDeclaration(key: string, value: any): string {
    const type = this.getType(value);
    const camelCaseKey = toCamelCase(key);
    return `  final ${type}? ${camelCaseKey};\n`;
  }
  generateHivePropertyDeclaration(
    index: number,
    key: string,
    value: any
  ): string {
    const type = this.getType(value);
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
    classString += "}\n\n";

    return classString;
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
