/**
 * App Update & Link Entrance Synchronization Service
 * Ensures all users accessing the app link receive the newest version,
 * detects remote service worker updates, and offers 1-click & auto updates.
 */

export const CURRENT_APP_VERSION = '4.1.0';
export const APP_VERSION_STORAGE_KEY = 'seera_active_app_version';
export const LAST_UPDATE_CHECK_KEY = 'seera_last_update_check_ts';

export interface AppUpdateInfo {
  isUpdateAvailable: boolean;
  isMandatory?: boolean;
  currentVersion: string;
  latestVersion: string;
  buildTime?: string;
  releaseNotes?: string;
  features?: string[];
  autoUpdateCountdown?: number;
}

let activeUpdateInfo: AppUpdateInfo | null = null;
let updateListeners: ((info: AppUpdateInfo) => void)[] = [];
let updateCheckTimer: any = null;

/**
 * Register a listener for update availability
 */
export function onAppUpdateAvailable(listener: (info: AppUpdateInfo) => void): () => void {
  updateListeners.push(listener);
  if (activeUpdateInfo && activeUpdateInfo.isUpdateAvailable) {
    listener(activeUpdateInfo);
  }
  return () => {
    updateListeners = updateListeners.filter((l) => l !== listener);
  };
}

function notifyUpdateListeners(info: AppUpdateInfo) {
  activeUpdateInfo = info;
  updateListeners.forEach((listener) => {
    try {
      listener(info);
    } catch (e) {
      console.warn('Error notifying update listener:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('seera:app_update_available', {
        detail: info,
      })
    );
  }
}

/**
 * Check if remote server or service worker has a newer version
 */
export async function checkForAppUpdate(isManualTrigger: boolean = false): Promise<AppUpdateInfo> {
  const currentVersion = CURRENT_APP_VERSION;
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem(APP_VERSION_STORAGE_KEY)) {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, currentVersion);
    }
  }
  const storedVersion = typeof window !== 'undefined' ? localStorage.getItem(APP_VERSION_STORAGE_KEY) : null;

  // If already at current version and not manual, skip update prompts
  if (storedVersion === currentVersion && !isManualTrigger) {
    return {
      isUpdateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
    };
  }

  // Prevent repeated notification spam in the same session
  if (!isManualTrigger && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('seera_update_notified') === 'true') {
    return {
      isUpdateAvailable: false,
      currentVersion: storedVersion || currentVersion,
      latestVersion: currentVersion,
    };
  }

  // 1. Check with Service Worker if available
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && isManualTrigger) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) {
          const info: AppUpdateInfo = {
            isUpdateAvailable: true,
            currentVersion: storedVersion || currentVersion,
            latestVersion: currentVersion,
            releaseNotes: 'Moodeelota Gemini AI haarawaa, sirna hojii mana murtii fi seerota haaromfaman.',
          };
          sessionStorage.setItem('seera_update_notified', 'true');
          notifyUpdateListeners(info);
          return info;
        }
      }
    } catch (err) {
      console.warn('SW update check warning:', err);
    }
  }

  // 2. Fetch live /version.json
  try {
    const timestamp = Date.now();
    const response = await fetch(`/version.json?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const serverVersion = data.version || currentVersion;

      const hasNewVersion = Boolean(serverVersion !== currentVersion && storedVersion !== serverVersion);
      const isMandatory = Boolean(data.forceUpdate);

      const updateInfo: AppUpdateInfo = {
        isUpdateAvailable: hasNewVersion,
        isMandatory: isMandatory,
        currentVersion: storedVersion || currentVersion,
        latestVersion: serverVersion,
        buildTime: data.buildTime,
        releaseNotes: data.releaseNotes || 'Moodeelota Gemini AI haarawaa, sirna hojii mana murtii fi seerota haaromfaman.',
        features: data.features || [],
      };

      if (hasNewVersion) {
        sessionStorage.setItem('seera_update_notified', 'true');
        notifyUpdateListeners(updateInfo);
      }

      return updateInfo;
    }
  } catch (err) {
    console.warn('Live version.json check failed:', err);
  }

  const fallbackInfo: AppUpdateInfo = {
    isUpdateAvailable: false,
    currentVersion: storedVersion || currentVersion,
    latestVersion: currentVersion,
  };

  return fallbackInfo;
}

/**
 * Execute hard update: evicts old caches, notifies SW, reloads preserving URL
 */
export async function applyAppUpdate(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. Clear caches
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 2. Tell ServiceWorker to skipWaiting
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
    }

    // 3. Mark current version in storage
    localStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
    localStorage.setItem('seera_last_updated_at', new Date().toISOString());

    // 4. Reload page preserving all search queries, hash, and route state
    const currentUrl = window.location.href;
    const urlObj = new URL(currentUrl);
    urlObj.searchParams.set('_v', String(Date.now())); // bust URL cache
    window.location.replace(urlObj.toString());
  } catch (e) {
    console.error('Failed to apply app update, forcing reload:', e);
    window.location.reload();
  }
}

/**
 * Initialize automatic update listening on app start
 */
export function initAppUpdateEngine(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Store current version if first visit
  if (!localStorage.getItem(APP_VERSION_STORAGE_KEY)) {
    localStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
  }

  // 1. Initial check after 1.5 seconds so initial page render is smooth
  const initialTimer = setTimeout(() => {
    checkForAppUpdate();
  }, 1500);

  // 2. Listen to ServiceWorker messages
  const handleSwMessage = (event: MessageEvent) => {
    if (!event.data) return;
    if (event.data.type === 'SEERA_SW_ACTIVATED' || event.data.type === 'APP_UPDATE_AVAILABLE') {
      const info: AppUpdateInfo = {
        isUpdateAvailable: true,
        currentVersion: localStorage.getItem(APP_VERSION_STORAGE_KEY) || CURRENT_APP_VERSION,
        latestVersion: event.data.version || CURRENT_APP_VERSION,
        releaseNotes: 'Service Worker haaromfameera. Version haaraa argachuuf amma haaromsi.',
      };
      notifyUpdateListeners(info);
    }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
  }

  // 3. Check whenever tab comes into focus / visibilitychange
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkForAppUpdate();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);

  // 4. Periodic background update check every 5 minutes
  updateCheckTimer = setInterval(() => {
    checkForAppUpdate();
  }, 5 * 60 * 1000);

  return () => {
    clearTimeout(initialTimer);
    if (updateCheckTimer) clearInterval(updateCheckTimer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleVisibilityChange);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  };
}
