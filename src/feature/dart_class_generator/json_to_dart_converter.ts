import * as fs from "fs";
import * as path from "path";
import { toSnakeCase } from "../../utils/snake-case";

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

  separateNestedClass(jsonObj: JsonObject, prefix: string = ""): void {
    for (const [key, value] of Object.entries(jsonObj)) {
      if (typeof value === "object" && value !== null) {
        const nestedClassName = this.capitalizeFirstLetter(
          this.toCamelCase(key)
        );
        this.separateNestedClass(value, nestedClassName);
      }
    }
    const className = prefix || "Main"; // If prefix is empty, use 'Main' as class name
    console.log(`APPPPP:${className}`);
    this.classes.push({
      className,
      content: this.generateClassString(className, jsonObj),
    });
  }

  capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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
        return `List<${this.capitalizeFirstLetter(
          this.toCamelCase(typeof value[0])
        )}>`;
      } else {
        return "List<dynamic>";
      }
    } else if (typeof value === "object") {
      return this.capitalizeFirstLetter(this.toCamelCase(typeof value));
    } else {
      return "dynamic";
    }
  }

  generatePropertyDeclaration(key: string, value: any): string {
    const type = this.getType(value);
    const camelCaseKey = this.toCamelCase(key);
    return `  final ${type}? ${camelCaseKey};\n`;
  }

  generateConstructor(className: string, properties: JsonObject): string {
    let constructorString = `${className}({\n`;
    for (const [key, _] of Object.entries(properties)) {
      const camelCaseKey = this.toCamelCase(key);
      constructorString += `    this.${camelCaseKey},\n`;
    }
    constructorString += "  });\n";
    return constructorString;
  }

  generateClassString(className: string, properties: JsonObject): string {
    let classString = `class ${this.capitalizeFirstLetter(className)} {\n`;

    for (const [key, value] of Object.entries(properties)) {
      classString += this.generatePropertyDeclaration(key, value);
    }

    classString += this.generateConstructor(className, properties);
    classString += "}\n\n";

    return classString;
  }

  convert(mainClassName: string, folderPath: string): void {
    const jsonObj: JsonObject = JSON.parse(this.json);
    this.separateNestedClass(jsonObj, mainClassName);
    this.classes.forEach(({ className, content }) => {
      const filePath = path.join(folderPath, `${toSnakeCase(className)}.dart`);
      fs.writeFileSync(filePath, content);
      console.log(`${className} class has been created at ${filePath}.`);
    });
  }
}
