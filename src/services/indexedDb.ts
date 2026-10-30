import { SavedLegalDocument } from './storage';
import { Language } from '../i18n/translations';

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
}

const DB_NAME = 'SeeraAIOfflineDB';
const DB_VERSION = 8;
const STORE_DOCS = 'documents';
const STORE_TRANSLATIONS = 'translations';
const STORE_EDITS = 'edits';
const STORE_RAG_CACHE = 'rag_cache';
const STORE_LEGISLATION = 'legislation';
const STORE_ACTIVE_CASE = 'active_case';

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
          fallbackReq.onsuccess = () => resolve(fallbackReq.result);
          fallbackReq.onerror = () => reject(fallbackReq.error);
        } else {
          reject(request.error);
        }
      };

      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
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
      };
    } catch (err) {
      reject(err);
    }
  });
}

export async function saveOfflineDocumentToDB(doc: SavedLegalDocument): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_DOCS, 'readwrite');
      const store = transaction.objectStore(STORE_DOCS);
      const request = store.put(doc);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB saveOfflineDocument error:', e);
  }
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

export async function deleteOfflineDocumentFromDB(id: string): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_DOCS, 'readwrite');
      const store = transaction.objectStore(STORE_DOCS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB deleteOfflineDocument error:', e);
  }
}

export async function saveOfflineTranslationToDB(translation: Omit<CachedTranslation, 'id' | 'timestamp'>): Promise<CachedTranslation> {
  const entry: CachedTranslation = {
    ...translation,
    id: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_TRANSLATIONS, 'readwrite');
      const store = transaction.objectStore(STORE_TRANSLATIONS);
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB saveOfflineTranslation error:', e);
  }

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
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_TRANSLATIONS, 'readwrite');
      const store = transaction.objectStore(STORE_TRANSLATIONS);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB clearOfflineTranslations error:', e);
  }
}

export async function addQueuedEditToDB(edit: QueuedDocumentEdit): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_EDITS, 'readwrite');
      const store = transaction.objectStore(STORE_EDITS);
      const request = store.put(edit);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB addQueuedEdit error:', e);
  }
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

export async function removeQueuedEditFromDB(id: string): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_EDITS, 'readwrite');
      const store = transaction.objectStore(STORE_EDITS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB removeQueuedEdit error:', e);
  }
}

export async function clearQueuedEditsFromDB(): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_EDITS, 'readwrite');
      const store = transaction.objectStore(STORE_EDITS);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB clearQueuedEdits error:', e);
  }
}

export async function saveRagCacheToDB(query: string, results: any[]): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_RAG_CACHE, 'readwrite');
      const store = transaction.objectStore(STORE_RAG_CACHE);
      const request = store.put({ query, results, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB saveRagCache error:', e);
  }
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
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_LEGISLATION, 'readwrite');
      const store = transaction.objectStore(STORE_LEGISLATION);
      legislation.forEach(item => store.put(item));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('IndexedDB saveOfflineLegislation error:', e);
  }
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
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ACTIVE_CASE, 'readwrite');
      const store = transaction.objectStore(STORE_ACTIVE_CASE);
      const request = store.put(caseData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB saveActiveCase error:', e);
  }
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

