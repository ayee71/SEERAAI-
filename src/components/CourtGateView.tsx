import React from 'react';
import { 
  ShieldAlert, 
  UserCheck, 
  Key, 
  Landmark, 
  Building, 
  Gavel, 
  Search, 
  MapPin, 
  Users, 
  Filter, 
  Lock, 
  RefreshCw, 
  Send, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { PersonnelAnalyticsDashboard } from './PersonnelAnalyticsDashboard';
import { 
  ActiveCourtSession, 
  CourtUser, 
  CourtInstitution, 
  CourtLevelType 
} from '../services/courtInstitutionService';
import { Language } from '../i18n/translations';
import { searchOromiaCourts, OROMIA_ZONES_AND_CITIES } from '../data/courts/oromiaCourts';

interface CourtGateViewProps {
  currentLang: Language;
  gateTab: 'user_login' | 'staff_register_form' | 'admin_login' | 'request_access' | 'oromia_directory';
  setGateTab: (tab: any) => void;
  loginError: string | null;
  setLoginError: (err: string | null) => void;
  loginSuccess: string | null;
  analyticsDataByStatus: any[];
  analyticsDataByPriority: any[];
  activeSession: ActiveCourtSession | null;
  userLoginId: string;
  setUserLoginId: (val: string) => void;
  userPasscode: string;
  setUserPasscode: (val: string) => void;
  isLoggingIn: boolean;
  handleUserLogin: (e: React.FormEvent) => void;
  demoCourtUsers: CourtUser[];
  handleQuickDemoFill: (u: CourtUser) => void;
  adminEmail: string;
  setAdminEmail: (val: string) => void;
  adminCode: string;
  setAdminCode: (val: string) => void;
  handleAdminLogin: (e: React.FormEvent) => void;
  demoInstitutions: CourtInstitution[];
  handleQuickAdminDemoFill: (email: string, code: string) => void;
  requestSubmittedMsg: string | null;
  setRequestSubmittedMsg: (val: string | null) => void;
  handleRequestSubmit: (e: React.FormEvent) => void;
  reqCourtName: string;
  setReqCourtName: (val: string) => void;
  reqRegion: string;
  setReqRegion: (val: string) => void;
  reqLevel: CourtLevelType;
  setReqLevel: (val: CourtLevelType) => void;
  reqOutgoingRefNo: string;
  setReqOutgoingRefNo: (val: string) => void;
  reqProposedAdminName: string;
  setReqProposedAdminName: (val: string) => void;
  reqProposedAdminEmail: string;
  setReqProposedAdminEmail: (val: string) => void;
  reqProposedAdminPhone: string;
  setReqProposedAdminPhone: (val: string) => void;
  reqHasStamp: boolean;
  setReqHasStamp: (val: boolean) => void;
  reqOfficialLetter: string;
  setReqOfficialLetter: (val: string) => void;
  reqNotes: string;
  setReqNotes: (val: string) => void;
  oromiaCourtSearch: string;
  setOromiaCourtSearch: (val: string) => void;
  oromiaZoneFilter: string;
  setOromiaZoneFilter: (val: string) => void;
  getLocalCourtUsers: () => CourtUser[];
  getLocalInstitutions: () => CourtInstitution[];
}

export const CourtGateView: React.FC<CourtGateViewProps> = (props) => {
  const {
    currentLang,
    gateTab,
    setGateTab,
    loginError,
    setLoginError,
    loginSuccess,
    analyticsDataByStatus,
    analyticsDataByPriority,
    activeSession,
    userLoginId,
    setUserLoginId,
    userPasscode,
    setUserPasscode,
    isLoggingIn,
    handleUserLogin,
    demoCourtUsers,
    handleQuickDemoFill,
    adminEmail,
    setAdminEmail,
    adminCode,
    setAdminCode,
    handleAdminLogin,
    demoInstitutions,
    handleQuickAdminDemoFill,
    requestSubmittedMsg,
    setRequestSubmittedMsg,
    handleRequestSubmit,
    reqCourtName,
    setReqCourtName,
    reqRegion,
    setReqRegion,
    reqLevel,
    setReqLevel,
    reqOutgoingRefNo,
    setReqOutgoingRefNo,
    reqProposedAdminName,
    setReqProposedAdminName,
    reqProposedAdminEmail,
    setReqProposedAdminEmail,
    reqProposedAdminPhone,
    setReqProposedAdminPhone,
    reqHasStamp,
    setReqHasStamp,
    reqOfficialLetter,
    setReqOfficialLetter,
    reqNotes,
    setReqNotes,
    oromiaCourtSearch,
    setOromiaCourtSearch,
    oromiaZoneFilter,
    setOromiaZoneFilter,
    getLocalCourtUsers,
    getLocalInstitutions
  } = props;

  return (
    <div className="space-y-8 py-8 max-w-4xl mx-auto px-4 animate-in fade-in duration-500">
      {/* Supreme Restriction Warning Banner */}
      <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-6 text-center space-y-3 shadow-2xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
          <ShieldAlert className="w-9 h-9" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
          <span>🔒</span>
          <span>Eegumsa Dhaabbata Mana Murtii (Court Gate Restricted)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          {currentLang === 'om' 
            ? 'Hojiileen Mana Murtii Nama Kamuuf Banaa Miti' 
            : currentLang === 'am'
            ? 'የፍርድ ቤት ስራዎች ለማንም ሰው ክፍት አይደሉም'
            : 'Court Work Portal is Restricted to Authorized Institutions'}
        </h2>
        <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {currentLang === 'om'
            ? 'Dhaabbanni Mana Murtii gara keenya dhiyaachuun Admin ta\'ee mirkanaa\'ee, Abbootii Seeraafi Ogeessota birootiif User uumee yoo itti fayyadamuu eegale malee kutaan kun nama kamuuf banaa akka hin taane godhameera.'
            : currentLang === 'am'
            ? 'የፍርድ ቤት ተቋም ወደ እኛ ቀርቦ አስተዳዳሪ (Admin) ተደርጎለት ዳኞችና ሌሎች የህግ ባለሙያዎች ተጠቃሚ (User) ተፈጥሮላቸው መጠቀም እስካልጀመሩ ድረስ ይህ ክፍል ለማንም ክፍት አይደለም።'
            : 'Court operations are strictly restricted. Only court institutions provisioned with an Admin account can create and onboard Judges and Legal Officers to access these judicial tools.'}
        </p>
      </div>

      {/* Analytics Dashboard (Visible even to unauthorized, for demo purposes) */}
      <PersonnelAnalyticsDashboard 
        analyticsDataByStatus={analyticsDataByStatus}
        analyticsDataByPriority={analyticsDataByPriority}
        activeSession={activeSession}
      />

      {/* Tab Navigation for Gate */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => { setGateTab('user_login'); setLoginError(null); }}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            gateTab === 'user_login'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Seensa Abbaa Seeraa</span>
        </button>

        <button
          type="button"
          onClick={() => { setGateTab('admin_login'); setLoginError(null); }}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            gateTab === 'admin_login'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Seensa Bulchaa (Admin)</span>
        </button>

        <button
          type="button"
          onClick={() => { setGateTab('oromia_directory'); setLoginError(null); }}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            gateTab === 'oromia_directory'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Manneen Murtii Oromiyaa</span>
        </button>

        <button
          type="button"
          onClick={() => { setGateTab('request_access'); setLoginError(null); }}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            gateTab === 'request_access'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Iyyata Dhaabbataa</span>
        </button>
      </div>

      {/* Notice Banner: Official Stamped Letter & SMS/Email Alert */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/40 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 mt-0.5">📢</span>
          <div className="space-y-0.5">
            <strong className="text-white block font-bold">
              Hubachiisa Manneen Murtii Confirm Tahan fi Confirm Tahuuf Jiran:
            </strong>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Xalayaan mana hojii lakkoofsa bahii qabu, chaappaa mana murtiitiin mirkanaa'e, fi maqaa, imeelii fi lakkoofsa bilbilaa bulchaa adm of keessaa qabu inbox app kanaatti dhiyaachuu qaba. Ergaan SMS fi Email gama lakkoofsa bilbilaa fi email isaaniitiin ergameera.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setGateTab('request_access');
            setLoginError(null);
          }}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer self-start sm:self-center"
        >
          📜 Xalayaa Chaappaan Ergi
        </button>
      </div>

      {/* Status Alerts */}
      {loginError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{loginError}</span>
        </div>
      )}

      {loginSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{loginSuccess}</span>
        </div>
      )}

      {/* 1. JUDGE & COURT STAFF LOGIN */}
      {gateTab === 'user_login' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Seensa Abbootii Seeraa & Ogeessota Dhaddachaa</h3>
              <p className="text-xs text-slate-400">Bulchaa Mana Murtiitiin User kan isiniif uumame qofatu seenuu danda'a.</p>
            </div>
          </div>

          <form onSubmit={handleUserLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Maqaa Fayyadamaa ykn Email (Institutional Username/Email)
              </label>
              <input
                type="text"
                value={userLoginId}
                onChange={(e) => setUserLoginId(e.target.value)}
                placeholder="fkn. caalaa.judge@court.oromia.et"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Jecha Icciitii Dhaddachaa (Bench Passcode)
              </label>
              <input
                type="password"
                value={userPasscode}
                onChange={(e) => setUserPasscode(e.target.value)}
                placeholder="Passcode bulchaan mana murtii kenneef"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              <span>Dhaddacha Seeni (Access Bench Work)</span>
            </button>
          </form>

          {/* Quick Demo Pre-fill for Testing */}
          <div className="pt-4 border-t border-slate-800/80">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
              Fayyadamtoota Eeyyamaman (Authorized Demo Bench Profiles):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoCourtUsers.slice(0, 3).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickDemoFill(u)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/50 text-left transition-all text-xs group cursor-pointer"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-amber-400 flex items-center justify-between">
                    <span>{u.fullName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                      {u.role === 'judge' ? 'Abbaa Seeraa' : 'Ogeessa'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{u.usernameOrEmail}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">Passcode: {u.passcode} (Cuqi)</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. COURT ADMIN LOGIN */}
      {gateTab === 'admin_login' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Seensa Bulchaa Mana Murtii (Court Admin Portal)</h3>
              <p className="text-xs text-slate-400">Bulchaan Mana Murtii Abbootii Seeraafi Ogeessotaaf user uumuuf asii gala.</p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Bulchaa Mana Murtii (Admin Email)
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="fkn. admin@oromiacourt.gov.et"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Koodii Eeyyama Bulchaa (Institutional Admin Code)
              </label>
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="OROMIA-COURT-2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
              <span>Bulchaa Ta'ii Seeni (Enter Court Admin Workspace)</span>
            </button>
          </form>

          {/* Quick Demo Pre-fill for Admins */}
          <div className="pt-4 border-t border-slate-800/80">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
              Manneen Murtii Mirkanaa'an (Approved Court Institutions):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoInstitutions.slice(0, 2).map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => handleQuickAdminDemoFill(inst.adminEmail, inst.accessCode)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/50 text-left transition-all text-xs group cursor-pointer"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-amber-400 truncate">
                    {inst.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{inst.adminEmail}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">Code: {inst.accessCode} (Cuqi)</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. REQUEST COURT ACCESS */}
      {gateTab === 'request_access' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Iyyata Dhaabbata Mana Murtii (Court Onboarding Request)</h3>
              <p className="text-xs text-slate-400">
                Manneen murtii fi Gumiiwwan Abbootii Seeraa qajeelfama kanaan Ayele Be Dha (Super Admin) tti dhiyaatu.
              </p>
            </div>
          </div>

          {requestSubmittedMsg ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-lg font-bold text-emerald-300">Iyyanni Dhaabbataa Dhiyaateera!</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">{requestSubmittedMsg}</p>
              <button
                type="button"
                onClick={() => setRequestSubmittedMsg(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
              >
                Iyyata Biroo Galchi
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Maqaa Mana Murtii *</label>
                  <input
                    type="text"
                    value={reqCourtName}
                    onChange={(e) => setReqCourtName(e.target.value)}
                    placeholder="fkn. Mana Murtii Ol'aanaa Godina Shawaa Bahaa"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Naannoo / Teessoo *</label>
                  <input
                    type="text"
                    value={reqRegion}
                    onChange={(e) => setReqRegion(e.target.value)}
                    placeholder="fkn. Adaamaa / Oromia"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Sadarkaa Mana Murtii</label>
                  <select
                    value={reqLevel}
                    onChange={(e) => setReqLevel(e.target.value as CourtLevelType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="first_instance">Mana Murtii Jalqabaa (First Instance)</option>
                    <option value="high_court">Mana Murtii Ol'aanaa (High Court)</option>
                    <option value="supreme_court">Mana Murtii Waliigalaa (Supreme Court)</option>
                    <option value="cassation">Dhaddacha Ijibbaataa (Cassation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-400 mb-1.5 font-bold">Lakkoofsa Bahii Xalayichaa (Outgoing Ref No) *</label>
                  <input
                    type="text"
                    value={reqOutgoingRefNo}
                    onChange={(e) => setReqOutgoingRefNo(e.target.value)}
                    placeholder="fkn. MMOSHB/104/2026"
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-4 py-2.5 text-xs text-amber-300 focus:outline-none focus:border-amber-400 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Maqaa Bulchaa Mana Murtii (Proposed Admin) *</label>
                  <input
                    type="text"
                    value={reqProposedAdminName}
                    onChange={(e) => setReqProposedAdminName(e.target.value)}
                    placeholder="fkn. Abbaa Seeraa Tasfaayee Gabayyoo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Hojii Bulchaa (Admin Email) *</label>
                  <input
                    type="email"
                    value={reqProposedAdminEmail}
                    onChange={(e) => setReqProposedAdminEmail(e.target.value)}
                    placeholder="court.admin@oromia.gov.et"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Bilbila Bulchaa (Admin Phone) *</label>
                  <input
                    type="tel"
                    value={reqProposedAdminPhone}
                    onChange={(e) => setReqProposedAdminPhone(e.target.value)}
                    placeholder="+251 911 234 567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Official Stamp & Seal Verification Field */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="reqHasStampCheck"
                  checked={reqHasStamp}
                  onChange={(e) => setReqHasStamp(e.target.checked)}
                  className="mt-1 w-4 h-4 text-amber-500 rounded border-slate-700 focus:ring-amber-400"
                />
                <div className="space-y-1">
                  <label htmlFor="reqHasStampCheck" className="text-xs font-bold text-amber-300 cursor-pointer flex items-center gap-1.5">
                    <span>🛡️ Chaappaan Mana Murtii / Mana Hojii Xalayicharratti Rukkutameera</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Xalayaan bahii mana hojii chaappaa fi mallattoo abbaa aangoo malee ergame hin fudhatamu.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-300 mb-1.5 font-bold flex items-center justify-between">
                  <span>📜 Qabiyyee Xalayaa Mana Murtii / Qaama Aangoo Qabu (Official Letter Text) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Xalayaan kun Inbox Abbaa Appiitti ergamee ni mirkanaa'a</span>
                </label>
                <textarea
                  value={reqOfficialLetter}
                  onChange={(e) => setReqOfficialLetter(e.target.value)}
                  rows={4}
                  placeholder="Barreessi ykn koppii godhi: 'Kabajamoo Abbaa Appiitif, Mana murtii keenyaaf sirna dijitaalaa hojiirra oolchuuf bulchaa ta'uun akka nuu eeyyamtan gaafanna. Bulchaan mana murtichaa...'"
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Yaada Dabalataa (Optional Notes)</label>
                <textarea
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  rows={2}
                  placeholder="Odeeffannoo dabalataa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Iyyata Gara Ayele Be Dha (Super Admin) tti Ergi</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* 4. OROMIA COURTS DIRECTORY & EXPERT ASSIGNMENT (Manneen Murtii Naannoo Oromiyaa) */}
      {gateTab === 'oromia_directory' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Manneen Murtii Naannoo Oromiyaa</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {searchOromiaCourts(oromiaCourtSearch, oromiaZoneFilter).length} Argaman
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Ogeessi tokko mana murtii naannoo Oromiyaa keessatti ramadamuun gama admin isaaniitiin akka hojjetuuf filadhaa.
                </p>
              </div>
            </div>

            {/* Quick filter by zone */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={oromiaZoneFilter}
                onChange={(e) => setOromiaZoneFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
              >
                <option value="all">Godinaalee / Magaalaalee Hundumaa</option>
                {OROMIA_ZONES_AND_CITIES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={oromiaCourtSearch}
              onChange={(e) => setOromiaCourtSearch(e.target.value)}
              placeholder="Mana murtii barbaadi (fkn. Adaamaa, Shawaa Bahaa, Shaggar, Jimmaa, Amboo, Dhaddacha Ijoo)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
            />
          </div>

          {/* Directory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
            {searchOromiaCourts(oromiaCourtSearch, oromiaZoneFilter).map((court) => {
              const assignedUsers = getLocalCourtUsers().filter(u => u.institutionId === court.id);
              const isVerified = getLocalInstitutions().find(i => i.id === court.id && i.status === 'active' && i.officialLetterContent && i.officialLetterContent.trim().length >= 15 && i.hasOfficialStamp);
              return (
                <div
                  key={court.id}
                  className={`p-4 rounded-2xl bg-slate-950 border-2 ${isVerified ? 'border-emerald-500/50' : 'border-slate-800/80'} hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        {court.name}
                      </span>
                      {getLocalInstitutions().find(i => i.id === court.id && i.status === 'active' && i.officialLetterContent && i.officialLetterContent.trim().length >= 15 && i.hasOfficialStamp) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/50 bg-emerald-950/20 text-emerald-300 font-mono font-bold shrink-0 flex items-center gap-1" title="Verified by Official Letter">
                          <span>✅</span> Verified by Official Letter
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono font-bold shrink-0">
                        {court.level.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{court.zoneOrCity} • Teessoo: <strong>{court.seat}</strong></span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Email Admin: <strong className="font-mono text-slate-300">{court.contactEmail}</strong>
                    </div>

                    {/* Dhaddachoota jiran (Available Benches) */}
                    <div className="pt-1">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Dhaddachoota:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(court.benches || []).slice(0, 3).map((b, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                            {b.split('(')[0].trim()}
                          </span>
                        ))}
                        {(court.benches?.length || 0) > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500">
                            +{(court.benches?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Staff roster snippet */}
                    <div className="text-[11px] text-emerald-400/90 pt-1 flex items-center gap-1.5 font-mono">
                      <Users className="w-3 h-3" />
                      <span>Ogeessota Ramaddaman: {assignedUsers.length}</span>
                    </div>
                  </div>

                  {/* Quick Access Buttons */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminEmail(court.contactEmail);
                        setAdminCode(court.defaultAdminCode);
                        setGateTab('admin_login');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1"
                    >
                      <Key className="w-3 h-3" />
                      <span>Gama Admin tiin Seeni</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Find first assigned judge or set username suggestion
                        const firstUser = assignedUsers[0];
                        if (firstUser) {
                          setUserLoginId(firstUser.usernameOrEmail);
                          setUserPasscode(firstUser.passcode);
                        } else {
                          setUserLoginId(`ogeessa@${court.contactEmail.split('@')[1] || 'court.oromia.et'}`);
                        }
                        setGateTab('user_login');
                      }}
                      className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-all text-center flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Dhaddacha Seeni</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
