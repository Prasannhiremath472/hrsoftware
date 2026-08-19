/**
 * KYC provider interface.
 *
 * verifyIdentity({ panNumber, aadhaarNumber, applicantName }): Promise<{
 *   status: 'MANUAL_ENTRY' | 'VERIFIED' | 'FAILED',
 *   reference: string | null,
 *   provider: string,
 * }>
 *
 * NOTE: Aadhaar/PAN verification against government databases requires
 * licensed API access (e.g. UIDAI-authorized KUA/AUA, NSDL/Protean PAN
 * verification API) which is out of scope here. The 'manual' provider
 * simply records that KYC data was manually entered/reviewed by staff —
 * it never claims government-verified status.
 */
class KycProviderInterface {
  // eslint-disable-next-line no-unused-vars
  async verifyIdentity({ panNumber, aadhaarNumber, applicantName }) {
    throw new Error('verifyIdentity() not implemented');
  }
}

module.exports = KycProviderInterface;
