/**
 * Trilingual TTS Phonetic Lexicon for Ethiopian Legal Terminology
 * Maps common legal terms, acronyms, and proper names in Afaan Oromoo, Amharic, and English
 * to precise phonetic representations for speech synthesis enunciation.
 */

export interface TtsLexiconEntry {
  term: string;
  lang: 'om' | 'am' | 'en' | 'all';
  phonetic: string;
  category: 'statute' | 'institution' | 'legal_term' | 'proper_name';
}

export const TTS_LEXICON_DATABASE: TtsLexiconEntry[] = [
  // Afaan Oromoo Legal Lexicon
  { term: 'Oromiyaa', lang: 'om', phonetic: 'O-ro-mi-aa', category: 'proper_name' },
  { term: 'Caffee', lang: 'om', phonetic: 'Chaf-fee', category: 'institution' },
  { term: 'Idjibbaata', lang: 'om', phonetic: 'Id-jib-baa-ta', category: 'legal_term' },
  { term: 'Gadaa', lang: 'om', phonetic: 'Ga-da-aa', category: 'proper_name' },
  { term: 'Waliigaltee', lang: 'om', phonetic: 'Wa-lii-gal-tee', category: 'legal_term' },
  { term: 'Abbaa Seeraa', lang: 'om', phonetic: 'Ab-baa See-ra-aa', category: 'legal_term' },
  { term: 'Labsii', lang: 'om', phonetic: 'Lab-sii', category: 'statute' },
  { term: 'Keeyyata', lang: 'om', phonetic: 'Keey-ya-ta', category: 'statute' },
  { term: 'Yaa\'ii', lang: 'om', phonetic: 'Yaa-ii', category: 'institution' },
  { term: 'Dhaddacha', lang: 'om', phonetic: 'Dhad-da-cha', category: 'institution' },
  { term: 'Murtii', lang: 'om', phonetic: 'Mur-tii', category: 'legal_term' },
  { term: 'Ragaa', lang: 'om', phonetic: 'Ra-ga-aa', category: 'legal_term' },
  { term: 'Himannaa', lang: 'om', phonetic: 'Hi-man-na-aa', category: 'legal_term' },
  { term: 'Mormii', lang: 'om', phonetic: 'Mor-mii', category: 'legal_term' },
  { term: 'Ajaja', lang: 'om', phonetic: 'A-ja-ja', category: 'legal_term' },
  { term: 'Alangaa', lang: 'om', phonetic: 'A-lan-ga-aa', category: 'legal_term' },
  { term: 'Kora', lang: 'om', phonetic: 'Ko-ra', category: 'legal_term' },
  { term: 'Abukaattoo', lang: 'om', phonetic: 'A-bu-kaat-too', category: 'legal_term' },
  { term: 'Inshuraansi', lang: 'om', phonetic: 'In-shu-raan-si', category: 'legal_term' },
  { term: 'Baadiyyaa', lang: 'om', phonetic: 'Baa-dhiy-aa', category: 'legal_term' },
  
  // Amharic Legal Lexicon
  { term: 'ሕገ መንግሥት', lang: 'am', phonetic: 'hige mengist', category: 'statute' },
  { term: 'ሰበር ችሎት', lang: 'am', phonetic: 'seber chilot', category: 'institution' },
  { term: 'ውል', lang: 'am', phonetic: 'wil', category: 'legal_term' },
  { term: 'ማስረጃ', lang: 'am', phonetic: 'masreja', category: 'legal_term' },
  { term: 'መዝገብ', lang: 'am', phonetic: 'mezgeb', category: 'legal_term' },

  // English Legal Lexicon
  { term: 'Cassation', lang: 'en', phonetic: 'Kuh-say-shun', category: 'institution' },
  { term: 'Injunction', lang: 'en', phonetic: 'In-junk-shun', category: 'legal_term' },
  { term: 'Jurisdiction', lang: 'en', phonetic: 'Joor-is-dik-shun', category: 'legal_term' }
];

export function getTtsLexiconMap(lang: 'om' | 'am' | 'en' = 'om'): Record<string, string> {
  const map: Record<string, string> = {};
  TTS_LEXICON_DATABASE.forEach(entry => {
    if (entry.lang === lang || entry.lang === 'all') {
      map[entry.term] = entry.phonetic;
    }
  });
  return map;
}

export function applyTtsLexicon(text: string, lang: 'om' | 'am' | 'en' = 'om'): string {
  if (!text) return '';
  let processed = text;
  const lexicon = getTtsLexiconMap(lang);
  for (const [term, phonetic] of Object.entries(lexicon)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    processed = processed.replace(regex, phonetic);
  }
  return processed;
}

// User-suggested lexicon queue (persisted in localStorage / admin notification trigger)
export interface LexiconSuggestion {
  id: string;
  term: string;
  phonetic: string;
  lang: 'om' | 'am' | 'en';
  suggestedBy: string;
  timestamp: string;
  status: 'pending' | 'approved';
}

export function getStoredLexiconSuggestions(): LexiconSuggestion[] {
  try {
    const raw = localStorage.getItem('seera_ai_lexicon_suggestions');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function suggestLexiconAddition(suggestion: Omit<LexiconSuggestion, 'id' | 'timestamp' | 'status'>): LexiconSuggestion {
  const newSugg: LexiconSuggestion = {
    ...suggestion,
    id: `sugg-${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  const list = getStoredLexiconSuggestions();
  list.unshift(newSugg);
  try {
    localStorage.setItem('seera_ai_lexicon_suggestions', JSON.stringify(list));
    // Trigger admin notification event
    window.dispatchEvent(new CustomEvent('seera_admin_notification', {
      detail: { title: 'New TTS Lexicon Suggestion', message: `Term: ${newSugg.term} (${newSugg.phonetic})` }
    }));
  } catch {}
  return newSugg;
}
