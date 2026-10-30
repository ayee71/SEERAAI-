import React, { useState, useEffect } from 'react';
import { useCourtBranding } from '../hooks/useCourtBranding';

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Language, translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { 
  getActiveCourtSession, 
  getLocalInstitutions, 
  CourtInstitution,
  ActiveCourtSession
} from '../services/courtInstitutionService';
import { isOwnerAccount } from '../services/ownerAuth';
import { getStoredOwnerKey } from '../services/referralTracking';
import { getCourtLinkDetails } from '../utils/courtLinkUtils';
import { 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  UserCheck, 
  Landmark, 
  Gavel, 
  Scale, 
  Shield 
} from 'lucide-react';

interface DynamicCourtHeaderProps {
  currentLang: Language;
  onLockFolder: () => void;
  onOpenBrandingModal?: () => void;
}

export const DynamicCourtHeader: React.FC<DynamicCourtHeaderProps> = ({
  currentLang,
  onLockFolder,
  onOpenBrandingModal
}) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();
  const branding = useCourtBranding();
  
  const [session, setSession] = useState<ActiveCourtSession | null>(getActiveCourtSession());
  const [institution, setInstitution] = useState<CourtInstitution | null>(() => {
    const active = getActiveCourtSession();
    const insts = getLocalInstitutions();
    return insts.find(i => i.id === active?.institutionId) || insts[0] || null;
  });

  const isOwner = isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );

  const userRole = profile?.role || session?.user?.role || 'court_personnel';
  const canManageBranding = isOwner || userRole === 'admin' || userRole === 'court_admin' || session?.type === 'admin';

  // Listen to session changes
  useEffect(() => {
    const handleSessionChange = (e: any) => {
      const newSession = e.detail || getActiveCourtSession();
      setSession(newSession);
      const insts = getLocalInstitutions();
      const match = insts.find(i => i.id === newSession?.institutionId) || insts[0] || null;
      setInstitution(match);
    };

    window.addEventListener('seera_court_session_changed', handleSessionChange);
    return () => {
      window.removeEventListener('seera_court_session_changed', handleSessionChange);
    };
  }, []);

  // Listen to live Firestore updates for the active institution
  useEffect(() => {
    const instId = session?.institutionId || institution?.id || 'inst_oromia_supreme';
    if (!instId) return;

    // Local cache lookup as instant fallback
    const insts = getLocalInstitutions();
    const localMatch = insts.find(i => i.id === instId);
    if (localMatch) setInstitution(localMatch);

    // Live Firestore snapshot
    try {
      const unsub = onSnapshot(
        doc(db, 'court_institutions', instId),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as CourtInstitution;
            setInstitution(prev => ({
              ...prev,
              ...data,
              id: docSnap.id
            }));
          }
        },
        (err) => {
          console.warn('Live Firestore institution header listener deferred:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('Firestore subscription error:', e);
    }
  }, [session?.institutionId]);

  const displayCourtName = institution?.customCourtName || institution?.name || (currentLang === 'om' ? 'Mana Murtii Ol\'aanaa Oromiyaa' : 'የኦሮሚያ ከፍተኛ ፍርድ ቤት');
  const displayLogo = branding.logoUrl || institution?.logoUrl;
  const courtLevel = institution?.courtLevel || session?.courtLevel || 'high_court';

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'first_instance':
        return currentLang === 'om' ? 'Mana Murtii Aanaa (First Instance)' : 'የወረዳ ፍርድ ቤት';
      case 'high_court':
        return currentLang === 'om' ? 'Mana Murtii Olaanaa (High Court)' : 'ከፍተኛ ፍርድ ቤት';
      case 'cassation':
        return currentLang === 'om' ? 'Dhaddacha Ijibbaataa (Cassation Division)' : 'የሰበር ችሎት';
      case 'supreme_court':
        return currentLang === 'om' ? 'Mana Murtii Waliigalaa (Supreme Court)' : 'ጠቅላይ ፍርድ ቤት';
      default:
        return 'Court Institution';
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-3xl border-2 border-amber-500/40 p-6 sm:p-8 shadow-2xl"
      style={{ 
        backgroundColor: branding.primaryHeaderColor || '#0f172a',
        borderColor: branding.brandColor || '#f59e0b'
      }}
    >
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -z-0"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Side: Court Logo & Dynamic Branding Title */}
        <div className="flex items-center gap-5">
          {/* Prominent Custom Court Emblem / Logo */}
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-slate-900 border-2 border-amber-500/50 p-1.5 flex items-center justify-center shrink-0 shadow-2xl relative group overflow-hidden bg-slate-950">
            {displayLogo ? (
              <img 
                src={displayLogo} 
                alt="Court Official Emblem" 
                className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105" 
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                <Landmark className="w-10 h-10 text-amber-400" />
              </div>
            )}
            {/* Stamp / Verified Indicator Badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-slate-950 text-[10px] font-bold shadow" title="Verified Institutional Court Tenant">
              ✓
            </div>
          </div>

          {/* Institution Title & Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3 h-3 text-amber-400" />
                <span>{getLevelLabel(courtLevel)}</span>
              </span>

              {institution?.region && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[10px] font-bold">
                  📍 {institution.region}
                </span>
              )}

              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] font-bold flex items-center gap-1">
                <span>🌐 Link:</span>
                <span className="text-amber-300">{getCourtLinkDetails({ id: institution?.id || 'inst', name: displayCourtName, courtLevel, customCourtName: institution?.customCourtName }).fullHttpUrl}</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>RESTRICTED ACCESS ACTIVE</span>
              </span>
            </div>

            {/* Prominent Court Institution Name */}
            <h1 className="text-2xl sm:text-3xl font-black font-serif-legal text-white tracking-tight leading-snug drop-shadow-sm">
              {displayCourtName}
            </h1>

            {/* Subtitle / Session User Info */}
            <div className="flex items-center gap-3 text-xs text-slate-300 font-medium flex-wrap pt-0.5">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-200 font-bold">
                  {session?.user?.fullName || profile?.visitorName || 'Authorized Personnel'}
                </span>
              </div>
              <span className="text-slate-600">•</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[11px] font-mono border border-slate-700 font-bold uppercase">
                {userRole.replace('_', ' ')}
              </span>
              {session?.user?.bench && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400 text-[11px] font-semibold">
                    ⚖️ {session.user.bench}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-end md:self-auto">
          {canManageBranding && onOpenBrandingModal && (
            <button
              type="button"
              onClick={onOpenBrandingModal}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>🎨 Loogoo & Maqaa Jijjiiri</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLockFolder}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow hover:text-white"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>🔒 Cufi (Lock Folder)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DynamicCourtHeader;
