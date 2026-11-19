import { LegalDatabaseRecord, LegalSearchRequest, LegalSearchResult, MultilingualText } from '../types/legal';

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSearchTerms(value: string): string[] {
  const normalized = normalizeSearchText(value);
  const matches = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(matches.filter((term) => term.length > 1))];
}

export function flattenMultilingualText(value?: MultilingualText | null): string {
  if (!value) return "";
  return [value.om, value.am, value.en]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ");
}

export function normalizeLegalReference(value: string): string {
  return normalizeSearchText(value).replace(/[^\p{L}\p{N}]/gu, "");
}

function getRecordSearchableText(record: LegalDatabaseRecord): string {
  if (record.recordType === "enactment") {
    return [
      flattenMultilingualText(record.title),
      flattenMultilingualText(record.shortTitle),
      flattenMultilingualText(record.summary),
      ...record.fullTextArticles.flatMap((article) => [
        article.articleNumber,
        flattenMultilingualText(article.title),
        flattenMultilingualText(article.content),
        ...(article.keywords ?? []),
      ]),
      ...record.tags,
      record.number,
    ].join(" ");
  }

  return [
    flattenMultilingualText(record.subject),
    ...record.legalQuestions.map(flattenMultilingualText),
    flattenMultilingualText(record.facts),
    flattenMultilingualText(record.courtReasoning),
    flattenMultilingualText(record.decisionOutcome),
    ...record.bindingPrinciples.map((item) => flattenMultilingualText(item.principle)),
    record.caseNumber,
    ...(record.tags ?? []),
  ].join(" ");
}

export function scoreLegalRecord(
  record: LegalDatabaseRecord,
  request: LegalSearchRequest
): LegalSearchResult {
  let score = 0;
  const reasons: string[] = [];

  const exactCase = record.recordType === "cassation_decision" &&
    Boolean(request.caseNumber) &&
    normalizeLegalReference(record.caseNumber) === normalizeLegalReference(request.caseNumber ?? "");

  const exactEnactment = record.recordType === "enactment" &&
    Boolean(request.caseNumber) &&
    normalizeLegalReference(record.number) === normalizeLegalReference(request.caseNumber ?? "");

  if (exactCase || exactEnactment) {
    score = 100;
    reasons.push("Exact record number match found.");
  } else {
    // Jurisdiction match
    if (request.jurisdiction && record.jurisdiction === request.jurisdiction) {
      score += 10;
      reasons.push("Jurisdiction match.");
    }

    // Category match
    if (request.category && record.category === request.category) {
      score += 10;
      reasons.push("Legal category match.");
    }

    // Term matching
    const queryTerms = extractSearchTerms(request.question);
    const documentTerms = new Set(extractSearchTerms(getRecordSearchableText(record)));
    const matchedTerms = queryTerms.filter(term => documentTerms.has(term));
    const termCoverage = queryTerms.length ? (matchedTerms.length / queryTerms.length) : 0;
    
    score += Math.round(70 * termCoverage);
    if (matchedTerms.length > 0) {
      reasons.push(`${matchedTerms.length} keywords matched.`);
    }

    // Verification boost
    if (record.verificationStatus === 'verified') {
      score += 5;
      reasons.push("Verified authoritative source.");
    }
  }

  const boundedScore = Math.min(100, Math.max(0, score));
  const matchType = boundedScore >= 90 ? "exact" : boundedScore >= 50 ? "high_relevance" : "related";

  return {
    record,
    relevanceScore: boundedScore,
    matchType,
    matchedTerms: extractSearchTerms(request.question).filter(t => extractSearchTerms(getRecordSearchableText(record)).includes(t)),
    relevanceExplanation: reasons.join(" "),
    sourceVerified: record.verificationStatus === 'verified'
  };
}
