export default function hiveTableConstantDart() {
  return `
    class HiveTableConstant {
        HiveTableConstant._();
      
        // App Settings
        static const int appSettingsTableId = 0;
        static const String appSettingsBox = "appSettingsBox";
      
        // User
        static const int userTableId = 1;
        static const String userBox = "userBox";
      }
      
    `;
}
