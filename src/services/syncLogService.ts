import { openOfflineDB, STORE_SYNC_LOGS, SyncLogEntry } from './indexedDb';

export type { SyncLogEntry };

export async function addSyncLog(log: Omit<SyncLogEntry, 'id' | 'timestamp'>): Promise<SyncLogEntry> {
  const entry: SyncLogEntry = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_SYNC_LOGS, 'readwrite');
      const store = transaction.objectStore(STORE_SYNC_LOGS);
      const request = store.add(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB addSyncLog error:', e);
  }

  return entry;
}

export async function getSyncLogs(): Promise<SyncLogEntry[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SYNC_LOGS, 'readonly');
      const store = transaction.objectStore(STORE_SYNC_LOGS);
      const request = store.getAll();
      request.onsuccess = () => {
        const logs = (request.result || []) as SyncLogEntry[];
        logs.sort((a, b) => b.timestamp - a.timestamp);
        resolve(logs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB getSyncLogs error:', e);
    return [];
  }
}

export async function clearSyncLogs(): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SYNC_LOGS, 'readwrite');
      const store = transaction.objectStore(STORE_SYNC_LOGS);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB clearSyncLogs error:', e);
  }
}
export async function deleteSyncLog(id: string): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SYNC_LOGS, 'readwrite');
      const store = transaction.objectStore(STORE_SYNC_LOGS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB deleteSyncLog error:', e);
  }
}
