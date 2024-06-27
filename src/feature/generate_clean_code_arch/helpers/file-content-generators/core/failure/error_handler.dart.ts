export default function AppErrorHandlerDart() {
  return `// ! DO NOT MODIFY THIS FILE

import '../common/exports.dart';

class AppErrorHandler {
  final String message;
  final String? code;
  final String? data;
  final bool status;
  AppErrorHandler({
    required this.message,
    this.code,
    this.data,
    required this.status,
  });

  AppErrorHandler copyWith({
    String? message,
    String? code,
    String? data,
    bool? status,
  }) {
    return AppErrorHandler(
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

  factory AppErrorHandler.fromMap(Map<String, dynamic> map) {
    return AppErrorHandler(
      message: map['message'] as String,
      code: map['code'] != null ? map['code'] as String : null,
      data: map['data'] != null ? map['data'] as String : null,
      status: map['status'] as bool,
    );
  }

  String toJson() => json.encode(toMap());

  factory AppErrorHandler.fromJson(String source) =>
      AppErrorHandler.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'AppErrorHandler(message: $message, code: $code, data: $data, status: $status)';
  }

  @override
  bool operator ==(covariant AppErrorHandler other) {
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

  static AppErrorHandler fromDioException(DioException e) {
    return AppErrorHandler(
      message: e.message ?? i10n.error_somethingWentWrong,
      code: e.response?.statusCode.toString(),
      data: e.response?.data.toString(),
      status: false,
    );
  }
}
`;
}
