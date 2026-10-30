import React from 'react';
import { Language } from '../i18n/translations';

export interface BiometricStatusIndicatorProps {
  currentLang: Language;
  isEnabled: boolean;
  biometricSupported: boolean;
  isSessionUnlocked?: boolean;
  userEmail?: string | null;
  authMethod?: 'fingerprint' | 'faceid' | 'passkey' | 'device_biometric';
  lastLog?: { timestamp: string; status: string; method?: string };
  onToggle?: () => void;
  onTest?: () => void;
  onTroubleshoot?: () => void;
  variant?: 'full' | 'compact' | 'badge';
}

export const BiometricStatusIndicator: React.FC<BiometricStatusIndicatorProps> = ({
  currentLang,
  isEnabled,
  biometricSupported,
  isSessionUnlocked = false,
  userEmail,
  authMethod,
  lastLog,
  onToggle,
  onTest,
  onTroubleshoot,
  variant = 'full',
}) => {
  // Sanitize email if private email passed
  const isOwner = userEmail === 'ayeledha@gmail.com' || userEmail === 'ayeledha@saiethio.com' || userEmail === 'ayele@saiethio.com';
  const displayEmail = (!userEmail || isOwner)
    ? 'Verified Jurist Account'
    : userEmail;

  const sensorLabel = authMethod
    ? authMethod === 'faceid'
      ? 'Face ID'
      : authMethod === 'fingerprint'
      ? 'Touch ID / Fingerprint'
      : 'Passkey WebAuthn'
    : biometricSupported
    ? 'Touch ID / Face ID'
    : 'Platform Key';

  // Badge variant
  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
          isEnabled
            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-sm'
            : 'bg-amber-950/70 border-amber-500/40 text-amber-300 shadow-sm'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}
        />
        <span>
          {isEnabled
            ? (currentLang === 'om' ? '🟢 Biometric: Eegamaadha' : currentLang === 'am' ? '🟢 ባዮሜትሪክ፦ በርቷል' : '🟢 Biometric: Active')
            : (currentLang === 'om' ? '🟡 Biometric: Cufamaadha' : currentLang === 'am' ? '🟡 ባዮሜትሪክ፦ ጠፍቷል' : '🟡 Biometric: Inactive')}
        </span>
      </span>
    );
  }

  // Compact variant for Account Identity header
  if (variant === 'compact') {
    return (
      <div
        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
          isEnabled
            ? 'bg-slate-950 border-emerald-500/40 text-slate-200'
            : 'bg-slate-950 border-amber-500/30 text-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
              isEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isEnabled ? '🟢' : '🟡'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100">
                {currentLang === 'om'
                  ? 'Eegumsa Asxaa Qubaa (Biometric / WebAuthn)'
                  : currentLang === 'am'
                  ? 'የባዮሜትሪክ / WebAuthn ጥበቃ'
                  : 'Biometric / WebAuthn Account Protection'}
              </span>
              <span
                className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  isEnabled
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                }`}
              >
                {isEnabled ? '🟢 Active' : '🟡 Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isEnabled
                ? (currentLang === 'om'
                    ? `Kaawuntiin asxaa qubaatiin eegameera • ${sensorLabel}`
                    : currentLang === 'am'
                    ? `መለያው በጣት አሻራ የተጠበቀ ነው • ${sensorLabel}`
                    : `Account secured via hardware passkey • ${sensorLabel}`)
                : (currentLang === 'om'
                    ? 'Eegumsi asxaa qubaa hin banamne • Cufamaadha'
                    : currentLang === 'am'
                    ? 'የጣት አሻራ ጥበቃ አልበራም'
                    : 'Hardware biometric protection is currently inactive')}
            </p>
          </div>
        </div>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow font-black'
            }`}
          >
            {isEnabled
              ? (currentLang === 'om' ? 'Dhaamsi' : currentLang === 'am' ? 'አጥፋ' : 'Turn Off')
              : (currentLang === 'om' ? 'Jalqabsiisi' : currentLang === 'am' ? 'አብራ' : 'Enable')}
          </button>
        )}
      </div>
    );
  }

  // Full detailed visual indicator card
  return (
    <div
      className={`rounded-2xl border p-5 transition-all shadow-lg space-y-4 ${
        isEnabled
          ? 'bg-slate-950 border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-slate-950 border-amber-500/30'
      }`}
    >
      {/* Top Banner: Status + Animated Pulse Light */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
              isEnabled
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-amber-500/10 border border-amber-500/30'
            }`}
          >
            {isEnabled ? '🟢' : '🟡'}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Account Security Status:
              </span>
              <div className="flex items-center gap-1.5">
                {isEnabled ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                ) : (
                  <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                )}
                <span
                  className={`text-xs font-mono uppercase font-bold tracking-wide ${
                    isEnabled ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isEnabled
                    ? (currentLang === 'om' ? '🟢 BANTAMEERA (ACTIVE)' : currentLang === 'am' ? '🟢 በርቷል (ACTIVE)' : '🟢 ACTIVE & ENABLED')
                    : (currentLang === 'om' ? '🟡 CUFAMAADHA (INACTIVE)' : currentLang === 'am' ? '🟡 ጠፍቷል (INACTIVE)' : '🟡 INACTIVE & DISABLED')}
                </span>
              </div>
            </div>

            <h4 className="text-sm font-bold text-slate-100 mt-0.5 flex items-center gap-1.5">
              <span>{isEnabled ? '🔐' : '🔓'}</span>
              <span>
                {isEnabled
                  ? (currentLang === 'om'
                      ? 'Eegumsa Asxaa Qubaa & FaceID Kaawuntii Hojiirra Jira'
                      : currentLang === 'am'
                      ? 'የመለያ የጣት አሻራ / FaceID ማረጋገጫ ጥበቃ በርቷል'
                      : 'Account WebAuthn Biometric Protection is Active')
                  : (currentLang === 'om'
                      ? 'Eegumsi Asxaa Qubaa Kaawuntii Dhaameera'
                      : currentLang === 'am'
                      ? 'የመለያ የጣት አሻራ ጥበቃ በአሁኑ ሰዓት ጠፍቷል'
                      : 'Account WebAuthn Biometric Protection is Disabled')}
              </span>
            </h4>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {onTest && isEnabled && (
            <button
              type="button"
              onClick={onTest}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>👆</span>
              <span>{currentLang === 'om' ? 'Mirkaneessi' : currentLang === 'am' ? 'ፈትን' : 'Test Sensor'}</span>
            </button>
          )}

          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow ${
                isEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
              }`}
            >
              {isEnabled
                ? (currentLang === 'om' ? 'Dhaamsi (Disable)' : currentLang === 'am' ? 'አጥፋ (Disable)' : 'Disable Protection')
                : (currentLang === 'om' ? 'Jalqabsiisi (Enable)' : currentLang === 'am' ? 'አብራ (Enable)' : 'Enable Protection')}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Protection Level</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{isEnabled ? '🟢' : '🟡'}</span>
            <span className={`font-bold ${isEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isEnabled ? 'High-Security' : 'Standard'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Hardware Sensor</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{biometricSupported ? '🟢' : '🟡'}</span>
            <span className="font-semibold text-slate-200 truncate">
              {sensorLabel}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Session Lock</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{isSessionUnlocked ? '🔓' : '🔒'}</span>
            <span className={`font-semibold ${isSessionUnlocked ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isSessionUnlocked ? 'Unlocked' : 'Locked'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Account Target</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">👤</span>
            <span className="font-mono text-slate-300 truncate text-[11px]">
              {displayEmail}
            </span>
          </div>
        </div>
      </div>

      {/* Descriptive Status Banner */}
      <div
        className={`p-3 rounded-xl text-xs flex items-center justify-between gap-3 ${
          isEnabled
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>{isEnabled ? '✓' : '⚠️'}</span>
          <span>
            {isEnabled
              ? (currentLang === 'om'
                  ? 'Wixineewwan dhuunfaa fi sanadoonni iccitii qaban hundi asxaa qubaa fi WebAuthn passkey meeshaa kanaan qofa banamu.'
                  : currentLang === 'am'
                  ? 'ሁሉም ሚስጥራዊ የሕግ ሰነዶች እና ረቂቆች የሚከፈቱት በዚህ መሳሪያ የጣት አሻራ ወይም FaceID ብቻ ነው።'
                  : 'All confidential drafts and court documents require device Touch ID / Face ID WebAuthn passkey.')
              : (currentLang === 'om'
                  ? 'Kaawuntiin keessan eegumsa asxaa qubaa hin qabu. Sanadoota dhuunfaa eeguuf asxaa qubaa jalqabsiisaa.'
                  : currentLang === 'am'
                  ? 'መለያዎ የጣት አሻራ ጥበቃ የለውም። ሚስጥራዊ ሰነዶችን ለመጠበቅ እባክዎ የጣት አሻራ ጥበቃን ያብሩ።'
                  : 'Biometric WebAuthn protection is disabled. Enable it to enforce biometric authentication on sensitive drafts.')}
          </span>
        </div>

        {onTroubleshoot && (
          <button
            type="button"
            onClick={onTroubleshoot}
            className="text-[11px] font-bold underline shrink-0 hover:opacity-80 cursor-pointer"
          >
            {currentLang === 'om' ? 'Qajeelfama' : currentLang === 'am' ? 'መመሪያ' : 'Guide'}
          </button>
        )}
      </div>
    </div>
  );
};
