export type Jurisdiction = "federal" | "oromia";

export type LegalLanguage = "om" | "am" | "en";

export type LegislationType =
  | "constitution"
  | "proclamation"
  | "regulation"
  | "directive"
  | "amendment"
  | "repeal";

export type LegalCategory =
  | "labor"
  | "property_land"
  | "civil_contract"
  | "commercial_tax"
  | "criminal"
  | "family"
  | "constitutional_admin"
  | "procedure_evidence"
  | "human_rights"
  | "investment"
  | "environment"
  | "other";

export type LegalStatus =
  | "draft"
  | "published"
  | "in_force"
  | "partially_amended"
  | "amended"
  | "repealed"
  | "expired"
  | "suspended"
  | "unknown";

export type LegalRecordType = "enactment" | "cassation_decision";

export type VerificationStatus =
  | "unverified"
  | "partially_verified"
  | "verified"
  | "rejected";

export type LegalSourceType =
  | "official_gazette"
  | "official_website"
  | "court_decision"
  | "legal_database"
  | "scanned_document"
  | "telegram_archive"
  | "other";

export interface MultilingualText {
  om?: string;
  am?: string;
  en?: string;
}

export interface LegalAuthority {
  name: MultilingualText;
  institutionType:
    | "federal"
    | "regional"
    | "parliament"
    | "council"
    | "ministry"
    | "court"
    | "other";
  issuingInstitution?: MultilingualText;
  legalAuthorityBasis?: string;
  country: string;
  region?: string;
}

export interface LegalSource {
  id: string;
  sourceType: LegalSourceType;
  title: string;
  url?: string;
  documentId?: string;
  storagePath?: string;
  publicationNumber?: string;
  pageNumber?: string;
  language?: LegalLanguage;
  documentHash?: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNote?: string;
}

export interface LegalArticle {
  articleNumber: string;
  title?: MultilingualText;
  content: MultilingualText;
  subArticles?: Array<{
    number: string;
    content: MultilingualText;
  }>;
  keywords?: string[];
  legalPrinciples?: MultilingualText[];
  crossReferences?: string[];
}

export interface LegalEnactment {
  id: string;
  recordType: "enactment";
  type: LegislationType;
  jurisdiction: Jurisdiction;
  number: string;
  title: MultilingualText;
  shortTitle?: MultilingualText;
  authority: LegalAuthority;
  yearEC: number;
  yearGC?: number;
  category: LegalCategory;
  summary: MultilingualText;
  fullTextArticles: LegalArticle[];
  status: LegalStatus;
  sources: LegalSource[];
  tags: string[];
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export type CassationCourt =
  | "federal_supreme_court"
  | "oromia_supreme_court";

export interface CassationDecision {
  id: string;
  recordType: "cassation_decision";
  jurisdiction: Jurisdiction;
  court: CassationCourt;
  category?: LegalCategory;
  caseNumber: string;
  volume?: number | string;
  decisionDate: string;
  yearEC?: number;
  yearGC?: number;
  subject: MultilingualText;
  legalQuestions: MultilingualText[];
  facts: MultilingualText;
  courtReasoning: MultilingualText;
  decisionOutcome: MultilingualText;
  bindingPrinciples: Array<{
    principle: MultilingualText;
    bindingStatus: "binding" | "persuasive" | "not_established";
    relevantArticles?: string[];
  }>;
  sources: LegalSource[];
  tags: string[];
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export type LegalDatabaseRecord = LegalEnactment | CassationDecision;

export interface LegalSearchRequest {
  question: string;
  language: LegalLanguage;
  jurisdiction?: Jurisdiction;
  recordTypes?: LegalRecordType[];
  category?: LegalCategory;
  caseNumber?: string;
  limit?: number;
}

export interface LegalSearchResult {
  record: LegalDatabaseRecord;
  relevanceScore: number;
  matchType: "exact" | "high_relevance" | "related";
  matchedTerms: string[];
  relevanceExplanation: string;
  sourceVerified: boolean;
}
