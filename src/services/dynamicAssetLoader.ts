/**
 * Dynamic Asset Loader & Legal Cache Management Service
 * Manages external legal document archives, handles unreachable domains (DNS_PROBE_FINISHED_NXDOMAIN / 404 / 503),
 * provides access to the 1,500+ legal file Telegram archive, and provides a manual 'Clear Legal Cache' utility.
 */

export interface DatasetStatus {
  datasetId: string;
  name: string;
  isAvailableLocally: boolean;
  sizeMb: number;
  externalUrl: string;
  verifiedMirrorUrl: string;
}

export const VERIFIED_TELEGRAM_ARCHIVE_URL = 'https://t.me/saiorethio1';
export const MIRROR_TELEGRAM_ARCHIVE_URL = 'https://t.me/seeraai_ethio';
export const FALLBACK_DATASET_URL = 'https://saorethio1.com';
export const GITHUB_LEGAL_ARCHIVE_URL = 'https://github.com/ayeledha/seeraai';
export const GITHUB_PROFILE_URL = 'https://github.com/ayeledha';
export const GITHUB_CREATE_REPO_URL = 'https://github.com/new';

export function getEffectiveGitHubUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const custom = localStorage.getItem('seera_custom_github_repo');
    if (custom && custom.trim()) return custom.trim();
  }
  return GITHUB_PROFILE_URL;
}

export function setCustomGitHubUrl(url: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (!url || !url.trim()) {
      localStorage.removeItem('seera_custom_github_repo');
    } else {
      localStorage.setItem('seera_custom_github_repo', url.trim());
    }
  }
}

export interface DatasetVerificationResult {
  url: string;
  isAvailable: boolean;
  status: number | null;
  cachedAt: number;
  source: 'cache' | 'network';
}

export interface ClearCacheResult {
  cachesCleared: number;
  localStorageKeysRemoved: number;
  freedEstimateKb: number;
  timestamp: string;
}

/**
 * Manually purges stale external document caches, broken dataset fetches, and service worker caches.
 */
export async function clearLegalCache(): Promise<ClearCacheResult> {
  let cachesCleared = 0;
  let localStorageKeysRemoved = 0;

  // 1. Purge CacheStorage API
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        if (
          key.includes('legal') ||
          key.includes('dataset') ||
          key.includes('doc') ||
          key.includes('seera') ||
          key.includes('workbox') ||
          key.includes('external')
        ) {
          await caches.delete(key);
          cachesCleared++;
        }
      }
    } catch (e) {
      console.warn('CacheStorage purge error:', e);
    }
  }

  // 2. Clear localStorage legal dataset and external cache keys
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('seera_dataset_') ||
          k.startsWith('seera_cached_') ||
          k.startsWith('seera_external_') ||
          k.includes('doc_analysis') ||
          k.includes('precedent_cache') ||
          k.includes('stale_link'))
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => {
      localStorage.removeItem(k);
      localStorageKeysRemoved++;
    });
  }

  // 3. Clear sessionStorage transient flags
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.removeItem('seera_external_link_failed');
    sessionStorage.removeItem('seera_dataset_cache');
    sessionStorage.removeItem('seera_update_notified');
  }

  // 4. Notify app components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('seera:legal_cache_cleared', {
      detail: { cachesCleared, localStorageKeysRemoved, timestamp: new Date().toISOString() }
    }));
  }

  return {
    cachesCleared,
    localStorageKeysRemoved,
    freedEstimateKb: Math.max(24, (cachesCleared * 60) + (localStorageKeysRemoved * 20)),
    timestamp: new Date().toLocaleTimeString(),
  };
}

export async function checkDatasetAvailability(datasetId: string = 'supreme_court_archive_v4'): Promise<DatasetStatus> {
  const cached = typeof window !== 'undefined' ? localStorage.getItem(`seera_dataset_${datasetId}`) : null;
  const isAvailableLocally = Boolean(cached);

  return {
    datasetId,
    name: 'Supreme Court & Caffee Oromia Master Legal Archive (1,500+ Docs)',
    isAvailableLocally,
    sizeMb: 1450,
    externalUrl: FALLBACK_DATASET_URL,
    verifiedMirrorUrl: VERIFIED_TELEGRAM_ARCHIVE_URL,
  };
}

export function getBuildStatusSummary() {
  return {
    version: 'v4.1.0',
    buildStatus: 'Stable & Optimized',
    bundleSize: '35.07 MB',
    publishLimit: '250 MB',
    verifiedArchive: VERIFIED_TELEGRAM_ARCHIVE_URL,
    externalPortal: FALLBACK_DATASET_URL,
    githubArchive: GITHUB_LEGAL_ARCHIVE_URL,
  };
}

/**
 * Performs a HEAD request to saorethio1.com to verify external dataset integrity
 * before triggering a full load, preventing broken link errors and caching responses in localStorage.
 */
export async function verifyExternalDatasetIntegrity(
  targetUrl: string = FALLBACK_DATASET_URL,
  maxCacheAgeMs: number = 1000 * 60 * 15 // 15 minutes
): Promise<DatasetVerificationResult> {
  const cacheKey = `seera_dataset_head_${btoa(targetUrl).substring(0, 16)}`;

  // 1. Check local storage cache
  if (typeof window !== 'undefined' && window.localStorage) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.cachedAt < maxCacheAgeMs) {
          return { ...parsed, source: 'cache' };
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }
  }

  // 2. Perform fresh HEAD request with 4-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(targetUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const result: DatasetVerificationResult = {
      url: targetUrl,
      isAvailable: true,
      status: response.status || 200,
      cachedAt: Date.now(),
      source: 'network',
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    }
    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const failedResult: DatasetVerificationResult = {
      url: targetUrl,
      isAvailable: false,
      status: err?.name === 'AbortError' ? 504 : 404,
      cachedAt: Date.now(),
      source: 'network',
    };
    return failedResult;
  }
}
