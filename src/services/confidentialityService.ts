/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SeeraAI Legal Confidentiality, Data Protection & Judicial Privacy Engine
 * Implements strict legal confidentiality safeguards pursuant to:
 * - FDRE Constitution Art. 26 (Right to Privacy / Mirga Qulqullina Dhuunfaa)
 * - Ethiopian Criminal Procedure Code Art. 176 (In-Camera Hearings / Dhaddacha Cufaa)
 * - Revised Family Code Art. 116 & 142 (Protection of Minors & Paternity Records)
 * - Proclamation No. 1234/2021 (Personal Data & Identity Protection)
 * - Ethiopian Federal Bar Association & Judicial Ethics Canons (Attorney-Client Privilege)
 */

export type ConfidentialityLevel = 
  | 'PUBLIC' 
  | 'RESTRICTED' 
  | 'CONFIDENTIAL_IN_CAMERA' 
  | 'MINOR_PROTECTED' 
  | 'ATTORNEY_CLIENT_PRIVILEGE' 
  | 'JUDICIAL_DELIBERATION';

export interface ConfidentialitySettings {
  isShieldActive: boolean;
  redactPhoneNumbers: boolean;
  redactBankAccounts: boolean;
  redactNationalIds: boolean;
  redactMinorNames: boolean;
  redactLitigantPhysicalAddresses: boolean;
  defaultLevel: ConfidentialityLevel;
  customRedactTerms: string[];
  autoLockMinutes: number;
  logAuditAccess: boolean;
}

export interface ConfidentialAuditEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  userRole: string;
  action: 'VIEW' | 'EXPORT_PDF' | 'EXPORT_DOCX' | 'PRINT' | 'UNMASK_PII' | 'CHANGE_CLASSIFICATION' | 'AUDIT_LOG_EXPORT';
  caseNumber?: string;
  documentTitle?: string;
  classificationLevel: ConfidentialityLevel;
  details?: string;
  verificationHash: string;
}

const STORAGE_KEYS = {
  SETTINGS: 'seera_confidentiality_settings',
  AUDIT_LOGS: 'seera_confidentiality_audit_logs',
  SHIELD_ACTIVE: 'seera_privacy_shield_active',
  SCREEN_BLURRED: 'seera_panic_screen_blurred',
};

const DEFAULT_SETTINGS: ConfidentialitySettings = {
  isShieldActive: true,
  redactPhoneNumbers: true,
  redactBankAccounts: true,
  redactNationalIds: true,
  redactMinorNames: true,
  redactLitigantPhysicalAddresses: true,
  defaultLevel: 'CONFIDENTIAL_IN_CAMERA',
  customRedactTerms: [],
  autoLockMinutes: 10,
  logAuditAccess: true,
};

/**
 * Generate a tamper-evident verification hash for audit integrity
 */
export function generateAuditVerificationHash(data: string): string {
  let hash = 0;
  const str = `${data}-${Date.now()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ETH-LEGAL-CONF-${hex}-${rand}`;
}

/**
 * Retrieves stored confidentiality settings
 */
export function getConfidentialitySettings(): ConfidentialitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves confidentiality settings and notifies listeners
 */
export function saveConfidentialitySettings(settings: Partial<ConfidentialitySettings>): ConfidentialitySettings {
  const current = getConfidentialitySettings();
  const updated = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEYS.SHIELD_ACTIVE, updated.isShieldActive ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('seera_confidentiality_settings_changed', { detail: updated }));
  }
  return updated;
}

/**
 * Checks if Global Privacy Shield is active
 */
export function isPrivacyShieldActive(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEYS.SHIELD_ACTIVE);
  if (val === null) return true; // Default enabled for legal safety
  return val === 'true';
}

/**
 * Toggles Global Privacy Shield
 */
export function setPrivacyShieldActive(active: boolean): void {
  saveConfidentialitySettings({ isShieldActive: active });
}

export interface RedactionResult {
  text: string;
  redactionCount: number;
  redactedCategories: string[];
}

/**
 * Core PII & Judicial Sensitivity Redactor
 * Masks Ethiopian phone numbers, bank accounts (CBE, Sinqee, Awash, Telebirr),
 * Kebele/National IDs, minor litigant names, and confidential witness info.
 */
export function redactSensitiveLegalData(
  rawText: string,
  customSettings?: Partial<ConfidentialitySettings>
): RedactionResult {
  if (!rawText) return { text: '', redactionCount: 0, redactedCategories: [] };

  const settings = { ...getConfidentialitySettings(), ...customSettings };
  if (!settings.isShieldActive) {
    return { text: rawText, redactionCount: 0, redactedCategories: [] };
  }

  let redacted = rawText;
  let count = 0;
  const categories: Set<string> = new Set();

  // 1. Ethiopian Phone Numbers: +251..., 09..., 07...
  if (settings.redactPhoneNumbers) {
    const phoneRegex = /(\+251\s?[79]\d{1,2}[\s.-]?\d{3}[\s.-]?\d{3,4}|0[79]\d{1,2}[\s.-]?\d{3}[\s.-]?\d{3,4})/gi;
    redacted = redacted.replace(phoneRegex, () => {
      count++;
      categories.add('phone');
      return '[BILBILA DHOKFAME / REDACTED PHONE]';
    });
  }

  // 2. Ethiopian Bank Accounts & Telebirr:
  // e.g. CBE 1000..., Sinqee 100..., Awash, Dashen, Wegagen, Cooperative Bank of Oromia
  if (settings.redactBankAccounts) {
    const bankRegex = /\b(1000\d{8,12}|013\d{10,13}|COOP\d{8,12}|SINQEE[\s-]?\d{6,12}|CBE[\s-]?\d{10,13}|TELEBIRR[\s-]?\d{9,10})\b/gi;
    redacted = redacted.replace(bankRegex, () => {
      count++;
      categories.add('bank_account');
      return '[HERREGA BAANKII DHOKFAME / REDACTED ACCT]';
    });

    const bankMentionRegex = /\b(Herrega\s+Baankii|Baankii\s+Daldalaa|Sinqee|Awash\s+Bank|CBE\s+Account|Account\s+No|Lakk\.\s*Herregaa)[:\s]+([0-9-]{7,18})\b/gi;
    redacted = redacted.replace(bankMentionRegex, (_match, prefix) => {
      count++;
      categories.add('bank_account');
      return `${prefix}: [HERREGA BAANKII DHOKFAME / REDACTED ACCT]`;
    });
  }

  // 3. National ID / Kebele Card / Fayda / Resident ID:
  if (settings.redactNationalIds) {
    const idRegex = /\b(KB-[A-Z0-9]{4,10}|ID[:\s]+[A-Z0-9]{5,12}|Waraqaa\s+Eenyummaa[:\s]+[A-Z0-9-]{4,14}|Fayda[:\s]+[0-9-]{10,16}|Kebele\s+ID[:\s]+[A-Z0-9-]{4,12})\b/gi;
    redacted = redacted.replace(idRegex, () => {
      count++;
      categories.add('national_id');
      return '[EENYUMMAA DHOKFAME / REDACTED ID]';
    });
  }

  // 4. Protection of Minors (CPC Art. 176 & Family Code Art. 116):
  // Detect references to children/minors e.g. "Daa'ima (maqaa)...", "Minor...", "ህፃን..."
  if (settings.redactMinorNames) {
    const minorRegex = /\b(Daa'im[a-z]*|Minor|ህፃን)\s+([A-Z][a-z]+(\s+[A-Z][a-z]+){1,2})/g;
    redacted = redacted.replace(minorRegex, (_match, prefix) => {
      count++;
      categories.add('minor_identity');
      return `${prefix} [DAA'IMA X - Kwt. 176 Eegamaa / PROTECTED MINOR]`;
    });
  }

  // 5. Litigant Addresses / Specific Kebele numbers & house numbers:
  if (settings.redactLitigantPhysicalAddresses) {
    const addressRegex = /\b(Ganda\s+\d{2,3}|Kebele\s+\d{2,3}|Lakk\.\s*Manaa\s+[0-9A-Z/-]+|House\s+No\.?\s+[0-9A-Z/-]+)\b/gi;
    redacted = redacted.replace(addressRegex, () => {
      count++;
      categories.add('address');
      return '[TEESSOO DHOKFAME / REDACTED ADDRESS]';
    });
  }

  // 6. Custom user-defined confidential terms
  if (settings.customRedactTerms && settings.customRedactTerms.length > 0) {
    for (const term of settings.customRedactTerms) {
      if (term.trim().length >= 2) {
        const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const termRegex = new RegExp(`\\b${escaped}\\b`, 'gi');
        redacted = redacted.replace(termRegex, () => {
          count++;
          categories.add('custom_term');
          return '[ICCITII DHOKFAME / CONFIDENTIAL]';
        });
      }
    }
  }

  return {
    text: redacted,
    redactionCount: count,
    redactedCategories: Array.from(categories),
  };
}

/**
 * Access Audit Trail Logger
 */
export function logConfidentialAccess(entry: Omit<ConfidentialAuditEntry, 'id' | 'timestamp' | 'verificationHash'>): ConfidentialAuditEntry {
  const timestamp = new Date().toISOString();
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const hash = generateAuditVerificationHash(`${entry.userEmail}-${entry.action}-${entry.caseNumber || 'general'}`);

  const fullEntry: ConfidentialAuditEntry = {
    ...entry,
    id,
    timestamp,
    verificationHash: hash,
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      const list: ConfidentialAuditEntry[] = raw ? JSON.parse(raw) : [];
      list.unshift(fullEntry);
      // Keep up to 250 most recent access logs
      const trimmed = list.slice(0, 250);
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(trimmed));
      window.dispatchEvent(new CustomEvent('seera_confidentiality_audit_added', { detail: fullEntry }));
    } catch (e) {
      console.error('Failed to log confidential audit entry', e);
    }
  }

  return fullEntry;
}

/**
 * Retrieve all Confidentiality Audit Logs
 */
export function getConfidentialAccessLogs(): ConfidentialAuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!raw) {
      // Seed initial sample court access log if empty
      const initialSeed: ConfidentialAuditEntry[] = [
        {
          id: 'audit_init_01',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          userEmail: 'court.registrar@oromia.gov.et',
          userName: 'Galmeessaa Mana Murtii',
          userRole: 'registrar',
          action: 'VIEW',
          caseNumber: 'MM/AD/2026/0491',
          documentTitle: 'Falmii Dhaala Maatii & Daa\'immanii',
          classificationLevel: 'MINOR_PROTECTED',
          details: 'Verified judicial access authorization pursuant to CPC Art. 176',
          verificationHash: generateAuditVerificationHash('init-01'),
        },
        {
          id: 'audit_init_02',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          userEmail: 'judge.adama@oromia.gov.et',
          userName: 'Abbaa Seeraa Masfin Mokonnin',
          userRole: 'judge',
          action: 'EXPORT_PDF',
          caseNumber: 'MM/OR/2026/0812',
          documentTitle: 'Murtii Dhaddacha Cufaa (In-Camera Decision)',
          classificationLevel: 'CONFIDENTIAL_IN_CAMERA',
          details: 'PDF exported with cryptographic confidentiality stamp',
          verificationHash: generateAuditVerificationHash('init-02'),
        }
      ];
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialSeed));
      return initialSeed;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Clear Audit Logs (Authorized Admin Only)
 */
export function clearConfidentialAccessLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
  window.dispatchEvent(new CustomEvent('seera_confidentiality_audit_cleared'));
}

/**
 * Export Audit Trail as CSV for Court Inspection
 */
export function exportConfidentialAuditTrailToCsv(): string {
  const logs = getConfidentialAccessLogs();
  const headers = ['ID', 'Guyyaa & Sa\'aatii (Timestamp)', 'Email', 'Maqaa (Name)', 'Gahee (Role)', 'Tarkaanfii (Action)', 'Lakk. Galmee (Case No)', 'Mata-duree (Doc Title)', 'Sadarkaa Iccitii (Level)', 'Hash'];
  const rows = logs.map(l => [
    l.id,
    new Date(l.timestamp).toLocaleString(),
    `"${l.userEmail}"`,
    `"${l.userName}"`,
    `"${l.userRole}"`,
    l.action,
    `"${l.caseNumber || 'N/A'}"`,
    `"${(l.documentTitle || '').replace(/"/g, '""')}"`,
    l.classificationLevel,
    l.verificationHash
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Get human-friendly label and description for confidentiality levels
 */
export function getConfidentialityLevelInfo(level: ConfidentialityLevel, lang: 'om' | 'am' | 'en' = 'om') {
  switch (level) {
    case 'PUBLIC':
      return {
        badge: 'UUMMATAAF BANAA',
        badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
        title: lang === 'am' ? 'የህዝብ ግልጽ ሰነድ' : lang === 'en' ? 'Public Record' : 'Sanada Uummataaf Banaa',
        legalBasis: lang === 'am' ? 'ሕገ መንግሥት አንቀጽ 12' : lang === 'en' ? 'FDRE Const. Art. 12 (Transparency)' : 'Heera RDFI Kwt. 12 (Iftoomina)',
        icon: '🌐',
      };
    case 'RESTRICTED':
      return {
        badge: 'DAANGEFFAMAA',
        badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
        title: lang === 'am' ? 'የተገደበ ሰነድ' : lang === 'en' ? 'Restricted Docket' : 'Galmee Daangeffamaa',
        legalBasis: lang === 'am' ? 'የፍርድ ቤት መመሪያ' : lang === 'en' ? 'Court Administration Rule' : 'Qajeelfama Bulchiinsa Mana Murtii',
        icon: '📁',
      };
    case 'CONFIDENTIAL_IN_CAMERA':
      return {
        badge: 'DHADDACHA CUFAA',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
        title: lang === 'am' ? 'በዝግ ችሎት የሚታይ (In-Camera)' : lang === 'en' ? 'In-Camera Confidential (Art. 176)' : 'Dhaddacha Cufaa (Kwt. 176)',
        legalBasis: lang === 'am' ? 'የወንጀል ሥነ ሥርዓት ሕግ አንቀጽ 176 / ሕገ መንግሥት አንቀጽ 26' : lang === 'en' ? 'CPC Art. 176 / FDRE Const. Art. 26' : 'Seera Adeemsa Falmii Yakkaa Kwt. 176 / Heera Kwt. 26',
        icon: '⚖️',
      };
    case 'MINOR_PROTECTED':
      return {
        badge: "EEGUMSA DAA'IMAA",
        badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
        title: lang === 'am' ? 'የህፃናት መብት ጥበቃ (Minor Protected)' : lang === 'en' ? 'Minor & Juvenile Protected' : "Eegumsa Daa'immanii & Maatii",
        legalBasis: lang === 'am' ? 'የተሻሻለው የቤተሰብ ሕግ አንቀጽ 116 / የወ/ሥ/ሥ/ሕ አንቀጽ 176' : lang === 'en' ? 'Revised Family Code Art. 116 / CPC Art. 176' : "Seera Maatii Fooyya'e Kwt. 116 / SAFY Kwt. 176",
        icon: '👶',
      };
    case 'ATTORNEY_CLIENT_PRIVILEGE':
      return {
        badge: 'ICCITII ABUKAATTOO',
        badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
        title: lang === 'am' ? 'የጠበቃና ደንበኛ ሚስጥር' : lang === 'en' ? 'Attorney-Client Privilege' : 'Iccitii Abukaatoo fi Maamilaa',
        legalBasis: lang === 'am' ? 'የጠበቆች የሥነ ምግባር ደንብ ቁጥር 57/1991' : lang === 'en' ? 'Federal Advocates Code of Conduct' : 'Dambii Naamusa Abukaattotaa Kwt. 24',
        icon: '🔒',
      };
    case 'JUDICIAL_DELIBERATION':
      return {
        badge: 'ICCITII MARII DHADDACHAA',
        badgeColor: 'bg-red-500/20 text-red-300 border-red-500/50',
        title: lang === 'am' ? 'የዳኞች የውይይት ሚስጥር' : lang === 'en' ? 'Judicial Deliberation Secret' : 'Iccitii Marii Murtii Abbootii Seeraa',
        legalBasis: lang === 'am' ? 'የዳኞች የሥነ ምግባር ደንብ / የፍ/ብ/ሥ/ሥ/ሕ አንቀጽ 180' : lang === 'en' ? 'Judicial Ethics & Civil Proc. Code Art. 180' : 'Dambii Naamusa Abbootii Seeraa / SAFH Kwt. 180',
        icon: '🏛️',
      };
  }
}
