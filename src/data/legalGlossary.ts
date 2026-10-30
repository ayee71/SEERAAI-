export interface LegalGlossaryEntry {
  id: string;
  category: 'constitutional' | 'labor' | 'commercial' | 'civilCourt';
  om: {
    term: string;
    definition: string;
    usage: string;
  };
  am: {
    term: string;
    definition: string;
    usage: string;
  };
  en: {
    term: string;
    definition: string;
    usage: string;
  };
  sourceReference: string;
}

export const LEGAL_GLOSSARY_DATA: LegalGlossaryEntry[] = [
  {
    id: 'constitution',
    category: 'constitutional',
    om: {
      term: 'Heera Mootummaa',
      definition: 'Seera hundaa ol ta\'ee fi sirna bulchiinsa biyyaa, mirgoota bu\'uuraa lammilee fi qaamolee mootummaa murteessu.',
      usage: 'Heerri Mootummaa FDRE keeyyanni 9 seeronni heera kana waliin wal-faallessan fudhatama akka hin qabne ibsa.',
    },
    am: {
      term: 'ሕገ-መንግሥት',
      definition: 'የሀገሪቱ የበላይ ሕግ ሲሆን የስርዓተ-መንግሥቱን መዋቅር፣ የዜጎችን መሰረታዊ መብቶች እና የመንግሥት ስልጣንን ይደነግጋል።',
      usage: 'በኢ.ፌ.ዲ.ሪ ሕገ-መንግሥት አንቀጽ 9 መሰረት ከሕገ-መንግሥቱ ጋር የሚቃረን ማንኛውም ሕግ ተፈጻሚነት የለውም።',
    },
    en: {
      term: 'Constitution',
      definition: 'The supreme law of the land establishing the framework of government, powers of institutions, and fundamental human and democratic rights.',
      usage: 'Article 9 of the FDRE Constitution establishes the supremacy of the Constitution over any conflicting proclamation or customary practice.',
    },
    sourceReference: 'FDRE Constitution / Labsii Lakk. 1/1987 / Proclamation No. 1/1995',
  },
  {
    id: 'proclamation',
    category: 'constitutional',
    om: {
      term: 'Labsii',
      definition: 'Seera Mana Maree Bakka Bu\'oota Ummataatiin (ykn Caffee Oromiyaatiin) baafamee Gaazeexaa Negaariitaatiin labsamu.',
      usage: 'Labsiin Hojjetaa fi Hojjechiisaa lakk. 1156/2019 mirga hojjettootaa fi hojjechiistotaa murteessa.',
    },
    am: {
      term: 'አዋጅ',
      definition: 'በሕዝብ ተወካዮች ምክር ቤት (ወይም በክልል ምክር ቤት) ወጥቶ በነጋሪት ጋዜጣ ታትሞ የሚወጣ ሕግ።',
      usage: 'የአሰሪና ሰራተኛ አዋጅ ቁጥር 1156/2011 የአሰሪና ሰራተኛን ግንኙነት ይደነግጋል።',
    },
    en: {
      term: 'Proclamation',
      definition: 'Primary legislation enacted by the House of Peoples’ Representatives (or Regional State Councils) and published in the Negarit Gazette.',
      usage: 'Labor Proclamation No. 1156/2019 governs private employment contracts and statutory obligations.',
    },
    sourceReference: 'Federal Negarit Gazette',
  },
  {
    id: 'cassation_precedent',
    category: 'civilCourt',
    om: {
      term: 'Murtii Dhaddacha Dhimmoota Ijoo (Dhaddacha Ijoo)',
      definition: 'Murtii Mana Murtii Waliigalaa Federaalaa Dhaddacha Dhimmoota Ijootti abbootii seeraa shaniin kennamee manneen murtii hundarratti dirqisiisaa ta\'e.',
      usage: 'Murtiiwwan Dhaddacha Ijoo jildii 1 hanga 25tti qophaa\'anii hojiirra oolaa jiru.',
    },
    am: {
      term: 'የሰበር ውሳኔ (ሰበር ሰሚ ችሎት)',
      definition: 'በፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት ቢያንስ በአምስት ዳኞች የሚሰጥ እና በሁሉም ፍርድ ቤቶች ላይ አስገዳጅነት ያለው የሕግ ትርጉም ውሳኔ።',
      usage: 'በአዋጅ ቁጥር 1234/2013 አንቀጽ 10 መሰረት የሰበር ችሎት የሕግ ትርጉም ውሳኔዎች በፌዴራልና በክልል ፍርድ ቤቶች አስገዳጅ ናቸው።',
    },
    en: {
      term: 'Cassation Precedent (Cassation Division Binding Decision)',
      definition: 'A binding legal interpretation rendered by the Federal Supreme Court Cassation Bench (presided over by not less than five judges), binding on all lower federal and regional courts.',
      usage: 'Under Proclamation No. 1234/2021, legal interpretations of the Cassation Division create binding precedent across all courts.',
    },
    sourceReference: 'Federal Supreme Court Proclamation No. 1234/2021 Art. 10',
  },
  {
    id: 'contract',
    category: 'commercial',
    om: {
      term: 'Waliigaltee',
      definition: 'Walii galuu namoota lamaa ykn isaa olii mirgoota seera qabeessa ta\'an uumuuf, geeddaruf ykn dhabamsiisuuf taasifamu.',
      usage: 'Koodii Siiviilii keeyyata 1675 bu\'uura godhachuun waliigalteen seera qabeessi qaamolee gidduutti akka seeraatti hojjeta.',
    },
    am: {
      term: 'ውል (ስምምነት)',
      definition: 'በሁለት ወይም ከሁለት በላይ በሆኑ ሰዎች መካከል የሕግ ግዴታዎችን ለመፍጠር፣ ለመለወጥ ወይም ለማቋረጥ የሚደረግ ሕጋዊ ስምምነት።',
      usage: 'በፍትሐብሔር ሕግ ቁጥር 1675 መሰረት ሕጋዊ ውል በተዋዋዮች መካከል እንደ ሕግ ጸንቶ ይቆጠራል።',
    },
    en: {
      term: 'Contract (Agreement)',
      definition: 'An agreement whereby two or more persons promise to create, vary, or extinguish obligations of a proprietary or legal nature.',
      usage: 'Pursuant to Article 1675 of the Ethiopian Civil Code, a contract lawfully formed has the force of law between the contracting parties.',
    },
    sourceReference: 'Civil Code of 1960 Art. 1675',
  },
  {
    id: 'employment_termination',
    category: 'labor',
    om: {
      term: 'Waliigaltee Hojii Addaan Kutuu',
      definition: 'Sababa seera qabeessaan ykn akeekkachiisaan waliigaltee hojjetaa fi hojjechiisaa gidduu jiru xumuruu.',
      usage: 'Labsii 1156/2019 Keeyyata 27 jalatti sababoonni akeekkachiisa malee hojii irraa ari\'uu dandeessisan tarreeffamaniiru.',
    },
    am: {
      term: 'የስራ ውል ማቋረጥ',
      definition: 'በሕጋዊ ምክንያት ወይም በማስጠንቀቂያ የአሰሪና ሰራተኛን የስራ ውል ሕጋዊ ግንኙነት ማብቃት።',
      usage: 'በአዋጅ ቁጥር 1156/2011 አንቀጽ 27 ስር ያለማስጠንቀቂያ የስራ ውልን ለማቋረጥ የሚያበቁ ጥፋቶች በዝርዝር ተቀምጠዋል።',
    },
    en: {
      term: 'Termination of Employment Contract',
      definition: 'The legal cessation of the employment relationship either with advance notice or summarily for lawful statutory causes.',
      usage: 'Article 27 of Labor Proclamation 1156/2019 lists exhaustive statutory grounds for summary dismissal without prior notice.',
    },
    sourceReference: 'Labor Proclamation No. 1156/2019 Art. 24 - 30',
  },
  {
    id: 'power_of_attorney',
    category: 'civilCourt',
    om: {
      term: 'Bakka-Bu\'ummaa (Waraqaa Bakka-Bu\'ummaa)',
      definition: 'Aangoo bakka-bu\'aa tokkoof kennamee bakka nama biraa bu\'ee dhimmoota seeraa fi qabeenyaa akka raawwatuuf heeyyamu.',
      usage: 'Bakka-bu\'ummaan waliigalaa fi addaa Waajjira Mirkaneessa Sanadootaatti galmaa\'uu qaba.',
    },
    am: {
      term: 'የውክልና ስልጣን (ውክልና)',
      definition: 'አንድ ሰው በሌላ ሰው ስም ሆኖ ሕጋዊ ተግባራትንና የንብረት አያያዝን እንዲፈጽም የሚያስችል የውክልና ሰነድ።',
      usage: 'የውክልና ስልጣን በሰነዶች ማረጋገጫና ምዝገባ ኤጀንሲ ጸድቆ መመዝገብ ይኖርበታል።',
    },
    en: {
      term: 'Power of Attorney (Agency)',
      definition: 'A formal legal instrument authorizing an agent to act on behalf of the principal in legal transactions, litigation, or property administration.',
      usage: 'Special and general powers of attorney must be authenticated and registered before the Document Authentication and Registration Agency (DARA).',
    },
    sourceReference: 'Civil Code Arts. 2199 - 2252',
  },
  {
    id: 'bail_guarantee',
    category: 'civilCourt',
    om: {
      term: 'Wabiilee / Wabii',
      definition: 'Nama himatame ykn qabame tokko hanga murtii dhumaatti qorannoo ykn dhaddacharratti akka dhiyaatu mirkaneessuuf kaffaltii ykn wabii kennamu.',
      usage: 'Heerri Mootummaa FDRE keeyyanni 19(6) himatamaan mirga wabiidhaan gadhiifamuu akka qabu mirkaneessa.',
    },
    am: {
      term: 'ዋስትና',
      definition: 'የተጠረጠረ ወይም የተከሰሰ ሰው የፍርድ ሂደቱ እስኪጠናቀቅ ድረስ በነጻ እንዲቆይና በሚጠራበት ጊዜ እንዲቀርብ የሚሰጥ የገንዘብ ወይም የሰው ዋስትና።',
      usage: 'በሕገ-መንግሥቱ አንቀጽ 19(6) መሰረት ተጠርጣሪዎች በዋስትና የመፈታት ሕገ-መንግሥታዊ መብት አላቸው።',
    },
    en: {
      term: 'Bail / Guarantee',
      definition: 'The temporary release of an accused person awaiting trial, sometimes upon the deposit of a monetary pledge or surety guaranteeing appearance in court.',
      usage: 'Under Article 19(6) of the FDRE Constitution, arrested persons have the fundamental constitutional right to be released on bail except in non-bailable exceptions.',
    },
    sourceReference: 'FDRE Constitution Art. 19(6) & Criminal Procedure Code',
  },
  {
    id: 'commercial_share_company',
    category: 'commercial',
    om: {
      term: 'Aksiyoona / Waldaa Aksiyoonaa',
      definition: 'Waldaa daldalaa kaappitaalli isaa aksiyoona qoodamee fi itti-gaafatamummaan miseensotaa hamma aksiyoona bitataniin daangeffame.',
      usage: 'Koodii Daldalaa haarawa lakk. 1243/2021 keeyyanni 245 waldaa aksiyoonaa hundeessuuf miseensota yoo xiqqaate shan barbaada.',
    },
    am: {
      term: 'አክሲዮን ማህበር',
      definition: 'ካፒታሉ በአክሲዮኖች የተከፋፈለና የባለአክሲዮኖቹ ኃላፊነት ባዋጡት አክሲዮን ልክ ብቻ የተወሰነ የንግድ ማህበር።',
      usage: 'በአዲሱ የንግድ ሕግ አዋጅ ቁጥር 1243/2013 አንቀጽ 245 መሰረት አክሲዮን ማህበርን ለማቋቋም ቢያንስ 5 መስራቾች ያስፈልጋሉ።',
    },
    en: {
      term: 'Share Company (Joint Stock Corporation)',
      definition: 'A commercial business organization whose capital is divided into shares and whose shareholders are liable only to the extent of their share contributions.',
      usage: 'Commercial Code Proclamation No. 1243/2021 Art. 245 requires at least five founding members to incorporate a share company.',
    },
    sourceReference: 'Commercial Code Proclamation No. 1243/2021 Art. 245',
  }
];
