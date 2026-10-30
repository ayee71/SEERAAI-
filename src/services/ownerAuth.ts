/**
 * Centralized Owner & SuperAdmin Authorization Service for SeeraAI
 * Primary Owner: Ayele Be Dha (ayeledha@saiethio.com, ayeledha@gmail.com, ayele@saiethio.com)
 */

export const OWNER_EMAILS = [
  'ayeledha@saiethio.com',
  'ayeledha@gmail.com',
  'ayele@saiethio.com',
] as const;

export const OWNER_USERNAMES = [
  'ayele',
  'ayeledha',
  'ayeledhabedha',
  'ayeledha@saiethio.com',
  'ayeledha@gmail.com',
  'ayele@saiethio.com',
] as const;

export const OWNER_PINS = ['2026', 'ayele2026'] as const;

export const OWNER_STORAGE_KEYS = {
  OWNER_KEY: 'seera_owner_key',
  OWNER_ADMIN_KEY: 'seera_owner_admin_key',
  OWNER_EMAIL: 'seera_owner_email',
  CACHED_EMAIL: 'seera_cached_email',
  IS_PREMIUM: 'seera_is_premium',
  PREMIUM_PLAN: 'seera_premium_plan',
} as const;

/**
 * Normalizes an email or username string for comparison
 */
export function normalizeIdentifier(val?: string | null): string {
  if (!val) return '';
  return val.trim().toLowerCase();
}

/**
 * Verifies if an email belongs to platform owner Ayele
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = normalizeIdentifier(email);
  return OWNER_EMAILS.some((ownerEmail) => clean === ownerEmail);
}

/**
 * Verifies if a username or input belongs to platform owner Ayele
 */
export function isOwnerUsername(username?: string | null): boolean {
  if (!username) return false;
  const clean = normalizeIdentifier(username);
  return OWNER_USERNAMES.some((u) => clean === u) || isOwnerEmail(clean);
}

/**
 * Verifies if a PIN or unlock key is a valid owner key
 */
export function isOwnerKey(key?: string | null): boolean {
  if (!key) return false;
  const clean = normalizeIdentifier(key);
  return OWNER_PINS.some((p) => clean === p);
}

/**
 * Reads any stored owner credentials from localStorage (key or email)
 */
export function getStoredOwnerStatus(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storedKey = localStorage.getItem(OWNER_STORAGE_KEYS.OWNER_KEY) || 
                      localStorage.getItem(OWNER_STORAGE_KEYS.OWNER_ADMIN_KEY) || '';
    if (isOwnerKey(storedKey)) return true;

    const storedEmail = localStorage.getItem(OWNER_STORAGE_KEYS.OWNER_EMAIL) || 
                        localStorage.getItem(OWNER_STORAGE_KEYS.CACHED_EMAIL) || '';
    if (isOwnerEmail(storedEmail)) return true;
  } catch {
    // LocalStorage restricted or SSR
  }
  return false;
}

/**
 * Comprehensive check for owner status across user, profile, URL params, and localStorage
 */
export function isOwnerAccount(
  email?: string | null,
  userName?: string | null,
  providedKey?: string | null
): boolean {
  if (isOwnerEmail(email)) return true;
  if (isOwnerUsername(userName)) return true;
  if (isOwnerKey(providedKey)) return true;

  // Check URL query parameters (e.g. when opening direct links ?email=ayeledha@saiethio.com or ?user=ayeledha@saiethio.com)
  if (typeof window !== 'undefined' && window.location?.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email') || params.get('user') || params.get('u') || params.get('owner');
      if (urlEmail && (isOwnerEmail(urlEmail) || isOwnerUsername(urlEmail))) {
        // Persist to session so user stays unlocked
        try {
          localStorage.setItem(OWNER_STORAGE_KEYS.OWNER_EMAIL, normalizeIdentifier(urlEmail));
          localStorage.setItem(OWNER_STORAGE_KEYS.OWNER_KEY, '2026');
          localStorage.setItem(OWNER_STORAGE_KEYS.IS_PREMIUM, 'true');
          localStorage.setItem(OWNER_STORAGE_KEYS.PREMIUM_PLAN, 'unlimited');
        } catch {}
        return true;
      }
      const urlKey = params.get('key') || params.get('pin');
      if (urlKey && isOwnerKey(urlKey)) {
        return true;
      }
    } catch {}
  }

  // Check stored status in localStorage
  return getStoredOwnerStatus();
}

/**
 * Helper to unlock owner privileges locally
 */
export function unlockOwnerPrivileges(email: string = 'ayeledha@saiethio.com'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OWNER_STORAGE_KEYS.OWNER_EMAIL, email);
    localStorage.setItem(OWNER_STORAGE_KEYS.OWNER_KEY, '2026');
    localStorage.setItem(OWNER_STORAGE_KEYS.OWNER_ADMIN_KEY, '2026');
    localStorage.setItem(OWNER_STORAGE_KEYS.IS_PREMIUM, 'true');
    localStorage.setItem(OWNER_STORAGE_KEYS.PREMIUM_PLAN, 'unlimited');
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('seera_premium_updated'));
  } catch {}
}
