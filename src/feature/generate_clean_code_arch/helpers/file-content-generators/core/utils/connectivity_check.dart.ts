export default function connectivityCheckDart() {
  return `

// ! DO NOT MODIFY THIS FILE

import '../common/exports.dart';

/// A utility class for checking network connectivity and server status.
///
/// This class provides methods to check the current network connectivity
/// state and to verify if a server is up and reachable.
class ConnectivityCheck {
  /// Checks the current network connectivity.
  ///
  /// Returns \`true\` if the device is connected to either mobile data or Wi-Fi,
  /// and \`false\` if there is no network connection.
  static Future<bool> connectivity() async {
    var connectivityResult = await Connectivity().checkConnectivity();
    return connectivityResult != ConnectivityResult.none;
  }

  /// Checks if the server is up and reachable.
  ///
  /// Optionally, a recheck can be performed to send a request to the server
  /// and verify its response. If \`recheck\` is false, the method returns the
  /// cached server status from the settings.
  ///
  /// [recheck]: If true, performs a live check by sending a request to the server.
  ///
  /// Returns \`true\` if the server is up, and \`false\` if the server is down
  /// or unreachable.
  static Future<bool> isServerUp({bool recheck = false}) async {
    try {
      final settings = await locator<SettingsHiveService>().getSettings();

      if (recheck) {
        final api = GetIt.instance.get<Api>();
        final response = await api.sendRequest.get(
          ApiEndpoints.initialURL,
        );

        bool isServerUp = response.statusCode == 200;
        await locator<SettingsHiveService>().updateSettings(
          settings.copyWith(server: isServerUp),
        );
        return isServerUp;
      } else {
        return settings.server;
      }
    } catch (e) {
      return false;
    }
  }
}
`;
}
