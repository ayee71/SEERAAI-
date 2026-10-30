import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  ShieldAlert, 
  Volume2, 
  Gavel, 
  FileText, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  Bookmark, 
  Search,
  Scale,
  Sliders,
  Type,
  Sun,
  Moon
} from 'lucide-react';
import { CaseMetadata } from '../utils/caseStatus';

interface CourtroomPresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  courtName?: string;
  bench?: string;
  activeJudge?: string;
  caseFile?: Partial<CaseMetadata> & {
    title?: string;
    caseNumber?: string;
    author?: string;
    type?: string;
    filingDate?: string;
    content?: string;
  };
}

interface LegalObjection {
  id: string;
  titleOm: string;
  titleAm: string;
  titleEn: string;
  legalBasis: string;
  descriptionOm: string;
  descriptionAm: string;
  descriptionEn: string;
  rulingGuidance: string;
  category: 'Evidence' | 'Procedure' | 'Relevance' | 'Competence';
}

const COMMON_OBJECTIONS: LegalObjection[] = [
  {
    id: 'obj_hearsay',
    titleOm: 'Ragaa Gurraan Dhaga\'ame (Hearsay Objection)',
    titleAm: 'የሰሚ ሰሚ ማስረጃ መቃወሚያ (Hearsay)',
    titleEn: 'Hearsay Evidence Objection',
    legalBasis: 'Seera Ragaa / Civil Procedure & Evidence Code Art. 137',
    descriptionOm: 'Ragaan kun qaama dhimmi ilaallatu irraa osoo hin taane gurraan waan dhaga\'ame qofa dhiyaate.',
    descriptionAm: 'ምስክሩ በራሱ ያላየውን ወይም ያልሰማውን ከሶስተኛ ወገን የሰማውን ብቻ የሚመሰክርበት ሁኔታ።',
    descriptionEn: 'Out-of-court statement offered to prove the truth of the matter asserted, inadmissible without statutory exception.',
    rulingGuidance: 'Dhaddachi fudhachuu ykn kuffisuu danda\'a; ragaan gurraan dhagahame qofti murtii dhumaaf gahaa miti.',
    category: 'Evidence'
  },
  {
    id: 'obj_relevance',
    titleOm: 'Rogummaa Hin Qabu (Irrelevant Question/Evidence)',
    titleAm: 'ተገቢነት የሌለው ጥያቄ/ማስረጃ (Irrelevance)',
    titleEn: 'Irrelevant & Immaterial',
    legalBasis: 'Civil Procedure Code Art. 261 / Criminal Procedure Code Art. 136',
    descriptionOm: 'Gaaffiin dhiyaate qabxii falmii fi murtii kennamuuf jiru waliin hidhata hin qabu.',
    descriptionAm: 'የቀረበው ጥያቄ ወይም ሰነድ ከክርክሩ ጭብጥ እና ውሳኔ ጋር ምንም አይነት ግንኙነት የለውም።',
    descriptionEn: 'The question or document has no tendency to make a fact of legal consequence more or less probable.',
    rulingGuidance: 'Abbaan Seeraa gaaffii kanaan alatti akka deebi\'u ajajuu ykn qajeelchuuf aangoo qaba.',
    category: 'Relevance'
  },
  {
    id: 'obj_leading',
    titleOm: 'Gaaffii Qajeelchaa (Leading Question in Direct Exam)',
    titleAm: 'መሪ ጥያቄ (Leading Question)',
    titleEn: 'Leading Question',
    legalBasis: 'Civil Procedure Code Art. 263 / Criminal Procedure Code Art. 137',
    descriptionOm: 'Ragaa ofii qorannoo kallattii irratti gaaffii deebii of keessaa qabu dhiyeessuu.',
    descriptionAm: 'በቀጥታ ምርመራ ወቅት መልሱን በውስጡ ያካተተ ወይም ምስክሩን የሚመራ ጥያቄ ማቅረብ የተከለከለ ነው።',
    descriptionEn: 'Question prompts or suggests the desired answer during direct examination of own witness.',
    rulingGuidance: 'Dhaddachi gaafficha akka fooyyessu abukaatticha ykn abbaa alangaaf ajaja kenna.',
    category: 'Procedure'
  },
  {
    id: 'obj_speculation',
    titleOm: 'Tilmaama / Yaada Qofaan (Calls for Speculation)',
    titleAm: 'ግምት ወይም አስተያየት (Speculation)',
    titleEn: 'Calls for Speculation',
    legalBasis: 'Seera Ragaa / Evidence Assessment Principles',
    descriptionOm: 'Ragaan sun dhugaa arge osoo hin taane tilmaama dhuunfaa akka dubbatu dirqisiisuu.',
    descriptionAm: 'ምስክሩ ያየውን ወይም የሚያውቀውን እውነታ ሳይሆን የራሱን ግምት ወይም ጥርጣሬ እንዲናገር መጠየቅ።',
    descriptionEn: 'Witness is asked to guess, assume facts not established, or theorize without factual basis.',
    rulingGuidance: 'Mormiin ni kuffifama ykn ni cimsama; ragaan ogummaa hin qabne tilmaama hin kennu.',
    category: 'Competence'
  },
  {
    id: 'obj_badgering',
    titleOm: 'Ragaa Dhiphisuu / Hookkaru (Badgering / Harassing Witness)',
    titleAm: 'ምስክርን ማዋከብ እና ማስፈራራት (Harassing Witness)',
    titleEn: 'Badgering or Argumentative Examination',
    legalBasis: 'Court Decorum & Judicial Administration Directives',
    descriptionOm: 'Abukaattichi deebii osoo hin eegin ragaa dhiphisuu, arrabsuu ykn sagalee olkaasuun rifachiisuu.',
    descriptionAm: 'ጠያቂው ምስክሩ መልስ ሳይሰጥ ማቋረጥ፣ ድምፅ ከፍ አድርጎ ማስፈራራት ወይም ክብር መንካት።',
    descriptionEn: 'Counsel is arguing with the witness, interrupting repeatedly, or engaging in hostile harassment.',
    rulingGuidance: 'Dhaddachi abbootii falmiif akeekkachiisa dhumaa kennuun nagaa dhaddachaa mirkaneessa.',
    category: 'Procedure'
  },
  {
    id: 'obj_authenticity',
    titleOm: 'Mirkaneessi Sanadaa Hin Jiru (Lack of Document Authenticity)',
    titleAm: 'የሰነዱ ትክክለኛነት አለመረጋገጥ (Lack of Foundation)',
    titleEn: 'Lack of Foundation & Document Authenticity',
    legalBasis: 'Civil Code Art. 2005 & Civil Procedure Code Art. 137',
    descriptionOm: 'Sanadni dhiyaate koppii ta\'uu, chaappaa fi mallattoo orjinaala dhabuu ykn madda ifa hin taane irraa dhufuu.',
    descriptionAm: 'የቀረበው ሰነድ ኦሪጅናል ሳይሆን፣ ማህተም እና ፊርማ ያልተረጋገጠ ወይም ምንጩ ያልታወቀ ቅጂ መሆኑ።',
    descriptionEn: 'Document lacks proper foundation, chain of custody, original seal, or authenticating testimony.',
    rulingGuidance: 'Dhaddachi sanada orjinaala akka dhiyeessan ykn madda isaa akka mirkaneessan ajaja.',
    category: 'Evidence'
  }
];

export const CourtroomPresenceModal: React.FC<CourtroomPresenceModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  courtName = 'Mana Murtii Waliigalaa Oromiyaa',
  bench = 'Dhaddacha Ijibbaataa',
  activeJudge = 'Abbaa Seeraa Beellamame',
  caseFile
}) => {
  const [contrastMode, setContrastMode] = useState<'pure-black' | 'high-contrast-amber' | 'paper-sepia'>('pure-black');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [selectedObjection, setSelectedObjection] = useState<LegalObjection | null>(null);
  const [recordedObjections, setRecordedObjections] = useState<{
    id: string;
    timestamp: string;
    objection: LegalObjection;
    ruling: 'Sustained' | 'Overruled' | 'Noted';
    rulingNote: string;
  }[]>([]);
  const [activeTab, setActiveTab] = useState<'dossier' | 'objections' | 'quick_notes'>('dossier');
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNotesList, setQuickNotesList] = useState<{ time: string; note: string }[]>([]);
  const [courtTimerSeconds, setCourtTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Live Hearing Timer
  useEffect(() => {
    let timer: any;
    if (isOpen && isTimerRunning) {
      timer = setInterval(() => {
        setCourtTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, isTimerRunning]);

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecordRuling = (ruling: 'Sustained' | 'Overruled' | 'Noted', note: string = '') => {
    if (!selectedObjection) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRecordedObjections(prev => [
      {
        id: 'rec_' + Date.now(),
        timestamp: now,
        objection: selectedObjection,
        ruling,
        rulingNote: note || selectedObjection.rulingGuidance
      },
      ...prev
    ]);
    setSelectedObjection(null);
  };

  const handleAddQuickNote = () => {
    if (!quickNoteText.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setQuickNotesList(prev => [{ time: now, note: quickNoteText }, ...prev]);
    setQuickNoteText('');
  };

  const themeClasses = {
    'pure-black': {
      bg: 'bg-black text-white selection:bg-amber-500 selection:text-black',
      surface: 'bg-neutral-950 border-neutral-800',
      surfaceActive: 'bg-neutral-900 border-amber-500',
      accent: 'text-amber-400',
      subtext: 'text-neutral-400',
      highlight: 'bg-amber-400/10 text-amber-300 border-amber-400/30'
    },
    'high-contrast-amber': {
      bg: 'bg-stone-950 text-amber-100 selection:bg-amber-400 selection:text-black',
      surface: 'bg-stone-900 border-amber-500/30',
      surfaceActive: 'bg-stone-800 border-amber-400',
      accent: 'text-amber-300 font-extrabold',
      subtext: 'text-stone-400',
      highlight: 'bg-amber-500/20 text-amber-200 border-amber-500/50'
    },
    'paper-sepia': {
      bg: 'bg-[#181612] text-[#f4eedb] selection:bg-[#e0caa0] selection:text-black',
      surface: 'bg-[#221f1a] border-[#38332b]',
      surfaceActive: 'bg-[#2a2620] border-[#c4a464]',
      accent: 'text-[#d6b772]',
      subtext: 'text-[#9c9381]',
      highlight: 'bg-[#c4a464]/20 text-[#f4eedb] border-[#c4a464]/40'
    }
  }[contrastMode];

  const fontClasses = {
    normal: 'text-sm leading-relaxed',
    large: 'text-base leading-loose',
    xlarge: 'text-lg leading-loose font-medium'
  }[fontSize];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${themeClasses.bg} font-sans transition-colors duration-200 select-text`}>
      {/* Distraction-Free Presence Top Bar */}
      <header className={`px-6 py-3.5 border-b flex items-center justify-between ${themeClasses.surface} shadow-md`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest font-black text-rose-400">
              {currentLang === 'om' ? 'DHADDACHA HOJIIRRA JIRU' : currentLang === 'am' ? 'የቀጥታ ችሎት ሂደት' : 'LIVE ACTIVE HEARING'}
            </span>
          </div>

          <span className="text-neutral-700">|</span>

          <div>
            <h1 className="text-sm font-bold flex items-center gap-2">
              <Gavel className="w-4 h-4 text-amber-400" />
              <span>{courtName}</span>
              <span className="text-xs opacity-75 font-normal">({bench})</span>
            </h1>
          </div>
        </div>

        {/* Center Live Session Elapsed Timer */}
        <div className="flex items-center gap-3 bg-black/40 px-4 py-1.5 rounded-2xl border border-neutral-800">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-sm font-bold tracking-widest">
            {formatTimer(courtTimerSeconds)}
          </span>
          <button
            type="button"
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
          >
            {isTimerRunning ? 'Pause' : 'Resume'}
          </button>
        </div>

        {/* Controls: Mode, Font Size, Objections, Exit */}
        <div className="flex items-center gap-2.5">
          {/* Contrast Mode Selector */}
          <div className="flex items-center bg-black/50 p-1 rounded-xl border border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setContrastMode('pure-black')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                contrastMode === 'pure-black' ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'
              }`}
              title="Pure Black AMOLED Contrast"
            >
              Pure Black
            </button>
            <button
              type="button"
              onClick={() => setContrastMode('high-contrast-amber')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                contrastMode === 'high-contrast-amber' ? 'bg-amber-400 text-black' : 'text-neutral-400 hover:text-amber-200'
              }`}
              title="High Contrast Amber"
            >
              Amber High-Vis
            </button>
            <button
              type="button"
              onClick={() => setContrastMode('paper-sepia')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                contrastMode === 'paper-sepia' ? 'bg-[#c4a464] text-black' : 'text-neutral-400 hover:text-stone-200'
              }`}
              title="Parchment Sepia"
            >
              Sepia
            </button>
          </div>

          {/* Font Resizer */}
          <div className="flex items-center bg-black/50 p-1 rounded-xl border border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setFontSize('normal')}
              className={`px-2 py-1 rounded-lg font-mono font-bold ${fontSize === 'normal' ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize('large')}
              className={`px-2.5 py-1 rounded-lg font-mono font-bold text-sm ${fontSize === 'large' ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => setFontSize('xlarge')}
              className={`px-3 py-1 rounded-lg font-mono font-bold text-base ${fontSize === 'xlarge' ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}
            >
              A++
            </button>
          </div>

          {/* Exit Presence Mode */}
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-rose-900/60 text-neutral-300 hover:text-rose-200 border border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            <span>{currentLang === 'om' ? 'Dhaddacha Bahi' : currentLang === 'am' ? 'ከችሎት ሁነታ ውጣ' : 'Exit Courtroom Mode'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout: Reading Dossier vs. Quick Objections & Notes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Distraction-Free Case Reader */}
        <section className="flex-1 flex flex-col border-r border-neutral-800 overflow-hidden">
          {/* Case File Metadata Header */}
          <div className={`p-4 border-b ${themeClasses.surface} flex items-center justify-between`}>
            <div>
              <span className={`text-xs font-mono uppercase font-bold tracking-widest ${themeClasses.accent}`}>
                {caseFile?.caseNumber || 'OR/CC/0482/2026'} • {caseFile?.type || 'Appellate Review'}
              </span>
              <h2 className="text-xl font-bold font-serif-legal mt-0.5">
                {caseFile?.title || 'Dhimma Falmii Lafa Magaalaa fi Kompensenshinii'}
              </h2>
            </div>
            <div className="text-right text-xs">
              <span className="text-neutral-400 block font-mono">Abbaa Seeraa / Bench</span>
              <span className="font-bold text-amber-300">{activeJudge}</span>
            </div>
          </div>

          {/* Tabs for Left Column */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-neutral-800 text-xs bg-black/20">
            <button
              type="button"
              onClick={() => setActiveTab('dossier')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'dossier' 
                  ? 'border-amber-400 text-amber-300' 
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              📄 {currentLang === 'om' ? 'Qabiyyee Galmee (Case Dossier)' : 'የጉዳይ ፋይል ይዘት'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('objections')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'objections' 
                  ? 'border-amber-400 text-amber-300' 
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              ⚖️ {currentLang === 'om' ? `Mormiilee Galmaa'an (${recordedObjections.length})` : `የተመዘገቡ መቃወሚያዎች (${recordedObjections.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quick_notes')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'quick_notes' 
                  ? 'border-amber-400 text-amber-300' 
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              ✍️ {currentLang === 'om' ? `Yaadannoo Dhaddachaa (${quickNotesList.length})` : `የችሎት ማስታወሻ (${quickNotesList.length})`}
            </button>
          </div>

          {/* Tab 1: Distraction Free Case Dossier Content */}
          {activeTab === 'dossier' && (
            <div className={`flex-1 p-8 overflow-y-auto space-y-6 ${fontClasses}`}>
              <div className={`p-6 rounded-2xl border ${themeClasses.surface} shadow-lg space-y-4`}>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs font-mono">
                  <span className="text-amber-400 font-bold uppercase">1. Himannaa & Iyyannoo Jalqabaa (Initial Pleadings)</span>
                  <span className="text-neutral-400">Galmee Lakk: {caseFile?.caseNumber || 'OR/CC/0482/2026'}</span>
                </div>
                <p>
                  Himatamaan qaama bulchiinsaa fi abbaa qabeenyaa dhuunfaa gidduutti waliigaltee qabeenya lafaa fi manaa irratti komii ka\'e dha. Himataan akka ibsetti, bu\'uura Heera Mootummaa Federaalaa Keeyyata 40(8) fi Labsii Lafa Magaalaa lakkoofsa 721/2011tiin beenyaan madaalawaan osoo hin kaffalamin qabeenyi isaa qabameera.
                </p>
                <p>
                  Gama biraatiin, Bulchiinsi Magaalaa deebii kenneen, kompensenshiniin bu\'uura dambii fi qajeelfama kaffaltii beenyaa yeroo ammaa hojiirra jiruun shallagamee baankitti dhangalaafamuu isaa mirkaneessee jira.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border ${themeClasses.surface} shadow-lg space-y-4`}>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs font-mono">
                  <span className="text-amber-400 font-bold uppercase">2. Qabxiiwwan Falmii Dhaddachaa (Framed Issues of Law)</span>
                  <span className="text-neutral-400">Civil Procedure Code Art. 247</span>
                </div>
                <ol className="list-decimal pl-5 space-y-2.5">
                  <li>
                    <strong>Qabxii 1:</strong> Shallaggiin beenyaa raawwatame bu\'uura Heera Mootummaa fi Labsii 1161/2011 (Labsii Bu\'uuraalee Misoomaaf Lafa Gadi-lakkisiisuu fi Beenyaa) tiin raawwatameeraa?
                  </li>
                  <li>
                    <strong>Qabxii 2:</strong> Qabeenya dhabameef madaallii gatii gabaa yeroo taatee sana ture madaaluuf ragaan ogeessa dhimmi ilaallatu (Expert Appraiser) dhiyaachuu qaba turee?
                  </li>
                  <li>
                    <strong>Qabxii 3:</strong> Dhaddachi Ijibbaataa Mana Murtii Waliigalaa Federaalaa (Jildii 14, Lakk. Galmee 88921) irratti qajeeltoon murtii kenne dhimmichaaf qajeelfama dirqisiisaa ta\'aa?
                  </li>
                </ol>
              </div>

              <div className={`p-6 rounded-2xl border ${themeClasses.surface} shadow-lg space-y-4`}>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs font-mono">
                  <span className="text-amber-400 font-bold uppercase">3. Ragaalee Dhiyaatanii fi Dhaddachaan Qoraman (Submitted Evidence)</span>
                  <span className="text-neutral-400">Exhibits A-1 to A-5</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-black/40 rounded-xl border border-neutral-800">
                    <span className="text-amber-400 font-mono font-bold block mb-1">Ragaa 1 (Exhibit A-1)</span>
                    <span className="text-white font-medium">Waraqaa Ragaa Abbaa Qabeenyummaa Lafaa (Original Title Deed No. OM/AD/88219)</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-neutral-800">
                    <span className="text-amber-400 font-mono font-bold block mb-1">Ragaa 2 (Exhibit A-2)</span>
                    <span className="text-white font-medium">Gabaasa Madaallii Beenyaa Waajjira Lafaa Magaalaa Adaamaa</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-neutral-800">
                    <span className="text-amber-400 font-mono font-bold block mb-1">Ragaa 3 (Exhibit B-1)</span>
                    <span className="text-white font-medium">Ragaa Baankii Kaffaltii Beenyaa Akkaawuntii Cufaa (Escrow Bank Receipt)</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-neutral-800">
                    <span className="text-amber-400 font-mono font-bold block mb-1">Ragaa 4 (Exhibit B-2)</span>
                    <span className="text-white font-medium">Xalayaa Akeekkachiisaa guyyaa 90 dura himatamaaf kenname</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Logged Objections & Bench Rulings */}
          {activeTab === 'objections' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {recordedObjections.length === 0 ? (
                <div className="py-20 text-center text-neutral-500">
                  <Scale className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">
                    {currentLang === 'om' ? 'Mormiin dhaddacha irratti galmaa\'e hin jiru.' : 'በችሎቱ የተመዘገበ መቃወሚያ የለም።'}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">
                    {currentLang === 'om' ? 'Kallattii mirgaa irraa mormii filachuun murtii battalaa kennaa.' : 'Use the right panel to log instant objections and rulings.'}
                  </p>
                </div>
              ) : (
                recordedObjections.map((rec) => (
                  <div key={rec.id} className={`p-4 rounded-2xl border ${themeClasses.surface} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        rec.ruling === 'Sustained' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        rec.ruling === 'Overruled' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        ⚖️ {rec.ruling.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-neutral-400">{rec.timestamp}</span>
                    </div>
                    <h4 className="font-bold text-sm text-white">
                      {currentLang === 'om' ? rec.objection.titleOm : currentLang === 'am' ? rec.objection.titleAm : rec.objection.titleEn}
                    </h4>
                    <p className="text-xs text-neutral-400 font-mono">
                      Madda: {rec.objection.legalBasis}
                    </p>
                    <p className="text-xs text-amber-200/90 italic bg-black/40 p-2.5 rounded-xl border border-neutral-800">
                      "Murtii Dhaddachaa: {rec.rulingNote}"
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Quick Judicial Hearing Notes */}
          {activeTab === 'quick_notes' && (
            <div className="flex-1 p-6 flex flex-col overflow-hidden space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddQuickNote()}
                  placeholder={currentLang === 'om' ? 'Yaadannoo dhaddachaa battalatti barreessi...' : 'ፈጣን የችሎት ማስታወሻ ይፃፉ...'}
                  className="flex-1 bg-black/60 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddQuickNote}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer transition-all"
                >
                  Galmeessi
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {quickNotesList.length === 0 ? (
                  <div className="py-20 text-center text-neutral-500">
                    <p className="text-sm font-medium">Yaadannoon battalaa hin jiru.</p>
                  </div>
                ) : (
                  quickNotesList.map((n, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${themeClasses.surface} flex items-start gap-3 text-xs`}>
                      <span className="font-mono text-amber-400 shrink-0">{n.time}</span>
                      <p className="text-neutral-200 flex-1">{n.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Common Legal Objections Rapid Deck */}
        <aside className={`w-96 flex flex-col ${themeClasses.surface} overflow-hidden`}>
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                {currentLang === 'om' ? 'Mormiilee Seeraa Dhaddachaa' : currentLang === 'am' ? 'የህግ መቃወሚያዎች ሰሌዳ' : 'Courtroom Objections Deck'}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">Quick-Action</span>
          </div>

          {/* Objections List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
            {COMMON_OBJECTIONS.map((obj) => (
              <button
                key={obj.id}
                type="button"
                onClick={() => setSelectedObjection(obj)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedObjection?.id === obj.id
                    ? `${themeClasses.surfaceActive} shadow-lg ring-1 ring-amber-400`
                    : 'bg-black/30 hover:bg-black/60 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-800 text-amber-300">
                    {obj.category}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                </div>
                <h4 className="font-bold text-xs text-white mt-1.5 leading-snug">
                  {currentLang === 'om' ? obj.titleOm : currentLang === 'am' ? obj.titleAm : obj.titleEn}
                </h4>
                <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                  {currentLang === 'om' ? obj.descriptionOm : currentLang === 'am' ? obj.descriptionAm : obj.descriptionEn}
                </p>
                <span className="text-[10px] font-mono text-amber-400/80 mt-1.5 block">
                  {obj.legalBasis}
                </span>
              </button>
            ))}
          </div>

          {/* Selected Objection Ruling Panel */}
          {selectedObjection && (
            <div className="p-4 bg-black/80 border-t border-amber-500/40 space-y-3 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Murtii Dhaddachaa (Bench Ruling)</span>
                <button
                  type="button"
                  onClick={() => setSelectedObjection(null)}
                  className="text-neutral-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs font-bold text-white">
                {currentLang === 'om' ? selectedObjection.titleOm : selectedObjection.titleEn}
              </p>
              <p className="text-[11px] text-neutral-300 italic">
                "{selectedObjection.rulingGuidance}"
              </p>

              {/* Instant Ruling Buttons: Sustained (Fudhatameera), Overruled (Kuffifameera), Noted */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleRecordRuling('Sustained')}
                  className="px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex flex-col items-center gap-0.5"
                >
                  <span>✓ Fudhatame</span>
                  <span className="text-[9px] font-mono opacity-80">(Sustained)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRecordRuling('Overruled')}
                  className="px-2 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex flex-col items-center gap-0.5"
                >
                  <span>✕ Kuffifame</span>
                  <span className="text-[9px] font-mono opacity-80">(Overruled)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRecordRuling('Noted')}
                  className="px-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs shadow-md transition-all cursor-pointer flex flex-col items-center gap-0.5"
                >
                  <span>⚖️ Galmaa'e</span>
                  <span className="text-[9px] font-mono opacity-80">(Noted)</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
