import { SavedLegalDocument, getSavedDocuments, updateDocument } from './storage';
import {
  getOfflineDocumentsFromDB,
  saveOfflineDocumentToDB,
  QueuedDocumentEdit,
  addQueuedEditToDB,
  getQueuedEditsFromDB,
  removeQueuedEditFromDB,
  clearQueuedEditsFromDB,
} from './indexedDb';

type SyncCallback = (docs: SavedLegalDocument[]) => void;
type QueueCallback = (queue: QueuedDocumentEdit[]) => void;

const STORAGE_QUEUE_KEY = 'seera_ai_queued_edits';
export const STORAGE_LAST_SYNC_KEY = 'seera_ai_last_sync_timestamp';

class DocumentSyncManager {
  private subscribers: Set<SyncCallback> = new Set();
  private queueSubscribers: Set<QueueCallback> = new Set();
  private timerId: any = null;
  private isChecking = false;
  private isSyncingEdits = false;
  private lastDocumentHash = '';
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('seera_ai_idb_sync');
          this.channel.onmessage = (event) => {
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

      // Sync on window focus and online restore
      window.addEventListener('focus', () => {
        this.syncNow();
        this.syncQueuedEdits();
      });

      window.addEventListener('online', () => {
        this.syncQueuedEdits();
        this.syncNow();
      });

      // Service worker message listener (from Background Sync event in sw.js)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SEERA_SYNC_QUEUED_DOCUMENT_EDITS') {
            this.syncQueuedEdits();
          }
        });
      }

      window.addEventListener('storage', (e) => {
        if (e.key === 'seera_ai_saved_documents') {
          this.syncNow();
        } else if (e.key === STORAGE_QUEUE_KEY) {
          this.notifyQueueSubscribers();
        }
      });
    }
  }

  /**
   * Start periodic background polling for new IndexedDB items & queued edits
   */
  public start(intervalMs: number = 3000): void {
    if (this.timerId) return;
    this.syncNow();
    this.syncQueuedEdits();
    this.timerId = setInterval(() => {
      this.syncNow();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.syncQueuedEdits();
      }
    }, intervalMs);
  }

  /**
   * Stop periodic background sync
   */
  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Check if periodic background sync is currently active
   */
  public isActive(): boolean {
    return this.timerId !== null;
  }

  /**
   * Register a subscriber callback to receive silently synced document list updates
   */
  public subscribe(callback: SyncCallback): () => void {
    this.subscribers.add(callback);
    // Provide current state immediately
    const current = getSavedDocuments();
    callback(current);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Register a subscriber callback for offline queued edits updates
   */
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

  /**
   * Get the last recorded sync time ISO string
   */
  public getLastSyncTime(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_LAST_SYNC_KEY);
  }

  /**
   * Set or update the last recorded sync time
   */
  public setLastSyncTime(isoString?: string): void {
    if (typeof window === 'undefined') return;
    const time = isoString || new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_LAST_SYNC_KEY, time);
    } catch {}
  }

  /**
   * Manually trigger a full re-sync when online.
   * Reconciles queued edits, syncs local storage with IndexedDB,
   * updates the last sync timestamp, and notifies all subscribers.
   */
  public async triggerManualSync(): Promise<{
    success: boolean;
    syncedDocsCount: number;
    syncedEditsCount: number;
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();
    try {
      // 1. Sync any pending offline queued edits first
      const editResult = await this.syncQueuedEdits();

      // 2. Full reconciliation between local storage & IndexedDB
      const syncedDocs = await this.syncNow();

      // 3. Update last sync timestamp
      this.setLastSyncTime(timestamp);

      // 4. Dispatch status event for UI indicators
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('seera_sync_status_updated', {
            detail: {
              timestamp,
              syncedDocsCount: syncedDocs.length,
              syncedEditsCount: editResult.syncedCount,
              success: true,
            },
          })
        );
      }

      return {
        success: true,
        syncedDocsCount: syncedDocs.length,
        syncedEditsCount: editResult.syncedCount,
        timestamp,
      };
    } catch (err) {
      console.error('Manual re-sync failed:', err);
      return {
        success: false,
        syncedDocsCount: getSavedDocuments().length,
        syncedEditsCount: 0,
        timestamp,
      };
    }
  }

  /**
   * Explicitly notify sync manager that a document was written or deleted
   */
  public notifyChanged(): void {
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'DOCUMENTS_UPDATED' });
      } catch {
        // ignore
      }
    }
    this.syncNow();
  }

  /**
   * Queue a document edit while offline or during intermittent connection.
   * Performs an immediate optimistic update in local storage so the user sees the edits,
   * stores the edit in the persistent queue (IndexedDB + localStorage), and registers
   * Service Worker Background Sync so it automatically reconciles when online.
   */
  public async queueDocumentEdit(
    docId: string,
    changes: Partial<SavedLegalDocument>,
    originalTitle?: string
  ): Promise<QueuedDocumentEdit> {
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

    // 1. Save to IndexedDB
    await addQueuedEditToDB(queuedEdit);

    // 2. Save to localStorage queue fallback
    try {
      const rawQueue = localStorage.getItem(STORAGE_QUEUE_KEY);
      const queueList: QueuedDocumentEdit[] = rawQueue ? JSON.parse(rawQueue) : [];
      queueList.push(queuedEdit);
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queueList));
    } catch (e) {
      console.warn('LocalStorage queue update failed', e);
    }

    // 3. Optimistic local update so user immediately sees their changes in My Content
    updateDocument(docId, changes);

    // 4. Try to register Background Sync with Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg: any = await navigator.serviceWorker.ready;
        if (reg?.sync) {
          await reg.sync.register('sync-queued-document-edits');
        }
      } catch (err) {
        console.warn('ServiceWorker sync registration not available:', err);
      }
    }

    // 5. Notify listeners
    this.notifyQueueSubscribers();
    this.notifyChanged();

    // 6. If currently online, attempt immediate sync
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.syncQueuedEdits();
    }

    return queuedEdit;
  }

  /**
   * Get all currently pending queued document edits
   */
  public async getQueuedEdits(): Promise<QueuedDocumentEdit[]> {
    try {
      const idbQueue = await getQueuedEditsFromDB();
      if (idbQueue && idbQueue.length > 0) return idbQueue;

      const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
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
   * Synchronize all queued document edits into local storage and IndexedDB
   */
  public async syncQueuedEdits(): Promise<{ syncedCount: number }> {
    if (this.isSyncingEdits) return { syncedCount: 0 };
    this.isSyncingEdits = true;

    try {
      const edits = await this.getQueuedEdits();
      if (!edits || edits.length === 0) {
        return { syncedCount: 0 };
      }

      let syncedCount = 0;
      for (const item of edits) {
        // Find existing doc and merge edits
        const localDocs = getSavedDocuments();
        const targetDoc = localDocs.find((d) => d.id === item.docId);

        if (targetDoc) {
          const updatedDoc: SavedLegalDocument = {
            ...targetDoc,
            title: item.title !== undefined ? item.title : targetDoc.title,
            content: item.content !== undefined ? item.content : targetDoc.content,
            folderId: item.folderId !== undefined ? item.folderId : targetDoc.folderId,
            tags: item.tags !== undefined ? item.tags : targetDoc.tags,
            isBookmarked: item.isBookmarked !== undefined ? item.isBookmarked : targetDoc.isBookmarked,
          };

          // Save to localStorage & IndexedDB
          updateDocument(item.docId, updatedDoc);
          await saveOfflineDocumentToDB(updatedDoc);
          syncedCount++;
        }

        // Remove from IDB queue
        await removeQueuedEditFromDB(item.id);
      }

      // Clear localStorage queue
      try {
        localStorage.removeItem(STORAGE_QUEUE_KEY);
      } catch {}

      // Notify Service Worker to trigger notification if registered
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'NOTIFY_EDITS_SYNCED',
            count: syncedCount,
          });
        } catch {}
      }

      // Broadcast and emit event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('seera_queued_edits_synced', {
            detail: { count: syncedCount },
          })
        );
      }

      this.notifyQueueSubscribers();
      this.syncNow();

      return { syncedCount };
    } catch (e) {
      console.error('Failed to sync queued document edits:', e);
      return { syncedCount: 0 };
    } finally {
      this.isSyncingEdits = false;
    }
  }

  /**
   * Core synchronization routine: compares IndexedDB with local storage and reconciles differences
   */
  public async syncNow(): Promise<SavedLegalDocument[]> {
    if (this.isChecking) return getSavedDocuments();
    this.isChecking = true;

    try {
      // 1. Fetch from IndexedDB
      const idbDocs = await getOfflineDocumentsFromDB();
      // 2. Fetch from localStorage
      const localDocs = getSavedDocuments();

      // 3. Merge & deduplicate by ID, prioritizing newer createdAt
      const mergedMap = new Map<string, SavedLegalDocument>();

      // Index local docs
      for (const d of localDocs) {
        mergedMap.set(d.id, d);
      }

      let hasNewFromIdb = false;
      // Index and compare with IDB
      for (const d of idbDocs) {
        if (!mergedMap.has(d.id)) {
          mergedMap.set(d.id, d);
          hasNewFromIdb = true;
        } else {
          // Compare dates if both exist
          const existing = mergedMap.get(d.id)!;
          if (new Date(d.createdAt) > new Date(existing.createdAt)) {
            mergedMap.set(d.id, d);
            hasNewFromIdb = true;
          }
        }
      }

      // Check if any local docs need to be pushed back to IDB
      for (const d of localDocs) {
        if (!idbDocs.some((idb) => idb.id === d.id)) {
          await saveOfflineDocumentToDB(d);
        }
      }

      const mergedDocs = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Generate a fast content-signature hash
      const currentHash = mergedDocs.map((d) => `${d.id}_${d.createdAt}`).join('|');

      if (currentHash !== this.lastDocumentHash || hasNewFromIdb) {
        this.lastDocumentHash = currentHash;

        // Update localStorage if IDB provided new entries
        if (hasNewFromIdb) {
          try {
            localStorage.setItem('seera_ai_saved_documents', JSON.stringify(mergedDocs));
          } catch (e) {
            console.error('Failed to sync merged docs to localStorage', e);
          }
        }

        // Notify all subscribers silently without requiring a page refresh
        this.subscribers.forEach((cb) => {
          try {
            cb(mergedDocs);
          } catch (err) {
            console.error('Error in document sync subscriber:', err);
          }
        });

        // Dispatch a global DOM event for other listeners
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('seera_documents_synced', {
              detail: { documents: mergedDocs },
            })
          );
        }
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
    }
  }
}

export const backgroundSyncManager = new DocumentSyncManager();

// Automatically start background sync in browser environment if not disabled in settings
if (typeof window !== 'undefined') {
  const settingsRaw = localStorage.getItem('seera_ai_user_settings');
  let isOffline = false;
  try {
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      isOffline = !!settings.offlineModeEnabled;
    }
  } catch {}
  
  if (!isOffline) {
    backgroundSyncManager.start(3500);
  }
}
