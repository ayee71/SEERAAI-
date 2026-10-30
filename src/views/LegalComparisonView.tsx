import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent, analyzeLegalDocument } from '../services/api';
import { PdfExportModal } from '../components/PdfExportModal';
import { LegalCitationHighlighter } from '../components/LegalCitationHighlighter';
import { Upload, FileText, Image as ImageIcon, CheckCircle2, RefreshCw, X, BrainCircuit, Sparkles, AlertTriangle } from 'lucide-react';

interface LegalComparisonViewProps {
  currentLang: Language;
}

export const LegalComparisonView: React.FC<LegalComparisonViewProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const [comparisonMode, setComparisonMode] = useState<'appellate_vs_trial' | 'statute_vs_statute'>('appellate_vs_trial');

  // Deep Thinking (X20 Mode) Toggle
  const [isDeepThinkingX20, setIsDeepThinkingX20] = useState<boolean>(true);

  // Presets for Trial Court vs. Appellate Court Conflicting Decisions
  const appellatePresets = [
    {
      id: 'pecuniary_jurisdiction',
      title: 'SDFHH Kwt 6: Aangoo Maallaqaa (Trial Court vs Appellate Bench)',
      trialCourtName: 'Mana Murtii Aanaa (First Instance / Trial Court)',
      trialJudgment: `QABXII FALMII & MURTII MANA MURTII SADARKAA JALQABAA:
1. Himataan iyyata himataa keessatti gatii qabeenyaa falmiif ka'ee Birrii 450,000 jechuun dhiyeesse.
2. Himatamaan mormii duraatiin gatiin manichaa madaallii gabaatiin Birrii 1,500,000 waan ta'eef Manni Murtii Aanaa aangoo maallaqaa hin qabu jedhee morme.
3. Manni Murtii Aanaa: Qabeenyichi qoratamee gatiin gabaa isaa Birrii 1,500,000 waan ta'eef, aangoo maallaqaa Mana Murtii Aanaa Birrii 500,000 ol ta'uu bu'uureffachuun himaticha aangoo hin qabu jechuun kufe godhe.`,
      appellateCourtName: 'Mana Murtii Ol\'aanaa / Dhaddacha Ijibbaataa (Appellate / Cassation Court)',
      appellateJudgment: `MORMII OL-IYYANNOO & MURTII MANA MURTII OL-IYYANNOO:
1. Ol-iyyata dhiyaateen, murtii Manni Murtii Aanaa kenne SDFHH Keeyyata 6 kan faallessuudha jedhamee komatame.
2. Manni Murtii Ol-iyyannoo / Dhaddachi Ijibbaataa (Galmee 249062):
   - Aangoon mana murtii gatii iyyata himataatiin gaafatameen murtaa'a (Pecuniary jurisdiction is determined by the claim).
   - Manni murtii gatii gabaa qorachuun aangoo isaa dhabuu hin danda'u.
   - Kanaafuu, murtiin Mana Murtii Aanaa diigamee (reversed) manni murtichaa falmii ijoo qoratee akka murteessuuf ajajameera.`,
    },
    {
      id: 'immovable_sale_writing',
      title: 'Seera Sivilii Kwt 1723: Gurgurtaa Manaa Afaanii vs Ragaa Barreeffamaa',
      trialCourtName: 'Mana Murtii Jalqabaa (Trial Court)',
      trialJudgment: `QABXII FALMII & MURTII MANA MURTII SADARKAA JALQABAA:
1. Himataan mana jireenyaa himatamaa irraa Birrii 800,000n bittadhee kaffaltii xumureera jedhee iyyate.
2. Waliigalteen barreeffamaa fi chaappaan mirkanaa'e hin jiru; ta'us ragaan namaa sadii bittaa fi gurgurtaan raawwatamuu mirkaneessaniiru.
3. Manni Murtii Sadarkaa Jalqabaa: Ragaan namaa dhiyaate amansiisaa waan ta'eef waliigaltichi seera qabeessa jedhee manichi gara himataatti akka darbu murteesse.`,
      appellateCourtName: 'Mana Murtii Ol-iyyannoo (Appellate Court)',
      appellateJudgment: `MORMII & MURTII MANA MURTII OL-IYYANNOO:
1. Ol-iyyata dhiyaateen, waliigalteen qabeenya hin sochoonee bu'uura Seera Sivilii Keeyyata 1723 tiin barreeffamaan qaama aangoo qabu duratti mirkanaa'uu qaba jedhamee mormame.
2. Manni Murtii Ol-iyyannoo:
   - Bu'uura Kwt. 1723 fi 1727tiin, ulaagaan barreeffamaa fi galmee qaama seeraa ulaagaa dirqisiisaadha (Formal validity requirement).
   - Waliigalteen barreeffama hin qabne bu'uura Kwt. 1720(1) tiin gatii seeraa hin qabu (Null and void).
   - Murtiin mana murtii jalqabaa guutummaatti diigamee gatii dhabeera.`,
    },
    {
      id: 'labor_misconduct_dismissal',
      title: 'Labsii Hojjetaa 1156/2019 Kwt 27 vs 39: Ari\'amuu Hojjetaa & Beenyaa',
      trialCourtName: 'Mana Murtii Hojjetaa fi Hojjechiisaa Sadarkaa Jalqabaa',
      trialJudgment: `MURTII MANA MURTII JALQABAA:
1. Hojjetaan maallaqa dhaabbatichaa Birrii 120,000 seeraan ala baankii dhuunfaatti daddabarseera jedhamee akeekkachiisa malee ari'ame.
2. Manni murtii sadarkaa jalqabaa: Sababni ari'iinsaa fi adeemsi isaa ulaagaa beeksisa ji'a tokkoo hin kabajne jedhee hojjechiisaan beenyaa fi kaffaltii addaan kutuu (Severance) Birrii 180,000 akka kaffalu murteesse.`,
      appellateCourtName: 'Mana Murtii Ol-iyyannoo Federaalaa (Appellate Bench)',
      appellateJudgment: `MURTII MANA MURTII OL-IYYANNOO:
1. Hojjechiisaan ragaa kompiitaraa fi odiitii ragaa baankii dhiyeesseen badii cimaa (grave breach of trust) mirkaneesseera.
2. Manni Murtii Ol-iyyannoo: Bu'uura Labsii 1156/2019 Keeyyata 27(1)(b) tiin badii amanamummaa dhabuu cimaa ta'eef akeekkachiisa malee gaggeessuun seera qabeessa. Murtiin beenyaa kaffalchiisu diigameera.`,
    },
  ];

  // Presets for Statute vs. Statute / Proclamation Comparison
  const statutePresets = [
    {
      title: 'Labsii Hojjetaa fi Hojjechiisaa (1156/2019) vs Seera Sivilii (1960)',
      leftTitle: 'Labsii Hojjetaa Lakk. 1156/2019 (Labor Proclamation)',
      leftContent: 'Keeyyata 25-28: Haala hojjetaan tokko Itti Gaafatamummaa Seeraatiin Itti Fufiinsa Hojii Irraa Itti Gosa Bakkichaa fi Beenyaa Kaffaltii Waliin Gaggeeffamu. Hojjechiisaan sababa gahaa malee hojjetaa ari\'uu hin danda\'u.',
      rightTitle: 'Seera Sivilii Itoophiyaa Keeyyata 2512 (Civil Code)',
      rightContent: 'Waliigaltee Hojii Qaama Tokkoon Addaan Kutuu fi Yeroo Beellamaaf Kennamu. Waliigaltichi yeroo hin murtoofneef yoo ta\'e, ji\'a tokko dura beeksisa kennuun dhaabuun ni danda\'ama.',
    },
    {
      title: 'Murtii Ijibbaataa Oromiyaa vs Murtii Ijibbaataa Federaalaa (Lafti Baadiyyaa)',
      leftTitle: 'Mana Murtii Waliigala Oromiyaa Dhaddacha Ijibbaataa',
      leftContent: 'Lakk. Galmee 12345: Qajeeltoo lafti baadiyyaa bulchiinsa fi qonnaaf qofa ooluu qabaatuu fi mirgi qabiyyee lafaa daddabarsuu dambiilee naannichaatiin murtaa\'uun isaa fi ragaan abbaa qabiyyee irratti falmii jiru.',
      rightTitle: 'Mana Murtii Waliigala Federaalaa Dhaddacha Ijibbaataa',
      rightContent: 'Lakk. Galmee 67890: Mirgi dhaalmaa fi wabummaa lafa baadiyyaa irratti Labsii Lakk. 456/2005 bu\'uureffachuun qaamni dhimmi ilaalu mirga qabiyyee mirkaneessuu akka qabu murteesseera.',
    },
  ];

  const [trialTitle, setTrialTitle] = useState(appellatePresets[0].trialCourtName);
  const [trialContent, setTrialContent] = useState(appellatePresets[0].trialJudgment);
  const [trialFileName, setTrialFileName] = useState<string | null>(null);
  const [trialIsExtracting, setTrialIsExtracting] = useState<boolean>(false);

  const [appellateTitle, setAppellateTitle] = useState(appellatePresets[0].appellateCourtName);
  const [appellateContent, setAppellateContent] = useState(appellatePresets[0].appellateJudgment);
  const [appellateFileName, setAppellateFileName] = useState<string | null>(null);
  const [appellateIsExtracting, setAppellateIsExtracting] = useState<boolean>(false);

  const [statuteLeftTitle, setStatuteLeftTitle] = useState(statutePresets[0].leftTitle);
  const [statuteLeftContent, setStatuteLeftContent] = useState(statutePresets[0].leftContent);
  const [statuteLeftFileName, setStatuteLeftFileName] = useState<string | null>(null);
  const [statuteLeftIsExtracting, setStatuteLeftIsExtracting] = useState<boolean>(false);

  const [statuteRightTitle, setStatuteRightTitle] = useState(statutePresets[0].rightTitle);
  const [statuteRightContent, setStatuteRightContent] = useState(statutePresets[0].rightContent);
  const [statuteRightFileName, setStatuteRightFileName] = useState<string | null>(null);
  const [statuteRightIsExtracting, setStatuteRightIsExtracting] = useState<boolean>(false);

  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Generic File Upload Handler (PDF, Word, Images, Text) with AI OCR Extraction
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'trial' | 'appellate' | 'statuteLeft' | 'statuteRight'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setExtracting = (val: boolean) => {
      if (target === 'trial') setTrialIsExtracting(val);
      else if (target === 'appellate') setAppellateIsExtracting(val);
      else if (target === 'statuteLeft') setStatuteLeftIsExtracting(val);
      else setStatuteRightIsExtracting(val);
    };

    const setFileName = (name: string | null) => {
      if (target === 'trial') setTrialFileName(name);
      else if (target === 'appellate') setAppellateFileName(name);
      else if (target === 'statuteLeft') setStatuteLeftFileName(name);
      else setStatuteRightFileName(name);
    };

    const setContent = (text: string) => {
      if (target === 'trial') setTrialContent(text);
      else if (target === 'appellate') setAppellateContent(text);
      else if (target === 'statuteLeft') setStatuteLeftContent(text);
      else setStatuteRightContent(text);
    };

    const setTitle = (title: string) => {
      if (target === 'trial') setTrialTitle(title);
      else if (target === 'appellate') setAppellateTitle(title);
      else if (target === 'statuteLeft') setStatuteLeftTitle(title);
      else setStatuteRightTitle(title);
    };

    setExtracting(true);
    setFileName(file.name);
    setError(null);

    try {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isImage || isPdf) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const res = await analyzeLegalDocument({
              fileData: base64,
              mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
              fileName: file.name,
              analysisType: 'extract_text',
              outputLanguages: [currentLang],
            });
            if (res?.analysis) {
              setContent(res.analysis);
              if (target === 'trial' && !trialTitle) {
                setTitle(`Mana Murtii Sadarkaa Jalqabaa (${file.name.replace(/\.[^/.]+$/, "")})`);
              } else if (target === 'appellate' && !appellateTitle) {
                setTitle(`Mana Murtii Ol-iyyannoo (${file.name.replace(/\.[^/.]+$/, "")})`);
              }
            }
          } catch (err: any) {
            console.error('File extraction error:', err);
            setError(
              currentLang === 'om'
                ? `Galmee irraa barruu baasuun hin danda'amne: ${err.message}`
                : `Error extracting text from file: ${err.message}`
            );
          } finally {
            setExtracting(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Plain text, Markdown, or Word document text reader
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          if (text) {
            setContent(text);
          }
          setExtracting(false);
        };
        reader.onerror = () => {
          setExtracting(false);
          setError('Failed to read file.');
        };
        reader.readAsText(file);
      }
    } catch (e: any) {
      setExtracting(false);
      setError(e.message || 'File processing failed');
    }
  };

  const handleRunAppellateEvaluation = async () => {
    if (!trialContent.trim() || !appellateContent.trim()) {
      setError(
        currentLang === 'om'
          ? 'Maaloo murtii Mana Murtii Sadarkaa Jalqabaa fi Ol-iyyannoo lamaanuu galchaa.'
          : 'እባክዎ የመጀመሪያ ደረጃ እና የይግባኝ ፍርድ ቤት ውሳኔዎችን ያስገቡ።'
      );
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    const thinkingDirectives = isDeepThinkingX20
      ? `
CRITICAL INSTRUCTION - X20 DEEP JURISPRUDENTIAL REASONING ACTIVATED:
You are operating in X20 High-Intensity Judicial Scrutiny Mode. Provide an exhaustive, rigorous, 20x deep appellate legal analysis.
Analyze every factual detail, substantive statute, procedural requirement, and evidentiary burden under:
1. FDRE Constitution & Revised Constitution of Oromia Region
2. Ethiopian Civil Procedure Code (SDFHH - Seera Adeemsa Falmii Hariiroo Hawaasaa, Arts. 1-483)
3. Ethiopian Civil Code 1960 & Labor Proclamation 1156/2019
4. Binding Precedents of the Federal Supreme Court Cassation Division (Murtee Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Federaalaa) and Oromia Supreme Court Cassation Division.
Zero Asterisks (*) and Zero Hashes (#) rule strictly enforced. Output fluid, authoritative judicial prose.`
      : '';

    const prompt = `
XIINXALA & MADAALLII GADI-FAGEENYA X20: MURTII MANA MURTII SADARKAA JALQABAA VS MANA MURTII OL-IYYANNOO / DHADDACHA IJIBBAATAA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${thinkingDirectives}

QAAMA 1: MURTII MANA MURTII SADARKAA JALQABAA (FIRST INSTANCE / TRIAL COURT):
Mata-Duree: ${trialTitle}
Qabiyyee & Sababa Murtii:
${trialContent}

QAAMA 2: MURTII MANA MURTII OL-IYYANNOO / DHADDACHA IJOO (APPELLATE / CASSATION COURT):
Mata-Duree: ${appellateTitle}
Mormii Ol-iyyannoo & Murtii Kenname:
${appellateContent}

TASK FOR SENIOR 50+ YEARS PhD JURIST:
Qorannoo fi madaallii sadarkaa olaanaa kennuun murtii kamiitu seeraan sirrii akka ta'e addaan baasi:

1. MURTII KAMIITU SEERAAN SIRRIIDHA? (DEFINITIVE JUDICIAL DETERMINATION):
   - Murtii Mana Murtii Sadarkaa Jalqabaati moo kan Mana Murtii Ol-iyyannootu seeraan sirriidha? Ifatti ibsi.

2. DOGOGGORA SEERAA BU'UURAA (FUNDAMENTAL ERROR OF LAW ANALYSIS):
   - Manni murtii inni dogoggore qabxii seeraa isa kam irratti dogoggore? (Fkn: aangoo maallaqaa, dirqama ragaa dhiyeessuu, ulaagaa barreeffamaa, ykn hiikkoo labsii).

3. BU'UURA KEEYYATTOOTA SEERAA & MURTEE DHADDACHA IJOO (STATUTORY PROVISIONS & CASSATION PRECEDENTS):
   - Labsiiwwan, koodiiwwan, fi lakk. galmee Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Federaalaa dhimma kanaan wal qabatan caqasi.

4. STANDARD OF APPELLATE REVIEW (GAAFFII SEERAA MOO GAAFFII DHUGAA?):
   - Manni murtii ol-iyyannoo murtii mana murtii jalqabaa diiguuf/raggaasuuf aangoo seeraa akkamii qaba?

5. TARKAANFII ABBATII SEERAA & GORSA ABUKAATTOO (PRACTICAL LITIGATION & STRATEGY GUIDANCE):
   - Falmitoonni fi abukaattoonni dhimmoota akkanaa irratti mormii akkamii dhiyeessuu qabu?
`;

    try {
      const res = await generateLegalContent({
        prompt,
        taskType: 'explain_law',
        outputLanguages: [currentLang],
        modelTier: isDeepThinkingX20 ? 'deep_thinking' : 'gemini-flash-lite-latest',
      });
      setAnalysisResult(res.content);
    } catch (err: any) {
      setError(err.message || 'Xiinxalli murtii walbira qabuu hin milkoofne.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunStatuteComparison = async () => {
    if (!statuteLeftContent.trim() || !statuteRightContent.trim()) {
      setError(
        currentLang === 'om'
          ? 'Maaloo seera ykn keeyyattoota lamaanuu guutaa.'
          : 'እባክዎ ሁለቱንም የሕግ ድንጋጌዎች ይሙሉ।'
      );
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    const thinkingDirectives = isDeepThinkingX20
      ? `
CRITICAL INSTRUCTION - X20 DEEP STATUTORY SCRUTINY ACTIVATED:
Provide an exhaustive, multi-dimensional statutory analysis comparing legal scope, hierarchy of laws (lex specialis derogat legi generali, lex posterior derogat legi priori), legislative intent, and Cassation bench ratio decidendi under Ethiopian Law.`
      : '';

    const prompt = `
XIINXALA WALBIRA QABIYYEE SEERAA (STATUTORY COMPARISON) - X20 DEEP REASONING:
------------------------------------------------------
${thinkingDirectives}

SEERA / LABSII 1:
Mata-Duree: ${statuteLeftTitle}
Qabiyyee: ${statuteLeftContent}

SEERA / LABSII 2:
Mata-Duree: ${statuteRightTitle}
Qabiyyee: ${statuteRightContent}

Maaloo qorannoo gadi fageenya qabu kenni:
1. Gargarummaa Guddaa (Key Differences in Statutory Scope):
2. Wal-fakkeenya fi Qajeeltoo Waloo (Common Legal Principles):
3. Bu'uura Seeraa & Hojiirra Oolmaa (Enforceability & Hierarchy of Laws):
4. Yaada Gorsa Ogeessa Seeraa (Jurist Recommendation):
`;

    try {
      const res = await generateLegalContent({
        prompt,
        taskType: 'explain_law',
        outputLanguages: [currentLang],
        modelTier: isDeepThinkingX20 ? 'deep_thinking' : 'gemini-flash-lite-latest',
      });
      setAnalysisResult(res.content);
    } catch (err: any) {
      setError(err.message || 'Xiinxalli walbira qabuu hin milkoofne.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <span>🏛️</span>
              <span>Judicial Hierarchy & Appellate Conflict Evaluator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100">
              {currentLang === 'om'
                ? 'Madaallii Murtii Mana Murtii Sadarkaa Jalqabaa vs Ol-iyyannoo'
                : currentLang === 'am'
                ? 'የመጀመሪያ ደረጃ እና የይግባኝ ፍርድ ቤት ውሳኔዎች ማነጻጸሪያ'
                : 'Trial Court vs. Appellate Court Judgment Conflict Evaluator'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed">
              {currentLang === 'om'
                ? 'Murtiilee dhaddacha garaagaraatiin (fakkeenyaaf: Mana Murtii Sadarkaa Jalqabaa fi Mana Murtii Ol-iyyannoo ykn Dhaddacha Ijibbaataa) jidduutti murtii kamiitu seeraan sirrii akka ta\'e, dogoggora seeraa bu\'uuraa, fi qajeeltoo seeraa dirqisiisaa AI fayyadamuun addaan baasaa.'
                : currentLang === 'am'
                ? 'በመጀመሪያ ደረጃ ፍርድ ቤት እና በይግባኝ/ሰበር ሰሚ ችሎት ውሳኔዎች መካከል የትኛው ውሳኔ በሕግ ረገድ ትክክል እንደሆነ፣ የተፈጠሩ የሕግ ስህተቶች እና አስገዳጅ መርሆዎችን በAI ይተንትኑ።'
                : 'Compare conflicting judgments across judicial tiers (First Instance Trial Courts vs. Appellate Benches & Supreme Court Cassation) to determine which holding is legally sound under Ethiopian jurisprudence.'}
            </p>
          </div>

          {/* X20 Deep Thinking Mode Toggle Badge */}
          <button
            type="button"
            onClick={() => setIsDeepThinkingX20(!isDeepThinkingX20)}
            className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 self-start md:self-auto shrink-0 shadow-lg ${
              isDeepThinkingX20
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10 ring-1 ring-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
            title="Toggle X20 Deep Legal Thinking Analysis"
          >
            <BrainCircuit className={`w-4 h-4 ${isDeepThinkingX20 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span>{isDeepThinkingX20 ? 'X20 Deep Thinking' : 'Standard Thinking'}</span>
                {isDeepThinkingX20 && <Sparkles className="w-3 h-3 text-amber-400" />}
              </div>
              <span className="text-[10px] font-mono text-slate-400 block font-normal">
                {isDeepThinkingX20 ? 'Active (Gemini 3.8 / Pro Deep Jurist)' : 'Standard Flash Mode'}
              </span>
            </div>
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setComparisonMode('appellate_vs_trial');
              setAnalysisResult(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              comparisonMode === 'appellate_vs_trial'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100 border border-slate-800'
            }`}
          >
            <span>🏛️</span>
            <span>
              {currentLang === 'om'
                ? 'Madaallii Murtii: Jalqabaa vs Ol-iyyannoo (Judicial Conflict)'
                : currentLang === 'am'
                ? 'የውሳኔዎች ንጽጽር፡ የመጀመሪያ ደረጃ vs ይግባኝ'
                : 'Judgment Conflict: Trial vs Appellate'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setComparisonMode('statute_vs_statute');
              setAnalysisResult(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              comparisonMode === 'statute_vs_statute'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100 border border-slate-800'
            }`}
          >
            <span>📜</span>
            <span>
              {currentLang === 'om'
                ? 'Walbira Qabiyyee Labsiilee & Koodii Seeraa (Statute vs Statute)'
                : currentLang === 'am'
                ? 'የአዋጆችና ሕጎች ማወዳደሪያ'
                : 'Statute vs Statute Comparison'}
            </span>
          </button>
        </div>

        {/* Preset Scenarios */}
        {comparisonMode === 'appellate_vs_trial' && (
          <div className="pt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <span>📌 Fakkeenya Qophaa\'oo:</span>
            </span>
            {appellatePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setTrialTitle(preset.trialCourtName);
                  setTrialContent(preset.trialJudgment);
                  setAppellateTitle(preset.appellateCourtName);
                  setAppellateContent(preset.appellateJudgment);
                  setTrialFileName(null);
                  setAppellateFileName(null);
                  setAnalysisResult(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-amber-300 hover:bg-slate-800 hover:border-amber-500/50 transition-all cursor-pointer font-medium"
              >
                <span>⚖️ {preset.title}</span>
              </button>
            ))}
          </div>
        )}

        {comparisonMode === 'statute_vs_statute' && (
          <div className="pt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <span>📌 Fakkeenya Labsiilee:</span>
            </span>
            {statutePresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setStatuteLeftTitle(preset.leftTitle);
                  setStatuteLeftContent(preset.leftContent);
                  setStatuteRightTitle(preset.rightTitle);
                  setStatuteRightContent(preset.rightContent);
                  setStatuteLeftFileName(null);
                  setStatuteRightFileName(null);
                  setAnalysisResult(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-amber-300 hover:bg-slate-800 hover:border-amber-500/50 transition-all cursor-pointer font-medium"
              >
                <span>⚖️ {preset.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MODE 1: APPELLATE VS TRIAL COURT SPLIT-SCREEN EDITORS */}
      {comparisonMode === 'appellate_vs_trial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Pane: First Instance / Trial Court */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏛️</span>
                    <span>1. Mana Murtii Sadarkaa Jalqabaa (Trial Court)</span>
                  </span>

                  {/* PDF, Word, Image Upload Button */}
                  <label className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                    {trialIsExtracting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {trialIsExtracting
                        ? (currentLang === 'om' ? 'Baafamaa jira...' : 'Extracting...')
                        : (currentLang === 'om' ? 'Galmee Fe’i (PDF, Word, Suuraa)' : 'Upload Ruling (PDF/Word/Img)')}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,image/*"
                      onChange={(e) => handleFileUpload(e, 'trial')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* File Upload Badge */}
                {trialFileName && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <span className="truncate flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{trialFileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTrialFileName(null);
                        setTrialContent('');
                      }}
                      className="text-slate-400 hover:text-white ml-2 text-xs"
                      title="Clear"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Maqaa Mana Murtii Jalqabaa (Court Name):
                  </label>
                  <input
                    type="text"
                    value={trialTitle}
                    onChange={(e) => setTrialTitle(e.target.value)}
                    placeholder="fkn: Mana Murtii Aanaa Adaamaa / First Instance Court"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Qabxii Falmii, Ragaa & Murtii Sadarkaa Jalqabaa:</span>
                    <span className="text-[10px] text-slate-500 font-normal">PDF, Word, Suuraa ykn Barreeffama</span>
                  </label>
                  <textarea
                    rows={10}
                    value={trialContent}
                    onChange={(e) => setTrialContent(e.target.value)}
                    placeholder="Murtii fi sababa seeraa manni murtii sadarkaa jalqabaa ittiin murteesse galchaa ykn sanada fe'aa..."
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Right Pane: Appellate / Cassation Bench */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚖️</span>
                    <span>2. Mana Murtii Ol-iyyannoo / Dhaddacha Ijoo</span>
                  </span>

                  {/* PDF, Word, Image Upload Button */}
                  <label className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                    {appellateIsExtracting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {appellateIsExtracting
                        ? (currentLang === 'om' ? 'Baafamaa jira...' : 'Extracting...')
                        : (currentLang === 'om' ? 'Galmee Fe’i (PDF, Word, Suuraa)' : 'Upload Ruling (PDF/Word/Img)')}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,image/*"
                      onChange={(e) => handleFileUpload(e, 'appellate')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* File Upload Badge */}
                {appellateFileName && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between">
                    <span className="truncate flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{appellateFileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppellateFileName(null);
                        setAppellateContent('');
                      }}
                      className="text-slate-400 hover:text-white ml-2 text-xs"
                      title="Clear"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Maqaa Mana Murtii Ol-iyyannoo (Appellate Court):
                  </label>
                  <input
                    type="text"
                    value={appellateTitle}
                    onChange={(e) => setAppellateTitle(e.target.value)}
                    placeholder="fkn: Mana Murtii Ol'aanaa / Dhaddacha Ijibbaataa"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Mormii Ol-iyyannoo, Dogoggora Seeraa & Murtii Ol-iyyannoo:</span>
                    <span className="text-[10px] text-slate-500 font-normal">PDF, Word, Suuraa ykn Barreeffama</span>
                  </label>
                  <textarea
                    rows={10}
                    value={appellateContent}
                    onChange={(e) => setAppellateContent(e.target.value)}
                    placeholder="Mormii ol-iyyannoo fi murtii manni murtii ol-iyyannoo kenne galchaa ykn sanada fe'aa..."
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚖️</span>
              <div>
                <p className="text-xs text-slate-300 font-medium">
                  {isDeepThinkingX20
                    ? 'Qorannoo Gadi-Fageenyaa X20: Heera, Koodii Siiviilii, SDFHH fi Murtee Dhaddacha Ijoo Federaalaa waliin xiinxalama.'
                    : 'Standard Judicial Conflict Analysis Mode.'}
                </p>
                {error && (
                  <p className="text-rose-400 text-xs font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{error}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={handleRunAppellateEvaluation}
                disabled={isAnalyzing || trialIsExtracting || appellateIsExtracting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isDeepThinkingX20 ? '⏳ X20 Deep Thinking... (Murtii Madaalaa jira)' : '⏳ Murtii Madaalaa jira...'}</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-4 h-4" />
                    <span>
                      {currentLang === 'om'
                        ? 'Murtii Kamiitu Sirriidha? Madaali (Evaluate Judgments)'
                        : 'Evaluate Judgments'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: STATUTE VS STATUTE SPLIT-SCREEN EDITORS */}
      {comparisonMode === 'statute_vs_statute' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Pane: Statute 1 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                    📄 Seera / Labsii 1 (Left Pane)
                  </span>

                  <label className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                    {statuteLeftIsExtracting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {statuteLeftIsExtracting
                        ? 'Baafamaa jira...'
                        : (currentLang === 'om' ? 'Galmee Fe’i (PDF/Word/Suuraa)' : 'Upload Statute')}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,image/*"
                      onChange={(e) => handleFileUpload(e, 'statuteLeft')}
                      className="hidden"
                    />
                  </label>
                </div>

                {statuteLeftFileName && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <span className="truncate flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{statuteLeftFileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStatuteLeftFileName(null);
                        setStatuteLeftContent('');
                      }}
                      className="text-slate-400 hover:text-white ml-2 text-xs"
                      title="Clear"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mata-Duree Seeraa 1:
                  </label>
                  <input
                    type="text"
                    value={statuteLeftTitle}
                    onChange={(e) => setStatuteLeftTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Qabiyyee Keeyyataa 1:
                  </label>
                  <textarea
                    rows={9}
                    value={statuteLeftContent}
                    onChange={(e) => setStatuteLeftContent(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Right Pane: Statute 2 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
                    📄 Seera / Labsii 2 (Right Pane)
                  </span>

                  <label className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                    {statuteRightIsExtracting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {statuteRightIsExtracting
                        ? 'Baafamaa jira...'
                        : (currentLang === 'om' ? 'Galmee Fe’i (PDF/Word/Suuraa)' : 'Upload Statute')}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,image/*"
                      onChange={(e) => handleFileUpload(e, 'statuteRight')}
                      className="hidden"
                    />
                  </label>
                </div>

                {statuteRightFileName && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between">
                    <span className="truncate flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{statuteRightFileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStatuteRightFileName(null);
                        setStatuteRightContent('');
                      }}
                      className="text-slate-400 hover:text-white ml-2 text-xs"
                      title="Clear"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mata-Duree Seeraa 2:
                  </label>
                  <input
                    type="text"
                    value={statuteRightTitle}
                    onChange={(e) => setStatuteRightTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Qabiyyee Keeyyataa 2:
                  </label>
                  <textarea
                    rows={9}
                    value={statuteRightContent}
                    onChange={(e) => setStatuteRightContent(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            {error && (
              <div className="text-rose-300 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="w-full sm:w-auto flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={handleRunStatuteComparison}
                disabled={isAnalyzing || statuteLeftIsExtracting || statuteRightIsExtracting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isAnalyzing ? '⏳ Xiinxalaa jira...' : '⚡ Seera Wal Bira Qabi (Run Comparison)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Comparative Analysis Results */}
      {analysisResult && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                🏛️
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-100 font-serif-legal flex items-center gap-2">
                  <span>
                    {comparisonMode === 'appellate_vs_trial'
                      ? currentLang === 'om'
                        ? 'Gabaasa Madaallii Murtii: Sadarkaa Jalqabaa vs Ol-iyyannoo'
                        : currentLang === 'am'
                        ? 'የፍርድ ቤቶች ውሳኔዎች ንጽጽር እና ውሳኔ'
                        : 'Judicial Conflict & Appellate Review Analysis'
                      : currentLang === 'om'
                      ? 'Bu\'aa Xiinxala Walbira Qabiyyee Seeraa'
                      : 'የማወዳደሪያ ትንተና ውጤት'}
                  </span>
                  {isDeepThinkingX20 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                      X20 Reasoning
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Ethiopian Court Jurisprudence & Error of Law Evaluation
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors self-end sm:self-auto"
            >
              <span>📥</span>
              <span>{t.actions.exportPdf}</span>
            </button>
          </div>

          <div className="p-6 sm:p-7 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans legal-content-body selection:bg-amber-500/30 selection:text-amber-200">
            <LegalCitationHighlighter text={analysisResult} currentLang={currentLang} />
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      {showPdfModal && analysisResult && (
        <PdfExportModal
          isOpen={showPdfModal}
          currentLang={currentLang}
          title={
            comparisonMode === 'appellate_vs_trial'
              ? `Madaallii Murtii: ${trialTitle} vs ${appellateTitle}`
              : `Gabaasa Walbira Qabiyyee: ${statuteLeftTitle} vs ${statuteRightTitle}`
          }
          content={analysisResult}
          taskType="compare_law"
          outputLanguages={[currentLang]}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
};
