import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type {
  AuthorityTier,
  ExtractedLegalStructure,
  LegalDocumentCategory,
  LegalReviewEntry,
  LegalSourceRecord,
  LegalSourceType,
  LegalSourceVersion,
  LegalWorkflowStatus,
  VerificationStatus,
} from './legalTypes';

export interface UploadLegalSourcePayload {
  title: string;
  sourceType: LegalSourceType;
  category?: LegalDocumentCategory;
  jurisdiction: 'federal' | 'oromia';
  issuingInstitution: string;
  courtName?: string;
  proclamationNumber?: string;
  decisionNumber?: string;
  volume?: string;
  page?: string;
  articleNumbers?: string[];
  keywords?: string[];
  legalIssueSummary: string;
  holdingOrRule: string;
  relevantText?: string;
  language?: 'om' | 'am' | 'en';
  fileName: string;
  fileMimeType: string;
  fileBase64?: string;
  fileSizeBytes?: number;
  sha256Checksum?: string;
  dateEC?: string;
  dateGC?: string;
  originalDateTime?: string;
  importDate?: string;
  officialSourceName?: string;
  officialSourceUrl?: string;
  channelHandle?: string;
  telegramPostUrl?: string;
  messageId?: string;
  ocrApplied?: boolean;
  ocrConfidence?: number;
  needsHumanReview?: boolean;
  structuredExtraction?: ExtractedLegalStructure;
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'UNDER_REVIEW';
  isPublic?: boolean;
  institutionId?: string;
  uploaderUid: string;
  uploaderRole: string;
  uploaderEmail?: string;
}

export interface ReviewLegalSourcePayload {
  sourceId: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION' | 'PUBLISH' | 'ARCHIVE';
  reviewerUid: string;
  reviewerRole: string;
  reviewerEmail?: string;
  reviewNotes: string;
  enforceTwoPersonReview?: boolean;
}

export interface UpdateSourceMetadataPayload {
  sourceId: string;
  title?: string;
  category?: LegalDocumentCategory;
  sourceType?: LegalSourceType;
  jurisdiction?: 'federal' | 'oromia';
  issuingInstitution?: string;
  courtName?: string;
  proclamationNumber?: string;
  decisionNumber?: string;
  volume?: string;
  page?: string;
  articleNumbers?: string[];
  keywords?: string[];
  legalIssueSummary?: string;
  holdingOrRule?: string;
  dateEC?: string;
  dateGC?: string;
  officialSourceName?: string;
  officialSourceUrl?: string;
  status?: VerificationStatus;
  editorUid: string;
  editorRole: string;
  editorEmail?: string;
  changeNote?: string;
}

// In-memory backing cache for local development / fast search integration
const localSourcesCache = new Map<string, LegalSourceRecord>();
const checksumIndex = new Map<string, string>(); // sha256 -> sourceId

export function calculateSha256(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function isAuthorizedLegalEditor(role?: string, email?: string): boolean {
  if (email && (email === 'ayeledha@gmail.com' || email.endsWith('@saiethio.com'))) return true;
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return [
    'admin',
    'superadmin',
    'super_admin',
    'court_admin',
    'judge',
    'legal_expert',
    'prosecutor',
    'registrar',
  ].includes(normalized);
}

function inferAuthorityTier(sourceType: LegalSourceType, status: VerificationStatus, jurisdiction: string): AuthorityTier {
  if (status === 'UNVERIFIED' || status === 'UNDER_REVIEW' || status === 'REJECTED') {
    return 'unverified_material';
  }
  if (sourceType === 'cassation_decision') return 'binding_precedent';
  if (sourceType === 'court_decision') return 'persuasive_authority';
  if (sourceType === 'proclamation' || sourceType === 'civil_code' || sourceType === 'criminal_code') {
    return 'statutory_primary';
  }
  if (sourceType === 'regulation' || sourceType === 'directive' || sourceType === 'official_guideline') {
    return 'statutory_secondary';
  }
  return jurisdiction === 'federal' ? 'commentary' : 'commentary';
}

function buildSearchTokens(payload: Partial<LegalSourceRecord>): string[] {
  const tokens = new Set<string>();
  const fields = [
    payload.title,
    payload.issuingInstitution,
    payload.courtName,
    payload.category,
    payload.proclamationNumber,
    payload.decisionNumber,
    payload.volume,
    ...(payload.articleNumbers || []),
    ...(payload.keywords || []),
  ];
  for (const field of fields) {
    if (!field) continue;
    const norm = field.toLowerCase().trim();
    if (norm) tokens.add(norm);
    for (const part of norm.split(/[\s,;/()-]+/)) {
      if (part.length >= 2) tokens.add(part);
    }
  }
  return [...tokens].slice(0, 60);
}

/**
 * Registers an automatically extracted/ingested source into workflow storage
 * (preserves Telegram & PDF ingestion pipelines without rejecting automated UNVERIFIED staging).
 */
export async function registerOrGetIngestedSource(
  db: Firestore | null,
  payload: UploadLegalSourcePayload
): Promise<{
  ok: boolean;
  sourceId: string;
  status: LegalWorkflowStatus;
  duplicate?: boolean;
  message?: string;
  record?: LegalSourceRecord;
}> {
  if (!isAuthorizedLegalEditor(payload.uploaderRole, payload.uploaderEmail)) {
    throw new Error('UNAUTHORIZED: Caller does not possess legal repository uploader privileges.');
  }

  const checksum =
    payload.sha256Checksum ||
    (payload.fileBase64
      ? calculateSha256(Buffer.from(payload.fileBase64, 'base64'))
      : calculateSha256(`${payload.title}_${payload.proclamationNumber || payload.decisionNumber}_${payload.relevantText || ''}`));

  const existingId = checksumIndex.get(checksum);
  if (existingId) {
    return {
      ok: false,
      sourceId: existingId,
      status: localSourcesCache.get(existingId)?.workflowStatus || 'DRAFT',
      duplicate: true,
      message: `Duplicate document detected (matches source ${existingId} with identical SHA-256 checksum).`,
      record: localSourcesCache.get(existingId),
    };
  }

  const sourceId = `src_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const initialVerification: VerificationStatus = payload.verificationStatus || 'UNDER_REVIEW';
  const initialWorkflow: LegalWorkflowStatus =
    initialVerification === 'VERIFIED'
      ? 'PUBLISHED'
      : 'NEEDS_REVIEW';

  const initialVersion: LegalSourceVersion = {
    versionId: `v1_${Date.now()}`,
    versionNumber: 1,
    fileName: payload.fileName || 'source_document.txt',
    fileSizeBytes: payload.fileSizeBytes || 0,
    fileMimeType: payload.fileMimeType || 'text/plain',
    sha256Checksum: checksum,
    storagePath: `public_legal_repository/${sourceId}/${payload.fileName || 'source_document.txt'}`,
    extractedTextLength: payload.relevantText?.length || 0,
    ocrApplied: Boolean(payload.ocrApplied),
    ocrConfidence: payload.ocrConfidence,
    needsHumanReview: payload.needsHumanReview,
    createdAt: now,
    createdByUid: payload.uploaderUid,
    changeNote: 'Initial ingestion and extraction',
  };

  const initialReview: LegalReviewEntry = {
    reviewId: `rev_${Date.now()}`,
    reviewerUid: payload.uploaderUid,
    reviewerRole: payload.uploaderRole,
    reviewerEmail: payload.uploaderEmail,
    action: 'SUBMITTED',
    notes: 'Ingested via SEERAAI Document & Archive Pipeline',
    timestamp: now,
  };

  const record: LegalSourceRecord = {
    id: sourceId,
    title: payload.title.trim(),
    titleOm: payload.language === 'om' ? payload.title.trim() : undefined,
    titleAm: payload.language === 'am' ? payload.title.trim() : undefined,
    titleEn: payload.language === 'en' ? payload.title.trim() : undefined,
    sourceType: payload.sourceType,
    category: payload.category,
    jurisdiction: payload.jurisdiction,
    issuingInstitution: payload.issuingInstitution.trim(),
    courtName: payload.courtName?.trim() || payload.structuredExtraction?.courtName,
    proclamationNumber: payload.proclamationNumber?.trim(),
    decisionNumber: payload.decisionNumber?.trim() || payload.structuredExtraction?.caseNumber,
    volume: payload.volume?.trim(),
    page: payload.page?.trim(),
    articleNumbers: payload.articleNumbers || payload.structuredExtraction?.relevantArticles || [],
    keywords: payload.keywords || [],
    legalIssueSummary: payload.legalIssueSummary.trim(),
    holdingOrRule: payload.holdingOrRule.trim(),
    relevantText: payload.relevantText?.trim() || payload.holdingOrRule.trim(),
    language: payload.language || 'om',
    searchTokens: [],
    officialSourceName: payload.officialSourceName,
    officialSourceUrl: payload.officialSourceUrl,
    channelHandle: payload.channelHandle,
    telegramPostUrl: payload.telegramPostUrl,
    messageId: payload.messageId,
    fileName: payload.fileName,
    importDate: payload.importDate || now,
    originalDateTime: payload.originalDateTime,
    status: initialVerification,
    authorityTier: inferAuthorityTier(payload.sourceType, initialVerification, payload.jurisdiction),
    workflowStatus: initialWorkflow,
    sha256Checksum: checksum,
    ocrApplied: Boolean(payload.ocrApplied),
    ocrConfidence: payload.ocrConfidence,
    needsHumanReview: Boolean(payload.needsHumanReview),
    structuredExtraction: payload.structuredExtraction,
    versions: [initialVersion],
    reviewHistory: [initialReview],
    dateEC: payload.dateEC,
    dateGC: payload.dateGC,
    effectiveDate: payload.dateGC || payload.dateEC || payload.originalDateTime?.slice(0, 10),
    uploaderUid: payload.uploaderUid,
    uploaderRole: payload.uploaderRole,
    institutionId: payload.institutionId,
    isPublic: payload.isPublic !== false,
    archived: false,
    sourceAuthenticityConfirmed: initialVerification === 'VERIFIED',
    verifiedAt: initialVerification === 'VERIFIED' ? now : undefined,
    verifiedBy: initialVerification === 'VERIFIED' ? payload.uploaderUid : undefined,
  };
  record.searchTokens = buildSearchTokens(record);

  localSourcesCache.set(sourceId, record);
  checksumIndex.set(checksum, sourceId);

  if (db) {
    try {
      // Never write multi-MB base64 blobs into Firestore (rule alignment!)
      const firestoreSafeRecord = {
        ...record,
        relevantText: record.relevantText ? record.relevantText.slice(0, 50_000) : undefined,
      };
      const col = record.sourceType === 'cassation_decision' ? 'cassation_decisions' : 'legal_sources';
      await db.collection(col).doc(sourceId).set(firestoreSafeRecord);
      await db.collection('legal_sources_audit').add({
        action: 'SOURCE_UPLOADED',
        sourceId,
        uid: payload.uploaderUid,
        institutionId: payload.institutionId || null,
        checksum,
        timestamp: now,
      });
    } catch (dbErr) {
      console.warn('[registerOrGetIngestedSource] Firestore write notice, cached in-memory:', dbErr);
    }
  }

  return {
    ok: true,
    sourceId,
    status: initialWorkflow,
    record,
  };
}

/**
 * Creates or stages a new legal source document in the review pipeline (preserves Phase 8 contract).
 */
export async function stageLegalSource(
  db: Firestore | null,
  payload: UploadLegalSourcePayload
): Promise<{ ok: boolean; sourceId: string; status: LegalWorkflowStatus; duplicate?: boolean; message?: string }> {
  if (!isAuthorizedLegalEditor(payload.uploaderRole, payload.uploaderEmail)) {
    throw new Error('UNAUTHORIZED: Caller does not possess legal repository uploader privileges.');
  }

  if (!payload.title?.trim()) throw new Error('MISSING_TITLE: Document title is required.');
  if (!payload.issuingInstitution?.trim()) throw new Error('MISSING_INSTITUTION: Issuing body/court is required.');
  if (!payload.legalIssueSummary?.trim()) throw new Error('MISSING_SUMMARY: Legal issue summary is required.');

  let checksum = '';
  if (payload.fileBase64) {
    const buf = Buffer.from(payload.fileBase64, 'base64');
    checksum = calculateSha256(buf);
  } else {
    checksum = calculateSha256(`${payload.title}_${payload.proclamationNumber || payload.decisionNumber}_${Date.now()}`);
  }

  const res = await registerOrGetIngestedSource(db, {
    ...payload,
    sha256Checksum: checksum,
    verificationStatus: 'UNDER_REVIEW',
  });

  return {
    ok: res.ok,
    sourceId: res.sourceId,
    status: res.status,
    duplicate: res.duplicate,
    message: res.message,
  };
}

/**
 * Executes a review action (Approve, Reject, Request Correction, Publish, or Archive).
 */
export async function reviewLegalSource(
  db: Firestore | null,
  payload: ReviewLegalSourcePayload
): Promise<{ ok: boolean; sourceId: string; status: LegalWorkflowStatus; message: string }> {
  if (!isAuthorizedLegalEditor(payload.reviewerRole, payload.reviewerEmail)) {
    throw new Error('UNAUTHORIZED: Caller does not possess legal source review privileges.');
  }

  if (!payload.reviewNotes?.trim()) {
    throw new Error('MISSING_NOTES: Review comments and evidence notes are required for this action.');
  }

  let record: LegalSourceRecord | undefined = localSourcesCache.get(payload.sourceId);
  let collectionName = 'legal_sources';

  if (!record && db) {
    try {
      let docSnap = await db.collection('legal_sources').doc(payload.sourceId).get();
      if (!docSnap.exists) {
        docSnap = await db.collection('cassation_decisions').doc(payload.sourceId).get();
        collectionName = 'cassation_decisions';
      }
      if (docSnap.exists) {
        record = docSnap.data() as LegalSourceRecord;
      }
    } catch (e) {
      console.warn('[reviewLegalSource] Firestore lookup notice:', e);
    }
  }

  if (!record) {
    throw new Error(`NOT_FOUND: Legal source ${payload.sourceId} does not exist.`);
  }

  if (payload.enforceTwoPersonReview && payload.action === 'APPROVE') {
    if (record.uploaderUid && record.uploaderUid === payload.reviewerUid) {
      throw new Error('TWO_PERSON_REVIEW_VIOLATION: An uploader cannot approve their own legal source submission.');
    }
  }

  const now = new Date().toISOString();
  let nextStatus: LegalWorkflowStatus = record.workflowStatus || 'NEEDS_REVIEW';
  let nextVerification: VerificationStatus = record.status || 'UNDER_REVIEW';
  let isAuthentic = record.sourceAuthenticityConfirmed || false;

  switch (payload.action) {
    case 'APPROVE':
      nextStatus = 'APPROVED';
      nextVerification = 'UNDER_REVIEW';
      break;
    case 'PUBLISH':
      if (record.workflowStatus !== 'APPROVED' && record.workflowStatus !== 'NEEDS_REVIEW') {
        throw new Error(`INVALID_TRANSITION: Cannot publish a document from status ${record.workflowStatus}. Must be APPROVED first.`);
      }
      nextStatus = 'PUBLISHED';
      nextVerification = 'VERIFIED';
      isAuthentic = true;
      record.verifiedBy = payload.reviewerUid;
      record.verifiedAt = now;
      break;
    case 'REJECT':
      nextStatus = 'REJECTED';
      nextVerification = 'REJECTED';
      isAuthentic = false;
      break;
    case 'REQUEST_CORRECTION':
      nextStatus = 'NEEDS_CORRECTION';
      nextVerification = 'UNDER_REVIEW';
      break;
    case 'ARCHIVE':
      nextStatus = 'ARCHIVED';
      nextVerification = 'ARCHIVED';
      record.archived = true;
      break;
  }

  const reviewEntry: LegalReviewEntry = {
    reviewId: `rev_${Date.now()}`,
    reviewerUid: payload.reviewerUid,
    reviewerRole: payload.reviewerRole,
    reviewerEmail: payload.reviewerEmail,
    action: payload.action === 'APPROVE'
      ? 'APPROVED'
      : payload.action === 'PUBLISH'
      ? 'PUBLISHED'
      : payload.action === 'REJECT'
      ? 'REJECTED'
      : payload.action === 'REQUEST_CORRECTION'
      ? 'NEEDS_CORRECTION'
      : 'ARCHIVED',
    notes: payload.reviewNotes.trim(),
    timestamp: now,
  };

  record.workflowStatus = nextStatus;
  record.status = nextVerification;
  record.authorityTier = inferAuthorityTier(record.sourceType, nextVerification, record.jurisdiction);
  record.sourceAuthenticityConfirmed = isAuthentic;
  record.lastReviewedAt = now;
  record.reviewHistory = [...(record.reviewHistory || []), reviewEntry];

  localSourcesCache.set(payload.sourceId, record);

  if (db) {
    try {
      await db.collection(collectionName).doc(payload.sourceId).set(record, { merge: true });
      await db.collection('legal_sources_audit').add({
        action: `SOURCE_${payload.action}`,
        sourceId: payload.sourceId,
        reviewerUid: payload.reviewerUid,
        status: nextStatus,
        notes: payload.reviewNotes,
        timestamp: now,
      });
    } catch (dbErr) {
      console.warn('[reviewLegalSource] Firestore update notice:', dbErr);
    }
  }

  return {
    ok: true,
    sourceId: payload.sourceId,
    status: nextStatus,
    message: `Legal source status successfully transitioned to ${nextStatus}.`,
  };
}

/**
 * Updates metadata fields on an existing legal source with role-based authorization & audit logging (§3).
 */
export async function updateLegalSourceMetadata(
  db: Firestore | null,
  payload: UpdateSourceMetadataPayload
): Promise<{ ok: boolean; source: LegalSourceRecord }> {
  if (!isAuthorizedLegalEditor(payload.editorRole, payload.editorEmail)) {
    throw new Error('UNAUTHORIZED: Caller lacks metadata update permission.');
  }

  let record = localSourcesCache.get(payload.sourceId);
  let collectionName = 'legal_sources';
  if (!record && db) {
    try {
      let snap = await db.collection('legal_sources').doc(payload.sourceId).get();
      if (!snap.exists) {
        snap = await db.collection('cassation_decisions').doc(payload.sourceId).get();
        collectionName = 'cassation_decisions';
      }
      if (snap.exists) record = snap.data() as LegalSourceRecord;
    } catch {
      // ignore
    }
  }

  if (!record) {
    throw new Error(`NOT_FOUND: Legal source ${payload.sourceId} does not exist.`);
  }

  const now = new Date().toISOString();
  const updated: LegalSourceRecord = {
    ...record,
    title: payload.title?.trim() || record.title,
    category: payload.category ?? record.category,
    sourceType: payload.sourceType ?? record.sourceType,
    jurisdiction: payload.jurisdiction ?? record.jurisdiction,
    issuingInstitution: payload.issuingInstitution?.trim() || record.issuingInstitution,
    courtName: payload.courtName?.trim() ?? record.courtName,
    proclamationNumber: payload.proclamationNumber?.trim() ?? record.proclamationNumber,
    decisionNumber: payload.decisionNumber?.trim() ?? record.decisionNumber,
    volume: payload.volume?.trim() ?? record.volume,
    page: payload.page?.trim() ?? record.page,
    articleNumbers: payload.articleNumbers ?? record.articleNumbers,
    keywords: payload.keywords ?? record.keywords,
    legalIssueSummary: payload.legalIssueSummary?.trim() || record.legalIssueSummary,
    holdingOrRule: payload.holdingOrRule?.trim() || record.holdingOrRule,
    dateEC: payload.dateEC ?? record.dateEC,
    dateGC: payload.dateGC ?? record.dateGC,
    effectiveDate: payload.dateGC || payload.dateEC || record.effectiveDate,
    officialSourceName: payload.officialSourceName ?? record.officialSourceName,
    officialSourceUrl: payload.officialSourceUrl ?? record.officialSourceUrl,
    status: payload.status ?? record.status,
    lastReviewedAt: now,
  };
  if (payload.status === 'VERIFIED') {
    updated.sourceAuthenticityConfirmed = true;
    updated.workflowStatus = 'PUBLISHED';
    updated.verifiedBy = payload.editorUid;
    updated.verifiedAt = now;
  }
  updated.authorityTier = inferAuthorityTier(updated.sourceType, updated.status, updated.jurisdiction);
  updated.searchTokens = buildSearchTokens(updated);
  updated.reviewHistory = [
    ...(updated.reviewHistory || []),
    {
      reviewId: `rev_${Date.now()}`,
      reviewerUid: payload.editorUid,
      reviewerRole: payload.editorRole,
      reviewerEmail: payload.editorEmail,
      action: 'UPDATED',
      notes: payload.changeNote?.trim() || 'Metadata updated by authorized legal editor.',
      timestamp: now,
    },
  ];

  localSourcesCache.set(payload.sourceId, updated);

  if (db) {
    try {
      await db.collection(collectionName).doc(payload.sourceId).set(updated, { merge: true });
      await db.collection('legal_sources_audit').add({
        action: 'SOURCE_METADATA_UPDATED',
        sourceId: payload.sourceId,
        uid: payload.editorUid,
        timestamp: now,
      });
    } catch {
      // non-fatal
    }
  }

  return { ok: true, source: updated };
}

export async function getLegalSourceById(
  db: Firestore | null,
  sourceId: string
): Promise<LegalSourceRecord | null> {
  const cached = localSourcesCache.get(sourceId);
  if (cached) return cached;
  if (db) {
    try {
      let snap = await db.collection('legal_sources').doc(sourceId).get();
      if (!snap.exists) {
        snap = await db.collection('cassation_decisions').doc(sourceId).get();
      }
      if (snap.exists) return { id: snap.id, ...snap.data() } as LegalSourceRecord;
    } catch {
      // ignore
    }
  }
  return null;
}

export function getLocalCachedLegalSources(): LegalSourceRecord[] {
  return [...localSourcesCache.values()];
}

/**
 * Lists legal sources from cache and database with filtering & institution isolation.
 */
export async function listWorkflowLegalSources(
  db: Firestore | null,
  filters?: {
    status?: LegalWorkflowStatus | 'ALL' | 'VERIFIED' | 'UNVERIFIED';
    jurisdiction?: 'federal' | 'oromia' | 'all';
    sourceType?: LegalSourceType | 'all';
    category?: LegalDocumentCategory | 'all';
    searchTerm?: string;
    callerInstitutionId?: string;
    includeArchived?: boolean;
  }
): Promise<LegalSourceRecord[]> {
  const sources: LegalSourceRecord[] = [];

  for (const src of localSourcesCache.values()) {
    sources.push(src);
  }

  if (db) {
    try {
      const snap = await db.collection('legal_sources').limit(80).get();
      for (const d of snap.docs) {
        if (!localSourcesCache.has(d.id)) {
          sources.push({ id: d.id, ...d.data() } as LegalSourceRecord);
        }
      }
    } catch {
      // offline fallback
    }
  }

  return sources.filter((s) => {
    if (!filters?.includeArchived && (s.archived || s.workflowStatus === 'ARCHIVED') && filters?.status !== 'ARCHIVED') {
      return false;
    }

    // Tenant isolation: private/institutional sources stay isolated to matching institution
    if (s.isPublic === false || s.institutionId) {
      if (!filters?.callerInstitutionId || s.institutionId !== filters.callerInstitutionId) {
        return false;
      }
    }

    if (filters?.status && filters.status !== 'ALL') {
      if (filters.status === 'VERIFIED') {
        if (s.status !== 'VERIFIED' && s.workflowStatus !== 'PUBLISHED') return false;
      } else if (filters.status === 'UNVERIFIED') {
        if (s.status === 'VERIFIED' && s.workflowStatus === 'PUBLISHED') return false;
      } else if (s.workflowStatus !== filters.status && s.status !== filters.status) {
        return false;
      }
    }
    if (filters?.jurisdiction && filters.jurisdiction !== 'all') {
      if (s.jurisdiction !== filters.jurisdiction) return false;
    }
    if (filters?.sourceType && filters.sourceType !== 'all') {
      if (s.sourceType !== filters.sourceType) return false;
    }
    if (filters?.category && filters.category !== 'all') {
      if (s.category !== filters.category) return false;
    }
    if (filters?.searchTerm?.trim()) {
      const term = filters.searchTerm.toLowerCase().trim();
      const match =
        s.title.toLowerCase().includes(term) ||
        (s.proclamationNumber && s.proclamationNumber.toLowerCase().includes(term)) ||
        (s.decisionNumber && s.decisionNumber.toLowerCase().includes(term)) ||
        (s.courtName && s.courtName.toLowerCase().includes(term)) ||
        (s.keywords && s.keywords.some((k) => k.toLowerCase().includes(term))) ||
        s.legalIssueSummary.toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });
}
