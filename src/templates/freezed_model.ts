/**
 * Generates the full content for the Freezed Model file.
 * * @param modelClass Name of the class to generate (e.g., UserModel)
 * @param entityClass Name of the parent entity (e.g., UserEntity)
 * @param importPath Relative path to the Entity file
 * @param fileName The filename base (e.g., user_model.dart)
 * @param fields Array of fields extracted from the entity
 */
export function generateFreezedModelContent(
    modelClass: string, 
    entityClass: string, 
    importPath: string, 
    fileName: string,
    fields: { type: string, name: string }[]
): string {
    
    // 1. Build Factory Parameters
    // Adds 'required' keyword automatically if the type is not nullable (?)
    const factoryParams = fields
        .map(f => {
            const isNullable = f.type.trim().endsWith('?');
            const requiredKeyword = isNullable ? '' : 'required ';
            return `    ${requiredKeyword}${f.type} ${f.name},`;
        })
        .join('\n');

    // 2. Map fields for toEntity()
    const toEntityFields = fields
        .map(f => `      ${f.name}: ${f.name},`)
        .join('\n');

    // 3. Map fields for fromEntity()
    const fromEntityFields = fields
        .map(f => `      ${f.name}: entity.${f.name},`)
        .join('\n');

    const baseName = fileName.replace('.dart', '');

    return `import 'package:freezed_annotation/freezed_annotation.dart';
import '${importPath}';

part '${baseName}.freezed.dart';
part '${baseName}.g.dart';

@freezed
class ${modelClass} extends ${entityClass} with _$${modelClass} {
  const ${modelClass}._();

  @JsonSerializable(explicitToJson: true) 
  const factory ${modelClass}({
${factoryParams}
  }) = _${modelClass};

  factory ${modelClass}.fromJson(Map<String, dynamic> json) => _$${modelClass}FromJson(json);

  @override
  ${entityClass} toEntity() {
    return ${entityClass}(
${toEntityFields}
    );
  }

  static ${modelClass} fromEntity(${entityClass} entity) {
    return ${modelClass}(
${fromEntityFields}
    );
  }
}
`;
}