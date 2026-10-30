import { Language } from '../i18n/translations';
import CryptoJS from 'crypto-js';
import { saveOfflineDocumentToDB, deleteOfflineDocumentFromDB, getOfflineDocumentsFromDB } from './indexedDb';
import { backgroundSyncManager } from './backgroundSync';
import { auth, db } from './firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

export interface DocumentVersion {
  id: string;
  timestamp: string;
  title: string;
  content: string;
}

export interface VoiceAnnotation {
  id: string;
  title?: string;
  audioDataUrl?: string; // base64 data URL of recorded audio
  durationSeconds: number;
  transcript?: string; // Contextual spoken annotation or transcript
  language: 'om' | 'am' | 'en';
  recordedAt: string;
}

export interface SavedLegalDocument {
  id: string;
  userId?: string; // Strictly scoped to author so other users cannot see it
  userEmail?: string;
  title: string;
  taskType: 'contract' | 'explain_law' | 'social_facebook' | 'social_telegram' | 'translate' | 'general';
  prompt: string;
  outputLanguages: Language[];
  content: string;
  separatedVersions?: {
    om?: string;
    am?: string;
    en?: string;
  };
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  versions?: DocumentVersion[];
  projectName?: string;
  folderId?: string; // ID of custom folder
  isBookmarked?: boolean; // Fast bookmarking flag
  isHighSecurity?: boolean; // WebAuthn Biometric unlock required for high-security legal document
  voiceNotes?: VoiceAnnotation[]; // Voice note annotations stored alongside the document data
  litigationStage?: 'filing' | 'summons' | 'pleading' | 'evidence' | 'deliberation' | 'verdict'; // litigation lifecycle status
  hearingDate?: string; // ISO string for the next scheduled court hearing
  serviceDate?: string; // Date document was served or court order issued
  filingDeadline?: {
    date: string;
    label: { om: string; am: string; en: string };
    type: 'appeal' | 'defense' | 'set_aside' | 'other';
  };
  caseName?: string; // Automatically extracted AI entity
  extractedDate?: string; // Date found within the document text
  docType?: string; // e.g. 'Claim', 'Defense', 'Judgment', 'Contract'
  fileDataUrl?: string; // Optional: stored base64 data URL for visual preview (images/PDFs)
  mimeType?: string; // Optional: original file mime type
}

export interface Annotation {
  id: string;
  userId?: string;
  documentId: string;
  selectedText: string;
  color?: 'amber' | 'emerald' | 'cyan' | 'purple';
  content: string;
  crossReference?: string;
  tag?: 'risk' | 'compliance' | 'important' | 'cross_ref' | 'pleading';
  rangeStart?: number;
  rangeEnd?: number;
  createdAt: string;
}

export interface LegalFolder {
  id: string;
  name: string;
  color?: string; // e.g., 'amber' | 'emerald' | 'blue' | 'purple' | 'rose'
  createdAt: string;
}

export interface LawFirmBranding {
  firmNameOm: string;
  firmNameAm: string;
  firmNameEn: string;
  advocateName: string;
  roleTitle: string; // 'Ogeessa Seeraa' | 'Abbaa Seeraa' | 'Abukaattoo' | 'Legal Expert'
  licenseNumber: string;
  phone: string;
  facebookPage: string; // Facebook page replacing or complementing phone number
  telegramHandle?: string;
  linkedinProfile?: string;
  email: string;
  officeAddress: string;
  sealStyle: 'circular' | 'rectangular' | 'minimal';
  showSealOnPdf: boolean;
}

export interface RecentSearch {
  id: string;
  query: string;
  category: 'explain_law' | 'cassation' | 'glossary' | 'general';
  timestamp: number;
  resultCount?: number;
}

export interface AppProtectionSettings {
  isAntiCloningActive: boolean;
  protectRightClick: boolean;
  watermarkProtection: boolean;
  ownerEmail: string;
  ownerName: string;
  registeredProclamation: string;
}

export interface LegalUpdateSubscription {
  optIn: boolean;
  email: string;
  practiceAreas: string[];
  frequency: 'instant' | 'weekly' | 'monthly';
}

export interface ContentSynchronizationSettings {
  autoSyncTelegram: boolean;
  refreshFrequency: '15m' | '1h' | '6h' | '24h' | 'daily' | 'weekly';
  monitoredChannels: string[];
  syncOnStartup: boolean;
  notifyOnNewEnactment: boolean;
  lastSyncedTimestamp?: string;
}

export type NetworkProvider = 'telebirr' | 'safaricom';

export interface DataPrivacySettings {
  allowAnalyticsCollection: boolean;
  makeContentPublic: boolean;
  showProfileToOthers: boolean;
  syncDataAcrossDevices: boolean;
}

export interface UserSettings {
  appLanguage: Language; // Default: 'om' (Afaan Oromoo)
  defaultOutputLanguage: 'om' | 'am' | 'en' | 'all' | 'same_as_input' | 'ask';
  fontSize: 'normal' | 'large';
  autoDetectInput: boolean;
  aiModelTier: 'flash' | 'pro' | 'deep_thinking';
  theme?: 'system' | 'light' | 'dark';
  photoUrl?: string; // Profile picture URL or base64 data URL
  lawFirmBranding: LawFirmBranding;
  referrerId?: string; // User vanity referral ID (e.g. 'ayele', 'ayele-jurist')
  visitorName?: string; // The name entered by a visitor (Facebook/Telegram/Email)
  facebookLink?: string; // Optional Facebook profile URL / handle
  telegramLink?: string; // Optional Telegram profile URL / handle
  linkedinLink?: string; // Optional LinkedIn profile URL / handle
  appUsername?: string; // Custom social-media style app account username (e.g. oroethio1)
  appProtection?: AppProtectionSettings;
  isLegalProfessional?: boolean; // Required: Must be true to access the app
  accountStatus?: 'pending' | 'approved'; // Default to pending for new account registrations requiring admin approval
  legalRole?: 'judge' | 'advocate' | 'prosecutor' | 'advisor' | 'student' | 'researcher' | 'other_legal'; // Selected legal profession
  licenseOrInstitution?: string; // Organization, bar association or university
  verifiedAt?: string; // Timestamp of verification
  activeSessions?: Record<string, { deviceType: string; browser: string; os: string; lastActive: string; loginTime: string }>;
  lastLoginSessions?: { timestamp: string; method: 'password' | 'biometric' }[];
  biometricLogs?: { timestamp: string; status: 'requested' | 'success' | 'failed'; method?: string; note?: string }[];
  biometricEnabled?: boolean;
  biometricDocumentProtection?: boolean; // Biometric (FaceID/Fingerprint) WebAuthn unlock toggle for high-security documents
  biometricCredentialId?: string;
  biometricMethod?: 'fingerprint' | 'faceid' | 'passkey' | 'device_biometric';
  role?: 'premium' | 'admin' | 'standard' | 'free' | string;
  subscriptionTier?: 'premium' | 'standard' | 'free' | string;
  isPremium?: boolean;
  subscriptionPlan?: 'starter' | 'pro' | 'unlimited';
  paymentHistory?: any[];
  legalUpdateSubscription?: LegalUpdateSubscription;
  contentSynchronization?: ContentSynchronizationSettings;
  dataPrivacy?: DataPrivacySettings;
  networkProvider: NetworkProvider;
  autoLockTimeout?: number; // In minutes, 0 means disabled
  customApiKey?: string; // User's personal AI / Gemini API key
  ttsVoiceGender?: 'male' | 'female';
  ttsVoiceAge?: '35' | 'older' | 'young';
  ttsTone?: 'authoritative' | 'calm' | 'formal' | 'warm';
  ttsRate?: number; // Speech synthesis rate (0.5 to 2.0)
  harargeeDialectTts?: boolean; // Harargee dialect optimization toggle for TTS playback
  twoFactorEnabled?: boolean; // Enable 2FA for account security
  uiBrightness?: number; // UI brightness percentage (0.5 to 1.5)
  showShareBranding?: boolean; // Toggle to include name/designation in social media shared content
  offlineModeEnabled?: boolean; // Explicit toggle to disable background sync worker and Firestore sync
  uid?: string; // Firebase UID
  email?: string; // User email
}

const STORAGE_KEYS = {
  DOCS: 'seera_ai_saved_documents',
  FOLDERS: 'seera_ai_legal_folders',
  SETTINGS: 'seera_ai_user_settings',
  PROJECTS: 'seera_ai_projects',
  RECENT_SEARCHES: 'seera_ai_recent_searches',
  SAVED_SEARCHES: 'seera_ai_saved_search_queries',
  REFERRER_ID: 'seera_ai_user_referrer_id',
  VISITOR_NAME: 'seera_ai_visitor_name',
};

export const DEFAULT_PROTECTION: AppProtectionSettings = {
  isAntiCloningActive: true,
  protectRightClick: true,
  watermarkProtection: true,
  ownerEmail: 'support@saiethio.com',
  ownerName: 'Ayele Be Dha (Ogeessa Seeraa)',
  registeredProclamation: 'FDRE Proclamation No. 410/2004 (Copyright & Neighboring Rights)',
};

export const DEFAULT_BRANDING: LawFirmBranding = {
  firmNameOm: 'SAI Ethio (www.saorethio1.com)',
  firmNameAm: 'SAI Ethio (www.saorethio1.com)',
  firmNameEn: 'SAI Ethio (www.saorethio1.com)',
  advocateName: 'Ayele Be Dha',
  roleTitle: 'Ogeessa Seeraa',
  licenseNumber: 'FDRE-JURIST/2026',
  phone: '', // Replaced with Facebook Page per user request
  facebookPage: 'facebook.com/ayele.bedha',
  email: 'ayele.law@seeraai.et',
  officeAddress: 'Finfinnee / Addis Ababa, Ethiopia',
  sealStyle: 'circular',
  showSealOnPdf: true,
};

export const DEFAULT_FOLDERS: LegalFolder[] = [
  { id: 'contracts', name: 'Waliigalteewwan (Contracts)', color: 'amber', createdAt: new Date().toISOString() },
  { id: 'petitions', name: 'Iyyannoowwan (Petitions & Court)', color: 'blue', createdAt: new Date().toISOString() },
  { id: 'research', name: 'Qorannoo Seeraa (Legal Research)', color: 'emerald', createdAt: new Date().toISOString() },
];

export const DEFAULT_SETTINGS: UserSettings = {
  appLanguage: 'om', // Default: Afaan Oromoo as required
  defaultOutputLanguage: 'om',
  fontSize: 'normal',
  autoDetectInput: true,
  aiModelTier: 'deep_thinking', // X20 Thinking / Pro model tier default for deep legal analysis
  theme: 'system',
  lawFirmBranding: DEFAULT_BRANDING,
  referrerId: 'ayele-jurist',
  appProtection: DEFAULT_PROTECTION,
  legalUpdateSubscription: {
    optIn: false,
    email: '',
    practiceAreas: ['property', 'labor', 'contract'],
    frequency: 'weekly'
  },
  contentSynchronization: {
    autoSyncTelegram: true,
    refreshFrequency: '1h',
    monitoredChannels: [
      'https://t.me/wakoyeb',
      'https://t.me/ayelebeharmee',
      'https://t.me/ethiopianlaws',
      'https://t.me/OromiaSupremeCourt'
    ],
    syncOnStartup: true,
    notifyOnNewEnactment: true,
    lastSyncedTimestamp: new Date().toISOString()
  },
  dataPrivacy: {
    allowAnalyticsCollection: true,
    makeContentPublic: false,
    showProfileToOthers: false,
    syncDataAcrossDevices: true
  },
  networkProvider: 'telebirr',
  biometricDocumentProtection: false,
  biometricEnabled: false,
  autoLockTimeout: 0,
  harargeeDialectTts: true,
  ttsRate: 0.90,
  ttsVoiceGender: 'male',
  ttsVoiceAge: '35',
  ttsTone: 'authoritative',
  uiBrightness: 1.25,
  showShareBranding: true,
  accountStatus: 'pending',
  offlineModeEnabled: false
};

export function getCurrentUserKey(): string {
  if (typeof window === 'undefined') return 'guest';
  if (auth?.currentUser?.uid) return auth.currentUser.uid;
  const storedId = localStorage.getItem('seera_current_user_id');
  if (storedId) return storedId;
  const storedEmail = localStorage.getItem('seera_current_user_email') || localStorage.getItem('seera_user_email');
  if (storedEmail) return storedEmail.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  
  // Isolated Court Session Key
  const courtSessionRaw = sessionStorage.getItem('seera_court_active_session');
  if (courtSessionRaw) {
    try {
      const parsed = JSON.parse(courtSessionRaw);
      if (parsed?.user?.id) return `court_${parsed.institutionId}_${parsed.user.id}`;
    } catch {}
  }

  // Isolated session guest key to protect privacy between different sessions
  let guestSessionId = sessionStorage.getItem('seera_guest_session_id');
  if (!guestSessionId) {
    guestSessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem('seera_guest_session_id', guestSessionId);
  }
  return guestSessionId;
}

export function getCurrentUserEmail(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return auth?.currentUser?.email || localStorage.getItem('seera_current_user_email') || localStorage.getItem('seera_user_email') || undefined;
}

export function getUserScopedKey(baseKey: string): string {
  const userKey = getCurrentUserKey();
  return `${baseKey}_${userKey}`;
}

export function getSavedDocuments(): SavedLegalDocument[] {
  try {
    const userKey = getCurrentUserKey();
    const userEmail = getCurrentUserEmail()?.toLowerCase();
    const userScopedKey = getUserScopedKey(STORAGE_KEYS.DOCS);
    let raw = localStorage.getItem(userScopedKey);

    // Initial migration fallback for exact user matching
    if (!raw) {
      const legacyRaw = localStorage.getItem(STORAGE_KEYS.DOCS);
      if (legacyRaw) {
        try {
          const legacyDocs: SavedLegalDocument[] = JSON.parse(legacyRaw);
          const filtered = legacyDocs.filter(d => 
            (d.userId && d.userId === userKey) || 
            (userEmail && d.userEmail && d.userEmail.toLowerCase() === userEmail)
          );
          if (filtered.length > 0) {
            localStorage.setItem(userScopedKey, JSON.stringify(filtered));
            raw = JSON.stringify(filtered);
          }
        } catch {}
      }
    }

    if (!raw) return [];
    const docs: SavedLegalDocument[] = JSON.parse(raw);
    // Strictly isolate: only show documents strictly belonging to the current user
    return docs.filter(d => 
      (d.userId && d.userId === userKey) || 
      (userEmail && d.userEmail && d.userEmail.toLowerCase() === userEmail)
    );
  } catch (e) {
    console.error('Failed to load saved docs', e);
    return [];
  }
}

export async function getSavedDocumentsAsync(): Promise<SavedLegalDocument[]> {
  try {
    const idbDocs = await getOfflineDocumentsFromDB();
    if (idbDocs && idbDocs.length > 0) {
      const userKey = getCurrentUserKey();
      const userEmail = getCurrentUserEmail()?.toLowerCase();
      return idbDocs.filter(d => 
        (d.userId && d.userId === userKey) || 
        (userEmail && d.userEmail && d.userEmail.toLowerCase() === userEmail)
      );
    }
  } catch (e) {
    console.error('Failed to load docs from IndexedDB', e);
  }
  return getSavedDocuments();
}

export function saveDocument(doc: Omit<SavedLegalDocument, 'id' | 'createdAt'>): SavedLegalDocument {
  const docs = getSavedDocuments();
  const userKey = getCurrentUserKey();
  const userEmail = getCurrentUserEmail();
  const newDoc: SavedLegalDocument = {
    ...doc,
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: userKey,
    userEmail: userEmail,
    createdAt: new Date().toISOString(),
  };
  const updated = [newDoc, ...docs];
  try {
    localStorage.setItem(getUserScopedKey(STORAGE_KEYS.DOCS), JSON.stringify(updated));
    saveOfflineDocumentToDB(newDoc);
    backgroundSyncManager.notifyChanged();
  } catch (e) {
    console.error('Failed to save doc', e);
  }
  return newDoc;
}

export function deleteDocument(id: string): void {
  const docs = getSavedDocuments();
  const filtered = docs.filter(d => d.id !== id);
  try {
    localStorage.setItem(getUserScopedKey(STORAGE_KEYS.DOCS), JSON.stringify(filtered));
    deleteOfflineDocumentFromDB(id);
    backgroundSyncManager.notifyChanged();
  } catch (e) {
    console.error('Failed to delete doc', e);
  }
}

export function updateDocument(id: string, updates: Partial<SavedLegalDocument>): SavedLegalDocument | null {
  const docs = getSavedDocuments();
  const index = docs.findIndex((d) => d.id === id);
  if (index === -1) return null;

  const existing = docs[index];
  const versions = existing.versions || [];

  if ((updates.content && updates.content !== existing.content) || (updates.title && updates.title !== existing.title)) {
    versions.unshift({
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: existing.updatedAt || existing.createdAt || new Date().toISOString(),
      title: existing.title,
      content: existing.content,
    });
  }

  const updatedDoc = {
    ...existing,
    ...updates,
    versions: versions.slice(0, 15),
    updatedAt: new Date().toISOString(),
  };
  docs[index] = updatedDoc;
  try {
    localStorage.setItem(getUserScopedKey(STORAGE_KEYS.DOCS), JSON.stringify(docs));
    saveOfflineDocumentToDB(updatedDoc);
    backgroundSyncManager.notifyChanged();
  } catch (e) {
    console.error('Failed to update doc', e);
  }
  return updatedDoc;
}

export function toggleBookmarkDocument(id: string): boolean {
  const docs = getSavedDocuments();
  const doc = docs.find((d) => d.id === id);
  if (!doc) return false;

  const newStatus = !doc.isBookmarked;
  updateDocument(id, { isBookmarked: newStatus });
  return newStatus;
}

export function moveDocumentToFolder(docId: string, folderId: string | undefined): void {
  updateDocument(docId, { folderId });
}

export function addVoiceNoteToDocument(
  docId: string,
  note: Omit<VoiceAnnotation, 'id' | 'recordedAt'>
): VoiceAnnotation | null {
  const docs = getSavedDocuments();
  const doc = docs.find((d) => d.id === docId);
  if (!doc) return null;

  const newNote: VoiceAnnotation = {
    ...note,
    id: `vn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    recordedAt: new Date().toISOString(),
  };

  const updatedVoiceNotes = [...(doc.voiceNotes || []), newNote];
  updateDocument(docId, { voiceNotes: updatedVoiceNotes });
  return newNote;
}

export function deleteVoiceNoteFromDocument(docId: string, noteId: string): boolean {
  const docs = getSavedDocuments();
  const doc = docs.find((d) => d.id === docId);
  if (!doc || !doc.voiceNotes) return false;

  const updatedVoiceNotes = doc.voiceNotes.filter((n) => n.id !== noteId);
  updateDocument(docId, { voiceNotes: updatedVoiceNotes });
  return true;
}

// ----------------- FOLDER MANAGEMENT (PER USER) -----------------
export function getFolders(): LegalFolder[] {
  try {
    const raw = localStorage.getItem(getUserScopedKey(STORAGE_KEYS.FOLDERS));
    if (!raw) {
      localStorage.setItem(getUserScopedKey(STORAGE_KEYS.FOLDERS), JSON.stringify(DEFAULT_FOLDERS));
      return DEFAULT_FOLDERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_FOLDERS;
  }
}

export function createFolder(name: string, color: string = 'amber'): LegalFolder {
  const folders = getFolders();
  const newFolder: LegalFolder = {
    id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    color,
    createdAt: new Date().toISOString(),
  };
  const updated = [...folders, newFolder];
  try {
    localStorage.setItem(getUserScopedKey(STORAGE_KEYS.FOLDERS), JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to create folder', e);
  }
  return newFolder;
}

export function renameFolder(id: string, newName: string): void {
  const folders = getFolders();
  const updated = folders.map((f) => (f.id === id ? { ...f, name: newName.trim() } : f));
  try {
    localStorage.setItem(getUserScopedKey(STORAGE_KEYS.FOLDERS), JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to rename folder', e);
  }
}

export function deleteFolder(id: string): void {
  const folders = getFolders();
  const updated = folders.filter((f) => f.id !== id);
  try {
    localStorage.setItem(getUserScopedKey(STORAGE_KEYS.FOLDERS), JSON.stringify(updated));
    // Remove folder association from documents
    const docs = getSavedDocuments();
    let changed = false;
    const updatedDocs = docs.map((doc) => {
      if (doc.folderId === id) {
        changed = true;
        return { ...doc, folderId: undefined };
      }
      return doc;
    });
    if (changed) {
      localStorage.setItem(getUserScopedKey(STORAGE_KEYS.DOCS), JSON.stringify(updatedDocs));
    }
  } catch (e) {
    console.error('Failed to delete folder', e);
  }
}

export async function shareFolder(folder: LegalFolder, userIds: string[]): Promise<string> {
  const token = Math.random().toString(36).substring(2, 15);
  const folderRef = doc(collection(db, 'shared_folders'), token);
  await setDoc(folderRef, {
    ownerId: auth.currentUser?.uid,
    folderName: folder.name,
    documentIds: getSavedDocuments().filter(d => d.folderId === folder.id).map(d => d.id),
    token: token,
    sharedWith: userIds,
    createdAt: new Date().toISOString(),
  });
  return token;
}

/**
 * Automatically organizes saved/annotated documents into custom-named folders based on
 * taskType, content keywords, and annotation tags.
 */
export function autoCategorizeDocumentsIntoFolders(): {
  categorizedCount: number;
  foldersCreated: number;
} {
  let folders = getFolders();
  const docs = getSavedDocuments();
  let foldersCreated = 0;
  let categorizedCount = 0;

  // Default custom folder definitions
  const targetFolderDefs = [
    { id: 'folder_annotated', name: '📝 Annotated Legal Notes', color: 'amber' },
    { id: 'folder_contracts', name: '⚖️ Contracts & Agreements', color: 'emerald' },
    { id: 'folder_explanations', name: '📜 Proclamations & Legal Explanations', color: 'cyan' },
    { id: 'folder_translations', name: '🌐 Legal Translations', color: 'purple' },
    { id: 'folder_high_risk', name: '⚠️ High Legal Risk Notes', color: 'rose' },
    { id: 'folder_cassation', name: '🏛️ Cassation Precedents', color: 'amber' },
  ];

  // Ensure these folders exist
  targetFolderDefs.forEach((def) => {
    if (!folders.some((f) => f.id === def.id || f.name.toLowerCase() === def.name.toLowerCase())) {
      folders.push({
        id: def.id,
        name: def.name,
        color: def.color,
        createdAt: new Date().toISOString(),
      });
      foldersCreated++;
    }
  });

  try {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  } catch {}

  // Automatically assign folderId for documents
  const updatedDocs = docs.map((doc) => {
    if (doc.folderId) return doc; // keep existing manual folder assignment

    let targetFolderId: string | undefined = undefined;

    if (doc.tags?.some((t) => t.includes('risk') || t.includes('bala') || t.includes('annotated'))) {
      targetFolderId = 'folder_annotated';
    } else if (doc.taskType === 'contract' || doc.content.toLowerCase().includes('waliigaltee')) {
      targetFolderId = 'folder_contracts';
    } else if (doc.taskType === 'explain_law' || doc.content.toLowerCase().includes('labsii')) {
      targetFolderId = 'folder_explanations';
    } else if (doc.taskType === 'translate') {
      targetFolderId = 'folder_translations';
    } else if (doc.content.toLowerCase().includes('dhaddacha ijoo') || doc.content.toLowerCase().includes('cassation')) {
      targetFolderId = 'folder_cassation';
    } else {
      targetFolderId = doc.tags?.length > 0 ? 'folder_annotated' : 'folder_explanations';
    }

    if (targetFolderId) {
      categorizedCount++;
      return { ...doc, folderId: targetFolderId };
    }

    return doc;
  });

  try {
    localStorage.setItem(STORAGE_KEYS.DOCS, JSON.stringify(updatedDocs));
    backgroundSyncManager.notifyChanged();
  } catch (e) {
    console.error('Failed to auto categorize docs', e);
  }

  return { categorizedCount, foldersCreated };
}

// ----------------- VANITY REFERRAL LINK HELPER -----------------
/**
 * Creates a clean, URL-safe vanity link for users that includes their specific referrer ID
 * pointing to the live working application URL.
 */
export function generateVanityShareLink(referrerId?: string, tab: string = 'home'): string {
  let publicBase = 'https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app';
  if (typeof window !== 'undefined' && window.location.origin) {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    if (!origin.includes('saiethio.com')) {
      publicBase = origin;
    }
  }

  const settings = getUserSettings();
  const ref = (referrerId || settings.referrerId || 'ayele-jurist').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  
  const params = new URLSearchParams();
  if (ref) params.set('ref', ref);
  if (tab && tab !== 'home') params.set('tab', tab);

  const query = params.toString();
  return query ? `${publicBase}/?${query}` : `${publicBase}/`;
}

export function getUserReferrerId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REFERRER_ID);
    if (raw) return raw;
  } catch {}
  return getUserSettings().referrerId || 'ayele-jurist';
}

export function setUserReferrerId(id: string): void {
  try {
    const sanitized = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    localStorage.setItem(STORAGE_KEYS.REFERRER_ID, sanitized);
    saveUserSettings({ referrerId: sanitized });
  } catch (e) {
    console.error('Failed to save referrer ID', e);
  }
}

export function getUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: Partial<UserSettings>): UserSettings {
  const current = getUserSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
  return updated;
}

/**
 * Retrieve recent searches from localStorage.
 * Optionally filter by category ('explain_law', 'cassation', 'glossary', 'general').
 */
export function getRecentSearches(category?: 'explain_law' | 'cassation' | 'glossary' | 'general'): RecentSearch[] {
  try {
    const scopedKey = getUserScopedKey(STORAGE_KEYS.RECENT_SEARCHES);
    const raw = localStorage.getItem(scopedKey);
    if (!raw) return [];
    const list: RecentSearch[] = JSON.parse(raw);
    if (category) {
      return list.filter((item) => item.category === category);
    }
    return list;
  } catch (e) {
    console.error('Failed to load recent searches', e);
    return [];
  }
}

/**
 * Save a search query to localStorage.
 * Deduplicates existing identical queries, brings them to the top, and caps at 25 entries.
 */
export function saveRecentSearch(
  query: string,
  category: 'explain_law' | 'cassation' | 'glossary' | 'general' = 'explain_law',
  resultCount?: number
): RecentSearch[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return getRecentSearches();

  const current = getRecentSearches();
  // Filter out any existing item with the exact same query in the same category
  const filtered = current.filter(
    (item) => !(item.category === category && item.query.toLowerCase() === trimmed.toLowerCase())
  );

  const newEntry: RecentSearch = {
    id: `search_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    query: trimmed,
    category,
    timestamp: Date.now(),
    resultCount,
  };

  // Keep top 25 recent searches
  const updated = [newEntry, ...filtered].slice(0, 25);

  try {
    const scopedKey = getUserScopedKey(STORAGE_KEYS.RECENT_SEARCHES);
    localStorage.setItem(scopedKey, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save recent search', e);
  }

  return updated;
}

/**
 * Delete a specific search entry by its ID.
 */
export function deleteRecentSearch(id: string): RecentSearch[] {
  const current = getRecentSearches();
  const updated = current.filter((item) => item.id !== id);
  try {
    const scopedKey = getUserScopedKey(STORAGE_KEYS.RECENT_SEARCHES);
    localStorage.setItem(scopedKey, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete recent search', e);
  }
  return updated;
}

/**
 * Clear all recent searches, or clear only for a specific category.
 */
export function clearRecentSearches(category?: 'explain_law' | 'cassation' | 'glossary' | 'general'): void {
  try {
    const scopedKey = getUserScopedKey(STORAGE_KEYS.RECENT_SEARCHES);
    if (category) {
      const remaining = getRecentSearches().filter((item) => item.category !== category);
      localStorage.setItem(scopedKey, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(scopedKey);
    }
  } catch (e) {
    console.error('Failed to clear recent searches', e);
  }
}

export interface SavedSearchBookmark {
  id: string;
  title: string;
  query: string;
  fileNumber?: string;
  court?: string;
  category?: string;
  volume?: number | 'all';
  timestamp: number;
}

export function getSavedSearchBookmarks(): SavedSearchBookmark[] {
  try {
    const scopedKey = getUserScopedKey(STORAGE_KEYS.SAVED_SEARCHES);
    const raw = localStorage.getItem(scopedKey);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved search bookmarks', e);
    return [];
  }
}

export function saveSearchBookmark(
  bookmark: Omit<SavedSearchBookmark, 'id' | 'timestamp'>
): SavedSearchBookmark[] {
  const current = getSavedSearchBookmarks();
  const trimmedQuery = (bookmark.query || '').trim();
  const trimmedTitle = (bookmark.title || trimmedQuery || 'Saved Search').trim();

  const newEntry: SavedSearchBookmark = {
    id: `saved_search_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: trimmedTitle,
    query: trimmedQuery,
    fileNumber: bookmark.fileNumber,
    court: bookmark.court || 'all',
    category: bookmark.category || 'all',
    volume: bookmark.volume ?? 'all',
    timestamp: Date.now(),
  };

  const updated = [newEntry, ...current].slice(0, 30);
  try {
    const scopedKey = getUserScopedKey(STORAGE_KEYS.SAVED_SEARCHES);
    localStorage.setItem(scopedKey, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save search bookmark', e);
  }
  return updated;
}

export function deleteSearchBookmark(id: string): SavedSearchBookmark[] {
  const current = getSavedSearchBookmarks();
  const updated = current.filter((item) => item.id !== id);
  try {
    const scopedKey = getUserScopedKey(STORAGE_KEYS.SAVED_SEARCHES);
    localStorage.setItem(scopedKey, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete search bookmark', e);
  }
  return updated;
}


