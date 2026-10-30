import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

export interface VectorFeedback {
  query: string;
  responseText: string;
  rating: 'thumbs-up' | 'thumbs-down';
  timestamp: any;
  userId: string;
}

const COLLECTION_PATH = 'vector_feedback';

/**
 * Submits feedback on a RAG-grounded AI response.
 */
export async function sendVectorFeedback(data: {
  query: string;
  responseText: string;
  rating: 'thumbs-up' | 'thumbs-down';
}): Promise<string | null> {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User must be signed in to provide feedback.');
  }

  const payload: VectorFeedback = {
    query: data.query,
    responseText: data.responseText,
    rating: data.rating,
    timestamp: serverTimestamp(),
    userId: currentUser.uid,
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_PATH), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_PATH);
    return null;
  }
}
