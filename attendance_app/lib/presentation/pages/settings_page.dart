import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
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
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _contactInitialized = false;
  bool _savingContact = false;
  bool _changingPassword = false;

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String _contactErrorMessage(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final errorText = data['error']?.toString().trim();
        if (errorText != null && errorText.isNotEmpty) return errorText;
      }
    }
    final raw = error.toString().replaceFirst('Exception: ', '').trim();
    return raw.isEmpty ? 'Không thể cập nhật thông tin liên hệ.' : raw;
  }

  Future<void> _saveContactInfo() async {
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng nhập Gmail/email liên hệ.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Gmail/email liên hệ không hợp lệ.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    setState(() => _savingContact = true);
    try {
      final dataSource = ref.read(parentFeaturesDataSourceProvider);
      await dataSource.updateContactInfo(email: email, phone: phone);
      ref.invalidate(contactInfoProvider);
      await ref.read(authControllerProvider.notifier).refreshCurrentUser();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã cập nhật thông tin liên hệ.'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_contactErrorMessage(error)),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      if (mounted) setState(() => _savingContact = false);
    }
  }

  Future<void> _changePassword() async {
    if (_oldPasswordController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng nhập mật khẩu hiện tại.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    if (_newPasswordController.text.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mật khẩu mới tối thiểu 6 ký tự.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    if (_newPasswordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mật khẩu xác nhận không khớp.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    if (!mounted) return;
    setState(() => _changingPassword = true);
    try {
      // Lấy dio client đã có token xác thực
      final dio = ref.read(dioProvider);
      final response = await dio.post(
        '/api/v1/auth/change-password',
        data: {
          'old_password': _oldPasswordController.text,
          'new_password': _newPasswordController.text,
        },
      );

      if (!mounted) return;
      if (response.data['ok'] == true) {
        _oldPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đổi mật khẩu thành công.'),
              backgroundColor: AppTheme.successColor,
            ),
          );
        }
      } else {
        throw Exception(response.data['error'] ?? 'Đổi mật khẩu thất bại');
      }
    } catch (e) {
      var message = 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map) {
          final errorText = data['error']?.toString().trim();
          if (errorText != null && errorText.isNotEmpty) {
            message = errorText;
          }
        }
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: AppTheme.errorColor,
          ),
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
        content: const Text('Bạn có chắc muốn đăng xuất không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Đăng xuất',
              style: TextStyle(color: AppTheme.errorColor),
            ),
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
    final contactAsync = ref.watch(contactInfoProvider);
    final userEmail = user?.email ?? 'Không có email';
    final userRole = user?.role ?? 'parent';
    final userName = user?.fullName ?? 'Người dùng';

    return Scaffold(
      appBar: AppBar(title: const Text('Cài đặt')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
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
                        backgroundColor: AppTheme.brandSurface,
                        child: Icon(
                          Icons.person,
                          color: AppTheme.primaryColor,
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              userName,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              userEmail,
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                              ),
                            ),
                            Chip(
                              label: Text(
                                userRole == 'admin'
                                    ? 'Quản trị viên'
                                    : userRole == 'teacher'
                                    ? 'Giáo viên'
                                    : 'Phụ huynh',
                                style: const TextStyle(fontSize: 12),
                              ),
                              backgroundColor: AppTheme.primaryColor.withAlpha(
                                20,
                              ),
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

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: contactAsync.when(
                loading: () => const SizedBox(
                  height: 120,
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, _) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Liên hệ tài khoản',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Không thể tải thông tin liên hệ. Vui lòng thử lại.',
                      style: TextStyle(color: Colors.red.shade600),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () => ref.invalidate(contactInfoProvider),
                      child: const Text('Tải lại'),
                    ),
                  ],
                ),
                data: (contact) {
                  if (!_contactInitialized) {
                    _emailController.text = contact.email.isNotEmpty
                        ? contact.email
                        : userEmail;
                    _phoneController.text = contact.phone;
                    _contactInitialized = true;
                  }
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Liên hệ tài khoản',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Gmail/email và số điện thoại dùng để nhà trường liên hệ, xác minh khi quên mật khẩu.',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Gmail/email liên hệ',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Số điện thoại',
                          prefixIcon: Icon(Icons.phone_outlined),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _savingContact ? null : _saveContactInfo,
                          child: _savingContact
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Lưu thông tin liên hệ'),
                        ),
                      ),
                    ],
                  );
                },
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
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
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
                  leading: const Icon(
                    Icons.info_outline,
                    color: AppTheme.primaryColor,
                  ),
                  title: const Text('Về SYNO'),
                  subtitle: const Text('Phiên bản 1.0.0'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(
                    Icons.school,
                    color: AppTheme.primaryColor,
                  ),
                  title: const Text('SYNO'),
                  subtitle: const Text('Nền tảng trường học thông minh'),
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
                backgroundColor: AppTheme.errorColor,
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
              leading: Icon(Icons.child_care, color: AppTheme.primaryColor),
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
                    Icon(Icons.child_care, color: AppTheme.primaryColor),
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
              ...students.map(
                (s) => ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.brandSurface,
                    child: Text(
                      s.fullName.substring(0, 1),
                      style: const TextStyle(color: AppTheme.primaryColor),
                    ),
                  ),
                  title: Text(s.fullName),
                  subtitle: Text('Mã: ${s.studentCode} | Lớp: ${s.className}'),
                  trailing: Chip(
                    label: const Text(
                      'Đã liên kết',
                      style: TextStyle(fontSize: 11),
                    ),
                    backgroundColor: Colors.green.withAlpha(20),
                    side: BorderSide.none,
                  ),
                ),
              ),
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
          leading: Icon(Icons.error, color: AppTheme.errorColor),
          title: const Text('Không thể tải thông tin con'),
          subtitle: Text('Lỗi: $e'),
        ),
      ),
    );
  }
}
