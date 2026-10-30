import React, { useState } from 'react';
import { Language } from '../i18n/translations';
import { DocumentRiskReport, RiskFlaggedClause, RiskLevel } from '../services/legalRiskScanner';

interface RiskFlaggedSidebarProps {
  currentLang: Language;
  riskReport: DocumentRiskReport;
  onJumpToClause: (clause: RiskFlaggedClause) => void;
  selectedClauseId?: string | null;
  onClose?: () => void;
}

export const RiskFlaggedSidebar: React.FC<RiskFlaggedSidebarProps> = ({
  currentLang,
  riskReport,
  onJumpToClause,
  selectedClauseId,
  onClose,
}) => {
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<RiskLevel | 'all'>('all');
  const [expandedClauseId, setExpandedClauseId] = useState<string | null>(null);

  const filteredClauses = riskReport.flaggedClauses.filter(clause => {
    if (selectedLevelFilter === 'all') return true;
    return clause.level === selectedLevelFilter;
  });

  const getRatingBadge = () => {
    switch (riskReport.overallRating) {
      case 'high':
        return {
          label: currentLang === 'om' ? 'Ol’aanaa (High)' : currentLang === 'am' ? 'ከፍተኛ (High)' : 'High Risk',
          color: 'bg-rose-950 text-rose-300 border-rose-500/60',
          emoji: '🔴',
          scoreColor: 'text-rose-400'
        };
      case 'medium':
        return {
          label: currentLang === 'om' ? 'Giddu-galeessa (Medium)' : currentLang === 'am' ? 'መካከለኛ (Medium)' : 'Medium Risk',
          color: 'bg-amber-950 text-amber-300 border-amber-500/60',
          emoji: '🟡',
          scoreColor: 'text-amber-400'
        };
      case 'low':
        return {
          label: currentLang === 'om' ? 'Gadi-aanaa (Low/Advisory)' : currentLang === 'am' ? 'ዝቅተኛ (Low)' : 'Low Risk',
          color: 'bg-blue-950 text-blue-300 border-blue-500/60',
          emoji: '🟢',
          scoreColor: 'text-blue-400'
        };
      default:
        return {
          label: currentLang === 'om' ? 'Qulqulluu (Clean)' : currentLang === 'am' ? 'ንጹህ (Clean)' : 'Clean / Safe',
          color: 'bg-emerald-950 text-emerald-300 border-emerald-500/60',
          emoji: '✅',
          scoreColor: 'text-emerald-400'
        };
    }
  };

  const ratingInfo = getRatingBadge();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 font-sans">
      {/* Header & Overall Risk Rating */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚨</span>
          <div>
            <h3 className="font-bold text-sm text-slate-100 font-serif">
              {currentLang === 'om'
                ? 'Qorannoo Balaa Seeraa (Risk Scanner)'
                : currentLang === 'am'
                ? 'የህግ አደጋዎች እና ስጋት ትንተና'
                : 'Legal Risk & Clause Scanner'}
            </h3>
            <span className="text-[11px] text-slate-400">
              {riskReport.totalFlaggedCount} keeyyattoonni/jechoonni shakkiisaan argamaniiru
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* OVERALL RISK RATING CARD */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
            SADARKAA BALAA SEERAA:
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${ratingInfo.color}`}>
            <span>{ratingInfo.emoji}</span>
            <span>{ratingInfo.label}</span>
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xs text-slate-400">Risk Index:</span>
          <span className={`text-2xl font-bold font-mono ${ratingInfo.scoreColor}`}>
            {riskReport.riskIndex} <span className="text-xs text-slate-500 font-normal">/ 100</span>
          </span>
        </div>

        {/* Executive Assessment Box */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
          <strong className="text-amber-400 block mb-1">Executive Assessment:</strong>
          {riskReport.executiveAssessment[currentLang] || riskReport.executiveAssessment.om}
        </div>
      </div>

      {/* Risk Level Filter Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setSelectedLevelFilter('all')}
          className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center ${
            selectedLevelFilter === 'all'
              ? 'bg-slate-800 text-slate-100 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Hunda ({riskReport.totalFlaggedCount})
        </button>

        <button
          type="button"
          onClick={() => setSelectedLevelFilter('high')}
          className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center ${
            selectedLevelFilter === 'high'
              ? 'bg-rose-950 text-rose-300 border border-rose-500/50 shadow'
              : 'text-rose-400/80 hover:text-rose-300'
          }`}
        >
          🔴 Ol’aanaa ({riskReport.highRiskCount})
        </button>

        <button
          type="button"
          onClick={() => setSelectedLevelFilter('medium')}
          className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center ${
            selectedLevelFilter === 'medium'
              ? 'bg-amber-950 text-amber-300 border border-amber-500/50 shadow'
              : 'text-amber-400/80 hover:text-amber-300'
          }`}
        >
          🟡 Giddu ({riskReport.mediumRiskCount})
        </button>

        <button
          type="button"
          onClick={() => setSelectedLevelFilter('low')}
          className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center ${
            selectedLevelFilter === 'low'
              ? 'bg-blue-950 text-blue-300 border border-blue-500/50 shadow'
              : 'text-blue-400/80 hover:text-blue-300'
          }`}
        >
          🟢 Gadi ({riskReport.lowRiskCount})
        </button>
      </div>

      {/* Flagged Clauses List with Jump-to-Section functionality */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {filteredClauses.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
            <span className="text-2xl block">✅</span>
            <p className="font-bold text-slate-200">Keeyyanni balaa qabu hin argamne</p>
            <p className="text-[11px] text-slate-500">Kutaan kun qulqulluu dha ykn filter biraa filadhaa.</p>
          </div>
        ) : (
          filteredClauses.map((clause) => {
            const isSelected = selectedClauseId === clause.id;
            const isExpanded = expandedClauseId === clause.id;

            const badgeStyles = clause.level === 'high'
              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              : clause.level === 'medium'
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              : 'bg-blue-950/80 text-blue-300 border-blue-500/40';

            return (
              <div
                key={clause.id}
                className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                  isSelected
                    ? 'bg-slate-950 border-amber-400 ring-1 ring-amber-400/50 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Clause Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                      <span className={`px-2 py-0.5 rounded-md font-bold uppercase border ${badgeStyles}`}>
                        {clause.level === 'high' ? '🔴 HIGH RISK' : clause.level === 'medium' ? '🟡 MEDIUM' : '🟢 ADVISORY'}
                      </span>
                      <span className="text-slate-400">
                        📍 Sarara {clause.lineNumber}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100 font-serif leading-snug">
                      {clause.title[currentLang] || clause.title.om}
                    </h4>
                  </div>

                  {/* Jump To Section Button */}
                  <button
                    type="button"
                    onClick={() => onJumpToClause(clause)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-all cursor-pointer shrink-0 shadow-sm"
                    title="Qabxii barreeffama keessatti argamuutti deemi"
                  >
                    <span>🎯</span>
                    <span>Qabxiitti Deemi</span>
                  </button>
                </div>

                {/* Context Snippet */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 font-mono leading-relaxed">
                  <span className="text-slate-500">"{clause.snippet}"</span>
                </div>

                {/* Violated Legal Article & Mitigation Toggle */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <span>⚖️</span>
                    <span><strong>Seera Cabbse:</strong> {clause.statutoryReference}</span>
                  </div>

                  {/* Mitigation Advice */}
                  <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <strong className="text-amber-300">💡 Gorsa Sirreeffamaa: </strong>
                    {clause.mitigationAdvice[currentLang] || clause.mitigationAdvice.om}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
