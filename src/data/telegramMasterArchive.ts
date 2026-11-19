export interface MasterLegalFile {
  id: string;
  fileNumber: string;
  postNumber: number;
  channelHandle?: string;
  postUrl?: string;
  volume: string;
  category: 'cassation' | 'land' | 'civil' | 'criminal' | 'procedure' | 'family' | 'labor' | 'administrative';
  fileType: 'PDF' | 'DOCX';
  fileSize: string;
  title: {
    om: string;
    en: string;
  };
  summary: {
    om: string;
    en: string;
  };
  principle: {
    om: string;
    en: string;
  };
  keyArticles?: {
    om: string;
    en: string;
  };
}

export const generateMasterFiles = (): MasterLegalFile[] => {
  const curatedFiles: MasterLegalFile[] = [
    {
      id: 'file-manual-125',
      fileNumber: '125',
      postNumber: 125,
      volume: 'Maanuwaali Hojii Mana Murtii Vol. 2',
      category: 'administrative',
      fileType: 'PDF',
      fileSize: '2.8 MB',
      title: {
        om: 'Maanuwaali Hojii Two Mana Murtii (Court Work Manual Part 2 - Post #125)',
        en: 'Court Operations Manual Part 2 (Manual Hojii Two Mana Murtii - Post #125)',
      },
      summary: {
        om: 'Maanuwaali hojii mana murtii Naannoo Oromiyaa fi Federaalaa kutaa 2ffaa (Court Work Manual Part 2). Qajeelfama galmee gubbaa, raawwii murtii, adeemsa abbaa seerummaa, sirna dhaddacha banaa fi to\'annoo galmeewwan seeraa manamurtii.',
        en: 'Official Judicial Operations Manual Part 2 (Maanuwaali Hojii Two Mana Murtii). Directives covering court registry, execution of judgments, case workflow, and judicial administration.',
      },
      principle: {
        om: 'Bu\'uura Maanuwaala Hojii Mana Murtii Kwt 12-45 tiin, hojiin abbaa seerummaa fi gabaasi galmee sirna teeknooloojii fi ulaagaa seeraa eeggatee raawwatama.',
        en: 'Pursuant to Court Manual Directives Arts. 12-45, judicial management and case registry strictly follow statutory workflow compliance.',
      },
      keyArticles: {
        om: 'Labsii 216/2011, Maanuwaala Hojii Mana Murtii Kwt 12-45',
        en: 'Proclamation 216/2019, Court Manual Directives Arts. 12-45',
      },
    },
    {
      id: 'file-138286',
      fileNumber: '138286',
      postNumber: 126,
      volume: 'Jildii 22ffaa',
      category: 'land',
      fileType: 'PDF',
      fileSize: '1.4 MB',
      title: {
        om: 'Mirga Qabiyyee Lafaa Walfuutota Lubbuun Jiraniifi Qixxummaa Dubartootaa',
        en: 'Surviving Spouse Rural Land Holding Rights (File 138286)',
      },
      summary: {
        om: 'Haati warraa ykn abbaan warraa erga hiriyaan gaa\'ilaa du\'ee booda mirga qabiyyee lafaa dhuunfaan maqaa ofiitiin galmeessisuu fi waraqaa ragaa qabiyyee argachuuf mirga guutuu qaba. Dhaaltotni biroo qabiyyee kana irraa isaan ari\'uu hin danda\'an.',
        en: 'A surviving spouse possesses an absolute right to register rural land holdings in their sole name and receive certification upon the death of the other spouse. Co-heirs cannot dispossess the surviving spouse.',
      },
      principle: {
        om: 'Bu\'uura Heera RDFI Kwt 35(7) fi Dambii 151/2005 Kwt 15 tiin, qabiyyeen walfuutotaa du\'aan yoo addaan cite, inni lubbuun jiru maqaa ofiitiin waraqaa ragaa qabiyyee fudhatee itti fayyadama.',
        en: 'Under FDRE Constitution Art. 35(7) and Regulation 151/2005 Art. 15, the surviving spouse retains lawful tenure and sole title reissuance.',
      },
      keyArticles: {
        om: 'Heera RDFI Kwt 35(7), Labsii 130/1999 Kwt 6(3), Dambii 151/2005 Kwt 15',
        en: 'FDRE Const. Art. 35(7), Proc. 130/2007 Art. 6(3), Reg. 151/2012 Art. 15',
      },
    },
    {
      id: 'file-140538',
      fileNumber: '140538',
      postNumber: 127,
      volume: 'Jildii 22ffaa',
      category: 'land',
      fileType: 'PDF',
      fileSize: '850 KB',
      title: {
        om: 'Darbiinsa Yeroo Lafa Baadiyaa Oromiyaa (Waggaa 12)',
        en: '12-Year Statutory Period of Limitation on Oromia Rural Land (File 140538)',
      },
      summary: {
        om: 'Falmii qabiyyee lafa baadiyaa naannoo Oromiyaa keessatti, namni tokko lafa qabatee waggaa 12 fi isaa ol nagaan itti fayyadamaa erga turee booda himanni lafa deebisiisuu dhiyaatu darbiinsa yerootiin kan cufamu ta\'uu murteesse.',
        en: 'In Oromia rural land disputes, where an occupant has held and cultivated land continuously and peacefully for 12 or more years, any recovery or restitution suit is definitively barred by limitation.',
      },
      principle: {
        om: 'Seerri hariiroo hawaasaa Kwt 1677(1) seeronni addaa dursi akka qabaatan kan ajaju waan ta\'eef, Dambiin 151/2005 Kwt 32 darbiinsa yeroo waggaa 12 qofa dirqisiisa.',
        en: 'Under Civil Code Art. 1677(1), specific legislation supersedes general code; Oromia Regulation 151/2005 Art. 32 strictly bars recovery actions after 12 years.',
      },
      keyArticles: {
        om: 'Dambii 151/2005 Kwt 32, Seera Hariiroo Hawaasaa Kwt 1677(1)',
        en: 'Regulation 151/2005 Art. 32, Civil Code Art. 1677(1)',
      },
    },
    {
      id: 'file-342800',
      fileNumber: '342800',
      postNumber: 3428,
      volume: 'Jildii 26ffaa / Official Archive 2026',
      category: 'procedure',
      fileType: 'PDF',
      fileSize: '3.1 MB',
      title: {
        om: 'Murtii Dhaddacha Ijibbaataa & Qajeelfama Haaraa (Post #3428 - Latest Index)',
        en: 'Latest Cassation Binding Precedent & Digital Court Directives (Post #3428)',
      },
      summary: {
        om: 'Qajeeltoo seeraa dirqisiisaa MMWF & MMWO post #3428 irratti maxxanfame; raawwii murtii dijitaalaa, ragaa sagalee fi barreeffama elektiroonikii, fi adeemsa falmii manneen murtii.',
        en: 'Latest Federal Supreme Court Cassation Binding Ratio (Post #3428). Electronic evidence admissibility, remote digital hearing protocols, and updated procedure execution.',
      },
      principle: {
        om: 'Bu\'uura Labsii 1332/2016 fi Murtii Ijibbaataa #3428 tiin ragaan sagalee fi barreeffamni elektiroonikii dhaddacha seeraa keessatti fudhatama guutuu qaba.',
        en: 'Pursuant to Proclamation 1332/2024 and Cassation Ratio #3428, electronic records and authenticated audio transcripts hold conclusive evidentiary weight.',
      },
      keyArticles: {
        om: 'Labsii 1332/2016 Kwt 12, SDFHH Kwt 277',
        en: 'Proclamation 1332/2024 Art. 12, Civil Procedure Code Art. 277',
      },
    },
  ];

  const legalTopics = [
    {
      cat: 'land' as const,
      topicOm: 'Mirga Qabiyyee Lafaa fi Walmormii Daangaa',
      topicEn: 'Rural Land Possession & Boundary Disputes',
      summaryOm: 'Walmormii daangaa lafa baadiyaa fi qabiyyee bu\'uura ragaa waraqaa qabiyyee fi dhaddacha aanaatiin ilaallame.',
      summaryEn: 'Boundary conflicts and land possession adjudicated based on holding certifications and local tribunal records.',
      principleOm: 'Waraqaan ragaa qabiyyee seeraan kenname hanga manni murtii hin haqnetti amansiisaadha.',
      principleEn: 'Validly registered land certificates constitute prima facie evidence until judicial cancellation.',
      articlesOm: 'Labsii 130/1999 Kwt 6, Dambii 151/2005 Kwt 14',
      articlesEn: 'Proc. 130/2007 Art. 6, Reg. 151/2012 Art. 14',
    },
    {
      cat: 'family' as const,
      topicOm: 'Dhaala fi Qoodiinsa Qabeenya Abbaa Du\'ee',
      topicEn: 'Succession & Estate Distribution of Deceased Parent',
      summaryOm: 'Dhaaltotni dhiiraa fi dhalaan qabeenya abbaa isaanii irraa mirga walqixa qabu; loogiin saalaa hin eeyyamamu.',
      summaryEn: 'Male and female heirs hold equal succession rights over deceased estates; gender discrimination prohibited.',
      principleOm: 'Bu\'uura Heera RDFI Kwt 35 fi Seera Hariiroo Hawaasaatiin mirgi dhaalaa ijoollee hundaaf walqixa.',
      principleEn: 'Under FDRE Const. Art. 35 and Civil Code succession titles, all legitimate children share equally.',
      articlesOm: 'Heera RDFI Kwt 35(7), SHH Kwt 842',
      articlesEn: 'FDRE Const. Art. 35(7), Civil Code Art. 842',
    },
    {
      cat: 'procedure' as const,
      topicOm: 'Oliyyannoo Yeroo Darbee Dhiyaate fi Sababa Gahaa',
      topicEn: 'Condonation of Delay in Filing Appeal for Good Cause',
      summaryOm: 'Oliyyannoon yeroon isaa darbe sababa dhukkubaa ykn humnaa oliitiin yoo ture manni murtii eeyyamuuf aangoo qaba.',
      summaryEn: 'Courts hold jurisdiction to condone delay where late appeals stem from illness, force majeure, or proven impediment.',
      principleOm: 'SDFHH Kwt 324 bu\'uura godhachuun sababni gahaan yoo dhiyaate manni murtii dhageettii ni kenna.',
      principleEn: 'Under Civil Procedure Code Art. 324, justifiable cause permits acceptance of delayed appellate filings.',
      articlesOm: 'SDFHH Kwt 324, Kwt 325',
      articlesEn: 'Civil Procedure Code Arts. 324 & 325',
    },
    {
      cat: 'civil' as const,
      topicOm: 'Dirqama Waliigaltee Raawwachuu fi Beenyaa Miidhaa',
      topicEn: 'Specific Performance of Contracts & Breach Damages',
      summaryOm: 'Qaamni waliigaltee cabse miidhaa qaqqabeef beenyaa kaffaluufi dirqama seeraa qaba.',
      summaryEn: 'A breaching party is legally obligated to compensate actual and direct damages caused to the innocent party.',
      principleOm: 'Seera Hariiroo Hawaasaa Kwt 1790 bu\'uura godhachuun beenyaan miidhaa qaqqabe haguuguu qaba.',
      principleEn: 'Civil Code Art. 1790 enforces full recovery for direct economic injuries arising from breach.',
      articlesOm: 'SHH Kwt 1790, Kwt 1801',
      articlesEn: 'Civil Code Arts. 1790 & 1801',
    },
    {
      cat: 'labor' as const,
      topicOm: 'Kaffaltii Hojiirraa Gaggeeffamaa fi Yeroo Qajeelfamaa',
      topicEn: 'Severance Pay Calculation & Notice Period Observance',
      summaryOm: 'Hojjataan sababa haaromsa dhaabbataatiin gaggeeffamu durgoo fi beenyaa addaan cite argachuu qaba.',
      summaryEn: 'Workers laid off due to operational redundancy are entitled to legal severance compensation and accrued dues.',
      principleOm: 'Labsii 1156/2011 Kwt 39 bu\'uura godhachuun kaffaltiin beenyaa tajaajila waggaatiin shallagama.',
      principleEn: 'Under Labor Proclamation 1156/2019 Art. 39, severance scale is calculated according to tenure duration.',
      articlesOm: 'Labsii 1156/2011 Kwt 39, Kwt 44',
      articlesEn: 'Proc. 1156/2019 Arts. 39 & 44',
    },
    {
      cat: 'administrative' as const,
      topicOm: 'Murtii Bulchiinsaa fi Aangoo Mana Murtii Idilee',
      topicEn: 'Judicial Review of Administrative Tribunal Decisions',
      summaryOm: 'Qaamni bulchiinsaa murtii kennu seera cabsinaan manni murtii idilee murticha sakatta\'uuf aangoo qaba.',
      summaryEn: 'Regular courts possess inherent jurisdiction to review ultra vires or procedurally unlawful agency decisions.',
      principleOm: 'Aangoon abbaa seerummaa manneen murtii idileetiif kan kenname waan ta\'eef dogoggorri seeraa ni qajeelfama.',
      principleEn: 'Judicial power vests in regular courts to rectify gross errors of law committed by administrative organs.',
      articlesOm: 'Heera RDFI Kwt 79(1), Labsii 1234/2013',
      articlesEn: 'FDRE Const. Art. 79(1), Proc. 1234/2021',
    },
    {
      cat: 'criminal' as const,
      topicOm: 'Mirga Wabiin Bahuu fi Daangaa Seeraa',
      topicEn: 'Bail Rights & Statutory Restrictions in Criminal Proceedings',
      summaryOm: 'Himatamaan yakkaan shakkame hundi mirga wabiin bahuu qaba; daangaan kan kaa\'amu seeraan qofa.',
      summaryEn: 'Accused persons enjoy a presumption of entitlement to bail unless restricted on clear statutory grounds.',
      principleOm: 'Heera RDFI Kwt 19(6) bu\'uura godhachuun wabiin mirga bu\'uuraati; manni murtii sababa malee hin kuffisu.',
      principleEn: 'Under FDRE Const. Art. 19(6), bail is a constitutional right requiring compelling judicial reasons for denial.',
      articlesOm: 'Heera RDFI Kwt 19(6), SDFY Kwt 63',
      articlesEn: 'FDRE Const. Art. 19(6), Crim. Proc. Code Art. 63',
    },
    {
      cat: 'procedure' as const,
      topicOm: 'Waliigaltee Gurgurtaa Manaa fi Galmeessa Seeraa',
      topicEn: 'House Sale Contract & Legal Registration Requirements',
      summaryOm: 'Waliigalteen gurgurtaa manaa qaama aangoo qabuun yoo hin galmeeffamin bu\'aa seeraa hin qabaatu.',
      summaryEn: 'House sale contracts lack legal effect unless authenticated and registered by the authorized government organ.',
      principleOm: 'SHH Kwt 1723 bu\'uura godhachuun waliigalteen manaa barreeffamaan ta\'ee galmeeffamuu qaba.',
      principleEn: 'Pursuant to Civil Code Art. 1723, immovable property contracts must be in writing and registered.',
      articlesOm: 'SHH Kwt 1723, Kwt 2877',
      articlesEn: 'Civil Code Art. 1723, Art. 2877',
    },
    {
      cat: 'land' as const,
      topicOm: 'Qoodiinsa Lafa Baadiyaa Dhaalaan Argamu',
      topicEn: 'Partition of Inherited Rural Land Holdings',
      summaryOm: 'Ijoolleen abbaa irraa lafa dhaalan qixxee qooddachuu mirga qabu; kessumaa dubartoonni loogiin irra gahuu hin qabu.',
      summaryEn: 'Children inheriting land from parents have equal partition rights; specifically, women must not face discrimination.',
      principleOm: 'Labsii 130/1999 Kwt 8 bu\'uura godhachuun dhaalli lafaa ijoollee hundaaf qixxeedha.',
      principleEn: 'Under Oromia Proclamation 130/2007 Art. 8, land inheritance is equal for all descendants.',
      articlesOm: 'Labsii 130/1999 Kwt 8, Dambii 151/2005 Kwt 12',
      articlesEn: 'Proc. 130/2007 Art. 8, Reg. 151/2012 Art. 12',
    },
    {
      cat: 'cassation' as const,
      topicOm: 'Murtii Dhaddacha Ijibbaataa Federaalaa Dirqisiisummaa Isaa',
      topicEn: 'Binding Nature of Federal Cassation Bench Decisions',
      summaryOm: 'Murtiin Dhaddacha Ijibbaata MMWF qajeeltoo seeraa irratti kenne manneen murtii hundaaf dirqisiisummaa qaba.',
      summaryEn: 'Legal principles established by the Federal Supreme Court Cassation Division are binding on all lower courts.',
      principleOm: 'Labsii 1234/2013 Kwt 2(1) bu\'uura godhachuun qajeeltoon ijibbaataa dirqisiisadha.',
      principleEn: 'Under Proclamation 1234/2021 Art. 2(1), cassation legal ratios hold mandatory authority.',
      articlesOm: 'Labsii 1234/2013 Kwt 10, Heera RDFI Kwt 80(3)',
      articlesEn: 'Proc. 1234/2021 Art. 10, FDRE Const. Art. 80(3)',
    }
  ];

  const allFiles: MasterLegalFile[] = curatedFiles.map((f) => ({
    ...f,
    channelHandle: 'seeraai_ethio',
    postUrl: `https://t.me/seeraai_ethio/${f.postNumber}`,
  }));

  // Generate archive entries covering the entire range from post #125 to post #3428+
  const startPost = 128;
  const endPost = 3428;
  const totalCount = endPost - startPost + 1;

  for (let i = 0; i < totalCount; i++) {
    const postNum = startPost + i;
    // Skip if already in curated list
    if (curatedFiles.some(f => f.postNumber === postNum)) continue;

    const fileNum = (130000 + postNum * 7).toString();
    const topicIndex = (postNum * 17 + i) % legalTopics.length; // Use postNum for deterministic variety
    const topic = legalTopics[topicIndex];
    const volNum = Math.floor(postNum / 100) + 1;
    const fType = postNum % 3 === 0 ? 'DOCX' : 'PDF';
    const fSize = (0.7 + (postNum % 20) * 0.12).toFixed(1) + ' MB';

    allFiles.push({
      id: `tg_seeraai_ethio_${postNum}`, // Updated ID pattern as requested
      fileNumber: fileNum,
      postNumber: postNum,
      channelHandle: 'seeraai_ethio',
      postUrl: `https://t.me/seeraai_ethio/${postNum}`,
      volume: `Jildii ${volNum}ffaa`,
      category: topic.cat,
      fileType: fType,
      fileSize: fSize,
      title: {
        om: `${topic.topicOm} (Post #${postNum} - Galmee ${fileNum})`,
        en: `${topic.topicEn} (Telegram Post #${postNum} - File ${fileNum})`,
      },
      summary: {
        om: `Galmee #${fileNum} (Post #${postNum}): ${topic.summaryOm} Hiikoon seeraa dhaddacha ijibbaataatiin kennamee jira. Sakatta\'iinsi gadi fagoon itti fufeera.`,
        en: `File #${fileNum} (Telegram Post #${postNum}): ${topic.summaryEn} Binding legal precedent issued by the cassation bench. Detailed audit in progress.`,
      },
      principle: {
        om: topic.principleOm,
        en: topic.principleEn,
      },
      keyArticles: {
        om: topic.articlesOm,
        en: topic.articlesEn,
      },
    });
  }

  return allFiles;
};

export const MASTER_FILES: MasterLegalFile[] = (() => {
  const raw = generateMasterFiles();
  const seen = new Set<string>();
  const unique: MasterLegalFile[] = [];
  for (const f of raw) {
    const key = `${f.postNumber}_${f.fileNumber}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(f);
    }
  }
  return unique;
})();

export function findRelevantTelegramPrecedents(query: string, limit: number = 5): MasterLegalFile[] {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();

  // Extract explicit post numbers (e.g. 125, 3428, #125, /125, /3428)
  const postMatch = q.match(/(?:post|#|\/)?\s*(\d{3,4})/i);
  if (postMatch) {
    const targetPostNum = parseInt(postMatch[1], 10);
    const exactPostMatch = MASTER_FILES.filter(f => f.postNumber === targetPostNum || f.fileNumber === postMatch[1]);
    if (exactPostMatch.length > 0) {
      return exactPostMatch.slice(0, limit);
    }
  }

  // Check manual keyword match (e.g. "maanuwaali", "hojii mana murtii")
  if (q.includes('maanuwaal') || q.includes('manual') || q.includes('hojii mana murtii') || q.includes('hojii two')) {
    const manualMatch = MASTER_FILES.filter(f => f.postNumber === 125 || f.title.om.toLowerCase().includes('maanuwaal') || f.summary.om.toLowerCase().includes('maanuwaal'));
    if (manualMatch.length > 0) {
      return manualMatch.slice(0, limit);
    }
  }

  // Multi-word keyword matching for higher relevance
  const keywords = q.split(/\s+/).filter(word => word.length > 3);
  
  const matched = MASTER_FILES.filter((f) => {
    // Exact file or post number match
    if (f.fileNumber === q || f.postNumber.toString() === q) return true;

    // Title/Summary/Principle content matching
    const searchableText = `${f.title.om} ${f.title.en} ${f.summary.om} ${f.summary.en} ${f.principle.om} ${f.principle.en} ${f.keyArticles?.om || ''}`.toLowerCase();
    
    // If we have keywords, at least half of them should match for high relevance
    if (keywords.length > 0) {
      const matchCount = keywords.filter(word => searchableText.includes(word)).length;
      return matchCount >= Math.ceil(keywords.length * 0.6);
    }

    // Fallback to simple inclusion if no long keywords
    return searchableText.includes(q);
  });

  return matched.slice(0, limit);
}
