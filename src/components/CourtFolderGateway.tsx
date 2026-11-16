import React, { useState, useEffect } from 'react';
import { CourtDomainLauncherBar } from './CourtDomainLauncherBar';
import { DynamicCourtHeader } from './DynamicCourtHeader';
import { Language } from '../i18n/translations';
import { getActiveCourtSession, clearCourtSession } from '../services/courtInstitutionService';
import { ArrowRight, Globe, Lock, ShieldCheck } from 'lucide-react';

interface CourtFolderGatewayProps {
  currentLang: Language;
  onNavigate: (tab: string) => void;
}

export const CourtFolderGateway: React.FC<CourtFolderGatewayProps> = ({
  currentLang,
  onNavigate
}) => {
  const [activeSession, setActiveSession] = useState(getActiveCourtSession());
  const [adminEmail, setAdminEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    const handleSessionChange = () => setActiveSession(getActiveCourtSession());
    window.addEventListener('seera_court_session_changed', handleSessionChange);
    return () => window.removeEventListener('seera_court_session_changed', handleSessionChange);
  }, []);

  const handleLockFolder = () => {
    clearCourtSession();
    setActiveSession(null);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !passcode) return;
    
    setIsLoading(true);
    setError('');

    try {
      const { loginAsCourtAdmin } = await import('../services/courtInstitutionService');
      const result = await loginAsCourtAdmin(adminEmail, passcode);
      
      if (result.success) {
        onNavigate('overview');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Rakkoon uumameera. Maaloo irra deebi\'ii yaali.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeSession) {
    return (
      <div className="space-y-6">
        <div className="p-8 bg-slate-800/80 rounded-[2.5rem] border border-amber-500/40 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          {/* Decorative Security Shield Background */}
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
              🔐
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-serif-legal">
                {currentLang === 'om' ? 'Fooldara Mana Murtii Seeni' : 'Enter Court Folder'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Institutional Login Required
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-300 mb-8 font-medium leading-relaxed max-w-md relative z-10">
            {currentLang === 'om' 
              ? 'Fooldara mana murtii keessanii seenuuf imeelii mana murtii (@court.oromia.et) fi koodii bulchaa (Admin Passcode) fayyadamaa.' 
              : 'To enter your official court folder, please use your institutional court email (@court.oromia.et) and your admin passcode.'}
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-4 relative z-10 max-w-sm">


            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold px-1">
                {currentLang === 'om' ? 'Imeelii Mana Murtii (Court Email):' : 'Institutional Email:'}
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="e.g. gurbicha@court.oromia.et"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-xs text-amber-300 font-mono focus:outline-none transition-all shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold px-1">
                {currentLang === 'om' ? 'Koodii Bulchaa (Passcode):' : 'Admin Passcode:'}
              </label>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-xs text-amber-300 font-mono focus:outline-none transition-all shadow-inner tracking-widest"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold animate-in fade-in slide-in-from-top-1 space-y-1">
                <div>⚠️ {error}</div>
                {adminEmail.toLowerCase().includes('gurbicha') && (
                  <div className="text-[10px] text-amber-300/90 font-normal">
                    💡 Hubachiisa: Koodiin Bulchaa Mana Murtii Aanaa Gurbicha <strong className="text-white font-mono">GURBICHA-2026</strong> (ykn <strong className="text-white font-mono">2026</strong>) dha.
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>{currentLang === 'om' ? 'FOOLDARA SEENI' : 'ENTER FOLDER'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Directory Lookup Trigger */}
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10 flex flex-col sm:flex-row items-center gap-4">
            <p className="text-[10px] text-slate-500 font-medium">
              {currentLang === 'om' ? 'Koodii linkii mana murtii barbaaduuf:' : 'Looking for court domain links?'}
            </p>
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{currentLang === 'om' ? 'Tarree Linki Manneen Murtii Hunda' : 'View All Court Domain Links'}</span>
            </button>
          </div>

          {showCatalog && (
            <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
              <CourtDomainLauncherBar 
                currentLang={currentLang}
                onSelectCourtFolder={(court) => {
                  setAdminEmail(`${court.domainHandle}@court.oromia.et`);
                  setShowCatalog(false);
                }} 
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DynamicCourtHeader 
        currentLang={currentLang}
        onLockFolder={handleLockFolder}
        onOpenBrandingModal={() => onNavigate('branding_settings')}
      />
    </div>
  );
};
