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
    return StudentLinkInfoModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      studentCode: (json['student_code'] as String?) ?? '',
      fullName: (json['full_name'] as String?) ?? '',
      className: (json['class_name'] as String?) ?? '',
      linkCode: (json['link_code'] as String?) ?? '',
      linked: (json['linked'] as bool?) ?? false,
      parentName: (json['parent_name'] as String?) ?? '',
    );
  }
}
