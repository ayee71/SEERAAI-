export interface LegalFaqItem {
  id: string;
  category: 'cassation' | 'land_property' | 'labor' | 'family' | 'criminal' | 'constitutional' | 'procedure';
  categoryLabel: {
    om: string;
    am: string;
    en: string;
  };
  question: {
    om: string;
    am: string;
    en: string;
  };
  answer: {
    om: string;
    am: string;
    en: string;
  };
  statuteReference: string; // e.g., "Labsii 1156/2011 Art. 27", "Heera RDFI Art. 40", "Murtii Ijibbaataa Lakk. 214539"
  telegramPostUrl?: string; // e.g. "https://t.me/seeraai_ethio/125"
  fileNumber?: string;
  tags: string[];
}

export const LEGAL_FAQ_DATA: LegalFaqItem[] = [
  {
    id: 'faq-125-cassation-binding',
    category: 'cassation',
    categoryLabel: {
      om: 'Murtii Ijibbaataa & Precedent',
      am: 'የሰበር ውሳኔና አስገዳጅ ህግ',
      en: 'Cassation & Binding Precedents'
    },
    question: {
      om: 'Murtii Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Federaalaa hiikkoo seeraa kenne manni murtii naannoo dirqamaan hordofuu qabaa?',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት የሰጠው የህግ ትርጓሜ በክልል ፍርድ ቤቶች ላይ አስገዳጅነት አለው?',
      en: 'Is the legal interpretation rendered by the Federal Supreme Court Cassation Division binding on regional courts?'
    },
    answer: {
      om: 'Eeyyee, bu\'uura Labsii Mana Murtii Federaalaa Lakk. 1234/2013 fi Heera RDFI tiin, hiikkoon seeraa dirqisiisaan Dhaddacha Ijibbaataa MMWF tiin dhimma seeraa irratti kenne manneen murtii Federaalaa fi Naannoo sadarkaa hunda irratti argaman hundaaf dirqisiisaadha.',
      am: 'አዎ፣ በፌዴራል ፍርድ ቤቶች አዋጅ ቁጥር 1234/2013 እና በሕገ-መንግስቱ መሠረት በሰበር ሰሚ ችሎት የተሰጠ አስገዳጅ የሕግ ትርጓሜ በሁሉም የፌዴራልና የክልል ፍርድ ቤቶች ላይ አስገዳጅነት አለው።',
      en: 'Yes, pursuant to Federal Courts Proclamation No. 1234/2013, a binding legal interpretation rendered by the Federal Supreme Court Cassation Bench is legally binding on all federal and regional courts.'
    },
    statuteReference: 'Labsii 1234/2013 Art. 10(2) / Heera RDFI',
    telegramPostUrl: 'https://t.me/seeraai_ethio/125',
    fileNumber: '125',
    tags: ['Cassation', 'Binding Precedent', 'Ijibbaata', 'Labsii 1234']
  },
  {
    id: 'faq-126-labor-termination',
    category: 'labor',
    categoryLabel: {
      om: 'Seera Hojjataa fi Hojjechiisaa',
      am: 'የአሰሪና ሰራተኛ ህግ',
      en: 'Labor & Employment Law'
    },
    question: {
      om: 'Hojjechiisaan akeekkachiisa malee waliigaltee hojii dhaabuu kan danda\'u sababoota kamiin?',
      am: 'አሰሪው ያለማስጠንቀቂያ የሥራ ውል ማቋረጥ የሚችለው በምክንያቶች ነው?',
      en: 'Under what conditions can an employer terminate an employment contract without notice?'
    },
    answer: {
      om: 'Bu\'uura Labsii Hojjataa fi Hojjechiisaa Lakk. 1156/2011 Keeyyata 27 tiin, hojjataan badii ulfaataa kanneen akka sammii/soba dhiyeessuu, qabeenya dhaabbataa haqa malee balleessuu, machaa\'ee hojiitti dhiyaachuu fi kkf raawwate akeekkachiisa malee ari\'amuu danda\'a.',
      am: 'በአሰሪና ሰራተኛ አዋጅ ቁጥር 1156/2011 አንቀጽ 27 መሠረት፣ ሰራተኛው ከባድ ጥፋት (ለምሳሌ የማታለል ሰነድ ማቅረብ፣ የድርጅቱን ንብረት ማጥፋት፣ በስካር መገኘት) ሲፈጽም ያለማስጠንቀቂያ ሊሰናበት ይችላል።',
      en: 'Under Labor Proclamation No. 1156/2011 Article 27, an employer may terminate employment without notice for grave offenses including deceit, intentional destruction of company property, or intoxication at work.'
    },
    statuteReference: 'Labsii Hojjataa Lakk. 1156/2011 Art. 27',
    telegramPostUrl: 'https://t.me/seeraai_ethio/126',
    fileNumber: '126',
    tags: ['Labor Law', 'Termination', 'Hojjataa', 'Labsii 1156']
  },
  {
    id: 'faq-127-land-ownership',
    category: 'land_property',
    categoryLabel: {
      om: 'Seera Lafa fi Qabeenyaa',
      am: 'የመሬትና ንብረት ህግ',
      en: 'Land & Property Law'
    },
    question: {
      om: 'Mirgi qabiyyee lafa baadiyaa fi magaalaa gurguramuun ykn qabsiifamuun ni danda\'amaa?',
      am: 'የገጠርና የከተማ የመሬት ይዞታ መሸጥ ወይም በዋስትና ማስያዝ ይቻላል?',
      en: 'Can rural or urban land possessory rights be sold or mortgaged?'
    },
    answer: {
      om: 'Bu\'uura Heera RDFI Keeyyata 40(3) tiin lafti qabeenya uummata fi mootummaati; gurguruun ykn jijjiirraan kan dhorgameedha. Haa ta\'u malee, qabiyyee lafa magaalaa qabaatamu mirga kireeffannaa/liizii (leasehold right) fi qabeenya lafa irratti ijaarame qabsiisuun ykn kireessuun ni danda\'ama.',
      am: 'በህገ-መንግስቱ አንቀጽ 40(3) መሠረት መሬት የህዝብና የመንግስት ንብረት በመሆኑ መሸጥ ወይም መለወጥ አይቻልም። ነገር ግን በከተማ መሬት ላይ ያለው የሊዝ መብትና ግንባታ በዋስትና ሊያዝ ወይም ሊከራይ ይችላል።',
      en: 'Under FDRE Constitution Article 40(3), land belongs strictly to the state and public; direct sale is prohibited. However, leasehold rights and immovable property constructed on land can be mortgaged or leased.'
    },
    statuteReference: 'Heera RDFI Art. 40(3) / Labsii Liizii Lakk. 721/2011',
    telegramPostUrl: 'https://t.me/seeraai_ethio/127',
    fileNumber: '127',
    tags: ['Land Law', 'Property Rights', 'Liizii', 'Lafa']
  },
  {
    id: 'faq-128-family-divorce',
    category: 'family',
    categoryLabel: {
      om: 'Seera Maatii fi Dhaala',
      am: 'የቤተሰብና ውርስ ህግ',
      en: 'Family & Inheritance Law'
    },
    question: {
      om: 'Waliigaltee fuudhaa fi heerumaa diiguuf ulaagaaleen seeraa fi qooda qabeenya maatii maali?',
      am: 'ጋብቻን ለማፍረስ እና የቤተሰብ ንብረትን ለማካፈል የህግ መስፈርቶች ምንድን ናቸው?',
      en: 'What are the legal requirements for dissolving a marriage and dividing marital property?'
    },
    answer: {
      om: 'Bu\'uura Seera Maatii Naannoo Oromiyaa (Labsii 83/1996) fi Seera Maatii Caffee Federaalaatiin, diiggaa fuudhaa fi heerumaa irratti qabeenyi waliinii gidduutti qulqullaa\'ee qixxee (50/50) qoodama. Qabeenyi dhuunfaa fuudhaa fi heerumaan dura argame qabeenya dhuunfaa ta\'ee taha.',
      am: 'በኦሮሚያ ክልል የቤተሰብ ህግ (አዋጅ 83/1996) መሠረት በጋብቻ ዘመን የተፈራ ንብረት በሁለቱም መካከል እኩል (50/50) ይከፋፈላል። ከጋብቻ በፊት የተገኘ ንብረት የግል ንብረት ሆኖ ይቆያል።',
      en: 'Under the Revised Family Code, marital property acquired during marriage is partitioned equally (50/50) upon divorce, while property acquired prior to marriage remains separate personal property.'
    },
    statuteReference: 'Seera Maatii Oromiyaa Labsii 83/1996 Art. 85-110',
    telegramPostUrl: 'https://t.me/seeraai_ethio/128',
    fileNumber: '128',
    tags: ['Family Law', 'Divorce', 'Maatii', 'Fuudhaa fi Heeruma']
  },
  {
    id: 'faq-129-criminal-bail',
    category: 'criminal',
    categoryLabel: {
      om: 'Seera Yakkaa fi Ragaa',
      am: 'የወንጀልና ማስረጃ ህግ',
      en: 'Criminal & Evidence Law'
    },
    question: {
      om: 'Mirgi wabii (bail right) shakkamaa yakkaan qabamee eessatti dhorkamuu danda\'a?',
      am: 'የተጠርጣሪ የዋስትና መብት በሕግ የሚከለከለው መቼ ነው?',
      en: 'Under what legal circumstances can a suspect’s right to bail be denied?'
    },
    answer: {
      om: 'Bu\'uura Seera Adeemsa Falmii Yakkaa Art. 63 fi Heera RDFI Art. 19(6) tiin, mirgi wabii heeraan kan mirkanaa\'edha. Haa ta\'u malee, yakka ajjeechaa cimsamee, yakka shororkeessummaa, yakka gubbaa fi yakka hidhaa waggaa 15 ol adabsiisu irratti mannneen murtii wabii dhorkuu danda\'u.',
      am: 'በወንጀለኛ መቅጫ ሥነ-ሥርዓት ህግ አንቀጽ 63 እና በሕገ-መንግስቱ አንቀጽ 19(6) መሠረት የዋስትና መብት የተከበረ ነው። ሆኖም በከባድ ግድያ፣ በሽብርተኝነት እና ከ15 ዓመት በላይ በሚያስቀጣ ወንጀል ላይ ዋስትና ሊከለከል ይችላል።',
      en: 'Under Criminal Procedure Code Art. 63 and FDRE Constitution Art. 19(6), bail is a constitutional right but may be denied for offenses carrying over 15 years imprisonment, aggravated homicide, or terrorism offenses.'
    },
    statuteReference: 'Heera RDFI Art. 19(6) / S.A.F.Y. Art. 63',
    telegramPostUrl: 'https://t.me/seeraai_ethio/129',
    fileNumber: '129',
    tags: ['Criminal Law', 'Bail Right', 'Mirga Wabii', 'Yakkaa']
  },
  {
    id: 'faq-130-statute-limitation',
    category: 'procedure',
    categoryLabel: {
      om: 'Seera Adeemsa Falmii',
      am: 'የሥነ-ሥርዓት ህግ',
      en: 'Procedural Law & Limitations'
    },
    question: {
      om: 'Darbiinsa yeroo (statute of limitation) falmii hariiroo hawaasaa fi yakkaa irratti sa\'aatiin akkarniti shallagama?',
      am: 'በፍትሐብሔርና በወንጀል ጉዳዮች ላይ የእርጅና ዘመን (statute of limitations) እንዴት ይሰላል?',
      en: 'How is the statute of limitations calculated in civil and criminal proceedings?'
    },
    answer: {
      om: 'Seera Hariiroo Hawaasaa Art. 1845 tiin darbiinsi yeroo waliigalaa waggaa 10 yoo ta\'u, waliigaltee kireeffannaa fi kaffaltii yeroo dhihoo irratti waggaa 2-3 taha. Seera Yakkaa Art. 217 tiin yakka salphaa irratti waggaa 2-5, yakka ulfaataa irratti waggaa 10-20 taha.',
      am: 'በፍትሐብሔር ህግ አንቀጽ 1845 መሠረት ጠቅላላ የእርጅና ዘመን 10 ዓመት ነው። በወንጀል ህግ አንቀጽ 217 መሠረት ቀላል ወንጀሎች 2-5 ዓመት፣ ከባድ ወንጀሎች 10-20 ዓመት የእርጅና ዘመን አላቸው።',
      en: 'Under Civil Code Art. 1845, the general limitation period is 10 years. Under Criminal Code Art. 217, simple offenses prescribe in 2–5 years while serious crimes prescribe in 10–20 years.'
    },
    statuteReference: 'Seera Hariiroo Hawaasaa Art. 1845 / Seera Yakkaa Art. 217',
    telegramPostUrl: 'https://t.me/seeraai_ethio/130',
    fileNumber: '130',
    tags: ['Statute of Limitation', 'Procedure', 'Darbiinsa Yeroo']
  }
];
