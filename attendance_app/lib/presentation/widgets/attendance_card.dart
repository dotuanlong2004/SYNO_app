import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/entities/attendance_record.dart';

class AttendanceCard extends StatelessWidget {
  const AttendanceCard({super.key, required this.record});

  final AttendanceRecord record;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: <Widget>[
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppTheme.skyBlue.withAlpha(25),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _iconByStatus(record.status),
                color: AppTheme.skyBlue,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Học sinh ${record.studentId}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: const Color(0xFF1B2435),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    DateFormat('dd/MM/yyyy - HH:mm').format(record.timestamp),
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: AppTheme.mutedText),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: _statusColor(record).withAlpha(24),
                borderRadius: BorderRadius.circular(50),
              ),
              child: Text(
                _statusText(record),
                style: TextStyle(
                  color: _statusColor(record),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static IconData _iconByStatus(AttendanceStatus status) {
    return switch (status) {
      AttendanceStatus.onTime => Icons.check_circle_outline_rounded,
      AttendanceStatus.late => Icons.schedule_rounded,
      AttendanceStatus.leave => Icons.logout_rounded,
    };
  }

  static String _statusText(AttendanceRecord record) {
    return switch (record.status) {
      AttendanceStatus.onTime => 'Đúng giờ',
      AttendanceStatus.leave => 'Xin nghỉ',
      AttendanceStatus.late => 'Trễ ${record.lateMinutes ?? 0} phút',
    };
  }

  static Color _statusColor(AttendanceRecord record) {
    return switch (record.status) {
      AttendanceStatus.onTime => const Color(0xFF1E9E62),
      AttendanceStatus.late => const Color(0xFFDD8B22),
      AttendanceStatus.leave => AppTheme.skyBlue,
    };
  }
}
