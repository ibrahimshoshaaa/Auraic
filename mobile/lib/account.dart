import 'notification_settings.dart';
import 'package:flutter/material.dart';

import 'api.dart';
import 'ui.dart';

class AccountPage extends StatelessWidget {
  const AccountPage({required this.api, required this.isOwner, required this.onPasswordChanged, super.key});
  final ErpApi api;
  final bool isOwner;
  final VoidCallback onPasswordChanged;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('الحساب والأمان')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      const PageIntro(title: 'إدارة الحساب', subtitle: 'تحكم في كلمة المرور وصلاحيات الدخول', icon: Icons.admin_panel_settings_outlined),
      const SizedBox(height: 16),
      Card(child: ListTile(leading: const Icon(Icons.lock_outline),
        title: const Text('تغيير كلمة المرور'), subtitle: const Text('سيتم تسجيل خروجك من كل أجهزة الموبايل'),
        trailing: const Icon(Icons.chevron_left),
        onTap: () => openPage(context, ChangePasswordPage(api: api, onChanged: onPasswordChanged)))),
      const SizedBox(height: 12),
      if (api.can('orders.read')) Card(child: ListTile(leading: const Icon(Icons.notifications_outlined),
        title: const Text('إشعارات الطلبات'), trailing: const Icon(Icons.chevron_left),
        onTap: () => openPage(context, NotificationSettingsPage(api: api)))),
      if (isOwner) ...[
        const SizedBox(height: 12),
        Card(child: ListTile(leading: const Icon(Icons.group_add_outlined),
          title: const Text('إدارة المستخدمين'), subtitle: const Text('إنشاء حسابات وتحديد صلاحياتها'),
          trailing: const Icon(Icons.chevron_left),
          onTap: () => openPage(context, AccountUsersPage(api: api)))),
      ],
    ]),
  );
}

class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({required this.api, required this.onChanged, super.key});
  final ErpApi api;
  final VoidCallback onChanged;
  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}
class _ChangePasswordPageState extends State<ChangePasswordPage> {
  final current = TextEditingController();
  final next = TextEditingController();
  final repeat = TextEditingController();
  bool busy = false;
  @override
  void dispose() { current.dispose(); next.dispose(); repeat.dispose(); super.dispose(); }

  Future<void> save() async {
    if (next.text.length < 12 || next.text != repeat.text) {
      showMessage(context, 'كلمة المرور الجديدة لازم تكون ١٢ حرفًا على الأقل ومطابقة للتأكيد'); return;
    }
    setState(() => busy = true);
    try {
      await widget.api.post('/api/mobile/account/password', {
        'currentPassword': current.text, 'newPassword': next.text,
      });
      await widget.api.clearSession();
      if (mounted) widget.onChanged();
    } catch (e) { if (mounted) showMessage(context, '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => FormScaffold(title: 'تغيير كلمة المرور', busy: busy,
    onSubmit: save, children: [
      const FormSection(title: 'تأكيد الهوية', subtitle: 'اكتب كلمة مرورك الحالية، ثم اختر كلمة جديدة.'),
      TextField(controller: current, obscureText: true,
        decoration: const InputDecoration(labelText: 'كلمة المرور الحالية', prefixIcon: Icon(Icons.lock_outline))),
      const SizedBox(height: 12),
      TextField(controller: next, obscureText: true,
        decoration: const InputDecoration(labelText: 'كلمة المرور الجديدة (١٢ حرفًا على الأقل)', prefixIcon: Icon(Icons.key_outlined))),
      const SizedBox(height: 12),
      TextField(controller: repeat, obscureText: true,
        decoration: const InputDecoration(labelText: 'تأكيد كلمة المرور الجديدة', prefixIcon: Icon(Icons.verified_user_outlined))),
      const SizedBox(height: 12),
      const Text('بعد الحفظ سجّل دخولك مجددًا على أجهزة الموبايل.', style: TextStyle(color: Color(0xff657381))),
    ]);
}

class AccountUsersPage extends StatefulWidget {
  const AccountUsersPage({required this.api, super.key});
  final ErpApi api;
  @override
  State<AccountUsersPage> createState() => _AccountUsersPageState();
}
class _AccountUsersPageState extends State<AccountUsersPage> {
  late Future<List<Json>> users = load();
  List<Json> groups = [];
  Json dependencies = {};
  Future<List<Json>> load() async {
    final response = await widget.api.get('/api/mobile/account/users');
    groups = ((response['permissionGroups'] as List?) ?? []).map(json).toList();
    dependencies = json(response['permissionDependencies']);
    return rows(response);
  }
  void reload() => setState(() => users = load());
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('المستخدمون')),
    body: FutureBuilder<List<Json>>(future: users, builder: (context, snapshot) {
      if (!snapshot.hasData) return snapshot.hasError
        ? Center(child: TextButton(onPressed: reload, child: Text('تعذر التحميل · ${snapshot.error}')))
        : const PageSkeleton();
      return RefreshIndicator(onRefresh: () async { reload(); await users; },
        child: ListView(padding: const EdgeInsets.all(16), children: [
          const PageIntro(title: 'فريق العمل', subtitle: 'حدد الصلاحيات المتاحة لكل حساب على الويب والتطبيق', icon: Icons.people_alt_outlined),
          const SizedBox(height: 16),
          FilledButton.icon(onPressed: () async {
            final created = await openPage<bool>(context, UserAccessPage(api: widget.api, groups: groups, dependencies: dependencies));
            if (created == true) reload();
          }, icon: const Icon(Icons.person_add_alt_1), label: const Text('إضافة مستخدم')),
          const SizedBox(height: 16),
          for (final user in snapshot.data!) Padding(padding: const EdgeInsets.only(bottom: 10),
            child: Card(child: ListTile(leading: CircleAvatar(child: Text(str(user['name']).isEmpty ? '؟' : str(user['name']).substring(0, 1))),
              title: Text(str(user['name']).isEmpty ? str(user['email']) : str(user['name'])),
              subtitle: Text(str(user['email']), maxLines: 1, overflow: TextOverflow.ellipsis),
              onTap: user['role'] == 'OWNER' ? null : () async {
                final saved = await openPage<bool>(context, UserAccessPage(api: widget.api, groups: groups, dependencies: dependencies, user: user));
                if (saved == true) reload();
              },
              trailing: StatusPill(label: user['role'] == 'OWNER' ? 'أدمن كامل' : 'تعديل الصلاحيات')))),
        ]));
    }),
  );
}

class UserAccessPage extends StatefulWidget {
  const UserAccessPage({required this.api, required this.groups, required this.dependencies, this.user, super.key});
  final ErpApi api;
  final List<Json> groups;
  final Json dependencies;
  final Json? user;
  @override
  State<UserAccessPage> createState() => _UserAccessPageState();
}
class _UserAccessPageState extends State<UserAccessPage> {
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  final currentPassword = TextEditingController();
  late Set<String> permissions = ((widget.user?['permissions'] as List?) ?? []).map((p) => p.toString()).where((p) => p != '*').toSet();
  bool fullAccess = false;
  bool busy = false;
  bool get editing => widget.user != null;
  @override
  void dispose() { name.dispose(); email.dispose(); password.dispose(); currentPassword.dispose(); super.dispose(); }
  List<String> requiredFor(String key) => ((widget.dependencies[key] as List?) ?? []).map((p) => p.toString()).toList();
  void toggle(String key, bool selected) {
    setState(() {
      void add(String p) { if (!permissions.add(p)) return; for (final dependency in requiredFor(p)) { add(dependency); } }
      if (selected) { add(key); } else {
        permissions.remove(key);
        bool changed = true;
        while (changed) {
          final removed = permissions.where((p) => requiredFor(p).any((d) => !permissions.contains(d))).toList();
          permissions.removeAll(removed); changed = removed.isNotEmpty;
        }
      }
    });
  }
  Future<void> save() async {
    if ((!editing && (name.text.trim().length < 2 || !email.text.contains('@') || password.text.length < 12)) || currentPassword.text.isEmpty) {
      showMessage(context, 'راجع بيانات الحساب وكلمة مرورك الحالية'); return;
    }
    if (!await confirm(context, fullAccess ? 'الحساب الجديد سيملك كل الصلاحيات، بما فيها إدارة المستخدمين. تأكيد؟' : 'حفظ الصلاحيات المحددة لهذا الحساب؟ تعديلها يلغي جلسات التطبيق السابقة.')) return;
    setState(() => busy = true);
    try {
      final body = <String, dynamic>{'permissions': permissions.toList(), 'currentPassword': currentPassword.text};
      if (editing) {
        body['userId'] = widget.user!['id'];
        await widget.api.patch('/api/mobile/account/users', body);
      } else {
        body.addAll({'name': name.text.trim(), 'email': email.text.trim(), 'password': password.text, 'fullAccess': fullAccess});
        await widget.api.post('/api/mobile/account/users', body);
      }
      if (mounted) { showMessage(context, 'تم حفظ الحساب وصلاحياته'); Navigator.pop(context, true); }
    } catch (e) { if (mounted) showMessage(context, '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => FormScaffold(title: editing ? 'صلاحيات ${widget.user!['name']}' : 'مستخدم جديد', busy: busy, onSubmit: save, children: [
    if (!editing) ...[
      const FormSection(title: 'بيانات الحساب', subtitle: 'الحساب يبدأ بدون صلاحيات؛ اختر ما تسمح له به.'),
      field('الاسم', name), field('البريد الإلكتروني', email, type: TextInputType.emailAddress),
      TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'كلمة المرور (١٢ حرفًا على الأقل)')),
      CheckboxListTile(title: const Text('أدمن كامل'), subtitle: const Text('كل البيانات وإدارة المستخدمين'), value: fullAccess, onChanged: busy ? null : (v) => setState(() => fullAccess = v == true)),
    ],
    if (!fullAccess) ...[
      const FormSection(title: 'الصلاحيات', subtitle: 'اختيار عملية يحدد الصلاحيات المرتبطة التي تحتاجها. إلغاء صلاحية يلغي العمليات التي تعتمد عليها.'),
      for (final group in widget.groups) ...[
        Padding(padding: const EdgeInsets.only(top: 16), child: Text(str(group['label']), style: const TextStyle(fontWeight: FontWeight.bold))),
        for (final item in group['items'] as List) CheckboxListTile(contentPadding: EdgeInsets.zero, title: Text(str(item[1])), value: permissions.contains(str(item[0])), onChanged: busy ? null : (v) => toggle(str(item[0]), v == true)),
      ],
    ],
    const SizedBox(height: 16),
    const FormSection(title: 'تأكيد العملية', subtitle: 'اكتب كلمة مرور حساب الأدمن الحالي.'),
    TextField(controller: currentPassword, obscureText: true, decoration: const InputDecoration(labelText: 'كلمة مرورك الحالية')),
  ]);
}
