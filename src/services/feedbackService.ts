import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

export interface FeedbackMessage {
  id?: string;
  userId: string;
  senderName: string;
  senderEmail?: string;
  contactInfo?: string;
  topic?: string;
  message: string;
  rating?: number;
  status: 'new' | 'read' | 'resolved';
  createdAt: any;
}

const COLLECTION_PATH = 'feedback_messages';
const LOCAL_STORAGE_KEY = 'seera_local_feedback_messages';

function getLocalMessages(): FeedbackMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessage(msg: FeedbackMessage) {
  try {
    const msgs = getLocalMessages();
    msgs.unshift(msg);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(msgs.slice(0, 50)));
  } catch {}
}

/**
 * Submits a new feedback, review, or consultation inquiry message to Firestore.
 */
export async function sendFeedbackMessage(data: {
  senderName: string;
  senderEmail?: string;
  contactInfo?: string;
  topic?: string;
  message: string;
  rating?: number;
  userId?: string;
}): Promise<string | null> {
  const currentUser = auth.currentUser;
  const uid = data.userId || currentUser?.uid || 'user_' + Date.now();
  const email = data.senderEmail || currentUser?.email || 'visitor@seeraai.et';

  const payload: Omit<FeedbackMessage, 'id'> = {
    userId: uid,
    senderName: (data.senderName || 'Fayyadaa SeeraAI').trim().substring(0, 150),
    senderEmail: email.trim().substring(0, 256),
    contactInfo: (data.contactInfo || email).trim().substring(0, 200),
    topic: (data.topic || 'General Feedback').trim().substring(0, 150),
    message: data.message.trim().substring(0, 3000),
    rating: data.rating && data.rating >= 1 && data.rating <= 5 ? data.rating : 5,
    status: 'new',
    createdAt: serverTimestamp(),
  };

  // 1. Cache locally for instant UI reflection
  const localMsg: FeedbackMessage = {
    id: 'local_' + Date.now(),
    ...payload,
    createdAt: new Date().toISOString(),
  };
  saveLocalMessage(localMsg);
  window.dispatchEvent(new CustomEvent('seera:new_feedback_message', { detail: localMsg }));

  // 2. Persist to Firestore if available
  if (db) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_PATH), payload);
      return docRef.id;
    } catch (error) {
      console.warn('Feedback submit notice, stored locally:', error);
      return localMsg.id || 'local-ok';
    }
  }

  return localMsg.id || 'local-ok';
}

/**
 * Subscribes to feedback and consultation messages with a live onSnapshot listener.
 */
export function subscribeToFeedbackMessages(
  onUpdate: (messages: FeedbackMessage[]) => void
): () => void {
  const localMsgs = getLocalMessages();

  if (!db) {
    onUpdate(localMsgs);
    return () => {};
  }

  try {
    const q = query(
      collection(db, COLLECTION_PATH),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreMsgs: FeedbackMessage[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FeedbackMessage, 'id'>),
        }));

        // Merge Firestore messages with any local pending messages not yet in snapshot
        const allMsgs = [...firestoreMsgs];
        localMsgs.forEach((lm) => {
          if (!allMsgs.some(fm => fm.message === lm.message && fm.senderEmail === lm.senderEmail)) {
            allMsgs.push(lm);
          }
        });

        onUpdate(allMsgs);
      },
      (error) => {
        console.warn('Feedback message listener fallback to local:', error);
        onUpdate(localMsgs);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Feedback subscription init error, fallback to local:', error);
    onUpdate(localMsgs);
    return () => {};
  }
}

/**
 * Updates message status (e.g. mark as 'read' or 'resolved').
 */
export async function updateMessageStatus(
  messageId: string,
  status: 'new' | 'read' | 'resolved'
): Promise<void> {
  const path = `${COLLECTION_PATH}/${messageId}`;
  try {
    if (db && !messageId.startsWith('local_')) {
      const docRef = doc(db, COLLECTION_PATH, messageId);
      await updateDoc(docRef, { status });
    }
    // Update local cache
    const localMsgs = getLocalMessages();
    const updated = localMsgs.map(m => m.id === messageId ? { ...m, status } : m);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Deletes a message.
 */
export async function deleteFeedbackMessage(messageId: string): Promise<void> {
  const path = `${COLLECTION_PATH}/${messageId}`;
  try {
    if (db && !messageId.startsWith('local_')) {
      const docRef = doc(db, COLLECTION_PATH, messageId);
      await deleteDoc(docRef);
    }
    // Delete from local cache
    const localMsgs = getLocalMessages();
    const filtered = localMsgs.filter(m => m.id !== messageId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
