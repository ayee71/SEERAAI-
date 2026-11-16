import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../i18n/translations';
import { 
  FolderOpen, 
  Search, 
  Upload, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Filter, 
  FileCheck, 
  Archive,
  CheckSquare,
  Square,
  Mic,
  X,
  RefreshCw,
  Download
} from 'lucide-react';
import { fetchCaseActivityLogs, fetchCaseAudioRecordings } from '../services/courtCaseService';
import JSZip from 'jszip';
import { 
  listCourtDocuments, 
  uploadCourtDocument, 
  archiveCourtDocument, 
  getCourtDocumentBlob,
  logCourtDocumentOpened,
  MAX_FILE_SIZE,
  CourtDocument,
  CourtFolderId
} from '../services/courtDocuments';

export interface FolderCategory {
  id: CourtFolderId;
  nameOm: string;
  nameAm: string;
  nameEn: string;
  descriptionOm: string;
  descriptionEn: string;
  category: CourtFolderId;
  icon: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
}

interface CourtFolderExplorerProps {
  currentLang: Language;
  institutionName?: string;
  institutionId?: string;
  onNavigateToSection?: (sectionId: string) => void;
  currentUser?: {
    uid: string;
    fullName: string;
    role: string;
  };
}

const DEFAULT_FOLDERS: FolderCategory[] = [
  {
    id: 'claims',
    nameOm: 'Himannaa & Iyyannoowwan',
    nameAm: 'የክስ ማመልከቻዎች እና አቤቱታዎች',
    nameEn: 'Claims & Petitions',
    descriptionOm: 'Himannoowwan haaraa fi iyyannoowwan dhiyaatan.',
    descriptionEn: 'Initial statements of claim and formal filings.',
    category: 'claims',
    icon: '📝',
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-300',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
  },
  {
    id: 'evidence',
    nameOm: 'Ragaalee & Waraabbata Dhaddachaa',
    nameAm: 'ማስረጃዎች እና የችሎት ቃለ-ጉባኤዎች',
    nameEn: 'Evidence & Transcripts',
    descriptionOm: 'Ragaa barreeffamaa, ragaa namaa fi sagalee.',
    descriptionEn: 'Documentary evidence and audio transcripts.',
    category: 'evidence',
    icon: '🎙️',
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/40 text-blue-300',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/30',
  },
  {
    id: 'orders',
    nameOm: 'Ajaja & Qajeelfama Dhaddachaa',
    nameAm: 'የችሎት ትዕዛዞች እና መመሪያዎች',
    nameEn: 'Court Orders & Injunctions',
    descriptionOm: 'Ajaja qabeenya ugguruu fi ajaja poolisii.',
    descriptionEn: 'Interim injunctions and police directives.',
    category: 'orders',
    icon: '⚖️',
    color: 'from-rose-500/20 to-rose-600/10 border-rose-500/40 text-rose-300',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
  },
  {
    id: 'judgments',
    nameOm: 'Murtiiwwan & Ajaja Xumuraa',
    nameAm: 'የፍርድ ውሳኔዎች እና የሰበር ትዕዛዞች',
    nameEn: 'Judgments & Rulings',
    descriptionOm: 'Murtiiwwan dhaddachaa fi murteewwan xumuraa.',
    descriptionEn: 'Final dispositive court judgments and decrees.',
    category: 'judgments',
    icon: '🏛️',
    color: 'from-amber-400/20 to-amber-500/10 border-amber-400/40 text-amber-200',
    badgeBg: 'bg-amber-400/15',
    badgeBorder: 'border-amber-400/30',
  },
];

export const CourtFolderExplorer: React.FC<CourtFolderExplorerProps> = ({
  currentLang,
  institutionName = 'Mana Murtii Aanaa Gurbicha',
  institutionId,
  currentUser
}) => {
  const { user, loading } = useAuth();
  const [allDocuments, setAllDocuments] = useState<CourtDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<CourtFolderId | null>(null);
  const [isDownloadingBundle, setIsDownloadingBundle] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [targetFolderForUpload, setTargetFolderForUpload] = useState<CourtFolderId>('claims');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    if (!loading) {
      loadDocuments();
    }
  }, [institutionId, loading, user]);

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const docs = await listCourtDocuments();
      setAllDocuments(docs);
    } catch (error: any) {
      console.warn('Notice loading documents:', error);
      setAllDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleDownloadFullCaseBundle = async () => {
    setIsDownloadingBundle(true);
    try {
      const zip = new JSZip();
      const bundleName = `Court_Bundle_${institutionName.replace(/ /g, '_')}`;
      const caseFolder = zip.folder(bundleName);

      const docMetadata = allDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        folderId: doc.folderId,
        uploadedBy: doc.createdBy,
        uploadedAt: doc.uploadedAt,
        size: doc.size,
        contentType: doc.contentType,
        status: doc.status,
      }));
      caseFolder?.file('document_metadata.json', JSON.stringify(docMetadata, null, 2));

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bundleName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(currentLang === 'om' 
        ? `Bundle galmee guutuu milkaa'inaan zip ta'ee buufameera!` 
        : `Full Case Bundle successfully generated and downloaded as zip!`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to generate case bundle zip');
    } finally {
      setIsDownloadingBundle(false);
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setUploadError(null);
    if (selectedFile.size <= 0) {
      const msg = 'Faayiliin duwwaa ta’uu hin danda’u.';
      setUploadError(msg);
      showToast(msg);
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      const msg = 'Guddinni faayilaa 50 MB caaluu hin qabu.';
      setUploadError(msg);
      showToast(msg);
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      await uploadCourtDocument(selectedFile, targetFolderForUpload);
      await loadDocuments();
      setUploadSuccess(true);
      showToast(currentLang === 'om' ? 'Sanadni milkaa\'inaan fe\'ameera!' : 'Document uploaded successfully!');
    } catch (err: any) {
      console.error('Upload failed:', err);
      const errMsg = err?.message || 'Upload failed. Please try again.';
      setUploadError(errMsg);
      showToast(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDoc = async (doc: CourtDocument) => {
    try {
      const blob = await getCourtDocumentBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await logCourtDocumentOpened(doc.id);
    } catch (err: any) {
      showToast(err?.message || 'Failed to download document');
    }
  };

  const handleToggleSelectDoc = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length > 0 && selectedDocIds.length === filteredDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map(d => d.id));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedDocIds.length === 0) return;
    setIsActionLoading(true);
    try {
      await Promise.all(selectedDocIds.map(id => archiveCourtDocument(id)));
      await loadDocuments();
      setSelectedDocIds([]);
    } catch (error) {
      console.error('Bulk archive failed:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadSuccess(false);
    setUploadError(null);
    setIsUploading(false);
  };

  const filteredDocuments = allDocuments.filter(doc => {
    if (selectedFolderId && doc.folderId !== selectedFolderId) return false;
    if (!folderSearchQuery.trim()) return true;

    const query = folderSearchQuery.toLowerCase();
    return (
      (doc.title || '').toLowerCase().includes(query) ||
      (doc.fileName || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-amber-500/30 shadow-2xl backdrop-blur-md space-y-4">
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
                {currentLang === 'om' ? 'Fooldaroota & Sanadoota Mana Murtii' : 'Court Folders & Documents'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 hover:scale-105 active:scale-95"
          >
            <Upload className="w-4 h-4 text-slate-950" />
            <span>{currentLang === 'om' ? 'Sanada Haaraa Fe\'i' : 'Upload Document'}</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={folderSearchQuery}
              onChange={(e) => setFolderSearchQuery(e.target.value)}
              placeholder={currentLang === 'om' ? 'Sanada barbaadi...' : 'Search documents...'}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEFAULT_FOLDERS.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          const count = allDocuments.filter(d => d.folderId === folder.id).length;

          return (
            <div
              key={folder.id}
              onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
              className={`p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer flex flex-col justify-between gap-4 group relative overflow-hidden shadow-lg ${
                isSelected 
                  ? 'bg-amber-500/20 border-amber-400 shadow-amber-500/20 ring-2 ring-amber-500/40 scale-[1.02]' 
                  : `bg-slate-800 border-slate-700/80 hover:border-amber-500/40 hover:bg-slate-700 hover:-translate-y-1`
              }`}
            >
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/50 flex items-center justify-center text-2xl">
                    {folder.icon}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black border tracking-wider shadow-sm ${folder.badgeBg} ${folder.badgeBorder} ${folder.color.split(' ').pop()}`}>
                    {count} {currentLang === 'om' ? 'SANADOOTA' : 'DOCS'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white font-serif-legal line-clamp-1 group-hover:text-amber-300">
                    {currentLang === 'om' ? folder.nameOm : folder.nameEn}
                  </h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mt-1">
                    {currentLang === 'om' ? folder.descriptionOm : folder.descriptionEn}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono font-bold">
                <span className={`${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                  {isSelected ? '✓ ACTIVE' : 'OPEN FOLDER'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={handleSelectAll}
              className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center hover:border-amber-500/50"
            >
              {selectedDocIds.length > 0 && selectedDocIds.length === filteredDocuments.length ? (
                <CheckSquare className="w-5 h-5 text-amber-500" />
              ) : (
                <Square className="w-5 h-5 text-slate-500" />
              )}
            </button>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-serif-legal">
                {selectedFolderId 
                  ? DEFAULT_FOLDERS.find(f => f.id === selectedFolderId)?.nameOm 
                  : (currentLang === 'om' ? 'Sanadoota Hunda' : 'All Documents')}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedDocIds.length > 0 && (
              <button
                onClick={handleBulkArchive}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-[11px] font-bold transition-colors disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{currentLang === 'om' ? 'Kuusi' : 'Archive'}</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={handleDownloadFullCaseBundle}
              disabled={isDownloadingBundle}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5"
            >
              <Download className={`w-3.5 h-3.5 text-amber-400 ${isDownloadingBundle ? 'animate-spin' : ''}`} />
              <span>{currentLang === 'om' ? '📦 Bundle Buufadhu' : '📦 Download Bundle'}</span>
            </button>
          </div>
        </div>

        {isLoadingDocs ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
            <p className="text-xs">{currentLang === 'om' ? 'Sanadoota fidaa jira...' : 'Loading documents...'}</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs">{currentLang === 'om' ? 'Sanadni hin argamne.' : 'No documents found.'}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`p-3.5 rounded-2xl bg-slate-950 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                  selectedDocIds.includes(doc.id) 
                    ? 'border-amber-500/60 bg-amber-500/5' 
                    : 'border-slate-800/80 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleSelectDoc(doc.id)}
                    className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mt-1"
                  >
                    {selectedDocIds.includes(doc.id) ? (
                      <CheckSquare className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs sm:text-sm group-hover:text-amber-300">
                        {doc.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">
                        {doc.contentType.split('/').pop()?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3 flex-wrap">
                      <span>Fe\'aan: {doc.createdBy}</span>
                      <span>•</span>
                      <span>{doc.uploadedAt}</span>
                      <span>•</span>
                      <span className="text-slate-500">{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => handleDownloadDoc(doc)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Sanada Haaraa Fe\'i' : 'Upload Document'}
              </h3>
              {!isUploading && (
                <button onClick={handleResetUploadModal} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {uploadSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">Milkaa'inaan Kuufameera!</h4>
                <button onClick={handleResetUploadModal} className="px-6 py-2.5 rounded-2xl bg-slate-800 text-white text-xs font-bold">Xumuri</button>
              </div>
            ) : (
              <form onSubmit={handleStartUpload} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Fooldara Filadhu:</label>
                    <select
                      value={targetFolderForUpload}
                      onChange={(e) => setTargetFolderForUpload(e.target.value as CourtFolderId)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                    >
                      {DEFAULT_FOLDERS.map(f => (
                        <option key={f.id} value={f.id}>{currentLang === 'om' ? f.nameOm : f.nameEn}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Faayila Sanadaa:</label>
                    <input
                      type="file"
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                        if (file && file.size > MAX_FILE_SIZE) {
                          setUploadError('Guddinni faayilaa 50 MB caaluu hin qabu.');
                        } else {
                          setUploadError(null);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Hangamni ol’aanaan faayilaa: 50 MB (Max 50 MB).
                    </p>
                  </div>
                </div>
                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                    {uploadError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'UPLOAD DOCUMENT'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/50 text-amber-300 font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span>🔔</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
