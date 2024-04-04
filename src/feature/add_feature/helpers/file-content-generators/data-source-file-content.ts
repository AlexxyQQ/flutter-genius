import { toPascalCase } from "../../../../utils/pascal-case";

export function dataSourceFileContent(
  featureName: string,
  local: boolean,
  hive: boolean
) {
  if (local) {
    return `class ${toPascalCase(featureName)}LocalDataSource {
            
        }`;
  }
  if (hive) {
    return `
    import 'package:hive_flutter/hive_flutter.dart';

    class ${toPascalCase(featureName)}HiveService {

            Future<void> init() async {
                await Hive.initFlutter();
                //? Register Hive Adapters
                // Hive.registerAdapter(${toPascalCase(
                  featureName
                )}HiveModelAdapter());
              }
                
            }`;
  }

  return `class ${toPascalCase(featureName)}RemoteDataSource {
            
            }`;
}
