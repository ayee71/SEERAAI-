import { db, auth } from './firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Annotation } from './storage';

const LOCAL_STORAGE_KEY = 'seera_ai_doc_annotations';

function getLocalAnnotations(): Annotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAnnotations(items: Annotation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export async function addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt'>): Promise<string> {
  const newId = `ann-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const createdAt = new Date().toISOString();
  const fullAnn: Annotation = {
    ...annotation,
    id: newId,
    createdAt,
    userId: auth.currentUser?.uid || 'local-user',
  };

  // 1. Always save locally first for instant reactivity & offline capability
  const localList = getLocalAnnotations();
  saveLocalAnnotations([fullAnn, ...localList]);

  // 2. Sync to Firestore if authenticated
  if (auth.currentUser) {
    try {
      await addDoc(collection(db, 'annotations'), {
        ...fullAnn,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore annotation sync deferred:', e);
    }
  }

  return newId;
}

export async function getAnnotations(documentId: string): Promise<Annotation[]> {
  const localList = getLocalAnnotations().filter((a) => a.documentId === documentId);

  if (!auth.currentUser) {
    return localList;
  }

  try {
    const q = query(
      collection(db, 'annotations'),
      where('documentId', '==', documentId),
      where('userId', '==', auth.currentUser.uid)
    );
    const querySnapshot = await getDocs(q);
    const remoteList = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Annotation));

    // Combine local & remote uniquely
    const map = new Map<string, Annotation>();
    localList.forEach((a) => map.set(a.id, a));
    remoteList.forEach((a) => map.set(a.id, a));

    return Array.from(map.values());
  } catch (e) {
    return localList;
  }
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  // Delete locally
  const localList = getLocalAnnotations().filter((a) => a.id !== annotationId);
  saveLocalAnnotations(localList);

  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, 'annotations', annotationId));
    } catch (e) {
      console.warn('Could not delete annotation from Firestore:', e);
    }
  }
}
