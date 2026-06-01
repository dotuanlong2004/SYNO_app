class GradeRecord {
  const GradeRecord({
    required this.id,
    required this.studentCode,
    required this.subjectName,
    required this.midtermScore,
    required this.finalScore,
  });

  final int id;
  final String studentCode;
  final String subjectName;
  final double midtermScore;
  final double finalScore;

  double get averageScore => (midtermScore + finalScore) / 2;
}
