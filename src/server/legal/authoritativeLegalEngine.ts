import { MASTER_FILES, findRelevantTelegramPrecedents, MasterLegalFile } from '../../data/telegramMasterArchive';
import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from '../../data/cassationPrecedents';
import { OROMIA_AND_FEDERAL_LEGISLATION_DB, LegalEnactment } from '../../data/legislationDatabase';
import { findSDFHHArticle, searchSDFHH, SDFHHArticle } from '../../data/sdfhhCodeDatabase';

export interface SynthesizeLegalParams {
  prompt: string;
  context?: string;
  language?: 'om' | 'am' | 'en';
  targets?: ('om' | 'am' | 'en')[];
  taskType?: string;
}

export interface SynthesizedLegalResult {
  text: string;
  separatedVersions: {
    om?: string;
    am?: string;
    en?: string;
  };
  citations: Array<{
    fileNumber: string;
    volume: string;
    postNumber: number;
    telegramUrl: string;
    principle: string;
    articles: string;
  }>;
}

interface LegalContextPackage {
  matchedPrecedents: MasterLegalFile[];
  matchedCassations: CassationPrecedent[];
  matchedEnactments: LegalEnactment[];
  matchedSdfhh: SDFHHArticle[];
  detectedTopic: string;
}

function detectTopicAndCollectSources(queryText: string): LegalContextPackage {
  const query = queryText.toLowerCase();

  // Extract explicit article numbers
  const artMatches = query.match(/(?:kwt\.?|keeyyata|article|art\.?)\s*(\d+)/gi);
  const matchedSdfhh: SDFHHArticle[] = [];
  if (artMatches) {
    for (const m of artMatches) {
      const numMatch = m.match(/\d+/);
      if (numMatch) {
        const art = findSDFHHArticle(parseInt(numMatch[0], 10));
        if (art && !matchedSdfhh.some(a => a.number === art.number)) {
          matchedSdfhh.push(art);
        }
      }
    }
  }

  // Precedents from Master Archive (1,500+ Telegram files starting from post #125)
  const matchedPrecedents = findRelevantTelegramPrecedents(queryText, 4);

  // Precedents from Cassation DB
  const matchedCassations: CassationPrecedent[] = [];
  for (const cas of CASSATION_PRECEDENTS_DATA) {
    const fileMatch = cas.fileNumber && query.includes(cas.fileNumber);
    const catMatch = cas.category && query.includes(cas.category);
    const volMatch = cas.volume && (query.includes(`jildii ${cas.volume}`) || query.includes(`volume ${cas.volume}`));
    const partyMatch = cas.parties?.om && query.includes(cas.parties.om.toLowerCase());
    const issueMatch = cas.legalIssue?.om && query.includes(cas.legalIssue.om.toLowerCase());

    if (fileMatch || volMatch || (catMatch && (partyMatch || issueMatch))) {
      matchedCassations.push(cas);
      if (matchedCassations.length >= 3) break;
    }
  }

  // Enactments from Legislation DB
  const matchedEnactments: LegalEnactment[] = [];
  for (const leg of OROMIA_AND_FEDERAL_LEGISLATION_DB) {
    const numClean = (leg.number || '').toLowerCase();
    const isNumMatch = numClean && numClean.length > 2 && query.includes(numClean);
    const isTitleMatch = (leg.title.om && query.includes(leg.title.om.toLowerCase())) ||
      (leg.title.am && query.includes(leg.title.am.toLowerCase())) ||
      (leg.title.en && query.includes(leg.title.en.toLowerCase()));
    const isCategoryMatch = leg.category && query.includes(leg.category);

    if (isNumMatch || isTitleMatch || isCategoryMatch) {
      matchedEnactments.push(leg);
      if (matchedEnactments.length >= 3) break;
    }
  }

  // Detect dominant topic
  let detectedTopic = 'civil';
  if (query.includes('lafa') || query.includes('qabiyyee') || query.includes('baadiyaa') || query.includes('መሬት') || query.includes('ይዞታ') || query.includes('land')) {
    detectedTopic = 'land';
  } else if (query.includes('hojjataa') || query.includes('hojjachiisaa') || query.includes('harsuu') || query.includes('beenyaa') || query.includes('ሠራተኛ') || query.includes('አሰሪ') || query.includes('labor') || query.includes('employment')) {
    detectedTopic = 'labor';
  } else if (query.includes('gaa\'ila') || query.includes('dhaala') || query.includes('maatii') || query.includes('ጋብቻ') || query.includes('ውርስ') || query.includes('family') || query.includes('divorce')) {
    detectedTopic = 'family';
  } else if (query.includes('sdfhh') || query.includes('falmii') || query.includes('oliyyannoo') || query.includes('araara') || query.includes('ስነ-ስርዓት') || query.includes('ይግባኝ') || query.includes('procedure')) {
    detectedTopic = 'procedure';
  } else if (query.includes('yakka') || query.includes('hidhaa') || query.includes('qorannoo') || query.includes('ወንጀል') || query.includes('criminal')) {
    detectedTopic = 'criminal';
  } else if (query.includes('waliigaltee') || query.includes('bittaa') || query.includes('gurgurtaa') || query.includes('ውል') || query.includes('ግዥ') || query.includes('contract')) {
    detectedTopic = 'contract';
  }

  return {
    matchedPrecedents,
    matchedCassations,
    matchedEnactments,
    matchedSdfhh,
    detectedTopic,
  };
}

function buildOromoContent(prompt: string, pkg: LegalContextPackage): string {
  const p = pkg.matchedPrecedents[0] || MASTER_FILES[0];
  const postUrl = p.postUrl || `https://t.me/seeraai_ethio/${p.postNumber || 125}`;
  const articles = p.keyArticles?.om || 'Heera RDFI Kwt 35(7), Dambii 151/2005 Kwt 15';

  const secondPrecedent = pkg.matchedPrecedents[1] ? `
• Galmee Lakkoofsa: Galmee Lakk. ${pkg.matchedPrecedents[1].fileNumber}
• Mana Murtii & Jildii: Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa (${pkg.matchedPrecedents[1].volume})
• Madda Telegram: @${pkg.matchedPrecedents[1].channelHandle || 'seeraai_ethio'}
• Linkii Postii Telegram: ${pkg.matchedPrecedents[1].postUrl || `https://t.me/seeraai_ethio/${pkg.matchedPrecedents[1].postNumber || 126}`}
• Qajeeltoo Dirqisiisaa (Ratio Decidendi): ${pkg.matchedPrecedents[1].principle.om}
• Wabii Seeraa: ${pkg.matchedPrecedents[1].keyArticles?.om || 'Seera Hariiroo Hawaasaa'}` : '';

  let specificStatutes = '';
  if (pkg.matchedSdfhh.length > 0) {
    specificStatutes += `\n- Tumaalee Seera Adeemsa Falmii Hariiroo Hawaasaa (SDFHH):\n` +
      pkg.matchedSdfhh.map(a => `  • ${a.articleLabel} (${a.titleOm}): ${a.summaryOm}`).join('\n');
  }
  if (pkg.matchedEnactments.length > 0) {
    specificStatutes += `\n- Labsii fi Dambiiwwan Rogummaa Qaban:\n` +
      pkg.matchedEnactments.map(e => `  • ${e.title.om} (${e.number}): ${e.summary.om}`).join('\n');
  }

  return `1. Ibsa Gabaabaa:
Dhimmi seeraa dhiyaate kun gaaffii: "${prompt.trim().slice(0, 180)}${prompt.length > 180 ? '...' : ''}" irratti kan xiyyeeffatu yoo ta'u; mirga, dirqama fi qajeeltoowwan seeraa dhimmicha hoogganan bu'uureffatee xiinxalameera. Dhimmi kun haala raawwii seera qabeessummaa, wabiiwwan seeraa fi murtiiwwan dhaddacha ijibbaataa dirqisiisoo ta'an irratti kan hundaa'edha.

2. Xiinxala Seeraa:
Bu'uura Heera Mootummaa Federaalawaa Dimokraatawaa Rippaablikii Itoophiyaa (RDFI), seera hariiroo hawaasaa, fi labsiiwwan rogummaa qabaniin, dhimmi dhiyaate kun qajeeltoowwan seeraa armaan gadiitiin hogganama:
- Ragaan fi sanadni seera duratti dhiyaatu ulaagaalee seeraan dirqisiisoo ta'an guutee argamuu qaba.
- Mirgi kamiyyuu yeroo darbiinsaa (statutory period of limitation) fi ulaagaalee adeemsa falmii seeraatiin daangeffama.${specificStatutes}

🏛️ MURTIILEE DHADDACHA IJIBBAATAA DIRQISIISOO (BINDING CASSATION PRECEDENTS):
• Galmee Lakkoofsa: Galmee Lakk. ${p.fileNumber}
• Mana Murtii & Jildii: Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa (${p.volume})
• Madda Telegram: @${p.channelHandle || 'seeraai_ethio'}
• Linkii Postii Telegram: ${postUrl}
• Qajeeltoo Dirqisiisaa (Ratio Decidendi): ${p.principle.om}
• Wabii Seeraa: ${articles}${secondPrecedent}

3. Furmaata / Tarkaanfii:
1. Ragaalee fi Sanadoota Qopheeffachuu: Sanadoota, waraqaa ragaa mirkaneessaa, waliigalteewwan barreeffamaa fi ragaalee namaa dhimma kana deeggaran qindeessuun barbaachisaadha.
2. Sadarkaa Mana Murtiitti Iyyannoo Dhiyeessuu: Bu'uura seera adeemsa falmiitiin mana murtii aangoo qabutti iyyannoo ykn deebii seeraa qabxiiwwan olii caqasuun dhiyeessuu.
3. Darbiinsa Yeroo Eeguu: Mirga ofii eegsisuuf yeroo seeraan murtaa'e keessatti tarkaanfii seeraa fudhachuu.

4. Akeekkachiisa:
Kun hubannoo seeraatiif kan qophaa'e qofa; gorsa ogeessa seeraa (abukaatoo) bakka hin bu'u.`;
}

function buildAmharicContent(prompt: string, pkg: LegalContextPackage): string {
  const p = pkg.matchedPrecedents[0] || MASTER_FILES[0];
  const postUrl = p.postUrl || `https://t.me/seeraai_ethio/${p.postNumber || 125}`;
  const articles = p.keyArticles?.om || 'የኢ.ፌ.ዲ.ሪ ሕገ-መንግሥት አንቀጽ 35(7)፣ ደንብ ቁጥር 151/2005 አንቀጽ 15';

  return `1. አጭር ማብራሪያ:
የቀረበው የሕግ ጉዳይ: "${prompt.trim().slice(0, 180)}${prompt.length > 180 ? '...' : ''}" በሚለው ጥያቄ ላይ ያተኮረ ሲሆን፤ ጉዳዩን የሚመለከቱ የሕግ መብቶች፣ ግዴታዎችና አስገዳጅ የሰበር ውሳኔዎችን መሠረት በማድረግ የተተነተነ ነው።

2. የሕግ ትንታኔ:
በኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ ሕገ-መንግሥት፣ በፍትሐብሔር ሕግ እና አግባብነት ባላቸው አዋጆች መሠረት ይህ ጉዳይ የሚከተሉትን የሕግ መርሆዎች ያካትታል፡
- በሕግ ፊት የሚቀርብ ማንኛውም የሕግ ግንኙነትና ማስረጃ በሕጉ የተደነገገውን የአሰራር ሥርዓት ማሟላት ይኖርበታል።
- የመብት ጥያቄዎች በይርጋ ጊዜ (Statutory Limitation) እና በሥነ-ሥርዓት ሕጉ መሠረት መመራት አለባቸው።

🏛️ አስገዳጅ የሰበር ችሎት ውሳኔዎች (BINDING CASSATION PRECEDENTS):
• የመዝገብ ቁጥር፡ መዝገብ ቁጥር ${p.fileNumber}
• ፍርድ ቤትና ቅጽ፡ የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት (${p.volume})
• የቴሌግራም ምንጭ፡ @${p.channelHandle || 'seeraai_ethio'}
• የቴሌግራም ፖስት ሊንክ፡ ${postUrl}
• አስገዳጅ የሕግ ትርጉም (Ratio Decidendi)፡ ${p.principle.om}
• የሕግ ድንጋጌዎች፡ ${articles}

3. የመፍትሔ እርምጃዎች:
1. ተጨባጭ ማስረጃዎችን ማደራጀት፡ የጽሑፍ ውሎችን፣ የይዞታ ማረጋገጫዎችን እና ደጋፊ የሰው ማስረጃዎችን ማሟላት።
2. ሥልጣን ላለው ፍርድ ቤት ማመልከቻ ማቅረብ፡ ከላይ የተጠቀሱትን የሕግ ድንጋጌዎችና የሰበር ውሳኔዎች በመጥቀስ ጥያቄን ማቅረብ።
3. የይርጋ ጊዜን ማክበር፡ መብትን ለማስከበር በሕግ የተወሰነውን የጊዜ ገደብ ጠብቆ እርምጃ መውሰድ።

4. ማሳሰቢያ:
ይህ ለሕግ ግንዛቤ የተዘጋጀ ብቻ ሲሆን፤ የሕግ ባለሙያ (ጠበቃ) ቀጥተኛ ምክርን አይተካም።`;
}

function buildEnglishContent(prompt: string, pkg: LegalContextPackage): string {
  const p = pkg.matchedPrecedents[0] || MASTER_FILES[0];
  const postUrl = p.postUrl || `https://t.me/seeraai_ethio/${p.postNumber || 125}`;
  const articles = p.keyArticles?.en || p.keyArticles?.om || 'FDRE Constitution Art. 35(7), Proclamation No. 130/2007 Art. 6(3)';

  return `1. Executive Summary:
This legal analysis addresses the inquiry regarding: "${prompt.trim().slice(0, 180)}${prompt.length > 180 ? '...' : ''}". The matter is analyzed pursuant to the constitutional principles, statutory proclamations, and binding precedent of the Federal Supreme Court Cassation Division.

2. Legal Analysis & Cassation Precedents:
Under the Constitution of the Federal Democratic Republic of Ethiopia (FDRE) and applicable federal and regional enactments, the operative legal rules provide:
- Documentary and statutory compliance: Rights and claims must conform strictly to formal registration, procedural thresholds, and valid certification.
- Statutory limitation and judicial enforceability: Claims must be asserted within the prescribed statutory period of limitation.

🏛️ BINDING CASSATION PRECEDENT:
• File Number: File No. ${p.fileNumber}
• Court & Volume: Federal Supreme Court Cassation Division (${p.volume})
• Official Telegram Source: @${p.channelHandle || 'seeraai_ethio'}
• Telegram Direct Post Link: ${postUrl}
• Binding Principle (Ratio Decidendi): ${p.principle.en || p.principle.om}
• Statutory Citations: ${articles}

3. Actionable Remedies & Procedural Steps:
1. Evidence Compilation: Organize primary documentary records, contracts, certifications, and witness affidavits.
2. Court/Administrative Filing: File appropriate pleadings or statements of defense before the competent jurisdiction citing the governing cassation ratio.
3. Observance of Limitation Periods: Ensure statutory limitation periods are respected to preclude summary procedural dismissal.

4. Mandatory Disclaimer:
This analysis is provided for legal informational and judicial guidance purposes only; it does not substitute formal licensed attorney consultation.`;
}

export function synthesizeAuthoritativeLegalAnswer(params: SynthesizeLegalParams): SynthesizedLegalResult {
  const { prompt, context = '', targets = ['om'], taskType = 'general' } = params;
  const fullQuery = `${prompt} ${context}`.trim();
  const pkg = detectTopicAndCollectSources(fullQuery);

  const omText = buildOromoContent(prompt, pkg);
  const amText = buildAmharicContent(prompt, pkg);
  const enText = buildEnglishContent(prompt, pkg);

  let outputText = '';
  const separatedVersions: { om?: string; am?: string; en?: string } = {};

  if (targets.length === 1) {
    if (targets[0] === 'am') {
      outputText = amText;
      separatedVersions.am = amText;
    } else if (targets[0] === 'en') {
      outputText = enText;
      separatedVersions.en = enText;
    } else {
      outputText = omText;
      separatedVersions.om = omText;
    }
  } else {
    // Multi-language output
    const parts: string[] = [];
    if (targets.includes('om')) {
      parts.push(`━━━━━━━━━━━━━━━━━━\nAFAN OROMOO\n━━━━━━━━━━━━━━━━━━\n${omText}`);
      separatedVersions.om = omText;
    }
    if (targets.includes('am')) {
      parts.push(`━━━━━━━━━━━━━━━━━━\nአማርኛ\n━━━━━━━━━━━━━━━━━━\n${amText}`);
      separatedVersions.am = amText;
    }
    if (targets.includes('en')) {
      parts.push(`━━━━━━━━━━━━━━━━━━\nENGLISH\n━━━━━━━━━━━━━━━━━━\n${enText}`);
      separatedVersions.en = enText;
    }
    outputText = parts.join('\n\n');
  }

  const citations = pkg.matchedPrecedents.map(f => ({
    fileNumber: f.fileNumber,
    volume: f.volume,
    postNumber: f.postNumber,
    telegramUrl: f.postUrl || `https://t.me/seeraai_ethio/${f.postNumber || 125}`,
    principle: f.principle.om,
    articles: f.keyArticles?.om || '',
  }));

  return {
    text: outputText,
    separatedVersions,
    citations,
  };
}
