import React, { useState } from 'react';
import { Language } from '../i18n/translations';

interface PlayStorePublishGuideModalProps {
  currentLang: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayStorePublishGuideModal: React.FC<PlayStorePublishGuideModalProps> = ({
  currentLang,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'playstore' | 'appstore' | 'apikeySecurity'>('playstore');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-2xl bg-amber-500 text-slate-950 font-bold">📲</span>
            <div>
              <h3 className="text-lg font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om' ? 'Google Play Store, Apple App Store & API Key Security' : 'የፕሌይ ስቶር፣ አፕ ስቶር እና ኤፒአይ ደህንነት ማዕከል'}
              </h3>
              <span className="text-xs text-slate-400">
                Official Store Publishing & Server-Side API Key Protection Shield
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('playstore')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'playstore'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ▶️ Google Play Store (Android)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appstore')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'appstore'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🍏 Apple App Store (iOS)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apikeySecurity')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'apikeySecurity'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🔒 API Key Protection
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'playstore' && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
              <span className="text-emerald-400 font-bold block text-sm">
                ✓ Android TWA & PWA Ready (`com.saiethio.seeraai`)
              </span>
              <p className="text-slate-400 text-[11px]">
                Appichi `manifest.json`, `service-worker`, fi icons (192x192 & 512x512) guutuu qaba. Google Play Console irratti Android App Bundle (`.aab`) galchuuf Bubblewrap fayyadamuu dandeessu.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-emerald-400 font-bold block text-sm">
                🛡️ Eegumsa Koodii fi Eeyyama Maxxansaa (Owner Security Protocol):
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Appilikeeshiniin kun Google Play Store irratti karaa Google Play Console Ogeessa Seeraa Ayele Be Dha qofaan maxxansama. Koodiin platformii kamiyyuu alaa hin mul'atu; namoonni biroo akka appii idilee fe'atanii itti fayyadaman qofaaf heeyyamama.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'appstore' && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
              <span className="text-emerald-400 font-bold block text-sm">
                🍏 Apple App Store (iOS Web App / Capacitor Wrapper)
              </span>
              <p className="text-slate-400 text-[11px]">
                Bilbila iPhone/iPad irratti Safari fayyadamuun <strong>"Share"</strong> cuqaasanii <strong>"Add to Home Screen"</strong> jechuun akka appii idilee (Native App) tti fe'amuu danda'a. Apple App Store irratti maxxansuuf Capacitor ykn Cordova fayyadamuun `.ipa` qopheessuun ni danda'ama.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              Bundle ID: <code>com.saiethio.seeraai.ios</code> • Developer: Ayele Be Dha
            </div>
          </div>
        )}

        {activeTab === 'apikeySecurity' && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
              <span className="text-emerald-400 font-bold block text-sm">
                🛡️ Zero Client Exposure & Server-Side API Key Shield
              </span>
              <p className="text-slate-400 text-[11px]">
                API keyn keessan guutummaatti server-side (`server.ts` fi environment variables) irratti qofa eegameera. Fayyadamaan kamiyyuu browser client irraa key kana argachuu hin danda'u. Gaaffiin AI hundi proxy irraan karaa server keenyaa qofa darba.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              <strong>Owner Authorization:</strong> <code>ayeledha@saiethio.com</code> / <code>ayeledha@gmail.com</code> • Secure Owner PIN & Proxy Enforced.
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
          >
            Hubadheera (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
