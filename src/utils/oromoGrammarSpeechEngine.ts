/**
 * Oromo Grammar & Legal Phonetics Speech Engine
 * (Sirna Dubbisa fi Seerluga Afaan Oromoo)
 *
 * Provides:
 * 1. Legal & grammatical abbreviation expansion into full formal Afaan Oromoo.
 * 2. Complete numbers, dates, currency, and percentages to Afaan Oromoo converter.
 * 3. Glottal stop (hudhaa - ') and consonant gemination cadence normalization.
 * 4. Dual-mode synthesis: Native Neural AI Voice (Gemini TTS) + fallback Web Speech API with Oromo phonetics.
 */

// Basic Afaan Oromoo number words
const ONES: Record<number, string> = {
  0: 'duudaa',
  1: 'tokko',
  2: 'lama',
  3: 'sadii',
  4: 'afur',
  5: 'shan',
  6: "ja'a",
  7: 'torba',
  8: 'saddeet',
  9: 'sagal',
};

const TEENS: Record<number, string> = {
  10: 'kudhan',
  11: 'kudha tokko',
  12: 'kudha lama',
  13: 'kudha sadii',
  14: 'kudha afur',
  15: 'kudha shan',
  16: "kudha ja'a",
  17: 'kudha torba',
  18: 'kudha saddeet',
  19: 'kudha sagal',
};

const TENS: Record<number, string> = {
  20: 'digdama',
  30: 'soddoma',
  40: 'afurtama',
  50: 'shantama',
  60: 'jaatama',
  70: 'torbaatama',
  80: 'saddeettama',
  90: 'sagaltama',
};

const TENS_PREFIX: Record<number, string> = {
  20: 'digdamii',
  30: 'soddomii',
  40: 'afurtamii',
  50: 'shantamii',
  60: 'jaatamii',
  70: 'torbaatamii',
  80: 'saddeettamii',
  90: 'sagaltamii',
};

/**
 * Converts a positive integer (up to billions) into formal spoken Afaan Oromoo.
 */
export function numberToOromoWords(num: number): string {
  if (isNaN(num)) return '';
  num = Math.floor(Math.abs(num));
  if (num === 0) return 'duudaa';

  if (num < 10) return ONES[num];
  if (num < 20) return TEENS[num];

  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const remainder = num % 10;
    if (remainder === 0) return TENS[tens];
    return `${TENS_PREFIX[tens]} ${ONES[remainder]}`;
  }

  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const hundredsStr = hundreds === 1 ? 'dhibba tokko' : `dhibba ${ONES[hundreds]}`;
    if (remainder === 0) return hundredsStr;
    return `${hundredsStr} fi ${numberToOromoWords(remainder)}`;
  }

  if (num < 1000000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    const thousandsStr = thousands === 1 ? 'kuma tokko' : `kuma ${numberToOromoWords(thousands)}`;
    if (remainder === 0) return thousandsStr;
    return `${thousandsStr} fi ${numberToOromoWords(remainder)}`;
  }

  if (num < 1000000000) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    const millionsStr = millions === 1 ? 'miliyoona tokko' : `miliyoona ${numberToOromoWords(millions)}`;
    if (remainder === 0) return millionsStr;
    return `${millionsStr} fi ${numberToOromoWords(remainder)}`;
  }

  const billions = Math.floor(num / 1000000000);
  const remainder = num % 1000000000;
  const billionsStr = billions === 1 ? 'biliyoona tokko' : `biliyoona ${numberToOromoWords(billions)}`;
  if (remainder === 0) return billionsStr;
  return `${billionsStr} fi ${numberToOromoWords(remainder)}`;
}

/**
 * Expands all standard Ethiopian legal citations and abbreviations into formal spoken Afaan Oromoo.
 */
export function expandOromoLegalAbbreviations(text: string): string {
  let res = text;

  // 1. Article / Keeyyata with number: e.g. "K. 27", "K/27", "Keeyy. 43"
  res = res.replace(/\b(?:K\.|K\/|Keeyy\.)\s*(\d+)/gi, (_m, p1) => {
    return `Keeyyata ${numberToOromoWords(parseInt(p1, 10))}`;
  });

  // 2. Proclamation / Labsii citation: e.g. "Labsii 1156/2019" -> "Labsii lakkoofsa ... bara ..."
  res = res.replace(/\b(?:Labsii|L\.)\s*(?:lakk\.\s*)?(\d+)\/(\d{4})\b/gi, (_m, procNum, year) => {
    const pStr = numberToOromoWords(parseInt(procNum, 10));
    const yStr = numberToOromoWords(parseInt(year, 10));
    return `Labsii lakkoofsa ${pStr} bara ${yStr}`;
  });

  // 3. Proclamation number: e.g. "Lakk. 1243/2021"
  res = res.replace(/\bLakk\.\s*(\d+)\/(\d{4})\b/gi, (_m, procNum, year) => {
    return `Lakkoofsa ${numberToOromoWords(parseInt(procNum, 10))} bara ${numberToOromoWords(parseInt(year, 10))}`;
  });

  // 4. Standalone Lakk.: e.g. "Lakk. 45" -> "Lakkoofsa 45"
  res = res.replace(/\bLakk\.\s*(\d+)/gi, (_m, p1) => {
    return `Lakkoofsa ${numberToOromoWords(parseInt(p1, 10))}`;
  });

  // 5. Standard Institutional & Court acronyms
  res = res.replace(/\bM\/M\/W\b/g, 'Mana Murtii Waliigalaa');
  res = res.replace(/\bM\/M\/O\b/g, 'Mana Murtii Olaanaa');
  res = res.replace(/\bM\/M\/J\b/g, 'Mana Murtii Jalqabaa');
  res = res.replace(/\bM\/M\b/g, 'Mana Murtii');
  res = res.replace(/\bW\.M\.\b/g, 'Waliigaltee');
  res = res.replace(/\bFkn\.\b|\bFk\.\b/gi, 'Fakkeenyaaf,');
  res = res.replace(/\bk\.k\.f\.?\b/gi, 'fi kan kana fakkaatan');
  res = res.replace(/\bD\.I\.\b/g, 'Dhaddacha Ijibbaataa');
  res = res.replace(/\bB\.Q\.\b/g, 'Birrii Qulqulluu');
  res = res.replace(/\bK\.S\.\b/g, 'Koodii Siiviilii');
  res = res.replace(/\bK\.Y\.\b/g, 'Koodii Yakkaa');
  res = res.replace(/\bK\.D\.\b/g, 'Koodii Daldalaa');
  res = res.replace(/\bA\.D\.\b/g, 'Akkasumas');
  res = res.replace(/\bDARA\b/g, 'D-A-R-A, Ejensii Galmeessa fi Mirkaneessa Sanadootaa');
  res = res.replace(/\bRDFI\b/g, 'Rippaabiliika Dimokiraatawaa Federaalawaa Itoophiyaa');

  // 6. Currency & Units
  res = res.replace(/\b(?:ETB|Birr)\s*([\d,]+)/gi, (_m, amt) => {
    const cleanAmt = amt.replace(/,/g, '');
    const num = parseInt(cleanAmt, 10);
    return isNaN(num) ? 'Birrii' : `Birrii ${numberToOromoWords(num)}`;
  });
  res = res.replace(/([\d,]+)\s*(?:ETB|Birr)\b/gi, (_m, amt) => {
    const cleanAmt = amt.replace(/,/g, '');
    const num = parseInt(cleanAmt, 10);
    return isNaN(num) ? 'Birrii' : `${numberToOromoWords(num)} Birrii`;
  });

  // 7. Percentage %
  res = res.replace(/(\d+)\s*%/g, (_m, p1) => {
    return `parsantii ${numberToOromoWords(parseInt(p1, 10))}`;
  });

  return res;
}

/**
 * Normalizes numbers inside text so that isolated numbers and years are spoken in Afaan Oromoo.
 */
export function convertNumbersToOromoWords(text: string): string {
  // Convert isolated 4-digit years like 2019, 2021, 2024
  let res = text.replace(/\b(19\d{2}|20\d{2})\b/g, (match) => {
    return numberToOromoWords(parseInt(match, 10));
  });

  // Convert numbers with commas like 30,000 or 150,000
  res = res.replace(/\b\d{1,3}(?:,\d{3})+\b/g, (match) => {
    const raw = match.replace(/,/g, '');
    return numberToOromoWords(parseInt(raw, 10));
  });

  // Convert remaining standalone numbers (up to 6 digits)
  res = res.replace(/\b\d{1,6}\b/g, (match) => {
    const n = parseInt(match, 10);
    if (!isNaN(n) && n <= 999999) {
      return numberToOromoWords(n);
    }
    return match;
  });

  return res;
}

/**
 * Normalizes Afaan Oromoo orthography, legal cadences, and pauses.
 */
export function prepareOromoTextForSpeech(
  rawText: string,
  options: { expandNumbers?: boolean; expandAbbreviations?: boolean } = { expandNumbers: true, expandAbbreviations: true }
): string {
  if (!rawText) return '';

  // 1. Clean markdown formatting, URLs, code blocks, hashes
  let cleaned = rawText
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^[#=]+\s*/gm, '') // Markdown headings
    .replace(/[*_~`]/g, '')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");

  // 2. Expand Legal Abbreviations
  if (options.expandAbbreviations !== false) {
    cleaned = expandOromoLegalAbbreviations(cleaned);
  }

  // 3. Convert numbers to Afaan Oromoo words
  if (options.expandNumbers !== false) {
    cleaned = convertNumbersToOromoWords(cleaned);
  }

  // 4. Cadence normalization: add natural micro-pauses at common Oromo transitional phrases
  const transitionPhrases = [
    { from: /\bBu'uura Keeyyata\b/gi, to: "Bu'uura Keeyyata" },
    { from: /\bHaala kanaan\b/gi, to: 'Haala kanaan,' },
    { from: /\bHaa ta'u malee\b/gi, to: "Haa ta'u malee," },
    { from: /\bKana malees\b/gi, to: 'Kana malees,' },
    { from: /\bWalumaagalatti\b/gi, to: 'Walumaagalatti,' },
    { from: /\bAkka seeraatti\b/gi, to: 'Akka seeraatti,' },
  ];

  for (const item of transitionPhrases) {
    cleaned = cleaned.replace(item.from, item.to);
  }

  // 5. Clean excessive spaces and newlines
  cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Searches the browser's speechSynthesis voices for the most phonetically compatible voice.
 * Order of preference:
 * 1. Native Oromo ('om', 'om-ET')
 * 2. Swahili ('sw', 'sw-KE') - shares exact 5-vowel phonology and East African accent cadence
 * 3. Italian ('it-IT') / Spanish ('es-ES') - identical pure vowels (a, e, i, o, u)
 * 4. Default high-quality English voice
 */
export function findBestWebSpeechVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. Direct Oromo or Amharic match
  const nativeVoice = voices.find(
    (v) => v.lang.toLowerCase().startsWith('om') || v.lang.toLowerCase().startsWith('am') || v.name.toLowerCase().includes('oromo') || v.name.toLowerCase().includes('amharic')
  );
  if (nativeVoice) return nativeVoice;

  // 2. Swahili match
  const swahiliVoice = voices.find(
    (v) => v.lang.toLowerCase().startsWith('sw') || v.name.toLowerCase().includes('swahili')
  );
  if (swahiliVoice) return swahiliVoice;

  // 3. Default system voice or first available
  return voices.find((v) => v.default) || voices[0] || null;
}

export type OromoVoiceType = 'zephyr' | 'fenrir' | 'aoede' | 'charon' | 'kore' | 'webspeech';

export interface OromoSpeechOptions {
  voice?: OromoVoiceType;
  speed?: number; // 0.85, 1.0, 1.2
  preferAiVoice?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onProgress?: (progress: number) => void;
}

export interface OromoAudioController {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isPaused: () => boolean;
  isPlaying: () => boolean;
}

// In-memory audio blob cache to avoid repeated network calls
const audioCache = new Map<string, string>();

/**
 * Main function to read Afaan Oromoo text aloud with grammar awareness.
 */
export async function playOromoSpeech(
  rawText: string,
  options: OromoSpeechOptions = {}
): Promise<OromoAudioController> {
  const preparedText = prepareOromoTextForSpeech(rawText);
  if (!preparedText.trim()) {
    throw new Error('Barreeffamni dubbifamu hin jiru (No text to read)');
  }

  const voiceType = options.voice || 'zephyr';
  const speed = options.speed || 1.0;
  const preferAi = options.preferAiVoice !== false && voiceType !== 'webspeech';

  let currentAudio: HTMLAudioElement | null = null;
  let isStopped = false;
  let isPausedState = false;

  const controller: OromoAudioController = {
    pause: () => {
      if (currentAudio) {
        currentAudio.pause();
        isPausedState = true;
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
        isPausedState = true;
      }
    },
    resume: () => {
      if (currentAudio) {
        currentAudio.play();
        isPausedState = false;
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
        isPausedState = false;
      }
    },
    stop: () => {
      isStopped = true;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      isPausedState = false;
    },
    isPaused: () => isPausedState,
    isPlaying: () => {
      if (currentAudio) return !currentAudio.paused && !currentAudio.ended;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        return window.speechSynthesis.speaking && !window.speechSynthesis.paused;
      }
      return false;
    },
  };

  // 1. Try AI Neural Voice if preferred
  if (preferAi && typeof fetch !== 'undefined') {
    try {
      const cacheKey = `${voiceType}_${speed}_${preparedText.slice(0, 150)}_${preparedText.length}`;
      let audioUrl = audioCache.get(cacheKey);

      if (!audioUrl) {
        const geminiVoiceMap: Record<string, string> = {
          zephyr: 'Zephyr',
          fenrir: 'Fenrir',
          aoede: 'Aoede',
          charon: 'Charon',
          kore: 'Kore',
        };
        const voiceName = geminiVoiceMap[voiceType] || 'Zephyr';

        const res = await fetch('/api/tts/oromo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: preparedText,
            voiceName,
            speed,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.audioData) {
            audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioData}`;
            audioCache.set(cacheKey, audioUrl);
          }
        }
      }

      if (audioUrl && !isStopped) {
        const audio = new Audio(audioUrl);
        currentAudio = audio;
        audio.playbackRate = speed;

        audio.onplay = () => {
          isPausedState = false;
          options.onStart?.();
        };

        audio.onended = () => {
          options.onEnd?.();
        };

        audio.onerror = (e) => {
          console.warn('Audio playback error, falling back to Web Speech:', e);
          fallbackWebSpeech();
        };

        await audio.play();
        return controller;
      }
    } catch (err) {
      console.warn('Neural voice API not reachable or quota exceeded, seamlessly using Web Speech engine:', err);
    }
  }

  // 2. Seamless Fallback: Intelligent Web Speech Synthesis with Oromo Phonetics
  function fallbackWebSpeech() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options.onError?.('Sirna dubbisuu (Speech Synthesis) meeshaa keessan irratti hin deeggaramne.');
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(preparedText);
      utterance.rate = Math.max(0.75, Math.min(1.4, speed * 0.92));
      utterance.pitch = voiceType === 'aoede' || voiceType === 'kore' ? 1.15 : 0.95;

      const voices = synth.getVoices();
      const bestVoice = findBestWebSpeechVoice(voices);
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      } else {
        utterance.lang = 'en-US';
      }

      utterance.onstart = () => {
        isPausedState = false;
        options.onStart?.();
      };

      utterance.onend = () => {
        options.onEnd?.();
      };

      utterance.onerror = (err) => {
        options.onError?.(err);
      };

      synth.speak(utterance);
    };

    const voices = synth.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null;
        doSpeak();
      };
      setTimeout(() => {
        doSpeak();
      }, 300);
    }
  }

  if (!isStopped) {
    fallbackWebSpeech();
  }

  return controller;
}
