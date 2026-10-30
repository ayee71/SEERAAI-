/**
 * Oromo Speech Normalizer & Harargee Phonetic Pronunciation Assistant (Seer-luga Afaan Oromoo & Harargee Dialect Phonology)
 * Normalizes Oromo legal text abbreviations, numbers, and orthography (hudhaa / apostrophes, vowel lengthening)
 * and includes a custom legal phoneme lexicon for accurate pronunciation of legal terminology and proper names.
 */

import { getUserSettings } from '../services/storage';

// Custom Legal Phoneme Lexicon for terms that standard browsers mispronounce
export const LEGAL_PHONEME_LEXICON: Record<string, string> = {
  'Oromiyaa': 'O-ro-mi-aa',
  'Caffee': 'Chaf-fee',
  'Idjibbaata': 'Id-jib-baa-ta',
  'Gadaa': 'Ga-da-aa',
  'Waliigaltee': 'Wa-lii-gal-tee',
  'Abbaa Seeraa': 'Ab-baa See-ra-aa',
  'Labsii': 'Lab-sii',
  'Keeyyata': 'Key-ya-ta',
  'Yaa\'ii': 'Yaa-ii',
  'Dhaddacha': 'Dhad-da-cha',
  'Murtii': 'Muur-tii',
  'Ragaa': 'Ra-ga-aa',
  'Himannaa': 'Hi-man-na-aa',
  'Mormii': 'Mor-mii',
  'Ajaja': 'A-ja-ja',
  'Alangaa': 'A-lan-ga-aa',
  'Kora': 'Ko-ra',
  'Abukaattoo': 'A-bu-kaat-too',
  'Inshuraansi': 'In-shu-raan-si',
  'Baadiyyaa': 'Baa-dhiy-aa',
  'Sera': 'See-ra',
  'Heera': 'Hee-ra',
  'Mootummaa': 'Moo-tum-ma-aa',
  'Federaalawaa': 'Fe-de-ra-la-wa-aa',
  'Dimokiraatawaa': 'Di-mo-ki-ra-ta-wa-aa',
  'Hojii': 'Hoj-jii',
  'Nama': 'Na-ma',
  'Biyya': 'Biy-ya',
  'Afaan': 'A-faan',
  'Oromoo': 'O-ro-moo',
  'Iyyannoo': 'Iy-yat-noo',
  'Ol\'iyyannoo': 'Ol-iy-yat-noo',
  'Dhimma': 'Dhim-ma',
  'Mirga': 'Mir-ga',
  'Dirqama': 'Dir-qa-ma',
  'Shakkamaa': 'Shak-ka-ma-aa',
  'Himatamaa': 'Hi-ma-ta-ma-aa',
  'Miidhamaa': 'Miid-ha-ma-aa'
};

export function applyPhonemeLexicon(text: string): string {
  if (!text) return '';
  let processed = text;
  for (const [term, phoneme] of Object.entries(LEGAL_PHONEME_LEXICON)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    processed = processed.replace(regex, phoneme);
  }
  return processed;
}

export function normalizeOromoForSpeech(text: string): string {
  if (!text) return '';

  const settings = getUserSettings();
  let processed = text;

  // Apply custom legal phoneme lexicon
  processed = applyPhonemeLexicon(processed);

  // 1. Expand common Ethiopian & Oromo legal abbreviations for clear spoken pronunciation
  processed = processed
    .replace(/\bKwt\.?\s*(\d+)/gi, 'keeyyata $1')
    .replace(/\bkwt\.?\s*(\d+)/gi, 'keeyyata $1')
    .replace(/\bKwt\b/gi, 'keeyyata')
    .replace(/\blakk\.?\s*(\d+)/gi, 'lakkoofsa $1')
    .replace(/\bLakk\.\s*/g, 'lakkoofsa ')
    .replace(/\bK\.?\s*(\d+)/gi, 'keeyyata $1')
    .replace(/\bA\.?\s*(\d+)/gi, 'anqaxa $1')
    .replace(/\bSDFHH\b/gi, 'Seera Deemsa Falmii Hariiroo Hawaasaa')
    .replace(/\bSDFY\b/gi, 'Seera Deemsa Falmii Yakkaa')
    .replace(/\bSHH\b/gi, 'Seera Hariiroo Hawaasaa')
    .replace(/\bRDFI\b/gi, 'Rippaabiliika Dimokiraatawaa Federaalawaa Itoophiyaa')
    .replace(/\bMMWF\b/gi, 'Mana Murtii Waliigala Federaalaa')
    .replace(/\bMMO\b/gi, 'Mana Murtii Olaanaa')
    .replace(/\bMMJ\b/gi, 'Mana Murtii Jalqabaa')
    .replace(/\bDARA\b/gi, 'Ejensii Galmeessa fi Mirkaneessa Sanadootaa')
    .replace(/\bETB\b/gi, 'Birrii Itoophiyaa')
    .replace(/\bBirr\b/gi, 'Birrii')
    .replace(/\bB\b/gi, 'Birrii')
    .replace(/\bNo\.?\s*(\d+)/gi, 'lakkoofsa $1')
    .replace(/\bFkn\.?\b/gi, 'Fakkeenyaaf')
    .replace(/\bk\.k\.f\.?\b/gi, 'fi kan kana fakkaatan');

  // 2. Expand statutory years and slashes (e.g. 1156/2011, 151/2005, 130/1999)
  processed = processed
    .replace(/(\d+)\/(\d{4})/g, '$1 bara $2')
    .replace(/(\d+)\/(\d{2,3})/g, '$1 lakk $2');

  // 3. Phonetic cadence & glottal stop / hudhaa pacing for natural Oromo pronunciation
  processed = processed
    .replace(/([aeiou])'([aeiou])/gi, '$1 , $2') // micro pause at glottal stop
    .replace(/\s*([;:])\s*/g, ', ')
    .replace(/\s*([–—])\s*/g, ', ');

  return processed.trim();
}

/**
 * Finds the most phonetically accurate voice for Afaan Oromoo, Amharic, and English legal reading
 * respecting user-configured voice profile preferences (Gender, Age, Tone).
 */
export function getBestPhoneticVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) return null;

  const settings = getUserSettings();
  const gender = settings.ttsVoiceGender || 'male';

  // 1. Find voice matching user's gender preference
  const genderVoice = voices.find(v => {
    const name = v.name.toLowerCase();
    if (gender === 'female') {
      return name.includes('female') || name.includes('zira') || name.includes('sara') || name.includes('helena') || name.includes('catherine');
    } else {
      return name.includes('male') || name.includes('david') || name.includes('george') || name.includes('mark') || name.includes('daniel') || name.includes('gregory') || name.includes('guy') || name.includes('alex');
    }
  });
  if (genderVoice) return genderVoice;

  // 2. Direct Oromo voice if available on system
  const oromoVoice = voices.find(v => 
    v.lang.toLowerCase().startsWith('om') || 
    v.name.toLowerCase().includes('oromo')
  );
  if (oromoVoice) return oromoVoice;

  // 3. Swahili (East African phonetics matching Cushitic rhythm & pure 5-vowel system)
  const swahiliVoice = voices.find(v => 
    v.lang.toLowerCase().startsWith('sw') || 
    v.name.toLowerCase().includes('swahili')
  );
  if (swahiliVoice) return swahiliVoice;

  // 4. Italian or Spanish (exact pure vowel system: a, e, i, o, u)
  const pureVowelVoice = voices.find(v => 
    v.lang.toLowerCase().startsWith('it') || 
    v.lang.toLowerCase().startsWith('es')
  );
  if (pureVowelVoice) return pureVowelVoice;

  // 5. Fallback to default or first available voice
  return voices.find(v => v.default) || voices[0] || null;
}

// Global active utterance reference so only one audio plays at a time
let currentActiveUtterance: SpeechSynthesisUtterance | null = null;

export function stopOromoSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentActiveUtterance = null;
  }
}

export function playOromoSpeech(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (e: any) => void;
  }
): { cancel: () => void } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported');
    options?.onError?.(new Error('SpeechSynthesis not supported'));
    return { cancel: () => {} };
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const normalized = normalizeOromoForSpeech(text);
  if (!normalized) {
    return { cancel: () => {} };
  }

  const utterance = new SpeechSynthesisUtterance(normalized);
  const voice = getBestPhoneticVoice(synth);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'om-ET';
  }

  const settings = getUserSettings();
  let basePitch = settings.ttsVoiceGender === 'female' ? 1.05 : 0.86;
  let baseRate = settings.ttsRate ?? 0.90;

  // Age profile adjustments
  if (settings.ttsVoiceAge === 'older') {
    basePitch -= 0.05;
    baseRate -= 0.04;
  } else if (settings.ttsVoiceAge === 'young') {
    basePitch += 0.06;
    baseRate += 0.04;
  }

  // Tone adjustments
  if (settings.ttsTone === 'calm') {
    baseRate -= 0.04;
  } else if (settings.ttsTone === 'formal') {
    baseRate -= 0.02;
  } else if (settings.ttsTone === 'warm') {
    basePitch += 0.03;
  }

  utterance.rate = options?.rate ?? baseRate;
  utterance.pitch = options?.pitch ?? basePitch;

  utterance.onstart = () => {
    currentActiveUtterance = utterance;
    options?.onStart?.();
  };

  utterance.onend = () => {
    currentActiveUtterance = null;
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    currentActiveUtterance = null;
    options?.onError?.(e);
  };

  synth.speak(utterance);

  return {
    cancel: () => {
      synth.cancel();
      currentActiveUtterance = null;
      options?.onEnd?.();
    }
  };
}
