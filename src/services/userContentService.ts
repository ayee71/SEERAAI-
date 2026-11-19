import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';

export interface SavedLegalContent {
  id: string;
  type: 'generated_content' | 'translation_history' | 'project_work';
  title: string;
  content: string; // Trilingual content structure stringified
  timestamp: Timestamp;
}

export const saveUserContent = async (userId: string, content: SavedLegalContent): Promise<void> => {
  const userContentRef = doc(db, 'user_content', userId);
  await setDoc(userContentRef, {
    items: arrayUnion(content)
  }, { merge: true });
};

export const getUserContent = async (userId: string): Promise<SavedLegalContent[]> => {
  const userContentRef = doc(db, 'user_content', userId);
  const snap = await getDoc(userContentRef);
  if (snap.exists()) {
    return snap.data().items || [];
  }
  return [];
};
