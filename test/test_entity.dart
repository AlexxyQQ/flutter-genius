enum AccountStatus { active, inactive, suspended, pending }

enum Role { admin, moderator, user, guest }

class TestEntity {
  // String
  final String id;
  final String? emptyId;
  final String? defaultId;

  // int
  final int age;
  final int? emptyAge;
  final int? defaultAge;

  // double
  final double grade;
  final double? emptyGrade;
  final double? defaultGrade;

  // List<String>
  final List<String> friends;
  final List<String>? emptyFriends;
  final List<String>? defaultFriends;

  // Map<String,dynamic>
  final Map<String, dynamic> group;
  final Map<String, dynamic>? emptyGroup;
  final Map<String, dynamic>? defaultGroup;

  // List<Map<String,dynamic>>
  final List<Map<String, dynamic>> listedGroup;
  final List<Map<String, dynamic>>? emptyListedGroup;
  final List<Map<String, dynamic>>? defaultListedGroup;

  // --- COMPLEX NESTED TYPES ---

  // Enums
  final AccountStatus status;
  final AccountStatus defaultStatus;

  // SubEntity
  final SubEntity mainSubEntity;
  final SubEntity? optionalSubEntity;

  // Nested Class 1 (Address)
  final Address primaryAddress;
  final Address? secondaryAddress;

  // Nested Class 2 (ProfileSettings)
  final ProfileSettingsEntity settings;

  // List of Custom Objects
  final List<Address> pastAddresses;

  const TestEntity({
    required this.id,
    this.emptyId,
    this.defaultId = 'id',

    required this.age,
    this.emptyAge,
    this.defaultAge = 18,

    required this.grade,
    this.emptyGrade,
    this.defaultGrade = 99.6,

    required this.friends,
    this.emptyFriends,
    this.defaultFriends = const ['a', 'b', 'c'],

    required this.group,
    this.emptyGroup,
    this.defaultGroup = const {'a': 1, 'b': 2, 'c': 3},

    required this.listedGroup,
    this.emptyListedGroup,
    this.defaultListedGroup = const [
      {'a': 1, 'b': 2, 'c': 3},
      {'d': 4, 'e': 5, 'f': 6},
    ],

    required this.status,
    this.defaultStatus = AccountStatus.pending,

    required this.mainSubEntity,
    this.optionalSubEntity,

    required this.primaryAddress,
    this.secondaryAddress,

    required this.settings,

    this.pastAddresses = const [],
  });
}

class SubEntity {
  final String subId;
  final String description;

  // bool
  final bool isActive;
  final bool isVisible;

  // DateTime
  final DateTime createdAt;
  final DateTime? updatedAt;

  const SubEntity({
    required this.subId,
    required this.description,

    required this.isActive,
    this.isVisible = true,

    required this.createdAt,
    this.updatedAt,
  });
}

class ProfileSettingsEntity {
  // Using the Enum inside the nested class
  final Role userRole;
  final Role fallbackRole;

  final bool emailNotificationsEnabled;
  final bool smsNotificationsEnabled;

  // Deeply nested custom class
  final Address? billingAddress;

  const ProfileSettingsEntity({
    required this.userRole,
    this.fallbackRole = Role.guest,

    this.emailNotificationsEnabled = true,
    this.smsNotificationsEnabled = false,

    this.billingAddress,
  });
}

class Address {
  final String street;
  final String city;
  final String zipCode;

  // double for coordinates
  final double latitude;
  final double longitude;

  final bool isVerified;

  const Address({
    required this.street,
    required this.city,
    required this.zipCode,

    required this.latitude,
    required this.longitude,

    this.isVerified = false,
  });
}
