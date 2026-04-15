import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/entities/timetable_entry.dart';
import '../providers/dashboard_providers.dart';

class TimetablePage extends ConsumerWidget {
  const TimetablePage({super.key});

  static const Map<int, String> _dayLabels = <int, String>{
    1: 'Thứ 2',
    2: 'Thứ 3',
    3: 'Thứ 4',
    4: 'Thứ 5',
    5: 'Thứ 6',
    6: 'Thứ 7',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timetableAsync = ref.watch(timetableProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Thời Khóa Biểu')),
      body: timetableAsync.when(
        data: (entries) {
          if (entries.isEmpty) {
            return const Center(child: Text('Chưa có lịch học cho lớp này.'));
          }

          final grouped = _groupByDay(entries);
          return LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth >= 900;
              if (isWide) {
                return _WideTimetableLayout(groupedByDay: grouped);
              }
              return _MobileTimetableLayout(groupedByDay: grouped);
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
      ),
    );
  }

  Map<int, List<TimetableEntry>> _groupByDay(List<TimetableEntry> entries) {
    final map = <int, List<TimetableEntry>>{
      for (final day in _dayLabels.keys) day: <TimetableEntry>[],
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

class _MobileTimetableLayout extends StatelessWidget {
  const _MobileTimetableLayout({required this.groupedByDay});

  final Map<int, List<TimetableEntry>> groupedByDay;

  static const List<int> _days = <int>[1, 2, 3, 4, 5, 6];
  static const Map<int, String> _dayLabels = <int, String>{
    1: 'Thứ 2',
    2: 'Thứ 3',
    3: 'Thứ 4',
    4: 'Thứ 5',
    5: 'Thứ 6',
    6: 'Thứ 7',
  };

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: _days.length,
      child: Column(
        children: <Widget>[
          Container(
            color: Colors.white,
            child: TabBar(
              isScrollable: true,
              labelColor: AppTheme.skyBlue,
              unselectedLabelColor: AppTheme.mutedText,
              indicatorColor: AppTheme.skyBlue,
              tabs: _days.map((day) => Tab(text: _dayLabels[day])).toList(),
            ),
          ),
          Expanded(
            child: TabBarView(
              children: _days.map((day) {
                final items = groupedByDay[day] ?? const <TimetableEntry>[];
                return _DayLessonList(dayLabel: _dayLabels[day]!, items: items);
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _WideTimetableLayout extends StatelessWidget {
  const _WideTimetableLayout({required this.groupedByDay});

  final Map<int, List<TimetableEntry>> groupedByDay;

  static const List<int> _days = <int>[1, 2, 3, 4, 5, 6];
  static const Map<int, String> _dayLabels = <int, String>{
    1: 'Thứ 2',
    2: 'Thứ 3',
    3: 'Thứ 4',
    4: 'Thứ 5',
    5: 'Thứ 6',
    6: 'Thứ 7',
  };

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: GridView.builder(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.05,
        ),
        itemCount: _days.length,
        itemBuilder: (context, index) {
          final day = _days[index];
          return _DayColumnCard(
            dayLabel: _dayLabels[day]!,
            items: groupedByDay[day] ?? const <TimetableEntry>[],
          );
        },
      ),
    );
  }
}

class _DayLessonList extends StatelessWidget {
  const _DayLessonList({required this.dayLabel, required this.items});

  final String dayLabel;
  final List<TimetableEntry> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Center(child: Text('$dayLabel: Không có tiết học.'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (_, index) => _TimetableLessonTile(entry: items[index]),
    );
  }
}

class _DayColumnCard extends StatelessWidget {
  const _DayColumnCard({required this.dayLabel, required this.items});

  final String dayLabel;
  final List<TimetableEntry> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              dayLabel,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: const Color(0xFF1B2435),
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: items.isEmpty
                  ? const Center(child: Text('Không có tiết học'))
                  : ListView.separated(
                      itemCount: items.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (_, index) =>
                          _TimetableLessonTile(entry: items[index]),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimetableLessonTile extends StatelessWidget {
  const _TimetableLessonTile({required this.entry});

  final TimetableEntry entry;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE3EBF8)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              entry.subjectName,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: const Color(0xFF1B2435),
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${entry.startTime} - ${entry.endTime}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.skyBlue,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'Phòng: ${entry.room}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
