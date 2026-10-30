import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

export interface RealtimeAnalyticsEvent {
  id?: string;
  userId: string;
  userName: string;
  actionType: string; // 'visit' | 'explain_law' | 'doc_analysis' | 'cassation' | 'translate' | 'template' | 'glossary'
  category?: string;
  details?: string;
  referrer?: string;
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | null;
}

const COLLECTION_PATH = 'analytics_events';

import { isOwnerAccount as checkIsOwner } from './ownerAuth';

/**
 * Checks if a user is the owner/creator (Ayele).
 */
export function isOwnerAccount(email?: string | null, userName?: string | null): boolean {
  return checkIsOwner(email, userName);
}

/**
 * Logs an event to the real-time Firestore analytics feed.
 * Automatically skips logging if the user is the owner (Ayele) so he is not counted among visitors.
 */
export async function logRealtimeEvent(
  actionType: string,
  details?: string,
  category?: string,
  referrer?: string,
  customUserName?: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // Exclude owner Ayele from analytics visitor tracking
  if (isOwnerAccount(currentUser.email, customUserName || currentUser.displayName)) {
    return;
  }

  const eventPayload = {
    userId: currentUser.uid,
    userName: (customUserName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Ogeessa Seeraa').substring(0, 150),
    actionType: actionType.substring(0, 60),
    category: category ? category.substring(0, 100) : 'General',
    details: details ? details.substring(0, 1000) : 'Interaction',
    referrer: referrer ? referrer.substring(0, 150) : 'Direct',
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, COLLECTION_PATH), eventPayload);
  } catch (error) {
    console.warn('Realtime event log notice (non-fatal):', error);
  }
}

/**
 * Attaches a real-time live onSnapshot listener to the analytics stream.
 * Automatically filters out owner (Ayele) events so only external visitors are displayed.
 */
export function subscribeToRealtimeAnalytics(
  onUpdate: (events: RealtimeAnalyticsEvent[]) => void
): () => void {
  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  try {
    const q = query(
      collection(db, COLLECTION_PATH),
      orderBy('createdAt', 'desc'),
      limit(80)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const events: RealtimeAnalyticsEvent[] = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<RealtimeAnalyticsEvent, 'id'>),
          }))
          // Exclude owner account from visitor stream
          .filter((e) => !isOwnerAccount(undefined, e.userName));
        onUpdate(events);
      },
      (error) => {
        console.warn('Realtime analytics listener notice:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Realtime analytics subscription init:', error);
    return () => {};
  }
}
