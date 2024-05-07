export default function useCaseDart() {
  return `import 'package:dartz/dartz.dart';

    import '../common/exports.dart';
    
    abstract class Usecase<Type, Params> {
      Future<Either<Failure, Type>> call(Params params);
    }
    `;
}
