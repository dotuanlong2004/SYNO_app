import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/entities/attendance_record.dart';
import 'students_admin_page.dart';
import 'timetable_page.dart';
import '../providers/dashboard_providers.dart';
import '../widgets/attendance_card.dart';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() {
      ref.read(fcmServiceProvider).initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(attendanceHistoryProvider);
    final authState = ref.watch(authControllerProvider);
    final role = authState.user?.role.toLowerCase();
    final canOpenStudentsAdmin = role == 'teacher' || role == 'admin';
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= 900;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bảng Điều Khiển Điểm Danh Học Sinh'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Đăng xuất',
            icon: const Icon(Icons.logout_rounded),
            onPressed: () =>
                ref.read(authControllerProvider.notifier).signOut(),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        child: isWide
            ? Row(
                children: <Widget>[
                  Expanded(
                    flex: 4,
                    child: Column(
                      children: <Widget>[
                        _SummaryPanel(historyAsync: historyAsync),
                        const SizedBox(height: 14),
                        _QuickActionsPanel(
                          onOpenTimetable: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => const TimetablePage(),
                              ),
                            );
                          },
                          onOpenStudentsAdmin: canOpenStudentsAdmin
                              ? () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => const StudentsAdminPage(),
                                    ),
                                  );
                                }
                              : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 6,
                    child: _HistoryPanel(historyAsync: historyAsync),
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  _SummaryPanel(historyAsync: historyAsync),
                  const SizedBox(height: 14),
                  _QuickActionsPanel(
                    onOpenTimetable: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const TimetablePage(),
                        ),
                      );
                    },
                    onOpenStudentsAdmin: canOpenStudentsAdmin
                        ? () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => const StudentsAdminPage(),
                              ),
                            );
                          }
                        : null,
                  ),
                  const SizedBox(height: 14),
                  Expanded(child: _HistoryPanel(historyAsync: historyAsync)),
                ],
              ),
      ),
    );
  }
}

class _HistoryPanel extends ConsumerWidget {
  const _HistoryPanel({required this.historyAsync});

  final AsyncValue<List<AttendanceRecord>> historyAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          'Lịch Sử Điểm Danh',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(color: const Color(0xFF1B2435)),
        ),
        const SizedBox(height: 10),
        Expanded(
          child: historyAsync.when(
            data: (List<AttendanceRecord> history) {
              if (history.isEmpty) {
                return const Center(
                  child: Text('Chưa có bản ghi điểm danh nào.'),
                );
              }
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(attendanceHistoryProvider);
                  await ref.read(attendanceHistoryProvider.future);
                },
                child: ListView.separated(
                  itemCount: history.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, index) =>
                      AttendanceCard(record: history[index]),
                ),
              );
            },
            error: (Object error, StackTrace _) =>
                Center(child: Text('Không thể tải lịch sử: $error')),
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppTheme.skyBlue),
            ),
          ),
        ),
      ],
    );
  }
}

class _SummaryPanel extends StatelessWidget {
  const _SummaryPanel({required this.historyAsync});

  final AsyncValue<List<AttendanceRecord>> historyAsync;

  @override
  Widget build(BuildContext context) {
    final int count = historyAsync.maybeWhen(
      data: (records) => records.length,
      orElse: () => 0,
    );

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: <Color>[Color(0xFF4A90E2), Color(0xFF66A9F0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x1A4A90E2),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: <Widget>[
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: Colors.white.withAlpha(30),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.school_rounded, color: Colors.white),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text(
                    'Tổng Quan Hôm Nay',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$count bản ghi điểm danh được tải',
                    style: const TextStyle(color: Color(0xFFEAF3FF)),
                  ),
                ],
              ),
            ),
            ElevatedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.notifications_active_outlined),
              label: const Text('Thông Báo'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppTheme.skyBlue,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickActionsPanel extends StatelessWidget {
  const _QuickActionsPanel({
    required this.onOpenTimetable,
    required this.onOpenStudentsAdmin,
  });

  final VoidCallback onOpenTimetable;
  final VoidCallback? onOpenStudentsAdmin;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Expanded(
          child: _ActionCard(
            title: 'Lịch học',
            subtitle: 'Xem thời khóa biểu theo từng ngày',
            icon: Icons.calendar_month_rounded,
            onTap: onOpenTimetable,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ActionCard(
            title: 'Mã liên kết',
            subtitle: onOpenStudentsAdmin == null
                ? 'Chỉ dành cho giáo viên/quản trị'
                : 'Xem danh sách học sinh và sao chép mã',
            icon: Icons.content_copy_rounded,
            onTap: onOpenStudentsAdmin ?? () {},
            enabled: onOpenStudentsAdmin != null,
          ),
        ),
      ],
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
    this.enabled = true,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: enabled ? onTap : null,
      child: Ink(
        decoration: BoxDecoration(
          color: enabled ? Colors.white : const Color(0xFFF4F6FA),
          borderRadius: BorderRadius.circular(16),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Color(0x12000000),
              blurRadius: 14,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: <Widget>[
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: enabled
                      ? AppTheme.skyBlue.withAlpha(20)
                      : AppTheme.mutedText.withAlpha(18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: enabled ? AppTheme.skyBlue : AppTheme.mutedText,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: const Color(0xFF1B2435),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
