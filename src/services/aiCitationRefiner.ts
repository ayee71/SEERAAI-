import { Language } from '../i18n/translations';
import { getUserSettings } from './storage';

export interface IncompleteCitationMatch {
  original: string;
  index: number;
  length: number;
  surroundingContext: string;
  categoryGuess?: string;
}

export interface RefinedCitationResult {
  originalPlaceholder: string;
  suggestedCitation: string;
  articleNumber?: string;
  proclamationOrCode: string;
  officialSource: string;
  exactReplacement: string;
  legalReasoning: {
    om: string;
    am: string;
    en: string;
  };
  confidence: number;
}

/**
 * Regex identifying incomplete / placeholder legal citations in document text
 * Matches: 'Article X of Civil Code', 'Art. X', 'Keeyyata X', 'Kwt. X', 'አንቀጽ X',
 * '[Article X]', 'Article ___', 'Proc. No. [X]', 'Labsii Lakk. ___', etc.
 */
export const INCOMPLETE_CITATION_REGEX =
  /(?:(?:(?:Civil\s+Code|Civil\s+Procedure\s+Code|Labor\s+Proclamation|Commercial\s+Code|FDRE\s+Constitution|SDFHH|Seera\s+Hariiroo\s+Hawaasaa|Labsii\s+Hojjetaa|የፍትሐብሔር\s*ሕግ|የአሠሪና\s*ሠራተኛ\s*አዋጅ)\s*)?(?:(?:\[|\()?\s*(?:Arts?\.?|Articles?|Keeyyata|Kwt\.?|አንቀጽ|አንቀፅ)\s*(?:[xX]|_+|\?+|\[xX\]|\[\s*\]|\.{3,}|N\/A|XX+)\s*(?:\]|\))?)(?:\s*(?:of|jalatti|ውስጥ)\s*(?:Civil\s+Code|Civil\s+Procedure\s+Code|Labor\s+Proclamation|Commercial\s+Code|FDRE\s+Constitution|SDFHH|Seera\s+Hariiroo\s+Hawaasaa|Labsii\s+Hojjetaa|የፍትሐብሔር\s*ሕግ|የአሠሪና\s*ሠራተኛ\s*አዋጅ))?|(?:\[\s*(?:Article|Keeyyata|Kwt|አንቀጽ)\s*[xX_?]+\s*\])|(?:(?:Proc(?:lamation)?\.?\s*No\.?|Labsii\s*Lakk\.?|አዋጅ\s*ቁጥር)\s*\[?\s*(?:[xX]|_+|\?+)\s*\]?)|(?:(?:Cassation|Dhaddacha\s*Ijoo|ሰበር)\s*(?:File|Galmee|መዝገብ)?\s*(?:No\.?|Lakk\.?|ቁጥር)?\s*\[?\s*(?:[xX]|_+|\?+)\s*\]?))/gi;

/**
 * Scans a document or text string for incomplete placeholder citations
 */
export function detectIncompleteCitations(text: string): IncompleteCitationMatch[] {
  if (!text || typeof text !== 'string') return [];

  const matches: IncompleteCitationMatch[] = [];
  INCOMPLETE_CITATION_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = INCOMPLETE_CITATION_REGEX.exec(text)) !== null) {
    const original = match[0];
    const index = match.index;
    const length = original.length;

    // Extract surrounding window of ~160 characters for contextual inference
    const startWindow = Math.max(0, index - 80);
    const endWindow = Math.min(text.length, index + length + 80);
    const surroundingContext = text.substring(startWindow, endWindow);

    matches.push({
      original,
      index,
      length,
      surroundingContext,
    });
  }

  return matches;
}

/**
 * Local domain heuristic completion fallback when offline or during rapid preview
 */
export function getLocalHeuristicRefinement(
  placeholder: string,
  context: string,
  lang: Language = 'om'
): RefinedCitationResult {
  const lowerCtx = (context + ' ' + placeholder).toLowerCase();

  // 1. Review of Judgment / Retrial (Review of Judgement / Daagim-daanyummaa)
  if (
    lowerCtx.includes('daagim') ||
    lowerCtx.includes('review') ||
    lowerCtx.includes('retrial') ||
    lowerCtx.includes('ዳግም')
  ) {
    return {
      originalPlaceholder: placeholder,
      suggestedCitation: 'SDFHH Article 6 (Review of Judgment / Daagim-daanyummaa)',
      articleNumber: '6',
      proclamationOrCode: 'Civil Procedure Code (SDFHH)',
      officialSource: 'SDFHH Art. 6 & FSC Cassation Precedent 249062',
      exactReplacement:
        lang === 'om'
          ? 'Seera Deemsa Falmii Hariiroo Hawaasaa (SDFHH) Keeyyata 6'
          : lang === 'am'
          ? 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 6'
          : 'Civil Procedure Code (SDFHH) Article 6',
      legalReasoning: {
        om: 'Iyyatni Daagim-daanyummaa (Review) bu\'uura SDFHH Keeyyata 6 fi murtii Dhaddacha Ijibbaataa Lakk. 249062 tiin dhiyaachuu danda\'a.',
        am: 'የዳግም ዳኝነት አቤቱታ በፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 6 እና በሰበር መዝገብ ቁጥር 249062 መሠረት የሚቀርብ ነው።',
        en: 'Applications for review of judgment are brought under Article 6 of the Civil Procedure Code and Cassation Precedent 249062.',
      },
      confidence: 0.98,
    };
  }

  // 1b. Civil Procedure / Court Jurisdiction (Article 6 / 80 / 244)
  if (
    (lowerCtx.includes('aangoo') ||
    lowerCtx.includes('jurisdiction') ||
    lowerCtx.includes('pecuniary') ||
    lowerCtx.includes('gatii') ||
    lowerCtx.includes('claim') ||
    lowerCtx.includes('ሥልጣን')) && (lowerCtx.includes('6') || lowerCtx.includes('80'))
  ) {
    return {
      originalPlaceholder: placeholder,
      suggestedCitation: 'Civil Procedure Code Article 6 (Pecuniary Jurisdiction Determined by Claim)',
      articleNumber: '6',
      proclamationOrCode: 'Civil Procedure Code of Ethiopia (1965)',
      officialSource: 'Negarit Gazeta Extraordinary Issue No. 3/1965, Art. 6',
      exactReplacement:
        lang === 'om'
          ? 'Seera Deemsa Falmii Hariiroo Hawaasaa (SDFHH) Keeyyata 6'
          : lang === 'am'
          ? 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ (ፍ/ብ/ሥ/ሥ/ሕ) አንቀጽ 6'
          : 'Civil Procedure Code (SDFHH) Article 6',
      legalReasoning: {
        om: 'Aangoon mana murtii gatii iyyata himataan gaafatameen akka murtaa\'u SDFHH Keeyyata 6 irratti tumameera.',
        am: 'የፍርድ ቤት የገንዘብ ሥልጣን የሚወሰነው በከሳሽ የይገባኛል ጥያቄ ዋጋ መሠረት መሆኑን የፍ/ብ/ሥ/ሥ/ሕግ አንቀጽ 6 ይደነግጋል።',
        en: 'Pecuniary competence of trial courts is determined strictly by the monetary amount claimed in the plaint pursuant to Civil Procedure Code Art. 6.',
      },
      confidence: 0.96,
    };
  }

  // 1c. Rural Land (Generic Keeyyata 6)
  if (lowerCtx.includes('6') && (lowerCtx.includes('lafa') || lowerCtx.includes('land') || lowerCtx.includes('dhaala') || lowerCtx.includes('መሬት'))) {
    return {
      originalPlaceholder: placeholder,
      suggestedCitation: 'Oromia Rural Land Proclamation Art. 6 (Inheritance)',
      articleNumber: '6',
      proclamationOrCode: 'Proclamation No. 130/1999',
      officialSource: 'Labsii 130/1999 Art. 6',
      exactReplacement:
        lang === 'om'
          ? 'Labsii 130/1999 Keeyyata 6'
          : lang === 'am'
          ? 'አዋጅ ቁጥር 130/1999 አንቀጽ 6'
          : 'Proclamation 130/1999 Article 6',
      legalReasoning: {
        om: 'Mirgi qabiyyee lafa baadiyyaa miseensota maatii dhaalchisuu Labsii 130/1999 Keeyyata 6 jala jira.',
        am: 'የገጠር መሬት ይዞታን ለቤተሰብ የማወረስ መብት በአዋጅ 130/1999 አንቀጽ 6 ተደንግጓል።',
        en: 'The right to inherit rural land holdings is protected under Article 6 of Proclamation 130/1999.',
      },
      confidence: 0.94,
    };
  }

  // 2. Contract Breach / Non-Performance Remedies (Civil Code Art. 1771 / 1790)
  if (
    lowerCtx.includes('diiguu') ||
    lowerCtx.includes('breach') ||
    lowerCtx.includes('beenyaa') ||
    lowerCtx.includes('damages') ||
    lowerCtx.includes('non-performance') ||
    lowerCtx.includes('ካሳ') ||
    lowerCtx.includes('ማፍረስ')
  ) {
    return {
      originalPlaceholder: placeholder,
      suggestedCitation: 'Civil Code Article 1771 (Remedies for Non-Performance of Contracts)',
      articleNumber: '1771',
      proclamationOrCode: 'Civil Code of Ethiopia (Proclamation No. 165/1960)',
      officialSource: 'Negarit Gazeta Extraordinary Issue No. 2/1960, Art. 1771',
      exactReplacement:
        lang === 'om'
          ? 'Koodii Siiviilii Keeyyata 1771'
          : lang === 'am'
          ? 'የፍትሐብሔር ሕግ አንቀጽ 1771'
          : 'Civil Code Article 1771',
      legalReasoning: {
        om: 'Gareen tokko waliigaltee yoo diige, gareen miidhame raawwii dirqisiisaa, waliigaltee haquu, fi beenyaa gaafachuuf mirga akka qabu tuma.',
        am: 'አንደኛው ወገን ውሉን ሳያከብር ሲቀር ሌላኛው ወገን ውሉ እንዲፈጸምለት፣ እንዲሰረዝ ወይም የጉዳት ካሳ እንዲከፈለው መጠየቅ ይችላል።',
        en: 'Provides aggrieved parties with statutory remedies including forced performance, cancellation, and compensatory damages under Art. 1771.',
      },
      confidence: 0.94,
    };
  }

  // 3. Labor Law / Termination / Misconduct (Labor Proclamation 1156/2019 Art. 27 / 39)
  if (
    lowerCtx.includes('hojjetaa') ||
    lowerCtx.includes('hojii') ||
    lowerCtx.includes('labor') ||
    lowerCtx.includes('severance') ||
    lowerCtx.includes('dismissal') ||
    lowerCtx.includes('ስራ') ||
    lowerCtx.includes('ሰራተኛ')
  ) {
    return {
      originalPlaceholder: placeholder,
      suggestedCitation: 'Labor Proclamation No. 1156/2019 Article 27 (Termination without Notice)',
      articleNumber: '27',
      proclamationOrCode: 'Labor Proclamation No. 1156/2019',
      officialSource: 'Federal Negarit Gazeta 25th Year No. 89, Art. 27',
      exactReplacement:
        lang === 'om'
          ? 'Labsii Hojjetaa fi Hojjechiisaa Lakk. 1156/2019 Keeyyata 27'
          : lang === 'am'
          ? 'የአሠሪና ሠራተኛ አዋጅ ቁጥር 1156/2011 አንቀጽ 27'
          : 'Labor Proclamation No. 1156/2019 Article 27',
      legalReasoning: {
        om: 'Badiiwwan guguddoo akeekkachiisa malee waliigaltee hojii addaan kutsiisan kanneen akka amanamummaa dhabuu fi dhabamuu hojii tuma.',
        am: 'ያለማስጠንቀቂያ የሥራ ውልን ለማቋረጥ የሚያበቁ ከባድ የጥፋት ዓይነቶችን የሚደነግግ ድንጋጌ ነው።',
        en: 'Defines exhaustive grounds for summary dismissal without prior notice under Ethiopian labor law.',
      },
      confidence: 0.95,
    };
  }

  // 4. Default Contract Validity (Civil Code Art. 1731)
  return {
    originalPlaceholder: placeholder,
    suggestedCitation: 'Civil Code Article 1731 (Binding Force of Law Between Contracting Parties)',
    articleNumber: '1731',
    proclamationOrCode: 'Civil Code of Ethiopia (Proclamation No. 165/1960)',
    officialSource: 'Negarit Gazeta Extraordinary Issue No. 2/1960, Art. 1731',
    exactReplacement:
      lang === 'om'
        ? 'Koodii Siiviilii Keeyyata 1731'
        : lang === 'am'
        ? 'የፍትሐብሔር ሕግ አንቀጽ 1731'
        : 'Civil Code Article 1731',
    legalReasoning: {
      om: "Waliigalteen seera qabeessa ta'ee tolfame gareewwan walii galan gidduutti akka seeraatti dirqisiisaadha (Pacta Sunt Servanda).",
      am: 'በሕግ ፊት የተደረገ ውል በተዋዋይ ወገኖች መካከል እንደ ሕግ አስገዳጅ ነው።',
      en: 'Codifies the universal principle of pacta sunt servanda: contracts lawfully formed have the binding force of law between parties.',
    },
    confidence: 0.90,
  };
}

/**
 * Calls Gemini AI API (/api/refine-citation) to suggest completions for incomplete citations
 */
export async function refineCitationWithAI(params: {
  fullText: string;
  targetCitation?: string;
  surroundingContext?: string;
  language?: Language;
}): Promise<RefinedCitationResult[]> {
  const { fullText, targetCitation = '', surroundingContext = '', language = 'om' } = params;
  const settings = getUserSettings();
  const modelTier = settings.aiModelTier || 'gemini-flash-lite-latest';

  try {
    const res = await fetch('/api/refine-citation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullText,
        targetCitation,
        surroundingContext,
        language,
        modelTier,
      }),
    });

    if (!res.ok) {
      throw new Error(`Refinement server error: ${res.status}`);
    }

    const data = await res.json();
    if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
      return data.suggestions;
    }
  } catch (error) {
    console.warn('AI citation refinement network failure, using local heuristic refinement:', error);
  }

  // Fallback: Detect all placeholders and generate heuristic completions
  const detected = detectIncompleteCitations(fullText || surroundingContext || targetCitation);
  if (detected.length === 0 && targetCitation) {
    detected.push({
      original: targetCitation,
      index: 0,
      length: targetCitation.length,
      surroundingContext: surroundingContext || fullText,
    });
  }

  return detected.map((d) => getLocalHeuristicRefinement(d.original, d.surroundingContext, language));
}

/**
 * Replaces an incomplete placeholder in a document with the verified replacement string
 */
export function applyCitationRefinement(
  fullText: string,
  originalPlaceholder: string,
  replacement: string
): string {
  if (!fullText || !originalPlaceholder || !replacement) return fullText;
  return fullText.replace(originalPlaceholder, replacement);
}
