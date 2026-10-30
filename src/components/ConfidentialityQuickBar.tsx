import React, { useState, useEffect } from 'react';
import { Shield, EyeOff, Eye, Lock } from 'lucide-react';
import { isPrivacyShieldActive, setPrivacyShieldActive } from '../services/confidentialityService';
import { Language } from '../i18n/translations';

interface ConfidentialityQuickBarProps {
  currentLang: Language;
  onOpenShieldModal: () => void;
  className?: string;
}

export const ConfidentialityQuickBar: React.FC<ConfidentialityQuickBarProps> = ({
  currentLang,
  onOpenShieldModal,
  className = '',
}) => {
  const [shieldActive, setShieldActive] = useState<boolean>(isPrivacyShieldActive());
  const [screenBlurred, setScreenBlurred] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = () => {
      setShieldActive(isPrivacyShieldActive());
    };
    window.addEventListener('seera_confidentiality_settings_changed', handleUpdate);
    return () => window.removeEventListener('seera_confidentiality_settings_changed', handleUpdate);
  }, []);

  const toggleShield = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !shieldActive;
    setPrivacyShieldActive(next);
    setShieldActive(next);
  };

  const togglePanicBlind = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !screenBlurred;
    setScreenBlurred(next);
    const mainEl = document.querySelector('main') || document.body;
    if (next) {
      mainEl.classList.add('seera-panic-blurred');
    } else {
      mainEl.classList.remove('seera-panic-blurred');
    }
  };

  return (
    <>
      {/* Emergency Panic Blind Fullscreen Barrier */}
      {screenBlurred && (
        <div 
          onClick={togglePanicBlind}
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none animate-in fade-in duration-150"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 text-3xl mb-4 shadow-2xl animate-pulse">
            🔒
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-amber-200 tracking-wide mb-2 font-mono">
            {currentLang === 'am' ? 'የፍርድ ቤት መዝገብ ተሸፍኗል (EMERGENCY PRIVACY BLIND)' : currentLang === 'en' ? 'CHAMBER PRIVACY BLIND ACTIVE' : 'DHADDACHI EEGUUMSA ICCITIIF DUDAAMEERA'}
          </h3>
          <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            {currentLang === 'om'
              ? "Qabiyyeen galmee akka hin mul'anneef fashaleeffameera (CPC Art. 176 / FDRE Const. Art. 26). Banuuf bakka kamiyyuu tuqi."
              : "Screen content blinded for litigant confidentiality. Click anywhere to unmask chamber view."}
          </p>
          <span className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg">
            {currentLang === 'om' ? 'Banuuf Tuqi (Click to Restore)' : 'Click to Restore'}
          </span>
        </div>
      )}

      {/* Floating Quick Action Widget */}
      <div className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-amber-500/30 backdrop-blur-md shadow-lg ${className}`}>
        {/* Toggle Privacy Shield */}
        <button
          type="button"
          onClick={toggleShield}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${shieldActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'}`}
          title={shieldActive ? 'Privacy Shield Active (PII Redacted)' : 'Privacy Shield Inactive (Unredacted)'}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{shieldActive ? (currentLang === 'om' ? 'Iccitii: Eegamaa' : 'ሚስጥር: ንቁ') : (currentLang === 'om' ? 'Iccitii: Banaa' : 'ሚስጥር: ክፍት')}</span>
        </button>

        {/* Emergency Chamber Blind Button */}
        <button
          type="button"
          onClick={togglePanicBlind}
          className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
          title={currentLang === 'om' ? "Skiriinii Dhoksi (Emergency Blind Chamber)" : "Emergency Screen Blind"}
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>

        {/* Full Modal Opener */}
        <button
          type="button"
          onClick={onOpenShieldModal}
          className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
          title="Open Privacy & Statutory Shield Controls"
        >
          <Lock className="w-3 h-3" />
          <span className="hidden sm:inline">{currentLang === 'om' ? 'Qajeelfama' : 'ዝርዝር'}</span>
        </button>
      </div>
    </>
  );
};
