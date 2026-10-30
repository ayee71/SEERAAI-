/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import {
  SavedCitationItem,
  getLocalSavedCitations,
  removeCitationFromLibrary,
  updateSavedCitationMetadata,
  fetchSavedCitationsFromLibrary,
} from '../services/citationLibraryService';
import {
  generateCassationBibliographyPDF,
  downloadMarkdownBibliography,
  generateCassationBibliographyMarkdown,
} from '../services/cassationBibliographyExport';
import { CassationPrecedent } from '../data/cassationPrecedents';
import {
  X,
  Bookmark,
  Trash2,
  Copy,
  Check,
  Search,
  Download,
  FileText,
  Edit3,
  BookOpen,
  Filter,
  Scale,
  Gavel,
  Plus,
  Share2,
} from 'lucide-react';

interface SavedCitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onInsertCitation?: (text: string) => void;
}

export const SavedCitationsModal: React.FC<SavedCitationsModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onInsertCitation,
}) => {
  const t = translations[currentLang];
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const [savedItems, setSavedItems] = useState<SavedCitationItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editCaseName, setEditCaseName] = useState('');

  const refreshList = async () => {
    const items = await fetchSavedCitationsFromLibrary();
    setSavedItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
    }
  }, [isOpen]);

  const handleRemove = async (id: string) => {
    await removeCitationFromLibrary(id);
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCopy = (item: SavedCitationItem) => {
    const textToCopy = `${item.insertText} (${item.lawTitle} - ${item.articleNumber})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEdit = (item: SavedCitationItem) => {
    setEditingId(item.id);
    setEditNotes(item.notes || '');
    setEditCaseName(item.caseName || '');
  };

  const handleSaveEdit = async (id: string) => {
    await updateSavedCitationMetadata(id, editNotes, editCaseName);
    setEditingId(null);
    refreshList();
  };

  const handleExportPDF = () => {
    const mockPrecedents: CassationPrecedent[] = filteredItems.map((item) => ({
      id: item.id,
      volume: 0,
      fileNumber: item.cassationRef || item.articleNumber,
      yearEC: 2017,
      yearGC: 2024,
      category: 'other',
      parties: { om: item.caseName || item.title, am: item.caseName || item.title, en: item.caseName || item.title },
      legalIssue: { om: item.lawTitle, am: item.lawTitle, en: item.lawTitle },
      bindingPrinciple: { om: item.summary, am: item.summary, en: item.summary },
      statutoryProvisions: [item.proclamationNumber, item.articleNumber].filter(Boolean),
    }));

    generateCassationBibliographyPDF(mockPrecedents, currentLang, {
      query: 'Saved Research Citations Library',
    });
  };

  const filteredItems = savedItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const cleanSearch = search.toLowerCase().trim();
    if (!cleanSearch) return matchesCategory;

    const matchesText =
      item.title.toLowerCase().includes(cleanSearch) ||
      item.lawTitle.toLowerCase().includes(cleanSearch) ||
      item.articleNumber.toLowerCase().includes(cleanSearch) ||
      item.summary.toLowerCase().includes(cleanSearch) ||
      (item.caseName && item.caseName.toLowerCase().includes(cleanSearch)) ||
      (item.notes && item.notes.toLowerCase().includes(cleanSearch));

    return matchesCategory && matchesText;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 p-5 md:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Bookmark className="w-6 h-6 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Personal Research Library
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {savedItems.length} {isOm ? 'Kuufamaniiru' : 'Saved Citations'}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-slate-100 font-serif-legal">
                {isOm
                  ? 'Kuusaa Wabiilee & Murtiiwwan Seeraa Koo'
                  : isAm
                  ? 'የተቀመጡ የሕግ ማጣቀሻዎችና የሰበር ውሳኔዎች'
                  : 'My Saved Citations & Research Precedents'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Toolbar */}
        <div className="p-4 md:p-5 bg-slate-900/90 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isOm ? 'Wabii kuufamaa sakatta\'i...' : 'Search saved research...'}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={filteredItems.length === 0}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs pt-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {[
              { id: 'all', label: isOm ? 'Hunda (All)' : 'All' },
              { id: 'civil_contract', label: 'Civil Code' },
              { id: 'labor', label: 'Labor Law' },
              { id: 'property_land', label: 'Land & Property' },
              { id: 'procedure_evidence', label: 'Procedure (SDFHH)' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-xl whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/60 rounded-3xl border border-slate-800 space-y-3">
              <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">
                {isOm ? 'Wabiin kuufame hin argamne' : 'No Saved Citations Found'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isOm
                  ? 'Yeroo wabii seeraa sakatta\'tan icon "Bookmark/Kuusaa" tuquun asitti olkuyyatuu dandeessu.'
                  : 'Bookmark citations while searching in Legal Citation Finder to collect precedents for your research.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl shadow-md space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {item.articleNumber || item.proclamationNumber}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.savedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                      <p className="text-xs font-medium text-slate-400">
                        {item.lawTitle} ({item.proclamationNumber})
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
                      {item.summary}
                    </div>

                    {/* Case research note section */}
                    {editingId === item.id ? (
                      <div className="space-y-2 p-3 bg-slate-900 border border-amber-500/30 rounded-xl">
                        <div>
                          <label className="text-[10px] text-amber-400 font-bold uppercase">Case Title / Topic:</label>
                          <input
                            type="text"
                            value={editCaseName}
                            onChange={(e) => setEditCaseName(e.target.value)}
                            placeholder="E.g., Ato Gemechu Labor Claim"
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-amber-400 font-bold uppercase">Research Notes:</label>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={2}
                            placeholder="Add legal argument notes..."
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 mt-0.5 resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded text-[11px]"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-950/20 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 space-y-1">
                        {item.caseName && (
                          <div className="font-bold">📁 {item.caseName}</div>
                        )}
                        {item.notes ? (
                          <div className="text-slate-300 italic">"{item.notes}"</div>
                        ) : (
                          <div className="text-slate-500 flex items-center gap-1 cursor-pointer" onClick={() => handleStartEdit(item)}>
                            <Edit3 className="w-3 h-3" />
                            <span>Add case research notes...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleCopy(item)}
                      className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    {onInsertCitation && (
                      <button
                        type="button"
                        onClick={() => {
                          onInsertCitation(item.insertText);
                          onClose();
                        }}
                        className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      title="Edit Case Notes"
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded-xl border border-slate-800 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      title="Remove from Library"
                      className="p-1.5 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-xl border border-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
