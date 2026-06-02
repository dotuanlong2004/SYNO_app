class GradeRecord {
  const GradeRecord({
    required this.id,
    required this.studentCode,
    required this.subjectName,
    required this.midtermScore,
    required this.finalScore,
    this.semester = '',
  });

  final int id;
  final String studentCode;
  final String subjectName;
  final double midtermScore;
  final double finalScore;
  final String semester;

  double get subjectAverage => (midtermScore + finalScore * 2) / 3;
}
