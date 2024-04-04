import { toPascalCase } from "../../../../utils/pascal-case";

export function cubitFileContent(featureName: string, state: boolean) {
  if (state) {
    return `
    import 'dart:convert';

class ${toPascalCase(featureName)}State {
    final bool isLoading;
    final bool isSuccess;
    ${toPascalCase(featureName)}State({
      required this.isLoading,
      required this.isSuccess,
    });
  
    factory ${toPascalCase(featureName)}State.initial() {
      return ${toPascalCase(featureName)}State(
        isLoading: false,
        isSuccess: false,
      );
    }
  
    ${toPascalCase(featureName)}State copyWith({
      bool? isLoading,
      bool? isSuccess,
    }) {
      return ${toPascalCase(featureName)}State(
        isLoading: isLoading ?? this.isLoading,
        isSuccess: isSuccess ?? this.isSuccess,
      );
    }
  
    Map<String, dynamic> toMap() {
      return <String, dynamic>{
        'isLoading': isLoading,
        'isSuccess': isSuccess,
      };
    }
  
    factory ${toPascalCase(
      featureName
    )}State.fromMap(Map<String, dynamic> map) {
      return ${toPascalCase(featureName)}State(
        isLoading: map['isLoading'] as bool,
        isSuccess: map['isSuccess'] as bool,
      );
    }
  
    String toJson() => json.encode(toMap());
  
    factory ${toPascalCase(featureName)}State.fromJson(String source) =>
        ${toPascalCase(
          featureName
        )}State.fromMap(json.decode(source) as Map<String, dynamic>);
  
    @override
    String toString() =>
        '${toPascalCase(
          featureName
        )}State(isLoading: $isLoading, isSuccess: $isSuccess)';
  
    @override
    bool operator ==(covariant ${toPascalCase(featureName)}State other) {
      if (identical(this, other)) return true;
  
      return other.isLoading == isLoading && other.isSuccess == isSuccess;
    }
  
    @override
    int get hashCode => isLoading.hashCode ^ isSuccess.hashCode;
  }
        `;
  }

  return `
  import 'package:flutter_bloc/flutter_bloc.dart';
  import '${featureName}_state.dart';

  class ${toPascalCase(featureName)}Cubit extends Cubit<${toPascalCase(
    featureName
  )}State> {
    ${toPascalCase(featureName)}Cubit() : super(${toPascalCase(
    featureName
  )}State.initial());}
            `;
}
