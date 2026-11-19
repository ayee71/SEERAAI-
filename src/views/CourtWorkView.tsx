import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  LogOut, 
  Camera,
  Gavel,
  Share2
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { 
  isCourtAccessAuthorized, 
  getActiveCourtSession, 
  loginAsCourtAdmin, 
  loginAsCourtUser, 
  submitCourtAccessRequest, 
  clearCourtSession, 
  getLocalInstitutions, 
  getLocalCourtUsers, 
  ActiveCourtSession,
  CourtLevelType
} from '../services/courtInstitutionService';
import { isOwnerAccount } from '../services/ownerAuth';
import { getStoredOwnerKey } from '../services/referralTracking';
import { downloadCaseSummaryPDF } from '../services/caseSummaryService';
import { createShareableUrl } from '../services/shareUrl';

import { CourtGateView } from '../components/CourtGateView';
import { RestrictedAccessView } from '../components/RestrictedAccessView';
import { PersonnelAnalyticsDashboard } from '../components/PersonnelAnalyticsDashboard';
import { CourtAdminPanel } from '../components/CourtAdminPanel';
import { CourtDocumentList } from '../components/CourtDocumentList';
import { ConfidentialityQuickBar } from '../components/ConfidentialityQuickBar';
import { ConfidentialityShieldModal } from '../components/ConfidentialityShieldModal';
import { CourtroomAuditLogs } from '../components/CourtroomAuditLogs';
import { WitnessSchedulingModule } from '../components/WitnessSchedulingModule';
import { AudioStreamVisualizer } from '../components/AudioStreamVisualizer';

interface CourtWorkViewProps {
  currentLang: Language;
  initialLevel?: 'first' | 'high' | 'supreme' | 'cassation';
}

export const CourtWorkView: React.FC<CourtWorkViewProps> = ({ currentLang, initialLevel }) => {
  const { user, profile } = useAuth();

  const isOwner = isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );

  const userEmail = (user?.email || (profile as any)?.email || localStorage.getItem('seera_owner_email') || '').toLowerCase().trim();
  const isAuthorizedFlag = localStorage.getItem('seera_court_access_authorized') === 'true';
  const isGurbicha = userEmail === 'gurbicha@gmail.com';
  const role = (profile as any)?.role || profile?.role || 'guest';
  const hasCourtPersonnelRole = 
    isOwner ||
    isAuthorizedFlag ||
    isGurbicha ||
    role === 'court_personnel' ||
    role === 'admin' ||
    role === 'judge';

  const [selectedLevel, setSelectedLevel] = useState<'first' | 'high' | 'supreme' | 'cassation' | null>(initialLevel || null);
  const [activeSession, setActiveSession] = useState<ActiveCourtSession | null>(getActiveCourtSession());
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => Boolean(isCourtAccessAuthorized()));
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [gateTab, setGateTab] = useState<'user_login' | 'staff_register_form' | 'admin_login' | 'request_access' | 'oromia_directory'>('user_login');
  const [userLoginId, setUserLoginId] = useState('');
  const [userPasscode, setUserPasscode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [adminEmail, setAdminEmail] = useState('');
  const [adminCode, setAdminCode] = useState('');

  // Access Request states
  const [reqCourtName, setReqCourtName] = useState('');
  const [reqRegion, setReqRegion] = useState('');
  const [reqLevel, setReqLevel] = useState<CourtLevelType>('high_court');
  const [reqProposedAdminName, setReqProposedAdminName] = useState('');
  const [reqProposedAdminEmail, setReqProposedAdminEmail] = useState('');
  const [reqProposedAdminPhone, setReqProposedAdminPhone] = useState('');
  const [reqOutgoingRefNo, setReqOutgoingRefNo] = useState('');
  const [reqOfficialLetter, setReqOfficialLetter] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqHasStamp, setReqHasStamp] = useState(true);
  const [requestSubmittedMsg, setRequestSubmittedMsg] = useState<string | null>(null);

  const [oromiaCourtSearch, setOromiaCourtSearch] = useState('');
  const [oromiaZoneFilter, setOromiaZoneFilter] = useState('all');
  const [showCourtConfidentialityModal, setShowCourtConfidentialityModal] = useState(false);
  const [selectedCaseForAudit, setSelectedCaseForAudit] = useState<string | null>(null);

  const [courtDocuments, setCourtDocuments] = useState<any[]>([
    { 
      id: 'doc-1', 
      title: 'Himannaa Haqaa Haaraa fi Ragaalee Walitti Qabaman', 
      caseNumber: 'CR-2026/089', 
      filingDate: '2026-10-12', 
      type: 'Claim', 
      author: 'Abbaa Alangaa Caalaa', 
      isVerified: true, 
      paymentStatus: 'verified',
      status: 'Closed',
      assignedJudge: 'Abbaa Seeraa Caalaa'
    },
    { 
      id: 'doc-2', 
      title: 'Sanada Ragaa Bittaa-Gurgurtaa', 
      caseNumber: 'CR-2026/090', 
      filingDate: '2026-10-13', 
      type: 'Evidence', 
      author: 'Ogeessa Seeraa Galmee', 
      isVerified: false, 
      paymentStatus: 'pending',
      status: 'Active',
      assignedJudge: 'Abbaa Seeraa Geetaachoo'
    },
  ]);

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [docStatusFilter, setDocStatusFilter] = useState('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [workSubTab, setWorkSubTab] = useState<'documents' | 'witness_scheduling' | 'analytics' | 'live_stream'>('documents');
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  const analyticsDataByStatus = React.useMemo(() => {
    const counts = courtDocuments.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as any);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [courtDocuments]);

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    const res = await loginAsCourtUser(userLoginId, userPasscode);
    setIsLoggingIn(false);
    if (res.success && res.session) {
      setActiveSession(res.session);
      setIsAuthorized(true);
    } else {
      setLoginError(res.message);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    const res = await loginAsCourtAdmin(adminEmail, adminCode);
    setIsLoggingIn(false);
    if (res.success && res.session) {
      setActiveSession(res.session);
      setIsAuthorized(true);
      setShowAdminPanel(true);
    } else {
      setLoginError(res.message);
    }
  };

  const handleLogoutBench = () => {
    clearCourtSession();
    setActiveSession(null);
    setIsAuthorized(false);
    setShowAdminPanel(false);
  };

  // Listen for session updates
  useEffect(() => {
    const handleSessionChange = () => {
      const sess = getActiveCourtSession();
      setActiveSession(sess);
      setIsAuthorized(isCourtAccessAuthorized());
    };
    window.addEventListener('seera_court_session_changed', handleSessionChange);
    return () => window.removeEventListener('seera_court_session_changed', handleSessionChange);
  }, []);

  if (!isAuthorized && !hasCourtPersonnelRole) {
    return <RestrictedAccessView currentLang={currentLang} onNavigateHome={() => window.location.reload()} />;
  }

  if (!hasCourtPersonnelRole && !isAuthorized) {
    return (
      <CourtGateView 
        currentLang={currentLang}
        gateTab={gateTab}
        setGateTab={setGateTab}
        loginError={loginError}
        setLoginError={setLoginError}
        loginSuccess={loginSuccess}
        analyticsDataByStatus={analyticsDataByStatus}
        analyticsDataByPriority={[]}
        activeSession={activeSession}
        userLoginId={userLoginId}
        setUserLoginId={setUserLoginId}
        userPasscode={userPasscode}
        setUserPasscode={setUserPasscode}
        isLoggingIn={isLoggingIn}
        handleUserLogin={handleUserLogin}
        demoCourtUsers={getLocalCourtUsers()}
        handleQuickDemoFill={(u) => { setUserLoginId(u.usernameOrEmail); setUserPasscode(u.passcode); }}
        adminEmail={adminEmail}
        setAdminEmail={setAdminEmail}
        adminCode={adminCode}
        setAdminCode={setAdminCode}
        handleAdminLogin={handleAdminLogin}
        demoInstitutions={getLocalInstitutions()}
        handleQuickAdminDemoFill={(email, code) => { setAdminEmail(email); setAdminCode(code); }}
        requestSubmittedMsg={requestSubmittedMsg}
        setRequestSubmittedMsg={setRequestSubmittedMsg}
        handleRequestSubmit={async (e) => {
          e.preventDefault();
          const res = await submitCourtAccessRequest({
            institutionName: reqCourtName,
            contactPerson: reqProposedAdminName,
            email: reqProposedAdminEmail,
            phone: reqProposedAdminPhone,
            courtLevel: reqLevel,
            jurisdiction: reqRegion || 'Oromia',
            outgoingRefNo: reqOutgoingRefNo,
            officialLetterContent: reqOfficialLetter,
            proposedAdminName: reqProposedAdminName,
            proposedAdminEmail: reqProposedAdminEmail,
            proposedAdminPhone: reqProposedAdminPhone,
            hasOfficialStamp: reqHasStamp,
          });
          if (res.success) setRequestSubmittedMsg(res.message);
        }}
        reqCourtName={reqCourtName}
        setReqCourtName={setReqCourtName}
        reqRegion={reqRegion}
        setReqRegion={setReqRegion}
        reqLevel={reqLevel}
        setReqLevel={setReqLevel}
        reqOutgoingRefNo={reqOutgoingRefNo}
        setReqOutgoingRefNo={setReqOutgoingRefNo}
        reqProposedAdminName={reqProposedAdminName}
        setReqProposedAdminName={setReqProposedAdminName}
        reqProposedAdminEmail={reqProposedAdminEmail}
        setReqProposedAdminEmail={setReqProposedAdminEmail}
        reqProposedAdminPhone={reqProposedAdminPhone}
        setReqProposedAdminPhone={setReqProposedAdminPhone}
        reqHasStamp={reqHasStamp}
        setReqHasStamp={setReqHasStamp}
        reqOfficialLetter={reqOfficialLetter}
        setReqOfficialLetter={setReqOfficialLetter}
        reqNotes={reqNotes}
        setReqNotes={setReqNotes}
        oromiaCourtSearch={oromiaCourtSearch}
        setOromiaCourtSearch={setOromiaCourtSearch}
        oromiaZoneFilter={oromiaZoneFilter}
        setOromiaZoneFilter={setOromiaZoneFilter}
        getLocalCourtUsers={getLocalCourtUsers}
        getLocalInstitutions={getLocalInstitutions}
      />
    );
  }

  const outcomeTrends = React.useMemo(() => [
    { month: 'Jun', won: 12, lost: 5, pending: 8, dismissed: 2 },
    { month: 'Jul', won: 15, lost: 7, pending: 10, dismissed: 3 },
    { month: 'Aug', won: 10, lost: 4, pending: 12, dismissed: 1 },
    { month: 'Sep', won: 18, lost: 6, pending: 9, dismissed: 4 },
    { month: 'Oct', won: 22, lost: 8, pending: 15, dismissed: 2 },
  ], []);

  const durationStats = React.useMemo(() => [
    { month: 'Jun', avgDays: 45 },
    { month: 'Jul', avgDays: 38 },
    { month: 'Aug', avgDays: 52 },
    { month: 'Sep', avgDays: 41 },
    { month: 'Oct', avgDays: 35 },
  ], []);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                🟢 Dhaddacha Mirkanaa'aa
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activeSession?.courtLevel.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {activeSession?.courtName || 'Mana Murtii'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-amber-400">
                {activeSession?.user.role === 'court_admin' ? '👑 Bulchaa' : `⚖️ ${activeSession?.user.fullName}`}
              </span>
              {activeSession?.user.bench && <span>• {activeSession.user.bench}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeSession?.user.role === 'court_admin' && (
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                showAdminPanel ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-300 border border-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{showAdminPanel ? 'Gara Dhaddachaatti' : 'Bulchiinsa Hojjettootaa'}</span>
            </button>
          )}

          <button
            onClick={() => {
              const url = createShareableUrl({ tab: 'courtWork', lang: currentLang });
              if (navigator.share) {
                navigator.share({ title: 'SeeraAI - Court Work', url }).catch(console.error);
              } else {
                navigator.clipboard.writeText(url);
                alert('Link qooddinsaa koppii godhameera!');
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={handleLogoutBench}
            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Ba'i</span>
          </button>
        </div>
      </div>

      {showAdminPanel && activeSession?.user.role === 'court_admin' ? (
        <CourtAdminPanel 
          currentLang={currentLang}
          activeSession={activeSession}
          onNavigateToBench={(level) => setSelectedLevel(level)}
          onRefreshRoster={() => {}}
        />
      ) : (
        <div className="space-y-6">
          {/* 6 Modules Navigation Strip inside Court Work */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏛️</span>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base font-serif-legal">
                    {currentLang === 'om' ? 'Moduloota Mana Murtii (6)' : currentLang === 'am' ? 'የፍርድ ቤት ሞጁሎች (6)' : 'Court Work Modules (6)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentLang === 'om' ? 'Bulchiinsa ➔ Galmee ➔ Sanadoota ➔ Nageenya ➔ Xiinxala ➔ Walqunnamtii' : 'Administration & Setting ➔ Communication'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('seera_navigate_tab', { detail: { tab: 'personnelFolder' } }))}
                className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold border border-amber-500/30 cursor-pointer transition-all"
              >
                {currentLang === 'om' ? 'Fooldara Guutuu ➔' : 'Full Folder ➔'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { id: 'control', label: '1. Admin & Setting', icon: '🏢', tab: 'control' },
                { id: 'litigation', label: '2. Case Mgmt (Core)', icon: '⚖️', tab: 'courtWork' },
                { id: 'dms', label: '3. DMS & Evidence', icon: '📂', tab: 'library' },
                { id: 'security', label: '4. Security & Auth', icon: '🛡️', tab: 'settings' },
                { id: 'analytics', label: '5. Analysis & Report', icon: '📊', tab: 'analyticsFeedback' },
                { id: 'communication', label: '6. Communication', icon: '💬', tab: 'meeting' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => window.dispatchEvent(new CustomEvent('seera_navigate_tab', { detail: { tab: m.tab } }))}
                  className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-400/50 hover:bg-slate-850 text-left transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <span className="text-lg mb-1 group-hover:scale-110 transition-transform">{m.icon}</span>
                  <span className="text-[11px] font-semibold text-slate-200 group-hover:text-amber-300 truncate">
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Tab Navigation Strip */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setWorkSubTab('documents')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                workSubTab === 'documents'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>📄</span>
              <span>{currentLang === 'om' ? 'Sanadoota Galmee' : currentLang === 'am' ? 'የመዝገብ ሰነዶች' : 'Court Documents'}</span>
            </button>

            <button
              onClick={() => setWorkSubTab('witness_scheduling')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                workSubTab === 'witness_scheduling'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>👥</span>
              <span>{currentLang === 'om' ? 'Beellama Ragaalee (Witness Scheduling)' : currentLang === 'am' ? 'የምስክሮች ቀጠሮ' : 'Witness Scheduling'}</span>
            </button>

            <button
              onClick={() => setWorkSubTab('analytics')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                workSubTab === 'analytics'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>📊</span>
              <span>{currentLang === 'om' ? 'Xiinxala & Gabaasa' : currentLang === 'am' ? 'ትንታኔ እና ሪፖርት' : 'Analytics & Dashboard'}</span>
            </button>

            <button
              onClick={() => setWorkSubTab('live_stream')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                workSubTab === 'live_stream'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveStreaming ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveStreaming ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
              </span>
              <span>{currentLang === 'om' ? 'Tiraansikriptii Laayiv' : currentLang === 'am' ? 'ቀጥታ ትርጓሜ' : 'Live Transcript'}</span>
            </button>
          </div>

          {workSubTab === 'live_stream' && (
            <div className="space-y-4">
              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isLiveStreaming ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isLiveStreaming ? 'Stop Stream' : 'Start Stream'}
              </button>
              <AudioStreamVisualizer isStreaming={isLiveStreaming} transcript={liveTranscript} />
            </div>
          )}

          {workSubTab === 'witness_scheduling' && (
            <WitnessSchedulingModule currentLang={currentLang} />
          )}

          {workSubTab === 'analytics' && (
            <PersonnelAnalyticsDashboard 
              analyticsDataByStatus={analyticsDataByStatus.map((d: any) => ({ name: d.name, value: Number(d.value) || 0 }))}
              analyticsDataByPriority={[
                { name: 'High', value: 12 },
                { name: 'Medium', value: 24 },
                { name: 'Low', value: 8 }
              ]}
              outcomeTrends={outcomeTrends}
              durationStats={durationStats}
              activeSession={activeSession}
            />
          )}

          {workSubTab === 'documents' && (
            <CourtDocumentList 
              currentLang={currentLang}
              documents={courtDocuments}
              selectedIds={selectedDocumentIds}
              onToggleSelect={(id) => setSelectedDocumentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
              onToggleSelectAll={() => setSelectedDocumentIds(prev => prev.length === courtDocuments.length ? [] : courtDocuments.map(d => d.id))}
              onAction={(doc, action) => {
                if (action === 'download') {
                  downloadCaseSummaryPDF(doc as any, currentLang, {
                    courtName: activeSession?.courtName,
                    userName: activeSession?.user.fullName,
                    role: activeSession?.user.role,
                  });
                }
              }}
              filters={{
                status: docStatusFilter,
                sortBy: 'newest',
                search: docSearchQuery,
                judge: 'all',
                payment: 'all'
              }}
              onFilterChange={(key, val) => {
                if (key === 'status') setDocStatusFilter(val);
                if (key === 'search') setDocSearchQuery(val);
              }}
              onViewAuditLogs={(caseNum) => setSelectedCaseForAudit(caseNum)}
            />
          )}
        </div>
      )}

      <ConfidentialityShieldModal
        isOpen={showCourtConfidentialityModal}
        onClose={() => setShowCourtConfidentialityModal(false)}
        currentLang={currentLang}
      />

      {selectedCaseForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CourtroomAuditLogs
              currentLang={currentLang}
              caseNumber={selectedCaseForAudit}
              onClose={() => setSelectedCaseForAudit(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CourtWorkView;
