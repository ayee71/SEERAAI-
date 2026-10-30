import React, { useState, useEffect } from 'react';
import { AuditLogPanel } from '../components/AuditLogPanel';
import { CourtRegionMap } from '../components/CourtRegionMap';
import { CaseloadDistributionChart } from '../components/CaseloadDistributionChart';
import { CourtTenantBrandingModal } from '../components/CourtTenantBrandingModal';
import { AppOwnerTenantRegistryModal } from '../components/AppOwnerTenantRegistryModal';
import { useAuth } from '../context/AuthContext';
import { isOwnerAccount } from '../services/ownerAuth';
import { getStoredOwnerKey } from '../services/referralTracking';
import { Language, translations } from '../i18n/translations';
import { 
  Building, 
  Users, 
  Workflow, 
  Plus, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldCheck, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  UserCheck, 
  UserPlus, 
  Scale, 
  Gavel, 
  Landmark,
  Search, 
  Filter, 
  BookOpen, 
  ArrowRight, 
  Check, 
  Copy, 
  Lock, 
  Unlock,
  AlertCircle,
  HelpCircle,
  FolderGit2,
  Share2,
  Sparkles,
  MapPin,
  Layers,
  Upload,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { 
  CourtInstitution, 
  CourtUser, 
  CourtRole, 
  CourtLevelType, 
  ActiveCourtSession,
  getLocalInstitutions, 
  getLocalCourtUsers, 
  createCourtUser, 
  toggleCourtUserStatus,
  getActiveCourtSession,
  updateCourtBrandingAndSuperAdmin,
  uploadCourtLogo,
  updateInstitutionApprovalStatus
} from '../services/courtInstitutionService';
import { 
  CustomLegalWorkflow, 
  WorkflowStage, 
  LegalProcedureType,
  STANDARD_LEGAL_WORKFLOWS,
  getWorkflowsForInstitution,
  saveWorkflow,
  deleteWorkflow,
  assignWorkflowToUsers,
  unassignUserFromWorkflow
} from '../services/legalWorkflowService';
import { CourtWorkflowAndCredentialsCard } from '../components/CourtWorkflowAndCredentialsCard';
import { getCourtLinkDetails } from '../utils/courtLinkUtils';

interface InstitutionManagementViewProps {
  currentLang: Language;
  onNavigateToBench?: (level: 'first' | 'high' | 'cassation') => void;
}

export const InstitutionManagementView: React.FC<InstitutionManagementViewProps> = ({ 
  currentLang,
  onNavigateToBench 
}) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();
  const isOwner = isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );

  const [activeSession, setActiveSession] = useState<ActiveCourtSession | null>(getActiveCourtSession());
  const firestoreRole = profile?.role || activeSession?.user?.role;
  const hasCourtPersonnelRole = 
    isOwner ||
    firestoreRole === 'court_personnel' ||
    firestoreRole === 'court_admin' ||
    activeSession?.type === 'admin';

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  
  // Available institutions
  const allInstitutions = getLocalInstitutions();
  const institutions = selectedRegion
    ? allInstitutions.filter(i => i.region.toLowerCase().includes(selectedRegion.toLowerCase()))
    : allInstitutions;
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(
    activeSession?.institutionId || (institutions[0]?.id || 'inst_oromia_high_east_shewa')
  );

  const currentInstitution = institutions.find(i => i.id === selectedInstitutionId) || institutions[0];

  // Approval Status State & Firestore Sync
  const [currentInstitutionStatus, setCurrentInstitutionStatus] = useState<string>(
    currentInstitution?.institutionStatus || currentInstitution?.status || 'approved'
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  useEffect(() => {
    if (currentInstitution) {
      setCurrentInstitutionStatus(currentInstitution.institutionStatus || currentInstitution.status || 'approved');
    }
  }, [currentInstitution]);

  const handleToggleApprovalStatus = async () => {
    if (!currentInstitution) return;
    setIsUpdatingStatus(true);
    const targetStatus = (currentInstitutionStatus === 'approved' || currentInstitutionStatus === 'active') ? 'pending' : 'approved';
    
    try {
      const res = await updateInstitutionApprovalStatus(currentInstitution.id, targetStatus as any);
      setCurrentInstitutionStatus(res.newStatus);
      setWorkflowSuccessMsg(res.message);
      setTimeout(() => setWorkflowSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error updating approval status in Firestore: ${err?.message || err}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportStaffCSV = () => {
    const staffToExport = filteredStaff.length > 0 ? filteredStaff : institutionStaff;
    const headers = ['User ID', 'Full Name', 'Username/Email', 'Role', 'Bench', 'Status', 'Court Name', 'License Number', 'Created At'];
    
    const rows = staffToExport.map(u => [
      `"${u.id.replace(/"/g, '""')}"`,
      `"${u.fullName.replace(/"/g, '""')}"`,
      `"${u.usernameOrEmail.replace(/"/g, '""')}"`,
      `"${u.role.replace(/"/g, '""')}"`,
      `"${u.bench.replace(/"/g, '""')}"`,
      `"${u.status.replace(/"/g, '""')}"`,
      `"${(currentInstitution?.name || 'Court').replace(/"/g, '""')}"`,
      `"${(u.licenseNumber || 'N/A').replace(/"/g, '""')}"`,
      `"${u.createdAt || new Date().toISOString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `court_employees_${selectedInstitutionId}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Active Sub-tab: 'workflows' | 'create_workflow' | 'staff_roster' | 'workflow_assignments' | 'admin_roles' | 'branding' | 'audit_logs'
  const [activeSubTab, setActiveSubTab] = useState<'workflows' | 'create_workflow' | 'staff_roster' | 'workflow_assignments' | 'admin_roles' | 'branding' | 'audit_logs'>('workflows');

  // Administrative Roles state
  const [adminRoles, setAdminRoles] = useState<string[]>([
    'Chief Registrar (Galmee Guddicha)',
    'Case Coordinator (Qindeessaa Dhaddachaa)',
    'Senior Legal Advisor (Gorsaa Seeraa Ol\'aanaa)',
    'Inspection Auditor (Qorataa To\'annoo)'
  ]);
  const [newAdminRoleName, setNewAdminRoleName] = useState('');
  const [assignedAdminRolesMap, setAssignedAdminRolesMap] = useState<Record<string, string>>({});

  // Modals for Multi-Tenant Branding & App Owner Registry
  const [showBrandingModal, setShowBrandingModal] = useState<boolean>(false);
  const [showAppOwnerRegistryModal, setShowAppOwnerRegistryModal] = useState<boolean>(false);

  // Staff list & filter
  const [courtUsers, setCourtUsers] = useState<CourtUser[]>(getLocalCourtUsers());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  // New Staff form state
  const [newFullName, setNewFullName] = useState('');
  const [newUsernameOrEmail, setNewUsernameOrEmail] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [newRole, setNewRole] = useState<CourtRole>('judge');
  const [newBench, setNewBench] = useState('Dhaddacha Yakkaa (Criminal Bench)');
  const [newLicenseNo, setNewLicenseNo] = useState('');
  const [staffActionMsg, setStaffActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Workflows list
  const [workflows, setWorkflows] = useState<CustomLegalWorkflow[]>([]);
  const [workflowSearch, setWorkflowSearch] = useState('');
  const [selectedWorkflowForDetail, setSelectedWorkflowForDetail] = useState<CustomLegalWorkflow | null>(null);
  const [selectedWorkflowForAssignment, setSelectedWorkflowForAssignment] = useState<CustomLegalWorkflow | null>(null);

  // Custom Workflow Creation State
  const [wfTitle, setWfTitle] = useState('');
  const [wfTitleAm, setWfTitleAm] = useState('');
  const [wfTitleEn, setWfTitleEn] = useState('');
  const [wfProcedureType, setWfProcedureType] = useState<LegalProcedureType>('civil');
  const [wfDescription, setWfDescription] = useState('');
  const [wfTargetLevel, setWfTargetLevel] = useState<CourtLevelType>(currentInstitution?.courtLevel || 'high_court');
  const [wfBenchesInput, setWfBenchesInput] = useState('Dhaddacha Hariiroo Hawaasaa');
  
  // Stages builder (Default 4 Ethiopian legal steps: Drafting -> Review -> Approval/Hearing -> Final Filing)
  const [wfStages, setWfStages] = useState<WorkflowStage[]>([
    {
      id: 'stg_1',
      nameOm: '1. Qophii Iyyannoo & Qorannoo Galmee (Drafting)',
      nameAm: 'የክስ ረቂቅ እና የመጀመሪያ ምዝገባ',
      nameEn: 'Pleading Drafting & Registration',
      code: 'DRAFTING',
      order: 1,
      descriptionOm: 'Iyyannoon bu\'uura seeraatiin qindaa\'ee lakkoofsi galmee kennamuu.',
      descriptionAm: 'ክሱ በሕግ ተዘጋጅቶ መለያ ቁጥር መሰጠት።',
      descriptionEn: 'Formulation of claims and docket registration.',
      legalBasis: 'C.P.C Art. 222 & Labsii 216/2011',
      assignedRoles: ['registrar', 'legal_expert'],
      requiredChecklistOm: ['Kaffaltii taaksii mirkaneessuu', 'Ragaalee barruu maxxansuu']
    },
    {
      id: 'stg_2',
      nameOm: '2. Qorannoo Bu\'uura Seeraa & Falmii Duraa (Review)',
      nameAm: 'የሕግ ክለሳ እና የመልስ መቃወሚያዎች',
      nameEn: 'Legal Scrutiny & Preliminary Review',
      code: 'REVIEW',
      order: 2,
      descriptionOm: 'Aangoo seeraa fi deebii mormitootaa sakatta\'uu.',
      descriptionAm: 'የስልጣን እና የመልስ መቃወሚያ ምርመራ።',
      descriptionEn: 'Screening for jurisdictional validity and preliminary defense.',
      legalBasis: 'C.P.C Art. 244-246',
      assignedRoles: ['assistant_judge', 'legal_expert'],
      requiredChecklistOm: ['Aangoo mana murtii mirkaneessuu', 'Qabxii falmii qindeessuu']
    },
    {
      id: 'stg_3',
      nameOm: '3. Dhaddacha Dhagahaa & Mirkaneessa Murtee (Approval / Hearing)',
      nameAm: 'የችሎት ክርክር እና ውሳኔ ማጽደቅ',
      nameEn: 'Bench Hearing & Judgment Approval',
      code: 'APPROVAL',
      order: 3,
      descriptionOm: 'Abbootii seeraan ragaalee dhagahuu fi murtii qopheessanii mirkaneessuu.',
      descriptionAm: 'በችሎት ክርክር ማዳመጥ እና ውሳኔ ማጽደቅ።',
      descriptionEn: 'Trial hearing, witness deposition, and bench deliberation.',
      legalBasis: 'C.P.C Art. 257 & Labsii 216/2011',
      assignedRoles: ['judge', 'assistant_judge'],
      requiredChecklistOm: ['Kora dhaddachaa mirkaneessuu', 'Murtii Abbaan Seeraa mallatteessuu']
    },
    {
      id: 'stg_4',
      nameOm: '4. Labsii Dhumaa & Galmee Cufuu (Final Filing)',
      nameAm: 'የመጨረሻ ፍርድ ማሳወቅ እና መዝገብ መዝጋት',
      nameEn: 'Pronouncement & Final Archival Filing',
      code: 'FINAL_FILING',
      order: 4,
      descriptionOm: 'Koppii murtii abbootii dhimmaaf kennuun galmee gara kuusaatti dabarsuu.',
      descriptionAm: 'የውሳኔ ግልባጭ መስጠት እና መዝገብ ማጠናቀቅ።',
      descriptionEn: 'Issuing decree copies and closing master docket in archives.',
      legalBasis: 'C.P.C Art. 180-184',
      assignedRoles: ['judge', 'registrar', 'auditor'],
      requiredChecklistOm: ['Chaappaa dhaddachaa gochuu', 'Gara kuusaa seeraatti dabarsuu']
    }
  ]);

  const [workflowSuccessMsg, setWorkflowSuccessMsg] = useState<string | null>(null);

  // Sync workflows whenever institution selection changes
  const reloadWorkflows = () => {
    if (selectedInstitutionId) {
      const list = getWorkflowsForInstitution(selectedInstitutionId);
      setWorkflows(list);
    }
  };

  useEffect(() => {
    reloadWorkflows();
    setCourtUsers(getLocalCourtUsers());
  }, [selectedInstitutionId]);

  useEffect(() => {
    if (institutions.length > 0 && !institutions.find(i => i.id === selectedInstitutionId)) {
      setSelectedInstitutionId(institutions[0].id);
    }
  }, [selectedRegion, institutions]);

  // Handlers for Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newUsernameOrEmail || !newPasscode) {
      setStaffActionMsg({ type: 'error', text: 'Maaloo dirreewwan hunda guutaa!' });
      return;
    }

    const res = await createCourtUser(selectedInstitutionId, {
      fullName: newFullName,
      usernameOrEmail: newUsernameOrEmail.trim(),
      passcode: newPasscode.trim(),
      role: newRole,
      bench: newBench,
      licenseNumber: newLicenseNo || `OR-${selectedInstitutionId.slice(-4).toUpperCase()}-${Math.floor(100 + Math.random()*900)}`,
    });

    if (res.success && res.user) {
      setCourtUsers(getLocalCourtUsers());
      setStaffActionMsg({
        type: 'success',
        text: `Ogeessi seeraa '${res.user.fullName}' milkaa'inaan galmaa'eera! Koodiin seensaa: ${res.user.passcode}`
      });

      // Reset inputs
      setNewFullName('');
      setNewUsernameOrEmail('');
      setNewPasscode('');
      setNewLicenseNo('');
    } else {
      setStaffActionMsg({
        type: 'error',
        text: res.message || 'Dogoggorri uumameera.'
      });
    }
  };

  const handleToggleStatus = (userId: string) => {
    toggleCourtUserStatus(userId);
    setCourtUsers(getLocalCourtUsers());
  };

  const handleCopyPasscode = (userId: string, passcode: string) => {
    navigator.clipboard.writeText(passcode);
    setCopiedUserId(userId);
    setTimeout(() => setCopiedUserId(null), 2500);
  };

  // Handlers for Workflow Creation
  const handleAddStage = () => {
    const nextOrder = wfStages.length + 1;
    const newStage: WorkflowStage = {
      id: `stg_custom_${Date.now()}`,
      nameOm: `${nextOrder}. Sadarkaa Haaraa`,
      nameAm: `${nextOrder}. አዲስ ደረጃ`,
      nameEn: `${nextOrder}. Custom Stage`,
      code: `STAGE_${nextOrder}`,
      order: nextOrder,
      descriptionOm: 'Ibsa adeemsa hojii sadarkaa kanaa...',
      descriptionAm: 'የዚህ ደረጃ የሥራ ሂደት ማብራሪያ...',
      descriptionEn: 'Process description for this procedural stage...',
      legalBasis: 'Labsii 216/2011 & Heera Oromiyaa',
      assignedRoles: ['judge', 'assistant_judge'],
      requiredChecklistOm: ['Ragaa mirkaneessuu', 'Galmee qindeessuu']
    };
    setWfStages([...wfStages, newStage]);
  };

  const handleRemoveStage = (index: number) => {
    if (wfStages.length <= 2) {
      alert('Yoo xiqqaate sadarkaalee 2 barbaachisa!');
      return;
    }
    const updated = wfStages.filter((_, i) => i !== index).map((s, idx) => ({
      ...s,
      order: idx + 1
    }));
    setWfStages(updated);
  };

  const handleUpdateStage = (index: number, field: keyof WorkflowStage, value: any) => {
    const updated = [...wfStages];
    updated[index] = { ...updated[index], [field]: value };
    setWfStages(updated);
  };

  const handleSaveCustomWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfTitle.trim()) {
      alert('Maaloo mata duree adeemsa hojii (Workflow Title) galchaa!');
      return;
    }

    const newWorkflow: CustomLegalWorkflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      institutionId: selectedInstitutionId,
      courtName: currentInstitution?.name || 'Mana Murtii',
      courtLevel: wfTargetLevel,
      title: wfTitle,
      titleAm: wfTitleAm || wfTitle,
      titleEn: wfTitleEn || wfTitle,
      procedureType: wfProcedureType,
      description: wfDescription || 'Adeemsa hojii addaa bu\'uura seera biyyaatiin qophaa\'e.',
      stages: wfStages,
      assignedUserIds: [],
      assignedBenches: wfBenchesInput.split(',').map(s => s.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByAdminEmail: activeSession?.user.emailOrUsername || currentInstitution?.adminEmail || 'admin@court.oromia.et',
      isSystemStandard: false,
    };

    saveWorkflow(newWorkflow);
    reloadWorkflows();
    setWorkflowSuccessMsg(`Adeemsi hojii haaraa '${newWorkflow.title}' milkaa'inaan uumameera!`);
    setActiveSubTab('workflows');
    setTimeout(() => setWorkflowSuccessMsg(null), 4000);

    // Reset Form
    setWfTitle('');
    setWfTitleAm('');
    setWfTitleEn('');
    setWfDescription('');
  };

  // Assign user to workflow
  const handleToggleUserWorkflowAssignment = (workflowId: string, userId: string, isCurrentlyAssigned: boolean) => {
    if (isCurrentlyAssigned) {
      unassignUserFromWorkflow(workflowId, userId);
    } else {
      assignWorkflowToUsers(workflowId, [userId]);
    }
    reloadWorkflows();
    // Refresh modal or detail
    if (selectedWorkflowForAssignment && selectedWorkflowForAssignment.id === workflowId) {
      const updated = getWorkflowsForInstitution(selectedInstitutionId).find(w => w.id === workflowId);
      if (updated) setSelectedWorkflowForAssignment(updated);
    }
  };

  const institutionStaff = courtUsers.filter(u => u.institutionId === selectedInstitutionId);
  const filteredStaff = institutionStaff.filter(u => 
    u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.usernameOrEmail.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.bench.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      {/* View Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-amber-400" />
                <span>Institution Judicial Workflow Engine</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
                Sadarkaa Sadeenuu (3 Court Levels)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Bulchiinsa Manneen Murtii & Adeemsa Seeraa (Court Workflows)
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Manneen murtii sadarkaa sadeenuufu (Sadarkaa Jalqabaa, Olaanaa, fi Dhaddacha Ijibbaataa) adeemsa hojii seeraa qopheessaa,
              sadarkaalee <em>(Drafting ➔ Review ➔ Approval ➔ Final Filing)</em> bu'uura seera biyya keenyaatiin qindeessaa, akkasumas abbootii seeraafi ogeessotaaf ramadaa.
            </p>
          </div>

          {/* Quick Jump to Live Bench */}
          {onNavigateToBench && (
            <div className="flex flex-col gap-2 shrink-0">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Dhaddacha Hojiitti Seeni:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToBench('first')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-bold border border-blue-500/30 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Scale className="w-3 h-3" />
                  <span>Jalqabaa</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToBench('high')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Landmark className="w-3 h-3" />
                  <span>Olaanaa</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToBench('cassation')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Gavel className="w-3 h-3" />
                  <span>Ijibbaataa</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Court Tiers, Workflow & Sample Credentials Card (4 Tiers & Roles) */}
        <div className="mt-6">
          <CourtWorkflowAndCredentialsCard 
            currentLang={currentLang} 
            onNavigateToCourtWork={() => onNavigateToBench && onNavigateToBench('high')} 
          />
        </div>

        {/* Region Map Selector */}
        <div className="mt-6 border-t border-slate-800 pt-6">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Filannoo Godinaa (Region Selector)</h3>
          <CourtRegionMap onRegionSelect={setSelectedRegion} />
        </div>

        {/* Institution Selector Bar & Branding Actions */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400">Mana Murtii Filatame (Selected Institution):</div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>{currentInstitution?.customCourtName || currentInstitution?.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  {currentInstitution?.courtLevel.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                  🛡️ Tenant Privacy Active
                </span>

                {/* Approval Status Toggle Switch for Current Institution */}
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Approval Status:</span>
                  <button
                    type="button"
                    onClick={handleToggleApprovalStatus}
                    disabled={isUpdatingStatus}
                    className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentInstitutionStatus === 'approved' || currentInstitutionStatus === 'active'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400'
                        : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400'
                    }`}
                    title="Click to toggle institution approvalStatus in Firestore"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${currentInstitutionStatus === 'approved' || currentInstitutionStatus === 'active' ? 'bg-slate-950' : 'bg-slate-950 animate-ping'}`} />
                    <span>{currentInstitutionStatus === 'approved' || currentInstitutionStatus === 'active' ? '✓ APPROVED' : '⏳ PENDING'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBrandingModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>🎨 Branding & Super Admin Mana Murtii</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAppOwnerRegistryModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>👑 App Owner Tenant Registry & Privacy Audit</span>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs text-slate-400 font-medium">Jijjiiri:</label>
              <select
                value={selectedInstitutionId}
                onChange={(e) => setSelectedInstitutionId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500 font-medium max-w-xs"
              >
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.customCourtName || inst.name} ({inst.region})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {workflowSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{workflowSuccessMsg}</span>
        </div>
      )}

      {/* Main Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('workflows')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'workflows'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Workflow className="w-4 h-4" />
          <span>1. Adeemsa Seeraa (Workflows)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-amber-400 font-mono">
            {workflows.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('create_workflow')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'create_workflow'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>2. Adeemsa Haaraa Uumi (Define Custom Workflow)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('staff_roster')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'staff_roster'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Abbootii Seeraafi Ogeessota (Staff Accounts)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-emerald-400 font-mono">
            {institutionStaff.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('workflow_assignments')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'workflow_assignments'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>4. Ramaddii Ogeessotaa (Assign Workflows to Users)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('admin_roles')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'admin_roles'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>5. Gahee Bulchiinsa & Ramaddii (Admin Roles & Staff)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-amber-400 font-mono">
            {adminRoles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('branding')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'branding'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>6. Loogoo & Bifa (Logo & Branding)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audit_logs')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'audit_logs'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>7. Audit Log (Transparency)</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: WORKFLOWS LIST & LEGAL ARCHITECTURE
          ========================================================================= */}
      {activeSubTab === 'workflows' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-amber-400" />
                <span>Adeemsa Seeraa Hojiirra Jiran (Active Court Workflows)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Adeemsa hojii Labsii Manneen Murtii Oromiyaa fi C.P.C irratti hundaa'uun qophaa'an.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={workflowSearch}
                  onChange={(e) => setWorkflowSearch(e.target.value)}
                  placeholder="Barbaadi adeemsa seeraa..."
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 w-60"
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('create_workflow')}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Haaraa Uumi</span>
              </button>
            </div>
          </div>

          {/* Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows
              .filter(w => w.title.toLowerCase().includes(workflowSearch.toLowerCase()) || w.description.toLowerCase().includes(workflowSearch.toLowerCase()))
              .map((wf) => {
                const assignedUsers = institutionStaff.filter(u => (wf.assignedUserIds || []).includes(u.id));
                const levelBadgeColor = 
                  wf.courtLevel === 'cassation' 
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                    : wf.courtLevel === 'high_court'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-300 border-blue-500/30';

                return (
                  <div
                    key={wf.id}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border uppercase ${levelBadgeColor}`}>
                          {wf.courtLevel.replace('_', ' ')}
                        </span>
                        {wf.isSystemStandard ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Standard Seeraa</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                            Custom Institution
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors leading-snug">
                        {wf.title}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {wf.description}
                      </p>

                      {/* Workflow Stages Pipeline Preview */}
                      <div className="space-y-1.5 pt-2">
                        <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center justify-between">
                          <span>Sadarkaalee Seeraa ({wf.stages.length}):</span>
                          <span>Tartiiba labsii</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {wf.stages.map((stg, i) => (
                            <div
                              key={stg.id || i}
                              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center"
                              title={`${stg.nameOm} - ${stg.legalBasis}`}
                            >
                              <div className="text-[9px] font-mono text-amber-400 font-bold">#{stg.order}</div>
                              <div className="text-[9px] text-slate-300 truncate font-semibold">{stg.code}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Assigned Staff Preview */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ogeessota Ramaddaman:</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-300">
                          {assignedUsers.length} Users
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedWorkflowForDetail(wf)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sadarkaalee Qoradhu</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWorkflowForAssignment(wf);
                          setActiveSubTab('workflow_assignments');
                        }}
                        className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Ramadi Abbootii Seeraaf"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Ramadi</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: CREATE CUSTOM LEGAL WORKFLOW FORM
          ========================================================================= */}
      {activeSubTab === 'create_workflow' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Adeemsa Seeraa Haaraa Qindeessi (Create Legal Workflow)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Sadarkaalee bu'uuraa (Drafting ➔ Review ➔ Approval ➔ Final Filing) fi keeyyattoota seeraa Labsii 216/2011 fi Seera Deemsa Falmii qindeessaa.
            </p>
          </div>

          <form onSubmit={handleSaveCustomWorkflow} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mata Duree Adeemsa Hojii (Workflow Title in Afaan Oromoo) *
                  </label>
                  <input
                    type="text"
                    value={wfTitle}
                    onChange={(e) => setWfTitle(e.target.value)}
                    placeholder="fkn. Adeemsa Qorannoo fi Mirkaneessa Dhimma Lafaafi Qabeenya Dhaabbataa"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Mata Duree Afaan Amaaraatiin (Amharic Title)
                    </label>
                    <input
                      type="text"
                      value={wfTitleAm}
                      onChange={(e) => setWfTitleAm(e.target.value)}
                      placeholder="የመሬት እና የማይንቀሳቀስ ንብረት ክርክር የሥራ ሂደት"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Mata Duree Afaan Ingilizitiin (English Title)
                    </label>
                    <input
                      type="text"
                      value={wfTitleEn}
                      onChange={(e) => setWfTitleEn(e.target.value)}
                      placeholder="Land & Real Estate Legal Adjudication Workflow"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Ibsa Adeemsa Seeraa (Description)
                  </label>
                  <textarea
                    value={wfDescription}
                    onChange={(e) => setWfDescription(e.target.value)}
                    rows={2}
                    placeholder="Adeemsi kun dhimmoota falmii lafaa, iyyannoo dhiyaatu irraa eegalee hanga murtii dhumaa dhiyaatutti hordofa..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Court Level & Classification */}
              <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Sadarkaa Mana Murtii (Target Level)
                  </label>
                  <select
                    value={wfTargetLevel}
                    onChange={(e) => setWfTargetLevel(e.target.value as CourtLevelType)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="first_instance">Mana Murtii Sadarkaa Jalqabaa (First Instance / Aanaa)</option>
                    <option value="high_court">Mana Murtii Olaanaa (High Court / Godina)</option>
                    <option value="cassation">Dhaddacha Ijibbaataa (Cassation Division)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Gosa Falmii Seeraa (Procedure Type)
                  </label>
                  <select
                    value={wfProcedureType}
                    onChange={(e) => setWfProcedureType(e.target.value as LegalProcedureType)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="civil">Hariiroo Hawaasaa (Civil)</option>
                    <option value="criminal">Yakkaa (Criminal)</option>
                    <option value="land">Lafaafi Qabeenya (Land & Property)</option>
                    <option value="labor">Hojjataafi Hojjechiisaa (Labor)</option>
                    <option value="commercial">Daldalaa fi Invastimantii (Commercial)</option>
                    <option value="family">Maatiifi Daa'imman (Family)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Dhaddachoota Qaqqaban (Benches)
                  </label>
                  <input
                    type="text"
                    value={wfBenchesInput}
                    onChange={(e) => setWfBenchesInput(e.target.value)}
                    placeholder="Dhaddacha Yakkaa, Dhaddacha Hariiroo Hawaasaa"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* STAGES BUILDER PIPELINE */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-amber-400" />
                    <span>Sadarkaalee Adeemsa Seeraa (Workflow Stages Pipeline)</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Akkaataa seera biyya keenyaatti sadarkaalee 'Drafting' ➔ 'Review' ➔ 'Approval' ➔ 'Final Filing' qindeessaa.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddStage}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sadarkaa Dabali</span>
                </button>
              </div>

              <div className="space-y-3">
                {wfStages.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 relative group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={stage.nameOm}
                          onChange={(e) => handleUpdateStage(idx, 'nameOm', e.target.value)}
                          placeholder="Maqaa Sadarkaa (Afaan Oromoo)"
                          className="bg-transparent border-b border-transparent focus:border-amber-500 text-xs font-bold text-white px-1 py-0.5 w-64 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">Stage Code:</span>
                        <input
                          type="text"
                          value={stage.code}
                          onChange={(e) => handleUpdateStage(idx, 'code', e.target.value.toUpperCase())}
                          placeholder="DRAFTING"
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-amber-300 font-mono font-bold w-28 uppercase"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(idx)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          title="Haqi Sadarkaa Kana"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">Ibsa Sadarkaa (Description & Tasks)</label>
                        <input
                          type="text"
                          value={stage.descriptionOm}
                          onChange={(e) => handleUpdateStage(idx, 'descriptionOm', e.target.value)}
                          placeholder="Hojiilee sadarkaa kana keessatti raawwataman..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Bu'uura Seeraa (Legal Basis Article)</label>
                        <input
                          type="text"
                          value={stage.legalBasis}
                          onChange={(e) => handleUpdateStage(idx, 'legalBasis', e.target.value)}
                          placeholder="C.P.C Art. 222 ykn Labsii 216/2011"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('workflows')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Dhiisi (Cancel)
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Adeemsa Seeraa Raggaasisi (Save Workflow)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: STAFF ROSTER & PROVISIONING
          ========================================================================= */}
      {activeSubTab === 'staff_roster' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>Abbootii Seeraa fi Ogeessota Mana Murtii (Bench Roster)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fayyadamtoota mana murtii kanaan qophaa'aniif koodii eeyyamaa kennaa, eeyyama dhoorkaa ykn haaromsaa.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportStaffCSV}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Download court employees list as CSV file"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Barbaadi ogeessa..."
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 w-56"
                  />
                </div>
              </div>
            </div>

            {/* CREATE STAFF FORM */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Ogeessa Haaraa Uumi (Provision New Staff Account)</span>
              </h4>

              {staffActionMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  staffActionMsg.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}>
                  {staffActionMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Maqaa Guutuu *</label>
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="Abbaa Seeraa / Ogeessa..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email / Username *</label>
                    <input
                      type="text"
                      value={newUsernameOrEmail}
                      onChange={(e) => setNewUsernameOrEmail(e.target.value)}
                      placeholder="ogeessa@court.oromia.et"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Passcode (Jecha Icciitii) *</label>
                    <input
                      type="text"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="JUDGE-2026"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Ogummaa (Court Role)</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as CourtRole)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="judge">Abbaa Seeraa (Judge / Bench President)</option>
                      <option value="assistant_judge">Gargaaraa Abbaa Seeraa (Assistant Judge)</option>
                      <option value="registrar">Reejistiraara Dhaddachaa (Registrar/Clerk)</option>
                      <option value="auditor">Odiitara Galmee (Record Auditor)</option>
                      <option value="legal_expert">Ogeessa Seeraa Biroo (Legal Expert)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Dhaddacha (Bench)</label>
                    <input
                      type="text"
                      value={newBench}
                      onChange={(e) => setNewBench(e.target.value)}
                      placeholder="Dhaddacha Yakkaa / Hariiroo Hawaasaa"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ID / Waraqaa Eeyyamaa</label>
                    <input
                      type="text"
                      value={newLicenseNo}
                      onChange={(e) => setNewLicenseNo(e.target.value)}
                      placeholder="fkn. OSC-BENCH-08"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Fayyadamaa Uumi</span>
                  </button>
                </div>
              </form>
            </div>

            {/* STAFF ROSTER TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Maqaa & Ogummaa</th>
                    <th className="py-3 px-4">Dhaddacha</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Passcode</th>
                    <th className="py-3 px-4">Adeemsa Seeraa</th>
                    <th className="py-3 px-4">Haala</th>
                    <th className="py-3 px-4 text-right">Tarkaanfii</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        Ogeessi mana murtii kana keessatti galmaa'e hin jiru.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((u) => {
                      const assignedWfs = workflows.filter(w => (w.assignedUserIds || []).includes(u.id));
                      return (
                        <tr key={u.id} className="hover:bg-slate-950/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{u.fullName}</div>
                            <div className="text-[10px] text-amber-400 font-mono uppercase">
                              {u.role.replace('_', ' ')}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{u.bench}</td>
                          <td className="py-3 px-4 font-mono text-slate-300">{u.usernameOrEmail}</td>
                          <td className="py-3 px-4 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-200">
                                {u.passcode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyPasscode(u.id, u.passcode)}
                                className="p-1 hover:text-amber-400 text-slate-500 transition-colors cursor-pointer"
                                title="Copy Passcode"
                              >
                                {copiedUserId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono text-[10px]">
                              {assignedWfs.length} Workflows
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}>
                              {u.status === 'active' ? '🟢 Active' : '🔴 Suspended'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWorkflowForAssignment(workflows[0] || null);
                                setActiveSubTab('workflow_assignments');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-bold transition-all cursor-pointer"
                            >
                              Ramadi
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-all cursor-pointer"
                            >
                              {u.status === 'active' ? 'Dhoorki' : 'Eeyyami'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: WORKFLOW ASSIGNMENTS MATRIX
          ========================================================================= */}
      {activeSubTab === 'workflow_assignments' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>Ramaddii Adeemsa Seeraa (Assign Workflows to Staff)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Abbootii Seeraafi Ogeessota mana murtii kanaatiif adeemsa hojii isaaniif malu ramadaa.
              </p>
            </div>

            {/* Select active workflow for mass assigning */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Adeemsa Seeraa:</span>
              <select
                value={selectedWorkflowForAssignment?.id || (workflows[0]?.id || '')}
                onChange={(e) => {
                  const wf = workflows.find(w => w.id === e.target.value);
                  setSelectedWorkflowForAssignment(wf || null);
                }}
                className="bg-slate-950 border border-slate-700 text-amber-400 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              >
                {workflows.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.title.slice(0, 45)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignment Matrix Container */}
          {selectedWorkflowForAssignment ? (
            <div className="space-y-6">
              {/* Selected Workflow Highlight Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[10px] uppercase font-bold">
                      {selectedWorkflowForAssignment.courtLevel.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Procedure: {selectedWorkflowForAssignment.procedureType.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white">
                    {selectedWorkflowForAssignment.title}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {selectedWorkflowForAssignment.description}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-emerald-400 font-bold">
                    {(selectedWorkflowForAssignment.assignedUserIds || []).length} / {institutionStaff.length} Assigned
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Stages: {selectedWorkflowForAssignment.stages.length}
                  </div>
                </div>
              </div>

              {/* Staff List with Direct Checkboxes */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Tarree Ogeessota Mana Murtii (Staff Allocation):
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {institutionStaff.map((staff) => {
                    const isAssigned = (selectedWorkflowForAssignment.assignedUserIds || []).includes(staff.id);

                    return (
                      <div
                        key={staff.id}
                        onClick={() => handleToggleUserWorkflowAssignment(selectedWorkflowForAssignment.id, staff.id, isAssigned)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isAssigned
                            ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/15'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isAssigned ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-500'
                          }`}>
                            {isAssigned ? <Check className="w-4 h-4 stroke-[3]" /> : <UserPlus className="w-4 h-4" />}
                          </div>

                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-2">
                              <span>{staff.fullName}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-mono">
                                {staff.role.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                              {staff.bench} • {staff.usernameOrEmail}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold font-mono ${
                            isAssigned
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}>
                            {isAssigned ? '✓ Assigned' : '+ Assign'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              Adeemsi seeraa filatame hin jiru.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          WORKFLOW DETAIL STAGES MODAL
          ========================================================================= */}
      {selectedWorkflowForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                  {selectedWorkflowForDetail.courtLevel.replace('_', ' ')}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedWorkflowForDetail.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedWorkflowForDetail.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWorkflowForDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stages Vertical Flow */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Tartiiba Sadarkaalee Seeraa (Procedural Step Breakdown):
              </h4>

              <div className="space-y-4">
                {selectedWorkflowForDetail.stages.map((stg, i) => (
                  <div
                    key={stg.id || i}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                          {stg.order}
                        </span>
                        <span>{stg.nameOm}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[10px] border border-slate-800">
                        {stg.code}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 pl-7">
                      {stg.descriptionOm}
                    </p>

                    <div className="pl-7 pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <div className="font-mono text-amber-400">
                        ⚖️ Bu'uura Seeraa: <strong>{stg.legalBasis}</strong>
                      </div>
                      <div className="text-slate-500">
                        Qaama Hojjatu: {stg.assignedRoles.join(', ')}
                      </div>
                    </div>

                    {stg.requiredChecklistOm && stg.requiredChecklistOm.length > 0 && (
                      <div className="pl-7 pt-2">
                        <div className="text-[10px] font-mono text-slate-500 uppercase">Ulaagaalee Mirkaneessaa (Checklist):</div>
                        <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5 mt-1">
                          {stg.requiredChecklistOm.map((chk, cIdx) => (
                            <li key={cIdx}>{chk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedWorkflowForDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Cufi (Close)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* =========================================================================
          SUB-TAB 5: ADMIN ROLES & STAFF ASSIGNMENTS (RBAC Enforced)
          ========================================================================= */}
      {activeSubTab === 'admin_roles' && (
        <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Gosa Gahee Bulchiinsa Fi Ramaddii (Administrative Roles & Assignments)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Super-admin mana murtii gahee bulchiinsa addaa uumuu fi hojjettootaaf ramaduu danda'a (RBAC Enforced: court_personnel required).
              </p>
            </div>

            {!hasCourtPersonnelRole && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Gaheen 'court_personnel' barbaachisa!</span>
              </div>
            )}
          </div>

          {/* Add Admin Role Form */}
          {hasCourtPersonnelRole ? (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">Gahee Bulchiinsa Haaraa Uumi (Define New Admin Role)</h4>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newAdminRoleName}
                  onChange={(e) => setNewAdminRoleName(e.target.value)}
                  placeholder="fkn. Chief Registrar / Case Inspector / Secretariat Head"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newAdminRoleName.trim() && !adminRoles.includes(newAdminRoleName.trim())) {
                      setAdminRoles([...adminRoles, newAdminRoleName.trim()]);
                      setNewAdminRoleName('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Gahee Dabali</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              Gahee 'court_personnel' qofaatu gahee bulchiinsa haaraa uumuu danda'a.
            </div>
          )}

          {/* List of Defined Admin Roles & Assignment to Staff */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">Gaheewwan Hiikaman & Ramaddii Hojjettootaa (Roles & Personnel Assignments):</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminRoles.map((roleName, rIdx) => {
                const assignedStaff = institutionStaff.filter(s => assignedAdminRolesMap[s.id] === roleName);
                return (
                  <div key={rIdx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>{roleName}</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800">
                        {assignedStaff.length} Assigned
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-400 font-medium">Hojjettoota Ramadaman (Assign Staff):</div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 no-scrollbar">
                        {institutionStaff.map(staff => {
                          const isAssignedToThisRole = assignedAdminRolesMap[staff.id] === roleName;
                          return (
                            <div key={staff.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                              <div>
                                <div className="font-bold text-white text-[11px]">{staff.fullName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{staff.bench}</div>
                              </div>
                              <button
                                type="button"
                                disabled={!hasCourtPersonnelRole}
                                onClick={() => {
                                  const updatedMap = { ...assignedAdminRolesMap };
                                  if (isAssignedToThisRole) {
                                    delete updatedMap[staff.id];
                                  } else {
                                    updatedMap[staff.id] = roleName;
                                  }
                                  setAssignedAdminRolesMap(updatedMap);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
                                  isAssignedToThisRole
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {isAssignedToThisRole ? '✓ Assigned' : 'Ramadi'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 6: BRANDING & LOGO (NEW)
          ========================================================================= */}
      {activeSubTab === 'branding' && currentInstitution && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Loogoo & Bifa Mana Murtii (Court Branding)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Maqaa dhuunfaa mana murtii keessanii fi loogoo (logo) asirratti haaromsuu dandeessu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo Upload Section */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-200">Loogoo Mana Murtii (Court Logo)</label>
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-950/50 hover:bg-slate-950 transition-all group relative overflow-hidden">
                {currentInstitution.logoUrl ? (
                  <img 
                    src={currentInstitution.logoUrl} 
                    alt="Court Logo" 
                    className="w-32 h-32 object-contain rounded-xl mb-4"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-slate-900 flex items-center justify-center mb-4 border border-slate-800">
                    <ImageIcon className="w-12 h-12 text-slate-700" />
                  </div>
                )}
                
                <input 
                  type="file" 
                  id="logo-upload"
                  className="hidden" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const downloadURL = await uploadCourtLogo(currentInstitution.id, file);
                        setStaffActionMsg({ type: 'success', text: 'Loogoon milkaa\'inaan haaromfameera!' });
                      } catch (error) {
                        console.error('Upload failed:', error);
                        setStaffActionMsg({ type: 'error', text: 'Upload failed. Please check your connection.' });
                      }
                      setTimeout(() => setStaffActionMsg(null), 3000);
                    }
                  }}
                />
                
                <button
                  type="button"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Loogoo Filadhu (Upload)</span>
                </button>
                <p className="text-[10px] text-slate-500 mt-2">PNG ykn JPG, hamma 2MB gadi.</p>
              </div>
            </div>

            {/* Custom Name Section */}
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-200">Maqaa Mana Murtii (Custom Name)</label>
                <input
                  type="text"
                  defaultValue={currentInstitution.customCourtName || currentInstitution.name}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val && val !== (currentInstitution.customCourtName || currentInstitution.name)) {
                      updateCourtBrandingAndSuperAdmin(currentInstitution.id, {
                        customCourtName: val
                      });
                      setStaffActionMsg({ type: 'success', text: 'Maqaan mana murtii milkaa\'inaan jijjiirameera!' });
                      setTimeout(() => setStaffActionMsg(null), 3000);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 shadow-inner"
                  placeholder="fkn. Mana Murtii Aanaa Doobbaa"
                />
                <p className="text-[11px] text-slate-500 italic">
                  Maqaan asitti galchitan galmeewwan, xalayoota fi mata-duree appii irratti ni calaqqisa.
                </p>
              </div>

              {/* Dedicated Court Domain Link Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                    <span>🌐</span>
                    <span>LINKII MANA MURTII (COURT VIRTUAL DOMAIN)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const details = getCourtLinkDetails(currentInstitution);
                      navigator.clipboard.writeText(details.fullHttpUrl);
                      setStaffActionMsg({ type: 'success', text: `Linkii Mana Murtii waraabbatameera: ${details.fullHttpUrl}` });
                      setTimeout(() => setStaffActionMsg(null), 3000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition-all cursor-pointer shadow"
                  >
                    Waraabi (Copy Link)
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-mono text-xs font-bold flex items-center justify-between">
                  <span>{getCourtLinkDetails(currentInstitution).fullHttpUrl}</span>
                  <span className="text-[10px] text-slate-400">({getCourtLinkDetails(currentInstitution).domainHandle})</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Linkii kana hojjettootaa fi abbootii seeraatiif erguun fooldara mana murtii isaanii akka seenaan gochuu dandeessu.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Privacy & Authority Guarantee</span>
                </div>
                <p className="text-[11px] text-amber-200/70 leading-relaxed">
                  Branding kun dhimmoota seeraa fi iccitii galmee irratti dhiibbaa hin qabu. 
                  Platform Owner (Ayele Be Dha) metadata dhaabbataa qofa arguun danda'u.
                </p>
              </div>
            </div>
          </div>

          {staffActionMsg && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${
              staffActionMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}>
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-xs font-bold">{staffActionMsg.text}</span>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 7: AUDIT LOG
          ========================================================================= */}
      {activeSubTab === 'audit_logs' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>Audit Log (Oversight Trail)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tarkaanfiiwwan bulchiinsa manneen murtii, ramaddii dhaddachaa fi mirkaneessa hojjetaa hordofaa.
            </p>
          </div>
          <AuditLogPanel institutionId={selectedInstitutionId} />
        </div>
      )}

      {/* Court Super Admin Custom Branding & Delegation Modal */}
      {showBrandingModal && currentInstitution && (
        <CourtTenantBrandingModal
          currentLang={currentLang}
          institution={currentInstitution}
          onClose={() => setShowBrandingModal(false)}
          onUpdated={() => {
            reloadWorkflows();
            setCourtUsers(getLocalCourtUsers());
          }}
        />
      )}

      {/* App Owner Multi-Tenant Registry & Judicial Privacy Shield Modal */}
      {showAppOwnerRegistryModal && (
        <AppOwnerTenantRegistryModal
          currentLang={currentLang}
          onClose={() => setShowAppOwnerRegistryModal(false)}
        />
      )}
    </div>
  );
};
