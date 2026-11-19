/**
 * Ethiopian Calendar Converter and Formatter Utility for SEERAAI
 * Converts Gregorian Dates (G.C.) to Ethiopian Calendar Dates (E.C. / B.E. / ዓ.ም)
 */

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
  monthName: {
    om: string;
    am: string;
    en: string;
  };
}

export const ETHIOPIAN_MONTHS = [
  { om: 'Moola / Masqala', am: 'መስከረም', en: 'Meskerem' },
  { om: 'Onkololeessa', am: 'ጥቅምት', en: 'Teqemt' },
  { om: 'Sadaasa', am: 'ህዳር', en: 'Hedar' },
  { om: 'Mudde', am: 'ታኅሣሥ', en: 'Tahsas' },
  { om: 'Amajjii', am: 'ጥር', en: 'Tir' },
  { om: 'Gurraandhala', am: 'የካቲት', en: 'Yekatit' },
  { om: 'Bitootessa', am: 'መጋቢት', en: 'Megabit' },
  { om: 'Elba / Ebbla', am: 'ሚያዝያ', en: 'Miazia' },
  { om: 'Caamsaa', am: 'ግንቦት', en: 'Ginbot' },
  { om: 'Waxabajjii', am: 'ሰኔ', en: 'Sene' },
  { om: 'Adoolessa', am: 'ሐምሌ', en: 'Hamle' },
  { om: 'Hagayya', am: 'ነሐሴ', en: 'Nahase' },
  { om: 'Qaammee', am: 'ጳጉሜ', en: 'Pagume' },
];

/**
 * Converts a Gregorian Date to Ethiopian Calendar Date
 */
export function toEthiopianDate(inputDate: Date | string): EthiopianDate {
  const date = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
  
  if (isNaN(date.getTime())) {
    // Default fallback to current date if invalid
    const now = new Date();
    return toEthiopianDate(now);
  }

  const gy = date.getFullYear();
  const gm = date.getMonth() + 1; // 1-12
  const gd = date.getDate();

  // Determine if Gregorian year is leap year
  const isGregorianLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;

  // New year start day offset (Meskerem 1 is Sept 11, or Sept 12 if following leap year)
  const newYearDay = (gy - 1) % 4 === 3 ? 12 : 11;

  let ey = gy - 8;
  if (gm > 9 || (gm === 9 && gd >= newYearDay)) {
    ey = gy - 7;
  }

  // Days in Gregorian months
  const gDaysInMonth = [0, 31, isGregorianLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Calculate day of the Gregorian year
  let dayOfYear = gd;
  for (let i = 1; i < gm; i++) {
    dayOfYear += gDaysInMonth[i];
  }

  // Ethiopian New Year in Gregorian day-of-year
  let ethNewYearDayOfYear = 254; // Sept 11
  if (isGregorianLeap) ethNewYearDayOfYear = 255;
  if ((gy - 1) % 4 === 3) ethNewYearDayOfYear += 1;

  let ethDay: number;
  let ethMonth: number;

  if (dayOfYear >= ethNewYearDayOfYear) {
    const daysAfterNewYear = dayOfYear - ethNewYearDayOfYear;
    ethMonth = Math.floor(daysAfterNewYear / 30) + 1;
    ethDay = (daysAfterNewYear % 30) + 1;
  } else {
    // Before Ethiopian New Year in the current Gregorian year
    const prevYearLeap = ((gy - 1) % 4 === 0 && (gy - 1) % 100 !== 0) || (gy - 1) % 400 === 0;
    const daysInPrevGregYear = prevYearLeap ? 366 : 365;
    const prevEthNewYearDay = prevYearLeap ? 255 : 254;

    const daysAfterPrevNewYear = (daysInPrevGregYear - prevEthNewYearDay) + dayOfYear;
    ethMonth = Math.floor(daysAfterPrevNewYear / 30) + 1;
    ethDay = (daysAfterPrevNewYear % 30) + 1;
  }

  // Boundary safety checks for 13th month (Pagume)
  if (ethMonth > 13) {
    ethMonth = 13;
  }

  const monthInfo = ETHIOPIAN_MONTHS[ethMonth - 1] || ETHIOPIAN_MONTHS[0];

  return {
    year: ey,
    month: ethMonth,
    day: ethDay,
    monthName: monthInfo,
  };
}

/**
 * Formats Gregorian date into Ethiopian Calendar string (e.g., Onkololeessa 24, 2019 E.C.)
 */
export function formatEthiopianDate(
  inputDate: Date | string,
  lang: 'om' | 'am' | 'en' = 'om'
): string {
  const eth = toEthiopianDate(inputDate);
  const monthName = eth.monthName[lang] || eth.monthName.om;

  if (lang === 'am') {
    return `${monthName} ${eth.day}, ${eth.year} ዓ.ም`;
  } else if (lang === 'om') {
    return `${monthName} ${eth.day}, ${eth.year} E.C. (B.I.)`;
  } else {
    return `${monthName} ${eth.day}, ${eth.year} E.C.`;
  }
}

/**
 * Returns dual schedule string showing both Gregorian & Ethiopian Calendar dates
 * Example: 2026-11-03 G.C. • Onkololeessa 24, 2019 E.C.
 */
export function formatCourtHearingScheduleDate(
  inputDate: Date | string,
  lang: 'om' | 'am' | 'en' = 'om'
): { gregDate: string; ethDate: string; combined: string } {
  const d = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
  const isoStr = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : typeof inputDate === 'string' ? inputDate : '';

  const ethStr = formatEthiopianDate(inputDate, lang);

  return {
    gregDate: isoStr,
    ethDate: ethStr,
    combined: `${isoStr} G.C. • ${ethStr}`,
  };
}
