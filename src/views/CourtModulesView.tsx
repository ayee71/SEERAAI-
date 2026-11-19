import React, { useState } from 'react';
import { 
  Building2, 
  Folder, 
  ShieldCheck, 
  BarChart3, 
  MessageSquare,
  Scale,
  ArrowRight,
  Users,
  Key,
  Search,
  Plus,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Tv,
  Megaphone,
  FileText,
  DollarSign,
  Lock,
  UserCheck,
  Building,
  Check,
  X,
  Volume2,
  Filter,
  Download,
  List,
  Printer,
  Shield,
  Layers,
  Sparkles,
  UserPlus,
  Copy,
  Sliders,
  FilePlus,
  Info,
  Wifi,
  WifiOff,
  RefreshCw,
  Database
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { 
  saveCaseFileOffline, 
  getCaseFilesOffline, 
  saveTemplateOffline, 
  getTemplatesOffline, 
  syncOfflineDataWithFirestore,
  getInstitutionIdFromCourtName,
  DEFAULT_INSTITUTION_ID,
  CourtCaseFile,
  CourtTemplateFile
} from '../services/courtOfflineStore';

interface ModuleProps {
  currentLang: Language;
  onNavigate: (tab: string) => void;
}

export const CourtModulesView: React.FC<ModuleProps> = ({ currentLang, onNavigate }) => {
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const [activeModuleTab, setActiveModuleTab] = useState<
    'overview' | 'user_mgmt' | 'queue_mgmt' | 'template_engine' | 'log_module' | 'security' | 'financial'
  >('overview');

  // --- TOAST FEEDBACK ---
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // --- AUDIT LOGS STATE ---
  const [auditLogs, setAuditLogs] = useState<any[]>([
    { id: 'log-1', time: '2026-10-31 14:32:01', action: 'DATA_CHANGE', user: 'caalaa@court.oromia.et', details: 'Updated Bench Assignment for Case CR-2026/089' },
    { id: 'log-2', time: '2026-10-31 14:15:22', action: 'USER_LOGIN', user: 'tolasaa@court.oromia.et', details: 'Authorized session established via Biometrics' },
    { id: 'log-3', time: '2026-10-31 13:58:10', action: 'QUEUE_UPDATE', user: 'SYSTEM_QMS', details: 'Queue Q-102 moved from Waiting to Calling' },
    { id: 'log-4', time: '2026-10-31 12:40:05', action: 'TEMPLATE_GEN', user: 'birraatuu@court.oromia.et', details: 'Generated PDF preview for Iyyata Sirreffamaa' },
  ]);

  const addAuditLog = (action: string, user: string, details: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setAuditLogs(prev => [
      { id: `log-${Date.now()}`, time: now, action, user, details },
      ...prev
    ]);
  };

  // --- INSTITUTION SCOPING & OFFLINE SYNC STATE ---
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('inst_oromia_supreme');
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedCount, setSyncedCount] = useState<number>(0);

  // Monitor network status and run auto-sync
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      handleManualSync();
    };
    const handleOffline = () => setIsOffline(true);
    const handleSyncDone = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSyncedCount(detail?.syncedCount || 0);
      showToast(isOm ? `Sinkii koodii/dataa offline ${detail?.syncedCount || 0} raawwatameera!` : `Synced ${detail?.syncedCount || 0} offline updates to Firestore!`);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('court_offline_sync_completed', handleSyncDone);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('court_offline_sync_completed', handleSyncDone);
    };
  }, [currentLang]);

  // Load offline IndexedDB data on mount or when institution selection changes
  React.useEffect(() => {
    const loadIndexedDbData = async () => {
      const cachedTemplates = await getTemplatesOffline(selectedInstitutionId === 'ALL' ? undefined : selectedInstitutionId);
      if (cachedTemplates.length > 0) {
        setTemplates(cachedTemplates);
      }
    };
    loadIndexedDbData();
  }, [selectedInstitutionId]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncOfflineDataWithFirestore();
      if (res.syncedCount > 0) {
        showToast(isOm ? `Dataan offline ${res.syncedCount} milkaa'inaan Firestore tiin Sinkii ta'eera!` : `Successfully synced ${res.syncedCount} items to Firestore!`);
      } else {
        showToast(isOm ? 'Dataan Sinkii ta\'uu qabu hin jiru. Local IndexedDB Sinkii ta\'eera!' : 'All offline records are already in sync!');
      }
    } catch (e) {
      console.error('Manual sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- USER MANAGEMENT STATES ---
  const [userSearch, setUserSearch] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showChangeCourtModal, setShowChangeCourtModal] = useState<any | null>(null);
  const [showAssignBenchModal, setShowAssignBenchModal] = useState<any | null>(null);
  const [showAssignBenchTypeModal, setShowAssignBenchTypeModal] = useState<any | null>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState<any | null>(null);
  const [selectedCourtForTransfer, setSelectedCourtForTransfer] = useState('Mana Murtii Aanaa Adaamaa');
  const [selectedBenchType, setSelectedBenchType] = useState('Hariiroo Hawaasaa');
  const [selectedBenches, setSelectedBenches] = useState<string[]>(['Dhaddacha 1ffaa', 'Dhaddacha 2ffaa']);

  const [staffUsers, setStaffUsers] = useState<any[]>([
    { id: 'usr-1', name: 'Abbaa Seeraa Caalaa Beqeelaa', email: 'caalaa@court.oromia.et', phone: '+251911223344', role: 'Judge', court: 'Mana Murtii Waliigalaa Oromiyaa', status: 'Active', availability: 'Active', bench: 'Dhaddacha 1ffaa', benchType: 'Hariiroo Hawaasaa' },
    { id: 'usr-2', name: 'Ofiisara Seeraa Tolasaa Dinqaa', email: 'tolasaa@court.oromia.et', phone: '+251922334455', role: 'Registrar', court: 'Mana Murtii Aanaa Adaamaa', status: 'Active', availability: 'Active', bench: 'Dhaddacha 2ffaa', benchType: 'Yakka' },
    { id: 'usr-3', name: 'Abbaa Alangaa Birraatuu Oljiraa', email: 'birraatuu@court.oromia.et', phone: '+251933445566', role: 'Prosecutor', court: 'Mana Murtii Aanaa Gurbicha', status: 'Active', availability: 'Unavailable', bench: 'Dhaddacha 1ffaa', benchType: 'Maatii' },
    { id: 'usr-4', name: 'Galmeessaa Musxafaa Kadiir', email: 'musxafaa@court.oromia.et', phone: '+251944556677', role: 'Staff', court: 'Mana Murtii Olaanaa Shaggar', status: 'Inactive', availability: 'Active', bench: 'Dhaddacha 3ffaa', benchType: 'Daldala' },
  ]);

  // New User Form State
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Judge',
    court: 'Mana Murtii Waliigalaa Oromiyaa',
    bench: 'Dhaddacha 1ffaa',
    benchType: 'Hariiroo Hawaasaa',
  });

  // New Role Form State
  const [systemRoles, setSystemRoles] = useState<any[]>([
    { id: 'role-1', title: 'Court Admin', code: 'ADMIN', permissions: ['case_read', 'case_write', 'order_sign', 'user_manage', 'template_build', 'queue_control', 'financial_fee', 'audit_view'] },
    { id: 'role-2', title: 'Judge / Abbaa Seeraa', code: 'JUDGE', permissions: ['case_read', 'order_sign', 'template_build'] },
    { id: 'role-3', title: 'Registrar / Ofiisara Seeraa', code: 'REGISTRAR', permissions: ['case_read', 'case_write', 'queue_control'] },
  ]);
  const [newRoleForm, setNewRoleForm] = useState({
    roleTitle: '',
    roleCode: '',
    permissions: ['case_read', 'case_write'] as string[],
  });

  // --- QUEUE MANAGEMENT STATES ---
  const [showNewQueueModal, setShowNewQueueModal] = useState(false);
  const [showAddScreenModal, setShowAddScreenModal] = useState(false);
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);

  const [queueRequests, setQueueRequests] = useState<any[]>([
    { id: 'Q-101', caseNo: '06-2026-077287', applicant: 'Tolasaa Dinqaa', service: 'Direct Case Services', court: 'MMW Oromiyaa', status: 'Waiting', priority: 'High (Disabled)', room: 'Hariiroo Hawaasaa 1', date: '2026-10-31' },
    { id: 'Q-102', caseNo: '05-2026-077282', applicant: 'Beenyaa Tolima', service: 'Appeal', court: 'MMO Shaggar', status: 'Calling', priority: 'Normal', room: 'Dhaddacha Yakkaa 2', date: '2026-10-31' },
    { id: 'Q-103', caseNo: '06-2026-077283', applicant: 'Fiqaaduu Adaraa', service: 'Cassation', court: 'MMW Oromiyaa', status: 'In Progress', priority: 'High (Elderly)', room: 'Dhaddacha Ijibbaataa', date: '2026-10-31' },
    { id: 'Q-104', caseNo: '05-2026-077279', applicant: 'Alamituu Waqjiraa', service: 'Defense', court: 'MMA Dadar', status: 'Completed', priority: 'Normal', room: 'Dhaddacha 1', date: '2026-10-30' },
  ]);

  const [newQueueForm, setNewQueueForm] = useState({
    caseNo: '',
    applicant: '',
    service: 'Direct Case Services',
    court: 'MMW Oromiyaa',
    room: 'Hariiroo Hawaasaa 1',
    priority: 'Normal',
  });

  const [tvScreens, setTvScreens] = useState<any[]>([
    { id: 'scr-1', name: 'Information Display Floor 1', location: 'Floorii 1ffaa Lobby', type: 'Queue Display', status: 'Active' },
    { id: 'scr-2', name: 'Bench 2 Waiting Screen', location: 'Hallii Dhaddacha 2', type: 'Announcement Display', status: 'Active' },
  ]);
  const [newScreenForm, setNewScreenForm] = useState({
    name: '',
    location: '',
    type: 'Queue Display',
  });

  const [announcements, setAnnouncements] = useState<any[]>([
    { id: 'anc-1', title: 'Walgahii Ariifachiisaa', content: 'Hojjatoota Mana Murtii hundaaf boruu sa\'aatii 3:00 irratti walgahiin waan jiruuf galma guddaatti argamaa.', priority: 'Medium', status: 'Active' },
    { id: 'anc-2', title: 'Leenjii Akka Hojirraa Oolchitan', content: 'Leenjii MMW Oromiyaa ilaalchisee leenjifamtoota kana akka hojirraa oolchitan.', priority: 'High', status: 'Active' },
  ]);
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'Medium',
  });

  // --- TEMPLATE ENGINE STATES (TMS) ---
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('All');
  const [templateSearch, setTemplateSearch] = useState('');
  const [showTemplateBuilderModal, setShowTemplateBuilderModal] = useState(false);
  const [showGeneratePreviewModal, setShowGeneratePreviewModal] = useState<any | null>(null);

  const [templates, setTemplates] = useState<any[]>([
    { 
      id: 'tmpl-1', 
      name: 'Iyyata Sirreffamaa', 
      category: 'Order', 
      domain: 'Civil', 
      lastModified: '2026-10-27 05:43 PM',
      content: `MANA MURTII {{COURT_NAME}}
LAKK. GALMEE: {{CASE_NO}}
GUYYAA: {{DATE}}

ABBAA SEERAA: {{JUDGE_NAME}}
OLIIYATAA / PLAINTIFF: {{PLAINTIFF}}
DEEBII KENNAN / DEFENDANT: {{DEFENDANT}}

AJAJA MANA MURTII:
Manni murtii kun dhimma iyyata sirreeffamaa galmee lakk. {{CASE_NO}} irratti dhiyaate qorachuudhaan, qabeenya falmiif sababa ta'e irratti ajaja ugguraa yeroo dabarseera.`
    },
    { 
      id: 'tmpl-2', 
      name: 'Galagalcha Murtii', 
      category: 'Judgment', 
      domain: 'Civil', 
      lastModified: '2026-10-27 11:13 AM',
      content: `MANA MURTII WALIIGALAA OROMIYAA
LAKK. GALMEE: {{CASE_NO}}
GUYYAA: {{DATE}}

MURTII DHUMAA (FINAL JUDGMENT):
Dhimma falmii waliigaltee qabeenyaa dhaddacha kana dura jiru ilaalchisee, ragaan dhiyaate madaalamee murtiin dhumataa kennameera.`
    },
    { 
      id: 'tmpl-3', 
      name: 'Unkaa Adda Addaa 13', 
      category: 'Order', 
      domain: 'Civil', 
      lastModified: '2026-10-26 10:41 AM',
      content: `MANA MURTII AANAA
UNKAA SEERAA LAKK. 13

AJAJA BEELAMA DHADDACHAA:
Himataan fi Himatamaan boruu sa'aatii 3:30 irratti dhaddacha 1ffaa akkaa argaman ajajameera.`
    },
    { 
      id: 'tmpl-4', 
      name: 'Waraqaa Waamicha Dhaddachaa', 
      category: 'Notice', 
      domain: 'Criminal', 
      lastModified: '2026-10-25 09:30 AM',
      content: `MANA MURTII OLAANAA SHAGGAR
WARAQAA WAAMICHA DHADDACHAA (COURT SUMMONS)

Gara Obbo/Adde: {{DEFENDANT}}
Akka seera adeemsa falmii yakkaa keeyyata 120 bu'uura godhachuun sa'aatii 2:30 irratti dhaddachatti akka dhiyaattan isin beeksifna.`
    },
  ]);

  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    category: 'Order',
    domain: 'Civil',
    content: `MANA MURTII {{COURT_NAME}}
LAKK. GALMEE: {{CASE_NO}}
GUYYAA: {{DATE}}

ABBAA SEERAA: {{JUDGE_NAME}}
OLIIYATAA / PLAINTIFF: {{PLAINTIFF}}
DEEBII KENNAN / DEFENDANT: {{DEFENDANT}}

AJAJA / MURTII MANA MURTII:
{{ORDER_DETAILS}}

Manni murtii dhimma kana qoratee ajaja seeraa dabrseera.`,
  });

  // Preview / PDF Customization Form State
  const [previewCustomFields, setPreviewCustomFields] = useState({
    courtName: 'Mana Murtii Waliigalaa Oromiyaa',
    caseNo: '342465',
    date: '16/09/2018 E.C.',
    judgeName: 'Abbaa Seeraa Caalaa Beqeelaa',
    plaintiff: 'Tolasaa Dinqaa',
    defendant: 'Beenyaa Tolima',
    orderDetails: 'Manni murtii kun dhimma kan ilaalee hanga furmaata tokko kennutti ykn ajaja kan biraa dabarsutti qabeenyi iyyannaa irratti caqafame himatamaa ta\'uun isaa eerga mirkanaa\'ee booda akka hin gurguramne, hin jijjiiramne fi nama 3ffaatti hin dabarre.',
  });

  // --- HANDLERS FOR USER MANAGEMENT ---
  const handleToggleUserStatus = (userId: string) => {
    setStaffUsers(prev => prev.map(u => u.id === userId ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
    showToast(isOm ? 'Haalli hojjetaa jijjiirameera!' : 'User status updated!');
    addAuditLog('USER_STATUS_TOGGLE', 'admin', `Toggled status for user ID: ${userId}`);
  };

  const handleToggleAvailability = (userId: string) => {
    setStaffUsers(prev => prev.map(u => u.id === userId ? { ...u, availability: u.availability === 'Active' ? 'Unavailable' : 'Active' } : u));
    showToast(isOm ? 'Availability hojjetaa jijjiirameera!' : 'User availability updated!');
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm(isOm ? 'Hojjetaa kana galmee irraa haqaa?' : 'Are you sure you want to remove this staff user?')) {
      setStaffUsers(prev => prev.filter(u => u.id !== userId));
      showToast(isOm ? 'Hojjetaan galmee irraa haqameera!' : 'Staff user deleted successfully!');
      addAuditLog('USER_DELETE', 'admin', `Deleted user ID: ${userId}`);
    }
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) {
      alert(isOm ? 'Maaloo Maqaa fi Email zalachiisaa!' : 'Please enter Name and Email!');
      return;
    }
    const instId = getInstitutionIdFromCourtName(newUserForm.court);
    const newUser = {
      id: `usr-${Date.now()}`,
      institutionId: instId,
      name: newUserForm.name,
      email: newUserForm.email,
      phone: newUserForm.phone || '+251900000000',
      role: newUserForm.role,
      court: newUserForm.court,
      bench: newUserForm.bench,
      benchType: newUserForm.benchType,
      status: 'Active',
      availability: 'Active',
    };
    setStaffUsers(prev => [newUser, ...prev]);
    setShowAddUserModal(false);
    setNewUserForm({
      name: '',
      email: '',
      phone: '',
      role: 'Judge',
      court: 'Mana Murtii Waliigalaa Oromiyaa',
      bench: 'Dhaddacha 1ffaa',
      benchType: 'Hariiroo Hawaasaa',
    });
    showToast(isOm ? `Hojjetaan haaraan Mana Murtii [${newUserForm.court}] tiif galmeeffameera!` : `New staff user registered for ${newUserForm.court}!`);
    addAuditLog('USER_REGISTER', 'admin', `Registered staff user: ${newUser.name} (${newUser.email}) for institution: ${instId}`);
  };

  const handleAddRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.roleTitle || !newRoleForm.roleCode) {
      alert(isOm ? 'Maaloo Mata Duree fi Code Gahee zalachiisaa!' : 'Please fill Role Title and Role Code!');
      return;
    }
    const newRole = {
      id: `role-${Date.now()}`,
      title: newRoleForm.roleTitle,
      code: newRoleForm.roleCode.toUpperCase(),
      permissions: newRoleForm.permissions,
    };
    setSystemRoles(prev => [...prev, newRole]);
    setShowAddRoleModal(false);
    setNewRoleForm({ roleTitle: '', roleCode: '', permissions: ['case_read', 'case_write'] });
    showToast(isOm ? "Gaheen haaraan permishinii waliin uumameera!" : 'New system role created!');
    addAuditLog('ROLE_CREATE', 'admin', `Created role: ${newRole.title} [${newRole.code}]`);
  };

  // --- HANDLERS FOR TEMPLATE ENGINE (TMS) ---
  const handleAddTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateForm.name || !newTemplateForm.content) {
      alert(isOm ? 'Maaloo Maqaa fi Qabiyyee Template zalachiisaa!' : 'Please enter Template Name and Content!');
      return;
    }
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newTmpl: CourtTemplateFile = {
      id: `tmpl-${Date.now()}`,
      institutionId: selectedInstitutionId === 'ALL' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId,
      name: newTemplateForm.name,
      category: newTemplateForm.category,
      domain: newTemplateForm.domain,
      lastModified: nowStr,
      content: newTemplateForm.content,
    };
    await saveTemplateOffline(newTmpl);
    setTemplates(prev => [newTmpl, ...prev]);
    setShowTemplateBuilderModal(false);
    setNewTemplateForm({
      name: '',
      category: 'Order',
      domain: 'Civil',
      content: `MANA MURTII {{COURT_NAME}}
LAKK. GALMEE: {{CASE_NO}}
GUYYAA: {{DATE}}

ABBAA SEERAA: {{JUDGE_NAME}}
OLIIYATAA / PLAINTIFF: {{PLAINTIFF}}
DEEBII KENNAN / DEFENDANT: {{DEFENDANT}}

AJAJA / MURTII MANA MURTII:
{{ORDER_DETAILS}}

Manni murtii dhimma kana qoratee ajaja seeraa dabrseera.`,
    });
    showToast(isOm ? "Template haaraan Local IndexedDB & TMS keessatti qophaa'eera!" : 'New template saved to Local IndexedDB & TMS!');
    addAuditLog('TEMPLATE_CREATE', 'admin', `Created template: ${newTmpl.name} [${newTmpl.institutionId}]`);
  };

  const handleDeleteTemplate = (tmplId: string) => {
    if (confirm(isOm ? 'Template kana haqinaa?' : 'Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== tmplId));
      showToast(isOm ? 'Template haqameera!' : 'Template deleted!');
      addAuditLog('TEMPLATE_DELETE', 'admin', `Deleted template ID: ${tmplId}`);
    }
  };

  // --- HANDLERS FOR QUEUE MANAGEMENT (QMS) ---
  const handleAddQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueForm.applicant || !newQueueForm.caseNo) {
      alert(isOm ? 'Maaloo Lakk. Galmee fi Maqaa Iyyataa zalachiisaa!' : 'Please fill Case No and Applicant Name!');
      return;
    }
    const newQ = {
      id: `Q-${Math.floor(100 + Math.random() * 900)}`,
      caseNo: newQueueForm.caseNo,
      applicant: newQueueForm.applicant,
      service: newQueueForm.service,
      court: newQueueForm.court,
      status: 'Waiting',
      priority: newQueueForm.priority,
      room: newQueueForm.room,
      date: new Date().toISOString().split('T')[0],
    };
    setQueueRequests(prev => [newQ, ...prev]);
    setShowNewQueueModal(false);
    setNewQueueForm({ caseNo: '', applicant: '', service: 'Direct Case Services', court: 'MMW Oromiyaa', room: 'Hariiroo Hawaasaa 1', priority: 'Normal' });
    showToast(isOm ? 'Tartiibni (Queue) haaraan dabalameera!' : 'New Queue request added!');
    addAuditLog('QUEUE_CREATE', 'qms_operator', `Added Queue: ${newQ.id} for case ${newQ.caseNo}`);
  };

  const handleUpdateQueueStatus = (qId: string, nextStatus: string) => {
    setQueueRequests(prev => prev.map(q => q.id === qId ? { ...q, status: nextStatus } : q));
    showToast(isOm ? `Status tartiiba ${qId} -> ${nextStatus}` : `Queue ${qId} updated to ${nextStatus}`);
    addAuditLog('QUEUE_STATUS_CHANGE', 'qms_operator', `Updated Queue ${qId} status to ${nextStatus}`);
  };

  const handleAddScreenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScreenForm.name || !newScreenForm.location) return;
    const newScr = {
      id: `scr-${Date.now()}`,
      name: newScreenForm.name,
      location: newScreenForm.location,
      type: newScreenForm.type,
      status: 'Active',
    };
    setTvScreens(prev => [...prev, newScr]);
    setShowAddScreenModal(false);
    setNewScreenForm({ name: '', location: '', type: 'Queue Display' });
    showToast(isOm ? 'Agarsiiftuun TV haaraan dabalameera!' : 'TV Screen registered!');
  };

  const handleAddAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncementForm.title || !newAnnouncementForm.content) return;
    const newAnc = {
      id: `anc-${Date.now()}`,
      title: newAnnouncementForm.title,
      content: newAnnouncementForm.content,
      priority: newAnnouncementForm.priority,
      status: 'Active',
    };
    setAnnouncements(prev => [newAnc, ...prev]);
    setShowAddAnnouncementModal(false);
    setNewAnnouncementForm({ title: '', content: '', priority: 'Medium' });
    showToast(isOm ? 'Beeksisni TV irratti maxxanfameera!' : 'Announcement published to screens!');
  };

  const modules = [
    {
      id: 'user_mgmt',
      title: isOm ? '1. Bulchiinsa Hojjattootaa & Permishinii' : isAm ? '1. የተጠቃሚ እና ፈቃድ አስተዳደር' : '1. User & Permission Management',
      subTitle: 'Administration & Setting Module',
      description: isOm 
        ? 'Aangoo hojjattootaa, permishinii, trasferii mana murtii, fi ramaddii dhaddachaa to\'adhaa.' 
        : 'Manage internal/external staff, granular subject/action permissions, court transfer, and bench assignments.',
      icon: Users,
      accentBorder: 'hover:border-blue-500/60',
      iconBg: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      badge: 'Admin & Setting',
    },
    {
      id: 'queue_mgmt',
      title: isOm ? '2. Hoggansa Tartiiba & TV Displays' : isAm ? '2. የታላቅ እና ቲቪ ማሳያ አስተዳደር' : '2. Queue & TV Display Management',
      subTitle: 'Queue Management System (QMS)',
      description: isOm 
        ? 'Iyyannoo galmee (Direct, Appeal, Cassation, Defense), beellama TV display, fi beeksisa agarsiisaa.' 
        : 'Queue requests (Direct, Appeal, Cassation, Defense), screen displays, live calling, and announcements.',
      icon: Tv,
      accentBorder: 'hover:border-amber-500/60',
      iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      badge: 'Queue & Display',
    },
    {
      id: 'template_engine',
      title: isOm ? '3. Template Builder & Sanadoota' : isAm ? '3. የቴምፕሌት እና የሰነድ መገንቢያ' : '3. Template Engine & Document Builder',
      subTitle: 'Template Engine System (TMS)',
      description: isOm 
        ? 'Unkaalee murtii, iyyata, waamicha fi sanadoota seeraa qopheessuun PDF maxxansuu.' 
        : 'Standardized document templates, array repeat placeholders, field definition, and PDF preview generator.',
      icon: FileText,
      accentBorder: 'hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      badge: 'Template Engine',
    },
    {
      id: 'log_module',
      title: isOm ? '4. Hordoffii Audit & Error Logs' : isAm ? '4. ኦዲት እና ስህተት መዝገብ' : '4. Log & Audit Trail Module',
      subTitle: 'Log Module',
      description: isOm 
        ? 'Galmee jijjiirama dataa, galmee transaction hordoffii, fi error logs sirnaa.' 
        : 'System activity logs, data modification audit trails, user transaction records, and system diagnostics.',
      icon: Clock,
      accentBorder: 'hover:border-purple-500/60',
      iconBg: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      badge: 'Audit & Logs',
    },
    {
      id: 'security',
      title: isOm ? '5. Nageenya & Encryption (RBAC)' : isAm ? '5. ደህንነት እና ምስጠራ' : '5. System Security & Encryption',
      subTitle: 'System & Data Security',
      description: isOm 
        ? 'Iccitii eeggumsa dataa (DLP), encryption, MFA/OTP verification, fi vulnability scanning.' 
        : 'Role-based access controls (RBAC), data loss prevention, cryptographic encryption, and MFA/OTP verification.',
      icon: ShieldCheck,
      accentBorder: 'hover:border-rose-500/60',
      iconBg: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      badge: 'Data Security',
    },
    {
      id: 'financial',
      title: isOm ? '6. Financial & Kaffaltii Court Fee' : isAm ? '6. የክፍያ እና በጀት አስተዳደር' : '6. Financial & Fee Tracking',
      subTitle: 'Financial & Fee Module',
      description: isOm 
        ? 'Shallaggii kaffaltii seeraa, invoice uumuu, kaffaltii online/offline recording, fi gabaasa.' 
        : 'Automated court fee calculation, online/offline invoice processing, receipt verification, and financial reporting.',
      icon: DollarSign,
      accentBorder: 'hover:border-sky-500/60',
      iconBg: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      badge: 'Financials',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-[999] bg-slate-900 border border-amber-500/80 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce text-xs font-bold text-amber-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Offline Sync & Institution Scoping Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center gap-1.5 ${
            isOffline ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          }`}>
            {isOffline ? <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isOffline ? '💾 Local-First Mode (Offline IndexedDB)' : '⚡ Online Auto-Sync Active'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">Court Scope:</span>
            <select
              value={selectedInstitutionId}
              onChange={(e) => setSelectedInstitutionId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-amber-300 font-bold px-3 py-1.5 rounded-xl outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="inst_oromia_supreme">Mana Murtii Waliigalaa Oromiyaa (inst_oromia_supreme)</option>
              <option value="inst_shaggar_high">Mana Murtii Olaanaa Shaggar (inst_shaggar_high)</option>
              <option value="inst_adama_district">Mana Murtii Aanaa Adaamaa (inst_adama_district)</option>
              <option value="inst_gurbicha_district">Mana Murtii Aanaa Gurbicha (inst_gurbicha_district)</option>
              <option value="ALL">🌐 All Authorized Institutions</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : '🔄 Sync Offline Updates'}</span>
        </button>
      </div>

      {/* Top Banner Header */}
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600 animate-pulse" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>{isOm ? 'Fooldara Hojii Mana Murtii • Court Operations Hub' : 'Court Operations & Management Folder'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif-legal text-white">
              {isOm ? 'Moduloota Bulchiinsa Mana Murtii' : isAm ? 'የፍርድ ቤት አስተዳደር ሞጁሎች' : 'Court Management System Modules'}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isOm 
                ? 'Bulchiinsa Hojjattootaa, Queue Management (QMS), Template Engine (TMS), Audit Logs, Security & Financial Fee Tracking fooldara Mana Murtii keessatti qindaa\'anii dhiyaataniiru.' 
                : 'Complete suite of User Administration, Queue & Display Management, Template Builder, Audit Logs, Data Security, and Fee Tracking.'}
            </p>
          </div>

          {/* Module Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveModuleTab('overview')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModuleTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
            >
              📊 Modules Overview
            </button>
            <button
              onClick={() => setActiveModuleTab('user_mgmt')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModuleTab === 'user_mgmt'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
            >
              👥 User Mgmt
            </button>
            <button
              onClick={() => setActiveModuleTab('queue_mgmt')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModuleTab === 'queue_mgmt'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
            >
              📺 Queue & TV
            </button>
            <button
              onClick={() => setActiveModuleTab('template_engine')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModuleTab === 'template_engine'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
            >
              📝 Templates (TMS)
            </button>
          </div>
        </div>
      </div>

      {/* MODULE OVERVIEW TAB */}
      {activeModuleTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-200">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setActiveModuleTab(m.id as any)}
                className={`group bg-slate-900/90 border border-slate-800/80 hover:bg-slate-850 p-6 rounded-3xl transition-all duration-200 text-left cursor-pointer shadow-lg hover:shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[220px] ${m.accentBorder}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner ${m.iconBg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-amber-300 transition-colors font-serif-legal">
                    {m.title}
                  </h3>
                  <p className="text-xs font-medium text-amber-400/90 mb-2 font-mono">
                    {m.subTitle}
                  </p>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {m.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-amber-300 transition-colors">
                  <span>{isOm ? 'Kutaa kana bani' : 'Open Module'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-amber-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* MODULE 1: USER MANAGEMENT & ADMIN PANEL */}
      {activeModuleTab === 'user_mgmt' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Dashboard Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1 shadow">
              <span className="text-[11px] text-slate-400 font-mono">Total Users:</span>
              <div className="text-xl font-bold text-amber-400 font-mono">{1482 + staffUsers.length - 4}</div>
              <span className="text-[10px] text-slate-500">Internal & External</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1 shadow">
              <span className="text-[11px] text-slate-400 font-mono">Total External Users:</span>
              <div className="text-xl font-bold text-sky-400 font-mono">1,120</div>
              <span className="text-[10px] text-slate-500">Registered Public</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1 shadow">
              <span className="text-[11px] text-slate-400 font-mono">Total Staffs:</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">{staffUsers.length}</div>
              <span className="text-[10px] text-slate-500">Court Personnel</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1 shadow">
              <span className="text-[11px] text-slate-400 font-mono">System Roles:</span>
              <div className="text-xl font-bold text-purple-400 font-mono">{systemRoles.length}</div>
              <span className="text-[10px] text-slate-500">Defined Roles</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1 shadow">
              <span className="text-[11px] text-slate-400 font-mono">Available Permissions:</span>
              <div className="text-xl font-bold text-rose-400 font-mono">48</div>
              <span className="text-[10px] text-slate-500">Action Rules</span>
            </div>
          </div>

          {/* User Management Toolbar */}
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search staff, role, email..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowAddRoleModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-purple-400" />
                <span>+ Add Role with Permission</span>
              </button>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Register Internal Staff</span>
              </button>
            </div>
          </div>

          {/* Staff Users Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Hojjetaa / Name</th>
                    <th className="p-3.5">Mana Murtii / Court</th>
                    <th className="p-3.5">Gahee / Role</th>
                    <th className="p-3.5">Bench Type</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Availability</th>
                    <th className="p-3.5 text-right">Tarkaanfii / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {staffUsers
                    .filter(u => 
                      (selectedInstitutionId === 'ALL' || !u.institutionId || u.institutionId === selectedInstitutionId || getInstitutionIdFromCourtName(u.court) === selectedInstitutionId) &&
                      (!userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.role.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                    )
                    .map((user) => (
                    <tr key={user.id} className="hover:bg-slate-850 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{user.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{user.email} • {user.phone}</div>
                      </td>
                      <td className="p-3.5 font-medium">{user.court}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold font-mono">
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">{user.benchType}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleUserStatus(user.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            user.status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {user.status === 'Active' ? '✓ Active' : '✕ Inactive'}
                        </button>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleAvailability(user.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            user.availability === 'Active'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {user.availability === 'Active' ? 'Available' : 'Unavailable'}
                        </button>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setShowUserDetailsModal(user)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowChangeCourtModal(user)}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 cursor-pointer"
                            title="Transfer / Change Court"
                          >
                            <Building className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowAssignBenchModal(user)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                            title="Assign Bench"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowAssignBenchTypeModal(user)}
                            className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 cursor-pointer"
                            title="Assign Bench Type"
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: QUEUE MANAGEMENT & TV DISPLAYS */}
      {activeModuleTab === 'queue_mgmt' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Queue Overview Stat Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Total Queues</div>
              <div className="text-lg font-bold text-amber-400 font-mono">{queueRequests.length}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Pending</div>
              <div className="text-lg font-bold text-sky-400 font-mono">
                {queueRequests.filter(q => q.status === 'Waiting').length}
              </div>
            </div>
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Calling</div>
              <div className="text-lg font-bold text-emerald-400 font-mono animate-pulse">
                {queueRequests.filter(q => q.status === 'Calling').length}
              </div>
            </div>
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">In Progress</div>
              <div className="text-lg font-bold text-purple-400 font-mono">
                {queueRequests.filter(q => q.status === 'In Progress').length}
              </div>
            </div>
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Completed</div>
              <div className="text-lg font-bold text-blue-400 font-mono">
                {queueRequests.filter(q => q.status === 'Completed').length}
              </div>
            </div>
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">TV Screens</div>
              <div className="text-lg font-bold text-amber-300 font-mono">{tvScreens.length}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Announcements</div>
              <div className="text-lg font-bold text-rose-400 font-mono">{announcements.length}</div>
            </div>
          </div>

          {/* Queue Actions Bar */}
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Tv className="w-4 h-4 text-amber-400" />
              <span>Hoggansa Tartiiba & Seensa Dhaddachaa (Queue Requests)</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAddAnnouncementModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Add Announcement</span>
              </button>
              <button
                onClick={() => setShowAddScreenModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5 text-sky-400" />
                <span>+ Add Display Screen</span>
              </button>
              <button
                onClick={() => setShowNewQueueModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Queue Request</span>
              </button>
            </div>
          </div>

          {/* Queue List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 font-mono">Live Calling Queue Status</span>
              <span className="text-[11px] text-slate-400">Automatic TV Refresh • Audio Callout Enabled</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Lakk. Galmee / Case No</th>
                    <th className="p-3.5">Iyyataa / Applicant</th>
                    <th className="p-3.5">Tajaajila / Service</th>
                    <th className="p-3.5">Dhaddacha / Room</th>
                    <th className="p-3.5">Dursa / Priority</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {queueRequests.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-850 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-amber-300">{q.id}</td>
                      <td className="p-3.5 font-mono text-white">{q.caseNo}</td>
                      <td className="p-3.5 font-bold">{q.applicant}</td>
                      <td className="p-3.5">{q.service}</td>
                      <td className="p-3.5 font-mono">{q.room}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {q.priority}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono ${
                          q.status === 'Waiting' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          q.status === 'Calling' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' :
                          q.status === 'In Progress' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {q.status === 'Waiting' && (
                            <button
                              onClick={() => handleUpdateQueueStatus(q.id, 'Calling')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer"
                            >
                              📢 Call Now
                            </button>
                          )}
                          {q.status === 'Calling' && (
                            <button
                              onClick={() => handleUpdateQueueStatus(q.id, 'In Progress')}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] cursor-pointer"
                            >
                              ⚖️ Start Session
                            </button>
                          )}
                          {q.status === 'In Progress' && (
                            <button
                              onClick={() => handleUpdateQueueStatus(q.id, 'Completed')}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] cursor-pointer"
                            >
                              ✓ Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 3: TEMPLATE ENGINE SYSTEM (TMS) */}
      {activeModuleTab === 'template_engine' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div>
              <h3 className="font-bold text-white text-base font-serif-legal">
                Template Engine System (TMS) & Document Builder
              </h3>
              <p className="text-xs text-slate-400">
                Unkaalee sanada seeraa dhuunfaa fi mootummaa qopheessuu, placeholders fi repeat blocks fayyadamuun PDF uumuu fi galchuu.
              </p>
            </div>

            <button
              onClick={() => setShowTemplateBuilderModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Template</span>
            </button>
          </div>

          {/* Templates Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Category Filter:</span>
                {['All', 'Order', 'Judgment', 'Notice', 'Summons', 'Petition', 'Contract'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedTemplateCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedTemplateCategory === cat ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Template Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Domain</th>
                    <th className="p-3.5">Last Modified</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {templates
                    .filter(t => 
                      (selectedInstitutionId === 'ALL' || !t.institutionId || t.institutionId === selectedInstitutionId) &&
                      (selectedTemplateCategory === 'All' || t.category === selectedTemplateCategory) && 
                      (!templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()))
                    )
                    .map((tmpl) => (
                    <tr key={tmpl.id} className="hover:bg-slate-850 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{tmpl.name}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold font-mono">
                          {tmpl.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">{tmpl.domain}</td>
                      <td className="p-3.5 font-mono text-slate-400">{tmpl.lastModified}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowGeneratePreviewModal(tmpl);
                              if (tmpl.content) {
                                setPreviewCustomFields(prev => ({ ...prev }));
                              }
                            }}
                            className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
                          >
                            Generate / Preview PDF
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 cursor-pointer"
                            title="Delete Template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: LOG & AUDIT MODULE */}
      {activeModuleTab === 'log_module' && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>Galmee Hordoffii Audit & System Logs (Zero-Tamper)</span>
            </h3>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40">
              ✓ Log Integrity Verified
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300 max-h-[400px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <span className="text-amber-400 font-bold mr-2">[{log.action}]</span>
                  <span>{log.details}</span>
                </div>
                <div className="text-[10px] text-slate-500 shrink-0">{log.time} • {log.user}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 5: SYSTEM & DATA SECURITY */}
      {activeModuleTab === 'security' && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl animate-in fade-in duration-200">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            <span>Nageenya & Data Loss Prevention (DLP / RBAC)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-amber-400 font-mono">Data Encryption</span>
              <p className="text-xs text-slate-300">AES-256 At Rest • TLS 1.3 In Transit</p>
              <span className="text-[10px] text-emerald-400 font-bold">✓ Active</span>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-amber-400 font-mono">Role-Based Access Control</span>
              <p className="text-xs text-slate-300">RBAC Fine-Grained Permissions Active ({systemRoles.length} Roles)</p>
              <span className="text-[10px] text-emerald-400 font-bold">✓ Active</span>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-amber-400 font-mono">Multi-Factor Authentication</span>
              <p className="text-xs text-slate-300">SMS / Email OTP & WebAuthn Biometrics</p>
              <span className="text-[10px] text-emerald-400 font-bold">✓ Active</span>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 6: FINANCIAL & FEE TRACKING */}
      {activeModuleTab === 'financial' && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl animate-in fade-in duration-200">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>Financial & Fee Tracking Module</span>
          </h3>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">Court Fee Engine:</span>
              <span className="text-emerald-400 font-mono font-bold">ETB 150.00 (Calculated)</span>
            </div>
            <p className="text-xs text-slate-400">
              Calculates litigation fee based on claim amount, court tier, and service type. Generates invoice with payment receipt token.
            </p>
            <button 
              onClick={() => showToast(isOm ? 'Invoice kaffaltii qophaa\'eera!' : 'Payment Invoice Generated!')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              Generate Invoice & Payment Receipt
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTER INTERNAL STAFF (showAddUserModal) */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                <span>{isOm ? 'Hojjetaa Mana Murtii Galmeessi' : 'Register Authorized Internal Staff'}</span>
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Maqaa Guutuu / Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="Fakkeenya: Abbaa Seeraa Tolasaa"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="name@court.oromia.et"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Phone</label>
                  <input
                    type="text"
                    value={newUserForm.phone}
                    onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    placeholder="+251911223344"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Gahee / System Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="Judge">Judge / Abbaa Seeraa</option>
                    <option value="Registrar">Registrar / Ofiisara Seeraa</option>
                    <option value="Prosecutor">Prosecutor / Abbaa Alangaa</option>
                    <option value="Staff">Staff / Galmeessaa</option>
                    <option value="Legal Expert">Legal Expert / Ogeessa Seeraa</option>
                    <option value="Court Admin">Court Admin / Bulchaa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Bench Type</label>
                  <select
                    value={newUserForm.benchType}
                    onChange={e => setNewUserForm({ ...newUserForm, benchType: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="Hariiroo Hawaasaa">Hariiroo Hawaasaa (Civil)</option>
                    <option value="Yakka">Yakka (Criminal)</option>
                    <option value="Maatii">Maatii (Family)</option>
                    <option value="Daldala">Daldala (Commercial)</option>
                    <option value="Hojii & Hojjetaa">Hojii & Hojjetaa (Labour)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mana Murtii / Court Institution</label>
                <select
                  value={newUserForm.court}
                  onChange={e => setNewUserForm({ ...newUserForm, court: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                >
                  <option value="Mana Murtii Waliigalaa Oromiyaa">Mana Murtii Waliigalaa Oromiyaa</option>
                  <option value="Mana Murtii Olaanaa Shaggar">Mana Murtii Olaanaa Shaggar</option>
                  <option value="Mana Murtii Aanaa Adaamaa">Mana Murtii Aanaa Adaamaa</option>
                  <option value="Mana Murtii Aanaa Gurbicha">Mana Murtii Aanaa Gurbicha</option>
                  <option value="Mana Murtii Aanaa Jimmaa">Mana Murtii Aanaa Jimmaa</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow"
                >
                  {isOm ? 'Hojjetaa Galmeessi' : 'Save Staff User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD ROLE WITH PERMISSIONS (showAddRoleModal) */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-400" />
                <span>Create System Role & Permissions</span>
              </h3>
              <button onClick={() => setShowAddRoleModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  value={newRoleForm.roleTitle}
                  onChange={e => setNewRoleForm({ ...newRoleForm, roleTitle: e.target.value })}
                  placeholder="e.g. Chief Appellate Registrar"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Role Code *</label>
                <input
                  type="text"
                  required
                  value={newRoleForm.roleCode}
                  onChange={e => setNewRoleForm({ ...newRoleForm, roleCode: e.target.value })}
                  placeholder="e.g. REGISTRAR_CHIEF"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-2">Assign Action Permissions:</label>
                <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  {[
                    { id: 'case_read', label: 'View Court Cases & Dossiers' },
                    { id: 'case_write', label: 'Create & Edit Case Filings' },
                    { id: 'order_sign', label: 'Sign Judicial Orders & Judgments' },
                    { id: 'user_manage', label: 'Manage Personnel & System Access' },
                    { id: 'template_build', label: 'Build Document Templates (TMS)' },
                    { id: 'queue_control', label: 'Control Queue Display (QMS)' },
                    { id: 'financial_fee', label: 'Process Court Fees & Invoices' },
                    { id: 'audit_view', label: 'Inspect Audit Logs & Security' },
                  ].map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRoleForm.permissions.includes(p.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewRoleForm({ ...newRoleForm, permissions: [...newRoleForm.permissions, p.id] });
                          } else {
                            setNewRoleForm({ ...newRoleForm, permissions: newRoleForm.permissions.filter(x => x !== p.id) });
                          }
                        }}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow"
                >
                  Save System Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN BENCHES (showAssignBenchModal) */}
      {showAssignBenchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Assign Bench Rooms to {showAssignBenchModal.name}</span>
            </h3>

            <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300">
              {['Dhaddacha 1ffaa', 'Dhaddacha 2ffaa', 'Dhaddacha 3ffaa', 'Dhaddacha Ijibbaataa'].map(b => (
                <label key={b} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-900 rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedBenches.includes(b)}
                    onChange={e => {
                      if (e.target.checked) setSelectedBenches([...selectedBenches, b]);
                      else setSelectedBenches(selectedBenches.filter(x => x !== b));
                    }}
                    className="rounded border-slate-700 text-amber-500"
                  />
                  <span>{b}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-2 text-xs">
              <button
                onClick={() => setShowAssignBenchModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setStaffUsers(prev => prev.map(u => u.id === showAssignBenchModal.id ? { ...u, bench: selectedBenches.join(', ') || 'Dhaddacha 1ffaa' } : u));
                  setShowAssignBenchModal(null);
                  showToast(isOm ? 'Dhaddachi ramadameera!' : 'Bench assignment updated!');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow"
              >
                Save Bench Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: USER DETAILS (showUserDetailsModal) */}
      {showUserDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold font-mono">
                  {showUserDetailsModal.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{showUserDetailsModal.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{showUserDetailsModal.email}</span>
                </div>
              </div>
              <button onClick={() => setShowUserDetailsModal(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div><strong className="text-amber-400">Role:</strong> {showUserDetailsModal.role}</div>
              <div><strong className="text-amber-400">Court:</strong> {showUserDetailsModal.court}</div>
              <div><strong className="text-amber-400">Bench:</strong> {showUserDetailsModal.bench}</div>
              <div><strong className="text-amber-400">Bench Type:</strong> {showUserDetailsModal.benchType}</div>
              <div><strong className="text-amber-400">Status:</strong> {showUserDetailsModal.status}</div>
              <div><strong className="text-amber-400">Phone:</strong> {showUserDetailsModal.phone}</div>
            </div>

            <div className="flex justify-end pt-2 text-xs">
              <button
                onClick={() => setShowUserDetailsModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: TEMPLATE BUILDER & CREATOR (showTemplateBuilderModal) */}
      {showTemplateBuilderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-amber-400 text-lg flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-emerald-400" />
                <span>{isOm ? 'Template Sanada Seeraa Qopheessi (TMS)' : 'Template Builder & Document Engine'}</span>
              </h3>
              <button onClick={() => setShowTemplateBuilderModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTemplateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Maqaa Template / Title *</label>
                <input
                  type="text"
                  required
                  value={newTemplateForm.name}
                  onChange={e => setNewTemplateForm({ ...newTemplateForm, name: e.target.value })}
                  placeholder="e.g. Unkaa Ajaja Uggura Qabeenyaa"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category</label>
                  <select
                    value={newTemplateForm.category}
                    onChange={e => setNewTemplateForm({ ...newTemplateForm, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="Order">Order / Ajaja</option>
                    <option value="Judgment">Judgment / Murtii</option>
                    <option value="Notice">Notice / Waamicha</option>
                    <option value="Summons">Summons / Sumpanaa</option>
                    <option value="Petition">Petition / Iyyata</option>
                    <option value="Contract">Contract / Waliigaltee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Legal Domain</label>
                  <select
                    value={newTemplateForm.domain}
                    onChange={e => setNewTemplateForm({ ...newTemplateForm, domain: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="Civil">Civil / Hariiroo Hawaasaa</option>
                    <option value="Criminal">Criminal / Yakka</option>
                    <option value="Family">Family / Maatii</option>
                    <option value="Commercial">Commercial / Daldala</option>
                    <option value="Labour">Labour / Hojii & Hojjetaa</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Placeholders Helper Buttons */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Insert Placeholders Into Document Body:</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    '{{COURT_NAME}}',
                    '{{CASE_NO}}',
                    '{{DATE}}',
                    '{{JUDGE_NAME}}',
                    '{{PLAINTIFF}}',
                    '{{DEFENDANT}}',
                    '{{ORDER_DETAILS}}',
                    '{{CLAIM_AMOUNT}}'
                  ].map(ph => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setNewTemplateForm(prev => ({ ...prev, content: prev.content + ' ' + ph }))}
                      className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-mono text-[10px] cursor-pointer"
                    >
                      + {ph}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Template Content / Text Body *</label>
                <textarea
                  rows={8}
                  required
                  value={newTemplateForm.content}
                  onChange={e => setNewTemplateForm({ ...newTemplateForm, content: e.target.value })}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500 font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateBuilderModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow"
                >
                  {isOm ? 'Template Ol-Ka\'i' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: NEW QUEUE TICKET REQUEST (showNewQueueModal) */}
      {showNewQueueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
                <Tv className="w-5 h-5 text-amber-400" />
                <span>{isOm ? 'Tartiiba (Queue) Galmee Haaraa' : 'Create New Queue Request'}</span>
              </h3>
              <button onClick={() => setShowNewQueueModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQueueSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Lakk. Galmee / Case No *</label>
                <input
                  type="text"
                  required
                  value={newQueueForm.caseNo}
                  onChange={e => setNewQueueForm({ ...newQueueForm, caseNo: e.target.value })}
                  placeholder="06-2026-077299"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Iyyataa / Applicant Name *</label>
                <input
                  type="text"
                  required
                  value={newQueueForm.applicant}
                  onChange={e => setNewQueueForm({ ...newQueueForm, applicant: e.target.value })}
                  placeholder="Fakkeenya: Tolasaa Dinqaa"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Service Type</label>
                  <select
                    value={newQueueForm.service}
                    onChange={e => setNewQueueForm({ ...newQueueForm, service: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="Direct Case Services">Direct Case</option>
                    <option value="Appeal">Appeal</option>
                    <option value="Cassation">Cassation</option>
                    <option value="Defense">Defense</option>
                    <option value="Reopen">Reopen Case</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Room / Bench</label>
                  <select
                    value={newQueueForm.room}
                    onChange={e => setNewQueueForm({ ...newQueueForm, room: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="Hariiroo Hawaasaa 1">Hariiroo Hawaasaa 1</option>
                    <option value="Dhaddacha Yakkaa 2">Dhaddacha Yakkaa 2</option>
                    <option value="Dhaddacha Ijibbaataa">Dhaddacha Ijibbaataa</option>
                    <option value="Dhaddacha Maatii">Dhaddacha Maatii</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Priority Level</label>
                <select
                  value={newQueueForm.priority}
                  onChange={e => setNewQueueForm({ ...newQueueForm, priority: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                >
                  <option value="Normal">Normal</option>
                  <option value="High (Elderly)">High (Elderly Person)</option>
                  <option value="High (Disabled)">High (Disabled Person)</option>
                  <option value="High (Urgent)">High (Urgent Order)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewQueueModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow"
                >
                  Create Queue Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: ADD DISPLAY SCREEN (showAddScreenModal) */}
      {showAddScreenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
                <Tv className="w-5 h-5 text-sky-400" />
                <span>Register TV Display Screen</span>
              </h3>
              <button onClick={() => setShowAddScreenModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddScreenSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Screen Name *</label>
                <input
                  type="text"
                  required
                  value={newScreenForm.name}
                  onChange={e => setNewScreenForm({ ...newScreenForm, name: e.target.value })}
                  placeholder="e.g. Main Gate Calling Screen"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Location / Hall *</label>
                <input
                  type="text"
                  required
                  value={newScreenForm.location}
                  onChange={e => setNewScreenForm({ ...newScreenForm, location: e.target.value })}
                  placeholder="e.g. Floor 2 Waiting Lobby"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Display Mode</label>
                <select
                  value={newScreenForm.type}
                  onChange={e => setNewScreenForm({ ...newScreenForm, type: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                >
                  <option value="Queue Display">Live Queue Display</option>
                  <option value="Announcement Display">Announcement & News Display</option>
                  <option value="Bench Schedule">Bench Schedule Display</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddScreenModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow"
                >
                  Register Screen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: BROADCAST ANNOUNCEMENT (showAddAnnouncementModal) */}
      {showAddAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <span>Broadcast Court Announcement</span>
              </h3>
              <button onClick={() => setShowAddAnnouncementModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAnnouncementSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newAnnouncementForm.title}
                  onChange={e => setNewAnnouncementForm({ ...newAnnouncementForm, title: e.target.value })}
                  placeholder="e.g. Walgahii Dhaddachaa"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Announcement Body *</label>
                <textarea
                  rows={4}
                  required
                  value={newAnnouncementForm.content}
                  onChange={e => setNewAnnouncementForm({ ...newAnnouncementForm, content: e.target.value })}
                  placeholder="Barreeffama beeksisaa galchaa..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAnnouncementModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: CHANGE COURT TRANSFER (showChangeCourtModal) */}
      {showChangeCourtModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-amber-400">Change / Transfer Court Location</h3>
            <p className="text-xs text-slate-300">
              Transfer <strong>{showChangeCourtModal.name}</strong> to a different court institution.
            </p>

            <select
              value={selectedCourtForTransfer}
              onChange={(e) => setSelectedCourtForTransfer(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-500 outline-none"
            >
              <option value="Mana Murtii Waliigalaa Oromiyaa">Mana Murtii Waliigalaa Oromiyaa</option>
              <option value="Mana Murtii Olaanaa Shaggar">Mana Murtii Olaanaa Shaggar</option>
              <option value="Mana Murtii Aanaa Adaamaa">Mana Murtii Aanaa Adaamaa</option>
              <option value="Mana Murtii Aanaa Gurbicha">Mana Murtii Aanaa Gurbicha</option>
              <option value="Mana Murtii Aanaa Jimmaa">Mana Murtii Aanaa Jimmaa</option>
            </select>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowChangeCourtModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setStaffUsers(prev => prev.map(u => u.id === showChangeCourtModal.id ? { ...u, court: selectedCourtForTransfer } : u));
                  setShowChangeCourtModal(null);
                  showToast(isOm ? 'Mana Murtii hojjetaa jijjiirameera!' : 'Court transferred!');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Update Court
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: ASSIGN BENCH TYPE (showAssignBenchTypeModal) */}
      {showAssignBenchTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-amber-400">Assign Single Bench Type</h3>
            <p className="text-xs text-slate-300">
              Select Bench Type for <strong>{showAssignBenchTypeModal.name}</strong>:
            </p>

            <select
              value={selectedBenchType}
              onChange={(e) => setSelectedBenchType(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-500 outline-none"
            >
              <option value="Hariiroo Hawaasaa">Hariiroo Hawaasaa (Civil Bench)</option>
              <option value="Yakka">Yakka (Criminal Bench)</option>
              <option value="Maatii">Maatii (Family Bench)</option>
              <option value="Daldala">Daldala (Commercial Bench)</option>
              <option value="Hojii & Hojjetaa">Hojii & Hojjetaa (Labour Bench)</option>
              <option value="Bulchiinsa">Bulchiinsa (Administrative Bench)</option>
              <option value="Ijibbaata">Dhaddacha Ijibbaataa (Cassation Bench)</option>
            </select>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowAssignBenchTypeModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setStaffUsers(prev => prev.map(u => u.id === showAssignBenchTypeModal.id ? { ...u, benchType: selectedBenchType } : u));
                  setShowAssignBenchTypeModal(null);
                  showToast(isOm ? 'Bench Type jijjiirameera!' : 'Bench type assigned!');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Assign Bench Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 11: DOCUMENT PREVIEW & PRINT (showGeneratePreviewModal) */}
      {showGeneratePreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-3xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-amber-400 text-lg">
                Official Court Document Preview: {showGeneratePreviewModal.name}
              </h3>
              <button onClick={() => setShowGeneratePreviewModal(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customizer Parameters Panel */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-amber-300 font-mono">Fill Dynamic Document Fields:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block">Lakk. Galmee / Case No</label>
                  <input
                    type="text"
                    value={previewCustomFields.caseNo}
                    onChange={e => setPreviewCustomFields({ ...previewCustomFields, caseNo: e.target.value })}
                    className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block">Oliyyataa / Plaintiff</label>
                  <input
                    type="text"
                    value={previewCustomFields.plaintiff}
                    onChange={e => setPreviewCustomFields({ ...previewCustomFields, plaintiff: e.target.value })}
                    className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-amber-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block">Deebii Kennaa / Defendant</label>
                  <input
                    type="text"
                    value={previewCustomFields.defendant}
                    onChange={e => setPreviewCustomFields({ ...previewCustomFields, defendant: e.target.value })}
                    className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Rendered Official Document Preview Sheet */}
            <div className="bg-white text-slate-950 p-8 rounded-2xl space-y-4 font-serif text-xs leading-relaxed border shadow-2xl">
              <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
                <div className="text-base font-bold tracking-wide">MANA MURTII WALIIGALAA OROMIYAA</div>
                <div className="text-xs font-semibold text-slate-800">የኦሮሚያ ጠቅላይ ፍርድ ቤት • Supreme Court of Oromia</div>
                <div className="text-[10px] text-amber-800 font-bold font-mono uppercase tracking-widest pt-1">OFFICIAL JUDICIAL DOCUMENT SEAL</div>
              </div>

              <div className="flex justify-between text-xs font-mono font-bold border-b border-slate-200 pb-2">
                <div>Lakk Galmee: {previewCustomFields.caseNo}</div>
                <div>Guyyaa: {previewCustomFields.date}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><strong>Abbaa Seeraa:</strong> {previewCustomFields.judgeName}</div>
                <div><strong>Category:</strong> {showGeneratePreviewModal.category}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200">
                <div><strong>Oliyyataa / Plaintiff:</strong> {previewCustomFields.plaintiff}</div>
                <div><strong>Deebii Kennaa / Defendant:</strong> {previewCustomFields.defendant}</div>
              </div>

              <div className="pt-3 border-t border-slate-300 space-y-2">
                <div className="font-bold text-sm uppercase tracking-wide text-slate-900">
                  {showGeneratePreviewModal.name}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed text-slate-900 font-serif">
                  {showGeneratePreviewModal.content
                    ? showGeneratePreviewModal.content
                        .replace(/\{\{COURT_NAME\}\}/g, previewCustomFields.courtName)
                        .replace(/\{\{CASE_NO\}\}/g, previewCustomFields.caseNo)
                        .replace(/\{\{DATE\}\}/g, previewCustomFields.date)
                        .replace(/\{\{JUDGE_NAME\}\}/g, previewCustomFields.judgeName)
                        .replace(/\{\{PLAINTIFF\}\}/g, previewCustomFields.plaintiff)
                        .replace(/\{\{DEFENDANT\}\}/g, previewCustomFields.defendant)
                        .replace(/\{\{ORDER_DETAILS\}\}/g, previewCustomFields.orderDetails)
                    : previewCustomFields.orderDetails}
                </div>
              </div>

              <div className="pt-8 flex justify-between items-end text-[11px] font-mono">
                <div>
                  <div className="border-t border-slate-400 pt-1 w-36 text-center">Mallattoo Abbaa Seeraa</div>
                </div>
                <div className="text-right">
                  <div className="w-16 h-16 rounded-full border-2 border-amber-700/60 flex items-center justify-center text-[9px] font-bold text-amber-900 rotate-[-12deg] shadow-sm ml-auto">
                    SEAL OF OROMIA
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowGeneratePreviewModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourtModulesView;
