class AnnouncementItem {
  const AnnouncementItem({
    required this.id,
    required this.title,
    required this.content,
    required this.priority,
    required this.publishedAt,
    this.imageUrl,
  });

  final int id;
  final String title;
  final String content;
  final String priority;
  final DateTime? publishedAt;
  final String? imageUrl;
}
