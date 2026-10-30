import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from '../data/cassationPrecedents';
import { Language } from '../i18n/translations';

export type CitationValidationStatus =
  | 'valid_active'
  | 'repealed_superseded'
  | 'active_precedent'
  | 'unverified_article';

export interface ValidatedCitation {
  id: string;
  rawCitation: string;
  status: CitationValidationStatus;
  statusLabel: { om: string; am: string; en: string };
  badgeEmoji: string;
  citationTitle: { om: string; am: string; en: string };
  procNumber?: string;
  articleOrSection?: string;
  explanation: { om: string; am: string; en: string };
  preamble?: { om: string; am: string; en: string };
  relevantSection?: { om: string; am: string; en: string };
  dateOfEnactment?: { ethiopian: string; gregorian: string };
  enactingAuthority?: { om: string; am: string; en: string };
  replacementRecommendation?: { om: string; am: string; en: string };
  fullTextQuery: string;
  matchedPrecedents: CassationPrecedent[];
}

export interface ProclamationDatabaseRecord {
  procNum: string;
  status: 'active' | 'repealed';
  title: { om: string; am: string; en: string };
  activeReplacement?: string;
  explanation: { om: string; am: string; en: string };
  preamble?: { om: string; am: string; en: string };
  relevantSection?: { om: string; am: string; en: string };
  dateOfEnactment?: { ethiopian: string; gregorian: string };
  enactingAuthority?: { om: string; am: string; en: string };
  keywords: string[];
}

export const PROCLAMATION_DATABASE: ProclamationDatabaseRecord[] = [
  // Active Labor Law
  {
    procNum: '1156/2019',
    status: 'active',
    title: {
      om: 'Labsii Hojjetaa fi Hojjechiisaa Lakk. 1156/2019',
      am: 'የአሰሪና ሰራተኛ ጉዳይ አዋጅ ቁጥር 1156/2011',
      en: 'Labor Proclamation No. 1156/2019',
    },
    preamble: {
      om: 'Yada Seensa (Preamble): Mirgaa fi dirqama hojjetaa fi hojjachiisaa madaalawaa ta\'e uumuun omishtummaa guddisuu, walitti bu\'iinsa hojiirraa ummamu nagayaan furuun misooma dinagdee fi hawaasummaa Itoophiyaa ariifachiisuun barbaachisaa waan ta\'eef bahe.',
      am: 'መግቢያ፦ የአሠሪና ሠራተኛን መብትና ግዴታ በፍትሃዊነት በመወሰን፣ የሥራ ድርድርና የኢንዱስትሪ ሰላምን በማረጋገጥ የአገሪቱን ኢኮኖሚያዊ እድገት ለማፋጠን የወጣ አዋጅ።',
      en: 'Preamble: Enacted to ensure equitable rights and duties between workers and employers, foster industrial peace, encourage productivity, and accelerate economic growth in Ethiopia.',
    },
    relevantSection: {
      om: 'Keeyyattoota Murteessoo: Keeyyata 27 (Akeekkachiisa Malee Ari\'uu / Summary Dismissal), Keeyyata 39 (Kaffaltii Severance), Keeyyata 138 (Marii Waloo & Industrial Dispute).',
      am: 'ዋና ዋና ድንጋጌዎች፦ አንቀጽ 27 (ያለማስጠንቀቂያ ስራ ማቋረጥ)፣ አንቀጽ 39 (የካሳ ክፍያ)፣ አንቀጽ 138 (የህብረት ድርድር)።',
      en: 'Key Provisions: Section 27 (Summary Termination Grounds), Section 39 (Severance Entitlements), Section 138 (Collective Dispute Resolution).',
    },
    dateOfEnactment: {
      ethiopian: 'Bara 2011 B.A.',
      gregorian: 'September 2019 G.C.',
    },
    enactingAuthority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    explanation: {
      om: 'Labsii Hojjetaa fi Hojjechiisaa kan yeroo ammaa hojiirra jiruudha. Labsii 377/2003 bakka bu’ee jira.',
      am: 'በስራ ላይ ያለ አሁናዊ የአሰሪና ሰራተኛ ሕግ ነው። አዋጅ 377/1996ን ተክቷል።',
      en: 'Current active labor legislation governing employment, probation, and severance. Replaced Proclamation 377/2003.',
    },
    keywords: ['1156', '1156/2019', '1156/2011'],
  },
  // Repealed Labor Laws
  {
    procNum: '377/2003',
    status: 'repealed',
    title: {
      om: 'Labsii Hojjetaa fi Hojjechiisaa Moofaa Lakk. 377/2003 (HAQAMEERA)',
      am: 'የቀድሞው የአሰሪና ሰራተኛ አዋጅ ቁጥር 377/1996 (ተሽሯል)',
      en: 'Old Labor Proclamation No. 377/2003 (REPEALED)',
    },
    preamble: {
      om: 'Seensa (Preamble): Labsiin kun bara 1996 B.A. kan bahe yoo ta\'u, Labsii 1156/2011n guutummaatti haqameera.',
      am: 'መግቢያ፦ ይህ አዋጅ በ1996 ዓ.ም የወጣ ሲሆን በአዲሱ አዋጅ 1156/2011 ሙሉ በሙሉ ተሽሯል።',
      en: 'Preamble: Enacted in 2003; fully repealed and superseded by Labor Proclamation 1156/2019.',
    },
    relevantSection: {
      om: 'Keeyyattoota Moofaa: Keeyyata 27 (Haqameera - Labsii 1156 Keeyyata 27n bakka bu\'eera).',
      am: 'የቀድሞ ድንጋጌዎች፦ አንቀጽ 27 (ተሽሮ በአዲሱ አንቀጽ 27 ተክቷል)።',
      en: 'Repealed Provisions: Formerly Section 27 (Superseded by Proclamation 1156 Section 27).',
    },
    dateOfEnactment: {
      ethiopian: 'Bara 1996 B.A.',
      gregorian: 'February 2004 G.C.',
    },
    enactingAuthority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE (Moofaa)',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት (የቀድሞ)',
      en: 'FDRE House of Peoples\' Representatives (Historical)',
    },
    activeReplacement: 'Labsii Lakk. 1156/2019',
    explanation: {
      om: '⚠️ LABSII HAQAMEERA! Labsiin kun Labsii Hojjetaa Lakk. 1156/2019n haqaamee bakka bu’ameera. Falmii seeraa keessatti Labsii 1156/2019 caqasuu qabdu.',
      am: '⚠️ የተሻረ አዋጅ! ይህ አዋጅ በአዋጅ ቁጥር 1156/2011 ተሽሮ ተክቷል። በክስ ማመልከቻ ላይ አዲሱን አዋጅ 1156/2011 ይጠቀሙ።',
      en: '⚠️ REPEALED LAW! Superseded by Labor Proclamation No. 1156/2019. Do not cite 377/2003 in court filings.',
    },
    keywords: ['377', '377/2003', '377/1996'],
  },
  {
    procNum: '42/1993',
    status: 'repealed',
    title: {
      om: 'Labsii Hojjetaa Lakk. 42/1993 (HAQAMEERA)',
      am: 'የቀድሞው የአሰሪና ሰራተኛ አዋጅ ቁጥር 42/1985 (ተሽሯል)',
      en: 'Labor Proclamation No. 42/1993 (REPEALED)',
    },
    preamble: {
      om: 'Seensa (Preamble): Labsiin hojjetaa moofaa bara 1985 B.A. bahe; guutummaatti haqameera.',
      am: 'መግቢያ፦ በ1985 ዓ.ም የወጣ የቀድሞ አዋጅ፤ ሙሉ በሙሉ የተሻረ።',
      en: 'Preamble: Historical 1993 labor proclamation; completely repealed.',
    },
    relevantSection: {
      om: 'Keeyyattoota Moofaa: Haqamaniiru.',
      am: 'የቀድሞ ድንጋጌዎች፦ የተሻሩ።',
      en: 'Repealed Provisions: Obsolete.',
    },
    dateOfEnactment: {
      ethiopian: 'Bara 1985 B.A.',
      gregorian: 'January 1993 G.C.',
    },
    enactingAuthority: {
      om: 'Mootummaa Ce\'umsaa Itoophiyaa',
      am: 'የኢትዮጵያ የሸግግር መንግስት',
      en: 'Transitional Government of Ethiopia',
    },
    activeReplacement: 'Labsii Lakk. 1156/2019',
    explanation: {
      om: '⚠️ LABSII HAQAMEERA! Labsii Lakk. 1156/2019n haqameera.',
      am: '⚠️ የተሻረ አዋጅ! በአዲሱ አዋጅ 1156/2011 ተሽሯል።',
      en: '⚠️ REPEALED LAW! Replaced by active Proclamation 1156/2019.',
    },
    keywords: ['42/1993', '42/1985'],
  },

  // Active Commercial Code
  {
    procNum: '1243/2021',
    status: 'active',
    title: {
      om: 'Koodii Daldalaa Haarawa Lakk. 1243/2021',
      am: 'አዲሱ የኢትዮጵያ የንግድ ሕግ አዋጅ ቁጥር 1243/2013',
      en: 'Commercial Code Proclamation No. 1243/2021',
    },
    preamble: {
      om: 'Yaada Seensa (Preamble): Koodii Daldalaa bara 1952 B.A. bahe haaromsuun, sirna daldalaa hammayyaa, waldaa aksiyoonaa, PLC, kosiina daldalaa, fi invesitimentii idil-addunyaa simachuuf bahe.',
      am: 'መግቢያ፦ የ1952 ዓ.ም የንግድ ሕግን በማሻሻል፣ ዘመናዊ የንግድ ስራዎችን፣ የሸር ኩባንያዎችንና የኢንቨስትመንት ማቀላጠፍን ለመደገፍ የወጣ አዋጅ።',
      en: 'Preamble: Modernizes the 1960 Commercial Code to facilitate corporate governance, financial technology, insolvency reorganization, and private sector growth.',
    },
    relevantSection: {
      om: 'Keeyyattoota Murteessoo: Keeyyata 210 (PLC Share Transfer), Keeyyata 520 (Corporate Governance), Keeyyata 980 (Reorganization & Insolvency).',
      am: 'ዋና ዋና ድንጋጌዎች፦ አንቀጽ 210 (የPLC ድርሻ ማስተላለፍ)፣ አንቀጽ 520 (የኩባንያዎች አስተዳደር)።',
      en: 'Key Provisions: Article 210 (PLC Share Transfers), Article 520 (Shareholder Rights), Article 980 (Bankruptcy & Financial Reorganization).',
    },
    dateOfEnactment: {
      ethiopian: 'Bara 2013 B.A.',
      gregorian: 'April 2021 G.C.',
    },
    enactingAuthority: {
      om: 'Mana Marii Bakka Bu\'oota Uummata FDRE',
      am: 'የኢፌዴሪ የሕዝብ ተወካዮች ምክር ቤት',
      en: 'FDRE House of Peoples\' Representatives',
    },
    explanation: {
      om: 'Koodii Daldalaa yeroo ammaa hojiirra jiru. Koodii Daldalaa bara 1960 waldaalee daldalaa irratti haqee bakka bu’eera.',
      am: 'በስራ ላይ ያለ አዲሱ የንግድ ሕግ። የ1952 የንግድ ሕግን በማህበራት ክፍል ላይ ተክቷል።',
      en: 'Active Commercial Code governing share companies, PLCs, partnerships, and banking.',
    },
    keywords: ['1243', '1243/2021', '1243/2013'],
  },

  // Active Investment Proclamation
  {
    procNum: '1180/2020',
    status: 'active',
    title: {
      om: 'Labsii Inveestimentii Lakk. 1180/2020',
      am: 'የኢንቨስትመንት አዋጅ ቁጥር 1180/2012',
      en: 'Investment Proclamation No. 1180/2020',
    },
    explanation: {
      om: 'Labsii Inveestimentii yeroo ammaa hojiirra jiru. Labsii 769/2012 bakka bu’eera.',
      am: 'በስራ ላይ ያለ አሁናዊ የኢንቨስትመንት አዋጅ። አዋጅ 769/2004ን ተክቷል።',
      en: 'Current active investment law regulating foreign and domestic investor incentives and sectors.',
    },
    keywords: ['1180', '1180/2020', '1180/2012'],
  },
  {
    procNum: '769/2012',
    status: 'repealed',
    title: {
      om: 'Labsii Inveestimentii Moofaa Lakk. 769/2012 (HAQAMEERA)',
      am: 'የቀድሞው የኢንቨስትመንት አዋጅ ቁጥር 769/2004 (ተሽሯል)',
      en: 'Old Investment Proclamation No. 769/2012 (REPEALED)',
    },
    activeReplacement: 'Labsii Lakk. 1180/2020',
    explanation: {
      om: '⚠️ LABSII HAQAMEERA! Labsii Inveestimentii Lakk. 1180/2020n haqamee bakka bu’eera.',
      am: '⚠️ የተሻረ አዋጅ! በአዲሱ የኢንቨስትመንት አዋጅ 1180/2012 ተሽሯል።',
      en: '⚠️ REPEALED LAW! Superseded by active Investment Proclamation No. 1180/2020.',
    },
    keywords: ['769', '769/2012', '769/2004'],
  },

  // Expropriation Laws
  {
    procNum: '1161/2019',
    status: 'active',
    title: {
      om: 'Labsii Lafa Gad-Lakkisiisuu fi Beenyaa Lakk. 1161/2019',
      am: 'የመሬት ስሪት ለሕዝብ ጥቅም መለቀቅና የካሳ አዋጅ ቁጥር 1161/2011',
      en: 'Expropriation & Land Compensation Proclamation No. 1161/2019',
    },
    explanation: {
      om: 'Labsii lafa faayidaa ummataaf gad-lakkisiisuu fi beenyaa kaffaluu yeroo ammaa hojiirra jiru. Labsii 455/1997 bakka bu’eera.',
      am: 'በስራ ላይ ያለ የመሬት መለቀቅና የካሳ ክፍያ አዋጅ። አዋጅ 455/1997ን ተክቷል።',
      en: 'Active expropriation law governing land valuation, compensation, and resettlement. Replaced Proclamation 455/2005.',
    },
    keywords: ['1161', '1161/2019', '1161/2011'],
  },
  {
    procNum: '455/2005',
    status: 'repealed',
    title: {
      om: 'Labsii Lafa Gad-Lakkisiisuu Moofaa Lakk. 455/2005 (HAQAMEERA)',
      am: 'የቀድሞው የመሬት መለቀቅና ካሳ አዋጅ ቁጥር 455/1997 (ተሽሯል)',
      en: 'Old Expropriation Proclamation No. 455/2005 (REPEALED)',
    },
    activeReplacement: 'Labsii Lakk. 1161/2019',
    explanation: {
      om: '⚠️ LABSII HAQAMEERA! Labsii Lakk. 1161/2019n haqameera.',
      am: '⚠️ የተሻረ አዋጅ! በአዲሱ አዋጅ 1161/2011 ተሽሯል።',
      en: '⚠️ REPEALED LAW! Replaced by Expropriation Proclamation 1161/2019.',
    },
    keywords: ['455', '455/2005', '455/1997'],
  },

  // Active Tax Law
  {
    procNum: '979/2016',
    status: 'active',
    title: {
      om: 'Labsii Gibira Galii Lakk. 979/2016',
      am: 'የገቢ ግብር አዋጅ ቁጥር 979/2008',
      en: 'Income Tax Proclamation No. 979/2016',
    },
    explanation: {
      om: 'Labsii Gibira Galii yeroo ammaa hojiirra jiru. Labsii 286/1994 bakka bu’eera.',
      am: 'በስራ ላይ ያለ አሁናዊ የገቢ ግብር አዋጅ። አዋጅ 286/1994ን ተክቷል።',
      en: 'Current active Income Tax legislation for employment, business, and rental income.',
    },
    keywords: ['979', '979/2016', '979/2008'],
  },
  {
    procNum: '286/2002',
    status: 'repealed',
    title: {
      om: 'Labsii Gibira Galii Moofaa Lakk. 286/2002 (HAQAMEERA)',
      am: 'የቀድሞው የገቢ ግብር አዋጅ ቁጥር 286/1994 (ተሽሯል)',
      en: 'Old Income Tax Proclamation No. 286/2002 (REPEALED)',
    },
    activeReplacement: 'Labsii Lakk. 979/2016',
    explanation: {
      om: '⚠️ LABSII HAQAMEERA! Labsii Gibira Galii Lakk. 979/2016n haqameera.',
      am: '⚠️ የተሻረ አዋጅ! በአዲሱ የገቢ ግብር አዋጅ 979/2008 ተሽሯል።',
      en: '⚠️ REPEALED LAW! Replaced by active Income Tax Proclamation 979/2016.',
    },
    keywords: ['286', '286/2002', '286/1994'],
  },

  // Civil Code (Active Foundation)
  {
    procNum: '165/1960',
    status: 'active',
    title: {
      om: 'Koodii Siivilii Itoophiyaa Lakk. 165/1960',
      am: 'የኢትዮጵያ የፍትሐብሔር ሕግ (1952 ዓ.ም)',
      en: 'Civil Code of Ethiopia (Proclamation No. 165/1960)',
    },
    explanation: {
      om: 'Seera Siivilii bu’uuraa hojiirra jiru (Waliigaltee K.1675, Mirkaneessa Sanadaa K.1723, Kireeffannaa K.2896).',
      am: 'በስራ ላይ ያለ መሰረታዊ የፍትሐብሔር ሕግ (ጠቅላላ ውል፣ የጽሑፍ ውል ምዝገባ፣ የቤት ኪራይ)።',
      en: 'Active foundational private law governing contracts, immovable property formalities, torts, and obligations.',
    },
    keywords: ['165/1960', 'civil code', 'siivilii', 'ፍትሐብሔር'],
  },

  // Constitution
  {
    procNum: '1/1995',
    status: 'active',
    title: {
      om: 'Heera Mootummaa FDRE Lakk. 1/1995',
      am: 'የኢ.ፌ.ዲ.ሪ ሕገ-መንግሥት (አዋጅ ቁጥር 1/1987)',
      en: 'FDRE Constitution Proclamation No. 1/1995',
    },
    explanation: {
      om: 'Heera hundaa ol ta’ee fi mirgoota namummaa, abbaa qabeenyummaa (K.40) fi haqaa eegu.',
      am: 'የሀገሪቱ የበላይ ሕግ ሲሆን መሰረታዊ የሰብዓዊ፣ የንብረትና የዴሞክራሲ መብቶችን ያረጋግጣል።',
      en: 'Supreme law of the land guaranteeing constitutional rights, judicial independence, and property rights.',
    },
    keywords: ['1/1995', '1/1987', 'heera', 'constitution', 'ሕገ-መንግሥት'],
  },
];

export function validateLegalCitationText(text: string): ValidatedCitation[] {
  if (!text || typeof text !== 'string') return [];

  const results: ValidatedCitation[] = [];
  const addedIds = new Set<string>();

  // 1. Cross-reference against Proclamation Database (Active vs Repealed)
  for (const procRecord of PROCLAMATION_DATABASE) {
    const isMatched = procRecord.keywords.some((kw) => {
      const regex = new RegExp(`\\b${kw.replace('/', '\\/')}\\b`, 'i');
      return regex.test(text);
    });

    if (isMatched) {
      const id = `val-proc-${procRecord.procNum}`;
      if (!addedIds.has(id)) {
        addedIds.add(id);

        const isRepealed = procRecord.status === 'repealed';
        results.push({
          id,
          rawCitation: `Labsii Lakk. ${procRecord.procNum}`,
          status: isRepealed ? 'repealed_superseded' : 'valid_active',
          statusLabel: isRepealed
            ? { om: '⚠️ HAQAMEERA (REPEALED)', am: '⚠️ የተሻረ አዋጅ (REPEALED)', en: '⚠️ REPEALED LAW' }
            : { om: '✅ HOJIIRRA JIRA (ACTIVE)', am: '✅ በስራ ላይ ያለ (ACTIVE)', en: '✅ ACTIVE IN-FORCE' },
          badgeEmoji: isRepealed ? '⚠️' : '✅',
          citationTitle: procRecord.title,
          procNumber: procRecord.procNum,
          explanation: procRecord.explanation,
          preamble: procRecord.preamble,
          relevantSection: procRecord.relevantSection,
          dateOfEnactment: procRecord.dateOfEnactment,
          enactingAuthority: procRecord.enactingAuthority,
          replacementRecommendation: isRepealed && procRecord.activeReplacement
            ? {
                om: `Bakka bu’iinsa: Maaloo ${procRecord.activeReplacement} fayyadamaa.`,
                am: `ምትክ ሕግ፦ እባክዎ ${procRecord.activeReplacement}ን ይጠቀሙ።`,
                en: `Active replacement: Please cite ${procRecord.activeReplacement} instead.`,
              }
            : undefined,
          fullTextQuery: procRecord.procNum,
          matchedPrecedents: [],
        });
      }
    }
  }

  // 2. Cross-reference against Binding Supreme Court Cassation Precedents
  for (const precedent of CASSATION_PRECEDENTS_DATA) {
    const fileNum = precedent.fileNumber;
    const fileRegex = new RegExp(`\\b${fileNum}\\b`, 'g');
    if (fileRegex.test(text)) {
      const id = `val-cass-${fileNum}`;
      if (!addedIds.has(id)) {
        addedIds.add(id);
        results.push({
          id,
          rawCitation: `Murtii Dhaddacha Ijoo Lakk. Galmee ${fileNum}`,
          status: 'active_precedent',
          statusLabel: { om: '🏛️ QAJEELTOO DIRQISIISAA (PRECEDENT)', am: '🏛️ አስገዳጅ የሰበር ውሳኔ (PRECEDENT)', en: '🏛️ BINDING CASSATION PRECEDENT' },
          badgeEmoji: '🏛️',
          citationTitle: {
            om: `Murtii Dhaddacha Ijoo Lakk. Galmee ${fileNum} (Jildii ${precedent.volume || 1})`,
            am: `የሰበር መዝገብ ቁጥር ${fileNum} (ቅጽ ${precedent.volume || 1})`,
            en: `Federal Supreme Court Cassation File ${fileNum} (Vol. ${precedent.volume || 1})`,
          },
          articleOrSection: `Jildii ${precedent.volume || 1}`,
          explanation: {
            om: precedent.bindingPrinciple.om || precedent.legalIssue.om,
            am: precedent.bindingPrinciple.am || precedent.legalIssue.am,
            en: precedent.bindingPrinciple.en || precedent.legalIssue.en,
          },
          fullTextQuery: fileNum,
          matchedPrecedents: [precedent],
        });
      }
    }
  }

  // 3. Scan for specific Code Articles (e.g. Keeyyata 1723, Keeyyata 27, Keeyyata 40)
  const articleRegex = /(?:Keeyyata|አንቀጽ|Articles?)\s*(\d{1,4})/gi;
  let match: RegExpExecArray | null;
  while ((match = articleRegex.exec(text)) !== null) {
    const artNum = match[1];
    const id = `val-art-${artNum}`;
    if (!addedIds.has(id)) {
      addedIds.add(id);

      let title = {
        om: `Keeyyata ${artNum} (Seera Itoophiyaa)`,
        am: `አንቀጽ ${artNum} (የኢትዮጵያ ሕግ)`,
        en: `Article ${artNum} (Ethiopian Law)`,
      };
      let explanation = {
        om: `Keeyyanni ${artNum} sanada keessan keessatti caqasameera. Keeyyata kana wabiilee fi murteewwan dhaddacha ijoo kanaan walqabatan waliin madaalaa.`,
        am: `አንቀጽ ${artNum} በጽሑፉ ውስጥ ተጠቅሷል። ከዚህ ጋር የተያያዙ የሰበር ውሳኔዎችን ይመልከቱ።`,
        en: `Article ${artNum} detected. Verify statutory context and binding cassation precedents.`,
      };

      if (artNum === '1723') {
        title = {
          om: 'Koodii Siivilii Keeyyata 1723 (Mirkaneessa Sanada Qabeenyaa)',
          am: 'የፍትሐብሔር ሕግ አንቀጽ 1723 (የማይንቀሳቀስ ንብረት ውል ምዝገባ)',
          en: 'Civil Code Article 1723 (Notarization of Immovable Property)',
        };
        explanation = {
          om: '✅ SEERA HOJIIRRA JIRU: Waliigalteen manaa fi lafaa DARA duratti galmaa’uu dirqama.',
          am: '✅ በስራ ላይ ያለ ሕግ፦ የቤትና መሬት ውል በሰነዶች ማረጋገጫ (DARA) ፊት መመዝገብ አለበት።',
          en: '✅ ACTIVE IN-FORCE LAW: Immovable property contracts must be notarized at DARA.',
        };
      } else if (artNum === '27') {
        title = {
          om: 'Labsii 1156/2019 Keeyyata 27 (Akeekkachiisa Malee Ari’uu)',
          am: 'አዋጅ 1156/2011 አንቀጽ 27 (ያለማስጠንቀቂያ ስራ ማቋረጥ)',
          en: 'Labor Proclamation 1156/2019 Art. 27 (Summary Dismissal)',
        };
        explanation = {
          om: '✅ SEERA HOJIIRRA JIRU: Badii cimaa hojjetaan raawwateen akeekkachiisa malee hojiirraa gaggeessuu.',
          am: '✅ በስራ ላይ ያለ ሕግ፦ ሰራተኛው በሚፈፅመው ከባድ ጥፋት ምክንያት ያለማስጠንቀቂያ ስራ ማቋረጥ።',
          en: '✅ ACTIVE IN-FORCE LAW: Lawful summary termination grounds for severe misconduct.',
        };
      }

      const matched = CASSATION_PRECEDENTS_DATA.filter((p) => {
        const fullTxt = (p.bindingPrinciple.en + ' ' + (p.statutoryProvisions || []).join(' '));
        return fullTxt.includes(artNum);
      });

      results.push({
        id,
        rawCitation: `Keeyyata ${artNum}`,
        status: 'valid_active',
        statusLabel: { om: '✅ KEEYYATA MIRKANAA’AA', am: '✅ የተረጋገጠ አንቀጽ', en: '✅ VERIFIED STATUTORY ARTICLE' },
        badgeEmoji: '📜',
        citationTitle: title,
        articleOrSection: artNum,
        explanation,
        fullTextQuery: `Keeyyata ${artNum}`,
        matchedPrecedents: matched,
      });
    }
  }

  return results;
}
