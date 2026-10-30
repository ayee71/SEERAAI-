import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from '../data/cassationPrecedents';
import { Language } from '../i18n/translations';

export interface DetectedCitation {
  id: string;
  raw: string;
  category: 'proclamation' | 'civil_code' | 'commercial_code' | 'constitution' | 'cassation';
  title: {
    om: string;
    am: string;
    en: string;
  };
  articleOrSection?: string;
  proclamationNumber?: string;
  lawContext: {
    om: string;
    am: string;
    en: string;
  };
  cassationQuery: string;
  matchedPrecedents: CassationPrecedent[];
}

export function scanDocumentCitations(content: string): DetectedCitation[] {
  if (!content || typeof content !== 'string') return [];

  const detected: DetectedCitation[] = [];
  const addedKeys = new Set<string>();

  // 1. Scan for specific Cassation Precedents by File Number
  for (const precedent of CASSATION_PRECEDENTS_DATA) {
    const fileNum = precedent.fileNumber;
    const fileRegex = new RegExp(`\\b${fileNum}\\b`, 'g');
    if (fileRegex.test(content)) {
      const key = `cassation-${fileNum}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        detected.push({
          id: key,
          raw: `Lakk. Galmee ${fileNum}`,
          category: 'cassation',
          title: {
            om: `Murtii Dhaddacha Ijoo Lakk. Galmee ${fileNum}`,
            am: `የሰበር ውሳኔ መዝገብ ቁጥር ${fileNum}`,
            en: `Federal Supreme Court Cassation File ${fileNum}`,
          },
          articleOrSection: precedent.volume ? `Jildii ${precedent.volume}` : undefined,
          lawContext: {
            om: precedent.bindingPrinciple.om || precedent.legalIssue.om,
            am: precedent.bindingPrinciple.am || precedent.legalIssue.am,
            en: precedent.bindingPrinciple.en || precedent.legalIssue.en,
          },
          cassationQuery: fileNum,
          matchedPrecedents: [precedent],
        });
      }
    }
  }

  // 2. Scan for Proclamations (Labsii / አዋጅ / Proclamation)
  const proclamationPatterns: {
    regex: RegExp;
    procNum: string;
    title: { om: string; am: string; en: string };
    context: { om: string; am: string; en: string };
  }[] = [
    {
      regex: /(?:Labsii|አዋጅ|Proclamation)\s*(?:Lakk\.?|ቁጥር|No\.?)?\s*(?:1156\/(?:2019|2011)|1156)/gi,
      procNum: '1156/2019',
      title: {
        om: 'Labsii Hojjetaa fi Hojjechiisaa Lakk. 1156/2019',
        am: 'የአሰሪና ሰራተኛ ጉዳይ አዋጅ ቁጥር 1156/2011',
        en: 'Labor Proclamation No. 1156/2019',
      },
      context: {
        om: 'Waliigaltee hojii, mirga hojjettootaa, beenyaa kaffaltii addaan kutuu fi sirna hojiirraa gaggeessuu murteessa.',
        am: 'የስራ ውልን፣ የሰራተኞችን መብት፣ የካሳና ስንብት ክፍያዎችን እንዲሁም የስንብት ሥነ-ሥርዓትን ይደነግጋል።',
        en: 'Regulates employment contracts, worker rights, severance benefits, and statutory dismissal procedures.',
      },
    },
    {
      regex: /(?:Koodii\s+Daldalaa|ንግድ\s*ሕግ|Commercial\s+Code)\s*(?:Labsii|አዋጅ|Proclamation|Lakk\.?|ቁጥር|No\.?)?\s*(?:1243\/(?:2021|2013)|1243)/gi,
      procNum: '1243/2021',
      title: {
        om: 'Koodii Daldalaa Haarawa Lakk. 1243/2021',
        am: 'አዲሱ የኢትዮጵያ የንግድ ሕግ አዋጅ ቁጥር 1243/2013',
        en: 'Commercial Code Proclamation No. 1243/2021',
      },
      context: {
        om: 'Waldaalee aksiyoonaa, dhaabbilee daldalaa, walgahii abbootii aksiyoonaa fi hojimaata baankii murteessa.',
        am: 'የአክሲዮን ማህበራትን፣ የንግድ ድርጅቶችን፣ የባለአክሲዮኖች ጠቅላላ ጉባዔ እና የባንክ ግብይቶችን ይደነግጋል።',
        en: 'Governs share companies, business organizations, corporate governance, and commercial transactions.',
      },
    },
    {
      regex: /(?:Heera\s+Mootummaa|ሕገ-?\s*መንግሥት|FDRE\s+Constitution)/gi,
      procNum: '1/1995',
      title: {
        om: 'Heera Mootummaa Rippabiliika Dimokraatawaa Federaalaa Itoophiyaa',
        am: 'የኢ.ፌ.ዲ.ሪ ሕገ-መንግሥት (አዋጅ ቁጥር 1/1987)',
        en: 'FDRE Constitution (Proclamation No. 1/1995)',
      },
      context: {
        om: 'Seera hundaa ol ta\'ee mirgoota namummaa, mirga abbaa qabeenyummaa (K.40) fi mirga dimokraasii eega.',
        am: 'የሀገሪቱ የበላይ ሕግ ሲሆን መሰረታዊ የሰብዓዊ፣ የንብረት ባለቤትነት (አንቀጽ 40) እና ዴሞክራሲያዊ መብቶችን ያረጋግጣል።',
        en: 'Supreme law of Ethiopia guaranteeing fundamental human rights, property rights (Art. 40), and rule of law.',
      },
    },
    {
      regex: /(?:Koodii\s+Siivilii|ፍትሐብሔር\s*ሕግ|Civil\s+Code)/gi,
      procNum: '165/1960',
      title: {
        om: 'Koodii Siivilii Itoophiyaa Bara 1960',
        am: 'የኢትዮጵያ የፍትሐብሔር ሕግ (1952 ዓ.ም)',
        en: 'Civil Code of Ethiopia (Proclamation No. 165/1960)',
      },
      context: {
        om: 'Waliigaltee waliigalaa (K.1675), mirkaneessa sanadaa (K.1723), fi kireeffannaa gamoo (K.2896) qajeelcha.',
        am: 'ጠቅላላ የውል ሕግ (አንቀጽ 1675)፣ የጽሑፍ ውል ምዝገባ (አንቀጽ 1723) እና የቤት ኪራይ ሕጎችን (አንቀጽ 2896) ይደነግጋል።',
        en: 'Foundational private law governing contracts (Art. 1675), immovable property formalities (Art. 1723), and leases (Art. 2896).',
      },
    },
    {
      regex: /(?:Seera\s+Maatii|የቤተሰብ\s*ሕግ|Revised\s+Family\s+Code)\s*(?:Labsii|አዋጅ|Proclamation|Lakk\.?|ቁጥር|No\.?)?\s*(?:213\/(?:2000|1992)|213)?/gi,
      procNum: '213/2000',
      title: {
        om: 'Labsii Seera Maatii Haarome Lakk. 213/2000',
        am: 'የተሻሻለው የቤተሰብ ሕግ አዋጅ ቁጥር 213/1992',
        en: 'Revised Family Code Proclamation No. 213/2000',
      },
      context: {
        om: 'Waliigaltee fuudhaa fi heerumaa, qabeenya dhuunfaa fi waliinii, fi dhaala maatii qajeelcha.',
        am: 'የጋብቻ ውልን፣ የጋራና የግል ንብረት ክፍፍልን እንዲሁም የቤተሰብ ውርስን ይደነግጋል።',
        en: 'Regulates marriage formation, common vs personal property, divorce, and child support.',
      },
    },
  ];

  for (const pat of proclamationPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pat.regex.exec(content)) !== null) {
      const key = `proc-${pat.procNum}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        // Find matching precedents in database referencing this law
        const matched = CASSATION_PRECEDENTS_DATA.filter((p) => {
          const lowerSummary = (
            p.bindingPrinciple.en +
            ' ' +
            p.bindingPrinciple.om +
            ' ' +
            p.legalIssue.en +
            ' ' +
            (p.statutoryProvisions || []).join(' ')
          ).toLowerCase();
          const procTerm = pat.procNum.split('/')[0];
          return lowerSummary.includes(procTerm) || lowerSummary.includes(pat.title.en.toLowerCase());
        });

        detected.push({
          id: key,
          raw: match[0],
          category: pat.procNum === '165/1960' ? 'civil_code' : pat.procNum === '1243/2021' ? 'commercial_code' : pat.procNum === '1/1995' ? 'constitution' : 'proclamation',
          title: pat.title,
          proclamationNumber: pat.procNum,
          lawContext: pat.context,
          cassationQuery: pat.procNum,
          matchedPrecedents: matched,
        });
      }
    }
  }

  // 3. Scan for Specific Articles (e.g., Keeyyata 1723, Keeyyata 27, Keeyyata 40)
  const articleRegex = /(?:Keeyyata|አንቀጽ|Articles?)\s*(\d{1,4})/gi;
  let artMatch: RegExpExecArray | null;
  while ((artMatch = articleRegex.exec(content)) !== null) {
    const artNum = artMatch[1];
    const key = `article-${artNum}`;
    if (!addedKeys.has(key)) {
      addedKeys.add(key);

      // Check if this article matches well-known landmarks:
      let customTitle = {
        om: `Keeyyata ${artNum} (Seera Itoophiyaa)`,
        am: `አንቀጽ ${artNum} (የኢትዮጵያ ሕግ)`,
        en: `Article ${artNum} (Ethiopian Law)`,
      };
      let customContext = {
        om: `Keeyyanni ${artNum} sanadicha keessatti caqasameera. Wabiilee fi murteewwan dhaddacha ijoo kanaan walqabatan sakatta'aa.`,
        am: `አንቀጽ ${artNum} በሰነዱ ውስጥ ተጠቅሷል። ከዚህ ጋር የተያያዙ የሰበር ውሳኔዎችን ይመልከቱ።`,
        en: `Article ${artNum} is cited in the document. Check related binding Supreme Court Cassation rulings.`,
      };

      if (artNum === '1723') {
        customTitle = {
          om: 'Koodii Siivilii Keeyyata 1723 (Mirkaneessa Sanada Qabeenya Hin Sochoonee)',
          am: 'የፍትሐብሔር ሕግ አንቀጽ 1723 (የማይንቀሳቀስ ንብረት ውል ምዝገባ)',
          en: 'Civil Code Article 1723 (Formal Registration of Immovable Property)',
        };
        customContext = {
          om: 'Waliigalteen manaa fi lafaa qaama aangoo qabu (DARA) duratti barreeffamee yoo hin galmoofne gatii seeraa hin qabu.',
          am: 'የቤትና መሬት ውል በሰነዶች ማረጋገጫ (DARA) ፊት ካልተመዘገበ በሕግ ፊት ፈራሽና ዋጋ የሌለው ነው።',
          en: 'Contracts relating to immovable property are null and void unless authenticated in writing before a competent notary/DARA.',
        };
      } else if (artNum === '27') {
        customTitle = {
          om: 'Labsii 1156/2019 Keeyyata 27 (Akeekkachiisa Malee Hojiirraa Ari\'uu)',
          am: 'አዋጅ 1156/2011 አንቀጽ 27 (ያለማስጠንቀቂያ ስራ ማቋረጥ)',
          en: 'Labor Proclamation 1156/2019 Article 27 (Summary Termination)',
        };
        customContext = {
          om: 'Sababoota gurguddoo hojjetaan badii cimaa raawwateen hojjechiisaan akeekkachiisa malee hojiirraa gaggeessuuf heeyyaman murteessa.',
          am: 'ሰራተኛው በፈጸማቸው ከባድ ጥፋቶች ምክንያት አሰሪው ያለማስጠንቀቂያ ውል የሚያቋርጥባቸውን ውስን ምክንያቶች ይዘረዝራል።',
          en: 'Exhaustively enumerates lawful grounds for dismissal without notice due to severe worker misconduct.',
        };
      } else if (artNum === '40') {
        customTitle = {
          om: 'Heera Mootummaa Keeyyata 40 (Mirga Abbaa Qabeenyummaa)',
          am: 'የሕገ-መንግሥቱ አንቀጽ 40 (የንብረት ባለቤትነት መብት)',
          en: 'FDRE Constitution Article 40 (Right to Property)',
        };
        customContext = {
          om: 'Lafni kan ummataa fi mootummaa ta\'ee, namni kamiyyuu bu\'aa qabeenya isaatiif beenyaa madaalawaa argachuu mirga qaba.',
          am: 'መሬት የሕዝብና የመንግሥት ሲሆን፣ ዜጎች በገነቡት ንብረት ላይ ሙሉ መብትና ተመጣጣኝ የካሳ ክፍያ የማግኘት መብት አላቸው።',
          en: 'Establishes public/state ownership of land and citizens\' constitutional right to private property and adequate compensation.',
        };
      }

      const matched = CASSATION_PRECEDENTS_DATA.filter((p) => {
        const fullTxt =
          p.bindingPrinciple.en +
          ' ' +
          p.legalIssue.en +
          ' ' +
          p.bindingPrinciple.om +
          ' ' +
          (p.statutoryProvisions || []).join(' ');
        return fullTxt.includes(artNum);
      });

      detected.push({
        id: key,
        raw: artMatch[0],
        category: 'proclamation',
        title: customTitle,
        articleOrSection: artNum,
        lawContext: customContext,
        cassationQuery: `Keeyyata ${artNum}`,
        matchedPrecedents: matched,
      });
    }
  }

  return detected;
}
