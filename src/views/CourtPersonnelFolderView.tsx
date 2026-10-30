import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { CourtWorkView } from './CourtWorkView';
import { JudicialExpertToolsView } from './JudicialExpertToolsView';
import { CourtScheduleView } from './CourtScheduleView';
import { CassationLibraryView } from './CassationLibraryView';
import { RestrictedAccessView } from '../components/RestrictedAccessView';
import { CourtTranscriptD3Chart } from '../components/CourtTranscriptD3Chart';
import { LitigationLifecycleWorkflowManager } from '../components/LitigationLifecycleWorkflowManager';
import { getActiveCourtSession, getLocalInstitutions, isCourtAccessAuthorized, loginAsCourtAdmin, loginAsCourtUser } from '../services/courtInstitutionService';
import { isOwnerAccount } from '../services/ownerAuth';
import { getStoredOwnerKey } from '../services/referralTracking';
import { Landmark, Lock, ShieldCheck, UserCheck, Key, Mail, User, ShieldAlert, ArrowRight, Gavel, Calendar, FileText, Scale, Building2, Search, Workflow } from 'lucide-react';

import { DynamicCourtHeader } from '../components/DynamicCourtHeader';
import { CourtTenantBrandingModal } from '../components/CourtTenantBrandingModal';
import { CourtDomainLauncherBar } from '../components/CourtDomainLauncherBar';
import { CourtFolderGateway } from '../components/CourtFolderGateway';
import { CourtFolderExplorer } from '../components/CourtFolderExplorer';
import { CourtFolderUserGuide } from '../components/CourtFolderUserGuide';

interface CourtPersonnelFolderViewProps {
  currentLang: Language;
  initialLevel?: 'first' | 'high' | 'cassation';
}

type CourtFolderTab = 'overview' | 'folders_explorer' | 'folder_user_guide' | 'litigation_workflow' | 'judge_work' | 'first_instance' | 'high_court' | 'cassation' | 'calendar';

export const CourtPersonnelFolderView: React.FC<CourtPersonnelFolderViewProps> = ({
  currentLang,
  initialLevel,
}) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();

  const activeSession = getActiveCourtSession();
  const allInstitutions = getLocalInstitutions();
  const currentInst = allInstitutions.find((i: any) => i.id === activeSession?.institutionId) || allInstitutions[0];

  const [showBrandingModal, setShowBrandingModal] = useState(false);

  const isOwner = isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );

  const firestoreRole = profile?.role;
  const hasCourtPersonnelRole = 
    isOwner ||
    firestoreRole === 'court_personnel' ||
    firestoreRole === 'judge' ||
    firestoreRole === 'registrar' ||
    firestoreRole === 'prosecutor' ||
    firestoreRole === 'admin';

  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return Boolean(hasCourtPersonnelRole || isCourtAccessAuthorized());
  });

  const [activeFolderTab, setActiveFolderTab] = useState<CourtFolderTab>(() => {
    if (initialLevel === 'first') return 'first_instance';
    if (initialLevel === 'high') return 'high_court';
    if (initialLevel === 'cassation') return 'cassation';
    return 'overview';
  });

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!usernameOrEmail.trim() || !password.trim()) {
      setAuthError(
        currentLang === 'om'
          ? 'Maaloo Username/Email fi Passcode guutaa.'
          : 'እባክዎ የተጠቃሚ ስም/ኢሜይል እና የይለፍ ቃል ያስገቡ።'
      );
      return;
    }

    setIsVerifying(true);
    try {
      // Try admin login first if email contains admin or password matches admin
      const adminRes = await loginAsCourtAdmin(usernameOrEmail, password);
      if (adminRes.success) {
        setIsAuthorized(true);
        setIsVerifying(false);
        return;
      }

      // Try institutional court user login
      const userRes = await loginAsCourtUser(usernameOrEmail, password);
      if (userRes.success) {
        setIsAuthorized(true);
        setIsVerifying(false);
        return;
      }

      // Fallback permissive login for demo/testing staff accounts
      if (
        (usernameOrEmail.includes('@') && password.length >= 4) ||
        usernameOrEmail.toLowerCase().includes('court') ||
        usernameOrEmail.toLowerCase().includes('judge') ||
        password === 'admin123' ||
        password === 'court2026' ||
        password === 'GURBICHA-2026'
      ) {
        // Initialize a valid session for Gurbicha or generic court
        import('../services/courtInstitutionService').then(({ setActiveCourtSession }) => {
          setActiveCourtSession({
            type: 'judge_or_staff',
            institutionId: usernameOrEmail.includes('gurbicha') ? 'inst_gurbicha_woreda_first' : 'inst_oromia_supreme',
            courtName: usernameOrEmail.includes('gurbicha') ? 'Mana Murtii Aanaa Gurbicha' : 'Mana Murtii Waliigalaa Oromiyaa',
            courtLevel: usernameOrEmail.includes('gurbicha') ? 'first_instance' : 'supreme_court',
            user: {
              id: 'staff_auth_' + Date.now(),
              fullName: usernameOrEmail.split('@')[0] || 'Court Staff',
              emailOrUsername: usernameOrEmail,
              role: usernameOrEmail.includes('ab') ? 'judge' : usernameOrEmail.includes('ktas') ? 'registrar' : 'registrar',
              bench: 'Dhaddacha Waliigalaa',
            },
            sessionStartedAt: new Date().toISOString(),
          });
        });
        setIsAuthorized(true);
        setIsVerifying(false);
        return;
      }

      setAuthError(userRes.message || (currentLang === 'om' ? 'Ragaan Hojjataa Mana Murtii galchitan sirrii miti.' : 'ያስገቡት የፍርድ ቤት ሰራተኛ መረጃ ትክክል አይደለም።'));
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error');
    } finally {
      setIsVerifying(false);
    }
  };

  // If authorized, render the complete Court Personnel Folder containing all modules
  if (isAuthorized) {
    return (
      <div className="space-y-6 animate-folder-fade-in">
        {/* Court Folder Management Gateway (Integrated Branding & Navigation) */}
        <CourtFolderGateway 
          currentLang={currentLang}
          onNavigate={(tab) => {
            if (tab === 'branding_settings') setShowBrandingModal(true);
            else setActiveFolderTab(tab as any);
          }}
        />

        {/* Internal Navigation Tabs for all Court Personnel Sub-modules */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-lg">
          {[
            { id: 'overview' as CourtFolderTab, label: currentLang === 'om' ? '📊 Waliigala & Live D3' : 'ማጠቃለያ & D3', emoji: '📊' },
            { id: 'folders_explorer' as CourtFolderTab, label: currentLang === 'om' ? '📂 Fooldara & Sanadoota' : 'ማህደሮች እና ሰነዶች', emoji: '📂' },
            { id: 'folder_user_guide' as CourtFolderTab, label: currentLang === 'om' ? '📖 Qajeelfama Fooldaraa & Fakkeenya' : currentLang === 'am' ? '📖 የማህደር አጠቃቀም መመሪያ' : '📖 Folder Guide & Examples', emoji: '📖' },
            { id: 'litigation_workflow' as CourtFolderTab, label: currentLang === 'om' ? '⚖️ Galmee, Mormii & Waamicha' : 'የክስ አቀባበል እና መጥሪያ', emoji: '⚖️' },
            { id: 'judge_work' as CourtFolderTab, label: currentLang === 'om' ? '⚖️ Hojii Abbaa Seeraa' : 'የዳኛ ሥራ', emoji: '⚖️' },
            { id: 'first_instance' as CourtFolderTab, label: currentLang === 'om' ? '🏛️ Sadarkaa Jalqabaa' : 'የኛ ደረጃ', emoji: '🏛️' },
            { id: 'high_court' as CourtFolderTab, label: currentLang === 'om' ? '🏢 Mana Murtii Olaanaa' : 'ከፍተኛ ፍርድ ቤት', emoji: '🏢' },
            { id: 'cassation' as CourtFolderTab, label: currentLang === 'om' ? '⚖️ Dhaddacha Ijibbaataa' : 'የሰበር ችሎት', emoji: '⚖️' },
            { id: 'calendar' as CourtFolderTab, label: currentLang === 'om' ? '📅 Kalandara Beellamaa' : 'የቀጠሮ ካንደር', emoji: '📅' },
            { id: 'research' as any, label: currentLang === 'om' ? '🔍 Qorannoo Seeraa' : 'የሕግ ምርምር', emoji: '🔍' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFolderTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 relative ${
                activeFolderTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              {tab.id === 'calendar' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          ))}
        </div>

        {/* Sub-module Content Rendering with Dynamic Fade-In Transition */}
        <div key={activeFolderTab} className="animate-folder-fade-in">
          {activeFolderTab === 'overview' && (
            <div className="space-y-6">
              <CourtTranscriptD3Chart currentLang={currentLang} />
              <CourtFolderExplorer 
                currentLang={currentLang}
                institutionName={currentInst?.customCourtName || currentInst?.name || activeSession?.courtName}
                institutionId={currentInst?.id || activeSession?.institutionId}
                currentUser={activeSession?.user ? { fullName: activeSession.user.fullName, role: activeSession.user.role } : undefined}
              />
              <CourtWorkView currentLang={currentLang} initialLevel={initialLevel} />
            </div>
          )}

          {activeFolderTab === 'folders_explorer' && (
            <div>
              <CourtFolderExplorer 
                currentLang={currentLang}
                institutionName={currentInst?.customCourtName || currentInst?.name || activeSession?.courtName}
                institutionId={currentInst?.id || activeSession?.institutionId}
                currentUser={activeSession?.user ? { fullName: activeSession.user.fullName, role: activeSession.user.role } : undefined}
              />
            </div>
          )}

        {activeFolderTab === 'folder_user_guide' && (
          <div className="animate-in fade-in duration-200">
            <CourtFolderUserGuide currentLang={currentLang} />
          </div>
        )}

        {activeFolderTab === 'litigation_workflow' && (
          <div className="animate-in fade-in duration-200">
            <LitigationLifecycleWorkflowManager currentLang={currentLang} />
          </div>
        )}

        {activeFolderTab === 'judge_work' && (
          <div className="animate-in fade-in duration-200">
            <JudicialExpertToolsView currentLang={currentLang} />
          </div>
        )}

        {activeFolderTab === 'first_instance' && (
          <div className="animate-in fade-in duration-200">
            <CourtWorkView currentLang={currentLang} initialLevel="first" />
          </div>
        )}

        {activeFolderTab === 'high_court' && (
          <div className="animate-in fade-in duration-200">
            <CourtWorkView currentLang={currentLang} initialLevel="high" />
          </div>
        )}

        {activeFolderTab === 'cassation' && (
          <div className="animate-in fade-in duration-200">
            <CassationLibraryView currentLang={currentLang} />
          </div>
        )}

        {activeFolderTab === 'calendar' && (
          <div className="animate-in fade-in duration-200">
            <CourtScheduleView currentLang={currentLang} />
          </div>
        )}

          {(activeFolderTab as any) === 'research' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber-500" />
                  Staff Research Assistant
                </h3>
                <CassationLibraryView currentLang={currentLang} />
              </div>
            </div>
          )}
        </div>

        {/* Branding & Logo Customization Modal for Super-Admin / Court Authority */}
        {showBrandingModal && currentInst && (
          <CourtTenantBrandingModal
            currentLang={currentLang}
            institution={currentInst}
            onClose={() => setShowBrandingModal(false)}
            onUpdated={() => {
              window.dispatchEvent(new CustomEvent('seera_court_session_changed', { detail: getActiveCourtSession() }));
            }}
          />
        )}
      </div>
    );
  }

  // Non-authorized: Render Restricted Access view & Staff Login prompt
  return (
    <div className="space-y-6">
      <RestrictedAccessView
        currentLang={currentLang}
        onNavigateHome={() => window.location.assign('/?tab=home')}
      />

      <div className="max-w-xl mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
          <Key className="w-4 h-4" />
          <span>Mirkaneessa Hojjataa Mana Murtii (Court Personnel Authentication)</span>
        </h3>

        <form onSubmit={handleStaffLogin} className="space-y-4">
          {authError && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-medium">Username ykn Email Hojjataa:</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={usernameOrEmail}
                onChange={e => setUsernameOrEmail(e.target.value)}
                placeholder="e.g. court.personnel@seeraai.et"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-medium">Passcode / Jecha Iccitii:</label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all disabled:opacity-50"
          >
            {isVerifying ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Mana Murtii Seeni (Authorize Access)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Login for Mana Murtii Aanaa Gurbicha Personnel */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <div className="text-[11px] font-bold text-amber-300 font-mono flex items-center gap-1.5">
            <span>🏛️</span>
            <span>Fakkeenya Mana Murtii Aanaa Gurbicha (1-Click Quick Login):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { name: 'Super Admin: Gurbicha D.', email: 'gurbicha.d@court.oromia.et', role: 'Admin' },
              { name: 'Abbaa Seeraa: Gurbicha Ab.', email: 'gurbicha.ab@court.oromia.et', role: 'Judge' },
              { name: 'Qindeessaa KTAS: Gurbicha K.', email: 'gurbicha.ktas@court.oromia.et', role: 'KTAS' },
              { name: 'Ofiisara Seeraa: Gurbicha Ofi.', email: 'gurbicha.ofi@court.oromia.et', role: 'Registrar' }
            ].map(staff => (
              <button
                key={staff.email}
                type="button"
                onClick={async () => {
                  setUsernameOrEmail(staff.email);
                  setPassword('GURBICHA-2026');
                  import('../services/courtInstitutionService').then(({ setActiveCourtSession }) => {
                    setActiveCourtSession({
                      type: 'judge_or_staff',
                      institutionId: 'inst_gurbicha_woreda_first',
                      courtName: 'Mana Murtii Aanaa Gurbicha',
                      courtLevel: 'first_instance',
                      user: {
                        id: 'gurbicha_' + staff.role.toLowerCase(),
                        fullName: staff.name,
                        emailOrUsername: staff.email,
                        role: staff.role === 'Judge' ? 'judge' : 'registrar',
                        bench: staff.role === 'KTAS' ? 'Qindeessaa KTAS' : 'Dhaddacha Waliigalaa',
                      },
                      sessionStartedAt: new Date().toISOString(),
                    });
                    setIsAuthorized(true);
                  });
                }}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-amber-500/15 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                  {staff.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {staff.email} • <span className="text-amber-400">{staff.role}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default CourtPersonnelFolderView;
