import React, { useEffect, useState } from 'react';
import {
  LogOut,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Download,
  Loader2,
  Lock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import type {
  SignOutPhase,
  LocalDataInventoryReport,
  IsolationLockdownState,
} from '../services/signOutSafetyService';

interface LogoutConfirmationModalProps {
  currentLang: Language;
  isOpen: boolean;
  phase: SignOutPhase;
  inventory: LocalDataInventoryReport | null;
  syncErrors: string[];
  holdReason: string | null;
  lockdownState: IsolationLockdownState | null;
  unackedTabs: string[];
  userEmail?: string | null;
  onCloseStaySignedIn: () => Promise<void>;
  onRetrySync: () => Promise<void>;
  onExportBackup: () => boolean;
  onConfirmSignOut: (options: { discardConfirmed: boolean; backupExported: boolean }) => Promise<void>;
  onRetryIsolationRecovery: () => Promise<void>;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  currentLang,
  isOpen,
  phase,
  inventory,
  syncErrors,
  holdReason,
  lockdownState,
  unackedTabs,
  userEmail,
  onCloseStaySignedIn,
  onRetrySync,
  onExportBackup,
  onConfirmSignOut,
  onRetryIsolationRecovery,
}) => {
  const [wantDiscard, setWantDiscard] = useState(false);
  const [secondDiscardConfirm, setSecondDiscardConfirm] = useState(false);
  const [backupExported, setBackupExported] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Reset confirmation checkboxes whenever modal opens fresh or phase changes back to inventory
  useEffect(() => {
    if (!isOpen || phase === 'INVENTORY_AND_SYNC' || phase === 'LOCKING_AND_PAUSING') {
      setWantDiscard(false);
      setSecondDiscardConfirm(false);
      setBackupError(null);
    }
  }, [isOpen, phase]);

  if (!isOpen) return null;

  const isInProgressPhase =
    phase === 'LOCKING_AND_PAUSING' ||
    phase === 'COORDINATING_TABS' ||
    phase === 'INVENTORY_AND_SYNC' ||
    phase === 'CLOSING_IDB_AND_PURGING' ||
    phase === 'SIGNING_OUT_FIREBASE' ||
    phase === 'VERIFYING_COMPLETION';

  const isPostPurgeOrLockdown =
    phase === 'CLOSING_IDB_AND_PURGING' ||
    phase === 'SIGNING_OUT_FIREBASE' ||
    phase === 'VERIFYING_COMPLETION' ||
    phase === 'ISOLATION_LOCKDOWN' ||
    Boolean(lockdownState?.active);

  const canDismissStaySignedIn = !isPostPurgeOrLockdown && !isBusy;

  const totalAtRiskCount = inventory
    ? inventory.counts.pendingUpload + inventory.counts.localOnly + inventory.counts.unknownCorrupt
    : 0;
  const requiresDiscardConsent = Boolean(
    inventory && (inventory.hasBlockingUnsyncedOrLocalOnly || inventory.hasUniqueLocalInstitutionalData)
  );

  const handleStaySignedIn = async () => {
    if (!canDismissStaySignedIn) return;
    setIsBusy(true);
    try {
      await onCloseStaySignedIn();
    } finally {
      setIsBusy(false);
    }
  };

  const handleRetrySync = async () => {
    setIsBusy(true);
    try {
      await onRetrySync();
    } finally {
      setIsBusy(false);
    }
  };

  const handleExport = () => {
    setBackupError(null);
    const ok = onExportBackup();
    if (ok) {
      setBackupExported(true);
    } else {
      setBackupError(
        currentLang === 'om'
          ? 'Kuusaa JSON gara meeshaa keessanitti buusuun hin danda\'amne.'
          : currentLang === 'am'
          ? 'የJSON ምትኬ ፋይሉን ማውረድ አልተቻለም።'
          : 'Failed to trigger local JSON backup download.'
      );
    }
  };

  const handleConfirmLogoutClick = async () => {
    if (requiresDiscardConsent && !(wantDiscard && secondDiscardConfirm)) return;
    setIsBusy(true);
    try {
      await onConfirmSignOut({
        discardConfirmed: requiresDiscardConsent ? wantDiscard && secondDiscardConfirm : true,
        backupExported,
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRecoveryRetry = async () => {
    setIsBusy(true);
    try {
      await onRetryIsolationRecovery();
    } finally {
      setIsBusy(false);
    }
  };

  const phaseLabel = (() => {
    switch (phase) {
      case 'LOCKING_AND_PAUSING':
        return currentLang === 'om'
          ? 'Barreeffama haaraa dhaabaa fi hojii jalqabame xumuraa jira...'
          : currentLang === 'am'
          ? 'አዳዲስ መረጃዎችን በመቆለፍ እና የተጀመሩትን በማጠናቀቅ ላይ...'
          : 'Acquiring write lock, pausing background sync & draining active writes...';
      case 'COORDINATING_TABS':
        return currentLang === 'om'
          ? 'Baniinsa (tabs) browser biroo qindeessaa jira...'
          : currentLang === 'am'
          ? 'ሌሎች ክፍት የአሳሽ መስኮቶችን በማስተባበር ላይ...'
          : 'Coordinating active browser tabs and service worker...';
      case 'INVENTORY_AND_SYNC':
        return currentLang === 'om'
          ? 'Ragaalee gara Cloud (Firestore) ergaa fi qulqullina mirkaneessaa jira...'
          : currentLang === 'am'
          ? 'ያልተጫኑ መረጃዎችን ወደ ክላውድ በመላክ እና በመመርመር ላይ...'
          : 'Synchronizing pending edits with Firestore & building local inventory...';
      case 'CLOSING_IDB_AND_PURGING':
        return currentLang === 'om'
          ? 'IndexedDB cufee kuusaa meeshaa qulqulleessaa jira...'
          : currentLang === 'am'
          ? 'የአካባቢ ዳታቤዝ (IndexedDB) በመዝጋት እና በማጽዳት ላይ...'
          : 'Closing IndexedDB connections and verifying database deletion...';
      case 'SIGNING_OUT_FIREBASE':
      case 'VERIFYING_COMPLETION':
        return currentLang === 'om'
          ? 'Firebase Auth irraa baʼaa fi mirkaneessaa jira...'
          : currentLang === 'am'
          ? 'ከ Firebase Auth በመውጣት እና በማረጋገጥ ላይ...'
          : 'Signing out of Firebase Authentication and verifying isolation...';
      default:
        return '';
    }
  })();

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-[2rem] p-6 max-w-lg w-full space-y-4 shadow-2xl relative overflow-hidden my-auto">
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            phase === 'ISOLATION_LOCKDOWN' || lockdownState?.active
              ? 'bg-rose-600'
              : 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600'
          }`}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                phase === 'ISOLATION_LOCKDOWN' || lockdownState?.active
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}
            >
              {phase === 'ISOLATION_LOCKDOWN' || lockdownState?.active ? (
                <Lock className="w-5 h-5" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">
                {phase === 'ISOLATION_LOCKDOWN' || lockdownState?.active
                  ? currentLang === 'om'
                    ? 'Cufiinsa Nageenyaa (Isolation Lockdown)'
                    : currentLang === 'am'
                    ? 'የደህንነት መቆለፊያ (Isolation Lockdown)'
                    : 'Shared-Device Isolation Lockdown'
                  : currentLang === 'om'
                  ? 'Mirkaneessa Baasii Nageenyaa (Secure Sign-Out)'
                  : currentLang === 'am'
                  ? 'ደህንነቱ የተጠበቀ መውጫ (Secure Sign-Out)'
                  : 'Guarded Secure Sign-Out'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[300px]">
                {userEmail || (currentLang === 'om' ? 'Fayyadamaa ammaa' : 'Active session')}
              </p>
            </div>
          </div>

          {canDismissStaySignedIn && (
            <button
              type="button"
              onClick={handleStaySignedIn}
              aria-label="Stay signed in"
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* PHASE: ISOLATION LOCKDOWN */}
        {(phase === 'ISOLATION_LOCKDOWN' || lockdownState?.active) && (
          <div className="space-y-4">
            <div className="bg-rose-950/60 border border-rose-500/50 rounded-2xl p-4 space-y-2 text-xs text-rose-100">
              <div className="flex items-center gap-2 font-black text-rose-300 uppercase">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Account Switching Blocked Until Cleanup Is Verified</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-200">
                {lockdownState?.details ||
                  holdReason ||
                  'Local session cleanup or Firebase sign-out did not verify completion. Another user cannot sign in on this device until resolved.'}
              </p>
              <div className="text-[10px] font-mono bg-slate-950/80 rounded-xl p-2.5 text-rose-300 space-y-1">
                <div>Step: {lockdownState?.failedStep || phase}</div>
                <div>Reason: {lockdownState?.reason || 'UNVERIFIED_CLEANUP'}</div>
                {lockdownState?.dbDeleteStatus && <div>IndexedDB status: {lockdownState.dbDeleteStatus}</div>}
                {unackedTabs.length > 0 && <div>Unresponsive tabs: {unackedTabs.join(', ')}</div>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRecoveryRetry}
                disabled={isBusy}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>
                  {lockdownState?.failedStep === 'FIREBASE_SIGNOUT'
                    ? 'Retry Firebase Sign-Out'
                    : 'Retry Cleanup & Sign Out'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                disabled={isBusy}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase cursor-pointer"
              >
                Reload Browser Tab
              </button>
            </div>
          </div>
        )}

        {/* PHASE: IN-PROGRESS */}
        {!lockdownState?.active && isInProgressPhase && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin shrink-0" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-300">{phase}</div>
                <p className="text-xs text-slate-300">{phaseLabel}</p>
              </div>
            </div>
            {canDismissStaySignedIn && (
              <button
                type="button"
                onClick={handleStaySignedIn}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer"
              >
                Cancel & Stay Signed In
              </button>
            )}
          </div>
        )}

        {/* PHASE: SAFE HOLD */}
        {!lockdownState?.active && phase === 'SAFE_HOLD' && (
          <div className="space-y-4">
            <div className="bg-amber-950/50 border border-amber-500/50 rounded-2xl p-4 space-y-2 text-xs text-amber-100">
              <div className="flex items-center gap-2 font-black text-amber-300 uppercase">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Sign-Out Paused in Safe Hold (No Data Deleted)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200">
                {holdReason ||
                  'Unable to safely verify all local data or active tabs. Your local data has been preserved untouched.'}
              </p>
              {inventory && !inventory.verified && (
                <ul className="list-disc pl-4 text-[11px] text-rose-300 space-y-0.5">
                  {inventory.unverifiedReasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              )}
              {unackedTabs.length > 0 && (
                <p className="text-[11px] text-amber-300 font-mono">
                  Waiting for active browser tabs: {unackedTabs.join(', ')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRetrySync}
                disabled={isBusy}
                className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Retry Verification & Sync</span>
              </button>

              <button
                type="button"
                onClick={handleStaySignedIn}
                disabled={isBusy}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase cursor-pointer"
              >
                Stay Signed In (Resume Sync)
              </button>
            </div>
          </div>
        )}

        {/* PHASE: AWAITING USER DECISION */}
        {!lockdownState?.active && phase === 'AWAITING_USER_DECISION' && inventory && (
          <div className="space-y-4">
            {/* Live Inventory Breakdown */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span>Live Local Storage Inventory</span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900 rounded-xl p-2 border border-slate-800">
                  <div className="text-slate-400">Queued Uploads</div>
                  <div className={`font-black text-sm ${inventory.counts.pendingUpload > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {inventory.counts.pendingUpload}
                  </div>
                </div>
                <div className="bg-slate-900 rounded-xl p-2 border border-slate-800">
                  <div className="text-slate-400">Local-Only Drafts/Docs</div>
                  <div className={`font-black text-sm ${inventory.counts.localOnly > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {inventory.counts.localOnly}
                  </div>
                </div>
                <div className="bg-slate-900 rounded-xl p-2 border border-slate-800">
                  <div className="text-slate-400">Institutional Replicas</div>
                  <div className="font-bold text-sm text-sky-300">
                    {inventory.counts.institutionalLocalReplica}
                  </div>
                </div>
                <div className="bg-slate-900 rounded-xl p-2 border border-slate-800">
                  <div className="text-slate-400">Server-Confirmed</div>
                  <div className="font-bold text-sm text-emerald-400">
                    {inventory.counts.serverConfirmed}
                  </div>
                </div>
              </div>

              {inventory.counts.institutionalUniqueLocalOnly > 0 && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-2.5 text-[11px] text-rose-200">
                  <strong>Institutional Notice:</strong> {inventory.counts.institutionalUniqueLocalOnly} local court case
                  draft(s) have no cloud sync endpoint in this version. Canonical Firestore court records are never touched,
                  but these local drafts only exist on this device unless exported.
                </div>
              )}

              {syncErrors.length > 0 && (
                <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5 text-[11px] text-amber-200 space-y-0.5">
                  <div className="font-bold">Cloud Sync Incomplete:</div>
                  <div className="truncate">{syncErrors[0]}</div>
                </div>
              )}
            </div>

            {holdReason && (
              <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                {holdReason}
              </div>
            )}

            {/* Shared-Device Wipe Policy + Optional Export + 2-Step Discard Consent */}
            {requiresDiscardConsent ? (
              <div className="space-y-3">
                {/* Export Backup */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={isBusy}
                    className="w-full py-2.5 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/35 border border-sky-500/40 text-sky-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {backupExported
                        ? '✓ Unencrypted JSON Backup Downloaded'
                        : `Export Unencrypted Local Backup (${inventory.exportableItems.length} item${inventory.exportableItems.length === 1 ? '' : 's'})`}
                    </span>
                  </button>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Notice: This downloads an unencrypted plaintext JSON file because no key-managed archive encryption
                    is implemented in this version. Store the exported file securely.
                  </p>
                  {backupError && <p className="text-[11px] text-rose-400">{backupError}</p>}
                </div>

                {/* Step 1 Destructive Discard Toggle (Default FALSE) */}
                <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-3.5 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantDiscard}
                      onChange={(e) => {
                        setWantDiscard(e.target.checked);
                        if (!e.target.checked) setSecondDiscardConfirm(false);
                      }}
                      disabled={isBusy}
                      className="mt-0.5 w-4 h-4 rounded border-rose-500/60 bg-slate-900 text-rose-500 cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>
                        Discard {totalAtRiskCount} unsynced / local-only record(s) from this device and sign out
                      </span>
                    </span>
                  </label>

                  {/* Step 2 Mandatory Confirmation */}
                  {wantDiscard && (
                    <label className="flex items-start gap-2.5 cursor-pointer bg-rose-950/60 border border-rose-500/60 rounded-xl p-2.5">
                      <input
                        type="checkbox"
                        checked={secondDiscardConfirm}
                        onChange={(e) => setSecondDiscardConfirm(e.target.checked)}
                        disabled={isBusy}
                        className="mt-0.5 w-4 h-4 rounded border-rose-400 bg-slate-950 text-rose-500 cursor-pointer shrink-0"
                      />
                      <span className="text-[11px] text-rose-100 leading-relaxed">
                        <strong>Final Confirmation:</strong> I understand {totalAtRiskCount} local item(s)
                        {inventory.counts.institutionalUniqueLocalOnly > 0
                          ? ` (including ${inventory.counts.institutionalUniqueLocalOnly} local court case draft(s))`
                          : ''}{' '}
                        will be permanently wiped from this browser so no next user on this shared device can read them.
                        Canonical Firestore court records remain untouched.
                      </span>
                    </label>
                  )}
                </div>

                {/* Actions when unsynced/local-only data exists */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRetrySync}
                    disabled={isBusy}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Sync</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStaySignedIn}
                    disabled={isBusy}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    Stay Signed In
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmLogoutClick}
                    disabled={isBusy || !(wantDiscard && secondDiscardConfirm)}
                    className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Discard & Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Clean Sign-Out Path (No unverified or blocking unsynced/local-only data) */
              <div className="space-y-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-[11px] text-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    All server-backed data is verified synced. Sensitive local caches & IndexedDB will be wiped for
                    shared-device isolation while UI preferences (language/theme) remain.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleStaySignedIn}
                    disabled={isBusy}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase cursor-pointer"
                  >
                    Stay Signed In
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmLogoutClick}
                    disabled={isBusy}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-xs uppercase shadow-lg shadow-rose-600/30 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    <span>Wipe & Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
