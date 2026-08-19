const { v4: uuidv4 } = require('uuid');
const KycProviderInterface = require('./kycProvider.interface');

/**
 * Manual KYC provider — the default and only fully-supported mode.
 * Records that PAN/Aadhaar were manually entered by the applicant and
 * reviewed by staff during document verification. Does NOT call any
 * external government database and does NOT claim "verified" status —
 * the UI must plainly label these fields as manual entry.
 */
class ManualKycProvider extends KycProviderInterface {
  async verifyIdentity({ panNumber, aadhaarNumber, applicantName }) {
    return {
      status: 'MANUAL_ENTRY',
      reference: `MANUAL-${uuidv4()}`,
      provider: 'manual',
      note: 'Identity details captured via manual data entry; verified against physical/self-attested documents during document verification step, not against a government database.',
    };
  }
}

module.exports = ManualKycProvider;
