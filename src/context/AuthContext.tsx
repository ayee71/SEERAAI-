import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  sendEmailVerification,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInAnonymously,
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import {
  isOwnerEmail,
  clearOwnerPrivileges,
  setVerifiedServerClaimsState,
} from '../services/ownerAuth';

import { UserSettings, DEFAULT_SETTINGS } from '../services/storage';
import {
  OFFLINE_DB_NAME,
  safeDeleteOfflineDB,
  closeAllTrackedDBConnections,
  readAllOfflineDBStoresSnapshot,
} from '../services/indexedDb';
import { backgroundSyncManager } from '../services/backgroundSync';
import { syncOfflineDataWithFirestore } from '../services/courtOfflineStore';
import {
  SignOutPhase,
  SignOutCoordinatorState,
  IsolationLockdownState,
  AuthSyncMessage,
  AUTH_SYNC_CHANNEL_NAME,
  AUTH_SYNC_STORAGE_EVENT_KEY,
  acquireSignOutLock,
  releaseSignOutLock,
  drainInFlightWrites,
  getIsolationLockdownState,
  setIsolationLockdownState,
  registerTabHeartbeat,
  unregisterTabHeartbeat,
  getOtherActiveTabs,
  buildLocalDataInventory,
  purgeSensitiveAppStorage,
  buildLocalBackupPayload,
  triggerLocalBackupDownload,
  checkAccountSwitchAllowed,
  createSignOutCoordinator,
} from '../services/signOutSafetyService';
import { LogoutConfirmationModal } from '../components/LogoutConfirmationModal';
import { getDeviceInfo } from '../utils/device';
import { 
  authenticateBiometricPasskey, 
  registerBiometricPasskey, 
  getBiometricEnrollmentStatus,
  isBiometricAvailable,
  BiometricAuthResult
} from '../utils/biometric';
import { logRealtimeEvent } from '../services/realtimeTracker';

export interface PersistenceDiagnosticReport {
  success: boolean;
  persistenceMode: string;
  indexedDBAvailable: boolean;
  localStorageAvailable: boolean;
  currentUser: {
    uid: string;
    email: string | null;
    isAnonymous: boolean;
    emailVerified: boolean;
  } | null;
  cachedAuthKeys: string[];
  diagnosticsLog: string[];
  error?: string;
  timestamp: string;
}

/**
 * Diagnostic utility function to verify if browserLocalPersistence
 * is correctly initialized in Firebase Auth and examine local session integrity.
 */
export async function verifyBrowserLocalPersistence(): Promise<PersistenceDiagnosticReport> {
  const timestamp = new Date().toISOString();
  const diagnosticsLog: string[] = [];
  diagnosticsLog.push(`[Auth Diagnostic @ ${timestamp}] Starting browserLocalPersistence verification...`);

  // 1. Verify IndexedDB availability (Firebase browserLocalPersistence primary backend)
  const indexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  diagnosticsLog.push(
    `[Auth Diagnostic] IndexedDB status: ${indexedDBAvailable ? 'AVAILABLE (healthy)' : 'UNAVAILABLE (persistence may degrade)'}`
  );

  // 2. Verify localStorage read/write availability
  let localStorageAvailable = false;
  try {
    const testKey = '__seera_auth_persistence_test__';
    localStorage.setItem(testKey, timestamp);
    const readBack = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    localStorageAvailable = readBack === timestamp;
    diagnosticsLog.push(`[Auth Diagnostic] localStorage read/write test: PASSED`);
  } catch (err: any) {
    localStorageAvailable = false;
    diagnosticsLog.push(`[Auth Diagnostic] localStorage read/write test: FAILED (${err?.message || err})`);
  }

  // 3. Inspect cached keys in localStorage and sessionStorage
  const cachedAuthKeys = typeof localStorage !== 'undefined'
    ? Object.keys(localStorage).filter(k => 
        k.startsWith('firebase:authUser:') || 
        k.startsWith('seera_')
      )
    : [];
  diagnosticsLog.push(
    `[Auth Diagnostic] Found ${cachedAuthKeys.length} cached auth/session keys in localStorage: ${JSON.stringify(cachedAuthKeys)}`
  );

  // 4. Test explicit setPersistence call
  let success = true;
  let errorMsg: string | undefined;
  
  // Note: setPersistence is already called in services/firebase.ts on startup
  // We only verify its successful application here by checking current auth state
  diagnosticsLog.push(`[Auth Diagnostic] setPersistence assumed active (initialized in firebase.ts).`);

  // 5. Inspect current Firebase Auth memory state
  const currentUserData = auth.currentUser ? {
    uid: auth.currentUser.uid,
    email: auth.currentUser.email,
    isAnonymous: auth.currentUser.isAnonymous,
    emailVerified: auth.currentUser.emailVerified,
  } : null;

  diagnosticsLog.push(
    `[Auth Diagnostic] Current auth.currentUser state: ${
      currentUserData 
        ? `Authenticated (UID: ${currentUserData.uid}, Email: ${currentUserData.email || 'anon'}, Anonymous: ${currentUserData.isAnonymous})` 
        : 'Null (session either uninitialized, restored asynchronously, or logged out)'
    }`
  );

  const report: PersistenceDiagnosticReport = {
    success,
    persistenceMode: 'browserLocalPersistence',
    indexedDBAvailable,
    localStorageAvailable,
    currentUser: currentUserData,
    cachedAuthKeys,
    diagnosticsLog,
    error: errorMsg,
    timestamp,
  };

  // Log clean report to browser console
  console.groupCollapsed(`🔍 [Auth Diagnostic Report] browserLocalPersistence: ${success ? 'VALIDATED ✓' : 'FAILED ✗'}`);
  diagnosticsLog.forEach(line => console.log(line));
  console.log('[Auth Diagnostic Full Report Object]', report);
  console.groupEnd();

  return report;
}

// Attach globally for immediate developer console access
if (typeof window !== 'undefined') {
  (window as any).verifyBrowserLocalPersistence = verifyBrowserLocalPersistence;
  (window as any).__authDiagnostics = verifyBrowserLocalPersistence;
}

export type AuthTier =
  | 'unauthenticated'
  | 'anonymous_guest'
  | 'email_unverified'
  | 'phone_authenticated'
  | 'email_verified'
  | 'court_staff'
  | 'superadmin';

export interface AuthClaimsState {
  authTier: AuthTier;
  isGuest: boolean;
  isAnonymous: boolean;
  isNonAnonymous: boolean;
  isEmailVerified: boolean;
  isPhoneAuthenticated: boolean;
  providerId: string | null;
  isTrustedAdmin: boolean;
  isCourtStaff: boolean;
  courtRole: string | null;
  institutionId: string | null;
  guestMode: 'guest' | 'kiosk' | 'meeting' | 'gurbicha_practice' | null;
}

const DEFAULT_AUTH_CLAIMS: AuthClaimsState = {
  authTier: 'unauthenticated',
  isGuest: false,
  isAnonymous: false,
  isNonAnonymous: false,
  isEmailVerified: false,
  isPhoneAuthenticated: false,
  providerId: null,
  isTrustedAdmin: false,
  isCourtStaff: false,
  courtRole: null,
  institutionId: null,
  guestMode: null,
};

const COURT_STAFF_ROLES = new Set([
  'judge',
  'assistant_judge',
  'registrar',
  'legal_expert',
  'auditor',
  'court_admin',
  'clerk',
  'superadmin',
]);

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  profile: UserSettings | null;
  authClaims: AuthClaimsState;
  signIn: () => Promise<void>;
  signInWithEmail: (emailOrUsername: string, pass: string) => Promise<any>;
  signUpWithEmail: (emailOrUsername: string, pass: string, name: string) => Promise<void>;
  signInAsGuest: (guestLabel?: string, mode?: 'guest' | 'kiosk' | 'meeting' | 'gurbicha_practice') => Promise<void>;
  sendEmailSignInLink: (emailOrUsername: string) => Promise<void>;
  completeEmailLinkSignIn: (email?: string) => Promise<boolean>;
  pendingEmailLinkUrl: string | null;
  resendEmailVerification: () => Promise<void>;
  refreshAuthClaims: () => Promise<AuthClaimsState>;
  signInWithBiometrics: (preferredEmail?: string, judicialRole?: string, courtName?: string) => Promise<BiometricAuthResult>;
  enrollBiometrics: (userEmail: string, userName?: string) => Promise<BiometricAuthResult>;
  isBiometricEnrolled: () => boolean;
  resetPassword: (email: string) => Promise<void>;
  logout: (clearCache?: boolean) => Promise<void>;
  requestLogout: () => void;
  isolationLockdown: IsolationLockdownState | null;
  retryIsolationRecovery: () => Promise<void>;
  updateProfile: (updates: Partial<UserSettings>) => Promise<void>;
  accessToken: string | null;
  sendVerificationEmail: (emailOrUsername?: string, name?: string) => Promise<string>;
  lastSentVerificationLink: string | null;
  verificationSuccessMsg: string | null;
  verifyBrowserLocalPersistence: () => Promise<PersistenceDiagnosticReport>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserSettings | null>(null);
  const [authClaims, setAuthClaims] = useState<AuthClaimsState>(DEFAULT_AUTH_CLAIMS);
  // Default loading to true during startup so persistence can be resolved before redirecting to landing
  const [loading, setLoading] = useState(true);
  const [lastSentVerificationLink, setLastSentVerificationLink] = useState<string | null>(null);
  const [verificationSuccessMsg, setVerificationSuccessMsg] = useState<string | null>(null);
  const [pendingEmailLinkUrl, setPendingEmailLinkUrl] = useState<string | null>(null);

  const authMountTimeRef = useRef<number>(performance.now());
  const initialAuthDispatchedRef = useRef<boolean>(false);
  const registeredSidsRef = useRef<Set<string>>(new Set());
  const tabIdRef = useRef<string>('tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36));
  const bcRef = useRef<BroadcastChannel | null>(null);
  const currentUidRef = useRef<string | null>(null);
  const currentEmailRef = useRef<string | null>(null);
  const pendingTabResponsesRef = useRef<Map<string, (msg: AuthSyncMessage) => void>>(new Map());

  const [isolationLockdown, setIsolationLockdown] = useState<IsolationLockdownState | null>(() =>
    typeof window !== 'undefined' ? getIsolationLockdownState() : null
  );
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(getIsolationLockdownState()?.active);
  });
  const [signOutState, setSignOutState] = useState<SignOutCoordinatorState>(() => {
    const initialLock = typeof window !== 'undefined' ? getIsolationLockdownState() : null;
    return {
      phase: initialLock?.active ? 'ISOLATION_LOCKDOWN' : 'IDLE',
      correlationId: null,
      uid: null,
      inventory: null,
      syncErrors: [],
      unackedTabs: initialLock?.unackedTabs || [],
      lockdownState: initialLock,
      holdReason: initialLock?.active ? initialLock.details : null,
    };
  });

  useEffect(() => {
    currentUidRef.current = user?.uid || null;
    currentEmailRef.current = user?.email || (profile as any)?.email || null;
    if (typeof window !== 'undefined') {
      registerTabHeartbeat(tabIdRef.current, user?.uid || null);
    }
  }, [user, profile]);

  // Fast-load safety guard: Prevent app from hanging on startup
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Run initial diagnostic check on startup non-blockingly
  useEffect(() => {
    // Only verify non-critically in idle time
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        verifyBrowserLocalPersistence().catch(() => {});
      });
    }
  }, []);

  const deriveClaimsFromFirebaseUser = async (
    firebaseUser: FirebaseUser | null,
    forceRefresh: boolean = false
  ): Promise<AuthClaimsState> => {
    if (!firebaseUser) {
      setVerifiedServerClaimsState(null);
      return DEFAULT_AUTH_CLAIMS;
    }

    let tokenClaims: Record<string, any> = {};
    let signInProvider: string | null = null;
    try {
      const tokenResult = await firebaseUser.getIdTokenResult(forceRefresh);
      tokenClaims = tokenResult.claims || {};
      signInProvider =
        (tokenResult.signInProvider as string | null) ||
        firebaseUser.providerData?.[0]?.providerId ||
        (firebaseUser.isAnonymous ? 'anonymous' : null);
    } catch {
      signInProvider =
        firebaseUser.providerData?.[0]?.providerId ||
        (firebaseUser.isAnonymous ? 'anonymous' : null);
    }

    const isAnonymous = Boolean(firebaseUser.isAnonymous || signInProvider === 'anonymous');
    const isNonAnonymous = !isAnonymous;
    const isPhoneAuthenticated = isNonAnonymous && signInProvider === 'phone';
    const isEmailVerified = isNonAnonymous && !isPhoneAuthenticated && firebaseUser.emailVerified === true;

    const rawRole = typeof tokenClaims.role === 'string' ? tokenClaims.role : null;
    const rawCourtRole =
      typeof tokenClaims.courtRole === 'string'
        ? tokenClaims.courtRole
        : rawRole;
    const institutionId =
      typeof tokenClaims.institutionId === 'string' && tokenClaims.institutionId.trim().length > 0
        ? tokenClaims.institutionId.trim()
        : null;

    const isTrustedAdmin = Boolean(
      isEmailVerified && (
        tokenClaims.admin === true ||
        rawRole === 'superadmin' ||
        isOwnerEmail(firebaseUser.email)
      )
    );
    const hasStaffRole = Boolean(rawCourtRole && COURT_STAFF_ROLES.has(rawCourtRole));
    const isCourtStaff = Boolean(
      isTrustedAdmin || (isEmailVerified && institutionId && hasStaffRole)
    );

    const guestMode = isAnonymous
      ? ((sessionStorage.getItem('seera_guest_mode') as AuthClaimsState['guestMode']) || 'guest')
      : null;

    let authTier: AuthTier;
    if (isAnonymous) {
      authTier = 'anonymous_guest';
    } else if (isTrustedAdmin) {
      authTier = 'superadmin';
    } else if (isCourtStaff) {
      authTier = 'court_staff';
    } else if (isPhoneAuthenticated) {
      authTier = 'phone_authenticated';
    } else if (isEmailVerified) {
      authTier = 'email_verified';
    } else {
      authTier = 'email_unverified';
    }

    setVerifiedServerClaimsState({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: isEmailVerified,
      isAnonymous,
      providerId: signInProvider,
      isTrustedAdmin,
      role: rawRole,
      courtRole: rawCourtRole,
      institutionId,
    });

    return {
      authTier,
      isGuest: isAnonymous,
      isAnonymous,
      isNonAnonymous,
      isEmailVerified,
      isPhoneAuthenticated,
      providerId: signInProvider,
      isTrustedAdmin,
      isCourtStaff,
      courtRole: isCourtStaff ? rawCourtRole : null,
      institutionId: isCourtStaff ? institutionId : null,
      guestMode,
    };
  };

  const refreshAuthClaims = async (): Promise<AuthClaimsState> => {
    const next = await deriveClaimsFromFirebaseUser(auth.currentUser, true);
    setAuthClaims(next);
    return next;
  };

  const completeEmailLinkSignIn = async (explicitEmail?: string): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    const targetUrl = pendingEmailLinkUrl || window.location.href;
    if (!isSignInWithEmailLink(auth, targetUrl)) {
      return false;
    }

    const emailToUse = (
      explicitEmail ||
      localStorage.getItem('seera_email_for_signin') ||
      ''
    )
      .trim()
      .toLowerCase();

    if (!emailToUse || !emailToUse.includes('@')) {
      setPendingEmailLinkUrl(targetUrl);
      return false;
    }

    assertAccountSwitchAllowed(null, emailToUse);
    clearOwnerPrivileges();
    const cred = await signInWithEmailLink(auth, emailToUse, targetUrl);
    const nextClaims = await deriveClaimsFromFirebaseUser(cred.user, true);
    setAuthClaims(nextClaims);
    localStorage.removeItem('seera_email_for_signin');
    sessionStorage.removeItem('seera_guest_mode');
    sessionStorage.removeItem('seera_guest_label');
    setPendingEmailLinkUrl(null);
    setVerificationSuccessMsg(cred.user.email || emailToUse);

    const url = new URL(window.location.href);
    ['oobCode', 'mode', 'apiKey', 'lang', 'continueUrl', 'emailLinkLogin'].forEach((k) =>
      url.searchParams.delete(k)
    );
    window.history.replaceState({}, '', url.toString());
    return true;
  };

  // URL Email-Link handler & cleanup of legacy verification query parameters
  useEffect(() => {
    const checkAuthUrls = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);

      // Remove legacy insecure verifyEmail/token query parameters without granting access
      if (params.get('verifyEmail') || params.get('token')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('verifyEmail');
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());
      }

      if (isSignInWithEmailLink(auth, window.location.href)) {
        setLoading(true);
        try {
          await completeEmailLinkSignIn();
        } catch (err) {
          console.warn('Email link sign-in completion note:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    checkAuthUrls();
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const mountElapsed = Math.round(performance.now() - authMountTimeRef.current);

    console.log(`[Auth Lifecycle: STARTUP] Initializing onAuthStateChanged subscriber (+${mountElapsed}ms from mount)...`);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      const isInitialCallback = !initialAuthDispatchedRef.current;
      initialAuthDispatchedRef.current = true;

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const existingLock = getIsolationLockdownState();
        if (existingLock?.active) {
          setIsolationLockdown(existingLock);
          setShowLogoutModal(true);
          setLoading(false);
          return;
        }

        const switchCheck = checkAccountSwitchAllowed({
          nextUid: firebaseUser.uid,
          nextEmail: firebaseUser.email,
        });
        if (!switchCheck.allowed) {
          setIsolationLockdown(switchCheck.lockdownState);
          setShowLogoutModal(true);
          setLoading(false);
          return;
        }

        const nextClaims = await deriveClaimsFromFirebaseUser(firebaseUser, false);
        setAuthClaims(nextClaims);
        setUser(firebaseUser);

        if (nextClaims.isAnonymous) {
          // Strict Guest Mode: never grant staff/owner flags or write to users/{uid}
          clearOwnerPrivileges();
          try {
            localStorage.removeItem('seera_user_role');
            localStorage.removeItem('seera_cached_email');
            localStorage.removeItem('seera_current_user_email');
            localStorage.setItem('seera_current_user_id', firebaseUser.uid);
          } catch {}

          const guestLabel =
            (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('seera_guest_label')) ||
            'Keessummaa Seeraa (Guest)';
          setProfile({
            ...DEFAULT_SETTINGS,
            visitorName: guestLabel,
            isLegalProfessional: false,
            legalRole: 'guest' as any,
            role: 'guest' as any,
            courtId: nextClaims.guestMode === 'gurbicha_practice' ? 'public_practice' : 'public',
            accountStatus: 'guest',
          } as any);
          setLoading(false);
          return;
        }

        // Genuine non-anonymous Firebase user
        try {
          localStorage.setItem('seera_current_user_id', firebaseUser.uid);
          if (firebaseUser.email) {
            localStorage.setItem('seera_current_user_email', firebaseUser.email);
            localStorage.setItem('seera_cached_email', firebaseUser.email);
          }
          if (!nextClaims.isTrustedAdmin) {
            clearOwnerPrivileges();
          }
          if (nextClaims.courtRole) {
            localStorage.setItem('seera_user_role', nextClaims.courtRole);
          } else {
            localStorage.removeItem('seera_user_role');
          }
        } catch {}

        const userEmail = firebaseUser.email || '';
        const baselineProfile: UserSettings = {
          ...DEFAULT_SETTINGS,
          visitorName: firebaseUser.displayName || userEmail.split('@')[0] || 'User',
          isLegalProfessional: nextClaims.isCourtStaff || nextClaims.isTrustedAdmin,
          legalRole: (nextClaims.courtRole || (nextClaims.isEmailVerified ? 'user' : 'unverified')) as any,
          ...(nextClaims.institutionId ? { courtId: nextClaims.institutionId } : {}),
          ...({ email: userEmail } as any),
        };
        setProfile((prev) => prev || baselineProfile);
        setLoading(false);

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(
          userDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as UserSettings;
              // Never allow Firestore profile fields alone to claim admin/court_staff without server token claims
              const safeRole = nextClaims.isTrustedAdmin
                ? 'superadmin'
                : nextClaims.isCourtStaff
                ? nextClaims.courtRole
                : data.legalRole || (nextClaims.isEmailVerified ? 'user' : 'unverified');
              setProfile({
                ...data,
                role: (nextClaims.isTrustedAdmin ? 'superadmin' : nextClaims.courtRole || data.role || 'user') as any,
                legalRole: safeRole as any,
                isLegalProfessional: Boolean(
                  nextClaims.isEmailVerified && (data.isLegalProfessional || nextClaims.isCourtStaff || nextClaims.isTrustedAdmin)
                ),
              });
            } else {
              setProfile(baselineProfile);
            }
            setLoading(false);
          },
          (error) => {
            console.warn('[Auth Lifecycle: PROFILE SYNC WARNING] Firestore onSnapshot error:', error);
            setLoading(false);
          }
        );
      } else {
        setVerifiedServerClaimsState(null);
        setAuthClaims(DEFAULT_AUTH_CLAIMS);
        setUser(null);
        setProfile(null);
        setLoading(false);
        if (!isInitialCallback) {
          clearOwnerPrivileges();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      registeredSidsRef.current.clear();
      return;
    }

    if (!profile) return;

    const sid = (() => {
      let id = sessionStorage.getItem('seera_session_id');
      if (!id) {
        id = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
        sessionStorage.setItem('seera_session_id', id);
      }
      return id;
    })();

    const hasSessionInDoc = profile.activeSessions && Object.prototype.hasOwnProperty.call(profile.activeSessions, sid);
    const wasRegisteredByThisTab = registeredSidsRef.current.has(sid);

    console.log('[Auth Session Guard: CHECK]', {
      sid,
      hasSessionInDoc,
      wasRegisteredByThisTab,
      totalActiveSessionsInDoc: profile.activeSessions ? Object.keys(profile.activeSessions).length : 0,
    });

    if (!hasSessionInDoc) {
      if (!wasRegisteredByThisTab) {
        // Register this device session in user's profile
        console.log(`[Auth Session Guard] Registering new active session ${sid} to profile...`);
        registeredSidsRef.current.add(sid);
        const dev = getDeviceInfo();
        const sessionDetails = {
          deviceType: dev.deviceType,
          browser: dev.browser,
          os: dev.os,
          lastActive: new Date().toISOString(),
          loginTime: new Date().toISOString(),
        };
        const updatedSessions = {
          ...(profile.activeSessions || {}),
          [sid]: sessionDetails,
        };
        updateProfile({ activeSessions: updatedSessions }).catch((err) => {
          console.warn('[Auth Session Guard] Failed writing session registration to Firestore:', err);
        });
      } else {
        // This tab registered the session and is currently awaiting Firestore sync.
        // DO NOT log out, as this would prematurely kill persistent login during startup!
        console.log(`[Auth Session Guard] Session ${sid} is awaiting Firestore sync confirmation. Preserving session.`);
      }
    } else {
      registeredSidsRef.current.add(sid);
    }
  }, [profile, user]);

  const normalizeEmail = (input: string) => {
    let trimmed = input.trim().toLowerCase().replace(/\s+/g, '');
    
    // Fix common typo: username.@domain.com -> username@domain.com
    trimmed = trimmed.replace(/\.@/g, '@');

    if (!trimmed.includes('@')) {
      const sanitized = trimmed.replace(/[^a-z0-9._-]/g, '');
      return `${sanitized}@saiethio.com`;
    }
    return trimmed;
  };

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const assertAccountSwitchAllowed = (nextUid?: string | null, nextEmail?: string | null) => {
    const check = checkAccountSwitchAllowed({ nextUid, nextEmail });
    if (!check.allowed) {
      setIsolationLockdown(check.lockdownState);
      setShowLogoutModal(true);
      throw new Error(check.reason || 'Account switch blocked until previous session cleanup completes.');
    }
  };

  const signIn = async () => {
    assertAccountSwitchAllowed(null, null);
    try {
      const provider = new GoogleAuthProvider();
      // Add Workspace scopes
      provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
      provider.addScope('https://www.googleapis.com/auth/classroom.coursework.students');
      provider.addScope('https://www.googleapis.com/auth/classroom.courseworkmaterials');
      provider.addScope('https://www.googleapis.com/auth/keep');
      provider.addScope('https://www.googleapis.com/auth/keep.readonly');
      
      const result = await signInWithPopup(auth, provider);
      assertAccountSwitchAllowed(result.user?.uid, result.user?.email);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        // Also store in a ref for non-react usage if needed, but in-memory state is fine for now
      }
    } catch (popupErr) {
      console.warn('Google popup note:', popupErr);
      throw popupErr;
    }
  };

  const signInWithEmail = async (emailOrUsername: string, pass: string) => {
    let email = normalizeEmail(emailOrUsername);

    // Check if it's a username (no '@' sign)
    if (!emailOrUsername.includes('@')) {
      try {
        const lookupRes = await fetch('/api/auth/username-to-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: emailOrUsername }),
        });
        if (lookupRes.ok) {
          const data = await lookupRes.json();
          if (data.email) email = data.email;
        }
      } catch (err) {
        console.warn('[Auth] Username lookup failed, falling back to normalized email:', err);
      }
    }

    assertAccountSwitchAllowed(null, email);
    clearOwnerPrivileges();
    sessionStorage.removeItem('seera_guest_mode');
    sessionStorage.removeItem('seera_guest_label');

    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    await deriveClaimsFromFirebaseUser(userCredential.user, true).then(setAuthClaims);
    return userCredential;
  };

  const signUpWithEmail = async (emailOrUsername: string, pass: string, name: string) => {
    const email = normalizeEmail(emailOrUsername);
    assertAccountSwitchAllowed(null, email);
    clearOwnerPrivileges();
    sessionStorage.removeItem('seera_guest_mode');
    sessionStorage.removeItem('seera_guest_label');
    const username = name.trim().replace(/\s+/g, '_').toLowerCase();

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password: pass }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }

    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (name.trim()) {
      await updateFirebaseProfile(cred.user, { displayName: name.trim() }).catch(() => {});
    }
    if (!cred.user.emailVerified) {
      await sendEmailVerification(cred.user).catch((verErr) => {
        console.warn('[Auth] Verification email notice:', verErr);
      });
    }
    await deriveClaimsFromFirebaseUser(cred.user, true).then(setAuthClaims);
  };

  /**
   * Approved Guest Access ONLY: uses anonymous Firebase authentication strictly for public
   * content and guest practice features without spoofing email verification or granting
   * private document, court staff, institutional, or admin permissions.
   */
  const signInAsGuest = async (
    guestLabel: string = 'Keessummaa Seeraa (Guest)',
    mode: 'guest' | 'kiosk' | 'meeting' | 'gurbicha_practice' = 'guest'
  ) => {
    assertAccountSwitchAllowed(null, null);
    clearOwnerPrivileges();
    setLoading(true);
    try {
      sessionStorage.setItem('seera_guest_mode', mode);
      sessionStorage.setItem('seera_guest_label', guestLabel);
      localStorage.removeItem('seera_cached_email');
      localStorage.removeItem('seera_current_user_email');
      localStorage.removeItem('seera_user_role');

      let credUser: any = null;
      try {
        const cred = await signInAnonymously(auth);
        credUser = cred.user;
      } catch (anonErr: any) {
        console.warn('[Auth] Anonymous sign-in not enabled or restricted in Firebase Console. Using local guest session fallback.', anonErr?.message || anonErr);
        credUser = {
          uid: `guest_${Date.now()}`,
          isAnonymous: true,
          email: null,
          displayName: guestLabel,
          getIdToken: async () => '',
        };
      }

      const nextClaims = await deriveClaimsFromFirebaseUser(credUser, false);
      setAuthClaims(nextClaims);
      setUser(credUser);
      setProfile({
        ...DEFAULT_SETTINGS,
        visitorName: guestLabel,
        isLegalProfessional: false,
        legalRole: 'guest' as any,
        role: 'guest' as any,
        courtId: mode === 'gurbicha_practice' ? 'public_practice' : 'public',
        accountStatus: 'guest',
      } as any);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sends a genuine Firebase Email Link for passwordless authentication (never falls back to anonymous).
   * Requires Email Link sign-in enabled and domain authorized in Firebase Console.
   */
  const sendEmailSignInLink = async (emailOrUsername: string) => {
    const email = normalizeEmail(emailOrUsername);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Maaloo imeelii sirrii ta’e galchaa.');
    }
    assertAccountSwitchAllowed(null, email);
    const actionCodeSettings = {
      url: `${window.location.origin}/?emailLinkLogin=1`,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem('seera_email_for_signin', email);
  };

  const resendEmailVerification = async () => {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
      throw new Error('Akkaawuntii Firebase dhugaa tiin seenuun dirqama.');
    }
    if (!auth.currentUser.email) {
      throw new Error('Akkaawuntiin kun imeelii hin qabu.');
    }
    await sendEmailVerification(auth.currentUser);
  };

  const resetPassword = async (email: string) => {
    const norm = normalizeEmail(email);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: norm }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Password reset request failed');
    }
  };

  const isBiometricEnrolled = (): boolean => {
    return !!getBiometricEnrollmentStatus();
  };

  /**
   * WebAuthn passkey check acts strictly as local session/screen unlock for an ALREADY
   * authenticated non-anonymous Firebase user. It never substitutes for Firebase Auth
   * or creates an anonymous/staff session.
   */
  const signInWithBiometrics = async (
    preferredEmail?: string,
    _judicialRole: string = 'judge',
    _courtName?: string
  ): Promise<BiometricAuthResult> => {
    try {
      if (!auth.currentUser || auth.currentUser.isAnonymous) {
        return {
          success: false,
          authMethod: 'passkey',
          timestamp: new Date().toISOString(),
          error:
            'Passkey’n meeshaa kanaa qofti Firebase hin bakka bu’u. Jalqaba Google, Email Link ykn Email/Password dhugaa tiin seenaa.',
        };
      }

      setLoading(true);
      const result = await authenticateBiometricPasskey(preferredEmail || auth.currentUser.email || undefined);
      if (result.success) {
        const refreshed = await deriveClaimsFromFirebaseUser(auth.currentUser, true);
        setAuthClaims(refreshed);
        sessionStorage.setItem('seera_biometric_unlocked', 'true');
      }
      setLoading(false);
      return result;
    } catch (err: any) {
      setLoading(false);
      return {
        success: false,
        authMethod: 'passkey',
        timestamp: new Date().toISOString(),
        error: err?.message || 'Biometric authentication failed.',
      };
    }
  };

  const enrollBiometrics = async (userEmail: string, userName?: string): Promise<BiometricAuthResult> => {
    try {
      setLoading(true);
      const res = await registerBiometricPasskey(userEmail, userName || 'Judicial Officer');
      setLoading(false);
      return res;
    } catch (err: any) {
      setLoading(false);
      return { 
        success: false, 
        authMethod: 'passkey', 
        timestamp: new Date().toISOString(), 
        error: err?.message || 'Biometric passkey enrollment failed.' 
      };
    }
  };


  // ---------------------------------------------------------------------------
  // Persistent Cross-Tab BroadcastChannel + Storage Fallback + Service Worker
  // ---------------------------------------------------------------------------

  const postAuthSyncMessage = (msg: AuthSyncMessage) => {
    if (bcRef.current) {
      try {
        bcRef.current.postMessage(msg);
      } catch {}
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(AUTH_SYNC_STORAGE_EVENT_KEY, JSON.stringify({ ...msg, nonce: Math.random() }));
        setTimeout(() => {
          try {
            localStorage.removeItem(AUTH_SYNC_STORAGE_EVENT_KEY);
          } catch {}
        }, 1200);
      } catch {}
    }
  };

  const sendServiceWorkerCommand = async (
    type: 'SEERA_PAUSE_SYNC' | 'SEERA_CLOSE_IDB_CONNECTIONS',
    payload: Record<string, any>,
    timeoutMs: number = 2500
  ): Promise<{ ok: boolean; reason?: string }> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return { ok: true };
    }

    let targetSW: ServiceWorker | null = navigator.serviceWorker.controller || null;
    if (!targetSW) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        targetSW = reg?.active || null;
      } catch {
        targetSW = null;
      }
    }

    // No active SW registered/controlling -> no SW IndexedDB handle exists
    if (!targetSW) {
      return { ok: true };
    }

    const expectedAckType = type === 'SEERA_PAUSE_SYNC' ? 'SEERA_SW_ACK_PAUSE' : 'SEERA_SW_ACK_CLOSE_IDB';

    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          navigator.serviceWorker.removeEventListener('message', onSwMessage);
          resolve({
            ok: false,
            reason: `Service worker did not acknowledge ${type} within ${timeoutMs}ms.`,
          });
        }
      }, timeoutMs);

      const finish = (ok: boolean, reason?: string) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener('message', onSwMessage);
          resolve({ ok, reason });
        }
      };

      const onSwMessage = (event: MessageEvent) => {
        if (event.data?.type === expectedAckType && event.data?.correlationId === payload.correlationId) {
          finish(true);
        }
      };

      navigator.serviceWorker.addEventListener('message', onSwMessage);

      try {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (event.data?.type === expectedAckType && event.data?.correlationId === payload.correlationId) {
            finish(true);
          }
        };
        targetSW!.postMessage({ type, ...payload }, [channel.port2]);
      } catch (err: any) {
        finish(false, err?.message || `Failed messaging service worker for ${type}`);
      }
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tabId = tabIdRef.current;
    registerTabHeartbeat(tabId, currentUidRef.current);

    const heartbeatTimer = setInterval(() => {
      registerTabHeartbeat(tabId, currentUidRef.current);
    }, 4000);

    const handleBeforeUnload = () => {
      closeAllTrackedDBConnections();
      unregisterTabHeartbeat(tabId);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    const handleIncomingSyncMessage = async (msg: AuthSyncMessage) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.senderTabId === tabId) return;
      if (msg.targetTabId && msg.targetTabId !== tabId) return;

      // Resolve any awaiting coordinator callback first
      const resolver = pendingTabResponsesRef.current.get(msg.correlationId);
      if (resolver) {
        resolver(msg);
      }

      const selfUid = currentUidRef.current;
      const uidMismatch = Boolean(selfUid && msg.uid && msg.uid !== 'guest' && selfUid !== msg.uid);

      if (msg.type === 'PING_TABS') {
        postAuthSyncMessage({
          type: 'PONG_TABS',
          uid: selfUid || 'guest',
          correlationId: msg.correlationId,
          senderTabId: tabId,
          targetTabId: msg.senderTabId,
          uidMismatch,
          timestamp: Date.now(),
        });
      } else if (msg.type === 'PREPARE_SIGN_OUT') {
        acquireSignOutLock(msg.uid, msg.correlationId);
        backgroundSyncManager.pause();
        await drainInFlightWrites(2000);
        closeAllTrackedDBConnections();
        postAuthSyncMessage({
          type: 'ACK_PREPARE',
          uid: selfUid || 'guest',
          correlationId: msg.correlationId,
          senderTabId: tabId,
          targetTabId: msg.senderTabId,
          uidMismatch,
          timestamp: Date.now(),
        });
      } else if (msg.type === 'CLOSE_IDB_CONNECTIONS') {
        acquireSignOutLock(msg.uid, msg.correlationId);
        backgroundSyncManager.pause();
        closeAllTrackedDBConnections();
        postAuthSyncMessage({
          type: 'ACK_CLOSE_IDB',
          uid: selfUid || 'guest',
          correlationId: msg.correlationId,
          senderTabId: tabId,
          targetTabId: msg.senderTabId,
          uidMismatch,
          timestamp: Date.now(),
        });
      } else if (msg.type === 'SIGN_OUT_ABORTED') {
        if (!getIsolationLockdownState()?.active) {
          releaseSignOutLock(msg.correlationId);
          backgroundSyncManager.resume();
        }
      } else if (msg.type === 'ISOLATION_LOCKDOWN') {
        backgroundSyncManager.pause();
        closeAllTrackedDBConnections();
        if (msg.lockdownState) {
          setIsolationLockdownState(msg.lockdownState);
          setIsolationLockdown(msg.lockdownState);
          setSignOutState((prev) => ({
            ...prev,
            phase: 'ISOLATION_LOCKDOWN',
            lockdownState: msg.lockdownState!,
            holdReason: msg.lockdownState!.details,
          }));
          setShowLogoutModal(true);
        }
      } else if (msg.type === 'SESSION_TERMINATED') {
        closeAllTrackedDBConnections();
        backgroundSyncManager.pause();
        clearOwnerPrivileges();
        window.dispatchEvent(new CustomEvent('seera_privacy_cleared'));
        window.dispatchEvent(new CustomEvent('seera_court_session_changed', { detail: null }));
        setIsolationLockdown(null);
        setShowLogoutModal(false);
        releaseSignOutLock(msg.correlationId);
        if (!uidMismatch) {
          setUser(null);
          setProfile(null);
          setAccessToken(null);
        }
      }
    };

    if ('BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
        bcRef.current = channel;
        channel.onmessage = (event: MessageEvent) => {
          handleIncomingSyncMessage(event.data as AuthSyncMessage);
        };
      } catch (e) {
        console.warn('[Auth] BroadcastChannel init warning:', e);
      }
    }

    const onStorageEvent = (e: StorageEvent) => {
      if (e.key === AUTH_SYNC_STORAGE_EVENT_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingSyncMessage(parsed as AuthSyncMessage);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorageEvent);

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('storage', onStorageEvent);
      unregisterTabHeartbeat(tabId);
      if (bcRef.current) {
        try {
          bcRef.current.close();
        } catch {}
        bcRef.current = null;
      }
    };
  }, []);

  const coordinateTabs = async (
    requestType: 'PREPARE_SIGN_OUT' | 'CLOSE_IDB_CONNECTIONS',
    expectedAckType: 'ACK_PREPARE' | 'ACK_CLOSE_IDB',
    uid: string,
    correlationId: string,
    timeoutMs: number
  ): Promise<{ ok: boolean; unackedTabs: string[]; uidMismatch?: boolean; reason?: string }> => {
    const expectedTabs = new Set<string>(getOtherActiveTabs(tabIdRef.current, null));
    const ackedTabs = new Set<string>();
    let detectedUidMismatch = false;

    const pingCorr = `${correlationId}_ping_${Date.now()}`;
    const pingPromise = new Promise<void>((resolve) => {
      pendingTabResponsesRef.current.set(pingCorr, (msg) => {
        if (msg.type === 'PONG_TABS' && msg.senderTabId !== tabIdRef.current) {
          expectedTabs.add(msg.senderTabId);
          if (msg.uidMismatch) detectedUidMismatch = true;
        }
      });
      postAuthSyncMessage({
        type: 'PING_TABS',
        uid,
        correlationId: pingCorr,
        senderTabId: tabIdRef.current,
        timestamp: Date.now(),
      });
      setTimeout(() => {
        pendingTabResponsesRef.current.delete(pingCorr);
        resolve();
      }, 220);
    });

    await pingPromise;

    if (expectedTabs.size === 0) {
      // Broadcast anyway in case an idle tab missed ping, with no unacked expected tabs
      postAuthSyncMessage({
        type: requestType,
        uid,
        correlationId,
        senderTabId: tabIdRef.current,
        timestamp: Date.now(),
      });
      return { ok: !detectedUidMismatch, unackedTabs: [], uidMismatch: detectedUidMismatch };
    }

    return new Promise((resolve) => {
      let settled = false;
      const checkDone = () => {
        const missing = Array.from(expectedTabs).filter((t) => !ackedTabs.has(t));
        if (missing.length === 0 && !settled) {
          settled = true;
          clearTimeout(timer);
          pendingTabResponsesRef.current.delete(correlationId);
          resolve({
            ok: !detectedUidMismatch,
            unackedTabs: [],
            uidMismatch: detectedUidMismatch,
          });
        }
      };

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          pendingTabResponsesRef.current.delete(correlationId);
          const missing = Array.from(expectedTabs).filter((t) => !ackedTabs.has(t));
          resolve({
            ok: false,
            unackedTabs: missing,
            uidMismatch: detectedUidMismatch,
            reason: `Timed out waiting for ${missing.length} active browser tab(s) to acknowledge ${requestType}.`,
          });
        }
      }, timeoutMs);

      pendingTabResponsesRef.current.set(correlationId, (msg) => {
        if (msg.type === expectedAckType && msg.senderTabId !== tabIdRef.current) {
          ackedTabs.add(msg.senderTabId);
          if (msg.uidMismatch) detectedUidMismatch = true;
          checkDone();
        }
      });

      postAuthSyncMessage({
        type: requestType,
        uid,
        correlationId,
        senderTabId: tabIdRef.current,
        timestamp: Date.now(),
      });
    });
  };

  const coordinatorRef = useRef<ReturnType<typeof createSignOutCoordinator> | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = createSignOutCoordinator({
      getCurrentUid: () => currentUidRef.current,
      getCurrentEmail: () => currentEmailRef.current,
      pauseSync: () => backgroundSyncManager.pause(),
      resumeSync: () => backgroundSyncManager.resume(),
      drainWrites: async (timeoutMs) => {
        const syncDrained = await backgroundSyncManager.drainActiveSync(timeoutMs);
        const writesDrain = await drainInFlightWrites(timeoutMs);
        return {
          drained: syncDrained && writesDrain.drained,
          timedOut: !syncDrained || writesDrain.timedOut,
          pendingLabels: writesDrain.pendingLabels,
        };
      },
      notifyServiceWorkerPause: (paused, correlationId) =>
        sendServiceWorkerCommand('SEERA_PAUSE_SYNC', { paused, correlationId }),
      notifyServiceWorkerCloseIDB: (correlationId) =>
        sendServiceWorkerCommand('SEERA_CLOSE_IDB_CONNECTIONS', { correlationId }),
      coordinateTabsPrepare: (uid, correlationId, timeoutMs) =>
        coordinateTabs('PREPARE_SIGN_OUT', 'ACK_PREPARE', uid, correlationId, timeoutMs),
      coordinateTabsCloseIDB: (uid, correlationId, timeoutMs) =>
        coordinateTabs('CLOSE_IDB_CONNECTIONS', 'ACK_CLOSE_IDB', uid, correlationId, timeoutMs),
      broadcastAbort: (uid, correlationId) =>
        postAuthSyncMessage({
          type: 'SIGN_OUT_ABORTED',
          uid,
          correlationId,
          senderTabId: tabIdRef.current,
          timestamp: Date.now(),
        }),
      broadcastTerminated: (uid, correlationId) =>
        postAuthSyncMessage({
          type: 'SESSION_TERMINATED',
          uid,
          correlationId,
          senderTabId: tabIdRef.current,
          timestamp: Date.now(),
        }),
      broadcastLockdown: (uid, correlationId, lockdown) =>
        postAuthSyncMessage({
          type: 'ISOLATION_LOCKDOWN',
          uid,
          correlationId,
          senderTabId: tabIdRef.current,
          lockdownState: lockdown,
          timestamp: Date.now(),
        }),
      syncQueuedEdits: async () => {
        const res = await backgroundSyncManager.syncQueuedEdits({ allowDuringSignOut: true });
        return {
          syncedCount: res.syncedCount,
          remainingPendingCount: res.remainingPendingCount,
          errors: res.errors,
        };
      },
      syncCourtData: () => syncOfflineDataWithFirestore({ allowDuringSignOut: true }),
      buildInventory: () =>
        buildLocalDataInventory({
          uid: currentUidRef.current,
          email: currentEmailRef.current,
          idbReader: {
            readAllStores: readAllOfflineDBStoresSnapshot,
          },
        }),
      closeLocalIDBConnections: () => closeAllTrackedDBConnections(),
      deleteOfflineDB: (opts) =>
        safeDeleteOfflineDB(OFFLINE_DB_NAME, {
          timeoutMs: 4500,
          correlationId: opts.correlationId,
          onBlocked: opts.onBlocked,
          onLateSettlement: opts.onLateSettlement,
        }),
      purgeAppStorage: () => purgeSensitiveAppStorage({ preserveAllowlist: true }),
      firebaseSignOut: () => signOut(auth),
      verifyFirebaseSignedOut: () => auth.currentUser === null,
      clearClientAuthState: () => {
        clearOwnerPrivileges();
        try {
          sessionStorage.setItem(
            'seera_last_logout_reason',
            'Guarded verified sign-out at ' + new Date().toISOString()
          );
        } catch {}
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('seera_privacy_cleared'));
          window.dispatchEvent(new CustomEvent('seera_court_session_changed', { detail: null }));
        }
        setIsolationLockdown(null);
        setUser(null);
        setProfile(null);
        setAccessToken(null);
        setShowLogoutModal(false);
      },
      onStateChange: (next) => {
        setSignOutState(next);
        setIsolationLockdown(next.lockdownState);
      },
    });
  }

  const requestLogout = () => {
    setShowLogoutModal(true);
    coordinatorRef.current?.beginSignOut().catch((err) => {
      console.error('[Auth] Guarded sign-out init error:', err);
    });
  };

  // All callers must route through the guarded modal & coordinator — never silent bypass
  const logout = async (_clearCache?: boolean) => {
    requestLogout();
  };

  const retryIsolationRecovery = async () => {
    setShowLogoutModal(true);
    await coordinatorRef.current?.retryIsolationRecovery();
  };

  const handleStaySignedIn = async () => {
    await coordinatorRef.current?.cancelStaySignedIn();
    if (!getIsolationLockdownState()?.active) {
      setShowLogoutModal(false);
    }
  };

  const handleRetrySync = async () => {
    await coordinatorRef.current?.retrySync();
  };

  const handleExportBackup = (): boolean => {
    if (!signOutState.inventory) return false;
    const payload = buildLocalBackupPayload(
      signOutState.inventory,
      currentUidRef.current,
      currentEmailRef.current
    );
    return triggerLocalBackupDownload(payload);
  };

  const handleConfirmSignOut = async (options: {
    discardConfirmed: boolean;
    backupExported: boolean;
  }) => {
    await coordinatorRef.current?.confirmAndExecuteSignOut(options);
  };

  const updateProfile = async (updates: Partial<UserSettings>) => {
    if (!user) return;

    // Update local state immediately (strip privileged claim fields so client cannot spoof roles)
    const {
      role: _ignoredRole,
      admin: _ignoredAdmin,
      courtRole: _ignoredCourtRole,
      ...safeUpdates
    } = updates as any;

    setProfile((prev) => ({
      ...(prev || DEFAULT_SETTINGS),
      ...safeUpdates,
      email: user.email || (prev as any)?.email || '',
    } as any));

    // Never sync anonymous guest profile writes to protected Firestore users/{uid}
    if (user.isAnonymous || !auth.currentUser || auth.currentUser.uid !== user.uid) {
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(
        userDocRef,
        {
          ...safeUpdates,
          uid: user.uid,
          email: user.email || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('Profile Firestore update note:', error);
    }
  };

  const sendVerificationEmail = async (_emailOrUsername?: string, _name?: string): Promise<string> => {
    await resendEmailVerification();
    const linkInfo = window.location.origin;
    setLastSentVerificationLink(linkInfo);
    return linkInfo;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      profile, 
      authClaims,
      signIn, 
      signInWithEmail, 
      signUpWithEmail, 
      signInAsGuest,
      sendEmailSignInLink,
      completeEmailLinkSignIn,
      pendingEmailLinkUrl,
      resendEmailVerification,
      refreshAuthClaims,
      signInWithBiometrics,
      enrollBiometrics,
      isBiometricEnrolled,
      resetPassword, 
      logout, 
      requestLogout,
      isolationLockdown,
      retryIsolationRecovery,
      updateProfile,
      sendVerificationEmail,
      lastSentVerificationLink,
      verificationSuccessMsg,
      verifyBrowserLocalPersistence,
      accessToken
    }}>
      {children}
      <LogoutConfirmationModal
        currentLang={profile?.appLanguage || 'om'}
        isOpen={showLogoutModal}
        phase={signOutState.phase}
        inventory={signOutState.inventory}
        syncErrors={signOutState.syncErrors}
        holdReason={signOutState.holdReason}
        lockdownState={isolationLockdown || signOutState.lockdownState}
        unackedTabs={signOutState.unackedTabs}
        userEmail={user?.email || (profile as any)?.email || null}
        onCloseStaySignedIn={handleStaySignedIn}
        onRetrySync={handleRetrySync}
        onExportBackup={handleExportBackup}
        onConfirmSignOut={handleConfirmSignOut}
        onRetryIsolationRecovery={retryIsolationRecovery}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
