import {
  SavedLegalDocument,
  getSavedDocuments,
  updateDocument,
  getCurrentUserKey,
  getCurrentUserEmail,
  getUserScopedKey,
} from './storage';
import {
  getOfflineDocumentsFromDB,
  saveOfflineDocumentToDB,
  QueuedDocumentEdit,
  addQueuedEditToDB,
  getQueuedEditsFromDB,
  removeQueuedEditFromDB,
} from './indexedDb';
import { syncStatusService } from './syncStatusService';
import { addSyncLog } from './syncLogService';
import { saveDocumentToFirestoreVerified } from './firestoreDraftService';
import { auth } from './firebase';
import { isWriteLocked, trackInFlightWrite } from './signOutSafetyService';

type SyncCallback = (docs: SavedLegalDocument[]) => void;
type QueueCallback = (queue: QueuedDocumentEdit[]) => void;

import {
  STORAGE_LAST_SYNC_KEY,
  STORAGE_QUEUE_KEY,
  OFFLINE_MODE_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
  getLastSyncTime as getGlobalLastSyncTime,
  setLastSyncTime as setGlobalLastSyncTime,
  getStoredOfflineMode,
} from './syncUtils';

class DocumentSyncManager {
  private subscribers: Set<SyncCallback> = new Set();
  private queueSubscribers: Set<QueueCallback> = new Set();
  private timerId: any = null;
  private isChecking = false;
  private isSyncingEdits = false;
  private paused = false;
  private activeSyncPromise: Promise<any> | null = null;
  private activeQueueSyncPromise: Promise<any> | null = null;
  private lastDocumentHash = '';
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('seera_ai_idb_sync');
          this.channel.onmessage = (event) => {
            if (this.paused || isWriteLocked()) return;
            if (event.data?.type === 'DOCUMENTS_UPDATED') {
              this.syncNow();
            } else if (event.data?.type === 'SYNC_QUEUED_EDITS') {
              this.syncQueuedEdits();
            }
          };
        }
      } catch (e) {
        console.warn('BroadcastChannel not available, using periodic sync only', e);
      }

      // Sync on window focus and online restore (only when not paused / not in manual offline mode)
      window.addEventListener('focus', () => {
        if (this.paused || isWriteLocked() || getStoredOfflineMode()) return;
        this.syncNow();
        this.syncQueuedEdits();
      });

      window.addEventListener('online', () => {
        if (this.paused || isWriteLocked() || getStoredOfflineMode()) return;
        this.syncQueuedEdits();
        this.syncNow();
      });

      window.addEventListener('seera_offline_mode_changed', (e: Event) => {
        const custom = e as CustomEvent<{ offlineModeEnabled?: boolean }>;
        const offlineEnabled =
          typeof custom.detail?.offlineModeEnabled === 'boolean'
            ? custom.detail.offlineModeEnabled
            : getStoredOfflineMode();
        if (offlineEnabled || this.paused || isWriteLocked()) {
          this.stop();
        } else {
          this.start(3500);
        }
      });

      window.addEventListener('seera_storage_changed', () => {
        if (this.paused || isWriteLocked()) return;
        this.notifyChanged();
      });

      window.addEventListener('seera_privacy_cleared', () => {
        this.lastDocumentHash = '';
        this.subscribers.forEach((cb) => {
          try {
            cb([]);
          } catch {}
        });
        this.queueSubscribers.forEach((cb) => {
          try {
            cb([]);
          } catch {}
        });
      });

      // Service worker message listener (from Background Sync event in sw.js)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (
            event.data?.type === 'SEERA_SYNC_QUEUED_DOCUMENT_EDITS' &&
            !this.paused &&
            !isWriteLocked() &&
            !getStoredOfflineMode()
          ) {
            this.syncQueuedEdits();
          }
        });
      }

      window.addEventListener('storage', (e) => {
        if (this.paused || isWriteLocked()) return;
        if (e.key === 'seera_ai_saved_documents' || e.key?.startsWith('seera_ai_saved_documents_')) {
          this.syncNow();
        } else if (e.key === STORAGE_QUEUE_KEY) {
          this.notifyQueueSubscribers();
        } else if (e.key === OFFLINE_MODE_STORAGE_KEY || e.key === USER_SETTINGS_STORAGE_KEY) {
          if (getStoredOfflineMode()) {
            this.stop();
          } else {
            this.start(3500);
          }
        }
      });
    }
  }

  public start(intervalMs: number = 3000): void {
    if (this.paused || isWriteLocked() || getStoredOfflineMode()) return;
    if (this.timerId) return;
    this.syncNow();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.syncQueuedEdits();
    }
    this.timerId = setInterval(() => {
      if (this.paused || isWriteLocked() || getStoredOfflineMode()) {
        this.stop();
        return;
      }
      this.syncNow();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.syncQueuedEdits();
      }
    }, intervalMs);
  }

  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public pause(): void {
    this.paused = true;
    this.stop();
  }

  public resume(): void {
    this.paused = false;
    if (!isWriteLocked() && !getStoredOfflineMode()) {
      this.start(3500);
    }
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public isActive(): boolean {
    return this.timerId !== null && !this.paused;
  }

  public async drainActiveSync(timeoutMs: number = 2500): Promise<boolean> {
    const active: Promise<any>[] = [];
    if (this.activeSyncPromise) active.push(this.activeSyncPromise);
    if (this.activeQueueSyncPromise) active.push(this.activeQueueSyncPromise);
    if (active.length === 0) return true;

    let done = false;
    await Promise.race([
      Promise.allSettled(active).then(() => {
        done = true;
      }),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
    return done;
  }

  public subscribe(callback: SyncCallback): () => void {
    this.subscribers.add(callback);
    const current = getSavedDocuments();
    callback(current);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  public subscribeQueue(callback: QueueCallback): () => void {
    this.queueSubscribers.add(callback);
    this.getQueuedEdits().then((queue) => callback(queue));

    return () => {
      this.queueSubscribers.delete(callback);
    };
  }

  private async notifyQueueSubscribers(): Promise<void> {
    const queue = await this.getQueuedEdits();
    this.queueSubscribers.forEach((cb) => {
      try {
        cb(queue);
      } catch (err) {
        console.error('Error in queue subscriber:', err);
      }
    });
  }

  public getLastSyncTime(): string | null {
    return getGlobalLastSyncTime();
  }

  public setLastSyncTime(isoString?: string): void {
    setGlobalLastSyncTime(isoString);
  }

  public async triggerManualSync(): Promise<{
    success: boolean;
    syncedDocsCount: number;
    syncedEditsCount: number;
    remainingPendingCount: number;
    timestamp: string;
  }> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    try {
      const editResult = await this.syncQueuedEdits();
      const syncedDocs = await this.syncNow();

      if (editResult.remainingPendingCount === 0) {
        this.setLastSyncTime(timestamp);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('seera_sync_status_updated', {
            detail: {
              timestamp,
              syncedDocsCount: syncedDocs.length,
              syncedEditsCount: editResult.syncedCount,
              remainingPendingCount: editResult.remainingPendingCount,
              success: editResult.remainingPendingCount === 0,
            },
          })
        );
      }

      const endTime = performance.now();
      await addSyncLog({
        status: editResult.remainingPendingCount === 0 ? 'success' : 'partial',
        type: 'full',
        details: `Manual sync run: ${editResult.syncedCount} cloud-confirmed edits, ${editResult.remainingPendingCount} remaining pending.`,
        affectedIds: syncedDocs.map(d => d.id),
        conflictsResolved: editResult.remainingPendingCount === 0,
        latency: Math.round(endTime - startTime)
      });

      return {
        success: editResult.remainingPendingCount === 0,
        syncedDocsCount: syncedDocs.length,
        syncedEditsCount: editResult.syncedCount,
        remainingPendingCount: editResult.remainingPendingCount,
        timestamp,
      };
    } catch (err) {
      const endTime = performance.now();
      console.error('Manual re-sync failed:', err);

      await addSyncLog({
        status: 'failed',
        type: 'full',
        details: `Manual sync failed: ${err instanceof Error ? err.message : String(err)}`,
        affectedIds: [],
        conflictsResolved: false,
        errorMessage: err instanceof Error ? err.message : String(err),
        latency: Math.round(endTime - startTime)
      });

      const pending = await this.getQueuedEdits();
      return {
        success: false,
        syncedDocsCount: getSavedDocuments().length,
        syncedEditsCount: 0,
        remainingPendingCount: pending.length,
        timestamp,
      };
    }
  }

  public notifyChanged(): void {
    if (this.paused || isWriteLocked()) return;
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'DOCUMENTS_UPDATED' });
      } catch {}
    }
    this.syncNow();
  }

  public async queueDocumentEdit(
    docId: string,
    changes: Partial<SavedLegalDocument>,
    originalTitle?: string
  ): Promise<QueuedDocumentEdit> {
    if (isWriteLocked()) {
      throw new Error('SIGN_OUT_WRITE_LOCKED:queueDocumentEdit');
    }

    const queuedEdit: QueuedDocumentEdit = {
      id: `edit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      docId,
      title: changes.title,
      content: changes.content,
      folderId: changes.folderId,
      tags: changes.tags,
      isBookmarked: changes.isBookmarked,
      timestamp: Date.now(),
      status: 'pending',
      originalDocTitle: originalTitle || changes.title,
    };

    await trackInFlightWrite('queue:addQueuedEdit', (async () => {
      await addQueuedEditToDB(queuedEdit);

      try {
        const rawQueue = localStorage.getItem(STORAGE_QUEUE_KEY);
        const queueList: QueuedDocumentEdit[] = rawQueue ? JSON.parse(rawQueue) : [];
        queueList.push(queuedEdit);
        localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queueList));
      } catch (e) {
        console.warn('LocalStorage queue update failed', e);
      }

      // Optimistic local update (automatically invalidates prior serverConfirmedAt)
      updateDocument(docId, changes);
    })());

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg: any = await navigator.serviceWorker.ready;
        if (reg?.sync) {
          await reg.sync.register('sync-queued-document-edits');
        }
      } catch {}
    }

    this.notifyQueueSubscribers();
    this.notifyChanged();

    if (typeof navigator !== 'undefined' && navigator.onLine && !getStoredOfflineMode() && !this.paused && !isWriteLocked()) {
      this.syncQueuedEdits();
    }

    return queuedEdit;
  }

  public async getQueuedEdits(): Promise<QueuedDocumentEdit[]> {
    try {
      const idbQueue = await getQueuedEditsFromDB();
      const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
      const lsQueue: QueuedDocumentEdit[] = raw ? JSON.parse(raw) : [];
      const mergedMap = new Map<string, QueuedDocumentEdit>();
      for (const item of idbQueue || []) {
        if (item?.id) mergedMap.set(item.id, item);
      }
      for (const item of lsQueue || []) {
        if (item?.id && !mergedMap.has(item.id)) mergedMap.set(item.id, item);
      }
      return Array.from(mergedMap.values());
    } catch {
      try {
        const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  }

  /**
   * Synchronize queued document edits to Firestore ('user_documents/{docId}') with server verification.
   * NEVER deletes queued edits unless the Firestore server write is explicitly verified via getDocFromServer.
   */
  public async syncQueuedEdits(options?: { allowDuringSignOut?: boolean }): Promise<{
    syncedCount: number;
    remainingPendingCount: number;
    confirmedIds: string[];
    errors: string[];
  }> {
    if (this.isSyncingEdits) {
      const pending = await this.getQueuedEdits();
      return { syncedCount: 0, remainingPendingCount: pending.length, confirmedIds: [], errors: [] };
    }
    if ((this.paused || isWriteLocked()) && !options?.allowDuringSignOut) {
      const pending = await this.getQueuedEdits();
      return { syncedCount: 0, remainingPendingCount: pending.length, confirmedIds: [], errors: [] };
    }
    if (getStoredOfflineMode() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      const pending = await this.getQueuedEdits();
      syncStatusService.setSyncing(false, pending.length);
      return { syncedCount: 0, remainingPendingCount: pending.length, confirmedIds: [], errors: ['OFFLINE'] };
    }

    const runPromise = (async () => {
      this.isSyncingEdits = true;
      const startTime = performance.now();
      const confirmedIds: string[] = [];
      const errors: string[] = [];

      try {
        const edits = await this.getQueuedEdits();
        if (!edits || edits.length === 0) {
          syncStatusService.setSyncing(false, 0);
          return { syncedCount: 0, remainingPendingCount: 0, confirmedIds: [], errors: [] };
        }

        if (!auth.currentUser?.uid) {
          syncStatusService.setSyncing(false, edits.length);
          return {
            syncedCount: 0,
            remainingPendingCount: edits.length,
            confirmedIds: [],
            errors: ['AUTH_REQUIRED: Firebase Auth session is required to confirm cloud sync.'],
          };
        }

        syncStatusService.setSyncing(true, edits.length);
        let syncedCount = 0;
        const remainingQueue: QueuedDocumentEdit[] = [];

        for (const item of edits) {
          const localDocs = getSavedDocuments();
          const targetDoc = localDocs.find((d) => d.id === item.docId);

          const mergedPayload: Partial<SavedLegalDocument> = targetDoc
            ? {
                ...targetDoc,
                title: item.title !== undefined ? item.title : targetDoc.title,
                content: item.content !== undefined ? item.content : targetDoc.content,
                folderId: item.folderId !== undefined ? item.folderId : targetDoc.folderId,
                tags: item.tags !== undefined ? item.tags : targetDoc.tags,
                isBookmarked: item.isBookmarked !== undefined ? item.isBookmarked : targetDoc.isBookmarked,
              }
            : {
                id: item.docId,
                title: item.title || item.originalDocTitle || 'Untitled Document',
                content: item.content || '',
                folderId: item.folderId,
                tags: item.tags || [],
                isBookmarked: item.isBookmarked,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email || undefined,
              };

          const verifyRes = await saveDocumentToFirestoreVerified(item.docId, {
            id: item.docId,
            title: mergedPayload.title,
            content: mergedPayload.content,
            taskType: mergedPayload.taskType,
            userId: auth.currentUser.uid,
            userEmail: auth.currentUser.email || mergedPayload.userEmail,
            metadata: {
              folderId: mergedPayload.folderId ?? null,
              tags: mergedPayload.tags ?? [],
              isBookmarked: mergedPayload.isBookmarked ?? false,
            },
          });

          if (verifyRes.confirmed) {
            // Update local record with verified server ack metadata before removing from queue
            if (targetDoc) {
              updateDocument(
                item.docId,
                {
                  ...mergedPayload,
                  serverConfirmedAt: verifyRes.serverConfirmedAt,
                  serverConfirmedUid: auth.currentUser.uid,
                  serverSyncNonce: verifyRes.serverSyncNonce,
                },
                { allowDuringSignOut: options?.allowDuringSignOut }
              );
            }
            await removeQueuedEditFromDB(item.id, { allowDuringSignOut: options?.allowDuringSignOut });
            syncedCount++;
            confirmedIds.push(item.docId);
          } else {
            const errText = verifyRes.error || 'Firestore verification failed';
            errors.push(`${item.docId}: ${errText}`);
            remainingQueue.push({
              ...item,
              status: 'failed',
              lastError: errText,
            });
          }
        }

        // Update localStorage queue ONLY with remaining unverified/failed items
        try {
          if (remainingQueue.length === 0) {
            localStorage.removeItem(STORAGE_QUEUE_KEY);
          } else {
            localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(remainingQueue));
          }
        } catch {}

        if (syncedCount > 0 && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
          try {
            navigator.serviceWorker.controller.postMessage({
              type: 'NOTIFY_EDITS_SYNCED',
              count: syncedCount,
            });
          } catch {}
        }

        if (syncedCount > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('seera_queued_edits_synced', {
              detail: { count: syncedCount, confirmedIds },
            })
          );
        }

        this.notifyQueueSubscribers();
        if (!options?.allowDuringSignOut) {
          this.syncNow();
        }
        syncStatusService.setSyncing(false, remainingQueue.length);

        const endTime = performance.now();
        if (syncedCount > 0 || errors.length > 0) {
          await addSyncLog({
            status: errors.length === 0 ? 'success' : syncedCount > 0 ? 'partial' : 'failed',
            type: 'upload',
            details: `Cloud sync verified ${syncedCount} edit(s) in Firestore; ${remainingQueue.length} remain pending.`,
            affectedIds: confirmedIds,
            conflictsResolved: errors.length === 0,
            errorMessage: errors.length > 0 ? errors[0] : undefined,
            latency: Math.round(endTime - startTime)
          });
        }

        return {
          syncedCount,
          remainingPendingCount: remainingQueue.length,
          confirmedIds,
          errors,
        };
      } catch (e: any) {
        const endTime = performance.now();
        console.error('Failed to sync queued document edits:', e);
        syncStatusService.setError();

        await addSyncLog({
          status: 'failed',
          type: 'upload',
          details: `Failed to sync queued edits: ${e instanceof Error ? e.message : String(e)}`,
          affectedIds: [],
          conflictsResolved: false,
          errorMessage: e instanceof Error ? e.message : String(e),
          latency: Math.round(endTime - startTime)
        });

        const pending = await this.getQueuedEdits();
        return {
          syncedCount: 0,
          remainingPendingCount: pending.length,
          confirmedIds: [],
          errors: [e?.message || String(e)],
        };
      } finally {
        this.isSyncingEdits = false;
        this.activeQueueSyncPromise = null;
      }
    })();

    this.activeQueueSyncPromise = runPromise;
    return trackInFlightWrite('sync:syncQueuedEdits', runPromise);
  }

  /**
   * User-scoped reconciliation between IndexedDB and current user's localStorage key.
   */
  public async syncNow(options?: { allowDuringSignOut?: boolean }): Promise<SavedLegalDocument[]> {
    if (this.isChecking) return getSavedDocuments();
    if ((this.paused || isWriteLocked()) && !options?.allowDuringSignOut) {
      return getSavedDocuments();
    }

    const runPromise = (async () => {
      this.isChecking = true;
      const startTime = performance.now();

      try {
        const currentUserKey = getCurrentUserKey();
        const currentUserEmail = getCurrentUserEmail()?.toLowerCase();
        const allIdbDocs = await getOfflineDocumentsFromDB();

        // Strictly scope IDB docs to the active user so another user's records never cross into this session
        const idbDocs = allIdbDocs.filter((d) => {
          const matchesId = d.userId && d.userId === currentUserKey;
          const matchesEmail = currentUserEmail && d.userEmail && d.userEmail.toLowerCase() === currentUserEmail;
          return Boolean(matchesId || matchesEmail);
        });

        const localDocs = getSavedDocuments();
        const mergedMap = new Map<string, SavedLegalDocument>();

        for (const d of localDocs) {
          mergedMap.set(d.id, d);
        }

        let hasNewFromIdb = false;
        for (const d of idbDocs) {
          if (!mergedMap.has(d.id)) {
            mergedMap.set(d.id, d);
            hasNewFromIdb = true;
          } else {
            const existing = mergedMap.get(d.id)!;
            const dTime = new Date(d.updatedAt || d.createdAt).getTime();
            const eTime = new Date(existing.updatedAt || existing.createdAt).getTime();
            if (dTime > eTime) {
              mergedMap.set(d.id, d);
              hasNewFromIdb = true;
            }
          }
        }

        for (const d of localDocs) {
          if (!idbDocs.some((idb) => idb.id === d.id)) {
            await saveOfflineDocumentToDB(d, { allowDuringSignOut: options?.allowDuringSignOut });
          }
        }

        const mergedDocs = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const currentHash = mergedDocs.map((d) => `${d.id}_${d.updatedAt || d.createdAt}`).join('|');

        if (currentHash !== this.lastDocumentHash || hasNewFromIdb) {
          this.lastDocumentHash = currentHash;

          if (hasNewFromIdb && !isWriteLocked()) {
            try {
              localStorage.setItem(getUserScopedKey('seera_ai_saved_documents'), JSON.stringify(mergedDocs));
            } catch (e) {
              console.error('Failed to sync merged docs to user-scoped localStorage', e);
            }
          }

          this.subscribers.forEach((cb) => {
            try {
              cb(mergedDocs);
            } catch (err) {
              console.error('Error in document sync subscriber:', err);
            }
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('seera_documents_synced', {
                detail: { documents: mergedDocs },
              })
            );
          }

          const endTime = performance.now();
          await addSyncLog({
            status: 'success',
            type: 'download',
            details: `Reconciled ${mergedDocs.length} user-scoped local documents.`,
            affectedIds: mergedDocs.map(d => d.id),
            conflictsResolved: true,
            latency: Math.round(endTime - startTime)
          });
        }

        if (!this.getLastSyncTime()) {
          this.setLastSyncTime();
        }

        return mergedDocs;
      } catch (e) {
        console.error('Background document sync check failed:', e);
        return getSavedDocuments();
      } finally {
        this.isChecking = false;
        this.activeSyncPromise = null;
      }
    })();

    this.activeSyncPromise = runPromise;
    return runPromise;
  }
}

export const backgroundSyncManager = new DocumentSyncManager();

// Automatically start background sync in browser environment if not disabled in settings
if (typeof window !== 'undefined') {
  if (!getStoredOfflineMode() && !isWriteLocked()) {
    backgroundSyncManager.start(3500);
  }
}
