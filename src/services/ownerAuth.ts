/**
 * Centralized Owner & SuperAdmin Authorization Service for SeeraAI
 * Phase 8B.6.8: Admin/Owner authority derives strictly from verified server-issued
 * Firebase custom claims (`admin === true || role === 'superadmin'`), never from
 * anonymous sessions, unverified emails, localStorage keys, or client-side PINs alone.
 */

export const OWNER_EMAILS = [
  'ayeledha@saiethio.com',
  'ayeledha@gmail.com',
  'ayele@saiethio.com',
  'manamurtii@seeraai.com',
] as const;

export const OWNER_USERNAMES = [
  'ayele',
  'ayeledha',
  'ayeledhabedha',
  'manamurtii',
  'ayeledha@saiethio.com',
  'ayeledha@gmail.com',
  'ayele@saiethio.com',
  'manamurtii@seeraai.com',
] as const;

// Legacy secondary UI lock hashes (used ONLY after genuine Firebase verified superadmin login)
export const OWNER_PIN_HASHES = [
  '514c32340db3695b32751ab65a8d5bbfd05e48cb88374739dbd190245a4b7543',
] as const;

export const OWNER_PASSWORD_HASHES = [
  '514c32340db3695b32751ab65a8d5bbfd05e48cb88374739dbd190245a4b7543',
] as const;

export const OWNER_STORAGE_KEYS = {
  OWNER_KEY: 'seera_owner_key',
  OWNER_ADMIN_KEY: 'seera_owner_admin_key',
  OWNER_EMAIL: 'seera_owner_email',
  CACHED_EMAIL: 'seera_cached_email',
  IS_PREMIUM: 'seera_is_premium',
  PREMIUM_PLAN: 'seera_premium_plan',
} as const;

export interface VerifiedServerClaimsState {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerId: string | null;
  isTrustedAdmin: boolean;
  role: string | null;
  courtRole: string | null;
  institutionId: string | null;
}

// Authoritative in-memory claim mirror populated exclusively by AuthContext from getIdTokenResult()
let serverVerifiedClaims: VerifiedServerClaimsState | null = null;

export function setVerifiedServerClaimsState(nextState: VerifiedServerClaimsState | null): void {
  serverVerifiedClaims = nextState;
  if (!nextState || nextState.isAnonymous || !nextState.emailVerified || !nextState.isTrustedAdmin) {
    clearOwnerPrivileges();
  }
}

export function getVerifiedServerClaimsState(): VerifiedServerClaimsState | null {
  return serverVerifiedClaims;
}

export function hasVerifiedServerAdminClaims(): boolean {
  return Boolean(
    serverVerifiedClaims &&
      !serverVerifiedClaims.isAnonymous &&
      serverVerifiedClaims.providerId !== 'anonymous' &&
      serverVerifiedClaims.providerId !== 'phone' &&
      serverVerifiedClaims.emailVerified === true &&
      serverVerifiedClaims.isTrustedAdmin === true
  );
}

/**
 * Normalizes an email or username string for comparison
 */
export function normalizeIdentifier(val?: string | null): string {
  if (!val) return '';
  return val.trim().toLowerCase();
}

/**
 * Checks whether an email matches a known owner address (for UI display hints ONLY; NEVER for access control).
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = normalizeIdentifier(email);
  return OWNER_EMAILS.some((ownerEmail) => clean === ownerEmail);
}

/**
 * Checks whether a username matches a known owner identifier (for UI hints ONLY; NEVER for access control).
 */
export function isOwnerUsername(username?: string | null): boolean {
  if (!username) return false;
  const clean = normalizeIdentifier(username);
  return OWNER_USERNAMES.some((u) => clean === u) || isOwnerEmail(clean);
}

/**
 * Sets a secondary owner PIN hash (only permitted while signed in as a verified server admin)
 */
export async function setCustomOwnerPin(newPin: string): Promise<void> {
  if (!hasVerifiedServerAdminClaims()) {
    throw new Error('Verified superadmin Firebase session required.');
  }
  if (typeof window !== 'undefined' && newPin.trim()) {
    const { generateSHA256 } = await import('../utils/crypto');
    const hash = await generateSHA256(newPin.trim());
    localStorage.setItem('seera_custom_owner_pin_hash', hash);
  }
}

/**
 * Sets a secondary owner confirmation phrase hash (only permitted while signed in as a verified server admin)
 */
export async function setCustomOwnerPassword(newPass: string): Promise<void> {
  if (!hasVerifiedServerAdminClaims()) {
    throw new Error('Verified superadmin Firebase session required.');
  }
  if (typeof window !== 'undefined' && newPass.trim()) {
    const { generateSHA256 } = await import('../utils/crypto');
    const hash = await generateSHA256(newPass.trim());
    localStorage.setItem('seera_custom_owner_password_hash', hash);
  }
}

/**
 * Verifies secondary confirmation phrase hash (never creates a Firebase session)
 */
export async function isOwnerPassword(pass?: string | null): Promise<boolean> {
  if (!pass) return false;
  const clean = pass.trim();
  const { generateSHA256 } = await import('../utils/crypto');
  const inputHash = await generateSHA256(clean);

  if (typeof window !== 'undefined') {
    const customPassHash = localStorage.getItem('seera_custom_owner_password_hash');
    if (customPassHash && inputHash === customPassHash) {
      return true;
    }
  }

  return (OWNER_PASSWORD_HASHES as readonly string[]).includes(inputHash);
}

/**
 * Verifies secondary owner PIN hash (never creates a Firebase session)
 */
export async function isOwnerKey(key?: string | null): Promise<boolean> {
  if (!key) return false;
  const clean = normalizeIdentifier(key);
  const { generateSHA256 } = await import('../utils/crypto');
  const inputHash = await generateSHA256(clean);

  if (typeof window !== 'undefined') {
    const customPinHash = localStorage.getItem('seera_custom_owner_pin_hash');
    if (customPinHash && inputHash === customPinHash) {
      return true;
    }
  }

  return (OWNER_PIN_HASHES as readonly string[]).includes(inputHash);
}

/**
 * Secondary confirmation ONLY: requires an active verified superadmin Firebase session
 * with server-issued admin/superadmin custom claims. Never logs in or elevates anonymous users.
 */
export async function verifyAndUnlockOwner(credential: string): Promise<boolean> {
  if (!hasVerifiedServerAdminClaims()) {
    return false;
  }
  const isKey = await isOwnerKey(credential);
  const isPass = await isOwnerPassword(credential);
  if (isKey || isPass) {
    if (typeof window !== 'undefined') {
      const sessionToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      sessionStorage.setItem('seera_session_verified', 'true');
      sessionStorage.setItem('seera_session_token', sessionToken);
      unlockOwnerPrivileges(serverVerifiedClaims?.email || '');
    }
    return true;
  }
  return false;
}

/**
 * Authoritative Owner/SuperAdmin check backed strictly by verified Firebase ID token custom claims.
 */
export function getStoredOwnerStatus(): boolean {
  return hasVerifiedServerAdminClaims();
}

/**
 * Authoritative check for Owner/SuperAdmin UI visibility.
 * Never returns true for anonymous, unverified, or claimless accounts regardless of localStorage or displayName.
 */
export function isOwnerAccount(
  _email?: string | null,
  _userName?: string | null,
  _providedKey?: string | null
): boolean {
  return hasVerifiedServerAdminClaims();
}

/**
 * No-op unless genuine server admin claims exist; cleans up legacy spoofable local keys.
 */
export function unlockOwnerPrivileges(email?: string): void {
  if (typeof window === 'undefined') return;
  if (!hasVerifiedServerAdminClaims()) {
    clearOwnerPrivileges();
    return;
  }
  try {
    if (email) {
      localStorage.setItem(OWNER_STORAGE_KEYS.OWNER_EMAIL, normalizeIdentifier(email));
    }
    sessionStorage.setItem('seera_session_verified', 'true');
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('seera_premium_updated'));
  } catch {}
}

/**
 * Clears all local owner session markers
 */
export function clearOwnerPrivileges(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OWNER_STORAGE_KEYS.OWNER_KEY);
    localStorage.removeItem(OWNER_STORAGE_KEYS.OWNER_ADMIN_KEY);
    localStorage.removeItem(OWNER_STORAGE_KEYS.OWNER_EMAIL);
    sessionStorage.removeItem('seera_session_verified');
    sessionStorage.removeItem('seera_session_token');
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('seera_premium_updated'));
  } catch {}
}
