import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../providers/dashboard_providers.dart';
import '../providers/student_info_provider.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _changingPassword = false;

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (_newPasswordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mật khẩu mới không khớp'), backgroundColor: Colors.red),
      );
      return;
    }

    if (!mounted) return;
    setState(() => _changingPassword = true);
    try {
      // Lấy dio client đã có token xác thực
      final dio = ref.read(dioProvider);
      final response = await dio.post('/api/v1/auth/change-password', data: {
        'old_password': _oldPasswordController.text,
        'new_password': _newPasswordController.text,
      });

      if (!mounted) return;
      if (response.data['ok'] == true) {
        _oldPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đổi mật khẩu thành công'), backgroundColor: Colors.green),
          );
        }
      } else {
        throw Exception(response.data['error'] ?? 'Đổi mật khẩu thất bại');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _changingPassword = false);
    }
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Đăng xuất'),
        content: const Text('Bạn có chắc muốn đăng xuất?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Đăng xuất', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await ref.read(authControllerProvider.notifier).signOut();
      // AuthGate tự động chuyển sang LoginPage khi state = unauthenticated
      if (mounted) {
        Navigator.of(context).pop(); // Đóng SettingsPage
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final userEmail = user?.email ?? 'Không có email';
    final userRole = user?.role ?? 'parent';
    final userName = user?.fullName ?? 'Người dùng';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cài đặt'),
        backgroundColor: AppTheme.primaryRed,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Thông tin tài khoản
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: AppTheme.primaryRed.withAlpha(30),
                        child: Icon(Icons.person, color: AppTheme.primaryRed, size: 32),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              userName,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            Text(userEmail, style: TextStyle(color: Colors.grey[600])),
                            Chip(
                              label: Text(
                                userRole == 'admin'
                                    ? 'Quản trị viên'
                                    : userRole == 'teacher'
                                        ? 'Giáo viên'
                                        : 'Phụ huynh',
                                style: const TextStyle(fontSize: 12),
                              ),
                              backgroundColor: AppTheme.primaryRed.withAlpha(20),
                              side: BorderSide.none,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Thông tin con (nếu là phụ huynh)
          if (userRole == 'parent') ...[
            _StudentInfoCard(),
            const SizedBox(height: 16),
          ],

          // Đổi mật khẩu
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Đổi mật khẩu',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _oldPasswordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Mật khẩu hiện tại',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _newPasswordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Mật khẩu mới',
                      prefixIcon: Icon(Icons.lock),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _confirmPasswordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Xác nhận mật khẩu mới',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _changingPassword ? null : _changePassword,
                      child: _changingPassword
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Đổi mật khẩu'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Về ứng dụng
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: Icon(Icons.info_outline, color: Colors.grey[600]),
                  title: const Text('Về HNSEDU'),
                  subtitle: const Text('Phiên bản 1.0.0'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: Icon(Icons.school, color: Colors.grey[600]),
                  title: const Text('HUU NGHĪ SCHOOL'),
                  subtitle: const Text('Hệ thống điểm danh thông minh'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Đăng xuất
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout),
              label: const Text('Đăng xuất'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Widget hiển thị thông tin học sinh
class _StudentInfoCard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(linkedStudentsProvider);

    return studentsAsync.when(
      data: (students) {
        if (students.isEmpty) {
          return Card(
            child: ListTile(
              leading: Icon(Icons.child_care, color: AppTheme.primaryBlue),
              title: const Text('Chưa có thông tin con'),
              subtitle: const Text('Vui lòng liên hệ nhà trường để liên kết'),
            ),
          );
        }

        return Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Row(
                  children: [
                    Icon(Icons.child_care, color: AppTheme.primaryBlue),
                    const SizedBox(width: 12),
                    Text(
                      'Thông tin con',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              ...students.map((s) => ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppTheme.primaryBlue.withAlpha(30),
                  child: Text(s.fullName.substring(0, 1), style: TextStyle(color: AppTheme.primaryBlue)),
                ),
                title: Text(s.fullName),
                subtitle: Text('Mã: ${s.studentCode} | Lớp: ${s.className}'),
                trailing: Chip(
                  label: const Text('Đã liên kết', style: TextStyle(fontSize: 11)),
                  backgroundColor: Colors.green.withAlpha(20),
                  side: BorderSide.none,
                ),
              )),
            ],
          ),
        );
      },
      loading: () => const Card(
        child: ListTile(
          leading: CircularProgressIndicator(strokeWidth: 2),
          title: Text('Đang tải thông tin...'),
        ),
      ),
      error: (e, _) => Card(
        child: ListTile(
          leading: Icon(Icons.error, color: Colors.red),
          title: const Text('Không thể tải thông tin con'),
          subtitle: Text('Lỗi: $e'),
        ),
      ),
    );
  }
}
