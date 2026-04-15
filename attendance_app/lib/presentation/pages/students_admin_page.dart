import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/entities/student_link_info.dart';
import '../providers/dashboard_providers.dart';

class StudentsAdminPage extends ConsumerWidget {
  const StudentsAdminPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(studentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Quản lý mã liên kết học sinh')),
      body: studentsAsync.when(
        data: (students) {
          if (students.isEmpty) {
            return const Center(
              child: Text('Chưa có học sinh trong hệ thống.'),
            );
          }

          return LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 900;
              final crossAxisCount = wide ? 2 : 1;
              return GridView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: students.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: wide ? 2.25 : 2.6,
                ),
                itemBuilder: (context, index) =>
                    _StudentLinkCard(student: students[index]),
              );
            },
          );
        },
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text('Không thể tải danh sách học sinh: $error'),
          ),
        ),
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppTheme.skyBlue),
        ),
      ),
    );
  }
}

class _StudentLinkCard extends StatelessWidget {
  const _StudentLinkCard({required this.student});

  final StudentLinkInfo student;

  Future<void> _copyLinkCode(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: student.linkCode));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Đã sao chép mã liên kết cho ${student.fullName}.'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    student.fullName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: const Color(0xFF1B2435),
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                _StatusChip(linked: student.linked),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Mã học sinh: ${student.studentCode}  •  Lớp: ${student.className}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const Spacer(),
            Text(
              'Mã liên kết',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppTheme.mutedText,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF6F9FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2ECFF)),
              ),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      student.linkCode.isEmpty
                          ? 'Chưa có mã'
                          : student.linkCode,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.0,
                        color: const Color(0xFF1B2435),
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Sao chép mã',
                    onPressed: student.linkCode.isEmpty
                        ? null
                        : () => _copyLinkCode(context),
                    icon: const Icon(Icons.copy_rounded),
                    color: AppTheme.skyBlue,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Text(
              student.linked
                  ? 'Phụ huynh: ${student.parentName.isEmpty ? 'Đã liên kết' : student.parentName}'
                  : 'Chưa có phụ huynh liên kết',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.linked});

  final bool linked;

  @override
  Widget build(BuildContext context) {
    final color = linked ? const Color(0xFF1E9E62) : const Color(0xFFDD8B22);
    final text = linked ? 'Đã liên kết' : 'Chưa liên kết';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(24),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
