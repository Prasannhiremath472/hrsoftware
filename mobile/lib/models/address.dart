enum ProofOfAddress { aadhaar, passport, utilityBill, bankStatement, rentAgreement, other }

const Map<String, ProofOfAddress> _poaFromString = {
  'AADHAAR': ProofOfAddress.aadhaar,
  'PASSPORT': ProofOfAddress.passport,
  'UTILITY_BILL': ProofOfAddress.utilityBill,
  'BANK_STATEMENT': ProofOfAddress.bankStatement,
  'RENT_AGREEMENT': ProofOfAddress.rentAgreement,
  'OTHER': ProofOfAddress.other,
};
const Map<ProofOfAddress, String> _poaToString = {
  ProofOfAddress.aadhaar: 'AADHAAR',
  ProofOfAddress.passport: 'PASSPORT',
  ProofOfAddress.utilityBill: 'UTILITY_BILL',
  ProofOfAddress.bankStatement: 'BANK_STATEMENT',
  ProofOfAddress.rentAgreement: 'RENT_AGREEMENT',
  ProofOfAddress.other: 'OTHER',
};

ProofOfAddress? proofOfAddressFromString(String? v) => v == null ? null : _poaFromString[v];
String proofOfAddressToString(ProofOfAddress p) => _poaToString[p]!;

String proofOfAddressLabel(ProofOfAddress p) {
  switch (p) {
    case ProofOfAddress.aadhaar:
      return 'Aadhaar Card';
    case ProofOfAddress.passport:
      return 'Passport';
    case ProofOfAddress.utilityBill:
      return 'Utility Bill';
    case ProofOfAddress.bankStatement:
      return 'Bank Statement';
    case ProofOfAddress.rentAgreement:
      return 'Rent Agreement';
    case ProofOfAddress.other:
      return 'Other';
  }
}

class AddressData {
  final int id;
  final int candidateId;
  final String? residenceAddress;
  final String? residencePinCode;
  final String? contactEmail;
  final String? contactMobile;
  final ProofOfAddress? proofOfAddress;
  final bool sameAsResidence;
  final String? permanentAddress;
  final String? permanentPinCode;
  final bool isCompleted;

  AddressData({
    required this.id,
    required this.candidateId,
    this.residenceAddress,
    this.residencePinCode,
    this.contactEmail,
    this.contactMobile,
    this.proofOfAddress,
    required this.sameAsResidence,
    this.permanentAddress,
    this.permanentPinCode,
    required this.isCompleted,
  });

  factory AddressData.fromJson(Map<String, dynamic> json) {
    return AddressData(
      id: json['id'] as int,
      candidateId: json['candidate_id'] as int,
      residenceAddress: json['residence_address'] as String?,
      residencePinCode: json['residence_pin_code'] as String?,
      contactEmail: json['contact_email'] as String?,
      contactMobile: json['contact_mobile'] as String?,
      proofOfAddress: proofOfAddressFromString(json['proof_of_address'] as String?),
      sameAsResidence: _asBool01(json['same_as_residence']),
      permanentAddress: json['permanent_address'] as String?,
      permanentPinCode: json['permanent_pin_code'] as String?,
      isCompleted: _asBool01(json['is_completed']),
    );
  }
}

bool _asBool01(Object? v) {
  if (v is bool) return v;
  if (v is int) return v == 1;
  return false;
}

class AddressPayload {
  final String residenceAddress;
  final String residencePinCode;
  final String? contactEmail;
  final String? contactMobile;
  final ProofOfAddress proofOfAddress;
  final bool sameAsResidence;
  final String? permanentAddress;
  final String? permanentPinCode;

  AddressPayload({
    required this.residenceAddress,
    required this.residencePinCode,
    this.contactEmail,
    this.contactMobile,
    required this.proofOfAddress,
    required this.sameAsResidence,
    this.permanentAddress,
    this.permanentPinCode,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'residenceAddress': residenceAddress,
      'residencePinCode': residencePinCode,
      'proofOfAddress': proofOfAddressToString(proofOfAddress),
      'sameAsResidence': sameAsResidence,
    };
    if (contactEmail != null && contactEmail!.isNotEmpty) map['contactEmail'] = contactEmail;
    if (contactMobile != null && contactMobile!.isNotEmpty) map['contactMobile'] = contactMobile;
    if (permanentAddress != null && permanentAddress!.isNotEmpty) map['permanentAddress'] = permanentAddress;
    if (permanentPinCode != null && permanentPinCode!.isNotEmpty) map['permanentPinCode'] = permanentPinCode;
    return map;
  }
}
