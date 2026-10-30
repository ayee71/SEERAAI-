import { Language } from '../i18n/translations';

export interface CitationSuggestion {
  id: string;
  category: 'proclamation' | 'civil_code' | 'commercial_code' | 'constitution' | 'cassation' | 'family' | 'criminal';
  categoryLabel: { om: string; am: string; en: string };
  badgeEmoji: string;
  title: { om: string; am: string; en: string };
  insertText: string;
  context: { om: string; am: string; en: string };
  keywords: string[];
}

export const LEGAL_CITATIONS_DATABASE: CitationSuggestion[] = [
  {
    id: 'labor_proc_1156',
    category: 'proclamation',
    categoryLabel: { om: 'Labsii Hojjetaa', am: 'የአሰሪና ሰራተኛ አዋጅ', en: 'Labor Law' },
    badgeEmoji: '👷',
    title: {
      om: 'Labsii Hojjetaa fi Hojjechiisaa Lakk. 1156/2019',
      am: 'የአሰሪና ሰራተኛ ጉዳይ አዋጅ ቁጥር 1156/2011',
      en: 'Labor Proclamation No. 1156/2019',
    },
    insertText: 'Labsii Lakk. 1156/2019',
    context: {
      om: 'Waliigaltee hojii, yeroo yaalii, mirga hojjettootaa, fi kaffaltii addaan kutuu murteessa.',
      am: 'የስራ ውል፣ የሙከራ ጊዜ፣ የሰራተኞች መብትና የስንብት ክፍያዎችን ይደነግጋል።',
      en: 'Governs employment contracts, probation, worker rights, and severance pay.',
    },
    keywords: ['1156', 'hojii', 'hojjetaa', 'hojjechiisaa', 'labor', 'employment', 'worker', 'employer', '1156/2019', '1156/2011', 'ስራ', 'ሰራተኛ', 'አሰሪ'],
  },
  {
    id: 'labor_art_27',
    category: 'proclamation',
    categoryLabel: { om: 'Labsii 1156 K.27', am: 'አዋጅ 1156 አንቀጽ 27', en: 'Labor Art. 27' },
    badgeEmoji: '🚨',
    title: {
      om: 'Labsii 1156/2019 Keeyyata 27 (Akeekkachiisa Malee Ari\'uu)',
      am: 'አዋጅ 1156/2011 አንቀጽ 27 (ያለማስጠንቀቂያ ውል ማቋረጥ)',
      en: 'Labor Proclamation 1156/2019 Art. 27 (Summary Dismissal)',
    },
    insertText: 'Labsii 1156/2019 Keeyyata 27',
    context: {
      om: 'Badii cimaa hojjetaan raawwateen akeekkachiisa malee hojiirraa gaggeessuu.',
      am: 'ሰራተኛው በሚፈፅመው ከባድ ጥፋት ምክንያት ያለማስጠንቀቂያ ስራ ማቋረጥ።',
      en: 'Immediate termination without notice for grave worker misconduct.',
    },
    keywords: ['27', 'akeekkachiisa', 'ari\'uu', 'dismissal', 'misconduct', 'termination', 'summary', 'አንቀጽ 27', 'ስንብት'],
  },
  {
    id: 'labor_art_39',
    category: 'proclamation',
    categoryLabel: { om: 'Labsii 1156 K.39', am: 'አዋጅ 1156 አንቀጽ 39', en: 'Labor Art. 39' },
    badgeEmoji: '💰',
    title: {
      om: 'Labsii 1156/2019 Keeyyata 39 (Beenyaa Kaffaltii Addaan Kutuu)',
      am: 'አዋጅ 1156/2011 አንቀጽ 39 (የስንብት ክፍያ - Severance Pay)',
      en: 'Labor Proclamation 1156/2019 Art. 39 (Severance Benefit)',
    },
    insertText: 'Labsii 1156/2019 Keeyyata 39',
    context: {
      om: 'Haala fi herrega kaffaltii beenyaa hojjetaa hojiirraa gaggeeffamee.',
      am: 'ስራ ለለቀቀ ሰራተኛ የሚከፈል የስንብት ክፍያ ስሌትና መስፈርቶች።',
      en: 'Calculation and entitlement criteria for statutory severance pay.',
    },
    keywords: ['39', 'beenyaa', 'severance', 'kaffaltii', 'compensation', 'አንቀጽ 39', 'ካሳ', 'ክፍያ'],
  },
  {
    id: 'civil_art_1723',
    category: 'civil_code',
    categoryLabel: { om: 'Koodii Siivilii K.1723', am: 'ፍትሐብሔር አንቀጽ 1723', en: 'Civil Code Art. 1723' },
    badgeEmoji: '📜',
    title: {
      om: 'Koodii Siivilii Keeyyata 1723 (Mirkaneessa Sanada Qabeenyaa)',
      am: 'የፍትሐብሔር ሕግ አንቀጽ 1723 (የማይንቀሳቀስ ንብረት ውል ምዝገባ)',
      en: 'Civil Code Article 1723 (Authentication of Immovable Sales)',
    },
    insertText: 'Koodii Siivilii Keeyyata 1723',
    context: {
      om: 'Waliigalteen manaa fi lafaa DARA duratti galmaa\'uu dirqama.',
      am: 'የቤትና መሬት ውል በሰነዶች ማረጋገጫ (DARA) መመዝገብ አለበት።',
      en: 'Contracts concerning immovable property must be notarized at DARA.',
    },
    keywords: ['1723', 'mana', 'lafa', 'dara', 'immovable', 'property', 'registration', 'notary', 'ፍትሐብሔር 1723', 'ምዝገባ'],
  },
  {
    id: 'civil_art_1675',
    category: 'civil_code',
    categoryLabel: { om: 'Koodii Siivilii K.1675', am: 'ፍትሐብሔር አንቀጽ 1675', en: 'Civil Code Art. 1675' },
    badgeEmoji: '🤝',
    title: {
      om: 'Koodii Siivilii Keeyyata 1675 (Hiika Waliigaltee / Definition of Contract)',
      am: 'የፍትሐብሔር ሕግ አንቀጽ 1675 (የውል ትርጓሜ)',
      en: 'Civil Code Article 1675 (Definition & Formation of Contract)',
    },
    insertText: 'Koodii Siivilii Keeyyata 1675',
    context: {
      om: 'Hiika waliigaltee fi fedhii namoota lama ykn isaa olitiin dirqama uumuu.',
      am: 'በሁለት ወይም ከዚያ በላይ በሆኑ ወገኖች መካከል የሚደረግ ሕጋዊ ውል ትርጓሜ።',
      en: 'Defines a contract as an agreement creating, modifying, or extinguishing obligations.',
    },
    keywords: ['1675', 'waliigaltee', 'contract', 'obligation', 'agreement', 'ፍትሐብሔር 1675', 'ውል'],
  },
  {
    id: 'civil_art_2896',
    category: 'civil_code',
    categoryLabel: { om: 'Koodii Siivilii K.2896', am: 'ፍትሐብሔർ አንቀጽ 2896', en: 'Civil Code Art. 2896' },
    badgeEmoji: '🏡',
    title: {
      om: 'Koodii Siivilii Keeyyata 2896 (Waliigaltee Kireeffannaa Manaa)',
      am: 'የፍትሐብሔር ሕግ አንቀጽ 2896 (የቤት ኪራይ ውል)',
      en: 'Civil Code Article 2896 (Lease of Immovable / Building)',
    },
    insertText: 'Koodii Siivilii Keeyyata 2896',
    context: {
      om: 'Mirgootaa fi dirqamoota kireessaa fi kireeffataa manaa.',
      am: 'የቤት አከራይና ተከራይ መብትና ግዴታዎችን የሚገዛ ሕግ።',
      en: 'Landlord and tenant rights, rent payment, and lease termination rules.',
    },
    keywords: ['2896', 'kireeffannaa', 'kireessaa', 'lease', 'rent', 'landlord', 'tenant', 'ፍትሐብሔር 2896', 'ኪራይ'],
  },
  {
    id: 'constitution_art_40',
    category: 'constitution',
    categoryLabel: { om: 'Heera FDRE K.40', am: 'ሕገ-መንግሥት አንቀጽ 40', en: 'Constitution Art. 40' },
    badgeEmoji: '🏛️',
    title: {
      om: 'Heera Mootummaa FDRE Keeyyata 40 (Mirga Abbaa Qabeenyummaa)',
      am: 'የኢ.ፌ.ዲ.ሪ ሕገ-መንግሥት አንቀጽ 40 (የንብረት ባለቤትነት መብት)',
      en: 'FDRE Constitution Article 40 (Property & Land Rights)',
    },
    insertText: 'Heera Mootummaa Keeyyata 40',
    context: {
      om: 'Lafni kan ummataa fi mootummaa ta\'uu, fi beenyaa madaalawaa argachuu.',
      am: 'መሬት የሕዝብና የመንግሥት መሆኑንና የተመጣጣኝ ካሳ መብትን ያረጋግጣል።',
      en: 'Public ownership of land and constitutional guarantee for property compensation.',
    },
    keywords: ['40', 'heera', 'constitution', 'lafa', 'land', 'property', 'compensation', 'ሕገ-መንግሥት 40', 'ንብረት'],
  },
  {
    id: 'commercial_proc_1243',
    category: 'commercial_code',
    categoryLabel: { om: 'Koodii Daldalaa 1243', am: 'የንግድ ሕግ 1243', en: 'Commercial Code 1243' },
    badgeEmoji: '💼',
    title: {
      om: 'Koodii Daldalaa Haarawa Lakk. 1243/2021',
      am: 'የንግድ ሕግ አዋጅ ቁጥር 1243/2013',
      en: 'Commercial Code Proclamation No. 1243/2021',
    },
    insertText: 'Koodii Daldalaa Lakk. 1243/2021',
    context: {
      om: 'Waldaalee aksiyoonaa, dhaabbilee daldalaa, fi hojimaata baankii.',
      am: 'የአክሲዮን ማህበራትን፣ የንግድ ድርጅቶችንና የባንክ ግብይቶችን ይደነግጋል።',
      en: 'Governs business companies, partnerships, share companies, and banking.',
    },
    keywords: ['1243', 'daldala', 'commercial', 'company', 'share', 'aksiyoona', '1243/2021', 'ንግድ', 'ማህበር'],
  },
  {
    id: 'land_lease_721',
    category: 'proclamation',
    categoryLabel: { om: 'Labsii Lafa Magaalaa 721', am: 'የከተማ መሬት ሊዝ አዋጅ 721', en: 'Urban Land Lease 721' },
    badgeEmoji: '🏗️',
    title: {
      om: 'Labsii Liizii Lafa Magaalaa Lakk. 721/2011',
      am: 'የከተማ መሬት ሊዝ አዋጅ ቁጥር 721/2004',
      en: 'Urban Land Lease Proclamation No. 721/2011',
    },
    insertText: 'Labsii Lakk. 721/2011',
    context: {
      om: 'Liizii lafa magaalaa, dhiheessa mo\'aatoo, fi dabarsa qabiyyee.',
      am: 'የከተማ መሬት በሊዝ ጨረታ የሚሰጥበትንና የሚተላለፍበትን ሁኔታ ይደነግጋል።',
      en: 'Governs urban land acquisition, lease tenders, and title transfer.',
    },
    keywords: ['721', 'liizii', 'lease', 'magaalaa', 'urban', 'land', '721/2011', '721/2004', 'ሊዝ'],
  },
  {
    id: 'tax_proc_979',
    category: 'proclamation',
    categoryLabel: { om: 'Labsii Gibiraa 979', am: 'የገቢ ግብር አዋጅ 979', en: 'Income Tax 979' },
    badgeEmoji: '📊',
    title: {
      om: 'Labsii Gibira Galii Lakk. 979/2016',
      am: 'የገቢ ግብር አዋጅ ቁጥር 979/2008',
      en: 'Income Tax Proclamation No. 979/2016',
    },
    insertText: 'Labsii Lakk. 979/2016',
    context: {
      om: 'Gibira galii hojjetaa, daldalaa, fi adabbii kaffaltii tursiisuu.',
      am: 'የሰራተኞችና የንግድ ድርጅቶች ገቢ ግብር ስሌትና መመሪያ።',
      en: 'Employment and business income tax computation and compliance penalties.',
    },
    keywords: ['979', 'gibira', 'tax', 'income', 'galii', '979/2016', '979/2008', 'ግብር'],
  },
  {
    id: 'family_code_213',
    category: 'family',
    categoryLabel: { om: 'Seera Maatii 213', am: 'የቤተሰብ ሕግ 213', en: 'Family Code 213' },
    badgeEmoji: '👨‍👩‍👧',
    title: {
      om: 'Labsii Seera Maatii Haarome Lakk. 213/2000',
      am: 'የተሻሻለው የቤተሰብ ሕግ አዋጅ ቁጥር 213/1992',
      en: 'Revised Family Code Proclamation No. 213/2000',
    },
    insertText: 'Labsii Lakk. 213/2000',
    context: {
      om: 'Waliigaltee fuudhaa, qabeenya dhuunfaa fi waliinii, fi qoodinsa dhaalaa.',
      am: 'የጋብቻ ውል፣ የጋራና የግል ንብረት ክፍፍልን ይደነግጋል።',
      en: 'Governs marriage, marital property division, divorce, and inheritance.',
    },
    keywords: ['213', 'maatii', 'family', 'fuudha', 'marriage', 'dhaala', '213/2000', 'ቤተሰብ', 'ጋብቻ'],
  },
  {
    id: 'criminal_code_414',
    category: 'criminal',
    categoryLabel: { om: 'Koodii Yakka 414', am: 'የወንጀል ሕግ 414', en: 'Criminal Code 414' },
    badgeEmoji: '⚖️',
    title: {
      om: 'Koodii Yakkata Itoophiyaa Lakk. 414/1996',
      am: 'የኢፌዴሪ የወንጀል ሕግ አዋጅ ቁጥር 414/1996',
      en: 'Criminal Code Proclamation No. 414/2004',
    },
    insertText: 'Koodii Yakkata Lakk. 414/1996',
    context: {
      om: 'Yakkoota daldalaa, gammachuun hatuu (K.692), fi amana maqa\'uu.',
      am: 'የማታለል ወንጀል (አንቀጽ 692) እና የእምነት ማጎደል ወንጀሎችን ይደነግጋል።',
      en: 'Criminal offenses, fraud (Art. 692), breach of trust, and financial crimes.',
    },
    keywords: ['414', 'yakka', 'criminal', 'fraud', 'gammachuu', '414/1996', '414/2004', 'ወንጀል', 'ማታለል'],
  },
  {
    id: 'cassation_file_18431',
    category: 'cassation',
    categoryLabel: { om: 'Dhaddacha Ijoo Lakk. 18431', am: 'ሰበር መዝገብ 18431', en: 'Cassation File 18431' },
    badgeEmoji: '🏛️',
    title: {
      om: 'Murtii Dhaddacha Ijoo Lakk. Galmee 18431 (Mirkaneessa DARA)',
      am: 'የፌደራል ሰበር ውሳኔ መዝገብ ቁጥር 18431 (የDARA ምዝገባ)',
      en: 'Cassation Precedent File No. 18431 (DARA Authentication Binding Ruling)',
    },
    insertText: 'Murtii Dhaddacha Ijoo Lakk. Galmee 18431',
    context: {
      om: 'Waliigalteen manaa DARA duratti galmaa\'uu baannaan dirqama seeraa hin uumu.',
      am: 'ያልተመዘገበ የቤት ውል ፍርድ ቤት አያስገድድም።',
      en: 'Binding precedent confirming unnotarized property sales create no enforceable title.',
    },
    keywords: ['18431', 'galmee 18431', 'murtii 18431', 'cassation 18431', '18431', 'ሰበር 18431'],
  },
  {
    id: 'cassation_file_21450',
    category: 'cassation',
    categoryLabel: { om: 'Dhaddacha Ijoo Lakk. 21450', am: 'ሰበር መዝገብ 21450', en: 'Cassation File 21450' },
    badgeEmoji: '🏛️',
    title: {
      om: 'Murtii Dhaddacha Ijoo Lakk. Galmee 21450 (Akeekkachiisa Hojii)',
      am: 'የፌደራል ሰበር ውሳኔ መዝገብ ቁጥር 21450 (የስራ ማስጠንቀቂያ)',
      en: 'Cassation Precedent File No. 21450 (Labor Probation Notice Period)',
    },
    insertText: 'Murtii Dhaddacha Ijoo Lakk. Galmee 21450',
    context: {
      om: 'Yeroo yaalii keessatti hojjetaan akeekkachiisa malee gaggeeffamuu ni danda\'a.',
      am: 'በሙከራ ጊዜ ውስጥ ያለማስጠንቀቂያ ስራ ማቋረጥ ይቻላል።',
      en: 'Binding precedent validating notice-free dismissal during probation.',
    },
    keywords: ['21450', 'galmee 21450', 'murtii 21450', 'cassation 21450', '21450', 'ሰበር 21450'],
  },
  {
    id: 'cassation_file_35600',
    category: 'cassation',
    categoryLabel: { om: 'Dhaddacha Ijoo Lakk. 35600', am: 'ሰበር መዝገብ 35600', en: 'Cassation File 35600' },
    badgeEmoji: '🏛️',
    title: {
      om: 'Murtii Dhaddacha Ijoo Lakk. Galmee 35600 (Qabeenya Maatii)',
      am: 'የፌደራል ሰበር ውሳኔ መዝገብ ቁጥር 35600 (የባልና ሚስት የጋራ ንብረት)',
      en: 'Cassation Precedent File No. 35600 (Joint Marital Property Rights)',
    },
    insertText: 'Murtii Dhaddacha Ijoo Lakk. Galmee 35600',
    context: {
      om: 'Qabeenyi yeroo fuudhaa argame kan waliinii ta\'uun shallagama.',
      am: 'በጋብቻ ወቅት የተፈራ ንብረት የጋራ ተደርጎ ይገመታል።',
      en: 'Presumption of joint ownership for property acquired during wedlock.',
    },
    keywords: ['35600', 'galmee 35600', 'murtii 35600', 'cassation 35600', '35600', 'ሰበር 35600'],
  },
];

export function getLegalCitationSuggestions(
  query: string,
  limit: number = 6
): CitationSuggestion[] {
  if (!query || typeof query !== 'string') return LEGAL_CITATIONS_DATABASE.slice(0, limit);

  const cleanQuery = query.trim().toLowerCase();
  if (cleanQuery.length === 0) return LEGAL_CITATIONS_DATABASE.slice(0, limit);

  const words = cleanQuery.split(/\s+/).filter((w) => w.length >= 1);

  const scoredList = LEGAL_CITATIONS_DATABASE.map((item) => {
    let score = 0;

    // Check exact matches on numbers or keywords
    for (const kw of item.keywords) {
      const lowerKw = kw.toLowerCase();
      if (cleanQuery.includes(lowerKw)) {
        score += 10;
      }
      for (const word of words) {
        if (lowerKw.startsWith(word) || word.startsWith(lowerKw)) {
          score += 5;
        }
      }
    }

    // Check title matches in all languages
    const fullTitleStr = (item.title.om + ' ' + item.title.am + ' ' + item.title.en).toLowerCase();
    for (const word of words) {
      if (fullTitleStr.includes(word)) {
        score += 3;
      }
    }

    // Check context matches
    const fullContextStr = (item.context.om + ' ' + item.context.am + ' ' + item.context.en).toLowerCase();
    for (const word of words) {
      if (fullContextStr.includes(word)) {
        score += 1;
      }
    }

    return { item, score };
  });

  scoredList.sort((a, b) => b.score - a.score);

  // If query is short or no high matches, still return top items
  return scoredList.map((s) => s.item).slice(0, limit);
}
