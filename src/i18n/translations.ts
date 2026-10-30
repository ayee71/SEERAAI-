export type Language = 'om' | 'am' | 'en';

export interface TranslationDictionary {
  appName: string;
  appTagline: string;
  nav: {
    home: string;
    create: string;
    templates: string;
    explainLaw: string;
    translate: string;
    docAnalysis: string;
    cassation: string;
    social: string;
    glossary: string;
    compareLaw: string;
    myContent: string;
    myProjects: string;
    pricing: string;
    analyticsFeedback: string;
    integration: string;
    courtRecordAuditor: string;
    judicialTools: string;
    courtroomAssistant: string;
    courtWork: string;
    courtFirstInstance: string;
    courtHighCourt: string;
    courtSupreme: string;
    courtCassation: string;
    speechAndOcrConverter?: string;
    worldBizarreLaws?: string;
    settings: string;
  };
  courtroomTimer: {
    title: string;
    start: string;
    stop: string;
    reset: string;
    elapsed: string;
  };
  courtroomSession: {
    sessionTitle: string;
    managerTitle?: string;
    titlePlaceholder: string;
    saveSession: string;
    saving: string;
    savedSessions: string;
    newSession: string;
    noSessions: string;
    load: string;
    delete?: string;
    activeSession?: string;
    saved?: string;
  };
  courtroomControl: {
    title: string;
    linkPlaceholder: string;
    updateLink: string;
    activate: string;
    deactivate: string;
  };
  courtroomKiosk: {
    title: string;
    waiting: string;
    active: string;
  };
  courtroomHistory: {
    title: string;
    placeholder: string;
    addLog: string;
    empty: string;
    autoStep: string;
    manualEntry: string;
    exportSession: string;
  };
  courtroomVoice: {
    startListening: string;
    stopListening: string;
    listening: string;
    notSupported: string;
    error: string;
    objectionRecognized: string;
    voiceToEvidence: string;
  };
  courtroomWitness: {
    title: string;
    add: string;
    namePlaceholder: string;
    typePlaintiff: string;
    typeDefendant: string;
    tagTo: string;
    noWitnesses: string;
    searchPlaceholder: string;
    filterStatus: string;
    statusPending: string;
    statusCompleted: string;
    caseIdPlaceholder: string;
    sortBy: string;
    sortDate: string;
    sortAlpha: string;
    sortStatus: string;
    exportCsv: string;
    exportPdf: string;
    visualInsight: string;
    statusDistribution: string;
    templatesTitle: string;
    templateCategories: {
      admin: { title: string; items: Record<string, string> };
      examination: { title: string; items: Record<string, string> };
      objections: { title: string; items: Record<string, string> };
    };
  };
  courtroomNotes: {
    title: string;
    placeholder: string;
    hide: string;
    show: string;
  };
  courtroomStats: {
    title: string;
    totalObjections: string;
    totalTestimonies: string;
    activeDocuments: string;
  };
  courtroomAnalytics: {
    title: string;
    keywordFrequency: string;
    totalEntries: string;
    keywords: {
      objection: string;
      hearsay: string;
      leading: string;
      speculation: string;
      irrelevant: string;
    };
  };
  courtroomQuickObjections: {
    title: string;
    hearsay: string;
    irrelevant: string;
    leading: string;
    speculation: string;
    foundation: string;
    nonResponsive: string;
    opinion: string;
  };
  courtLevels: {
    firstInstance: string;
    highCourt: string;
    supremeCourt: string;
    cassation: string;
  };
  premium: {
    upgradeTitle: string;
    upgradeSubtitle: string;
    getStarted: string;
    benefits: string[];
  };
  actions: {
    create: string;
    improve: string;
    translate: string;
    copy: string;
    copied: string;
    save: string;
    saved: string;
    delete: string;
    exportPdf: string;
    exportWord: string;
    exportTxt: string;
    share: string;
    clear: string;
    generating: string;
    translating: string;
    analyzing: string;
    retry: string;
    viewAll: string;
    viewInNewTab: string;
    useTemplate: string;
    switchView: string;
    notificationTitle: string;
    notificationBody: string;
    checkUpdate: string;
    updateAvailable: string;
    updateNow: string;
    appUpToDate: string;
  };
  common: {
    inputLabel: string;
    outputLabel: string;
    selectLanguage: string;
    outputLanguage: string;
    allThreeLanguages: string;
    twoLanguages: string;
    singleLanguage: string;
    detectedLanguage: string;
    oromo: string;
    amharic: string;
    english: string;
    allLanguages: string;
    sourceLanguage: string;
    targetLanguage: string;
    proofreadMode: string;
    legalAccuracyNotice: string;
    loading: string;
    emptyContent: string;
    searchPlaceholder: string;
    filterBy: string;
    tags: string;
    date: string;
    assignedAt: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    quickStats: {
      constitution: string;
      proclamations: string;
      cassation: string;
      languages: string;
    };
    ctaCreate: string;
    ctaExplain: string;
    ctaTranslate: string;
    recentWork: string;
    noRecentWork: string;
    featuresTitle: string;
    featuresSubtitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    feature4Title: string;
    feature4Desc: string;
  };
  create: {
    title: string;
    subtitle: string;
    templateType: string;
    templates: {
      employmentContract: string;
      commercialLease: string;
      powerOfAttorney: string;
      legalWarningNotice: string;
      courtPetition: string;
      legalBrief: string;
      boardResolution: string;
      customPrompt: string;
    };
    targetLanguagePrompt: string;
    promptPlaceholder: string;
    optionalContextPlaceholder: string;
    buttonGenerate: string;
    tabOromo: string;
    tabAmharic: string;
    tabEnglish: string;
    tabCombined: string;
  };
  explainLaw: {
    title: string;
    subtitle: string;
    inputPlaceholder: string;
    quickPresetsTitle: string;
    preset1: string;
    preset2: string;
    preset3: string;
    preset4: string;
    buttonExplain: string;
    breakdownTitle: string;
    rightsAndDuties: string;
    provisions: string;
    practicalSteps: string;
  };
  translateView: {
    title: string;
    subtitle: string;
    directionsTitle: string;
    inputPlaceholder: string;
    proofreadingBadge: string;
    legalPreservationRuleTitle: string;
    legalPreservationRuleDesc: string;
    swapDirection: string;
  };
  socialView: {
    title: string;
    subtitle: string;
    platformTitle: string;
    facebookTab: string;
    telegramTab: string;
    topicPlaceholder: string;
    facebookNote: string;
    telegramNote: string;
    generateFacebook: string;
    generateTelegram: string;
  };
  glossaryView: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    lookupOnline: string;
    lookupOnlineDesc: string;
    lookupButton: string;
    categoryAll: string;
    categoryConstitutional: string;
    categoryLabor: string;
    categoryCommercial: string;
    categoryCivilCourt: string;
  };
  settingsView: {
    title: string;
    subtitle: string;
    appLanguageTitle: string;
    appLanguageDesc: string;
    defaultOutputLangTitle: string;
    defaultOutputLangDesc: string;
    outputOptionOromo: string;
    outputOptionAmharic: string;
    outputOptionEnglish: string;
    outputOptionInput: string;
    outputOptionAsk: string;
    outputOptionAllThree: string;
    legalStandardsTitle: string;
    legalStandardsDesc: string;
  };
  recentSearches: {
    title: string;
    clear: string;
    clearConfirm: string;
    empty: string;
    revisit: string;
    remove: string;
    history: string;
    allHistory: string;
    justNow: string;
    minAgo: string;
    hoursAgo: string;
    daysAgo: string;
    searchCount: string;
    filterRecent: string;
    showRecent: string;
    hideRecent: string;
  };
  shareState: {
    copyLink: string;
    linkCopied: string;
    shareTitle: string;
    shareDesc: string;
    shareView: string;
  };
}

import om from './om';

const internalTranslations: Record<Language, any> = {
  om,
  am: null,
  en: null,
};

export const translations = new Proxy(internalTranslations, {
  get(target, prop: string) {
    // If language is not loaded, fallback to Afaan Oromoo (default)
    return target[prop as Language] || target.om;
  }
}) as Record<Language, TranslationDictionary>;

const translationModules = import.meta.glob(['./om.ts', './am.ts', './en.ts']);

export async function loadLanguage(lang: Language): Promise<void> {
  if (internalTranslations[lang]) return;
  
  try {
    const module = await translationModules[`./${lang}.ts`]();
    internalTranslations[lang] = (module as any).default;
    // Dispatch event to notify components that translations updated
    window.dispatchEvent(new CustomEvent('seera:translations_updated', { detail: lang }));
  } catch (err) {
    console.error(`Failed to load language: ${lang}`, err);
  }
}
