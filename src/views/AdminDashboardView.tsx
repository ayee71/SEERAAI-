import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  UserCheck, 
  UserX, 
  BarChart3, 
  Settings, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCw, 
  Key, 
  Download, 
  Globe, 
  Cpu, 
  Lock, 
  Check, 
  Send, 
  Sparkles, 
  Building, 
  Gavel, 
  Scale, 
  FileText, 
  ChevronRight, 
  TrendingUp, 
  Activity, 
  Award, 
  Zap, 
  Radio, 
  Eye, 
  LogOut, 
  Clock, 
  History, 
  Copy, 
  Trash2, 
  Tag, 
  FileSpreadsheet,
  Workflow,
  Volume2,
  Share2
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { InstitutionManagementView } from './InstitutionManagementView';
import { isOwnerAccount, isOwnerEmail } from '../services/ownerAuth';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { 
  getLocalInstitutions, 
  getLocalCourtUsers, 
  saveLocalInstitutions, 
  approveCourtInstitution, 
  CourtInstitution, 
  CourtAccessRequest 
} from '../services/courtInstitutionService';
import { 
  getLocalAdminActivityLogs, 
  saveLocalAdminActivityLogs, 
  logAdminAction, 
  fetchRemoteAdminActivityLogs, 
  subscribeAdminActivityLogs,
  archiveAdminActivityLogs,
  AdminActivityLogEntry, 
  AdminActionType 
} from '../services/adminActivityLogService';
import { getStoredLexiconSuggestions, LexiconSuggestion } from '../services/ttsLexicon';
import { VectorSearchStats } from '../components/VectorSearchStats';

interface AdminDashboardViewProps {
  currentLang: Language;
  onNavigateTab?: (tab: string) => void;
}

interface ManagedUser {
  id: string;
  email: string;
  visitorName: string;
  legalRole?: string;
  licenseOrInstitution?: string;
  isLegalProfessional?: boolean;
  isPremium?: boolean;
  subscriptionPlan?: string;
  verifiedAt?: string;
  appLanguage?: string;
  accountStatus?: 'pending' | 'approved';
  updatedAt?: any;
}

interface AnalyticsEventItem {
  id: string;
  event: string;
  category?: string;
  details?: string;
  timestamp: string;
  userId?: string;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentLang,
  onNavigateTab
}) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();

  // Verification of Owner status: Ayele Be Dha
  const isOwner = 
    isOwnerAccount(
      user?.email || (profile as any)?.email,
      profile?.visitorName || profile?.appUsername,
      localStorage.getItem('seera_owner_key')
    ) ||
    isOwnerEmail(localStorage.getItem('seera_owner_email'));

  // Manual Owner Unlock Key State (if not signed in with owner Google account)
  const [unlockKeyInput, setUnlockKeyInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'users' | 'activityLogs' | 'courtWorkflows' | 'analytics' | 'config' | 'pronunciation'>('users');
  const [lexiconSuggestions, setLexiconSuggestions] = useState<LexiconSuggestion[]>(getStoredLexiconSuggestions());

  const handleApproveSuggestion = (id: string) => {
    const list = getStoredLexiconSuggestions().map(s => s.id === id ? { ...s, status: 'approved' as const } : s);
    localStorage.setItem('seera_ai_lexicon_suggestions', JSON.stringify(list));
    setLexiconSuggestions(list);
    setUserActionToast('Pronunciation term approved successfully!');
    setTimeout(() => setUserActionToast(null), 3000);
  };

  const handleRejectSuggestion = (id: string) => {
    const list = getStoredLexiconSuggestions().filter(s => s.id !== id);
    localStorage.setItem('seera_ai_lexicon_suggestions', JSON.stringify(list));
    setLexiconSuggestions(list);
    setUserActionToast('Pronunciation suggestion removed.');
    setTimeout(() => setUserActionToast(null), 3000);
  };

  // --- USER VERIFICATION STATE ---
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'verified' | 'pending' | 'judge' | 'advocate'>('all');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userActionToast, setUserActionToast] = useState<string | null>(null);

  // Court Access Requests
  const [courtRequests, setCourtRequests] = useState<CourtAccessRequest[]>([]);
  const [institutions, setInstitutions] = useState<CourtInstitution[]>(getLocalInstitutions());

  // --- ANALYTICS STATE ---
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventItem[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // --- REFERRAL & SHARE STATISTICS STATE ---
  const [adminShareEvents, setAdminShareEvents] = useState<any[]>([]);
  useEffect(() => {
    try {
      const defaultShareEvents = [
        { id: 'sh_1', channel: 'WhatsApp', device: 'Mobile', browser: 'Chrome', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'sh_2', channel: 'Telegram', device: 'Mobile', browser: 'Chrome', timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id: 'sh_3', channel: 'Copy Link', device: 'Desktop', browser: 'Edge', timestamp: new Date(Date.now() - 14400000).toISOString() },
        { id: 'sh_4', channel: 'Native Share', device: 'Mobile', browser: 'Safari', timestamp: new Date(Date.now() - 28800000).toISOString() },
        { id: 'sh_5', channel: 'WhatsApp', device: 'Mobile', browser: 'Chrome', timestamp: new Date(Date.now() - 43200000).toISOString() },
        { id: 'sh_6', channel: 'Telegram', device: 'Desktop', browser: 'Chrome', timestamp: new Date(Date.now() - 86400000).toISOString() },
      ];
      const raw = localStorage.getItem('seera_share_events');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAdminShareEvents(parsed.length > 0 ? parsed : defaultShareEvents);
      } else {
        localStorage.setItem('seera_share_events', JSON.stringify(defaultShareEvents));
        setAdminShareEvents(defaultShareEvents);
      }
    } catch {
      setAdminShareEvents([]);
    }
  }, []);

  // --- SYSTEM ACTIVITY LOG STATE ---
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogEntry[]>(getLocalAdminActivityLogs());
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logActionFilter, setLogActionFilter] = useState<'all' | AdminActionType>('all');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // --- SYSTEM CONFIGURATION STATE ---
  const [defaultAiModel, setDefaultAiModel] = useState<string>('gemini-2.5-pro');
  const [antiCloningEnforced, setAntiCloningEnforced] = useState<boolean>(true);
  const [rightClickProtection, setRightClickProtection] = useState<boolean>(true);
  const [watermarkProtection, setWatermarkProtection] = useState<boolean>(true);
  const [courtGateEnforced, setCourtGateEnforced] = useState<boolean>(true);
  const [systemBroadcastMsg, setSystemBroadcastMsg] = useState<string>(
    localStorage.getItem('seera_system_broadcast') || 'Kuusaa Dhaddacha Ijoo Mana Murtii Waliigalaa Fooyya\'eera (Cassation Volume 25 Indexed)'
  );
  const [isBroadcastActive, setIsBroadcastActive] = useState<boolean>(
    localStorage.getItem('seera_system_broadcast_active') !== 'false'
  );
  const [configSavedToast, setConfigSavedToast] = useState<string | null>(null);

  // Check and unlock owner key manually
  const handleUnlockOwnerKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (['2026', 'ayele2026', 'admin2026'].includes(unlockKeyInput.trim().toLowerCase())) {
      localStorage.setItem('seera_owner_key', '2026');
      localStorage.setItem('seera_owner_email', 'ayeledha@gmail.com');
      setUnlockError(null);
      window.location.reload();
    } else {
      setUnlockError(currentLang === 'om' ? 'Koodiin abbaa qabeenyaa dogoggora.' : 'የባለቤት ማረጋገጫ ቁጥር ትክክል አይደለም።');
    }
  };

  // Load Users from Firestore & cache
  useEffect(() => {
    if (!isOwner || !user) return;

    setLoadingUsers(true);
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(50));
        const snap = await getDocs(q);
        const loaded: ManagedUser[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const isApproved = data.accountStatus === 'approved' || data.isLegalProfessional === true;
          loaded.push({
            id: docSnap.id,
            email: data.email || docSnap.id,
            visitorName: data.visitorName || data.name || 'Legal Practitioner',
            legalRole: data.legalRole || 'advocate',
            licenseOrInstitution: data.licenseOrInstitution || data.organization || 'N/A',
            isLegalProfessional: isApproved,
            isPremium: data.isPremium ?? false,
            subscriptionPlan: data.subscriptionPlan || 'starter',
            verifiedAt: data.verifiedAt || data.updatedAt?.toDate?.()?.toISOString?.(),
            appLanguage: data.appLanguage || 'om',
            accountStatus: data.accountStatus || (isApproved ? 'approved' : 'pending'),
          });
        });

        // Add baseline users if empty or minimal
        if (loaded.length === 0) {
          loaded.push(
            {
              id: 'usr_ayele_super',
              email: 'ayeledha@gmail.com',
              visitorName: 'Ayele Be Dha',
              legalRole: 'advocate',
              licenseOrInstitution: 'FDRE Bar Association / Oromia Supreme Court',
              isLegalProfessional: true,
              isPremium: true,
              subscriptionPlan: 'unlimited',
              verifiedAt: new Date().toISOString(),
              appLanguage: 'om',
            },
            {
              id: 'usr_judge_chala',
              email: 'caalaa.judge@court.oromia.et',
              visitorName: 'Abbaa Seeraa Dr. Caalaa Tasfaayee',
              legalRole: 'judge',
              licenseOrInstitution: 'Mana Murtii Waliigalaa Oromiyaa',
              isLegalProfessional: true,
              isPremium: true,
              subscriptionPlan: 'unlimited',
              verifiedAt: new Date().toISOString(),
              appLanguage: 'om',
            },
            {
              id: 'usr_advocate_tola',
              email: 'tola.advocate@gmail.com',
              visitorName: 'Abukaattoo Tolaa Dassaaleny',
              legalRole: 'advocate',
              licenseOrInstitution: 'Ethiopian Federal Advocates Bar (License #6841)',
              isLegalProfessional: true,
              isPremium: true,
              subscriptionPlan: 'pro',
              verifiedAt: new Date().toISOString(),
              appLanguage: 'om',
            },
            {
              id: 'usr_clerk_hawwi',
              email: 'hawwii.clerk@court.oromia.et',
              visitorName: 'Hawwii Gammachuu (Registrar)',
              legalRole: 'advisor',
              licenseOrInstitution: 'Dhaddacha Ijoo Qorannoo Galmee',
              isLegalProfessional: true,
              isPremium: false,
              subscriptionPlan: 'starter',
              appLanguage: 'om',
            }
          );
        }

        setUsersList(loaded);
      } catch (e) {
        console.warn('Firestore users fetch issue, using baseline roster', e);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();

    // Load Court Requests from localStorage
    try {
      const rawReq = localStorage.getItem('seera_court_access_requests_cache');
      if (rawReq) setCourtRequests(JSON.parse(rawReq));
    } catch {}

    // Load System Config from LocalStorage
    try {
      const savedConfig = localStorage.getItem('seera_system_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.defaultAiModel) setDefaultAiModel(parsed.defaultAiModel);
        if (parsed.antiCloningEnforced !== undefined) setAntiCloningEnforced(parsed.antiCloningEnforced);
        if (parsed.courtGateEnforced !== undefined) setCourtGateEnforced(parsed.courtGateEnforced);
      }
    } catch {}

    // Real-time Firestore Activity Logs Listener
    const unsubscribeLogs = subscribeAdminActivityLogs((logs) => {
      if (logs && logs.length > 0) {
        setActivityLogs(logs);
      }
    });

    const handleLogUpdate = (e: Event) => {
      const custom = e as CustomEvent<AdminActivityLogEntry[]>;
      if (custom.detail) setActivityLogs(custom.detail);
    };
    window.addEventListener('seera_admin_log_updated', handleLogUpdate);
    return () => {
      unsubscribeLogs();
      window.removeEventListener('seera_admin_log_updated', handleLogUpdate);
    };
  }, [isOwner]);

  // Load Realtime Analytics stream
  useEffect(() => {
    if (!isOwner || !user || activeTab !== 'analytics') return;

    setAnalyticsLoading(true);
    const mockEvents: AnalyticsEventItem[] = [
      {
        id: 'ev_1',
        event: 'Legal Cassation Precedent Queried',
        category: 'Dhaddacha Ijoo',
        details: 'Precedent File #24851 (Property & Contract Usufruct affirmed)',
        timestamp: 'Daqiiqaa 2 dura',
        userId: 'caalaa.judge@court.oromia.et',
      },
      {
        id: 'ev_2',
        event: 'Contract Drafting Executed',
        category: 'Waliigaltee Hojjataa',
        details: 'Trilingual Employment Agreement generated (Proclamation 1156/2019)',
        timestamp: 'Daqiiqaa 15 dura',
        userId: 'tola.advocate@gmail.com',
      },
      {
        id: 'ev_3',
        event: 'Voice Dictation Bench Recording',
        category: 'Waraabbii Ragaa',
        details: 'Afaan Oromoo Speech-to-Text transcribed in Courtroom Assistant',
        timestamp: 'Daqiiqaa 28 dura',
        userId: 'caalaa.judge@court.oromia.et',
      },
      {
        id: 'ev_4',
        event: 'Statutory Interpretation Analysis',
        category: 'Labsiilee',
        details: 'FDRE Criminal Code Article 665 (Fraudulent Property Acquisition)',
        timestamp: 'Sa\'aatii 1 dura',
        userId: 'guest_verified_scholar',
      },
      {
        id: 'ev_5',
        event: 'WebAuthn Biometric Passkey Verified',
        category: 'Security Lock',
        details: 'Hardware FaceID/Fingerprint authenticated for confidential bench archive',
        timestamp: 'Sa\'aatii 2 dura',
        userId: 'ayeledha@gmail.com',
      }
    ];

    setAnalyticsEvents(mockEvents);
    setAnalyticsLoading(false);
  }, [isOwner, activeTab]);

  // Toggle Legal Professional Verification & Account Approval Status
  const handleToggleVerification = async (targetUser: ManagedUser) => {
    const newStatus = !targetUser.isLegalProfessional;
    const newAccountStatus: 'approved' | 'pending' = newStatus ? 'approved' : 'pending';
    const updatedUsers = usersList.map((u) =>
      u.id === targetUser.id
        ? {
            ...u,
            isLegalProfessional: newStatus,
            accountStatus: newAccountStatus,
            verifiedAt: newStatus ? new Date().toISOString() : undefined,
          }
        : u
    );
    setUsersList(updatedUsers);

    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        isLegalProfessional: newStatus,
        accountStatus: newAccountStatus,
        verifiedAt: newStatus ? serverTimestamp() : null,
      });
    } catch (e) {
      console.warn('Firestore user update deferred', e);
    }

    // Record in System Activity Log
    await logAdminAction({
      actionType: newStatus ? 'user_verification' : 'user_revocation',
      target: `${targetUser.visitorName} (${targetUser.email})`,
      details: newStatus 
        ? `Mirkaneessa ogummaa seeraa eeyyame: ${targetUser.licenseOrInstitution || 'Bar Member'}`
        : `Mirkaneessa ogummaa seeraa haqe (Revoked status)`,
      metadata: { userId: targetUser.id, role: targetUser.legalRole }
    });

    setUserActionToast(
      newStatus
        ? `Fayyadamaa "${targetUser.visitorName}" milkaa'inaan mirkanaa'eera (Verified)!`
        : `Mirkaneessi "${targetUser.visitorName}" haqameera (Revoked).`
    );
    setTimeout(() => setUserActionToast(null), 3000);
  };

  // Toggle Pro/Unlimited Subscription Plan
  const handleTogglePlan = async (targetUser: ManagedUser) => {
    const newPlan = targetUser.subscriptionPlan === 'unlimited' ? 'starter' : 'unlimited';
    const newPremium = newPlan === 'unlimited';
    const updatedUsers = usersList.map((u) =>
      u.id === targetUser.id
        ? {
            ...u,
            isPremium: newPremium,
            subscriptionPlan: newPlan,
          }
        : u
    );
    setUsersList(updatedUsers);

    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        isPremium: newPremium,
        subscriptionPlan: newPlan,
        role: newPremium ? 'premium' : 'standard',
        subscriptionTier: newPremium ? 'premium' : 'standard',
      });
    } catch (e) {
      console.warn('Firestore plan update deferred', e);
    }

    // Record in System Activity Log
    await logAdminAction({
      actionType: newPlan === 'unlimited' ? 'license_upgrade' : 'license_standard',
      target: `${targetUser.visitorName} (${targetUser.email})`,
      details: `Sadarkaa eeyyamaa fooyyesse: ${targetUser.subscriptionPlan?.toUpperCase() || 'STARTER'} -> ${newPlan.toUpperCase()}`,
      metadata: { userId: targetUser.id, plan: newPlan }
    });

    setUserActionToast(
      `Eeyyamni "${targetUser.visitorName}" gara ${newPlan.toUpperCase()} jijjiirameera.`
    );
    setTimeout(() => setUserActionToast(null), 3000);
  };

  // Confirm and Re-validate Premium Subscription Status
  const confirmPremiumSubscription = async (targetUser: ManagedUser) => {
    const updatedUsers = usersList.map((u) =>
      u.id === targetUser.id
        ? {
            ...u,
            isPremium: true,
            subscriptionPlan: 'unlimited',
            role: 'premium',
            subscriptionTier: 'premium',
            verifiedAt: new Date().toISOString(),
          }
        : u
    );
    setUsersList(updatedUsers);

    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        isPremium: true,
        subscriptionPlan: 'unlimited',
        role: 'premium',
        subscriptionTier: 'premium',
        verifiedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore premium confirmation deferred', e);
    }

    // Record in System Activity Log
    await logAdminAction({
      actionType: 'license_upgrade',
      target: `${targetUser.visitorName} (${targetUser.email})`,
      details: `Eeyyama Premium mirkaneesse / haaromseera (Confirmed & Re-validated Unlimited Subscription).`,
      metadata: { userId: targetUser.id, plan: 'unlimited' }
    });

    setUserActionToast(
      `Eeyyamni Premium fayyadamaa "${targetUser.visitorName}" milkaa'inaan mirkanaa'ee / haaromfameera!`
    );
    setTimeout(() => setUserActionToast(null), 3000);
  };

  // Approve Court Access Request
  const handleApproveCourtRequest = async (req: CourtAccessRequest) => {
    const hasValidLetter = Boolean(
      req.officialLetterContent && 
      req.officialLetterContent.trim().length >= 15 && 
      req.officialLetterContent.trim() !== 'Xalayaa mirkaneessa mana murtii.' &&
      req.outgoingRefNo &&
      req.outgoingRefNo.trim() !== 'MM/2026'
    );

    if (!hasValidLetter) {
      setUserActionToast(
        `⚠️ Xalayaan kun mana hojii isaaniitii hin baane! Dhaabbanni xalayaa seera qabeessa chaappaa fi lakkoofsa bahii qabu osoo hin dhiheessin ofumaan mirkaneessuun dhorkaa dha.`
      );
      setTimeout(() => setUserActionToast(null), 5000);
      return;
    }

    const res = await approveCourtInstitution(
      req.institutionName,
      req.jurisdiction,
      req.courtLevel,
      req.email,
      req.contactPerson,
      req.outgoingRefNo,
      req.officialLetterContent
    );

    if (res.success && res.institution) {
      const updatedReqs = courtRequests.map((r) =>
        r.id === req.id ? { ...r, status: 'approved' as const } : r
      );
      setCourtRequests(updatedReqs);
      localStorage.setItem('seera_court_access_requests_cache', JSON.stringify(updatedReqs));
      setInstitutions(getLocalInstitutions());

      // Record in System Activity Log
      await logAdminAction({
        actionType: 'court_approval',
        target: req.institutionName,
        details: `Dhaabbata Mana Murtii mirkaneessee Admin godhe. Koodii eeyyamaa (${res.institution.accessCode}) kenne. Bakka bu'aa: ${req.contactPerson} (${req.email})`,
        metadata: { courtLevel: req.courtLevel, accessCode: res.institution.accessCode }
      });

      setUserActionToast(
        `Dhaabbanni Mana Murtii "${req.institutionName}" mirkanaa'eeera! Koodiin (${res.institution.accessCode}) gara email isaaniitti ("${req.email}") ergameera.`
      );
      setTimeout(() => setUserActionToast(null), 4000);
    } else {
      setUserActionToast(`⚠️ ${res.message || 'Mirkaneessuun hin danda\'amne.'}`);
      setTimeout(() => setUserActionToast(null), 5000);
    }
  };

  // Save System Configuration
  const handleSaveSystemConfig = async () => {
    const configPayload = {
      defaultAiModel,
      antiCloningEnforced,
      rightClickProtection,
      watermarkProtection,
      courtGateEnforced,
      systemBroadcastMsg,
      isBroadcastActive,
      updatedBy: 'ayeledha@gmail.com',
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('seera_system_config', JSON.stringify(configPayload));
    localStorage.setItem('seera_system_broadcast', systemBroadcastMsg);
    localStorage.setItem('seera_system_broadcast_active', isBroadcastActive ? 'true' : 'false');

    try {
      await setDoc(doc(db, 'system_config', 'platform_settings'), {
        ...configPayload,
        serverTimestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore system_config save deferred', e);
    }

    // Record in System Activity Log
    await logAdminAction({
      actionType: 'config_update',
      target: 'Qindaa\'ina Sirnaa & Nageenyaa (System Config)',
      details: `Model=${defaultAiModel}, Anti-Cloning=${antiCloningEnforced}, CourtGate=${courtGateEnforced}, BroadcastActive=${isBroadcastActive} ("${systemBroadcastMsg}")`,
      metadata: configPayload
    });

    setConfigSavedToast('Qindaa\'inni Sirnaa Milkaa\'inaan Ol-kaawwameera (Config Saved & Logged)!');
    setTimeout(() => setConfigSavedToast(null), 3000);
  };

  // Export Analytics to JSON
  const handleExportAnalyticsJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            reportTitle: 'SAI Ethio SeeraAI System Analytics & Audit Report',
            owner: 'Ayele Be Dha',
            generatedAt: new Date().toISOString(),
            metrics: {
              totalUsers: usersList.length,
              verifiedScholars: usersList.filter((u) => u.isLegalProfessional).length,
              activeCourtInstitutions: institutions.length,
              totalBenches: getLocalCourtUsers().length,
            },
            activityLogs: activityLogs,
            recentActivityStream: analyticsEvents,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `seera_ai_audit_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Activity Logs to JSON (Current Filtered View, Categorized by Action Type)
  const handleArchiveLogs = async () => {
    const result = await archiveAdminActivityLogs();
    if (result.success) {
      setUserActionToast(`Milkaa'inaan logii ${result.count} archive ta'eera (Archived successfully).`);
      setTimeout(() => setUserActionToast(null), 3000);
    } else {
      setUserActionToast('Archive logii irratti rakkoo uumameera.');
      setTimeout(() => setUserActionToast(null), 3000);
    }
  };

  const handleExportLogsJson = () => {
    const categorized: Record<string, AdminActivityLogEntry[]> = {};
    filteredActivityLogs.forEach(log => {
      const cat = log.actionType || 'other';
      if (!categorized[cat]) {
        categorized[cat] = [];
      }
      categorized[cat].push(log);
    });

    const exportPayload = {
      exportTitle: 'SAI Ethio SeeraAI - Filtered System Activity Logs Audit Backup',
      exportedAt: new Date().toISOString(),
      totalFilteredCount: filteredActivityLogs.length,
      categoriesCount: Object.keys(categorized).length,
      categorizedLogs: categorized,
      rawLogs: filteredActivityLogs,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `filtered_system_activity_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Activity Logs to CSV (Current Filtered View)
  const handleExportLogsCsv = () => {
    const headers = ['Log ID', 'Action Type', 'Target', 'Details', 'Admin Email', 'Timestamp'];
    const rows = filteredActivityLogs.map(l => [
      l.id,
      l.actionType,
      `"${l.target.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.adminEmail,
      l.timestamp
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `filtered_system_activity_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopyLogId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // =========================================================================
  // GATE VIEW: If not the owner, render strict owner authorization barrier
  // =========================================================================
  if (!isOwner) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-slate-900 border-2 border-rose-500/40 text-center space-y-6 shadow-2xl animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold uppercase tracking-wider">
          <span>⛔</span>
          <span>Eegumsa Abbaa Qabeenyaa (Owner Only)</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">
            {currentLang === 'om'
              ? 'Kutaa To\'annoo Abbaa Qabeenyaa Qofa (Admin Dashboard)'
              : 'የባለቤት አስተዳደር ክፍል (Admin Dashboard)'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {currentLang === 'om'
              ? 'Kutaan kun abbaa qabeenyaa platformii (ayeledha@gmail.com / Ayele Be Dha) qofaaf kan eegame dha. To\'annoon mirkaneessa fayyadamtootaa, xiinxala sirnaa, fi qindaa\'inni platformii as keessatti gaggeeffama.'
              : 'ይህ ክፍል ለዋናው ባለቤት (ayeledha@gmail.com) ብቻ የተፈቀደ ሲሆን የተጠቃሚዎች ማረጋገጫ፣ አጠቃላይ ትንታኔ እና የስርዓት ማስተካከያ መቆጣጠሪያዎችን ይዟል።'}
          </p>
        </div>

        {unlockError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {unlockError}
          </div>
        )}

        <form onSubmit={handleUnlockOwnerKey} className="space-y-3 max-w-sm mx-auto">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 text-left">
              Koodii Icciitii Abbaa Qabeenyaa (Owner Security Key)
            </label>
            <input
              type="password"
              value={unlockKeyInput}
              onChange={(e) => setUnlockKeyInput(e.target.value)}
              placeholder="Jecha icciitii abbaa qabeenyaa..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Key className="w-4 h-4" />
            <span>Abbaa Qabeenyaa Ta\'ii Bani (Unlock Admin Dashboard)</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
          FDRE Proclamation No. 410/2004 Protected • Legal AI Admin Security
        </div>
      </div>
    );
  }

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.visitorName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.licenseOrInstitution || '').toLowerCase().includes(userSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (filterRole === 'verified') return u.accountStatus === 'approved' || u.isLegalProfessional;
    if (filterRole === 'pending') return u.accountStatus === 'pending' || !u.isLegalProfessional;
    if (filterRole === 'judge') return u.legalRole === 'judge';
    if (filterRole === 'advocate') return u.legalRole === 'advocate';
    return true;
  });

  // Filtered Activity Logs
  const filteredActivityLogs = activityLogs.filter((log) => {
    const qLower = logSearchQuery.toLowerCase();
    const matchesSearch =
      !logSearchQuery.trim() ||
      log.target.toLowerCase().includes(qLower) ||
      log.details.toLowerCase().includes(qLower) ||
      log.adminEmail.toLowerCase().includes(qLower) ||
      log.actionType.toLowerCase().includes(qLower);

    if (!matchesSearch) return false;
    if (logActionFilter !== 'all' && log.actionType !== logActionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* =========================================================================
          TOP EXECUTIVE BANNER
          ========================================================================= */}
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>👑</span>
              <span>Owner & Master Administrator Portal</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Production Engine: Online</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold flex items-center gap-1.5">
              <History className="w-3 h-3" />
              <span>{activityLogs.length} Audit Actions Recorded</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {currentLang === 'om' ? 'Kutaa To\'annoo Ol\'aanaa (Admin Dashboard)' : 'ዋናው የአስተዳዳሪ ክፍል (Admin Dashboard)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            {currentLang === 'om'
              ? 'To\'annoo mirkaneessa fayyadamtootaa, galmee gochaalee sirnaa (system activity log), qorannoo xiinxala dhimmoota seeraa, fi qindaa\'ina bu\'uuraa sirna SAI Ethio (SeeraAI) dhuunfaan to\'adhaa.'
              : 'የተጠቃሚዎች ማረጋገጫ፣ የአስተዳዳሪ ድርጊቶች ምዝግብ (activity log)፣ የህግ ትንታኔዎች ግምገማ እና የSAI Ethio መድረክ አጠቃላይ የስርዓት ውቅር መቆጣጠሪያ።'}
          </p>
          <div className="text-xs text-amber-400/90 font-mono">
            Owner Authority: Ayele Be Dha (ayeledha@gmail.com) • SuperAdmin Access
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="https://t.me/seeraai_ethio"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 border border-sky-400/40"
            title="Join SeeraAI Telegram Channel for real-time legal updates"
          >
            <span>✈️</span>
            <span>Join Telegram Channel</span>
          </a>

          <button
            type="button"
            onClick={handleExportAnalyticsJson}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Gabaasa Baasi (JSON)</span>
          </button>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('home')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Gara Fuula Duraatti</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          HIGH-LEVEL KPI METRICS GRID
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Ogeessota Seeraa</span>
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{usersList.length}</div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{usersList.filter((u) => u.isLegalProfessional).length} Mirkanaa'an (Verified)</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Gochaalee Bulchiinsaa</span>
            <History className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{activityLogs.length}</div>
          <div className="text-[11px] text-emerald-400 font-medium">
            <span>Audit Action Log Streams Active</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Iyyata Dhaabbataa</span>
            <Building className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{courtRequests.length}</div>
          <div className="text-[11px] text-amber-400 font-medium">
            <span>{courtRequests.filter((r) => r.status === 'pending').length} Pending Approval</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">AI Reasoning Engine</span>
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono text-base truncate">
            {defaultAiModel}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            <span>X20 Legal Thinking Ready</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          DASHBOARD PRIMARY TABS NAVIGATION (4 TABS)
          ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>1. Mirkaneessa (User Verification)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activityLogs')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'activityLogs'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>2. Galmee Gochaalee (Activity Log)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('courtWorkflows')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'courtWorkflows'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Workflow className="w-4 h-4" />
          <span>3. Adeemsa Seeraa (Court Workflows)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>4. Xiinxala & Gabaasa (Analytics)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'config'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>5. Qindaa\'ina (Configuration)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pronunciation')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'pronunciation'
              ? 'bg-amber-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>6. Sagaleessuu (Pronunciation Queue)</span>
        </button>
      </div>

      {/* Action Toast Notifications */}
      {userActionToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{userActionToast}</span>
        </div>
      )}

      <VectorSearchStats />

      {configSavedToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{configSavedToast}</span>
        </div>
      )}

      {/* =========================================================================
          TAB 1: USER VERIFICATION & COURT ONBOARDING
          ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <span>To'annoo Mirkaneessa Fayyadamtootaa (Legal Practitioner Verification)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Abbootii Seeraa, Abukaattota, fi ogeessota seeraa eeyyami, mirkaneessi, ykn haqi.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Barbaadi maqaa/email..."
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 w-48 sm:w-56"
                  />
                </div>

                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Cufa (All Users)</option>
                  <option value="verified">Mirkanaa'an (Verified)</option>
                  <option value="pending">Kanneen Hafan (Pending)</option>
                  <option value="judge">Abbootii Seeraa (Judges)</option>
                  <option value="advocate">Abukaattota (Advocates)</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Maqaa & Email</th>
                    <th className="py-3 px-4">Ogummaa (Role)</th>
                    <th className="py-3 px-4">Dhaabbata / Waraqaa Ragaa</th>
                    <th className="py-3 px-4">Sadarkaa Eeyyamaa</th>
                    <th className="py-3 px-4">Haala Mirkaneessaa</th>
                    <th className="py-3 px-4 text-right">Tarkaanfii (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{u.visitorName}</span>
                          {u.isLegalProfessional && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                          {u.legalRole || 'advocate'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {u.licenseOrInstitution || 'FDRE Bar Association'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.subscriptionPlan === 'unlimited'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : u.subscriptionPlan === 'pro'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {(u.subscriptionPlan || 'starter').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.accountStatus === 'approved' || u.isLegalProfessional
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {u.accountStatus === 'approved' || u.isLegalProfessional ? '🟢 Approved' : '🟡 Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleVerification(u)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            u.isLegalProfessional
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {u.isLegalProfessional ? 'Haqi (Revoke)' : 'Mirkaneessi'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePlan(u)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-medium transition-all cursor-pointer"
                        >
                          {u.subscriptionPlan === 'unlimited' ? 'Standard' : 'Make Pro'}
                        </button>

                        <button
                          type="button"
                          onClick={() => confirmPremiumSubscription(u)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Confirm Premium
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Court Institutional Requests Review */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-400" />
                  <span>Iyyata Dhaabbata Mana Murtii (Court Onboarding Requests)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Manneen murtii gargaarsa AI fudhachuuf gara Ayele Be Dha tti dhiyaatan.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Total Requests: {courtRequests.length}
              </div>
            </div>

            {courtRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic bg-slate-950 rounded-2xl border border-slate-800/80">
                Iyyanni mana murtii yeroo ammaa eeggachaa jiru hin jiru (No pending court requests).
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courtRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-sm">{req.institutionName}</div>
                        <div className="text-xs text-slate-400">{req.jurisdiction} • {req.courtLevel}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      <div>Bakka Bu'aa: <strong className="text-slate-100">{req.contactPerson}</strong></div>
                      <div>Email: <strong className="text-amber-400 font-mono">{req.email}</strong></div>
                      {req.phone && <div>Bilbila: <strong className="text-slate-300 font-mono">{req.phone}</strong></div>}
                    </div>

                    {req.status === 'pending' && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleApproveCourtRequest(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mirkaneessi & Admin Taasisi (Approve Admin)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SYSTEM ACTIVITY LOG (NEW DEDICATED AUDIT SECTION)
          ========================================================================= */}
      {activeTab === 'activityLogs' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <span>Galmee Gochaalee Sirnaa (System Activity Log)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                        {filteredActivityLogs.length} Records
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tarree qorannoo yeroon galmaa'e (time-stamped audit) kan gochaalee bulchiinsaa hunda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportLogsCsv}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV Baasi</span>
                </button>

                <button
                  type="button"
                  onClick={handleArchiveLogs}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Archive Logs</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportLogsJson}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Export currently filtered logs into a structured JSON backup file categorized by action type"
                >
                  <FileText className="w-4 h-4" />
                  <span>JSON Baasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fetchRemoteAdminActivityLogs().then(logs => setActivityLogs(logs));
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Haromsi</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Barbaadi maqaa fayyadamaa, email, gosa gochaa, ykn dhimma..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Gosa Gochaa Cufa (All Action Types)</option>
                  <option value="user_verification">Mirkaneessa Fayyadamaa (User Verification)</option>
                  <option value="user_revocation">Mirkaneessa Haquu (User Revocation)</option>
                  <option value="license_upgrade">Fooyya'iinsa Eeyyamaa (License Upgrade)</option>
                  <option value="court_approval">Eeyyama Mana Murtii (Court Approval)</option>
                  <option value="config_update">Qindaa'ina Sirnaa (System Config)</option>
                  <option value="broadcast_update">Labsii Waliigalaa (Broadcast Update)</option>
                </select>
              </div>
            </div>

            {/* Time-Stamped List */}
            {filteredActivityLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs italic bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2">
                <History className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                <div>Galmeen gochaalee barbaaddan hin argamne (No matching activity logs found).</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivityLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDateTime = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleString()
                    : log.timestamp;

                  // Dynamic action badge styling
                  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                  let actionEmoji = '📝';
                  let actionLabel = log.actionType.replace('_', ' ').toUpperCase();

                  if (log.actionType === 'user_verification') {
                    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    actionEmoji = '🟢';
                    actionLabel = 'USER VERIFIED';
                  } else if (log.actionType === 'user_revocation') {
                    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                    actionEmoji = '🔴';
                    actionLabel = 'VERIFICATION REVOKED';
                  } else if (log.actionType === 'license_upgrade') {
                    badgeColor = 'bg-purple-500/10 text-purple-300 border-purple-500/30';
                    actionEmoji = '👑';
                    actionLabel = 'PLAN UPGRADED';
                  } else if (log.actionType === 'court_approval') {
                    badgeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                    actionEmoji = '🏛️';
                    actionLabel = 'COURT APPROVED';
                  } else if (log.actionType === 'config_update') {
                    badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                    actionEmoji = '⚙️';
                    actionLabel = 'CONFIG UPDATED';
                  } else if (log.actionType === 'broadcast_update') {
                    badgeColor = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
                    actionEmoji = '📢';
                    actionLabel = 'BROADCAST ALERT';
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${badgeColor}`}>
                            <span>{actionEmoji}</span>
                            <span>{actionLabel}</span>
                          </span>

                          <span className="font-bold text-white text-xs sm:text-sm">
                            {log.target}
                          </span>
                        </div>

                        {/* Exact Timestamp */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span title={formattedDateTime}>{formattedDateTime}</span>
                          {log.displayTime && (
                            <span className="text-slate-500">({log.displayTime})</span>
                          )}
                        </div>
                      </div>

                      {/* Details Narrative */}
                      <p className="text-xs text-slate-300 leading-relaxed font-sans pl-1">
                        {log.details}
                      </p>

                      {/* Footer Metadata */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                        <div className="flex items-center gap-3">
                          <span>Admin: <strong className="text-amber-400/90">{log.adminEmail}</strong></span>
                          <span>ID: {log.id}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyLogId(log.id)}
                          className="hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy Log ID"
                        >
                          {copiedLogId === log.id ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Copied
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5">
                              <Copy className="w-3 h-3" /> Copy ID
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: COURT WORKFLOWS & INSTITUTIONAL JURISDICTION
          ========================================================================= */}
      {activeTab === 'courtWorkflows' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <InstitutionManagementView 
            currentLang={currentLang} 
            onNavigateToBench={(level) => {
              if (onNavigateTab) {
                onNavigateTab?.('courtWork');
              }
            }} 
          />
        </div>
      )}

      {/* =========================================================================
          TAB 4: ANALYTICS REVIEW
          ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Referral & Share Tracking Statistics Widget */}
          {(() => {
            const totalSharesCount = adminShareEvents.length || 1;
            const channelStats: Record<string, number> = {};
            const deviceStats: Record<string, number> = {};
            const browserStats: Record<string, number> = {};

            adminShareEvents.forEach((ev: any) => {
              const ch = ev.channel || 'Other';
              channelStats[ch] = (channelStats[ch] || 0) + 1;

              const dev = ev.device || 'Desktop';
              deviceStats[dev] = (deviceStats[dev] || 0) + 1;

              const br = ev.browser || 'Chrome';
              browserStats[br] = (browserStats[br] || 0) + 1;
            });

            return (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-amber-400" />
                      <span>Referral & Share Tracking Statistics (Channels, Devices & Browsers)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time telemetry of how visitors share SeeraAI across social channels, devices, and browsers.
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                    Total Shares Recorded: {adminShareEvents.length}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 1. Channels Breakdown */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                      <span>Share Channels</span>
                      <span className="text-amber-400">📊</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      {Object.entries(channelStats).map(([channel, count]) => {
                        const pct = Math.round((count / totalSharesCount) * 100);
                        return (
                          <div key={channel} className="space-y-1">
                            <div className="flex justify-between text-slate-300 font-medium">
                              <span>{channel}</span>
                              <span className="font-mono text-amber-400">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full transition-all" style={{ width: `${Math.max(pct, 5)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Devices Breakdown */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                      <span>Visitor Devices</span>
                      <span className="text-emerald-400">💻</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      {Object.entries(deviceStats).map(([device, count]) => {
                        const pct = Math.round((count / totalSharesCount) * 100);
                        return (
                          <div key={device} className="space-y-1">
                            <div className="flex justify-between text-slate-300 font-medium">
                              <span>{device}</span>
                              <span className="font-mono text-emerald-400">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all" style={{ width: `${Math.max(pct, 5)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Browsers Breakdown */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                      <span>Browsers</span>
                      <span className="text-blue-400">🌐</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      {Object.entries(browserStats).map(([browser, count]) => {
                        const pct = Math.round((count / totalSharesCount) * 100);
                        return (
                          <div key={browser} className="space-y-1">
                            <div className="flex justify-between text-slate-300 font-medium">
                              <span>{browser}</span>
                              <span className="font-mono text-blue-400">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all" style={{ width: `${Math.max(pct, 5)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Top Breakdown Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Dhimmoota Seeraa (Practice Areas)</span>
                <Scale className="w-4 h-4 text-amber-400" />
              </h4>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Murteewwan Ijoo (Cassation)</span>
                    <span className="font-mono text-amber-400">42%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '42%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Qophii Waliigaltee (Contracts)</span>
                    <span className="font-mono text-emerald-400">28%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '28%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Seera Hojjataa fi Lafa (Labor/Land)</span>
                    <span className="font-mono text-blue-400">18%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '18%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Iyyannoo fi Falmii Yakkaa (Pleadings)</span>
                    <span className="font-mono text-purple-400">12%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Afaanota Fayyadamaa (Languages)</span>
                <Globe className="w-4 h-4 text-emerald-400" />
              </h4>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Afaan Oromoo (Default)</span>
                    <span className="font-mono text-emerald-400">65%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>አማርኛ (Amharic)</span>
                    <span className="font-mono text-amber-400">25%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>English (Trilingual Output)</span>
                    <span className="font-mono text-blue-400">10%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '10%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Meeshaalee & Nageenya (System Security)</span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </h4>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span>WebAuthn Biometric Protection:</span>
                  <span className="text-emerald-400 font-bold font-mono">🟢 100% Armed</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span>User Data Isolation:</span>
                  <span className="text-emerald-400 font-bold font-mono">🟢 Strict Scoped</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span>Offline IndexedDB Caching:</span>
                  <span className="text-emerald-400 font-bold font-mono">🟢 Instant Sync</span>
                </div>
              </div>
            </div>
          </div>

          {/* Realtime Event Stream */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>Galmee Hordoffii Hojiirra Oolmaa (Live Legal Interaction Log)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Gaaffilee seeraa, qorannoo labsiilee, fi waraabbii dhaddachaa yeroo ammaa dhiyaatan.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Live Feed</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {analyticsEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      <Gavel className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{ev.event}</span>
                        {ev.category && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">
                            {ev.category}
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{ev.details}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">User: {ev.userId}</div>
                    </div>
                  </div>

                  <div className="text-slate-500 font-mono text-[11px] shrink-0 sm:text-right flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span>{ev.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SYSTEM CONFIGURATION
          ========================================================================= */}
      {activeTab === 'config' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>Qindaa'ina Sirnaa fi Seera Hojii (Master System Configuration)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Qindaa'ina AI, ittisa seeraa (FDRE Proclamation 410/2004), fi sirna dhaabbilee asii fooyyessaa.
              </p>
            </div>

            {/* AI Model Architecture Control */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                <Cpu className="w-4 h-4" />
                <span>AI Model Tier & Reasoning Architecture</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => setDefaultAiModel('gemini-flash-lite-latest')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    defaultAiModel === 'gemini-flash-lite-latest'
                      ? 'bg-amber-500/10 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm mb-1">⚡ Flash Lite Tier</div>
                  <div className="text-[11px] leading-relaxed">
                    Saffisa olaanaa, tajaajila salphaa fi deebii daqiiqaa muraasa keessatti.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultAiModel('gemini-2.5-pro')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    defaultAiModel === 'gemini-2.5-pro'
                      ? 'bg-amber-500/10 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm mb-1">⚖️ Gemini 2.5 Pro (Recommended)</div>
                  <div className="text-[11px] leading-relaxed">
                    Xiinxala dhimmoota falmii, madaallii precedents, fi qophii waliigaltee gadi fageenyaan.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultAiModel('gemini-2.5-deep-thinking')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    defaultAiModel === 'gemini-2.5-deep-thinking'
                      ? 'bg-amber-500/10 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm mb-1">🧠 Deep Thinking (X20)</div>
                  <div className="text-[11px] leading-relaxed">
                    Dogoggora bu'uura seeraa adda baasuu fi xiinxala murtee ijibbaataa olaanaa.
                  </div>
                </button>
              </div>
            </div>

            {/* Copyright & Anti-Cloning Enforcement */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Ittisa Koompiyuutaraa & Mirga Abbummaa (FDRE Proclamation 410/2004)</span>
              </h4>

              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-200">Anti-Cloning & Source Code Protection Active</div>
                    <div className="text-slate-400 text-[11px]">
                      Applikeeshiniin kun akka hin garagalfamne (clone) ittisa seeraa qabaachuu mirkaneessi.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiCloningEnforced}
                    onChange={(e) => setAntiCloningEnforced(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-200">Legal Watermark Enforcement</div>
                    <div className="text-slate-400 text-[11px]">
                      Sanadoota PDF fi gabaasa baafaman hunda irratti chaappaa abbummaa Ayele Be Dha kaa'i.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={watermarkProtection}
                    onChange={(e) => setWatermarkProtection(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-200">Court Institutional Gate Enforcement</div>
                    <div className="text-slate-400 text-[11px]">
                      Hojiileen mana murtii nama kamuuf banaa akka hin taane cufamee akka eegamu godhi.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={courtGateEnforced}
                    onChange={(e) => setCourtGateEnforced(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Platform Broadcast Banner */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                <Radio className="w-4 h-4" />
                <span>Ergaa Labsii Waliigalaa (Live System Broadcast Message)</span>
              </h4>

              <div className="space-y-3">
                <input
                  type="text"
                  value={systemBroadcastMsg}
                  onChange={(e) => setSystemBroadcastMsg(e.target.value)}
                  placeholder="Ergaa labsii fayyadamtoota hundaaf mul'atu..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBroadcastActive}
                    onChange={(e) => setIsBroadcastActive(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>Labsichi yeroo ammaa fuula applikeeshinii hunda irratti haa mul'atu (Broadcast Active)</span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveSystemConfig}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Qindaa'ina Sirnaa Ol-kaa'i (Save Configuration & Log)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: PRONUNCIATION APPROVAL QUEUE
          ========================================================================= */}
      {activeTab === 'pronunciation' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-amber-400" />
                  <span>Legal Pronunciation Approval Queue (Sagaleessuu Seeraa)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Review and approve or reject legal terms and phonetic transcriptions submitted by legal professionals.
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-mono">
                Total Queue: {lexiconSuggestions.length}
              </span>
            </div>

            <div className="space-y-3">
              {lexiconSuggestions.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  No pronunciation terms in review queue.
                </div>
              ) : (
                lexiconSuggestions.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300 text-base">{item.term}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">{item.lang}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          item.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1.5 space-x-3">
                        <span>Phonetic: <strong className="text-emerald-400 font-mono">{item.phonetic}</strong></span>
                        <span>Suggested By: <strong className="text-slate-200">{item.suggestedBy}</strong></span>
                        <span>Date: {new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleApproveSuggestion(item.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                        >
                          <Check size={14} />
                          <span>Approve</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRejectSuggestion(item.id)}
                        className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
