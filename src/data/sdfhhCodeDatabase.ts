/**
 * SEERA ADEEMSA FALMII HARIIROO HAWAASAA (SDFHH)
 * =========================================================================
 * Madda Seeraa: Labsii Lakk. 52 Bara 1958 (Civil Procedure Code of Ethiopia)
 * Kan Hiike: Falmataa Daboo Baraatin (Seeran Digrii Jalqabaa, Seeran Digrii 2ffaa,
 *            Pireezidaantii Mana Murtii Aanaa)
 * Bakka fi Yeroo: Guraandhala, 2015, Amboo, Oromiyaa
 *
 * Kuusaa Dhaabbataa Keeyyattoota, Boqonnaawwanii fi Sagantaawwan SDFHH
 */

export interface SDFHHArticle {
  number: number;
  articleLabel: string; // e.g. "Kwt. 6"
  titleOm: string;
  titleAm: string;
  titleEn: string;
  bookNumber: number;
  bookTitleOm: string;
  chapterNumber?: number;
  chapterTitleOm?: string;
  sectionTitleOm?: string;
  summaryOm: string;
  summaryAm: string;
  summaryEn: string;
  keyRulesOm: string[];
  crossReferences?: string[];
}

export interface SDFHHSchedule {
  scheduleNumber: number;
  scheduleNameOm: string;
  forms: {
    formNumber: string;
    articleRef: string;
    titleOm: string;
  }[];
}

export const SDFHH_METADATA = {
  titleOm: 'Seera Adeemsa Falmii Hariiroo Hawaasaa (SDFHH)',
  titleAm: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ (የኦሮምኛ ትርጉም)',
  titleEn: 'Civil Procedure Code of Ethiopia (Afaan Oromoo Statutory Version)',
  translator: 'Falmataa Daboo Baraatin (LL.B, LL.M, Pireezidaantii Mana Murtii Aanaa)',
  enactment: 'Labsii Lakk. 52 Bara 1958 (Civil Procedure Code of Ethiopia, 1965)',
  publicationPlace: 'Amboo, Oromiyaa',
  publicationYear: 'Guraandhala, 2015 E.C. (February 2023 G.C.)',
  totalArticles: 483,
  totalBooks: 9,
  totalSchedules: 6,
};

export const SDFHH_ARTICLES_DATABASE: SDFHHArticle[] = [
  // --- SEENSA & BOQONNAA 1 ---
  {
    number: 1,
    articleLabel: 'Kwt. 1',
    titleOm: 'Daangaa Raawwatiinsaa',
    titleAm: 'የተፈፃሚነት ወሰን',
    titleEn: 'Scope of Application',
    bookNumber: 1,
    bookTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Tumaaleen seera adeemsaa guyyaa seerichi hojiirra oolu dhimmoota ilaalamaa jiranii fi fuula duratti dhiyaatan irratti raawwatiinsa qaba.',
    summaryAm: 'ይህ የስነ-ስርዓት ህግ ስራ ላይ ከዋለበት ቀን ጀምሮ በመታየት ላይ ባሉና ወደፊት በሚቀርቡ ጉዳዮች ላይ ተፈፃሚ ይሆናል።',
    summaryEn: 'The procedural provisions apply to pending and future civil suits from the date of coming into force.',
    keyRulesOm: [
      'Dhimmoota ilaalamaa jiran irratti battalatti raawwatama.',
      'Himanni mana murtii beekkamtii hin qabnetti ilaalamaa jiru gara mana murtii aangoo qabuutti darba.'
    ]
  },
  {
    number: 2,
    articleLabel: 'Kwt. 2',
    titleOm: 'Daangaa Yeroo',
    titleAm: 'የይርጋ ጊዜ',
    titleEn: 'Period of Limitation',
    bookNumber: 1,
    bookTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Osoo seerri kun hojiirra hin oolin dura darbiinsa yeroon dhimmoonni dhorkaman seera kanaan hin socho\'an.',
    summaryAm: 'ይህ ህግ ከመጽናቱ በፊት በይርጋ የታገዱ ጉዳዮች በዚህ ህግ መሰረት ዳግም አይነሱም።',
    summaryEn: 'Claims already barred by limitation prior to this law cannot be revived.',
    keyRulesOm: [
      'Darbiinsi yeroo kan lakkaa\'amu seerichi hojiirra oolee irraa eegaleeti.',
      'Darbiinsi yeroo yoo dheerate, yeroo seera kanaan tumameen raawwatama.'
    ]
  },
  {
    number: 3,
    articleLabel: 'Kwt. 3',
    titleOm: 'Hiika Jechootaa',
    titleAm: 'የትርጓሜ ድንጋጌዎች',
    titleEn: 'Interpretation / Definitions',
    bookNumber: 1,
    bookTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Hiika jechoota bu\'uuraa: Kakuu, Mana Murtii, Murtoo, Murtii Abbaa Mirgaa/Maallaqaa, Raawwachiisaa Murtii, Dubbi Fixaa Mootummaa, Murtii.',
    summaryAm: 'መሰረታዊ የህግ ቃላት ትርጓሜ፡ መሃላ፣ ፍርድ ቤት፣ ውሳኔ፣ ፍርድ ባለመብት፣ ፍርድ አስፈፃሚ፣ የመንግስት ጠበቃ፣ ፍርድ።',
    summaryEn: 'Statutory definitions of core procedural terms including Oath, Court, Decree, Decree-holder, Execution Officer, Judgment.',
    keyRulesOm: [
      'Murtoo: Yaada manni murtii ragaa qoratee sadarkaa duraatti ykn dhumarratti kennu.',
      'Murtii abbaa mirgaa: Garee murtoon murtaa\'eef ykn ajajni raawwatamuu danda\'u kennameef.',
      'Dubbi fixaa mootummaa: Maqaa mootummaatiin kan falmu ykn mana hojii bakka bu\'u.'
    ]
  },
  {
    number: 4,
    articleLabel: 'Kwt. 4',
    titleOm: 'Seeraan yoo dhorkame malee himannaa fuudhuuf aangoo kan qabu mana murtii qofa ta\'uu isaa',
    titleAm: 'በህግ በግልጽ ካልተከለከለ በስተቀር ፍርድ ቤቶች ሁሉንም ክሶች የማየት ስልጣን ያላቸው ስለመሆኑ',
    titleEn: 'Courts to try all civil suits unless expressly barred',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 1,
    chapterTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Manneen murtii seerri ifaan yoo dhorke malee himannaawwan hariiroo hawaasaa hunda fuudhanii ilaaluuf aangoo guutuu qabu.',
    summaryAm: 'ህጉ በግልጽ ካልከለከላቸው በስተቀር ፍርድ ቤቶች ማንኛውንም የፍትሐብሔር ክስ ተቀብለው የማየት ስልጣን አላቸው።',
    summaryEn: 'Courts have general plenary civil jurisdiction over all suits of a civil nature unless expressly barred by law.',
    keyRulesOm: [
      'Aangoon manneen murtii bu\'uura waliigalaati.',
      'Dhorkaan aangoo seera ifaa dhuunfaatiin qofa ta\'uu qaba.'
    ]
  },
  {
    number: 5,
    articleLabel: 'Kwt. 5',
    titleOm: 'Dhimma murtii dhumaa argate (Res Judicata)',
    titleAm: 'ቀደም ሲል የተወሰነ ጉዳይ (Res Judicata)',
    titleEn: 'Res Judicata',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 1,
    chapterTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Manni murtii kamiyyuu himannaa firii dubbii fi hundeen dubbii tokko ta\'e, gareewwan walfakkaatan gidduutti murtii dhumaa erga irratti kennameen booda irra deebiin ilaaluu hin danda\'u.',
    summaryAm: 'ተመሳሳይ ጭብጥና ምክንያት ባለው ክስ በተመሳሳይ ወገኖች መካከል የመጨረሻ ፍርድ የተሰጠበት ጉዳይ በድጋሚ አይታይም።',
    summaryEn: 'Bars re-litigation of a claim between the same parties on the same cause of action after final judgment.',
    keyRulesOm: [
      '1) Himannaa firii dubbii fi hundeen dubbii akaakuu tokko ta\'e irra deebiin dhiyaatu ilaaluu hin danda\'an.',
      '2) Wanti falmii duraa irratti ragaa ykn ittisa ta\'uu qabu ture akka dhumatetti lakkaawwama.',
      '3) Seerummaan ifaan gaafatamee fudhatama dhabe akka dhoowwameetti lakkaawwama.',
      '4) Himannaa bakka bu\'iinsaan falmame namoota hunda irratti mirga fi dirqama uuma.'
    ]
  },
  {
    number: 6,
    articleLabel: 'Kwt. 6',
    titleOm: 'Murtii irra deebiin ilaaluu (Review of Judgment / Re-trial / ዳግም ዳኝነት)',
    titleAm: 'ፍርድን በድጋሚ ስለመመርመር / ዳግም ዳኝነት',
    titleEn: 'Review of Judgment / Re-trial on Grounds of Fraud, False Evidence or Crime',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 1,
    chapterTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Tumaaleen Kwt. 5 (Res Judicata) akkuma eegamanitti ta\'ee, namni kamiyyuu murtii dhumaa irratti sababoota sobaa, jecha ragummaa sobaa, loogii (corruption) ykn gocha yakkaa irratti hundaa\'uun mana murtii murticha kennetti himannaa irra deebiin ilaaluu dhiyeessuu danda\'a.',
    summaryAm: 'የቀድሞ ፍርድ በሀሰተኛ ማስረጃ፣ በሀሰት ምስክርነት፣ በማታለል ወይም በወንጀል ድርጊት የተገኘ መሆኑ ሲረጋገጥ ፍርዱን በድጋሚ እንዲመረመር ለፈረደው ፍርድ ቤት የሚቀርብ የዳግም ዳኝነት ጥያቄ።',
    summaryEn: 'Application for review/re-trial of a final judgment to the court that rendered it on strict grounds of newly discovered fraud, perjury, bribery, or criminal acts.',
    keyRulesOm: [
      '1) Namni kamiyyuu murtii, jala murtii, ykn ajaja ol\'iyyannoo irratti dhiyaachuu danda\'u irratti osoo hin dhageessifatin dura ykn ol\'iyyannoon hin danda\'amne kennameef, mana murtii murticha kennetti kaffaltii abbaa seerummaa kaffaluun himannaa irra deebiin ilaaluu dhiyeeffachuu danda\'a.',
      'a) Murtiin kenname sanada sobaan qophaa\'een, jecha ragummaa sobaatiin, loogiidhaan, yookan gocha yakkaatiin ta\'uu fi iyyataanis murtiin osoo hin kennamin dura carraaqqii barbaachisaa taasisee beekuu kan hin dandeenye ta\'uu yoo hubachiise;',
      'b) Gochoonni kunniin osoo beekamaniiru ta\'ee murticha jijjiiruuf ykn fooyyessuuf sababa gahaa ta\'uu yoo hubachiise.',
      '2) Ragaa haaraa argame beeke irraa eegalee ji\'a 1 (tokko) keessatti himannaan dhiyaachuu qaba; ragaan jecha kakuutiin deeggaramuu qaba.',
      '3) Manni murtii garagalcha isaa garee faallaatiif ergee guyyaa beellamaa falmichi itti dhaga\'amu murteessa.',
      '4) Murtiin irra deebiin ilaalamuu qaba ykn hin qabu jedhee manni murtii murtoo kennu irratti ol\'iyyannoo dhiyeessuun hin danda\'amu.'
    ],
    crossReferences: ['SDFHH Kwt. 5', 'SDFHH Kwt. 197', 'SDFHH Kwt. 358', 'FSC Cassation File No. 249062']
  },
  {
    number: 7,
    articleLabel: 'Kwt. 7',
    titleOm: 'Dursitummaa (Prevention of Duplicate Suits)',
    titleAm: 'የቅድሚያ ክስ መብት',
    titleEn: 'Priority of Court / Forum Precedence',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 1,
    chapterTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Himannaa fi dhimmi hariiroo hawaasaa walfakkaataan tokko mana murtii tokkoo olitti hin dhiyaatu; manni murtii dursee dhiyaateef qofti falmisiisee murtii kenna.',
    summaryAm: 'አንድ አይነት ክስ ከአንድ ፍርድ ቤት በላይ አይቀርብም፤ ቀድሞ የቀረበለት ፍርድ ቤት ብቻ ያያል።',
    summaryEn: 'No person shall institute the same suit in more than one court; the court first seized of the suit proceeds.',
    keyRulesOm: [
      '1) Himannaa walfakkaataa mana murtii tokkoo olitti dhiyeessuun dhorkaadha.',
      '2) Manni murtii dursee himanni dhiyaateef qofaan falmisiisa.'
    ]
  },
  {
    number: 8,
    articleLabel: 'Kwt. 8',
    titleOm: 'Himannaawwan mana murtii biraatti beellama irra jiran (Lis Pendens)',
    titleAm: 'በሌላ ፍርድ ቤት በመታየት ላይ ያለ ክስ (Lis Pendens)',
    titleEn: 'Pending Suits / Lis Pendens',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 1,
    chapterTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Dhimmi hundee dubbii tokko ta\'ee gareewwan walfakkaatoo gidduutti mana murtii biraatti dhaga\'aa irra osoo jiruu manni murtii biraa fuudhee falmisiisuu hin danda\'u.',
    summaryAm: 'ተመሳሳይ ወገኖች ባሉበት በሌላ ፍርድ ቤት በመታየት ላይ ያለ ክስ በሌላ ፍርድ ቤት አይሰማም።',
    summaryEn: 'Stay of suit when the same subject matter is already pending before another competent Ethiopian court.',
    keyRulesOm: [
      'Falmiin beellamarra jiru manni murtii biraa fuudhee falmisiisuu hin danda\'u.',
      'Mana murtii biyya alaatti dhiyaachuun manneen murtii Itoophiyaa hin dhorku.'
    ]
  },
  {
    number: 9,
    articleLabel: 'Kwt. 9',
    titleOm: 'Manni murtii aangoo hundee dubbii dhaga\'uu kan hin qabne ennaa ta\'etti adeemsa raawwatamu',
    titleAm: 'የስረ-ነገር ስልጣን ማጣትና የሚወሰድ እርምጃ',
    titleEn: 'Procedure when Court lacks Subject-Matter Jurisdiction',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 1,
    chapterTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Manni murtii aangoo hundee dubbii hin qabne bu\'uura Kwt. 231tiin himannicha fudhatama hin qabu jedhee deebisuu ykn bu\'uura Kwt. 245tiin cufuu qaba.',
    summaryAm: 'ፍርድ ቤቱ የስረ-ነገር ስልጣን ከሌለው በክፍል 231 መሰረት ክሱን ይመልሳል ወይም በ245 መሰረት ዘግቶ ያሰናብታል።',
    summaryEn: 'Where court lacks subject-matter jurisdiction, it shall reject the claim under Art. 231 or dismiss under Art. 245 sua sponte.',
    keyRulesOm: [
      'Gareen falmii mormii dhiyeessuu baatus manni murtii ofumaan ajajuu qaba.'
    ]
  },
  {
    number: 10,
    articleLabel: 'Kwt. 10',
    titleOm: 'Manni murtii aangoo tooraa kan hin qabne ennaa ta\'etti adeemsa raawwatamu',
    titleAm: 'የአካባቢ ስልጣን ማጣትና የሚወሰድ እርምጃ',
    titleEn: 'Procedure when Court lacks Local Jurisdiction',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 1,
    chapterTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Manni murtii aangoo tooraa hin qabne bu\'uura Kwt. 231tiin iyyannicha deebisa; garuu manni murtii biraa aangoo qabaachuu qofaaf himannaa hin fuudhu jechuu hin danda\'u.',
    summaryAm: 'የአካባቢ ስልጣን የሌለው ፍርድ ቤት ክሱን ይመልሳል። በይርጋ ካልተቃወመ በስተቀር ውሳኔው አይሻርም።',
    summaryEn: 'Return of statement of claim for lack of territorial jurisdiction under Art. 231.',
    keyRulesOm: [
      'Mormiin aangoo tooraa Kwt. 244 jalatti dhiyaachuu qaba.'
    ]
  },
  {
    number: 11,
    articleLabel: 'Kwt. 11',
    titleOm: 'Himannaawwan walqabsiisuu (Consolidation of Suits)',
    titleAm: 'ክሶችን ማቀናጀትና በአንድነት ማየት',
    titleEn: 'Consolidation of Suits',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 1,
    chapterTitleOm: 'Tumaalee Waliigalaa',
    summaryOm: 'Himannaawwan ykn ol\'iyyannoowwan lamaa fi isaa ol ta\'an falmiin seeraa ykn ijoon dubbii walfakkaataa ta\'an iddoo tokkotti akka ilaalaman ajajuu.',
    summaryAm: 'ተመሳሳይ የህግና የፍሬ ነገር ጭብጥ ያላቸው ክሶች በአንድ ችሎት ተቀናጅተው እንዲታዩ ማዘዝ።',
    summaryEn: 'Consolidation of suits involving common questions of law or fact before the same court.',
    keyRulesOm: [
      'Manni murtii barbaachisummaa isaa tilmaamee walqabsiisee ilaaluuf ajaja kenna.'
    ]
  },
  {
    number: 12,
    articleLabel: 'Kwt. 12',
    titleOm: 'Qajeeltoo Aangoo Manneen Murtii',
    titleAm: 'የፍርድ ቤቶች ስልጣን መርህ',
    titleEn: 'General Principle of Pecuniary and Tier Jurisdiction',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 2,
    chapterTitleOm: 'Aangoo Manneen Murtii',
    summaryOm: 'Himanni kamiyyuu mana murtii sadarkaa jalaa himannicha ilaaluuf aangoo qabutti dhiyaachuu qaba.',
    summaryAm: 'ማንኛውም ክስ ክሱን ለማየት ስልጣን ባለው የበታች ፍርድ ቤት መቅረብ አለበት።',
    summaryEn: 'Every suit shall be instituted in the court of the lowest grade competent to try it.',
    keyRulesOm: ['Himanni jalqaba mana murtii sadarkaa jalaa aangoo qabutti dhiyaata.']
  },
  {
    number: 16,
    articleLabel: 'Kwt. 16',
    titleOm: 'Aangoo Abbaa seerummaa hanga maallaqaan murtaa\'an (Pecuniary Jurisdiction of Courts)',
    titleAm: 'በገንዘብ መጠን የሚወሰን የዳኝነት ስልጣን',
    titleEn: 'Pecuniary Jurisdiction Determined by Amount Claimed',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 2,
    chapterTitleOm: 'Aangoo Manneen Murtii',
    summaryOm: 'Hangi maallaqaa himannaan irratti dhiyaate mana murtiif aangoo abbaa seerummaa qoodameen ol yoo ta\'e malee, hanga maallaqaatiin abbaa seerummaa ilaaluuf mana murtii aangoo qabuudha.',
    summaryAm: 'የፍርድ ቤቱ የገንዘብ ስልጣን በክሱ ላይ በተጠየቀው የገንዘብ መጠንና ዋጋ ይወሰናል።',
    summaryEn: 'Pecuniary jurisdiction is determined based on the total claim value set forth in the statement of claim pursuant to Arts. 226-228.',
    keyRulesOm: [
      '1) Hangi maallaqaa iyyannicha irratti ibsame bu\'uura godhachuun aangoon murtaa\'a.',
      '2) Himannaan osoo ragaan hin dhaga\'amin dura gartokkeen yoo amaname hanga hir\'ateen mana murtii aangoo qabuuf dabarfamuu danda\'a.'
    ]
  },
  // --- AANGOO TOORAA (KWTS 19-31) ---
  {
    number: 19,
    articleLabel: 'Kwt. 19',
    titleOm: 'Qajeeltoo Aangoo Tooraa (General Rule of Local Jurisdiction)',
    titleAm: 'የአካባቢ ስልጣን ጠቅላላ መርህ',
    titleEn: 'Suits to be Instituted where Defendant Resides or Carries on Business',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 3,
    chapterTitleOm: 'Aangoo Tooraa',
    summaryOm: 'Himanni kamiyyuu bakka himatamaan jiraatutti, daldala isaa gaggeeffatutti, ykn faayidaa dhuunfaa isaa argachuuf itti hojjatutti dhiyaachuu qaba.',
    summaryAm: 'ክስ የሚቀርበው ተከሳሹ በሚኖርበት፣ ንግዱን በሚያካሂድበት ወይም ለግል ጥቅሙ በሚሰራበት ስፍራ ፍርድ ቤት ነው።',
    summaryEn: 'Suit shall be instituted where the defendant actually and voluntarily resides, carries on business, or personally works for gain.',
    keyRulesOm: [
      'Himatamtoonni tokkoo ol yoo ta\'an, bakka isaan keessaa inni tokko jiraatutti dhiyaachuu ni danda\'a.'
    ]
  },
  {
    number: 24,
    articleLabel: 'Kwt. 24',
    titleOm: 'Himannaa sababa waliigalteen dhiyaatu',
    titleAm: 'በውል ምክንያት የሚቀርብ ክስ ስልጣን',
    titleEn: 'Suits arising out of Contracts',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 3,
    chapterTitleOm: 'Aangoo Tooraa',
    summaryOm: 'Himanni waliigaltee kan dhiyaatu mana murtii iddoo waliigalteen itti taasifametti ykn itti raawwatamutti.',
    summaryAm: 'የውል ክስ ውሉ በተደረገበት ወይም በሚፈፀምበት ስፍራ ላለ ፍርድ ቤት ይቀርባል።',
    summaryEn: 'Place of suing for contracts: where contract was made or where performance was agreed to take place.',
    keyRulesOm: ['Waliigaltee inshuraansii: iddoo waajjira muummeen argamutti dhiyaata.']
  },
  {
    number: 25,
    articleLabel: 'Kwt. 25',
    titleOm: 'Himannaa sababa qabeenya hin sochoonen dhiyaatu',
    titleAm: 'የማይንቀሳቀስ ንብረት ክስ ስልጣን',
    titleEn: 'Suits regarding Immovable Property',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 3,
    chapterTitleOm: 'Aangoo Tooraa',
    summaryOm: 'Himannaan qabeenya hin sochoone deebisiisuu, qooddii, mirga murteessisuu, fi beenyaa qabeenyicharra gaheef iddoo qabeenyi hin sochoone sun argamutti dhiyaata.',
    summaryAm: 'የማይንቀሳቀስ ንብረት መልሶ የማስረከብ፣ የማካፈል ወይም የካሳ ክስ ንብረቱ በሚገኝበት ስፍራ ፍርድ ቤት ይቀርባል።',
    summaryEn: 'Suits for recovery, partition, determination of right or tort to immovable property shall be instituted where the property is situated.',
    keyRulesOm: ['Iddoo qabeenyi hin sochoone sun argamutti qofa dhiyaata.']
  },
  {
    number: 31,
    articleLabel: 'Kwt. 31',
    titleOm: 'Himannaa bakka biraatti jijjiiruu (Transfer of Suits)',
    titleAm: 'ክስን ወደ ሌላ ፍርድ ቤት ስለማዛወር',
    titleEn: 'Transfer of Suits to Another Court',
    bookNumber: 1,
    bookTitleOm: 'Aangoo Manneen Murtii',
    chapterNumber: 3,
    chapterTitleOm: 'Aangoo Tooraa',
    summaryOm: 'Murtiin osoo hin kennamin dura loogiin akka hin uumamne, gaaffiin seeraa rakkisaa ta\'e yoo ka\'e, mana murtii ol\'aanaatti iyyachuun himannichi jijjiiramuu danda\'a.',
    summaryAm: 'ያለ አድልኦ ፍትህ ለመስጠት ወይም አስቸጋሪ የህግ ጥያቄ ሲኖር ክሱ ወደ ሌላ ፍርድ ቤት እንዲዛወር ከፍተኛ ፍርድ ቤት ማዘዝ ይችላል።',
    summaryEn: 'High Court or Supreme Court may transfer any suit to another competent court on grounds of fair trial, convenience, or difficult legal issues.',
    keyRulesOm: [
      'Loogii malee murteessuun kan hin danda\'amne yoo ta\'e;',
      'Gaaffii seeraa rakkisaa ta\'e yoo ka\'e.'
    ]
  },
  // --- KITAABA 2: GAREEWWAN FALMII (KWTS 32-78) ---
  {
    number: 33,
    articleLabel: 'Kwt. 33',
    titleOm: 'Dandeettii (Capacity & Standing to Sue)',
    titleAm: 'የመክሰስና የመከሰስ ችሎታ እና መብት',
    titleEn: 'Legal Capacity and Vested Interest',
    bookNumber: 2,
    bookTitleOm: 'Himachuun Yookan Himatamuun Garee Falmii Ta\'uu',
    summaryOm: 'Namni seeraan dandeettii qabu kamiyyuu himannaa dhiyeessuu ni danda\'a; wanta ka\'uumsa ta\'e irraa mirga ykn dantaa qabaachuu qaba.',
    summaryAm: 'የህግ ችሎታ ያለውና በጉዳዩ ላይ ቀጥተኛ ህጋዊ ጥቅም ወይም መብት ያለው ሰው ብቻ ክስ ያቀርባል።',
    summaryEn: 'Every person having legal capacity and a vested legal interest or right in the subject matter may sue.',
    keyRulesOm: [
      'Mirga ykn dantaa seera qabeessa malee himannaan hin dhiyaatu.'
    ]
  },
  {
    number: 39,
    articleLabel: 'Kwt. 39',
    titleOm: 'Nama himatamuu hin qabne himachuu fi nama himatamuu qabu dhiisuu (Misjoinder & Non-joinder)',
    titleAm: 'ያልአግባብ የተከሰሰና መከሰስ ሲገባው ያልተከሰሰ ወገን (Misjoinder & Non-joinder)',
    titleEn: 'Misjoinder and Non-Joinder of Parties',
    bookNumber: 2,
    bookTitleOm: 'Himachuun Yookan Himatamuun Garee Falmii Ta\'uu',
    summaryOm: 'Nama himatamuu qabu hambisuun ykn hin qabne himachuun himannicha kufaa hin godhu; manni murtii himatamtoota dhiyaatan irratti qoratee murtii kenna.',
    summaryAm: 'አላስፈላጊ ወገን መካተት ወይም አስፈላጊ ወገን መቅረት ክሱን ውድቅ አያደርገውም።',
    summaryEn: 'No suit shall be defeated by reason of the misjoinder or non-joinder of parties.',
    keyRulesOm: [
      'Mormiin misjoinder/non-joinder falmiin osoo hin eegalin dhiyaachuu qaba; sana booda fudhatama hin qabu.'
    ]
  },
  {
    number: 40,
    articleLabel: 'Kwt. 40',
    titleOm: 'Gareewwan walfalmitootaa falmiitti dabaluu yookan bakka buusuu (Striking out or Adding Parties)',
    titleAm: 'ተከራካሪ ወገኖችን ማካተት ወይም መተካት',
    titleEn: 'Substitution and Addition of Parties',
    bookNumber: 2,
    bookTitleOm: 'Himachuun Yookan Himatamuun Garee Falmii Ta\'uu',
    summaryOm: 'Manni murtii maqaa dogoggoraan dhiyaate haquun nama sirrii bakka buusuu ykn miiltoo ta\'ee akka falmii keessa seenu ajajuu danda\'a.',
    summaryAm: 'ፍርድ ቤቱ ስህተትን ለማረም ተገቢውን ወገን በክስ ውስጥ እንዲተካ ወይም እንዲጨመር ማዘዝ ይችላል።',
    summaryEn: 'Court may order striking out improper parties and joining necessary parties for complete adjudication.',
    keyRulesOm: [
      'Namni kamiyyuu fedhii isaa malee himataatti akka dabalamu hin dirqisiifamu.'
    ]
  },
  {
    number: 41,
    articleLabel: 'Kwt. 41',
    titleOm: 'Giddu lixummaa gareewwan sadaffaa (Intervention of Third Parties)',
    titleAm: 'የሶስተኛ ወገን ጣልቃ ገብነት',
    titleEn: 'Intervention of Third Parties',
    bookNumber: 2,
    bookTitleOm: 'Himachuun Yookan Himatamuun Garee Falmii Ta\'uu',
    summaryOm: 'Himannaa irratti gareen sadaffaan kamiyyuu dhimmichi na ilaallata jedhu murtiidhan dura giddulixaa ta\'ee falmachuu ni danda\'a.',
    summaryAm: 'ማንኛውም በክሱ ላይ ህጋዊ ጥቅም አለኝ የሚል ሶስተኛ ወገን ፍርድ ከመሰጠቱ በፊት ጣልቃ ገብቶ መከራከር ይችላል።',
    summaryEn: 'Any third party showing an interest in the pending suit may apply to intervene prior to final judgment.',
    keyRulesOm: [
      'Giddu lixummaan murtiidhan dura qofa ta\'a (FSC Cassation 249062).',
      'Murtiin erga kennameen booda Kwt. 358 (Mormii Murtee) gargaaramuu qaba.'
    ]
  },
  {
    number: 70,
    articleLabel: 'Kwt. 70',
    titleOm: 'Hafiinsa himatamaa (Procedure when only Plaintiff Appears)',
    titleAm: 'ተከሳሽ ባለመቅረቡ የሚፈጸም ሥነ-ሥርዓት',
    titleEn: 'Procedure when Defendant Fails to Appear',
    bookNumber: 2,
    bookTitleOm: 'Mana Murtiitti Dhiyaachuu fi Hafiinsa Abbaa Dhimmaa',
    summaryOm: 'Waamichi ergamee himatamaan osoo hin dhiyaatin yoo hafe, bakka inni hin jirretti falmiin itti fufa (Ex-parte); waamichi hin qaqqabne yoo ta\'e waamichi 2ffaan ajajama.',
    summaryAm: 'መጥሪያ ደርሶት ተከሳሹ ካልቀረበ በሌለበት ክሱ ይሰማል፤ መጥሪያ ካልደረሰው ሁለተኛ መጥሪያ ይታዘዛል።',
    summaryEn: 'If defendant fails to appear after due service of summons, court hears plaintiff ex parte.',
    keyRulesOm: [
      'Waamichi qaqqabuun yoo mirkanaa\'e bakka inni hin jirretti falmiin itti fufa.',
      'Waamichi hin qaqqabne yoo ta\'e waamichi 2ffaan ajajama.'
    ]
  },
  {
    number: 78,
    articleLabel: 'Kwt. 78',
    titleOm: 'Himatamaan bakka hin jirretti murtoo kenname kaasuu (Setting Aside Ex-Parte Decree)',
    titleAm: 'ተከሳሹ በሌለበት የተሰጠ ውሳኔን ስለማስነሳት',
    titleEn: 'Setting Aside Decree Ex Parte against Defendant',
    bookNumber: 2,
    bookTitleOm: 'Mana Murtiitti Dhiyaachuu fi Hafiinsa Abbaa Dhimmaa',
    summaryOm: 'Himatamaan bakka inni hin jirretti murtoon kennamee yeroo beeke irraa ji\'a 1 (tokko) keessatti waamichi hin qaqqabne ykn sababa gahaadhan hafe jedhee kaasisuuf iyyachuu danda\'a.',
    summaryAm: 'በሌለበት ፍርድ የተሰጠበት ተከሳሽ ፍርዱን ባወቀ በ1 ወር ውስጥ መጥሪያ አልደረሰኝም ወይም በበቂ ምክንያት ቀርቻለሁ በማለት ውሳኔው እንዲነሳ ማመልከት ይችላል።',
    summaryEn: 'Defendant against whom ex-parte decree is passed may apply within one month to set it aside on grounds of non-service or sufficient cause for absence.',
    keyRulesOm: [
      'Yeroon iyyannoo: Ji\'a 1 (tokko) keessatti.',
      'Sababa: Waamichi sirnaan qaqqabuu dhabuu ykn dhiyaachuuf sababa gahaa qabaachuu.'
    ]
  },
  // --- KITAABA 3: FALMIIWWAN BARREEFFAMAA & WAAMICHA (KWTS 79-212) ---
  {
    number: 80,
    articleLabel: 'Kwt. 80',
    titleOm: 'Falmiiwwan barreeffamaa irratti wantoota ibsamuu qaban (Contents of Pleadings)',
    titleAm: 'የጽሁፍ ክርክር ይዘት',
    titleEn: 'Contents of Pleadings',
    bookNumber: 3,
    bookTitleOm: 'Tumaalee Himannoo Hariiroo Hawaasaa Ilaallatan',
    chapterNumber: 1,
    chapterTitleOm: 'Falmiiwwan Barreeffamaa',
    summaryOm: 'Himannaa, deebii ittisaa fi ol\'iyyannoo irratti dhimmi ijoo, lakkoofsi maallaqaa fakkii fi jechaan, fi guyyaan akka kalandarii Itoophiyaatti ibsamuu qaba.',
    summaryAm: 'ክስና መልስ አጭርና ግልጽ ሆኖ የገንዘብ መጠን በፊደልና በቁጥር፣ ቀናት በኢትዮጵያ ዘመን አቆጣጠር መገለጽ አለባቸው።',
    summaryEn: 'Pleadings shall state concise material facts, dates in Ethiopian calendar, amounts in figures and words.',
    keyRulesOm: ['Pleadings must contain concise material facts without evidence.']
  },
  {
    number: 83,
    articleLabel: 'Kwt. 83',
    titleOm: 'Dhimmi ifaan haalamuu akka qabu (Specific Denial)',
    titleAm: 'ነጥቦችን ለይቶና በግልጽ ስለመካድ',
    titleEn: 'Denial to be Specific',
    bookNumber: 3,
    bookTitleOm: 'Tumaalee Himannoo Hariiroo Hawaasaa Ilaallatan',
    chapterNumber: 1,
    chapterTitleOm: 'Falmiiwwan Barreeffamaa',
    summaryOm: 'Himatamaan wanta dhiyaate hunda tarreessee ifaan haaluu qaba; ifaan haaluu dhabuun akka amanameetti lakkaawwama.',
    summaryAm: 'ተከሳሹ በክሱ የቀረቡትን ነጥቦች በግልጽ መካድ አለበት፤ በግልጽ ያልተካደ እንደታመነ ይቆጠራል።',
    summaryEn: 'Every allegation of fact must be denied specifically; evasive denial is deemed an admission.',
    keyRulesOm: ['Wanti ifaan hin haalamne akka amanameetti lakkaawwama.']
  },
  {
    number: 91,
    articleLabel: 'Kwt. 91',
    titleOm: 'Falmii barreeffamaa fooyyessuu (Amendment of Pleadings)',
    titleAm: 'የክስና መልስ ማሻሻያ',
    titleEn: 'Amendment of Pleadings',
    bookNumber: 3,
    bookTitleOm: 'Tumaalee Himannoo Hariiroo Hawaasaa Ilaallatan',
    chapterNumber: 1,
    chapterTitleOm: 'Falmiiwwan Barreeffamaa',
    summaryOm: 'Murtiin osoo hin kennamin dura manni murtii falmii barreeffamaa akka fooyyeffatan eeyyamuufii ni danda\'a.',
    summaryAm: 'ፍርድ ከመሰጠቱ በፊት ፍርድ ቤቱ ለፍትህ አሰጣጥ አስፈላጊ ሆኖ ሲያገኘው የጽሁፍ ክርክር እንዲሻሻል ሊፈቅድ ይችላል።',
    summaryEn: 'Court may at any stage allow either party to amend pleadings for determining the real question in controversy.',
    keyRulesOm: ['Manni murtii yeroo kamiyyuu murtii dura fooyyessuu eeyyamuu danda\'a.']
  },
  {
    number: 92,
    articleLabel: 'Kwt. 92',
    titleOm: 'Falmii barreeffamaa mirkaneessuu (Verification of Pleadings)',
    titleAm: 'የክስና መልስ ማረጋገጫ (Verification)',
    titleEn: 'Verification of Pleadings',
    bookNumber: 3,
    bookTitleOm: 'Tumaalee Himannoo Hariiroo Hawaasaa Ilaallatan',
    chapterNumber: 1,
    chapterTitleOm: 'Falmiiwwan Barreeffamaa',
    summaryOm: 'Falmii barreeffamaa dhiyaateen wanti ibsame iyyataan ykn namni beeku dhugaa ta\'uu isaa miila jalatti mirkaneessuu qaba.',
    summaryAm: 'በክስ ወይም መልስ ላይ የተገለፀው እውነት መሆኑን ባለጉዳዩ በፊርማው ማረጋገጥ አለበት።',
    summaryEn: 'Pleadings must be verified at foot by the party or authorized person certifying truth of contents.',
    keyRulesOm: ['Barreeffamichi miila jalatti dhugaa ta\'uu isaa mirkaneessuu qaba.']
  },
  {
    number: 137,
    articleLabel: 'Kwt. 137',
    titleOm: 'Yeroo ragaan barreeffamaa itti dhiyaatu (Production of Documentary Evidence)',
    titleAm: 'የሰነድ ማስረጃ የሚቀርብበት ጊዜ',
    titleEn: 'Production of Documentary Evidence at First Hearing',
    bookNumber: 3,
    bookTitleOm: 'Sanadoota Dhiyeessuu, Saamsuudhaan ykn Kabajuudhan Akka Turu Gochuu',
    summaryOm: 'Gareewwan ragaa barreeffamaa harka isaaniitti argamu hunda dhaga\'a duraatti dhiyeeffachuu qabu; sana booda eeyyama malee hin dhiyaatu.',
    summaryAm: 'ተከራካሪዎች የሰነድ ማስረጃዎቻቸውን በመጀመሪያው የችሎት ቀጠሮ ማቅረብ አለባቸው፤ ከዚያ ውጭ ያለበቂ ምክንያት አይፈቀድም።',
    summaryEn: 'Parties must produce all documentary evidence in their possession at the first hearing of the suit.',
    keyRulesOm: ['Sanadoonni tarreeffamaa fi baay\'ina isaanii barreeffama ibsu wajjin dhiyaatu.']
  },
  {
    number: 147,
    articleLabel: 'Kwt. 147',
    titleOm: 'Mana murtiitti dhiyaachuuf wabummaa kennamu (Security for Appearance / Arrest before Judgment)',
    titleAm: 'ፍርድ ከመሰጠቱ በፊት ዋስትና እንዲሰጥ ወይም ተከሳሹ እንዲታሰር የሚሰጥ ትዕዛዝ',
    titleEn: 'Arrest before Judgment / Security for Appearance',
    bookNumber: 3,
    bookTitleOm: 'Dhorkaa fi Ajajoota Biroo Yeroof Kennaman',
    summaryOm: 'Himatamaan baqachuuf, daangaa mana murtii ala bahuuf, ykn qabeenya qisaasessuuf yoo yaale, hidhamee akka dhiyaatu ykn wabii akka qabsiisu ajajama.',
    summaryAm: 'ተከሳሹ ፍርዱን ለማሰናከል ሊሰወር ወይም ንብረት ሊያሸሽ ሲሞክር ፍርድ ቤት ቀርቦ ዋስ እንዲያቆም ወይም እንዲታሰር ይታዘዛል።',
    summaryEn: 'Where defendant is about to abscond or dispose of property, court may issue warrant of arrest or demand security for appearance.',
    keyRulesOm: [
      'Himatamaan sababa gahaa malee wabii qabsiisuu yoo dide ji\'a 6 hin caalle hidhamuu danda\'a (Kwt. 150).'
    ]
  },
  {
    number: 151,
    articleLabel: 'Kwt. 151',
    titleOm: 'Meeshaa yookan qabeenya barbaadame dhiyeessuuf wabummaa kennamu (Attachment before Judgment)',
    titleAm: 'ፍርድ ከመሰጠቱ በፊት ንብረት እንዳይሸሽ የሚሰጥ የዕገዳ ትዕዛዝ',
    titleEn: 'Attachment before Judgment',
    bookNumber: 3,
    bookTitleOm: 'Dhorkaa fi Ajajoota Biroo Yeroof Kennaman',
    summaryOm: 'Himatamaan qabeenya isaa dhoksuudhaf, qisaasessuudhaf, ykn daangaa aangoo mana murtichaatin alatti baasuuf yoo kaayyeeffate, qabeenyichi murtiin dura kabajama (attaches).',
    summaryAm: 'ተከሳሹ ንብረቱን ሊደብቅ ወይም ሊያሸሽ ሲል ፍርድ ከመሰጠቱ በፊት ንብረቱ እንዲታገድ ፍርድ ቤቱ ያዛል።',
    summaryEn: 'Attachment before judgment where defendant is about to dispose of or remove property from court jurisdiction.',
    keyRulesOm: ['Qabeenyi qabamu gatii himannichaatin walmadaala.']
  },
  {
    number: 154,
    articleLabel: 'Kwt. 154',
    titleOm: 'Haala ajajni dhorkaa yeroof itti kennamu (Temporary Injunctions)',
    titleAm: 'ጊዜያዊ የዕገዳ ትዕዛዝ (Temporary Injunction)',
    titleEn: 'Temporary Injunctions to Prevent Waste, Damage, or Alienation',
    bookNumber: 3,
    bookTitleOm: 'Dhorkaa fi Ajajoota Biroo Yeroof Kennaman',
    summaryOm: 'Qabeenyi falmichaaf ka\'uumsa ta\'e akka hin badne, hin qisaasofne, nama biraatif akka hin dabarsamne manni murtii ajaja dhorkaa yeroo kenna.',
    summaryAm: 'አከራካሪው ንብረት እንዳይበላሽ፣ እንዳይሸጥ ወይም ለሶስተኛ ወገን እንዳይተላለፍ የሚሰጥ ጊዜያዊ እገዳ።',
    summaryEn: 'Grant of temporary injunction to stay waste, damage, alienation or wrongful sale of disputed property.',
    keyRulesOm: [
      'Ajaja dhorkaa cabsuun adabbii yakkaa Kwt. 443 fi hidhaa ji\'a 6 qaqqabsiisa (Kwt. 156).'
    ]
  },
  {
    number: 177,
    articleLabel: 'Kwt. 177',
    titleOm: 'Iyyannoo sababa dirqisiifamanii qabamuun dhiyaatu (Habeas Corpus)',
    titleAm: 'ያለአግባብ መታሰርን መቃወሚያ (Habeas Corpus)',
    titleEn: 'Directions in the Nature of Habeas Corpus',
    bookNumber: 3,
    bookTitleOm: 'Seerummaa fi Adeemsa Dirqisiisuun Qabiinsi Itti Raawwatamu',
    summaryOm: 'Namni seeraan ala hidhame ykn dirqisiifamee akka hin sochoone daangeffame mana murtii ol\'aanaatti iyyachuun akka gadhiifamu gaafachuu danda\'a.',
    summaryAm: 'ያለ ፍርድ ቤት ትዕዛዝ ወይም ያለአግባብ የታሰረ ሰው በአስቸኳይ እንዲፈታ ለከፍተኛ ፍርድ ቤት የሚያቀርበው አቤቱታ።',
    summaryEn: 'Application for immediate production and release of unlawfully detained person (Habeas Corpus).',
    keyRulesOm: [
      'Iyyannoon kakuudhaan deeggaramee mana murtii ol\'aanaatti dhiyaata.',
      'Manni murtii yerooma sana namni hidhe qabee akka dhiyeessu ajaja kenna.'
    ]
  },
  {
    number: 197,
    articleLabel: 'Kwt. 197',
    titleOm: 'Haala manni murtii yeroo murteessuun beellama itti kennuu danda\'u (Adjournment & Stay)',
    titleAm: 'ቀጠሮ መስጠትና ክርክርን ለጊዜው ማገድ',
    titleEn: 'Adjournment and Stay of Proceedings',
    bookNumber: 3,
    bookTitleOm: 'Tumaalee Addaa Addaa',
    chapterNumber: 1,
    chapterTitleOm: 'Daangaa Yeroo fi Beellama',
    summaryOm: 'Manni murtii sababa gahaadhan falmii beellamuu ykn dhaddacha biraatti falmiin kan biraa erga murtaa\'een booda akka ilaalamu yeroof dhaabuu danda\'a.',
    summaryAm: 'ፍርድ ቤቱ በበቂ ምክንያት ቀጠሮ ሊሰጥ ወይም በሌላ ችሎት የሚታይ ውሳኔ እስኪሰጥ ድረስ ክርክሩን ለጊዜው አግዶ ሊያቆይ ይችላል።',
    summaryEn: 'Discretionary adjournment and stay of proceedings pending determination of related suits or reviews.',
    keyRulesOm: [
      'Falmichi hanga murtii argatutti beellamaan akka turu gochuun ni danda\'ama.',
      'SDFHH Kwt. 6 irra deebiin ilaaluun yeroo jiru Kwt. 358n Kwt. 197 jalatti dhaabbata (FSC 249062).'
    ]
  },
  {
    number: 208,
    articleLabel: 'Kwt. 208',
    titleOm: 'Dogoggora sirreessuu (Correction of Clerical/Arithmetical Errors)',
    titleAm: 'የጽህፈትና የሂሳብ ስህተቶችን ስለማረም',
    titleEn: 'Amendment of Judgments, Decrees, or Orders',
    bookNumber: 3,
    bookTitleOm: 'Tumaalee Addaa Addaa',
    summaryOm: 'Dogoggora barreeffamaa, lakkoofsa barreessu keessaa hir\'isuu ykn jecha dogoggoraan osoo hin yaadne irra utaalame manni murtii matuma isaatin ykn iyyannoon soroorsuu ni danda\'a.',
    summaryAm: 'የጽህፈት ወይም የሂሳብ ግድፈቶችን ፍርድ ቤቱ በራሱ ተነሳሽነት ወይም በባለጉዳዮች ማመልከቻ በማንኛውም ጊዜ ሊያርም ይችላል።',
    summaryEn: 'Clerical or arithmetical mistakes in judgments, decrees, or orders may be corrected by the court at any time.',
    keyRulesOm: ['Dogoggorri barreeffamaa yeroo kamiyyuu sirreeffamuu danda\'a.']
  },
  // --- KITAABA 4: SADARKAA JALQABAATTI FALMIIWWAN IDILEE (KWTS 213-273) ---
  {
    number: 213,
    articleLabel: 'Kwt. 213',
    titleOm: 'Himanni kan jalqabu falmiin barreeffamaa sababa himannaa ibsu yeroo dhiyaatetti ta\'uu',
    titleAm: 'ክስ መጀመር የሚቆጠረው የክስ ማመልከቻ ለፍርድ ቤት ሲቀርብ ስለመሆኑ',
    titleEn: 'Suit to be Commenced by Statement of Claim',
    bookNumber: 4,
    bookTitleOm: 'Sadarkaa Jalqabaatti Falmiiwwan Idilee Ilaalaman',
    summaryOm: 'Himannaan kamiyyuu akka dhiyaatetti kan lakkaawwamu mana galmee mana murtiitti barreeffamee yeroo dhiyaateedha.',
    summaryAm: 'ማንኛውም ክስ እንደተመሰረተ የሚቆጠረው በጽሁፍ ለፍርድ ቤቱ መዝገብ ቤት ሲቀርብ ነው።',
    summaryEn: 'Every suit shall be instituted by presenting a statement of claim to the court registry.',
    keyRulesOm: ['Ulaagaaleen Kwt. 80-93 fi 222-236 guuttamuu qabu.']
  },
  {
    number: 231,
    articleLabel: 'Kwt. 231',
    titleOm: 'Haala manni murtii himannaa dhiyaate itti ofirraa deebisu (Rejection of Statement of Claim)',
    titleAm: 'ክስ ውድቅ የሚደረግበት / የሚመለስበት ሁኔታ',
    titleEn: 'Rejection of Statement of Claim',
    bookNumber: 4,
    bookTitleOm: 'Bu\'uureessaa fi Dhiyeessa Himannaa',
    summaryOm: 'Manni murtii himannaa fudhatama hin qabu jedhee kan deebisu: (a) wanti ibsame kan hin himachiifne yoo ta\'e; (b) dhimmi ibsame aangoo mana murtichaatin ala yoo ta\'e.',
    summaryAm: 'ክሱ ተቀባይነት አጥቶ የሚመለሰው፡ ህጋዊ የክስ ምክንያት ከሌለው ወይም ከፍርድ ቤቱ ስልጣን ውጭ ከሆነ ነው።',
    summaryEn: 'Rejection of statement of claim where it discloses no cause of action or relief is outside court jurisdiction.',
    keyRulesOm: [
      'Wanti ibsame kan hin himachiifne (no cause of action) yoo ta\'e;',
      'Aangoo mana murtichaan ala yoo ta\'e.'
    ]
  },
  {
    number: 244,
    articleLabel: 'Kwt. 244',
    titleOm: 'Falmii sadarkaa duraa irratti mormiiwwan dhiyaatan (Preliminary Objections)',
    titleAm: 'የመጀመሪያ ደረጃ መቃወሚያዎች',
    titleEn: 'Preliminary Objections',
    bookNumber: 4,
    bookTitleOm: 'Waa\'ee Dhaga\'a Himannaa',
    summaryOm: 'Mormiiwwan sadarkaa duraa ragaa dhaga\'uun dura murtaa\'uu qaban: Aangoo dhabuu, Dhimma murtaa\'e (Res Judicata), Dhimma beellamarra jiru (Lis Pendens), Garee sirrii hin taane (Locus Standi), Darbiinsa yeroo (Period of Limitation), Waliigaltee araaraa/Jaarsummaa.',
    summaryAm: 'የመጀመሪያ ደረጃ መቃወሚያዎች፡ የስልጣን ማጣት፣ ቀደም ሲል የተወሰነ (Res Judicata)፣ በሌላ ችሎት ያለ (Lis Pendens)፣ ህጋዊ ችሎታ ወይም መብት ማጣት፣ የይርጋ ክልከላ፣ የግልግል/እርቅ ስምምነት።',
    summaryEn: 'Mandatory preliminary objections to be heard before trial on merits: jurisdiction, res judicata, lis pendens, locus standi, limitation, arbitration agreement.',
    keyRulesOm: [
      'Mormiiwwan kunniin hunduu battaluma falmii duraatti dhiyaachuu qabu.',
      'Kwt. 244(1)(b) Res Judicata ykn (f) Darbiinsa yeroo yoo ta\'e himannichi guutummaatti cufama (Kwt. 245(2)).'
    ]
  },
  {
    number: 246,
    articleLabel: 'Kwt. 246',
    titleOm: 'Ijoo dubbii baasuu yookan qabachuu (Framing of Issues)',
    titleAm: 'ጭብጥ ስለመያዝ',
    titleEn: 'Framing of Issues',
    bookNumber: 4,
    bookTitleOm: 'Waa\'ee Dhaga\'a Himannaa',
    summaryOm: 'Mormiin sadarkaa duraa erga murtaa\'een booda manni murtii seerri ykn firiin dubbii abbootiin dhimmaa irratti adda bahan maal akka ta\'e adda baasee ijoo qabata.',
    summaryAm: 'የመጀመሪያ ደረጃ መቃወሚያ ከተጠናቀቀ በኋላ ፍርድ ቤቱ ወገኖች የተጋጩባቸውን የህግና የፍሬ ነገር ጭብጦች ይይዛል።',
    summaryEn: 'At the first hearing, court shall ascertain upon what material propositions of fact or law the parties are at variance and frame issues.',
    keyRulesOm: ['Ijoon dubbii seeraa fi firii dubbii adda bahee qabama.']
  },
  {
    number: 258,
    articleLabel: 'Kwt. 258',
    titleOm: 'Mirga himannaa saaquu fi falmii eegaluu (Right to Begin)',
    titleAm: 'ክስ የመክፈትና ክርክር የመጀመር መብት',
    titleEn: 'Right to Begin at Trial',
    bookNumber: 4,
    bookTitleOm: 'Falmii Dhaga\'uu fi Naqaashota Qorachuu',
    summaryOm: 'Mirga himannaa saaquu kan qabu himataadha; garuu himatamaan wanta dhiyaate amanee wanta haaraa yoo kaase falmicha kan saaqu himatamaadha.',
    summaryAm: 'ክስ የመክፈት መብት የከሳሽ ነው፤ ነገር ግን ተከሳሹ ፍሬ ነገሩን አምኖ አዲስ መከላከያ ካነሳ ተከሳሹ ይጀምራል።',
    summaryEn: 'Plaintiff has the right to begin unless defendant admits facts and contends on points of law or additional facts.',
    keyRulesOm: ['Burden of proof / Right to begin qajeeltoo seeraatiin qajeelfama.']
  },
  {
    number: 263,
    articleLabel: 'Kwt. 263',
    titleOm: 'Haala gaaffiin naqaashotaaf itti gaafatamu (Examination of Witnesses)',
    titleAm: 'ምስክሮችን የመመርመር ሥነ-ሥርዓት',
    titleEn: 'Examination-in-Chief, Cross-Examination, and Re-Examination',
    bookNumber: 4,
    bookTitleOm: 'Falmii Dhaga\'uu fi Naqaashota Qorachuu',
    summaryOm: 'Tartiiba qorannoo ragaalee: (1) Gaaffii Duraa (Examination-in-chief); (2) Gaaffii Qaxxaamuraa (Cross-examination); (3) Gaaffii Keessa Deebii (Re-examination).',
    summaryAm: 'የምስክር አሰማም ስርዓት፡ ዋና ጥያቄ፣ መስቀለኛ ጥያቄ (ስህተትንና ሀሰትን ለማጋለጥ)፣ ድጋሚ ጥያቄ (ያልጠራውን ለማብራራት)።',
    summaryEn: 'Procedural rules governing direct examination, cross-examination, and re-examination of witnesses.',
    keyRulesOm: [
      '1) Gaaffiin duraa firii dubbii naqaashiin beeku qofa irratti bu\'uureffama.',
      '2) Gaaffiin qajeelchaa (leading question) gaaffii duraarratti hin dhiyaatu.',
      '3) Gaaffiin qaxxaamuraa dogoggoraa fi qabxii sobaa mirkaneessuuf dhiyaata.'
    ]
  },
  {
    number: 274,
    articleLabel: 'Kwt. 274',
    titleOm: 'Waliigaltee araaraa (Compromise of Suit)',
    titleAm: 'የእርቅ ስምምነት',
    titleEn: 'Compromise of Suit',
    bookNumber: 4,
    bookTitleOm: 'Falmii Addaan Kutuu',
    summaryOm: 'Gareewwan falmii isaanii guutummaatti ykn gartokkeen waliigaltee araaraan xumuruu ni danda\'u; manni murtii galmeessee murtii araaraa kenna.',
    summaryAm: 'ተከራካሪዎች ክርክራቸውን ሙሉ በሙሉ ወይም በከፊል በእርቅ ስምምነት ሊጨርሱ ይችላሉ፤ ፍርድ ቤቱም መዝግቦ ያጸድቀዋል።',
    summaryEn: 'Parties may adjust, compromise, or satisfy suit by lawful agreement recorded by court decree.',
    keyRulesOm: ['Waliigalteen araaraa seera hariiroo hawaasaa Kwt. 3307-3324 waliin deema.']
  },
  {
    number: 278,
    articleLabel: 'Kwt. 278',
    titleOm: 'Eeyyama mana murtiin himannaa kaasuu (Withdrawal of Suit)',
    titleAm: 'ክስን በፍርድ ቤት ፈቃድ ስለማንሳት',
    titleEn: 'Withdrawal of Suit with Leave to Institute Fresh Suit',
    bookNumber: 4,
    bookTitleOm: 'Falmii Addaan Kutuu',
    summaryOm: 'Himataan himannaa dhiyeesse kaasuuf ykn himannaa haaraa dhiyeessuuf mirga eeggatee akka kaasu manni murtii eeyyamuufii ni danda\'a.',
    summaryAm: 'ከሳሽ በክሱ ላይ የቅርጽ ጉድለት ካለ በድጋሚ የመክሰስ መብቱ ተጠብቆ ክሱን እንዲያነሳ ፍርድ ቤቱ ሊፈቅድለት ይችላል።',
    summaryEn: 'Withdrawal of suit with liberty to institute a fresh suit on formal defect or sufficient grounds.',
    keyRulesOm: [
      'Eeyyama malee yoo dhiise himannaa biraa dhiyeessuu hin danda\'u (Kwt. 279).'
    ]
  },
  // --- KITAABA 5: ADEEMSA ADDAA (KWTS 284-319) ---
  {
    number: 284,
    articleLabel: 'Kwt. 284',
    titleOm: 'Adeemsa sirna gabaabaa irratti ibsa addaa teessifamu (Summary Procedure)',
    titleAm: 'የአጭር ስነ-ስርዓት ክስ',
    titleEn: 'Special Endorsement and Summary Procedure on Negotiable Instruments & Debts',
    bookNumber: 5,
    bookTitleOm: 'Adeemsa Addaa',
    chapterNumber: 1,
    chapterTitleOm: 'Adeemsa Sirna Gabaabaa',
    summaryOm: 'Maallaqa callaa, cheekii, waraqaa awwaalaa, ykn sanada herreegaa qulqullaa\'aa irratti himataan adeemsa sirna gabaabaan himannaa dhiyeessuu ni danda\'a.',
    summaryAm: 'በቼክ፣ በብድር ውል ወይም በተጣራ የገንዘብ ሰነድ ላይ በአጭር ስነ-ስርዓት የሚቀርብ ክስ።',
    summaryEn: 'Summary procedure applicable to claims on promissory notes, bills of exchange, cheques, or liquidated debts.',
    keyRulesOm: [
      'Himatamaan eeyyama mana murtii malee ittisa dhiyeessuu hin danda\'u (Kwt. 285-286).'
    ]
  },
  {
    number: 293,
    articleLabel: 'Kwt. 293',
    titleOm: 'Itti gaafatamummaa ofirraa buusuuf falmii barreeffamaa dhiyaatu (Interpleader Suit)',
    titleAm: 'ሃላፊነትን ከራስ ላይ ለማውረድ የሚቀርብ ክስ (Interpleader)',
    titleEn: 'Interpleader Suits',
    bookNumber: 5,
    bookTitleOm: 'Adeemsa Addaa',
    chapterNumber: 2,
    chapterTitleOm: 'Itti Gaafatamummaa Jalaa Of Baasuu',
    summaryOm: 'Qabeenyi ykn maallaqni nama harkatti argamee abbootiin mirgaa baay\'een kan keenya yoo jedhan, abbaan qabeenyaa ofirraa buusuuf dhiyeessu.',
    summaryAm: 'ንብረት በእጁ የሚገኝ ሰው ተፎካካሪ ባለመብቶች ሲመጡበት እራሱን ነጻ ለማድረግ የሚያቀርበው ክስ።',
    summaryEn: 'Interpleader suit instituted by person claiming no interest other than charges or costs against competing claimants.',
    keyRulesOm: ['Himataan baasii fi kisaaraa malee qabeenyicharraa dantaa hin qabu.']
  },
  {
    number: 300,
    articleLabel: 'Kwt. 300',
    titleOm: 'Adeemsa sirna ariitii (Accelerated Procedure)',
    titleAm: 'የአፋጣኝ ስነ-ስርዓት ክርክር',
    titleEn: 'Scope of Accelerated Procedure',
    bookNumber: 5,
    bookTitleOm: 'Adeemsa Addaa',
    chapterNumber: 3,
    chapterTitleOm: 'Adeemsa Sirna Ariitii',
    summaryOm: 'Dhimmoota addaa akka jijjiirraa maqaa, eeyyama gaa\'ilaa, dhaamoo, galmee mirkaneessuu, walgahii waamuu fi kkf ariitiin murteessuu.',
    summaryAm: 'የስም ለውጥ፣ የጋብቻ ተቃውሞ፣ የኑዛዜ ማረጋገጫና አስቸኳይ ጉዳዮች የሚታዩበት አፋጣኝ ስነ-ስርዓት።',
    summaryEn: 'Accelerated non-contentious procedural proceedings for urgent civil determinations and status certifications.',
    keyRulesOm: ['Guyyaa 15 keessatti dhiyaachuu qaba (Kwt. 301).']
  },
  {
    number: 315,
    articleLabel: 'Kwt. 315',
    titleOm: 'Jaarsummaa Qajeeltoo (Arbitration)',
    titleAm: 'የግልግል ዳኝነት መርህ',
    titleEn: 'Arbitration Agreement and Arbitral Tribunal',
    bookNumber: 5,
    bookTitleOm: 'Adeemsa Addaa',
    chapterNumber: 4,
    chapterTitleOm: 'Jaarsummaa',
    summaryOm: 'Dhimmi seerri eeyyamu yoo ta\'e gareewwan jaarsummaan akka murtaa\'u waliigaluu ni danda\'u.',
    summaryAm: 'ህጉ በሚፈቅደው ጉዳይ ላይ ተከራካሪዎች በግልግል ዳኝነት እንዲወሰን ሊስማሙ ይችላሉ።',
    summaryEn: 'Reference of disputes to arbitration in accordance with Civil Code Arts. 3325-3346.',
    keyRulesOm: ['Dhimmoota seerri dhorke jaarsummaaf dhiyeessuun hin danda\'amu.']
  },
  // --- KITAABA 6: OL'IYYANNOO, MORMII & MURTII QULQULLEESSUU (KWTS 320-370) ---
  {
    number: 320,
    articleLabel: 'Kwt. 320',
    titleOm: 'Haala ol\'iyyannoon itti eeyyamamu (Appeal from Final Judgments)',
    titleAm: 'የይግባኝ መብትና የሚፈቀድበት ሁኔታ',
    titleEn: 'Appeals from Decrees and Appealable Orders',
    bookNumber: 6,
    bookTitleOm: 'Ol\'iyyannoo, Mormii Yookan Murtiin Akka Fooyya\'u Iyyachuu',
    summaryOm: 'Murtii dhumaa kenname irratti ol\'iyyannoo gaafachuun ni danda\'ama; ajaja yeroof kennamu (interlocutory orders) irratti murtiin dura ol\'iyyannoon hin dhiyaatu.',
    summaryAm: 'ይግባኝ የሚባለው በመጨረሻ ፍርድ ላይ ብቻ ነው፤ ከመጨረሻ ፍርድ በፊት በሚሰጡ መካከለኛ ትዕዛዞች (interlocutory orders) ላይ ለብቻቸው ይግባኝ አይባልም።',
    summaryEn: 'Appeals lie from final judgments only; interlocutory orders are not appealable until final decree.',
    keyRulesOm: [
      '1) Murtii dhumaa irratti ol\'iyyannoo gaafachuun ni danda\'ama.',
      '2) Ajaja yeroof kennamu irratti murtii dura ol\'iyyannoo jechuun hin danda\'amu.',
      '3) Murtiin dhumaa erga kennameen booda sababoota komii kana dabalee ol\'iyyachuu ni danda\'a.'
    ]
  },
  {
    number: 323,
    articleLabel: 'Kwt. 323',
    titleOm: 'Yeroo fi adeemsa dhiyeessa ol\'iyyannoo (Period of Limitation for Appeal)',
    titleAm: 'የይግባኝ ማቅረቢያ ጊዜ (60 ቀናት)',
    titleEn: 'Limitation Period for Appeal (60 Days)',
    bookNumber: 6,
    bookTitleOm: 'Ol\'iyyannoo, Mormii Yookan Murtiin Akka Fooyya\'u Iyyachuu',
    summaryOm: 'Ol\'iyyannoon mana murtii ol\'iyyannoo dhaga\'uutti dhiyaachuu kan qabu murtichi kennamee guyyoota 60 (jaatama) keessattiidha.',
    summaryAm: 'ይግባኝ ለይግባኝ ሰሚ ፍርድ ቤት መቅረብ ያለበት ፍርዱ በተሰጠ በ60 (ስልሳ) ቀናት ውስጥ ነው።',
    summaryEn: 'Every appeal must be preferred within sixty days from the date of the judgment/decree.',
    keyRulesOm: [
      'Yeroon ol\'iyyannoo: Guyyoota 60 (jaatama).',
      'Yeroon yoo darbe Kwt. 324-325 jalatti eeyyamsiisa dhiyeessuu qaba.'
    ]
  },
  {
    number: 332,
    articleLabel: 'Kwt. 332',
    titleOm: 'Ajaja dhorkaa mana murtii ol\'iyyannoo dhaga\'uun kennamu (Stay of Execution on Appeal)',
    titleAm: 'በይግባኝ ሰሚ ፍርድ ቤት የሚሰጥ የፍርድ አፈፃፀም እገዳ',
    titleEn: 'Stay of Execution by Appellate Court',
    bookNumber: 6,
    bookTitleOm: 'Ol\'iyyannoo, Mormii Yookan Murtiin Akka Fooyya\'u Iyyachuu',
    summaryOm: 'Ol\'iyyannoon dhiyaachuu qofaan raawwiin murtii hin dhaabbatu; manni murtii ol\'iyyannoo dhaga\'u qoratee yoo ajaje qofa raawwiin murtii dhorkama.',
    summaryAm: 'ይግባኝ መጠየቁ ብቻውን የፍርድ አፈፃፀምን አያግድም፤ ይግባኝ ሰሚው ፍርድ ቤት በበቂ ምክንያት ሲያግድ ብቻ ነው።',
    summaryEn: 'An appeal does not operate as an automatic stay of proceedings or execution; stay requires specific court order under sufficient cause and security.',
    keyRulesOm: [
      'Ol\'iyyannoon dhiyaachuun raawwii murtii ofumaan hin dhorku.',
      'Manni murtii ol\'iyyannoo dhaga\'u yoo ajaje qofa dhorkama (Kwt. 335).'
    ]
  },
  {
    number: 358,
    articleLabel: 'Kwt. 358',
    titleOm: 'Gareewwan mormii dhiyeessuu danda\'an (Opposition to Judgment by Third Party)',
    titleAm: 'የፍርድ መቃወሚያ ማቅረብ የሚችሉ ወገኖች',
    titleEn: 'Opposition to Judgment by Non-Party Third Party',
    bookNumber: 6,
    bookTitleOm: 'Mormii (Opposition)',
    summaryOm: 'Namni falmii keessatti hin hirmaatin garuu murtii kennameen mirgi isaa tuqame murtiin kenname osoo hin raawwatamin dura mormii isaa dhiyeeffachuu ni danda\'a.',
    summaryAm: 'በክሱ ውስጥ ያልተሳተፈ ነገር ግን በተሰጠው ፍርድ መብቱ የተነካበት ሶስተኛ ወገን ፍርዱ ከመፈጸሙ በፊት የፍርድ መቃወሚያ ማቅረብ ይችላል።',
    summaryEn: 'Any person who was not a party or represented in the suit and whose rights are prejudiced by the decree may file opposition before execution.',
    keyRulesOm: [
      '1) Namni falmichatti hin hirmaatin murtichaan mirgi isaa tuqame dhiyeessa.',
      '2) Murtiin osoo hin raawwatamin dura dhiyaachuu qaba.',
      '3) Kwt. 6 (Irra deebiin ilaaluu) waliin yoo dhiyaate dursi Kwt. 6f kennama (FSC Cassation File No. 249062).'
    ],
    crossReferences: ['SDFHH Kwt. 6', 'SDFHH Kwt. 197', 'FSC Cassation File No. 249062']
  },
  {
    number: 361,
    articleLabel: 'Kwt. 361',
    titleOm: 'Iyyannoo murtiin akka qulqullaa\'uf dhiyaatu (Review by Court of Cassation / Cassation Revision)',
    titleAm: 'የሰበር አቤቱታ (መሰረታዊ የህግ ስህተት ማረሚያ)',
    titleEn: 'Application for Revision by Court of Cassation / Review',
    bookNumber: 6,
    bookTitleOm: 'Murtii Qulqulleessuu',
    summaryOm: 'Murtii dhumaa irratti dogoggora bu\'uura seeraa qulqulleessuuf guyyaa murtiin kenname irraa ji\'a 1 (tokko) keessatti dhiyaata.',
    summaryAm: 'በመጨረሻ ፍርድ ላይ መሠረታዊ የሕግ ስህተት ሲኖር ለሰበር ችሎት በአንድ ወር ውስጥ የሚቀርብ አቤቱታ።',
    summaryEn: 'Revision / Cassation review against final decisions affected by fundamental error of law within one month.',
    keyRulesOm: [
      'Yeroon iyyannoo: Ji\'a tokko keessatti.',
      'Murtii ykn garagalcha murtii komatame waliin dhiyaata.'
    ]
  },
  // --- KITAABA 7: RAAWWACHIISA MURTII (KWTS 371-461) ---
  {
    number: 371,
    articleLabel: 'Kwt. 371',
    titleOm: 'Qajeeltoo Raawwachiisa Murtii (Execution of Decrees)',
    titleAm: 'የፍርድ አፈፃፀም መርህ',
    titleEn: 'Court by which Decree May be Executed',
    bookNumber: 7,
    bookTitleOm: 'Raawwachiisa Murtii',
    summaryOm: 'Murtii kan raawwachiisu mana murtii murteesse yookan mana murtii akka raawwachiisuuf ajajameedha.',
    summaryAm: 'ፍርድን የሚያስፈጽመው የፈረደው ፍርድ ቤት ወይም እንዲያስፈጽም የተላከለት ፍርድ ቤት ነው።',
    summaryEn: 'A decree may be executed either by the court which passed it or by the court to which it is sent for execution.',
    keyRulesOm: ['Manna murtii murteesse ykn kan ajajameen raawwatama.']
  },
  {
    number: 378,
    articleLabel: 'Kwt. 378',
    titleOm: 'Qabiyyee iyyannoon raawwachiisa murtii of keessatti qabatu',
    titleAm: 'የፍርድ አፈፃፀም ማመልከቻ ይዘት',
    titleEn: 'Application for Execution of Decree',
    bookNumber: 7,
    bookTitleOm: 'Raawwachiisa Murtii',
    summaryOm: 'Namni murtiin murtaa\'eef akka raawwatamuuf mana murtiitti iyyannoo dhiyeessa; lakkoofsa galmee, guyyaa murtii, hanga maallaqaa, fi haala deeggarsaa ibsa.',
    summaryAm: 'የፍርድ ባለመብት የአፈፃፀም ማመልከቻ ሲያቀርብ የመዝገብ ቁጥር፣ ቀን፣ የተወሰነውን ገንዘብና የአፈፃፀም ዘዴ ዘርዝሮ ያቀርባል።',
    summaryEn: 'Written application for execution setting out decree details, previous payments, and mode of execution desired.',
    keyRulesOm: ['Iyyannichi battaluma murtichi murtaa\'een dhiyaachuu danda\'a.']
  },
  {
    number: 384,
    articleLabel: 'Kwt. 384',
    titleOm: 'Raawwachiisni murtii haala darbiinsa yeroon dhorkamu (10 Years Limitation on Execution)',
    titleAm: 'የፍርድ አፈፃፀም የ10 ዓመት የይርጋ ጊዜ',
    titleEn: 'Limitation on Execution of Decree (Ten Years)',
    bookNumber: 7,
    bookTitleOm: 'Raawwachiisa Murtii',
    summaryOm: 'Murtiin akka raawwatamu iyyannoon dhiyaatee waggaa 10 (kudhan) yoo turee fi darbe, sana booda iyyannoo biraatiin sochoosuun hin danda\'amu.',
    summaryAm: 'የፍርድ አፈፃፀም ጥያቄ ፍርዱ ከተሰጠበት ቀን ጀምሮ 10 (አስር) ዓመት ካለፈው በኋላ በይርጋ ይታገዳል፤ ሊፈጸም አይችልም።',
    summaryEn: 'No application to execute a decree shall be entertained after the expiration of ten years from date of decree or default.',
    keyRulesOm: [
      'Daangaa yeroo raawwii murtii: Waggaa 10 (kudhan).',
      'Yeroo kaffaltii yeroo yerootiif: Guyyaa kaffaltiin dhaabbate irraa eegala.'
    ]
  },
  {
    number: 404,
    articleLabel: 'Kwt. 404',
    titleOm: 'Qabeenya hin kabajamnee fi sababa raawwiif hin fudhamne (Exempt Property from Attachment)',
    titleAm: 'ሊታገዱና ሊወሰዱ የማይችሉ ንብረቶች (Exempt Property)',
    titleEn: 'Property Exempt from Attachment and Sale in Execution',
    bookNumber: 7,
    bookTitleOm: 'Raawwachiisa Murtii',
    summaryOm: 'Qabeenyonni hin kabajamne: Uffata guyyaa guyyaa, meeshaa nyaataa, siree, mi\'a ogummaa, horii qonnaa fi sanyii qotee bulaa, qallaba ji\'a sadii, mindaa 2/3 (qarshii 2/guyyaatti), soorama.',
    summaryAm: 'ሊታገዱ የማይችሉ ንብረቶች፡ የዕለት ልብስ፣ የወጥ ቤት ዕቃዎች፣ አልጋ፣ የሙያ መገልገያ መሣሪያዎች፣ የገበሬ የዕርሻ በሬና ዘር፣ የ3 ወር ቀለብ፣ ጡረታ፣ የቀለብ አበል፣ ከደመወዝ 2/3።',
    summaryEn: 'Statutory exemption of essential personal wearing apparel, cooking vessels, bed, tools of artisans, agricultural implements/seed grain, pension, maintenance.',
    keyRulesOm: [
      'a) Uffata guyyaa, meeshaa nyaataa, siree ciisichaa;',
      'b) Mi\'oota hojii ogummaatiif tajaajilan;',
      'c) Horii gaanfaa fi sanyii midhaanii qotee bulaa;',
      'd) Nyaata fi maallaqa ittiin bulmaata ji\'a sadiif gahu;',
      'e) Maallaqa sooramaa fi qallaba ji\'aa;',
      'f) Mindaa ji\'aa 2/3.'
    ]
  },
  {
    number: 443,
    articleLabel: 'Kwt. 443',
    titleOm: 'Qabeenya hin sochoone irraa mirga kamiyyuu nama qabuuf mirga dursaa kennamu (Pre-emption at Execution Sale)',
    titleAm: 'የቅድሚያ መግዛት መብት (Pre-emption)',
    titleEn: 'Right of Pre-emption on Execution Sale of Immovable Property',
    bookNumber: 7,
    bookTitleOm: 'Raawwachiisa Murtii',
    summaryOm: 'Qabeenyi gamtaan qabame caalbaasiin yeroo gurguramu qooddattoota keessaa inni tokko gatii dorgomaa dhiyeessee mirgi dursaa kennamaaf.',
    summaryAm: 'የጋራ ንብረት በጨረታ ሲሸጥ ከጋራ ባለቤቶቹ አንዱ እኩል ዋጋ በማቅረብ የቅድሚያ መግዛት መብት አለው።',
    summaryEn: 'Co-owner of undivided immovable property sold in execution has right of pre-emption on matching the highest bid.',
    keyRulesOm: ['Qooddataa qabeenyichaatiif caalbaasicharratti mirgi dursaa ni kennama.']
  },
  {
    number: 447,
    articleLabel: 'Kwt. 447',
    titleOm: 'Gurgurtaan sun haala itti mirkanaa\'u yookan itti haqamu (Confirmation or Setting Aside Sale)',
    titleAm: 'የጨረታ ሽያጭ መጽደቅ ወይም መሰረዝ',
    titleEn: 'Confirmation or Setting Aside Execution Sale',
    bookNumber: 7,
    bookTitleOm: 'Raawwachiisa Murtii',
    summaryOm: 'Gurgurtaan caalbaasii yeroo ji\'a 2 keessatti akka diigamuuf iyyanni yoo dhiyaate malee bittaan diigamuu hin danda\'u; manni murtii raggaasisee waraqaa ragaa bitataaf kenna.',
    summaryAm: 'የጨረታ ሽያጩ በ2 ወር ውስጥ እንዲሰረዝ ካልቀረበ በስተቀር ፍርድ ቤቱ አጽድቆ ለገዢው ምስክር ወረቀት ይሰጣል።',
    summaryEn: 'Sale becomes absolute if no application to set aside is made within two months; certificate granted to purchaser.',
    keyRulesOm: [
      'Yeroon iyyannoo gurgurtaa diiguu: Ji\'a 2 (lama).',
      'Erga ragga\'ee booda waraqaan ragaa bitataaf kennama.'
    ]
  },
  {
    number: 456,
    articleLabel: 'Kwt. 456',
    titleOm: 'Murtiin yookan jala murtiin biyya alaatti kenname haala itti raawwatamu (Foreign Judgments Execution)',
    titleAm: 'የውጭ አገር ፍርድ አፈፃፀም',
    titleEn: 'Execution of Foreign Judgments and Arbitral Awards',
    bookNumber: 7,
    bookTitleOm: 'Raawwachiisa Murtii',
    summaryOm: 'Murtiin biyya alaa Itoophiyaa keessatti raawwatamuu kan danda\'u mana murtii ol\'aanaatti iyyannoon dhiyaatee bu\'uura Kwt. 458tiin yoo mirkanaa\'e qofaadha.',
    summaryAm: 'የውጭ ሀገር ፍርድ በኢትዮጵያ ውስጥ የሚፈጸመው በከፍተኛ ፍርድ ቤት ቀርቦ በጋራ ስምምነት ወይም በተመጣጣኝ ተፈፃሚነት (Reciprocity) ሲረጋገጥ ብቻ ነው።',
    summaryEn: 'Foreign judgments are enforceable in Ethiopia only upon application to the High Court subject to reciprocity, finality, and due process under Art. 458.',
    keyRulesOm: [
      '1) Iyyannoon mana murtii ol\'aanaatti dhiyaata.',
      '2) Biyyi murticha kenne murtii Itoophiyaattis kan raawwatu ta\'uu qaba (Reciprocity - Kwt. 458(a)).',
      '3) Hamilee fi nageenya uummataaf faallaa ta\'uu hin qabu (Public policy).'
    ]
  },
  // --- KITAABA 8: BAASII, KISAARAA & HIYYEESSAAN HIMACHUU (KWTS 462-479) ---
  {
    number: 462,
    articleLabel: 'Kwt. 462',
    titleOm: 'Aangoo mana murtii (Costs & Expenses)',
    titleAm: 'የዳኝነት ወጪና ኪሳራ ስልጣን',
    titleEn: 'Costs and Expenses in Court Discretion',
    bookNumber: 8,
    bookTitleOm: 'Baasii fi Kisaaraa',
    summaryOm: 'Manni murtii baasii fi kisaaraa sababa himannaan kaffalamu garee kaffalu, hanga kaffaltii, fi madda qabeenyaa murteessuuf aangoo qaba.',
    summaryAm: 'የክርክር ወጪና ኪሳራን ማን እንደሚከፍል፣ መጠኑንና አከፋፈሉን ፍርድ ቤቱ ይወስናል።',
    summaryEn: 'Costs of and incident to all suits are in the discretion of the court.',
    keyRulesOm: ['Gareen mo\'ame baasii fi kisaaraa akka kaffalu ajajama (Kwt. 463).']
  },
  {
    number: 467,
    articleLabel: 'Kwt. 467',
    titleOm: 'Himannoowwan bilisaan banaman (Suits in Forma Pauperis / Hiyyeessaan Himachuu)',
    titleAm: 'ያለ ዳኝነት ክፍያ በነጻ የሚቀርብ የድሆች ክስ',
    titleEn: 'Suits in Forma Pauperis (Pauper Suits)',
    bookNumber: 8,
    bookTitleOm: 'Abbaa Seerummaa Osoo Itti Hin Kaffalin Himannaa Bilisaan Dhiyaatu',
    summaryOm: 'Namni hiyyeessi maallaqa abbaa seerummaa kaffaluu hin dandeenye kamiyyuu bilisaan galmee bane himannaa dhiyeessuuf mana murtiitti iyyachuu ni danda\'a.',
    summaryAm: 'የዳኝነት ክፍያ ለመክፈል አቅም የሌለው ድሃ ያለክፍያ ክስ ለማቅረብ ማመልከት ይችላል።',
    summaryEn: 'Any pauper unable to pay court fees may be permitted to institute suit in forma pauperis.',
    keyRulesOm: [
      '1) Hiyyeessi maallaqa hin qabne abbaa seerummaa malee himata dhiyeessuu danda\'a.',
      '2) Sagantaa 3ffaa irratti jecha kakuutiin deeggaramee dhiyaata (Kwt. 468).',
      '3) Yeroo mo\'ate kaffaltiin abbaa seerummaa qabeenya irraa mootummaaf galii ta\'a (Kwt. 476).'
    ]
  },
  // --- KITAABA 9: TUMAALEE GOOLABAA (KWTS 480-483) ---
  {
    number: 480,
    articleLabel: 'Kwt. 480',
    titleOm: 'Mana murtii kabachiisuuf aangoo kenname (Contempt of Court)',
    titleAm: 'የፍርድ ቤቱን ክብር ማስጠበቅና የችሎት መድፈር ቅጣት',
    titleEn: 'Contempt of Court',
    bookNumber: 9,
    bookTitleOm: 'Tumaalee Goolabaa',
    summaryOm: 'Walitti qabaan abbaa murtii kabaja dhaddachaaf jecha amala faallaa agarsiise galmee qabate irratti adabbii maallaqaatin adabuu ni danda\'a.',
    summaryAm: 'የችሎት ክብርን የደፈረ ወይም ስነ-ስርዓት ያጓደለ ተከራካሪ በገንዘብ ቅጣት ይቀጣል።',
    summaryEn: 'Court may summarily punish any contempt or disruption committed in its presence.',
    keyRulesOm: ['Adabbii maallaqaa battalatti murteessuu ni danda\'a.']
  },
  {
    number: 481,
    articleLabel: 'Kwt. 481',
    titleOm: 'Dhimmoota biroo kallattiin murtaa\'uu danda\'an (Direct Penalties for Offenses in Court)',
    titleAm: 'በችሎት ውስጥ ለሚፈጸሙ የወንጀል ድርጊቶች የሚሰጥ ቀጥተኛ ቅጣት',
    titleEn: 'Summary Punishment for Perjury and Offenses in View of Court',
    bookNumber: 9,
    bookTitleOm: 'Tumaalee Goolabaa',
    summaryOm: 'Seera adaba yakkaa Kwt. 442, 446 ykn 447 irra darbuun yakka dhaddacha keessatti raawwateef yerooma sana manni murtii hidhaa murteessuu danda\'a.',
    summaryAm: 'በችሎት ውስጥ ሀሰት ለተናገረ ወይም ወንጀል ለፈጸመ ፍርድ ቤቱ ወዲያውኑ የእስራት ቅጣት ሊጥልበት ይችላል።',
    summaryEn: 'Summary punishment of imprisonment up to 1 year (Woreda) or 3 years (Awraja/High Court) for perjury or contempt committed in court.',
    keyRulesOm: [
      'Mana murtii Aanaatti: Hidhaa waggaa 1 hin caalle.',
      'Mana murtii Awuraajjaatti/Ol\'aanaatti: Hidhaa waggaa 3 hin caalle.'
    ]
  }
];

export const SDFHH_SCHEDULES_DATA: SDFHHSchedule[] = [
  {
    scheduleNumber: 1,
    scheduleNameOm: 'Sagantaa Tokkoffaa - Unkaalee Dhiyeessa Himannaa (Model Pleading Forms)',
    forms: [
      { formNumber: 'Unka A-D', articleRef: 'Kwt. 80', titleOm: 'Qabiyyee falmii barreeffamaa' },
      { formNumber: 'Unka E', articleRef: 'Kwt. 92', titleOm: 'Jecha himannaa dhiyaate mirkaneessuu (Verification)' },
      { formNumber: 'Unka F', articleRef: 'Kwt. 223', titleOm: 'Tarreeffama miiltoowwanii fi sanadootaa' },
      { formNumber: 'Unka 1', articleRef: 'Kwt. 222', titleOm: 'Iyyannoo himannaa maallaqa liqaadhaan kenname' },
      { formNumber: 'Unka 2', articleRef: 'Kwt. 222', titleOm: 'Maallaqa irra darbee kaffalame deebisiisuu' },
      { formNumber: 'Unka 12', articleRef: 'Kwt. 222', titleOm: 'Wabii kaffaltii kiraa manaa' },
      { formNumber: 'Unka 13', articleRef: 'Kwt. 222', titleOm: 'Waliigaltee lafa bituuf taasifame diiguuf' },
      { formNumber: 'Unka 15', articleRef: 'Kwt. 222', titleOm: 'Seeraan ala hojiirraa nama gaggeessuu' },
      { formNumber: 'Unka 35', articleRef: 'Kwt. 154', titleOm: 'Qabeenyi akka hin qisaasofne dhorka ajajuu' },
      { formNumber: 'Unka 40', articleRef: 'Kwt. 293', titleOm: 'Falmii waliin waliinii (Interpleader)' },
    ]
  },
  {
    scheduleNumber: 2,
    scheduleNameOm: 'Sagantaa Lammaffaa - Unkaalee Raawwii Adeemsaa (Process and Summons Forms)',
    forms: [
      { formNumber: 'Unka 1', articleRef: 'Kwt. 40(2)', titleOm: 'Manni murtii nama miiltoo himataa ta\'ee dabalamuuf beeksisa' },
      { formNumber: 'Unka 2', articleRef: 'Kwt. 40(5)', titleOm: 'Nama himatamummaan dabalamuuf beeksisa ergamu' },
      { formNumber: 'Unka 3', articleRef: 'Kwt. 50', titleOm: 'Bakka bu\'aa himatamaa du\'eef waamicha ergamu' },
      { formNumber: 'Unka 4', articleRef: 'Kwt. 70', titleOm: 'Beeksisa himatamaaf (Hafiinsa himatamaa)' },
      { formNumber: 'Unka 5', articleRef: 'Kwt. 94', titleOm: 'Waamicha himatamaan akka dhiyaatuuf ergamu' },
      { formNumber: 'Unka 7', articleRef: 'Kwt. 104', titleOm: 'Jecha kakuu qondaala qaqqabsiisaa waamichaa' },
      { formNumber: 'Unka 10', articleRef: 'Kwt. 111, 114', titleOm: 'Waamicha naqaashiidhaaf ergamu' },
      { formNumber: 'Unka 11', articleRef: 'Kwt. 118(2)', titleOm: 'Naqaashiin akka qabamuuf ajaja darbu' },
      { formNumber: 'Unka 14', articleRef: 'Kwt. 147', titleOm: 'Ajaja murtiin dura nama qabamuu' },
      { formNumber: 'Unka 16', articleRef: 'Kwt. 150', titleOm: 'Ajaja nama mana sirreessaa turuu' },
      { formNumber: 'Unka 18', articleRef: 'Kwt. 338', titleOm: 'Ol\'iyyannoon akka dhaga\'amuuf guyyaa murtaa\'e beeksisuu' },
    ]
  },
  {
    scheduleNumber: 3,
    scheduleNameOm: 'Sagantaa Sadaffaa - Unkaalee Akaakuu Adda Addaa (Miscellaneous Judicial Forms)',
    forms: [
      { formNumber: 'Unka 1', articleRef: 'Kwt. 122', titleOm: 'Xalayaa gaaffii (Commission to examine witness)' },
      { formNumber: 'Unka 3', articleRef: 'Kwt. 132, 134', titleOm: 'Dhimmichi iddoo jirutti qoratamuuf aangoo kennamu' },
      { formNumber: 'Unka 5', articleRef: 'Kwt. 151, 152', titleOm: 'Qabeenya murtiin dura qabamu (Attachment before judgment)' },
      { formNumber: 'Unka 7', articleRef: 'Kwt. 154', titleOm: 'Ajajoota dhorkaa yeroof kennaman (Injunction)' },
      { formNumber: 'Unka 8', articleRef: 'Kwt. 166', titleOm: 'Fudhataa muuduu (Receiver)' },
      { formNumber: 'Unka 12', articleRef: 'Kwt. 252', titleOm: 'Ijoowwan murtiin ilaalamaniif waliigaltee abbootiin dhimmaa taasisan' },
      { formNumber: 'Unka 13', articleRef: 'Kwt. 261, 262', titleOm: 'Haala dhiyeessa naqaashii fi jecha kakuu' },
      { formNumber: 'Unka 18', articleRef: 'Kwt. 468', titleOm: 'Dambii hiyyummaatiin himannaa dhiyeessuuf iyyata dhiyaatu' },
    ]
  },
  {
    scheduleNumber: 4,
    scheduleNameOm: 'Sagantaa Afraffaa - Unkaalee Raawwii Ajajaa fi Murtii (Execution Forms)',
    forms: [
      { formNumber: 'Unka 1', articleRef: 'Kwt. 372', titleOm: 'Ajaja mana murtii akka raawwachiisu mana murtii biraatif darbu' },
      { formNumber: 'Unka 8', articleRef: 'Kwt. 394', titleOm: 'Raawwii murtiif qabeenyi socho\'aan akka qabamuuf ajaja darbu' },
      { formNumber: 'Unka 14', articleRef: 'Kwt. 409', titleOm: 'Lafa ykn qabeenya hin sochoone akka kennisiisu ajaja darbu' },
      { formNumber: 'Unka 15', articleRef: 'Kwt. 411', titleOm: 'Qabeenyi murtii abbaa idaa harka hin jirre akka qabamuuf ajaja darbu' },
      { formNumber: 'Unka 16', articleRef: 'Kwt. 412', titleOm: 'Mindaan akka qabamuuf ajaja darbu' },
      { formNumber: 'Unka 19', articleRef: 'Kwt. 414', titleOm: 'Qabeenyi hin sochoone akka qabamuuf ajaja darbu' },
      { formNumber: 'Unka 21', articleRef: 'Kwt. 422', titleOm: 'Qabeenyi qabame akka gurguramuuf ajaja darbu' },
      { formNumber: 'Unka 28', articleRef: 'Kwt. 448', titleOm: 'Qabeenyaan hin sochoone gurgurame bitataadhaaf akka darbu' },
    ]
  }
];

export function findSDFHHArticle(articleNum: number): SDFHHArticle | undefined {
  return SDFHH_ARTICLES_DATABASE.find((a) => a.number === articleNum);
}

export function searchSDFHH(query: string): SDFHHArticle[] {
  const q = query.toLowerCase().trim();
  if (!q) return SDFHH_ARTICLES_DATABASE;
  return SDFHH_ARTICLES_DATABASE.filter(
    (a) =>
      a.articleLabel.toLowerCase().includes(q) ||
      a.titleOm.toLowerCase().includes(q) ||
      a.titleAm.toLowerCase().includes(q) ||
      a.titleEn.toLowerCase().includes(q) ||
      a.summaryOm.toLowerCase().includes(q) ||
      a.summaryAm.toLowerCase().includes(q) ||
      a.summaryEn.toLowerCase().includes(q) ||
      a.keyRulesOm.some((r) => r.toLowerCase().includes(q))
  );
}
