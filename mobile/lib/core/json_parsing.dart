/// Backend numeric columns backed by SQL aggregates (SUM, DECIMAL) can be
/// serialized as JSON strings rather than numbers depending on the MySQL
/// driver/column type (e.g. `SUM()` results come back as strings under
/// mysql2), while plain `COUNT()` results come back as numbers. Parsing
/// every numeric field through these helpers makes model decoding immune to
/// that inconsistency instead of asserting a specific wire type per field.
int asInt(dynamic value, [int fallback = 0]) {
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

int? asIntOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

double asDouble(dynamic value, [double fallback = 0]) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}
