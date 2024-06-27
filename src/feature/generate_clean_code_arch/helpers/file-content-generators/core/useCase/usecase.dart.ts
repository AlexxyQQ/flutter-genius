export default function useCaseDart() {
  return `import 'package:dartz/dartz.dart';

    import '../common/exports.dart';
    
    abstract class Usecase<Type, Params> {
      Future<Either<AppErrorHandler, Type>> call(Params params);
    }
    `;
}
