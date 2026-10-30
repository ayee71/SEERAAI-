import React, { useState } from 'react';
import { Language } from '../i18n/translations';
import { sendKioskLinkEmail, generateTrilingualInvitation } from '../services/emailWorker';

interface KioskQuickAccessModalProps {
  currentLang: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const KioskQuickAccessModal: React.FC<KioskQuickAccessModalProps> = ({
  currentLang,
  isOpen,
  onClose,
}) => {
  const [institutionName, setInstitutionName] = useState('Mana Murtii Waliigalaa / Supreme Court');
  const [recipientEmail, setRecipientEmail] = useState('ayeledha@gmail.com');
  const [accessCode] = useState(() => 'KSK-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const kioskUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/kiosk`
    : 'https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app/kiosk';

  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(kioskUrl)}&color=f59e0b&bgcolor=0f172a&margin=10`;

  const trilingualMessage = generateTrilingualInvitation(kioskUrl, institutionName, accessCode);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(`${label} ${currentLang === 'om' ? 'waraabbameera!' : 'ተቀድቷል!'}`);
      setTimeout(() => setCopyToast(null), 3000);
    } catch {
      setCopyToast('Copied to clipboard');
      setTimeout(() => setCopyToast(null), 3000);
    }
  };

  const handleDispatch = async (channel: 'email' | 'telegram' | 'sms' | 'facebook') => {
    setDispatchStatus(currentLang === 'om' ? 'Ergamaa jira...' : 'በመላክ ላይ...');
    if (channel === 'email') {
      try {
        await sendKioskLinkEmail(recipientEmail || 'ayeledha@gmail.com', kioskUrl, institutionName);
        setDispatchStatus(
          currentLang === 'om'
            ? `Milkaa'inaan gara ${recipientEmail} ergameera!`
            : `ወደ ${recipientEmail} በተሳካ ሁኔታ ተላክቷል!`
        );
      } catch {
        setDispatchStatus('Failed to send email');
      }
    } else {
      await navigator.clipboard.writeText(trilingualMessage);
      if (channel === 'telegram') {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(kioskUrl)}&text=${encodeURIComponent(trilingualMessage)}`, '_blank');
      } else if (channel === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(kioskUrl)}`, '_blank');
      } else if (channel === 'sms') {
        window.open(`sms:?body=${encodeURIComponent(trilingualMessage)}`, '_blank');
      }
      setDispatchStatus(`${channel.toUpperCase()} message copied & app opened!`);
    }
    setTimeout(() => setDispatchStatus(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-base cursor-pointer transition-all border border-slate-700"
        >
          ✕
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-2xl shrink-0">
            📱
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-legal text-amber-400">
              {currentLang === 'om'
                ? 'Linkii & Koodii Kiosk Dhaddacha Mana Murtii'
                : 'የፍርድ ቤት ኪዮስክ ሊንክ እና የመግቢያ ኮድ'}
            </h2>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Linkii Kiosk fi koodii isaa dhaabbata ykn mana murtii erguuf qophaa’e'
                : 'ለተቋም ወይም ለፍርድ ቤት የሚላክ የኪዮስክ ሊንክ እና መግቢያ ኮድ'}
            </p>
          </div>
        </div>

        {/* Copy Notification Toast */}
        {copyToast && (
          <div className="p-3 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-in fade-in flex items-center gap-2">
            <span>✓</span>
            <span>{copyToast}</span>
          </div>
        )}

        {/* Prominent Kiosk Link & Access Code Box */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4 shadow-inner">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider">
                Direct Courtroom Kiosk URL (Linkii Kiosk):
              </span>
              <div className="font-mono text-sm text-amber-300 font-bold bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 break-all mt-1">
                {kioskUrl}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(kioskUrl, 'Direct Link')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>📋</span>
                <span>Copy Link</span>
              </button>
              <a
                href={kioskUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer flex items-center gap-1.5"
              >
                <span>🔗</span>
                <span>Open Kiosk</span>
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Secure Session Access Code (Koodii Qunnamtii):
              </span>
              <span className="font-mono text-lg font-extrabold text-emerald-400 tracking-wider">
                {accessCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(accessCode, 'Access Code')}
              className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer"
            >
              Copy Code
            </button>
          </div>
        </div>

        {/* QR Code & Recipient Dispatch Section */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="sm:col-span-5 flex flex-col items-center text-center space-y-2">
            <div className="w-40 h-40 bg-slate-900 p-2.5 rounded-2xl border border-amber-500/30 shadow-lg flex items-center justify-center">
              <img
                src={qrCodeApiUrl}
                alt="Kiosk QR Code"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Scan with mobile camera for instant access
            </span>
          </div>

          <div className="sm:col-span-7 space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              Recipient Institution / Email Address:
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="ayeledha@gmail.com"
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
            />

            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="Institution Name (e.g. Oromia High Court)"
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDispatch('email')}
                className="py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer transition-all shadow flex items-center justify-center gap-1.5"
              >
                <span>📧</span>
                <span>Send Email</span>
              </button>

              <button
                type="button"
                onClick={() => handleDispatch('telegram')}
                className="py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs cursor-pointer transition-all shadow flex items-center justify-center gap-1.5"
              >
                <span>✈️</span>
                <span>Telegram</span>
              </button>

              <button
                type="button"
                onClick={() => handleDispatch('sms')}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <span>💬</span>
                <span>SMS</span>
              </button>

              <button
                type="button"
                onClick={() => handleDispatch('facebook')}
                className="py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs cursor-pointer transition-all shadow flex items-center justify-center gap-1.5"
              >
                <span>🌐</span>
                <span>Facebook</span>
              </button>
            </div>

            {dispatchStatus && (
              <p className="text-xs text-emerald-400 font-bold pt-1 animate-in fade-in">
                ✓ {dispatchStatus}
              </p>
            )}
          </div>
        </div>

        {/* Trilingual Message Preview */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              Trilingual Invitation Preview (Afaan Oromoo • አማርኛ • English):
            </span>
            <button
              type="button"
              onClick={() => handleCopy(trilingualMessage, 'Full Invitation Message')}
              className="text-[11px] text-amber-400 font-bold hover:underline cursor-pointer"
            >
              Copy Full Text
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-400 bg-slate-900 p-3 rounded-xl border border-slate-850 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
            {trilingualMessage}
          </pre>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer border border-slate-700"
          >
            Close / Cufi
          </button>
        </div>
      </div>
    </div>
  );
};
