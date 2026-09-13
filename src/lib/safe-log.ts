const SENSITIVE = /password|passwd|token|secret|authorization|cookie|auth_secret|api[_-]?key/i;

/** Sanitize objects before logging — never log passwords/tokens. */
export function sanitizeForLog(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 200) return value.slice(0, 200) + "…";
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE.test(k)) out[k] = "[redacted]";
      else out[k] = sanitizeForLog(v);
    }
    return out;
  }
  return value;
}

export function safeError(e: unknown) {
  if (e instanceof Error) {
    console.error(e.name, e.message);
  } else {
    console.error(sanitizeForLog(e));
  }
}
