import React, { useState } from 'react';
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react';
import { Language } from '../i18n/translations';
import { AppUpdateInfo, applyAppUpdate } from '../services/appUpdateService';

interface TopUpdateStickyBannerProps {
  currentLang: Language;
  updateInfo: AppUpdateInfo | null;
  onOpenDetails: () => void;
}

export const TopUpdateStickyBanner: React.FC<TopUpdateStickyBannerProps> = ({
  currentLang,
  updateInfo,
  onOpenDetails,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  if (!updateInfo || !updateInfo.isUpdateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    await applyAppUpdate();
  };

  const isMandatory = Boolean(updateInfo.isMandatory);

  const labels = {
    om: {
      tag: isMandatory ? '🚨 HAAROMFAMA DIRQAMAA (MANDATORY)' : 'Fooyya\'iinsi Qophaa\'eera!',
      msg: isMandatory 
        ? 'Sadarkaa appii haaraa (v4.1.0) argachuun dirqama. Battalatti haaromsi.'
        : 'Link kanaan wantoonni haaromfaman jiru. Version haarawaatti ol guddisaa.',
      btn: 'Amma Haaromsi',
      details: 'Bal\'ina Ilaali',
    },
    am: {
      tag: isMandatory ? '🚨 አስገዳጅ ዝማኔ (MANDATORY)' : 'አዲስ ዝማኔ ተዘጋጅቷል!',
      msg: isMandatory
        ? 'አዲሱን ስሪት (v4.1.0) ለመጠቀም አሁኑኑ ማዘመን ግዴታ ነው።'
        : 'በዚህ ሊንክ የተሻሻሉ አዳዲስ ባህሪያት አሉ። ወደ አዲሱ ስሪት ያዘምኑ።',
      btn: 'አሁን ያዘምኑ',
      details: 'ዝርዝር ይመልከቱ',
    },
    en: {
      tag: isMandatory ? '🚨 MANDATORY UPDATE (v4.1.0)' : 'Update Available!',
      msg: isMandatory
        ? 'Updating to the latest version (v4.1.0) is required for this link.'
        : 'New features and legal updates ready. Update to the latest version.',
      btn: 'Update Now',
      details: 'Details',
    },
  }[currentLang] || {
    tag: isMandatory ? 'MANDATORY UPDATE' : 'Update Available!',
    msg: 'New features ready. Update to the latest version.',
    btn: 'Update Now',
    details: 'Details',
  };

  return (
    <aside 
      aria-label={labels.tag}
      className={`px-3 sm:px-4 py-2 border-b shadow-lg flex items-center justify-between gap-3 text-xs font-medium z-40 sticky top-0 ${
        isMandatory 
          ? 'bg-gradient-to-r from-red-600 via-amber-500 to-amber-600 text-slate-950 border-amber-300' 
          : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-slate-950 border-amber-400/40'
      }`}
    >
      <div 
        onClick={onOpenDetails}
        className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
      >
        <span className="p-1 rounded-lg bg-slate-950/20 text-slate-950 font-bold shrink-0">
          <Sparkles className="w-4 h-4 animate-spin duration-1000" />
        </span>
        <div className="truncate">
          <span className="font-bold underline decoration-slate-950/40 mr-1.5">
            {labels.tag} (v{updateInfo.latestVersion})
          </span>
          <span className="hidden sm:inline opacity-95 text-[11px] font-semibold">
            {labels.msg}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleUpdate}
          disabled={isUpdating}
          className="px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold text-[11px] flex items-center gap-1.5 shadow transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? '...' : labels.btn}</span>
        </button>

        {!isMandatory && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-slate-950 hover:bg-slate-950/20 cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
