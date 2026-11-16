import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, getDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore';

export interface FirestoreDocumentData {
  id: string;
  title?: string;
  content?: string;
  prompt?: string;
  context?: string;
  taskType?: string;
  userId?: string;
  userEmail?: string;
  updatedAt?: string | any;
  createdAt?: string | any;
  clientSyncNonce?: string;
  metadata?: Record<string, any>;
}

export interface VerifiedSyncResult {
  confirmed: boolean;
  serverConfirmedAt?: string;
  serverSyncNonce?: string;
  error?: string;
}

/**
 * Writes a user document to Firestore under 'user_documents/{docId}' and verifies server persistence via getDocFromServer.
 * Never claims cloud confirmation on cached/pending writes or swallowed errors.
 */
export async function saveDocumentToFirestoreVerified(
  docId: string,
  data: Partial<FirestoreDocumentData>
): Promise<VerifiedSyncResult> {
  const currentUser = auth.currentUser;
  if (!docId || !currentUser?.uid) {
    return { confirmed: false, error: 'AUTH_REQUIRED: No authenticated Firebase user for server write.' };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { confirmed: false, error: 'NETWORK_OFFLINE: Cannot verify Firestore server write while offline.' };
  }

  const nonce = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const docRef = doc(db, 'user_documents', docId);
  const payload = {
    ...data,
    id: docId,
    userId: currentUser.uid,
    userEmail: currentUser.email || data.userEmail || '',
    clientSyncNonce: nonce,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    const serverSnap = await getDocFromServer(docRef);
    if (!serverSnap.exists()) {
      return { confirmed: false, error: 'SERVER_VERIFY_MISSING: Document not found on server after write.' };
    }
    if (serverSnap.metadata.hasPendingWrites || serverSnap.metadata.fromCache) {
      return { confirmed: false, error: 'SERVER_VERIFY_PENDING: Write is still buffered locally, not committed on server.' };
    }
    const snapData = serverSnap.data();
    if (snapData?.userId !== currentUser.uid || snapData?.clientSyncNonce !== nonce) {
      return { confirmed: false, error: 'SERVER_VERIFY_MISMATCH: Owner UID or sync nonce mismatch on server.' };
    }

    return {
      confirmed: true,
      serverConfirmedAt: new Date().toISOString(),
      serverSyncNonce: nonce,
    };
  } catch (err: any) {
    return {
      confirmed: false,
      error: err?.message || 'FIRESTORE_WRITE_FAILED',
    };
  }
}

/**
 * Saves or updates a document draft directly in Firestore under 'user_documents'
 */
export async function saveDocumentToFirestore(
  docId: string,
  data: Partial<FirestoreDocumentData>
): Promise<void> {
  if (!docId) return;
  const docRef = doc(db, 'user_documents', docId);
  const payload = {
    ...data,
    id: docId,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `user_documents/${docId}`);
  }
}

/**
 * Saves a creation or editor draft in Firestore under 'document_drafts'
 */
export async function saveDraftToFirestore(
  draftId: string,
  data: Partial<FirestoreDocumentData>
): Promise<void> {
  if (!draftId) return;
  const docRef = doc(db, 'document_drafts', draftId);
  const payload = {
    ...data,
    id: draftId,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `document_drafts/${draftId}`);
  }
}

/**
 * Fetches a saved draft from Firestore
 */
export async function getDraftFromFirestore(draftId: string): Promise<FirestoreDocumentData | null> {
  if (!draftId) return null;
  const docRef = doc(db, 'document_drafts', draftId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirestoreDocumentData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `document_drafts/${draftId}`);
    return null;
  }
}
