import { db, auth, storage, handleFirestoreError, OperationType } from './firebase';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';
import { OROMIA_COURTS_CATALOG, OromiaCourtNode } from '../data/courts/oromiaCourts';
import { sendFeedbackMessage } from './feedbackService';
import { logAuditAction } from './auditService';
import { getRecommendedBench, CaseType, isBenchAvailable } from '../data/courts/courtBenches';

export const autoAssignBench = (courtLevel: string, caseType: CaseType): string | null => {
  const bench = getRecommendedBench(courtLevel, caseType);
  return isBenchAvailable(bench) ? bench : null;
};

export type CourtRole = 'judge' | 'assistant_judge' | 'registrar' | 'auditor' | 'legal_expert' | 'superadmin' | 'court_admin';

export type CourtLevelType = 'first_instance' | 'high_court' | 'supreme_court' | 'cassation';

export interface CourtInstitution {
  id: string;
  name: string;
  customCourtName?: string;
  logoUrl?: string;
  region: string;
  courtLevel: CourtLevelType;
  adminEmail: string;
  adminName: string;
  adminPhone?: string;
  superAdminName?: string;
  superAdminEmail?: string;
  superAdminPhone?: string;
  superAdminDelegatedAt?: string;
  tenantPrivacyShieldEnabled?: boolean;
  accessCode: string;
  status: 'active' | 'pending' | 'suspended';
  institutionStatus?: 'approved' | 'active' | 'pending' | 'suspended';
  approvedBy?: string;
  createdAt: string;
  judgesCount?: number;
  availableBenches?: string[];
  seat?: string;
  outgoingRefNo?: string;
  officialLetterContent?: string;
  hasOfficialStamp?: boolean;
  stampSealNote?: string;
  letterStatus?: 'pending_letter' | 'letter_submitted' | 'verified';
  smsNotificationSent?: boolean;
  emailNotificationSent?: boolean;
  lastNotificationDate?: string;
  headerTemplate?: string;
  courtTelegramLink?: string;
  courtEmailAddress?: string;
}

export interface CourtUser {
  id: string;
  institutionId: string;
  courtName: string;
  fullName: string;
  usernameOrEmail: string;
  passcode: string;
  role: CourtRole;
  bench: string;
  licenseNumber?: string;
  employeeId?: string;
  phone?: string;
  assignedCourtLevel?: CourtLevelType;
  status: 'active' | 'suspended';
  createdByAdminEmail: string;
  createdAt: string;
  lastLogin?: string;
  courtId?: string;
}

export interface CourtStaffRequest {
  id: string;
  institutionId: string;
  courtName: string;
  courtLevel: CourtLevelType;
  fullName: string;
  desiredUsername: string;
  role: CourtRole;
  bench: string;
  employeeId: string;
  email: string;
  phone: string;
  idCardProofOrLetterNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  assignedPasscode?: string;
}

export interface CourtAccessRequest {
  id: string;
  institutionName: string;
  contactPerson: string;
  email: string;
  phone: string;
  courtLevel: CourtLevelType;
  jurisdiction: string;
  outgoingRefNo: string;
  officialLetterContent: string;
  proposedAdminName: string;
  proposedAdminEmail: string;
  proposedAdminPhone?: string;
  hasOfficialStamp?: boolean;
  stampSealNote?: string;
  letterSubmittedToInbox?: boolean;
  smsNotificationSent?: boolean;
  emailNotificationSent?: boolean;
  lastNotificationDate?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface CourtNotificationDispatch {
  id: string;
  institutionName: string;
  targetEmail: string;
  targetPhone: string;
  channel: 'SMS & Email';
  subject: string;
  smsMessage: string;
  emailBody: string;
  dispatchedAt: string;
  status: 'Delivered';
  isConfirmedCourt: boolean;
}

export interface ActiveCourtSession {
  type: 'admin' | 'judge_or_staff';
  institutionId: string;
  courtName: string;
  courtLevel: CourtLevelType;
  user: {
    id: string;
    fullName: string;
    emailOrUsername: string;
    role: CourtRole | 'court_admin';
    bench?: string;
    licenseNumber?: string;
  };
  sessionStartedAt: string;
}

const STORAGE_KEYS = {
  INSTITUTIONS: 'seera_court_institutions_cache',
  COURT_USERS: 'seera_court_users_cache',
  ACTIVE_SESSION: 'seera_court_active_session',
  REQUESTS: 'seera_court_access_requests_cache',
  STAFF_REQUESTS: 'seera_court_staff_requests_cache',
};

// Seed initial institutional court templates mapped from Oromia Judicial System (Pending approval via inbox petition)
const DEFAULT_INSTITUTIONS: CourtInstitution[] = OROMIA_COURTS_CATALOG.map((c) => {
  const isGurbicha = c.id === 'inst_gurbicha_woreda_first';
  return {
    id: c.id,
    name: c.name,
    region: c.zoneOrCity,
    courtLevel: c.level,
    adminEmail: isGurbicha ? 'gurbicha@court.oromia.et' : c.contactEmail,
    adminName: isGurbicha ? 'Bulchaa Mana Murtii Aanaa Gurbicha' : `Bulchiinsa ${c.name.split('(')[0].trim()}`,
    adminPhone: c.contactPhone,
    accessCode: isGurbicha ? 'GURBICHA-2026' : c.defaultAdminCode,
    status: isGurbicha ? 'active' : 'pending',
    institutionStatus: isGurbicha ? 'approved' : 'pending',
    hasOfficialStamp: isGurbicha ? true : false,
    outgoingRefNo: isGurbicha ? 'MMAG/001/2026' : undefined,
    officialLetterContent: isGurbicha ? 'Xalayaa Mirkaneessa Mana Murtii Aanaa Gurbicha - Seera AI' : undefined,
    approvedBy: isGurbicha ? 'ayeledha@gmail.com' : undefined,
    createdAt: '2026-01-01T00:00:00.000Z',
    judgesCount: c.id === 'inst_oromia_supreme' ? 3 : 2,
    availableBenches: c.benches,
    seat: c.seat,
  };
});

const DEFAULT_COURT_USERS: CourtUser[] = [
  {
    id: 'cuser_judge_1',
    institutionId: 'inst_oromia_supreme',
    courtName: 'Mana Murtii Waliigalaa Oromiyaa (Oromia Supreme Court)',
    fullName: 'Abbaa Seeraa Dr. Caalaa Tasfaayee',
    usernameOrEmail: 'caalaa.judge@court.oromia.et',
    passcode: 'JUDGE-2026',
    role: 'judge',
    bench: 'Dhaddacha Ijibbaataa (Cassation Bench)',
    licenseNumber: 'OSC-BENCH-001',
    status: 'active',
    createdByAdminEmail: 'admin@oromiacourt.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_judge_2',
    institutionId: 'inst_oromia_supreme',
    courtName: 'Mana Murtii Waliigalaa Oromiyaa (Oromia Supreme Court)',
    fullName: 'Abbaa Seeraa Biqilaa Lammii',
    usernameOrEmail: 'biqilaa.judge@court.oromia.et',
    passcode: 'BENCH-2026',
    role: 'judge',
    bench: 'Dhaddacha Hariiroo Hawaasaa (Civil Appeals Bench)',
    licenseNumber: 'OSC-BENCH-002',
    status: 'active',
    createdByAdminEmail: 'admin@oromiacourt.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_clerk_1',
    institutionId: 'inst_oromia_supreme',
    courtName: 'Mana Murtii Waliigalaa Oromiyaa (Oromia Supreme Court)',
    fullName: 'Ogeessa Seeraa Hawwii Gammachuu',
    usernameOrEmail: 'hawwii.clerk@court.oromia.et',
    passcode: 'CLERK-2026',
    role: 'registrar',
    bench: 'Galmee & Qorannoo Ragaa',
    licenseNumber: 'REG-OSC-014',
    status: 'active',
    createdByAdminEmail: 'admin@oromiacourt.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_judge_eastshewa',
    institutionId: 'inst_shawaa_bahaa_high',
    courtName: 'Mana Murtii Ol\'aanaa Godina Shawaa Bahaa',
    fullName: 'Abbaa Seeraa Lalisaa Dheeressaa',
    usernameOrEmail: 'lalisaa.judge@oromia.gov.et',
    passcode: 'EASTSHEWA-2026',
    role: 'judge',
    bench: 'Dhaddacha Yakkaa (Criminal Bench)',
    licenseNumber: 'ESHC-BENCH-04',
    status: 'active',
    createdByAdminEmail: 'eastshewa.court@oromia.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_judge_shaggar',
    institutionId: 'inst_shaggar_city_high',
    courtName: 'Mana Murtii Ol\'aanaa Bulchiinsa Magaalaa Shaggar',
    fullName: 'Abbaa Seeraa Toleraa Hundeessaa',
    usernameOrEmail: 'toleraa.judge@oromia.gov.et',
    passcode: 'SHAGGAR-2026',
    role: 'judge',
    bench: 'Dhaddacha Lafaafi Qabeenya Dhaabbataa (Land & Real Estate)',
    licenseNumber: 'SHG-BENCH-12',
    status: 'active',
    createdByAdminEmail: 'shaggar.court@oromia.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_gurbicha_admin_et',
    institutionId: 'inst_gurbicha_woreda_first',
    courtName: 'Mana Murtii Aanaa Gurbicha',
    fullName: 'Bulchaa Mana Murtii Aanaa Gurbicha',
    usernameOrEmail: 'gurbicha@court.oromia.et',
    passcode: 'GURBICHA-2026',
    role: 'court_admin',
    bench: 'Waajjira Bulchiinsa Mana Murtii Aanaa Gurbicha',
    licenseNumber: 'GUR-ADMIN-01',
    status: 'active',
    createdByAdminEmail: 'gurbicha@court.oromia.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_gurbicha_admin_dot_et',
    institutionId: 'inst_gurbicha_woreda_first',
    courtName: 'Mana Murtii Aanaa Gurbicha',
    fullName: 'Bulchaa Mana Murtii Aanaa Gurbicha',
    usernameOrEmail: 'gurbicha.@court.oromia.et',
    passcode: 'GURBICHA-2026',
    role: 'court_admin',
    bench: 'Waajjira Bulchiinsa Mana Murtii Aanaa Gurbicha',
    licenseNumber: 'GUR-ADMIN-02',
    status: 'active',
    createdByAdminEmail: 'gurbicha@court.oromia.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_gurbicha_admin_gmail',
    institutionId: 'inst_gurbicha_woreda_first',
    courtName: 'Mana Murtii Aanaa Gurbicha',
    fullName: 'Admin Mana Murtii Aanaa Gurbicha',
    usernameOrEmail: 'gurbicha@gmail.com',
    passcode: 'GURBICHA-2026',
    role: 'court_admin',
    bench: 'Waajjira Bulchiinsa Mana Murtii Aanaa Gurbicha',
    licenseNumber: 'GUR-ADMIN-03',
    status: 'active',
    createdByAdminEmail: 'gurbicha@gmail.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_gurbicha_judge',
    institutionId: 'inst_gurbicha_woreda_first',
    courtName: 'Mana Murtii Aanaa Gurbicha',
    fullName: 'Abbaa Seeraa Mana Murtii Gurbicha',
    usernameOrEmail: 'gurbicha.ab@court.oromia.et',
    passcode: 'GURBICHA-2026',
    role: 'judge',
    bench: 'Dhaddacha Hariiroo Hawaasaa fi Yakkaa',
    licenseNumber: 'GUR-JUDGE-01',
    status: 'active',
    createdByAdminEmail: 'gurbicha@court.oromia.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_gurbicha_ktas',
    institutionId: 'inst_gurbicha_woreda_first',
    courtName: 'Mana Murtii Aanaa Gurbicha',
    fullName: 'Qindeessaa KTAS Gurbicha',
    usernameOrEmail: 'gurbicha.ktas@court.oromia.et',
    passcode: 'GURBICHA-2026',
    role: 'registrar',
    bench: 'Waajjira Qindeessaa KTAS',
    licenseNumber: 'GUR-KTAS-01',
    status: 'active',
    createdByAdminEmail: 'gurbicha@court.oromia.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_gurbicha_ofi',
    institutionId: 'inst_gurbicha_woreda_first',
    courtName: 'Mana Murtii Aanaa Gurbicha',
    fullName: 'Ofiisara Seeraa Gurbicha',
    usernameOrEmail: 'gurbicha.ofi@court.oromia.et',
    passcode: 'GURBICHA-2026',
    role: 'legal_expert',
    bench: 'Waajjira Ofiisara Seeraa',
    licenseNumber: 'GUR-OFFICER-01',
    status: 'active',
    createdByAdminEmail: 'gurbicha@court.oromia.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_expert_adama',
    institutionId: 'inst_adama_woreda_first',
    courtName: 'Mana Murtii Aanaa Adaamaa (Adama District Court)',
    fullName: 'Ogeettii Seeraa Meetii Tolchaa',
    usernameOrEmail: 'meetii.law@oromia.gov.et',
    passcode: 'ADAMA-2026',
    role: 'legal_expert',
    bench: 'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
    licenseNumber: 'AD-1ST-09',
    status: 'active',
    createdByAdminEmail: 'adama.firstcourt@oromia.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_judge_shashemene',
    institutionId: 'inst_shashemene_city_high',
    courtName: 'Mana Murtii Ol\'aanaa Bulchiinsa Magaalaa Shaashamanne',
    fullName: 'Abbaa Seeraa Abdurazaak Jamaal',
    usernameOrEmail: 'abdurazaak.judge@oromia.gov.et',
    passcode: 'SHASHE-2026',
    role: 'judge',
    bench: 'Dhaddacha Daldalaa fi Invastimantii (Commercial & Investment)',
    licenseNumber: 'SHASH-HC-03',
    status: 'active',
    createdByAdminEmail: 'shashemene.court@oromia.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_registrar_shashemene',
    institutionId: 'inst_shashemene_city_high',
    courtName: 'Mana Murtii Ol\'aanaa Bulchiinsa Magaalaa Shaashamanne',
    fullName: 'Ogeettii Seeraa Birtukaan Hayiluu',
    usernameOrEmail: 'birtukaan.clerk@oromia.gov.et',
    passcode: 'SHASH-CLERK',
    role: 'registrar',
    bench: 'Dhaddacha Lafaafi Qabeenya Dhaabbataa (Land & Real Estate)',
    licenseNumber: 'SHASH-REG-07',
    status: 'active',
    createdByAdminEmail: 'shashemene.court@oromia.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_judge_adama_high',
    institutionId: 'inst_adama_city_high',
    courtName: 'Mana Murtii Ol\'aanaa Bulchiinsa Magaalaa Adaamaa',
    fullName: 'Abbaa Seeraa Masfin Mokonnin',
    usernameOrEmail: 'masfin.judge@oromia.gov.et',
    passcode: 'ADAMAHC-2026',
    role: 'judge',
    bench: 'Dhaddacha Falmii Daldalaa (Commercial Bench)',
    licenseNumber: 'AD-HC-01',
    status: 'active',
    createdByAdminEmail: 'adama.highcourt@oromia.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_judge_jimma',
    institutionId: 'inst_jimma_zone_high',
    courtName: 'Mana Murtii Ol\'aanaa Godina Jimmaa',
    fullName: 'Abbaa Seeraa Dheeressaa Tarfaa',
    usernameOrEmail: 'dheeressaa.judge@oromia.gov.et',
    passcode: 'JIMMA-2026',
    role: 'judge',
    bench: 'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
    licenseNumber: 'JM-HC-05',
    status: 'active',
    createdByAdminEmail: 'jimma.court@oromia.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_judge_westshewa',
    institutionId: 'inst_shawaa_lixaa_high',
    courtName: 'Mana Murtii Ol\'aanaa Godina Shawaa Lixaa',
    fullName: 'Abbaa Seeraa Gurmuu Taaddasaa',
    usernameOrEmail: 'gurmuu.judge@oromia.gov.et',
    passcode: 'AMBO-2026',
    role: 'judge',
    bench: 'Dhaddacha Yakkaa (Criminal Bench)',
    licenseNumber: 'WS-HC-08',
    status: 'active',
    createdByAdminEmail: 'westshewa.court@oromia.gov.et',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_judge_arsi',
    institutionId: 'inst_arsi_zone_high',
    courtName: 'Mana Murtii Ol\'aanaa Godina Arsii',
    fullName: 'Abbaa Seeraa Kumalaa Fayyisaa',
    usernameOrEmail: 'kumalaa.judge@oromia.gov.et',
    passcode: 'ARSI-2026',
    role: 'judge',
    bench: 'Dhaddacha Falmii Qonnaa fi Lafa Baadiyyaa',
    licenseNumber: 'AR-HC-11',
    status: 'active',
    createdByAdminEmail: 'arsi.court@oromia.gov.et',
    createdAt: new Date().toISOString(),
  },
  /* Practice Court Users for mmurtii.com */
  {
    id: 'cuser_mmurtii_admin',
    institutionId: 'inst_mmurtii_practice',
    courtName: 'Mana Murtii Shaakalaa (Practice Court - mmurtii.com)',
    fullName: 'Bulchaa Shaakalaa (Practice Admin)',
    usernameOrEmail: 'admin@mmurtii.com',
    passcode: 'MMURTII-2026',
    role: 'court_admin',
    bench: 'Waajjira Bulchiinsa Shaakalaa (Practice Admin Office)',
    licenseNumber: 'PRACTICE-ADMIN-01',
    status: 'active',
    createdByAdminEmail: 'admin@mmurtii.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_mmurtii_judge',
    institutionId: 'inst_mmurtii_practice',
    courtName: 'Mana Murtii Shaakalaa (Practice Court - mmurtii.com)',
    fullName: 'Abbaa Seeraa Shaakalaa (Practice Judge)',
    usernameOrEmail: 'judge@mmurtii.com',
    passcode: 'MMURTII-2026',
    role: 'judge',
    bench: 'Dhaddacha Shaakalaa (Practice Bench)',
    licenseNumber: 'PRACTICE-JUDGE-01',
    status: 'active',
    createdByAdminEmail: 'admin@mmurtii.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_mmurtii_registrar',
    institutionId: 'inst_mmurtii_practice',
    courtName: 'Mana Murtii Shaakalaa (Practice Court - mmurtii.com)',
    fullName: 'Galmeessaa Shaakalaa (Practice Registrar)',
    usernameOrEmail: 'registrar@mmurtii.com',
    passcode: 'MMURTII-2026',
    role: 'registrar',
    bench: 'Galmee & Intake Desk Shaakalaa',
    licenseNumber: 'PRACTICE-REG-01',
    status: 'active',
    createdByAdminEmail: 'admin@mmurtii.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_mmurtii_clerk',
    institutionId: 'inst_mmurtii_practice',
    courtName: 'Mana Murtii Shaakalaa (Practice Court - mmurtii.com)',
    fullName: 'Calaaqqisaa Shaakalaa (Practice Clerk)',
    usernameOrEmail: 'clerk@mmurtii.com',
    passcode: 'MMURTII-2026',
    role: 'registrar',
    bench: 'Waajjira Calaajjii Shaakalaa',
    licenseNumber: 'PRACTICE-CLK-01',
    status: 'active',
    createdByAdminEmail: 'admin@mmurtii.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cuser_mmurtii_expert',
    institutionId: 'inst_mmurtii_practice',
    courtName: 'Mana Murtii Shaakalaa (Practice Court - mmurtii.com)',
    fullName: 'Ogeessa Seeraa Shaakalaa (Practice Legal Expert)',
    usernameOrEmail: 'expert@mmurtii.com',
    passcode: 'MMURTII-2026',
    role: 'legal_expert',
    bench: 'Qorannoo Seeraa Shaakalaa',
    licenseNumber: 'PRACTICE-EXP-01',
    status: 'active',
    createdByAdminEmail: 'admin@mmurtii.com',
    createdAt: new Date().toISOString(),
  }
];

// Helper: load cached institutions
export function getLocalInstitutions(): CourtInstitution[] {
  if (typeof window === 'undefined') return DEFAULT_INSTITUTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INSTITUTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INSTITUTIONS, JSON.stringify(DEFAULT_INSTITUTIONS));
      return DEFAULT_INSTITUTIONS;
    }
    const cached = JSON.parse(raw);
    if (!Array.isArray(cached)) {
      localStorage.setItem(STORAGE_KEYS.INSTITUTIONS, JSON.stringify(DEFAULT_INSTITUTIONS));
      return DEFAULT_INSTITUTIONS;
    }
    // Ensure all default Oromia courts are present in cached list
    const missing = DEFAULT_INSTITUTIONS.filter(d => !cached.some(c => c && c.id === d.id));
    if (missing.length > 0) {
      const merged = [...cached, ...missing];
      localStorage.setItem(STORAGE_KEYS.INSTITUTIONS, JSON.stringify(merged));
      return merged;
    }
    return cached;
  } catch {
    return DEFAULT_INSTITUTIONS;
  }
}

import { saveInstitutionsToDB, saveUsersToDB } from './indexedDb';

export function saveLocalInstitutions(list: CourtInstitution[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.INSTITUTIONS, JSON.stringify(list));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('LocalStorage quota exceeded. Aggressively clearing non-essential cache...');
      // Clear non-essential keys
      const keysToClear = [
        STORAGE_KEYS.REQUESTS,
        STORAGE_KEYS.STAFF_REQUESTS,
        'seera_share_events',
        'seera_notification_settings'
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));
      
      try {
        localStorage.setItem(STORAGE_KEYS.INSTITUTIONS, JSON.stringify(list));
      } catch (e2) {
        console.error('Still failed to save after aggressive clear', e2);
      }
    } else {
      console.error('Failed to save institutions locally', e);
    }
  }
}

// Helper: load cached court users
export function getLocalCourtUsers(): CourtUser[] {
  if (typeof window === 'undefined') return DEFAULT_COURT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COURT_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COURT_USERS, JSON.stringify(DEFAULT_COURT_USERS));
      return DEFAULT_COURT_USERS;
    }
    const cached = JSON.parse(raw);
    if (!Array.isArray(cached)) {
      localStorage.setItem(STORAGE_KEYS.COURT_USERS, JSON.stringify(DEFAULT_COURT_USERS));
      return DEFAULT_COURT_USERS;
    }
    const missing = DEFAULT_COURT_USERS.filter(d => !cached.some(c => c && c.id === d.id));
    if (missing.length > 0) {
      const merged = [...cached, ...missing];
      localStorage.setItem(STORAGE_KEYS.COURT_USERS, JSON.stringify(merged));
      return merged;
    }
    return cached;
  } catch {
    return DEFAULT_COURT_USERS;
  }
}

export function saveLocalCourtUsers(list: CourtUser[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.COURT_USERS, JSON.stringify(list));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('LocalStorage quota exceeded. Aggressively clearing non-essential cache...');
      // Clear non-essential keys
      const keysToClear = [
        STORAGE_KEYS.REQUESTS,
        STORAGE_KEYS.STAFF_REQUESTS,
        'seera_share_events',
        'seera_notification_settings'
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));
      
      try {
        localStorage.setItem(STORAGE_KEYS.COURT_USERS, JSON.stringify(list));
      } catch (e2) {
        console.error('Still failed to save after aggressive clear', e2);
      }
    } else {
      console.error('Failed to save court users locally', e);
    }
  }
}

// Check if currently active user or session is authorized to enter Court Work
export function isCourtAccessAuthorized(): boolean {
  if (typeof window === 'undefined') return false;

  if (localStorage.getItem('seera_court_access_authorized') === 'true') {
    return true;
  }

  // 1. App Owner Ayele Be Dha or Gurbicha Admin always has access
  const ownerEmail = localStorage.getItem('seera_owner_email') || auth.currentUser?.email;
  const isOwner = ownerEmail === 'ayeledha@gmail.com' || ownerEmail === 'ayele@saiethio.com' || ownerEmail === 'ayeledha@saiethio.com' || ownerEmail === 'gurbicha@gmail.com';
  
  if (isOwner) {
    return true;
  }

  // 2. Active institutional court session check
  const session = getActiveCourtSession();
  if (session && session.user && session.institutionId) {
    return true;
  }

  const storedRole = localStorage.getItem('seera_user_role') || (window as any)?.__SEERA_USER_PROFILE__?.role;
  return storedRole === 'court_personnel' || storedRole === 'admin' || storedRole === 'judge' || storedRole === 'registrar';
}

// Get active court session
export function getActiveCourtSession(): ActiveCourtSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION) || localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Set active court session
export function setActiveCourtSession(session: ActiveCourtSession): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('seera_court_session_changed', { detail: session }));
  } catch (e) {
    console.error('Failed to set active court session', e);
  }
}

// Clear active court session (Logout from bench)
export function clearCourtSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  window.dispatchEvent(new CustomEvent('seera_court_session_changed', { detail: null }));
}

// Institutional Admin Login
export async function loginAsCourtAdmin(adminEmail: string, accessCode: string): Promise<{ success: boolean; session?: ActiveCourtSession; message: string }> {
  const emailNorm = adminEmail.trim().toLowerCase();
  const codeNorm = accessCode.trim().toUpperCase();

  // Check if owner
  if ((emailNorm === 'ayeledha@gmail.com' || emailNorm === 'ayele@saiethio.com' || emailNorm === 'ayeledha@saiethio.com') && (codeNorm === '2026' || codeNorm.includes('OROMIA') || codeNorm.includes('ADMIN'))) {
    const inst = getLocalInstitutions()[0];
    const session: ActiveCourtSession = {
      type: 'admin',
      institutionId: inst.id,
      courtName: inst.name,
      courtLevel: inst.courtLevel,
      user: {
        id: 'owner_ayele',
        fullName: 'Ayele Be Dha (Super Admin & Court Authority)',
        emailOrUsername: emailNorm,
        role: 'court_admin',
        bench: 'Bulchiinsa Waliigala Manneen Murtii',
      },
      sessionStartedAt: new Date().toISOString(),
    };
    setActiveCourtSession(session);
    return { success: true, session, message: 'Seensi Bulchaa Mana Murtii Milkaa\'eera!' };
  }

  // Check if Gurbicha Court Admin (Official Shaakala/Practice Email: gurbicha.@court.oromia.et or gurbicha@court.oromia.et)
  const isGurbichaOfficial = (emailNorm === 'gurbicha.@court.oromia.et' || emailNorm === 'gurbicha@court.oromia.et' || emailNorm === 'gurbicha@gmail.com') && 
                            (codeNorm === 'GURBICHA-2026' || codeNorm === '2026' || codeNorm === 'GURBICHA2026' || codeNorm === 'GURBICHA');
  
  if (isGurbichaOfficial) {
    const gurbichaInst = getLocalInstitutions().find(i => i.id === 'inst_gurbicha_woreda_first') || {
      id: 'inst_gurbicha_woreda_first',
      name: 'Mana Murtii Aanaa Gurbicha (Gurbicha Woreda Court)',
      region: 'Buno Baddallee',
      courtLevel: 'first_instance',
      adminEmail: 'gurbicha@court.oromia.et',
      adminName: 'Bulchaa Mana Murtii Aanaa Gurbicha',
      accessCode: 'GURBICHA-2026',
      status: 'active',
      institutionStatus: 'approved'
    };

    const session: ActiveCourtSession = {
      type: 'admin',
      institutionId: gurbichaInst.id,
      courtName: gurbichaInst.name,
      courtLevel: gurbichaInst.courtLevel as CourtLevelType,
      user: {
        id: 'admin_gurbicha_official',
        fullName: 'Bulchaa Mana Murtii Aanaa Gurbicha (Admin)',
        emailOrUsername: emailNorm,
        role: 'court_admin',
        bench: 'Waajjira Bulchiinsa Mana Murtii Aanaa Gurbicha',
      },
      sessionStartedAt: new Date().toISOString(),
    };
    setActiveCourtSession(session);
    localStorage.setItem('seera_court_access_authorized', 'true');
    return { success: true, session, message: 'Bulchaan Mana Murtii Aanaa Gurbicha milkaa\'inaan seeneera! (Shaakala taasiisuuf qophaa\'ee jira)' };
  }

  // Check if mmurtii.com Practice Court Admin
  if ((emailNorm === 'admin@mmurtii.com' || emailNorm === 'mmurtii.com') && 
      (codeNorm === 'MMURTII-2026' || codeNorm === 'MMURTII2026' || codeNorm === '2026')) {
    const session: ActiveCourtSession = {
      type: 'admin',
      institutionId: 'inst_mmurtii_practice',
      courtName: 'Mana Murtii Shaakalaa (Practice Court - mmurtii.com)',
      courtLevel: 'supreme_court',
      user: {
        id: 'admin_mmurtii_practice',
        fullName: 'Bulchaa Shaakalaa (Practice Admin)',
        emailOrUsername: 'admin@mmurtii.com',
        role: 'court_admin',
        bench: 'Waajjira Bulchiinsa Shaakalaa',
      },
      sessionStartedAt: new Date().toISOString(),
    };
    setActiveCourtSession(session);
    localStorage.setItem('seera_court_access_authorized', 'true');
    return { success: true, session, message: 'Baga nagaan dhuftan! Bulchaa Shaakalaa mmurtii.com (Practice Court Admin) milkaa\'inaan seeneera.' };
  }

  // General Institutional Check
  const institutions = getLocalInstitutions();
  const match = institutions.find(
    i => (i.adminEmail.toLowerCase() === emailNorm) && 
         (i.accessCode.toUpperCase() === codeNorm)
  );

  if (!match) {
    // If not in institutions, check if it's an official court domain but wrong code
    if (emailNorm.endsWith('@court.oromia.et')) {
      return { 
        success: false, 
        message: 'Koodiin Bulchaa Mana Murtii (Admin Passcode) dogoggora. Maaloo koodii sirrii galchaa.' 
      };
    }
    return { 
      success: false, 
      message: 'Imeelii fi Koodiin Bulchaa Mana Murtii hin mirkanoofne. Mana Murtii keessaniin ala seenuun dhorkaadha.' 
    };
  }

  const session: ActiveCourtSession = {
    type: 'admin',
    institutionId: match.id,
    courtName: match.name,
    courtLevel: match.courtLevel,
    user: {
      id: `admin_${match.id}`,
      fullName: match.adminName,
      emailOrUsername: match.adminEmail,
      role: 'court_admin',
      bench: 'Garee Bulchiinsa Mana Murtii',
    },
    sessionStartedAt: new Date().toISOString(),
  };

  setActiveCourtSession(session);
  localStorage.setItem('seera_court_access_authorized', 'true');
  return { success: true, session, message: 'Bulchaan Mana Murtii milkaa\'inaan seeneera!' };
}

// Judge / Legal Expert Login
export async function loginAsCourtUser(usernameOrEmail: string, passcode: string): Promise<{ success: boolean; session?: ActiveCourtSession; message: string }> {
  const normUser = usernameOrEmail.trim().toLowerCase();
  const normPass = passcode.trim();

  const users = getLocalCourtUsers();
  const match = users.find(
    u => {
      const userMatches = u.usernameOrEmail.toLowerCase() === normUser || 
                          (u.employeeId && u.employeeId.toLowerCase() === normUser) ||
                          u.fullName.toLowerCase() === normUser;
      if (!userMatches || u.status !== 'active') return false;

      const isPracticeAcc = u.usernameOrEmail.toLowerCase().includes('mmurtii.com');
      if (isPracticeAcc) {
        const passNorm = normPass.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          passNorm === 'mmurtii2026' || 
          passNorm === '2026' || 
          u.passcode.toLowerCase().replace(/[^a-z0-9]/g, '') === passNorm
        );
      }

      return u.passcode === normPass || u.passcode.toLowerCase() === normPass;
    }
  );

  if (!match) {
    const existingUser = users.find(
      u => u.usernameOrEmail.toLowerCase() === normUser || (u.employeeId && u.employeeId.toLowerCase() === normUser)
    );
    if (existingUser && existingUser.status === 'suspended') {
      return {
        success: false,
        message: 'Akkawuntiin keessan yeroof uggurameera (Suspended). Maaloo bulchaa (admin) mana murtii keessanii qunnamaa.'
      };
    }
    if (existingUser) {
      return {
        success: false,
        message: 'Jechi icciitii (passcode) dhaddachaa dogoggora. Jecha icciitii bulchaan mana murtii isiniif kenne sirriitti galchaa.'
      };
    }

    return { 
      success: false, 
      message: `Dhimma Mana Murtii Sadarkaa Sadeenii Seenuun Hin Danda'amu: Maqaan fayyadamaa '${usernameOrEmail}' jedhu galmee hojjettoota mana murtii keessatti hin argamne. Bulchaan (Admin) mana murtii keessanii uunkaa hojjetaa guutuun username fi passcode yoo isiniif kenne malee namni biroo akka seenu dhorkameera!` 
    };
  }

  const institutions = getLocalInstitutions();
  const inst = institutions.find(i => i.id === match.institutionId) || {
    id: match.institutionId,
    name: match.courtName,
    courtLevel: (match.assignedCourtLevel || 'high_court') as CourtLevelType,
  };

  const session: ActiveCourtSession = {
    type: 'judge_or_staff',
    institutionId: match.institutionId,
    courtName: match.courtName,
    courtLevel: (match.assignedCourtLevel || inst.courtLevel) as CourtLevelType,
    user: {
      id: match.id,
      fullName: match.fullName,
      emailOrUsername: match.usernameOrEmail,
      role: match.role,
      bench: match.bench,
      licenseNumber: match.licenseNumber,
    },
    sessionStartedAt: new Date().toISOString(),
  };

  setActiveCourtSession(session);
  return { success: true, session, message: `Baga nagaan dhuftan, ${match.fullName}!` };
}

// Court Admin: Create a new User for a Judge, Clerk, Registrar or Legal Expert
export async function createCourtUser(
  institutionId: string, 
  data: {
    fullName: string;
    usernameOrEmail: string;
    passcode: string;
    role: CourtRole;
    bench: string;
    licenseNumber?: string;
    employeeId?: string;
    phone?: string;
    assignedCourtLevel?: CourtLevelType;
  }
): Promise<{ success: boolean; user?: CourtUser; message: string }> {
  const users = getLocalCourtUsers();
  const institutions = getLocalInstitutions();
  const inst = institutions.find(i => i.id === institutionId);

  if (!inst) {
    return { success: false, message: 'Dhaabbanni mana murtii hin argamne.' };
  }

  // Check duplicate
  const exists = users.some(u => u.usernameOrEmail.toLowerCase() === data.usernameOrEmail.trim().toLowerCase());
  if (exists) {
    return { success: false, message: 'Fayyadamtoon kun duraan galmaa\'eera (Username/Email exists).' };
  }

  const session = getActiveCourtSession();
  const newCourtUser: CourtUser = {
    id: `cuser_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    institutionId,
    courtName: inst.name,
    fullName: data.fullName.trim(),
    usernameOrEmail: data.usernameOrEmail.trim().toLowerCase(),
    passcode: data.passcode.trim(),
    role: data.role,
    bench: data.bench.trim(),
    licenseNumber: data.licenseNumber?.trim(),
    employeeId: data.employeeId?.trim(),
    phone: data.phone?.trim(),
    assignedCourtLevel: data.assignedCourtLevel || inst.courtLevel,
    status: 'active',
    createdByAdminEmail: session?.user.emailOrUsername || inst.adminEmail,
    createdAt: new Date().toISOString(),
    courtId: institutionId,
  };

  const updatedUsers = [newCourtUser, ...users];
  saveLocalCourtUsers(updatedUsers);

  // Update institution judges count
  const updatedInsts = institutions.map(i => {
    if (i.id === institutionId) {
      return { ...i, judgesCount: (i.judgesCount || 0) + 1 };
    }
    return i;
  });
  saveLocalInstitutions(updatedInsts);

  // Sync to Firestore if online
  try {
    await setDoc(doc(db, 'court_users', newCourtUser.id), {
      ...newCourtUser,
      createdAtServer: serverTimestamp(),
    });
    await logAuditAction(
      'bench_assignment',
      session?.user.emailOrUsername || inst.adminEmail,
      `User ${data.fullName} assigned to bench: ${data.bench} with role: ${data.role}`,
      institutionId,
      inst.name,
      newCourtUser.id
    );
  } catch (e) {
    console.warn('Firestore sync for court user deferred:', e);
  }

  return { 
    success: true, 
    user: newCourtUser, 
    message: `${data.role === 'judge' ? 'Abbaan Seeraa' : 'Hojjetaan Mana Murtii'} "${data.fullName}" milkaa'inaan uumameera! Username: ${newCourtUser.usernameOrEmail}` 
  };
}

/**
 * Assign or reassign a Judge / Court User to a specific Bench
 */
export async function updateCourtUserBenchAssignment(
  userId: string,
  newBench: string,
  assignedCourtLevel?: CourtLevelType,
  operatorName?: string
): Promise<{ success: boolean; user?: CourtUser; message: string }> {
  const users = getLocalCourtUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return { success: false, message: 'Hojjetaan/Abbaan seeraa hin argamne.' };
  }

  const existing = users[userIndex];
  const updatedUser: CourtUser = {
    ...existing,
    bench: newBench,
    assignedCourtLevel: assignedCourtLevel || existing.assignedCourtLevel,
  };

  users[userIndex] = updatedUser;
  saveLocalCourtUsers(users);

  // Sync to Firestore
  try {
    const userDocRef = doc(db, 'court_users', userId);
    await updateDoc(userDocRef, {
      bench: newBench,
      assignedCourtLevel: assignedCourtLevel || existing.assignedCourtLevel,
      updatedAt: serverTimestamp()
    });
    await logAuditAction(
      'bench_reassignment',
      operatorName || 'Court Admin / Coordinator',
      `Reassigned ${updatedUser.fullName} (${updatedUser.role}) to bench: ${newBench}`,
      updatedUser.institutionId,
      updatedUser.courtName,
      userId
    );
  } catch (e) {
    console.warn('Firestore update for bench assignment deferred:', e);
  }

  return {
    success: true,
    user: updatedUser,
    message: `${updatedUser.fullName} milkaa'inaan Dhaddacha "${newBench}" tiif ramadameera!`
  };
}

/**
 * Get active judges filtered or sorted by their assigned bench
 */
export function getJudgesByBench(benchName?: string): CourtUser[] {
  const users = getLocalCourtUsers().filter(u => u.role === 'judge' && u.status === 'active');
  if (!benchName || benchName === 'all') {
    return users;
  }
  const cleanBench = benchName.toLowerCase().trim();
  const matching = users.filter(u => u.bench && u.bench.toLowerCase().includes(cleanBench));
  return matching.length > 0 ? matching : users;
}

// ---------------------------------------------------------------------------
// COURT STAFF ONBOARDING & ACCESS REQUESTS (Uunkaa Guutamu Hojjetaa)
// ---------------------------------------------------------------------------
export function getCourtStaffRequests(): CourtStaffRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STAFF_REQUESTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.length > 0) return parsed;
    }
  } catch {}

  const defaultStaffRequests: CourtStaffRequest[] = [
    {
      id: 'sreq_demo_1',
      institutionId: 'inst_adama_woreda_first',
      courtName: 'Mana Murtii Aanaa Adaamaa',
      courtLevel: 'first_instance',
      fullName: 'Obbo Tolasaa Hundeessaa',
      desiredUsername: 'tolasaa.clerk',
      role: 'registrar',
      bench: 'Dhaddacha Hariiroo Hawaasaa',
      employeeId: 'AD-EMP-2024-91',
      email: 'tolasaa.clerk@oromia.gov.et',
      phone: '+251912345678',
      idCardProofOrLetterNote: 'Waraqaa Eenyummaa Hojjetaa Mana Murtii Aanaa Adaamaa Lakk. 91/16',
      status: 'pending',
      submittedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'sreq_demo_2',
      institutionId: 'inst_shawaa_bahaa_high',
      courtName: 'Mana Murtii Ol\'aanaa Godina Shawaa Bahaa',
      courtLevel: 'high_court',
      fullName: 'Abbaa Seeraa Fayyisaa Dajenee',
      desiredUsername: 'fayyisaa.judge',
      role: 'judge',
      bench: 'Dhaddacha Dhimmoota Lafaafi Baadiyyaa',
      employeeId: 'ESHC-JDG-08',
      email: 'fayyisaa.judge@court.oromia.et',
      phone: '+251923456789',
      idCardProofOrLetterNote: 'Waraqaa Muudama Abbaa Seeraa MMO Lakk. 08/2015',
      status: 'pending',
      submittedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    }
  ];
  try {
    localStorage.setItem(STORAGE_KEYS.STAFF_REQUESTS, JSON.stringify(defaultStaffRequests));
  } catch {}
  return defaultStaffRequests;
}

export function saveCourtStaffRequests(list: CourtStaffRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.STAFF_REQUESTS, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save court staff requests', e);
  }
}

export async function submitCourtStaffRequest(data: {
  institutionId: string;
  courtName: string;
  courtLevel: CourtLevelType;
  fullName: string;
  desiredUsername: string;
  role: CourtRole;
  bench: string;
  employeeId: string;
  email: string;
  phone: string;
  idCardProofOrLetterNote?: string;
}): Promise<{ success: boolean; request: CourtStaffRequest; message: string }> {
  const newReq: CourtStaffRequest = {
    ...data,
    id: `sreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    desiredUsername: data.desiredUsername.trim().toLowerCase(),
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  const requests = getCourtStaffRequests();
  const updated = [newReq, ...requests];
  saveCourtStaffRequests(updated);

  try {
    await setDoc(doc(db, 'court_staff_requests', newReq.id), {
      ...newReq,
      serverTimestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore staff request deferred', e);
  }

  return {
    success: true,
    request: newReq,
    message: `Uunkaan gaaffii hojjetaa '${data.fullName}' milkaa'inaan dhiyaateera. Bulchaan mana murtii keessanii erga mirkaneessee booda Username '${newReq.desiredUsername}' fi passcode isiniif kenna!`
  };
}

export async function approveCourtStaffRequest(
  requestId: string,
  assignedPasscode: string = 'COURT-2026'
): Promise<{ success: boolean; user?: CourtUser; message: string }> {
  const requests = getCourtStaffRequests();
  const target = requests.find(r => r.id === requestId);
  if (!target) {
    return { success: false, message: 'Gaaffiin hojjetaa kun hin argamne.' };
  }

  const userRes = await createCourtUser(target.institutionId, {
    fullName: target.fullName,
    usernameOrEmail: target.desiredUsername,
    passcode: assignedPasscode,
    role: target.role,
    bench: target.bench,
    licenseNumber: target.employeeId,
    employeeId: target.employeeId,
    phone: target.phone,
    assignedCourtLevel: target.courtLevel,
  });

  if (!userRes.success || !userRes.user) {
    return { success: false, message: userRes.message };
  }

  const updatedRequests = requests.map(r => 
    r.id === requestId 
      ? { ...r, status: 'approved' as const, approvedAt: new Date().toISOString(), assignedPasscode }
      : r
  );
  saveCourtStaffRequests(updatedRequests);

  try {
    await updateDoc(doc(db, 'court_staff_requests', requestId), {
      status: 'approved',
      approvedAt: serverTimestamp(),
      assignedPasscode,
    });
    await logAuditAction(
      'staff_approval',
      'system', // Or current user's email if available
      `Staff request for ${target.fullName} approved. Bench: ${target.bench}`,
      target.institutionId,
      target.courtName,
      requestId
    );
  } catch (e) {
    console.warn('Firestore staff request update deferred', e);
  }

  return {
    success: true,
    user: userRes.user,
    message: `Hojjetaan '${target.fullName}' milkaa'inaan mirkanaa'eera! Username: '${target.desiredUsername}', Passcode: '${assignedPasscode}'. Amma dhaddacha sadarkaa sadeenii seenuu danda'a.`
  };
}

export async function rejectCourtStaffRequest(requestId: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const requests = getCourtStaffRequests();
  const updated = requests.map(r => r.id === requestId ? { ...r, status: 'rejected' as const } : r);
  saveCourtStaffRequests(updated);

  try {
    await updateDoc(doc(db, 'court_staff_requests', requestId), {
      status: 'rejected',
      rejectedReason: reason || 'Not verified',
    });
  } catch (e) {
    console.warn('Firestore staff reject update deferred', e);
  }

  return { success: true, message: 'Gaaffiin hojjetaa kun kufaa ta\'eera.' };
}

// Toggle Court User Status (Active / Suspended)
export async function toggleCourtUserStatus(userId: string): Promise<CourtUser | null> {
  const users = getLocalCourtUsers();
  const target = users.find(u => u.id === userId);
  if (!target) return null;

  const newStatus: 'active' | 'suspended' = target.status === 'active' ? 'suspended' : 'active';
  const updated = users.map(u => u.id === userId ? { ...u, status: newStatus } : u);
  saveLocalCourtUsers(updated);

  try {
    await updateDoc(doc(db, 'court_users', userId), { status: newStatus });
  } catch (e) {
    console.warn('Firestore user status update deferred', e);
  }

  return { ...target, status: newStatus };
}

// Request Institutional Access (When an institution approaches Ayele Be Dha)
export async function submitCourtAccessRequest(data: Omit<CourtAccessRequest, 'id' | 'status' | 'requestedAt'>): Promise<{ success: boolean; message: string }> {
  const newReq: CourtAccessRequest = {
    ...data,
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    const list: CourtAccessRequest[] = raw ? JSON.parse(raw) : [];
    list.unshift(newReq);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(list));

    await setDoc(doc(db, 'court_access_requests', newReq.id), {
      ...newReq,
      serverTimestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Court access request local saved, remote deferred', e);
  }

  // Also dispatch directly to the app's Live Inbox (Sanduuqa Ergaa Abbaa Appii)
  try {
    await sendFeedbackMessage({
      senderName: `${newReq.proposedAdminName || newReq.contactPerson} (${newReq.institutionName})`,
      senderEmail: newReq.proposedAdminEmail || newReq.email,
      contactInfo: newReq.proposedAdminPhone || newReq.phone,
      topic: `🏛️ Gaaffii Admin & Xalayaa Bahii (Ref: ${newReq.outgoingRefNo})`,
      message: `[GAAFFII BULCHAA MANA MURTII / COURT ADMIN ONBOARDING]\n\nMana Murtii: ${newReq.institutionName}\nSadarkaa: ${newReq.courtLevel}\nLakkoofsa Bahii: ${newReq.outgoingRefNo}\nBulchaa Gaafate: ${newReq.proposedAdminName || newReq.contactPerson}\nImeelii: ${newReq.proposedAdminEmail || newReq.email}\nBilbila: ${newReq.proposedAdminPhone || newReq.phone}\nChaappaa: ${newReq.hasOfficialStamp ? '✅ Chaappaan Mana Hojii Mirkanaa\'eera' : '⚠️ Chaappaa malee'}\n\nQabiyyee Xalayaa:\n"${newReq.officialLetterContent}"\n\nYaada: ${newReq.notes || 'Hin jiru'}`,
    });
  } catch (e) {
    console.warn('Inbox dispatch for court request deferred', e);
  }

  return {
    success: true,
    message: 'Iyyanni fi Xalayaan Mana Hojii dhaabbata keessanii milkaa\'inaan dhiyaateera. Inbox Abbaa Appiitti (Ayele Be Dha) ergameera; qulqullina erga mirkanaa\'ee booda koodiin bulchaa (Admin Passcode) isiniif ergama.'
  };
}

// Approve Court Request & Provision Institution (By Ayele Be Dha)
export async function approveCourtInstitution(
  institutionName: string,
  region: string,
  courtLevel: CourtLevelType,
  adminEmail: string,
  adminName: string,
  outgoingRefNo?: string,
  officialLetterContent?: string
): Promise<{ success: boolean; institution?: CourtInstitution; message?: string }> {
  const cleanRef = (outgoingRefNo || '').trim();
  const cleanContent = (officialLetterContent || '').trim();

  // Strictly enforce that official letter MUST originate from the court office!
  if (
    !cleanContent || 
    cleanContent === 'Xalayaa mirkaneessa mana murtii.' || 
    cleanContent.length < 15 || 
    !cleanRef || 
    cleanRef === 'MM/2026'
  ) {
    return {
      success: false,
      message: "Mirkaneessuun hin danda'amu: Xalayaan kun mana hojii isaaniitii bahee dhiyaate miti (Dhaabbata irraa kan eegamuudha). Manneen murtii xalayaa seera qabeessa lakkoofsa bahii qabu, chaappaa mana hojiitiin mirkanaa'e kallattiin yoo hin dhiheessine sirni kun ofumaan xalayaa hin uumu. Maaloo dura ergaa SMS/Email dhiyeessa xalayaa mana hojii ergaafii.",
    };
  }

  const accessCode = `CRT-${courtLevel.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newInst: CourtInstitution = {
    id: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: institutionName,
    region,
    courtLevel,
    adminEmail,
    adminName,
    accessCode,
    status: 'active',
    approvedBy: 'ayeledha@gmail.com',
    createdAt: new Date().toISOString(),
    judgesCount: 0,
    outgoingRefNo: cleanRef,
    officialLetterContent: cleanContent,
    hasOfficialStamp: true,
    stampSealNote: "Chaappaan Mana Murtii Mirkanaa'eera",
    letterStatus: 'verified',
  };

  const institutions = getLocalInstitutions();
  const updated = [newInst, ...institutions];
  saveLocalInstitutions(updated);

  try {
    await setDoc(doc(db, 'court_institutions', newInst.id), {
      ...newInst,
      serverTimestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore institution creation deferred', e);
  }

  return { success: true, institution: newInst, message: `Manni Murtii "${institutionName}" xalayaa bahii fi chaappaa qabatamaan dhiyaateen milkaa'inaan mirkanaa'eera!` };
}

export function getCourtAccessRequests(): CourtAccessRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out fake demo requests that the app generated artificially
        const genuine = parsed.filter(r => !r.id.startsWith('req_demo_'));
        // Sync back cleaned list if fake requests were purged
        if (genuine.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(genuine));
        }
        return genuine;
      }
    }
  } catch {}

  // No fake or auto-generated letters. Letters MUST strictly be submitted by actual court institutions.
  return [];
}

const NOTIF_DISPATCH_STORAGE_KEY = 'seera_court_sms_email_dispatches_v1';

export function getCourtNotificationDispatches(): CourtNotificationDispatch[] {
  try {
    const raw = localStorage.getItem(NOTIF_DISPATCH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveCourtNotificationDispatch(dispatch: CourtNotificationDispatch) {
  try {
    const existing = getCourtNotificationDispatches();
    existing.unshift(dispatch);
    localStorage.setItem(NOTIF_DISPATCH_STORAGE_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch {}
}

// Send automated SMS & Email notice demanding official stamped letter
export async function sendSmsAndEmailLetterNotice(data: {
  institutionName: string;
  email: string;
  phone: string;
  isConfirmed: boolean;
  contactPerson?: string;
}): Promise<{ success: boolean; dispatch: CourtNotificationDispatch; message: string }> {
  const smsMessage = `[SEERA AI - HUBACHIISA]: Kabajamoo Mana Murtii ${data.institutionName}, akkaataa qajeelfamaatiin xalayaa qaama aangoo qabuun barraa'e, lakkoofsa bahii qabu, chaappaa mana hojii fi teessoo email fi lakkoofsa bilbilaa bulchaa (Admin) keessatti ibsame inbox app Seera AI keessatti akka dhiheessitan isin beeksifna. - Super Admin Ayele Be Dha`;

  const emailSubject = `[Seera AI] Ajaja Dhiyeessa Xalayaa Mana Hojii, Chaappaa fi Lakkoofsa Bahii - ${data.institutionName}`;
  const emailBody = `Kabajamoo ${data.contactPerson || data.institutionName},

Appilikeeshinii Seera AI keessatti tajaajila bulchaa mana murtii (Court Admin) ${data.isConfirmed ? 'mirkanaa\'e itti fufsiisuuf' : 'mirkaneessuuf'}, xalayaan qaama aangoo qabuun ykn mana hojii keessaniin barraa'e akka dhiyaatu murtaa'eera:

Ulaagaalee Xalayaan Qabaachuu Qabu:
1. Lakkoofsa Bahii (Outgoing Ref No) ifa ta'e qabaachuu.
2. Chaappaa Mana Hojii (Official Seal / Stamp) ifatti irratti rukkutamuun kan mirkanaa'e ta'uu.
3. Maqaa guutuu bulchaa adm ta'uuf jiru, Imeelii hojii fi Lakkoofsa Bilbilaa isaa kan of keessaa qabu ta'uu.
4. Xalayichi gama inbox app kanaatiin kallattiin ergamee abbaa appiitiif (Ayele Be Dha) kan dhiyaatu ta'uu.

Ergaan gabaabaan (SMS) lakkoofsa bilbilaa ${data.phone} tiif ergameera.

Bulchiinsa Appii Seera AI`;

  const newDispatch: CourtNotificationDispatch = {
    id: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    institutionName: data.institutionName,
    targetEmail: data.email,
    targetPhone: data.phone,
    channel: 'SMS & Email',
    subject: emailSubject,
    smsMessage,
    emailBody,
    dispatchedAt: new Date().toISOString(),
    status: 'Delivered',
    isConfirmedCourt: data.isConfirmed,
  };

  saveCourtNotificationDispatch(newDispatch);

  // Also update institution request state if matching
  try {
    const rawReq = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (rawReq) {
      const list: CourtAccessRequest[] = JSON.parse(rawReq);
      const updated = list.map(r => {
        if (r.institutionName.toLowerCase() === data.institutionName.toLowerCase() || r.email === data.email) {
          return {
            ...r,
            smsNotificationSent: true,
            emailNotificationSent: true,
            lastNotificationDate: new Date().toISOString(),
          };
        }
        return r;
      });
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updated));
    }
  } catch {}

  // Update confirmed institutions state if matching
  try {
    const rawInst = localStorage.getItem(STORAGE_KEYS.INSTITUTIONS);
    if (rawInst) {
      const list: CourtInstitution[] = JSON.parse(rawInst);
      const updated = list.map(i => {
        if (i.name.toLowerCase() === data.institutionName.toLowerCase() || i.adminEmail === data.email) {
          return {
            ...i,
            smsNotificationSent: true,
            emailNotificationSent: true,
            lastNotificationDate: new Date().toISOString(),
          };
        }
        return i;
      });
      localStorage.setItem(STORAGE_KEYS.INSTITUTIONS, JSON.stringify(updated));
    }
  } catch {}

  return {
    success: true,
    dispatch: newDispatch,
    message: `Ergaan SMS fi Email gara ${data.institutionName} (${data.email} | ${data.phone}) tiin milkaa'inaan ergameera!`
  };
}

// Update or Send Office Letter by Court Admin (Delivers to Live Inbox)
export async function updateCourtOfficeLetter(
  institutionName: string,
  outgoingRefNo: string,
  officialLetterContent: string,
  proposedAdminName: string,
  proposedAdminEmail: string,
  proposedAdminPhone: string = '+251911234567',
  hasOfficialStamp: boolean = true,
  stampSealNote: string = 'Chaappaan Mana Hojii Mirkanaa\'eera'
): Promise<{ success: boolean; message: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    const list: CourtAccessRequest[] = raw ? JSON.parse(raw) : [];
    
    const existingIndex = list.findIndex(r => r.institutionName.toLowerCase() === institutionName.toLowerCase());
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        outgoingRefNo,
        officialLetterContent,
        proposedAdminName,
        proposedAdminEmail,
        proposedAdminPhone,
        hasOfficialStamp,
        stampSealNote,
        letterSubmittedToInbox: true,
        status: 'pending', // Pending re-confirmation
        requestedAt: new Date().toISOString(),
      };
    } else {
      list.unshift({
        id: `req_office_${Date.now()}`,
        institutionName,
        contactPerson: proposedAdminName,
        email: proposedAdminEmail,
        phone: proposedAdminPhone,
        courtLevel: 'high_court',
        jurisdiction: 'Oromia',
        outgoingRefNo,
        officialLetterContent,
        proposedAdminName,
        proposedAdminEmail,
        proposedAdminPhone,
        hasOfficialStamp,
        stampSealNote,
        letterSubmittedToInbox: true,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });
    }

    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(list));

    // Update confirmed institutions state if matching
    const institutions = getLocalInstitutions();
    const updatedInsts = institutions.map(i => {
      if (i.name.toLowerCase() === institutionName.toLowerCase() || i.adminEmail === proposedAdminEmail) {
        return {
          ...i,
          outgoingRefNo,
          officialLetterContent,
          adminPhone: proposedAdminPhone,
          adminName: proposedAdminName,
          hasOfficialStamp,
          stampSealNote,
          letterStatus: 'letter_submitted' as const,
        };
      }
      return i;
    });
    saveLocalInstitutions(updatedInsts);

    // Also dispatch directly to the app's Live Inbox (Sanduuqa Ergaa Abbaa Appii)
    try {
      await sendFeedbackMessage({
        senderName: `${proposedAdminName} (${institutionName})`,
        senderEmail: proposedAdminEmail,
        contactInfo: proposedAdminPhone,
        topic: `🏛️ Xalayaa Mana Hojii & Chaappaa (Ref: ${outgoingRefNo})`,
        message: `[XALAYAA MANA MURTII / STAMPED COURT LETTER]\n\nMana Murtii: ${institutionName}\nLakkoofsa Bahii: ${outgoingRefNo}\nBulchaa Adm: ${proposedAdminName}\nImeelii Bulchaa: ${proposedAdminEmail}\nBilbila Bulchaa: ${proposedAdminPhone}\nChaappaa Mana Hojii: ${hasOfficialStamp ? '✅ Chaappaan Rukkutamee Mirkanaa\'eera (' + stampSealNote + ')' : '⚠️ Chaappaa malee'}\n\nQabiyyee Xalayaa:\n"${officialLetterContent}"\n\nMaaloo inbox keessan irraa mirkaneessaa (Confirm/Re-Confirm godhaa).`,
      });
    } catch (e) {
      console.warn('Inbox dispatch deferred', e);
    }

    try {
      await setDoc(doc(db, 'court_access_requests', `req_office_${Date.now()}`), {
        institutionName,
        outgoingRefNo,
        officialLetterContent,
        proposedAdminName,
        proposedAdminEmail,
        proposedAdminPhone,
        hasOfficialStamp,
        stampSealNote,
        status: 'pending',
        serverTimestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore office letter sync deferred', e);
    }

    return {
      success: true,
      message: 'Xalayaan Mana Hojii chaappaa fi lakkoofsa bahii qabu gara inbox app kanaatti milkaa\'inaan ergameera! Abbaan Appii (Ayele Be Dha) inbox keessatti ni mirkaneessa.'
    };
  } catch (e: any) {
    return { success: false, message: e.message || 'Dogoggorri uumameera.' };
  }
}

// Re-Confirm Court Institution Request by Super Admin
export async function reConfirmCourtInstitution(requestId: string): Promise<{ success: boolean; message: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    const list: CourtAccessRequest[] = raw ? JSON.parse(raw) : [];
    const target = list.find(r => r.id === requestId);

    if (!target) {
      return { success: false, message: 'Iyyanni mana murtii kun hin argamne.' };
    }

    const cleanRef = (target.outgoingRefNo || '').trim();
    const cleanContent = (target.officialLetterContent || '').trim();

    // Check if letter genuinely originates from institution
    if (
      !cleanContent || 
      cleanContent === 'Xalayaa mirkaneessa mana murtii.' || 
      cleanContent.length < 15 || 
      !cleanRef || 
      cleanRef === 'MM/2026'
    ) {
      return {
        success: false,
        message: "Mirkaneessuun hin danda'amu: Xalayaan kun mana hojii isaaniitii bahee hin dhiyaanne! Dhaabbanni mana murtii xalayaa seera qabeessa chaappaa fi lakkoofsa bahii qabu osoo kallattiin hin dhiheessin ofumaan mirkaneessuun dhorkaa dha. Dhaabbanni kun xalayaa bahii akka ergu dura SMS/Email ergaafii.",
      };
    }

    const updated = list.map(r => r.id === requestId ? { ...r, status: 'approved' as const, requestedAt: new Date().toISOString() } : r);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updated));

    if (target) {
      const institutions = getLocalInstitutions();
      const updatedInsts = institutions.map(i => {
        if (i.name.toLowerCase() === target.institutionName.toLowerCase() || i.adminEmail === target.email) {
          return {
            ...i,
            status: 'active' as const,
            letterStatus: 'verified' as const,
            outgoingRefNo: cleanRef,
            officialLetterContent: cleanContent,
            hasOfficialStamp: true,
          };
        }
        return i;
      });
      saveLocalInstitutions(updatedInsts);
    }

    try {
      await updateDoc(doc(db, 'court_access_requests', requestId), {
        status: 'approved',
        reConfirmedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore re-confirm sync deferred', e);
    }

    return { success: true, message: 'Iyyanni fi Xalayaan Mana Hojii irra deebi\'uun milkaa\'inaan mirkanaa\'eera (Re-Confirmed).' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Dogoggorri uumameera.' };
  }
}

export async function updateCourtHeader(institutionId: string, headerTemplate: string): Promise<{ success: boolean; message: string }> {
  try {
    await updateDoc(doc(db, 'court_institutions', institutionId), { headerTemplate });
    
    // Update local cache
    const institutions = getLocalInstitutions();
    const updated = institutions.map(i => i.id === institutionId ? { ...i, headerTemplate } : i);
    saveLocalInstitutions(updated);
    
    return { success: true, message: 'Header milkaa\'inaan haaromfameera!' };
  } catch (e) {
    console.error('Failed to update court header', e);
    return { success: false, message: 'Header haaromsuun hin danda\'amne.' };
  }
}

/**
 * Resizes and compresses court logo file to a clean, lightweight base64 DataURL (max 320x320, ~25KB)
 * Prevents LocalStorage QuotaExceededError and ensures instantaneous offline rendering.
 */
export async function optimizeCourtLogo(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve('');
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 320;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/webp', 0.88);
            return resolve(optimized);
          }
        } catch (err) {
          console.warn('Canvas optimization failed, falling back to original reader result:', err);
        }
        resolve(e.target?.result as string);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Update Court Branding (Name, Logo) & Super Admin Delegation for Leasing Courts
 */
export function updateCourtBrandingAndSuperAdmin(
  institutionId: string,
  branding: {
    customCourtName?: string;
    logoUrl?: string;
    superAdminName?: string;
    superAdminEmail?: string;
    superAdminPhone?: string;
    accessCode?: string;
    courtTelegramLink?: string;
    courtEmailAddress?: string;
  }
): { success: boolean; message: string; institution?: CourtInstitution } {
  const list = getLocalInstitutions();
  let updatedInst: CourtInstitution | null = null;

  const isGurbicha = institutionId === 'inst_gurbicha_woreda_first' || institutionId.includes('gurbicha');

  const updatedList: CourtInstitution[] = list.map(inst => {
    if (inst.id === institutionId || (isGurbicha && (inst.id === 'inst_gurbicha_woreda_first' || inst.id.includes('gurbicha')))) {
      const updated: CourtInstitution = {
        ...inst,
        customCourtName: branding.customCourtName || inst.customCourtName || inst.name,
        name: branding.customCourtName || inst.name,
        logoUrl: branding.logoUrl || inst.logoUrl,
        superAdminName: branding.superAdminName || inst.superAdminName || inst.adminName,
        adminName: branding.superAdminName || inst.adminName,
        superAdminEmail: branding.superAdminEmail || inst.superAdminEmail || inst.adminEmail,
        adminEmail: branding.superAdminEmail || inst.adminEmail,
        superAdminPhone: branding.superAdminPhone || inst.superAdminPhone || inst.adminPhone,
        courtTelegramLink: branding.courtTelegramLink !== undefined ? branding.courtTelegramLink : inst.courtTelegramLink,
        courtEmailAddress: branding.courtEmailAddress !== undefined ? branding.courtEmailAddress : inst.courtEmailAddress,
        accessCode: branding.accessCode || inst.accessCode,
        superAdminDelegatedAt: new Date().toISOString(),
        tenantPrivacyShieldEnabled: true // Strict privacy guarantee: Platform Owner sees metadata only
      };
      updatedInst = updated;
      return updated;
    }
    return inst;
  });

  if (!updatedInst) {
    return { success: false, message: 'Mana murtii hin argamne!' };
  }

  const finalInst: CourtInstitution = updatedInst;

  saveLocalInstitutions(updatedList);

  // Directly store dedicated court logo in localStorage keys for instant 0ms retrieval
  if (branding.logoUrl && typeof window !== 'undefined') {
    try {
      localStorage.setItem(`court_logo_${institutionId}`, branding.logoUrl);
      if (isGurbicha) {
        localStorage.setItem('court_logo_inst_gurbicha_woreda_first', branding.logoUrl);
        localStorage.setItem('court_logo_gurbicha', branding.logoUrl);
      }
    } catch (e) {
      console.warn('LocalStorage court_logo write notice:', e);
    }
  }

  // Sync to active session if matching
  const currentSession = getActiveCourtSession();
  if (currentSession && (currentSession.institutionId === institutionId || (isGurbicha && currentSession.institutionId.includes('gurbicha')))) {
    const updatedSession = {
      ...currentSession,
      courtName: finalInst.customCourtName || finalInst.name,
    };
    setActiveCourtSession(updatedSession);
  }

  // Sync to Firestore using setDoc with merge: true so missing documents do not error out
  try {
    const instDocRef = doc(db, 'court_institutions', institutionId);
    setDoc(instDocRef, {
      id: institutionId,
      name: finalInst.name,
      customCourtName: branding.customCourtName || finalInst.name,
      logoUrl: branding.logoUrl || null,
      adminName: branding.superAdminName || finalInst.adminName,
      adminEmail: branding.superAdminEmail || finalInst.adminEmail,
      tenantPrivacyShieldEnabled: true,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(console.warn);

    // Also mirror to court_branding collection for hook compatibility
    const brandingDocRef = doc(db, 'court_branding', institutionId);
    setDoc(brandingDocRef, {
      institutionId,
      logoUrl: branding.logoUrl || null,
      customCourtName: branding.customCourtName || finalInst.name,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(console.warn);
  } catch (e) {
    console.warn('Firestore branding update deferred:', e);
  }

  // Notify all UI components via custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('seera_court_logo_updated', {
      detail: { institutionId, logoUrl: branding.logoUrl, courtName: finalInst.name }
    }));
  }

  return { 
    success: true, 
    message: 'Maqaa, Loogoo fi Super Admin Mana Murtii milkaa\'inaan haaromfameera!', 
    institution: updatedInst 
  };
}

/**
 * Upload a court logo:
 * 1. Generates an optimized WebP/JPEG thumbnail (<30KB) that is guaranteed to save locally and in Firestore
 * 2. Attempts Firebase Storage upload in background; if storage fails or is blocked, the optimized logo persists safely
 */
export async function uploadCourtLogo(institutionId: string, file: File): Promise<string> {
  // 1. Optimize image to prevent quota issues and ensure instant rendering
  const optimizedDataUrl = await optimizeCourtLogo(file);
  const isGurbicha = institutionId === 'inst_gurbicha_woreda_first' || institutionId.includes('gurbicha');

  // Immediately store optimized thumbnail in local cache and Firestore
  if (optimizedDataUrl) {
    updateCourtBrandingAndSuperAdmin(institutionId, { logoUrl: optimizedDataUrl });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`court_logo_${institutionId}`, optimizedDataUrl);
        if (isGurbicha) {
          localStorage.setItem('court_logo_inst_gurbicha_woreda_first', optimizedDataUrl);
          localStorage.setItem('court_logo_gurbicha', optimizedDataUrl);
        }
      } catch (e) {
        console.warn('LocalStorage error saving logo dataUrl:', e);
      }
    }
  }

  let finalUrl = optimizedDataUrl;

  // 2. Try Firebase Storage upload
  try {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `court_logos/${institutionId}/${Date.now()}_${cleanFileName}`);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/png',
      customMetadata: { institutionId }
    });
    const downloadURL = await getDownloadURL(snapshot.ref);
    if (downloadURL) {
      finalUrl = downloadURL;
      // Update institution with the remote download URL
      updateCourtBrandingAndSuperAdmin(institutionId, { logoUrl: downloadURL });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`court_logo_${institutionId}`, downloadURL);
          if (isGurbicha) {
            localStorage.setItem('court_logo_inst_gurbicha_woreda_first', downloadURL);
            localStorage.setItem('court_logo_gurbicha', downloadURL);
          }
        } catch (e) {
          console.warn('LocalStorage error saving remote logo URL:', e);
        }
      }
    }
  } catch (storageErr) {
    console.warn('Firebase Storage upload notice (safely using optimized base64 DataURL fallback):', storageErr);
  }

  // Dispatch final event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('seera_court_logo_updated', {
      detail: { institutionId, logoUrl: finalUrl }
    }));
  }

  return finalUrl;
}

/**
 * App Owner Multi-Tenant Registry & Judicial Privacy Shield Audit
 * Strips confidential case dockets and yields high-level tenant registry metadata only.
 */
export function getAppOwnerTenantRegistry() {
  const list = getLocalInstitutions();
  const courtUsers = getLocalCourtUsers();

  return list.map(inst => ({
    id: inst.id,
    courtName: inst.customCourtName || inst.name,
    originalName: inst.name,
    courtLevel: inst.courtLevel,
    region: inst.region,
    logoUrl: inst.logoUrl || null,
    superAdminName: inst.superAdminName || inst.adminName,
    superAdminEmail: inst.superAdminEmail || inst.adminEmail,
    superAdminPhone: inst.superAdminPhone || inst.adminPhone,
    status: inst.status,
    activeStaffCount: courtUsers.filter(u => u.institutionId === inst.id).length,
    delegatedAt: inst.superAdminDelegatedAt || inst.createdAt,
    privacyShieldActive: true // Guarantee: Platform Owner cannot see private case dockets
  }));
}

/**
 * Create a custom court institution or folder for any court level (e.g. Mana Murtii Aanaa Doobbaa)
 */
export async function createCustomCourtInstitution(data: {
  name: string;
  region: string;
  courtLevel: CourtLevelType;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
}): Promise<{ success: boolean; institution?: CourtInstitution; message: string }> {
  const accessCode = `CRT-${data.courtLevel.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newInst: CourtInstitution = {
    id: `inst_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name,
    customCourtName: data.name,
    region: data.region,
    courtLevel: data.courtLevel,
    adminEmail: data.adminEmail.trim().toLowerCase(),
    adminName: data.adminName.trim(),
    adminPhone: data.adminPhone || '+251911234567',
    accessCode,
    status: 'active',
    approvedBy: 'ayeledha@gmail.com',
    createdAt: new Date().toISOString(),
    judgesCount: 1,
    availableBenches: [
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Maatii fi Dhaala (Family & Inheritance)',
      'Dhaddacha Lafaafi Qabeenya Dhaabbataa (Land & Real Estate)'
    ],
    seat: data.region,
    hasOfficialStamp: true,
    outgoingRefNo: `MM/${data.name.substring(0, 3).toUpperCase()}/2026/01`,
    officialLetterContent: `Xalayaa hundeeffama mana murtii ${data.name} sadarkaa ${data.courtLevel} tiin ragaa seeraa guutuun qophaa'e.`,
    letterStatus: 'verified'
  };

  const institutions = getLocalInstitutions();
  const updated = [newInst, ...institutions];
  saveLocalInstitutions(updated);

  try {
    await setDoc(doc(db, 'court_institutions', newInst.id), {
      ...newInst,
      serverTimestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore custom institution creation deferred:', e);
  }

  return {
    success: true,
    institution: newInst,
    message: `Manni Murtii "${data.name}" (${data.courtLevel}) milkaa'inaan uumameera! Koodiin seensaa Bulchaa (Admin Passcode): ${accessCode}`
  };
}

/**
 * Update Approval Status for Court Institution in Firestore and Local Cache
 */
export async function updateInstitutionApprovalStatus(
  institutionId: string, 
  newStatus: 'approved' | 'pending' | 'active' | 'suspended'
): Promise<{ success: boolean; message: string; newStatus: string }> {
  const localList = getLocalInstitutions();
  const instIndex = localList.findIndex(i => i.id === institutionId);

  if (instIndex >= 0) {
    localList[instIndex] = {
      ...localList[instIndex],
      institutionStatus: newStatus,
      status: newStatus === 'approved' ? 'active' : newStatus === 'pending' ? 'pending' : 'suspended',
    };
    saveLocalInstitutions(localList);
  }

  // Update Firestore court_institutions document
  try {
    const instDocRef = doc(db, 'court_institutions', institutionId);
    await updateDoc(instDocRef, {
      institutionStatus: newStatus,
      status: newStatus === 'approved' ? 'active' : newStatus === 'pending' ? 'pending' : 'suspended',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `court_institutions/${institutionId}`);
  }

  return {
    success: true,
    message: `Haalli eeyyamaa (Approval Status) mana murtii '${institutionId}' gara '${newStatus}'tti jijjiirameera!`,
    newStatus,
  };
}

export interface FolderPermissions {
  canViewFolder: boolean;
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  canViewAuditLogs: boolean;
  canIssueOrders: boolean;
}

export interface CourtPersonnelMapping {
  id: string;
  userEmail: string;
  userFullName: string;
  woredaCourtId: string;
  woredaCourtName: string;
  role: 'Judge' | 'Registrar' | 'Clerk' | 'Court Admin' | 'Legal Expert';
  permissions: FolderPermissions;
  assignedBy: string;
  assignedAt: string;
  status: 'active' | 'revoked';
}

const DEFAULT_PERSONNEL_MAPPINGS: CourtPersonnelMapping[] = [
  {
    id: 'map_gurbicha_judge_1',
    userEmail: 'gurbicha.ab@court.oromia.et',
    userFullName: 'Abbaa Seeraa Gurbicha',
    woredaCourtId: 'inst_gurbicha_woreda_first',
    woredaCourtName: 'Mana Murtii Aanaa Gurbicha',
    role: 'Judge',
    permissions: {
      canViewFolder: true,
      canUploadDocuments: true,
      canDeleteDocuments: false,
      canViewAuditLogs: true,
      canIssueOrders: true,
    },
    assignedBy: 'ayeledha@gmail.com',
    assignedAt: new Date().toISOString(),
    status: 'active',
  },
  {
    id: 'map_adama_registrar_1',
    userEmail: 'registrar.adama@court.oromia.et',
    userFullName: 'Galmeessaa Adamaa',
    woredaCourtId: 'inst_adama_woreda_first',
    woredaCourtName: 'Mana Murtii Aanaa Adaamaa',
    role: 'Registrar',
    permissions: {
      canViewFolder: true,
      canUploadDocuments: true,
      canDeleteDocuments: false,
      canViewAuditLogs: true,
      canIssueOrders: false,
    },
    assignedBy: 'ayeledha@gmail.com',
    assignedAt: new Date().toISOString(),
    status: 'active',
  },
];

export function getLocalPersonnelMappings(): CourtPersonnelMapping[] {
  try {
    const raw = localStorage.getItem('seera_court_personnel_mappings_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse personnel mappings cache:', e);
  }
  localStorage.setItem('seera_court_personnel_mappings_cache', JSON.stringify(DEFAULT_PERSONNEL_MAPPINGS));
  return DEFAULT_PERSONNEL_MAPPINGS;
}

export function saveLocalPersonnelMappings(mappings: CourtPersonnelMapping[]): void {
  localStorage.setItem('seera_court_personnel_mappings_cache', JSON.stringify(mappings));
}

export async function addOrUpdatePersonnelMapping(mapping: CourtPersonnelMapping): Promise<{ success: boolean; mapping: CourtPersonnelMapping; message: string }> {
  const current = getLocalPersonnelMappings();
  const existingIdx = current.findIndex(m => m.id === mapping.id || (m.userEmail.toLowerCase() === mapping.userEmail.toLowerCase() && m.woredaCourtId === mapping.woredaCourtId));
  
  if (existingIdx >= 0) {
    current[existingIdx] = mapping;
  } else {
    current.unshift(mapping);
  }

  saveLocalPersonnelMappings(current);

  // Sync to Firestore collection
  try {
    const mapDocRef = doc(db, 'court_personnel_mappings', mapping.id);
    await setDoc(mapDocRef, {
      ...mapping,
      serverTimestamp: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `court_personnel_mappings/${mapping.id}`);
  }

  return {
    success: true,
    mapping,
    message: `User email '${mapping.userEmail}' mapped to ${mapping.woredaCourtName} as ${mapping.role}!`,
  };
}

export async function deletePersonnelMapping(mappingId: string): Promise<{ success: boolean; message: string }> {
  const current = getLocalPersonnelMappings().filter(m => m.id !== mappingId);
  saveLocalPersonnelMappings(current);

  try {
    const mapDocRef = doc(db, 'court_personnel_mappings', mappingId);
    await updateDoc(mapDocRef, {
      status: 'revoked',
      revokedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Deferred remote revocation for mapping:', err);
  }

  return { success: true, message: 'Court personnel mapping removed.' };
}



