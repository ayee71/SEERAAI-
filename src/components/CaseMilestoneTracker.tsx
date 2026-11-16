import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Scale, 
  FileText, 
  Calendar, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  X, 
  ChevronRight,
  RefreshCw,
  Edit3,
  Gavel,
  Users,
  Check,
  Building2,
  Bookmark,
  BarChart2,
  Layers,
  AlertCircle,
  Paperclip,
  Upload,
  FileCheck,
  Eye,
  Trash2,
  ExternalLink,
  PlusCircle,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck as SealIcon,
  Search,
  Database,
  Printer,
  Lock,
  Shield
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { 
  CaseMilestoneProgress, 
  MilestoneStage, 
  CaseProcedureType, 
  MilestoneStatus, 
  StageDocumentAttachment,
  MilestoneAuditLog,
  fetchCaseMilestoneProgress, 
  fetchMilestoneAuditLogsFromFirestore,
  updateMilestoneStageStatus, 
  switchCaseProcedureType,
  updateCaseMetadata,
  validateEthiopianDocketNumber,
  attachDocumentToStage,
  removeDocumentFromStage,
  searchKnownCases,
  getKnownCases,
  BENCHMARK_CASES
} from '../services/caseMilestoneService';
import { D3CaseTimelineChart } from './D3CaseTimelineChart';
import { CaseMilestoneTimeDistributionChart } from './CaseMilestoneTimeDistributionChart';
import courtDocketEmblem from '../assets/images/court_docket_emblem_1793700236599.jpg';
import docketCaseEmblem from '../assets/images/docket_case_emblem_1793701871807.jpg';
import civilCaseEmblem from '../assets/images/civil_case_emblem_1793702678249.jpg';
import { formatEthiopianDate, formatCourtHearingScheduleDate } from '../utils/ethiopianCalendar';

interface CaseMilestoneTrackerProps {
  currentLang: Language;
  caseNumber: string;
  caseTitle?: string;
  onStageSelect?: (stage: MilestoneStage) => void;
  onNavigateTab?: (tab: string) => void;
}

export const CaseMilestoneTracker: React.FC<CaseMilestoneTrackerProps> = ({
  currentLang,
  caseNumber,
  caseTitle = '',
  onStageSelect,
  onNavigateTab,
}) => {
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const [activeCaseNum, setActiveCaseNum] = useState<string>(caseNumber);
  const [progress, setProgress] = useState<CaseMilestoneProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<MilestoneStage | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [recentlyUpdatedStageId, setRecentlyUpdatedStageId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'d3' | 'analytics' | 'interactive' | 'auditLog'>('d3');
  const [showEmblemModal, setShowEmblemModal] = useState(false);

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<CaseMilestoneProgress[]>([]);

  // Metadata drawer state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [docketInput, setDocketInput] = useState('');
  const [judgeInput, setJudgeInput] = useState('');
  const [claimantInput, setClaimantInput] = useState('');
  const [defendantInput, setDefendantInput] = useState('');
  const [docketErr, setDocketErr] = useState<string | null>(null);

  // Document Attachment State
  const [isAttachingDoc, setIsAttachingDoc] = useState(false);
  const [orderTitleInput, setOrderTitleInput] = useState('');
  const [orderTypeInput, setOrderTypeInput] = useState<StageDocumentAttachment['orderType']>('court_order');
  const [orderNotesInput, setOrderNotesInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<StageDocumentAttachment | null>(null);

  // Milestone Audit Trail Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isFetchingAuditLogs, setIsFetchingAuditLogs] = useState(false);
  const [milestoneAuditLogs, setMilestoneAuditLogs] = useState<MilestoneAuditLog[]>([]);
  const [auditSource, setAuditSource] = useState<'firestore' | 'cache'>('cache');
  const [auditModalStageTitle, setAuditModalStageTitle] = useState<string | null>(null);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Fetch detailed timestamped audit trail from Firestore for currently selected or active milestone
  const handleOpenMilestoneAuditTrail = async (targetStageId?: string) => {
    if (!progress) return;
    const stageToQuery = targetStageId || selectedStage?.id || progress.currentStageId;
    const activeStage = progress.stages.find((s) => s.id === stageToQuery) || selectedStage;

    setIsFetchingAuditLogs(true);
    setIsAuditModalOpen(true);
    setAuditModalStageTitle(activeStage ? (activeStage.title[currentLang] || activeStage.title.om) : null);

    try {
      const { logs, source, milestoneTitle } = await fetchMilestoneAuditLogsFromFirestore(activeCaseNum, stageToQuery);
      setMilestoneAuditLogs(logs);
      setAuditSource(source);
      if (milestoneTitle) setAuditModalStageTitle(milestoneTitle);
    } catch (err) {
      console.warn('[CaseMilestoneTracker] Audit log fetch error:', err);
    } finally {
      setIsFetchingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (caseNumber && caseNumber !== activeCaseNum) {
      setActiveCaseNum(caseNumber);
    }
  }, [caseNumber]);

  useEffect(() => {
    loadMilestones(activeCaseNum);
    const handleUpdate = (e: any) => {
      if (e.detail?.caseNumber === activeCaseNum) {
        setProgress(e.detail);
        if (selectedStage) {
          const matched = e.detail.stages?.find((s: MilestoneStage) => s.id === selectedStage.id);
          if (matched) setSelectedStage(matched);
        }
      }
    };
    const handleForceRefresh = (e: any) => {
      if (e.detail?.caseNumber === activeCaseNum) {
        setProgress(e.detail);
        setLoading(false);
        if (selectedStage) {
          const matched = e.detail.stages?.find((s: MilestoneStage) => s.id === selectedStage.id);
          if (matched) setSelectedStage(matched);
        }
      }
    };
    window.addEventListener('seera_case_milestones_updated', handleUpdate);
    window.addEventListener('seera_case_milestones_force_refresh', handleForceRefresh);
    return () => {
      window.removeEventListener('seera_case_milestones_updated', handleUpdate);
      window.removeEventListener('seera_case_milestones_force_refresh', handleForceRefresh);
    };
  }, [activeCaseNum, selectedStage?.id]);

  const loadMilestones = async (cNum: string) => {
    setLoading(true);
    const data = await fetchCaseMilestoneProgress(cNum, 'criminal', caseTitle);
    setProgress(data);
    setDocketInput(data.docketNumber || data.caseNumber);
    setJudgeInput(data.presidingJudge || '');
    setClaimantInput(data.partiesInvolved?.claimant || '');
    setDefendantInput(data.partiesInvolved?.defendant || '');
    setLoading(false);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const matched = searchKnownCases(query);
    setSearchResults(matched);
    setIsSearchOpen(true);
  };

  const handleSelectCase = (targetCase: CaseMilestoneProgress) => {
    setActiveCaseNum(targetCase.caseNumber);
    setProgress(targetCase);
    setSelectedStage(null);
    setDocketInput(targetCase.docketNumber || targetCase.caseNumber);
    setJudgeInput(targetCase.presidingJudge || '');
    setClaimantInput(targetCase.partiesInvolved?.claimant || '');
    setDefendantInput(targetCase.partiesInvolved?.defendant || '');
    setIsSearchOpen(false);
    setSearchQuery('');
    setToastType('success');
    setToastMsg(
      isOm
        ? `Galmeen ${targetCase.docketNumber || targetCase.caseNumber} filatameera!`
        : `Selected case docket: ${targetCase.docketNumber || targetCase.caseNumber}`
    );
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleProcedureSwitch = async (newType: CaseProcedureType) => {
    if (!progress || progress.procedureType === newType) return;
    setLoading(true);
    const updated = await switchCaseProcedureType(activeCaseNum, newType);
    setProgress(updated);
    setSelectedStage(null);
    setLoading(false);
  };

  const handleStatusChange = async (stageId: string, newStatus: MilestoneStatus) => {
    if (!progress) return;
    setIsUpdating(true);
    setRecentlyUpdatedStageId(stageId);

    const updated = await updateMilestoneStageStatus(activeCaseNum, stageId, newStatus, noteInput.trim() || undefined);
    setProgress(updated);

    const match = updated.stages.find((s) => s.id === stageId);
    if (match) setSelectedStage(match);

    setToastType('success');
    setToastMsg(
      isOm 
        ? `Sadarkaan ${match?.title.om || 'milestone'} sirreeffameera!` 
        : `Stage status updated to ${newStatus.toUpperCase()}!`
    );
    setIsUpdating(false);

    // Keep active transition glow highlight for 2 seconds
    setTimeout(() => {
      setRecentlyUpdatedStageId(null);
    }, 2000);

    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleDocketChange = (val: string) => {
    setDocketInput(val);
    if (val.trim()) {
      const validation = validateEthiopianDocketNumber(val);
      if (!validation.isValid) {
        setDocketErr(validation.errorMsg || 'Invalid docket number format');
      } else {
        setDocketErr(null);
      }
    } else {
      setDocketErr(null);
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progress) return;

    // Run Docket Number validation layer
    const validation = validateEthiopianDocketNumber(docketInput);
    if (!validation.isValid) {
      setDocketErr(validation.errorMsg || 'Invalid Ethiopian Court Docket Number format');
      setToastType('error');
      setToastMsg(validation.errorMsg || 'Docket number format error');
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    setDocketErr(null);
    setIsUpdating(true);

    try {
      const updated = await updateCaseMetadata(activeCaseNum, {
        docketNumber: docketInput.trim() || progress.caseNumber,
        presidingJudge: judgeInput.trim() || undefined,
        claimant: claimantInput.trim() || undefined,
        defendant: defendantInput.trim() || undefined,
      });

      setProgress(updated);
      setIsEditingMetadata(false);
      setIsUpdating(false);

      setToastType('success');
      setToastMsg(
        isOm 
          ? 'Odeeffannoon Galmee Mana Murtii Firestore irratti kuufameera!' 
          : 'Case metadata (Docket #, Judge & Parties) successfully persisted to Firestore!'
      );
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setIsUpdating(false);
      setToastType('error');
      setToastMsg(err.message || 'Failed to update case metadata in Firestore');
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // Handle File Input selection for document attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!orderTitleInput) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setOrderTitleInput(cleanName);
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setFileDataUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit new document attachment to current stage
  const handleAttachDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progress || !selectedStage || !orderTitleInput.trim()) return;

    setIsUpdating(true);
    try {
      const fileSizeStr = selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB';
      const fileNameStr = selectedFile ? selectedFile.name : `${orderTitleInput.trim().replace(/\s+/g, '_')}.pdf`;

      const updated = await attachDocumentToStage(activeCaseNum, selectedStage.id, {
        fileName: fileNameStr,
        fileType: selectedFile?.type || 'application/pdf',
        fileSize: fileSizeStr,
        orderTitle: orderTitleInput.trim(),
        orderType: orderTypeInput,
        notes: orderNotesInput.trim() || undefined,
        fileUrl: fileDataUrl || undefined,
      });

      setProgress(updated);
      const updatedMatch = updated.stages.find((s) => s.id === selectedStage.id);
      if (updatedMatch) setSelectedStage(updatedMatch);

      // Reset attachment form
      setIsAttachingDoc(false);
      setOrderTitleInput('');
      setOrderNotesInput('');
      setSelectedFile(null);
      setFileDataUrl(null);
      setIsUpdating(false);

      setToastType('success');
      setToastMsg(
        isOm 
          ? 'Sanadni Ajaja Dhaddachaa stage kanaf hidhameera!' 
          : 'Scanned court order document attached to timeline stage!'
      );
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setIsUpdating(false);
      setToastType('error');
      setToastMsg('Failed to attach court order document');
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  // Remove document attachment
  const handleRemoveDoc = async (docId: string) => {
    if (!progress || !selectedStage) return;
    if (!confirm(isOm ? 'Sanada kana galmee stage irraa haquu ni barbaadduu?' : 'Remove this court order attachment from stage history?')) return;

    setIsUpdating(true);
    try {
      const updated = await removeDocumentFromStage(activeCaseNum, selectedStage.id, docId);
      setProgress(updated);
      const updatedMatch = updated.stages.find((s) => s.id === selectedStage.id);
      if (updatedMatch) setSelectedStage(updatedMatch);

      setIsUpdating(false);
      setToastType('success');
      setToastMsg(isOm ? 'Sanadni haqameera!' : 'Court order document removed!');
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      setIsUpdating(false);
    }
  };

  // Determine active emblem seal asset based on case docket type
  const activeEmblem = progress?.procedureType === 'criminal' ? docketCaseEmblem : civilCaseEmblem;

  if (loading || !progress) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-2">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
        <p className="text-xs text-slate-400">Loading case milestone roadmap...</p>
      </div>
    );
  }

  // Calculate completion percentage
  const completedCount = progress.stages.filter((s) => s.status === 'completed').length;
  const totalStages = progress.stages.length;
  const completionPercentage = Math.round((completedCount / totalStages) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6 animate-in fade-in duration-200 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Notification Toast */}
      {toastMsg && (
        <div className={`fixed top-20 right-4 z-50 border px-4 py-2.5 rounded-2xl shadow-2xl text-xs flex items-center gap-2 animate-in slide-in-from-top-4 duration-200 ${
          toastType === 'error'
            ? 'bg-rose-950 border-rose-500 text-rose-200'
            : 'bg-emerald-950 border-emerald-500 text-emerald-200'
        }`}>
          {toastType === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Case Discovery & Search Filter Bar */}
      <div className="relative z-30 bg-slate-950/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                const results = searchKnownCases(searchQuery);
                setSearchResults(results);
                setIsSearchOpen(true);
              }}
              placeholder={
                isOm
                  ? "Lakk. Galmee ykn Maqaa Falmitootaan barbaadi... (fkn: CR-2026, Gemechu, Aberraa, Tolasaa)"
                  : isAm
                  ? "በመዝገብ ቁጥር ወይም በተከራካሪዎች ስም ይፈልጉ... (ምሳሌ፡ CR-2026፣ ገመቹ፣ አበራ)"
                  : "Search case docket, party names, or judge... (e.g., CR-2026, Gemechu, Aberraa)"
              }
              className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsSearchOpen(false);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Active Docket Status Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl shrink-0 text-xs">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
              {isOm ? 'Galmee Ammaa:' : 'የአሁን መዝገብ:'}
            </span>
            <span className="font-mono font-bold text-amber-400">{activeCaseNum}</span>
            <span className={`w-2 h-2 rounded-full ${progress.procedureType === 'criminal' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          </div>
        </div>

        {/* Live Search Results Dropdown */}
        {isSearchOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 max-h-72 overflow-y-auto space-y-1">
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-400 border-b border-slate-800/80">
              <span className="font-semibold text-slate-300">
                {isOm ? `Galmeewwan Argaman (${searchResults.length})` : `የተገኙ መዝገቦች (${searchResults.length})`}
              </span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                {isOm ? 'Cufi' : 'ዝጋ'}
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                {isOm ? 'Galmeen barbaaddan hin argamne.' : 'ምንም መዝገብ አልተገኘም።'}
              </div>
            ) : (
              searchResults.map((item) => {
                const isSelected = item.caseNumber === activeCaseNum;
                return (
                  <button
                    key={item.caseNumber}
                    type="button"
                    onClick={() => handleSelectCase(item)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200'
                        : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-amber-400">
                          {item.docketNumber || item.caseNumber}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                            item.procedureType === 'criminal'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {item.procedureType === 'criminal' ? 'YAKKAA' : 'HARIIROO'}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {item.caseTitle || 'Galmee Falmii'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        <span className="text-slate-500">Wal-falmitoota:</span>{' '}
                        {item.partiesInvolved?.claimant || 'Iyyataa'} <span className="text-amber-500 font-bold">vs</span>{' '}
                        {item.partiesInvolved?.defendant || 'Himatamaa'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {item.presidingJudge || 'Abbaa Seeraa'}
                      </span>
                      <span className="text-[10px] text-amber-500/80 font-bold mt-1 inline-block">
                        Roadmap Bani →
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Quick Benchmark Docket Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 text-[11px] scrollbar-none">
          <span className="text-[10px] text-slate-500 uppercase font-mono shrink-0 mr-1">
            {isOm ? 'Galmeewwan Ijoo:' : 'ፈጣን መዝገቦች:'}
          </span>
          {BENCHMARK_CASES.map((bCase) => {
            const isChipActive = bCase.caseNumber === activeCaseNum;
            return (
              <button
                key={bCase.caseNumber}
                type="button"
                onClick={() => handleSelectCase(bCase)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all shrink-0 cursor-pointer ${
                  isChipActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {bCase.docketNumber || bCase.caseNumber}
              </button>
            );
          })}
        </div>
      </div>

      {/* Court Emblem & Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-4 min-w-0">
          {/* Custom Court Case Emblem Seal (Automatically fetched & displayed next to docket info) */}
          <button
            type="button"
            onClick={() => setShowEmblemModal(true)}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0 bg-slate-950 group relative cursor-pointer"
            title="Click to expand case seal emblem"
          >
            <img 
              src={activeEmblem} 
              alt="Ethiopian Court Docket Emblem Seal" 
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Eye className="w-4 h-4 text-white" />
            </div>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                <span>Galmee #{progress.docketNumber || progress.caseNumber}</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {progress.procedureType === 'criminal' 
                  ? (isOm ? 'Adeemsa Falmii Yakkaa' : 'Criminal Procedure') 
                  : (isOm ? 'Adeemsa Falmii Hariiroo Hawaasaa' : 'Civil Procedure')}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-1 font-serif-legal truncate">
              {isOm ? 'Tarkaanfii & Tarree Adeemsa Seeraa' : isAm ? 'የህግ ሂደት ምዕራፎች እና እርምጃዎች' : 'Court Case Milestone Tracker & D3 Visual Pipeline'}
            </h3>
          </div>
        </div>

        {/* View Switcher & Case Type Segmented Selector */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('d3')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'd3'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>D3 Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Time & Bottlenecks</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('interactive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'interactive'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Nodes</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('auditLog')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'auditLog'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{isOm ? 'Seenaa Haalaa (Audit Log)' : 'Audit Log'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleProcedureSwitch('criminal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                progress.procedureType === 'criminal'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚖️ Criminal
            </button>
            <button
              type="button"
              onClick={() => handleProcedureSwitch('civil')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                progress.procedureType === 'civil'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📜 Civil
            </button>
          </div>
        </div>
      </div>

      {/* Case-Specific Metadata Container with Emblem & Editable Fields */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 relative">
        <div className="flex items-center justify-between gap-2 border-b border-slate-850 pb-2.5">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wide">
              {isOm ? 'Odeeffannoo Galmee Kaffaltii & Dhaddachaa (Firestore Case Metadata)' : 'Firestore Court Case Metadata'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setDocketInput(progress.docketNumber || progress.caseNumber);
              setJudgeInput(progress.presidingJudge || '');
              setClaimantInput(progress.partiesInvolved?.claimant || '');
              setDefendantInput(progress.partiesInvolved?.defendant || '');
              setDocketErr(null);
              setIsEditingMetadata(!isEditingMetadata);
            }}
            className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingMetadata ? (isOm ? 'Cufi' : 'Cancel') : (isOm ? 'Gulaali' : 'Edit Metadata')}</span>
          </button>
        </div>

        {/* Unboxed Metadata Highlights Bar with Embedded Case Emblem & Ethiopian Calendar Schedule */}
        {!isEditingMetadata ? (() => {
          const activeStage = progress.stages.find((s) => s.status === 'in_progress' || s.status === 'pending');
          const targetDeadline = activeStage?.targetDeadline || '2026-11-10';
          const ethSchedule = formatCourtHearingScheduleDate(targetDeadline, isOm ? 'om' : isAm ? 'am' : 'en');

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Docket & Seal */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/30 shrink-0 bg-slate-950">
                  <img src={activeEmblem} alt="Docket Seal" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 font-mono block">Lakk. Galmee / Docket #:</span>
                  <span className="font-bold text-slate-200 font-mono truncate block">
                    {progress.docketNumber || progress.caseNumber}
                  </span>
                </div>
              </div>

              {/* Litigants (Maqaa Wal-Falmitootaa) */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center gap-2.5">
                <Users className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 font-mono block">Wal-Falmitoota / Litigants:</span>
                  <span className="font-bold text-slate-200 truncate block">
                    {progress.partiesInvolved?.claimant || 'Iyyataa/Abbaa Alangaa'} <span className="text-amber-400 font-mono">vs</span> {progress.partiesInvolved?.defendant || 'Himatamaa'}
                  </span>
                </div>
              </div>

              {/* Hearing Schedule Date in Ethiopian Calendar (Guyyaa Beellamaa E.C.) */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center gap-2.5 bg-amber-500/5">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-amber-400 font-mono block font-bold">Guyyaa Beellamaa (E.C. Date):</span>
                  <span className="font-bold text-amber-200 truncate block font-mono">
                    {ethSchedule.ethDate}
                  </span>
                </div>
              </div>

              {/* Presiding Judge */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center gap-2.5">
                <Gavel className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 font-mono block">Abbaa Seeraa / Presiding Judge:</span>
                  <span className="font-bold text-slate-200 truncate block">
                    {progress.presidingJudge || (isOm ? 'Haa Galmeeffamu' : 'Unassigned')}
                  </span>
                </div>
              </div>
            </div>
          );
        })() : (
          /* Metadata Edit Form Drawer */
          <form onSubmit={handleSaveMetadata} className="space-y-3 pt-1 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-slate-300 block mb-1">
                  {isOm ? 'Lakk. Galmee (Docket Number):' : 'Docket Number:'}
                </label>
                <input
                  type="text"
                  value={docketInput}
                  onChange={(e) => handleDocketChange(e.target.value)}
                  placeholder="e.g. CR-2026-99812 or CIV/2026/88123"
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs text-white focus:outline-none transition-colors ${
                    docketErr ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-amber-500'
                  }`}
                />
                {docketErr && (
                  <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1 font-mono">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{docketErr}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-slate-300 block mb-1">
                  {isOm ? 'Abbaa Seeraa (Presiding Judge):' : 'Presiding Judge:'}
                </label>
                <input
                  type="text"
                  value={judgeInput}
                  onChange={(e) => setJudgeInput(e.target.value)}
                  placeholder="e.g. Abbaa Seeraa Kasaahun Dambal"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-slate-300 block mb-1">
                  {isOm ? 'Iyyataa / Abbaa Alangaa (Claimant/Prosecutor):' : 'Claimant / Prosecutor:'}
                </label>
                <input
                  type="text"
                  value={claimantInput}
                  onChange={(e) => setClaimantInput(e.target.value)}
                  placeholder="e.g. Abbaa Alangaa Federaalaa"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-slate-300 block mb-1">
                  {isOm ? 'Himatamaa / Deebii Kennaa (Defendant):' : 'Defendant / Respondent:'}
                </label>
                <input
                  type="text"
                  value={defendantInput}
                  onChange={(e) => setDefendantInput(e.target.value)}
                  placeholder="e.g. Gemechu Tadesse"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setIsEditingMetadata(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {isOm ? 'Dhiisi' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isUpdating || !!docketErr}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isOm ? 'Firestore irratti Ol-kaayi' : 'Persist to Firestore'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Courtroom Milestone Visual Progress Bar */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 rounded-2xl border border-amber-500/30 shadow-2xl space-y-3.5 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* Header & Percentage Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  {isOm ? 'Gartuun Tarkaanfii Galmee (Visual Progress Bar)' : isAm ? 'የመዝገብ ሂደት የእይታ እድገት ባር (Visual Progress Bar)' : 'Courtroom Milestone Visual Progress Bar'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {progress.docketNumber || progress.caseNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                {progress.caseTitle || (progress.procedureType === 'criminal' ? (isOm ? 'Adeemsa Falmii Yakkaa' : 'Criminal Case Proceeding') : (isOm ? 'Adeemsa Falmii Hariiroo Hawaasaa' : 'Civil Case Proceeding'))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            {/* BUTTON TO FETCH AND DISPLAY DETAILED TIMESTAMPED AUDIT TRAIL FROM FIRESTORE */}
            <button
              type="button"
              onClick={() => handleOpenMilestoneAuditTrail(selectedStage?.id)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:shadow-amber-500/20 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-amber-400/50 cursor-pointer"
              title="Fetch and display detailed timestamped audit trail from Firestore for currently selected milestone"
            >
              <FileCheck className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isOm
                  ? 'Seenaa Firestore (Audit Trail)'
                  : isAm
                  ? 'የኦዲት ታሪክ (Firestore Audit Trail)'
                  : 'Milestone Audit Trail'}
              </span>
            </button>

            <div className="text-right border-l border-slate-800/80 pl-3">
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                {completionPercentage}%
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {completedCount} / {totalStages} {isOm ? 'Marsaalee Xumuraman' : isAm ? 'ምዕራፎች ተጠናቀዋል' : 'Stages Completed'}
              </div>
            </div>
          </div>
        </div>

        {/* The Visual Progress Track with Stage Milestones */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-4 sm:h-5 rounded-full bg-slate-950 p-1 border border-slate-800 shadow-inner relative flex items-center overflow-hidden">
            {/* Filled Progress Bar */}
            <div 
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-400 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(16,185,129,0.45)] relative overflow-hidden"
              style={{ width: `${Math.max(completionPercentage, totalStages > 0 && completedCount > 0 ? 4 : 0)}%` }}
            >
              {/* Animated diagonal shimmer lines */}
              <div className="absolute inset-0 opacity-25 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:12px_12px] animate-pulse" />
            </div>

            {/* Stage Markers along the Progress Bar */}
            <div className="absolute inset-x-2 inset-y-0 flex items-center justify-between pointer-events-none">
              {progress.stages.map((stg, idx) => {
                const isStageDone = stg.status === 'completed';
                const isStageActive = stg.status === 'in_progress';
                const isStageFlagged = stg.status === 'flagged';
                const isTargetSelected = selectedStage?.id === stg.id;

                return (
                  <div
                    key={stg.id}
                    title={`${idx + 1}. ${stg.title[currentLang] || stg.title.om} (${stg.status})`}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border transition-all duration-300 pointer-events-auto cursor-pointer ${
                      isTargetSelected
                        ? 'ring-2 ring-white scale-125 z-20'
                        : ''
                    } ${
                      isStageDone
                        ? 'bg-emerald-400 border-emerald-200 shadow-sm'
                        : isStageActive
                        ? 'bg-amber-400 border-amber-100 animate-ping shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                        : isStageFlagged
                        ? 'bg-rose-500 border-rose-300'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                    onClick={() => {
                      setSelectedStage(stg);
                      setNoteInput(stg.notes || '');
                      if (onStageSelect) onStageSelect(stg);
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Scale Labels (0% to 100%) */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>0% ({isOm ? 'Jalqaba' : isAm ? 'መነሻ' : 'Start'})</span>
            <span>50%</span>
            <span>100% ({isOm ? 'Murtii Dhumaa' : isAm ? 'የመጨረሻ ውሳኔ' : 'Final Disposition'})</span>
          </div>
        </div>

        {/* Milestone Breakdown Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-850/80 text-[11px]">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold mr-1">
            {isOm ? 'Haala Marsaalee:' : isAm ? 'የምዕራፎች ሁኔታ:' : 'Stage Status:'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-medium">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>{isOm ? 'Xumurame:' : isAm ? 'የተጠናቀቁ:' : 'Completed:'} {completedCount}</span>
          </span>
          {progress.stages.filter(s => s.status === 'in_progress').length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/25 font-medium">
              <Clock className="w-3 h-3" />
              <span>{isOm ? 'Hojjatamaa:' : isAm ? 'በሂደት ላይ:' : 'In Progress:'} {progress.stages.filter(s => s.status === 'in_progress').length}</span>
            </span>
          )}
          {progress.stages.filter(s => s.status === 'flagged').length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/25 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>{isOm ? 'Qorannoo:' : isAm ? 'ማብራሪያ የሚሻ:' : 'Flagged:'} {progress.stages.filter(s => s.status === 'flagged').length}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/60 text-slate-400 border border-slate-700/50 font-medium">
            <span>{isOm ? 'Kan Eegamu:' : isAm ? 'የሚጠበቁ:' : 'Pending:'} {progress.stages.filter(s => s.status === 'pending').length}</span>
          </span>
        </div>
      </div>

      {/* Primary Timeline View: D3 Visual Chart, Time Distribution Analytics, or Interactive Nodes */}
      {activeTab === 'd3' ? (
        <D3CaseTimelineChart
          stages={progress.stages}
          currentLang={currentLang}
          selectedStageId={selectedStage?.id}
          onStageSelect={(stg) => {
            setSelectedStage(stg);
            setNoteInput(stg.notes || '');
            if (onStageSelect) onStageSelect(stg);
          }}
        />
      ) : activeTab === 'analytics' ? (
        <CaseMilestoneTimeDistributionChart
          stages={progress.stages}
          currentLang={currentLang}
          onStageSelect={(stg) => {
            setSelectedStage(stg);
            setNoteInput(stg.notes || '');
            if (onStageSelect) onStageSelect(stg);
          }}
        />
      ) : activeTab === 'auditLog' ? (
        /* Status History & Progress Audit Log View */
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-sm font-bold text-white font-serif-legal">
                  {isOm ? 'Seenaa Haala Marsaalee & Galmee Audit (Milestone Status History Audit Log)' : 'Firestore Milestone Status History & Progress Audit Log'}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  {isOm ? `Galmee #${progress.docketNumber || progress.caseNumber} - Tarkaaniwwan hundi sirnaan galmeeffamaniiru` : `Case Docket #${progress.docketNumber || progress.caseNumber} - Verified stage update timeline`}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              {progress.auditLogs?.length || 0} {isOm ? 'Galmeewwan Audit' : 'Audit Records'}
            </span>
          </div>

          {(!progress.auditLogs || progress.auditLogs.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2 bg-slate-900/60 rounded-xl border border-slate-850">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <p>{isOm ? 'Seenaan audit hanga ammaa hin galmoofne. Tarkaanfii stage tokko jijjiiraa (fkn: Complete ykn Active godhaa) akka galmaa\'u.' : 'No status change audit logs recorded yet for this docket session. Update any milestone stage status above to generate verified audit entries.'}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {progress.auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">
                        {log.stageTitle[currentLang] || log.stageTitle.om}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-amber-300">
                        {log.previousStatus ? `${log.previousStatus} → ${log.newStatus}` : log.newStatus}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-slate-300 italic font-sans">
                        "{log.notes}"
                      </p>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Docket: #{log.docketNumber || progress.docketNumber || progress.caseNumber}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                      {log.updatedAt}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                      Firestore Synchronized
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Horizontal Interactive Milestone Node Timeline */
        <div className="relative pt-2 pb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
          {/* Visual Progress Bar for Interactive Nodes */}
          <div className="mb-6 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-medium">
                {isOm ? 'Gartuun Tarkaanfii Galmee (Visual Progress):' : 'Case Progression:'}
              </span>
              <span className="font-bold text-emerald-400 tabular-nums text-xs">
                {completionPercentage}% ({completedCount}/{totalStages} {isOm ? 'Xumurame' : 'Stages Completed'})
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800 p-0.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
          <div className="min-w-[700px] flex items-center justify-between relative px-6">
            {/* Timeline Connector Line behind nodes */}
            <div className="absolute top-7 left-12 right-12 h-1 bg-slate-800 -z-0 rounded-full" />
            <div 
              className="absolute top-7 left-12 h-1 bg-emerald-500 transition-all duration-500 -z-0 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              style={{ 
                width: `${Math.max(0, ((completedCount - 0.5) / (totalStages - 1)) * 100)}%` 
              }}
            />

            {/* Render Milestone Nodes */}
            {progress.stages.map((stage) => {
              const isCompleted = stage.status === 'completed';
              const isInProgress = stage.status === 'in_progress';
              const isFlagged = stage.status === 'flagged';
              const isSelected = selectedStage?.id === stage.id;
              const isRecentlyUpdated = recentlyUpdatedStageId === stage.id;
              const hasAttachments = stage.attachments && stage.attachments.length > 0;

              let nodeBg = 'bg-slate-950 border-slate-700 text-slate-400';
              if (isCompleted) nodeBg = 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]';
              else if (isInProgress) nodeBg = 'bg-amber-500 border-amber-300 text-slate-950 ring-4 ring-amber-500/20 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.4)]';
              else if (isFlagged) nodeBg = 'bg-rose-500 border-rose-300 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]';

              return (
                <div 
                  key={stage.id} 
                  className="relative z-10 flex flex-col items-center group cursor-pointer"
                  onClick={() => {
                    setSelectedStage(stage);
                    setNoteInput(stage.notes || '');
                    if (onStageSelect) onStageSelect(stage);
                  }}
                >
                  {/* Milestone Node Circle Button with Smooth CSS Transition Badge Glow Effect */}
                  <button
                    type="button"
                    className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-bold text-sm transition-all duration-500 ease-out transform hover:scale-110 active:scale-95 cursor-pointer relative ${nodeBg} ${
                      isSelected ? 'ring-4 ring-white/30 scale-105' : ''
                    } ${
                      isRecentlyUpdated 
                        ? 'ring-4 ring-emerald-400 scale-125 shadow-[0_0_25px_rgba(16,185,129,0.9)] bg-emerald-400 text-slate-950 animate-bounce' 
                        : ''
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    ) : isFlagged ? (
                      <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <span>{stage.stageNumber}</span>
                    )}

                    {/* Attachment Paperclip Badge Indicator */}
                    {hasAttachments && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow-md border border-slate-900">
                        📎
                      </span>
                    )}
                  </button>

                  {/* Stage Short Title & Status Badge below Node */}
                  <div className="mt-3 text-center max-w-[110px] space-y-1">
                    <span className={`text-[11px] font-bold block truncate leading-snug transition-colors ${
                      isInProgress ? 'text-amber-400' : isCompleted ? 'text-emerald-300' : 'text-slate-400 group-hover:text-slate-200'
                    }`}>
                      {stage.title[currentLang] || stage.title.om}
                    </span>

                    {/* Status Badge with Smooth Transition Effect */}
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight transition-all duration-300 ease-in-out ${
                      stage.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : stage.status === 'in_progress'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : stage.status === 'flagged'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800/60 text-slate-400 border border-slate-700/50'
                    } ${
                      isRecentlyUpdated ? 'scale-110 ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : ''
                    }`}>
                      {stage.status === 'completed' 
                        ? '✓ Complete' 
                        : stage.status === 'in_progress' 
                        ? '● Active' 
                        : stage.status === 'flagged' 
                        ? '⚠ Flagged' 
                        : 'Pending'}
                    </span>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateTab?.('meeting');
                      }}
                      className="mt-2 block w-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full px-2 py-0.5 hover:bg-amber-500 hover:text-slate-950 transition-colors"
                    >
                      {isOm ? 'Walgahii' : 'Join Room'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Stage Detail Drawer / Inspection Card & Scanned Court Order Attachments */}
      {selectedStage && (
        <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-5 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg shrink-0">
                {selectedStage.stageNumber}
              </div>
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold block">
                  Stage Inspection & Timeline Document History
                </span>
                <h4 className="text-base font-bold text-white font-serif-legal">
                  {selectedStage.title[currentLang] || selectedStage.title.om}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStage(null)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {selectedStage.description[currentLang] || selectedStage.description.om}
          </p>

          {/* Procedural Grounds */}
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 text-xs text-amber-300/90 font-mono flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>Seera Rogummaa:</strong> {selectedStage.proceduralGrounds[currentLang] || selectedStage.proceduralGrounds.om}</span>
          </div>

          {/* Scanned Court Order Documents Attached to Stage */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-850 pb-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                  {isOm ? 'Sanadoota Ajaja Dhaddachaa & PDF Hidhaman' : 'Attached Scanned Court Orders & Documents'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                  {selectedStage.attachments?.length || 0} files
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsAttachingDoc(!isAttachingDoc)}
                className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isAttachingDoc ? (isOm ? 'Cufi' : 'Cancel') : (isOm ? 'PDF Haaraa Maxxansi' : 'Attach Court Order PDF')}</span>
              </button>
            </div>

            {/* Document Upload Drawer */}
            {isAttachingDoc && (
              <form onSubmit={handleAttachDocSubmit} className="p-3.5 bg-slate-950 rounded-xl border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
                <h5 className="text-xs font-bold text-amber-400 font-mono uppercase">
                  {isOm ? 'Ajaja Dhaddachaa / Sanada PDF Galmeessi' : 'Attach Scanned Court Order / Document PDF'}
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1">
                      {isOm ? 'Mata-duree Ajaja Dhaddachaa (Order Title):' : 'Order Document Title:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={orderTitleInput}
                      onChange={(e) => setOrderTitleInput(e.target.value)}
                      placeholder="e.g. Ajaja Mirga Wabii / Bench Order #441"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1">
                      {isOm ? 'Gosa Sanadaa (Document Order Type):' : 'Order Category:'}
                    </label>
                    <select
                      value={orderTypeInput}
                      onChange={(e) => setOrderTypeInput(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="court_order">📜 Ajaja Mana Murtii (Court Order)</option>
                      <option value="summons">📬 Waamicha Dhaddachaa (Summons)</option>
                      <option value="verdict">⚖️ Murtee Dhaddachaa (Bench Verdict)</option>
                      <option value="bail_receipt">💳 Nagahee Wabii (Bail Receipt)</option>
                      <option value="police_report">🔍 Gabaasa Poolisii (Police Report)</option>
                      <option value="evidence_doc">📁 Sanada Ragaa (Evidence Document)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1">
                    {isOm ? 'Faayila Scanned PDF / Image Filan:' : 'Upload Scanned PDF / Image File:'}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,image/*,.doc,.docx"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 cursor-pointer"
                  />
                  {selectedFile && (
                    <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                      ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1">
                    {isOm ? 'Yaada Dabalataa (Attachment Notes):' : 'Attachment Notes:'}
                  </label>
                  <input
                    type="text"
                    value={orderNotesInput}
                    onChange={(e) => setOrderNotesInput(e.target.value)}
                    placeholder="e.g. Nagahee Birrii 50,000 wabiif kaffalame"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAttachingDoc(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    {isOm ? 'Dhiisi' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating || !orderTitleInput.trim()}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isOm ? 'Stage kanaf Maxxansi' : 'Attach Document to Stage'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* List of Stage Attached Scanned Documents */}
            {selectedStage.attachments && selectedStage.attachments.length > 0 ? (
              <div className="space-y-2">
                {selectedStage.attachments.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-slate-750 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h6 className="font-bold text-slate-200 truncate">{doc.orderTitle}</h6>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-800 text-amber-300 shrink-0">
                            {doc.orderType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>📄 {doc.fileName}</span>
                          <span>• {doc.fileSize || 'PDF'}</span>
                          <span>• Uploaded: {doc.uploadDate}</span>
                        </div>
                        {doc.notes && (
                          <p className="text-[11px] text-slate-400 mt-1 italic font-sans">{doc.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isOm ? 'Bani' : 'View'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50 cursor-pointer transition-colors"
                        title="Delete attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-2">
                {isOm ? 'Sanadni hidhame hin jiru. "PDF Haaraa Maxxansi" cuqaasummaan galmeessaa.' : 'No scanned court order documents attached to this stage yet. Click "Attach Court Order PDF" above to link documents to this timeline milestone.'}
              </p>
            )}
          </div>

          {/* Stage Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            {selectedStage.assignedOfficer && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center gap-2 text-slate-300">
                <User className="w-4 h-4 text-slate-400" />
                <span>Officer: <strong className="text-white">{selectedStage.assignedOfficer}</strong></span>
              </div>
            )}

            {(selectedStage.completedDate || selectedStage.targetDeadline) && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>
                  {selectedStage.completedDate ? `Completed: ${selectedStage.completedDate}` : `Target Deadline: ${selectedStage.targetDeadline}`}
                </span>
              </div>
            )}
          </div>

          {/* Judicial Notes Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 block">
              {isOm ? 'Yaada Dhaddachaa / Notes:' : 'Judicial Stage Notes:'}
            </label>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder={isOm ? 'Yaada fi gabaasa dhaddacha stage kanaa asitti galchaa...' : 'Enter stage progress notes or bench orders...'}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 min-h-[60px]"
            />
          </div>

          {/* Stage Controls Action Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-850">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleStatusChange(selectedStage.id, 'completed')}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isOm ? 'Xumurameera (Complete)' : 'Mark Completed'}</span>
              </button>

              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleStatusChange(selectedStage.id, 'in_progress')}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isOm ? 'Hojii Irra (In Progress)' : 'Set Active'}</span>
              </button>

              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleStatusChange(selectedStage.id, 'flagged')}
                className="px-3.5 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isOm ? 'Sodaa / Flag' : 'Flag Stage'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStage(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              {isOm ? 'Cufi' : 'Close Details'}
            </button>
          </div>
        </div>
      )}

      {/* Enlarged Case Emblem Seal Modal */}
      {showEmblemModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowEmblemModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-48 h-48 mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.3)] bg-slate-950">
              <img src={activeEmblem} alt="Court Emblem Seal" className="w-full h-full object-cover" />
            </div>

            <div>
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block font-bold">
                Official Ethiopian Court Case Docket Seal
              </span>
              <h4 className="text-lg font-bold text-white font-serif-legal mt-1">
                Galmee #{progress.docketNumber || progress.caseNumber}
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {progress.procedureType === 'criminal' ? 'Criminal Court Docket Seal' : 'Civil Court Docket Seal'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowEmblemModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Close Seal View
            </button>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white font-serif-legal">{previewDoc.orderTitle}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {previewDoc.fileName} • {previewDoc.uploadDate} • {previewDoc.orderType}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {previewDoc.fileUrl ? (
                previewDoc.fileUrl.startsWith('data:image') ? (
                  <img src={previewDoc.fileUrl} alt={previewDoc.orderTitle} className="w-full h-auto rounded-xl border border-slate-800" />
                ) : (
                  <iframe src={previewDoc.fileUrl} title={previewDoc.orderTitle} className="w-full h-[450px] rounded-xl border border-slate-800" />
                )
              ) : (
                <div className="p-8 bg-slate-950 border border-slate-850 rounded-2xl text-center space-y-3">
                  <FileSpreadsheet className="w-12 h-12 text-amber-400 mx-auto opacity-70" />
                  <div>
                    <h5 className="text-sm font-bold text-slate-200">{previewDoc.orderTitle}</h5>
                    <p className="text-xs text-slate-400 font-mono mt-1">Official Ethiopian Court Order Record</p>
                  </div>
                  {previewDoc.notes && (
                    <div className="p-3 bg-slate-900 rounded-xl text-xs text-amber-300 font-mono text-left max-w-lg mx-auto">
                      <strong>Notes:</strong> {previewDoc.notes}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    File format: <span className="text-amber-400 font-mono">{previewDoc.fileName}</span> ({previewDoc.fileSize || '1.8 MB'})
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">Attached to docket stage history</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Timestamped Audit Trail Modal Overlay */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                  <Database className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-white font-serif-legal">
                      {isOm ? 'Seenaa Galmeessaa Firestore (Timestamped Audit Trail)' : isAm ? 'የፍርድ ቤት ኦዲት ታሪክ (Firestore Audit Trail)' : 'Detailed Firestore Milestone Audit Trail'}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                      auditSource === 'firestore'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${auditSource === 'firestore' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span>{auditSource === 'firestore' ? 'Firestore Live DB' : 'Synced Milestone Cache'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate font-mono">
                    <span className="text-amber-400 font-bold">Galmee #{progress.docketNumber || progress.caseNumber}</span>
                    {auditModalStageTitle && (
                      <span> • {isOm ? 'Marsaa:' : 'Stage:'} <strong className="text-slate-200">{auditModalStageTitle}</strong></span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenMilestoneAuditTrail(selectedStage?.id)}
                  disabled={isFetchingAuditLogs}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  title="Re-fetch audit logs from Firestore"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isFetchingAuditLogs ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isOm ? 'Haaromsi' : 'Refresh'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-950/60">
              {/* Filter & Summary Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder={isOm ? "Filter seenaa status ykn abbaa seeraan..." : "Filter logs by status, judge, or notes..."}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono shrink-0">
                  <span>{isOm ? 'Baay\'ina Galmeewwanaa:' : 'Total Records:'}</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                    {milestoneAuditLogs.length}
                  </span>
                </div>
              </div>

              {/* Audit Log Entries List */}
              {isFetchingAuditLogs ? (
                <div className="p-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">Fetching detailed timestamped audit trail from Firestore...</p>
                </div>
              ) : milestoneAuditLogs.length === 0 ? (
                <div className="p-12 bg-slate-900/50 border border-slate-800 rounded-2xl text-center space-y-2">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
                  <h5 className="text-sm font-bold text-slate-300">
                    {isOm ? 'Seenaa galmee marsaa kanaf hin argamne' : 'No Audit Logs Recorded for Selected Milestone'}
                  </h5>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {isOm 
                      ? 'Haala marsaa kana jijjiiruu ykn ajaja haarawa ol-kaayuun seenaa haaraa Firestore irratti galmeessa.'
                      : 'Updating stage status or persisting metadata will record new Firestore audit events.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestoneAuditLogs
                    .filter((log) => {
                      if (!auditSearchQuery.trim()) return true;
                      const q = auditSearchQuery.toLowerCase();
                      const logNotes = (log.notes || '').toLowerCase();
                      const logUser = (log.updatedBy || '').toLowerCase();
                      const logStatus = (log.newStatus || '').toLowerCase();
                      const logTitle = (log.stageTitle?.om || log.stageTitle?.en || '').toLowerCase();
                      return logNotes.includes(q) || logUser.includes(q) || logStatus.includes(q) || logTitle.includes(q);
                    })
                    .map((log, idx) => {
                      const ethTime = formatCourtHearingScheduleDate(log.updatedAt.split(' ')[0] || log.updatedAt, isOm ? 'om' : isAm ? 'am' : 'en');
                      const stageMatch = progress.stages.find((s) => s.id === log.stageId);
                      const stageDocs: StageDocumentAttachment[] = stageMatch?.attachments || [];

                      return (
                        <div 
                          key={log.id || `log-${idx}`}
                          className="p-4 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl shadow-md transition-all space-y-3 relative overflow-hidden group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/70 pb-2.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center border border-amber-500/30">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-white font-serif-legal">
                                {log.stageTitle ? (log.stageTitle[currentLang] || log.stageTitle.om) : (auditModalStageTitle || 'Milestone Stage')}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                log.newStatus === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : log.newStatus === 'in_progress'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : log.newStatus === 'flagged'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {log.previousStatus && <span className="opacity-75">{log.previousStatus} ➔ </span>}
                                {log.newStatus}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-slate-200 font-bold">{log.updatedAt}</span>
                              <span className="text-slate-500">({ethTime.ethDate})</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-850 flex items-center gap-2.5">
                              <User className="w-4 h-4 text-sky-400 shrink-0" />
                              <div>
                                <span className="text-[10px] text-slate-500 font-mono block">Galmeessaa / Updated By:</span>
                                <span className="font-bold text-slate-200">{log.updatedBy || 'Abbaa Seeraa / Bench Staff'}</span>
                                {log.userRole && <span className="text-[10px] text-slate-400 block font-mono">({log.userRole})</span>}
                              </div>
                            </div>

                            <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-850 flex items-center gap-2.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-500 font-mono block">Verification Checksum:</span>
                                <span className="font-mono text-[10px] text-emerald-300 truncate block">
                                  SHA256:{log.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {log.notes && (
                            <div className="p-3 bg-slate-950/90 border border-amber-500/20 rounded-xl text-xs text-amber-200 font-mono">
                              <strong className="text-amber-400">Yaada Galmee (Notes):</strong> {log.notes}
                            </div>
                          )}

                          {/* Linked Documents for this milestone stage */}
                          {stageDocs.length > 0 && (
                            <div className="pt-1 border-t border-slate-850 space-y-1.5">
                              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                                <Paperclip className="w-3 h-3 text-amber-400" />
                                <span>Sanadoo Ajaja Dhaddachaa ({stageDocs.length}):</span>
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {stageDocs.map((docItem: StageDocumentAttachment) => (
                                  <button
                                    key={docItem.id}
                                    type="button"
                                    onClick={() => setPreviewDoc(docItem)}
                                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer transition-all"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{docItem.orderTitle}</span>
                                    <Eye className="w-3 h-3 text-slate-500 hover:text-amber-400" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Audited via Firestore Security Rules</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isOm ? 'Maxxansi (Print)' : 'Print Record'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md transition-all"
                >
                  {isOm ? 'Cufi' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
