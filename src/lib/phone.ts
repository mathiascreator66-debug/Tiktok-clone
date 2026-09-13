/** Normalize to E.164-ish (+digits). Returns null if invalid. */
export function normalizePhoneE164(raw: string): string | null {
  const cleaned = String(raw || "").replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  let digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  digits = digits.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function looksLikePhone(value: string): boolean {
  const t = value.trim();
  if (looksLikeEmail(t)) return false;
  return /^\+?[\d\s().-]{8,}$/.test(t);
}
