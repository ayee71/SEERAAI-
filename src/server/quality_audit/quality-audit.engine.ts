import {
  AuditCategory,
  AuditEvidence,
  AuditFinding,
  AuditInput,
  CategoryScore,
  ExpertReview,
  QualityAuditReport
} from "./quality-audit.types.js";

const CATEGORY_WEIGHTS: Record<AuditCategory, number> = {
  architecture: 5,
  backend: 8,
  firebase_security: 12,
  api_security: 10,
  legal_engine: 15,
  ocr: 10,
  citations: 10,
  telegram: 5,
  build: 5,
  tests: 10,
  privacy: 7,
  documentation: 3
};

const ALL_CATEGORIES = Object.keys(CATEGORY_WEIGHTS) as AuditCategory[];

const STATUS_POINTS: Record<AuditEvidence["status"], number | null> = {
  verified: 10,
  failed: 0,
  not_tested: null,
  not_available: null,
  inconclusive: null
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundScore(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function scoreCategory(
  category: AuditCategory,
  evidence: AuditEvidence[],
  findings: AuditFinding[]
): CategoryScore {
  const categoryEvidence = evidence.filter(
    item => item.category === category
  );

  const usable = categoryEvidence
    .filter(item => item.status === "verified" || item.status === "failed")
    .map(item => STATUS_POINTS[item.status])
    .filter((value): value is number => value !== null);

  if (usable.length === 0) {
    return {
      category,
      score: null,
      status: "not_assessed",
      evidenceCount: categoryEvidence.length,
      findingsCount: findings.filter(f => f.category === category).length,
      explanation: "Ragaan gahaan hin dhihaanne; qabxiin hin kennamne."
    };
  }

  const baseScore = average(usable) ?? 0;

  const categoryFindings = findings.filter(
    f => f.category === category && f.verified
  );

  const penalties: Record<string, number> = {
    critical: 5,
    high: 2.5,
    medium: 1,
    low: 0.25,
    info: 0
  };

  const penalty = categoryFindings.reduce(
    (sum, finding) => sum + (penalties[finding.severity] ?? 0),
    0
  );

  const score = Math.max(0, Math.min(10, baseScore - penalty));

  return {
    category,
    score: roundScore(score),
    status: "assessed",
    evidenceCount: categoryEvidence.length,
    findingsCount: categoryFindings.length,
    explanation: `Ragaa madaalame ${usable.length}; hanqina mirkanaa'e ${categoryFindings.length}.`
  };
}

function weightedScore(categories: CategoryScore[]): number | null {
  let weightedTotal = 0;
  let availableWeight = 0;

  for (const item of categories) {
    if (item.score === null) continue;

    const weight = CATEGORY_WEIGHTS[item.category];
    weightedTotal += item.score * weight;
    availableWeight += weight;
  }

  if (availableWeight === 0) return null;

  return roundScore(weightedTotal / availableWeight);
}

function calculateExpertScore(reviews: ExpertReview[]): number | null {
  const approved = reviews.filter(
    review =>
      review.approved &&
      typeof review.score === "number" &&
      Number.isFinite(review.score) &&
      review.score >= 0 &&
      review.score <= 10
  );

  return roundScore(average(approved.map(r => r.score)));
}

export function createQualityAuditReport(
  input: AuditInput
): QualityAuditReport {
  const expertReviews = input.expertReviews ?? [];

  const categories = ALL_CATEGORIES.map(category =>
    scoreCategory(category, input.evidence, input.findings)
  );

  const automaticScore = weightedScore(categories);
  const expertScore = calculateExpertScore(expertReviews);

  const combinedScore =
    automaticScore !== null && expertScore !== null
      ? roundScore(automaticScore * 0.6 + expertScore * 0.4)
      : null;

  const assessedCategories = categories.filter(
    category => category.score !== null
  ).length;

  const criticalFindings = input.findings.filter(
    finding => finding.verified && finding.severity === "critical"
  );

  const limitations: string[] = [];

  if (assessedCategories < ALL_CATEGORIES.length) {
    limitations.push(
      "Kutaan tokko tokko ragaa gahaa waan hin qabneef hin madaalamne."
    );
  }

  if (input.evidence.length === 0) {
    limitations.push(
      "Ragaan qorannoo hin dhihaanne; madaalliin amanamaa kennamuu hin danda'u."
    );
  }

  if (expertScore === null) {
    limitations.push(
      "Madaalliin ogeessaa hin jiru; qabxiin ofumaan shallagame qofa agarsiifama."
    );
  }

  let overallStatus: QualityAuditReport["overallStatus"];

  if (automaticScore === null) {
    overallStatus = "insufficient_evidence";
  } else if (criticalFindings.length > 0) {
    overallStatus = "high_risk";
  } else if (automaticScore >= 8) {
    overallStatus = "good";
  } else {
    overallStatus = "needs_improvement";
  }

  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    version: input.version,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    sourceRevision: input.sourceRevision,
    categories,
    findings: input.findings,
    evidence: input.evidence,
    expertReviews,
    automaticScore,
    expertScore,
    combinedScore,
    overallStatus,
    limitations
  };
}
