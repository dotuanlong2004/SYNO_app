import '../../domain/entities/student_link_info.dart';

class StudentLinkInfoModel extends StudentLinkInfo {
  const StudentLinkInfoModel({
    required super.id,
    required super.studentCode,
    required super.fullName,
    required super.className,
    required super.linkCode,
    required super.linked,
    required super.parentName,
  });

  factory StudentLinkInfoModel.fromJson(Map<String, dynamic> json) {
    int parseInt(dynamic value, {required int fallback}) {
      if (value is int) return value;
      if (value is num) return value.toInt();
      final parsed = int.tryParse('$value');
      return parsed ?? fallback;
    }

    String parseString(dynamic value, {required String fallback}) {
      if (value == null) return fallback;
      final text = '$value'.trim();
      return text.isEmpty ? fallback : text;
    }

    bool parseBool(dynamic value, {required bool fallback}) {
      if (value is bool) return value;
      final normalized = '$value'.trim().toLowerCase();
      if (normalized == 'true' || normalized == '1') return true;
      if (normalized == 'false' || normalized == '0') return false;
      return fallback;
    }

    return StudentLinkInfoModel(
      id: parseInt(json['id'], fallback: 0),
      studentCode: parseString(json['student_code'], fallback: ''),
      fullName: parseString(json['full_name'], fallback: ''),
      className: parseString(json['class_name'], fallback: ''),
      linkCode: parseString(json['link_code'], fallback: ''),
      linked: parseBool(json['linked'], fallback: false),
      parentName: parseString(json['parent_name'], fallback: ''),
    );
  }
}
