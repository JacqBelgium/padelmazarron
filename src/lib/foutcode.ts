// For logging: only a short code from an error (Postgres/Supabase code, else the error name), never the
// full object or message, because those can contain personal data such as e-mail addresses.
export function foutCode(fout: unknown): string {
  const f = (fout ?? {}) as { code?: unknown; name?: unknown }
  if (typeof f.code === 'string' && f.code) return f.code
  if (typeof f.name === 'string' && f.name) return f.name
  return 'unknown'
}
