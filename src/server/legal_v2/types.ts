import type { Bucket } from '@google-cloud/storage';
import type { Firestore } from 'firebase-admin/firestore';

export type LegalSourceKind = 'telegram' | 'upload' | 'website' | 'other';
export type LegalReviewStatus = 'pending_review' | 'verified' | 'rejected';
export type LegalFileMime =
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface LegalSourceOrigin {
  kind: LegalSourceKind;
  label?: string;
  url?: string;
  telegramChatId?: string;
  telegramMessageId?: number;
  telegramFileId?: string;
  telegramFileUniqueId?: string;
  senderId?: string;
  importedAt?: string;
}

/** Original bytes and extracted text are both required. Do not put file bytes in Firestore. */
export interface ParsedTelegramLegalContent {
  title: string;
  fileName: string;
  mimeType: LegalFileMime;
  fileBuffer: Buffer;
  extractedText: string;
  source: LegalSourceOrigin;
  uploadedBy: string;
  language?: 'om' | 'am' | 'en' | 'unknown';
  caseNumber?: string;
  volume?: string;
  decisionYear?: string;
  court?: string;
  tags?: string[];
  reviewStatus?: LegalReviewStatus;
}

export interface LegalContentDependencies {
  db: Firestore;
  bucket: Bucket;
  /** Connect this to the app's existing full-text / vector search index. */
  indexLegalContent?: (item: {
    id: string;
    title: string;
    text: string;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
  removeLegalContent?: (id: string) => Promise<void>;
  maxFileBytes?: number;
}

export interface StoreLegalContentResult {
  success: boolean;
  firestoreId: string;
  message: string;
  duplicate?: boolean;
  searchIndexed?: boolean;
}

export interface LegalDocumentRevisionInput {
  documentId: string;
  fileName: string;
  mimeType: LegalFileMime;
  fileBuffer: Buffer;
  extractedText: string;
  editorUid: string;
  changeNote: string;
}

export interface LegalSource {
  id: string;
  title: string;
  text: string;
  sourceType: 'cassation' | 'master_file' | 'statute' | 'other';
  reviewStatus: LegalReviewStatus;
  caseNumber?: string;
  volume?: string;
  decisionYear?: string;
  page?: string;
  court?: string;
  sourceUrl?: string;
}

export interface LegalContextPackage {
  topic: string;
  matchedCassations: LegalSource[];
  masterFiles: LegalSource[];
  statutes?: LegalSource[];
  otherSources?: LegalSource[];
}

export interface LegalCitation {
  id: string;
  title: string;
  sourceType: LegalSource['sourceType'];
  caseNumber?: string;
  volume?: string;
  decisionYear?: string;
  page?: string;
  court?: string;
  sourceUrl?: string;
}

export interface SynthesizeLegalParams {
  fullQuery: string;
  userId: string;
}

export interface SynthesizedLegalResult {
  text: string;
  topic: string;
  citations: LegalCitation[];
  excludedUnverifiedCount: number;
  warning?: string;
}

export interface LegalEngineDependencies {
  detectTopicAndCollectSources: (query: string, userId: string) => Promise<LegalContextPackage>;
  buildOromoContent: (query: string, context: LegalContextPackage, userId: string) => Promise<string>;
}

export interface TelegramDocumentDescriptor {
  file_id: string;
  file_unique_id?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramDownloadResult {
  buffer: Buffer;
  fileName: string;
  mimeType: LegalFileMime;
  fileId: string;
  fileUniqueId?: string;
  fileSize: number;
}

export interface LegalContentRuntime {
  db: Firestore;
  bucket: Bucket;
}
