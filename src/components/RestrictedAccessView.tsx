import React from 'react';
import { Language } from '../i18n/translations';
import { Lock, ShieldAlert, UserCheck, ArrowRight, Landmark } from 'lucide-react';

interface RestrictedAccessViewProps {
  currentLang: Language;
  onNavigateHome?: () => void;
  onRequestAccess?: () => void;
}

export const RestrictedAccessView: React.FC<RestrictedAccessViewProps> = ({
  currentLang = 'om',
  onNavigateHome,
  onRequestAccess,
}) => {
  return (
    <div className="max-w-xl mx-auto my-16 p-8 sm:p-10 rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl space-y-6 animate-in fade-in duration-300 text-center relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto text-4xl shadow-inner">
        🔒
      </div>

      <div className="space-y-3">
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold uppercase border border-amber-500/30">
          Restricted Access • Hojjataa Mana Murtii Qofaaf (Court Personnel Only)
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-white font-serif-legal">
          {currentLang === 'om'
            ? 'Galmeewwan & Hojiin Mana Murtii Kun Iccitiidha'
            : currentLang === 'am'
            ? 'የፍርድ ቤት መዝገቦች እና ስራዎች የተጠበቁ ናቸው'
            : 'Sensitive Court Records & Operations Restricted'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
          {currentLang === 'om'
            ? 'Akkaataa qajeelfama seeraa tiin, fooldariin mana murtii, galmeewwan dhimmootaa fi kaalendarri beellamaa namoota gahee "court_personnel" ykn hojjataa mana murtii tahanii qofaaf kan eegameedha. Navigeeshiniin keessan fashalaayeera.'
            : currentLang === 'am'
            ? 'በፍርድ ቤት ደንብ መሰረት ይህ የፍርድ ቤት ማህደር የ "court_personnel" ሚና ላላቸው የተወሰነ ነው።'
            : 'Per judicial confidentiality regulations, court work dockets and hearing schedules are restricted exclusively to verified users with the "court_personnel" role.'}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-bold text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Kaayyoo Nageenyaa (Security & Privacy Safeguard)</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          {currentLang === 'om'
            ? 'Namni hayyama hin qabne galmee mana murtii arguu ykn jijjiiruu akka hin dandeenye seeraan dhorkameera. Seenuuf eeyyama bulchaa (Admin Approval) gaafachuu qabdu.'
            : 'ያለፈቃድ መግባት የተከለከለ ሲሆን የአስተዳዳሪ ማረጋገጫ (Admin Approval) ያስፈልጋል።'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <span>🏠</span>
            <span>{currentLang === 'om' ? 'Gara Fuula Duraatti Deebi\'i' : 'ወደ ዋናው ገጽ ተመለስ'}</span>
          </button>
        )}
        {onRequestAccess && (
          <button
            onClick={onRequestAccess}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider border border-slate-700 cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>{currentLang === 'om' ? 'Hayyama Gaafadhu (Request Access)' : 'ፈቃድ ይጠይቁ'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
export default RestrictedAccessView;
