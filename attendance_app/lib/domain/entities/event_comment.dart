class EventComment {
  const EventComment({
    required this.id,
    required this.eventId,
    required this.parentId,
    required this.commentText,
    this.createdAt,
  });

  final int id;
  final int eventId;
  final String parentId;
  final String commentText;
  final DateTime? createdAt;
}
