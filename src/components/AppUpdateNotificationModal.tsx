import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { Language } from '../i18n/translations';
import { AppUpdateInfo, applyAppUpdate } from '../services/appUpdateService';

interface AppUpdateNotificationModalProps {
  currentLang: Language;
  updateInfo: AppUpdateInfo | null;
  onDismiss: () => void;
}

export const AppUpdateNotificationModal: React.FC<AppUpdateNotificationModalProps> = ({
  currentLang,
  updateInfo,
  onDismiss,
}) => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(12); // Auto-update in 12s unless paused
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (!updateInfo?.isUpdateAvailable || isPaused) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handlePerformUpdate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [updateInfo, isPaused]);

  if (!updateInfo || !updateInfo.isUpdateAvailable) {
    return null;
  }

  const handlePerformUpdate = async () => {
    setIsUpdating(true);
    await applyAppUpdate();
  };

  const isMandatory = Boolean(updateInfo?.isMandatory);

  const texts = {
    om: {
      badge: isMandatory ? 'HAAROMFAMA DIRQAMAA (MANDATORY)' : 'FOOYYA\'IINSA HAARAA (UPDATE)',
      title: 'Appii SeeraAI Haaromsuun Dirqama (v4.1.0)!',
      subtitle: isMandatory 
        ? 'Namoonni link kanaan seenaan hundi sadarkaa haaraa (v4.1.0) qabachuun dirqama. Iccitiin sanadoota keessanii akkuma jirutti eegama.'
        : 'Namoonni link kanaan seenaan hundi fooyya\'iinsa haarawaa akka argatan qophaa\'eera.',
      featuresHeading: 'Wanti Haaromfame (New Features):',
      f1: 'Chaanala Telegiraamaa SeeraAI (https://t.me/seeraai_ethio) battalatti makamuu.',
      f2: 'Qorannoo Dhimma Seeraa (Case Logic Audit) fi Seenaa Qorannoo (Version History).',
      f3: 'Share & Copy Link saffisaa subtle toast notification waliin.',
      f4: 'Referral Tracking Widget Admin Dashboard irratti qindaa\'eera.',
      autoText: `Ofumaan sekondii ${countdown} keessatti haaromfama...`,
      pauseBtn: isMandatory ? '' : 'Dhaabi',
      updateBtn: 'Amma Haaromsi (Update Now)',
      updatingText: 'Haaromfamaa jira...',
      laterBtn: 'Booda Naaf Dhiisi',
    },
    am: {
      badge: isMandatory ? 'አስገዳጅ ዝማኔ (MANDATORY)' : 'አዲስ ዝማኔ (UPDATE)',
      title: 'የSeeraAI መተግበሪያ አስገዳጅ ዝማኔ (v4.1.0)!',
      subtitle: isMandatory
        ? 'በዚህ ሊንክ የሚገቡ ሁሉም ተጠቃሚዎች የቅርብ ጊዜውን ስሪት (v4.1.0) እንዲይዙ ግዴታ ነው። የሰነዶችዎ ምስጢራዊነት ሙሉ በሙሉ የተጠበቀ ነው።'
        : 'በዚህ ሊንክ የሚገቡ ሁሉም ተጠቃሚዎች የቅርብ ጊዜውን ስሪት እንዲያገኙ ተዘጋጅቷል።',
      featuresHeading: 'የተካተቱ አዳዲስ ማሻሻያዎች:',
      f1: 'የSeeraAI ቴሌግራም ቻናል (https://t.me/seeraai_ethio) በቀጥታ መቀላቀል።',
      f2: 'የሕግ ጉዳዮች ትንታኔ (Case Logic Audit) እና የታሪክ ሰሌዳ (Version History)።',
      f3: 'ፈጣን የሊንክ ማጋሪያ እና ማሳወቂያ (Share & Toast Notification)።',
      f4: 'የተጠቃሚዎች መረጃ እና ቻርቶች በአስተዳዳሪ ክፍል (Admin Dashboard)።',
      autoText: `በ${countdown} ሰከንዶች ውስጥ በራስ-ሰር ይዘመናል...`,
      pauseBtn: isMandatory ? '' : 'አቁም',
      updateBtn: 'አሁን ያዘምኑ (Update Now)',
      updatingText: 'በማዘመን ላይ...',
      laterBtn: 'ቆይቶ ይሁን',
    },
    en: {
      badge: isMandatory ? 'MANDATORY UPDATE REQUIRED' : 'NEW UPDATE READY',
      title: 'SeeraAI Mandatory Update (v4.1.0)!',
      subtitle: isMandatory
        ? 'All visitors entering via this link are required to update to version 4.1.0. Your private documents remain strictly protected.'
        : 'All visitors entering via this link can now get the latest version and features automatically.',
      featuresHeading: 'What is New in This Update:',
      f1: 'Join Telegram Channel (https://t.me/seeraai_ethio) for real-time legal updates.',
      f2: 'Procedural & Statutory Case Logic Audit with Version History timeline.',
      f3: 'Instant Web Share API & Copy Link with confirmation toast.',
      f4: 'Admin Dashboard Referral Tracking Widget (Channels, Devices, Browsers).',
      autoText: `Auto-updating in ${countdown}s...`,
      pauseBtn: isMandatory ? '' : 'Pause',
      updateBtn: 'Update Now 🚀',
      updatingText: 'Applying Update...',
      laterBtn: 'Dismiss / Later',
    },
  }[currentLang] || {
    badge: isMandatory ? 'MANDATORY UPDATE' : 'NEW UPDATE',
    title: 'SeeraAI Has a New Update!',
    subtitle: 'Get the latest features and legal accuracy improvements.',
    featuresHeading: 'Highlights:',
    f1: 'Telegram Channel Integration',
    f2: 'Case Logic Audit & Version History',
    f3: 'Share & Toast Notifications',
    f4: 'Referral Tracking Widget',
    autoText: `Updating in ${countdown}s...`,
    pauseBtn: isMandatory ? '' : 'Pause',
    updateBtn: 'Update Now',
    updatingText: 'Updating...',
    laterBtn: 'Later',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl shadow-amber-500/20 text-slate-100 relative overflow-hidden">
        {/* Decorative Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600 animate-pulse" />

        {/* Close Button - Only show if not mandatory */}
        {!isMandatory && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
            <Sparkles className="w-6 h-6 animate-spin duration-1000" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                {texts.badge} • v{updateInfo.latestVersion}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Mirkanaa'e
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-100 mt-1 font-serif-legal">
              {texts.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {texts.subtitle}
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
          <div className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            {texts.featuresHeading}
          </div>
          <ul className="space-y-1.5 text-slate-300 text-[11px]">
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold shrink-0">✓</span>
              <span>{texts.f1}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold shrink-0">✓</span>
              <span>{texts.f2}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold shrink-0">✓</span>
              <span>{texts.f3}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold shrink-0">✓</span>
              <span>{texts.f4}</span>
            </li>
          </ul>
        </div>

        {/* Auto-update Countdown Bar */}
        {!isPaused && countdown > 0 && (
          <div className="mt-3 flex items-center justify-between bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-[11px] text-amber-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              {texts.autoText}
            </span>
            <button
              type="button"
              onClick={() => setIsPaused(true)}
              className="underline text-[10px] text-slate-400 hover:text-white cursor-pointer"
            >
              {texts.pauseBtn}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-3">
          {!isMandatory && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {texts.laterBtn}
            </button>
          )}

          <button
            type="button"
            onClick={handlePerformUpdate}
            disabled={isUpdating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? texts.updatingText : texts.updateBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
