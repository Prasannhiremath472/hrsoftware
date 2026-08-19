enum KycGender { male, female }

KycGender? kycGenderFromString(String? value) {
  if (value == 'MALE') return KycGender.male;
  if (value == 'FEMALE') return KycGender.female;
  return null;
}

String kycGenderToString(KycGender g) => g == KycGender.male ? 'MALE' : 'FEMALE';

enum MaritalStatus { single, married }

MaritalStatus? maritalStatusFromString(String? value) {
  if (value == 'SINGLE') return MaritalStatus.single;
  if (value == 'MARRIED') return MaritalStatus.married;
  return null;
}

String maritalStatusToString(MaritalStatus s) => s == MaritalStatus.single ? 'SINGLE' : 'MARRIED';

enum ResidencyStatus { residentIndividual, nonResident, foreignNational }

const Map<String, ResidencyStatus> _residencyFromString = {
  'RESIDENT_INDIVIDUAL': ResidencyStatus.residentIndividual,
  'NON_RESIDENT': ResidencyStatus.nonResident,
  'FOREIGN_NATIONAL': ResidencyStatus.foreignNational,
};
const Map<ResidencyStatus, String> _residencyToString = {
  ResidencyStatus.residentIndividual: 'RESIDENT_INDIVIDUAL',
  ResidencyStatus.nonResident: 'NON_RESIDENT',
  ResidencyStatus.foreignNational: 'FOREIGN_NATIONAL',
};

ResidencyStatus? residencyStatusFromString(String? v) => v == null ? null : _residencyFromString[v];
String residencyStatusToString(ResidencyStatus s) => _residencyToString[s]!;

String residencyStatusLabel(ResidencyStatus s) {
  switch (s) {
    case ResidencyStatus.residentIndividual:
      return 'Resident Individual';
    case ResidencyStatus.nonResident:
      return 'Non-Resident';
    case ResidencyStatus.foreignNational:
      return 'Foreign National';
  }
}

enum ProofOfIdentity { aadhaar, pan, passport, dl, voterId, other }

const Map<String, ProofOfIdentity> _poiFromString = {
  'AADHAAR': ProofOfIdentity.aadhaar,
  'PAN': ProofOfIdentity.pan,
  'PASSPORT': ProofOfIdentity.passport,
  'DL': ProofOfIdentity.dl,
  'VOTER_ID': ProofOfIdentity.voterId,
  'OTHER': ProofOfIdentity.other,
};
const Map<ProofOfIdentity, String> _poiToString = {
  ProofOfIdentity.aadhaar: 'AADHAAR',
  ProofOfIdentity.pan: 'PAN',
  ProofOfIdentity.passport: 'PASSPORT',
  ProofOfIdentity.dl: 'DL',
  ProofOfIdentity.voterId: 'VOTER_ID',
  ProofOfIdentity.other: 'OTHER',
};

ProofOfIdentity? proofOfIdentityFromString(String? v) => v == null ? null : _poiFromString[v];
String proofOfIdentityToString(ProofOfIdentity p) => _poiToString[p]!;

String proofOfIdentityLabel(ProofOfIdentity p) {
  switch (p) {
    case ProofOfIdentity.aadhaar:
      return 'Aadhaar Card';
    case ProofOfIdentity.pan:
      return 'PAN Card';
    case ProofOfIdentity.passport:
      return 'Passport';
    case ProofOfIdentity.dl:
      return 'Driving Licence';
    case ProofOfIdentity.voterId:
      return 'Voter ID';
    case ProofOfIdentity.other:
      return 'Other';
  }
}

/// GET /candidates/:id/kyc — identity numbers come back MASKED
/// (e.g. "XXXX XXXX 1234"). Never treat these as real editable values.
class KycData {
  final int id;
  final int candidateId;
  final String? applicantName;
  final String? fatherSpouseName;
  final KycGender? gender;
  final MaritalStatus? maritalStatus;
  final String? dob;
  final String nationality;
  final ResidencyStatus? residencyStatus;
  final String? panNumberMasked;
  final String? aadhaarNumberMasked;
  final ProofOfIdentity? proofOfIdentity;
  final bool isCompleted;

  KycData({
    required this.id,
    required this.candidateId,
    this.applicantName,
    this.fatherSpouseName,
    this.gender,
    this.maritalStatus,
    this.dob,
    required this.nationality,
    this.residencyStatus,
    this.panNumberMasked,
    this.aadhaarNumberMasked,
    this.proofOfIdentity,
    required this.isCompleted,
  });

  factory KycData.fromJson(Map<String, dynamic> json) {
    return KycData(
      id: json['id'] as int,
      candidateId: json['candidate_id'] as int,
      applicantName: json['applicant_name'] as String?,
      fatherSpouseName: json['father_spouse_name'] as String?,
      gender: kycGenderFromString(json['gender'] as String?),
      maritalStatus: maritalStatusFromString(json['marital_status'] as String?),
      dob: json['dob'] as String?,
      nationality: json['nationality'] as String? ?? 'India',
      residencyStatus: residencyStatusFromString(json['residency_status'] as String?),
      panNumberMasked: json['pan_number'] as String?,
      aadhaarNumberMasked: json['aadhaar_number'] as String?,
      proofOfIdentity: proofOfIdentityFromString(json['proof_of_identity'] as String?),
      isCompleted: _asBool01(json['is_completed']),
    );
  }
}

bool _asBool01(Object? v) {
  if (v is bool) return v;
  if (v is int) return v == 1;
  return false;
}

/// PUT /candidates/:id/kyc payload. panNumber/aadhaarNumber are OMITTED
/// entirely when left blank so the server keeps the existing value.
class KycPayload {
  final String applicantName;
  final String? fatherSpouseName;
  final KycGender gender;
  final MaritalStatus? maritalStatus;
  final String dob;
  final String? nationality;
  final ResidencyStatus? residencyStatus;
  final String? panNumber;
  final String? aadhaarNumber;
  final ProofOfIdentity proofOfIdentity;

  KycPayload({
    required this.applicantName,
    this.fatherSpouseName,
    required this.gender,
    this.maritalStatus,
    required this.dob,
    this.nationality,
    this.residencyStatus,
    this.panNumber,
    this.aadhaarNumber,
    required this.proofOfIdentity,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'applicantName': applicantName,
      'gender': kycGenderToString(gender),
      'dob': dob,
      'proofOfIdentity': proofOfIdentityToString(proofOfIdentity),
    };
    if (fatherSpouseName != null && fatherSpouseName!.isNotEmpty) {
      map['fatherSpouseName'] = fatherSpouseName;
    }
    if (maritalStatus != null) map['maritalStatus'] = maritalStatusToString(maritalStatus!);
    if (nationality != null && nationality!.isNotEmpty) map['nationality'] = nationality;
    if (residencyStatus != null) map['residencyStatus'] = residencyStatusToString(residencyStatus!);
    // Omitted entirely (not sent as empty string) when blank, per contract.
    if (panNumber != null && panNumber!.trim().isNotEmpty) map['panNumber'] = panNumber!.trim().toUpperCase();
    if (aadhaarNumber != null && aadhaarNumber!.trim().isNotEmpty) {
      map['aadhaarNumber'] = aadhaarNumber!.replaceAll(RegExp(r'\s+'), '');
    }
    return map;
  }
}
