import React, { useState } from 'react';
import { 
  Users, 
  Workflow, 
  FileText, 
  Building, 
  Plus, 
  Copy, 
  Check, 
  Key, 
  RefreshCw,
  LogOut
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { 
  ActiveCourtSession, 
  CourtUser, 
  CourtInstitution, 
  CourtRole,
  updateCourtOfficeLetter,
  createCourtUser,
  toggleCourtUserStatus,
  getLocalCourtUsers,
  getLocalInstitutions
} from '../services/courtInstitutionService';
import { InstitutionManagementView } from '../views/InstitutionManagementView';

interface CourtAdminPanelProps {
  currentLang: Language;
  activeSession: ActiveCourtSession | null;
  onNavigateToBench: (level: 'first' | 'high' | 'supreme' | 'cassation') => void;
  onRefreshRoster: () => void;
}

export const CourtAdminPanel: React.FC<CourtAdminPanelProps> = ({
  currentLang,
  activeSession,
  onNavigateToBench,
  onRefreshRoster
}) => {
  const [adminWorkspaceTab, setAdminWorkspaceTab] = useState<'workflows' | 'roster' | 'office_letter'>('workflows');
  
  // Office Letter editing state
  const [adminLetterRefNo, setAdminLetterRefNo] = useState('');
  const [adminLetterText, setAdminLetterText] = useState('');
  const [adminLetterPhone, setAdminLetterPhone] = useState('');
  const [adminLetterHasStamp, setAdminLetterHasStamp] = useState(true);
  const [adminLetterMsg, setAdminLetterMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create User Form
  const [newFullName, setNewFullName] = useState('');
  const [newEmailOrUsername, setNewEmailOrUsername] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [newRole, setNewRole] = useState<CourtRole>('judge');
  const [newBench, setNewBench] = useState('Dhaddacha Yakkaa');
  const [newLicenseNo, setNewLicenseNo] = useState('');
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [copiedPasscodeId, setCopiedPasscodeId] = useState<string | null>(null);

  const allCourtUsers = getLocalCourtUsers().filter(
    u => !activeSession?.institutionId || u.institutionId === activeSession.institutionId
  );

  const handleOfficeLetterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminLetterRefNo.trim() || !adminLetterText.trim()) {
      setAdminLetterMsg({ type: 'error', text: 'Maaloo Lakkoofsa Bahii fi Qabiyyee Xalayaa guutaa.' });
      return;
    }
    const res = await updateCourtOfficeLetter(
      activeSession?.courtName || 'Mana Murtii',
      adminLetterRefNo,
      adminLetterText,
      activeSession?.user.fullName || 'Bulchaa',
      activeSession?.user.emailOrUsername || 'admin@court.et',
      adminLetterPhone || '+251911234567',
      adminLetterHasStamp,
      'Chaappaan Mana Murtii Mirkanaa\'eera'
    );
    if (res.success) {
      setAdminLetterMsg({ type: 'success', text: res.message });
      setAdminLetterRefNo('');
      setAdminLetterText('');
      setAdminLetterPhone('');
    } else {
      setAdminLetterMsg({ type: 'error', text: res.message });
    }
  };

  const handleCreateCourtUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    if (!activeSession?.institutionId) return;

    if (!newFullName.trim() || !newEmailOrUsername.trim() || !newPasscode.trim()) {
      setCreateMsg({ 
        type: 'error', 
        text: currentLang === 'om' ? 'Maqaa guutuu, email/username fi passcode guutaa.' : 'ስም፣ ኢሜይል እና የይለፍ ቃል ያስገቡ።' 
      });
      return;
    }

    setIsCreating(true);
    const res = await createCourtUser(activeSession.institutionId, {
      fullName: newFullName,
      usernameOrEmail: newEmailOrUsername,
      passcode: newPasscode,
      role: newRole,
      bench: newBench,
      licenseNumber: newLicenseNo,
    });
    setIsCreating(false);

    if (res.success) {
      setCreateMsg({ type: 'success', text: res.message });
      setNewFullName('');
      setNewEmailOrUsername('');
      setNewPasscode('');
      setNewLicenseNo('');
      onRefreshRoster();
    } else {
      setCreateMsg({ type: 'error', text: res.message });
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    const userToToggle = getLocalCourtUsers().find((u) => u.id === userId);
    if (activeSession?.institutionId !== userToToggle?.institutionId) {
      alert('Seerri hin heeyyamu: Dhaabbata biraa hojjetuu jijjiiruu hin dandeessu.');
      return;
    }
    await toggleCourtUserStatus(userId);
    onRefreshRoster();
  };

  const handleCopyPasscode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPasscodeId(id);
    setTimeout(() => setCopiedPasscodeId(null), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <span>Bulchiinsa Manneen Murtii, Ogeessotaa & Adeemsa Seeraa</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Mana Murtii keessaniif Abbootii Seeraa user uumaa, adeemsa hojii seeraa qindeessaa (Workflows), fi ogeessotaaf ramadaa.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setAdminWorkspaceTab('workflows')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              adminWorkspaceTab === 'workflows'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Adeemsa (Workflows)</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminWorkspaceTab('roster')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              adminWorkspaceTab === 'roster'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Abbootii Seeraa ({allCourtUsers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminWorkspaceTab('office_letter')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              adminWorkspaceTab === 'office_letter'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Xalayaa Mana Hojii</span>
          </button>
        </div>
      </div>

      {adminWorkspaceTab === 'workflows' && (
        <InstitutionManagementView 
          currentLang={currentLang} 
          onNavigateToBench={onNavigateToBench} 
        />
      )}

      {adminWorkspaceTab === 'roster' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Create User Form */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Plus className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm text-white">Hojjetaa Dhaddachaa Haaraa Uumi</h4>
              </div>
              
              {createMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  createMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {createMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateCourtUserSubmit} className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Maqaa Guutuu (Full Name)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newEmailOrUsername}
                      onChange={(e) => setNewEmailOrUsername(e.target.value)}
                      placeholder="Username / Email"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                      required
                    />
                    <input
                      type="password"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="Passcode (4-8 digits)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as CourtRole)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                    >
                      <option value="judge">Abbaa Seeraa (Judge)</option>
                      <option value="officer">Ofiisara Seeraa (Officer)</option>
                      <option value="registrar">Galmee (Registrar)</option>
                    </select>
                    <input
                      type="text"
                      value={newBench}
                      onChange={(e) => setNewBench(e.target.value)}
                      placeholder="Dhaddacha (Bench)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    value={newLicenseNo}
                    onChange={(e) => setNewLicenseNo(e.target.value)}
                    placeholder="Lakkoofsa Waraqaa Eenyummaa (ID/License)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Hojjetaa Galmeessi</span>
                </button>
              </form>
            </div>

            {/* User Roster List */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>Tarree Hojjettoota Dhaddachaa ({allCourtUsers.length})</span>
                </h4>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {allCourtUsers.map((u) => (
                  <div key={u.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{u.fullName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                          u.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {u.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {u.role.toUpperCase()} • {u.bench}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 font-mono">Code: {u.passcode}</span>
                        <button
                          onClick={() => handleCopyPasscode(u.id, u.passcode)}
                          className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                        >
                          {copiedPasscodeId === u.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedPasscodeId === u.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <button
                        onClick={() => handleToggleUserStatus(u.id)}
                        className={`p-2 rounded-lg border transition-all ${
                          u.status === 'active' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                        title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {allCourtUsers.length === 0 && (
                  <div className="py-12 text-center text-slate-500 italic text-xs">
                    Hojjetaan galmeeffame hin jiru.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {adminWorkspaceTab === 'office_letter' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100">
                Ergaa & Xalayaa Mana Hojii (Official Office Letter)
              </h4>
              <p className="text-xs text-slate-400">
                Mana murtii keessaniif xalayaa mana hojii lakkoofsa bahii qabu ergaa.
              </p>
            </div>
          </div>

          {adminLetterMsg && (
            <div className={`p-4 rounded-xl text-xs font-medium ${
              adminLetterMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}>
              {adminLetterMsg.text}
            </div>
          )}

          <form onSubmit={handleOfficeLetterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                value={adminLetterRefNo}
                onChange={(e) => setAdminLetterRefNo(e.target.value)}
                placeholder="Lakkoofsa Bahii Xalayichaa (Outgoing Ref No)"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                required
              />
              <input
                type="tel"
                value={adminLetterPhone}
                onChange={(e) => setAdminLetterPhone(e.target.value)}
                placeholder="Bilbila Bulchaa (Admin Phone)"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>
            <textarea
              value={adminLetterText}
              onChange={(e) => setAdminLetterText(e.target.value)}
              rows={5}
              placeholder="Qabiyyee Xalayaa..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white"
              required
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="adminLetterStamp"
                checked={adminLetterHasStamp}
                onChange={(e) => setAdminLetterHasStamp(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-slate-800"
              />
              <label htmlFor="adminLetterStamp" className="text-xs text-slate-300">Chaappaan jira</label>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg"
            >
              Mirkaneessi & Ergi
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
