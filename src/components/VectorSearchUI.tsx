/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Layers, RefreshCw, BookOpen, FileText, Check, Copy } from 'lucide-react';
import { searchLegalDocuments } from '../services/ragService';
import { FeedbackButton } from './FeedbackButton';
import { cleanRagChunk, formatRagResultsToEssay } from '../utils/legalProseFormatter';

export const VectorSearchUI: React.FC = () => {
  const [useRAG, setUseRAG] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'essay' | 'chunks'>('essay');
  const [copiedEssay, setCopiedEssay] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const searchResults = await searchLegalDocuments(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate clean, fluent legal essay summary from retrieved RAG documents
  const synthesizedEssay = useMemo(() => {
    if (!results || results.length === 0) return '';
    return formatRagResultsToEssay(results);
  }, [results]);

  const handleCopyEssay = async () => {
    if (!synthesizedEssay) return;
    try {
      await navigator.clipboard.writeText(synthesizedEssay);
      setCopiedEssay(true);
      setTimeout(() => setCopiedEssay(false), 2000);
    } catch (e) {
      console.error('Failed to copy synthesized essay', e);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-serif-legal">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>RAG-Grounded Statutory Search</span>
        </h3>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useRAG}
            onChange={() => setUseRAG(!useRAG)}
            className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
          />
          <span className="font-medium text-[11px] text-amber-300">
            {useRAG ? 'RAG Grounded Active' : 'Standard Search'}
          </span>
        </label>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          placeholder="Barbaadi tumaalee fi murteewwan seeraa (e.g. SDFHH kwt 6, Labsii 1156/2019)..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Barbaadi</span>
        </button>
      </div>

      {useRAG && results.length > 0 && (
        <div className="space-y-3 mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('essay')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'essay'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Legal Essay / Summary</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chunks')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'chunks'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Statutory Chunks ({results.length})</span>
              </button>
            </div>

            {viewMode === 'essay' && synthesizedEssay && (
              <button
                type="button"
                onClick={handleCopyEssay}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 text-amber-400 hover:text-amber-300 bg-slate-950 border border-slate-800 hover:border-amber-500/40 cursor-pointer"
                title="Waraabi (Copy Essay)"
              >
                {copiedEssay ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEssay ? 'Waraabameera' : 'Copy Essay'}</span>
              </button>
            )}
          </div>

          {viewMode === 'essay' ? (
            <div className="p-4 bg-slate-950/80 rounded-xl border border-amber-500/30 text-xs text-slate-200 leading-relaxed space-y-2 select-text font-serif-legal">
              <div className="flex items-center gap-2 text-amber-400 text-[11px] font-bold border-b border-slate-800/80 pb-2">
                <span>⚖️</span>
                <span>Synthesized Statutory Essay (Prose Narrative)</span>
              </div>
              <div className="whitespace-pre-wrap text-slate-300 text-xs leading-relaxed pt-1">
                {synthesizedEssay}
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {results.map((res, i) => {
                const cleanedText = cleanRagChunk(res.text);
                return (
                  <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                    <p className="text-slate-200 leading-relaxed">{cleanedText}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-850">
                      <span>{res.metadata?.fileName || 'SDFHH / Authentic Proclamation'}</span>
                      <FeedbackButton query={query} responseText={cleanedText} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
