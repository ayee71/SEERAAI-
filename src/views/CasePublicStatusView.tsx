import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Calendar,
  Clock,
  Gavel,
  User,
  ArrowLeft,
  RefreshCw,
  FileText,
  AlertCircle,
  Building,
  CheckCircle2,
  WifiOff,
  Radio,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import {
  syncCaseStatusFromFirestore,
  subscribeToCaseByIdFromFirestore,
  subscribeToCaseActivityLogs,
  FirestoreCaseDocket,
  CaseActivityLog,
} from '../services/courtCaseService';
import { getCaseStatusColorConfig, calculateCaseStatus } from '../utils/caseStatus';
import { useOfflineMode } from '../hooks/useOfflineMode';

interface CasePublicStatusViewProps {
  currentLang: Language;
  caseId: string;
  onBack?: () => void;
}

function mapDocketStageToWorkflowStage(stage?: FirestoreCaseDocket['currentStage']): string {
  switch (stage) {
    case 'closed':
      return 'closed';
    case 'partially_heard':
      return 'partially_heard';
    case 'substantive_hearing':
    case 'plaintiff_reply_hearing':
    case 'second_summons':
    case 'first_summons':
      return 'hearing';
    case 'coordinator_review':
    case 'assigned_to_judge':
    case 'preliminary_objection':
      return 'review';
    case 'intake':
    default:
      return 'draft';
  }
}

function formatSafeDate(dateValue?: string | null): string {
  if (!dateValue) return '—';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CasePublicStatusView: React.FC<CasePublicStatusViewProps> = ({
  currentLang,
  caseId,
  onBack,
}) => {
  const { isManualOffline, isNetworkOnline, isEffectiveOffline } = useOfflineMode();

  const [caseData, setCaseData] = useState<FirestoreCaseDocket | null>(null);
  const [activityLogs, setActivityLogs] = useState<CaseActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [liveStreamActive, setLiveStreamActive] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncSource, setSyncSource] = useState<'server' | 'cache'>('cache');
  const [syncNotice, setSyncNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performSync = useCallback(
    async (isInitial: boolean = false) => {
      if (!caseId) {
        setLoading(false);
        setError(
          currentLang === 'om'
            ? 'Lakkoofsi galmee (caseId) hin kennamne.'
            : currentLang === 'am'
            ? 'የመዝገብ መለያ (caseId) አልተሰጠም።'
            : 'No case ID was provided.'
        );
        return;
      }

      if (isInitial) {
        setLoading(true);
      } else {
        setIsSyncing(true);
      }
      setError(null);

      try {
        const result = await syncCaseStatusFromFirestore(caseId);
        if (result.caseData) {
          if (result.caseData.isPublic === false) {
            setCaseData(null);
            setError(
              currentLang === 'om'
                ? 'Galmeen kun iccitummaan isaa eegamee uummata irraa cufameera.'
                : currentLang === 'am'
                ? 'ይህ መዝገብ ሚስጥራዊነቱ የተጠበቀ ስለሆነ ለሕዝብ ክፍት አይደለም።'
                : 'This case record is restricted and not available for public viewing.'
            );
          } else {
            setCaseData(result.caseData);
            setActivityLogs(result.activityLogs);
            setLastSyncedAt(result.syncedAt);
            setSyncSource(result.source);

            if (!isInitial) {
              if (result.offline) {
                setSyncNotice({
                  type: 'warning',
                  text:
                    currentLang === 'om'
                      ? 'Haalli Offline banaadha — ragaa kuusaa naannoo irraa mul\'ataa jira.'
                      : currentLang === 'am'
                      ? 'ከመስመር ውጭ ሁነታ ላይ ነዎት — የተሸጎጠው መረጃ እየታየ ነው።'
                      : 'Offline mode active — displaying cached case docket.',
                });
              } else if (result.source === 'server') {
                setSyncNotice({
                  type: 'success',
                  text:
                    currentLang === 'om'
                      ? 'Haalli galmee haaraan Firestore irraa haaromfameera.'
                      : currentLang === 'am'
                      ? 'የቅርብ ጊዜ የመዝገብ ሁኔታ ከ Firestore ተመሳስሏል።'
                      : 'Latest case status fetched from Firestore.',
                });
              } else {
                setSyncNotice({
                  type: 'warning',
                  text:
                    currentLang === 'om'
                      ? 'Firestore server dhaqqabuu hin dandeenye — ragaa kuusaa naannoo fayyadamaa jira.'
                      : currentLang === 'am'
                      ? 'የ Firestore አገልጋይ አልተገኘም — ከመሸጎጫው የተገኘ መረጃ እየታየ ነው።'
                      : 'Firestore server unavailable — showing cached status.',
                });
              }
            }
          }
        } else {
          setError(
            currentLang === 'om'
              ? 'Galmeen kun hin argamne.'
              : currentLang === 'am'
              ? 'መዝገቡ አልተገኘም።'
              : 'Case not found.'
          );
        }
      } catch {
        if (isInitial) {
          setError(
            currentLang === 'om'
              ? 'Dogoggorri uumameera.'
              : currentLang === 'am'
              ? 'የመዝገቡን ሁኔታ ማምጣት አልተቻለም።'
              : 'Failed to load case status.'
          );
        } else {
          setSyncNotice({
            type: 'error',
            text:
              currentLang === 'om'
                ? 'Haaromsuun hin milkoofne — irra deebi\'ii yaali.'
                : currentLang === 'am'
                ? 'ማመሳሰል አልተሳካም — እባክዎ እንደገና ይሞክሩ።'
                : 'Sync failed — please try again.',
          });
        }
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    },
    [caseId, currentLang]
  );

  // Initial load from Firestore
  useEffect(() => {
    performSync(true);
  }, [performSync]);

  // Real-time Firestore snapshot listener for case document + activity logs
  useEffect(() => {
    if (!caseId || !liveStreamActive || isEffectiveOffline) return;

    const unsubCase = subscribeToCaseByIdFromFirestore(
      caseId,
      (updatedCase, fromCache) => {
        if (updatedCase.isPublic === false) {
          setCaseData(null);
          setError(
            currentLang === 'om'
              ? 'Galmeen kun iccitummaan isaa eegamee uummata irraa cufameera.'
              : 'This case record is restricted and not available for public viewing.'
          );
          return;
        }
        setCaseData(updatedCase);
        setSyncSource(fromCache ? 'cache' : 'server');
        setLastSyncedAt(new Date().toISOString());
      },
      () => {
        // Real-time snapshot fallback handled gracefully
      }
    );

    const unsubLogs = subscribeToCaseActivityLogs(caseId, (logs) => {
      setActivityLogs(logs);
    });

    return () => {
      unsubCase();
      unsubLogs();
    };
  }, [caseId, liveStreamActive, isEffectiveOffline, currentLang]);

  // Auto-dismiss transient sync notice
  useEffect(() => {
    if (!syncNotice) return;
    const timer = setTimeout(() => setSyncNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [syncNotice]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-mono text-xs">Fetching Case Status from Firestore...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center space-y-5 shadow-2xl">
          <AlertCircle className="w-14 h-14 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">{error || 'Access Restricted'}</h2>
          <p className="text-sm text-slate-400">
            {currentLang === 'om'
              ? 'Galmeen barbaaddan iccitii ta\'uu ykn ammaaf dhabamuu danda\'a.'
              : currentLang === 'am'
              ? 'የሚፈልጉት መዝገብ የግል ሊሆን ወይም ላይገኝ ይችላል።'
              : 'The case record you are looking for is either private or does not exist.'}
          </p>
          <div className="flex items-center gap-3">
            {caseId && (
              <button
                type="button"
                onClick={() => performSync(false)}
                disabled={isSyncing}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{currentLang === 'om' ? 'Deebisii Yaali' : 'Retry Sync'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => (onBack ? onBack() : window.location.assign('/?tab=home'))}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer"
            >
              {currentLang === 'om' ? 'Gara Fuula Duraa' : 'Go to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const calculatedStatus = calculateCaseStatus({
    id: caseData.id,
    caseNumber: caseData.caseNumber,
    filingDate: caseData.filingDate,
    hearingDate: caseData.nextHearingDate,
    lastModified: caseData.updatedAt || caseData.createdAt,
    stage: mapDocketStageToWorkflowStage(caseData.currentStage),
  });
  const statusConfig = getCaseStatusColorConfig(calculatedStatus);

  const syncButtonLabel = isSyncing
    ? currentLang === 'om'
      ? 'Haaromsaa jira...'
      : currentLang === 'am'
      ? 'በማመሳሰል ላይ...'
      : 'Syncing...'
    : currentLang === 'om'
    ? 'Haala Kallattii Haaromsi'
    : currentLang === 'am'
    ? 'የቀጥታ ሁኔታ አመሳስል'
    : 'Sync Live Status';

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 space-y-6">
      {/* Top Action Bar */}
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (onBack ? onBack() : window.location.assign('/?tab=home'))}
            className="p-2.5 min-h-[40px] min-w-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-medium text-emerald-300 whitespace-nowrap">
              {currentLang === 'om'
                ? 'Kuusaa Galmee Uummataa'
                : currentLang === 'am'
                ? 'ደህንነቱ የተጠበቀ የመዝገብ ፖርታል'
                : 'Secure Case Portal'}
            </span>
          </div>
        </div>

        {/* Real-Time Sync Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setLiveStreamActive((prev) => !prev)}
            disabled={isEffectiveOffline}
            aria-pressed={liveStreamActive && !isEffectiveOffline}
            className={`px-3 py-2 min-h-[40px] rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              isEffectiveOffline
                ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                : liveStreamActive
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/80'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title={
              isEffectiveOffline
                ? 'Live stream paused while offline'
                : 'Toggle real-time Firestore listener'
            }
          >
            {isEffectiveOffline ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Radio className={`w-3.5 h-3.5 shrink-0 ${liveStreamActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            )}
            <span>
              {isEffectiveOffline
                ? isManualOffline
                  ? 'Offline Mode'
                  : 'No Internet'
                : liveStreamActive
                ? 'Live Stream: On'
                : 'Live Stream: Paused'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => performSync(false)}
            disabled={isSyncing}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{syncButtonLabel}</span>
          </button>
        </div>
      </div>

      {/* Transient Sync Feedback Banner */}
      {syncNotice && (
        <div
          role="status"
          className={`max-w-3xl mx-auto px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
            syncNotice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : syncNotice.type === 'warning'
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{syncNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-slate-400 hover:text-white px-1 cursor-pointer"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Case Overview Card */}
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-slate-900/90 p-6 sm:p-8 border-b border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
              <span className="text-amber-400 font-semibold">Official Case Docket</span>
              <span aria-hidden="true">·</span>
              <span>#{caseData.caseNumber}</span>
              <span aria-hidden="true">·</span>
              <span>Stage: {caseData.currentStage.replace(/_/g, ' ')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-serif-legal">
              {caseData.claimSubject.split('(')[0].trim()}
            </h1>
            <p className="text-sm text-slate-400 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-amber-500/70 shrink-0" />
              <span>{caseData.bench || 'Mana Murtii Sadarkaa Sadeenuu'}</span>
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 ${statusConfig.pillClass}`}>
              <span className="text-sm font-bold whitespace-nowrap">{statusConfig.label}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums text-left sm:text-right">
              <div>Last updated: {formatSafeDate(caseData.updatedAt || caseData.createdAt)}</div>
              <div className="text-slate-500 mt-0.5">
                {syncSource === 'server' && !isEffectiveOffline
                  ? 'Firestore Server'
                  : !isNetworkOnline || isManualOffline
                  ? 'Local Cache (Offline)'
                  : 'Local Cache'}{' '}
                {lastSyncedAt ? `· Synced ${formatSafeDate(lastSyncedAt)}` : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Party Details */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Parties Involved</span>
            </h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono mb-1">Claimant (Himataa)</div>
                <div className="text-sm font-bold text-white">{caseData.claimantName}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono mb-1">Respondent (Himatamaa)</div>
                <div className="text-sm font-bold text-white">{caseData.respondentName}</div>
              </div>
            </div>
          </div>

          {/* Schedule & Judge */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Court Schedule</span>
            </h3>
            <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/25 space-y-5 text-center">
              <div className="space-y-1">
                <div className="text-[11px] text-amber-400/80 font-semibold font-mono">
                  Upcoming Hearing Date
                </div>
                <div className="text-3xl font-black text-amber-400 font-mono tracking-tight tabular-nums">
                  {caseData.nextHearingDate || 'TBD'}
                </div>
                <div className="text-xs text-slate-300 flex items-center justify-center gap-1.5 mt-1 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{caseData.hearingTime || '09:00 AM'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-left">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-slate-400 font-mono">Assigned Judge</div>
                  <div className="text-xs font-bold text-slate-100">{caseData.assignedJudge}</div>
                </div>
                <Gavel className="w-7 h-7 text-amber-500/30" />
              </div>
            </div>
          </div>
        </div>

        {/* Latest Status Updates Timeline */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-4 border-t border-slate-800 pt-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              {currentLang === 'om'
                ? 'Jijjiiramoota Haala Galmee Dhihoo'
                : currentLang === 'am'
                ? 'የቅርብ ጊዜ የመዝገብ ሁኔታ ለውጦች'
                : 'Latest Status Updates'}
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {activityLogs.length} {activityLogs.length === 1 ? 'update' : 'updates'}
            </span>
          </div>

          {activityLogs.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Jijjiiramni haala galmee haaraan hin galmaa\'in jira.'
                : currentLang === 'am'
                ? 'እስካሁን የተመዘገቡ የሁኔታ ለውጦች የሉም።'
                : 'No status activity entries recorded yet.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-800 rounded-xl bg-slate-950 border border-slate-800">
              {activityLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs font-bold text-slate-100">{log.title}</div>
                    <p className="text-xs text-slate-400 leading-relaxed">{log.description}</p>
                    <div className="text-[11px] text-slate-500">
                      {log.performedBy}
                      {log.performedByRole ? ` · ${log.performedByRole}` : ''}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                    {formatSafeDate(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Notice */}
        <div className="p-6 bg-slate-950/60 border-t border-slate-800 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Requirement Notice</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please ensure you are present at the court bench 30 minutes before the scheduled time with all original evidence documents.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="max-w-3xl mx-auto text-center space-y-3 pt-6 opacity-70">
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500 font-bold">
            S
          </div>
          <span className="text-sm font-serif-legal text-slate-300">SeeraAI Legal Intelligence</span>
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          Powered by Ethiopian Justice Digitization Initiative
        </p>
      </div>
    </div>
  );
};

export const CaseStatusView = CasePublicStatusView;
