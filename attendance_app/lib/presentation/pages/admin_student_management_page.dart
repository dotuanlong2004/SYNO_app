import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/entities/provision_parent_result.dart';
import '../../domain/entities/student_link_info.dart';
import '../providers/dashboard_providers.dart';

class AdminStudentManagementPage extends ConsumerWidget {
  const AdminStudentManagementPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(studentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quản lý học sinh & tài khoản phụ huynh'),
      ),
      body: studentsAsync.when(
        data: (students) {
          if (students.isEmpty) {
            return const Center(
              child: Text('Chưa có học sinh trong hệ thống.'),
            );
          }

          return LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 980;
              final crossAxisCount = wide ? 2 : 1;
              return GridView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: students.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: wide ? 2.2 : 2.45,
                ),
                itemBuilder: (_, index) =>
                    _StudentAdminCard(student: students[index]),
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

class _StudentAdminCard extends ConsumerStatefulWidget {
  const _StudentAdminCard({required this.student});

  final StudentLinkInfo student;

  @override
  ConsumerState<_StudentAdminCard> createState() => _StudentAdminCardState();
}

class _StudentAdminCardState extends ConsumerState<_StudentAdminCard> {
  bool _provisioning = false;

  Future<void> _copy(String value, String label) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('Đã sao chép $label')));
  }

  Future<void> _showCredentialsDialog(ProvisionParentResult result) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cấp tài khoản thành công'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('Học sinh: ${result.studentName}'),
            const SizedBox(height: 12),
            _CredentialRow(
              label: 'Email/SĐT',
              value: result.emailOrPhone,
              onCopy: () => _copy(result.emailOrPhone, 'Email/SĐT'),
            ),
            const SizedBox(height: 8),
            _CredentialRow(
              label: 'Mật khẩu',
              value: result.password,
              onCopy: () => _copy(result.password, 'mật khẩu'),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  Future<void> _openProvisionDialog() async {
    final nameController = TextEditingController();
    final contactController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    try {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Cấp tài khoản phụ huynh'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Tên phụ huynh',
                    prefixIcon: Icon(Icons.person_outline_rounded),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Vui lòng nhập tên phụ huynh';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: contactController,
                  decoration: const InputDecoration(
                    labelText: 'Email/SĐT phụ huynh',
                    prefixIcon: Icon(Icons.alternate_email_rounded),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Vui lòng nhập Email/SĐT';
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState?.validate() ?? false) {
                  Navigator.of(context).pop(true);
                }
              },
              child: const Text('Cấp tài khoản'),
            ),
          ],
        ),
      );

      if (confirmed != true || !mounted) return;
      setState(() => _provisioning = true);
      final result = await ref
          .read(studentsRepositoryProvider)
          .provisionParent(
            studentId: widget.student.id,
            parentName: nameController.text.trim(),
            parentEmailOrPhone: contactController.text.trim(),
          );
      if (!mounted) return;
      await _showCredentialsDialog(result);
      ref.invalidate(studentsProvider);
    } on DioException catch (error) {
      final message = error.response?.data is Map<String, dynamic>
          ? (error.response?.data['error'] as String? ??
                'Không thể cấp tài khoản')
          : 'Không thể cấp tài khoản';
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã xảy ra lỗi không xác định.')),
      );
    } finally {
      nameController.dispose();
      contactController.dispose();
      if (mounted) {
        setState(() => _provisioning = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final student = widget.student;

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
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    student.linkCode.isEmpty ? 'Chưa có mã' : student.linkCode,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      letterSpacing: 1.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Sao chép mã liên kết',
                  onPressed: student.linkCode.isEmpty
                      ? null
                      : () => _copy(student.linkCode, 'mã liên kết'),
                  icon: const Icon(Icons.copy_rounded),
                ),
              ],
            ),
            const SizedBox(height: 8),
            student.linked
                ? Text(
                    'Phụ huynh: ${student.parentName.isEmpty ? 'Đã liên kết' : student.parentName}',
                    style: Theme.of(context).textTheme.bodySmall,
                  )
                : Align(
                    alignment: Alignment.centerRight,
                    child: ElevatedButton.icon(
                      onPressed: _provisioning ? null : _openProvisionDialog,
                      icon: _provisioning
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.person_add_alt_1_rounded),
                      label: const Text('Cấp tài khoản'),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}

class _CredentialRow extends StatelessWidget {
  const _CredentialRow({
    required this.label,
    required this.value,
    required this.onCopy,
  });

  final String label;
  final String value;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.mutedText,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(value, style: Theme.of(context).textTheme.titleSmall),
            ],
          ),
        ),
        IconButton(
          onPressed: onCopy,
          icon: const Icon(Icons.copy_rounded),
          tooltip: 'Sao chép',
        ),
      ],
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
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}
