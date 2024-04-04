export default function apiEndpointsConstantsDart() {
  return `
  class ApiEndpoints {
    static const Duration receiveTimeout = Duration(seconds: 3);
  
    static const String baseDomain = "https://example.com";
    static const String baseAPIURL = "https://example.com/api/v1";
    static const Map<String, dynamic> defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  
    // Endpoints
    static const String initialURL = "/";
  
    // Example
    static const String exampleURL = "/example";
    // Auth
    static String loginURL = "/auth/login";
    static String registerURL = "/auth/register";
  }
  
  `;
}
