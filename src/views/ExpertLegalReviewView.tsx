import React, { useState } from 'react';
import { Sparkles, Scale, Search, BookOpen, Save, Loader2, Volume2, CheckCircle2 } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { saveLegalInterpretation } from '../services/legalQnARepository';
import { suggestLexiconAddition, getStoredLexiconSuggestions, LexiconSuggestion } from '../services/ttsLexicon';
import { generateLegalContent } from '../services/api';

interface ExpertLegalReviewViewProps {
  currentLang: Language;
}

export const ExpertLegalReviewView: React.FC<ExpertLegalReviewViewProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const [activeTab, setActiveTab] = useState<'analysis' | 'pronunciationManager'>('analysis');

  // Analysis State
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pronunciation Manager State
  const [termInput, setTermInput] = useState('');
  const [phoneticInput, setPhoneticInput] = useState('');
  const [langInput, setLangInput] = useState<'om' | 'am' | 'en'>('om');
  const [categoryInput, setCategoryInput] = useState<'statute' | 'institution' | 'legal_term' | 'proper_name'>('legal_term');
  const [suggestedByInput, setSuggestedByInput] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mySuggestions, setMySuggestions] = useState<LexiconSuggestion[]>(getStoredLexiconSuggestions());

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysis('');

    try {
      const data = await generateLegalContent({
        prompt: `As a legal expert with over 50 years of experience, please analyze: ${query}`,
        taskType: 'explain_law',
        outputLanguages: [currentLang],
      });
      setAnalysis(data.content);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!analysis) return;
    try {
      await saveLegalInterpretation({
        query,
        interpretation: analysis,
        createdAt: new Date().toISOString(),
      });
      alert('Interpretation saved!');
    } catch (err) {
      alert('Error saving interpretation');
    }
  };

  const handlePronunciationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termInput.trim() || !phoneticInput.trim()) return;

    suggestLexiconAddition({
      term: termInput.trim(),
      phonetic: phoneticInput.trim(),
      lang: langInput,
      suggestedBy: suggestedByInput.trim() || 'Legal Professional',
    });

    setSuccessMsg(currentLang === 'om' ? 'Jechiin kun sirna sagaleessuutiif galchameera! Bulchaan (Admin) ni ilaala.' : 'Pronunciation term submitted to queue for Admin approval!');
    setTermInput('');
    setPhoneticInput('');
    setMySuggestions(getStoredLexiconSuggestions());
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="p-6 bg-slate-900 text-slate-100 min-h-screen space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-3 font-serif-legal text-amber-400">
          <Scale className="text-emerald-500" />
          {currentLang === 'om' ? 'Qorannoo Ogeessa Seeraa & Sagaleessuu' : 'Expert Legal Review & Pronunciation Manager'}
        </h1>

        {/* Sub Navigation */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'analysis' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {currentLang === 'om' ? 'Xiinxala Seeraa (Analysis)' : 'Expert Analysis'}
          </button>
          <button
            onClick={() => setActiveTab('pronunciationManager')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pronunciationManager' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {currentLang === 'om' ? 'Bulchiinsa Sagaleessuu (TTS Lexicon)' : 'Legal Pronunciation Manager'}
          </button>
        </div>
      </div>

      {activeTab === 'analysis' ? (
        <div className="space-y-6">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter legal provision, Cassation Bench case, or legal question..."
              className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm"
              rows={4}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-3 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium flex items-center gap-2 cursor-pointer text-sm shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              Analyze with 50+ Years Expert Knowledge
            </button>
          </div>

          {error && <div className="p-4 bg-red-900/50 text-red-200 rounded-xl text-sm">{error}</div>}

          {analysis && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-400">
                <BookOpen size={20} />
                Expert Interpretation
              </h2>
              <div className="prose prose-invert prose-emerald max-w-none whitespace-pre-wrap text-sm text-slate-300">
                {analysis}
              </div>
              <button
                onClick={handleSave}
                className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Save size={16} />
                Save Interpretation
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submission Form */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Volume2 className="w-6 h-6" />
              <h2 className="text-lg font-serif-legal font-bold">
                {currentLang === 'om' ? 'Jecha Haaraa Sagaleessuuf Galchi' : 'Submit New Legal Term Pronunciation'}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Jecha seeraa, maqaa bakkaa ykn gabaasa afaan Oromoo, Amharic, ykn English sirriitti akka dubbifamuun phonetic transcription isaa galchaa.'
                : 'Help improve TTS accuracy by submitting specialized Ethiopian legal terms and their precise phonetic transcriptions.'}
            </p>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePronunciationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Jecha Seeraa (Legal Term / Name)' : 'Legal Term'}
                </label>
                <input
                  type="text"
                  value={termInput}
                  onChange={(e) => setTermInput(e.target.value)}
                  placeholder="e.g. Mirkaneessa, Abukaattoo"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Sagaleessuu Phonetic (Phonetic Transliteration)' : 'Phonetic Spelling'}
                </label>
                <input
                  type="text"
                  value={phoneticInput}
                  onChange={(e) => setPhoneticInput(e.target.value)}
                  placeholder="e.g. Mir-ka-nees-sa"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {currentLang === 'om' ? 'Afaan (Language)' : 'Language'}
                  </label>
                  <select
                    value={langInput}
                    onChange={(e: any) => setLangInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="om">Afaan Oromoo</option>
                    <option value="am">Amharic (አማርኛ)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {currentLang === 'om' ? 'Maqaa Qopheessaa (Suggested By)' : 'Your Name / Title'}
                  </label>
                  <input
                    type="text"
                    value={suggestedByInput}
                    onChange={(e) => setSuggestedByInput(e.target.value)}
                    placeholder="Abbaa Seeraa / Ogeessa"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all"
              >
                {currentLang === 'om' ? 'Gara Qajeelcha Admin-tti Ergii' : 'Submit to Admin Approval Queue'}
              </button>
            </form>
          </div>

          {/* Queue Status List */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-lg font-serif-legal font-bold text-slate-200">
              {currentLang === 'om' ? 'Tarree Gaaffii Sagaleessuu Keessanii' : 'Your Submitted Pronunciation Queue'}
            </h2>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Gaaffiin kun Bulchaan (Admin) hanga mirkanaa\'utti tursiisni argama.'
                : 'Items pending review and approval by the platform administrator.'}
            </p>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {mySuggestions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  {currentLang === 'om' ? 'Galchiin hin jiru.' : 'No pending submissions.'}
                </div>
              ) : (
                mySuggestions.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300 text-sm">{s.term}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">{s.lang}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Phonetic: <span className="text-emerald-400 font-mono">{s.phonetic}</span> • By: {s.suggestedBy}
                      </div>
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        s.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
