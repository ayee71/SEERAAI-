import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent, GenerateResponse } from '../services/api';
import { DocumentViewer } from '../components/DocumentViewer';
import { getUserSettings } from '../services/storage';

interface SocialMediaViewProps {
  currentLang: Language;
  onNavigateToLegislation?: () => void;
}

export const SocialMediaView: React.FC<SocialMediaViewProps> = ({ currentLang, onNavigateToLegislation }) => {
  const t = translations[currentLang];

  const [platform, setPlatform] = useState<'facebook' | 'telegram'>('facebook');
  const [topic, setTopic] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'om' | 'am' | 'en'>('all');
  const [cardTemplate, setCardTemplate] = useState<'modern' | 'classic' | 'alert'>('modern');
  const [showBranding] = useState(getUserSettings().showShareBranding ?? true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const sampleTopics = [
    {
      title: "Mirga Kireeffataa / የተከራይ መብት",
      text: "Mirga kireeffataa manaa yoo kireessaan waliigalteen utuu hin dhumatin kireessaa dabaluuf dirqisiise. Seera Koodii Siiviilii keeyyata 2896 bu'uura godhadhu.",
    },
    {
      title: "Hojii irraa ari'uu / ከስራ ማሰናበት",
      text: "Hojjetaa heeyyama malee guyyoota shaniif hojii irraa hafe akeekkachiisa malee ari'uun danda'amaa? Labsii 1156/2019 keeyyata 27.",
    },
    {
      title: "Mirga Qabeenya Dhuunfaa / የንብረት መብት",
      text: "Mootummaan misoomaaf jedhee yoo lafa fudhate, kaffaltii beenyaa fi iddoo bakka bu'iinsaa akkamitti kaffalama? Heera FDRE keeyyata 40.",
    },
  ];

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setError(null);

    const taskType = platform === 'facebook' ? 'social_facebook' : 'social_telegram';
    const outputLanguages: Language[] = selectedFormat === 'all' ? ['om', 'am', 'en'] : [selectedFormat];

    try {
      const resp = await generateLegalContent({
        prompt: topic,
        taskType,
        outputLanguages,
      });
      setResult(resp);
    } catch (e: any) {
      setError(e.message || 'Social post generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getTemplateClassName = () => {
    switch (cardTemplate) {
      case 'classic':
        return 'rounded-2xl border-2 border-amber-500/40 bg-stone-950 overflow-hidden shadow-xl max-w-md mx-auto font-serif';
      case 'alert':
        return 'rounded-2xl border-2 border-rose-500/60 bg-rose-950/40 overflow-hidden shadow-xl max-w-md mx-auto';
      case 'modern':
      default:
        return 'rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md max-w-md mx-auto';
    }
  };

  return (
    <div className="space-y-8 pb-16 overflow-y-auto max-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-100 flex items-center gap-3">
          <span className="text-3xl">📢</span>
          <span>{t.socialView.title}</span>
        </h1>
        <p className="mt-1 text-slate-400 text-sm">{t.socialView.subtitle}</p>
      </div>

      {/* Official Social Links & Telegram Harvesting Banner */}
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-xl">
            📢
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Kallattii Telegram & Facebook Na Quunamaa (Official Channels & Ingestion)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gaaffii seeraa qabduuf ykn Telegram channel <strong className="text-cyan-300">@wakoyeb</strong> fi <strong className="text-cyan-300">@ayelebeharmee</strong> irraa seera kuufachuuf:
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <a
            href="https://t.me/ayelebeharmee"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <span>✈️</span>
            <span>Telegram (Qunnamaa)</span>
          </a>
          <a
            href="https://t.me/wakoyeb"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <span>⚖️</span>
            <span>@wakoyeb (Telegram)</span>
          </a>
          <a
            href="https://www.facebook.com/AyyuLawyer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <span>📘</span>
            <span>Facebook Page</span>
          </a>
        </div>
      </div>

      {/* Platform & Language Format Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          {/* Platform Tab Buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              {t.socialView.platformTitle}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlatform('facebook')}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2.5 font-semibold text-sm transition-all cursor-pointer ${
                  platform === 'facebook'
                    ? 'bg-blue-950 border-blue-500 text-blue-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📘</span>
                <span>Facebook</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('telegram')}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2.5 font-semibold text-sm transition-all cursor-pointer ${
                  platform === 'telegram'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>✈️</span>
                <span>Telegram</span>
              </button>
            </div>

            {/* Trilingual Format Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Format Option:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('all')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    selectedFormat === 'all'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All 3 Languages
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat('om')}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                    selectedFormat === 'om'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Afaan Oromoo
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat('am')}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                    selectedFormat === 'am'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  አማርኛ
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat('en')}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                    selectedFormat === 'en'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  English
                </button>
              </div>

              <div className="mt-3 text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {platform === 'facebook' ? (
                  <span>
                    ✓ Schema for All 3: <strong className="text-amber-400">⚖️ MATA-DUREE</strong> (Oromo) ━━━━━━━━━━━━ <strong className="text-amber-400">⚖️ ርዕስ</strong> (Amharic) ━━━━━━━━━━━━ <strong className="text-amber-400">⚖️ TITLE</strong> (English) + Hashtags.
                  </span>
                ) : (
                  <span>
                    ✓ Schema for Telegram: Clean bullet points with emoji tags and separate copy blocks ready for broadcast channels.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Topic Input */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Legal Subject / Topic:
              </label>
              <div className="flex gap-1">
                {sampleTopics.map((st, i) => (
                  <button
                    key={i}
                    onClick={() => setTopic(st.text)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {st.title}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.socialView.topicPlaceholder}
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all leading-relaxed"
            />

            <button
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">🔄</span>
                  <span>{t.actions.generating}</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>
                    {platform === 'facebook' ? t.socialView.generateFacebook : t.socialView.generateTelegram}
                  </span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-950 border border-red-800 text-red-200 text-xs flex items-start gap-2">
              <span className="text-red-400 text-sm">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Output Column & Live Share Card Preview */}
        <div className="lg:col-span-6 space-y-6">
          {/* Real-time Share Card Preview Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">📱</span>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base font-serif">
                  {currentLang === 'om' ? 'Mul\'isa Kaardii Qooddinsaa (Live Share Card Preview)' : 'የማህበራዊ ሚዲያ ማጋራት ቅድመ እይታ'}
                </h3>
              </div>

              {/* Template Selector Bar */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {[
                  { id: 'modern', label: 'Modern' },
                  { id: 'classic', label: 'Classic Legal' },
                  { id: 'alert', label: 'Alert' },
                ].map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setCardTemplate(tmpl.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      cardTemplate === tmpl.id
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Preview Simulator with Template Styles */}
            <div className={getTemplateClassName()}>
              <div className="relative">
                <img
                  src="/legal-lady-justice.jpg"
                  alt="SAI Ethio Share Preview"
                  className="w-full aspect-[16/9] object-cover"
                  referrerPolicy="no-referrer"
                />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h4 className="text-lg font-bold text-white line-clamp-2 drop-shadow-md mb-2">
                      {topic.trim() || "Legal Summary Title"}
                    </h4>
                    <div className="text-xs text-slate-200 font-medium tracking-widest uppercase">
                      seeraai.com
                    </div>
                    {showBranding && (
                      <div className="mt-2 text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                        Ayele Beharmee | Legal Practitioner
                      </div>
                    )}
                  </div>
                </div>
              </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Layout Template: <strong className="text-amber-400 uppercase">{cardTemplate}</strong></span>
              <span className="text-emerald-400 font-bold">✓ www.saorethio1.com</span>
            </div>
          </div>

          {result ? (
            <DocumentViewer
              currentLang={currentLang}
              content={result.content}
              separatedVersions={result.separatedVersions}
              outputLanguages={result.outputLanguages}
              title={`Social Media Post (${platform.toUpperCase()})`}
              taskType={platform === 'facebook' ? 'social_facebook' : 'social_telegram'}
              promptUsed={topic}
            />
          ) : (
            <div className="min-h-[260px] rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 text-xl mb-3">
                📢
              </div>
              <h3 className="text-sm font-semibold text-slate-300">
                {t.socialView.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
                Maxxansa haaraa qopheessuun Facebook fi Telegram irratti qoodaa.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
