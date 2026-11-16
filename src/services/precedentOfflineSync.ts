import { CassationPrecedent } from '../data/cassationPrecedents';
import { addSyncLog } from './syncLogService';
import { savePrecedentsCodedOffline } from './legalPrecedentCodec';

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

    // Save to LocalStorage (both raw and coded compressed format to reduce 2GB to ~100KB)
    localStorage.setItem(OFFLINE_PRECEDENTS_STORAGE_KEY, JSON.stringify(precedents));
    localStorage.setItem('seera_precedents_last_sync', new Date().toISOString());
    savePrecedentsCodedOffline();

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
    
    await addSyncLog({
      status: 'success',
      type: 'download',
      details: `Cached ${precedents.length} cassation precedents for offline access.`,
      affectedIds: precedents.map(p => p.id),
      conflictsResolved: false
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

    // 1. Sync pending offline court case drafts when connectivity resumes
    try {
      await syncOfflineCaseDraftsToServer();
    } catch (e) {
      console.warn('Auto-sync of offline case drafts failed on network restore:', e);
    }

    // 2. Check if cached precedents are behind
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

  // Listen for Service Worker background sync messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SEERA_SYNC_COURT_CASE_DRAFTS') {
        syncOfflineCaseDraftsToServer();
      }
    });
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ---------------------------------------------------------------------------
// COURT CASE FILE & OFFLINE DRAFT BACKGROUND SYNCHRONIZATION SERVICE
// ---------------------------------------------------------------------------

export interface OfflineCaseDraft {
  id: string;
  caseNumber?: string;
  title: string;
  courtName?: string;
  courtLevel?: string;
  content: string;
  notes?: string;
  evidenceSummary?: string;
  status: 'draft' | 'pending_sync' | 'synced' | 'conflict';
  updatedAt: string;
  createdAt: string;
  authorEmail?: string;
  syncTag?: string;
  payload?: Record<string, any>;
}

export interface OfflineCaseFile {
  id: string;
  caseNumber: string;
  title: string;
  filingDate: string;
  courtName: string;
  courtLevel: string;
  status: string;
  judgeName?: string;
  parties?: { claimant?: string; defendant?: string };
  documentContent?: string;
  cachedAt: string;
}

const OFFLINE_CASE_DRAFTS_KEY = 'seera_offline_court_case_drafts';
const OFFLINE_CASE_FILES_KEY = 'seera_offline_court_case_files';
const LAST_CASE_SYNC_KEY = 'seera_last_case_files_sync';

/**
 * Get all cached offline case drafts from local storage
 */
export function getOfflineCaseDrafts(): OfflineCaseDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_CASE_DRAFTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Get only pending drafts awaiting server background sync
 */
export function getPendingOfflineCaseDrafts(): OfflineCaseDraft[] {
  return getOfflineCaseDrafts().filter((d) => d.status === 'pending_sync');
}

import { isWriteLocked } from './signOutSafetyService';

/**
 * Save or update a court case file draft while offline
 */
export async function saveOfflineCaseDraft(
  draftData: Partial<OfflineCaseDraft> & { title: string; content: string }
): Promise<OfflineCaseDraft> {
  if (isWriteLocked()) {
    throw new Error('SIGN_OUT_WRITE_LOCKED:saveOfflineCaseDraft');
  }
  const existingList = getOfflineCaseDrafts();
  const draftId = draftData.id || `draft_case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newDraft: OfflineCaseDraft = {
    id: draftId,
    caseNumber: draftData.caseNumber || 'MMA-GUR/DRAFT/' + Date.now().toString().slice(-4),
    title: draftData.title.trim(),
    courtName: draftData.courtName || 'Mana Murtii Aanaa Gurbicha',
    courtLevel: draftData.courtLevel || 'first_instance',
    content: draftData.content.trim(),
    notes: draftData.notes || '',
    evidenceSummary: draftData.evidenceSummary || '',
    status: 'pending_sync',
    createdAt: draftData.createdAt || now,
    updatedAt: now,
    authorEmail: draftData.authorEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('seera_cached_email') || 'judge@court.oromia.et' : ''),
    syncTag: 'sync-court-case-drafts',
    payload: draftData.payload || {},
  };

  const existingIdx = existingList.findIndex((d) => d.id === draftId);
  if (existingIdx !== -1) {
    existingList[existingIdx] = newDraft;
  } else {
    existingList.unshift(newDraft);
  }

  try {
    localStorage.setItem(OFFLINE_CASE_DRAFTS_KEY, JSON.stringify(existingList));
  } catch (e) {
    console.warn('Failed saving offline case draft to localStorage:', e);
  }

  // Register Service Worker Background Sync if supported
  await registerBackgroundSyncForCaseDrafts();

  // Send message to active service worker controller
  if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_CASE_DRAFT',
        draft: newDraft,
      });
    } catch {}
  }

  // Dispatch custom event for UI components to update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('seera_case_draft_updated', { detail: newDraft })
    );
  }

  return newDraft;
}

/**
 * Delete an offline draft
 */
export function deleteOfflineCaseDraft(draftId: string): void {
  if (typeof window === 'undefined' || isWriteLocked()) return;
  const list = getOfflineCaseDrafts().filter((d) => d.id !== draftId);
  try {
    localStorage.setItem(OFFLINE_CASE_DRAFTS_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Register Service Worker Background Sync for court case drafts
 */
export async function registerBackgroundSyncForCaseDrafts(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('SyncManager' in window)) {
    return false;
  }

  try {
    const reg: any = await navigator.serviceWorker.ready;
    if (reg && reg.sync) {
      await reg.sync.register('sync-court-case-drafts');
      return true;
    }
  } catch (err) {
    console.warn('Background sync registration for court case drafts deferred:', err);
  }
  return false;
}

/**
 * Offline case drafts currently have NO verified Firestore/backend sync destination matching
 * their schema in this codebase. Previously this function simulated sync by flipping local status='synced'.
 * It now preserves all pending drafts untouched and fails closed without claiming cloud confirmation.
 */
export async function syncOfflineCaseDraftsToServer(): Promise<{
  success: boolean;
  syncedCount: number;
  pendingCount: number;
  errors: any[];
}> {
  const pending = getPendingOfflineCaseDrafts();
  if (pending.length === 0) {
    return { success: true, syncedCount: 0, pendingCount: 0, errors: [] };
  }

  const blockerMsg =
    'CLOUD_SYNC_DESTINATION_UNAVAILABLE: No verified server schema/endpoint exists for offline court case drafts; records remain preserved locally.';

  await addSyncLog({
    status: 'failed',
    type: 'upload',
    details: `Deferred ${pending.length} offline court case drafts: ${blockerMsg}`,
    affectedIds: pending.map((p) => p.id),
    conflictsResolved: false,
    errorMessage: blockerMsg,
  });

  return {
    success: false,
    syncedCount: 0,
    pendingCount: pending.length,
    errors: [blockerMsg],
  };
}

/**
 * Cache list of official court case files for offline viewing
 */
export async function cacheCourtCaseFilesForOffline(
  caseFiles: OfflineCaseFile[]
): Promise<{ success: boolean; count: number }> {
  if (typeof window === 'undefined' || isWriteLocked()) return { success: false, count: 0 };
  try {
    localStorage.setItem(OFFLINE_CASE_FILES_KEY, JSON.stringify(caseFiles));
    localStorage.setItem(LAST_CASE_SYNC_KEY, new Date().toISOString());

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_COURT_CASE_FILES',
        caseFiles,
      });
    }

    return { success: true, count: caseFiles.length };
  } catch (e) {
    console.error('Failed caching court case files:', e);
    return { success: false, count: 0 };
  }
}

/**
 * Get cached court case files
 */
export function getOfflineCachedCaseFiles(): OfflineCaseFile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_CASE_FILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
