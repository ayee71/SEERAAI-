import { getAnalytics, logEvent, isSupported, Analytics } from 'firebase/analytics';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

let analytics: Analytics | null = null;

// Initialize analytics safely without triggering uncaught background network fetches when offline
async function initAnalytics() {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const supported = await isSupported().catch(() => false);
      if (supported && firebaseConfig && (firebaseConfig as any).measurementId) {
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        analytics = getAnalytics(app);
        console.log('Firebase Analytics initialized');
      }
    } catch {
      analytics = null;
    }
  }
}

initAnalytics();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => initAnalytics());
}

export const trackEvent = (eventName: string, eventParams?: { [key: string]: any }) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
    } catch {
      // Ignore network errors in analytics
    }
  }
  
  // Also log to console in dev for verification
  if (import.meta.env.DEV) {
    console.log(`[Analytics Event] ${eventName}:`, eventParams);
  }
};

// High-level tracking helpers for the legal platform
export const analyticsService = {
  // View tracking
  trackPageView: (pageName: string) => {
    trackEvent('page_view', { page_title: pageName });
  },

  // Legal interaction tracking
  trackLegalSearch: (query: string, category: string, resultsFound: number) => {
    trackEvent('legal_search', {
      search_term: query,
      legal_category: category,
      results_count: resultsFound
    });
  },

  trackDocumentCreation: (type: string, lang: string) => {
    trackEvent('document_created', {
      doc_type: type,
      language: lang
    });
  },

  trackTranslation: (sourceLang: string, targetLang: string) => {
    trackEvent('legal_translation', {
      source_language: sourceLang,
      target_language: targetLang
    });
  },

  trackCassationLookup: (fileNumber: string, volume?: number) => {
    trackEvent('cassation_lookup', {
      file_number: fileNumber,
      volume: volume || 'unknown'
    });
  },

  trackGlossaryTerm: (term: string) => {
    trackEvent('glossary_lookup', {
      term: term
    });
  }
};
