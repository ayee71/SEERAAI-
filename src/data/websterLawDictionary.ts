/**
 * WEBSTER'S NEW WORLD LAW DICTIONARY
 * =========================================================================
 * Author / Legal Editor: Susan Ellis Wild (Wiley Publishing, Inc.)
 * Library Source Asset: /assets/aistudio/Law_dictionary___1__d2cf426d.pdf
 * Trilingual Adaptations: Afaan Oromoo • አማርኛ • English
 * 
 * Contains:
 * 1. Book Metadata & PDF Asset Path
 * 2. Alphabetical Dictionary Entries (Definitions, Sub-types, Usages, Trilingual Glosses)
 * 3. Appendix A: Standard Legal Abbreviations
 * 4. Appendix B: Foreign Words, Latin Legal Maxims & Phrases
 * 5. Appendix C: Constitutional Framework & Amendments Reference
 */

export interface WebsterDictionaryEntry {
  id: string;
  term: string;
  partOfSpeech: string; // n., v., adj., adv.
  phonetic?: string;
  category: 
    | 'general_jurisprudence'
    | 'civil_procedure'
    | 'criminal_evidence'
    | 'contract_commercial'
    | 'constitutional_administrative'
    | 'property_real_estate'
    | 'tort_liability'
    | 'family_estate'
    | 'latin_foreign';
  definitionEn: string;
  subDefinitions?: Array<{
    term: string;
    definition: string;
  }>;
  examplesEn?: string;
  crossReferences?: string[];
  // Trilingual equivalents for SEERAAI
  om: {
    term: string;
    definition: string;
    usage?: string;
  };
  am: {
    term: string;
    definition: string;
    usage?: string;
  };
}

export interface LegalAbbreviation {
  abbr: string;
  fullForm: string;
  meaningEn: string;
  meaningOm: string;
  meaningAm: string;
}

export interface LatinLegalMaxim {
  phrase: string;
  language: 'Latin' | 'French' | 'Anglo-Norman';
  literalTranslation: string;
  legalMeaningEn: string;
  legalMeaningOm: string;
  legalMeaningAm: string;
  pronunciation?: string;
  crossReference?: string;
}

export const WEBSTER_DICTIONARY_METADATA = {
  title: "Webster's New World Law Dictionary",
  author: 'Susan Ellis Wild, Legal Editor',
  publisher: 'Wiley Publishing, Inc., Hoboken, NJ',
  isbn: '978-0-7645-4210-7 (ISBN-10: 0-7645-4210-9)',
  pages: 334,
  pdfAssetPath: '/assets/aistudio/Law_dictionary___1__d2cf426d.pdf',
  descriptionOm: "Galmee jechoota seeraa beekamaa 'Webster's New World Law Dictionary' kan Susan Ellis Wild tiin qophaa'ee fi dhaabbata Wiley Publishing tiin maxxanfame; qajeeltoowwan seeraa, jechoota Laatiinii, gabaabduulee fi hiikaalee ogummaa seeraa guutuu of keessaa qaba.",
  descriptionAm: "በሱዛን ኤሊስ ዋይልድ የተዘጋጀና በዋይሊ ፐብሊሽንግ የታተመው 'Webster's New World Law Dictionary'፤ የህግ ቃላት፣ የላቲን መርሆዎች፣ አህጽሮተ-ቃላትና ዝርዝር የህግ ማብራሪያዎችን የያዘ ዓለም አቀፍ የህግ መዝገበ-ቃላት።",
  descriptionEn: "Webster's New World Law Dictionary by Susan Ellis Wild (Wiley Publishing); comprehensive authoritative dictionary of legal concepts, procedural doctrines, Latin maxims, abbreviations, and constitutional terms.",
};

// =========================================================================
// 1. COMPREHENSIVE WEBSTER DICTIONARY ENTRIES (A - Z)
// =========================================================================
export const WEBSTER_DICTIONARY_ENTRIES: WebsterDictionaryEntry[] = [
  // --- A ---
  {
    id: 'w_abandonment',
    term: 'Abandonment',
    partOfSpeech: 'n.',
    category: 'property_real_estate',
    definitionEn: 'The act of intentionally giving up property or a right with no intent of reclaiming it or of later giving it away or selling it; in family law, the act of abandoning a person with the intent of terminating duties to him or her.',
    subDefinitions: [
      { term: 'Abandoned property', definition: 'Property discarded by the owner who has no intention of ever reclaiming it.' },
      { term: 'Desertion', definition: 'Willful abandonment of an employment or marital/familial duty.' }
    ],
    crossReferences: ['forfeiture', 'renunciation', 'waiver', 'desertion'],
    om: {
      term: 'Dhiisuu / Gadi-Dhiisuu Qabeenyaa',
      definition: 'Fedha ofiitiin qabeenya ykn mirga ofii irraa guutummaatti deebi\'anii hin fudhanne jedhanii harka dhiibuu; maatii keessatti dirqama kunuunsaa dhiisuu.',
      usage: 'Abbaan qabiyyee lafa isaa waggaa dheeraaf dhiisee yoo bahe, akka mirga dhiiseetti lakkaa\'amuu danda\'a.'
    },
    am: {
      term: 'ንብረት መተው / ግዴታን ማቋረጥ',
      definition: 'አንድ ሰው ባለቤትነቱን ወይም መብቱን ዳግም ላለመጠየቅ በማሰብ ንብረቱን ሙሉ በሙሉ መተው፤ በቤተሰብ ህግ ልጆችን ወይም የትዳር አጋርን ያለ ድጋፍ መተው።',
      usage: 'ባለይዞታው ይዞታውን ሙሉ በሙሉ ትቶ ከሄደ የባለቤትነት መብቱን እንደተወ ይቆጠራል።'
    }
  },
  {
    id: 'w_abatement',
    term: 'Abatement',
    partOfSpeech: 'n.',
    category: 'civil_procedure',
    definitionEn: 'The act of ending, eliminating, or decreasing; in wills, the reduction of bequests because debts exceed estate assets; in contracts, an abatement clause suspends rent when acts of God prevent occupancy.',
    subDefinitions: [
      { term: 'Abatement clause', definition: 'A contractual provision releasing the tenant of a lease from paying rent when an act of God prevents occupancy.' },
      { term: 'Plea in abatement', definition: 'A dilatory plea objecting to the timing or manner of a suit without touching the merits.' }
    ],
    crossReferences: ['abate', 'diminution', 'act of God'],
    om: {
      term: 'Hir\'isuu / Dhabamsiisuu / Abatement',
      definition: 'Baay\'ina ykn gatii waan tokkoo hir\'isuu ykn balleessuu; dhaalmaa keessatti idaan dhaalaa qabeenya caalee yoo argame kennaa hir\'isuu; kireessaa keessatti balaan uumamaa yoo qaqqabe kaffaltii kiree dhaabuu.',
      usage: 'Balaan lolaa mana kireeffame waan miidheef kireeffataan bu\'uura abatement clause tiin kaffaltii dhaabe.'
    },
    am: {
      term: 'ማሳነስ / መቀነስ / ውድቅ ማድረግ',
      definition: 'የእዳ ወይም የውርስ ድርሻ መቀነስ፤ የተከራየው ቤት በተፈጥሮ አደጋ ምክንያት ለመኖሪያነት ካልዋለ የኪራይ ክፍያ ማቆም የሚፈቅድ የውል ድንጋጌ።',
      usage: 'በውርስ ንብረት ላይ ያለውን እዳ ለመክፈል የሟች ስጦታዎች እንዲቀነሱ ተደረገ።'
    }
  },
  {
    id: 'w_ab_initio',
    term: 'Ab Initio',
    partOfSpeech: 'adv.',
    phonetic: 'ab ih-NIH-shee-oh',
    category: 'latin_foreign',
    definitionEn: 'Latin for "from the beginning" or "from the first act." Null and void from its very inception, treated as if it never existed.',
    examplesEn: 'A contract entered into by an unauthorized person is void ab initio.',
    crossReferences: ['void', 'voidable', 'annulment'],
    om: {
      term: 'Jalqabumaa Kaasee / Ab Initio',
      definition: 'Jalqabuma irraa eegalee gatii seeraa kan hin qabne; akka waan hin uumaminiitti kan lakkaa\'amu.',
      usage: 'Waliigalteen sobaa fi malaamaltummaan raawwatame ab initio gatii seeraa hin qabu.'
    },
    am: {
      term: 'ከመነሻው / ከመጀመሪያው (Ab Initio)',
      definition: 'የላቲን ቃል ሲሆን ከመጀመሪያው አንስቶ በህግ ፊት ፈራሽ የሆነ ወይም እንዳልተደረገ የሚቆጠር።',
      usage: 'በህገ-ወጥ ድርጊት የተመሰረተ ውል ከመጀመሪያው (ab initio) ህጋዊ ውጤት የለውም።'
    }
  },
  {
    id: 'w_abuse_of_discretion',
    term: 'Abuse of Discretion',
    partOfSpeech: 'n.',
    category: 'civil_procedure',
    definitionEn: 'A trial court or administrative agency ruling that, in light of the relevant facts and law, is arbitrary, capricious, unreasonable, or unconscionable. The appellate standard of review where the decision must be wholly inconsistent with the law and facts.',
    crossReferences: ['arbitrary', 'judicial discretion', 'appellate review'],
    om: {
      term: 'Aangoo Murtii Daangaa Malee Fayyadamuu (Abuse of Discretion)',
      definition: 'Abbaan seeraa ykn dhaabbanni seera qabeessi aangoo seeraan kennameef haala loogii, loojikii hin qabne, ykn seera cabsutiin hojiirra oolchuu.',
      usage: 'Manni Murtii Ol\'iyyannoo murtichi abuse of discretion ta\'uu mirkaneessee diige.'
    },
    am: {
      term: 'የውሳኔ ስልጣንን ያለአግባብ መጠቀም',
      definition: 'ዳኛ ወይም አስተዳደራዊ አካል በህግ የተሰጠውን የማመዛዘን ስልጣን ከህግና ከማስረጃ ውጪ በሆነ መንገድ በዘፈቀደና አድሏዊ በሆነ ሁኔታ መተግበር።',
      usage: 'የበታች ፍርድ ቤት የተሰጠውን የማመዛዘን ስልጣን ያለአግባብ እንደተጠቀመ በመረጋገጡ ውሳኔው ተሻረ።'
    }
  },
  {
    id: 'w_acceleration_clause',
    term: 'Acceleration Clause',
    partOfSpeech: 'n.',
    category: 'contract_commercial',
    definitionEn: 'A provision in a contract, mortgage, or promissory note declaring that, upon the occurrence of a specified event (such as default on an installment), the entire unpaid balance becomes immediately due and payable.',
    crossReferences: ['default', 'promissory note', 'mortgage'],
    om: {
      term: 'Keeyyata Kaffaltii Ariifachiisuu (Acceleration Clause)',
      definition: 'Tumaa waliigaltee liqii ykn liizii keessatti idaan yoo kaffaltii tokko tursiise, idaan guutuun battalatti akka kaffalamu dirqisiisu.',
      usage: 'Baankiin bu\'uura acceleration clause tiin liqii guutuu battalatti akka kaffalu gaafate.'
    },
    am: {
      term: 'የክፍያ ማፍጠኛ አንቀጽ (Acceleration Clause)',
      definition: 'በብድር ወይም የውል ስምምነት ውስጥ ተበዳሪው አንድ የክፍያ ጊዜ ቢያሳልፍ ሙሉ ቀሪው እዳ ወዲያውኑ እንዲከፈል የሚያደርግ የውል ድንጋጌ።',
      usage: 'ተበዳሪው የወር ክፍያውን ባለመክፈሉ ባንኩ ሙሉውን እዳ ወዲያውኑ ጠየቀ።'
    }
  },
  {
    id: 'w_accomplice',
    term: 'Accomplice',
    partOfSpeech: 'n.',
    category: 'criminal_evidence',
    definitionEn: 'One who knowingly, voluntarily, or intentionally, and with common criminal purpose shared with the principal offender, solicits, encourages, or assists in the planning and execution of a crime. Regarded as just as culpable as the principal perpetrator.',
    crossReferences: ['accessory', 'aid and abet', 'principal', 'conspiracy'],
    om: {
      term: 'Hiriyyaa Badii / Harka-Maree Yakkaa (Accomplice)',
      definition: 'Nama beekaa fi fedhiidhaan karoora ykn raawwii yakkaa keessatti nama yakka raawwate waliin qooda fudhate; itti gaafatamummaa guutuu qaba.',
      usage: 'Hiriyaan badii qophii yakka saamichaa keessatti ragaa baankii kenne akka raawwataatti gaafatame.'
    },
    am: {
      term: 'የወንጀል ተባባሪ (Accomplice)',
      definition: 'ከዋናው ወንጀል አድራጊ ጋር በመሆን ወንጀልን በማቀድ፣ በማገዝ ወይም በማበረታታት እኩል ተሳትፎ ያደረገ ሰው።',
      usage: 'የወንጀል ተባባሪው በወንጀሉ ዝግጅት ላይ በመሳተፉ ከዋናው አድራጊ ጋር እኩል ተቀጣ።'
    }
  },
  {
    id: 'w_accord_and_satisfaction',
    term: 'Accord and Satisfaction',
    partOfSpeech: 'n.',
    category: 'contract_commercial',
    definitionEn: 'An accord (an agreement to discharge an existing obligation by performing a substituted obligation) followed by satisfaction (the actual performance/payment of that accord), permanently extinguishing the original debt or claim.',
    crossReferences: ['novation', 'settlement', 'contract'],
    om: {
      term: 'Waliigaluu fi Raawwachuu (Accord and Satisfaction)',
      definition: 'Idaa duraanii bakka buusuuf waliigaltee haaraa mallatteessanii battalatti raawwachuun idaa duraanii guutummaatti dhabamsiisuu.',
      usage: 'Gareewwan falmii isaanii accord and satisfaction tiin waan xumuraniif himannaan cufame.'
    },
    am: {
      term: 'ስምምነትና አፈጻጸም (Accord and Satisfaction)',
      definition: 'የነበረውን የውል እዳ በሌላ አዲስ ስምምነት ተክቶ ያንን አዲስ ስምምነት ሙሉ በሙሉ በመፈጸም የቀድሞውን ግዴታ በህግ ፊት ማቋረጥ።',
      usage: 'ተበዳሪው በተስማሙት አዲስ የክፍያ ስምምነት መሰረት ገንዘቡን ስለከፈለ ክሱ ተዘጋ።'
    }
  },
  {
    id: 'w_actionable_per_se',
    term: 'Actionable Per Se',
    partOfSpeech: 'adj./n.',
    category: 'tort_liability',
    definitionEn: 'Actions or wrongs (such as certain defamatory statements) that do not require proof of actual damages or special harm because harm is obvious on its face and presumed by law.',
    crossReferences: ['defamation', 'libel', 'slander per se'],
    om: {
      term: 'Ofiin Himachiisaa / Miidhaa Mirkanoofte Malee Himachiisaa',
      definition: 'Yakka ykn badii miidhaa qabatamaa herregame mirkaneessuu osoo hin barbaachisin, qabiyyee isaatiin qofa himataaf kan ga\'u (fkn: maqaa balleessii cimaa).',
      usage: 'Jechi sobaa nama daldalaa irratti odeeffame actionable per se waan ta\'eef beenyaan murtaa\'e.'
    },
    am: {
      term: 'ያለ ተጨማሪ ማስረጃ የሚያስከስስ (Actionable Per Se)',
      definition: 'የደረሰውን ትክክለኛ ጉዳት ማረጋገጥ ሳያስፈልግ፣ ድርጊቱ ራሱ በባህሪው ህገ-ወጥ በመሆኑ ብቻ ካሳ የሚያስከፍል የስም ማጥፋት ወይም የፍትሐብሔር ጥፋት።',
      usage: 'የስም ማጥፋት ቃላቱ በባህሪያቸው እጅግ አሳፋሪ በመሆናቸው ያለ ተጨማሪ ማስረጃ ካሳ ተፈረደባቸው።'
    }
  },
  {
    id: 'w_actual_authority',
    term: 'Actual Authority',
    partOfSpeech: 'n.',
    category: 'contract_commercial',
    definitionEn: 'Authority, either express (stated in words or writing) or implied (arising from conduct or custom), intentionally given by a principal to an agent to bind the principal in transactions with third parties.',
    crossReferences: ['apparent authority', 'agency', 'principal'],
    om: {
      term: 'Aangoo Dhugaa / Bakka-Bu\'iinsa Qabatamaa (Actual Authority)',
      definition: 'Aangoo ifaan ykn cal-dhabbii loojikiidhaan nama aangoo qabuun bakka-bu\'aaf kennamee qaama sadaffaa waliin waliigaltee uumuuf dandeessisu.',
      usage: 'Dursaan mana hojichaa bakka bu\'aa isaatiif actual authority kenneera.'
    },
    am: {
      term: 'ትክክለኛ የወኪል ስልጣን (Actual Authority)',
      definition: 'በዋናው ባለስልጣን በግልጽ በጽሁፍ ወይም በተዘዋዋሪ ለወኪሉ የተሰጠ እና በህግ ፊት አስገዳጅ የሆነ የውክልና ስልጣን።',
      usage: 'ወኪሉ በውክልና ስልጣኑ መሰረት ውል በመፈጸሙ ድርጅቱ በውሉ ይገደዳል።'
    }
  },
  {
    id: 'w_actus_reus',
    term: 'Actus Reus',
    partOfSpeech: 'n.',
    phonetic: 'AK-tus RAY-us',
    category: 'latin_foreign',
    definitionEn: 'Latin for "guilty act." The voluntary, wrongful physical act or unlawful omission that constitutes the physical component of a crime, as distinguished from the mental intent (mens rea).',
    examplesEn: 'A person cannot be punished for malicious thoughts alone; the crime requires both actus reus and mens rea.',
    crossReferences: ['mens rea', 'corpus delicti', 'crime'],
    om: {
      term: 'Gocha Yakkaa Qabatamaa (Actus Reus)',
      definition: 'Gocha ykn dhiisuu seeraan dhorkame kan qaamaan raawwatame; qaama firii dubbii yakkaa kan yaada (mens rea) irraa adda ta\'e.',
      usage: 'Namni tokko yaada badii qabaachuun qofti hin adabsiisu; actus reus (gochi yakkaa) jiraachuu qaba.'
    },
    am: {
      term: 'የወንጀል ድርጊት (Actus Reus)',
      definition: 'የላቲን ቃል ሲሆን የወንጀሉን አካላዊ ድርጊት ወይም አለማድረግን የሚያመለክት፤ ከአእምሮ አስቦት (mens rea) ተለይቶ የሚታይ።',
      usage: 'ወንጀል እንዲባል አካላዊ ድርጊቱ (actus reus) እና የአእምሮው ሀሳብ (mens rea) ተጣምረው መገኘት አለባቸው።'
    }
  },
  {
    id: 'w_ad_damnum',
    term: 'Ad Damnum',
    partOfSpeech: 'n.',
    category: 'latin_foreign',
    definitionEn: 'Latin for "to the damage." The clause or statement in a civil complaint that specifies the exact monetary damages sought by the plaintiff.',
    crossReferences: ['damages', 'complaint', 'prayer'],
    om: {
      term: 'Gatii Miidhaa Gaafatame (Ad Damnum)',
      definition: 'Boqonnaa himannaa keessatti himataan maallaqa beenyaa ykn miidhaa hammam akka barbaadu ifatti itti ibsu.',
      usage: 'Iyyata himannaa irratti ad damnum birrii 500,000 jedhamee barreeffame.'
    },
    am: {
      term: 'የተጠየቀ የካሳ መጠን (Ad Damnum)',
      definition: 'በፍትሐብሔር ክስ ማመልከቻ መጨረሻ ላይ ከሳሽ የሚጠይቀው ትክክለኛ የገንዘብ ካሳ መጠን የተገለጸበት ክፍል::',
      usage: 'በክሱ ማመልከቻ ላይ የተጠየቀው የካሳ መጠን 200,000 ብር መሆኑ ተመዝግቧል።'
    }
  },
  {
    id: 'w_ad_hoc',
    term: 'Ad Hoc',
    partOfSpeech: 'adj./adv.',
    phonetic: 'ad HOK',
    category: 'latin_foreign',
    definitionEn: 'Latin for "for this specific purpose." Formed or arranged for a particular case, task, or urgent situation only, and not permanent.',
    examplesEn: 'An ad hoc committee was appointed to investigate the courtroom disruption.',
    crossReferences: ['committee', 'tribunal'],
    om: {
      term: 'Dhimma Kana Qofaaf / Yeroof Kan Qophaa\'e (Ad Hoc)',
      definition: 'Hojii ykn dhimma murtaa\'e tokko qofa raawwachuuf yeroodhaaf kan dhaabbate, dhaabbataa kan hin taane.',
      usage: 'Koree ad hoc qorannoo dhimma daangaa lafaa qoratuuf hundeeffame.'
    },
    am: {
      term: 'ለተወሰነ ዓላማ ብቻ የተቋቋመ (Ad Hoc)',
      definition: 'የላቲን ቃል ሲሆን ለአንድ ጊዜ ወይም ለተለየ ጉዳይ ብቻ የተቋቋመ ጊዜያዊ ኮሚቴ ወይም አሰራር።',
      usage: 'የአከራካሪውን ጉዳይ ለመመርመር ጊዜያዊ (ad hoc) ኮሚቴ ተቋቋመ።'
    }
  },
  {
    id: 'w_ad_hominem',
    term: 'Ad Hominem',
    partOfSpeech: 'adj.',
    category: 'latin_foreign',
    definitionEn: 'Latin for "to the person." Appealing to personal prejudice, bias, or character attack rather than substantive legal reasoning or factual arguments.',
    crossReferences: ['argument', 'objection'],
    om: {
      term: 'Nama Irratti Xiyyeeffachuu / Loogii Dhuunfaa (Ad Hominem)',
      definition: 'Falmii seeraa fi ragaa dhugaa irratti xiyyeeffachuu dhiisanii amala, eenyummaa ykn mudaa dhuunfaa namaa irratti qirqarsuu.',
      usage: 'Abbaan seeraa falmiin abukaattoo ad hominem waan ta\'eef akka dhaabu ajaje.'
    },
    am: {
      term: 'ሰው ላይ ያነጣጠረ ክርክር (Ad Hominem)',
      definition: 'በህጉና በማስረጃው ላይ ከመከራከር ይልቅ የባለጉዳዩን ወይም የጠበቃውን ስብዕናና የግል ህይወት በማንሳት የሚደረግ ህገ-ወጥ ክርክር።',
      usage: 'ዳኛው ክርክሩ ሰው ላይ ያነጣጠረ (ad hominem) መሆኑን በመግለጽ ጠበቃውን አስጠነቀቀ።'
    }
  },
  {
    id: 'w_ad_litem',
    term: 'Ad Litem',
    partOfSpeech: 'adj.',
    phonetic: 'ad LY-tem',
    category: 'latin_foreign',
    definitionEn: 'Latin for "for the suit." Appointed by a court to represent a party who is incompetent, incapacitated, or a minor specifically for the purposes of a pending lawsuit (e.g. guardian ad litem).',
    crossReferences: ['guardian ad litem', 'capacity'],
    om: {
      term: 'Falmii Kana Qofaaf / Ad Litem',
      definition: 'Dhimma falmii mana murtii yeroo sana jiru qofaaf daa\'ima ykn nama dandeettii hin qabne bakka bu\'uuf manni murtii kan muudu.',
      usage: 'Daa\'imichaaf tiksituun ad litem falmii qabeenyaa kana keessatti bakka buutee dhiyaatte.'
    },
    am: {
      term: 'ለዚህ ክስ ብቻ የተወከለ (Ad Litem)',
      definition: 'ህፃናትን ወይም አቅመ-ደካሞችን ለፍርድ ቤት ክርክሩ ብቻ እንዲወክል በፍርድ ቤት የሚሰየም ሞግዚት ወይም ጠበቃ።',
      usage: 'ፍርድ ቤቱ ለህጻኑ ፍላጎት መከበር የጥብቅና ሞግዚት (guardian ad litem) ሰየመ።'
    }
  },
  {
    id: 'w_ad_valorem',
    term: 'Ad Valorem',
    partOfSpeech: 'adj.',
    category: 'latin_foreign',
    definitionEn: 'Latin for "according to value." A tax or duty calculated as a proportional percentage of the assessed value of the property or goods taxed.',
    crossReferences: ['tax', 'property tax', 'tariff'],
    om: {
      term: 'Gatii Irratti Hundaa\'uun (Ad Valorem)',
      definition: 'Gatifi qabeenyaa ykn meeshaa tilmaamame irratti dhibbeentaadhaan gibira ykn taarifa shallagamu.',
      usage: 'Gibirri lafa magaalaa ad valorem shallagamee kaffalama.'
    },
    am: {
      term: 'በዋጋው ልክ የሚሰላ (Ad Valorem)',
      definition: 'ግብር ወይም ታሪፍ የሚሰላው በንብረቱ ወይም በእቃው የተገመተ የገበያ ዋጋ መቶኛ ላይ ተመስርቶ መሆኑን የሚያመለክት።',
      usage: 'የቀረጥ ክፍያው በእቃው ትክክለኛ ዋጋ (ad valorem) መሰረት ተሰላ።'
    }
  },
  {
    id: 'w_adversary_system',
    term: 'Adversary System',
    partOfSpeech: 'n.',
    category: 'civil_procedure',
    definitionEn: 'A legal system of adjudication where two opposing parties, represented by their attorneys, compete against each other to present evidence and arguments to an impartial judge or jury who acts as a neutral decision-maker.',
    crossReferences: ['accusatorial system', 'cross-examination', 'due process'],
    om: {
      term: 'Sirna Falmii Qaamolee Faallaa (Adversary System)',
      definition: 'Sirna abbaa seerummaa gareewwan lamaan abukaattota isaaniitiin ragaalee fi yaada isaanii fuuldura abbaa seeraa walabaatti dhiyeessanii falmatan.',
      usage: 'Sirni falmii Itoophiyaa hedduun isaa adversary system irratti hundaa\'a.'
    },
    am: {
      term: 'የተሟጋቾች የክርክር ስነ-ስርዓት (Adversary System)',
      definition: 'ተከራካሪ ወገኖች በማስረጃና በህግ ራሳቸውን እያቀረቡ ገለልተኛ ዳኛ ወይም ዳኞች ውሳኔ የሚሰጡበት የፍርድ ቤት አሰራር።',
      usage: 'በተሟጋቾች ስነ-ስርዓት መሰረት እያንዳንዱ ወገን ማስረጃውን የማቅረብ ኃላፊነት አለበት።'
    }
  },
  {
    id: 'w_adverse_possession',
    term: 'Adverse Possession',
    partOfSpeech: 'n.',
    category: 'property_real_estate',
    definitionEn: 'A method of acquiring title to real property by continuously, openly, exclusively, and hostilely occupying the land for a statutorily required limitation period.',
    crossReferences: ['quiet title', 'ejectment', 'statute of limitations'],
    om: {
      term: 'Qabiyyee Yeroon Qabachuun Gonfachuun (Adverse Possession)',
      definition: 'Lafa nama biraa osoo hin dhoksin, yeroo dheeraa seeraan murtaa\'eef qabatanii itti fayyadamuun mirga abbaa qabiyyummaa argachuu.',
      usage: 'Itoophiyaa keessatti lafti kan uummataa fi mootummaa waan ta\'eef adverse possession lafa mootummaa irratti hin hojjetu.'
    },
    am: {
      term: 'በይርጋ ባለቤትነትን የማግኘት መብት (Adverse Possession)',
      definition: 'የሌላ ሰውን የማይንቀሳቀስ ንብረት ያለ ማቋረጥ ለህግ በተወሰነ ረጅም ጊዜ በይፋ በመያዝ የባለቤትነት መብት መጠየቅ።',
      usage: 'በኢትዮጵያ የህግ ስርዓት የመንግስት መሬት በይርጋ (adverse possession) አይያዝም።'
    }
  },
  {
    id: 'w_affidavit',
    term: 'Affidavit',
    partOfSpeech: 'n.',
    category: 'civil_procedure',
    definitionEn: 'A voluntary, written statement of facts confirmed by the oath or affirmation of the party making it, signed and sworn to before an officer having legal authority to administer oaths (such as a notary public).',
    crossReferences: ['affirmation', 'jurat', 'notary public', 'perjury'],
    om: {
      term: 'Waraqaa Ragaa Kakuu (Affidavit)',
      definition: 'Barreeffama dhugummaa firii dubbii nama mirkaneessuun mallattaa\'ee fi qaama kakuu fuudhu duratti kakuudhaan mirkanaa\'e.',
      usage: 'Ragaan kun mana murtiitti akka dhiyaatuuf afidaaviitii kakuutiin deeggaramee qophaa\'e.'
    },
    am: {
      term: 'የቃለ-መሃላ ሰነድ (Affidavit)',
      definition: 'አንድ ሰው በማስረጃነት የሚሰጠው እውነተኛ ፍሬ-ነገር በመሃላ ወይም በማረጋገጫ ፊርማ በኖታሪ ፊት የተረጋገጠ የጽሁፍ ሰነድ።',
      usage: 'የቃለ-መሃላ ሰነዱ (affidavit) በሰነዶች ማረጋገጫ ተረጋግጦ ለፍርድ ቤቱ ቀረበ።'
    }
  },
  {
    id: 'w_alibi',
    term: 'Alibi',
    partOfSpeech: 'n.',
    phonetic: 'AL-ih-bye',
    category: 'criminal_evidence',
    definitionEn: 'Latin for "elsewhere." A defense raised by a criminal defendant asserting that he or she was in a location other than the crime scene at the exact time the crime was committed.',
    crossReferences: ['defense', 'burden of proof'],
    om: {
      term: 'Bakka Biraa Turuu (Alibi)',
      definition: 'Ittisa yakkaa kan shakkamaan yeroo yakki sun raawwatametti bakka biraa akka ture ragaan deeggaruun dhiyeessu.',
      usage: 'Himatamaan yeroo ajjeechaan raawwatame magaalaa Finfinnee akka ture ragaa alibi dhiyeesse.'
    },
    am: {
      term: 'በወንጀሉ ቦታ ያለመገኘት መከላከያ (Alibi)',
      definition: 'ወንጀሉ በተፈጸመበት ወቅት ተከሳሹ በሌላ ቦታ እንደነበረ በማስረጃ በማረጋገጥ የሚቀርብ የወንጀል መከላከያ ክርክር።',
      usage: 'ተከሳሹ በወቅቱ በሆስፒታል እንደነበረ በማስረጃ አረጋግጦ የአሊቢ (alibi) መከላከያውን አቀረበ።'
    }
  },
  {
    id: 'w_amicus_curiae',
    term: 'Amicus Curiae',
    partOfSpeech: 'n.',
    phonetic: 'ah-MEE-kus KYOO-ree-eye',
    category: 'latin_foreign',
    definitionEn: 'Latin for "friend of the court." A person or organization that is not a direct party to an action but petitions or is invited by the court to file a brief or present expertise on questions of broad legal significance.',
    crossReferences: ['brief', 'appellate court'],
    om: {
      term: 'Hiriyaa Mana Murtii (Amicus Curiae)',
      definition: 'Garee falmii kallattii kan hin taane garuu beekumsa seeraa ykn ogeessummaa isaatiin mana murtiitiif gorsa kennuuf kan dhiyaatu.',
      usage: 'Dhaabbanni mirga namoomaa dhimma kana irratti akka amicus curiae ta\'ee yaada seeraa dhiyeesse.'
    },
    am: {
      term: 'የፍርድ ቤት ወዳጅ (Amicus Curiae)',
      definition: 'በቀጥታ የክርክሩ ተከራካሪ ያልሆነ ነገር ግን ለጉዳዩ አስፈላጊ የህግ ወይም የሙያ ማብራሪያ እንዲሰጥ በፍርድ ቤት የሚጋበዝ ባለሙያ።',
      usage: 'የህግ ባለሙያዎች ማህበር ለጠቅላይ ፍርድ ቤቱ የፍርድ ቤት ወዳጅ (amicus curiae) ሰነድ አቀረበ።'
    }
  },

  // --- B ---
  {
    id: 'w_bailment',
    term: 'Bailment',
    partOfSpeech: 'n.',
    category: 'contract_commercial',
    definitionEn: 'The delivery of personal property from one person (the bailor) to another (the bailee) in trust for a specific purpose, under an express or implied contract, with the understanding that the property will be returned or disposed of according to directions. Title does not transfer, only possession.',
    subDefinitions: [
      { term: 'Bailee', definition: 'The person who temporarily possesses the property of another.' },
      { term: 'Bailor', definition: 'The person who temporarily entrusts personal property to another.' },
      { term: 'Gratuitous bailment', definition: 'Bailment without financial compensation; liable only for gross negligence.' }
    ],
    crossReferences: ['bailee', 'bailor', 'lease', 'conversion'],
    om: {
      term: 'Amanaan Kaa\'uu / Bailment',
      definition: 'Qabeenya socho\'aa kaayyoo murtaa\'eef nama biraatti abbaa qabeenyummaa osoo hin dabarsin amanatti kennuu fi erga hojiin xumuramee deebisuu.',
      usage: 'Konkolaataa mekaanikaaf suphaaf kennuun seeraan hariiroo bailment uuma.'
    },
    am: {
      term: 'አደራ መስጠት / ኃላፊነት (Bailment)',
      definition: 'ተንቀሳቃሽ ንብረትን ለተወሰነ አገልግሎት ወይም ጥበቃ ለሌላ ሰው በውል መስጠትና አገልግሎቱ ሲያልቅ መመለስ፤ የባለቤትነት መብት አይተላለፍም።',
      usage: 'መኪናውን ለጥገና ጋራዥ መስጠት ህጋዊ የአደራ ውል (bailment) ግንኙነት ይፈጥራል።'
    }
  },
  {
    id: 'w_bona_fide',
    term: 'Bona Fide',
    partOfSpeech: 'adj./adv.',
    phonetic: 'BOH-nah FY-dee',
    category: 'latin_foreign',
    definitionEn: 'Latin for "in good faith." Genuine, honest, real, without fraud, deceit, or intent to take unfair advantage.',
    subDefinitions: [
      { term: 'Bona fide purchaser (BFP)', definition: 'One who purchases property for valuable consideration without notice of any competing claims or defects in title.' }
    ],
    crossReferences: ['good faith', 'purchaser'],
    om: {
      term: 'Amanuullee / Qulqullina Qalbiitiin (Bona Fide)',
      definition: 'Haqaa fi qulqullina sammuutiin, soba fi gowwoomsaa tokko malee amanamee kan raawwatame.',
      usage: 'Bitataan bona fide purchaser waan ta\'eef mirgi qabeenyummaa isaa seeraan eegama.'
    },
    am: {
      term: 'በቅን ልቦና (Bona Fide)',
      definition: 'የላቲን ቃል ሲሆን በቅንነት፣ ያለ ተንኮል ወይም ማታለል የተደረገ እውነተኛ ህጋዊ ተግባር።',
      usage: 'በቅን ልቦና የገዛው ገዢ (bona fide purchaser) በንብረቱ ላይ ያለው መብት በህግ የተጠበቀ ነው።'
    }
  },
  {
    id: 'w_burden_of_proof',
    term: 'Burden of Proof',
    partOfSpeech: 'n.',
    category: 'criminal_evidence',
    definitionEn: 'The duty placed on a party in a legal proceeding to introduce sufficient evidence to prove a factual assertion. Comprises the burden of producing evidence (production) and the burden of persuasion.',
    crossReferences: ['beyond a reasonable doubt', 'preponderance of the evidence', 'prima facie'],
    om: {
      term: 'Ba\'aa Mirkaneessuu (Burden of Proof)',
      definition: 'Dirqama seeraa gareen tokko dhimma falmii keessa jiru ragaa gahaa dhiyeessuun mirkaneessuuf qabu.',
      usage: 'Yakka keessatti ba\'aan mirkaneessuu abbaa alangaa irratti kufa.'
    },
    am: {
      term: 'የማስረዳት ሸክም (Burden of Proof)',
      definition: 'አንድ ተከራካሪ ወገን ያቀረበውን አቤቱታ ወይም መከላከያ በእውነተኛ ማስረጃ የማስደገፍና የማረጋገጥ ህጋዊ ግዴታ።',
      usage: 'በወንጀል ጉዳዮች ላይ የማስረዳት ሸክሙ በዐቃቤ ህግ ላይ የወደቀ ነው።'
    }
  },

  // --- C ---
  {
    id: 'w_caveat_emptor',
    term: 'Caveat Emptor',
    partOfSpeech: 'n.',
    phonetic: 'KAH-vee-aht EMP-tor',
    category: 'latin_foreign',
    definitionEn: 'Latin for "let the buyer beware." The traditional common-law doctrine that the buyer purchases at his own risk and must inspect the quality and suitability of goods, unless there is an express warranty or fraud.',
    crossReferences: ['warranty', 'fraud'],
    om: {
      term: 'Bitataan Haa Of-Eeggatu (Caveat Emptor)',
      definition: 'Qajeeltoo seeraa kan bitataan meeshaa bitatu ofumaa qoratee mirkaneeffachuuf dirqama qabu ibsu.',
      usage: 'Waliigaltee gurgurtaa durii keessatti caveat emptor hojiirra oola ture.'
    },
    am: {
      term: 'ገዢ ይጠንቀቅ (Caveat Emptor)',
      definition: 'ገዢ የሚገዛውን እቃ ወይም ንብረት እራሱ መርምሮ የመረዳት ኃላፊነት እንዳለበት የሚገልጽ የላቲን መርህ።',
      usage: 'ገዢው እቃውን በሚገባ ሳይመረምር በመግዛቱ በገዢ ይጠንቀቅ መርህ ተጎጂ ሆነ።'
    }
  },
  {
    id: 'w_certiorari',
    term: 'Certiorari',
    partOfSpeech: 'n.',
    phonetic: 'ser-shee-oh-RAH-ree',
    category: 'latin_foreign',
    definitionEn: 'Latin for "to be more fully informed." An extraordinary writ or order issued by an appellate court directing a lower court to deliver the record of a case for appellate review.',
    crossReferences: ['appellate review', 'discretionary appeal'],
    om: {
      term: 'Ajaja Galmee Waamsiisuu / Certiorari',
      definition: 'Ajaja manni murtii ol\'aanaan murtii mana murtii jalaa qorachuuf galmee guutuu gara ofiitti akka ergamuuf kennu.',
      usage: 'Manni Murtii Waliigalaa ajaja certiorari baasuun galmee dhimma sanaa gara ofiitti waame.'
    },
    am: {
      term: 'የመዝገብ መጥሪያ ትዕዛዝ (Certiorari)',
      definition: 'የበላይ ፍርድ ቤት የበታች ፍርድ ቤትን ውሳኔ ለመመርመር መዝገቡ ተጠቃሎ እንዲቀርብለት የሚያስተላልፈው ትዕዛዝ።',
      usage: 'ጠቅላይ ፍርድ ቤቱ መዝገቡ ቀርቦ እንዲመረመር የሰርሺዮራሪ ትዕዛዝ ሰጠ።'
    }
  },
  {
    id: 'w_corpus_delicti',
    term: 'Corpus Delicti',
    partOfSpeech: 'n.',
    phonetic: 'KOR-pus dih-LIK-tye',
    category: 'latin_foreign',
    definitionEn: 'Latin for "the body of the crime." The objective, physical proof that a specific criminal act actually occurred (and that someone is criminally responsible), required before a confession alone can sustain a conviction.',
    crossReferences: ['actus reus', 'confession', 'crime'],
    om: {
      term: 'Ragaa Qaama Yakkaa (Corpus Delicti)',
      definition: 'Ragaa qabatamaa yakki sun dhugumaan raawwatamuu isaa mirkaneessu; jecha amantaa qofaan nama adabuu dura qoratama.',
      usage: 'Ajjeechaa keessatti reeffa ykn ragaa qabatamaa dhabuun corpus delicti mirkaneessuu rakkisaa taasise.'
    },
    am: {
      term: 'የወንጀል ፍሬ-ነገር ማረጋገጫ (Corpus Delicti)',
      definition: 'ወንጀሉ በተጨባጭ መፈጸሙን የሚያረጋግጥ አካላዊ ወይም ተጨባጭ ማስረጃ።',
      usage: 'የተከሳሹ ቃል ብቻውን በቂ ባለመሆኑ ወንጀሉ መፈጸሙ በተጨባጭ ማስረጃ (corpus delicti) ተረጋገጠ።'
    }
  },

  // --- D ---
  {
    id: 'w_de_facto',
    term: 'De Facto',
    partOfSpeech: 'adj./adv.',
    phonetic: 'dee FAK-toh',
    category: 'latin_foreign',
    definitionEn: 'Latin for "in fact" or "in reality." Existing in actual reality or practice, whether legally recognized or not; contrast with de jure (by right of law).',
    crossReferences: ['de jure'],
    om: {
      term: 'Qabatamaan Kan Jiru / De Facto',
      definition: 'Seeraan beekamtii argatullee dhabullee, qabatamaan hojiirra kan jiru ykn raawwatamu.',
      usage: 'Mootummaan sun de facto biyyattii bulchaa jira.'
    },
    am: {
      term: 'በተግባር ያለ (De Facto)',
      definition: 'በህግ እውቅና ኖረውም አልኖረውም በተጨባጭ መሬት ላይ ያለን እውነታ የሚያመለክት የላቲን ቃል፤ በተግባር ያለ።',
      usage: 'ምንም እንኳን ህጋዊ እውቅና ባይኖረውም በተግባር (de facto) ስራውን ሲመራ ቆይቷል።'
    }
  },
  {
    id: 'w_due_process',
    term: 'Due Process',
    partOfSpeech: 'n.',
    category: 'constitutional_administrative',
    definitionEn: 'A fundamental constitutional doctrine requiring that any governmental proceeding deprive no person of life, liberty, or property without adequate notice, a fair hearing before a neutral tribunal, and fundamental fairness.',
    subDefinitions: [
      { term: 'Procedural Due Process', definition: 'Requirements of fair notice, opportunity to be heard, and impartial tribunal.' },
      { term: 'Substantive Due Process', definition: 'Requirement that laws not arbitrarily infringe on fundamental rights without compelling state interest.' }
    ],
    crossReferences: ['equal protection', 'fundamental rights', 'fair trial'],
    om: {
      term: 'Adeemsa Seeraa Qajeelaa (Due Process of Law)',
      definition: 'Mirga heeraatiin lammileen osoo beeksifni sirrii hin kennamin, dhaddacha walabaatti osoo hin dhagayamin lubbuu, bilisummaa ykn qabeenya isaanii akka hin dhabne eegu.',
      usage: 'Heerri FDRE keeyyanni 19 fi 20 mirga due process qajeelchatti tura.'
    },
    am: {
      term: 'ህጋዊ የስነ-ስርዓት ፍትህ (Due Process)',
      definition: 'ማንኛውም ሰው ያለ ተገቢ የፍርድ ሂደት እና ያለ በቂ ማስጠንቀቂያ ህይወቱን፣ ነፃነቱን ወይም ንብረቱን እንዳያጣ የሚከላከል መሰረታዊ የህገ-መንግስት መርህ።',
      usage: 'ተከሳሹ ያለ ህጋዊ ስነ-ስርዓት (due process) መብቱ ሊገፈፍ አይችልም።'
    }
  },

  // --- E ---
  {
    id: 'w_eminent_domain',
    term: 'Eminent Domain',
    partOfSpeech: 'n.',
    category: 'constitutional_administrative',
    definitionEn: 'The inherent sovereign power of a government to take private property for public use upon payment of fair and just compensation to the property owner.',
    crossReferences: ['condemnation', 'expropriation', 'just compensation'],
    om: {
      term: 'Aangoo Qabiyyee Faayidaa Ummataaf Fudhachuu (Eminent Domain)',
      definition: 'Aangoo mootummaan qabeenya ykn lafa dhuunfaa faayidaa ummataatiif beenyaa madaalawaa kaffalee fudhachuu qabu.',
      usage: 'Mootummaan bu\'uura Labsii 1161/2011 tiin daandii ijaaruuf qabiyyee dhuunfaa fudhate.'
    },
    am: {
      term: 'ለመንግስት ወይም ለህዝብ ጥቅም መሬት የመውሰድ ስልጣን (Eminent Domain)',
      definition: 'መንግስት ለህዝብ ጥቅም ሲባል ተመጣጣኝ ካሳ በመክፈል የግል ይዞታን የመውሰድ ህጋዊ ስልጣን።',
      usage: 'ለሀዲድ መስመር ግንባታ ሲባል ይዞታው በካሳ ተነስቷል።'
    }
  },
  {
    id: 'w_estoppel',
    term: 'Estoppel',
    partOfSpeech: 'n.',
    category: 'civil_procedure',
    definitionEn: 'A legal bar or doctrine that prevents a party from asserting a claim, fact, or right that contradicts what the party previously stated or agreed to, or where another reasonably relied on the representation to their detriment.',
    subDefinitions: [
      { term: 'Collateral Estoppel', definition: 'Precludes relitigation of an issue already decided in a prior suit between the parties.' },
      { term: 'Promissory Estoppel', definition: 'Enforces a promise without consideration when foreseeable detrimental reliance occurred.' }
    ],
    crossReferences: ['res judicata', 'reliance', 'promissory estoppel'],
    om: {
      term: 'Dhorkaa Faallessuu / Estoppel',
      definition: 'Qajeeltoo seeraa namni tokko waan duraan itti waliigale ykn dubbate faallessuun qaama sadaffaa miidhuu akka hin dandeenye dhoowwu.',
      usage: 'Abbaan qabeenyaa waadaa kenneen promissory estoppel tiin dirqisifame.'
    },
    am: {
      term: 'የቀድሞ ቃልን መካድን መከልከል (Estoppel)',
      definition: 'አንድ ሰው ቀደም ሲል የተናገረውን ወይም የፈጸመውን ተግባር በመካድ ሌላውን ሰው እንዳይጎዳ የሚከለክል የህግ መርህ።',
      usage: 'ተከራካሪው ቀደም ሲል ያመነበትን ፍሬ-ነገር መልሶ እንዳይክድ በህግ ተከለከለ (estoppel)።'
    }
  },

  // --- F ---
  {
    id: 'w_force_majeure',
    term: 'Force Majeure',
    partOfSpeech: 'n.',
    phonetic: 'FORS mah-ZHUR',
    category: 'latin_foreign',
    definitionEn: 'French for "greater force." An extraordinary, unforeseeable event or natural disaster (act of God, war, riot, earthquake) outside the control of the contracting parties that excuses performance of contractual obligations.',
    crossReferences: ['act of God', 'frustration', 'contract'],
    om: {
      term: 'Humnaa Ol / Force Majeure',
      definition: 'Balaa uumamaa ykn taatee namaa ol ta\'e (lola, hookkara, kirkira lafaa) kan waliigaltee raawwachuuf hin dandeessisne fi dirqama irraa nama bilisa baasu.',
      usage: 'Koodii Siivilii keeyyata 1792 bu\'uura godhachuun balaa humnaa oliitiin waliigalteen addaan cite.'
    },
    am: {
      term: 'ከአቅም በላይ የሆነ አደጋ (Force Majeure)',
      definition: 'በተዋዋይ ወገኖች ቁጥጥር ስር ያልሆነ እና ውልን ለመፈጸም የማይቻል የሚያደርግ የተፈጥሮ ወይም የሰው ሰራሽ አደጋ (ጦርነት፣ የመሬት መንቀጥቀጥ)።',
      usage: 'በፍትሐብሔር ህግ ቁጥር 1792 መሰረት ከአቅም በላይ በሆነ ምክንያት ውሉ ተቋረጠ።'
    }
  },

  // --- H ---
  {
    id: 'w_habeas_corpus',
    term: 'Habeas Corpus',
    partOfSpeech: 'n.',
    phonetic: 'HAY-bee-us KOR-pus',
    category: 'latin_foreign',
    definitionEn: 'Latin for "you have the body." A vital constitutional writ demanding that a prisoner or detainee be brought before a court to determine the legality of his detention and order release if unlawful.',
    crossReferences: ['writ', 'due process', 'detention'],
    om: {
      term: 'Waraqaa Qaama Fiduu (Habeas Corpus)',
      definition: 'Ajaja manni murtii nama hidhamee jiru battalatti fuuldura mana murtiitti akka dhiyaatu fi hidhaan isaa seera qabeessa ta\'uu qorachuuf kennu.',
      usage: 'Abukaattoon hidhaa seeraan alaa mormuun iyyata habeas corpus mana murtii olaanaatti dhiyeesse.'
    },
    am: {
      term: 'የእስር ህጋዊነት ማረጋገጫ (Habeas Corpus)',
      definition: 'የላቲን ቃል ሲሆን የታሰረ ሰው በአካል ፍርድ ቤት ቀርቦ የእስሩ ህጋዊነት እንዲመረመርና ህገ-ወጥ ከሆነ እንዲፈታ የሚሰጥ የፍርድ ቤት ትዕዛዝ።',
      usage: 'ጠበቃው ደንበኛቸው ያለፍርድ ቤት ትዕዛዝ በመታሰራቸው የሀቤያስ ኮርፐስ አቤቱታ አቀረቡ።'
    }
  },

  // --- I ---
  {
    id: 'w_injunction',
    term: 'Injunction',
    partOfSpeech: 'n.',
    category: 'civil_procedure',
    definitionEn: 'A court order commanding or prohibiting a specific action. A mandatory injunction compels a party to act; a prohibitory injunction restrains a party from acting.',
    subDefinitions: [
      { term: 'Preliminary Injunction', definition: 'Temporary order preserving status quo pending final trial.' },
      { term: 'Permanent Injunction', definition: 'Final order issued as part of the judgment.' }
    ],
    crossReferences: ['restraining order', 'equitable relief', 'specific performance'],
    om: {
      term: 'Ajaja Dhorkaa / Ajaja Raawwachiisaa (Injunction)',
      definition: 'Ajaja manni murtii gareen tokko gocha tokko akka raawwatu ykn akka hin raawwanne dirqisiisuun kennu.',
      usage: 'Manni murtii ijaarsi lafa falmisiisaa irratti gaggeeffamu akka dhaabbatu ajaja dhorkaa kenne.'
    },
    am: {
      term: 'የእግድ ትዕዛዝ (Injunction)',
      definition: 'አንድ ወገን አንድን ተግባር እንዳይፈጽም የሚከለክል ወይም እንዲፈጽም የሚያስገድድ የፍርድ ቤት ትዕዛዝ።',
      usage: 'ፍርድ ቤቱ በይዞታው ላይ የሚደረገው ግንባታ በአስቸኳይ እንዲቆም የእግድ ትዕዛዝ ሰጠ።'
    }
  },

  // --- M ---
  {
    id: 'w_mens_rea',
    term: 'Mens Rea',
    partOfSpeech: 'n.',
    phonetic: 'MENZ RAY-ah',
    category: 'latin_foreign',
    definitionEn: 'Latin for "guilty mind." The wrongful mental intent, knowledge, or recklessness that accompanies a criminal act, required for criminal culpability.',
    crossReferences: ['actus reus', 'criminal intent', 'strict liability'],
    om: {
      term: 'Yaada Badii / Qalbii Badii (Mens Rea)',
      definition: 'Yaada ykn qalbii nama yakka raawwate keessatti ta\'e jedhee ykn danta-dhabdummaadhaan badii raawwachuuf ture.',
      usage: 'Yakki ajjeechaa ta\'e jedhee raawwatame jedhamuuf mens rea mirkanaa\'uu qaba.'
    },
    am: {
      term: 'የወንጀል አሳብ / የጥፋተኝነት መንፈስ (Mens Rea)',
      definition: 'የላቲን ቃል ሲሆን ወንጀል ሲፈጸም የተከሳሹን የጥፋተኝነት ሀሳብ፣ እውቀት ወይም ቸልተኝነት የሚያሳይ የአእምሮ ዝንባሌ።',
      usage: 'ተከሳሹ ሆን ብሎ ወንጀሉን ለመፈጸም የወንጀል አሳብ (mens rea) እንደነበረው ተረጋግጧል።'
    }
  },

  // --- P ---
  {
    id: 'w_prima_facie',
    term: 'Prima Facie',
    partOfSpeech: 'adv./adj.',
    phonetic: 'PRY-mah FAY-shee',
    category: 'latin_foreign',
    definitionEn: 'Latin for "at first sight." Evidence that is sufficient to establish a fact or raise a presumption of fact unless rebutted or disproved by evidence to the contrary.',
    crossReferences: ['burden of proof', 'rebuttable presumption'],
    om: {
      term: 'Mul\'ata Duraatiin / Prima Facie',
      definition: 'Ragaa jalqaba irratti dhiyaatee dhugaa fakkaatu fi hanga ragaan faallaa dhiyaatutti fudhatama argatu.',
      usage: 'Himataan ragaa prima facie waan dhiyeesseef ba\'aan mirkaneessuu gara himatamaatti darbe.'
    },
    am: {
      term: 'በመጀመሪያ እይታ አሳማኝ (Prima Facie)',
      definition: 'ተቃራኒ ማስረጃ እስካልቀረበ ድረስ አንድን ፍሬ-ነገር ለማረጋገጥ በመጀመሪያ ደረጃ በቂ ሆኖ የሚወሰድ ማስረጃ።',
      usage: 'ከሳሽ በመጀመሪያ እይታ አሳማኝ (prima facie) ማስረጃ በማቅረቡ ክሱ ተቀባይነት አገኘ።'
    }
  },

  // --- R ---
  {
    id: 'w_res_judicata',
    term: 'Res Judicata',
    partOfSpeech: 'n.',
    phonetic: 'REEZ joo-dih-KAH-tah',
    category: 'latin_foreign',
    definitionEn: 'Latin for "a thing decided." An absolute bar against relitigating a claim or cause of action between the same parties once a competent court has entered a final judgment on the merits.',
    crossReferences: ['collateral estoppel', 'SDFHH Art. 5', 'final judgment'],
    om: {
      term: 'Dhimma Murtii Dhumaa Argate (Res Judicata)',
      definition: 'Dhimma firii dubbii fi hundeen isaa tokko ta\'e, gareewwan walfakkaatan gidduutti manni murtii murtii dhumaa erga irratti kennee booda irra deebiin akka hin dhiyaanne dhorkuu.',
      usage: 'SDFHH keeyyata 5 bu\'uura godhachuun falmiin duraan xumurame res judicata jedhamee cufame.'
    },
    am: {
      term: 'ቀደም ሲል የተወሰነ ጉዳይ (Res Judicata)',
      definition: 'አንድ አይነት ጭብጥ ባለው ጉዳይ በተመሳሳይ ወገኖች መካከል ስልጣን ባለው ፍርድ ቤት የመጨረሻ ውሳኔ የተሰጠበት ጉዳይ ዳግም እንዳይከራከር የሚከለክል የህግ መርህ።',
      usage: 'ጉዳዩ ቀደም ሲል ውሳኔ ያገኘ (res judicata) በመሆኑ የከሳሽ አዲስ ክስ ውድቅ ተደረገ።'
    }
  },
  {
    id: 'w_stare_decisis',
    term: 'Stare Decisis',
    partOfSpeech: 'n.',
    phonetic: 'STAH-ray dih-SY-sis',
    category: 'latin_foreign',
    definitionEn: 'Latin for "to stand by things decided." The common-law doctrine of following judicial precedent established in previous rulings.',
    crossReferences: ['precedent', 'binding authority'],
    om: {
      term: 'Murtii Duraaniitiin Maskamuu (Stare Decisis)',
      definition: 'Manneen murtii murtiiwwan duraanii kan dhimma walfakkaatu irratti kennaman bu\'uura godhatanii murtii wal-fakkaatu akka kennan dirqisiisu.',
      usage: 'Murtiin Dhaddacha Ijoo bu\'uura qajeeltoo stare decisis tiin manneen murtii jalaa hunda ni dirqisiisa.'
    },
    am: {
      term: 'በቀድሞ ውሳኔ መመራት (Stare Decisis)',
      definition: 'ፍርድ ቤቶች በተመሳሳይ የህግ ጭብጦች ላይ ከዚህ ቀደም የተሰጡ አስገዳጅ የፍርድ ቤት ውሳኔዎችን (ቅድመ-ውሳኔዎችን) አክብረው እንዲፈርዱ የሚያስገድድ መርህ።',
      usage: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ውሳኔዎች በሁሉም ፍርድ ቤቶች እንደ stare decisis አስገዳጅ ናቸው።'
    }
  },
  {
    id: 'w_subpoena',
    term: 'Subpoena',
    partOfSpeech: 'n./v.',
    phonetic: 'suh-PEE-nah',
    category: 'latin_foreign',
    definitionEn: 'Latin for "under penalty." A writ issued by a court commanding a person to appear at a designated time and place to testify as a witness or produce physical documents.',
    subDefinitions: [
      { term: 'Subpoena ad testificandum', definition: 'Orders a witness to appear and provide oral testimony.' },
      { term: 'Subpoena duces tecum', definition: 'Orders a witness to bring specified documents, books, or records.' }
    ],
    crossReferences: ['summons', 'witness', 'contempt of court'],
    om: {
      term: 'Ajaja Waamichaa (Subpoena)',
      definition: 'Ajaja manni murtii namni tokko akka dhiyaatee ragaa ba\'u ykn sanada dhiyeessu dirqisiisu, yoo dhiisuu baate adabbiin kan hordofsiisu.',
      usage: 'Ragaan sun ajaja subpoena duces tecum tiin sanada herregaa baankii fidee dhiyaate.'
    },
    am: {
      term: 'የምስክር መጥሪያ ትዕዛዝ (Subpoena)',
      definition: 'አንድ ሰው ፍርድ ቤት ቀርቦ ምስክርነት እንዲሰጥ ወይም ሰነዶችን ይዞ እንዲቀርብ የሚያስገድድ የፍርድ ቤት መጥሪያ።',
      usage: 'ፍርድ ቤቱ ምስክሩ ሰነዶቹን ይዞ እንዲቀርብ የሰበፒና (subpoena duces tecum) ትዕዛዝ ሰጠ።'
    }
  },
  {
    id: 'w_ultra_vires',
    term: 'Ultra Vires',
    partOfSpeech: 'adj./adv.',
    phonetic: 'UL-trah VY-reez',
    category: 'latin_foreign',
    definitionEn: 'Latin for "beyond powers." Acts performed by a corporation, government agency, or public officer that exceed the legal authority granted by statute, charter, or constitution.',
    crossReferences: ['jurisdiction', 'authority', 'void'],
    om: {
      term: 'Aangoon Olii / Ultra Vires',
      definition: 'Gocha ykn murtoo daangaa aangoo seeraan ykn heeraan kennamee ol darbee qaama tokkoon raawwatamee fi gatii seeraa hin qabne.',
      usage: 'Qajeelfamni ministeerichi baase Labsii waliin waan wal-faallesseef ultra vires ta\'uun murtii argate.'
    },
    am: {
      term: 'ከስልጣን በላይ (Ultra Vires)',
      definition: 'የላቲን ቃል ሲሆን አንድ የመንግስት አካል ወይም ድርጅት በህግ ወይም በህገ-መንግስት ከተሰጠው የስልጣን ወሰን በላይ የሚፈጽመው ህገ-ወጥ ድርጊት።',
      usage: 'የመመሪያው አንቀጽ ከዋናው አዋጅ ስልጣን በላይ (ultra vires) በመሆኑ ተፈጻሚነት እንዳይኖረው ተደረገ።'
    }
  }
];

// =========================================================================
// 2. APPENDIX A: STANDARD LEGAL ABBREVIATIONS
// =========================================================================
export const WEBSTER_LEGAL_ABBREVIATIONS: LegalAbbreviation[] = [
  {
    abbr: 'AAA',
    fullForm: 'American Arbitration Association',
    meaningEn: 'National organization promoting alternative dispute resolution through arbitration.',
    meaningOm: 'Dhaabbata qorannoo fi araara daldalaa fi hojjettootaa qajeelchu.',
    meaningAm: 'የአሜሪካ የግልግል ዳኝነት ማህበር።'
  },
  {
    abbr: 'ABA',
    fullForm: 'American Bar Association',
    meaningEn: 'Largest professional association of lawyers, promoting legal education and judicial ethics.',
    meaningOm: 'Waldaa Abukaattotaa gurguddaa qajeelfama ogummaa fi seeraa qopheessu.',
    meaningAm: 'የአሜሪካ የህግ ባለሙያዎች (ጠበቆች) ማህበር።'
  },
  {
    abbr: 'ADR',
    fullForm: 'Alternative Dispute Resolution',
    meaningEn: 'Formal mechanisms to settle disputes outside the courtroom (arbitration, mediation, conciliation).',
    meaningOm: 'Sirna furmaata walitti bu\'iinsaa mana murtiin ala ta\'an (araara, jaarsummaa).',
    meaningAm: 'አማራጭ የክርክር መፍቻ ዘዴዎች (ድርድር፣ እርቅ፣ የግልግል ዳኝነት)።'
  },
  {
    abbr: 'CFR',
    fullForm: 'Code of Federal Regulations',
    meaningEn: 'Official annual compilation of all federal administrative regulations and rules in effect.',
    meaningOm: 'Kuusaa dambiiwwan fi qajeelfamoota bulchiinsa federaalaa.',
    meaningAm: 'የፌዴራል አስተዳደራዊ ደንቦችና መመሪያዎች መድብል።'
  },
  {
    abbr: 'FOIA',
    fullForm: 'Freedom of Information Act',
    meaningEn: 'Statute requiring public disclosure of governmental agency documents upon request.',
    meaningOm: 'Seera odeeffannoo fi galmee mootummaa uummataaf banaa taasiisu.',
    meaningAm: 'የመረጃ ነጻነት አዋጅ።'
  },
  {
    abbr: 'LLC',
    fullForm: 'Limited Liability Company',
    meaningEn: 'Business entity providing limited liability protection for owners with partnership pass-through taxation.',
    meaningOm: 'Dhaabbata daldalaa itti-gaafatamummaan abbootii qabeenyaa murtaa\'e.',
    meaningAm: 'ኃላፊነቱ የተወሰነ የግል ማህበር።'
  },
  {
    abbr: 'RICO',
    fullForm: 'Racketeer Influenced and Corrupt Organizations Act',
    meaningEn: 'Federal criminal statute targeting organized crime syndicates and ongoing patterns of racketeering.',
    meaningOm: 'Seera yakka qindaa\'aa fi malaamaltummaa dhaabbilee adabu.',
    meaningAm: 'የተደራጁ የወንጀል ቡድኖችና የሙስና መከላከያ አዋጅ።'
  },
  {
    abbr: 'SEC',
    fullForm: 'Securities and Exchange Commission',
    meaningEn: 'Federal agency that regulates stocks, bonds, and financial securities markets.',
    meaningOm: 'Koomishinii gabaa aksiyoonaa fi maallaqaa to\'atu.',
    meaningAm: 'የሰነደ-ሙዓለ ንዋይና የገበያ ተቆጣጣሪ ኮሚሽን።'
  },
  {
    abbr: 'TRO',
    fullForm: 'Temporary Restraining Order',
    meaningEn: 'Immediate, short-term emergency court order prohibiting harmful acts before a full hearing.',
    meaningOm: 'Ajaja dhorkaa ariifachiisaa yeroo gabaabaa.',
    meaningAm: 'አስቸኳይ ጊዜያዊ የእግድ ትዕዛዝ።'
  },
  {
    abbr: 'UCC',
    fullForm: 'Uniform Commercial Code',
    meaningEn: 'Standardized comprehensive statutory framework governing commercial transactions and sales of goods.',
    meaningOm: 'Koodii daldalaa wal-simataa daldala meeshaalee qajeelchu.',
    meaningAm: 'ወጥ የንግድ ህግ።'
  }
];

// =========================================================================
// 3. APPENDIX B: FOREIGN WORDS & LATIN LEGAL MAXIMS
// =========================================================================
export const WEBSTER_LATIN_LEGAL_MAXIMS: LatinLegalMaxim[] = [
  {
    phrase: 'Actus non facit reum nisi mens sit rea',
    language: 'Latin',
    literalTranslation: 'An act does not make a person guilty unless the mind is also guilty.',
    legalMeaningEn: 'A fundamental principle of criminal law: both a wrongful physical act (actus reus) and a guilty criminal state of mind (mens rea) must concur.',
    legalMeaningOm: 'Gochi nama tokkoo yakka kan hin taasisne yaanni isaas yoo yakka hin ta\'in (mens rea fi actus reus walitti dhufeenya qabaachuu qabu).',
    legalMeaningAm: 'አካላዊ ድርጊቱ ብቻውን ወንጀል አያሰኝም፣ አእምሮአዊ የወንጀል አሳብም አብሮ መኖር አለበት።'
  },
  {
    phrase: 'Bona fide',
    language: 'Latin',
    literalTranslation: 'In good faith.',
    legalMeaningEn: 'Made or done in good faith; honest, sincere, genuine, without intent to defraud.',
    legalMeaningOm: 'Qulqullina qalbiitiin, amanamummaan, fi soba malee.',
    legalMeaningAm: 'በቅን ልቦና፤ በታማኝነትና ያለ ማታለል።'
  },
  {
    phrase: 'Ignorantia juris non excusat',
    language: 'Latin',
    literalTranslation: 'Ignorance of the law excuses not.',
    legalMeaningEn: 'Every citizen is presumed to know the law; not knowing a criminal or civil law is not an admissible defense.',
    legalMeaningOm: 'Seera wallaaluun ittisa seeraa hin ta\'u; namni kamiyyuu seera beeka jedhamee tilmaamama.',
    legalMeaningAm: 'ህግን አለማወቅ ይቅርታ አያሰጥም፤ ማንም ሰው ህግን እንደሚያውቅ ይገመታል።'
  },
  {
    phrase: 'Nemo debet bis vexari pro una et eadem causa',
    language: 'Latin',
    literalTranslation: 'No one should be twice vexed for one and the same cause.',
    legalMeaningEn: 'The root principle behind Double Jeopardy and Res Judicata: a person should not be subjected to multiple trials or lawsuits for the exact same offense.',
    legalMeaningOm: 'Namni tokko yakka tokkoof yeroo lammaffaa hin himatamu ykn hin falmisiifamu (Double Jeopardy / Res Judicata).',
    legalMeaningAm: 'ማንም ሰው በአንድ ወንጀል ምክንያት ሁለት ጊዜ ክስ ወይም ስቃይ ሊደርስበት አይገባም።'
  },
  {
    phrase: 'Pacta sunt servanda',
    language: 'Latin',
    literalTranslation: 'Agreements must be kept.',
    legalMeaningEn: 'A cornerstone of contract and international treaty law: parties to an agreement must faithfully honor their voluntary commitments.',
    legalMeaningOm: 'Waliigalteen seeraan qophaa\'e eegamuu fi raawwatamuu qaba.',
    legalMeaningAm: 'የተደረጉ ስምምነቶች መከበር አለባቸው።'
  },
  {
    phrase: 'Res ipsa loquitur',
    language: 'Latin',
    literalTranslation: 'The thing speaks for itself.',
    legalMeaningEn: 'In tort law, the doctrine that the mere occurrence of an accident creates an inference of negligence because the accident could not have occurred without fault.',
    legalMeaningOm: 'Dhimmi sun ofiin dubbata; taateen sun qofti danta-dhabdummaan jiraachuu isaa agarsiisa.',
    legalMeaningAm: 'ድርጊቱ ራሱ ይናገራል፤ አደጋው የደረሰበት ሁኔታ ብቻውን የቸልተኝነት መኖርን ያረጋግጣል።'
  },
  {
    phrase: 'Respondeat superior',
    language: 'Latin',
    literalTranslation: 'Let the master answer.',
    legalMeaningEn: 'A master/employer is held vicariously liable for the wrongful acts or torts of an employee committed within the scope of employment.',
    legalMeaningOm: 'Gooftaan haa deebisu; hojjechiisaan gocha balleessaa hojjetaa isaa daangaa hojii keessatti raawwateef itti gaafatama.',
    legalMeaningAm: 'አሰሪው መልስ ይስጥ፤ አሰሪ ለሰራተኛው የስራ ላይ ጥፋቶች በህግ ተጠያቂ ይሆናል።'
  },
  {
    phrase: 'Volenti non fit injuria',
    language: 'Latin',
    literalTranslation: 'To a willing person, injury is not done.',
    legalMeaningEn: 'One who knowingly and voluntarily consents to a dangerous activity or risk cannot recover damages for resulting injury (assumption of risk).',
    legalMeaningOm: 'Nama fedhaan miidhaaf of saaxile irratti miidhaan seeraan hin lakkaa\'amu.',
    legalMeaningAm: 'ፈቅዶ ለገባበት ጉዳት ካሳ አይጠየቅም (አደጋውን ፈቅዶ መቀበል)።'
  }
];

// Helper functions for easy querying
export function searchWebsterDictionary(query: string): WebsterDictionaryEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return WEBSTER_DICTIONARY_ENTRIES;

  return WEBSTER_DICTIONARY_ENTRIES.filter((entry) => {
    return (
      entry.term.toLowerCase().includes(q) ||
      entry.definitionEn.toLowerCase().includes(q) ||
      entry.om.term.toLowerCase().includes(q) ||
      entry.om.definition.toLowerCase().includes(q) ||
      entry.am.term.toLowerCase().includes(q) ||
      entry.am.definition.toLowerCase().includes(q) ||
      entry.category.toLowerCase().includes(q)
    );
  });
}

export function searchLegalAbbreviations(query: string): LegalAbbreviation[] {
  const q = query.toLowerCase().trim();
  if (!q) return WEBSTER_LEGAL_ABBREVIATIONS;

  return WEBSTER_LEGAL_ABBREVIATIONS.filter((item) => {
    return (
      item.abbr.toLowerCase().includes(q) ||
      item.fullForm.toLowerCase().includes(q) ||
      item.meaningEn.toLowerCase().includes(q) ||
      item.meaningOm.toLowerCase().includes(q) ||
      item.meaningAm.toLowerCase().includes(q)
    );
  });
}

export function searchLatinMaxims(query: string): LatinLegalMaxim[] {
  const q = query.toLowerCase().trim();
  if (!q) return WEBSTER_LATIN_LEGAL_MAXIMS;

  return WEBSTER_LATIN_LEGAL_MAXIMS.filter((item) => {
    return (
      item.phrase.toLowerCase().includes(q) ||
      item.literalTranslation.toLowerCase().includes(q) ||
      item.legalMeaningEn.toLowerCase().includes(q) ||
      item.legalMeaningOm.toLowerCase().includes(q) ||
      item.legalMeaningAm.toLowerCase().includes(q)
    );
  });
}
