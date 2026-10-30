import { Language } from '../i18n/translations';

export interface ConvertedCitationMatch {
  original: string;
  standardized: string;
  type: 'proclamation' | 'civil_code' | 'criminal_code' | 'commercial_code' | 'cassation' | 'regulation' | 'directive';
  index?: number;
}

export interface StandardizationResult {
  standardizedText: string;
  conversionCount: number;
  conversions: ConvertedCitationMatch[];
}

/**
 * Normalizes 2-digit Ethiopian or Gregorian year to 4 digits
 * e.g. '19' -> '2019' or '11' -> '2011'
 */
function normalizeYear(yearStr: string, isEthiopicCalendar = false): string {
  if (yearStr.length === 4) return yearStr;
  const num = parseInt(yearStr, 10);
  if (num < 100) {
    if (isEthiopicCalendar) {
      return num > 50 ? `19${yearStr}` : `20${yearStr.padStart(2, '0')}`;
    }
    return num > 50 ? `19${yearStr}` : `20${yearStr.padStart(2, '0')}`;
  }
  return yearStr;
}

/**
 * Comprehensive Ethiopian Legal Citation Standardizer
 * Detects informal/unformatted statutory references and converts them into
 * the official Ethiopian legislative citation standard (FDRE Negarit Gazeta & Federal Supreme Court standard).
 */
export function standardizeLegalCitations(text: string, lang: Language = 'om'): StandardizationResult {
  if (!text) {
    return { standardizedText: '', conversionCount: 0, conversions: [] };
  }

  let resultText = text;
  const conversions: ConvertedCitationMatch[] = [];

  // 1. Proclamations / Labsiilee / አዋጆች (e.g. proc 1156/19, proc. 1156/2019, proclamation 1243/2021)
  const procRegex = /\b(?:procl?\.?|proclamation)\s*(?:no\.?|number|lakk\.?|ቁጥር)?\s*(\d{2,4})\s*(?:\/|\s*of\s*|\s*barri\s*|\s*b\.a\.?\s*|\s*ዓ\.ም\.?\s*)(\d{2,4})?\b/gi;
  resultText = resultText.replace(procRegex, (match, procNum, year) => {
    let standard = '';
    if (year) {
      const fullYear = normalizeYear(year, false);
      standard = `Proc. No. ${procNum}/${fullYear}`;
    } else {
      standard = `Proc. No. ${procNum}`;
    }

    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'proclamation' });
      return standard;
    }
    return match;
  });

  // 2. Afaan Oromoo Proclamations: labsii 1156/2011, labsii 1156/19
  const labsiiRegex = /\b(?:labsii|labsiin)\s*(?:lakk\.?|lakkoofsa)?\s*(\d{2,4})\s*(?:\/|\s*bara\s*)(\d{2,4})?\b/gi;
  resultText = resultText.replace(labsiiRegex, (match, procNum, year) => {
    let standard = '';
    if (year) {
      const fullYear = normalizeYear(year, true);
      standard = `Labsii Lakk. ${procNum}/${fullYear}`;
    } else {
      standard = `Labsii Lakk. ${procNum}`;
    }

    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'proclamation' });
      return standard;
    }
    return match;
  });

  // 3. Amharic Proclamations: አዋጅ 1156/11, አዋጅ 1156/2011
  const awajRegex = /(?:አዋጅ|የአዋጅ)\s*(?:ቁጥር|ቁ\.?)?\s*(\d{2,4})\s*(?:\/|\s*ዓ\.ም\s*)(\d{2,4})?/g;
  resultText = resultText.replace(awajRegex, (match, procNum, year) => {
    let standard = '';
    if (year) {
      const fullYear = normalizeYear(year, true);
      standard = `አዋጅ ቁጥር ${procNum}/${fullYear} ዓ.ም.`;
    } else {
      standard = `አዋጅ ቁጥር ${procNum}`;
    }

    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'proclamation' });
      return standard;
    }
    return match;
  });

  // 4. Civil Code / Koodii Siiviilii / ፍትሐብሔር ሕግ
  // e.g., civ code 1675, civil code art 1675, civ. code art. 1675
  const civCodeRegex = /\b(?:civ(?:il)?\.?\s*code|c\.c\.)\s*(?:art\.?|article|section|kwt\.?)?\s*(\d{1,4})\b/gi;
  resultText = resultText.replace(civCodeRegex, (match, artNum) => {
    const standard = `Civil Code Art. ${artNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'civil_code' });
      return standard;
    }
    return match;
  });

  // Afaan Oromoo Civil Code: koodii siiviilii 1675 -> Koodii Siiviilii Kwt. 1675
  const koodiiSiiviiliiRegex = /\b(?:koodii|koodi)\s*siiviilii\s*(?:keeyyata|kwt\.?|art\.?)?\s*(\d{1,4})\b/gi;
  resultText = resultText.replace(koodiiSiiviiliiRegex, (match, artNum) => {
    const standard = `Koodii Siiviilii Kwt. ${artNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'civil_code' });
      return standard;
    }
    return match;
  });

  // Amharic Civil Code: ፍትሐብሔር ሕግ 1675 -> ፍትሐብሔር ሕግ ቁጥር 1675
  const fithaCodeRegex = /(?:ፍትሐብሔር|ፍትሐ\s*ብሔር)\s*(?:ሕግ)?\s*(?:ቁጥር|አንቀጽ|አንቀፅ)?\s*(\d{1,4})/g;
  resultText = resultText.replace(fithaCodeRegex, (match, artNum) => {
    const standard = `የፍትሐብሔር ሕግ ቁጥር ${artNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'civil_code' });
      return standard;
    }
    return match;
  });

  // 5. Commercial Code / Koodii Daldalaa
  const commCodeRegex = /\b(?:comm(?:ercial)?\.?\s*code|com\.\s*code)\s*(?:art\.?|article|section)?\s*(\d{1,4})\b/gi;
  resultText = resultText.replace(commCodeRegex, (match, artNum) => {
    const standard = `Commercial Code Art. ${artNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'commercial_code' });
      return standard;
    }
    return match;
  });

  const koodiiDaldalaaRegex = /\b(?:koodii|koodi)\s*daldalaa\s*(?:keeyyata|kwt\.?|art\.?)?\s*(\d{1,4})\b/gi;
  resultText = resultText.replace(koodiiDaldalaaRegex, (match, artNum) => {
    const standard = `Koodii Daldalaa Kwt. ${artNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'commercial_code' });
      return standard;
    }
    return match;
  });

  // 6. Criminal Code / Koodii Yakkaa
  const crimCodeRegex = /\b(?:crim(?:inal)?\.?\s*code|penal\s*code)\s*(?:art\.?|article|section)?\s*(\d{1,4})\b/gi;
  resultText = resultText.replace(crimCodeRegex, (match, artNum) => {
    const standard = `Criminal Code Art. ${artNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'criminal_code' });
      return standard;
    }
    return match;
  });

  const koodiiYakkaaRegex = /\b(?:koodii|koodi)\s*yakkaa\s*(?:keeyyata|kwt\.?|art\.?)?\s*(\d{1,4})\b/gi;
  resultText = resultText.replace(koodiiYakkaaRegex, (match, artNum) => {
    const standard = `Koodii Yakkaa Kwt. ${artNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'criminal_code' });
      return standard;
    }
    return match;
  });

  // 7. Federal Supreme Court Cassation Precedents (e.g. cassation 249062, file 249062, lakk galmee 249062)
  const cassationRegex = /\b(?:cassation|cass\.)\s*(?:file|decision|bench|no\.?|division)?\s*:?\s*(\d{5,6})\b/gi;
  resultText = resultText.replace(cassationRegex, (match, fileNum) => {
    const standard = `Cassation File No. ${fileNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'cassation' });
      return standard;
    }
    return match;
  });

  const galmeeRegex = /\b(?:lakk(?:\.|\s+galmee)?|galmee(?:\s+lakk\.?)?)\s*:?\s*(\d{5,6})\b/gi;
  resultText = resultText.replace(galmeeRegex, (match, fileNum) => {
    const standard = `Lakk. Galmee ${fileNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'cassation' });
      return standard;
    }
    return match;
  });

  const mezgebRegex = /(?:የመዝገብ\s*ቁጥር|መዝገብ\s*ቁጥር|መ[./]ቁ)\s*:?\s*(\d{5,6})/g;
  resultText = resultText.replace(mezgebRegex, (match, fileNum) => {
    const standard = `የሰበር መዝገብ ቁጥር ${fileNum}`;
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'cassation' });
      return standard;
    }
    return match;
  });

  // 8. Regulations (Dambii / ደንብ)
  const dambiiRegex = /\b(?:dambii|dambiin)\s*(?:lakk\.?|lakkoofsa)?\s*(\d{2,4})\s*(?:\/|\s*bara\s*)(\d{2,4})?\b/gi;
  resultText = resultText.replace(dambiiRegex, (match, regNum, year) => {
    let standard = '';
    if (year) {
      const fullYear = normalizeYear(year, true);
      standard = `Dambii Lakk. ${regNum}/${fullYear}`;
    } else {
      standard = `Dambii Lakk. ${regNum}`;
    }
    if (match.trim() !== standard) {
      conversions.push({ original: match, standardized: standard, type: 'regulation' });
      return standard;
    }
    return match;
  });

  return {
    standardizedText: resultText,
    conversionCount: conversions.length,
    conversions,
  };
}

/**
 * Detect unformatted citations without replacing them
 */
export function detectUnformattedCitations(text: string): ConvertedCitationMatch[] {
  const result = standardizeLegalCitations(text);
  return result.conversions;
}
