import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Scale, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  AlertCircle,
  HelpCircle,
  Crown,
  ChevronDown,
  Building,
  Coins,
  Receipt
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { 
  calculateOromiaCourtFee, 
  ClaimCategory, 
  CourtLevel, 
  ExemptionCategory,
  CourtFeeCalculationResult
} from '../services/courtFeeCalculatorService';
import { useAuth } from '../context/AuthContext';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { PremiumGate } from './PremiumGate';

interface CourtFeeCalculatorProps {
  currentLang: Language;
  initialAmount?: number;
  initialCourtLevel?: CourtLevel;
  initialCategory?: ClaimCategory;
  onApplyFeeToDocument?: (feeSummaryText: string, result: CourtFeeCalculationResult) => void;
  onClose?: () => void;
}

export const CourtFeeCalculator: React.FC<CourtFeeCalculatorProps> = ({
  currentLang,
  initialAmount = 50000,
  initialCourtLevel = 'first_instance',
  initialCategory = 'monetary',
  onApplyFeeToDocument,
  onClose,
}) => {
  const { profile } = useAuth();
  const { isPremiumSubscriber: isPremiumUser } = usePremiumAccess();

  const [claimCategory, setClaimCategory] = useState<ClaimCategory>(initialCategory);
  const [courtLevel, setCourtLevel] = useState<CourtLevel>(initialCourtLevel);
  const [claimAmount, setClaimAmount] = useState<number>(initialAmount);
  const [lowerCourtFee, setLowerCourtFee] = useState<number>(400);
  const [witnessCount, setWitnessCount] = useState<number>(0);
  const [docPagesCount, setDocPagesCount] = useState<number>(0);
  const [temporaryInjunction, setTemporaryInjunction] = useState<boolean>(false);
  const [pleadingAmendment, setPleadingAmendment] = useState<boolean>(false);
  const [exemption, setExemption] = useState<ExemptionCategory>('none');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showTierDetails, setShowTierDetails] = useState(false);

  // Calculation output
  const calculationResult = useMemo(() => {
    return calculateOromiaCourtFee({
      claimCategory,
      courtLevel,
      claimAmountETB: claimAmount,
      lowerCourtFeeETB: lowerCourtFee,
      additionalServices: {
        witnessCount,
        documentPagesCount: docPagesCount,
        temporaryInjunction,
        pleadingAmendment,
      },
      exemption,
      isPremiumUser,
    });
  }, [
    claimCategory,
    courtLevel,
    claimAmount,
    lowerCourtFee,
    witnessCount,
    docPagesCount,
    temporaryInjunction,
    pleadingAmendment,
    exemption,
    isPremiumUser,
  ]);

  const handleCopySummary = () => {
    const textToCopy = 
      `[SHALLAGGII KAFFALTII ABBAA SEERUMMAA - DAMBII OROMIYAA 2015]\n` +
      `Manna Murtii: ${calculationResult.courtLevelName}\n` +
      `Gosa Dhimmaa: ${claimCategory === 'monetary' ? 'Dhimma Maallaqaa' : claimCategory === 'non_monetary' ? 'Dhimma Gatii Hin Qabne' : 'Ol\'iyyannoo'}\n` +
      `Gatii Dhimmaa: ${claimAmount.toLocaleString()} ETB\n` +
      `Kaffaltii Mootummaa (Statutory Fee): ${calculationResult.totalGovernmentFee.toLocaleString()} ETB\n` +
      `Kaffaltii Platformii: ${isPremiumUser ? '0 ETB (Premium Waived)' : `${calculationResult.standardPlatformProcessingFee} ETB`}\n` +
      `Waliigala Kaffaltii: ${(isPremiumUser ? calculationResult.premiumUserTotal : calculationResult.standardUserTotal).toLocaleString()} ETB\n` +
      `Bu'uura Seeraa: Dambii Kaffaltii Tajaajila Abbaa Seerummaa Manneen Murtii Oromiyaa Bara 2015/2016`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleApplyToDoc = () => {
    if (!onApplyFeeToDocument) return;
    const summaryText = 
      `\n\n---\n` +
      `⚖️ SHALLAGGII KAFFALTII ABBAA SEERUMMAA (DAMBII BARA 2015):\n` +
      `1. Sadarkaa Mana Murtii: ${calculationResult.courtLevelName}\n` +
      `2. Hanga Gatii Dhimmaa: ${calculationResult.claimAmountETB.toLocaleString()} ETB\n` +
      `3. Kaffaltii Abbaa Seerummaa Mootummaa: ${calculationResult.totalGovernmentFee.toLocaleString()} ETB\n` +
      `4. Haala Kaffaltii: ${calculationResult.isExempt ? `Bilisa (%100 Exempt: ${calculationResult.exemptionReason})` : 'Kaffaltii Idilee'}\n` +
      `5. Haala Eeyyama Fayyadamaa: ${isPremiumUser ? 'Eeyyama Premium (%100 Platform Fee Waived)' : 'Fayyadamaa Idilee (Standard User)'}\n` +
      `6. Waliigala Kaffaltii Qophii Himannaa: ${(isPremiumUser ? calculationResult.premiumUserTotal : calculationResult.standardUserTotal).toLocaleString()} ETB\n` +
      `Bu'uura Seeraa: Dambii Kaffaltii Tajaajila Abbaa Seerummaa Manneen Murtii Mootummaa Naannoo Oromiyaa Bara 2015/2016.`;

    onApplyFeeToDocument(summaryText, calculationResult);
  };

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Shallaggii Kaffaltii Abbaa Seerummaa</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                  Bara 2015
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dambii Kaffaltii Tajaajila Abbaa Seerummaa Manneen Murtii Mootummaa Naannoo Oromiyaa Bara 2015/2016.
            </p>
          </div>
        </div>

        {/* User Tier Badge Indicator */}
        <div className="flex items-center gap-2">
          {isPremiumUser ? (
            <div className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <Crown className="w-4 h-4 text-purple-400" />
              <span>Premium User (%100 Fee Waiver)</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>Standard User</span>
            </div>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column: Case Parameters */}
        <div className="space-y-4">
          {/* Claim Category */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Gosa Dhimmaa (Claim Category)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClaimCategory('monetary')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 cursor-pointer ${
                  claimCategory === 'monetary'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Coins className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="truncate">Maallaqaa (Monetary)</span>
              </button>

              <button
                type="button"
                onClick={() => setClaimCategory('non_monetary')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 cursor-pointer ${
                  claimCategory === 'non_monetary'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Scale className="w-4 h-4 shrink-0 text-blue-400" />
                <span className="truncate">Gatii Hin Qabne (Fixed)</span>
              </button>

              <button
                type="button"
                onClick={() => setClaimCategory('appeal')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 cursor-pointer ${
                  claimCategory === 'appeal'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0 text-purple-400" />
                <span className="truncate">Ol'iyyannoo (Appeal 50%)</span>
              </button>

              <button
                type="button"
                onClick={() => setClaimCategory('cassation')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 cursor-pointer ${
                  claimCategory === 'cassation'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Building className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="truncate">Ijibbaata (Cassation)</span>
              </button>
            </div>
          </div>

          {/* Court Level */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Sadarkaa Mana Murtii (Court Level)
            </label>
            <select
              value={courtLevel}
              onChange={(e) => setCourtLevel(e.target.value as CourtLevel)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="first_instance">Mana Murtii Aanaa (District Court) - 200 ETB Min</option>
              <option value="high_court">Mana Murtii Ol'aanaa Godinaa (Zone High Court) - 300 ETB</option>
              <option value="supreme_court">Mana Murtii Waliigalaa Oromiyaa (Supreme Court) - 500 ETB</option>
              <option value="cassation">Dhaddacha Ijibbaataa Oromiyaa (Cassation Bench) - 600 ETB</option>
            </select>
          </div>

          {/* Monetary Claim Amount Input */}
          {claimCategory === 'monetary' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Gatii Himannaa / Qabeenyaa (Claim Amount in ETB)
                </label>
                <span className="text-[11px] font-mono text-amber-400 font-bold">
                  {claimAmount.toLocaleString()} ETB
                </span>
              </div>
              <input
                type="number"
                min="0"
                step="500"
                value={claimAmount}
                onChange={(e) => setClaimAmount(Math.max(0, Number(e.target.value)))}
                placeholder="Fkn: 150000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[10000, 50000, 100000, 250000, 500000, 1000000, 2500000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setClaimAmount(preset)}
                    className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border border-slate-700/60 cursor-pointer transition-all"
                  >
                    {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`} ETB
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Appeal Lower Court Fee Input */}
          {claimCategory === 'appeal' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Kaffaltii Mana Murtii Jalaa Kaffalame (Lower Court Fee)
              </label>
              <input
                type="number"
                min="0"
                value={lowerCourtFee}
                onChange={(e) => setLowerCourtFee(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Bu'uura dambiitiin ol'iyyannoon %50 kaffaltii mana murtii jalaa shallagama.
              </span>
            </div>
          )}

          {/* Exemption Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Dhiifama Kaffaltii (Statutory Exemption)
            </label>
            <select
              value={exemption}
              onChange={(e) => setExemption(e.target.value as ExemptionCategory)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="none">Dhiifama Hin Qabu (Standard Filing)</option>
              <option value="child_maintenance">Nafaqaa fi Mirga Daa'immanii (%100 Exempt)</option>
              <option value="labor_under_100k">Himata Hojjetaa &lt; 100,000 ETB (%100 Exempt)</option>
              <option value="poverty_legal_aid">Waraqaa Hiyyummaa / Gargaarsa Seeraa (%100 Exempt)</option>
            </select>
          </div>
        </div>

        {/* Right Column: Additional Court Services & Fee Breakdown */}
        <div className="space-y-4">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center justify-between">
              <span>Tajaajiloota Dabalataa (Additional Services)</span>
              <span className="text-[10px] font-mono text-slate-400">Tariff 2015</span>
            </h4>

            {/* Witness Count */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300">Waamicha Ragaa (Witness Summons - 50 ETB/ea):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={witnessCount}
                  onChange={(e) => setWitnessCount(Math.max(0, Number(e.target.value)))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-xs text-white"
                />
                <span className="text-amber-400 font-mono text-[11px] w-14 text-right">
                  {(witnessCount * 50).toLocaleString()} ETB
                </span>
              </div>
            </div>

            {/* Document Copies */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300">Waraabbii Sanadaa (Copies - 5 ETB/page):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={docPagesCount}
                  onChange={(e) => setDocPagesCount(Math.max(0, Number(e.target.value)))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-xs text-white"
                />
                <span className="text-amber-400 font-mono text-[11px] w-14 text-right">
                  {(docPagesCount * 5).toLocaleString()} ETB
                </span>
              </div>
            </div>

            {/* Temporary Injunction */}
            <div className="flex items-center justify-between gap-3 text-xs pt-1 border-t border-slate-800/80">
              <label htmlFor="injunction" className="text-slate-300 cursor-pointer">
                Ajaja Yeroo / Ittisaa (Injunction - 100 ETB)
              </label>
              <input
                id="injunction"
                type="checkbox"
                checked={temporaryInjunction}
                onChange={(e) => setTemporaryInjunction(e.target.checked)}
                className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Pleading Amendment */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <label htmlFor="amendment" className="text-slate-300 cursor-pointer">
                Fooyya'iinsa Himannaa (%10 Surcharge)
              </label>
              <input
                id="amendment"
                type="checkbox"
                checked={pleadingAmendment}
                onChange={(e) => setPleadingAmendment(e.target.checked)}
                className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          {/* TOTAL CALCULATION CARD (WITH DUAL USER DISPLAY) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-amber-500/40 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Receipt className="w-4 h-4" />
                <span>Bu'aa Shallaggii Kaffaltii</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTierDetails(!showTierDetails)}
                className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Tarree Sadarkaalee</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTierDetails ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Detailed Tier Breakdown Dropdown */}
            {showTierDetails && (
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5 text-[11px] font-mono animate-in fade-in">
                {calculationResult.tieredBreakdown.map((t, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span>{t.bracket} {t.ratePercent > 0 ? `(%${t.ratePercent})` : ''}:</span>
                    <span className="text-amber-400 font-bold">{t.calculatedFee.toLocaleString()} ETB</span>
                  </div>
                ))}
              </div>
            )}

            {/* Statutory Government Fee */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Kaffaltii Abbaa Seerummaa Mootummaa (Government Statutory Fee):</span>
                <span className="font-bold text-white font-mono text-sm">
                  {calculationResult.totalGovernmentFee.toLocaleString()} ETB
                </span>
              </div>

              {calculationResult.isExempt && (
                <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dhiifama Seeraa (%100 Exempt): {calculationResult.exemptionReason}</span>
                </div>
              )}
            </div>

            {/* DUAL DISPLAY: STANDARD vs PREMIUM USERS */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              {/* Standard User Display */}
              <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                !isPremiumUser 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-400'
              }`}>
                <div className="font-bold flex items-center justify-between text-[11px]">
                  <span>Fayyadamaa Idilee</span>
                  {!isPremiumUser && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black">ACTIVE</span>}
                </div>
                <div className="text-[10px] text-slate-400">
                  Platform Fee: +{calculationResult.standardPlatformProcessingFee} ETB
                </div>
                <div className="text-base font-black font-mono text-white pt-1">
                  {calculationResult.standardUserTotal.toLocaleString()} <span className="text-[10px] font-normal">ETB</span>
                </div>
              </div>

              {/* Premium User Display */}
              <PremiumGate
                compact
                currentLang={currentLang}
                featureTitle="Kaffaltii Platformii 0 ETB (Premium Waived)"
              >
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                  isPremiumUser 
                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-200' 
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-400'
                }`}>
                  <div className="font-bold flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3 text-purple-400" />
                      <span>Premium User</span>
                    </span>
                    {isPremiumUser && <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500 text-white font-black">ACTIVE</span>}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold">
                    Platform Fee: 0 ETB (%100 Waived)
                  </div>
                  <div className="text-base font-black font-mono text-purple-300 pt-1">
                    {calculationResult.premiumUserTotal.toLocaleString()} <span className="text-[10px] font-normal">ETB</span>
                  </div>
                </div>
              </PremiumGate>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span>{copiedSummary ? 'Waraabameera!' : 'Waraabi (Copy)'}</span>
              </button>

              {onApplyFeeToDocument && (
                <button
                  type="button"
                  onClick={handleApplyToDoc}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <FileText className="w-4 h-4" />
                  <span>Sanadatti Dabali (Attach to Petition)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
