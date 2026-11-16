import { FieldValue } from 'firebase-admin/firestore';
import {
  onCall,
  HttpsError
} from 'firebase-functions/v2/https';
import {
  onDocumentWritten
} from 'firebase-functions/v2/firestore';
import type {
  CallableRequest
} from 'firebase-functions/v2/https';

// These should be passed or imported if needed, but for simplicity in this script 
// we will assume they are available in the scope where this is imported or we'll define them.
// In a real split, we'd export them from a common file.

export const REGION = 'europe-west3';
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const DATABASE_ID = 'ai-studio-seeraaitrilingua-18431532-f42a-4a5a-b5b1-c3c0e6b05478';

export const ROLES = {
  read: ['judge', 'assistant_judge', 'registrar', 'auditor', 'court_admin', 'legal_expert'],
  upload: ['judge', 'assistant_judge', 'registrar', 'court_admin', 'legal_expert'],
  edit: ['judge', 'assistant_judge', 'court_admin'],
  archive: ['judge', 'court_admin']
};

export const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4'
};

export const FOLDERS = [
  'claims',
  'evidence',
  'orders',
  'judgments'
];

interface UserContext {
  uid: string;
  role: string;
  institutionId: string;
}

export function requireUser(
  request: CallableRequest,
  allowedRoles: string[]
): UserContext {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Seenuun barbaachisa.'
    );
  }

  const uid = request.auth.uid;
  const token = request.auth.token;

  if (token.firebase?.sign_in_provider === 'anonymous' || token.email_verified !== true) {
    throw new HttpsError(
      'permission-denied',
      'Email verified non-anonymous institutional account is required.'
    );
  }

  const role = String(token.role || token.courtRole || '');
  const institutionId = String(token.institutionId || '');

  if (!allowedRoles.includes(role)) {
    throw new HttpsError(
      'permission-denied',
      'Mirgi fayyadamaa hin hayyamamne.'
    );
  }

  if (!institutionId) {
    throw new HttpsError(
      'failed-precondition',
      'Institution ID hin argamne.'
    );
  }

  return {
    uid,
    role,
    institutionId
  };
}

export function getSafeFileName(name: string): string {
  return name
    .replace(/[\\/]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 180);
}

export function getExpectedType(fileName: string): string {
  const extension =
    fileName.split('.').pop()?.toLowerCase() || '';

  return MIME_TYPES[extension] || '';
}

// Accessor for DB and Bucket - in a real app, these would be initialized in a shared module.
// For now, we'll import them from index or assume they are passed.
// To keep it simple and working, we'll re-initialize them if needed or expect them to be injected.
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const app = getApps().length ? getApps()[0] : initializeApp();
const db = getFirestore(app, DATABASE_ID);
const bucket = getStorage(app).bucket();

function courtDocumentRef(
  institutionId: string,
  documentId: string
) {
  return db
    .collection('institutions')
    .doc(institutionId)
    .collection('courtDocuments')
    .doc(documentId);
}

function auditCollection(institutionId: string) {
  return db
    .collection('institutions')
    .doc(institutionId)
    .collection('auditLogs');
}

// 1. CREATE SECURE UPLOAD RECORD.
export const beginCourtDocumentUpload = onCall(
  { region: REGION },
  async request => {
    const user = requireUser(request, ROLES.upload);

    const {
      title,
      fileName,
      folderId,
      size,
      contentType
    } = request.data || {};

    if (
      typeof title !== 'string' ||
      typeof fileName !== 'string' ||
      typeof folderId !== 'string' ||
      typeof contentType !== 'string' ||
      typeof size !== 'number'
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Odeeffannoon faayilaa guutuu miti.'
      );
    }

    if (
      !FOLDERS.includes(folderId) ||
      !title.trim() ||
      title.length > 200
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Folder ykn maqaa galmee sirreessi.'
      );
    }

    if (
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > MAX_FILE_SIZE
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Guddinni faayilaa 50 MB caaluu hin qabu.'
      );
    }

    const safeName = getSafeFileName(fileName);

    if (!safeName || getExpectedType(safeName) !== contentType) {
      throw new HttpsError(
        'invalid-argument',
        'Maqaa fi gosa faayilaa wal hin siman.'
      );
    }

    const documents = db
      .collection('institutions')
      .doc(user.institutionId)
      .collection('courtDocuments');

    const documentRef = documents.doc();

    const storagePath =
      `institutions/${user.institutionId}` +
      `/courtDocuments/${documentRef.id}/${safeName}`;

    await documentRef.create({
      id: documentRef.id,
      title: title.trim(),
      folderId,
      fileName: safeName,
      contentType,
      size,
      storagePath,
      institutionId: user.institutionId,

      createdBy: user.uid,
      createdByRole: user.role,
      createdAt: FieldValue.serverTimestamp(),

      updatedBy: user.uid,
      updatedByRole: user.role,
      updatedAt: FieldValue.serverTimestamp(),

      verified: false,
      status: 'uploading'
    });

    return {
      documentId: documentRef.id,
      storagePath
    };
  }
);

// 2. VERIFY OBJECT AND COMPLETE UPLOAD.
export const completeCourtDocumentUpload = onCall(
  { region: REGION },
  async request => {
    const user = requireUser(request, ROLES.upload);
    const documentId = request.data?.documentId;

    if (typeof documentId !== 'string' || documentId.length < 10) {
      throw new HttpsError('invalid-argument', 'Document ID sirrii miti.');
    }

    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Galmeen hin argamne.');
    }

    const data = snapshot.data()!;

    if (data.createdBy !== user.uid) {
      throw new HttpsError(
        'permission-denied',
        'Faayila nama biraa xumuruun hin hayyamamu.'
      );
    }

    if (data.status === 'active') {
      return { success: true };
    }

    if (data.status !== 'uploading') {
      throw new HttpsError('failed-precondition', 'Haalli upload sirrii miti.');
    }

    let metadata: any;
    try {
      const file = bucket.file(data.storagePath);
      [metadata] = await file.getMetadata();
    } catch {
      throw new HttpsError(
        'failed-precondition',
        'Faayilli Storage keessatti hin argamne.'
      );
    }

    const custom = metadata.metadata || {};
    const uploadedSize = Number(metadata.size);

    if (
      custom.institutionId !== user.institutionId ||
      custom.documentId !== documentId ||
      custom.uploadedBy !== user.uid ||
      metadata.contentType !== data.contentType ||
      uploadedSize !== data.size ||
      uploadedSize > MAX_FILE_SIZE
    ) {
      throw new HttpsError('permission-denied', 'Mirkaneessi faayilaa hin milkoofne.');
    }

    await db.runTransaction(async transaction => {
      const freshSnapshot = await transaction.get(documentRef);
      if (!freshSnapshot.exists) {
        throw new HttpsError('not-found', 'Galmeen badeera.');
      }
      const fresh = freshSnapshot.data()!;
      if (fresh.status === 'active') return;
      if (fresh.status !== 'uploading' || fresh.createdBy !== user.uid) {
        throw new HttpsError('failed-precondition', 'Haalli galmee jijjiirameera.');
      }
      transaction.update(documentRef, {
        status: 'active',
        updatedBy: user.uid,
        updatedByRole: user.role,
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    return { success: true };
  }
);

// 3. MARK FAILED UPLOAD.
export const failCourtDocumentUpload = onCall(
  { region: REGION },
  async request => {
    const user = requireUser(request, ROLES.upload);
    const documentId = request.data?.documentId;

    if (typeof documentId !== 'string') {
      throw new HttpsError('invalid-argument', 'Document ID dogoggora.');
    }

    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();

    if (!snapshot.exists) return { success: true };
    const data = snapshot.data()!;
    if (data.createdBy !== user.uid || data.status !== 'uploading') return { success: true };

    await documentRef.update({
      status: 'upload_failed',
      updatedBy: user.uid,
      updatedByRole: user.role,
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };
  }
);

// 4. RENAME DOCUMENT.
export const renameCourtDocument = onCall(
  { region: REGION },
  async request => {
    const user = requireUser(request, ROLES.edit);
    const { documentId, title } = request.data || {};

    if (
      typeof documentId !== 'string' ||
      typeof title !== 'string' ||
      !title.trim() ||
      title.trim().length > 200
    ) {
      throw new HttpsError('invalid-argument', 'Maqaa galmee sirreessi.');
    }

    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();

    if (!snapshot.exists || snapshot.data()?.status !== 'active') {
      throw new HttpsError('not-found', 'Galmeen hin argamne.');
    }

    await documentRef.update({
      title: title.trim(),
      updatedBy: user.uid,
      updatedByRole: user.role,
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };
  }
);

// 5. ARCHIVE DOCUMENT.
export const archiveCourtDocument = onCall(
  { region: REGION },
  async request => {
    const user = requireUser(request, ROLES.archive);
    const documentId = request.data?.documentId;

    if (typeof documentId !== 'string') {
      throw new HttpsError('invalid-argument', 'Document ID dogoggora.');
    }

    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();

    if (!snapshot.exists || snapshot.data()?.status !== 'active') {
      throw new HttpsError('not-found', 'Galmeen hin argamne.');
    }

    await documentRef.update({
      status: 'archived',
      archivedBy: user.uid,
      archivedByRole: user.role,
      archivedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
      updatedByRole: user.role,
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };
  }
);

// 6. LOG DOCUMENT OPENING WITH AN IDEMPOTENCY KEY.
export const logCourtDocumentOpened = onCall(
  { region: REGION },
  async request => {
    const user = requireUser(request, ROLES.read);
    const { documentId, institutionId, eventId } = request.data || {};

    if (
      institutionId !== user.institutionId ||
      typeof documentId !== 'string' ||
      typeof eventId !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(eventId)
    ) {
      throw new HttpsError('invalid-argument', 'Odeeffannoon audit sirrii miti.');
    }

    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();

    if (!snapshot.exists || snapshot.data()?.status !== 'active') {
      throw new HttpsError('not-found', 'Galmeen hin argamne ykn hin banamu.');
    }

    const data = snapshot.data()!;
    const eventRef = auditCollection(user.institutionId).doc(`open_${eventId}`);

    await eventRef.create({
      institutionId: user.institutionId,
      documentId,
      documentTitle: data.title,
      folderId: data.folderId,
      action: 'DOCUMENT_OPENED',
      actorUid: user.uid,
      actorRole: user.role,
      occurredAt: FieldValue.serverTimestamp()
    }).catch(error => {
      if (error.code !== 6 && error.code !== 'already-exists') throw error;
    });

    return { success: true };
  }
);

// 7. AUTOMATIC AUDIT FOR DOCUMENT CHANGES.
export const courtDocumentAudit = onDocumentWritten(
  {
    document: 'institutions/{institutionId}/courtDocuments/{documentId}',
    database: DATABASE_ID,
    region: REGION
  },
  async event => {
    const { institutionId, documentId } = event.params;
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    let action = 'DOCUMENT_UPDATED';
    if (!beforeData && afterData) action = 'DOCUMENT_CREATED';
    else if (beforeData && !afterData) action = 'DOCUMENT_DELETED';
    else if (beforeData?.status !== 'archived' && afterData?.status === 'archived') action = 'DOCUMENT_ARCHIVED';
    else if (beforeData?.status === 'uploading' && afterData?.status === 'active') action = 'DOCUMENT_ACTIVATED';

    const payload = afterData || beforeData || {};
    await auditCollection(institutionId).add({
      institutionId,
      documentId,
      documentTitle: payload.title || payload.fileName || documentId,
      folderId: payload.folderId || null,
      action,
      actorUid: payload.updatedBy || payload.createdBy || 'system',
      actorRole: payload.updatedByRole || payload.createdByRole || 'system',
      occurredAt: FieldValue.serverTimestamp()
    });
  }
);
