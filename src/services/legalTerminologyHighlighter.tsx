import React from 'react';
import { LEGAL_GLOSSARY_DATA, LegalGlossaryEntry } from '../data/legalGlossary';

export interface PredefinedLegalTerm {
  term: string;
  category: 'constitutional' | 'labor' | 'commercial' | 'civilCourt' | 'procedural' | 'property';
  definition: {
    om: string;
    am: string;
    en: string;
  };
  source?: string;
}

/**
 * Predefined list of key Ethiopian statutory, judicial, and procedural legal terms
 * across Afaan Oromoo, Amharic, and English.
 */
export const PREDEFINED_LEGAL_TERMS: PredefinedLegalTerm[] = [
  // 1. Constitutional & Public Law
  {
    term: 'Heera Mootummaa',
    category: 'constitutional',
    definition: {
      om: 'Seera hundaa ol ta\'ee fi sirna bulchiinsa biyyaa, mirgoota bu\'uuraa lammilee fi qaamolee mootummaa murteessu.',
      am: 'የሀገሪቱ የበላይ ሕግ ሲሆን የስርዓተ-መንግሥቱን መዋቅር እና የዜጎችን መሰረታዊ መብቶች ይደነግጋል።',
      en: 'The supreme law of the land establishing the framework of government and fundamental rights.',
    },
    source: 'FDRE Constitution Art. 9',
  },
  {
    term: 'ሕገ-መንግሥት',
    category: 'constitutional',
    definition: {
      om: 'Seera hundaa ol ta\'ee mirga lammilee fi sirna bulchiinsa mootummaa murteessa.',
      am: 'የሀገሪቱ የበላይ ሕግ ሲሆን የስርዓተ-መንግሥቱን መዋቅር እና መሰረታዊ መብቶችን ይደነግጋል።',
      en: 'The supreme constitution of Ethiopia.',
    },
    source: 'FDRE Constitution Art. 9',
  },
  {
    term: 'Constitution',
    category: 'constitutional',
    definition: {
      om: 'Seera hundaa ol ta\'e.',
      am: 'የበላይ ሕግ።',
      en: 'The supreme law of the state establishing governmental structure and guaranteeing rights.',
    },
    source: 'FDRE Constitution',
  },
  {
    term: 'Mirga Abbaa Qabeenyummaa',
    category: 'constitutional',
    definition: {
      om: 'Mirga heera mootummaa keeyyata 40n lammileef kennamuudhaan qabeenya horachuu fi itti fayyadamuu mirkaneessu.',
      am: 'በሕገ-መንግስቱ አንቀጽ 40 የተረጋገጠ የዜጎች የንብረት ባለቤትነት መብት።',
      en: 'Constitutional right to private property ownership under Article 40.',
    },
    source: 'FDRE Constitution Art. 40',
  },
  {
    term: 'የንብረት ባለቤትነት መብት',
    category: 'constitutional',
    definition: {
      om: 'Mirga namni qabeenya horachuu fi itti fayyadamuuf heeraan qabu.',
      am: 'በሕገ-መንግስቱ አንቀጽ 40 የተረጋገጠ የዜጎች የንብረት ባለቤትነት መብት።',
      en: 'Constitutional right to ownership of private property.',
    },
    source: 'FDRE Constitution Art. 40',
  },

  // 2. Legislation & Statutes
  {
    term: 'Labsii',
    category: 'constitutional',
    definition: {
      om: 'Seera Mana Maree Bakka Bu\'oota Ummataatiin (ykn Caffee Oromiyaatiin) baafamee Gaazeexaa Negaariitaatiin labsamu.',
      am: 'በሕዝብ ተወካዮች ምክር ቤት ወይም በክልል ምክር ቤት ወጥቶ በነጋሪት ጋዜጣ ታትሞ የሚወጣ ሕግ።',
      en: 'Primary statutory legislation passed by legislative bodies and published in the Negarit Gazette.',
    },
    source: 'Negarit Gazette',
  },
  {
    term: 'አዋጅ',
    category: 'constitutional',
    definition: {
      om: 'Seera qaama seera baastuutiin bahee gaazeexaa mootummaatiin labsame.',
      am: 'በሕዝብ ተወካዮች ምክር ቤት ወጥቶ በነጋሪት ጋዜጣ ታትሞ የሚወጣ ሕግ።',
      en: 'Proclamation / Primary legislation enacted by Parliament.',
    },
    source: 'Federal Negarit Gazette',
  },
  {
    term: 'Proclamation',
    category: 'constitutional',
    definition: {
      om: 'Seera mana maree bakka bu\'ootaatiin labsame.',
      am: 'በተወካዮች ምክር ቤት የሚወጣ አዋጅ።',
      en: 'Primary parliamentary legislation enacted and published in the official gazette.',
    },
    source: 'Negarit Gazette',
  },
  {
    term: 'Dambii',
    category: 'constitutional',
    definition: {
      om: 'Seera dambii Mana Maree Ministeerotaatiin Labsii raawwachiisuuf baafamu.',
      am: 'የሚኒስትሮች ምክር ቤት አዋጅን ለማስፈጸም የሚያወጣው ደንብ።',
      en: 'Subordinate regulation issued by the Council of Ministers.',
    },
    source: 'Council of Ministers Regulations',
  },
  {
    term: 'Qajeelfama',
    category: 'constitutional',
    definition: {
      om: 'Seera qajeelfama ministeera ykn aangawoota mootummaatiin dambiifi labsii bu\'uura godhachuun baafamu.',
      am: 'በሚኒስቴር ወይም በመንግስት መ/ቤት የሚወጣ የአሰራር መመሪያ።',
      en: 'Executive administrative directive issued by a ministry or public authority.',
    },
    source: 'Ministry Directives',
  },

  // 3. Cassation Precedent & Judicial Authority
  {
    term: 'Murtii Dhaddacha Dhimmoota Ijoo',
    category: 'civilCourt',
    definition: {
      om: 'Murtii Mana Murtii Waliigalaa Federaalaa Dhaddacha Dhimmoota Ijootti abbootii seeraa shaniin kennamee manneen murtii hundarratti dirqisiisaa ta\'e.',
      am: 'በፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት የሚሰጥ እና በሁሉም ፍርድ ቤቶች ላይ አስገዳጅ የሆነ የሕግ ትርጉም ውሳኔ።',
      en: 'Binding precedent rendered by the Federal Supreme Court Cassation Bench.',
    },
    source: 'Proc. 1234/2021 Art. 10',
  },
  {
    term: 'Dhaddacha Ijoo',
    category: 'civilCourt',
    definition: {
      om: 'Dhaddacha Mana Murtii Waliigalaa dogoggora bu\'uura seeraa sirreessuuf hundeeffame fi murtiin isaa dirqisiisaa ta\'e.',
      am: 'መሰረታዊ የሕግ ስህተት ያለባቸውን ውሳኔዎች የሚያርም አስገዳጅ የሰበር ሰሚ ችሎት።',
      en: 'Cassation Bench of the Supreme Court exercising final constitutional and statutory review.',
    },
    source: 'Proc. 1234/2021',
  },
  {
    term: 'Dhaddacha Ijibbaataa',
    category: 'civilCourt',
    definition: {
      om: 'Dhaddacha murtiiwwan manneen murtii gurguddoo dogoggora bu\'uura seeraatiin qabaman sirreessu.',
      am: 'የሰበር ሰሚ ችሎት።',
      en: 'Cassation division of the court.',
    },
    source: 'Proc. 1234/2021',
  },
  {
    term: 'ሰበር ሰሚ ችሎት',
    category: 'civilCourt',
    definition: {
      om: 'Dhaddacha Ijibbaataa Mana Murtii Waliigalaa.',
      am: 'መሰረታዊ የሕግ ስህተት ያለባቸውን ውሳኔዎች የማረም ስልጣን ያለው የጠቅላይ ፍርድ ቤት የመጨረሻ ችሎት።',
      en: 'Supreme Court Cassation Division with binding legal interpretation powers.',
    },
    source: 'Proc. 1234/2021',
  },
  {
    term: 'የሰበር ውሳኔ',
    category: 'civilCourt',
    definition: {
      om: 'Murtii dhaddacha ijibbaataatiin darbee manneen murtii hundarratti dirqisiisaa ta\'e.',
      am: 'በሰበር ሰሚ ችሎት የተሰጠ አስገዳጅ የሕግ ትርጉም ፍርድ።',
      en: 'Binding Supreme Court cassation ruling.',
    },
    source: 'Proc. 1234/2021',
  },
  {
    term: 'Cassation Precedent',
    category: 'civilCourt',
    definition: {
      om: 'Murtii dhaddacha ijoo dirqisiisaa.',
      am: 'አስገዳጅ የሰበር ፍርድ ቤት ውሳኔ።',
      en: 'Binding statutory interpretation rendered by the Federal Supreme Court Cassation Division.',
    },
    source: 'Proc. 1234/2021',
  },

  // 4. Contracts & Commercial Obligations
  {
    term: 'Waliigaltee',
    category: 'commercial',
    definition: {
      om: 'Walii galuu namoota lamaa ykn isaa olii mirgoota seera qabeessa ta\'an uumuuf, geeddaruf ykn dhabamsiisuuf taasifamu.',
      am: 'በሁለት ወይም ከዚያ በላይ በሆኑ ሰዎች መካከል የሕግ ግዴታዎችን ለመፍጠር የሚደረግ ስምምነት።',
      en: 'A legally enforceable agreement creating obligations between two or more parties.',
    },
    source: 'Civil Code Art. 1675',
  },
  {
    term: 'ውል',
    category: 'commercial',
    definition: {
      om: 'Waliigaltee seera qabeessa.',
      am: 'በሰዎች መካከል ሕጋዊ መብትና ግዴታን ለመፍጠር የሚደረግ ስምምነት።',
      en: 'Contractual agreement creating binding legal relations.',
    },
    source: 'Civil Code Art. 1675',
  },
  {
    term: 'Contract',
    category: 'commercial',
    definition: {
      om: 'Waliigaltee seeraatiin dirqisiisu.',
      am: 'ሕጋዊ አስገዳጅነት ያለው ውል/ስምምነት።',
      en: 'A legally binding agreement enforceable by court of law.',
    },
    source: 'Civil Code Art. 1675',
  },
  {
    term: 'Mirkaneessa Sanadaa',
    category: 'civilCourt',
    definition: {
      om: 'Sanadoota qabeenya hin sochoonee fi waliigalteewwan qaama aango-qabeessa (DARA) duratti mirkaneessuu.',
      am: 'የማይንቀሳቀስ ንብረት ውል በሰነዶች ማረጋገጫና ምዝገባ ኤጀንሲ ፊት ማጽደቅ።',
      en: 'Official authentication and registration of contracts and deeds before a notary or DARA.',
    },
    source: 'Civil Code Art. 1723',
  },
  {
    term: 'የውል ምዝገባ',
    category: 'civilCourt',
    definition: {
      om: 'Waliigaltee qaama aango-qabeessa duratti galmeessuu.',
      am: 'ውል በሰነዶች ማረጋገጫና ምዝገባ ኤጀንሲ (DARA) ፊት ማጽደቅና መመዝገብ።',
      en: 'Mandatory statutory registration and notarization of legal contracts.',
    },
    source: 'Civil Code Art. 1723',
  },
  {
    term: 'Qabeenya Hin Sochoonee',
    category: 'property',
    definition: {
      om: 'Qabeenya lafaa fi manaa lafarra dhaabbate kan bakka tokkoo gara biraatti hin sossoone.',
      am: 'መሬትና በላዩ ላይ የተገነባ ቤት ወይም ቋሚ ንብረት።',
      en: 'Immovable property including land and permanently attached buildings/fixtures.',
    },
    source: 'Civil Code Art. 1130',
  },
  {
    term: 'የማይንቀሳቀስ ንብረት',
    category: 'property',
    definition: {
      om: 'Qabeenya hin sochoonee (mana fi lafa).',
      am: 'መሬት፣ ህንፃ ወይም ከቦታ ወደ ቦታ የማይዘዋወር ንብረት።',
      en: 'Immovable real property.',
    },
    source: 'Civil Code Art. 1130',
  },
  {
    term: 'Immovable Property',
    category: 'property',
    definition: {
      om: 'Qabeenya lafaafi manaa.',
      am: 'የማይንቀሳቀስ ንብረት።',
      en: 'Real property, land, and permanently attached structures.',
    },
    source: 'Civil Code Art. 1130',
  },

  // 5. Labor Law & Employment
  {
    term: 'Waliigaltee Hojii Addaan Kutuu',
    category: 'labor',
    definition: {
      om: 'Sababa seera qabeessaan ykn akeekkachiisaan waliigaltee hojjetaa fi hojjechiisaa gidduu jiru xumuruu.',
      am: 'የአሰሪና ሰራተኛን የስራ ውል በሕግ አግባብ ማቋረጥ።',
      en: 'Termination of an employment contract pursuant to statutory regulations.',
    },
    source: 'Proc. 1156/2019 Art. 24-30',
  },
  {
    term: 'የስራ ውል ማቋረጥ',
    category: 'labor',
    definition: {
      om: 'Waliigaltee hojii dhaabuu.',
      am: 'የአሰሪና ሰራተኛ የሥራ ግንኙነትን በሕጋዊ ምክንያት ማብቃት።',
      en: 'Termination of an employment contract.',
    },
    source: 'Proc. 1156/2019 Art. 24',
  },
  {
    term: 'Termination of Employment',
    category: 'labor',
    definition: {
      om: 'Waliigaltee hojii addaan kutuu.',
      am: 'የስራ ውል ማቋረጥ።',
      en: 'Statutory termination or dismissal of employment relationship.',
    },
    source: 'Labor Proc. 1156/2019',
  },
  {
    term: 'Beenyaa',
    category: 'labor',
    definition: {
      om: 'Kaffaltii miidhaa ga\'eef ykn kaffaltii addaan kutuu waliigaltee hojii (severance pay) bu\'uura seeraatiin kaffalamu.',
      am: 'የስንብት ካሳ ክፍያ ወይም ለደረሰ ጉዳት የሚከፈል ሕጋዊ ካሳ።',
      en: 'Severance compensation or statutory damages awarded under law.',
    },
    source: 'Labor Proc. 1156/2019 Art. 39-40',
  },
  {
    term: 'ካሳ',
    category: 'labor',
    definition: {
      om: 'Kaffaltii beenyaa.',
      am: 'ለውል መቋረጥ ወይም ለደረሰ ጉዳት በሕግ የሚወሰን የካሳ ክፍያ።',
      en: 'Severance pay or damages compensation.',
    },
    source: 'Proc. 1156/2019 / Civil Code',
  },
  {
    term: 'Severance Pay',
    category: 'labor',
    definition: {
      om: 'Beenyaa addaan kutuu hojii.',
      am: 'የስንብት ካሳ ክፍያ።',
      en: 'Statutory monetary compensation payable to an employee upon lawful severance.',
    },
    source: 'Proc. 1156/2019 Art. 39',
  },
  {
    term: 'Hojjetaa',
    category: 'labor',
    definition: {
      om: 'Nama mindaaf hojjechiisaaf hojii hojjetu.',
      am: 'በደመወዝ ለአሰሪ የሚሰራ ግለሰብ።',
      en: 'An individual employee under contract of employment.',
    },
    source: 'Proc. 1156/2019',
  },
  {
    term: 'Hojjechiisaa',
    category: 'labor',
    definition: {
      om: 'Nama ykn dhaabbata hojjetaa qacaree mindaa kaffaluuf.',
      am: 'ሰራተኛ ቀጥሮ የሚያሰራ ግለሰብ ወይም ድርጅት።',
      en: 'Employer entity contracting worker services.',
    },
    source: 'Proc. 1156/2019',
  },
  {
    term: 'Badii Cimaa',
    category: 'labor',
    definition: {
      om: 'Badii hojjetaan raawwateen hojjechiisaan akeekkachiisa malee battalatti hojiirraa gaggeessuuf seeraan eeyyamamu.',
      am: 'ያለማስጠንቀቂያ ከሥራ ለማሰናበት የሚያበቃ ከባድ ጥፋት።',
      en: 'Gross statutory misconduct entitling summary dismissal without notice.',
    },
    source: 'Proc. 1156/2019 Art. 27',
  },
  {
    term: 'ከባድ ጥፋት',
    category: 'labor',
    definition: {
      om: 'Badii cimaa hojjetaa.',
      am: 'ያለማስጠንቀቂያ የስራ ውል ለማቋረጥ የሚያበቃ ከባድ የጥፋት ድርጊት።',
      en: 'Gross misconduct justifying immediate termination without notice.',
    },
    source: 'Proc. 1156/2019 Art. 27',
  },

  // 6. Court Procedure & Litigation
  {
    term: 'Aangoo Mana Murtii',
    category: 'procedural',
    definition: {
      om: 'Aangoo seeraan mana murtichaaf kenname kan dhimma tokko dhagahee murtii kennuuf dandeessisu.',
      am: 'ፍርድ ቤቱ አንድን ክስ ተቀብሎ የመዳኘትና ውሳኔ የመስጠት የሕግ ስልጣን።',
      en: 'Judicial jurisdiction and subject-matter competence of the court.',
    },
    source: 'Civil Procedure Code Art. 4-18',
  },
  {
    term: 'የፍርድ ቤት ስልጣን',
    category: 'procedural',
    definition: {
      om: 'Aangoo seeraa mana murtii.',
      am: 'ፍርድ ቤቱ ጉዳዩን የማየትና የመወሰን ሕጋዊ ስልጣን።',
      en: 'Jurisdiction of the court.',
    },
    source: 'Civil Procedure Code',
  },
  {
    term: 'Jurisdiction',
    category: 'procedural',
    definition: {
      om: 'Aangoo seeraa.',
      am: 'የዳኝነት ስልጣን።',
      en: 'The legal authority and territorial competence of a court to hear a case.',
    },
    source: 'Civil Procedure Code',
  },
  {
    term: 'Iyyata Himannaa',
    category: 'procedural',
    definition: {
      om: 'Sanada himataan mirga seeraa isaa kabachiifachuuf mana murtiitti dhiyeeffatu.',
      am: 'ከሳሽ መብቱን ለማስከበር ለፍርድ ቤት የሚያቀርበው የክስ ማመልከቻ።',
      en: 'Formal statement of claim or plaint filed by plaintiff.',
    },
    source: 'Civil Procedure Code Art. 222',
  },
  {
    term: 'የክስ ማመልከቻ',
    category: 'procedural',
    definition: {
      om: 'Iyyata himannaa.',
      am: 'ከሳሽ መብቱን ለማስከበር ለፍርድ ቤት የሚያቀርበው የጽሑፍ ክስ።',
      en: 'Statement of claim or civil plaint.',
    },
    source: 'Civil Procedure Code Art. 222',
  },
  {
    term: 'Deebii Himannaa',
    category: 'procedural',
    definition: {
      om: 'Sanada himatamaan himannaarratti of irraa ittisuuf mana murtiif dhiyeeffatu.',
      am: 'ተከሳሽ ለቀረበበት ክስ ምላሽ የሚሰጥበት የመከላከያ መልስ።',
      en: 'Statement of defence filed by defendant countering plaintiff claims.',
    },
    source: 'Civil Procedure Code Art. 234',
  },
  {
    term: 'የመከላከያ መልስ',
    category: 'procedural',
    definition: {
      om: 'Deebii himatamaa.',
      am: 'ተከሳሹ ለቀረበበት ክስ የሚሰጠው የጽሑፍ መከላከያ መልስ።',
      en: 'Statement of defense.',
    },
    source: 'Civil Procedure Code Art. 234',
  },
  {
    term: 'Qabxii Falmii',
    category: 'procedural',
    definition: {
      om: 'Qabxii seeraa ykn dhugaa kan himataan mirkaneessee himatamaan kakuun haale kan abbaan seeraa falmiif qabate.',
      am: 'በከሳሽና በተከሳሽ መካከል ያልተስማሙበትና በፍርድ ቤቱ እንዲጣራ የተያዘ የክርክር ነጥብ።',
      en: 'Issues framed by the court (issue of fact and issue of law) for judicial trial.',
    },
    source: 'Civil Procedure Code Art. 247',
  },
  {
    term: 'የክርክር ነጥብ',
    category: 'procedural',
    definition: {
      om: 'Qabxii falmii.',
      am: 'ፍርድ ቤቱ በማስረጃ እንዲጣራ የለየው አከራካሪ ጭብጥ (Issue framing)።',
      en: 'Issue framed by the court.',
    },
    source: 'Civil Procedure Code Art. 247',
  },
  {
    term: 'Issue Framing',
    category: 'procedural',
    definition: {
      om: 'Qabxii falmii qindeessuu.',
      am: 'የክርክር ነጥብ መቅረጽ።',
      en: 'Framing of disputed legal and factual issues by the judge.',
    },
    source: 'Civil Procedure Code Art. 247',
  },
  {
    term: 'Ragaa',
    category: 'procedural',
    definition: {
      om: 'Sanada, nama (dhugaa ba\'aa) ykn wanta dhimma falmii mirkaneessuuf mana murtiitti dhiyaatu.',
      am: 'የክርክሩን እውነትነት ለማስረዳት የሚቀርብ የሰው ወይም የሰነድ ማስረጃ።',
      en: 'Documentary or testimonial evidence adduced in support of a claim.',
    },
    source: 'Civil Procedure Code Art. 137',
  },
  {
    term: 'ማስረጃ',
    category: 'procedural',
    definition: {
      om: 'Ragaa.',
      am: 'የቀረበውን ክስ ወይም መከላከያ የሚያረጋግጥ የጽሑፍ ወይም የሰው ማስረጃ።',
      en: 'Evidence / Proof adduced in court.',
    },
    source: 'Civil Procedure Code',
  },
  {
    term: 'Dhugaa Ba\'aa',
    category: 'procedural',
    definition: {
      om: 'Nama dhimma falmisiisaa ijaan arge ykn gurraan dhagahe mana murtiitti kakuun himu.',
      am: 'በችሎት ፊት ቀርቦ ምስክርነቱን የሚሰጥ ግለሰብ።',
      en: 'Witness giving sworn oral testimony before the bench.',
    },
    source: 'Civil Procedure Code',
  },
  {
    term: 'ምስክር',
    category: 'procedural',
    definition: {
      om: 'Dhugaa ba\'aa.',
      am: 'የአንድን ድርጊት እውነትነት በችሎት ፊት የሚመሰክር ሰው።',
      en: 'Witness.',
    },
    source: 'Civil Procedure Code',
  },
  {
    term: 'Murtii',
    category: 'procedural',
    definition: {
      om: 'Murtee dhumaa abbaan seeraa ragaa fi seera madaalee dhimma dhiyaate irratti kennu.',
      am: 'ፍርድ ቤቱ የቀረበውን ክርክር መርምሮ የሚሰጠው የፍርድ ውሳኔ።',
      en: 'Final judicial judgment or decree resolving disputed rights.',
    },
    source: 'Civil Procedure Code Art. 180',
  },
  {
    term: 'ውሳኔ',
    category: 'procedural',
    definition: {
      om: 'Murtii mana murtii.',
      am: 'የፍርድ ቤቱ የመጨረሻ የፍርድ ውሳኔ።',
      en: 'Judicial ruling or final judgment.',
    },
    source: 'Civil Procedure Code Art. 180',
  },
  {
    term: 'Ol-iyyata',
    category: 'procedural',
    definition: {
      om: 'Murtii mana murtii gadiititti quubsaa ta\'uu dhabuun mana murtii olaanaatti dhiyeeffamu.',
      am: 'በበታች ፍርድ ቤት ውሳኔ ቅር የተሰኘ ወገን ለበላይ ፍርድ ቤት የሚያቀርበው ይግባኝ።',
      en: 'Appeal preferred from a lower court judgment to a superior appellate court.',
    },
    source: 'Civil Procedure Code Art. 320',
  },
  {
    term: 'ይግባኝ',
    category: 'procedural',
    definition: {
      om: 'Ol-iyyata.',
      am: 'በመጀመሪያ ደረጃ ፍርድ ቤት ውሳኔ ላይ ለበላይ ፍርድ ቤት የሚቀርብ አቤቱታ።',
      en: 'Appeal against a decree or judgment.',
    },
    source: 'Civil Procedure Code Art. 320',
  },
  {
    term: 'Appeal',
    category: 'procedural',
    definition: {
      om: 'Ol-iyyata mana murtii.',
      am: 'ይግባኝ ለበላይ ፍርድ ቤት።',
      en: 'Appellate review of judicial decision.',
    },
    source: 'Civil Procedure Code',
  },
  {
    term: 'Waraqaa Waamichaa',
    category: 'procedural',
    definition: {
      om: 'Xalayaa mana murtichaatiin himatamaaf ykn ragaaf dhaddacha irratti akka dhiyaatu ajaju.',
      am: 'ተከሳሽ ወይም ምስክር ፍርድ ቤት እንዲቀርብ የሚላክ የመጥሪያ ወረቀት።',
      en: 'Formal court summons directing appearance before the bench.',
    },
    source: 'Civil Procedure Code Art. 94',
  },
  {
    term: 'መጥሪያ',
    category: 'procedural',
    definition: {
      om: 'Waraqaa waamichaa.',
      am: 'ተከሳሽ ወይም ምስክር ፍርድ ቤት እንዲቀርብ የሚታዘዝበት የጽሑፍ መጥሪያ።',
      en: 'Court summons.',
    },
    source: 'Civil Procedure Code Art. 94',
  },
  {
    term: 'Summons',
    category: 'procedural',
    definition: {
      om: 'Waraqaa waamicha mana murtii.',
      am: 'የፍርድ ቤት መጥሪያ።',
      en: 'Judicial summons served on defendant or witness.',
    },
    source: 'Civil Procedure Code Art. 94',
  },
  {
    term: 'Wabiilee',
    category: 'civilCourt',
    definition: {
      om: 'Wabii ykn kaffaltii dirqama raawwachiisuuf qabamu.',
      am: 'ዋስትና።',
      en: 'Bail or financial guarantee/surety.',
    },
    source: 'Constitution Art. 19(6)',
  },
  {
    term: 'ዋስትና',
    category: 'civilCourt',
    definition: {
      om: 'Wabii.',
      am: 'የሰው ወይም የገንዘብ ዋስትና።',
      en: 'Bail guarantee or surety.',
    },
    source: 'Constitution Art. 19(6)',
  },
  {
    term: 'Dhaala',
    category: 'civilCourt',
    definition: {
      om: 'Qabeenya nama du\'ee dhaaltotaaf seeraan ykn dhaamootiin dabarsuu.',
      am: 'የሟች ንብረት ለወራሾች በሕግ ወይም በኑዛዜ የሚተላለፍበት የውርስ ሥርዓት።',
      en: 'Hereditary succession and transfer of deceased estate to legal heirs.',
    },
    source: 'Civil Code Art. 826',
  },
  {
    term: 'ውርስ',
    category: 'civilCourt',
    definition: {
      om: 'Dhaala qabeenyaa.',
      am: 'የሟች ንብረት ለወራሾች የሚተላለፍበት ሥርዓት።',
      en: 'Inheritance and succession of estate.',
    },
    source: 'Civil Code Art. 826',
  },
  {
    term: 'Kireeffannaa',
    category: 'commercial',
    definition: {
      om: 'Waliigaltee kireessaa fi kireeffataa manaa ykn qabeenyaa.',
      am: 'የቤት ወይም የንብረት ኪራይ ውል ስምምነት።',
      en: 'Tenancy or lease agreement.',
    },
    source: 'Civil Code Art. 2896',
  },
  {
    term: 'ኪራይ',
    category: 'commercial',
    definition: {
      om: 'Kireeffannaa.',
      am: 'የቤት ወይም የመሬት ኪራይ ስምምነት።',
      en: 'Lease and tenancy.',
    },
    source: 'Civil Code Art. 2896',
  },
];

// Sort terms by descending length so that compound phrases match first
const SORTED_TERMS = [...PREDEFINED_LEGAL_TERMS].sort((a, b) => b.term.length - a.term.length);

/**
 * Helper to build an escaped regular expression matching all predefined legal terms
 */
function buildTermsRegex(): RegExp {
  const escapedTerms = SORTED_TERMS.map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Match with word boundary or whitespace/punctuation
  return new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapedTerms.join('|')})(?=[^\\p{L}\\p{N}_]|$)`, 'gu');
}

const GLOBAL_TERMS_REGEX = buildTermsRegex();

/**
 * Finds the metadata for a matching legal term string (case-insensitive)
 */
export function findPredefinedLegalTerm(termText: string): PredefinedLegalTerm | undefined {
  const lower = termText.toLowerCase().trim();
  return SORTED_TERMS.find((t) => t.term.toLowerCase() === lower);
}

export interface HighlightLegalTerminologyOptions {
  currentLang?: 'om' | 'am' | 'en';
  onTermClick?: (term: PredefinedLegalTerm) => void;
  interactiveTooltip?: boolean;
}

/**
 * Highlights key legal terminology within text by automatically wrapping
 * specific predefined legal terms in a span with a subtle gold underline.
 *
 * @param text Legal document or analysis text
 * @param options Custom options including language and click handler
 * @returns React.ReactNode with wrapped <span> elements
 */
export function highlightKeyLegalTerminology(
  text: string,
  options: HighlightLegalTerminologyOptions | ((term: string) => void) = {}
): React.ReactNode {
  if (!text || typeof text !== 'string') return text;

  // Handle function signature overload where 2nd argument is onTermClick callback
  const opts: HighlightLegalTerminologyOptions =
    typeof options === 'function' ? { onTermClick: (termObj) => options(termObj.term) } : options;

  const currentLang = opts.currentLang || 'om';

  // Quick check if any predefined terms are present in text
  const lowerText = text.toLowerCase();
  const hasAnyTerm = SORTED_TERMS.some((item) => lowerText.includes(item.term.toLowerCase()));
  if (!hasAnyTerm) {
    return text;
  }

  // Segment lines to preserve paragraph structure
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <React.Fragment key={lineIdx}>{'\n'}</React.Fragment>;
        }

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        // Reset regex state
        const regex = new RegExp(GLOBAL_TERMS_REGEX.source, 'gu');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          const prefix = match[1] || '';
          const matchedTerm = match[2];
          const termStartIndex = match.index + prefix.length;
          const termEndIndex = termStartIndex + matchedTerm.length;

          // Push any plain text before this match
          if (termStartIndex > lastIndex) {
            elements.push(line.slice(lastIndex, termStartIndex));
          }

          const termMeta = findPredefinedLegalTerm(matchedTerm);
          const definitionText = termMeta
            ? termMeta.definition[currentLang] || termMeta.definition.om
            : 'Predefined Legal Terminology';
          const titleTooltip = termMeta
            ? `${termMeta.term} (${termMeta.category.toUpperCase()})${termMeta.source ? ` • ${termMeta.source}` : ''}\n${definitionText}`
            : matchedTerm;

          // Wrap the key legal term in a span with a subtle gold underline
          elements.push(
            <span
              key={`term-${lineIdx}-${termStartIndex}`}
              className="legal-term-gold-underline underline decoration-amber-400/80 decoration-[1.5px] underline-offset-4 text-amber-200/95 font-medium cursor-help transition-all hover:decoration-amber-300 hover:text-amber-100 hover:bg-amber-400/10 px-0.5 rounded-sm"
              title={titleTooltip}
              data-legal-term={matchedTerm}
              data-legal-category={termMeta?.category || 'legal'}
              onClick={(e) => {
                if (opts.onTermClick && termMeta) {
                  e.stopPropagation();
                  opts.onTermClick(termMeta);
                }
              }}
            >
              {matchedTerm}
            </span>
          );

          lastIndex = termEndIndex;
        }

        // Push any remaining text after the last match
        if (lastIndex < line.length) {
          elements.push(line.slice(lastIndex));
        }

        return (
          <React.Fragment key={lineIdx}>
            {elements}
            {lineIdx < lines.length - 1 && '\n'}
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * HTML string wrapping variant for contexts where raw HTML output is used.
 */
export function wrapKeyLegalTermsHtml(
  text: string,
  preferredLang: 'om' | 'am' | 'en' = 'om'
): string {
  if (!text || typeof text !== 'string') return text || '';

  const regex = new RegExp(GLOBAL_TERMS_REGEX.source, 'gu');

  return text.replace(regex, (_match, prefix, matchedTerm) => {
    const termMeta = findPredefinedLegalTerm(matchedTerm);
    const def = termMeta
      ? termMeta.definition[preferredLang] || termMeta.definition.om
      : 'Key Legal Term';
    const sourceInfo = termMeta?.source ? ` [${termMeta.source}]` : '';
    const safeTitle = `${matchedTerm}${sourceInfo}: ${def}`.replace(/"/g, '&quot;');

    return `${prefix}<span class="legal-term-gold-underline" title="${safeTitle}" data-legal-term="${matchedTerm}">${matchedTerm}</span>`;
  });
}

/**
 * Returns summary statistics of predefined legal terms found in given text.
 */
export function countDetectedLegalTerms(text: string): {
  totalCount: number;
  uniqueTerms: string[];
  matchedList: { term: PredefinedLegalTerm; count: number }[];
} {
  if (!text || typeof text !== 'string') {
    return { totalCount: 0, uniqueTerms: [], matchedList: [] };
  }

  const counts: Record<string, number> = {};
  const regex = new RegExp(GLOBAL_TERMS_REGEX.source, 'gu');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const term = match[2];
    const meta = findPredefinedLegalTerm(term);
    const canonicalKey = meta?.term || term;
    counts[canonicalKey] = (counts[canonicalKey] || 0) + 1;
  }

  const matchedList = Object.entries(counts)
    .map(([termStr, count]) => {
      const meta = findPredefinedLegalTerm(termStr);
      return meta ? { term: meta, count } : null;
    })
    .filter((x): x is { term: PredefinedLegalTerm; count: number } => x !== null);

  const totalCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const uniqueTerms = Object.keys(counts);

  return { totalCount, uniqueTerms, matchedList };
}
