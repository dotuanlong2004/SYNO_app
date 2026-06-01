class SchoolEventItem {
  const SchoolEventItem({
    required this.id,
    required this.title,
    required this.content,
    required this.imageUrl,
    required this.eventDate,
    required this.publishedAt,
  });

  final int id;
  final String title;
  final String content;
  final String imageUrl;
  final DateTime? eventDate;
  final DateTime? publishedAt;
}
