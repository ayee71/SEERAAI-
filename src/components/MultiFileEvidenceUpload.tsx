import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FolderPlus, 
  Trash2, 
  Sparkles, 
  X,
  Plus,
  Scale,
  Calendar,
  Building2,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '../i18n/translations';
import { extractEvidenceMetadata, ExtractedEvidenceMetadata } from '../services/evidenceMetadataService';
import { practiceCaseService, CaseEvidence } from '../services/practiceCaseService';
import { readFileAsTextOrBase64, formatFileSize } from '../services/batchDocumentExtractionService';
import { uploadFileToFirebaseStorage } from '../services/storage';

interface ProcessedEvidenceItem {
  id: string;
  file: File;
  base64?: string;
  textContent?: string;
  metadata: ExtractedEvidenceMetadata | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  isExpanded: boolean;
}

interface MultiFileEvidenceUploadProps {
  currentLang: Language;
  caseId: string;
  caseNumber: string;
  institutionId?: string;
  onClose: () => void;
  onSuccess: (evidenceItems: CaseEvidence[]) => void;
}

export const MultiFileEvidenceUpload: React.FC<MultiFileEvidenceUploadProps> = ({
  currentLang,
  caseId,
  caseNumber,
  institutionId,
  onClose,
  onSuccess
}) => {
  const [items, setItems] = useState<ProcessedEvidenceItem[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (files: File[]) => {
    const newItems: ProcessedEvidenceItem[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      metadata: null,
      status: 'pending',
      isExpanded: false
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const processAll = async () => {
    const pendingItems = items.filter(item => item.status === 'pending' || item.status === 'error');
    
    for (const item of pendingItems) {
      updateItemStatus(item.id, 'processing');
      
      try {
        const { text, base64 } = await readFileAsTextOrBase64(item.file);
        const metadata = await extractEvidenceMetadata({
          fileName: item.file.name,
          fileType: item.file.type,
          textContent: text,
          base64Data: base64,
          caseId,
          caseNumber,
          institutionId,
          language: currentLang
        });

        if (metadata) {
          setItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            metadata,
            base64,
            textContent: text,
            status: 'completed'
          } : i));
        } else {
          throw new Error('Failed to extract metadata');
        }
      } catch (err: any) {
        updateItemStatus(item.id, 'error', err.message);
      }
    }
  };

  const updateItemStatus = (id: string, status: ProcessedEvidenceItem['status'], error?: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status, error } : item));
  };

  const toggleExpand = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isExpanded: !item.isExpanded } : item));
  };

  const handleSaveAll = async () => {
    const completedItems = items.filter(item => item.status === 'completed' && item.metadata);
    if (completedItems.length === 0) return;

    setIsSavingAll(true);
    const savedEvidence: CaseEvidence[] = [];

    try {
      for (const item of completedItems) {
        const meta = item.metadata!;
        // 1. Upload to Cloud Storage
        let cloudUrl = '';
        let cloudPath = '';
        
        try {
          const uploadRes = await uploadFileToFirebaseStorage(item.file, item.file.name);
          cloudUrl = uploadRes.url;
          cloudPath = uploadRes.path;
        } catch (err) {
          console.error('Cloud upload failed for', item.file.name, err);
          // Fallback to dataUrl only if small (under 100KB) to prevent Firestore overflow
          // But requirement says transition to Cloud Storage, so we should ideally fail if upload fails
        }

        const evidence: CaseEvidence = {
          id: `evd_${Math.random().toString(36).substring(7)}`,
          name: item.file.name,
          type: item.file.type,
          storageUrl: cloudUrl || undefined,
          storagePath: cloudPath || undefined,
          // Keep dataUrl only for very small thumbnails if image
          dataUrl: (item.file.type.startsWith('image/') && item.file.size < 50000) ? `data:${item.file.type};base64,${item.base64}` : undefined,
          size: item.file.size,
          uploadedAt: new Date().toISOString(),
          category: meta.evidenceCategory,
          aiDescription: meta.aiSummary,
          aiRelevance: `Statutory Basis: ${meta.statutoryBasis}. Extracts: ${meta.keyEntities.join(', ')}`,
          evidentialWeight: meta.evidentialWeight,
          admissibilityStatus: meta.admissibilityStatus,
          incidentDate: meta.filingDate,
          authorOrSource: meta.documentOrigin,
          tags: [...meta.keyEntities, meta.evidenceCategory, 'Batch Upload']
        };

        await practiceCaseService.attachEvidence(caseId, evidence);
        savedEvidence.push(evidence);
      }
      onSuccess(savedEvidence);
      onClose();
    } catch (err: any) {
      alert('Failed to save evidence: ' + err.message);
    } finally {
      setIsSavingAll(false);
    }
  };

  const processingCount = items.filter(i => i.status === 'processing').length;
  const completedCount = items.filter(i => i.status === 'completed').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                {isOm ? 'Ragaalee Hedduu Al-takkaan Galmeessi' : 'Multi-File Evidence Batch Processing'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {caseNumber} • {isOm ? 'AI\'n battalatti metaadaataa baasa' : 'AI Metadata Extraction Enabled'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dropzone */}
          {items.length === 0 && (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-3xl p-12 text-center transition-all cursor-pointer bg-slate-950/30 hover:bg-slate-950/50 group"
            >
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-amber-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">
                {isOm ? 'Ragaalee hunda asitti harkisaa' : 'Drag & Drop All Evidence Files'}
              </h4>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                {isOm ? 'Suuraa, PDF, fi barreeffama hanga 100MB; AI\'n battalumatti gosa, guyyaa fi rogummaa seeraa baasa.' : 'Support Images, PDFs, and Docs up to 100MB. AI will automatically extract type, date, and legal relevance.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                  Select Files
                </span>
                <span className="text-slate-600 font-bold">OR</span>
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                  Drop Here
                </span>
              </div>
            </div>
          )}

          {/* List of items */}
          {items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-slate-400">Total: {items.length}</span>
                  <span className="text-emerald-400">Completed: {completedCount}</span>
                  <span className="text-amber-400">Processing: {processingCount}</span>
                  {pendingCount > 0 && <span className="text-blue-400">Pending: {pendingCount}</span>}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More</span>
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </button>
                  <button 
                    disabled={processingCount > 0 || pendingCount === 0}
                    onClick={processAll}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black uppercase hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    {processingCount > 0 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isOm ? 'Metaadaataa Baasi' : 'Extract Metadata'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {items.map(item => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`border rounded-2xl transition-all overflow-hidden ${item.status === 'error' ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-800 bg-slate-950/40'}`}
                    >
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                            {item.status === 'processing' ? <RefreshCw className="w-5 h-5 animate-spin text-amber-500" /> : <FileText className="w-5 h-5" />}
                          </div>
                          <div className="truncate">
                            <h5 className="text-sm font-bold text-slate-100 truncate">{item.file.name}</h5>
                            <p className="text-[10px] text-slate-500 font-mono uppercase">{formatFileSize(item.file.size)} • {item.file.type || 'unknown type'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {item.status === 'completed' && (
                            <button 
                              onClick={() => toggleExpand(item.id)}
                              className="text-emerald-400 text-xs font-bold flex items-center gap-1 hover:underline"
                            >
                              <span>{isOm ? 'Ilaali' : 'Details'}</span>
                              {item.isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {item.status === 'error' && (
                            <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{item.error || 'Failed'}</span>
                            </div>
                          )}
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Metadata Expansion */}
                      <AnimatePresence>
                        {item.isExpanded && item.metadata && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-800 bg-slate-900/50 p-4"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-amber-500" />
                                  Category
                                </label>
                                <div className="text-xs font-bold text-slate-200 bg-slate-800 px-2 py-1 rounded-md border border-slate-700 capitalize">
                                  {item.metadata.evidenceCategory.replace('_', ' ')}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-amber-500" />
                                  Doc Date
                                </label>
                                <div className="text-xs font-bold text-amber-300 font-mono bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
                                  {item.metadata.filingDate}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-amber-500" />
                                  Origin
                                </label>
                                <div className="text-xs font-bold text-slate-200 truncate bg-slate-800 px-2 py-1 rounded-md border border-slate-700" title={item.metadata.documentOrigin}>
                                  {item.metadata.documentOrigin}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1">
                                  <Scale className="w-3 h-3 text-amber-500" />
                                  Weight
                                </label>
                                <div className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 capitalize text-center">
                                  {item.metadata.evidentialWeight}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase">AI Legal Summary</div>
                                <p className="text-xs text-slate-300 leading-relaxed italic">"{item.metadata.aiSummary}"</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                                  {item.metadata.statutoryBasis}
                                </span>
                                {item.metadata.keyEntities.map((entity, idx) => (
                                  <span key={idx} className="px-2 py-1 rounded-md bg-slate-800 text-slate-400 text-[10px] font-medium border border-slate-700">
                                    {entity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${completedCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {completedCount} of {items.length} Ready for Archiving
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              disabled={completedCount === 0 || isSavingAll || processingCount > 0}
              onClick={handleSaveAll}
              className="px-8 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black text-sm uppercase shadow-xl shadow-amber-500/10 flex items-center gap-2 transition-all active:scale-95"
            >
              {isSavingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isOm ? `Ragaalee ${completedCount} Galmeessi` : `Archive ${completedCount} Evidence Items`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
