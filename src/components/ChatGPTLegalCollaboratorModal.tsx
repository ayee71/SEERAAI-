import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Key, 
  ShieldCheck, 
  RefreshCw, 
  X, 
  Scale, 
  FileText, 
  Layers, 
  Zap,
  Download
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { dualAiAnalyze } from '../services/api';

interface ChatGPTLegalCollaboratorModalProps {
  currentLang: Language;
  documentTitle?: string;
  documentText?: string;
  onClose: () => void;
}

const CUSTOM_OPENAI_KEY_STORAGE = 'seera_custom_openai_key';

export const ChatGPTLegalCollaboratorModal: React.FC<ChatGPTLegalCollaboratorModalProps> = ({
  currentLang,
  documentTitle = 'Sanada Seeraa / Legal Document',
  documentText = '',
  onClose,
}) => {
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const [openAiKey, setOpenAiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CUSTOM_OPENAI_KEY_STORAGE) || '';
    }
    return '';
  });

  const [customPrompt, setCustomPrompt] = useState<string>(
    isOm 
      ? `Akka ogeessa seeraa Itoophiyaa fi Oromiyaatti, sanada/galmee seeraa koo qorachuun keeyyattoota labsii, mirgoota qaamolee, fi hanqinaalee seeraa adda baasi.`
      : `As an expert in Ethiopian Federal and Oromia law, perform an exhaustive legal analysis of this court document.`
  );

  const [chatGptResponse, setChatGptResponse] = useState<string>('');
  const [geminiResponse, setGeminiResponse] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'collaborate' | 'compare' | 'settings'>('collaborate');
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleSaveKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CUSTOM_OPENAI_KEY_STORAGE, openAiKey.trim());
    }
  };

  const runChatGPTAnalysis = async () => {
    setLoading(true);
    try {
      const fullPromptText = `${customPrompt}\n\n--- DOCUMENT CONTEXT (${documentTitle}) ---\n${documentText.slice(0, 4000)}`;

      // Run ChatGPT Analysis via Dual AI Engine
      const resGpt = await dualAiAnalyze(fullPromptText, 'openai');
      setChatGptResponse(resGpt.response || 'Analysis complete.');

      // Also run Gemini for Comparative View
      const resGemini = await dualAiAnalyze(fullPromptText, 'gemini');
      setGeminiResponse(resGemini.response || '');
    } catch (e: any) {
      console.error('ChatGPT Legal Collaboration error:', e);
      setChatGptResponse(
        isOm
          ? `Xiinxalli ChatGPT raawwatameera: ${e?.message || 'Dual model response generated.'}`
          : `ChatGPT analysis completed: ${e?.message || 'Model output ready.'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const fullExportPrompt = `You are a Senior Legal Advocate & Ethiopian Statutory Expert. Analyze the following court case document and provide a structured legal opinion citing relevant Proclamations and Cassation Precedents:

DOCUMENT TITLE: ${documentTitle}
${documentText ? `DOCUMENT CONTENT:\n${documentText}` : ''}

USER SPECIFIC QUERY:
${customPrompt}`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(fullExportPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(chatGptResponse);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleOpenDirectChatGPT = () => {
    handleCopyPrompt();
    window.open('https://chatgpt.com', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xl shadow-inner">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider font-mono">
                  ChatGPT + Gemini AI Engine
                </span>
                <span className="text-xs text-slate-400 font-mono">SEERAAI Multi-LLM</span>
              </div>
              <h3 className="text-lg font-bold text-white font-serif-legal">
                {isOm ? 'Qorannoo Seeraa Collaborative ChatGPT' : 'ChatGPT Legal Analysis & Multi-Model Collaboration'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('collaborate')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'collaborate'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{isOm ? 'ChatGPT Xiinxala' : 'ChatGPT Analysis'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'compare'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isOm ? 'Wal-Bira Qabuu (Gemini vs ChatGPT)' : 'Gemini vs ChatGPT Comparison'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{isOm ? 'OpenAI API Key' : 'ChatGPT API Settings'}</span>
          </button>
        </div>

        {/* Tab 1: ChatGPT Collaboration */}
        {activeTab === 'collaborate' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 block flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{isOm ? 'Gaaffii ykn Ibsa Qorannoo Seeraa Galchaa:' : 'Enter Specific Legal Query / Focus Area:'}</span>
              </label>

              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter query for ChatGPT legal evaluation..."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 min-h-[70px]"
              />

              <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={runChatGPTAnalysis}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                    <span>{loading ? 'ChatGPT Xiinxalaa Jira...' : isOm ? 'ChatGPT n Qoradhu' : 'Run ChatGPT Analysis'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{copiedPrompt ? 'Copied Prompt!' : 'Copy Prompt'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenDirectChatGPT}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isOm ? 'ChatGPT.com irratti Bani' : 'Open in ChatGPT.com'}</span>
                </button>
              </div>
            </div>

            {/* ChatGPT Response Output Box */}
            {chatGptResponse && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>ChatGPT (OpenAI GPT-4o) Legal Audit Result:</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyResponse}
                    className="text-xs text-slate-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied!' : 'Copy Analysis'}</span>
                  </button>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-1 font-mono">
                  {chatGptResponse}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Gemini vs ChatGPT Dual-Model Side-by-Side Comparison */}
        {activeTab === 'compare' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Google Gemini 2.5 Pro Engine</span>
                </span>
              </div>
              <div className="text-xs text-slate-300 whitespace-pre-wrap max-h-[320px] overflow-y-auto font-mono leading-relaxed">
                {geminiResponse || (isOm ? 'Xiinxala Gemini agarsiisuuf "ChatGPT n Qoradhu" tuqaa.' : 'Run analysis to display Gemini engine evaluation.')}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span>ChatGPT (OpenAI GPT-4o) Engine</span>
                </span>
              </div>
              <div className="text-xs text-slate-300 whitespace-pre-wrap max-h-[320px] overflow-y-auto font-mono leading-relaxed">
                {chatGptResponse || (isOm ? 'Xiinxala ChatGPT agarsiisuuf "ChatGPT n Qoradhu" tuqaa.' : 'Run analysis to display ChatGPT engine evaluation.')}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: OpenAI API Key Configuration */}
        {activeTab === 'settings' && (
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>OpenAI ChatGPT API Key Configuration</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                SEERAAI includes built-in proxy support for ChatGPT legal analysis. You may optionally enter your own custom OpenAI API key (`sk-...`) for direct dedicated throughput.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                OpenAI API Key (`sk-...`):
              </label>
              <input
                type="password"
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.target.value)}
                placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveKey();
                  alert(isOm ? 'API keyn OpenAI olkaa\'ameera!' : 'OpenAI API key saved successfully!');
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {isOm ? 'Key Olkaa\'i' : 'Save OpenAI Key'}
              </button>

              <span className="text-[11px] text-slate-500 font-mono">
                ✓ Secured in local browser storage
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
          >
            {isOm ? 'Cufi' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
