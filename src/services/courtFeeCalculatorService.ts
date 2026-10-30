/**
 * Oromia Regional State Court Filing Fee Calculator Service
 * Bu'uura Dambii Kaffaltii Tajaajila Abbaa Seerummaa Manneen Murtii Mootummaa Naannoo Oromiyaa Bara 2015/2016.
 */

export type CourtLevel = 'first_instance' | 'high_court' | 'supreme_court' | 'cassation';

export type ClaimCategory = 'monetary' | 'non_monetary' | 'appeal' | 'cassation';

export type ExemptionCategory = 
  | 'none'
  | 'child_maintenance'       // Mirga daa'immanii fi nafaqaa (Child maintenance)
  | 'labor_under_100k'        // Himata hojjetaa 100,000 ETB gadi
  | 'poverty_legal_aid';      // Waraqaa hiyyummaa (Poverty Certificate)

export interface AdditionalCourtServices {
  witnessCount: number;         // 50 ETB per witness summons
  documentPagesCount: number;   // 5 ETB per certified page copy
  temporaryInjunction: boolean; // 100 ETB for interlocutory orders
  pleadingAmendment: boolean;   // 10% surcharge on base filing fee
}

export interface CourtFeeCalculationInput {
  claimCategory: ClaimCategory;
  courtLevel: CourtLevel;
  claimAmountETB?: number;
  lowerCourtFeeETB?: number;    // Used for appeals (50% of lower court fee)
  additionalServices?: Partial<AdditionalCourtServices>;
  exemption?: ExemptionCategory;
  isPremiumUser?: boolean;
}

export interface FeeTierSegment {
  bracket: string;
  ratePercent: number;
  bracketAmount: number;
  calculatedFee: number;
}

export interface CourtFeeCalculationResult {
  regulationReference: string;
  courtLevel: CourtLevel;
  courtLevelName: string;
  claimCategory: ClaimCategory;
  claimAmountETB: number;
  
  // Government statutory fee
  isExempt: boolean;
  exemptionReason?: string;
  baseCourtFee: number;
  tieredBreakdown: FeeTierSegment[];
  
  // Additional court services
  witnessSummonsFee: number;
  documentCopiesFee: number;
  injunctionFee: number;
  amendmentSurcharge: number;
  totalAdditionalServicesFee: number;
  
  // Net statutory government court fee
  totalGovernmentFee: number;
  
  // Platform fee differentiation (Standard vs Premium)
  standardPlatformProcessingFee: number;
  premiumPlatformProcessingFee: number;
  standardUserTotal: number;
  premiumUserTotal: number;
  
  // Human readable descriptions
  summaryAfaanOromoo: string;
  summaryAmharic: string;
  summaryEnglish: string;
}

/**
 * Calculates statutory court fees based on Oromia Regional State 2015 Regulation Schedule
 */
export function calculateOromiaCourtFee(input: CourtFeeCalculationInput): CourtFeeCalculationResult {
  const {
    claimCategory,
    courtLevel,
    claimAmountETB = 0,
    lowerCourtFeeETB = 0,
    additionalServices = {},
    exemption = 'none',
  } = input;

  const courtLevelNames: Record<CourtLevel, { om: string; am: string; en: string }> = {
    first_instance: {
      om: 'Mana Murtii Aanaa (District Court)',
      am: 'የወረዳ ፍርድ ቤት',
      en: 'First Instance District Court'
    },
    high_court: {
      om: 'Mana Murtii Ol\'aanaa Godinaa (Zone High Court)',
      am: 'የከፍተኛ ፍርድ ቤት',
      en: 'Zonal High Court'
    },
    supreme_court: {
      om: 'Mana Murtii Waliigalaa Oromiyaa (Oromia Supreme Court)',
      am: 'የኦሮሚያ ጠቅላይ ፍርድ ቤት',
      en: 'Oromia Supreme Court'
    },
    cassation: {
      om: 'Dhaddacha Ijibbaataa Oromiyaa (Cassation Bench)',
      am: 'የሰበር ሰሚ ችሎት',
      en: 'Cassation Division'
    }
  };

  // Check statutory exemption
  let isExempt = false;
  let exemptionReason: string | undefined;

  if (exemption === 'child_maintenance') {
    isExempt = true;
    exemptionReason = "Dhimma nafaqaa fi mirga daa'immanii (Child custody & maintenance - 100% Exempt)";
  } else if (exemption === 'labor_under_100k' && claimAmountETB <= 100000) {
    isExempt = true;
    exemptionReason = "Himata hojjetaa birrii 100,000 gadi ta'e (Labor grievance under 100,000 ETB - 100% Exempt)";
  } else if (exemption === 'poverty_legal_aid') {
    isExempt = true;
    exemptionReason = "Waraqaa hiyyummaa mirkanaa'e (Certified Poverty Certificate / Legal Aid - 100% Exempt)";
  }

  let baseCourtFee = 0;
  const tieredBreakdown: FeeTierSegment[] = [];

  if (isExempt) {
    baseCourtFee = 0;
  } else if (claimCategory === 'monetary') {
    // Graduated tariff per Oromia Court Fee Regulation 2015 Schedule
    const amount = Math.max(0, claimAmountETB);
    
    // Minimum fee threshold is 200 ETB
    if (amount <= 20000) {
      const fee = Math.max(200, Math.round(amount * 0.10));
      tieredBreakdown.push({
        bracket: '0 - 20,000 ETB',
        ratePercent: 10,
        bracketAmount: amount,
        calculatedFee: fee,
      });
      baseCourtFee = fee;
    } else {
      let remaining = amount;
      let accFee = 0;

      // Tier 1: 0 - 20,000 @ 10% = 2,000 ETB
      const t1 = Math.min(remaining, 20000);
      const f1 = Math.round(t1 * 0.10);
      tieredBreakdown.push({ bracket: '0 - 20,000 ETB', ratePercent: 10, bracketAmount: t1, calculatedFee: f1 });
      accFee += f1;
      remaining -= t1;

      // Tier 2: 20,001 - 50,000 @ 8% (Max 30,000 @ 8% = 2,400 ETB)
      if (remaining > 0) {
        const t2 = Math.min(remaining, 30000);
        const f2 = Math.round(t2 * 0.08);
        tieredBreakdown.push({ bracket: '20,001 - 50,000 ETB', ratePercent: 8, bracketAmount: t2, calculatedFee: f2 });
        accFee += f2;
        remaining -= t2;
      }

      // Tier 3: 50,001 - 100,000 @ 7% (Max 50,000 @ 7% = 3,500 ETB)
      if (remaining > 0) {
        const t3 = Math.min(remaining, 50000);
        const f3 = Math.round(t3 * 0.07);
        tieredBreakdown.push({ bracket: '50,001 - 100,000 ETB', ratePercent: 7, bracketAmount: t3, calculatedFee: f3 });
        accFee += f3;
        remaining -= t3;
      }

      // Tier 4: 100,001 - 200,000 @ 6% (Max 100,000 @ 6% = 6,000 ETB)
      if (remaining > 0) {
        const t4 = Math.min(remaining, 100000);
        const f4 = Math.round(t4 * 0.06);
        tieredBreakdown.push({ bracket: '100,001 - 200,000 ETB', ratePercent: 6, bracketAmount: t4, calculatedFee: f4 });
        accFee += f4;
        remaining -= t4;
      }

      // Tier 5: 200,001 - 500,000 @ 5% (Max 300,000 @ 5% = 15,000 ETB)
      if (remaining > 0) {
        const t5 = Math.min(remaining, 300000);
        const f5 = Math.round(t5 * 0.05);
        tieredBreakdown.push({ bracket: '200,001 - 500,000 ETB', ratePercent: 5, bracketAmount: t5, calculatedFee: f5 });
        accFee += f5;
        remaining -= t5;
      }

      // Tier 6: 500,001 - 1,000,000 @ 4% (Max 500,000 @ 4% = 20,000 ETB)
      if (remaining > 0) {
        const t6 = Math.min(remaining, 500000);
        const f6 = Math.round(t6 * 0.04);
        tieredBreakdown.push({ bracket: '500,001 - 1,000,000 ETB', ratePercent: 4, bracketAmount: t6, calculatedFee: f6 });
        accFee += f6;
        remaining -= t6;
      }

      // Tier 7: Above 1,000,000 @ 3%
      if (remaining > 0) {
        const f7 = Math.round(remaining * 0.03);
        tieredBreakdown.push({ bracket: 'Gara Oli (Above 1,000,000 ETB)', ratePercent: 3, bracketAmount: remaining, calculatedFee: f7 });
        accFee += f7;
        remaining = 0;
      }

      baseCourtFee = accFee;
    }
  } else if (claimCategory === 'non_monetary') {
    // Fixed statutory filing fee based on court level (Dambii 2015 schedule)
    const fixedRates: Record<CourtLevel, number> = {
      first_instance: 200,
      high_court: 300,
      supreme_court: 500,
      cassation: 600,
    };
    baseCourtFee = fixedRates[courtLevel];
    tieredBreakdown.push({
      bracket: `Kaffaltii Dhaabbataa (${courtLevelNames[courtLevel].om})`,
      ratePercent: 0,
      bracketAmount: 0,
      calculatedFee: baseCourtFee,
    });
  } else if (claimCategory === 'appeal') {
    // Appeal fee is 50% of the lower court filing fee (min 200 ETB)
    const refFee = lowerCourtFeeETB > 0 ? lowerCourtFeeETB : 400;
    baseCourtFee = Math.max(200, Math.round(refFee * 0.50));
    tieredBreakdown.push({
      bracket: 'Ol\'iyyannoo (%50 Kaffaltii Mana Murtii Jalaa)',
      ratePercent: 50,
      bracketAmount: refFee,
      calculatedFee: baseCourtFee,
    });
  } else if (claimCategory === 'cassation') {
    // Cassation Bench filing fee is flat 600 ETB + base assessment
    baseCourtFee = 600;
    tieredBreakdown.push({
      bracket: 'Iyyata Dhaddacha Ijibbaataa Oromiyaa (Flat Statutory Rate)',
      ratePercent: 0,
      bracketAmount: 0,
      calculatedFee: 600,
    });
  }

  // Calculate additional court services
  const witnessCount = Math.max(0, additionalServices.witnessCount || 0);
  const witnessSummonsFee = isExempt ? 0 : witnessCount * 50;

  const docPages = Math.max(0, additionalServices.documentPagesCount || 0);
  const documentCopiesFee = isExempt ? 0 : docPages * 5;

  const injunctionFee = (additionalServices.temporaryInjunction && !isExempt) ? 100 : 0;
  const amendmentSurcharge = (additionalServices.pleadingAmendment && !isExempt) ? Math.round(baseCourtFee * 0.10) : 0;

  const totalAdditionalServicesFee = witnessSummonsFee + documentCopiesFee + injunctionFee + amendmentSurcharge;
  const totalGovernmentFee = isExempt ? 0 : (baseCourtFee + totalAdditionalServicesFee);

  // Platform processing fee
  // Standard user: 300 ETB for AI legal audit and filing voucher generation
  // Premium user: 0 ETB (100% waived as a legal subscriber perk)
  const standardPlatformProcessingFee = 300;
  const premiumPlatformProcessingFee = 0;

  const standardUserTotal = totalGovernmentFee + standardPlatformProcessingFee;
  const premiumUserTotal = totalGovernmentFee + premiumPlatformProcessingFee;

  const summaryOm = isExempt
    ? `Dhimmi kun bu'uura Dambii Kaffaltii Abbaa Seerummaa Naannoo Oromiyaa Bara 2015tiini kaffaltii irraa bilisa (%100 Exempt): ${exemptionReason}.`
    : `Kaffaltiin abbaa seerummaa bu'uura Dambii Kaffaltii Abbaa Seerummaa Naannoo Oromiyaa Bara 2015tiin ${courtLevelNames[courtLevel].om} tiif waliigala Birrii ${totalGovernmentFee.toLocaleString()} ETB dha.`;

  const summaryAm = isExempt
    ? `ይህ ጉዳይ በኦሮሚያ ፍርድ ቤቶች የዳኝነት አገልግሎት ክፍያ ደንብ 2015 መሰረት ከክፍያ ነፃ (100% Exempt) ነው፡ ${exemptionReason}.`
    : `በኦሮሚያ ፍርድ ቤቶች የዳኝነት አገልግሎት ክፍያ ደንብ 2015 መሰረት የሚፈለገው ጠቅላላ የመንግስት ፍርድ ቤት ክፍያ ${totalGovernmentFee.toLocaleString()} ብር ነው።`;

  const summaryEn = isExempt
    ? `This case filing is 100% exempt from court fees pursuant to Oromia Court Fee Regulation 2015: ${exemptionReason}.`
    : `Total statutory court filing fee pursuant to Oromia Regional State Court Fee Regulation 2015 for ${courtLevelNames[courtLevel].en} is ${totalGovernmentFee.toLocaleString()} ETB.`;

  return {
    regulationReference: 'Dambii Kaffaltii Tajaajila Abbaa Seerummaa Manneen Murtii Mootummaa Naannoo Oromiyaa Bara 2015/2016',
    courtLevel,
    courtLevelName: courtLevelNames[courtLevel].om,
    claimCategory,
    claimAmountETB,
    isExempt,
    exemptionReason,
    baseCourtFee,
    tieredBreakdown,
    witnessSummonsFee,
    documentCopiesFee,
    injunctionFee,
    amendmentSurcharge,
    totalAdditionalServicesFee,
    totalGovernmentFee,
    standardPlatformProcessingFee,
    premiumPlatformProcessingFee,
    standardUserTotal,
    premiumUserTotal,
    summaryAfaanOromoo: summaryOm,
    summaryAmharic: summaryAm,
    summaryEnglish: summaryEn,
  };
}
