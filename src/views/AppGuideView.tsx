import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { StoreDownloadSection } from '../components/StoreDownloadSection';
import { InteractiveAppGuideBoxes } from '../components/InteractiveAppGuideBoxes';

interface AppGuideViewProps {
  currentLang: Language;
  onNavigate: (tab: string) => void;
}

export const AppGuideView: React.FC<AppGuideViewProps> = ({
  currentLang,
  onNavigate,
}) => {
  const t = translations[currentLang];
  const [activeGuideTab, setActiveGuideTab] = useState<'purpose' | 'benefits' | 'pro_se' | 'citation_guide' | 'how_to_use'>('purpose');

  // Legal Citation Style Guide State
  const [citationCategory, setCitationCategory] = useState<'court_ruling' | 'constitution' | 'proclamation' | 'regulation'>('court_ruling');
  const [copiedCitationKey, setCopiedCitationKey] = useState<string | null>(null);

  // Court Ruling inputs
  const [rulingApplicant, setRulingApplicant] = useState('Commercial Bank of Ethiopia');
  const [rulingRespondent, setRulingRespondent] = useState('Bekele Feyisa');
  const [rulingCourt, setRulingCourt] = useState<'federal_cassation' | 'oromia_cassation' | 'federal_high'>('federal_cassation');
  const [rulingDocket, setRulingDocket] = useState('89234');
  const [rulingVolume, setRulingVolume] = useState('16');
  const [rulingPage, setRulingPage] = useState('245');
  const [rulingYear, setRulingYear] = useState('2007');
  const [rulingCalendar, setRulingCalendar] = useState<'EC' | 'GC'>('EC');

  // Constitutional Article inputs
  const [constConstitution, setConstConstitution] = useState<'fdre' | 'oromia_revised'>('fdre');
  const [constArticle, setConstArticle] = useState('37');
  const [constSubArticle, setConstSubArticle] = useState('1');
  const [constParagraph, setConstParagraph] = useState('');

  // Proclamation / Code inputs
  const [procType, setProcType] = useState<'labor' | 'commercial' | 'civil' | 'courts' | 'custom'>('labor');
  const [procNumber, setProcNumber] = useState('1156/2019');
  const [procTitleOm, setProcTitleOm] = useState('Labsii Dhimma Hojjetaa fi Hojjechiisaa');
  const [procTitleAm, setProcTitleAm] = useState('የአሠሪና ሠራተኛ ጉዳይ አዋጅ');
  const [procTitleEn, setProcTitleEn] = useState('Labor Proclamation');
  const [procArticle, setProcArticle] = useState('27');
  const [procSubArticle, setProcSubArticle] = useState('1');

  // Regulation / Directive inputs
  const [regType, setRegType] = useState<'ministers' | 'nbe' | 'custom'>('ministers');
  const [regNumber, setRegNumber] = useState('487/2022');
  const [regTitleOm, setRegTitleOm] = useState('Dambii Tajaajila Hojjettoota Federaalaa');
  const [regTitleAm, setRegTitleAm] = useState('የፌዴራል የመንግስት ሰራተኞች ደንብ');
  const [regTitleEn, setRegTitleEn] = useState('Federal Civil Service Regulation');
  const [regArticle, setRegArticle] = useState('15');

  // Interactive Citation Validator State
  const [validatorInput, setValidatorInput] = useState('FSC Cassation Div., Docket No. 89234, Vol. 16, p. 245 (2007 E.C.)');

  const copyCitation = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedCitationKey(key);
    setTimeout(() => {
      setCopiedCitationKey(null);
    }, 2000);
  };

  const [selectedFilingType, setSelectedFilingType] = useState<'claim' | 'defense' | 'appeal'>('claim');
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  const toggleStep = (stepId: string) => {
    setChecklistState(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const filingChecklists = {
    claim: {
      title: currentLang === 'om' ? 'Himannaa Qopheessuu (Statement of Claim)' : currentLang === 'am' ? 'የክስ ማመልከቻ ዝግጅት (Statement of Claim)' : 'Statement of Claim Preparation',
      steps: [
        { id: 'c1', text: currentLang === 'om' ? 'Mana murtii sirrii filachuu (Lafaa ykn Hanga Qabeenyaa)' : currentLang === 'am' ? 'ትክክለኛውን ፍርድ ቤት መምረጥ (የአካባቢ እና የገንዘብ መጠን ስልጣን)' : 'Determine correct court jurisdiction (Territorial & Pecuniary)' },
        { id: 'c2', text: currentLang === 'om' ? 'Maqaa, Teessoo fi Eenyummaa Himataa fi Himatamaa guutuu galmeessuu' : currentLang === 'am' ? 'የከሳሽ እና ተከሳሽ ሙሉ ስም እና አድራሻ ማካተት' : 'List complete particulars and addresses of Plaintiff & Defendant' },
        { id: 'c3', text: currentLang === 'om' ? 'Sababa falmii (Cause of Action) Koodii Siiviilii hordofee ibsuu' : currentLang === 'am' ? 'የክርክሩን ፍሬ ነገር ከፍትሐ ብሔር ህግ አንቀጾች ጋር ማያያዝ' : 'Detail the legal cause of action referencing Civil/Commercial code' },
        { id: 'c4', text: currentLang === 'om' ? 'Gaaffii qulqulluu (Relief Sought / What is demanded) kaasuun' : currentLang === 'am' ? 'ፍርድ ቤቱ እንዲወስንልዎ የሚፈልጉትን ግልጽ የውሳኔ ጥያቄ ማስቀመጥ' : 'Clearly specify the exact relief or compensation demanded' },
        { id: 'c5', text: currentLang === 'om' ? 'SeeraAI Document Auditor / Logic Auditor fayyadamuun madaaluu' : currentLang === 'am' ? 'ሰነዱን በSeeraAI ሎጂክ ኦዲተር በመፈተሽ ስህተቶችን ማረም' : 'Audit draft with SeeraAI Document Auditor to eliminate formal errors' },
        { id: 'c6', text: currentLang === 'om' ? 'Mallattoo fi Ragaalee deggeran (Exhibits) qindeessuu' : currentLang === 'am' ? 'ፊርማ ማኖር እና ደጋፊ ማስረጃዎችን (ማስረጃ ሰነዶች) ማያያዝ' : 'Sign documents and organize supporting exhibits/evidence attachments' }
      ]
    },
    defense: {
      title: currentLang === 'om' ? 'Deebii Himannaa (Statement of Defense)' : currentLang === 'am' ? 'የመከላከያ መልስ (Statement of Defense)' : 'Statement of Defense Preparation',
      steps: [
        { id: 'd1', text: currentLang === 'om' ? 'Yeroo beellamaa keessatti (Guyyaa 30 keessatti) deebii qopheessuu' : currentLang === 'am' ? 'በቀጠሮ ጊዜ (በ30 ቀናት ውስጥ) የመከላከያ መልስ ማዘጋጀት' : 'Prepare defense within legal statutory deadlines (e.g. 30 days)' },
        { id: 'd2', text: currentLang === 'om' ? 'Mormii Dura-Ajaa (Preliminary Objections: Aangoof, Yeroof, ykn Eenyummaaf)' : currentLang === 'am' ? 'የመጀመሪያ ደረጃ መቃወሚያዎችን (ስልጣን፣ የጊዜ ገደብ) ማቅረብ' : 'Raise preliminary objections (Jurisdiction, Statute of limitations)' },
        { id: 'd3', text: currentLang === 'om' ? 'Himannaa dhiyaate tokko tokkoon mormuu ykn amanuu (Seriatim Denials)' : currentLang === 'am' ? 'የቀረቡትን የክስ ነጥቦች በግልጽ ማስተባበል ወይም መቀበል' : 'Address each allegation in the claim individually (Admit or Deny)' },
        { id: 'd4', text: currentLang === 'om' ? 'Ragaalee makuu (Counter-evidence & Affirmative Defenses)' : currentLang === 'am' ? 'ተቃራኒ ማስረጃዎችን እና የመከላከያ ነጥቦችን ማሰባሰብ' : 'Compile affirmative defenses and counter-evidence' }
      ]
    },
    appeal: {
      title: currentLang === 'om' ? 'Ol-iyyannoo / Ijibbaata (Appeal & Cassation)' : currentLang === 'am' ? 'ይግባኝ እና የሰበር አቤቱታ (Appeal & Cassation)' : 'Appeal & Cassation Review',
      steps: [
        { id: 'a1', text: currentLang === 'om' ? 'Murtee Mana Murtii Gadii (Judgment Copy) fi Guyyaa fudhachuu' : currentLang === 'am' ? 'የታችኛው ፍርድ ቤት ውሳኔ ግልባጭ እና የሰነድ ማረጋገጫ ማግኘት' : 'Obtain certified copy of lower court judgment' },
        { id: 'a2', text: currentLang === 'om' ? 'Dogoggora Seeraa (Errors of Law) murtiichaa adda baasuu' : currentLang === 'am' ? 'በውሳኔው ላይ የተፈጸሙ የህግ ስህተቶችን (Errors of Law) መለየት' : 'Identify specific errors of law or fundamental miscarriage of justice' },
        { id: 'a3', text: currentLang === 'om' ? 'Murtiiwwan Ijibbaataa duraanii (Precedents) wal-bira qabuu' : currentLang === 'am' ? 'አግባብነት ያላቸውን የሰበር ውሳኔዎች (Precedents) ማጣቀስ' : 'Reference relevant Supreme Court Cassation Division precedents' },
        { id: 'a4', text: currentLang === 'om' ? 'SeeraAI Cassation Simulator fayyadamuun carraa qorachuu' : currentLang === 'am' ? 'የSeeraAI የሰበር ሲሙሌተር በመጠቀም የድል ዕድልዎን መገምገም' : 'Simulate appeal success probability using SeeraAI Cassation Simulator' }
      ]
    }
  };

  const currentSteps = filingChecklists[selectedFilingType].steps;
  const completedCount = currentSteps.filter(s => checklistState[s.id]).length;
  const progressPercentage = Math.round((completedCount / currentSteps.length) * 100);

  return (
    <div className="space-y-8 pb-16">
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
            <span>⚖️</span>
            <span>Afaan Oromoo • አማርኛ • English</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif-legal font-bold text-slate-100 leading-tight">
            {currentLang === 'om'
              ? 'Kaayyoo, Faayidaa & Haala Itti Fayyadama Appii SeeraAI'
              : currentLang === 'am'
              ? 'የSeeraAI መተግበሪያ ዓላማ፣ ጥቅሞች እና የአጠቃቀም መመሪያ'
              : 'SeeraAI App Vision, Benefits & Complete User Guide'}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {currentLang === 'om'
              ? 'Qorannoo seeraa, waliigaltee qopheessuu, xiinxala sanadaa, fi murteewwan dhaddacha ijoo Itoophiyaa afaanota sadeeniin (Afaan Oromoo, Amharic, English) salphaatti fayyadamuu akka dandeessaniif gabaasa guutuu.'
              : currentLang === 'am'
              ? 'የሕግ ምርምር፣ ውል ዝግጅት፣ የሰነድ ትንተና እና የኢትዮጵያ ሰበር መዝገቦችን በሦስት ቋንቋዎች በቀላሉ ለመጠቀም የሚያስችል የተሟላ መመሪያ።'
              : 'A comprehensive guide explaining the founding mission, key benefits, and step-by-step instructions for legal professionals, citizens, and businesses.'}
          </p>
        </div>
      </div>

      {/* Interactive Feature & User Guide Box System (Sanduuqawwan Qajeelfamaa fi Fooyyainsaa) */}
      <InteractiveAppGuideBoxes 
        currentLang={currentLang} 
        onNavigate={onNavigate} 
      />

      {/* Official App Store & Play Store Download Component with Device Detection & Secured API Proxy */}
      <StoreDownloadSection currentLang={currentLang} />

      {/* Navigation Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => setActiveGuideTab('purpose')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'purpose'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🎯</span>
          <span>
            {currentLang === 'om' ? '1. Kaayyoo Kalaqa' : currentLang === 'am' ? '1. ዓላማ' : '1. Purpose'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGuideTab('benefits')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'benefits'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>💡</span>
          <span>
            {currentLang === 'om' ? '2. Faayidaa' : currentLang === 'am' ? '2. ጥቅሞች' : '2. Benefits'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGuideTab('pro_se')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'pro_se'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>⚖️</span>
          <span>
            {currentLang === 'om' ? '3. Qajeelcha Pro-Se (Of Danda\'anii)' : currentLang === 'am' ? '3. የPro-Se (ራሱን የሚወክል) መመሪያ' : '3. Pro-Se Litigant Guide'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGuideTab('citation_guide')}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'citation_guide'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📜</span>
          <span>
            {currentLang === 'om' ? '4. Qajeelfama Caqasa Seeraa' : currentLang === 'am' ? '4. የህግ ጥቅስ እና ዋቢ መመሪያ' : '4. Citation Style Guide'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGuideTab('how_to_use')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeGuideTab === 'how_to_use'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📱</span>
          <span>
            {currentLang === 'om' ? '5. Itti Fayyadamaa' : currentLang === 'am' ? '5. አጠቃቀም' : '5. How-To-Use'}
          </span>
        </button>
      </div>

      {/* TAB 1: KAAYYOO KALAQA APPII KANAA */}
      {activeGuideTab === 'purpose' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
              🎯
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                {currentLang === 'om' ? 'Mul\'ata, Kaayyoo & Qorannoo SeeraAI' : currentLang === 'am' ? 'የSeeraAI ራዕይ፣ ዓላማ እና የምርምር ትንተና' : 'SeeraAI Founding Vision, Purpose & Research Analysis'}
              </h2>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' ? 'Kaayyoo, mul\'ata fi wal-bira qorannoo madda rakkoo fi furmaataa' : 'የመተግበሪያው አመሰራረት ዓላማ፣ ራዕይ እና የመፍትሄዎች ንጽጽር'}
              </p>
            </div>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            {/* Vision and Purpose highlighted cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/25 space-y-2">
                <span className="text-amber-400 text-sm font-bold block uppercase tracking-wider font-mono">
                  {currentLang === 'om' ? '🌟 Mul\'ata Keenya (Our Vision):' : '🌟 ራዕያችን (Our Vision):'}
                </span>
                <p className="text-slate-200 leading-relaxed text-xs">
                  {currentLang === 'om'
                    ? 'Sirna seeraa Itoophiyaa teeknooloojii AI sadarkaa olaanaan ammayyeessuu, wal-qixxummaa afaanota sadeenii (Afaan Oromoo, Amharic, English) mirkaneessuu, fi dhimmoota falmii daqiiqaa muraasa keessatti qulqulluun xiinxaluu.'
                    : 'የኢትዮጵያን የህግ ስርዓት በከፍተኛ የሰው ሰራሽ አስተዋፅኦ (AI) ቴክኖሎጂ ማዘመን፣ ባለ 3 ቋንቋዎችን እኩልነት ማረጋገጥ እና የህግ ሰነዶችንና ክርክሮችን በሴኮንዶች ውስጥ በተሟላ ሁኔታ መተንተን።'}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/25 space-y-2">
                <span className="text-emerald-400 text-sm font-bold block uppercase tracking-wider font-mono">
                  {currentLang === 'om' ? '🎯 Kaayyoo Keenya (Our Purpose):' : '🎯 ዓላማችን (Our Purpose):'}
                </span>
                <p className="text-slate-200 leading-relaxed text-xs">
                  {currentLang === 'om'
                    ? 'Ogeeyyii seeraa fi lammiilee gargaaruun yeroo, baasii, fi balaa seeraa (legal risks) qophii waliigaltee fi barbaacha murteewwan dhaddacha ijoo keessatti mudatan guutummaatti oolchuu fi dhabamsiisuudha.'
                    : 'የህግ ባለሙያዎችን እና ማህበረሰቡን በመደገፍ ጊዜን፣ ገንዘብን እና በውል ሰነዶች አዘገጃጀትና በሰበር ውሳኔዎች ፍለጋ ላይ የሚከሰቱ ህጋዊ ስጋቶችን (legal risks) በከፍተኛ ሁኔታ መቀነስ እና ማስወገድ።'}
                </p>
              </div>
            </div>

            {/* Social Media Link & Confidentiality Guarantee Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-amber-500/35 space-y-3 shadow-xl">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 text-lg font-bold">🔒</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                    <span>{currentLang === 'om' ? 'Link Social Media & Eegumsa Iccitii Dhuunfaa (Zero Data Leak)' : 'የሶሻል ሚዲያ ሊንክ እና የውሂብ ሚስጥራዊነት ዋስትና'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                      100% Client-Side Isolated
                    </span>
                  </h3>
                  <span className="text-[11px] text-amber-400 font-mono">
                    https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>📲</span>
                    <span>{currentLang === 'om' ? 'Link Social Media Irratti Qoodamu:' : 'በሶሻል ሚዲያ የሚጋራው ሊንክ፡'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {currentLang === 'om'
                      ? 'Linkiin appii kanaa kan jalqaba irraa kaasee Facebook, Telegram, WhatsApp ykn TikTok irratti qoodame akkuma jirutti hojjata. Namni kamiyyuu link kanaan yeroo seenu yeroma sana sadarkaa appii ammayyaa (Version 4.0.0) kan qorannoo seeraa, kuusaa dhaddacha ijoo, fi AI qabate argata.'
                      : 'መተግበሪያው ከመጀመሪያ ጀምሮ በፌስቡክ፣ ቴሌግራም፣ ዋትስአፕ ወይም ሌሎች ማህበራዊ ሚዲያዎች የተጋራው ሊንክ ሳይለወጥ አሁንም በቀጥታ ይሰራል። ተጠቃሚዎች ሊንኩን ሲከፍቱ አዲሱን ስሪት (Version 4.0.0) ወዲያውኑ ያገኛሉ።'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>{currentLang === 'om' ? 'Iccitii fi Nageenya Guutuu (Zero Leak):' : 'ሙሉ ሚስጥራዊነት እና ደህንነት፡'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {currentLang === 'om'
                      ? 'Sanadoonni dhuunfaa, galmeewwan man-murtii, beellamoonni, fi qabiyyee iccitii keessan meeshaa (device) keessan qofa irratti koodii dhoksaa AES-GCM fi biometrics\'n cufamee taa\'a. Namni link social media irraa seene kamiyyuu sanada ykn iccitii keessan GONKUMA ARGUU YKN TUQUU HIN DANDA\'U.'
                      : 'የእርስዎ የግል ሰነዶች፣ የፍርድ ቤት መዝገቦች እና ሚስጥራዊ ማስታወሻዎች በእርስዎ መሳሪያ ላይ ብቻ በAES-GCM እና ባዮሜትሪክስ ተቆልፈው ይቀመጣሉ። ሊንኩን የተጠቀመ ሌላ ሰው የእርስዎን መረጃ በፍፁም ማየት ወይም መድረስ አይችልም።'}
                  </p>
                </div>
              </div>
            </div>

            {/* Global Access & Diaspora Scope Banner */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 text-xs space-y-2">
              <span className="text-cyan-400 font-bold uppercase font-mono tracking-wider flex items-center gap-1.5 text-xs">
                <span>🌍</span>
                <span>
                  {currentLang === 'om'
                    ? 'Daangaa Qaqqabummaa Addunyaa (Global Access & Search Scope):'
                    : currentLang === 'am'
                    ? 'ዓለም አቀፍ ተደራሽነት እና የፍለጋ ወሰን (Global Access Scope)፦'
                    : 'Global Access & Search Scope:'}
                </span>
              </span>
              <p className="text-slate-300 leading-relaxed text-xs">
                {currentLang === 'om'
                  ? 'SeeraAI (SAI Ethio) daangaa biyyaa malee addunyaa gubbaa eessayyuu ta\'anii qorannoo seera Itoophiyaa gadi fageenyaan akka gaggeessaniif qindaa\'eera. Diaspora Itoophiyaa fi ogeeyyii addunyaaf tajaajilli kun 24/7 banaadha. Qorannoon keessan daangaa teessuma lafaatiin hin daangeffamu; bakka intarneetiin jirutti tajaajila seeraa Afaan Oromoo, Amharic, fi English\'n ni argattu.'
                  : currentLang === 'am'
                  ? 'የSeeraAI (SAI Ethio) መድረክ የኢትዮጵያን ሕጎች በዓለም ዙሪያ የትም ሆነው ለመመርመር እንዲችሉ ተደርጎ የተዘጋጀ ነው። ዲያስፖራዎች እና ዓለም አቀፍ ተመራማሪዎች በየትኛውም ሀገር ሆነው 24/7 አገልግሎቱን ማግኘት ይችላሉ። ፍለጋዎ በጂኦግራፊያዊ ወሰን አይገደብም፤ ኢንተርኔት ባለበት ሁሉ የሕግ መረጃዎችን በሦስቱም ቋንቋዎች ያገኛሉ።'
                  : 'SeeraAI (SAI Ethio) is engineered for global accessibility, allowing deep research into Ethiopian Law from anywhere in the world. Our search and audit services are borderless and available 24/7 to the Ethiopian diaspora and international legal experts. Your research is not geographically restricted; you can access legal insights in Oromo, Amharic, and English wherever you are.'}
              </p>
            </div>

            {/* Research Framework: Madda Rakkoo vs Furmaata SeeraAI */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  {currentLang === 'om' ? '📋 Sakatta\'iinsa Qorannoo: Madda Rakkoo vs Furmaata SeeraAI' : '📋 የምርምር ማዕቀፍ፡ የችግሮች ምንጭ እና የSeeraAI መፍትሄዎች'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {currentLang === 'om' ? 'Rakkoowwan seeraa keessatti mudachaa turanii fi furmaata teeknooloojii platformii kanaa' : 'በህግ ስራዎች ላይ የሚከሰቱ ዋና ዋና ችግሮች እና የመተግበሪያው መፍትሄዎች'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    num: '1',
                    problemTitleOm: '1. Barbaacha Murteewwan Ijibbaataa Boodatti Hafe',
                    problemDescOm: 'Barbaacha murteewwan daddacha ijoo jildii 25+ keessaa lakk. galmeen barbaaduun guyyoota qisaasuu fi qorannoo seeraa gufachiisuu.',
                    solutionTitleOm: '1. Barbaacha Sekondii 3 Gidduu (Instant Search)',
                    solutionDescOm: 'Teeknooloojii AI\'n jildii fi lakk. galmeen sekondii 3 gidduutti murtii fi keeyyata eeggatee murtii madaalame fida.',
                    problemTitleEn: '1. Slow Precedent Retrieval',
                    problemDescEn: 'Searching through 25+ volumes of supreme court precedents manually wastes days and hinders legal research.',
                    solutionTitleEn: '1. 3-Second Search Resolution',
                    solutionDescEn: 'AI engine indexes and retrieves cassation precedents by volume or file number in under 3 seconds.',
                    color: 'amber'
                  },
                  {
                    num: '2',
                    problemTitleOm: '2. Daangaa Afaanii fi Hubannoo Seeraa Gidduu Jiru',
                    problemDescOm: 'Seeronni, labsiileen, fi murteewwan afaan tokkoon qofa bahuun dhimma falmii gadi fageenyaan hubachuuf danqaa uumuu.',
                    solutionTitleOm: '2. Hiikkaa Sadeen Tokkummaa (Trilingual Parity)',
                    solutionDescOm: 'Afaan Oromoo, Amharic, fi English wal-qixatti xiinxala dhiyeessuun lammiilee fi ogeeyyiif hubannoo ifa uuma.',
                    problemTitleEn: '2. Language Interpretation Barriers',
                    problemDescEn: 'Laws published in single languages block access and cause misinterpretation across diverse legal groups.',
                    solutionTitleEn: '2. Trilingual Analysis Parity',
                    solutionDescEn: 'Simultaneous analysis in Oromo, Amharic, and English ensures absolute linguistic clarity and equality.',
                    color: 'emerald'
                  },
                  {
                    num: '3',
                    problemTitleOm: '3. Balaa Seeraa Waliigalteewwan Qophaayanii (Legal Risks)',
                    problemDescOm: 'Waliigalteewwan daldalaa fi hojii keeyyattoota gahaa hin taaneen qophaa\'anii balaa dhabamuu mirgaa fi daldalaa fiduu.',
                    solutionTitleOm: '3. Sanad-Qopheessituu Balaa-Maleessaa (Smart Contract AI)',
                    solutionDescOm: 'Keeyyattoota Koodii Siivilii fi Labsii Hojjetaa eeggatanii balaa seeraa malee waliigalteewwan qulqulluu qopheessa.',
                    problemTitleEn: '3. Contractual & Compliance Legal Risks',
                    problemDescEn: 'Contracts missing key clauses under Civil or Labor codes create severe business liabilities and legal disputes.',
                    solutionTitleEn: '3. Risk-Free Smart Drafting AI',
                    solutionDescEn: 'Drafts robust contracts strictly conforming to civil codes, instantly protecting users from future liabilities.',
                    color: 'cyan'
                  }
                ].map((item) => (
                  <div key={item.num} className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-slate-950 border border-slate-850 p-5">
                    {/* Left: Problem Source */}
                    <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-850 pb-4 md:pb-0 md:pr-4">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>{currentLang === 'om' ? 'Madda Rakkoo (Problem Source):' : 'የችግሩ ምንጭ (Problem Source):'}</span>
                      </span>
                      <h4 className="font-bold text-slate-100 text-sm">
                        {currentLang === 'om' ? item.problemTitleOm : item.problemTitleEn}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {currentLang === 'om' ? item.problemDescOm : item.problemDescEn}
                      </p>
                    </div>

                    {/* Right: SeeraAI Solution */}
                    <div className="space-y-1.5 md:pl-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <span>✅</span>
                        <span>{currentLang === 'om' ? 'Furmaata SeeraAI (Our Solution):' : 'የሴራAI መፍትሄ (Our Solution):'}</span>
                      </span>
                      <h4 className="font-bold text-slate-100 text-sm">
                        {currentLang === 'om' ? item.solutionTitleOm : item.solutionTitleEn}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {currentLang === 'om' ? item.solutionDescOm : item.solutionDescEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FAAYIDAA APPII KANAA */}
      {activeGuideTab === 'benefits' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
              💡
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                Faayidaa Appii SeeraAI (Key Benefits & Core Advantages)
              </h2>
              <p className="text-xs text-slate-400">
                Meeshaalee fi tajaajiloota ijoo fayyadamtootaaf dhihaatan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors">
              <span className="text-2xl">⚖️</span>
              <h3 className="font-bold text-sm text-slate-100">Odiitara Loojikii Seeraa (Legal Logic Auditor)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hanqinaalee seera deemsa falmii (SDFHH), ulaagaalee mallattoo, fi waamicha dhabamuu yeroma sana sakatta'uun akeekkachiisa seeraa kenna.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors">
              <span className="text-2xl">📤</span>
              <h3 className="font-bold text-sm text-slate-100">Qophii Sanadaa Qooduu (Secure Share Drafts)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Token nageenyi isaa eegame uumuun ogeessota seeraa waliin tokkummaan sanada qorachuu fi yaada waliif kennuu dandeessisa.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors">
              <span className="text-2xl">📂</span>
              <h3 className="font-bold text-sm text-slate-100">Odiitii Galmee Guutuu (Full Docket Audit)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Galmee mana murtii guutuu (PDF/Image) upload gochuun himannaa, deebii fi ajaja abbaa seeraa gadi fageenyaan xiinxala.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors">
              <span className="text-2xl">✍️</span>
              <h3 className="font-bold text-sm text-slate-100">Waliigaltee Qopheessuu (Contract Drafting)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Waliigalteewwan hojii, daldalaa fi gurgurtaa unkaalee ammayyaa fi koodii siiviilii hordofaniin yeroma sana uuma.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors">
              <span className="text-2xl">🏛️</span>
              <h3 className="font-bold text-sm text-slate-100">Saayimulaatara Murtee (Cassation Simulator)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Murtiiwwan Dhaddacha Ijoo madda godhachuun carraa injifannoo falmii keessanii fi qabxiilee SWOT gadi fageenyaan madaala.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors">
              <span className="text-2xl">🎙️</span>
              <h3 className="font-bold text-sm text-slate-100">Sagaleen Dubbisuu (Voice Dictation)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Afaan Oromoo, Amharic, fi English'n maayikroofoonii fayyadamanii kasee ykn gaaffii dubbachuun gara barreeffamatti jijjiira.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors">
              <span className="text-2xl">🔔</span>
              <h3 className="font-bold text-sm text-slate-100">Beeksisa Haaraa Seeraa (Legal Updates)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Labsiilee fi murteewwan dhaddacha ijoo haaraa bahaaniif iimeelii dhuunfaa irratti beeksisa al-tokkotti erga.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRO-SE LITIGANT GUIDE (OF DANDA'ANII MANA MURTII) */}
      {activeGuideTab === 'pro_se' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
              ⚖️
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                {currentLang === 'om'
                  ? 'Qajeelcha Litigantoota Of Danda\'anii (Pro-Se Guide) - Akkaataa Itti Abukaatoo Malee Mana Murtii Itti Tajaajilamtan'
                  : currentLang === 'am'
                  ? 'የPro-Se (ራሱን የሚወክል ተከራካሪ) መመሪያ - ያለ ጠበቃ የኢትዮጵያን ፍርድ ቤት አሰራር የሚከተሉበት መንገድ'
                  : 'Pro-Se Litigant Guide: Navigating the Ethiopian Court Filing System Without a Lawyer'}
              </h2>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Sirna galmee mana murtii Itoophiyaa, qophii himannaa, fi seera naamusaa eeguun of danda\'anii falmachuu'
                  : currentLang === 'am'
                  ? 'የኢትዮጵያን የፍርድ ቤት ስርዓት ማሰስ፣ ክስ ማዘጋጀት እና የህግ ስነ-ምግባርን ጠብቆ ራስን መከላከል'
                  : 'Mastering court filing workflows, draft submissions, and ethical compliance for self-represented litigants.'}
              </p>
            </div>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            {/* Introduction Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
              <span className="text-amber-400 font-bold uppercase font-mono tracking-wider flex items-center gap-1.5 text-xs">
                <span>🛡️</span>
                <span>
                  {currentLang === 'om' ? 'Maal Jechuudha "Pro-Se"? (What is Pro-Se Litigant?):' : 'Pro-Se (ራስን መمثل) ማለት ምን ማለት ነው?'}
                </span>
              </span>
              <p className="text-slate-200 leading-relaxed text-xs">
                {currentLang === 'om'
                  ? '"Pro-Se" jechuun lammiin tokko abukaatoo (lawyer) malee dhuunfaatti mana murtii dhiyaatee himannaa isaa qopheessuu, ragaa dhiyeessuu, fi mormii deebisuudha. SeeraAI humni AI jiru lammiileen kun akka ogeessa seeraatti qulqullinaan, sirna seera deemisa falmii (SDFHH) eeganii, fi saffisaan galmee isaanii qopheessaniif gargaarsa guutuu kenna.'
                  : 'Pro-Se ማለት አንድ ግለሰብ ያለ ጠበቃ (lawyer) በራሱ ፍርድ ቤት ቀርቦ የክስ መዝገብ የሚያዘጋጅበት፣ ማስረጃ የሚያቀርብበት እና ክርክር የሚያካሂድበት አካሄድ ነው። SeeraAI እነዚህን ተከራካሪዎች የፍትሐ ብሔር እና የንግድ ስነ-ሰርዓት ህጎችን ጠብቀው ጥራት ያለው ሰነድ እንዲያዘጋጁ ይረዳል።'}
              </p>
            </div>

            {/* Interactive Document Preparation Checklist & Progress Tracker */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-amber-500/30 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">
                    {currentLang === 'om' ? 'Qopheessaa Galmee & Hordoffii' : currentLang === 'am' ? 'የሰነድ ዝግጅት ማረጋገጫ ዝርዝር' : 'Interactive Document Preparation Checklist'}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    {currentLang === 'om' ? 'Tarree Qophii Sanada Mana Murtii (Court Filing Checklist)' : currentLang === 'am' ? 'የፍርድ ቤት ሰነድ ዝግጅት እና የሂደት መከታተያ' : 'Ethiopian Court Filing Step-by-Step Progress Tracker'}
                  </h3>
                </div>

                {/* Filing Type Selector */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedFilingType('claim')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFilingType === 'claim' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {currentLang === 'om' ? 'Himannaa' : currentLang === 'am' ? 'የክስ ማመልከቻ' : 'Claim'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFilingType('defense')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFilingType === 'defense' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {currentLang === 'om' ? 'Deebii' : currentLang === 'am' ? 'የመከላከያ መልስ' : 'Defense'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFilingType('appeal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFilingType === 'appeal' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {currentLang === 'om' ? 'Yigabnya / Ijibbaata' : currentLang === 'am' ? 'ይግባኝ/ሰበር' : 'Appeal'}
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {currentLang === 'om' ? 'Haala Qophii (Preparation Progress):' : currentLang === 'am' ? 'የዝግጅት ሂደት (Progress):' : 'Filing Preparation Progress:'}
                  </span>
                  <span className="font-bold font-mono text-amber-400">
                    {completedCount} / {currentSteps.length} ({progressPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-3">
                {currentSteps.map((step, index) => {
                  const isChecked = !!checklistState[step.id];
                  return (
                    <div
                      key={step.id}
                      onClick={() => toggleStep(step.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/30 text-slate-200'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isChecked ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold' : 'bg-slate-950 border-slate-700 text-transparent'
                      }`}>
                        ✓
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] font-mono text-amber-400/80 font-bold uppercase block">
                          Tarkaanfii {index + 1}
                        </span>
                        <p className={`text-xs sm:text-sm font-medium ${isChecked ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                          {step.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const reset = { ...checklistState };
                    currentSteps.forEach(s => { reset[s.id] = false; });
                    setChecklistState(reset);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold border border-slate-800 transition-all cursor-pointer"
                >
                  🔄 {currentLang === 'om' ? 'Haaraatti Jalqabi (Reset)' : currentLang === 'am' ? 'እንደገና ጀምር (Reset)' : 'Reset Checklist'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    alert(
                      currentLang === 'om'
                        ? `Galmeen keessan sadarkaa ${progressPercentage}% irra jira. Qophii kana galmeessuun SeeraAI irratti itti fufaa!`
                        : currentLang === 'am'
                        ? `የሰነድ ዝግጅትዎ በ ${progressPercentage}% ላይ ይገኛል። በSeeraAI በመታገዝ ስራዎን ይቀጥሉ!`
                        : `Your filing checklist is ${progressPercentage}% complete. Keep preparing your documents with SeeraAI!`
                    );
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  📥 {currentLang === 'om' ? 'Qabxii Galmeessuu (Save Progress)' : currentLang === 'am' ? 'ሂደቱን አስቀምጥ (Save Progress)' : 'Save / Export Progress'}
                </button>
              </div>
            </div>

            {/* Step-by-step Pro-Se Court Navigation */}
            <div className="space-y-4 pt-2">
              <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wide">
                {currentLang === 'om'
                  ? '📋 Tarkaanfii 4 Salphaa Mana Murtii Itti Deeman (4-Step Court Navigation)'
                  : '📋 የፍርድ ቤት ሂደቶችን በ4 ቀላል ደረጃዎች ማሰስ'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold font-mono text-xs">1. Qopheessuu Himannaa (Filing a Claim)</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {currentLang === 'om'
                      ? 'Himataan abbaan dhimmaa gosa falmii isaa (Mallaqaa, Hojii, ykn Qabeenyaa) SeeraAI irratti filachuun maqaa abbaa mormaa, sababa falmii, fi gaaffii gaafatamu sirriitti galcha. Appichi koodii siiviilii hordofee himannaa guutuu qopheessa.'
                      : 'ከሳሽ የክሱን አይነት በመምረጥ የተከሳሹን ስድስት ነጥቦች እና የይገባኛል ጥያቄ በSeeraAI በማስገባት የተሟላ የክስ ዝግጅት ያደርጋል።'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold font-mono text-xs">2. Deebii Deebisuu (Filing a Defense)</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {currentLang === 'om'
                      ? 'Yoo tajaajilamaan (Defendant) ta\'etan, himannaa dhiyaate "Court Auditor" irratti upload gochuun mormii seeraa fi mormii qabatamaa (Preliminary & Defense Objections) yeroma sana qopheessuun deebii kennitu.'
                      : 'የተከሳሽ ወገን ከሆኑ የቀረበውን ክስ በመተንተን የመጀመሪያ ደረጃ መቃወሚያዎችን እና የፍሬ ነገር መልስ በሰዓታት ውስጥ ማዘጋጀት ይችላሉ።'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold font-mono text-xs">3. Qindaa\'ina Dhaddachaa (Courtroom Assistant)</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {currentLang === 'om'
                      ? 'Yeroo dhaddachaa sagalee ragaa namaa (Witness Testimony) waraabuu ykn galmeessuun ijoo qulqullaaye qofarratti akka hundaa\'u taasisuun ragaa keessan sirnaan qindeessaa.'
                      : 'በችሎት ሰዓት የምስክር ቃላትን በመቅዳት ወይም በድምጽ በማስገባት የተዋቀረ ማጠቃለያ እና ማስረጃ ማሰባሰብ ይችላሉ።'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold font-mono text-xs">4. Galmee Madaaluu (Docket Audit & Review)</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {currentLang === 'om'
                      ? 'Sanada murtee ykn galmee guutuu oodiiti gochuun hanqina jiru fi carraa injifannoo keessan madaaluun murtii dhaddachaaf qophaa\'aa.'
                      : 'የመዝገቡን ጥንካሬ እና ድክመት በመመርመር የክርክር ስትራቴጂዎን ያስተካክሉ።'}
                  </p>
                </div>
              </div>
            </div>

            {/* Legal Ethics & Pro-Se Responsibility Notice */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
              <span className="text-cyan-400 font-bold uppercase font-mono tracking-wider flex items-center gap-1.5 text-xs">
                <span>⚖️</span>
                <span>
                  {currentLang === 'om'
                    ? 'Naamusaa Seeraa fi Itti Gaafatamummaa Pro-Se (Legal Ethics & Compliance):'
                    : 'የህግ ስነ-ምግባር እና የPro-Se ተከራካሪዎች ሃላፊነት'}
                </span>
              </span>
              <p className="text-slate-300 leading-relaxed text-xs">
                {currentLang === 'om'
                  ? 'SeeraAI meeshaa gargaarsa teeknooloojii cimaa ta\'us, abukaatoo dhuunfaa bakka bu\'uu dhiisuu danda\'a. Tajaajiltoonni Pro-Se dhugaa ta\'uu ragaalee isaanii, kabaja mana murtii, yeroo qacceeffama beellamaa, fi hordoffii seerota deemsa falmii Itoophiyaa (SDFHH) guutuu eeguu qabu. Appichi ragaa sobaa ykn qindeeffama yakkaa hin deeggaru.'
                  : 'SeeraAI ጠንካራ የቴክኖሎጂ ረዳት ቢሆንም የባለሙያ ጠበቃን ሙሉ በሙሉ አይተካም። የPro-Se ተከራካሪዎች የሰነዶቻቸውን እውነተኛነት፣ የፍርድ ቤቱን ክብር እና የኢትዮጵያን የፍደህ ብሔር ስነ-ሰርዓት ህጎች ማክበር አለባቸው። መተግበሪያው ሃሰተኛ ማስረጃዎችን ወይም ህገ-ወጥ ድርጊቶችን አይደግፍም።'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LEGAL CITATION STYLE GUIDE (QAJEELFAMA CAQASA SEERAA) */}
      {activeGuideTab === 'citation_guide' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
              📜
            </span>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-mono mb-1">
                <span>⚖️</span>
                <span>Afaan Oromoo • አማርኛ • English</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-serif-legal font-bold text-slate-100">
                {currentLang === 'om'
                  ? 'Qajeelfama Caqasa Seeraa Itoophiyaa (Legal Citation Style Guide)'
                  : currentLang === 'am'
                  ? 'የኢትዮጵያ የሕግ ጥቅስ እና ዋቢ አቀራረብ መመሪያ (Legal Citation Style Guide)'
                  : 'Ethiopian Legal Citation Style Guide (Standardized Referencing)'}
              </h2>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Akkaataa murtii dhaddacha ijoo, keeyyattoota heera mootummaa, fi labsiilee seeraa sirnaan itti caqafaman afaanota sadaniin'
                  : currentLang === 'am'
                  ? 'የሰበር ችሎት ውሳኔዎች፣ የሕገ-መንግሥት አንቀጾች እና አዋጆች በሦስት ቋንቋዎች የሚጠቀሱበት ወጥ እና ደረጃውን የጠበቀ የአሰራር መመሪያ'
                  : 'Standardized rules for referencing Ethiopian Cassation rulings, constitutional articles, and proclamations within SeeraAI.'}
              </p>
            </div>
          </div>

          {/* Core Principles & Jurisprudential Authority Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🏛️</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Proc. 1234/2021</span>
              </div>
              <h3 className="font-bold text-sm text-slate-100">
                {currentLang === 'om' ? 'Murtii Dhaddacha Ijoo' : currentLang === 'am' ? 'የሰበር ችሎት ውሳኔዎች' : 'Cassation Precedents'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentLang === 'om'
                  ? 'Murtiin Dhaddacha Ijoo MMWF manneen murtii hundaaf dirqisiisaa dha (Labsii 1234/2013 Kew. 10(2)). Caqasni maqaa falmitootaa, galmee, jildii, fuula fi waggaa qabaachuu qaba.'
                  : currentLang === 'am'
                  ? 'የፌ/ጠ/ፍ/ቤት ሰበር ውሳኔዎች ለሁሉም ፍርድ ቤቶች አስገዳጅ ናቸው (አዋጅ 1234/2013 አንቀጽ 10(2))። ጥቅሱ የተከራካሪዎችን ስም፣ የመዝገብ ቁጥር፣ ቅጽ፣ ገጽ እና ዓመተ ምህረት ማካተት አለበት።'
                  : 'Binding on all lower courts pursuant to Proc. 1234/2021 Art. 10(2). Citations must state party names, docket number, official volume, page, and year.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">📜</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Proc. 1/1995</span>
              </div>
              <h3 className="font-bold text-sm text-slate-100">
                {currentLang === 'om' ? 'Keeyyattoota Heeraa' : currentLang === 'am' ? 'የሕገ-መንግሥት አንቀጾች' : 'Constitutional Articles'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentLang === 'om'
                  ? 'Heerri ol’aantummaa seera hundaa ti (Kew. 9). Caqasni Heera RDFI Labsii Lak. 1/1987, keeyyata, keeyyata xiqqaa fi qubee (a, b) ifatti adda baasa.'
                  : currentLang === 'am'
                  ? 'ሕገ-መንግሥቱ የሁሉም ሕጎች የበላይ ነው (አንቀጽ 9)። ጥቅሱ አዋጅ ቁጥር 1/1987፣ ዋና አንቀጽ፣ ንዑስ አንቀጽ እና ፊደልን (ሀ፣ ለ) በግልጽ መጠቆም አለበት።'
                  : 'Supreme law of the land (Art. 9). Cites must identify Proclamation No. 1/1995, article, sub-article, and paragraph letter (e.g. Art. 37(1)(a)).'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">⚖️</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Gazeta Enactments</span>
              </div>
              <h3 className="font-bold text-sm text-slate-100">
                {currentLang === 'om' ? 'Labsiilee fi Koodota' : currentLang === 'am' ? 'አዋጆች እና የሕግ ኮዶች' : 'Proclamations & Codes'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentLang === 'om'
                  ? 'Mata-duree gabaabaa, lakkoofsa labsii fi waggaa labsichaa (Labsii Lak. 1156/2011 ykn 1243/2013) fi keeyyata kallattiin morkisiisu agarsiisa.'
                  : currentLang === 'am'
                  ? 'የአዋጁን አጭር ርዕስ፣ የአዋጅ ቁጥር እና የወጣበትን ዓ.ም (አዋጅ ቁ. 1156/2011 ወይም 1243/2013) እና ተዛማጅ አንቀጾችን ያካተተ መሆን አለበት።'
                  : 'Reference statutory short title, official proclamation number/year (e.g. Proc. No. 1156/2019 or 1243/2021) and pinpoint article.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">📋</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Regs & Directives</span>
              </div>
              <h3 className="font-bold text-sm text-slate-100">
                {currentLang === 'om' ? 'Dambii fi Qajeelfama' : currentLang === 'am' ? 'ደንቦች እና መመሪያዎች' : 'Regulations & Directives'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentLang === 'om'
                  ? 'Dambii Mana Maree Ministeerotaa fi Qajeelfamoota Ministeerotaa/Baankii Biyyooleessaa lakkoofsaa fi qaama baaseen tarreessuun dirqama.'
                  : currentLang === 'am'
                  ? 'የሚኒስትሮች ምክር ቤት ደንቦች እና የሚኒስቴሮች/ብሔራዊ ባንክ መመሪያዎች የወጡበትን ቁጥር እና የወጣበትን አካል በግልጽ መጠቀስ አለባቸው።'
                  : 'Cite the issuing administrative body, regulation or directive number, year, and pinpoint provision for delegated legislation.'}
              </p>
            </div>
          </div>

          {/* Calendar Era Distinction Crucial Notice */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-xs uppercase tracking-wider">
              <span>⚠️</span>
              <span>
                {currentLang === 'om'
                  ? 'Hubachiisa Murteessaa: Bara Itoophiyaa (A.L.I) fi Bara Awurooppaa (A.L.A / G.C.)'
                  : currentLang === 'am'
                  ? 'ወሳኝ ማስታወሻ፡ የኢትዮጵያ ዘመን አቆጣጠር (ዓ.ም) እና የፈረንጆች (እ.ኤ.አ / G.C.) ልዩነት'
                  : 'Crucial Jurisprudential Rule: Ethiopian Calendar (E.C.) vs Gregorian Calendar (G.C.)'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentLang === 'om'
                ? 'Seera Itoophiyaa keessatti lakkoofsi labsii fi waggaan murtii bara Itoophiyaan (A.L.I) fi bara Awurooppaan (G.C.) garaagarummaa waggaa 7 ykn 8 qaba. Fakkeenyaaf: Labsii Dhimma Hojjetaa Lak. 1156/2011 (A.L.I) afaan Ingiliffaatiin "Proclamation No. 1156/2019" jedhamee barreeffama. Galmee mana murtii keessatti sirna heeraa fi daangaa yeroo falmii (Prescription Period) eeguuf sirna lakkoofsa waggaa (A.L.I ykn G.C.) ifatti ibsuun dirqama.'
                : currentLang === 'am'
                ? 'በኢትዮጵያ የሕግ አሰራር ውስጥ የአዋጅ ቁጥር እና የውሳኔ ዓመታት በኢትዮጵያ ዘመን አቆጣጠር (ዓ.ም) እና በፈረንጆች (እ.ኤ.አ / G.C.) መካከል ከ7 እስከ 8 ዓመታት ልዩነት አላቸው። ለምሳሌ የአሠሪና ሠራተኛ አዋጅ ቁጥር 1156/2011 (ዓ.ም) በእንግሊዝኛ "Proclamation No. 1156/2019" ተብሎ ይጠቀሳል። በክርክር ወቅት የጊዜ ገደብ መቃወሚያ (Statute of Limitations) እንዳይነሳ ዘመን አቆጣጠሩን በግልጽ ማመልከት ወሳኝ ነው።'
                : 'In Ethiopian jurisprudence, official proclamations and court judgments differ by 7-8 years depending on calendar system. For example, Labor Proclamation No. 1156/2011 E.C. is cited internationally as Proclamation No. 1156/2019 (G.C.). In legal pleadings, you MUST explicitly specify "E.C." or "G.C." to avoid statute-of-limitations or jurisdictional objections.'}
            </p>
          </div>

          {/* Standardized Citation Formulas Table */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>📐</span>
              <span>
                {currentLang === 'om'
                  ? 'Unkaalee Caqasa Seeraa Dhaabbatoo (Standard Citation Formats)'
                  : currentLang === 'am'
                  ? 'ደረጃቸውን የጠበቁ የሕግ ጥቅስ ቀመሮች (Standard Citation Formats)'
                  : 'Standardized Citation Formulas & Structures'}
              </span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Afaan Oromoo Standard */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block border-b border-emerald-500/20 pb-2">
                  🟢 Sirna Caqasa Afaan Oromoo
                </span>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300">
                    [Himataa] fi [Himatamaa], [Mana Murtii], Galmee Lak. [X], Jildii [Y], Fuula [Z] ([Waggaa A.L.I])
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    <strong className="text-slate-200">Fakkeenya:</strong> Baankii Daldala Itoophiyaa fi Obbo Baqqalaa, Dhaddacha Ijoo MMWF, Galmee Lak. 89234, Jildii 16, Fuula 245 (2007 A.L.I).
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300">
                    Heera Mootummaa RDFI, Labsii Lak. 1/1987, Keeyyata 37(1)
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300">
                    Koodii Daldalaa Itoophiyaa, Labsii Lak. 1243/2013, Keeyyata 182
                  </div>
                </div>
              </div>

              {/* Amharic Standard */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider block border-b border-blue-500/20 pb-2">
                  🔵 የአማርኛ የሕግ ጥቅስ ስርዓት
                </span>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-blue-300">
                    [አመልካች] እና [ተጠሪ]፣ [ፍርድ ቤት]፣ የመዝገብ ቁጥር [X]፣ ቅጽ [Y]፣ ገጽ [Z] ([ዓ.ም])
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    <strong className="text-slate-200">ምሳሌ:</strong> የኢትዮጵያ ንግድ ባንክ እና አቶ በቀለ፣ የፌ/ጠ/ፍ/ቤት ሰበር ሰሚ ችሎት፣ የመዝገብ ቁ. 89234፣ ቅጽ 16፣ ገጽ 245 (2007 ዓ.ም)።
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-blue-300">
                    የኢ.ፌ.ዲ.ሪ ሕገ-መንግሥት፣ አዋጅ ቁጥር 1/1987፣ አንቀጽ 37(1)
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-blue-300">
                    የንግድ ሕግ አዋጅ ቁጥር 1243/2013፣ አንቀጽ 182
                  </div>
                </div>
              </div>

              {/* English Standard */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block border-b border-amber-500/20 pb-2">
                  🟡 English Citation Standard
                </span>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-300">
                    [Applicant] v. [Respondent], [Court Bench], Docket No. [X], Vol. [Y], p. [Z] ([Year E.C./G.C.])
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    <strong className="text-slate-200">Example:</strong> Commercial Bank of Ethiopia v. Bekele, FSC Cassation Div., Docket No. 89234, Vol. 16, p. 245 (2007 E.C.).
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-300">
                    FDRE Constitution, Proclamation No. 1/1995, Art. 37(1)
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-300">
                    Commercial Code Proclamation No. 1243/2021, Art. 182
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subsequent Citations & Latin/Vernacular Rules */}
          <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>🔄</span>
              <span>
                {currentLang === 'om'
                  ? 'Caqasa Lammataa fi Itti Aanu (Subsequent Citations & Latin Equivalence)'
                  : currentLang === 'am'
                  ? 'ተከታይ ማጣቀሻዎች እና የላቲን ቃላት አቻዎች (Ibid., Id., Supra)'
                  : 'Subsequent Citation Rules & Vernacular Equivalents (Ibid., Id., Supra)'}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Type / Latin Term</th>
                    <th className="py-2.5 px-3">English Standard</th>
                    <th className="py-2.5 px-3">Afaan Oromoo (SeeraAI)</th>
                    <th className="py-2.5 px-3">Amharic (SeeraAI)</th>
                    <th className="py-2.5 px-3">Usage Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-bold font-mono text-amber-400">Ibid.</td>
                    <td className="py-3 px-3 font-mono">Ibid.</td>
                    <td className="py-3 px-3 text-emerald-300 font-medium">Akkuma armaan oliitti</td>
                    <td className="py-3 px-3 text-blue-300 font-medium">ዝኒከማህ</td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">Same authority and same exact page as immediately preceding note</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-bold font-mono text-amber-400">Id. at [p/art]</td>
                    <td className="py-3 px-3 font-mono">Id. at p. 250</td>
                    <td className="py-3 px-3 text-emerald-300 font-medium">Fuula 250 irratti</td>
                    <td className="py-3 px-3 text-blue-300 font-medium">በተጠቀሰው ገጽ 250 ላይ</td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">Same authority as preceding note, but referencing a different page or article</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-bold font-mono text-amber-400">Supra</td>
                    <td className="py-3 px-3 font-mono">CBE v. Bekele, supra note 2</td>
                    <td className="py-3 px-3 text-emerald-300 font-medium">Galmee olitti caqasame</td>
                    <td className="py-3 px-3 text-blue-300 font-medium">ከላይ የተጠቀሰው መዝገብ</td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">Authority cited earlier in the document with intermediary citations intervening</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* INTERACTIVE CITATION BUILDER & LIVE TRILINGUAL GENERATOR */}
          <div className="p-6 rounded-3xl bg-slate-950 border border-amber-500/40 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                  ⚡ Interactive Tool
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>🛠️</span>
                  <span>
                    {currentLang === 'om'
                      ? 'Caqasa Seeraa Qopheessituu (Interactive Citation Builder)'
                      : currentLang === 'am'
                      ? 'የሕግ ጥቅስ ማመንጫ እና ማስተካከያ (Interactive Citation Builder)'
                      : 'Interactive Trilingual Citation Generator'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {currentLang === 'om'
                    ? 'Gosa caqasaa filadhaa, ragaalee galchaa, yeroma sana afaan sadaniin caqasa qulqulluu argadhaa'
                    : currentLang === 'am'
                    ? 'የጥቅሱን አይነት ይምረጡ፣ መረጃ ያስገቡ፣ ወዲያውኑ በሦስቱም ቋንቋዎች ትክክለኛውን ጥቅስ ያግኙ'
                    : 'Configure parameters to generate verified citation templates across Afaan Oromoo, Amharic, and English.'}
                </p>
              </div>

              {/* Category Selector Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCitationCategory('court_ruling')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    citationCategory === 'court_ruling' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🏛️</span>
                  <span>Court Ruling</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCitationCategory('constitution')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    citationCategory === 'constitution' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>📜</span>
                  <span>Constitution</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCitationCategory('proclamation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    citationCategory === 'proclamation' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>⚖️</span>
                  <span>Proclamation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCitationCategory('regulation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    citationCategory === 'regulation' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>📋</span>
                  <span>Regulation</span>
                </button>
              </div>
            </div>

            {/* Quick Presets Bar */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <span>⚡</span>
                <span>
                  {currentLang === 'om' ? 'Fakkeenyota Yeroo Hunda Barbaadaman (Quick Presets):' : currentLang === 'am' ? 'የተለመዱ አብነቶች (Quick Presets):' : 'Pre-loaded Landmark Authority Presets:'}
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCitationCategory('court_ruling');
                    setRulingApplicant('Commercial Bank of Ethiopia');
                    setRulingRespondent('Bekele Feyisa');
                    setRulingCourt('federal_cassation');
                    setRulingDocket('89234');
                    setRulingVolume('16');
                    setRulingPage('245');
                    setRulingYear('2007');
                    setRulingCalendar('EC');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-all cursor-pointer"
                >
                  🏛️ CBE v. Bekele (Vol. 16 p. 245)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCitationCategory('court_ruling');
                    setRulingApplicant('Ethio Telecom');
                    setRulingRespondent('Alemayehu Tadesse');
                    setRulingCourt('federal_cassation');
                    setRulingDocket('142091');
                    setRulingVolume('22');
                    setRulingPage('312');
                    setRulingYear('2012');
                    setRulingCalendar('EC');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-all cursor-pointer"
                >
                  🏛️ Ethio-Telecom v. Alemayehu (Vol. 22)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCitationCategory('constitution');
                    setConstConstitution('fdre');
                    setConstArticle('37');
                    setConstSubArticle('1');
                    setConstParagraph('a');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-all cursor-pointer"
                >
                  📜 FDRE Const. Art. 37(1) - Access to Justice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCitationCategory('constitution');
                    setConstConstitution('fdre');
                    setConstArticle('40');
                    setConstSubArticle('3');
                    setConstParagraph('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-all cursor-pointer"
                >
                  📜 FDRE Const. Art. 40(3) - Land Ownership
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCitationCategory('proclamation');
                    setProcType('labor');
                    setProcNumber('1156/2019');
                    setProcTitleOm('Labsii Dhimma Hojjetaa fi Hojjechiisaa');
                    setProcTitleAm('የአሠሪና ሠራተኛ ጉዳይ አዋጅ');
                    setProcTitleEn('Labor Proclamation');
                    setProcArticle('27');
                    setProcSubArticle('1');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:border-blue-500/50 hover:text-blue-300 transition-all cursor-pointer"
                >
                  ⚖️ Labor Proc. 1156/2019 Art. 27(1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCitationCategory('proclamation');
                    setProcType('commercial');
                    setProcNumber('1243/2021');
                    setProcTitleOm('Koodii Daldalaa Mootummaa Federaalaa');
                    setProcTitleAm('የንግድ ሕግ አዋጅ');
                    setProcTitleEn('Commercial Code Proclamation');
                    setProcArticle('182');
                    setProcSubArticle('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:border-blue-500/50 hover:text-blue-300 transition-all cursor-pointer"
                >
                  ⚖️ Commercial Code 1243/2021 Art. 182
                </button>
              </div>
            </div>

            {/* Config Fields based on Active Category */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              {citationCategory === 'court_ruling' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Applicant / Plaintiff (Himataa / ከሳሽ):</label>
                    <input
                      type="text"
                      value={rulingApplicant}
                      onChange={(e) => setRulingApplicant(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Respondent / Defendant (Himatamaa / ተከሳሽ):</label>
                    <input
                      type="text"
                      value={rulingRespondent}
                      onChange={(e) => setRulingRespondent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Court / Division (Mana Murtii):</label>
                    <select
                      value={rulingCourt}
                      onChange={(e) => setRulingCourt(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="federal_cassation">Federal Supreme Court Cassation (MMWF)</option>
                      <option value="oromia_cassation">Oromia Supreme Court Cassation (MMWO)</option>
                      <option value="federal_high">Federal High Court (Olaanaa)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Docket / File No (Galmee Lak / መዝገብ ቁ):</label>
                    <input
                      type="text"
                      value={rulingDocket}
                      onChange={(e) => setRulingDocket(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Volume (Jildii / ቅጽ):</label>
                    <input
                      type="text"
                      value={rulingVolume}
                      onChange={(e) => setRulingVolume(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Page (Fuula / ገጽ):</label>
                    <input
                      type="text"
                      value={rulingPage}
                      onChange={(e) => setRulingPage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Year (Waggaa / ዓ.ም):</label>
                    <input
                      type="text"
                      value={rulingYear}
                      onChange={(e) => setRulingYear(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Calendar Era (Sirna Baraa):</label>
                    <select
                      value={rulingCalendar}
                      onChange={(e) => setRulingCalendar(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="EC">Ethiopian Calendar (A.L.I / ዓ.ም / E.C.)</option>
                      <option value="GC">Gregorian Calendar (A.L.A / እ.ኤ.አ / G.C.)</option>
                    </select>
                  </div>
                </div>
              )}

              {citationCategory === 'constitution' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] text-slate-400 font-mono">Constitution Jurisdiction:</label>
                    <select
                      value={constConstitution}
                      onChange={(e) => setConstConstitution(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="fdre">FDRE Constitution (Proc. 1/1995 / Labsii 1/1987 / አዋጅ 1/1987)</option>
                      <option value="oromia_revised">Oromia Revised Constitution (Proc. 46/2001 / Labsii 46/1994)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Article (Keeyyata / አንቀጽ):</label>
                    <input
                      type="text"
                      value={constArticle}
                      onChange={(e) => setConstArticle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Sub-Article (Keeyyata Xiqqaa / ንዑስ):</label>
                    <input
                      type="text"
                      value={constSubArticle}
                      onChange={(e) => setConstSubArticle(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {citationCategory === 'proclamation' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] text-slate-400 font-mono">Proclamation Title (English):</label>
                    <input
                      type="text"
                      value={procTitleEn}
                      onChange={(e) => setProcTitleEn(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Proclamation No. & Year:</label>
                    <input
                      type="text"
                      value={procNumber}
                      onChange={(e) => setProcNumber(e.target.value)}
                      placeholder="e.g. 1156/2019"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Article & Sub-Article:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={procArticle}
                        onChange={(e) => setProcArticle(e.target.value)}
                        placeholder="Art"
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={procSubArticle}
                        onChange={(e) => setProcSubArticle(e.target.value)}
                        placeholder="Sub"
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {citationCategory === 'regulation' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Regulation Title (English):</label>
                    <input
                      type="text"
                      value={regTitleEn}
                      onChange={(e) => setRegTitleEn(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Regulation / Directive No.:</label>
                    <input
                      type="text"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="e.g. 487/2022"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">Article (Keeyyata / አንቀጽ):</label>
                    <input
                      type="text"
                      value={regArticle}
                      onChange={(e) => setRegArticle(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Synchronized 3-Language Output Cards */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-2">
                <span>📋</span>
                <span>
                  {currentLang === 'om'
                    ? 'Bu\'aa Caqasaa Afaanota Sadeeniin (Trilingual Generated Citations):'
                    : currentLang === 'am'
                    ? 'የተፈጠሩ የሕግ ጥቅሶች በሦስቱ ቋንቋዎች (Trilingual Citations):'
                    : 'Standardized Citations Output (Ready to Copy & Use):'}
                </span>
              </span>

              {(() => {
                let citationOm = '';
                let citationAm = '';
                let citationEn = '';

                if (citationCategory === 'court_ruling') {
                  const courtOm = rulingCourt === 'federal_cassation' ? 'Dhaddacha Ijoo Mana Murtii Waliigala Federaalaa' : rulingCourt === 'oromia_cassation' ? 'Dhaddacha Ijoo Mana Murtii Waliigala Oromiyaa' : 'Mana Murtii Olaanaa Federaalaa';
                  const courtAm = rulingCourt === 'federal_cassation' ? 'የፌዴራል ጠቅላይ ፍርድ ቤት የሰበር ሰሚ ችሎት' : rulingCourt === 'oromia_cassation' ? 'የኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት' : 'የፌዴራል ከፍተኛ ፍርድ ቤት';
                  const courtEn = rulingCourt === 'federal_cassation' ? 'Federal Supreme Court Cassation Division' : rulingCourt === 'oromia_cassation' ? 'Oromia Supreme Court Cassation Division' : 'Federal High Court';

                  const calOm = rulingCalendar === 'EC' ? 'A.L.I' : 'A.L.A';
                  const calAm = rulingCalendar === 'EC' ? 'ዓ.ም' : 'እ.ኤ.አ';
                  const calEn = rulingCalendar === 'EC' ? 'E.C.' : 'G.C.';

                  citationOm = `${rulingApplicant} fi ${rulingRespondent}, ${courtOm}, Galmee Lak. ${rulingDocket}${rulingVolume ? `, Jildii ${rulingVolume}` : ''}${rulingPage ? `, Fuula ${rulingPage}` : ''} (${rulingYear} ${calOm})`;
                  citationAm = `${rulingApplicant} እና ${rulingRespondent}፣ ${courtAm}፣ የመዝገብ ቁጥር ${rulingDocket}${rulingVolume ? `፣ ቅጽ ${rulingVolume}` : ''}${rulingPage ? `፣ ገጽ ${rulingPage}` : ''} (${rulingYear} ${calAm})` ;
                  citationEn = `${rulingApplicant} v. ${rulingRespondent}, ${courtEn}, Docket No. ${rulingDocket}${rulingVolume ? `, Vol. ${rulingVolume}` : ''}${rulingPage ? `, p. ${rulingPage}` : ''} (${rulingYear} ${calEn})`;
                } else if (citationCategory === 'constitution') {
                  const isFdre = constConstitution === 'fdre';
                  const sub = constSubArticle ? `(${constSubArticle})` : '';
                  const par = constParagraph ? `(${constParagraph})` : '';

                  citationOm = isFdre
                    ? `Heera Mootummaa RDFI, Labsii Lak. 1/1987, Keeyyata ${constArticle}${sub}${par}`
                    : `Heera Mootummaa Naannoo Oromiyaa Fooyya'ee Bahe, Labsii Lak. 46/1994, Keeyyata ${constArticle}${sub}${par}`;

                  citationAm = isFdre
                    ? `የኢ.ፌ.ዲ.ሪ ሕገ-መንግሥት፣ አዋጅ ቁጥር 1/1987፣ አንቀጽ ${constArticle}${sub}${par}`
                    : `የተሻሻለው የኦሮሚያ ብሔራዊ ክልላዊ መንግሥት ሕገ-መንግሥት፣ አዋጅ ቁጥር 46/1994 ዓ.ም፣ አንቀጽ ${constArticle}${sub}${par}`;

                  citationEn = isFdre
                    ? `FDRE Constitution, Proclamation No. 1/1995, Art. ${constArticle}${sub}${par}`
                    : `Revised Constitution of Oromia Regional State, Proclamation No. 46/2001 (1994 E.C.), Art. ${constArticle}${sub}${par}`;
                } else if (citationCategory === 'proclamation') {
                  const sub = procSubArticle ? `(${procSubArticle})` : '';
                  citationOm = `${procTitleOm} Labsii Lak. ${procNumber}, Keeyyata ${procArticle}${sub}`;
                  citationAm = `${procTitleAm} አዋጅ ቁጥር ${procNumber}፣ አንቀጽ ${procArticle}${sub}`;
                  citationEn = `${procTitleEn} No. ${procNumber}, Art. ${procArticle}${sub}`;
                } else {
                  citationOm = `${regTitleOm} Lak. ${regNumber}, Keeyyata ${regArticle}`;
                  citationAm = `${regTitleAm} ቁጥር ${regNumber}፣ አንቀጽ ${regArticle}`;
                  citationEn = `${regTitleEn} No. ${regNumber}, Art. ${regArticle}`;
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* Afaan Oromoo Output Card */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                          🟢 Afaan Oromoo
                        </span>
                        <p className="text-xs text-slate-100 font-mono leading-relaxed select-all">
                          {citationOm}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCitation(citationOm, 'om')}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          copiedCitationKey === 'om'
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        <span>{copiedCitationKey === 'om' ? '✅' : '📋'}</span>
                        <span>{copiedCitationKey === 'om' ? 'Koppii Ta\'eera!' : 'Waraabi (Copy)'}</span>
                      </button>
                    </div>

                    {/* Amharic Output Card */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/30 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
                          🔵 አማርኛ (Amharic)
                        </span>
                        <p className="text-xs text-slate-100 font-mono leading-relaxed select-all">
                          {citationAm}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCitation(citationAm, 'am')}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          copiedCitationKey === 'am'
                            ? 'bg-blue-500 text-slate-950 font-bold'
                            : 'bg-slate-950 hover:bg-slate-800 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        <span>{copiedCitationKey === 'am' ? '✅' : '📋'}</span>
                        <span>{copiedCitationKey === 'am' ? 'ተቀድቷል!' : 'ቅዳ (Copy)'}</span>
                      </button>
                    </div>

                    {/* English Output Card */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                          🟡 English Standard
                        </span>
                        <p className="text-xs text-slate-100 font-mono leading-relaxed select-all">
                          {citationEn}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCitation(citationEn, 'en')}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          copiedCitationKey === 'en'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        <span>{copiedCitationKey === 'en' ? '✅' : '📋'}</span>
                        <span>{copiedCitationKey === 'en' ? 'Copied to Clipboard!' : 'Copy Citation'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Seamless Integration with SeeraAI Features */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  {currentLang === 'om' ? 'Akkaataa SeeraAI keessatti itti Fayyadamtan:' : currentLang === 'am' ? 'በSeeraAI ውስጥ አጠቃቀም፡' : 'How SeeraAI Integrates Standard Citations:'}
                </span>
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {currentLang === 'om'
                  ? 'Caqasa kana gara Waliigaltee Qopheessituu (Smart Contract), Oodiitara Sanadaa (Logic Auditor), ykn Dhaddacha (Courtroom Assistant) keessatti yoo barreessitan, SeeraAI yeroma sana akkuma caqasa seeraa dhuunfaatti beekuun qorannoo Negaariit Gaazexaa fi beeksisa hiikkoo yeroma sana tooltip\'n agarsiisa.'
                  : currentLang === 'am'
                  ? 'ይህን ጥቅስ በውል ዝግጅት፣ በሰነድ ኦዲተር ወይም በችሎት ረዳት ውስጥ በሚጠቀሙበት ጊዜ፣ SeeraAI ወዲያውኑ እንደ ተረጋገጠ የሕግ ምንጭ በመለየት የነጋሪት ጋዜጣ ዝርዝር እና የህግ ማብራሪያ ብቅ-ባይ (Tooltip) ያቀርብልዎታል።'
                  : 'Whenever you write citations using these standardized formulas in the Smart Contract Drafter, Legal Logic Auditor, or Courtroom Assistant, SeeraAI automatically detects them and attaches live Negarit Gazeta tooltips, amendment trackers, and statutory definitions.'}
              </p>
            </div>
          </div>

          {/* INTERACTIVE CITATION FORMAT VALIDATOR & CHECKER */}
          <div className="p-6 rounded-3xl bg-slate-950 border border-cyan-500/30 space-y-5 shadow-xl">
            <div className="space-y-1 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <h3 className="text-base font-bold text-slate-100">
                  {currentLang === 'om'
                    ? 'Sakatta\'aa Sadarkaa Caqasa Seeraa (Citation Format Validator)'
                    : currentLang === 'am'
                    ? 'የሕግ ጥቅስ ደረጃ አረጋጋጭ (Citation Format Validator)'
                    : 'Interactive Citation Format Validator'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Caqasa seeraa keessan asitti galchuun ulaagaalee mana murtii Itoophiyaa guutuu isaa sakatta\'aa'
                  : currentLang === 'am'
                  ? 'የሕግ ጥቅስዎን እዚህ በማስገባት የኢትዮጵያን የፍርድ ቤት የጥቅስ አቀራረብ መስፈርቶች ማሟላቱን ያረጋግጡ'
                  : 'Paste or type any legal citation to test whether it satisfies Ethiopian court filing and formal jurisprudence standards.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">
                  {currentLang === 'om' ? 'Caqasa Seeraa Qormaataaf Galchaa:' : currentLang === 'am' ? 'የሕግ ጥቅሱን ያስገቡ፡' : 'Enter citation to validate:'}
                </label>
                <input
                  type="text"
                  value={validatorInput}
                  onChange={(e) => setValidatorInput(e.target.value)}
                  placeholder="e.g. FSC Cassation Div., Docket No. 89234, Vol. 16, p. 245 (2007 E.C.)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Sample Quick-test buttons */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-400">Quick Test Samples:</span>
                <button
                  type="button"
                  onClick={() => setValidatorInput('Commercial Bank of Ethiopia v. Bekele Feyisa, Federal Supreme Court Cassation Division, Docket No. 89234, Vol. 16, p. 245 (2007 E.C.)')}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Full Cassation (Perfect)
                </button>
                <button
                  type="button"
                  onClick={() => setValidatorInput('Cassation File No. 89234')}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Incomplete Docket (Missing Vol/Year)
                </button>
                <button
                  type="button"
                  onClick={() => setValidatorInput('FDRE Constitution, Proclamation No. 1/1995, Art. 37(1)')}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Constitutional Access to Justice
                </button>
                <button
                  type="button"
                  onClick={() => setValidatorInput('Labsii Lak. 1156/2011, Keeyyata 27(1)')}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Labor Statute (Oromo)
                </button>
              </div>

              {/* Validator Diagnostic Results */}
              {(() => {
                const lower = validatorInput.toLowerCase();
                const hasAuthority = /supreme|cassation|court|high court|first instance|fsc|fdre|heera|mootummaa|ህገ|መንግስት|ሰበር|ፍርድ|constitution|proclamation|proc|labsii|አዋጅ|regulation|dambii|ደንብ|directive|qajeelfama|መመሪያ|code|koodii|ሕግ/.test(lower);
                const hasNumber = /\d+|docket|file|galmee|መዝገብ|no|lak|ቁጥር/.test(lower);
                const hasVolPage = /vol|jildii|ቅጽ|p\.|pp\.|fuula|ገጽ/.test(lower);
                const hasArticle = /art|kew|kwt|keeyyata|አንቀጽ|\b\d+\(\d+\)/.test(lower);
                const hasCalendar = /e\.c\.|g\.c\.|ዓ\.ም|እ\.ኤ\.አ|a\.l\.i|a\.l\.a|19\d{2}|20\d{2}/.test(lower);

                const isRuling = /cassation|ሰበር|court|dhaddacha|fsc/.test(lower);
                const isStatute = /proc|labsii|አዋጅ|constitution|heera|code|koodii/.test(lower);

                return (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-xs font-bold text-slate-200">
                        {currentLang === 'om' ? 'Gabaasa Qulqullina Caqasaa (Validation Report):' : currentLang === 'am' ? 'የጥራት ግምገማ ውጤት (Validation Report):' : 'Citation Quality Audit Report:'}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        hasAuthority && hasNumber && (hasCalendar || hasArticle)
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {hasAuthority && hasNumber && (hasCalendar || hasArticle) ? '✅ High Jurisprudential Compliance' : '⚠️ Minor Formal Deficiencies'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
                      <div className={`p-2.5 rounded-xl border ${hasAuthority ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <span>{hasAuthority ? '✅' : '❌'}</span>
                          <span>Authority Body</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Court or Statute identified</p>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${hasNumber ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <span>{hasNumber ? '✅' : '❌'}</span>
                          <span>Registration No.</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Docket/Proc identifier</p>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${hasVolPage ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : isRuling ? 'bg-amber-950/30 border-amber-500/30 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <span>{hasVolPage ? '✅' : isRuling ? '⚠️' : '⚪'}</span>
                          <span>Volume & Page</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{isRuling ? 'Crucial for Precedent' : 'Optional for Statutes'}</p>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${hasArticle ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : isStatute ? 'bg-amber-950/30 border-amber-500/30 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <span>{hasArticle ? '✅' : isStatute ? '⚠️' : '⚪'}</span>
                          <span>Pinpoint Article</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Article/sub-clause cited</p>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${hasCalendar ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/30 border-amber-500/30 text-amber-300'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <span>{hasCalendar ? '✅' : '⚠️'}</span>
                          <span>Calendar Era</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">E.C. or G.C. specified</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Landmark Precedents & Registry Reference Table */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>📚</span>
              <span>
                {currentLang === 'om'
                  ? 'Gabatee Madda Seeraa fi Jildiilee Dhaddacha Ijoo (Key Statutory Registries)'
                  : currentLang === 'am'
                  ? 'ቁልፍ የሕግ ምንጮች እና የሰበር ቅጾች ሰንጠረዥ (Key Statutory Registries)'
                  : 'Ethiopian Statutory References & Landmark Precedent Registries'}
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5">
                  🏛️ Cassation Precedents (Volumes 1-25)
                </span>
                <ul className="text-[11px] text-slate-300 space-y-1.5">
                  <li><strong>Vol. 1 - 5:</strong> Civil Procedure, Family & Succession Law</li>
                  <li><strong>Vol. 6 - 10:</strong> Commercial Contracts, Banking & Insurance</li>
                  <li><strong>Vol. 11 - 15:</strong> Labor Relations & Employment Dismissal</li>
                  <li><strong>Vol. 16 - 20:</strong> Real Property, Leases & Expropriation</li>
                  <li><strong>Vol. 21 - 25:</strong> Taxation, Administrative & Public Procurement</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5">
                  📜 Core Constitutional Articles (1-106)
                </span>
                <ul className="text-[11px] text-slate-300 space-y-1.5">
                  <li><strong>Art. 9:</strong> Supremacy of the FDRE Constitution</li>
                  <li><strong>Art. 13 - 28:</strong> Fundamental Human Rights & Freedoms</li>
                  <li><strong>Art. 29 - 44:</strong> Democratic Rights & Freedom of Expression</li>
                  <li><strong>Art. 37:</strong> Right of Access to Justice & Fair Hearing</li>
                  <li><strong>Art. 40:</strong> The Right to Property & Public Land Ownership</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5">
                  ⚖️ Major Codes & Proclamations
                </span>
                <ul className="text-[11px] text-slate-300 space-y-1.5">
                  <li><strong>Labor Proc. 1156/2019:</strong> Employment & Severance</li>
                  <li><strong>Commercial Code 1243/2021:</strong> Corporations & Insolvency</li>
                  <li><strong>Civil Code 165/1960:</strong> Contracts & Obligations</li>
                  <li><strong>Courts Proc. 1234/2021:</strong> Jurisdiction & Cassation Force</li>
                  <li><strong>Criminal Code 414/2004:</strong> Penal Offenses & Liability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HOW-TO-USE STEP-BY-STEP APP INSTRUCTIONS */}
      {activeGuideTab === 'how_to_use' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
              📱
            </span>
            <div>
              <h2 className="text-lg sm:text-2xl font-serif-legal font-bold text-slate-100">
                {currentLang === 'om'
                  ? 'Qajeelfama Hojii fi Itti Fayyadama Appii SeeraAI'
                  : currentLang === 'am'
                  ? 'የSeeraAI መተግበሪያ አጠቃቀም የተሟላ መመሪያ'
                  : 'SeeraAI Complete Step-by-Step App Usage Guide'}
              </h2>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Waliigaltee uumuu irraa hanga dhaddachaatti tarkaanfiiwwan ijoo hordofamu qaban'
                  : currentLang === 'am'
                  ? 'ከውል ዝግጅት እስከ ፍርድ ቤት የችሎት ክትትል የሚረዱ ዋና ዋና ደረጃዎች'
                  : 'Mastering every core module from Contract Generation to Courtroom Assistance.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Smart Contract Drafter */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="space-y-2">
                <span className="text-2xl">✍️</span>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentLang === 'om' ? '1. Waliigaltee Uumuu (Contract Drafting)' : currentLang === 'am' ? '1. ውል ማዘጋጀት' : '1. Smart Contract Drafting'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Unkaalee seeraa (Hojii, Kireessuu, Daldala) filachuun odeeffannoo abbaa dhimmaa galchaa. Koodii Siiviilii hordofuun yeroma sana PDF qopheessa.'
                    : currentLang === 'am'
                    ? 'የውል አይነቶችን በመምረጥ የተዋዋይ ወገኖችን መረጃ ያስገቡ። የፍትሐ ብሔር ህጉን መሰረት ያደረገ ህጋዊ ውል በቅጽበት ይዘጋጅልዎታል።'
                    : 'Select vetted templates (Employment, Lease, Business). Generates compliant bilingual contracts with automated clause validation.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer"
              >
                ✍️ {currentLang === 'om' ? 'Waliigaltee Bani' : currentLang === 'am' ? 'ውል አዘጋጅ' : 'Open Drafter'}
              </button>
            </div>

            {/* 2. Document & Logic Auditor */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="space-y-2">
                <span className="text-2xl">🔍</span>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentLang === 'om' ? '2. Odiitara Sanadaa (Legal Logic Auditor)' : currentLang === 'am' ? '2. የሕግ ሰነድ ኦዲተር' : '2. Legal Logic Auditor'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Sanada falmii ykn waliigaltee upload gochuun hanqina loojikii seeraa, keeyyattoota haqaman, fi balaa seeraa adda baasa.'
                    : currentLang === 'am'
                    ? 'የክርክር ሰነድ ወይም ውል በማስገባት የህግ ድክመቶችን፣ ተቃርኖዎችን እና ያፈተለኩ አደጋዎችን በሰከንዶች ውስጥ ይመርምሩ።'
                    : 'Audits contracts, pleadings, and court orders for logical inconsistencies, obsolete laws, and procedural risks.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('docAnalysis')}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                🔍 {currentLang === 'om' ? 'Sanada Sakatta\'i' : currentLang === 'am' ? 'ሰነድ መርምር' : 'Launch Auditor'}
              </button>
            </div>

            {/* 3. Courtroom Assistant & Voice Dictation */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="space-y-2">
                <span className="text-2xl">🎙️</span>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentLang === 'om' ? '3. Dhaddacha & Sagalee (Courtroom Assistant)' : currentLang === 'am' ? '3. የችሎት ረዳት እና የድምጽ መቅጃ' : '3. Courtroom Assistant & Voice'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Afaan Oromoo fi Amaaraatiin jecha ragaa namaa sagaleen galmeessaa. Iccitiin Web Crypto\'n eegamaadha.'
                    : currentLang === 'am'
                    ? 'በአማርኛ እና ኦሮምኛ የምስክር ቃላትን በድምጽ ያስገቡ። ሚስጥራዊነት በWeb Crypto ሙሉ በሙሉ የተጠበቀ ነው።'
                    : 'Record witness testimonies and live courtroom proceedings with voice-to-text and client-side encryption.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('courtroomAssistant')}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                🎙️ {currentLang === 'om' ? 'Dhaddacha Bani' : currentLang === 'am' ? 'ችሎት ክፈት' : 'Open Assistant'}
              </button>
            </div>

            {/* 4. Cassation Simulator */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="space-y-2">
                <span className="text-2xl">🏛️</span>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentLang === 'om' ? '4. Saayimulaatara Ijibbaataa (Cassation Sim)' : currentLang === 'am' ? '4. የሰበር ሲሙሌተር' : '4. Cassation Precedent Simulator'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Qabxii falmii keessanii murtiiwwan Dhaddacha Ijoo duraanii waliin madaaluun carraa injifannoo keessan shallaga.'
                    : currentLang === 'am'
                    ? 'የክስ ጭብጦችዎን ከቀደሙ የሰበር ውሳኔዎች ጋር በማገናዘብ የይግባኝ የድል ዕድልዎን እና የህግ ስህተቶችን ያሰላል።'
                    : 'Simulate legal outcomes against Supreme Court Cassation division precedents to evaluate appeal viability.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('cassation')}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                🏛️ {currentLang === 'om' ? 'Ijibbaata Qori' : currentLang === 'am' ? 'ሰበር ፈትሽ' : 'Simulate Cassation'}
              </button>
            </div>

            {/* 5. Legislation Repository */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="space-y-2">
                <span className="text-2xl">📚</span>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentLang === 'om' ? '5. Galmee Seeraa (Legislation Repo)' : currentLang === 'am' ? '5. የህግ ማከማቻ እና ነጋሪት ጋዜጣ' : '5. Legislation Repository'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Labsiilee Gaazexaa Negaariit Federaalaa fi Heera Mootummaa afaanota sadaniin barbaadaa fi dubbisaa.'
                    : currentLang === 'am'
                    ? 'የፌዴራል ነጋሪት ጋዜጣ አዋጆችን እና ሕገ-መንግሥቱን በሦስት ቋንቋዎች በቀላሉ ፈልገው ያንብቡ።'
                    : 'Access the comprehensive trilingual statutory archive of Negarit Gazeta proclamations, regulations, and codes.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('legislation')}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                📚 {currentLang === 'om' ? 'Seera Barbaadi' : currentLang === 'am' ? 'ህግ ፈልግ' : 'Browse Repository'}
              </button>
            </div>

            {/* 6. Legal Privilege & Zero-Knowledge Encryption */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="space-y-2">
                <span className="text-2xl">🔒</span>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentLang === 'om' ? '6. Iccitii Seeraa (Legal Privilege Mode)' : currentLang === 'am' ? '6. ሚስጥራዊነት እና ኢንክሪፕሽን' : '6. Legal Privilege Encryption'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Faayidaa iccitii abukaatoo-maamilaa (Attorney-Client Privilege) eeguuf scratchpad fi ragaalee browser keessatti koodii dhoksaa AES-GCM\'n cufa.'
                    : currentLang === 'am'
                    ? 'የደንበኛ እና ጠበቃ ሚስጥራዊነትን ለመጠበቅ በብሮውዘር ደረጃ በWeb Crypto AES-GCM የታጠረ የደህንነት ስርዓት።'
                    : 'Hardware-backed Web Crypto AES-GCM encryption secures sensitive trial scratchpads from physical device tampering.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('courtroomAssistant')}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                🔒 {currentLang === 'om' ? 'Iccitii Sakatta\'i' : currentLang === 'am' ? 'ደህንነት ፈትሽ' : 'Security Mode'}
              </button>
            </div>

            {/* 7. Document Manager & Case Files (Qabiinsa Sanadootaa) */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="space-y-2">
                <span className="text-2xl">📁</span>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentLang === 'om' ? '7. Qabiinsa Sanadaa & Galmee (Document Manager)' : currentLang === 'am' ? '7. የሰነዶች እና መዝገቦች አስተዳዳሪ' : '7. Document & Case Manager'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Foldara uumuu, faayila harkisanii galchuu (Drag-and-Drop), tag gochuu (Urgent, Appeal, Evidence), batch AI rename, fi Case Summary PDF buufachuu.'
                    : currentLang === 'am'
                    ? 'ፎልደሮችን መፍጠር፣ ሰነዶችን በDrag-and-Drop ማንቀሳቀስ፣ ታግ ማድረግ፣ በAI ስም ማስተካከል እና የክስ ማጠቃለያ ፒዲኤፍ ማውረድ።'
                    : 'Manage case files with drag-and-drop folders, custom labels (Urgent, Appeal, Evidence), AI batch renaming, and Case Summary PDF export.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('myContent')}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                📁 {currentLang === 'om' ? 'Sanadoota Bani' : currentLang === 'am' ? 'ሰነዶች ክፈት' : 'Open Document Manager'}
              </button>
            </div>

            {/* 8. Legal Analysis & Court Proceedings */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="space-y-2">
                <span className="text-2xl">⚖️</span>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentLang === 'om' ? '8. Xiinxala Seeraa & Adeemsa Falmii' : currentLang === 'am' ? '8. የሕግ ትንተና እና የሥነ-ሥርዓት መመሪያ' : '8. Legal Analysis & Court Proceedings'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Faayila telefonii ykn komputeraa fe\'uun (upload/paste) seera gaafadhaa. Jechoota ogummaa seeraa (Iyyannoo, Waamicha, Deebii, Ragaa, Murtii) afaan 3\'n qoradhaa.'
                    : currentLang === 'am'
                    ? 'ከስልክ ወይም ኮምፒውተር ሰነድ በማስገባት የህግ ትንተና ያግኙ። የፍርድ ቤት የሥነ-ሥርዓት ቃላትን በሦስት ቋንቋዎች ይመርምሩ።'
                    : 'Upload phone/PC files or paste text for statutory analysis, and study trilingual court proceeding terminology from Filing to Cassation.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('explainLaw')}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                ⚖️ {currentLang === 'om' ? 'Seera Xiinxali' : currentLang === 'am' ? 'ህግ ተንትን' : 'Explain Law'}
              </button>
            </div>

            {/* 9. Cassation Precedent Research */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="space-y-2">
                <span className="text-2xl">🏛️</span>
                <h3 className="font-bold text-sm text-slate-100">
                  {currentLang === 'om' ? '9. Kuusaa Dhaddacha Ijibbaataa' : currentLang === 'am' ? '9. የሰበር ውሳኔዎች ማዕከል' : '9. Cassation Precedent Hub'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Murteewwan dirqisiisoo Mana Murtii Waliigalaa Federaalaa fi Oromiyaa jildii 1-25+ fi lakk. galmeetiin barbaadaa, qajeeltoo seeraa afaan 3\'n caqasaa.'
                    : currentLang === 'am'
                    ? 'የፌዴራል እና ኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ውሳኔዎችን በቅጽ 1-25+ እና መዝገብ ቁጥር በቀላሉ ይፈልጉ።'
                    : 'Research binding Supreme Court cassation precedents across 25+ volumes with instant trilingual standard citations.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('cassation')}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                🏛️ {currentLang === 'om' ? 'Ijibbaata Barbaadi' : currentLang === 'am' ? 'ሰበር ፈልግ' : 'Search Cassation'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-slate-100 text-base">Amma Tajaajila SeeraAI Fayyadamuu Jalqabaa!</h3>
          <p className="text-xs text-slate-300">Waliigaltee qopheessuu, seera qorachuu ykn sanada xiinxaluuf badhaadhaa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('integration')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer"
          >
            ⚡ {currentLang === 'om' ? "Qindaa'ina Gemini AI" : currentLang === 'am' ? 'የGemini AI ውህደት' : 'Gemini AI Integration'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            ✍️ Waliigaltee Qopheessi
          </button>
          <button
            type="button"
            onClick={() => onNavigate('explainLaw')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
          >
            ⚖️ Seera Qori
          </button>
        </div>
      </div>
    </div>
  );
};
