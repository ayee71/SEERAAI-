export type ContinentKey = 'Africa' | 'Europe' | 'North America' | 'Asia' | 'Australia' | 'South America' | 'Antarctica';

export type LawCategory = 'daily' | 'food' | 'transport' | 'attire' | 'nature' | 'family' | 'decorum' | 'daily_life' | 'food_drink' | 'attire_appearance' | 'animals_nature' | 'family_relationships' | 'public_decorum' | 'historical' | 'traffic' | 'civil' | 'penal';

export interface WorldBizarreLaw {
  id: string;
  country: Record<string, string>;
  countryCode: string;
  continent: ContinentKey;
  category: LawCategory;
  title: Record<string, string>;
  lawText: Record<string, string>;
  explanation: Record<string, string>;
  penalty: Record<string, string>;
  legalContextAndOrigin: Record<string, string>;
  ethiopianLawComparison: Record<string, string>;
  statutoryReferenceOrPrecedent: string;
  status: 'active' | 'repealed' | 'local' | 'rare' | 'historical_repealed' | 'local_ordinance' | 'rarely_enforced';
  flagEmoji: string;
  tags: string[];
  strangeSummary: Record<string, string>;
  emoji: string;
}

export const CONTINENTS_META = [
  { id: 'all', name: { om: 'Ardii Hunda', am: 'ሁሉም አህጉራት', en: 'All Continents' }, emoji: '🌍' },
  { id: 'Africa', name: { om: 'Afrika', am: 'አፍሪካ', en: 'Africa' }, emoji: '🌍' },
  { id: 'Europe', name: { om: 'Awurooppaa', am: 'አውሮፓ', en: 'Europe' }, emoji: '🇪🇺' },
  { id: 'North America', name: { om: 'Amerikaa Kaabaa', am: 'ሰሜን አሜሪካ', en: 'North America' }, emoji: '🌎' },
  { id: 'Asia', name: { om: 'Asiyaa', am: 'እስያ', en: 'Asia' }, emoji: '🌏' },
  { id: 'Australia', name: { om: 'Awustiraaliyaa', am: 'አውስትራሊያ', en: 'Australia' }, emoji: '🦘' },
];

export const CONTINENTS_METADATA = CONTINENTS_META;

export const CONTINENTS_MAP: Record<string, { id: string; name: Record<string, string>; emoji: string }> = {
  all: { id: 'all', name: { om: 'Ardii Hunda', am: 'ሁሉም አህጉራት', en: 'All Continents' }, emoji: '🌍' },
  Africa: { id: 'Africa', name: { om: 'Afrika', am: 'አፍሪካ', en: 'Africa' }, emoji: '🌍' },
  Europe: { id: 'Europe', name: { om: 'Awurooppaa', am: 'አውሮፓ', en: 'Europe' }, emoji: '🇪🇺' },
  'North America': { id: 'North America', name: { om: 'Amerikaa Kaabaa', am: 'ሰሜን አሜሪካ', en: 'North America' }, emoji: '🌎' },
  Asia: { id: 'Asia', name: { om: 'Asiyaa', am: 'እስያ', en: 'Asia' }, emoji: '🌏' },
  Australia: { id: 'Australia', name: { om: 'Awustiraaliyaa', am: 'አውስትራሊያ', en: 'Australia' }, emoji: '🦘' },
  'South America': { id: 'South America', name: { om: 'Amerikaa Kibbaa', am: 'ደቡብ አሜሪካ', en: 'South America' }, emoji: '🌎' },
  Antarctica: { id: 'Antarctica', name: { om: 'Antarktiikaa', am: 'አንታርክቲካ', en: 'Antarctica' }, emoji: '❄️' },
};

export const WORLD_BIZARRE_LAWS: WorldBizarreLaw[] = [
  {
    id: 'law-1',
    country: { om: 'Switzerland', am: 'ስዊዘርላንድ', en: 'Switzerland' },
    countryCode: 'CH',
    continent: 'Europe',
    category: 'daily',
    title: {
      om: 'Manakoo Galgala Saatii 10 booda Haxxifachuu Dhowwuu',
      am: 'በስዊዘርላንድ ከምሽቱ 4 ሰዓት በኋላ ኃፍረትን ወይም ማስነጠስ ማሰማት ክልክል ነው',
      en: 'No Loud Sneezing or Flushing After 10 PM in Switzerland'
    },
    lawText: {
      om: 'Switzerland keessatti mana gurguddoo ykn apartimii keessa jiraatan, saatii 4:00 (10 PM) booda haxxifachuu ykn mana fincaanii sadiin dhiqachuu sagalee guddaan dhorkaa dha.',
      am: 'በስዊዘርላንድ አፓርታማ ውስጥ ከምሽቱ 4 ሰዓት በኋላ ከፍተኛ ድምፅ ማሰማት (ለምሳሌ ሽንት ቤት ማጠብ ወይም ማስነጠስ) በሕግ የተከለከለ ነው።',
      en: 'In Swiss apartment buildings, making loud noises such as flushing the toilet or heavy sneezing after 10 PM is restricted.'
    },
    explanation: {
      om: 'Kunis nageenyaafi boqonnaa ollaa eeguuf labsamedha.',
      am: 'ይህ የጎረቤቶችን ፀጥታና ዕረፍት ለመጠበቅ የወጣ ደንብ ነው።',
      en: 'This regulation is enacted to protect neighbors peace and rest.'
    },
    penalty: {
      om: 'Adaba maallaqaa ykn akeekkachiisa Poolisiif saaxiluu.',
      am: 'የገንዘብ ቅጣት ወይም የፖሊስ ማስጠንቀቂያ።',
      en: 'Fine or police warning.'
    },
    legalContextAndOrigin: {
      om: 'Seerri kun nageenya uummataa eeguuf heera bulchiinsa magaalaatiin kan bahe dha.',
      am: 'ይህ ሕግ የህብረተሰቡን ሰላም ለማስጠበቅ በከተማ አስተዳደር ደንብ የወጣ ነው።',
      en: 'This law was introduced under municipal peace bylaws.'
    },
    ethiopianLawComparison: {
      om: 'Seerri yakkaa Itoophiyaa keeywatti 491 akka ibsetti, jeequmsi nageenya uummataa fi sagaleen dhorkaa ta\'us, haxxifachuun ykn mana fincaanii fayyadamuun hin adabamu.',
      am: 'የኢትዮጵያ ወንጀል ሕግ አንቀጽ 491 የህዝብ ሰላም ማደፍረስን ይከለክላል እንጂ ማስነጠስን ወይም ሽንት ቤት መጠቀምን አይከለክልም።',
      en: 'Ethiopian Penal Code Art. 491 penalizes public disturbance, but natural body functions like sneezing are protected.'
    },
    statutoryReferenceOrPrecedent: 'Swiss Federal Code of Obligations & Municipal Noise Regulations',
    status: 'active',
    flagEmoji: '🇨🇭',
    tags: ['Noise', 'Apartment', 'Europe'],
    strangeSummary: {
      om: 'Galgala keessa sagalee guddaa dhorkuu.',
      am: 'ከሰዓት በኋላ ከፍተኛ ድምፅ ማሰማት ክልክል ነው።',
      en: 'Nighttime noise restriction.'
    },
    emoji: '🌙'
  },
  {
    id: 'law-2',
    country: { om: 'Singapore', am: 'ሲንጋፖር', en: 'Singapore' },
    countryCode: 'SG',
    continent: 'Asia',
    category: 'daily',
    title: {
      om: 'Gummii Paawuzii (Chewing Gum) Baatuu Dhowwuu',
      am: 'በሲንጋፖር ዙም ከም (Chewing Gum) መያዝ እና መሸጥ ክልክል ነው',
      en: 'Chewing Gum Import and Possession Ban in Singapore'
    },
    lawText: {
      om: 'Biyya Singaapoor keessatti Gummii paawuzii qabatanii deemuun ykn gabaaf dhiyeessuun seeraan dhorkaa dha.',
      am: 'በሲንጋፖር ቼዊንግ ጋም ማስገባት፣ መያዝ እና መሸጥ በ1992 ጀምሮ በሕግ የተከለከለ ነው።',
      en: 'Importing, selling, and possessing chewing gum is banned in Singapore since 1992.'
    },
    explanation: {
      om: 'Magaalattii qulqullinaan tursuuf.',
      am: 'ከተማዋን ንጹህና ጽዱ ለማድረግ ታስቦ የተሰራ ነው።',
      en: 'Designed to keep the city clean and pristine.'
    },
    penalty: {
      om: 'Adaba maallaqaa ulfaataa.',
      am: 'ከፍተኛ የገንዘብ ቅጣት።',
      en: 'Heavy monetary fine.'
    },
    legalContextAndOrigin: {
      om: 'Labsii Qulqullina Magaalaa Singaapoor (1992).',
      am: 'የሲንጋፖር ንጽህና አዋጅ (1992).',
      en: 'Singapore Clean City Act (1992).'
    },
    ethiopianLawComparison: {
      om: 'Seerri Bulchiinsa Magaalaa Finfinnee qulqullina lafa irratti tumu qaba, garuu gummii dhorku hin qabu.',
      am: 'የአዲስ አበባ ከተማ አስተዳደር የንጽህና ደንቦች አሉ፣ ነገር ግን ቼዊንግ ጋም አይከለክሉም።',
      en: 'Addis Ababa sanitation bylaws apply to littering, but not gum specifically.'
    },
    statutoryReferenceOrPrecedent: 'Singapore Customs & Environmental Public Health Act',
    status: 'active',
    flagEmoji: '🇸🇬',
    tags: ['Sanitation', 'Singapore', 'Asia'],
    strangeSummary: {
      om: 'Gummii paawuzii dhowwuu.',
      am: 'ቼዊንግ ጋም ማገድ።',
      en: 'Chewing gum prohibition.'
    },
    emoji: '🫧'
  }
];

export interface BizarreLaw {
  id: string;
  country: string;
  continent: string;
  title: string;
  lawText: string;
  explanation: string;
  penalty: string;
}
