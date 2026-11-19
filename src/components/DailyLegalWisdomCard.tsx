import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { Sparkles, Quote, Copy, Check, RefreshCw } from 'lucide-react';

interface DailyLegalWisdomCardProps {
  currentLang: Language;
}

interface LegalWisdom {
  topicOm: string;
  topicAm: string;
  topicEn: string;
  proverbOm: string;
  proverbAm: string;
  proverbEn: string;
  explanationOm: string;
  explanationAm: string;
  explanationEn: string;
  sourceCitation: string;
  category: string;
}

export const DailyLegalWisdomCard: React.FC<DailyLegalWisdomCardProps> = ({ currentLang }) => {
  const [wisdom, setWisdom] = useState<LegalWisdom | null>(() => {
    const saved = localStorage.getItem('seera_daily_wisdom_v2');
    if (saved) {
      try {
        const { quote, date } = JSON.parse(saved);
        if (date === new Date().toDateString()) return quote;
      } catch (e) {}
    }
    return null;
  });

  const [loading, setLoading] = useState(!wisdom);
  const [copied, setCopied] = useState(false);
  const [displayMode, setDisplayMode] = useState<'trilingual' | 'current'>('trilingual');

  const fetchWisdom = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = forceRefresh ? '/api/legal-wisdom?refresh=true' : '/api/legal-wisdom';
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.wisdom) {
        setWisdom(data.wisdom);
        localStorage.setItem('seera_daily_wisdom_v2', JSON.stringify({
          quote: data.wisdom,
          date: new Date().toDateString()
        }));
      }
    } catch (err) {
      console.warn('Failed to load daily wisdom:', err);
      // Fallback wisdom
      setWisdom({
        topicOm: 'Haqa fi Qajeelummaa Gadaa',
        topicAm: 'የእውነትና የፍትህ መርህ',
        topicEn: 'Gadaa Principle of Truth & Justice',
        proverbOm: 'Seerri abbaa tokkooti, haqni immoo kan uummataati. Wal-falmiin dubbiin dhuma, haqni ragaan mirkanaa\'a.',
        proverbAm: 'ሕግ ለሁሉም እኩል ነው፤ ሙግት በቃል ያበቃል፣ ፍትህ በምስክርና በሕግ ይረጋገጣል።',
        proverbEn: 'The law binds all equally; arguments resolve disputes, while evidence and law establish true justice.',
        explanationOm: 'Murtii seeraa keessatti ragaan bu\'uura haqaa ti.',
        explanationAm: 'በፍርድ ሂደት ውስጥ ማስረጃ የፍትህ መሠረት ነው።',
        explanationEn: 'Evidence serves as the cornerstone of judicial truth in all proceedings.',
        sourceCitation: 'Gadaa Legal Maxim & FDRE Constitution Art. 25',
        category: 'Rule of Law'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wisdom) {
      fetchWisdom();
    }
  }, []);

  const handleCopy = () => {
    if (!wisdom) return;
    const text = `⚖️ SEERAAI PRO — Daily Legal Wisdom\n\n[Oromoo]: ${wisdom.proverbOm}\n[Amharic]: ${wisdom.proverbAm}\n[English]: ${wisdom.proverbEn}\n\nSource: ${wisdom.sourceCitation}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (loading && !wisdom) {
    return (
      <div className="bg-slate-900 border border-amber-500/30 rounded-[2.5rem] p-6 shadow-2xl flex items-center justify-center gap-3 text-amber-400 font-mono text-xs animate-pulse">
        <Sparkles className="w-5 h-5 animate-spin" />
        <span>Gemini AI Daily Legal Wisdom fe'amaa jira...</span>
      </div>
    );
  }

  if (!wisdom) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-amber-500/40 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none -mr-32 -mt-32"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-indigo-500/20 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.3em] text-amber-400">
              SEERAAI AI • DAILY LEGAL WISDOM
            </div>
            <h2 className="text-white font-black text-base sm:text-lg flex items-center gap-2">
              <span>{currentLang === 'om' ? wisdom.topicOm : currentLang === 'am' ? wisdom.topicAm : wisdom.topicEn}</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/30">
                {wisdom.category}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setDisplayMode(displayMode === 'trilingual' ? 'current' : 'trilingual')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition"
            title="Switch Language View"
          >
            {displayMode === 'trilingual' ? '🌐 Trilingual View' : '🎯 Single View'}
          </button>
          
          <button 
            onClick={() => fetchWisdom(true)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 hover:text-white transition"
            title="Generate New Wisdom"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="space-y-4 my-6 relative z-10">
        {displayMode === 'trilingual' ? (
          <div className="space-y-4">
            {/* Afaan Oromoo */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                Afaan Oromoo (Gadaa Maxim)
              </span>
              <p className="text-slate-100 text-sm sm:text-base font-serif italic leading-relaxed">
                "{wisdom.proverbOm}"
              </p>
              <p className="text-slate-400 text-xs pt-1">
                {wisdom.explanationOm}
              </p>
            </div>

            {/* Amharic */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-widest block">
                አማርኛ (የሕግ ምሳሌ)
              </span>
              <p className="text-slate-100 text-sm sm:text-base font-serif italic leading-relaxed">
                "{wisdom.proverbAm}"
              </p>
              <p className="text-slate-400 text-xs pt-1">
                {wisdom.explanationAm}
              </p>
            </div>

            {/* English */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                English (Legal Principle)
              </span>
              <p className="text-slate-100 text-sm sm:text-base font-serif italic leading-relaxed">
                "{wisdom.proverbEn}"
              </p>
              <p className="text-slate-400 text-xs pt-1">
                {wisdom.explanationEn}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-3">
            <p className="text-white text-base sm:text-lg font-serif italic leading-relaxed">
              "{currentLang === 'om' ? wisdom.proverbOm : currentLang === 'am' ? wisdom.proverbAm : wisdom.proverbEn}"
            </p>
            <p className="text-slate-300 text-xs leading-relaxed">
              {currentLang === 'om' ? wisdom.explanationOm : currentLang === 'am' ? wisdom.explanationAm : wisdom.explanationEn}
            </p>
          </div>
        )}
      </div>

      {/* Footer Citation & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-indigo-500/20 text-xs relative z-10">
        <div className="text-indigo-300 font-mono flex items-center gap-2">
          <span>📚 Madda:</span>
          <strong className="text-amber-400">{wisdom.sourceCitation}</strong>
        </div>

        <button 
          onClick={handleCopy}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition shadow-lg flex items-center gap-2 active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Wisdom'}</span>
        </button>
      </div>
    </div>
  );
};
