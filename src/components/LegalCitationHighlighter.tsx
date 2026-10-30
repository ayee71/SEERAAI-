import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from '../data/cassationPrecedents';
import { scanProclamationsInText, fetchProclamationSummaryAsync, ProclamationSummary } from '../services/proclamationScanner';
import { lookupOfficialLegalSource, showCitationTooltip, hideGlobalTooltip } from '../services/legalCitationTooltipScanner';
import { resolveLegalArticleCitation } from '../services/legalArticleResolver';

interface LegalCitationHighlighterProps {
  text: string;
  currentLang: Language;
  onNavigateToCassation?: (query: string) => void;
  searchTerm?: string;
}

interface CitationMatch {
  raw: string;
  type: 'cassation' | 'statute';
  identifier: string; // fileNumber or statute name
  precedent?: CassationPrecedent;
  statuteTitle?: string;
  proclamationSummary?: ProclamationSummary;
  index: number;
  length: number;
}

export function navigateToCassationLibrary(query: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('seera:navigate', {
        detail: { tab: 'cassation', query },
      })
    );
  }
}

export const LegalCitationHighlighter: React.FC<LegalCitationHighlighterProps> = ({
  text,
  currentLang,
  onNavigateToCassation,
  searchTerm = '',
}) => {
  const [activeTooltip, setActiveTooltip] = useState<{
    match: CitationMatch;
    coords: { top: number; left: number };
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderWithSearchHighlight = (plainText: string): React.ReactNode => {
    if (!searchTerm || !searchTerm.trim()) return plainText;
    const query = searchTerm.trim();
    const parts = plainText.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow-sm">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Close tooltip on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveTooltip(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTooltip(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenCassation = (query: string) => {
    setActiveTooltip(null);
    if (onNavigateToCassation) {
      onNavigateToCassation(query);
    } else {
      navigateToCassationLibrary(query);
    }
  };

  const handleCopyCitation = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Find all citations in text
  const findCitations = (content: string): CitationMatch[] => {
    const matches: CitationMatch[] = [];

    // 1. Direct Cassation Precedents by File Number
    for (const p of CASSATION_PRECEDENTS_DATA) {
      // Look for prefixes or the file number itself
      const fileRegex = new RegExp(
        `(?:Lakk(?:\\.|\\s+Galmee|\\s+)|Galmee(?:\\s+Lakk\\.|\\s+)|መዝገብ\\s*ቁጥር|በመዝገብ\\s*ቁጥር|መ[./]ቁ|Cassation(?:\\s+File|\\s+No\\.|\\s+Division)?|File\\s*No\\.?\\s*)?\\b(${p.fileNumber})\\b`,
        'gi'
      );

      let match: RegExpExecArray | null;
      while ((match = fileRegex.exec(content)) !== null) {
        matches.push({
          raw: match[0],
          type: 'cassation',
          identifier: p.fileNumber,
          precedent: p,
          index: match.index,
          length: match[0].length,
        });
      }
    }

    // 2. Generic Cassation File pattern (e.g. Lakk. Galmee 123456 or መዝገብ ቁጥር 123456)
    const genericCassationRegex = /(?:Lakk(?:\.|\s+Galmee|\s+)|Galmee(?:\s+Lakk\.|\s+)|መዝገብ\s*ቁጥር|በመዝገብ\s*ቁጥር|መ[./]ቁ|Cassation\s+File\s+No\.?|File\s*No\.?)\s*:?\s*(\d{5,6})\b/gi;
    let genericMatch: RegExpExecArray | null;
    while ((genericMatch = genericCassationRegex.exec(content)) !== null) {
      const fileNum = genericMatch[1];
      // Check if not already added
      const exists = matches.some((m) => m.index === genericMatch!.index);
      if (!exists) {
        const foundPrecedent = CASSATION_PRECEDENTS_DATA.find((p) => p.fileNumber === fileNum);
        matches.push({
          raw: genericMatch[0],
          type: 'cassation',
          identifier: fileNum,
          precedent: foundPrecedent,
          index: genericMatch.index,
          length: genericMatch[0].length,
        });
      }
    }

    // 3. Statutory Proclamation & Article citations
    const statutePatterns: { regex: RegExp; statuteName: string }[] = [
      {
        regex: /(?:Civil\s+Code|Koodii\s+Siivilii|ፍትሐብሔር\s*ሕግ)\s*(?:Arts?\.?|Articles?|Keeyyata|ቁጥር|አንቀጽ)\s*(\d+)/gi,
        statuteName: 'Civil Code',
      },
      {
        regex: /(?:Labor\s+Proclamation|Labsii\s+Hojjetaa|የአሰሪና\s*ሰራተኛ\s*አዋጅ)(?:\s*(?:No\.?|Lakk\.?|ቁጥር))?\s*(?:1156\/(?:2019|2011))?(?:\s*(?:Arts?\.?|Keeyyata|አንቀጽ)\s*(\d+))?/gi,
        statuteName: 'Labor Proclamation 1156/2019',
      },
      {
        regex: /(?:FDRE\s+Constitution|Heera\s+Mootummaa|ሕገ-?\s*መንግሥት)\s*(?:Arts?\.?|Keeyyata|አንቀጽ)\s*(\d+)/gi,
        statuteName: 'FDRE Constitution',
      },
      {
        regex: /(?:Civil\s+Procedure\s+Code|SDFHH|Deemsa\s+Falmii\s+Siivilii|የፍትሐብሔር\s*ስነ-?ስርዓት\s*ሕግ)\s*(?:Arts?\.?|Keeyyata|Let|kew|አንቀጽ)\s*(\d+)/gi,
        statuteName: 'Civil Procedure Code',
      },
      {
        regex: /(?:Proclamation\s+No\.?|Labsii\s+Lakk\.?|አዋጅ\s*ቁጥር)\s*(\d+\/\d{4})/gi,
        statuteName: 'Proclamation',
      },
    ];

    for (const { regex, statuteName } of statutePatterns) {
      let statMatch: RegExpExecArray | null;
      while ((statMatch = regex.exec(content)) !== null) {
        const exists = matches.some(
          (m) =>
            (statMatch!.index >= m.index && statMatch!.index < m.index + m.length) ||
            (statMatch!.index + statMatch![0].length > m.index && statMatch!.index + statMatch![0].length <= m.index + m.length)
        );
        if (!exists) {
          const relatedPrecedent = CASSATION_PRECEDENTS_DATA.find((p) =>
            p.statutoryProvisions.some((prov) =>
              prov.toLowerCase().includes(statuteName.toLowerCase()) ||
              (statMatch![1] && prov.includes(statMatch![1]))
            )
          );

          matches.push({
            raw: statMatch[0],
            type: 'statute',
            identifier: statMatch[0],
            statuteTitle: statuteName + (statMatch[1] ? ` Art. ${statMatch[1]}` : ''),
            precedent: relatedPrecedent,
            index: statMatch.index,
            length: statMatch[0].length,
          });
        }
      }
    }

    // 4. Scan using proclamationScanner utility service
    const procScans = scanProclamationsInText(content);
    for (const proc of procScans) {
      const exists = matches.some(
        (m) =>
          (proc.index >= m.index && proc.index < m.index + m.length) ||
          (proc.index + proc.length > m.index && proc.index + proc.length <= m.index + m.length)
      );
      if (!exists) {
        matches.push({
          raw: proc.raw,
          type: 'statute',
          identifier: proc.proclamationNumber,
          statuteTitle: proc.summaryData?.title[currentLang] || proc.raw,
          proclamationSummary: proc.summaryData,
          index: proc.index,
          length: proc.length,
        });
      }
    }

    // Sort by index ascending
    matches.sort((a, b) => a.index - b.index);

    // Filter out overlapping matches
    const filtered: CitationMatch[] = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.index >= lastEnd) {
        filtered.push(m);
        lastEnd = m.index + m.length;
      }
    }

    return filtered;
  };

  const renderCitationsAndSearch = (plainText: string): React.ReactNode => {
    const citations = findCitations(plainText);
    if (citations.length === 0) {
      return renderWithSearchHighlight(plainText);
    }

    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    citations.forEach((citation, idx) => {
      if (citation.index > currentIndex) {
        elements.push(
          <span key={`text-${currentIndex}`}>
            {renderWithSearchHighlight(plainText.substring(currentIndex, citation.index))}
          </span>
        );
      }

      const isMatchingPrecedent = Boolean(citation.precedent);

      elements.push(
        <span
          key={`cit-${citation.index}-${idx}`}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setActiveTooltip({
              match: citation,
              coords: {
                top: rect.bottom + window.scrollY + 6,
                left: Math.max(16, Math.min(window.innerWidth - 340, rect.left + window.scrollX - 20)),
              },
            });
          }}
          className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all border-b border-dashed font-medium text-xs sm:text-sm ${
            isMatchingPrecedent
              ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400 text-amber-200 hover:text-amber-100 shadow-xs'
              : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-500 text-slate-200'
          }`}
          title="Ilaaluuf cuqaasaa (Click to inspect legal precedent citation)"
        >
          <span>⚖️</span>
          <span>{citation.raw}</span>
        </span>
      );

      currentIndex = citation.index + citation.length;
    });

    if (currentIndex < plainText.length) {
      elements.push(
        <span key={`text-end-${currentIndex}`}>
          {renderWithSearchHighlight(plainText.substring(currentIndex))}
        </span>
      );
    }

    return <span className="whitespace-pre-wrap">{elements}</span>;
  };

  const renderTextSegmentWithTables = (segmentText: string, keyPrefix: string): React.ReactNode => {
    const lines = segmentText.split('\n');
    const hasTable = lines.some((l) => l.trim().startsWith('|') && l.includes('|'));
    if (!hasTable) {
      return (
        <div key={keyPrefix} className="leading-relaxed">
          {renderCitationsAndSearch(segmentText)}
        </div>
      );
    }

    const nodes: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const flushTable = (buf: string[], idx: number) => {
      if (buf.length === 0) return;
      const tableRows = buf
        .map((l) => l.trim())
        .filter((l) => l.startsWith('|') && l.endsWith('|'))
        .map((l) =>
          l
            .slice(1, -1)
            .split('|')
            .map((cell) => cell.trim())
        );

      if (tableRows.length === 0) {
        nodes.push(<div key={`table-fallback-${idx}`}>{renderCitationsAndSearch(buf.join('\n'))}</div>);
        return;
      }

      const headers = tableRows[0];
      const hasSeparator = tableRows.length > 1 && tableRows[1].every((c) => /^[:-]+$/.test(c));
      const bodyRows = hasSeparator ? tableRows.slice(2) : tableRows.slice(1);

      nodes.push(
        <div key={`md-table-${idx}`} className="my-4 overflow-x-auto rounded-2xl border border-slate-700/80 shadow-lg bg-slate-900/95">
          <table className="w-full text-left border-collapse text-xs sm:text-sm text-slate-200">
            {headers && headers.length > 0 && (
              <thead className="bg-slate-800 text-amber-300 uppercase font-mono text-[11px] tracking-wider border-b border-slate-700">
                <tr>
                  {headers.map((h, hi) => (
                    <th key={`th-${hi}`} className="px-4 py-3 font-bold border-r border-slate-700/50 last:border-r-0">
                      {renderCitationsAndSearch(h)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-800">
              {bodyRows.map((row, ri) => (
                <tr key={`tr-${ri}`} className="hover:bg-slate-800/40 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={`td-${ri}-${ci}`} className="px-4 py-2.5 border-r border-slate-800/80 last:border-r-0 text-slate-300">
                      {renderCitationsAndSearch(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    let textBuffer: string[] = [];
    lines.forEach((line, li) => {
      if (line.trim().startsWith('|') && line.includes('|')) {
        if (textBuffer.length > 0) {
          nodes.push(
            <div key={`${keyPrefix}-text-${li}`} className="leading-relaxed my-1">
              {renderCitationsAndSearch(textBuffer.join('\n'))}
            </div>
          );
          textBuffer = [];
        }
        tableBuffer.push(line);
      } else {
        if (tableBuffer.length > 0) {
          flushTable(tableBuffer, li);
          tableBuffer = [];
        }
        textBuffer.push(line);
      }
    });

    if (tableBuffer.length > 0) {
      flushTable(tableBuffer, 999);
    }
    if (textBuffer.length > 0) {
      nodes.push(
        <div key={`${keyPrefix}-text-end`} className="leading-relaxed my-1">
          {renderCitationsAndSearch(textBuffer.join('\n'))}
        </div>
      );
    }

    return <div key={keyPrefix} className="space-y-2">{nodes}</div>;
  };

  return (
    <div ref={containerRef} className="relative block">
      {renderTextSegmentWithTables(text, 'main-content')}

      {/* Floating Interactive Tooltip / Popover */}
      {activeTooltip && (
        <div
          style={{
            position: 'absolute',
            top: activeTooltip.coords.top,
            left: activeTooltip.coords.left,
            zIndex: 9999,
          }}
          className="w-80 sm:w-96 p-4 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150 text-slate-100 backdrop-blur-md"
        >
          {/* Tooltip Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                ⚖️
              </span>
              <div>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                  {activeTooltip.match.type === 'cassation'
                    ? 'Murtii Dhaddacha Ijoo (Cassation Precedent)'
                    : 'Qajeeltoo & Keeyyata Seeraa (Statutory Provision)'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {activeTooltip.match.precedent
                    ? `Lakk. Galmee ${activeTooltip.match.precedent.fileNumber} (Vol. ${activeTooltip.match.precedent.volume})`
                    : activeTooltip.match.identifier}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTooltip(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span>✕</span>
            </button>
          </div>

          {/* Tooltip Content Details */}
          {activeTooltip.match.precedent ? (
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-semibold">Qaamolee (Parties):</span>
                <span className="text-slate-200 font-medium">
                  {activeTooltip.match.precedent.parties[currentLang] || activeTooltip.match.precedent.parties.om}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] text-amber-400 block font-bold uppercase">
                  Qajeeltoo Seeraa Dirqisiisaa (Binding Ratio):
                </span>
                <p className="text-slate-300 line-clamp-3 leading-relaxed mt-0.5">
                  {activeTooltip.match.precedent.bindingPrinciple[currentLang] ||
                    activeTooltip.match.precedent.bindingPrinciple.om}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Bara: {activeTooltip.match.precedent.yearEC} B.A. ({activeTooltip.match.precedent.yearGC} G.C.)</span>
                <span className="text-amber-400 uppercase font-mono">{activeTooltip.match.precedent.category}</span>
              </div>
            </div>
          ) : activeTooltip.match.proclamationSummary ? (
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-xs font-bold text-amber-300 block">
                  {activeTooltip.match.proclamationSummary.title[currentLang] || activeTooltip.match.proclamationSummary.title.om}
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {activeTooltip.match.proclamationSummary.summary[currentLang] || activeTooltip.match.proclamationSummary.summary.om}
                </p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Bara Bahe: {activeTooltip.match.proclamationSummary.yearEnacted}</span>
                <span className="text-emerald-400 font-mono">Verified Ethiopian Law</span>
              </div>
            </div>
          ) : (() => {
              const resolved = resolveLegalArticleCitation(activeTooltip.match.raw);
              if (resolved) {
                return (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                      <span className="text-xs font-bold text-amber-300 block">
                        {resolved.title[currentLang] || resolved.title.om}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {resolved.lawSource[currentLang] || resolved.lawSource.om}
                      </span>
                      <p className="text-slate-200 leading-relaxed text-[11px] pt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {resolved.fullText[currentLang] || resolved.fullText.om}
                      </p>
                      {resolved.keyRules && resolved.keyRules.length > 0 && (
                        <div className="pt-1 border-t border-slate-800/80">
                          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                            Qajeelfamoota Hojiirra Oolmaa:
                          </span>
                          <ul className="space-y-1">
                            {resolved.keyRules.slice(0, 3).map((rule, ri) => (
                              <li key={ri} className="text-[10px] text-slate-300 flex items-start gap-1">
                                <span className="text-amber-400 font-mono">•</span>
                                <span className="line-clamp-2">{rule}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                  <span className="text-amber-300 font-semibold block">
                    {activeTooltip.match.statuteTitle || activeTooltip.match.identifier}
                  </span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Keeyyata seeraa kana Dhaddacha Murteewwan Ijoo keessatti barbaaduun murteewwan dirqisiisoo kanaan walqabatan argachuu dandeessu.
                  </p>
                </div>
              );
            })()}

          {/* Action Row */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                handleCopyCitation(
                  activeTooltip.match.precedent
                    ? `Murtii Dhaddacha Ijoo Lakk. Galmee ${activeTooltip.match.precedent.fileNumber} (Jildii ${activeTooltip.match.precedent.volume})`
                    : activeTooltip.match.identifier
                )
              }
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Koppifame!' : 'Wabiilee Koppisi'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleOpenCassation(
                  activeTooltip.match.precedent
                    ? activeTooltip.match.precedent.fileNumber
                    : activeTooltip.match.identifier
                )
              }
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <span>🔗</span>
              <span>Dhaddacha Ijoo Keessatti Bani</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
