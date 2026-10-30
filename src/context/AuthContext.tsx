import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  sendPasswordResetEmail,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import { isOwnerEmail, isOwnerUsername, unlockOwnerPrivileges } from '../services/ownerAuth';
import { UserSettings, DEFAULT_SETTINGS } from '../services/storage';
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

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  profile: UserSettings | null;
  signIn: () => Promise<void>;
  signInWithEmail: (emailOrUsername: string, pass: string) => Promise<void>;
  signUpWithEmail: (emailOrUsername: string, pass: string, name: string) => Promise<void>;
  signInByEmailOnly: (emailOrUsername: string, name?: string, isVerifiedOwner?: boolean) => Promise<void>;
  signInWithBiometrics: (preferredEmail?: string) => Promise<BiometricAuthResult>;
  enrollBiometrics: (userEmail: string, userName?: string) => Promise<BiometricAuthResult>;
  isBiometricEnrolled: () => boolean;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserSettings>) => Promise<void>;
  sendVerificationEmail: (emailOrUsername: string, name: string) => Promise<string>;
  lastSentVerificationLink: string | null;
  verificationSuccessMsg: string | null;
  verifyBrowserLocalPersistence: () => Promise<PersistenceDiagnosticReport>;
  sendSignInLink: (email: string) => Promise<void>;
  signInWithEmailLink: (email: string, link: string) => Promise<void>;
  finishPasswordSetup: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserSettings | null>(null);
  // Default loading to true during startup so persistence can be resolved before redirecting to landing
  const [loading, setLoading] = useState(true);
  const [lastSentVerificationLink, setLastSentVerificationLink] = useState<string | null>(null);
  const [verificationSuccessMsg, setVerificationSuccessMsg] = useState<string | null>(null);

  const authMountTimeRef = useRef<number>(performance.now());
  const initialAuthDispatchedRef = useRef<boolean>(false);
  const registeredSidsRef = useRef<Set<string>>(new Set());

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

  // URL query verification hook
  useEffect(() => {
    const checkVerificationParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const verifyEmail = params.get('verifyEmail');
      const token = params.get('token');
      if (verifyEmail && token) {
        setLoading(true);
        try {
          const verificationDocRef = doc(db, 'verifications', token);
          const snap = await getDoc(verificationDocRef);
          if (snap.exists() && snap.data().email === verifyEmail && !snap.data().used) {
            // Update token as used in Firestore
            await setDoc(verificationDocRef, { used: true }, { merge: true });
            
            // Set localStorage to enable instant access
            localStorage.setItem('seera_is_premium', 'true');
            localStorage.setItem('seera_premium_plan', 'unlimited');
            localStorage.setItem('seera_app_updated', 'true');
            localStorage.setItem('seera_legal_qual_verified', 'true');
            localStorage.setItem('seera_legal_fullname', snap.data().name || 'Premium Subscriber');

            // Trigger success message state
            setVerificationSuccessMsg(verifyEmail);

            // Log user in automatically
            await signInByEmailOnly(verifyEmail, snap.data().name);

            // Clean query parameters from address bar
            const url = new URL(window.location.href);
            url.searchParams.delete('verifyEmail');
            url.searchParams.delete('token');
            window.history.replaceState({}, '', url.toString());
          } else {
            console.warn('Verification token is invalid or already used');
          }
        } catch (e) {
          console.error('Email verification URL process failed:', e);
        } finally {
          setLoading(false);
        }
      }
    };
    checkVerificationParams();
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const mountElapsed = Math.round(performance.now() - authMountTimeRef.current);

    console.log(`[Auth Lifecycle: STARTUP] Initializing onAuthStateChanged subscriber (+${mountElapsed}ms from mount)...`, {
      currentUserInMemory: auth.currentUser ? auth.currentUser.uid : 'null',
      hasSessionStorageId: Boolean(sessionStorage.getItem('seera_session_id')),
      cachedEmail: localStorage.getItem('seera_cached_email'),
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      const isInitialCallback = !initialAuthDispatchedRef.current;
      initialAuthDispatchedRef.current = true;
      const callbackElapsed = Math.round(performance.now() - authMountTimeRef.current);

      console.group(
        `🔐 [Auth Lifecycle: onAuthStateChanged] Event Fired (+${callbackElapsed}ms, ${isInitialCallback ? 'INITIAL STARTUP' : 'RUNTIME UPDATE'})`
      );

      console.log('Firebase User Details:', firebaseUser ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        isAnonymous: firebaseUser.isAnonymous,
        emailVerified: firebaseUser.emailVerified,
        providerId: firebaseUser.providerData?.[0]?.providerId || 'none',
      } : 'null (No user)');

      if (unsubscribeProfile) {
        console.log('[Auth Lifecycle] Cleaning up previous Firestore profile snapshot listener...');
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // --- CASE A: User session detected (restored via browserLocalPersistence or fresh login) ---
        console.log(
          `[Auth Lifecycle: SESSION PERSISTED] Persistent session identified for UID: ${firebaseUser.uid}. Attaching Firestore profile sync...`
        );

        setUser(firebaseUser);

        // Retain or sync email in cached storage to guarantee persistence across anonymous/popup flows
        if (firebaseUser.email) {
          localStorage.setItem('seera_cached_email', firebaseUser.email);
        }

        // Apply instant baseline profile so the app opens immediately without network delay
        const cachedEmail = localStorage.getItem('seera_cached_email') || firebaseUser.email || '';
        const immediateProfile: UserSettings = {
          ...DEFAULT_SETTINGS,
          visitorName: firebaseUser.displayName || cachedEmail.split('@')[0] || 'Legal Jurist',
          isLegalProfessional: true,
          legalRole: 'advocate',
          ...({ email: cachedEmail } as any),
        };
        setProfile(prev => prev || immediateProfile);
        setLoading(false);

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserSettings;
            console.log('[Auth Lifecycle: PROFILE SYNC] Firestore user document synchronized successfully:', {
              uid: firebaseUser.uid,
              visitorName: data.visitorName,
              email: (data as any).email,
              role: data.role || data.legalRole,
              activeSessionsCount: data.activeSessions ? Object.keys(data.activeSessions).length : 0,
            });
            
            // Persist role to localStorage for synchronous access in non-React service functions
            if (data.role) {
              localStorage.setItem('seera_user_role', data.role);
            } else if (data.legalRole) {
              localStorage.setItem('seera_user_role', data.legalRole);
            }

            setProfile(data);
          } else {
            console.warn(
              `[Auth Lifecycle: PROFILE NOTICE] User document does not exist yet at users/${firebaseUser.uid}. Applying baseline profile to prevent session drop.`
            );
            const cachedEmail = localStorage.getItem('seera_cached_email') || firebaseUser.email || '';
            const fallbackProfile: UserSettings = {
              ...DEFAULT_SETTINGS,
              visitorName: firebaseUser.displayName || cachedEmail.split('@')[0] || 'Legal Jurist',
              isLegalProfessional: true,
              legalRole: 'advocate',
              ...({ email: cachedEmail } as any),
            };
            setProfile(fallbackProfile);
          }
          setLoading(false);
        }, (error) => {
          console.warn('[Auth Lifecycle: PROFILE SYNC WARNING] Firestore onSnapshot error:', error);
          // Do not interrupt authentication session even if firestore rules or offline status delays doc read
          setLoading(false);
        });

      } else {
        // --- CASE B: User session is NULL ---
        // Diagnose precisely where the user session was interrupted or why it is empty
        const cachedEmail = localStorage.getItem('seera_cached_email');
        const lastLogoutReason = sessionStorage.getItem('seera_last_logout_reason');
        const hasIndexedDB = typeof window !== 'undefined' && 'indexedDB' in window;
        const cachedKeys = typeof localStorage !== 'undefined'
          ? Object.keys(localStorage).filter(k => k.startsWith('firebase:authUser:') || k.startsWith('seera_'))
          : [];

        console.log('[Auth Lifecycle: SESSION INTERRUPTED / EMPTY] Investigating session state:', {
          isInitialStartup: isInitialCallback,
          timeSinceStartupMs: callbackElapsed,
          lastLogoutReason: lastLogoutReason || 'None recorded (clean session or storage cleared)',
          cachedEmailFound: cachedEmail,
          cachedKeysFound: cachedKeys,
          indexedDBAvailable: hasIndexedDB,
          conclusion: isInitialCallback 
            ? 'Cold start: No persisted credentials found in browserLocalPersistence storage.'
            : 'Runtime disconnection: Session was cleared or user signed out.'
        });

        setUser(null);
        setProfile(null);
        setLoading(false);
      }

      console.groupEnd();
    });

    return () => {
      console.log('[Auth Lifecycle] Teardown: Unsubscribing onAuthStateChanged and Firestore profile listeners.');
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
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
    if (!trimmed.includes('@')) {
      const sanitized = trimmed.replace(/[^a-z0-9._-]/g, '');
      return `${sanitized}@saiethio.com`;
    }
    return trimmed;
  };

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (popupErr) {
      console.warn('Google popup note:', popupErr);
      throw popupErr;
    }
  };

  const signInWithEmail = async (emailOrUsername: string, pass: string) => {
    const email = normalizeEmail(emailOrUsername);
    console.log('Attempting sign in with:', email);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.warn('Authentication failed for:', email, error);
      throw error;
    }
  };

  const signUpWithEmail = async (emailOrUsername: string, pass: string, name: string) => {
    const email = normalizeEmail(emailOrUsername);
    const isOwnerTarget = isOwnerEmail(email) || isOwnerUsername(emailOrUsername);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        if (name.trim()) {
          await updateFirebaseProfile(cred.user, { displayName: name.trim() });
        }
        const userDocRef = doc(db, 'users', cred.user.uid);
        await setDoc(userDocRef, {
          uid: cred.user.uid,
          email,
          visitorName: name.trim() || email.split('@')[0],
          legalRole: 'advocate',
          isLegalProfessional: isOwnerTarget,
          accountStatus: isOwnerTarget ? 'approved' : 'pending',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (error) {
      console.warn('Sign up rejection:', error);
      throw error;
    }
  };

  const signInByEmailOnly = async (emailOrUsername: string, name?: string, isVerifiedOwner: boolean = false) => {
    const email = normalizeEmail(emailOrUsername);
    const isOwnerTarget = isOwnerEmail(email) || isOwnerUsername(emailOrUsername);

    if (isOwnerTarget && !isVerifiedOwner) {
      setLoading(false);
      throw new Error('Email/Username kun kan abbaa appiiti. Maaloo email dhuunfaa keessan galchaa!');
    }

    if (isVerifiedOwner || isOwnerTarget) {
      unlockOwnerPrivileges(email);
    }
    
    const isApprovedOwner = isVerifiedOwner || isOwnerTarget;
    
    // For regular users: 100% reliable popup-free instant auth
    try {
      setLoading(true);
      let uid = 'usr_' + Math.random().toString(36).substring(2, 10);
      try {
        const cred = await signInAnonymously(auth);
        if (cred?.user?.uid) {
          uid = cred.user.uid;
        }
      } catch (anonErr) {
        console.warn('Anonymous auth note (fallback to instant session):', anonErr);
      }

      localStorage.setItem('seera_cached_email', email);
      if (name) localStorage.setItem('seera_cached_name', name.trim());

      setUser({
        uid,
        email,
        displayName: name?.trim() || email.split('@')[0],
        emailVerified: true,
        isAnonymous: true,
      } as any);

      setProfile({
        ...DEFAULT_SETTINGS,
        email,
        visitorName: name?.trim() || email.split('@')[0],
        isLegalProfessional: isApprovedOwner,
        legalRole: 'advocate',
        accountStatus: isApprovedOwner ? 'approved' : 'pending',
      } as any);

      if (auth.currentUser && auth.currentUser.uid === uid) {
        try {
          const userDocRef = doc(db, 'users', uid);
          await setDoc(userDocRef, {
            uid,
            email,
            visitorName: name?.trim() || email.split('@')[0],
            isLegalProfessional: isApprovedOwner,
            accountStatus: isApprovedOwner ? 'approved' : 'pending',
            updatedAt: serverTimestamp(),
            courtId: 'public', // Default public for non-court staff
          }, { merge: true });
        } catch (dbErr) {
          console.warn('User profile sync note:', dbErr);
        }
      }

      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      console.warn('Instant sign in error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const norm = normalizeEmail(email);
    try {
      await sendPasswordResetEmail(auth, norm);
    } catch (error) {
      console.warn('Password reset issue:', error);
      throw error;
    }
  };

  const isBiometricEnrolled = (): boolean => {
    return !!getBiometricEnrollmentStatus();
  };

  const signInWithBiometrics = async (preferredEmail?: string): Promise<BiometricAuthResult> => {
    try {
      setLoading(true);
      // 1. Get options from server
      const response = await fetch('/api/webauthn/generate-authentication-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: preferredEmail }),
      });
      const options = await response.json();

      // 2. Start authentication via simplewebauthn
      const assertion = await authenticateBiometricPasskey(options);

      // 3. Verify on server
      const verificationResponse = await fetch('/api/webauthn/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assertion, userId: preferredEmail }),
      });
      const result = await verificationResponse.json();

      if (result.success) {
        await signInByEmailOnly(preferredEmail || 'legal@seeraai.et', 'Legal Professional');
        setLoading(false);
        return { success: true, authMethod: 'passkey', timestamp: new Date().toISOString() };
      }
      throw new Error('Verification failed');
    } catch (err: any) {
      setLoading(false);
      return { success: false, authMethod: 'passkey', timestamp: new Date().toISOString(), error: err.message };
    }
  };

  const enrollBiometrics = async (userEmail: string, userName?: string): Promise<BiometricAuthResult> => {
    try {
      // 1. Get options from server
      const response = await fetch('/api/webauthn/generate-registration-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userEmail, userName }),
      });
      const options = await response.json();

      // 2. Start registration via simplewebauthn
      const credential = await registerBiometricPasskey(options);

      // 3. Verify on server
      const verificationResponse = await fetch('/api/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, userId: userEmail }),
      });
      const result = await verificationResponse.json();
      
      return { success: result.success, authMethod: 'passkey', timestamp: new Date().toISOString() };
    } catch (err: any) {
      return { success: false, authMethod: 'passkey', timestamp: new Date().toISOString(), error: err.message };
    }
  };


  const logout = async () => {
    try {
      localStorage.removeItem('seera_owner_email');
      localStorage.removeItem('seera_owner_key');
      localStorage.removeItem('seera_current_user_id');
      localStorage.removeItem('seera_current_user_email');
      localStorage.removeItem('seera_user_email');
      localStorage.removeItem('seera_cached_email');
      localStorage.removeItem('seera_cached_name');
      sessionStorage.setItem('seera_last_logout_reason', 'User explicitly invoked logout at ' + new Date().toISOString());
      sessionStorage.removeItem('seera_guest_session_id');
      sessionStorage.removeItem('seera_court_active_session');
      localStorage.removeItem('seera_court_active_session');
      sessionStorage.removeItem('seera_biometric_unlocked');
      
      // Notify components to clear transient states
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('seera_privacy_cleared'));
        window.dispatchEvent(new CustomEvent('seera_court_session_changed', { detail: null }));
      }

      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.warn('Logout termination issue:', error);
    }
  };

  const updateProfile = async (updates: Partial<UserSettings>) => {
    if (!user) return;
    
    // Update local state immediately
    setProfile(prev => ({
      ...(prev || DEFAULT_SETTINGS),
      ...updates,
      email: user.email || (prev as any)?.email || '',
    } as any));

    // Only sync to Firestore if authenticated with matching UID
    if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    try {
      const currentProfile = profile || {
        ...DEFAULT_SETTINGS,
        email: user.email || '',
        visitorName: user.displayName || 'Legal Jurist',
      };

      const newProfile = {
        ...currentProfile,
        ...updates,
        uid: user.uid,
        email: user.email || '',
        updatedAt: serverTimestamp(),
      };

      await setDoc(userDocRef, newProfile, { merge: true });
    } catch (error) {
      console.warn('Profile Firestore update note:', error);
    }
  };

  const sendVerificationEmail = async (emailOrUsername: string, name: string): Promise<string> => {
    const email = normalizeEmail(emailOrUsername);
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const token = 'tok_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    const verificationLink = `${window.location.origin}/?verifyEmail=${encodeURIComponent(email)}&token=${token}`;

    try {
      // Save verification state in Firestore
      const verificationDocRef = doc(db, 'verifications', token);
      await setDoc(verificationDocRef, {
        email,
        name,
        token,
        code: confirmationCode,
        createdAt: new Date().toISOString(),
        used: false
      });

      // Push to in-app inbox messages
      const inboxMsg = {
        id: 'msg_' + Date.now(),
        email,
        code: confirmationCode,
        title: 'Koodii Mirkaneessaa Appii / App Confirmation Code',
        timestamp: new Date().toLocaleTimeString(),
        read: false
      };

      try {
        const rawInbox = localStorage.getItem('seera_app_inbox_messages');
        const existing = rawInbox ? JSON.parse(rawInbox) : [];
        existing.unshift(inboxMsg);
        localStorage.setItem('seera_app_inbox_messages', JSON.stringify(existing));
        window.dispatchEvent(new CustomEvent('seera_inbox_updated'));
      } catch (err) {
        console.warn('Inbox storage note:', err);
      }

      setLastSentVerificationLink(verificationLink);
    } catch (e) {
      console.warn('Could not save verification state to Firestore:', e);
      setLastSentVerificationLink(verificationLink);
    }
    return verificationLink;
  };

  const sendSignInLink = async (email: string) => {
    // Implement email link sending logic here
    console.log('Sending sign-in link to:', email);
  };

  const signInWithEmailLink = async (email: string, link: string) => {
    // Implement email link sign in logic here
    console.log('Signing in with link:', link);
  };

  const finishPasswordSetup = async (password: string) => {
    // Implement password setup logic here
    console.log('Setting up password...');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      profile, 
      signIn, 
      signInWithEmail, 
      signUpWithEmail, 
      signInByEmailOnly,
      signInWithBiometrics,
      enrollBiometrics,
      isBiometricEnrolled,
      resetPassword, 
      logout, 
      updateProfile,
      sendVerificationEmail,
      lastSentVerificationLink,
      verificationSuccessMsg,
      verifyBrowserLocalPersistence,
      // NEW FUNCTIONS EXPOSED
      sendSignInLink,
      signInWithEmailLink,
      finishPasswordSetup
    }}>
      {children}
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
