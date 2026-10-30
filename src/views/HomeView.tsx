import React from 'react';
import { Language, translations } from '../i18n/translations';
import { getSavedDocuments, SavedLegalDocument, getRecentSearches } from '../services/storage';
import { RecentSearches } from '../components/RecentSearches';
import { useAuth } from '../context/AuthContext';
import { getStoredOwnerKey } from '../services/referralTracking';
import { isOwnerAccount } from '../services/ownerAuth';
import { CheckCircle2 } from 'lucide-react';
import ethiopianJusticeLogo from '../assets/images/seera_justice_logo_1791301056650.jpg';
import { InteractiveAppGuideBoxes } from '../components/InteractiveAppGuideBoxes';

interface HomeViewProps {
  currentLang: Language;
  onNavigate: (tab: string) => void;
  onSelectSavedDoc?: (doc: SavedLegalDocument) => void;
  onSelectRecentSearch?: (query: string, category: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentLang,
  onNavigate,
  onSelectSavedDoc,
  onSelectRecentSearch,
}) => {
  const t = translations[currentLang];
  const { user } = useAuth();
  const isOwner = isOwnerAccount(user?.email, user?.displayName, getStoredOwnerKey());
  const recentDocs = getSavedDocuments().slice(0, 4);
  const recentSearchesList = getRecentSearches();

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 p-8 sm:p-12 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono mb-4">
            <span>⚖️</span>
            <span>Afaan Oromoo • አማርኛ • English</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif-legal font-bold tracking-tight text-white leading-tight">
            {t.home.heroTitle}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-sans">
            {t.home.heroSubtitle}
          </p>

          {/* Quick CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://t.me/seeraai_ethio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-sky-500/30 transition-all cursor-pointer active:scale-95 border border-sky-400/40"
              title="Join official SeeraAI Telegram channel for real-time legal updates"
            >
              <span className="text-base">✈️</span>
              <span>{currentLang === 'om' ? 'Chaanala Telegram SeeraAI Seeni' : currentLang === 'am' ? 'የSeeraAI ቴሌግራም ቻናል ተቀላቀል' : 'Join Telegram Channel'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono uppercase tracking-wider font-bold">@seeraai_ethio</span>
            </a>

            <button
              onClick={() => onNavigate('legislationRepository')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-950/30 transition-all cursor-pointer"
            >
              <span>📚</span>
              <span>Kuusaa Labsiilee & Dambiilee (Auto-Sync)</span>
            </button>

            <button
              onClick={() => onNavigate('appGuide')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-sm shadow-lg transition-all border border-amber-500/50"
            >
              <span>🎯</span>
              <span>
                {currentLang === 'om' ? 'Kaayyoo, Faayidaa & Guide' : currentLang === 'am' ? 'ዓላማ፣ ጥቅም እና መመሪያ' : 'Vision, Benefits & Guide'}
              </span>
              <span>➔</span>
            </button>

            <button
              onClick={() => onNavigate('voiceToText')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-sm shadow-lg transition-all border border-amber-500/50 cursor-pointer"
            >
              <span>🎙️</span>
              <span>{currentLang === 'om' ? 'Sagalee ➔ Barreeffama (Afaan 3\'n)' : currentLang === 'am' ? 'የድምፅ ወደ ጽሑፍ መቀየሪያ' : 'Voice to Text (3 Languages)'}</span>
            </button>

            <button
              onClick={() => onNavigate('fileToText')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold text-sm shadow-lg transition-all border border-blue-500/50 cursor-pointer"
            >
              <span>📷</span>
              <span>{currentLang === 'om' ? 'Suuraa & Faayila ➔ Barreeffama' : currentLang === 'am' ? 'የምስልና ሰነድ ወደ ጽሑፍ (OCR)' : 'Image & Document OCR'}</span>
            </button>

            <button
              onClick={() => onNavigate('create')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 transition-all cursor-pointer"
            >
              <span>✍️</span>
              <span>{t.home.ctaCreate}</span>
            </button>

            <button
              onClick={() => onNavigate('explainLaw')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 transition-all"
            >
              <span>⚖️</span>
              <span>{t.home.ctaExplain}</span>
            </button>

            {isOwner ? (
              <button
                onClick={() => onNavigate('analyticsFeedback')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-semibold text-sm border border-emerald-500/40 transition-all"
              >
                <span>📊</span>
                <span>Hordoffii Live & Yaada (Owner Inbox)</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('templates')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold text-sm border border-amber-500/40 transition-all"
              >
                <span>📝</span>
                <span>Sanadoota Qophaa'an & Unkaalee</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('translate')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 transition-all"
            >
              <span>🌐</span>
              <span>{t.home.ctaTranslate}</span>
            </button>
          </div>
          {/* Official SeeraAI Emblem Badge without text below */}
          <div className="shrink-0 flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-950/90 border border-amber-500/40 shadow-2xl max-w-[210px] my-auto">
            <div className="w-32 h-32 rounded-2xl overflow-hidden border border-amber-500/50 shadow-xl relative group">
              <img
                src={ethiopianJusticeLogo}
                alt="SeeraAI Official Ethiopian Lady Justice Emblem"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
          </div>
        </div>

        {/* Sirna Haqaa Ammayyeessuu Keessatti Gahee Teeknooloojii Card */}
        <div 
          onClick={() => onNavigate('digitalJustice')}
          className="mt-8 p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-2xl group relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                ⚖️
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase border border-amber-500/30">
                    Sirna Haqaa Ammayyaa • 6 Pillars
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span>🎥</span> Google Meet Official Ready
                  </span>
                </div>
                <h3 className="font-serif-legal font-bold text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors mt-1">
                  {currentLang === 'om'
                    ? 'Sirna Haqaa Ammayyeessuu Keessatti Gahee Teeknooloojii'
                    : currentLang === 'am'
                    ? 'የፍትህ ሥርዓትን በማዘመን የቴክኖሎጂ ሚና እና አስተዋፅዖ'
                    : 'The Role of Technology in Modernizing the Judicial System'}
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl mt-1 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Galmee Dijitaalaa, Nageenya & Audit, Mallattoo Dijitaalaa SHA-256, Cituu Interneetii/Ibsaa, Beellama & Yeroon Darbiinsaa, fi Dhaddacha Viidiyoo Google Meet official ta\'e dhimmootaaf qopheessaa!'
                    : currentLang === 'am'
                    ? 'ዲጂታል የኬስ መዝገብ፣ የደህንነት ኦዲት፣ የSHA-256 ዲጂታል ፊርማ፣ የመብራትና ኔትወርክ መቋረጥ መከላከያ፣ የቀጠሮና የይርጋ ክትትል እንዲሁም የጎግል ሚት ቀጥታ ችሎት በአንድ ላይ!'
                    : 'Digital case dockets, RBAC security audit, SHA-256 cryptographic signatures, outage resilience, statutory limitation engine, and official Google Meet virtual courtroom sessions.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-4 py-2.5 rounded-xl bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5">
                <span>Bani (Open Hub)</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Discovery Card: Bizarre But Real World Laws by Continent */}
        <div 
          onClick={() => onNavigate('worldBizarreLaws')}
          className="mt-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/30 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-xl group relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🌍
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase">
                    Haaraa • Ardi-Ardiidhaan
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">6 Continents</span>
                </div>
                <h3 className="font-serif-legal font-bold text-base sm:text-lg text-slate-100 group-hover:text-amber-300 transition-colors">
                  {currentLang === 'om'
                    ? 'Seerota Addunyaa Bitaa-Galeeyyii & Dhugaa (Bizarre Real Laws)'
                    : currentLang === 'am'
                    ? 'የዓለማችን አስገራሚና እንግዳ እውነተኛ ሕጎች (በአህጉር)'
                    : 'Bizarre & Curious But Real World Laws by Continent'}
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl line-clamp-1 mt-0.5">
                  {currentLang === 'om'
                    ? 'Afrikaa, Awurooppaa, Eeshiyaa, Ameerikaa fi Osheeshiyaa keessatti seerota qoosaa fakkaatan garuu dhugaa ta\'an seera Itoophiyaa waliin ilaalaa!'
                    : 'ቀልድ የሚመስሉ ነገር ግን እውነተኛ የሆኑትን የዓለማችን ሕጎች ከአህጉር አህጉር ከኢትዮጵያ ሕግ ጋር በማነጻጸር ይመልከቱ!'}
                </p>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shrink-0 group-hover:bg-amber-400 transition-colors shadow flex items-center gap-1.5">
              <span>Bani (Explore)</span>
              <span>→</span>
            </div>
          </div>
        </div>

        {/* Live Legal Meeting & Conference Room Card (Browser Direct Access) */}
        <div
          onClick={() => onNavigate('meeting')}
          className="mt-6 p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border-2 border-amber-500/50 shadow-2xl relative overflow-hidden group hover:border-amber-400 transition-all cursor-pointer"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform">
                📹
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase border border-emerald-500/30 animate-pulse">
                    🔴 Live WebRTC Conference Active
                  </span>
                  <span className="text-[10px] text-sky-300 font-mono">
                    Chrome • Edge • Safari Direct Link
                  </span>
                </div>
                <h3 className="font-serif-legal font-bold text-base sm:text-lg text-amber-200 mt-1">
                  {currentLang === 'om'
                    ? 'Iddoo Walgahii & Marii Seeraa (Legal Meeting Room)'
                    : currentLang === 'am'
                    ? 'የሕግ ክርክር እና የቀጥታ ውይይት ክፍል (Meeting)'
                    : 'Live Legal Case Conference & Meeting Room'}
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl mt-0.5 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Linkii application kanaa banuun hirmaattota, abukaattota fi maamiltoota waliin kallattiin Chrome ykn Edge irraa walgahii marii seeraa gaggeessaa. Video live, qaboo guyyaa, fi AI gargaaraa dhaddachaa of keessaa qaba.'
                    : currentLang === 'am'
                    ? 'ይህን ሊንክ በመክፈት ማንኛውም ተሳታፊ፣ ጠበቃ ወይም ደንበኛ በ Chrome ወይም Edge በቀጥታ ስብሰባ ማድረግ ይችላሉ። የቀጥታ ቪዲዮ፣ የቃለ-ጉባዔ መዝገብ እና የAI ረዳት አካቷል።'
                    : 'Join or start instant courtroom conferences directly from Chrome, Edge, Safari, or mobile. Features encrypted video, shared case minutes, and in-meeting legal AI.'}
                </p>
              </div>
            </div>

            <div className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shrink-0 group-hover:bg-amber-400 transition-colors shadow flex items-center gap-2">
              <span>Walgahii Seeni (Join / Share)</span>
              <span>→</span>
            </div>
          </div>
        </div>

        {/* Prominent Courtroom Kiosk Access Link & Code Banner */}
        <div
          onClick={() => onNavigate('courtroomControl')}
          className="mt-6 p-6 rounded-3xl bg-slate-950 border-2 border-amber-500/50 shadow-2xl relative overflow-hidden group hover:border-amber-400 transition-all cursor-pointer"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform">
                📱
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase border border-amber-500/30">
                    Bakka Ifa Ta'e (Prominent Kiosk Access)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Direct Email, Telegram, SMS & FB Dispatch
                  </span>
                </div>
                <h3 className="font-serif-legal font-bold text-base sm:text-lg text-amber-300 mt-1">
                  {currentLang === 'om'
                    ? 'Linkii Kiosk & Koodii Dhaddacha Mana Murtii (Courtroom Kiosk Access)'
                    : 'የፍርድ ቤት ኪዮስክ መግቢያ ሊንክ እና ኮድ'}
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl mt-0.5 leading-relaxed font-mono">
                  URL: <span className="text-amber-300 font-bold">https://.../kiosk</span> • Recipient: <span className="text-sky-300 font-bold">ayeledha@gmail.com</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {currentLang === 'om'
                    ? 'Linkii fi koodii Kiosk erguu, QR kodii skaan gochuu, fi to’annoo WebSocket kallattiin geggeessuuf as tuquun banadhaa.'
                    : 'የኪዮስክ ሊንክ እና ኮድ ለመላክ፣ QR ኮድ ለማንበብ እና የዌብሶኬት ቁጥጥር ለማካሄድ እዚህ ይጫኑ።'}
                </p>
              </div>
            </div>

            <div className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shrink-0 group-hover:bg-amber-400 transition-colors shadow flex items-center gap-2">
              <span>Linkii Kiosk Ergi / Bani</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </div>

        {/* Trilingual Equality Stat Badges */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <span>🏛️</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Constitution</span>
            </div>
            <div className="text-sm font-semibold text-slate-200">{t.home.quickStats.constitution}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <span>📖</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legislation</span>
            </div>
            <div className="text-sm font-semibold text-slate-200">{t.home.quickStats.proclamations}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <span>⚖️</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jurisprudence</span>
            </div>
            <div className="text-sm font-semibold text-slate-200">{t.home.quickStats.cassation}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <span>🏆</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trilingual</span>
            </div>
            <div className="text-sm font-semibold text-slate-200">{t.home.quickStats.languages}</div>
          </div>
        </div>
      </div>

      {/* Interactive App Guide & Improvements Boxes (Sanduuqawwan Fooyyainsaa & Haala Itti Fayyadamaa) */}
      <InteractiveAppGuideBoxes 
        currentLang={currentLang} 
        onNavigate={onNavigate} 
      />

      {/* Creation History & Rapid Adoption Milestone Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <span>📜</span>
              <span>{currentLang === 'om' ? 'Seenaa Kalaqa Appii' : currentLang === 'am' ? 'የመተግበሪያው አመሰራረት ታሪክ' : 'Founding Story'}</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-serif-legal font-bold text-slate-100">
              {currentLang === 'om'
                ? 'Seenaa Uumama Appii SeeraAI & Gulantaa Milkaa\'inaa'
                : currentLang === 'am'
                ? 'የSeeraAI መተግበሪያ አመሰራረት ታሪክ እና የዕድገት ምዕራፍ'
                : 'SeeraAI Founding History & Rapid Adoption Milestone'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {currentLang === 'om'
                ? 'Appichi yoom akka kalaqame fi haala saffisaan fayyadamtoota kumaatamaan horate'
                : 'መተግበሪያው መቼ እንደተፈጠረ እና በጥቂት ቀናት ውስጥ ያሳየው ከፍተኛ ተቀባይነት'}
            </p>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs shrink-0 shadow-md">
            <span>✨ 100,000+ Views & Users</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          {/* Left Column: Founding History */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <span className="text-amber-400 text-xs font-bold block uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>👨‍⚖️</span>
              <span>
                {currentLang === 'om' ? 'Uumama & Kalaqa (Creation Story):' : currentLang === 'am' ? 'የመተግበሪያው አመሰራረት፦' : 'Creation & Founding:'}
              </span>
            </span>
            <p className="text-slate-300 text-xs leading-relaxed">
              {currentLang === 'om'
                ? 'Platformiin SeeraAI (SAI Ethio) ogeessa seeraa Ayele Be Dha dhaan hawaasaa fi ogeeyyii seeraaf qorannoo seeraa, waliigaltee qopheessuu, fi xiinxala murteewwan dhaddacha ijoo ammayyeessuuf bara 2026 keessa kalaqame. Mul\'anni isaa inni ijoon teeknooloojii AI fayyadamuun tajaajila seeraa bilisaan dhiheessuudha.'
                : currentLang === 'am'
                ? 'የSeeraAI (SAI Ethio) መተግበሪያ በህግ ባለሙያ አየለ በላይነህ በ2026 ዓ.ም የተፈጠረ ሲሆን፣ ለህግ ባለሙያዎች፣ ዳኞች፣ ጠበቆችና ለማህበረሰቡ ነጻ የህግ አገልግሎትን፣ የውል ዝግጅትን እና የሰበር ውሳኔዎች ምርምርን ተደራሽ ለማድረግ የተዘጋጀ የላቀ መድረክ ነው።'
                : 'SeeraAI (SAI Ethio) was created in 2026 by legal practitioner Ayele Belayneh to modernize Ethiopian legal research, contract drafting, and cassation precedent analysis through cutting-edge AI.'}
            </p>
          </div>

          {/* Right Column: Rapid Growth Milestone */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2.5">
            <span className="text-emerald-400 text-xs font-bold block uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>🚀</span>
              <span>
                {currentLang === 'om' ? 'Guddina Saffisaa (Rapid Milestone):' : currentLang === 'am' ? 'የስኬት እና ዕድገት ምዕራፍ፦' : 'Rapid Growth Milestone:'}
              </span>
            </span>
            <p className="text-slate-300 text-xs leading-relaxed">
              {currentLang === 'om'
                ? 'Appichi eebbifamee guyyoota muraasa keessatti daawwattoota fi fayyadamtoota kumaatama hedduu (100,000+ views & active users) horachuun, seera qorachuu fi murtee dhaddacha ijoo sakatta\'uuf platformii filatamaa ta\'ee jira. Guyyaa guyyaan gaaffiiwwan seeraa kumaatamaan deebii itti kennuu danda\'era.'
                : currentLang === 'am'
                ? 'መተግበሪያው ከተጀመረ በጥቂት ቀናት ውስጥ ብቻ በብዙ ሺዎች የሚቆጠሩ (ከ100,000 በላይ) ተጠቃሚዎችን እና ተጎብኚዎችን በማፍራት፣ የሰበር ውሳኔዎችን እና የሕግ ምርምርን ለማከናወን በኢትዮጵያ ውስጥ ተመራጭ መድረክ ለመሆን በቅቷል።'
                : 'Within just a few days of its initial launch, the platform achieved massive adoption—reaching over 100,000+ views and active users, making it a premier legal AI engine in Ethiopia.'}
            </p>
          </div>
        </div>

        {/* Global Access & Research Scope Highlight */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 text-xs space-y-3 shadow-inner">
          <span className="text-amber-400 font-bold uppercase font-mono tracking-wider flex items-center gap-2 text-xs">
            <span className="text-lg">🌍</span>
            <span>
              {currentLang === 'om'
                ? 'Daangaa Qorannoo fi Qaqqabummaa (Research & Access Scope):'
                : currentLang === 'am'
                ? 'የምርምርና የተደራሽነት ወሰን (Research & Access Scope)፦'
                : 'Research & Global Access Scope:'}
            </span>
          </span>
          <p className="text-slate-300 leading-relaxed text-sm font-sans italic">
            {currentLang === 'om'
              ? 'Platformiin SeeraAI (SAI Ethio) daangaa tokko malee (Borderless) tajaajila seeraa Itoophiyaa bifa digitaliitiin addunyaa gubbaa eessayyuu ta\'anii akka itti fayyadaman qopheesse. Qorannoon isaas Labsiilee Federaalaa, Caffee Oromiyaa, fi Murteewwan Dhaddacha Ijoo Itoophiyaa waggoota 60 olii (Bara 1950-2016) of keessatti qabata. Keessumaa dhaalattoota biyya keenyaa biyya alaa jiraataniif (Ethiopian Diaspora) fi ogeessota biyya alaa dhimma seeraa Itoophiyaa hordofaniif carraa guddichadha. Appicha fayyadamuuf daangaa biyya keenyaa keessa jiraachuun dirqama miti; kutaalee addunyaa hunda irraa tajaajila qulqulluu fi saffisaa argachuu ni danda\'u.'
              : currentLang === 'am'
              ? 'የSeeraAI (SAI Ethio) መድረክ ያለ ምንም ገደብ የኢትዮጵያን ሕጎች እና የሕግ አገልግሎቶችን በዲጂታል መልክ በዓለም ዙሪያ ለሚገኙ ተጠቃሚዎች በሙሉ እንዲደርስ ተደርጎ የተዘጋጀ ነው። የምርምር ሽፋኑም የፌዴራልና የጨፌ ኦሮሚያ አዋጆችን እንዲሁም ያለፉትን 60 ዓመታት የሰበር ውሳኔዎችን (ከ1950-2016 ዓ.ም) ያጠቃልላል። ይህንን መተግበሪያ ለመጠቀም በሀገር ውስጥ መገኘት ግዴታ አይደለም፤ ከየትኛውም የዓለም ክፍል ሆነው የሕግ ምርምር ማከናወን ይችላሉ።'
              : 'SeeraAI (SAI Ethio) provides borderless digital access to Ethiopian legal services worldwide. Our research scope encompasses Federal and Oromia Proclamations, as well as 60 years of Supreme Court Cassation Precedents (1958-2024 G.C). Specifically designed for the Ethiopian Diaspora and international scholars, it offers full utility regardless of physical location.'}
          </p>
        </div>
      </div>

      {/* Research-backed Vision, Purpose, Benefits, and Problem vs. Solution comparative section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl relative overflow-hidden">
        {/* Header Section */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
            <span>📋</span>
            <span>
              {currentLang === 'om'
                ? 'Qorannoo Madda Rakkoowwan Seeraa fi Furmaata SeeraAI'
                : currentLang === 'am'
                ? 'የሕግ አሠራር ችግሮችና የSeeraAI መፍትሔዎች የምርምር ትንተና'
                : 'Research Framework: Legal Problems vs. SeeraAI Solutions'}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3.5xl font-serif-legal font-bold text-slate-100 leading-tight">
            {currentLang === 'om'
              ? 'Kaayyoo, Faayidaa & Mul\'ata Platformii SAI Ethio'
              : currentLang === 'am'
              ? 'የSAI Ethio መድረክ ራዕይ፣ ጥቅምና ዓላማ'
              : 'The Core Vision, Purpose & Benefits of SAI Ethio'}
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {currentLang === 'om'
              ? 'SAI Ethio (www.saorethio1.com) rakkoowwan gurguddoo qabatamaan tajaajila seeraa Itoophiyaa keessatti mudachaa turan teeknooloojii AI ammayyaatiin furuuf mul\'ata gadi fageenyaa qaba. Armaan gadiitti maddoota rakkoo fi furmaataa qorannoo irratti hundaa\'ee waliin ilaali.'
              : currentLang === 'am'
              ? 'SAI Ethio (www.saorethio1.com) በኢትዮጵያ የሕግ አገልግሎት ላይ ለዓመታት ሲከሰቱ የነበሩ ዋና ዋና ችግሮችን በላቀ የሰው ሰራሽ አስተዋፅኦ (AI) ቴክኖሎጂ ለመፍታት ሰፊ ራዕይ ሰንቋል። ከዚህ በታች የምርምር ችግሮችን እና መፍትሄዎችን ጎን ለጎን ይመልከቱ።'
              : 'SAI Ethio (www.saorethio1.com) is strategically engineered to bridge critical gaps in the Ethiopian legal ecosystem using cutting-edge AI technologies. Explore our research-driven diagnostic mapping of problems and tailored digital solutions.'}
          </p>
        </div>

        {/* Vision, Purpose & Benefit Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/25 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <span className="text-xl">🌟</span>
              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                {currentLang === 'om' ? 'Mul\'ata Keenya' : currentLang === 'am' ? 'ራዕያችን' : 'Our Vision'}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              {currentLang === 'om'
                ? 'Sirna seeraa Itoophiyaa teeknooloojii AI sadarkaa olaanaan ammayyeessuu, wal-qixxummaa afaanota sadeenii mirkaneessuu, fi dhimmoota falmii daqiiqaa muraasa keessatti qulqulluun xiinxaluu.'
                : currentLang === 'am'
                ? 'የኢትዮጵያን የሕግ ሥርዓት በዘመናዊ አርቴፊሻል ኢንተለጀንስ (AI) ማዘመን፣ የባለሦስት ቋንቋዎችን እኩልነት ማረጋገጥ እና የሕግ ክርክሮችንና ሰነዶችን በሴኮንዶች ውስጥ መተንተን።'
                : 'To revolutionize the Ethiopian legal landscape through modern AI integration, ensuring trilingual linguistic parity and providing highly accurate document analyses within seconds.'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/25 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="text-xl">🎯</span>
              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                {currentLang === 'om' ? 'Kaayyoo Keenya' : currentLang === 'am' ? 'ዓላማችን' : 'Our Purpose'}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              {currentLang === 'om'
                ? 'Ogeeyyii seeraa fi lammiilee gargaaruun yeroo, baasii, fi balaa seeraa qophii waliigaltee fi barbaacha murteewwan dhaddacha ijoo keessatti mudatan guutummaatti oolchuu fi dhabamsiisuudha.'
                : currentLang === 'am'
                ? 'የሕግ ባለሙያዎችን እና ማህበረሰቡን በመደገፍ ጊዜን፣ ገንዘብን እና በውል ሰነዶች ዝግጅትና በሰበር ውሳኔዎች ፍለጋ ላይ የሚከሰቱ ሕጋዊ ስጋቶችን (legal risks) በከፍተኛ ሁኔታ ማስወገድ።'
                : 'To empower legal practitioners and citizens alike by mitigating legal risks, minimizing operational costs, and optimizing workflow efficiency in contract drafting and precedent search.'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-cyan-500/25 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="text-xl">💡</span>
              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                {currentLang === 'om' ? 'Faayidaa Ijoo' : currentLang === 'am' ? 'ዋና ጥቅሞች' : 'Key Benefits'}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              {currentLang === 'om'
                ? 'Iftoomina guutuu uumuu, qorannoo seeraa gabaabsuu, herrega gibiraa 2% (withholding tax) labsii 973/2016 eeguu fi tajaajila kaffaltii Telebirr fi M-Pesa qindeessuu.'
                : currentLang === 'am'
                ? 'ፍጹም ግልጽነት መፍጠር፣ የሕግ ምርምርን ማሳጠር፣ የ2% ተቀናሽ ግብር (Withholding Tax) በአዋጅ ቁጥር 973/2016 መሠረት ማስከበር እና የቴሌብር/ኤም-ፔሳ ክፍያዎችን ማቀናጀት።'
                : 'Fostering absolute transparency, expediting statutory lookup, ensuring 2% withholding tax compliance under Proclamation 973/2016, and managing Telebirr & M-Pesa settlements.'}
            </p>
          </div>
        </div>

        {/* Comparative Diagnostic Table / Grid */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="text-center max-w-xl mx-auto space-y-1 pb-2">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide font-mono">
              {currentLang === 'om'
                ? '📋 Madda Rakkoo vs Furmaata SeeraAI'
                : currentLang === 'am'
                ? '📋 የችግሮች ምንጭ እና የSeeraAI መፍትሄዎች ጎን ለጎን'
                : '📋 Problem Source vs. SeeraAI Solution Mapping'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {currentLang === 'om'
                ? 'Rakkoowwan qabatamaa Itoophiyaa keessatti mudachaa turanii fi akkaataa platformii kanaan furmaata argatan'
                : currentLang === 'am'
                ? 'በኢትዮጵያ የሕግ ልምምድ ውስጥ በተደጋጋሚ የሚከሰቱ ተግዳሮቶች እና ይህ መተግበሪያ የሰጠው ዘላቂ መፍትሄ'
                : 'A trilingual research matrix aligning real-world legal system friction with our digital solutions'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              {
                id: 'p1',
                titleOm: '1. Barbaacha Murteewwan Ijibbaataa Boodatti Hafe (Precedents)',
                probOm: 'Barbaacha murteewwan dhaddacha ijoo jildii 25+ dhuunfaan keessaa lakk. galmeen barbaaduun guyyoota qisaasuu fi qorannoo seeraa gufachiisuu.',
                solTitleOm: 'Barbaacha Sekondii 3 Gidduu (Instant Intelligent Search)',
                solOm: 'Teeknooloojii AI\'n jildii fi lakk. galmeen sekondii 3 gidduutti murtii fi keeyyata eeggatee murtii madaalame fida.',
                titleAm: '1. የሰበር ውሳኔዎችን በእጅ መፈለግ (Slow Retrieval)',
                probAm: 'ከ25 በላይ የሰበር ቅጾችን በሰነድ ቁጥር በእጅ መፈለግ ቀናትን ያባክናል፣ የሕግ ጥናትንና የውሳኔ መሠረቶችን ያጓትታል።',
                solTitleAm: 'በ3 ሰከንዶች ውስጥ መፈለግ (Instant Search Engine)',
                solAm: 'አርቴፊሻል ኢንተለጀንስ (AI) በቅጽ ወይም በመዝገብ ቁጥር በሰከንዶች ውስጥ አግባብነት ያላቸውን የሰበር ውሳኔዎች ነቅሶ ያወጣል።',
                titleEn: '1. Manual and Slow Precedent Retrieval',
                probEn: 'Searching through 25+ supreme court precedent volumes manually wastes weeks and delays client representation.',
                solTitleEn: '3-Second Precedent Retrieval Index',
                solEn: 'AI search matches facts, legal issue codes, and case numbers to index supreme court bindings in under 3 seconds.',
                badgeColor: 'amber'
              },
              {
                id: 'p2',
                titleOm: '2. Daangaa Afaanii fi Garaagarummaa Hubannoo Seeraa (Language Barrier)',
                probOm: 'Seeronni, labsiileen, fi murteewwan afaan tokkoon qofa bahuun dhimma falmii gadi fageenyaan hubachuuf danqaa uumuu fi hiikkaa dogoggoraa uumuu.',
                solTitleOm: 'Hiikkaa Sadeen Tokkummaa (Trilingual Parity)',
                solOm: 'Afaan Oromoo, Amharic, fi English wal-qixatti xiinxala dhiyeessuun lammiilee fi ogeeyyiif hubannoo guutuu fi ifa ta\'e uuma.',
                titleAm: '2. የቋንቋ እና የሕግ ግንዛቤ ልዩነት (Language Barriers)',
                probAm: 'ሕጎችና አዋጆች በአንድ ቋንቋ ብቻ መውጣታቸው የሕግ ባለሙያዎችንና ደንበኞችን የግንዛቤ ልዩነት በመፍጠር ለተሳሳተ ትርጉም ይዳርጋል።',
                solTitleAm: 'ባለሦስት ቋንቋ እኩልነት (Trilingual Parity)',
                solAm: 'አፋን ኦሮሞን፣ አማርኛን እና እንግሊዝኛን በእኩልነት በማገናኘት ፍጹም የሆነ የሕግ ግንዛቤና የሰነድ ትርጉም እኩልነት ያረጋግጣል።',
                titleEn: '2. Multilingual Compliance Barriers',
                probEn: 'laws, proclamations, and cassations published in single languages block access and cause fatal translation errors.',
                solTitleEn: 'Synchronized Trilingual Parity Suite',
                solEn: 'Simultaneous side-by-side processing in Oromo, Amharic, and English ensures pristine legal concordance.',
                badgeColor: 'emerald'
              },
              {
                id: 'p3',
                titleOm: '3. Balaa Seeraa Waliigalteewwan Qophaayanii (Contractual Risks)',
                probOm: 'Waliigalteewwan daldalaa fi hojii keeyyattoota gahaa hin taaneen qophaa\'anii balaa dhabamuu mirgaa fi kisaaraa daldalaa guddaa fiduu.',
                solTitleOm: 'Sanad-Qopheessituu Balaa-Maleessaa (Compliance Smart AI)',
                solOm: 'Keeyyattoota Koodii Siivilii fi Labsii Hojjetaa eeggatanii balaa seeraa malee waliigalteewwan qulqulluu qopheessa.',
                titleAm: '3. በውል ዝግጅት ላይ የሚከሰቱ ሕጋዊ ስጋቶች (Legal Risks)',
                probAm: 'የንግድና የቅጥር ውሎች አስፈላጊ አንቀጾችን ሳይይዙ መዘጋጀታቸው መብትን ያሳጣል፣ ለከፍተኛ የካሳና የሕግ ክርክር ኪሳራ ይዳርጋል።',
                solTitleAm: 'ሕጋዊ ስጋት አልባ ሰነድ አዘጋጅ (Smart Contract AI)',
                solAm: 'የፍትሐብሔርና የአሰሪና ሰራተኛ ሕግ አንቀጾችን በትክክል ጠብቆ ስጋት አልባ የሆኑ የውል ሰነዶችን በሴኮንዶች ውስጥ ያዘጋጃል።',
                titleEn: '3. Unmitigated Legal Risks in Contract Drafting',
                probEn: 'Contracts lacking proper regulatory alignment with local labor or civil codes create extreme commercial vulnerabilities.',
                solTitleEn: 'Statutory-Compliant Automated Drafting',
                solEn: 'Drafts ironclad contracts aligned directly with the Ethiopian Civil or Labor Code, securing all legal interests.',
                badgeColor: 'cyan'
              },
              {
                id: 'p4',
                titleOm: '4. Hanqina Iftoomina Kaffaltii fi Raawwii Gibiraa (Withholding Compliance)',
                probOm: 'Kaffaltiin tajaajila digital irratti madaalliin gibiraa labsii 973/2016 eeguu dhabuun fi murtii kaffaltii Telebirr app irratti milkiidhaan mirkaneessuu dadhabuu.',
                solTitleOm: 'Withholding Verify & Audit Compliance Log (Labsii 973/2016)',
                solOm: 'Gibira WHT 2% herreguun Gabatee Seenaa Kaffaltii (Audit Log) dhaan raw API Telebirr waliin wal-bira qabee ifatti mul\'isa, Refresh Status dhaan madaala.',
                titleAm: '4. የክፍያ ግልጽነት እና የግብር አፈፃፀም ክፍተት (Withholding Compliance)',
                probAm: 'በዲጂታል ክፍያዎች ላይ የ2% ተቀናሽ ግብር (WHT) በአዋጅ 973/2016 መሠረት አለመመዝገብና የቴሌብር ክፍያ አፕሊኬሽኑ ላይ ወዲያውኑ አለመታየት።',
                solTitleAm: 'የግብር ማረጋገጫና ዝርዝር የክፍያ መዝገብ (Audit Log)',
                solAm: 'የ2% ተቀናሽ ግብርን አስልቶ ከቴሌብር Raw API ምላሽ ጋር በማመሳከር በየክፍያው የሕግ ተገዢነትንና የክፍያውን ትክክለኛነት በRefresh Status ያሳያል።',
                titleEn: '4. Opaque Payment Trails and Tax Violations',
                probEn: 'E-commerce payments often bypass the mandatory 2% withholding tax (WHT), causing compliance audit failures.',
                solTitleEn: 'Proclamation 973/2016 Tax-Withholding Audit Log',
                solEn: 'Calculates 2% WHT and displays raw Telebirr API responses via Audit Logs to verify matching transaction records.',
                badgeColor: 'purple'
              }
            ].map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-slate-950 border border-slate-800/80 p-5 hover:border-slate-700 transition-colors">
                {/* Problem Source Column */}
                <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-800/80 pb-4 md:pb-0 md:pr-4">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[10px] uppercase tracking-wider font-mono">
                    <span>⚠️</span>
                    <span>
                      {currentLang === 'om'
                        ? 'Madda Rakkoo (Problem Source):'
                        : currentLang === 'am'
                        ? 'የችግሩ ምንጭ (Problem Source)፦'
                        : 'Diagnostic Problem Source:'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">
                    {currentLang === 'om' ? item.titleOm : currentLang === 'am' ? item.titleAm : item.titleEn}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {currentLang === 'om' ? item.probOm : currentLang === 'am' ? item.probAm : item.probEn}
                  </p>
                </div>

                {/* SeeraAI Solution Column */}
                <div className="space-y-2 md:pl-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider font-mono">
                    <span>✅</span>
                    <span>
                      {currentLang === 'om'
                        ? 'Furmaata SeeraAI (Our Solution):'
                        : currentLang === 'am'
                        ? 'የሴራAI መፍትሔ (Our Solution)፦'
                        : 'SeeraAI Engineering Solution:'}
                    </span>
                  </div>
                  <h4 className="font-bold text-emerald-300 text-sm">
                    {currentLang === 'om' ? item.solTitleOm : currentLang === 'am' ? item.solTitleAm : item.solTitleEn}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {currentLang === 'om' ? item.solOm : currentLang === 'am' ? item.solAm : item.solEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Feature Pillars */}
      <div>
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100">
            {t.home.featuresTitle}
          </h2>
          <p className="mt-2 text-slate-400 text-sm">
            {t.home.featuresSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Speech to Text (Iddoo Sagaleen Afaanoota Sadeenii Gara Barreeffamaatti Jijjiiramu) */}
          <div
            onClick={() => onNavigate('voiceToText')}
            className="p-6 rounded-2xl bg-slate-900 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer group shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -z-10 pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform text-2xl font-bold">
                🎙️
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold uppercase tracking-wider">
                Afaan 3'n (Trilingual)
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors flex items-center gap-2">
              <span>{currentLang === 'om' ? 'Iddoo Sagaleen Afaanoota Sadeenii Gara Barreeffamaatti Jijjiiramu' : currentLang === 'am' ? 'የሦስቱ ቋንቋዎች ድምፅ ወደ ጽሑፍ መቀየሪያ' : 'Trilingual Speech-to-Text Studio'}</span>
              <span className="text-amber-400 text-sm group-hover:translate-x-1 transition-transform">➔</span>
            </h3>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed font-sans">
              {currentLang === 'om'
                ? 'Sagalee Afaan Oromoo, Amharic fi English waraabuun ykn faayila sagalee fe\'uun battalatti gara barreeffama seeraatti jijjiiraa. Qulqullina jechootaa fi sirna tuqaalee 100% eega.'
                : 'የአማርኛ፣ የአፋን ኦሮሞ እና የእንግሊዝኛ ድምፅን በመቅረጽ ወይም የድምፅ ፋይል በመስቀል ወደ ትክክለኛ ጽሑፍ ይቀይሩ። የህግ ቃላትንና ሥርዓተ-ነጥብን በአግባቡ ያሟላል።'}
            </p>
          </div>

          {/* Card 2: Image & File OCR (Iddoo Barreeffama Suuraa fi Faayilii Gara Barreeffamaatti Jijjiiramu) */}
          <div
            onClick={() => onNavigate('fileToText')}
            className="p-6 rounded-2xl bg-slate-900 border border-blue-500/40 hover:border-blue-400 transition-all cursor-pointer group shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -z-10 pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform text-2xl font-bold">
                📷
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono font-bold uppercase tracking-wider">
                OCR & File-to-Text
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-blue-300 transition-colors flex items-center gap-2">
              <span>{currentLang === 'om' ? 'Iddoo Barreeffama Suuraa fi Faayilii Gara Barreeffamaatti Jijjiiramu' : currentLang === 'am' ? 'የምስልና የሰነድ ወደ ጽሑፍ መቀየሪያ (OCR)' : 'Image & Document OCR Studio'}</span>
              <span className="text-blue-400 text-sm group-hover:translate-x-1 transition-transform">➔</span>
            </h3>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed font-sans">
              {currentLang === 'om'
                ? 'Suuraa sanadaa kaasuun, iskaanii gochuun, ykn faayila PDF/suuraa chaappaa fi mallattoo qaban fe\'uun barreeffama afaanoota sadeeniin guutummaatti gara barreeffamaatti jijjiira.'
                : 'በካሜራ ፎቶ በማንሳት ወይም የPDF/ምስል ፋይል በመስቀል ማህተሞችን፣ ፊርማዎችንና ጽሑፎችን በሙሉ ወደ ሊስተካከል የሚችል ጽሑፍ ያውጡ።'}
            </p>
          </div>

          <div
            onClick={() => onNavigate('docAnalysis')}
            className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 hover:border-amber-500 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-2xl">
              ⚖️
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
              AI Legal Logic & Procedural Auditor
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {currentLang === 'om' 
                ? 'Odiitara AI ammayyaa: Iyyata himannaa fi mormii duraa keessatti hanqinaalee SDFHH (Keeyyata 6 - Review of Judgement, 80, 244) fi ulaagaalee mallattoo sakatta\'ee gabaasa dhiyeessa.' 
                : 'Advanced AI Auditor: Analyzes procedural defects in statements of claim and preliminary objections under SDFHH (Art 6 - Review, 80, 244) and signature formalities.'}
            </p>
          </div>

          <div
            onClick={() => onNavigate('judicialTools')}
            className="p-6 rounded-2xl bg-slate-900 border border-blue-500/30 hover:border-blue-500 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-2xl">
              🏛️
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
              {currentLang === 'om' ? 'Meeshaalee Abbaa Seeraa & Gulaallii Murtii' : 'Judicial Decision Writing Assistant'}
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {currentLang === 'om'
                ? 'Abbootii seeraatiif: Qabxii falmii irratti hundaa\'uun qulqullina murtii mirkaneessuu, ragaalee madaaluu fi seeraan wal-qabsiisuun murtii qopheessuuf gargaara.'
                : 'For Judges & Clerks: Helps in drafting legally sound judgments by weighing evidence and aligning with governing statutes and precedents.'}
            </p>
          </div>

          <div
            onClick={() => onNavigate('courtroomAssistant')}
            className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 hover:border-amber-500 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-2xl">
              ⏱️
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
              {t.nav.courtroomAssistant}
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {currentLang === 'om'
                ? 'Adeemsa falmii mana murtii (Live) hordofuuf: Fontoota gurguddaa, checklist dhimmoota procedural, fi tiimara dhaddachaa of keessatti qabata.'
                : 'Live Courtroom Mode: High-contrast UI with large fonts, procedural checklists, and an integrated courtroom timer for live proceedings.'}
            </p>
          </div>

          <div
            onClick={() => onNavigate('summonsGenerator')}
            className="p-6 rounded-2xl bg-slate-900 border border-rose-500/30 hover:border-rose-500 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-2xl">
              ✉️
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-rose-400 transition-colors">
              {currentLang === 'om' ? 'Uumtuu Waamicha & Ajaja Mana Murtii' : 'Automated Summons & Court Orders'}
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {currentLang === 'om'
                ? 'Waamicha abbaa dhimmaa, ajaja dhorkaa, fi unkaalee mana murtii adda addaa ragaalee galmee irraa fudhachuun battalatti qopheessa.'
                : 'Instantly generates formal court summons, injunction orders, and legal notices based on docket information and statutory templates.'}
            </p>
          </div>

          <div
            onClick={() => onNavigate('create')}
            className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/30 hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-2xl">
              🔗
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
              Secure Share Draft & Collaboration
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Draft sanada keessanii koodii eegumsaatiin (Passcode) ogeessota biroo waliin qooduun yaada (Comment) fi fooyya'iinsa irratti waliin hojjedhaa.
            </p>
          </div>

          <div
            onClick={() => onNavigate('explainLaw')}
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-2xl">
              ⚖️
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
              {t.home.feature2Title}
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {t.home.feature2Desc}
            </p>
          </div>

          <div
            onClick={() => onNavigate('translate')}
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-2xl">
              🌐
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
              {t.home.feature3Title}
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {t.home.feature3Desc}
            </p>
          </div>

          <div
            onClick={() => onNavigate('social')}
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-2xl">
              📱
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-purple-400 transition-colors">
              {t.home.feature4Title}
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {t.home.feature4Desc}
            </p>
          </div>

          <div
            onClick={() => onNavigate('legislationRepository')}
            className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer group md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform text-3xl shrink-0">
              📚
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                  {currentLang === 'om' ? 'Kuusaa Labsiilee, Dambiilee, Qajeelfamoota & Murtiilee Ijibbaataa (Auto-Sync)' : currentLang === 'am' ? 'የጨፌ ኦሮሚያ እና የኢፌዴሪ ህግጋት፣ ደንቦች፣ መመሪያዎች እና የሰበር ውሳኔዎች' : 'Oromia & Federal Legislation Repository'}
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase tracking-wider font-mono">
                  Live Auto-Sync
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {currentLang === 'om'
                  ? 'Labsiilee Caffee Oromiyaa fi Mana Marii Bakka Bu\'oota Uummata Federaalaa, dambiilee Mootummaa, qajeelfamoota Biiroolee, fi murtiilee Dhaddacha Ijibbaataa Oromiyaa fi Federaalaa Hanga Ammaatti Bahan Hunda Isaas Kuusaa Yeroo Yeroon Auto-Sync Ta\'u.'
                  : currentLang === 'am'
                  ? 'የጨፌ ኦሮሚያ እና የኢፌዴሪ አዋጆች፣ ደንቦች፣ መመሪያዎች እና የሰበር ውሳኔዎችን በወቅቱ አውቶማቲክ ማዘመኛ ያካተተ ማከማቻ።'
                  : 'Comprehensive auto-syncing database of Caffee Oromia & Federal Parliament Proclamations, Regulations, Directives, and Supreme Court Cassation decisions.'}
              </p>
            </div>
          </div>

          <div
            onClick={() => onNavigate('precedentSimulator')}
            className="p-6 rounded-2xl bg-slate-900 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer group md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-md"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform text-3xl shrink-0">
              🏛️
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                  {currentLang === 'om' ? 'Saayimulaatara Murtee Dhaddacha Ijoo (Outcome Simulator)' : currentLang === 'am' ? 'የሰበር ውሳኔዎችን መገመቻና መተንበያ (Precedent Simulator)' : 'Cassation Outcome Simulator & Case SWOT'}
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider font-mono">
                  New Expert Tool
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {currentLang === 'om'
                  ? 'Adeemsa falmii keessanii fi dhaddacha ijoo Federalaa madaaluun carraa injifannoo, qabiyyee ciminaa fi hanqina seeraa (SWOT) gadi fageenyaan qoraa.'
                  : currentLang === 'am'
                  ? 'ህጋዊ ክርክሮችን በማስገባት በፌደራል ሰበር ሰሚ ችሎት ውሳኔዎችና ድንጋጌዎች መሰረት የስኬት እድልን፣ ጥንካሬንና ህጋዊ ክፍተቶችን (SWOT) ይተንትኑ።'
                  : 'Evaluate your legal dispute parameters to calculate litigation probability and build case arguments based on actual Supreme Court binding precedents.'}
              </p>
            </div>
          </div>

          <div
            onClick={() => onNavigate('appGuide')}
            className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer group md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform text-3xl shrink-0">
              🎯
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                  {currentLang === 'om' ? 'Kaayyoo, Faayidaa & Haala Itti Fayyadama Appii SeeraAI' : currentLang === 'am' ? 'የSeeraAI መተግበሪያ ዓላማ፣ ጥቅሞች እና የአጠቃቀም መመሪያ' : 'App Purpose, Benefits & Complete User Instructions'}
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold uppercase tracking-wider font-mono">
                  User Guide
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {currentLang === 'om'
                  ? 'Kalaqa appii kanaa, faayidaalee ijoo fayyadamtootaaf dhihaatan, fi haala itti fayyadama isaa tarkaanfii tarkaanfiidhaan dubbisaa.'
                  : currentLang === 'am'
                  ? 'የዚህ መተግበሪያ አመሰራረት ዓላማ፣ ለተጠቃሚዎች የሚሰጣቸው ጥቅሞች እና ደረጃ በደረጃ የአጠቃቀም መመሪያ።'
                  : 'Learn about the vision behind SeeraAI, key benefits for users, and detailed step-by-step instructions for getting the most out of every feature.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Legal Searches Section (if any exist) */}
      {recentSearchesList.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-base">
                🕒
              </div>
              <h2 className="text-lg font-bold text-slate-100">{t.recentSearches.title}</h2>
            </div>
            <button
              onClick={() => onNavigate('explainLaw')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{t.actions.viewAll}</span>
              <span>➔</span>
            </button>
          </div>

          <RecentSearches
            currentLang={currentLang}
            onSelectSearch={(query) => {
              if (onSelectRecentSearch) {
                onSelectRecentSearch(query, 'explain_law');
              } else {
                onNavigate('explainLaw');
              }
            }}
            mode="under-search"
            maxDisplay={10}
          />
        </div>
      )}

      {/* Recent Work Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-base">
              📁
            </div>
            <h2 className="text-lg font-bold text-slate-100">{t.home.recentWork}</h2>
          </div>
          {recentDocs.length > 0 && (
            <button
              onClick={() => onNavigate('myContent')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{t.actions.viewAll}</span>
              <span>➔</span>
            </button>
          )}
        </div>

        {recentDocs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <p>{t.home.noRecentWork}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  if (onSelectSavedDoc) onSelectSavedDoc(doc);
                  onNavigate('myContent');
                }}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-slate-200 text-sm line-clamp-1">{doc.title}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                    {doc.taskType}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400 line-clamp-2">{doc.content}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex gap-1">
                    {doc.outputLanguages.map((l) => (
                      <span key={l} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 uppercase">
                        {l}
                      </span>
                    ))}
                  </div>
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
