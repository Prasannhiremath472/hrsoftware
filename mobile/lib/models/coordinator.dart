import '../core/json_parsing.dart';

enum CoordinatorStatus { active, inactive }

CoordinatorStatus coordinatorStatusFromString(String? value) {
  switch (value) {
    case 'INACTIVE':
      return CoordinatorStatus.inactive;
    case 'ACTIVE':
    default:
      return CoordinatorStatus.active;
  }
}

String coordinatorStatusToString(CoordinatorStatus status) {
  return status == CoordinatorStatus.active ? 'ACTIVE' : 'INACTIVE';
}

class Coordinator {
  final int id;
  final String name;
  final String mobile;
  final String? email;
  final String? employeeCode;
  final String? location;
  final CoordinatorStatus status;
  final int candidateCount;
  final String createdAt;
  final String updatedAt;

  Coordinator({
    required this.id,
    required this.name,
    required this.mobile,
    this.email,
    this.employeeCode,
    this.location,
    required this.status,
    required this.candidateCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Coordinator.fromJson(Map<String, dynamic> json) {
    return Coordinator(
      id: asInt(json['id']),
      name: json['name'] as String,
      mobile: json['mobile'] as String,
      email: json['email'] as String?,
      employeeCode: json['employee_code'] as String?,
      location: json['location'] as String?,
      status: coordinatorStatusFromString(json['status'] as String?),
      candidateCount: asInt(json['candidate_count']),
      createdAt: json['created_at']?.toString() ?? '',
      updatedAt: json['updated_at']?.toString() ?? '',
    );
  }

  bool get isActive => status == CoordinatorStatus.active;
}

/// Request payload for POST /coordinators and PATCH /coordinators/:id.
class CoordinatorPayload {
  final String name;
  final String mobile;
  final String? email;
  final String? employeeCode;
  final String? location;

  CoordinatorPayload({
    required this.name,
    required this.mobile,
    this.email,
    this.employeeCode,
    this.location,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'name': name, 'mobile': mobile};
    if (email != null && email!.isNotEmpty) map['email'] = email;
    if (employeeCode != null && employeeCode!.isNotEmpty) map['employeeCode'] = employeeCode;
    if (location != null && location!.isNotEmpty) map['location'] = location;
    return map;
  }
}
