import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import {
  detectIncompleteCitations,
  refineCitationWithAI,
  applyCitationRefinement,
  IncompleteCitationMatch,
  RefinedCitationResult,
} from '../services/aiCitationRefiner';

interface AICitationRefinementWidgetProps {
  documentText: string;
  currentLang: Language;
  onApplyRefinements: (newText: string) => void;
  className?: string;
}

export const AICitationRefinementWidget: React.FC<AICitationRefinementWidgetProps> = ({
  documentText,
  currentLang,
  onApplyRefinements,
  className = '',
}) => {
  const [detectedCitations, setDetectedCitations] = useState<IncompleteCitationMatch[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [suggestions, setSuggestions] = useState<RefinedCitationResult[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Re-detect incomplete citations whenever document text changes
  useEffect(() => {
    const matches = detectIncompleteCitations(documentText);
    setDetectedCitations(matches);
    if (matches.length === 0) {
      setSuggestions([]);
      setIsExpanded(false);
    }
  }, [documentText]);

  const handleTriggerRefinement = async () => {
    setIsRefining(true);
    setIsExpanded(true);
    try {
      const results = await refineCitationWithAI({
        fullText: documentText,
        language: currentLang,
      });
      setSuggestions(results);
    } catch {
      // Handled in service fallback
    } finally {
      setIsRefining(false);
    }
  };

  const handleApplySingle = (item: RefinedCitationResult) => {
    const updated = applyCitationRefinement(documentText, item.originalPlaceholder, item.exactReplacement);
    onApplyRefinements(updated);
    setSuggestions((prev) => prev.filter((s) => s.originalPlaceholder !== item.originalPlaceholder));
    setAppliedCount((c) => c + 1);
    setToastMessage(
      currentLang === 'om'
        ? `Wabiin seeraa '${item.exactReplacement}' milkaa'inaan bakka bu'eera!`
        : currentLang === 'am'
        ? `የሕግ ጥቅሱ ወደ '${item.exactReplacement}' ተቀይሯል!`
        : `Citation successfully refined to '${item.exactReplacement}'!`
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApplyAll = () => {
    let currentText = documentText;
    suggestions.forEach((item) => {
      currentText = applyCitationRefinement(currentText, item.originalPlaceholder, item.exactReplacement);
    });
    onApplyRefinements(currentText);
    const count = suggestions.length;
    setSuggestions([]);
    setIsExpanded(false);
    setAppliedCount((c) => c + count);
    setToastMessage(
      currentLang === 'om'
        ? `Wabiileen seeraa ${count} hundi qixa sirriitiin guutamaniiru!`
        : currentLang === 'am'
        ? `ሁሉም ${count} የሕግ ጥቅሶች በትክክል ተሞልተዋል!`
        : `All ${count} incomplete citations were successfully refined!`
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (detectedCitations.length === 0 && !toastMessage) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-emerald-100 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Refinement Alert Bar */}
      {detectedCitations.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-slate-900/95 p-3.5 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-base shrink-0">
                ⚡
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100 font-serif-legal">
                    {currentLang === 'om'
                      ? 'Qulqulleessituu Wabiilee Seeraa AI (AI Citation Refiner)'
                      : currentLang === 'am'
                      ? 'የሕግ ጥቅሶች AI ማስተካከያ (AI Citation Refiner)'
                      : 'AI Legal Citation Refiner & Completion Engine'}
                  </span>
                  <span className="text-[11px] font-mono text-amber-300 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                    {detectedCitations.length}{' '}
                    {currentLang === 'om' ? 'hin guutamne' : currentLang === 'am' ? 'ያልተሟሉ' : 'incomplete'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {currentLang === 'om'
                    ? `Sanada kee keessatti wabiileen akka '${detectedCitations[0]?.original}' argamaniiru. AI'n qabiyyee sanadichaa qoratee keeyyata sirrii siif guuta.`
                    : currentLang === 'am'
                    ? `በሰነድዎ ውስጥ እንደ '${detectedCitations[0]?.original}' ያሉ ያልተሟሉ ጥቅሶች ተገኝተዋል። AI የሰነዱን ይዘት በመመርመር ትክክለኛውን አንቀጽ ይሞላልዎታል።`
                    : `Incomplete citations detected (e.g. '${detectedCitations[0]?.original}'). Gemini AI can analyze context to suggest verified article numbers.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {!isExpanded ? (
                <button
                  type="button"
                  onClick={handleTriggerRefinement}
                  disabled={isRefining}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  <span>{isRefining ? '⏳' : '🤖'}</span>
                  <span>
                    {isRefining
                      ? currentLang === 'om'
                        ? 'Qorachaa jira...'
                        : currentLang === 'am'
                        ? 'በመተንተን ላይ...'
                        : 'Analyzing...'
                      : currentLang === 'om'
                      ? 'AI\'n Guuti (Refine with AI)'
                      : currentLang === 'am'
                      ? 'በAI ሙላ (Refine)'
                      : 'Refine with AI'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  ✕ {currentLang === 'om' ? 'Cufi' : currentLang === 'am' ? 'ዝጋ' : 'Collapse'}
                </button>
              )}
            </div>
          </div>

          {/* Expanded Suggestions List */}
          {isExpanded && (
            <div className="pt-2 border-t border-slate-800 space-y-3">
              {isRefining ? (
                <div className="p-4 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
                  <span className="animate-spin text-base">⚙️</span>
                  <span>
                    {currentLang === 'om'
                      ? 'Gemini AI qabiyyee seeraa qorachuun keeyyattoota walsiman barbaadaa jira...'
                      : currentLang === 'am'
                      ? 'Gemini AI የሰነዱን ይዘት በመመርመር ተገቢ የሕግ አንቀጾችን በማዘጋጀት ላይ...'
                      : 'Gemini AI is analyzing document context and statutory authorities...'}
                  </span>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {currentLang === 'om'
                        ? 'Yaada Keeyyattoota AI\'n dhiyeesse:'
                        : currentLang === 'am'
                        ? 'በAI የተገኙ የሕግ አንቀጾች ማስተካከያ፡'
                        : 'AI-Grounded Citation Completions:'}
                    </span>
                    {suggestions.length > 1 && (
                      <button
                        type="button"
                        onClick={handleApplyAll}
                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow"
                      >
                        <span>✓✓</span>
                        <span>
                          {currentLang === 'om'
                            ? 'Hunda Bakka Buusi (Apply All)'
                            : currentLang === 'am'
                            ? 'ሁሉንም ተግብር (Apply All)'
                            : 'Apply All Suggestions'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {suggestions.map((item, idx) => {
                      const reasoning = item.legalReasoning[currentLang] || item.legalReasoning.om;
                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="line-through text-rose-400 font-mono text-[11px] bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-800/40">
                                {item.originalPlaceholder}
                              </span>
                              <span className="text-slate-500">➔</span>
                              <span className="text-emerald-300 font-bold font-mono text-[11px] bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/40">
                                {item.exactReplacement}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleApplySingle(item)}
                              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            >
                              <span>✓</span>
                              <span>{currentLang === 'om' ? 'Bakka Buusi' : currentLang === 'am' ? 'ተግብር' : 'Apply'}</span>
                            </button>
                          </div>

                          <div className="text-slate-300 text-[11px] leading-relaxed">
                            <span className="font-semibold text-amber-400">
                              {item.suggestedCitation}
                            </span>
                            <p className="mt-1 text-slate-400">{reasoning}</p>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900 font-mono">
                            <span>📜 {item.officialSource}</span>
                            <span className="text-emerald-400">Confidence: {Math.round(item.confidence * 100)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 text-xs text-slate-400 text-center">
                  {currentLang === 'om'
                    ? 'Wabiileen hundi guutuu dha!'
                    : currentLang === 'am'
                    ? 'ሁሉም ጥቅሶች የተሟሉ ናቸው!'
                    : 'All citations in this document are complete and verified.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
