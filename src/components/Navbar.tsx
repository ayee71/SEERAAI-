import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Scale, Globe, BookOpen, FileText, FileCheck, Sparkles, Languages, Share2, BookmarkCheck, Settings, UploadCloud, Landmark, WifiOff, Menu, X, LogOut, Volume2, RefreshCw, ChevronDown } from 'lucide-react';
import { useCourtBranding } from '../hooks/useCourtBranding';

import { Language, translations } from '../i18n/translations';
import { ShareableAppState } from '../services/shareUrl';
import { ShareButton } from './ShareButton';
import { PWAInstallButton } from './PWAInstallButton';
import { checkForAppUpdate, applyAppUpdate, onAppUpdateAvailable } from '../services/appUpdateService';
const PlayStorePublishGuideModal = lazy(() => import('./PlayStorePublishGuideModal').then(m => ({ default: m.PlayStorePublishGuideModal })));
import { SeeraAILogo } from './SeeraAILogo';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { TtsConfigModal } from './TtsConfigModal';
import { useAuth } from '../context/AuthContext';
import { getStoredOwnerKey } from '../services/referralTracking';
import { isOwnerAccount, isOwnerEmail } from '../services/ownerAuth';
import { RealTimeNotificationSystem } from './RealTimeNotificationSystem';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { EyeComfortQuickControl } from './EyeComfortQuickControl';
import { ThemeToggle } from './ThemeToggle';
import { VoiceCommandModal } from './VoiceCommandModal';
import { isCourtAccessAuthorized, getActiveCourtSession, getLocalInstitutions, ActiveCourtSession } from '../services/courtInstitutionService';
import { isBiometricSessionUnlocked } from '../utils/biometric';
import { AppInboxModal } from './AppInboxModal';
import { KioskQuickAccessModal } from './KioskQuickAccessModal';
import { QRScannerModal } from './QRScannerModal';
import { ConfidentialityShieldModal } from './ConfidentialityShieldModal';
import { isPrivacyShieldActive } from '../services/confidentialityService';


interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentState: ShareableAppState;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenFilingReminder?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  activeTab,
  onTabChange,
  currentState,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  onOpenFilingReminder,
}) => {
  const t = translations[currentLang];
  const { user, profile, logout } = useAuth();
  const branding = useCourtBranding();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showPlayStoreModal, setShowPlayStoreModal] = useState<boolean>(false);
  const [isVoiceCommandOpen, setIsVoiceCommandOpen] = useState<boolean>(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState<boolean>(false);
  const [showTtsModal, setShowTtsModal] = useState<boolean>(false);
  const [showInboxModal, setShowInboxModal] = useState<boolean>(false);
  const [showKioskModal, setShowKioskModal] = useState<boolean>(false);
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  const [showConfidentialityModal, setShowConfidentialityModal] = useState<boolean>(false);
  const [isShieldActiveState, setIsShieldActiveState] = useState<boolean>(isPrivacyShieldActive());

  useEffect(() => {
    const handleShieldUpdate = () => setIsShieldActiveState(isPrivacyShieldActive());
    window.addEventListener('seera_confidentiality_settings_changed', handleShieldUpdate);
    return () => window.removeEventListener('seera_confidentiality_settings_changed', handleShieldUpdate);
  }, []);

  // Exclusively verify if the logged in user email or link identity is the platform owner (Ayele)
  const currentUserEmail = (
    user?.email ||
    (profile as any)?.email ||
    localStorage.getItem('seera_owner_email') ||
    localStorage.getItem('seera_cached_email') ||
    ''
  ).toLowerCase().trim();

  const isOwner = isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );

  const isExplicitOwner =
    isOwner ||
    isOwnerEmail(currentUserEmail) ||
    currentUserEmail === 'ayeledha@gmail.com' ||
    currentUserEmail === 'ayele@saiethio.com' ||
    currentUserEmail === 'ayeledha@saiethio.com';

  // Real-time tracking of Premium subscription status
  const [hasPremiumLicense, setHasPremiumLicense] = useState<boolean>(() => {
    return localStorage.getItem('seera_is_premium') === 'true';
  });

  const [isCourtAuth, setIsCourtAuth] = useState<boolean>(isCourtAccessAuthorized());
  const [activeCourtSession, setActiveCourtSessionState] = useState<ActiveCourtSession | null>(getActiveCourtSession());

  // Strictly enforce: Gurbicha court staff identity ONLY appears when logged in with email gurbicha@gmail.com
  const isGurbichaUser =
    !isExplicitOwner &&
    currentUserEmail === 'gurbicha@gmail.com';

  useEffect(() => {
    const handleCourtAuthUpdate = () => {
      setIsCourtAuth(isCourtAccessAuthorized());
      setActiveCourtSessionState(getActiveCourtSession());
    };
    window.addEventListener('seera_court_session_changed', handleCourtAuthUpdate);
    return () => window.removeEventListener('seera_court_session_changed', handleCourtAuthUpdate);
  }, []);

  // Filter out any stale court session if the current user is not logged in with matching court/staff credentials.
  // Unauthenticated link visitors will see a clean Public/Court Services header without any pre-selected court badge.
  const sessionUserEmail = activeCourtSession?.user?.emailOrUsername?.toLowerCase().trim();
  const isSessionOwnerOrStaffMatch = 
    isExplicitOwner ||
    (currentUserEmail && sessionUserEmail && currentUserEmail === sessionUserEmail) ||
    (isGurbichaUser && sessionUserEmail?.includes('gurbicha'));

  const validCourtSession = activeCourtSession && isSessionOwnerOrStaffMatch
    ? activeCourtSession
    : null;

  // Resolve active court institution and court staff identity for top navbar header display
  const allInstitutions = getLocalInstitutions();
  const currentInstitution = validCourtSession
    ? allInstitutions.find((i) => i.id === validCourtSession.institutionId)
    : allInstitutions[0];

  const courtLogoUrl =
    branding.logoUrl ||
    currentInstitution?.logoUrl ||
    (profile as any)?.courtLogoUrl ||
    (validCourtSession ? localStorage.getItem(`court_logo_${validCourtSession.institutionId}`) : null);

  const activeCourtName = isExplicitOwner
    ? (currentLang === 'am' ? 'የሴራአይ ማስተር ኮንትሮል' : currentLang === 'en' ? 'SeeraAI Master Control' : 'Sirna Bulchiinsa SeeraAI')
    : isGurbichaUser
    ? 'Mana Murtii Aanaa Gurbicha'
    : validCourtSession?.courtName || currentInstitution?.customCourtName || currentInstitution?.name || 'Mana Murtii Aanaa Adaamaa';

  const activeUserFullName = isExplicitOwner
    ? (profile?.visitorName || 'Ayele Be Dha')
    : isGurbichaUser
    ? (validCourtSession?.user.fullName || 'Admin Mana Murtii Aanaa Gurbicha')
    : validCourtSession?.user.fullName || profile?.visitorName || user?.displayName || user?.email || 'User';

  const activeUserCourtRole = isExplicitOwner
    ? 'superadmin'
    : isGurbichaUser
    ? (validCourtSession?.user.role || 'court_admin')
    : validCourtSession?.user.role || (profile as any)?.courtRole || profile?.role || 'court_personnel';

  const getFormattedCourtRoleLabel = (roleStr?: string | null, lang: Language = 'om') => {
    if (!roleStr) return null;
    const norm = roleStr.toLowerCase();

    if (norm.includes('superadmin') || norm === 'superadmin') {
      return lang === 'am' ? '👑 የመተግበሪያው ባለቤት' : lang === 'en' ? '👑 App Owner' : '👑 Abbaa Appichaa';
    }
    if (norm.includes('judge') || norm === 'judge') {
      return lang === 'am' ? '⚖️ ዳኛ' : lang === 'en' ? '⚖️ Judge' : '⚖️ Abbaa Seeraa';
    }
    if (norm.includes('assistant') || norm === 'assistant_judge') {
      return lang === 'am' ? '⚖️ ረዳት ዳኛ' : lang === 'en' ? '⚖️ Asst. Judge' : '⚖️ Gargaaraa Abbaa Seeraa';
    }
    if (norm.includes('registrar') || norm === 'registrar') {
      return lang === 'am' ? '📋 መዝጋቢ' : lang === 'en' ? '📋 Registrar' : '📋 Galmeessaa';
    }
    if (norm.includes('auditor') || norm === 'auditor') {
      return lang === 'am' ? '📊 ኦዲተር' : lang === 'en' ? '📊 Auditor' : '📊 Auditor';
    }
    if (norm.includes('expert') || norm === 'legal_expert' || norm === 'prosecutor') {
      return lang === 'am' ? '📜 የሕግ ባለሙያ' : lang === 'en' ? '📜 Legal Expert' : '📜 Ogeessa Seeraa';
    }
    if (norm.includes('admin') || norm === 'court_admin') {
      return lang === 'am' ? '🏛️ የፍርድ ቤት አስተዳዳሪ' : lang === 'en' ? '🏛️ Court Admin' : '🏛️ Bulchaa Mana Murtii';
    }
    if (norm.includes('personnel') || norm === 'court_personnel') {
      return lang === 'am' ? '⚖️ የፍርድ ቤት ሠራተኛ' : lang === 'en' ? '⚖️ Court Staff' : '⚖️ Hojjetaa Mana Murtii';
    }
    return `🏛️ ${roleStr}`;
  };

  useEffect(() => {
    const checkPremium = () => {
      setHasPremiumLicense(localStorage.getItem('seera_is_premium') === 'true');
    };
    window.addEventListener('storage', checkPremium);
    window.addEventListener('seera_premium_updated', checkPremium);
    return () => {
      window.removeEventListener('storage', checkPremium);
      window.removeEventListener('seera_premium_updated', checkPremium);
    };
  }, []);

  const [updateChecking, setUpdateChecking] = useState<boolean>(false);
  const [updateToast, setUpdateToast] = useState<string | null>(null);
  const [hasUpdateReady, setHasUpdateReady] = useState<boolean>(false);

  useEffect(() => {
    return onAppUpdateAvailable((info) => {
      setHasUpdateReady(info.isUpdateAvailable);
    });
  }, []);

  const handleCheckForUpdates = async () => {
    setUpdateChecking(true);
    try {
      const res = await checkForAppUpdate(true);
      if (res.isUpdateAvailable) {
        await applyAppUpdate();
      } else {
        setUpdateToast(t.actions.appUpToDate || 'App is Up to Date ✓');
        setTimeout(() => setUpdateToast(null), 3000);
      }
    } catch {
      setUpdateToast('App is Up to Date ✓');
      setTimeout(() => setUpdateToast(null), 2500);
    } finally {
      setUpdateChecking(false);
    }
  };

  const isPremium = isOwner || profile?.role === 'premium' || (profile as any)?.subscriptionTier === 'premium' || (profile as any)?.isPremium === true || hasPremiumLicense;
  const subscriptionStatus = isPremium ? 'Premium' : 'Free';

  // Active personal username or email for top navbar logo header display (with privacy protection)
  const activeUserIdentifier =
    profile?.appUsername ? `@${profile.appUsername}` :
    profile?.visitorName ? profile.visitorName :
    'User';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const baseNavItems = [
    { id: 'home', label: t.nav.home, emoji: '🏠' },
    { 
      id: 'courtWork', 
      label: currentLang === 'om' ? '📁 Fooldara Mana Murtii (Court Folder)' : currentLang === 'am' ? '📁 የፍርድ ቤት ማህደር' : '📁 Court Personnel Folder', 
      emoji: isCourtAuth ? '🏛️' : '🔒' 
    },
    { id: 'create', label: t.nav.create, emoji: '✍️' },
    { 
      id: 'citation', 
      label: currentLang === 'om' ? 'Wabii Seeraa (Citation Finder)' : currentLang === 'am' ? 'የሕግ ድንጋጌዎች መፈለጊያ' : 'Citation Finder', 
      emoji: '🔍' 
    },
    { id: 'templates', label: t.nav.templates, emoji: '📝' },
    { id: 'explainLaw', label: t.nav.explainLaw, emoji: '⚖️' },
    { id: 'documentAnalysis', label: t.nav.docAnalysis, emoji: '📄' },
    { id: 'translate', label: t.nav.translate, emoji: '🌐' },
    { id: 'socialMedia', label: t.nav.social, emoji: '📱' },
    { id: 'glossary', label: t.nav.glossary, emoji: '📖' },
    { id: 'comparison', label: t.nav.compareLaw, emoji: '⚖️' },
    { 
      id: 'bizarre', 
      label: currentLang === 'om' ? 'Seerota Addunyaa' : currentLang === 'am' ? 'አስገራሚ የዓለም ሕጎች' : 'Bizarre World Laws', 
      emoji: '🌍' 
    },
    { 
      id: 'airtime', 
      label: currentLang === 'om' ? 'Airtime Request' : 'የስልክ ካርድ ጥያቄ', 
      emoji: '📲' 
    },
    { id: 'integration', label: t.nav.integration, emoji: '⚡' },
    { 
      id: 'meeting', 
      label: currentLang === 'om' ? 'Walgahii & Marii (Meeting)' : currentLang === 'am' ? 'የስብሰባ እና ውይይት ክፍል' : 'Meeting & Live Conference', 
      emoji: '📹' 
    },
    { id: 'myContent', label: t.nav.myContent, emoji: '📁' },
    { id: 'profile', label: currentLang === 'om' ? 'Profaayilii' : 'መገለጫ', emoji: '👤' },
  ];

  // Only append Admin Dashboard & Hordoffii if the logged in user is owner Ayele
  const navItems = isOwner
    ? [
        ...baseNavItems,
        { id: 'adminDashboard', label: 'Admin Dashboard', emoji: '🛡️' },
        { id: 'courtroomControl', label: 'Courtroom Control', emoji: '⚙️' },
        { id: 'courtroomKiosk', label: 'Courtroom Kiosk', emoji: '📹' },
        { id: 'analyticsFeedback', label: t.nav.analyticsFeedback || 'Hordoffii & Inbox', emoji: '📊' },
        { id: 'settings', label: t.nav.settings, emoji: '⚙️' }
      ]
    : [...baseNavItems, { id: 'settings', label: t.nav.settings, emoji: '⚙️' }];

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 pb-1.5 md:pb-0">
        {/* Offline Status Banner */}
        {!isOnline && (
          <div className="bg-amber-950 border-b border-amber-500/40 px-4 py-1.5 text-center text-xs text-amber-200 font-medium flex flex-wrap items-center justify-center gap-2">
            <span>⚠️</span>
            <span>You are offline (Navigator.onLine: false). Saved library and offline mode active.</span>
            <SyncStatusIndicator currentLang={currentLang} variant="compact" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Integrated Court Institution & User Role Badge */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => onTabChange('home')}
                className="flex items-center group text-left transition-all py-1.5 cursor-pointer min-h-[44px]"
              >
                <SeeraAILogo size="md" currentLang={currentLang} />
              </button>

              {/* Header Identity Badge (Red Circled Top Bar Region in Screenshot):
                  - If App Owner: Displays 👑 Ayele Be Dha | 👑 Abbaa Appichaa & Master Control
                  - If gurbicha@gmail.com: Displays 🏛️ Mana Murtii Aanaa Gurbicha | ⚖️ Hojjetaa Mana Murtii
                  - If other verified court session: Displays that institution's name and role
                  - If public visitor: Displays clean Court Services portal button
              */}
              {isExplicitOwner ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => onTabChange('adminDashboard')}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-700/20 border-2 border-amber-400 hover:border-amber-300 flex items-center justify-center text-amber-300 text-base shadow-md transition-all cursor-pointer shrink-0 hover:scale-105"
                    title={currentLang === 'am' ? 'የሴራአይ ባለቤት: አየለ በ ዳ' : currentLang === 'en' ? 'App Owner: Ayele Be Dha' : 'Abbaa Appichaa: Ayele Be Dha'}
                  >
                    👑
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('adminDashboard')}
                    className="px-2.5 py-1 rounded-2xl bg-gradient-to-r from-amber-500/15 to-amber-600/10 hover:from-amber-500/25 hover:to-amber-600/20 border border-amber-500/50 hover:border-amber-400 text-left transition-all cursor-pointer flex flex-col gap-0.5 shadow-sm max-w-[175px] sm:max-w-[260px] shrink-0"
                    title="Abbaa Qabeenyaa & SuperAdmin: Ayele Be Dha"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[11px] sm:text-xs font-bold text-amber-300 truncate">
                        {profile?.visitorName || 'Ayele Be Dha'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold font-mono bg-amber-500/25 text-amber-300 border border-amber-500/50 shrink-0">
                        {currentLang === 'am' ? '👑 የመተግበሪያው ባለቤት' : currentLang === 'en' ? '👑 App Owner' : '👑 Abbaa Appichaa'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-300 font-mono truncate">
                      <span className="text-amber-400">🛡️</span>
                      <span className="truncate">
                        {currentLang === 'am' ? 'ሱፐር አድሚን • Master Control' : currentLang === 'en' ? 'SuperAdmin • Master Control' : 'SuperAdmin • Master Control'}
                      </span>
                    </div>
                  </button>
                </div>
              ) : isGurbichaUser ? (
                /* Strictly only shown when logged in with email gurbicha@gmail.com */
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {courtLogoUrl ? (
                    <button
                      type="button"
                      onClick={() => onTabChange('courtWork')}
                      className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-950 border-2 border-amber-500/50 hover:border-amber-400 p-0.5 flex items-center justify-center overflow-hidden shadow-lg transition-all cursor-pointer shrink-0 group"
                      title="Mana Murtii Aanaa Gurbicha"
                    >
                      <img
                        src={courtLogoUrl}
                        alt="Court Logo"
                        className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[7px] font-bold text-slate-950">
                        ✓
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onTabChange('courtWork')}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-300 text-sm font-bold shadow-sm transition-all cursor-pointer shrink-0"
                      title="Mana Murtii Aanaa Gurbicha"
                    >
                      🏛️
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onTabChange('courtWork')}
                    className="px-2.5 py-1 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-left transition-all cursor-pointer flex flex-col gap-0.5 shadow-sm max-w-[170px] sm:max-w-[260px] shrink-0"
                    title={`Mana Murtii: Mana Murtii Aanaa Gurbicha | Hojjetaa: ${activeUserFullName} | Gahee: ${activeUserCourtRole}`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[11px] sm:text-xs font-bold text-amber-300 truncate">
                        {activeUserFullName}
                      </span>
                      {activeUserCourtRole && (
                        <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                          {getFormattedCourtRoleLabel(activeUserCourtRole, currentLang)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-300 font-mono truncate">
                      <span className="text-amber-400">🏛️</span>
                      <span className="truncate">Mana Murtii Aanaa Gurbicha</span>
                    </div>
                  </button>
                </div>
              ) : validCourtSession ? (
                /* Verified session for another institutional court (e.g. Adama, Supreme Court) */
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => onTabChange('courtWork')}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-300 text-sm font-bold shadow-sm transition-all cursor-pointer shrink-0"
                    title={activeCourtName}
                  >
                    🏛️
                  </button>
                  <button
                    type="button"
                    onClick={() => onTabChange('courtWork')}
                    className="px-2.5 py-1 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-left transition-all cursor-pointer flex flex-col gap-0.5 shadow-sm max-w-[170px] sm:max-w-[260px] shrink-0"
                    title={`Mana Murtii: ${activeCourtName} | Hojjetaa: ${activeUserFullName}`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[11px] sm:text-xs font-bold text-amber-300 truncate">
                        {activeUserFullName}
                      </span>
                      {activeUserCourtRole && (
                        <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                          {getFormattedCourtRoleLabel(activeUserCourtRole, currentLang)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-300 font-mono truncate">
                      <span className="text-amber-400">🏛️</span>
                      <span className="truncate">{activeCourtName}</span>
                    </div>
                  </button>
                </div>
              ) : (
                /* Public / Non-court Jurist View */
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onTabChange('courtWork')}
                    className="px-2.5 py-1.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    title={currentLang === 'am' ? 'የፍርድ ቤት አገልግሎቶች' : currentLang === 'en' ? 'Court Services' : 'Tajaajila Mana Murtii'}
                  >
                    <span className="text-amber-400 text-xs">🏛️</span>
                    <span className="text-[11px] font-medium text-slate-300 hover:text-white">
                      {currentLang === 'am' ? 'የፍርድ ቤት አገልግሎት' : currentLang === 'en' ? 'Court Services' : 'Tajaajila Mana Murtii'}
                    </span>
                  </button>
                </div>
              )}

            </div>

            {/* Action Tools: Share Link & Language Selector */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Global Command Palette & Search Shortcut Button (Ctrl+K) */}
              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer transition-all shadow-sm group"
                  title="Barbaacha Waliigalaa (Global Search & Commands / Ctrl+K)"
                >
                  <span>🔍</span>
                  <span className="hidden lg:inline text-slate-400 group-hover:text-slate-200">
                    {currentLang === 'om' ? 'Barbaadi...' : currentLang === 'am' ? 'ፈልግ...' : 'Search...'}
                  </span>
                  <kbd className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] font-mono text-amber-300 font-bold">
                    Ctrl+K
                  </kbd>
                </button>
              )}

              {/* Keyboard Shortcuts Cheat Sheet Button (Ctrl+/) */}
              {onOpenShortcutsHelp && (
                <button
                  type="button"
                  onClick={onOpenShortcutsHelp}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-300 text-xs font-semibold cursor-pointer transition-all shadow-sm"
                  title="Qaxxaamura Qubee (Keyboard Shortcuts / Ctrl+/)"
                >
                  <span>⌨️</span>
                  <kbd className="hidden xl:inline text-[10px] font-mono text-slate-400">Ctrl+/</kbd>
                </button>
              )}

              {/* Filing Reminder Button */}
              {onOpenFilingReminder && (
                <button
                  type="button"
                  onClick={onOpenFilingReminder}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 text-xs font-semibold cursor-pointer transition-all shadow-sm"
                  title="Beellama Dhiyeessa & Beeksisa (Filing Reminders 24h/48h)"
                >
                  <span>🔔</span>
                  <span className="hidden md:inline">Reminders</span>
                </button>
              )}

              {/* Legal Confidentiality & Privacy Shield Button (FDRE Const. Art. 26 / CPC Art. 176) */}
              <button
                type="button"
                onClick={() => setShowConfidentialityModal(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm relative ${
                  isShieldActiveState
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={
                  currentLang === 'am' 
                    ? 'የሕግ ሚስጥራዊነት እና የውሂብ ጥበቃ (አንቀጽ 26 / 176)' 
                    : currentLang === 'en' 
                    ? 'Legal Confidentiality & Privacy Shield (Art. 26 / 176)' 
                    : 'Eegumsa Iccitii Seeraa (Heera Kwt. 26 / SAFY Kwt. 176)'
                }
              >
                <span>🛡️</span>
                <span className="hidden md:inline text-[11px] font-semibold">
                  {currentLang === 'om' ? 'Iccitummaa' : currentLang === 'am' ? 'ሚስጥራዊነት' : 'Privacy'}
                </span>
                <span className={`w-2 h-2 rounded-full ${isShieldActiveState ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              </button>

              {/* Quick Eye Comfort & Brightness Control */}
              <EyeComfortQuickControl currentLang={currentLang} />
              <ThemeToggle />

              {/* Voice Command Button */}
              <button
                type="button"
                onClick={() => setIsVoiceCommandOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer transition-all shadow-sm"
                title="Ajaja Sagalee (Voice Command)"
              >
                <span>🎙️</span>
                <span className="hidden lg:inline font-mono text-[11px]">Voice</span>
              </button>

              {/* Real-time In-App Legal Update Notification Bell */}
              <RealTimeNotificationSystem
                currentLang={currentLang}
                onNavigateTab={onTabChange}
              />

              {/* Court QR Code Scanner Button */}
              <button
                type="button"
                onClick={() => setShowQrScanner(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold cursor-pointer transition-all shadow-sm"
                title="Sakatta'aa QR Koodii (QR Code Scanner)"
              >
                <span>📷</span>
                <span className="hidden sm:inline font-mono text-[11px]">
                  {currentLang === 'om' ? 'QR Scan' : currentLang === 'am' ? 'QR ስካን' : 'QR Scan'}
                </span>
              </button>

              {/* Kiosk Access Link & Code Button */}
              <button
                type="button"
                onClick={() => setShowKioskModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold cursor-pointer transition-all shadow-sm"
                title="Linkii & Koodii Kiosk Dhaddacha Mana Murtii (Courtroom Kiosk Access Link & Code)"
              >
                <span>📱</span>
                <span className="hidden sm:inline font-mono text-[11px]">
                  {currentLang === 'om' ? 'Linkii Kiosk' : 'ኪዮስክ ሊንክ'}
                </span>
              </button>

              <KioskQuickAccessModal
                currentLang={currentLang}
                isOpen={showKioskModal}
                onClose={() => setShowKioskModal(false)}
              />

              {showQrScanner && (
                <QRScannerModal
                  currentLang={currentLang}
                  onClose={() => setShowQrScanner(false)}
                />
              )}

              {/* App Confirmation Code Inbox Button */}
              <button
                type="button"
                onClick={() => setShowInboxModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-bold cursor-pointer transition-all shadow-sm relative"
                title="Sanduuqa Ergaa / In-App Inbox"
              >
                <span>📥</span>
                <span className="hidden md:inline text-[11px]">Inbox</span>
              </button>

              <AppInboxModal
                currentLang={currentLang}
                isOpen={showInboxModal}
                onClose={() => setShowInboxModal(false)}
                userEmail={user?.email || undefined}
              />

              <ConfidentialityShieldModal
                isOpen={showConfidentialityModal}
                onClose={() => setShowConfidentialityModal(false)}
                currentLang={currentLang}
              />

              {/* Check for App Updates Button */}
              <button
                type="button"
                onClick={handleCheckForUpdates}
                disabled={updateChecking}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm relative ${
                  hasUpdateReady
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/30'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-300 hover:text-amber-300'
                }`}
                title={hasUpdateReady ? t.actions.updateAvailable : t.actions.checkUpdate}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${updateChecking ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden md:inline text-[11px]">
                  {hasUpdateReady ? t.actions.updateNow : 'Update'}
                </span>
                {hasUpdateReady && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-1 -right-1 ring-2 ring-slate-950 animate-ping" />
                )}
              </button>

              {/* Quick Update Notification Toast */}
              {updateToast && (
                <div className="fixed top-16 right-4 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2">
                  {updateToast}
                </div>
              )}

              {/* User Profile Summary Badge with Subscription Status */}
              <div 
                onClick={() => onTabChange('profile')}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800 cursor-pointer transition-colors"
                title={`Profaayilii & Settings (${subscriptionStatus})`}
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs uppercase shrink-0 overflow-hidden">
                    {profile?.photoUrl ? (
                      <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      profile?.visitorName?.charAt(0) || activeUserIdentifier.charAt(0) || '👤'
                    )}
                  </div>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-slate-200 truncate max-w-[100px]">
                    {profile?.visitorName || activeUserIdentifier || (currentLang === 'om' ? 'Keessummaa' : currentLang === 'am' ? 'እንግዳ' : 'User')}
                  </span>
                  <span className="text-[9px] text-amber-400/90 font-mono truncate max-w-[100px]">
                    {activeUserIdentifier || 'seera.ai'}
                  </span>
                </div>
                {/* Visual Subscription Status Badge */}
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border flex items-center gap-1 shrink-0 ${
                    isPremium
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title={`Current Subscription: ${subscriptionStatus}`}
                >
                  <span>{isPremium ? '⭐' : '🌱'}</span>
                  <span>{subscriptionStatus}</span>
                </span>
              </div>

              {/* Explicit Log Out / Log In Button */}
              {user ? (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
                  title={currentLang === 'om' ? 'Kaawuntii keessaa ba\'i (Log Out)' : currentLang === 'am' ? 'ከአካውንት ይውጡ (Log Out)' : 'Log Out'}
                >
                  <span>🚪</span>
                  <span className="hidden sm:inline">
                    {currentLang === 'om' ? 'Ba\'i (Log Out)' : currentLang === 'am' ? 'ውጣ' : 'Log Out'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onTabChange('profile')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow shrink-0"
                  title={currentLang === 'om' ? 'Seeni (Log In)' : currentLang === 'am' ? 'ይግቡ (Log In)' : 'Log In'}
                >
                  <span className="text-sm">🔑</span>
                  <span>
                    {currentLang === 'om' ? 'Seeni (Log In)' : currentLang === 'am' ? 'ይግቡ' : 'Log In'}
                  </span>
                </button>
              )}

              {/* Connection Status & Granular AI Availability Indicator */}
              <ConnectionStatusIndicator currentLang={currentLang} />

              {/* Legal Documents Offline Sync Status Indicator */}
              <SyncStatusIndicator currentLang={currentLang} variant="compact" />

              {/* PWA / Android Play Store Install Button */}
              <PWAInstallButton currentLang={currentLang} variant="navbar" />

              {/* Owner Play Store Console Packaging Modal */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowPlayStoreModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold cursor-pointer transition-all"
                  title="Google Play Store Packaging"
                >
                  <span>▶️</span>
                  <span>Play Store</span>
                </button>
              )}

              {/* Quick Eye Comfort & Brightness Control */}
              <EyeComfortQuickControl currentLang={currentLang} />
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setShowTtsModal(true)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
                title="TTS Voice Profile Settings"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span className="hidden xl:inline">Voice</span>
              </button>

              {/* Copy Shareable Link Button */}
              <ShareButton
                currentLang={currentLang}
                currentState={currentState}
                variant="navbar"
              />

              {/* Global Language Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-inner min-h-[40px]"
                  title="Select Language / Afaan / ቋንቋ"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {currentLang === 'om' ? 'Oromoo' : currentLang === 'am' ? 'አማርኛ' : 'English'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      {currentLang === 'om' ? 'Afaan Filadhu' : currentLang === 'am' ? 'ቋንቋ ይምረጡ' : 'Select Language'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onLanguageChange('om');
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-medium flex items-center justify-between hover:bg-slate-900 transition-colors cursor-pointer ${
                        currentLang === 'om' ? 'text-amber-400 font-bold bg-slate-900/60' : 'text-slate-300'
                      }`}
                    >
                      <span>Oromoo (Afaan Oromoo)</span>
                      {currentLang === 'om' && <span className="text-amber-400 font-bold">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLanguageChange('am');
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-ethiopic font-medium flex items-center justify-between hover:bg-slate-900 transition-colors cursor-pointer ${
                        currentLang === 'am' ? 'text-amber-400 font-bold bg-slate-900/60' : 'text-slate-300'
                      }`}
                    >
                      <span>አማርኛ (Amharic)</span>
                      {currentLang === 'am' && <span className="text-amber-400 font-bold">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLanguageChange('en');
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-medium flex items-center justify-between hover:bg-slate-900 transition-colors cursor-pointer ${
                        currentLang === 'en' ? 'text-amber-400 font-bold bg-slate-900/60' : 'text-slate-300'
                      }`}
                    >
                      <span>English</span>
                      {currentLang === 'en' && <span className="text-amber-400 font-bold">✓</span>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Bar Items */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-2.5 no-scrollbar border-t border-slate-800/60 text-sm">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isCourtBenchItem = ['courtWork'].includes(item.id);
              
              // Strict Enforce: authenticated users with 'court_personnel' role or isOwner
              const firestoreRole = profile?.role || profile?.legalRole;
              const hasStrictPersonnelRole = isOwner || firestoreRole === 'court_personnel' || firestoreRole === 'admin' || firestoreRole === 'judge';
              const isLocked = isCourtBenchItem && !isCourtAuth && !hasStrictPersonnelRole;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap font-medium text-xs sm:text-sm transition-all cursor-pointer min-h-[42px] ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title={isLocked ? 'Hojjataa Mana Murtii "court_personnel" Qofaaf Eeyyamame' : item.label}
                >
                  <span className="text-base">{item.emoji}</span>
                  <span>{item.label}</span>
                  {isLocked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold flex items-center gap-0.5 border border-rose-500/30">
                      <span>🔒</span>
                      <span className="hidden xl:inline text-[9px]">Staff</span>
                    </span>
                  )}
                  {isCourtBenchItem && (isCourtAuth || hasStrictPersonnelRole) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold flex items-center gap-0.5 border border-emerald-500/30">
                      <span>✓</span>
                      <span className="hidden xl:inline text-[9px]">Authorized</span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Google Play Store / Android Packaging Guide Modal */}
      <Suspense fallback={null}>
        <PlayStorePublishGuideModal
          currentLang={currentLang}
          isOpen={showPlayStoreModal}
          onClose={() => setShowPlayStoreModal(false)}
        />
      </Suspense>

      {/* Voice Command Modal */}
      <VoiceCommandModal
        isOpen={isVoiceCommandOpen}
        onClose={() => setIsVoiceCommandOpen(false)}
        onNavigateTab={onTabChange}
        currentLang={currentLang}
      />

      {/* TTS Voice Profile Configuration Modal */}
      {showTtsModal && (
        <TtsConfigModal currentLang={currentLang} onClose={() => setShowTtsModal(false)} />
      )}
    </>
  );
};
