function maskAadhaar(aadhaar) {
  if (!aadhaar) return aadhaar;
  const digits = String(aadhaar).replace(/\s+/g, '');
  if (digits.length < 4) return 'XXXX XXXX XXXX';
  const last4 = digits.slice(-4);
  return `XXXX XXXX ${last4}`;
}

function maskPan(pan) {
  if (!pan) return pan;
  const value = String(pan).toUpperCase();
  if (value.length < 4) return 'XXXXXXXXXX';
  return `${value.slice(0, 2)}XXXXXX${value.slice(-2)}`;
}

module.exports = { maskAadhaar, maskPan };
