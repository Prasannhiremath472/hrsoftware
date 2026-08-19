import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../core/validators.dart';
import '../../models/document.dart';
import '../../models/settings.dart';
import '../../providers/service_providers.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/section_card.dart';

final _appSettingsProvider = FutureProvider.autoDispose<AppSettings>((ref) async {
  return ref.watch(settingsServiceProvider).get();
});

final _documentTypesProvider = FutureProvider.autoDispose<List<DocumentType>>((ref) async {
  final result = await ref.watch(documentServiceProvider).listTypesPaginated(page: 1, limit: 100);
  return result.rows;
});

/// Document types management (list + add + toggle mandatory/active) and
/// application settings (prefix, max file size, mandatory-step toggles).
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Settings'),
          leading: Builder(builder: (context) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(context).openDrawer())),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Document Types'),
              Tab(text: 'App Settings'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _DocumentTypesTab(),
            _AppSettingsTab(),
          ],
        ),
      ),
    );
  }
}

class _DocumentTypesTab extends ConsumerWidget {
  const _DocumentTypesTab();

  Future<void> _addType(BuildContext context, WidgetRef ref) async {
    final result = await showModalBottomSheet<DocumentTypePayload>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _DocumentTypeFormSheet(),
    );
    if (result == null) return;
    try {
      await ref.read(documentServiceProvider).createType(result);
      ref.invalidate(_documentTypesProvider);
      if (context.mounted) showAppSnackBar(context, 'Document type created');
    } catch (e) {
      if (context.mounted) showAppSnackBar(context, e is ApiException ? e.message : 'Failed to create document type', isError: true);
    }
  }

  Future<void> _toggle(BuildContext context, WidgetRef ref, DocumentType type, {bool? isMandatory, bool? isActive}) async {
    try {
      await ref.read(documentServiceProvider).updateType(type.id, isMandatory: isMandatory, isActive: isActive);
      ref.invalidate(_documentTypesProvider);
    } catch (e) {
      if (context.mounted) showAppSnackBar(context, e is ApiException ? e.message : 'Failed to update document type', isError: true);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final typesAsync = ref.watch(_documentTypesProvider);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _addType(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Type'),
      ),
      body: typesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorBanner(message: 'Failed to load document types: $e', onRetry: () => ref.invalidate(_documentTypesProvider)),
        data: (types) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(_documentTypesProvider),
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 100),
            itemCount: types.length,
            itemBuilder: (context, index) {
              final type = types[index];
              return Container(
                margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(type.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
                        Text(type.code, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: _SwitchRow(
                            label: 'Mandatory',
                            value: type.isMandatory,
                            onChanged: (v) => _toggle(context, ref, type, isMandatory: v),
                          ),
                        ),
                        Expanded(
                          child: _SwitchRow(
                            label: 'Active',
                            value: type.isActive,
                            onChanged: (v) => _toggle(context, ref, type, isActive: v),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _SwitchRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _SwitchRow({required this.label, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
        Switch(value: value, onChanged: onChanged),
      ],
    );
  }
}

class _DocumentTypeFormSheet extends StatefulWidget {
  const _DocumentTypeFormSheet();

  @override
  State<_DocumentTypeFormSheet> createState() => _DocumentTypeFormSheetState();
}

class _DocumentTypeFormSheetState extends State<_DocumentTypeFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _codeController = TextEditingController();
  final _orderController = TextEditingController(text: '0');
  bool _isMandatory = false;

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _orderController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Add Document Type', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: AppSpacing.lg),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Name *', counterText: ''),
                  maxLength: 150,
                  validator: (v) => requiredText(v, label: 'Name', maxLength: 150),
                ),
                const SizedBox(height: AppSpacing.md),
                TextFormField(
                  controller: _codeController,
                  decoration: const InputDecoration(labelText: 'Code *', hintText: 'e.g. PASSPORT_PHOTO', counterText: ''),
                  textCapitalization: TextCapitalization.characters,
                  maxLength: 80,
                  validator: (v) => requiredText(v, label: 'Code', maxLength: 80),
                ),
                const SizedBox(height: AppSpacing.md),
                TextFormField(
                  controller: _orderController,
                  decoration: const InputDecoration(labelText: 'Display Order'),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: AppSpacing.md),
                SwitchListTile(
                  value: _isMandatory,
                  onChanged: (v) => setState(() => _isMandatory = v),
                  title: const Text('Mandatory', style: TextStyle(fontSize: 13.5)),
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: AppSpacing.lg),
                ElevatedButton(
                  onPressed: () {
                    if (!_formKey.currentState!.validate()) return;
                    Navigator.of(context).pop(DocumentTypePayload(
                      name: _nameController.text.trim(),
                      code: _codeController.text.trim(),
                      isMandatory: _isMandatory,
                      displayOrder: int.tryParse(_orderController.text.trim()) ?? 0,
                    ));
                  },
                  child: const Text('Create'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AppSettingsTab extends ConsumerStatefulWidget {
  const _AppSettingsTab();

  @override
  ConsumerState<_AppSettingsTab> createState() => _AppSettingsTabState();
}

class _AppSettingsTabState extends ConsumerState<_AppSettingsTab> {
  final _prefixController = TextEditingController();
  final _maxFileSizeController = TextEditingController();
  final Map<String, bool> _flags = {};
  bool _initialized = false;
  bool _saving = false;

  void _hydrate(AppSettings settings) {
    if (_initialized) return;
    _prefixController.text = settings.candidateNumberPrefix;
    _maxFileSizeController.text = settings.maxFileSizeMb;
    _flags['require_original_verification'] = AppSettings.isFlagOn(settings.requireOriginalVerification);
    _flags['require_biometric'] = AppSettings.isFlagOn(settings.requireBiometric);
    _flags['require_signature'] = AppSettings.isFlagOn(settings.requireSignature);
    _flags['require_declaration'] = AppSettings.isFlagOn(settings.requireDeclaration);
    _initialized = true;
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(settingsServiceProvider).update({
        'candidate_number_prefix': _prefixController.text.trim(),
        'max_file_size_mb': _maxFileSizeController.text.trim(),
        for (final entry in _flags.entries) entry.key: entry.value.toString(),
      });
      ref.invalidate(_appSettingsProvider);
      if (mounted) showAppSnackBar(context, 'Settings updated');
    } catch (e) {
      if (mounted) showAppSnackBar(context, e is ApiException ? e.message : 'Failed to update settings', isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _prefixController.dispose();
    _maxFileSizeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(_appSettingsProvider);

    return settingsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorBanner(message: 'Failed to load settings: $e', onRetry: () => ref.invalidate(_appSettingsProvider)),
      data: (settings) {
        _hydrate(settings);
        return ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            SectionCard(
              title: 'General',
              child: Column(
                children: [
                  TextField(
                    controller: _prefixController,
                    decoration: const InputDecoration(labelText: 'Candidate Number Prefix'),
                    textCapitalization: TextCapitalization.characters,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  TextField(
                    controller: _maxFileSizeController,
                    decoration: const InputDecoration(labelText: 'Max File Size (MB)'),
                    keyboardType: TextInputType.number,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            SectionCard(
              title: 'Mandatory Steps',
              subtitle: 'Toggle which wizard steps are required for a candidate to be submitted.',
              child: Column(
                children: settingFlags
                    .map((flag) => SwitchListTile(
                          value: _flags[flag[0]] ?? false,
                          onChanged: (v) => setState(() => _flags[flag[0]] = v),
                          title: Text(flag[1], style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                          contentPadding: EdgeInsets.zero,
                        ))
                    .toList(),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Settings'),
            ),
          ],
        );
      },
    );
  }
}
