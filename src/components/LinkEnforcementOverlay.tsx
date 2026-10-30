import React from 'react';
import { ExternalLink, ShieldAlert, RefreshCw, Globe, ArrowRight } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface LinkEnforcementOverlayProps {
  currentLang: Language;
  targetUrl: string;
}

export const LinkEnforcementOverlay: React.FC<LinkEnforcementOverlayProps> = ({ 
  currentLang, 
  targetUrl 
}) => {
  const t = translations[currentLang];
  
  const handleRedirect = () => {
    window.location.href = targetUrl;
  };

  const handleUpdate = () => {
    // Simulate an update check or clearing cache then redirecting
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    window.location.href = targetUrl;
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />
      </div>

      <div className="max-w-2xl w-full bg-slate-900 border-2 border-amber-500/40 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative animate-in zoom-in-95 duration-300 text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-5xl shadow-inner relative group">
            <div className="absolute inset-0 bg-amber-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50" />
            <ShieldAlert className="w-12 h-12 text-amber-500 relative z-10 animate-pulse" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl sm:text-4xl font-serif-legal font-bold text-white tracking-tight leading-tight">
            {currentLang === 'om' ? 'Akeekkachiisa Haaroomsaa (Update Required)' : currentLang === 'am' ? 'ማሻሻያ ያስፈልጋል (Update Required)' : 'Official Link & Update Required'}
          </h1>
          
          <div className="h-1 w-24 bg-amber-500/40 mx-auto rounded-full" />
          
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            {currentLang === 'om' 
              ? 'Tajaajila SeeraAI bifa haaraa fi gahumsa qabuun argachuuf, maaloo linkii "pre" qabu kanaan fayyadamaa. Fayyadamtoonni hundi (Premium fi kan biroos) App kana update gochuun tajaajila ammayyaa kana argachuu dandeessu.'
              : currentLang === 'am'
              ? 'የ SeeraAI አገልግሎትን በአዲስ እና በተሻሻለ መልኩ ለማግኘት እባክዎ ይህን "pre" ያለበትን ይፋዊ ሊንክ ይጠቀሙ። ሁሉም ተጠቃሚዎች (ፕሪሚየምም ይሁኑ ሌሎች) መተግበሪያውን በማዘመን አገልግሎቱን ማግኘት ይችላሉ።'
              : 'To access the latest version and optimized features of SeeraAI, please use the official "pre" link. All users (Premium and non-premium) can update their app to continue using the latest legal services.'}
          </p>
        </div>

        {/* Target URL Display */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 font-mono text-[10px] sm:text-xs text-amber-400 break-all select-all flex items-center justify-between gap-3 group">
          <Globe className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="flex-1 text-center">{targetUrl}</span>
          <ExternalLink className="w-4 h-4 text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={handleRedirect}
            className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>{currentLang === 'om' ? 'Gara Linkii Haaraa Seeni' : currentLang === 'am' ? 'ወደ አዲሱ ሊንክ ይግቡ' : 'Go to Official Link'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleUpdate}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-2xl flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            <span>{currentLang === 'om' ? 'Amma Haaroomsi' : currentLang === 'am' ? 'አሁን አዘምን' : 'Update Now'}</span>
          </button>
        </div>

        <div className="pt-6 text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
          <div className="w-8 h-px bg-slate-800" />
          <span>SAI Ethio Legal Intelligence</span>
          <div className="w-8 h-px bg-slate-800" />
        </div>
      </div>
    </div>
  );
};
