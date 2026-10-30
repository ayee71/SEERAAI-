import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderPlus,
  Search,
  Download,
  Trash2,
  Edit2,
  Check,
  Tag,
  Calendar,
  Building,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import {
  CategorizedDocumentItem,
  processBatchCourtFiles,
  saveCategorizedBatchDocuments,
} from '../services/batchDocumentExtractionService';

interface BatchDocumentUploadPanelProps {
  currentLang: Language;
  onSavedSuccess?: () => void;
}

export const BatchDocumentUploadPanel: React.FC<BatchDocumentUploadPanelProps> = ({
  currentLang,
  onSavedSuccess,
}) => {
  const [items, setItems] = useState<CategorizedDocumentItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressCount, setProgressCount] = useState({ current: 0, total: 0 });
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CategorizedDocumentItem>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesArray = Array.from(e.target.files);
    await runBatchProcess(filesArray);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      await runBatchProcess(filesArray);
    }
  };

  const runBatchProcess = async (files: File[]) => {
    setIsProcessing(true);
    setSavedMessage(null);
    setProgressCount({ current: 0, total: files.length });

    try {
      const processed = await processBatchCourtFiles(
        files,
        currentLang,
        (current, total) => {
          setProgressCount({ current, total });
        }
      );
      setItems((prev) => [...processed, ...prev]);
    } catch (err: any) {
      console.error('Batch upload error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartEdit = (item: CategorizedDocumentItem) => {
    setEditingId(item.id);
    setEditFormData({
      caseName: item.caseName,
      referenceNumber: item.referenceNumber,
      extractedDate: item.extractedDate,
      docType: item.docType,
      courtName: item.courtName,
    });
  };

  const handleSaveEdit = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...editFormData } : item))
    );
    setEditingId(null);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveAll = async () => {
    if (items.length === 0) return;
    try {
      const saved = await saveCategorizedBatchDocuments(items);
      const isOm = currentLang === 'om';
      setSavedMessage(
        isOm
          ? `Sanadoota ${saved.length} galmee keessanitti milkaa'inaan kuufamaniiru!`
          : `Successfully saved ${saved.length} categorized court document(s) to storage!`
      );
      if (onSavedSuccess) onSavedSuccess();
    } catch (err: any) {
      setSavedMessage(`Failed to save: ${err.message}`);
    }
  };

  const handleDownloadCSV = () => {
    if (items.length === 0) return;
    const headers = ['File Name', 'Case Name', 'File/Case No.', 'Date', 'Document Type', 'Court Name', 'Summary'];
    const rows = items.map((i) => [
      `"${i.fileName}"`,
      `"${i.caseName}"`,
      `"${i.referenceNumber}"`,
      `"${i.extractedDate}"`,
      `"${i.docType}"`,
      `"${i.courtName}"`,
      `"${i.summary.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_Court_Documents_Index_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchFilter.trim() ||
      item.fileName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.caseName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.docType.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.courtName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.referenceNumber.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesType =
      selectedTypeFilter === 'all' ||
      item.docType.toLowerCase().includes(selectedTypeFilter.toLowerCase());

    return matchesSearch && matchesType;
  });

  const isOm = currentLang === 'om';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-serif-legal text-white flex items-center gap-2.5">
            <UploadCloud className="w-6 h-6 text-amber-400" />
            <span>
              {isOm
                ? 'Fe\'iinsa Sanadoota Baay\'ee (Batch Document Upload & Categorization)'
                : 'Batch Document Processing & AI Categorization'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isOm
              ? 'Sanadoota mana murtii hedduu al-takkaan olkaa\'aa; AI\'n maqaa galmee, guyyaa, gosa sanadaa fi mana murtii baasee furaa.'
              : 'Upload multiple court files simultaneously. AI automatically extracts case names, dates, and document types.'}
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export CSV Index</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <FolderPlus className="w-4 h-4" />
              <span>
                {isOm ? `Sanadoota ${items.length} Kuufi` : `Save All ${items.length} Documents`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
          isProcessing
            ? 'border-amber-500/50 bg-amber-500/5 cursor-wait'
            : 'border-slate-700 hover:border-amber-500/60 bg-slate-950/60 hover:bg-slate-950'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.tiff"
          onChange={handleFileChange}
          className="hidden"
        />

        {isProcessing ? (
          <div className="space-y-3 py-4">
            <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {isOm ? 'AI\'n Sanadoota Qorataa Jira...' : 'AI Extracting Legal Entities...'}
              </h4>
              <p className="text-xs text-amber-300 font-mono">
                {progressCount.current} / {progressCount.total} files processed
              </p>
            </div>
            <div className="w-48 mx-auto h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{
                  width: `${progressCount.total > 0 ? (progressCount.current / progressCount.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                {isOm
                  ? 'Sanadoota Hedduu Asitti Harkisaa ykn Cuqaasaa'
                  : 'Drag & Drop Multiple Court Files Here or Click to Browse'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Supports PDF, DOCX, TXT, scanned images (JPEG, PNG). Batch process claims, summons, verdicts, contracts.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-amber-400 font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simultaneous Multi-file AI Entity Extraction</span>
            </div>
          </div>
        )}
      </div>

      {savedMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Categorized Document Table / Cards */}
      {items.length > 0 && (
        <div className="space-y-4">
          {/* Quick Search & Category Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={isOm ? 'Maqaa galmee, lakk., gosa sanadaatiin barbaadi...' : 'Filter batch files by case name, doc type, or file number...'}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs shrink-0">
              {['all', 'Himannaa', 'Waamicha', 'Murtii', 'Waliigaltee', 'Ol-iyyannoo'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedTypeFilter === type
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {type === 'all' ? (isOm ? 'Hunda' : 'All') : type}
                </button>
              ))}
            </div>
          </div>

          {/* Document List */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 font-mono">
                          {item.fileName}
                          <span className="text-[10px] text-slate-500 ml-2">({item.fileSizeFormatted})</span>
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono font-bold border border-amber-500/30">
                          {item.docType}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
                          title="Edit extracted metadata"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Extracted Metadata Grid */}
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5 font-bold">Case Name:</label>
                        <input
                          type="text"
                          value={editFormData.caseName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, caseName: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5 font-bold">Ref No:</label>
                        <input
                          type="text"
                          value={editFormData.referenceNumber || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, referenceNumber: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5 font-bold">Date:</label>
                        <input
                          type="text"
                          value={editFormData.extractedDate || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, extractedDate: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5 font-bold">Doc Type:</label>
                        <input
                          type="text"
                          value={editFormData.docType || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, docType: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-500 block">Case / Parties:</span>
                          <strong className="text-white text-xs block truncate">{item.caseName}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-500 block">Date & Ref No:</span>
                          <span className="text-amber-300 font-mono text-xs block">
                            {item.extractedDate} • Lakk: {item.referenceNumber}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-500 block">Court / Institution:</span>
                          <span className="text-slate-200 text-xs block truncate">{item.courtName}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
