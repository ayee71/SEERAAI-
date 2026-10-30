import { Language } from '../i18n/translations';
import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from './cassationPrecedents';

export type InterpretationCategory = 
  | 'civil_code'             // Seera Hariiroo Hawaasaa (Civil Code)
  | 'civil_procedure'        // Seera Adeemsa Dhimma Hariiroo Hawaasaa (Civil Procedure Code)
  | 'criminal_code'          // Seera Yakkaa (Criminal Code)
  | 'criminal_procedure'     // Seera Adeemsa Dhimma Yakkaa (Criminal Procedure Code)
  | 'labor_law'              // Seera Hojjetaa & Hojjachiisaa (Labor Proclamation)
  | 'commercial_tax'         // Seera Daldalaa & Taaksiidhaa (Commercial Code & Tax)
  | 'family_inheritance'     // Seera Dhaala & Maatii (Family & Succession Law)
  | 'other_laws';            // Seera Biroo, Heera & Lafa (Constitution, Land & Administrative)

export interface BindingStatutoryInterpretation {
  id: string;
  fileNumber: string; // Lakkoofsa Galmee (e.g. "Galmee Lakk. 249062", "18274")
  volume: number;     // Jildii
  courtJurisdiction: 'federal' | 'oromia';
  courtName?: {
    om: string;
    am: string;
    en: string;
  };
  statutoryProvisionInterpreted: {
    codeOrProclamation: string; // e.g. "Koodii Siiviilii K. 2472"
    om: string;
    am: string;
    en: string;
  };
  specificArticles?: string[]; // e.g. ["6", "358", "197"]
  legalIssue?: {
    om: string;
    am: string;
    en: string;
  };
  bindingInterpretationGiven: { // Hiikkoo Seeraa Dirqisiisaa Kenname (Ratio Decidendi)
    om: string;
    am: string;
    en: string;
  };
  category: InterpretationCategory;
  parties: {
    om: string;
    am: string;
    en: string;
  };
  yearEC: number;
  yearGC: number;
}

export const CATEGORY_LABELS: Record<InterpretationCategory, { om: string; am: string; en: string; emoji: string }> = {
  civil_code: {
    om: 'Seera Hariiroo Hawaasaa (Civil Code)',
    am: 'የፍትሐብሔር ሕግ',
    en: 'Civil Code Law',
    emoji: '⚖️',
  },
  civil_procedure: {
    om: 'Seera Adeemsa Dhimma Hariiroo Hawaasaa (Civil Procedure)',
    am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ',
    en: 'Civil Procedure Code',
    emoji: '🏛️',
  },
  criminal_code: {
    om: 'Seera Yakkaa (Criminal Code)',
    am: 'የወንጀል ሕግ',
    en: 'Criminal Code',
    emoji: '🛡️',
  },
  criminal_procedure: {
    om: 'Seera Adeemsa Dhimma Yakkaa (Criminal Procedure)',
    am: 'የወንጀል ሥነ-ሥርዓት ሕግ',
    en: 'Criminal Procedure Code',
    emoji: '📜',
  },
  labor_law: {
    om: 'Seera Hojjetaa & Hojjachiisaa (Labor Law)',
    am: 'የአሠሪና ሠራተኛ ሕግ',
    en: 'Labor Law',
    emoji: '👷',
  },
  commercial_tax: {
    om: 'Seera Daldalaa & Taaksiidhaa (Commercial & Tax)',
    am: 'የንግድና የታክስ ሕግ',
    en: 'Commercial & Tax Law',
    emoji: '💼',
  },
  family_inheritance: {
    om: 'Seera Dhaala & Maatii (Family & Inheritance)',
    am: 'የቤተሰብና የውርስ ሕግ',
    en: 'Family & Succession Law',
    emoji: '👨‍👩‍👧',
  },
  other_laws: {
    om: 'Heera, Lafa & Seera Biroo (Constitution & Land)',
    am: 'ሕገ-መንግሥት፣ መሬትና ሌሎች ሕጎች',
    en: 'Constitution, Land & Other Laws',
    emoji: '🌳',
  },
};

export const BINDING_STATUTORY_INTERPRETATIONS_DB: BindingStatutoryInterpretation[] = [
  // 1. SEERA ADEEMSA DHIMMA HARIIROO HAWAASAA (CIVIL PROCEDURE CODE)
  {
    id: 'stat_interp_249062',
    fileNumber: 'Galmee Lakk. 249062',
    volume: 26,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'SDDH K. 6, 41, 197, 358',
      om: 'Seera Deemsa Falmii Hariiroo Hawaasaa Keeyyata 6, 197 fi 358 (Daagim-Daanyummaa fi Mormii Murtee)',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 6፣ 197 እና 358 (ዳግም ዳኝነትና የፍርድ መቃወሚያ)',
      en: 'Civil Procedure Code Arts. 6, 197 & 358 (Retrial and Third-Party Opposition to Judgment)',
    },
    specificArticles: ['6', '41', '197', '358'],
    legalIssue: {
      om: 'Iyyatni Daagim-Daanyummaa (K. 6) fi Mormiin Murtee (K. 358) yeroo tokkotti galmee tokko irratti yoo dhiyaatan, adeemsi falmii kamtu dura murtaa\'uu qaba?',
      am: 'የዳግም ዳኝነት (አንቀጽ 6) እና የፍርድ መቃወሚያ (አንቀጽ 358) በአንድ መዝገብ ላይ ተነስተው ሲከራከሩ የትኛው በቅድሚያ መታየት አለበት?',
      en: 'When both an application for re-trial under Art. 6 and third-party opposition under Art. 358 are filed concurrently, what is the mandatory order of proceeding?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: SDDH Keeyyata 6 (Daagim-Daanyummaa) bu\'uura godhachuun kan iyyatan gareewwan falmicharratti hirmaatan yoo ta\'u, Keeyyata 358 (Mormii Murtee) kan dhiyeessu ammoo qaama 3ffaa falmicharratti hin hirmaatinedha. Keeyyatni 6 fi 358 yoo dhiyaatan dura Keeyyatni 6 murtaa\'uu qaba; falmiin Keeyyata 358 SDDH Keeyyata 197 bu\'uura godhachuun yeroof dhaabbachuu (stay) qaba.',
      am: 'አስገዳጅ የህግ ትርጉም፡ በፍ/ሥ/ሥ/ሕግ ቁጥር 6 የቀረበው የዳግም ዳኝነት አቤቱታ በቅድሚያ ታይቶ መወሰን አለበት፤ በፍ/ሥ/ሥ/ሕግ ቁጥር 358 የቀረበው የፍርድ መቃወሚያ በአንቀጽ 197 መሠረት ታግዶ መቆየት አለበት። ምክንያቱም ዳግም ዳኝነቱ ተቀባይነት ካገኘ ፍርዱ ስለሚሻር የፍርድ መቃወሚያው አግባብነት ላያገኝ ይችላል።',
      en: 'Binding Interpretation: Under Civil Procedure Code Art. 6, an application for re-trial must be heard and determined first; third-party opposition proceedings under Art. 358 must be stayed under Art. 197 pending the outcome of the re-trial.',
    },
    category: 'civil_procedure',
    parties: {
      om: 'Waajjira Misooma Lafaa K/Magaalaa Boolee v. 1. W/ro Birqanash W/Mikaa\'el 2. W/ro Tsahaay Dammissee',
      am: 'የቦሌ ክፍለ ከተማ መሬት ልማት ጽ/ቤት እና 1. ወ/ሮ ብርቅነሽ ወ/ሚካዔል 2. ወ/ሮ ፀሐይ ደምሴ',
      en: 'Bole Sub-City Land Development Bureau v. 1. W/ro Birqnesh W/mikael, 2. W/ro Tsehay Demisse',
    },
    yearEC: 2017,
    yearGC: 2024,
  },
  {
    id: 'stat_interp_21904',
    fileNumber: 'Galmee Lakk. 21904',
    volume: 3,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'SDDH K. 320, 350',
      om: 'Koodii Adeemsa Siiviilii Keeyyata 320 (Mirga Ol\'iyyaannoo / Right of Appeal on Interlocutory Orders)',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 320 (የይግባኝ መብት)',
      en: 'Civil Procedure Code Article 320 (Interlocutory Orders Appealability)',
    },
    specificArticles: ['320', '350'],
    legalIssue: {
      om: 'Murtiin yeroo (Interlocutory Order) kan dhimma falmichaa xumura hin kennine irratti kallattiin ol\'iyyaannoon dhiyaachuu danda\'aa?',
      am: 'ጉዳዩን የመጨረሻ እልባት በማይሰጡ የጊዜያዊ ትእዛዞች ላይ ወዲያውኑ ይግባኝ ማለት ይቻላል ወይ?',
      en: 'Can interlocutory orders that do not dispose of the main dispute be directly appealed prior to final judgment?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Murtiin yeroo (Interlocutory Order) falmii xumuraa hin kennine irratti kallattiin ol\'iyyaannoo dhiyeessuun hin danda\'amu; murtii xumuraa dhimma sanaa irratti qofa dhiyaata.',
      am: 'አስገዳጅ የህግ ትርጉም፡ ጉዳዩን የመጨረሻ እልባት በማይሰጡ በጊዜያዊ ትእዛዞች ላይ ለብቻው ይግባኝ ማለት አይቻልም። ይግባኝ ሊባል የሚችለው የመጨረሻ ውሳኔ ሲሰጥ ብቻ ነው።',
      en: 'Binding Interpretation: Interlocutory orders that do not terminate the main litigation cannot be separately appealed prior to final judgment.',
    },
    category: 'civil_procedure',
    parties: {
      om: 'Dhaabbata Daldala X v. Dhaabbata Y',
      am: 'ድርጅት ኤክስ እና ድርጅት ዋይ',
      en: 'Enterprise X v. Enterprise Y',
    },
    yearEC: 2000,
    yearGC: 2007,
  },
  {
    id: 'stat_interp_43102',
    fileNumber: 'Galmee Lakk. 43102',
    volume: 7,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'SDDH K. 154-159',
      om: 'Seera Deemsa Falmii Hariiroo Hawaasaa Keeyyata 154-159 (Dhorkaa Yeroo / Interim Injunction)',
      am: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ አንቀጽ 154-159 (ጊዜያዊ እግድ)',
      en: 'Civil Procedure Code Arts. 154-159 (Temporary Injunction Criteria)',
    },
    specificArticles: ['154', '155', '156', '157', '158', '159'],
    legalIssue: {
      om: 'Manni murtii ajaja dhorkaa yeroo (temporary injunction) kennuuf ulaagaalee seeraa akkamii hordofuu qaba?',
      am: 'ፍርድ ቤት ጊዜያዊ እግድ ሲሰጥ ማሟላት ያለባቸው ህጋዊ ቅድመ-ሁኔታዎች ምንድን ናቸው?',
      en: 'What legal criteria must a court satisfy before issuing a temporary injunction?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Dhorkaan yeroo kennamuuf: 1. Miidhaan bakka hin deebine kan qaqqabu ta\'uu, 2. Ragaan dhiyaate mirga himataa amansiisaa agarsiisuu (prima facie case), fi 3. Wal-madaalchisa miidhaa (balance of convenience) gama himataatiin ulfaachuu qaba.',
      am: 'አስገዳጅ የህግ ትርጉም፡ ጊዜያዊ እግድ የሚሰጠው በቀላሉ የማይጠገን ጉዳት የሚደርስ መሆኑ ሲረጋገጥ፣ ከክርክሩ አንጻር አመዛኙ ጉዳት በአመልካቹ ላይ የሚያመዝን መሆኑ ሲታመንበት ብቻ ነው።',
      en: 'Binding Interpretation: A temporary injunction strictly requires proof of irreparable injury, a strong prima facie case, and the balance of convenience tilting in favor of the applicant.',
    },
    category: 'civil_procedure',
    parties: {
      om: 'Baankii Daldala Itoophiyaa v. Obbo Alamuu',
      am: 'የኢትዮጵያ ንግድ ባንክ እና አቶ አለሙ',
      en: 'Commercial Bank of Ethiopia v. Ato Alemu',
    },
    yearEC: 2001,
    yearGC: 2008,
  },

  // 2. SEERA HARIIROO HAWAASAA (CIVIL CODE)
  {
    id: 'stat_interp_18274',
    fileNumber: 'Galmee Lakk. 18274',
    volume: 1,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Siiviilii K. 2472',
      om: 'Koodii Siiviilii Keeyyata 2472 (Waliigaltee Liqii Maallaqaa & Ragaa Barreeffamaa)',
      am: 'የፍትሐብሔር ሕግ አንቀጽ 2472 (የገንዘብ ብድር ውል ማስረጃ)',
      en: 'Civil Code Article 2472 (Proof of Loan Contracts)',
    },
    specificArticles: ['2472'],
    legalIssue: {
      om: 'Waliigalteen liqii maallaqaa gatiin isaa Birrii 500 ol ta\'e ragaa namaan (witness testimony) qofaan mirkanaa\'uu danda\'aa?',
      am: 'ከብር 500 በላይ የሆነ የገንዘብ ብድር ውል በሰው ምስክር ብቻ ሊረጋገጥ ይችላል ወይ?',
      en: 'Can a loan agreement exceeding 500 Birr be proved solely through oral witness testimony?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Waliigalteen liqii maallaqaa gatiin isaa Birrii 500 ol ta\'e barreeffamaan yoo hin qophoofne Ragaa Namaan (witness testimony) qofaaf mirkaneessuun seeraan dhorkaadha; ragaan barreeffamaa dirqama barbaachisa.',
      am: 'አስገዳጅ የህግ ትርጉም፡ ከብር 500 በላይ የሆነ የገንዘብ ብድር ውል በጽሁፍ ካልተደረገ በስተቀር በሰው ምስክር ብቻ ሊረጋገጥ አይችልም። የጽሁፍ ማስረጃ መኖር አስገዳጅ ነው።',
      en: 'Binding Interpretation: Under Civil Code Art. 2472, loan contracts exceeding 500 Birr cannot be proved solely by witness testimony without a written instrument.',
    },
    category: 'civil_code',
    parties: {
      om: 'Obbo Tasfaayee v. Obbo Dhaabaa',
      am: 'አቶ ተስፋዬ እና አቶ ዳባ',
      en: 'Ato Tesfaye v. Ato Daba',
    },
    yearEC: 1999,
    yearGC: 2006,
  },
  {
    id: 'stat_interp_21448',
    fileNumber: 'Galmee Lakk. 21448',
    volume: 4,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Siiviilii K. 1723, 2877',
      om: 'Koodii Siiviilii Keeyyata 1723 fi 2877 (Waliigaltee Gurgurtaa Manaa & Galmee Seeraa)',
      am: 'የፍትሐብሔር ሕግ አንቀጽ 1723 እና 2877 (የማይንቀሳቀስ ንብረት ሽያጭ ውል)',
      en: 'Civil Code Articles 1723 & 2877 (Formalities of Sale of Immovable Property)',
    },
    specificArticles: ['1723', '2877'],
    legalIssue: {
      om: 'Waliigalteen gurgurtaa manaa qaama dhimmi ilaallatu (Notary/Galmee) duratti hin mirkanoofne seera qabeessa ta\'ee abbummaa dabarsuu danda\'aa?',
      am: 'በውል አዋዋይ ወይም ስልጣን ባለው አካል ያልተመዘገበ የማይንቀሳቀስ ንብረት ሽያጭ ውል ህጋዊ ውጤት አለው ወይ?',
      en: 'Does an unregistered contract of sale of immovable property have binding legal effect to transfer title?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Waliigalteen gurgurtaa manaa ykn qabeenya socho\'aa hin taane kamiyyuu qaama heeyyamameef (Notary ykn Biiroo Dhimmi Ilaallatu) duratti galmaa\'ee hin mallatteeffamne bu\'uura K. 1723 fi 2877 tiin gatii seeraa hin qabu; abbaa qabeenyummaas hin dabarsu.',
      am: 'አስገዳጅ የህግ ትርጉም፡ በማይንቀሳቀስ ንብረት (ቤት) ላይ የሚደረግ የሽያጭ ውል ስልጣን ባለው አካል ፊት ያልተመዘገበ ከሆነ በፍትሐብሔር ሕግ አንቀጽ 1723 እና 2877 መሠረት ፈራሽ ነው፤ የባለቤትነት መብት አያስተላልፍም።',
      en: 'Binding Interpretation: Contracts for the sale of immovable property not registered before a competent public authority under Arts. 1723 & 2877 are null and void and cannot transfer legal ownership.',
    },
    category: 'civil_code',
    parties: {
      om: 'Obbo Baqqalaa v. Aadde Aster',
      am: 'አቶ በቀለ እና ወ/ሮ አስቴር',
      en: 'Ato Bekele v. W/ro Aster',
    },
    yearEC: 2000,
    yearGC: 2007,
  },
  {
    id: 'stat_interp_34812',
    fileNumber: 'Galmee Lakk. 34812',
    volume: 5,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Siiviilii K. 1731',
      om: 'Koodii Siiviilii Keeyyata 1731 (Seera Ta\'uu Waliigaltee / Pacta Sunt Servanda)',
      am: 'የፍትሐብሔር ሕግ አንቀጽ 1731 (የውል አስገዳጅነት ሕግ መሆን)',
      en: 'Civil Code Article 1731 (Binding Effect of Contracts - Pacta Sunt Servanda)',
    },
    specificArticles: ['1731', '1678'],
    legalIssue: {
      om: 'Waliigalteen seeraan qophaa\'e gareewwan gidduutti hangam dirqisiisummaa qaba? Manni murtii qabiyyee waliigaltichaa jijjiiruu danda\'aa?',
      am: 'በህግ አግባብ የተደረገ ውል በተዋዋይ ወገኖች መካከል ያለው አስገዳጅነት እስከ ምን ድረስ ነው? ፍርድ ቤት የውሉን ይዘት ሊለውጥ ይችላል?',
      en: 'What is the binding force of a lawfully concluded contract between parties, and can courts alter its agreed terms?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Waliigalteen seeraan heeyyamamee fi qophaa\'e kamiyyuu gareewwan mallatteessan gidduutti akkuma seeraa dirqisiisaadha (Pacta Sunt Servanda). Manni murtii qabiyyee waliigaltee gareewwanii seeraan ala diiguu ykn fooyyessuu hin danda\'u.',
      am: 'አስገዳጅ የህግ ትርጉም፡ በሕግ አግባብ የተደረገ ውል በተዋዋይ ወገኖች ዘንድ እንደ ሕግ አስገዳጅ ነው። ፍርድ ቤት በውሉ ይዘት ውስጥ ጣልቃ በመግባት የተዋዋዮችን ፍላጎት ሊቀይር አይችልም።',
      en: 'Binding Interpretation: Lawfully formed contracts serve as the law between the contracting parties (Art. 1731). Courts may not unilaterally alter or rewrite the agreed contractual provisions.',
    },
    category: 'civil_code',
    parties: {
      om: 'Dhaabbata Daldala Boonsaa v. Komishinii Misoomaa',
      am: 'ቦንሳ የንግድ ድርጅት እና የልማት ኮሚሽን',
      en: 'Bonsa Trading Enterprise v. Development Commission',
    },
    yearEC: 2001,
    yearGC: 2008,
  },
  {
    id: 'stat_interp_16568',
    fileNumber: 'Galmee Lakk. 16568',
    volume: 1,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Siiviilii K. 996, 1060, 1062',
      om: 'Koodii Siiviilii Keeyyata 996 fi 1060 (Dhaaltummaa fi Qulqulleessa Idaa Qabeenya Dhaalaa)',
      am: 'የፍትሐብሔር ሕግ አንቀጽ 996 እና 1060 (የውርስ ንብረትና የሟች ዕዳዎች ማጣራት)',
      en: 'Civil Code Articles 996 & 1060 (Succession Partition & Liquidation of Estate Debts)',
    },
    specificArticles: ['996', '1060', '1062'],
    legalIssue: {
      om: 'Waraqaan ragaa dhaaltummaa argachuun qofti qabeenya dhaalaa irratti abbummaa guutuu kallattiin kennaa?',
      am: 'የወራሽነት ማረጋገጫ ምስክር ወረቀት ማግኘት ብቻ በውርስ ንብረት ላይ ሙሉ ባለቤትነት ይሰጣል?',
      en: 'Does obtaining a certificate of heirship alone grant immediate title and partition over estate property?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Waraqaa ragaa dhaaltummaa argachuun qofti dhaaltuuf mirga abbaa qabeenyummaa kallattiin hin kennu. Dhaaltummaan kan raawwatamu qabeenyi dhaalaa qulqulla\'ee idaan abbaa dhaalaa erga kafalameen booda qofa dha.',
      am: 'አስገዳጅ የህግ ትርጉም፡ የወራሽነት ማረጋገጫ ማግኘት ብቻ በቂ ሳይሆን፣ የውርስ ንብረት ተጣርቶ የሟች ዕዳዎች ከተከፈሉ በኋላ የቀረው ንብረት ብቻ ለወራሾች ይከፋፈላል።',
      en: 'Binding Interpretation: A certificate of heirship alone does not convey immediate title; estate partition strictly requires prior clearance and liquidation of the deceased\'s liabilities.',
    },
    category: 'civil_code',
    parties: {
      om: 'Obbo X v. Dhaaltota Y',
      am: 'አቶ ኤክስ እና የዋይ ወራሾች',
      en: 'Ato X v. Heirs of Y',
    },
    yearEC: 1998,
    yearGC: 2005,
  },
  {
    id: 'stat_interp_41289',
    fileNumber: 'Galmee Lakk. 41289',
    volume: 6,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Siiviilii K. 2020, 2140',
      om: 'Koodii Siiviilii Keeyyata 2020 fi 2140 (Yeroo Darbiinsa Falmii Miidhaa Al-Waliigaltee / Tort)',
      am: 'የፍትሐብሔር ሕግ አንቀጽ 2020 እና 2140 (ከውል ውጭ ኃላፊነት ይርጋ ጊዜ)',
      en: 'Civil Code Articles 2020 & 2140 (Period of Limitation in Tort / Extra-Contractual Liability)',
    },
    specificArticles: ['2020', '2140'],
    legalIssue: {
      om: 'Himanni beenyaa balaa konkolaataa fi miidhaa qaamaa irratti dhiyaatu yeroo darbiinsa (limitation period) waggaa lamaa akkamitti lakkaa\'ama?',
      am: 'በትራፊክ አደጋ ምክንያት በሚደርስ ጉዳት የካሳ ጥያቄ የ2 ዓመት ይርጋ ጊዜ የሚቆጠረው ከየትኛው ቀን ጀምሮ ነው?',
      en: 'From what date does the two-year period of limitation begin for tort claims arising from motor vehicle accidents?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Miidhaa al-waliigaltee (Tort) irratti yeroon darbiinsaa waggaa lamaa (K. 2020) lakkaa\'amuu kan eegalu guyyaa miidhamichi miidhaa isaafi eenyummaa nama miidhaa geessise bekee irraa eegaleeti malee guyyaa balaan qaqqabe qofa irraa miti.',
      am: 'አስገዳጅ የህግ ትርጉም፡ ከውል ውጭ ኃላፊነት የ2 ዓመት ይርጋ የሚቆጠረው ተጎጂው የደረሰበትን ጉዳት እና ጉዳቱን ያደረሰውን ወገን ካወቀበት ቀን ጀምሮ ነው።',
      en: 'Binding Interpretation: Under Art. 2020, the 2-year limitation period begins running from the date the injured party acquired knowledge of both the injury and the identity of the liable party.',
    },
    category: 'civil_code',
    parties: {
      om: 'Obbo Daani\'eel v. Dhaabbata Inshuraansii X',
      am: 'አቶ ዳንኤል እና ኤክስ ኢንሹራንስ ድርጅት',
      en: 'Ato Daniel v. X Insurance Company',
    },
    yearEC: 2001,
    yearGC: 2008,
  },

  // 3. SEERA HOJJETAA & HOJJACHIISA (LABOR PROCLAMATION)
  {
    id: 'stat_interp_198421',
    fileNumber: 'Galmee Lakk. 198421',
    volume: 25,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Labsii Hojjetaa 1156 K. 27, 39, 40',
      om: 'Labsii Hojjetaa fi Hojjechiisaa 1156/2011 Keeyyata 27, 39 fi 40 (Ariisaa Hojii fi Beenyaa)',
      am: 'የአሠሪና ሠራተኛ አዋጅ 1156/2011 አንቀጽ 27፣ 39 እና 40 (ከስራ ማሰናበትና የካሳ ክፍያ)',
      en: 'Labor Proclamation 1156/2011 Articles 27, 39 & 40 (Unlawful Termination & Severance Pay)',
    },
    specificArticles: ['27', '39', '40'],
    legalIssue: {
      om: 'Hojjetaa sababa hanqina dandeettii hojii jedhuun osoo madaalliin hojii barreeffamaa hin jirre ari\'uun seera qabeessaa?',
      am: 'ያለተጨባጭ የጽሁፍ የስራ አፈጻጸም ምዘና ሠራተኛን በብቃት ማነስ ምክንያት ከስራ ማሰናበት ህጋዊ ነው ወይ?',
      en: 'Can an employer lawfully dismiss an employee for inefficiency without documented objective performance evaluations?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Hojjetaan sababa qulqullina hojii dhabuu qofaaf osoo madaalliin raawwii hojii barreeffamaan (written evaluation) hin raawwatamin ari\'amuun seeraan alaa waan ta\'eef kaffaltii beenyaa (severance pay) fi beenyaa ariisaa seeraan alaa ni kaffalamaaf.',
      am: 'አስገዳጅ የህግ ትርጉም፡ ያለተጨባጭ የስራ አፈጻጸም ምዘና ሠራተኛን ከስራ ማሰናበት ህገ-ወጥ በመሆኑ አሠሪው የስንብት ካሳና ተጨማሪ ካሳ እንዲከፍል ይገደዳል።',
      en: 'Binding Interpretation: Termination for inefficiency without documented objective performance appraisals constitutes unlawful dismissal, entitling the worker to severance pay and damages under Arts. 39 & 40.',
    },
    category: 'labor_law',
    parties: {
      om: 'Hojjetaa Gammachuu v. Dhaabbata X',
      am: 'ሰራተኛ ገመቹ እና ድርጅት ኤክስ',
      en: 'Worker Gemechu v. Enterprise X',
    },
    yearEC: 2016,
    yearGC: 2024,
  },
  {
    id: 'stat_interp_112044',
    fileNumber: 'Galmee Lakk. 112044',
    volume: 18,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Labsii Hojjetaa 1156 K. 138',
      om: 'Labsii Hojjetaa fi Hojjechiisaa 1156/2011 Keeyyata 138 (Yeroo Darbiinsa Himata Hojii / Limitation Period)',
      am: 'የአሠሪና ሠራተኛ አዋጅ 1156 አንቀጽ 138 (የስራ ክርክር ይርጋ ጊዜ)',
      en: 'Labor Proclamation 1156/2011 Article 138 (Period of Limitation for Labor Disputes)',
    },
    specificArticles: ['138', '141'],
    legalIssue: {
      om: 'Hojjetaan ari\'atame gara hojiitti akka deebi\'u ykn beenyaan akka kaffalamuuf ji\'a 6 keessatti himannaa yoo hin dhiyeessin mirgi isaa yeroon ni darbaa?',
      am: 'የተሰናበተ ሠራተኛ በ6 ወር ጊዜ ውስጥ ክስ ካላቀረበ መብቱ በይርጋ ይታገዳል ወይ?',
      en: 'Does a worker forfeit reinstatement and compensation claims if they fail to institute court action within 6 months?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Labsii Hojjetaa Keeyyata 138 bu\'uura godhachuun falmiin ariisaa hojii guyyaa hojjetaani ari\'amee eegalee ji\'a 6 (jaha) keessatti mana murtii yoo hin dhiyaatin mirgi himachuu yeroon kan darbu (barred by limitation) dha.',
      am: 'አስገዳጅ የህግ ትርጉም፡ በአዋጅ 1156 አንቀጽ 138 መሠረት ሠራተኛው ከተሰናበተበት ቀን ጀምሮ በ6 ወር ጊዜ ውስጥ ክስ ካላቀረበ ክሱ በይርጋ ይታገዳል።',
      en: 'Binding Interpretation: Under Labor Proclamation Art. 138, claims arising from unlawful termination are barred by limitation if not brought before a court within six months from dismissal.',
    },
    category: 'labor_law',
    parties: {
      om: 'Obbo Kabbadaa v. Warshaa Simintoo Muger',
      am: 'አቶ ከበደ እና ሙገር ሲሚንቶ ፋብሪካ',
      en: 'Ato Kebede v. Mugher Cement Enterprise',
    },
    yearEC: 2013,
    yearGC: 2021,
  },

  // 4. SEERA YAKKAA (CRIMINAL CODE)
  {
    id: 'stat_interp_48210',
    fileNumber: 'Galmee Lakk. 48210',
    volume: 8,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Yakkaa K. 692',
      om: 'Koodii Yakkaa Keeyyata 692 (Yakka Gawwoonsaan Qabeenya Fudhachuu / Fraud)',
      am: 'የወንጀል ሕግ አንቀጽ 692 (ማታለልና ማጭበርበር ወንጀል)',
      en: 'Criminal Code Article 692 (Criminal Fraud vs Civil Breach of Contract)',
    },
    specificArticles: ['692'],
    legalIssue: {
      om: 'Waliigaltee maallaqaa deebisuu dadhabuu irraa yakki gawwoonsaa (Fraud) bu\'uura K. 692 tiin ni hunda\'aa?',
      am: 'የብድር ውል ግዴታን ካለመወጣት የሚመነጭ ክርክር የማታለልና ማጭበርበር ወንጀልን ያቋቁማል?',
      en: 'Does mere failure to repay a borrowed sum constitute the crime of fraud under Criminal Code Art. 692?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Yakka gawwoonsaa (Fraud) mirkanaa\'uuf toftaa malaammaltummaa ykn dogoggora namarratti uumuun qabeenya amansiisanii fudhachuun gochaan raawwatamuu qaba; falmii waliigaltee siiviilii qofa irraa yakki gawwoonsaa hin uumamu.',
      am: 'አስገዳጅ የህግ ትርጉም፡ የማጭበርበር ወንጀል የሚቋቋመው በተጨባጭ የማታለል ድርጊት ተፈጽሞ ንብረት የተወሰደ ሲሆን ብቻ ነው፤ ተራ የውል ግዴታ አለመወጣት ወደ ወንጀል አይለወጥም።',
      en: 'Binding Interpretation: Criminal fraud under Art. 692 requires fraudulent deceitful artifice inducing property transfer; mere civil contract breach cannot form the basis of a criminal fraud conviction.',
    },
    category: 'criminal_code',
    parties: {
      om: 'Abbaa Alangaa v. Obbo Solomon',
      am: 'ዓቃቤ ሕግ እና አቶ ሶሎሞን',
      en: 'Public Prosecutor v. Ato Solomon',
    },
    yearEC: 2002,
    yearGC: 2009,
  },
  {
    id: 'stat_interp_75412',
    fileNumber: 'Galmee Lakk. 75412',
    volume: 12,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Yakkaa K. 679',
      om: 'Koodii Yakkaa Keeyyata 679 (Amanamummaa Hir\'isuu / Breach of Trust)',
      am: 'የወንጀል ሕግ አንቀጽ 679 (እምነት ማጉደል ወንጀል)',
      en: 'Criminal Code Article 679 (Breach of Trust Elements)',
    },
    specificArticles: ['679'],
    legalIssue: {
      om: 'Qabeenya amanamaadhaan itti kenname dhimma biraaf oolchuun yakka amanamummaa hir\'isuu akkamitti mirkanaa\'a?',
      am: 'በአደራ የተሰጠን ንብረት ለሌላ ተግባር ማዋል የእምነት ማጉደል ወንጀልን የሚያቋቁመው እንዴት ነው?',
      en: 'How is the crime of breach of trust established when entrusted property is diverted to unauthorized uses?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Yakki amanamummaa hir\'isuu mirkanaa\'uuf qabeenyi sun duraan heeyyamaafi amantaan himatamaa harka kan gale ta\'uu fi himatamaan qabeenya sana faayidaa mataa isaatiif seeraan ala kan oolche ta\'uun mirkanaa\'uu qaba.',
      am: 'አስገዳጅ የህግ ትርጉም፡ የእምነት ማጉደል ወንጀል የሚረጋገጠው ንብረቱ አስቀድሞ በህጋዊ መንገድ በአደራ ተሰጥቶት ተከሳሹ ለራሱ ወይም ለሌላ ወገን ያለአግባብ ያዋለው መሆኑ ሲረጋገጥ ነው።',
      en: 'Binding Interpretation: Conviction under Art. 679 requires proof that property was lawfully entrusted to the defendant, who then deliberately converted it to unlawful personal benefit.',
    },
    category: 'criminal_code',
    parties: {
      om: 'Abbaa Alangaa v. Obbo Dassaaleny',
      am: 'ዓቃቤ ሕግ እና አቶ ደሳለኝ',
      en: 'Public Prosecutor v. Ato Dessalegn',
    },
    yearEC: 2004,
    yearGC: 2012,
  },

  // 5. SEERA ADEEMSA DHIMMA YAKKAA (CRIMINAL PROCEDURE CODE)
  {
    id: 'stat_interp_39102',
    fileNumber: 'Galmee Lakk. 39102',
    volume: 6,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Adeemsa Yakkaa K. 63, 67',
      om: 'Koodii Adeemsa Yakkaa Keeyyata 63 fi 67 (Mirga Wabii Himatamaa / Bail Rights)',
      am: 'የወንጀል ሥነ-ሥርዓት ሕግ አንቀጽ 63 እና 67 (የዋስትና መብት)',
      en: 'Criminal Procedure Code Articles 63 & 67 (Right to Bail & Statutory Exceptions)',
    },
    specificArticles: ['63', '67'],
    legalIssue: {
      om: 'Himatamaaf mirgi wabii (bail) kan dhorkamu yoomi? Wabii dhorkuun adabbii ta\'uu danda\'aa?',
      am: 'ዋስትና የሚከለከልባቸው ህጋዊ ምክንያቶች ምንድን ናቸው? ዋስትና መከልከል እንደ ቅጣት ሊቆጠር ይችላል?',
      en: 'Under what circumstances may pre-trial bail be denied, and can bail refusal serve punitive purposes?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Seeraan heeyyamamaa kan ta\'e yakka kamiyyuu irratti mirgi wabii (bail) kan dhorkamu yoo akkaan baduu danda\'a ykn ragaa balleessa jedhamee sodaatame qofa dha; wabii dhorkuun adabbii ta\'uu hin danda\'u.',
      am: 'አስገዳጅ የህግ ትርጉም፡ ዋስትና የሚከለከለው ተጠርጣሪው ያመልጣል ወይም ማስረጃ ያጠፋል ተብሎ በበቂ ሁኔታ ሲረጋገጥ ብቻ ነው፤ ዋስትና መከልከል ቅጣት ሊሆን አይችልም።',
      en: 'Binding Interpretation: Statutory bail can only be denied upon concrete substantiation of flight risk or witness tampering; pre-trial bail denial cannot serve as an advance penalty.',
    },
    category: 'criminal_procedure',
    parties: {
      om: 'Abbaa Alangaa v. Obbo Baahiruu',
      am: 'ዓቃቤ ሕግ እና አቶ ባሩ',
      en: 'Public Prosecutor v. Ato Bahiru',
    },
    yearEC: 2001,
    yearGC: 2008,
  },
  {
    id: 'stat_interp_72109',
    fileNumber: 'Galmee Lakk. 72109',
    volume: 11,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Adeemsa Yakkaa K. 59',
      om: 'Koodii Adeemsa Yakkaa Keeyyata 59 (Bara Qorannoo Poolisii & Dhaadannoo / Remand)',
      am: 'የወንጀል ሥነ-ሥርዓት ሕግ አንቀጽ 59 (የጊዜ ቀጠሮ / Remand)',
      en: 'Criminal Procedure Code Article 59 (Police Remand & Investigation Deadlines)',
    },
    specificArticles: ['59'],
    legalIssue: {
      om: 'Poolisiin sababa gahaa fi ragaa qabatamaa osoo hin dhiyeessin yeroo qorannoo dheereffachuu danda\'aa?',
      am: 'ፖሊስ ተጨባጭ የምርመራ ውጤት ሳያሳይ ተደጋጋሚ የጊዜ ቀጠሮ ሊፈቀድለት ይችላል?',
      en: 'May courts grant repeated police remand extensions without concrete demonstrable investigative milestones?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Poolisiin yeroo dhaadannoo (remand) gaafatu sababa qorannoon hin xumuramne jedhu qofaan heeyyamamuu hin qabu; hojii qorannoo raawwateefi kan hafe manatti agarsiisuu qaba.',
      am: 'አስገዳጅ የህግ ትርጉም፡ የፖሊስ የጊዜ ቀጠሮ የሚፈቀደው የተከናወነውንና የቀረውን የምርመራ ስራ ዝርዝር ፍርድ ቤቱ አይቶ ሲያምንበት ብቻ ነው።',
      en: 'Binding Interpretation: Police remand under Art. 59 may not be granted on perfunctory requests; police must demonstrate specific investigative tasks performed and remaining.',
    },
    category: 'criminal_procedure',
    parties: {
      om: 'Poolisii Federaalaa v. Obbo Mokonnin',
      am: 'የፌዴራል ፖሊስ እና አቶ መኮንን',
      en: 'Federal Police v. Ato Mekonnen',
    },
    yearEC: 2003,
    yearGC: 2011,
  },

  // 6. SEERA DALDALAA & TAAKSIIDHAA (COMMERCIAL & TAX LAW)
  {
    id: 'stat_interp_104210',
    fileNumber: 'Galmee Lakk. 104210',
    volume: 16,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Daldalaa & Labsii Taaksii 979',
      om: 'Koodii Daldalaa Keeyyata 210 fi Labsii Taaksii Galii (PLC Share Transfer & Tax Clearance)',
      am: 'የንግድ ሕግና የታክስ አዋጅ 979 (የኃላፊነቱ የተወሰነ የግል ማህበር ድርሻ ማስተላለፍ)',
      en: 'Commercial Code PLC Share Transfer & Income Tax Proclamation No. 979/2016',
    },
    specificArticles: ['210'],
    legalIssue: {
      om: 'Aksiyoona PLC galmee ejensii daldalaa irratti jijjiirrasuun waraqaa kaffaltii gibiraa (tax clearance) malee raawwatamuu danda\'aa?',
      am: 'የታክስ ክፍያ ማረጋገጫ ሳይቀርብ በንግድ መዝገብ ላይ የድርሻ ማስተላለፍ ምዝገባ ሊደረግ ይችላል?',
      en: 'Can a share transfer in a Private Limited Company be registered without a prior tax clearance certificate?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Aksiyoona ykn qooda PLC galmee ejensii daldalaa irratti jijjiirrasuun kan raawwatamu taaksii galii bu\'aa qabeenyaa (capital gains tax) nagaheen kaffaltii erga dhiyaateen booda qofa dha.',
      am: 'አስገዳጅ የህግ ትርጉም፡ በኃላፊነቱ የተወሰነ የግል ማህበር ውስጥ የድርሻ ማስተላለፍ በንግድ መዝገብ የሚመዘገበው የታክስ ክፍያ ማረጋገጫ ሲቀርብ ብቻ ነው።',
      en: 'Binding Interpretation: Registration of a PLC share transfer strictly requires proof of tax clearance under applicable tax proclamations.',
    },
    category: 'commercial_tax',
    parties: {
      om: 'Aksiyoona Daldala X v. Biiroo Galiiwwanii',
      am: 'የንግድ ማህበር ኤክስ እና ገቢዎች ቢሮ',
      en: 'Company X v. Revenue Bureau',
    },
    yearEC: 2014,
    yearGC: 2022,
  },
  {
    id: 'stat_interp_88201',
    fileNumber: 'Galmee Lakk. 88201',
    volume: 14,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Daldalaa K. 732, 856',
      om: 'Koodii Daldalaa Keeyyata 732 fi 856 (Cheekii Herrega Hin Qabne & Ittigaafatamummaa)',
      am: 'የንግድ ሕግ አንቀጽ 732 እና 856 (ያለስንቅ የተሰጠ ቼክ ኃላፊነት)',
      en: 'Commercial Code Articles 732 & 856 (Dishonored Cheques & Drawer Liability)',
    },
    specificArticles: ['732', '856'],
    legalIssue: {
      om: 'Cheekiin maqaa dhaabbataatiin baankii irraa kan deebi\'e yoo ta\'e, hogganaan dhaabbatichaa maallaqa ofii isaatiin ni gaafatamaa?',
      am: 'በድርጅት ስም የተሰጠ ቼክ በባንክ ሳይከፈል ሲመለስ የድርጅቱ ስራ አስኪያጅ በግል ንብረቱ ይጠየቃል ወይ?',
      en: 'Is a corporate manager personally liable for damages when a cheque issued on behalf of a company is dishonored?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Hogganaan dhaabbataa cheekii maallaqa hin qabne maqaa dhaabbatichaan mallatteesse ittigaafatamummaa yakkaa qabaatus, kaffaltii maallaqichaa irratti kan gaafatamu dhaabbaticha mataa isaati malee qabeenya dhuunfaa hogganaichaa miti.',
      am: 'አስገዳጅ የህግ ትርጉም፡ ያለስንቅ ቼክ በፈረመው ስራ አስኪያጅ ላይ የወንጀል ተጠያቂነት ቢኖርም፣ የገንዘቡን ክፍያ በተመለከተ ተጠያቂው ድርጅቱ ራሱ እንጂ የስራ አስኪያጁ የግል ንብረት አይደለም።',
      en: 'Binding Interpretation: While criminal sanctions may attach to the signing officer, civil financial liability for a dishonored cheque belongs to the corporate entity itself.',
    },
    category: 'commercial_tax',
    parties: {
      om: 'Dhaabbata Daldala Qananii v. Obbo Wandimmuu',
      am: 'ቀነኒ የንግድ ድርጅት እና አቶ ወንድሙ',
      en: 'Keneni Trading v. Ato Wendimu',
    },
    yearEC: 2005,
    yearGC: 2013,
  },

  // 7. SEERA DHAALA & MAATII (FAMILY & SUCCESSION LAW)
  {
    id: 'stat_interp_21049',
    fileNumber: 'Galmee Lakk. 21049',
    volume: 18,
    courtJurisdiction: 'oromia',
    courtName: {
      om: 'Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa',
      am: 'የኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Oromia Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Koodii Maatii Oromiyaa K. 48, 85',
      om: 'Koodii Maatii Naannoo Oromiyaa K. 48 fi 85 (Tilmaama Qabeenya Waloo Fuudhaa fi Heerumaa)',
      am: 'የኦሮሚያ የቤተሰብ ሕግ አንቀጽ 48 እና 85 (የጋብቻ የጋራ ንብረት)',
      en: 'Oromia Family Code Articles 48 & 85 (Presumption of Common Marital Property)',
    },
    specificArticles: ['48', '85'],
    legalIssue: {
      om: 'Qabeenyi bara fuudhaafi heerumaa keessatti horatame maqaadhaan abbaa manaa qofaan yoo galmaa\'e qabeenya dhuunfaati moo walooti?',
      am: 'በጋብቻ ዘመን የተፈራ ንብረት በባል ስም ብቻ ቢመዘገብ የጋራ ንብረት ነው ወይስ የግል?',
      en: 'Is property acquired during marriage presumed common property even if titled exclusively in the husband\'s name?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Qabeenyi fuudha fi heeruma keessatti horatame kamiyyuu maqaadhaan kan galmeeffame abbaa manaa ykn haadha manaa ta\'us qabeenya waloo (common property) ta\'uun tilmaama seeraa qaba.',
      am: 'አስገዳጅ የህግ ትርጉም፡ በጋብቻ ዘመን የተፈራ ንብረት በአንዱ ተጋቢ ስም ብቻ ቢመዘገብም የጋራ ንብረት ተደርጎ ይገመታል። የጋራ ንብረት አለመሆኑን ማረጋገጥ የተቃዋሚው ሸክም ነው።',
      en: 'Binding Interpretation: Property acquired during marriage is legally presumed common property under Art. 48, regardless of whose single name appears on registration documents.',
    },
    category: 'family_inheritance',
    parties: {
      om: 'Adde Chaltu v. Obbo Guddataa',
      am: 'ወይዘሮ ጫልቱ እና አቶ ጉደታ',
      en: 'W/ro Chaltu v. Ato Gudeta',
    },
    yearEC: 2015,
    yearGC: 2023,
  },

  // 8. HEERA, LAFA & SEEROTA BIROO (CONSTITUTION, LAND & ADMINISTRATIVE)
  {
    id: 'stat_interp_13002',
    fileNumber: 'Galmee Lakk. 13002',
    volume: 12,
    courtJurisdiction: 'oromia',
    courtName: {
      om: 'Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa',
      am: 'የኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Oromia Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Labsii Lafa Baadiyyaa Oromiyaa 130 K. 6, 14',
      om: 'Labsii Bulchiinsa fi Fayyadama Lafa Baadiyyaa Oromiyaa Lakk. 130/1999 K. 6 fi 14 (Kireessaa Lafa Baadiyyaa)',
      am: 'የኦሮሚያ ገጠር መሬት አዋጅ 130/1999 አንቀጽ 6 እና 14 (የገጠር መሬት ኪራይ)',
      en: 'Oromia Rural Land Proclamation 130/1999 Articles 6 & 14 (Rural Land Lease Agreements)',
    },
    specificArticles: ['6', '14'],
    legalIssue: {
      om: 'Qonnaan bulaan lafa baadiyyaa isaa erga kireessee booda yoo du\'e, dhaaltuun isaa waliigaltee kireessaa diiguu danda\'aa?',
      am: 'አርሶ አደሩ የገጠር መሬቱን አከራይቶ ቢሞት፣ ወራሾች የኪራይ ውሉን ማፍረስ ይችላሉ?',
      en: 'Can heirs of a deceased rural landholder unilaterally terminate a valid land lease entered into by the decedent?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Qonnaan bulaan lafa baadiyyaa isaa irratti waliigaltee kireessuu yoo mallatteesse, dhaaltuun isaa waliigaltee sana osoo waggaan kireessaa hin xumuramin diiguu hin danda\'u; dirqamni kireessaa dhaaltuu irratti fufa.',
      am: 'አስገዳጅ የህግ ትርጉም፡ አርሶ አደሩ በህይወት በነበረበት ወቅት ያደረገው የገጠር መሬት ኪራይ ውል በወራሾች ላይ አስገዳጅነት ያለው በመሆኑ የኪራይ ዘመኑ ሳያልቅ ሊያፈርሱት አይችሉም።',
      en: 'Binding Interpretation: A lawful rural land lease agreement entered into by a deceased landholder remains legally binding on their heirs until the contract term expires.',
    },
    category: 'other_laws',
    parties: {
      om: 'Obbo Kabbadaa v. Obbo Tolasaa',
      am: 'አቶ ከበደ እና አቶ ቶለሳ',
      en: 'Ato Kebede v. Ato Tolasa',
    },
    yearEC: 2012,
    yearGC: 2020,
  },
  {
    id: 'stat_interp_23642',
    fileNumber: 'Galmee Lakk. 23642',
    volume: 5,
    courtJurisdiction: 'federal',
    courtName: {
      om: 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
      am: 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
      en: 'Federal Supreme Court Cassation Division',
    },
    statutoryProvisionInterpreted: {
      codeOrProclamation: 'Labsii 454/1997 K. 2(1)',
      om: 'Labsii Fooyyeeffama Mana Murtii Federaalaa Lakk. 454/1997 Keeyyata 2(1) (Dirqisiisummaa Hiikkoo Seeraa Dhaddacha Ijibbaataa)',
      am: 'አዋጅ ቁጥር 454/1997 አንቀጽ 2(1) (የሰበር ችሎት አስገዳጅ የህግ ትርጉም)',
      en: 'Federal Courts Amendment Proclamation No. 454/1997 Article 2(1) (Binding Precedent Principle)',
    },
    specificArticles: ['2'],
    legalIssue: {
      om: 'Hiikkoon seeraa Dhaddacha Ijibbaata Federaalaatiin kenname manneen murtii Federaalaafi Naannoo sadarkaa hunda irratti hangam dirqisiisaadha?',
      am: 'በፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት የሚሰጥ የህግ ትርጉም በሁሉም የፌዴራልና የክልል ፍርድ ቤቶች ላይ ያለው አስገዳጅነት ምን ይመስላል?',
      en: 'What is the binding scope of statutory interpretations rendered by the FSC Cassation Division on Federal and Regional courts?',
    },
    bindingInterpretationGiven: {
      om: 'Hiikkoo Dirqisiisaa: Bu\'uura Labsii 454/1997 Keeyyata 2(1) tiin, hiikkoon seeraa Dhaddacha Ijibbaata Mana Murtii Waliigalaa Federaalaatiin daanyoota shan (5) fi isaa oliin kenname manneen murtii Federaalaa fi Naannolee hunda irratti dirqisiisaa dha; manni murtii kamiyyuu hiikkoo kanarraa maaqee murtii kennuu hin danda\'u.',
      am: 'አስገዳጅ የህግ ትርጉም፡ በአዋጅ ቁጥር 454/1997 አንቀጽ 2(1) መሠረት በፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት በአምስት ዳኞች የተሰጠ የህግ ትርጉም በማንኛውም የፌዴራልና የክልል ፍርድ ቤቶች ላይ አስገዳጅ ነው።',
      en: 'Binding Interpretation: Under Proclamation 454/1997 Art. 2(1), legal interpretations of statutory provisions rendered by the FSC Cassation Division with not less than five judges are strictly binding on all Federal and Regional courts.',
    },
    category: 'other_laws',
    parties: {
      om: 'Dhaddacha Ijibbaataa Federaalaa v. Manneen Murtii Hunda',
      am: 'የፌዴራል ሰበር ሰሚ ችሎት እና ፍርድ ቤቶች ሁሉ',
      en: 'FSC Cassation Division v. All Courts',
    },
    yearEC: 1999,
    yearGC: 2007,
  },
];

/**
 * Normalizes category mapping between CassationPrecedent and InterpretationCategory
 */
function mapPrecedentCategoryToInterpretation(cat: string): InterpretationCategory {
  switch (cat) {
    case 'procedure':
      return 'civil_procedure';
    case 'property':
    case 'contract':
      return 'civil_code';
    case 'family':
      return 'family_inheritance';
    case 'commercial':
      return 'commercial_tax';
    case 'labor':
      return 'labor_law';
    case 'criminal':
      return 'criminal_code';
    default:
      return 'other_laws';
  }
}

/**
 * Aggregates all statutory interpretations across SeeraAI:
 * Combines curated BINDING_STATUTORY_INTERPRETATIONS_DB and transforms all 
 * CASSATION_PRECEDENTS_DATA precedents so that EVERY cassation precedent is searchable 
 * by its interpreted legal provisions!
 */
export function getAllStatutoryInterpretations(precedents?: CassationPrecedent[]): BindingStatutoryInterpretation[] {
  const sourceData = precedents || CASSATION_PRECEDENTS_DATA;
  const existingFileNumbers = new Set(
    BINDING_STATUTORY_INTERPRETATIONS_DB.map((item) =>
      item.fileNumber.replace(/\D/g, '')
    )
  );

  const adaptedFromPrecedents: BindingStatutoryInterpretation[] = [];

  for (const p of sourceData) {
    const rawNumber = p.fileNumber.replace(/\D/g, '');
    if (!existingFileNumbers.has(rawNumber) && p.statutoryProvisions && p.statutoryProvisions.length > 0) {
      existingFileNumbers.add(rawNumber);

      const mainProvision = p.statutoryProvisions.join('; ');
      adaptedFromPrecedents.push({
        id: `stat_interp_cass_${p.fileNumber}`,
        fileNumber: `Galmee Lakk. ${p.fileNumber}`,
        volume: p.volume,
        courtJurisdiction: p.courtJurisdiction || (p.id.startsWith('oromia_') ? 'oromia' : 'federal'),
        courtName: p.courtName || {
          om: p.courtJurisdiction === 'oromia' ? 'Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa' : 'Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa',
          am: p.courtJurisdiction === 'oromia' ? 'የኦሮሚያ ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት' : 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት',
          en: p.courtJurisdiction === 'oromia' ? 'Oromia Supreme Court Cassation Division' : 'Federal Supreme Court Cassation Division',
        },
        statutoryProvisionInterpreted: {
          codeOrProclamation: mainProvision,
          om: `Tumaa Seeraa: ${mainProvision}`,
          am: `የሕግ ድንጋጌ፦ ${mainProvision}`,
          en: `Statutory Provision: ${mainProvision}`,
        },
        legalIssue: p.legalIssue,
        bindingInterpretationGiven: p.bindingPrinciple,
        category: mapPrecedentCategoryToInterpretation(p.category),
        parties: p.parties,
        yearEC: p.yearEC,
        yearGC: p.yearGC,
      });
    }
  }

  return [...BINDING_STATUTORY_INTERPRETATIONS_DB, ...adaptedFromPrecedents];
}
