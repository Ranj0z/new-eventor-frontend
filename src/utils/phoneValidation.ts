// Accepted Kenyan phone formats, matching the backend's
// normalizePhoneNumber.ts: 0[17]XXXXXXXX (10 digits) or 254XXXXXXXXX
// (12 digits) once non-digit characters are stripped. Shared here so
// CreateRSVPModal and PaymentModal don't each carry their own copy of the
// regex — see eventor-build-conventions.md's "don't duplicate inline" rule.
export function isValidKenyanPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return /^0[17]\d{8}$/.test(digits) || /^254\d{9}$/.test(digits);
}
