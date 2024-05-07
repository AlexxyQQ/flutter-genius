export default function appSettingsHiveModelDart() {
  return `
  // ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

import '../exports.dart';

part 'app_settings_hive_model.g.dart';

@HiveType(
  typeId: HiveTableConstant.appSettingsTableId,
)
class AppSettingsHiveModel {
  @HiveField(0)
  final bool firstTime;

  @HiveField(1)
  final bool goHome;

  @HiveField(2)
  final bool server;

  @HiveField(3)
  final String? user;

  @HiveField(4)
  final String? fingerPrintUser;

  @HiveField(5)
  final String? languageCode;

  @HiveField(6)
  final String? country;

  AppSettingsHiveModel({
    required this.firstTime,
    required this.goHome,
    required this.server,
    this.user,
    this.fingerPrintUser,
    this.languageCode,
    this.country,
  });

  factory AppSettingsHiveModel.empty() {
    return AppSettingsHiveModel(
      firstTime: true,
      goHome: false,
      server: false,
      user: null,
    );
  }

  AppSettingsHiveModel copyWith({
    bool? firstTime,
    bool? goHome,
    bool? server,
    String? user,
    String? fingerPrintUser,
    String? languageCode,
    String? country,
  }) {
    return AppSettingsHiveModel(
      firstTime: firstTime ?? this.firstTime,
      goHome: goHome ?? this.goHome,
      server: server ?? this.server,
      user: user ?? this.user,
      fingerPrintUser: fingerPrintUser ?? this.fingerPrintUser,
      languageCode: languageCode ?? this.languageCode,
      country: country ?? this.country,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'firstTime': firstTime,
      'goHome': goHome,
      'server': server,
      'user': user,
      'fingerPrintUser': fingerPrintUser,
      'languageCode': languageCode,
      'country': country,
    };
  }

  factory AppSettingsHiveModel.fromMap(Map<String, dynamic> map) {
    return AppSettingsHiveModel(
      firstTime: map['firstTime'] as bool,
      goHome: map['goHome'] as bool,
      server: map['server'] as bool,
      user: map['user'] != null ? map['user'] as String : null,
      fingerPrintUser: map['fingerPrintUser'] != null
          ? map['fingerPrintUser'] as String
          : null,
      languageCode:
          map['languageCode'] != null ? map['languageCode'] as String : null,
      country: map['country'] != null ? map['country'] as String : null,
    );
  }

  String toJson() => json.encode(toMap());

  factory AppSettingsHiveModel.fromJson(String source) =>
      AppSettingsHiveModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'AppSettingsHiveModel(firstTime: $firstTime, goHome: $goHome, server: $server, user: $user, fingerPrintUser: $fingerPrintUser, languageCode: $languageCode, country: $country)';
  }

  @override
  bool operator ==(covariant AppSettingsHiveModel other) {
    if (identical(this, other)) return true;

    return other.firstTime == firstTime &&
        other.goHome == goHome &&
        other.server == server &&
        other.user == user &&
        other.fingerPrintUser == fingerPrintUser &&
        other.languageCode == languageCode &&
        other.country == country;
  }

  @override
  int get hashCode {
    return firstTime.hashCode ^
        goHome.hashCode ^
        server.hashCode ^
        user.hashCode ^
        fingerPrintUser.hashCode ^
        languageCode.hashCode ^
        country.hashCode;
  }
}

  

  `;
}
