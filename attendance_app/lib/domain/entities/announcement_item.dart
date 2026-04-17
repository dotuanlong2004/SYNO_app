class AnnouncementItem {
  const AnnouncementItem({
    required this.id,
    required this.title,
    required this.content,
    required this.publishedAt,
  });

  final int id;
  final String title;
  final String content;
  final DateTime? publishedAt;
}
