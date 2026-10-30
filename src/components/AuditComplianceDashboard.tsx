import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Info,
  ExternalLink,
  ChevronRight,
  Gavel
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { ComplianceAuditResult, ComplianceCheck } from '../utils/complianceEngine';

interface AuditComplianceDashboardProps {
  currentLang: Language;
  result: ComplianceAuditResult;
  onViewStatute?: (reference: string) => void;
}

export const AuditComplianceDashboard: React.FC<AuditComplianceDashboardProps> = ({
  currentLang,
  result,
  onViewStatute
}) => {
  const { score, checks, summary } = result;

  const getStatusColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/30';
    if (score >= 50) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getStatusIcon = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Score */}
      <div className={`p-6 rounded-3xl border ${getBgColor(score)} flex flex-col md:flex-row items-center gap-6`}>
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full border-4 border-slate-800 flex items-center justify-center">
            <span className={`text-3xl font-black font-mono ${getStatusColor(score)}`}>
              {score}
            </span>
          </div>
          <div className="absolute -top-2 -right-2 bg-slate-900 rounded-full p-2 border border-slate-800">
            {score >= 70 ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            )}
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <h2 className="text-xl font-bold text-slate-100 flex items-center justify-center md:justify-start gap-2">
            <Gavel className="w-5 h-5 text-amber-400" />
            {currentLang === 'om' ? 'Qabxii Seera Qabeessummaa SDFHH' : 'የSDFHH የሥነ-ሥርዓት ኦዲት ውጤት'}
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            {summary[currentLang] || summary.en}
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
             <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950/50 px-2 py-1 rounded">
                Procedural Audit v2.0
             </div>
             <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950/50 px-2 py-1 rounded">
                Standard: Labsii 52/1958
             </div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((check) => (
          <div 
            key={check.id}
            className="group bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-1">
                {getStatusIcon(check.status)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">
                    {check.title[currentLang] || check.title.en}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    {check.status === 'passed' ? `+${check.scoreImpact}` : `0/${check.scoreImpact}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {check.description[currentLang] || check.description.en}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <button 
                    onClick={() => onViewStatute?.(check.statutoryReference)}
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    <Info className="w-3 h-3" />
                    {check.statutoryReference}
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations / Legal Disclaimer */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          {currentLang === 'om' ? 'Gorsa & Hubachiisa Seeraa' : 'የሕግ ምክርና ማሳሰቢያ'}
        </h3>
        <p className="text-[11px] text-slate-500 leading-relaxed italic">
          {currentLang === 'om' 
            ? "Madaallii ulaagaalee seera adeemsa hariiroo hawaasaa (SDFHH) kanarratti hundaa'uun hanqinni mul'ate iyyata keessan kuffisuu ykn lafarra harkisuu danda'a. Kun gorsa ogeessa seeraa (abukaattoo) bakka hin bu'u." 
            : "በዚህ የሥነ-ሥርዓት ኦዲት መሠረት የሚታዩ ግድፈቶች አቤቱታዎ ውድቅ እንዲሆን ወይም እንዲጓተት ሊያደርጉ ይችላሉ። ይህ ትንተና የሕግ ባለሙያ (ጠበቃ) ምክርን አይተካም።"}
        </p>
        <div className="pt-2">
          <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            {currentLang === 'om' ? 'Labsii SDFHH Dubbisi' : 'የSDFHH አዋጅን አንብብ'}
          </button>
        </div>
      </div>
    </div>
  );
};
