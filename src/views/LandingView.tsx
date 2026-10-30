import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { SeeraAILogo } from '../components/SeeraAILogo';
import { isOwnerEmail, isOwnerUsername, isOwnerKey } from '../services/ownerAuth';
import { applyAppUpdate, AppUpdateInfo } from '../services/appUpdateService';
import ethiopianJusticeLadyBg from '../assets/images/legal_lady_justice_1791027652497.jpg';

import { getAppBaseUrl } from '../services/shareUrl';

interface LandingViewProps {
  currentLang: Language;
  onJoinMeetingDirectly?: (roomId?: string, topic?: string) => void;
  onForceUpdate?: () => void;
  appUpdateInfo?: AppUpdateInfo | null;
}

export const LandingView: React.FC<LandingViewProps> = ({ currentLang, onJoinMeetingDirectly, onForceUpdate, appUpdateInfo }) => {
  const { signIn, signInByEmailOnly, signInWithBiometrics, signInWithEmail, signUpWithEmail, sendVerificationEmail, lastSentVerificationLink, resetPassword } = useAuth();
  // ... existing states ...
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
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [ownerPinError, setOwnerPinError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);

  const handleLogoClick = () => {
    // Simplified trigger
    setShowOwnerPinModal(true);
  };

  const handleVerifyOwnerPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerPinError(null);
    if (!isOwnerKey(ownerPinInput.trim())) {
        setOwnerPinError('Invalid PIN');
        return;
    }
    const emailToUse = isOwnerEmail(usernameOrEmail.trim()) ? usernameOrEmail.trim() : 'ayeledha@saiethio.com';
    await signInByEmailOnly(emailToUse, 'Ayele Be Dha', true);
    setShowOwnerPinModal(false);
  };

  const handleBiometricSignIn = async () => {
    setError(null);
    setLoading(true);
    await signInWithBiometrics(usernameOrEmail.trim() || undefined);
    setLoading(false);
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

    const isOwnerTarget = isOwnerEmail(usernameOrEmail) || isOwnerUsername(usernameOrEmail);

    if (isOwnerTarget && authMode === 'login') {
      setShowOwnerPinModal(true);
      setLoading(false);
      return;
    }

    try {
      if (authMethod === 'password') {
        if (authMode === 'register') await signUpWithEmail(usernameOrEmail, password, fullName);
        else await signInWithEmail(usernameOrEmail, password);
      } else {
        if (authMode === 'register') await sendVerificationEmail(usernameOrEmail, fullName);
        else await signInByEmailOnly(usernameOrEmail); // Corrected method name
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. If you are the app owner, please click the logo above to unlock with your PIN. Otherwise, please wait a few minutes.';
      } else if (err.message.includes('kan abbaa appiiti')) {
        message = 'This email belongs to the app owner. Please click the SAI Ethio logo above and use your PIN to log in.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
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
    setLoading(true);
    try {
      const randomGuestId = Math.random().toString(36).substring(2, 7);
      const guestEmail = `keessummaa_${randomGuestId}@guest.seeraai.et`;
      const guestName = currentLang === 'om' ? 'Keessummaa Seeraa' : currentLang === 'am' ? 'የሕግ እንግዳ' : 'Legal Guest';
      await signInByEmailOnly(guestEmail, guestName, false);
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

        {/* Brand & Emblem Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <SeeraAILogo 
            size="xl" 
            currentLang={currentLang} 
            onClick={handleLogoClick}
            className="mb-2"
          />

          <h1 className="text-xl sm:text-2xl font-bold text-amber-400 tracking-tight font-serif">
            {courtContext ? getCourtNameFromLink(courtContext) : 'Aye Harmee Ayee Be'}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="text-xs text-slate-300 font-medium">
              {courtContext 
                ? (currentLang === 'om' ? 'Baga nagaan gara karra dijitaalaa mana murtii dhuftan' : 'እንኳን ወደ ዲጂታል የፍርድ ቤት በር በደህና መጡ')
                : 'Kuni link marsariitii hubannoo seeraa Ayyalaadha'}
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
              href="https://t.me/saiorethio1"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600/25 to-blue-600/25 hover:from-sky-600/45 hover:to-blue-600/45 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <span>✈️</span>
              <span>Chaanala Telegram Master Archive (@saiorethio1)</span>
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

        {/* 1-CLICK INSTANT GUEST ACCESS (Fastest Path for Link Visitors) */}
        <div className="bg-gradient-to-br from-amber-500/15 via-slate-800 to-slate-900 border border-amber-500/40 rounded-2xl p-4 text-center space-y-2">
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
          >
            <span>⚡</span>
            <span>
              {loading 
                ? (currentLang === 'om' ? 'Seenaa jira...' : 'በመግባት ላይ...') 
                : (currentLang === 'om' ? 'Akka Keessummaatti Battalatti Seeni' : currentLang === 'am' ? 'እንደ እንግዳ አሁን ይግቡ' : 'Continue Instantly as Legal Guest')}
            </span>
          </button>
          <p className="text-[10px] text-slate-400">
            🔒 Iccitiin dhuunfaa 100% eegamaadha. Galmeewwan keessan namoonni biroo gonkumaa hin argan.
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-700 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase font-mono tracking-wider">
            Yookaan Akkaawuntiin
          </span>
          <div className="border-t border-slate-700 w-full" />
        </div>

        {/* Traditional Auth Form (Email / Password / Reset) */}
        {isResettingPassword ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-slate-300">Enter your email to receive a password reset link.</p>
            <input 
              type="text" 
              value={usernameOrEmail} 
              onChange={(e) => setUsernameOrEmail(e.target.value)} 
              placeholder="Email" 
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500" 
            />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
            >
              Send Reset Email
            </button>
            <button 
              type="button" 
              onClick={() => setIsResettingPassword(false)} 
              className="text-xs text-amber-400 hover:underline block text-center w-full"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input 
              type="text" 
              name="email" 
              autoComplete="email" 
              value={usernameOrEmail} 
              onChange={(e) => setUsernameOrEmail(e.target.value)} 
              placeholder="Imeelii / Email" 
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500" 
            />
            
            {authMode === 'register' && (
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Maqaa Guutuu / Full Name" 
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500" 
              />
            )}

            {authMethod === 'password' && (
              <input 
                type="password" 
                name="password" 
                autoComplete="current-password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Jecha Iccitii / Password" 
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500" 
              />
            )}
            
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={authMethod === 'passwordless'} 
                  onChange={() => setAuthMethod(authMethod === 'password' ? 'passwordless' : 'password')}
                  id="passwordless-mode"
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span>Email-only Mode</span>
              </label>

              <button 
                type="button" 
                onClick={() => setIsResettingPassword(true)} 
                className="text-amber-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-xs transition-colors"
            >
              {loading ? 'Processing...' : (authMode === 'login' ? 'Seeni / Login' : 'Galmaa\'i / Register')}
            </button>

            <div className="text-center pt-1">
              <button 
                type="button" 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} 
                className="text-xs text-slate-400 hover:text-amber-300 transition-colors"
              >
                {authMode === 'login' ? 'Akkaawuntii hin qabduu? Galmaa\'aa (Register)' : 'Akkaawuntii qabduu? Seenaa (Login)'}
              </button>
            </div>
          </form>
        )}

        {/* Owner PIN Modal */}
        {showOwnerPinModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleVerifyOwnerPin} className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-amber-400 text-center">Abbaa Appichaa (Owner Access)</h3>
              <p className="text-xs text-slate-400 text-center">PIN keessan galchuun mirkaneessaa.</p>
              <input 
                type="password" 
                value={ownerPinInput} 
                onChange={(e) => setOwnerPinInput(e.target.value)} 
                placeholder="Owner Security PIN" 
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-center tracking-widest text-lg focus:outline-none focus:border-amber-500" 
                autoFocus
              />
              {ownerPinError && <p className="text-xs text-red-400 text-center">{ownerPinError}</p>}
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowOwnerPinModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md hover:bg-amber-400"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
