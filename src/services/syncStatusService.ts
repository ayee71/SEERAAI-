import {
  getLastSyncTime,
  setLastSyncTime,
  getStoredOfflineMode,
  OFFLINE_MODE_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
} from './syncUtils';
import { db } from './firebase';
import { onSnapshotsInSync } from 'firebase/firestore';

export type CloudSyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: CloudSyncStatus;
  lastSyncTime: string | null;
  pendingItemsCount: number;
  isFirestoreConnected: boolean;
  isManualOffline: boolean;
  isNetworkOnline: boolean;
  isEffectiveOffline: boolean;
}

type SyncSubscriber = (state: SyncState) => void;

class SyncStatusService {
  private status: CloudSyncStatus = 'synced';
  private lastSyncTime: string | null = getLastSyncTime();
  private pendingItemsCount: number = 0;
  private isManualOffline: boolean = getStoredOfflineMode();
  private isNetworkOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isFirestoreConnected: boolean = !this.isManualOffline && this.isNetworkOnline;
  private subscribers: Set<SyncSubscriber> = new Set();

  constructor() {
    if (this.isManualOffline || !this.isNetworkOnline) {
      this.status = 'offline';
      this.isFirestoreConnected = false;
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isNetworkOnline = true;
        this.updateStatus();
      });
      window.addEventListener('offline', () => {
        this.isNetworkOnline = false;
        this.updateStatus();
      });

      window.addEventListener('seera_offline_mode_changed', (e: Event) => {
        const custom = e as CustomEvent<{ offlineModeEnabled?: boolean }>;
        if (typeof custom.detail?.offlineModeEnabled === 'boolean') {
          this.setManualOffline(custom.detail.offlineModeEnabled);
        } else {
          this.setManualOffline(getStoredOfflineMode());
        }
      });

      window.addEventListener('storage', (e) => {
        if (e.key === OFFLINE_MODE_STORAGE_KEY || e.key === USER_SETTINGS_STORAGE_KEY) {
          this.setManualOffline(getStoredOfflineMode());
        }
      });

      // Firebase Snapshots in Sync listener
      try {
        onSnapshotsInSync(db, () => {
          if (this.isManualOffline || !this.isNetworkOnline) {
            this.isFirestoreConnected = false;
            this.status = 'offline';
            this.notify();
            return;
          }
          if (this.status === 'syncing' && this.pendingItemsCount === 0) {
            this.setSyncing(false);
          }
          this.isFirestoreConnected = true;
          this.notify();
        });
      } catch (err) {
        console.warn('Firestore connectivity listener setup failed:', err);
      }
    }
  }

  public subscribe(callback: SyncSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.getState());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getState(): SyncState {
    const isEffectiveOffline = this.isManualOffline || !this.isNetworkOnline;
    return {
      status: isEffectiveOffline ? 'offline' : this.status,
      lastSyncTime: this.lastSyncTime,
      pendingItemsCount: this.pendingItemsCount,
      isFirestoreConnected: isEffectiveOffline ? false : this.isFirestoreConnected,
      isManualOffline: this.isManualOffline,
      isNetworkOnline: this.isNetworkOnline,
      isEffectiveOffline,
    };
  }

  public setManualOffline(enabled: boolean): void {
    this.isManualOffline = enabled;
    this.isNetworkOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (enabled || !this.isNetworkOnline) {
      this.status = 'offline';
      this.isFirestoreConnected = false;
    } else {
      this.status = 'synced';
      this.isFirestoreConnected = true;
    }
    this.notify();
  }

  public setSyncing(isSyncing: boolean, pendingCount: number = 0): void {
    this.isNetworkOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const isEffectiveOffline = this.isManualOffline || !this.isNetworkOnline;

    if (isEffectiveOffline) {
      this.status = 'offline';
      this.isFirestoreConnected = false;
      this.pendingItemsCount = pendingCount;
      this.notify();
      return;
    }

    if (isSyncing) {
      this.status = 'syncing';
    } else {
      this.status = 'synced';
      const timestamp = new Date().toISOString();
      this.lastSyncTime = timestamp;
      setLastSyncTime(timestamp);
    }
    this.pendingItemsCount = pendingCount;
    this.notify();
  }

  public setError(): void {
    if (this.isManualOffline || !this.isNetworkOnline) {
      this.status = 'offline';
    } else {
      this.status = 'error';
    }
    this.notify();
  }

  private updateStatus(): void {
    this.isNetworkOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isManualOffline = getStoredOfflineMode();
    if (this.isManualOffline || !this.isNetworkOnline) {
      this.status = 'offline';
      this.isFirestoreConnected = false;
    } else if (this.status === 'offline') {
      this.status = 'synced';
      this.isFirestoreConnected = true;
    }
    this.notify();
  }

  private notify(): void {
    const state = this.getState();
    this.subscribers.forEach((cb) => cb(state));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('seera_cloud_sync_updated', { detail: state }));
    }
  }
}

export const syncStatusService = new SyncStatusService();
