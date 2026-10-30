/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Language, translations } from '../i18n/translations';
import { CassationPrecedent, CASSATION_PRECEDENTS_DATA } from '../data/cassationPrecedents';
import { LegalCitationSuggestion } from '../services/api';
import {
  generateCassationBibliographyMarkdown,
  downloadMarkdownBibliography,
  generateCassationBibliographyPDF,
  BibliographyExportOptions,
} from '../services/cassationBibliographyExport';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  Scale,
  Gavel,
  Sparkles,
  BookOpen,
  Filter,
  CheckSquare,
  Square,
  Share2,
  Eye,
  FileCode,
} from 'lucide-react';

interface CassationBibliographyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  suggestions?: LegalCitationSuggestion[];
  currentQuery?: string;
}

export const CassationBibliographyModal: React.FC<CassationBibliographyModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  suggestions = [],
  currentQuery = '',
}) => {
  const t = translations[currentLang];
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const [advocateName, setAdvocateName] = useState('');
  const [caseReference, setCaseReference] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown' | 'select'>('preview');
  const [isCopied, setIsCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<'pdf' | 'md' | null>(null);

  // Extract / match precedents from suggestions and CASSATION_PRECEDENTS_DATA
  const availablePrecedents = useMemo<CassationPrecedent[]>(() => {
    const list: CassationPrecedent[] = [];
    const addedIds = new Set<string>();

    // 1. Check suggestions for explicit file numbers or cassationRef
    suggestions.forEach((s) => {
      if (s.cassationRef) {
        const fileMatch = s.cassationRef.match(/\b\d{4,7}\b/);
        if (fileMatch) {
          const fileNum = fileMatch[0];
          const found = CASSATION_PRECEDENTS_DATA.find((p) => p.fileNumber === fileNum);
          if (found && !addedIds.has(found.id)) {
            addedIds.add(found.id);
            list.push(found);
          }
        }
      }
    });

    // 2. Query matching in CASSATION_PRECEDENTS_DATA
    if (currentQuery && currentQuery.trim().length > 1) {
      const clean = currentQuery.toLowerCase().trim();
      const queryTokens = clean.split(/\s+/).filter((t) => t.length > 2);

      CASSATION_PRECEDENTS_DATA.forEach((p) => {
        if (addedIds.has(p.id)) return;

        const fileNumMatch = p.fileNumber.includes(clean);
        const partyMatch = p.parties
          ? (p.parties[currentLang] || p.parties.en || '').toLowerCase().includes(clean)
          : false;
        const issueMatch = p.legalIssue
          ? (p.legalIssue[currentLang] || p.legalIssue.en || '').toLowerCase().includes(clean)
          : false;
        const principleMatch = p.bindingPrinciple
          ? (p.bindingPrinciple[currentLang] || p.bindingPrinciple.en || '').toLowerCase().includes(clean)
          : false;

        const tokenMatches = queryTokens.some((token) =>
          p.fileNumber.includes(token) ||
          (p.bindingPrinciple && (p.bindingPrinciple.om?.toLowerCase().includes(token) || p.bindingPrinciple.am?.includes(token) || p.bindingPrinciple.en?.toLowerCase().includes(token))) ||
          (p.legalIssue && (p.legalIssue.om?.toLowerCase().includes(token) || p.legalIssue.am?.includes(token) || p.legalIssue.en?.toLowerCase().includes(token)))
        );

        if (fileNumMatch || partyMatch || issueMatch || principleMatch || tokenMatches) {
          addedIds.add(p.id);
          list.push(p);
        }
      });
    }

    // 3. Fallback: If list is still empty, populate top representative precedents
    if (list.length === 0) {
      return CASSATION_PRECEDENTS_DATA.slice(0, 6);
    }

    return list;
  }, [suggestions, currentQuery, currentLang]);

  // Selected item tracking
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(availablePrecedents.map((p) => p.id));
  });

  // Sync selected state when availablePrecedents changes
  React.useEffect(() => {
    setSelectedIds(new Set(availablePrecedents.map((p) => p.id)));
  }, [availablePrecedents]);

  const selectedPrecedents = useMemo(() => {
    return availablePrecedents.filter((p) => selectedIds.has(p.id));
  }, [availablePrecedents, selectedIds]);

  const exportOptions: BibliographyExportOptions = {
    query: currentQuery || 'Legal Citation & Statutory Search',
    advocateName: advocateName.trim() || undefined,
    caseReference: caseReference.trim() || undefined,
  };

  const markdownContent = useMemo(() => {
    return generateCassationBibliographyMarkdown(selectedPrecedents, currentLang, exportOptions);
  }, [selectedPrecedents, currentLang, advocateName, caseReference, currentQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === availablePrecedents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availablePrecedents.map((p) => p.id)));
    }
  };

  const togglePrecedent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const filename = `Cassation_Precedents_Bibliography_${(currentQuery || 'export').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15)}.md`;
    downloadMarkdownBibliography(markdownContent, filename);
    setDownloadSuccess('md');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadPDF = () => {
    generateCassationBibliographyPDF(selectedPrecedents, currentLang, exportOptions);
    setDownloadSuccess('pdf');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-950 p-5 md:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Export Bibliography
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedPrecedents.length} / {availablePrecedents.length} Selected
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-slate-100 font-serif-legal">
                {isOm
                  ? 'Wabii Murtiiwwan Ijibbaataa Export (PDF & Markdown)'
                  : isAm
                  ? 'የሰበር ውሳኔዎች ማጣቀሻ ቢብሊዮግራፊ ኤክስፖርት'
                  : 'Supreme Court Cassation Bibliography Export'}
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

        {/* Modal Toolbar & Inputs */}
        <div className="p-4 md:p-5 bg-slate-900/90 border-b border-slate-800 space-y-4 shrink-0">
          {/* Metadata Form Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {isOm ? 'Maqaa Abukaatoo / Qorataa (Optional):' : isAm ? 'የሕግ ባለሙያ ስም፡' : 'Advocate / Author Name:'}
              </label>
              <input
                type="text"
                value={advocateName}
                onChange={(e) => setAdvocateName(e.target.value)}
                placeholder={isOm ? 'Fkn: Abukaatoo Fiqaaduu Tolaa' : 'E.g., Advocate Alemu Tadesse'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {isOm ? 'Lakk. Galmee / Dhimma Falmii (Optional):' : isAm ? 'የመዝገብ ቁጥር፡' : 'Case / File Reference:'}
              </label>
              <input
                type="text"
                value={caseReference}
                onChange={(e) => setCaseReference(e.target.value)}
                placeholder={isOm ? 'Fkn: Galmee Lakk. 88492/2017' : 'E.g., File Ref No. 94821/2026'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* View Tab Switcher */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isOm ? 'Muldhiinsa (Preview)' : isAm ? 'ቅድመ እይታ' : 'Visual Preview'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('markdown')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'markdown'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Markdown Code</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('select')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'select'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{isOm ? 'Filadhu' : 'Select Precedents'} ({selectedIds.size})</span>
              </button>
            </div>

            {/* Direct Export Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={selectedPrecedents.length === 0}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMarkdown}
                disabled={selectedPrecedents.length === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>.MD File</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {downloadSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>
                  {downloadSuccess === 'pdf'
                    ? (isOm ? 'Sanadni PDF milkaa\'inaan bu\'eera!' : 'PDF Bibliography successfully generated & saved!')
                    : (isOm ? 'Barruun Markdown milkaa\'inaan bu\'eera!' : 'Markdown file successfully downloaded!')}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'select' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">
                  {isOm
                    ? 'Murtiiwwan Ijibbaataa sanada wabiidhaa keessatti hammachiisuu barbaaddan filadhaa:'
                    : 'Select Supreme Court Cassation Precedents to include in the bibliography:'}
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                >
                  {selectedIds.size === availablePrecedents.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{isOm ? 'Hunda Haqi' : 'Deselect All'}</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>{isOm ? 'Hunda Filadhu' : 'Select All'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availablePrecedents.map((p) => {
                  const isChecked = selectedIds.has(p.id);
                  const titleStr = p.parties ? (p.parties[currentLang] || p.parties.en) : `File ${p.fileNumber}`;
                  const ratioStr = p.bindingPrinciple ? (p.bindingPrinciple[currentLang] || p.bindingPrinciple.en) : '';

                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePrecedent(p.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-amber-950/20 border-amber-500/40 text-slate-100'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="mt-0.5 text-amber-400 shrink-0">
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1 text-xs min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold font-mono text-amber-300">
                            Galmee {p.fileNumber} {p.volume ? `(Jildii ${p.volume})` : ''}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{p.yearEC ? `${p.yearEC} E.C.` : ''}</span>
                        </div>
                        <p className="font-medium truncate text-slate-200">{titleStr}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{ratioStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 max-h-[50vh] overflow-y-auto">
                {/* Simulated Document Paper */}
                <div className="border-b border-slate-800 pb-4 space-y-2">
                  <div className="text-amber-400 text-xs font-mono font-bold tracking-wider uppercase">
                    ⚖️ {isOm ? 'Ibsa Sanada Wabii' : 'Official Bibliography Document'}
                  </div>
                  <h3 className="text-base font-bold text-slate-100">
                    {isOm
                      ? 'WABII MURTIIWWAN IJIBBAATAA MANA MURTII WALIIGALAA'
                      : 'SUPREME COURT CASSATION PRECEDENTS BIBLIOGRAPHY'}
                  </h3>
                  <div className="text-xs text-slate-400 space-y-1 font-mono">
                    {advocateName && <div>• Advocate/Author: {advocateName}</div>}
                    {caseReference && <div>• Case Ref: {caseReference}</div>}
                    <div>• Total Citations Included: {selectedPrecedents.length}</div>
                  </div>
                </div>

                <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                  {selectedPrecedents.map((item, idx) => {
                    const principle = item.bindingPrinciple ? (item.bindingPrinciple[currentLang] || item.bindingPrinciple.en) : '';
                    const issue = item.legalIssue ? (item.legalIssue[currentLang] || item.legalIssue.en) : '';
                    const statutory = item.statutoryProvisions ? item.statutoryProvisions.join(', ') : '';

                    return (
                      <div key={item.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-amber-300 font-mono">
                          {idx + 1}. Lakk. Galmee {item.fileNumber} {item.volume ? `(Jildii ${item.volume})` : ''} - {item.yearEC ? `${item.yearEC} A.L.I` : ''}
                        </div>
                        {item.parties && (
                          <div className="text-slate-200 font-medium">
                            {item.parties[currentLang] || item.parties.en}
                          </div>
                        )}
                        {issue && (
                          <div className="text-slate-400 italic">
                            <span className="font-semibold text-slate-300">Issue: </span>{issue}
                          </div>
                        )}
                        {principle && (
                          <div className="text-slate-300">
                            <span className="font-semibold text-amber-400">Ratio Decidendi: </span>{principle}
                          </div>
                        )}
                        {statutory && (
                          <div className="text-[11px] font-mono text-slate-400">
                            <span className="font-semibold">Articles: </span>{statutory}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'markdown' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Markdown Source (Formatted for Legal Briefs & GitHub)
                </span>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied Markdown!' : 'Copy Markdown'}</span>
                </button>
              </div>

              <textarea
                readOnly
                value={markdownContent}
                rows={12}
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 font-mono text-xs focus:outline-none leading-relaxed resize-none"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 md:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Gavel className="w-4 h-4 text-amber-400" />
            <span>
              {isOm ? 'Kuusaa Murtii Ijibbaataa SeeraAI' : 'SeeraAI Supreme Court Cassation Archive'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied' : 'Copy Markdown'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={selectedPrecedents.length === 0}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Download className="w-4 h-4" />
              <span>{isOm ? 'PDF Buufadhu' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
