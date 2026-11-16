import React from 'react';
import { Language, translations } from '../i18n/translations';
import type { SavedLegalDocument } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { getStoredOwnerKey } from '../services/referralTracking';
import { isOwnerAccount } from '../services/ownerAuth';
import ethiopianJusticeLogo from '../assets/images/seera_justice_logo_1791301056650.jpg';
import { RouteStatusIndicator } from '../components/RouteStatusIndicator';

interface HomeViewProps {
  currentLang: Language;
  onNavigate: (tab: string) => void;
  onSelectSavedDoc?: (doc: SavedLegalDocument) => void;
  onSelectRecentSearch?: (query: string, category: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentLang,
  onNavigate,
}) => {
  const t = translations[currentLang];
  const { user } = useAuth();

  // UI-level owner check only. Backend authorization is still required.
  const isOwner = Boolean(
    user &&
      isOwnerAccount(
        user.email,
        user.displayName,
        getStoredOwnerKey()
      )
  );

  const labels = {
    telegram:
      currentLang === 'om'
        ? 'Chaanala Telegram SeeraAI Seeni'
        : currentLang === 'am'
          ? 'የSeeraAI ቴሌግራም ቻናል ተቀላቀል'
          : 'Join Telegram Channel',

    repository:
      currentLang === 'om'
        ? 'Kuusaa Labsii fi Dambiiwwanii (Ofumaan Haaromfama)'
        : currentLang === 'am'
          ? 'የሕጎችና ደንቦች ማከማቻ (በራስ-ሰር ይዘምናል)'
          : 'Legislation Repository (Auto-Sync)',

    guide:
      currentLang === 'om'
        ? 'Kaayyoo, Faayidaa fi Qajeelfama'
        : currentLang === 'am'
          ? 'ዓላማ፣ ጥቅም እና መመሪያ'
          : 'Vision, Benefits & Guide',

    voice:
      currentLang === 'om'
        ? 'Sagalee gara Barreeffamaatti (Afaanota 3)'
        : currentLang === 'am'
          ? 'ድምፅን ወደ ጽሑፍ መቀየሪያ (3 ቋንቋዎች)'
          : 'Voice to Text (3 Languages)',

    ocr:
      currentLang === 'om'
        ? 'Suuraa fi Faayila gara Barreeffamaatti'
        : currentLang === 'am'
          ? 'ምስልና ሰነድን ወደ ጽሑፍ መቀየሪያ (OCR)'
          : 'Image & Document OCR',

    owner:
      currentLang === 'om'
        ? 'Hordoffii Fayyadama fi Yaada (Owner Inbox)'
        : currentLang === 'am'
          ? 'የአጠቃቀም ክትትልና አስተያየት (Owner Inbox)'
          : 'Live Usage & Feedback (Owner Inbox)',

    templates:
      currentLang === 'om'
        ? "Sanadoota Qophaa'oo fi Unkaalee"
        : currentLang === 'am'
          ? 'የተዘጋጁ ሰነዶችና ቅጾች'
          : 'Ready-made Documents & Templates',
  };

  return (
    <div className="space-y-10 pb-16">
      <section
        aria-labelledby="seeraai-hero-title"
        className="
          relative rounded-3xl overflow-hidden
          border border-slate-800 bg-slate-900
          p-6 sm:p-8 lg:p-12 shadow-2xl
        "
      >
        <div
          className="
            flex flex-col lg:flex-row
            items-start lg:items-center
            justify-between gap-8 relative z-10
          "
        >
          <div className="w-full max-w-3xl">
            <div
              className="
                inline-flex items-center gap-2
                px-3 py-1.5 rounded-full
                bg-amber-500/10 border border-amber-500/30
                text-amber-300 text-xs font-mono mb-4
              "
            >
              <span aria-hidden="true">⚖️</span>
              <span>Afaan Oromoo • አማርኛ • English</span>
            </div>

            <div className="mb-4">
              <RouteStatusIndicator />
            </div>

            <h1
              id="seeraai-hero-title"
              className="
                text-3xl sm:text-5xl font-serif-legal
                font-bold tracking-tight text-white leading-tight
              "
            >
              {t.home.heroTitle}
            </h1>

            <p
              className="
                mt-4 text-base sm:text-lg text-slate-300
                leading-relaxed font-sans
              "
            >
              {t.home.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://t.me/seeraai_ethio"
                target="_blank"
                rel="noopener noreferrer"
                title="Join the official SeeraAI Telegram channel"
                aria-label={labels.telegram}
                className="
                  flex items-center gap-2.5 px-5 py-3 rounded-xl
                  bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600
                  hover:from-sky-400 hover:to-blue-500
                  text-white font-black text-sm
                  shadow-xl shadow-sky-500/30 transition-all
                  active:scale-95 border border-sky-400/40
                "
              >
                <span aria-hidden="true">✈️</span>
                <span>{labels.telegram}</span>
                <span
                  className="
                    text-[10px] px-2 py-0.5 rounded-full
                    bg-white/20 text-white font-mono
                    uppercase tracking-wider font-bold
                  "
                >
                  @seeraai_ethio
                </span>
              </a>

              <button
                type="button"
                onClick={() => onNavigate('legislationRepository')}
                className="
                  flex items-center gap-2 px-5 py-3 rounded-xl
                  bg-gradient-to-r from-amber-500 to-amber-600
                  hover:from-amber-400 hover:to-amber-500
                  text-slate-950 font-black text-sm
                  shadow-lg shadow-amber-950/30 transition-all active:scale-95
                "
              >
                <span aria-hidden="true">📚</span>
                <span>{labels.repository}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('appGuide')}
                className="
                  flex items-center gap-2 px-5 py-3 rounded-xl
                  bg-amber-500/20 hover:bg-amber-500/30
                  text-amber-300 font-bold text-sm shadow-lg
                  transition-all border border-amber-500/50
                "
              >
                <span aria-hidden="true">🎯</span>
                <span>{labels.guide}</span>
                <span aria-hidden="true">➔</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('voiceToText')}
                className="
                  flex items-center gap-2 px-5 py-3 rounded-xl
                  bg-amber-500/20 hover:bg-amber-500/30
                  text-amber-300 font-bold text-sm shadow-lg
                  transition-all border border-amber-500/50
                "
              >
                <span aria-hidden="true">🎙️</span>
                <span>{labels.voice}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('fileToText')}
                className="
                  flex items-center gap-2 px-5 py-3 rounded-xl
                  bg-blue-500/20 hover:bg-blue-500/30
                  text-blue-300 font-bold text-sm shadow-lg
                  transition-all border border-blue-500/50
                "
              >
                <span aria-hidden="true">📷</span>
                <span>{labels.ocr}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="
                  flex items-center gap-2 px-5 py-3 rounded-xl
                  bg-slate-800 hover:bg-slate-700
                  text-slate-100 font-semibold text-sm
                  border border-slate-700 transition-all
                "
              >
                <span aria-hidden="true">✍️</span>
                <span>{t.home.ctaCreate}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('explainLaw')}
                className="
                  flex items-center gap-2 px-5 py-3 rounded-xl
                  bg-slate-800 hover:bg-slate-700
                  text-slate-100 font-semibold text-sm
                  border border-slate-700 transition-all
                "
              >
                <span aria-hidden="true">⚖️</span>
                <span>{t.home.ctaExplain}</span>
              </button>

              {isOwner ? (
                <button
                  type="button"
                  onClick={() => onNavigate('analyticsFeedback')}
                  className="
                    flex items-center gap-2 px-5 py-3 rounded-xl
                    bg-emerald-950 hover:bg-emerald-900
                    text-emerald-300 font-semibold text-sm
                    border border-emerald-500/40 transition-all
                  "
                >
                  <span aria-hidden="true">📊</span>
                  <span>{labels.owner}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('templates')}
                  className="
                    flex items-center gap-2 px-5 py-3 rounded-xl
                    bg-amber-500/15 hover:bg-amber-500/25
                    text-amber-300 font-semibold text-sm
                    border border-amber-500/40 transition-all
                  "
                >
                  <span aria-hidden="true">📝</span>
                  <span>{labels.templates}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate('translate')}
                className="
                  flex items-center gap-2 px-5 py-3 rounded-xl
                  bg-slate-800 hover:bg-slate-700
                  text-slate-100 font-semibold text-sm
                  border border-slate-700 transition-all
                "
              >
                <span aria-hidden="true">🌐</span>
                <span>{t.home.ctaTranslate}</span>
              </button>
            </div>
          </div>

          <div
            className="
              shrink-0 flex flex-col items-center justify-center
              p-4 rounded-3xl bg-slate-950/90
              border border-amber-500/40 shadow-2xl
              w-full max-w-[210px] mx-auto lg:mx-0
            "
          >
            <div
              className="
                w-32 h-32 rounded-2xl overflow-hidden
                border border-amber-500/50 shadow-xl
                relative group
              "
            >
              <img
                src={ethiopianJusticeLogo}
                alt="SeeraAI Official Ethiopian Lady Justice Emblem"
                loading="lazy"
                decoding="async"
                className="
                  w-full h-full object-cover
                  transition-transform duration-500
                  group-hover:scale-110
                "
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
