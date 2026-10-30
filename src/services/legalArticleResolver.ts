import { Language } from '../i18n/translations';
import { 
  SDFHH_ARTICLES_DATABASE, 
  findSDFHHArticle, 
  SDFHHArticle 
} from '../data/sdfhhCodeDatabase';
import { 
  OROMIA_AND_FEDERAL_LEGISLATION_DB, 
  LegalEnactment 
} from '../data/legislationDatabase';
import { 
  CASSATION_PRECEDENTS_DATA, 
  CassationPrecedent 
} from '../data/cassationPrecedents';
import { 
  LEGAL_CITATIONS_DATABASE, 
  CitationSuggestion 
} from './citationAutoSuggest';
import { ETHIOPIAN_PROCLAMATIONS_DB } from './proclamationScanner';

export interface ResolvedArticleCitation {
  id: string;
  type: 'statute_article' | 'cassation_precedent' | 'proclamation';
  rawCitation: string;
  matchedCitation: string;
  articleNumber?: string | number;
  articleLabel: {
    om: string;
    am: string;
    en: string;
  };
  title: {
    om: string;
    am: string;
    en: string;
  };
  lawSource: {
    om: string;
    am: string;
    en: string;
  };
  jurisdiction: 'federal' | 'oromia';
  proclamationNumber?: string;
  fullText: {
    om: string;
    am: string;
    en: string;
  };
  keyRules?: string[];
  bindingRatio?: {
    om: string;
    am: string;
    en: string;
  };
  legalIssue?: {
    om: string;
    am: string;
    en: string;
  };
  parties?: {
    om: string;
    am: string;
    en: string;
  };
  yearEC?: number | string;
  yearGC?: number | string;
  volume?: number;
  crossReferences?: string[];
  linkedPrecedents?: Array<{
    fileNumber: string;
    volume?: number;
    title: string;
    ratio: string;
    yearGC?: number;
  }>;
}

/**
 * Searches for any Cassation Precedents in CASSATION_PRECEDENTS_DATA that relate to a given statute/article
 */
export function findRelatedPrecedents(articleNum: number | string, statuteKeyword?: string): Array<{
  fileNumber: string;
  volume?: number;
  title: string;
  ratio: string;
  yearGC?: number;
}> {
  const artStr = String(articleNum).trim();
  const results: Array<{
    fileNumber: string;
    volume?: number;
    title: string;
    ratio: string;
    yearGC?: number;
  }> = [];

  for (const precedent of CASSATION_PRECEDENTS_DATA) {
    const hasStatuteMatch = statuteKeyword 
      ? precedent.statutoryProvisions.some(p => p.toLowerCase().includes(statuteKeyword.toLowerCase()))
      : true;

    const hasArtMatch = precedent.statutoryProvisions.some(p => {
      const regex = new RegExp(`(?:Art\\.?|Article|Keeyyata|Kwt\\.?|አንቀጽ|\\b)\\s*${artStr}\\b`, 'i');
      return regex.test(p);
    });

    if (hasArtMatch && hasStatuteMatch) {
      results.push({
        fileNumber: precedent.fileNumber,
        volume: precedent.volume,
        title: precedent.parties.om || precedent.parties.en,
        ratio: precedent.bindingPrinciple.om || precedent.bindingPrinciple.en,
        yearGC: precedent.yearGC,
      });
    }
  }

  return results.slice(0, 3);
}

/**
 * Resolve a specific article or citation reference into a rich, full-text statutory entity
 */
export function resolveLegalArticleCitation(rawMatch: string): ResolvedArticleCitation | null {
  const cleaned = rawMatch.trim();
  if (!cleaned) return null;

  // 1. Direct Cassation File Number check (e.g. 249062, 21049, 198421, 18431)
  const cassationMatch = cleaned.match(/(?:Galmee|File\s*No\.?|Lakk\.?\s*Galmee|መዝገብ\s*ቁጥር|መ[./]ቁ|Cassation)?\s*[:#]?\s*(\d{5,6})\b/i);
  if (cassationMatch) {
    const fileNum = cassationMatch[1];
    const foundPrecedent = CASSATION_PRECEDENTS_DATA.find(p => p.fileNumber === fileNum);
    if (foundPrecedent) {
      return {
        id: `cass_${foundPrecedent.fileNumber}`,
        type: 'cassation_precedent',
        rawCitation: cleaned,
        matchedCitation: `Murtii Dhaddacha Ijoo Lakk. Galmee ${foundPrecedent.fileNumber}`,
        articleNumber: foundPrecedent.fileNumber,
        articleLabel: {
          om: `Galmee Lakk. ${foundPrecedent.fileNumber} (Jildii ${foundPrecedent.volume})`,
          am: `መዝገብ ቁጥር ${foundPrecedent.fileNumber} (ቅጽ ${foundPrecedent.volume})`,
          en: `Cassation File No. ${foundPrecedent.fileNumber} (Vol. ${foundPrecedent.volume})`,
        },
        title: {
          om: foundPrecedent.parties.om,
          am: foundPrecedent.parties.am,
          en: foundPrecedent.parties.en,
        },
        lawSource: {
          om: foundPrecedent.courtName?.om || 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
          am: foundPrecedent.courtName?.am || 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
          en: foundPrecedent.courtName?.en || 'Federal Supreme Court Cassation Division',
        },
        jurisdiction: foundPrecedent.courtJurisdiction || 'federal',
        fullText: {
          om: `Qajeeltoo Dirqisiisaa:\n${foundPrecedent.bindingPrinciple.om}\n\nDhimmicha:\n${foundPrecedent.legalIssue.om}`,
          am: `አስገዳጅ የህግ ትርጉም፡\n${foundPrecedent.bindingPrinciple.am}\n\nየተነሳው የህግ ጭብጥ፡\n${foundPrecedent.legalIssue.am}`,
          en: `Binding Principle of Law:\n${foundPrecedent.bindingPrinciple.en}\n\nLegal Issue:\n${foundPrecedent.legalIssue.en}`,
        },
        bindingRatio: foundPrecedent.bindingPrinciple,
        legalIssue: foundPrecedent.legalIssue,
        parties: foundPrecedent.parties,
        yearEC: foundPrecedent.yearEC,
        yearGC: foundPrecedent.yearGC,
        volume: foundPrecedent.volume,
        crossReferences: foundPrecedent.statutoryProvisions,
      };
    }
  }

  // 2. Proclamation Number matching (e.g. Labsii 1156/2019, Labsii 242/2014, Labsii 248/2015, Labsii 1243/2021)
  const procRegex = /(?:Proclamation\s+No\.?|Labsii\s+(?:Lakk\.?)?|አዋጅ\s*ቁጥር)\s*(\d+\/\d{4})/i;
  const procMatch = cleaned.match(procRegex);
  const articleRegex = /(?:Arts?\.?|Articles?|Keeyyata|Kwt\.?|አንቀጽ)\s*(\d+)/i;
  const artMatch = cleaned.match(articleRegex);
  const articleNum = artMatch ? parseInt(artMatch[1], 10) : null;

  if (procMatch) {
    const procNum = procMatch[1];
    
    // Check in OROMIA_AND_FEDERAL_LEGISLATION_DB
    const foundEnactment = OROMIA_AND_FEDERAL_LEGISLATION_DB.find(
      e => e.number.includes(procNum) || e.id.includes(procNum.replace('/', '_'))
    );

    if (foundEnactment) {
      // Check if enactment has fullTextArticles matching the article
      let articleTextMatch = null;
      if (articleNum && foundEnactment.fullTextArticles) {
        articleTextMatch = foundEnactment.fullTextArticles.find(a => 
          a.articleNumber.includes(String(articleNum)) || a.articleNumber.toLowerCase().includes(`keeyyata ${articleNum}`)
        );
      }

      if (articleTextMatch) {
        return {
          id: `${foundEnactment.id}_art_${articleNum}`,
          type: 'statute_article',
          rawCitation: cleaned,
          matchedCitation: `${foundEnactment.number} ${articleTextMatch.articleNumber}`,
          articleNumber: articleNum!,
          articleLabel: {
            om: articleTextMatch.articleNumber,
            am: `አንቀጽ ${articleNum}`,
            en: `Article ${articleNum}`,
          },
          title: {
            om: articleTextMatch.title || foundEnactment.title.om,
            am: articleTextMatch.title || foundEnactment.title.am,
            en: articleTextMatch.title || foundEnactment.title.en,
          },
          lawSource: {
            om: `${foundEnactment.title.om} (${foundEnactment.authority.om})`,
            am: `${foundEnactment.title.am} (${foundEnactment.authority.am})`,
            en: `${foundEnactment.title.en} (${foundEnactment.authority.en})`,
          },
          jurisdiction: foundEnactment.jurisdiction,
          proclamationNumber: foundEnactment.number,
          fullText: articleTextMatch.content,
          yearEC: foundEnactment.yearEC,
          yearGC: foundEnactment.yearGC,
          crossReferences: foundEnactment.tags,
          linkedPrecedents: findRelatedPrecedents(articleNum!, procNum),
        };
      }

      // If no specific fullTextArticle, provide full enactment overview & summary
      return {
        id: foundEnactment.id,
        type: 'proclamation',
        rawCitation: cleaned,
        matchedCitation: foundEnactment.number,
        articleNumber: articleNum || undefined,
        articleLabel: {
          om: articleNum ? `Keeyyata ${articleNum}` : foundEnactment.number,
          am: articleNum ? `አንቀጽ ${articleNum}` : foundEnactment.number,
          en: articleNum ? `Article ${articleNum}` : foundEnactment.number,
        },
        title: foundEnactment.title,
        lawSource: {
          om: `${foundEnactment.title.om} (${foundEnactment.authority.om})`,
          am: `${foundEnactment.title.am} (${foundEnactment.authority.am})`,
          en: `${foundEnactment.title.en} (${foundEnactment.authority.en})`,
        },
        jurisdiction: foundEnactment.jurisdiction,
        proclamationNumber: foundEnactment.number,
        fullText: {
          om: `${foundEnactment.summary.om}\n\nSadarkaa Seerichaa: ${foundEnactment.status === 'active' ? 'Seera Amma Hojiirra Jiru (Active Law)' : 'Seera Haqame (Repealed)'}`,
          am: `${foundEnactment.summary.am}\n\nየሕጉ ሁኔታ፡ ${foundEnactment.status === 'active' ? 'በሥራ ላይ ያለ ሕግ (Active Law)' : 'የተሻረ ሕግ (Repealed)'}`,
          en: `${foundEnactment.summary.en}\n\nLegal Status: ${foundEnactment.status === 'active' ? 'Active Law' : 'Repealed'}`,
        },
        yearEC: foundEnactment.yearEC,
        yearGC: foundEnactment.yearGC,
        crossReferences: foundEnactment.tags,
        linkedPrecedents: articleNum ? findRelatedPrecedents(articleNum, procNum) : [],
      };
    }

    // Check in ETHIOPIAN_PROCLAMATIONS_DB
    const procSummary = ETHIOPIAN_PROCLAMATIONS_DB[procNum];
    if (procSummary) {
      return {
        id: `proc_${procNum.replace('/', '_')}`,
        type: 'proclamation',
        rawCitation: cleaned,
        matchedCitation: `Labsii Lakk. ${procNum}`,
        articleNumber: articleNum || undefined,
        articleLabel: {
          om: articleNum ? `Keeyyata ${articleNum}` : `Labsii ${procNum}`,
          am: articleNum ? `አንቀጽ ${articleNum}` : `አዋጅ ${procNum}`,
          en: articleNum ? `Article ${articleNum}` : `Proc. ${procNum}`,
        },
        title: procSummary.title,
        lawSource: {
          om: `Gaazexaa Negaariit Federaalaa Lakk. ${procNum}`,
          am: `የፌዴራል ነጋሪት ጋዜጣ አዋጅ ቁጥር ${procNum}`,
          en: `Federal Negarit Gazeta Proclamation No. ${procNum}`,
        },
        jurisdiction: 'federal',
        proclamationNumber: procNum,
        fullText: procSummary.summary,
        yearGC: procSummary.yearEnacted,
        linkedPrecedents: articleNum ? findRelatedPrecedents(articleNum, procNum) : [],
      };
    }
  }

  // 3. Labor Proclamation 1156 articles directly (e.g. Labor Art. 27, Labor Art. 39, Labsii 1156 K.27)
  const isLabor = /(?:labor|hojjetaa|hojjechiisaa|የአሰሪና\s*ሰራተኛ|1156)/i.test(cleaned);
  if (isLabor && articleNum) {
    const laborSuggestion = LEGAL_CITATIONS_DATABASE.find(c => 
      c.id === `labor_art_${articleNum}` || (c.category === 'proclamation' && c.keywords.includes(String(articleNum)))
    );

    if (laborSuggestion) {
      return {
        id: `labor_art_${articleNum}`,
        type: 'statute_article',
        rawCitation: cleaned,
        matchedCitation: `Labsii 1156/2019 Keeyyata ${articleNum}`,
        articleNumber: articleNum,
        articleLabel: {
          om: `Keeyyata ${articleNum}`,
          am: `አንቀጽ ${articleNum}`,
          en: `Article ${articleNum}`,
        },
        title: laborSuggestion.title,
        lawSource: {
          om: 'Labsii Hojii fi Hojjetaa Federaalaa Lakk. 1156/2011 (Mana Marii Bakka Bu\'oota Uummata FDRE)',
          am: 'የአሠሪና ሠራተኛ ጉዳይ አዋጅ ቁጥር 1156/2011 (የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት)',
          en: 'FDRE Labor Proclamation No. 1156/2019 (Federal Negarit Gazeta)',
        },
        jurisdiction: 'federal',
        proclamationNumber: '1156/2019',
        fullText: laborSuggestion.context,
        yearEC: 2011,
        yearGC: 2019,
        linkedPrecedents: findRelatedPrecedents(articleNum, '1156'),
      };
    }
  }

  // 4. Civil Code articles (e.g. Civil Code Art. 1675, Art. 1723, Art. 2896, Art. 2027)
  const isCivilCode = /(?:civil\s+code|koodii\s+siivilii|ፍትሐብሔር|siivilii|civil)/i.test(cleaned);
  if (isCivilCode && articleNum) {
    const civilSuggestion = LEGAL_CITATIONS_DATABASE.find(c => 
      c.id === `civil_art_${articleNum}` || (c.category === 'civil_code' && c.keywords.includes(String(articleNum)))
    );

    if (civilSuggestion) {
      return {
        id: `civil_art_${articleNum}`,
        type: 'statute_article',
        rawCitation: cleaned,
        matchedCitation: `Koodii Siivilii Keeyyata ${articleNum}`,
        articleNumber: articleNum,
        articleLabel: {
          om: `Keeyyata ${articleNum}`,
          am: `አንቀጽ ${articleNum}`,
          en: `Article ${articleNum}`,
        },
        title: civilSuggestion.title,
        lawSource: {
          om: 'Koodii Siivilii Itoophiyaa Bara 1960 (Labsii Lakk. 165/1960)',
          am: 'የኢትዮጵያ የፍትሐብሔር ሕግ (አዋጅ ቁጥር 165/1952 ዓ.ም.)',
          en: 'Civil Code of Ethiopia of 1960 (Proclamation No. 165/1960)',
        },
        jurisdiction: 'federal',
        fullText: civilSuggestion.context,
        yearEC: 1952,
        yearGC: 1960,
        linkedPrecedents: findRelatedPrecedents(articleNum, 'civil code'),
      };
    }
  }

  // 5. Constitution articles (e.g. Constitution Art. 40, Heera Kwt. 40, ህገ መንግስት አንቀጽ 40)
  const isConst = /(?:constitution|heera|ሕገ-?\s*መንግሥት)/i.test(cleaned);
  if (isConst && articleNum) {
    const constSuggestion = LEGAL_CITATIONS_DATABASE.find(c => 
      c.id === `constitution_art_${articleNum}` || (c.category === 'constitution' && c.keywords.includes(String(articleNum)))
    );

    if (constSuggestion) {
      return {
        id: `constitution_art_${articleNum}`,
        type: 'statute_article',
        rawCitation: cleaned,
        matchedCitation: `Heera Mootummaa FDRE Keeyyata ${articleNum}`,
        articleNumber: articleNum,
        articleLabel: {
          om: `Keeyyata ${articleNum}`,
          am: `አንቀጽ ${articleNum}`,
          en: `Article ${articleNum}`,
        },
        title: constSuggestion.title,
        lawSource: {
          om: 'Heera Mootummaa Rippabiliika Dimokraatawaa Federaalaa Itoophiyaa (Labsii Lakk. 1/1987)',
          am: 'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ ሕገ-መንግሥት (አዋጅ ቁጥር 1/1987)',
          en: 'Constitution of the Federal Democratic Republic of Ethiopia (Proclamation No. 1/1995)',
        },
        jurisdiction: 'federal',
        fullText: constSuggestion.context,
        yearEC: 1987,
        yearGC: 1995,
        linkedPrecedents: findRelatedPrecedents(articleNum, 'constitution'),
      };
    }
  }

  // 6. SDFHH / Civil Procedure Code articles (e.g. Kwt. 6, Article 6, SDFHH Kwt. 358, etc.)
  // When explicitly referenced or when a standalone article number is queried
  if (articleNum) {
    const sdfhhArt = findSDFHHArticle(articleNum);
    if (sdfhhArt) {
      return {
        id: `sdfhh_art_${sdfhhArt.number}`,
        type: 'statute_article',
        rawCitation: cleaned,
        matchedCitation: `SDFHH ${sdfhhArt.articleLabel}`,
        articleNumber: sdfhhArt.number,
        articleLabel: {
          om: sdfhhArt.articleLabel,
          am: `አንቀጽ ${sdfhhArt.number}`,
          en: `Art. ${sdfhhArt.number}`,
        },
        title: {
          om: `${sdfhhArt.articleLabel}: ${sdfhhArt.titleOm}`,
          am: `አንቀጽ ${sdfhhArt.number}፡ ${sdfhhArt.titleAm}`,
          en: `Article ${sdfhhArt.number}: ${sdfhhArt.titleEn}`,
        },
        lawSource: {
          om: 'Seera Adeemsa Falmii Hariiroo Hawaasaa (SDFHH) - Labsii Lakk. 52 Bara 1958',
          am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ - አዋጅ ቁጥር 52/1958',
          en: 'Civil Procedure Code of Ethiopia - Proclamation No. 52 of 1965',
        },
        jurisdiction: 'federal',
        fullText: {
          om: sdfhhArt.summaryOm,
          am: sdfhhArt.summaryAm,
          en: sdfhhArt.summaryEn,
        },
        keyRules: sdfhhArt.keyRulesOm,
        crossReferences: sdfhhArt.crossReferences,
        yearEC: 1958,
        yearGC: 1965,
        linkedPrecedents: findRelatedPrecedents(sdfhhArt.number, 'civil procedure'),
      };
    }
  }

  // 7. Fallback to LEGAL_CITATIONS_DATABASE general keywords search
  const foundAny = LEGAL_CITATIONS_DATABASE.find(c => 
    c.keywords.some(k => cleaned.toLowerCase().includes(k.toLowerCase()))
  );
  if (foundAny) {
    return {
      id: foundAny.id,
      type: 'statute_article',
      rawCitation: cleaned,
      matchedCitation: foundAny.insertText,
      articleLabel: {
        om: foundAny.categoryLabel.om,
        am: foundAny.categoryLabel.am,
        en: foundAny.categoryLabel.en,
      },
      title: foundAny.title,
      lawSource: {
        om: 'Kuusaa Seeraa SEERAAI (Authoritative Ethiopian Legislation)',
        am: 'የSEERAAI የሕግ ማከማቻ (Authoritative Ethiopian Legislation)',
        en: 'SEERAAI Authoritative Legal Database',
      },
      jurisdiction: 'federal',
      fullText: foundAny.context,
      linkedPrecedents: [],
    };
  }

  return null;
}

/**
 * Scans an arbitrary text string and returns all unique resolved legal article citations
 */
export function scanTextForLegalArticles(text: string): ResolvedArticleCitation[] {
  if (!text || text.trim().length < 2) return [];

  const results: ResolvedArticleCitation[] = [];
  const seenIds = new Set<string>();

  // Patterns to look for in text
  const patterns: RegExp[] = [
    // 1. Cassation precedents
    /(?:Lakk(?:\.|\s+Galmee|\s+)|Galmee(?:\s+Lakk\.|\s+)|መዝገብ\s*ቁጥር|በመዝገብ\s*ቁጥር|መ[./]ቁ|Cassation(?:\s+File)?)\s*[:#]?\s*(\d{5,6})/gi,
    
    // 2. Specific Laws with Articles
    /(?:Civil\s+Code|Koodii\s+Siivilii|ፍትሐብሔር\s*ሕግ)\s*(?:Arts?\.?|Articles?|Keeyyata|Kwt\.?|አንቀጽ)\s*(\d+)/gi,
    /(?:Labor\s+Proclamation|Labsii\s+Hojjetaa|የአሰሪና\s*ሰራተኛ\s*አዋጅ|1156\/2019|1156\/2011)\s*(?:Arts?\.?|Articles?|Keeyyata|Kwt\.?|አንቀጽ)\s*(\d+)/gi,
    /(?:FDRE\s+Constitution|Heera\s+Mootummaa|ሕገ-?\s*መንግሥት)\s*(?:Arts?\.?|Articles?|Keeyyata|Kwt\.?|አንቀጽ)\s*(\d+)/gi,
    /(?:Civil\s+Procedure|SDFHH|Deemsa\s+Falmii\s+Siivilii|ፍትሐብሔር\s*ስነ-?ስርዓት)\s*(?:Arts?\.?|Articles?|Keeyyata|Kwt\.?|አንቀጽ)\s*(\d+)/gi,
    
    // 3. Proclamation numbers (e.g. Labsii 1156/2019, Labsii 242/2014, Labsii 248/2015, Labsii 1243/2021)
    /(?:Proclamation\s+No\.?|Labsii\s+Lakk\.?|Labsii|አዋጅ\s*ቁጥር|አዋጅ)\s*(\d+\/\d{4})/gi,

    // 4. Standalone article numbers (Kwt. 6, Keeyyata 6, Art. 1723, etc.)
    /(?:Kwt\.?|Keeyyata|Arts?\.?|Articles?|አንቀጽ)\s*(\d+)/gi,
  ];

  for (const regex of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const rawMatch = match[0];
      const resolved = resolveLegalArticleCitation(rawMatch);
      if (resolved && !seenIds.has(resolved.id)) {
        seenIds.add(resolved.id);
        results.push(resolved);
      }
    }
  }

  return results;
}
