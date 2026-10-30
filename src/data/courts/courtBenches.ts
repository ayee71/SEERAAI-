export type CaseType = 'Criminal' | 'Civil' | 'Family' | 'Commercial' | 'Labor' | 'Land' | 'Administrative' | 'Constitutional';

export const BENCH_MAPPING: Record<string, Record<CaseType, string>> = {
  'first_instance': {
    'Criminal': 'Dhaddacha Yakkaa (Criminal Bench)',
    'Civil': 'Dhaddacha Hariiroo Hawaasaa (Civil Bench)',
    'Family': 'Dhaddacha Maatii (Family Bench)',
    'Commercial': 'Dhaddacha Daldalaa (Commercial Bench)',
    'Labor': 'Dhaddacha Hojii (Labor Bench)',
    'Land': 'Dhaddacha Lafaafi Qabeenya Dhaabbataa',
    'Administrative': 'Dhaddacha Bulchiinsaa',
    'Constitutional': 'Dhaddacha Heeraa',
  },
  'high_court': {
    'Criminal': 'Dhaddacha Yakkaa (Criminal Appeals Bench)',
    'Civil': 'Dhaddacha Hariiroo Hawaasaa (Civil Appeals Bench)',
    'Family': 'Dhaddacha Maatii (Family Appeals Bench)',
    'Commercial': 'Dhaddacha Daldalaa fi Invastimantii',
    'Labor': 'Dhaddacha Hojii fi Bulchiinsaa',
    'Land': 'Dhaddacha Lafaafi Qabeenya Dhaabbataa',
    'Administrative': 'Dhaddacha Bulchiinsaa',
    'Constitutional': 'Dhaddacha Heeraa',
  },
  'supreme_court': {
    'Criminal': 'Dhaddacha Yakkaa',
    'Civil': 'Dhaddacha Hariiroo Hawaasaa',
    'Family': 'Dhaddacha Maatii',
    'Commercial': 'Dhaddacha Daldalaa',
    'Labor': 'Dhaddacha Hojii',
    'Land': 'Dhaddacha Lafaafi Qabeenya Dhaabbataa',
    'Administrative': 'Dhaddacha Bulchiinsaa',
    'Constitutional': 'Dhaddacha Heeraa',
  },
  'cassation': {
    'Criminal': 'Dhaddacha Ijibbaataa (Cassation Bench)',
    'Civil': 'Dhaddacha Ijibbaataa (Cassation Bench)',
    'Family': 'Dhaddacha Ijibbaataa (Cassation Bench)',
    'Commercial': 'Dhaddacha Ijibbaataa (Cassation Bench)',
    'Labor': 'Dhaddacha Ijibbaataa (Cassation Bench)',
    'Land': 'Dhaddacha Ijibbaataa (Cassation Bench)',
    'Administrative': 'Dhaddacha Ijibbaataa (Cassation Bench)',
    'Constitutional': 'Dhaddacha Ijibbaataa (Cassation Bench)',
  },
};

export const BENCH_AVAILABILITY: Record<string, boolean> = {
  'Dhaddacha Yakkaa (Criminal Bench)': true,
  'Dhaddacha Hariiroo Hawaasaa (Civil Bench)': true,
  'Dhaddacha Maatii (Family Bench)': true,
  'Dhaddacha Daldalaa (Commercial Bench)': true,
  'Dhaddacha Hojii (Labor Bench)': true,
  'Dhaddacha Lafaafi Qabeenya Dhaabbataa': true,
  'Dhaddacha Bulchiinsaa': true,
  'Dhaddacha Heeraa': true,
  'Dhaddacha Yakkaa (Criminal Appeals Bench)': true,
  'Dhaddacha Hariiroo Hawaasaa (Civil Appeals Bench)': true,
  'Dhaddacha Maatii (Family Appeals Bench)': true,
  'Dhaddacha Daldalaa fi Invastimantii': true,
  'Dhaddacha Hojii fi Bulchiinsaa': true,
  'Dhaddacha Yakkaa': true,
  'Dhaddacha Hariiroo Hawaasaa': true,
  'Dhaddacha Maatii': true,
  'Dhaddacha Daldalaa': true,
  'Dhaddacha Hojii': true,
  'Dhaddacha Ijibbaataa (Cassation Bench)': true,
  'Dhaddacha Waliigalaa (General Bench)': true,
};

export const getRecommendedBench = (courtLevel: string, caseType: CaseType): string => {
  return BENCH_MAPPING[courtLevel]?.[caseType] || 'Dhaddacha Waliigalaa (General Bench)';
};

export const isBenchAvailable = (benchName: string): boolean => {
  return !!BENCH_AVAILABILITY[benchName];
};
