const ManualKycProvider = require('./manualKycProvider');

/**
 * Placeholder for a real licensed KYC/PAN/Aadhaar verification API
 * integration (e.g. an authorized UIDAI KUA/AUA or NSDL/Protean PAN
 * verification vendor). Not implemented — selecting KYC_PROVIDER=provider
 * will throw until a real integration is added here. Building a fake
 * "verified" response would be misleading and is intentionally avoided.
 */
class ProviderAdapter {
  async verifyIdentity() {
    throw new Error(
      'External KYC provider integration is not configured. Set KYC_PROVIDER=manual for development, or implement a licensed provider integration in providerAdapter.js.'
    );
  }
}

function resolveKycProvider() {
  const mode = (process.env.KYC_PROVIDER || 'manual').toLowerCase();
  if (mode === 'provider') return new ProviderAdapter();
  return new ManualKycProvider();
}

const provider = resolveKycProvider();

module.exports = {
  verifyIdentity: (...args) => provider.verifyIdentity(...args),
  providerName: (process.env.KYC_PROVIDER || 'manual').toLowerCase(),
};
