export interface CourtTerminologyItem {
  id: string;
  category: 'proceedings' | 'principles' | 'commercial_property' | 'criminal_constitutional';
  lawRef: {
    om: string;
    am: string;
    en: string;
  };
  title: {
    om: string;
    am: string;
    en: string;
  };
  definition: {
    om: string;
    am: string;
    en: string;
  };
  proceduralSteps?: {
    om: string[];
    am: string[];
    en: string[];
  };
  keywords: string[];
}

export const COURT_TERMINOLOGY_CATALOG: CourtTerminologyItem[] = [
  {
    id: 'filing_claim',
    category: 'proceedings',
    lawRef: {
      om: 'SDFHH Keeyyata 80-95',
      am: 'ፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 80-95',
      en: 'Civil Procedure Code Articles 80-95',
    },
    title: {
      om: 'Iyyannoo / Himannaa (Statement of Claim)',
      am: 'አቤቱታ / ክስ (Statement of Claim)',
      en: 'Statement of Claim & Court Filing',
    },
    definition: {
      om: 'Adeemsa jalqabaa falmiin hariiroo hawaasaa ykn yakkaa itti dhiyaatu. Himataan ykn abukaatuun isaa ulaagaa seeraa guutuun mana murtichaaf iyyannoo barreeffamaa dhiyeessa.',
      am: 'ፍትሐብሔር ወይም የርዕሰ ጉዳይ ክስ የሚቀርብበት የመጀመሪያው የሥነ-ሥርዓት ደረጃ። ከሳሽ ወይም ጠበቃው የሕግ መስፈርቶችን አሟሎ ለፍርድ ቤት ያቀርባል።',
      en: 'The initial formal legal pleading initiating a civil lawsuit or criminal prosecution, detailing the parties, factual cause of action, statutory claims, and requested remedies.',
    },
    keywords: ['filing', 'claim', 'statement of claim', 'himannaa', 'iyyannoo', 'ክስ', 'አቤቱታ'],
  },
  {
    id: 'court_summons',
    category: 'proceedings',
    lawRef: {
      om: 'SDFHH Keeyyata 96-115',
      am: 'ፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 96-115',
      en: 'Civil Procedure Code Articles 96-115',
    },
    title: {
      om: 'Waamicha Mana Murtii (Court Summons)',
      am: 'የፍርድ ቤት መጥሪያ (Court Summons)',
      en: 'Court Summons & Judicial Notice',
    },
    definition: {
      om: 'Ajaja mana murtii irraa kennamuun shakkamaan ykn himatamaan beellama dhaddachaaf akka dhihaatu qajeelfama dirqisiisaa kennu.',
      am: 'ፍርድ ቤቱ ከሳሽ ወይም ተከሳሽ ለቀጠሮ ቀኑ እንዲቀርብ የሚያዘዝበት ኦፊሴላዊ የፍርድ ቤት ትዕዛዝ እና መጥሪያ።',
      en: 'An official judicial order served upon a defendant or respondent notifying them of an active case and commanding their appearance before the bench on a specified date.',
    },
    keywords: ['summons', 'waamicha', 'መጥሪያ', 'notice', 'appearance'],
  },
  {
    id: 'statement_of_defense',
    category: 'proceedings',
    lawRef: {
      om: 'SDFHH Keeyyata 82, 83, 107',
      am: 'ፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 82, 83, 107',
      en: 'Civil Procedure Code Articles 82, 83, 107',
    },
    title: {
      om: 'Deebii Himannaa (Statement of Defense)',
      am: 'የመከላከያ መልስ (Statement of Defense)',
      en: 'Statement of Defense & Pleadings',
    },
    definition: {
      om: 'Himatamaan iyyannoo himannaa dhiyaateef deebii barreeffamaa, mormii seeraa fi ragaa isaa qabatamaan mana murtiif dhiyeessu.',
      am: 'ተከሳሹ የቀረበበትን ክስ በመቃወም ወይም በመቀበል የሚሰጠው የጽሑፍ ማስተባበያ እና የመከላከያ መልስ።',
      en: 'The written formal responsive pleading submitted by a defendant responding to each factual allegation in the statement of claim and raising affirmative defenses.',
    },
    keywords: ['defense', 'deebii', 'የመከላከያ መልስ', 'pleading', 'response'],
  },
  {
    id: 'interlocutory_application',
    category: 'proceedings',
    lawRef: {
      om: 'SDFHH Keeyyata 154-159',
      am: 'ፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 154-159',
      en: 'Civil Procedure Code Articles 154-159',
    },
    title: {
      om: 'Iyyannoo Ceephoo / Yeroo (Interlocutory Application)',
      am: 'የመካከለኛ ጊዜ አቤቱታ (Interlocutory Application)',
      en: 'Interlocutory Motion & Orders',
    },
    definition: {
      om: 'Iyyannoo yeroo falmiin turaatti dhihaatu; kan akka dhorkaa yeroo (injunction), qabeenya qabsiisuu, ykn ragaa saaxiluu irratti ajaja yeroo gaafachuuf dhihaatu.',
      am: 'በክሱ ሂደት ላይ እያለ ጊዜያዊ ዕገዳ፣ የንብረት እገዳ ወይም ማስረጃ እንዲቀርብ የሚጠየቅበት የመካከለኛ ጊዜ ማመልከቻ።',
      en: 'A legal application made to the court during the pendency of a lawsuit seeking a temporary procedural ruling, provisional injunction, or discovery order prior to final judgment.',
    },
    keywords: ['interlocutory', 'motion', 'injunction', 'ceephoo', 'ጊዜያዊ ትዕዛዝ'],
  },
  {
    id: 'evidence_evaluation',
    category: 'proceedings',
    lawRef: {
      om: 'Seera Ragaa Itoophiyaa & SDFHH 136-149',
      am: 'የኢትዮጵያ ማስረጃ ሕግ እና ፍትሐብሔር ሥነ-ሥርዓት 136-149',
      en: 'Ethiopian Evidence Rules & CPC Articles 136-149',
    },
    title: {
      om: 'Ragaa Dhiyeessuu fi Madaallii (Evidence Admissibility)',
      am: 'ማስረጃ ማቅረብ እና ምዘና (Evidence & Testimony)',
      en: 'Evidence Admissibility & Judicial Evaluation',
    },
    definition: {
      om: 'Dhugaan galmee keessatti kaafame akka mirkanaa\'uuf ragaan barreeffamaa, ragaan namaa (witnesses) fi ragaan ogeessaa dhiyaatee madaalama.',
      am: 'በክሱ የተነሱ ፍሬ ነገሮች ለማረጋገጥ የሚቀርቡ የሰነድ፣ የምስክር እና የባለሙያ ማስረጃዎች ተቀባይነትና ምዘና።',
      en: 'The submission and judicial scrutiny of documentary evidence, witness testimony, and expert opinion to establish the veracity of contested material facts.',
    },
    keywords: ['evidence', 'witness', 'ragaa', 'ማስረጃ', 'testimony', 'admissibility'],
  },
  {
    id: 'res_judicata',
    category: 'principles',
    lawRef: {
      om: 'SDFHH Keeyyata 5',
      am: 'ፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 5',
      en: 'Civil Procedure Code Article 5',
    },
    title: {
      om: 'Dhimma Murtii Argate (Res Judicata)',
      am: 'የመጨረሻ ውሳኔ ያገኘ ነገር (Res Judicata)',
      en: 'Res Judicata (Rule Against Relitigation)',
    },
    definition: {
      om: 'Qajeeltoo seeraa dhimmi tokko qaama aangoo qabuun murtii xumuraa argannaan irra deebi\'amee dhaddacha birootti dhiyaachuu akka hin dandeenye dhorku.',
      am: 'አንድ ጉዳይ ስልጣን ባለው ፍርድ ቤት የመጨረሻ ውሳኔ ካገኘ በኋላ እንደገና በድጋሚ እንዳይከሰስ የሚከለክል የሕግ መርህ።',
      en: 'A fundamental doctrine prohibiting the same parties from relitigating a legal claim or cause of action that has already been conclusively adjudicated by a competent court.',
    },
    keywords: ['res judicata', 'murtii argate', 'የተወሰነ ነገር', 'estoppel', 'relitigation'],
  },
  {
    id: 'statute_of_limitations',
    category: 'principles',
    lawRef: {
      om: 'Seera Hariiroo Hawaasaa Keeyyata 1845+',
      am: 'ፍትሐብሔር ሕግ አንቀጽ 1845+',
      en: 'Civil Code Article 1845+',
    },
    title: {
      om: 'Yeroo Darbiinsa (Statute of Limitations / Yirgaa)',
      am: 'የይርጋ ጊዜ (Statute of Limitations / Yirgaa)',
      en: 'Statute of Limitations (Period of Limitation)',
    },
    definition: {
      om: 'Daangaa yeroo seeraan kaa\'ame kan namni tokko mirga isaa mana murtittii itti gaafachuu danda\'u; yeroon sun yoo darbe mirgi itti gaafachuu ni dhabama.',
      am: 'አንድ ሰው መብቱን በፍርድ ቤት ለመጠየቅ በሕግ የተሰጠው የጊዜ ገደብ፤ ጊዜው ካለፈ በኋላ ክሱ በይርጋ ይዘጋል።',
      en: 'The statutory time limit within which a claimant must institute a legal action, failing which the judicial remedy is barred by law.',
    },
    keywords: ['limitation', 'yeroo darbiinsa', 'የይርጋ ጊዜ', 'yirgaa', 'time limit'],
  },
  {
    id: 'burden_of_proof',
    category: 'principles',
    lawRef: {
      om: 'Qajeeltoo Seera Ragaa / Civil Code Art. 2001',
      am: 'የማስረጃ ሕግ መርህ / ፍትሐብሔር ሕግ 2001',
      en: 'Evidence Rule Principles / Civil Code Art. 2001',
    },
    title: {
      om: 'Ba\'aa Mirkaneessuu (Burden of Proof)',
      am: 'የማስረዳት ኃላፊነት (Burden of Proof)',
      en: 'Burden of Proof & Standard of Evidence',
    },
    definition: {
      om: 'Dirqama seeraa qaamni falmii keessatti dhugaa tokko kaase ragaa gahaadhaan amansiisuu qabu; "Qaamni waan tokko kaase mirkaneessuu qaba".',
      am: 'በክርክሩ ወቅት አንድን ፍሬ ነገር ያነሳ ወገን በማስረጃ የማስረዳት የሕግ ግዴታና ኃላፊነት።',
      en: 'The legal duty requiring a party to produce sufficient persuasive evidence to convince the court of the truth of an alleged fact.',
    },
    keywords: ['burden of proof', 'ba\'aa mirkaneessuu', 'የማስረዳት ኃላፊነት', 'proof', 'onus'],
  },
  {
    id: 'judicial_deliberation_verdict',
    category: 'proceedings',
    lawRef: {
      om: 'SDFHH Keeyyata 180-195',
      am: 'ፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 180-195',
      en: 'Civil Procedure Code Articles 180-195',
    },
    title: {
      om: 'Murtii fi Ajaja Xumuraa (Final Judgment & Decree)',
      am: 'የመጨረሻ ውሳኔ እና ትዕዛዝ (Final Judgment & Decree)',
      en: 'Final Judgment, Decree & Verdict',
    },
    definition: {
      om: 'Mana murtichaan dhimma falmii irratti xumura argamsiisuuf murtii barreeffamaa, sababaa seeraa fi ajaja raawwachiisaa waliin dhiyaatu.',
      am: 'ፍርድ ቤቱ ክርክሩን ጨርሶ ከሕግ ምክንያቶች እና ፈጻሚ ትዕዛዞች ጋር የሰጠው የመጨረሻ የፍርድ ውሳኔ።',
      en: 'The formal written adjudication rendered by a judge setting forth the legal analysis, factual findings, and binding decree resolving the dispute.',
    },
    keywords: ['judgment', 'verdict', 'murtii', 'ውሳኔ', 'decree', 'final ruling'],
  },
  {
    id: 'appellate_review',
    category: 'proceedings',
    lawRef: {
      om: 'SDFHH Keeyyata 320-349',
      am: 'ፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 320-349',
      en: 'Civil Procedure Code Articles 320-349',
    },
    title: {
      om: 'Ol-iyyannoo (Appellate Review)',
      am: 'ይግባኝ (Appellate Review)',
      en: 'Appellate Review & Appeal Petition',
    },
    definition: {
      om: 'Murtii mana murtii sadarkaa jalaatiin kenname mormuudhaan dogoggora seeraa ykn dhugaa sirreessisuuf mana murtii ol\'aanaatti dhiyeessuu.',
      am: 'በመጀመሪያ ደረጃ ፍርድ ቤት የተሰጠ ውሳኔ የሕግ ወይም የፍሬ ነገር ስህተት አለበት በማለት ለይግባኝ ሰሚ ፍርድ ቤት ማመልከት።',
      en: 'The formal procedure wherein an aggrieved litigant petitions a higher appellate bench to review, modify, or overturn an erroneous lower court decision.',
    },
    keywords: ['appeal', 'ol-iyyannoo', 'ይግባኝ', 'appellate', 'review'],
  },
  {
    id: 'cassation_precedent',
    category: 'proceedings',
    lawRef: {
      om: 'Labsii FSC Re-establishment No. 1234/2021',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ማቋቋሚያ አዋጅ 1234/2013',
      en: 'Federal Supreme Court Re-establishment Proclamation 1234/2021',
    },
    title: {
      om: 'Dhaddacha Ijibbaataa (Cassation Precedent)',
      am: 'ሰበር ሰሚ ችሎት (Cassation Precedent)',
      en: 'Cassation Precedent Ruling (Stare Decisis)',
    },
    definition: {
      om: 'Murtii dhumaa irratti dogoggorri bu\'uuraa seeraa yoo raawwatame mana murtii waliigalaatiin qoratamee hiika seeraa dirqisiisaa kennamu.',
      am: 'በመጨረሻ ውሳኔዎች ላይ የተፈጸመ መሠረታዊ የሕግ ስህተት ለማረም በጠቅላይ ፍርድ ቤት ሰበር ችሎት የሚሰጥ አስገዳጅ የሕግ ትርጉም።',
      en: 'The highest constitutional and statutory judicial review correcting fundamental errors of law and establishing binding legal precedents for all lower courts.',
    },
    keywords: ['cassation', 'dhaddacha ijoo', 'ሰበር', 'precedent', 'stare decisis'],
  },
  {
    id: 'bail_application',
    category: 'criminal_constitutional',
    lawRef: {
      om: 'Seera Adeemsa Falmii Yakkaa / Heera FDRE Art. 19',
      am: 'የወንጀለኛ መቅጫ ሥነ-ሥርዓት / ሕገ-መንግሥት አንቀጽ 19',
      en: 'Criminal Procedure Code / FDRE Constitution Art. 19',
    },
    title: {
      om: 'Wabii Yakkaa (Bail & Recognizance)',
      am: 'የዋስትና መብት (Bail & Recognizance)',
      en: 'Bail Application & Pre-Trial Release',
    },
    definition: {
      om: 'Mirga heeraa shakkamaan tokko hanga murtiin dhumaa kennamutti maallaqaan ykn namaan wabii dhiyeessuun hidhaa irraa bilisa ta\'ee falmii hordofuu.',
      am: 'ተጠርጣሪው ፍርድ እስኪያገኝ ድረስ በገንዘብ ወይም በሰው ዋስትና ከእስር ተፈትቶ ክርክሩን የመከታተል ሕገ-መንግሥታዊ መብት።',
      en: 'The constitutional right of an accused person to be released from custody pending trial upon providing monetary security or personal sureties guaranteeing court appearance.',
    },
    keywords: ['bail', 'wabii', 'ዋስትና', 'recognizance', 'release'],
  },
  {
    id: 'ex_parte_default_judgment',
    category: 'proceedings',
    lawRef: {
      om: 'SDFHH Keeyyata 70, 192',
      am: 'ፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 70, 192',
      en: 'Civil Procedure Code Articles 70, 192',
    },
    title: {
      om: 'Murtii Sagalee Qaama Tokkoon (Ex-parte & Default Judgment)',
      am: 'በአንድ ወገን የተሰጠ ውሳኔ (Ex-parte & Default Judgment)',
      en: 'Ex-Parte Proceedings & Default Judgment',
    },
    definition: {
      om: 'Himatamaan waamichi mana murtii sirriitti gahee osoo sababa gahaa hin dhiyeessin yoo dhihaachuu dhabe, sagalee himataa qofaan murtii kennamu.',
      am: 'ተከሳሹ መጥሪያ ደርሶት ያለ በቂ ምክንያት ካልቀረበ ፍርድ ቤቱ የከሳሽን አቤቱታ ብቻ በመስማት የሚሰጠው ውሳኔ።',
      en: 'A judgment entered against a party who fails to file an answer or appear in court after being duly served with court summons.',
    },
    keywords: ['ex-parte', 'default judgment', 'sagalee qaama tokkoon', 'በአንድ ወገን የተሰጠ ውሳኔ'],
  },
  {
    id: 'expropriation_compensation',
    category: 'commercial_property',
    lawRef: {
      om: 'Labsii Lafa Fi Qabeenya Fudhatuu Lakk. 1161/2019',
      am: 'የመሬትና ንብረት ወሰዳ አዋጅ ቁጥር 1161/2011',
      en: 'Expropriation Proclamation No. 1161/2019',
    },
    title: {
      om: 'Lafa Faayidaa Uummataaf Fudhatuu fi Beenyaa (Expropriation & Compensation)',
      am: 'ለሕዝብ ጥቅም መሬት መወሰድና ካሳ (Expropriation & Compensation)',
      en: 'Expropriation for Public Interest & Compensation',
    },
    definition: {
      om: "Mootummaan sababa faayidaa uummataatiif lafa fi qabeenya dhuunfaa yeroo fudhatu, beenyaa gahaa fi bakka bu'iinsa qabeenyaa kennuu.",
      am: 'መንግሥት ለሕዝብ ጥቅም ሲል የግል መሬትና ንብረት ሲወስድ የሚከፍለው ተመጣጣኝ ካሳ እና የመልሶ ማቋቋም መብት።',
      en: 'The compulsory acquisition of private landholding or property rights by the state for public interest purposes, triggering mandatory compensation and resettlement benefits.',
    },
    keywords: ['expropriation', 'compensation', 'beenyaa', 'ካሳ', 'land acquisition'],
  },
];
