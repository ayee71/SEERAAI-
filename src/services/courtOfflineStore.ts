import { openOfflineDB, STORE_CASE_FILES, STORE_TEMPLATES, STORE_SYNC_QUEUE } from './indexedDb';
import { auth, db } from './firebase';
import { doc, setDoc, deleteDoc, getDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import { syncStatusService } from './syncStatusService';
import { addSyncLog } from './syncLogService';
import { isWriteLocked, trackInFlightWrite } from './signOutSafetyService';

export interface CourtCaseFile {
  id: string;
  institutionId: string;
  caseNumber: string;
  claimantName: string;
  respondentName: string;
  claimSubject: string;
  filingDate: string;
  courtLevel: string;
  bench: string;
  assignedOfficer: string;
  assignedJudge: string;
  status: string;
  currentStage: string;
  pendingSync?: boolean;
  serverConfirmedAt?: string;
  serverConfirmedUid?: string;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface CourtTemplateFile {
  id: string;
  institutionId: string;
  name: string;
  category: string;
  domain: string;
  content: string;
  lastModified: string;
  pendingSync?: boolean;
  serverConfirmedAt?: string;
  serverConfirmedUid?: string;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface OfflineSyncItem {
  id: string;
  collectionName: 'cases' | 'court_templates';
  actionType: 'upsert' | 'delete';
  docId: string;
  payload?: any;
  institutionId: string;
  timestamp: number;
}

export const DEFAULT_INSTITUTION_ID = 'inst_oromia_supreme';

/**
  Map human-readable court names to institution IDs
*/
export function getInstitutionIdFromCourtName(courtName?: string): string {
  if (!courtName) return DEFAULT_INSTITUTION_ID;
  const lower = courtName.toLowerCase();
  if (lower.includes('shaggar') || lower.includes('sheger')) return 'inst_shaggar_high';
  if (lower.includes('adaamaa') || lower.includes('adama')) return 'inst_adama_district';
  if (lower.includes('gurbicha')) return 'inst_gurbicha_woreda_first';
  if (lower.includes('jimma')) return 'inst_jimma_district';
  return DEFAULT_INSTITUTION_ID;
}

// ----------------------------------------------------
// LOCAL-FIRST INDEXEDDB METHODS FOR CASE FILES
// ----------------------------------------------------

export async function saveCaseFileOffline(caseFile: CourtCaseFile): Promise<CourtCaseFile> {
  if (isWriteLocked()) {
    throw new Error('SIGN_OUT_WRITE_LOCKED:saveCaseFileOffline');
  }
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const nowStr = new Date().toISOString();

  const recordToSave: CourtCaseFile = {
    ...caseFile,
    institutionId: caseFile.institutionId || getInstitutionIdFromCourtName(caseFile.courtLevel || caseFile.bench),
    updatedAt: nowStr,
    pendingSync: true,
    serverConfirmedAt: undefined,
    serverConfirmedUid: undefined,
  };

  await trackInFlightWrite('court:saveCaseFileOffline', (async () => {
    try {
      const idb = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(STORE_CASE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_CASE_FILES);
        store.put(recordToSave);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });

      if (!isOnline || isWriteLocked()) {
        await queueSyncAction('cases', 'upsert', recordToSave.id, recordToSave, recordToSave.institutionId);
      } else {
        try {
          await pushCaseFileToFirestore(recordToSave);
          await markCaseFileSyncedOffline(recordToSave.id);
          recordToSave.pendingSync = false;
        } catch (err) {
          console.warn('[saveCaseFileOffline] Online push failed, queueing sync:', err);
          await queueSyncAction('cases', 'upsert', recordToSave.id, recordToSave, recordToSave.institutionId);
        }
      }
    } catch (e) {
      console.error('[saveCaseFileOffline] Error saving to IndexedDB:', e);
    }
  })());

  return recordToSave;
}

export async function getCaseFilesOffline(institutionId?: string): Promise<CourtCaseFile[]> {
  try {
    const idb = await openOfflineDB();
    const cases: CourtCaseFile[] = await new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_CASE_FILES, 'readonly');
      const store = tx.objectStore(STORE_CASE_FILES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (institutionId) {
      return cases.filter(c => c.institutionId === institutionId || !c.institutionId);
    }
    return cases;
  } catch (e) {
    console.error('[getCaseFilesOffline] Error reading from IndexedDB:', e);
    return [];
  }
}

export async function deleteCaseFileOffline(docId: string, institutionId: string): Promise<void> {
  if (isWriteLocked()) {
    throw new Error('SIGN_OUT_WRITE_LOCKED:deleteCaseFileOffline');
  }
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  await trackInFlightWrite('court:deleteCaseFileOffline', (async () => {
    try {
      const idb = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(STORE_CASE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_CASE_FILES);
        store.delete(docId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      if (!isOnline || isWriteLocked()) {
        await queueSyncAction('cases', 'delete', docId, null, institutionId);
      } else {
        try {
          await deleteDoc(doc(db, 'cases', docId));
        } catch {
          await queueSyncAction('cases', 'delete', docId, null, institutionId);
        }
      }
    } catch (e) {
      console.error('[deleteCaseFileOffline] Error:', e);
    }
  })());
}

// ----------------------------------------------------
// LOCAL-FIRST INDEXEDDB METHODS FOR TEMPLATES
// ----------------------------------------------------

export async function saveTemplateOffline(template: CourtTemplateFile): Promise<CourtTemplateFile> {
  if (isWriteLocked()) {
    throw new Error('SIGN_OUT_WRITE_LOCKED:saveTemplateOffline');
  }
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const nowStr = new Date().toISOString();

  const recordToSave: CourtTemplateFile = {
    ...template,
    institutionId: template.institutionId || DEFAULT_INSTITUTION_ID,
    lastModified: template.lastModified || nowStr,
    updatedAt: nowStr,
    pendingSync: true,
    serverConfirmedAt: undefined,
    serverConfirmedUid: undefined,
  };

  await trackInFlightWrite('court:saveTemplateOffline', (async () => {
    try {
      const idb = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(STORE_TEMPLATES, 'readwrite');
        const store = tx.objectStore(STORE_TEMPLATES);
        store.put(recordToSave);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      if (!isOnline || isWriteLocked()) {
        await queueSyncAction('court_templates', 'upsert', recordToSave.id, recordToSave, recordToSave.institutionId);
      } else {
        try {
          await pushTemplateToFirestore(recordToSave);
          await markTemplateSyncedOffline(recordToSave.id);
          recordToSave.pendingSync = false;
        } catch (err) {
          console.warn('[saveTemplateOffline] Online push failed, queueing sync:', err);
          await queueSyncAction('court_templates', 'upsert', recordToSave.id, recordToSave, recordToSave.institutionId);
        }
      }
    } catch (e) {
      console.error('[saveTemplateOffline] Error saving to IndexedDB:', e);
    }
  })());

  return recordToSave;
}

export async function getTemplatesOffline(institutionId?: string): Promise<CourtTemplateFile[]> {
  try {
    const idb = await openOfflineDB();
    const tmpls: CourtTemplateFile[] = await new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_TEMPLATES, 'readonly');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (institutionId) {
      return tmpls.filter(t => t.institutionId === institutionId || !t.institutionId);
    }
    return tmpls;
  } catch (e) {
    console.error('[getTemplatesOffline] Error reading from IndexedDB:', e);
    return [];
  }
}

export async function deleteTemplateOffline(docId: string, institutionId: string): Promise<void> {
  if (isWriteLocked()) {
    throw new Error('SIGN_OUT_WRITE_LOCKED:deleteTemplateOffline');
  }
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  await trackInFlightWrite('court:deleteTemplateOffline', (async () => {
    try {
      const idb = await openOfflineDB();
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(STORE_TEMPLATES, 'readwrite');
        const store = tx.objectStore(STORE_TEMPLATES);
        store.delete(docId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      if (!isOnline || isWriteLocked()) {
        await queueSyncAction('court_templates', 'delete', docId, null, institutionId);
      } else {
        try {
          await deleteDoc(doc(db, 'court_templates', docId));
        } catch {
          await queueSyncAction('court_templates', 'delete', docId, null, institutionId);
        }
      }
    } catch (e) {
      console.error('[deleteTemplateOffline] Error:', e);
    }
  })());
}

// ----------------------------------------------------
// SYNC QUEUE & AUTO-PUSH MECHANISM
// ----------------------------------------------------

async function queueSyncAction(
  collectionName: 'cases' | 'court_templates',
  actionType: 'upsert' | 'delete',
  docId: string,
  payload: any,
  institutionId: string
): Promise<void> {
  if (isWriteLocked()) return;
  const syncItem: OfflineSyncItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    collectionName,
    actionType,
    docId,
    payload,
    institutionId,
    timestamp: Date.now(),
  };

  try {
    const idb = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      store.put(syncItem);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[queueSyncAction] Error writing to sync_queue:', e);
  }
}

export async function syncOfflineDataWithFirestore(options?: {
  allowDuringSignOut?: boolean;
}): Promise<{ syncedCount: number; errors: number }> {
  if (isWriteLocked() && !options?.allowDuringSignOut) {
    return { syncedCount: 0, errors: 0 };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedCount: 0, errors: 0 };
  }

  let syncedCount = 0;
  let errors = 0;

  await trackInFlightWrite('court:syncOfflineDataWithFirestore', (async () => {
    try {
      const idb = await openOfflineDB();
      const queueItems: OfflineSyncItem[] = await new Promise((resolve, reject) => {
        const tx = idb.transaction(STORE_SYNC_QUEUE, 'readonly');
        const store = tx.objectStore(STORE_SYNC_QUEUE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      if (queueItems.length === 0) {
        syncStatusService.setSyncing(false, 0);
        return;
      }

      syncStatusService.setSyncing(true, queueItems.length);

      for (const item of queueItems) {
        try {
          if (item.actionType === 'upsert' && item.payload) {
            if (item.collectionName === 'cases') {
              try {
                await pushCaseFileToFirestore(item.payload);
                await markCaseFileSyncedOffline(item.docId);
              } catch (err: any) {
                if (err.message === 'SYNC_CONFLICT') {
                  await addSyncLog({
                    status: 'failed',
                    type: 'conflict_resolution',
                    details: `Conflict detected for case ${item.payload.caseNumber}. Manual resolution required.`,
                    affectedIds: [item.docId],
                    conflictsResolved: false,
                    conflictData: err.conflictData
                  });
                  errors++;
                  continue;
                }
                throw err;
              }
            } else if (item.collectionName === 'court_templates') {
              await pushTemplateToFirestore(item.payload);
              await markTemplateSyncedOffline(item.docId);
            }
          } else if (item.actionType === 'delete') {
            await deleteDoc(doc(db, item.collectionName, item.docId));
          }

          await removeSyncItemFromQueue(item.id);
          syncedCount++;
        } catch (err) {
          console.warn(`[syncOfflineDataWithFirestore] Sync item ${item.id} failed:`, err);
          errors++;
        }
      }

      if (syncedCount > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('court_offline_sync_completed', { detail: { syncedCount } }));
      }
      syncStatusService.setSyncing(false, 0);
    } catch (e) {
      console.error('[syncOfflineDataWithFirestore] Error running sync batch:', e);
      syncStatusService.setError();
      errors++;
    }
  })());

  return { syncedCount, errors };
}

async function markCaseFileSyncedOffline(docId: string): Promise<void> {
  try {
    const idb = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_CASE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_CASE_FILES);
      const req = store.get(docId);
      req.onsuccess = () => {
        if (req.result) {
          const updated = {
            ...req.result,
            pendingSync: false,
            serverConfirmedAt: new Date().toISOString(),
            serverConfirmedUid: auth.currentUser?.uid || undefined,
          };
          store.put(updated);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  } catch {}
}

async function markTemplateSyncedOffline(docId: string): Promise<void> {
  try {
    const idb = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_TEMPLATES, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.get(docId);
      req.onsuccess = () => {
        if (req.result) {
          const updated = {
            ...req.result,
            pendingSync: false,
            serverConfirmedAt: new Date().toISOString(),
            serverConfirmedUid: auth.currentUser?.uid || undefined,
          };
          store.put(updated);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  } catch {}
}

export async function removeSyncItemFromQueue(syncItemId: string): Promise<void> {
  try {
    const idb = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      store.delete(syncItemId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  } catch {}
}

/**
 * Resolves a sync conflict by pushing the chosen version to Firestore and clearing the queue.
 */
export async function resolveCaseConflict(
  caseId: string,
  chosenVersion: CourtCaseFile,
  syncLogId: string
): Promise<void> {
  if (isWriteLocked()) {
    throw new Error('SIGN_OUT_WRITE_LOCKED:resolveCaseConflict');
  }
  const { pendingSync, serverConfirmedAt, serverConfirmedUid, ...payload } = chosenVersion;
  const docRef = doc(db, 'cases', caseId);
  await setDoc(docRef, { ...payload, serverUpdatedAt: serverTimestamp() }, { merge: true });
  const snap = await getDocFromServer(docRef);
  if (!snap.exists() || snap.metadata.hasPendingWrites || snap.metadata.fromCache) {
    throw new Error('SERVER_CONFIRMATION_FAILED: Conflict resolution not yet confirmed on Firestore server.');
  }

  const idb = await openOfflineDB();
  await new Promise<void>((resolve, reject) => {
    const tx = idb.transaction([STORE_CASE_FILES, STORE_SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORE_CASE_FILES);
    store.put({
      ...chosenVersion,
      pendingSync: false,
      serverConfirmedAt: new Date().toISOString(),
      serverConfirmedUid: auth.currentUser?.uid || undefined,
    });
    const syncStore = tx.objectStore(STORE_SYNC_QUEUE);
    const req = syncStore.getAll();
    req.onsuccess = () => {
      const allItems: OfflineSyncItem[] = req.result || [];
      for (const item of allItems) {
        if (item.docId === caseId && item.collectionName === 'cases') {
          syncStore.delete(item.id);
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await addSyncLog({
    status: 'success',
    type: 'conflict_resolution',
    details: `Conflict for case ${chosenVersion.caseNumber} resolved manually and confirmed on server.`,
    affectedIds: [caseId],
    conflictsResolved: true
  });
}

// Direct Firestore Helpers with Server Verification
async function pushCaseFileToFirestore(caseFile: CourtCaseFile): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('AUTH_REQUIRED: Cannot sync court case file without authenticated Firebase user.');
  }
  const { pendingSync, serverConfirmedAt, serverConfirmedUid, ...localPayload } = caseFile;
  const docRef = doc(db, 'cases', caseFile.id);

  // Fetch remote version to check for conflicts
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const remoteData = docSnap.data() as CourtCaseFile;
    const remoteUpdated = remoteData.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;
    const localUpdated = caseFile.updatedAt ? new Date(caseFile.updatedAt).getTime() : 0;

    if (remoteUpdated > localUpdated) {
      const conflictError = new Error('SYNC_CONFLICT');
      (conflictError as any).conflictData = {
        local: caseFile,
        remote: remoteData
      };
      throw conflictError;
    }
  }

  await setDoc(docRef, localPayload, { merge: true });
  const serverSnap = await getDocFromServer(docRef);
  if (!serverSnap.exists() || serverSnap.metadata.hasPendingWrites || serverSnap.metadata.fromCache) {
    throw new Error('SERVER_CONFIRMATION_FAILED: Case write not yet confirmed on Firestore server.');
  }
}

async function pushTemplateToFirestore(template: CourtTemplateFile): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('AUTH_REQUIRED: Cannot sync court template without authenticated Firebase user.');
  }
  const { pendingSync, serverConfirmedAt, serverConfirmedUid, ...cleanPayload } = template;
  const docRef = doc(db, 'court_templates', template.id);
  await setDoc(docRef, cleanPayload, { merge: true });
  const serverSnap = await getDocFromServer(docRef);
  if (!serverSnap.exists() || serverSnap.metadata.hasPendingWrites || serverSnap.metadata.fromCache) {
    throw new Error('SERVER_CONFIRMATION_FAILED: Template write not yet confirmed on Firestore server.');
  }
}

// Automatically trigger sync on reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (isWriteLocked()) return;
    syncOfflineDataWithFirestore().catch(() => {});
  });
}
