import React, { useState } from 'react';
import { Language } from '../i18n/translations';
import { validateLegalCitationText, ValidatedCitation } from '../services/citationValidator';

interface CitationValidatorPanelProps {
  content: string;
  currentLang: Language;
  onOpenCassation?: (query: string) => void;
  onOpenExplainLaw?: (query: string) => void;
  onApplyReplacement?: (oldCitation: string, newCitation: string) => void;
}

export const CitationValidatorPanel: React.FC<CitationValidatorPanelProps> = ({
  content,
  currentLang,
  onOpenCassation,
  onOpenExplainLaw,
  onApplyReplacement,
}) => {
  const validatedCitations = validateLegalCitationText(content);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePopoverCitation, setActivePopoverCitation] = useState<ValidatedCitation | null>(null);

  const repealedCount = validatedCitations.filter((c) => c.status === 'repealed_superseded').length;
  const activeCount = validatedCitations.filter((c) => c.status === 'valid_active' || c.status === 'active_precedent').length;

  if (!content.trim() || validatedCitations.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
        <div className="text-2xl">🔍</div>
        <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
          {currentLang === 'om' ? 'Sakatta’iinsa Wabiilee Seeraa (Real-time Citation Validator)' : currentLang === 'am' ? 'የሕግ ድንጋጌዎች ትክክለኛነት ማረጋገጫ' : 'Real-Time Citation Validator'}
        </h4>
        <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
          {currentLang === 'om'
            ? 'Barreeffama seeraa ykn sanada galchaniin labsiileen, keeyyattoonni fi murteewwan dhaddacha ijoo hojiirra jiraachuu isaanii otomaatikiin madaalama.'
            : currentLang === 'am'
            ? 'ጽሑፍ ሲያስገቡ የተጠቀሱት አዋጆችና አንቀጾች በስራ ላይ መሆናቸውንና አለመሆናቸውን በቅጽበት ያረጋግጣል።'
            : 'As you type or upload a legal document, citations are cross-referenced with active in-force Ethiopian proclamations to flag repealed laws.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xl">
            ⚖️
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>
                {currentLang === 'om'
                  ? 'Mirkaneessa Wabiilee Seeraa (Citation Validator)'
                  : currentLang === 'am'
                  ? 'የሕግ ድንጋጌዎች ትክክለኛነት ማረጋገጫ'
                  : 'Real-time Citation Validator'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 font-mono border border-slate-800 font-bold">
                {validatedCitations.length} Detected
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {currentLang === 'om'
                ? 'Labsiileen fi keeyyattoonni sanada keessatti argaman kuusaa seeraa haarawa waliin madaalaman.'
                : currentLang === 'am'
                ? 'በሰነዱ ውስጥ የተጠቀሱ አዋጆች በስራ ላይ ካሉ የህግ ድንጋጌዎች ጋር ተመሳክረዋል።'
                : 'Cross-referenced against current active Ethiopian statutory proclamations and binding precedents.'}
            </p>
          </div>
        </div>

        {/* Real-time Summary Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {repealedCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold font-mono animate-pulse">
              ⚠️ {repealedCount} Repealed Law
            </span>
          )}
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold font-mono">
            ✓ {activeCount} Active
          </span>
        </div>
      </div>

      {/* Critical Repealed Law Warning Banner */}
      {repealedCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-600/60 text-rose-200 text-xs space-y-2 animate-in fade-in duration-200 shadow-lg">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <span className="text-base">⚠️</span>
            <span>
              {currentLang === 'om'
                ? 'XIYYEEFFANNOO SEERAA: Labsiin Haqame Sanada Keessatti Argameera!'
                : currentLang === 'am'
                ? 'የሕግ ማስጠንቀቂያ፦ የተሻረ አዋጅ በሰነዱ ውስጥ ተገኝቷል!'
                : 'LEGAL WARNING: Repealed/Outdated Law Detected in Document!'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-rose-200/90">
            {currentLang === 'om'
              ? 'Sanada keessan keessatti labsiin seeraan haqame ykn bakka bu’ame caqasameera. Falmii mana murtii ykn waliigaltee keessatti seera haqame fayyadamuun murtii faallaa fiduu danda’a. Maaloo seera haarawaa hojiirra jiruun bakka buusaas.'
              : currentLang === 'am'
              ? 'በስራ ላይ የሌለና የተሻረ አዋጅ መጥቀስ በህግ ፊት ውልዎን ዋጋ አልባ ሊያደርገው ይችላል። እባክዎ በአዲሱ አዋጅ ይተኩት።'
              : 'Citing a repealed proclamation in legal briefs or contracts renders claims invalid. Use the recommended active replacement below.'}
          </p>
        </div>
      )}

      {/* Validated Citations List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {validatedCitations.map((item) => {
          const isRepealed = item.status === 'repealed_superseded';
          const cardBorder = isRepealed
            ? 'border-rose-500/70 bg-slate-950/90 hover:border-rose-400'
            : item.status === 'active_precedent'
            ? 'border-emerald-500/60 bg-slate-950/90 hover:border-emerald-400'
            : 'border-slate-800 bg-slate-950 hover:border-amber-500/50';

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border ${cardBorder} transition-all space-y-3 shadow-md`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">{item.badgeEmoji}</span>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                        isRepealed
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {item.statusLabel[currentLang] || item.statusLabel.om}
                    </span>
                    {item.articleOrSection && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                        {item.articleOrSection}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-amber-300 leading-snug">
                    {item.citationTitle[currentLang] || item.citationTitle.om}
                  </h4>
                </div>

                {/* Copy Clean Citation Button */}
                <button
                  type="button"
                  onClick={async () => {
                    const txt = item.citationTitle[currentLang] || item.citationTitle.om;
                    await navigator.clipboard.writeText(txt);
                    setCopiedId(item.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-bold shrink-0 cursor-pointer transition-all flex items-center gap-1"
                  title="Copy standardized citation text"
                >
                  <span>{copiedId === item.id ? '✓' : '📋'}</span>
                  <span>{copiedId === item.id ? 'Waraabame!' : 'Waraabi'}</span>
                </button>
              </div>

              {/* Explanation Text */}
              <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                {item.explanation[currentLang] || item.explanation.om}
              </p>

              {/* Active Replacement Box if Repealed */}
              {isRepealed && item.replacementRecommendation && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔄</span>
                    <span className="font-semibold">
                      {item.replacementRecommendation[currentLang] || item.replacementRecommendation.om}
                    </span>
                  </div>

                  {onApplyReplacement && (
                    <button
                      type="button"
                      onClick={() =>
                        onApplyReplacement(
                          item.procNumber || item.rawCitation,
                          item.replacementRecommendation?.om.split(':')[1]?.trim() || 'Labsii Lakk. 1156/2019'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 cursor-pointer transition-all shadow-sm"
                    >
                       Bakka Buusi (Replace Now)
                    </button>
                  )}
                </div>
              )}

              {/* Interactive Full-Text Link Actions & Quick-Reference Popover Button */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900 text-[10px]">
                {/* QUICK REFERENCE POPOVER TRIGGER */}
                <button
                  type="button"
                  onClick={() => setActivePopoverCitation(item)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                >
                  <span>⚡</span>
                  <span>
                    {currentLang === 'om'
                      ? 'Quick-Reference Popover (Seensa & Keeyyattoota)'
                      : currentLang === 'am'
                      ? 'ፈጣን ማጣቀሻ (መግቢያ እና አንቀጾች)'
                      : 'Quick-Reference Popover (Preamble & Sections)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenExplainLaw) {
                      onOpenExplainLaw(
                        `Labsii ykn keeyyata ${item.procNumber || item.rawCitation} irratti ibsa guutuu, keeyyattoota hojiirra jiran fi murteewwan dhaddacha ijoo kanaan walqabatan naaf dhiyeessi.`
                      );
                    } else {
                      window.dispatchEvent(
                        new CustomEvent('seera:navigate', {
                          detail: {
                            tab: 'explainLaw',
                            query: `Labsii ykn keeyyata ${item.procNumber || item.rawCitation} irratti ibsa guutuu fi keeyyattoota hojiirra jiran naaf dhiyeessi.`,
                          },
                        })
                      );
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>📖</span>
                  <span>
                    {currentLang === 'om'
                      ? 'Seera Kana Qori & Full Text'
                      : currentLang === 'am'
                      ? 'ሙሉ ሕጉንና አንቀጾቹን መርምር'
                      : 'Read Full Text'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenCassation) {
                      onOpenCassation(item.fullTextQuery);
                    } else {
                      window.dispatchEvent(
                        new CustomEvent('seera:navigate', {
                          detail: { tab: 'cassation', query: item.fullTextQuery },
                        })
                      );
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>🔍</span>
                  <span>
                    {currentLang === 'om'
                      ? 'Murteewwan Ijoo'
                      : currentLang === 'am'
                      ? 'የሰበር ውሳኔዎች'
                      : 'Cassation Precedents'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK-REFERENCE POPOVER MODAL */}
      {activePopoverCitation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto text-left relative">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-base">{activePopoverCitation.badgeEmoji}</span>
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold uppercase border border-amber-500/40">
                    {activePopoverCitation.statusLabel[currentLang] || activePopoverCitation.statusLabel.om}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100 font-serif-legal">
                  {activePopoverCitation.citationTitle[currentLang] || activePopoverCitation.citationTitle.om}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActivePopoverCitation(null)}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Enactment Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Bara Labsame (Enactment Date):</span>
                <span className="text-amber-300 font-bold">
                  {activePopoverCitation.dateOfEnactment?.ethiopian || 'Bara 2011 B.A.'} ({activePopoverCitation.dateOfEnactment?.gregorian || '2019 G.C.'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Qaama Baase (Enacting Authority):</span>
                <span className="text-emerald-300 font-bold">
                  {activePopoverCitation.enactingAuthority?.[currentLang] || activePopoverCitation.enactingAuthority?.om || 'Mana Marii Bakka Bu\'oota Uummata FDRE'}
                </span>
              </div>
            </div>

            {/* Preamble Section */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <span>📜</span>
                <span>Yada Seensa (Preamble of the Proclamation):</span>
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                {activePopoverCitation.preamble?.[currentLang] || activePopoverCitation.preamble?.om || activePopoverCitation.explanation[currentLang] || activePopoverCitation.explanation.om}
              </p>
            </div>

            {/* Relevant Section / Articles */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span>⚖️</span>
                <span>Keeyyattoota Murteessoo (Relevant Section & Key Articles):</span>
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                {activePopoverCitation.relevantSection?.[currentLang] || activePopoverCitation.relevantSection?.om || activePopoverCitation.explanation[currentLang] || activePopoverCitation.explanation.om}
              </p>
            </div>

            {/* Replacement recommendation if repealed */}
            {activePopoverCitation.status === 'repealed_superseded' && activePopoverCitation.replacementRecommendation && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-600/60 text-rose-200 text-xs space-y-2">
                <span className="font-bold block uppercase text-rose-300">⚠️ Seera Haqame & Bakka Bu'iinsa:</span>
                <p>{activePopoverCitation.replacementRecommendation[currentLang] || activePopoverCitation.replacementRecommendation.om}</p>
              </div>
            )}

            {/* Popover Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  const titleStr = activePopoverCitation.citationTitle[currentLang] || activePopoverCitation.citationTitle.om;
                  const preambleStr = activePopoverCitation.preamble?.[currentLang] || activePopoverCitation.preamble?.om || '';
                  const sectionStr = activePopoverCitation.relevantSection?.[currentLang] || activePopoverCitation.relevantSection?.om || '';
                  await navigator.clipboard.writeText(`${titleStr}\n${preambleStr}\n${sectionStr}`);
                  setCopiedId(activePopoverCitation.id);
                  setTimeout(() => setCopiedId(null), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-all"
              >
                {copiedId === activePopoverCitation.id ? '✓ Waraabbameera!' : '📋 Preamble & Section Copy Godhi'}
              </button>

              <button
                type="button"
                onClick={() => setActivePopoverCitation(null)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 cursor-pointer transition-colors"
              >
                Cufi (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
