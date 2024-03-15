import { toCamelCase } from "../utils/camel-case";
import { toPascalCase } from "../utils/pascal-case";

export function modelFileContent(featureName: string, hive: boolean) {
  if (hive) {
    return `
    import 'package:hive_flutter/hive_flutter.dart';
    part '${featureName}_hive_model.g.dart';

  
    @HiveType(
        typeId: 0, // Input the type ID for the Hive model.
      )
      class ${toPascalCase(featureName)}HiveModel {
        @HiveField(0)
        final String ${toCamelCase(featureName)}ID;
        ${toPascalCase(featureName)}HiveModel({
          required this.${toCamelCase(featureName)}ID,
        });
      }
      `;
  }

  return `
  import '../../domain/entity/${featureName}_entity.dart';

  class ${toPascalCase(featureName)}Model extends ${toPascalCase(
    featureName
  )}Entity {
    ${toPascalCase(featureName)}Model({
      required String ${toCamelCase(featureName)}ID,
    }) : super(
            ${toCamelCase(featureName)}ID: ${toCamelCase(featureName)}ID,
          );
    }
          `;
}
