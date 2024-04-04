import { toPascalCase } from "../../../../utils/pascal-case";

export function repositoryFileContent(featureName: string, abstract: boolean) {
  if (abstract) {
    return `
    abstract class I${toPascalCase(featureName)}Repository {
       
      }
      
        `;
  }

  return `
  import '../data_source/local/${featureName}_local_data_source.dart';
  import '../../domain/repository/${featureName}_repository.dart';


  class ${toPascalCase(featureName)}RepositoryImpl implements I${toPascalCase(
    featureName
  )}Repository {
    final ${toPascalCase(featureName)}LocalDataSource localDataSource;
  
    ${toPascalCase(featureName)}RepositoryImpl({
      required this.localDataSource,
    });
  }
            `;
}
