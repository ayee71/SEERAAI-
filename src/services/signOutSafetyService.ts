import type { SafeDeleteDBResult } from './indexedDb';

export type SignOutPhase =
  | 'IDLE'
  | 'LOCKING_AND_PAUSING'
  | 'COORDINATING_TABS'
  | 'INVENTORY_AND_SYNC'
  | 'AWAITING_USER_DECISION'
  | 'CLOSING_IDB_AND_PURGING'
  | 'SIGNING_OUT_FIREBASE'
  | 'VERIFYING_COMPLETION'
  | 'SAFE_HOLD'
  | 'ISOLATION_LOCKDOWN';

export type RecordClassification =
  | 'server_confirmed'
  | 'pending_upload'
  | 'local_only'
  | 'derived_disposable_cache'
  | 'non_sensitive_preference'
  | 'institutional_local_replica'
  | 'unknown_corrupt';

export interface InventoryItemSummary {
  id: string;
  source: string;
  classification: RecordClassification;
  title?: string;
  ownerId?: string;
  institutionId?: string;
  updatedAt?: string;
  serverConfirmedAt?: string;
  raw?: any;
}

export interface LocalDataInventoryReport {
  verified: boolean;
  unverifiedReasons: string[];
  counts: {
    serverConfirmed: number;
    pendingUpload: number;
    localOnly: number;
    derivedDisposableCache: number;
    nonSensitivePreference: number;
    institutionalLocalReplica: number;
    institutionalUniqueLocalOnly: number;
    unknownCorrupt: number;
  };
  pendingEditsCount: number;
  localOnlyDraftsCount: number;
  localOnlyDocsCount: number;
  annotationsAndBookmarksCount: number;
  hasBlockingUnsyncedOrLocalOnly: boolean;
  hasUniqueLocalInstitutionalData: boolean;
  hasSensitivePlaintextPresent: boolean;
  exportableItems: InventoryItemSummary[];
  scannedAt: string;
}

export interface IsolationLockdownState {
  active: boolean;
  reason: string;
  details: string;
  blockedUid: string;
  failedStep: SignOutPhase | 'IDB_DELETE' | 'TAB_ACK' | 'FIREBASE_SIGNOUT' | 'INVENTORY_UNVERIFIED' | 'DRAIN_TIMEOUT';
  unackedTabs?: string[];
  dbDeleteStatus?: string;
  timestamp: string;
}

export const ISOLATION_LOCKDOWN_STORAGE_KEY = 'seera_isolation_lockdown_state';
export const ACTIVE_TABS_REGISTRY_KEY = 'seera_active_tabs_registry';

/**
 * Exact non-sensitive localStorage keys preserved across clean sign-out / purge.
 */
export const PRESERVED_PREFERENCE_KEYS = [
  'seera_offline_mode_enabled',
  'seera_warning_shown',
] as const;

/**
 * Exact non-sensitive fields preserved inside seera_ai_user_settings.
 * Everything else (email, uid, customApiKey, localCredentials, visitorName, photoUrl, courtId, etc.) is stripped.
 */
export const NON_SENSITIVE_SETTINGS_FIELDS = [
  'appLanguage',
  'defaultOutputLanguage',
  'fontSize',
  'autoDetectInput',
  'theme',
  'uiBrightness',
  'harargeeDialectTts',
  'ttsRate',
  'ttsVoiceGender',
  'ttsVoiceAge',
  'ttsTone',
  'offlineModeEnabled',
  'networkProvider',
] as const;

// ---------------------------------------------------------------------------
// Global Per-User Sign-Out Write Lock & In-Flight Write Registry
// ---------------------------------------------------------------------------

interface SignOutLockState {
  locked: boolean;
  uid: string | null;
  correlationId: string | null;
  acquiredAt: number;
}

let signOutLockState: SignOutLockState = {
  locked: false,
  uid: null,
  correlationId: null,
  acquiredAt: 0,
};

interface InFlightEntry {
  id: string;
  label: string;
  promise: Promise<any>;
  startedAt: number;
}

const inFlightWrites = new Map<string, InFlightEntry>();
let inFlightCounter = 0;

export function acquireSignOutLock(uid: string | null, correlationId: string): void {
  signOutLockState = {
    locked: true,
    uid,
    correlationId,
    acquiredAt: Date.now(),
  };
}

export function releaseSignOutLock(correlationId?: string): void {
  if (!correlationId || !signOutLockState.correlationId || signOutLockState.correlationId === correlationId) {
    signOutLockState = {
      locked: false,
      uid: null,
      correlationId: null,
      acquiredAt: 0,
    };
  }
}

export function isWriteLocked(): boolean {
  return signOutLockState.locked;
}

export function getActiveSignOutLock(): Readonly<SignOutLockState> {
  return { ...signOutLockState };
}

export function trackInFlightWrite<T>(label: string, promise: Promise<T>): Promise<T> {
  const id = `ifw_${++inFlightCounter}_${Date.now()}`;
  const tracked = Promise.resolve(promise).finally(() => {
    inFlightWrites.delete(id);
  });
  inFlightWrites.set(id, {
    id,
    label,
    promise: tracked,
    startedAt: Date.now(),
  });
  return tracked;
}

export function getActiveInFlightWriteCount(): number {
  return inFlightWrites.size;
}

export function getActiveInFlightWriteLabels(): string[] {
  return Array.from(inFlightWrites.values()).map((e) => e.label);
}

/**
 * Waits for all tracked in-flight local/remote writes to settle up to timeoutMs.
 * Never treats a timeout as successful drain.
 */
export async function drainInFlightWrites(timeoutMs: number = 3000): Promise<{
  drained: boolean;
  timedOut: boolean;
  pendingLabels: string[];
}> {
  if (inFlightWrites.size === 0) {
    return { drained: true, timedOut: false, pendingLabels: [] };
  }

  let settled = false;
  const currentEntries = Array.from(inFlightWrites.values());
  const allPromise = Promise.allSettled(currentEntries.map((e) => e.promise)).then(() => {
    settled = true;
  });

  await Promise.race([
    allPromise,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

  if (!settled || inFlightWrites.size > 0) {
    return {
      drained: false,
      timedOut: !settled,
      pendingLabels: getActiveInFlightWriteLabels(),
    };
  }

  return { drained: true, timedOut: false, pendingLabels: [] };
}

// ---------------------------------------------------------------------------
// Isolation Lockdown Persistence (Prevents Account Switching Across Reloads)
// ---------------------------------------------------------------------------

export function getIsolationLockdownState(storage?: Storage): IsolationLockdownState | null {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return null;
  try {
    const raw = store.getItem(ISOLATION_LOCKDOWN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.active === true) {
      return parsed as IsolationLockdownState;
    }
    return null;
  } catch {
    return {
      active: true,
      reason: 'CORRUPT_LOCKDOWN_MARKER',
      details: 'Isolation lockdown marker could not be parsed; blocking account switch fail-closed.',
      blockedUid: 'unknown',
      failedStep: 'ISOLATION_LOCKDOWN',
      timestamp: new Date().toISOString(),
    };
  }
}

export function setIsolationLockdownState(state: IsolationLockdownState, storage?: Storage): void {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;
  try {
    store.setItem(ISOLATION_LOCKDOWN_STORAGE_KEY, JSON.stringify({ ...state, active: true }));
  } catch (e) {
    console.error('[SignOutSafety] Failed persisting isolation lockdown marker:', e);
  }
}

export function clearIsolationLockdownState(storage?: Storage): void {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;
  try {
    store.removeItem(ISOLATION_LOCKDOWN_STORAGE_KEY);
  } catch {}
}

// ---------------------------------------------------------------------------
// Active Tab Heartbeat Registry (Helps detect unresponsive/throttled tabs)
// ---------------------------------------------------------------------------

const TAB_TTL_MS = 18000;

export function registerTabHeartbeat(tabId: string, uid: string | null, storage?: Storage): void {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store || !tabId) return;
  try {
    const raw = store.getItem(ACTIVE_TABS_REGISTRY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    const cleaned: Record<string, { uid: string | null; lastSeen: number }> = {};
    for (const [id, info] of Object.entries(parsed)) {
      const entry = info as any;
      if (entry && typeof entry.lastSeen === 'number' && now - entry.lastSeen <= TAB_TTL_MS) {
        cleaned[id] = { uid: entry.uid || null, lastSeen: entry.lastSeen };
      }
    }
    cleaned[tabId] = { uid, lastSeen: now };
    store.setItem(ACTIVE_TABS_REGISTRY_KEY, JSON.stringify(cleaned));
  } catch {}
}

export function unregisterTabHeartbeat(tabId: string, storage?: Storage): void {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store || !tabId) return;
  try {
    const raw = store.getItem(ACTIVE_TABS_REGISTRY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && tabId in parsed) {
      delete parsed[tabId];
      store.setItem(ACTIVE_TABS_REGISTRY_KEY, JSON.stringify(parsed));
    }
  } catch {}
}

export function getOtherActiveTabs(selfTabId: string, filterUid?: string | null, storage?: Storage): string[] {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return [];
  try {
    const raw = store.getItem(ACTIVE_TABS_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    const now = Date.now();
    const result: string[] = [];
    for (const [id, info] of Object.entries(parsed)) {
      if (id === selfTabId) continue;
      const entry = info as any;
      if (!entry || typeof entry.lastSeen !== 'number' || now - entry.lastSeen > TAB_TTL_MS) continue;
      // Include same-UID tabs or unauthenticated/guest tabs that could hold DB handles
      if (!filterUid || !entry.uid || entry.uid === filterUid) {
        result.push(id);
      }
    }
    return result;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Strict Server Acknowledgement Proof Helper
// ---------------------------------------------------------------------------

export function isRecordServerConfirmed(
  record: any,
  currentUid?: string | null,
  currentEmail?: string | null
): boolean {
  if (!record || typeof record !== 'object') return false;
  if (record.pendingSync === true) return false;
  if (record.status === 'pending' || record.status === 'pending_sync' || record.status === 'failed') {
    return false;
  }
  // Must have explicit server confirmation metadata written AFTER a real Firestore server-verified write
  if (typeof record.serverConfirmedAt !== 'string' || !record.serverConfirmedAt) {
    return false;
  }
  if (currentUid && record.serverConfirmedUid && record.serverConfirmedUid === currentUid) {
    return true;
  }
  if (currentUid && record.userId && record.userId === currentUid && record.serverSyncNonce) {
    return true;
  }
  if (currentEmail && record.userEmail && record.userEmail.toLowerCase() === currentEmail.toLowerCase() && record.serverSyncNonce) {
    return true;
  }
  return Boolean(record.serverSyncNonce && record.serverConfirmedUid);
}

// ---------------------------------------------------------------------------
// Authoritative Local-Data Inventory
// ---------------------------------------------------------------------------

export interface IDBSnapshotReader {
  dbExists?: () => Promise<boolean>;
  readAllStores: () => Promise<{
    ok: boolean;
    error?: string;
    stores: Record<string, any[]>;
  }>;
}

function safeParseJsonArray(
  raw: string | null,
  label: string,
  unverifiedReasons: string[]
): { ok: boolean; items: any[] } {
  if (raw === null || raw === '') return { ok: true, items: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      unverifiedReasons.push(`${label}: expected array schema`);
      return { ok: false, items: [] };
    }
    return { ok: true, items: parsed };
  } catch (err: any) {
    unverifiedReasons.push(`${label}: JSON parse error (${err?.message || 'corrupt'})`);
    return { ok: false, items: [] };
  }
}

function safeParseJsonObject(
  raw: string | null,
  label: string,
  unverifiedReasons: string[]
): { ok: boolean; value: Record<string, any> | null } {
  if (raw === null || raw === '') return { ok: true, value: null };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      unverifiedReasons.push(`${label}: expected object schema`);
      return { ok: false, value: null };
    }
    return { ok: true, value: parsed };
  } catch (err: any) {
    unverifiedReasons.push(`${label}: JSON parse error (${err?.message || 'corrupt'})`);
    return { ok: false, value: null };
  }
}

export async function buildLocalDataInventory(params: {
  uid?: string | null;
  email?: string | null;
  storage?: Storage;
  session?: Storage;
  idbReader?: IDBSnapshotReader;
}): Promise<LocalDataInventoryReport> {
  const store = params.storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  const sess = params.session || (typeof window !== 'undefined' ? window.sessionStorage : undefined);
  const uid = params.uid || null;
  const email = params.email || null;

  const unverifiedReasons: string[] = [];
  const counts = {
    serverConfirmed: 0,
    pendingUpload: 0,
    localOnly: 0,
    derivedDisposableCache: 0,
    nonSensitivePreference: 0,
    institutionalLocalReplica: 0,
    institutionalUniqueLocalOnly: 0,
    unknownCorrupt: 0,
  };

  let pendingEditsCount = 0;
  let localOnlyDraftsCount = 0;
  let localOnlyDocsCount = 0;
  let annotationsAndBookmarksCount = 0;
  const exportableItems: InventoryItemSummary[] = [];
  const seenDocIds = new Set<string>();
  const seenQueuedEditIds = new Set<string>();

  if (!store) {
    unverifiedReasons.push('localStorage unavailable in environment');
  } else {
    // 1. Queued edits in localStorage
    const lsQueue = safeParseJsonArray(store.getItem('seera_ai_queued_edits'), 'localStorage:seera_ai_queued_edits', unverifiedReasons);
    if (!lsQueue.ok) counts.unknownCorrupt++;
    for (const item of lsQueue.items) {
      if (!item || typeof item !== 'object' || !item.id || !item.docId) {
        counts.unknownCorrupt++;
        unverifiedReasons.push('localStorage:seera_ai_queued_edits contains invalid record');
        continue;
      }
      seenQueuedEditIds.add(item.id);
      counts.pendingUpload++;
      pendingEditsCount++;
      exportableItems.push({
        id: item.id,
        source: 'localStorage:seera_ai_queued_edits',
        classification: 'pending_upload',
        title: item.title || item.originalDocTitle || item.docId,
        raw: item,
      });
    }

    // 2. Offline court case drafts (note: precedentOfflineSync never had a real cloud endpoint)
    const caseDrafts = safeParseJsonArray(
      store.getItem('seera_offline_court_case_drafts'),
      'localStorage:seera_offline_court_case_drafts',
      unverifiedReasons
    );
    if (!caseDrafts.ok) counts.unknownCorrupt++;
    for (const draft of caseDrafts.items) {
      if (!draft || typeof draft !== 'object' || !draft.id) {
        counts.unknownCorrupt++;
        unverifiedReasons.push('localStorage:seera_offline_court_case_drafts contains invalid record');
        continue;
      }
      if (isRecordServerConfirmed(draft, uid, email)) {
        counts.serverConfirmed++;
      } else {
        // Offline court case draft without real server confirmation is institutional unique local-only data
        counts.localOnly++;
        counts.institutionalUniqueLocalOnly++;
        localOnlyDraftsCount++;
        exportableItems.push({
          id: draft.id,
          source: 'localStorage:seera_offline_court_case_drafts',
          classification: 'local_only',
          title: draft.title || draft.caseNumber || draft.id,
          updatedAt: draft.updatedAt,
          raw: draft,
        });
      }
    }

    // 3. Saved legal documents (both unscoped and all user-scoped keys)
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (!key) continue;

      if (key === 'seera_ai_saved_documents' || key.startsWith('seera_ai_saved_documents_')) {
        const docsRes = safeParseJsonArray(store.getItem(key), `localStorage:${key}`, unverifiedReasons);
        if (!docsRes.ok) {
          counts.unknownCorrupt++;
          continue;
        }
        for (const docItem of docsRes.items) {
          if (!docItem || typeof docItem !== 'object' || !docItem.id) {
            counts.unknownCorrupt++;
            unverifiedReasons.push(`localStorage:${key} contains invalid document entry`);
            continue;
          }
          if (seenDocIds.has(docItem.id)) continue;
          seenDocIds.add(docItem.id);

          if (isRecordServerConfirmed(docItem, uid, email)) {
            counts.serverConfirmed++;
          } else {
            counts.localOnly++;
            localOnlyDocsCount++;
            exportableItems.push({
              id: docItem.id,
              source: `localStorage:${key}`,
              classification: 'local_only',
              title: docItem.title || docItem.id,
              ownerId: docItem.userId,
              institutionId: docItem.institutionId,
              updatedAt: docItem.updatedAt || docItem.createdAt,
              raw: docItem,
            });
          }
        }
      } else if (key.startsWith('seera_ai_draft_prompt') || key.startsWith('seera_ai_draft_context')) {
        const val = store.getItem(key);
        if (val && val.trim().length > 0) {
          counts.localOnly++;
          localOnlyDraftsCount++;
          exportableItems.push({
            id: key,
            source: `localStorage:${key}`,
            classification: 'local_only',
            title: key.includes('prompt') ? 'CreateView Unsaved Prompt Draft' : 'CreateView Unsaved Context Draft',
            raw: { key, content: val },
          });
        }
      }
    }

    // 4. Annotations & Bookmarks
    const anns = safeParseJsonArray(store.getItem('seera_ai_doc_annotations'), 'localStorage:seera_ai_doc_annotations', unverifiedReasons);
    if (!anns.ok) counts.unknownCorrupt++;
    for (const a of anns.items) {
      if (isRecordServerConfirmed(a, uid, email)) {
        counts.serverConfirmed++;
      } else {
        counts.localOnly++;
        annotationsAndBookmarksCount++;
        exportableItems.push({
          id: a?.id || 'annotation',
          source: 'localStorage:seera_ai_doc_annotations',
          classification: 'local_only',
          title: a?.selectedText?.slice(0, 60) || 'Legal Annotation',
          raw: a,
        });
      }
    }

    const bms = safeParseJsonArray(store.getItem('seera_ai_user_bookmarks'), 'localStorage:seera_ai_user_bookmarks', unverifiedReasons);
    if (!bms.ok) counts.unknownCorrupt++;
    for (const b of bms.items) {
      counts.localOnly++;
      annotationsAndBookmarksCount++;
      exportableItems.push({
        id: b?.id || 'bookmark',
        source: 'localStorage:seera_ai_user_bookmarks',
        classification: 'local_only',
        title: b?.title || 'Bookmark',
        raw: b,
      });
    }

    // 5. Institutional local caches & replicas in localStorage
    const instArrayKeys = [
      'seera_offline_court_case_files',
      'seera_court_workflow_cases',
      'seera_court_institutions_cache',
      'seera_court_users_cache',
      'seera_court_access_requests_cache',
      'seera_court_staff_requests_cache',
      'seera_court_personnel_mappings_cache',
      'seera_court_sms_email_dispatches_v1',
    ];
    for (const instKey of instArrayKeys) {
      const rawInst = store.getItem(instKey);
      if (rawInst) {
        const res = safeParseJsonArray(rawInst, `localStorage:${instKey}`, unverifiedReasons);
        if (!res.ok) {
          counts.unknownCorrupt++;
        } else {
          counts.institutionalLocalReplica += res.items.length;
        }
      }
    }

    // Active court session / local credentials / role
    const rawCourtSession = store.getItem('seera_court_active_session') || sess?.getItem('seera_court_active_session') || null;
    if (rawCourtSession) {
      const obj = safeParseJsonObject(rawCourtSession, 'storage:seera_court_active_session', unverifiedReasons);
      if (!obj.ok) counts.unknownCorrupt++;
      else counts.institutionalLocalReplica++;
    }

    if (store.getItem('seera_offline_cassation_precedents')) {
      const precRes = safeParseJsonArray(
        store.getItem('seera_offline_cassation_precedents'),
        'localStorage:seera_offline_cassation_precedents',
        unverifiedReasons
      );
      if (!precRes.ok) counts.unknownCorrupt++;
      else counts.derivedDisposableCache += precRes.items.length;
    }

    // Check preferences allowlist presence
    for (const prefKey of PRESERVED_PREFERENCE_KEYS) {
      if (store.getItem(prefKey) !== null) counts.nonSensitivePreference++;
    }
    if (store.getItem('seera_ai_user_settings') !== null) {
      const settingsObj = safeParseJsonObject(
        store.getItem('seera_ai_user_settings'),
        'localStorage:seera_ai_user_settings',
        unverifiedReasons
      );
      if (!settingsObj.ok) counts.unknownCorrupt++;
      else counts.nonSensitivePreference++;
    }
  }

  // 6. IndexedDB (SeeraAIOfflineDB — all 13 object stores)
  if (params.idbReader) {
    try {
      const idbResult = await params.idbReader.readAllStores();
      if (!idbResult.ok) {
        unverifiedReasons.push(`IndexedDB read failed: ${idbResult.error || 'unknown error'}`);
        counts.unknownCorrupt++;
      } else {
        const stores = idbResult.stores;

        // edits
        for (const edit of stores.edits || []) {
          if (!edit || typeof edit !== 'object' || !edit.id) {
            counts.unknownCorrupt++;
            unverifiedReasons.push('IndexedDB:edits contains corrupt record');
            continue;
          }
          if (!seenQueuedEditIds.has(edit.id)) {
            seenQueuedEditIds.add(edit.id);
            counts.pendingUpload++;
            pendingEditsCount++;
            exportableItems.push({
              id: edit.id,
              source: 'IndexedDB:edits',
              classification: 'pending_upload',
              title: edit.title || edit.originalDocTitle || edit.docId,
              raw: edit,
            });
          }
        }

        // sync_queue (institutional court sync queue)
        for (const qItem of stores.sync_queue || []) {
          if (!qItem || typeof qItem !== 'object' || !qItem.id) {
            counts.unknownCorrupt++;
            unverifiedReasons.push('IndexedDB:sync_queue contains corrupt record');
            continue;
          }
          counts.pendingUpload++;
          counts.institutionalUniqueLocalOnly++;
          pendingEditsCount++;
          exportableItems.push({
            id: qItem.id,
            source: 'IndexedDB:sync_queue',
            classification: 'pending_upload',
            title: `${qItem.collectionName}:${qItem.docId}`,
            institutionId: qItem.institutionId,
            raw: qItem,
          });
        }

        // documents
        for (const docItem of stores.documents || []) {
          if (!docItem || typeof docItem !== 'object' || !docItem.id) {
            counts.unknownCorrupt++;
            unverifiedReasons.push('IndexedDB:documents contains corrupt record');
            continue;
          }
          if (seenDocIds.has(docItem.id)) continue;
          seenDocIds.add(docItem.id);
          if (isRecordServerConfirmed(docItem, uid, email)) {
            counts.serverConfirmed++;
          } else {
            counts.localOnly++;
            localOnlyDocsCount++;
            exportableItems.push({
              id: docItem.id,
              source: 'IndexedDB:documents',
              classification: 'local_only',
              title: docItem.title || docItem.id,
              ownerId: docItem.userId,
              institutionId: docItem.institutionId,
              updatedAt: docItem.updatedAt || docItem.createdAt,
              raw: docItem,
            });
          }
        }

        // case_files, templates, institutions, users, active_case, deadlines
        for (const cf of stores.case_files || []) {
          if (cf?.pendingSync === true && !isRecordServerConfirmed(cf, uid, email)) {
            counts.pendingUpload++;
            counts.institutionalUniqueLocalOnly++;
            exportableItems.push({
              id: cf.id || 'case_file',
              source: 'IndexedDB:case_files',
              classification: 'pending_upload',
              title: cf.caseNumber || cf.claimSubject || cf.id,
              institutionId: cf.institutionId,
              raw: cf,
            });
          } else {
            counts.institutionalLocalReplica++;
          }
        }
        for (const tmpl of stores.templates || []) {
          if (tmpl?.pendingSync === true && !isRecordServerConfirmed(tmpl, uid, email)) {
            counts.pendingUpload++;
            counts.institutionalUniqueLocalOnly++;
            exportableItems.push({
              id: tmpl.id || 'template',
              source: 'IndexedDB:templates',
              classification: 'pending_upload',
              title: tmpl.name || tmpl.id,
              institutionId: tmpl.institutionId,
              raw: tmpl,
            });
          } else {
            counts.institutionalLocalReplica++;
          }
        }
        counts.institutionalLocalReplica += (stores.institutions || []).length;
        counts.institutionalLocalReplica += (stores.users || []).length;
        counts.institutionalLocalReplica += (stores.active_case || []).length;
        counts.institutionalLocalReplica += (stores.deadlines || []).length;

        // derived/disposable caches
        counts.derivedDisposableCache += (stores.translations || []).length;
        counts.derivedDisposableCache += (stores.rag_cache || []).length;
        counts.derivedDisposableCache += (stores.legislation || []).length;
        counts.derivedDisposableCache += (stores.sync_logs || []).length;
      }
    } catch (err: any) {
      unverifiedReasons.push(`IndexedDB inspection error: ${err?.message || String(err)}`);
      counts.unknownCorrupt++;
    }
  }

  const verified = unverifiedReasons.length === 0 && counts.unknownCorrupt === 0;
  const hasBlockingUnsyncedOrLocalOnly =
    !verified ||
    counts.pendingUpload > 0 ||
    counts.localOnly > 0 ||
    counts.unknownCorrupt > 0;
  const hasUniqueLocalInstitutionalData = counts.institutionalUniqueLocalOnly > 0;

  const hasSensitivePlaintextPresent =
    counts.pendingUpload > 0 ||
    counts.localOnly > 0 ||
    counts.institutionalLocalReplica > 0 ||
    counts.serverConfirmed > 0 ||
    counts.unknownCorrupt > 0 ||
    Boolean(
      store &&
        (store.getItem('seera_ai_local_credentials') ||
          store.getItem('seera_court_active_session') ||
          store.getItem('seera_court_access_authorized'))
    );

  return {
    verified,
    unverifiedReasons,
    counts,
    pendingEditsCount,
    localOnlyDraftsCount,
    localOnlyDocsCount,
    annotationsAndBookmarksCount,
    hasBlockingUnsyncedOrLocalOnly,
    hasUniqueLocalInstitutionalData,
    hasSensitivePlaintextPresent,
    exportableItems,
    scannedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Exact Preference Allowlist Preservation & Sensitive Purge
// ---------------------------------------------------------------------------

export interface AllowlistedPreferencesSnapshot {
  directFlags: Record<string, string>;
  sanitizedSettingsJson: string | null;
}

export function extractAllowlistedPreferences(storage?: Storage): AllowlistedPreferencesSnapshot {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  const directFlags: Record<string, string> = {};
  let sanitizedSettingsJson: string | null = null;

  if (!store) return { directFlags, sanitizedSettingsJson };

  for (const key of PRESERVED_PREFERENCE_KEYS) {
    const val = store.getItem(key);
    if (val !== null) {
      directFlags[key] = val;
    }
  }

  try {
    const rawSettings = store.getItem('seera_ai_user_settings');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const sanitized: Record<string, any> = {};
        for (const field of NON_SENSITIVE_SETTINGS_FIELDS) {
          if (parsed[field] !== undefined) {
            sanitized[field] = parsed[field];
          }
        }
        if (Object.keys(sanitized).length > 0) {
          sanitizedSettingsJson = JSON.stringify(sanitized);
        }
      }
    }
  } catch {
    // Do not preserve corrupt settings
    sanitizedSettingsJson = null;
  }

  return { directFlags, sanitizedSettingsJson };
}

export function restoreAllowlistedPreferences(
  snapshot: AllowlistedPreferencesSnapshot,
  storage?: Storage
): void {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;

  for (const [k, v] of Object.entries(snapshot.directFlags)) {
    try {
      store.setItem(k, v);
    } catch {}
  }

  if (snapshot.sanitizedSettingsJson) {
    try {
      store.setItem('seera_ai_user_settings', snapshot.sanitizedSettingsJson);
    } catch {}
  }
}

/**
 * Purges app-owned sensitive localStorage & sessionStorage entries while strictly preserving:
 * - Firebase SDK-owned keys (firebase:*) — managed ONLY by Firebase Auth signOut()
 * - Exact non-sensitive UI preference allowlist
 * - Optional active isolation lockdown state if still unresolved
 */
export function purgeSensitiveAppStorage(params?: {
  storage?: Storage;
  session?: Storage;
  preserveAllowlist?: boolean;
}): { removedKeys: string[] } {
  const store = params?.storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  const sess = params?.session || (typeof window !== 'undefined' ? window.sessionStorage : undefined);
  const preserveAllowlist = params?.preserveAllowlist !== false;
  const removedKeys: string[] = [];

  if (store) {
    const allowlistSnapshot = preserveAllowlist ? extractAllowlistedPreferences(store) : null;

    const exactSensitiveKeys = new Set([
      'seera_owner_email',
      'seera_owner_key',
      'seera_custom_owner_pin',
      'seera_custom_owner_password',
      'seera_current_user_id',
      'seera_current_user_email',
      'seera_user_email',
      'seera_cached_email',
      'seera_cached_name',
      'seera_user_role',
      'seera_is_premium',
      'seera_premium_plan',
      'seera_legal_qual_verified',
      'seera_legal_fullname',
      'seera_court_access_authorized',
      'seera_court_active_session',
      'seera_active_court_session',
      'seera_court_institutions_cache',
      'seera_court_users_cache',
      'seera_court_access_requests_cache',
      'seera_court_staff_requests_cache',
      'seera_court_personnel_mappings_cache',
      'seera_court_sms_email_dispatches_v1',
      'seera_court_workflow_cases',
      'seera_app_inbox_messages',
      'seera_device_salt',
      'seera_device_auth_salt',
      'seera_last_case_files_sync',
      'seera_precedents_last_sync',
    ]);

    const sensitivePrefixes = [
      'seera_ai_',
      'seera_offline_',
      'seera_court_',
      'seera_admin_',
      'seera_device_salt',
      'seera_device_auth_salt',
      'court_logo_',
    ];

    const keysToDelete: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (!k) continue;
      // Never touch Firebase SDK-owned keys or isolation/tab coordination markers
      if (k.startsWith('firebase:') || k === ISOLATION_LOCKDOWN_STORAGE_KEY || k === ACTIVE_TABS_REGISTRY_KEY) {
        continue;
      }
      if ((PRESERVED_PREFERENCE_KEYS as readonly string[]).includes(k)) {
        continue;
      }
      if (exactSensitiveKeys.has(k) || sensitivePrefixes.some((p) => k.startsWith(p))) {
        keysToDelete.push(k);
      }
    }

    for (const k of keysToDelete) {
      try {
        store.removeItem(k);
        removedKeys.push(k);
      } catch {}
    }

    if (allowlistSnapshot) {
      restoreAllowlistedPreferences(allowlistSnapshot, store);
    }
  }

  if (sess) {
    try {
      sess.clear();
    } catch {}
  }

  return { removedKeys };
}

// ---------------------------------------------------------------------------
// Unencrypted JSON Backup Helper (Honest: Never Falsely Claims Encryption)
// ---------------------------------------------------------------------------

export function buildLocalBackupPayload(
  inventory: LocalDataInventoryReport,
  uid?: string | null,
  email?: string | null
): string {
  return JSON.stringify(
    {
      format: 'SEERAAI_LOCAL_BACKUP_JSON_V1',
      encrypted: false,
      securityNotice:
        'This file is an UNENCRYPTED plaintext JSON backup generated locally because no safe key-managed archive encryption exists in this version. Store it securely.',
      exportedAt: new Date().toISOString(),
      account: { uid: uid || null, email: email || null },
      counts: inventory.counts,
      items: inventory.exportableItems.map((item) => ({
        id: item.id,
        source: item.source,
        classification: item.classification,
        title: item.title,
        institutionId: item.institutionId,
        updatedAt: item.updatedAt,
        data: item.raw ?? null,
      })),
    },
    null,
    2
  );
}

export function triggerLocalBackupDownload(jsonPayload: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const blob = new Blob([jsonPayload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seeraai-unsynced-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error('[SignOutSafety] Failed triggering backup download:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Cross-Tab Protocol & Account-Switch Guard
// ---------------------------------------------------------------------------

export type AuthSyncMessageType =
  | 'PING_TABS'
  | 'PONG_TABS'
  | 'PREPARE_SIGN_OUT'
  | 'ACK_PREPARE'
  | 'CLOSE_IDB_CONNECTIONS'
  | 'ACK_CLOSE_IDB'
  | 'SIGN_OUT_ABORTED'
  | 'SESSION_TERMINATED'
  | 'ISOLATION_LOCKDOWN';

export interface AuthSyncMessage {
  type: AuthSyncMessageType;
  uid: string;
  correlationId: string;
  senderTabId: string;
  targetTabId?: string;
  timestamp: number;
  uidMismatch?: boolean;
  lockdownState?: IsolationLockdownState;
  error?: string;
}

export const AUTH_SYNC_CHANNEL_NAME = 'seera_ai_auth_sync';
export const AUTH_SYNC_STORAGE_EVENT_KEY = 'seera_ai_auth_sync_event';

/**
 * Checks whether localStorage holds unresolved plaintext/session artifacts from a DIFFERENT user.
 * Fails closed: blocks switching to another account while previous user's plaintext or lockdown exists.
 */
export function checkAccountSwitchAllowed(params: {
  nextUid?: string | null;
  nextEmail?: string | null;
  storage?: Storage;
}): {
  allowed: boolean;
  lockdownState: IsolationLockdownState | null;
  reason?: string;
} {
  const store = params.storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  const lockdown = getIsolationLockdownState(store);
  if (lockdown?.active) {
    return {
      allowed: false,
      lockdownState: lockdown,
      reason: lockdown.details || lockdown.reason,
    };
  }

  if (!store) {
    return { allowed: true, lockdownState: null };
  }

  const prevEmail = (store.getItem('seera_cached_email') || store.getItem('seera_current_user_email') || store.getItem('seera_user_email') || '').trim().toLowerCase();
  const prevUid = (store.getItem('seera_current_user_id') || '').trim();
  const nextEmail = (params.nextEmail || '').trim().toLowerCase();
  const nextUid = (params.nextUid || '').trim();

  const emailMismatch = Boolean(prevEmail && nextEmail && prevEmail !== nextEmail);
  const uidMismatch = Boolean(prevUid && nextUid && prevUid !== nextUid);

  if (emailMismatch || uidMismatch) {
    // Check if sensitive plaintext artifacts from the previous account remain in storage
    let hasResidualPlaintext = false;
    const residualPrefixes = ['seera_ai_saved_documents', 'seera_ai_queued_edits', 'seera_offline_court_case_drafts', 'seera_ai_draft_prompt', 'seera_court_active_session', 'seera_ai_doc_annotations', 'seera_ai_local_credentials'];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (!k) continue;
      if (residualPrefixes.some((p) => k === p || k.startsWith(p + '_'))) {
        const val = store.getItem(k);
        if (val && val !== '[]' && val !== '{}') {
          hasResidualPlaintext = true;
          break;
        }
      }
    }

    if (hasResidualPlaintext) {
      const blockedState: IsolationLockdownState = {
        active: true,
        reason: 'PREVIOUS_ACCOUNT_PLAINTEXT_PRESENT',
        details: `Cannot switch to ${nextEmail || nextUid || 'another account'} while unresolved local plaintext data for ${prevEmail || prevUid || 'previous user'} remains on this device. Complete sign-out cleanup first.`,
        blockedUid: prevUid || prevEmail || 'unknown',
        failedStep: 'ISOLATION_LOCKDOWN',
        timestamp: new Date().toISOString(),
      };
      setIsolationLockdownState(blockedState, store);
      return {
        allowed: false,
        lockdownState: blockedState,
        reason: blockedState.details,
      };
    }
  }

  return { allowed: true, lockdownState: null };
}

// ---------------------------------------------------------------------------
// Dependency-Injected Guarded Sign-Out Coordinator State Machine
// ---------------------------------------------------------------------------

export interface SignOutCoordinatorState {
  phase: SignOutPhase;
  correlationId: string | null;
  uid: string | null;
  inventory: LocalDataInventoryReport | null;
  syncErrors: string[];
  unackedTabs: string[];
  lockdownState: IsolationLockdownState | null;
  holdReason: string | null;
}

export interface SignOutCoordinatorDeps {
  getCurrentUid: () => string | null;
  getCurrentEmail: () => string | null;
  pauseSync: () => void;
  resumeSync: () => void;
  drainWrites: (timeoutMs: number) => Promise<{ drained: boolean; timedOut: boolean; pendingLabels: string[] }>;
  notifyServiceWorkerPause: (paused: boolean, correlationId: string) => Promise<{ ok: boolean; reason?: string }>;
  notifyServiceWorkerCloseIDB: (correlationId: string) => Promise<{ ok: boolean; reason?: string }>;
  coordinateTabsPrepare: (uid: string, correlationId: string, timeoutMs: number) => Promise<{ ok: boolean; unackedTabs: string[]; uidMismatch?: boolean; reason?: string }>;
  coordinateTabsCloseIDB: (uid: string, correlationId: string, timeoutMs: number) => Promise<{ ok: boolean; unackedTabs: string[]; reason?: string }>;
  broadcastAbort: (uid: string, correlationId: string) => void;
  broadcastTerminated: (uid: string, correlationId: string) => void;
  broadcastLockdown: (uid: string, correlationId: string, lockdown: IsolationLockdownState) => void;
  syncQueuedEdits: () => Promise<{ syncedCount: number; remainingPendingCount: number; errors: string[] }>;
  syncCourtData: () => Promise<{ syncedCount: number; errors: number }>;
  buildInventory: () => Promise<LocalDataInventoryReport>;
  closeLocalIDBConnections: () => number;
  deleteOfflineDB: (opts: {
    correlationId: string;
    onBlocked?: () => void;
    onLateSettlement?: (res: SafeDeleteDBResult) => void;
  }) => Promise<SafeDeleteDBResult>;
  purgeAppStorage: () => { removedKeys: string[] };
  firebaseSignOut: () => Promise<void>;
  verifyFirebaseSignedOut: () => boolean;
  clearClientAuthState: () => void;
  storage?: Storage;
  onStateChange?: (state: SignOutCoordinatorState) => void;
}

export function createSignOutCoordinator(deps: SignOutCoordinatorDeps) {
  const initialLockdown = getIsolationLockdownState(deps.storage);
  let state: SignOutCoordinatorState = {
    phase: initialLockdown?.active ? 'ISOLATION_LOCKDOWN' : 'IDLE',
    correlationId: null,
    uid: null,
    inventory: null,
    syncErrors: [],
    unackedTabs: initialLockdown?.unackedTabs || [],
    lockdownState: initialLockdown,
    holdReason: initialLockdown?.active ? initialLockdown.details : null,
  };

  const emit = (patch: Partial<SignOutCoordinatorState>) => {
    state = { ...state, ...patch };
    deps.onStateChange?.({ ...state });
  };

  const enterLockdown = (
    failedStep: IsolationLockdownState['failedStep'],
    reason: string,
    details: string,
    extra?: { unackedTabs?: string[]; dbDeleteStatus?: string }
  ): SignOutCoordinatorState => {
    const uid = state.uid || deps.getCurrentUid() || 'unknown';
    const correlationId = state.correlationId || `corr_${Date.now()}`;
    const lockdown: IsolationLockdownState = {
      active: true,
      reason,
      details,
      blockedUid: uid,
      failedStep,
      unackedTabs: extra?.unackedTabs,
      dbDeleteStatus: extra?.dbDeleteStatus,
      timestamp: new Date().toISOString(),
    };
    setIsolationLockdownState(lockdown, deps.storage);
    deps.broadcastLockdown(uid, correlationId, lockdown);
    emit({
      phase: 'ISOLATION_LOCKDOWN',
      lockdownState: lockdown,
      unackedTabs: extra?.unackedTabs || [],
      holdReason: details,
    });
    return state;
  };

  const runSyncAndInventory = async (): Promise<SignOutCoordinatorState> => {
    const syncErrors: string[] = [];
    try {
      const editSync = await deps.syncQueuedEdits();
      if (editSync.errors.length > 0) {
        syncErrors.push(...editSync.errors);
      }
    } catch (e: any) {
      syncErrors.push(e?.message || 'Document queue sync failed');
    }

    try {
      const courtSync = await deps.syncCourtData();
      if (courtSync.errors > 0) {
        syncErrors.push(`${courtSync.errors} institutional sync item(s) could not be verified with Firestore`);
      }
    } catch (e: any) {
      syncErrors.push(e?.message || 'Court queue sync failed');
    }

    const inventory = await deps.buildInventory();
    if (!inventory.verified) {
      emit({
        phase: 'SAFE_HOLD',
        inventory,
        syncErrors,
        holdReason: `Unable to verify local data safely: ${inventory.unverifiedReasons.join('; ')}`,
      });
      return state;
    }

    emit({
      phase: 'AWAITING_USER_DECISION',
      inventory,
      syncErrors,
      holdReason: null,
    });
    return state;
  };

  return {
    getState: (): SignOutCoordinatorState => ({ ...state }),

    async beginSignOut(): Promise<SignOutCoordinatorState> {
      const persistedLockdown = getIsolationLockdownState(deps.storage);
      if (persistedLockdown?.active || state.phase === 'ISOLATION_LOCKDOWN') {
        const activeLock = persistedLockdown || state.lockdownState!;
        emit({
          phase: 'ISOLATION_LOCKDOWN',
          lockdownState: activeLock,
          holdReason: activeLock.details,
        });
        return state;
      }

      const uid = deps.getCurrentUid() || 'guest';
      const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      acquireSignOutLock(uid, correlationId);
      deps.pauseSync();
      emit({
        phase: 'LOCKING_AND_PAUSING',
        correlationId,
        uid,
        syncErrors: [],
        unackedTabs: [],
        holdReason: null,
      });

      const swPause = await deps.notifyServiceWorkerPause(true, correlationId);
      if (!swPause.ok) {
        emit({
          phase: 'SAFE_HOLD',
          holdReason: swPause.reason || 'Service worker did not acknowledge sync pause.',
        });
        return state;
      }

      const drain = await deps.drainWrites(3000);
      if (!drain.drained) {
        emit({
          phase: 'SAFE_HOLD',
          holdReason: `In-flight persistence did not settle before timeout: ${drain.pendingLabels.join(', ') || 'active write'}.`,
        });
        return state;
      }

      emit({ phase: 'COORDINATING_TABS' });
      const prepTabs = await deps.coordinateTabsPrepare(uid, correlationId, 2500);
      if (!prepTabs.ok) {
        if (prepTabs.uidMismatch) {
          return enterLockdown(
            'TAB_ACK',
            'CROSS_TAB_UID_MISMATCH',
            'Another browser tab on this device has a different active account. Close or sign out the other tab before switching accounts.',
            { unackedTabs: prepTabs.unackedTabs }
          );
        }
        emit({
          phase: 'SAFE_HOLD',
          unackedTabs: prepTabs.unackedTabs,
          holdReason: prepTabs.reason || `Other open tab(s) did not acknowledge pause/prepare: ${prepTabs.unackedTabs.join(', ')}`,
        });
        return state;
      }

      emit({ phase: 'INVENTORY_AND_SYNC' });
      return runSyncAndInventory();
    },

    async retrySync(): Promise<SignOutCoordinatorState> {
      if (state.phase === 'ISOLATION_LOCKDOWN') {
        return this.retryIsolationRecovery();
      }
      if (!state.correlationId || state.phase === 'SAFE_HOLD') {
        return this.beginSignOut();
      }
      emit({ phase: 'INVENTORY_AND_SYNC', holdReason: null });
      return runSyncAndInventory();
    },

    async cancelStaySignedIn(): Promise<SignOutCoordinatorState> {
      const persistedLockdown = getIsolationLockdownState(deps.storage);
      if (persistedLockdown?.active || state.phase === 'ISOLATION_LOCKDOWN') {
        // Isolation lockdown CANNOT be dismissed without resolving cleanup
        return state;
      }
      const uid = state.uid || deps.getCurrentUid() || 'guest';
      const correlationId = state.correlationId || `corr_abort_${Date.now()}`;
      deps.broadcastAbort(uid, correlationId);
      await deps.notifyServiceWorkerPause(false, correlationId).catch(() => {});
      releaseSignOutLock(correlationId);
      deps.resumeSync();
      emit({
        phase: 'IDLE',
        correlationId: null,
        inventory: null,
        syncErrors: [],
        unackedTabs: [],
        holdReason: null,
      });
      return state;
    },

    async confirmAndExecuteSignOut(options?: {
      discardConfirmed?: boolean;
      backupExported?: boolean;
    }): Promise<SignOutCoordinatorState> {
      const uid = state.uid || deps.getCurrentUid() || 'guest';
      const correlationId = state.correlationId || `corr_exec_${Date.now()}`;
      acquireSignOutLock(uid, correlationId);
      deps.pauseSync();

      // Re-scan inventory if needed
      const inventory = state.inventory || (await deps.buildInventory());
      if (!inventory.verified) {
        emit({
          phase: 'SAFE_HOLD',
          inventory,
          holdReason: `Local storage inventory could not be verified: ${inventory.unverifiedReasons.join('; ')}`,
        });
        return state;
      }

      if (inventory.hasBlockingUnsyncedOrLocalOnly && !options?.discardConfirmed) {
        emit({
          phase: 'AWAITING_USER_DECISION',
          inventory,
          holdReason: 'Explicit second confirmation is required before discarding unsynced or local-only data.',
        });
        return state;
      }

      if (inventory.hasUniqueLocalInstitutionalData && !options?.backupExported && !options?.discardConfirmed) {
        emit({
          phase: 'AWAITING_USER_DECISION',
          inventory,
          holdReason: 'Local-only institutional court drafts exist without a verified cloud destination. Export a backup JSON or confirm discard explicitly.',
        });
        return state;
      }

      // Close IDB across SW & sibling tabs
      emit({ phase: 'CLOSING_IDB_AND_PURGING' });

      const swClose = await deps.notifyServiceWorkerCloseIDB(correlationId);
      if (!swClose.ok) {
        return enterLockdown(
          'IDB_DELETE',
          'SW_IDB_CLOSE_FAILED',
          swClose.reason || 'Service worker did not confirm IndexedDB handle closure.'
        );
      }

      const tabClose = await deps.coordinateTabsCloseIDB(uid, correlationId, 2500);
      if (!tabClose.ok) {
        return enterLockdown(
          'TAB_ACK',
          'TAB_IDB_CLOSE_TIMEOUT',
          tabClose.reason || `Other active tab(s) (${tabClose.unackedTabs.join(', ')}) did not confirm IndexedDB closure.`,
          { unackedTabs: tabClose.unackedTabs }
        );
      }

      deps.closeLocalIDBConnections();

      const delRes = await deps.deleteOfflineDB({
        correlationId,
        onBlocked: () => {
          deps.notifyServiceWorkerCloseIDB(correlationId).catch(() => {});
          deps.coordinateTabsCloseIDB(uid, correlationId, 1000).catch(() => {});
        },
        onLateSettlement: (lateRes) => {
          if (lateRes.success && getIsolationLockdownState(deps.storage)?.failedStep === 'IDB_DELETE') {
            // Update lockdown details so user can finish final storage purge & Firebase sign-out cleanly
            setIsolationLockdownState(
              {
                active: true,
                reason: 'IDB_LATE_DELETE_COMPLETE',
                details: 'IndexedDB deletion settled cleanly after initial timeout. Click "Complete Sign-Out" to finish clearing local session and signing out of Firebase.',
                blockedUid: uid,
                failedStep: 'FIREBASE_SIGNOUT',
                dbDeleteStatus: lateRes.status,
                timestamp: new Date().toISOString(),
              },
              deps.storage
            );
          }
        },
      });

      if (!delRes.success) {
        return enterLockdown(
          'IDB_DELETE',
          `IDB_DELETE_${delRes.status}`,
          delRes.reason || `IndexedDB purge did not complete (${delRes.status}). Account switching is blocked until database deletion is verified.`,
          { dbDeleteStatus: delRes.status }
        );
      }

      // IndexedDB confirmed deleted (onsuccess). Now purge app-owned localStorage & sessionStorage (leaving Firebase SDK keys intact).
      deps.purgeAppStorage();

      emit({ phase: 'SIGNING_OUT_FIREBASE' });
      try {
        await deps.firebaseSignOut();
      } catch (fbErr: any) {
        return enterLockdown(
          'FIREBASE_SIGNOUT',
          'FIREBASE_SIGNOUT_ERROR',
          `Local data was purged, but Firebase signOut() failed (${fbErr?.message || 'error'}). Retry Firebase sign-out before switching accounts.`
        );
      }

      emit({ phase: 'VERIFYING_COMPLETION' });
      if (!deps.verifyFirebaseSignedOut()) {
        return enterLockdown(
          'FIREBASE_SIGNOUT',
          'FIREBASE_USER_STILL_PRESENT',
          'Firebase Auth still reports an active user after signOut(). Retry sign-out before allowing another user to log in.'
        );
      }

      clearIsolationLockdownState(deps.storage);
      deps.broadcastTerminated(uid, correlationId);
      deps.clearClientAuthState();
      releaseSignOutLock(correlationId);

      emit({
        phase: 'IDLE',
        correlationId: null,
        uid: null,
        inventory: null,
        syncErrors: [],
        unackedTabs: [],
        lockdownState: null,
        holdReason: null,
      });
      return state;
    },

    async retryIsolationRecovery(): Promise<SignOutCoordinatorState> {
      const currentLock = getIsolationLockdownState(deps.storage) || state.lockdownState;
      const uid = currentLock?.blockedUid || state.uid || deps.getCurrentUid() || 'guest';
      const correlationId = state.correlationId || `corr_recover_${Date.now()}`;
      acquireSignOutLock(uid, correlationId);
      deps.pauseSync();

      if (currentLock?.failedStep !== 'FIREBASE_SIGNOUT') {
        await deps.notifyServiceWorkerCloseIDB(correlationId).catch(() => {});
        const tabClose = await deps.coordinateTabsCloseIDB(uid, correlationId, 2500);
        if (!tabClose.ok) {
          return enterLockdown(
            'TAB_ACK',
            'TAB_IDB_CLOSE_TIMEOUT',
            tabClose.reason || `Close other open tabs (${tabClose.unackedTabs.join(', ')}) and retry cleanup.`,
            { unackedTabs: tabClose.unackedTabs }
          );
        }
        deps.closeLocalIDBConnections();
        const delRes = await deps.deleteOfflineDB({ correlationId });
        if (!delRes.success) {
          return enterLockdown(
            'IDB_DELETE',
            `IDB_DELETE_${delRes.status}`,
            delRes.reason || `IndexedDB purge still blocked (${delRes.status}). Close other tabs and retry.`,
            { dbDeleteStatus: delRes.status }
          );
        }
        deps.purgeAppStorage();
      }

      try {
        await deps.firebaseSignOut();
      } catch (fbErr: any) {
        return enterLockdown(
          'FIREBASE_SIGNOUT',
          'FIREBASE_SIGNOUT_ERROR',
          `Firebase sign-out still failed (${fbErr?.message || 'error'}). Check connection or reload and retry.`
        );
      }

      if (!deps.verifyFirebaseSignedOut()) {
        return enterLockdown(
          'FIREBASE_SIGNOUT',
          'FIREBASE_USER_STILL_PRESENT',
          'Firebase Auth user session still active; retry sign-out.'
        );
      }

      clearIsolationLockdownState(deps.storage);
      deps.broadcastTerminated(uid, correlationId);
      deps.clearClientAuthState();
      releaseSignOutLock(correlationId);

      emit({
        phase: 'IDLE',
        correlationId: null,
        uid: null,
        inventory: null,
        syncErrors: [],
        unackedTabs: [],
        lockdownState: null,
        holdReason: null,
      });
      return state;
    },
  };
}

