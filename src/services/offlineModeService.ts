import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from './firebase';
import { saveUserSettings } from './storage';
import { backgroundSyncManager } from './backgroundSync';
import { syncStatusService } from './syncStatusService';
import {
  OFFLINE_MODE_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
  getStoredOfflineMode,
  persistOfflineModeFlag,
} from './syncUtils';

export interface OfflineModeState {
  isManualOffline: boolean;
  isNetworkOnline: boolean;
  isEffectiveOffline: boolean;
  isTransitioning: boolean;
}

type OfflineModeSubscriber = (state: OfflineModeState) => void;

class OfflineModeService {
  private isManualOffline: boolean = getStoredOfflineMode();
  private isNetworkOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isTransitioning: boolean = false;
  private subscribers: Set<OfflineModeSubscriber> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      if (this.isManualOffline) {
        syncStatusService.setManualOffline(true);
        backgroundSyncManager.stop();
        disableNetwork(db).catch(() => {});
      }

      window.addEventListener('online', () => {
        this.isNetworkOnline = true;
        this.notify();
        if (!this.isManualOffline) {
          enableNetwork(db).catch(() => {});
        }
      });

      window.addEventListener('offline', () => {
        this.isNetworkOnline = false;
        this.notify();
      });

      window.addEventListener('storage', (e) => {
        if (e.key === OFFLINE_MODE_STORAGE_KEY || e.key === USER_SETTINGS_STORAGE_KEY) {
          const stored = getStoredOfflineMode();
          if (stored !== this.isManualOffline) {
            this.isManualOffline = stored;
            syncStatusService.setManualOffline(stored);
            if (stored) {
              backgroundSyncManager.stop();
              disableNetwork(db).catch(() => {});
            } else {
              backgroundSyncManager.start(3500);
              if (this.isNetworkOnline) {
                enableNetwork(db).catch(() => {});
              }
            }
            this.notify();
          }
        }
      });
    }
  }

  public getState(): OfflineModeState {
    return {
      isManualOffline: this.isManualOffline,
      isNetworkOnline: this.isNetworkOnline,
      isEffectiveOffline: this.isManualOffline || !this.isNetworkOnline,
      isTransitioning: this.isTransitioning,
    };
  }

  public subscribe(callback: OfflineModeSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.getState());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public async setOfflineMode(enabled: boolean): Promise<OfflineModeState> {
    this.isManualOffline = enabled;
    this.isNetworkOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isTransitioning = true;

    persistOfflineModeFlag(enabled);
    saveUserSettings({ offlineModeEnabled: enabled });
    syncStatusService.setManualOffline(enabled);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('seera_offline_mode_changed', {
          detail: {
            offlineModeEnabled: enabled,
            isNetworkOnline: this.isNetworkOnline,
            effectiveOffline: enabled || !this.isNetworkOnline,
          },
        })
      );
    }
    this.notify();

    try {
      if (enabled) {
        backgroundSyncManager.stop();
        await disableNetwork(db).catch(() => {});
      } else {
        if (this.isNetworkOnline) {
          await enableNetwork(db).catch(() => {});
          backgroundSyncManager.start(3500);
          const pending = await backgroundSyncManager.getQueuedEdits();
          syncStatusService.setSyncing(true, pending.length);
          await backgroundSyncManager.triggerManualSync();
          syncStatusService.setSyncing(false, 0);
        } else {
          backgroundSyncManager.start(3500);
        }
      }
    } finally {
      this.isTransitioning = false;
      this.notify();
    }

    return this.getState();
  }

  public async toggleOfflineMode(): Promise<OfflineModeState> {
    return this.setOfflineMode(!this.isManualOffline);
  }

  private notify(): void {
    const state = this.getState();
    this.subscribers.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error('OfflineModeService subscriber error:', err);
      }
    });
  }
}

export const offlineModeService = new OfflineModeService();
