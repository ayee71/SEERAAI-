"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courtDocumentAudit = exports.logCourtDocumentOpened = exports.archiveCourtDocument = exports.renameCourtDocument = exports.failCourtDocumentUpload = exports.completeCourtDocumentUpload = exports.beginCourtDocumentUpload = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const app = (0, app_1.getApps)().length
    ? (0, app_1.getApps)()[0]
    : (0, app_1.initializeApp)({
        projectId: 'leafy-rush-xvd6f'
    });
const DATABASE_ID = 'ai-studio-seeraaitrilingua-18431532-f42a-4a5a-b5b1-c3c0e6b05478';
const db = (0, firestore_1.getFirestore)(app, DATABASE_ID);
const bucket = (0, storage_1.getStorage)(app).bucket();
const REGION = 'europe-west3';
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ROLES = {
    read: ['judge', 'assistant_judge', 'registrar', 'auditor'],
    upload: ['judge', 'assistant_judge', 'registrar'],
    edit: ['judge', 'assistant_judge'],
    archive: ['judge']
};
const MIME_TYPES = {
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
const FOLDERS = [
    'claims',
    'evidence',
    'orders',
    'judgments'
];
function requireUser(request, allowedRoles) {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Seenuun barbaachisa.');
    }
    const uid = request.auth.uid;
    const token = request.auth.token;
    const role = String(token.role || '');
    const institutionId = String(token.institutionId || '');
    if (!allowedRoles.includes(role)) {
        throw new https_1.HttpsError('permission-denied', 'Mirgi fayyadamaa hin hayyamamne.');
    }
    if (!institutionId) {
        throw new https_1.HttpsError('failed-precondition', 'Institution ID hin argamne.');
    }
    return {
        uid,
        role,
        institutionId
    };
}
function courtDocumentRef(institutionId, documentId) {
    return db
        .collection('institutions')
        .doc(institutionId)
        .collection('courtDocuments')
        .doc(documentId);
}
function auditCollection(institutionId) {
    return db
        .collection('institutions')
        .doc(institutionId)
        .collection('auditLogs');
}
function getSafeFileName(name) {
    return name
        .replace(/[\\/]/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 180);
}
function getExpectedType(fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return MIME_TYPES[extension] || '';
}
// 1. CREATE SECURE UPLOAD RECORD.
exports.beginCourtDocumentUpload = (0, https_1.onCall)({
    region: REGION
}, async (request) => {
    const user = requireUser(request, ROLES.upload);
    const { title, fileName, folderId, size, contentType } = request.data || {};
    if (typeof title !== 'string' ||
        typeof fileName !== 'string' ||
        typeof folderId !== 'string' ||
        typeof contentType !== 'string' ||
        typeof size !== 'number') {
        throw new https_1.HttpsError('invalid-argument', 'Odeeffannoon faayilaa guutuu miti.');
    }
    if (!FOLDERS.includes(folderId) ||
        !title.trim() ||
        title.length > 200) {
        throw new https_1.HttpsError('invalid-argument', 'Folder ykn maqaa galmee sirreessi.');
    }
    if (!Number.isSafeInteger(size) ||
        size <= 0 ||
        size > MAX_FILE_SIZE) {
        throw new https_1.HttpsError('invalid-argument', 'Guddinni faayilaa 50 MB caaluu hin qabu.');
    }
    const safeName = getSafeFileName(fileName);
    if (!safeName || getExpectedType(safeName) !== contentType) {
        throw new https_1.HttpsError('invalid-argument', 'Maqaa fi gosa faayilaa wal hin siman.');
    }
    const documents = db
        .collection('institutions')
        .doc(user.institutionId)
        .collection('courtDocuments');
    const documentRef = documents.doc();
    const storagePath = `institutions/${user.institutionId}` +
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: user.uid,
        updatedByRole: user.role,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        verified: false,
        status: 'uploading'
    });
    return {
        documentId: documentRef.id,
        storagePath
    };
});
// 2. VERIFY OBJECT AND COMPLETE UPLOAD.
exports.completeCourtDocumentUpload = (0, https_1.onCall)({
    region: REGION
}, async (request) => {
    const user = requireUser(request, ROLES.upload);
    const documentId = request.data?.documentId;
    if (typeof documentId !== 'string' ||
        documentId.length < 10) {
        throw new https_1.HttpsError('invalid-argument', 'Document ID sirrii miti.');
    }
    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();
    if (!snapshot.exists) {
        throw new https_1.HttpsError('not-found', 'Galmeen hin argamne.');
    }
    const data = snapshot.data();
    if (data.createdBy !== user.uid) {
        throw new https_1.HttpsError('permission-denied', 'Faayila nama biraa xumuruun hin hayyamamu.');
    }
    if (data.status === 'active') {
        return { success: true };
    }
    if (data.status !== 'uploading') {
        throw new https_1.HttpsError('failed-precondition', 'Haalli upload sirrii miti.');
    }
    let metadata;
    try {
        const file = bucket.file(data.storagePath);
        [metadata] = await file.getMetadata();
    }
    catch {
        throw new https_1.HttpsError('failed-precondition', 'Faayilli Storage keessatti hin argamne.');
    }
    const custom = metadata.metadata || {};
    const uploadedSize = Number(metadata.size);
    if (custom.institutionId !== user.institutionId ||
        custom.documentId !== documentId ||
        custom.uploadedBy !== user.uid ||
        metadata.contentType !== data.contentType ||
        uploadedSize !== data.size ||
        uploadedSize > MAX_FILE_SIZE) {
        throw new https_1.HttpsError('permission-denied', 'Mirkaneessi faayilaa hin milkoofne.');
    }
    await db.runTransaction(async (transaction) => {
        const freshSnapshot = await transaction.get(documentRef);
        if (!freshSnapshot.exists) {
            throw new https_1.HttpsError('not-found', 'Galmeen badeera.');
        }
        const fresh = freshSnapshot.data();
        if (fresh.status === 'active')
            return;
        if (fresh.status !== 'uploading' ||
            fresh.createdBy !== user.uid) {
            throw new https_1.HttpsError('failed-precondition', 'Haalli galmee jijjiirameera.');
        }
        transaction.update(documentRef, {
            status: 'active',
            updatedBy: user.uid,
            updatedByRole: user.role,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
    });
    return { success: true };
});
// 3. MARK FAILED UPLOAD.
exports.failCourtDocumentUpload = (0, https_1.onCall)({
    region: REGION
}, async (request) => {
    const user = requireUser(request, ROLES.upload);
    const documentId = request.data?.documentId;
    if (typeof documentId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Document ID dogoggora.');
    }
    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();
    if (!snapshot.exists) {
        return { success: true };
    }
    const data = snapshot.data();
    if (data.createdBy !== user.uid ||
        data.status !== 'uploading') {
        return { success: true };
    }
    await documentRef.update({
        status: 'upload_failed',
        updatedBy: user.uid,
        updatedByRole: user.role,
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    return { success: true };
});
// 4. RENAME DOCUMENT.
exports.renameCourtDocument = (0, https_1.onCall)({
    region: REGION
}, async (request) => {
    const user = requireUser(request, ROLES.edit);
    const { documentId, title } = request.data || {};
    if (typeof documentId !== 'string' ||
        typeof title !== 'string' ||
        !title.trim() ||
        title.trim().length > 200) {
        throw new https_1.HttpsError('invalid-argument', 'Maqaa galmee sirreessi.');
    }
    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();
    if (!snapshot.exists ||
        snapshot.data()?.status !== 'active') {
        throw new https_1.HttpsError('not-found', 'Galmeen hin argamne.');
    }
    await documentRef.update({
        title: title.trim(),
        updatedBy: user.uid,
        updatedByRole: user.role,
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    return { success: true };
});
// 5. ARCHIVE DOCUMENT.
exports.archiveCourtDocument = (0, https_1.onCall)({
    region: REGION
}, async (request) => {
    const user = requireUser(request, ROLES.archive);
    const documentId = request.data?.documentId;
    if (typeof documentId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Document ID dogoggora.');
    }
    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();
    if (!snapshot.exists ||
        snapshot.data()?.status !== 'active') {
        throw new https_1.HttpsError('not-found', 'Galmeen hin argamne.');
    }
    await documentRef.update({
        status: 'archived',
        archivedBy: user.uid,
        archivedByRole: user.role,
        archivedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: user.uid,
        updatedByRole: user.role,
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    return { success: true };
});
// 6. LOG DOCUMENT OPENING WITH AN IDEMPOTENCY KEY.
exports.logCourtDocumentOpened = (0, https_1.onCall)({
    region: REGION
}, async (request) => {
    const user = requireUser(request, ROLES.read);
    const { documentId, institutionId, eventId } = request.data || {};
    if (institutionId !== user.institutionId ||
        typeof documentId !== 'string' ||
        typeof eventId !== 'string' ||
        !/^[a-f0-9-]{36}$/i.test(eventId)) {
        throw new https_1.HttpsError('invalid-argument', 'Odeeffannoon audit sirrii miti.');
    }
    const documentRef = courtDocumentRef(user.institutionId, documentId);
    const snapshot = await documentRef.get();
    if (!snapshot.exists ||
        snapshot.data()?.status !== 'active') {
        throw new https_1.HttpsError('not-found', 'Galmeen hin argamne ykn hin banamu.');
    }
    const data = snapshot.data();
    const eventRef = auditCollection(user.institutionId)
        .doc(`open_${eventId}`);
    await eventRef.create({
        institutionId: user.institutionId,
        documentId,
        documentTitle: data.title,
        folderId: data.folderId,
        action: 'DOCUMENT_OPENED',
        actorUid: user.uid,
        actorRole: user.role,
        occurredAt: firestore_1.FieldValue.serverTimestamp()
    }).catch(error => {
        if (error.code !== 6 &&
            error.code !== 'already-exists') {
            throw error;
        }
    });
    return { success: true };
});
// 7. AUTOMATIC AUDIT FOR DOCUMENT CHANGES.
exports.courtDocumentAudit = (0, firestore_2.onDocumentWritten)({
    document: 'institutions/{institutionId}/courtDocuments/{documentId}',
    database: DATABASE_ID,
    region: REGION
}, async (event) => {
    // Logic for tracking changes (create, update, archive) can be added here
});
//# sourceMappingURL=index.js.map