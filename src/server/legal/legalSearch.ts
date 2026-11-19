import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import type {
  AuthorityTier,
  CassationComparison,
  LegalJurisdiction,
  LegalQuestionAnalysis,
  LegalSearchRequest,
  LegalSearchResponse,
  LegalSourceRecord,
  MatchedPassage,
  RetrievedLegalSource,
} from "./legalTypes";
import { OROMIA_AND_FEDERAL_LEGISLATION_DB } from "../../data/legislationDatabase";
import { CASSATION_PRECEDENTS_DATA } from "../../data/cassationPrecedents";
import { MASTER_FILES } from "../../data/telegramMasterArchive";
import { SDFHH_ARTICLES_DATABASE } from "../../data/sdfhhCodeDatabase";
import { getLocalCachedLegalSources } from "./legalSourceWorkflowService";
import {
  getIndexVersion,
  getIndexedChunksForSource,
} from "./documentIngestionPipeline";
import {
  analyzeLegalQuestion,
  expandLegalSynonymsAndConcepts,
} from "./questionUnderstanding";

const LAW_COLLECTION = "legal_sources";
const CASSATION_COLLECTION = "cassation_decisions";
const TELEGRAM_COLLECTION = "telegram_legal_documents";
const QNA_COLLECTION = "legal_qna_repository";

const MAX_QUERY_TOKENS = 18;
const MAX_RESULTS_PER_COLLECTION = 40;

// Safe query cache keyed cleanly by indexVersion + tenant scope + parameters (§14)
const queryCache = new Map<string, { expiresAt: number; response: LegalSearchResponse }>();
const CACHE_TTL_MS = 30_000;

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTokens(question: string): string[] {
  const stopWords = new Set([
    "the", "and", "for", "with", "from", "that", "this", "what", "when",
    "where", "which", "who", "how", "can", "may", "does", "into", "about",
    "are", "under", "was", "were", "have", "has", "had",
    "akka", "maal", "maaliif", "eessa", "yoom", "eenyu", "akkam", "jedha", "jedhamu",
    "labsii", "seera", "lakk", "lakkoofsa", "kwt", "keeyyata", "keewwata", "irraa", "irratti", "kana",
    "እና", "ወይም", "ምን", "እንዴት", "ለምን", "ይላል", "አዋጅ", "ህግ", "ሕግ", "ቁጥር", "አንቀጽ", "አንቀፅ",
  ]);

  return [
    ...new Set(
      normalizeText(question)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !stopWords.has(token))
    ),
  ].slice(0, MAX_QUERY_TOKENS);
}

function jurisdictionMatches(
  sourceJurisdiction: string,
  requested: LegalJurisdiction
): boolean {
  if (requested === "unknown" || requested === "both") return true;
  return sourceJurisdiction === requested;
}

function resolveAuthorityTier(source: LegalSourceRecord): AuthorityTier {
  if (source.authorityTier) return source.authorityTier;
  if (source.status === "UNVERIFIED" || source.status === "UNDER_REVIEW" || source.status === "REJECTED") {
    return "unverified_material";
  }
  switch (source.sourceType) {
    case "cassation_decision":
      return "binding_precedent";
    case "proclamation":
    case "civil_code":
    case "criminal_code":
      return "statutory_primary";
    case "court_decision":
      return "persuasive_authority";
    case "regulation":
    case "directive":
    case "official_guideline":
      return "statutory_secondary";
    default:
      return "commentary";
  }
}

function authorityRankWeight(tier: AuthorityTier): number {
  switch (tier) {
    case "binding_precedent":
      return 14;
    case "statutory_primary":
      return 12;
    case "persuasive_authority":
      return 8;
    case "statutory_secondary":
      return 7;
    case "commentary":
      return 3;
    case "unverified_material":
      return 1;
    case "user_discussion":
      return 0;
  }
}

function courtHierarchyWeight(source: LegalSourceRecord): number {
  const text = `${source.courtName || ""} ${source.issuingInstitution || ""}`.toLowerCase();
  if (/federal supreme court cassation|mana murtii waliigalaa federaalaa dhaddacha ijibbaataa|ሰበር/.test(text)) {
    return 6;
  }
  if (/oromia supreme court|mana murtii waliigalaa oromiyaa|fdre|house of peoples|caffee/.test(text)) {
    return 5;
  }
  if (/high court|mana murtii ol['’]?aanaa/.test(text)) {
    return 3;
  }
  return 1;
}

function isUsableSource(source: LegalSourceRecord, allowUnverified: boolean): boolean {
  if (source.archived || source.workflowStatus === "ARCHIVED" || source.status === "REJECTED") {
    return false;
  }
  if (!source.title || !source.issuingInstitution || !source.legalIssueSummary || !source.holdingOrRule) {
    return false;
  }
  if (source.sourceType === "cassation_decision" && !source.decisionNumber) {
    return false;
  }
  if (allowUnverified) {
    return true;
  }
  return source.status === "VERIFIED" && source.sourceAuthenticityConfirmed === true;
}

function isTenantAccessible(source: LegalSourceRecord, callerInstitutionId?: string): boolean {
  if (source.isPublic === false || (source.institutionId && source.institutionId.trim().length > 0)) {
    return Boolean(callerInstitutionId && source.institutionId === callerInstitutionId);
  }
  return true;
}

function buildMatchedPassages(
  source: LegalSourceRecord,
  tokens: string[],
  synonyms: string[]
): MatchedPassage[] {
  const passages: MatchedPassage[] = [];
  const searchPool = [...tokens, ...synonyms.map((s) => normalizeText(s))].filter((t) => t.length >= 2);
  const chunks = getIndexedChunksForSource(source.id);

  if (chunks.length > 0) {
    const scoredChunks = chunks
      .map((c) => {
        const lower = normalizeText(c.text);
        const hits = searchPool.filter((tok) => lower.includes(tok)).length;
        return { chunk: c, hits };
      })
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 3);

    for (const sc of scoredChunks) {
      passages.push({
        page: sc.chunk.pageNumber,
        section: `Kutaa ${sc.chunk.sectionIndex}`,
        snippet: sc.chunk.text.slice(0, 360),
        citationLabel: `[${source.title}, Fuula ${sc.chunk.pageNumber}, Kutaa ${sc.chunk.sectionIndex}]`,
      });
    }
  }

  if (passages.length === 0 && (source.relevantText || source.holdingOrRule)) {
    const body = (source.relevantText || source.holdingOrRule).trim();
    const lines = body.split(/\n+/).filter((l) => l.trim().length > 10);
    const hitLine = lines.find((l) => searchPool.some((tok) => normalizeText(l).includes(tok))) || lines[0];
    if (hitLine) {
      passages.push({
        page: source.page ? parseInt(source.page, 10) || 1 : 1,
        section: "Kutaa 1",
        snippet: hitLine.slice(0, 360),
        citationLabel: `[${source.title}, Fuula ${source.page || 1}, Kutaa 1]`,
      });
    }
  }

  return passages;
}

/**
 * Loads structured local repositories + uploaded/ingested cache into searchable LegalSourceRecord[].
 */
function gatherLocalLegalCorpus(
  requestedJurisdiction: LegalJurisdiction,
  includeTelegramArchive = true
): LegalSourceRecord[] {
  const corpus: LegalSourceRecord[] = [];

  // 0. Recently ingested & workflow sources (PDF, DOCX, OCR, Telegram Exports)
  for (const s of getLocalCachedLegalSources()) {
    corpus.push(s);
  }

  // 1. Legislation DB (Oromia & Federal)
  if (Array.isArray(OROMIA_AND_FEDERAL_LEGISLATION_DB)) {
    for (const leg of OROMIA_AND_FEDERAL_LEGISLATION_DB) {
      if (!jurisdictionMatches(leg.jurisdiction, requestedJurisdiction)) continue;

      const title = leg.title.om || leg.title.en || leg.title.am || leg.number;
      const summary = leg.summary.om || leg.summary.en || leg.summary.am || "";
      const authority = leg.authority.om || leg.authority.en || leg.authority.am || "FDRE Legislative Body";
      const articlesList = (leg.fullTextArticles || []).map((a) => `Kwt. ${a.articleNumber}`);

      corpus.push({
        id: `local_leg_${leg.id}`,
        title,
        titleOm: leg.title.om,
        titleAm: leg.title.am,
        titleEn: leg.title.en,
        sourceType: leg.type === "cassation_decision" ? "cassation_decision" : leg.type === "regulation" ? "regulation" : leg.type === "directive" ? "directive" : "proclamation",
        category:
          leg.jurisdiction === "oromia"
            ? "Oromia Regional Laws and Regulations"
            : "Federal Laws and Proclamations",
        jurisdiction: leg.jurisdiction as "federal" | "oromia",
        issuingInstitution: authority,
        proclamationNumber: leg.number,
        articleNumbers: articlesList,
        effectiveDate: leg.yearGC ? `${leg.yearGC}-01-01` : undefined,
        issueDate: leg.yearGC ? String(leg.yearGC) : undefined,
        status: "VERIFIED",
        authorityTier: leg.type === "regulation" || leg.type === "directive" ? "statutory_secondary" : "statutory_primary",
        legalIssueSummary: summary,
        holdingOrRule: summary,
        relevantText: [
          leg.summary.om,
          leg.summary.am,
          leg.summary.en,
          ...(leg.fullTextArticles || []).map(
            (a) => `[Kwt. ${a.articleNumber}] ${a.content.om || ""} ${a.content.am || ""} ${a.content.en || ""}`
          ),
        ]
          .filter(Boolean)
          .join("\n\n"),
        searchTokens: [],
        isPublic: true,
        sourceAuthenticityConfirmed: true,
        officialSourceName: `Official Ethiopian Gazette / Labsii ${leg.number}`,
        verifiedBy: "SEERAAI Senior Legal Review Board",
      });
    }
  }

  // 2. Civil Procedure Code (SDFHH)
  if (Array.isArray(SDFHH_ARTICLES_DATABASE)) {
    for (const art of SDFHH_ARTICLES_DATABASE) {
      corpus.push({
        id: `sdfhh_art_${art.number}`,
        title: `Seera Adeemsa Falmii Hariiroo Hawaasaa (SDFHH) — ${art.articleLabel}: ${art.titleOm}`,
        titleOm: `${art.articleLabel} - ${art.titleOm}`,
        titleAm: `${art.articleLabel} - ${art.titleAm || art.titleOm}`,
        titleEn: `Civil Procedure Code Art. ${art.number} - ${art.titleEn || art.titleOm}`,
        sourceType: "civil_code",
        category: "Civil Code and Civil Procedure Materials",
        jurisdiction: "federal",
        issuingInstitution: "Civil Procedure Code of Ethiopia (1965 Decree No. 52)",
        proclamationNumber: "Decree 52/1965 (SDFHH)",
        articleNumbers: [String(art.number), art.articleLabel],
        status: "VERIFIED",
        authorityTier: "statutory_primary",
        legalIssueSummary: art.summaryOm || art.titleOm,
        holdingOrRule: art.summaryOm || art.titleOm,
        relevantText: [
          `[${art.articleLabel}] ${art.titleOm}`,
          art.summaryOm,
          art.summaryAm,
          art.summaryEn,
        ]
          .filter(Boolean)
          .join("\n"),
        searchTokens: [],
        isPublic: true,
        sourceAuthenticityConfirmed: true,
        officialSourceName: "Civil Procedure Code (SDFHH)",
        verifiedBy: "SEERAAI Codified Statute Index",
      });
    }
  }

  // 3. Cassation Precedents DB
  if (Array.isArray(CASSATION_PRECEDENTS_DATA)) {
    for (const cas of CASSATION_PRECEDENTS_DATA) {
      const jur = cas.courtJurisdiction || "federal";
      if (!jurisdictionMatches(jur, requestedJurisdiction)) continue;

      const decisionNo = cas.fileNumber || cas.id;
      const title = `Galmee Lakk. ${decisionNo} (Jildii ${cas.volume}) - ${cas.legalIssue?.om || "Murtii Dhaddacha Ijibbaataa"}`;
      const summary = cas.legalIssue?.om || cas.legalIssue?.en || cas.legalIssue?.am || "";
      const principle = cas.bindingPrinciple?.om || cas.bindingPrinciple?.en || cas.bindingPrinciple?.am || summary;
      const courtNameStr =
        cas.courtName?.om ||
        (jur === "oromia"
          ? "Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa"
          : "Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa");

      const channel = (cas as any).channel || "seeraai_ethio";
      const postUrl = (cas as any).telegramUrl || `https://t.me/${channel.replace("@", "")}/${(cas as any).postNumber || decisionNo}`;

      corpus.push({
        id: `local_cas_${cas.id}`,
        title,
        titleOm: cas.legalIssue?.om,
        titleAm: cas.legalIssue?.am,
        titleEn: cas.legalIssue?.en,
        sourceType: "cassation_decision",
        category:
          jur === "oromia"
            ? "Oromia Supreme Court Decisions"
            : "Federal Supreme Court Cassation Decisions",
        jurisdiction: jur,
        issuingInstitution: courtNameStr,
        courtName: courtNameStr,
        decisionNumber: String(decisionNo),
        volume: String(cas.volume || "18"),
        articleNumbers: cas.statutoryProvisions || [],
        status: "VERIFIED",
        authorityTier: jur === "federal" ? "binding_precedent" : "persuasive_authority",
        legalIssueSummary: summary,
        holdingOrRule: principle,
        relevantText: [
          `Qajeeltoo Dirqisiisaa: ${principle}`,
          cas.legalIssue?.am || "",
          cas.bindingPrinciple?.am || "",
          cas.legalIssue?.en || "",
          cas.bindingPrinciple?.en || "",
          `Madda Telegram: @${channel.replace("@", "")} (${postUrl})`,
        ]
          .filter(Boolean)
          .join("\n"),
        searchTokens: [],
        isPublic: true,
        channelHandle: channel.replace("@", ""),
        telegramPostUrl: postUrl,
        sourceAuthenticityConfirmed: true,
        officialSourceName: `Dhaddacha Ijibbaataa (@${channel.replace("@", "")}) Vol ${cas.volume}`,
        officialSourceUrl: postUrl,
        verifiedBy: "SEERAAI Cassation Review Board",
      });
    }
  }

  // 4. Telegram Master Archive
  if (includeTelegramArchive && Array.isArray(MASTER_FILES)) {
    for (const file of MASTER_FILES) {
      const decisionNo = file.fileNumber;
      const channel = file.channelHandle || "seeraai_ethio";
      const postUrl = file.postUrl || `https://t.me/${channel}/${file.postNumber || decisionNo}`;
      const title = `Galmee Lakk. ${decisionNo} (${file.volume}) - ${file.title?.om || "Murtii Dhaddacha Ijibbaataa"}`;
      const summary = file.summary?.om || file.summary?.en || "";
      const principle = file.principle?.om || file.principle?.en || summary;

      corpus.push({
        id: `tg_archive_${file.id}`,
        title,
        titleOm: file.title?.om,
        titleAm: file.title?.om,
        titleEn: file.title?.en,
        sourceType: "cassation_decision",
        category: "Federal Supreme Court Cassation Decisions",
        jurisdiction: "federal",
        issuingInstitution: `Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa (${file.volume})`,
        courtName: "Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa",
        decisionNumber: String(decisionNo),
        volume: file.volume,
        articleNumbers: file.keyArticles?.om ? [file.keyArticles.om] : [],
        status: "VERIFIED",
        authorityTier: "binding_precedent",
        legalIssueSummary: summary,
        holdingOrRule: principle,
        relevantText: `Murtii Dhaddacha Ijibbaataa Galmee Lakk. ${decisionNo}:\n${summary}\nQajeeltoo Dirqisiisaa: ${principle}\n${file.title?.en || ""}\n${file.summary?.en || ""}\nMadda Telegram: @${channel} (${postUrl})`,
        searchTokens: [],
        isPublic: true,
        channelHandle: channel,
        telegramPostUrl: postUrl,
        sourceAuthenticityConfirmed: true,
        officialSourceName: `Telegram Legal Archive (@${channel})`,
        officialSourceUrl: postUrl,
        verifiedBy: "SEERAAI Official Telegram Archive",
      });
    }
  }

  return corpus;
}

/**
 * Multi-factor legal relevance & authority scorer (§6, §8).
 * Never ranks a source highly merely because it repeats common words.
 */
function evaluateCandidateRelevance(
  source: LegalSourceRecord,
  tokens: string[],
  analysis: LegalQuestionAnalysis,
  request: LegalSearchRequest
): { score: number; whyRelevant: string; matchedPassages: MatchedPassage[] } {
  const titleNorm = normalizeText([source.title, source.titleOm, source.titleAm, source.titleEn].filter(Boolean).join(" "));
  const bodyNorm = normalizeText([source.legalIssueSummary, source.holdingOrRule, source.relevantText].filter(Boolean).join(" "));
  const fullNorm = `${titleNorm} ${bodyNorm}`;

  const reasons: string[] = [];
  let matchScore = 0;

  // 1. Exact Case Number Match
  const requestedCases = [
    ...(request.caseNumber ? [request.caseNumber.trim()] : []),
    ...analysis.extractedCaseNumbers,
  ];
  for (const cNo of requestedCases) {
    if (cNo && source.decisionNumber && normalizeText(source.decisionNumber).includes(normalizeText(cNo))) {
      matchScore += 35;
      reasons.push(`Exact Cassation/Case File No. match (${source.decisionNumber})`);
    }
  }

  // 2. Exact Proclamation Number Match
  for (const pNo of analysis.extractedProclamationNumbers) {
    if (
      (source.proclamationNumber && normalizeText(source.proclamationNumber).includes(normalizeText(pNo))) ||
      titleNorm.includes(normalizeText(pNo))
    ) {
      matchScore += 30;
      reasons.push(`Exact Proclamation/Statute No. match (${pNo})`);
    }
  }

  // 3. Legal Article Match
  const requestedArts = [
    ...(request.legalArticle ? [request.legalArticle.trim()] : []),
    ...analysis.extractedArticleNumbers,
  ];
  for (const art of requestedArts) {
    const cleanArt = normalizeText(art).replace(/^(kwt|keeyyata|art|article)\s*/i, "");
    if (
      cleanArt &&
      (source.articleNumbers?.some((a) => normalizeText(a).includes(cleanArt)) ||
        new RegExp(`(?:kwt|keeyyata|art|article|አንቀጽ)[.\\s]*${cleanArt}\\b`, "i").test(fullNorm))
    ) {
      matchScore += 18;
      reasons.push(`Matching statutory Article ${cleanArt}`);
    }
  }

  // 4. Semantic Concept & Trilingual Synonym Overlap (§5 + §6)
  const { detectedConcepts: srcConcepts } = expandLegalSynonymsAndConcepts(fullNorm);
  const sharedConcepts = analysis.detectedConcepts.filter((c) => srcConcepts.includes(c));
  if (sharedConcepts.length > 0) {
    matchScore += Math.min(20, sharedConcepts.length * 8);
    reasons.push(`Same legal issue concept (${sharedConcepts.join(", ")})`);
  }

  // 5. Token overlap (capped per distinct token so keyword stuffing doesn't dominate §8)
  let tokenHits = 0;
  for (const tok of tokens) {
    if (titleNorm.includes(tok)) {
      matchScore += 4;
      tokenHits++;
    } else if (bodyNorm.includes(tok)) {
      matchScore += 2.5;
      tokenHits++;
    }
  }
  const synNorms = analysis.expandedSynonyms.map((s) => normalizeText(s)).filter((s) => s.length >= 3);
  let synHits = 0;
  for (const syn of synNorms) {
    if (fullNorm.includes(syn)) {
      synHits++;
    }
  }
  if (synHits > 0 && tokenHits === 0) {
    matchScore += Math.min(12, synHits * 3);
    reasons.push("Trilingual legal synonym/equivalent terminology match");
  }

  if (request.keyword && fullNorm.includes(normalizeText(request.keyword))) {
    matchScore += 8;
    reasons.push(`Matched explicit keyword "${request.keyword}"`);
  }

  // Fail closed on zero substantive relevance when tokens/query were supplied
  if (matchScore === 0) {
    return { score: 0, whyRelevant: "", matchedPassages: [] };
  }

  // If user asked for a VERY specific nonexistent proclamation or long case number AND zero exact/concept hits occurred, do not surface irrelevant noise!
  if (
    analysis.extractedProclamationNumbers.length > 0 &&
    !reasons.some((r) => r.includes("Proclamation")) &&
    sharedConcepts.length === 0 &&
    tokenHits === 0
  ) {
    return { score: 0, whyRelevant: "", matchedPassages: [] };
  }

  // 6. Stage B Authority, Court Level, Verification & Completeness Modifiers (§8)
  const tier = resolveAuthorityTier(source);
  const authBonus = authorityRankWeight(tier);
  const courtBonus = courtHierarchyWeight(source);
  const completenessBonus = source.structuredExtraction?.holdingAndFinalOrder || source.relevantText ? 3 : 0;
  const verificationBonus = source.status === "VERIFIED" && source.sourceAuthenticityConfirmed ? 5 : -2;
  const totalScore = Number((matchScore + authBonus + courtBonus + completenessBonus + verificationBonus).toFixed(2));

  const matchedPassages = buildMatchedPassages(source, tokens, analysis.expandedSynonyms);
  if (reasons.length === 0) {
    reasons.push(`Matched ${tokenHits} key legal term(s) inside verified legal text`);
  }
  if (tier === "binding_precedent") reasons.push("Binding Cassation authority");
  if (source.status !== "VERIFIED") reasons.push("Status: UNVERIFIED (requires human legal confirmation)");

  return {
    score: totalScore,
    whyRelevant: reasons.join(" · "),
    matchedPassages,
  };
}

/**
 * Searches for contrary authorities, exceptions, or limiting interpretations (§6).
 */
function findContraryAuthorities(
  corpus: LegalSourceRecord[],
  primaryIds: Set<string>,
  analysis: LegalQuestionAnalysis,
  callerInstitutionId?: string
): RetrievedLegalSource[] {
  const contraryMarkers = [
    "except", "unless", "however", "provided that", "time bar", "limitation",
    "burden", "inadmissible", "null and void", "distinguish", "overrule",
    "malee", "yoo ta'e malee", "darbiinsa yeroo", "haquu", "mormii", "faallaa",
    "ካልሆነ በስተቀር", "ይርጋ", "ተቃራኒ", "ልዩ ሁኔታ", "ውድቅ",
  ];

  const found: RetrievedLegalSource[] = [];
  for (const src of corpus) {
    if (primaryIds.has(src.id)) continue;
    if (!isTenantAccessible(src, callerInstitutionId)) continue;
    if (!isUsableSource(src, false)) continue;

    const fullText = normalizeText(`${src.title} ${src.legalIssueSummary} ${src.holdingOrRule} ${src.relevantText || ""}`);
    const { detectedConcepts } = expandLegalSynonymsAndConcepts(fullText);
    const sameDomain =
      analysis.detectedConcepts.length === 0 ||
      detectedConcepts.some((c) => analysis.detectedConcepts.includes(c));
    if (!sameDomain) continue;

    const hitMarkers = contraryMarkers.filter((m) => fullText.includes(m));
    if (hitMarkers.length >= 1) {
      found.push({
        ...src,
        score: hitMarkers.length * 4 + authorityRankWeight(resolveAuthorityTier(src)),
        authorityTier: resolveAuthorityTier(src),
        isContraryAuthority: true,
        whyRelevant: `Potential exception / contrary limitation or distinguishing rule (${hitMarkers.slice(0, 3).join(", ")})`,
        matchedPassages: buildMatchedPassages(src, [], analysis.expandedSynonyms),
      });
    }
  }

  return found.sort((a, b) => b.score - a.score).slice(0, 3);
}

/**
 * Builds structured Cassation Precedent Comparison (§7) for verified & candidate decisions.
 */
export function buildCassationComparisons(
  results: RetrievedLegalSource[],
  contrary: RetrievedLegalSource[],
  analysis: LegalQuestionAnalysis
): CassationComparison[] {
  const cassationSources = results.filter((r) => r.sourceType === "cassation_decision").slice(0, 4);
  return cassationSources.map((src) => {
    const similarFacts: string[] = [];
    const differentFacts: string[] = [];

    if (analysis.detectedConcepts.length > 0) {
      similarFacts.push(`Shared legal domain: ${analysis.subjectDomain} (${analysis.detectedConcepts.join(", ")})`);
    }
    if (analysis.extractedArticleNumbers.length > 0 && src.articleNumbers?.length) {
      similarFacts.push(`Interprets overlapping provision(s): ${src.articleNumbers.join(", ")}`);
    }
    if (analysis.suppliedFacts.length > 0) {
      similarFacts.push(`Requires comparison against user-supplied facts (${analysis.suppliedFacts.length} element(s))`);
    } else {
      differentFacts.push("User did not supply complete evidentiary timeline or document record for one-to-one fact matching.");
    }

    if (src.jurisdiction !== analysis.jurisdiction && analysis.jurisdiction !== "both") {
      differentFacts.push(`Decision jurisdictional origin (${src.jurisdiction}) vs requested jurisdiction (${analysis.jurisdiction}).`);
    }
    if (analysis.missingFacts.length > 0) {
      differentFacts.push(`Missing case facts could alter outcome: ${analysis.missingFacts[0]}`);
    }

    const ruleApplies: CassationComparison["ruleApplies"] =
      src.status !== "VERIFIED"
        ? "UNCERTAIN"
        : differentFacts.length > similarFacts.length
          ? "DISTINGUISHABLE"
          : "APPLIES";

    const contraryHit = contrary.find((c) => c.id !== src.id);
    return {
      sourceId: src.id,
      caseNumber: src.decisionNumber || src.id,
      volume: src.volume,
      page: src.page || (src.matchedPassages?.[0]?.page ? String(src.matchedPassages[0].page) : undefined),
      decisionDate: src.dateGC || src.effectiveDate || src.issueDate,
      court: src.courtName || src.issuingInstitution,
      legalIssue: src.legalIssueSummary,
      whyRelevant: src.whyRelevant || "Addresses analogous legal issue and statutory provision.",
      similarFacts,
      differentFacts,
      ruleApplies,
      contraryApproachNotes: contraryHit
        ? `Compare with ${contraryHit.decisionNumber ? `Galmee ${contraryHit.decisionNumber}` : contraryHit.title}: ${contraryHit.legalIssueSummary.slice(0, 140)}`
        : undefined,
      verificationStatus: src.status,
      sourceDocumentAndPage: `[${src.title}, Fuula ${src.page || src.matchedPassages?.[0]?.page || 1}]`,
      channelHandle: src.channelHandle,
      telegramPostUrl: src.telegramPostUrl,
    };
  });
}

export async function retrieveLegalSources(
  db: Firestore | null,
  question: string,
  requestedJurisdiction: LegalJurisdiction,
  maxSources = 12,
  options?: {
    mode?: "fast" | "deep";
    callerInstitutionId?: string;
    includeUnverified?: boolean;
  }
): Promise<RetrievedLegalSource[]> {
  const results = await searchLegalSources(db, {
    query: question,
    jurisdiction: requestedJurisdiction,
    maxResults: maxSources,
    mode: options?.mode,
    callerInstitutionId: options?.callerInstitutionId,
    verificationFilter: options?.includeUnverified ? "all" : "verified",
  });
  return results.results;
}

export async function searchLegalSources(
  db: Firestore | null,
  request: LegalSearchRequest
): Promise<LegalSearchResponse> {
  const startedAt = Date.now();
  const requestId = randomUUID();
  const indexVersion = getIndexVersion();
  const mode = request.mode || "deep";
  const allowUnverified = request.verificationFilter === "all" || request.verificationFilter === "unverified";

  const cacheKey = JSON.stringify({
    q: request.query,
    j: request.jurisdiction,
    c: request.category,
    cn: request.caseNumber,
    art: request.legalArticle,
    ct: request.court,
    kw: request.keyword,
    vf: request.verificationFilter,
    m: mode,
    inst: request.callerInstitutionId || "public",
    iv: indexVersion,
  });

  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.response,
      requestId,
      latencyMs: Date.now() - startedAt,
    };
  }

  const combinedQuery = [
    request.query,
    request.caseNumber,
    request.legalArticle,
    request.court,
    request.keyword,
    ...(request.topics || []),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!combinedQuery) {
    return { ok: true, results: [], totalCount: 0, requestId, indexVersion, latencyMs: 0 };
  }

  const analysis = analyzeLegalQuestion({
    question: combinedQuery,
    jurisdiction: request.jurisdiction || "both",
  });
  const tokens = extractTokens(combinedQuery);
  const querySearchTokens = [
    ...new Set([
      ...tokens,
      ...analysis.expandedSynonyms.map((s) => normalizeText(s)).slice(0, 10),
    ]),
  ].slice(0, 10);

  let candidates: LegalSourceRecord[] = [];

  try {
    // Stage A.1: Firestore retrieval (if admin SDK active)
    if (db) {
      try {
        const collections = [LAW_COLLECTION, CASSATION_COLLECTION];
        if (request.includeTelegramArchive !== false) {
          collections.push(TELEGRAM_COLLECTION);
        }

        const snapshots = await Promise.all(
          collections.map((col) => {
            let q: any = db.collection(col);
            if (!allowUnverified && col !== TELEGRAM_COLLECTION) {
              q = q.where("status", "==", "VERIFIED");
            }
            if (querySearchTokens.length > 0 && col !== TELEGRAM_COLLECTION) {
              q = q.where("searchTokens", "array-contains-any", querySearchTokens);
            }
            return q.limit(MAX_RESULTS_PER_COLLECTION).get();
          })
        );

        for (const snap of snapshots) {
          for (const d of snap.docs) {
            const data = d.data() as LegalSourceRecord;
            candidates.push({ ...data, id: d.id });
          }
        }

        if (allowUnverified) {
          const qnaSnap = await db.collection(QNA_COLLECTION).limit(10).get();
          for (const d of qnaSnap.docs) {
            const qd = d.data() as any;
            if (qd.question && qd.answer) {
              candidates.push({
                id: `qna_${d.id}`,
                title: String(qd.question).slice(0, 120),
                sourceType: "other",
                category: "Other verified legal materials",
                jurisdiction: "federal",
                issuingInstitution: "SEERAAI Legal Q&A Repository",
                status: qd.isVerifiedByExpert ? "VERIFIED" : "UNVERIFIED",
                authorityTier: qd.isVerifiedByExpert ? "commentary" : "user_discussion",
                legalIssueSummary: String(qd.question),
                holdingOrRule: typeof qd.answer === "string" ? qd.answer : String(qd.answer?.om || qd.answer?.en || ""),
                searchTokens: [],
                isPublic: true,
                sourceAuthenticityConfirmed: Boolean(qd.isVerifiedByExpert),
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn("[searchLegalSources] Firestore query unavailable, continuing with local & ingested index:", dbErr instanceof Error ? dbErr.message : dbErr);
      }
    }

    // Stage A.2: Local + Ingested Docs + Telegram Master Archive
    const localCorpus = gatherLocalLegalCorpus(
      request.jurisdiction || "both",
      request.includeTelegramArchive !== false
    );
    candidates = [...candidates, ...localCorpus];

    // Stage A.3 + Stage B: Filtering, Relevance Scoring & Authority Ranking
    const unique = new Map<string, RetrievedLegalSource>();
    for (const source of candidates) {
      if (!isTenantAccessible(source, request.callerInstitutionId)) continue;
      if (!isUsableSource(source, allowUnverified)) continue;

      if (request.verificationFilter === "verified" && source.status !== "VERIFIED") continue;
      if (request.verificationFilter === "unverified" && source.status === "VERIFIED") continue;

      if (request.jurisdiction && !jurisdictionMatches(source.jurisdiction, request.jurisdiction)) continue;

      if (request.languages && request.languages.length > 0) {
        const hasLang = request.languages.some(
          (lang) =>
            source.language === lang ||
            (lang === "om" && source.titleOm) ||
            (lang === "am" && source.titleAm) ||
            (lang === "en" && source.titleEn) ||
            !source.language
        );
        if (!hasLang) continue;
      }

      if (request.sourceTypes && request.sourceTypes.length > 0) {
        if (!request.sourceTypes.includes(source.sourceType)) continue;
      }

      if (request.category && source.category !== request.category) {
        continue;
      }

      if (request.court?.trim()) {
        const cNorm = normalizeText(request.court);
        const srcCourt = normalizeText(`${source.courtName || ""} ${source.issuingInstitution}`);
        if (!srcCourt.includes(cNorm)) continue;
      }

      if (request.caseNumber?.trim()) {
        const cn = normalizeText(request.caseNumber);
        const srcNo = normalizeText(`${source.decisionNumber || ""} ${source.proclamationNumber || ""} ${source.title}`);
        if (!srcNo.includes(cn)) continue;
      }

      if (request.legalArticle?.trim()) {
        const art = normalizeText(request.legalArticle).replace(/^(kwt|keeyyata|art|article)\s*/i, "");
        const srcText = normalizeText(`${(source.articleNumbers || []).join(" ")} ${source.relevantText || ""} ${source.title}`);
        if (!srcText.includes(art)) continue;
      }

      if (request.dateRange) {
        const docDate = source.effectiveDate || source.dateGC || source.issueDate;
        if (docDate) {
          if (request.dateRange.start && docDate < request.dateRange.start) continue;
          if (request.dateRange.end && docDate > request.dateRange.end) continue;
        }
      }

      if (request.topics && request.topics.length > 0) {
        const searchable = normalizeText(
          [source.title, source.legalIssueSummary, source.holdingOrRule, ...(source.keywords || [])].join(" ")
        );
        const hasTopic = request.topics.some((t) => searchable.includes(normalizeText(t)));
        if (!hasTopic) continue;
      }

      const evaluated = evaluateCandidateRelevance(source, tokens, analysis, request);
      if (evaluated.score <= 0) continue;

      const existing = unique.get(source.id);
      if (!existing || evaluated.score > existing.score) {
        unique.set(source.id, {
          ...source,
          authorityTier: resolveAuthorityTier(source),
          score: evaluated.score,
          whyRelevant: evaluated.whyRelevant,
          matchedPassages: evaluated.matchedPassages,
        });
      }
    }

    const limit = request.maxResults || (mode === "fast" ? 8 : 20);
    const ranked = [...unique.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const primaryIds = new Set(ranked.map((r) => r.id));
    const contraryAuthorities =
      mode === "deep" && ranked.length > 0
        ? findContraryAuthorities(candidates, primaryIds, analysis, request.callerInstitutionId)
        : [];

    const cassationComparisons =
      mode === "deep" && ranked.length > 0
        ? buildCassationComparisons(ranked, contraryAuthorities, analysis)
        : [];

    const response: LegalSearchResponse = {
      ok: true,
      results: ranked,
      contraryAuthorities,
      questionAnalysis: analysis,
      cassationComparisons,
      totalCount: unique.size,
      latencyMs: Date.now() - startedAt,
      indexVersion,
      requestId,
    };

    queryCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      response,
    });

    return response;
  } catch (err) {
    console.error("[searchLegalSources] error:", err);
    return {
      ok: false,
      results: [],
      totalCount: 0,
      latencyMs: Date.now() - startedAt,
      indexVersion,
      requestId,
    };
  }
}
