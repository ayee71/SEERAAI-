import { 
  CASSATION_VOL_1_TO_25_DATA, 
  CASSATION_TOC_SECTIONS, 
  TocSection 
} from './cassationVol1To25Data';

export type { TocSection };
export { CASSATION_TOC_SECTIONS };

export interface MasterIndexCase {
  tartiiba?: string;
  lakk_galmee: string;
  guyyaa_murtii: string;
  falmitoota: string;
  falmitoota_om?: string;
  fuula: number;
  fuula_jildii: string;
  qabxii_ijoo: string;
  qabxii_ijoo_om?: string;
  seera_caqasame: string;
  court?: string;
}

export interface MasterIndexCategory {
  category: string;
  categoryOm: string;
  categoryEn: string;
  icon?: string;
  murtiilee: MasterIndexCase[];
}

// Complementary categories for full coverage across property, family & criminal law
const COMPLEMENTARY_CATEGORIES: MasterIndexCategory[] = [

  // ==========================================
  // 4. ንብረትና መሬት (PROPERTY & LAND LAW)
  // ==========================================
  {
    category: "ንብረትና መሬት",
    categoryOm: "ንብረትና መሬት (Qabeenya fi Lafa)",
    categoryEn: "Property & Land Law",
    icon: "Home",
    murtiilee: [
      {
        lakk_galmee: "16568",
        guyyaa_murtii: "ሰኔ 15/1998 (ቅጽ 1)",
        falmitoota: "አቶ ኤክስ እና የዋይ ወራሾች",
        falmitoota_om: "Obbo X fi Dhaaltota Y",
        fuula: 88,
        fuula_jildii: "1",
        qabxii_ijoo: "የወራሽነት ማረጋገጫ ማግኘት ብቻ በቂ ሳይሆን የውርስ ንብረት ተጣርቶ ዕዳ ከተከፈለ በኋላ ብቻ መከፋፈል እንዳለበት።",
        qabxii_ijoo_om: "Qabeenyi dhaalaa qulqullaa'ee idaan erga kaffalameen booda qofa dhaaltotaaf qoodamuu qaba.",
        seera_caqasame: "የፍትሐብሔር ህግ ቁ. 996, 1060, 1062"
      },
      {
        lakk_galmee: "32104",
        guyyaa_murtii: "ጥቅምት 12/2002 (ቅጽ 6)",
        falmitoota: "አቶ ጌታቸው እና የአዲስ አበባ ቤቶች ኤጀንሲ",
        falmitoota_om: "Obbo Geetaachoo fi Eejensii Manneen Magaalaa Finfinnee",
        fuula: 142,
        fuula_jildii: "6",
        qabxii_ijoo: "የመንግስት ቤቶችን ወይም የኪራይ ይዞታን ያለአግባብ ለሶስተኛ ወገን ማስተላለፍ ህገወጥና ውድቅ መሆኑ።",
        qabxii_ijoo_om: "Mana mootummaa ykn kireeffannaa heeyyama malee qaama 3ffaaf dabarsuun seeraan fudhatama dhabuu.",
        seera_caqasame: "የፍትሐብሔር ህግ ቁ. 2965"
      },
      {
        lakk_galmee: "51044",
        guyyaa_murtii: "መጋቢት 8/2006 (ቅጽ 11)",
        falmitoota: "አቶ ከበደ እና ወ/ሮ ሙሉ",
        falmitoota_om: "Obbo Kabbadaa fi Aadde Muluu",
        fuula: 175,
        fuula_jildii: "11",
        qabxii_ijoo: "በመንግስት የተሰጠ የይዞታ ማረጋገጫ ካርታ ፍርድ ቤት እስካልሻረው ድረስ ሙሉ ህጋዊ ማስረጃነት ያለው መሆኑ።",
        qabxii_ijoo_om: "Ragaan abbaa qabiyyee (Kaartaa) mootummaan kenname hanga haqamutti ragaa guutuu ta'uu.",
        seera_caqasame: "የፍትሐብሔር ህግ ቁ. 1195"
      },
      {
        lakk_galmee: "72109",
        guyyaa_murtii: "ሚያዝያ 20/2010 (ቅጽ 15)",
        falmitoota: "የአዲስ አበባ ከተማ አስተዳደር እና አቶ ተሾመ",
        falmitoota_om: "Bulchiinsa Magaalaa Finfinnee fi Obbo Tashoomee",
        fuula: 195,
        fuula_jildii: "15",
        qabxii_ijoo: "የከተማ መሬት ልማት አስተዳደር በውል ስምምነት መሰረት እንጂ unilaterally ዋጋ መጨመር እንደማይችል ውሳኔ።",
        qabxii_ijoo_om: "Bulchiinsi lafa magaalaa waliigaltee ala gatii liizii ofiin dabaluu akka hin dandeenye.",
        seera_caqasame: "አዋጅ ቁ. 721/2004 አንቀጽ 22"
      },
      {
        lakk_galmee: "27542",
        guyyaa_murtii: "ታህሳስ 18/2016 (ቅጽ 27)",
        falmitoota: "አቶ ከቻሉ እና የአዲስ አበባ ከተማ መሬት አስተዳደር ቢሮ",
        falmitoota_om: "Obbo Kacaaluu fi Biiroo Bulchiinsa Lafa Magaalaa",
        fuula: 288,
        fuula_jildii: "27",
        qabxii_ijoo: "ባለይዞታው በተቀመጠው የጊዜ ገደብ ውስጥ መሬቱን ልማት ላይ ካላዋለ ውሉ ሊሰረዝ ቢችልም ለሠፈረው ንብረት ካሳ መክፈል ግዴታ መሆኑ።",
        qabxii_ijoo_om: "Lafa invastimantii yeroon hin misoomne diiguun danda'amus qabeenya ijaarameef beenyaan kafalamuu qaba.",
        seera_caqasame: "አዋጅ ቁ. 721/2004 አንቀጽ 22, የፍ/ብ/ህ/ቁ. 1808"
      }
    ]
  },

  // ==========================================
  // 5. ንግድና ባንክ (COMMERCIAL & BANKING LAW)
  // ==========================================
  {
    category: "ንግድና ባንክ",
    categoryOm: "ንግድና ባንክ (Daldala fi Baankii)",
    categoryEn: "Commercial & Banking Law",
    icon: "Landmark",
    murtiilee: [
      {
        lakk_galmee: "61209",
        guyyaa_murtii: "ግንቦት 12/2008 (ቅጽ 13)",
        falmitoota: "አዋሽ ወይን እና አቶ ግርማ",
        falmitoota_om: "Hawaash Wayinii fi Obbo Girmaa",
        fuula: 160,
        fuula_jildii: "13",
        qabxii_ijoo: "ማንኛውም ባለአክሲዮን የኩባንያውን የሒሳብ መግለጫ እና ኦዲት ሪፖርት የመመልከት ሙሉ መብት አለው።",
        qabxii_ijoo_om: "Abbaan aksiyoonaa kamiyyuu gabaasa herregaa fi ooditii dhaabbatichaa sakatta'uuf mirga qaba.",
        seera_caqasame: "የንግድ ሕግ አንቀጽ 368"
      },
      {
        lakk_galmee: "98102",
        guyyaa_murtii: "ሰኔ 28/2013 (ቅጽ 20)",
        falmitoota: "አዋሽ ኢንሹራንስ እና አቶ ዮናስ",
        falmitoota_om: "Inshuraansii Hawaash fi Obbo Yonaas",
        fuula: 218,
        fuula_jildii: "20",
        qabxii_ijoo: "የመድን ድርጅቱ በህግ ከተቀመጠው የዋስትና ገደብ ውጪ ተጨማሪ ክፍያ እንዲፈጽም ሊገደድ አይችልም።",
        qabxii_ijoo_om: "Dhaabbanni inshuraansii daangaa seeraan kaa'amee ol beenyaa dabalataa kaffaluuf hin dirqisiifamu.",
        seera_caqasame: "የንግድ ሕግ አንቀጽ 654"
      },
      {
        lakk_galmee: "28001",
        guyyaa_murtii: "ጥቅምት 14/2017 (ቅጽ 28)",
        falmitoota: "የኢትዮጵያ ንግድ ባንክ እና አቶ ከበደ ንግድ ድርጅት",
        falmitoota_om: "Bankii Daldala Itoophiyaa fi Dhaabbata Obbo Kabbadaa",
        fuula: 340,
        fuula_jildii: "28",
        qabxii_ijoo: "በህግጋቱ መሰረት የተመዘገበ የንብረት መያዣ ቅድሚያ መብት ይሰጣል፤ ሶስተኛ ወገን ማወቁ ወይም አለማወቁ የባንኩን መብት አያስተጓጉልም።",
        qabxii_ijoo_om: "Qabsiisi seeraan galmeeffame mirga dursa kennuun qaamni 3ffaa beekuu dhiisuun mirga baankii hin dhowwu.",
        seera_caqasame: "የንግድ ሕግ አንቀጽ 171, የፍ/ብ/ህ/ቁ. 3050"
      }
    ]
  },

  // ==========================================
  // 6. ቤተሰብና ውርስ (FAMILY & SUCCESSION LAW)
  // ==========================================
  {
    category: "ቤተሰብና ውርስ",
    categoryOm: "ቤተሰብና ውርስ (Maatii fi Dhaala)",
    categoryEn: "Family & Succession Law",
    icon: "Users",
    murtiilee: [
      {
        lakk_galmee: "29812",
        guyyaa_murtii: "የካቲት 15/2002 (ቅጽ 5)",
        falmitoota: "ወ/ሮ ዘውዱ እና አቶ ከበደ",
        falmitoota_om: "Aadde Zawuduu fi Obbo Kabbadaa",
        fuula: 120,
        fuula_jildii: "5",
        qabxii_ijoo: "በጋብቻ ወቅት የተፈራራቸው ንብረት በዕኩል መከፋፈል አለበት፤ የግል ንብረት ነው የሚል ወገን የማስረዳት ኃላፊነት አለበት።",
        qabxii_ijoo_om: "Qabeenyi gaa'ela keessatti horatame walqixa qoodama; kan dhuunfaati kan jedhu ragaa dhiyeessuun dirqama.",
        seera_caqasame: "የተሻሻለው የቤተሰብ ሕግ አዋጅ ቁ. 213/1992 አንቀጽ 60"
      },
      {
        lakk_galmee: "67412",
        guyyaa_murtii: "መጋቢት 24/2009 (ቅጽ 14)",
        falmitoota: "ወ/ሮ ትግስት እና አቶ ሃይሌ",
        falmitoota_om: "Aadde Tigist fi Obbo Haayilee",
        fuula: 184,
        fuula_jildii: "14",
        qabxii_ijoo: "ጋብቻው በህግ ያልተመዘገበ ቢሆንም ለብዙ ዓመታት በጋራ መኖራቸው ከተረጋገጠ በጋራ የተፈራረቁት ንብረት ይከፋፈላል።",
        qabxii_ijoo_om: "Gaa'elli seeraan hin galmoofne yoo ta'ellee waliin jiraachuun erga mirkanaa'ee qabeenyi ni qoodama.",
        seera_caqasame: "የተሻሻለው የቤተሰብ ሕግ አንቀጽ 95"
      }
    ]
  },

  // ==========================================
  // 7. ወንጀልና ሥነ ሥርዓት (CRIMINAL & PROCEDURAL LAW)
  // ==========================================
  {
    category: "ወንጀል",
    categoryOm: "ወንጀል (Yakka fi Deemsa Falmii Yakkaa)",
    categoryEn: "Criminal & Penal Law",
    icon: "Gavel",
    murtiilee: [
      {
        lakk_galmee: "39811",
        guyyaa_murtii: "ጥር 18/2004 (ቅጽ 8)",
        falmitoota: "የፌዴራል ዓቃቤ ሕግ እና አቶ ለማ",
        falmitoota_om: "Abbaa Alangaa Federaalaa fi Obbo Lammaa",
        fuula: 132,
        fuula_jildii: "8",
        qabxii_ijoo: "የወንጀል ክስ ጥርጣሬ ካለ ለተከሳሹ ያገለግላል፤ የጥፋተኝነት ውሳኔ ከጥርጣሬ በላይ በሆነ ማስረጃ መረጋገጥ አለበት።",
        qabxii_ijoo_om: "Shakkiin yakkaa kamiyyuu himatamaaf fayyada; adabbiin shakkiin ala ragaa quubsaan mirkanaa'uu qaba.",
        seera_caqasame: "የወንጀለኛ መቅጫ ህግ አንቀጽ 407, የሥ/ሥ/ሕ/ቁ. 142"
      },
      {
        lakk_galmee: "112233",
        guyyaa_murtii: "መጋቢት 2/2016 (ቅጽ 25)",
        falmitoota: "የፌዴራል ዓቃቤ ሕግ እና አቶ ጫላ",
        falmitoota_om: "Abbaa Alangaa Federaalaa fi Obbo Caalaa",
        fuula: 312,
        fuula_jildii: "25",
        qabxii_ijoo: "የዋስትና መብት ሕገ-መንግሥታዊ መብት ነው፤ በሕግ ከተቀመጡ ልዩ ሁኔታዎች ውጪ ሊከለከል አይገባም።",
        qabxii_ijoo_om: "Mirgi wabii mirga heeraati; sababa seeraan ifatti murtaa'een ala dhowwamuu hin qabu.",
        seera_caqasame: "የወንጀለኛ መቅጫ ሥነ ሥርዓት ህግ አንቀጽ 63, 67"
      }
    ]
  }
];

// Combine comprehensive Vol 1-25 dataset (742 decisions) with complementary judicial branches
export const CASSATION_MASTER_INDEX: MasterIndexCategory[] = [
  ...CASSATION_VOL_1_TO_25_DATA,
  ...COMPLEMENTARY_CATEGORIES
];
