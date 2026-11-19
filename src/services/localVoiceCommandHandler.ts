/**
 * Local Voice Command Handler (Web Speech API Offline Fallback)
 * 
 * Provides instantaneous, client-side voice command execution using the Web Speech API
 * when the server-side transcription service is unavailable or when working offline.
 * 
 * Supported offline voice commands:
 * - "Save draft" / "Wixinee olkaayi" / "ረቂቅ አስቀምጥ"
 * - "Search Cassation" / "Murtii Ijibbaataa barbaadi" / "የሰበር ውሳኔ ፈልግ"
 * - "Create document" / "Waliigaltee uumi" / "አዲስ ሰነድ አዘጋጅ"
 * - "Courtroom Assistant" / "Dhaddacha Mana Murtii" / "የፍርድ ቤት ስራ"
 * - "Explain Law" / "Ibsa Seeraa" / "ሕግ አብራራ"
 * - "Legal Translation" / "Hiika Seeraa" / "የሕግ ትርጉም"
 * - "Clear text" / "Barruu haqi" / "ጽሑፉን አጽዳ"
 * - "Settings" / "Qindaa'ina" / "ቅንብሮች"
 */

import { Language } from '../i18n/translations';

export interface LocalVoiceCommandResult {
  matched: boolean;
  commandType: 
    | 'SAVE_DRAFT' 
    | 'SEARCH_CASSATION' 
    | 'CREATE_DOCUMENT' 
    | 'COURTROOM_ASSISTANT' 
    | 'EXPLAIN_LAW' 
    | 'LEGAL_TRANSLATION' 
    | 'CLEAR_TEXT' 
    | 'NAVIGATE_HOME' 
    | 'SETTINGS'
    | 'UNKNOWN';
  rawInput: string;
  matchedPhrase?: string;
  feedbackMessage: {
    om: string;
    am: string;
    en: string;
  };
  extractedQuery?: string;
  offlineFallback: boolean;
}

export interface VoiceCommandExecutionContext {
  onNavigateTab?: (tab: string, query?: string) => void;
  onSaveDraft?: () => void;
  onClearText?: () => void;
  currentLang?: Language;
}

/**
 * Normalizes speech text for robust fuzzy matching across Oromo dialects,
 * Amharic script, and English phonetics.
 */
export function normalizeCommandText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates spoken transcript against known legal command patterns.
 */
export function matchLocalVoiceCommand(
  rawTranscript: string,
  isOfflineMode: boolean = false
): LocalVoiceCommandResult {
  const norm = normalizeCommandText(rawTranscript);

  // 1. SAVE DRAFT (Critical Command)
  // Matches: "save draft", "save document", "save file", "save work", "wixinee olkaayi",
  // "wixinee kuusi", "sanada kuusi", "olkaayi", "ረቂቅ አስቀምጥ", "ሰነድ አስቀምጥ"
  const isSaveCommand =
    /\b(?:save draft|save document|save file|save work|save my draft|save note)\b/i.test(norm) ||
    /\b(?:wixinee olkaayi|wixinee kuusi|sanada kuusi|sanada olkaayi|galmee kuusi|olkaayi wixinee|wixinee galmeessi)\b/i.test(norm) ||
    /(?:ረቂቅ አስቀምጥ|ሰነድ አስቀምጥ|ረቂቁን አስቀምጥ|ረቂቅ መዝግብ|መዝግብ|አስቀምጥ)/.test(norm) ||
    norm === 'save' ||
    norm === 'olkaayi' ||
    norm === 'kuusi';

  if (isSaveCommand) {
    return {
      matched: true,
      commandType: 'SAVE_DRAFT',
      rawInput: rawTranscript,
      matchedPhrase: 'Save draft',
      feedbackMessage: {
        om: '⚡ [Offline Local Command]: Wixineen seeraan olkaawameera!',
        am: '⚡ [ከመስመር ውጭ የአካባቢ ትዕዛዝ]: ረቂቁ በተሳካ ሁኔታ ተቀምጧል!',
        en: '⚡ [Offline Local Command]: Draft saved successfully to local storage!',
      },
      offlineFallback: isOfflineMode,
    };
  }

  // 2. SEARCH CASSATION (Critical Command)
  // Matches: "search cassation", "find cassation", "cassation precedent", "search precedent",
  // "murtii ijibbaataa barbaadi", "dhaddacha ijoo barbaadi", "ijibbaata barbaadi", "የሰበር ውሳኔ ፈልግ"
  const isCassationCommand =
    /\b(?:search cassation|find cassation|cassation precedent|search precedent|cassation library|cassation search|find precedent)\b/i.test(norm) ||
    /\b(?:murtii ijibbaataa barbaadi|murtii ijibbaataa|dhaddacha ijoo|dhaddacha ijibbaataa|ijibbaata barbaadi|precedent barbaadi)\b/i.test(norm) ||
    /(?:የሰበር ውሳኔ ፈልግ|ሰበር ፈልግ|የሰበር መዝገብ ፈልግ|የሰበር ውሳኔዎች|ሰበር ሰሚ)/.test(norm);

  if (isCassationCommand) {
    // Extract optional search term after the command phrase
    let query = norm
      .replace(/seeraai|search|find|cassation|precedent|library|barbaadi|ilaali|murtii|ijibbaataa|dhaddacha|ijoo|የሰበር|ውሳኔ|ፈልግ/gi, '')
      .trim();

    return {
      matched: true,
      commandType: 'SEARCH_CASSATION',
      rawInput: rawTranscript,
      matchedPhrase: 'Search Cassation',
      extractedQuery: query || undefined,
      feedbackMessage: {
        om: query ? `⚡ [Offline Local]: Murtii Ijibbaataa "${query}" barbaadaa jira...` : '⚡ [Offline Local]: Gara Kuusaa Murtii Ijibbaataatti dabarsaa jira...',
        am: query ? `⚡ [ከመስመር ውጭ]: የሰበር ውሳኔ "${query}" በመፈለግ ላይ...` : '⚡ [ከመስመር ውጭ]: ወደ ሰበር ውሳኔዎች ማውጫ በመሄድ ላይ...',
        en: query ? `⚡ [Offline Local]: Searching Cassation for "${query}"...` : '⚡ [Offline Local]: Navigating to Cassation Precedent Library...',
      },
      offlineFallback: isOfflineMode,
    };
  }

  // 3. CREATE DOCUMENT / DRAFTING
  const isCreateCommand =
    /\b(?:create document|draft document|new contract|draft contract|create contract|document drafting)\b/i.test(norm) ||
    /\b(?:waliigaltee uumi|wixinee uumi|sanada barreessi|sanada qopheessi|waliigaltee haaraa)\b/i.test(norm) ||
    /(?:አዲስ ሰነድ|ውል አዘጋጅ|ሰነድ አዘጋጅ|ረቂቅ አዘጋጅ|ውል ጻፍ)/.test(norm);

  if (isCreateCommand) {
    return {
      matched: true,
      commandType: 'CREATE_DOCUMENT',
      rawInput: rawTranscript,
      matchedPhrase: 'Create document',
      feedbackMessage: {
        om: '⚡ [Offline Local]: Gara Qopheessa Sanadaatti dabarsaa jira...',
        am: '⚡ [ከመስመር ውጭ]: ወደ ሰነድ ማዘጋጃ ክፍል በመሄድ ላይ...',
        en: '⚡ [Offline Local]: Navigating to Document Creation & Drafting...',
      },
      offlineFallback: isOfflineMode,
    };
  }

  // 4. COURTROOM ASSISTANT / BENCH WORKBENCH
  const isCourtroomCommand =
    /\b(?:courtroom assistant|court assistant|court session|court work|bench session|case docket|case milestone)\b/i.test(norm) ||
    /\b(?:dhaddacha mana murtii|mana murtii|hojii dhaddachaa|dhaddacha|galmee mana murtii)\b/i.test(norm) ||
    /(?:የፍርድ ቤት ስራ|ችሎት|የፍርድ ቤት ረዳት|መዝገብ)/.test(norm);

  if (isCourtroomCommand) {
    return {
      matched: true,
      commandType: 'COURTROOM_ASSISTANT',
      rawInput: rawTranscript,
      matchedPhrase: 'Courtroom Assistant',
      feedbackMessage: {
        om: '⚡ [Offline Local]: Gara Dhaddacha Mana Murtiitti dabarsaa jira...',
        am: '⚡ [ከመስመር ውጭ]: ወደ ፍርድ ቤት ችሎት ረዳት በመሄድ ላይ...',
        en: '⚡ [Offline Local]: Navigating to Courtroom Assistant & Milestone Tracker...',
      },
      offlineFallback: isOfflineMode,
    };
  }

  // 5. EXPLAIN LAW
  const isExplainCommand =
    /\b(?:explain law|legal explanation|statute explain|article explain|constitution)\b/i.test(norm) ||
    /\b(?:ibsa seeraa|seera ibsi|heera mootummaa|keeyyata ibsi)\b/i.test(norm) ||
    /(?:ሕግ አብራራ|የሕግ ማብራሪያ|ሕገ መንግሥት)/.test(norm);

  if (isExplainCommand) {
    return {
      matched: true,
      commandType: 'EXPLAIN_LAW',
      rawInput: rawTranscript,
      matchedPhrase: 'Explain Law',
      feedbackMessage: {
        om: '⚡ [Offline Local]: Gara Ibsa Seeraatti dabarsaa jira...',
        am: '⚡ [ከመስመር ውጭ]: ወደ ሕግ ማብራሪያ በመሄድ ላይ...',
        en: '⚡ [Offline Local]: Navigating to Explain Law...',
      },
      offlineFallback: isOfflineMode,
    };
  }

  // 6. LEGAL TRANSLATION
  const isTranslateCommand =
    /\b(?:translate|legal translation|translate text|translate law)\b/i.test(norm) ||
    /\b(?:hiika seeraa|gara afaan|hiiki)\b/i.test(norm) ||
    /(?:ተርጉም|የሕግ ትርጉም|ትርጉም)/.test(norm);

  if (isTranslateCommand) {
    return {
      matched: true,
      commandType: 'LEGAL_TRANSLATION',
      rawInput: rawTranscript,
      matchedPhrase: 'Legal Translation',
      feedbackMessage: {
        om: '⚡ [Offline Local]: Gara Hiika Seeraatti dabarsaa jira...',
        am: '⚡ [ከመስመር ውጭ]: ወደ ሕግ ትርጉም ክፍል በመሄድ ላይ...',
        en: '⚡ [Offline Local]: Navigating to Legal Translation...',
      },
      offlineFallback: isOfflineMode,
    };
  }

  // 7. CLEAR TEXT
  const isClearCommand =
    /\b(?:clear text|clear draft|erase text|delete text|start over)\b/i.test(norm) ||
    /\b(?:barruu haqi|haqi|wixinee haqi|qulqulleessi)\b/i.test(norm) ||
    /(?:ጽሑፉን አጽዳ|አጽዳ|ሰርዝ|እንደገና ጀምር)/.test(norm);

  if (isClearCommand) {
    return {
      matched: true,
      commandType: 'CLEAR_TEXT',
      rawInput: rawTranscript,
      matchedPhrase: 'Clear text',
      feedbackMessage: {
        om: '⚡ [Offline Local]: Barruun qulqulleeffameera.',
        am: '⚡ [ከመስመር ውጭ]: ጽሑፉ ጸድቷል።',
        en: '⚡ [Offline Local]: Text draft cleared.',
      },
      offlineFallback: isOfflineMode,
    };
  }

  // 8. HOME DASHBOARD
  const isHomeCommand =
    /\b(?:go home|home dashboard|main menu|start screen)\b/i.test(norm) ||
    /\b(?:gara fuula duraa|fuula duraa|gara mana|manatti deebi'i)\b/i.test(norm) ||
    /(?:ወደ ዋና ገጽ|ዋና ገጽ|መነሻ)/.test(norm);

  if (isHomeCommand) {
    return {
      matched: true,
      commandType: 'NAVIGATE_HOME',
      rawInput: rawTranscript,
      matchedPhrase: 'Home',
      feedbackMessage: {
        om: '⚡ [Offline Local]: Gara Fuula Duraatti deebi\'aa jira...',
        am: '⚡ [ከመስመር ውጭ]: ወደ ዋና ገጽ በመመለስ ላይ...',
        en: '⚡ [Offline Local]: Returning to Home Dashboard...',
      },
      offlineFallback: isOfflineMode,
    };
  }

  // 9. SETTINGS
  const isSettingsCommand =
    /\b(?:settings|user settings|configuration|preferences)\b/i.test(norm) ||
    /\b(?:qindaa'ina|qindeessuu|filannoo)\b/i.test(norm) ||
    /(?:ቅንብሮች|ቅንብር|ማስተካከያ)/.test(norm);

  if (isSettingsCommand) {
    return {
      matched: true,
      commandType: 'SETTINGS',
      rawInput: rawTranscript,
      matchedPhrase: 'Settings',
      feedbackMessage: {
        om: '⚡ [Offline Local]: Gara Qindaa\'inaatti dabarsaa jira...',
        am: '⚡ [ከመስመር ውጭ]: ወደ ቅንብሮች በመሄድ ላይ...',
        en: '⚡ [Offline Local]: Navigating to Settings...',
      },
      offlineFallback: isOfflineMode,
    };
  }

  return {
    matched: false,
    commandType: 'UNKNOWN',
    rawInput: rawTranscript,
    feedbackMessage: {
      om: `Ajajni hin baramne: "${rawTranscript}"`,
      am: `ያልታወቀ ትዕዛዝ: "${rawTranscript}"`,
      en: `Unrecognized command: "${rawTranscript}"`,
    },
    offlineFallback: isOfflineMode,
  };
}

/**
 * Executes a matched local voice command with UI feedback and dispatches necessary events.
 */
export function executeLocalVoiceCommand(
  rawTranscript: string,
  context: VoiceCommandExecutionContext = {}
): LocalVoiceCommandResult {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const result = matchLocalVoiceCommand(rawTranscript, isOffline);

  if (!result.matched) return result;

  switch (result.commandType) {
    case 'SAVE_DRAFT':
      // 1. Dispatch global custom event that active views (CreateView, DocumentTemplatesView, etc.) listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('seera:save_current_document', {
            detail: { source: 'local_voice_command', timestamp: new Date().toISOString() },
          })
        );
      }
      // 2. Call direct callback if provided
      if (context.onSaveDraft) {
        context.onSaveDraft();
      }
      break;

    case 'SEARCH_CASSATION':
      if (context.onNavigateTab) {
        context.onNavigateTab('cassation', result.extractedQuery);
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('seera:navigate_tab', {
            detail: { tab: 'cassation', query: result.extractedQuery },
          })
        );
      }
      break;

    case 'CREATE_DOCUMENT':
      if (context.onNavigateTab) {
        context.onNavigateTab('create');
      }
      break;

    case 'COURTROOM_ASSISTANT':
      if (context.onNavigateTab) {
        context.onNavigateTab('courtWork');
      }
      break;

    case 'EXPLAIN_LAW':
      if (context.onNavigateTab) {
        context.onNavigateTab('explainLaw');
      }
      break;

    case 'LEGAL_TRANSLATION':
      if (context.onNavigateTab) {
        context.onNavigateTab('translate');
      }
      break;

    case 'CLEAR_TEXT':
      if (context.onClearText) {
        context.onClearText();
      }
      break;

    case 'NAVIGATE_HOME':
      if (context.onNavigateTab) {
        context.onNavigateTab('home');
      }
      break;

    case 'SETTINGS':
      if (context.onNavigateTab) {
        context.onNavigateTab('settings');
      }
      break;
  }

  // Dispatch toast notification for local command execution
  if (typeof window !== 'undefined') {
    const lang = context.currentLang || 'om';
    const message = result.feedbackMessage[lang] || result.feedbackMessage.om;
    window.dispatchEvent(
      new CustomEvent('seera:show_toast', {
        detail: {
          message,
          type: 'success',
          emoji: '🎙️',
          duration: 3500,
        },
      })
    );
  }

  return result;
}
