
export const STORAGE_LAST_SYNC_KEY = 'seera_ai_last_sync_timestamp';
export const STORAGE_QUEUE_KEY = 'seera_ai_queued_edits';
export const OFFLINE_MODE_STORAGE_KEY = 'seera_offline_mode_enabled';
export const USER_SETTINGS_STORAGE_KEY = 'seera_ai_user_settings';

export function getLastSyncTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_LAST_SYNC_KEY);
}

export function setLastSyncTime(isoString?: string): void {
  if (typeof window === 'undefined') return;
  const time = isoString || new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, time);
  } catch {}
}

export function getStoredOfflineMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const direct = localStorage.getItem(OFFLINE_MODE_STORAGE_KEY);
    if (direct === 'true') return true;
    if (direct === 'false') return false;

    const rawSettings = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      return Boolean(parsed?.offlineModeEnabled);
    }
  } catch {}
  return false;
}

export function persistOfflineModeFlag(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_MODE_STORAGE_KEY, String(enabled));
    const rawSettings = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    const parsed = rawSettings ? JSON.parse(rawSettings) : {};
    localStorage.setItem(
      USER_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...parsed, offlineModeEnabled: enabled })
    );
  } catch {}
}
