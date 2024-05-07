export default function apiDart() {
  return `
  
  import '../../common/exports.dart';


/// A service class for handling API requests using the Dio package.
///
/// This class encapsulates the Dio client configuration and setup, making it
/// easy to manage and use across the application. It includes default settings
/// for the base URL, headers, timeouts, and logging. It also integrates a custom
/// error interceptor for Dio requests.
class Api {
  final Dio _dio = Dio();

  /// Constructor for [Api].
  ///
  /// Configures the Dio client with default settings, including base URL,
  /// headers, timeouts, and interceptors for logging and error handling.
  Api() {
    _dio
      ..options.baseUrl = ApiEndpoints.baseAPIURL
      ..options.headers = ApiEndpoints.defaultHeaders
      ..options.receiveTimeout = ApiEndpoints.receiveTimeout
      ..options.connectTimeout = ApiEndpoints.receiveTimeout
      // Adding PrettyDioLogger for detailed logging of requests and responses.
      ..interceptors.add(
        PrettyDioLogger(
          requestBody: true,
          requestHeader: true,
          responseBody: true,
          responseHeader: true,
        ),
      )
      // Adding a custom error interceptor for enhanced error handling.
      ..interceptors.add(DioErrorInterceptor());
  }

  /// Provides access to the configured Dio client for sending requests.
  ///
  /// This getter allows access to the Dio instance for making API calls
  /// with all the predefined configurations and interceptors.
  Dio get sendRequest => _dio;
}
`;
}
