/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNavbar } from './components/BottomNavbar';

import { CassationLibraryView } from './views/CassationLibraryView';
import { Language, translations, loadLanguage } from './i18n/translations';
import { getUserSettings, saveUserSettings, UserSettings, SavedLegalDocument } from './services/storage';
import { readShareableStateFromUrl, syncBrowserUrlWithState, ShareableAppState, isRestrictedTab } from './services/shareUrl';
import { ReadingProgressBar } from './components/ReadingProgressBar';
import { Scale, Globe, Shield, WifiOff, Lock } from 'lucide-react';
import { trackReferralVisit, getStoredOwnerKey } from './services/referralTracking';
import { isOwnerAccount, isOwnerEmail, unlockOwnerPrivileges } from './services/ownerAuth';
import { logRealtimeEvent } from './services/realtimeTracker';
import { AntiCloningProtectionBadge } from './components/AntiCloningProtectionBadge';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useAuth } from './context/AuthContext';
import { LandingView } from './views/LandingView';
import { analyticsService } from './services/analytics';
import { applyTheme } from './utils/theme';
import { startDraftAmendmentBackgroundWorker, OutdatedDraftAlert } from './services/draftAmendmentWorker';
import { initAppUpdateEngine, onAppUpdateAvailable, AppUpdateInfo } from './services/appUpdateService';
import { TopUpdateStickyBanner } from './components/TopUpdateStickyBanner';
import { MobileInstallBanner } from './components/MobileInstallBanner';
import { ExternalDatasetNoticeBanner } from './components/ExternalDatasetNoticeBanner';
import { initFilingReminderWorker } from './services/filingReminderService';
import { resolveCourtLink } from './utils/courtLinkUtils';

import { ErrorBoundary } from './components/ErrorBoundary';
import { useInactivityLock } from './hooks/useInactivityLock';
import { LinkEnforcementOverlay } from './components/LinkEnforcementOverlay';
import ethiopianJusticeLadyBg from './assets/images/legal_lady_justice_1791027652497.jpg';

function safeLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<any>,
  exportName?: string
) {
  return lazy(async () => {
    try {
      const module = await importFn();
      if (exportName && module[exportName]) {
        return { default: module[exportName] };
      }
      return module.default ? module : { default: module };
    } catch (error) {
      console.warn('Dynamic import failed, retrying once...', error);
      try {
        await new Promise((r) => setTimeout(r, 300));
        const retryModule = await importFn();
        if (exportName && retryModule[exportName]) {
          return { default: retryModule[exportName] };
        }
        return retryModule.default ? retryModule : { default: retryModule };
      } catch (retryErr) {
        if (typeof window !== 'undefined' && !sessionStorage.getItem('chunk_reload_attempted')) {
          sessionStorage.setItem('chunk_reload_attempted', 'true');
          window.location.reload();
        }
        throw retryErr;
      }
    }
  });
}

const HomeView = safeLazy(() => import('./views/HomeView'), 'HomeView');
const CreateView = safeLazy(() => import('./views/CreateView'), 'CreateView');
const ExplainLawView = safeLazy(() => import('./views/ExplainLawView'), 'ExplainLawView');
const TranslateView = safeLazy(() => import('./views/TranslateView'), 'TranslateView');
const SocialMediaView = safeLazy(() => import('./views/SocialMediaView'), 'SocialMediaView');
const GlossaryView = safeLazy(() => import('./views/GlossaryView'), 'GlossaryView');
const MyContentView = safeLazy(() => import('./views/MyContentView'), 'MyContentView');
const SettingsView = safeLazy(() => import('./views/SettingsView'), 'SettingsView');
const DocumentAnalysisView = safeLazy(() => import('./views/DocumentAnalysisView'), 'DocumentAnalysisView');
const PrecedentSimulatorView = safeLazy(() => import('./views/PrecedentSimulatorView'), 'PrecedentSimulatorView');
const AirtimeRechargeView = safeLazy(() => import('./views/AirtimeRechargeView'), 'AirtimeRechargeView');
const AppGuideView = safeLazy(() => import('./views/AppGuideView'), 'AppGuideView');
const LibraryView = safeLazy(() => import('./views/LibraryView'), 'LibraryView');
const LegislationRepositoryView = safeLazy(() => import('./views/LegislationRepositoryView'), 'LegislationRepositoryView');
const WitnessTestimonyView = safeLazy(() => import('./views/WitnessTestimonyView'), 'WitnessTestimonyView');
const DocumentTemplatesView = safeLazy(() => import('./views/DocumentTemplatesView'), 'DocumentTemplatesView');
const AnalyticsFeedbackView = safeLazy(() => import('./views/AnalyticsFeedbackView'), 'AnalyticsFeedbackView');
const CourtroomAssistantView = safeLazy(() => import('./views/CourtroomAssistantView'), 'CourtroomAssistantView');
const CourtWorkView = safeLazy(() => import('./views/CourtWorkView'), 'CourtWorkView');
const InstitutionManagementView = safeLazy(() => import('./views/InstitutionManagementView'), 'InstitutionManagementView');
const AdminDashboardView = safeLazy(() => import('./views/AdminDashboardView'), 'AdminDashboardView');

const PremiumSubscriberDashboardView = safeLazy(() => import('./views/PremiumSubscriberDashboardView'), 'PremiumSubscriberDashboardView');
const LegalComparisonView = safeLazy(() => import('./views/LegalComparisonView'), 'LegalComparisonView');
const WorldBizarreLawsView = safeLazy(() => import('./views/WorldBizarreLawsView'), 'WorldBizarreLawsView');
const ProfileView = safeLazy(() => import('./views/ProfileView'), 'ProfileView');
const IntegrationView = safeLazy(() => import('./views/IntegrationView'), 'IntegrationView');
const JudicialExpertToolsView = safeLazy(() => import('./views/JudicialExpertToolsView'), 'JudicialExpertToolsView');
const ExpertLegalReviewView = safeLazy(() => import('./views/ExpertLegalReviewView'), 'ExpertLegalReviewView');
const VoiceAndDocumentConverterView = safeLazy(() => import('./views/VoiceAndDocumentConverterView'), 'VoiceAndDocumentConverterView');
const LegalFAQSupportView = safeLazy(() => import('./components/LegalFAQSupportView'), 'LegalFAQSupportView');
const LegalQnARepositoryView = safeLazy(() => import('./components/LegalQnARepositoryView'), 'LegalQnARepositoryView');
const TelegramArchiveSearch = safeLazy(() => import('./components/TelegramArchiveSearch'), 'TelegramArchiveSearch');
const SharedDraftWorkspace = safeLazy(() => import('./components/SharedDraftWorkspace'), 'SharedDraftWorkspace');
const CaseRulingAnalysisView = safeLazy(() => import('./views/CaseRulingAnalysisView'), 'CaseRulingAnalysisView');
const CourtScheduleView = safeLazy(() => import('./views/CourtScheduleView'), 'CourtScheduleView');
const VisitorIdentityModal = safeLazy(() => import('./components/VisitorIdentityModal'), 'VisitorIdentityModal');
const GlobalCommandPalette = safeLazy(() => import('./components/GlobalCommandPalette'), 'GlobalCommandPalette');
const KeyboardShortcutsModal = safeLazy(() => import('./components/KeyboardShortcutsModal'), 'KeyboardShortcutsModal');
const AlwaysAvailableGlossaryPopover = safeLazy(() => import('./components/AlwaysAvailableGlossaryPopover'), 'AlwaysAvailableGlossaryPopover');
const PlayStorePublishGuideModal = safeLazy(() => import('./components/PlayStorePublishGuideModal'), 'PlayStorePublishGuideModal');
const AppUpdateNotificationModal = safeLazy(() => import('./components/AppUpdateNotificationModal'), 'AppUpdateNotificationModal');
const FilingReminderModal = safeLazy(() => import('./components/FilingReminderModal'), 'FilingReminderModal');
const LegalMeetingRoomView = safeLazy(() => import('./views/LegalMeetingRoomView'), 'LegalMeetingRoomView');
const LegalCitationFinderView = safeLazy(() => import('./views/LegalCitationFinderView'), 'LegalCitationFinderView');
const CourtroomControlView = safeLazy(() => import('./views/ControlDashboardView'), 'ControlDashboardView');
const CourtroomKioskView = safeLazy(() => import('./views/KioskView'), 'KioskView');
const DigitalJusticeHubView = safeLazy(() => import('./views/DigitalJusticeHubView'), 'DigitalJusticeHubView');
const CourtPersonnelFolderView = safeLazy(() => import('./views/CourtPersonnelFolderView'), 'CourtPersonnelFolderView');
const CasePublicStatusView = safeLazy(() => import('./views/CasePublicStatusView'), 'CasePublicStatusView');

const OFFICIAL_URL = 'https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app';
const ALLOWED_ORIGINS = [
  OFFICIAL_URL,
  'https://ais-dev-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app',
  'http://localhost:3000',
];

const AppViewLoadingFallback: React.FC<{ currentLang?: Language }> = ({ currentLang = 'om' }) => (
  <div className="flex flex-col items-center justify-center p-12 my-10 space-y-4 text-center">
    <div className="relative flex items-center justify-center">
      <div className="w-14 h-14 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      <span className="absolute text-xl">⚖️</span>
    </div>
    <p className="text-amber-400 font-mono text-xs tracking-wider animate-pulse font-semibold">
      {currentLang === 'om'
        ? 'Kutaa Seeraa Fe\'aa Jira...'
        : currentLang === 'am'
        ? 'የሕግ መዝገብ በመጫን ላይ...'
        : 'Loading Legal Module...'}
    </p>
  </div>
);

export default function App() {
  const { user, profile, loading, updateProfile, verificationSuccessMsg, signInWithBiometrics, signInByEmailOnly } = useAuth();
  const isOwner = isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );
  const isOwnerAcc = isOwner;
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [currentLang, setCurrentLang] = useState<Language>(settings.appLanguage || 'om');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isLocked, setIsLocked] = useState(false);
  const [activeDocForView, setActiveDocForView] = useState<SavedLegalDocument | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [preloadedExplainQuery, setPreloadedExplainQuery] = useState<string>('');
  const [preloadedDocAnalysisQuery, setPreloadedDocAnalysisQuery] = useState<string>('');
  const [preloadedCassationQuery, setPreloadedCassationQuery] = useState<string>('');
  const [preloadedGlossaryQuery, setPreloadedGlossaryQuery] = useState<string>('');
  const [preloadedLegislationQuery, setPreloadedLegislationQuery] = useState<string>('');
  const [referralCreator, setReferralCreator] = useState<string | null>(null);
  const [sharedDraftToken, setSharedDraftToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('draftToken') || params.get('sharedDraft') || null;
    }
    return null;
  });
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [showGlobalStoreModal, setShowGlobalStoreModal] = useState(false);
  const [shortcutToast, setShortcutToast] = useState<{ message: string; emoji: string } | null>(null);
  const [bgSyncToast, setBgSyncToast] = useState<{ message: string; emoji: string } | null>(null);
  const [outdatedDraftAlerts, setOutdatedDraftAlerts] = useState<OutdatedDraftAlert[]>([]);
  const [appUpdateInfo, setAppUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [showFilingReminderModal, setShowFilingReminderModal] = useState<boolean>(false);
  const [meetingRoomId, setMeetingRoomId] = useState<string>('seera-collab-room-01');
  const [meetingTopic, setMeetingTopic] = useState<string>('Marii Falmii Seeraa & Qophii Sanadaa');

  // Initialize auto-update engine and filing reminder worker
  useEffect(() => {
    const cleanupUpdate = initAppUpdateEngine();
    const cleanupReminder = initFilingReminderWorker();
    const unsub = onAppUpdateAvailable((info) => {
      setAppUpdateInfo(info);
      if (info.isUpdateAvailable) {
        setShowUpdateModal(true);
      }
    });

    return () => {
      cleanupUpdate();
      if (cleanupReminder) cleanupReminder();
      unsub();
    };
  }, []);

  // Sync local settings with profile
  useEffect(() => {
    if (profile) {
      setSettings(prev => ({ ...prev, ...profile }));
      if (profile.appLanguage) {
        setCurrentLang(profile.appLanguage);
      }
    }
  }, [profile]);

  // Handle dynamic language loading
  useEffect(() => {
    if (currentLang !== 'om') {
      loadLanguage(currentLang).then(() => {
        setSettings(prev => ({ ...prev }));
      });
    }
  }, [currentLang]);

  // Inactivity auto-lock
  useInactivityLock(settings.autoLockTimeout || 0, () => setIsLocked(true));

  const handleGlobalBiometricUnlock = async () => {
    const result = await signInWithBiometrics();
    if (result.success) {
      setIsLocked(false);
    }
  };

  // Background Sync status notifications
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setBgSyncToast({
        message: currentLang === 'om' ? "⚡ Intarneetiin waan deebi'eef kuusaan seeraa fi murtiiwwan ijibbaataa Sinkii ta'aniiru!" : "⚡ Connection restored! Background sync active.",
        emoji: '🌐',
      });
      setTimeout(() => setBgSyncToast(null), 5000);
    };
    const handleOffline = () => setIsOffline(true);
    const handleSyncStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.syncedDocsCount > 0) {
        setBgSyncToast({
          message: currentLang === 'om' ? `🔄 Kuusaan seeraa background'n Sinkii ta'eera (${detail.syncedDocsCount} docs).` : `🔄 Background sync complete (${detail.syncedDocsCount} docs).`,
          emoji: '🔄',
        });
        setTimeout(() => setBgSyncToast(null), 4000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('seera_sync_status_updated', handleSyncStatus);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('seera_sync_status_updated', handleSyncStatus);
    };
  }, [currentLang]);

  // Draft amendment worker
  useEffect(() => {
    startDraftAmendmentBackgroundWorker((alerts) => setOutdatedDraftAlerts(alerts));
    const handleAlert = (e: Event) => setOutdatedDraftAlerts((e as CustomEvent).detail);
    window.addEventListener('seera:outdated_draft_alert', handleAlert);
    return () => window.removeEventListener('seera:outdated_draft_alert', handleAlert);
  }, []);

  // URL State Sync & Initialization
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Auto-authorize courtWork tab and handle gurbicha@gmail.com
    const tabParam = params.get('tab');
    if (tabParam === 'courtWork' || tabParam === 'control') {
      localStorage.setItem('seera_court_access_authorized', 'true');
      setActiveTab(tabParam);
    }

    const urlEmail = params.get('email') || params.get('user') || params.get('u') || params.get('owner');
    if (urlEmail && (isOwnerEmail(urlEmail) || urlEmail === 'gurbicha@gmail.com')) {
      unlockOwnerPrivileges(urlEmail);
      if (urlEmail === 'gurbicha@gmail.com') {
        localStorage.setItem('seera_court_access_authorized', 'true');
        const gurbichaSession = {
          type: 'admin',
          institutionId: 'inst_gurbicha_aana',
          courtName: 'Mana Murtii Aanaa Gurbicha',
          courtLevel: 'first_instance',
          user: {
            id: 'gurbicha_admin',
            fullName: 'Admin Mana Murtii Aanaa Gurbicha',
            emailOrUsername: 'gurbicha@gmail.com',
            role: 'court_admin',
            bench: 'Dhaddacha Aanaa Gurbicha',
          },
          sessionStartedAt: new Date().toISOString(),
        };
        localStorage.setItem('seera_active_court_session', JSON.stringify(gurbichaSession));
      } else {
        // App owner (e.g. ayeledha@gmail.com): clear any stale Gurbicha court session
        const existingSessionRaw = localStorage.getItem('seera_active_court_session');
        if (existingSessionRaw && existingSessionRaw.toLowerCase().includes('gurbicha')) {
          localStorage.removeItem('seera_active_court_session');
          sessionStorage.removeItem('seera_active_court_session');
          window.dispatchEvent(new CustomEvent('seera_court_session_changed', { detail: null }));
        }
      }
    }

    // Handle language parameter e.g. &lang=om
    const langParam = params.get('lang') as Language;
    if (langParam && (langParam === 'om' || langParam === 'am' || langParam === 'en')) {
      setCurrentLang(langParam);
      saveUserSettings({ appLanguage: langParam });
    }

    // Handle meeting/discussion links
    const room = params.get('room') || params.get('meeting') || params.get('meet');
    if (room || tabParam === 'meeting') {
      setMeetingRoomId(room || 'seera-collab-room-01');
      if (params.get('topic')) setMeetingTopic(params.get('topic')!);
      setActiveTab('meeting');
      if (!user) signInByEmailOnly(`guest.${Math.random().toString(36).substring(2, 7)}@saiethio.com`, 'Legal Guest Jurist', false).catch(() => {});
    }

    // Handle direct court links (from query params or pathname)
    const courtLinkParam = params.get('courtLink') || params.get('court') || params.get('domain');
    const path = window.location.pathname.replace(/^\//, '');
    const courtLinkToResolve = courtLinkParam || (path.includes('.') || path.startsWith('mma') ? path : null);
    
    if (courtLinkToResolve) {
      const resolved = resolveCourtLink(courtLinkToResolve);
      if (resolved) {
        localStorage.setItem('seera_court_access_authorized', 'true');
        if (resolved.slug === 'mmagurbicha') {
          setActiveTab('control');
        } else {
          setActiveTab('courtWork');
        }
      }
    }

    // Read full shareable state
    const shared = readShareableStateFromUrl();
    if (shared) {
      if (shared.creator) setReferralCreator(shared.creator);
      if (shared.tab) {
        const targetTab = shared.tab === 'hordoffii' ? 'analyticsFeedback' : shared.tab;
        const isOwnerAcc = isOwnerAccount(user?.email || '', profile?.visitorName || '', getStoredOwnerKey());
        if (!isRestrictedTab(targetTab) || isOwnerAcc || targetTab === 'courtWork' || targetTab === 'control') {
          if (targetTab === 'courtWork' || targetTab === 'control') {
            localStorage.setItem('seera_court_access_authorized', 'true');
          }
          setActiveTab(targetTab);
        }
      }
      if (shared.lang) {
        setCurrentLang(shared.lang);
        saveUserSettings({ appLanguage: shared.lang });
      }
      if (shared.query) {
        setCurrentQuery(shared.query);
        if (shared.tab === 'explainLaw') setPreloadedExplainQuery(shared.query);
        if (shared.tab === 'cassation') setPreloadedCassationQuery(shared.query);
      }
      if (shared.caseId) setCurrentCaseId(shared.caseId);
    }
  }, []);

  // Auto-route gurbicha@gmail.com directly to Mana Murtii Aanaa Gurbicha Dashboard ('control' tab)
  // and ensure App Owner (ayeledha@gmail.com) never retains a Gurbicha court worker session
  useEffect(() => {
    const userEmail = (
      user?.email ||
      localStorage.getItem('seera_cached_email') ||
      localStorage.getItem('seera_owner_email') ||
      ''
    ).toLowerCase().trim();

    if (userEmail === 'gurbicha@gmail.com') {
      setActiveTab('control');
    } else if (
      isOwner ||
      isOwnerEmail(userEmail) ||
      userEmail === 'ayeledha@gmail.com' ||
      userEmail === 'ayele@saiethio.com' ||
      userEmail === 'ayeledha@saiethio.com'
    ) {
      const activeRaw = localStorage.getItem('seera_court_active_session');
      if (activeRaw && activeRaw.toLowerCase().includes('gurbicha')) {
        localStorage.removeItem('seera_court_active_session');
        sessionStorage.removeItem('seera_court_active_session');
        window.dispatchEvent(new CustomEvent('seera_court_session_changed', { detail: null }));
      }
    }
  }, [user, isOwner]);

  // Sync browser URL with state
  useEffect(() => {
    syncBrowserUrlWithState({
      tab: activeTab,
      lang: currentLang,
      query: currentQuery || undefined,
      caseId: currentCaseId || undefined,
    }, true);
    document.documentElement.lang = currentLang;
  }, [activeTab, currentLang, currentQuery]);

  // Analytics
  useEffect(() => {
    if (user && activeTab) analyticsService.trackPageView(activeTab);
  }, [activeTab, user]);

  // Profile-based tracking
  useEffect(() => {
    if (profile && !sessionStorage.getItem('seera_visit_logged')) {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('by') || 'direct';
      trackReferralVisit(ref, 'direct', profile.visitorName);
      logRealtimeEvent('visit', `User loaded platform: ${navigator.userAgent}`, 'Onboarding', ref, profile.visitorName);
      sessionStorage.setItem('seera_visit_logged', 'true');
    }
  }, [profile]);

  // Global Shortcuts
  const handleGlobalSave = () => {
    window.dispatchEvent(new CustomEvent('seera:save_current_document'));
    showShortcutFeedback(currentLang === 'om' ? "Sanadni milkaa'inaan kuufameera!" : "Document Saved!", '💾');
  };
  const handleGlobalPrint = () => {
    window.dispatchEvent(new CustomEvent('seera:print_current_document'));
    showShortcutFeedback(currentLang === 'om' ? 'Qophii Maxxansaa...' : 'Preparing Print...', '🖨️');
  };
  const showShortcutFeedback = (message: string, emoji = '⚡') => {
    setShortcutToast({ message, emoji });
    setTimeout(() => setShortcutToast(null), 2800);
  };

  useGlobalShortcuts({
    onOpenSearch: () => setIsCommandPaletteOpen(true),
    onSave: handleGlobalSave,
    onPrint: handleGlobalPrint,
    onOpenHelp: () => setIsShortcutsHelpOpen(true),
    onCloseModals: () => { setIsCommandPaletteOpen(false); setIsShortcutsHelpOpen(false); },
    onNavigateTab: (tab: string) => {
      setActiveTab(tab);
      setCurrentQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    const updated = saveUserSettings({ appLanguage: lang });
    setSettings(updated);
    updateProfile({ appLanguage: lang });
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-mono text-xs animate-pulse">Initializing Secure Portal...</p>
      </div>
    );
  }

  if (!user && activeTab !== 'caseStatus') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col relative">
        <TopUpdateStickyBanner currentLang={currentLang} updateInfo={appUpdateInfo} onOpenDetails={() => setShowUpdateModal(true)} />
        <LandingView
          currentLang={currentLang}
          onJoinMeetingDirectly={(room, topic) => {
            setMeetingRoomId(room || 'seera-collab-room-01');
            if (topic) setMeetingTopic(topic);
            setActiveTab('meeting');
            signInByEmailOnly(`guest.${Math.random().toString(36).substring(2, 7)}@saiethio.com`, 'Legal Guest Jurist', false).catch(() => {});
          }}
          onForceUpdate={() => setShowUpdateModal(true)}
          appUpdateInfo={appUpdateInfo}
        />
        {(showUpdateModal || appUpdateInfo?.isMandatory) && (
          <Suspense fallback={null}>
            <AppUpdateNotificationModal
              currentLang={currentLang}
              updateInfo={appUpdateInfo}
              onDismiss={() => {
                if (!appUpdateInfo?.isMandatory) setShowUpdateModal(false);
              }}
            />
          </Suspense>
        )}
      </div>
    );
  }

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isAllowedOrigin = ALLOWED_ORIGINS.some(origin => origin.startsWith(currentOrigin) || currentOrigin.startsWith(origin));
  if (!isAllowedOrigin && currentOrigin) return <LinkEnforcementOverlay currentLang={currentLang} targetUrl={OFFICIAL_URL} />;

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 font-sans relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.035] filter grayscale contrast-125"
          style={{ backgroundImage: `url(${ethiopianJusticeLadyBg})` }}
        />
      </div>

      {isLocked && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <Lock className="w-16 h-16 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-100">App Locked</h2>
            <button onClick={handleGlobalBiometricUnlock} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl">
              Authenticate
            </button>
          </div>
        </div>
      )}

      <TopUpdateStickyBanner currentLang={currentLang} updateInfo={appUpdateInfo} onOpenDetails={() => setShowUpdateModal(true)} />
      <ExternalDatasetNoticeBanner currentLang={currentLang} />
      <MobileInstallBanner currentLang={currentLang} onOpenStoreModal={() => setShowGlobalStoreModal(true)} />

      {activeTab !== 'caseStatus' && (
        <Navbar
          currentLang={currentLang}
          onLanguageChange={handleLanguageChange}
          activeTab={activeTab}
          currentState={{ tab: activeTab, lang: currentLang, query: currentQuery || undefined, caseId: currentCaseId || undefined }}
          onTabChange={(tab) => { setActiveTab(tab); setCurrentQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
          onOpenFilingReminder={() => setShowFilingReminderModal(true)}
        />
      )}

      <main className={activeTab === 'caseStatus' ? 'flex-1 w-full' : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24'}>
        <ErrorBoundary currentLang={currentLang} key={activeTab} onReset={() => setActiveTab('home')}>
          <Suspense fallback={<AppViewLoadingFallback currentLang={currentLang} />}>
            {activeTab === 'home' && <HomeView currentLang={currentLang} onNavigate={setActiveTab} />}
            {activeTab === 'create' && <CreateView currentLang={currentLang} defaultOutputLang={settings.defaultOutputLanguage} onNavigateTab={setActiveTab} />}
            {activeTab === 'explainLaw' && <ExplainLawView currentLang={currentLang} initialQuery={preloadedExplainQuery} />}
            {activeTab === 'cassation' && <CassationLibraryView currentLang={currentLang} initialQuery={preloadedCassationQuery} />}
            {activeTab === 'courtWork' && <CourtWorkView currentLang={currentLang} />}
            {activeTab === 'adminDashboard' && <AdminDashboardView currentLang={currentLang} onNavigateTab={setActiveTab} />}
            {activeTab === 'settings' && <SettingsView currentLang={currentLang} onLanguageChange={handleLanguageChange} settings={settings} onSettingsUpdate={setSettings} onNavigateTab={setActiveTab} />}
            {activeTab === 'translate' && <TranslateView currentLang={currentLang} />}
            {activeTab === 'socialMedia' && <SocialMediaView currentLang={currentLang} />}
            {activeTab === 'glossary' && <GlossaryView currentLang={currentLang} initialQuery={preloadedGlossaryQuery} />}
            {activeTab === 'myContent' && <MyContentView currentLang={currentLang} activeDoc={activeDocForView} onDocSelect={(doc: SavedLegalDocument) => { setActiveDocForView(doc); setActiveTab('myContent'); }} />}
            {activeTab === 'documentAnalysis' && <DocumentAnalysisView currentLang={currentLang} initialQuery={preloadedDocAnalysisQuery} />}
            {activeTab === 'precedentSimulator' && <PrecedentSimulatorView currentLang={currentLang} />}
            {activeTab === 'airtime' && <AirtimeRechargeView currentLang={currentLang} />}
            {activeTab === 'appGuide' && <AppGuideView currentLang={currentLang} />}
            {activeTab === 'library' && <LibraryView currentLang={currentLang} />}
            {activeTab === 'legislation' && <LegislationRepositoryView currentLang={currentLang} initialQuery={preloadedLegislationQuery} />}
            {activeTab === 'witness' && <WitnessTestimonyView currentLang={currentLang} />}
            {activeTab === 'templates' && <DocumentTemplatesView currentLang={currentLang} onNavigateTab={setActiveTab} />}
            {activeTab === 'analyticsFeedback' && <AnalyticsFeedbackView currentLang={currentLang} />}
            {activeTab === 'courtroomAssistant' && <CourtroomAssistantView currentLang={currentLang} />}
            {activeTab === 'institutionManagement' && <InstitutionManagementView currentLang={currentLang} />}

            {activeTab === 'premium' && <PremiumSubscriberDashboardView currentLang={currentLang} />}
            {activeTab === 'comparison' && <LegalComparisonView currentLang={currentLang} />}
            {activeTab === 'bizarre' && <WorldBizarreLawsView currentLang={currentLang} />}
            {activeTab === 'profile' && <ProfileView currentLang={currentLang} />}
            {activeTab === 'integration' && <IntegrationView currentLang={currentLang} />}
            {activeTab === 'judicialTools' && <JudicialExpertToolsView currentLang={currentLang} />}
            {activeTab === 'expertReview' && <ExpertLegalReviewView currentLang={currentLang} />}
            {activeTab === 'voice' && <VoiceAndDocumentConverterView currentLang={currentLang} />}
            {activeTab === 'caseRuling' && <CaseRulingAnalysisView currentLang={currentLang} />}
            {activeTab === 'courtSchedule' && <CourtScheduleView currentLang={currentLang} />}
            {activeTab === 'citation' && <LegalCitationFinderView currentLang={currentLang} />}
            {activeTab === 'meeting' && <LegalMeetingRoomView currentLang={currentLang} roomId={meetingRoomId} topic={meetingTopic} />}
            {activeTab === 'control' && <CourtroomControlView currentLang={currentLang} />}
            {activeTab === 'kiosk' && <CourtroomKioskView currentLang={currentLang} />}
            {activeTab === 'digitalJustice' && <DigitalJusticeHubView currentLang={currentLang} />}
            {activeTab === 'personnelFolder' && <CourtPersonnelFolderView currentLang={currentLang} />}
            {activeTab === 'caseStatus' && <CasePublicStatusView currentLang={currentLang} />}
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs">
          <p>© 2026 SAI Ethio • SeeraAI | FDRE Proclamation 410/2004 Protected</p>
        </div>
      </footer>

      {bgSyncToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-sky-500/60 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <span>{bgSyncToast.emoji}</span>
          <span className="text-xs font-semibold text-sky-200">{bgSyncToast.message}</span>
        </div>
      )}

      <Suspense fallback={null}>
        <GlobalCommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} currentLang={currentLang} onNavigateTab={setActiveTab} onTriggerSave={handleGlobalSave} onTriggerPrint={handleGlobalPrint} />
        <KeyboardShortcutsModal isOpen={isShortcutsHelpOpen} onClose={() => setIsShortcutsHelpOpen(false)} currentLang={currentLang} />
        <AlwaysAvailableGlossaryPopover currentLang={currentLang} />
        {(showUpdateModal || appUpdateInfo?.isMandatory) && (
          <AppUpdateNotificationModal
            currentLang={currentLang}
            updateInfo={appUpdateInfo}
            onDismiss={() => {
              if (!appUpdateInfo?.isMandatory) setShowUpdateModal(false);
            }}
          />
        )}
      </Suspense>

      {activeTab !== 'caseStatus' && <BottomNavbar currentLang={currentLang} activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
}
