import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';

export type CaseProcedureType = 'criminal' | 'civil';
export type MilestoneStatus = 'completed' | 'in_progress' | 'pending' | 'flagged';

export interface StageDocumentAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize?: string;
  uploadDate: string;
  orderTitle: string;
  orderType: 'court_order' | 'summons' | 'verdict' | 'bail_receipt' | 'police_report' | 'evidence_doc';
  fileUrl?: string;
  notes?: string;
}

export interface MilestoneStage {
  id: string;
  stageNumber: number;
  title: { om: string; am: string; en: string };
  description: { om: string; am: string; en: string };
  proceduralGrounds: { om: string; am: string; en: string };
  status: MilestoneStatus;
  targetDeadline?: string;
  completedDate?: string;
  assignedOfficer?: string;
  notes?: string;
  attachments?: StageDocumentAttachment[];
  estimatedDays?: number;
  actualDays?: number;
}

export interface MilestoneAuditLog {
  id: string;
  stageId: string;
  stageTitle: { om: string; am: string; en: string };
  previousStatus?: MilestoneStatus;
  newStatus: MilestoneStatus;
  updatedAt: string;
  updatedBy?: string;
  userRole?: string;
  notes?: string;
  docketNumber?: string;
}

export interface CaseMilestoneProgress {
  caseNumber: string;
  caseTitle?: string;
  procedureType: CaseProcedureType;
  currentStageId: string;
  stages: MilestoneStage[];
  updatedAt: string;
  presidingJudge?: string;
  docketNumber?: string;
  partiesInvolved?: {
    claimant?: string;
    defendant?: string;
  };
  auditLogs?: MilestoneAuditLog[];
}

const LOCAL_STORAGE_KEY = 'seera_case_milestones_cache';

/**
 * Default Criminal Procedure Stages (Seera Adeemsa Falmii Yakkaa)
 */
export const DEFAULT_CRIMINAL_STAGES: MilestoneStage[] = [
  {
    id: 'crim-1',
    stageNumber: 1,
    title: {
      om: '1. Iyyannoo & Qorannoo Police',
      am: '1. አቤቱታ እና የፖሊስ ምርመራ',
      en: '1. Complaint & Police Investigation',
    },
    description: {
      om: 'Gabaasa yakkaa galmeessuu, ragaalee jalqabaa walitti qabuu fi shakkamaa qabuu.',
      am: 'የወንጀል ሪፖርት መመዝገብ፣ የመጀመሪያ ደረጃ ማስረጃዎችን መሰብሰብ እና ተጠርጣሪውን መያዝ።',
      en: 'Filing criminal complaint, collecting initial evidence, and suspect custody.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Yakkaa Kwt 11-21 • Proclamation No. 1410/2026',
      am: 'የወንጀለኛ መቅጫ ሥነ-ሥርዓት ሕግ አንቀጽ 11-21',
      en: 'Criminal Procedure Code Articles 11-21',
    },
    status: 'completed',
    completedDate: '2026-10-15',
    assignedOfficer: 'Inspekteer Saaraa Baqqalaa',
    notes: 'Qorannoon jalqabaa xumuramee galmeen Abbaa Alangaaf ergameera.',
    attachments: [
      {
        id: 'doc-crim-101',
        fileName: 'Gabaasa_Qorannoo_Poolisii_Galmee_102.pdf',
        fileType: 'application/pdf',
        fileSize: '1.8 MB',
        uploadDate: '2026-10-15',
        orderTitle: 'Gabaasa Jalqabaa Qorannoo Poolisii (Initial Police Docket Report)',
        orderType: 'police_report',
        notes: 'Sanada ragaalee fi jecha shakkamaa jalqabaa hammata.',
      },
    ],
  },
  {
    id: 'crim-2',
    stageNumber: 2,
    title: {
      om: '2. Waamicha & Dhihaannoo Jalqabaa',
      am: '2. መጥሪያ እና የመጀመሪያ ቀረብ',
      en: '2. Summons & First Appearance',
    },
    description: {
      om: 'Waamicha mana murtii tajaajiluu, mirga wabii murteessuu fi shakkamaa manatti dhiyeessuu.',
      am: 'የፍርድ ቤት መጥሪያ ማድረስ፣ የዋስትና መብትን መወሰን እና ተጠርጣሪውን ፍርድ ቤት ማቅረብ።',
      en: 'Serving summons, determining bail status, and initial bench appearance.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Yakkaa Kwt 59-63 (Mirga Wabii)',
      am: 'የወንጀለኛ መቅጫ ሥነ-ሥርዓት ሕግ አንቀጽ 59-63 (የዋስትና መብት)',
      en: 'Criminal Procedure Code Articles 59-63 (Bail Application)',
    },
    status: 'completed',
    completedDate: '2026-10-22',
    assignedOfficer: 'Registraara Mana Murtii',
    notes: 'Himatamaan wabiin birrii 50,000n akka gadhiifamu murtaa\'eera.',
    attachments: [
      {
        id: 'doc-crim-102',
        fileName: 'Ajaja_Mana_Murtii_Mirga_Wabii_SNQ.pdf',
        fileType: 'application/pdf',
        fileSize: '2.4 MB',
        uploadDate: '2026-10-22',
        orderTitle: 'Ajaja Dhaddacha Mirga Wabii (Bench Bail Grant Order)',
        orderType: 'court_order',
        notes: 'Wabiin Birrii 50,000 kaffalamee nagaheen galmeef walitti qabameera.',
      },
    ],
  },
  {
    id: 'crim-3',
    stageNumber: 3,
    title: {
      om: '3. Tarree Himannaa & Deebii Himatamaa',
      am: '3. የክስ መዝገብ እና የተከሳሽ መልስ',
      en: '3. Formal Charge & Defendant Plea',
    },
    description: {
      om: 'Abbaan Alangaa tarree himannaa dubbiseera; himatamaan yakka raawwachuu/hin raawwanne jechuun deebii kenneera.',
      am: 'ዐቃቤ ሕግ የክስ ቻርተር አቅርቧል፤ ተከሳሹ ጥፋተኛ ነኝ/አይደለሁም በማለት መልስ ሰጥቷል።',
      en: 'Formal reading of charge sheet by public prosecutor and defendant plea recording.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Yakkaa Kwt 129-132',
      am: 'የወንጀለኛ መቅጫ ሥነ-ሥርዓት ሕግ አንቀጽ 129-132',
      en: 'Criminal Procedure Code Articles 129-132',
    },
    status: 'in_progress',
    targetDeadline: '2026-11-08',
    assignedOfficer: 'Abbaa Alangaa & Abbaa Seeraa',
    notes: 'Himatamaan yakka raawwachuu isaanii waan gananiif dhaddachi ragaaf beellamameera.',
  },
  {
    id: 'crim-4',
    stageNumber: 4,
    title: {
      om: '4. Dhaddacha Ragaalee & Qorannoo',
      am: '4. የምስክሮች ሰማዕትነት እና ምርመራ',
      en: '4. Evidence & Witness Examination',
    },
    description: {
      om: 'Jecha ragaa Abbaa Alangaa fi ragaa ittisaa dhaga\'uu, Sanadoota madaaluu fi qorannoo geggeessuu.',
      am: 'የዐቃቤ ሕግ እና የተከሳሽ ምስክሮችን ቃል መስማት፣ የሰነድ ማስረጃዎችን መመርመር።',
      en: 'Hearing prosecution and defense witness testimonies, cross-examination, and document evaluation.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Yakkaa Kwt 140-148',
      am: 'የወንጀለኛ መቅጫ ሥነ-ሥርዓት ሕግ አንቀጽ 140-148',
      en: 'Criminal Procedure Code Articles 140-148',
    },
    status: 'pending',
    targetDeadline: '2026-11-20',
    assignedOfficer: 'Bench Judge & Registraara',
  },
  {
    id: 'crim-5',
    stageNumber: 5,
    title: {
      om: '5. Murtii Dhaddachaa (Verdict)',
      am: '5. የፍርድ ውሳኔ (Verdict)',
      en: '5. Bench Verdict & Deliberation',
    },
    description: {
      om: 'Dhaddachi ragaalee madaalee ballaa ykn yakkaamaa ta\'uu murteessu.',
      am: 'ፍርድ ቤቱ ማስረጃዎችን መዝኖ ነፃ የመውጣት ወይም የጥፋተኝነት ውሳኔ ይሰጣል።',
      en: 'Judicial evaluation of evidence leading to guilty or acquitted verdict.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Yakkaa Kwt 149',
      am: 'የወንጀለኛ መቅጫ ሥነ-ሥርዓት ሕግ አንቀጽ 149',
      en: 'Criminal Procedure Code Article 149',
    },
    status: 'pending',
  },
  {
    id: 'crim-6',
    stageNumber: 6,
    title: {
      om: '6. Murtee Adabbii & Ol\'iyyata',
      am: '6. የቅጣት ውሳኔ እና ይግባኝ',
      en: '6. Sentencing & Appeal Execution',
    },
    description: {
      om: 'Murtee adabbii dabarsuu, galmee cufuu fi mirga ol\'iyyataa mirkaneessuu.',
      am: 'የቅጣት ውሳኔ ማሳለፍ፣ መዝገቡን መዝጋት እና የይግባኝ መብትን ማረጋገጥ።',
      en: 'Pronouncement of sentence, case closure, and appeal filing window.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Yakkaa Kwt 151-180',
      am: 'የወንጀለኛ መቅጫ ሥነ-ሥርዓት ሕግ አንቀጽ 151-180',
      en: 'Criminal Procedure Code Articles 151-180',
    },
    status: 'pending',
  },
];

/**
 * Default Civil Procedure Stages (Seera Adeemsa Falmii Hariiroo Hawaasaa)
 */
export const DEFAULT_CIVIL_STAGES: MilestoneStage[] = [
  {
    id: 'civ-1',
    stageNumber: 1,
    title: {
      om: '1. Baninsa Galmee & Baasii Kaffaltii',
      am: '1. መዝገብ መክፈት እና የዳኝነት ክፍያ',
      en: '1. Plaint Filing & Fee Receipt Verification',
    },
    description: {
      om: 'Iyyannoo Hariiroo Hawaasaa dhiyeessuu, nagahee kaffaltii baankii mirkaneessuu fi galmee banuu.',
      am: 'የፍትሐብሔር አቤቱታ ማቅረብ፣ የዳኝነት ክፍያ ደረሰኝ ማረጋገጥ እና መዝገብ መክፈት።',
      en: 'Filing civil statement of claim, verifying court fee payment, and docket opening.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Hariiroo Hawaasaa Kwt 222-229',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 222-229',
      en: 'Civil Procedure Code Articles 222-229',
    },
    status: 'completed',
    completedDate: '2026-10-12',
    assignedOfficer: 'Registraara Mana Murtii',
    notes: 'Kaffaltiin baasii murtii nagahee SNQ-2026-88123 n kaffalamee mirkanaa\'eera.',
  },
  {
    id: 'civ-2',
    stageNumber: 2,
    title: {
      om: '2. Waamicha & Deebii Himatamaa',
      am: '2. መጥሪያ ማድረስ እና የተከሳሽ መልስ',
      en: '2. Service of Summons & Defense Written Response',
    },
    description: {
      om: 'Waamicha fi kopiidhaan iyyannoo himatamaaf gahuu, deebii barreeffamaa galcheessuu.',
      am: 'መጥሪያ እና የአቤቱታ ቅጅ ለተከሳሽ ማድረስ፣ የጽሑፍ መልስ መመዝገብ።',
      en: 'Serving court summons with copy of plaint to defendant and receiving written statement of defense.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Hariiroo Hawaasaa Kwt 233-241',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 233-241',
      en: 'Civil Procedure Code Articles 233-241',
    },
    status: 'completed',
    completedDate: '2026-10-28',
    assignedOfficer: 'Ofiisara Dhiheessa Waamichaa',
    notes: 'Himatamaan deebii barreeffamaa isaanii kaleessa galmeessaniiru.',
  },
  {
    id: 'civ-3',
    stageNumber: 3,
    title: {
      om: '3. Qabxii Falmii Qabachuun Jalqabaa',
      am: '3. የጭብጥ አመራረጥ እና የመጀመሪያ ደረጃ መቃወሚያ',
      en: '3. Preliminary Objections & Issue Framing',
    },
    description: {
      om: 'Mormii jalqabaa (yergoo darbiinsa, aangoo) qorachuun qabxii falmii ijoo qabachuu.',
      am: 'የመጀመሪያ ደረጃ መቃወሚያዎችን መመርመር እና ዋና ዋና የጭብጥ ነጥቦችን መቅረጽ።',
      en: 'Evaluating preliminary legal objections (limitation, jurisdiction) and framing triable issues.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Hariiroo Hawaasaa Kwt 242-256',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 242-256',
      en: 'Civil Procedure Code Articles 242-256',
    },
    status: 'in_progress',
    targetDeadline: '2026-11-10',
    assignedOfficer: 'Abbaa Seeraa Dhaddachaa',
    notes: 'Mormiin yergoo darbiinsaa dhiyaate dhaddacha boruu irratti qoratama.',
  },
  {
    id: 'civ-4',
    stageNumber: 4,
    title: {
      om: '4. Dhaddacha Ragaalee Iyyataa & Himatamaa',
      am: '4. የከሳሽ እና የተከሳሽ ምስክሮች ሰማዕትነት',
      en: '4. Plaintiff & Defense Evidence Hearing',
    },
    description: {
      om: 'Ragaa namaa fi sanadaa qaamolee lamaanii dhaga\'uu fi madaaluu.',
      am: 'የሁለቱም ወገኖች የሰው እና የሰነድ ማስረጃዎችን መስማት እና መመዘን።',
      en: 'Presentation and cross-examination of plaintiff and defense witnesses and documents.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Hariiroo Hawaasaa Kwt 260-273',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 260-273',
      en: 'Civil Procedure Code Articles 260-273',
    },
    status: 'pending',
    targetDeadline: '2026-11-25',
    assignedOfficer: 'Bench Judge',
  },
  {
    id: 'civ-5',
    stageNumber: 5,
    title: {
      om: '5. Murtii Boodaa & Xumura Dhaddachaa',
      am: '5. የመጨረሻ ውሳኔ እና ፍርድ',
      en: '5. Closing Arguments & Final Judgment',
    },
    description: {
      om: 'Yaada xumuraa dhaga\'uun murtii seeraa fi hariiroo haqaa kennuu.',
      am: 'የመጨረሻ ሀሳቦችን መስማት እና ህጋዊ ፍርድ መስጠት።',
      en: 'Final oral arguments, bench deliberation, and binding civil judgment.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Hariiroo Hawaasaa Kwt 180-191',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 180-191',
      en: 'Civil Procedure Code Articles 180-191',
    },
    status: 'pending',
  },
  {
    id: 'civ-6',
    stageNumber: 6,
    title: {
      om: '6. Raawwii Murtii & Ol\'iyyata',
      am: '6. የውሳኔ አፈፃፀም እና ይግባኝ',
      en: '6. Decree Execution & Appeal Process',
    },
    description: {
      om: 'Waraqaa raawwii murtii baasuu, qabeenya qabsiisuu fi mirga ol\'iyyataa hordofuu.',
      am: 'የአፈፃፀም ትዕዛዝ ማውጣት እና የይግባኝ ሂደትን መከታተል።',
      en: 'Execution decree issuance, attachment of property, and appeal compliance.',
    },
    proceduralGrounds: {
      om: 'Seera Adeemsa Falmii Hariiroo Hawaasaa Kwt 378-400',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 378-400',
      en: 'Civil Procedure Code Articles 378-400',
    },
    status: 'pending',
  },
];

/**
 * Reads cached milestone progress from localStorage
 */
export function getCachedCaseMilestones(caseNumber: string): CaseMilestoneProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${caseNumber}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[caseMilestoneService] Read local cache failed:', e);
  }
  return null;
}

/**
 * Saves milestone progress to localStorage cache
 */
export function saveCachedCaseMilestones(progress: CaseMilestoneProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${progress.caseNumber}`, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent('seera_case_milestones_updated', { detail: progress }));
  } catch (e) {
    console.warn('[caseMilestoneService] Write local cache failed:', e);
  }
}

/**
 * Force-refresh sync mechanism for Courtroom milestone tracker:
 * Triggers an immediate, non-redundant state update in the UI without re-fetching entire case objects.
 */
export function forceRefreshCaseMilestones(caseNumber: string, progress: CaseMilestoneProgress): CaseMilestoneProgress {
  if (typeof window === 'undefined') return progress;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${caseNumber}`, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent('seera_case_milestones_force_refresh', { detail: progress }));
  } catch (e) {
    console.warn('[caseMilestoneService] Force refresh sync failed:', e);
  }
  return progress;
}

/**
 * Initializes or fetches case milestones for a docket number
 */
export async function fetchCaseMilestoneProgress(
  caseNumber: string,
  preferredProcedure: CaseProcedureType = 'criminal',
  caseTitle?: string
): Promise<CaseMilestoneProgress> {
  const cached = getCachedCaseMilestones(caseNumber);
  if (cached) return cached;

  // Try Firestore fetch
  if (db) {
    try {
      const docRef = doc(db, 'case_milestones', caseNumber.replace(/[/\\?%*:|"<>]/g, '_'));
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as CaseMilestoneProgress;
        saveCachedCaseMilestones(data);
        return data;
      }
    } catch (e) {
      console.info('[caseMilestoneService] Firestore fetch fallback to local defaults');
    }
  }

  // Create default initial progress
  const defaultStages = preferredProcedure === 'criminal' 
    ? DEFAULT_CRIMINAL_STAGES 
    : DEFAULT_CIVIL_STAGES;

  const initialProgress: CaseMilestoneProgress = {
    caseNumber,
    caseTitle: caseTitle || (preferredProcedure === 'criminal' ? 'Abbaa Alangaa vs Gemechu Tadesse' : 'Waliigaltee Daldalaa vs Bashaattu'),
    procedureType: preferredProcedure,
    currentStageId: preferredProcedure === 'criminal' ? 'crim-3' : 'civ-3',
    stages: defaultStages,
    updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    docketNumber: caseNumber,
    presidingJudge: 'Abbaa Seeraa Kasaahun Dambal',
    partiesInvolved: preferredProcedure === 'criminal' 
      ? { claimant: 'Abbaa Alangaa (Prosecutor)', defendant: 'Gemechu Tadesse' }
      : { claimant: 'Aberraa Fiqaaduu (Iyyataa)', defendant: 'Bashaattu Wandimmuu (Himatamaa)' },
  };

  saveCachedCaseMilestones(initialProgress);
  return initialProgress;
}

/**
 * Validates whether a given docket number matches standard Ethiopian court record formats.
 * Valid examples: CR-2026-99812, CIV/2026/88123, FED-CR-2026-102, L/G-44512-2018, GAL-2026-991
 */
export function validateEthiopianDocketNumber(docketNumber: string): { isValid: boolean; errorMsg?: string } {
  const trimmed = docketNumber.trim();
  if (!trimmed) {
    return { 
      isValid: false, 
      errorMsg: 'Lakk. Galmee duwwaa ta\'uu hin danda\'u / Docket number cannot be empty.' 
    };
  }

  // Must contain digits and follow standard prefix-year-number or registration structure
  const hasDigits = /\d/.test(trimmed);
  const standardPattern = /^([A-Z]{2,6}[-\/])?([A-Z]{2,4}[-\/])?[0-9]{4}[-\/][0-9]{3,8}$/i;
  const flexiblePattern = /^[A-Z0-9\/ -]{4,30}$/i;

  if (!hasDigits || (!standardPattern.test(trimmed) && !flexiblePattern.test(trimmed))) {
    return {
      isValid: false,
      errorMsg: 'Format Lakk. Galmee sirrii miti! Fakkeenya: CR-2026-99812 ykn CIV/2026/88123 / Invalid Ethiopian docket format (e.g., CR-2026-99812 or CIV/2026/88123).'
    };
  }

  return { isValid: true };
}

/**
 * Updates case-specific metadata (docket number, presiding judge, parties involved) and syncs to Firestore + local cache
 */
export async function updateCaseMetadata(
  caseNumber: string,
  metadata: {
    docketNumber?: string;
    presidingJudge?: string;
    claimant?: string;
    defendant?: string;
  }
): Promise<CaseMilestoneProgress> {
  if (metadata.docketNumber) {
    const val = validateEthiopianDocketNumber(metadata.docketNumber);
    if (!val.isValid) {
      throw new Error(val.errorMsg || 'Invalid Ethiopian Docket Number format');
    }
  }

  let progress = await fetchCaseMilestoneProgress(caseNumber);

  const updatedProgress: CaseMilestoneProgress = {
    ...progress,
    docketNumber: metadata.docketNumber !== undefined ? metadata.docketNumber.trim() : progress.docketNumber,
    presidingJudge: metadata.presidingJudge !== undefined ? metadata.presidingJudge.trim() : progress.presidingJudge,
    partiesInvolved: {
      claimant: metadata.claimant !== undefined ? metadata.claimant.trim() : progress.partiesInvolved?.claimant,
      defendant: metadata.defendant !== undefined ? metadata.defendant.trim() : progress.partiesInvolved?.defendant,
    },
    updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };

  forceRefreshCaseMilestones(caseNumber, updatedProgress);

  if (db) {
    try {
      const docRef = doc(db, 'case_milestones', caseNumber.replace(/[/\\?%*:|"<>]/g, '_'));
      await setDoc(docRef, updatedProgress, { merge: true });
    } catch (e) {
      console.warn('[caseMilestoneService] Firestore update metadata failed, cached locally');
    }
  }

  return updatedProgress;
}



/**
 * Updates stage status or procedure type and syncs to Firestore + local cache
 */
export async function updateMilestoneStageStatus(
  caseNumber: string,
  stageId: string,
  newStatus: MilestoneStatus,
  notes?: string,
  updatedBy?: string,
  userRole?: string
): Promise<CaseMilestoneProgress> {
  let progress = await fetchCaseMilestoneProgress(caseNumber);

  const targetStage = progress.stages.find((s) => s.id === stageId);
  const previousStatus = targetStage?.status;

  const updatedStages = progress.stages.map((stg) => {
    if (stg.id === stageId) {
      return {
        ...stg,
        status: newStatus,
        completedDate: newStatus === 'completed' ? new Date().toISOString().slice(0, 10) : stg.completedDate,
        notes: notes !== undefined ? notes : stg.notes,
      };
    }
    return stg;
  });

  // Calculate active currentStageId
  const inProgressStage = updatedStages.find((s) => s.status === 'in_progress');
  const pendingStage = updatedStages.find((s) => s.status === 'pending');
  const activeStageId = inProgressStage?.id || pendingStage?.id || updatedStages[updatedStages.length - 1].id;

  const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const newAuditLog: MilestoneAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    stageId,
    stageTitle: targetStage?.title || { om: stageId, am: stageId, en: stageId },
    previousStatus,
    newStatus,
    updatedAt: nowTimestamp,
    updatedBy: updatedBy || 'Abbaa Seeraa / Court Officer',
    userRole: userRole || 'Registrar & Bench Staff',
    notes: notes !== undefined ? notes : targetStage?.notes,
    docketNumber: progress.docketNumber || progress.caseNumber,
  };

  const existingLogs = progress.auditLogs || [];
  const updatedProgress: CaseMilestoneProgress = {
    ...progress,
    currentStageId: activeStageId,
    stages: updatedStages,
    auditLogs: [newAuditLog, ...existingLogs],
    updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };

  forceRefreshCaseMilestones(caseNumber, updatedProgress);

  if (db) {
    try {
      const docRef = doc(db, 'case_milestones', caseNumber.replace(/[/\\?%*:|"<>]/g, '_'));
      await setDoc(docRef, updatedProgress, { merge: true });
    } catch (e) {
      console.warn('[caseMilestoneService] Firestore update milestone failed, cached locally');
    }
  }

  return updatedProgress;
}

/**
 * Switches procedure type (Criminal <-> Civil) for a case docket
 */
export async function switchCaseProcedureType(
  caseNumber: string,
  newProcedure: CaseProcedureType
): Promise<CaseMilestoneProgress> {
  const defaultStages = newProcedure === 'criminal' ? DEFAULT_CRIMINAL_STAGES : DEFAULT_CIVIL_STAGES;
  const updatedProgress: CaseMilestoneProgress = {
    caseNumber,
    procedureType: newProcedure,
    currentStageId: newProcedure === 'criminal' ? 'crim-3' : 'civ-3',
    stages: defaultStages,
    updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };

  forceRefreshCaseMilestones(caseNumber, updatedProgress);

  if (db) {
    try {
      const docRef = doc(db, 'case_milestones', caseNumber.replace(/[/\\?%*:|"<>]/g, '_'));
      await setDoc(docRef, updatedProgress, { merge: true });
    } catch (e) {
      console.warn('[caseMilestoneService] Firestore procedure switch failed');
    }
  }

  return updatedProgress;
}

/**
 * Attaches a scanned court order / document PDF to a specific milestone stage and syncs to Firestore & local storage
 */
export async function attachDocumentToStage(
  caseNumber: string,
  stageId: string,
  attachment: {
    fileName: string;
    fileType: string;
    fileSize?: string;
    orderTitle: string;
    orderType: 'court_order' | 'summons' | 'verdict' | 'bail_receipt' | 'police_report' | 'evidence_doc';
    fileUrl?: string;
    notes?: string;
  }
): Promise<CaseMilestoneProgress> {
  const progress = await fetchCaseMilestoneProgress(caseNumber);

  const newAttachment: StageDocumentAttachment = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    uploadDate: new Date().toISOString().slice(0, 10),
    ...attachment,
  };

  const updatedStages = progress.stages.map((stg) => {
    if (stg.id === stageId) {
      const existing = stg.attachments || [];
      return {
        ...stg,
        attachments: [newAttachment, ...existing],
      };
    }
    return stg;
  });

  const updatedProgress: CaseMilestoneProgress = {
    ...progress,
    stages: updatedStages,
    updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };

  forceRefreshCaseMilestones(caseNumber, updatedProgress);

  if (db) {
    try {
      const docRef = doc(db, 'case_milestones', caseNumber.replace(/[/\\?%*:|"<>]/g, '_'));
      await setDoc(docRef, updatedProgress, { merge: true });
    } catch (e) {
      console.warn('[caseMilestoneService] Firestore attach document failed, cached locally');
    }
  }

  return updatedProgress;
}

/**
 * Removes a document attachment from a milestone stage
 */
export async function removeDocumentFromStage(
  caseNumber: string,
  stageId: string,
  attachmentId: string
): Promise<CaseMilestoneProgress> {
  const progress = await fetchCaseMilestoneProgress(caseNumber);

  const updatedStages = progress.stages.map((stg) => {
    if (stg.id === stageId && stg.attachments) {
      return {
        ...stg,
        attachments: stg.attachments.filter((doc) => doc.id !== attachmentId),
      };
    }
    return stg;
  });

  const updatedProgress: CaseMilestoneProgress = {
    ...progress,
    stages: updatedStages,
    updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };

  forceRefreshCaseMilestones(caseNumber, updatedProgress);

  if (db) {
    try {
      const docRef = doc(db, 'case_milestones', caseNumber.replace(/[/\\?%*:|"<>]/g, '_'));
      await setDoc(docRef, updatedProgress, { merge: true });
    } catch (e) {
      console.warn('[caseMilestoneService] Firestore remove document failed, cached locally');
    }
  }

  return updatedProgress;
}

/**
 * Seeded Ethiopian court benchmark cases for instant discovery and milestone tracking
 */
export const BENCHMARK_CASES: CaseMilestoneProgress[] = [
  {
    caseNumber: 'CR-2026-99812',
    docketNumber: 'CR-2026-99812',
    caseTitle: 'Abbaa Alangaa vs Gemechu Tadesse',
    procedureType: 'criminal',
    currentStageId: 'crim-3',
    stages: DEFAULT_CRIMINAL_STAGES,
    updatedAt: '2026-10-28 14:30',
    presidingJudge: 'Abbaa Seeraa Kasaahun Dambal',
    partiesInvolved: {
      claimant: 'Abbaa Alangaa (Prosecutor)',
      defendant: 'Gemechu Tadesse',
    },
  },
  {
    caseNumber: 'CIV/2026/88123',
    docketNumber: 'CIV/2026/88123',
    caseTitle: 'Waliigaltee Daldalaa vs Bashaattu',
    procedureType: 'civil',
    currentStageId: 'civ-3',
    stages: DEFAULT_CIVIL_STAGES,
    updatedAt: '2026-10-29 09:15',
    presidingJudge: 'Abbaa Seeraa Tolasaa Guutaa',
    partiesInvolved: {
      claimant: 'Aberraa Fiqaaduu (Iyyataa)',
      defendant: 'Bashaattu Wandimmuu (Himatamaa)',
    },
  },
  {
    caseNumber: 'FED-CR-2026-102',
    docketNumber: 'FED-CR-2026-102',
    caseTitle: 'Malaammaltummaa & Qabeenya Seeraan Alaa',
    procedureType: 'criminal',
    currentStageId: 'crim-4',
    stages: DEFAULT_CRIMINAL_STAGES,
    updatedAt: '2026-10-30 11:20',
    presidingJudge: 'Abbaa Seeraa Masarat Alamuu',
    partiesInvolved: {
      claimant: 'Komishinii Naamusaa fi Farra Malaammaltummaa',
      defendant: 'Dajanee Zawudee',
    },
  },
  {
    caseNumber: 'L/G-44512-2018',
    docketNumber: 'L/G-44512-2018',
    caseTitle: 'Falmii Qabeenya Dhaalaa fi Lafa Baadiyyaa',
    procedureType: 'civil',
    currentStageId: 'civ-2',
    stages: DEFAULT_CIVIL_STAGES,
    updatedAt: '2026-10-25 16:45',
    presidingJudge: 'Abbaa Seeraa Caalaa Margaa',
    partiesInvolved: {
      claimant: 'Hawwii Tasfaayee (Iyyattuu)',
      defendant: 'Zawudee Abbabaa (Himatamaa)',
    },
  },
  {
    caseNumber: 'GAL-2026-991',
    docketNumber: 'GAL-2026-991',
    caseTitle: 'Falmii Mirga Hojjetootaa fi Dhaabbata Warshaa',
    procedureType: 'civil',
    currentStageId: 'civ-4',
    stages: DEFAULT_CIVIL_STAGES,
    updatedAt: '2026-11-01 10:00',
    presidingJudge: 'Abbaa Seeraa Birhaanuu Galaan',
    partiesInvolved: {
      claimant: 'Waldaa Hojjetootaa (Workers Union)',
      defendant: 'Dhaabbata Qilleensaa fi Warshaa',
    },
  },
  {
    caseNumber: 'CR-2026-77201',
    docketNumber: 'CR-2026-77201',
    caseTitle: 'Hanna Qabeenyaa fi Dokumantii Soobaa',
    procedureType: 'criminal',
    currentStageId: 'crim-2',
    stages: DEFAULT_CRIMINAL_STAGES,
    updatedAt: '2026-10-20 15:00',
    presidingJudge: 'Abbaa Seeraa Daawit Baqqalaa',
    partiesInvolved: {
      claimant: 'Abbaa Alangaa Bulchiinsa Magaalaa',
      defendant: 'Tooftaa Kabbadaa',
    },
  },
];

/**
 * Returns all known cases from local cache and benchmark Ethiopian cases
 */
export function getKnownCases(): CaseMilestoneProgress[] {
  const caseMap = new Map<string, CaseMilestoneProgress>();

  // 1. Add benchmarks
  for (const bCase of BENCHMARK_CASES) {
    caseMap.set(bCase.caseNumber, bCase);
  }

  // 2. Scan localStorage for user-modified or created cases
  if (typeof window !== 'undefined') {
    try {
      const prefix = `${LOCAL_STORAGE_KEY}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed: CaseMilestoneProgress = JSON.parse(raw);
              if (parsed?.caseNumber) {
                caseMap.set(parsed.caseNumber, parsed);
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('[caseMilestoneService] Error reading cached cases:', e);
    }
  }

  return Array.from(caseMap.values());
}

/**
 * Searches across known cases by docket number, claimant, defendant, case title, or judge
 */
export function searchKnownCases(queryStr: string): CaseMilestoneProgress[] {
  const allCases = getKnownCases();
  const trimmed = (queryStr || '').trim().toLowerCase();

  if (!trimmed) {
    return allCases.slice(0, 6);
  }

  return allCases.filter((item) => {
    const docket = (item.docketNumber || item.caseNumber || '').toLowerCase();
    const title = (item.caseTitle || '').toLowerCase();
    const claimant = (item.partiesInvolved?.claimant || '').toLowerCase();
    const defendant = (item.partiesInvolved?.defendant || '').toLowerCase();
    const judge = (item.presidingJudge || '').toLowerCase();

    return (
      docket.includes(trimmed) ||
      title.includes(trimmed) ||
      claimant.includes(trimmed) ||
      defendant.includes(trimmed) ||
      judge.includes(trimmed)
    );
  });
}

/**
 * Fetches detailed timestamped audit logs from Firestore for a specific case milestone.
 */
export async function fetchMilestoneAuditLogsFromFirestore(
  caseNumber: string,
  stageId?: string
): Promise<{ logs: MilestoneAuditLog[]; source: 'firestore' | 'cache'; milestoneTitle?: string }> {
  const safeId = caseNumber.replace(/[/\\?%*:|"<>]/g, '_');
  let fetchedProgress: CaseMilestoneProgress | null = null;
  let source: 'firestore' | 'cache' = 'cache';

  if (db) {
    try {
      const docRef = doc(db, 'case_milestones', safeId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        fetchedProgress = snap.data() as CaseMilestoneProgress;
        source = 'firestore';
      }
    } catch (err) {
      console.warn('[caseMilestoneService] Firestore fetch audit log notice:', err);
    }
  }

  if (!fetchedProgress) {
    fetchedProgress = getCachedCaseMilestones(caseNumber) || BENCHMARK_CASES[0];
  }

  let logs = fetchedProgress.auditLogs || [];
  const targetStage = stageId ? fetchedProgress.stages?.find((s) => s.id === stageId) : null;
  const milestoneTitle = targetStage?.title?.om || targetStage?.title?.en;

  // Generate synthetic baseline timestamped logs if none recorded yet
  if (logs.length === 0 && fetchedProgress.stages) {
    logs = fetchedProgress.stages
      .filter((s) => s.status === 'completed' || s.status === 'in_progress')
      .map((s, idx) => ({
        id: `audit-fs-${s.id}-${idx}`,
        stageId: s.id,
        stageTitle: s.title,
        previousStatus: idx > 0 ? 'pending' : undefined,
        newStatus: s.status,
        updatedAt: s.completedDate 
          ? `${s.completedDate} 09:${30 + idx * 15}:00` 
          : new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedBy: fetchedProgress?.presidingJudge || 'Abbaa Seeraa / Court Officer',
        userRole: 'Registrar & Bench Staff',
        notes: s.notes || `Milestone stage "${s.title.om}" status logged in Firestore.`,
        docketNumber: fetchedProgress?.docketNumber || caseNumber,
      }));
  }

  if (stageId) {
    const filtered = logs.filter((l) => l.stageId === stageId);
    if (filtered.length > 0) {
      logs = filtered;
    } else if (targetStage) {
      // Create active entry if none found for stageId
      logs = [
        {
          id: `audit-fs-${stageId}-live`,
          stageId,
          stageTitle: targetStage.title,
          newStatus: targetStage.status,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updatedBy: fetchedProgress.presidingJudge || 'Abbaa Seeraa / Bench Staff',
          userRole: 'Court Registrar',
          notes: targetStage.notes || `Current stage state: ${targetStage.status.toUpperCase()}`,
          docketNumber: fetchedProgress.docketNumber || caseNumber,
        }
      ];
    }
  }

  return { logs, source, milestoneTitle };
}

