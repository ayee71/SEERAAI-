import { CassationPrecedent } from '../data/cassationPrecedents';

const OFFLINE_PRECEDENTS_STORAGE_KEY = 'seera_offline_cassation_precedents';
const NOTIFICATION_PREF_KEY = 'seera_precedents_notification_enabled';

export interface PrecedentSyncStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isRegistered: boolean;
  cachedCount: number;
  isOnline: boolean;
  lastSyncTime: string | null;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register Service Worker for Precedents Offline Sync and Background Notifications
 */
export async function registerPrecedentServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  // Prevent rogue service worker registration inside AI Studio frame
  const isAiStudio = window.location.hostname.includes('aistudio.google.com') || window.self !== window.top;
  if (isAiStudio) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.unregister();
      }
    } catch {}
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = registration;

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New precedent sync service worker available.');
          }
        });
      }
    });

    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Request Notification Permission from user
 */
export async function requestPrecedentNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      localStorage.setItem(NOTIFICATION_PREF_KEY, 'true');
    }
    return perm;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Check current notification status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Check if Notification API is supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get cached precedents from local storage
 */
export function getOfflineCachedPrecedents(): CassationPrecedent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_PRECEDENTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Download & Cache Precedents for Offline Access and Proactively Notify User
 */
export async function cachePrecedentsForOffline(
  precedents: CassationPrecedent[],
  onProgress?: (count: number, total: number) => void
): Promise<{ success: boolean; count: number }> {
  try {
    if (onProgress) onProgress(0, precedents.length);

    // Save to LocalStorage
    localStorage.setItem(OFFLINE_PRECEDENTS_STORAGE_KEY, JSON.stringify(precedents));
    localStorage.setItem('seera_precedents_last_sync', new Date().toISOString());

    // Send to Service Worker for Cache Storage
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_PRECEDENTS_DATA',
        precedents,
      });
    }

    if (onProgress) onProgress(precedents.length, precedents.length);

    // Proactively notify user using Notification API
    await triggerPrecedentNotification({
      count: precedents.length,
      precedentTitles: precedents.slice(0, 3).map((p) => `Galmee ${p.fileNumber}: ${p.parties.om}`),
      customTitle: `Murtiiwwan Ijoo ${precedents.length} Offline Kuufamaniiru! ⚖️`,
      customBody: `Sanadoon Murtii Dhaddacha Dhimmoota Ijoo ${precedents.length} milkaa'inaan offline kuufamaniiru. Intarneeta malee dubbisuu dandeessu. / የሰበር ውሳኔ ሰነዶች ከመስመር ውጭ ተቀምጠዋል።`,
    });

    return { success: true, count: precedents.length };
  } catch (err) {
    console.error('Failed to cache precedents offline:', err);
    return { success: false, count: 0 };
  }
}

/**
 * Trigger browser notification using ServiceWorkerRegistration.showNotification or Notification API
 */
export async function triggerPrecedentNotification(options: {
  count?: number;
  precedentTitles?: string[];
  customTitle?: string;
  customBody?: string;
}): Promise<boolean> {
  const perm = getNotificationPermission();
  if (perm !== 'granted') {
    return false;
  }

  const title = options.customTitle || 'Murtii Seeraa Haaraa Kuufameera! ⚖️';
  const body =
    options.customBody ||
    `Sanadoon murtii ijoo ${options.count || 1} offline kuufamaniiru. Intarneeta malee argachuu dandeessu.`;

  // 1. Try Service Worker Notification (ideal for background/offline)
  if (swRegistration && 'showNotification' in swRegistration) {
    try {
      await swRegistration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: '/?tab=cassation' },
        vibrate: [200, 100, 200],
        tag: 'precedent-sync-' + Date.now(),
        renotify: true,
      } as any);
      return true;
    } catch (e) {
      console.warn('SW showNotification failed, falling back to Notification constructor:', e);
    }
  }

  // 2. Fallback to Window Notification Constructor
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'precedent-sync-' + Date.now(),
      });
      n.onclick = () => {
        try {
          window.focus();
        } catch {}
        window.dispatchEvent(new CustomEvent('seera:navigate', { detail: { tab: 'cassation' } }));
      };
      return true;
    } catch (e) {
      console.warn('Window Notification failed:', e);
    }
  }

  return false;
}

/**
 * Setup listeners for online/offline events to trigger background sync when returning online
 */
export function setupBackgroundSyncListeners(
  allPrecedents: CassationPrecedent[],
  onStatusChange?: (isOnline: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    if (onStatusChange) onStatusChange(true);

    // Check if cached precedents are behind
    const cached = getOfflineCachedPrecedents();
    if (cached.length < allPrecedents.length) {
      const diffCount = allPrecedents.length - cached.length;
      await cachePrecedentsForOffline(allPrecedents);
      await triggerPrecedentNotification({
        customTitle: `Murtiiwwan Haaraa ${diffCount} Offline Kuufamaniiru! ⚖️`,
        customBody: `Intarneetiin waan deebi'eef sanadoon murtii ijoo haaraan ${diffCount} offline kuufamaniiru. / አዳዲስ ውሳኔዎች ከመስመር ውጭ ተቀምጠዋል።`,
      });
    }
  };

  const handleOffline = () => {
    if (onStatusChange) onStatusChange(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
