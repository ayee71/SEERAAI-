import React, { useState } from 'react';
import { 
  Send, 
  Building2, 
  Landmark, 
  Gavel, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  Lock, 
  Scale, 
  Clock, 
  Copy, 
  Check, 
  QrCode,
  Download,
  AlertCircle
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { OROMIA_COURTS_CATALOG } from '../data/courts/oromiaCourts';

export interface InterCourtTransferRecord {
  id: string;
  transferRefNo: string;
  caseNumber: string;
  caseTitle: string;
  sourceCourtName: string;
  sourceCourtLevel: 'first' | 'high' | 'supreme' | 'cassation';
  targetCourtName: string;
  targetCourtLevel: 'high' | 'supreme' | 'cassation';
  transferReason: 'appeal' | 'cassation_review' | 'jurisdiction_transfer' | 'injunction_enforcement';
  appealPetitionSummary?: string;
  dispatchedBy: string;
  dispatchDate: string;
  status: 'dispatched' | 'received' | 'under_review';
  isOfficialSealAttached: boolean;
}

interface InterCourtFileTransferModalProps {
  currentLang: Language;
  isOpen: boolean;
  onClose: () => void;
  caseNumber?: string;
  caseTitle?: string;
  currentCourtLevel?: 'first' | 'high' | 'supreme' | 'cassation';
  currentCourtName?: string;
  onTransferComplete?: (record: InterCourtTransferRecord) => void;
}

export const InterCourtFileTransferModal: React.FC<InterCourtFileTransferModalProps> = ({
  currentLang,
  isOpen,
  onClose,
  caseNumber = 'CR-2026/089',
  caseTitle = 'Himannaa Waliigaltee Bittaa fi Gurgurtaa Manaa',
  currentCourtLevel = 'first',
  currentCourtName = 'Mana Murtii Aanaa Adaamaa',
  onTransferComplete
}) => {
  const t = translations[currentLang];

  const [targetLevel, setTargetLevel] = useState<'high' | 'supreme' | 'cassation'>(
    currentCourtLevel === 'first' ? 'high' : currentCourtLevel === 'high' ? 'cassation' : 'cassation'
  );

  const [targetCourtName, setTargetCourtName] = useState('Mana Murtii Ol\'aanaa Godina Shawaa Bahaa');
  const [transferReason, setTransferReason] = useState<'appeal' | 'cassation_review' | 'jurisdiction_transfer' | 'injunction_enforcement'>('appeal');
  const [transferRefNo, setTransferRefNo] = useState(`MMO/TR-2026/${Math.floor(1000 + Math.random() * 9000)}`);
  const [appealSummary, setAppealSummary] = useState('');
  const [attachingOfficialSeal, setAttachingOfficialSeal] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [successRecord, setSuccessRecord] = useState<InterCourtTransferRecord | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  if (!isOpen) return null;

  // Filter target court choices based on selected level
  const targetCourtOptions = targetLevel === 'cassation'
    ? [
        'Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Oromiyaa (Finfinnee)',
        'Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Federaalaa (Finfinnee)',
        'Dhaddacha Ijibbaataa Ol\'aanaa Adaamaa'
      ]
    : targetLevel === 'supreme'
    ? [
        'Mana Murtii Waliigalaa Oromiyaa',
        'Mana Murtii Waliigalaa Federaalaa'
      ]
    : [
        'Mana Murtii Ol\'aanaa Godina Shawaa Bahaa (Adaamaa)',
        'Mana Murtii Ol\'aanaa Godina Arsi Bahaa (Asallaa)',
        'Mana Murtii Ol\'aanaa Godina Jimmaa',
        'Mana Murtii Ol\'aanaa Godina Hararghee Bahaa (Harar)',
        'Mana Murtii Ol\'aanaa Magaalaa Adaamaa'
      ];

  const handleDispatchTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);

    setTimeout(() => {
      setIsDispatching(false);

      const record: InterCourtTransferRecord = {
        id: `tr-${Date.now()}`,
        transferRefNo,
        caseNumber,
        caseTitle,
        sourceCourtName: currentCourtName,
        sourceCourtLevel: currentCourtLevel,
        targetCourtName,
        targetCourtLevel: targetLevel,
        transferReason,
        appealPetitionSummary: appealSummary || 'Ol\'iyyannoo Murtii Mana Murtii Jalqabaa Irratti Dhiyaate.',
        dispatchedBy: 'Galmeessaa / Ofiisara Seeraa',
        dispatchDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
        status: 'dispatched',
        isOfficialSealAttached: attachingOfficialSeal
      };

      setSuccessRecord(record);
      if (onTransferComplete) onTransferComplete(record);
    }, 1000);
  };

  const handleCopyRef = () => {
    if (!successRecord) return;
    navigator.clipboard.writeText(successRecord.transferRefNo);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xl font-bold shrink-0">
              🚀
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Transfeera Galmee & Ol\'iyyannoo Manneen Murtii (Inter-Court File Transfer)' : 'የፍርድ ቤቶች የፋይል እና ይግባኝ ትራንስፈር'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {caseNumber} • {caseTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {successRecord ? (
            /* Success Dispatch Certificate View */
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-6 rounded-3xl bg-emerald-950/30 border-2 border-emerald-500/50 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold text-emerald-300 font-serif-legal">
                  {currentLang === 'om' ? 'Galmeen Ol\'iyyannoo / Transfeeraa Milkaa\'inaan Ergameera!' : 'File Successfully Transferred & Dispatched!'}
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Galmeen Lakk. <strong>{successRecord.caseNumber}</strong> chaappaa mana murtiitiin mirkanaa'ee bifa digitaalaatiin gara mana murtii target ergameera.
                </p>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/30">
                    Ref: {successRecord.transferRefNo}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Copy Transfer Reference Number"
                  >
                    {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Official Transfer Certificate Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 font-mono text-[10px] text-amber-400 font-bold uppercase">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>OFFICIAL INTER-COURT DISPATCH CERTIFICATE</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{successRecord.dispatchDate}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block font-mono uppercase">Madda (Source Court):</span>
                    <div className="font-bold text-slate-200">{successRecord.sourceCourtName}</div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-mono uppercase">Gara (Target Court):</span>
                    <div className="font-bold text-amber-300">{successRecord.targetCourtName} ({successRecord.targetCourtLevel.toUpperCase()})</div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-mono uppercase">Sababa Transfeeraa:</span>
                    <div className="font-bold text-emerald-300">{successRecord.transferReason.toUpperCase().replace('_', ' ')}</div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-mono uppercase">Status Ergaa:</span>
                    <div className="font-bold text-sky-300 font-mono">EN ROUTE TO TARGET DOCKET</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                  <strong>Ibsa Ol'iyyannoo/Transfeeraa:</strong> {successRecord.appealPetitionSummary}
                </div>

                {/* Simulated Official Digital Seal Stamp */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <span>SHA-256 Cryptographic Transfer Seal Attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer"
                  >
                    Xumuri (Done)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Dispatch Form */
            <form onSubmit={handleDispatchTransfer} className="space-y-5">
              {/* Route Display Diagram */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Madda (Source):</span>
                  <div className="font-bold text-white truncate max-w-[180px]">{currentCourtName}</div>
                </div>

                <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs shrink-0">
                  <span>FORWARD</span>
                  <ArrowRight className="w-4 h-4 animate-pulse" />
                </div>

                <div className="space-y-0.5 text-right">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Gara (Target Level):</span>
                  <div className="font-bold text-amber-300 uppercase">{targetLevel} COURT</div>
                </div>
              </div>

              {/* Target Court Level Selector */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold text-xs">
                  1. Sadarkaa Mana Murtii Target Filadhu (Target Court Level) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'high', label: '1. Mana Murtii Ol\'aanaa (High Court)', desc: 'Ol\'iyyannoo Murtii' },
                    { id: 'supreme', label: '2. Mana Murtii Waliigalaa (Supreme Court)', desc: 'Ol\'iyyannoo 2ffaa' },
                    { id: 'cassation', label: '3. Dhaddacha Ijibbaataa (Cassation Bench)', desc: 'Dogoggora Seeraa' },
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => {
                        setTargetLevel(lvl.id as any);
                        if (lvl.id === 'cassation') {
                          setTargetCourtName('Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Oromiyaa (Finfinnee)');
                        } else if (lvl.id === 'supreme') {
                          setTargetCourtName('Mana Murtii Waliigalaa Oromiyaa');
                        } else {
                          setTargetCourtName('Mana Murtii Ol\'aanaa Godina Shawaa Bahaa (Adaamaa)');
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                        targetLevel === lvl.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{lvl.label}</div>
                      <div className="text-[10px] text-slate-400">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Specific Court Institution Dropdown */}
              <div>
                <label className="block text-slate-300 font-bold text-xs mb-1">
                  2. Mana Murtii Target Ergamuu Filadhu (Target Institution) *
                </label>
                <select
                  value={targetCourtName}
                  onChange={e => setTargetCourtName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {targetCourtOptions.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Reason for Transfer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold text-xs mb-1">3. Sababa Transfeeraa / Ergaa *</label>
                  <select
                    value={transferReason}
                    onChange={e => setTransferReason(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="appeal">Ol'iyyannoo Murtii (Appeal against Decree)</option>
                    <option value="cassation_review">Iyyata Dhaddacha Ijibbaataa (Cassation Review)</option>
                    <option value="jurisdiction_transfer">Aangoo Seeraa (Jurisdiction Transfer)</option>
                    <option value="injunction_enforcement">Ajaja Dhorkaa / Enforcement Order</option>
                  </select>
                </div>

                <div>
                  <label className="block text-amber-400 font-bold text-xs mb-1 font-mono">4. Lakk. Ref Outgoing Dispatch *</label>
                  <input
                    type="text"
                    value={transferRefNo}
                    onChange={e => setTransferRefNo(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              {/* Appeal Petition Summary */}
              <div>
                <label className="block text-slate-300 font-bold text-xs mb-1">
                  5. Qabiyye fi Ibsa Iyyata Ol'iyyannoo / Transfeeraa (Petition Summary & Particulars)
                </label>
                <textarea
                  rows={3}
                  value={appealSummary}
                  onChange={e => setAppealSummary(e.target.value)}
                  placeholder="Murtii mana murtii jalaatiin keeyyata 180 SDFHH irratti dogoggorri raawwatameera jechuun ol'iyyannoon dhiyaateera..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Digital Seal Attachment Checkbox */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white text-xs">Chaappaa fi Mallattoo Digitaalaa Qabsiisi (Attach Official Digital Seal)</div>
                    <div className="text-[10px] text-slate-400">Sanadni ergame eegumsa cryptographic SHA-256 akka argatu gocha.</div>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={attachingOfficialSeal}
                  onChange={e => setAttachingOfficialSeal(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
                />
              </div>

              {/* Dispatch Action Button */}
              <button
                type="submit"
                disabled={isDispatching}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDispatching ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Galmee Transfeeri Gochuun Gara Mana Murtii Target Ergi (Dispatch Transfer)</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterCourtFileTransferModal;
