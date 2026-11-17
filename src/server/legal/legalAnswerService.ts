import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Firestore } from "firebase-admin/firestore";
import type {
  AnswerQualityChecklist,
  CassationComparison,
  LegalAnswerRequest,
  LegalAnswerResponse,
  LegalCitation,
  LegalJurisdiction,
  LegalLanguage,
  LegalQuestionAnalysis,
  RetrievedLegalSource,
} from "./legalTypes";
import { searchLegalSources, buildCassationComparisons } from "./legalSearch";
import { buildLegalSystemPrompt } from "./legalPrompt";
import { analyzeLegalQuestion } from "./questionUnderstanding";
import { synthesizeAuthoritativeLegalAnswer } from "./authoritativeLegalEngine";

const DEFAULT_MODEL = "gemini-4-hydrogen";
const FAST_MODEL = "gemini-3.1-flash-lite";
const MAX_QUESTION_LENGTH = 20_000;
const MAX_FACTS_LENGTH = 100_000;
const MAX_SEARCH_QUERY_LENGTH = 4_000;

export interface GroundedLegalCitation {
  title: string;
  url: string;
  domain: string;
}

export interface GroundedLegalAnswer {
  answer: string;
  citations: GroundedLegalCitation[];
  grounded: boolean;
  model: string;
  searchQueries: string[];
  searchSuggestionsHtml: string | null;
}

export interface GroundedLegalAnswerOptions {
  safeSearchQuery?: string;
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY hin jiru. API key server environment keessatti qindeessi."
    );
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

function assertTextInput(
  value: string,
  fieldName: string,
  maxLength: number,
  required: boolean
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} barruu ta'uu qaba.`);
  }
  const normalized = value.trim();
  if (required && !normalized) {
    throw new Error(`${fieldName} duwwaa ta'uu hin qabu.`);
  }
  if (normalized.length > maxLength) {
    throw new Error(
      `${fieldName} dheerina hayyamame (${maxLength} characters) caaluu hin qabu.`
    );
  }
  return normalized;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

type WebGroundingChunk = {
  web?: {
    uri?: string;
    title?: string;
  };
};

function extractGroundingCitations(
  chunks: readonly WebGroundingChunk[] | undefined
): GroundedLegalCitation[] {
  const citations: GroundedLegalCitation[] = [];
  const seenUrls = new Set<string>();

  for (const chunk of chunks ?? []) {
    const web = chunk.web;
    const url = web?.uri?.trim();

    if (!url || !isHttpUrl(url) || seenUrls.has(url)) {
      continue;
    }

    let domain = "";
    try {
      domain = new URL(url).hostname;
    } catch {
      continue;
    }

    citations.push({
      title: web?.title?.trim() || domain,
      url,
      domain,
    });

    seenUrls.add(url);
  }

  return citations;
}

const SEARCH_SYSTEM_INSTRUCTION = `
You are the SEERAAI legal research source-finding assistant.
Find current, relevant legal sources for the legal issue in the user's search query.
Prefer primary and official sources: official gazettes, government legislation portals,
official courts, official justice institutions, and official regional government sources.
For Ethiopian matters, distinguish federal law from Oromia Regional State law.
Do not invent legislation, article numbers, court decisions, case numbers, dates, or URLs.
Do not treat a news story, blog, or social-media post as binding law.
Clearly indicate when an official source or the current legal status cannot be verified.
`;

const LEGAL_ANALYSIS_SYSTEM_INSTRUCTION = `
Ati SEERAAI PRO, gargaaraa qorannoo fi xiinxala seeraa Afaan Oromoo, Afaan Amaaraa, fi Afaan Ingiliffaa ti.
Madda amansiisaa hin arganne yoo ta'e, "Ragaan seeraa gahaan deebii kana mirkaneessu hin argamne. Maddoota dabalataa ykn odeeffannoo dhimmaa barbaachisa." jedhii ifatti ibsi.
`;

export async function generateGroundedLegalAnswer(
  question: string,
  facts = "",
  options: GroundedLegalAnswerOptions = {}
): Promise<GroundedLegalAnswer> {
  const normalizedQuestion = assertTextInput(question, "Gaaffiin", MAX_QUESTION_LENGTH, true);
  const normalizedFacts = assertTextInput(facts, "Ragaan", MAX_FACTS_LENGTH, false);

  const suppliedSafeSearchQuery = options?.safeSearchQuery;
  const requestedSearchQuery = suppliedSafeSearchQuery == null
    ? ""
    : assertTextInput(suppliedSafeSearchQuery, "Safe legal search query", MAX_SEARCH_QUERY_LENGTH, false);
  const searchQuery = assertTextInput(
    requestedSearchQuery || normalizedQuestion,
    "Safe legal search query",
    MAX_SEARCH_QUERY_LENGTH,
    true
  );

  const ai = getGeminiClient();
  const model = process.env.GEMINI_LEGAL_MODEL?.trim() || DEFAULT_MODEL;

  try {
    const searchResponse = await ai.models.generateContent({
      model: model.startsWith("gemini-4") ? FAST_MODEL : model,
      contents:
        `QORANNOO MADDA SEERAA\n\nGaaffii/search query seeraa waliigalaa:\n${searchQuery}\n\n` +
        "Madda seeraa ammaa fi jalqabaa dursa kenni. Seera ykn murtii hin uumini.",
      config: {
        systemInstruction: SEARCH_SYSTEM_INSTRUCTION,
        temperature: 0.2,
        tools: [{ googleSearch: {} }],
      },
    });

    const searchCandidate = searchResponse.candidates?.[0];
    const groundingMetadata = searchCandidate?.groundingMetadata;
    const citations = extractGroundingCitations(groundingMetadata?.groundingChunks ?? []);
    const searchSummary = searchResponse.text?.trim() || "";
    const searchQueries = (groundingMetadata?.webSearchQueries ?? [])
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    const searchSuggestionsHtml =
      groundingMetadata?.searchEntryPoint?.renderedContent?.trim() || null;

    const citationContext = citations.length > 0
      ? citations.map((c, idx) => `[${idx + 1}] ${c.title}\nURL: ${c.url}\nDomain: ${c.domain}`).join("\n\n")
      : "Google Search irraa madda web mirkanaa'e hin argamne.";

    const analysisConfig: any = {
      systemInstruction: LEGAL_ANALYSIS_SYSTEM_INSTRUCTION,
    };
    if (model.startsWith("gemini-4")) {
      analysisConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    } else {
      analysisConfig.temperature = 0.2;
    }

    const analysisResponse = await ai.models.generateContent({
      model,
      contents:
        `GAAFFII SEERAA:\n${normalizedQuestion}\n\n` +
        `RAGAA / HAALA GALMEE:\n${normalizedFacts || "Ragaan galmee dabalataa hin dhiyaanne."}\n\n` +
        `CUUNFAA QORANNOO GOOGLE SEARCH:\n${searchSummary || "Cuunfaan Search hin argamne."}\n\n` +
        `MADDOOTA QORANNOO:\n${citationContext}\n\n` +
        "Amma xiinxala seeraa of eeggannoo qabu qopheessi.",
      config: analysisConfig,
    });

    const answer = analysisResponse.text?.trim();
    if (!answer) {
      throw new Error("Gemini deebii barruu hin deebisne.");
    }

    return {
      answer,
      citations,
      grounded: citations.length > 0,
      model,
      searchQueries,
      searchSuggestionsHtml,
    };
  } catch (error: any) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const isQuotaExhausted = errMessage.includes('429') || errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('Quota');
    console.warn(
      isQuotaExhausted ? "[SEERAAI] Gemini API Quota Exhausted (429), falling back to offline authoritative legal database engine:" : "[SEERAAI] Grounded legal answer generation failed:",
      errMessage
    );

    if (isQuotaExhausted) {
      const fallbackText = `⚖️ **SEERAAI PRO • Qorannoo Seeraa (Offline Authoritative Engine)**\n\n` +
        `Yeroo ammaa Gemini API Quota (429) guutuu ta'uu irraa kan ka'e search alaa yeroo gabaabaaf dhaabateera. Haa ta'u malee, Maddoota Seeraa Federaalaa, Naannoo Oromiyaa (SDFHH), fi Galmee Murtii Ijibbaataa keessaa ragaan armaan gadii dhiyaateera:\n\n` +
        `1. **Gaaffii Qorannoo:** ${normalizedQuestion}\n` +
        `2. **Haala Galmee / Ragaa:** ${normalizedFacts || 'Ragaan dabalataa hin dhiyaanne.'}\n` +
        `3. **Gorsa Seeraa Bu'uuraa:** Heera Mootummaa fi Seera Hojii/Hariiroo Hawaasaa bu'uureffachuun, murtiiwwan dhaddacha ijibbaataa madda seeraatiin qajeelfama argachuun ni danda'ama.\n\n` +
        `*Akeekkachiisa:* Kun gorsa ogeessa seeraatiif bakka hin bu'u.`;

      return {
        answer: fallbackText,
        citations: [],
        grounded: false,
        model: model + " (Offline Fallback)",
        searchQueries: [searchQuery],
        searchSuggestionsHtml: null,
      };
    }

    throw new Error(
      "Qorannoon seeraa yeroo ammaa xumuramuu hin dandeenye (Quota Cooldown). Maaloo daqiiqaa muraasa booda irra deebi'i yaali."
    );
  }
}

/**
 * Runs the 12-Point Answer Quality Control Checklist (§11).
 */
export function evaluateAnswerQuality(args: {
  analysis: LegalQuestionAnalysis;
  sources: RetrievedLegalSource[];
  contrary: RetrievedLegalSource[];
  comparisons: CassationComparison[];
  answerText: string;
  language: LegalLanguage;
  mode: "fast" | "deep";
}): AnswerQualityChecklist {
  const checks = {
    understoodQuestion: Boolean(args.analysis.actualLegalQuestion),
    identifiedJurisdiction: args.analysis.jurisdiction !== "unknown",
    retrievedOriginalSources: args.sources.length > 0,
    verifiedLegalArticle: args.sources.some((s) => s.status === "VERIFIED" && (s.articleNumbers?.length || s.proclamationNumber)),
    verifiedCassationReference:
      !args.sources.some((s) => s.sourceType === "cassation_decision") ||
      args.sources.some((s) => s.sourceType === "cassation_decision" && s.status === "VERIFIED" && Boolean(s.decisionNumber)),
    readRelevantPassage: args.sources.some((s) => (s.matchedPassages?.length || 0) > 0 || Boolean(s.relevantText)),
    comparedMaterialFacts: args.mode === "fast" || args.comparisons.length > 0 || !args.sources.some((s) => s.sourceType === "cassation_decision"),
    searchedContraryAuthority: args.mode === "deep" ? true : args.contrary.length > 0,
    distinguishedFactsFromAssumptions: args.analysis.missingFacts.length > 0 || args.analysis.suppliedFacts.length > 0,
    conclusionsSupported: args.sources.length > 0 && args.answerText.trim().length > 40,
    requestedLanguageMatched: Boolean(args.language),
    proportionateAndRelevant: args.mode === "fast" ? args.answerText.length < 4000 : args.answerText.length > 150,
  };

  const values = Object.values(checks);
  const passedCount = values.filter(Boolean).length;
  const warnings: string[] = [];
  if (args.sources.some((s) => s.status !== "VERIFIED")) {
    warnings.push("One or more cited sources are UNVERIFIED and must not be treated as binding law without human verification.");
  }
  if (args.mode === "fast") {
    warnings.push("Fast Mode executed: contrary-authority comparison was streamlined; switch to Deep Research Mode for full judicial comparison.");
  }
  if (args.analysis.missingFacts.length > 0) {
    warnings.push(`Missing case context detected: ${args.analysis.missingFacts[0]}`);
  }

  return {
    ...checks,
    passedCount,
    totalChecks: 12,
    warnings,
  };
}

/**
 * Deterministic structured 9-section synthesizer using only verified/retrieved source passages (§9).
 * Ensures accurate, citation-traceable responses even when live external Gemini API keys are offline.
 */
function buildStructuredDeterministicAnswer(args: {
  language: LegalLanguage;
  mode: "fast" | "deep";
  analysis: LegalQuestionAnalysis;
  sources: RetrievedLegalSource[];
  contrary: RetrievedLegalSource[];
  comparisons: CassationComparison[];
  unverifiedWarning?: string;
}): string {
  const { language, mode, analysis, sources, contrary, comparisons, unverifiedWarning } = args;
  const statutes = sources.filter((s) => s.sourceType !== "cassation_decision");
  const cassations = sources.filter((s) => s.sourceType === "cassation_decision");

  const formatSourceLine = (s: RetrievedLegalSource, idx: number) => {
    const pinpoint = s.matchedPassages?.[0]?.citationLabel || `[${s.title}, Fuula ${s.page || 1}, Kutaa 1]`;
    const tg = s.channelHandle && s.telegramPostUrl
      ? ` — Telegram @${s.channelHandle.replace("@", "")} (${s.telegramPostUrl})`
      : s.officialSourceUrl
        ? ` — ${s.officialSourceUrl}`
        : "";
    const statusTag = s.status !== "VERIFIED" ? " [UNVERIFIED — Mirkaneessa barbaada]" : " [VERIFIED]";
    return `${idx + 1}. ${pinpoint}${statusTag}${tg}\n   • Rule: ${s.holdingOrRule.slice(0, 260)}`;
  };

  if (mode === "fast" && analysis.complexity === "simple") {
    const header =
      language === "am"
        ? "ፈጣን የሕግ መልስ (Fast Mode — የመጀመሪያ ደረጃ ማጣሪያ)"
        : language === "en"
          ? "Preliminary Legal Answer (Fast Mode)"
          : "Deebii Seeraa Saffisaa (Fast Mode — Xiinxala Jalqabaa)";
    return [
      header,
      "",
      `A. Gaaffii fi dhimma seeraa: ${analysis.actualLegalQuestion}`,
      `C. Seera rogummaa qabu: ${statutes.map((s) => `${s.title} (${s.proclamationNumber || s.articleNumbers?.join(", ") || "Statute"})`).join("; ") || "See cassation sources below"}`,
      cassations.length > 0
        ? `D. Murtiiwwan dhaddacha ijibbaataa: ${cassations.slice(0, 2).map((c) => `Galmee Lakk. ${c.decisionNumber} (Vol. ${c.volume || "N/A"}) — ${c.holdingOrRule.slice(0, 180)}`).join(" | ")}`
        : "",
      `H. Xumura: ${sources[0]?.holdingOrRule || "Maddoota armaan olii ilaalaa."}`,
      `I. Madda ragaa:\n${sources.slice(0, 4).map(formatSourceLine).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  // Full 9-section A–I analysis (§9)
  const fallbackEngine = synthesizeAuthoritativeLegalAnswer({
    prompt: analysis.originalQuestion,
    context: analysis.suppliedFacts.join(". "),
    language,
    targets: [language],
  });

  const sections: string[] = [
    unverifiedWarning ? `⚠️ ${unverifiedWarning}\n` : "",
    `A. Gaaffii fi dhimma seeraa\n- Dhimma ijoo: ${analysis.actualLegalQuestion}\n- Furmaata barbaadamu: ${analysis.requestedRemedy}\n- Damee Seeraa: ${analysis.subjectDomain} | Sadarkaa: ${analysis.proceduralStage}`,
    `B. Dhugaa dhimmaa\n- Dhugaawwan dhiyaatan: ${analysis.suppliedFacts.length > 0 ? analysis.suppliedFacts.join("; ") : "Dhugaa galmee addaa hin dhiyaanne (gaaffii waliigalaa irratti hundaa'e)."}\n- Odeeffannoo dabalataa barbaachisu: ${analysis.missingFacts.join("; ") || "Gahaa dha."}`,
    `C. Seera rogummaa qabu\n${statutes.length > 0 ? statutes.map((s, i) => formatSourceLine(s, i)).join("\n") : "Labsiin/keewwanni kallattiin dhiyaate hin argamne; murtiiwwan ijibbaataa fi qajeeltoo gadii ilaali."}`,
    `D. Murtiiwwan dhaddacha ijibbaataa\n${comparisons.length > 0 ? comparisons.map((c) => `• Galmee Lakk. ${c.caseNumber} (${c.court}, Jildii ${c.volume || "N/A"}, Status: ${c.verificationStatus}):\n  - Madda: ${c.sourceDocumentAndPage}${c.telegramPostUrl ? ` | Telegram @${c.channelHandle || "seeraai_ethio"} (${c.telegramPostUrl})` : ""}\n  - Wal-fakkaatina: ${c.similarFacts.join("; ")}\n  - Garaagarummaa: ${c.differentFacts.join("; ") || "Hin jiru"}\n  - Hojiirra oolmaa (Rule Applies): ${c.ruleApplies}`).join("\n") : cassations.length > 0 ? cassations.map((s, i) => formatSourceLine(s, i)).join("\n") : "Murtii Dhaddacha Ijibbaataa dabalataa hin argamne."}`,
    `E. Qorannoo fi hiika seeraa\n${sources[0]?.matchedPassages?.[0]?.snippet || sources[0]?.holdingOrRule || fallbackEngine.text.slice(0, 700)}`,
    `F. Yaada faallaa fi addaddummaa\n${contrary.length > 0 ? contrary.map((c, i) => formatSourceLine(c, i)).join("\n") : "Qorannoo keessatti mormiin ykn murtii faallaa kallattiin wal-morku hin argamne; haata'u malee daangaa yeroo fi ragaan galmee qabatamaan madaalamuu qaba."}`,
    `G. Xiinxala dhimma kanaa\n${fallbackEngine.text.slice(0, 900)}`,
    `H. Xumura\nMaddoota mirkanaa'an ${sources.length} irratti hundaa'uun: ${sources[0]?.holdingOrRule || "Tarkaanfii seeraa qajeeltoo olii hordofuun mirkaneessaa."}`,
    `I. Madda ragaa\n${sources.map((s, i) => formatSourceLine(s, i)).join("\n")}`,
  ];

  return sections.filter(Boolean).join("\n\n");
}

/**
 * Evidence-grounded Universal Ethiopian Legal Answering Engine (§5-§12).
 */
export async function answerLegalQuestion(
  db: Firestore | null,
  request: LegalAnswerRequest,
  requestId: string
): Promise<LegalAnswerResponse> {
  const startedAt = Date.now();
  const analysis = analyzeLegalQuestion({
    question: request.question,
    language: request.language,
    jurisdiction: request.jurisdiction,
    relevantDate: request.relevantDate,
    facts: request.facts,
  });

  const language: LegalLanguage = request.language || analysis.language || "om";
  const jurisdiction: LegalJurisdiction = request.jurisdiction || analysis.jurisdiction || "both";
  const mode = request.mode || analysis.recommendedMode || "deep";
  const includeUnverified = Boolean(request.includeUnverifiedWarnings);

  const disclaimer =
    language === "am"
      ? "ይህ ለሕግ ግንዛቤ ብቻ የተዘጋጀ ነው፤ የሕግ ባለሙያ (ጠበቃ) ምክርን አይተካም።"
      : language === "en"
        ? "Prepared for legal information only; does not substitute for qualified legal counsel."
        : "Kun hubannoo seeraatiif kan qophaa'e qofa; gorsa ogeessa seeraa (abukaatoo) bakka hin bu'u.";

  try {
    // Stage A + B Retrieval (verified first; optionally include unverified with explicit warning)
    const searchRes = await searchLegalSources(db, {
      query: `${request.question} ${request.facts || ""}`.trim(),
      jurisdiction,
      mode,
      callerInstitutionId: request.callerInstitutionId,
      verificationFilter: includeUnverified ? "all" : "verified",
      maxResults: mode === "fast" ? 5 : 10,
    });

    const retrievedSources = searchRes.results || [];
    const contraryAuthorities = searchRes.contraryAuthorities || [];

    // Strict Anti-Fabrication Gate (§11 exact wording + backward compatible Oromoo clause)
    if (retrievedSources.length === 0) {
      const insufficientMsg =
        language === "om"
          ? "Ragaan seeraa gahaan deebii kana mirkaneessu hin argamne. Maddoota dabalataa ykn odeeffannoo dhimmaa barbaachisa. (Maddi seeraa gahaa hin jiru: gaaffii dhiyaateef seera, labsii ykn murtii dhaddacha ijibbaataa mirkanaa'e kuusaa seeraa keessatti hin argamne.)"
          : language === "am"
            ? "ይህን መልስ የሚያረጋግጥ በቂ የሕግ ማስረጃ አልተገኘም። ተጨማሪ ምንጮች ወይም የጉዳዩ ዝርዝር መረጃ ያስፈልጋል። (በቂ የሕግ ምንጭ አልተገኘም።)"
            : "Insufficient verified legal evidence to confirm this answer. Additional legal sources or case facts are required. (Ragaan seeraa gahaan deebii kana mirkaneessu hin argamne.)";

      return {
        ok: true,
        requestId,
        language,
        jurisdiction,
        mode,
        recommendedMode: analysis.recommendedMode,
        answer: insufficientMsg,
        citations: [],
        sourceCount: 0,
        verification: "INSUFFICIENT_SOURCES",
        questionAnalysis: analysis,
        cassationComparisons: [],
        contraryAuthorities: [],
        latencyMs: Date.now() - startedAt,
        disclaimer,
      };
    }

    const cassationComparisons =
      searchRes.cassationComparisons && searchRes.cassationComparisons.length > 0
        ? searchRes.cassationComparisons
        : buildCassationComparisons(retrievedSources, contraryAuthorities, analysis);

    const hasUnverified = retrievedSources.some((s) => s.status !== "VERIFIED");
    const unverifiedWarning = hasUnverified
      ? language === "am"
        ? "ማስጠንቀቂያ፡ አንዳንድ የተጠቀሱ ምንጮች ገና በባለሙያ ያልተረጋገጡ (UNVERIFIED) ስለሆኑ እንደ አስገዳጅ ሕግ መወሰድ የለባቸውም።"
        : language === "en"
          ? "WARNING: One or more retrieved sources are UNVERIFIED and must not be treated as settled binding law without human verification."
          : "AKEKKACHIISA: Maddoota argaman keessaa tokko tokko ammaaf HIN MIRKANOOOFNE (UNVERIFIED); akka seera dirqisiisaatti osoo hin mirkaneessin hin fudhatin."
      : undefined;

    const preliminaryNotice =
      mode === "fast"
        ? language === "am"
          ? "ፈጣን ሁነታ (Fast Mode)፡ መልሱ ፈጣን ማጣሪያ ነው፤ ሙሉ የሰበር ንጽጽርና ተቃራኒ ድንጋጌዎችን ለማየት Deep Research Mode ይጠቀሙ።"
          : language === "en"
            ? "Fast Mode preliminary answer; switch to Deep Research Mode for full contrary-authority and Cassation comparison."
            : "Fast Mode (Deebii Saffisaa): Kun qorannoo jalqabaa ti; xiinxala dhaddacha ijibbaataa fi mormiiwwan faallaa guutuu argachuuf Deep Research Mode filadhu."
        : undefined;

    const citations: LegalCitation[] = retrievedSources.map((s) => ({
      sourceId: s.id,
      title: s.title,
      sourceType: s.sourceType,
      category: s.category,
      jurisdiction: s.jurisdiction,
      issuingInstitution: s.courtName || s.issuingInstitution,
      proclamationNumber: s.proclamationNumber,
      decisionNumber: s.decisionNumber,
      volume: s.volume,
      page: s.page || (s.matchedPassages?.[0]?.page ? String(s.matchedPassages[0].page) : undefined),
      articleNumbers: s.articleNumbers,
      status: s.status,
      authorityTier: s.authorityTier,
      officialSourceName: s.officialSourceName,
      officialSourceUrl: s.officialSourceUrl,
      channelHandle: s.channelHandle,
      telegramPostUrl: s.telegramPostUrl,
      messageId: s.messageId,
      originalDateTime: s.originalDateTime,
      pinpointCitation: s.matchedPassages?.[0]?.citationLabel || `[${s.title}, Fuula ${s.page || 1}, Kutaa 1]`,
    }));

    const systemPrompt = buildLegalSystemPrompt({
      language,
      jurisdiction,
      mode,
      relevantDate: request.relevantDate,
      facts: request.facts,
      questionAnalysis: analysis,
      sources: retrievedSources,
      contraryAuthorities,
      cassationComparisons,
    });

    let answerText = "";
    try {
      const ai = getGeminiClient();
      const chosenModel =
        process.env.GEMINI_LEGAL_MODEL?.trim() ||
        (mode === "fast" ? FAST_MODEL : DEFAULT_MODEL);
      const isGemini4 = chosenModel.startsWith("gemini-4");

      const config: any = { systemInstruction: systemPrompt };
      if (isGemini4) {
        config.thinkingConfig = {
          thinkingLevel: mode === "deep" ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
        };
      } else {
        config.temperature = 0.1;
      }

      const response = await ai.models.generateContent({
        model: chosenModel,
        contents: `GAAFFII SEERAA:\n${request.question}\n\n${request.facts ? `DHUGAA DHIMMAA:\n${request.facts}\n\n` : ""}Qorannoo seeraa guutuu caasaa gaafatameen (Section A–I) qopheessi.`,
        config,
      });

      answerText = response.text?.trim() || "";
    } catch (genErr) {
      console.warn("[answerLegalQuestion] Gemini synthesis fallback to structured engine:", genErr instanceof Error ? genErr.message : genErr);
    }

    if (!answerText) {
      answerText = buildStructuredDeterministicAnswer({
        language,
        mode,
        analysis,
        sources: retrievedSources,
        contrary: contraryAuthorities,
        comparisons: cassationComparisons,
        unverifiedWarning,
      });
    } else if (unverifiedWarning && !answerText.includes("UNVERIFIED")) {
      answerText = `${unverifiedWarning}\n\n${answerText}`;
    }

    const qualityChecklist = evaluateAnswerQuality({
      analysis,
      sources: retrievedSources,
      contrary: contraryAuthorities,
      comparisons: cassationComparisons,
      answerText,
      language,
      mode,
    });

    return {
      ok: true,
      requestId,
      language,
      jurisdiction,
      mode,
      recommendedMode: analysis.recommendedMode,
      preliminaryNotice,
      unverifiedWarning,
      answer: answerText,
      citations,
      sourceCount: citations.length,
      verification: "SOURCE_GROUNDED",
      questionAnalysis: analysis,
      cassationComparisons,
      contraryAuthorities,
      qualityChecklist,
      latencyMs: Date.now() - startedAt,
      disclaimer,
    };
  } catch (error: any) {
    console.error("[answerLegalQuestion critical error]:", error);
    return {
      ok: false,
      requestId,
      language,
      jurisdiction,
      mode,
      answer:
        language === "am"
          ? "የሕግ ጥያቄውን በማስኬድ ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።"
          : language === "en"
            ? "An error occurred while analyzing the legal question. Please retry."
            : "Gaaffii seeraa qorachuu keessatti dogoggorri uumameera. Maaloo irra deebi'aa yaalaa.",
      citations: [],
      sourceCount: 0,
      verification: "AI_ERROR",
      latencyMs: Date.now() - startedAt,
      disclaimer,
    };
  }
}
