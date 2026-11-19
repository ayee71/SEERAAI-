import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Building, 
  Folder, 
  ShieldCheck, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Lock, 
  FileText, 
  Upload, 
  Activity, 
  Gavel, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Language } from '../../i18n/translations';
import { 
  CourtPersonnelMapping, 
  FolderPermissions, 
  getLocalPersonnelMappings, 
  addOrUpdatePersonnelMapping, 
  deletePersonnelMapping, 
  getLocalInstitutions, 
  CourtInstitution 
} from '../../services/courtInstitutionService';
import { OROMIA_COURTS_CATALOG } from '../../data/courts/oromiaCourts';
import { logAdminAction } from '../../services/adminActivityLogService';

interface CourtPersonnelAccessPanelProps {
  currentLang: Language;
}

export const CourtPersonnelAccessPanel: React.FC<CourtPersonnelAccessPanelProps> = ({ currentLang }) => {
  const [mappings, setMappings] = useState<CourtPersonnelMapping[]>(() => getLocalPersonnelMappings());
  const [institutions] = useState<CourtInstitution[]>(() => getLocalInstitutions());
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [emailInput, setEmailInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [selectedWoredaId, setSelectedWoredaId] = useState(OROMIA_COURTS_CATALOG[0]?.id || 'inst_gurbicha_woreda_first');
  const [selectedRole, setSelectedRole] = useState<'Judge' | 'Registrar' | 'Clerk' | 'Court Admin' | 'Legal Expert'>('Judge');
  
  // Permissions State
  const [canViewFolder, setCanViewFolder] = useState(true);
  const [canUploadDocuments, setCanUploadDocuments] = useState(true);
  const [canDeleteDocuments, setCanDeleteDocuments] = useState(false);
  const [canViewAuditLogs, setCanViewAuditLogs] = useState(true);
  const [canIssueOrders, setCanIssueOrders] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleRoleChange = (role: 'Judge' | 'Registrar' | 'Clerk' | 'Court Admin' | 'Legal Expert') => {
    setSelectedRole(role);
    if (role === 'Judge') {
      setCanViewFolder(true);
      setCanUploadDocuments(true);
      setCanDeleteDocuments(false);
      setCanViewAuditLogs(true);
      setCanIssueOrders(true);
    } else if (role === 'Registrar') {
      setCanViewFolder(true);
      setCanUploadDocuments(true);
      setCanDeleteDocuments(false);
      setCanViewAuditLogs(true);
      setCanIssueOrders(false);
    } else if (role === 'Clerk') {
      setCanViewFolder(true);
      setCanUploadDocuments(true);
      setCanDeleteDocuments(false);
      setCanViewAuditLogs(false);
      setCanIssueOrders(false);
    } else if (role === 'Court Admin') {
      setCanViewFolder(true);
      setCanUploadDocuments(true);
      setCanDeleteDocuments(true);
      setCanViewAuditLogs(true);
      setCanIssueOrders(true);
    } else {
      setCanViewFolder(true);
      setCanUploadDocuments(true);
      setCanDeleteDocuments(false);
      setCanViewAuditLogs(true);
      setCanIssueOrders(false);
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !fullNameInput.trim()) {
      setToastMessage('Maaloo teessoo email fi maqaa guutuu galchaa.');
      return;
    }

    setIsSaving(true);
    const selectedInst = institutions.find(i => i.id === selectedWoredaId) || 
      OROMIA_COURTS_CATALOG.find(c => c.id === selectedWoredaId) || {
        id: selectedWoredaId,
        name: 'Mana Murtii Aanaa Gurbicha',
      };

    const newMapping: CourtPersonnelMapping = {
      id: editingId || `map_${Date.now()}`,
      userEmail: emailInput.trim().toLowerCase(),
      userFullName: fullNameInput.trim(),
      woredaCourtId: selectedWoredaId,
      woredaCourtName: selectedInst.name,
      role: selectedRole,
      permissions: {
        canViewFolder,
        canUploadDocuments,
        canDeleteDocuments,
        canViewAuditLogs,
        canIssueOrders,
      },
      assignedBy: 'ayeledha@gmail.com',
      assignedAt: new Date().toISOString(),
      status: 'active',
    };

    const res = await addOrUpdatePersonnelMapping(newMapping);
    setIsSaving(false);

    if (res.success) {
      setMappings(getLocalPersonnelMappings());
      setToastMessage(res.message);
      resetForm();

      // Log Admin Activity
      await logAdminAction({
        actionType: 'user_verification',
        target: `${newMapping.userFullName} (${newMapping.userEmail})`,
        details: `Court Personnel Access Mapped: ${newMapping.role} at ${newMapping.woredaCourtName}`,
        metadata: { mappingId: newMapping.id, woredaId: newMapping.woredaCourtId }
      });

      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const resetForm = () => {
    setEmailInput('');
    setFullNameInput('');
    setEditingId(null);
    setSelectedRole('Judge');
    setCanViewFolder(true);
    setCanUploadDocuments(true);
    setCanDeleteDocuments(false);
    setCanViewAuditLogs(true);
    setCanIssueOrders(true);
  };

  const handleEditMapping = (m: CourtPersonnelMapping) => {
    setEditingId(m.id);
    setEmailInput(m.userEmail);
    setFullNameInput(m.userFullName);
    setSelectedWoredaId(m.woredaCourtId);
    setSelectedRole(m.role);
    setCanViewFolder(m.permissions.canViewFolder);
    setCanUploadDocuments(m.permissions.canUploadDocuments);
    setCanDeleteDocuments(m.permissions.canDeleteDocuments);
    setCanViewAuditLogs(m.permissions.canViewAuditLogs);
    setCanIssueOrders(m.permissions.canIssueOrders);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Eeyyama hojjetaa kanaa haquu barbaadduu?')) {
      await deletePersonnelMapping(id);
      setMappings(getLocalPersonnelMappings());
      setToastMessage('Eeyyamni hojjetaa haquun milkaa\'eera.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const filteredMappings = mappings.filter(m =>
    m.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.userFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.woredaCourtName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const t = {
    om: {
      title: '📁 Eeyyama Hojjettoota Mana Murtii (Court Personnel Access Mapping)',
      desc: 'Anniisa abbaa qabeenyaatiin email hojjetaa tokkoo fooldara mana murtii Aanaa adda ta\'eef ramaduu, gahee (Abbaa Seeraa, Galmeessaa, Qindeessaa) fi eeyyama fooldaraa murteessuu.',
      formHeader: editingId ? 'Fooyyessa Eeyyama Hojjetaa' : 'Eeyyama Hojjetaa Haaraa Ramadi (New Mapping)',
      emailLabel: 'Teessoo Email Hojjetaa (User Email):',
      nameLabel: 'Maqaa Guutuu Hojjetaa (Full Name):',
      woredaLabel: 'Fooldara Mana Murtii Aanaa (Woreda Court Folder):',
      roleLabel: 'Gahee Hojii (Court Role):',
      permissionsHeader: 'Eeyyamoota Fooldaraa (Folder Permissions):',
      saveBtn: editingId ? 'Haoromsi (Update Mapping)' : 'Eeyyama Ramadi (Save Personnel Access)',
      mappingsListHeader: 'Hojjettoota Ramadaman & Eeyyama Isaanii',
      searchPlaceholder: 'Email, maqaa ykn mana murtii barbaadi...',
      noMappings: 'Hojjetaan fooldara mana murtii irratti ramadame hin jiru.',
    },
    am: {
      title: '📁 የፍርድ ቤት ሰራተኞች ፍቃድ ማገናኛ (Court Personnel Access Mapping)',
      desc: 'በባለቤት ስልጣን የተጠቃሚ ኢሜይልን ከአንድ የተወሰነ የወረዳ ፍርድ ቤት ማህደር ጋር ማገናኘት፣ ሚና (ዳኛ፣ መዝጋቢ፣ ጸሐፊ) እና ልዩ ፍቃዶችን መወሰን።',
      formHeader: editingId ? 'የሰራተኛ ፍቃድ ማስተካከያ' : 'አዲስ የሰራተኛ ፍቃድ ይመድቡ',
      emailLabel: 'የሰራተኛው ኢሜይል (User Email):',
      nameLabel: 'ሙሉ ስም (Full Name):',
      woredaLabel: 'የወረዳ ፍርድ ቤት ማህደር (Woreda Court Folder):',
      roleLabel: 'የስራ ሚና (Court Role):',
      permissionsHeader: 'የማህደር ፍቃዶች (Folder Permissions):',
      saveBtn: editingId ? 'አዘምን (Update Mapping)' : 'ፍቃድ መድብ (Save Personnel Access)',
      mappingsListHeader: 'የተመደቡ ሰራተኞች እና ፍቃዶቻቸው',
      searchPlaceholder: 'በኢሜይል፣ ስም ወይም ፍርድ ቤት ፈልግ...',
      noMappings: 'የተመደበ ሰራተኛ የለም።',
    },
    en: {
      title: '📁 Court Personnel Access & Woreda Folder Mapping',
      desc: 'As platform owner, map individual user emails to specific court Woreda folders, assigning roles (Judge, Registrar, Clerk) and folder-specific permissions.',
      formHeader: editingId ? 'Edit Personnel Mapping' : 'Assign New Court Personnel Access',
      emailLabel: 'User Email Address:',
      nameLabel: 'User Full Name:',
      woredaLabel: 'Target Woreda Court Folder:',
      roleLabel: 'Court Personnel Role:',
      permissionsHeader: 'Folder-Specific Permissions:',
      saveBtn: editingId ? 'Update Mapping' : 'Save Personnel Access Mapping',
      mappingsListHeader: 'Assigned Court Personnel & Permission Matrix',
      searchPlaceholder: 'Search by email, name, or Woreda court...',
      noMappings: 'No court personnel mapped to folders yet.',
    }
  }[currentLang] || {
    title: '📁 Court Personnel Access & Woreda Folder Mapping',
    desc: 'As platform owner, map individual user emails to specific court Woreda folders, assigning roles (Judge, Registrar, Clerk) and folder-specific permissions.',
    formHeader: editingId ? 'Edit Personnel Mapping' : 'Assign New Court Personnel Access',
    emailLabel: 'User Email Address:',
    nameLabel: 'User Full Name:',
    woredaLabel: 'Target Woreda Court Folder:',
    roleLabel: 'Court Personnel Role:',
    permissionsHeader: 'Folder-Specific Permissions:',
    saveBtn: editingId ? 'Update Mapping' : 'Save Personnel Access Mapping',
    mappingsListHeader: 'Assigned Court Personnel & Permission Matrix',
    searchPlaceholder: 'Search by email, name, or Woreda court...',
    noMappings: 'No court personnel mapped to folders yet.',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white font-serif-legal">{t.title}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Owner Authority Enforced
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* Grid: Form & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FORM PANEL (5 COLS) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>{t.formHeader}</span>
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-rose-400 hover:underline cursor-pointer"
              >
                Dhiisi (Cancel Edit)
              </button>
            )}
          </div>

          <form onSubmit={handleSaveMapping} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase font-bold block">
                {t.emailLabel}
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="caalaa.judge@court.oromia.et"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase font-bold block">
                {t.nameLabel}
              </label>
              <input
                type="text"
                required
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="Abbaa Seeraa Caalaa Tasfaayee"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase font-bold block">
                {t.woredaLabel}
              </label>
              <select
                value={selectedWoredaId}
                onChange={(e) => setSelectedWoredaId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {OROMIA_COURTS_CATALOG.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏛️ {c.name} ({c.zoneOrCity})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase font-bold block">
                {t.roleLabel}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="Judge">⚖️ Abbaa Seeraa (Judge)</option>
                <option value="Registrar">📋 Galmeessaa / Registrar</option>
                <option value="Clerk">📜 Qindeessaa / Clerk</option>
                <option value="Court Admin">🏛️ Bulchaa Mana Murtii (Court Admin)</option>
                <option value="Legal Expert">🛡️ Ogeessa Seeraa (Legal Expert)</option>
              </select>
            </div>

            {/* Folder Permissions Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-[11px] font-mono text-amber-400 uppercase font-bold block">
                {t.permissionsHeader}
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <span className="text-slate-200">View Court Folder Documents</span>
                  <input
                    type="checkbox"
                    checked={canViewFolder}
                    onChange={(e) => setCanViewFolder(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <span className="text-slate-200">Upload New Files & Evidence</span>
                  <input
                    type="checkbox"
                    checked={canUploadDocuments}
                    onChange={(e) => setCanUploadDocuments(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <span className="text-slate-200">Archive / Delete Folder Files</span>
                  <input
                    type="checkbox"
                    checked={canDeleteDocuments}
                    onChange={(e) => setCanDeleteDocuments(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <span className="text-slate-200">View Courtroom Audit Logs</span>
                  <input
                    type="checkbox"
                    checked={canViewAuditLogs}
                    onChange={(e) => setCanViewAuditLogs(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <span className="text-slate-200">Issue & Dispatch Interlocutory Orders</span>
                  <input
                    type="checkbox"
                    checked={canIssueOrders}
                    onChange={(e) => setCanIssueOrders(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{t.saveBtn}</span>
            </button>
          </form>
        </div>

        {/* LIST / MATRIX PANEL (7 COLS) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>{t.mappingsListHeader} ({filteredMappings.length})</span>
            </h3>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {filteredMappings.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2 bg-slate-950/50 rounded-2xl border border-slate-800/80">
              <Folder className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs">{t.noMappings}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredMappings.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{m.userFullName}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                          {m.role}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{m.userEmail}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditMapping(m)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                        title="Edit Mapping"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs cursor-pointer"
                        title="Remove Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                    <span>🏛️ {m.woredaCourtName}</span>
                  </div>

                  {/* Permissions Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                    <span className={`px-2 py-0.5 rounded border ${m.permissions.canViewFolder ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                      {m.permissions.canViewFolder ? '✓ View' : '✕ View'}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${m.permissions.canUploadDocuments ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                      {m.permissions.canUploadDocuments ? '✓ Upload' : '✕ Upload'}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${m.permissions.canDeleteDocuments ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                      {m.permissions.canDeleteDocuments ? '✓ Delete' : '✕ Delete'}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${m.permissions.canViewAuditLogs ? 'bg-sky-500/10 text-sky-300 border-sky-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                      {m.permissions.canViewAuditLogs ? '✓ Audit' : '✕ Audit'}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${m.permissions.canIssueOrders ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                      {m.permissions.canIssueOrders ? '✓ Orders' : '✕ Orders'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
