// Oromia Judicial System Database: Zones, High Courts, First Instance Courts, and Specialized Benches
// Bu'uura Manneen Murtii Naannoo Oromiyaa (Labsii Hundeeffama Manneen Murtii Naannoo Oromiyaa Lakkoofsa 216/2011 fi Heera Mootummaa Naannoo Oromiyaa)

export interface OromiaCourtNode {
  id: string;
  name: string;
  nameAm: string;
  nameEn: string;
  level: 'supreme_court' | 'high_court' | 'first_instance' | 'cassation';
  zoneOrCity: string;
  seat: string; // Bakka teessoo (Seat / Town)
  benches: string[];
  contactEmail: string;
  contactPhone: string;
  defaultAdminCode: string;
}

export const OROMIA_ZONES_AND_CITIES = [
  'Finfinnee (Supreme)',
  'Shawaa Bahaa (East Shewa)',
  'Shawaa Lixaa (West Shewa)',
  'Shawaa Kaabaa (North Shewa)',
  'Adda Oromiyaa Naannawa Finfinnee (Special Zone)',
  'Arsii (Arsi)',
  'Arsii Lixaa (West Arsi)',
  'Baalee (Bale)',
  'Baalee Bahaa (East Bale)',
  'Boorana (Borena)',
  'Gujii (Guji)',
  'Gujii Lixaa (West Guji)',
  'Harargee Bahaa (East Hararghe)',
  'Harargee Lixaa (West Hararghe)',
  'Iluu Abbaa Boor (Ilu Aba Bor)',
  'Buno Baddallee (Buno Bedele)',
  'Jimmaa (Jimma)',
  'Qellem Wallaggaa (Kellem Wollega)',
  'Wallagga Bahaa (East Wollega)',
  'Wallagga Lixaa (West Wollega)',
  'Horo Guduruu Wallaggaa (Horo Guduru)',
  'Magaalaa Adaamaa (Adama City)',
  'Magaalaa Shaggar (Shaggar City)',
  'Magaalaa Shaashamanne (Shashemene City)',
  'Magaalaa Jimmaa (Jimma City)',
  'Magaalaa Bishooftuu (Bishoftu City)',
];

export const OROMIA_COURTS_CATALOG: OromiaCourtNode[] = [
  // 1. Supreme Court & Cassation
  {
    id: 'inst_oromia_supreme',
    name: 'Mana Murtii Waliigalaa Oromiyaa (Oromia Supreme Court)',
    nameAm: 'የኦሮሚያ ጠቅላይ ፍርድ ቤት',
    nameEn: 'Oromia Supreme Court',
    level: 'supreme_court',
    zoneOrCity: 'Finfinnee (Supreme)',
    seat: 'Finfinnee / Addis Ababa',
    benches: [
      'Dhaddacha Ijibbaataa (Cassation Bench)',
      'Dhaddacha Yakkaa Ol\'aanaa (Criminal Appeals Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Appeals Bench)',
      'Dhaddacha Falmii Daldalaa fi Invastimantii (Commercial Bench)',
      'Dhaddacha Hojjettootaa fi Hawaasummaa (Labor & Social Bench)'
    ],
    contactEmail: 'admin@oromiacourt.gov.et',
    contactPhone: '+251 11 551 2233',
    defaultAdminCode: 'OROMIA-COURT-2026',
  },
  // 2. High Courts across major Oromia Zones
  {
    id: 'inst_shawaa_bahaa_high',
    name: 'Mana Murtii Ol\'aanaa Godina Shawaa Bahaa',
    nameAm: 'የምስራቅ ሸዋ ዞን ከፍተኛ ፍርድ ቤት',
    nameEn: 'East Shewa Zone High Court',
    level: 'high_court',
    zoneOrCity: 'Shawaa Bahaa (East Shewa)',
    seat: 'Adaamaa',
    benches: [
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Dhimma Maatii (Family Bench)',
      'Dhaddacha Ol-iyyataa (Appellate Division)'
    ],
    contactEmail: 'eastshewa.court@oromia.gov.et',
    contactPhone: '+251 22 111 2345',
    defaultAdminCode: 'OROMIA-EASTSHEWA-2026',
  },
  {
    id: 'inst_shaggar_city_high',
    name: 'Mana Murtii Ol\'aanaa Bulchiinsa Magaalaa Shaggar',
    nameAm: 'የሸገር ከተማ ከፍተኛ ፍርድ ቤት',
    nameEn: 'Shaggar City High Court',
    level: 'high_court',
    zoneOrCity: 'Magaalaa Shaggar (Shaggar City)',
    seat: 'Shaggar / Saris-Koye',
    benches: [
      'Dhaddacha Lafaafi Qabeenya Dhaabbataa (Land & Real Estate Bench)',
      'Dhaddacha Yakkaa (Criminal Division)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Division)',
      'Dhaddacha Maatii fi Dhaala (Family & Succession Bench)'
    ],
    contactEmail: 'shaggar.court@oromia.gov.et',
    contactPhone: '+251 11 839 4400',
    defaultAdminCode: 'OROMIA-SHAGGAR-2026',
  },
  {
    id: 'inst_shashemene_city_high',
    name: 'Mana Murtii Ol\'aanaa Bulchiinsa Magaalaa Shaashamanne',
    nameAm: 'የሻሸመኔ ከተማ ከፍተኛ ፍርድ ቤት',
    nameEn: 'Shashemene City High Court',
    level: 'high_court',
    zoneOrCity: 'Magaalaa Shaashamanne (Shashemene City)',
    seat: 'Shaashamanne',
    benches: [
      'Dhaddacha Daldalaa fi Invastimantii (Commercial & Investment)',
      'Dhaddacha Lafaafi Qabeenya Dhaabbataa (Land & Real Estate)',
      'Dhaddacha Yakkaa (Criminal Division)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Division)',
      'Dhaddacha Ol-iyyataa (Appellate Division)'
    ],
    contactEmail: 'shashemene.court@oromia.gov.et',
    contactPhone: '+251 46 211 4455',
    defaultAdminCode: 'OROMIA-SHASHEMENE-2026',
  },
  {
    id: 'inst_adama_city_high',
    name: 'Mana Murtii Ol\'aanaa Bulchiinsa Magaalaa Adaamaa',
    nameAm: 'የአዳማ ከተማ ከፍተኛ ፍርድ ቤት',
    nameEn: 'Adama City High Court',
    level: 'high_court',
    zoneOrCity: 'Magaalaa Adaamaa (Adama City)',
    seat: 'Adaamaa',
    benches: [
      'Dhaddacha Falmii Daldalaa (Commercial Bench)',
      'Dhaddacha Lafa Magaalaa fi Kontiraataa (Urban Land & Contracts)',
      'Dhaddacha Yakkaa (Criminal Division)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Division)'
    ],
    contactEmail: 'adama.highcourt@oromia.gov.et',
    contactPhone: '+251 22 111 8976',
    defaultAdminCode: 'OROMIA-ADAMAHIGH-2026',
  },
  {
    id: 'inst_jimma_zone_high',
    name: 'Mana Murtii Ol\'aanaa Godina Jimmaa',
    nameAm: 'የጅማ ዞን ከፍተኛ ፍርድ ቤት',
    nameEn: 'Jimma Zone High Court',
    level: 'high_court',
    zoneOrCity: 'Jimmaa (Jimma)',
    seat: 'Jimma',
    benches: [
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Daldalaa fi Albuudaa (Commercial & Mining)',
      'Dhaddacha Ol-iyyataa (Appellate Division)'
    ],
    contactEmail: 'jimma.court@oromia.gov.et',
    contactPhone: '+251 47 111 8899',
    defaultAdminCode: 'OROMIA-JIMMA-2026',
  },
  {
    id: 'inst_shawaa_lixaa_high',
    name: 'Mana Murtii Ol\'aanaa Godina Shawaa Lixaa',
    nameAm: 'የምዕራብ ሸዋ ዞን ከፍተኛ ፍርድ ቤት',
    nameEn: 'West Shewa Zone High Court',
    level: 'high_court',
    zoneOrCity: 'Shawaa Lixaa (West Shewa)',
    seat: 'Amboo',
    benches: [
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Maatii (Family Bench)'
    ],
    contactEmail: 'westshewa.court@oromia.gov.et',
    contactPhone: '+251 11 236 0122',
    defaultAdminCode: 'OROMIA-WESTSHEWA-2026',
  },
  {
    id: 'inst_arsi_zone_high',
    name: 'Mana Murtii Ol\'aanaa Godina Arsii',
    nameAm: 'የአርሲ ዞን ከፍተኛ ፍርድ ቤት',
    nameEn: 'Arsi Zone High Court',
    level: 'high_court',
    zoneOrCity: 'Arsii (Arsi)',
    seat: 'Asallaa',
    benches: [
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Falmii Qonnaa fi Lafa Baadiyyaa (Agricultural Land)'
    ],
    contactEmail: 'arsi.court@oromia.gov.et',
    contactPhone: '+251 22 331 1540',
    defaultAdminCode: 'OROMIA-ARSI-2026',
  },
  {
    id: 'inst_harargee_bahaa_high',
    name: 'Mana Murtii Ol\'aanaa Godina Harargee Bahaa',
    nameAm: 'የምስራቅ ሐረርጌ ዞን ከፍተኛ ፍርድ ቤት',
    nameEn: 'East Hararghe Zone High Court',
    level: 'high_court',
    zoneOrCity: 'Harargee Bahaa (East Hararghe)',
    seat: 'Harar / Awwadaay',
    benches: [
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Daldala Daangaa fi Kontirobaandii (Customs & Border Trade)'
    ],
    contactEmail: 'easthararghe.court@oromia.gov.et',
    contactPhone: '+251 25 666 4321',
    defaultAdminCode: 'OROMIA-EASTHARAR-2026',
  },
  {
    id: 'inst_wallagga_bahaa_high',
    name: 'Mana Murtii Ol\'aanaa Godina Wallagga Bahaa',
    nameAm: 'የምስራቅ ወለጋ ዞን ከፍተኛ ፍርድ ቤት',
    nameEn: 'East Wollega Zone High Court',
    level: 'high_court',
    zoneOrCity: 'Wallagga Bahaa (East Wollega)',
    seat: 'Naqamtee',
    benches: [
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Ol-iyyataa (Appellate Bench)'
    ],
    contactEmail: 'eastwollega.court@oromia.gov.et',
    contactPhone: '+251 57 661 2044',
    defaultAdminCode: 'OROMIA-EASTWOLLEGA-2026',
  },
  {
    id: 'inst_bale_zone_high',
    name: 'Mana Murtii Ol\'aanaa Godina Baalee',
    nameAm: 'የባሌ ዞን ከፍተኛ ፍርድ ቤት',
    nameEn: 'Bale Zone High Court',
    level: 'high_court',
    zoneOrCity: 'Baalee (Bale)',
    seat: 'Roobee',
    benches: [
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Bosonaa fi Eegumsa Uumamaa (Forest & Environment)'
    ],
    contactEmail: 'bale.court@oromia.gov.et',
    contactPhone: '+251 22 665 1920',
    defaultAdminCode: 'OROMIA-BALE-2026',
  },
  {
    id: 'inst_borena_zone_high',
    name: 'Mana Murtii Ol\'aanaa Godina Booranaa',
    nameAm: 'የቦረና ዞን ከፍተኛ ፍርድ ቤት',
    nameEn: 'Borena Zone High Court',
    level: 'high_court',
    zoneOrCity: 'Boorana (Borena)',
    seat: 'Yaaballoo',
    benches: [
      'Dhaddacha Yakkaa (Criminal Division)',
      'Dhaddacha Hariiroo Hawaasaa fi Aadaa (Civil & Customary Bench)',
      'Dhaddacha Lafa Dhedichaa fi Horii (Pastoralist Grazing Bench)'
    ],
    contactEmail: 'borena.court@oromia.gov.et',
    contactPhone: '+251 46 443 0188',
    defaultAdminCode: 'OROMIA-BORENA-2026',
  },

  // 3. First Instance / Aanaa Primary Courts
  {
    id: 'inst_gurbicha_woreda_first',
    name: 'Mana Murtii Aanaa Gurbicha (Gurbicha Woreda Court)',
    nameAm: 'የጉርቢቻ ወረዳ ፍርድ ቤት',
    nameEn: 'Gurbicha Woreda Court',
    level: 'first_instance',
    zoneOrCity: 'Buno Baddallee (Buno Bedele)',
    seat: 'Gurbicha / Bedele',
    benches: [
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Maatii fi Dhaala (Family & Succession)',
      'Dhaddacha Lafa Baadiyyaa (Agricultural Land Bench)'
    ],
    contactEmail: 'gurbicha.d@court.oromia.et',
    contactPhone: '+251 47 444 1234',
    defaultAdminCode: 'GURBICHA-COURT-2026',
  },
  {
    id: 'inst_adama_woreda_first',
    name: 'Mana Murtii Aanaa Adaamaa (Adama District Court)',
    nameAm: 'የአዳማ ወረዳ የመጀመሪያ ደረጃ ፍርድ ቤት',
    nameEn: 'Adama District Primary Court',
    level: 'first_instance',
    zoneOrCity: 'Magaalaa Adaamaa (Adama City)',
    seat: 'Adaamaa',
    benches: [
      'Dhaddacha Yakkaa Salphaa (Petty Offences Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Dhimma Maatii fi Ijoollee (Juvenile & Family)'
    ],
    contactEmail: 'adama.firstcourt@oromia.gov.et',
    contactPhone: '+251 22 112 0011',
    defaultAdminCode: 'OROMIA-ADAMA1ST-2026',
  },
  {
    id: 'inst_bishoftu_first',
    name: 'Mana Murtii Jalqabaa Magaalaa Bishooftuu',
    nameAm: 'የቢሾፍቱ ከተማ የመጀመሪያ ደረጃ ፍርድ ቤት',
    nameEn: 'Bishoftu City First Instance Court',
    level: 'first_instance',
    zoneOrCity: 'Magaalaa Bishooftuu (Bishoftu City)',
    seat: 'Bishooftuu',
    benches: [
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Daldalaa fi Tajaajilaa (Commercial Services)'
    ],
    contactEmail: 'bishoftu.court@oromia.gov.et',
    contactPhone: '+251 11 433 8000',
    defaultAdminCode: 'OROMIA-BISHOFTU-2026',
  },
  {
    id: 'inst_ambo_woreda_first',
    name: 'Mana Murtii Aanaa Amboo (Ambo District Court)',
    nameAm: 'የአምቦ ወረዳ የመጀመሪያ ደረጃ ፍርድ ቤት',
    nameEn: 'Ambo District Primary Court',
    level: 'first_instance',
    zoneOrCity: 'Shawaa Lixaa (West Shewa)',
    seat: 'Amboo',
    benches: [
      'Dhaddacha Yakkaa (Criminal Bench)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
      'Dhaddacha Dhimma Lafa Qonnaa (Farm Land Disputes)'
    ],
    contactEmail: 'ambo.firstcourt@oromia.gov.et',
    contactPhone: '+251 11 236 4411',
    defaultAdminCode: 'OROMIA-AMBO1ST-2026',
  },
  {
    id: 'inst_jimma_first_primary',
    name: 'Mana Murtii Jalqabaa Magaalaa Jimmaa',
    nameAm: 'የጅማ ከተማ የመጀመሪያ ደረጃ ፍርድ ቤት',
    nameEn: 'Jimma City First Instance Court',
    level: 'first_instance',
    zoneOrCity: 'Magaalaa Jimmaa (Jimma City)',
    seat: 'Jimma',
    benches: [
      'Dhaddacha Yakkaa (Criminal Division)',
      'Dhaddacha Hariiroo Hawaasaa (Civil Division)',
      'Dhaddacha Maatii fi Dhaala (Family & Succession)'
    ],
    contactEmail: 'jimmacity.court@oromia.gov.et',
    contactPhone: '+251 47 111 2233',
    defaultAdminCode: 'OROMIA-JIMMA1ST-2026',
  },
  {
    id: 'inst_sululta_first',
    name: 'Mana Murtii Aanaa Sulultaa (Sululta District Court)',
    nameAm: 'የሱሉልታ ወረዳ ፍርድ ቤት',
    nameEn: 'Sululta District Court',
    level: 'first_instance',
    zoneOrCity: 'Adda Oromiyaa Naannawa Finfinnee (Special Zone)',
    seat: 'Sulultaa',
    benches: [
      'Dhaddacha Falmii Lafa Magaalaa (Urban Land)',
      'Dhaddacha Yakkaa (Criminal)',
      'Dhaddacha Hariiroo Hawaasaa (Civil)'
    ],
    contactEmail: 'sululta.court@oromia.gov.et',
    contactPhone: '+251 11 144 0988',
    defaultAdminCode: 'OROMIA-SULULTA-2026',
  }
];

// Helper: search or filter courts by zone or keyword
export function searchOromiaCourts(query: string, zoneFilter?: string): OromiaCourtNode[] {
  const q = query.trim().toLowerCase();
  return OROMIA_COURTS_CATALOG.filter(c => {
    const matchesZone = !zoneFilter || zoneFilter === 'all' || c.zoneOrCity.toLowerCase().includes(zoneFilter.toLowerCase());
    if (!matchesZone) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameAm.toLowerCase().includes(q) ||
      c.seat.toLowerCase().includes(q) ||
      c.benches.some(b => b.toLowerCase().includes(q))
    );
  });
}

// Oromia Courts 4 Tiers & Initial Trial Jurisdiction (Aangoo Dhimma Jalqabaatti Ilaalluu)
// 1. Mana Murtii Aanaa (District Court) - First Instance
// 2. Mana Murtii Ol'aanaa Godinaa (Zone High Court) - First Instance & Appeals
// 3. Mana Murtii Waligalaa (Supreme Court) - Appeals
// 4. Mana Murtii Dhaddacha Ijibbaataa (Cassation Bench) - Cassation
export function hasInitialJurisdiction(level: 'supreme_court' | 'high_court' | 'first_instance' | 'cassation'): boolean {
  return level === 'first_instance' || level === 'high_court';
}

