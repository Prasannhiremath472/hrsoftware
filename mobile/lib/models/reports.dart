import '../core/json_parsing.dart';

enum ReportKey { candidates, coordinators, status, biometric, documents }

const List<Map<String, dynamic>> reportDefs = [
  {'key': ReportKey.candidates, 'label': 'Candidates Report'},
  {'key': ReportKey.coordinators, 'label': 'Coordinators Report'},
  {'key': ReportKey.status, 'label': 'Status Distribution Report'},
  {'key': ReportKey.biometric, 'label': 'Biometric Capture Report'},
  {'key': ReportKey.documents, 'label': 'Documents Report'},
];

String reportKeyToPath(ReportKey key) {
  switch (key) {
    case ReportKey.candidates:
      return 'candidates';
    case ReportKey.coordinators:
      return 'coordinators';
    case ReportKey.status:
      return 'status';
    case ReportKey.biometric:
      return 'biometric';
    case ReportKey.documents:
      return 'documents';
  }
}

/// Report rows are rendered generically from whatever columns the backend
/// returns.
typedef ReportRow = Map<String, dynamic>;

class CoordinatorReportRow {
  final int id;
  final String name;
  final String mobile;
  final String? email;
  final String status;
  final int totalCandidates;
  final int completedCandidates;

  CoordinatorReportRow({
    required this.id,
    required this.name,
    required this.mobile,
    this.email,
    required this.status,
    required this.totalCandidates,
    required this.completedCandidates,
  });

  factory CoordinatorReportRow.fromJson(Map<String, dynamic> json) {
    return CoordinatorReportRow(
      id: asInt(json['id']),
      name: json['name'] as String? ?? '',
      mobile: json['mobile'] as String? ?? '',
      email: json['email'] as String?,
      status: json['status'] as String? ?? 'ACTIVE',
      totalCandidates: asInt(json['total_candidates']),
      completedCandidates: asInt(json['completed_candidates']),
    );
  }
}

class MonthlyRegistrationRow {
  final String month;
  final int total;

  MonthlyRegistrationRow({required this.month, required this.total});

  factory MonthlyRegistrationRow.fromJson(Map<String, dynamic> json) {
    return MonthlyRegistrationRow(
      month: json['month']?.toString() ?? '',
      total: asInt(json['total']),
    );
  }
}

class StatusDistributionRow {
  final String status;
  final int total;

  StatusDistributionRow({required this.status, required this.total});

  factory StatusDistributionRow.fromJson(Map<String, dynamic> json) {
    return StatusDistributionRow(
      status: json['status']?.toString() ?? '',
      total: asInt(json['total']),
    );
  }
}
