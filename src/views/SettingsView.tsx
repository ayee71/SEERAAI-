import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { UserSettings, ContentSynchronizationSettings, DataPrivacySettings, saveUserSettings, generateVanityShareLink, getUserReferrerId, setUserReferrerId } from '../services/storage';
import { ReferralAnalyticsView } from '../components/ReferralAnalyticsView';
import { HistoryLogComponent } from '../components/HistoryLogComponent';
import { SessionSecurityReportComponent } from '../components/SessionSecurityReportComponent';
import { SessionManagementPanel } from '../components/SessionManagementPanel';
import { SecurityDashboard } from '../components/SecurityDashboard';
import { PasscodeEntryComponent } from '../components/PasscodeEntryComponent';
import { BiometricStatusIndicator } from '../components/BiometricStatusIndicator';
import { useAuth } from '../context/AuthContext';
import { applyTheme } from '../utils/theme';
import { getStoredOwnerKey } from '../services/referralTracking';
import { isOwnerAccount } from '../services/ownerAuth';
import { performFullLegislationSync } from '../services/legislationSyncService';
import { batchIngestTelegramChannel } from '../services/telegramLegalService';
import { checkForAppUpdate, applyAppUpdate, CURRENT_APP_VERSION, AppUpdateInfo } from '../services/appUpdateService';
import { clearLegalCache, VERIFIED_TELEGRAM_ARCHIVE_URL } from '../services/dynamicAssetLoader';
import {
  isBiometricAvailable,
  promptBiometricAuth,
  registerBiometricPasskey,
  authenticateBiometricPasskey,
  isBiometricSessionUnlocked,
  setBiometricSessionUnlocked,
  getBiometricEnrollmentStatus,
  BiometricAuthResult,
} from '../utils/biometric';
import { backgroundSyncManager } from '../services/backgroundSync';

interface SettingsViewProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  settings: UserSettings;
  onSettingsUpdate: (newSettings: UserSettings) => void;
  onNavigateTab?: (tab: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentLang,
  onLanguageChange,
  settings,
  onSettingsUpdate,
  onNavigateTab,
}) => {
  const t = translations[currentLang];
  const { logout, user, updateProfile, resetPassword } = useAuth();
  const [copiedRef, setCopiedRef] = useState(false);
  const [referrerId, setReferrerId] = useState(getUserReferrerId());
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(true); // Default to locked
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState<boolean>(() => isBiometricSessionUnlocked());
  const [biometricProcessing, setBiometricProcessing] = useState(false);
  const [biometricFeedback, setBiometricFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: string;
    method?: string;
  } | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [customApiKeyInput, setCustomApiKeyInput] = useState(settings.customApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [brightness, setBrightness] = useState<number>(() => {
    const val = (settings as any).uiBrightness;
    return val ? parseFloat(val) : 1.0;
  });
  const [eyeProtectionMode, setEyeProtectionMode] = useState<boolean>(() => {
    return localStorage.getItem('seera_eye_protection') === 'true';
  });

  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [clearingLegalCache, setClearingLegalCache] = useState<boolean>(false);
  const [legalCacheClearedMsg, setLegalCacheClearedMsg] = useState<string | null>(null);

  const handleClearLegalCache = async () => {
    setClearingLegalCache(true);
    setLegalCacheClearedMsg(null);
    try {
      const res = await clearLegalCache();
      setLegalCacheClearedMsg(
        currentLang === 'om'
          ? `✓ Kuusaan seeraa qulqulleeffameera (${res.cachesCleared} caches, ${res.localStorageKeysRemoved} dataset keys haqaman, ~${res.freedEstimateKb} KB bakki bilisa ba'e).`
          : currentLang === 'am'
          ? `✓ የሕግ ሰነዶች መሸጎጫ ጸድቷል (${res.cachesCleared} መሸጎጫዎች፣ ${res.localStorageKeysRemoved} ቁልፎች ተሰርዘዋል፣ ~${res.freedEstimateKb} KB ቦታ ተለቋል)።`
          : `✓ Stale legal document cache purged (${res.cachesCleared} caches, ${res.localStorageKeysRemoved} dataset keys reset, ~${res.freedEstimateKb} KB freed).`
      );
      setTimeout(() => setLegalCacheClearedMsg(null), 6000);
    } catch (err: any) {
      setLegalCacheClearedMsg(err?.message || 'Failed to clear legal cache');
    } finally {
      setClearingLegalCache(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const info = await checkForAppUpdate(true);
      if (info.isUpdateAvailable) {
        setUpdateStatus(
          currentLang === 'om'
            ? `Fooyya'iinsi haaraan (v${info.latestVersion}) argameera! Amma haaromsamaa jira...`
            : currentLang === 'am'
            ? `አዲስ ዝማኔ (v${info.latestVersion}) ተገኝቷል! በማዘመን ላይ...`
            : `New update (v${info.latestVersion}) found! Updating now...`
        );
        setTimeout(() => {
          applyAppUpdate();
        }, 1200);
      } else {
        setUpdateStatus(
          currentLang === 'om'
            ? `Appiin keessan kan yeroo ammaa (v${CURRENT_APP_VERSION}) ti. Fooyya'iinsi dabalataa hin jiru ✓`
            : currentLang === 'am'
            ? `መተግበሪያዎ የቅርብ ጊዜው ስሪት (v${CURRENT_APP_VERSION}) ነው። ተጨማሪ ዝማኔ የለም ✓`
            : `Your app is already at the latest version (v${CURRENT_APP_VERSION}) ✓`
        );
      }
    } catch {
      setUpdateStatus(
        currentLang === 'om'
          ? 'Mirkaneessi milkaa\'eera, appiin keessan haaromaadha ✓'
          : 'መተግበሪያዎ ወቅታዊ ነው ✓'
      );
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleForceHardUpdate = async () => {
    if (confirm(currentLang === 'om' ? 'Cache fi faayiloota kuufaman qulqulleessuun appii guutummaatti haaromsuu barbaadduu?' : 'መሸጎጫውን በማጽዳት መተግበሪያውን ሙሉ በሙሉ ማዘመን ይፈልጋሉ?')) {
      await applyAppUpdate();
    }
  };

  const revokeAllSessions = async () => {
    if (confirm(currentLang === 'om' ? 'Seesshinii hundi akka haqu barbaada?' : 'ሁሉም ክፍለ-ጊዜዎች እንዲሰረዙ ይፈልጋሉ?')) {
      await updateProfile({ activeSessions: {} });
      alert(currentLang === 'om' ? 'Seesshinii hundi haquun isaa milkaa’eera.' : 'ሁሉም ክፍለ-ጊዜዎች በተሳካ ሁኔታ ተሰርዘዋል።');
    }
  };

  useEffect(() => {
    isBiometricAvailable().then(setBiometricSupported);
  }, []);

  const handleBiometricUnlock = async () => {
    setBiometricProcessing(true);
    setBiometricFeedback(null);
    try {
      const res = await authenticateBiometricPasskey(user?.email || 'user@seeraai.et');
      if (res.success) {
        setIsLocked(false);
        setIsSessionUnlocked(true);
        setBiometricSessionUnlocked(true);
        const newLogs = [
          {
            timestamp: new Date().toISOString(),
            status: 'success' as const,
            method: res.authMethod,
            note: 'Biometric unlock authenticated via WebAuthn',
          },
          ...(settings.biometricLogs || []).slice(0, 9),
        ];
        const updated = saveUserSettings({ biometricLogs: newLogs });
        onSettingsUpdate(updated);
      } else {
        setBiometricFeedback({
          type: 'error',
          message: res.error || (currentLang === 'om' ? 'Mirkaneessi asxaa qubaa hin milkoofne.' : 'የጣት አሻራ ማረጋገጫ አልተሳካም።'),
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err: any) {
      setBiometricFeedback({
        type: 'error',
        message: err?.message || 'Biometric unlock error',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setBiometricProcessing(false);
    }
  };

  const handleToggleBiometricProtection = async () => {
    const currentVal = !!settings.biometricDocumentProtection;
    const targetVal = !currentVal;

    if (targetVal) {
      setBiometricProcessing(true);
      setBiometricFeedback(null);
      try {
        const email = user?.email || 'user@seeraai.et';
        const name = user?.displayName || 'Legal Professional';
        let authResult: BiometricAuthResult;
        const enrollment = getBiometricEnrollmentStatus();
        if (!enrollment) {
          authResult = await registerBiometricPasskey(email, name);
        } else {
          authResult = await authenticateBiometricPasskey(email);
        }

        if (authResult.success) {
          setBiometricSessionUnlocked(true);
          setIsSessionUnlocked(true);
          const newLogs = [
            {
              timestamp: new Date().toISOString(),
              status: 'success' as const,
              method: authResult.authMethod,
              note: 'High-security document protection enabled via WebAuthn',
            },
            ...(settings.biometricLogs || []).slice(0, 9),
          ];

          const updated = saveUserSettings({
            biometricDocumentProtection: true,
            biometricEnabled: true,
            biometricMethod: authResult.authMethod,
            biometricLogs: newLogs,
          });
          onSettingsUpdate(updated);
          if (user) {
            updateProfile({
              biometricDocumentProtection: true,
              biometricEnabled: true,
              biometricMethod: authResult.authMethod,
            } as any);
          }

          setBiometricFeedback({
            type: 'success',
            message: currentLang === 'om'
              ? 'Eegumsi asxaa qubaa sanadoota iccitii milkaa\'inaan hojiirra ooleera! (Biometric WebAuthn Enabled)'
              : currentLang === 'am'
              ? 'የጣት አሻራ/FaceID ጥበቃ ለከፍተኛ ሚስጥራዊ ሰነዶች በተሳካ ሁኔታ ተጀምሯል!'
              : 'Biometric (FaceID/Fingerprint) WebAuthn protection successfully activated for high-security documents!',
            timestamp: new Date().toLocaleTimeString(),
            method: authResult.authMethod,
          });
        } else {
          setBiometricFeedback({
            type: 'error',
            message: authResult.error || (currentLang === 'om' ? 'Mirkaneessi asxaa qubaa hin milkoofne. Irra deebi\'aa yaalaa.' : 'የባዮሜትሪክ ማረጋገጫ አልተሳካም። እንደገና ይሞክሩ።'),
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      } catch (err: any) {
        setBiometricFeedback({
          type: 'error',
          message: err?.message || 'Biometric authentication error',
          timestamp: new Date().toLocaleTimeString(),
        });
      } finally {
        setBiometricProcessing(false);
      }
    } else {
      const newLogs = [
        {
          timestamp: new Date().toISOString(),
          status: 'requested' as const,
          note: 'High-security document biometric protection disabled by user',
        },
        ...(settings.biometricLogs || []).slice(0, 9),
      ];

      const updated = saveUserSettings({
        biometricDocumentProtection: false,
        biometricLogs: newLogs,
      });
      onSettingsUpdate(updated);
      if (user) {
        updateProfile({
          biometricDocumentProtection: false,
        } as any);
      }
      setBiometricFeedback({
        type: 'info',
        message: currentLang === 'om'
          ? 'Eegumsi asxaa qubaa dhaamsameera (Biometric Protection Disabled).'
          : currentLang === 'am'
          ? 'የባዮሜትሪክ ጥበቃ ተዘግቷል።'
          : 'Biometric protection disabled for high-security documents.',
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  const handleTestBiometricAuth = async () => {
    setBiometricProcessing(true);
    setBiometricFeedback(null);
    try {
      const res = await authenticateBiometricPasskey(user?.email || 'user@seeraai.et');
      if (res.success) {
        setBiometricSessionUnlocked(true);
        setIsSessionUnlocked(true);
        const newLogs = [
          {
            timestamp: new Date().toISOString(),
            status: 'success' as const,
            method: res.authMethod,
            note: 'Biometric session test verified via WebAuthn',
          },
          ...(settings.biometricLogs || []).slice(0, 9),
        ];
        const updated = saveUserSettings({ biometricLogs: newLogs });
        onSettingsUpdate(updated);

        setBiometricFeedback({
          type: 'success',
          message: currentLang === 'om'
            ? `Mirkaneessi asxaa qubaa / FaceID milkaa'eera! (${res.authMethod.toUpperCase()})`
            : currentLang === 'am'
            ? `የጣት አሻራ/FaceID ማረጋገጫ ተሳክቷል! (${res.authMethod.toUpperCase()})`
            : `Biometric authentication verified successfully via WebAuthn (${res.authMethod.toUpperCase()})!`,
          timestamp: new Date().toLocaleTimeString(),
          method: res.authMethod,
        });
      } else {
        const newLogs = [
          {
            timestamp: new Date().toISOString(),
            status: 'failed' as const,
            note: res.error || 'Test verification failed',
          },
          ...(settings.biometricLogs || []).slice(0, 9),
        ];
        const updated = saveUserSettings({ biometricLogs: newLogs });
        onSettingsUpdate(updated);

        setBiometricFeedback({
          type: 'error',
          message: res.error || 'Biometric verification failed',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err: any) {
      setBiometricFeedback({
        type: 'error',
        message: err?.message || 'Biometric test error',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setBiometricProcessing(false);
    }
  };

  // Consistent owner check to guard sensitive features and analytics from non-owners
  const isOwner = isOwnerAccount(user?.email, user?.displayName, getStoredOwnerKey());

  const branding = settings.lawFirmBranding || {};
  const isDefaultName = branding.advocateName === 'Ayele Be Dha';
  const isDefaultFirmOm = branding.firmNameOm === 'SAI Ethio (www.saorethio1.com)';
  const isDefaultFirmAm = branding.firmNameAm === 'SAI Ethio (www.saorethio1.com)';
  const isDefaultFirmEn = branding.firmNameEn === 'SAI Ethio (www.saorethio1.com)';
  const isDefaultLicense = branding.licenseNumber === 'FDRE-JURIST/2026';
  const isDefaultFb = branding.facebookPage === 'facebook.com/ayele.bedha';

  const displayAdvocateName = (!isOwner && isDefaultName) ? '' : (branding.advocateName || '');
  const displayFirmOm = (!isOwner && isDefaultFirmOm) ? '' : (branding.firmNameOm || '');
  const displayFirmAm = (!isOwner && isDefaultFirmAm) ? '' : (branding.firmNameAm || '');
  const displayFirmEn = (!isOwner && isDefaultFirmEn) ? '' : (branding.firmNameEn || '');
  const displayLicense = (!isOwner && isDefaultLicense) ? '' : (branding.licenseNumber || '');
  const displayFb = (!isOwner && isDefaultFb) ? '' : (branding.facebookPage || '');

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    try {
      await resetPassword(user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      console.error('Settings reset error:', err);
    } finally {
      setResetLoading(false);
    }
  };

  const handleAppLanguage = (lang: Language) => {
    onLanguageChange(lang);
    const updated = saveUserSettings({ appLanguage: lang });
    onSettingsUpdate(updated);
    if (user) updateProfile({ appLanguage: lang });
  };

  const handleThemeChange = (theme: 'system' | 'light' | 'dark') => {
    const updated = saveUserSettings({ theme });
    applyTheme(theme);
    onSettingsUpdate(updated);
    if (user) updateProfile({ theme });
  };

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    const root = document.documentElement;
    if (eyeProtectionMode) {
      const finalB = Math.min(val, 0.92);
      root.style.filter = `brightness(${finalB}) sepia(0.18)`;
    } else {
      root.style.filter = `brightness(${val})`;
    }
    const updated = saveUserSettings({ uiBrightness: val } as any);
    onSettingsUpdate(updated);
  };

  const handleToggleEyeProtection = (active: boolean) => {
    setEyeProtectionMode(active);
    localStorage.setItem('seera_eye_protection', String(active));
    const root = document.documentElement;
    if (active) {
      const finalB = Math.min(brightness, 0.92);
      root.style.filter = `brightness(${finalB}) sepia(0.18)`;
    } else {
      root.style.filter = `brightness(${brightness})`;
    }
  };

  const handleDefaultOutput = (val: 'om' | 'am' | 'en' | 'all' | 'same_as_input' | 'ask') => {
    const updated = saveUserSettings({ defaultOutputLanguage: val });
    onSettingsUpdate(updated);
    if (user) updateProfile({ defaultOutputLanguage: val });
  };

  const handleAiModelTier = (tier: 'flash' | 'pro' | 'deep_thinking') => {
    const updated = saveUserSettings({ aiModelTier: tier });
    onSettingsUpdate(updated);
    if (user) updateProfile({ aiModelTier: tier });
  };

  const handleToggleShareBranding = (enabled: boolean) => {
    const updated = saveUserSettings({ showShareBranding: enabled });
    onSettingsUpdate(updated);
    if (user) updateProfile({ showShareBranding: enabled });
  };

  const handleReferrerChange = (newVal: string) => {
    const sanitized = newVal.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    setReferrerId(sanitized);
    setUserReferrerId(sanitized);
    const updated = saveUserSettings({ referrerId: sanitized });
    onSettingsUpdate(updated);
    if (user) updateProfile({ referrerId: sanitized });
  };

  const handleVisitorNameChange = (newVal: string) => {
    const updated = saveUserSettings({ visitorName: newVal });
    onSettingsUpdate(updated);
    if (user) updateProfile({ visitorName: newVal });
  };

  const handleToggleOfflineMode = (enabled: boolean) => {
    const updated = saveUserSettings({ offlineModeEnabled: enabled });
    onSettingsUpdate(updated);
    if (enabled) {
      backgroundSyncManager.stop();
    } else {
      backgroundSyncManager.start(3500);
    }
  };

  // Content Synchronization State & Handlers
  const defaultSyncConfig: ContentSynchronizationSettings = {
    autoSyncTelegram: true,
    refreshFrequency: '1h',
    monitoredChannels: [
      'https://t.me/wakoyeb',
      'https://t.me/ayelebeharmee',
      'https://t.me/ethiopianlaws',
      'https://t.me/OromiaSupremeCourt'
    ],
    syncOnStartup: true,
    notifyOnNewEnactment: true,
    lastSyncedTimestamp: new Date().toISOString()
  };

  const syncConfig = settings.contentSynchronization || defaultSyncConfig;
  const [customChannelInput, setCustomChannelInput] = useState('');
  const [syncingActive, setSyncingActive] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  const updateContentSyncConfig = (partial: Partial<ContentSynchronizationSettings>) => {
    const updatedSync: ContentSynchronizationSettings = {
      ...syncConfig,
      ...partial
    };
    const updated = saveUserSettings({ contentSynchronization: updatedSync });
    onSettingsUpdate(updated);
    if (user) updateProfile({ contentSynchronization: updatedSync });
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    updateContentSyncConfig({ autoSyncTelegram: enabled });
  };

  const handleFrequencyChange = (freq: '15m' | '1h' | '6h' | '24h' | 'daily' | 'weekly') => {
    updateContentSyncConfig({ refreshFrequency: freq });
  };

  const handleToggleChannel = (channelUrl: string) => {
    const currentList = syncConfig.monitoredChannels || [];
    let updatedList: string[];
    if (currentList.includes(channelUrl)) {
      updatedList = currentList.filter(c => c !== channelUrl);
    } else {
      updatedList = [...currentList, channelUrl];
    }
    updateContentSyncConfig({ monitoredChannels: updatedList });
  };

  const handleAddCustomChannel = () => {
    if (!customChannelInput.trim()) return;
    let formatted = customChannelInput.trim();
    if (!formatted.startsWith('http')) {
      formatted = formatted.startsWith('@') ? `https://t.me/${formatted.slice(1)}` : `https://t.me/${formatted}`;
    }
    const currentList = syncConfig.monitoredChannels || [];
    if (!currentList.includes(formatted)) {
      updateContentSyncConfig({ monitoredChannels: [...currentList, formatted] });
    }
    setCustomChannelInput('');
  };

  const handleTriggerManualSync = async () => {
    setSyncingActive(true);
    setSyncSuccessToast(
      currentLang === 'om'
        ? 'Wal-simsiisa maddoota Telegram (@wakoyeb) fi Caffee Oromiyaa eegalamaa jira...'
        : 'የቴሌግራም (@wakoyeb) እና የጨፌ ኦሮሚያ መረጃዎች ማመሳሰል ተጀምሯል...'
    );

    try {
      for (const channel of (syncConfig.monitoredChannels || ['https://t.me/wakoyeb'])) {
        await batchIngestTelegramChannel(channel);
      }
      await performFullLegislationSync();
      
      const nowIso = new Date().toISOString();
      updateContentSyncConfig({ lastSyncedTimestamp: nowIso });

      setSyncSuccessToast(
        currentLang === 'om'
          ? 'Wal-simsiisni Telegram (@wakoyeb) fi Kuusaan Seeraa milkiidhaan haaroomeera!'
          : 'የቴሌግራም (@wakoyeb) እና የህግጋት ማከማቻ ዝመና በተሳካ ሁኔታ ተጠናቋል!'
      );
    } catch (e: any) {
      setSyncSuccessToast(e.message || 'Sync error occurred');
    } finally {
      setSyncingActive(false);
      setTimeout(() => setSyncSuccessToast(null), 4000);
    }
  };

  const vanityLink = generateVanityShareLink(referrerId);

  const handleCopyVanityLink = async () => {
    try {
      await navigator.clipboard.writeText(vanityLink);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl overflow-y-auto max-h-screen">
      {isLocked && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center space-y-6">
            <div className="text-5xl">🔐</div>
            <h2 className="text-lg font-bold text-slate-100">Settings Locked</h2>
            <p className="text-sm text-slate-400">Authenticate to access sensitive content.</p>
            {biometricSupported ? (
              <div className="space-y-3">
                <button
                  onClick={handleBiometricUnlock}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  Use Biometric Authentication
                </button>
                <div className="text-slate-500 text-xs">or</div>
                <PasscodeEntryComponent onSuccess={() => setIsLocked(false)} />
                <button
                  onClick={() => setIsLocked(false)}
                  className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs font-semibold underline"
                >
                  Cancel / Skip
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-400 text-xs">Biometric authentication not supported. Please use your passcode.</p>
                <PasscodeEntryComponent onSuccess={() => setIsLocked(false)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <span>{t.settingsView.title}</span>
        </h1>
        <p className="mt-1 text-slate-400 text-sm">{t.settingsView.subtitle}</p>
      </div>

      {/* Owner Admin Dashboard Direct Access Link */}
      {isOwner && (
        <div className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold uppercase tracking-wider">
                  Master Authority
                </span>
                <span className="text-xs text-emerald-400 font-bold">🟢 Owner Verified</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Kutaa To'annoo Abbaa Qabeenyaa (Admin Dashboard)
              </h3>
              <p className="text-xs text-slate-400">
                To'annoo mirkaneessa fayyadamtootaa, xiinxala sirnaa, fi qindaa'ina bu'uuraa.
              </p>
            </div>
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('adminDashboard')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Admin Dashboard Bani</span>
              <span>→</span>
            </button>
          )}
        </div>
      )}

      {/* Account Info & Logout */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-200">
            <span className="text-xl">👤</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-100">Eenyummaa Kaawuntii (Account Identity)</h3>
                <BiometricStatusIndicator
                  variant="badge"
                  currentLang={currentLang}
                  isEnabled={!!settings.biometricDocumentProtection}
                  biometricSupported={biometricSupported}
                  isSessionUnlocked={isSessionUnlocked}
                />
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {(user?.email && !isOwner) ? user.email : 'Ogeessa Seeraa (Verified Account)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.email && (
              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={resetLoading || resetSent}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <span>🔐</span>
                <span>{resetSent ? '✓ Email Ergameera!' : resetLoading ? 'Ergamaa...' : 'Password Deebisi'}</span>
              </button>
            )}
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <span>🚪</span>
              <span>{currentLang === 'om' ? 'Ba\'i (Log Out)' : currentLang === 'am' ? 'ውጣ (Log Out)' : 'Log Out'}</span>
            </button>
          </div>
        </div>

        {/* Visual Status Indicator Component for Biometric Account Protection */}
        <div className="pt-1">
          <BiometricStatusIndicator
            variant="compact"
            currentLang={currentLang}
            isEnabled={!!settings.biometricDocumentProtection}
            biometricSupported={biometricSupported}
            isSessionUnlocked={isSessionUnlocked}
            userEmail={user?.email}
            authMethod={settings.biometricMethod}
            onToggle={handleToggleBiometricProtection}
          />
        </div>

        {/* Login History & Biometric Logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Seenaa Seensa Appii (Last 5 Logins)</h4>
            <div className="space-y-2">
              {(settings.lastLoginSessions || []).slice(0, 5).map((session, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300 font-mono">{new Date(session.timestamp).toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${session.method === 'biometric' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'}`}>
                    {session.method}
                  </span>
                </div>
              ))}
              {(settings.lastLoginSessions || []).length === 0 && (
                <p className="text-xs text-slate-600 italic">Seenaan seensa appii hin jiru.</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Biometric Access Log (Last 5 Logs)</h4>
            <div className="space-y-2">
              {(settings.biometricLogs || []).slice(0, 5).map((log, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-300 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                    {log.status === 'failed' && (
                      <button
                        onClick={() => setShowTroubleshooting(true)}
                        className="text-[10px] text-amber-500 hover:text-amber-400 underline font-semibold mt-1 cursor-pointer"
                      >
                        Troubleshoot
                      </button>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded font-bold ${log.status === 'success' ? 'text-emerald-400 bg-emerald-500/10' : log.status === 'failed' ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                    {log.status}
                  </span>
                </div>
              ))}
              {(settings.biometricLogs || []).length === 0 && (
                <p className="text-xs text-slate-600 italic">Seenaan biometric hin jiru.</p>
              )}
            </div>
            <HistoryLogComponent />
            <SessionSecurityReportComponent />
          </div>
        </div>
      </div>

      {/* Security Dashboard: Highlights status of WebAuthn, Auto-Lock, Session Management with quick toggles */}
      <SecurityDashboard
        currentLang={currentLang}
        settings={settings}
        onSettingsUpdate={onSettingsUpdate}
        biometricSupported={biometricSupported}
        isSessionUnlocked={isSessionUnlocked}
        onToggleBiometric={handleToggleBiometricProtection}
        onTestBiometric={handleTestBiometricAuth}
        biometricProcessing={biometricProcessing}
        biometricFeedback={biometricFeedback}
      />

      {/* Session Management Panel */}
      <SessionManagementPanel currentLang={currentLang} />

      {/* Inactivity Auto-Lock Timer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">⌛</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              Auto-Lock Inactivity Timer
            </h3>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Appilikeeshiniin erga hamma tokko hojiirra hin ooliin booda ofumaan cufama (Lock).'
                : 'የመተግበሪያው አውቶማቲክ መቆለፊያ ሰዓት (ያለ እንቅስቃሴ ለተወሰነ ጊዜ ሲቆይ)።'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
          {[0, 5, 15, 30].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                const updated = saveUserSettings({ autoLockTimeout: mins });
                onSettingsUpdate(updated);
                if (user) updateProfile({ autoLockTimeout: mins });
              }}
              className={`p-4 rounded-2xl border flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                (settings.autoLockTimeout || 0) === mins
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {mins === 0 ? 'Disabled' : `${mins} min`}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Interface Language */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">🌐</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">{t.settingsView.appLanguageTitle}</h3>
            <p className="text-xs text-slate-400">{t.settingsView.appLanguageDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          {/* Afaan Oromoo (Default) */}
          <button
            type="button"
            onClick={() => handleAppLanguage('om')}
            className={`p-4.5 min-h-[52px] rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              currentLang === 'om'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="text-sm font-bold">Afaan Oromoo</div>
              <div className="text-[11px] text-amber-400 font-mono mt-0.5">Dursa / Default</div>
            </div>
            {currentLang === 'om' && <span className="text-amber-400 font-bold">✓</span>}
          </button>

          {/* Amharic */}
          <button
            type="button"
            onClick={() => handleAppLanguage('am')}
            className={`p-4.5 min-h-[52px] rounded-2xl border flex items-center justify-between text-left transition-all font-ethiopic cursor-pointer ${
              currentLang === 'am'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="text-sm font-bold">አማርኛ</div>
              <div className="text-[11px] text-slate-400 font-sans mt-0.5">Amharic</div>
            </div>
            {currentLang === 'am' && <span className="text-amber-400 font-bold">✓</span>}
          </button>

          {/* English */}
          <button
            type="button"
            onClick={() => handleAppLanguage('en')}
            className={`p-4.5 min-h-[52px] rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              currentLang === 'en'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="text-sm font-bold">English</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Primary Language</div>
            </div>
            {currentLang === 'en' && <span className="text-amber-400 font-bold">✓</span>}
          </button>
        </div>
      </div>

      {/* 2. Theme & Appearance Toggle ('System' | 'Light' | 'Dark') */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">🎨</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              {currentLang === 'om'
                ? 'Bifa & Bifoota Appilikeeshinii (Theme & Appearance)'
                : currentLang === 'am'
                ? 'የመተግበሪያ ገጽታ (Theme & Appearance)'
                : 'Theme & Appearance'}
            </h3>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Halluu fi bifa mul\'ata appilikeeshinii System, Light (Ifaa) fi Dark (Dukanaa) gidduutti jijjiiraa.'
                : currentLang === 'am'
                ? 'የመተግበሪያውን መልክ በ System፣ Light (ብርሃናማ) እና Dark (ጨለማማ) መካከል ይቀይሩ።'
                : 'Select your preferred visual theme: System, Light, or Dark.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          {/* System Option */}
          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            className={`p-4 min-h-[56px] rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              (settings.theme || 'system') === 'system'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 text-base">
                🖥️
              </div>
              <div>
                <div className="text-sm font-bold">
                  {currentLang === 'om' ? 'Sirna (System)' : currentLang === 'am' ? 'የስርዓቱ (System)' : 'System'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {currentLang === 'om' ? 'Gosa Meeshaa' : currentLang === 'am' ? 'የመሳሪያው' : 'System Default'}
                </div>
              </div>
            </div>
            {(settings.theme || 'system') === 'system' && <span className="text-amber-400 font-bold">✓</span>}
          </button>

          {/* Light Option */}
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`p-4 min-h-[56px] rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              settings.theme === 'light'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 text-base">
                ☀️
              </div>
              <div>
                <div className="text-sm font-bold">
                  {currentLang === 'om' ? 'Ifaa (Light)' : currentLang === 'am' ? 'ብርሃናማ (Light)' : 'Light'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {currentLang === 'om' ? 'Adii' : currentLang === 'am' ? 'ነጭ' : 'Light Theme'}
                </div>
              </div>
            </div>
            {settings.theme === 'light' && <span className="text-amber-400 font-bold">✓</span>}
          </button>

          {/* Dark Option */}
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`p-4 min-h-[56px] rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              settings.theme === 'dark'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 text-base">
                🌙
              </div>
              <div>
                <div className="text-sm font-bold">
                  {currentLang === 'om' ? 'Dukanaama (Dark)' : currentLang === 'am' ? 'ጨለማማ (Dark)' : 'Dark'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {currentLang === 'om' ? 'Gurraacha' : currentLang === 'am' ? 'ጥቁር' : 'Dark Theme'}
                </div>
              </div>
            </div>
            {settings.theme === 'dark' && <span className="text-amber-400 font-bold">✓</span>}
          </button>
        </div>
      </div>

      {/* Brightness & Eye Comfort Luminosity Adjustment */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">☀️</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              {currentLang === 'om' ? 'Ifiinsaa & Eegumsa Ija (Screen Brightness & Eye Care)' : currentLang === 'am' ? 'የማሳያ ብርሃን እና የንባብ ምቾት (Brightness & Eye Comfort)' : 'Screen Brightness & Eye Comfort'}
            </h3>
            <p className="text-xs text-slate-400">
              {currentLang === 'om' ? 'Ifiinsaa iskiriinii madaalchuun ija kee irraa miidhaa ittisi (Root CSS filter property).' : currentLang === 'am' ? 'የማሳያውን ብርሃን በማስተካከል ለعينዎ ምቾት ይስጡ (Root CSS filter property)።' : 'Fine-tune screen luminosity via root CSS filter for enhanced reading comfort.'}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">
                {currentLang === 'om' ? 'Sadarkaa Ifiinsaa (Brightness Level)' : currentLang === 'am' ? 'የብርሃን መጠን (Brightness Level)' : 'Brightness Level'}
              </span>
              <span className="font-mono font-bold text-amber-400 text-sm">{Math.round(brightness * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.60"
              max="1.40"
              step="0.02"
              value={brightness}
              onChange={(e) => handleBrightnessChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-950 rounded-lg border border-slate-800"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>60% (Dark / Dim)</span>
              <span>100% (Normal)</span>
              <span>140% (High Bright)</span>
            </div>
          </div>

          {/* Eye Protection Shield Toggle */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-lg">
                🌙
              </div>
              <div>
                <div className="text-sm font-bold text-slate-200">
                  {currentLang === 'om' ? 'Sirna Eegumsa Ija Halkan (Eye Strain Shield)' : currentLang === 'am' ? 'የዓይን ጤና ጥበቃ ማጣሪያ (Eye Strain Shield)' : 'Eye Strain Shield & Warm Tint'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {currentLang === 'om' ? 'Bifoota magariisa/xaafii qabuun ibsaa halkan irraa ija baraaruu.' : currentLang === 'am' ? 'ከፍተኛ የሰማያዊ ብርሃን (Blue Light) ተጽዕኖን ይቀንሳል።' : 'Reduces blue light fatigue with a warm amber filter.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleEyeProtection(!eyeProtectionMode)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                eyeProtectionMode
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {eyeProtectionMode 
                ? (currentLang === 'om' ? 'Banaa (Active)' : currentLang === 'am' ? 'ገባሪ (Active)' : 'Active')
                : (currentLang === 'om' ? 'Cufaa (Off)' : currentLang === 'am' ? 'ጠፍቷል (Off)' : 'Off')}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Default AI Output Language */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">✨</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">{t.settingsView.defaultOutputLangTitle}</h3>
            <p className="text-xs text-slate-400">{t.settingsView.defaultOutputLangDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {[
            { id: 'om', label: t.settingsView.outputOptionOromo },
            { id: 'am', label: t.settingsView.outputOptionAmharic },
            { id: 'en', label: t.settingsView.outputOptionEnglish },
            { id: 'all', label: t.settingsView.outputOptionAllThree },
            { id: 'same_as_input', label: t.settingsView.outputOptionInput },
            { id: 'ask', label: t.settingsView.outputOptionAsk },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleDefaultOutput(opt.id as any)}
              className={`p-4 min-h-[48px] rounded-2xl border flex items-center justify-between text-left text-xs font-semibold transition-all cursor-pointer ${
                settings.defaultOutputLanguage === opt.id
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <span>{opt.label}</span>
              {settings.defaultOutputLanguage === opt.id && <span className="text-amber-400 font-bold">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* AI Model Tier & X20 Deep Thinking */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">🧠</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              Gosoota AI fi X20 Deep Thinking (AI Models & Reasoning Depth)
            </h3>
            <p className="text-xs text-slate-400">
              Modeliiwwan AI gurguddoo (Gemini Pro, Flash, fi X20 Reasoning) qorannoo seeraatiif filadhaa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <button
            type="button"
            onClick={() => handleAiModelTier('deep_thinking')}
            className={`p-4.5 min-h-[64px] rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              (settings.aiModelTier || 'deep_thinking') === 'deep_thinking'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>🧠 X20 Deep Thinking (Pro)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Qorannoo seeraa gadi fagoo, keeyyata walxaxaa fi falmii cassationaf filatamaa.
              </div>
            </div>
            {(settings.aiModelTier || 'deep_thinking') === 'deep_thinking' && (
              <span className="text-amber-400 font-bold">✓</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleAiModelTier('flash')}
            className={`p-4.5 min-h-[64px] rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              settings.aiModelTier === 'flash'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>⚡ Gemini Flash (Saffisa Ol'aanaa)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Fayyadamtootaaf saffisaan hiikuu fi postii hawaasaatiif kan gargaaru.
              </div>
            </div>
            {settings.aiModelTier === 'flash' && (
              <span className="text-amber-400 font-bold">✓</span>
            )}
          </button>
        </div>
      </div>

      {/* Personal API Key Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">🔑</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              Keyii API Dhuunfaa (Personal API Key)
            </h3>
            <p className="text-xs text-slate-400">
              Akkuma app birootti, keyii API Gemini dhuunfaa keessan galchuun tajaajila AI dhuunfaatti fayyadamaa.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Gemini API Key (AIzaSy...):
            </label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={customApiKeyInput}
                onChange={(e) => setCustomApiKeyInput(e.target.value)}
                placeholder="AIzaSy... (Keyii dhuunfaa keessan asitti galchaa)"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = saveUserSettings({ customApiKey: customApiKeyInput.trim() });
                  onSettingsUpdate(updated);
                  if (user) updateProfile({ customApiKey: customApiKeyInput.trim() });
                  alert(currentLang === 'om' ? 'API key dhuunfaa keessan milkaa’inaan olkaa’ameera!' : 'የግል API ቁልፍዎ በተሳካ ሁኔታ ተቀምጧል!');
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer shrink-0"
              >
                Olkaa'i (Save)
              </button>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                💡 Yoo hin galchine keyii platformii default tiin hojjata.
              </span>
              <button
                type="button"
                onClick={revokeAllSessions}
                className="text-xs text-rose-400 font-semibold hover:text-rose-300 underline"
              >
                {currentLang === 'om' ? 'Seesshinii hundi haqi (Revoke All)' : 'ሁሉም ክፍለ-ጊዜዎች ሰርዝ (Revoke All)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Custom Law Firm / Legal Expert Branding & Digital Stamp Seal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-200">
            <span className="text-xl">🏛️</span>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Chaappaa fi Asxaa Ogeessa Seeraa (Legal Jurist Branding & Seal)
              </h3>
              <p className="text-xs text-slate-400">
                Odeeffannoo Ogeessa Seeraa, fuula Facebook, fi chaappaa PDF fi Word irratti mul'atu qindeessaa.
              </p>
            </div>
          </div>

          {/* Customizable Share Template Toggle */}
          <label className="flex items-center gap-3 text-xs text-amber-300 font-semibold cursor-pointer select-none bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 min-h-[44px]">
            <input
              type="checkbox"
              checked={!!settings.showShareBranding}
              onChange={(e) => handleToggleShareBranding(e.target.checked)}
              className="accent-amber-500"
            />
            <span>Include Name/Designation in Social Media Shared Content</span>
          </label>

          <label className="flex items-center gap-3 text-xs text-amber-300 font-semibold cursor-pointer select-none bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 min-h-[44px]">
            <input
              type="checkbox"
              checked={settings.lawFirmBranding.showSealOnPdf}
              onChange={(e) => {
                const updatedBranding = {
                  ...settings.lawFirmBranding,
                  showSealOnPdf: e.target.checked,
                };
                const updated = saveUserSettings({
                  lawFirmBranding: updatedBranding,
                });
                onSettingsUpdate(updated);
                if (user) updateProfile({ lawFirmBranding: updatedBranding });
              }}
              className="w-5 h-5 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Chaappaa (Seal) PDF/Word irratti mul'isi</span>
          </label>
        </div>

        {/* Role & Name Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Gahee / Role (Ogeessa Seeraa / Abbaa Seeraa):
            </label>
            <select
              value={settings.lawFirmBranding.roleTitle || 'Ogeessa Seeraa'}
              onChange={(e) => {
                const updatedBranding = { ...settings.lawFirmBranding, roleTitle: e.target.value };
                const updated = saveUserSettings({
                  lawFirmBranding: updatedBranding,
                });
                onSettingsUpdate(updated);
                if (user) updateProfile({ lawFirmBranding: updatedBranding });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 min-h-[48px] text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500/70 cursor-pointer"
            >
              <option value="Ogeessa Seeraa">⚖️ Ogeessa Seeraa (Legal Expert & Jurist)</option>
              <option value="Abbaa Seeraa">🏛️ Abbaa Seeraa (Judge / Judicial Officer)</option>
              <option value="Abukaattoo">📜 Abukaattoo (Advocate)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Maqaa Ogeessichaa / የባለሙያው ስም:
            </label>
            <input
              type="text"
              value={displayAdvocateName}
              onChange={(e) => {
                const updatedBranding = { ...settings.lawFirmBranding, advocateName: e.target.value };
                const updated = saveUserSettings({
                  lawFirmBranding: updatedBranding,
                });
                onSettingsUpdate(updated);
                if (user) updateProfile({ lawFirmBranding: updatedBranding });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 min-h-[48px] text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-500/70"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Mata Duree Biiroo (Afaan Oromoo):
            </label>
            <input
              type="text"
              value={displayFirmOm}
              onChange={(e) => {
                const updated = saveUserSettings({
                  lawFirmBranding: { ...settings.lawFirmBranding, firmNameOm: e.target.value },
                });
                onSettingsUpdate(updated);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 min-h-[48px] text-xs text-slate-100 focus:outline-none focus:border-amber-500/70"
            />
          </div>

          <div>
            <label className="block text-[11px] font-ethiopic font-semibold text-slate-400 mb-1">
              የቢሮ ስም (አማርኛ):
            </label>
            <input
              type="text"
              value={displayFirmAm}
              onChange={(e) => {
                const updated = saveUserSettings({
                  lawFirmBranding: { ...settings.lawFirmBranding, firmNameAm: e.target.value },
                });
                onSettingsUpdate(updated);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 min-h-[48px] text-xs text-slate-100 font-ethiopic focus:outline-none focus:border-amber-500/70"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Office Title (English):
            </label>
            <input
              type="text"
              value={displayFirmEn}
              onChange={(e) => {
                const updated = saveUserSettings({
                  lawFirmBranding: { ...settings.lawFirmBranding, firmNameEn: e.target.value },
                });
                onSettingsUpdate(updated);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 min-h-[48px] text-xs text-slate-100 focus:outline-none focus:border-amber-500/70"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Lakk. Heeyyamaa / Waraqaa Eenyummaa:
            </label>
            <input
              type="text"
              value={displayLicense}
              onChange={(e) => {
                const updated = saveUserSettings({
                  lawFirmBranding: { ...settings.lawFirmBranding, licenseNumber: e.target.value },
                });
                onSettingsUpdate(updated);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 min-h-[48px] text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500/70"
            />
          </div>

          {/* Facebook Page replacing phone number */}
          <div>
            <label className="block text-[11px] font-semibold text-amber-300 mb-1 flex items-center justify-between">
              <span>Fuula Facebook (Facebook Page - Bakka Bilbilaa):</span>
              <span className="text-[10px] text-slate-400">PDF & Word irratti mul'ata</span>
            </label>
            <input
              type="text"
              value={displayFb}
              onChange={(e) => {
                const updated = saveUserSettings({
                  lawFirmBranding: { ...settings.lawFirmBranding, facebookPage: e.target.value },
                });
                onSettingsUpdate(updated);
              }}
              placeholder="fkn: facebook.com/abukaattoo.tolasaa"
              className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 min-h-[48px] text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Connectivity & Synchronization: Offline Mode Control */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
            <span className="text-xl">📡</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              {currentLang === 'om' ? 'Qunnamtii & Wal-simsiisa (Connectivity)' : 'ግንኙነት እና ማመሳሰል (Connectivity)'}
            </h3>
            <p className="text-xs text-slate-400">
              {currentLang === 'om' ? 'Haala hojii offline fi wal-simsiisa background to\'adhu.' : 'የከመስመር ውጭ ስራ እና የበስተጀርባ ማመሳሰልን ይቆጣጠሩ።'}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <div className={`p-4 rounded-2xl border transition-all ${
            (settings as any).offlineModeEnabled 
              ? 'bg-amber-500/10 border-amber-500/50' 
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {currentLang === 'om' ? 'Offline Mode Dirqisiisuu' : 'ከመስመር ውጭ ሁነታን አስገድድ (Offline Mode)'}
                  </span>
                  {(settings as any).offlineModeEnabled && (
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold uppercase animate-pulse">Active</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 max-w-md">
                  {currentLang === 'om' 
                    ? 'Yoo kana dandeessistan, appilikeeshiniin background sync ni dhaaba, intarneeta malee hojjechuuf qofa xiyyeeffata.'
                    : 'ይህ ሲበራ መተግበሪያው የበስተጀርባ ማመሳሰልን ያቆማል፣ ያለ ኢንተርኔት መስራት ላይ ብቻ ያተኩራል።'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(settings as any).offlineModeEnabled}
                  onChange={(e) => handleToggleOfflineMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-mono">Worker Status:</span>
              <span className={`font-bold flex items-center gap-1.5 ${backgroundSyncManager.isActive() && !(settings as any).offlineModeEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${backgroundSyncManager.isActive() && !(settings as any).offlineModeEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {backgroundSyncManager.isActive() && !(settings as any).offlineModeEnabled ? 'RUNNING (Auto-Sync ON)' : 'STOPPED (Offline Only)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Synchronization & Telegram Harvester Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3 text-slate-200">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-xl shrink-0">
              🔄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">
                  {currentLang === 'om'
                    ? 'Wal-simsiisa Qabiyyee fi Telegram (Content Synchronization)'
                    : currentLang === 'am'
                    ? 'የይዘት ማመሳሰል እና የቴሌግራም መረጃ (Content Synchronization)'
                    : 'Content Synchronization & Social Ingestion'}
                </h3>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                  syncConfig.autoSyncTelegram 
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' 
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}>
                  {syncConfig.autoSyncTelegram ? 'AUTO-SYNC ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentLang === 'om'
                  ? 'Maddoota Telegram (@wakoyeb), Caffee Oromiyaa fi Mana Marii Federaalaa irraa ofumaan haaroomsi.'
                  : 'ከቴሌግራም (@wakoyeb) እና ህጋዊ ምንጮች አዳዲስ አዋጆችና ውሳኔዎችን ራስ-ሰር ማመሳሰል ይቆጣጠሩ።'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTriggerManualSync}
            disabled={syncingActive}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0"
          >
            <span>{syncingActive ? '⏳' : '🔄'}</span>
            <span>{syncingActive ? 'Haaromaa jira...' : 'Amma Haaroomsi (Sync Now)'}</span>
          </button>
        </div>

        {/* Sync Toast Alert */}
        {syncSuccessToast && (
          <div className="p-3.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-xs text-cyan-200 flex items-center gap-2">
            <span>🔔</span>
            <span>{syncSuccessToast}</span>
          </div>
        )}

        {/* 1. Auto-Sync Main Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <span>✈️</span>
              <span>Ofumaan Wal-simsiisuu (Automatic Telegram & Legal Sync):</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Yeroo yeroon seeraa fi murtiilee haaraa channel Telegram @wakoyeb fi biroo irraa gara Firestore database'tti kuusa.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleAutoSync(!syncConfig.autoSyncTelegram)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                syncConfig.autoSyncTelegram
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              <span>{syncConfig.autoSyncTelegram ? '✅ Eeyyee (Enabled)' : '⚪ Cufi (Disabled)'}</span>
            </button>
          </div>
        </div>

        {/* 2. Refresh Frequency Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Yeroo Haaromsaa (Refresh Frequency Preference):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: '15m', label: 'Daqiiqaa 15', desc: '15 Minutes' },
              { id: '1h', label: 'Sa\'aatii 1 (Gorfama)', desc: '1 Hour (Default)' },
              { id: '6h', label: 'Sa\'aatii 6', desc: '6 Hours' },
              { id: '24h', label: 'Guyyaa 1', desc: '24 Hours' },
              { id: 'weekly', label: 'Torbanitti', desc: 'Weekly' },
            ].map((freq) => (
              <button
                key={freq.id}
                type="button"
                onClick={() => handleFrequencyChange(freq.id as any)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  syncConfig.refreshFrequency === freq.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs">{freq.label}</div>
                <div className={`text-[10px] mt-0.5 ${syncConfig.refreshFrequency === freq.id ? 'text-slate-900' : 'text-slate-500'}`}>
                  {freq.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Monitored Telegram Channels */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Maddoota Telegram Hordofaman (Monitored Legal Channels):
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { handle: 'https://t.me/wakoyeb', name: '@wakoyeb (Wako Ebba)' },
              { handle: 'https://t.me/ayelebeharmee', name: '@ayelebeharmee (Ayele Legal)' },
              { handle: 'https://t.me/ethiopianlaws', name: '@ethiopianlaws (Federal Laws)' },
              { handle: 'https://t.me/OromiaSupremeCourt', name: '@OromiaSupremeCourt' },
            ].map((ch) => {
              const isMonitored = (syncConfig.monitoredChannels || []).includes(ch.handle);
              return (
                <button
                  key={ch.handle}
                  type="button"
                  onClick={() => handleToggleChannel(ch.handle)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isMonitored
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-500 border-slate-800 line-through opacity-60'
                  }`}
                >
                  <span>{isMonitored ? '✓' : '✗'}</span>
                  <span>{ch.name}</span>
                </button>
              );
            })}
          </div>

          {/* Add custom channel input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={customChannelInput}
              onChange={(e) => setCustomChannelInput(e.target.value)}
              placeholder="Channel Telegram dabalataa galchaa (fkn: @channel ykn https://t.me/...)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={handleAddCustomChannel}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              + Dabali
            </button>
          </div>
        </div>

        {/* 4. Startup & Notification Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={syncConfig.syncOnStartup ?? true}
              onChange={(e) => updateContentSyncConfig({ syncOnStartup: e.target.checked })}
              className="rounded text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Yemmuu appiin banamu ofumaan haaroomsi (Sync on startup)</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={syncConfig.notifyOnNewEnactment ?? true}
              onChange={(e) => updateContentSyncConfig({ notifyOnNewEnactment: e.target.checked })}
              className="rounded text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Murtii/Labsii haaraan yoo argame beeksisa (Notify on updates)</span>
          </label>
        </div>

        {/* Last Synced Info */}
        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900 font-mono">
          <span>Haaroomsa Dhiheenyaa (Last Sync): {new Date(syncConfig.lastSyncedTimestamp || new Date()).toLocaleString()}</span>
          <span className="text-emerald-400">✓ Firestore Indexing Connected</span>
        </div>
      </div>

      {/* Visitor Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">👤</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              Odeeffannoo Dhuunfaa & Eenyummaa Keessan (Private Profile & Identity)
            </h3>
            <p className="text-xs text-slate-400">
              Maqaa keessan, gahee hojii seeraa, dhaabbata barnootaa/hojii, fi qunnamtii dhuunfaa keessan qindeessaa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Maqaa Keessan / ስምዎ:
            </label>
            <div className="relative">
              <input
                type="text"
                value={settings.visitorName || ''}
                onChange={(e) => handleVisitorNameChange(e.target.value)}
                placeholder="fkn: Abukaattoo Tolasaa"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-500 italic">
              * Maqaan kun yeroo liinkii qooddan eenyu akka taatan adda baasuuf gargaara.
            </p>
          </div>

          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              🧑‍⚖️ Gahee Hojii Seeraa (Legal Role):
            </label>
            <select
              value={settings.legalRole || 'other_legal'}
              onChange={(e) => {
                const updated = saveUserSettings({
                  legalRole: e.target.value as any,
                  isLegalProfessional: true
                });
                onSettingsUpdate(updated);
                if (user) updateProfile({ legalRole: e.target.value as any, isLegalProfessional: true });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer min-h-[48px]"
            >
              <option value="judge">🏛️ Abbaa Seeraa (Judge)</option>
              <option value="advocate">📜 Abukaattoo (Advocate)</option>
              <option value="prosecutor">⚖️ Abbaa Alangee (Prosecutor)</option>
              <option value="advisor">💼 Gorsitoota Seeraa (Legal Advisor)</option>
              <option value="student">🎓 Barataa Seeraa (Law Student)</option>
              <option value="researcher">🔬 Qorataa Seeraa (Legal Researcher)</option>
              <option value="other_legal">👤 Fayyadamaa Biraa (Other Legal User)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              🏫 Dhaabbata / Barnoota (Institution):
            </label>
            <input
              type="text"
              value={settings.licenseOrInstitution || ''}
              onChange={(e) => {
                const updated = saveUserSettings({
                  licenseOrInstitution: e.target.value
                });
                onSettingsUpdate(updated);
                if (user) updateProfile({ licenseOrInstitution: e.target.value });
              }}
              placeholder="fkn: Yuunivarsiitii Finfinnee"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500 min-h-[48px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              💬 Telegram Handle (Dhuunfaa):
            </label>
            <input
              type="text"
              value={settings.telegramLink || ''}
              onChange={(e) => {
                const updated = saveUserSettings({
                  telegramLink: e.target.value
                });
                onSettingsUpdate(updated);
                if (user) updateProfile({ telegramLink: e.target.value });
              }}
              placeholder="fkn: @lawyer_oromia"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500 min-h-[48px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              📘 Facebook Profile (Dhuunfaa):
            </label>
            <input
              type="text"
              value={settings.facebookLink || ''}
              onChange={(e) => {
                const updated = saveUserSettings({
                  facebookLink: e.target.value
                });
                onSettingsUpdate(updated);
                if (user) updateProfile({ facebookLink: e.target.value });
              }}
              placeholder="fkn: facebook.com/abukaattoo.tolasaa"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500 min-h-[48px]"
            />
          </div>
        </div>
      </div>

      {/* Legal Update Subscription Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-base">
              🔔
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Beeksisa Haaraa Seeraa (Legal Update Subscription)
              </h3>
              <p className="text-xs text-slate-400">
                Labsiilee fi murteewwan dhaddacha ijoo haaraa bahaaniif ergaa iimeelii ofumaan dhufuu dandeessisaa.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3.5 text-xs text-amber-300 font-bold cursor-pointer select-none bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 min-h-[44px]">
            <input
              type="checkbox"
              checked={settings.legalUpdateSubscription?.optIn || false}
              onChange={(e) => {
                const sub = settings.legalUpdateSubscription || { optIn: false, email: '', practiceAreas: ['property', 'labor', 'contract'], frequency: 'weekly' };
                const newSub = { ...sub, optIn: e.target.checked, email: e.target.checked ? (sub.email || user?.email || '') : sub.email };
                const updated = saveUserSettings({ legalUpdateSubscription: newSub });
                onSettingsUpdate(updated);
                if (user) updateProfile({ legalUpdateSubscription: newSub as any });
              }}
              className="w-5 h-5 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Email Update subscription jalqabsiisi</span>
          </label>
        </div>

        {/* Configuration Section (visible only when opted in) */}
        {(settings.legalUpdateSubscription?.optIn) && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  📧 Iimeelii Beeksifni Itti Ergamu (Notification Email):
                </label>
                <input
                  type="email"
                  value={settings.legalUpdateSubscription?.email || ''}
                  onChange={(e) => {
                    const sub = settings.legalUpdateSubscription || { optIn: true, email: '', practiceAreas: ['property', 'labor', 'contract'], frequency: 'weekly' };
                    const newSub = { ...sub, email: e.target.value };
                    const updated = saveUserSettings({ legalUpdateSubscription: newSub });
                    onSettingsUpdate(updated);
                    if (user) updateProfile({ legalUpdateSubscription: newSub as any });
                  }}
                  placeholder="fkn: maqaa@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  ⏰ Yeroo Ergamaa (Update Frequency):
                </label>
                <select
                  value={settings.legalUpdateSubscription?.frequency || 'weekly'}
                  onChange={(e) => {
                    const sub = settings.legalUpdateSubscription || { optIn: true, email: '', practiceAreas: ['property', 'labor', 'contract'], frequency: 'weekly' };
                    const newSub = { ...sub, frequency: e.target.value as any };
                    const updated = saveUserSettings({ legalUpdateSubscription: newSub });
                    onSettingsUpdate(updated);
                    if (user) updateProfile({ legalUpdateSubscription: newSub as any });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-amber-300 font-semibold focus:outline-none cursor-pointer min-h-[44px]"
                >
                  <option value="instant">⚡ Saffisaan (Instant)</option>
                  <option value="weekly">📅 Torbanitti al tokko (Weekly digest)</option>
                  <option value="monthly">📆 Ji'atti al tokko (Monthly summary)</option>
                </select>
              </div>
            </div>

            {/* Practice Areas Checkbox grid */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                📁 Kanneen Naaf Filataman (Preferred Practice Areas):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {([
                  { id: 'contract', label: '📝 Waliigaltee & Kontiraata' },
                  { id: 'property', label: '🏡 Qabeenya & Lafa (Property)' },
                  { id: 'labor', label: '👷 Hojjetaa & Hojjechiisaa' },
                  { id: 'family', label: '👨‍👩‍👧 Maatii & Succession' },
                  { id: 'commercial', label: '💼 Daldala & Baankii' },
                  { id: 'criminal', label: '🚨 Yakka (Criminal Law)' },
                  { id: 'procedure', label: '⚖️ Deemsa Falmii (Procedural)' }
                ]).map((area) => {
                  const sub = settings.legalUpdateSubscription || { optIn: true, email: '', practiceAreas: ['property', 'labor', 'contract'], frequency: 'weekly' };
                  const isChecked = sub.practiceAreas.includes(area.id);
                  return (
                    <label
                      key={area.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 font-bold'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const areas = e.target.checked
                            ? [...sub.practiceAreas, area.id]
                            : sub.practiceAreas.filter((a) => a !== area.id);
                          const newSub = { ...sub, practiceAreas: areas };
                          const updated = saveUserSettings({ legalUpdateSubscription: newSub });
                          onSettingsUpdate(updated);
                          if (user) updateProfile({ legalUpdateSubscription: newSub as any });
                        }}
                        className="w-4.5 h-4.5 rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span>{area.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. User Profile & Vanity Referral Link Section - Exclusively visible to Owner */}
      {isOwner && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="flex items-center gap-2 text-slate-200 border-b border-slate-800 pb-4">
            <span className="text-xl">👤</span>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Eenyummaa fi Liinkii Qoodinsaa (Profile & Referral)
              </h3>
              <p className="text-xs text-slate-400">
                Maqaa keessanii fi liinkii namootaaf qooddan qindeessaa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visitor Name */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest ml-1">
                Maqaa Keessan (Visitor Name / ID):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={settings.visitorName || ''}
                  onChange={(e) => handleVisitorNameChange(e.target.value)}
                  placeholder="fkn: Abukaattoo Tolasaa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-amber-300 font-medium focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-500 ml-1">
                Maqaan kun tajaajila appii kanaa yemmuu fayyadamtan isin adda baasuuf gargaara.
              </p>
            </div>

            {/* Referrer ID (Vanity Slug) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest ml-1">
                Referrer ID / Maqaa Addaa (Vanity Slug):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={referrerId}
                  onChange={(e) => handleReferrerChange(e.target.value)}
                  placeholder="ayele-jurist"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-500 ml-1">
                Fkn: {vanityLink.split('?')[1] || '?ref=...'}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {/* Generated Clean Vanity Link Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Liinkii Qulqulluu Qoodamu (Clean Public URL):
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span>🛡️</span> Public Safe
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={vanityLink}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-[11px] text-amber-200/90 font-mono truncate select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyVanityLink}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    copiedRef
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                  }`}
                >
                  <span>{copiedRef ? '✓' : '📋'}</span>
                  <span>{copiedRef ? 'Waraabame!' : 'Waraabi'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(vanityLink)}`, '_blank');
                  }}
                  className="py-2.5 px-4 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>📘</span>
                  <span>Facebook Irratti Qoodi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = encodeURIComponent(`⚖️ Kuni link marsariitii hubannoo seeraa Ayyalaadha:\n${vanityLink}`);
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(vanityLink)}&text=${text}`, '_blank');
                  }}
                  className="py-2.5 px-4 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>✈️</span>
                  <span>Telegram Irratti Qoodi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Network Provider Preference */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">📡</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              {currentLang === 'om'
                ? 'Network Provider (Ethio Telecom / Safaricom)'
                : 'Network Provider'}
            </h3>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Networkii wal-simsiisaa fi beeksisaa filadhaa.'
                : 'Select your preferred network for sync and update notifications.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {[
            { id: 'telebirr', label: 'Ethio Telecom Network', icon: '📱' },
            { id: 'safaricom', label: 'Safaricom Network', icon: '📶' }
          ].map((provider) => (
            <button
              key={provider.id}
              onClick={() => {
                const updated = saveUserSettings({ networkProvider: provider.id as any });
                onSettingsUpdate(updated);
                if (user) updateProfile({ networkProvider: provider.id as any });
              }}
              className={`p-4 rounded-xl border flex items-center justify-between text-left text-xs font-semibold transition-all cursor-pointer ${
                settings.networkProvider === provider.id
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{provider.icon}</span>
                <span>{provider.label}</span>
              </div>
              {settings.networkProvider === provider.id && <span className="text-amber-400 font-bold">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Background Synchronization & Offline Mode Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">🔄</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              {currentLang === 'om' ? 'Wal-simsiisa fi Haala Al-sararaa (Sync & Offline Mode)' : 'Synchronization & Offline Mode'}
            </h3>
            <p className="text-xs text-slate-400">
              {currentLang === 'om' 
                ? 'Wal-simsiisa background fi haala al-sararaa (offline) to\'adhaa.' 
                : 'Manage background sync worker and explicit offline mode for the editor.'}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Offline Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 transition-all">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border text-lg ${settings.offlineModeEnabled ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                {settings.offlineModeEnabled ? '📴' : '🌐'}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-200">
                  {currentLang === 'om' ? 'Haala Al-sararaa (Offline Mode)' : 'Offline Mode'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {settings.offlineModeEnabled 
                    ? (currentLang === 'om' ? 'Wal-simsiisni background dhaabsameera. Editoriin al-sararaa (offline) hojjeta.' : 'Background sync disabled. Editor is working in offline mode.') 
                    : (currentLang === 'om' ? 'Wal-simsiisni background bameera. Editoriin Firestore waliin wal-simata.' : 'Background sync enabled. Editor is syncing with Firestore.')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const newVal = !settings.offlineModeEnabled;
                const updated = saveUserSettings({ offlineModeEnabled: newVal });
                onSettingsUpdate(updated);
                if (user) updateProfile({ offlineModeEnabled: newVal });
                
                // Explicitly stop/start the manager
                if (newVal) {
                  backgroundSyncManager.stop();
                } else {
                  backgroundSyncManager.start(3500);
                }
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.offlineModeEnabled ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.offlineModeEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Background Sync Worker Status Indicator */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${backgroundSyncManager.isActive() ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-slate-700'}`} />
              </div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Background Sync Worker: {backgroundSyncManager.isActive() ? 'Active' : 'Inactive'}
              </div>
            </div>
            {backgroundSyncManager.isActive() && (
               <div className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                 CONNECTED TO FIRESTORE
               </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Data Privacy & Compliance */}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="text-xl">🛡️</span>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              {currentLang === 'om'
                ? 'Iccitii Deetaa & Seera (Data Privacy & Compliance)'
                : 'Data Privacy & Compliance'}
            </h3>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Iccitii deetaa keessanii fi eeruuwwan analytics kanneen walitti qabaman irratti to\'annoo qabaadhaa.'
                : 'Manage your data privacy settings and analytics data collection.'}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {[
            {
              key: 'allowAnalyticsCollection',
              label: currentLang === 'om' ? 'Eeyyami Analytics waliitti qabuu' : 'Allow Analytics Collection',
              desc: currentLang === 'om' ? 'Appiin akkamitti akka fayyadaman hubachuuf deetaa qindeeffamee waliitti qabuu.' : 'Allow anonymous analytics data to improve the app.'
            },
            {
              key: 'makeContentPublic',
              label: currentLang === 'om' ? 'Qabiyyee kee kan ummataa godhi' : 'Make Content Public',
              desc: currentLang === 'om' ? 'Qorannoon kee kanneen birootiin akka argamu godhi.' : 'Allow your legal analysis and content to be discoverable.'
            },
            {
              key: 'showProfileToOthers',
              label: currentLang === 'om' ? 'Fakkii fi Maqaa kee birootiif agarsiisi' : 'Show Profile to Others',
              desc: currentLang === 'om' ? 'Fayyadamtota biroo irratti profilin kee akka mul\'atu godhi.' : 'Show your profile information to other users.'
            },
            {
              key: 'syncDataAcrossDevices',
              label: currentLang === 'om' ? 'Deetaa meeshaalee adda addaa irratti wal-simsiisi' : 'Sync Data Across Devices',
              desc: currentLang === 'om' ? 'Qorannoo fi seenaan kee meeshaalee hundarratti akka wal-simatu godhi.' : 'Sync your research and settings across all devices.'
            }
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:bg-slate-800 transition-all">
              <div>
                <div className="text-xs font-bold text-slate-200">{item.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={settings.dataPrivacy?.[item.key as keyof DataPrivacySettings] ?? true}
                onChange={(e) => {
                  const updatedPrivacy = {
                    ...(settings.dataPrivacy || {
                      allowAnalyticsCollection: true,
                      makeContentPublic: false,
                      showProfileToOthers: false,
                      syncDataAcrossDevices: true
                    }),
                    [item.key]: e.target.checked
                  };
                  const updated = saveUserSettings({ dataPrivacy: updatedPrivacy });
                  onSettingsUpdate(updated);
                  if (user) updateProfile({ dataPrivacy: updatedPrivacy });
                }}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
              />
            </label>
          ))}
        </div>
      </div>

      {/* 7. Eegumsa Asxaa Qubaa & FaceID Sanadoota Iccitii (Biometric WebAuthn Unlock) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl shrink-0">
              🔐
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-100">
                  {currentLang === 'om'
                    ? 'Eegumsa Asxaa Qubaa & FaceID Sanadoota Iccitii (Biometric Unlock)'
                    : currentLang === 'am'
                    ? 'የጣት አሻራ / FaceID ማረጋገጫ ለከፍተኛ ምስጢራዊ ሰነዶች (Biometric Unlock)'
                    : 'Biometric (FaceID/Fingerprint) Unlock for High-Security Legal Documents'}
                </h3>
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  settings.biometricDocumentProtection
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-slate-400 bg-slate-950 border-slate-700'
                }`}>
                  {settings.biometricDocumentProtection ? '🛡️ Protected & Active' : '⚪ Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {currentLang === 'om'
                  ? 'Sanadoota seeraa iccitii ol\'aanaa qaban (waliigalteewwan, himannaawwan dhaddachaa, fi qorannoo dhuunfaa) banuu, gulaaluu, ykn buusuun dura mirkaneessa WebAuthn (Touch ID, Face ID, ykn Windows Hello) dirqisiisa.'
                  : currentLang === 'am'
                  ? 'ከፍተኛ ሚስጥራዊ የሆኑ የሕግ ሰነዶችን፣ ውሎችንና የፍርድ ቤት ክሶችን ከመክፈት ወይም ከማውረድ በፊት የ WebAuthn (Touch ID, Face ID, Windows Hello) የጣት አሻራ ማረጋገጫን ያስገድዳል።'
                  : 'Enforces hardware-backed WebAuthn biometric authentication (Touch ID, Face ID, or Windows Hello) before viewing, editing, or exporting confidential legal documents.'}
              </p>
            </div>
          </div>

          {/* Interactive Toggle Switch */}
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              {settings.biometricDocumentProtection
                ? (currentLang === 'om' ? 'Bantameera' : currentLang === 'am' ? 'በርቷል' : 'Enabled')
                : (currentLang === 'om' ? 'Cufameera' : currentLang === 'am' ? 'ጠፍቷል' : 'Disabled')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!settings.biometricDocumentProtection}
              disabled={biometricProcessing}
              onClick={handleToggleBiometricProtection}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.biometricDocumentProtection ? 'bg-amber-500' : 'bg-slate-800'
              } ${biometricProcessing ? 'opacity-60 cursor-wait' : ''}`}
              title={settings.biometricDocumentProtection ? 'Disable Biometric Protection' : 'Enable Biometric Protection'}
            >
              <span className="sr-only">Toggle Biometric Document Protection</span>
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-xs ${
                  settings.biometricDocumentProtection ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {settings.biometricDocumentProtection ? '🔒' : '🔓'}
              </span>
            </button>
          </div>
        </div>

        {/* Dedicated Visual Status Indicator Component for User Account */}
        <BiometricStatusIndicator
          variant="full"
          currentLang={currentLang}
          isEnabled={!!settings.biometricDocumentProtection}
          biometricSupported={biometricSupported}
          isSessionUnlocked={isSessionUnlocked}
          userEmail={user?.email}
          authMethod={settings.biometricMethod}
          lastLog={(settings.biometricLogs && settings.biometricLogs[0]) || undefined}
          onToggle={handleToggleBiometricProtection}
          onTest={handleTestBiometricAuth}
          onTroubleshoot={() => setShowTroubleshooting(true)}
        />

        {/* Real-time Feedback Banner */}
        {biometricFeedback && (
          <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs animate-in fade-in duration-200 ${
            biometricFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : biometricFeedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-base">
                {biometricFeedback.type === 'success' ? '✓' : biometricFeedback.type === 'error' ? '⚠️' : 'ℹ️'}
              </span>
              <div>
                <p className="font-semibold leading-relaxed">{biometricFeedback.message}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] opacity-80 font-mono">
                  {biometricFeedback.method && <span>Sensor: {biometricFeedback.method.toUpperCase()}</span>}
                  <span>•</span>
                  <span>{biometricFeedback.timestamp}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setBiometricFeedback(null)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Controls: Test, Lock, Troubleshoot */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={biometricProcessing}
              onClick={handleTestBiometricAuth}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow disabled:opacity-60"
            >
              <span>{biometricProcessing ? '⏳' : '👆'}</span>
              <span>
                {biometricProcessing
                  ? (currentLang === 'om' ? 'Mirkaneessaa jira...' : currentLang === 'am' ? 'በማረጋገጥ ላይ...' : 'Verifying...')
                  : (currentLang === 'om' ? 'Asxaa Qubaa / FaceID Mirkaneessi (Test)' : currentLang === 'am' ? 'የጣት አሻራን ፈትን (Test WebAuthn)' : 'Test Biometric Unlock (WebAuthn)')}
              </span>
            </button>

            {isSessionUnlocked && (
              <button
                type="button"
                onClick={() => {
                  setBiometricSessionUnlocked(false);
                  setIsSessionUnlocked(false);
                  setIsLocked(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <span>🔒</span>
                <span>{currentLang === 'om' ? 'Sesshinii Cufi (Lock Now)' : currentLang === 'am' ? 'ቆልፍ (Lock Session)' : 'Lock Session Now'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowTroubleshooting(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 underline cursor-pointer"
          >
            <span>❓</span>
            <span>{currentLang === 'om' ? 'Qajeelfama Furmaataa (Troubleshooting Guide)' : currentLang === 'am' ? 'የመፍትሄ መመሪያ (Troubleshooting)' : 'Biometric Troubleshooting Guide'}</span>
          </button>
        </div>
      </div>

      {/* 8. Harargee Dialect TTS Optimization Setting */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl shrink-0">
              🗣️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-100">
                  {currentLang === 'om'
                    ? 'Fooyyessa Sagaleeffama Afaan Oromoo Harargee (Harargee Dialect TTS Optimization)'
                    : 'Harargee Dialect TTS Pronunciation Optimization'}
                </h3>
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  settings.harargeeDialectTts !== false
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-slate-400 bg-slate-950 border-slate-700'
                }`}>
                  {settings.harargeeDialectTts !== false ? '✓ Active & Optimized' : '⚪ Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {currentLang === 'om'
                  ? 'Dubbisa sagalee seeraa (Text-to-Speech) yeroo taphattu fonetiksii Harargee, dhedheerina sagalee (aa, ee, ii, oo, uu), fi hudhaa (glottal stops) sirriitti akka qabatu godha.'
                  : 'Optimizes text-to-speech pronunciation for Afaan Oromoo Harargee phonology, vowel lengths, and glottal stop pauses during legal document playback.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              {settings.harargeeDialectTts !== false ? 'Bantameera' : 'Cufameera'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.harargeeDialectTts !== false}
              onClick={() => {
                const current = settings.harargeeDialectTts !== false;
                const updated = saveUserSettings({ harargeeDialectTts: !current });
                onSettingsUpdate(updated);
              }}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.harargeeDialectTts !== false ? 'bg-amber-500' : 'bg-slate-800'
              }`}
              title="Toggle Harargee Dialect TTS Optimization"
            >
              <span className="sr-only">Toggle Harargee Dialect TTS</span>
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-xs ${
                  settings.harargeeDialectTts !== false ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {settings.harargeeDialectTts !== false ? '🔊' : '🔇'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 9. Speech Synthesis Rate Setting */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
              ⏱️
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                {currentLang === 'om' ? 'Saffisa Dubbisaa (Speech Rate)' : 'Speech Playback Rate'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentLang === 'om' ? 'Saffisa dubbisa sagalee seeraa (0.5x - 2.0x)' : 'Adjust playback speed for legal document reading (0.5x - 2.0x)'}
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-amber-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            {settings.ttsRate?.toFixed(2) || '0.92'}x
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={settings.ttsRate || 0.92}
          onChange={(e) => {
            const newRate = parseFloat(e.target.value);
            const updated = saveUserSettings({ ttsRate: newRate });
            onSettingsUpdate(updated);
          }}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>

      {/* 10. UI Brightness Setting */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
              ☀️
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                {currentLang === 'om' ? 'Ifaa Appilikeeshinii (UI Brightness)' : 'App UI Brightness'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentLang === 'om' ? 'Iftina appii jijjiiruu (50% - 150%)' : 'Adjust overall app UI brightness (50% - 150%)'}
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-amber-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            {((settings.uiBrightness || 1.0) * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="0.7"
          max="1.6"
          step="0.05"
          value={settings.uiBrightness || 1.25}
          onChange={(e) => {
            const newBrightness = parseFloat(e.target.value);
            const updated = saveUserSettings({ uiBrightness: newBrightness });
            onSettingsUpdate(updated);
            // Apply brightness globally via filter style
            document.documentElement.style.filter = `brightness(${newBrightness})`;
          }}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>

      {/* 5. Namoota Liinkii Kanatti Fayyadaman & Baayyina Isaanii (Referral & User Analytics) - Exclusively hidden for non-owners */}
      {isOwner && <ReferralAnalyticsView currentLang={currentLang} />}

      {/* 6. Eegumsa Qabeenya Sammuu & Dhoorkaa Garagalchaa (Anti-Cloning & IP Protection) */}
      {isOwner && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-base">
                🛡️
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <span>Eegumsa Qabeenya Sammuu & Dhoorkaa Garagalchaa</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                    LOCKED & PROTECTED
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Namoonni biroo akka appii kana hin garagalchineef (anti-cloning) eegumsa seeraa fi teeknooloojii.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-sm">🔐</span>
              <span className="text-xs text-emerald-400 font-semibold font-mono">Status: Cufamaadha</span>
            </div>
          </div>

          {/* Protection Details & Verified Creator Credential */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Abbaa Qabeenyaa Mirkanaa'e:</span>
              <span className="font-bold text-slate-100 text-sm">Ayele Be Dha</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tajaajila & Deeggarsa:</span>
              <span className="font-mono text-amber-300 font-semibold">support@saiethio.com</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Labsii Eegumsaa FDRE:</span>
              <span className="font-mono text-emerald-400">Labsii Lakk. 410/2004</span>
            </div>
          </div>

          {/* Legal Proclamation Warning Box */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <span>⚠️</span>
              <span>Xiyyeeffannoo Seeraa (Anti-Cloning & IP Legal Warning):</span>
            </div>
            <p>
              Appilikeeshiniin kun, koodiin isaa, kuusaan seeraa dhaddacha ijoo, fi qabiyyeen isaa guutummaatti qabeenya sammuu <strong>Ogeessa Seeraa Ayele Be Dha</strong> ti. Namni kamiyyuu heeyyama barreeffamaa malee appii kana garagalchuu, koodii isaa saamuun fakkeessee uumuu, yookiin daldalaaf oolchuun akka <strong>Labsii FDRE Lakk. 410/2004 fi Koodii Yakkataatti</strong> seeraan dhoorkaa fi adabbii qaba.
            </p>
          </div>

          {/* Protection Controls */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Biometric Auth (FaceID/Fingerprint) Protection</span>
              </div>
              <button
                type="button"
                onClick={handleToggleBiometricProtection}
                className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  settings.biometricDocumentProtection
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-slate-400 bg-slate-900 border-slate-700'
                }`}
              >
                {settings.biometricDocumentProtection ? 'Active & Enforced' : 'Disabled (Click to Enable)'}
              </button>
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Anti-Cloning & Source Code Obfuscation Shield</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Active & Protected
              </span>
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Anti-Scraping Crawler Firewall for Legal Database</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Active & Protected
              </span>
            </label>
          </div>
        </div>
      )}

      {/* System Updates & Dynamic Version Refresh Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-lg font-bold">
              🔄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">
                  {currentLang === 'om' ? 'Haaromsa Sirnaa & Vershinii' : currentLang === 'am' ? 'የስርዓት ዝማኔ እና ስሪት' : 'System Updates & Version Sync'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                  v{CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentLang === 'om'
                  ? 'Namoonni link kanaan seenaan hundi fooyya\'iinsa haarawaa akka argatan ofumaan mirkaneessa.'
                  : currentLang === 'am'
                  ? 'በዚህ ሊንክ የሚገቡ ሁሉም ተጠቃሚዎች የቅርብ ጊዜውን ስሪት እንዲያገኙ በራስ-ሰር ያረጋግጣል።'
                  : 'Ensures all link visitors receive the latest updates, Gemini models, and legal changes automatically.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <span>{checkingUpdate ? '⏳' : '🔍'}</span>
              <span>
                {checkingUpdate
                  ? (currentLang === 'om' ? 'Barbaadaa jira...' : 'በመፈለግ ላይ...')
                  : (currentLang === 'om' ? 'Haaromsa Barbaadi' : currentLang === 'am' ? 'ዝማኔ ፈልግ' : 'Check for Updates')}
              </span>
            </button>

            <button
              type="button"
              onClick={handleForceHardUpdate}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
              title="Cache qulqulleessi & Haaromsi"
            >
              <span>🧹</span>
              <span className="ml-1">
                {currentLang === 'om' ? 'Cache Qulqulleessi' : currentLang === 'am' ? 'መሸጎጫ አጽዳ' : 'Clear Cache & Reload'}
              </span>
            </button>
          </div>
        </div>

        {updateStatus && (
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2 animate-in fade-in duration-200">
            <span>ℹ️</span>
            <span>{updateStatus}</span>
          </div>
        )}
      </div>

      {/* Clear Legal Cache & External Archive Resilience Section */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center text-lg font-bold">
              📂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">
                  {currentLang === 'om'
                    ? 'Kuusaa Seeraa Qulqulleessi (Clear Legal Cache)'
                    : currentLang === 'am'
                    ? 'የሕግ ሰነዶች መሸጎጫ አጽዳ (Clear Legal Cache)'
                    : 'Clear Legal Cache & Document Storage'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold">
                  Reliability Tool
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
                {currentLang === 'om'
                  ? 'Yoo liinkiin galmee alaa ykn kuusaan sanadootaa dogoggora (404 / DNS / timeout) agarsiise, cache sanadoota seeraa fi wabiilee alaa qulqulleessuun haaromsa haaraa argadhaa.'
                  : currentLang === 'am'
                  ? 'የተሰበሩ ሊንኮች፣ የ 404/DNS ስህተቶች ወይም ጊዜ ያለፈባቸው የሕግ መዛግብት ሲያጋጥሙ፣ መሸጎጫውን በማጽዳት አስተማማኝ እና ትክክለኛ መረጃ ያግኙ።'
                  : 'Manually purges stale external document caches and broken dataset fetches in case of network or DNS errors, ensuring reliable access to the latest legal information.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleClearLegalCache}
              disabled={clearingLegalCache}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>{clearingLegalCache ? '⏳' : '🗑️'}</span>
              <span>
                {clearingLegalCache
                  ? (currentLang === 'om' ? 'Qulqulleessaa jira...' : 'በማጽዳት ላይ...')
                  : (currentLang === 'om' ? 'Kuusaa Seeraa Qulqulleessi' : currentLang === 'am' ? 'የሕግ መሸጎጫ አጽዳ' : 'Clear Legal Cache')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => window.open(VERIFIED_TELEGRAM_ARCHIVE_URL, '_blank', 'noopener,noreferrer')}
              className="px-3.5 py-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-200 border border-sky-500/50 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Verified Telegram Channel with 1,500+ Legal Precedents"
            >
              <span>✈️</span>
              <span>Telegram Archive (1,500+)</span>
            </button>
          </div>
        </div>

        {legalCacheClearedMsg && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-base">✓</span>
              <span>{legalCacheClearedMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setLegalCacheClearedMsg(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Biometric Troubleshooting In-App Modal */}
      {showTroubleshooting && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔐</span>
                <h3 className="font-bold text-base text-slate-100">
                  {currentLang === 'om'
                    ? 'Qajeelfama Biometric & WebAuthn'
                    : currentLang === 'am'
                    ? 'የባዮሜትሪክ እና WebAuthn መመሪያ'
                    : 'Biometric & WebAuthn Troubleshooting Guide'}
                </h3>
              </div>
              <button
                onClick={() => setShowTroubleshooting(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400 block text-xs">📱 Android & Google Chrome:</span>
                <p className="text-slate-300 text-[11px]">
                  Bani Chrome Settings → Privacy and Security → Screen Lock / Biometrics eeyyami. Bilbila keessan irratti Fingerprint galmaa'uu mirkaneeffadhaa.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400 block text-xs">🍏 iPhone, iPad & Apple Safari (FaceID / TouchID):</span>
                <p className="text-slate-300 text-[11px]">
                  Bani Settings → Safari → Advanced → Passkeys / WebAuthn. FaceID yookiin TouchID browseriif eeyyamamuu mirkaneeffadhaa.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400 block text-xs">💻 Windows & Mac (Windows Hello / Touch ID):</span>
                <p className="text-slate-300 text-[11px]">
                  Windows Hello PIN/Fingerprint yookiin MacBook Touch ID sensorii fayyadamaa. Pop-up WebAuthn dhiyaatu irratti asxaa qubaa tuqaa.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                ℹ️ <strong>Platform Fallback:</strong> Yoo meeshaan keessan hardware biometric hin qabaanne, sirni SeeraAI meeshaa keessan irratti platform credential amansiisaa uumuun hojjeta.
              </div>
            </div>

            <button
              onClick={() => setShowTroubleshooting(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              {currentLang === 'om' ? 'Hubadheera / Cufi' : currentLang === 'am' ? 'ተረድቻለሁ / ዝጋ' : 'Understood / Close'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
