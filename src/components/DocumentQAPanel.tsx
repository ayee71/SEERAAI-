import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Scale,
  Brain,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ShieldAlert,
  Gavel,
  Zap,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { askDocumentQuestion, DocumentQuestionResponse } from '../services/api';
import { requestNotificationPermission, showNotification } from '../utils/notification';
import { translations } from '../i18n/translations';

interface DocumentQAPanelProps {
  documentText?: string;
  templateContext?: {
    title?: string;
    lawBasis?: string;
    category?: string;
    formData?: Record<string, string>;
  };
  documentTitle?: string;
  currentLang: Language;
  customSuggestedQuestions?: string[];
  initiallyOpen?: boolean;
}

export const DocumentQAPanel: React.FC<DocumentQAPanelProps> = ({
  documentText,
  templateContext,
  documentTitle = 'Sanada Seeraa',
  currentLang,
  customSuggestedQuestions,
  initiallyOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [question, setQuestion] = useState('');
  const [modelTier, setModelTier] = useState<string>('gemini-flash-lite-latest');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qaHistory, setQaHistory] = useState<DocumentQuestionResponse[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const t = translations[currentLang];

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const defaultSuggestedQuestions: Record<Language, string[]> = {
    om: [
      'Waliigaltee kana keessatti keeyyatoonni balaa seeraa qaban kamfa\'i?',
      'Kaffaltiin beenyaa fi haalli addaan kutuu Labsii 1156/2019 eegaa?',
      'Waliigalteen kun DARA biratti galmaa\'uu ni dirqamaa (Koodii Siivilii 1723)?',
      'Yoo qaamni tokko waliigaltee diige tarkaanfiin seeraa fi beenyaan maali?',
    ],
    am: [
      'በዚህ ሰነድ ውስጥ የሕግ ክፍተት ወይም ስጋት ያለባቸው አንቀጾች የትኞቹ ናቸው?',
      'የውል ማቋረጥ እና የካሳ ክፍያ ሁኔታው ከአዋጅ 1156/2011 ጋር ይስማማል?',
      'ይህ ውል በሰነዶች ማረጋገጫ (DARA) መመዝገብ አለበት (ፍትሐብሔር 1723)?',
      'አንደኛው ወገን ውሉን ቢያፈርስ የሕግ መፍትሔው እና ካሳው ምንድን ነው?',
    ],
    en: [
      'What are the high-risk or ambiguous clauses in this drafted document?',
      'Are the termination and severance terms compliant with Labor Proclamation 1156/2019?',
      'Does this contract require mandatory authentication under Civil Code Art. 1723?',
      'What legal remedies and damages are available if a party breaches?',
    ],
  };

  const activeSuggested =
    customSuggestedQuestions && customSuggestedQuestions.length > 0
      ? customSuggestedQuestions
      : defaultSuggestedQuestions[currentLang] || defaultSuggestedQuestions.om;

  const handleAsk = async (queryToAsk?: string) => {
    const q = (queryToAsk || question).trim();
    if (!q) return;

    if (!documentText?.trim() && !templateContext) {
      setError(
        currentLang === 'om'
          ? 'Odeeffannoon sanadaa yookiin template hin argamne.'
          : 'Document text or template context is required.'
      );
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(
        currentLang === 'om'
          ? 'Intarneeta malee gaaffii haaraa AI\'n gaafachuun hin danda\'amu.'
          : currentLang === 'am'
          ? 'ያለ ኢንተርኔት አዲስ ጥያቄ በ AI መጠየቅ አይቻልም።'
          : 'Internet connection is required to ask AI questions.'
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    if (!queryToAsk) setQuestion('');

    try {
      const res = await askDocumentQuestion({
        documentText: documentText || undefined,
        templateContext: templateContext || undefined,
        question: q,
        language: currentLang,
        modelTier,
      });

      setQaHistory((prev) => [res, ...prev]);
      showNotification(t.actions.notificationTitle, t.actions.notificationBody);
    } catch (err: any) {
      setError(err.message || 'Deebii argachuun hin danda\'amne.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAnswer = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {}
  };

  return (
    <div className="mt-6 bg-slate-900 border border-amber-500/30 rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-950/80 p-4 border-b border-slate-800/80 flex items-center justify-between text-left cursor-pointer hover:bg-slate-950 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              <span>
                {currentLang === 'om'
                  ? 'Iddoo Gaaffii fi Qorannoo Seeraa Sanadichaa'
                  : currentLang === 'am'
                  ? 'የሰነዱ የሕግ ጥያቄና ማብራሪያ መድረክ'
                  : 'Legal Q&A & Statutory Consultation'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold border border-amber-500/30">
                AI Senior Counsel
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentLang === 'om'
                ? `Gaaffii waliigaltee "${documentTitle}" fi seera Itoophiyaa irratti qabdan gaafadhaa, deebii sirrii argadhaa.`
                : currentLang === 'am'
                ? `ስለ "${documentTitle}" ውል እና የኢትዮጵያ ሕጎች ማንኛውንም ጥያቄ ይጠይቁ፣ ትክክለኛ የሕግ ምላሽ ያግኙ።`
                : `Ask any statutory inquiry regarding "${documentTitle}" under Ethiopian law.`}
            </p>
          </div>
        </div>

        <div className="text-slate-400 p-1">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Engine Model Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {currentLang === 'om'
                  ? 'Moodeela Qorannoo Seeraa (Gemini Engine):'
                  : 'የትንተና ሞዴል (Gemini AI Engine):'}
              </span>
            </span>

            <div className="flex items-center gap-1.5">
              {[
                { id: 'gemini-flash-lite-latest', label: '⚡ Flash Lite (Recommended)' },
                { id: 'gemini-3.1-flash-lite', label: '⚖️ Gemini 3.1 Flash Lite' },
                { id: 'gemini-flash-latest', label: '🧠 Gemini Flash' },
                { id: 'gemini-3.5-pro', label: 'Pro 3.5' },
                { id: 'gemini-3.5-flash', label: 'Flash 3.5' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModelTier(m.id)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    modelTier === m.id
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Suggested Questions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {currentLang === 'om'
                ? 'Gaaffilee Yeroo Baay\'ee Gaafataman (Click to Ask Instantly):'
                : currentLang === 'am'
                ? 'የተለመዱ ጥያቄዎች (በቀጥታ ለመጠየቅ ይጫኑ):'
                : 'Frequently Asked Questions (Click to Ask Instantly):'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {activeSuggested.map((sq, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAsk(sq)}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/60 text-[11px] text-slate-300 hover:text-amber-200 transition-all text-left cursor-pointer flex items-start gap-2 hover:bg-slate-950"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{sq}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ask Input Form */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder={
                currentLang === 'om'
                  ? 'Fkn: Labsii 1156/2019 bu\'uuraan yeroo yaalii keessatti ari\'uun ni danda\'amaa? Keeyyata kam faana wal-qabata?...'
                  : currentLang === 'am'
                  ? 'ምሳሌ፡ በአዋጅ 1156/2011 መሰረት በሙከራ ጊዜ ስንብት ይቻላል? የትኞቹን አንቀጾች መጥቀስ አለብኝ?...'
                  : 'E.g., What are the statutory requirements for termination under Labor Proclamation 1156/2019?...'
              }
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 transition-all min-h-[44px]"
            />
            <button
              type="button"
              onClick={() => handleAsk()}
              disabled={isLoading || !question.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-amber-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shrink-0 min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{currentLang === 'om' ? 'Qorachaa jira...' : 'በመመለስ ላይ...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{currentLang === 'om' ? 'Gaafadhu' : currentLang === 'am' ? 'ጠይቅ' : 'Ask'}</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Q&A History Display */}
          {qaHistory.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Gavel className="w-4 h-4 text-amber-400" />
                  <span>Deebii fi Gorsa Seeraa Kennaman ({qaHistory.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setQaHistory([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                >
                  Haquu (Clear History)
                </button>
              </div>

              {qaHistory.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                          Gaaffii Keessan (Client Query):
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5">
                          {item.question}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyAnswer(item.answer, index)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60 shrink-0"
                      title="Copy Legal Assessment"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-semibold">Waraabameera!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Waraabi (Copy)</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 font-sans">
                    {item.answer}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/50 gap-2">
                    <span className="flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        AI Engine: <strong className="text-amber-300">{item.modelUsed || modelTier}</strong>
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        ✓ Bu'uura Seeraa Qaba (Legally Grounded)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                        FDRE Statutory Compliance
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
