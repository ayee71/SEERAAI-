import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { SeeraAILogo } from '../components/SeeraAILogo';
import { isOwnerEmail, isOwnerUsername, isOwnerKey, isOwnerPassword, verifyAndUnlockOwner, setCustomOwnerPin, setCustomOwnerPassword } from '../services/ownerAuth';
import { applyAppUpdate, AppUpdateInfo } from '../services/appUpdateService';
import ethiopianJusticeLadyBg from '../assets/images/legal_lady_justice_1791027652497.jpg';
import { getAppBaseUrl } from '../services/shareUrl';
import { Share2, Info, X, Copy, Check, ExternalLink, ShieldCheck, Mail, User, Globe, Sparkles, Send, Phone, Scale, Loader2, ArrowRight, Lock, Fingerprint, KeyRound } from 'lucide-react';
import { isBiometricAvailable, getBiometricEnrollmentStatus } from '../utils/biometric';
import { QRCodeSVG } from 'qrcode.react';

interface LandingViewProps {
  currentLang: Language;
  onJoinMeetingDirectly?: (roomId?: string, topic?: string) => void;
  onForceUpdate?: () => void;
  appUpdateInfo?: AppUpdateInfo | null;
}

export const LandingView: React.FC<LandingViewProps> = ({ currentLang, onJoinMeetingDirectly, onForceUpdate, appUpdateInfo }) => {
  const {
    user,
    authClaims,
    signIn,
    signInAsGuest,
    sendEmailSignInLink,
    completeEmailLinkSignIn,
    pendingEmailLinkUrl,
    signInWithBiometrics,
    enrollBiometrics,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    isolationLockdown,
    retryIsolationRecovery,
  } = useAuth();
  const isAccountSwitchLocked = Boolean(isolationLockdown?.active);
  
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<'password' | 'passwordless'>('password');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [ownerPinError, setOwnerPinError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [shortcutToast, setShortcutToast] = useState<{ message: string; emoji: string } | null>(null);

  // Biometric WebAuthn state for judges and court staff
  const [biometricRole, setBiometricRole] = useState<'judge' | 'registrar' | 'prosecutor' | 'advocate'>('judge');
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricFeedback, setBiometricFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(true);

  // Owner custom credentials configuration state
  const [ownerModalTab, setOwnerModalTab] = useState<'unlock' | 'change_creds'>('unlock');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [newOwnerPin, setNewOwnerPin] = useState('');
  const [ownerCredsSuccess, setOwnerCredsSuccess] = useState<string | null>(null);

  useEffect(() => {
    isBiometricAvailable().then((avail) => setHasBiometrics(avail));
  }, []);

  const showShortcutFeedback = (message: string, emoji = '⚡') => {
    setShortcutToast({ message, emoji });
    setTimeout(() => setShortcutToast(null), 2800);
  };

  const handleLogoClick = () => {
    // Disabled per user request: Tapping logo no longer opens Master Control modal
  };

  const handleBiometricLogin = async (selectedRole?: 'judge' | 'registrar' | 'prosecutor' | 'advocate') => {
    setError(null);
    setBiometricFeedback(null);
    setBiometricScanning(true);
    const targetRole = selectedRole || biometricRole;

    try {
      const emailToUse = usernameOrEmail.trim() || `${targetRole}@court.oromia.et`;
      const res = await signInWithBiometrics(emailToUse, targetRole, courtContext || 'gurbicha');
      if (res.success) {
        setBiometricFeedback({
          type: 'success',
          message: currentLang === 'om' ? '✓ WebAuthn Mirkanaa\'eera! Seenaa jira...' : '✓ WebAuthn Verified! Entering dashboard...',
        });
      } else {
        setBiometricFeedback({
          type: 'info',
          message: res.error || (currentLang === 'om' ? 'WebAuthn sensor qubaa eegaa jira. Irra deebi\'aa yaalaa.' : 'WebAuthn authenticator canceled. Try again.'),
        });
      }
    } catch (err: any) {
      console.warn('Biometric login note:', err);
      setBiometricFeedback({
        type: 'info',
        message: err?.message || 'Biometric authentication was canceled.',
      });
    } finally {
      setBiometricScanning(false);
    }
  };

  const handleEnrollNewPasskey = async () => {
    const emailToUse = usernameOrEmail.trim() || `${biometricRole}@court.oromia.et`;
    const roleTitles: Record<string, string> = {
      judge: 'Abbaa Seeraa',
      registrar: 'Qindeessaa Dhaddachaa',
      prosecutor: 'Abbaa Alangaa',
      advocate: 'Abukaattoo Seeraa',
    };
    setBiometricScanning(true);
    try {
      const res = await enrollBiometrics(emailToUse, roleTitles[biometricRole]);
      if (res.success) {
        setBiometricFeedback({
          type: 'success',
          message: currentLang === 'om' ? '✓ Passkey meeshaa kanaan milkaa\'inaan galmaa\'eera!' : '✓ Passkey enrolled successfully on this device!',
        });
        setTimeout(() => handleBiometricLogin(), 800);
      } else {
        setBiometricFeedback({
          type: 'info',
          message: res.error || 'Passkey enrollment was canceled.',
        });
      }
    } catch (e: any) {
      setBiometricFeedback({
        type: 'info',
        message: e?.message || 'Passkey enrollment failed.',
      });
    } finally {
      setBiometricScanning(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn();
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError(currentLang === 'om' ? 'Popup Google cufameera. Maaloo irra deebisaa yaalaa.' : 'Google popup closed. Please try again.');
      } else {
        setError(err?.message || (currentLang === 'om' ? "Google'n seenuun hin milkoofne." : 'Failed to sign in with Google.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim()) {
      setError('Please enter your email to reset password.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await resetPassword(usernameOrEmail.trim());
      setSuccessMsg('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err?.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (pendingEmailLinkUrl) {
        if (!usernameOrEmail.trim() || !usernameOrEmail.includes('@')) {
          throw new Error(
            currentLang === 'om'
              ? 'Seensa Email Link xumuruuf maaloo imeelii keessan mirkaneessaa.'
              : 'Please enter your email address to complete Email Link sign-in.'
          );
        }
        const completed = await completeEmailLinkSignIn(usernameOrEmail.trim());
        if (!completed) {
          throw new Error('Could not verify this sign-in link for the provided email.');
        }
        setSuccessMsg(
          currentLang === 'om'
            ? 'Email Link mirkanaa’eera! Seenaa jirtu...'
            : 'Email Link verified! Signing you in...'
        );
        return;
      }

      if (authMode === 'login') {
        if (authMethod === 'password') {
          await signInWithEmail(usernameOrEmail, password);
        } else {
          await sendEmailSignInLink(usernameOrEmail);
          setSuccessMsg(
            currentLang === 'om'
              ? `Linkiin seensaa dhugaa gara ${usernameOrEmail.trim()} ergameera. Maaloo inbox/spam keessan banaatii linkicha cuqaasaa.`
              : `A Firebase sign-in link has been sent to ${usernameOrEmail.trim()}. Open the link in your email to finish signing in.`
          );
        }
      } else {
        if (!fullName.trim() || !usernameOrEmail.trim()) {
          throw new Error('Maaloo Maqaa fi Imeelii guutaa.');
        }
        if (password.length < 6) {
          throw new Error('Password yoo xiqqaate harfoota 6 ta\'uu qaba.');
        }
        await signUpWithEmail(usernameOrEmail, password, fullName);
        setSuccessMsg(
          currentLang === 'om'
            ? 'Akkaawuntiin Firebase uumameera! Tajaajila dhuunfaa fi mana murtii banachuuf linkii mirkaneessaa (verification email) inbox keessan keessaa mirkaneessaa.'
            : 'Firebase account created! Please verify your email address via the verification link sent to your inbox before accessing protected features.'
        );
      }
    } catch (err: any) {
      console.warn('Auth attempt error:', err);
      let message = currentLang === 'om' 
        ? 'Imeelii ykn password dogoggora. Maaloo irra deebisaa yaalaa.' 
        : currentLang === 'am'
        ? 'የተሳሳተ ኢሜይል ወይም የይለፍ ቃል። እባክዎ እንደገና ይሞክሩ።'
        : 'Invalid credentials. Please verify your email and password and try again.';
      if (err?.code === 'auth/too-many-requests') {
        message = currentLang === 'om' 
          ? 'Yaalii hedduu... Maaloo daqiiqaa muraasa eegaa irra deebisaa yaalaa.'
          : 'Too many attempts. Please wait a few moments and try again.';
      } else if (err?.code === 'auth/operation-not-allowed') {
        message = currentLang === 'om'
          ? 'Seensi Firebase kun (Email Link / Email-Password) Firebase Console keessatti hin banamne. Maaloo Admin qunnamaa ykn Google Sign-In fayyadamaa.'
          : 'This sign-in method is not yet enabled in Firebase Console Authentication settings. Please contact the administrator or use Google Sign-In.';
      } else if (err?.message && !err.message.includes('abbaa') && !err.message.includes('owner') && !err.message.includes('PIN')) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerPinSubmit = async () => {
    if (!ownerPinInput.trim()) return;

    if (Date.now() < lockoutUntil) {
      const remaining = Math.round((lockoutUntil - Date.now()) / 1000);
      setOwnerPinError(`Garmalee yaaltan. Daqiiqaa ${remaining} eegaa.`);
      return;
    }

    // Security Mandate (Phase 8B.6.8): PIN alone NEVER establishes an authenticated or admin session.
    if (!user || user.isAnonymous || !authClaims.isTrustedAdmin) {
      setOwnerPinError(
        currentLang === 'om'
          ? 'Tajaajilli Abbaa Appichaa (Admin) authentication Firebase dhugaa (email verified + server custom claims) barbaada. PIN qofti akkaawuntii hin banu.'
          : 'Owner access requires a genuine verified Firebase session with server-issued superadmin custom claims. A local PIN cannot create a session.'
      );
      return;
    }

    setLoading(true);
    setOwnerPinError(null);

    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      if (await verifyAndUnlockOwner(ownerPinInput)) {
        setFailedAttempts(0);
        setOwnerPinInput('');
        setShowOwnerPinModal(false);
        showShortcutFeedback('Verified SuperAdmin Secondary Check Complete', '👑');
      } else {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        setOwnerPinInput('');

        if (nextFailed >= 3) {
          const lockTime = Date.now() + 60000 * 5;
          setLockoutUntil(lockTime);
          setOwnerPinError('Yaalii hedduu... Daqiiqaa 5\'f cufameera.');
        } else {
          setOwnerPinError(`Koodiin galchitan sirrii miti. (${3 - nextFailed} yaalii hafe)`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomCredentials = async () => {
    if (!newOwnerPin.trim() && !newOwnerPassword.trim()) {
      setOwnerPinError('Maaloo PIN ykn Password haaraa galchaa.');
      return;
    }
    setLoading(true);
    setOwnerPinError(null);
    try {
      if (newOwnerPin.trim()) {
        await setCustomOwnerPin(newOwnerPin.trim());
      }
      if (newOwnerPassword.trim()) {
        await setCustomOwnerPassword(newOwnerPassword.trim());
      }
      setOwnerCredsSuccess('Koodiin iccitii haaraan milkaa\'inaan jijjiirameera!');
      setTimeout(() => {
        setOwnerCredsSuccess(null);
        setShowOwnerPinModal(false);
        setNewOwnerPin('');
        setNewOwnerPassword('');
      }, 1400);
    } catch (e: any) {
      setOwnerPinError('Credentials update failed: ' + (e?.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const [referrer] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('by') || params.get('ref') || null;
    }
    return null;
  });

  const [courtContext] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('courtLink') || params.get('court') || null;
    }
    return null;
  });

  const [meetingUrlParam] = useState<{ room: string; topic: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const room = p.get('room') || p.get('meeting') || p.get('meet') || p.get('dhaddacha') || p.get('walgahii') || p.get('conference') || p.get('call');
      const topic = p.get('topic') || '';
      if (room) return { room, topic };
    }
    return null;
  });

  const [showMeetingJoinForm, setShowMeetingJoinForm] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState('');

  const handleGuestLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const guestName =
        currentLang === 'om'
          ? 'Keessummaa Seeraa (Guest Access)'
          : currentLang === 'am'
          ? 'የሕግ እንግዳ (Guest Access)'
          : 'Legal Guest (Guest Access Only)';
      await signInAsGuest(guestName, 'guest');
    } catch (err: any) {
      console.error('Guest access failed:', err);
      setError(err?.message || 'Guest access failed');
    } finally {
      setLoading(false);
    }
  };

  const getCourtNameFromLink = (link: string) => {
    if (link.includes('gurbicha')) return 'Mana Murtii Aanaa Gurbicha';
    if (link.includes('adama')) return 'Mana Murtii Aanaa Adaamaa';
    return 'Mana Murtii Kabajamaa';
  };

  const [copySuccess, setCopySuccess] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const currentAppUrl = getAppBaseUrl();

  const getDeviceType = () => {
    if (typeof navigator === 'undefined') return 'Desktop';
    if (/Mobi|Android/i.test(navigator.userAgent)) return 'Mobile';
    if (/iPad|Tablet/i.test(navigator.userAgent)) return 'Tablet';
    return 'Desktop';
  };

  const getBrowserName = () => {
    if (typeof navigator === 'undefined') return 'Chrome';
    const ua = navigator.userAgent;
    if (/Edg/i.test(ua)) return 'Edge';
    if (/Chrome/i.test(ua)) return 'Chrome';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Firefox/i.test(ua)) return 'Firefox';
    return 'Other';
  };

  const recordShareEvent = (channel: string) => {
    try {
      const defaultShareEvents = [
        { id: 'sh_1', channel: 'WhatsApp', device: 'Mobile', browser: 'Chrome', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'sh_2', channel: 'Telegram', device: 'Mobile', browser: 'Chrome', timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id: 'sh_3', channel: 'Copy Link', device: 'Desktop', browser: 'Edge', timestamp: new Date(Date.now() - 14400000).toISOString() },
        { id: 'sh_4', channel: 'Native Share', device: 'Mobile', browser: 'Safari', timestamp: new Date(Date.now() - 28800000).toISOString() },
      ];
      const existing = JSON.parse(localStorage.getItem('seera_share_events') || JSON.stringify(defaultShareEvents));
      existing.push({
        id: 'sh_' + Math.random().toString(36).substring(2, 7),
        channel,
        device: getDeviceType(),
        browser: getBrowserName(),
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('seera_share_events', JSON.stringify(existing));
    } catch {}
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentAppUrl).then(() => {
      setCopySuccess(true);
      recordShareEvent('Copy Link');
      setShareToast('Link copied to clipboard successfully!');
      setTimeout(() => {
        setCopySuccess(false);
        setShareToast(null);
      }, 3000);
    }).catch(() => {});
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'SeeraAI - Legal Intelligence & Court System',
      text: 'SeeraAI - Sirna Qorannoo Seeraa, Gorsaa & Hooggansa Mana Murtii Oromiyaa & Federaalaa',
      url: currentAppUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        recordShareEvent('Native Share');
        setShareToast('App shared successfully via device share!');
        setTimeout(() => setShareToast(null), 3000);
      } catch (err) {}
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`SeeraAI - Sirna Qorannoo Seeraa fi Gorsaa: ${currentAppUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    recordShareEvent('WhatsApp');
    setShareToast('Opened WhatsApp to share SeeraAI!');
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(`SeeraAI - Sirna Qorannoo Seeraa fi Gorsaa: ${currentAppUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(currentAppUrl)}&text=${text}`, '_blank');
    recordShareEvent('Telegram');
    setShareToast('Opened Telegram to share SeeraAI!');
    setTimeout(() => setShareToast(null), 3000);
  };

  return (
    <div className="landing-wrapper min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 space-y-6 relative overflow-hidden">
        {/* Top Gold Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600 animate-pulse" />

        {/* Top-Right Share Icon Button */}
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          aria-label="Share page"
          title="Share SeeraAI Page URL"
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-950/80 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center group"
        >
          <Share2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>

        {/* Brand & Emblem Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <SeeraAILogo 
            size="xl" 
            currentLang={currentLang} 
            onClick={handleLogoClick}
            courtId={courtContext || undefined}
            className="mb-2"
          />

          <h1 className="text-xl sm:text-2xl font-bold text-amber-400 tracking-tight font-serif">
            {courtContext ? getCourtNameFromLink(courtContext) : 'SEERAAI - Sirna Hoogganaa Galmee fi Qorannoo Seeraa Mana Murtii'}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="text-xs text-slate-300 font-medium">
              {courtContext 
                ? (currentLang === 'om' ? 'Baga nagaan gara karra dijitaalaa mana murtii dhuftan' : 'እንኳን ወደ ዲጂታል የፍርድ ቤት በር በደህና መጡ')
                : 'SEERAAI - App shakalli hojii mana murtii AI walitti hidhuuf hojjatamuudha'}
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95 shadow-sm"
              title="Copy to Clipboard"
            >
              <span>📋</span>
              <span>{copySuccess ? '✓ Copied to Clipboard!' : 'Copy to Clipboard'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono">
              <span>🛡️</span>
              <span>SeeraAI v4.1.0 • {courtContext ? 'Court Portal' : 'Afaan-Sadee (Oromoo • አማርኛ • EN)'}</span>
            </div>

            <button
              type="button"
              onClick={async () => {
                setShareToast('Kuusaa haaromsaa jira... (Updating to v4.1.0...)');
                if (onForceUpdate) {
                  onForceUpdate();
                } else {
                  await applyAppUpdate();
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] text-emerald-300 font-bold cursor-pointer transition-all active:scale-95 shadow-sm"
              title="Haaromsa Appii (Sync & Force Refresh to Latest Version)"
            >
              <span className="animate-spin text-xs">🔄</span>
              <span>Haaromsa (Sync v4.1.0)</span>
            </button>
          </div>

          <div className="w-full bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-2.5 text-center text-[11px] text-emerald-300 font-medium flex items-center justify-center gap-1.5 shadow-sm mt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>🔒 Iccitii Eegamu: Galmeewwan fi mariin keessan 100% session-isolated & encrypted dha.</span>
          </div>

          {/* URL Display with Copy & Share Menu */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2.5 w-full mt-2">
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-amber-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 truncate">
              <span className="truncate">{currentAppUrl}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0 cursor-pointer transition-all"
              >
                {copySuccess ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95"
                title="Share via device options (WhatsApp, Telegram, etc.)"
              >
                <span>🔗</span>
                <span>Share Menu (Web Share API)</span>
              </button>
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="py-2 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/55 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="Share via WhatsApp"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleTelegramShare}
                className="py-2 px-3 rounded-xl bg-sky-600/30 hover:bg-sky-600/55 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="Share via Telegram"
              >
                <span>✈️</span>
                <span>Telegram</span>
              </button>
            </div>

            <a
              href="https://t.me/seeraai_ethio"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600/25 to-blue-600/25 hover:from-sky-600/45 hover:to-blue-600/45 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <span>✈️</span>
              <span>Chaanala Telegram Official Archive (@seeraai_ethio)</span>
            </a>
          </div>

          {shareToast && (
            <div className="w-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg animate-in fade-in duration-200 mt-2">
              <span>✨</span>
              <span>{shareToast}</span>
            </div>
          )}
        </div>

        {/* Shared Referral Banner if ?by=Ayele */}
        {referrer && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center space-y-1">
            <div className="text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
              <span>✨</span>
              <span>{referrer}-tiini Afeeramte (Invited Link)</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Qabiyyee seeraa, xiinxala galmee fi tajaajila addaa fayyadamuuf battalatti seenuu dandeessu.
            </p>
          </div>
        )}

        {/* ISOLATION LOCKDOWN BANNER (Prevents new login when prior session cleanup failed/blocked) */}
        {isAccountSwitchLocked && (
          <div className="bg-rose-950/80 border-2 border-rose-500 rounded-2xl p-4 space-y-3 text-left shadow-xl">
            <div className="flex items-center gap-2 text-rose-300 font-black text-xs uppercase">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Shared-Device Isolation Lockdown Active</span>
            </div>
            <p className="text-[11px] text-rose-100 leading-relaxed">
              {isolationLockdown?.details ||
                'Previous account cleanup did not complete safely. Account switching and new sign-ins are blocked until cleanup finishes.'}
            </p>
            <div className="text-[10px] font-mono text-rose-300 bg-slate-950/70 rounded-xl p-2">
              Step: {isolationLockdown?.failedStep} • Reason: {isolationLockdown?.reason}
            </div>
            <button
              type="button"
              onClick={() => retryIsolationRecovery()}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase cursor-pointer shadow"
            >
              Retry Cleanup & Unlock Device
            </button>
          </div>
        )}

        {/* Court Specific Welcome if opened via courtLink */}
        {courtContext && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-center space-y-3">
             <div className="text-sm font-bold text-amber-400">
                🏛️ {getCourtNameFromLink(courtContext)}
             </div>
             <p className="text-[11px] text-slate-300">
                Seerota, murtiiwwan dhaddacha ijibbaataa, fi tajaajila galmee mana murtii kanaa argachuuf asirratti galmaa'aa ykn imeelii fi password keessan fayyadamaa.
             </p>
          </div>
        )}

        {/* Direct Meeting Invite Banner if opened via room/meeting link */}
        {meetingUrlParam && (
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-500 rounded-2xl p-4 text-center space-y-2 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <span>📹</span>
              <span>Afeerraa Walgahii Seeraa (Meeting Invite)</span>
            </div>
            <p className="text-xs text-slate-200">
              Iddoo Walgahii: <span className="font-mono text-amber-300 font-bold">{meetingUrlParam.room}</span>
              {meetingUrlParam.topic && <span className="block text-[11px] text-slate-400">"{meetingUrlParam.topic}"</span>}
            </p>
            <button
              type="button"
              onClick={() => {
                if (onJoinMeetingDirectly) {
                  onJoinMeetingDirectly(meetingUrlParam.room, meetingUrlParam.topic);
                } else {
                  handleGuestLogin();
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/30 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              🚀 {currentLang === 'om' ? 'Kallattiin Walgahii Seeni (Chrome / Edge)' : currentLang === 'am' ? 'በቀጥታ ስብሰባውን ተቀላቀል' : 'Join Meeting Directly (Chrome / Edge)'}
            </button>
            <p className="text-[10px] text-slate-400">
              ✓ App buusuun ykn password hin barbaachisu • Browser kamiinuu kallattiin seenama
            </p>
          </div>
        )}

        {/* BROWSER DIRECT MEETING LAUNCHER (For anyone entering meeting via link or room code) */}
        <div className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3 text-center space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>📹</span>
              <span>
                {currentLang === 'om' ? 'Iddoo Walgahii Seeraa (Meeting)' : currentLang === 'am' ? 'የሕግ ስብሰባ ክፍል' : 'Direct Browser Meeting'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowMeetingJoinForm(!showMeetingJoinForm)}
              className="text-[11px] text-amber-400 font-bold hover:underline cursor-pointer"
            >
              {showMeetingJoinForm ? 'Cufi' : '+ Seen / Join'}
            </button>
          </div>

          {showMeetingJoinForm && (
            <div className="pt-2 space-y-2 border-t border-slate-800 text-left animate-in fade-in duration-150">
              <label className="text-[10px] font-mono text-slate-400 block">
                {currentLang === 'om' ? 'Lakk. ykn Maqaa Room Walgahii' : currentLang === 'am' ? 'የስብሰባ ክፍል ስም' : 'Meeting Room ID'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value)}
                  placeholder="seera-collab-room-01"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const targetRoom = customRoomInput.trim() || 'seera-collab-room-01';
                    if (onJoinMeetingDirectly) {
                      onJoinMeetingDirectly(targetRoom, 'Marii Seeraa');
                    } else {
                      window.location.href = `/?room=${encodeURIComponent(targetRoom)}&tab=meeting`;
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow"
                >
                  {currentLang === 'om' ? 'Seeni' : currentLang === 'am' ? 'ግባ' : 'Enter'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1-CLICK GUEST ACCESS (Public Content & Practice Features Only) */}
        <div className="bg-gradient-to-br from-amber-500/15 via-slate-800 to-slate-900 border border-amber-500/40 rounded-2xl p-4 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-amber-500/30 text-[10px] font-mono text-amber-300">
            <span>👤</span>
            <span>
              {currentLang === 'om'
                ? 'Haala Keessummaa Qofa (Guest Access Only)'
                : currentLang === 'am'
                ? 'የእንግዳ መዳረሻ ብቻ (Guest Access Only)'
                : 'Guest Access Only • Public & Practice Features'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading || isAccountSwitchLocked}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
          >
            <span>⚡</span>
            <span>
              {loading 
                ? (currentLang === 'om' ? 'Seenaa jira...' : 'በመግባት ላይ...') 
                : (currentLang === 'om' ? 'Akka Keessummaatti Seeni (Guest Mode)' : currentLang === 'am' ? 'እንደ እንግዳ ይግቡ (Guest Mode)' : 'Continue as Guest (Public & Practice Only)')}
            </span>
          </button>
          <p className="text-[10px] text-slate-400">
            {currentLang === 'om'
              ? '🔓 Qabiyyee uummataa fi shaakalaaf banaadha. Sanadoota dhuunfaa, mana murtii fi tajaajila admin hin kennu.'
              : 'Public statutes, archive & guest practice only. Private, court, and admin data require verified authentication.'}
          </p>
        </div>



        {/* GOOGLE SIGN IN BUTTON */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || isAccountSwitchLocked}
          className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-98 disabled:opacity-50 border border-slate-200"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>
            {currentLang === 'om' ? 'Google waliin Seeni (Sign in with Google)' : currentLang === 'am' ? 'በ Google ይግቡ (Sign in with Google)' : 'Sign in with Google'}
          </span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-700 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase font-mono tracking-wider">
            Yookaan Akkaawuntiin
          </span>
          <div className="border-t border-slate-700 w-full" />
        </div>

        {/* Traditional Auth Form (Email / Password / Reset) */}
        {isResettingPassword ? (
          <form onSubmit={handlePasswordReset} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-xs text-slate-300">Imeelii keessan galchuun koodii haaromsa password argadhaa.</p>
            <input 
              type="text" 
              value={usernameOrEmail} 
              onChange={(e) => setUsernameOrEmail(e.target.value)} 
              placeholder="Email" 
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner" 
            />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors cursor-pointer"
            >
              Koodii Ergi / Send Reset Email
            </button>
            <button 
              type="button" 
              onClick={() => setIsResettingPassword(false)} 
              className="text-xs text-amber-400 hover:underline block text-center w-full font-bold"
            >
              Gara Seensatti Deebi'i / Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {pendingEmailLinkUrl && (
              <div className="bg-sky-500/15 border border-sky-500/40 rounded-2xl p-3 text-xs text-sky-200">
                Linkiin seensaa argameera. Xumuruuf maaloo imeelii keessan gadiitti galchuun mirkaneessaa.
              </div>
            )}

            <div className="space-y-3">
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                <input 
                  type="text" 
                  name="email" 
                  autoComplete="email" 
                  value={usernameOrEmail} 
                  onChange={(e) => setUsernameOrEmail(e.target.value)} 
                  placeholder="Imeelii / Email" 
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner" 
                />
              </div>
              {usernameOrEmail.includes('@court.oromia.et') && (
                <p className="text-[10px] text-amber-400 px-2 italic">
                  Tip: Akkaawuntii mana murtii mirkanaa’aa fi claims seeraa qabuun seenaa.
                </p>
              )}

              {authMode === 'register' && (
                <div className="relative group">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    placeholder="Maqaa Guutuu / Full Name" 
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner" 
                  />
                </div>
              )}

              {(authMode === 'register' || (authMode === 'login' && authMethod === 'password' && !pendingEmailLinkUrl)) && (
                <div className="relative group animate-in slide-in-from-right-4">
                  <ShieldCheck className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                  <input 
                    type="password" 
                    name="password" 
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder={authMode === 'register' ? "Password Haaraa Uumi (6+ char)" : "Jecha Iccitii / Password"} 
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner" 
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              {authMode === 'login' && !pendingEmailLinkUrl && (
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={authMethod === 'passwordless'} 
                    onChange={() => setAuthMethod(authMethod === 'password' ? 'passwordless' : 'password')}
                    id="passwordless-mode"
                    className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950"
                  />
                  <span>Sign in with Firebase Email Link</span>
                </label>
              )}

              {authMode === 'login' && (
                <button 
                  type="button" 
                  onClick={() => setIsResettingPassword(true)} 
                  className="text-amber-400/80 hover:text-amber-400 hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading || isAccountSwitchLocked}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <span>
                  {pendingEmailLinkUrl
                    ? 'Linkii Imeeliitiin Seensa Xumuri'
                    : authMode === 'login'
                    ? (authMethod === 'passwordless' ? 'Linkii Seensaa Ergi / Send Email Link' : 'Seeni / Login')
                    : 'Akkaawuntii Uumi / Register'}
                </span>
              )}
            </button>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }} 
                className="text-xs text-slate-400 hover:text-amber-300 transition-colors font-medium"
              >
                {authMode === 'login' 
                  ? (currentLang === 'om' ? 'Akkaawuntii hin qabduu? Asitti Galmaa\'aa' : 'Don\'t have an account? Register Here') 
                  : (currentLang === 'om' ? 'Akkaawuntii qabduu? Asitti Seenaa' : 'Already have an account? Login Here')}
              </button>
            </div>
          </form>
        )}

        {/* Practice Environment Quick Access for Guest Link Visitors */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
           <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guest Practice & Training</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
                GUEST ACCESS ONLY
              </span>
           </div>
           <button
             type="button"
             disabled={loading || isAccountSwitchLocked}
             onClick={async () => {
                if (isAccountSwitchLocked) return;
                setError(null);
                setSuccessMsg(null);
                showShortcutFeedback('Shaakala Mana Murtii (Guest Practice Mode)', '🏛️');
                try {
                  setLoading(true);
                  await signInAsGuest('Shaakala Mana Murtii Aanaa Gurbicha (Guest Practice)', 'gurbicha_practice');
                } catch (pErr: any) {
                  setError(pErr?.message || 'Guest practice sign-in blocked');
                } finally {
                  setLoading(false);
                }
             }}
             className="w-full p-4 rounded-[2rem] bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all text-left group flex items-center justify-between cursor-pointer disabled:opacity-50"
           >
              <div className="space-y-1">
                 <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                   Shaakala Mana Murtii Aanaa Gurbicha (Guest Mode)
                 </h4>
                 <p className="text-[10px] text-slate-500">
                   Guest practice only: try sample mock cases without institutional or court-staff privileges.
                 </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
           </button>
        </div>

        {/* Bottom 'About' Modal Trigger */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowAboutModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-400 hover:text-amber-300 font-medium transition-colors cursor-pointer rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-800 group"
            title="Waa'ee SeeraAI • Platform Mission & Developer Contact Information"
          >
            <Info className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>Waa'ee SeeraAI • About & Developer Info</span>
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-300 text-center">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 text-center animate-in shake duration-500">
            {error}
          </div>
        )}

        {shortcutToast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-amber-500/50 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <span className="text-lg">{shortcutToast.emoji}</span>
            <span className="text-xs font-bold text-amber-300">{shortcutToast.message}</span>
          </div>
        )}

        {/* Share Modal Dialog */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                  <Share2 className="w-5 h-5" />
                  <span>Qoodduu / Share SeeraAI</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                SeeraAI: Sirna Qorannoo Seeraa fi Gorsaa Afaan-Sadee (Oromoo • አማርኛ • English) hiriyoota fi ogeeyyii seeraatiif qoodaa.
              </p>

              {/* QR Code section */}
              <div className="flex flex-col items-center justify-center bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <QRCodeSVG
                  value={currentAppUrl}
                  size={140}
                  bgColor="#020617"
                  fgColor="#fbbf24"
                  level="H"
                  includeMargin={true}
                />
                <span className="text-[10px] text-amber-400 font-mono">Scan QR Code to Open App</span>
              </div>

              {/* Link Input & Copy */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-400">Page URL:</label>
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={currentAppUrl}
                    className="bg-transparent text-xs text-slate-200 font-mono flex-1 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copySuccess ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Share Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="py-2 px-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleTelegramShare}
                  className="py-2 px-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span>✈️</span>
                  <span>Telegram</span>
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="py-2 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>More</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* About Modal Dialog */}
        {showAboutModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto relative">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-400 tracking-tight">Waa'ee SeeraAI • About SeeraAI</h3>
                    <p className="text-xs text-slate-400">Legal Intelligence & Judicial Support System</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAboutModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Platform Mission */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Ergamaa fi Kaayyoo (Platform Mission)</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2.5 leading-relaxed">
                  <p>
                    <strong>SEERAAI</strong> Afaan Oromoo, Afaan Amaaraa fi Afaan Ingiliffaan tajaajila kennuuf kan qophaa’e sirna AI qorannoo seeraa, xiinxala galmee mana murtii, gorsa odeeffannoo seeraa fi qophii barreeffama ogummaa seeraa ti.
                  </p>
                  <p>
                    SEERAAI is an advanced Ethiopian and Oromia legal AI intelligence system designed to empower judges, legal practitioners, prosecutors, attorneys, legal researchers, and citizens with fast, accurate statutory analysis and Cassation Bench precedent reviews.
                  </p>
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-300 font-mono">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Statutory Law Accuracy</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Cassation Precedent Analysis</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Dual AI Engine (Gemini + GPT-4o)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Afaan-Sadee Trilingual Support</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Developer Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Odeeffannoo Saaxilaa (Developer Contact Information)</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Developer & Owner:</span>
                    <span className="text-amber-300 font-bold font-mono">Ayele Be Dha (SAI Ethio)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Tajaajila & Deeggarsa:</span>
                    <span className="text-amber-300 font-bold font-mono">SEERAAI Support & Intelligence</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-sky-400" />
                      Telegram Channel:
                    </span>
                    <a href="https://t.me/seeraai_ethio" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline font-mono">
                      @seeraai_ethio
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      Version & Release:
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">SeeraAI v4.1.0</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAboutModal(false)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  Cufi / Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Master Control Portal / Owner PIN Modal */}
        {showOwnerPinModal && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-[2.5rem] p-7 max-w-md w-full space-y-5 shadow-2xl relative">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-200 to-amber-600 rounded-t-[2.5rem]" />
              
              <div className="text-center space-y-1.5">
                <div className="w-14 h-14 bg-amber-500/20 border-2 border-amber-500/40 rounded-3xl flex items-center justify-center mx-auto mb-2 animate-pulse">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Master Control Portal</h3>
                <p className="text-[11px] text-slate-400">Owner Access & Private Security Settings</p>
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setOwnerModalTab('unlock');
                    setOwnerPinError(null);
                    setOwnerCredsSuccess(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    ownerModalTab === 'unlock'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🔒 Seeni (Unlock)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOwnerModalTab('change_creds');
                    setOwnerPinError(null);
                    setOwnerCredsSuccess(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    ownerModalTab === 'change_creds'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ⚙️ Koodii Haaromsuu
                </button>
              </div>

              {ownerModalTab === 'unlock' ? (
                <div className="space-y-4">
                  <p className="text-xs text-center text-slate-300">
                    PIN code ykn Password keessan galchuun tajaajila abbaa appii banii.
                  </p>
                  <div className="relative">
                    <input
                      type="password"
                      autoFocus
                      value={ownerPinInput}
                      onChange={(e) => {
                        setOwnerPinInput(e.target.value);
                        setOwnerPinError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleOwnerPinSubmit();
                      }}
                      placeholder="••••"
                      className="w-full bg-slate-950 border-2 border-slate-800 focus:border-amber-500 rounded-2xl py-3.5 px-4 text-center text-xl font-black tracking-widest text-amber-400 outline-none shadow-inner"
                    />
                    {ownerPinError && (
                      <p className="text-center text-[10px] font-bold text-rose-500 pt-1.5 animate-in shake">
                        {ownerPinError}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOwnerPinModal(false);
                        setOwnerPinInput('');
                        setOwnerPinError(null);
                      }}
                      className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Dhiisi (Cancel)
                    </button>
                    <button
                      type="button"
                      onClick={handleOwnerPinSubmit}
                      disabled={!ownerPinInput.trim() || loading}
                      className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      Mirkaneessi
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-300">
                    PIN code ykn Password dhuunfaa haaraa kan Google malee ofumaan fayyadamtan asitti qopheessaa:
                  </p>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">
                        PIN Code Haaraa (Fkn: 4-8 Digits)
                      </label>
                      <input
                        type="password"
                        value={newOwnerPin}
                        onChange={(e) => setNewOwnerPin(e.target.value)}
                        placeholder="PIN Haaraa..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-amber-300 font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">
                        Password Haaraa (Secret Password)
                      </label>
                      <input
                        type="password"
                        value={newOwnerPassword}
                        onChange={(e) => setNewOwnerPassword(e.target.value)}
                        placeholder="Password Haaraa..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-amber-300 font-mono outline-none"
                      />
                    </div>
                  </div>

                  {ownerPinError && (
                    <p className="text-center text-[10px] font-bold text-rose-500">
                      {ownerPinError}
                    </p>
                  )}

                  {ownerCredsSuccess && (
                    <p className="text-center text-[11px] font-bold text-emerald-400">
                      ✓ {ownerCredsSuccess}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setOwnerModalTab('unlock')}
                      className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      Deebi'i
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCustomCredentials}
                      disabled={loading || (!newOwnerPin.trim() && !newOwnerPassword.trim())}
                      className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow cursor-pointer disabled:opacity-50"
                    >
                      Kuusi (Save)
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-center text-slate-500 italic">
                Unauthorized access attempts are cryptographically verified and audited.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
