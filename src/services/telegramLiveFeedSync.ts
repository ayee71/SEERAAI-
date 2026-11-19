import { getStoredOfflineMode } from './syncUtils';

export const TELEGRAM_LIVE_FEED_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
export const TELEGRAM_LIVE_FEED_UPDATED_EVENT = 'seera:telegram_live_feed_updated';
const LIVE_FEED_CACHE_NAME = 'telegram-live-feed-cache';
const LAST_SYNC_STORAGE_KEY = 'seera_telegram_live_feed_last_sync_ts';
const ACTIVITY_THROTTLE_MS = 15 * 1000;

export interface TelegramLiveFeedSyncDetail {
  syncedAt: string;
  liveFeedData?: {
    ok?: boolean;
    feed?: any[];
    updatedAt?: string;
  } | null;
  channelFeedData?: {
    ok?: boolean;
    items?: any[];
    lastUpdated?: string;
  } | null;
}

const LIVE_FEED_ENDPOINTS = {
  liveFeed: '/api/telegram/live-legal-feed?limit=30',
  homeChannelFeed: '/api/telegram/channel-feed?channel=seeraai_ethio&limit=4',
  fullChannelFeed: '/api/telegram/channel-feed?channel=seeraai_ethio&limit=20',
} as const;

let activeSubscribers = 0;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let lastActivityAt = typeof Date !== 'undefined' ? Date.now() : 0;
let lastActivityMarkAt = 0;
let lastSyncAt = 0;
let inFlightSync: Promise<TelegramLiveFeedSyncDetail | null> | null = null;
let listenersAttached = false;

function readPersistedLastSyncAt(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function persistLastSyncAt(timestamp: number): void {
  lastSyncAt = timestamp;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(timestamp));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

function markUserActivity(): void {
  const now = Date.now();
  if (now - lastActivityMarkAt < ACTIVITY_THROTTLE_MS) {
    lastActivityAt = now;
    return;
  }
  lastActivityMarkAt = now;
  lastActivityAt = now;

  // If user just returned to active use and >= 30 minutes have elapsed since last sync, refresh now
  if (shouldRunDueSync(now)) {
    void syncLiveTelegramFeedCache();
  }
}

function isUserActiveAndOnline(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  if (document.visibilityState !== 'visible') {
    return false;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (getStoredOfflineMode()) {
    return false;
  }
  return Date.now() - lastActivityAt <= TELEGRAM_LIVE_FEED_SYNC_INTERVAL_MS;
}

function shouldRunDueSync(now: number = Date.now()): boolean {
  if (!isUserActiveAndOnline()) return false;
  const effectiveLastSync = Math.max(lastSyncAt, readPersistedLastSyncAt());
  return now - effectiveLastSync >= TELEGRAM_LIVE_FEED_SYNC_INTERVAL_MS;
}

async function fetchEndpointAndReadRevalidatedJson<T>(url: string): Promise<T | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      ...(controller ? { signal: controller.signal } : {}),
    });

    if (!response.ok) {
      return null;
    }

    let payload = (await response.json()) as T;

    // When Workbox StaleWhileRevalidate serves a cached response immediately,
    // wait briefly for the background network revalidation to settle in CacheStorage
    // and read the updated cache entry so active views refresh without reload.
    if (
      typeof window !== 'undefined' &&
      'caches' in window &&
      typeof navigator !== 'undefined' &&
      navigator.serviceWorker?.controller
    ) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      try {
        const cache = await window.caches.open(LIVE_FEED_CACHE_NAME);
        const cachedMatch = await cache.match(url);
        if (cachedMatch) {
          payload = (await cachedMatch.json()) as T;
        }
      } catch {
        // Ignore cache read fallback errors
      }
    }

    return payload;
  } catch {
    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Triggers a background refresh of the live Telegram feed endpoints so Workbox's
 * StaleWhileRevalidate cache stays warm and active views update in-place.
 */
export async function syncLiveTelegramFeedCache(
  options: { force?: boolean } = {}
): Promise<TelegramLiveFeedSyncDetail | null> {
  if (inFlightSync) {
    return inFlightSync;
  }

  if (!options.force && !isUserActiveAndOnline()) {
    return null;
  }

  inFlightSync = (async () => {
    try {
      const [liveResult, homeChannelResult] = await Promise.allSettled([
        fetchEndpointAndReadRevalidatedJson<TelegramLiveFeedSyncDetail['liveFeedData']>(
          LIVE_FEED_ENDPOINTS.liveFeed
        ),
        fetchEndpointAndReadRevalidatedJson<TelegramLiveFeedSyncDetail['channelFeedData']>(
          LIVE_FEED_ENDPOINTS.homeChannelFeed
        ),
        fetch(LIVE_FEED_ENDPOINTS.fullChannelFeed, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }).catch(() => null),
      ]);

      const now = Date.now();
      persistLastSyncAt(now);

      const detail: TelegramLiveFeedSyncDetail = {
        syncedAt: new Date(now).toISOString(),
        liveFeedData: liveResult.status === 'fulfilled' ? liveResult.value : null,
        channelFeedData: homeChannelResult.status === 'fulfilled' ? homeChannelResult.value : null,
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<TelegramLiveFeedSyncDetail>(TELEGRAM_LIVE_FEED_UPDATED_EVENT, {
            detail,
          })
        );
      }

      return detail;
    } finally {
      inFlightSync = null;
    }
  })();

  return inFlightSync;
}

function handleVisibilityOrOnline(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    lastActivityAt = Date.now();
    if (shouldRunDueSync()) {
      void syncLiveTelegramFeedCache();
    }
  }
}

function attachGlobalListeners(): void {
  if (listenersAttached || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  listenersAttached = true;
  lastActivityAt = Date.now();
  lastSyncAt = readPersistedLastSyncAt() || Date.now();

  window.addEventListener('pointerdown', markUserActivity, { passive: true });
  window.addEventListener('keydown', markUserActivity, { passive: true });
  window.addEventListener('scroll', markUserActivity, { passive: true });
  window.addEventListener('touchstart', markUserActivity, { passive: true });
  window.addEventListener('focus', handleVisibilityOrOnline);
  window.addEventListener('online', handleVisibilityOrOnline);
  document.addEventListener('visibilitychange', handleVisibilityOrOnline);
}

function detachGlobalListeners(): void {
  if (!listenersAttached || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  listenersAttached = false;
  window.removeEventListener('pointerdown', markUserActivity);
  window.removeEventListener('keydown', markUserActivity);
  window.removeEventListener('scroll', markUserActivity);
  window.removeEventListener('touchstart', markUserActivity);
  window.removeEventListener('focus', handleVisibilityOrOnline);
  window.removeEventListener('online', handleVisibilityOrOnline);
  document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
}

/**
 * Starts the 30-minute active-user background synchronization interval for the live Telegram feed.
 * Returns a cleanup function suitable for React useEffect hooks.
 */
export function initTelegramLiveFeedSync(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  activeSubscribers += 1;
  attachGlobalListeners();

  if (!syncIntervalId) {
    // If more than 30 minutes elapsed since the previous session's sync, trigger an initial refresh
    if (shouldRunDueSync()) {
      void syncLiveTelegramFeedCache();
    }

    syncIntervalId = setInterval(() => {
      if (isUserActiveAndOnline()) {
        void syncLiveTelegramFeedCache();
      }
    }, TELEGRAM_LIVE_FEED_SYNC_INTERVAL_MS);
  }

  return () => {
    activeSubscribers = Math.max(0, activeSubscribers - 1);
    if (activeSubscribers === 0) {
      if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
      }
      detachGlobalListeners();
    }
  };
}

/**
 * Subscribes a view/component to live Telegram feed cache updates produced by the background sync.
 */
export function onTelegramLiveFeedUpdated(
  listener: (detail: TelegramLiveFeedSyncDetail) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<TelegramLiveFeedSyncDetail>;
    if (customEvent.detail) {
      listener(customEvent.detail);
    }
  };

  window.addEventListener(TELEGRAM_LIVE_FEED_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(TELEGRAM_LIVE_FEED_UPDATED_EVENT, handler);
  };
}
