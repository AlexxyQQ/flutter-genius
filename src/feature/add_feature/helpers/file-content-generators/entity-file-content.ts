import { toCamelCase } from "../../../../utils/camel-case";
import { toPascalCase } from "../../../../utils/pascal-case";

export function entityFileContent(featureName: string) {
  return `
  class ${toPascalCase(featureName)}Entity {
    final String ${toCamelCase(featureName)}ID;
   ${toPascalCase(featureName)}Entity({
      required this.${toCamelCase(featureName)}ID,
    });
  }
            `;
}
