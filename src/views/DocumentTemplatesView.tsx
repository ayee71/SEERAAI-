import React, { useState } from 'react';
import {
  FileText,
  Briefcase,
  Home,
  FileCheck,
  Shield,
  Coins,
  Scale,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Layers,
  ChevronRight,
  Send,
  HelpCircle,
  MessageSquare,
  BookOpen,
  Info,
  CheckCircle2,
  FileQuestion,
  Gavel,
  ShieldAlert,
  Brain,
  Building,
  Calculator,
  Crown,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent, GenerateResponse } from '../services/api';
import { DocumentViewer } from '../components/DocumentViewer';
import { DocumentQAPanel } from '../components/DocumentQAPanel';
import { CourtFeeCalculator } from '../components/CourtFeeCalculator';
import { calculateOromiaCourtFee, CourtFeeCalculationResult } from '../services/courtFeeCalculatorService';
import { useAuth } from '../context/AuthContext';

interface DocumentTemplatesViewProps {
  currentLang: Language;
}

interface TemplateDefinition {
  id: string;
  category: 'employment' | 'lease' | 'powerOfAttorney' | 'loan' | 'sales' | 'pleadings';
  title: {
    om: string;
    am: string;
    en: string;
  };
  description: {
    om: string;
    am: string;
    en: string;
  };
  lawBasis: string;
  keyLegalRequirements: {
    om: string[];
    am: string[];
    en: string[];
  };
  suggestedQuestions: {
    om: string[];
    am: string[];
    en: string[];
  };
  defaultValues: {
    partyA: string;
    partyB: string;
    amount: string;
    durationOrDate: string;
    location: string;
    specialClauses: string;
  };
}

export const DocumentTemplatesView: React.FC<DocumentTemplatesViewProps> = ({ currentLang }) => {
  const t = translations[currentLang];

  const templates: TemplateDefinition[] = [
    {
      id: 'employment_indefinite',
      category: 'employment',
      title: {
        om: 'Waliigaltee Hojii Dhaabbataa (Indefinite Employment)',
        am: 'ቋሚ የስራ ቅጥር ውል',
        en: 'Indefinite Employment Contract',
      },
      description: {
        om: 'Labsii 1156/2019 bu\'uura godhachuun hojjetaa fi hojjechiisaa gidduutti kan qophaa\'u.',
        am: 'በአዋጅ 1156/2011 መሰረት የደመወዝ፣ የፈቃድና የስራ ሁኔታዎችን የሚደነግግ ውል።',
        en: 'Statutory employment agreement under Ethiopian Labor Proclamation 1156/2019.',
      },
      lawBasis: 'Labsii Lakk. 1156/2019 (Labor Proclamation)',
      keyLegalRequirements: {
        om: [
          'Yeroon yaalii (probation period) guyyaa 60 hin caalu (K. 11(3)).',
          'Sa\'aatiin hojii idilee torbanitti sa\'aatii 48 caaluu hin qabu (K. 61).',
          'Boqonnaa waggaa kaffaltii qabu guyyoota hojii 16 irraa eegala (K. 77).',
          'Hojiirraa ari\'uun sababa gahaa fi akeekkachiisa seeraa eeggachuu qaba (K. 27-30).',
        ],
        am: [
          'የሙከራ ጊዜ ከ60 የስራ ቀናት መብለጥ የለበትም (አንቀጽ 11(3))።',
          'መደበኛ የስራ ሰዓት በሳምንት ከ48 ሰዓታት መብለጥ የለበትም (አንቀጽ 61)።',
          'ዓመታዊ የፈቃድ ቀናት ክፍያ ካለው 16 የስራ ቀናት ጀምሮ ይሰላል (አንቀጽ 77)።',
          'ስንብት ተገቢ ምክንያት እና የቅድሚያ ማስጠንቀቂያ ሊኖረው ይገባል (አንቀጽ 27-30)።',
        ],
        en: [
          'Probation period cannot exceed 60 consecutive working days (Art. 11(3)).',
          'Maximum normal working hours is 48 hours per week (Art. 61).',
          'Annual paid leave begins at 16 working days for the first year (Art. 77).',
          'Termination requires valid lawful grounds and statutory advance notice (Arts. 27-30).',
        ],
      },
      suggestedQuestions: {
        om: [
          'Labsii 1156/2019 bu\'uuraan yeroo yaalii keessatti hojjetaa ari\'uun ni danda\'amaa?',
          'Hojjechiisaan sababa seera qabeessa malee yoo ari\'e beenyaan kaffalamu maali?',
          'Hojjetaan ofiin hojii gadhiisuuf akeekkachiisa guyyaa meeqaa kennuu qaba?',
          'Mindaan ji\'a ji\'aan yoo kaffalamuu baate dhiibbaan seeraa maali?',
        ],
        am: [
          'በአዋጅ 1156/2011 መሰረት በሙከራ ጊዜ ሰራተኛን ያለ ማስጠንቀቂያ ማሰናበት ይቻላል?',
          'አሰሪው ያለበቂ ምክንያት ሰራተኛን ቢያሰናብት የሚከፈለው የካሳ መጠን ስንት ነው?',
          'ሰራተኛው በራሱ ፈቃድ ስራ ለመልቀቅ የስንት ቀናት ቅድሚያ ማስጠንቀቂያ መስጠት አለበት?',
          'ደመወዝ በወቅቱ ካልተከፈለ አሰሪው ላይ የሚኖረው የሕግ ተጠያቂነት ምንድን ነው?',
        ],
        en: [
          'Can an employer terminate during probation without advance notice under Proclamation 1156/2019?',
          'What severance pay and compensation are due for unlawful dismissal without good cause?',
          'What is the statutory notice period for an employee resigning voluntarily?',
          'What are the mandatory dispute resolution procedures before the Labor Relations Board or Court?',
        ],
      },
      defaultValues: {
        partyA: 'Dhaabbata Daldalaa XYZ (Finfinnee)',
        partyB: 'Obbo/Aadde Tolasaa Baqqalaa',
        amount: '25,000 ETB ji\'atti (Gross)',
        durationOrDate: 'Guyyaa 01/02/2016 B.A. eegalee (Dhaabbataa)',
        location: 'Finfinnee, Kifla Magaalaa Boolee',
        specialClauses: 'Boqonnaa waggaa guyyaa 16, inshuraansii fayyaa, fi sa\'aatii hojii torbanitti sa\'aatii 48.',
      },
    },
    {
      id: 'house_lease',
      category: 'lease',
      title: {
        om: 'Waliigaltee Kireeffannaa Mana Jireenyaa (Residential Lease)',
        am: 'የመኖሪያ ቤት ኪራይ ውል',
        en: 'Residential House Lease Agreement',
      },
      description: {
        om: 'Koodii Siivilii keeyyata 2896 bu\'uura godhachuun mirga kireessaa fi kireeffataa eega.',
        am: 'በፍትሐብሔር ሕግ ቁጥር 2896 መሰረት የተከራይና አከራይ ግዴታዎችን የሚደነግግ።',
        en: 'Compliant with Ethiopian Civil Code Arts. 2896-2974 on tenancy.',
      },
      lawBasis: 'Koodii Siivilii K. 2896-2974 (Civil Code Tenancy)',
      keyLegalRequirements: {
        om: [
          'Waliigalteen waggaa tokkoo ol ta\'e barreeffamaan ta\'uu qaba (K. 2898).',
          'Kireessaan manicha haala fayyadamuun danda\'amuun dhiyeessuuf dirqama qaba (K. 2900).',
          'Kireeffataan manicha qulqullinaanii fi eeggannoodhaan fayyadamuu qaba (K. 2928).',
          'Akeekkachiisni kiree addaan kutuu yoo xiqqaate ji\'a sadii dura kennamuu qaba (K. 2966).',
        ],
        am: [
          'ከአንድ ዓመት በላይ የሚቆይ የቤት ኪራይ ውል በጽሁፍ መደረግ አለበት (አንቀጽ 2898)።',
          'አከራይ ቤቱን ለመኖሪያ በሚስማማ መልኩ የማስረከብ ግዴታ አለበት (አንቀጽ 2900)።',
          'ተከራይ ቤቱን በጥንቃቄና በንጽህና የመያዝ ግዴታ አለበት (አንቀጽ 2928)።',
          'ውሉን ለማቋረጥ ቢያንስ የሶስት ወራት ቅድሚያ ማስጠንቀቂያ መሰጠት አለበት (አንቀጽ 2966)።',
        ],
        en: [
          'Leases exceeding one year must be in writing (Civil Code Art. 2898).',
          'Lessor must deliver property in good state of repair and fit for dwelling (Art. 2900).',
          'Lessee must preserve the property with due diligence of good family father (Art. 2928).',
          'Statutory termination notice requires at least 3 months advance written warning (Art. 2966).',
        ],
      },
      suggestedQuestions: {
        om: [
          'Koodii Siivilii keeyyata 2896 bu\'uuraan kireessaan yeroo waliigalteen hin xumuramin kiree dabaluu danda\'aa?',
          'Kireeffataan kaffaltii ji\'aa yoo kaffaluu dide kireessaan battalatti manaa baasuu danda\'aa?',
          'Qabsiisni (security deposit) yeroo manichi gadhiifamu akkamitti fi yoom deebi\'a?',
          'Suphaa fi fooyya\'iinsa manichaa eenyutu baasa (Kireessaa moo Kireeffataa)?',
        ],
        am: [
          'በፍትሐብሔር ሕግ 2896 መሰረት አከራይ ውሉ ሳይጠናቀቅ የኪራይ ዋጋ መጨመር ይችላል?',
          'ተከራይ የኪራይ ክፍያ ቢያዘገይ አከራዩ ወዲያውኑ ቤቱን ማስለቀቅ ይችላል ወይስ ፍርድ ቤት መሄድ አለበት?',
          'የቅድመ ክፍያ ዋስትና (Deposit) ቤቱ ሲለቀቅ መቼና እንዴት ይመለሳል?',
          'የቤቱ የጥገና እና የማደስ ወጪ በማን ይሸፈናል (በአከራይ ወይስ በተከራይ)?',
        ],
        en: [
          'Can a landlord increase rent during the subsistence of the lease term under Civil Code Art. 2896?',
          'What are the mandatory legal steps to evict a defaulting tenant under Ethiopian tenancy law?',
          'How is the security deposit refunded and under what conditions can deductions be made?',
          'Who bears structural repairs vs. minor maintenance under Ethiopian Civil Code Arts. 2905-2915?',
        ],
      },
      defaultValues: {
        partyA: 'Obbo Jamaal Huseen (Kireessaa)',
        partyB: 'Aadde Hawwii Mokonnon (Kireeffataa)',
        amount: '20,000 ETB ji\'atti (Qabsiisa ji\'a 2)',
        durationOrDate: 'Waggaa tokkoof (01/01/2016 hanga 30/12/2016 B.A.)',
        location: 'Adaamaa, Ganda 04, Mana Lakk. 112',
        specialClauses: 'Kaffaltiin ji\'a ji\'aan dursee guyyaa 5 dura kaffalama. Qulqullina manichaa kireeffataan eega.',
      },
    },
    {
      id: 'commercial_shop_lease',
      category: 'lease',
      title: {
        om: 'Waliigaltee Kireeffannaa Gamoo Daldalaa (Commercial Lease)',
        am: 'የንግድ ህንጻ ኪራይ ውል',
        en: 'Commercial Business Tenancy Agreement',
      },
      description: {
        om: 'Suuqiifi gamoo daldalaaf kireessuu Koodii Siivilii fi Koodii Daldalaatiin qophaa\'u.',
        am: 'ለንግድ ስራ የሚውል ሱቅ ወይም ህንጻ የኪራይ ስምምነት ውል።',
        en: 'Commercial store and business premises lease agreement.',
      },
      lawBasis: 'Koodii Siivilii K. 2896 & Koodii Daldalaa (Commercial Code)',
      keyLegalRequirements: {
        om: [
          'Waliigalteen daldalaa heeyyama daldalaa fi TIN qabaachuu qaba.',
          'Dabarsanii nama birootti kireessuun (sublease) eeyyama kireessaa malee dhowwaadha (K. 2959).',
          'Daldalli gaggeeffamu eeyyama seeraatiin wal simachuu qaba.',
        ],
        am: [
          'የንግድ ኪራይ ውል የንግድ ፈቃድ እና የግብር ከፋይ መለያ ቁጥር (TIN) ማካተት አለበት።',
          'ያለ አከራዩ የጽሁፍ ፈቃድ ለሶስተኛ ወገን ማከራየት (Sub-lease) የተከለከለ ነው (አንቀጽ 2959)።',
          'የሚካሄደው የንግድ እንቅስቃሴ ሕጋዊ ፈቃድ ሊኖረው ይገባል።',
        ],
        en: [
          'Commercial lease must specify business license and TIN particulars.',
          'Subleasing without express written consent of the lessor is legally prohibited (Civil Code Art. 2959).',
          'Permitted commercial usage must comply with municipal zoning regulations.',
        ],
      },
      suggestedQuestions: {
        om: [
          'Kireeffataan daldala isaa nama birootti dabarse kireeffannaan gamoo akkam ta\'a?',
          'Gibira kiree mootummaa (Rental Income Tax) kireessaa moo kireeffataatu kaffala?',
          'Yoo daldalli kufuu sababeeffateen kireeffataan kiree addaan kutuu ni danda\'aa?',
          'Adabbiin yeroo kaffaltiin darbee seeraan hammam ta\'uu danda\'a?',
        ],
        am: [
          'ተከራዩ ንግዱን ለሶስተኛ ወገን ቢያስተላልፍ የህንጻው የኪራይ ውል ይቀጥላል ወይስ ይፈርሳል?',
          'የቤት ኪራይ የገቢ ግብር (Rental Tax) በአከራይ ወይስ በተከራይ የሚከፈል ነው?',
          'የንግድ ኪሳራ ቢያጋጥም ተከራዩ ውሉን አስቀድሞ ማቋረጥ ይችላል?',
          'የክፍያ መዘግየት ወለድ ወይም ቅጣት በሕግ የተገደበ መጠን አለው?',
        ],
        en: [
          'What happens to the commercial tenancy if the tenant transfers their goodwill/business asset?',
          'Who is legally liable for withholding and paying rental income tax to the tax authority?',
          'Can the lessee terminate early due to economic hardship or force majeure?',
          'What contractual penalty and liquidated damages clauses are enforceable under Ethiopian law?',
        ],
      },
      defaultValues: {
        partyA: 'Gamoo Al-Noor PLC (Kireessaa)',
        partyB: 'Dhaabbata Daldalaa Bultum (Kireeffataa)',
        amount: '40,000 ETB ji\'atti (VAT dabalatee)',
        durationOrDate: 'Waggaa 2 (Lakk. Galmee Daldalaa waliin)',
        location: 'Finfinnee, Piyaassaa, Lakk. Suuqi 204',
        specialClauses: 'Daldala seera qabeessa qofaaf oola. Nama birootti dabarsanii kireessuun (sublease) dhowwaadha.',
      },
    },
    {
      id: 'special_power_of_attorney',
      category: 'powerOfAttorney',
      title: {
        om: 'Waraqaa Bakka Bu\'ummaa Addaa (Special Power of Attorney)',
        am: 'ልዩ የውክልና ስልጣን ሰነድ',
        en: 'Special Power of Attorney (Property & Bank)',
      },
      description: {
        om: 'Qabeenya manaa fi lafaa gurguruu, ragaa DARA baasuu fi baankii irraa liqii kaffaluuf.',
        am: 'ቤትና ይዞታን ለመሸጥ፣ በሰነዶች ማረጋገጫ (DARA) ለማስፈጸም ለጠበቃ የሚሰጥ ሙሉ ስልጣን።',
        en: 'Conveyance, mortgage, and municipal registration authority representation.',
      },
      lawBasis: 'Koodii Siivilii K. 2199-2225 (Agency & Power of Attorney)',
      keyLegalRequirements: {
        om: [
          'Qabeenya dhuunfaa gurguruu fi qabsiisuuf aangoo ifa ta\'etu kennamuu qaba (K. 2205).',
          'Waajjira Mirkaneessa Sanadootaa (DARA) duratti mallatteeffamuu qaba (K. 1723).',
          'Ragaan eenyummaa fi waraqaan abbaa qabeenyummaa dhiyaachuu qaba.',
        ],
        am: [
          'ቤትና ይዞታን ለመሸጥ ወይም ለማስያዝ ግልጽ ልዩ ስልጣን (Special Power) መገለጽ አለበት (አንቀጽ 2205)።',
          'በሰነዶች ማረጋገጫና ምዝገባ ኤጀንሲ (DARA) ፊት መረጋገጥ አለበት (አንቀጽ 1723)።',
          'የዋናው ውክልና ሰጪና የጠበቃው የታደሰ መታወቂያ መቅረብ አለበት።',
        ],
        en: [
          'Authority to sell, mortgage, or convey immovable property requires special power (Civil Code Art. 2205).',
          'Mandatory formal authentication before Document Authentication and Registration Agency (DARA) (Art. 1723).',
          'Principal must hold valid title deeds and original identification cards.',
        ],
      },
      suggestedQuestions: {
        om: [
          'Waraqaan bakka bu\'ummaa kun DARA biratti galmaa\'uu yoo baate seera qabeessummaa qabaa?',
          'Bakka bu\'aan qabeenya koo maqaa ofiitiin jijjiiruu ni danda\'aa?',
          'Bakka bu\'ummaa kana yoomiyyuu addaan kutuu (revocation) nan danda\'aa?',
          'Yoo bakka buusan du\'e bakka bu\'ummaan battalatti diigamaa?',
        ],
        am: [
          'ውክልናው በሰነዶች ማረጋገጫ (DARA) ካልተረጋገጠ በሕግ ፊት ተቀባይነት አለው?',
          'ተወካዩ የተሰጠውን ስልጣን አላግባብ ተጠቅሞ ቤቱን በራሱ ስም ማዛወር ይችላል?',
          'ውክልና የሰጠው ሰው በማንኛውም ጊዜ ውክልናውን መሰረዝ (Revoke ማድረግ) ይችላል?',
          'ውክልና ሰጪው በሞት ቢለይ የውክልና ስልጣኑ በሕጉ መሰረት ወዲያውኑ ይቋረጣል?',
        ],
        en: [
          'Is an unauthenticated power of attorney legally valid to transfer real estate in Ethiopia?',
          'Can an agent self-deal or transfer property to themselves under Civil Code Art. 2188?',
          'How can the principal unilaterally revoke a Special Power of Attorney legally?',
          'Does the death or incapacity of the principal automatically terminate the agency under Art. 2230?',
        ],
      },
      defaultValues: {
        partyA: 'Obbo Baqqalaa Gammachuu (Bakka-Buusa)',
        partyB: 'Abukaattoo Dassaaleny Caalaa (Bakka-Bu\'aa)',
        amount: 'Gatii manichaa hunda dabarsee fuudhuuf',
        durationOrDate: 'Hanga hojiin kun xumuramutti kan turu',
        location: 'Waajjira Mirkaneessa Sanadootaa (DARA) Finfinnee',
        specialClauses: 'Mana jireenyaa Lakk. 334 gurguruu, gatii fuudhuu, fi nagahee kennuuf aangoo guutuu kenna.',
      },
    },
    {
      id: 'loan_agreement',
      category: 'loan',
      title: {
        om: 'Waliigaltee Liqii fi Wabummaa (Loan with Guarantor)',
        am: 'የብድር እና የዋስትና ውል',
        en: 'Loan Agreement with Personal Guarantor',
      },
      description: {
        om: 'Namoota dhuunfaa gidduutti liqii birrii kaffalamuu fi dirqama wabiin of keessatti qabata.',
        am: 'የተበዳሪ፣ አበዳሪ እና የዋስ ግዴታን የሚያካትት የብድር ስምምነት።',
        en: 'Personal debt obligation with enforceable personal guarantee clauses.',
      },
      lawBasis: 'Koodii Siivilii K. 2471 & K. 1920 (Loan & Suretyship)',
      keyLegalRequirements: {
        om: [
          'Liqiin birrii 500 caalu barreeffamaan mirkanaa\'uu qaba (K. 2472).',
          'Dhala seeraan eeyyamamu (Koodii Siivilii K. 2479 bu\'uuraan hanga %9 yookiin seera baankii).',
          'Dirqamni wabii ifatti barreeffamuu fi mallatteeffamuu qaba (K. 1922).',
        ],
        am: [
          'ከ500 ብር በላይ የሆነ የገንዘብ ብድር በጽሁፍ መረጋገጥ አለበት (አንቀጽ 2472)።',
          'የወለድ መጠን በፍትሐብሔር ሕግ አንቀጽ 2479 መሰረት ከ9% መብለጥ የለበትም (የባንክ ካልሆነ)።',
          'የዋስትና ግዴታ በግልጽ በጽሁፍ ተለይቶ መፈረም አለበት (አንቀጽ 1922)።',
        ],
        en: [
          'Loans exceeding 500 ETB must be proved by written instrument (Civil Code Art. 2472).',
          'Maximum statutory legal interest between non-bank individuals is capped at 9% per annum (Art. 2479).',
          'Suretyship (personal guarantee) cannot exceed the liability of the principal debtor (Art. 1922).',
        ],
      },
      suggestedQuestions: {
        om: [
          'Dhala %9 ol waliigaluun seeraan alaa (Usury)? Koodii Siiviliin maali jedha?',
          'Liqeessaan qabeenya liqeeffataa qabachuu dura wabiirraa kaffaltii gaafachuu ni danda\'aa?',
          'Waliigalteen liqii kun DARA biratti galmaa\'uun dirqamaa?',
          'Yeroon daangaa himannaa (limitation of action) liqii waggaa meeqa?',
        ],
        am: [
          'በግለሰቦች መካከል ከ9% በላይ ወለድ መዋዋል በሕጉ ተቀባይነት አለው ወይስ ዋጋ ቢስ ነው?',
          'አበዳሪው ከተበዳሪው በፊት በቀጥታ ዋሱን ከሶ ገንዘቡን ማስከፈል ይችላል?',
          'የብድር ውል በሰነዶች ማረጋገጫ መመዝገብ ግዴታ ነው ወይስ በሁለት ምስክሮች በቂ ነው?',
          'ያልተከፈለ ብድርን በፍርድ ቤት ለመጠየቅ ያለው የይርጋ ጊዜ (Limitation period) ስንት ዓመት ነው?',
        ],
        en: [
          'Is an interest rate exceeding 9% per annum between private individuals legally void under Art. 2479?',
          'Can the creditor sue the guarantor directly without first exhausting remedies against debtor (Art. 1934)?',
          'Does this loan agreement require authentication at DARA to be admissible as court evidence?',
          'What is the statutory limitation period for recovery of contractual debts under Ethiopian Civil Code?',
        ],
      },
      defaultValues: {
        partyA: 'Obbo Daawwit Mokonnon (Liqeessaa)',
        partyB: 'Obbo Caalaa Dinquu (Liqeeffataa) fi Obbo Gammachis (Wabii)',
        amount: '150,000 ETB (Kaffaltiin baankii qofaan)',
        durationOrDate: 'Ji\'a 6 keessatti (Dhuma 30/08/2016 B.A.)',
        location: 'Hawaasaa, Naannoo Sidaamaa',
        specialClauses: 'Yoo yeroon darbe adabbiin %5 ji\'atti ni shallagama. Wabiin dirqama liqeeffataa guutummaatti qooddata.',
      },
    },
    {
      id: 'court_pleading_dismissal',
      category: 'pleadings',
      title: {
        om: 'Himata Mana Murtii: Hojiirraa Ari\'amuu (Statement of Claim)',
        am: 'የፍርድ ቤት ክስ አቤቱታ (ያለአግባብ ስንብት)',
        en: 'Statement of Claim: Unlawful Dismissal',
      },
      description: {
        om: 'Labsii 1156/2019 K.43 bu\'uura godhachuun beenyaa fi kaffaltii addaan kutuu gaafata.',
        am: 'ያለአግባብ ከስራ ለተሰናበተ ሰራተኛ የካሳ እና የአገልግሎት ክፍያ ጥያቄ ክስ።',
        en: 'Pleading claiming severance, notice pay, and damages for unfair dismissal.',
      },
      lawBasis: 'Labsii 1156/2019 K. 43 & Koodii Falmii Siivilii',
      keyLegalRequirements: {
        om: [
          'Koodii Falmii Siivilii keeyyata 222-224 (Pleading formal format).',
          'Murtii Dhaddacha Ijoo Mana Murtii Waliigalaa Federaalaa Lakk. 55643.',
          'Himanni guyyaa ari\'ame irraa eegalee ji\'a 3 keessatti dhiyaachuu qaba (K. 162).',
        ],
        am: [
          'የፍትሐብሔር ስነ-ስርዓት ሕግ ቁጥር 222-224 (የክስ አቀራረብ ፎርማት)።',
          'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት ውሳኔ ቅጽ 12 መ/ቁ 55643።',
          'ክሱ ከተሰናበተበት ቀን ጀምሮ በ3 ወራት ውስጥ መቅረብ አለበት (አንቀጽ 162)።',
        ],
        en: [
          'Civil Procedure Code Arts. 222-224 statutory statement of claim formatting.',
          'Federal Supreme Court Cassation Division binding precedent on back-pay & severance.',
          'Limitation period of 3 months from date of unlawful termination (Procl. 1156/2019 Art. 162).',
        ],
      },
      suggestedQuestions: {
        om: [
          'Hojiirraa seeraan ala ari\'amuuf beenyaan shallagamu akkamitti (Mindaa ji\'a meeqaa)?',
          'Kaffaltiin addaan kutuu (severance pay) tajaajila waggaa waggaaf akkamitti shallagama?',
          'Himata mana murtii dhiyeeffachuuf yeroon daangaa (limitation period) meeqa?',
          'Murtiin Dhaddacha Ijoo Mana Murtii Waliigalaa dhimma kanarratti maali?',
        ],
        am: [
          'ያለአግባብ ከስራ የመሰናበት የካሳ መጠን በአዋጅ 1156/2011 መሰረት እንዴት ይሰላል (የስንት ወር ደመወዝ)?',
          'የአገልግሎት ክፍያ (Severance Pay) ለእያንዳንዱ የስራ ዓመት እንዴት ነው የሚሰላው?',
          'ክስ ወደ ፍርድ ቤት ለማቅረብ ያለው የጊዜ ገደብ (ይርጋ) ስንት ወራት ነው?',
          'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት አስገዳጅ የሕግ ትርጉም በዚህ ላይ ምን ይላል?',
        ],
        en: [
          'How is severance pay and compensation calculated under Labor Proclamation 1156/2019 Art. 40 & 43?',
          'Can an unfairly dismissed employee demand reinstatement to their original job?',
          'What is the strict 3-month limitation period under Art. 162 and how does it bar claims?',
          'What binding interpretations have the Federal Cassation Division issued regarding severance pay?',
        ],
      },
      defaultValues: {
        partyA: 'Obbo Alamaayyoo Qajeelaa (Himataa)',
        partyB: 'Dhaabbata Daldalaa ABC (Himataamaa)',
        amount: 'Gatii beenyaa fi kaffaltii waliigalaa 95,000 ETB',
        durationOrDate: 'Guyyaa hojiirraa ari\'ame: 10/04/2016 B.A.',
        location: 'Mana Murtii Jalqabaa Federaalaa Dhaddacha Hojjetaa',
        specialClauses: 'Mindaa ji\'a sadii beenyaa seeraan alaa fi kaffaltii addaan kutuu waggaa 4 tajaajilaaf ni gaafata.',
      },
    },
    {
      id: 'legal_brief_standard',
      category: 'pleadings',
      title: {
        om: 'Waraqaa Gabaabaa Seeraa (Legal Brief)',
        am: 'የሕግ አጭር መግለጫ (Legal Brief)',
        en: 'Standard Legal Brief',
      },
      description: {
        om: 'Falmiiwwan seeraa, xiinxala ragaalee, fi deebii seeraa qopheessuuf.',
        am: 'የሕግ ክርክሮችን፣ የማስረጃ ትንተናዎችን እና የሕግ መልሶችን ለማዘጋጀት።',
        en: 'For preparing legal arguments, evidence analysis, and legal prayers for relief.',
      },
      lawBasis: 'CPC Art. 222-224 & CPC Art. 82',
      keyLegalRequirements: {
        om: [
          'Qabxiilee falmii (Issues of Fact/Law) ifa ta\'uu qaba.',
          'Xiinxala seeraa (Legal Analysis) ragaan deeggaramuu qaba.',
          'Guduunfaa fi Gaaffii (Prayer for Relief) xumura irratti barreeffama.',
        ],
        am: [
          'የክርክር ነጥቦች (የሐቅ እና የሕግ) ግልጽ መሆን አለባቸው።',
          'የሕግ ትንተና በማስረጃ የተደገፈ መሆን አለበት።',
          'መደምደሚያ እና ዳኝነት (Prayer for Relief) መጨረሻ ላይ መገለጽ አለበት።',
        ],
        en: [
          'Clear formulation of Issues of Fact and Law.',
          'Legal analysis grounded in relevant statutes and precedents.',
          'Specific Prayer for Relief or final request to the court.',
        ],
      },
      suggestedQuestions: {
        om: [
          'Dhimma kana irratti ragaan namaa fi sanadaa akkamitti qindaa\'a?',
          'Xiinxalli seeraa Labsii 1156/2019 waliin akkamitti wal simata?',
          'Murtiiwwan Dhaddacha Ijibbaataa dhimma kanaaf rogummaa qaban maal fa\'a?',
        ],
        am: [
          'በዚህ ጉዳይ ላይ የሰው እና የሰነድ ማስረጃዎች እንዴት ይደራጃሉ?',
          'የሕግ ትንተናው ከአዋጅ 1156/2011 ጋር እንዴት ይጣጣማል?',
          'ለዚህ ጉዳይ ተዛማጅነት ያላቸው የሰበር ውሳኔዎች የትኞቹ ናቸው?',
        ],
        en: [
          'How should oral and documentary evidence be organized in the brief?',
          'How does the legal analysis align with Proclamation 1156/2019?',
          'What binding Cassation precedents are applicable to this case brief?',
        ],
      },
      defaultValues: {
        partyA: 'Obbo/Aadde [Maqaa Himataa/Petitioner]',
        partyB: 'Obbo/Aadde [Maqaa Himatamaa/Respondent]',
        amount: '[Gatii Dhimmaa / Claim Value]',
        durationOrDate: 'Lakk. Galmee: [Case No] / Guyyaa Beellamaa: [Date]',
        location: 'Mana Murtii [Court Name] / Dhaddacha [Bench]',
        specialClauses: 'CASE ARGUMENTS: [Enter factual arguments here]\n\nLEGAL ANALYSIS: [Statutory analysis and precedent citations]\n\nPRAYER FOR RELIEF: [Final request to the court]',
      },
    },
    {
      id: 'legal_brief_comprehensive',
      category: 'pleadings',
      title: {
        om: 'Bifa Guutuu: Waraqaa Gabaabaa Seeraa',
        am: 'የተሟላ የሕግ አጭር መግለጫ (Comprehensive Brief)',
        en: 'Comprehensive Legal Case Brief',
      },
      description: {
        om: 'Qabxii falmii, xiinxala seeraa fi gaaffii xumuraa (prayer) bal\'inaan qopheessuuf.',
        am: 'የክርክር ነጥቦችን፣ የሕግ ትንተናን እና የዳኝነት ጥያቄን በዝርዝር ለማዘጋጀት የሚረዳ።',
        en: 'Detailed generator for case arguments, deep legal analysis, and prayer for relief.',
      },
      lawBasis: 'Ethiopian Civil Procedure Code & Cassation Rules',
      keyLegalRequirements: {
        om: [
          'Ibsa gabaabaa dhimmaa (Brief Statement of Case).',
          'Xiinxala seeraa labsii fi murtii dhaddacha ijootiin deeggarame.',
          'Gaaffii qulqulluu (Clear Prayer for Relief).',
        ],
        am: [
          'የጉዳዩ አጭር መግለጫ (Brief Statement of Case)።',
          'በአዋጅ እና በሰበር ውሳኔዎች የተደገፈ የሕግ ትንተና።',
          'ግልጽ የዳኝነት ጥያቄ (Clear Prayer for Relief)።',
        ],
        en: [
          'Brief statement of the case facts.',
          'Legal analysis citing specific proclamations and cassation precedents.',
          'Precise and clear prayer for relief.',
        ],
      },
      suggestedQuestions: {
        om: [
          'Dhimma kanaan wal qabatee murtiiwwan Dhaddacha Ijibbaataa ammayyaa kam fa\'atu jiru?',
          'Xiinxalli seeraa Heera Mootummaa waliin akkamitti walitti hidhama?',
        ],
        am: [
          'ከዚህ ጉዳይ ጋር በተያያዘ የቅርብ ጊዜ የሰበር ውሳኔዎች የትኞቹ ናቸው?',
          'የሕግ ትንተናው ከሕገ-መንግሥቱ ጋር እንዴት ይገናኛል?',
        ],
        en: [
          'What are the latest binding cassation rulings for this type of dispute?',
          'How should the prayer for relief be structured for alternative remedies?',
        ],
      },
      defaultValues: {
        partyA: 'Obbo/Aadde [Maqaa Himataa/Petitioner]',
        partyB: 'Obbo/Aadde [Maqaa Himatamaa/Respondent]',
        amount: '[Gatii Dhimmaa / Claim Value]',
        durationOrDate: 'Lakk. Galmee: [Case No]',
        location: 'Mana Murtii [Court Name]',
        specialClauses: 'CASE ARGUMENTS: [Summarize the factual background and main arguments here]\n\nLEGAL ANALYSIS: [Analyze relevant statutory provisions and cite specific Cassation Division file numbers]\n\nPRAYER FOR RELIEF: [Clearly state the specific orders or judgments requested from the court]',
      },
    },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition>(templates[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTabMode, setActiveTabMode] = useState<'draft' | 'qa_counsel' | 'statutory_rules'>('draft');
  const [formData, setFormData] = useState(templates[0].defaultValues);
  const [selectedLangs, setSelectedLangs] = useState<Language[]>([currentLang]);
  const [modelTier, setModelTier] = useState<string>('gemini-flash-lite-latest');

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<GenerateResponse | null>(null);

  // Automated CourtFeeCalculator state (Oromia 2015 Regulation)
  const { profile } = useAuth();
  const isPremiumUser = Boolean(profile?.subscriptionPlan === 'unlimited' || profile?.subscriptionPlan === 'pro' || profile?.isPremium === true);
  const [showTemplateFeeCalc, setShowTemplateFeeCalc] = useState(false);
  const [templateCourtFee, setTemplateCourtFee] = useState<CourtFeeCalculationResult | null>(() => {
    return calculateOromiaCourtFee({
      claimCategory: 'monetary',
      courtLevel: 'first_instance',
      claimAmountETB: 95000,
      isPremiumUser: Boolean(profile?.subscriptionPlan === 'unlimited' || profile?.subscriptionPlan === 'pro' || profile?.isPremium === true),
    });
  });

  const handleSelectTemplate = (tmpl: TemplateDefinition) => {
    setSelectedTemplate(tmpl);
    setFormData(tmpl.defaultValues);
    setGeneratedDoc(null);
    setError(null);
    // Auto-update court fee calculation according to template category
    if (tmpl.category === 'pleadings') {
      setTemplateCourtFee(
        calculateOromiaCourtFee({
          claimCategory: 'monetary',
          courtLevel: 'first_instance',
          claimAmountETB: 95000,
          isPremiumUser,
        })
      );
    }
  };

  const handleAutofillGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    let promptText = `TASK: Generate a legally binding, complete, and exhaustive Ethiopian legal document using this statutory template:
TEMPLATE: ${selectedTemplate.title.en} (${selectedTemplate.lawBasis})

PARTIES & STATUTORY PARTICULARS:
- Party A (First Party): ${formData.partyA}
- Party B (Second Party): ${formData.partyB}
- Financial Terms / Consideration: ${formData.amount}
- Duration / Effective Date / Timelines: ${formData.durationOrDate}
- Execution Jurisdiction & Location: ${formData.location}
- Mandatory Statutory Clauses & Special Terms: ${formData.specialClauses}

LEGAL DRAFTING REQUIREMENTS:
1. Include full formal recitals, party capacities, consideration, obligations, termination events, dispute resolution (courts / arbitration), and execution signature blocks.
2. Strictly comply with ${selectedTemplate.lawBasis}.
3. Draft with professional legal precision without placeholders.`;

    if (templateCourtFee && (selectedTemplate.category === 'pleadings' || Boolean(formData.amount))) {
      promptText += `\n\nOFFICIAL STATUTORY COURT FILING FEE SCHEDULE (DAMBII BARA 2015):\n` +
        `- Sadarkaa Mana Murtii: ${templateCourtFee.courtLevelName}\n` +
        `- Gosa Dhimmaa: ${templateCourtFee.claimCategory}\n` +
        `- Gatii Dhimmaa: ${templateCourtFee.claimAmountETB.toLocaleString()} ETB\n` +
        `- Kaffaltii Mootummaa (Statutory Fee): ${templateCourtFee.totalGovernmentFee.toLocaleString()} ETB ${templateCourtFee.isExempt ? `(Dhiifama Seeraa %100: ${templateCourtFee.exemptionReason})` : ''}\n` +
        `- Kaffaltii Platformii: ${isPremiumUser ? '0 ETB (Premium Waived)' : `${templateCourtFee.standardPlatformProcessingFee} ETB`}\n` +
        `- Waliigala Kaffaltii: ${(isPremiumUser ? templateCourtFee.premiumUserTotal : templateCourtFee.standardUserTotal).toLocaleString()} ETB\n` +
        `- Bu'uura Seeraa: Dambii Kaffaltii Tajaajila Abbaa Seerummaa Manneen Murtii Mootummaa Naannoo Oromiyaa Bara 2015/2016.\n` +
        `Include a formal section detailing the statutory court fee assessed for filing this legal claim.`;
    }

    try {
      const response = await generateLegalContent({
        prompt: promptText,
        taskType: 'contract',
        outputLanguages: selectedLangs,
        modelTier: modelTier as any,
      });

      setGeneratedDoc(response);
    } catch (e: any) {
      setError(e.message || 'Waliigaltee uumuun hin milkoofne.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleLanguage = (lang: Language) => {
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length === 1) return;
      setSelectedLangs(selectedLangs.filter((l) => l !== lang));
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <FileCheck className="w-7 h-7 text-amber-400" />
            </div>
            <span>Sanadoota Fakkeenyaa & Qophaa'an (Document Templates)</span>
          </h1>
          <p className="mt-1 text-slate-400 text-xs sm:text-sm">
            Waliigalteewwan hojii, kireeffannaa, bakka bu'ummaa, liqii, fi himata mana murtii seera Itoophiyaa bu'uureffachuun battalatti uumadhaa, gaaffii seeraa gaafadhaa.
          </p>
        </div>

        {/* View Mode Tabs: Draft Contract vs. Legal Q&A Counsel vs. Statutory Rules */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTabMode('draft')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'draft'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Sanada Uumi (Draft)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('qa_counsel')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'qa_counsel'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Gaaffii Seeraa (Legal Q&A)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('statutory_rules')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'statutory_rules'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Ulaagaalee Seeraa (Rules)</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Hunda (All Templates)' },
          { id: 'employment', label: '💼 Hojii (Employment)' },
          { id: 'lease', label: '🏠 Kireeffannaa (Lease)' },
          { id: 'powerOfAttorney', label: '📜 Bakka Bu\'ummaa (POA)' },
          { id: 'loan', label: '💰 Liqii (Loan)' },
          { id: 'pleadings', label: '⚖️ Himata (Court Claim)' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* MODE 1: DRAFT & CUSTOMIZE TEMPLATE */}
      {activeTabMode === 'draft' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Template Selection & Autofill Form */}
          <div className="lg:col-span-5 space-y-5">
            {/* Template Cards List */}
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {filteredTemplates.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/50 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold">
                        {tmpl.title[currentLang] || tmpl.title.om}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-amber-400 font-semibold border border-slate-700 shrink-0">
                        {tmpl.lawBasis}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {tmpl.description[currentLang] || tmpl.description.om}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Autofill Parameters Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Odeeffannoo Waliigaltee (Autofill Particulars)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{selectedTemplate.lawBasis}</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Qaama 1ffaa (First Party / Employer / Landlord / Creditor):
                  </label>
                  <input
                    type="text"
                    value={formData.partyA}
                    onChange={(e) => setFormData({ ...formData, partyA: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Qaama 2ffaa (Second Party / Employee / Tenant / Borrower):
                  </label>
                  <input
                    type="text"
                    value={formData.partyB}
                    onChange={(e) => setFormData({ ...formData, partyB: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Gatii / Mindaa / Liqii:
                    </label>
                    <input
                      type="text"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Bakka Hojii / Magaalaa:
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Yeroo / Guyyaa Waliigaltee:
                  </label>
                  <input
                    type="text"
                    value={formData.durationOrDate}
                    onChange={(e) => setFormData({ ...formData, durationOrDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    {selectedTemplate.id === 'legal_brief_comprehensive' ? 'Qabxiilee Falmii (Case Arguments):' : 'Uulaagaalee Addaa fi Keeyyattoota (Special Terms):'}
                  </label>
                  {selectedTemplate.id === 'legal_brief_comprehensive' ? (
                    <div className="space-y-3">
                      <textarea
                        value={formData.specialClauses.split('\n\nLEGAL ANALYSIS:')[0].replace('CASE ARGUMENTS: ', '')}
                        onChange={(e) => {
                          const parts = formData.specialClauses.split('\n\nLEGAL ANALYSIS:');
                          const analysisAndPrayer = parts[1] || '';
                          setFormData({ ...formData, specialClauses: `CASE ARGUMENTS: ${e.target.value}\n\nLEGAL ANALYSIS:${analysisAndPrayer}` });
                        }}
                        placeholder="Factual arguments..."
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
                      />
                      
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Xiinxala Seeraa (Legal Analysis):</label>
                      <textarea
                        value={(formData.specialClauses.split('\n\nLEGAL ANALYSIS:')[1] || '').split('\n\nPRAYER FOR RELIEF:')[0]}
                        onChange={(e) => {
                          const parts = formData.specialClauses.split('\n\nLEGAL ANALYSIS:');
                          const prayer = (parts[1] || '').split('\n\nPRAYER FOR RELIEF:')[1] || '';
                          setFormData({ ...formData, specialClauses: `${parts[0]}\n\nLEGAL ANALYSIS: ${e.target.value}\n\nPRAYER FOR RELIEF: ${prayer}` });
                        }}
                        placeholder="Statutory analysis..."
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
                      />

                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Gaaffii Xumuraa (Prayer for Relief):</label>
                      <textarea
                        value={formData.specialClauses.split('\n\nPRAYER FOR RELIEF: ')[1] || ''}
                        onChange={(e) => {
                          const mainPart = formData.specialClauses.split('\n\nPRAYER FOR RELIEF:')[0];
                          setFormData({ ...formData, specialClauses: `${mainPart}\n\nPRAYER FOR RELIEF: ${e.target.value}` });
                        }}
                        placeholder="Final request..."
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
                      />
                    </div>
                  ) : (
                    <textarea
                      value={formData.specialClauses}
                      onChange={(e) => setFormData({ ...formData, specialClauses: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/70"
                    />
                  )}
                </div>
              </div>

              {/* Language Selector */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 block">
                  Afaan Sanadaa (Output Languages):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedLangs(['om', 'am', 'en'])}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                      selectedLangs.length === 3
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Afaanota Sadeen
                  </button>
                  {(['om', 'am', 'en'] as Language[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => toggleLanguage(l)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                        selectedLangs.includes(l)
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/70'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {l === 'om' ? 'Afaan Oromoo' : l === 'am' ? 'አማርኛ' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Automated Court Fee Filing Breakdown (Oromia 2015 Regulation) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Calculator className="w-4 h-4 text-amber-400" />
                    <span>Kaffaltii Abbaa Seerummaa (Oromia 2015 Regulation):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTemplateFeeCalc(!showTemplateFeeCalc)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-bold cursor-pointer transition-all"
                  >
                    {showTemplateFeeCalc ? 'Calculator Cufi' : 'Shallaggiitti Fayyadami ⚖️'}
                  </button>
                </div>

                {templateCourtFee && (
                  <div className="space-y-2 text-xs pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Kaffaltii Mootummaa ({templateCourtFee.courtLevelName}):</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {templateCourtFee.totalGovernmentFee.toLocaleString()} ETB
                      </span>
                    </div>

                    {templateCourtFee.isExempt && (
                      <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Dhiifama Seeraa (%100 Exempt): {templateCourtFee.exemptionReason}</span>
                      </div>
                    )}

                    {/* Dual User Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className={`p-2.5 rounded-xl border ${
                        !isPremiumUser 
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>Standard User:</span>
                          {!isPremiumUser && <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-black">YOUR TIER</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          +{templateCourtFee.standardPlatformProcessingFee} ETB Platform Fee
                        </div>
                        <div className="font-bold font-mono text-white text-xs mt-1">
                          {templateCourtFee.standardUserTotal.toLocaleString()} ETB
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${
                        isPremiumUser 
                          ? 'bg-purple-500/15 border-purple-500/50 text-purple-200' 
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="flex items-center gap-1 text-purple-300">
                            <Crown className="w-2.5 h-2.5 text-purple-400" />
                            <span>Premium User:</span>
                          </span>
                          {isPremiumUser && <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500 text-white font-black">YOUR TIER</span>}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                          0 ETB (%100 Waived)
                        </div>
                        <div className="font-bold font-mono text-purple-200 text-xs mt-1">
                          {templateCourtFee.premiumUserTotal.toLocaleString()} ETB
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Inline Expandable Court Fee Calculator */}
              {showTemplateFeeCalc && (
                <div className="pt-1 animate-in fade-in duration-300">
                  <CourtFeeCalculator
                    currentLang={currentLang}
                    initialAmount={templateCourtFee?.claimAmountETB || 95000}
                    initialCourtLevel={templateCourtFee?.courtLevel || 'first_instance'}
                    initialCategory={templateCourtFee?.claimCategory || 'monetary'}
                    onApplyFeeToDocument={(_, res) => {
                      setTemplateCourtFee(res);
                      setShowTemplateFeeCalc(false);
                    }}
                    onClose={() => setShowTemplateFeeCalc(false)}
                  />
                </div>
              )}

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleAutofillGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50 cursor-pointer min-h-[46px]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sanadicha Uumaa jira...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>WALIIGALTEE UUMI (GENERATE CONTRACT)</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Column: Generated Document OR Pre-Draft Template Insights + Interactive Q&A */}
          <div className="lg:col-span-7 space-y-6">
            {generatedDoc ? (
              <div className="space-y-6">
                <DocumentViewer
                  currentLang={currentLang}
                  content={generatedDoc.content}
                  separatedVersions={generatedDoc.separatedVersions}
                  outputLanguages={generatedDoc.outputLanguages}
                  title={selectedTemplate.title[currentLang] || selectedTemplate.title.om}
                  taskType="contract"
                  showQAPanel={true}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Template Statutory Overview Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Scale className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-100">
                          {selectedTemplate.title[currentLang] || selectedTemplate.title.om}
                        </h3>
                        <p className="text-xs text-amber-400 font-mono mt-0.5">
                          {selectedTemplate.lawBasis}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-300">
                      {selectedTemplate.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedTemplate.description[currentLang] || selectedTemplate.description.om}
                  </p>

                  {/* Statutory Requirements Checklist */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                      {currentLang === 'om'
                        ? 'Ulaagaalee Seeraa Dirqisiisoo (Mandatory Statutory Rules):'
                        : currentLang === 'am'
                        ? 'አስገዳጅ የሕግ መስፈርቶች:'
                        : 'Mandatory Legal Requirements:'}
                    </span>
                    <div className="space-y-1.5">
                      {(selectedTemplate.keyLegalRequirements[currentLang] || selectedTemplate.keyLegalRequirements.om).map(
                        (req, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{req}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Interactive Q&A Panel on this Template (BEFORE or DURING drafting) */}
                <DocumentQAPanel
                  templateContext={{
                    title: selectedTemplate.title.en,
                    lawBasis: selectedTemplate.lawBasis,
                    category: selectedTemplate.category,
                    formData,
                  }}
                  documentTitle={selectedTemplate.title[currentLang] || selectedTemplate.title.om}
                  currentLang={currentLang}
                  customSuggestedQuestions={
                    selectedTemplate.suggestedQuestions[currentLang] || selectedTemplate.suggestedQuestions.om
                  }
                  initiallyOpen={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: DEDICATED LEGAL Q&A CONSULTATION HUB */}
      {activeTabMode === 'qa_counsel' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                <Gavel className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Iddoo Gaaffii fi Qorannoo Seeraa Sanadootaa (Legal Consultation)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                    ONLINE
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Waliigalteewwan hojii, kireeffannaa, liqii, bakka bu'ummaa, fi himata mana murtii irratti gaaffii bu'uura seera Itoophiyaa qabu kamiyyuu gaafadhaa. Deebiin kennamu keeyyattoota seeraa fi murtee Dhaddacha Ijoo faana wal-simata.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTabMode('draft')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              ← Gara Sanada Uumuutti Deebi'i
            </button>
          </div>

          <DocumentQAPanel
            templateContext={{
              title: selectedTemplate.title.en,
              lawBasis: selectedTemplate.lawBasis,
              category: selectedTemplate.category,
              formData,
            }}
            documentText={generatedDoc ? generatedDoc.content : undefined}
            documentTitle={selectedTemplate.title[currentLang] || selectedTemplate.title.om}
            currentLang={currentLang}
            customSuggestedQuestions={
              selectedTemplate.suggestedQuestions[currentLang] || selectedTemplate.suggestedQuestions.om
            }
            initiallyOpen={true}
          />
        </div>
      )}

      {/* MODE 3: STATUTORY RULES & CHECKLIST */}
      {activeTabMode === 'statutory_rules' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span>Qajeelfama fi Ulaagaalee Seera Waliigaltee Itoophiyaa (Statutory Rules)</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Waliigalteen kamiyyuu bu'uura Koodii Siivilii Itoophiyaa bara 1960 keeyyata 1678 fi 1723 tiin seera qabeessa ta'uuf ulaagaalee armaan gadii guutuu qaba:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rule 1: Form & Authentication */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
                <FileCheck className="w-4 h-4 text-amber-400" />
                <span>1. Bifa Barreeffamaa & Mirkaneessa (Civil Code Art. 1723)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Waliigalteen qabeenya lafaa fi manaa (Immovable property), kireeffannaa waggaa tokkoo ol, bakka bu'ummaa addaa, fi dhaabbata mootummaa waliin ta'u hundi barreeffamaan ta'ee Waajjira Mirkaneessa Sanadootaa (DARA) duratti mirkanaa'uu qaba.
              </p>
              <div className="text-[11px] text-amber-400/90 font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                Hubachiisa: Waliigalteen mirkaneessa DARA malee godhame mana murtiitti fudhatama hin qabu (Void ab initio).
              </div>
            </div>

            {/* Rule 2: Competent Witnesses */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
                <Scale className="w-4 h-4 text-amber-400" />
                <span>2. Ragaalee Qulqulluu Lama (Civil Code Art. 1727)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Waliigalteen barreeffamaa kamiyyuu qaamolee waliigalan malees yoo xiqqaate ragaalee dandeettii seeraa guutuu qaban lamaan (two competent witnesses) mirkanaa'ee mallatteeffamuu qaba.
              </p>
              <div className="text-[11px] text-emerald-400/90 font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                Ragaan umurii waggaa 18 guutuu fi dandeettii seeraa qabaachuu qaba.
              </div>
            </div>

            {/* Rule 3: Labor Protections */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
                <Briefcase className="w-4 h-4 text-amber-400" />
                <span>3. Eegumsa Hojjetaa (Labor Proclamation 1156/2019)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Waliigalteen hojii ulaagaalee labsii hojjetaa fi hojjechiisaa 1156/2019 gadi ta'uu hin danda'u. Keeyyanni mirga hojjetaa seeraan eeyyamamu gadi godhu kamiyyuu seeraan fudhatama hin qabu (Null and Void).
              </p>
              <div className="text-[11px] text-amber-400/90 font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                Kaffaltiin beenyaa, boqonnaan waggaa, fi yeroon yaalii labsicha gadi ta'uu hin danda'u.
              </div>
            </div>

            {/* Rule 4: Interest Rate Limits */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>4. Daangaa Dhala Liqii (Civil Code Art. 2479)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Namoota dhuunfaa gidduutti dhalli liqii waggaatti dhibbeentaa %9 caalu seeraan alaa (Usurious and Void). Dhalli %9 ol kaffalame gara maallaqa bu'uuraatti (principal) herreegama.
              </p>
              <div className="text-[11px] text-emerald-400/90 font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                Baankota fi dhaabbata maaykiroo-faayinaansii qofatu heeyyama addaatiin dhala murteessa.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
