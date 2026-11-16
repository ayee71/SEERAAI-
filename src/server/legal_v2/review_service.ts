import { FieldValue } from 'firebase-admin/firestore';
import type { LegalContentDependencies, LegalReviewStatus } from './types.js';

export type LegalReviewerRole = 'admin' | 'judge' | 'legal_expert';

/**
 * Call only after the existing Firebase Auth + institution RBAC middleware has
 * verified this actor. Do not build reviewerRole from request-body data.
 */
export async function setLegalDocumentReviewStatus(args: {
  documentId: string;
  status: Exclude<LegalReviewStatus, 'pending_review'>;
  reviewer: { uid: string; role: LegalReviewerRole };
  reviewNote: string;
}, deps: Pick<LegalContentDependencies, 'db' | 'bucket' | 'indexLegalContent' | 'removeLegalContent'>): Promise<{
  success: boolean;
  documentId: string;
  status: LegalReviewStatus;
  searchIndexed: boolean;
}> {
  if (!args.reviewer.uid) throw new Error('Reviewer UID hin jiru.');
  if (!['admin', 'judge', 'legal_expert'].includes(args.reviewer.role)) {
    throw new Error('Gahee hojii kanaaf eeyyamame miti.');
  }
  if (!args.reviewNote.trim()) throw new Error('Sababa mirkaneessuu ykn diduu galchi.');

  const documentRef = deps.db.collection('legalDocuments').doc(args.documentId);
  const reviewRef = documentRef.collection('reviewHistory').doc();
  const parent = await documentRef.get();
  if (!parent.exists) throw new Error('Faayilli seeraa hin jiru.');

  await deps.db.runTransaction(async (tx) => {
    const current = await tx.get(documentRef);
    if (!current.exists) throw new Error('Faayilli seeraa yeroo mirkaneessaa hin jiru.');
    tx.update(documentRef, {
      reviewStatus: args.status,
      reviewedBy: args.reviewer.uid,
      reviewerRole: args.reviewer.role,
      reviewNote: args.reviewNote.trim().slice(0, 2_000),
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(reviewRef, {
      status: args.status,
      reviewerUid: args.reviewer.uid,
      reviewerRole: args.reviewer.role,
      note: args.reviewNote.trim().slice(0, 2_000),
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  let searchIndexed = false;
  if (args.status === 'verified' && deps.indexLegalContent) {
    const fresh = await documentRef.get();
    const textPath = fresh.get('extractedTextStoragePath') as string | undefined;
    if (textPath) {
      const [textBuffer] = await deps.bucket.file(textPath).download();
      try {
        await deps.indexLegalContent({
          id: args.documentId,
          title: String(fresh.get('title') ?? ''),
          text: textBuffer.toString('utf8'),
          metadata: {
            caseNumber: fresh.get('caseNumber') ?? null,
            volume: fresh.get('volume') ?? null,
            decisionYear: fresh.get('decisionYear') ?? null,
            court: fresh.get('court') ?? null,
            language: fresh.get('language') ?? 'unknown',
            reviewStatus: 'verified',
            reviewedBy: args.reviewer.uid,
          },
        });
        searchIndexed = true;
        await documentRef.update({ searchIndexed: true, updatedAt: FieldValue.serverTimestamp() });
      } catch (error) {
        await documentRef.update({
          searchIndexed: false,
          indexingError: (error instanceof Error ? error.message : 'Index failed').slice(0, 500),
        });
      }
    }
  } else if (args.status === 'rejected') {
    if (deps.removeLegalContent) {
      await deps.removeLegalContent(args.documentId);
    }
    await documentRef.update({ searchIndexed: false, updatedAt: FieldValue.serverTimestamp() });
  }

  return {
    success: true,
    documentId: args.documentId,
    status: args.status,
    searchIndexed,
  };
}
