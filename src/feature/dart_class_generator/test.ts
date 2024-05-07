function convertJsonToDart(jsonString: string): string {
  const json = JSON.parse(jsonString);

  function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function generateClass(
    className: string,
    properties: Record<string, any>,
    classMap: Map<string, string>
  ): void {
    let classString = `class ${className} {\n`;

    for (const [key, value] of Object.entries(properties)) {
      let type;
      if (value === null || value === undefined) {
        type = "dynamic";
      } else if (typeof value === "string") {
        type = "String";
      } else if (typeof value === "number") {
        type = "int";
      } else if (typeof value === "boolean") {
        type = "bool";
      } else if (typeof value === "object") {
        if (Array.isArray(value)) {
          type = "List<dynamic>";
        } else {
          const nestedClassName = capitalizeFirstLetter(key);
          classMap.set(
            nestedClassName,
            generateClassString(nestedClassName, value)
          );
          type = nestedClassName + "?";
        }
      } else {
        type = "dynamic";
      }
      classString += `  final ${type} ${key};\n`;
    }

    classString += `\n  ${className}({\n`;
    for (const [key, _] of Object.entries(properties)) {
      classString += `    required this.${key},\n`;
    }
    classString += "  });\n}\n\n";

    classMap.set(className, classString);
  }

  function generateClassString(
    className: string,
    properties: Record<string, any>
  ): string {
    const classMap = new Map<string, string>();
    generateClass(className, properties, classMap);

    let classesString = "";
    for (const [_, classContent] of classMap.entries()) {
      classesString += classContent;
    }
    return classesString;
  }

  let dartClasses = "";
  for (const [className, classData] of Object.entries(json)) {
    dartClasses += generateClassString(
      className,
      classData as Record<string, any>
    );
  }

  return dartClasses;
}

// Test
const jsonString = `{
      "CustomerEntity": {
          "id": 1759,
          "name": "Insecure",
          "slug": "insecure",
          "account_type": "Assets",
          "image": "",
          "type": "dr",
          "description": "",
          "order_number": "",
          "editable": 1,
          "parent_id": 46,
          "parent_detail": {
              "id": 46,
              "type": "dr",
              "name": "Account Receivables",
              "slug": "account-receivables"
          },
          "code": "AR-21",
          "next_code": "",
          "pan_number": "",
          "customer_detail": {
              "id": 51,
              "name": "Insecure",
              "email": "",
              "phone": "",
              "address": "",
              "pan_number": null
          },
          "opening_balance": {
              "date": "",
              "cr_amount": 0,
              "dr_amount": 0
          },
          "created_at": "2024-04-29 10:56:54",
          "updated_at": "2024-04-29 10:56:54",
          "created_by": "Quisquam nostrud inc",
          "updated_by": "",
          "status": null,
          "total_remaining_invoice_amount": 0,
          "total_amount": 0
      }
  }`;

console.log(convertJsonToDart(jsonString));
