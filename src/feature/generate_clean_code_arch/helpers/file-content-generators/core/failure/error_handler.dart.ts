export default function FailureDart() {
  return `// ! DO NOT MODIFY THIS FILE

import '../common/exports.dart';

class Failure {
  final String message;
  final String? code;
  final String? data;
  final bool status;
  Failure({
    required this.message,
    this.code,
    this.data,
    required this.status,
  });

  Failure copyWith({
    String? message,
    String? code,
    String? data,
    bool? status,
  }) {
    return Failure(
      message: message ?? this.message,
      code: code ?? this.code,
      data: data ?? this.data,
      status: status ?? this.status,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'message': message,
      'code': code,
      'data': data,
      'status': status,
    };
  }

  factory Failure.fromMap(Map<String, dynamic> map) {
    return Failure(
      message: map['message'] as String,
      code: map['code'] != null ? map['code'] as String : null,
      data: map['data'] != null ? map['data'] as String : null,
      status: map['status'] as bool,
    );
  }

  String toJson() => json.encode(toMap());

  factory Failure.fromJson(String source) =>
      Failure.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'Failure(message: $message, code: $code, data: $data, status: $status)';
  }

  @override
  bool operator ==(covariant Failure other) {
    if (identical(this, other)) return true;

    return other.message == message &&
        other.code == code &&
        other.data == data &&
        other.status == status;
  }

  @override
  int get hashCode {
    return message.hashCode ^ code.hashCode ^ data.hashCode ^ status.hashCode;
  }

  static Failure fromDioException(DioException e) {
    return Failure(
      message: e.message ?? locator<I10n>().error_somethingWentWrong,
      code: e.response?.statusCode.toString(),
      data: e.response?.data.toString(),
      status: false,
    );
  }
}
`;
}
