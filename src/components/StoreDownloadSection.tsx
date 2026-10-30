import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';

interface StoreDownloadSectionProps {
  currentLang: Language;
  onOpenStoreModal?: () => void;
}

export const StoreDownloadSection: React.FC<StoreDownloadSectionProps> = ({
  currentLang,
  onOpenStoreModal
}) => {
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'macos' | 'windows' | 'desktop'>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(ua)) {
      setDeviceType('android');
    } else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setDeviceType('ios');
    } else if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) {
      setDeviceType('macos');
    } else if (/Win32|Win64|Windows|WinCE/.test(ua)) {
      setDeviceType('windows');
    } else {
      setDeviceType('desktop');
    }
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative z-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
            <span>🛡️</span>
            <span>
              {currentLang === 'om' ? 'Eegumsa API Key & Fe\'umsa Appii' : currentLang === 'am' ? 'የኤፒአይ ቁልፍ ደህንነት እና መተግበሪያ ማውረድ' : 'Secured API & Official Store Distribution'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif-legal font-bold text-slate-100">
            {currentLang === 'om'
              ? 'Google Play Store & Apple App Store Irraa Fe\'i'
              : currentLang === 'am'
              ? 'በGoogle Play Store እና Apple App Store ያውርዱ'
              : 'Download for Google Play Store & Apple App Store'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            {currentLang === 'om'
              ? 'Seeroinni AI fi ragaaleen iccitii keessan serverside proxy-n (GEMINI_API_KEY) guutummaatti eegamaniiru. Bilbila keetiif appii Android (AAB/APK) ykn iOS (PWA/Capacitor) fe\'aa.'
              : currentLang === 'am'
              ? 'የኤፒአይ ቁልፍዎ በሰርቨር በኩል (GEMINI_API_KEY) ሙሉ በሙሉ የተጠበቀ ነው። ለሞባይል ስልክዎ የAndroid (AAB/APK) ወይም የiOS (PWA/Capacitor) መተግበሪያ ያውርዱ።'
              : 'Your API key is securely isolated on the backend server (`GEMINI_API_KEY`), preventing any client-side exposure. Install the official app on Android or iOS.'}
          </p>
        </div>

        {/* Device Detection Badge */}
        <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono flex items-center gap-2 text-slate-300 shadow-inner shrink-0">
          <span className="text-base">
            {deviceType === 'android' ? '🤖' : deviceType === 'ios' ? '🍏' : deviceType === 'macos' ? '💻' : deviceType === 'windows' ? '🪟' : '🖥️'}
          </span>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-sans">
              {currentLang === 'om' ? 'Meeshaa Argamte:' : currentLang === 'am' ? 'የተገኘው መሳሪያ:' : 'Detected Device:'}
            </div>
            <div className="font-bold text-amber-400 capitalize">
              {deviceType === 'android' ? 'Android Mobile' : deviceType === 'ios' ? 'Apple iOS / iPhone' : deviceType === 'macos' ? 'Mac Desktop' : deviceType === 'windows' ? 'Windows PC' : 'Desktop Browser'}
            </div>
          </div>
        </div>
      </div>

      {/* Official Badges & Direct Install Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {/* Android / Play Store Card */}
        <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
          deviceType === 'android'
            ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/5'
            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤖</span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Google Play Store (Android)</h3>
                <p className="text-[11px] text-slate-400">
                  {currentLang === 'om' ? 'APK / TWA Bubblewrap (Android 8.0+)' : currentLang === 'am' ? 'ለአንድሮይድ ስልኮች እና ታብሌቶች' : 'Official Android Package & TWA'}
                </p>
              </div>
            </div>
            {deviceType === 'android' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold font-mono">
                RECOMMENDED
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {currentLang === 'om'
              ? 'Appii SeeraAI Google Play Store irraa fe\'achuuf TWA (Trusted Web Activity) ykn APK dhihaate fayyadamaa. Keyn keessan server irra qofa waan jiruuf nageenyi 100% eegamaadha.'
              : currentLang === 'am'
              ? 'SeeraAIን ከGoogle Play Store በታማኝ የድር እንቅስቃሴ (TWA) ወይም በቀጥታ APK ያውርዱ። የኤፒአይ ቁልፍዎ በሰርቨር ብቻ የሚጠበቅ ነው።'
              : 'Download SeeraAI for Android via Google Play TWA. Protected by secure backend API proxy with zero client key exposure.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onOpenStoreModal) onOpenStoreModal();
                else alert("Google Play Store & Play Console publishing guide is available in the App Guide.");
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>📥</span>
              <span>
                {currentLang === 'om' ? 'Fe\'i APK / Play Store' : currentLang === 'am' ? 'APK / Play Store ያውርዱ' : 'Get Android App'}
              </span>
            </button>
          </div>
        </div>

        {/* Apple iOS / App Store Card */}
        <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
          deviceType === 'ios'
            ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/5'
            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍏</span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Apple App Store (iOS / iPadOS)</h3>
                <p className="text-[11px] text-slate-400">
                  {currentLang === 'om' ? 'PWA / Safari Add to Home Screen' : currentLang === 'am' ? 'ለአይፎን እና አይፓድ ተጠቃሚዎች' : 'iOS Web App & Capacitor Wrapper'}
                </p>
              </div>
            </div>
            {deviceType === 'ios' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold font-mono">
                RECOMMENDED
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {currentLang === 'om'
              ? 'Safari irratti "Share" tuquun "Add to Home Screen" filadhaa ykn App Store irraa fe\'aa. API interaction hundi server-side proxy qofaan eegama.'
              : currentLang === 'am'
              ? 'በሳፋሪ አሳሽ ላይ "Share" በመጫን "Add to Home Screen" ይምረጡ ወይም ከApp Store ያውርዱ። የኤፒአይ ጥያቄዎች በሰርቨር በኩል ብቻ የተጠበቁ ናቸው።'
              : 'Add to iPhone Home Screen via Safari or download via App Store wrapper. All Gemini API calls remain strictly secure behind backend proxy.'}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onOpenStoreModal) onOpenStoreModal();
                else alert("Apple App Store publishing & Safari PWA guide is available in the App Guide.");
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>📲</span>
              <span>
                {currentLang === 'om' ? 'Qajeelcha App Store iOS' : currentLang === 'am' ? 'የአፕ ስቶር መመሪያ' : 'Get iOS / Safari App'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Strict Anti-Theft & Source Code Protection Card (Code Download Blocked & Forbidden) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 border-2 border-emerald-500/50 relative z-10 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                PROPRIETARY SOURCE CODE LOCKED
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                FDRE Proc. 410/2004 Protected
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 font-serif-legal">
              {currentLang === 'om'
                ? 'Eegumsa Koodii fi Qabeenya Sammuu (Source Code Protected)'
                : currentLang === 'am'
                ? 'የሶርስ ኮድ እና የአእምሯዊ ንብረት ጥበቃ (Protected Source Code)'
                : 'Proprietary Source Code & IP Protection Active'}
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {currentLang === 'om'
                ? 'Koodiin appii kanaa (Source Code), algorizimiin seeraa, fi deetaan dhaddacha ijoo guutummaatti qabeenya dhuunfaa fi sammuu Ogeessa Seeraa Ayele Be Dha ti. Namni kamiyyuu koodii appii kanaa download gochuun, garagalchuun, yookiin tamsaasuun seeraan guutummaatti dhoorgaadha. Koodiin fi API keyn server-side proxy qofaan eegama.'
                : currentLang === 'am'
                ? 'የዚህ መተግበሪያ ሶርስ ኮድ እና የህግ ስልተ-ቀመሮች ሙሉ በሙሉ በህግ ባለሙያ Ayele Be Dha ስም የተጠበቁ ናቸው። ማንኛውም ሰው ኮዱን ማውረድ ወይም መቅዳት በህግ በጥብቅ የተከለከለ ነው።'
                : 'The source code, legal algorithms, and backend intelligence of SeeraAI (SAI Ethio) are the exclusive intellectual property of Jurist Ayele Be Dha. Unauthorized code inspection, downloading, or replication is strictly prohibited under FDRE Proclamation No. 410/2004.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold shadow-inner">
              <span>🛡️</span>
              <span>Koodiin Dhokfameera / Code Shield Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* Security Guarantee Footer */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 text-lg">🔒</span>
          <div>
            <strong className="text-slate-100 block">
              {currentLang === 'om' ? 'Eegumsa Cabsii Keyii (API Key Protection)' : currentLang === 'am' ? 'የኤፒአይ ቁልፍ ጥበቃ (Zero Client Exposure)' : 'Zero API Key Exposure Guarantee'}
            </strong>
            <span className="text-[11px] text-slate-400">
              {currentLang === 'om'
                ? 'Keyn kamiyyuu appii fe\'ame keessatti hin argamu; hundi server-side `/api/*` proxy-n qofa gaggeeffama.'
                : currentLang === 'am'
                ? 'ምንም አይነት የኤፒአይ ቁልፍ በመተግበሪያው ውስጥ አልተካተተም፤ ሁሉም ጥያቄዎች በሰርቨር ፕሮክሲ ብቻ ያልፋሉ።'
                : 'No API keys are embedded in installed mobile app binaries. All AI inference is routed securely through backend proxy.'}
            </span>
          </div>
        </div>

        {onOpenStoreModal && (
          <button
            type="button"
            onClick={onOpenStoreModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
          >
            {currentLang === 'om' ? 'Qajeelcha Guutuu Ilaali' : currentLang === 'am' ? 'ሙሉ መመሪያውን ይመልከቱ' : 'View Full Publishing Guide'}
          </button>
        )}
      </div>
    </div>
  );
};
