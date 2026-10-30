/**
 * Afaan Oromoo Legal Spelling & Grammar Normalization Utility
 * (Sirna Sirreeffama Qubee fi Seerluga Seeraa Afaan Oromoo)
 *
 * Automatically corrects common spelling anomalies, OCR errors, double vowel omissions,
 * glottal stop (hudhaa) placement, consonant gemination, and standardization of 
 * Ethiopian legal terminology in Afaan Oromoo.
 */

export interface CorrectionRule {
  pattern: RegExp;
  replacement: string | ((substring: string, ...args: any[]) => string);
  description: string;
}

// 1. Core Ethiopian Legal Terminology Standardization Mappings
export const OROMO_LEGAL_SPELLING_CORRECTIONS: Record<string, string> = {
  // Court & Jurisdiction terms
  'murti': 'murtii',
  'murte': 'murtii',
  'murtiee': 'murtii',
  'dhadacha': 'dhaddacha',
  'dadacha': 'dhaddacha',
  'dhaddach': 'dhaddacha',
  'ijibata': 'ijibbaata',
  'idjibbaata': 'ijibbaata',
  'jibbaata': 'ijibbaata',
  'abba seera': 'abbaa seeraa',
  'aba seera': 'abbaa seeraa',
  'abaa seeraa': 'abbaa seeraa',
  'abbaalanga': 'abbaa alangaa',
  'aba alangaa': 'abbaa alangaa',
  'abba alangaa': 'abbaa alangaa',
  'abukaato': 'abukaattoo',
  'abukato': 'abukaattoo',
  'abukaatoo': 'abukaattoo',
  'mana murti': 'mana murtii',
  'manna murtii': 'mana murtii',
  'mana murtiitti': 'mana murtiitti',

  // Statutory & Procedural terms
  'labsi': 'labsii',
  'labsiin': 'labsiin',
  'dambi': 'dambii',
  'dambiin': 'dambii',
  'keyyata': 'keeyyata',
  'kayyata': 'keeyyata',
  'keyyanni': 'keeyyanni',
  'keeyata': 'keeyyata',
  'keyata': 'keeyyata',
  'waliigalte': 'waliigaltee',
  'waligaltee': 'waliigaltee',
  'waligalte': 'waliigaltee',
  'himata': 'himataa',
  'himatama': 'himatamaa',
  'raga': 'ragaa',
  'ragaan': 'ragaan',
  'ragaalee': 'ragaalee',
  'falmi': 'falmii',
  'falmii': 'falmii',
  'beellama': 'beellama',
  'bellama': 'beellama',
  'bellamni': 'beellamni',
  'oliyyata': "ol'iyyata",
  'oliyata': "ol'iyyata",
  'ol-iyyata': "ol'iyyata",
  'iyyannoo': 'iyyannoo',
  'iyanoo': 'iyyannoo',
  'iyyata': 'iyyata',
  'beenya': 'beenyaa',
  'benyaa': 'beenyaa',
  'qabeenya': 'qabeenya',
  'qabenya': 'qabeenya',
  'dhaala': 'dhaala',
  'dhala': 'dhaala',
  'dhaaltuu': 'dhaaltuu',
  'dhaltuu': 'dhaaltuu',
  'yakka': 'yakka',
  'yaka': 'yakka',
  'hariiro': 'hariiroo',
  'hariroo': 'hariiroo',
  'hariiro hawaasa': 'hariiroo hawaasaa',
  'hariiroo hawaasa': 'hariiroo hawaasaa',
  'qajeelfama': 'qajeelfama',
  'qajelfama': 'qajeelfama',
  'heera': 'heera',
  'hera': 'heera',
  'heera mootummaa': 'heera mootummaa',
  'mootumma': 'mootummaa',
  'motummaa': 'mootummaa',
  'motumma': 'mootummaa',
  'chaappaa': 'chaappaa',
  'chapaa': 'chaappaa',
  'mallattoo': 'mallattoo',
  'malattoo': 'mallattoo',
  'malatto': 'mallattoo',
  'qabiyyee': 'qabiyyee',
  'qabiyye': 'qabiyyee',
  'mirga': 'mirga',
  'dirqama': 'dirqama',
  'dirqamni': 'dirqamni',
};

// 2. OCR Character Artifact & Glottal Stop (Hudhaa) Normalizers
export const OCR_GLOTTAL_CORRECTIONS: [RegExp, string][] = [
  // Common OCR confusion with curly apostrophes or backticks for hudhaa
  [/[’`´ʻ‘]/g, "'"],
  // Common glottal stop words standardization
  [/\b(ol)\s*['\-]?\s*(iyyata|iyyannoo|iyyataa)\b/gi, "ol'iyyata"],
  [/\b(ba)\s*['\-]\s*(a|e|u|i|o)\b/gi, "ba'$2"],
  [/\b(ka)\s*['\-]\s*(e|a|u)\b/gi, "ka'$2"],
  [/\b(ta)\s*['\-]\s*(e|a|u)\b/gi, "ta'$2"],
  [/\b(fu)\s*['\-]\s*(e|a|u)\b/gi, "fu'$2"],
  [/\b(ja)\s*['\-]\s*(a)\b/gi, "ja'$2"],
  [/\b(to)\s*['\-]\s*(e|a)\b/gi, "to'$2"],
  [/\b(dho)\s*['\-]\s*(o|e|a)\b/gi, "dho'$2"],
  [/\b(mirkanaa)\s*['\-]?\s*(e|era|eera)\b/gi, "mirkanaa'eera"],
  [/\b(danda)\s*['\-]?\s*(ama|ame|amuu|amte|an)\b/gi, "danda'$2"],
  [/\b(kuffi)\s*['\-]?\s*(fame|famuu|fameera)\b/gi, "kuffifameera"],
  [/\b(fudhata)\s*['\-]?\s*(me|mee|meera)\b/gi, "fudhatameera"],
];

// 3. Common Legal Proclamation & Article Citations Standardizer
export const CITATION_STANDARDIZERS: [RegExp, string | ((...args: any[]) => string)][] = [
  [/\b(labsii|labsi|lab)\.?\s*(lakk|lakkoofsa|no|num)\.?\s*(\d+)\/(\d+)\b/gi, 'Labsii Lakk. $3/$4'],
  [/\b(keeyyata|keyyata|kwt|art|keey)\.?\s*(\d+)(\s*\(\s*(\d+|[a-zA-Z])\s*\))?/gi, (_, __, num, sub) => {
    return sub ? `Keeyyata ${num}${sub.replace(/\s+/g, '')}` : `Keeyyata ${num}`;
  }],
  [/\b(lakk|lakk\.|lak)\s*([a-zA-Z0-9_\-\/]+)\b/gi, 'Lakk. $2'],
  [/\b(mana\s+murtii\s+waliigalaa\s+federaalaa|mmwf)\b/gi, 'Mana Murtii Waliigalaa Federaalaa'],
  [/\b(mana\s+murtii\s+waliigalaa\s+oromiyaa|mmwo)\b/gi, 'Mana Murtii Waliigalaa Oromiyaa'],
  [/\b(dhaddacha\s+ijibbaataa|dhaddacha\s+ijoo)\b/gi, 'Dhaddacha Ijibbaataa'],
];

export interface TextCorrectionResult {
  originalText: string;
  correctedText: string;
  correctionsCount: number;
  correctedTerms: { before: string; after: string }[];
}

/**
 * Automatically applies legal spelling corrections, glottal stop fixes,
 * and citation regularizations for Afaan Oromoo text.
 */
export function correctOromoLegalText(input: string): TextCorrectionResult {
  if (!input || !input.trim()) {
    return {
      originalText: input,
      correctedText: input,
      correctionsCount: 0,
      correctedTerms: [],
    };
  }

  let text = input;
  const changes: { before: string; after: string }[] = [];

  // Step 1: Standardize punctuation and quotes
  for (const [pattern, replacement] of OCR_GLOTTAL_CORRECTIONS) {
    text = text.replace(pattern, replacement);
  }

  // Step 2: Fix statutory citations (Labsii, Keeyyata)
  for (const [pattern, replacement] of CITATION_STANDARDIZERS) {
    text = text.replace(pattern, (match, ...args) => {
      const fixed = typeof replacement === 'string' 
        ? match.replace(pattern, replacement) 
        : (replacement as any)(match, ...args);
      if (fixed !== match) {
        changes.push({ before: match, after: fixed });
      }
      return fixed;
    });
  }

  // Step 3: Word-level dictionary replacements for legal terms
  // Matches whole words case-insensitively, preserving original case formatting
  for (const [wrong, right] of Object.entries(OROMO_LEGAL_SPELLING_CORRECTIONS)) {
    // Regex boundary matching
    const wordRegex = new RegExp(`\\b${wrong.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    text = text.replace(wordRegex, (match) => {
      // Check if match was uppercase, titlecase, or lowercase
      let replacement = right;
      if (match === match.toUpperCase()) {
        replacement = right.toUpperCase();
      } else if (match[0] === match[0].toUpperCase()) {
        replacement = right.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      if (match.toLowerCase() !== replacement.toLowerCase()) {
        changes.push({ before: match, after: replacement });
      }
      return replacement;
    });
  }

  // Step 4: Spacing cleanup around punctuation
  text = text
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/([.,;:!?])(?=[a-zA-Z0-9\u1200-\u137F])/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    originalText: input,
    correctedText: text,
    correctionsCount: changes.length,
    correctedTerms: changes,
  };
}
