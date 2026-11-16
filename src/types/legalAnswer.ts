export type LegalLanguage = "om" | "am" | "en";
export type LegalJurisdiction = "federal" | "oromia" | "both" | "unknown";
export type ResearchMode = "fast" | "deep";

export type LegalDocumentCategory =
  | "Federal Supreme Court Cassation Decisions"
  | "Oromia Supreme Court Decisions"
  | "Oromia High Court Decisions"
  | "Federal Laws and Proclamations"
  | "Oromia Regional Laws and Regulations"
  | "Civil Code and Civil Procedure Materials"
  | "Criminal Code and Criminal Procedure Materials"
  | "Administrative and Constitutional Law"
  | "Land and Property Law"
  | "Family and Inheritance Law"
  | "Evidence and Procedure"
  | "Other verified legal materials";

export const LEGAL_DOCUMENT_CATEGORIES: LegalDocumentCategory[] = [
  "Federal Supreme Court Cassation Decisions",
  "Oromia Supreme Court Decisions",
  "Oromia High Court Decisions",
  "Federal Laws and Proclamations",
  "Oromia Regional Laws and Regulations",
  "Civil Code and Civil Procedure Materials",
  "Criminal Code and Criminal Procedure Materials",
  "Administrative and Constitutional Law",
  "Land and Property Law",
  "Family and Inheritance Law",
  "Evidence and Procedure",
  "Other verified legal materials",
];

export type AuthorityTier =
  | "binding_precedent"
  | "persuasive_authority"
  | "statutory_primary"
  | "statutory_secondary"
  | "commentary"
  | "unverified_material"
  | "user_discussion";

export type LegalSourceType =
  | "proclamation"
  | "regulation"
  | "directive"
  | "civil_code"
  | "criminal_code"
  | "cassation_decision"
  | "court_decision"
  | "official_guideline"
  | "other";

export interface LegalQuestionAnalysis {
  originalQuestion: string;
  language: LegalLanguage;
  actualLegalQuestion: string;
  requestedRemedy: string;
  suppliedFacts: string[];
  missingFacts: string[];
  subjectDomain: string;
  detectedConcepts: string[];
  jurisdiction: LegalJurisdiction;
  applicablePeriodOrLawVersion?: string;
  proceduralStage?: string;
  partiesAndRelationships?: string;
  terminology: string[];
  expandedSynonyms: string[];
  extractedCaseNumbers: string[];
  extractedProclamationNumbers: string[];
  extractedArticleNumbers: string[];
  complexity: "simple" | "moderate" | "complex";
  recommendedMode: ResearchMode;
  complexityReason?: string;
}

export interface CassationComparison {
  sourceId: string;
  caseNumber: string;
  volume?: string;
  page?: string;
  decisionDate?: string;
  court: string;
  legalIssue: string;
  whyRelevant: string;
  similarFacts: string[];
  differentFacts: string[];
  ruleApplies: "APPLIES" | "DISTINGUISHABLE" | "UNCERTAIN";
  contraryApproachNotes?: string;
  verificationStatus: string;
  sourceDocumentAndPage: string;
  channelHandle?: string;
  telegramPostUrl?: string;
}

export interface AnswerQualityChecklist {
  understoodQuestion: boolean;
  identifiedJurisdiction: boolean;
  retrievedOriginalSources: boolean;
  verifiedLegalArticle: boolean;
  verifiedCassationReference: boolean;
  readRelevantPassage: boolean;
  comparedMaterialFacts: boolean;
  searchedContraryAuthority: boolean;
  distinguishedFactsFromAssumptions: boolean;
  conclusionsSupported: boolean;
  requestedLanguageMatched: boolean;
  proportionateAndRelevant: boolean;
  passedCount: number;
  totalChecks: number;
  warnings: string[];
}

export interface MatchedPassage {
  page?: number;
  section?: string;
  snippet: string;
  citationLabel: string;
}

export interface LegalAnswerRequest {
  question: string;
  language?: LegalLanguage;
  jurisdiction?: LegalJurisdiction;
  relevantDate?: string;
  facts?: string;
  mode?: ResearchMode;
  callerInstitutionId?: string;
}

export interface LegalCitation {
  sourceId: string;
  title: string;
  sourceType: LegalSourceType;
  category?: LegalDocumentCategory;
  jurisdiction: "federal" | "oromia";
  issuingInstitution: string;
  proclamationNumber?: string;
  decisionNumber?: string;
  volume?: string;
  page?: string;
  articleNumbers?: string[];
  status: string;
  authorityTier?: AuthorityTier;
  officialSourceName?: string;
  officialSourceUrl?: string;
  channelHandle?: string;
  telegramPostUrl?: string;
  pinpointCitation?: string;
}

export interface LegalAnswerResponse {
  ok: boolean;
  answer: string;
  language: LegalLanguage;
  jurisdiction: LegalJurisdiction;
  mode?: ResearchMode;
  recommendedMode?: ResearchMode;
  preliminaryNotice?: string;
  unverifiedWarning?: string;
  citations: LegalCitation[];
  sourceCount: number;
  verification:
    | "SOURCE_GROUNDED"
    | "INSUFFICIENT_SOURCES"
    | "AI_ERROR";
  questionAnalysis?: LegalQuestionAnalysis;
  cassationComparisons?: CassationComparison[];
  contraryAuthorities?: RetrievedLegalSource[];
  qualityChecklist?: AnswerQualityChecklist;
  latencyMs?: number;
  disclaimer: string;
  requestId: string;
}

export interface LegalSearchRequest {
  query: string;
  languages?: LegalLanguage[];
  jurisdiction?: LegalJurisdiction;
  dateRange?: {
    start?: string;
    end?: string;
  };
  topics?: string[];
  sourceTypes?: LegalSourceType[];
  category?: LegalDocumentCategory;
  caseNumber?: string;
  legalArticle?: string;
  court?: string;
  keyword?: string;
  verificationFilter?: "all" | "verified" | "unverified";
  mode?: ResearchMode;
  maxResults?: number;
}

export interface LegalSearchResponse {
  ok: boolean;
  results: RetrievedLegalSource[];
  contraryAuthorities?: RetrievedLegalSource[];
  questionAnalysis?: LegalQuestionAnalysis;
  cassationComparisons?: CassationComparison[];
  totalCount: number;
  latencyMs?: number;
  indexVersion?: string;
  requestId: string;
}

export interface RetrievedLegalSource {
  id: string;
  title: string;
  titleOm?: string;
  titleAm?: string;
  titleEn?: string;
  sourceType: LegalSourceType;
  category?: LegalDocumentCategory;
  jurisdiction: "federal" | "oromia";
  issuingInstitution: string;
  courtName?: string;
  proclamationNumber?: string;
  decisionNumber?: string;
  volume?: string;
  page?: string;
  articleNumbers?: string[];
  keywords?: string[];
  issueDate?: string;
  effectiveDate?: string;
  status?: string;
  authorityTier?: AuthorityTier;
  legalIssueSummary: string;
  holdingOrRule: string;
  relevantText?: string;
  officialSourceName?: string;
  officialSourceUrl?: string;
  channelHandle?: string;
  telegramPostUrl?: string;
  ocrApplied?: boolean;
  ocrConfidence?: number;
  needsHumanReview?: boolean;
  whyRelevant?: string;
  matchedPassages?: MatchedPassage[];
  isContraryAuthority?: boolean;
  score: number;
}

export interface IngestionJobRecord {
  jobId: string;
  sourceOrigin: "upload" | "telegram_export" | "telegram_api";
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  status: "queued" | "processing" | "completed" | "needs_review" | "duplicate" | "failed";
  progressPct: number;
  retries: number;
  error?: string;
  warnings: string[];
  sourceId?: string;
  channelHandle?: string;
  messageId?: string;
  originalDateTime?: string;
  telegramPostUrl?: string;
  ocrApplied: boolean;
  ocrConfidence?: number;
  needsHumanReview: boolean;
  chunkCount: number;
  indexVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramCoverageReport {
  channelHandle: string;
  earliestDate: string | null;
  latestDate: string | null;
  recordCount: number;
  missingPeriods: Array<{ from: string; to: string; gapDays: number; note: string }>;
  unavailableNotes: string[];
  incomplete: boolean;
  lastUpdatedAt: string;
}
