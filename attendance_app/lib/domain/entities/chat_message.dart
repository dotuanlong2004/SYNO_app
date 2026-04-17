class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.studentCode,
    required this.senderRole,
    required this.senderName,
    required this.messageText,
    required this.createdAt,
  });

  final int id;
  final String studentCode;
  final String senderRole;
  final String senderName;
  final String messageText;
  final DateTime? createdAt;
}
