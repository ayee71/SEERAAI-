import React, { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  Scale,
  Sparkles,
  Volume2,
  Download,
  Share2,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Brain,
  Filter,
  Flame,
  Award,
  BookOpen,
  Info,
  ShieldCheck,
  AlertCircle,
  Headphones,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import {
  WORLD_BIZARRE_LAWS,
  CONTINENTS_META,
  CONTINENTS_MAP,
  ContinentKey,
  WorldBizarreLaw,
  LawCategory,
} from '../data/worldBizarreLawsData';
import { LegalSummaryAudioPlayer } from '../components/LegalSummaryAudioPlayer';
import { downloadLegalSummaryAudio } from '../services/legalAudioExportService';

interface WorldBizarreLawsViewProps {
  currentLang: Language;
}

export const WorldBizarreLawsView: React.FC<WorldBizarreLawsViewProps> = ({ currentLang }) => {
  const t = translations[currentLang];

  const [selectedContinent, setSelectedContinent] = useState<ContinentKey | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<LawCategory | 'all'>('all');
  const [expandedLawId, setExpandedLawId] = useState<string | null>(null);
  const [activeAudioLaw, setActiveAudioLaw] = useState<WorldBizarreLaw | null>(null);
  const [copiedLawId, setCopiedLawId] = useState<string | null>(null);
  const [isExportingLawAudio, setIsExportingLawAudio] = useState<string | null>(null);

  // Trivia Quiz State
  const [showTriviaMode, setShowTriviaMode] = useState<boolean>(false);
  const [triviaIndex, setTriviaIndex] = useState<number>(0);
  const [triviaSelectedAnswer, setTriviaSelectedAnswer] = useState<string | null>(null);
  const [triviaScore, setTriviaScore] = useState<number>(0);

  // Trilingual Labels
  const labels = {
    om: {
      heroTitle: 'Seerota Addunyaa Bitaa-Galeeyyii & Dhugaa',
      heroSub: 'Seerota biyyoota addunyaa keessatti qoosaa fakkaatan garuu dhugaa ta\'an ardi ardiidhaan qoqqoodamanii fi seera Itoophiyaa waliin wal-bira qabaman.',
      allContinents: 'Ardii Hunda',
      searchPlaceholder: 'Biyya, mata-duree ykn seera barbaadi...',
      allCategories: 'Gosa Hunda',
      legalOrigin: 'Madda & Seenaa Seerichaa',
      ethiopianComparison: '⚖️ Seera Itoophiyaa Waliin Wal-Madaallii:',
      statutoryRef: 'Madda Seeraa:',
      listenAudio: 'Sagalee Dhaggeeffadhu',
      exportAudio: 'Sagalee Buusi (.wav)',
      copyText: 'Waraabi (Copy)',
      copied: 'Waraabameera!',
      triviaTitle: 'Beekumsa Seeraa Keessan Qoraa (Legal Trivia Quiz)',
      triviaSub: 'Seerota addunyaa ajaa\'ibsiisoo kana beektuu? Qormaata gabaabaa kana yaalaa!',
      question: 'Gaaffii',
      nextQuestion: 'Gaaffii Itti Aanu',
      restartTrivia: 'Irra Deebi\'ii Qori',
      scoreText: 'Qabxii Keessan',
      statusActive: 'Hojiirra Jira',
      statusRepealed: 'Seera Duraanii (Haqame)',
      statusLocal: 'Dambii Magaalaa',
      statusRare: 'Yeroo Hedduu Hin Hojiirra Oolu',
      categoryDaily: 'Jireenya Guyyaa',
      categoryFood: 'Nyaata & Dhugaatii',
      categoryTransport: 'Geejjiba',
      categoryAttire: 'Uffannaa',
      categoryNature: 'Bineensota & Uumama',
      categoryFamily: 'Maatii & Heeruma',
      categoryDecorum: 'Safuu Uummataa',
    },
    am: {
      heroTitle: 'የዓለማችን እንግዳ እና አስገራሚ እውነተኛ ሕጎች',
      heroSub: 'በተለያዩ የዓለማችን አህጉራት የሚገኙ ቀልድ የሚመስሉ ነገር ግን እውነተኛ የሆኑ ያልተለመዱ ሕጎች ከኢትዮጵያ ሕግ ጋር በማነጻጸር።',
      allContinents: 'ሁሉም አህጉራት',
      searchPlaceholder: 'አገር፣ ርዕስ ወይም ሕግ ይፈልጉ...',
      allCategories: 'ሁሉም ዘርፎች',
      legalOrigin: 'የሕጉ መነሻና ታሪካዊ ዳራ',
      ethiopianComparison: '⚖️ ከኢትዮጵያ ሕግጋት ጋር ሲነጻጸር፦',
      statutoryRef: 'የሕግ ዋቢ፦',
      listenAudio: 'ድምፅ አዳምጥ',
      exportAudio: 'ድምፅ አውርድ (.wav)',
      copyText: 'ኮፒ አድርግ',
      copied: 'ተገልብጧል!',
      triviaTitle: 'የሕግ እውቀትዎን ይፈትሹ (Legal Trivia Quiz)',
      triviaSub: 'እነዚህን አስገራሚ የዓለም ሕጎች ያውቃሉ? ጥያቄዎቹን ይመልሱ!',
      question: 'ጥያቄ',
      nextQuestion: 'ቀጣይ ጥያቄ',
      restartTrivia: 'እንደገና ጀምር',
      scoreText: 'ውጤትዎ',
      statusActive: 'በሥራ ላይ ያለ',
      statusRepealed: 'የቀድሞ (የተሻረ)',
      statusLocal: 'የከተማ ደንብ',
      statusRare: 'ብዙም ተፈጻሚ የማይደረግ',
      categoryDaily: 'የዕለት ተዕለት ኑሮ',
      categoryFood: 'ምግብና መጠጥ',
      categoryTransport: 'ትራንስፖርት',
      categoryAttire: 'አለባበስ',
      categoryNature: 'እንስሳትና ተፈጥሮ',
      categoryFamily: 'ቤተሰብና ጋብቻ',
      categoryDecorum: 'የሕዝብ ሥነ-ምግባር',
    },
    en: {
      heroTitle: 'Bizarre & Curious But Real World Laws',
      heroSub: 'Explore real, strange, and fascinating laws from around the globe organized by continent, complete with comparative Ethiopian legal insights.',
      allContinents: 'All Continents',
      searchPlaceholder: 'Search country, topic, or bizarre law...',
      allCategories: 'All Categories',
      legalOrigin: 'Origin & Historical Context',
      ethiopianComparison: '⚖️ Comparison with Ethiopian Law:',
      statutoryRef: 'Statutory Reference:',
      listenAudio: 'Listen to Audio',
      exportAudio: 'Export Audio (.wav)',
      copyText: 'Copy Text',
      copied: 'Copied!',
      triviaTitle: 'World Legal Trivia Quiz',
      triviaSub: 'How well do you know strange international jurisprudence? Test your knowledge!',
      question: 'Question',
      nextQuestion: 'Next Question',
      restartTrivia: 'Restart Quiz',
      scoreText: 'Your Score',
      statusActive: 'Active & Enforced',
      statusRepealed: 'Historical / Repealed',
      statusLocal: 'Local Ordinance',
      statusRare: 'Rarely Enforced',
      categoryDaily: 'Daily Life',
      categoryFood: 'Food & Drink',
      categoryTransport: 'Transport',
      categoryAttire: 'Attire & Appearance',
      categoryNature: 'Animals & Nature',
      categoryFamily: 'Family & Marriage',
      categoryDecorum: 'Public Decorum',
    },
  }[currentLang];

  // Category labels map
  const categoryLabels: Record<string, string> = {
    daily: labels.categoryDaily,
    daily_life: labels.categoryDaily,
    food: labels.categoryFood,
    food_drink: labels.categoryFood,
    transport: labels.categoryTransport,
    attire: labels.categoryAttire,
    attire_appearance: labels.categoryAttire,
    nature: labels.categoryNature,
    animals_nature: labels.categoryNature,
    family: labels.categoryFamily,
    family_relationships: labels.categoryFamily,
    decorum: labels.categoryDecorum,
    public_decorum: labels.categoryDecorum,
  };

  // Filtered Laws list
  const filteredLaws = useMemo(() => {
    return WORLD_BIZARRE_LAWS.filter((law) => {
      // Continent match
      if (selectedContinent !== 'all' && law.continent !== selectedContinent) {
        return false;
      }
      // Category match
      if (selectedCategory !== 'all' && law.category !== selectedCategory) {
        return false;
      }
      // Query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const countryMatch =
          law.country.om.toLowerCase().includes(q) ||
          law.country.am.toLowerCase().includes(q) ||
          law.country.en.toLowerCase().includes(q);
        const titleMatch =
          law.title.om.toLowerCase().includes(q) ||
          law.title.am.toLowerCase().includes(q) ||
          law.title.en.toLowerCase().includes(q);
        const descMatch =
          law.strangeSummary.om.toLowerCase().includes(q) ||
          law.strangeSummary.am.toLowerCase().includes(q) ||
          law.strangeSummary.en.toLowerCase().includes(q);
        const tagMatch = law.tags.some((tag) => tag.toLowerCase().includes(q));

        if (!countryMatch && !titleMatch && !descMatch && !tagMatch) {
          return false;
        }
      }
      return true;
    });
  }, [selectedContinent, selectedCategory, searchQuery]);

  // Trivia items built from laws
  const triviaQuestions = useMemo(() => {
    return [
      {
        question:
          currentLang === 'om'
            ? 'Biyya kam keessatti daandii uummataa irratti gareedhaan fiigicha (jogging) gochuun seeraan dhoorkame?'
            : currentLang === 'am'
            ? 'በጎዳናዎች ላይ በቡድን ሆኖ የጤና ሩጫ (Jogging) መሮጥ በሕግ የተከለከለው በየትኛው አገር ነው?'
            : 'In which country was group jogging in public prohibited to prevent political assembly?',
        options: [
          { name: currentLang === 'om' ? 'Burundii' : currentLang === 'am' ? 'ቡሩንዲ' : 'Burundi', correct: true },
          { name: currentLang === 'om' ? 'Faransaay' : currentLang === 'am' ? 'ፈረንሳይ' : 'France', correct: false },
          { name: currentLang === 'om' ? 'Jaappaan' : currentLang === 'am' ? 'ጃፓን' : 'Japan', correct: false },
        ],
        explanation:
          currentLang === 'om'
            ? 'Burundii keessatti bara 2014tti Pirezidaant Pierre Nkurunziza gareen fiiguun mormitoota qindeessuudha jedhanii dhoorkan.'
            : 'በቡሩንዲ እ.ኤ.አ. በ2014 ተቃዋሚዎች በሩጫ እንዳይሰባሰቡ በሕግ ተከልክሎ ነበር።',
      },
      {
        question:
          currentLang === 'om'
            ? 'Biyya kam keessatti booyyeedhaaf maqaa "Napoleon" jedhanii moggaasuun seeraan dhoorkamee ture?'
            : currentLang === 'am'
            ? 'አሳማን "ናፖሊዮን" ብሎ መሰየም በሕግ የተከለከለው በየትኛው አገር ነው?'
            : 'In which country was it illegal to name a pet pig "Napoleon"?',
        options: [
          { name: currentLang === 'om' ? 'Jarmanii' : currentLang === 'am' ? 'ጀርመን' : 'Germany', correct: false },
          { name: currentLang === 'om' ? 'Faransaay' : currentLang === 'am' ? 'ፈረንሳይ' : 'France', correct: true },
          { name: currentLang === 'om' ? 'Kanadaa' : currentLang === 'am' ? 'ካናዳ' : 'Canada', correct: false },
        ],
        explanation:
          currentLang === 'om'
            ? 'Faransaay keessatti kabaja emparerii isaanii Napoleon Bonaparte eeguuf booyyeedhaaf maqaa isaa moggaasuun dhoorkame.'
            : 'በፈረንሳይ የአገሪቱን ንጉሠ ነገሥት ናፖሊዮንን ክብር ለመጠበቅ የወጣ ጥንታዊ ሕግ ነው።',
      },
      {
        question:
          currentLang === 'om'
            ? 'Biyya kam keessatti majiika (chewing gum) biyya keessa galchuu fi gurguruun adabbii guddaa qaba?'
            : currentLang === 'am'
            ? 'ማስቲካ ወደ ሀገር ማስገባትና መሸጥ በከፍተኛ ቅጣት የሚያስጠይቀው በየትኛው አገር ነው?'
            : 'In which country is the importation and sale of chewing gum banned by law?',
        options: [
          { name: currentLang === 'om' ? 'Taayilaand' : currentLang === 'am' ? 'ታይላንድ' : 'Thailand', correct: false },
          { name: currentLang === 'om' ? 'Singaapoor' : currentLang === 'am' ? 'ሲንጋፖር' : 'Singapore', correct: true },
          { name: currentLang === 'om' ? 'Biraaziil' : currentLang === 'am' ? 'ብራዚል' : 'Brazil', correct: false },
        ],
        explanation:
          currentLang === 'om'
            ? 'Singaapoor keessatti bara 1992 irraa eegalee qulqullina baaburaa fi magaalaa eeguuf majiikni dhoorkameera.'
            : 'በሲንጋፖር ከ1992 ጀምሮ የከተማና የባቡር ጽዳትን ለመጠበቅ ማስቲካ ታግዷል።',
      },
      {
        question:
          currentLang === 'om'
            ? 'Biyya kam keessatti abbaan warraa guyyaa dhaloota haadha manaa isaa yoo irraanfate adabbiin seeraa jira?'
            : currentLang === 'am'
            ? 'ባል የሚስቱን የልደት ቀን ከረሳ በሕግ የሚቀጣው በየትኛው አገር ነው?'
            : 'In which nation can a husband face legal complaints for forgetting his wife\'s birthday?',
        options: [
          { name: currentLang === 'om' ? 'Saamowaa' : currentLang === 'am' ? 'ሳሞአ' : 'Samoa', correct: true },
          { name: currentLang === 'om' ? 'Siwiizerlaand' : currentLang === 'am' ? 'ስዊዘርላንድ' : 'Switzerland', correct: false },
          { name: currentLang === 'om' ? 'Kolombiyaa' : currentLang === 'am' ? 'ኮሎምቢያ' : 'Colombia', correct: false },
        ],
        explanation:
          currentLang === 'om'
            ? 'Biyya odola Saamowaa keessatti aadaa "Fa\'a Samoa" eeguuf haadha manaa kabajuun dambiidhaan deeggarameera.'
            : 'በሳሞአ ባህላዊ ሥርዓት የሚስትን ክብር ለመጠበቅ በደንብ የተደገፈ ነው።',
      },
    ];
  }, [currentLang]);

  // Handle Copy text
  const handleCopyLaw = (law: WorldBizarreLaw) => {
    const textToCopy = `⚖️ ${law.flagEmoji} ${law.country[currentLang]} - ${law.title[currentLang]}
📌 ${law.strangeSummary[currentLang]}

🏛️ ${labels.legalOrigin}:
${law.legalContextAndOrigin[currentLang]}

🇪🇹 ${labels.ethiopianComparison}
${law.ethiopianLawComparison[currentLang]}

📜 ${labels.statutoryRef} ${law.statutoryReferenceOrPrecedent}
🌐 SeeraAI Legal Platform (www.saorethio1.com)`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedLawId(law.id);
    setTimeout(() => setCopiedLawId(null), 2500);
  };

  // Handle Export Audio for a law
  const handleExportLawAudio = async (law: WorldBizarreLaw) => {
    setIsExportingLawAudio(law.id);
    try {
      const narration = `${law.country[currentLang]}. ${law.title[currentLang]}. ${law.strangeSummary[currentLang]}. Madda seeraa: ${law.legalContextAndOrigin[currentLang]}. Seera Itoophiyaa waliin yoo madaalamu: ${law.ethiopianLawComparison[currentLang]}`;
      await downloadLegalSummaryAudio(narration, `Seera_${law.countryCode}_${law.id}`, {
        lang: currentLang,
        preferNeural: true,
      });
    } catch (e) {
      console.warn('Audio export error:', e);
    } finally {
      setIsExportingLawAudio(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>International Comparative Jurisprudence</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
              6 Continents • {WORLD_BIZARRE_LAWS.length} Verified Laws
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-serif-legal text-slate-100 tracking-tight leading-tight">
            {labels.heroTitle}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {labels.heroSub}
          </p>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowTriviaMode(!showTriviaMode)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                showTriviaMode
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>{labels.triviaTitle}</span>
            </button>

            {activeAudioLaw && (
              <button
                type="button"
                onClick={() => setActiveAudioLaw(null)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <span>✕ Cufi Audio</span>
              </button>
            )}
          </div>
        </div>

        {/* Subtle Decorative Elements */}
        <div className="absolute right-4 -bottom-10 opacity-10 pointer-events-none text-9xl">
          ⚖️
        </div>
      </div>

      {/* Embedded Audio Player if Active */}
      {activeAudioLaw && (
        <LegalSummaryAudioPlayer
          currentLang={currentLang}
          summaryText={`${activeAudioLaw.country[currentLang]}: ${activeAudioLaw.title[currentLang]}. ${activeAudioLaw.strangeSummary[currentLang]}. ${activeAudioLaw.legalContextAndOrigin[currentLang]}. Seera Itoophiyaa waliin: ${activeAudioLaw.ethiopianLawComparison[currentLang]}`}
          documentTitle={`Seera Addunyaa: ${activeAudioLaw.country[currentLang]} (${activeAudioLaw.flagEmoji})`}
          onClose={() => setActiveAudioLaw(null)}
          className="border-amber-500/60 shadow-2xl"
          autoPlay={true}
        />
      )}

      {/* Interactive Trivia Mode if Toggled */}
      {showTriviaMode && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/40 space-y-5 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <div>
                <h3 className="font-bold text-base text-slate-100">{labels.triviaTitle}</h3>
                <p className="text-xs text-slate-400">{labels.triviaSub}</p>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              {labels.scoreText}: {triviaScore} / {triviaQuestions.length}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-xs font-mono text-amber-400 uppercase">
              {labels.question} {triviaIndex + 1} / {triviaQuestions.length}
            </div>
            <h4 className="text-base sm:text-lg font-bold text-slate-100">
              {triviaQuestions[triviaIndex].question}
            </h4>

            {/* Answer Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {triviaQuestions[triviaIndex].options.map((opt) => {
                const isSelected = triviaSelectedAnswer === opt.name;
                const showResult = Boolean(triviaSelectedAnswer);

                let btnStyle = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-500/50';
                if (showResult) {
                  if (opt.correct) {
                    btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold';
                  }
                }

                return (
                  <button
                    key={opt.name}
                    type="button"
                    disabled={Boolean(triviaSelectedAnswer)}
                    onClick={() => {
                      setTriviaSelectedAnswer(opt.name);
                      if (opt.correct) {
                        setTriviaScore((prev) => prev + 1);
                      }
                    }}
                    className={`p-4 rounded-2xl border text-sm text-left transition-all cursor-pointer ${btnStyle} disabled:cursor-default`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt.name}</span>
                      {showResult && opt.correct && <span className="text-emerald-400">✓</span>}
                      {showResult && isSelected && !opt.correct && <span className="text-rose-400">✕</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation when answered */}
            {triviaSelectedAnswer && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                <span className="font-bold text-amber-300 block">💡 Sababa Seeraa (Legal Fact):</span>
                <p>{triviaQuestions[triviaIndex].explanation}</p>
                <div className="pt-2 flex justify-end">
                  {triviaIndex < triviaQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTriviaIndex((prev) => prev + 1);
                        setTriviaSelectedAnswer(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      {labels.nextQuestion} →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTriviaIndex(0);
                        setTriviaSelectedAnswer(null);
                        setTriviaScore(0);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer border border-slate-700"
                    >
                      {labels.restartTrivia} 🔄
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTINENT NAVIGATION SELECTOR TABS (ARDI-ARDIIDHAAN) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-amber-400" />
            <span>Ardii Filadhaa (Filter by Continent):</span>
          </span>
          <span>{filteredLaws.length} Seerota Argaman</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* All Continents */}
          <button
            type="button"
            onClick={() => setSelectedContinent('all')}
            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
              selectedContinent === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg font-extrabold scale-[1.02]'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
            }`}
          >
            <span className="text-xl">🌐</span>
            <span className="truncate">{labels.allContinents}</span>
          </button>

          {/* Continents List */}
          {Object.values(CONTINENTS_MAP).filter(c => c.id !== 'all').map((meta) => {
            const cKey = meta.id as ContinentKey;
            const isSelected = selectedContinent === cKey;
            const count = WORLD_BIZARRE_LAWS.filter((l) => l.continent === cKey).length;

            return (
              <button
                key={cKey}
                type="button"
                onClick={() => setSelectedContinent(cKey)}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg font-extrabold scale-[1.02]'
                    : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <span className="text-xl">{meta.emoji}</span>
                <span className="truncate max-w-[100px] text-center">{meta.name[currentLang] || meta.name.en}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH AND CATEGORY FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {labels.allCategories}
          </button>
          {(
            [
              'daily_life',
              'attire_appearance',
              'transport',
              'animals_nature',
              'public_decorum',
              'family_relationships',
            ] as LawCategory[]
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* LAWS CARDS GRID */}
      {filteredLaws.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <span className="text-4xl block">🔍</span>
          <h4 className="font-bold text-slate-200">Seerri barbaaddan hin argamne</h4>
          <p className="text-xs text-slate-400">
            Jechoota biroo fayyadamuun yaalaa ykn filannoo ardii jijjiiraa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {filteredLaws.map((law) => {
            const isExpanded = expandedLawId === law.id;
            const continentMeta = CONTINENTS_MAP[law.continent] || CONTINENTS_MAP.Africa;

            // Status Badge styling
            let statusBadge = (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                ✓ {labels.statusActive}
              </span>
            );
            if (law.status === 'historical_repealed') {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-mono font-bold">
                  📜 {labels.statusRepealed}
                </span>
              );
            } else if (law.status === 'local_ordinance') {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                  🏛️ {labels.statusLocal}
                </span>
              );
            } else if (law.status === 'rarely_enforced') {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                  ⚖️ {labels.statusRare}
                </span>
              );
            }

            return (
              <div
                key={law.id}
                className={`rounded-3xl border transition-all duration-200 bg-slate-900 shadow-xl overflow-hidden ${
                  isExpanded ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Top Header */}
                <div className="p-5 pb-3 border-b border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{law.flagEmoji}</span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                          <span>{law.country[currentLang]}</span>
                          <span className="text-[11px] text-slate-500 font-mono">({law.countryCode})</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>{continentMeta.emoji}</span>
                          <span>{continentMeta.name[currentLang] || continentMeta.name.en}</span>
                          <span>•</span>
                          <span className="text-amber-400">{categoryLabels[law.category]}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">{statusBadge}</div>
                  </div>

                  {/* Law Title */}
                  <h3 className="font-serif-legal font-bold text-base text-amber-300 leading-snug">
                    {law.title[currentLang]}
                  </h3>
                </div>

                {/* Main Card Body */}
                <div className="p-5 space-y-4 text-xs leading-relaxed">
                  {/* Strange Summary Highlight Box */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100 font-medium">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                      <span>💡</span>
                      <span>Seera Ajaa\'ibsiisaa (The Bizarre Law):</span>
                    </div>
                    <p>{law.strangeSummary[currentLang]}</p>
                  </div>

                  {/* Expandable Details: Historical Origin & Ethiopian Law Comparison */}
                  {isExpanded && (
                    <div className="space-y-3.5 pt-1 animate-in fade-in duration-200">
                      {/* Legal Context & Historical Rationale */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wide">
                          🏛️ {labels.legalOrigin}:
                        </span>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          {law.legalContextAndOrigin[currentLang]}
                        </p>
                      </div>

                      {/* Ethiopian Law Comparative Analysis */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-950 border border-emerald-500/30 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11px] uppercase tracking-wide">
                          <span>🇪🇹</span>
                          <span>{labels.ethiopianComparison}</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          {law.ethiopianLawComparison[currentLang]}
                        </p>
                      </div>

                      {/* Statutory citation reference */}
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 px-1">
                        <span className="font-bold text-slate-500">{labels.statutoryRef}</span>
                        <span className="text-amber-400/90">{law.statutoryReferenceOrPrecedent}</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Controls */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    {/* Expand/Collapse Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedLawId(isExpanded ? null : law.id)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Gabaabsi' : 'Bal\'inaan Ilaali'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Audio Review / Listen Button */}
                      <button
                        type="button"
                        onClick={() => setActiveAudioLaw(law)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                        title={labels.listenAudio}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">{labels.listenAudio}</span>
                      </button>

                      {/* Direct Audio Export WAV Button */}
                      <button
                        type="button"
                        onClick={() => handleExportLawAudio(law)}
                        disabled={isExportingLawAudio === law.id}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title={labels.exportAudio}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isExportingLawAudio === law.id ? 'WAV...' : 'WAV'}</span>
                      </button>

                      {/* Copy / Share Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyLaw(law)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                        title={labels.copyText}
                      >
                        {copiedLawId === law.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
