import type { SavedLegalDocument } from './storage';

import { Language } from '../i18n/translations';
import { isWriteLocked, trackInFlightWrite } from './signOutSafetyService';

export interface CachedTranslation {
  id: string;
  sourceText: string;
  translatedText: string;
  separatedVersions?: { om?: string; am?: string; en?: string };
  sourceLang: string;
  targetLangs: Language[];
  timestamp: number;
  taskType?: string;
  title?: string;
}

export interface QueuedDocumentEdit {
  id: string;
  docId: string;
  title?: string;
  content?: string;
  folderId?: string;
  tags?: string[];
  isBookmarked?: boolean;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  originalDocTitle?: string;
  lastError?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: number;
  status: 'success' | 'failed' | 'partial';
  type: 'upload' | 'download' | 'full' | 'conflict_resolution';
  details: string;
  affectedIds: string[];
  conflictsResolved: boolean;
  errorMessage?: string;
  latency?: number; // In milliseconds
  conflictData?: {
    local: any;
    remote: any;
  };
}

export const OFFLINE_DB_NAME = 'SeeraAIOfflineDB';
const DB_NAME = OFFLINE_DB_NAME;
const DB_VERSION = 13;
export const STORE_DOCS = 'documents';
export const STORE_TRANSLATIONS = 'translations';
export const STORE_EDITS = 'edits';
export const STORE_RAG_CACHE = 'rag_cache';
export const STORE_LEGISLATION = 'legislation';
export const STORE_ACTIVE_CASE = 'active_case';
export const STORE_DEADLINES = 'deadlines';
export const STORE_CASE_FILES = 'case_files';
export const STORE_TEMPLATES = 'templates';
export const STORE_SYNC_QUEUE = 'sync_queue';
export const STORE_SYNC_LOGS = 'sync_logs';
export const STORE_INSTITUTIONS = 'institutions';
export const STORE_USERS = 'users';

export const ALL_OFFLINE_DB_STORES = [
  STORE_DOCS,
  STORE_TRANSLATIONS,
  STORE_EDITS,
  STORE_RAG_CACHE,
  STORE_LEGISLATION,
  STORE_ACTIVE_CASE,
  STORE_DEADLINES,
  STORE_CASE_FILES,
  STORE_TEMPLATES,
  STORE_SYNC_QUEUE,
  STORE_SYNC_LOGS,
  STORE_INSTITUTIONS,
  STORE_USERS,
] as const;

// ---------------------------------------------------------------------------
// Connection Registry & VersionChange Management
// ---------------------------------------------------------------------------

const trackedConnections = new Set<IDBDatabase>();

function registerDBConnection(db: IDBDatabase): IDBDatabase {
  trackedConnections.add(db);
  db.onversionchange = () => {
    try {
      db.close();
    } catch {}
    trackedConnections.delete(db);
  };
  db.onclose = () => {
    trackedConnections.delete(db);
  };
  return db;
}

export function closeAllTrackedDBConnections(): number {
  let closedCount = 0;
  for (const db of Array.from(trackedConnections)) {
    try {
      db.close();
      closedCount++;
    } catch {}
    trackedConnections.delete(db);
  }
  return closedCount;
}

export function getTrackedDBConnectionCount(): number {
  return trackedConnections.size;
}

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        // If version error occurs, attempt fallback open without explicit version
        if (request.error?.name === 'VersionError') {
          const fallbackReq = indexedDB.open(DB_NAME);
          fallbackReq.onsuccess = () => resolve(registerDBConnection(fallbackReq.result));
          fallbackReq.onerror = () => reject(fallbackReq.error);
        } else {
          reject(request.error);
        }
      };

      request.onsuccess = () => resolve(registerDBConnection(request.result));

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        registerDBConnection(db);

        if (!db.objectStoreNames.contains(STORE_DOCS)) {
          db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_TRANSLATIONS)) {
          db.createObjectStore(STORE_TRANSLATIONS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_EDITS)) {
          db.createObjectStore(STORE_EDITS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_RAG_CACHE)) {
          db.createObjectStore(STORE_RAG_CACHE, { keyPath: 'query' });
        }

        if (!db.objectStoreNames.contains(STORE_LEGISLATION)) {
          db.createObjectStore(STORE_LEGISLATION, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_ACTIVE_CASE)) {
          db.createObjectStore(STORE_ACTIVE_CASE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_DEADLINES)) {
          db.createObjectStore(STORE_DEADLINES, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_CASE_FILES)) {
          db.createObjectStore(STORE_CASE_FILES, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
          db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
          db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_SYNC_LOGS)) {
          db.createObjectStore(STORE_SYNC_LOGS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_INSTITUTIONS)) {
          db.createObjectStore(STORE_INSTITUTIONS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_USERS)) {
          db.createObjectStore(STORE_USERS, { keyPath: 'id' });
        }
      };
    } catch (err) {
      reject(err);
    }
  });
}

function assertNotWriteLocked(opName: string, allowDuringSignOut: boolean = false): void {
  if (!allowDuringSignOut && isWriteLocked()) {
    throw new Error(`SIGN_OUT_WRITE_LOCKED:${opName}`);
  }
}

export async function saveOfflineDocumentToDB(
  doc: SavedLegalDocument,
  options?: { allowDuringSignOut?: boolean }
): Promise<void> {
  if (isWriteLocked() && !options?.allowDuringSignOut) {
    console.warn('[IndexedDB] Blocked saveOfflineDocumentToDB while sign-out write lock is active.');
    return;
  }
  return trackInFlightWrite('idb:saveOfflineDocument', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_DOCS, 'readwrite');
        const store = transaction.objectStore(STORE_DOCS);
        store.put(doc);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
      });
    } catch (e) {
      console.error('IndexedDB saveOfflineDocument error:', e);
    }
  })());
}

export async function getOfflineDocumentsFromDB(): Promise<SavedLegalDocument[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_DOCS, 'readonly');
      const store = transaction.objectStore(STORE_DOCS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getOfflineDocuments error:', e);
    return [];
  }
}

export async function deleteOfflineDocumentFromDB(
  id: string,
  options?: { allowDuringSignOut?: boolean }
): Promise<void> {
  assertNotWriteLocked('deleteOfflineDocument', options?.allowDuringSignOut);
  return trackInFlightWrite('idb:deleteOfflineDocument', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_DOCS, 'readwrite');
        const store = transaction.objectStore(STORE_DOCS);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
      });
    } catch (e) {
      console.error('IndexedDB deleteOfflineDocument error:', e);
    }
  })());
}

export async function saveOfflineTranslationToDB(translation: Omit<CachedTranslation, 'id' | 'timestamp'>): Promise<CachedTranslation> {
  const entry: CachedTranslation = {
    ...translation,
    id: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };
  if (isWriteLocked()) {
    console.warn('[IndexedDB] Blocked saveOfflineTranslationToDB while sign-out write lock is active.');
    return entry;
  }

  await trackInFlightWrite('idb:saveOfflineTranslation', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_TRANSLATIONS, 'readwrite');
        const store = transaction.objectStore(STORE_TRANSLATIONS);
        store.put(entry);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB saveOfflineTranslation error:', e);
    }
  })());

  return entry;
}

export async function getOfflineTranslationsFromDB(): Promise<CachedTranslation[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_TRANSLATIONS, 'readonly');
      const store = transaction.objectStore(STORE_TRANSLATIONS);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getOfflineTranslations error:', e);
    return [];
  }
}

export async function clearOfflineTranslationsFromDB(): Promise<void> {
  return trackInFlightWrite('idb:clearOfflineTranslations', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_TRANSLATIONS, 'readwrite');
        const store = transaction.objectStore(STORE_TRANSLATIONS);
        store.clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB clearOfflineTranslations error:', e);
    }
  })());
}

export async function addQueuedEditToDB(edit: QueuedDocumentEdit): Promise<void> {
  if (isWriteLocked()) {
    throw new Error('SIGN_OUT_WRITE_LOCKED:addQueuedEditToDB');
  }
  return trackInFlightWrite('idb:addQueuedEdit', (async () => {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_EDITS, 'readwrite');
      const store = transaction.objectStore(STORE_EDITS);
      store.put(edit);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
    });
  })());
}

export async function getQueuedEditsFromDB(): Promise<QueuedDocumentEdit[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_EDITS, 'readonly');
      const store = transaction.objectStore(STORE_EDITS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getQueuedEdits error:', e);
    return [];
  }
}

export async function removeQueuedEditFromDB(
  id: string,
  options?: { allowDuringSignOut?: boolean }
): Promise<void> {
  if (isWriteLocked() && !options?.allowDuringSignOut) {
    return;
  }
  return trackInFlightWrite('idb:removeQueuedEdit', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_EDITS, 'readwrite');
        const store = transaction.objectStore(STORE_EDITS);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB removeQueuedEdit error:', e);
    }
  })());
}

export async function clearQueuedEditsFromDB(): Promise<void> {
  return trackInFlightWrite('idb:clearQueuedEdits', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_EDITS, 'readwrite');
        const store = transaction.objectStore(STORE_EDITS);
        store.clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB clearQueuedEdits error:', e);
    }
  })());
}

export async function saveRagCacheToDB(query: string, results: any[]): Promise<void> {
  if (isWriteLocked()) return;
  return trackInFlightWrite('idb:saveRagCache', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_RAG_CACHE, 'readwrite');
        const store = transaction.objectStore(STORE_RAG_CACHE);
        store.put({ query, results, timestamp: Date.now() });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB saveRagCache error:', e);
    }
  })());
}

export async function getRagCacheFromDB(query: string): Promise<any[] | null> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_RAG_CACHE, 'readonly');
      const store = transaction.objectStore(STORE_RAG_CACHE);
      const request = store.get(query);
      request.onsuccess = () => resolve(request.result ? request.result.results : null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getRagCache error:', e);
    return null;
  }
}

export async function saveOfflineLegislationToDB(legislation: any[]): Promise<void> {
  if (isWriteLocked()) return;
  return trackInFlightWrite('idb:saveOfflineLegislation', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_LEGISLATION, 'readwrite');
        const store = transaction.objectStore(STORE_LEGISLATION);
        legislation.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB saveOfflineLegislation error:', e);
    }
  })());
}

export async function getOfflineLegislationFromDB(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_LEGISLATION, 'readonly');
      const store = transaction.objectStore(STORE_LEGISLATION);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getOfflineLegislation error:', e);
    return [];
  }
}

export async function saveActiveCaseToDB(caseData: any): Promise<void> {
  if (isWriteLocked()) return;
  return trackInFlightWrite('idb:saveActiveCase', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_ACTIVE_CASE, 'readwrite');
        const store = transaction.objectStore(STORE_ACTIVE_CASE);
        store.put(caseData);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB saveActiveCase error:', e);
    }
  })());
}

export async function getActiveCaseFromDB(id: string): Promise<any | null> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ACTIVE_CASE, 'readonly');
      const store = transaction.objectStore(STORE_ACTIVE_CASE);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getActiveCase error:', e);
    return null;
  }
}

export async function saveOfflineDeadlineToDB(deadline: any): Promise<void> {
  if (isWriteLocked()) return;
  return trackInFlightWrite('idb:saveOfflineDeadline', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_DEADLINES, 'readwrite');
        const store = transaction.objectStore(STORE_DEADLINES);
        store.put(deadline);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB saveOfflineDeadline error:', e);
    }
  })());
}

export async function getOfflineDeadlinesFromDB(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_DEADLINES, 'readonly');
      const store = transaction.objectStore(STORE_DEADLINES);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getOfflineDeadlines error:', e);
    return [];
  }
}

export async function deleteOfflineDeadlineFromDB(id: string): Promise<void> {
  if (isWriteLocked()) return;
  return trackInFlightWrite('idb:deleteOfflineDeadline', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_DEADLINES, 'readwrite');
        const store = transaction.objectStore(STORE_DEADLINES);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB deleteOfflineDeadline error:', e);
    }
  })());
}

export async function saveOfflineAudioBufferToDB(id: string, audioData: Blob): Promise<void> {
  if (isWriteLocked()) return;
  return trackInFlightWrite('idb:saveOfflineAudioBuffer', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_CASE_FILES, 'readwrite');
        const store = transaction.objectStore(STORE_CASE_FILES);
        store.put({ id, audioData, timestamp: Date.now() });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB saveOfflineAudioBuffer error:', e);
    }
  })());
}

export async function getOfflineAudioBufferFromDB(id: string): Promise<Blob | null> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_CASE_FILES, 'readonly');
      const store = transaction.objectStore(STORE_CASE_FILES);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result ? request.result.audioData : null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getOfflineAudioBuffer error:', e);
    return null;
  }
}

export async function saveInstitutionsToDB(institutions: any[]): Promise<void> {
  if (isWriteLocked()) return;
  return trackInFlightWrite('idb:saveInstitutions', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_INSTITUTIONS, 'readwrite');
        const store = transaction.objectStore(STORE_INSTITUTIONS);
        store.clear(); // Clear existing
        institutions.forEach(inst => store.put(inst));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB saveInstitutions error:', e);
    }
  })());
}

export async function getInstitutionsFromDB(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_INSTITUTIONS, 'readonly');
      const store = transaction.objectStore(STORE_INSTITUTIONS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getInstitutions error:', e);
    return [];
  }
}

export async function saveUsersToDB(users: any[]): Promise<void> {
  if (isWriteLocked()) return;
  return trackInFlightWrite('idb:saveUsers', (async () => {
    try {
      const db = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_USERS, 'readwrite');
        const store = transaction.objectStore(STORE_USERS);
        store.clear();
        users.forEach(user => store.put(user));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error('IndexedDB saveUsers error:', e);
    }
  })());
}

export async function getUsersFromDB(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_USERS, 'readonly');
      const store = transaction.objectStore(STORE_USERS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getUsers error:', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Authoritative Store Snapshot Reader (Fail-Safe on Error)
// ---------------------------------------------------------------------------

export async function readAllOfflineDBStoresSnapshot(): Promise<{
  ok: boolean;
  error?: string;
  stores: Record<string, any[]>;
}> {
  const emptyStores: Record<string, any[]> = {};
  for (const name of ALL_OFFLINE_DB_STORES) emptyStores[name] = [];

  if (typeof window === 'undefined' || !window.indexedDB) {
    return { ok: false, error: 'IndexedDB unavailable in this environment', stores: emptyStores };
  }

  // Avoid creating a brand-new database during sign-out inventory if the browser supports databases() and DB is absent
  try {
    if (typeof window.indexedDB.databases === 'function') {
      const dbs = await window.indexedDB.databases();
      const exists = Array.isArray(dbs) && dbs.some((d) => d?.name === DB_NAME);
      if (!exists) {
        return { ok: true, stores: emptyStores };
      }
    }
  } catch {
    // Fallback to openOfflineDB()
  }

  let db: IDBDatabase | null = null;
  try {
    db = await openOfflineDB();
    const presentStoreNames = ALL_OFFLINE_DB_STORES.filter((s) => db!.objectStoreNames.contains(s));
    if (presentStoreNames.length === 0) {
      return { ok: true, stores: emptyStores };
    }

    return await new Promise((resolve) => {
      const resultStores: Record<string, any[]> = { ...emptyStores };
      try {
        const tx = db!.transaction(presentStoreNames, 'readonly');
        let settled = false;

        tx.oncomplete = () => {
          if (!settled) {
            settled = true;
            resolve({ ok: true, stores: resultStores });
          }
        };
        tx.onerror = () => {
          if (!settled) {
            settled = true;
            resolve({ ok: false, error: tx.error?.message || 'IndexedDB snapshot transaction error', stores: emptyStores });
          }
        };
        tx.onabort = () => {
          if (!settled) {
            settled = true;
            resolve({ ok: false, error: tx.error?.message || 'IndexedDB snapshot transaction aborted', stores: emptyStores });
          }
        };

        for (const storeName of presentStoreNames) {
          const req = tx.objectStore(storeName).getAll();
          req.onsuccess = () => {
            resultStores[storeName] = Array.isArray(req.result) ? req.result : [];
          };
          req.onerror = () => {
            if (!settled) {
              settled = true;
              resolve({ ok: false, error: req.error?.message || `Failed reading store ${storeName}`, stores: emptyStores });
            }
          };
        }
      } catch (txErr: any) {
        resolve({ ok: false, error: txErr?.message || String(txErr), stores: emptyStores });
      }
    });
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err), stores: emptyStores };
  } finally {
    if (db) {
      try {
        db.close();
      } catch {}
      trackedConnections.delete(db);
    }
  }
}

// ---------------------------------------------------------------------------
// Safe IndexedDB Deletion Lifecycle (Non-Overlapping + Late-Event Aware)
// ---------------------------------------------------------------------------

export type SafeDeleteDBStatus =
  | 'DELETED'
  | 'ERROR'
  | 'BLOCKED_TIMEOUT'
  | 'TIMEOUT'
  | 'DELETE_STILL_PENDING'
  | 'NO_INDEXEDDB_ENV'
  | 'UNRECOGNIZED_DB'
  | 'EXCEPTION';

export interface SafeDeleteDBResult {
  success: boolean;
  status: SafeDeleteDBStatus;
  reason?: string;
  lateSettlement?: boolean;
}

export interface SafeDeleteDBOptions {
  timeoutMs?: number;
  onBlocked?: () => void;
  onLateSettlement?: (result: SafeDeleteDBResult) => void;
  correlationId?: string;
}

interface PendingDeleteRecord {
  settledByBrowser: boolean;
  browserResult?: SafeDeleteDBResult;
  completionPromise: Promise<SafeDeleteDBResult>;
}

const pendingDeleteOperations = new Map<string, PendingDeleteRecord>();

export function hasPendingOfflineDBDeletion(dbName: string = DB_NAME): boolean {
  const existing = pendingDeleteOperations.get(dbName);
  return Boolean(existing && !existing.settledByBrowser);
}

/**
 * Awaited safe IndexedDB database deletion for the app-owned SeeraAIOfflineDB only.
 * - Closes all tracked local connections first.
 * - Never treats onblocked or timeout as success.
 * - Never launches overlapping deleteDatabase requests while an earlier uncancellable browser request is still pending.
 * - Invokes onLateSettlement if browser fires onsuccess/onerror after the timeout expired.
 */
export function safeDeleteOfflineDB(
  dbName: string = DB_NAME,
  options?: SafeDeleteDBOptions
): Promise<SafeDeleteDBResult> {
  if (dbName !== DB_NAME) {
    return Promise.resolve({
      success: false,
      status: 'UNRECOGNIZED_DB',
      reason: `Refusing to delete unrecognized database "${dbName}". Only app-owned "${DB_NAME}" is managed.`,
    });
  }

  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve({
      success: false,
      status: 'NO_INDEXEDDB_ENV',
      reason: 'IndexedDB unavailable in this runtime; browser database deletion cannot be verified.',
    });
  }

  // Always close local tracked connections immediately before deletion or awaiting an existing pending request
  closeAllTrackedDBConnections();

  const existing = pendingDeleteOperations.get(dbName);
  const timeoutMs = options?.timeoutMs ?? 4500;

  if (existing && !existing.settledByBrowser) {
    // Do NOT start an overlapping deleteDatabase() request. Wait up to timeoutMs for the existing request to finish!
    return new Promise((resolve) => {
      let localSettled = false;
      const timer = setTimeout(() => {
        if (!localSettled) {
          localSettled = true;
          resolve({
            success: false,
            status: 'DELETE_STILL_PENDING',
            reason: `Previous IndexedDB deletion for ${dbName} has not yet settled in the browser.`,
          });
        }
      }, timeoutMs);

      existing.completionPromise.then((res) => {
        if (!localSettled) {
          localSettled = true;
          clearTimeout(timer);
          resolve(res);
        } else {
          options?.onLateSettlement?.({ ...res, lateSettlement: true });
        }
      });
    });
  }

  let resolveBrowserCompletion!: (res: SafeDeleteDBResult) => void;
  const completionPromise = new Promise<SafeDeleteDBResult>((res) => {
    resolveBrowserCompletion = res;
  });

  const record: PendingDeleteRecord = {
    settledByBrowser: false,
    completionPromise,
  };
  pendingDeleteOperations.set(dbName, record);

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.deleteDatabase(dbName);
      let callerSettled = false;
      let sawBlocked = false;

      const timer = setTimeout(() => {
        if (!callerSettled) {
          callerSettled = true;
          const status: SafeDeleteDBStatus = sawBlocked ? 'BLOCKED_TIMEOUT' : 'TIMEOUT';
          const reason = sawBlocked
            ? `IndexedDB deletion for ${dbName} is blocked by open connections and timed out.`
            : `IndexedDB deletion for ${dbName} timed out awaiting confirmation.`;
          console.warn(`[IndexedDB] ${reason}`);
          resolve({ success: false, status, reason });
        }
      }, timeoutMs);

      const finalizeFromBrowser = (result: SafeDeleteDBResult) => {
        record.settledByBrowser = true;
        record.browserResult = result;
        pendingDeleteOperations.delete(dbName);
        clearTimeout(timer);
        resolveBrowserCompletion(result);

        if (!callerSettled) {
          callerSettled = true;
          resolve(result);
        } else {
          // Late settlement arrived after caller timeout
          options?.onLateSettlement?.({ ...result, lateSettlement: true });
        }
      };

      request.onsuccess = () => {
        finalizeFromBrowser({ success: true, status: 'DELETED' });
      };

      request.onerror = () => {
        finalizeFromBrowser({
          success: false,
          status: 'ERROR',
          reason: request.error?.message || 'IndexedDB deleteDatabase error',
        });
      };

      request.onblocked = () => {
        sawBlocked = true;
        console.warn(`[IndexedDB] deleteDatabase blocked for ${dbName}. Active connections remain open.`);
        closeAllTrackedDBConnections();
        try {
          options?.onBlocked?.();
        } catch {}
      };
    } catch (err: any) {
      const result: SafeDeleteDBResult = {
        success: false,
        status: 'EXCEPTION',
        reason: err?.message || 'Exception calling indexedDB.deleteDatabase',
      };
      record.settledByBrowser = true;
      record.browserResult = result;
      pendingDeleteOperations.delete(dbName);
      resolveBrowserCompletion(result);
      resolve(result);
    }
  });
}


