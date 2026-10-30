/**
 * Service utility for regex-scanning legal text for standard Ethiopian proclamation formats
 * (e.g. 'Proclamation No. 123/2010', 'Labsii Lakk. 1156/2019', 'አዋጅ ቁጥር 123/2010')
 * and providing interactive summaries and lookup data.
 */

export interface ProclamationSummary {
  proclamationNumber: string;
  title: {
    om: string;
    am: string;
    en: string;
  };
  summary: {
    om: string;
    am: string;
    en: string;
  };
  yearEnacted: number;
}

// Database of common Ethiopian Proclamations for instant summary fetching on hover/click
export const ETHIOPIAN_PROCLAMATIONS_DB: Record<string, ProclamationSummary> = {
  '1156/2019': {
    proclamationNumber: '1156/2019',
    title: {
      om: 'Labsii Hojii Hojjetaa Labii Lakk. 1156/2011 (2019)',
      am: 'የአሠሪና ሠራተኛ ጉዳይ አዋጅ ቁጥር 1156/2011',
      en: 'Labor Proclamation No. 1156/2019',
    },
    summary: {
      om: 'Mirgaa fi dirqama hojjetaa fi hojjachiisaa, haala walii galtee hojii, sababa walitti buiinsa hojiitiin hojjetaa gaggeessuu, kafaltii kafaltii humnaa fi beenyaa tuma.',
      am: 'የአሠሪና ሠራተኛን መብትና ግዴታ፣ የሥራ ውል አቆጣጠር፣ ከሥራ ስለመሰናበት እና ካሳን የሚወስን አዋጅ።',
      en: 'Governs employment relations, rights and obligations of employers and employees, termination, and severance compensation in Ethiopia.',
    },
    yearEnacted: 2019,
  },
  '1243/2021': {
    proclamationNumber: '1243/2021',
    title: {
      om: 'Labsii Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Federaalaa Lakk. 1243/2013',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት ውሳኔ አዋጅ ቁጥር 1243/2013',
      en: 'Federal Supreme Court Cassation Division Proclamation No. 1243/2021',
    },
    summary: {
      om: 'Murtiiwwan interpretación seeraa kennaman dhaddacha ijibbaatiif dandeettii fi dhiibbaa seeraa qabaachuu isaanii fi sirna hordoffii murtii lubaaf tuma.',
      am: 'የሰበር ሰሚ ችሎት የህግ ትርጉም አስገዳጅነት እና የውሳኔ አሰጣጥ ስነ-ስርዓትን የሚወስን አዋጅ።',
      en: 'Establishes the binding interpretation power of Federal Supreme Court Cassation division precedents across all courts in Ethiopia.',
    },
    yearEnacted: 2021,
  },
  '410/2004': {
    proclamationNumber: '410/2004',
    title: {
      om: 'Labsii Mirga Abbaa Qabeenya Sammuu Lakk. 410/1996',
      am: 'የቅጂ እና አዋሳኝ መብቶች ጥበቃ አዋጅ ቁጥር 410/1996',
      en: 'Copyright and Neighboring Rights Protection Proclamation No. 410/2004',
    },
    summary: {
      om: 'Mirga abbaa qabeenya sammuu, kitaabota, qorannoo seeraa, fi oomisha teeknikaa seeraan eeguuf kan bahe.',
      am: 'የቅጂ መብትን፣ የኪነ-ጥበብ ስራዎችን እና የአእምሮ ንብረትን ከህገ-ወጥ ቅጅ የሚከላከል አዋጅ።',
      en: 'Protects intellectual property, literary works, legal software creations, and author rights against unauthorized cloning or duplication in Ethiopia.',
    },
    yearEnacted: 2004,
  },
  '1061/2017': {
    proclamationNumber: '1061/2017',
    title: {
      om: 'Labsii Daldala Daldalichaa (Commercial Code Proclamation)',
      am: 'የንግድ ሕግ አዋጅ ቁጥር 1243/2013',
      en: 'Commercial Code Proclamation No. 1243/2021',
    },
    summary: {
      om: 'Dhaabbilee daldalaa, waldaa aksiyoonaa, walii galtee daldalaa fi haqamuu dhaabbilee daldalaa hunda ni qajeelcha.',
      am: 'የንግድ ማህበራት ምስረታ፣ የशेር ኩባንያዎች እና የንግድ ውሎችን የሚመራ ሕግ።',
      en: 'Regulates commercial businesses, share companies, commercial contracts, and corporate governance in Ethiopia.',
    },
    yearEnacted: 2021,
  },
};

export interface ScannedProclamationMatch {
  raw: string;
  proclamationNumber: string;
  summaryData?: ProclamationSummary;
  index: number;
  length: number;
}

/**
 * Scans legal text using robust regular expressions to detect standard Ethiopian Proclamation citations
 * (e.g. 'Proclamation No. 1156/2019', 'Labsii Lakk. 1243/2021', 'አዋጅ ቁጥር 410/2004')
 */
export function scanProclamationsInText(text: string): ScannedProclamationMatch[] {
  if (!text) return [];

  const proclamationRegex = /(?:Proclamation\s+No\.?|Labsii\s+Lakk\.?|አዋጅ\s*ቁጥር)\s*(\d+\/\d{4})/gi;
  const matches: ScannedProclamationMatch[] = [];

  let match: RegExpExecArray | null;
  while ((match = proclamationRegex.exec(text)) !== null) {
    const raw = match[0];
    const num = match[1];
    const summaryData = ETHIOPIAN_PROCLAMATIONS_DB[num] || {
      proclamationNumber: num,
      title: {
        om: `Labsii Lakk. ${num}`,
        am: `አዋጅ ቁጥር ${num}`,
        en: `Proclamation No. ${num}`,
      },
      summary: {
        om: `Labsii lakkkoofsa ${num} ta'ee dhimmoota seeraa fi bulchiinsa mootummaa Itoophiyaa keessatti tajaajilu.`,
        am: `ቁጥር ${num} የሆነ የኢትዮጵያ ሕግ አዋጅ።`,
        en: `Official Ethiopian Proclamation No. ${num} governing specific statutory mandates.`,
      },
      yearEnacted: parseInt(num.split('/')[1] || '2010', 10),
    };

    matches.push({
      raw,
      proclamationNumber: num,
      summaryData,
      index: match.index,
      length: raw.length,
    });
  }

  return matches;
}

/**
 * Fetches a summary for a specific proclamation number (simulating asynchronous or cached database retrieval)
 */
export async function fetchProclamationSummaryAsync(proclamationNum: string): Promise<ProclamationSummary> {
  // Simulate lightweight network / DB latency
  await new Promise((resolve) => setTimeout(resolve, 80));

  const cleanNum = proclamationNum.trim();
  if (ETHIOPIAN_PROCLAMATIONS_DB[cleanNum]) {
    return ETHIOPIAN_PROCLAMATIONS_DB[cleanNum];
  }

  return {
    proclamationNumber: cleanNum,
    title: {
      om: `Labsii Lakk. ${cleanNum}`,
      am: `አዋጅ ቁጥር ${cleanNum}`,
      en: `Proclamation No. ${cleanNum}`,
    },
    summary: {
      om: `Labsii lakkkoofsa ${cleanNum} seera biyya keenyaa keessatti hojiirra oolu.`,
      am: `በኢትዮጵያ ህግ ስርዓት ውስጥ የሚሰራበት አዋጅ ቁጥር ${cleanNum}።`,
      en: `Ethiopian legal proclamation number ${cleanNum}.`,
    },
    yearEnacted: 2015,
  };
}
