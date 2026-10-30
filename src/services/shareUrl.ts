import { Language } from '../i18n/translations';

export interface ShareableAppState {
  tab: string;
  lang?: Language;
  query?: string;
  category?: string;
  volume?: number | 'all';
  docId?: string;
  caseId?: string;
  creator?: string;
  v?: number; // schema version
}

export function getSavedCreatorName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('seera_ai_creator_name') || '';
}

export function saveCreatorName(name: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('seera_ai_creator_name', name);
  }
}

/**
 * Dynamically resolves the live working URL of the application.
 * If running on Cloud Run or in local preview, uses the live working domain (converting ais-dev- to ais-pre- for public access).
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    // If the host is not the placeholder custom domain that lacks DNS records, use it
    if (!origin.includes('saiethio.com')) {
      return origin;
    }
  }
  return 'https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app';
}

/**
 * Creates a clean personalized URL with the user's name e.g. ?by=Ayele
 * Ensures that it resolves to the live working app URL
 * so external Facebook, Telegram, WhatsApp, and mobile browsers load smoothly.
 */
export const PRIVATE_RESTRICTED_TABS = [
  'profile',
  'settings',
  'analytics',
  'analyticsFeedback',
  'feedback',
  'inbox',
  'hordoffii',
  'mycontent',
  'myContent',
  'pricing',
  'payment',
  'premiumDashboard',
  'admin',
  'sec',
  'owner',
];

export function sanitizeShareParam(val?: string | null, maxLen: number = 60): string | undefined {
  if (!val) return undefined;
  const clean = val.replace(/[<>"'&`]/g, '').trim();
  if (!clean) return undefined;
  return clean.slice(0, maxLen);
}

export function isRestrictedTab(tab?: string | null): boolean {
  if (!tab) return false;
  const clean = tab.toLowerCase().trim();
  return PRIVATE_RESTRICTED_TABS.some((t) => t.toLowerCase() === clean);
}

export function createPersonalizedUrl(creatorName?: string, tab: string = 'home', lang?: Language): string {
  const rawName = creatorName || getSavedCreatorName();
  const name = sanitizeShareParam(rawName, 40);
  const base = getAppBaseUrl();
  const params = new URLSearchParams();

  // Sanitize private tabs so shared URLs never open recipient into private profile/settings/admin pages
  const safeTab = (!tab || isRestrictedTab(tab)) ? 'home' : tab;

  if (name) params.set('by', name);
  if (safeTab && safeTab !== 'home') params.set('tab', safeTab);
  if (lang) params.set('lang', lang);

  const queryStr = params.toString();
  return queryStr ? `${base}/?${queryStr}` : `${base}/`;
}

/**
 * Encodes an application state object into a URL-safe Base64 string.
 * Handles full UTF-8 Unicode characters (Ethiopic text, Afaan Oromoo apostrophes, etc.).
 */
export function encodeShareableState(state: ShareableAppState): string {
  try {
    const payload = {
      ...state,
      v: 1,
    };
    const jsonStr = JSON.stringify(payload);
    const utf8Bytes = new TextEncoder().encode(jsonStr);

    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }

    // Convert to URL-safe Base64 (replace '+' with '-', '/' with '_', and strip '=')
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode shareable state', err);
    return '';
  }
}

/**
 * Decodes a URL-safe Base64 string back into a ShareableAppState object.
 */
export function decodeShareableState(encoded: string): ShareableAppState | null {
  try {
    if (!encoded || typeof encoded !== 'string') return null;

    // Restore standard Base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.tab === 'string') {
      return parsed as ShareableAppState;
    }
    return null;
  } catch (err) {
    console.warn('Failed to decode shareable state from URL', err);
    return null;
  }
}

/**
 * Creates the full shareable URL containing either clear parameters or encoded state.
 */
export function buildShareableFindingUrl(tab: string, query?: string, lang?: Language, creatorName?: string): string {
  const rawCreator = creatorName || getSavedCreatorName();
  const creator = sanitizeShareParam(rawCreator, 40);
  const base = getAppBaseUrl();
  
  const safeTab = (!tab || isRestrictedTab(tab)) ? 'home' : tab;

  const params = new URLSearchParams();
  if (creator) params.set('by', creator);
  if (safeTab && safeTab !== 'home') params.set('tab', safeTab);
  if (query && query.trim()) params.set('q', sanitizeShareParam(query.trim(), 200) || '');
  if (lang) params.set('lang', lang);

  const queryStr = params.toString();
  return queryStr ? `${base}/?${queryStr}` : `${base}/`;
}

/**
 * Creates the full shareable URL containing the base64-encoded state.
 */
export function createShareableUrl(state: ShareableAppState): string {
  if (state.query || state.tab) {
    return buildShareableFindingUrl(state.tab, state.query, state.lang, state.creator);
  }
  const code = encodeShareableState(state);
  const base = getAppBaseUrl();
  if (!code) return base;
  return `${base}/?s=${code}`;
}

/**
 * Reads and decodes shareable state from current window.location query parameter (?s= or ?by= or ?tab= or ?q=) or hash.
 */
export function readShareableStateFromUrl(): ShareableAppState | null {
  try {
    if (typeof window === 'undefined') return null;
    const url = new URL(window.location.href);
    const rawCreator = url.searchParams.get('by') || url.searchParams.get('creator') || url.searchParams.get('ref') || undefined;
    const creator = sanitizeShareParam(rawCreator, 40);
    let tabParam = url.searchParams.get('tab') || undefined;
    const langParam = (url.searchParams.get('lang') as Language) || undefined;
    const queryParam = sanitizeShareParam(url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('doc') || undefined, 200);
    const caseIdParam = url.searchParams.get('caseId') || url.searchParams.get('case');
    const code = url.searchParams.get('s') || url.searchParams.get('state');

    // Normalize tab aliases and direct meeting links for Chrome, Edge, Safari, and any browser
    const hasRoomParam = url.searchParams.get('room') || url.searchParams.get('meeting') || url.searchParams.get('meet') || url.searchParams.get('conference');
    if (hasRoomParam || tabParam === 'meeting' || tabParam === 'discussion') {
      tabParam = 'meeting';
    } else if (tabParam === 'analysis' || tabParam === 'document' || tabParam === 'doc') {
      tabParam = 'docAnalysis';
    } else if (tabParam === 'explain' || tabParam === 'law') {
      tabParam = 'explainLaw';
    } else if (tabParam === 'hordoffii' || tabParam === 'analytics' || tabParam === 'feedback' || tabParam === 'inbox' || tabParam === 'live') {
      tabParam = 'analyticsFeedback';
    } else if (tabParam === 'timeline' || tabParam === 'casetimeline' || tabParam === 'hordoffiibeellamaa') {
      tabParam = 'courtWork';
    }

    if (code) {
      const decoded = decodeShareableState(code);
      if (decoded) {
        if (creator) decoded.creator = creator;
        if (queryParam && !decoded.query) decoded.query = queryParam;
        if (langParam && !decoded.lang) decoded.lang = langParam;
        if (caseIdParam && !decoded.caseId) decoded.caseId = caseIdParam;
        return decoded;
      }
    }

    if (creator || tabParam || langParam || queryParam || caseIdParam) {
      return {
        tab: tabParam || 'home',
        lang: langParam,
        creator: creator,
        query: queryParam,
        caseId: caseIdParam || undefined,
      };
    }

    // Also check hash fallback e.g. #s=... or #state=...
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashCode = hashParams.get('s') || hashParams.get('state');
      const hashTab = hashParams.get('tab');
      const hashQ = hashParams.get('q') || hashParams.get('query');
      if (hashCode) {
        const decoded = decodeShareableState(hashCode);
        if (decoded) {
          if (!decoded.tab || isRestrictedTab(decoded.tab)) decoded.tab = 'home';
          if (creator) decoded.creator = creator;
          return decoded;
        }
      }
      if (hashTab || hashQ) {
        const safeTab = (!hashTab || isRestrictedTab(hashTab)) ? 'home' : hashTab;
        return {
          tab: safeTab === 'analysis' ? 'docAnalysis' : safeTab,
          query: sanitizeShareParam(hashQ, 200) || undefined,
          creator: creator,
          lang: langParam,
        };
      }
    }
    return null;
  } catch (e) {
    console.error('Error reading state from URL', e);
    return null;
  }
}

/**
 * Updates the browser address bar with clean readable parameters (?by=Ayele) without triggering a reload.
 */
export function syncBrowserUrlWithState(state: ShareableAppState, push: boolean = false): void {
  try {
    if (typeof window === 'undefined') return;
    // In restricted sandbox frames or inside AI Studio host, do not alter top window history
    if (window.self !== window.top || window.location.hostname.includes('aistudio.google.com')) {
      return;
    }

    const creator = state.creator || getSavedCreatorName();
    const params = new URLSearchParams();
    if (creator) params.set('by', creator);
    if (state.tab && state.tab !== 'home') params.set('tab', state.tab);
    if (state.query) params.set('q', state.query);
    if (state.caseId) params.set('caseId', state.caseId);

    const queryStr = params.toString();
    const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
    
    if (push) {
      window.history.pushState({ ...state }, '', newUrl);
    } else {
      window.history.replaceState({ ...state }, '', newUrl);
    }
  } catch (e) {
    // Ignore history API errors in restricted sandbox frames
  }
}
