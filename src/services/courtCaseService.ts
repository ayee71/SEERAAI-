import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  writeBatch,
  arrayUnion,
  serverTimestamp,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firebase';
import { createCourtNotification } from './courtNotificationService';

export interface CourtDispatchOrder {
  id: string;
  caseId: string;
  caseNumber: string;
  courtName: string;
  bench: string;
  judgeName: string;
  orderTitle: string;
  orderText: string;
  orderRefNo: string;
  targetPartyName: string;
  targetPartyType: 'respondent' | 'police' | 'bank' | 'woreda_admin' | 'expert' | 'witness' | 'other';
  targetPartyContact?: string;
  dispatchChannel: 'telegram' | 'email' | 'both';
  status: 'pending_legal_officer' | 'dispatched' | 'response_received';
  issuedAt: string;
  deadlineDate?: string;
  dispatchedAt?: string;
  dispatchedByOfficer?: string;
  responseSummary?: string;
  responseReceivedAt?: string;
  responseChannel?: 'telegram' | 'email';
  responseDocumentUrl?: string;
}

export interface FirestoreCaseDocket {
  id: string;
  caseNumber: string;
  claimantName: string;
  respondentName: string;
  isExParte?: boolean;
  exParteCategory?: 'guardianship' | 'probate' | 'name_change' | 'injunction_exparte' | 'other';
  claimSubject: string;
  filingDate: string;
  courtLevel: 'first_instance' | 'high_court' | 'supreme_court' | 'cassation';
  bench: string;
  benchId?: string;
  benchName?: string;
  assignedOfficer: string;
  assignedJudge: string; // 'Pending Assignment' or judge name
  assignedJudges?: string[]; // collaborative panel of judges
  attendanceRecord?: string[]; // list of user IDs
  assignedAt?: string;
  assignedBy?: string;
  isJudgeNotified?: boolean;
  paymentStatus?: 'pending' | 'verified' | 'rejected';
  sinqeeReceiptNo?: string;
  paymentRejectionReason?: string;
  currentStage: 'intake' | 'coordinator_review' | 'assigned_to_judge' | 'first_summons' | 'preliminary_objection' | 'plaintiff_reply_hearing' | 'second_summons' | 'substantive_hearing' | 'partially_heard' | 'closed';
  hasPreliminaryObjection: boolean;
  preliminaryObjectionReason?: string;
  firstSummonsStatus: 'served' | 'not_served_absent' | 'pending';
  nextHearingDate?: string;
  hearingTime?: string;
  deadline24hNotified?: boolean;
  deadline24hNotifiedAt?: string;
  secondSummonsRefNo?: string;
  firstSummonsDispatchedAt?: string;
  firstSummonsDispatchedBy?: string;
  firstSummonsMethod?: 'court_process_server' | 'postal_registered' | 'police_assistance' | 'digital_telegram_sms' | string;
  firstSummonsTrackingNo?: string;
  firstSummonsServerName?: string;
  firstSummonsAddress?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low' | string;
  notes?: string;
  courtOrders?: CourtDispatchOrder[];
  createdAt?: string;
  updatedAt?: string;
}

export type CasePriority = 'urgent' | 'high' | 'medium' | 'low';

export interface CaseActivityLog {
  id: string;
  caseId: string;
  action: 'case_created' | 'case_assigned' | 'priority_updated' | 'status_changed' | 'payment_updated' | 'order_dispatched' | 'hearing_scheduled' | 'general_update' | string;
  title: string;
  description: string;
  performedBy: string;
  performedByRole?: string;
  timestamp: string; // ISO string
  details?: Record<string, any>;
}

const CASES_COLLECTION = 'cases';
const LOCAL_STORAGE_KEY = 'seera_court_cases_cache_v2';
const DISPATCH_ORDERS_KEY = 'seera_court_dispatch_orders_v2';
const ACTIVITY_LOGS_LOCAL_KEY = 'seera_case_activity_logs_cache_v1';

// Default initial seeds for local fallback and initial sync
export const DEFAULT_CASE_DOCKETS: FirestoreCaseDocket[] = [
  {
    id: 'case-today-301',
    caseNumber: 'CR-2026/045',
    claimantName: 'Obbo Baqqalaa Gammachuu',
    respondentName: 'Adde Birhaanee Asfaawu',
    isExParte: false,
    claimSubject: 'Dhaddacha Beellama Guyyaa Arraa - Falmii Qabeenya Manaa fi Madaallii Ragaa (C.P.C Art. 257)',
    filingDate: '2026-09-20',
    courtLevel: 'first_instance',
    bench: 'Dhaddacha Hariiroo Hawaasaa',
    assignedOfficer: 'Ofiisara Seeraa Tolasaa',
    assignedJudge: 'Abbaa Seeraa Caalaa',
    assignedAt: new Date(Date.now() - 172800000).toISOString(),
    assignedBy: 'Qindeessaa Galmee KTAS',
    isJudgeNotified: true,
    paymentStatus: 'verified',
    sinqeeReceiptNo: 'SNQ-2026-88910',
    currentStage: 'substantive_hearing',
    hasPreliminaryObjection: false,
    firstSummonsStatus: 'served',
    nextHearingDate: new Date().toISOString().slice(0, 10), // TODAY'S SCHEDULED HEARING
    notes: '🚨 Beellama Guyyaa Arraa! Abbaan seeraa galmee kana kallattiin banee dhaddacha gaggeessuu fi ajaja kennuu danda\'a.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'case-pend-201',
    caseNumber: 'CR-2026/105',
    claimantName: 'Obbo Kabbadaa Mulaatuu',
    respondentName: 'Adde Tsaggaaye Waaqgari',
    isExParte: false,
    claimSubject: 'Falmii Dhaala Manaa fi Qabeenyaa (Property Inheritance Claim)',
    filingDate: new Date().toISOString().slice(0, 10),
    courtLevel: 'first_instance',
    bench: 'Dhaddacha Maatii fi Dhaala',
    assignedOfficer: 'Ofiisara Seeraa Tolasaa',
    assignedJudge: 'Pending Assignment',
    paymentStatus: 'pending',
    sinqeeReceiptNo: 'SNQ-2026-99012',
    currentStage: 'intake',
    hasPreliminaryObjection: false,
    firstSummonsStatus: 'pending',
    nextHearingDate: '2026-11-12',
    notes: 'Galmeen Ofiisara Seeraatiin banee Lakk. Galmee qabateera. Kaffaltii Baankii Sinqee Mirkaneessuun Eegaa Jira.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'case-pend-202',
    caseNumber: 'CR-2026/108',
    claimantName: 'Adde Haftamnesh Balcha',
    respondentName: 'Dhaabbata Konstrukshinii Biiftuu PLC',
    isExParte: false,
    claimSubject: 'Falmii Kaffaltii Waliigaltee Hojii (Construction Contract Dispute)',
    filingDate: new Date().toISOString().slice(0, 10),
    courtLevel: 'high_court',
    bench: 'Dhaddacha Hojii fi Daldalaa',
    assignedOfficer: 'Ofiisara Seeraa Tolasaa',
    assignedJudge: 'Pending Assignment',
    paymentStatus: 'pending',
    sinqeeReceiptNo: 'SNQ-2026-99044',
    currentStage: 'intake',
    hasPreliminaryObjection: false,
    firstSummonsStatus: 'pending',
    nextHearingDate: '2026-11-15',
    notes: 'Galmeen Ol-iyyannoo KTAS tiin qoratamee ramaddii Abbaa Seeraa eegaa jira.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'case-pend-203',
    caseNumber: 'CR-2026/110',
    claimantName: 'Obbo Galaanaa Fayyisaa',
    respondentName: 'N/A - Iyyata Dhuunfaa (Ex-Parte Petition)',
    isExParte: true,
    exParteCategory: 'probate',
    claimSubject: 'Iyyata Waraqaa Ragaa Dhaalamtummaa (Ex-Parte Succession Certificate)',
    filingDate: new Date().toISOString().slice(0, 10),
    courtLevel: 'first_instance',
    bench: 'Dhaddacha Maatii fi Dhaala',
    assignedOfficer: 'Ofiisara Seeraa Tolasaa',
    assignedJudge: 'Pending Assignment',
    paymentStatus: 'rejected',
    sinqeeReceiptNo: 'SNQ-2026-77102',
    paymentRejectionReason: 'Nagaheen Baankii Sinqee lakkoofsa herregaa dogoggoraa qaba. Dambii Lakk. 08 irra deebidhaan kaffaltiin gabaasamuu qaba.',
    currentStage: 'substantive_hearing',
    hasPreliminaryObjection: false,
    firstSummonsStatus: 'served',
    nextHearingDate: '2026-11-18',
    notes: 'Dhimma Garee 1 Qofa: Kaffaltii Baankii Sinqee Kufaa Ta\'eera! Nagahee sirrii dhiheessuun irra jira.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'case-assigned-101',
    caseNumber: 'CR-2026/089',
    claimantName: 'Obbo Kabbadaa Mulaatuu',
    respondentName: 'Dhaabbata Daldalaa Biiftuu PLC',
    isExParte: false,
    claimSubject: 'Falmii Waliigaltee Bittaa fi Gurgurtaa Manaa (Civil Contract Claim)',
    filingDate: '2026-10-12',
    courtLevel: 'first_instance',
    bench: 'Dhaddacha Hariiroo Hawaasaa',
    assignedOfficer: 'Ofiisara Seeraa Tolasaa',
    assignedJudge: 'Abbaa Seeraa Caalaa',
    assignedAt: new Date(Date.now() - 86400000).toISOString(),
    assignedBy: 'Qindeessaa Galmee KTAS',
    isJudgeNotified: true,
    paymentStatus: 'verified',
    sinqeeReceiptNo: 'SNQ-2026-88123',
    currentStage: 'preliminary_objection',
    hasPreliminaryObjection: true,
    preliminaryObjectionReason: 'Mormii Darbiinsa Yeroo (Statute of Limitations - SDFHH Kwt 244(1)(a))',
    firstSummonsStatus: 'served',
    nextHearingDate: '2026-11-02',
    notes: 'Himatamaan deebii isaatti mormii darbiinsa yeroo dhiyeesseera. Yaada himataa caqasuuf beellamni qabameera.',
    createdAt: new Date().toISOString(),
  }
];

export const DEFAULT_DISPATCH_ORDERS: CourtDispatchOrder[] = [
  {
    id: 'ord-101',
    caseId: 'case-today-301',
    caseNumber: 'CR-2026/045',
    courtName: 'Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa',
    bench: 'Dhaddacha Hariiroo Hawaasaa',
    judgeName: 'Abbaa Seeraa Caalaa',
    orderTitle: 'Ajaja Sakatta\'iinsa Baankii & Qabeenya Dhaabbataa (Bank Account Disclosure Order)',
    orderText: 'Baankiin Daldala Itoophiyaa Damee Adaamaa herrega lakkoofsa himatamaa 1000284792 irratti maallaqa jiru gabaasa qorannoo dhiyaate guyyoota 7 keessatti akka ergu ajajameera.',
    orderRefNo: 'MM/AD/AJAJ-2026/019',
    targetPartyName: 'Commercial Bank of Ethiopia (CBE) - Damee Adaamaa',
    targetPartyType: 'bank',
    targetPartyContact: 'cbe.legal.adama@cbe.com.et / @CbeComplianceBot',
    dispatchChannel: 'email',
    status: 'pending_legal_officer',
    issuedAt: new Date().toISOString(),
    deadlineDate: '2026-11-05'
  },
  {
    id: 'ord-102',
    caseId: 'case-assigned-101',
    caseNumber: 'CR-2026/089',
    courtName: 'Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa',
    bench: 'Dhaddacha Hariiroo Hawaasaa',
    judgeName: 'Abbaa Seeraa Caalaa',
    orderTitle: 'Ajaja Waamicha Dhaddachaa 2ffaa (Second Court Summons Notice)',
    orderText: 'Himatamaan sababa waamichi 1ffaan hin qaqqabiniif hin dhiyaanne waan taheef, waamichi 2ffaan ajaja dhaddachaatiin gama Telegram/Email tiin akka dhaqqabu ajajameera.',
    orderRefNo: 'MM/AD/WAAM-2026/044',
    targetPartyName: 'Dhaabbata Daldalaa Biiftuu PLC (Bailiff Office)',
    targetPartyType: 'respondent',
    targetPartyContact: '@BiiftuuCommerceLegal / info@biiftuu.com',
    dispatchChannel: 'telegram',
    status: 'dispatched',
    issuedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    dispatchedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    dispatchedByOfficer: 'Ofiisara Seeraa Tolasaa',
    deadlineDate: '2026-11-02'
  }
];

// Helper to get local cases cache
export const getLocalCasesCache = (): FirestoreCaseDocket[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_CASE_DOCKETS));
      return DEFAULT_CASE_DOCKETS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_CASE_DOCKETS;
  } catch (e) {
    return DEFAULT_CASE_DOCKETS;
  }
};

// Helper to save local cases cache
export const saveLocalCasesCache = (cases: FirestoreCaseDocket[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cases));
  } catch (e) {
    console.warn('Failed to persist cases locally:', e);
  }
};

/**
 * Fetch all cases from Firestore (with local cache fallback)
 */
export const fetchAllCasesFromFirestore = async (): Promise<FirestoreCaseDocket[]> => {
  try {
    const q = collection(db, CASES_COLLECTION);
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      // Seed initial cases to Firestore
      for (const item of DEFAULT_CASE_DOCKETS) {
        await setDoc(doc(db, CASES_COLLECTION, item.id), item);
      }
      return DEFAULT_CASE_DOCKETS;
    }

    const fetched: FirestoreCaseDocket[] = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as FirestoreCaseDocket));

    saveLocalCasesCache(fetched);
    return fetched;
  } catch (error) {
    console.warn('Firestore fetch failed, returning local cached cases:', error);
    return getLocalCasesCache();
  }
};

/**
 * Assign a case to a specific judge in Firestore & local cache, triggering a live judge notification
 */
export const assignCaseToJudgeInFirestore = async (
  caseId: string, 
  targetJudgeName: string, 
  coordinatorName: string = 'Qindeessaa Galmee KTAS'
): Promise<FirestoreCaseDocket> => {
  const timestampIso = new Date().toISOString();
  const path = `${CASES_COLLECTION}/${caseId}`;

  const updateFields = {
    assignedJudge: targetJudgeName,
    assignedAt: timestampIso,
    assignedBy: coordinatorName,
    isJudgeNotified: true,
    updatedAt: timestampIso
  };

  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      await updateDoc(docRef, updateFields);
    } else {
      // If doc doesn't exist yet in Firestore, find in local cache and setDoc
      const cachedList = getLocalCasesCache();
      const existing = cachedList.find(c => c.id === caseId) || {
        id: caseId,
        caseNumber: 'CR-2026/' + Math.floor(100 + Math.random() * 900),
        claimantName: 'Claimant',
        respondentName: 'Respondent',
        claimSubject: 'Legal Matter',
        filingDate: timestampIso.slice(0, 10),
        courtLevel: 'first_instance' as const,
        bench: 'Dhaddacha Hariiroo Hawaasaa',
        assignedOfficer: coordinatorName,
        assignedJudge: 'Pending Assignment',
        currentStage: 'intake' as const,
        hasPreliminaryObjection: false,
        firstSummonsStatus: 'pending' as const,
      };

      const updatedCase: FirestoreCaseDocket = {
        ...existing,
        ...updateFields
      };

      await setDoc(docRef, updatedCase);
    }
  } catch (error) {
    console.warn('Firestore update failed, proceeding with local persistent update:', error);
  }

  // Update local memory cache
  const currentList = getLocalCasesCache();
  let updatedRecord: FirestoreCaseDocket | null = null;

  const updatedList = currentList.map(c => {
    if (c.id === caseId) {
      updatedRecord = {
        ...c,
        assignedJudge: targetJudgeName,
        assignedAt: timestampIso,
        assignedBy: coordinatorName,
        isJudgeNotified: true,
        updatedAt: timestampIso
      };
      return updatedRecord;
    }
    return c;
  });

  if (!updatedRecord) {
    updatedRecord = {
      id: caseId,
      caseNumber: 'CR-2026/' + Math.floor(100 + Math.random() * 900),
      claimantName: 'Obbo Tolaa',
      respondentName: 'Adde Guutamaa',
      claimSubject: 'Falmii Qabeenyaa',
      filingDate: timestampIso.slice(0, 10),
      courtLevel: 'first_instance',
      bench: 'Dhaddacha Hariiroo Hawaasaa',
      assignedOfficer: coordinatorName,
      assignedJudge: targetJudgeName,
      assignedAt: timestampIso,
      assignedBy: coordinatorName,
      isJudgeNotified: true,
      currentStage: 'intake',
      hasPreliminaryObjection: false,
      firstSummonsStatus: 'pending',
    };
    updatedList.unshift(updatedRecord);
  }
  // Dispatch notification to the assigned judge
  const finalRecord = (updatedRecord as any) as FirestoreCaseDocket;
  await createCourtNotification({
    type: 'case_assigned',
    title: `🔔 Ramaddii Galmee Haaraa (New Case Assigned)`,
    body: `Qindeessaan Galmee KTAS (${coordinatorName}) galmee haaraa isiniif ramadeera. Lakk. Galmee: ${finalRecord?.caseNumber || 'N/A'}.`,
    recipientRole: 'judge',
    recipientName: targetJudgeName,
    caseId,
    urgency: 'high',
    isRead: false
  });

  saveLocalCasesCache(updatedList);
  return updatedRecord;
};

/**
 * Assign a case to multiple judges (collaborative bench panel) in Firestore & local cache, triggering live notifications to all assigned judges
 */
/**
 * Assign a case to multiple judges (collaborative bench panel) in Firestore & local cache, triggering live notifications to all assigned judges
 */
export const assignCaseToJudgesInFirestore = async (
  caseId: string, 
  targetJudgeNames: string[], 
  coordinatorName: string = 'Qindeessaa Galmee KTAS',
  priority?: string
): Promise<FirestoreCaseDocket> => {
  const primaryJudge = targetJudgeNames[0] || 'Pending Assignment';
  const timestampIso = new Date().toISOString();

  const updateFields: any = {
    assignedJudge: primaryJudge,
    assignedJudges: targetJudgeNames,
    assignedAt: timestampIso,
    assignedBy: coordinatorName,
    isJudgeNotified: true,
    updatedAt: timestampIso
  };

  if (priority) {
    updateFields.priority = priority.toLowerCase();
  }

  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      await updateDoc(docRef, updateFields);
    } else {
      const cachedList = getLocalCasesCache();
      const existing = cachedList.find(c => c.id === caseId) || {
        id: caseId,
        caseNumber: 'CR-2026/' + Math.floor(100 + Math.random() * 900),
        claimantName: 'Claimant',
        respondentName: 'Respondent',
        claimSubject: 'Legal Matter',
        filingDate: timestampIso.slice(0, 10),
        courtLevel: 'first_instance' as const,
        bench: 'Dhaddacha Hariiroo Hawaasaa',
        assignedOfficer: coordinatorName,
        assignedJudge: primaryJudge,
        assignedJudges: targetJudgeNames,
        currentStage: 'intake' as const,
        hasPreliminaryObjection: false,
        firstSummonsStatus: 'pending' as const,
        priority: priority || 'medium',
      };

      const updatedCase: FirestoreCaseDocket = {
        ...existing,
        ...updateFields
      };

      await setDoc(docRef, updatedCase);
    }
  } catch (error) {
    console.warn('Firestore update failed, proceeding with local persistent update:', error);
  }

  // Dispatch notifications to all assigned judges
  for (const jName of targetJudgeNames) {
    await createCourtNotification({
      type: 'case_assigned',
      title: `🔔 Ramaddii Galmee Koree Dhaddachaa (Collaborative Bench)`,
      body: `Qindeessaan Galmee KTAS (${coordinatorName}) galmee haaraa Abbaa Seeraa ${jName} fi koree dhaddacha waliinii (${targetJudgeNames.join(', ')}) tiif ramadeera.`,
      recipientRole: 'judge',
      recipientName: jName,
      caseId,
      urgency: 'high',
      isRead: false
    });
  }

  // Record action in activity_logs subcollection
  await addCaseActivityLog(caseId, {
    action: 'case_assigned',
    title: 'Galmeen Abbaa Seeraatti Ramadame (Case Assigned)',
    description: `Qindeessaa KTAS (${coordinatorName}) tiin Abbootii Seeraa (${targetJudgeNames.join(', ')}) tiif ramadameera.`,
    performedBy: coordinatorName,
    performedByRole: 'registrar',
    details: { assignedJudges: targetJudgeNames, primaryJudge }
  });

  if (priority) {
    await addCaseActivityLog(caseId, {
      action: 'priority_updated',
      title: 'Sadarkaan Ariifannaa Murtaa\'e (Priority Updated)',
      description: `Sadarkaan ariifannaa galmee gara '${priority.toUpperCase()}' tti murtaa'eera.`,
      performedBy: coordinatorName,
      performedByRole: 'registrar',
      details: { priority: priority.toLowerCase() }
    });
  }

  // Update local memory cache
  const currentList = getLocalCasesCache();
  let updatedRecord: FirestoreCaseDocket | null = null;

  const updatedList = currentList.map(c => {
    if (c.id === caseId) {
      updatedRecord = {
        ...c,
        assignedJudge: primaryJudge,
        assignedJudges: targetJudgeNames,
        assignedAt: timestampIso,
        assignedBy: coordinatorName,
        isJudgeNotified: true,
        priority: priority ? priority.toLowerCase() : c.priority,
        updatedAt: timestampIso,
        notes: `Qindeessaa Galmee KTAS (${coordinatorName}) tiin Abbootii Seeraa Koree Dhaddachaa (${targetJudgeNames.join(', ')}) tiif ramadameera.`
      };
      return updatedRecord;
    }
    return c;
  });

  if (!updatedRecord) {
    updatedRecord = {
      id: caseId,
      caseNumber: 'CR-2026/' + Math.floor(100 + Math.random() * 900),
      claimantName: 'Obbo Tolaa',
      respondentName: 'Adde Guutamaa',
      claimSubject: 'Falmii Qabeenyaa',
      filingDate: timestampIso.slice(0, 10),
      courtLevel: 'first_instance',
      bench: 'Dhaddacha Hariiroo Hawaasaa',
      assignedOfficer: coordinatorName,
      assignedJudge: primaryJudge,
      assignedJudges: targetJudgeNames,
      assignedAt: timestampIso,
      assignedBy: coordinatorName,
      isJudgeNotified: true,
      currentStage: 'intake',
      hasPreliminaryObjection: false,
      firstSummonsStatus: 'pending',
      priority: priority ? priority.toLowerCase() : 'medium',
    };
    updatedList.unshift(updatedRecord);
  }

  saveLocalCasesCache(updatedList);
  return updatedRecord;
};

// Activity logs cache helpers
function getLocalActivityLogsCache(caseId: string): CaseActivityLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${ACTIVITY_LOGS_LOCAL_KEY}_${caseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalActivityLogsCache(caseId: string, logs: CaseActivityLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${ACTIVITY_LOGS_LOCAL_KEY}_${caseId}`, JSON.stringify(logs));
  } catch (e) {
    console.warn('Failed to cache activity logs locally:', e);
  }
}

/**
 * Add a timestamped activity log entry to the case subcollection 'activity_logs' in Firestore and local cache
 */
export const addCaseActivityLog = async (
  caseId: string,
  logData: Omit<CaseActivityLog, 'id' | 'caseId' | 'timestamp'> & { timestamp?: string }
): Promise<CaseActivityLog> => {
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const timestamp = logData.timestamp || new Date().toISOString();

  const newLog: CaseActivityLog = {
    id: logId,
    caseId,
    action: logData.action,
    title: logData.title,
    description: logData.description,
    performedBy: logData.performedBy,
    performedByRole: logData.performedByRole || 'court_personnel',
    timestamp,
    details: logData.details || {}
  };

  try {
    const logDocRef = doc(db, CASES_COLLECTION, caseId, 'activity_logs', logId);
    await setDoc(logDocRef, newLog);
  } catch (err) {
    console.warn('Firestore setDoc activity log failed, saving locally:', err);
  }

  // Update local cache
  const existing = getLocalActivityLogsCache(caseId);
  const updated = [newLog, ...existing.filter(l => l.id !== logId)];
  saveLocalActivityLogsCache(caseId, updated);

  return newLog;
};

/**
 * Fetch timestamped history of actions taken on a case from 'cases/{caseId}/activity_logs'
 */
export const fetchCaseActivityLogs = async (caseId: string): Promise<CaseActivityLog[]> => {
  const localLogs = getLocalActivityLogsCache(caseId);

  try {
    const subColRef = collection(db, CASES_COLLECTION, caseId, 'activity_logs');
    const q = query(subColRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const firestoreLogs: CaseActivityLog[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      saveLocalActivityLogsCache(caseId, firestoreLogs);
      return firestoreLogs;
    }
  } catch (err) {
    console.warn('Could not query Firestore activity_logs, checking local/baseline:', err);
  }

  if (localLogs.length > 0) {
    return localLogs;
  }

  // If no logs exist yet, generate initial baseline milestone logs from the case docket
  const currentList = getLocalCasesCache();
  const c = currentList.find(item => item.id === caseId);
  const now = new Date();

  const initialLogs: CaseActivityLog[] = [
    {
      id: 'init_created_' + caseId,
      caseId,
      action: 'case_created',
      title: 'Galmeen Baname (Case Intake Registered)',
      description: `Himannaa haaraan lakk. ${c?.caseNumber || 'CR-2026/089'} ofiisara seeraatiin banamee galmaa'eera.`,
      performedBy: c?.assignedOfficer || 'Ofiisara Seeraa',
      performedByRole: 'registrar',
      timestamp: c?.filingDate ? new Date(c.filingDate).toISOString() : new Date(now.getTime() - 86400000 * 3).toISOString()
    }
  ];

  if (c?.paymentStatus === 'verified') {
    initialLogs.push({
      id: 'init_payment_' + caseId,
      caseId,
      action: 'payment_updated',
      title: 'Kaffaltiin Abbaa Seerummaa Mirkanaa\'e (Sinqee Bank Verified)',
      description: `Nagaheen baankii Sinqee (${c.sinqeeReceiptNo || 'SNQ-2026-88910'}) milkaa'inaan mirkanaa'eera.`,
      performedBy: 'Qindeessaa KTAS',
      performedByRole: 'registrar',
      timestamp: new Date(now.getTime() - 86400000 * 2).toISOString()
    });
  }

  if (c?.assignedJudge && c.assignedJudge !== 'Pending Assignment') {
    initialLogs.push({
      id: 'init_assigned_' + caseId,
      caseId,
      action: 'case_assigned',
      title: 'Abbaa Seeraatiif Ramadame (Bench Assigned)',
      description: `Galmeen ${c.assignedJudge} fi koree dhaddachaatiif ramadameera.`,
      performedBy: c.assignedBy || 'Qindeessaa KTAS',
      performedByRole: 'registrar',
      timestamp: c.assignedAt || new Date(now.getTime() - 86400000 * 1).toISOString(),
      details: { assignedJudges: c.assignedJudges || [c.assignedJudge] }
    });
  }

  if (c?.priority) {
    initialLogs.push({
      id: 'init_priority_' + caseId,
      caseId,
      action: 'priority_updated',
      title: 'Sadarkaan Ariifannaa Murtaa\'e (Priority Set)',
      description: `Sadarkaan dhimma kanaa '${String(c.priority).toUpperCase()}' jedhamee murtaa'eera.`,
      performedBy: 'Bulchiinsa Mana Murtii',
      performedByRole: 'court_admin',
      timestamp: new Date().toISOString(),
      details: { priority: c.priority }
    });
  }

  saveLocalActivityLogsCache(caseId, initialLogs);
  return initialLogs;
};

/**
 * Live subscription to 'cases/{caseId}/activity_logs'
 */
export const subscribeToCaseActivityLogs = (
  caseId: string,
  callback: (logs: CaseActivityLog[]) => void
): (() => void) => {
  try {
    const subColRef = collection(db, CASES_COLLECTION, caseId, 'activity_logs');
    const q = query(subColRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const logs: CaseActivityLog[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any)
        }));
        saveLocalActivityLogsCache(caseId, logs);
        callback(logs);
      } else {
        fetchCaseActivityLogs(caseId).then(callback);
      }
    }, (error) => {
      console.warn('Subscription to activity_logs error, fallback to fetch:', error);
      fetchCaseActivityLogs(caseId).then(callback);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to activity_logs:', err);
    fetchCaseActivityLogs(caseId).then(callback);
    return () => {};
  }
};

/**
 * Update case priority in Firestore and write an activity log
 */
export const updateCasePriorityInFirestore = async (
  caseId: string,
  priority: CasePriority | string,
  performedBy: string = 'Authorized Staff',
  performedByRole: string = 'court_personnel'
): Promise<FirestoreCaseDocket> => {
  const timestampIso = new Date().toISOString();
  const normalizedPriority = priority.toLowerCase();
  const updateFields = {
    priority: normalizedPriority,
    updatedAt: timestampIso
  };

  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    await updateDoc(docRef, updateFields);
  } catch (error) {
    console.warn('Firestore priority update failed, saving locally:', error);
  }

  // Update local memory & storage
  const currentList = getLocalCasesCache();
  let updatedRecord: FirestoreCaseDocket | null = null;
  const updatedList = currentList.map(c => {
    if (c.id === caseId) {
      updatedRecord = {
        ...c,
        priority: normalizedPriority,
        updatedAt: timestampIso
      };
      return updatedRecord;
    }
    return c;
  });

  if (updatedRecord) {
    saveLocalCasesCache(updatedList);
  }

  // Record in activity_logs subcollection
  await addCaseActivityLog(caseId, {
    action: 'priority_updated',
    title: 'Sadarkaan Ariifannaa Murtaa\'e (Priority Updated)',
    description: `Sadarkaan ariifannaa galmee gara '${normalizedPriority.toUpperCase()}' tti jijjiirameera.`,
    performedBy,
    performedByRole,
    details: { priority: normalizedPriority }
  });

  return updatedRecord || { id: caseId, priority: normalizedPriority, updatedAt: timestampIso } as any;
};

/**
 * Update case bench (benchId & benchName) in Firestore and local cache
 */
export const updateCaseBenchInFirestore = async (
  caseId: string,
  benchId: string,
  benchName: string,
  performedBy: string = 'Authorized Staff',
  performedByRole: string = 'court_personnel'
): Promise<FirestoreCaseDocket> => {
  const timestampIso = new Date().toISOString();
  const updateFields = {
    benchId,
    bench: benchName,
    benchName,
    updatedAt: timestampIso
  };

  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    await updateDoc(docRef, updateFields);
  } catch (error) {
    console.warn('Firestore bench update failed, saving locally:', error);
  }

  // Update local memory & storage
  const currentList = getLocalCasesCache();
  let updatedRecord: FirestoreCaseDocket | null = null;
  const updatedList = currentList.map(c => {
    if (c.id === caseId) {
      updatedRecord = {
        ...c,
        benchId,
        bench: benchName,
        benchName,
        updatedAt: timestampIso
      };
      return updatedRecord;
    }
    return c;
  });

  if (updatedRecord) {
    saveLocalCasesCache(updatedList);
  }

  // Record in activity_logs subcollection
  await addCaseActivityLog(caseId, {
    action: 'bench_updated',
    title: 'Dhaddachatti Ramadame (Bench Assigned)',
    description: `Galmeen dhaddacha '${benchName}' (ID: ${benchId}) tti ramadameera.`,
    performedBy,
    performedByRole,
    details: { benchId, benchName }
  });

  return updatedRecord || ({ id: caseId, benchId, bench: benchName, benchName, updatedAt: timestampIso } as any);
};

/**
 * Bulk assign multiple cases to multiple judges (collaborative bench panel) using Firestore writeBatch and send notifications to all
 */
export const bulkAssignCasesToJudgesInFirestore = async (
  caseIds: string[],
  targetJudgeNames: string[],
  coordinatorName: string = 'Qindeessaa Galmee KTAS'
): Promise<{ success: boolean; count: number; updatedCases: FirestoreCaseDocket[]; consolidatedNotification: any }> => {
  if (!caseIds || caseIds.length === 0 || !targetJudgeNames || targetJudgeNames.length === 0) {
    return { success: false, count: 0, updatedCases: [], consolidatedNotification: null };
  }

  const primaryJudge = targetJudgeNames[0];
  const timestampIso = new Date().toISOString();
  const currentList = getLocalCasesCache();
  const targetCases = currentList.filter(c => caseIds.includes(c.id));
  const caseNumbers = targetCases.map(c => c.caseNumber);

  // 1. Batch update in Firestore
  try {
    const batch = writeBatch(db);
    for (const caseId of caseIds) {
      const docRef = doc(db, CASES_COLLECTION, caseId);
      batch.set(docRef, {
        assignedJudge: primaryJudge,
        assignedJudges: targetJudgeNames,
        assignedAt: timestampIso,
        assignedBy: coordinatorName,
        isJudgeNotified: true,
        updatedAt: timestampIso
      }, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    console.warn('Firestore writeBatch multi-judge assignment failed, continuing with local persistent update:', error);
  }

  // 2. Dispatch notifications to all assigned judges
  let consolidatedNotif = null;
  for (const jName of targetJudgeNames) {
    consolidatedNotif = await createCourtNotification({
      type: 'bulk_case_assignment',
      title: `🔔 Ramaddii Galmee Gamtaa Koree Dhaddachaa (${caseIds.length} Cases)`,
      body: `Qindeessaan Galmee KTAS (${coordinatorName}) galmeewwan haaraa ${caseIds.length} (${caseNumbers.join(', ')}) Abbaa Seeraa ${jName} fi koree dhaddacha waliinii (${targetJudgeNames.join(', ')}) tiif ramadeera.`,
      recipientRole: 'judge',
      recipientName: jName,
      caseIds,
      caseNumbers,
      urgency: 'high',
      isRead: false
    });
  }

  // 3. Update local cache
  const updatedCasesList = currentList.map(c => {
    if (caseIds.includes(c.id)) {
      return {
        ...c,
        assignedJudge: primaryJudge,
        assignedJudges: targetJudgeNames,
        assignedAt: timestampIso,
        assignedBy: coordinatorName,
        isJudgeNotified: true,
        updatedAt: timestampIso,
        notes: `Qindeessaa Galmee KTAS (${coordinatorName}) tiin Abbootii Seeraa Koree Dhaddachaa (${targetJudgeNames.join(', ')}) tiif ramaddiin gamtaa (bulk collaborative assignment) raawwatameera.`
      };
    }
    return c;
  });

  saveLocalCasesCache(updatedCasesList);

  return {
    success: true,
    count: caseIds.length,
    updatedCases: updatedCasesList.filter(c => caseIds.includes(c.id)),
    consolidatedNotification: consolidatedNotif
  };
};

/**
 * Bulk assign multiple cases to a single judge using Firestore writeBatch and send a consolidated notification
 */
export const bulkAssignCasesToJudgeInFirestore = async (
  caseIds: string[],
  targetJudgeName: string,
  coordinatorName: string = 'Qindeessaa Galmee KTAS'
): Promise<{ success: boolean; count: number; updatedCases: FirestoreCaseDocket[]; consolidatedNotification: any }> => {
  return bulkAssignCasesToJudgesInFirestore(caseIds, [targetJudgeName], coordinatorName);
};



/**
 * Register a brand new case in Firestore (Intake) with 'Pending Assignment'
 */
export const registerNewCaseInFirestore = async (
  newCaseData: Omit<FirestoreCaseDocket, 'id' | 'createdAt'>
): Promise<FirestoreCaseDocket> => {
  const timestampIso = new Date().toISOString();
  const generatedId = `case-${Date.now()}`;
  const fullCase: FirestoreCaseDocket = {
    ...newCaseData,
    id: generatedId,
    createdAt: timestampIso,
    updatedAt: timestampIso
  };

  try {
    await setDoc(doc(db, CASES_COLLECTION, generatedId), fullCase);
  } catch (error) {
    console.warn('Firestore create case failed, saving to local cache:', error);
  }

  const currentList = getLocalCasesCache();
  saveLocalCasesCache([fullCase, ...currentList]);
  return fullCase;
};

/**
 * Clear or mark judge notification as read
 */
export const markCaseJudgeNotificationRead = async (caseId: string) => {
  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    await updateDoc(docRef, { isJudgeNotified: false });
  } catch (error) {
    console.warn('Firestore mark read failed:', error);
  }

  const currentList = getLocalCasesCache();
  const updatedList = currentList.map(c => {
    if (c.id === caseId) {
      return { ...c, isJudgeNotified: false };
    }
    return c;
  });
  saveLocalCasesCache(updatedList);
};

/**
 * Get cases scheduled for today's hearing ('Beellama Guyyaa Arraa')
 */
export const getTodayHearings = (judgeName?: string): FirestoreCaseDocket[] => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const cases = getLocalCasesCache();
  return cases.filter(c => {
    const isToday = c.nextHearingDate === todayStr || c.id === 'case-today-301';
    if (!isToday) return false;
    if (judgeName && c.assignedJudge && c.assignedJudge !== 'Pending Assignment') {
      return c.assignedJudge.toLowerCase().includes(judgeName.toLowerCase()) || true;
    }
    return true;
  });
};

/**
 * Fetch all court dispatch orders
 */
export const getDispatchOrders = (caseId?: string): CourtDispatchOrder[] => {
  try {
    const raw = localStorage.getItem(DISPATCH_ORDERS_KEY);
    let orders: CourtDispatchOrder[] = raw ? JSON.parse(raw) : DEFAULT_DISPATCH_ORDERS;
    if (!raw) {
      localStorage.setItem(DISPATCH_ORDERS_KEY, JSON.stringify(DEFAULT_DISPATCH_ORDERS));
    }
    if (caseId) {
      return orders.filter(o => o.caseId === caseId);
    }
    return orders;
  } catch (e) {
    return DEFAULT_DISPATCH_ORDERS;
  }
};

/**
 * Issue a new court order from Judge workbench to the Court Legal Officer
 */
export const issueJudgeCourtOrder = (
  orderData: Omit<CourtDispatchOrder, 'id' | 'issuedAt' | 'status'>
): CourtDispatchOrder => {
  const timestampIso = new Date().toISOString();
  const newOrder: CourtDispatchOrder = {
    ...orderData,
    id: `ord-${Date.now()}`,
    issuedAt: timestampIso,
    status: 'pending_legal_officer'
  };

  const current = getDispatchOrders();
  const updated = [newOrder, ...current];
  try {
    localStorage.setItem(DISPATCH_ORDERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save order locally', e);
  }

  // Also update case docket note and orders list
  const cases = getLocalCasesCache();
  const updatedCases = cases.map(c => {
    if (c.id === orderData.caseId || c.caseNumber === orderData.caseNumber) {
      const existingOrders = c.courtOrders || [];
      return {
        ...c,
        courtOrders: [newOrder, ...existingOrders],
        notes: `🚨 Ajajni Dhaddachaa (${newOrder.orderRefNo}) kennamee Ofiisara Seeraatiif ergameera. Status: Ergamuu Eegaa Jira.`
      };
    }
    return c;
  });
  saveLocalCasesCache(updatedCases);

  return newOrder;
};

/**
 * Legal officer dispatches court order via Telegram or Email
 */
export const dispatchOrderViaChannel = (
  orderId: string, 
  channel: 'telegram' | 'email', 
  officerName: string = 'Ofiisara Seeraa'
): CourtDispatchOrder | null => {
  const orders = getDispatchOrders();
  let updatedOrder: CourtDispatchOrder | null = null;
  const timestampIso = new Date().toISOString();

  const updatedOrders = orders.map(ord => {
    if (ord.id === orderId) {
      updatedOrder = {
        ...ord,
        status: 'dispatched',
        dispatchChannel: channel,
        dispatchedAt: timestampIso,
        dispatchedByOfficer: officerName
      };
      return updatedOrder;
    }
    return ord;
  });

  if (updatedOrder) {
    try {
      localStorage.setItem(DISPATCH_ORDERS_KEY, JSON.stringify(updatedOrders));
    } catch (e) {
      console.warn('Failed to save dispatched orders', e);
    }
  }

  return updatedOrder;
};

/**
 * Record incoming response / compliance report from ordered party via Telegram or Email
 */
export const recordOrderResponse = (
  orderId: string,
  responseSummary: string,
  channel: 'telegram' | 'email' = 'telegram',
  receivedByOfficer: string = 'Ofiisara Seeraa'
): CourtDispatchOrder | null => {
  const orders = getDispatchOrders();
  let updatedOrder: CourtDispatchOrder | null = null;
  const timestampIso = new Date().toISOString();

  const updatedOrders = orders.map(ord => {
    if (ord.id === orderId) {
      updatedOrder = {
        ...ord,
        status: 'response_received',
        responseSummary,
        responseReceivedAt: timestampIso,
        responseChannel: channel
      };
      return updatedOrder;
    }
    return ord;
  });

  if (updatedOrder) {
    try {
      localStorage.setItem(DISPATCH_ORDERS_KEY, JSON.stringify(updatedOrders));
    } catch (e) {
      console.warn('Failed to save order response', e);
    }

    // Also update case docket note
    const cases = getLocalCasesCache();
    const updatedCases = cases.map(c => {
      if (c.id === (updatedOrder as CourtDispatchOrder).caseId || c.caseNumber === (updatedOrder as CourtDispatchOrder).caseNumber) {
        return {
          ...c,
          notes: `✅ Bu'aan Ajajaa (${(updatedOrder as CourtDispatchOrder).orderRefNo}) gama ${channel.toUpperCase()} tiin dhihaatee galmee irratti qabameera! Qabiyyee: ${responseSummary.slice(0, 60)}...`
        };
      }
      return c;
    });
    saveLocalCasesCache(updatedCases);
  }

  return updatedOrder;
};

/**
 * Update Sinqee Bank payment verification status for a case docket
 */
export const updateCasePaymentStatus = async (
  caseId: string,
  status: 'pending' | 'verified' | 'rejected',
  receiptNo?: string,
  rejectionReason?: string
): Promise<FirestoreCaseDocket | null> => {
  const timestampIso = new Date().toISOString();
  let updatedRecord: FirestoreCaseDocket | null = null;

  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    await updateDoc(docRef, {
      paymentStatus: status,
      ...(receiptNo ? { sinqeeReceiptNo: receiptNo } : {}),
      ...(rejectionReason ? { paymentRejectionReason: rejectionReason } : {}),
      updatedAt: timestampIso
    });
  } catch (error) {
    console.warn('Firestore payment status update failed, saving locally:', error);
  }

  const currentList = getLocalCasesCache();
  const updatedList = currentList.map(c => {
    if (c.id === caseId) {
      updatedRecord = {
        ...c,
        paymentStatus: status,
        sinqeeReceiptNo: receiptNo || c.sinqeeReceiptNo || `SNQ-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        paymentRejectionReason: rejectionReason || (status === 'rejected' ? 'Nagahee Baankii Sinqee irra deebiidhaan mirkanaa\'uu qaba.' : undefined),
        notes: status === 'verified' 
          ? `✅ Kaffaltii Baankii Sinqee (Dambii Lakk. 08) Mirkanaa'eera! Receipt: ${receiptNo || c.sinqeeReceiptNo}`
          : status === 'rejected'
          ? `🚨 Kaffaltii Baankii Sinqee KUFAA TA'EERA! Sababa: ${rejectionReason || 'Nagahee baankii mirkaneessi.'}`
          : c.notes,
        updatedAt: timestampIso
      };
      return updatedRecord;
    }
    return c;
  });

  saveLocalCasesCache(updatedList);
  return updatedRecord;
};

/**
 * Batch verify all pending Sinqee Bank payments in one click
 */
export const bulkVerifyPendingPayments = async (caseIds?: string[]): Promise<number> => {
  const cases = getLocalCasesCache();
  let count = 0;
  const targetIds = caseIds || cases.filter(c => c.paymentStatus === 'pending' || !c.paymentStatus).map(c => c.id);

  for (const caseId of targetIds) {
    await updateCasePaymentStatus(caseId, 'verified', `SNQ-2026-BULK-${Math.floor(1000 + Math.random() * 9000)}`);
    count++;
  }

  return count;
};

/**
 * Forward a case from Legal Officer Intake Desk to Court Coordinator
 */
export const forwardCaseToCoordinator = async (
  caseId: string,
  officerName: string = 'Ofiisara Seeraa'
): Promise<FirestoreCaseDocket | null> => {
  const timestampIso = new Date().toISOString();
  let updatedRecord: FirestoreCaseDocket | null = null;

  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    await updateDoc(docRef, {
      currentStage: 'coordinator_review',
      updatedAt: timestampIso
    });
  } catch (error) {
    console.warn('Firestore forward case failed, updating locally:', error);
  }

  // Send notification to Coordinator
  await createCourtNotification({
    type: 'status_update',
    title: `📤 Galmeen Haaraan Qindeessaaf Dhiyaate (Forwarded to Coordinator)`,
    body: `Ofisara Seeraa (${officerName}) tiin galmeen haaraan qorannoo kaffaltii Baankii Sinqee fi ragaa xumuramee gara Qindeessaa Dhaddachaa tiif qajeelfameera.`,
    recipientRole: 'coordinator',
    recipientName: 'Qindeessaa Galmee KTAS',
    caseId,
    urgency: 'medium',
    isRead: false
  });

  const currentList = getLocalCasesCache();
  const updatedList = currentList.map(c => {
    if (c.id === caseId) {
      updatedRecord = {
        ...c,
        currentStage: 'coordinator_review',
        notes: `📤 Ofiisara Seeraatiin (${officerName}) qulqulleeffamee gara Qindeessaa Dhaddachaa tiif darbeera.`,
        updatedAt: timestampIso
      };
      return updatedRecord;
    }
    return c;
  });

  saveLocalCasesCache(updatedList);
  return updatedRecord;
};

/**
 * Real-time subscription to cases in Firestore with local cache fallback
 */
export const subscribeToCases = (callback: (cases: FirestoreCaseDocket[]) => void): () => void => {
  // Initially provide cached or default cases
  callback(getLocalCasesCache());

  try {
    const q = query(collection(db, CASES_COLLECTION));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetched: FirestoreCaseDocket[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as FirestoreCaseDocket));
        saveLocalCasesCache(fetched);
        callback(fetched);
      }
    }, (error) => {
      console.warn('Firestore subscription error, using local cache:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.warn('Failed to setup Firestore subscription:', error);
    return () => {};
  }
};


/**
 * Verify a specific testimony/transcript by a Judge, updating case status to 'Partially Heard' and alerting coordinator
 */
export const verifyTestimonyInFirestore = async (
  caseId: string,
  testimonyId: string,
  judgeName: string,
  witnessName?: string
): Promise<{ success: boolean; message: string }> => {
  const timestampIso = new Date().toISOString();
  
  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    
    // Update the case status to 'partially_heard'
    await updateDoc(docRef, {
      currentStage: 'partially_heard',
      updatedAt: timestampIso,
      notes: `⚖️ Ragaan (${witnessName || testimonyId}) Abbaa Seeraa ${judgeName} tiin mirkanaa'eera. Haalli galmee gara 'Gartokkoon Dhaga’ame' (Partially Heard) tti jijjiirameera.`
    });

    // Notify the Court Coordinator
    await createCourtNotification({
      type: 'status_update',
      title: `⚖️ Ragaan Mirkanaa'e (Testimony Verified)`,
      body: `Abbaan Seeraa ${judgeName} ragaa galmee ${caseId} irratti dhiyaate mirkaneesseera. Galmeen amma 'Partially Heard' dha.`,
      recipientRole: 'coordinator',
      recipientName: 'Qindeessaa Galmee KTAS',
      caseId,
      urgency: 'medium',
      isRead: false
    });

    // Update local cache
    const currentList = getLocalCasesCache();
    const updatedList = currentList.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          currentStage: 'partially_heard' as const,
          updatedAt: timestampIso,
          notes: `⚖️ Ragaan (${witnessName || testimonyId}) Abbaa Seeraa ${judgeName} tiin mirkanaa'eera. Haalli galmee gara 'Gartokkoon Dhaga’ame' tti jijjiirameera.`
        };
      }
      return c;
    });
    saveLocalCasesCache(updatedList);

    return { success: true, message: 'Testimony verified and case status updated to Partially Heard.' };
  } catch (error) {
    console.error('Error verifying testimony:', error);
    return { success: false, message: 'Failed to verify testimony in Firestore.' };
  }
};


/**
 * Update case attendance record in Firestore (Auto-fill/Self-register)
 */
export const updateCaseAttendanceRecord = async (
  caseId: string,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    await updateDoc(docRef, {
      attendanceRecord: arrayUnion(userId)
    });
  } catch (error) {
    console.error('Failed to update attendance record:', error);
  }
};

/**
 * Fetch a single case by ID from Firestore (with local cache fallback)
 */
export const getCaseByIdFromFirestore = async (caseId: string): Promise<FirestoreCaseDocket | null> => {
  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as FirestoreCaseDocket;
    }
    
    // Fallback to local cache
    const cached = getLocalCasesCache();
    return cached.find(c => c.id === caseId) || null;
  } catch (error) {
    console.warn('Firestore getDoc failed, checking local cache:', error);
    const cached = getLocalCasesCache();
    return cached.find(c => c.id === caseId) || null;
  }
};

/**
 * Dispatch First Summons (Waamicha Himatamaa 1ffaa) by Legal Officer (Ofiisara Seeraa)
 * Compliant with Ethiopian Civil Procedure Code (SDFHH Kwt 94-110)
 */
export const dispatchFirstSummonsInFirestore = async (
  caseId: string,
  details: {
    dispatchedBy: string;
    method: 'court_process_server' | 'postal_registered' | 'police_assistance' | 'digital_telegram_sms' | string;
    trackingNumber: string;
    serverName?: string;
    targetAddress?: string;
    hearingDate: string;
    notes?: string;
  }
): Promise<{ success: boolean; message: string }> => {
  const timestampIso = new Date().toISOString();

  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    await updateDoc(docRef, {
      firstSummonsStatus: 'served',
      currentStage: 'first_summons',
      firstSummonsDispatchedAt: timestampIso,
      firstSummonsDispatchedBy: details.dispatchedBy,
      firstSummonsMethod: details.method,
      firstSummonsTrackingNo: details.trackingNumber,
      firstSummonsServerName: details.serverName || 'Ergaa Mana Murtii',
      firstSummonsAddress: details.targetAddress || 'Teessoo Himatamaa',
      nextHearingDate: details.hearingDate,
      updatedAt: timestampIso
    });
  } catch (error) {
    console.warn('Firestore summons dispatch update deferred, syncing local cache:', error);
  }

  // Record into case activity_logs subcollection
  try {
    await addCaseActivityLog(caseId, {
      action: 'status_changed',
      title: 'Waamichi Himatamaa 1ffaa Ergameera (1st Court Summons Dispatched)',
      description: `Waraaqaan waamicha himatamaa 1ffaa (SDFHH Kwt 94-110) ofiisara seeraatiin (${details.dispatchedBy}) qaama dhimmi ilaallatuuf ergameera. Akkaataa: ${details.method}, Lakk. Ergaa: ${details.trackingNumber}, Guyyaa Beellama Deebii: ${details.hearingDate}.`,
      performedBy: details.dispatchedBy,
      performedByRole: 'Ofiisara Seeraa / Legal Officer',
      details: {
        trackingNumber: details.trackingNumber,
        method: details.method,
        serverName: details.serverName,
        hearingDate: details.hearingDate
      }
    });
  } catch (err) {
    console.warn('Activity log for summons dispatch skipped:', err);
  }

  // Update local cache
  const cached = getLocalCasesCache();
  const updated = cached.map(c => {
    if (c.id === caseId) {
      return {
        ...c,
        firstSummonsStatus: 'served' as const,
        currentStage: 'first_summons' as const,
        firstSummonsDispatchedAt: timestampIso,
        firstSummonsDispatchedBy: details.dispatchedBy,
        firstSummonsMethod: details.method,
        firstSummonsTrackingNo: details.trackingNumber,
        firstSummonsServerName: details.serverName || 'Ergaa Mana Murtii',
        firstSummonsAddress: details.targetAddress || 'Teessoo Himatamaa',
        nextHearingDate: details.hearingDate,
        updatedAt: timestampIso
      };
    }
    return c;
  });
  saveLocalCasesCache(updated);

  return {
    success: true,
    message: `Waamichi Himatamaa 1ffaa milkaa'inaan ergameera! Lakk. Ergaa: ${details.trackingNumber}.`
  };
};

