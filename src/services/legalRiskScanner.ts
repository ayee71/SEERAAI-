import { Language } from '../i18n/translations';

export type RiskLevel = 'high' | 'medium' | 'low';

export type RiskCategory = 
  | 'termination'
  | 'liability'
  | 'property_title'
  | 'financial_penalty'
  | 'dispute_jurisdiction'
  | 'formality_compliance'
  | 'labor_rights';

export interface RiskFlaggedClause {
  id: string;
  title: {
    om: string;
    am: string;
    en: string;
  };
  level: RiskLevel;
  category: RiskCategory;
  matchedKeyword: string;
  snippet: string;
  startIndex: number;
  endIndex: number;
  lineNumber: number;
  statutoryReference: string;
  mitigationAdvice: {
    om: string;
    am: string;
    en: string;
  };
}

export interface DocumentRiskReport {
  overallRating: 'high' | 'medium' | 'low' | 'clean';
  riskIndex: number; // 0 to 100
  executiveAssessment: {
    om: string;
    am: string;
    en: string;
  };
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalFlaggedCount: number;
  flaggedClauses: RiskFlaggedClause[];
  scannedAt: string;
}

interface RiskPatternRule {
  id: string;
  category: RiskCategory;
  level: RiskLevel;
  regex: RegExp;
  title: { om: string; am: string; en: string };
  statutoryReference: string;
  mitigationAdvice: { om: string; am: string; en: string };
}

// Comprehensive Trilingual Rules for Ethiopian & Oromian Legal Documents
const RISK_PATTERN_RULES: RiskPatternRule[] = [
  // 1. Unlawful Termination Without Notice / Grounds
  {
    id: 'risk-termination-no-notice',
    category: 'termination',
    level: 'high',
    regex: /(?:beeksisa\s*malee\s*ari|akeekkachiisa\s*malee\s*ari|kallattiin\s*hojii\s*irraa\s*gaggeess|ያለ\s*ማስጠንቀቂያ\s*ማሰናበት|ያለ\s*ቅድመ\s*ማስጠንቀቂያ|terminate\s*without\s*notice|instant\s*dismissal|immediate\s*termination\s*without\s*cause)/i,
    title: {
      om: 'Ari\'iinsa Beeksisa Malee (Termination Without Notice)',
      am: 'ያለ ማስጠንቀቂያ ከስራ ማሰናበት (Termination Without Notice)',
      en: 'Immediate Termination Without Notice'
    },
    statutoryReference: 'Labsii Hojjetaa 1156/2019 K. 27 & 28 / Murtii Ijibbaataa #198762',
    mitigationAdvice: {
      om: 'Hojjetaa beeksisa malee ari\'uun seeraan alaa waan ta\'eef sababoota gurguddoo Labsii 1156/2019 keeyyata 27 jalatti tarreeffaman mirkaneessaa.',
      am: 'ያለ ማስጠንቀቂያ ማሰናበት ህገ-ወጥ በመሆኑ በአዋጅ 1156/2019 አንቀጽ 27 የተመለከቱትን ከባድ ጥፋቶች በጽሁፍ አረጋግጡ።',
      en: 'Termination without notice is strictly regulated under Proc 1156/2019 Art 27. Ensure documented grounds and formal notice.'
    }
  },

  // 2. Unregistered Immovable Property Sale (House / Land)
  {
    id: 'risk-unregistered-property-sale',
    category: 'property_title',
    level: 'high',
    regex: /(?:osoo\s*hin\s*galmeeffamin\s*gurgur|galmee\s*malee\s*bittaa|waliigaltee\s*seera\s*hin\s*qabne|ሳይመዘገብ\s*የተደረገ\s*ሽያጭ|ያልተመዘገበ\s*የቤት\s*ሽያጭ|unregistered\s*property\s*sale|without\s*notarization|unauthenticated\s*deed)/i,
    title: {
      om: 'Gurgurtaa Manaa/Lafaa Galmeessa Dhabe (Unregistered Property Transfer)',
      am: 'ያልተመዘገበ የንብረት ሽያጭ ውል (Unregistered Property Transfer)',
      en: 'Unregistered Real Estate / Property Transfer'
    },
    statutoryReference: 'Koodii Siiviilii K. 2877 fi 2878 / Murtii Dhaddacha Ijibbaataa #214539',
    mitigationAdvice: {
      om: 'Waliigalteen bittaa manaa qaama dhimmi ilaallatu biratti yoo hin galmeeffamin balaa seeraa guddaa fida; dafaa qaama mootummaatti galmeessisaa.',
      am: 'የቤት ሽያጭ ውል በውልና ማስረጃ ካልተመዘገበ አስገዳጅነቱ አጠራጣሪ ስለሚሆን በአስቸኳይ ያስመዝግቡ።',
      en: 'Real estate contracts require mandatory registration under Civil Code Arts 2877-2878 to ensure legal perfection and ownership rights.'
    }
  },

  // 3. Unlimited Liability & Full Indemnity
  {
    id: 'risk-unlimited-liability',
    category: 'liability',
    level: 'high',
    regex: /(?:ittigaafatamummaa\s*daangaa\s*hin\s*qabne|beenyaa\s*guutuu\s*hanga\s*feeme|ያልተገደበ\s*ተጠያቂነት|ሁሉንም\s*ኪሳራ\s*መሸፈን|unlimited\s*liability|indemnify\s*and\s*hold\s*harmless\s*without\s*limit|sole\s*responsibility\s*for\s*all\s*damages)/i,
    title: {
      om: 'Ittigaafatamummaa Daangaa Hin Qabne (Unlimited Liability Clause)',
      am: 'ያልተገደበ ተጠያቂነት (Unlimited Liability Clause)',
      en: 'Unlimited Liability & Indemnity Exposure'
    },
    statutoryReference: 'Koodii Siiviilii K. 1790-1805 (Dirqama Beenyaa)',
    mitigationAdvice: {
      om: 'Ittigaafatamummaa gatii waliigaltichaatiin ykn hanga shallagameen (liability cap) daangeessaa.',
      am: 'የተጠያቂነት መጠን በውሉ ጠቅላላ ዋጋ ወይም በተወሰነ ጣሪያ (Liability Cap) እንዲገደብ ያድርጉ።',
      en: 'Insert a reasonable liability cap tied to the contract value to eliminate catastrophic financial exposure.'
    }
  },

  // 4. Unilateral Contract Modification / Price Hike
  {
    id: 'risk-unilateral-change',
    category: 'financial_penalty',
    level: 'high',
    regex: /(?:abbaa\s*irrummaan\s*dabaluu|heeyyama\s*malee\s*kiraa\s*dabaluu|gatii\s*jijjiiruu\s*abbaa-irrummaa|በአንድ\s*ወገን\s*ዋጋ\s*መጨመር|ያለ\s*ስምምነት\s*ኪራይ\s*ማስተካከል|unilateral\s*price\s*increase|modify\s*terms\s*at\s*sole\s*discretion|adjust\s*rent\s*without\s*consent)/i,
    title: {
      om: 'Kiraa/Gatii Abbaa-irrummaan Dabaluu (Unilateral Modification)',
      am: 'በአንድ ወገን ውል ማሻሻል ወይም ኪራይ መጨመር (Unilateral Modification)',
      en: 'Unilateral Modification & Rent Escalation'
    },
    statutoryReference: 'Koodii Siiviilii K. 1731 & 2896 (Heera Waliigaltee)',
    mitigationAdvice: {
      om: 'Waliigalteen seera lameeniiti; jijjiiramni gatii fi kiraa yoo xiqqaate marii fi waliigaltee barreeffamaatiin ta\'uu qaba.',
      am: 'ውል የሁለት ወገኖች ህግ በመሆኑ የዋጋ ወይም የኪራይ ጭማሪ በጋራ የጽሁፍ ስምምነት ብቻ እንዲሆን አስቀምጡ።',
      en: 'Contracts are binding law under Art 1731. Any modification must require bilateral written agreement.'
    }
  },

  // 5. Total Forfeiture of Deposit / Payments
  {
    id: 'risk-forfeiture-payments',
    category: 'financial_penalty',
    level: 'high',
    regex: /(?:kaffaltiin\s*hundi\s*hin\s*deebi\'u|qabsiisni\s*guutummaatti\s*hafa|የተከፈለው\s*ገንዘብ\s*አይመለስም|ቅድመ\s*ክፍያ\s*ይወረሳል|non-refundable\s*deposit|forfeit\s*all\s*payments|all\s*sums\s*paid\s*shall\s*be\s*retained)/i,
    title: {
      om: 'Kaffaltii Hunda Dhabuu/Haquu (Total Payment Forfeiture)',
      am: 'ቅጣት እና የተከፈለ ገንዘብ በሙሉ መውረስ (Total Forfeiture)',
      en: 'Total Payment & Deposit Forfeiture'
    },
    statutoryReference: 'Koodii Siiviilii K. 1889-1895 (Adabbii Waliigaltee Garmalee)',
    mitigationAdvice: {
      om: 'Adabbiin waliigaltee miidhaa qabatamaa gaheen wal-madaaluu qaba; manneen murtii adabbii garmalee hir\'isuu danda\'u.',
      am: 'የቅጣት ክፍያ ከደረሰው ጉዳት ጋር ተመጣጣኝ መሆን አለበት፤ ፍርድ ቤት ከመጠን ያለፈ ቅጣትን የመቀነስ ስልጣን አለው።',
      en: 'Penal clauses must be proportionate to actual damages. Courts can reduce unconscionable penalties under Art 1889.'
    }
  },

  // 6. Complete Waiver of Legal Rights & Remedies
  {
    id: 'risk-waiver-of-rights',
    category: 'liability',
    level: 'high',
    regex: /(?:mirga\s*mana\s*murtii\s*dhiisuu|himannaa\s*dhiyeeffachuu\s*dhiiseera|ክስ\s*የማቅረብ\s*መብትን\s*መተው|ማንኛውንም\s*መብት\s*መተው|waives\s*all\s*rights\s*to\s*sue|irrevocable\s*waiver\s*of\s*claims|relinquish\s*all\s*legal\s*remedies)/i,
    title: {
      om: 'Mirga Himannaa Seeraa Dhiisuu (Waiver of Judicial Rights)',
      am: 'የክስ ወይም የፍርድ ቤት መብትን መተው (Waiver of Legal Remedies)',
      en: 'Waiver of Access to Justice & Legal Remedies'
    },
    statutoryReference: 'Heera FDRE Keeyyata 37 (Mirga Murtii Argachuu)',
    mitigationAdvice: {
      om: 'Mirgi mana murtii dhiyaachuu heeraan kan eegame waan ta\'eef guutummaatti dhiisuun seeraan fudhatama hin qabu.',
      am: 'ፍርድ ቤት የመቅረብ መብት በህገ-መንግስቱ አንቀጽ 37 የተጠበቀ በመሆኑ ሙሉ በሙሉ መተው ተቀባይነት የለውም።',
      en: 'Constitutional right to judicial review (FDRE Art 37) cannot be unlawfully preempted.'
    }
  },

  // 7. Unreasonable Cure Period (< 3 Days)
  {
    id: 'risk-short-cure-period',
    category: 'termination',
    level: 'medium',
    regex: /(?:guyyaa\s*(?:1|2|3|tokko|lama|sadii)\s*keessatti|በ\s*(?:1|2|3|አንድ|ሁለት|ሶስት)\s*ቀናት\s*ውስጥ|within\s*(?:1|2|3|24\s*hours|48\s*hours)\s*days\s*to\s*cure)/i,
    title: {
      om: 'Yeroo Sirreeffamaa Gabaabaa (Unreasonably Short Cure Period)',
      am: 'አጭር የማስተካከያ ጊዜ (Short Cure Period)',
      en: 'Overly Compressed Cure Period'
    },
    statutoryReference: 'Koodii Siiviilii K. 1772 (Yeroo Ga\'aa Akeekkachiisaa)',
    mitigationAdvice: {
      om: 'Yeroon sirreeffama hanqinaa (cure period) yoo xiqqaate guyyoota hojii 7 hanga 14tti akka dheeratu gaafadhaa.',
      am: 'የማስተካከያ ጊዜ ቢያንስ ከ 7 እስከ 14 የስራ ቀናት እንዲሆን ያድርጉ።',
      en: 'Request a standard cure period of at least 7-14 business days.'
    }
  },

  // 8. Onerous Foreign Jurisdiction / Arbitration
  {
    id: 'risk-foreign-jurisdiction',
    category: 'dispute_jurisdiction',
    level: 'medium',
    regex: /(?:mana\s*murtii\s*biyya\s*alaa|seera\s*biyya\s*biraa|የውጭ\s*አገር\s*ፍርድ\s*ቤት|የውጭ\s*አገር\s*ህግ|exclusive\s*jurisdiction\s*of\s*foreign\s*court|governed\s*by\s*the\s*laws\s*of\s*(?!ethiopia|oromia))/i,
    title: {
      om: 'Falmii Biyya Alaa Qofatti Murteessuu (Foreign Forum Selection)',
      am: 'የውጭ አገር ፍርድ ቤት ወይም ህግ ምርጫ (Foreign Jurisdiction)',
      en: 'Exclusive Foreign Jurisdiction Clause'
    },
    statutoryReference: 'Seera Adeemsa Falmii Siiviilii K. 8-10',
    mitigationAdvice: {
      om: 'Manneen murtii Itoophiyaa ykn Oromiyaa bakka hojiin itti raawwatamu akka ta\'u qindeessaa.',
      am: 'ዳኝነቱ በኢትዮጵያ ወይም በኦሮሚያ ፍርድ ቤቶች እንዲሆን ያድርጉ።',
      en: 'Ensure disputes are seated under Ethiopian / Oromian jurisdiction where assets and performance reside.'
    }
  },

  // 9. Gender Inequality in Land/Inheritance Transfer
  {
    id: 'risk-inheritance-gender-bias',
    category: 'property_title',
    level: 'high',
    regex: /(?:dhiira\s*qofaaf|shamarraniif\s*hin\s*kennamu|dhaala\s*irratti\s*garaagarummaa|ለወንድ\s*ብቻ|የሴቶች\s*የውርስ\s*መብት\s*መገደብ|male\s*heirs\s*only|excluding\s*female\s*heirs)/i,
    title: {
      om: 'Dhaala Irratti Garaagarummaa Saalaa (Gender Discrimination in Inheritance)',
      am: 'በውርስ ላይ የፆታ መድልዎ (Gender Discrimination in Inheritance)',
      en: 'Gender-Biased Inheritance & Land Succession'
    },
    statutoryReference: 'Labsii Caffee Oromiyaa 242/2014 K. 12 & Heera FDRE K. 35',
    mitigationAdvice: {
      om: 'Labsii 242/2014 keeyyata 12 jalatti dhiiraa fi dhalaan dhaala lafaa irratti qixa walqixa mirga qabu; garaagarummaan seeraan alaa dha.',
      am: 'በአዋጅ 242/2014 አንቀጽ 12 መሰረት ወንዶችና ሴቶች እኩል የውርስ መብት ስላላቸው መድልዎ ህገ-ወጥ ነው።',
      en: 'FDRE Art 35 and Oromia Proc 242/2014 Art 12 strictly guarantee equal inheritance and landholding rights.'
    }
  },

  // 10. Missing Formal Execution / Witness Attestation
  {
    id: 'risk-missing-witnesses',
    category: 'formality_compliance',
    level: 'low',
    regex: /(?:ragaan\s*osoo\s*hin\s*mallatteessin|ragaa\s*malee\s*waliigaltee|ያለ\s*ምስክሮች\s*የተደረገ|ምስክር\s*የሌለው|without\s*witnesses|lacking\s*attestation|unwitnessed\s*agreement)/i,
    title: {
      om: 'Ragaalee Malee Waliigaluu (Missing Witness Signatures)',
      am: 'ያለ ምስክሮች የተደረገ ውል (Missing Witness Attestation)',
      en: 'Missing Witness Signatures & Formal Attestation'
    },
    statutoryReference: 'Koodii Siiviilii K. 1727 (Ragaalee Lameeniin Mirkanaa\'uu)',
    mitigationAdvice: {
      om: 'Waliigalteen barreeffamaa yoo xiqqaate ragaalee dhimma beekan 2\'n mallatteeffamuu qaba.',
      am: 'የጽሁፍ ውል ቢያንስ በ 2 ታማኝ ምስክሮች ፊት መፈረም አለበት።',
      en: 'Civil Code Art 1727 mandates at least 2 witnesses for enforceable written legal agreements.'
    }
  }
];

/**
 * Scans the provided document text, detects high-risk clauses and keywords,
 * computes exact line numbers and character offsets, and produces a complete Risk Report.
 */
export function scanDocumentForLegalRisks(text: string, lang: Language = 'om'): DocumentRiskReport {
  if (!text || text.trim().length === 0) {
    return {
      overallRating: 'clean',
      riskIndex: 0,
      executiveAssessment: {
        om: 'Barreeffamni qorannoo hin dhiyaanne.',
        am: 'የተተነተነ ሰነድ የለም።',
        en: 'No document text provided for analysis.'
      },
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      totalFlaggedCount: 0,
      flaggedClauses: [],
      scannedAt: new Date().toISOString()
    };
  }

  const flaggedClauses: RiskFlaggedClause[] = [];
  const lines = text.split('\n');

  // Pre-calculate line start offsets
  const lineOffsets: number[] = [0];
  for (let i = 0; i < lines.length; i++) {
    lineOffsets.push(lineOffsets[i] + lines[i].length + 1);
  }

  const findLineNumber = (charIdx: number): number => {
    for (let i = 0; i < lineOffsets.length; i++) {
      if (charIdx < lineOffsets[i]) {
        return i;
      }
    }
    return lines.length;
  };

  // Run all rules
  RISK_PATTERN_RULES.forEach((rule) => {
    const regex = new RegExp(rule.regex.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;
      const lineNumber = findLineNumber(startIndex);

      // Extract 80 characters of context snippet around match
      const snippetStart = Math.max(0, startIndex - 40);
      const snippetEnd = Math.min(text.length, endIndex + 60);
      const snippet = text.substring(snippetStart, snippetEnd).trim();

      flaggedClauses.push({
        id: `${rule.id}-${startIndex}`,
        title: rule.title,
        level: rule.level,
        category: rule.category,
        matchedKeyword: match[0],
        snippet: `...${snippet}...`,
        startIndex,
        endIndex,
        lineNumber,
        statutoryReference: rule.statutoryReference,
        mitigationAdvice: rule.mitigationAdvice
      });
    }
  });

  const highRiskCount = flaggedClauses.filter(c => c.level === 'high').length;
  const mediumRiskCount = flaggedClauses.filter(c => c.level === 'medium').length;
  const lowRiskCount = flaggedClauses.filter(c => c.level === 'low').length;
  const totalFlaggedCount = flaggedClauses.length;

  // Calculate Risk Index (0-100)
  let riskScore = (highRiskCount * 28) + (mediumRiskCount * 14) + (lowRiskCount * 5);
  if (riskScore > 100) riskScore = 100;
  if (totalFlaggedCount > 0 && riskScore < 25) riskScore = 25;

  let overallRating: 'high' | 'medium' | 'low' | 'clean' = 'clean';
  if (highRiskCount > 0 || riskScore >= 65) {
    overallRating = 'high';
  } else if (mediumRiskCount > 0 || riskScore >= 35) {
    overallRating = 'medium';
  } else if (lowRiskCount > 0 || riskScore > 0) {
    overallRating = 'low';
  }

  // Executive Assessment Summary
  let executiveAssessment = {
    om: 'Waliigalteen/barreeffamni kun qulqulluu dha; balaan seeraa guddaan hin mul\'anne.',
    am: 'ሰነዱ ንጹህ ነው፤ ከፍተኛ የህግ ስጋት አልተገኘበትም።',
    en: 'The document appears legally sound with no critical compliance risks detected.'
  };

  if (overallRating === 'high') {
    executiveAssessment = {
      om: `Qorannoon keeyyattoota balaa ol'aanaa qaban ${highRiskCount} mul'iseera. Waliigaltee bittaa/gurgurtaa, ari'iinsa beeksisa malee, ykn ittigaafatamummaa daangaa dhabe irratti sirreeffamni seeraa hatattamaa barbaachisa dha.`,
      am: `በሰነዱ ውስጥ ${highRiskCount} ከፍተኛ የህግ አደጋ ያለባቸው አንቀጾች ተገኝተዋል። ያለ ማስጠንቀቂያ ማሰናበት ወይም ያልተገደበ ተጠያቂነት ላይ ፈጣን የህግ እርማት ያስፈልጋል።`,
      en: `Detected ${highRiskCount} high-severity risk clauses. Immediate statutory mitigation is required regarding termination, unauthenticated title, or unbounded liability.`
    };
  } else if (overallRating === 'medium') {
    executiveAssessment = {
      om: `Qabxiileen balaa giddu-galeessaa qaban ${mediumRiskCount} argamaniiru. Yeroo sirreeffamaa fi daangaa adabbii irratti mari\'achuun gaarii dha.`,
      am: `${mediumRiskCount} መካከለኛ የህግ ስጋቶች ተገኝተዋል። በማስተካከያ ጊዜ እና በዳኝነት አንቀጾች ላይ ክለሳ ማድረግ ይመከራል።`,
      en: `Identified ${mediumRiskCount} moderate compliance concerns relating to cure periods and jurisdiction clauses.`
    };
  } else if (overallRating === 'low') {
    executiveAssessment = {
      om: 'Gorsi seeraa bu\'uuraa (ragaa mallatteessisuu fi seera biyyaa ibsuu) ni gorfama.',
      am: 'አነስተኛ የቅጽ ማሟያ ምክሮች (ምስክሮችን ማካተት) ይመከራሉ።',
      en: 'Minor advisory recommendations detected regarding witness attestation and governing law clarity.'
    };
  }

  return {
    overallRating,
    riskIndex: riskScore,
    executiveAssessment,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    totalFlaggedCount,
    flaggedClauses,
    scannedAt: new Date().toISOString()
  };
}
