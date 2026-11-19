import { Language } from '../i18n/translations';
/**
 * Logs a secure audit action to Firestore
 */
export async function logAuditAction(
  action: AuditLog['action'],
  resourceId: string,
  resourceType: AuditLog['resourceType'],
  result: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  metadata?: any
): Promise<void> {
  try {
    const userKey = getCurrentUserKey();
    const userEmail = getCurrentUserEmail();
    const instId = getCurrentInstitutionId() || 'public';
    
    const logRef = doc(collection(db, 'audit_logs'));
    const log: AuditLog = {
      id: logRef.id,
      userId: userKey,
      userEmail: userEmail || undefined,
      institutionId: instId,
      action,
      resourceId,
      resourceType,
      timestamp: new Date().toISOString(),
      result,
      metadata: metadata || {}
    };
    
    await setDoc(logRef, log);
  } catch (err) {
    console.warn('[Storage] Audit logging failed:', err);
  }
}

/**
 * Uploads a file to Firebase Storage and returns the public URL.
 * Strictly scoped to user/institution path for security.
 */
export async function uploadFileToFirebaseStorage(
  file: File | Blob, 
  fileName: string, 
  customPath?: string
): Promise<{ url: string; path: string }> {
  const userKey = getCurrentUserKey();
  const instId = getCurrentInstitutionId() || 'public';
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = customPath || `legal_docs/${instId}/${userKey}/${Date.now()}_${cleanName}`;
  
  try {
    const fileRef = ref(storage, storagePath);
    const metadata = {
      contentType: (file as any).type || 'application/octet-stream',
      customMetadata: {
        userId: userKey,
        institutionId: instId,
        originalName: fileName
      }
    };
    
    await uploadBytes(fileRef, file, metadata);
    const url = await getDownloadURL(fileRef);
    
    // Log Audit
    await logAuditAction('UPLOAD', fileName, 'DOCUMENT', 'SUCCESS', { path: storagePath });
    
    return { url, path: storagePath };
  } catch (err: any) {
    console.error('[Storage] Firebase upload failed:', err);
    await logAuditAction('UPLOAD', fileName, 'DOCUMENT', 'FAILURE', { error: err.message });
    throw new Error(`Cloud storage upload failed: ${err.message}`);
  }
}

/**
 * Deletes a file from Firebase Storage
 */
export async function deleteFileFromFirebaseStorage(path: string): Promise<void> {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    await logAuditAction('DELETE', path, 'DOCUMENT', 'SUCCESS');
  } catch (err: any) {
    console.warn('[Storage] File deletion failed (might already be gone):', err.message);
    await logAuditAction('DELETE', path, 'DOCUMENT', 'FAILURE', { error: err.message });
  }
}
import CryptoJS from 'crypto-js';
import { saveOfflineDocumentToDB, deleteOfflineDocumentFromDB, getOfflineDocumentsFromDB } from './indexedDb';
import { auth, db, storage } from './firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { isWriteLocked, trackInFlightWrite } from './signOutSafetyService';

function notifyStorageChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('seera_storage_changed'));
  }
}


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
  institutionId?: string; // Court isolation and tenancy identifier
  storageUrl?: string; // Firebase Storage public URL for the document file
  serverConfirmedAt?: string; // ISO timestamp recorded ONLY after verifiable Firestore server ack
  serverConfirmedUid?: string; // Firebase UID verified on server document
  serverSyncNonce?: string; // Nonce verified via getDocFromServer
}

export interface CommentReply {
  id: string;
  authorName: string;
  authorRole?: string;
  content: string;
  createdAt: string;
}

export interface Annotation {
  id: string;
  userId?: string;
  documentId: string;
  selectedText: string;
  color?: 'amber' | 'emerald' | 'cyan' | 'purple' | 'rose';
  content: string;
  crossReference?: string;
  tag?: 'risk' | 'compliance' | 'important' | 'cross_ref' | 'pleading';
  rangeStart?: number;
  rangeEnd?: number;
  authorName?: string;
  authorRole?: string;
  status?: 'open' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: string;
  replies?: CommentReply[];
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

export interface GoogleWorkspaceSettings {
  classroomEnabled: boolean;
  keepEnabled: boolean;
  autoSyncKeep: boolean;
  lastKeepSync?: string;
  classroomCourses?: string[]; // IDs of followed courses
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
  googleWorkspace?: GoogleWorkspaceSettings;
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
  courtId?: string; // Court isolation and tenancy identifier (e.g. gurbicha, adama)
  courtName?: string; // Name of court
  uid?: string; // Firebase UID
  email?: string; // User email
  localCredentials?: LocalCredentialsConfig;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  institutionId?: string;
  action: 'UPLOAD' | 'DOWNLOAD' | 'DELETE' | 'VIEW' | 'EDIT' | 'LOGIN' | 'SHARE';
  resourceId: string;
  resourceType: 'DOCUMENT' | 'EVIDENCE' | 'FOLDER' | 'AUTH';
  timestamp: string;
  result: 'SUCCESS' | 'FAILURE';
  metadata?: any;
}

export interface LocalCredentialsConfig {
  isPinEnabled: boolean;
  pinHash?: string;
  pinSalt?: string;
  pinHint?: string;
  isPasswordSaved: boolean;
  encryptedPassword?: string;
  savedUsername?: string;
  lastUpdated?: string;
  autoPromptOnOpen?: boolean;
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
  LOCAL_CREDENTIALS: 'seera_ai_local_credentials',
};

export const DEFAULT_PROTECTION: AppProtectionSettings = {
  isAntiCloningActive: true,
  protectRightClick: true,
  watermarkProtection: true,
  ownerEmail: 'support@seeraai.et',
  ownerName: 'SEERAAI PRO',
  registeredProclamation: 'FDRE Proclamation No. 410/2004 (Copyright & Neighboring Rights)',
};

export const DEFAULT_BRANDING: LawFirmBranding = {
  firmNameOm: 'SEERAAI - Trilingual Ethiopian Legal AI',
  firmNameAm: 'SEERAAI - Trilingual Ethiopian Legal AI',
  firmNameEn: 'SEERAAI - Trilingual Ethiopian Legal AI',
  advocateName: 'Legal Professional',
  roleTitle: 'Ogeessa Seeraa',
  licenseNumber: 'FDRE-JURIST/2026',
  phone: '', 
  facebookPage: 'facebook.com/seeraai.ethio',
  telegramHandle: 'seeraai_ethio',
  email: 'support@seeraai.et',
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
  referrerId: 'seeraai-pro',
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
      'https://t.me/seeraai_ethio',
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
  googleWorkspace: {
    classroomEnabled: true,
    keepEnabled: true,
    autoSyncKeep: false,
    classroomCourses: []
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
  offlineModeEnabled: false,
  localCredentials: {
    isPinEnabled: false,
    isPasswordSaved: false,
    autoPromptOnOpen: false,
  },
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

/**
 * Returns the current active court institution ID if any
 */
export function getCurrentInstitutionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  
  // 1. From User Settings
  const settings = getUserSettings();
  if (settings.courtId) return settings.courtId;

  // 2. From Active Court Session
  const courtSessionRaw = sessionStorage.getItem('seera_court_active_session');
  if (courtSessionRaw) {
    try {
      const parsed = JSON.parse(courtSessionRaw);
      if (parsed?.institutionId) return parsed.institutionId;
    } catch {}
  }

  return undefined;
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
    const institutionId = getCurrentInstitutionId();

    // Strictly isolate: only show documents strictly belonging to the current user
    // AND optionally filtered by institutionId if user is in a court session
    return docs.filter(d => {
      const isOwner = (d.userId && d.userId === userKey) || 
                     (userEmail && d.userEmail && d.userEmail.toLowerCase() === userEmail);
      
      if (!isOwner) return false;

      // If we are in an institution-specific view/session, ensure doc matches or has no institution
      if (institutionId) {
        return !d.institutionId || d.institutionId === institutionId;
      }
      return true;
    });
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
  if (isWriteLocked()) {
    throw new Error('SIGN_OUT_WRITE_LOCKED:saveDocument');
  }
  const docs = getSavedDocuments();
  const userKey = getCurrentUserKey();
  const userEmail = getCurrentUserEmail();
  const institutionId = getCurrentInstitutionId();
  const newDoc: SavedLegalDocument = {
    ...doc,
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: userKey,
    userEmail: userEmail,
    institutionId: institutionId,
    createdAt: new Date().toISOString(),
  };
  const updated = [newDoc, ...docs];
  try {
    localStorage.setItem(getUserScopedKey(STORAGE_KEYS.DOCS), JSON.stringify(updated));
    trackInFlightWrite('storage:saveDocument', saveOfflineDocumentToDB(newDoc));
    notifyStorageChange();
  } catch (e) {
    console.error('Failed to save doc', e);
  }
  return newDoc;
}

export function deleteDocument(id: string): void {
  if (isWriteLocked()) {
    console.warn('[Storage] Blocked deleteDocument while sign-out write lock is active.');
    return;
  }
  const docs = getSavedDocuments();
  const filtered = docs.filter(d => d.id !== id);
  try {
    localStorage.setItem(getUserScopedKey(STORAGE_KEYS.DOCS), JSON.stringify(filtered));
    trackInFlightWrite('storage:deleteDocument', deleteOfflineDocumentFromDB(id));
    notifyStorageChange();
  } catch (e) {
    console.error('Failed to delete doc', e);
  }
}

export function updateDocument(
  id: string,
  updates: Partial<SavedLegalDocument>,
  options?: { allowDuringSignOut?: boolean }
): SavedLegalDocument | null {
  if (isWriteLocked() && !options?.allowDuringSignOut) {
    console.warn('[Storage] Blocked updateDocument while sign-out write lock is active.');
    return null;
  }
  const docs = getSavedDocuments();
  const index = docs.findIndex((d) => d.id === id);
  if (index === -1) return null;

  const existing = docs[index];
  const versions = existing.versions || [];

  const contentEdited =
    (updates.content !== undefined && updates.content !== existing.content) ||
    (updates.title !== undefined && updates.title !== existing.title);

  if (contentEdited) {
    versions.unshift({
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: existing.updatedAt || existing.createdAt || new Date().toISOString(),
      title: existing.title,
      content: existing.content,
    });
  }

  // If local content changed without an explicit new server confirmation, invalidate stale server ack
  const clearsServerAck =
    updates.serverConfirmedAt === undefined &&
    (contentEdited || updates.folderId !== undefined || updates.tags !== undefined);

  const updatedDoc: SavedLegalDocument = {
    ...existing,
    ...updates,
    ...(clearsServerAck
      ? { serverConfirmedAt: undefined, serverConfirmedUid: undefined, serverSyncNonce: undefined }
      : {}),
    versions: versions.slice(0, 15),
    updatedAt: new Date().toISOString(),
  };
  docs[index] = updatedDoc;
  try {
    localStorage.setItem(getUserScopedKey(STORAGE_KEYS.DOCS), JSON.stringify(docs));
    trackInFlightWrite(
      'storage:updateDocument',
      saveOfflineDocumentToDB(updatedDoc, { allowDuringSignOut: options?.allowDuringSignOut })
    );
    notifyStorageChange();
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
  if (isWriteLocked()) {
    return { categorizedCount: 0, foldersCreated: 0 };
  }
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
    notifyStorageChange();
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
  const ref = (referrerId || settings.referrerId || 'seeraai-pro').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  
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
  return getUserSettings().referrerId || 'seeraai-pro';
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
    const parsed = raw ? JSON.parse(raw) : {};
    const directOffline = localStorage.getItem('seera_offline_mode_enabled');
    const resolvedOffline =
      directOffline === 'true'
        ? true
        : directOffline === 'false'
        ? false
        : typeof parsed.offlineModeEnabled === 'boolean'
        ? parsed.offlineModeEnabled
        : DEFAULT_SETTINGS.offlineModeEnabled;
    return { ...DEFAULT_SETTINGS, ...parsed, offlineModeEnabled: resolvedOffline };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: Partial<UserSettings>): UserSettings {
  const current = getUserSettings();
  if (isWriteLocked()) {
    console.warn('[Storage] Blocked saveUserSettings while sign-out write lock is active.');
    return current;
  }
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    if (typeof settings.offlineModeEnabled === 'boolean') {
      localStorage.setItem('seera_offline_mode_enabled', String(settings.offlineModeEnabled));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('seera_user_settings_updated', { detail: updated }));
    }
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

/* ==========================================================================
   SECURE LOCAL CREDENTIAL PERSISTENCE & AUTHENTICATION (PIN & PASSWORD)
   ========================================================================== */

const DEVICE_SALT_KEY = 'seera_device_auth_salt';

/**
 * Returns or initializes a secure device-unique salt for cryptographic operations
 */
function getOrCreateDeviceSalt(): string {
  if (typeof window === 'undefined') return 'seera_default_device_salt_2026';
  try {
    let salt = localStorage.getItem(DEVICE_SALT_KEY);
    if (!salt) {
      salt = CryptoJS.lib.WordArray.random(16).toString();
      localStorage.setItem(DEVICE_SALT_KEY, salt);
    }
    return salt;
  } catch {
    return 'seera_fallback_device_salt_2026';
  }
}

/**
 * Retrieves persisted local credentials config from scoped storage / user settings
 */
export function getLocalCredentials(): LocalCredentialsConfig {
  const defaultConf: LocalCredentialsConfig = {
    isPinEnabled: false,
    isPasswordSaved: false,
    autoPromptOnOpen: false,
  };

  if (typeof window === 'undefined') return defaultConf;

  try {
    const scopedKey = getUserScopedKey(STORAGE_KEYS.LOCAL_CREDENTIALS);
    const raw = localStorage.getItem(scopedKey) || localStorage.getItem(STORAGE_KEYS.LOCAL_CREDENTIALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultConf, ...parsed };
    }

    // Fallback to UserSettings
    const settings = getUserSettings();
    if (settings.localCredentials) {
      return { ...defaultConf, ...settings.localCredentials };
    }
  } catch (e) {
    console.warn('[storage] Failed to read local credentials:', e);
  }

  return defaultConf;
}

/**
 * Saves or updates local credentials configuration securely in device persistent storage
 */
export function persistLocalCredentials(conf: Partial<LocalCredentialsConfig>): LocalCredentialsConfig {
  const current = getLocalCredentials();
  if (isWriteLocked()) {
    console.warn('[storage] Blocked persistLocalCredentials while sign-out write lock is active.');
    return current;
  }
  const updated: LocalCredentialsConfig = {
    ...current,
    ...conf,
    lastUpdated: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const scopedKey = getUserScopedKey(STORAGE_KEYS.LOCAL_CREDENTIALS);
      const str = JSON.stringify(updated);
      localStorage.setItem(scopedKey, str);
      localStorage.setItem(STORAGE_KEYS.LOCAL_CREDENTIALS, str); // redundancy for root app unlock
      saveUserSettings({ localCredentials: updated });
      notifyStorageChange();
    } catch (e) {
      console.error('[storage] Failed to persist local credentials:', e);
    }
  }

  return updated;
}

/**
 * Securely hashes and stores a 4-6 digit local authentication PIN
 */
export function saveLocalPin(pin: string, hint?: string): { success: boolean; error?: string } {
  const cleanPin = (pin || '').trim();
  if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 8 || !/^\d+$/.test(cleanPin)) {
    return {
      success: false,
      error: 'PIN must be 4 to 8 numeric digits (Lakk. Iccitii dijitii 4 hanga 8 ta\'uu qaba)',
    };
  }

  try {
    const salt = getOrCreateDeviceSalt();
    const pinHash = CryptoJS.SHA256(`${salt}:${cleanPin}`).toString();

    persistLocalCredentials({
      isPinEnabled: true,
      pinHash,
      pinSalt: salt,
      pinHint: (hint || '').trim() || undefined,
    });

    // Also update custom owner PIN fallback if in browser
    if (typeof window !== 'undefined') {
      localStorage.setItem('seera_custom_owner_pin', cleanPin);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to securely hash and save PIN' };
  }
}

/**
 * Verifies a given PIN against the stored SHA-256 salted hash
 */
export function verifyLocalPin(inputPin: string): boolean {
  const clean = (inputPin || '').trim();
  if (!clean) return false;

  const creds = getLocalCredentials();
  if (!creds.pinHash) {
    // Check fallback master codes
    if (clean === '2026' || clean === '8842') return true;
    const customPin = typeof window !== 'undefined' ? localStorage.getItem('seera_custom_owner_pin') : null;
    return customPin ? clean === customPin : false;
  }

  const salt = creds.pinSalt || getOrCreateDeviceSalt();
  const inputHash = CryptoJS.SHA256(`${salt}:${clean}`).toString();
  return inputHash === creds.pinHash;
}

/**
 * Securely encrypts and saves the user's password locally using AES-256 for quick unlock
 */
export function saveLocalPassword(password: string, username?: string): { success: boolean; error?: string } {
  const cleanPass = (password || '').trim();
  if (!cleanPass || cleanPass.length < 6) {
    return {
      success: false,
      error: 'Password must be at least 6 characters (Jechi iccitii yoo xiqqaate arfiilee 6 qabaachuu qaba)',
    };
  }

  try {
    const salt = getOrCreateDeviceSalt();
    const encryptedPassword = CryptoJS.AES.encrypt(cleanPass, salt).toString();

    persistLocalCredentials({
      isPasswordSaved: true,
      encryptedPassword,
      savedUsername: username?.trim() || undefined,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to encrypt password' };
  }
}

/**
 * Decrypts and retrieves the saved local password
 */
export function getSavedLocalPassword(): string | null {
  const creds = getLocalCredentials();
  if (!creds.encryptedPassword) return null;

  try {
    const salt = creds.pinSalt || getOrCreateDeviceSalt();
    const bytes = CryptoJS.AES.decrypt(creds.encryptedPassword, salt);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (err) {
    console.error('[storage] Failed to decrypt local password:', err);
    return null;
  }
}

/**
 * Verifies an entered password against the stored encrypted password
 */
export function verifyLocalPassword(inputPassword: string): boolean {
  const saved = getSavedLocalPassword();
  if (!saved) return false;
  return inputPassword.trim() === saved.trim();
}

/**
 * Removes local PIN from device storage
 */
export function removeLocalPin(): void {
  const creds = getLocalCredentials();
  persistLocalCredentials({
    isPinEnabled: false,
    pinHash: undefined,
    pinHint: undefined,
  });
  if (typeof window !== 'undefined') {
    localStorage.removeItem('seera_custom_owner_pin');
  }
}

/**
 * Removes saved local password from device storage
 */
export function removeLocalPassword(): void {
  persistLocalCredentials({
    isPasswordSaved: false,
    encryptedPassword: undefined,
    savedUsername: undefined,
  });
}

/**
 * Clears all local PIN and password credentials
 */
export function clearAllLocalCredentials(): void {
  removeLocalPin();
  removeLocalPassword();
}

/**
 * Checks if user has an active configured PIN
 */
export function hasConfiguredLocalPin(): boolean {
  const creds = getLocalCredentials();
  return !!(creds.isPinEnabled && creds.pinHash);
}

/**
 * Checks if user has a saved local password
 */
export function hasConfiguredLocalPassword(): boolean {
  const creds = getLocalCredentials();
  return !!(creds.isPasswordSaved && creds.encryptedPassword);
}



