import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { AanaaGurbichaECourtDashboard } from '../components/AanaaGurbichaECourtDashboard';
import { Scale, FileText, Search, Gavel, ShieldCheck, Download, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface GurbichaCourtPracticeProps {
  currentLang: Language;
}

export const GurbichaCourtPractice: React.FC<GurbichaCourtPracticeProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulation'>('dashboard');
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: 'Galmeessuu (Registration)',
      desc: 'Himannaa Mana Murtii Aanaa Gurbichaatti galmeessuu.',
      icon: <FileText className="w-6 h-6" />,
      action: 'Document Scanner Banii'
    },
    {
      title: 'Qorannoo Ragaa (Evidence Review)',
      desc: 'Ragaalee dhiyaatan qulqulleessuu fi kaffaltii Baankii Sinqee mirkaneessuu.',
      icon: <Search className="w-6 h-6" />,
      action: 'Verify Payment'
    },
    {
      title: 'Dhaddacha (Hearing)',
      desc: 'Jecha ragaa fuudhuu fi galmeessuu.',
      icon: <Gavel className="w-6 h-6" />,
      action: 'Start Session Log'
    },
    {
      title: 'Murtoo (Judgment)',
      desc: 'Murtii dhumaa barreessuu fi chaappaa digitalii itti dibuu.',
      icon: <ShieldCheck className="w-6 h-6" />,
      action: 'Generate Final PDF'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Tab Switcher */}
      <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-xl text-slate-950 font-bold">
            🏛️
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Mana Murtii Aanaa Gurbicha</h2>
            <p className="text-xs text-slate-400 font-mono">Judicial Workstation & E-Court Interactive Environment</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📊 E-Court Daashboordii
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'simulation'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            🎮 Practice Simulation
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'dashboard' ? (
        <AanaaGurbichaECourtDashboard currentLang={currentLang} />
      ) : (
        <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  activeStep === idx 
                    ? 'bg-amber-500/10 border-amber-500 shadow-lg ring-1 ring-amber-500/50' 
                    : 'bg-slate-950 border-slate-800 opacity-60'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  activeStep === idx ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {step.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
                <p className="text-[11px] text-slate-400 leading-tight mb-4">{step.desc}</p>
                {activeStep === idx && (
                  <button 
                    onClick={() => setActiveStep(prev => (prev + 1) % steps.length)}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded-lg transition-all uppercase tracking-tighter cursor-pointer"
                  >
                    {step.action}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Galmee Hojiirra Jiru (Active Practice Case)
                </h4>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase">
                  Simulation Active
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-y border-slate-900">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Lakk. Galmee</p>
                  <p className="text-sm font-mono text-white">MMA-GUR/001/2026</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Himataa</p>
                  <p className="text-sm text-white">Obbo Araarsaa Magarsaa</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Himatamaa</p>
                  <p className="text-sm text-white">Adde Boontuu Firoomsaa</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Dhimma</p>
                  <p className="text-sm text-white">Waliigaltee Gurgurtaa Manaa</p>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Haala Galmee Yeroo Ammaa:
                </div>
                <p className="text-xs text-slate-400 italic">
                  {activeStep === 0 && "Maaloo himannaa bifa PDF tiin scan godhaatii galmee kana jalqabaa."}
                  {activeStep === 1 && "Kaffaltiin Baankii Sinqee birrii 1,250 mirkanaa'uu eegaa jira. Nagahee scan godhaa."}
                  {activeStep === 2 && "Dhaddachi guraandhala 12, 2026tti beellamameera. Jecha ragaa waraabuuf qophaa'aa."}
                  {activeStep === 3 && "Murtii qophaa'e irratti chaappaa 'MMA GURBICHA' dibuun gara PDFtti jijjiiraa."}
                </p>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <Download className="w-4 h-4" />
                  Download Case File
                </button>
                <button className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Next Stage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
