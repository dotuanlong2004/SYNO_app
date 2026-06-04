import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/entities/attendance_record.dart';
import '../../domain/entities/chat_message.dart';
import '../../domain/entities/fee_notice.dart';
import '../../domain/entities/grade_record.dart';
import '../../domain/entities/school_event_item.dart';
import '../../domain/entities/timetable_entry.dart';
import '../providers/dashboard_providers.dart';
import '../../domain/entities/student_link_info.dart';
import '../providers/student_info_provider.dart';
import '../widgets/brand_logo.dart';
import 'settings_page.dart';

const double _listBottomPadding = 96;

String _formatViDate(DateTime value) {
  return DateFormat('dd/MM/yyyy').format(value.toLocal());
}

String _formatViDateTime(DateTime value) {
  return DateFormat('dd/MM/yyyy HH:mm').format(value.toLocal());
}

String _formatViTime(DateTime value) {
  return DateFormat('HH:mm').format(value.toLocal());
}

String _senderDisplayName(ChatMessage message) {
  final role = message.senderRole.toLowerCase();
  if (role == 'parent') return 'Phụ huynh';
  return 'Nhà trường';
}

String _attendanceTypeLabel(AttendanceRecord record) {
  return record.logType == AttendanceLogType.checkOut ? 'Ra' : 'Vào';
}

String _attendanceStatusLabel(AttendanceRecord record) {
  switch (record.status) {
    case AttendanceStatus.late:
      return 'Muộn';
    case AttendanceStatus.onTime:
      return 'Đúng giờ';
    case AttendanceStatus.leave:
      return record.logType == AttendanceLogType.checkOut ? 'Ra' : 'Đúng giờ';
  }
}

String _naturalEventContent(String content) {
  if (content.trim().toLowerCase() == 'cho các học sinh đi chơi') {
    return 'Nhà trường tổ chức hoạt động tham quan cho học sinh lớp 10C2.';
  }
  return content;
}

Future<void> _confirmSignOut(BuildContext context, WidgetRef ref) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Đăng xuất'),
      content: const Text('Bạn có chắc muốn đăng xuất không?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Đăng xuất'),
        ),
      ],
    ),
  );
  if (confirmed == true) {
    await ref.read(authControllerProvider.notifier).signOut();
  }
}

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    // 4 tab chính
    final pages = <Widget>[
      const _OverviewTab(),
      const _HistoryTab(),
      const _TimetableTab(),
      const _EventsTab(),
      const _ProfileTab(), // Tab Cá nhân thay cho các tab riêng lẻ
    ];
    final titles = <String>[
      'Tổng quan',
      'Lịch sử',
      'Lịch học',
      'Sự kiện',
      'Cá nhân',
    ];
    final destinations = <NavigationDestination>[
      const NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard_rounded),
        label: 'Tổng quan',
      ),
      const NavigationDestination(
        icon: Icon(Icons.history_rounded),
        label: 'Lịch sử',
      ),
      const NavigationDestination(
        icon: Icon(Icons.calendar_month_outlined),
        selectedIcon: Icon(Icons.calendar_month_rounded),
        label: 'Lịch học',
      ),
      const NavigationDestination(
        icon: Icon(Icons.event_note_outlined),
        selectedIcon: Icon(Icons.event_note_rounded),
        label: 'Sự kiện',
      ),
      const NavigationDestination(
        icon: Icon(Icons.person_outline_rounded),
        selectedIcon: Icon(Icons.person_rounded),
        label: 'Cá nhân',
      ),
    ];
    final selectedIndex = _tabIndex >= pages.length ? 0 : _tabIndex;

    return Scaffold(
      backgroundColor: AppTheme.lightGrayBackground,
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.all(8),
          child: const BrandLogo(size: 36, showText: false),
        ),
        title: Text(titles[selectedIndex]),
        actions: <Widget>[
          Builder(
            builder: (context) => IconButton(
              tooltip: 'Menu',
              icon: const Icon(Icons.menu_rounded),
              onPressed: () => Scaffold.of(context).openEndDrawer(),
            ),
          ),
        ],
      ),
      endDrawer: _buildEndDrawer(context),
      body: SafeArea(
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: MediaQuery.textScalerOf(
              context,
            ).clamp(maxScaleFactor: 1.08),
          ),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 260),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, animation) {
              final slide = Tween<Offset>(
                begin: const Offset(0.025, 0),
                end: Offset.zero,
              ).animate(animation);
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(position: slide, child: child),
              );
            },
            child: KeyedSubtree(
              key: ValueKey<int>(selectedIndex),
              child: pages[selectedIndex],
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: MediaQuery.textScalerOf(
              context,
            ).clamp(maxScaleFactor: 1.0),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: NavigationBar(
              height: 68,
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
              selectedIndex: selectedIndex,
              onDestinationSelected: (value) =>
                  setState(() => _tabIndex = value),
              destinations: destinations,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEndDrawer(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primaryColor, AppTheme.deepBlue],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Icon(Icons.school_rounded, color: Colors.white, size: 48),
                const SizedBox(height: 8),
                const Text(
                  'SYNO',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Phụ huynh',
                  style: TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.receipt_long_rounded),
            title: const Text('Học phí'),
            onTap: () {
              Navigator.pop(context);
              _showFeesDialog(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.campaign_rounded),
            title: const Text('Thông báo'),
            onTap: () {
              Navigator.pop(context);
              _showNewsDialog(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.forum_rounded),
            title: const Text('Tin nhắn'),
            onTap: () {
              Navigator.pop(context);
              _showChatDialog(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.school_rounded),
            title: const Text('Bảng điểm'),
            onTap: () {
              Navigator.pop(context);
              _showGradesDialog(context);
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.settings_rounded),
            title: const Text('Cài đặt'),
            onTap: () {
              Navigator.pop(context);
              _navigateToSettings(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Colors.red),
            title: const Text('Đăng xuất', style: TextStyle(color: Colors.red)),
            onTap: () {
              Navigator.pop(context);
              _confirmSignOut(context, ref);
            },
          ),
        ],
      ),
    );
  }

  void _showFeesDialog(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Học phí')),
          backgroundColor: AppTheme.lightGrayBackground,
          body: const _FeesTab(),
        ),
      ),
    );
  }

  void _showNewsDialog(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Thông báo')),
          backgroundColor: AppTheme.lightGrayBackground,
          body: const _NewsTab(),
        ),
      ),
    );
  }

  void _showGradesDialog(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Bảng điểm')),
          backgroundColor: AppTheme.lightGrayBackground,
          body: const _GradesTab(),
        ),
      ),
    );
  }

  void _showChatDialog(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Tin nhắn')),
          backgroundColor: AppTheme.lightGrayBackground,
          body: const _ChatTab(),
        ),
      ),
    );
  }

  void _navigateToSettings(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SettingsPage()),
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(attendanceHistoryProvider);
    final studentsAsync = ref.watch(linkedStudentsProvider);
    final today = DateTime.now();
    final dateLabel = DateFormat('EEEE, dd/MM/yyyy', 'vi').format(today);

    final todayRecords = historyAsync.maybeWhen(
      data: (records) => records.where((r) {
        final local = r.timestamp.toLocal();
        return local.year == today.year &&
            local.month == today.month &&
            local.day == today.day;
      }).toList()..sort((a, b) => a.timestamp.compareTo(b.timestamp)),
      orElse: () => <AttendanceRecord>[],
    );

    // Tên học sinh liên kết (lấy cái đầu tiên đã liên kết)
    final linkedStudent = studentsAsync.maybeWhen(
      data: (list) {
        for (final student in list) {
          if (student.linked) return student;
        }
        return null;
      },
      orElse: () => null,
    );

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(attendanceHistoryProvider);
        ref.invalidate(linkedStudentsProvider);
        try {
          await Future.wait([
            ref.read(attendanceHistoryProvider.future),
            ref.read(linkedStudentsProvider.future),
          ]);
        } catch (_) {}
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, _listBottomPadding),
        children: <Widget>[
          // ── Ngày hôm nay ─────────────────────────────────────────
          Text(
            dateLabel,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.grey[500],
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 10),

          // ── Hero banner điểm danh ────────────────────────────────
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: <Color>[
                  AppTheme.primaryOrange,
                  AppTheme.primaryOrangeDark,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: const <BoxShadow>[
                BoxShadow(
                  color: Color(0x28F28C28),
                  blurRadius: 16,
                  offset: Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(40),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.how_to_reg_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          const Text(
                            'Điểm danh hôm nay',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 17,
                            ),
                          ),
                          if (linkedStudent != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              '${linkedStudent.fullName} • ${linkedStudent.className}',
                              style: const TextStyle(
                                color: Color(0xFFFFE0B2),
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(30),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        todayRecords.isEmpty
                            ? '0 lượt'
                            : '${todayRecords.length} lượt',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
                if (todayRecords.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  const Divider(color: Colors.white24, height: 1),
                  const SizedBox(height: 12),
                  ...todayRecords.take(3).map(
                    (r) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                        'Đã điểm danh ${_attendanceTypeLabel(r).toLowerCase()} lúc ${_formatViTime(r.timestamp)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 10),
                  const Text(
                    'Chưa có lượt điểm danh hôm nay.',
                    style: TextStyle(color: Color(0xFFFFE0B2), fontSize: 13),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 18),

          // ── Trạng thái loading/lỗi của history ───────────────────
          if (historyAsync.isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(8),
                child: CircularProgressIndicator(
                  color: AppTheme.primaryOrange,
                  strokeWidth: 2,
                ),
              ),
            ),
          if (historyAsync.hasError)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.wifi_off_rounded,
                      color: Colors.red,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Không thể tải điểm danh',
                        style: TextStyle(
                          color: Colors.red.shade700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // ── Timeline chi tiết nếu có nhiều hơn 4 lượt ────────────
          if (todayRecords.length > 4) ...[
            Text(
              'Chi tiết hôm nay',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: const Color(0xFF1B2435),
              ),
            ),
            const SizedBox(height: 8),
            ...todayRecords.skip(4).map((r) => _TodayRecordTile(record: r)),
            const SizedBox(height: 14),
          ],

          // ── Học sinh liên kết ─────────────────────────────────────
          Row(
            children: [
              Text(
                'Học sinh liên kết',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF1B2435),
                ),
              ),
              const Spacer(),
              if (studentsAsync.isLoading)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppTheme.primaryOrange,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          studentsAsync.when(
            data: (students) {
              if (students.isEmpty) {
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: const Row(
                    children: [
                      Icon(
                        Icons.child_care_rounded,
                        color: Colors.grey,
                        size: 20,
                      ),
                      SizedBox(width: 10),
                      Text(
                        'Chưa có học sinh liên kết',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                );
              }
              return Column(
                children: students
                    .map((s) => _LinkedStudentCard(student: s))
                    .toList(),
              );
            },
            error: (e, _) => Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Không thể tải danh sách học sinh',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
            ),
            loading: () => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

class _TodayRecordTile extends StatelessWidget {
  const _TodayRecordTile({required this.record});
  final AttendanceRecord record;

  @override
  Widget build(BuildContext context) {
    final isCheckIn = record.logType == AttendanceLogType.checkIn;
    final time = _formatViTime(record.timestamp);
    final label = isCheckIn ? 'Vào' : 'Ra';
    final chipColor = isCheckIn
        ? const Color(0xFF16A34A)
        : const Color(0xFFF59E0B);
    final icon = isCheckIn ? Icons.login_rounded : Icons.logout_rounded;
    final lateText =
        (record.status == AttendanceStatus.late && record.lateMinutes != null)
        ? '  •  Trễ ${record.lateMinutes} phút'
        : '';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: chipColor.withAlpha(60)),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: <Widget>[
          CircleAvatar(
            radius: 20,
            backgroundColor: chipColor.withAlpha(24),
            child: Icon(icon, color: chipColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '$label học$lateText',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
          ),
          Text(
            time,
            style: TextStyle(
              color: chipColor,
              fontWeight: FontWeight.w700,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionChip extends StatelessWidget {
  const _QuickActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 48),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE3EBF8)),
          ),
          child: Column(
            children: [
              Icon(icon, color: AppTheme.primaryColor, size: 20),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Card học sinh liên kết ────────────────────────────────────────────────
class _LinkedStudentCard extends StatelessWidget {
  const _LinkedStudentCard({required this.student});
  final StudentLinkInfo student;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppTheme.primaryOrange.withAlpha(20),
            child: const Icon(
              Icons.child_care_rounded,
              color: AppTheme.primaryOrange,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.fullName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Mã: ${student.studentCode} • Lớp: ${student.className}',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: student.linked
                  ? const Color(0xFFDCFCE7)
                  : const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              student.linked ? 'Đã liên kết' : 'Chờ xác nhận',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: student.linked
                    ? const Color(0xFF16A34A)
                    : const Color(0xFFD97706),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryTab extends ConsumerWidget {
  const _HistoryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(attendanceHistoryProvider);

    return historyAsync.when(
      data: (records) {
        if (records.isEmpty) {
          return const _EmptyState(
            icon: Icons.inbox_outlined,
            message: 'Chưa có lịch sử điểm danh trong khoảng thời gian này.',
          );
        }

        final grouped = <String, List<AttendanceRecord>>{};
        for (final record in records) {
          final key = _formatViDate(record.timestamp);
          grouped.putIfAbsent(key, () => <AttendanceRecord>[]).add(record);
        }

        final dates = grouped.keys.toList()
          ..sort((a, b) {
            final da = DateFormat('dd/MM/yyyy').parse(a);
            final db = DateFormat('dd/MM/yyyy').parse(b);
            return db.compareTo(da);
          });

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(attendanceHistoryProvider);
            await ref.read(attendanceHistoryProvider.future);
          },
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, _listBottomPadding),
            itemCount: dates.length,
            itemBuilder: (context, index) {
              final date = dates[index];
              final dayRecords = grouped[date]!;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      date,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: const Color(0xFF1B2435),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...dayRecords.map((record) => _HistoryCard(record: record)),
                  ],
                ),
              );
            },
          ),
        );
      },
      error: (error, _) => Center(child: Text('Không thể tải lịch sử: $error')),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.skyBlue),
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.record});

  final AttendanceRecord record;

  @override
  Widget build(BuildContext context) {
    final localTime = _formatViTime(record.timestamp);
    final isOut = record.logType == AttendanceLogType.checkOut;
    final chipColor = isOut ? const Color(0xFFF59E0B) : const Color(0xFF16A34A);
    final chipLabel = _attendanceTypeLabel(record);
    final statusLabel = _attendanceStatusLabel(record);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x0F000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: <Widget>[
          const CircleAvatar(
            radius: 18,
            backgroundColor: Color(0xFFEFF5FF),
            child: Icon(
              Icons.access_time_rounded,
              color: AppTheme.skyBlue,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  '$localTime • $chipLabel',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                Text(
                  statusLabel,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: chipColor.withAlpha(24),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              chipLabel,
              style: TextStyle(color: chipColor, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Tiết học chuẩn THPT VN ──────────────────────────────────────────────────
// Sáng: 5 tiết (7:30–11:40), Chiều: 5 tiết (13:00–17:10)
class _TimetableTab extends ConsumerStatefulWidget {
  const _TimetableTab();

  @override
  ConsumerState<_TimetableTab> createState() => _TimetableTabState();
}

class _TimetableTabState extends ConsumerState<_TimetableTab>
    with SingleTickerProviderStateMixin {
  static const _days = [1, 2, 3, 4, 5, 6];
  static const _dayLabels = ['T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7'];
  static const _dayFull = [
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ];

  // Giờ chuẩn THPT VN — 5 tiết sáng, 5 tiết chiều
  static const _morningSlots = [
    ('Tiết 1', '07:30', '08:15'),
    ('Tiết 2', '08:20', '09:05'),
    ('Tiết 3', '09:15', '10:00'),
    ('Tiết 4', '10:05', '10:50'),
    ('Tiết 5', '10:55', '11:40'),
  ];
  static const _afternoonSlots = [
    ('Tiết 6', '13:00', '13:45'),
    ('Tiết 7', '13:50', '14:35'),
    ('Tiết 8', '14:45', '15:30'),
    ('Tiết 9', '15:35', '16:20'),
    ('Tiết 10', '16:25', '17:10'),
  ];

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    final todayIdx = _days.indexOf(DateTime.now().weekday).clamp(0, 5);
    _tabController = TabController(
      length: _days.length,
      vsync: this,
      initialIndex: todayIdx,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // Map entry theo start time (HH:mm)
  TimetableEntry? _findEntry(
    List<TimetableEntry> dayEntries,
    String slotStart,
  ) {
    // Tìm entry có startTime gần nhất với slotStart (trong khoảng ±30 phút)
    final slotH = int.tryParse(slotStart.split(':')[0]) ?? 0;
    final slotM = int.tryParse(slotStart.split(':')[1]) ?? 0;
    final slotMinutes = slotH * 60 + slotM;

    TimetableEntry? best;
    int bestDiff = 35; // threshold 35 phút
    for (final e in dayEntries) {
      final parts = e.startTime.split(':');
      if (parts.length < 2) continue;
      final eH = int.tryParse(parts[0]) ?? 0;
      final eM = int.tryParse(parts[1]) ?? 0;
      final eMinutes = eH * 60 + eM;
      final diff = (eMinutes - slotMinutes).abs();
      if (diff < bestDiff) {
        bestDiff = diff;
        best = e;
      }
    }
    return best;
  }

  @override
  Widget build(BuildContext context) {
    final timetableAsync = ref.watch(timetableProvider);
    final todayDow = DateTime.now().weekday;
    const kGreen = Color(0xFF1B9E7A);

    return timetableAsync.when(
      data: (entries) {
        if (entries.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.calendar_today_outlined,
                  size: 56,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 8),
                Text(
                  'Hôm nay chưa có tiết học nào được cập nhật.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 15),
                ),
              ],
            ),
          );
        }

        // Group by dayOfWeek, sort by startTime
        final grouped = <int, List<TimetableEntry>>{};
        for (final e in entries) {
          grouped.putIfAbsent(e.dayOfWeek, () => []).add(e);
        }
        for (final list in grouped.values) {
          list.sort((a, b) => a.startTime.compareTo(b.startTime));
        }

        return Column(
          children: [
            // ── Tab chọn ngày ─────────────────────────────────────
            Container(
              color: kGreen,
              child: TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white60,
                indicatorColor: AppTheme.primaryOrange,
                indicatorWeight: 3,
                labelStyle: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
                unselectedLabelStyle: const TextStyle(fontSize: 11),
                tabs: List.generate(_days.length, (i) {
                  final isToday = _days[i] == todayDow;
                  return Tab(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_dayLabels[i]),
                        if (isToday)
                          Container(
                            width: 5,
                            height: 5,
                            decoration: const BoxDecoration(
                              color: AppTheme.primaryOrange,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                  );
                }),
              ),
            ),

            // ── Nội dung TKB từng ngày ────────────────────────────
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: List.generate(_days.length, (i) {
                  final day = _days[i];
                  final dayEntries = grouped[day] ?? [];
                  final isToday = day == todayDow;

                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(timetableProvider);
                      await ref.read(timetableProvider.future);
                    },
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(
                        12,
                        10,
                        12,
                        _listBottomPadding,
                      ),
                      children: [
                        // Header ngày
                        Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: isToday ? AppTheme.primaryOrange : kGreen,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Text(
                                _dayFull[i],
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                              if (isToday) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withAlpha(40),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Text(
                                    'Hôm nay',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ],
                              const Spacer(),
                              Text(
                                '${dayEntries.length} tiết',
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // ── Buổi Sáng ──────────────────────────────
                        _SessionHeader(
                          label: 'BUỔI SÁNG',
                          icon: Icons.wb_sunny_rounded,
                          color: const Color(0xFFF59E0B),
                        ),
                        const SizedBox(height: 6),
                        ..._morningSlots.map((slot) {
                          final entry = _findEntry(dayEntries, slot.$2);
                          return _PeriodRow(
                            periodLabel: slot.$1,
                            startTime: slot.$2,
                            endTime: slot.$3,
                            entry: entry,
                            isToday: isToday,
                          );
                        }),

                        const SizedBox(height: 14),

                        // ── Buổi Chiều ─────────────────────────────
                        _SessionHeader(
                          label: 'BUỔI CHIỀU',
                          icon: Icons.wb_twilight_rounded,
                          color: const Color(0xFF6366F1),
                        ),
                        const SizedBox(height: 6),
                        ..._afternoonSlots.map((slot) {
                          final entry = _findEntry(dayEntries, slot.$2);
                          return _PeriodRow(
                            periodLabel: slot.$1,
                            startTime: slot.$2,
                            endTime: slot.$3,
                            entry: entry,
                            isToday: isToday,
                          );
                        }),
                      ],
                    ),
                  );
                }),
              ),
            ),
          ],
        );
      },
      error: (error, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: Colors.grey),
            const SizedBox(height: 8),
            Text(
              'Không thể tải thời khóa biểu',
              style: TextStyle(
                color: Colors.grey[600],
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.primaryOrange),
      ),
    );
  }
}

class _SessionHeader extends StatelessWidget {
  const _SessionHeader({
    required this.label,
    required this.icon,
    required this.color,
  });
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 12,
            color: color,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(child: Divider(color: color.withAlpha(60), height: 1)),
      ],
    );
  }
}

class _PeriodRow extends StatelessWidget {
  const _PeriodRow({
    required this.periodLabel,
    required this.startTime,
    required this.endTime,
    required this.entry,
    required this.isToday,
  });

  final String periodLabel;
  final String startTime;
  final String endTime;
  final TimetableEntry? entry;
  final bool isToday;

  @override
  Widget build(BuildContext context) {
    final hasEntry = entry != null;
    final kGreen = const Color(0xFF1B9E7A);

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: hasEntry
            ? (isToday ? const Color(0xFFE0F5F0) : Colors.white)
            : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: hasEntry
              ? (isToday ? kGreen.withAlpha(80) : Colors.grey.shade200)
              : Colors.grey.shade200,
          width: hasEntry && isToday ? 1.5 : 1,
        ),
        boxShadow: hasEntry
            ? [
                const BoxShadow(
                  color: Color(0x08000000),
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ]
            : null,
      ),
      child: Row(
        children: [
          // Cột giờ + tiết
          SizedBox(
            width: 68,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  periodLabel,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: hasEntry
                        ? (isToday ? kGreen : AppTheme.primaryOrange)
                        : Colors.grey[400],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  startTime,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: hasEntry
                        ? (isToday ? kGreen : AppTheme.primaryOrange)
                        : Colors.grey[400],
                  ),
                ),
                Text(
                  endTime,
                  style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                ),
              ],
            ),
          ),
          // Đường phân cách
          Container(
            width: 1.5,
            height: 40,
            color: hasEntry
                ? (isToday
                      ? kGreen.withAlpha(80)
                      : AppTheme.primaryOrange.withAlpha(60))
                : Colors.grey.shade200,
            margin: const EdgeInsets.symmetric(horizontal: 10),
          ),
          // Nội dung môn học
          Expanded(
            child: hasEntry
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry!.subjectName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: Color(0xFF1B2435),
                        ),
                      ),
                      if (entry!.teacherName.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            entry!.teacherName,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ),
                    ],
                  )
                : Text(
                    'Không có tiết',
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 13,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
          ),
          // Phòng học
          if (hasEntry && entry!.room.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: isToday ? kGreen.withAlpha(20) : const Color(0xFFE5EBF6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'P.${entry!.room}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isToday ? kGreen : const Color(0xFF3B5080),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Học Phí ─────────────────────────────────────────────────────────────────
class _FeesTab extends ConsumerWidget {
  const _FeesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feesAsync = ref.watch(feeNoticesProvider);
    return feesAsync.when(
      data: (fees) {
        if (fees.isEmpty) {
          return _EmptyState(
            icon: Icons.receipt_long_rounded,
            message: 'Chưa có khoản thu nào được cập nhật.',
          );
        }
        final totalAmount = fees.fold<double>(
          0,
          (sum, fee) => sum + fee.totalAmount,
        );
        final paidAmount = fees
            .where((fee) => fee.paymentStatus == 'paid')
            .fold<double>(0, (sum, fee) => sum + fee.totalAmount);
        final pendingAmount = fees
            .where((fee) => fee.paymentStatus != 'paid')
            .fold<double>(0, (sum, fee) => sum + fee.totalAmount);
        final fmt = NumberFormat('#,###', 'vi');
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(feeNoticesProvider);
            await ref.read(feeNoticesProvider.future);
          },
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, _listBottomPadding),
            itemCount: fees.length + 1,
            itemBuilder: (context, index) {
              if (index == 0) {
                return _FeeSummaryCard(
                  totalAmount: totalAmount,
                  paidAmount: paidAmount,
                  pendingAmount: pendingAmount,
                  paidCount: fees
                      .where((fee) => fee.paymentStatus == 'paid')
                      .length,
                  totalCount: fees.length,
                  formatter: fmt,
                );
              }
              return _FeeNoticeCard(fee: fees[index - 1]);
            },
          ),
        );
      },
      error: (e, _) => _ErrorState(message: 'Không thể tải học phí'),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.primaryOrange),
      ),
    );
  }
}

class _FeeSummaryCard extends StatelessWidget {
  const _FeeSummaryCard({
    required this.totalAmount,
    required this.paidAmount,
    required this.pendingAmount,
    required this.paidCount,
    required this.totalCount,
    required this.formatter,
  });

  final double totalAmount;
  final double paidAmount;
  final double pendingAmount;
  final int paidCount;
  final int totalCount;
  final NumberFormat formatter;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x220B2A6F),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Thống kê học phí',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Đã thanh toán $paidCount/$totalCount khoản',
            style: const TextStyle(color: Color(0xFFC8D7F3), fontSize: 12),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _FeeMetric(
                  label: 'Tổng cần theo dõi',
                  value: '${formatter.format(totalAmount)} đ',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _FeeMetric(
                  label: 'Đã thanh toán',
                  value: '${formatter.format(paidAmount)} đ',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _FeeMetric(
            label: 'Còn phải thanh toán',
            value: '${formatter.format(pendingAmount)} đ',
            wide: true,
          ),
        ],
      ),
    );
  }
}

class _FeeMetric extends StatelessWidget {
  const _FeeMetric({
    required this.label,
    required this.value,
    this.wide = false,
  });

  final String label;
  final String value;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: wide ? double.infinity : null,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(20),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withAlpha(28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: Color(0xFFC8D7F3), fontSize: 11),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

double _parseMoneyValue(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}') ?? 0;
}

class _FeeNoticeCard extends StatelessWidget {
  const _FeeNoticeCard({required this.fee});
  final FeeNotice fee;

  @override
  Widget build(BuildContext context) {
    final isPaid = fee.paymentStatus == 'paid';
    final isPartial = fee.paymentStatus == 'partial';
    final statusText = isPaid
        ? 'Đã thanh toán'
        : isPartial
        ? 'Một phần'
        : 'Chưa thanh toán';
    final statusColor = isPaid
        ? const Color(0xFF16A34A)
        : isPartial
        ? const Color(0xFFF59E0B)
        : const Color(0xFFDC2626);
    final statusBg = isPaid
        ? const Color(0xFFDCFCE7)
        : isPartial
        ? const Color(0xFFFEF3C7)
        : const Color(0xFFFEE2E2);
    final fmt = NumberFormat('#,###', 'vi');

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8F0),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(18),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryOrange.withAlpha(20),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.receipt_long_rounded,
                    color: AppTheme.primaryOrange,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Mã học sinh: ${fee.studentCode}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        'Hạn thanh toán: ${fee.paidAt == null ? "Chưa cập nhật" : _formatViDate(fee.paidAt!)}',
                        style: TextStyle(color: Colors.grey[600], fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Tổng tiền
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Tổng khoản thu',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
                ),
                Text(
                  '${fmt.format(fee.totalAmount)} đ',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                    color: AppTheme.primaryOrange,
                  ),
                ),
              ],
            ),
          ),
          // Chi tiết khoản phí
          if (fee.subjectFees.isNotEmpty || fee.otherFees.isNotEmpty) ...[
            const SizedBox(height: 8),
            const Divider(height: 1, indent: 16, endIndent: 16),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ...fee.subjectFees.entries.map(
                    (e) => _FeeRow(
                      label: e.key,
                      amount: _parseMoneyValue(e.value),
                    ),
                  ),
                  ...fee.otherFees.entries.map(
                    (e) => _FeeRow(
                      label: e.key,
                      amount: _parseMoneyValue(e.value),
                    ),
                  ),
                ],
              ),
            ),
          ],
          // Thời gian thanh toán
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
            child: Row(
              children: [
                Icon(
                  Icons.access_time_rounded,
                  size: 14,
                  color: Colors.grey[500],
                ),
                const SizedBox(width: 4),
                Text(
                  fee.paidAt == null
                      ? 'Chưa có hạn thanh toán'
                      : 'Hạn thanh toán: ${_formatViDate(fee.paidAt!)}',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
                if (fee.paymentMethod != null) ...[
                  const SizedBox(width: 10),
                  Icon(
                    Icons.credit_card_rounded,
                    size: 14,
                    color: Colors.grey[500],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    fee.paymentMethod!,
                    style: TextStyle(color: Colors.grey[500], fontSize: 12),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeeRow extends StatelessWidget {
  const _FeeRow({required this.label, required this.amount});
  final String label;
  final double amount;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              '• $label',
              style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
            ),
          ),
          Text(
            '${NumberFormat('#,###', 'vi').format(amount)} đ',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

// ─── Thông Báo / Sự Kiện ────────────────────────────────────────────────────

class _EventsTab extends ConsumerWidget {
  const _EventsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventsProvider);
    return eventsAsync.when(
      data: (items) {
        if (items.isEmpty) {
          return const _EmptyState(
            icon: Icons.event_note_rounded,
            message: 'Chưa có sự kiện',
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(eventsProvider);
            await ref.read(eventsProvider.future);
          },
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, _listBottomPadding),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              final date = item.eventDate ?? item.publishedAt;
              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x10000000),
                      blurRadius: 14,
                      offset: Offset(0, 5),
                    ),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => _showEventDetail(context, item),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (item.imageUrl.isNotEmpty)
                        AspectRatio(
                          aspectRatio: 16 / 9,
                          child: Image.network(
                            item.imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Container(
                                  color: AppTheme.brandSurface,
                                  child: const Icon(
                                    Icons.image_not_supported_rounded,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                          ),
                        ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 9,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor.withAlpha(18),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: const Text(
                                    'Sự kiện trường',
                                    style: TextStyle(
                                      color: AppTheme.primaryColor,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                const Spacer(),
                                if (date != null)
                                  Text(
                                    _formatViDate(date),
                                    style: TextStyle(
                                      color: Colors.grey[500],
                                      fontSize: 12,
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              item.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _naturalEventContent(item.content),
                              style: TextStyle(
                                color: Colors.grey[700],
                                fontSize: 13,
                                height: 1.45,
                              ),
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
      error: (e, _) => const _ErrorState(message: 'Không thể tải sự kiện'),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.primaryOrange),
      ),
    );
  }

  void _showEventDetail(BuildContext context, SchoolEventItem item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _EventDetailSheet(item: item),
    );
  }
}

class _EventDetailSheet extends ConsumerStatefulWidget {
  const _EventDetailSheet({required this.item});

  final SchoolEventItem item;

  @override
  ConsumerState<_EventDetailSheet> createState() => _EventDetailSheetState();
}

class _EventDetailSheetState extends ConsumerState<_EventDetailSheet> {
  final _commentController = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _sendComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(parentFeaturesDataSourceProvider)
          .sendEventComment(widget.item.id, text);
      _commentController.clear();
      ref.invalidate(eventCommentsProvider(widget.item.id));
      await ref.read(eventCommentsProvider(widget.item.id).future);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không thể gửi bình luận')),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final date = item.eventDate ?? item.publishedAt;
    final commentsAsync = ref.watch(eventCommentsProvider(item.id));

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.78,
      minChildSize: 0.42,
      maxChildSize: 0.94,
      builder: (_, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (item.imageUrl.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  item.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: AppTheme.brandSurface,
                    child: const Icon(
                      Icons.image_not_supported_rounded,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 16),
          const Text(
            'Sự kiện trường',
            style: TextStyle(
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item.title,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
          ),
          if (date != null) ...[
            const SizedBox(height: 8),
            Text(
              _formatViDateTime(date),
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),
          ],

          Row(
            children: [
              _QuickActionChip(
                icon: Icons.receipt_long_rounded,
                label: 'Học phí',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => Scaffold(
                      appBar: AppBar(title: const Text('Học phí')),
                      backgroundColor: AppTheme.lightGrayBackground,
                      body: const _FeesTab(),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _QuickActionChip(
                icon: Icons.calendar_month_rounded,
                label: 'Lịch học',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => Scaffold(
                      appBar: AppBar(title: const Text('Lịch học')),
                      backgroundColor: AppTheme.lightGrayBackground,
                      body: const _TimetableTab(),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _QuickActionChip(
                icon: Icons.campaign_rounded,
                label: 'Thông báo',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => Scaffold(
                      appBar: AppBar(title: const Text('Thông báo')),
                      backgroundColor: AppTheme.lightGrayBackground,
                      body: const _NewsTab(),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Divider(height: 24),
          Text(
            _naturalEventContent(item.content),
            style: const TextStyle(fontSize: 15, height: 1.6),
          ),
          const Divider(height: 28),
          const Text(
            'Bình luận',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          commentsAsync.when(
            data: (comments) {
              if (comments.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    'Chưa có bình luận',
                    style: TextStyle(color: Colors.grey[500], fontSize: 13),
                  ),
                );
              }
              return Column(
                children: comments.map((comment) {
                  return Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          comment.commentText,
                          style: const TextStyle(fontSize: 14, height: 1.45),
                        ),
                        if (comment.createdAt != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            _formatViDateTime(comment.createdAt!),
                            style: TextStyle(
                              color: Colors.grey[500],
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                }).toList(),
              );
            },
            error: (_, stackTrace) => const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text('Không thể tải bình luận'),
            ),
            loading: () => const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _commentController,
                  minLines: 1,
                  maxLines: 3,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _sendComment(),
                  decoration: InputDecoration(
                    hintText: 'Viết bình luận...',
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.filled(
                onPressed: _sending ? null : _sendComment,
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  disabledBackgroundColor: Colors.grey[300],
                ),
                icon: _sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send_rounded, color: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _NewsTab extends ConsumerStatefulWidget {
  const _NewsTab();

  @override
  ConsumerState<_NewsTab> createState() => _NewsTabState();
}

class _NewsTabState extends ConsumerState<_NewsTab> {
  String _filter = 'Tất cả';

  IconData get _feedIcon => Icons.campaign_rounded;

  String get _emptyMessage => 'Chưa có thông báo mới.';

  String get _errorMessage => 'Không thể tải thông báo';

  String get _detailLabel => 'Thông báo';

  String _priorityLabel(String priority) {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'Khẩn cấp';
      case 'high':
        return 'Quan trọng';
      default:
        return 'Bình thường';
    }
  }

  Color _priorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return AppTheme.errorColor;
      case 'high':
        return AppTheme.accentOrange;
      default:
        return AppTheme.primaryColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    final announcementsAsync = ref.watch(announcementsProvider);
    return announcementsAsync.when(
      data: (items) {
        final visibleItems = items.where((item) {
          final text = '${item.title} ${item.content}'.toLowerCase();
          return switch (_filter) {
            'Điểm danh' => text.contains('điểm danh'),
            'Học phí' => text.contains('học phí') || text.contains('khoản thu'),
            'Nhà trường' => !text.contains('điểm danh') &&
                !text.contains('học phí') &&
                !text.contains('khoản thu'),
            _ => true,
          };
        }).toList();

        if (items.isEmpty) {
          return _EmptyState(icon: _feedIcon, message: _emptyMessage);
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(announcementsProvider);
            await ref.read(announcementsProvider.future);
          },
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, _listBottomPadding),
            itemCount: visibleItems.isEmpty ? 2 : visibleItems.length + 1,
            itemBuilder: (context, index) {
              if (index == 0) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['Tất cả', 'Điểm danh', 'Học phí', 'Nhà trường']
                          .map(
                            (label) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(label),
                                selected: _filter == label,
                                onSelected: (_) =>
                                    setState(() => _filter = label),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                );
              }
              if (visibleItems.isEmpty) {
                return const _EmptyState(
                  icon: Icons.campaign_rounded,
                  message: 'Chưa có thông báo mới.',
                );
              }
              final item = visibleItems[index - 1];
              final isNew =
                  item.publishedAt != null &&
                  DateTime.now().difference(item.publishedAt!).inDays < 3;
              final priorityColor = _priorityColor(item.priority);
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: isNew
                      ? Border.all(
                          color: priorityColor.withAlpha(80),
                          width: 1.5,
                        )
                      : null,
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0D000000),
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                  leading: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isNew
                          ? priorityColor.withAlpha(20)
                          : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _feedIcon,
                      color: isNew ? priorityColor : Colors.grey,
                      size: 22,
                    ),
                  ),
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      if (isNew)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryOrange,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Text(
                            'Mới',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: priorityColor.withAlpha(18),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          _priorityLabel(item.priority),
                          style: TextStyle(
                            color: priorityColor,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _naturalEventContent(item.content),
                        style: TextStyle(color: Colors.grey[700], fontSize: 13),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            Icons.access_time_rounded,
                            size: 12,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            item.publishedAt == null
                                ? ''
                                : _formatViDateTime(item.publishedAt!),
                            style: TextStyle(
                              color: Colors.grey[400],
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  onTap: () => _showAnnouncementDetail(context, item),
                ),
              );
            },
          ),
        );
      },
      error: (e, _) => _ErrorState(message: _errorMessage),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.primaryOrange),
      ),
    );
  }

  void _showAnnouncementDetail(BuildContext context, dynamic item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _priorityColor(item.priority).withAlpha(20),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    _feedIcon,
                    color: _priorityColor(item.priority),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  _detailLabel,
                  style: TextStyle(
                    color: _priorityColor(item.priority),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              item.title,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: _priorityColor(item.priority).withAlpha(18),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _priorityLabel(item.priority),
                  style: TextStyle(
                    color: _priorityColor(item.priority),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            if (item.publishedAt != null) ...[
              const SizedBox(height: 6),
              Text(
                _formatViDateTime(item.publishedAt!),
                style: TextStyle(color: Colors.grey[500], fontSize: 12),
              ),
            ],
            const Divider(height: 24),
            Text(
              _naturalEventContent(item.content),
              style: const TextStyle(fontSize: 15, height: 1.6),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Bảng Điểm ───────────────────────────────────────────────────────────────
class _GradesTab extends ConsumerStatefulWidget {
  const _GradesTab();

  @override
  ConsumerState<_GradesTab> createState() => _GradesTabState();
}

class _GradesTabState extends ConsumerState<_GradesTab> {
  String _semesterFilter = 'Cả năm';

  Color _scoreColor(double score) {
    if (score >= 8.0) return const Color(0xFF16A34A);
    if (score >= 6.5) return const Color(0xFF2563EB);
    if (score >= 5.0) return const Color(0xFFF59E0B);
    return const Color(0xFFDC2626);
  }

  bool _isSemester(GradeRecord grade, String semester) {
    final value = grade.semester.trim().toLowerCase();
    if (semester == '1') {
      return value == '1' ||
          value == 'hk1' ||
          value == 'học kỳ 1' ||
          value == 'hoc ky 1' ||
          value.contains('kỳ 1') ||
          value.contains('ky 1');
    }
    if (semester == '2') {
      return value == '2' ||
          value == 'hk2' ||
          value == 'học kỳ 2' ||
          value == 'hoc ky 2' ||
          value.contains('kỳ 2') ||
          value.contains('ky 2');
    }
    return false;
  }

  bool _matchesSemester(GradeRecord grade) {
    if (_semesterFilter == 'Học kỳ 1') {
      return _isSemester(grade, '1');
    }
    if (_semesterFilter == 'Học kỳ 2') {
      return _isSemester(grade, '2');
    }
    return true;
  }

  double? _termAverage(List<GradeRecord> grades, String semester) {
    final rows = grades.where((grade) => _isSemester(grade, semester)).toList();
    if (rows.isEmpty) return null;
    return rows.fold<double>(0, (sum, grade) => sum + grade.subjectAverage) /
        rows.length;
  }

  double _termTotal(List<GradeRecord> grades, String semester) {
    return grades
        .where((grade) => _isSemester(grade, semester))
        .fold<double>(0, (sum, grade) => sum + grade.subjectAverage);
  }

  List<double> _yearlySubjectAverages(List<GradeRecord> grades) {
    final bySubject = <String, List<GradeRecord>>{};
    for (final grade in grades) {
      final key = grade.subjectName.trim().toLowerCase();
      if (key.isEmpty) continue;
      bySubject.putIfAbsent(key, () => <GradeRecord>[]).add(grade);
    }

    return bySubject.values.map((rows) {
      final semester1Rows = rows.where((grade) => _isSemester(grade, '1'));
      final semester2Rows = rows.where((grade) => _isSemester(grade, '2'));
      final semester1Average = semester1Rows.isEmpty
          ? null
          : semester1Rows.fold<double>(
                  0,
                  (sum, grade) => sum + grade.subjectAverage,
                ) /
                semester1Rows.length;
      final semester2Average = semester2Rows.isEmpty
          ? null
          : semester2Rows.fold<double>(
                  0,
                  (sum, grade) => sum + grade.subjectAverage,
                ) /
                semester2Rows.length;

      if (semester1Average != null && semester2Average != null) {
        return (semester1Average + semester2Average * 2) / 3;
      }
      return semester1Average ?? semester2Average ?? 0;
    }).where((score) => score > 0).toList();
  }

  double? _yearlyAverage(List<GradeRecord> grades) {
    final scores = _yearlySubjectAverages(grades);
    if (scores.isEmpty) return null;
    return scores.fold<double>(0, (sum, score) => sum + score) / scores.length;
  }

  double _yearlyTotal(List<GradeRecord> grades) {
    return _yearlySubjectAverages(grades)
        .fold<double>(0, (sum, score) => sum + score);
  }

  Widget _summaryCard({
    required String title,
    required double? average,
    required double total,
    required IconData icon,
  }) {
    final color = _scoreColor(average ?? 0);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withAlpha(18),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  average == null
                      ? 'Chưa có dữ liệu'
                      : 'Tổng: ${total.toStringAsFixed(1)} | TB: ${average.toStringAsFixed(1)}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final gradesAsync = ref.watch(gradesProvider);
    return gradesAsync.when(
      data: (grades) {
        if (grades.isEmpty) {
          return _EmptyState(
            icon: Icons.school_rounded,
            message: 'Chưa có bảng điểm được cập nhật.',
          );
        }
        final visibleGrades = grades.where(_matchesSemester).toList();
        final semester1Average = _termAverage(grades, '1');
        final semester2Average = _termAverage(grades, '2');
        final semester1Total = _termTotal(grades, '1');
        final semester2Total = _termTotal(grades, '2');
        final yearlyAverage = _yearlyAverage(grades);
        final yearlyTotal = _yearlyTotal(grades);

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(gradesProvider);
            await ref.read(gradesProvider.future);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, _listBottomPadding),
            children: [
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['Học kỳ 1', 'Học kỳ 2', 'Cả năm']
                      .map(
                        (label) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(label),
                            selected: _semesterFilter == label,
                            onSelected: (_) =>
                                setState(() => _semesterFilter = label),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
              const SizedBox(height: 12),
              if (_semesterFilter != 'Học kỳ 2') ...[
                _summaryCard(
                  title: 'Tổng điểm học kỳ 1',
                  average: semester1Average,
                  total: semester1Total,
                  icon: Icons.looks_one_rounded,
                ),
                const SizedBox(height: 10),
              ],
              if (_semesterFilter != 'Học kỳ 1') ...[
                _summaryCard(
                  title: 'Tổng điểm học kỳ 2',
                  average: semester2Average,
                  total: semester2Total,
                  icon: Icons.looks_two_rounded,
                ),
                const SizedBox(height: 10),
              ],
              if (_semesterFilter == 'Cả năm') ...[
                _summaryCard(
                  title: 'Tổng điểm cả năm',
                  average: yearlyAverage,
                  total: yearlyTotal,
                  icon: Icons.emoji_events_rounded,
                ),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 16),
              // Header bảng
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF1B2435),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Môn học',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 64,
                      child: Text(
                        'Học kỳ',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ),
                    SizedBox(
                      width: 72,
                      child: Text(
                        'Giữa kỳ',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ),
                    SizedBox(
                      width: 72,
                      child: Text(
                        'Cuối kỳ',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              // Rows
              if (visibleGrades.isEmpty)
                const _EmptyState(
                  icon: Icons.school_rounded,
                  message: 'Chưa có bảng điểm được cập nhật.',
                ),
              ...visibleGrades.asMap().entries.map((entry) {
                final idx = entry.key;
                final g = entry.value;
                final isEven = idx % 2 == 0;
                return Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: isEven ? Colors.white : const Color(0xFFF8FAFF),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          g.subjectName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w500,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 64,
                        child: Text(
                          g.semester.isEmpty ? '-' : g.semester,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 72,
                        child: Center(
                          child: Text(
                            g.midtermScore.toStringAsFixed(1),
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: _scoreColor(g.midtermScore),
                            ),
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 72,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: _scoreColor(g.finalScore).withAlpha(20),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              g.finalScore.toStringAsFixed(1),
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: _scoreColor(g.finalScore),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        );
      },
      error: (e, _) => _ErrorState(message: 'Không thể tải bảng điểm'),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.primaryOrange),
      ),
    );
  }
}

// ─── Widget tiện ích dùng chung ───────────────────────────────────────────────
class _ChatTab extends ConsumerStatefulWidget {
  const _ChatTab();

  @override
  ConsumerState<_ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends ConsumerState<_ChatTab> {
  final TextEditingController _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() => _sending = true);
    try {
      await ref.read(parentFeaturesDataSourceProvider).sendChatMessage(text);
      _controller.clear();
      ref.invalidate(chatMessagesProvider);
      await ref.read(chatMessagesProvider.future);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(chatMessagesProvider);

    return Column(
      children: [
        Expanded(
          child: messagesAsync.when(
            data: (messages) {
              if (messages.isEmpty) {
                return const _EmptyState(
                  icon: Icons.forum_rounded,
                  message: 'Chưa có tin nhắn.',
                );
              }
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(chatMessagesProvider);
                  await ref.read(chatMessagesProvider.future);
                },
                child: ListView.builder(
                  reverse: true,
                  padding: EdgeInsets.fromLTRB(
                    16,
                    16,
                    16,
                    16 + MediaQuery.of(context).viewInsets.bottom,
                  ),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[messages.length - 1 - index];
                    return _ChatBubble(message: message);
                  },
                ),
              );
            },
            error: (e, _) =>
                const _ErrorState(message: 'Không thể tải tin nhắn'),
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppTheme.primaryOrange),
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            decoration: const BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Color(0x12000000),
                  blurRadius: 8,
                  offset: Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                    decoration: InputDecoration(
                      hintText: 'Nhập tin nhắn cho nhà trường',
                      filled: true,
                      fillColor: AppTheme.brandSurface,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _sending ? null : _send,
                  icon: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isParent = message.senderRole.toLowerCase() == 'parent';
    final bubbleColor = isParent ? AppTheme.primaryColor : Colors.white;
    final textColor = isParent ? Colors.white : const Color(0xFF1B2435);

    return Align(
      alignment: isParent ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
        decoration: BoxDecoration(
          color: bubbleColor,
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: isParent ? const Radius.circular(4) : null,
            bottomLeft: isParent ? null : const Radius.circular(4),
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0D000000),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: isParent
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            Text(
              _senderDisplayName(message),
              style: TextStyle(
                color: textColor.withAlpha(210),
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              message.messageText,
              style: TextStyle(color: textColor, fontSize: 14, height: 1.35),
            ),
            if (message.createdAt != null) ...[
              const SizedBox(height: 5),
              Text(
                _formatViDateTime(message.createdAt!),
                style: TextStyle(color: textColor.withAlpha(170), fontSize: 10),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.message});
  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 60, color: Colors.grey[300]),
          const SizedBox(height: 12),
          Text(
            message,
            style: TextStyle(color: Colors.grey[500], fontSize: 15),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off_rounded, size: 48, color: Colors.grey),
          const SizedBox(height: 8),
          Text(message, style: TextStyle(color: Colors.grey[600])),
        ],
      ),
    );
  }
}

class _ProfileTab extends ConsumerWidget {
  const _ProfileTab();

  void _showLinkedStudents(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _LinkedStudentsSheet(ref: ref),
    );
  }

  void _showSchoolInfo(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Center(child: BrandLogo.horizontal(width: 220)),
              const SizedBox(height: 20),
              const Text(
                'Thông tin nhà trường',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
              ),
              const SizedBox(height: 8),
              Text(
                'SYNO đang kết nối dữ liệu điểm danh, lịch học, học phí và thông báo giữa nhà trường với phụ huynh.',
                style: TextStyle(color: Colors.grey.shade700, height: 1.45),
              ),
              const SizedBox(height: 16),
              _InfoRow(
                icon: Icons.verified_user_rounded,
                title: 'Dữ liệu theo trường',
                subtitle:
                    'Thông tin của phụ huynh và học sinh được tách theo trường.',
              ),
              const SizedBox(height: 10),
              _InfoRow(
                icon: Icons.support_agent_rounded,
                title: 'Cần hỗ trợ?',
                subtitle:
                    'Liên hệ văn phòng nhà trường để cập nhật thông tin tài khoản.',
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final studentsAsync = ref.watch(linkedStudentsProvider);

    // Lấy tên lớp từ học sinh liên kết đầu tiên
    final linkedStudent = studentsAsync.maybeWhen(
      data: (list) => list.isNotEmpty ? list.first : null,
      orElse: () => null,
    );

    return ListView(
      padding: const EdgeInsets.only(bottom: _listBottomPadding),
      children: [
        // ── Header profile ────────────────────────────────────────
        Container(
          padding: const EdgeInsets.fromLTRB(20, 48, 20, 28),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppTheme.primaryOrange, AppTheme.primaryOrangeDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withAlpha(40),
                  border: Border.all(color: Colors.white, width: 3),
                ),
                child: const Icon(
                  Icons.person_rounded,
                  size: 46,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                user?.fullName ?? 'Phụ huynh',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                user?.email ?? '',
                style: const TextStyle(color: Color(0xFFFFE0B2), fontSize: 13),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(40),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'PHỤ HUYNH',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    letterSpacing: 0,
                  ),
                ),
              ),
            ],
          ),
        ),

        // ── Thông tin học sinh liên kết ───────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
          child: Text(
            'Thông tin liên kết',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: const Color(0xFF1B2435),
            ),
          ),
        ),
        const SizedBox(height: 10),

        // Card: Học sinh liên kết
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0C000000),
                  blurRadius: 10,
                  offset: Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              children: [
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 4,
                  ),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryOrange.withAlpha(20),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.child_care_rounded,
                      color: AppTheme.primaryOrange,
                      size: 22,
                    ),
                  ),
                  title: const Text(
                    'Học sinh liên kết',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    linkedStudent != null
                        ? '${linkedStudent.fullName} • ${linkedStudent.className}'
                        : 'Xem thông tin con em',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                  trailing: const Icon(
                    Icons.chevron_right_rounded,
                    color: Colors.grey,
                  ),
                  onTap: () => _showLinkedStudents(context, ref),
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 4,
                  ),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryOrange.withAlpha(20),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.school_rounded,
                      color: AppTheme.primaryOrange,
                      size: 22,
                    ),
                  ),
                  title: const Text(
                    'Thông tin nhà trường',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    'Thông tin nhà trường',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                  trailing: const Icon(
                    Icons.chevron_right_rounded,
                    color: Colors.grey,
                  ),
                  onTap: () => _showSchoolInfo(context),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

        // ── Đăng xuất ─────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0C000000),
                  blurRadius: 10,
                  offset: Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              children: [
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 4,
                  ),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.logout_rounded,
                      color: Colors.red.shade400,
                      size: 22,
                    ),
                  ),
                  title: Text(
                    'Đăng xuất',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Colors.red.shade500,
                    ),
                  ),
                  onTap: () => _confirmSignOut(context, ref),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppTheme.brandSurface,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppTheme.primaryColor, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 13,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Sheet Học sinh liên kết ──────────────────────────────────────────────────
class _LinkedStudentsSheet extends ConsumerWidget {
  const _LinkedStudentsSheet({required this.ref});
  final WidgetRef ref;

  @override
  Widget build(BuildContext context, WidgetRef widgetRef) {
    final studentsAsync = widgetRef.watch(linkedStudentsProvider);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.65,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (_, controller) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Học sinh liên kết',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
            ),
            const SizedBox(height: 4),
            Text(
              'Danh sách con em được liên kết với tài khoản của bạn',
              style: TextStyle(color: Colors.grey[500], fontSize: 13),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: studentsAsync.when(
                data: (students) {
                  if (students.isEmpty) {
                    return Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.child_care_rounded,
                          size: 60,
                          color: Colors.grey,
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Chưa có học sinh liên kết',
                          style: TextStyle(color: Colors.grey, fontSize: 15),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Liên hệ nhà trường để được cấp mã liên kết',
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 13,
                          ),
                        ),
                      ],
                    );
                  }
                  return ListView.builder(
                    controller: controller,
                    itemCount: students.length,
                    itemBuilder: (_, idx) {
                      final s = students[idx];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: s.linked
                                ? AppTheme.primaryOrange.withAlpha(60)
                                : Colors.grey.shade200,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x0A000000),
                              blurRadius: 8,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 28,
                              backgroundColor: AppTheme.primaryOrange.withAlpha(
                                20,
                              ),
                              child: Text(
                                s.fullName.isNotEmpty
                                    ? s.fullName[0].toUpperCase()
                                    : '?',
                                style: const TextStyle(
                                  color: AppTheme.primaryOrange,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 22,
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    s.fullName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      _InfoChip(
                                        icon: Icons.class_rounded,
                                        label: s.className,
                                      ),
                                      const SizedBox(width: 8),
                                      _InfoChip(
                                        icon: Icons.badge_rounded,
                                        label: s.studentCode,
                                      ),
                                    ],
                                  ),
                                  if (!s.linked) ...[
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.key_rounded,
                                          size: 14,
                                          color: Colors.orange,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Mã liên kết: ${s.linkCode}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: Colors.orange,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: s.linked
                                    ? const Color(0xFFDCFCE7)
                                    : const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                s.linked ? '✓ Đã liên kết' : 'Chờ xác nhận',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: s.linked
                                      ? const Color(0xFF16A34A)
                                      : const Color(0xFFD97706),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
                error: (e, _) => const Center(
                  child: Text('Không thể tải thông tin học sinh'),
                ),
                loading: () => const Center(
                  child: CircularProgressIndicator(
                    color: AppTheme.primaryOrange,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 12, color: Colors.grey[500]),
        const SizedBox(width: 3),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    );
  }
}
