import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  UserCheck, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Gavel, 
  Clock, 
  Send, 
  Printer, 
  Download, 
  ShieldCheck, 
  Plus, 
  Workflow, 
  Scale, 
  Building2, 
  Search, 
  FilePlus, 
  ShieldAlert, 
  ArrowRight,
  BookOpen,
  Bell,
  Check,
  Lock,
  Users,
  Edit3,
  QrCode
} from 'lucide-react';

import { CourtEntryQRModal } from './CourtEntryQRModal';
import { CaseLogicAuditModal } from './CaseLogicAuditModal';
import { Language, translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { 
  getActiveCourtSession,
  CourtUser,
  getLocalCourtUsers,
  updateCourtUserBenchAssignment,
  getJudgesByBench,
  CourtLevelType,
  isCourtAccessAuthorized
} from '../services/courtInstitutionService';
import { InterCourtFileTransferModal } from './InterCourtFileTransferModal';
import {
  FirestoreCaseDocket,
  fetchAllCasesFromFirestore,
  assignCaseToJudgeInFirestore,
  bulkAssignCasesToJudgeInFirestore,
  registerNewCaseInFirestore,
  markCaseJudgeNotificationRead,
  getLocalCasesCache,
  updateCasePaymentStatus,
  bulkVerifyPendingPayments
} from '../services/courtCaseService';
import {
  CourtNotification,
  fetchCourtNotifications,
  subscribeToCourtNotifications,
  triggerServerDeadlineCheck,
  requestBrowserNotificationPermission,
  markNotificationAsRead
} from '../services/courtNotificationService';

interface DocketItem {
  id: string;
  caseNumber: string;
  claimantName: string;
  respondentName: string;
  isExParte?: boolean;
  exParteCategory?: 'guardianship' | 'probate' | 'name_change' | 'injunction_exparte' | 'other';
  claimSubject: string;
  filingDate: string;
  courtLevel: string;
  bench: string;
  assignedOfficer: string;
  assignedJudge?: string;
  assignedJudges: string[];
  assignedAt?: string;
  assignedBy?: string;
  isJudgeNotified?: boolean;
  paymentStatus?: 'pending' | 'verified' | 'rejected';
  sinqeeReceiptNo?: string;
  paymentRejectionReason?: string;
  currentStage: 'intake' | 'first_summons' | 'preliminary_objection' | 'plaintiff_reply_hearing' | 'second_summons' | 'substantive_hearing' | 'closed' | 'assigned_to_judge' | 'coordinator_review' | 'partially_heard';
  hasPreliminaryObjection: boolean;
  preliminaryObjectionReason?: string;
  firstSummonsStatus: 'served' | 'not_served_absent' | 'pending';
  nextHearingDate?: string;
  secondSummonsRefNo?: string;
  notes?: string;
}

interface LitigationLifecycleWorkflowManagerProps {
  currentLang: Language;
  onCaseCreated?: (docket: DocketItem) => void;
}

export const LitigationLifecycleWorkflowManager: React.FC<LitigationLifecycleWorkflowManagerProps> = ({
  currentLang,
  onCaseCreated,
}) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();
  const activeSession = getActiveCourtSession();

  // Active Dockets State loaded from local cache / Firestore
  const [dockets, setDockets] = useState<DocketItem[]>(() => {
    const cached = getLocalCasesCache();
    return cached as DocketItem[];
  });

  const [selectedDocketId, setSelectedDocketId] = useState<string>('docket-101');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'dockets' | 'pending_assignment' | 'bench_assignment' | 'officer_intake' | 'written_defense_intake' | 'plaintiff_rejoinder_intake' | 'cassation_response_intake' | 'ktas_coordinator' | 'preliminary_handler' | 'second_summons_generator' | 'new_intake'>('officer_intake');
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [docketFilterMode, setDocketFilterMode] = useState<'all' | 'notified_judge' | 'ex_parte' | 'non_served'>('all');

  // Authorized Court Personnel Verification (User Hayyamameef Qofa)
  const isOfficerAuthorized = Boolean(
    activeSession?.user || 
    profile?.role === 'court_personnel' || 
    profile?.role === 'judge' || 
    profile?.role === 'registrar' || 
    profile?.role === 'admin' ||
    user?.email === 'ayeledha@gmail.com' ||
    user?.email === 'ayeledha@saiethio.com' ||
    isCourtAccessAuthorized()
  );

  const authorizedOfficerName = activeSession?.user.fullName || profile?.visitorName || (user?.email ? user.email.split('@')[0] : 'Ofiisara Seeraa Hayyamame');
  const authorizedCourtName = activeSession?.courtName || 'Mana Murtii Waliigalaa Oromiyaa';
  const authorizedOfficerRole = (activeSession?.user.role as string) === 'court_admin' || (activeSession?.user.role as string) === 'admin' 
    ? 'Bulchaa Mana Murtii' 
    : (activeSession?.user.role || profile?.role || 'Ofiisara Seeraa / Registrar');

  // Bench Assignment Desk (Iddoo Ramaddii Dhaddachaa) States
  const [courtUsersList, setCourtUsersList] = useState<CourtUser[]>(() => getLocalCourtUsers());
  const [reassignModalUser, setReassignModalUser] = useState<CourtUser | null>(null);
  const [selectedNewBench, setSelectedNewBench] = useState<string>('Dhaddacha Hariiroo Hawaasaa');
  const [selectedNewLevel, setSelectedNewLevel] = useState<CourtLevelType>('first_instance');
  const [benchAssignmentMsg, setBenchAssignmentMsg] = useState<string | null>(null);
  const [isSavingBenchAssignment, setIsSavingBenchAssignment] = useState<boolean>(false);
  const [benchFilter, setBenchFilter] = useState<string>('all');

  // Pending Assignment KTAS Selector State
  const [judgeAssignMap, setJudgeAssignMap] = useState<Record<string, string>>({});
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignmentModalDoc, setAssignmentModalDoc] = useState<DocketItem | null>(null);

  // Checkbox-based Bulk Action Tool State
  const [selectedPendingCaseIds, setSelectedPendingCaseIds] = useState<string[]>([]);
  const [bulkTargetJudge, setBulkTargetJudge] = useState<string>('Abbaa Seeraa Caalaa');
  const [isBulkAssigning, setIsBulkAssigning] = useState<boolean>(false);
  const [bulkAssignSuccessMsg, setBulkAssignSuccessMsg] = useState<string | null>(null);

  const [selectedQrCase, setSelectedQrCase] = useState<DocketItem | null>(null);
  const [auditModalDocket, setAuditModalDocket] = useState<DocketItem | null>(null);

  // Automated 24h Deadline Notifications & Live Stream State
  const [courtNotifications, setCourtNotifications] = useState<CourtNotification[]>([]);
  const [isCheckingDeadlines, setIsCheckingDeadlines] = useState<boolean>(false);
  const [browserPushEnabled, setBrowserPushEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  // Sync with Firestore on mount and subscribe to court notifications
  useEffect(() => {
    fetchAllCasesFromFirestore().then(fetched => {
      if (fetched && fetched.length > 0) {
        setDockets(fetched as DocketItem[]);
      }
    });

    const unsubscribe = subscribeToCourtNotifications((notifs) => {
      setCourtNotifications(notifs);
    });

    // Check deadlines automatically on load
    triggerServerDeadlineCheck().catch(console.warn);

    return () => {
      unsubscribe();
    };
  }, []);

  // Form State for New Intake (Galmee Haaraa Galmeessuu)
  const [isExParte, setIsExParte] = useState<boolean>(false);
  const [exParteCategory, setExParteCategory] = useState<'guardianship' | 'probate' | 'name_change' | 'injunction_exparte' | 'other'>('probate');
  const [newClaimant, setNewClaimant] = useState('');
  const [newRespondent, setNewRespondent] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBench, setNewBench] = useState('Dhaddacha Hariiroo Hawaasaa');
  const [newAssignedJudge, setNewAssignedJudge] = useState('Abbaa Seeraa Caalaa');
  const [newFirstHearingDate, setNewFirstHearingDate] = useState('2026-11-05');
  const [newClaimNotes, setNewClaimNotes] = useState('');
  const [newCourtLevel, setNewCourtLevel] = useState<CourtLevelType>('first_instance');
  const [intakeSuccessMsg, setIntakeSuccessMsg] = useState<string | null>(null);

  // Form State for Preliminary Objections (Mormii Sadarkaa Duraa)
  const [poReason, setPoReason] = useState('Statute of Limitations (SDFHH Kwt 244 - Darbiinsa Yeroo)');
  const [poPlaintiffHearingDate, setPoPlaintiffHearingDate] = useState('2026-11-15');
  const [poActionNotes, setPoActionNotes] = useState('');
  const [poSuccessMsg, setPoSuccessMsg] = useState<string | null>(null);

  // Form State for 2nd Summons Generator (Waamicha 2ffaa Ajaja Dhaddachaatiin)
  const [summons2RefNo, setSummons2RefNo] = useState(`MMO/2026/SUMM-${Math.floor(100 + Math.random() * 900)}`);
  const [summons2Reason, setSummons2Reason] = useState('Waamichi jalqabaa sababa teessoon respondent hin argamneef hin qaqqabne.');
  const [summons2NewDate, setSummons2NewDate] = useState('2026-11-20');
  const [summons2SuccessMsg, setSummons2SuccessMsg] = useState<string | null>(null);

  // Form State for Statement of Defense (Deebii Himatamaa - SDFHH Kwt. 82/95)
  const [defenseCaseId, setDefenseCaseId] = useState('');
  const [defenseAdvocate, setDefenseAdvocate] = useState('');
  const [defenseSummary, setDefenseSummary] = useState('');
  const [defenseHasCounterclaim, setDefenseHasCounterclaim] = useState(false);
  const [defenseExhibitsNote, setDefenseExhibitsNote] = useState('');
  const [defenseNextHearingDate, setDefenseNextHearingDate] = useState('2026-11-18');
  const [defenseSuccessMsg, setDefenseSuccessMsg] = useState<string | null>(null);

  // Form State for Plaintiff Reply / Rejoinder (Deebii Deebii - SDFHH Kwt. 223/241)
  const [rejoinderCaseId, setRejoinderCaseId] = useState('');
  const [rejoinderPlaintiffAdvocate, setRejoinderPlaintiffAdvocate] = useState('');
  const [rejoinderSummary, setRejoinderSummary] = useState('');
  const [rejoinderRebuttalExhibits, setRejoinderRebuttalExhibits] = useState('');
  const [rejoinderNextHearingDate, setRejoinderNextHearingDate] = useState('2026-11-25');
  const [rejoinderSuccessMsg, setRejoinderSuccessMsg] = useState<string | null>(null);

  // Form State for Cassation Bench Pleadings (Deebii / Deebii Deebii Dhaddacha Ijibbaataa)
  const [cassationCaseId, setCassationCaseId] = useState('');
  const [cassationRespondentName, setCassationRespondentName] = useState('');
  const [cassationPleadingType, setCassationPleadingType] = useState<'deebii_ijibbaataa' | 'deebii_deebii_ijibbaataa'>('deebii_ijibbaataa');
  const [cassationLegalPrecedentsCited, setCassationLegalPrecedentsCited] = useState('Murtii Dhaddacha Ijibbaataa Jildii 18 Lakk. Galmee 102983');
  const [cassationMainArguments, setCassationMainArguments] = useState('');
  const [cassationSuccessMsg, setCassationSuccessMsg] = useState<string | null>(null);

  // Handler: Register Statement of Defense (Deebii Himatamaa)
  const handleRegisterWrittenDefense = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCase = dockets.find(d => d.id === defenseCaseId || d.caseNumber === defenseCaseId);
    if (!targetCase) return;

    setDockets(prev => prev.map(d => {
      if (d.id !== targetCase.id) return d;
      return {
        ...d,
        currentStage: 'plaintiff_reply_hearing' as const,
        nextHearingDate: defenseNextHearingDate,
        notes: `🛡️ Deebiin Himatamaa (SDFHH Kwt. 82) simatameera. Abukaattoo: ${defenseAdvocate || 'N/A'}. Qabiyyee: ${defenseSummary.slice(0, 80)}... Beellama Deebii Deebii: ${defenseNextHearingDate}`
      };
    }));

    setDefenseSuccessMsg(
      currentLang === 'om'
        ? `✅ Deebiin Himatamaa galmee ${targetCase.caseNumber} tiif simatamee galmaa'eera! Beellama Deebii Deebii: ${defenseNextHearingDate}`
        : `✅ Statement of Defense registered for Case ${targetCase.caseNumber}! Next Rejoinder Hearing: ${defenseNextHearingDate}`
    );
    setDefenseSummary('');
    setDefenseExhibitsNote('');
    setTimeout(() => setDefenseSuccessMsg(null), 4000);
  };

  // Handler: Register Plaintiff Reply / Rejoinder (Deebii Deebii)
  const handleRegisterPlaintiffRejoinder = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCase = dockets.find(d => d.id === rejoinderCaseId || d.caseNumber === rejoinderCaseId);
    if (!targetCase) return;

    setDockets(prev => prev.map(d => {
      if (d.id !== targetCase.id) return d;
      return {
        ...d,
        currentStage: 'substantive_hearing' as const,
        nextHearingDate: rejoinderNextHearingDate,
        notes: `📝 Deebiin Deebii Himataa (SDFHH Kwt. 223) simatameera. Abukaattoo: ${rejoinderPlaintiffAdvocate || 'N/A'}. Qabiyyee: ${rejoinderSummary.slice(0, 80)}... Beellama Qabxii Falmii: ${rejoinderNextHearingDate}`
      };
    }));

    setRejoinderSuccessMsg(
      currentLang === 'om'
        ? `✅ Deebiin Deebii Himataa galmee ${targetCase.caseNumber} tiif simatamee galmaa'eera! Sadarkaa Qabxii Falmii (Issue Framing): ${rejoinderNextHearingDate}`
        : `✅ Plaintiff Rejoinder registered for Case ${targetCase.caseNumber}! Stage advanced to Issue Framing & Substantive Hearing.`
    );
    setRejoinderSummary('');
    setRejoinderRebuttalExhibits('');
    setTimeout(() => setRejoinderSuccessMsg(null), 4000);
  };

  // Handler: Register Cassation Bench Response & Counter-Reply
  const handleRegisterCassationPleading = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCase = dockets.find(d => d.id === cassationCaseId || d.caseNumber === cassationCaseId);
    if (!targetCase) return;

    const pleadingLabel = cassationPleadingType === 'deebii_ijibbaataa' ? 'Deebii Himatamaa Ijibbaataa' : 'Deebii Deebii Ijibbaataa';

    setDockets(prev => prev.map(d => {
      if (d.id !== targetCase.id) return d;
      return {
        ...d,
        courtLevel: 'cassation',
        bench: 'Dhaddacha Ijibbaataa (Cassation Bench)',
        notes: `🏛️ Dhaddacha Ijibbaataa: ${pleadingLabel} simatameera. Precedents: ${cassationLegalPrecedentsCited}. Arguments: ${cassationMainArguments.slice(0, 80)}...`
      };
    }));

    setCassationSuccessMsg(
      currentLang === 'om'
        ? `🏛️ ${pleadingLabel} galmee Dhaddacha Ijibbaataa (${targetCase.caseNumber}) tiif simatamee Koree Abbootii Seeraa 5'iif qophaa'eera!`
        : `🏛️ ${pleadingLabel} registered for Cassation Case ${targetCase.caseNumber} and submitted to 5-Judge Cassation Panel!`
    );
    setCassationMainArguments('');
    setTimeout(() => setCassationSuccessMsg(null), 4000);
  };

  const selectedDocket = dockets.find(d => d.id === selectedDocketId) || dockets[0];

  // Handler: Register New Claim at Legal Officer Desk (KTAS / Registrar Desk)
  const handleRegisterNewIntake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOfficerAuthorized) {
      setIntakeSuccessMsg(
        currentLang === 'om' 
          ? '🚨 Dhimma banuun hin danda\'amu: Ofiisara seeraa hayyamameef qofatu dhimma banuu danda\'a!' 
          : '🚨 Unauthorized: Only verified legal officers can register dockets!'
      );
      return;
    }
    if (!newClaimant.trim() || (!isExParte && !newRespondent.trim()) || !newSubject.trim()) return;

    const generatedCaseNo = `CR-2026/${Math.floor(100 + Math.random() * 900)}`;
    const actualRespondent = isExParte ? 'N/A - Iyyata Dhuunfaa (Ex-Parte Petition)' : newRespondent;
    const isDirectingToPending = newAssignedJudge === 'Pending Assignment';
    
    const newDocketItem: DocketItem = {
      id: `docket-${Date.now()}`,
      caseNumber: generatedCaseNo,
      claimantName: newClaimant,
      respondentName: actualRespondent,
      isExParte: isExParte,
      exParteCategory: isExParte ? exParteCategory : undefined,
      claimSubject: newSubject,
      filingDate: new Date().toISOString().slice(0, 10),
      courtLevel: newCourtLevel,
      bench: newBench,
      assignedOfficer: authorizedOfficerName,
      assignedJudges: isDirectingToPending ? [] : [newAssignedJudge],
      assignedAt: isDirectingToPending ? undefined : new Date().toISOString().slice(0, 10),
      assignedBy: isDirectingToPending ? undefined : authorizedOfficerName,
      isJudgeNotified: !isDirectingToPending,
      currentStage: isExParte ? 'substantive_hearing' : 'first_summons',
      hasPreliminaryObjection: false,
      firstSummonsStatus: isExParte ? 'served' : 'pending',
      nextHearingDate: newFirstHearingDate,
      notes: newClaimNotes || (isDirectingToPending
        ? `Kutaa Ofiisara Seeraatiin (${authorizedOfficerName}) dhimmi banamee gara Dhaddacha "${newBench}" tti qajeelffameera. Ramaddii Abbaa Seeraa eegaa jira.`
        : (isExParte 
          ? `Dhimma Garee 1 Qofa (${exParteCategory}): Ofiisara Seeraatiin (${authorizedOfficerName}) banamee Abbaa Seeraa ${newAssignedJudge} (${newBench}) tiif qajeelffameera.`
          : `Himannaan Ofiisara Seeraatiin (${authorizedOfficerName}) banamee gara Dhaddacha "${newBench}" fi Abbaa Seeraa ${newAssignedJudge} tiif qajeelffameera.`
        )
      )
    };

    setDockets([newDocketItem, ...dockets]);
    setSelectedDocketId(newDocketItem.id);
    if (onCaseCreated) onCaseCreated(newDocketItem);

    // Persist to Firestore
    registerNewCaseInFirestore(newDocketItem as any).catch(console.warn);

    setIntakeSuccessMsg(
      currentLang === 'om'
        ? `🔔 Dhimmi Lakk. ${generatedCaseNo} Ofiisara Seeraa (${authorizedOfficerName}) tiin banamee Dhaddacha "${newBench}" tti qajeelffameera!`
        : `New Docket Registered & Directed to ${newBench} by Officer ${authorizedOfficerName}! Case No: ${generatedCaseNo}.`
    );

    setNewClaimant('');
    setNewRespondent('');
    setNewSubject('');
    setNewClaimNotes('');
    setIsExParte(false);
    setTimeout(() => {
      setIntakeSuccessMsg(null);
      setActiveWorkflowTab('officer_intake');
    }, 2800);
  };

  // Handler: Confirm Official Bench Assignment for Judge / Staff
  const handleSaveBenchAssignment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reassignModalUser) return;
    setIsSavingBenchAssignment(true);

    const operatorName = authorizedOfficerName;
    const result = await updateCourtUserBenchAssignment(
      reassignModalUser.id,
      selectedNewBench,
      selectedNewLevel,
      operatorName
    );

    if (result.success && result.user) {
      setCourtUsersList(prev => prev.map(u => u.id === result.user!.id ? result.user! : u));
      setBenchAssignmentMsg(
        currentLang === 'om'
          ? `✅ Abbaan Seeraa / Ogeessi "${result.user.fullName}" Dhaddacha "${selectedNewBench}" tiif milkaa'inaan ramadameera!`
          : `✅ Successfully assigned ${result.user.fullName} to ${selectedNewBench}!`
      );
      setReassignModalUser(null);
      setTimeout(() => setBenchAssignmentMsg(null), 4000);
    } else {
      setBenchAssignmentMsg(result.message);
    }
    setIsSavingBenchAssignment(false);
  };

  // Handler: KTAS / Court Coordinator Assigns Pending Case to Judge in Firestore
  const handleAssignPendingCaseToJudge = async (caseId: string, caseNumber: string) => {
    const targetJudge = judgeAssignMap[caseId] || 'Abbaa Seeraa Caalaa';
    setIsAssigning(true);

    const coordinatorName = activeSession?.user.fullName || profile?.visitorName || 'Qindeessaa Galmee KTAS';
    
    const updatedRecord = await assignCaseToJudgeInFirestore(caseId, targetJudge, coordinatorName);

    setDockets(prev => prev.map(d => {
      if (d.id === caseId) {
        return {
          ...d,
          assignedJudges: [targetJudge],
          assignedAt: updatedRecord.assignedAt,
          assignedBy: coordinatorName,
          isJudgeNotified: true,
          notes: `Qindeessaa Galmee KTAS (${coordinatorName}) tiin Abbaa Seeraa ${targetJudge} tiif ramadamee Firestore irratti update ta'eera.`
        };
      }
      return d;
    }));

    setIsAssigning(false);
    setAssignSuccessMsg(
      currentLang === 'om'
        ? `🔔 Galmeen Lakk. ${caseNumber} Abbaa Seeraa ${targetJudge} tiif milkaa'inaan ramadameera! Firestore update ta'ee notification ergameera. (Assigned At: ${new Date(updatedRecord.assignedAt || Date.now()).toLocaleTimeString()})`
        : `Case ${caseNumber} assigned to Judge ${targetJudge}! Firestore updated & Notification triggered.`
    );

    setTimeout(() => setAssignSuccessMsg(null), 3500);
  };

  // Handler: Toggle single case selection in Pending Assignment list
  const handleToggleSelectPendingCase = (caseId: string) => {
    setSelectedPendingCaseIds(prev => 
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  };

  // Handler: Toggle Select All pending cases
  const handleToggleSelectAllPending = () => {
    const pendingCases = dockets.filter(d => (!d.assignedJudges || d.assignedJudges.length === 0) && (!d.assignedJudge || d.assignedJudge === 'Pending Assignment'));
    if (selectedPendingCaseIds.length === pendingCases.length && pendingCases.length > 0) {
      setSelectedPendingCaseIds([]);
    } else {
      setSelectedPendingCaseIds(pendingCases.map(c => c.id));
    }
  };

  // Handler: Execute Bulk Assignment of Selected Cases to Single Judge in One Click
  const handleBulkAssignCasesToJudge = async () => {
    if (selectedPendingCaseIds.length === 0) return;
    setIsBulkAssigning(true);

    const coordinatorName = activeSession?.user.fullName || profile?.visitorName || 'Qindeessaa Galmee KTAS';
    const result = await bulkAssignCasesToJudgeInFirestore(
      selectedPendingCaseIds,
      bulkTargetJudge,
      coordinatorName
    );

    if (result.success) {
      setDockets(prev => prev.map(d => {
        if (selectedPendingCaseIds.includes(d.id)) {
          return {
            ...d,
            assignedJudge: bulkTargetJudge,
            assignedAt: new Date().toISOString(),
            assignedBy: coordinatorName,
            isJudgeNotified: true,
            notes: `Qindeessaa Galmee KTAS (${coordinatorName}) tiin Abbaa Seeraa ${bulkTargetJudge} tiif ramaddiin gamtaa (bulk assignment) raawwatameera.`
          };
        }
        return d;
      }));

      setBulkAssignSuccessMsg(
        currentLang === 'om'
          ? `⚡ Galmeewwan ${result.count} Abbaa Seeraa ${bulkTargetJudge} tiif milkaa'inaan ramadamaniiru! Firestore batch update ta'ee notification qindaa'aan (consolidated notification) ergameera.`
          : `⚡ Successfully bulk assigned ${result.count} cases to Judge ${bulkTargetJudge}! Firestore batch updated & consolidated notification dispatched.`
      );

      setSelectedPendingCaseIds([]);
      setTimeout(() => setBulkAssignSuccessMsg(null), 5000);
    }

    setIsBulkAssigning(false);
  };

  // Handler: Manual trigger for automated 24-hour deadline scanner
  const handleTriggerDeadlineScanner = async () => {
    setIsCheckingDeadlines(true);
    const result = await triggerServerDeadlineCheck();
    setIsCheckingDeadlines(false);

    setAssignSuccessMsg(
      currentLang === 'om'
        ? `⏰ To'annoo Beellama Sa'aatii 24: Galmeewwan ${result.scannedCount} qoratamaniiru, akeekkachiisni ${result.triggeredCount} ergameera!`
        : `⏰ 24h Deadline Scanner: ${result.scannedCount} cases checked, ${result.triggeredCount} alerts triggered!`
    );
    setTimeout(() => setAssignSuccessMsg(null), 4000);
  };

  // Handler: Enable Browser Push Notifications
  const handleEnablePushNotifications = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserPushEnabled(granted);
    if (granted) {
      setAssignSuccessMsg(
        currentLang === 'om' 
          ? '🔔 Akeekkachiisni Push browser kee irratti mirkanaa\'eera!' 
          : '🔔 Browser push notifications enabled successfully!'
      );
      setTimeout(() => setAssignSuccessMsg(null), 3000);
    }
  };

  // Handler: Judge Acknowledges / Reads Notification
  const handleAcknowledgeNotification = async (caseId: string) => {
    await markCaseJudgeNotificationRead(caseId);
    setDockets(prev => prev.map(d => {
      if (d.id === caseId) {
        return { ...d, isJudgeNotified: false };
      }
      return d;
    }));
  };

  // Handler: Record Preliminary Objection & Schedule Plaintiff Counter-Hearing
  const handleRecordPreliminaryObjection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocket) return;

    setDockets(prev => prev.map(d => {
      if (d.id !== selectedDocket.id) return d;
      return {
        ...d,
        hasPreliminaryObjection: true,
        preliminaryObjectionReason: poReason,
        currentStage: 'plaintiff_reply_hearing',
        nextHearingDate: poPlaintiffHearingDate,
        notes: `Mormiin Sadarkaa Duraa (${poReason}) dhiyaateera. Yaada himataa caqasuuf Beellamni (${poPlaintiffHearingDate})tti qabameera.`
      };
    }));

    setPoSuccessMsg(
      currentLang === 'om'
        ? `Mormiin Sadarkaa Duraa galmeeffameera! Beellamni Yaada Himataa Caqasuu: ${poPlaintiffHearingDate}`
        : `Preliminary Objection recorded! Hearing scheduled for Plaintiff Reply: ${poPlaintiffHearingDate}`
    );
    setTimeout(() => setPoSuccessMsg(null), 3000);
  };

  // Handler: Issue 2nd Court Summons & Injunction Order
  const handleIssueSecondSummons = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocket) return;

    setDockets(prev => prev.map(d => {
      if (d.id !== selectedDocket.id) return d;
      return {
        ...d,
        firstSummonsStatus: 'not_served_absent',
        currentStage: 'second_summons',
        secondSummonsRefNo: summons2RefNo,
        nextHearingDate: summons2NewDate,
        notes: `Ajaja Dhaddachaatiin Waamichi 2ffaan (${summons2RefNo}) ajajameera. Beellama Haaraa: ${summons2NewDate}`
      };
    }));

    setSummons2SuccessMsg(
      currentLang === 'om'
        ? `Waamichi 2ffaan Ajaja Dhaddachaatiin Milkaa'inaan Ba'eera! Lakk Ref: ${summons2RefNo}, Beellama Haaraa: ${summons2NewDate}`
        : `2nd Court Order Summons Issued Successfully! Ref: ${summons2RefNo}`
    );
    setTimeout(() => setSummons2SuccessMsg(null), 3000);
  };

  // Sinqee Bank Payment Verification Handlers
  const [paymentGatingModalDoc, setPaymentGatingModalDoc] = useState<DocketItem | null>(null);
  const [paymentToastMsg, setPaymentToastMsg] = useState<{ text: string; isError?: boolean; caseId?: string } | null>(null);

  const handleVerifySinglePayment = async (caseId: string, customReceipt?: string) => {
    const rNo = customReceipt || `SNQ-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const updated = await updateCasePaymentStatus(caseId, 'verified', rNo);
    if (updated) {
      setDockets(prev => prev.map(d => d.id === caseId ? { ...d, paymentStatus: 'verified', sinqeeReceiptNo: rNo } : d));
      setPaymentToastMsg({
        text: currentLang === 'om' 
          ? `✅ Kaffaltii Baankii Sinqee (${rNo}) milkaa'inaan mirkanaa'eera!`
          : `✅ Sinqee Bank Payment (${rNo}) verified successfully!`
      });
      setTimeout(() => setPaymentToastMsg(null), 4000);
      setPaymentGatingModalDoc(null);
    }
  };

  const handleBulkVerifyPaymentsAction = async () => {
    const pendingCases = dockets.filter(d => d.paymentStatus === 'pending' || !d.paymentStatus);
    if (pendingCases.length === 0) {
      setPaymentToastMsg({
        text: currentLang === 'om' ? 'Kaffaltiin eegaa jiru kamiyyuu hin jiru!' : 'No pending payments to verify!'
      });
      setTimeout(() => setPaymentToastMsg(null), 3000);
      return;
    }

    const count = await bulkVerifyPendingPayments(pendingCases.map(c => c.id));
    setDockets(prev => prev.map(d => ({
      ...d,
      paymentStatus: 'verified',
      sinqeeReceiptNo: d.sinqeeReceiptNo || `SNQ-2026-${Math.floor(10000 + Math.random() * 90000)}`
    })));

    setPaymentToastMsg({
      text: currentLang === 'om' 
        ? `✅ Kaffaltiin Baankii Sinqee galmeewwan ${count} milkaa'inaan mirkanaa'aniiru!`
        : `✅ Bulk verified Sinqee Bank payments for ${count} cases successfully!`
    });
    setTimeout(() => setPaymentToastMsg(null), 4000);
  };

  const handleRejectPaymentAction = async (caseId: string, reason?: string) => {
    const rejectionReason = reason || 'Nagaheen Baankii Sinqee Dambii Lakk. 08 unkaa guutuu hin qabu.';
    const updated = await updateCasePaymentStatus(caseId, 'rejected', undefined, rejectionReason);
    if (updated) {
      setDockets(prev => prev.map(d => d.id === caseId ? { ...d, paymentStatus: 'rejected', paymentRejectionReason: rejectionReason } : d));
      setPaymentToastMsg({
        isError: true,
        caseId,
        text: currentLang === 'om' 
          ? `🚨 Kaffaltiin Baankii Sinqee Kufaa Ta'eera! (Lakk. Galmee: ${updated.caseNumber}). Sababa: ${rejectionReason}`
          : `🚨 Sinqee Payment Rejected for Case ${updated.caseNumber}! Reason: ${rejectionReason}`
      });
    }
  };

  return (
    <div className="space-y-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      {/* Toast Alert Banner */}
      {paymentToastMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold shadow-xl animate-in fade-in duration-300 ${
          paymentToastMsg.isError 
            ? 'bg-rose-950/90 border-rose-500 text-rose-200' 
            : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{paymentToastMsg.isError ? '🚨' : '✅'}</span>
            <span>{paymentToastMsg.text}</span>
          </div>
          {paymentToastMsg.isError && paymentToastMsg.caseId && (
            <button
              onClick={() => {
                const doc = dockets.find(d => d.id === paymentToastMsg.caseId);
                if (doc) setPaymentGatingModalDoc(doc);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-400 cursor-pointer transition-all"
            >
              Ilaali / View Reason
            </button>
          )}
        </div>
      )}

      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-2xl font-bold shrink-0 shadow-inner">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
                {currentLang === 'om' ? 'Adeemsa Seera Deemsa Falmii (SDFHH Kwt 80-244)' : 'Civil Procedure Code Lifecycle'}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Official Confidential Workflow
              </span>
            </div>
            <h3 className="text-xl font-bold font-serif-legal text-white mt-1">
              {currentLang === 'om' ? 'To\'annoo Adeemsa Galmee, Mormii Duraa & Waamicha 2ffaa' : 'Judicial Docket Lifecycle & Preliminary Objections Suite'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {currentLang === 'om'
                ? 'Himannaa Ofiisara Seeraatiin keessummeessu irraa eagalee, lakk. galmee kenneen, beellama deebii, mormii sadarkaa duraa fi ajaja waamicha 2ffaa to\'achuuf.'
                : 'Manage case filing, docket numbers, preliminary objections (Art. 244), plaintiff reply hearings, and 2nd summons orders.'}
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleBulkVerifyPaymentsAction}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/40"
            title="Batch verify pending Sinqee Bank court fee receipts"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{currentLang === 'om' ? '⚡ Bulk Verify Sinqee Fees' : '⚡ Bulk Verify Sinqee Fees'}</span>
          </button>

          <button
            onClick={() => setActiveWorkflowTab('new_intake')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            <span>{currentLang === 'om' ? '+ Himannaa Haaraa Galmeessi' : '+ Register New Claim'}</span>
          </button>
        </div>
      </div>

      {/* Internal Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'officer_intake', label: currentLang === 'om' ? '✍️ Ofiisara Seeraa (Intake Desk)' : 'Legal Officer Intake' },
          { id: 'written_defense_intake', label: currentLang === 'om' ? '🛡️ Deebii Himatamaa (Art 82)' : 'Written Defense Intake' },
          { id: 'plaintiff_rejoinder_intake', label: currentLang === 'om' ? '📝 Deebii Deebii Himataa (Art 223)' : 'Plaintiff Rejoinder' },
          { id: 'cassation_response_intake', label: currentLang === 'om' ? '🏛️ Dhaddacha Ijibbaataa (Pleadings)' : 'Cassation Pleadings' },
          { id: 'ktas_coordinator', label: currentLang === 'om' ? '🏛️ Qindeessaa (KTAS Desk)' : 'KTAS Coordinator Desk', count: dockets.filter(d => (!d.assignedJudges || d.assignedJudges.length === 0) && (!d.assignedJudge || d.assignedJudge === 'Pending Assignment')).length },
          { id: 'bench_assignment', label: currentLang === 'om' ? '🏛️ Ramaddii Dhaddachaa (Bench Allocation)' : 'Bench Allocation', count: courtUsersList.filter(u => u.role === 'judge').length },
          { id: 'dockets', label: currentLang === 'om' ? '📋 Galmeewwan Hojii Irra Jiran' : 'Active Dockets', count: dockets.length },
          { id: 'preliminary_handler', label: currentLang === 'om' ? '🛡️ Mormii Sadarkaa Duraa (Art 244)' : 'Preliminary Objections' },
          { id: 'second_summons_generator', label: currentLang === 'om' ? '✉️ Waamicha 2ffaa & Ajaja Dhaddachaa' : '2nd Summons Generator' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveWorkflowTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeWorkflowTab === tab.id
                ? 'bg-amber-500/20 border border-amber-500/80 text-amber-300 shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-950 font-mono text-[10px] font-black">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SUB-VIEW 1: ACTIVE DOCKETS OVERVIEW */}
      {activeWorkflowTab === 'dockets' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Judge Notification Alert Header Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center justify-center text-lg font-bold shrink-0 animate-pulse">
                  🔔
                </div>
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span>NOTIFICATION ABBAA SEERAA (JUDICIAL ASSIGNMENT ALERTS)</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-black">
                      {dockets.filter(d => d.isJudgeNotified).length} Cases Assigned
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Galmeen Qindeessaa Galmee KTAS tiin banee Abbaa Seeraatiif ergame online irratti update ta'ee notification uumeera.
                  </p>
                </div>
              </div>

              {/* Quick Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setDocketFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    docketFilterMode === 'all'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Hunda ({dockets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDocketFilterMode('notified_judge')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    docketFilterMode === 'notified_judge'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🔔 Abbaa Seeraatiif Ergame ({dockets.filter(d => d.isJudgeNotified).length})
                </button>
                <button
                  type="button"
                  onClick={() => setDocketFilterMode('ex_parte')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    docketFilterMode === 'ex_parte'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  👤 Garee 1 Qofa (Ex-Parte)
                </button>
                <button
                  type="button"
                  onClick={() => setDocketFilterMode('non_served')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    docketFilterMode === 'non_served'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚠️ Waamichi Hin Qaqqabne
                </button>
              </div>
            </div>

            {/* List of Active Assigned Notifications with Tracking assignedAt Timestamps */}
            {dockets.filter(d => d.isJudgeNotified).length > 0 && (
              <div className="pt-2 border-t border-amber-500/20 space-y-2">
                <span className="text-[10px] font-mono text-amber-300 font-bold uppercase block">
                  TARREE GALMEE HAARAA ABBAA SEERAATTI ERGAMAN (LIVE NOTIFIED CASES & ASSIGNED_AT TRACKING):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dockets
                    .filter(d => d.isJudgeNotified)
                    .map(notified => (
                      <div
                        key={notified.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="truncate space-y-0.5">
                          <div className="font-bold text-white font-mono flex items-center gap-1.5">
                            <span>{notified.caseNumber}</span>
                            <span className="text-amber-400 font-normal">→ {notified.assignedJudge}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {notified.claimantName} vs {notified.respondentName}
                          </div>
                          <div className="text-[9px] font-mono text-emerald-400 font-bold">
                            📅 AssignedAt: {notified.assignedAt ? new Date(notified.assignedAt).toLocaleString() : 'Just now'} ({notified.assignedBy || 'KTAS'})
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDocketId(notified.id);
                              setActiveWorkflowTab('dockets');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                          >
                            Banee Ilaali
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeNotification(notified.id)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                            title="Acknowledge Notification"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left Column: Docket Selection List */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400 px-1 flex items-center justify-between">
                <span>{currentLang === 'om' ? 'Tarree Galmeewwan Banamaa (Dockets List)' : 'Active Case Dockets'}</span>
                <span className="text-[10px] text-amber-400 font-mono">Filter: {docketFilterMode}</span>
              </h4>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {dockets
                  .filter(doc => {
                    if (docketFilterMode === 'notified_judge') return doc.isJudgeNotified;
                    if (docketFilterMode === 'ex_parte') return doc.isExParte;
                    if (docketFilterMode === 'non_served') return doc.firstSummonsStatus === 'not_served_absent';
                    return true;
                  })
                  .map(doc => {
                    const isSel = doc.id === selectedDocketId;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocketId(doc.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                          isSel
                            ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-amber-400">{doc.caseNumber}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            doc.isExParte 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : doc.hasPreliminaryObjection 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {doc.isExParte ? '👤 Garee 1 Qofa' : doc.hasPreliminaryObjection ? 'Mormii 1ffaa' : 'Normal Lifecycle'}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-white truncate">{doc.claimantName} vs {doc.respondentName}</div>
                        <div className="text-[11px] text-slate-400 truncate">{doc.claimSubject}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <div className="flex flex-col">
                            <span className="truncate max-w-[120px]">⚖️ {doc.assignedJudge}</span>
                            <span className="text-amber-300 font-bold truncate max-w-[120px]">{doc.bench}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAuditModalDocket(doc);
                              }}
                              className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] border border-amber-500/30 transition-all cursor-pointer shadow-sm flex items-center gap-1"
                              title="Audit Case Logic"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>Audit</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedQrCase(doc);
                              }}
                              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500 text-slate-400 hover:text-amber-400 transition-all cursor-pointer shadow-sm"
                              title={currentLang === 'om' ? 'QR Galmee Gumiitiif Qopheessi' : 'Generate Court Entry QR'}
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right Column: Detailed Selected Docket Workflow Tracker */}
            {selectedDocket && (
              <div className="md:col-span-2 space-y-4 bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-amber-400 font-bold">Lakk. Galmee: {selectedDocket.caseNumber}</span>
                      {selectedDocket.isExParte && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          👤 Ex-Parte / Garee 1 Qofa
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {selectedDocket.claimantName} <span className="text-amber-400 text-xs font-mono">VS</span> {selectedDocket.respondentName}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                      {selectedDocket.courtLevel.toUpperCase()} • {selectedDocket.bench}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAuditModalDocket(selectedDocket)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5 border border-amber-300/50 hover:scale-[1.02]"
                      title="Trigger Procedural and Statutory Logic Audit for Selected Case"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-950" />
                      <span>{currentLang === 'om' ? 'Audit Case Logic' : currentLang === 'am' ? 'የሕግ ኦዲት አድርግ' : 'Audit Case Logic'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedQrCase(selectedDocket)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500 text-slate-400 hover:text-amber-400 transition-all cursor-pointer shadow-lg"
                      title={currentLang === 'om' ? 'QR Galmee Gumiitiif Qopheessi' : 'Generate Court Entry QR'}
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sinqee Bank Payment Verification (Dambii Lakk. 08) Banner */}
                <div className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                  selectedDocket.paymentStatus === 'verified'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : selectedDocket.paymentStatus === 'rejected'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">🏦 KAFFALTII ABBAA SEERUMMAA BAANKII SINQEE (Dambii Lakk. 08)</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          selectedDocket.paymentStatus === 'verified'
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                            : selectedDocket.paymentStatus === 'rejected'
                            ? 'bg-rose-500/30 text-rose-300 border border-rose-400'
                            : 'bg-amber-500/30 text-amber-300 border border-amber-400 animate-pulse'
                        }`}>
                          {selectedDocket.paymentStatus === 'verified' 
                            ? '✅ Verified / Mirkanaa\'e' 
                            : selectedDocket.paymentStatus === 'rejected'
                            ? '🚨 Rejected / Kufaa Ta\'e'
                            : '⏳ Pending / Eegaa Jira'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono">
                        Lakk. Nagahee Sinqee: <span className="font-bold text-white">{selectedDocket.sinqeeReceiptNo || 'SNQ-2026-PENDING'}</span>
                      </div>
                      {selectedDocket.paymentStatus === 'rejected' && selectedDocket.paymentRejectionReason && (
                        <p className="text-rose-300 font-semibold text-[11px]">
                          Sababa Kufaa Ta'eef: {selectedDocket.paymentRejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {selectedDocket.paymentStatus !== 'verified' && (
                        <button
                          type="button"
                          onClick={() => handleVerifySinglePayment(selectedDocket.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mirkaneessi (Verify)</span>
                        </button>
                      )}
                      {selectedDocket.paymentStatus !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt('Sababa kaffaltiin Baankii Sinqee kufaa ta\'eef ibsi:', selectedDocket.paymentRejectionReason || 'Nagaheen Baankii Sinqee Dambii Lakk. 08 unkaa guutuu hin qabu.');
                            if (reason) handleRejectPaymentAction(selectedDocket.id, reason);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 border border-rose-500/40 font-bold text-xs cursor-pointer transition-all"
                        >
                          Kufaa Taasisi (Reject)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Non-Served 1st Summons Bench Order Prompt for Judges */}
                {selectedDocket.firstSummonsStatus === 'not_served_absent' && (
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/50 text-xs text-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-purple-400" />
                        <span>AJAJA WAAMICHA DHADDACHAA (COURT SUMMONS ORDER) REQUIRED</span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-400">SDFHH Kwt 105</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Himatamaan sababa waamichi 1ffaan teessoon hin argamneef deebii hin dhiheessine. Abbaan Seeraa ajaja waamicha 2ffaa dhaddachaatiin akka himatamaan deebii dhiheessatuuf baasuu ni danda'a.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveWorkflowTab('second_summons_generator')}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>✉️ Waamicha 2ffaa Ajaja Dhaddachaatiin Baasi</span>
                    </button>
                  </div>
                )}

                {/* Ex-Parte Application Informative Banner */}
                {selectedDocket.isExParte && (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-200 space-y-2">
                    <div className="font-bold text-emerald-300 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>DHIMMA GAREE 1 QOFA (EX-PARTE PETITION - {selectedDocket.exParteCategory?.toUpperCase()})</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Dhimmi kun iyyata dhuunfaa (fkn. Dhaala, Guddifacha/Da'iimman Eeguu, Jijjiirraa Maqaa) waan ta'eef garee wal falmii 2ffaa hin qabu. Waamichi himatamaa hin barbaachisu; Abbaan Seeraa dhiyeessa iyyata abbaa dhimmaa qoratee ajaja dhaddachaa ni laata.
                    </p>
                  </div>
                )}

                {/* Workflow Stepper Diagram for this Specific Docket */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-amber-400" />
                    <span>{currentLang === 'om' ? 'Tartiiba Adeemsa Seera Deemsa Falmii Galmee Kanaa:' : 'Civil Procedure Lifecycle Diagram:'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px]">
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-medium">
                      <div className="font-bold text-xs">1. Intake & Plaint</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ofiisara Seeraatiin</div>
                    </div>

                    <div className={`p-2.5 rounded-lg border font-medium ${
                      selectedDocket.hasPreliminaryObjection
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <div className="font-bold text-xs">2. Mormii 1ffaa</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">SDFHH Kwt. 244</div>
                    </div>

                    <div className={`p-2.5 rounded-lg border font-medium ${
                      selectedDocket.currentStage === 'plaintiff_reply_hearing'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 animate-pulse'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <div className="font-bold text-xs">3. Yaada Himataa</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Beellama Caqasuu</div>
                    </div>

                    <div className={`p-2.5 rounded-lg border font-medium ${
                      selectedDocket.currentStage === 'second_summons'
                        ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <div className="font-bold text-xs">4. Waamicha 2ffaa</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ajaja Dhaddachaa</div>
                    </div>
                  </div>
                </div>

                {/* Docket Details Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] font-mono uppercase">Himataa / Iyyataa:</span>
                    <div className="font-bold text-white">{selectedDocket.claimantName}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] font-mono uppercase">Himatamaa / Garee 2ffaa:</span>
                    <div className="font-bold text-white">{selectedDocket.respondentName}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] font-mono uppercase">Abbaa Seeraa Ramadame (Notified Judge):</span>
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <span>{selectedDocket.assignedJudge}</span>
                      {selectedDocket.isJudgeNotified && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                          🔔 Notified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] font-mono uppercase">Beellama Innii Boodaa (Next Hearing):</span>
                    <div className="font-bold text-emerald-400 font-mono">{selectedDocket.nextHearingDate || 'Not Scheduled'}</div>
                  </div>
                </div>

                {/* Notes & Actions Bar */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                  <span className="font-bold text-amber-300 block">Qabxii Galmee & Adeemsa Seeraa (Case Notes):</span>
                  <p className="text-slate-300 leading-relaxed">{selectedDocket.notes}</p>
                </div>

                {/* Quick Action Triggers for this Docket */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setActiveWorkflowTab('preliminary_handler')}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mormii Sadarkaa Duraa Galmeessi</span>
                  </button>

                  <button
                    onClick={() => setActiveWorkflowTab('second_summons_generator')}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-purple-400" />
                    <span>Waamicha 2ffaa Baasi</span>
                  </button>

                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>🚀 Transfeera Galmee & Ol'iyyannoo (Inter-Court Transfer)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW: PENDING ASSIGNMENT DESK (KTAS Coordinator Case Assignment to Judge) */}
      {activeWorkflowTab === 'pending_assignment' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200">
          {/* Header with Title and Automated Deadline Scanning Hub */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-lg">
                📋
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-serif-legal flex items-center gap-2">
                  <span>{currentLang === 'om' ? 'Kutaa Qindeessaa Galmee (KTAS) - Ramaddii Abbaa Seeraa' : 'Court Coordinator (KTAS) Judge Assignment Desk'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                    Bulk Action Active
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  {currentLang === 'om'
                    ? 'Galmeewwan banamanii ramaddii eegaa jiran checkbox dhaan filachuun Abbaa Seeraa tokkotti gamtaan (bulk) ramadi. Firestore batch update ta\'ee notification qindaa\'aan ni ergama.'
                    : 'Select multiple pending cases via checkboxes and assign to a single judge in one click. Updates Firestore batch & dispatches consolidated notification.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Automated 24h Deadline Scanner Button */}
              <button
                type="button"
                onClick={handleTriggerDeadlineScanner}
                disabled={isCheckingDeadlines}
                className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                title="Scan for hearings scheduled in next 24 hours and push alerts"
              >
                <Clock className={`w-3.5 h-3.5 text-purple-400 ${isCheckingDeadlines ? 'animate-spin' : ''}`} />
                <span>{isCheckingDeadlines ? 'Qorachaa jira...' : '⏰ To\'adhu Beellama 24h'}</span>
              </button>

              {/* Browser Push Permission Toggle */}
              <button
                type="button"
                onClick={handleEnablePushNotifications}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  browserPushEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Enable browser notifications for hearing sessions"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>{browserPushEnabled ? '🔔 Push: ON' : '🔔 Push: Eeyyami'}</span>
              </button>

              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold shrink-0">
                {dockets.filter(d => d.assignedJudge === 'Pending Assignment' || !d.assignedJudge).length} Pending Cases
              </span>
            </div>
          </div>

          {/* Consolidated Success Banner */}
          {bulkAssignSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-3 shadow-lg animate-in fade-in duration-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="font-extrabold text-sm">{currentLang === 'om' ? 'Ramaddiin Gamtaa Milkaa\'inaan Xumurameera!' : 'Bulk Assignment Successful!'}</div>
                <div className="text-[11px] text-emerald-300 font-mono mt-0.5">{bulkAssignSuccessMsg}</div>
              </div>
            </div>
          )}

          {assignSuccessMsg && (
            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{assignSuccessMsg}</span>
            </div>
          )}

          {/* Automated 24-Hour Hearing Deadlines Alert Banner */}
          {courtNotifications.some(n => n.type === 'deadline_alert_24h' && !n.isRead) && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300 flex items-center gap-2">
                  <span className="text-base">🚨</span>
                  <span>AKEKKACHIISA BEELLAMA DHADDACHAA SA'AATII 24 (24-HOUR DEADLINE ALERTS)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold">
                  {courtNotifications.filter(n => n.type === 'deadline_alert_24h' && !n.isRead).length} Urgent
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {courtNotifications
                  .filter(n => n.type === 'deadline_alert_24h' && !n.isRead)
                  .slice(0, 3)
                  .map(notif => (
                    <div key={notif.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-white text-[11px]">{notif.title}</div>
                        <div className="text-slate-300 text-[10px]">{notif.body}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-bold cursor-pointer"
                      >
                        ✓ Hubadhe
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* CHECKBOX-BASED BULK ACTION TOOLBAR */}
          {dockets.filter(d => d.assignedJudge === 'Pending Assignment' || !d.assignedJudge).length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Select All Checkbox Control */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={
                        selectedPendingCaseIds.length === dockets.filter(d => d.assignedJudge === 'Pending Assignment' || !d.assignedJudge).length &&
                        dockets.filter(d => d.assignedJudge === 'Pending Assignment' || !d.assignedJudge).length > 0
                      }
                      onChange={handleToggleSelectAllPending}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-amber-400 cursor-pointer"
                    />
                    <span>
                      {selectedPendingCaseIds.length === dockets.filter(d => d.assignedJudge === 'Pending Assignment' || !d.assignedJudge).length && selectedPendingCaseIds.length > 0
                        ? (currentLang === 'om' ? 'Hunda Filadhu (Select All Active)' : 'Deselect All')
                        : (currentLang === 'om' ? 'Hunda Filadhu (Select All)' : 'Select All')}
                    </span>
                  </label>

                  <span className="text-[11px] text-slate-400 font-mono">
                    ({selectedPendingCaseIds.length} / {dockets.filter(d => d.assignedJudge === 'Pending Assignment' || !d.assignedJudge).length} {currentLang === 'om' ? 'filataman' : 'selected'})
                  </span>
                </div>

                {/* Bulk Actions Controls when at least 1 case selected */}
                {selectedPendingCaseIds.length > 0 ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 whitespace-nowrap">
                        {currentLang === 'om' ? 'Abbaa Seeraa:' : 'Assign To:'}
                      </span>
                      <select
                        value={bulkTargetJudge}
                        onChange={e => setBulkTargetJudge(e.target.value)}
                        className="bg-slate-950 border border-amber-500/60 rounded-xl px-3 py-1.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400"
                      >
                        <option value="Abbaa Seeraa Caalaa">Abbaa Seeraa Caalaa (Dhaddacha Hariiroo Hawaasaa)</option>
                        <option value="Abbaa Seeraa Geetaachoo Toleeraa">Abbaa Seeraa Geetaachoo Toleeraa (Dhaddacha Maatii/Dhaala)</option>
                        <option value="Abbaa Seeraa Galaanaa Waaqoo">Abbaa Seeraa Galaanaa Waaqoo (Dhaddacha Hojii/Daldalaa)</option>
                        <option value="Abbaa Seeraa Caaltuu Balchaa">Abbaa Seeraa Caaltuu Balchaa (Dhaddacha Yakkaa)</option>
                        <option value="Abbaa Seeraa Dr. Caalaa Tasfaayee">Abbaa Seeraa Dr. Caalaa Tasfaayee (Dhaddacha Ijibbaataa)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBulkAssigning}
                        onClick={handleBulkAssignCasesToJudge}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Gavel className="w-4 h-4" />
                        <span>
                          {isBulkAssigning 
                            ? 'Ramadaa jira...' 
                            : currentLang === 'om'
                            ? `⚡ Ramadi Gamtaan (${selectedPendingCaseIds.length} Galmeewwan)`
                            : `⚡ Bulk Assign (${selectedPendingCaseIds.length} Cases)`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPendingCaseIds([])}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                        title="Clear Selection"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    {currentLang === 'om' 
                      ? '💡 Galmeewwan ramaduu barbaaddu tokkoo tokkoon ykn gamtaan filadhu.' 
                      : '💡 Tick checkboxes to select multiple cases for single-click bulk assignment.'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pending Cases Cards Grid with Individual Checkboxes */}
          <div className="space-y-3">
            {dockets.filter(d => d.assignedJudge === 'Pending Assignment' || !d.assignedJudge).length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="font-bold text-white">Galmeen ramaddii eegu kamiyyuu hin jiru!</div>
                <p className="text-slate-500">Galmeewwan hundi Abbaa Seeraatti ramadamaniiru.</p>
              </div>
            ) : (
              dockets
                .filter(d => d.assignedJudge === 'Pending Assignment' || !d.assignedJudge)
                .map(pendingCase => {
                  const isChecked = selectedPendingCaseIds.includes(pendingCase.id);
                  return (
                    <div
                      key={pendingCase.id}
                      className={`p-5 rounded-2xl transition-all shadow-md space-y-3 border ${
                        isChecked 
                          ? 'bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/40 shadow-amber-500/10' 
                          : 'bg-slate-900 border-amber-500/30 hover:border-amber-500/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                        {/* Checkbox & Case Number */}
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectPendingCase(pendingCase.id)}
                            className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-amber-400 cursor-pointer"
                          />
                          <span className="font-mono text-xs font-bold text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-amber-500/30">
                            {pendingCase.caseNumber}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                            ⏳ Pending Assignment
                          </span>
                          {pendingCase.isExParte && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              👤 Ex-Parte
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-slate-400">
                          Baniinsa: {pendingCase.filingDate} • Ofiisara: {pendingCase.assignedOfficer}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 text-[10px] font-mono uppercase block">Wal Falmitoota (Parties):</span>
                          <div className="font-bold text-white">{pendingCase.claimantName} <span className="text-amber-400 text-xs font-mono">VS</span> {pendingCase.respondentName}</div>
                        </div>

                        <div>
                          <span className="text-slate-500 text-[10px] font-mono uppercase block">Dhimma & Dhaddacha:</span>
                          <div className="font-bold text-slate-200">{pendingCase.claimSubject} ({pendingCase.bench})</div>
                        </div>
                      </div>

                      {/* KTAS Coordinator Assign Button (Opens Modal) */}
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 pt-2">
                        <div className="flex-1">
                          <p className="text-[11px] text-slate-400">
                            {currentLang === 'om' 
                              ? 'Galmee kanaaf Abbaa Seeraa ramaduuf "Assign" cuqaasaa.' 
                              : 'Click "Assign" to select and notify a judge for this case.'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAssignmentModalDoc(pendingCase)}
                          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>{currentLang === 'om' ? 'Abbaa Seeraa Ramadi (Assign)' : 'Assign Judge'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW: BENCH ASSIGNMENT DESK (Iddoo Ramaddii Dhaddachaa Abbootii Seeraa) */}
      {activeWorkflowTab === 'bench_assignment' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-xl">
                🏛️
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-serif-legal flex items-center gap-2">
                  <span>{currentLang === 'om' ? 'Kutaa Ramaddii Dhaddachaa Abbootii Seeraa' : 'Judicial Bench Allocation & Assignment Desk'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono">
                    Prior Bench Mandate
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  {currentLang === 'om'
                    ? 'Hojiin mana murtii kan eegalamu ofiisara seeraatiin galmeen banamee dhaddachatti qajeelchuun waan ta\'eef, saniin dura abbootiin seeraa fi ogeessonni seeraa dhaddacha isaaniitti ramadamuufi qabu.'
                    : 'Prior to case filing and direction, judges and court personnel must be allocated to their respective benches.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                {courtUsersList.filter(u => u.role === 'judge').length} Abbootii Seeraa
              </span>
            </div>
          </div>

          {/* Feedback Message */}
          {benchAssignmentMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{benchAssignmentMsg}</span>
            </div>
          )}

          {/* Bench Distribution Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { id: 'all', name: 'Hunda (All)', count: courtUsersList.length, color: 'border-slate-800' },
              { id: 'civil', name: 'Hariiroo Hawaasaa', filterTerm: 'Hariiroo Hawaasaa', count: courtUsersList.filter(u => u.bench?.includes('Hariiroo Hawaasaa')).length, color: 'border-blue-500/40' },
              { id: 'criminal', name: 'Dhaddacha Yakkaa', filterTerm: 'Yakkaa', count: courtUsersList.filter(u => u.bench?.includes('Yakkaa')).length, color: 'border-rose-500/40' },
              { id: 'family', name: 'Maatii fi Dhaala', filterTerm: 'Maatii', count: courtUsersList.filter(u => u.bench?.includes('Maatii')).length, color: 'border-purple-500/40' },
              { id: 'commerce', name: 'Hojii fi Daldalaa', filterTerm: 'Daldala', count: courtUsersList.filter(u => u.bench?.includes('Daldala') || u.bench?.includes('Hojii')).length, color: 'border-amber-500/40' },
              { id: 'cassation', name: 'Dhaddacha Ijibbaataa', filterTerm: 'Ijibbaata', count: courtUsersList.filter(u => u.bench?.includes('Ijibbaata')).length, color: 'border-emerald-500/40' },
            ].map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBenchFilter(b.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  benchFilter === b.id 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/40 shadow' 
                    : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 ' + b.color
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400 truncate">{b.name}</div>
                <div className="text-lg font-bold text-white mt-1 font-mono">{b.count} <span className="text-[10px] font-normal text-slate-400">staff</span></div>
              </button>
            ))}
          </div>

          {/* Roster of Judges & Officers with Bench Assignment Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h5 className="text-xs font-mono font-bold uppercase text-slate-400">
                Tarree Abbootii Seeraa & Dhaddacha Ramadaman (Judicial Roster & Benches)
              </h5>
              <span className="text-[11px] text-amber-400 font-mono">
                {courtUsersList.filter(u => {
                  if (benchFilter === 'all') return true;
                  if (benchFilter === 'civil') return u.bench?.includes('Hariiroo Hawaasaa');
                  if (benchFilter === 'criminal') return u.bench?.includes('Yakkaa');
                  if (benchFilter === 'family') return u.bench?.includes('Maatii');
                  if (benchFilter === 'commerce') return u.bench?.includes('Daldala') || u.bench?.includes('Hojii');
                  if (benchFilter === 'cassation') return u.bench?.includes('Ijibbaata');
                  return true;
                }).length} Roster Members
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {courtUsersList
                .filter(u => {
                  if (benchFilter === 'all') return true;
                  if (benchFilter === 'civil') return u.bench?.includes('Hariiroo Hawaasaa');
                  if (benchFilter === 'criminal') return u.bench?.includes('Yakkaa');
                  if (benchFilter === 'family') return u.bench?.includes('Maatii');
                  if (benchFilter === 'commerce') return u.bench?.includes('Daldala') || u.bench?.includes('Hojii');
                  if (benchFilter === 'cassation') return u.bench?.includes('Ijibbaata');
                  return true;
                })
                .map(courtUser => (
                  <div
                    key={courtUser.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all space-y-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm font-bold">
                          {courtUser.role === 'judge' ? '⚖️' : '📜'}
                        </span>
                        <div>
                          <div className="font-bold text-white text-xs">{courtUser.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{courtUser.usernameOrEmail}</div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        courtUser.role === 'judge' 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {courtUser.role}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Dhaddacha Ammaa:</span>
                        <span className="font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-amber-500/30">
                          🏛️ {courtUser.bench}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Sadarkaa Mana Murtii:</span>
                        <span className="font-mono text-slate-300">{courtUser.assignedCourtLevel || 'first_instance'}</span>
                      </div>
                      {courtUser.licenseNumber && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">ID / License:</span>
                          <span className="font-mono text-slate-400">{courtUser.licenseNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setReassignModalUser(courtUser);
                          setSelectedNewBench(courtUser.bench);
                          setSelectedNewLevel(courtUser.assignedCourtLevel || 'first_instance');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dhaddacha Jijjiiri / Reassign</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Reassignment Modal */}
          {reassignModalUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-lg">
                      🏛️
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-serif-legal">
                        Ramaddii Dhaddachaa Jijjiiri (Reassign Bench)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {reassignModalUser.fullName} ({reassignModalUser.role})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReassignModalUser(null)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveBenchAssignment} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Dhaddacha Haaraa Filadhu (Select Target Bench) *</label>
                    <select
                      value={selectedNewBench}
                      onChange={e => setSelectedNewBench(e.target.value)}
                      className="w-full bg-slate-950 border border-amber-500/60 rounded-xl p-3 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400"
                    >
                      <option value="Dhaddacha Hariiroo Hawaasaa (Civil Bench)">Dhaddacha Hariiroo Hawaasaa (Civil Bench)</option>
                      <option value="Dhaddacha Yakkaa (Criminal Bench)">Dhaddacha Yakkaa (Criminal Bench)</option>
                      <option value="Dhaddacha Maatii fi Dhaala (Family & Succession)">Dhaddacha Maatii fi Dhaala (Family & Succession)</option>
                      <option value="Dhaddacha Hojii fi Daldalaa (Commercial & Labor)">Dhaddacha Hojii fi Daldalaa (Commercial & Labor)</option>
                      <option value="Dhaddacha Lafaafi Qabeenya Dhaabbataa (Land & Real Estate)">Dhaddacha Lafaafi Qabeenya Dhaabbataa (Land & Real Estate)</option>
                      <option value="Dhaddacha Bulchiinsaa (Administrative Bench)">Dhaddacha Bulchiinsaa (Administrative Bench)</option>
                      <option value="Dhaddacha Ijibbaataa (Cassation Bench)">Dhaddacha Ijibbaataa (Cassation Bench)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Sadarkaa Mana Murtii (Court Level) *</label>
                    <select
                      value={selectedNewLevel}
                      onChange={e => setSelectedNewLevel(e.target.value as CourtLevelType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="first_instance">Mana Murtii Aanaa / Sadarkaa Jalqabaa (First Instance)</option>
                      <option value="high_court">Mana Murtii Ol'aanaa (High Court)</option>
                      <option value="supreme_court">Mana Murtii Waliigalaa (Supreme Court)</option>
                      <option value="cassation">Dhaddacha Ijibbaataa (Cassation)</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                    💡 Ramaddiin kun Firestore irratti galmaa'ee audit log keessatti ni kuufama. Yeroo himannaan banamu abbaan seeraa kun dhaddacha kana jalatti filatama.
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setReassignModalUser(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                    >
                      Dhiisi
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingBenchAssignment}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSavingBenchAssignment ? 'Galmeessaa jira...' : 'Ramaddii Mirkaneessi'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: NEW INTAKE DESK (Kutaa Ofiisara Seeraa / Case Coordinator) */}
      {activeWorkflowTab === 'new_intake' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <FilePlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-serif-legal">
                  {currentLang === 'om' ? 'Kutaa Ofiisara Seeraa - Banama Galmee & Qajeelcha Dhaddachaa' : 'Legal Officer Desk - Case Intake & Bench Direction'}
                </h4>
                <p className="text-xs text-slate-400">
                  {currentLang === 'om'
                    ? 'Hojiin mana murtii kan eegalamu kutaa ofiisara seeraatiin galmeen banamee dhaddachatti qajeelchuun yemmuu ta\'u, ofisara seeraa fi abbaa seeraa user hayyamameef qofatu dhimma banuu danda\'a.'
                    : 'Court proceedings start at Legal Officer intake where cases are registered and directed to benches by authorized personnel only.'}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setActiveWorkflowTab('bench_assignment')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Manage prior Bench Assignment for Judges"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>🏛️ Ramaddii Dhaddachaa Ilaali</span>
            </button>
          </div>

          {/* Authorization Enforcement Banner */}
          {isOfficerAuthorized ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-lg">
                  ⚖️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{authorizedOfficerName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      ✓ Eeyyamameera / Verified Officer
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                    {authorizedOfficerRole} • {authorizedCourtName}
                  </div>
                </div>
              </div>
              <div className="text-right text-[10px] font-mono text-emerald-400 shrink-0">
                <div>Iddoo Seensaa: Kutaa Ofiisara Seeraa</div>
                <div>SDFHH Kwt 80-244</div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>USER HAYYAMAMEEF QOFA: EEYYAMA OFIISARA SEERAA BARBAADA</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Hojiin mana murtii kan eegalamu kutaa ofiisara seeraatiin galmeen banamee dhaddachatti qajeelchuun waan ta'eef, ofisara seeraa fi abbaa seeraa user hayyamameef qofatu dhimma haaraa banuu danda'a.
              </p>
            </div>
          )}

          {intakeSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{intakeSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegisterNewIntake} className="space-y-4">
            {/* Ex-Parte Toggle Checkbox */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-amber-300 text-xs">👤 Dhimma Garee 1 Qofa (Ex-Parte / Single Party Application)</div>
                <div className="text-[10px] text-slate-400">Dhimma wal-falmii garee 2ffaa hin qabne (fkn. Dhaalamtummaa, Guddifacha, Maqaa Jijjiirraa, Ajaja Dhorkaa Dhuunfaa).</div>
              </div>
              <input
                type="checkbox"
                checked={isExParte}
                onChange={e => setIsExParte(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950 cursor-pointer"
              />
            </div>

            {/* If Ex-Parte is selected, show Category Selection */}
            {isExParte && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <label className="block text-xs font-bold text-emerald-300">Gosa Iyyata Dhuunfaa (Ex-Parte Category) *</label>
                <select
                  value={exParteCategory}
                  onChange={e => setExParteCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="probate">Waraqaa Ragaa Dhaalamtummaa (Succession/Probate Certificate)</option>
                  <option value="guardianship">Guddifacha / Da'iimman Eeguu (Guardianship Order)</option>
                  <option value="name_change">Maqaa Jijjiirraa (Name Change Petition)</option>
                  <option value="injunction_exparte">Ajaja Dhorkaa Dhuunfaa (Ex-Parte Injunction)</option>
                  <option value="other">Iyyata Dhuunfaa Biroo (Other Ex-Parte Petition)</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Maqaa Himataa / Iyyataa (Claimant / Petitioner) *</label>
                <input
                  type="text"
                  value={newClaimant}
                  onChange={e => setNewClaimant(e.target.value)}
                  placeholder="fkn. Obbo Tolaa Dabalaa"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Maqaa Himatamaa {isExParte && '(Disabled - Ex-Parte Application)'}
                </label>
                <input
                  type="text"
                  value={isExParte ? 'N/A - Iyyata Dhuunfaa (Ex-Parte)' : newRespondent}
                  onChange={e => setNewRespondent(e.target.value)}
                  disabled={isExParte}
                  placeholder="fkn. Adde Birratuu Fayyisaa"
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none ${
                    isExParte
                      ? 'bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-900 border-slate-800 text-white focus:border-amber-500'
                  }`}
                  required={!isExParte}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sadarkaa Mana Murtii (Court Level) *</label>
                <select
                  value={newCourtLevel}
                  onChange={e => setNewCourtLevel(e.target.value as CourtLevelType)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="first_instance">Mana Murtii Aanaa (First Instance)</option>
                  <option value="high_court">Mana Murtii Olaanaa (High Court)</option>
                  <option value="supreme_court">Mana Murtii Waliigalaa (Supreme Court)</option>
                  <option value="cassation">Dhaddacha Ijibbaataa (Cassation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dhimma Himannaa / Iyyata (Claim Particulars) *</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder={isExParte ? 'fkn. Iyyata Waraqaa Ragaa Dhaala Qabeenyaa Kaffaluu' : 'fkn. Falmii Waliigaltee Bittaa fi Gurgurtaa Manaa'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dhaddacha Qajeelfamu (Target Bench) *</label>
                <select
                  value={newBench}
                  onChange={e => {
                    const chosenBench = e.target.value;
                    setNewBench(chosenBench);
                    // Dynamically suggest a judge allocated to this bench
                    const benchJudges = courtUsersList.filter(
                      u => u.role === 'judge' && u.status === 'active' && u.bench?.toLowerCase().includes(chosenBench.toLowerCase().slice(0, 10))
                    );
                    if (benchJudges.length > 0) {
                      setNewAssignedJudge(benchJudges[0].fullName);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Dhaddacha Hariiroo Hawaasaa">Dhaddacha Hariiroo Hawaasaa (Civil Bench)</option>
                  <option value="Dhaddacha Yakkaa">Dhaddacha Yakkaa (Criminal Bench)</option>
                  <option value="Dhaddacha Maatii fi Dhaala">Dhaddacha Maatii fi Dhaala (Family & Succession)</option>
                  <option value="Dhaddacha Hojii fi Daldalaa">Dhaddacha Hojii fi Daldalaa (Commercial & Labor)</option>
                  <option value="Dhaddacha Lafaafi Qabeenya Dhaabbataa">Dhaddacha Lafaafi Qabeenya Dhaabbataa (Land)</option>
                  <option value="Dhaddacha Bulchiinsaa">Dhaddacha Bulchiinsaa (Administrative)</option>
                  <option value="Dhaddacha Ijibbaataa">Dhaddacha Ijibbaataa (Cassation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-300 mb-1 font-bold">
                  Abbaa Seeraa Ramadame (Notify / Assign) *
                </label>
                <select
                  value={newAssignedJudge}
                  onChange={e => setNewAssignedJudge(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value="Pending Assignment">⏳ Ramaddii KTAS Eegaa (Assign Later via Pending Desk)</option>
                  {/* Show judges assigned specifically to this bench first */}
                  {courtUsersList
                    .filter(u => u.role === 'judge' && u.status === 'active')
                    .map(judge => {
                      const isBenchMatch = judge.bench?.toLowerCase().includes(newBench.toLowerCase().slice(0, 10));
                      return (
                        <option key={judge.id} value={judge.fullName}>
                          {isBenchMatch ? `🏛️ ${judge.fullName} (${judge.bench}) [Bench Match]` : `${judge.fullName} (${judge.bench})`}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-400 mb-1 font-bold">Beellama Deebii / Qorannoo *</label>
                <input
                  type="date"
                  value={newFirstHearingDate}
                  onChange={e => setNewFirstHearingDate(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Yaada Ofiisara Seeraa (Registrar Notes)</label>
              <textarea
                rows={2}
                value={newClaimNotes}
                onChange={e => setNewClaimNotes(e.target.value)}
                placeholder="Ragaaleen dhiyaatan guutuu ta'uu isaanii fi kaffaltii abbaa seerummaa Baankii Sinqee..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={!isOfficerAuthorized}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>
                {newAssignedJudge === 'Pending Assignment'
                  ? 'Galmee Haaraa Banee Gara Dhaddachaatti Qajeelchi (KTAS Desk Assigns)'
                  : `Galmee Haaraa Banee Dhaddachaatti Qajeelchi & Abbaa Seeraa (${newAssignedJudge}) NOTIFY GODHI`}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* SUB-VIEW 3: PRELIMINARY OBJECTIONS HANDLER (Mormii Sadarkaa Duraa - SDFHH Kwt 244) */}
      {activeWorkflowTab === 'preliminary_handler' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Mormii Sadarkaa Duraa & Yaada Himataa Caqasuu</h4>
              <p className="text-xs text-slate-400">
                Deebii himatamaa keessatti mormiin sadarkaa duraa (SDFHH Kwt 244) dhiyaachuun yaada himataa caqasuuf beellama qabuu.
              </p>
            </div>
          </div>

          {poSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{poSuccessMsg}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 text-xs space-y-1">
            <span className="text-amber-400 font-bold">Galmee Filatame:</span>
            <div className="text-white font-bold text-sm">{selectedDocket.caseNumber} - {selectedDocket.claimantName} vs {selectedDocket.respondentName}</div>
          </div>

          <form onSubmit={handleRecordPreliminaryObjection} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Gosa Mormii Sadarkaa Duraa (SDFHH Keeyyata 244)</label>
              <select
                value={poReason}
                onChange={e => setPoReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Statute of Limitations (SDFHH Kwt 244(1)(a) - Darbiinsa Yeroo)">Statute of Limitations (SDFHH Kwt 244 - Darbiinsa Yeroo)</option>
                <option value="Lack of Jurisdiction (SDFHH Kwt 244 - Aangoo Mana Murtii Dhabuu)">Lack of Jurisdiction (Aangoo Mana Murtii Dhabuu)</option>
                <option value="Res Judicata (SDFHH Kwt 244 - Murtii Duraan Kenname)">Res Judicata (Dhimma Murtii Argate)</option>
                <option value="Lack of Locus Standi (SDFHH Kwt 244 - Mirga Himannaa Dhabuu)">Lack of Locus Standi (Mirga Himannaa Dhabuu)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-amber-400 mb-1 font-bold">Beellama Yaada Himataa Caqasuu (Hearing Date for Plaintiff Reply) *</label>
              <input
                type="date"
                value={poPlaintiffHearingDate}
                onChange={e => setPoPlaintiffHearingDate(e.target.value)}
                className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gavel className="w-4 h-4" />
              <span>Mormii Sadarkaa Duraa Galmeessi & Beellama Yaada Himataatiif Qabi</span>
            </button>
          </form>
        </div>
      )}

      {/* SUB-VIEW 4: SECOND SUMMONS & COURT ORDER GENERATOR (Waamicha 2ffaa Ajaja Dhaddachaatiin) */}
      {activeWorkflowTab === 'second_summons_generator' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Waamicha 2ffaa & Ajaja Dhaddachaa Baasuu</h4>
              <p className="text-xs text-slate-400">
                Himatamaan waamichi jalqabaa sababa hin qaqqabneef hin dhihaatin yoo ta'e, ajaja dhaddachaatiin waamicha 2ffaa baasuu.
              </p>
            </div>
          </div>

          {summons2SuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{summons2SuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleIssueSecondSummons} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Lakkoofsa Bahii Waamicha 2ffaa (Ref No)</label>
                <input
                  type="text"
                  value={summons2RefNo}
                  onChange={e => setSummons2RefNo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-400 mb-1 font-bold">Beellama Haaraa Waamicha 2ffaa *</label>
                <input
                  type="date"
                  value={summons2NewDate}
                  onChange={e => setSummons2NewDate(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sababa Waamicha 2ffaa (Court Order Rationale)</label>
              <textarea
                rows={2}
                value={summons2Reason}
                onChange={e => setSummons2Reason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Waamicha 2ffaa Ajaja Dhaddachaatiin Baasi & Beellama Haaraa Qabi</span>
            </button>
          </form>

          {/* Official Preview Letter for 2nd Summons */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-purple-300">WIXINEE XALAYAA WAAMICHA 2FFAA (PREVIEW)</span>
              <span className="text-[10px] font-mono text-slate-400">Ref: {summons2RefNo}</span>
            </div>

            <div className="text-xs font-serif text-slate-200 leading-relaxed space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-center font-bold text-amber-400">
                MANA MURTII AANAA ADAAMAA - DHADDACHA HARIIROO HAWAASAA
              </div>
              <p>
                <strong>Gara Himatamaa:</strong> {selectedDocket.respondentName}
              </p>
              <p>
                Himataan {selectedDocket.claimantName} Lakk. Galmee {selectedDocket.caseNumber} dhaan dhimma {selectedDocket.claimSubject} irratti himannaa isinii irratti dhiyeessanii waamichi 1ffaan isin qaqqabuu waan hin dandeenyeef, ajaja dhaddachaatiin waamichi 2ffaan kun isiniif ergameera.
              </p>
              <p className="text-amber-300 font-bold">
                Guyyaa Beellamaa: {summons2NewDate} saa'a 3:00 irratti dhaddacha Mana Murtii Aanaa Adaamaatti qaamaan ykn abukaattoo seeraatiin akka dhihaattan ajajamtaniirtu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: STATEMENT OF DEFENSE INTAKE (Deebii Himatamaa - SDFHH Kwt. 82 / 95) */}
      {activeWorkflowTab === 'written_defense_intake' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Kutaa Simannaa Deebii Himatamaa (SDFHH Kwt. 82)' : 'Statement of Defense Intake Desk'}
              </h4>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Himatamaan mormii, deebii fi ragaalee dhiheeffatu simatanii galmeessuu, beellama Deebii Deebii (Plaintiff Rejoinder) kennuun qindeessuu.'
                  : 'Register defendant replies, legal defenses, counterclaims, and schedule plaintiff rejoinder hearing date.'}
              </p>
            </div>
          </div>

          {defenseSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{defenseSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegisterWrittenDefense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Galmee Filadhu (Select Case Docket) *</label>
                <select
                  value={defenseCaseId}
                  onChange={e => setDefenseCaseId(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  required
                >
                  <option value="">-- Lakk. Galmee Filadhu --</option>
                  {dockets.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.caseNumber} - {doc.claimantName} vs {doc.respondentName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Abukaattoo Himatamaa (Defense Advocate)</label>
                <input
                  type="text"
                  value={defenseAdvocate}
                  onChange={e => setDefenseAdvocate(e.target.value)}
                  placeholder="fkn. Abukaattoo Alamuuu Banteatti"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Gabaabsaa Deebii Himatamaa (Defense Summary) *</label>
              <textarea
                rows={3}
                value={defenseSummary}
                onChange={e => setDefenseSummary(e.target.value)}
                placeholder="Himatamaan waliigaltee diaguu isaa ni gana; kaffaltiin guutumuun raawwatameera jedha..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tarree Ragaalee Himatamaa (Defense Exhibits)</label>
                <input
                  type="text"
                  value={defenseExhibitsNote}
                  onChange={e => setDefenseExhibitsNote(e.target.value)}
                  placeholder="fkn. Nagahee kaffaltii nagahee Lakk 84920, Ragaa Namaa 2"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-400 mb-1 font-bold">Beellama Deebii Deebii Himataa (Rejoinder Date) *</label>
                <input
                  type="date"
                  value={defenseNextHearingDate}
                  onChange={e => setDefenseNextHearingDate(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Deebii Himatamaa Simadhu & Beellama Deebii Deebii Qabi</span>
            </button>
          </form>
        </div>
      )}

      {/* SUB-VIEW 6: PLAINTIFF REJOINDER INTAKE (Deebii Deebii Himataa - SDFHH Kwt. 223 / 241) */}
      {activeWorkflowTab === 'plaintiff_rejoinder_intake' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Kutaa Simannaa Deebii Deebii Himataa (SDFHH Kwt. 223)' : 'Plaintiff Rejoinder Intake Desk'}
              </h4>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Himataan deebii himatamaan dhiheesse irratti yaada deebii deebii (rejoinder) dhiheessu simatanii qabxii falmii qindeessuuf qopheessuu.'
                  : 'Receive plaintiff rejoinder counter-statements to defendant replies and transition docket to issue framing.'}
              </p>
            </div>
          </div>

          {rejoinderSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{rejoinderSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegisterPlaintiffRejoinder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Galmee Filadhu (Select Case Docket) *</label>
                <select
                  value={rejoinderCaseId}
                  onChange={e => setRejoinderCaseId(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  required
                >
                  <option value="">-- Lakk. Galmee Filadhu --</option>
                  {dockets.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.caseNumber} - {doc.claimantName} vs {doc.respondentName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Abukaattoo Himataa (Plaintiff Advocate)</label>
                <input
                  type="text"
                  value={rejoinderPlaintiffAdvocate}
                  onChange={e => setRejoinderPlaintiffAdvocate(e.target.value)}
                  placeholder="fkn. Abukaattoo Dajanee Gudinaa"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Qabiyyee Deebii Deebii Himataa (Rejoinder Summary) *</label>
              <textarea
                rows={3}
                value={rejoinderSummary}
                onChange={e => setRejoinderSummary(e.target.value)}
                placeholder="Himataan deebii himatamaa mormuun waliigalteen duraan jiraachuu fi kaffaltiin osoo hin raawwatamin ture jedha..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ragaalee Deebii Deebii (Counter-Exhibits)</label>
                <input
                  type="text"
                  value={rejoinderRebuttalExhibits}
                  onChange={e => setRejoinderRebuttalExhibits(e.target.value)}
                  placeholder="fkn. Barreeffama Sanada Taasifame, Xalayaa Akeekkachiisaa"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-400 mb-1 font-bold">Beellama Qabxii Falmii (Issue Framing Date) *</label>
                <input
                  type="date"
                  value={rejoinderNextHearingDate}
                  onChange={e => setRejoinderNextHearingDate(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Deebii Deebii Simadhu & Gara Qabxii Falmiitti Ceesisi</span>
            </button>
          </form>
        </div>
      )}

      {/* SUB-VIEW 7: CASSATION BENCH PLEADINGS (Dhaddacha Ijibbaataa - Deebii & Deebii Deebii) */}
      {activeWorkflowTab === 'cassation_response_intake' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Dhaddacha Ijibbaataa - Simannaa Deebii & Deebii Deebii' : 'Cassation Bench Response & Rebuttal Intake'}
              </h4>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Dogoggora seeraa bu\'uuraa irratti galmee Ijibbaataa koree abbootii seeraa 5\'iif deebii fi deebii deebii dhihaatu simatanii galmeessuu.'
                  : 'Register Cassation answers and rejoinders on fundamental errors of law for the 5-Judge Cassation Panel.'}
              </p>
            </div>
          </div>

          {cassationSuccessMsg && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{cassationSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegisterCassationPleading} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Galmee Ijibbaataa Filadhu *</label>
                <select
                  value={cassationCaseId}
                  onChange={e => setCassationCaseId(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  required
                >
                  <option value="">-- Galmee Ijibbaataa Filadhu --</option>
                  {dockets.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.caseNumber} - {doc.claimantName} vs {doc.respondentName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Gosa Barreeffama Seeraa (Pleading Type) *</label>
                <select
                  value={cassationPleadingType}
                  onChange={e => setCassationPleadingType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="deebii_ijibbaataa">Deebii Himatamaa Ijibbaataa (Cassation Answer)</option>
                  <option value="deebii_deebii_ijibbaataa">Deebii Deebii Ijibbaataa (Cassation Rebuttal)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Murtii Dhaddacha Ijibbaataa Caqasame (Cassation Precedent Cited)</label>
              <input
                type="text"
                value={cassationLegalPrecedentsCited}
                onChange={e => setCassationLegalPrecedentsCited(e.target.value)}
                placeholder="fkn. Murtii Dirqisiisaa Dhaddacha Ijibbaataa Jildii 18 Lakk. Galmee 102983"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Falmii Seeraa Bu'uuraa (Main Legal Grounds & Principles) *</label>
              <textarea
                rows={3}
                value={cassationMainArguments}
                onChange={e => setCassationMainArguments(e.target.value)}
                placeholder="Murtiin mana murtii jalaa keeyyata seera hariiroo hawaasaa kwt 1802 dogoggoraan hiikuun dogoggora seeraa bu'uuraa dhiyeesseera..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              <span>Barreeffama Ijibbaataa Galmeessii Koree Abbootii Seeraa 5'iif Qorpheessi</span>
            </button>
          </form>
        </div>
      )}

      {/* Inter-Court Docket & Appeal Transfer Modal */}
      {selectedDocket && (
        <InterCourtFileTransferModal
          currentLang={currentLang}
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          caseNumber={selectedDocket.caseNumber}
          caseTitle={`${selectedDocket.claimantName} vs ${selectedDocket.respondentName}`}
          currentCourtLevel={selectedDocket.courtLevel as any}
          currentCourtName="Mana Murtii Aanaa Adaamaa"
          onTransferComplete={(rec) => {
            console.log('Inter-court transfer record created:', rec);
          }}
        />
      )}
      {/* Judge Assignment Modal for Single Case */}
      {assignmentModalDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white font-serif-legal">
                    {currentLang === 'om' ? 'Abbaa Seeraa Ramadi (Assign Judge)' : 'Assign Judicial Bench'}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Case: {assignmentModalDoc.caseNumber} • {assignmentModalDoc.bench}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignmentModalDoc(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 mb-2">
                <div className="flex items-center gap-2 text-xs text-amber-300 font-bold mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{currentLang === 'om' ? 'Dursi (Priority):' : 'Priority Rationale:'}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  {currentLang === 'om' 
                    ? "Abbaa seeraa dhimma kana irratti ogummaa fi ba'aa hojii giddu-galeessa godhateen filadhaa. Erga ramadamee booda abbaan seeraa notification ni argata." 
                    : 'Select a judge based on specialization and current caseload. The judge will receive an immediate real-time notification once assigned.'}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider ml-1">
                  {currentLang === 'om' ? 'Abbootii Seeraa Dhaddacha Kanatti Argaman:' : 'Judges Available for this Bench:'}
                </span>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {courtUsersList
                    .filter(u => u.role === 'judge')
                    .map(judge => {
                      const isMatchingBench = judge.bench === assignmentModalDoc.bench;
                      return (
                        <button
                          key={judge.id}
                          type="button"
                          onClick={() => {
                            handleAssignPendingCaseToJudge(assignmentModalDoc.id, assignmentModalDoc.caseNumber);
                            setAssignmentModalDoc(null);
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all group flex items-center justify-between gap-3 ${
                            isMatchingBench
                              ? 'bg-slate-900 border-amber-500/30 hover:border-amber-500/60'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                              isMatchingBench ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              ⚖️
                            </div>
                            <div>
                              <div className="font-bold text-white group-hover:text-amber-300 transition-colors">{judge.fullName}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <Building2 className="w-3 h-3" />
                                <span>{judge.bench}</span>
                                {isMatchingBench && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">Matching</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-slate-500 font-mono">Case Load</div>
                            <div className="text-xs font-bold text-slate-300">
                              {Math.floor(Math.random() * 20 + 5)} Active
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setAssignmentModalDoc(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                {currentLang === 'om' ? 'Dhiisi' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedQrCase && (
        <CourtEntryQRModal
          caseId={selectedQrCase.id}
          caseNumber={selectedQrCase.caseNumber}
          caseTitle={selectedQrCase.claimSubject}
          currentLang={currentLang}
          onClose={() => setSelectedQrCase(null)}
        />
      )}
      {auditModalDocket && (
        <CaseLogicAuditModal
          caseDocket={auditModalDocket as FirestoreCaseDocket}
          currentLang={currentLang}
          onClose={() => setAuditModalDocket(null)}
          onUpdateDocket={(updated) => {
            setDockets(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
          }}
        />
      )}
    </div>
  );
};

export default LitigationLifecycleWorkflowManager;
