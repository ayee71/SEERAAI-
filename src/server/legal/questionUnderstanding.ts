import type {
  LegalJurisdiction,
  LegalLanguage,
  LegalQuestionAnalysis,
  ResearchMode,
} from "./legalTypes";

interface ConceptDefinition {
  concept: string;
  domain: string;
  om: string[];
  am: string[];
  en: string[];
  counterConcept?: string;
}

/**
 * Ethiopian Federal & Oromia Trilingual Legal Concept & Synonym Ontology (§5).
 * Ensures different formulations asking about the same legal issue retrieve the
 * governing statutes and Cassation precedents regardless of wording or language.
 */
const LEGAL_CONCEPT_GRAPH: ConceptDefinition[] = [
  {
    concept: "inheritance_succession",
    domain: "Family and Inheritance Law",
    om: [
      "dhaala", "dhaaltuu", "dhaaltummaa", "dhaamoo", "du'aa", "qabeenya dhaalaa",
      "mirga dhaalaa", "ilmaan dhaaltuu", "dhaala seeraan ala", "dhaaltota",
    ],
    am: [
      "ውርስ", "ወራሽ", "ወራሽነት", "ኑዛዜ", "የውርስ ንብረት", "ሟች", "የወራሽነት ማረጋገጫ", "ውርስ ክፍፍል",
    ],
    en: [
      "inheritance", "succession", "heir", "estate", "will", "testament",
      "intestate", "partition of estate", "legacy", "devolution",
    ],
  },
  {
    concept: "ownership_possession",
    domain: "Land and Property Law",
    om: [
      "abbummaa", "qabiyyee", "abbaa qabiyyee", "qabeenya", "wabii abbummaa",
      "kaartaa", "ragaa abbummaa", "fudhatama qabiyyee", "beenyaa", "qabeenya fudhatame",
    ],
    am: [
      "ባለቤትነት", "ይዞታ", "ባለይዞታ", "ንብረት", "ካርታ", "የባለቤትነት ማረጋገጫ", "ካሳ", "የንብረት መብት",
    ],
    en: [
      "ownership", "possession", "title", "title deed", "property right",
      "expropriation", "compensation", "eviction", "adverse possession", "holding right",
    ],
  },
  {
    concept: "limitation_periods",
    domain: "Civil Code and Civil Procedure Materials",
    om: [
      "darbiinsa yeroo", "yeroo daangaa", "yeroon darbuu", "daangaa yeroo",
      "himannaan yeroon darbuu", "yeroo falmii", "yeroo iyyannoo",
    ],
    am: [
      "ይርጋ", "የይርጋ ጊዜ", "የጊዜ ገደብ", "ጊዜ ያለፈበት", "የክስ ማቅረቢያ ጊዜ",
    ],
    en: [
      "limitation", "limitation period", "statute of limitations", "prescription",
      "time bar", "time limit", "laches", "expiry", "statutory deadline",
    ],
    counterConcept: "interruption_suspension_of_limitation",
  },
  {
    concept: "evidence_burden_of_proof",
    domain: "Evidence and Procedure",
    om: [
      "ragaa", "ba'aa ragaa", "mirkaneessuu", "ragaa barreeffamaa", "ragaa namaa",
      "dhugaa bahuu", "amanamummaa ragaa", "qorannoo ragaa", "fudhatama ragaa",
    ],
    am: [
      "ማስረጃ", "የማስረዳት ሸክም", "የሰነድ ማስረጃ", "የምስክር ቃል", "ማስረጃ ምዘና", "አስረጂነት",
    ],
    en: [
      "evidence", "burden of proof", "standard of proof", "witness",
      "documentary evidence", "admissibility", "corroboration", "presumption",
    ],
  },
  {
    concept: "contract_validity",
    domain: "Civil Code and Civil Procedure Materials",
    om: [
      "waliigaltee", "ragga'iinsa waliigaltee", "diigamuu waliigaltee", "cabinsa waliigaltee",
      "mallattoo", "hayyama", "dhorkaa", "waliigaltee bu'aa hin qabne", "waliigaltee barreeffamaa",
    ],
    am: [
      "ውል", "የውል ጸንቶ መቆየት", "ውል ማፍረስ", "የውል መሰረዝ", "ውል መፈጸም", "ህገወጥ ውል", "የጽሑፍ ውል",
    ],
    en: [
      "contract", "validity", "void", "voidable", "breach of contract",
      "rescission", "termination of contract", "specific performance", "consent", "registration",
    ],
  },
  {
    concept: "jurisdiction",
    domain: "Civil Code and Civil Procedure Materials",
    om: [
      "aangoo mana murtii", "aangoo dhimmaa", "aangoo naannoo", "aangoo hundee",
      "aangoo dhimmicha ilaaluu", "mana murtii aangoo qabu", "mormii sadarkaa jalqabaa",
    ],
    am: [
      "ሥልጣን", "የፍርድ ቤት ሥልጣን", "የነገረ ሥልጣን", "የአካባቢ ሥልጣን", "የመጀመሪያ መቃወሚያ",
    ],
    en: [
      "jurisdiction", "subject matter jurisdiction", "material jurisdiction", "local jurisdiction",
      "competence", "preliminary objection", "forum", "federal court", "regional court",
    ],
  },
  {
    concept: "appeal_cassation",
    domain: "Evidence and Procedure",
    om: [
      "oliyyannoo", "ijibbaata", "dhaddacha ijibbaataa", "ilaalcha deebii",
      "dogoggora seeraa bu'uuraa", "yeroo oliyyannoo", "galmee ijibbaataa", "murtii dhumaa",
    ],
    am: [
      "ይግባኝ", "ሰበር", "ሰበር ሰሚ ችሎት", "ዳግም ዳኝነት", "መሠረታዊ የሕግ ስህተት", "የይግባኝ ጊዜ",
    ],
    en: [
      "appeal", "cassation", "fundamental error of law", "review of judgment",
      "final judgment", "petition", "leave to appeal", "stay of execution",
    ],
  },
  {
    concept: "execution_of_judgments",
    domain: "Evidence and Procedure",
    om: [
      "raawwii murtii", "dhaddacha raawwii", "qabeenya qabuu", "caalbaasii",
      "ajaja raawwii", "murtii raawwachiisuu", "mormii gartuu sadaffaa",
    ],
    am: [
      "አፈጻጸም", "የፍርድ አፈጻጸም", "ንብረት ማገድ", "ጨረታ", "የሶስተኛ ወገን መቃወሚያ",
    ],
    en: [
      "execution", "enforcement of judgment", "attachment", "auction", "garnishment",
      "third party objection", "writ of execution", "decree execution",
    ],
  },
  {
    concept: "land_boundary_disputes",
    domain: "Land and Property Law",
    om: [
      "lafa", "lafa baadiyyaa", "lafa magaalaa", "daangaa", "sarara daangaa",
      "qabiyyee lafaa", "kiraa lafaa", "lafa fudhachuu", "242/2014", "455/2005", "1161/2019",
    ],
    am: [
      "መሬት", "የገጠር መሬት", "የከተማ ቦታ", "ድንበር", "የወሰን ክርክር", "ሊዝ", "የመሬት ይዞታ",
    ],
    en: [
      "land", "rural land", "urban land", "lease", "boundary", "boundary dispute",
      "encroachment", "landholding", "expropriation", "demarcation", "land certification",
    ],
  },
  {
    concept: "family_marital_property",
    domain: "Family and Inheritance Law",
    om: [
      "gaa'ila", "qabeenya waloo", "qabeenya dhuunfaa", "hiikaa", "gargar bahuu",
      "qunnamtii gaa'ilaan alaa", "qooddii qabeenyaa", "nyaata fi guddina daa'imaa", "guddisa",
    ],
    am: [
      "ጋብቻ", "የጋራ ንብረት", "የግል ንብረት", "ፍቺ", "ቀለብ", "የልጅ አስተዳደግ", "የባልና ሚስት ንብረት",
    ],
    en: [
      "family", "marriage", "marital property", "common property", "personal property",
      "divorce", "maintenance", "alimony", "child custody", "irregular union",
    ],
  },
  {
    concept: "labor_employment",
    domain: "Administrative and Constitutional Law",
    om: [
      "hojjetaa", "hojjechiisaa", "ari'uu", "hojiirraa gaggeessuu", "beenyaa hojjetaa",
      "kaffaltii tajaajilaa", "1156/2019", "1156/2011", "waldaa hojjettootaa", "akeekkachiisa",
    ],
    am: [
      "አሰሪና ሰራተኛ", "ሰራተኛ", "ስንብት", "ካሳ", "ያለማስጠንቀቂያ", "የአገልግሎት ክፍያ", "1156",
    ],
    en: [
      "labor", "employment", "dismissal", "termination", "summary dismissal",
      "severance pay", "notice period", "wrongful termination", "labor proclamation",
    ],
  },
  {
    concept: "criminal_procedure_bail",
    domain: "Criminal Code and Criminal Procedure Materials",
    om: [
      "yakka", "adabbii", "hidhaa", "wabiin bahuu", "mirga wabii",
      "qorannoo poolisii", "himannaa yakkaa", "falmii yakkaa", "yakka cimaa",
    ],
    am: [
      "ወንጀል", "ቅጣት", "እስራት", "ዋስትና", "የዋስትና መብት", "ክስ", "የወንጀል ሥነ-ሥርዓት",
    ],
    en: [
      "criminal", "crime", "offense", "bail", "bond", "sentence", "prosecution",
      "arrest", "remand", "indictment", "mitigation",
    ],
  },
];

export function detectLegalLanguage(text: string): LegalLanguage {
  if (/[\u1200-\u137F]/.test(text)) {
    return "am";
  }
  const omMarkers = [
    "akka", "maal", "maaliif", "keeyyata", "labsii", "seera", "mana murtii",
    "dhaddacha", "ijibbaataa", "qabiyyee", "galmee", "beenyaa", "hojjetaa",
    "gaa'ila", "dhaala", "darbiinsa", "oli", "qaba", "ta'e", "irratti", "waliin",
  ];
  const lower = text.toLowerCase();
  const omHits = omMarkers.filter((m) => lower.includes(m)).length;
  if (omHits >= 1) return "om";
  // Double vowels typical of Afaan Oromoo orthography
  if (/(aa|ee|ii|oo|uu)/i.test(text) && !/\b(the|and|what|under|proclamation|court|file)\b/i.test(lower)) {
    return "om";
  }
  return "en";
}

export function expandLegalSynonymsAndConcepts(queryText: string): {
  detectedConcepts: string[];
  subjectDomain: string;
  expandedSynonyms: string[];
  terminology: string[];
} {
  const normalized = queryText.toLowerCase().normalize("NFKC");
  const detectedConcepts: string[] = [];
  const domains: string[] = [];
  const synSet = new Set<string>();
  const termSet = new Set<string>();

  for (const node of LEGAL_CONCEPT_GRAPH) {
    const allTerms = [...node.om, ...node.am, ...node.en];
    const matchedTerms = allTerms.filter((t) => normalized.includes(t.toLowerCase()));
    if (matchedTerms.length > 0) {
      detectedConcepts.push(node.concept);
      domains.push(node.domain);
      for (const m of matchedTerms) termSet.add(m);
      // Cross-pollinate key trilingual synonyms (top terms from all 3 languages)
      for (const s of [...node.om.slice(0, 6), ...node.am.slice(0, 5), ...node.en.slice(0, 6)]) {
        synSet.add(s);
      }
    }
  }

  return {
    detectedConcepts,
    subjectDomain: domains[0] || "General Ethiopian & Oromia Law",
    expandedSynonyms: [...synSet],
    terminology: [...termSet],
  };
}

export function analyzeLegalQuestion(args: {
  question: string;
  language?: LegalLanguage;
  jurisdiction?: LegalJurisdiction;
  relevantDate?: string;
  facts?: string;
}): LegalQuestionAnalysis {
  const q = (args.question || "").trim();
  const combined = `${q}\n${args.facts || ""}`.trim();
  const lower = combined.toLowerCase();
  const language: LegalLanguage = args.language || detectLegalLanguage(q);

  // Extract case numbers (Cassation File Nos / Galmee Lakk. / መዝገብ ቁጥር)
  const caseNumbers = new Set<string>();
  const casePatterns = [
    /(?:galmee(?:\s*lakk\.?)?|lakk\.?\s*galmee|file\s*(?:no\.?|number)|case\s*(?:no\.?|number)|መዝገብ\s*ቁጥር)\s*[:#-]?\s*(\d{4,8})/gi,
    /\b(\d{5,7})\b/g,
  ];
  for (const pat of casePatterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(combined)) !== null) {
      if (m[1]) caseNumbers.add(m[1]);
    }
  }

  // Extract proclamation / regulation numbers (e.g., 1156/2019, 242/2014)
  const procNumbers = new Set<string>();
  const procPat = /\b(\d{2,4}\/\d{4})\b/g;
  let pm: RegExpExecArray | null;
  while ((pm = procPat.exec(combined)) !== null) {
    if (pm[1]) procNumbers.add(pm[1]);
  }

  // Extract article numbers
  const articleNumbers = new Set<string>();
  const artPat = /(?:kwt\.?|keeyyata|keyyata|art\.?|article|አንቀጽ|አንቀፅ)\s*(\d+(?:\(\d+\))?)/gi;
  let am: RegExpExecArray | null;
  while ((am = artPat.exec(combined)) !== null) {
    if (am[1]) articleNumbers.add(am[1]);
  }

  // Jurisdiction inference
  let inferredJurisdiction: LegalJurisdiction = args.jurisdiction || "unknown";
  const mentionsOromia = /(oromia|oromiyaa|caffee|ኦሮሚያ|ጨፌ|bulchiinsa naannoo oromiyaa)/i.test(combined);
  const mentionsFederal = /(federal|federaala|fdre|cassation|ijibbaata|ሰበር|ፌዴራል|1156|1243)/i.test(combined);
  if (!args.jurisdiction || args.jurisdiction === "unknown") {
    if (mentionsOromia && mentionsFederal) inferredJurisdiction = "both";
    else if (mentionsOromia) inferredJurisdiction = "oromia";
    else if (mentionsFederal) inferredJurisdiction = "federal";
    else inferredJurisdiction = "both";
  }

  // Procedural stage detection
  let proceduralStage = "Substantive Legal Inquiry / Pre-litigation";
  if (/(ijibbaata|cassation|ሰበር)/i.test(lower)) {
    proceduralStage = "Cassation Review (Mana Murtii Waliigalaa Dhaddacha Ijibbaataa)";
  } else if (/(oliyyannoo|appeal|ይግባኝ)/i.test(lower)) {
    proceduralStage = "Appellate Stage (Sadarkaa Oliyyannoo)";
  } else if (/(raawwii|execution|አፈጻጸም)/i.test(lower)) {
    proceduralStage = "Judgment Execution (Raawwii Murtii)";
  } else if (/(mormii sadarkaa jalqabaa|preliminary objection|መጀመሪያ መቃወሚያ)/i.test(lower)) {
    proceduralStage = "Preliminary Objection Stage";
  } else if (/(qorannoo|arrest|bail|wabii|ዋስትና)/i.test(lower)) {
    proceduralStage = "Criminal Investigation / Bail Hearing";
  }

  // Requested remedy extraction
  let requestedRemedy = "Clarification of applicable Ethiopian/Oromia law and precedents";
  if (/(beenyaa|compensation|damages|ካሳ)/i.test(lower)) {
    requestedRemedy = "Compensation / Damages / Statutory Severance";
  } else if (/(diigamuu|annul|void|cancel|ማፍረስ|መሰረዝ)/i.test(lower)) {
    requestedRemedy = "Invalidation / Rescission / Annulment of act or contract";
  } else if (/(wabii|bail|ዋስትና)/i.test(lower)) {
    requestedRemedy = "Release on Bail / Constitutional Liberty Protection";
  } else if (/(qooddii|partition|share|ክፍፍል)/i.test(lower)) {
    requestedRemedy = "Division / Partition of Estate or Marital Property";
  } else if (/(darbiinsa yeroo|limitation|ይርጋ)/i.test(lower)) {
    requestedRemedy = "Limitation Bar / Procedural Dismissal Evaluation";
  } else if (/(raawwii|execution|enforce|አፈጻጸም)/i.test(lower)) {
    requestedRemedy = "Enforcement / Stay of Execution of Judgment";
  }

  // Separate user-supplied facts from missing facts
  const suppliedFacts: string[] = [];
  if (args.facts && args.facts.trim().length > 0) {
    suppliedFacts.push(
      ...args.facts
        .split(/[.\n;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 8)
        .slice(0, 8)
    );
  }
  const missingFacts: string[] = [];
  if (!args.relevantDate && !/\b(19\d{2}|20[0-3]\d)\b/.test(combined)) {
    missingFacts.push(
      language === "am"
        ? "ጉዳዩ የተፈጸመበት ቀን/ዓ.ም (የሚፈጸመውን የሕግ እትም ለመለየት)"
        : language === "en"
          ? "Exact date of event or contract (needed to determine governing law version and limitation periods)"
          : "Guyyaa dhimmi kun itti raawwatame (seera yeroo sana hojiirra ture fi darbiinsa yeroo mirkaneessuuf)"
    );
  }
  if (!mentionsOromia && !mentionsFederal) {
    missingFacts.push(
      language === "am"
        ? "የሥልጣን ክልል (ፌዴራል ወይም ኦሮሚያ)"
        : language === "en"
          ? "Specific jurisdiction (Federal vs. Oromia Regional State)"
          : "Aangoo naannoo ykn Federaalaa (Mana Murtii Oromiyaa moo Federaalaa?)"
    );
  }
  if (!args.facts?.trim() && q.length < 100) {
    missingFacts.push(
      language === "am"
        ? "ዝርዝር የጉዳዩ ፍሬ ነገር እና የቀረቡ ማስረጃዎች"
        : language === "en"
          ? "Detailed material facts, party relationships, and documentary evidence"
          : "Dhugaawwan dhimmaa bal'aa fi ragaalee harka jiran"
    );
  }

  const { detectedConcepts, subjectDomain, expandedSynonyms, terminology } =
    expandLegalSynonymsAndConcepts(combined);

  // Complexity classification & Fast/Deep recommendation (§12)
  const isMultiIssue = detectedConcepts.length >= 2 || caseNumbers.size > 0 || combined.length > 260;
  const mentionsConflictOrException =
    /(conflict|exception|contrary|faallaa|addaddummaa|ልዩ ሁኔታ|ተቃራኒ|ijibbaata|cassation|ሰበር)/i.test(lower);

  let complexity: "simple" | "moderate" | "complex" = "simple";
  let recommendedMode: ResearchMode = "fast";
  let complexityReason = "Direct single-provision inquiry suitable for Fast Mode.";

  if (isMultiIssue || mentionsConflictOrException || missingFacts.length >= 2) {
    complexity = "complex";
    recommendedMode = "deep";
    complexityReason =
      "Multi-concept, precedent comparison, or potential conflicting-authority inquiry; Deep Research Mode recommended.";
  } else if (detectedConcepts.length === 1 || procNumbers.size > 0 || articleNumbers.size > 0) {
    complexity = "moderate";
    recommendedMode = "fast";
    complexityReason = "Focused statutory/article inquiry; Fast Mode works or Deep Research Mode for full cassation comparison.";
  }

  // Extract concise core legal question
  const actualLegalQuestion = q.length > 220 ? `${q.slice(0, 220).trim()}...` : q;

  return {
    originalQuestion: q,
    language,
    actualLegalQuestion,
    requestedRemedy,
    suppliedFacts,
    missingFacts,
    subjectDomain,
    detectedConcepts,
    jurisdiction: inferredJurisdiction,
    applicablePeriodOrLawVersion: args.relevantDate || (procNumbers.size > 0 ? [...procNumbers].join(", ") : undefined),
    proceduralStage,
    partiesAndRelationships: /(hojjetaa|employee|ሰራተኛ)/i.test(lower)
      ? "Employer – Employee"
      : /(baal|wife|husband|gaa'ila|ጋብቻ|spouse)/i.test(lower)
        ? "Spouses / Family Members"
        : /(dhaalt|heir|ወራሽ)/i.test(lower)
          ? "Heirs / Estate"
          : /(kireeffat|tenant|landlord|kiraa|ተከራይ)/i.test(lower)
            ? "Lessor – Lessee"
            : undefined,
    terminology,
    expandedSynonyms,
    extractedCaseNumbers: [...caseNumbers],
    extractedProclamationNumbers: [...procNumbers],
    extractedArticleNumbers: [...articleNumbers],
    complexity,
    recommendedMode,
    complexityReason,
  };
}
