import React, { useState } from 'react';
import { Language } from '../i18n/translations';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  currentLang?: Language;
  variant?: 'navbar' | 'banner' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  currentLang = 'om',
  variant = 'navbar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showPlayStoreGuide, setShowPlayStoreGuide] = useState(false);

  // If already running as an installed PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">📲</span>
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                {currentLang === 'om' ? 'Appilikeeshinii Bilbila Irratti Fe\'adhaa' : 'መተግበሪያውን በስልክዎ ላይ ይጫኑ'}
              </h4>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Google Play Store / Android irratti akka appii guutuutti fayyadamaa.'
                  : 'እንደ ሙሉ የሞባይል አፕሊኬሽን በስልክዎ ላይ ይጠቀሙ።'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={install}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>⬇️</span>
            <span>{currentLang === 'om' ? 'Fe\'i (Install)' : 'ጫን'}</span>
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
        title="Install Android App / PWA"
      >
        <span>📲</span>
        <span className="hidden sm:inline">{currentLang === 'om' ? 'App Fe\'i' : 'ጫን'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold text-xs transition-all cursor-pointer"
        >
          <span>🍏</span>
          <span className="hidden sm:inline">iOS App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center space-y-4">
              <span className="text-3xl">🍏</span>
              <h3 className="text-base font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om' ? 'iPhone / iPad Irratti Fe\'uuf' : 'በ iPhone / iPad ላይ ለመጫን'}
              </h3>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 text-left space-y-2">
                <p>1. Safari keessatti mallattoo <strong>Share (Qoodi)</strong> ⬆️ cuqaasaa.</p>
                <p>2. Gadi bu'uun <strong>"Add to Home Screen" (Gara Fuula Jalqabaatti Dabali)</strong> filadhaa.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
              >
                Cufi (Close)
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
