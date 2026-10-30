import { Language } from '../i18n/translations';

export type Jurisdiction = 'oromia' | 'federal';
export type LegislationType = 'proclamation' | 'regulation' | 'directive' | 'cassation_decision';
export type LegalCategory = 
  | 'labor' 
  | 'property_land' 
  | 'civil_contract' 
  | 'commercial_tax' 
  | 'criminal' 
  | 'family' 
  | 'constitutional_admin' 
  | 'procedure_evidence';

export interface LegalEnactment {
  id: string;
  type: LegislationType; // proclamation, regulation, directive, cassation_decision
  jurisdiction: Jurisdiction; // oromia, federal
  number: string; // e.g. "1156/2019", "213/2012", "Dambii 180/2015", "Murtii Vol 18 #18274"
  title: {
    om: string;
    am: string;
    en: string;
  };
  authority: {
    om: string;
    am: string;
    en: string;
  };
  yearEC: number;
  yearGC: number;
  category: LegalCategory;
  summary: {
    om: string;
    am: string;
    en: string;
  };
  fullTextArticles?: {
    articleNumber: string;
    title?: string;
    content: {
      om: string;
      am: string;
      en: string;
    };
  }[];
  keyPrinciples?: {
    om: string;
    am: string;
    en: string;
  };
  status: 'active' | 'amended' | 'repealed';
  amendedBy?: string;
  lastUpdatedDate: string;
  sourceUrl?: string;
  tags: string[];
}

export const OROMIA_AND_FEDERAL_LEGISLATION_DB: LegalEnactment[] = [
  // ==========================================
  // 1. CAFFEE OROMIYAA PROCLAMATIONS (LABSIILEE CAFFEE OROMIYAA)
  // ==========================================
  {
    id: 'oro_proc_242_2014',
    type: 'proclamation',
    jurisdiction: 'oromia',
    number: 'Labsii 242/2014',
    title: {
      om: 'Labsii Bulchiinsa fi Fayyadama Lafaa Magaalaa Oromiyaa Lakk. 242/2014',
      am: 'የኦሮሚያ ከተማ መሬት አስተዳደርና አጠቃቀም አዋጅ ቁጥር 242/2014',
      en: 'Oromia Urban Land Administration and Use Proclamation No. 242/2022',
    },
    authority: {
      om: 'Caffee Oromiyaa',
      am: 'ጨፌ ኦሮሚያ',
      en: 'Caffee Oromia Regional Council',
    },
    yearEC: 2014,
    yearGC: 2022,
    category: 'property_land',
    summary: {
      om: 'Haala qabiyyee lafa magaalaa, liizii lafa magaalaa, kenniinsa mirga fayyadama lafaa, fi seerota iddoo jireenyaa fi invesitimentii Magaala Oromiyaa keessatti ni bulcha.',
      am: 'በኦሮሚያ ከተሞች የመሬት ሊዝ፣ የመሬት አጠቃቀም፣ የመኖሪያና የኢንቨስትመንት መሬት አሰጣጥ ስነ-ስርዓትን የሚደነግግ አዋጅ።',
      en: 'Governs urban land tenure, leasehold systems, allocation of residential and investment plots in Oromia urban centers.',
    },
    fullTextArticles: [
      {
        articleNumber: 'Keeyyata 4',
        title: 'Mirga Fayyadama Lafa Magaalaa',
        content: {
          om: 'Fayyadamni lafa magaalaa kamiyyuu bu\'uura kaffaltii liiziitiin ykn kaffaltii kireetiin raawwatama.',
          am: 'ማንኛውም የከተማ መሬት አጠቃቀም በሊዝ ክፍያ ወይም በኪራይ ክፍያ መሰረት ይፈጸማል።',
          en: 'Urban land holding shall strictly be accessed through tender leasehold or annual land rental contracts.',
        },
      },
      {
        articleNumber: 'Keeyyata 12',
        title: 'Kaffaltii Beenyaa fi Iddoo Qabiyyee Lafa Muka',
        content: {
          om: 'Sodaa faayidaa uummaataatiif lafti yoo gadhiisifamu, beenyaan qabeenyaa fi iddoon bu\'aa kafalamuufii qaba.',
          am: 'ለህዝብ ጥቅም መሬት ሲለቀቅ ተ適ያካሳና תחካይ መሬት መሰጠት አለበት።',
          en: 'Where urban land is expropriated for public interest, fair compensation and substitute land must be provided.',
        },
      },
    ],
    status: 'active',
    lastUpdatedDate: '2026-01-15',
    tags: ['Oromia', 'Caffee', 'Lafa Magaalaa', 'Urban Land', 'Lease', 'Beenyaa'],
  },
  {
    id: 'oro_proc_248_2015',
    type: 'proclamation',
    jurisdiction: 'oromia',
    number: 'Labsii 248/2015',
    title: {
      om: 'Labsii Bulchiinsa fi Fayyadama Lafa Baadiyyaa Naannoo Oromiyaa Lakk. 248/2015 (Kan Hojiirra Jiru)',
      am: 'የኦሮሚያ ክልል የገጠር መሬት አስተዳደርና አጠቃቀም አዋጅ ቁጥር 248/2015 (በሥራ ላይ ያለ)',
      en: 'Oromia Rural Land Administration and Use Proclamation No. 248/2015 (Active Law)',
    },
    authority: {
      om: 'Caffee Oromiyaa',
      am: 'ጨፌ ኦሮሚያ',
      en: 'Caffee Oromia Regional Council',
    },
    yearEC: 2015,
    yearGC: 2023,
    category: 'property_land',
    summary: {
      om: 'Labsii duraanii (130/1999) kan haqee fi sirna bulchiinsa qabiyyee lafa baadiyyaa, kireessuu, dhaaluu, misoomaa fi beenyaa ammayyeessuun kan hojiirra oole.',
      am: 'ቀደም ሲለውን አዋጅ (130/1999) የሻረ እና የገጠር መሬት አጠቃቀም፣ አስተዳደር፣ ውርስና ኪራይ በዘመናዊ መልኩ የሚመራበት በሥራ ላይ ያለ አዋጅ።',
      en: 'Current active rural land administration and use proclamation of Oromia Region superseding repealed Proclamation 130/1999.',
    },
    fullTextArticles: [
      {
        articleNumber: 'Keeyyata 5',
        title: 'Mirga Qabiyyee fi Fayyadama Lafa Baadiyyaa',
        content: {
          om: 'Qonnaan bulaan, horsiisee bulaan ykn gamtaan qonnaan bulaa lafa baadiyyaa irraa mirga fayyadamaa gonfateera.',
          am: 'አርሶ አደር፣ አርብቶ አደር ወይም የገጠር ማህበረሰብ ከገጠር መሬት የመጠቀም መብት አለው።',
          en: 'Farmers, pastoralists and agro-pastoralists possess guaranteed tenure use rights over rural land.',
        },
      },
    ],
    status: 'active',
    lastUpdatedDate: '2026-03-01',
    tags: ['Oromia', 'Lafa Baadiyyaa', 'Rural Land', 'Labsii 248/2015', 'Active'],
  },
  {
    id: 'oro_proc_130_1999',
    type: 'proclamation',
    jurisdiction: 'oromia',
    number: 'Labsii 130/1999 (Haqaameera)',
    title: {
      om: 'Labsii Bulchiinsa fi Fayyadama Lafa Baadiyyaa Naannoo Oromiyaa Lakk. 130/1999 (Kan Haqame - Replaced by 248/2015)',
      am: 'የኦሮሚያ ክልል የገጠር መሬት አስተዳደርና አጠቃቀም አዋጅ ቁጥር 130/1999 (የተሻረ - በ248/2015 ተተክቷል)',
      en: 'Oromia Rural Land Administration and Use Proclamation No. 130/2007 (Repealed - Superseded by 248/2015)',
    },
    authority: {
      om: 'Caffee Oromiyaa',
      am: 'ጨፌ ኦሮሚያ',
      en: 'Caffee Oromia Regional Council',
    },
    yearEC: 1999,
    yearGC: 2007,
    category: 'property_land',
    summary: {
      om: 'Labsii kanaan dura hojiirra ture ta\'us, amma guutummaatti Labsii Lafa Baadiyyaa Naannoo Oromiyaa Lakk. 248/2015 tiin haqameera (Repealed).',
      am: 'ይህ አዋጅ በቀድሞ ጊዜ የነበረ ሲሆን በአሁኑ ወቅት በኦሮሚያ ገጠር መሬት አዋጅ ቁጥር 248/2015 ሙሉ በሙሉ ተሽሯል።',
      en: 'Repealed historical legislation; superseded by Oromia Rural Land Proclamation No. 248/2015.',
    },
    fullTextArticles: [
      {
        articleNumber: 'Keeyyata 6 (Haqaameera)',
        title: 'Mirga Dhaala Lafa Baadiyyaa (Haqaameera)',
        content: {
          om: 'Labsii kanaa fi seera haqame kana hojiirra oolchuun hin danda\'amu; amma Labsii 248/2015 qofatu hojiirra jira.',
          am: 'ይህ አንቀጽ የተሻረ ሲሆን አሁን በሥራ ላይ ያለው አዋጅ ቁጥር 248/2015 ነው።',
          en: 'Repealed provision. Active law is Proclamation No. 248/2015.',
        },
      },
    ],
    status: 'repealed',
    lastUpdatedDate: '2026-03-01',
    tags: ['Caffee', 'Lafa Baadiyyaa', 'Rural Land', 'Repealed', 'Haqameera'],
  },
  {
    id: 'oro_proc_213_2011',
    type: 'proclamation',
    jurisdiction: 'oromia',
    number: 'Labsii 213/2011',
    title: {
      om: 'Labsii Manni Murtii Naannoo Oromiyaa Irra Deebidhaan Gurmeessuuf Bahe Lakk. 213/2011',
      am: 'የኦሮሚያ ክልል ፍርድ ቤቶችን እንደገና ለማደራጀት የወጣ አዋጅ ቁጥር 213/2011',
      en: 'Oromia Re-Organization of Courts Proclamation No. 213/2019',
    },
    authority: {
      om: 'Caffee Oromiyaa',
      am: 'ጨፌ ኦሮሚያ',
      en: 'Caffee Oromia Regional Council',
    },
    yearEC: 2011,
    yearGC: 2019,
    category: 'procedure_evidence',
    summary: {
      om: 'Aangoo fi daangaa abbaa seerummaa Mana Murtii Aanaa, Ol\'aanaa, fi Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa dabalatee irra deebiee gurmeessa.',
      am: 'የወረዳ፣ የከፍተኛ እና የኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ችሎትን የስልጣን ወሰንና አደረጃጀት እንደገና የደነገገ አዋጅ።',
      en: 'Establishes jurisdiction, tiers, and cassation powers for Oromia Regional Courts from Woreda to Regional Supreme Court.',
    },
    status: 'active',
    lastUpdatedDate: '2026-01-20',
    tags: ['Oromia', 'Mana Murtii', 'Courts', 'Dhaddacha Ijibbaataa'],
  },

  // ==========================================
  // 2. OROMIA REGULATIONS & DIRECTIVES (DAMBIILEE FI QAJEELFAMOOTA OROMIYAA)
  // ==========================================
  {
    id: 'oro_reg_210_2013',
    type: 'regulation',
    jurisdiction: 'oromia',
    number: 'Dambii 210/2013',
    title: {
      om: 'Dambii Raawwachiisa Bulchiinsa fi Fayyadama Lafa Baadiyyaa Oromiyaa Lakk. 210/2013',
      am: 'የኦሮሚያ ገጠር መሬት አስተዳደርና አጠቃቀም ማስፈጸሚያ ደንብ ቁጥር 210/2013',
      en: 'Oromia Rural Land Administration Executive Regulation No. 210/2021',
    },
    authority: {
      om: 'Mana Marii Bulchiinsa Mootummaa Naannoo Oromiyaa (Cabinet)',
      am: 'የኦሮሚያ ብሔራዊ ክልላዊ መንግስት ካቢኔ',
      en: 'Oromia Regional Government Cabinet',
    },
    yearEC: 2013,
    yearGC: 2021,
    category: 'property_land',
    summary: {
      om: 'Tarreeffama raawwachiisa kireessa lafa baadiyyaa, waraqaa ragaa mirga qabiyyee qonnaan bulaa, fi daangaa waggoota kireessa lafa waliigaltee qonnaa tuma.',
      am: 'የገጠር መሬት ኪራይ ዘመን፣ የመሬት ደብተር አሰጣጥና የግብርና ኢንቨስትመንት ውል ዝርዝር አፈጻጸም የሚያስረዳ ደንብ።',
      en: 'Details operational procedures for agricultural land lease ceilings, land certificate registration, and dispute resolution.',
    },
    status: 'active',
    lastUpdatedDate: '2026-03-01',
    tags: ['Oromia', 'Dambii', 'Regulation', 'Lafa Baadiyyaa'],
  },
  {
    id: 'oro_dir_05_2015',
    type: 'directive',
    jurisdiction: 'oromia',
    number: 'Qajeelfama 05/2015',
    title: {
      om: 'Qajeelfama Haala Kaffaltii Beenyaa fi Iddoo Qabiyyee Lafa Baadiyyaa fi Magaalaa Biiroo Lafaa Oromiyaa Lakk. 05/2015',
      am: 'የኦሮሚያ መሬት ቢሮ የካሳ ክፍያና ትክ መሬት አሰጣጥ መመሪያ ቁጥር 05/2015',
      en: 'Oromia Land Bureau Expropriation Compensation and Substitute Valuation Directive No. 05/2023',
    },
    authority: {
      om: 'Biiroo Lafaa Oromiyaa',
      am: 'የኦሮሚያ መሬት ቢሮ',
      en: 'Oromia Land Bureau',
    },
    yearEC: 2015,
    yearGC: 2023,
    category: 'property_land',
    summary: {
      om: 'Akkaataa herrega beenyaa biqiltuu, ijaarsa, fi iddoo substitute lafaa magaalaa fi baadiyyaa keessatti shallagamu gadi fageenyaan murteessa.',
      am: 'በከተማና ገጠር የሚነሱ አርሶ አደሮችና ባለይዞታዎች የካሳ ክፍያ ስሌትና የትክ ቦታ አሰጣጥ ስነ-ስርዓት የሚያስረዳ መመሪያ።',
      en: 'Provides exact mathematical calculation formulas for crop compensation, structures, and substitute plot allocation in Oromia.',
    },
    status: 'active',
    lastUpdatedDate: '2026-02-18',
    tags: ['Oromia', 'Qajeelfama', 'Directive', 'Beenyaa', 'Biiroo Lafaa'],
  },

  // ==========================================
  // 3. FDRE PARLIAMENT PROCLAMATIONS (LABSIILEE MANA MARII BAKKA BU'OOTA UUMMATA FEDERAALAA)
  // ==========================================
  {
    id: 'fed_proc_1156_2019',
    type: 'proclamation',
    jurisdiction: 'federal',
    number: 'Labsii 1156/2011',
    title: {
      om: 'Labsii Hojii fi Hojjetaa Federaalaa Lakk. 1156/2011 (2019)',
      am: 'የአሠሪና ሠራተኛ ጉዳይ አዋጅ ቁጥር 1156/2011',
      en: 'Labor Proclamation No. 1156/2019',
    },
    authority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    yearEC: 2011,
    yearGC: 2019,
    category: 'labor',
    summary: {
      om: 'Waliigaltee hojii, mirgaa fi dirqama hojjetaa fi hojjachiisaa, saa\'aatii hojii, boqonnaa, ariisaa hojiirraa seeraan alaaf beenyaa, fi marii waloo (collective bargaining) tuma.',
      am: 'የሥራ ውል፣ የሠራተኛና አሠሪ መብትና ግዴታ፣ ከሥራ ስንብት፣ የካሳ ክፍያ እና የህብረት ስምምነት አፈጻጸም የሚያስረዳ አዋጅ።',
      en: 'Comprehensive Ethiopian Labor code covering employment contracts, unlawful termination remedies, overtime, leave, and collective agreements.',
    },
    fullTextArticles: [
      {
        articleNumber: 'Keeyyata 27',
        title: 'Waliigaltee Hojii Addaan Kutuu (Termination without Notice)',
        content: {
          om: "Hojjachiisaan sababoota gurguddoo akka amanamummaa dhabuu, sa'aatii hojii irratti dhugaatii alkoolii fayyadamuu, ykn qabeenya dhaabbataa irratti miidhaa geessisuutiin beeksisa malee hojjetaa ari'uu ni danda'a.",
          am: 'የአሠሪው ያለማስጠንቀቂያ ውል ለማቋረጥ የሚያስችሉ ምክንያቶች (የእምነት ማጉደል፣ በስራ ሰዓት መጠጥ መጠጣት) የተዘረዘሩበት አንቀጽ።',
          en: 'Outlines valid grounds for summary dismissal without notice for serious fault or misconduct.',
        },
      },
      {
        articleNumber: 'Keeyyata 39',
        title: 'Kaffaltii Severance (Severance Pay)',
        content: {
          om: "Hojjetaan sababa dhaabbanni cufameef ykn ariisaa seeraan alaatiin hojiirraa gaggeeffame kaffaltii beenyaa ji'a 1 hanga ji'a 12 kaffalamuufii qaba.",
          am: 'ያለአግባብ የተሰናበተ ወይም ድርጅት በመዘጋቱ ምክንያት ስራ ያጣ ሠራተኛ የካሳ ክፍያ የማግኘት መብቱን የሚያረጋግጥ።',
          en: 'Entitles qualifying terminated workers to severance pay based on years of continuous service.',
        },
      },
    ],
    status: 'active',
    lastUpdatedDate: '2026-03-10',
    tags: ['Federal', 'Labor', 'Hojjetaa', 'Proclamation 1156', 'FDRE'],
  },
  {
    id: 'fed_proc_1243_2021',
    type: 'proclamation',
    jurisdiction: 'federal',
    number: 'Labsii 1243/2013',
    title: {
      om: 'Labsii Koodii Daldala FDRE Lakk. 1243/2013 (2021 Commercial Code)',
      am: 'የኢፌዴሪ የንግድ ሕግ አዋጅ ቁጥር 1243/2013',
      en: 'FDRE Commercial Code Proclamation No. 1243/2021',
    },
    authority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    yearEC: 2013,
    yearGC: 2021,
    category: 'commercial_tax',
    summary: {
      om: "Koodii daldalaa Itoophiyaa haaraa dhaabbilee daldalaa, waldaa aksiyoonaa (Share Companies), waldaa itti gaafatamummaan isaa daanga'e (PLC), kosiina daldalaa fi honga'ina (bankruptcy) qajeelchu.",
      am: 'የንግድ ድርጅቶች ምስረታ፣ የኃላፊነቱ የተወሰነ የግል ማህበር፣ የክሰራና የመልሶ ማደራጀት ስነ-ስርዓትን የሚመራ አዲሱ የንግድ ህግ።',
      en: 'Modernized commercial code governing business organizations, limited liability companies, corporate governance, and insolvency.',
    },
    status: 'active',
    lastUpdatedDate: '2026-02-28',
    tags: ['Federal', 'Commercial Code', 'Daldala', 'PLC', 'Share Company'],
  },
  {
    id: 'fed_proc_1161_2019',
    type: 'proclamation',
    jurisdiction: 'federal',
    number: 'Labsii 1161/2011',
    title: {
      om: 'Labsii Gadhiisiisa Qabiyyee Lafa Faayidaa Uummaataaf fi Kaffaltii Beenyaa Lakk. 1161/2011',
      am: 'ለህዝብ ጥቅም ሲባል መሬት የሚለቀቅበትና ካሳ የሚከፈልበት አዋጅ ቁጥር 1161/2011',
      en: 'Expropriation of Land Holdings for Public Purpose and Compensation Proclamation No. 1161/2019',
    },
    authority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    yearEC: 2011,
    yearGC: 2019,
    category: 'property_land',
    summary: {
      om: 'Sirna fi ulaagaa lafti magaalaa fi baadiyyaa faayidaa uummaataaf gadhiisifamu, akaakuu beenyaa, fi iddoo qabiyyee substitute kennamu murteessa.',
      am: 'ለህዝብ ጥቅም መሬት የሚነሳበት አሰራር፣ የካሳ ተመን ስሌትና የይዞታ ምትክ አሰጣጥን የሚደነግግ አዋጅ።',
      en: 'Regulates land expropriation procedures, market-value compensation metrics, and substitute land allocation across Ethiopia.',
    },
    status: 'active',
    lastUpdatedDate: '2026-01-25',
    tags: ['Federal', 'Expropriation', 'Beenyaa', 'Compensation', 'Land'],
  },

  // ==========================================
  // 4. FDRE FEDERAL REGULATIONS & DIRECTIVES (DAMBIILEE FI QAJEELFAMOOTA FEDERAALAA)
  // ==========================================
  {
    id: 'fed_reg_472_2020',
    type: 'regulation',
    jurisdiction: 'federal',
    number: 'Dambii 472/2012',
    title: {
      om: 'Dambii Raawwachiisa Expropriation fi Beenyaa Mana Marii Ministirootaa Lakk. 472/2012',
      am: 'የሚኒስትሮች ምክር ቤት የመሬት መነሳትና ካሳ አፈጻጸም ደንብ ቁጥር 472/2012',
      en: 'Council of Ministers Land Expropriation and Compensation Regulation No. 472/2020',
    },
    authority: {
      om: 'Mana Marii Ministirootaa FDRE',
      am: 'የኢፌዴሪ የሚኒስትሮች ምክር ቤት',
      en: 'FDRE Council of Ministers',
    },
    yearEC: 2012,
    yearGC: 2020,
    category: 'property_land',
    summary: {
      om: 'Gatfi beenyaa midhaani, mukkeen, ijaarsa mana fi kireessuu lafaa fi kaffaltii displacement compensation shallagamu tarreessa.',
      am: 'የሰብል፣ የዛፍ፣ የቤትና የመፈናቀያ ካሳ ክፍያ አሰራርን በዝርዝር የሚያስረዳ ደንብ።',
      en: 'Provides exact regulatory guidelines for calculating relocation compensation and property valuation.',
    },
    status: 'active',
    lastUpdatedDate: '2026-02-05',
    tags: ['Federal', 'Dambii', 'Regulation', 'Council of Ministers'],
  },

  // ==========================================
  // 5. CASSATION DECISIONS (MURTIILEE DHADDACHA IJIBBAATAA OROMIYAA FI FEDERAALAA)
  // ==========================================
  {
    id: 'cass_oro_vol18_21049',
    type: 'cassation_decision',
    jurisdiction: 'oromia',
    number: 'Murtii Ijibbaataa Oromiyaa Jildii 18 Lakk. 21049',
    title: {
      om: 'Murtii Ijibbaataa Oromiyaa: Mirga Dhaala Lafa Baadiyyaa fi Waliigaltee Kireessuu (Vol 18 #21049)',
      am: 'የኦሮሚያ ሰበር ውሳኔ፡ የገጠር መሬት ውርስና ኪራይ ውል (ቅጽ 18 ቁጥር 21049)',
      en: 'Oromia Supreme Court Cassation Precedent: Rural Land Inheritance and Lease (Vol 18 #21049)',
    },
    authority: {
      om: 'Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa',
      am: 'የኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Oromia Supreme Court Cassation Division',
    },
    yearEC: 2015,
    yearGC: 2023,
    category: 'property_land',
    summary: {
      om: 'Murtii Dirqisiisaa: Qonnaan bulaan lafa baadiyyaa isaa irratti waliigaltee kireessuu yoo mallatteesse, dhaaltuun isaa waliigaltee sana osoo waggaan kireessaa hin xumuramin diiguu hin danda\'u.',
      am: 'አስገዳጅ የህግ ትርጉም፡ አርሶ አደሩ ያደረገው የገጠር መሬት ኪራይ ውል በህይወት በነበረበት ወቅት የተደረገ ከሆነ፣ ወራሾች የኪራይ ዘመኑ ሳያልቅ ውሉን ማፍረስ አይችሉም።',
      en: 'Binding Precedent: Valid agricultural land lease contracts executed by deceased landholder remain legally binding on heirs until contract duration expires.',
    },
    keyPrinciples: {
      om: 'Dhaaltuun mirgaa fi dirqama abbaa dhaalaa walii galtee seeraan raawwatame dhaala.',
      am: 'ወራሽ የሟችን ህጋዊ ውሎችና ግዴታዎች አብሮ ይወርሳል።',
      en: 'Heirs inherit both assets and valid contractual obligations of the deceased landholder.',
    },
    status: 'active',
    lastUpdatedDate: '2026-03-12',
    tags: ['Cassation', 'Oromia Supreme Court', 'Jildii 18', 'Lafa Baadiyyaa'],
  },
  {
    id: 'cass_fed_vol25_198421',
    type: 'cassation_decision',
    jurisdiction: 'federal',
    number: 'Murtii Ijibbaataa Federaalaa Jildii 25 Lakk. 198421',
    title: {
      om: 'Murtii Ijibbaataa Federaalaa: Ariisaa Hojii fi Severance Pay Koodii Hojjetaa (Vol 25 #198421)',
      am: 'የፌዴራል ሰበር ውሳኔ፡ የአሠሪና ሠራተኛ ስንብትና የካሳ ክፍያ (ቅጽ 25 ቁጥር 198421)',
      en: 'Federal Supreme Court Cassation Precedent: Employment Severance Compensation (Vol 25 #198421)',
    },
    authority: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    yearEC: 2016,
    yearGC: 2024,
    category: 'labor',
    summary: {
      om: "Murtii Dirqisiisaa: Hojjetaan sababa qulqullina hojii dhabuu qofaaf osoo madaalliin raawwii hojii (performance evaluation) barreeffamaan hin raawwatamin ari'amuun seeraan alaa waan ta'eef beenyaan kaffalamuufii qaba.",
      am: 'አስገዳጅ የህግ ትርጉም፡ ያለተጨባጭ የስራ አፈጻጸም ምዘና ሠራተኛን ከስራ ማሰናበት ህገ-ወጥ በመሆኑ ካሳ ያስከፍላል።',
      en: 'Binding Precedent: Dismissing employee for incompetence without documented objective performance evaluations constitutes unlawful termination.',
    },
    keyPrinciples: {
      om: 'Haqummaa fi ulaagaa dhiyeessuu (due process) malee ariisaan raawwatamu seeraan alaa ta\'a.',
      am: 'ያለ በቂ ማስረጃና የሂደት ፍትሃዊነት የተደረገ ስንብት ህገ-ወጥ ነው።',
      en: 'Procedural fairness and written performance documentation are strictly required prior to dismissal for inefficiency.',
    },
    status: 'active',
    lastUpdatedDate: '2026-03-15',
    tags: ['Cassation', 'Federal Supreme Court', 'Jildii 25', 'Labor Law'],
  },
  // ==========================================
  // SEERA ADEEMSA FALMII HARIIROO HAWAASAA (SDFHH)
  // Kan Hiike: Falmataa Daboo Baraatiin (Amboo, Oromiyaa)
  // ==========================================
  {
    id: 'sdfhh_proc_52_1958',
    type: 'proclamation',
    jurisdiction: 'oromia',
    number: 'Labsii 52/1958 (SDFHH)',
    title: {
      om: 'Seera Adeemsa Falmii Hariiroo Hawaasaa (SDFHH) - Hiikkaa Afaan Oromoo Falmataa Daboo Baraatiin',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ (የኦሮምኛ ትርጉም በፋልማታ ዳቦ በራቲን)',
      en: 'Civil Procedure Code of Ethiopia (Afaan Oromoo Statutory Version by Falmata Daboo)',
    },
    authority: {
      om: 'Mootummaa Federaalaa fi Manneen Murtii Oromiyaa / Falmataa Daboo (LL.M, Pireezidaantii Mana Murtii Aanaa)',
      am: 'የፌዴራልና የኦሮሚያ ፍርድ ቤቶች / አዘጋጅ ፋልማታ ዳቦ',
      en: 'Federal & Oromia Judiciary / Official Translation by Falmata Daboo',
    },
    yearEC: 2015,
    yearGC: 2023,
    category: 'procedure_evidence',
    summary: {
      om: 'Kitaaba guutuu seera adeemsa falmii hariiroo hawaasaa (keeyyattoota 1-483 fi sagantaawwan 1-6) kan qophii himannaa, waamicha, ragaalee, dhorkaawwan yeroo, falmii idilee, ol\'iyyannoo, mormii, fi raawwachiisa murtii tartiibaan ibsu.',
      am: 'ሙሉው የፍትሐብሔር ሥነ-ሥርዓት ሕግ (ከአንቀጽ 1-483 እና 6 ሰንጠረዦች) ክስ አጀማመርን፣ መጥሪያን፣ ማስረጃን፣ የእግድ ትዕዛዞችን፣ ይግባኝንና ፍርድ አፈፃፀምን የሚያካትት።',
      en: 'Comprehensive Ethiopian Civil Procedure Code statutory translation into Afaan Oromoo (Arts. 1-483 and Schedules 1-6) covering jurisdiction, pleadings, summons, evidence, interim injunctions, appeals, and execution of decrees.',
    },
    fullTextArticles: [
      {
        articleNumber: 'Keeyyata 4',
        title: 'Seeran yoo dhorkame malee himannaa fuudhuuf aangoo kan qabu mana murtii qofa ta\'uu isaa',
        content: {
          om: 'Tumaaleen keewwattoota kanatti aananii jiran akkuma eegamanitti ta\'ee, manneen murtii seerri ifaan yoo dhorke malee himannaawwan hariiroo hawaasaa hunda fuudhanii ilaaluuf aangoo qabu.',
          am: 'ህጉ በግልጽ ካልከለከላቸው በስተቀር ፍርድ ቤቶች ማንኛውንም የፍትሐብሔር ክስ ተቀብለው የማየት ስልጣን አላቸው።',
          en: 'Courts have general jurisdiction to try all civil suits unless expressly barred.',
        },
      },
      {
        articleNumber: 'Keeyyata 5',
        title: 'Dhimma murtii dhumaa argate (Res Judicata)',
        content: {
          om: 'Manni murtii kamiyyuu himannaa firii dubbii fi hundeen dubbii akaakuu tokko ta\'e, gareewwan walfalmitootaa walfakkaatan gidduutti dhiyaate fuudhee murtii dhumaa erga irratti kenneen booda irra deebiin yoo dhiyeesse ilaaluu hin danda\'an.',
          am: 'ተመሳሳይ ጭብጥና ምክንያት ባለው ክስ በተመሳሳይ ወገኖች መካከል የመጨረሻ ፍርድ የተሰጠበት ጉዳይ በድጋሚ አይታይም።',
          en: 'No court shall try any suit on a matter directly and substantially in issue in a former suit between the same parties.',
        },
      },
      {
        articleNumber: 'Keeyyata 6',
        title: 'Murtii irra deebiin ilaaluu (Review of Judgment / Re-trial / ዳግም ዳኝነት)',
        content: {
          om: 'Tumaaleen Kwt. 5 akkuma eegamanitti ta\'ee, namni kamiyyuu murtii, jala murtii, ykn ajaja ol\'iyyanni irratti dhiyaachuu danda\'u irratti komii dhiyeeffatee osoo hin dhageessifatin dura ykn ol\'iyyannoo dhiyeessuun kan hin danda\'amne kennameef: (a) Murtiin kenname sanada sobaan qophaa\'een, jecha ragummaa sobaatiin, loogiidhaan, yookan gocha yakkaatiin ta\'uu fi iyyataanis murtiin osoo hin kennamin dura carraaqqii taasisee beekuu kan hin dandeenye yoo ta\'e; (b) Gochoonni kunniin osoo beekamaniiru ta\'ee murticha jijjiiruuf sababa gahaa ta\'uu yoo hubachiise, mana murtii murticha kennetti himannaa irra deebiin ilaaluu dhiyeeffachuu ni danda\'a.',
          am: 'የቀድሞ ፍርድ በሀሰተኛ ማስረጃ፣ በሀሰት ምስክርነት፣ በማታለል ወይም በወንጀል ድርጊት የተገኘ መሆኑ ሲረጋገጥ ፍርዱን በድጋሚ እንዲመረመር ለፈረደው ፍርድ ቤት የሚቀርብ የዳግም ዳኝነት ጥያቄ።',
          en: 'Application for review/re-trial of a final judgment to the court that rendered it on strict grounds of newly discovered fraud, perjury, bribery, or criminal acts.',
        },
      },
      {
        articleNumber: 'Keeyyata 16',
        title: 'Aangoo Abbaa Seerummaa hanga maallaqaan murtaa\'an',
        content: {
          om: 'Hangi maallaqaa himannaan irratti dhiyaate boqonnaa kanaan mana murtiif aangoo abbaa seerummaa qoodameen ol yoo ta\'e malee, himannaa fuudhee falmisiisuun kan danda\'amu hanga maallaqaan abbaa seerummaa ilaaluuf mana murtii aangoo qabuudha.',
          am: 'የፍርድ ቤቱ የገንዘብ ስልጣን በክሱ ላይ በተጠየቀው የገንዘብ መጠንና ዋጋ ይወሰናል።',
          en: 'Pecuniary jurisdiction of courts is determined by the amount or value claimed in the statement of claim.',
        },
      },
      {
        articleNumber: 'Keeyyata 78',
        title: 'Himatamaan bakka hin jirretti murtoo kenname kaasuu (Setting Aside Default Decree)',
        content: {
          om: 'Himatamaan tokko falmiirratti dhiyaatee deebii osoo hin kennin bakka inni hin jirretti murtoon yoo kenname, yeroo murtoo kennamuu hubatee irraa kaasee ji\'a 1 (tokko) keessatti dhiyaatee ajajichi ykn murtoon kenname akka ka\'uuf iyyachuu ni danda\'a.',
          am: 'በሌለበት ፍርድ የተሰጠበት ተከሳሽ ፍርዱን ባወቀ በ1 ወር ውስጥ መጥሪያ አልደረሰኝም ወይም በበቂ ምክንያት ቀርቻለሁ በማለት ውሳኔው እንዲነሳ ማመልከት ይችላል።',
          en: 'Defendant against whom ex-parte decree is passed may apply within one month to set it aside on grounds of non-service or sufficient cause for absence.',
        },
      },
      {
        articleNumber: 'Keeyyata 244',
        title: 'Falmii sadarkaa duraa irratti mormiiwwan dhiyaatan (Preliminary Objections)',
        content: {
          om: 'Manni murtii ragaa fuudhee qorachuu dura mormiiwwan sadarkaa duraa garee walfalmitootaan dhiyaatan irratti murtoo kennuu qaba: (a) Aangoo dhabuu; (b) Dhimmi murtaa\'uu isaa (Res Judicata); (c) Dhimmi falmiirra jiraachuu (Lis Pendens); (d) Garee sirrii hin taane; (e) Mirgi himannaa seeraan dhabamuu; (f) Darbiinsa yeroo (Limitation); (g) Araara/Jaarsummaa.',
          am: 'የመጀመሪያ ደረጃ መቃወሚያዎች፡ የስልጣን ማጣት፣ ቀደም ሲል የተወሰነ (Res Judicata)፣ በሌላ ችሎት ያለ (Lis Pendens)፣ ህጋዊ ችሎታ ወይም መብት ማጣት፣ የይርጋ ክልከላ፣ የግልግል/እርቅ ስምምነት።',
          en: 'Preliminary objections to be heard and decided at first hearing before trial on merits.',
        },
      },
      {
        articleNumber: 'Keeyyata 320',
        title: 'Haala ol\'iyyannoon itti eeyyamamu (Appealable Decisions)',
        content: {
          om: 'Dhaddacha hariiroo hawaasaatiin murtii dhumaa kenname irratti ol\'iyyannoo gaafachuu ni danda\'a. Ajaja yeroof kennamu (interlocutory order) irratti murtiin dura ol\'iyyannoo jechuun hin danda\'amu.',
          am: 'ይግባኝ የሚባለው በመጨረሻ ፍርድ ላይ ብቻ ነው፤ ከመጨረሻ ፍርድ በፊት በሚሰጡ መካከለኛ ትዕዛዞች ላይ ለብቻቸው ይግባኝ አይባልም።',
          en: 'Appeals lie from final judgments only; interlocutory orders are not appealable until final decree.',
        },
      },
      {
        articleNumber: 'Keeyyata 358',
        title: 'Gareewwan mormii dhiyeessuu danda\'an (Third-Party Opposition to Judgment)',
        content: {
          om: 'Namni falmii keessatti hin hirmaannen murtii kennameen mirgi isaa tuqame murtiin kenname osoo hin raawwatamin dura mormii isaa dhiyeeffachuu ni danda\'a.',
          am: 'በክሱ ውስጥ ያልተሳተፈ ነገር ግን በተሰጠው ፍርድ መብቱ የተነካበት ሶስተኛ ወገን ፍርዱ ከመፈጸሙ በፊት የፍርድ መቃወሚያ ማቅረብ ይችላል።',
          en: 'Any person who was not a party or represented in the suit and whose rights are prejudiced by the decree may file opposition before execution.',
        },
      },
      {
        articleNumber: 'Keeyyata 404',
        title: 'Qabeenya hin kabajamnee fi sababa raawwiif hin fudhamne (Exempt Property)',
        content: {
          om: 'Qabeenyonni kabachiisan hin qabamne: (a) Uffata guyyaa guyyaa, meeshaa nyaataa, siree ciisichaa; (b) Mi\'oota hojii ogummaatiif tajaajilan; (c) Horii gaanfaa fi sanyii qotee bulaa; (d) Nyaata fi maallaqa ji\'a sadii; (e) Maallaqa sooramaa fi qallaba; (f) Mindaa ji\'aa 2/3.',
          am: 'ሊታገዱ የማይችሉ ንብረቶች፡ የዕለት ልብስ፣ የወጥ ቤት ዕቃዎች፣ አልጋ፣ የሙያ መገልገያ መሣሪያዎች፣ የገበሬ የዕርሻ በሬና ዘር፣ የ3 ወር ቀለብ፣ ጡረታ፣ የቀለብ አበል፣ ከደመወዝ 2/3።',
          en: 'Statutory exemption of essential personal wearing apparel, cooking vessels, bed, tools of artisans, agricultural implements/seed grain, pension, maintenance.',
        },
      },
    ],
    status: 'active',
    lastUpdatedDate: '2026-03-20',
    tags: ['SDFHH', 'Seera Adeemsa Falmii Hariiroo Hawaasaa', 'Civil Procedure Code', 'Amboo', 'Falmataa Daboo', 'Court Rules'],
  },
  {
    id: 'fed_proc_1410_2018',
    type: 'proclamation',
    jurisdiction: 'federal',
    number: 'Labsii 1410/2018',
    title: {
      om: 'Seera Adeemsa Falmii Yakkaa fi Seera Ragaa Lakk. 1410/2018',
      am: 'የወንጀለኛ መቅጫ ሥነ-ሥርዓትና ማስረጃ ሕግ ቁጥር 1410/2018',
      en: 'Criminal Procedure and Evidence Proclamation No. 1410/2026',
    },
    authority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    yearEC: 2018,
    yearGC: 2026,
    category: 'criminal',
    summary: {
      om: 'Seerri haaraan deemsa falmii yakkaa fi sirna ragaa Nagaarit Gazeta irratti bahe.',
      am: 'በነጋሪት ጋዜጣ የታተመው አዲሱ የወንጀለኛ መቅጫ ሥነ-ሥርዓትና ማስረጃ ሕግ።',
      en: 'New criminal procedure and evidence legislation published in Nagarit Gazeta.',
    },
    fullTextArticles: [
      {
        articleNumber: 'Keewwata 1',
        title: 'Mata-duree Gabaabaa',
        content: {
          om: 'Labsiin Kun "Seera Adeemsa Falmii Yakkaa fi Seera Ragaa 1410/2018" jedhamee waamamuu ni danda\'a.',
          am: 'ይህ አዋጅ "የወንጀለኛ መቅጫ ሥነ-ሥርዓትና ማስረጃ ሕግ ቁጥር 1410/2018" ተብሎ ሊጠቀስ ይችላል።',
          en: 'This Proclamation may be cited as the "Criminal Procedure and Evidence Proclamation No. 1410/2026".',
        },
      },
      {
        articleNumber: 'Keewwata 3',
        title: 'Kaayyoo',
        content: {
          om: 'Kaayyoon seera kanaa adeemsa haqaa yakkaa keessatti dhugaa baasuu, itti gaafatamummaa yakkaa mirkaneessuu fi olaantummaa seeraa kabachiisuu dha.',
          am: 'የዚህ አዋጅ ዓላማ በወንጀል ፍትሕ ሥርዓት ውስጥ እውነትን ማረጋገጥ፣ የወንጀል ተጠያቂነትን ማረጋገጥና የሕግ የበላይነትን ማስከበር ነው።',
          en: 'The purpose of this proclamation is to establish truth in the criminal justice system, ensure criminal accountability, and uphold the rule of law.',
        },
      },
    ],
    status: 'active',
    lastUpdatedDate: '2026-10-19',
    tags: ['Federal', 'Criminal Procedure', 'Evidence', 'Nagarit Gazeta', 'Labsii 1410/2018'],
  },
  {
    id: 'fed_proc_1324_2024',
    type: 'proclamation',
    jurisdiction: 'federal',
    number: 'Labsii 1324/2016',
    title: {
      om: 'Labsii Bulchiinsa fi Fayyadama Lafa Baadiyyaa Federaalaa Lakk. 1324/2016',
      am: 'የፌዴራል የገጠር መሬት አስተዳደርና አጠቃቀም አዋጅ ቁጥር 1324/2016',
      en: 'Federal Rural Land Administration and Use Proclamation No. 1324/2024',
    },
    authority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    yearEC: 2016,
    yearGC: 2024,
    category: 'property_land',
    summary: {
      om: 'Labsii haaraa qonnaan bulaa fi horsiisee bulaaf mirga qabiyyee mirkaneessu, mirga kireessuu fi dhaalaa, akkasumas bulchiinsa lafa baadiyyaa ammayyeessuuf bahe dha.',
      am: 'የአርሶ አደርና አርብቶ አደር የይዞታ መብትን የሚያረጋግጥ፣ የመሬት ኪራይና ውርስን የሚደነግግ አዲሱ የገጠር መሬት አዋጅ።',
      en: 'New federal legislation governing rural land tenure, leasing, inheritance, and modern administration systems for farmers and pastoralists.',
    },
    status: 'active',
    lastUpdatedDate: '2026-10-24',
    tags: ['Federal', 'Rural Land', 'Lafa Baadiyyaa', 'Labsii 1324/2024'],
  },
  {
    id: 'fed_proc_1360_2025',
    type: 'proclamation',
    jurisdiction: 'federal',
    number: 'Labsii 1360/2017',
    title: {
      om: 'Labsii Hojii Baankii (Fooyya\'aa) Lakk. 1360/2017',
      am: 'የባንክ ሥራ (ማሻሻያ) አዋጅ ቁጥር 1360/2017',
      en: 'Banking Business (Amendment) Proclamation No. 1360/2025',
    },
    authority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    yearEC: 2017,
    yearGC: 2025,
    category: 'commercial_tax',
    summary: {
      om: 'Baankonni biyya alaa Itoophiyaa keessatti akka hojjetan eeyyamu, baankii dijitaalaa, fi sirna to\'annoo baankii ammayyeessuuf kan bahe dha.',
      am: 'የውጭ ባንኮች በኢትዮጵያ እንዲሳተፉ የሚፈቅድ፣ የዲጂታል ባንክና የቁጥጥር ስርዓትን የሚያዘምን አዋጅ።',
      en: 'Landmark legislation allowing foreign bank entry, regulating digital banking, and enhancing the financial sector supervisory framework.',
    },
    status: 'active',
    lastUpdatedDate: '2026-10-24',
    tags: ['Federal', 'Banking', 'Digital Banking', 'Foreign Banks', 'Finance'],
  },
  {
    id: 'fed_proc_1321_2024',
    type: 'proclamation',
    jurisdiction: 'federal',
    number: 'Labsii 1321/2016',
    title: {
      om: 'Labsii Eegumsa Daataa Dhuunfaa Lakk. 1321/2016',
      am: 'የግል መረጃ ጥበቃ አዋጅ ቁጥር 1321/2016',
      en: 'Personal Data Protection Proclamation No. 1321/2024',
    },
    authority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    yearEC: 2016,
    yearGC: 2024,
    category: 'constitutional_admin',
    summary: {
      om: 'Odeeffannoo dhuunfaa namootaa sassaabuu, kuusuu fi fayyadamuu irratti daangaa kaa\'uun mirga dhuunfaa eegsisuuf bahe dha.',
      am: 'የሰዎችን የግል መረጃ አሰባሰብ፣ አጠቃቀምና ጥበቃን የሚደነግግ የመጀመሪያው የግል መረጃ ጥበቃ አዋጅ።',
      en: 'Ethiopia\'s first comprehensive data privacy law governing the collection, processing, and storage of personal information.',
    },
    status: 'active',
    lastUpdatedDate: '2026-10-24',
    tags: ['Federal', 'Data Protection', 'Privacy', 'Technology', 'Digital Rights'],
  },
  {
    id: 'fed_proc_1320_2024',
    type: 'proclamation',
    jurisdiction: 'federal',
    number: 'Labsii 1320/2016',
    title: {
      om: 'Labsii To\'annoo Kiraa Mana Jireenyaa fi Daldalaa Lakk. 1320/2016',
      am: 'የመኖሪያና የንግድ ቤት ኪራይ ቁጥጥርና አስተዳደር አዋጅ ቁጥር 1320/2016',
      en: 'Residential and Commercial Rent Control Proclamation No. 1320/2024',
    },
    authority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    yearEC: 2016,
    yearGC: 2024,
    category: 'property_land',
    summary: {
      om: 'Daballii kiraa mana jireenyaa fi daldalaa to\'achuu, mirga kireessaa fi kireeffataa kabachiisuuf bahe dha.',
      am: 'የመኖሪያና የንግድ ቤት ኪራይ ጭማሪን የሚቆጣጠርና የተከራይና አከራይን መብት የሚያስከብር አዋጅ።',
      en: 'Regulates rent increases for residential and commercial properties and defines the rights and duties of landlords and tenants.',
    },
    status: 'active',
    lastUpdatedDate: '2026-10-24',
    tags: ['Federal', 'Rent Control', 'Kiraa', 'Property', 'Housing'],
  },
  {
    id: 'fed_proc_1389_2025',
    type: 'proclamation',
    jurisdiction: 'federal',
    number: 'Labsii 1389/2017',
    title: {
      om: 'Labsii Hojii Idil-addunyaa (Overseas Employment) Lakk. 1389/2017',
      am: 'የውጭ አገር ሥራ ስምሪት አዋጅ ቁጥር 1389/2017',
      en: 'Overseas Employment Proclamation No. 1389/2025',
    },
    authority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    yearEC: 2017,
    yearGC: 2025,
    category: 'labor',
    summary: {
      om: 'Mirga hojjettoota Itoophiyaa biyya alaa deeman eeguu, ejensiiwwan hojii fiduu to\'achuu fi hojii seeraan alaa ittisuuf kan bahe dha.',
      am: 'ወደ ውጭ አገር ሄደው የሚሰሩ ኢትዮጵያውያንን መብት ለማስጠበቅ፣ የሥራ አገናኝ ኤጀንሲዎችን ለመቆጣጠርና ሕገ-ወጥ የሰዎች ዝውውርን ለመከላከል የወጣ አዋጅ።',
      en: 'Comprehensive framework to protect the rights of Ethiopian migrant workers, regulate private employment agencies, and combat illegal recruitment.',
    },
    status: 'active',
    lastUpdatedDate: '2026-10-24',
    tags: ['Federal', 'Labor', 'Overseas Employment', 'Migrant Workers', 'Human Rights'],
  }
];



