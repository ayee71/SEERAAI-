import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { 
  Folder, 
  FolderOpen, 
  Search, 
  Upload, 
  FileText, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Filter, 
  FileCheck, 
  Gavel, 
  CreditCard, 
  Send, 
  Eye, 
  Download,
  Copy,
  Check,
  Building2,
  Lock
} from 'lucide-react';
import { addCaseActivityLog } from '../services/courtCaseService';

export interface FolderCategory {
  id: string;
  nameOm: string;
  nameAm: string;
  nameEn: string;
  descriptionOm: string;
  descriptionEn: string;
  category: 'claims' | 'evidence' | 'objections' | 'summons' | 'orders' | 'receipts' | 'judgments' | 'archives';
  icon: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  documentCount: number;
}

export interface FolderDocumentItem {
  id: string;
  folderId: string;
  title: string;
  caseNumber: string;
  documentType: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
  fileFormat: string;
  status: 'verified' | 'pending_review' | 'archived';
  isNew?: boolean;
}

interface CourtFolderExplorerProps {
  currentLang: Language;
  institutionName?: string;
  institutionId?: string;
  onNavigateToSection?: (sectionId: string) => void;
  currentUser?: {
    fullName: string;
    role: string;
  };
}

const DEFAULT_FOLDERS: FolderCategory[] = [
  {
    id: 'folder_claims',
    nameOm: 'Himannaa & Iyyannoowwan (Claims & Petitions)',
    nameAm: 'የክስ ማመልከቻዎች እና አቤቱታዎች',
    nameEn: 'Civil & Criminal Claims / Petitions',
    descriptionOm: 'Himannoowwan haaraa ofiisara seeraatiin banamanii fi iyyannoowwan dhiyaatan.',
    descriptionEn: 'Initial statements of claim, petitions, and plaintiff formal filings.',
    category: 'claims',
    icon: '📝',
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-300',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    documentCount: 14,
  },
  {
    id: 'folder_evidence',
    nameOm: 'Ragaalee & Waraabbata Dhaddachaa (Evidence & Transcripts)',
    nameAm: 'ማስረጃዎች እና የችሎት ቃለ-ጉባኤዎች',
    nameEn: 'Evidence, Transcripts & Exhibits',
    descriptionOm: 'Ragaa barreeffamaa, ragaa namaa, sagalee fi qajeeltoo dhaddachaa.',
    descriptionEn: 'Documentary evidence, witness deposition records, audio transcripts.',
    category: 'evidence',
    icon: '🎙️',
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/40 text-blue-300',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/30',
    documentCount: 28,
  },
  {
    id: 'folder_objections',
    nameOm: 'Mormii Sadarkaa Duraa (Art 244 Preliminary Objections)',
    nameAm: 'የመጀመሪያ ደረጃ መቃወሚያዎች (አንቀጽ 244)',
    nameEn: 'Preliminary Objections & Procedural Motions',
    descriptionOm: 'Mormii yeroon darbiinsaa, aangoo mana murtii fi mormiiwwan seera adeemsaa.',
    descriptionEn: 'Limitation period, lack of jurisdiction, res judicata formal objections.',
    category: 'objections',
    icon: '🛡️',
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/40 text-purple-300',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/30',
    documentCount: 9,
  },
  {
    id: 'folder_summons',
    nameOm: 'Waamicha 1ffaa & 2ffaa (Court Summons & Notices)',
    nameAm: 'የመጀመሪያ እና ሁለተኛ ደረጃ መጥሪያዎች',
    nameEn: '1st & 2nd Summons & Subpoenas',
    descriptionOm: 'Waamicha himatamaaf, ragaadhaaf fi beellamoota mana murtii darban.',
    descriptionEn: 'Official court service of summons, notice to appear, second summons.',
    category: 'summons',
    icon: '✉️',
    color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/40 text-indigo-300',
    badgeBg: 'bg-indigo-500/15',
    badgeBorder: 'border-indigo-500/30',
    documentCount: 19,
  },
  {
    id: 'folder_orders',
    nameOm: 'Ajaja & Qajeelfama Dhaddachaa (Interlocutory Orders)',
    nameAm: 'የችሎት ትዕዛዞች እና መመሪያዎች',
    nameEn: 'Interlocutory Court Orders & Injunctions',
    descriptionOm: 'Ajaja qabeenya ugguruu, ajaja poolisii fi ajaja baankii darban.',
    descriptionEn: 'Interim injunctions, police assistance directives, bank freeze orders.',
    category: 'orders',
    icon: '⚖️',
    color: 'from-rose-500/20 to-rose-600/10 border-rose-500/40 text-rose-300',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    documentCount: 11,
  },
  {
    id: 'folder_receipts',
    nameOm: 'Nagahee Kaffaltii Baankii Sinqee (Court Fee Receipts)',
    nameAm: 'የዳኝነት ክፍያ ደረሰኞች (ሲንቄ ባንክ)',
    nameEn: 'Sinqee Bank Court Fee Receipts',
    descriptionOm: 'Nagaheewwan kaffaltii abbaa seerummaa Baankii Sinqeetiin kaffalaman.',
    descriptionEn: 'Verified Sinqee Bank digital transaction slips and court revenue receipts.',
    category: 'receipts',
    icon: '💳',
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-300',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    documentCount: 32,
  },
  {
    id: 'folder_judgments',
    nameOm: 'Murtiiwwan & Ajaja Xumuraa (Final Judgments & Rulings)',
    nameAm: 'የፍርድ ውሳኔዎች እና የሰበር ትዕዛዞች',
    nameEn: 'Judicial Rulings & Final Decrees',
    descriptionOm: 'Murtiiwwan dhaddachaa, qajeeltoo seeraa fi murteewwan xumuraa.',
    descriptionEn: 'Final dispositive court judgments, written decree transcripts, rulings.',
    category: 'judgments',
    icon: '🏛️',
    color: 'from-amber-400/20 to-amber-500/10 border-amber-400/40 text-amber-200',
    badgeBg: 'bg-amber-400/15',
    badgeBorder: 'border-amber-400/30',
    documentCount: 23,
  },
  {
    id: 'folder_archives',
    nameOm: 'Galmeewwan Cufaman & Kuusaa Dheeraa (Archived Dockets)',
    nameAm: 'የተዘጉ እና የተመዘገቡ መዛግብት',
    nameEn: 'Archived & Closed Case Files',
    descriptionOm: 'Galmeewwan raawwiin xumuramee gara kuusaatti jijjiiraman.',
    descriptionEn: 'Executed matters, closed litigation portfolios, long-term legal archive.',
    category: 'archives',
    icon: '📦',
    color: 'from-slate-700/30 to-slate-800/20 border-slate-700 text-slate-300',
    badgeBg: 'bg-slate-800',
    badgeBorder: 'border-slate-700',
    documentCount: 45,
  },
];

const INITIAL_DOCUMENTS: FolderDocumentItem[] = [
  {
    id: 'doc_init_1',
    folderId: 'folder_claims',
    title: 'Himannaa Lafa Baadiyyaa fi Qabeenya Dhaabbataa',
    caseNumber: 'CR-2026/089',
    documentType: 'Statement of Claim',
    uploadedBy: 'Ofiisara Seeraa Hawwii G.',
    uploadedAt: '2026-10-24 10:15',
    fileSize: '2.4 MB',
    fileFormat: 'PDF',
    status: 'verified',
  },
  {
    id: 'doc_init_2',
    folderId: 'folder_receipts',
    title: 'Nagahee Kaffaltii Abbaa Seerummaa Sinqee #88910',
    caseNumber: 'CR-2026/089',
    documentType: 'Bank Deposit Slip',
    uploadedBy: 'Qindeessaa KTAS',
    uploadedAt: '2026-10-24 11:30',
    fileSize: '840 KB',
    fileFormat: 'PDF',
    status: 'verified',
  },
  {
    id: 'doc_init_3',
    folderId: 'folder_objections',
    title: 'Mormii Yeroon Darbiinsaa (Heera & Seera Hariiroo Hawaasaa K. 1677)',
    caseNumber: 'CR-2026/104',
    documentType: 'Preliminary Objection',
    uploadedBy: 'Abukaattoo Falmituu',
    uploadedAt: '2026-10-25 09:40',
    fileSize: '1.2 MB',
    fileFormat: 'PDF',
    status: 'verified',
  },
  {
    id: 'doc_init_4',
    folderId: 'folder_evidence',
    title: 'Waraabbata Sagalee fi Jecha Ragaalee Dhaddachaa',
    caseNumber: 'CR-2026/045',
    documentType: 'Witness Audio Transcript',
    uploadedBy: 'Abbaa Seeraa Toleraa H.',
    uploadedAt: '2026-10-26 14:20',
    fileSize: '4.8 MB',
    fileFormat: 'DOCX',
    status: 'verified',
  },
  {
    id: 'doc_init_5',
    folderId: 'folder_orders',
    title: 'Ajaja Dhaddachaa Qabeenyi Falmiin Irratti Ka\'e Akka Hin Gurguramne',
    caseNumber: 'CR-2026/045',
    documentType: 'Injunction Order',
    uploadedBy: 'Abbaa Seeraa Lalisaa D.',
    uploadedAt: '2026-10-27 16:00',
    fileSize: '950 KB',
    fileFormat: 'PDF',
    status: 'verified',
  },
  {
    id: 'doc_init_6',
    folderId: 'folder_summons',
    title: 'Waamicha Lammaffaa Beellama Guyyaa 05/11/2026',
    caseNumber: 'CR-2026/112',
    documentType: '2nd Summons',
    uploadedBy: 'Ofiisara Seeraa Hawwii G.',
    uploadedAt: '2026-10-28 08:30',
    fileSize: '620 KB',
    fileFormat: 'PDF',
    status: 'verified',
  },
];

export const CourtFolderExplorer: React.FC<CourtFolderExplorerProps> = ({
  currentLang,
  institutionName = 'Mana Murtii Aanaa Gurbicha',
  institutionId = 'inst_gurbicha_woreda_first',
  onNavigateToSection,
  currentUser
}) => {
  // Search within folder state
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Document list
  const [folderDocuments, setFolderDocuments] = useState<FolderDocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem(`seera_folder_docs_${institutionId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_DOCUMENTS;
    } catch {
      return INITIAL_DOCUMENTS;
    }
  });

  // Upload modal & progress state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [targetFolderForUpload, setTargetFolderForUpload] = useState<string>('folder_claims');
  const [uploadCaseNumber, setUploadCaseNumber] = useState('');
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Visual Progress & Spinner Feedback
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStepMessage, setUploadStepMessage] = useState<string>('');
  const [uploadSuccessDoc, setUploadSuccessDoc] = useState<FolderDocumentItem | null>(null);

  // Sync docs to local storage
  useEffect(() => {
    try {
      if (Array.isArray(folderDocuments)) {
        localStorage.setItem(`seera_folder_docs_${institutionId}`, JSON.stringify(folderDocuments));
      }
    } catch (e) {
      console.warn('Failed to cache folder documents locally:', e);
    }
  }, [folderDocuments, institutionId]);

  const safeFolderDocs = Array.isArray(folderDocuments) ? folderDocuments : INITIAL_DOCUMENTS;

  // Filter folders based on search keyword
  const filteredFolders = (DEFAULT_FOLDERS || []).filter(folder => {
    if (selectedCategoryFilter !== 'all' && folder.category !== selectedCategoryFilter) {
      return false;
    }
    if (!folderSearchQuery.trim()) return true;

    const query = folderSearchQuery.toLowerCase();
    return (
      (folder.nameOm || '').toLowerCase().includes(query) ||
      (folder.nameAm || '').toLowerCase().includes(query) ||
      (folder.nameEn || '').toLowerCase().includes(query) ||
      (folder.descriptionOm || '').toLowerCase().includes(query) ||
      (folder.descriptionEn || '').toLowerCase().includes(query) ||
      (folder.category || '').toLowerCase().includes(query)
    );
  });

  // Filter documents based on active folder or search query
  const filteredDocuments = safeFolderDocs.filter(doc => {
    if (selectedFolderId && doc.folderId !== selectedFolderId) {
      return false;
    }
    if (!folderSearchQuery.trim()) return true;

    const query = folderSearchQuery.toLowerCase();
    return (
      (doc.title || '').toLowerCase().includes(query) ||
      (doc.caseNumber || '').toLowerCase().includes(query) ||
      (doc.documentType || '').toLowerCase().includes(query) ||
      (doc.uploadedBy || '').toLowerCase().includes(query)
    );
  });

  // Document Upload Handler with Progress Bar & Spinner
  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocTitle.trim() || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSuccessDoc(null);

    const steps = [
      { 
        pct: 18, 
        msgOm: "Faayila qorachaa fi qulqulleessaa jira (Validating format)...", 
        msgEn: "Validating file format and size..." 
      },
      { 
        pct: 42, 
        msgOm: "Kuusaa sanada mana murtiitti fe'amaa jira (Uploading to court storage)...", 
        msgEn: "Uploading file to institutional court storage..." 
      },
      { 
        pct: 74, 
        msgOm: "Chaappaa fi mallattoo dijitaalaa mirkaneessaa jira (Verifying digital seal)...", 
        msgEn: "Generating digital timestamp and verification seal..." 
      },
      { 
        pct: 92, 
        msgOm: "Seenaa galmee Firestore irratti haaromsaa jira (Logging to activity_logs)...", 
        msgEn: "Synchronizing docket metadata with Firestore activity_logs..." 
      },
      { 
        pct: 100, 
        msgOm: "Sanadni milkaa'inaan fooldara keessatti kuufameera (Complete)!", 
        msgEn: "Document uploaded and archived successfully!" 
      }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setUploadProgress(step.pct);
      setUploadStepMessage(currentLang === 'om' ? step.msgOm : step.msgEn);
      // Realistic simulation delay
      await new Promise(res => setTimeout(res, 450));
    }

    // Build newly uploaded document
    const targetFolder = DEFAULT_FOLDERS.find(f => f.id === targetFolderForUpload);
    const newDocId = 'doc_up_' + Date.now();
    const finalDoc: FolderDocumentItem = {
      id: newDocId,
      folderId: targetFolderForUpload,
      title: uploadDocTitle.trim(),
      caseNumber: uploadCaseNumber.trim() || 'CR-2026/089',
      documentType: targetFolder ? targetFolder.nameEn.split('/')[0].trim() : 'Legal Filing',
      uploadedBy: currentUser?.fullName || 'Ofiisara Seeraa',
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.8 MB',
      fileFormat: selectedFile ? selectedFile.name.split('.').pop()?.toUpperCase() || 'PDF' : 'PDF',
      status: 'verified',
      isNew: true
    };

    // Update state
    setFolderDocuments(prev => [finalDoc, ...prev]);
    setUploadSuccessDoc(finalDoc);

    // Also record into Firestore activity_logs subcollection
    try {
      await addCaseActivityLog(finalDoc.caseNumber, {
        action: 'general_update',
        title: `Sanadni Haaraan Fooldaratti Fe'ame (${finalDoc.documentType})`,
        description: `Sanadni '${finalDoc.title}' fooldara '${targetFolder?.nameOm || 'General'}' keessatti milkaa'inaan kuufameera.`,
        performedBy: currentUser?.fullName || 'Ofiisara Seeraa',
        performedByRole: currentUser?.role || 'court_personnel',
        details: { docId: finalDoc.id, fileSize: finalDoc.fileSize, format: finalDoc.fileFormat }
      });
    } catch (err) {
      console.warn('Activity log sync skipped for upload:', err);
    }

    setIsUploading(false);
  };

  const handleResetUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadDocTitle('');
    setUploadCaseNumber('');
    setUploadProgress(0);
    setUploadStepMessage('');
    setUploadSuccessDoc(null);
    setIsUploading(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Header Card & Search Within Folder Control */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-2xl shrink-0 shadow-inner">
              📂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                  Institutional Storage
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {institutionName}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-serif-legal mt-0.5">
                {currentLang === 'om' ? 'Fooldaroota & Kuusaa Sanadoota Mana Murtii' : currentLang === 'am' ? 'የፍርድ ቤት ማህደሮች እና የሰነድ ምድቦች' : 'Court Sub-Folders & Document Explorer'}
              </h2>
            </div>
          </div>

          {/* Trigger Upload Button */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 hover:scale-105 active:scale-95"
          >
            <Upload className="w-4 h-4 text-slate-950" />
            <span>{currentLang === 'om' ? 'Sanada Haaraa Fe\'i (Upload Document)' : 'ሰነድ ጫን (Upload)'}</span>
          </button>
        </div>

        {/* Search Within Folder Input Bar */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={folderSearchQuery}
              onChange={(e) => setFolderSearchQuery(e.target.value)}
              placeholder={currentLang === 'om' ? 'Fooldara ykn gosa sanadaa keeywata/maqaan barbaadi (e.g. Himannaa, Ragaa, Mormii, Sinqee, Summons, Ajaja)...' : 'Search within folders or document categories by keyword...'}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
            {folderSearchQuery && (
              <button
                type="button"
                onClick={() => setFolderSearchQuery('')}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Gosa:</span>
            </span>
            {[
              { id: 'all', label: currentLang === 'om' ? 'Hunda (All Folders)' : 'ሁሉም' },
              { id: 'claims', label: currentLang === 'om' ? '📝 Himannaa' : 'ክስ' },
              { id: 'evidence', label: currentLang === 'om' ? '🎙️ Ragaalee' : 'ማስረጃ' },
              { id: 'objections', label: currentLang === 'om' ? '🛡️ Mormii Art 244' : 'መቃወሚያ' },
              { id: 'summons', label: currentLang === 'om' ? '✉️ Waamicha' : 'መጥሪያ' },
              { id: 'orders', label: currentLang === 'om' ? '⚖️ Ajaja Dhaddachaa' : 'ትዕዛዝ' },
              { id: 'receipts', label: currentLang === 'om' ? '💳 Nagahee Sinqee' : 'ደረሰኝ' },
              { id: 'judgments', label: currentLang === 'om' ? '🏛️ Murtiiwwan' : 'ውሳኔ' },
              { id: 'archives', label: currentLang === 'om' ? '📦 Kuusaa (Archive)' : 'ማህደር' },
            ].map(filter => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(filter.id)}
                className={`px-3 py-1.5 rounded-xl font-mono text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategoryFilter === filter.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-Folders Grid with Subtle Fade-In on Filter / Search */}
      <div 
        key={`subfolders-container-${selectedCategoryFilter}-${folderSearchQuery}`} 
        className="space-y-3 animate-folder-fade-in"
      >
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono uppercase font-bold text-[11px] text-amber-300">
            {currentLang === 'om' ? 'Tarree Fooldaroota Mana Murtii (Folder Directory):' : 'Court Sub-Folders List:'}
          </span>
          <span className="font-mono text-[11px]">
            {filteredFolders.length} {currentLang === 'om' ? 'Fooldaroota Argaman' : 'Folders Found'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredFolders.map((folder, index) => {
            const isSelected = selectedFolderId === folder.id;
            const docMatches = safeFolderDocs.filter(d => d.folderId === folder.id);
            const countToDisplay = docMatches.length || folder.documentCount || 0;

            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
                style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}
                className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group relative overflow-hidden animate-folder-fade-in ${
                  isSelected 
                    ? 'bg-amber-500/15 border-amber-500 shadow-xl ring-2 ring-amber-500/30 scale-[1.02]' 
                    : `bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80`
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl p-2 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                      {folder.icon}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${folder.badgeBg} ${folder.badgeBorder} ${folder.color.split(' ').pop()}`}>
                      {countToDisplay} {currentLang === 'om' ? 'Sanadoota' : 'Docs'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white font-serif-legal line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {currentLang === 'om' ? folder.nameOm.split('(')[0].trim() : folder.nameEn.split('/')[0].trim()}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-1 font-sans">
                      {currentLang === 'om' ? folder.descriptionOm : folder.descriptionEn}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-amber-400/80">
                    {isSelected ? (currentLang === 'om' ? '✓ Banameera' : 'Active') : (currentLang === 'om' ? 'Bani' : 'Open')}
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Folder Document Contents Listing with Fade-In Animation */}
      <div 
        key={`folder-docs-box-${selectedFolderId || 'all'}-${selectedCategoryFilter}-${folderSearchQuery}`}
        className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 animate-folder-fade-in"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-serif-legal">
                {selectedFolderId 
                  ? DEFAULT_FOLDERS.find(f => f.id === selectedFolderId)?.nameOm 
                  : (currentLang === 'om' ? 'Sanadoota Fooldara Keessaa Hunda (All Folder Documents)' : 'All Documents in Folder Repository')}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {filteredDocuments.length} {currentLang === 'om' ? 'Sanadoota argaman' : 'Documents matched'}
              </p>
            </div>
          </div>

          {selectedFolderId && (
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer self-start sm:self-auto"
            >
              ✕ {currentLang === 'om' ? 'Fooldara Hunda Mul\'isi' : 'Clear Folder Filter'}
            </button>
          )}
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2 animate-folder-fade-in">
            <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs">
              {currentLang === 'om' 
                ? 'Sanadni keeywata barbaaddan waliin wal-simu hin argamne.' 
                : 'No documents match your search keyword in this folder.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDocuments.map((doc, docIdx) => (
              <div
                key={doc.id}
                style={{ animationDelay: `${Math.min(docIdx * 25, 200)}ms` }}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group animate-folder-fade-in"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs sm:text-sm group-hover:text-amber-300 transition-colors">
                        {doc.title}
                      </span>
                      {doc.isNew && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                          HAARAA (NEW)
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">
                        {doc.fileFormat}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3 flex-wrap">
                      <span className="text-amber-400">Case: {doc.caseNumber}</span>
                      <span>•</span>
                      <span>Fe\'aan: {doc.uploadedBy}</span>
                      <span>•</span>
                      <span>{doc.uploadedAt}</span>
                      <span>•</span>
                      <span className="text-slate-500">{doc.fileSize}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>SEALED</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      alert(currentLang === 'om' 
                        ? `Sanadni '${doc.title}' (${doc.caseNumber}) milkaa'inaan buufameera!` 
                        : `Downloading document '${doc.title}'!`);
                    }}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition-colors cursor-pointer"
                    title="Download Document"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Upload Modal with Visual Progress Bar & Spinner */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif-legal">
                    {currentLang === 'om' ? 'Sanada Haaraa Fooldaratti Fe\'i' : 'Upload Document to Court Folder'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {institutionName}
                  </p>
                </div>
              </div>

              {!isUploading && (
                <button
                  type="button"
                  onClick={handleResetUploadModal}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {uploadSuccessDoc ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl border border-emerald-500/40">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-serif-legal">
                    {currentLang === 'om' ? 'Sanadni Milkaa\'inaan Fe\'ameera!' : 'Document Uploaded Successfully!'}
                  </h4>
                  <p className="text-xs text-slate-300 font-mono mt-1">
                    {uploadSuccessDoc.title} • {uploadSuccessDoc.caseNumber}
                  </p>
                </div>
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={handleResetUploadModal}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow cursor-pointer transition-all"
                  >
                    {currentLang === 'om' ? 'Xumuri' : 'Done'}
                  </button>
                </div>
              </div>
            ) : isUploading ? (
              /* Visual Progress Bar & Spinner Screen */
              <div className="py-8 px-4 text-center space-y-5">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  {/* Outer animated spinner */}
                  <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  {/* Inner glowing pulse */}
                  <div className="absolute inset-2 bg-amber-500/10 rounded-full animate-pulse flex items-center justify-center">
                    <Upload className="w-6 h-6 text-amber-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono px-1">
                    <span className="text-slate-400 font-bold uppercase">Upload Progress</span>
                    <span className="text-amber-400 font-bold">{uploadProgress}%</span>
                  </div>

                  {/* Animated Visual Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-800 p-0.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-300 shadow-md"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  <p className="text-xs text-amber-300 font-mono animate-pulse pt-1">
                    {uploadStepMessage}
                  </p>
                </div>
              </div>
            ) : (
              /* Upload Form */
              <form onSubmit={handleStartUpload} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                    {currentLang === 'om' ? 'Fooldara / Gosa Sanadaa Filadhaa:' : 'Select Target Sub-Folder / Category:'}
                  </label>
                  <select
                    value={targetFolderForUpload}
                    onChange={(e) => setTargetFolderForUpload(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {DEFAULT_FOLDERS.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.icon} {f.nameOm}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                    {currentLang === 'om' ? 'Mata-duree Sanadaa:' : 'Document Title:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadDocTitle}
                    onChange={(e) => setUploadDocTitle(e.target.value)}
                    placeholder="e.g. Ragaa Barreeffamaa Lafa Baadiyyaa #2"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                    {currentLang === 'om' ? 'Lakkoofsa Galmee (Case Number):' : 'Case Docket Number:'}
                  </label>
                  <input
                    type="text"
                    value={uploadCaseNumber}
                    onChange={(e) => setUploadCaseNumber(e.target.value)}
                    placeholder="e.g. CR-2026/089"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* File Dropzone */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                    {currentLang === 'om' ? 'Faayila Sanadaa (PDF, DOCX, Image):' : 'Select File (PDF, DOCX, Image):'}
                  </label>
                  <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 bg-slate-950 cursor-pointer transition-colors group">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          if (!uploadDocTitle) setUploadDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                        }
                      }}
                    />
                    <Upload className="w-6 h-6 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    <span className="text-xs text-slate-300 font-medium">
                      {selectedFile ? selectedFile.name : (currentLang === 'om' ? 'Faayila filachuuf as tuqaa ykn asitti gad-dhiisaa' : 'Click to select or drag and drop file')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : 'PDF, DOCX, PNG, JPG (Max 50MB)'}
                    </span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleResetUploadModal}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    {currentLang === 'om' ? 'Dhiisi' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{currentLang === 'om' ? 'Fe\'iinsa Jalqabi (Start Upload)' : 'Start Upload'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
