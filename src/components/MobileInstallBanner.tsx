import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';

interface MobileInstallBannerProps {
  currentLang: Language;
  onOpenStoreModal: () => void;
}

export const MobileInstallBanner: React.FC<MobileInstallBannerProps> = ({
  currentLang,
  onOpenStoreModal,
}) => {
  if (typeof React === 'undefined' || !React.useState) {
    console.error('React is not defined in MobileInstallBanner');
    return null;
  }

  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const [dismissed, setDismissed] = React.useState<boolean>(false);
  const [isStandalone, setIsStandalone] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Check if mobile device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileDevice = mobileRegex.test(userAgent.toLowerCase()) || window.innerWidth < 768;
    
    // Check if already running in standalone PWA mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window as any).navigator.standalone === true;

    setIsMobile(isMobileDevice);
    setIsStandalone(standalone);
  }, []);

  if (!isMobile || isStandalone || dismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-xs text-slate-200 flex items-center justify-between gap-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5">
        <span className="text-xl p-1 rounded-xl bg-amber-500 text-slate-950 font-bold">📲</span>
        <div>
          <span className="font-bold text-amber-300 block">
            {currentLang === 'om' ? 'Appii SeeraAI Bilbila Keetiif Fe\'i (Android/iOS)' : 'የSeeraAI መተግበሪያን ወደ ሞባይልዎ ይጫኑ'}
          </span>
          <span className="text-[11px] text-slate-400">
            {currentLang === 'om' ? 'Play Store & App Store irraa argachuuf ykn Home Screen irratti dabaluuf cuqaasaa.' : 'ለቀላል አጠቃቀም ወደ ስልክዎ ማያ ገጽ ያክሉት።'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenStoreModal}
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer shadow"
        >
          {currentLang === 'om' ? '📥 Fe\'i / Install' : '📥 መጫኛ'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
