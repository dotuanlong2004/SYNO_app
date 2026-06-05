class SchoolInfo {
  const SchoolInfo({
    required this.id,
    required this.name,
    required this.code,
    required this.websiteUrl,
    required this.address,
    required this.phone,
    required this.email,
    required this.description,
    required this.educationLevels,
  });

  final String id;
  final String name;
  final String code;
  final String websiteUrl;
  final String address;
  final String phone;
  final String email;
  final String description;
  final List<String> educationLevels;

  bool get hasContact =>
      address.isNotEmpty || phone.isNotEmpty || email.isNotEmpty;
}
