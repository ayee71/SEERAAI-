import React, { useState, useEffect, Suspense, Fragment } from 'react';
import { safeLazy } from './utils/lazy';
import { useAuth } from './context/AuthContext';
import { Language, loadLanguage } from './i18n/translations';
import { getUserSettings, saveUserSettings, UserSettings, SavedLegalDocument } from './services/storage';
import { initAppUpdateEngine, onAppUpdateAvailable, AppUpdateInfo, applyAppUpdate } from './services/appUpdateService';
import { syncStatusService } from './services/syncStatusService';
import { getStoredOfflineMode, OFFLINE_MODE_STORAGE_KEY } from './services/syncUtils';
import './services/offlineModeService';
import { useInactivityLock } from './hooks/useInactivityLock';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { isOwnerAccount, isOwnerEmail } from './services/ownerAuth';
import { getStoredOwnerKey, trackReferralVisit } from './services/referralTracking';
import { logRealtimeEvent } from './services/realtimeTracker';
import { analyticsService } from './services/analytics';
import { readShareableStateFromUrl, syncBrowserUrlWithState, isRestrictedTab } from './services/shareUrl';
import { resolveCourtLink } from './utils/courtLinkUtils';

// Non-lazy essential layout components
import { TopUpdateStickyBanner } from './components/TopUpdateStickyBanner';
import { LandingView } from './views/LandingView';
import { Navbar } from './components/Navbar';
import { BottomNavbar } from './components/BottomNavbar';
import { ReadingProgressBar } from './components/ReadingProgressBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SystemWarningModal } from './components/SystemWarningModal';
import { LinkEnforcementOverlay } from './components/LinkEnforcementOverlay';
import ladyJusticeBg from './assets/images/legal_lady_justice_1791027652497.jpg';
import { ShieldAlert } from 'lucide-react';
import { CitationLinkedInstancesPanel } from './components/CitationLinkedInstancesPanel';

// Safe Lazy-loaded Views (auto-recovers on dynamic import / stale chunk failures)
const HomeView = safeLazy(() => import('./views/HomeView'), 'HomeView');
const CourtModulesView = safeLazy(() => import('./views/CourtModulesView'), 'CourtModulesView');
const CreateView = safeLazy(() => import('./views/CreateView'), 'CreateView');
const ExplainLawView = safeLazy(() => import('./views/ExplainLawView'), 'ExplainLawView');
const CassationLibraryView = safeLazy(() => import('./views/CassationLibraryView'), 'CassationLibraryView');
const CourtPersonnelFolderView = safeLazy(() => import('./views/CourtPersonnelFolderView'), 'CourtPersonnelFolderView');
const CourtAIDashboardView = safeLazy(() => import('./views/CourtAIDashboardView'), 'CourtAIDashboardView');
const AdminDashboardView = safeLazy(() => import('./views/AdminDashboardView'), 'AdminDashboardView');
const SettingsView = safeLazy(() => import('./views/SettingsView'), 'SettingsView');
const TranslateView = safeLazy(() => import('./views/TranslateView'), 'TranslateView');
const SocialMediaView = safeLazy(() => import('./views/SocialMediaView'), 'SocialMediaView');
const GlossaryView = safeLazy(() => import('./views/GlossaryView'), 'GlossaryView');
const MyContentView = safeLazy(() => import('./views/MyContentView'), 'MyContentView');
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
const InstitutionManagementView = safeLazy(() => import('./views/InstitutionManagementView'), 'InstitutionManagementView');
const LegalMeetingRoomView = safeLazy(() => import('./views/LegalMeetingRoomView'), 'LegalMeetingRoomView');
const KioskView = safeLazy(() => import('./views/KioskView'), 'KioskView');
const VoiceAndDocumentConverterView = safeLazy(() => import('./views/VoiceAndDocumentConverterView'), 'VoiceAndDocumentConverterView');
const PremiumSubscriberDashboardView = safeLazy(() => import('./views/PremiumSubscriberDashboardView'), 'PremiumSubscriberDashboardView');
const LegalComparisonView = safeLazy(() => import('./views/LegalComparisonView'), 'LegalComparisonView');
const WorldBizarreLawsView = safeLazy(() => import('./views/WorldBizarreLawsView'), 'WorldBizarreLawsView');
const ProfileView = safeLazy(() => import('./views/ProfileView'), 'ProfileView');
const IntegrationView = safeLazy(() => import('./views/IntegrationView'), 'IntegrationView');
const JudicialExpertToolsView = safeLazy(() => import('./views/JudicialExpertToolsView'), 'JudicialExpertToolsView');
const ExpertLegalReviewView = safeLazy(() => import('./views/ExpertLegalReviewView'), 'ExpertLegalReviewView');
const CaseRulingAnalysisView = safeLazy(() => import('./views/CaseRulingAnalysisView'), 'CaseRulingAnalysisView');
const CourtScheduleView = safeLazy(() => import('./views/CourtScheduleView'), 'CourtScheduleView');
const LegalCitationFinderView = safeLazy(() => import('./views/LegalCitationFinderView'), 'LegalCitationFinderView');
const DigitalJusticeHubView = safeLazy(() => import('./views/DigitalJusticeHubView'), 'DigitalJusticeHubView');
const ControlDashboardView = safeLazy(() => import('./views/ControlDashboardView'), 'ControlDashboardView');
const GurbichaCourtPractice = safeLazy(() => import('./views/GurbichaCourtPractice'), 'GurbichaCourtPractice');
const CasePublicStatusView = safeLazy(() => import('./views/CasePublicStatusView'), 'CasePublicStatusView');

// Safe Lazy-loaded Modals and Widgets
const TelegramArchiveSearch = safeLazy(() => import('./components/TelegramArchiveSearch'), 'TelegramArchiveSearch');
const TelegramStatusDashboard = safeLazy(() => import('./components/TelegramStatusDashboard'), 'TelegramStatusDashboard');
const LegalHelpFaq = safeLazy(() => import('./components/LegalHelpFaq'), 'LegalHelpFaq');
const GlobalCommandPalette = safeLazy(() => import('./components/GlobalCommandPalette'), 'GlobalCommandPalette');
const KeyboardShortcutsModal = safeLazy(() => import('./components/KeyboardShortcutsModal'), 'KeyboardShortcutsModal');
const AlwaysAvailableGlossaryPopover = safeLazy(() => import('./components/AlwaysAvailableGlossaryPopover'), 'AlwaysAvailableGlossaryPopover');
const AppUpdateNotificationModal = safeLazy(() => import('./components/AppUpdateNotificationModal'), 'AppUpdateNotificationModal');
const AIFeedbackFloatingButton = safeLazy(() => import('./components/AIFeedbackFloatingButton'), 'AIFeedbackFloatingButton');

const OFFICIAL_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app';
const ALLOWED_ORIGIN_PREFIXES = [
  'https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app',
  'https://ais-dev-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://mmurtii.com',
  'https://mmurtii.oro',
];

const LoadingFallback: React.FC<{ currentLang?: Language }> = ({ currentLang = 'om' }) => (
  <div className="flex flex-col items-center justify-center p-12 my-10 space-y-4 text-center">
    <div className="relative flex items-center justify-center">
      <div className="w-14 h-14 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      <span className="absolute text-xl">⚖️</span>
    </div>
    <p className="text-amber-400 font-mono text-xs tracking-wider animate-pulse font-semibold">
      {currentLang === 'om' ? "Kutaa Seeraa Fe'aa Jira..." : currentLang === 'am' ? 'የሕግ መዝገብ በመጫን ላይ...' : 'Loading Legal Module...'}
    </p>
  </div>
);

export default function App() {
  const { 
    user, 
    profile, 
    authClaims,
    loading, 
    updateProfile, 
    signInWithBiometrics, 
    signInAsGuest,
    resendEmailVerification,
    refreshAuthClaims,
    logout,
  } = useAuth();

  const isOwner = authClaims.isTrustedAdmin && isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );

  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [currentLang, setCurrentLang] = useState<Language>(settings.appLanguage || 'om');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [activeDoc, setActiveDoc] = useState<SavedLegalDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [hideHeader, setHideHeader] = useState<boolean>(false);

  // Tab-specific initial queries
  const [explainQuery, setExplainQuery] = useState<string>('');
  const [docAnalysisQuery, setDocAnalysisQuery] = useState<string>('');
  const [cassationQuery, setCassationQuery] = useState<string>('');
  const [glossaryQuery, setGlossaryQuery] = useState<string>('');
  const [legislationQuery, setLegislationQuery] = useState<string>('');
  const [_creatorName, setCreatorNameState] = useState<string | null>(null);

  // Draft Token
  const [_draftToken, _setDraftToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('draftToken') || sp.get('sharedDraft') || null;
    }
    return null;
  });

  const [_isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' && !navigator.onLine);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [_isFilingReminderOpen, setIsFilingReminderOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; emoji: string } | null>(null);
  const [_outdatedDraftAlerts, setOutdatedDraftAlerts] = useState<any[]>([]);
  const [appUpdateInfo, setAppUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [meetingRoomId, setMeetingRoomId] = useState<string>('seera-collab-room-01');
  const [meetingTopic, setMeetingTopic] = useState<string>('Marii Falmii Seeraa & Qophii Sanadaa');
  const [showWarningModal, setShowWarningModal] = useState<boolean>(!localStorage.getItem('seera_warning_shown'));

  // Initialize App Update Engine
  useEffect(() => {
    const unsubEngine = initAppUpdateEngine();
    const unsubListener = onAppUpdateAvailable((info) => {
      setAppUpdateInfo(info);
      if (info.isUpdateAvailable) {
        setShowUpdateModal(true);
      }
    });
    return () => {
      unsubEngine();
      unsubListener();
    };
  }, []);

  // Sync profile settings while preserving explicit device-level offline mode in localStorage
  useEffect(() => {
    if (profile) {
      const hasExplicitOffline =
        typeof window !== 'undefined' && localStorage.getItem(OFFLINE_MODE_STORAGE_KEY) !== null;
      setSettings((prev) => ({
        ...prev,
        ...(profile as any),
        offlineModeEnabled: hasExplicitOffline
          ? getStoredOfflineMode()
          : (profile as any).offlineModeEnabled ?? prev.offlineModeEnabled,
      }));
      if (profile.appLanguage) {
        setCurrentLang(profile.appLanguage as Language);
      }
    }
  }, [profile]);

  // Keep React settings synced when offline mode or settings change from Navbar / SyncStatusIndicator / another tab
  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const custom = e as CustomEvent<UserSettings>;
      if (custom.detail) {
        setSettings(custom.detail);
      } else {
        setSettings(getUserSettings());
      }
    };
    const handleOfflineChanged = (e: Event) => {
      const custom = e as CustomEvent<{ offlineModeEnabled?: boolean }>;
      const offlineEnabled =
        typeof custom.detail?.offlineModeEnabled === 'boolean'
          ? custom.detail.offlineModeEnabled
          : getStoredOfflineMode();
      setSettings((prev) => ({ ...prev, offlineModeEnabled: offlineEnabled }));
      setIsOffline(!navigator.onLine || offlineEnabled);
    };

    window.addEventListener('seera_user_settings_updated', handleSettingsUpdated);
    window.addEventListener('seera_offline_mode_changed', handleOfflineChanged);
    return () => {
      window.removeEventListener('seera_user_settings_updated', handleSettingsUpdated);
      window.removeEventListener('seera_offline_mode_changed', handleOfflineChanged);
    };
  }, []);

  // Load language dictionaries dynamically
  useEffect(() => {
    if (currentLang !== 'om') {
      loadLanguage(currentLang).then(() => {
        setSettings((prev) => ({ ...prev }));
      });
    }
  }, [currentLang]);

  // Check Kiosk Mode (Guest public display only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    if (
      path.includes('/kiosk') ||
      path.endsWith('kiosk') ||
      sp.has('kiosk') ||
      sp.get('mode') === 'kiosk' ||
      sp.get('view') === 'kiosk' ||
      sp.get('tab') === 'kiosk'
    ) {
      if (activeTab !== 'kiosk') setActiveTab('kiosk');
      if (!user) {
        signInAsGuest('Courtroom Kiosk Display (Guest)', 'kiosk').catch(() => {});
      }
    }
  }, [user, activeTab, signInAsGuest]);

  // Auto lock inactivity timeout
  useInactivityLock(settings.autoLockTimeout || 0, () => setIsLocked(true));

  const handleUnlock = async () => {
    const res = await signInWithBiometrics();
    if (res.success) setIsLocked(false);
  };

  // Connectivity and sync listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setToast({
        message: currentLang === 'om' ? "⚡ Intarneetiin waan deebi'eef kuusaan seeraa fi murtiiwwan ijibbaataa Sinkii ta'aniiru!" : '⚡ Connection restored! Background sync active.',
        emoji: '🌐',
      });
      setTimeout(() => setToast(null), 5000);
    };

    const handleOffline = () => setIsOffline(true);

    const handleSyncStatus = (e: any) => {
      const detail = e.detail;
      if (detail && detail.syncedDocsCount > 0) {
        if (typeof sessionStorage !== 'undefined') {
          if (sessionStorage.getItem('seera_sync_notification_dispatched') === 'true') {
            return; // Once synced, do not repeat redundantly
          }
          sessionStorage.setItem('seera_sync_notification_dispatched', 'true');
        }
        setToast({
          message: currentLang === 'om' ? `🔄 Kuusaan seeraa background'n Sinkii ta'eera (${detail.syncedDocsCount} docs).` : `🔄 Background sync complete (${detail.syncedDocsCount} docs).`,
          emoji: '🔄',
        });
        setTimeout(() => setToast(null), 4000);
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

  // Periodic Court Deadline Monitor
  useEffect(() => {
    if (!user) return;

    const runDeadlineCheck = async () => {
      try {
        const { checkAndNotifyDeadlines } = await import('./services/courtCaseService');
        await checkAndNotifyDeadlines(user.uid);
      } catch (err) {
        console.warn('Deadline check failed:', err);
      }
    };

    // Initial check
    runDeadlineCheck();

    // Re-check every 15 minutes
    const interval = setInterval(runDeadlineCheck, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Outdated draft listener
  useEffect(() => {
    const handleAlert = (e: any) => setOutdatedDraftAlerts(e.detail);
    window.addEventListener('seera:outdated_draft_alert', handleAlert);
    return () => window.removeEventListener('seera:outdated_draft_alert', handleAlert);
  }, []);

  // Parse state from URL on initial load (no URL-based admin/staff elevation)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase().replace(/^\//, '');
    const tabParam = sp.get('tab');

    if (tabParam === 'courtWork' && (authClaims.isCourtStaff || authClaims.isTrustedAdmin)) {
      setActiveTab('courtWork');
    } else if (tabParam === 'control' && authClaims.isTrustedAdmin) {
      setActiveTab('control');
    }

    const langParam = sp.get('lang');
    if (langParam && (langParam === 'om' || langParam === 'am' || langParam === 'en')) {
      setCurrentLang(langParam as Language);
      saveUserSettings({ appLanguage: langParam as Language });
    }

    if (
      path.includes('kiosk') ||
      sp.has('kiosk') ||
      sp.get('mode') === 'kiosk' ||
      sp.get('view') === 'kiosk' ||
      sp.get('tab') === 'kiosk'
    ) {
      setActiveTab('kiosk');
      if (!user) {
        signInAsGuest('Courtroom Kiosk Display (Guest)', 'kiosk').catch(() => {});
      }
    }

    const meetParam = sp.get('room') || sp.get('meeting') || sp.get('meet');
    if (meetParam || tabParam === 'meeting') {
      setMeetingRoomId(meetParam || 'seera-collab-room-01');
      if (sp.get('topic')) setMeetingTopic(sp.get('topic')!);
      setActiveTab('meeting');
      if (!user) {
        signInAsGuest('Legal Guest Jurist (Guest)', 'meeting').catch(() => {});
      }
    }

    const courtParam = sp.get('courtLink') || sp.get('court') || sp.get('domain') || (path.includes('.') || path.startsWith('mma') ? path : null);
    if (courtParam) {
      const courtDetails = resolveCourtLink(courtParam);
      if (courtDetails) {
        if (courtDetails.slug === 'mmagurbicha') {
          setActiveTab('courtPractice');
          setHideHeader(true);
        } else if (authClaims.isCourtStaff || authClaims.isTrustedAdmin) {
          setActiveTab('courtWork');
        }
      }
    }

    const stateFromUrl = readShareableStateFromUrl();
    if (stateFromUrl) {
      if (stateFromUrl.creator) setCreatorNameState(stateFromUrl.creator);
      if (stateFromUrl.tab) {
        const targetTab = stateFromUrl.tab === 'hordoffii' ? 'analyticsFeedback' : stateFromUrl.tab;
        const hasAdminAccess = authClaims.isTrustedAdmin;
        const hasStaffAccess = authClaims.isCourtStaff || hasAdminAccess;
        if (!isRestrictedTab(targetTab) || hasAdminAccess || (targetTab === 'courtWork' && hasStaffAccess)) {
          setActiveTab(targetTab);
        }
      }
      if (stateFromUrl.lang) {
        setCurrentLang(stateFromUrl.lang);
        saveUserSettings({ appLanguage: stateFromUrl.lang });
      }
      if (stateFromUrl.query) {
        setSearchQuery(stateFromUrl.query);
        if (stateFromUrl.tab === 'explainLaw') setExplainQuery(stateFromUrl.query);
        if (stateFromUrl.tab === 'cassation') setCassationQuery(stateFromUrl.query);
      }
      if (stateFromUrl.caseId) setCaseId(stateFromUrl.caseId);
    }
  }, [user, authClaims.isTrustedAdmin, authClaims.isCourtStaff, signInAsGuest]);

  // Route guest practice sessions safely to the practice sandbox only
  useEffect(() => {
    if (authClaims.isGuest && authClaims.guestMode === 'gurbicha_practice') {
      setActiveTab('courtPractice');
    }
  }, [authClaims.isGuest, authClaims.guestMode]);

  // Sync state to URL and document language
  useEffect(() => {
    syncBrowserUrlWithState({
      tab: activeTab,
      lang: currentLang,
      query: searchQuery || undefined,
      caseId: caseId || undefined,
    }, true);
    document.documentElement.lang = currentLang;
  }, [activeTab, currentLang, searchQuery, caseId]);

  // Track page views
  useEffect(() => {
    if (user && activeTab) {
      analyticsService.trackPageView(activeTab);
    }
  }, [activeTab, user]);

  // Track initial visit
  useEffect(() => {
    if (profile && !sessionStorage.getItem('seera_visit_logged')) {
      const sp = new URLSearchParams(window.location.search);
      const referrerId = sp.get('ref') || sp.get('by') || 'direct';
      trackReferralVisit(referrerId, 'direct', profile.visitorName);
      logRealtimeEvent(
        'visit',
        `User loaded platform: ${navigator.userAgent}`,
        'Onboarding',
        referrerId,
        profile.visitorName
      );
      sessionStorage.setItem('seera_visit_logged', 'true');
    }
  }, [profile]);

  const handleTriggerSave = () => {
    window.dispatchEvent(new CustomEvent('seera:save_current_document'));
    showToast(currentLang === 'om' ? "Sanadni milkaa'inaan kuufameera!" : 'Document Saved!', '💾');
  };

  const handleTriggerPrint = () => {
    window.dispatchEvent(new CustomEvent('seera:print_current_document'));
    showToast(currentLang === 'om' ? 'Qophii Maxxansaa...' : 'Preparing Print...', '🖨️');
  };

  const showToast = (message: string, emoji: string = '⚡') => {
    setToast({ message, emoji });
    setTimeout(() => setToast(null), 2800);
  };

  useGlobalShortcuts({
    onOpenSearch: () => setIsCommandPaletteOpen(true),
    onSave: handleTriggerSave,
    onPrint: handleTriggerPrint,
    onOpenHelp: () => setIsShortcutsOpen(true),
    onCloseModals: () => {
      setIsCommandPaletteOpen(false);
      setIsShortcutsOpen(false);
    },
    onNavigateTab: (tab: string) => {
      setActiveTab(tab);
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  // Listen to custom global app events
  useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.emoji || '⚡');
      }
    };
    const handleNavigateTabEvent = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
        if (e.detail.query) setSearchQuery(e.detail.query);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('seera:show_toast', handleToastEvent);
    window.addEventListener('seera:navigate_tab', handleNavigateTabEvent);

    return () => {
      window.removeEventListener('seera:show_toast', handleToastEvent);
      window.removeEventListener('seera:navigate_tab', handleNavigateTabEvent);
    };
  }, []);

  const handleLanguageChange = (newLang: Language) => {
    setCurrentLang(newLang);
    const updated = saveUserSettings({ appLanguage: newLang });
    setSettings(updated);
    updateProfile({ appLanguage: newLang });
  };

  // Loading state
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-mono text-xs animate-pulse">Initializing Secure Portal...</p>
      </div>
    );
  }

  // Not authenticated landing gate
  if (!user && activeTab !== 'caseStatus' && activeTab !== 'kiosk') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col relative">
        <TopUpdateStickyBanner
          currentLang={currentLang}
          updateInfo={appUpdateInfo}
          onOpenDetails={() => setShowUpdateModal(true)}
        />
        <LandingView
          currentLang={currentLang}
          onJoinMeetingDirectly={(room, topic) => {
            setMeetingRoomId(room || 'seera-collab-room-01');
            if (topic) setMeetingTopic(topic);
            setActiveTab('meeting');
            signInAsGuest('Legal Guest Jurist (Guest)', 'meeting').catch(() => {});
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

  // Domain verification for official deployment link
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isAllowedOrigin =
    !currentOrigin ||
    ALLOWED_ORIGIN_PREFIXES.some((prefix) => currentOrigin.startsWith(prefix) || prefix.startsWith(currentOrigin)) ||
    currentOrigin.includes('run.app') ||
    currentOrigin.includes('aistudio') ||
    currentOrigin.includes('localhost') ||
    currentOrigin.includes('mmurtii');

  if (!isAllowedOrigin && currentOrigin) {
    return (
      <LinkEnforcementOverlay
        currentLang={currentLang}
        targetUrl={currentOrigin || OFFICIAL_BASE_URL}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 font-sans relative">
      {/* Background Watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.035] filter grayscale contrast-125"
          style={{ backgroundImage: `url(${ladyJusticeBg})` }}
        />
      </div>

      {/* System Warning Modal on First Launch */}
      {showWarningModal && (
        <SystemWarningModal
          currentLang={currentLang}
          onClose={() => {
            localStorage.setItem('seera_warning_shown', 'true');
            setShowWarningModal(false);
          }}
        />
      )}

      {/* Biometric App Lock Modal */}
      {isLocked && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-100">App Locked</h2>
            <button
              onClick={handleUnlock}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
            >
              Authenticate
            </button>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      {!hideHeader && activeTab !== 'caseStatus' && activeTab !== 'kiosk' && (
        <Navbar
          currentLang={currentLang}
          onLanguageChange={handleLanguageChange}
          activeTab={activeTab}
          currentState={{
            tab: activeTab,
            lang: currentLang,
            query: searchQuery || undefined,
            caseId: caseId || undefined,
          }}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSearchQuery('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcutsHelp={() => setIsShortcutsOpen(true)}
          onOpenFilingReminder={() => setIsFilingReminderOpen(true)}
        />
      )}

      {/* Scroll-based Reading Progress Indicator at top of content area */}
      <ReadingProgressBar currentLang={currentLang} showPercent />

      {/* Main Content Area */}
      <main className={activeTab === 'caseStatus' ? 'flex-1 w-full' : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24'}>
        {authClaims.isGuest && activeTab !== 'kiosk' && activeTab !== 'caseStatus' && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
            <div>
              <span className="font-bold">👤 Guest Mode Active:</span>{' '}
              <span className="text-slate-300">
                Public statutes, archive & guest practice only. Private documents, court files, and admin panels require a verified Firebase account.
              </span>
            </div>
            <button
              type="button"
              onClick={() => logout(false)}
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
            >
              Sign In with Verified Account
            </button>
          </div>
        )}

        {authClaims.authTier === 'email_unverified' && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-200">
            <div>
              <span className="font-bold">📧 Email Verification Required:</span>{' '}
              <span>
                Verify your email ({user?.email}) to unlock private legal documents and protected workflows.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await resendEmailVerification();
                    showToast('Verification email resent! Check your inbox.', '📧');
                  } catch (e: any) {
                    showToast(e?.message || 'Could not resend verification email.', '⚠️');
                  }
                }}
                className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
              >
                Resend Verification
              </button>
              <button
                type="button"
                onClick={async () => {
                  await user?.reload?.();
                  const updated = await refreshAuthClaims();
                  if (updated.isEmailVerified) {
                    showToast('Email verified! Protected features unlocked.', '✅');
                  } else {
                    showToast('Still unverified. Click the link sent to your email first.', '⏳');
                  }
                }}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] cursor-pointer border border-slate-700"
              >
                Refresh Status
              </button>
            </div>
          </div>
        )}

        {authClaims.authTier === 'phone_authenticated' && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-sky-950/50 border border-sky-500/40 flex flex-wrap items-center justify-between gap-2 text-xs text-sky-200">
            <div>
              <span className="font-bold">📱 Phone Session Active:</span>{' '}
              <span>
                Phone-authenticated accounts can access public tools, local practice, and basic profile settings, but cannot access verified-email-only cloud documents or court staff folders. Sign in with a verified email account for protected cloud storage.
              </span>
            </div>
            <button
              type="button"
              onClick={() => logout(false)}
              className="px-3 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] cursor-pointer"
            >
              Sign In with Email
            </button>
          </div>
        )}

        <ErrorBoundary currentLang={currentLang} onReset={() => setActiveTab('home')}>
          <Suspense fallback={<LoadingFallback currentLang={currentLang} />}>
            {activeTab === 'home' && <HomeView currentLang={currentLang} onNavigate={setActiveTab} />}
            {activeTab === 'assistant' && <HomeView currentLang={currentLang} onNavigate={setActiveTab} />}
            {(activeTab === 'courtModules' || activeTab === 'oiccms') && <CourtModulesView currentLang={currentLang} onNavigate={setActiveTab} />}
            {activeTab === 'create' && <CreateView currentLang={currentLang} defaultOutputLang={settings.defaultOutputLanguage} onNavigateTab={setActiveTab} />}
            {activeTab === 'explainLaw' && <ExplainLawView currentLang={currentLang} initialQuery={explainQuery} />}
            {activeTab === 'cassation' && <CassationLibraryView currentLang={currentLang} initialQuery={cassationQuery} />}
            {activeTab === 'cassationImporter' && <CassationLibraryView currentLang={currentLang} />}
            {activeTab === 'courtWork' && (
              authClaims.isGuest || !authClaims.isEmailVerified ? (
                <div className="max-w-lg mx-auto my-12 p-6 rounded-3xl bg-slate-900 border border-rose-500/40 text-center space-y-4">
                  <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
                  <h2 className="text-lg font-bold text-white">Verified Court Account Required</h2>
                  <p className="text-xs text-slate-300">
                    Guest and unverified accounts cannot access Institutional Court Folders or Court Documents. Please sign in with a verified court staff Firebase account.
                  </p>
                  <button
                    type="button"
                    onClick={() => logout(false)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Switch to Verified Account
                  </button>
                </div>
              ) : (
                <CourtPersonnelFolderView currentLang={currentLang} />
              )
            )}
            {activeTab === 'courtAIDashboard' && (
              authClaims.isCourtStaff || authClaims.isTrustedAdmin ? (
                <CourtAIDashboardView currentLang={currentLang} onNavigateTab={setActiveTab} />
              ) : (
                <div className="max-w-lg mx-auto my-12 p-6 rounded-3xl bg-slate-900 border border-rose-500/40 text-center space-y-3">
                  <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
                  <h2 className="text-base font-bold text-white">Court Staff Claims Required</h2>
                  <p className="text-xs text-slate-300">Court AI Dashboard is restricted to verified court staff with assigned institutional claims.</p>
                </div>
              )
            )}
            {activeTab === 'adminDashboard' && (
              authClaims.isTrustedAdmin ? (
                <AdminDashboardView currentLang={currentLang} onNavigateTab={setActiveTab} />
              ) : (
                <div className="max-w-lg mx-auto my-12 p-6 rounded-3xl bg-slate-900 border border-rose-500/40 text-center space-y-3">
                  <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
                  <h2 className="text-base font-bold text-white">SuperAdmin Custom Claims Required</h2>
                  <p className="text-xs text-slate-300">Admin Dashboard requires verified email and server-issued superadmin claims.</p>
                </div>
              )
            )}
            {activeTab === 'settings' && <SettingsView currentLang={currentLang} onLanguageChange={handleLanguageChange} settings={settings} onSettingsUpdate={setSettings} onNavigateTab={setActiveTab} />}
            {activeTab === 'translate' && <TranslateView currentLang={currentLang} />}
            {activeTab === 'socialMedia' && <SocialMediaView currentLang={currentLang} />}
            {activeTab === 'glossary' && <GlossaryView currentLang={currentLang} initialQuery={glossaryQuery} />}
            {activeTab === 'myContent' && <MyContentView currentLang={currentLang} onOpenDoc={(doc: SavedLegalDocument) => { setActiveDoc(doc); setActiveTab('myContent'); }} />}
            {activeTab === 'documentAnalysis' && <DocumentAnalysisView currentLang={currentLang} initialQuery={docAnalysisQuery} />}
            {activeTab === 'precedentSimulator' && <PrecedentSimulatorView currentLang={currentLang} />}
            {activeTab === 'airtime' && <AirtimeRechargeView currentLang={currentLang} />}
            {activeTab === 'appGuide' && <AppGuideView currentLang={currentLang} onNavigate={setActiveTab} />}
            {activeTab === 'library' && <LibraryView currentLang={currentLang} onNavigateTab={setActiveTab} />}
            {activeTab === 'legislation' && <LegislationRepositoryView currentLang={currentLang} initialSearchQuery={legislationQuery} />}
            {activeTab === 'witness' && <WitnessTestimonyView currentLang={currentLang} />}
            {activeTab === 'templates' && <DocumentTemplatesView currentLang={currentLang} />}
            {activeTab === 'analyticsFeedback' && <AnalyticsFeedbackView currentLang={currentLang} />}
            {activeTab === 'courtroomAssistant' && <CourtroomAssistantView currentLang={currentLang} />}
            {activeTab === 'institutionManagement' && (
              authClaims.isTrustedAdmin || (authClaims.isCourtStaff && authClaims.courtRole === 'court_admin') ? (
                <InstitutionManagementView currentLang={currentLang} />
              ) : (
                <div className="max-w-lg mx-auto my-12 p-6 rounded-3xl bg-slate-900 border border-rose-500/40 text-center space-y-3">
                  <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
                  <h2 className="text-base font-bold text-white">Court Admin Authorization Required</h2>
                  <p className="text-xs text-slate-300">Institution Management requires verified court_admin or superadmin custom claims.</p>
                </div>
              )
            )}
            {activeTab === 'meeting' && <LegalMeetingRoomView currentLang={currentLang} initialRoomId={meetingRoomId} initialTopic={meetingTopic} />}
            {activeTab === 'kiosk' && <KioskView currentLang={currentLang} />}
            {activeTab === 'voice' && <VoiceAndDocumentConverterView currentLang={currentLang} />}

            {(!profile?.legalRole || !['judge', 'prosecutor', 'advocate', 'court_admin'].includes(profile.legalRole)) && (
              <Fragment>
                {activeTab === 'premium' && <PremiumSubscriberDashboardView currentLang={currentLang} />}
                {activeTab === 'comparison' && <LegalComparisonView currentLang={currentLang} />}
                {activeTab === 'bizarre' && <WorldBizarreLawsView currentLang={currentLang} />}
                {activeTab === 'integration' && <IntegrationView currentLang={currentLang} />}
                {activeTab === 'judicialTools' && <JudicialExpertToolsView currentLang={currentLang} />}
                {activeTab === 'expertReview' && <ExpertLegalReviewView currentLang={currentLang} />}
                {activeTab === 'caseRuling' && <CaseRulingAnalysisView currentLang={currentLang} />}
                {activeTab === 'courtSchedule' && <CourtScheduleView currentLang={currentLang} />}
                {activeTab === 'citation' && <LegalCitationFinderView currentLang={currentLang} />}
                {activeTab === 'digitalJustice' && <DigitalJusticeHubView currentLang={currentLang} />}
              </Fragment>
            )}

            {activeTab === 'profile' && <ProfileView currentLang={currentLang} />}
            {activeTab === 'control' && (
              authClaims.isTrustedAdmin ? (
                <ControlDashboardView currentLang={currentLang} />
              ) : (
                <div className="max-w-lg mx-auto my-12 p-6 rounded-3xl bg-slate-900 border border-rose-500/40 text-center space-y-3">
                  <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
                  <h2 className="text-base font-bold text-white">SuperAdmin Custom Claims Required</h2>
                  <p className="text-xs text-slate-300">Master Control Dashboard is restricted to verified administrators.</p>
                </div>
              )
            )}
            {activeTab === 'courtPractice' && <GurbichaCourtPractice currentLang={currentLang} />}
            {activeTab === 'personnelFolder' && (
              authClaims.isGuest || !authClaims.isEmailVerified ? (
                <div className="max-w-lg mx-auto my-12 p-6 rounded-3xl bg-slate-900 border border-rose-500/40 text-center space-y-3">
                  <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
                  <h2 className="text-base font-bold text-white">Verified Court Account Required</h2>
                  <p className="text-xs text-slate-300">Personnel folders require a verified court staff Firebase account.</p>
                </div>
              ) : (
                <CourtPersonnelFolderView currentLang={currentLang} />
              )
            )}
            {activeTab === 'telegramArchive' && <TelegramArchiveSearch language={currentLang} />}
            {activeTab === 'telegramStatus' && <TelegramStatusDashboard currentLang={currentLang} />}
            {activeTab === 'faq' && <LegalHelpFaq currentLang={currentLang} />}
            {activeTab === 'caseStatus' && <CasePublicStatusView currentLang={currentLang} caseId={caseId || ''} onBack={() => setActiveTab('home')} />}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs">
          <p>© 2026 SAI Ethio • SeeraAI | FDRE Proclamation 410/2004 Protected</p>
        </div>
      </footer>

      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-sky-500/60 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <span>{toast.emoji}</span>
          <span className="text-xs font-semibold text-sky-200">{toast.message}</span>
        </div>
      )}

      {/* Global Modals */}
      <Suspense fallback={null}>
        <GlobalCommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          currentLang={currentLang}
          onNavigateTab={setActiveTab}
          onTriggerSave={handleTriggerSave}
          onTriggerPrint={handleTriggerPrint}
        />
        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          currentLang={currentLang}
        />
        <AlwaysAvailableGlossaryPopover currentLang={currentLang} />
        <AIFeedbackFloatingButton currentLang={currentLang} />
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

      {/* Bottom Navigation */}
      {!hideHeader && activeTab !== 'caseStatus' && activeTab !== 'kiosk' && (
        <BottomNavbar
          currentLang={currentLang}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Global Citation Side Panel */}
      <CitationLinkedInstancesPanel currentLang={currentLang} />
    </div>
  );
}
