import { toPascalCase } from "../../../../utils/pascal-case";
import { readSetting } from "../../../../utils/read-settings";

export function repositoryFileContent(featureName: string, abstract: boolean) {
  if (abstract) {
    return `
    abstract class I${toPascalCase(featureName)}Repository {
       
      }
      
        `;
  }

  const localDataSourceImport = readSetting("feature.localDataSource")
    ? `import '../data_source/local/${featureName}_local_data_source.dart';`
    : "";
  const localDataSourceDeclaration = readSetting("feature.localDataSource")
    ? `final ${toPascalCase(featureName)}LocalDataSource localDataSource;`
    : "";
  const localDataSourceInitialization = readSetting("feature.localDataSource")
    ? `required this.localDataSource,`
    : "";

  return `
  ${localDataSourceImport}
  import '../data_source/remote/${featureName}_remote_data_source.dart';
  import '../../domain/repository/${featureName}_repository.dart';


  class ${toPascalCase(featureName)}RepositoryImpl implements I${toPascalCase(
    featureName
  )}Repository {
    ${localDataSourceDeclaration}
    final ${toPascalCase(featureName)}RemoteDataSource remoteDataSource;
  
    ${toPascalCase(featureName)}RepositoryImpl({
      ${localDataSourceInitialization}
      required this.remoteDataSource,
    });
  }
            `;
}
