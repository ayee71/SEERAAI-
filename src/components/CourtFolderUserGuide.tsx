import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Folder, 
  FileText, 
  Gavel, 
  Send, 
  ShieldCheck, 
  Building2, 
  Search, 
  Upload, 
  CreditCard, 
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { Language } from '../i18n/translations';

interface CourtFolderUserGuideProps {
  currentLang: Language;
}

export const CourtFolderUserGuide: React.FC<CourtFolderUserGuideProps> = ({ currentLang }) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedExample, setCopiedExample] = useState(false);

  const sampleCaseData = {
    caseNumber: 'MMA/0481/2026',
    courtName: 'Mana Murtii Aanaa Adaamaa - Dhaddacha Hariiroo Hawaasaa',
    plaintiff: 'Obbo Tolasaa Baqqalaa',
    defendant: 'Obbo Gammachuu Dheeressaa',
    subject: 'Falmii Qabeenya Lafaa fi Dhaalaa (Eektara 2.5)',
    sinqeeReceipt: 'SNQ-2026-981447',
    feeAmount: '350.00 ETB (Dambii Lakk. 08)',
    officerSummonsRef: 'SUM-1ST-00481-2026',
    returnHearingDate: '12 Muddee 2026',
    preliminaryObjection: 'Mormii Sadarkaa Duraa (SDFHH Kwt 244 - Yeroo Darbiinsaa)',
    benchRuling: 'Mormiin kufaa ta\'ee deebiin qabatamaa akka dhiyaatu ajajame'
  };

  const handleCopyExample = () => {
    const text = JSON.stringify(sampleCaseData, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2500);
  };

  return (
    <div className="space-y-6 text-slate-100 animate-folder-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-2xl shrink-0 shadow-inner">
              📖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                  Qajeelfama Hojii & Fakkeenya
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  SDFHH Kwt 94-244 & Dambii Lakk. 08
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-serif-legal mt-0.5">
                {currentLang === 'om' 
                  ? 'Qajeelfama Haala Itti Fayyadama Fooldara Mana Murtii (Court Folder User Guide)' 
                  : 'የፍርድ ቤት ማህደር አጠቃቀም መመሪያ እና ምሳሌዎች'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyExample}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto border border-slate-700 shadow"
          >
            {copiedExample ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedExample ? 'Fakkeenyi Garagalfame!' : 'Fakkeenya Galmee Garagalchi'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Step Navigator */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
        {[
          { step: 1, title: '1. Caasaa Fooldaraa', icon: '📂' },
          { step: 2, title: '2. Intake & Nagahee', icon: '💳' },
          { step: 3, title: '3. Waamicha Erguu', icon: '✉️' },
          { step: 4, title: '4. Mormii Duraa (244)', icon: '🛡️' },
          { step: 5, title: '5. Fakkeenya Qabatamaa', icon: '🏛️' },
        ].map(item => (
          <button
            key={item.step}
            type="button"
            onClick={() => setActiveStep(item.step)}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
              activeStep === item.step
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg scale-102 border-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </div>

      {/* Step Content Display */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-xl space-y-6 animate-folder-fade-in">
        {/* Step 1: Caasaa Fooldarootaa */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-amber-400 font-serif-legal flex items-center gap-2">
              <span>📂</span>
              <span>1. Caasaa & Qabiyyee Fooldaroota Mana Murtii (Folder Architecture)</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fooldarri Mana Murtii sanadoota falmii qixa sirriitiin qoqqoodee qaba. Sanadni kamiyyuu akkaataa seera deemsa falmiitiin (SDFHH) fooldara sirrii keessatti kuufama:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <span>📝</span>
                  <span>Fooldara Himannaa (Claims)</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Iyyannoo himataa, unkaa galmee, waraqaa eenyummaa fi sanada hundee himannaa.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span>💳</span>
                  <span>Nagahee Sinqee (Receipts)</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Kaffaltii abbaa seerummaa Baankii Sinqee (Dambii Lakk. 08) fi mirkaneessa kaffaltii.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-purple-400 font-bold flex items-center gap-1.5">
                  <span>✉️</span>
                  <span>Fooldara Waamichaa (Summons)</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Waamicha himatamaa 1ffaa ofiisaraatiin ergamu, teessoo mirkanaa'e fi waamicha 2ffaa dhaddachaa.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-rose-400 font-bold flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Mormii Duraa (Art 244)</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Mormii aangoo, yeroo darbiinsaa, dhimma dur murtii argate fi deebii barreeffamaa.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-blue-400 font-bold flex items-center gap-1.5">
                  <span>🎙️</span>
                  <span>Fooldara Ragaalee (Evidence)</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Ragaa barreeffamaa, sagalee, viidiyoo, jecha ragaa namaa fi gabaasa ogeessaa.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <span>⚖️</span>
                  <span>Ajaja Dhaddachaa (Orders)</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Ajaja yeroo, dhorkaa qabeenyaa, qabiinsa ragaa fi ajaja qorannoo poolisii.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <span>🏛️</span>
                  <span>Murtiiwwan (Judgments)</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Murtii xumuraa dhaddachaa, sababoota seeraa fi waraqaa ajaja raawwii.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <span>📦</span>
                  <span>Kuusaa Sanadaa (Archive)</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Galmee cufame, sanada seena-qabeessa fi waraqaa ragaa ol-iyyannoo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Hojii Ofiisara Seeraa & Kaffaltii Sinqee */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-amber-400 font-serif-legal flex items-center gap-2">
              <span>💳</span>
              <span>2. Simannaa Himannaa & Kaffaltii Baankii Sinqee (Dambii Lakk. 08)</span>
            </h3>
            <div className="text-xs text-slate-300 leading-relaxed space-y-3">
              <p>
                <strong>Tarkaanfii 1:</strong> Himataan iyyannoo fi unkaa himannaa qabatee yeroo dhiyaatu, Ofisarri Seeraa (Legal Officer) dhimma dhiyaate qorata.
              </p>
              <p>
                <strong>Tarkaanfii 2:</strong> Himataan kaffaltii tajaajila abbaa seerummaa Baankii Sinqeetti kaffalee nagahee dhiyeessuu qaba (Dambii Lakk. 08).
              </p>
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-2">
                <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Qajeelfama Dirqamaa: Kaffaltii Mirkaneessuu</span>
                </span>
                <p className="text-[11px] text-slate-300">
                  Hanga kaffaltiin Baankii Sinqee nagaheen mirkanaa'utti waamichi himatamaa hin bahu. Ofisarri Seeraa appii keessatti button <strong>"Mirkaneessi (Verify)"</strong> tuquun nagahee mirkaneessa.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Waamicha Himatamaa Erguu */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-amber-400 font-serif-legal flex items-center gap-2">
              <span>✉️</span>
              <span>3. Waamicha Himatamaa Ofiisara Seeraatiin Erguu (SDFHH Kwt 94-110)</span>
            </h3>
            <div className="text-xs text-slate-300 leading-relaxed space-y-3">
              <p className="text-amber-300 font-semibold">
                "Hojiin ofisara seeraa waamicha erguus dabalata waan taheef, galmeen erga himannaan dhihaate kaffaltiin raawwatamee booda waamicha himatamaa ofisarri seeraa erguu qaba."
              </p>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="font-bold text-xs text-white block">Adeemsa Waamicha Erguu:</span>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-300">
                  <li><strong>Filannoo Karaa Ergaa:</strong> Ofiisara Deemsaa Mana Murtii (Process Server), Poolisiidhaan, Poostaadhaan ykn Beeksisa Dijitaalaatiin.</li>
                  <li><strong>Lakkoofsa Bahii:</strong> Ofisarri Seeraa koodii addaa (Tracking Ref e.g. SUM-1ST-00481) ni kennaaf.</li>
                  <li><strong>Beellama Deebii:</strong> Guyyaa himatamaan deebii barreeffamaa qabatee dhaddachatti dhiyaatu beellama qaba (Guyyoota 14 - 30 gidduutti).</li>
                  <li><strong>Galmee Fooyyessuu:</strong> Erga ergamee booda haalli waamichaa gara <em>"Served / Dispatched"</em> tti jijjiirama.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Mormii Sadarkaa Duraa */}
        {activeStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-amber-400 font-serif-legal flex items-center gap-2">
              <span>🛡️</span>
              <span>4. Mormii Sadarkaa Duraa (SDFHH Kwt 244) & Waamicha 2ffaa</span>
            </h3>
            <div className="text-xs text-slate-300 leading-relaxed space-y-3">
              <p>
                Himatamaan waamichi qaqqabee deebii dura yoo mormii sadarkaa duraa qabaate (Kwt 244):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                  <span className="font-bold text-rose-300">Gosoota Mormii 244:</span>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
                    <li>Manni murtii aangoo hin qabu (Jurisdiction)</li>
                    <li>Dhimmi yeroon darbeera (Limitation/Period)</li>
                    <li>Dhimma duraan murtii argate (Res Judicata)</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-1">
                  <span className="font-bold text-purple-300">Yoo Himatamaan Dhabame:</span>
                  <p className="text-[11px] text-slate-300">
                    Waamichi 1ffaan yoo hin qaqqabne, Abbaan Seeraa ajaja dhaddachaatiin <strong>Waamicha 2ffaa (SDFHH Kwt 105)</strong> akka bahu ajaja.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Fakkeenya Qabatamaa (Concrete Example) */}
        {activeStep === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 font-serif-legal flex items-center gap-2">
                <span>🏛️</span>
                <span>5. Fakkeenya Qabatamaa Galmee Mana Murtii (Real Case Walkthrough)</span>
              </h3>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Status: Hearing Active
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Lakkoofsa Galmee:</span>
                  <span className="font-bold text-white text-sm">{sampleCaseData.caseNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Mana Murtii:</span>
                  <span className="font-bold text-amber-300">{sampleCaseData.courtName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Himataa:</span>
                  <span className="font-bold text-white">{sampleCaseData.plaintiff}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Himatamaa:</span>
                  <span className="font-bold text-white">{sampleCaseData.defendant}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Dhimma Ijoo:</span>
                  <span className="font-bold text-slate-200">{sampleCaseData.subject}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Nagahee Sinqee:</span>
                  <span className="font-bold text-emerald-400">{sampleCaseData.sinqeeReceipt} ({sampleCaseData.feeAmount})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Waamicha Ofiisaraa (1st Summons):</span>
                  <span className="font-bold text-purple-400">{sampleCaseData.officerSummonsRef} (Served)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Beellama Dhaddachaa:</span>
                  <span className="font-bold text-amber-400">{sampleCaseData.returnHearingDate}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-slate-300 space-y-1.5 leading-relaxed">
                <span className="font-bold text-amber-300 block">Tartiiba Galmeen Kun Ittiin Raawwatame:</span>
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>Himataan himannaa dhiyeessee kaffaltii 350 ETB Baankii Sinqeetti raawwate.</li>
                  <li>Ofisarri Seeraa nagahee <code>{sampleCaseData.sinqeeReceipt}</code> mirkaneessee galmee bane.</li>
                  <li>Ofisarri Seeraa waamicha himatamaa 1ffaa <code>{sampleCaseData.officerSummonsRef}</code> gara teessoo himatamaatti erge.</li>
                  <li>Himatamaan beellama gaafa <code>{sampleCaseData.returnHearingDate}</code> duratti deebii fi mormii dhiyeesse.</li>
                  <li>Abbaan seeraa mormii qoratee falmii ijoo dhaddachaatti qabate.</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
