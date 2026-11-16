export type AuditCategory =
  | "architecture"
  | "backend"
  | "firebase_security"
  | "api_security"
  | "legal_engine"
  | "ocr"
  | "citations"
  | "telegram"
  | "build"
  | "tests"
  | "privacy"
  | "documentation";

export interface AuditEvidence {
  id: string;
  category: AuditCategory;
  title: string;
  description: string;
  status: "verified" | "failed" | "not_tested" | "not_available" | "inconclusive";
  sourceFile?: string;
  lineStart?: number;
  lineEnd?: number;
  verifiedAt: string;
  verifiedBy: string;
}

export interface AuditFinding {
  id: string;
  category: AuditCategory;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  affectedFiles: string[];
  recommendation: string;
  evidenceIds: string[];
  verified: boolean;
}

export interface ExpertReview {
  reviewerId: string;
  reviewerRole: string;
  reviewedAt: string;
  category: AuditCategory;
  score: number;
  evidenceIds: string[];
  comments: string;
  recommendations: string[];
  approved: boolean;
}

export interface CategoryScore {
  category: AuditCategory;
  score: number | null;
  status: "assessed" | "not_assessed";
  evidenceCount: number;
  findingsCount: number;
  explanation: string;
}

export interface AuditInput {
  projectId: string;
  version: string;
  createdBy: string;
  sourceRevision: string;
  evidence: AuditEvidence[];
  findings: AuditFinding[];
  expertReviews?: ExpertReview[];
}

export interface QualityAuditReport {
  id: string;
  projectId: string;
  version: string;
  createdAt: string;
  createdBy: string;
  sourceRevision: string;
  categories: CategoryScore[];
  findings: AuditFinding[];
  evidence: AuditEvidence[];
  expertReviews: ExpertReview[];
  automaticScore: number | null;
  expertScore: number | null;
  combinedScore: number | null;
  overallStatus: "good" | "needs_improvement" | "high_risk" | "insufficient_evidence";
  limitations: string[];
}
