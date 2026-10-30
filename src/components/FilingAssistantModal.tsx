import React, { useState } from 'react';
import { ClipboardList, CheckSquare, Square, X, Sparkles, FileSearch, ShieldCheck } from 'lucide-react';
import { Language } from '../i18n/translations';

interface FilingAssistantModalProps {
  courtLevel: 'first' | 'high' | 'cassation';
  currentLang: Language;
  onClose: () => void;
}

type LitigationStage = 'opening' | 'defense_reply' | 'cassation_pleadings' | 'evidence' | 'hearing' | 'judgment';

export const FilingAssistantModal: React.FC<FilingAssistantModalProps> = ({ courtLevel, currentLang, onClose }) => {
  const [selectedStage, setSelectedStage] = useState<LitigationStage>('opening');

  const getStageData = (stage: LitigationStage) => {
    switch (stage) {
      case 'opening':
        return {
          titleOm: '1. Sadarkaa Jalqabaa / Himannaa Dhiyeessuu (Opening & Filing Phase)',
          titleEn: 'Opening & Filing Phase',
          procedures: [
            'Iyyata Himannaa SDFHH Kwt. 80-92 guutuu ta\'uu isaa mirkaneessi',
            'Kaffaltii abbaa seerummaa (Court fees) kaffalamuu isaa mirkaneessi (SDFHH Kwt. 215)',
            'Teessoo fi waamicha himatamaa qopheessi (SDFHH Kwt. 94)',
            'Sanadoota ragaa barreeffamaa walqabsiisi (SDFHH Kwt. 137)',
            'Mallattoo fi mirkaneessa (Verification oath) guutuu ta\'uu isaa ilaali',
          ],
          evidence: [
            'Waliigaltee ykn ragaa barreeffamaa waliigalchisaa (Contract / Agreement document)',
            'Waraqaa ragaa abbaa qabeenyummaa (Proof of ownership / Title deed)',
            'Waraqaa eenyummaa abbaa dhimmaa ykn bakka-bu\'aa (Power of Attorney)',
            'Rasiidiwwan kaffaltii ykn herrega baankii (Payment receipts / Bank statements)',
          ]
        };
      case 'defense_reply':
        return {
          titleOm: '2. Deebii Himatamaa & Deebii Deebii (Statement of Defense & Plaintiff\'s Reply - SDFHH Kwt. 82/223)',
          titleEn: 'Defense & Reply Phase',
          procedures: [
            'Deebii Himatamaa barreeffamaan dhihaate SDFHH Kwt. 82/95 tiin galmeessuu fi simachuu',
            'Mormii sadarkaa duraa (Preliminary Objections - SDFHH Kwt. 244) dhiyaate adda baasuu',
            'Deebii Deebii Himataa (Plaintiff\'s Counter-Reply / Rejoinder - SDFHH Kwt. 223/241) simachuu',
            'Sanadoota ragaa deebii fi deebii deebii waliin dhihaatan qorachuu',
          ],
          evidence: [
            'Waraqaa Deebii Himatamaa (Respondent\'s Written Defense Statement)',
            'Sanadoota ragaa mormii fi deebii deeggaran (Defense Documentary Evidence exhibits)',
            'Waraqaa Deebii Deebii Himataa (Plaintiff\'s Counter-Reply Brief)',
            'Waraqaa bakka-bu\'iinsa abukaattoo himatamaa (Advocate Power of Attorney)',
          ]
        };
      case 'cassation_pleadings':
        return {
          titleOm: '3. Dhaddacha Ijibbaataa - Deebii & Deebii Deebii (Cassation Answer & Rejoinder Pleadings)',
          titleEn: 'Cassation Pleadings Phase',
          procedures: [
            'Deebii Himatamaa Dhaddacha Ijibbaataa barreeffamaan dhihaate simachuu',
            'Deebii Deebii iyyataas / Himataa Dhaddacha Ijibbaataa simachuu fi galmeessuu',
            'Murtiilee precedent Dhaddacha Ijibbaataa caqasaman (Cassation Volume & File citations) qorachuu',
            'Galmee guutuu Koree Abbootii Seeraa Ijibbaataatiif (5-Judge Cassation Panel) dhiyeessuu',
          ],
          evidence: [
            'Waraqaa Deebii Iyyata Ijibbaataa (Respondent\'s Answer to Cassation Petition)',
            'Waraqaa Deebii Deebii Ijibbaataa (Applicant\'s Rebuttal / Counter-Rejoinder)',
            'Tarree murtiilee ijibbaataa dirqisiisoo ta\'an (Binding Cassation Precedents Citation List)',
            'Koppii murtii mana murtii jalaa fi ol-iyyataa (Certified Lower Court Judgments)',
          ]
        };
      case 'evidence':
        return {
          titleOm: '4. Sadarkaa Ragaa & Qabxii Falmii (Evidence & Issue Framing Phase)',
          titleEn: 'Evidence & Issue Framing Phase',
          procedures: [
            'Mormiiwwan sadarkaa duraa qorachuu (SDFHH Kwt. 244 - Preliminary objections)',
            'Qabxiiwwan falmii ijoo qindeessuu fi murteessuu (SDFHH Kwt. 246 - Issue framing)',
            'Dirqama ragaan eessatti akka kufuu qulqullaa\'uu (Burden of proof / Onus probandi)',
          ],
          evidence: [
            'Tarree abbootii ragaa (List of witnesses) fi gaaffii ragaa',
            'Sanadoota dabalataa ragaaf dhiyaatan (Additional exhibits & documentary evidence)',
            'Gabaasa qorannoo ogeessaa (Expert witness report / Forensic audit if applicable)',
            'Waraqaa ragaa lolaa ykn caalbaasii (Official records / Official letters)',
          ]
        };
      case 'hearing':
        return {
          titleOm: '5. Sadarkaa Dhaga\'aa & Falmii (Hearing & Trial Phase)',
          titleEn: 'Hearing & Trial Phase',
          procedures: [
            'Jecha ragaa dhagahuu fi qormaata fannoo (Examination-in-chief & Cross-examination)',
            'Galmee dhaddachaa irratti ragaa galmeessuu (Court minutes logging)',
            'Falmii xumuraa barreeffamaan ykn afaaniin dhiyeessuu (Closing arguments)',
          ],
          evidence: [
            'Qabxiiwwan falmii xumuraa (Written closing briefs / Legal memorandum)',
            'Wabiiwwan dabalataa yoo barbaachise (Rebuttal evidence)',
            'Tarree murtiiwwan dhaddacha ijoo dhiibbaa qaban (Relevant Cassation Precedents citation list)',
          ]
        };
      case 'judgment':
        return {
          titleOm: '6. Sadarkaa Murtii & Raawwii (Judgment & Closing Phase)',
          titleEn: 'Judgment & Closing Phase',
          procedures: [
            'Murtii barreeffamaan qopheessuu fi sababa seeraa ibsuu (SDFHH Kwt. 182)',
            'Koppii murtii abbootii dhimmaatiif kennuu (Certified copy issuance)',
            'Raawwii murtii eegaluu (Execution of judgment - SDFHH Kwt. 371)',
          ],
          evidence: [
            'Unka iyyannoo raawwii murtii (Application for execution - SDFHH Kwt. 378)',
            'Tarree qabeenya qabamuu qabu (Schedule of property for attachment - SDFHH Kwt. 406)',
            'Koppii murtii dhumaa (Final judgment certified copy for appeal or execution)',
          ]
        };
    }
  };

  const currentData = getStageData(selectedStage);
  const [procedureChecks, setProcedureChecks] = useState<boolean[]>(new Array(currentData.procedures.length).fill(false));
  const [evidenceChecks, setEvidenceChecks] = useState<boolean[]>(new Array(currentData.evidence.length).fill(false));

  const handleStageChange = (stage: LitigationStage) => {
    setSelectedStage(stage);
    const newData = getStageData(stage);
    setProcedureChecks(new Array(newData.procedures.length).fill(false));
    setEvidenceChecks(new Array(newData.evidence.length).fill(false));
  };

  const toggleProcedure = (index: number) => {
    setProcedureChecks(prev => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const toggleEvidence = (index: number) => {
    setEvidenceChecks(prev => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const courtTitle = 
    courtLevel === 'first' ? 'Mana Murtii Sadarkaa Jalaa (First Instance)' :
    courtLevel === 'high' ? 'Mana Murtii Ol-aanaa (High Court Appeal)' : 'Dhaddacha Ijibbaataa (Cassation)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/75">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Filing Assistant & Suggested Evidence Checklist</h3>
              <p className="text-xs text-slate-400 font-mono">{courtTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stage Selector Tabs */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap gap-2">
          {[
            { id: 'opening', label: '1. Opening & Claim' },
            { id: 'defense_reply', label: '2. Deebii & Deebii Deebii' },
            { id: 'cassation_pleadings', label: '3. Dhaddacha Ijibbaataa' },
            { id: 'evidence', label: '4. Evidence & Issues' },
            { id: 'hearing', label: '5. Hearing & Trial' },
            { id: 'judgment', label: '6. Judgment & Execution' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => handleStageChange(st.id as LitigationStage)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStage === st.id
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Stage Title */}
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{currentData.titleOm}</span>
          </div>

          {/* Procedural Requirements Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Mandatory Procedural Requirements (Ulaagaalee Adeemsa Seeraa)</span>
            </h4>
            <div className="space-y-2">
              {currentData.procedures.map((proc, index) => (
                <div
                  key={index}
                  onClick={() => toggleProcedure(index)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    procedureChecks[index]
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300 line-through'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-white'
                  }`}
                >
                  {procedureChecks[index] ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium leading-relaxed">{proc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Evidence & Documents Checklist */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <FileSearch className="w-4 h-4 text-cyan-400" />
              <span>Suggested Evidence & Documents Checklist (Ragaalee Barbaachisoo)</span>
            </h4>
            <div className="space-y-2">
              {currentData.evidence.map((ev, index) => (
                <div
                  key={index}
                  onClick={() => toggleEvidence(index)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    evidenceChecks[index]
                      ? 'bg-cyan-950/20 border-cyan-500/30 text-slate-300 line-through'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-white'
                  }`}
                >
                  {evidenceChecks[index] ? (
                    <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium leading-relaxed">{ev}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Total Completed: {procedureChecks.filter(Boolean).length + evidenceChecks.filter(Boolean).length} / {procedureChecks.length + evidenceChecks.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
