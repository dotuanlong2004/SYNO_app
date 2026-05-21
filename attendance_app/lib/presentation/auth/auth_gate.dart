import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/auth/auth_state.dart';
import '../pages/dashboard_page.dart';
import '../providers/dashboard_providers.dart';
import 'login_page.dart';

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(authControllerProvider);

    if (state.status == AuthStatus.unknown) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (state.isAuthenticated) {
      final role = (state.user?.role ?? '').toLowerCase();
      if (role == 'admin' || role == 'teacher') {
        // Tài khoản admin/teacher không dùng app mobile - force logout
        Future.microtask(() => ref.read(authControllerProvider.notifier).signOut());
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      return const DashboardPage();
    }

    return const LoginPage();
  }
}
