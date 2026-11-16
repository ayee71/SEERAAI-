import { db, auth } from './firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Annotation } from './storage';
import { isWriteLocked, trackInFlightWrite } from './signOutSafetyService';

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
  if (typeof window === 'undefined' || isWriteLocked()) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export async function addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt'>): Promise<string> {
  if (isWriteLocked()) {
    throw new Error('SIGN_OUT_WRITE_LOCKED:addAnnotation');
  }
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
  if (auth.currentUser && !isWriteLocked()) {
    await trackInFlightWrite('firestore:addAnnotation', (async () => {
      try {
        await addDoc(collection(db, 'annotations'), {
          ...fullAnn,
          userId: auth.currentUser!.uid,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firestore annotation sync deferred:', e);
      }
    })());
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
  if (isWriteLocked()) return;
  // Delete locally
  const localList = getLocalAnnotations().filter((a) => a.id !== annotationId);
  saveLocalAnnotations(localList);

  if (auth.currentUser) {
    await trackInFlightWrite('firestore:deleteAnnotation', (async () => {
      try {
        await deleteDoc(doc(db, 'annotations', annotationId));
      } catch (e) {
        console.warn('Could not delete annotation from Firestore:', e);
      }
    })());
  }
}

export async function addCommentReply(
  annotationId: string,
  reply: { authorName: string; authorRole?: string; content: string }
): Promise<void> {
  if (isWriteLocked()) return;
  const localList = getLocalAnnotations();
  const index = localList.findIndex((a) => a.id === annotationId);
  if (index === -1) return;

  const existing = localList[index];
  const newReply = {
    id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    authorName: reply.authorName,
    authorRole: reply.authorRole,
    content: reply.content,
    createdAt: new Date().toISOString(),
  };

  const updatedReplies = [...(existing.replies || []), newReply];
  localList[index] = { ...existing, replies: updatedReplies };
  saveLocalAnnotations(localList);
}

export async function toggleAnnotationStatus(
  annotationId: string,
  resolvedBy?: string
): Promise<'open' | 'resolved'> {
  if (isWriteLocked()) return 'open';
  const localList = getLocalAnnotations();
  const index = localList.findIndex((a) => a.id === annotationId);
  if (index === -1) return 'open';

  const existing = localList[index];
  const nextStatus: 'open' | 'resolved' = existing.status === 'resolved' ? 'open' : 'resolved';

  localList[index] = {
    ...existing,
    status: nextStatus,
    resolvedBy: nextStatus === 'resolved' ? (resolvedBy || 'Team Member') : undefined,
    resolvedAt: nextStatus === 'resolved' ? new Date().toISOString() : undefined,
  };

  saveLocalAnnotations(localList);
  return nextStatus;
}
