import React, { useState, useMemo } from 'react';
import { Language } from '../i18n/translations';
import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from '../data/cassationPrecedents';
import { 
  Search, 
  Scale, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Filter, 
  Layers, 
  X, 
  ChevronRight, 
  Compass, 
  FileText, 
  ShieldCheck, 
  Building2, 
  HelpCircle,
  Tag
} from 'lucide-react';

export type JudicialInterpretationThemeId = 
  | 'contract_nullity'
  | 'land_dispute'
  | 'summary_dismissal'
  | 'common_marital_property'
  | 'succession_debts'
  | 'fraud_vs_breach'
  | 'retrial_vs_opposition'
  | 'interlocutory_appeal'
  | 'interim_injunction'
  | 'limitation_period'
  | 'cheque_dishonor'
  | 'bail_liberty';

export interface JudicialInterpretationTheme {
  id: JudicialInterpretationThemeId;
  emoji: string;
  title: {
    om: string;
    am: string;
    en: string;
  };
  subtitle: {
    om: string;
    am: string;
    en: string;
  };
  statutoryFocus: string[];
  keywords: string[];
  // File numbers of landmark rulings addressing this theme
  precedentFileNumbers: string[];
}

export const JUDICIAL_THEMES: JudicialInterpretationTheme[] = [
  {
    id: 'contract_nullity',
    emoji: '📝',
    title: {
      om: 'Diigamuu Waliigaltee (Contract Nullity)',
      am: 'የውል መፍረስና ዋጋ አልባ መሆን',
      en: 'Contract Nullity & Formality Defects',
    },
    subtitle: {
      om: 'Ulaagaa barreeffamaa, galmee hin qabne, gurgurtaa manaa, fi gatii seeraa dhabuu',
      am: 'የጽሁፍና የምዝገባ ፎርም ጉድለት፣ የማይንቀሳቀስ ንብረት ሽያጭ እና ውል ዋጋ ማጣት',
      en: 'Mandatory written form, unregistered immovable sale, defect of consent and nullity',
    },
    statutoryFocus: ['Civil Code Arts. 1723', 'Civil Code Arts. 1731', 'Civil Code Arts. 2472', 'Civil Code Arts. 2877'],
    keywords: [
      'nullity', 'null', 'void', 'diigamu', 'diigamuu', 'waliigaltee', 'diiguu', 'gurgurtaa manaa', 
      'galmee', 'notary', 'liqii', 'barreeffama', 'formality', '1723', '2472', '2877', '1731', 
      'ውል', 'መፍረስ', 'ፈራሽ', 'የጽሁፍ', 'ሽያጭ', 'ዋጋ አልባ', 'ብድር'
    ],
    precedentFileNumbers: ['21448', '18274', '34812', '42398'],
  },
  {
    id: 'land_dispute',
    emoji: '🏡',
    title: {
      om: 'Falmii Qabiyyee Lafaa (Land Dispute Ownership)',
      am: 'የመሬት ይዞታ ክርክርና ባለቤትነት',
      en: 'Land Dispute Ownership & Rural Holdings',
    },
    subtitle: {
      om: 'Mirga qabiyyee lafa baadiyyaa, kireessaa, daangaa, fi abbummaa qabeenya lafarraa',
      am: 'የገጠር መሬት ይዞታ መብት፣ ኪራይ፣ የወሰን ክርክር እና የመሬት አስተዳደር',
      en: 'Rural land use rights, agricultural lease, boundary claims, and expropriation compensation',
    },
    statutoryFocus: ['Proc. 130/1999 Arts. 6, 14', 'FDRE Const. Art. 40', 'Civil Code Arts. 1140, 2932'],
    keywords: [
      'lafa', 'lafaa', 'baadiyyaa', 'qabiyyee', 'qonnaan bulaa', 'kireessaa', 'land', 'ownership', 
      'property', 'dispute', 'real estate', 'holding', 'plot', 'lease', '130', '40', '1140', '2932', 
      'መሬት', 'ይዞታ', 'የገጠር መሬት', 'ባለቤትነት', 'ኪራይ', 'አርሶ አደር', 'ወሰን'
    ],
    precedentFileNumbers: ['13002', '16568', '39688', '249062', '58920'],
  },
  {
    id: 'summary_dismissal',
    emoji: '👷',
    title: {
      om: 'Ariisaa Hojii & Beenyaa (Summary Dismissal & Severance)',
      am: 'ያለማስጠንቀቂያ ስንብትና የካሳ ክፍያ',
      en: 'Summary Dismissal & Severance Pay',
    },
    subtitle: {
      om: 'Sababa hanqina dandeettii, madaallii barreeffamaa, seeraan ala hojiirraa gaggeessuu',
      am: 'ያለተጨባጭ ምዘና ከስራ ማሰናበት፣ የስንብት ካሳና የስራ ክርክር ይርጋ ጊዜ',
      en: 'Unlawful termination, lack of performance evaluation, severance calculation and limitation',
    },
    statutoryFocus: ['Labor Proc. 1156/2019 Arts. 27, 39, 40, 138'],
    keywords: [
      'hojjetaa', 'hojii', 'ariisaa', 'beenyaa', 'madaallii', 'hojjachiisaa', 'severance', 'dismissal', 
      'termination', 'labor', 'employment', 'worker', '1156', '27', '39', '138', 
      'ስራ', 'ሰራተኛ', 'ስንብት', 'ካሳ', 'አሠሪ', 'አዋጅ 1156', 'የስራ ውል'
    ],
    precedentFileNumbers: ['198421', '112044', '22442'],
  },
  {
    id: 'common_marital_property',
    emoji: '👨‍👩‍👧',
    title: {
      om: 'Qabeenya Waloo Fuudhaa (Common Marital Property)',
      am: 'የባልና ሚስት የጋራ ንብረት ክፍፍል',
      en: 'Common Marital Property & Divorce Distribution',
    },
    subtitle: {
      om: 'Tilmaama qabeenya waloo, qabeenya maqaa tokkoon galmaa\'e, fi qoodinsa fuudha duraa/boodaa',
      am: 'በአንዱ ስም የተመዘገበ ንብረት፣ የጋብቻ የጋራ ንብረት ግምትና በፍቺ ጊዜ ክፍፍል',
      en: 'Presumption of common property during marriage, registered titles, and divorce partition',
    },
    statutoryFocus: ['Oromia Family Code Arts. 48, 85', 'Revised Family Code Art. 62'],
    keywords: [
      'maatii', 'fuudha', 'heeruma', 'abbaa manaa', 'haadha manaa', 'waloo', 'qabeenya waloo', 
      'divorce', 'marriage', 'marital', 'common property', 'spouse', 'family', '48', '85', 
      'ጋብቻ', 'ፍቺ', 'ባል', 'ሚስት', 'የጋራ ንብረት', 'ቤተሰብ', 'ክፍፍል'
    ],
    precedentFileNumbers: ['21049', '45192'],
  },
  {
    id: 'succession_debts',
    emoji: '📜',
    title: {
      om: 'Dhaaltummaa & Qulqulleessa Idaa (Succession & Estate Debts)',
      am: 'የውርስ መብትና የሟች ዕዳዎች ማጣራት',
      en: 'Succession Liquidation & Creditor Priority',
    },
    subtitle: {
      om: 'Waraqaa dhaaltummaa, qabeenya dhaalaa qulqulleessuu, fi kafaltii idaa abbaa dhaalaa',
      am: 'የወራሽነት ምስክር ወረቀት፣ የሟች ዕዳዎች ቅድሚያ መከፈልና የውርስ ክፍፍል',
      en: 'Ascertainment of heirship, liquidation of estate liabilities before partition to heirs',
    },
    statutoryFocus: ['Civil Code Arts. 996, 1060, 1062'],
    keywords: [
      'dhaala', 'dhaaltuu', 'dhaaltota', 'idaa', 'qulqulleessa', 'heir', 'succession', 'estate', 
      'inheritance', 'liquidation', 'debt', '996', '1060', '1062', 
      'ውርስ', 'ወራሽ', 'የሟች ዕዳ', 'ማጣራት', 'የውርስ ንብረት'
    ],
    precedentFileNumbers: ['16568', '31209'],
  },
  {
    id: 'fraud_vs_breach',
    emoji: '🛡️',
    title: {
      om: 'Yakka Gawwoonsaa (Fraud vs Contract Breach)',
      am: 'የማታለል ወንጀልና የውል ግዴታ አለመወጣት',
      en: 'Criminal Fraud vs Civil Contract Breach',
    },
    subtitle: {
      om: 'Toftaa malaammaltummaa, gocha amansiisanii qabeenya fudhachuu, fi falmii siiviilii irraa adda baasuu',
      am: 'የማጭበርበር ወንጀል ማቋቋሚያዎች፣ የውል ግዴታ አለመወጣት ወደ ወንጀል አለመቀየሩ',
      en: 'Deceitful artifice inducing transfer of property versus mere civil breach of debt agreement',
    },
    statutoryFocus: ['Criminal Code Arts. 692, 679'],
    keywords: [
      'gawwoonsaa', 'gowwomsaa', 'malaammaltummaa', 'yakka', 'fraud', 'deceit', 'breach', 
      'criminal', 'civil', '692', '679', 
      'ማታለል', 'ማጭበርበር', 'ወንጀል', 'የውል ግድፈት', 'ፍትሐብሔር'
    ],
    precedentFileNumbers: ['48210', '75412'],
  },
  {
    id: 'retrial_vs_opposition',
    emoji: '⚖️',
    title: {
      om: 'Daagim-Daanyummaa & Mormii Murtee (Retrial vs Opposition)',
      am: 'ዳግም ዳኝነትና የፍርድ መቃወሚያ ቅደም ተከተል',
      en: 'Procedural Hierarchy: Retrial vs Third-Party Opposition',
    },
    subtitle: {
      om: 'Iyyata Keeyyata 6 fi Keeyyata 358 yeroo tokkotti dhiyaate, duraan duubsa dhaddachaa',
      am: 'የዳግም ዳኝነትና የፍርድ መቃወሚያ ክርክር በአንድ ላይ ሲቀርቡ የክርክር አመራር ቅደም ተከተል',
      en: 'Concurrent applications under Civil Procedure Code Arts. 6 and 358, staying proceedings',
    },
    statutoryFocus: ['Civil Procedure Code Arts. 6, 197, 358'],
    keywords: [
      'daagim-daanyummaa', 'daagim', 'mormii murtee', 'qaama 3ffaa', 'retrial', 'opposition', 
      'stay', 'procedure', '6', '197', '358', 
      'ዳግም ዳኝነት', 'የፍርድ መቃወሚያ', 'ሦስተኛ ወገን', 'እግድ', 'ሥነ-ሥርዓት'
    ],
    precedentFileNumbers: ['249062'],
  },
  {
    id: 'interlocutory_appeal',
    emoji: '🏛️',
    title: {
      om: 'Murtee Yeroo & Ol\'iyyaannoo (Interlocutory Appeal)',
      am: 'የጊዜያዊ ትእዛዝ የይግባኝ መብት ክልከላ',
      en: 'Interlocutory Orders & Non-Appealability',
    },
    subtitle: {
      om: 'Murtee yeroo falmii xumura hin kennine irratti kallattiin ol\'iyyaannoo dhorkuu',
      am: 'ጉዳዩን የመጨረሻ እልባት በማይሰጡ በጊዜያዊ ትእዛዞች ላይ ወዲያውኑ ይግባኝ ማለት አለመቻል',
      en: 'Interlocutory orders not terminating main proceedings cannot be separately appealed',
    },
    statutoryFocus: ['Civil Procedure Code Arts. 320, 350'],
    keywords: [
      'ol\'iyyaannoo', 'murtee yeroo', 'interlocutory', 'appeal', 'final', 'order', '320', '350', 
      'ይግባኝ', 'ጊዜያዊ ትእዛዝ', 'የመጨረሻ ውሳኔ'
    ],
    precedentFileNumbers: ['21904'],
  },
  {
    id: 'interim_injunction',
    emoji: '🛑',
    title: {
      om: 'Dhorkaa Yeroo (Temporary Injunction Criteria)',
      am: 'የጊዜያዊ እግድ ትእዛዝ ቅድመ-ሁኔታዎች',
      en: 'Temporary Injunction Conditions & Irreparable Injury',
    },
    subtitle: {
      om: 'Miidhaa bakka hin deebine, ragaa amansiisaa duraa, fi wal-madaalchisa miidhaa',
      am: 'የማይጠገን ጉዳት፣ አሳማኝ ማስረጃ እና የአመዛኝ ጉዳት መመዘኛዎች',
      en: 'Irreparable damage, strong prima facie evidence, and balance of convenience criteria',
    },
    statutoryFocus: ['Civil Procedure Code Arts. 154-159'],
    keywords: [
      'dhorkaa', 'dhorkaa yeroo', 'injunction', 'temporary injunction', 'miidhaa', 'prima facie', '154', '155', '158', 
      'እግድ', 'ጊዜያዊ እግድ', 'የማይጠገን ጉዳት'
    ],
    precedentFileNumbers: ['43102'],
  },
  {
    id: 'limitation_period',
    emoji: '⏳',
    title: {
      om: 'Yeroo Darbiinsa (Period of Limitation & Tort)',
      am: 'የይርጋ ጊዜና ከውል ውጭ ኃላፊነት የካሳ ጥያቄ',
      en: 'Period of Limitation in Tort & Damage Claims',
    },
    subtitle: {
      om: 'Yeroo darbiinsa waggaa lamaa miidhaa al-waliigaltee, beekuu miidhamichaarraa eegaluu',
      am: 'ከውል ውጭ ኃላፊነት የ2 ዓመት ይርጋ አቆጣጠር እና የትራፊክ አደጋ ካሳ',
      en: 'Two-year tort limitation calculated from knowledge of injury and tortfeasor identity',
    },
    statutoryFocus: ['Civil Code Arts. 2020, 2140', 'Civil Code Art. 1845'],
    keywords: [
      'yeroo darbiinsa', 'darbiinsa', 'waggaa lama', 'beenyaa', 'balaa konkolaataa', 'limitation', 'tort', 'prescription', '2020', '2140', '1845', 
      'ይርጋ', 'የይርጋ ጊዜ', 'ከውል ውጭ', 'የአደጋ ካሳ'
    ],
    precedentFileNumbers: ['41289'],
  },
  {
    id: 'cheque_dishonor',
    emoji: '💼',
    title: {
      om: 'Cheekii Herrega Hin Qabne (Cheque Dishonor & Liability)',
      am: 'ያለስንቅ የተሰጠ ቼክና የስራ አስኪያጅ ተጠያቂነት',
      en: 'Dishonored Cheques & Corporate Drawer Liability',
    },
    subtitle: {
      om: 'Ittigaafatamummaa dhaabbataa fi hogganaa dhuunfaa, kaffaltii maallaqaa',
      am: 'በድርጅት ስም የተሰጠ ቼክ የኩባንያው እንጂ የስራ አስኪያጁ የግል ዕዳ አለመሆን',
      en: 'Corporate financial responsibility vs manager individual penal and civil liability',
    },
    statutoryFocus: ['Commercial Code Arts. 732, 856'],
    keywords: [
      'cheekii', 'baankii', 'dhaabbata', 'cheque', 'dishonor', 'drawer', 'manager', '732', '856', 
      'ቼክ', 'ያለስንቅ ቼክ', 'ስራ አስኪያጅ', 'ድርጅት', 'የንግድ ሕግ'
    ],
    precedentFileNumbers: ['88201', '104210'],
  },
  {
    id: 'bail_liberty',
    emoji: '🔓',
    title: {
      om: 'Mirga Wabii (Bail & Pre-Trial Liberty)',
      am: 'የዋስትና መብትና የቅድመ-ፍርድ ነጻነት',
      en: 'Right to Bail & Flight Risk Standard',
    },
    subtitle: {
      om: 'Wabii dhorkuu kan danda\'amu baduu fi ragaa balleessuu qofaan ta\'uu',
      am: 'ዋስትና የሚከለከለው የማምለጥ ወይም ማስረጃ የማጥፋት ስጋት ሲረጋገጥ ብቻ መሆኑ',
      en: 'Statutory bail cannot be denied as punishment; requires concrete proof of flight risk',
    },
    statutoryFocus: ['Criminal Procedure Code Arts. 63, 67', 'FDRE Const. Art. 19'],
    keywords: [
      'wabii', 'mirga wabii', 'bail', 'remand', 'flight risk', '63', '67', '59', 
      'ዋስትና', 'የዋስትና መብት', 'የጊዜ ቀጠሮ', 'ማምለጥ'
    ],
    precedentFileNumbers: ['39102', '72109'],
  },
];

interface PrecedentFinderToolProps {
  currentLang: Language;
  precedents?: CassationPrecedent[];
  onNavigateToRuling?: (fileNumber: string) => void;
  onSendToExplain?: (query: string) => void;
}

export const PrecedentFinderTool: React.FC<PrecedentFinderToolProps> = ({
  currentLang,
  precedents,
  onNavigateToRuling,
  onSendToExplain,
}) => {
  const sourcePrecedents = precedents || CASSATION_PRECEDENTS_DATA;
  const [userLegalIssueInput, setUserLegalIssueInput] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState<JudicialInterpretationThemeId | 'all'>('contract_nullity');
  const [detectedTheme, setDetectedTheme] = useState<JudicialInterpretationTheme | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sample prompt issues that users can test with 1-click
  const sampleIssues = [
    {
      label: '📝 Waliigaltee Gurgurtaa Manaa (Contract Nullity)',
      theme: 'contract_nullity' as JudicialInterpretationThemeId,
      text: 'Waliigalteen gurgurtaa manaa seeraan ala mallatteeffamee waajjira dhimmi ilaallatutti (Notary) hin galmoofne gatii seeraa qabaa? Abbummaa manaa dabarsuu danda\'aa?',
    },
    {
      label: '🏡 Falmii Qabiyyee Lafaa (Land Dispute Ownership)',
      theme: 'land_dispute' as JudicialInterpretationThemeId,
      text: 'Qonnaan bulaan lafa baadiyyaa isaa kireessee erga du\'ee booda dhaaltotni isaa waliigaltee kireessaa diiguu danda\'uu? Falmii qabiyyee lafaa akkamitti hiikama?',
    },
    {
      label: '👷 Ariisaa Hojii & Beenyaa (Labor Severance)',
      theme: 'summary_dismissal' as JudicialInterpretationThemeId,
      text: 'Hojjetaan sababa hanqina dandeettiitiin osoo madaalliin raawwii hojii barreeffamaa hin jirre ari\'ame beenyaa fi kaffaltii addaan kutuu argachuu danda\'aa?',
    },
    {
      label: '👨‍👩‍👧 Qabeenya Waloo Fuudhaa (Marital Property)',
      theme: 'common_marital_property' as JudicialInterpretationThemeId,
      text: 'Qabeenyi bara fuudhaafi heerumaa keessatti horatame maqaa abbaa manaatiin qofa galmaa\'e yoo ta\'e hiikkaa fuudhaa booda qabeenya dhuunfaati moo walooti?',
    },
    {
      label: '⚖️ Daagim-Daanyummaa & Mormii Murtee (Retrial vs Opposition)',
      theme: 'retrial_vs_opposition' as JudicialInterpretationThemeId,
      text: 'Iyyatni Daagim-daanyummaa Keeyyata 6 fi Mormiin Murtee Keeyyata 358 yeroo tokkotti galmee tokko irratti yoo dhiyaatan kamtu dursi kennamee ilaalamuu qaba?',
    },
  ];

  // Intelligently parse user issue input to automatically detect judicial interpretation theme
  const parseIssueText = (text: string) => {
    if (!text.trim()) {
      setDetectedTheme(null);
      return;
    }

    const lower = text.toLowerCase();
    let bestTheme: JudicialInterpretationTheme | null = null;
    let highestScore = 0;

    for (const theme of JUDICIAL_THEMES) {
      let score = 0;
      for (const kw of theme.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          score += 2;
        }
      }
      for (const stat of theme.statutoryFocus) {
        const artNum = stat.match(/\d+/)?.[0];
        if (artNum && lower.includes(artNum)) {
          score += 3;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestTheme = theme;
      }
    }

    if (bestTheme && highestScore >= 2) {
      setDetectedTheme(bestTheme);
      setSelectedThemeId(bestTheme.id);
    } else {
      setDetectedTheme(null);
    }
  };

  const handleInputChange = (val: string) => {
    setUserLegalIssueInput(val);
    parseIssueText(val);
  };

  const handleSelectSample = (sample: typeof sampleIssues[0]) => {
    setUserLegalIssueInput(sample.text);
    setSelectedThemeId(sample.theme);
    const themeObj = JUDICIAL_THEMES.find((t) => t.id === sample.theme) || null;
    setDetectedTheme(themeObj);
  };

  // Precedents filtered according to selected theme or text match
  const filteredPrecedents = useMemo(() => {
    const activeTheme = JUDICIAL_THEMES.find((t) => t.id === selectedThemeId);

    return sourcePrecedents.filter((p) => {
      // If a specific theme is active, match by file numbers or theme category/keywords
      if (activeTheme && selectedThemeId !== 'all') {
        const fileMatches = activeTheme.precedentFileNumbers.includes(p.fileNumber);
        if (fileMatches) return true;

        // Semantic check on legal issue, binding principle and statutory provisions
        const contentStr = [
          p.fileNumber,
          p.legalIssue.om,
          p.legalIssue.am,
          p.legalIssue.en,
          p.bindingPrinciple.om,
          p.bindingPrinciple.am,
          p.bindingPrinciple.en,
          p.statutoryProvisions.join(' '),
        ].join(' ').toLowerCase();

        const matchCount = activeTheme.keywords.filter((kw) => contentStr.includes(kw.toLowerCase())).length;
        if (matchCount >= 2) return true;
        return false;
      }

      // If 'all' and user has entered custom text
      if (userLegalIssueInput.trim()) {
        const qParts = userLegalIssueInput.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        const pStr = [
          p.fileNumber,
          p.legalIssue.om,
          p.legalIssue.am,
          p.bindingPrinciple.om,
          p.statutoryProvisions.join(' '),
        ].join(' ').toLowerCase();

        return qParts.some((part) => pStr.includes(part));
      }

      return true;
    });
  }, [selectedThemeId, userLegalIssueInput]);

  const handleCopyCitation = (c: CassationPrecedent) => {
    const isOromia = c.courtJurisdiction === 'oromia' || c.id.startsWith('oromia_');
    const courtTitle = isOromia ? 'Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa' : 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa';
    const text = `⚖️ ${courtTitle} (Lakk. Galmee: ${c.fileNumber})
Jildii: ${c.volume} | Bara: ${c.yearEC} B.A. (${c.yearGC} G.C.)
Qaamolee: ${c.parties.om}

📌 Gaaffii Seeraa Ijoo:
${c.legalIssue[currentLang] || c.legalIssue.om}

📜 Qajeeltoo Seeraa Dirqisiisaa (Binding Ratio - Labsii 454/97 K. 2(1)):
${c.bindingPrinciple[currentLang] || c.bindingPrinciple.om}

Keeyyattoota Seeraa: ${c.statutoryProvisions.join(', ')}
(SeeraAI - Precedent Finder Tool)`;

    navigator.clipboard.writeText(text);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeepDive = (c: CassationPrecedent) => {
    if (onSendToExplain) {
      const query = `Murtii Dhaddacha Ijoo Lakk. Galmee ${c.fileNumber} (Jildii ${c.volume}): ${c.parties.om} irratti kenname bal'inaan naaf ibsi. Gaaffiin seeraa ijoo: ${c.legalIssue.om}. Qajeeltoon dirqisiisaan: ${c.bindingPrinciple.om}`;
      onSendToExplain(query);
    }
  };

  const activeThemeObject = JUDICIAL_THEMES.find((t) => t.id === selectedThemeId);

  return (
    <div className="space-y-6 text-left">
      {/* TOOL HEADER BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500 text-slate-950 border border-amber-400 shrink-0 shadow-lg">
                <Compass className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-serif-legal">
                    Precedent Finder (Barbaada Murtee Ijoo)
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/30">
                    Theme-Based Precedent Matcher
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  Dhimma seeraa keessan asitti galchaa; sirni kun dhimma keessan xiinxaluudhaan murtiilee Dhaddacha Ijibbaataa Federaalaa fi Oromiyaa <strong>Mata-Duree Hiikkoo Seeraatiin (Judicial Interpretation Themes)</strong> akka <em>'Contract Nullity'</em>, <em>'Land Dispute Ownership'</em>, <em>'Summary Dismissal'</em> fi kkf adda baasee fida.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-center shadow-xs">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Mata-dureewwan</div>
                <div className="text-base font-bold text-amber-400 font-mono">{JUDICIAL_THEMES.length} Themes</div>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-center shadow-xs">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Murteewwan Argaman</div>
                <div className="text-base font-bold text-emerald-400 font-mono">{filteredPrecedents.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. LEGAL ISSUE PARSER INPUT PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
              Xiinxala Dhimma Seeraa Keessanii (Parse Current Legal Issue)
            </h2>
          </div>
          {userLegalIssueInput && (
            <button
              type="button"
              onClick={() => {
                setUserLegalIssueInput('');
                setDetectedTheme(null);
                setSelectedThemeId('contract_nullity');
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
            >
              Qulqulleessi (Clear)
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400">
            Dhimma ykn Gaaffii Seeraa Falmisiisaa Asitti Barreessaa:
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={userLegalIssueInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="fkn: Waliigalteen gurgurtaa manaa hin galmoofne gatii seeraa qabaa? Ykn qonnaan bulaan lafa kireessee erga du'ee booda dhaaltotni isaa waliigalticha diiguu danda'uu?..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner font-sans leading-relaxed resize-none"
            />
            {userLegalIssueInput && (
              <button
                type="button"
                onClick={() => setUserLegalIssueInput('')}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer p-1"
                title="Haqi"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Sample Test Issues */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            ⚡ Fakkeenya Dhimma Seeraatiin Yaalaa (1-Click Sample Issues):
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {sampleIssues.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer border text-xs flex items-center gap-1.5 ${
                  selectedThemeId === sample.theme
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{sample.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Auto-detected theme banner */}
        {detectedTheme && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <span className="text-xl p-2 rounded-xl bg-amber-500 text-slate-950">
                {detectedTheme.emoji}
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-mono font-bold text-amber-400 tracking-wider">
                    🎯 Mata-Dureen Seeraa Argame (Detected Theme):
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    High Confidence Match
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-amber-300">
                  {detectedTheme.title[currentLang] || detectedTheme.title.om}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Keeyyattoota Walqabatan: <strong>{detectedTheme.statutoryFocus.join(', ')}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedThemeId(detectedTheme.id)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer shrink-0"
            >
              Murteewwan Agarsiisi
            </button>
          </div>
        )}
      </div>

      {/* 2. JUDICIAL INTERPRETATION THEMES SELECTOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
              Mata-Duree Hiikkoo Seeraa Filadhaa (Judicial Interpretation Themes)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {selectedThemeId === 'all' ? 'Hunda' : activeThemeObject?.title[currentLang] || activeThemeObject?.title.om}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedThemeId('all')}
            className={`p-3.5 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
              selectedThemeId === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>🏛️</span>
              <span>Murteewwan Hunda (All Precedents)</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${selectedThemeId === 'all' ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-slate-400'}`}>
              {sourcePrecedents.length}
            </span>
          </button>

          {JUDICIAL_THEMES.map((theme) => {
            const isSelected = selectedThemeId === theme.id;
            const precedentCount = sourcePrecedents.filter((p) =>
              theme.precedentFileNumbers.includes(p.fileNumber)
            ).length;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedThemeId(theme.id)}
                className={`p-3.5 rounded-2xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 font-bold">
                    <span>{theme.emoji}</span>
                    <span className="truncate">{theme.title[currentLang] || theme.title.om}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-slate-400'}`}>
                    {precedentCount}
                  </span>
                </div>

                <div className={`text-[10px] truncate ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                  {theme.statutoryFocus.join(' • ')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FILTERED PRECEDENTS RESULTS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
          <span>
            Murteewwan Mata-Duree Kanaan Argaman:{' '}
            <strong className="text-amber-400">{filteredPrecedents.length}</strong>
          </span>
          {activeThemeObject && (
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>{activeThemeObject.emoji}</span>
              <span>{activeThemeObject.title[currentLang] || activeThemeObject.title.om}</span>
            </span>
          )}
        </div>

        {filteredPrecedents.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Murtiin mata-duree kanaan hin argamne</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Mata-duree biraa filadhaa ykn dhimma seeraa keessan fooyyessaa barreessaa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredPrecedents.map((c) => {
              const isOromia = c.courtJurisdiction === 'oromia' || c.id.startsWith('oromia_');

              return (
                <div
                  key={c.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 shadow-xl space-y-4 transition-all relative"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-xl font-bold uppercase border ${
                          isOromia
                            ? 'bg-red-950 text-red-300 border-red-500/40'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {isOromia ? '🔴 Oromiyaa Cassation' : '🟢 Federal Cassation'}
                      </span>

                      <span className="text-xs px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono font-bold shadow-xs">
                        Lakk. Galmee: {c.fileNumber}
                      </span>

                      <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-950 text-amber-300 font-mono font-bold border border-slate-800">
                        Jildii {c.volume}
                      </span>

                      <span className="text-[11px] text-slate-400 font-mono">
                        Bara {c.yearEC} B.A. ({c.yearGC} G.C.)
                      </span>

                      {activeThemeObject && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                          {activeThemeObject.emoji} {activeThemeObject.title[currentLang] || activeThemeObject.title.om}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(c)}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        {copiedId === c.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Waraabbameera!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Waraabi</span>
                          </>
                        )}
                      </button>

                      {onNavigateToRuling && (
                        <button
                          type="button"
                          onClick={() => onNavigateToRuling(c.fileNumber)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                          title="Gara galmee guutuu murtichaatti darbi"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Galmee Guutuu (Open Ruling)</span>
                        </button>
                      )}

                      {onSendToExplain && (
                        <button
                          type="button"
                          onClick={() => handleDeepDive(c)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ibsa AI</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Parties */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Qaamolee Falmii (Parties):
                    </span>
                    <div className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                      <span>{c.parties.om}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300 font-ethiopic">{c.parties.am}</span>
                    </div>
                  </div>

                  {/* Core Legal Issue & Binding Ratio Decidendi */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Legal Issue */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <span>📌</span>
                        <span>Gaaffii Seeraa Ijoo (Core Legal Issue):</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {c.legalIssue[currentLang] || c.legalIssue.om}
                      </p>
                      {currentLang !== 'am' && (
                        <p className="text-[11px] text-slate-400 font-ethiopic leading-relaxed pt-1 border-t border-slate-900">
                          {c.legalIssue.am}
                        </p>
                      )}
                    </div>

                    {/* Binding Principle */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Qajeeltoo Seeraa Dirqisiisaa (Binding Precedent Ratio):</span>
                      </div>
                      <p className="text-xs text-slate-100 leading-relaxed font-sans font-medium">
                        {c.bindingPrinciple[currentLang] || c.bindingPrinciple.om}
                      </p>
                      {currentLang !== 'am' && (
                        <p className="text-[11px] text-slate-400 font-ethiopic leading-relaxed pt-1 border-t border-slate-900">
                          {c.bindingPrinciple.am}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Statutory Provisions Interpreted */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-500">Tumaalee Seeraa:</span>
                      {c.statutoryProvisions.map((prov, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[10px]"
                        >
                          {prov}
                        </span>
                      ))}
                    </div>

                    {onNavigateToRuling && (
                      <button
                        type="button"
                        onClick={() => onNavigateToRuling(c.fileNumber)}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer self-start sm:self-auto"
                      >
                        <span>Murtii Guutuu Dubbisi</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
