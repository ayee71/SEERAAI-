import React, { useState, useEffect } from 'react';
import {
  Scale,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Eye,
  Filter,
  Check,
  Building,
  Calendar,
  Layers,
  History,
  Send,
  Lock,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { isOwnerAccount } from '../services/ownerAuth';
import { getStoredOwnerKey } from '../services/referralTracking';

export interface WorkflowLegalSource {
  id: string;
  title: string;
  sourceType: 'proclamation' | 'regulation' | 'directive' | 'cassation_decision' | 'court_decision' | 'other';
  jurisdiction: 'federal' | 'oromia';
  issuingInstitution: string;
  proclamationNumber?: string;
  decisionNumber?: string;
  volume?: string;
  page?: string;
  articleNumbers?: string[];
  legalIssueSummary: string;
  holdingOrRule: string;
  relevantText?: string;
  language?: 'om' | 'am' | 'en';
  status: 'VERIFIED' | 'UNVERIFIED' | 'UNDER_REVIEW' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  workflowStatus?: 'DRAFT' | 'UPLOADED' | 'PROCESSING' | 'NEEDS_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'NEEDS_CORRECTION';
  sha256Checksum?: string;
  officialSourceName?: string;
  officialSourceUrl?: string;
  channelHandle?: string;
  telegramPostUrl?: string;
  uploaderUid?: string;
  uploaderRole?: string;
  dateEC?: string;
  dateGC?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  reviewHistory?: Array<{
    reviewId: string;
    reviewerUid: string;
    reviewerRole: string;
    action: string;
    notes: string;
    timestamp: string;
  }>;
}

interface LegalKnowledgeBaseManagementProps {
  currentLang: Language;
}

export const LegalKnowledgeBaseManagement: React.FC<LegalKnowledgeBaseManagementProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();

  const isOwner = isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );

  const userRole = (profile as any)?.role || (profile as any)?.legalRole || 'advocate';
  const userEmail = (user?.email || (profile as any)?.email || '').toLowerCase();
  const isAuthorized =
    isOwner ||
    userEmail === 'ayeledha@gmail.com' ||
    ['admin', 'court_admin', 'judge', 'legal_expert', 'prosecutor', 'registrar'].includes(userRole);

  const [activeTab, setActiveTab] = useState<'browse' | 'upload' | 'review' | 'audit'>('browse');

  // Search & Filters
  const [sources, setSources] = useState<WorkflowLegalSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJurisdiction, setFilterJurisdiction] = useState<'all' | 'federal' | 'oromia'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<WorkflowLegalSource['sourceType']>('proclamation');
  const [formJurisdiction, setFormJurisdiction] = useState<'federal' | 'oromia'>('federal');
  const [formInstitution, setFormInstitution] = useState('');
  const [formProclamationNo, setFormProclamationNo] = useState('');
  const [formDecisionNo, setFormDecisionNo] = useState('');
  const [formVolume, setFormVolume] = useState('');
  const [formArticles, setFormArticles] = useState('');
  const [formDateEC, setFormDateEC] = useState('');
  const [formDateGC, setFormDateGC] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formHolding, setFormHolding] = useState('');
  const [formRelevantText, setFormRelevantText] = useState('');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Review Modal State
  const [selectedSourceForReview, setSelectedSourceForReview] = useState<WorkflowLegalSource | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    fetchSources();
  }, [filterJurisdiction, filterType, filterStatus]);

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterJurisdiction !== 'all') params.set('jurisdiction', filterJurisdiction);
      if (filterType !== 'all') params.set('sourceType', filterType);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/legal/sources?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (err) {
      console.warn('[KnowledgeBase] fetchSources notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setToastMsg({ text: 'File size exceeds 25 MB maximum limit.', type: 'error' });
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formInstitution.trim() || !formSummary.trim()) {
      setToastMsg({ text: 'Please fill in all required legal metadata fields.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const userToken = user ? await user.getIdToken() : '';
      const payload = {
        title: formTitle.trim(),
        sourceType: formType,
        jurisdiction: formJurisdiction,
        issuingInstitution: formInstitution.trim(),
        proclamationNumber: formProclamationNo.trim() || undefined,
        decisionNumber: formDecisionNo.trim() || undefined,
        volume: formVolume.trim() || undefined,
        articleNumbers: formArticles
          ? formArticles.split(',').map((a) => a.trim()).filter(Boolean)
          : undefined,
        legalIssueSummary: formSummary.trim(),
        holdingOrRule: formHolding.trim() || formSummary.trim(),
        relevantText: formRelevantText.trim() || undefined,
        language: currentLang === 'am' ? 'am' : currentLang === 'en' ? 'en' : 'om',
        fileName: fileName || 'source_document.txt',
        fileMimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
        fileBase64: fileBase64 || undefined,
        fileSizeBytes: fileSize,
        dateEC: formDateEC.trim() || undefined,
        dateGC: formDateGC.trim() || undefined,
        officialSourceUrl: formSourceUrl.trim() || undefined,
        uploaderUid: user?.uid || 'admin_user',
        uploaderRole: userRole,
        uploaderEmail: userEmail,
      };

      const res = await fetch('/api/legal/sources/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      setToastMsg({
        text: currentLang === 'om'
          ? "Sananni seeraa milkiin galmaa'eera! Koree mirkaneessuutti ergameera."
          : 'Legal source submitted successfully to review queue!',
        type: 'success',
      });

      // Reset form
      setFormTitle('');
      setFormInstitution('');
      setFormProclamationNo('');
      setFormDecisionNo('');
      setFormVolume('');
      setFormArticles('');
      setFormSummary('');
      setFormHolding('');
      setFormRelevantText('');
      setFileName('');
      setFileBase64(null);

      fetchSources();
      setActiveTab('browse');
    } catch (err: any) {
      setToastMsg({ text: err.message || 'Error staging legal source', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewAction = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION' | 'PUBLISH') => {
    if (!selectedSourceForReview) return;
    if (!reviewNotes.trim()) {
      setToastMsg({ text: 'Please enter review notes/justification before submitting.', type: 'error' });
      return;
    }

    setIsReviewing(true);
    try {
      const userToken = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/legal/sources/${selectedSourceForReview.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({
          action,
          reviewerUid: user?.uid || 'legal_reviewer',
          reviewerRole: userRole,
          reviewerEmail: userEmail,
          reviewNotes: reviewNotes.trim(),
          enforceTwoPersonReview: action === 'APPROVE',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Review action failed');
      }

      setToastMsg({
        text: `Source status transitioned to ${data.status}!`,
        type: 'success',
      });
      setSelectedSourceForReview(null);
      setReviewNotes('');
      fetchSources();
    } catch (err: any) {
      setToastMsg({ text: err.message || 'Review failed', type: 'error' });
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              {currentLang === 'om' ? 'Sirna Mirkaneessa Kuusaa Seeraa' : 'Legal Knowledge Base & Source Pipeline'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif-legal text-white flex items-center gap-3">
              <Scale className="text-amber-400 w-7 h-7" />
              {currentLang === 'om' ? 'Kuusaa Seeraa & Qulqullina Maddaa' : 'Authoritative Legal Knowledge Base'}
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              {currentLang === 'om'
                ? "Heera, Labsiilee, Dambiiwwan fi Murtii Dhaddacha Ijibbaataa bifa mirkanaa'een galchuu, xiinxaluu fi AI qorannoo seeraatiif maxxansuu."
                : 'Upload, verify, review, version, and publish official Ethiopian statutes and Cassation decisions for grounded legal AI retrieval.'}
            </p>
          </div>

          {/* Role Indicator */}
          <div className="bg-slate-950/80 border border-slate-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs">
            <Lock className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                {currentLang === 'om' ? 'Gahee Keessan' : 'Your Role'}
              </p>
              <p className="text-emerald-400 font-bold capitalize">
                {isOwner ? 'Platform Owner / Admin' : userRole}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            {currentLang === 'om' ? 'Maddoota Seeraa (Browse)' : 'Browse Sources'}
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40">
              {sources.length}
            </span>
          </button>

          {isAuthorized && (
            <>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                {currentLang === 'om' ? "Galmee Fe'aa (Upload)" : 'Upload & Stage'}
              </button>

              <button
                onClick={() => setActiveTab('review')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'review'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentLang === 'om' ? 'Koree Mirkaneessaa (Review Queue)' : 'Review Queue'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <span>{toastMsg.text}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: BROWSE LEGAL SOURCES */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={currentLang === 'om' ? "Mata-duree, lakk. labsii, kwt. barbaadi..." : "Search title, proclamation no, article..."}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterJurisdiction}
                onChange={(e) => setFilterJurisdiction(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="all">All Jurisdictions</option>
                <option value="federal">Federal (Federaala)</option>
                <option value="oromia">Oromia (Oromiyaa)</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="proclamation">Proclamations (Labsiilee)</option>
                <option value="cassation_decision">Cassation Decisions (Dhaddacha Ijibbaataa)</option>
                <option value="regulation">Regulations (Dambiiwwan)</option>
                <option value="directive">Directives (Qajeelfamoota)</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published (Maxxanfame)</option>
                <option value="APPROVED">Approved (Mirkanaa'e)</option>
                <option value="NEEDS_REVIEW">Under Review (Qoratamaa)</option>
                <option value="REJECTED">Rejected (Didame)</option>
              </select>

              <button
                onClick={fetchSources}
                disabled={isLoading}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {currentLang === 'om' ? 'Haaromsi' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Sources Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
              <p>Loading legal sources from approved repository...</p>
            </div>
          ) : sources.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-semibold">
                {currentLang === 'om' ? "Maddi seeraa filannoo kanaan walgitu hin jiru." : 'No legal sources match your filters.'}
              </p>
              <p className="text-slate-500 text-xs">
                {isAuthorized
                  ? 'Switch to the "Upload & Stage" tab to add official legal instruments or decisions.'
                  : 'Contact a judicial administrator to publish official legal documents.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-xl space-y-3 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.workflowStatus === 'PUBLISHED' || s.status === 'VERIFIED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : s.workflowStatus === 'APPROVED'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : s.workflowStatus === 'REJECTED'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {s.workflowStatus || s.status}
                      </span>

                      <span className="text-[11px] text-slate-400 font-medium capitalize">
                        {s.jurisdiction} • {s.sourceType.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white line-clamp-2">
                      {s.title}
                    </h3>

                    <p className="text-xs text-amber-400/90 font-mono">
                      {s.issuingInstitution}
                      {s.proclamationNumber ? ` • Labsii ${s.proclamationNumber}` : ''}
                      {s.decisionNumber ? ` • Galmee ${s.decisionNumber}` : ''}
                      {s.volume ? ` (Jildii ${s.volume})` : ''}
                    </p>

                    <p className="text-xs text-slate-300 line-clamp-3">
                      {s.legalIssueSummary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate max-w-[200px]">
                      {s.sha256Checksum ? `SHA-256: ${s.sha256Checksum.slice(0, 10)}...` : 'Verified source'}
                    </span>

                    {isAuthorized && (
                      <button
                        onClick={() => setSelectedSourceForReview(s)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {currentLang === 'om' ? 'Ilaali / Mirkaneessi' : 'Inspect'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD & STAGE LEGAL SOURCE */}
      {activeTab === 'upload' && isAuthorized && (
        <form onSubmit={handleUploadSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              {currentLang === 'om' ? "Galmee Seeraa Haaraa Fe'aa & Galmeessaa" : 'Upload & Stage Official Legal Source'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {currentLang === 'om'
                ? "Sanadni fe'amu qorannoo qulqullinaa fi mirkaneessa koreetiin booda AI qorannoo seeraatiif maxxanfama."
                : 'All uploaded instruments undergo two-person review and checksum validation before publishing to the AI knowledge base.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {currentLang === 'om' ? 'Mata-duree Sanadaa *' : 'Document Title *'}
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Heera Mootummaa Federaalaa / Labsii Hojjataa fi Hojjechiisaa"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {currentLang === 'om' ? 'Qaama Baase / Mana Murtii *' : 'Issuing Body / Court *'}
              </label>
              <input
                type="text"
                required
                value={formInstitution}
                onChange={(e) => setFormInstitution(e.target.value)}
                placeholder="e.g. Caffee Oromiyaa / Mana Murtii Waliigalaa Federaalaa"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {currentLang === 'om' ? 'Gosa Sanadaa' : 'Source Type'}
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="proclamation">Proclamation (Labsii)</option>
                <option value="cassation_decision">Cassation Decision (Dhaddacha Ijibbaataa)</option>
                <option value="regulation">Regulation (Dambii)</option>
                <option value="directive">Directive (Qajeelfama)</option>
                <option value="court_decision">Appellate / Trial Decision</option>
                <option value="other">Other Official Instrument</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Jurisdiction</label>
              <select
                value={formJurisdiction}
                onChange={(e) => setFormJurisdiction(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="federal">Federal (Federaala)</option>
                <option value="oromia">Oromia (Oromiyaa)</option>
              </select>
            </div>

            {formType === 'cassation_decision' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {currentLang === 'om' ? 'Lakk. Galmee *' : 'Cassation File/Case Number *'}
                  </label>
                  <input
                    type="text"
                    value={formDecisionNo}
                    onChange={(e) => setFormDecisionNo(e.target.value)}
                    placeholder="e.g. 214589"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {currentLang === 'om' ? 'Jildii / Volume' : 'Volume (Jildii)'}
                  </label>
                  <input
                    type="text"
                    value={formVolume}
                    onChange={(e) => setFormVolume(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {currentLang === 'om' ? 'Lakk. Labsii / Dambii' : 'Proclamation / Regulation No.'}
                  </label>
                  <input
                    type="text"
                    value={formProclamationNo}
                    onChange={(e) => setFormProclamationNo(e.target.value)}
                    placeholder="e.g. 1156/2011"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {currentLang === 'om' ? 'Keeyyattoota Ijoo' : 'Key Articles (comma-separated)'}
                  </label>
                  <input
                    type="text"
                    value={formArticles}
                    onChange={(e) => setFormArticles(e.target.value)}
                    placeholder="e.g. 12, 14, 27"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {currentLang === 'om' ? 'Guyyaa Hojiirra Oole (EC)' : 'Effective Date (Ethiopian Calendar)'}
              </label>
              <input
                type="text"
                value={formDateEC}
                onChange={(e) => setFormDateEC(e.target.value)}
                placeholder="e.g. 05/02/2012"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {currentLang === 'om' ? 'Guyyaa Hojiirra Oole (GC)' : 'Effective Date (Gregorian Calendar)'}
              </label>
              <input
                type="text"
                value={formDateGC}
                onChange={(e) => setFormDateGC(e.target.value)}
                placeholder="e.g. 2019-10-15"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              {currentLang === 'om' ? 'Cuunfaa Dhimma Seeraa *' : 'Legal Issue Summary *'}
            </label>
            <textarea
              required
              rows={3}
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              placeholder="Gabaabinaan dhimma seeraa sanadni kun ilaallatu ibsi..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              {currentLang === 'om' ? 'Qajeeltoo Dirqisiisaa / Seera Hojiirra Oole *' : 'Binding Principle / Statutory Rule *'}
            </label>
            <textarea
              required
              rows={3}
              value={formHolding}
              onChange={(e) => setFormHolding(e.target.value)}
              placeholder="Hiikaa dirqisiisaa ykn seerri kun wanta dirqisiisu..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              {currentLang === 'om' ? 'Barreeffama Guutuu ykn Kutaalee Mirkanaa’an' : 'Extracted Text / Law Passage'}
            </label>
            <textarea
              rows={4}
              value={formRelevantText}
              onChange={(e) => setFormRelevantText(e.target.value)}
              placeholder="Qabiyyee guutuu ykn kwt. filataman asitti galchi..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* File Upload Box */}
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center space-y-2 hover:border-amber-500 transition-colors">
            <Upload className="w-8 h-8 text-amber-400 mx-auto" />
            <div className="text-xs text-slate-300 font-medium">
              {fileName ? (
                <span className="text-emerald-400 font-bold">
                  {fileName} ({(fileSize / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <span>Upload authentic document (PDF, DOCX, or TXT - max 25MB)</span>
              )}
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {currentLang === 'om' ? 'Koree Mirkaneessaatti Ergi (Submit to Review Queue)' : 'Submit to Review Queue'}
          </button>
        </form>
      )}

      {/* TAB 3: REVIEW QUEUE */}
      {activeTab === 'review' && isAuthorized && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              {currentLang === 'om' ? 'Galmeewwan Mirkaneessa Eegaa Jiran' : 'Sources Awaiting Review & Verification'}
            </h2>
            <span className="text-xs text-slate-400">
              Two-person approval enforced for legal accuracy
            </span>
          </div>

          {sources.filter((s) => s.workflowStatus === 'NEEDS_REVIEW' || s.workflowStatus === 'APPROVED').length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-slate-300 font-semibold text-sm">Review queue is currently clear.</p>
              <p className="text-slate-500 text-xs">All submitted legal sources have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources
                .filter((s) => s.workflowStatus === 'NEEDS_REVIEW' || s.workflowStatus === 'APPROVED')
                .map((s) => (
                  <div
                    key={s.id}
                    className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                          {s.workflowStatus}
                        </span>
                        <span className="text-xs text-slate-400">
                          Uploaded by: {s.uploaderRole || 'editor'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{s.title}</h3>
                      <p className="text-xs text-slate-300 line-clamp-2">{s.legalIssueSummary}</p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <button
                        onClick={() => setSelectedSourceForReview(s)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {currentLang === 'om' ? 'Qori & Murteessi' : 'Review & Decide'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* REVIEW DECISION MODAL */}
      {selectedSourceForReview && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                Legal Source Review & Verification Gateway
              </h3>
              <button
                onClick={() => setSelectedSourceForReview(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">Title:</span>{' '}
                <span className="text-white font-bold">{selectedSourceForReview.title}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Jurisdiction & Type:</span>{' '}
                <span className="text-amber-400">
                  {selectedSourceForReview.jurisdiction} • {selectedSourceForReview.sourceType}
                </span>
              </div>
              {selectedSourceForReview.proclamationNumber && (
                <div>
                  <span className="text-slate-500 font-semibold">Proclamation No:</span>{' '}
                  <span className="text-slate-300">{selectedSourceForReview.proclamationNumber}</span>
                </div>
              )}
              {selectedSourceForReview.decisionNumber && (
                <div>
                  <span className="text-slate-500 font-semibold">Cassation Case No:</span>{' '}
                  <span className="text-slate-300">
                    {selectedSourceForReview.decisionNumber} (Vol. {selectedSourceForReview.volume || 'N/A'})
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-semibold">Summary:</span>
                <p className="text-slate-300 mt-1">{selectedSourceForReview.legalIssueSummary}</p>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Binding Rule / Holding:</span>
                <p className="text-slate-300 mt-1">{selectedSourceForReview.holdingOrRule}</p>
              </div>
              {selectedSourceForReview.sha256Checksum && (
                <div>
                  <span className="text-slate-500 font-semibold">SHA-256 Checksum:</span>
                  <p className="font-mono text-emerald-400 mt-0.5 break-all">
                    {selectedSourceForReview.sha256Checksum}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Review Comments & Verification Evidence Notes *
              </label>
              <textarea
                required
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Ibsa mirkaneessa seeraa, madda gaazexaa ykn galmee dhaddacha ijibbaataa galchi..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleReviewAction('APPROVE')}
                disabled={isReviewing}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Approve (Mirkaneessi)
              </button>

              <button
                type="button"
                onClick={() => handleReviewAction('PUBLISH')}
                disabled={isReviewing}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Publish (Maxxansi)
              </button>

              <button
                type="button"
                onClick={() => handleReviewAction('REQUEST_CORRECTION')}
                disabled={isReviewing}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Needs Correction
              </button>

              <button
                type="button"
                onClick={() => handleReviewAction('REJECT')}
                disabled={isReviewing}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Reject (Didi)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
