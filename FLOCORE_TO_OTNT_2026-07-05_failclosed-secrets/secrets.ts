/**
 * Fail-closed secret loading (2026-07-05 gating-integrity remediation).
 *
 * In PRODUCTION, a secret that is unset OR left at a known insecure default aborts boot — no
 * insecure fallback constant may ever ship live. In development, a labelled fallback is allowed
 * for local work. This makes the "is the env configured?" question moot: a misconfigured prod
 * deploy fails fast and loud instead of silently running an open backdoor.
 *
 * Imported first thing in src/server/index.ts (right after dotenv) so the guard runs at boot.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

// The historical hardcoded fallbacks — rejected in production even if explicitly set to them.
const KNOWN_DEFAULTS: Record<string, string[]> = {
  JWT_SECRET: ['puregro-dev-secret-change-in-production'],
  INTERNAL_API_KEY: ['origin_internal_2026', 'puregro_internal_2026'],
};

function requireSecret(name: string, devFallback: string): string {
  const val = process.env[name];
  if (IS_PROD) {
    const banned = KNOWN_DEFAULTS[name] ?? [];
    if (!val || banned.includes(val)) {
      throw new Error(
        `[FATAL] ${name} is unset or set to a known default in production. ` +
          `Set a strong, unique ${name} in the environment. Refusing to boot.`,
      );
    }
    return val;
  }
  return val || devFallback;
}

/** JWT signing secret. Prod: env-required, no fallback. */
export const JWT_SECRET = requireSecret('JWT_SECRET', 'puregro-dev-secret-change-in-production');

/** Internal service key — inbound pharmacy gate + outbound POS call. Prod: env-required. */
export const INTERNAL_API_KEY = requireSecret('INTERNAL_API_KEY', 'origin_internal_2026');

/**
 * Master bypass PIN — mints a session for ANY email, skipping OTP.
 * DEV-ONLY: null in production so the bypass branch can never match. Never a live backdoor.
 */
export const BYPASS_PIN: string | null = IS_PROD ? null : process.env.BYPASS_PIN || '830101';
