import '../core/json_parsing.dart';

class AuditLogEntry {
  final int id;
  final int? userId;
  final String? userName;
  final String action;
  final String entityType;
  final String? entityId;
  final String? description;
  final String? ipAddress;
  final String createdAt;

  AuditLogEntry({
    required this.id,
    this.userId,
    this.userName,
    required this.action,
    required this.entityType,
    this.entityId,
    this.description,
    this.ipAddress,
    required this.createdAt,
  });

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) {
    return AuditLogEntry(
      id: asInt(json['id']),
      userId: asIntOrNull(json['user_id']),
      userName: json['user_name'] as String?,
      action: json['action'] as String? ?? '',
      entityType: json['entity_type'] as String? ?? '',
      entityId: json['entity_id']?.toString(),
      description: json['description'] as String?,
      ipAddress: json['ip_address'] as String?,
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}
