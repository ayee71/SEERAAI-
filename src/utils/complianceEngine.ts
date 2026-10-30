/**
 * SDFHH Compliance Engine
 * Analyzes legal document text against Ethiopian Civil Procedure Code (SDFHH) requirements.
 */

export interface ComplianceCheck {
  id: string;
  title: { om: string; am: string; en: string };
  description: { om: string; am: string; en: string };
  statutoryReference: string;
  status: 'passed' | 'failed' | 'warning';
  scoreImpact: number;
}

export interface ComplianceAuditResult {
  score: number; // 0-100
  checks: ComplianceCheck[];
  summary: { om: string; am: string; en: string };
}

export const SDFHH_RULES = [
  {
    id: 'court_heading',
    keywords: ['Mana Murtii', 'የፍርድ ቤት', 'Court'],
    title: { om: 'Mata-duree Mana Murtii', am: 'የፍርድ ቤት አርዕስት', en: 'Court Heading' },
    description: { 
      om: 'Sanadni mata-duree mana murtii sirrii qabaachuu qaba (SDFHH Kwt 222(1)(a)).', 
      am: 'ሰነዱ ትክክለኛ የፍርድ ቤት አርዕስት ሊኖረው ይገባል (ሥ/ሥ/ሕግ 222(1)(ሀ))።', 
      en: 'The document must contain a proper court heading (SDFHH Art. 222(1)(a)).' 
    },
    statutoryReference: 'SDFHH Art. 222(1)(a)',
    scoreImpact: 15
  },
  {
    id: 'party_designation',
    keywords: ['Himataa', 'Himatamaa', 'ከሳሽ', 'ተከሳሽ', 'Plaintiff', 'Defendant'],
    title: { om: 'Ibsa Qaamolee', am: 'የተከራካሪ ወገኖች መገለጫ', en: 'Party Designations' },
    description: { 
      om: 'Maqaa fi teessoon himataa fi himatamaa ifatti ibsamuu qaba (SDFHH Kwt 222(1)(a)).', 
      am: 'የከሳሽና የተከሳሽ ስም እና አድራሻ በግልጽ መታወቅ አለበት (ሥ/ሥ/ሕግ 222(1)(ሀ))።', 
      en: 'Names and addresses of plaintiff and defendant must be clearly stated (SDFHH Art. 222(1)(a)).' 
    },
    statutoryReference: 'SDFHH Art. 222(1)(a)',
    scoreImpact: 15
  },
  {
    id: 'jurisdiction',
    keywords: ['Aangoo', 'የዳኝነት ስልጣን', 'Jurisdiction', 'Pecuniary'],
    title: { om: 'Aangoo Mana Murtii', am: 'የዳኝነት ስልጣን', en: 'Court Jurisdiction' },
    description: { 
      om: 'Manni murtii dhimma kana ilaaluuf aangoo qabaachuu isaa fi gatii dhimmaa ibsamuu qaba (SDFHH Kwt 6, 222(1)(e)).', 
      am: 'ፍርድ ቤቱ ጉዳዩን ለማየት ስልጣን እንዳለው እና የጉዳዩ ዋጋ መገለጽ አለበት (ሥ/ሥ/ሕግ 6፣ 222(1)(ሠ))።', 
      en: 'Court jurisdiction and subject-matter valuation must be stated (SDFHH Art. 6, 222(1)(e)).' 
    },
    statutoryReference: 'SDFHH Art. 6, 222(1)(e)',
    scoreImpact: 10
  },
  {
    id: 'cause_of_action',
    keywords: ['Sababa', 'Guyyaa', 'ምክንያት', 'ቀን', 'Cause of Action', 'Accrual'],
    title: { om: 'Sababa Himannaa & Guyyaa', am: 'የክሱ ምክንያት እና ቀን', en: 'Cause of Action & Date' },
    description: { 
      om: 'Sababni himannaa fi guyyaan dhimmi sun itti uumame ibsamuu qaba (SDFHH Kwt 222(1)(d)).', 
      am: 'የክሱ ምክንያት እና ድርጊቱ የተፈጸመበት ቀን መገለጽ አለበት (ሥ/ሥ/ሕግ 222(1)(መ))።', 
      en: 'The cause of action and date of accrual must be clearly stated (SDFHH Art. 222(1)(d)).' 
    },
    statutoryReference: 'SDFHH Art. 222(1)(d)',
    scoreImpact: 15
  },
  {
    id: 'prayer_for_relief',
    keywords: ['Gaaffii', 'Beenyaa', 'ዳኝነት', 'ካሳ', 'Prayer', 'Relief', 'Quantum'],
    title: { om: 'Iyyata / Gaaffii Murtii', am: 'የዳኝነት ጥያቄ', en: 'Prayer for Relief' },
    description: { 
      om: 'Manni murtii maal akka murteessuuf barbadamu ifatti gaafatamu qaba (SDFHH Kwt 222(1)(f), 224).', 
      am: 'ፍርድ ቤቱ ምን እንዲወስን እንደሚፈለግ በግልጽ መጠየቅ አለበት (ሥ/ሥ/ሕግ 222(1)(ረ)፣ 224)።', 
      en: 'The specific relief or judgment sought must be clearly stated (SDFHH Art. 222(1)(f), 224).' 
    },
    statutoryReference: 'SDFHH Art. 222(1)(f), 224',
    scoreImpact: 15
  },
  {
    id: 'evidence_list',
    keywords: ['Ragaa', 'Sanada', 'ማስረጃ', 'ሰነድ', 'Evidence', 'Witness', 'Documentary'],
    title: { om: 'Tarree Ragaalee', am: 'የማስረጃ ዝርዝር', en: 'Evidence List' },
    description: { 
      om: 'Tarreen ragaa sanadaa fi ragaa namaa iyyata waliin dhiyaachuu qaba (SDFHH Kwt 137, 223).', 
      am: 'የሰነድ እና የሰው ማስረጃ ዝርዝር ከክሱ ጋር መያያዝ አለበት (ሥ/ሥ/ሕግ 137፣ 223)።', 
      en: 'A schedule of documentary and oral evidence must be attached (SDFHH Art. 137, 223).' 
    },
    statutoryReference: 'SDFHH Art. 137, 223',
    scoreImpact: 15
  },
  {
    id: 'verification_oath',
    keywords: ['Mirkaneessa', 'Kakuu', 'ማረጋገጫ', 'ቃል መሃላ', 'Verification', 'Oath'],
    title: { om: 'Mirkaneessa Kakuu', am: 'የእውነት ማረጋገጫ ቃል መሃላ', en: 'Verification Oath' },
    description: { 
      om: 'Iyyatni sun dhugaa ta\'uu isaa mallattoon mirkanaa\'uu qaba (SDFHH Kwt 92, 93, 222(2)).', 
      am: 'አቤቱታው እውነት መሆኑ በፊርማ መረጋገጥ አለበት (ሥ/ሥ/ሕግ 92፣ 93፣ 222(2))።', 
      en: 'The pleading must be verified by an oath and signed (SDFHH Art. 92, 93, 222(2)).' 
    },
    statutoryReference: 'SDFHH Art. 92, 93, 222(2)',
    scoreImpact: 10
  },
  {
    id: 'summons_service',
    keywords: ['Waamicha', 'Teessoo', 'መጥሪያ', 'አድራሻ', 'Summons', 'Service', 'Address'],
    title: { om: 'Teessoo Waamichaa', am: 'የመጥሪያ አድራሻ', en: 'Service Particulars' },
    description: { 
      om: 'Teessoon waamicha itti ergamu ifatti ibsamuu qaba (SDFHH Kwt 94, 222(1)(b)).', 
      am: 'መጥሪያ የሚላክበት አድራሻ በግልጽ መታወቅ አለበት (ሥ/ሥ/ሕግ 94፣ 222(1)(ለ))።', 
      en: 'Particulars for service of summons must be provided (SDFHH Art. 94, 222(1)(b)).' 
    },
    statutoryReference: 'SDFHH Art. 94, 222(1)(b)',
    scoreImpact: 5
  }
];

export function runSDFHHComplianceAudit(text: string): ComplianceAuditResult {
  if (!text || text.trim().length < 50) {
    return {
      score: 0,
      checks: SDFHH_RULES.map(rule => ({
        ...rule,
        status: 'failed'
      })),
      summary: {
        om: 'Barreeffamni gahaa hin jiru. Maaloo sanada guutuu galchaa.',
        am: 'በቂ ጽሑፍ የለም። እባክዎ ሙሉ ሰነድ ያስገቡ።',
        en: 'Insufficient text provided. Please input the full document for analysis.'
      }
    };
  }

  const results: ComplianceCheck[] = [];
  let totalScore = 0;
  const lowerText = text.toLowerCase();

  for (const rule of SDFHH_RULES) {
    const isFound = rule.keywords.some(kw => lowerText.includes(kw.toLowerCase()));
    
    let status: 'passed' | 'failed' | 'warning' = 'failed';
    let addedScore = 0;

    if (isFound) {
      status = 'passed';
      addedScore = rule.scoreImpact;
    } else {
      // Basic heuristic for warnings
      if (rule.id === 'jurisdiction' && lowerText.includes('birrii')) {
        status = 'warning';
        addedScore = Math.floor(rule.scoreImpact / 2);
      } else if (rule.id === 'evidence_list' && lowerText.includes('ragaa')) {
        status = 'warning';
        addedScore = Math.floor(rule.scoreImpact / 2);
      }
    }

    results.push({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      statutoryReference: rule.statutoryReference,
      status,
      scoreImpact: rule.scoreImpact
    });
    
    totalScore += addedScore;
  }

  let summary = {
    om: 'Sanadichi hanqinoota adeemsa seeraa qaba.',
    am: 'ሰነዱ የሥነ-ሥርዓት ግድፈቶች አሉበት።',
    en: 'The document has procedural compliance gaps.'
  };

  if (totalScore >= 90) {
    summary = {
      om: 'Sanadichi ulaagaalee SDFHH hunda guuteera.',
      am: 'ሰነዱ ሁሉንም የሥነ-ሥርዓት መስፈርቶች አሟልቷል።',
      en: 'The document fully complies with SDFHH requirements.'
    };
  } else if (totalScore >= 70) {
    summary = {
      om: 'Sanadichi sadarkaa gaarii irratti argama, garuu hanqinni tokko tokko jira.',
      am: 'ሰነዱ በጥሩ ደረጃ ላይ ነው፣ ግን አንዳንድ ክፍተቶች አሉት።',
      en: 'The document is mostly compliant but has minor gaps.'
    };
  }

  return {
    score: Math.min(100, totalScore),
    checks: results,
    summary
  };
}
