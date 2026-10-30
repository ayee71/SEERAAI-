import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firebase';

export interface CourtNotification {
  id: string;
  type: 'bulk_case_assignment' | 'deadline_alert_24h' | 'case_assigned' | 'hearing_scheduled' | 'status_update';
  title: string;
  body: string;
  recipientRole: 'judge' | 'litigant_claimant' | 'litigant_respondent' | 'coordinator' | 'all';
  recipientName: string;
  caseId?: string;
  caseNumber?: string;
  caseIds?: string[];
  caseNumbers?: string[];
  hearingDate?: string;
  hearingTime?: string;
  bench?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  isPushSent?: boolean;
  createdAt: string;
}

const NOTIFICATIONS_COLLECTION = 'court_notifications';
const LOCAL_NOTIFICATIONS_KEY = 'seeraai_court_notifications_v1';

export function getLocalNotifications(): CourtNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to read local notifications cache:', e);
    return [];
  }
}

export function saveLocalNotifications(notifications: CourtNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.warn('Failed to save local notifications cache:', e);
  }
}

/**
 * Request HTML5 Desktop Web Notification permission
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Display browser push notification
 */
export function dispatchBrowserPushNotification(title: string, body: string, icon = '/legal-lady-justice.jpg'): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon,
        badge: '/favicon.png',
        tag: 'court-alert-' + Date.now(),
      });
      return true;
    } catch (e) {
      console.warn('Browser push notification display error:', e);
    }
  }
  return false;
}

/**
 * Create a new Court Notification in Firestore & local cache
 */
export async function createCourtNotification(
  notif: Omit<CourtNotification, 'id' | 'createdAt'>
): Promise<CourtNotification> {
  const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const createdAt = new Date().toISOString();
  const fullNotif: CourtNotification = {
    ...notif,
    id,
    createdAt
  };

  // Push to local storage
  const current = getLocalNotifications();
  current.unshift(fullNotif);
  saveLocalNotifications(current);

  // Trigger web notification if high urgency
  if (fullNotif.urgency === 'high' || fullNotif.urgency === 'critical') {
    dispatchBrowserPushNotification(fullNotif.title, fullNotif.body);
  }

  // Persist to Firestore
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
    await setDoc(docRef, fullNotif);
  } catch (err) {
    console.warn('[CourtNotification] Firestore write warning (cached locally):', err);
  }

  return fullNotif;
}

/**
 * Fetch all notifications with local fallback
 */
export async function fetchCourtNotifications(): Promise<CourtNotification[]> {
  try {
    const q = query(collection(db, NOTIFICATIONS_COLLECTION), limit(60));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items: CourtNotification[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as CourtNotification));
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      saveLocalNotifications(items);
      return items;
    }
  } catch (err) {
    console.warn('[CourtNotification] Fetching from Firestore fallback to local:', err);
  }
  return getLocalNotifications();
}

/**
 * Real-time subscription to court notifications
 */
export function subscribeToCourtNotifications(
  onUpdate: (notifications: CourtNotification[]) => void
): () => void {
  try {
    const q = query(collection(db, NOTIFICATIONS_COLLECTION), limit(60));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: CourtNotification[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as CourtNotification));

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      saveLocalNotifications(items);
      onUpdate(items);
    }, (err) => {
      console.warn('[CourtNotification] Snapshot error, using local fallback:', err);
      onUpdate(getLocalNotifications());
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[CourtNotification] Listener registration error:', err);
    onUpdate(getLocalNotifications());
    return () => {};
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  const current = getLocalNotifications();
  const updated = current.map(n => n.id === id ? { ...n, isRead: true } : n);
  saveLocalNotifications(updated);

  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
    await updateDoc(docRef, { isRead: true });
  } catch (err) {
    console.warn('[CourtNotification] Firestore update error (local updated):', err);
  }
}

/**
 * Trigger backend automated 24h deadline scanner
 */
export async function triggerServerDeadlineCheck(): Promise<{
  scannedCount: number;
  triggeredCount: number;
  message: string;
}> {
  try {
    const res = await fetch('/api/court/check-upcoming-deadlines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    return await res.json();
  } catch (e: any) {
    console.warn('triggerServerDeadlineCheck error:', e);
    return {
      scannedCount: 0,
      triggeredCount: 0,
      message: e.message || 'Offline or server check skipped'
    };
  }
}
