export default function DioErrorInterceptorDart() {
  return `// ! DO NOT MODIFY THIS FILE

import '../../common/exports.dart';

class DioErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response != null) {
      // Handle server errors
      if (err.response!.statusCode! >= 300) {
        err = DioException(
          requestOptions: err.requestOptions,
          response: err.response,
          error: locator<I10n>().error_serverError,
          type: err.type,
        );
      } else {
        err = DioException(
          requestOptions: err.requestOptions,
          response: err.response,
          error: locator<I10n>().error_somethingWentWrong,
          type: err.type,
        );
      }
    } else {
      // Handle connection errors
      err = DioException(
        requestOptions: err.requestOptions,
        error: locator<I10n>().error_connectionError,
        type: err.type,
      );
    }
    super.onError(err, handler);
  }
}
`;
}
