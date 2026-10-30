import React, { useState, useEffect, useMemo } from 'react';
import { Language, translations } from '../i18n/translations';
import {
  auditLegalLogic,
  applyProceduralRemedy,
  LegalLogicAuditReport,
  ProceduralWarning,
} from '../services/legalLogicAuditor';
import { auditDocumentLegalLogic } from '../services/api';

interface LegalLogicAuditorPanelProps {
  documentText: string;
  onUpdateText: (newText: string) => void;
  currentLang: Language;
  onClose?: () => void;
  className?: string;
}

export const LegalLogicAuditorPanel: React.FC<LegalLogicAuditorPanelProps> = ({
  documentText,
  onUpdateText,
  currentLang,
  onClose,
  className = '',
}) => {
  const t = translations[currentLang];

  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [expandedWarningId, setExpandedWarningId] = useState<string | null>(null);
  const [fixedWarningIds, setFixedWarningIds] = useState<Set<string>>(new Set());
  const [isAiAuditing, setIsAiAuditing] = useState(false);
  const [aiReport, setAiReport] = useState<LegalLogicAuditReport | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Heuristic/Rule-based audit calculated in real-time
  const staticReport = useMemo(() => {
    return auditLegalLogic(documentText, currentLang);
  }, [documentText, currentLang]);

  const activeReport = aiReport || staticReport;

  // Auto-expand first critical warning
  useEffect(() => {
    if (activeReport.warnings.length > 0 && !expandedWarningId) {
      setExpandedWarningId(activeReport.warnings[0].id);
    }
  }, [activeReport.warnings, expandedWarningId]);

  // Handle One-Click Statutory Fix Injection
  const handleApplyFix = (warning: ProceduralWarning) => {
    const updated = applyProceduralRemedy(documentText, warning, currentLang);
    onUpdateText(updated);
    setFixedWarningIds((prev) => new Set(prev).add(warning.id));

    const msg =
      currentLang === 'om'
        ? `✅ Ulaagaan seeraa '${warning.title.om}' galmee keessatti dabalamera!`
        : currentLang === 'am'
        ? `✅ የሕግ መስፈርቱ '${warning.title.am}' ወደ ሰነዱ ተካቷል!`
        : `✅ Statutory requirement '${warning.title.en}' injected successfully!`;

    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Run Deep AI Audit using Gemini Model
  const handleRunAiAudit = async () => {
    if (!documentText.trim()) return;
    setIsAiAuditing(true);
    setAiError(null);
    try {
      const response = await auditDocumentLegalLogic(documentText, currentLang);
      if (response && response.auditReport) {
        setAiReport(response.auditReport);
        setToastMessage(
          currentLang === 'om'
            ? '🤖 Odiitiin Seeraa Gemini AI milkaa\'inaan xumurameera!'
            : currentLang === 'am'
            ? '🤖 የGemini AI የሕግ ኦዲት በተሳካ ሁኔታ ተጠናቋል!'
            : '🤖 Gemini AI Legal Logic audit completed successfully!'
        );
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err: any) {
      console.error('Deep AI audit error:', err);
      setAiError(
        currentLang === 'om'
          ? 'Odiitii AI gaggeessuu hin dandeenye. Odiitii heeraa idilee fayyadamaa.'
          : currentLang === 'am'
          ? 'የAI ኦዲት ማከናወን አልተቻለም። መደበኛውን የሥነ-ሥርዓት ኦዲት ይጠቀሙ።'
          : 'Could not complete AI audit. Falling back to statutory rule audit.'
      );
    } finally {
      setIsAiAuditing(false);
    }
  };

  const filteredWarnings = activeReport.warnings.filter((w) => {
    if (activeFilter === 'critical') return w.severity === 'critical';
    if (activeFilter === 'warning') return w.severity === 'warning';
    return true;
  });

  // Score color helper
  const getScoreBadge = (score: number) => {
    if (score >= 90) {
      return {
        label: currentLang === 'om' ? 'Qulqullina Olaanaa (Court-Ready)' : currentLang === 'am' ? 'ፍጹም ዝግጁ (Court-Ready)' : 'Court-Ready',
        bgColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
        emoji: '⚖️',
      };
    }
    if (score >= 60) {
      return {
        label: currentLang === 'om' ? 'Sirreeffama Xiqqa Barbaada' : currentLang === 'am' ? 'ትንሽ ማስተካከያ ይፈልጋል' : 'Needs Minor Revision',
        bgColor: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
        emoji: '⚠️',
      };
    }
    return {
      label: currentLang === 'om' ? 'Kufaa Ta\'uuf Carraa Qaba (High Risk)' : currentLang === 'am' ? 'ውድቅ የመሆን ከፍተኛ ስጋት' : 'High Rejection Risk',
      bgColor: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
      emoji: '🚨',
    };
  };

  const badgeInfo = getScoreBadge(activeReport.overallScore);

  return (
    <div className={`bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-2xl ${className}`}>
      {/* Toast notification */}
      {toastMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-900/90 border border-emerald-500 text-emerald-200 text-xs font-medium flex items-center justify-between shadow-lg">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
            ⚖️
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>
                {currentLang === 'om'
                  ? 'Odiitara Loojikii & Ulaagaalee Seeraa'
                  : currentLang === 'am'
                  ? 'የሕግ አሰራር እና ሥነ-ሥርዓት ኦዲተር'
                  : 'AI Legal Logic & Procedural Auditor'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SDFHH / CPC
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Hanqinaalee seera deemsa falmii (SDFHH Kwt 92-105) qoratee akeekkachiisa kenna'
                : currentLang === 'am'
                ? 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ መስፈርቶችንና የፊርማ ክፍተቶችን ይመረምራል'
                : 'Scans pleadings for missing procedural mandates & statutory signature blocks'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunAiAudit}
            disabled={isAiAuditing || !documentText.trim()}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <span>{isAiAuditing ? '⏳' : '⚡'}</span>
            <span>
              {isAiAuditing
                ? currentLang === 'om'
                  ? 'Qoratamaa Jira...'
                  : currentLang === 'am'
                  ? 'በመመርመር ላይ...'
                  : 'Auditing...'
                : currentLang === 'om'
                ? 'AI Gemini Odiiti'
                : currentLang === 'am'
                ? 'በGemini AI መርምር'
                : 'Run AI Deep Audit'}
            </span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {aiError && (
        <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <span>⚠️ {aiError}</span>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="text-rose-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Score & Procedural Standing Banner */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700">
            <span className="text-xl font-black text-white">{activeReport.overallScore}%</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeInfo.bgColor}`}>
                {badgeInfo.emoji} {badgeInfo.label}
              </span>
              <span className="text-[11px] text-slate-400">
                {activeReport.detectedDocumentType}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300 max-w-xl">
              {activeReport.summary[currentLang] || activeReport.summary.om}
            </p>
          </div>
        </div>

        {/* Counts summary */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white border-amber-500/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {currentLang === 'om' ? 'Hunda' : currentLang === 'am' ? 'ሁሉንም' : 'All'} ({activeReport.totalIssuesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeFilter === 'critical'
                ? 'bg-rose-900/60 text-rose-200 border-rose-500'
                : 'bg-slate-900/60 text-rose-400 border-slate-800 hover:text-rose-300'
            }`}
          >
            🔴 {currentLang === 'om' ? 'Cimoo' : currentLang === 'am' ? 'አስገዳጅ' : 'Critical'} ({activeReport.criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('warning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeFilter === 'warning'
                ? 'bg-amber-900/60 text-amber-200 border-amber-500'
                : 'bg-slate-900/60 text-amber-400 border-slate-800 hover:text-amber-300'
            }`}
          >
            ⚠️ {currentLang === 'om' ? 'Akeekkachiisa' : currentLang === 'am' ? 'ማስጠንቀቂያ' : 'Warnings'} ({activeReport.warningCount})
          </button>
        </div>
      </div>

      {/* Warning Cards List */}
      <div className="mt-4 space-y-3">
        {filteredWarnings.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950/40 border border-dashed border-emerald-500/40 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h4 className="text-sm font-bold text-emerald-400">
              {currentLang === 'om'
                ? 'Hanqinni Seera Deemsa Falmii Hin Argamne!'
                : currentLang === 'am'
                ? 'ምንም የሥነ-ሥርዓት ሕግ ክፍተት አልተገኘም!'
                : 'No Procedural Vulnerabilities Detected!'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {currentLang === 'om'
                ? 'Sanadni keessan ulaagaalee mallattoo, kakuu mirkaneessaa, teessoo waamichaa fi aangoo maallaqaa guuteera.'
                : currentLang === 'am'
                ? 'ሰነድዎ የፊርማ፣ የእውነት ማረጋገጫ፣ የመጥሪያ አድራሻ እና የዳኝነት ስልጣን መስፈርቶችን አሟልቷል።'
                : 'Your court document includes necessary verification oaths, signature blocks, summons particulars, and pecuniary jurisdiction declarations.'}
            </p>
          </div>
        ) : (
          filteredWarnings.map((warning) => {
            const isExpanded = expandedWarningId === warning.id;
            const isFixed = fixedWarningIds.has(warning.id);

            return (
              <div
                key={warning.id}
                className={`rounded-xl border transition-all ${
                  warning.severity === 'critical'
                    ? 'bg-slate-950/90 border-rose-500/40'
                    : 'bg-slate-950/80 border-amber-500/30'
                }`}
              >
                {/* Accordion header */}
                <div
                  onClick={() => setExpandedWarningId(isExpanded ? null : warning.id)}
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {warning.severity === 'critical' ? '🔴' : '⚠️'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {warning.title[currentLang] || warning.title.om}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700">
                          {warning.articleCode}
                        </span>
                        {isFixed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            ✓ {currentLang === 'om' ? 'Dabalameera' : currentLang === 'am' ? 'ተስተካክሏል' : 'Applied'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {warning.statutoryReference}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyFix(warning);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <span>🛠️</span>
                      <span>
                        {currentLang === 'om'
                          ? 'Sirreeffama Dabali'
                          : currentLang === 'am'
                          ? 'ማስተካከያ አክል'
                          : 'Apply Fix'}
                      </span>
                    </button>
                    <span className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-3">
                    {/* Explanation */}
                    <div className="text-xs text-slate-300 leading-relaxed">
                      {warning.description[currentLang] || warning.description.om}
                    </div>

                    {/* Rejection Risk Alert */}
                    <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                      <span className="text-base">🚨</span>
                      <div>
                        <strong className="font-bold block text-rose-300">
                          {currentLang === 'om'
                            ? 'Miidhaa & Sababa Kufaa Ta\'uu (Procedural Rejection Risk):'
                            : currentLang === 'am'
                            ? 'የክሱ ውድቅ የመሆን ስጋት (Rejection Risk)፡'
                            : 'Procedural Rejection Risk:'}
                        </strong>
                        <span>{warning.rejectionRisk[currentLang] || warning.rejectionRisk.om}</span>
                      </div>
                    </div>

                    {/* Code/Boilerplate snippet preview */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-400">
                          📝 {currentLang === 'om' ? 'Qabiyyee Seeraa Dabalamu (Remediation Clause):' : currentLang === 'am' ? 'የሚካተተው የሕግ አንቀጽ፡' : 'Statutory Boilerplate to Insert:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(warning.suggestedFixSnippet[currentLang] || warning.suggestedFixSnippet.om);
                            setToastMessage(currentLang === 'om' ? '📋 Koodiin garagalchameera!' : currentLang === 'am' ? '📋 ቅንብሩ ተገልብጧል!' : '📋 Copied to clipboard!');
                            setTimeout(() => setToastMessage(null), 2500);
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                        >
                          📋 {currentLang === 'om' ? 'Garagalchi' : currentLang === 'am' ? 'ቅዳ' : 'Copy'}
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
                        {warning.suggestedFixSnippet[currentLang] || warning.suggestedFixSnippet.om}
                      </pre>
                    </div>

                    {/* Bottom action */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleApplyFix(warning)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <span>⚡</span>
                        <span>
                          {currentLang === 'om'
                            ? 'Kutaa Kana Sanada Keessatti Galchi (One-Click Insert)'
                            : currentLang === 'am'
                            ? 'ይህን ክፍል ወደ ሰነዱ አስገባ (One-Click Insert)'
                            : 'Insert Clause into Document (One-Click)'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Reference */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>
          ⚖️ FDRE Civil Procedure Code Arts. 92, 94, 137, 222, 224, 231 & Proclamation 1234/2021
        </span>
        <span>
          {currentLang === 'om' ? 'Mirkaneessa Loojikii Seeraa' : currentLang === 'am' ? 'የሕግ አሰራር ማረጋገጫ' : 'Procedural Logic Compliance'}
        </span>
      </div>
    </div>
  );
};
