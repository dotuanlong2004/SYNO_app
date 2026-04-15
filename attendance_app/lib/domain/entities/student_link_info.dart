class StudentLinkInfo {
  const StudentLinkInfo({
    required this.id,
    required this.studentCode,
    required this.fullName,
    required this.className,
    required this.linkCode,
    required this.linked,
    required this.parentName,
  });

  final int id;
  final String studentCode;
  final String fullName;
  final String className;
  final String linkCode;
  final bool linked;
  final String parentName;
}
