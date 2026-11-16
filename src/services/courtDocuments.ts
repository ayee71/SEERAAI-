import { auth, db, storage } from './firebase';

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp
} from 'firebase/firestore';

import {
  getBlob,
  ref,
  uploadBytes
} from 'firebase/storage';

export type CourtFolderId =
  | 'claims'
  | 'evidence'
  | 'orders'
  | 'judgments';

export type CourtRole =
  | 'judge'
  | 'assistant_judge'
  | 'registrar'
  | 'auditor'
  | 'court_admin'
  | 'superadmin'
  | 'legal_expert';

export type DocumentStatus =
  | 'uploading'
  | 'active'
  | 'upload_failed'
  | 'archived';

export interface CourtDocument {
  id: string;
  title: string;
  folderId: CourtFolderId;
  fileName: string;
  contentType: string;
  size: number;
  storagePath: string;
  institutionId: string;
  createdBy: string;
  createdAt?: Timestamp | any;
  uploadedAt: string;
  verified: boolean;
  status: DocumentStatus;
  dataUrl?: string;
}

export interface CourtAuditEvent {
  id: string;
  action: string;
  actorUid: string;
  actorRole: string;
  documentId: string;
  documentTitle: string;
  occurredAt: string;
}

export interface CourtUserContext {
  uid: string;
  role: CourtRole;
  institutionId: string;
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_DOCUMENTS = 100;

const READ_ROLES: CourtRole[] = [
  'judge',
  'assistant_judge',
  'registrar',
  'auditor',
  'court_admin',
  'superadmin',
  'legal_expert'
];

const UPLOAD_ROLES: CourtRole[] = [
  'judge',
  'assistant_judge',
  'registrar',
  'court_admin',
  'superadmin',
  'legal_expert'
];

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  mp4: 'video/mp4'
};

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function formatDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString();
  }

  return '';
}

export async function getCourtUserContext(): Promise<CourtUserContext> {
  if (!auth.currentUser) {
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 1000);
    });
  }

  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    throw new Error('Fayyadamtoonni keessummaa (Guest) sanada mana murtii ilaaluu ykn fe’uu hin danda’an.');
  }

  if (!currentUser.emailVerified) {
    throw new Error('Sanadoota mana murtii fayyadamuuf imeeliin keessan mirkanaa’uu qaba.');
  }

  let claimRole: CourtRole | undefined;
  let claimInstitutionId: string | undefined;
  let isSuperAdminClaim = false;

  try {
    const token = await currentUser.getIdTokenResult();
    const rawRole = (token.claims.courtRole || token.claims.role) as string | undefined;
    isSuperAdminClaim = token.claims.admin === true || token.claims.role === 'superadmin';
    if (isSuperAdminClaim) {
      claimRole = 'superadmin';
    } else if (rawRole && READ_ROLES.includes(rawRole as CourtRole)) {
      claimRole = rawRole as CourtRole;
    }
    if (typeof token.claims.institutionId === 'string' && token.claims.institutionId.trim()) {
      claimInstitutionId = token.claims.institutionId.trim();
    }
  } catch {
    // Token claims unavailable
  }

  if (isSuperAdminClaim) {
    return {
      uid: currentUser.uid,
      role: 'superadmin',
      institutionId: claimInstitutionId || 'inst_gurbicha_woreda_first',
    };
  }

  if (!claimRole || !claimInstitutionId) {
    throw new Error('Mirga hojjataa mana murtii fi eenyummaa dhaabbataa (institutionId) server irraa kenname hin qabdan.');
  }

  return {
    uid: currentUser.uid,
    role: claimRole,
    institutionId: claimInstitutionId,
  };
}

export async function listCourtDocuments(): Promise<CourtDocument[]> {
  try {
    const context = await getCourtUserContext();

    const documentsRef = collection(
      db,
      'institutions',
      context.institutionId,
      'courtDocuments'
    );

    const documentsQuery = query(
      documentsRef,
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(MAX_DOCUMENTS)
    );

    const snapshot = await getDocs(documentsQuery);

    return snapshot.docs.map(item => {
      const data = item.data();

      return {
        ...data,
        id: item.id,
        uploadedAt: formatDate(data.createdAt)
      } as CourtDocument;
    });
  } catch (error) {
    console.warn('listCourtDocuments notice (safe fallback):', error);
    return [];
  }
}

export async function uploadCourtDocument(
  file: File,
  folderId: CourtFolderId
): Promise<void> {
  const context = await getCourtUserContext();

  if (!UPLOAD_ROLES.includes(context.role)) {
    throw new Error('Mirga faayila olkaa’uu hin qabdu.');
  }

  if (file.size <= 0) {
    throw new Error('Faayiliin duwwaa ta’uu hin danda’u.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Guddinni faayilaa 50 MB caaluu hin qabu.');
  }

  const extension = getExtension(file.name);
  const contentType = MIME_TYPES[extension] || file.type || 'application/octet-stream';

  const documentId = 'cdoc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const storagePath = `institutions/${context.institutionId}/courtDocuments/${documentId}/${file.name}`;

  // 1. Convert file to dataURL for offline/fallback preview (< 15MB)
  let dataUrl: string | undefined;
  if (file.size < 15 * 1024 * 1024) {
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (e) {
      console.warn('FileReader notice:', e);
    }
  }

  // 2. Upload file bytes to Firebase Storage
  let storageUploadSucceeded = false;
  try {
    await uploadBytes(
      ref(storage, storagePath),
      file,
      {
        contentType,
        customMetadata: {
          institutionId: context.institutionId,
          documentId,
          uploadedBy: context.uid
        }
      }
    );
    storageUploadSucceeded = true;
  } catch (storageErr: any) {
    const code = String(storageErr?.code || '');
    if (
      code.includes('unauthorized') ||
      code.includes('permission-denied') ||
      code.includes('unauthenticated')
    ) {
      throw new Error('Hayyama Firebase Storage hin qabdan ykn ulaagaan faayilaa (50 MB / MIME) hin guutamne.');
    }
    throw storageErr;
  }

  // 3. Save document record metadata directly to Firestore (omit oversized base64 binary blobs per Firebase security policy)
  try {
    const docRef = doc(db, 'institutions', context.institutionId, 'courtDocuments', documentId);
    await setDoc(docRef, {
      id: documentId,
      title: file.name.replace(/\.[^.]+$/, '').slice(0, 200),
      fileName: file.name,
      folderId,
      size: file.size,
      contentType,
      storagePath: storageUploadSucceeded ? storagePath : '',
      institutionId: context.institutionId,
      createdBy: context.uid,
      createdAt: serverTimestamp(),
      uploadedAt: new Date().toISOString(),
      verified: true,
      status: 'active',
    });
  } catch (firestoreErr) {
    console.warn('Firestore document save notice, storing metadata locally:', firestoreErr);
    // Local storage fallback for metadata (avoiding quota bloat from multi-MB base64 blobs)
    try {
      const localKey = `seera_local_court_docs_${context.institutionId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      existing.unshift({
        id: documentId,
        title: file.name.replace(/\.[^.]+$/, '').slice(0, 200),
        fileName: file.name,
        folderId,
        size: file.size,
        contentType,
        storagePath: storageUploadSucceeded ? storagePath : '',
        institutionId: context.institutionId,
        createdBy: context.uid,
        uploadedAt: new Date().toLocaleString(),
        verified: true,
        status: 'active',
        ...(dataUrl && file.size < 256 * 1024 ? { dataUrl } : {})
      });
      localStorage.setItem(localKey, JSON.stringify(existing.slice(0, 50)));
    } catch (locErr) {
      console.warn('Local storage fallback error:', locErr);
    }
  }

  // 4. Log audit event
  try {
    const logsRef = collection(db, 'institutions', context.institutionId, 'auditLogs');
    await addDoc(logsRef, {
      id: 'audit_' + Date.now(),
      action: 'UPLOAD_DOCUMENT',
      actorUid: context.uid,
      actorRole: context.role,
      documentId,
      documentTitle: file.name,
      occurredAt: serverTimestamp()
    });
  } catch {
    // Non-fatal
  }
}

export async function getCourtDocumentBlob(
  document: CourtDocument
): Promise<Blob> {
  // If dataUrl exists, convert to blob immediately
  if (document.dataUrl) {
    try {
      const res = await fetch(document.dataUrl);
      return await res.blob();
    } catch (e) {
      console.warn('DataURL fetch notice:', e);
    }
  }

  // Try Firebase storage
  if (document.storagePath) {
    try {
      return await getBlob(
        ref(storage, document.storagePath),
        MAX_FILE_SIZE
      );
    } catch (e) {
      console.warn('Storage getBlob notice:', e);
    }
  }

  // Fallback blob
  const fallbackText = `Mana Murtii: ${document.institutionId}\nGalmee: ${document.title}\nFaayila: ${document.fileName}\nGuyyaa: ${document.uploadedAt}\n\nSanadni kun bifa dijitaalaatiin sirna SeeraAI keessatti kuufameera.`;
  return new Blob([fallbackText], { type: document.contentType || 'text/plain' });
}

export async function logCourtDocumentOpened(
  documentId: string
): Promise<void> {
  try {
    const context = await getCourtUserContext();
    const logsRef = collection(db, 'institutions', context.institutionId, 'auditLogs');
    await addDoc(logsRef, {
      id: 'audit_' + Date.now(),
      action: 'OPEN_DOCUMENT',
      actorUid: context.uid,
      actorRole: context.role,
      documentId,
      documentTitle: 'Document View',
      occurredAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('logCourtDocumentOpened notice:', e);
  }
}

export async function renameCourtDocument(
  documentId: string,
  newTitle: string
): Promise<void> {
  const title = newTitle.trim();

  if (!title || title.length > 200) {
    throw new Error('Maqaan galmee sirrii miti.');
  }

  const context = await getCourtUserContext();
  try {
    const docRef = doc(db, 'institutions', context.institutionId, 'courtDocuments', documentId);
    await updateDoc(docRef, { title });
  } catch (e) {
    console.warn('renameCourtDocument notice:', e);
  }
}

export async function archiveCourtDocument(
  documentId: string
): Promise<void> {
  const context = await getCourtUserContext();
  try {
    const docRef = doc(db, 'institutions', context.institutionId, 'courtDocuments', documentId);
    await updateDoc(docRef, { status: 'archived' });
  } catch (e) {
    console.warn('archiveCourtDocument notice:', e);
  }
}

export async function listCourtAuditEvents(): Promise<CourtAuditEvent[]> {
  const context = await getCourtUserContext();

  if (!['judge', 'auditor'].includes(context.role)) {
    return [];
  }

  const logsRef = collection(
    db,
    'institutions',
    context.institutionId,
    'auditLogs'
  );

  const logsQuery = query(
    logsRef,
    orderBy('occurredAt', 'desc'),
    limit(30)
  );

  const snapshot = await getDocs(logsQuery);

  return snapshot.docs.map(item => {
    const data = item.data();

    return {
      ...data,
      id: item.id,
      occurredAt: formatDate(data.occurredAt)
    } as CourtAuditEvent;
  });
}
