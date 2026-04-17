import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/entities/attendance_record.dart';
import '../../domain/entities/fee_notice.dart';
import '../../domain/entities/timetable_entry.dart';
import '../providers/dashboard_providers.dart';

const String _adminWebUrl = 'http://127.0.0.1:5174';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  int _tabIndex = 0;

  Future<void> _openAdminWebPortal() async {
    final accessToken = await ref
        .read(authControllerProvider.notifier)
        .readAccessToken();
    final uri = Uri.parse(_adminWebUrl).replace(
      queryParameters: <String, String>{
        if (accessToken != null && accessToken.isNotEmpty) 'token': accessToken,
      },
    );
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (opened || !mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Không mở được Admin Web tự động. Hãy mở: http://127.0.0.1:5174',
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() {
      ref.read(fcmServiceProvider).initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    final role = (ref.watch(authControllerProvider).user?.role ?? '')
        .toLowerCase();
    final canManageAccounts = role == 'teacher' || role == 'admin';
    final isParent = role == 'parent';
    final pages = <Widget>[
      _OverviewTab(
        canManageAccounts: canManageAccounts,
        onOpenAdminWeb: _openAdminWebPortal,
      ),
      const _HistoryTab(),
      const _TimetableTab(),
      if (isParent) const _FeesTab(),
      if (isParent) const _NewsTab(),
      if (isParent) const _GradesTab(),
      if (isParent) const _ChatTab(),
    ];
    final titles = <String>[
      'Tổng quan',
      'Lịch sử',
      'Thời khóa biểu',
      if (isParent) 'Học phí',
      if (isParent) 'Thông báo',
      if (isParent) 'Bảng điểm',
      if (isParent) 'Trao đổi',
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
        label: 'TKB',
      ),
      if (isParent)
        const NavigationDestination(
          icon: Icon(Icons.receipt_long_outlined),
          selectedIcon: Icon(Icons.receipt_long_rounded),
          label: 'Học phí',
        ),
      if (isParent)
        const NavigationDestination(
          icon: Icon(Icons.campaign_outlined),
          selectedIcon: Icon(Icons.campaign_rounded),
          label: 'Tin tức',
        ),
      if (isParent)
        const NavigationDestination(
          icon: Icon(Icons.school_outlined),
          selectedIcon: Icon(Icons.school_rounded),
          label: 'Điểm',
        ),
      if (isParent)
        const NavigationDestination(
          icon: Icon(Icons.chat_bubble_outline_rounded),
          selectedIcon: Icon(Icons.chat_bubble_rounded),
          label: 'Chat',
        ),
    ];
    final selectedIndex = _tabIndex >= pages.length ? 0 : _tabIndex;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(titles[selectedIndex]),
        actions: <Widget>[
          if (canManageAccounts)
            IconButton(
              tooltip: 'Mở Admin Web',
              icon: const Icon(Icons.admin_panel_settings_rounded),
              onPressed: _openAdminWebPortal,
            ),
          IconButton(
            tooltip: 'Đăng xuất',
            icon: const Icon(Icons.logout_rounded),
            onPressed: () =>
                ref.read(authControllerProvider.notifier).signOut(),
          ),
        ],
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
  const _OverviewTab({
    required this.canManageAccounts,
    required this.onOpenAdminWeb,
  });

  final bool canManageAccounts;
  final Future<void> Function() onOpenAdminWeb;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(attendanceHistoryProvider);
    final todayCount = historyAsync.maybeWhen(
      data: (records) => records.length,
      orElse: () => 0,
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: <Color>[AppTheme.primaryOrange, AppTheme.primaryOrangeDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const <BoxShadow>[
              BoxShadow(
                color: Color(0x1AF28C28),
                blurRadius: 20,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: <Widget>[
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(40),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.groups_rounded, color: Colors.white),
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
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$todayCount lượt ghi nhận trong ngày',
                      style: const TextStyle(color: Color(0xFFEAF3FF)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        LayoutBuilder(
          builder: (_, constraints) {
            final crossAxisCount = constraints.maxWidth >= 900 ? 3 : 2;
            return GridView.count(
              crossAxisCount: crossAxisCount,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.35,
              children: <Widget>[
                _QuickActionCard(
                  icon: Icons.history_rounded,
                  title: 'Lịch sử điểm danh',
                  subtitle: 'Xem các lượt vào/ra gần nhất',
                  onTap: () {},
                ),
                _QuickActionCard(
                  icon: Icons.calendar_month_rounded,
                  title: 'Thời khóa biểu',
                  subtitle: 'Lịch học theo tuần (Thứ 2 - Thứ 7)',
                  onTap: () {},
                ),
                if (canManageAccounts)
                  _QuickActionCard(
                    icon: Icons.admin_panel_settings_rounded,
                    title: 'Quản lý tài khoản phụ huynh',
                    subtitle: 'Mở trang Admin Web để cấp tài khoản phụ huynh',
                    onTap: () {
                      onOpenAdminWeb();
                    },
                  ),
              ],
            );
          },
        ),
      ],
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
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(Icons.inbox_outlined, color: Colors.grey[400], size: 56),
                const SizedBox(height: 8),
                Text(
                  'Chưa có dữ liệu điểm danh',
                  style: TextStyle(color: Colors.grey[500]),
                ),
              ],
            ),
          );
        }

        final grouped = <String, List<AttendanceRecord>>{};
        for (final record in records) {
          final key = DateFormat('dd/MM/yyyy').format(record.timestamp);
          grouped.putIfAbsent(key, () => <AttendanceRecord>[]).add(record);
        }

        final dates = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(attendanceHistoryProvider);
            await ref.read(attendanceHistoryProvider.future);
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
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
    final localTime = DateFormat('HH:mm').format(record.timestamp);
    final isOut = record.status == AttendanceStatus.leave;
    final chipColor = isOut ? const Color(0xFFF59E0B) : const Color(0xFF16A34A);
    final chipLabel = isOut ? 'Ra' : 'Vào';

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
                Text('Học sinh ${record.studentId}'),
                Text(localTime, style: Theme.of(context).textTheme.bodySmall),
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

class _TimetableTab extends ConsumerWidget {
  const _TimetableTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timetableAsync = ref.watch(timetableProvider);
    const days = <int>[1, 2, 3, 4, 5, 6];
    const labels = <int, String>{
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7',
    };

    return timetableAsync.when(
      data: (entries) {
        final grouped = <int, List<TimetableEntry>>{
          for (final day in days) day: <TimetableEntry>[],
        };
        for (final entry in entries) {
          if (grouped.containsKey(entry.dayOfWeek)) {
            grouped[entry.dayOfWeek]!.add(entry);
          }
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: days.map((day) {
            final dayEntries = grouped[day]!;
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    labels[day]!,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: const Color(0xFF1B2435),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (dayEntries.isEmpty)
                    Text(
                      'Không có tiết học',
                      style: TextStyle(color: Colors.grey[500]),
                    ),
                  ...dayEntries.map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE5EBF6)),
                        ),
                        child: Row(
                          children: <Widget>[
                            Expanded(
                              child: Text(
                                entry.subjectName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            if (entry.period.isNotEmpty) ...<Widget>[
                              Text(entry.period),
                              const SizedBox(width: 10),
                            ],
                            Text('${entry.startTime}-${entry.endTime}'),
                            const SizedBox(width: 10),
                            Text('P.${entry.room}'),
                            if (entry.teacherName.isNotEmpty) ...<Widget>[
                              const SizedBox(width: 10),
                              Text(entry.teacherName),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        );
      },
      error: (error, _) =>
          Center(child: Text('Không thể tải thời khóa biểu: $error')),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.skyBlue),
      ),
    );
  }
}

class _FeesTab extends ConsumerWidget {
  const _FeesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feesAsync = ref.watch(feeNoticesProvider);
    return feesAsync.when(
      data: (fees) {
        if (fees.isEmpty) {
          return const Center(child: Text('Chưa có thông báo học phí'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: fees.length,
          itemBuilder: (context, index) {
            final fee = fees[index];
            return _FeeNoticeCard(fee: fee);
          },
        );
      },
      error: (error, _) => Center(child: Text('Không thể tải học phí: $error')),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.skyBlue),
      ),
    );
  }
}

class _FeeNoticeCard extends StatelessWidget {
  const _FeeNoticeCard({required this.fee});

  final FeeNotice fee;

  @override
  Widget build(BuildContext context) {
    final statusText = switch (fee.paymentStatus) {
      'paid' => 'Đã thanh toán',
      'partial' => 'Thanh toán một phần',
      _ => 'Chưa thanh toán',
    };
    final statusColor = switch (fee.paymentStatus) {
      'paid' => const Color(0xFF16A34A),
      'partial' => const Color(0xFFF59E0B),
      _ => const Color(0xFFDC2626),
    };

    Widget feeItems(String title, Map<String, dynamic> items) {
      final entries = items.entries.toList();
      if (entries.isEmpty) return const SizedBox.shrink();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          ...entries.map(
            (e) => Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '• ${e.key}: ${NumberFormat.decimalPattern('vi').format((e.value as num?) ?? 0)} đ',
              ),
            ),
          ),
        ],
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'Mã HS: ${fee.studentCode}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(24),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Tổng tiền: ${NumberFormat.decimalPattern('vi').format(fee.totalAmount)} đ',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          feeItems('Học phí môn', fee.subjectFees),
          feeItems('Khoản thu khác', fee.otherFees),
          const SizedBox(height: 8),
          Text(
            'Phương thức: ${fee.paymentMethod ?? '-'} | Thời gian: ${fee.paidAt == null ? '-' : DateFormat('dd/MM/yyyy HH:mm').format(fee.paidAt!)}',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }
}

class _NewsTab extends ConsumerWidget {
  const _NewsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcementsAsync = ref.watch(announcementsProvider);
    return announcementsAsync.when(
      data: (items) {
        if (items.isEmpty) return const Center(child: Text('Chưa có thông báo'));
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          itemBuilder: (context, index) {
            final item = items[index];
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(item.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(item.content),
                  const SizedBox(height: 6),
                  Text(
                    item.publishedAt == null
                        ? '-'
                        : DateFormat('dd/MM/yyyy HH:mm').format(item.publishedAt!),
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                ],
              ),
            );
          },
        );
      },
      error: (error, _) => Center(child: Text('Không thể tải thông báo: $error')),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.skyBlue),
      ),
    );
  }
}

class _GradesTab extends ConsumerWidget {
  const _GradesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gradesAsync = ref.watch(gradesProvider);
    return gradesAsync.when(
      data: (grades) {
        if (grades.isEmpty) return const Center(child: Text('Chưa có bảng điểm'));
        return ListView(
          padding: const EdgeInsets.all(16),
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Bảng điểm học kỳ',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 10),
            ...grades.map(
              (g) => ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                tileColor: Colors.white,
                title: Text(g.subjectName),
                subtitle: Text('Giữa kỳ: ${g.midtermScore} | Cuối kỳ: ${g.finalScore}'),
              ),
            ),
          ],
        );
      },
      error: (error, _) => Center(child: Text('Không thể tải bảng điểm: $error')),
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.skyBlue),
      ),
    );
  }
}

class _ChatTab extends ConsumerStatefulWidget {
  const _ChatTab();

  @override
  ConsumerState<_ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends ConsumerState<_ChatTab> {
  final TextEditingController _messageController = TextEditingController();

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final chatAsync = ref.watch(chatMessagesProvider);
    final sending = ref.watch(chatComposerProvider);
    return Column(
      children: <Widget>[
        Expanded(
          child: chatAsync.when(
            data: (messages) {
              if (messages.isEmpty) {
                return const Center(child: Text('Chưa có tin nhắn'));
              }
              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: messages.length,
                itemBuilder: (context, index) {
                  final message = messages[index];
                  final mine = message.senderRole == 'parent';
                  return _ChatBubble(
                    mine: mine,
                    text: '${message.senderName}: ${message.messageText}',
                  );
                },
              );
            },
            error: (error, _) => Center(child: Text('Không thể tải chat: $error')),
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppTheme.skyBlue),
            ),
          ),
        ),
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          child: Row(
            children: <Widget>[
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: InputDecoration(
                    hintText: 'Nhập nội dung...',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: sending
                    ? null
                    : () async {
                        final text = _messageController.text.trim();
                        if (text.isEmpty) return;
                        await ref.read(chatComposerProvider.notifier).sendMessage(
                              messageText: text,
                            );
                        if (!mounted) return;
                        _messageController.clear();
                      },
                icon: const Icon(Icons.send_rounded),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.mine, required this.text});

  final bool mine;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: mine ? const Color(0xFFFFE7D1) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5EBF6)),
        ),
        child: Text(text),
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Ink(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Color(0x10000000),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(icon, color: AppTheme.skyBlue),
              const SizedBox(height: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF1B2435),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.mutedText,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
