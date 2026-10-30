import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

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
  metadata?: Record<string, any>;
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
