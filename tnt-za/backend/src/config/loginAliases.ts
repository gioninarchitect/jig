// ─────────────────────────────────────────────────────────────────────────────
// Login e-mail aliases (root fix for "I can't log in").
//
// ILCO's identity scheme mixes ROLE mailboxes (nm@, fm@, jen@, lou@) and, for the
// owners, plus-addressed gmail (florisolivier7+ilse@…). Real people naturally type
// their OWN name — edgar@, ray@, ilse@ — which matches no account, so the login
// fails and it looks like "the system is down" when it isn't. (Edgar, 2026-07-14.)
//
// This maps the obvious name variants onto the real account. It is applied ONLY as a
// FALLBACK, after an exact-email lookup returns no user — so an alias can only turn a
// currently-FAILING login into a working one; it can never shadow or break a real
// account. If a genuine edgar@ account is created later, the exact match wins.
//
// Genuinely shared logins (cultivator@ / trimmer@ / cleaner@) are intentionally NOT
// aliased — they are role accounts by design.
//
// This is the quick fix. The durable fix is to standardise on name-based accounts and
// dedupe (keeping role accounts only where the login is truly shared).
// ─────────────────────────────────────────────────────────────────────────────

export const LOGIN_ALIASES: Record<string, string> = {
  // Nursery Manager — Edgar
  'edgar@ilcofarming.co.za': 'nm@ilcofarming.co.za',

  // Facility Manager — Ray
  'ray@ilcofarming.co.za': 'fm@ilcofarming.co.za',

  // Head of Cultivation — Lou (Lourens Eksteen)
  'lourens@ilcofarming.co.za': 'lou@ilcofarming.co.za',

  // Processing Manager — Jeanette Ferreira
  'jeanette@ilcofarming.co.za': 'jen@ilcofarming.co.za',

  // Owners / staff whose real login is a plus-addressed gmail (unguessable)
  'ilse@ilcofarming.co.za': 'florisolivier7+ilse@gmail.com',
  'coenie@ilcofarming.co.za': 'florisolivier7+coenie@gmail.com',
  'sipho@ilcofarming.co.za': 'florisolivier7+sipho@gmail.com',

  // Super admin — Flo
  'flo@ilcofarming.co.za': 'florisolivier7@gmail.com',
  'floris@ilcofarming.co.za': 'florisolivier7@gmail.com',
};

/**
 * Resolve a login e-mail to its canonical account e-mail.
 * Returns null when there is no alias (caller keeps the original failure).
 * `email` must already be trimmed + lowercased.
 */
export function resolveLoginAlias(email: string): string | null {
  return LOGIN_ALIASES[email] ?? null;
}
