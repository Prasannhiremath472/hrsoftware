import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/candidate.dart';
import 'service_providers.dart';

/// Fetches and caches a single candidate by id, used by the wizard shell so
/// every step screen shares the same up-to-date candidate record. Call
/// `ref.invalidate(candidateDetailProvider(id))` after any step save.
final candidateDetailProvider =
    FutureProvider.family<Candidate, int>((ref, id) async {
  final service = ref.watch(candidateServiceProvider);
  return service.getOne(id);
});
