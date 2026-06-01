import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/entities/attendance_record.dart';
import '../../domain/entities/timetable_entry.dart';
import '../providers/dashboard_providers.dart';
import '../providers/student_info_provider.dart';
import '../widgets/brand_logo.dart';
import 'timetable_page.dart';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      const _OverviewTab(),
      const _HistoryTab(),
      const _TimetableTab(),
      const _ProfileTab(),
    ];
    final titles = <String>[
      'Tổng quan',
      'Lịch sử',
      'Thời khóa biểu',
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
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Cá nhân',
          ),
        ];
        final selectedIndex = _tabIndex >= pages.length ? 0 : _tabIndex;

        return Scaffold(
          backgroundColor: AppTheme.lightGrayBackground,
          appBar: AppBar(
            leading: const Padding(
              padding: EdgeInsets.all(8),
              child: BrandLogo(size: 36, showText: false),
            ),
            title: Text(titles[selectedIndex]),
          ),
          body: SafeArea(
            child: IndexedStack(index: selectedIndex, children: pages),
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: selectedIndex,
            onDestinationSelected: (value) => setState(() => _tabIndex = value),
            destinations: destinations,
          ),
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
          data: (records) {
            final filteredRecords = records.where((r) {
              final local = r.timestamp.toLocal();
              return local.year == today.year &&
                  local.month == today.month &&
                  local.day == today.day;
            }).toList();
            filteredRecords.sort((a, b) => a.timestamp.compareTo(b.timestamp));
            return filteredRecords;
          },
          orElse: () => <AttendanceRecord>[],
        );

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
            } catch (_) {
              // Handle potential errors during refresh if necessary
            }
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: <Widget>[
              Text(
                dateLabel,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[500],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 10),
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
                      ],
                    ),
                  ],
                ),
              ),
              // Display attendance records if available
              if (todayRecords.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Chi tiết điểm danh hôm nay',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                ...todayRecords.map((record) {
                  final statusText = record.status.name.toUpperCase();
                  final statusColor = switch (record.status) {
                    AttendanceStatus.late => Colors.orange,
                    AttendanceStatus.leave => Colors.blue,
                    AttendanceStatus.onTime => Colors.green,
                  };
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: Row(
                      children: [
                        Icon(
                          switch (record.logType) {
                            AttendanceLogType.checkIn => Icons.login_rounded,
                            AttendanceLogType.checkOut => Icons.logout_rounded,
                          },
                          color: statusColor,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          DateFormat('HH:mm').format(record.timestamp.toLocal()),
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(width: 12),
                        Text(statusText),
                        if (record.status == AttendanceStatus.late) ...[
                          const SizedBox(width: 4),
                          Text('(${record.lateMinutes ?? 0} phút)'),
                        ],
                      ],
                    ),
                  );
                }),
              ] else if (historyAsync.hasError) ...[
                const SizedBox(height: 24),
                Text(
                  'Không thể tải dữ liệu điểm danh.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.red,
                  ),
                ),
              ] else if (historyAsync.isLoading) ...[
                const SizedBox(height: 24),
                const Center(child: CircularProgressIndicator()),
              ] else ...[
                // No records and no error, and not loading
                const SizedBox(height: 24),
                const Text('Chưa có dữ liệu điểm danh hôm nay.'),
              ],
            ],
          ),
        );
      }
    }

class _HistoryTab extends ConsumerWidget {
  const _HistoryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendanceHistoryAsync = ref.watch(attendanceHistoryProvider);

    return attendanceHistoryAsync.when(
      data: (records) {
        if (records.isEmpty) {
          return const Center(child: Text('Chưa có lịch sử điểm danh.'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: records.length,
          itemBuilder: (context, index) {
            final record = records[index];
            final statusText = record.status.name.toUpperCase();
            final statusColor = switch (record.status) {
              AttendanceStatus.late => Colors.orange,
              AttendanceStatus.leave => Colors.blue,
              AttendanceStatus.onTime => Colors.green,
            };
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(
                      switch (record.logType) {
                        AttendanceLogType.checkIn => Icons.login_rounded,
                        AttendanceLogType.checkOut => Icons.logout_rounded,
                      },
                      color: statusColor,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            DateFormat('dd/MM/yyyy HH:mm').format(record.timestamp.toLocal()),
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Trạng thái: $statusText',
                            style: TextStyle(color: statusColor),
                          ),
                          if (record.status == AttendanceStatus.late) ...[
                            Text('Đi muộn: ${record.lateMinutes ?? 0} phút'),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Lỗi tải lịch sử điểm danh: $error')),
    );
  }
}

class _TimetableTab extends ConsumerWidget {
  const _TimetableTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timetableAsync = ref.watch(timetableProvider);

    return timetableAsync.when(
      data: (entries) {
        if (entries.isEmpty) {
          return const Center(child: Text('Chưa có lịch học cho lớp này.'));
        }

        final grouped = _groupByDay(entries);
        return LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 900;
            if (isWide) {
              return WideTimetableLayout(groupedByDay: grouped);
            }
            return MobileTimetableLayout(groupedByDay: grouped);
          },
        );
      },
      error: (error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Text(
            'Không thể tải thời khóa biểu: $error',
            textAlign: TextAlign.center,
          ),
        ),
      ),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.skyBlue),
      ),
    );
  }

  Map<int, List<TimetableEntry>> _groupByDay(List<TimetableEntry> entries) {
    final map = <int, List<TimetableEntry>>{
      for (final day in TimetablePage.dayLabels.keys) day: <TimetableEntry>[],
    };
    for (final entry in entries) {
      if (map.containsKey(entry.dayOfWeek)) {
        map[entry.dayOfWeek]!.add(entry);
      }
    }
    for (final day in map.keys) {
      map[day]!.sort((a, b) => a.startTime.compareTo(b.startTime));
    }
    return map;
  }
}

class _ProfileTab extends ConsumerWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feeNoticesAsync = ref.watch(feeNoticesProvider);
    final gradesAsync = ref.watch(gradesProvider);
    final announcementsAsync = ref.watch(announcementsProvider);
    final eventsAsync = ref.watch(eventsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(feeNoticesProvider);
        ref.invalidate(gradesProvider);
        ref.invalidate(announcementsProvider);
        ref.invalidate(eventsProvider);
        try {
          await Future.wait([
            ref.read(feeNoticesProvider.future),
            ref.read(gradesProvider.future),
            ref.read(announcementsProvider.future),
            ref.read(eventsProvider.future),
          ]);
        } catch (_) {}
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Fee Notices Section
          _buildSectionHeader(context, 'Học phí', Icons.payments_outlined),
          const SizedBox(height: 12),
          feeNoticesAsync.when(
            data: (notices) {
              if (notices.isEmpty) {
                return _buildEmptyState('Chưa có thông báo học phí.');
              }
              final totalAmount = notices.fold<double>(
                0,
                (sum, notice) => sum + notice.totalAmount,
              );
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.skyBlue.withAlpha(25),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance_wallet_rounded, color: AppTheme.skyBlue),
                        const SizedBox(width: 12),
                        Text(
                          'Tổng tiền: ${NumberFormat.currency(locale: 'vi', symbol: 'đ').format(totalAmount)}',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.skyBlue,
                              ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...notices.map((notice) {
                    final isUnpaid = notice.paymentStatus == 'unpaid';
                    final statusText = isUnpaid ? 'Chưa thanh toán' : 'Đã thanh toán';
                    final statusColor = isUnpaid ? Colors.red : Colors.green;
                    return Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.grey.shade200),
                      ),
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Thông báo #${notice.id}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: statusColor.withAlpha(25),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    statusText,
                                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            if (notice.subjectFees.isNotEmpty) ...[
                              const Text('Học phí môn học:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                              const SizedBox(height: 4),
                              ...notice.subjectFees.entries.map((e) => Padding(
                                    padding: const EdgeInsets.only(left: 8.0, bottom: 2),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('• ${e.key}', style: const TextStyle(fontSize: 13, color: AppTheme.mutedText)),
                                        Text(NumberFormat.currency(locale: 'vi', symbol: 'đ').format(e.value),
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                      ],
                                    ),
                                  )),
                              const SizedBox(height: 8),
                            ],
                            if (notice.otherFees.isNotEmpty) ...[
                              const Text('Phụ phí:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                              const SizedBox(height: 4),
                              ...notice.otherFees.entries.map((e) => Padding(
                                    padding: const EdgeInsets.only(left: 8.0, bottom: 2),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('• ${e.key}', style: const TextStyle(fontSize: 13, color: AppTheme.mutedText)),
                                        Text(NumberFormat.currency(locale: 'vi', symbol: 'đ').format(e.value),
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                      ],
                                    ),
                                  )),
                            ],
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: Divider(height: 1),
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Tổng cộng', style: TextStyle(fontWeight: FontWeight.bold)),
                                Text(
                                  NumberFormat.currency(locale: 'vi', symbol: 'đ').format(notice.totalAmount),
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryOrange, fontSize: 16),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => _buildErrorState('Lỗi tải học phí: $error'),
          ),
          const SizedBox(height: 24),

          // Grades Section
          _buildSectionHeader(context, 'Bảng điểm', Icons.grade_outlined),
          const SizedBox(height: 12),
          gradesAsync.when(
            data: (grades) {
              if (grades.isEmpty) {
                return _buildEmptyState('Chưa có bảng điểm.');
              }
              return Column(
                children: grades.map((grade) {
                  return Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey.shade200),
                    ),
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.book_outlined, color: AppTheme.primaryOrange, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                grade.subjectName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              _buildScoreItem('Giữa kỳ', grade.midtermScore),
                              const SizedBox(width: 16),
                              _buildScoreItem('Cuối kỳ', grade.finalScore),
                              const SizedBox(width: 16),
                              _buildScoreItem('Trung bình', grade.averageScore, isHighlight: true),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => _buildErrorState('Lỗi tải bảng điểm: $error'),
          ),
          const SizedBox(height: 24),

          // Events Section
          _buildSectionHeader(context, 'Sự kiện sắp tới', Icons.event_note_rounded),
          const SizedBox(height: 12),
          eventsAsync.when(
            data: (events) {
              if (events.isEmpty) {
                return _buildEmptyState('Chưa có sự kiện nào sắp tới.');
              }
              return Column(
                children: events.map((event) {
                  return Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey.shade200),
                    ),
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (event.imageUrl != null && event.imageUrl!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(
                                  event.imageUrl!,
                                  width: double.infinity,
                                  height: 150,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
                                ),
                              ),
                            ),
                          Text(
                            event.title,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(event.content),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.calendar_today_rounded, size: 14, color: AppTheme.primaryOrange),
                              const SizedBox(width: 6),
                              Text(
                                event.publishedAt != null
                                    ? 'Ngày diễn ra: ${DateFormat('dd/MM/yyyy').format(event.publishedAt!.toLocal())}'
                                    : 'Chưa rõ ngày',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppTheme.primaryOrange,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => _buildErrorState('Lỗi tải sự kiện: $error'),
          ),
          const SizedBox(height: 24),

          // Announcements
          _buildSectionHeader(context, 'Thông báo từ nhà trường', Icons.campaign_rounded),
          const SizedBox(height: 12),
          announcementsAsync.when(
            data: (announcements) {
              if (announcements.isEmpty) {
                return _buildEmptyState('Chưa có thông báo mới.');
              }
              return Column(
                children: announcements.map((announcement) {
                  return Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey.shade200),
                    ),
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (announcement.imageUrl != null && announcement.imageUrl!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(
                                  announcement.imageUrl!,
                                  width: double.infinity,
                                  height: 150,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
                                ),
                              ),
                            ),
                          Text(
                            announcement.title,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(announcement.content),
                          const SizedBox(height: 4),
                          Text(
                            DateFormat('dd/MM/yyyy HH:mm').format(announcement.publishedAt?.toLocal() ?? DateTime.now()),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => _buildErrorState('Lỗi tải thông báo: $error'),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primaryOrange, size: 24),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: const Color(0xFF1B2435),
              ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(String message) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          message,
          style: const TextStyle(color: AppTheme.mutedText),
        ),
      ),
    );
  }

  Widget _buildErrorState(String message) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          message,
          style: const TextStyle(color: Colors.red),
        ),
      ),
    );
  }

  Widget _buildScoreItem(String label, double score, {bool isHighlight = false}) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: AppTheme.mutedText),
          ),
          const SizedBox(height: 4),
          Text(
            score.toStringAsFixed(1),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isHighlight ? AppTheme.skyBlue : const Color(0xFF1B2435),
            ),
          ),
        ],
      ),
    );
  }

}
