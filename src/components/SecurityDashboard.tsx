import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Language } from '../i18n/translations';
import { UserSettings, saveUserSettings } from '../services/storage';

interface SecurityDashboardProps {
  currentLang: Language;
  settings: UserSettings;
  onSettingsUpdate: (newSettings: UserSettings) => void;
  biometricSupported: boolean;
  isSessionUnlocked: boolean;
  onToggleBiometric: () => Promise<void>;
  onTestBiometric: () => Promise<void>;
  biometricProcessing: boolean;
  biometricFeedback: {
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: string;
    method?: string;
  } | null;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  currentLang,
  settings,
  onSettingsUpdate,
  biometricSupported,
  isSessionUnlocked,
  onToggleBiometric,
  onTestBiometric,
  biometricProcessing,
  biometricFeedback,
}) => {
  const { user, profile, updateProfile, logout } = useAuth();
  const [activeSessionCount, setActiveSessionCount] = useState<number>(1);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const currentSessionId = typeof window !== 'undefined' ? sessionStorage.getItem('seera_session_id') : null;

  // Real-time listener for active sessions to display live count
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const activeSessions = data.activeSessions || {};
          const count = Object.keys(activeSessions).length;
          setActiveSessionCount(count > 0 ? count : 1);
        }
      },
      () => {
        // Fallback gracefully
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Status computations
  const isWebAuthnActive = !!settings.biometricDocumentProtection;
  const autoLockMinutes = settings.autoLockTimeout || 0;
  const isAutoLockActive = autoLockMinutes > 0;
  const isSessionManagementActive = true; // Always active via session verification

  const activeProtectionCount = (isWebAuthnActive ? 1 : 0) + (isAutoLockActive ? 1 : 0) + (isSessionManagementActive ? 1 : 0);

  // Overall security score calculation with dynamic color-coding
  const getSecurityScore = () => {
    if (activeProtectionCount === 3) {
      return {
        level: currentLang === 'om' ? 'Olaanaa / Maximum' : currentLang === 'am' ? 'ከፍተኛ ደረጃ' : 'Maximum Security',
        percent: '100%',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-950/80 border-emerald-500/40',
        statusIcon: '🟢',
        badge: currentLang === 'om' ? '🟢 Eegumsa Cimaa (Fully Protected)' : currentLang === 'am' ? '🟢 ሙሉ ጥበቃ (Fully Protected)' : '🟢 Fully Protected (High)',
      };
    }
    if (activeProtectionCount === 2) {
      return {
        level: currentLang === 'om' ? 'Giddu-galeessa / Moderate' : currentLang === 'am' ? 'መካከለኛ ደረጃ' : 'Moderate Security',
        percent: '66%',
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/80 border-amber-500/40',
        statusIcon: '🟡',
        badge: currentLang === 'om' ? '🟡 Eegumsa Giddu-galeessaa (Moderate)' : currentLang === 'am' ? '🟡 መካከለኛ ጥበቃ' : '🟡 Moderate Protection',
      };
    }
    return {
      level: currentLang === 'om' ? 'Bu\'uuraa / Basic' : currentLang === 'am' ? 'መሰረታዊ ደረጃ' : 'Basic Security',
      percent: '33%',
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/80 border-amber-500/40',
      statusIcon: '🟡',
      badge: currentLang === 'om' ? '🟡 Eegumsa Bu\'uuraa (Action Suggested)' : currentLang === 'am' ? '🟡 መሰረታዊ ጥበቃ' : '🟡 Basic Protection',
    };
  };

  const securityScore = getSecurityScore();

  // Handle Quick Auto-Lock Toggle
  const handleToggleAutoLock = (newMins: number) => {
    const updated = saveUserSettings({ autoLockTimeout: newMins });
    onSettingsUpdate(updated);
    if (user) {
      updateProfile({ autoLockTimeout: newMins });
    }
  };

  // Revoke All Sessions
  const handleRevokeAllSessions = async () => {
    if (!user) return;
    setSessionActionLoading(true);
    setSessionFeedback(null);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { activeSessions: {} }, { merge: true });

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('seera_session_id');
      }

      try {
        await addDoc(collection(db, 'auth_logs'), {
          userId: user.uid,
          attemptType: 'success',
          action: 'REVOKE_ALL_SESSIONS',
          timestamp: serverTimestamp(),
          details: 'Global revocation triggered from Security Dashboard',
        });
      } catch {
        // ignore
      }

      setSessionFeedback(
        currentLang === 'om'
          ? 'Heeyyamni browseroota hunda milkaa\'inaan haqameera! Battalatti re-auth barbaachisa.'
          : currentLang === 'am'
          ? 'የሁሉም አሳሾች ፈቃድ በተሳካ ሁኔታ ተሰርዟል! እንደገና መግባት ያስፈልጋል።'
          : 'All sessions successfully revoked. Re-authentication enforced.'
      );
      setShowRevokeConfirm(false);

      setTimeout(() => {
        logout();
      }, 1500);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      setSessionFeedback('Dogoggora seensa haqamaa: ' + (err.message || 'Error'));
    } finally {
      setSessionActionLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border shadow-sm ${securityScore.bgColor} ${securityScore.color}`}>
            <span>🛡️</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om'
                  ? 'Daashboordii Nageenyaa (Security Dashboard)'
                  : currentLang === 'am'
                  ? 'የደህንነት ዳሽቦርድ (Security Dashboard)'
                  : 'Security Dashboard'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${securityScore.bgColor} ${securityScore.color}`}>
                <span>{securityScore.statusIcon}</span>
                <span>{securityScore.badge}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentLang === 'om'
                ? 'Haala eegumsa sirnaa (WebAuthn, Auto-Lock, fi Sessions) hordofaa, asxaa halluu jijjiiramuun daqiiqaa keessatti adda baafadhaa.'
                : currentLang === 'am'
                ? 'የደህንነት ጥበቃ ሁኔታዎችን (WebAuthn, Auto-Lock, Session Management) በቀለም በተለዩ ምስሎች ወዲያውኑ ይቆጣጠሩ።'
                : 'Monitor safety levels with dynamic, color-coded icons (green for active, amber for inactive).'}
            </p>
          </div>
        </div>

        {/* Protection Health Pill */}
        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto shadow-inner">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-mono font-semibold">
              {currentLang === 'om' ? 'Sadarkaa Nageenyaa' : 'የደህንነት ደረጃ'}
            </div>
            <div className={`text-sm font-bold flex items-center justify-end gap-1.5 ${securityScore.color}`}>
              <span>{securityScore.statusIcon}</span>
              <span>{activeProtectionCount}/3 Eegamaa ({securityScore.percent})</span>
            </div>
          </div>
          <span className="text-2xl">
            {activeProtectionCount === 3 ? '🟢' : '🟡'}
          </span>
        </div>
      </div>

      {/* Instant Visual Safety Level Strip (Instant Visual Feedback) */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="font-semibold flex items-center gap-1.5 text-slate-300">
            <span>⚡</span>
            <span>
              {currentLang === 'om'
                ? 'Haala Eegumsa Ammaa (Instant Safety Matrix):'
                : currentLang === 'am'
                ? 'የአሁን የደህንነት ሁኔታ ማጠቃለያ:'
                : 'Instant Safety Level Matrix:'}
            </span>
          </span>
          <span className="text-[10px] text-slate-500">
            🟢 Active • 🟡 Inactive
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* WebAuthn Live Status Pill */}
          <div
            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
              isWebAuthnActive
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            <span className="font-medium truncate">WebAuthn</span>
            <span className="font-bold flex items-center gap-1 text-[11px] shrink-0">
              <span>{isWebAuthnActive ? '🟢' : '🟡'}</span>
              <span>{isWebAuthnActive ? 'Active' : 'Inactive'}</span>
            </span>
          </div>

          {/* Auto-Lock Live Status Pill */}
          <div
            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
              isAutoLockActive
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            <span className="font-medium truncate">Auto-Lock</span>
            <span className="font-bold flex items-center gap-1 text-[11px] shrink-0">
              <span>{isAutoLockActive ? '🟢' : '🟡'}</span>
              <span>{isAutoLockActive ? `${autoLockMinutes}m Active` : 'Inactive'}</span>
            </span>
          </div>

          {/* Session Security Live Status Pill */}
          <div
            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
              isSessionManagementActive
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            <span className="font-medium truncate">Sessions</span>
            <span className="font-bold flex items-center gap-1 text-[11px] shrink-0">
              <span>{isSessionManagementActive ? '🟢' : '🟡'}</span>
              <span>{isSessionManagementActive ? `${activeSessionCount} Active` : 'Inactive'}</span>
            </span>
          </div>

          {/* Hardware Sensor Live Status Pill */}
          <div
            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
              biometricSupported
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            <span className="font-medium truncate">Hardware</span>
            <span className="font-bold flex items-center gap-1 text-[11px] shrink-0">
              <span>{biometricSupported ? '🟢' : '🟡'}</span>
              <span>{biometricSupported ? 'Supported' : 'Unsupported'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid of the 3 Protection Mechanisms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. WEBAUTHN BIOMETRIC PROTECTION */}
        <div
          className={`bg-slate-950 border rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all ${
            isWebAuthnActive
              ? 'border-emerald-500/40 hover:border-emerald-500/60'
              : 'border-amber-500/30 hover:border-amber-500/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {/* Dynamic Color-Coded Icon: Green for Active, Amber for Inactive */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-colors ${
                    isWebAuthnActive
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm'
                      : 'bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-sm'
                  }`}
                  title={isWebAuthnActive ? 'WebAuthn is Active (Protected)' : 'WebAuthn is Inactive (Unprotected)'}
                >
                  <span>{isWebAuthnActive ? '🟢' : '🟡'}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                    <span>{isWebAuthnActive ? '🔐' : '🔓'}</span>
                    <span>WebAuthn Biometrics</span>
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {isWebAuthnActive ? 'Level: High Protection' : 'Level: Inactive'}
                  </div>
                </div>
              </div>

              {/* Dynamic Status Badge: Green for Active, Amber for Inactive */}
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${
                  isWebAuthnActive
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                }`}
              >
                <span>{isWebAuthnActive ? '🟢' : '🟡'}</span>
                <span>{isWebAuthnActive ? 'Banameera (Active)' : 'Dhaamsameera (Inactive)'}</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {currentLang === 'om'
                ? 'Asxaa qubaa, FaceID, fi Passkey fayyadamuun sanadoota qorannoo seeraa eega.'
                : 'የጣት አሻራ እና FaceID ን በመጠቀም ሚስጥራዊ የህግ ሰነዶችን ይጠብቃል።'}
            </p>

            {/* Hardware & Session Status with Dynamic Color-Coded Icons */}
            <div className="space-y-1.5 pt-1 text-[11px] font-mono">
              {/* Hardware Support */}
              <div
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-colors ${
                  biometricSupported
                    ? 'bg-slate-900 border-slate-800/80 text-slate-300'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}
              >
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span>📱</span>
                  <span>Meeshaa (Hardware):</span>
                </span>
                <span className={`font-bold flex items-center gap-1 ${biometricSupported ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span>{biometricSupported ? '🟢' : '🟡'}</span>
                  <span>{biometricSupported ? '✓ Supported' : '✕ Not Supported'}</span>
                </span>
              </div>

              {/* Session State */}
              <div className="flex items-center justify-between text-slate-400 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <span>🔓</span>
                  <span>Haala Seensa:</span>
                </span>
                <span className={`font-bold flex items-center gap-1 ${isSessionUnlocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span>{isSessionUnlocked ? '🟢' : '🟡'}</span>
                  <span>{isSessionUnlocked ? 'Unlocked (Active)' : 'Locked (Inactive)'}</span>
                </span>
              </div>

              {/* Sensor Protocol */}
              <div className="flex items-center justify-between text-slate-400 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <span>⚙️</span>
                  <span>Sensor Protocol:</span>
                </span>
                <span className={`font-bold capitalize flex items-center gap-1 ${settings.biometricMethod ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span>{settings.biometricMethod ? '🟢' : '🟡'}</span>
                  <span>{settings.biometricMethod || 'Passkey / PIN Ready'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action / Toggle Area */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            {/* Dedicated 'Biometric Authentication' Toggle Switch */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>{isWebAuthnActive ? '🟢' : '🟡'}</span>
                    <span>
                      {currentLang === 'om'
                        ? 'Biometric Authentication'
                        : currentLang === 'am'
                        ? 'የባዮሜትሪክ ማረጋገጫ (Biometric Authentication)'
                        : 'Biometric Authentication'}
                    </span>
                  </span>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {currentLang === 'om'
                      ? "Sensor asxaa qubaa/FaceID meeshaa keessanii walitti hidhuun seensota cufaman battalatti bani."
                      : currentLang === 'am'
                      ? "የመሳሪያዎትን የጣት አሻራ/FaceID በማገናኘት የተቆለፉትን ሰነዶች በፍጥነት ይክፈቱ።"
                      : "Link your device's hardware-based biometric sensor for quick unlocking of the app's locked sessions."}
                  </p>
                </div>

                {/* Accessible Interactive Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isWebAuthnActive}
                  disabled={biometricProcessing}
                  onClick={onToggleBiometric}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 ${
                    isWebAuthnActive ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                  title={isWebAuthnActive ? 'Disable Biometric Authentication' : 'Enable Biometric Authentication'}
                >
                  <span className="sr-only">Toggle Biometric Authentication</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isWebAuthnActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/80 pt-1.5">
                <span className="text-slate-400">Hardware Sensor Link:</span>
                <span className={`font-bold flex items-center gap-1 ${isWebAuthnActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span>{isWebAuthnActive ? '🟢 Linked & Active' : '🟡 Unlinked (Disabled)'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleBiometric}
                disabled={biometricProcessing}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border shadow-sm ${
                  isWebAuthnActive
                    ? 'bg-amber-950/40 hover:bg-amber-950/70 border-amber-500/40 text-amber-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                }`}
              >
                <span>{isWebAuthnActive ? '🟡' : '🟢'}</span>
                <span>
                  {biometricProcessing
                    ? 'Hojiirra jira...'
                    : isWebAuthnActive
                    ? 'Dhaamsi (Disable)'
                    : 'Bani (Enable Biometric)'}
                </span>
              </button>

              <button
                type="button"
                onClick={onTestBiometric}
                disabled={biometricProcessing || !biometricSupported}
                title="Test WebAuthn Authentication"
                className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                <span>🧪 Yaali</span>
              </button>
            </div>

            {biometricFeedback && (
              <div
                className={`p-2 rounded-lg text-[10px] font-medium border flex items-center gap-1.5 ${
                  biometricFeedback.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : biometricFeedback.type === 'error'
                    ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                    : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                }`}
              >
                <span>{biometricFeedback.type === 'success' ? '🟢' : '🟡'}</span>
                <span>{biometricFeedback.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. INACTIVITY AUTO-LOCK */}
        <div
          className={`bg-slate-950 border rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all ${
            isAutoLockActive
              ? 'border-emerald-500/40 hover:border-emerald-500/60'
              : 'border-amber-500/30 hover:border-amber-500/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {/* Dynamic Color-Coded Icon: Green for Active, Amber for Inactive */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-colors ${
                    isAutoLockActive
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm'
                      : 'bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-sm'
                  }`}
                  title={isAutoLockActive ? 'Auto-Lock is Active' : 'Auto-Lock is Inactive'}
                >
                  <span>{isAutoLockActive ? '🟢' : '🟡'}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                    <span>{isAutoLockActive ? '⏱️' : '⏳'}</span>
                    <span>Auto-Lock Timer</span>
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {isAutoLockActive ? `Timeout: ${autoLockMinutes} Minutes` : 'Timeout: Disabled'}
                  </div>
                </div>
              </div>

              {/* Dynamic Status Badge: Green for Active, Amber for Inactive */}
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${
                  isAutoLockActive
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                }`}
              >
                <span>{isAutoLockActive ? '🟢' : '🟡'}</span>
                <span>{isAutoLockActive ? `🟢 ${autoLockMinutes} min` : '🟡 Dhaamsameera (Inactive)'}</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {currentLang === 'om'
                ? 'Yeroo murtaa\'eef osoo hojii hin hojjatiin yoo ture appilikeeshinichi ofumaan cufama.'
                : 'ተጠቃሚው ለተወሰነ ደቂቃ በማይንቀሳቀስበት ጊዜ አፕሊኬሽኑን በራስ-ሰር ይቆልፋል።'}
            </p>

            {/* Quick Toggle Switch Bar with Color-Coded Indicator */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span>{isAutoLockActive ? '🟢' : '🟡'}</span>
                  <span>Ofumaan Cufi:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleAutoLock(isAutoLockActive ? 0 : 5)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isAutoLockActive
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-950 border-amber-500/50 text-amber-300'
                  }`}
                >
                  <span>{isAutoLockActive ? '🟢' : '🟡'}</span>
                  <span>{isAutoLockActive ? 'Banameera (ON)' : 'Cufameera (OFF)'}</span>
                </button>
              </div>
              <div className={`text-[10px] font-medium flex items-center gap-1.5 ${isAutoLockActive ? 'text-emerald-300' : 'text-amber-400'}`}>
                <span>{isAutoLockActive ? '🟢' : '🟡'}</span>
                <span>
                  {isAutoLockActive
                    ? `Daqiiqaa ${autoLockMinutes} hojiin malee yoo ture appiin ofumaan ni cufama.`
                    : 'Cufamuun ofumaa dhaamsameera (Inactivity lock is inactive).'}
                </span>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-between">
              <span>Yeroo Cufiinsaa Filadhaa:</span>
              <span className={`text-[10px] font-mono font-bold ${isAutoLockActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isAutoLockActive ? `🟢 ${autoLockMinutes}m Active` : '🟡 0m Inactive'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 5, 15, 30].map((mins) => {
                const isCurrent = autoLockMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleToggleAutoLock(mins)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                      isCurrent
                        ? mins > 0
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-400 font-black shadow-sm'
                          : 'bg-amber-950 text-amber-300 border-amber-400 font-black shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{mins === 0 ? (isCurrent ? '🟡' : '⚪') : (isCurrent ? '🟢' : '⚪')}</span>
                    <span>{mins === 0 ? 'Off' : `${mins}m`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. SESSION MANAGEMENT & GLOBAL CONTROLS */}
        <div
          className={`bg-slate-950 border rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all ${
            isSessionManagementActive
              ? 'border-emerald-500/40 hover:border-emerald-500/60'
              : 'border-amber-500/30 hover:border-amber-500/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {/* Dynamic Color-Coded Icon: Green for Active, Amber for Inactive */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-colors ${
                    isSessionManagementActive
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm'
                      : 'bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-sm'
                  }`}
                  title={isSessionManagementActive ? 'Session Security Active' : 'Session Security Inactive'}
                >
                  <span>{isSessionManagementActive ? '🟢' : '🟡'}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                    <span>💻</span>
                    <span>Session Security</span>
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {activeSessionCount === 1 ? 'Status: 1 Device Active' : `Status: ${activeSessionCount} Devices`}
                  </div>
                </div>
              </div>

              {/* Dynamic Status Badge: Green for Active, Amber for Inactive */}
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${
                  isSessionManagementActive
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                }`}
              >
                <span>{isSessionManagementActive ? '🟢' : '🟡'}</span>
                <span>{activeSessionCount} {activeSessionCount === 1 ? 'Session Active' : 'Sessions Active'}</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {currentLang === 'om'
                ? 'Browseroota fi meeshaalee heeyyama qaban to\'adhaa, heeyyama hunda battalatti haqaati re-auth dirqisiisaa.'
                : 'የተፈቀደላቸውን የአሰሳ መስኮቶች ይቆጣጠሩ፣ የሁሉንም ፈቃድ ሰርዘው እንደገና እንዲገቡ ያድርጉ።'}
            </p>

            {/* Session details with Dynamic Color-Coded Indicators */}
            <div className="space-y-1.5 pt-1 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-400 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <span>🌐</span>
                  <span>Session Ammaa:</span>
                </span>
                <span className="text-emerald-400 font-bold truncate max-w-[120px] flex items-center gap-1">
                  <span>🟢</span>
                  <span>{currentSessionId ? currentSessionId.slice(0, 10) + '...' : 'Verified'}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>To'annoo Guard:</span>
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span>🟢</span>
                  <span>Real-time Active</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            {!showRevokeConfirm ? (
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(true)}
                disabled={sessionActionLoading}
                className="w-full py-2 px-3 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>🟡</span>
                <span>Revoke All Sessions</span>
              </button>
            ) : (
              <div className="p-2.5 bg-amber-950/70 border border-amber-500/50 rounded-xl space-y-2">
                <p className="text-[11px] text-amber-200 font-medium flex items-center gap-1.5">
                  <span>🟡</span>
                  <span>
                    {currentLang === 'om'
                      ? 'Browseroota hunda irraa baasuu fi re-auth dirqisiisuu barbaadduu?'
                      : 'ከሁሉም አሳሾች ወጥተው እንደገና እንዲገቡ ማድረግ ይፈልጋሉ?'}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRevokeAllSessions}
                    disabled={sessionActionLoading}
                    className="flex-1 py-1 px-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    {sessionActionLoading ? 'Haqamaa...' : 'Eeyyee, Haqi'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRevokeConfirm(false)}
                    className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    Dhiisi
                  </button>
                </div>
              </div>
            )}

            {sessionFeedback && (
              <div className="p-2 rounded-lg text-[10px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-medium flex items-center gap-1.5">
                <span>🟢</span>
                <span>{sessionFeedback}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
