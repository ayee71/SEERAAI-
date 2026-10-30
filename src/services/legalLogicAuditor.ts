import { Language } from '../i18n/translations';

export type ProceduralSeverity = 'critical' | 'warning' | 'info';

export type ProceduralCategory =
  | 'signature_verification'
  | 'service_of_process'
  | 'pecuniary_jurisdiction'
  | 'cause_of_action_date'
  | 'evidence_witness_schedule'
  | 'prayer_and_relief'
  | 'representation_poa'
  | 'court_bench_designation';

export interface ProceduralWarning {
  id: string;
  category: ProceduralCategory;
  severity: ProceduralSeverity;
  title: {
    om: string;
    am: string;
    en: string;
  };
  statutoryReference: string;
  articleCode: string;
  description: {
    om: string;
    am: string;
    en: string;
  };
  rejectionRisk: {
    om: string;
    am: string;
    en: string;
  };
  suggestedFixSnippet: {
    om: string;
    am: string;
    en: string;
  };
  insertionPosition: 'top' | 'bottom' | 'prayer_section' | 'signature_block';
  isFixed?: boolean;
}

export interface LegalLogicAuditReport {
  overallScore: number; // 0 - 100 (100 = Court-Ready / Zero Procedural Defects)
  status: 'court_ready' | 'needs_minor_revision' | 'high_rejection_risk' | 'empty_document';
  totalIssuesCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  warnings: ProceduralWarning[];
  summary: {
    om: string;
    am: string;
    en: string;
  };
  detectedDocumentType: string;
  scannedAt: string;
}

interface RuleDefinition {
  id: string;
  category: ProceduralCategory;
  severity: ProceduralSeverity;
  statutoryReference: string;
  articleCode: string;
  title: { om: string; am: string; en: string };
  description: { om: string; am: string; en: string };
  rejectionRisk: { om: string; am: string; en: string };
  suggestedFixSnippet: { om: string; am: string; en: string };
  insertionPosition: 'top' | 'bottom' | 'prayer_section' | 'signature_block';
  checkMissing: (text: string, lowerText: string) => boolean;
}

const PROCEDURAL_RULES: RuleDefinition[] = [
  {
    id: 'missing_signature_verification',
    category: 'signature_verification',
    severity: 'critical',
    statutoryReference: 'Seera Deemsa Falmii Hariiroo Hawaasaa (SDFHH) Kwt. 92, 93 & 222(2)',
    articleCode: 'SDFHH Kwt. 92/93',
    title: {
      om: 'Mallattoo fi Kakuun Mirkaneessaa Hin Jiru (Missing Signature & Verification Oath)',
      am: 'የፊርማ እና የእውነት ማረጋገጫ ቃለ-መሀላ የለም (Missing Signature & Verification)',
      en: 'Missing Signature Block & Verification Oath (SDFHH Arts. 92 & 93)',
    },
    description: {
      om: 'Iyyatni himataa ykn deebiin kamiyyuu dhuma irratti mallattoo himataa/abukaattoo fi kakuu mirkaneessaa (Verification on Oath) qabaachuu qaba.',
      am: 'ማንኛውም የክስ ወይም የመልስ ማመልከቻ መጨረሻ ላይ የከሳሽ/የጠበቃ ፊርማ እና የእውነት ማረጋገጫ (Verification on Oath) መያዝ አለበት።',
      en: 'Every pleading or court petition must be signed by the party/advocate and contain a statutory verification clause on oath certifying that facts stated are true.',
    },
    rejectionRisk: {
      om: 'Bu\'uura SDFHH Kwt 229 fi 231 tiin himatni mallattoo fi mirkaneessa hin qabne manni murtii akka sirreeffamu deebisa ykn kufaa godha.',
      am: 'በፍትሐብሔር ሥነ-ሥርዓት ሕግ ቁጥር 229 እና 231 መሰረት ፊርማና ማረጋገጫ የሌለው ክስ በፍርድ ቤት ውድቅ ይደረጋል ወይም እንዲስተካከል ይመለሳል።',
      en: 'Under Civil Procedure Code Arts. 229 & 231, pleadings devoid of signature or oath verification are subject to formal rejection and return.',
    },
    suggestedFixSnippet: {
      om: `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MIRKANEESSA FI MALLATTOO (VERIFICATION & SIGNATURE - SDFHH KWT 92 & 93):
Ani maqaan koo olitti kan caqasame himataan/bakka-bu'aan seeraa, qabxiileen himannaa armaan olitti lakkoofsa 1 hanga [...] tti tarreeffaman hundi dhugaa fi yaada qulqulluun kan dhiyaatan ta'uu kakuudhaan mirkaneessa.

Maqaa Himataa/Abukaattoo: __________________________
Mallattoo: _______________________  Guyyaa: ___/___/201...`,
      am: `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
የእውነት ማረጋገጫ እና ፊርማ (VERIFICATION & SIGNATURE - የፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 92 እና 93)፡
እኔ ስሜ ከላይ የተገለጸው ከሳሽ/ሕጋዊ ወኪል፤ ከላይ ከተራ ቁጥር 1 እስከ [...] የተዘረዘሩት የክስ ፍሬ ነገሮች በሙሉ እውነተኛ እና በቅን ልቦና የቀረቡ መሆናቸውን በቃለ-መሀላ አረጋግጣለሁ።

የከሳሽ/የሕግ ጠበቃ ስም፡ __________________________
ፊርማ፡ _______________________  ቀን፡ ___/___/201...`,
      en: `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFICATION & SIGNATURE CLAUSE (Pursuant to Civil Procedure Code Arts. 92 & 93):
I, the undersigned Plaintiff / Duly Authorized Legal Advocate, hereby verify on solemn oath that the factual averments set forth in Paragraphs 1 to [...] above are true and correct to the best of my personal knowledge and belief.

Name of Plaintiff / Counsel: __________________________
Signature: _______________________  Date: ___/___/202...`,
    },
    insertionPosition: 'signature_block',
    checkMissing: (text: string, lowerText: string) => {
      if (text.trim().length < 80) return false;
      const hasSignature =
        lowerText.includes('mallattoo') ||
        lowerText.includes('mirkaneessa') ||
        lowerText.includes('kakuudhaan') ||
        lowerText.includes('ፊርማ') ||
        lowerText.includes('ማረጋገጫ') ||
        lowerText.includes('ቃለ-መሀላ') ||
        lowerText.includes('verification') ||
        lowerText.includes('signature') ||
        lowerText.includes('verified on oath');
      return !hasSignature;
    },
  },
  {
    id: 'missing_service_of_process',
    category: 'service_of_process',
    severity: 'critical',
    statutoryReference: 'SDFHH Kwt. 94, 95, 105 & 222(1)(b) (Service of Summons)',
    articleCode: 'SDFHH Kwt. 94-105',
    title: {
      om: 'Teessoo & Waamicha Himatamaa Hin Qabu (Absence of Service of Process / Summons)',
      am: 'የተከሳሽ አድራሻ እና የመጥሪያ ማድረሻ የለም (Missing Summons & Service of Process)',
      en: 'Absence of Service of Process / Summons Notice (SDFHH Arts. 94-105)',
    },
    description: {
      om: 'Himannaan teessoo guutuu himatamaa (Naannoo, Magaalaa, Aanaa, Ganda, Lakk. Manaa fi Bilbila) fi beellama waamichaa ifatti qabaachuu qaba.',
      am: 'ክሱ የተከሳሽን ሙሉ የመኖሪያ/የስራ አድራሻ (ክልል፣ ከተማ፣ ክፍለ ከተማ/ወረዳ፣ ቀበሌ፣ የቤት ቁጥር፣ ስልክ) እና የመጥሪያ ማድረሻ ሁኔታ በግልጽ ማካተት አለበት።',
      en: 'The pleading must explicitly provide the registered physical address and process service instructions for the defendant to effectuate lawful service of summons.',
    },
    rejectionRisk: {
      om: 'Teessoon ifa hin taane waamichi akka hin geenye godha; kunis bu\'uura SDFHH Kwt 70 fi 222tiin dhimmi akka lafarra harkifatu ykn haqamu sababa ta\'a.',
      am: 'የተሟላ አድራሻ አለመኖር መጥሪያ እንዳይደርስ ያደርጋል፤ ይህም ክሱ እንዲጓተት ወይም በፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 222 እና 70 መሰረት ውድቅ እንዲሆን ምክንያት ይሆናል።',
      en: 'Defective process service address prevents the registrar from issuing summons under Arts. 94 & 105, precipitating rejection or dismissal without prejudice.',
    },
    suggestedFixSnippet: {
      om: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEESSOO WAAMICHAA FI TAJAAJILA BEELLAMAA (SERVICE OF PROCESS PARTICULARS - SDFHH KWT 94 & 222(1)(B)):
1. Teessoo Himatamaa: Naannoo: __________, Magaalaa: __________, Aanaa/K/M: __________, Ganda: __________, Lakk. Manaa: __________, Lakk. Bilbilaa: +251 9________
2. Haala Waamichi Itti Dhiyaatu: Waamichi himannaa fi galmeen ragaa teessoo himatamaa olitti ibsameetti akka qaqqabuuf Manni Murtii ajaja akka nuuf kennu gaafanna.`,
      am: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
የመጥሪያ ማድረሻ እና የተከሳሽ ሙሉ አድራሻ (SERVICE OF SUMMONS PARTICULARS - የፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 94 እና 222(1)(ለ))፡
1. የተከሳሽ አድራሻ፡ ክልል፡ __________፣ ከተማ፡ __________፣ ክ/ከተማ/ወረዳ፡ __________፣ ቀበሌ፡ __________፣ የቤት ቁጥር፡ __________፣ ስልክ ቁጥር፡ +251 9________
2. የመጥሪያ አሰጣጥ ሁኔታ፡ የክስ ማመልከቻውና የሰነድ ማስረጃዎች ከላይ በተጠቀሰው አድራሻ ለተከሳሽ በመጥሪያ አድራሽ እንዲደርስ ክቡር ፍርድ ቤት ትዕዛዝ እንዲሰጥልን እንጠይቃለን።`,
      en: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SERVICE OF SUMMONS & PROCESS PARTICULARS (Pursuant to Civil Procedure Code Arts. 94 & 222(1)(b)):
1. Defendant's Address for Service: Region: __________, City: __________, Sub-City/Woreda: __________, Kebele: __________, House No.: __________, Telephone: +251 9________
2. Mode of Service: The Plaintiff hereby requests that an urgent summons along with copies of the statement of claim and annexures be officially served upon the Defendant at the aforementioned registered address.`,
    },
    insertionPosition: 'top',
    checkMissing: (text: string, lowerText: string) => {
      if (text.trim().length < 80) return false;
      const hasService =
        (lowerText.includes('teessoo') && (lowerText.includes('himatamaa') || lowerText.includes('waamicha'))) ||
        (lowerText.includes('አድራሻ') && (lowerText.includes('ተከሳሽ') || lowerText.includes('መጥሪያ'))) ||
        lowerText.includes('service of process') ||
        lowerText.includes('service of summons') ||
        lowerText.includes('address for service') ||
        lowerText.includes('waamicha') ||
        lowerText.includes('መጥሪያ');
      return !hasService;
    },
  },
  {
    id: 'missing_pecuniary_jurisdiction',
    category: 'pecuniary_jurisdiction',
    severity: 'critical',
    statutoryReference: 'SDFHH Kwt. 6, 222(1)(e) & Labsii 1234/2021',
    articleCode: 'SDFHH Kwt. 6',
    title: {
      om: 'Gatiin Falmii fi Aangoon Maallaqaa Hin Ibsamne (Missing Pecuniary Valuation & Jurisdiction)',
      am: 'የክሱ የገንዘብ መጠንና የፍርድ ቤቱ ስልጣን አልተገለጸም (Pecuniary Jurisdiction Omission)',
      en: 'Missing Pecuniary Valuation & Subject-Matter Jurisdiction (SDFHH Arts. 6 & 222(1)(e))',
    },
    description: {
      om: 'Iyyatni himannaa gatii qabeenyaa falmiif ka\'ee (Pecuniary Value) fi sababa manni murtichi dhimma kana ilaaluuf aangoo qabu ifatti ibsuu qaba.',
      am: 'የክስ አቤቱታው የክርክሩን የገንዘብ መጠን (Pecuniary Value) እና ፍርድ ቤቱ ጉዳዩን ለማየት የሚያስችለውን የስልጣን መነሻ በግልጽ ማመልከት አለበት።',
      en: 'The statement of claim must clearly aver the valuation of the subject-matter in dispute and the statutory grounds conferring pecuniary jurisdiction.',
    },
    rejectionRisk: {
      om: 'Manni murtii aangoo maallaqaa qabaachuu isaa baruuf gatiin yoo hin ibsamin, mormii duraatiin (SDFHH Kwt 244) himatni kufaa ta\'uu danda\'a.',
      am: 'ፍርድ ቤቱ የገንዘብ ስልጣን ያለው መሆኑን ለማረጋገጥ መጠኑ ካልተገለጸ በመጀመሪያ ደረጃ መቃወሚያ (የፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 244) ውድቅ ሊደረግ ይችላል።',
      en: 'Failure to state valuation will trigger preliminary objections under Art. 244 for lack of pecuniary jurisdiction, risking summary dismissal.',
    },
    suggestedFixSnippet: {
      om: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AANGOO MANA MURTII FI MADAALLII MAALLAQAA (JURISDICTION & PECUNIARY VALUATION - SDFHH KWT 6 & 222(1)(E)):
1. Gatiin Dhimma Falmiif Ka'ee: Gatiin qabeenyaa/maallaqa falmii kanaa Birrii ________________ (Birrii ____________________) jedhamee madaalameera.
2. Aangoo Mana Murtii: Bu'uura SDFHH Keeyyata 6 fi Labsii Lakk. 1234/2021 tiin, gatiin falmichi dhiyaateef aangoo maallaqaa fi daangaa lolaa Mana Murtii kanaa keessatti kan kufuu fi dhimmi kun Mana Murtii kanaan ilaalamuuf aangoo guutuu qaba.`,
      am: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
የፍርድ ቤቱ ስልጣን እና የክርክሩ የገንዘብ ዋጋ (JURISDICTION & PECUNIARY VALUATION - የፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 6 እና 222(1)(ሠ))፡
1. የክርክሩ የገንዘብ መጠን፡ የዚህ ክስ የይገባኛል ጥያቄ/የንብረቱ ግምት ብር ________________ (ብር ____________________) ተብሎ ተገምቷል።
2. የፍርድ ቤቱ ስልጣን፡ በፍትሐብሔር ሥነ-ሥርዓት ሕግ ቁጥር 6 እና በአዋጅ ቁጥር 1234/2013 መሰረት ክሱ በቀረበበት የገንዘብ መጠንና የጉዳዩ ባህሪ ይህ ክቡር ፍርድ ቤት ጉዳዩን ለማየት ሙሉ የዳኝነት ስልጣን አለው።`,
      en: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JURISDICTION & PECUNIARY VALUATION CLAUSE (Pursuant to Civil Procedure Code Arts. 6 & 222(1)(e)):
1. Valuation of Subject-Matter: The monetary value of the claim / subject-matter in dispute is valued at ETB ________________ (Ethiopian Birr: ________________________________).
2. Jurisdiction of this Court: Pursuant to Civil Procedure Code Art. 6 and the relevant Federal/Regional Courts Proclamation, this Honorable Court is endowed with both subject-matter and pecuniary jurisdiction to adjudicate this suit.`,
    },
    insertionPosition: 'top',
    checkMissing: (text: string, lowerText: string) => {
      if (text.trim().length < 80) return false;
      const hasJurisdictionValuation =
        (lowerText.includes('aangoo') && (lowerText.includes('maallaqaa') || lowerText.includes('gatii'))) ||
        (lowerText.includes('ስልጣን') && (lowerText.includes('የገንዘብ') || lowerText.includes('ዋጋ') || lowerText.includes('ግምት'))) ||
        lowerText.includes('pecuniary jurisdiction') ||
        lowerText.includes('valuation of') ||
        lowerText.includes('gatii falmii') ||
        lowerText.includes('madaallii maallaqaa');
      return !hasJurisdictionValuation;
    },
  },
  {
    id: 'missing_cause_of_action_date',
    category: 'cause_of_action_date',
    severity: 'warning',
    statutoryReference: 'SDFHH Kwt. 222(1)(d) & Seera Sivilii Kwt. 1845 (Cause of Action Date)',
    articleCode: 'SDFHH Kwt. 222(1)(d)',
    title: {
      om: 'Guyyaan Sababni Himannaa Itti Ka\'e Hin Caqasamne (Missing Cause of Action Accrual Date)',
      am: 'የክሱ ምክንያት የተከሰተበት ትክክለኛ ቀን አልተጠቀሰም (Date of Cause of Action)',
      en: 'Missing Date When Cause of Action Arose (SDFHH Art. 222(1)(d))',
    },
    description: {
      om: 'Dhimmi falmiin irratti ka\'e yoom, guyyaa kam, fi haala kamiin akka dhalate ifatti ibsamuu qaba (Yeroon darbiinsaa akka mirkanaa\'uuf).',
      am: 'ክሱ የተነሳበት ምክንያት የተፈጠረበት ቀን፣ ወር እና ዓመተ-ምህረት በግልጽ መመዝገብ አለበት (የይርጋ ጊዜን ለመወሰን)።',
      en: 'Pleadings must state precisely when and where the cause of action arose to confirm that the suit is instituted within the statutory period of limitation.',
    },
    rejectionRisk: {
      om: 'Guyyaan sababa himannaa yoo hin caqasamne, yeroo darbiinsaan (Limitation of action - SDFHH Kwt 244(2)(c)) mormiin ka\'uu danda\'a.',
      am: 'የክስ ምክንያት የተነሳበት ቀን ካልተገለጸ በይርጋ መቃወሚያ (የፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 244(2)(ሐ)) ምክንያት ውድቅ ሊሆን ይችላል።',
      en: 'Failure to state accrual dates invites preliminary objections grounded in statutory period of limitation (res judicata/limitation).',
    },
    suggestedFixSnippet: {
      om: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GUYYAA FI SABABA HIMANNAAN ITTI DHALATE (CAUSE OF ACTION & ACCRUAL TIMELINE - SDFHH KWT 222(1)(D)):
Sababni himannaa kun itti dhalatee fi falmiin itti ka'e Guyyaa ___/___/201... irraa eegalee yoo ta'u; himatamaan dirqama waliigaltee/seeraa isaa osoo hin raawwatin waan hafeef, himataan mirga seeraa isaa kabachiifachuuf himata kana yeroo seeraan daangeffame keessatti dhiyeesseera.`,
      am: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
የክሱ ምክንያት የተከሰተበት ጊዜ እና ሁኔታ (CAUSE OF ACTION & ACCRUAL TIMELINE - የፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 222(1)(መ))፡
የዚህ ክስ መነሻ ምክንያት የተከሰተውና የሕግ ጥሰቱ የተፈጸመው በቀን ___/___/201... ዓ.ም ሲሆን፤ ተከሳሹ የገባውን የውል/የሕግ ግዴታ ሳይፈጽም በመቅረቱ ከሳሽ ሕጋዊ መብቱን ለማስከበር በይርጋ ጊዜው ውስጥ ክሱን አቅርቧል።`,
      en: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAUSE OF ACTION & DATE OF ACCRUAL (Pursuant to Civil Procedure Code Art. 222(1)(d)):
The cause of action accrued on or about the ___ day of ____________, 202... when the Defendant breached their statutory/contractual obligations. The Plaintiff has timely instituted this suit within the applicable statutory period of limitation.`,
    },
    insertionPosition: 'top',
    checkMissing: (text: string, lowerText: string) => {
      if (text.trim().length < 80) return false;
      const hasCauseDate =
        lowerText.includes('sababni himannaa') ||
        lowerText.includes('cause of action') ||
        lowerText.includes('የክሱ ምክንያት') ||
        lowerText.includes('dhalate') ||
        lowerText.includes('accrued');
      return !hasCauseDate;
    },
  },
  {
    id: 'missing_evidence_witness_schedule',
    category: 'evidence_witness_schedule',
    severity: 'warning',
    statutoryReference: 'SDFHH Kwt. 137, 223 & 246 (Schedule of Evidence)',
    articleCode: 'SDFHH Kwt. 137/223',
    title: {
      om: 'Tarreen Ragaalee fi Ob-kallattii Hin Maxxanamne (Missing Schedule of Evidence & Witnesses)',
      am: 'የሰነድ እና የሰው ማስረጃዎች ዝርዝር አልተያያዘም (Missing List of Evidence & Witnesses)',
      en: 'Missing Schedule of Documentary Evidence & Witness List (SDFHH Arts. 137 & 223)',
    },
    description: {
      om: 'Iyyata himannaa ykn deebii waliin tarreen ragaalee barreeffamaa fi maqaan ragaa baatootaa teessoo isaanii waliin tarreeffamuu qaba.',
      am: 'ከክስ ወይም ከመልስ ጋር የተያያዙ የሰነድ ማስረጃዎች ዝርዝር እና የሰው ምስክሮች ስም ከአድራሻቸው ጋር መዘርዘር አለበት።',
      en: 'The pleading must be accompanied by a structured list of documentary exhibits in possession or custody, alongside witness names and full addresses.',
    },
    rejectionRisk: {
      om: 'SDFHH Keeyyata 137 fi 223 bu\'uureffachuun ragaan kanaan dura hin dhiyaanne dhaddacha irratti dhiyaachuuf carraan isaa cufaadha.',
      am: 'በፍትሐብሔር ሥነ-ሥርዓት ሕግ ቁጥር 137 እና 223 መሰረት አስቀድሞ በዝርዝር ያልቀረበ ማስረጃ በኋላ ላይ ችሎት ለማቅረብ ክልከላ ይገጥመዋል።',
      en: 'Under Civil Procedure Code Arts. 137 & 223, documents or witnesses omitted from the initial pleading schedule are strictly inadmissible at trial without exceptional leave of court.',
    },
    suggestedFixSnippet: {
      om: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TARREE RAGAALEE (SCHEDULE OF EVIDENCE - SDFHH KWT 137 & 223):
A. RAGAALEE BARREEFFAMAA (DOCUMENTARY EVIDENCE):
   1. Waraqaa Waliigaltee/Nagahee Guyyaa ___/___/201... mallatteeffame (Miiltoo 'A').
   2. Xalayaa Akeekkachiisa Seeraa Guyyaa ___/___/201... ergame (Miiltoo 'B').
B. RAGAALEE NAMAA (WITNESS LIST):
   1. Obbo/Aaddee _______________________, Teessoo: Magaalaa ________, Ganda _____, Lakk. Bilbilaa: +251 9________
   2. Obbo/Aaddee _______________________, Teessoo: Magaalaa ________, Ganda _____, Lakk. Bilbilaa: +251 9________`,
      am: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
የማስረጃዎች ዝርዝር ማያያዣ (SCHEDULE OF EVIDENCE - የፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 137 እና 223)፡
ሀ. የሰነድ ማስረጃዎች (DOCUMENTARY EVIDENCE)፡
   1. በቀን ___/___/201... ዓ.ም የተፈረመ የውል/የደረሰኝ ሰነድ (አባሪ 'ሀ')።
   2. በቀን ___/___/201... ዓ.ም የተላከ የሕግ ማስጠንቀቂያ ደብዳቤ (አባሪ 'ለ')።
ለ. የሰው ምስክሮች ዝርዝር (WITNESS LIST)፡
   1. አቶ/ወ/ሮ _______________________፣ አድራሻ፡ ከተማ ________፣ ቀበሌ _____፣ ስልክ ቁጥር፡ +251 9________
   2. አቶ/ወ/ሮ _______________________፣ አድራሻ፡ ከተማ ________፣ ቀበሌ _____፣ ስልክ ቁጥር፡ +251 9________`,
      en: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHEDULE OF EVIDENCE & WITNESSES (Pursuant to Civil Procedure Code Arts. 137 & 223):
A. LIST OF DOCUMENTARY EXHIBITS:
   1. Copy of Agreement / Promissory Note dated ___/___/202... (Annex 'A').
   2. Formal Legal Notice of Default dated ___/___/202... (Annex 'B').
B. LIST OF WITNESSES TO BE SUMMONED:
   1. Ato/W/ro _______________________, Address: City ________, Kebele _____, Phone: +251 9________
   2. Ato/W/ro _______________________, Address: City ________, Kebele _____, Phone: +251 9________`,
    },
    insertionPosition: 'bottom',
    checkMissing: (text: string, lowerText: string) => {
      if (text.trim().length < 80) return false;
      const hasEvidenceSchedule =
        (lowerText.includes('ragaalee') || lowerText.includes('ragaa namaa') || lowerText.includes('ragaa barreeffamaa')) ||
        (lowerText.includes('ማስረጃ') || lowerText.includes('ምስክር') || lowerText.includes('የሰነድ ማስረጃ')) ||
        lowerText.includes('schedule of evidence') ||
        lowerText.includes('witness list') ||
        lowerText.includes('documentary exhibits') ||
        lowerText.includes('miiltoo');
      return !hasEvidenceSchedule;
    },
  },
  {
    id: 'missing_prayer_and_relief',
    category: 'prayer_and_relief',
    severity: 'critical',
    statutoryReference: 'SDFHH Kwt. 224 & 225 (Prayer for Relief)',
    articleCode: 'SDFHH Kwt. 224',
    title: {
      om: 'Kutaan Gaaffii fi Furmaataa (Prayer for Relief) Hin Jiru',
      am: 'የዳኝነት/የውሳኔ መጠየቂያ ክፍል (Prayer for Relief) አልተካተተም',
      en: 'Missing Prayer for Relief / Specific Remedies (SDFHH Arts. 224 & 225)',
    },
    description: {
      om: 'Iyyatni himannaa manni murtichi maal akka murteessu ifatti kan gaafatu (Kaffaltii maallaqaa, dhala seeraa, baasii fi kisaaraa falmii) qabaachuu qaba.',
      am: 'ክሱ ፍርድ ቤቱ ምን እንዲወስንለት እንደሚፈልግ በዝርዝር የያዘ የዳኝነት ጥያቄ (ዋና ገንዘብ፣ የሕግ ወለድ፣ የፍርድ ቤት ኪሳራና ወጪ) መያዝ አለበት።',
      en: 'Every plaint must state specifically the relief which the plaintiff claims, either simply or in the alternative, including interest and litigation costs.',
    },
    rejectionRisk: {
      om: 'Gaaffiin ifa hin taane murtii kennuuf rakkisaa waan ta\'uuf, SDFHH Keeyyata 231(1)(b) tiin iyyatichi akka deebi\'u ykn haqamu godhama.',
      am: 'የተጠየቀው ዳኝነት ግልጽ ካልሆነ ውሳኔ ለመስጠት የማይቻል በመሆኑ በፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 231(1)(ለ) መሰረት ክሱ ይመለሳል።',
      en: 'Pleadings failing to specify distinct prayers will be returned for mandatory amendment or rejected under Art. 231(1)(b).',
    },
    suggestedFixSnippet: {
      om: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KUTAA GAAFFII FI FURMAATAA (PRAYER FOR RELIEF - SDFHH KWT 224 & 225):
Kanaafuu, Manni Murtii Kabajamaan falmii dhiyaate qorachuun murtii armaan gadii akka nuuf kennu cimsinee gaafanna:
1. Himatamaan maallaqa liqii/beenyaa Birrii _______________ (Birrii ____________________) himataaf akka kaffalu;
2. Dhala seeraa dhibbeentaa 9 (9% legal interest) guyyaa himatni dhiyaate irraa eegalee hanga kaffaltiin guutuutti raawwatamutti akka kaffalamu;
3. Baasii fi kisaaraa falmii mana murtii kanaan bahe himatamaa irraa akka nuuf kaffalchiisu murtiin seera qabeessi akka nuuf kennamu gaafanna.`,
      am: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
የዳኝነት ጥያቄ እና ውሳኔ (PRAYER FOR RELIEF - የፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 224 እና 225)፡
ስለሆነም ክቡር ፍርድ ቤት ክሱንና ማስረጃዎችን መርምሮ የሚከተሉትን ውሳኔዎች እንዲሰጥልን በአክብሮት እንጠይቃለን፡
1. ተከሳሹ የዕዳውን/የካሳውን ዋና ገንዘብ ብር _______________ (ብር ____________________) ለከሳሽ በአስቸኳይ እንዲከፍል፤
2. ክሱ ከቀረበበት ቀን ጀምሮ ሙሉ ክፍያው እስኪፈጸም ድረስ ሕጋዊ ወለድ 9% (ዘጠኝ በመቶ) ታስቦ እንዲከፈል፤
3. ለዚህ ክስ የወጣውን የፍርድ ቤት ኪሳራ እና የጠበቃ አበል ተከሳሽ እንዲሸፍን ውሳኔ እንዲሰጥልን እንጠይቃለን።`,
      en: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRAYER FOR RELIEF (Pursuant to Civil Procedure Code Arts. 224 & 225):
WHEREFORE, the Plaintiff respectfully prays that this Honorable Court enter judgment in Plaintiff's favor and against the Defendant as follows:
1. To order the Defendant to pay the principal sum of ETB _______________ (Ethiopian Birr: ________________________);
2. To award statutory post-institution interest at the legal rate of 9% per annum from the date of filing until full satisfaction;
3. To award full litigation costs, court fees, and reasonable attorney's compensation to the Plaintiff.`,
    },
    insertionPosition: 'prayer_section',
    checkMissing: (text: string, lowerText: string) => {
      if (text.trim().length < 80) return false;
      const hasPrayer =
        lowerText.includes('gaaffii fi furmaataa') ||
        lowerText.includes('murtii akka nuuf kennu') ||
        lowerText.includes('prayer for relief') ||
        lowerText.includes('wherefore') ||
        lowerText.includes('የዳኝነት ጥያቄ') ||
        lowerText.includes('እንዲወሰንልን') ||
        lowerText.includes('murtiin akka kennamu') ||
        lowerText.includes('gaafanna');
      return !hasPrayer;
    },
  },
  {
    id: 'missing_court_bench_header',
    category: 'court_bench_designation',
    severity: 'warning',
    statutoryReference: 'SDFHH Kwt. 222(1)(a) (Heading of Pleadings)',
    articleCode: 'SDFHH Kwt. 222(1)(a)',
    title: {
      om: 'Mata-Duree fi Dhaddacha Mana Murtii Hin Qabu (Missing Court Heading)',
      am: 'የፍርድ ቤቱ ስም እና የችሎት ርዕስ የለም (Missing Court & Bench Header)',
      en: 'Missing Pleading Header & Bench Designation (SDFHH Art. 222(1)(a))',
    },
    description: {
      om: 'Sanadichi jalqaba irratti maqaa Mana Murtichaa, Dhaddacha (Civil/Commercial/Labor), fi tarree garee falmitootaa (Himataa fi Himatamaa) of keessatti qabaachuu qaba.',
      am: 'ሰነዱ በመጀመሪያው ገጽ ላይ የፍርድ ቤቱን ስም፣ የችሎቱን ዓይነት (ፍትሐብሔር/ንግድ/የስራ ክርክር) እና የተከራካሪ ወገኖችን ስም በግልጽ ማካተት አለበት።',
      en: 'Pleadings must commence with the formal title of the court, the judicial bench/division, suit number placeholder, and designated parties.',
    },
    rejectionRisk: {
      om: 'Mata-duree seera qabeessa malee iyyatni dhiyaate rejiistiraarii fi daddabarsa galmeetiif rakkisaa ta\'a.',
      am: 'ትክክለኛ የፍርድ ቤት ርዕስ የሌለው ሰነድ በመዝገብ ቤት ለምዝገባና ለችሎት ክፍፍል ችግር ይፈጥራል።',
      en: 'Improperly headed documents risk clerical registration failure and rejection for improper form.',
    },
    suggestedFixSnippet: {
      om: `MANA MURTII __________________________________________
DHADDACHA: _____________________ | LAKK. GALMEE: _____/201...

HIMATAA: ___________________________ (Teessoo: Magaalaa ________, Ganda _____)
HIMATAMAA: _________________________ (Teessoo: Magaalaa ________, Ganda _____)

DHIMMA: IYYATA HIMANNAA (STATEMENT OF CLAIM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`,
      am: `ለ________________________________________ ፍርድ ቤት
ችሎት፡ _____________________ | የመዝገብ ቁጥር፡ _____/201...

ከሳሽ፡ ___________________________ (አድራሻ፡ ከተማ ________፣ ቀበሌ _____)
ተከሳሽ፡ _________________________ (አድራሻ፡ ከተማ ________፣ ቀበሌ _____)

ጉዳዩ፡ የክስ አቤቱታ (STATEMENT OF CLAIM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`,
      en: `IN THE ___________________________________ COURT OF ETHIOPIA
BENCH/DIVISION: _________________ | CIVIL SUIT NO: _____/202...

PLAINTIFF: _________________________ (Address: City ________, Kebele _____)
VERSUS
DEFENDANT: _________________________ (Address: City ________, Kebele _____)

SUBJECT: STATEMENT OF CLAIM / COURT PETITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`,
    },
    insertionPosition: 'top',
    checkMissing: (text: string, lowerText: string) => {
      if (text.trim().length < 80) return false;
      const hasHeader =
        (lowerText.includes('mana murtii') || lowerText.includes('court') || lowerText.includes('ፍርድ ቤት')) &&
        (lowerText.includes('himataa') || lowerText.includes('plaintiff') || lowerText.includes('ከሳሽ'));
      return !hasHeader;
    },
  },
];

/**
 * Perform static/heuristic legal logic & procedural compliance audit
 */
export function auditLegalLogic(
  documentText: string,
  lang: Language = 'om'
): LegalLogicAuditReport {
  const trimmed = documentText.trim();
  const lowerText = trimmed.toLowerCase();

  if (trimmed.length < 30) {
    return {
      overallScore: 0,
      status: 'empty_document',
      totalIssuesCount: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      warnings: [],
      summary: {
        om: 'Sanadni qorannoo seeraatiif dhiyaate duwwaadha. Maaloo barreeffama seeraa galchaa.',
        am: 'ለሕግ ኦዲት የቀረበው ሰነድ ባዶ ነው። እባክዎ የሕግ ሰነድ ጽሑፍ ያስገቡ።',
        en: 'The document provided for procedural logic audit is empty. Please enter or paste legal text.',
      },
      detectedDocumentType: 'Unknown',
      scannedAt: new Date().toISOString(),
    };
  }

  // Detect document archetype
  let detectedType = 'Court Pleading / Petition';
  if (lowerText.includes('waliigaltee') || lowerText.includes('agreement') || lowerText.includes('ውል')) {
    detectedType = 'Contract / Legal Agreement';
  } else if (lowerText.includes('ol-iyyannoo') || lowerText.includes('appeal') || lowerText.includes('ይግባኝ')) {
    detectedType = 'Appellate Memorandum (Iyyata Ol-iyyannoo)';
  } else if (lowerText.includes('mormii duraa') || lowerText.includes('preliminary objection') || lowerText.includes('መጀመሪያ ደረጃ መቃወሚያ')) {
    detectedType = 'Preliminary Objection Pleading';
  } else if (lowerText.includes('bakka-bu\'ummaa') || lowerText.includes('power of attorney') || lowerText.includes('ውክልና')) {
    detectedType = 'Power of Attorney / Agency Authorization';
  }

  const triggeredWarnings: ProceduralWarning[] = [];

  for (const rule of PROCEDURAL_RULES) {
    if (rule.checkMissing(trimmed, lowerText)) {
      triggeredWarnings.push({
        id: rule.id,
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        statutoryReference: rule.statutoryReference,
        articleCode: rule.articleCode,
        description: rule.description,
        rejectionRisk: rule.rejectionRisk,
        suggestedFixSnippet: rule.suggestedFixSnippet,
        insertionPosition: rule.insertionPosition,
        isFixed: false,
      });
    }
  }

  const criticalCount = triggeredWarnings.filter((w) => w.severity === 'critical').length;
  const warningCount = triggeredWarnings.filter((w) => w.severity === 'warning').length;
  const infoCount = triggeredWarnings.filter((w) => w.severity === 'info').length;

  // Calculate score deduction: critical = -25 each, warning = -12 each, info = -5 each
  let score = 100 - (criticalCount * 25 + warningCount * 12 + infoCount * 5);
  if (score < 10) score = 10;
  if (triggeredWarnings.length === 0) score = 100;

  let status: 'court_ready' | 'needs_minor_revision' | 'high_rejection_risk' = 'court_ready';
  if (criticalCount > 0 || score < 60) {
    status = 'high_rejection_risk';
  } else if (warningCount > 0 || score < 90) {
    status = 'needs_minor_revision';
  }

  const summary = {
    om:
      status === 'court_ready'
        ? `Sanadni kun ulaagaalee seera deemsa falmii (SDFHH) guutuu qabaachuun mirkanaa'eera. Qulqullina olaanaa qaba (%${score}).`
        : status === 'needs_minor_revision'
        ? `Sanadichi qabxiilee sirreeffamaa ${triggeredWarnings.length} qaba. Hanqinaalee xixinnoo armaan gadii sirreessuun gara mana murtiitti erguuf qopheessaa (%${score}).`
        : `Akeekkachiisa Cimaa: Sanadni kun ulaagaalee dirqisiisoo SDFHH ${criticalCount} waan dhabeef manni murtii kufaa gochuuf (Rejection) carraa olaanaa qaba (%${score}).`,
    am:
      status === 'court_ready'
        ? `ይህ ሰነድ የፍትሐብሔር ሥነ-ሥርዓት ሕግ (SDFHH) መደበኛ መስፈርቶችን ያሟላ መሆኑ ተረጋግጧል (%${score})።`
        : status === 'needs_minor_revision'
        ? `ሰነዱ ${triggeredWarnings.length} የሚስተካከሉ ክፍተቶች አሉት። ከዚህ በታች ያሉትን ጥቆማዎች በማካተት ሰነዱን ፍጹም ያድርጉ (%${score})።`
        : `ከፍተኛ ማስጠንቀቂያ፡ ሰነዱ ${criticalCount} አስገዳጅ የሥነ-ሥርዓት መስፈርቶችን ባለማሟላቱ በፍርድ ቤት ውድቅ የመሆን ከፍተኛ ዕድል አለው (%${score})።`,
    en:
      status === 'court_ready'
        ? `This document successfully complies with statutory Civil Procedure Code (SDFHH) mandates. Court-ready status achieved (${score}%).`
        : status === 'needs_minor_revision'
        ? `The document has ${triggeredWarnings.length} procedural deficiencies requiring attention prior to court lodgment (${score}%).`
        : `Critical Warning: Document lacks ${criticalCount} essential procedural formalities under SDFHH, risking immediate rejection under Art. 231 (${score}%).`,
  };

  return {
    overallScore: score,
    status,
    totalIssuesCount: triggeredWarnings.length,
    criticalCount,
    warningCount,
    infoCount,
    warnings: triggeredWarnings,
    summary,
    detectedDocumentType: detectedType,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Injects a specific statutory remediation snippet into the document editor at the optimal logical position
 */
export function applyProceduralRemedy(
  currentText: string,
  warning: ProceduralWarning,
  lang: Language = 'om'
): string {
  const snippet = warning.suggestedFixSnippet[lang] || warning.suggestedFixSnippet.om;
  
  if (warning.insertionPosition === 'top') {
    return `${snippet}\n${currentText.trim()}`;
  } else if (warning.insertionPosition === 'prayer_section') {
    // If prayer exists, append before signature; otherwise append before bottom
    return `${currentText.trim()}\n\n${snippet}`;
  } else if (warning.insertionPosition === 'signature_block') {
    return `${currentText.trim()}\n\n${snippet}`;
  } else {
    return `${currentText.trim()}\n\n${snippet}`;
  }
}
