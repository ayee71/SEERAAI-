export interface JudicialBenchOption {
  id: string;
  name: string;
  code: string;
  category: string;
  level: string;
  description: string;
}

export const AVAILABLE_JUDICIAL_BENCHES: JudicialBenchOption[] = [
  { id: 'bench_civil_1', name: 'Dhaddacha Hariiroo Hawaasaa 1ffaa (Civil Bench 1)', code: 'CIV-01', category: 'Civil', level: 'First Instance / High Court', description: 'Falmii waliigaltee, qabeenyaa fi maallaqaa' },
  { id: 'bench_civil_2', name: 'Dhaddacha Hariiroo Hawaasaa 2ffaa (Civil Bench 2)', code: 'CIV-02', category: 'Civil', level: 'First Instance / High Court', description: 'Falmii kontraata fi dhaala qabeenyaa' },
  { id: 'bench_criminal_1', name: 'Dhaddacha Yakkaa 1ffaa (Criminal Bench 1)', code: 'CRM-01', category: 'Criminal', level: 'First Instance / High Court', description: 'Balleessaa yakka ulfaataa fi beellama qorannoo' },
  { id: 'bench_criminal_2', name: 'Dhaddacha Yakkaa 2ffaa (Criminal Bench 2)', code: 'CRM-02', category: 'Criminal', level: 'First Instance / High Court', description: 'Yakka malaammaltummaa fi dinagdee' },
  { id: 'bench_family', name: 'Dhaddacha Maatii fi Dhaala (Family & Probate Bench)', code: 'FAM-01', category: 'Family', level: 'First Instance Court', description: 'Falmii hiika fuudhaa, guddisa ijoollee fi dhaala' },
  { id: 'bench_commercial_labor', name: 'Dhaddacha Hojii fi Daldalaa (Commercial & Labor Bench)', code: 'COM-01', category: 'Commercial', level: 'High Court / Commercial', description: 'Falmii hojjetaa fi hojjechiisaa, kaampanii PLC' },
  { id: 'bench_land_environment', name: 'Dhaddacha Lafa fi Naannoo (Land & Environmental Bench)', code: 'LND-01', category: 'Land', level: 'High Court', description: 'Falmii lafa magaalaa, baadiyyaa fi qabiyyaa' },
  { id: 'bench_appellate_civil', name: 'Dhaddacha Ol-Iyyaata Hariiroo Hawaasaa (Appellate Civil Bench)', code: 'APP-CIV', category: 'Appeals', level: 'High / Supreme Court', description: 'Ol-iyyaata dhaddacha hariiroo hawaasaa' },
  { id: 'bench_appellate_criminal', name: 'Dhaddacha Ol-Iyyaata Yakkaa (Appellate Criminal Bench)', code: 'APP-CRM', category: 'Appeals', level: 'High / Supreme Court', description: 'Ol-iyyaata dhaddacha yakkaa' },
  { id: 'bench_cassation_1', name: 'Dhaddacha Ijibbaataa 1ffaa (Cassation Bench 1)', code: 'CAS-01', category: 'Cassation', level: 'Supreme Court Cassation', description: 'Dogoggora bu\'uura seeraa dhimma hariiroo hawaasaa' },
  { id: 'bench_cassation_2', name: 'Dhaddacha Ijibbaataa 2ffaa (Cassation Bench 2)', code: 'CAS-02', category: 'Cassation', level: 'Supreme Court Cassation', description: 'Dogoggora bu\'uura seeraa dhimma yakkaa' },
  { id: 'bench_constitutional', name: 'Dhaddacha Bulchiinsa & Constitution (Constitutional Bench)', code: 'CNS-01', category: 'Constitutional', level: 'Supreme Court', description: 'Dhimmoota bulchiinsa mootummaa fi heeraa' },
];
