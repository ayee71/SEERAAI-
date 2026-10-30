import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Gavel, 
  Users, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Scale, 
  Folder, 
  Zap, 
  FileCheck, 
  Building2, 
  Printer, 
  Trash2,  Share2, 
  X, 
  ChevronRight, 
  BookOpen, 
  Award, 
  Sparkles, 
  ArrowRight,
  UserCheck,
  CreditCard,
  Send,
  Lock,
  Settings,
  Plus,
  Mail,
  Check,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { downloadCaseSummaryPDF } from '../services/caseSummaryService';

interface AanaaGurbichaECourtDashboardProps {
  currentLang: Language;
  onNavigateToModule?: (moduleName: string) => void;
}

export interface DetailedCourtCase {
  id: string;
  caseNumber: string;
  claimantName: string;
  respondentName: string;
  claimSubject: string;
  filingDate: string;
  status: 'haaraa' | 'adeemsa_irra' | 'mallatto_eegaa' | 'cufame' | 'oliyyata_irratti';
  priority: 'Ariifachiisaa' | 'Olaanaa' | 'Giddu-galeessa';
  assignedJudge: string;
  assignedLegalOfficer: string;
  benchName: string;
  courtLevel: string;
  category: 'Civil' | 'Criminal' | 'Land';
  
  // 1. Himannaa & Deebii (Statement of Claim & Defense)
  claimText: string;
  claimArticles: string;
  requestedRelief: string;
  defenseText: string;
  defenseArticles: string;
  
  // 2. Ragaalee & Sanadoota (Evidence & Exhibits)
  evidenceList: {
    id: string;
    title: string;
    type: string;
    providedBy: string;
    status: 'Verified' | 'Pending' | 'Rejected';
    sinqeeReceipt?: string;
  }[];
  
  // 3. Hojii Dhaddachaa & Jecha Ragaa (Courtroom Proceedings)
  proceedingsHistory: {
    date: string;
    sessionType: string;
    judgeNotes: string;
    witnessTestimony?: string;
    orderIssued: string;
  }[];
  
  // 4. Hojii Ofiisara Seeraa & Adeemsa Galmee (Legal Officer Workflow)
  legalOfficerChecklist: {
    task: string;
    status: 'Completed' | 'In Progress' | 'Pending';
    updatedBy: string;
    timestamp: string;
  }[];
  
  // 5. Hanga Murtiittii (Judgment Decision & Precedent)
  judgmentVerdict?: {
    verdictSummary: string;
    legalReasoning: string;
    cassationPrecedentRef: string;
    judgeSignature: string;
    stampSealCode: string;
    judgmentDate: string;
    isFinal: boolean;
  };

  // 6. Oliyyata (Appeal Tracking)
  appealInfo?: {
    appealCode: string;
    forwardedToCourt: string;
    forwardedDate: string;
    appealStatus: string;
  };
}

export interface EFilingApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  targetCourtAdminEmail: string; // e.g. gurbicha@gmail.com
  claimCategory: 'Civil' | 'Criminal' | 'Land';
  claimSubject: string;
  claimText: string;
  claimAmount: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  assignedCaseNumber?: string;
}

export interface CourtStaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'Ofiisara Seeraa' | 'Qindeessaa KTAS' | 'Abbaa Seeraa' | 'Admin Abbaa Seeraa';
  benchName: string;
  badgeNumber: string;
  status: 'Active' | 'On Leave' | 'Suspended';
  assignedCasesCount: number;
  addedAt: string;
}

export const INITIAL_GURBICHA_STAFF: CourtStaffMember[] = [
  {
    id: 'staff-1',
    fullName: 'Abbaa Seeraa Caalaa Tasfaayee',
    email: 'caalaa.judge@gurbicha.court.gov.et',
    phone: '+251 911 123456',
    role: 'Admin Abbaa Seeraa',
    benchName: 'Dhaddacha Hariiroo Hawaasaa 1ffaa',
    badgeNumber: 'MMA-GUR-JUDGE-01',
    status: 'Active',
    assignedCasesCount: 12,
    addedAt: '2026-01-10'
  },
  {
    id: 'staff-2',
    fullName: 'Ofiisara Seeraa Gadaa Toleeraa',
    email: 'gadaa.officer@gurbicha.court.gov.et',
    phone: '+251 912 234567',
    role: 'Ofiisara Seeraa',
    benchName: 'Dhaddacha Hariiroo Hawaasaa & Yakkaa',
    badgeNumber: 'MMA-GUR-OFFICER-01',
    status: 'Active',
    assignedCasesCount: 18,
    addedAt: '2026-01-15'
  },
  {
    id: 'staff-3',
    fullName: 'Aadde Boontuu Dabalaa',
    email: 'boontuu.ktas@gurbicha.court.gov.et',
    phone: '+251 913 345678',
    role: 'Qindeessaa KTAS',
    benchName: 'Kutaa Teknoolojii & Automation (KTAS)',
    badgeNumber: 'MMA-GUR-KTAS-01',
    status: 'Active',
    assignedCasesCount: 0,
    addedAt: '2026-01-20'
  },
  {
    id: 'staff-4',
    fullName: 'Abbaa Seeraa Geetaachoo Toleeraa',
    email: 'geetaachoo.judge@gurbicha.court.gov.et',
    phone: '+251 914 456789',
    role: 'Abbaa Seeraa',
    benchName: 'Dhaddacha Yakkaa Aanaa',
    badgeNumber: 'MMA-GUR-JUDGE-02',
    status: 'Active',
    assignedCasesCount: 8,
    addedAt: '2026-02-01'
  },
  {
    id: 'staff-5',
    fullName: 'Ofiisara Seeraa Tolasaa Firoomsaa',
    email: 'tolasaa.officer@gurbicha.court.gov.et',
    phone: '+251 915 567890',
    role: 'Ofiisara Seeraa',
    benchName: 'Dhaddacha Lafa & Maatii',
    badgeNumber: 'MMA-GUR-OFFICER-02',
    status: 'Active',
    assignedCasesCount: 14,
    addedAt: '2026-02-05'
  }
];

export interface CaseLogicAuditResult {
  caseId: string;
  caseNumber: string;
  auditTimestamp: string;
  proceduralCompletenessScore: number;
  status: 'Sawaabaa (Passed)' | 'Gorsa/Akeekkachiisa (Warnings Found)' | 'Dogoggora Cimaa (Critical Discrepancies)';
  missingDocuments: {
    docType: string;
    description: string;
    mandatoryForCategory: string;
    severity: 'High' | 'Medium' | 'Low';
    suggestedAction: string;
  }[];
  statutoryContradictions: {
    ruleOrArticle: string;
    issueTitle: string;
    detail: string;
    sourceCode: string;
    severity: 'Critical' | 'Warning' | 'Info';
  }[];
  judicialRecommendations: string[];
}

export const runCaseLogicAudit = (c: DetailedCourtCase): CaseLogicAuditResult => {
  const missingDocuments: CaseLogicAuditResult['missingDocuments'] = [];
  const statutoryContradictions: CaseLogicAuditResult['statutoryContradictions'] = [];
  const judicialRecommendations: string[] = [];

  let score = 100;

  // 1. Category Specific Procedural Requirements
  if (c.category === 'Civil') {
    const hasSinqee = c.evidenceList.some(e => e.sinqeeReceipt || e.title.toLowerCase().includes('sinqee') || e.type.toLowerCase().includes('receipt'));
    if (!hasSinqee) {
      score -= 15;
      missingDocuments.push({
        docType: 'Nagahee Baankii Sinqee / Kaffaltii Durso',
        description: 'Kaffaltii tajaajila abbaa seerummaa Baankii Sinqee mirkaneessuun SDFHH Kwt 222 bu\'uuraan dirqama.',
        mandatoryForCategory: 'Hariiroo Hawaasaa (Civil)',
        severity: 'High',
        suggestedAction: 'Himataan nagahee kaffaltii Baankii Sinqee guyyaa 5 keessatti akka dhiyeessu ajaji.'
      });
    }

    if (!c.defenseText || c.defenseText.includes('eeggataa jira')) {
      score -= 10;
      missingDocuments.push({
        docType: 'Deebii Himatamaa (Statement of Defense)',
        description: 'Deebiin himatamaa barreeffamaan dhiyaachuu dhabuun SDFHH Kwt 234 fi 245 waliin wal-faallessa.',
        mandatoryForCategory: 'Hariiroo Hawaasaa (Civil)',
        severity: 'Medium',
        suggestedAction: 'Himatamaan deebii isaa akka dhiyeessu waamichi lammataa akka ergamee mirkaneessi.'
      });
    }

    if (c.claimSubject.toLowerCase().includes('mana') || c.claimSubject.toLowerCase().includes('qabeenya')) {
      if (!c.claimArticles.includes('2872') && !c.claimArticles.includes('1731')) {
        statutoryContradictions.push({
          ruleOrArticle: 'Seera Hariiroo Hawaasaa Kwt 2872 & 1731',
          issueTitle: 'Qorannoo Seera-qabeessummaa Waliigaltee Manaa',
          detail: 'Falmiin waliigaltee gurgurtaa manaa fi qabeenya dhaabbataa dhabamsiisa qabiyyeetiif waraqaa ragaa abbaa qabiyyummaa mirkanaa\'e (Authentic Form) gaafata.',
          sourceCode: 'SHH Kwt 2872',
          severity: 'Warning'
        });
      }
    }
  }

  if (c.category === 'Criminal') {
    const hasPoliceReport = c.evidenceList.some(e => e.type === 'Police Report' || e.title.toLowerCase().includes('police') || e.title.toLowerCase().includes('qorannoo'));
    if (!hasPoliceReport) {
      score -= 25;
      missingDocuments.push({
        docType: 'Gabaasa Qorannoo Poolisii (Police Dossier)',
        description: 'Galmee yakkaa keessatti gabaasni qorannoo poolisii guutuun dhiyaachuu dhabuun SYAH Kwt 109 cabsa.',
        mandatoryForCategory: 'Yakka (Criminal)',
        severity: 'High',
        suggestedAction: 'Waajjira Poolisii Aanaatiif xalayaa ariifachiisaa erguun galmeen qorannoo akka dhihaatu ajaji.'
      });
    }

    const hasWitnessList = c.evidenceList.some(e => e.type === 'Witness Deposition' || e.title.toLowerCase().includes('ragaa'));
    if (!hasWitnessList) {
      score -= 15;
      missingDocuments.push({
        docType: 'Tarree Ragaa Ijaa fi Jecha Ragaa (Witness List)',
        description: 'Tarreen ragaa Abbaa Alangaa ykn Himatamaa galmeetti hin qabatamne.',
        mandatoryForCategory: 'Yakka (Criminal)',
        severity: 'Medium',
        suggestedAction: 'Abbaan Alangaa tarree ragaa ijaa galmee waliin akka dhiyeessu ajaji.'
      });
    }

    if (c.defenseArticles.includes('19')) {
      statutoryContradictions.push({
        ruleOrArticle: 'Heera Mootummaa FDRI Kwt 19 (Mirga Shakkamaa)',
        issueTitle: 'Mormii Seera-ala Qabamuu Ragaa',
        detail: 'Himatamaan ragaan poolisiitiin qabame seeraan ala jechuun mormii kaasee jira. Dhaddachi mormii kana dura qoratee ajaja kennuu qaba.',
        sourceCode: 'Heera FDRI Kwt 19(5)',
        severity: 'Critical'
      });
    }
  }

  if (c.category === 'Land') {
    const hasLandCert = c.evidenceList.some(e => e.type === 'Land Certificate' || e.title.toLowerCase().includes('lafa') || e.title.toLowerCase().includes('qabiyye'));
    if (!hasLandCert) {
      score -= 20;
      missingDocuments.push({
        docType: 'Waraqaa Ragaa Qabiyye Lafa Baadiyyaa',
        description: 'Falmii lafa qonnaa fi dhaalaa keessatti waraqaan ragaa qabiyye lafaa Dambii Lakk. 151/2005 bu\'uureffatee galmeetti dhiyaachuu qaba.',
        mandatoryForCategory: 'Lafa & Maatii (Land)',
        severity: 'High',
        suggestedAction: 'Waajjira Lafa Aanaa Gurbichaa irraa waraqaa ragaa fi gabaasa safaraa gaafadhu.'
      });
    }

    const hasSurveyReport = c.evidenceList.some(e => e.title.toLowerCase().includes('safara') || e.title.toLowerCase().includes('daangaa'));
    if (!hasSurveyReport) {
      score -= 10;
      missingDocuments.push({
        docType: 'Gabaasa Qorannoo Safeessa Daangaa Lafa Qonnaa',
        description: 'Gabaasni ogeessa safara lafaa daangaa qabatamaa agarsiisu galmeetti hin qabatamne.',
        mandatoryForCategory: 'Lafa & Maatii (Land)',
        severity: 'Medium',
        suggestedAction: 'Ogeessi safara lafaa Aanaa gabaasa qorannoo daangaa akka dhiyeessu beellama kenni.'
      });
    }
  }

  if (c.defenseArticles && c.defenseArticles.includes('244')) {
    statutoryContradictions.push({
      ruleOrArticle: 'SDFHH Kwt 244(1)(a) - Mormii Sadarkaa Duraa',
      issueTitle: 'Mormii Sadarkaa Duraa Aangoo fi Yeroo Darbiinsaa',
      detail: 'Himatamaan mormii sadarkaa duraa (Aangoo Mana Murtii / Yeroo Darbiinsaa) kaasee jira. Dhaddachi osoo gara dhimma ijoo (Merits of Case) hin darbiniin mormii kana irratti ajaja kennuu qaba.',
      sourceCode: 'SDFHH Kwt 245',
      severity: 'Critical'
    });
  }

  const pendingEv = c.evidenceList.filter(e => e.status === 'Pending');
  if (pendingEv.length > 0) {
    score -= (pendingEv.length * 5);
    statutoryContradictions.push({
      ruleOrArticle: 'Seera Ragaa & SDFHH Kwt 223',
      issueTitle: 'Ragaalee Mirkanaa\'uu Eeggatan',
      detail: `Ragaaleen ${pendingEv.length} ('${pendingEv.map(e => e.title).join(', ')}') sadarkaa 'Pending' irratti argamu. Murtii kennuu dura ragaaleen kun mirkanaa'uu ykn kufaa ta'uu qabu.`,
      sourceCode: 'Seera Ragaa Art 137',
      severity: 'Info'
    });
  }

  if (score >= 90) {
    judicialRecommendations.push('✅ Galmeen loojikii seeraa fi procedural completeness gahaa qaba. Dhaddachatti murteessuuf qophiidha.');
  } else if (score >= 70) {
    judicialRecommendations.push('⚠️ Sanadoota hir\'atan (Missing Documents) dhiyeessisuuf ajaja manaa murtii ergi.');
    judicialRecommendations.push('⚖️ Mormii sadarkaa duraa (SDFHH Art 244) dhihaate irratti dursee ajaja kenni.');
  } else {
    judicialRecommendations.push('🚨 Galmee kana irratti hanqinni sanadaa fi kontradikshiiniin seeraa cimaan waan jiruuf, beellama dabalataa kennuun qorannoo qulqullinaa raawwadhu.');
    judicialRecommendations.push('📩 Waamicha lammataa fi xalayaa mirkaneessa Baankii/Poolisii ergi.');
  }

  const finalScore = Math.max(30, Math.min(100, score));
  const status = finalScore >= 90 ? 'Sawaabaa (Passed)' : finalScore >= 70 ? 'Gorsa/Akeekkachiisa (Warnings Found)' : 'Dogoggora Cimaa (Critical Discrepancies)';

  return {
    caseId: c.id,
    caseNumber: c.caseNumber,
    auditTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    proceduralCompletenessScore: finalScore,
    status,
    missingDocuments,
    statutoryContradictions,
    judicialRecommendations
  };
};

const DEMO_GURBICHA_CASES: DetailedCourtCase[] = [
  {
    id: 'case-001',
    caseNumber: 'MMA-GUR/001/2026',
    claimantName: 'Obbo Araarsaa Magarsaa',
    respondentName: 'Aadde Boontuu Firoomsaa',
    claimSubject: 'Falmii Waliigaltee Gurgurtaa Manaa & Qabeenyaa',
    filingDate: '2026-02-10',
    status: 'adeemsa_irra',
    priority: 'Ariifachiisaa',
    assignedJudge: 'Abbaa Seeraa Caalaa Tasfaayee',
    assignedLegalOfficer: 'Ofiisara Seeraa Gadaa Toleeraa',
    benchName: 'Dhaddacha Hariiroo Hawaasaa 1ffaa',
    courtLevel: 'Mana Murtii Aanaa Gurbicha',
    category: 'Civil',
    
    claimText: 'Himataan obbo Araarsaa Magarsaa waliigaltee gurgurtaa manaa guyyaa 2025-05-10tti magaalaa Gurbicha keessatti raawwatame bu\'uureffachuun kaffaltii guutuu birrii 1,250,000 raawwachuu isaanii fi himatamtuun mana dabarsitee kennuu dhabuu isaaniitiin abbaa qabiyyummaa akka mirkanaa\'uudhaaf iyyatan.',
    claimArticles: 'SDFHH Kwt 222, 223, 224, 1731, 2872',
    requestedRelief: 'Manni kun gara himataatti akka darbu, kaffaltii kasaaraa birrii 50,000 waliin akka murtaa\'u.',
    defenseText: 'Himatamtuun Aadde Boontuu Firoomsaa kaffaltiin waliigaltee keessatti ibsame gama baankiitiin guutummaatti hin kaffalamne; nagaheen dhiyaatees qulqullina hin qabu jechuun mormii sadarkaa duraa fi deebii dhiyeessanii jiru.',
    defenseArticles: 'SDFHH Kwt 244(1)(a), Kwt 245',
    
    evidenceList: [
      { id: 'ev-1', title: 'Waliigaltee Gurgurtaa Manaa Chaappaa Bulchiinsaan Mirkanaa\'e', type: 'Exhibit A', providedBy: 'Himataa', status: 'Verified', sinqeeReceipt: 'SNQ-2026-88910' },
      { id: 'ev-2', title: 'Nagahee Baankii Sinqee Birrii 1,250,000', type: 'Bank Receipt', providedBy: 'Himataa', status: 'Verified', sinqeeReceipt: 'SNQ-2026-99012' },
      { id: 'ev-3', title: 'Ragaa Jecha Dhugaa Ba\'umsa Abbaa Ragaa 2 (Obbo Dirriba)', type: 'Witness Deposition', providedBy: 'Dhaddacha', status: 'Verified' }
    ],
    
    proceedingsHistory: [
      { date: '2026-02-12', sessionType: 'Galmee Jalqabaa', judgeNotes: 'Himannaan dhiyaatee kaffaltiin Baankii Sinqee mirkanaa\'ee waamichi himatamtuuf ergameera.', orderIssued: 'Himatamtuun deebii isaanii guyyaa 10 keessatti akka dhiyeessan.' },
      { date: '2026-02-22', sessionType: 'Dhaddacha Deebii', judgeNotes: 'Deebiin himatamtuu dhiyaatee qabxiin falmii boqonnaa 1ffaa fi 2ffaa qabameera.', orderIssued: 'Ragaaleen sanadaa fi namaa dhaddacha itti aanuuf akka dhihaatan.' },
      { date: '2026-03-05', sessionType: 'Dhaddacha Jecha Ragaa', judgeNotes: 'Jechi ragaa himataa 2 fuudhamee galmeetti qabatameera. Ragaan ittisaa ni dhagahama.', witnessTestimony: 'Dr. Tadesse Bekele: Waliigalteen gurgurtaa duratti raawwatamuun kaffaltiin baankii kaffalamuu nan beeka.', orderIssued: 'Dhaddachi xumuraaf beellamameera.' }
    ],
    
    legalOfficerChecklist: [
      { task: 'Iyyannoo & Nagahee Sinqee Qulqulleessuu', status: 'Completed', updatedBy: 'Ofiisara Seeraa Gadaa', timestamp: '2026-02-10 09:15' },
      { task: 'Waamicha Himatamaa Teessoo Hawaasaatti Erguu', status: 'Completed', updatedBy: 'Process Server', timestamp: '2026-02-11 14:30' },
      { task: 'Galmee Raawwii Dhaddachaaf Qopheessuu', status: 'Completed', updatedBy: 'Ofiisara Seeraa Gadaa', timestamp: '2026-02-21 11:00' }
    ],
    
    judgmentVerdict: {
      verdictSummary: 'Manni Murtii Aanaa Gurbicha Dhaddacha Hariiroo Hawaasaa 1ffaan mormii himatamtuu kufaa taasisani, waliigalteen gurgurtaa manaa seera-qabeessa ta\'uun mirkanaa\'ee manni lakk. GUR-041/2026 gara Himataatti akka galmaa\'u murteesseera.',
      legalReasoning: 'SDFHH Kwt 1731 fi murtii Dhaddacha Ijibbaataa MMWF Vol. 21 Lakk. Galmee 104921 bu\'uureffachuun kaffaltiin baankii mirkanaa\'e waliigaltee diiguuf gahaa miti.',
      cassationPrecedentRef: 'MMWF Dhaddacha Ijibbaataa Vol. 21 Lakk. Galmee 104921',
      judgeSignature: 'Abbaa Seeraa Caalaa Tasfaayee (Digitally Signed)',
      stampSealCode: 'STAMP-MMA-GURBICHA-2026-SECURE',
      judgmentDate: '2026-03-15',
      isFinal: true
    }
  },
  {
    id: 'case-002',
    caseNumber: 'MMA-GUR/055/2026',
    claimantName: 'Abbaa Alangaa Aanaa Gurbicha',
    respondentName: 'Guddataa Fayyisaa Dhibbaa',
    claimSubject: 'Himanna Yakka Hannaa fi Qabeenya Naannoo',
    filingDate: '2026-02-18',
    status: 'haaraa',
    priority: 'Ariifachiisaa',
    assignedJudge: 'Abbaa Seeraa Geetaachoo Toleeraa',
    assignedLegalOfficer: 'Ofiisara Seeraa Tolasaa',
    benchName: 'Dhaddacha Yakkaa Aanaa',
    courtLevel: 'Mana Murtii Aanaa Gurbicha',
    category: 'Criminal',
    
    claimText: 'Himatamaan obbo Guddataa Fayyisaa Seera Yakkaa Itoophiyaa Kwt 665 bu\'uureffachuun meeshaa kontraatara karaa birrii 350,000 tilmaamamu hataniiru jechuun Abbaan Alangaa himannaa dhiyeesseera.',
    claimArticles: 'Seera Yakkaa Kwt 665, SYAH Kwt 109',
    requestedRelief: 'Himatamaan adabbii hidhaa fi kaffaltii deebisaa akka irratti murtaa\'u.',
    defenseText: 'Himatamaan yakka raawwachuu isaanii waachan; ragaan poolisii qabee dhiyeesse seeraan ala qabame jedhan.',
    defenseArticles: 'Heera Mootummaa Kwt 19, SYAH Kwt 42',
    
    evidenceList: [
      { id: 'ev-201', title: 'Gabaasa Qorannoo Poolisii & Ragaa Sanadaa', type: 'Police Report', providedBy: 'Abbaa Alangaa', status: 'Verified' },
      { id: 'ev-202', title: 'Jecha Ragaa Ijaa 2', type: 'Witness Deposition', providedBy: 'Abbaa Alangaa', status: 'Pending' }
    ],
    
    proceedingsHistory: [
      { date: '2026-02-20', sessionType: 'Somiinsaa & Wabii', judgeNotes: 'Himannaan dubbifamee himatamaan wabii birrii 20,000n akka ba\'an murtaa\'eera.', orderIssued: 'Dhaddachi Ragaa Abbaa Alangaa dhagahuuf beellamame.' }
    ],
    
    legalOfficerChecklist: [
      { task: 'Himannaa Yakkaa Galmeessuu', status: 'Completed', updatedBy: 'Ofiisara Tolasaa', timestamp: '2026-02-18 10:00' },
      { task: 'Wabii Mana Murtii Mirkaneessuu', status: 'Completed', updatedBy: 'Ofiisara Tolasaa', timestamp: '2026-02-20 16:00' }
    ]
  },
  {
    id: 'case-003',
    caseNumber: 'MMA-GUR/172/2026',
    claimantName: 'Aadde Lensaa Gamtaarii',
    respondentName: 'Obbo Kabbadaa Guddisaa',
    claimSubject: 'Falmii Dhaala Lafa Baadiyyaa fi Madaallii',
    filingDate: '2026-01-28',
    status: 'adeemsa_irra',
    priority: 'Olaanaa',
    assignedJudge: 'Abbaa Seeraa Bultii Soorrii',
    assignedLegalOfficer: 'Ofiisara Seeraa Firoomsaa',
    benchName: 'Dhaddacha Lafa & Maatii',
    courtLevel: 'Mana Murtii Aanaa Gurbicha',
    category: 'Land',
    
    claimText: 'Himattuun lafa dhaalaa hektara 2.5 Aanaa Gurbicha ganda Doobbaatti argamu irratti mirgi dhaala isaanii akka mirkanaa\'u iyyataniiru.',
    claimArticles: 'Dambii Lafa Baadiyyaa Oromiyaa Lakk. 151/2005, Kwt 18',
    requestedRelief: 'Qabiyyeen lafa dhaalaa qixxeetti akka qoodamu.',
    defenseText: 'Himatamaan lafti sun kennaadhaan naaf kennameera jechuun sanada jaarsolii dhiyeessan.',
    defenseArticles: 'SDFHH Kwt 2005',
    
    evidenceList: [
      { id: 'ev-301', title: 'Sanada Waraqaa Ragaa Qabiyye Lafa Baadiyyaa', type: 'Land Certificate', providedBy: 'Himattuuu', status: 'Verified' },
      { id: 'ev-302', title: 'Barruu Jaarsolii Biyyaa', type: 'Private Document', providedBy: 'Himatamaa', status: 'Pending' }
    ],
    
    proceedingsHistory: [
      { date: '2026-02-05', sessionType: 'Qorannoo Lafa Qabatamaa', judgeNotes: 'Ogeessi Waajjira Lafa Aanaa Gurbicha qorannoo daangaa akka dhiyeessan ajajameera.', orderIssued: 'Gabaasni ogeessa safaraa dhiyaachuu qaba.' }
    ],
    
    legalOfficerChecklist: [
      { task: 'Xalayaa Waajjira Lafaatti Erguu', status: 'Completed', updatedBy: 'Ofiisara Firoomsaa', timestamp: '2026-02-06 09:30' }
    ]
  },
  {
    id: 'case-004',
    caseNumber: 'MMA-GUR/078/2026',
    claimantName: 'Obbo Tolaa Dirriba',
    respondentName: 'Adde Warqinaa Tasfaye',
    claimSubject: 'Falmii Kaffaltii Liqii fi Baankii Sinqee',
    filingDate: '2026-02-25',
    status: 'mallatto_eegaa',
    priority: 'Olaanaa',
    assignedJudge: 'Abbaa Seeraa Caalaa Tasfaayee',
    assignedLegalOfficer: 'Ofiisara Seeraa Gadaa Toleeraa',
    benchName: 'Dhaddacha Hariiroo Hawaasaa 2ffaa',
    courtLevel: 'Mana Murtii Aanaa Gurbicha',
    category: 'Civil',
    
    claimText: 'Liqiin birrii 450,000 nagahee Baankii Sinqee waliin kaffalamuu dhabuu irratti ajajni mallattoo eegaa jira.',
    claimArticles: 'SDFHH Kwt 1001',
    requestedRelief: 'Ajajni baankii fi mallattoon dhumaa akka kennamu.',
    defenseText: 'Himatamtuun kaffaltiin qabxiidhaan kaffalameera jedhan.',
    defenseArticles: 'SDFHH Kwt 1002',
    
    evidenceList: [
      { id: 'ev-401', title: 'Nagahee Baankii Sinqee Lakk. SNQ-77812', type: 'Receipt', providedBy: 'Himataa', status: 'Verified' }
    ],
    
    proceedingsHistory: [
      { date: '2026-02-27', sessionType: 'Qophii Ajaja Mallattoo', judgeNotes: 'Ajajni abbaa seerummaa qophaa\'ee mallattoo eegaa jira.', orderIssued: 'Mallattoon abbaa seeraa galmee irratti dibama.' }
    ],
    
    legalOfficerChecklist: [
      { task: 'Draft Ajajaa Qopheessuu', status: 'Completed', updatedBy: 'Ofiisara Gadaa', timestamp: '2026-02-27 15:00' }
    ]
  }
];

const INITIAL_E_FILING_APPS: EFilingApplication[] = [
  {
    id: 'efile-101',
    applicantName: 'Obbo Bultiin Tasfaayee',
    applicantEmail: 'bultii.tasfaye@gmail.com',
    applicantPhone: '+251 911 223344',
    targetCourtAdminEmail: 'gurbicha@gmail.com',
    claimCategory: 'Civil',
    claimSubject: 'Iyyannoo Himannaa Kaffaltii Waliigaltee Daldalaa',
    claimText: 'Obbo Bultiin Tasfaayee waliigaltee bittaa xaa\'oo raawwatame bu\'uureffachuun kaffaltii birrii 320,000 kaffalanii meeshaan dhiyaachuu dhabuu isaatiin iyyata dhiyeessanii jiru.',
    claimAmount: 'Birrii 320,000',
    submittedAt: '2026-10-28 14:20',
    status: 'pending'
  },
  {
    id: 'efile-102',
    applicantName: 'Aadde Fireewat Dheeressaa',
    applicantEmail: 'fireewat.dh@gmail.com',
    applicantPhone: '+251 912 556677',
    targetCourtAdminEmail: 'gurbicha@gmail.com',
    claimCategory: 'Land',
    claimSubject: 'Iyyannoo Mirga Qabiyye Lafa Qonnaa Ganda Doobbaa',
    claimText: 'Lafa qonnaa hektara 1.5 daangaa ganda Doobbaa irratti falmii mirga qabiyyeetiif iyyannoo dhiyaate.',
    claimAmount: 'Qabeenya Lafa Qonnaa',
    submittedAt: '2026-10-29 09:10',
    status: 'pending'
  }
];

export const AanaaGurbichaECourtDashboard: React.FC<AanaaGurbichaECourtDashboardProps> = ({
  currentLang,
  onNavigateToModule
}) => {
  const t = translations[currentLang];
  
  // Dashboard Core State
  const [casesList, setCasesList] = useState<DetailedCourtCase[]>(DEMO_GURBICHA_CASES);
  const [efilingApplications, setEfilingApplications] = useState<EFilingApplication[]>(INITIAL_E_FILING_APPS);
  
  const [selectedCase, setSelectedCase] = useState<DetailedCourtCase | null>(null);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<'claim' | 'evidence' | 'proceedings' | 'workflow' | 'judgment'>('claim');
  const [caseFilterStatus, setCaseFilterStatus] = useState<'all' | 'adeemsa_irra' | 'haaraa' | 'mallatto_eegaa' | 'cufame' | 'oliyyata_irratti'>('all');
  const [caseTypeFilter, setCaseTypeFilter] = useState<'all' | 'Civil' | 'Criminal' | 'Land'>('all');
  
  // Real-time Text Input Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal Toggles
  const [showCaseListModal, setShowCaseListModal] = useState(false);
  const [showEFilingSubmitModal, setShowEFilingSubmitModal] = useState(false);
  const [showEFilingApprovalModal, setShowEFilingApprovalModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditResult, setAuditResult] = useState<CaseLogicAuditResult | null>(null);
  const [activeCardTitle, setActiveCardTitle] = useState<string>('Galmee Banamte/Saaqamte (Active Cases)');
  
  // Toast & Notifications
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Court Staff Management State
  const [staffList, setStaffList] = useState<CourtStaffMember[]>(() => {
    const saved = localStorage.getItem('gurbicha_court_staff_roster');
    return saved ? JSON.parse(saved) : INITIAL_GURBICHA_STAFF;
  });
  const [showStaffManagementModal, setShowStaffManagementModal] = useState(false);
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | 'Ofiisara Seeraa' | 'Qindeessaa KTAS' | 'Abbaa Seeraa' | 'Admin Abbaa Seeraa'>('all');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'Ofiisara Seeraa' as 'Ofiisara Seeraa' | 'Qindeessaa KTAS' | 'Abbaa Seeraa' | 'Admin Abbaa Seeraa',
    benchName: 'Dhaddacha Hariiroo Hawaasaa 1ffaa',
    badgeNumber: ''
  });

  const filteredStaffList = staffList.filter(s => {
    const matchesRole = staffRoleFilter === 'all' || s.role === staffRoleFilter;
    const q = staffSearchQuery.toLowerCase().trim();
    const matchesQ = !q || s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.badgeNumber.toLowerCase().includes(q) || s.benchName.toLowerCase().includes(q);
    return matchesRole && matchesQ;
  });

  const handleAddStaffMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.fullName || !newStaff.email) return;

    const createdStaff: CourtStaffMember = {
      id: `staff-${Date.now()}`,
      fullName: newStaff.fullName,
      email: newStaff.email,
      phone: newStaff.phone || '+251 911 000000',
      role: newStaff.role,
      benchName: newStaff.benchName,
      badgeNumber: newStaff.badgeNumber || `MMA-GUR-${newStaff.role === 'Ofiisara Seeraa' ? 'OFF' : newStaff.role === 'Qindeessaa KTAS' ? 'KTAS' : 'JDG'}-${Math.floor(100 + Math.random() * 900)}`,
      status: 'Active',
      assignedCasesCount: 0,
      addedAt: new Date().toISOString().substring(0, 10)
    };

    const updated = [createdStaff, ...staffList];
    setStaffList(updated);
    localStorage.setItem('gurbicha_court_staff_roster', JSON.stringify(updated));
    
    setNewStaff({
      fullName: '',
      email: '',
      phone: '',
      role: 'Ofiisara Seeraa',
      benchName: 'Dhaddacha Hariiroo Hawaasaa 1ffaa',
      badgeNumber: ''
    });

    triggerNotice(`🎉 Hojjaataan Mana Murtii '${createdStaff.fullName}' (${createdStaff.role}) milkaa'inaan dabalameera!`);
  };

  const handleToggleStaffStatus = (id: string, newStatus: 'Active' | 'On Leave' | 'Suspended') => {
    const updated = staffList.map(s => s.id === id ? { ...s, status: newStatus } : s);
    setStaffList(updated);
    localStorage.setItem('gurbicha_court_staff_roster', JSON.stringify(updated));
    triggerNotice(`⚙️ Haalli hojjataa '${newStatus}'tti jijjiirameera.`);
  };

  const handleRemoveStaffMember = (id: string) => {
    const updated = staffList.filter(s => s.id !== id);
    setStaffList(updated);
    localStorage.setItem('gurbicha_court_staff_roster', JSON.stringify(updated));
    triggerNotice(`🗑️ Hojjaataan Mana Murtii haqumameera.`);
  };

  const handleExportStaffCSV = () => {
    const headers = ['ID,Maqaa Guutuu,Email,Bilbila,Gahee (Role),Dhaddacha/Kutaa,Lakk. Badge,Haala (Status),Guyyaa Dabalame'];
    const rows = staffList.map(s => `"${s.id}","${s.fullName}","${s.email}","${s.phone}","${s.role}","${s.benchName}","${s.badgeNumber}","${s.status}","${s.addedAt}"`);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hojjettoota_Mana_Murtii_Aanaa_Gurbicha_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotice('📥 Tarreen Hojjettoota Mana Murtii CSVn bu\'ee jira!');
  };

  // New E-Filing Form State
  const [newEFiling, setNewEFiling] = useState({
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    claimCategory: 'Civil' as 'Civil' | 'Criminal' | 'Land',
    claimSubject: '',
    claimText: '',
    claimAmount: ''
  });

  // Real-Time Filtered Cases Array
  const filteredCases = casesList.filter((c) => {
    const matchesFilter = caseFilterStatus === 'all' || c.status === caseFilterStatus;
    const matchesCategory = caseTypeFilter === 'all' || c.category === caseTypeFilter;
    
    // Real-Time Search by Case Number or Party Name (Claimant/Respondent) or Subject
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      c.caseNumber.toLowerCase().includes(q) ||
      c.claimantName.toLowerCase().includes(q) ||
      c.respondentName.toLowerCase().includes(q) ||
      c.claimSubject.toLowerCase().includes(q) ||
      c.assignedJudge.toLowerCase().includes(q);
      
    return matchesFilter && matchesCategory && matchesSearch;
  });

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCardClick = (statusType: 'all' | 'adeemsa_irra' | 'haaraa' | 'mallatto_eegaa' | 'cufame' | 'oliyyata_irratti', title: string) => {
    setCaseFilterStatus(statusType);
    setActiveCardTitle(title);
    setShowCaseListModal(true);
  };

  const handleOpenCaseDossier = (c: DetailedCourtCase) => {
    setSelectedCase(c);
    setActiveDossierTab('claim');
  };

  // E-Filing Submission Handler
  const handleEFilingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEFiling.applicantName || !newEFiling.claimSubject) return;

    const newEFileApp: EFilingApplication = {
      id: `efile-${Date.now()}`,
      applicantName: newEFiling.applicantName,
      applicantEmail: newEFiling.applicantEmail || 'applicant@gmail.com',
      applicantPhone: newEFiling.applicantPhone || '+251 911 000000',
      targetCourtAdminEmail: 'gurbicha@gmail.com',
      claimCategory: newEFiling.claimCategory,
      claimSubject: newEFiling.claimSubject,
      claimText: newEFiling.claimText || 'Iyyannoo seera-qabeessa dhiyaate.',
      claimAmount: newEFiling.claimAmount || 'Tilmaama Maallaqaa',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending'
    };

    setEfilingApplications(prev => [newEFileApp, ...prev]);
    setShowEFilingSubmitModal(false);
    setNewEFiling({
      applicantName: '',
      applicantEmail: '',
      applicantPhone: '',
      claimCategory: 'Civil',
      claimSubject: '',
      claimText: '',
      claimAmount: ''
    });

    triggerNotice('✅ Iyyanni E-Filing Mana Murtii Aanaa Gurbichaatti (gurbicha@gmail.com) milkaa\'inaan ergameera!');
  };

  // Admin Approval of E-Filing Request (`gurbicha@gmail.com`)
  const handleApproveEFiling = (app: EFilingApplication) => {
    const assignedNum = `MMA-GUR/${Math.floor(100 + Math.random() * 900)}/2026`;
    
    const newCourtCase: DetailedCourtCase = {
      id: `case-efile-${Date.now()}`,
      caseNumber: assignedNum,
      claimantName: app.applicantName,
      respondentName: 'Himatamaa (Summons Issued)',
      claimSubject: app.claimSubject,
      filingDate: new Date().toISOString().substring(0, 10),
      status: 'haaraa',
      priority: 'Olaanaa',
      assignedJudge: 'Abbaa Seeraa Caalaa Tasfaayee',
      assignedLegalOfficer: 'Ofiisara Seeraa Gadaa Toleeraa',
      benchName: app.claimCategory === 'Civil' ? 'Dhaddacha Hariiroo Hawaasaa 1ffaa' : app.claimCategory === 'Criminal' ? 'Dhaddacha Yakkaa Aanaa' : 'Dhaddacha Lafa & Maatii',
      courtLevel: 'Mana Murtii Aanaa Gurbicha',
      category: app.claimCategory,
      claimText: app.claimText,
      claimArticles: 'SDFHH Kwt 80, 222, 223',
      requestedRelief: app.claimAmount ? `Relief pray for ${app.claimAmount}` : 'Kaffaltii fi mirga seeraa',
      defenseText: 'Himatamaan waamicha mana murtii eeggataa jira.',
      defenseArticles: 'SDFHH Kwt 234',
      evidenceList: [
        { id: `ev-${Date.now()}`, title: 'Iyyannoo E-Filing Verification Receipt', type: 'E-Filing Exhibit', providedBy: app.applicantName, status: 'Verified', sinqeeReceipt: 'SNQ-2026-EFILE' }
      ],
      proceedingsHistory: [
        { date: new Date().toISOString().substring(0, 10), sessionType: 'Simannaa Iyyata E-Filing', judgeNotes: 'Admin (gurbicha@gmail.com) iyyata ergame mirkaneessuun galmee qopheesseera.', orderIssued: 'Waamichi himatamaa akka qophaa\'u.' }
      ],
      legalOfficerChecklist: [
        { task: 'Simannaa E-Filing & Nagahee Sinqee Mirkaneessuu', status: 'Completed', updatedBy: 'Admin (gurbicha@gmail.com)', timestamp: new Date().toISOString().substring(0, 16) },
        { task: 'Waamicha Himatamaa Qopheessuu', status: 'In Progress', updatedBy: 'Ofiisara Seeraa', timestamp: new Date().toISOString().substring(0, 16) }
      ]
    };

    // Update E-Filing status
    setEfilingApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved', assignedCaseNumber: assignedNum } : a));
    
    // Add to Active Court Cases
    setCasesList(prev => [newCourtCase, ...prev]);

    triggerNotice(`🎉 Iyyanni ${app.applicantName} mirkanaa'ee Lakk. Galmee ${assignedNum} kennameeraaf!`);
  };

  // Admin Rejection of E-Filing
  const handleRejectEFiling = (appId: string) => {
    setEfilingApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'rejected', rejectionReason: 'Dokumentiin gahaa miti ykn kaffaltiin hin mirkanaa\'e' } : a));
    triggerNotice('❌ Iyyanni E-Filing kufaa ta\'era.');
  };

  // Forward Appeal to Higher Court (`Oliyyata Erguu`)
  const handleForwardAppeal = (c: DetailedCourtCase) => {
    const appealCode = `APPEAL-MMO-GUR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    
    setCasesList(prev => prev.map(item => {
      if (item.id === c.id) {
        return {
          ...item,
          status: 'oliyyata_irratti',
          appealInfo: {
            appealCode,
            forwardedToCourt: 'Mana Murtii Ol\'aanaa Godina Buno Baddallee / MMWO',
            forwardedDate: new Date().toISOString().substring(0, 10),
            appealStatus: 'Galmee Ol\'iyyataa Banamuun Dhaddacha Ol\'aanaatti Ergameera'
          }
        };
      }
      return item;
    }));

    if (selectedCase && selectedCase.id === c.id) {
      setSelectedCase(prev => prev ? {
        ...prev,
        status: 'oliyyata_irratti',
        appealInfo: {
          appealCode,
          forwardedToCourt: 'Mana Murtii Ol\'aanaa Godina Buno Baddallee / MMWO',
          forwardedDate: new Date().toISOString().substring(0, 10),
          appealStatus: 'Galmee Ol\'iyyataa Banamuun Dhaddacha Ol\'aanaatti Ergameera'
        }
      } : null);
    }

    triggerNotice(`📤 Galmeen ${c.caseNumber} Ol'iyyataaf Mana Murtii Ol'aanaatti ergameera! Code: ${appealCode}`);
  };

  // Case Logic Audit Handler
  const handleTriggerCaseAudit = (c: DetailedCourtCase) => {
    const result = runCaseLogicAudit(c);
    setAuditResult(result);
    setShowAuditModal(true);
    triggerNotice(`🔍 Qorannoo Loojikii Galmee ${c.caseNumber} raawwatameera! Score: ${result.proceduralCompletenessScore}%`);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Toast Notice */}
      <AnimatePresence>
        {actionNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-[100] bg-slate-900 border border-amber-500/80 text-amber-200 px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-3"
          >
            <span>✨</span>
            <span>{actionNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner / System Identifier */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Scale className="w-64 h-64 text-amber-500" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  System Online
                </span>
                <span className="text-xs text-slate-400 font-mono">2026 E-Court Node</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Sirna Mana Murtii Elektirooniikii Ammayyaa
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
                <p className="text-sm font-semibold text-amber-400">
                  Aanaa Gurbicha Daashboordii • Admin Email: <span className="font-mono underline">gurbicha@gmail.com</span>
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/50 px-2 py-0.5 rounded-lg border border-slate-800">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>2026 E-Court</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowStaffManagementModal(true)}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Hojjettoota Mana Murtii ({staffList.length})</span>
            </button>
            <button
              onClick={() => setShowEFilingSubmitModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Iyyannoo Haaraa Ergi</span>
            </button>
            <button
              onClick={() => setShowEFilingApprovalModal(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Simannaa E-Filing ({efilingApplications.filter(a => a.status === 'pending').length})</span>
            </button>
          </div>
        </div>

        {/* Publisher Demo Notice Banner ("Dhaamsa Iddoo Qabatu") */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 text-xs shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xl shrink-0">
              ⚠️
            </div>
            <div>
              <h4 className="font-extrabold text-amber-300 text-sm flex items-center gap-2">
                <span>Dhaamsa Agarsiisaa (Publisher Notice)</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">Sample Setup</span>
              </h4>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                Manni Murtii Aanaa Gurbicha qabatamaa miti; kun leenjii fi agarsiisa hojii mana murtii dijitaalaatiif kan qophaa'eera. 
                Admin Email: <strong className="text-amber-300 font-mono">gurbicha@gmail.com</strong>. Iyyanni e-filing dhiyaatu hundi bifa kanaan simatamee ni mirkanaa'a.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowEFilingApprovalModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
          >
            Admin Panel (`gurbicha@gmail.com`)
          </button>
        </div>

        {/* 6 Core Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
          {/* Card 1: Galmee Hundaa */}
          <button
            onClick={() => handleCardClick('all', `Galmee Hundaa (${casesList.length})`)}
            className="p-4 rounded-2xl bg-slate-950/80 border border-blue-500/30 hover:border-blue-500 transition-all text-left group cursor-pointer shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Galmee Hundaa</span>
              <span className="text-blue-400 text-lg">📁</span>
            </div>
            <div className="text-2xl font-black text-blue-400 group-hover:scale-105 transition-transform">
              {casesList.length}
            </div>
          </button>

          {/* Card 2: Galmee Haaraa */}
          <button
            onClick={() => handleCardClick('haaraa', 'Galmee Haaraa')}
            className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-500 transition-all text-left group cursor-pointer shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Galmee Haaraa</span>
              <span className="text-emerald-400 text-lg">🆕</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 group-hover:scale-105 transition-transform">
              {casesList.filter(c => c.status === 'haaraa').length}
            </div>
          </button>

          {/* Card 3: Galmee Banamte/Saaqamte */}
          <button
            onClick={() => handleCardClick('adeemsa_irra', 'Galmee Banamte/Saaqamte')}
            className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 hover:border-amber-500 transition-all text-left group cursor-pointer shadow-md ring-1 ring-amber-500/20"
          >
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold mb-2">
              <span>Adeemsa Irra</span>
              <span className="text-amber-400 text-lg animate-pulse">⚡</span>
            </div>
            <div className="text-2xl font-black text-amber-400 group-hover:scale-105 transition-transform">
              {casesList.filter(c => c.status === 'adeemsa_irra').length}
            </div>
          </button>

          {/* Card 4: Kan Mallatto Eggacha jiran */}
          <button
            onClick={() => handleCardClick('mallatto_eegaa', 'Kan Mallattoo Eeggacha Jiran')}
            className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/30 hover:border-rose-500 transition-all text-left group cursor-pointer shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Mallattoo Eeggataa</span>
              <span className="text-rose-400 text-lg">📋</span>
            </div>
            <div className="text-2xl font-black text-rose-400 group-hover:scale-105 transition-transform">
              {casesList.filter(c => c.status === 'mallatto_eegaa').length}
            </div>
          </button>

          {/* Card 5: E-Filing Pending */}
          <button
            onClick={() => setShowEFilingApprovalModal(true)}
            className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 hover:border-purple-500 transition-all text-left group cursor-pointer shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Iyyannoo E-Filing</span>
              <span className="text-purple-400 text-lg">📩</span>
            </div>
            <div className="text-2xl font-black text-purple-400 group-hover:scale-105 transition-transform">
              {efilingApplications.filter(a => a.status === 'pending').length}
            </div>
          </button>

          {/* Card 6: Oliyyata Forwarded */}
          <button
            onClick={() => handleCardClick('oliyyata_irratti', 'Galmeewwan Ol\'iyyataaf Ergaman')}
            className="p-4 rounded-2xl bg-slate-950/80 border border-teal-500/30 hover:border-teal-500 transition-all text-left group cursor-pointer shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Ol'iyyata Ergame</span>
              <span className="text-teal-400 text-lg">📤</span>
            </div>
            <div className="text-2xl font-black text-teal-400 group-hover:scale-105 transition-transform">
              {casesList.filter(c => c.status === 'oliyyata_irratti').length}
            </div>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION: REAL-TIME SEARCH & FILTER BAR DIRECTLY IN THE 'GALMEELEE' VIEW
          ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📁 Real-Time Filtering: Tarree Galmeelee & Dhimmoota Mana Murtii</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-black">
                  {filteredCases.length} Cases Found
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Lakkoofsa galmee ykn maqaa himataa/himatamaa galchuudhaan real-time soofaa
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCaseListModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>Table Boni (Full Screen)</span>
          </button>
        </div>

        {/* Real-time Text Input Field at top of Galmeelee View */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Galmee Lakk. (MMA-GUR/001/2026) ykn Maqaa Gareewwaniitiin Real-Time Barbaadi..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="md:col-span-6 flex flex-wrap items-center gap-2 justify-start md:justify-end">
            {['all', 'adeemsa_irra', 'haaraa', 'mallatto_eegaa', 'cufame', 'oliyyata_irratti'].map((st) => (
              <button
                key={st}
                onClick={() => setCaseFilterStatus(st as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  caseFilterStatus === st
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {st === 'all' ? 'Hunda' : st === 'adeemsa_irra' ? 'Adeemsa Irra' : st === 'haaraa' ? 'Haaraa' : st === 'cufame' ? 'Cufame' : st === 'oliyyata_irratti' ? 'Ol\'iyyata' : 'Mallattoo Eegaa'}
              </button>
            ))}

            <select
              value={caseTypeFilter}
              onChange={(e) => setCaseTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 text-xs font-bold text-slate-300 border border-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">Gosoota Hunda</option>
              <option value="Civil">Hariiroo Hawaasaa</option>
              <option value="Criminal">Yakka</option>
              <option value="Land">Lafa</option>
            </select>
          </div>
        </div>

        {/* Real-time Cards Preview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredCases.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs font-mono">
              🔍 Galmeen barbaaddan ("{searchQuery}") hin argamne.
            </div>
          ) : (
            filteredCases.slice(0, 6).map((c) => (
              <div 
                key={c.id} 
                onClick={() => handleOpenCaseDossier(c)}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 transition-all cursor-pointer space-y-3 group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-extrabold group-hover:scale-105 transition-transform">
                    {c.caseNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    c.status === 'adeemsa_irra' ? 'bg-amber-500/20 text-amber-300' :
                    c.status === 'cufame' ? 'bg-emerald-500/20 text-emerald-300' :
                    c.status === 'haaraa' ? 'bg-blue-500/20 text-blue-300' :
                    c.status === 'oliyyata_irratti' ? 'bg-teal-500/20 text-teal-300' :
                    'bg-rose-500/20 text-rose-300'
                  }`}>
                    {c.status === 'adeemsa_irra' ? '⚡ Adeemsa Irra' : c.status === 'cufame' ? '✅ Cufame' : c.status === 'haaraa' ? '🆕 Haaraa' : c.status === 'oliyyata_irratti' ? '📤 Ol\'iyyata' : '📋 Mallattoo Eegaa'}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                  {c.claimSubject}
                </h4>

                <div className="text-[11px] text-slate-400 space-y-0.5 font-sans">
                  <div>Himataa: <strong className="text-slate-200">{c.claimantName}</strong></div>
                  <div>Himatamaa: <strong className="text-slate-200">{c.respondentName}</strong></div>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{c.assignedJudge}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerCaseAudit(c);
                      }}
                      className="px-2 py-1 rounded-lg bg-purple-900/40 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Qorannoo Loojikii Galmee"
                    >
                      <ShieldCheck className="w-3 h-3 text-purple-300" />
                      <span>Audit Logic</span>
                    </button>
                    <span className="text-amber-400 group-hover:translate-x-1 transition-transform">Ilaali ➔</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Grid Layout for Dashboard Actions & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Gochaalee & Sochii */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <span>📋</span>
              <span>Gochaalee (Quick Action Modules)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleCardClick('haaraa', 'Galmee Haaraa Dhufan')}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all text-left flex items-start gap-3 group cursor-pointer"
              >
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    Galmee Haaraa
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Galmeewwan haaraa Dhufan/Jiran ilaali/bulchi
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleCardClick('adeemsa_irra', 'Galmee Banamte/Saaqamte (Active Cases)')}
                className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 hover:border-amber-500 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20"
              >
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 group-hover:scale-110 transition-transform">
                  <Gavel className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300 group-hover:text-amber-400 transition-colors">
                    Galmee Banamte/Saaqamte
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    Himannaa, deebii, ragaa fi hojii dhaddachaa ilaali
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowEFilingApprovalModal(true)}
                className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 hover:border-purple-500 transition-all text-left flex items-start gap-3 group cursor-pointer"
              >
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-300 group-hover:text-amber-400 transition-colors">
                    Simannaa E-Filing (`gurbicha@gmail.com`)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Iyyata dhiyaate mirkaneessi ykn kufaa godhi
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowStaffManagementModal(true)}
                className="p-4 rounded-2xl bg-slate-950 border border-teal-500/30 hover:border-teal-500 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-md"
              >
                <div className="p-3 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-teal-300 group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    <span>Bulchiinsa Hojjettoota Mana Murtii</span>
                    <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-[10px] font-mono">({staffList.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    Ofiisara Seeraa, Qindeessaa KTAS fi Abbaa Seeraa dabali/bulchi
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <span>⚡</span>
              <span>Sochii (Live Judicial Activity Feed)</span>
            </h3>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 font-bold">📋</span>
                  <div>
                    <span className="font-bold text-white block">Galmee Haaraa Galmaa'ee Jira</span>
                    <span className="text-[11px] text-slate-400">MMA-GUR/055/2026 • Abbaa Alangaa Aanaa Gurbicha</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400">5 daqiiqoota dura</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 font-bold">📩</span>
                  <div>
                    <span className="font-bold text-white block">Iyyanni E-Filing Mirkanaa'eera</span>
                    <span className="text-[11px] text-slate-400">Admin gurbicha@gmail.com iyyata Obbo Bultii mirkaneesseera</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400">12 daqiiqoota dura</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Overview */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider font-mono">
              Haala Galmee Mul'ata Waliigalaa Dashboard
            </h3>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-300">Galmee Haaraa</span>
                  <span className="text-blue-400 font-bold">{casesList.filter(c => c.status === 'haaraa').length}</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-300">Galmee Banamte/Saaqamte</span>
                  <span className="text-amber-400 font-bold">{casesList.filter(c => c.status === 'adeemsa_irra').length}</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-300">Galmee Cufaman</span>
                  <span className="text-emerald-400 font-bold">{casesList.filter(c => c.status === 'cufame').length}</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '20%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: FULL CASES LIST TABLE MODAL (WITH TOP REAL-TIME SEARCH INPUT)
          ========================================================================= */}
      {showCaseListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xl font-bold">
                  📂
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {activeCardTitle}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Lakkoofsa galmee ykn maqaa gareewwaniitiin soofama
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCaseListModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Real-time Search Input Bar */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Galmee Lakk. ykn Maqaa Gareewwaniitiin Barbaadi..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {['all', 'adeemsa_irra', 'haaraa', 'mallatto_eegaa', 'cufame', 'oliyyata_irratti'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setCaseFilterStatus(st as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      caseFilterStatus === st
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {st === 'all' ? 'Hunda' : st === 'adeemsa_irra' ? 'Adeemsa Irra' : st === 'haaraa' ? 'Haaraa' : st === 'cufame' ? 'Cufame' : st === 'oliyyata_irratti' ? 'Ol\'iyyata' : 'Mallattoo Eegaa'}
                  </button>
                ))}
                
                <button
                  onClick={() => {
                    const judges = ['Abbaa Seeraa Caalaa Tasfaayee', 'Abbaa Seeraa Geetaachoo Toleeraa', 'Abbaa Seeraa Bultii Soorrii', 'Abbaa Seeraa Gurbicha'];
                    setCasesList(prev => prev.map((c, index) => ({
                      ...c,
                      assignedJudge: c.assignedJudge || judges[index % judges.length]
                    })));
                    triggerNotice('🤖 Cases have been auto-assigned using round-robin!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all cursor-pointer shadow"
                >
                  🤖 Auto-Assign
                </button>
              </div>
            </div>

            {/* Cases Table */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                    <tr>
                      <th className="py-3 px-4">Lakkoofsa Galmee</th>
                      <th className="py-3 px-4">Himataa (Claimant)</th>
                      <th className="py-3 px-4">Himatamaa (Respondent)</th>
                      <th className="py-3 px-4">Dhimma (Claim Subject)</th>
                      <th className="py-3 px-4">Abbaa Seeraa</th>
                      <th className="py-3 px-4 text-center">Haala (Status)</th>
                      <th className="py-3 px-4 text-right">Tarkaanfii</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCases.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          Galmeen filannoo kana waliin wal-simu hin argamne.
                        </td>
                      </tr>
                    ) : (
                      filteredCases.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-950/60 transition-colors group">
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleOpenCaseDossier(c)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-mono font-extrabold text-xs transition-all shadow flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>📁</span>
                              <span>{c.caseNumber}</span>
                            </button>
                          </td>

                          <td className="py-3 px-4 font-bold text-white">{c.claimantName}</td>
                          <td className="py-3 px-4 text-slate-300">{c.respondentName}</td>
                          <td className="py-3 px-4 text-slate-300">{c.claimSubject}</td>
                          <td className="py-3 px-4 font-medium text-amber-300/80">{c.assignedJudge}</td>

                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'adeemsa_irra' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 
                              c.status === 'haaraa' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                              c.status === 'cufame' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                              c.status === 'oliyyata_irratti' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                              'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              {c.status === 'adeemsa_irra' ? '⚡ Adeemsa Irra' : c.status === 'haaraa' ? '🆕 Haaraa' : c.status === 'cufame' ? '✅ Cufame' : c.status === 'oliyyata_irratti' ? '📤 Ol\'iyyata' : '📋 Mallattoo Eegaa'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleTriggerCaseAudit(c)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                                title="Qorannoo Loojikii Galmee"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Audit Logic</span>
                              </button>
                              <button
                                onClick={() => handleOpenCaseDossier(c)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                              >
                                Galmee Banii
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: E-FILING SUBMIT MODAL (FOR APPLICANTS / PETITIONERS)
          ========================================================================= */}
      {showEFilingSubmitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 text-xl font-bold">
                  ✍️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Iyyannoo / E-Filing Haaraa Ergi
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Target Admin Court Email: <span className="text-amber-400 font-bold">gurbicha@gmail.com</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEFilingSubmitModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleEFilingSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Maqaa Iyyataa (Applicant Name) *</label>
                  <input
                    type="text"
                    required
                    value={newEFiling.applicantName}
                    onChange={(e) => setNewEFiling({ ...newEFiling, applicantName: e.target.value })}
                    placeholder="e.g. Obbo Bultiin Tasfaayee"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Email Iyyataa *</label>
                  <input
                    type="email"
                    required
                    value={newEFiling.applicantEmail}
                    onChange={(e) => setNewEFiling({ ...newEFiling, applicantEmail: e.target.value })}
                    placeholder="e.g. applicant@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Lakk. Bilbilaa</label>
                  <input
                    type="text"
                    value={newEFiling.applicantPhone}
                    onChange={(e) => setNewEFiling({ ...newEFiling, applicantPhone: e.target.value })}
                    placeholder="+251 911 000000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Gosa Himannaa (Category)</label>
                  <select
                    value={newEFiling.claimCategory}
                    onChange={(e) => setNewEFiling({ ...newEFiling, claimCategory: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Civil">Hariiroo Hawaasaa (Civil)</option>
                    <option value="Criminal">Yakka (Criminal)</option>
                    <option value="Land">Lafa & Maatii (Land)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mata Duree Iyyannoo (Claim Subject) *</label>
                <input
                  type="text"
                  required
                  value={newEFiling.claimSubject}
                  onChange={(e) => setNewEFiling({ ...newEFiling, claimSubject: e.target.value })}
                  placeholder="e.g. Falmii Waliigaltee Bittaa fi Gurgurtaa Manaa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Qabiyyee Iyyannoo & Qorannoo Seeraa</label>
                <textarea
                  rows={3}
                  value={newEFiling.claimText}
                  onChange={(e) => setNewEFiling({ ...newEFiling, claimText: e.target.value })}
                  placeholder="Qabiyyee ijoo iyyannaa fi gaaffii murtii..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEFilingSubmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Haqi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow"
                >
                  Ergi (`gurbicha@gmail.com`)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: E-FILING ADMIN APPROVAL PANEL MODAL (`gurbicha@gmail.com`)
          ========================================================================= */}
      {showEFilingApprovalModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xl font-bold">
                  📬
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Simannaa & Hayyama Iyyata E-Filing</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                      gurbicha@gmail.com
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Iyyata dhiyaatan qorachuun Mirkaneessi (Approve) ykn Kufaa Godhi
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEFilingApprovalModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {efilingApplications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Iyyanni e-filing dhiyaate hin jiru.
                </div>
              ) : (
                efilingApplications.map((app) => (
                  <div key={app.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2 text-xs">
                      <div>
                        <span className="font-bold text-white text-sm block">{app.applicantName}</span>
                        <span className="text-slate-400 text-[11px] font-mono">{app.applicantEmail} • {app.applicantPhone}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-center ${
                        app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        app.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {app.status === 'approved' ? `✓ Mirkanaa'e (${app.assignedCaseNumber})` : app.status === 'rejected' ? '❌ Kufaa Ta\'e' : '⏳ Eeggataa Jira'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-200 space-y-1">
                      <div><strong className="text-amber-400">Mata Duree:</strong> {app.claimSubject}</div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-300 text-[11px] leading-relaxed">
                        {app.claimText}
                      </div>
                    </div>

                    {app.status === 'pending' && (
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRejectEFiling(app.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition-all cursor-pointer"
                        >
                          Kufaa Godhi
                        </button>
                        <button
                          onClick={() => handleApproveEFiling(app)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          <span>Hayyamu & Galmeessuu</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: CASE DOSSIER & JUDICIAL WORKFLOW MODAL
          ========================================================================= */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Case Dossier Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl shadow-lg">
                  ⚖️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-[11px]">
                      {selectedCase.caseNumber}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{selectedCase.benchName}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                    {selectedCase.claimSubject}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Himataa: <strong className="text-slate-200">{selectedCase.claimantName}</strong> vs Himatamaa: <strong className="text-slate-200">{selectedCase.respondentName}</strong>
                  </p>
                  <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    selectedCase.status === 'adeemsa_irra' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    selectedCase.status === 'cufame' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    selectedCase.status === 'haaraa' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                    selectedCase.status === 'oliyyata_irratti' ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' :
                    'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedCase.status === 'adeemsa_irra' ? 'bg-amber-400' : selectedCase.status === 'cufame' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {selectedCase.status === 'adeemsa_irra' ? 'Adeemsa Irra' : selectedCase.status === 'cufame' ? 'Cufame' : selectedCase.status === 'haaraa' ? 'Haaraa' : selectedCase.status === 'oliyyata_irratti' ? 'Ol\'iyyata' : 'Mallattoo Eegaa'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* AUDIT CASE LOGIC BUTTON */}
                <button
                  onClick={() => handleTriggerCaseAudit(selectedCase)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  title="Qorannoo Loojikii fi Procedural Logic Audit"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                  <span>Qorannoo Loojikii</span>
                </button>

                {/* FORWARD APPEAL BUTTON (`Oliyyata Erguu`) */}
                <button
                  onClick={() => handleForwardAppeal(selectedCase)}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  title="Forward Appeal to Higher Court (Mana Murtii Ol'aanaa)"
                >
                  <Send className="w-4 h-4" />
                  <span>Oliyyata Ergi</span>
                </button>

                <button
                  onClick={() => downloadCaseSummaryPDF({
                    id: selectedCase.id,
                    caseNumber: selectedCase.caseNumber,
                    title: selectedCase.claimSubject,
                    filingDate: selectedCase.filingDate,
                    type: 'Claim',
                    author: selectedCase.assignedJudge,
                    status: selectedCase.status,
                    courtName: selectedCase.courtLevel,
                    bench: selectedCase.benchName
                  }, currentLang)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Dossier PDF</span>
                </button>

                <button
                  onClick={() => setSelectedCase(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Navigation Tabs */}
            <div className="flex overflow-x-auto bg-slate-950 border-b border-slate-800 p-2 gap-2 text-xs font-bold scrollbar-none">
              <button
                onClick={() => setActiveDossierTab('claim')}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeDossierTab === 'claim'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>📜</span>
                <span>1. Himannaa & Deebii</span>
              </button>

              <button
                onClick={() => setActiveDossierTab('evidence')}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeDossierTab === 'evidence'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>🔍</span>
                <span>2. Ragaalee & Sanadoota ({selectedCase.evidenceList.length})</span>
              </button>

              <button
                onClick={() => setActiveDossierTab('proceedings')}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeDossierTab === 'proceedings'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>🎙️</span>
                <span>3. Hojii Dhaddachaa ({selectedCase.proceedingsHistory.length})</span>
              </button>

              <button
                onClick={() => setActiveDossierTab('workflow')}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeDossierTab === 'workflow'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>👔</span>
                <span>4. Hojii Ofiisara Seeraa</span>
              </button>

              <button
                onClick={() => setActiveDossierTab('judgment')}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeDossierTab === 'judgment'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>⚖️</span>
                <span>5. Hanga Murtiittii (Verdict)</span>
              </button>
            </div>

            {/* Dossier Tab Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: Himannaa & Deebii */}
              {activeDossierTab === 'claim' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                        <span>📜</span>
                        <span>Iyyannoo Himannaa (Statement of Claim - Himataa)</span>
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">Guyyaa: {selectedCase.filingDate}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {selectedCase.claimText}
                    </p>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                      <strong className="text-amber-300 block mb-1">Keewwattoota Seeraa Caqasaman:</strong>
                      <span className="font-mono text-amber-400">{selectedCase.claimArticles}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                        <span>🛡️</span>
                        <span>Deebii Himatamaa (Statement of Defense)</span>
                      </h4>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {selectedCase.defenseText}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: Ragaalee */}
              {activeDossierTab === 'evidence' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <span>🔍</span>
                    <span>Ragaalee Sanadaa & Baankii Sinqee (Documentary Exhibits)</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCase.evidenceList.map((ev) => (
                      <div key={ev.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-mono border border-amber-500/20">
                              {ev.type}
                            </span>
                            <h5 className="text-xs font-bold text-white">{ev.title}</h5>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.status === 'Verified' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            ✓ {ev.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-900">
                          <span>Dhiyyeessaa: {ev.providedBy}</span>
                          <button 
                            onClick={() => setSelectedFile(ev)}
                            className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Sanada Ilaali</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Hojii Dhaddachaa */}
              {activeDossierTab === 'proceedings' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <span>🎙️</span>
                    <span>Waraabbata Dhaddachaa & Jecha Ragaa (Courtroom Hearings Log)</span>
                  </h4>

                  <div className="space-y-3">
                    {selectedCase.proceedingsHistory.map((pr, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <span className="text-xs font-bold text-amber-300">{pr.sessionType}</span>
                          <span className="text-[11px] font-mono text-slate-400">{pr.date}</span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          <strong className="text-slate-400 block mb-1">Qabxii Dhaddachaa (Bench Note):</strong>
                          {pr.judgeNotes}
                        </p>

                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                          <strong className="text-emerald-400 block mb-0.5">Ajaja Dhaddachaa (Court Order):</strong>
                          <span>{pr.orderIssued}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Hojii Ofiisara Seeraa */}
              {activeDossierTab === 'workflow' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <span>👔</span>
                    <span>Adeemsa Hojii Ofiisara Seeraa (Legal Officer Checklist)</span>
                  </h4>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="text-xs text-slate-300 flex items-center justify-between border-b border-slate-800 pb-2">
                      <span>Ofiisara Seeraa Ramadame: <strong className="text-amber-300">{selectedCase.assignedLegalOfficer}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">Active Officer</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {selectedCase.legalOfficerChecklist.map((task, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-slate-200">{task.task}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                            <span>{task.updatedBy}</span>
                            <span>{task.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Hanga Murtiittii & Oliyyata */}
              {activeDossierTab === 'judgment' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {selectedCase.appealInfo && (
                    <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/40 space-y-2 text-xs text-teal-200">
                      <div className="flex items-center justify-between">
                        <strong className="text-teal-300 font-bold">📤 Galmeen Kun Ol'iyyataaf Ergameera:</strong>
                        <span className="font-mono text-[11px] bg-teal-500/20 px-2 py-0.5 rounded border border-teal-500/30">
                          {selectedCase.appealInfo.appealCode}
                        </span>
                      </div>
                      <div>Target Court: <strong>{selectedCase.appealInfo.forwardedToCourt}</strong></div>
                      <div>Guyyaa Ergame: <span className="font-mono">{selectedCase.appealInfo.forwardedDate}</span></div>
                    </div>
                  )}

                  {selectedCase.judgmentVerdict ? (
                    <div className="p-6 rounded-3xl bg-slate-950 border border-amber-500/50 space-y-5 relative overflow-hidden shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">⚖️</span>
                          <h4 className="text-base font-bold text-amber-400 font-serif-legal">
                            Murtii Dhumaa Mana Murtii Aanaa Gurbicha
                          </h4>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono uppercase">
                          Final Judgment
                        </span>
                      </div>

                      <div className="space-y-3 text-xs leading-relaxed text-slate-200">
                        <p className="p-4 rounded-2xl bg-slate-900 border border-slate-800 font-serif-legal text-sm">
                          {selectedCase.judgmentVerdict.verdictSummary}
                        </p>

                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                          <strong className="text-amber-300 text-xs block">Sababa Seeraa & Qorannoo Ragaa:</strong>
                          <p className="text-slate-300">{selectedCase.judgmentVerdict.legalReasoning}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                        <div className="space-y-1 text-center sm:text-left">
                          <span className="text-[10px] text-slate-400 font-mono block">MALLATTOO DIGITALII:</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            ✓ {selectedCase.judgmentVerdict.judgeSignature}
                          </span>
                        </div>

                        <button
                          onClick={() => handleForwardAppeal(selectedCase)}
                          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Send className="w-4 h-4" />
                          <span>Oliyyata Ergi (Higher Court)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <Clock className="w-10 h-10 text-amber-500 mx-auto animate-spin" />
                      <h4 className="text-sm font-bold text-white">Murtiin Galmee Kanaa Adeemsa Irra Jira</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Murtii dhumaa qophaa'aa jira.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: AUDIT CASE LOGIC REPORT MODAL
          ========================================================================= */}
      {showAuditModal && auditResult && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl max-w-4xl w-full max-h-[88vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3.5 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-2xl font-bold">
                  🛡️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold text-[11px]">
                      {auditResult.caseNumber}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Qorannoo Loojikii Galmee</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    Gabaasa Qorannoo Loojikii Seeraa & Procedural Audit Report
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Audit Generated at: {auditResult.auditTimestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Score Indicator Banner */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Procedural Completeness Score
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-black ${
                      auditResult.proceduralCompletenessScore >= 90 ? 'text-emerald-400' :
                      auditResult.proceduralCompletenessScore >= 70 ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      {auditResult.proceduralCompletenessScore}%
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      auditResult.proceduralCompletenessScore >= 90 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      auditResult.proceduralCompletenessScore >= 70 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {auditResult.status}
                    </span>
                  </div>
                </div>

                {/* Score Progress Bar */}
                <div className="w-full sm:w-64 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Qulqullina Galmee</span>
                    <span>{auditResult.proceduralCompletenessScore}/100</span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        auditResult.proceduralCompletenessScore >= 90 ? 'bg-emerald-500' :
                        auditResult.proceduralCompletenessScore >= 70 ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`}
                      style={{ width: `${auditResult.proceduralCompletenessScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Missing Documents Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>1. Hanqina Sanadoota Dirqamaa (Potential Missing Required Exhibits)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                    {auditResult.missingDocuments.length} Issues
                  </span>
                </h4>

                {auditResult.missingDocuments.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Sanadoonni dirqamaa gosa galmee kanaatiif dhiyaachuun isaanii mirkanaa'eera.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditResult.missingDocuments.map((doc, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              doc.severity === 'High' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                              'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {doc.severity} Severity
                            </span>
                            <strong className="text-white text-xs">{doc.docType}</strong>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{doc.mandatoryForCategory}</span>
                        </div>

                        <p className="text-slate-300 text-xs leading-relaxed">
                          {doc.description}
                        </p>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="text-amber-300 font-medium text-[11px]">
                            💡 Tarkaanfii Filatamu: {doc.suggestedAction}
                          </div>
                          <button
                            onClick={() => triggerNotice(`📩 Ajajni sanada '${doc.docType}' dhiyeessisuuf qophaa'eera.`)}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap self-end sm:self-center"
                          >
                            Ajaja Dhiyeessuu Ergi
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Statutory Contradictions Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-rose-400" />
                  <span>2. Wal-faallessa & Mormii Seeraa (Statutory & Precedent Logic Contradictions)</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono border border-rose-500/30">
                    {auditResult.statutoryContradictions.length} Checks
                  </span>
                </h4>

                {auditResult.statutoryContradictions.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Wal-faallessaan keewwata seeraa ykn mormii sadarkaa duraa galmee keessatti hin kaafamne.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditResult.statutoryContradictions.map((sc, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-rose-300 font-bold text-xs">{sc.issueTitle}</span>
                          <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] border border-rose-500/30 font-bold">
                            {sc.sourceCode}
                          </span>
                        </div>

                        <p className="text-slate-200 text-xs leading-relaxed">
                          {sc.detail}
                        </p>

                        <div className="text-[11px] text-slate-400 font-mono pt-1">
                          Ref Article: <span className="text-amber-300 underline">{sc.ruleOrArticle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Judicial Recommendations */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-3">
                <h4 className="text-xs font-bold text-purple-300 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>3. Gorsa & Decision Guidance (Judicial Logic Audit Recommendations)</span>
                </h4>

                <ul className="space-y-2 text-xs text-slate-200">
                  {auditResult.judicialRecommendations.map((rec, i) => (
                    <li key={i} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-medium">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Ethiopian Legal Logic Engine • AI Court Auditor Node
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    triggerNotice(`🖨️ Gabaasni Qorannoo Loojikii Galmee ${auditResult.caseNumber} Chaappaan Mirkanaa'ee Maxxanfamaa Jira.`);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Gabaasa Maxxansi (Print Audit)</span>
                </button>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs"
                >
                  Cufi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: COURT STAFF & JUDICIAL OFFICERS MANAGEMENT MODAL
          ========================================================================= */}
      {showStaffManagementModal && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-teal-500/50 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3.5 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-2xl font-bold">
                  👥
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold border border-teal-500/30">
                      gurbicha@gmail.com Admin
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Mana Murtii Aanaa Gurbicha</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    Bulchiinsa Hojjettoota Mana Murtii (Court Staff Roster)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ofiisara Seeraa, Qindeessaa KTAS, Abbaa Seeraa, fi Admin Abbaa Seeraa galmeessi / bulchi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={handleExportStaffCSV}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setShowStaffManagementModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Add New Staff Form Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-inner">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Hojjaataa/Ofiisara Haaraa Dabali (Add New Court Employee)</span>
                </h4>

                <form onSubmit={handleAddStaffMember} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Maqaa Guutuu (Full Name) *</label>
                    <input
                      type="text"
                      required
                      value={newStaff.fullName}
                      onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                      placeholder="e.g. Ofiisara Seeraa Tolasaa"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      placeholder="e.g. officer@gurbicha.court.gov.et"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Lakk. Bilbilaa</label>
                    <input
                      type="text"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      placeholder="+251 911 000000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Gahee Hojii (Judicial Role) *</label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 cursor-pointer font-bold"
                    >
                      <option value="Ofiisara Seeraa">👔 Ofiisara Seeraa (Legal Officer)</option>
                      <option value="Qindeessaa KTAS">💻 Qindeessaa KTAS (Court Automation Tech)</option>
                      <option value="Abbaa Seeraa">⚖️ Abbaa Seeraa (Bench Judge)</option>
                      <option value="Admin Abbaa Seeraa">🏛️ Admin Abbaa Seeraa (Presiding Judge)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Dhaddacha / Kutaa Hojii</label>
                    <input
                      type="text"
                      value={newStaff.benchName}
                      onChange={(e) => setNewStaff({ ...newStaff, benchName: e.target.value })}
                      placeholder="e.g. Dhaddacha Hariiroo Hawaasaa 1ffaa"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Lakk. Badge (Eenyummaa)</label>
                    <input
                      type="text"
                      value={newStaff.badgeNumber}
                      onChange={(e) => setNewStaff({ ...newStaff, badgeNumber: e.target.value })}
                      placeholder="e.g. MMA-GUR-OFFICER-03"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div className="col-span-full pt-1 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Hojjaataa Haaraa Galmeessi</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Roster Controls & Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Maqaa, Email, ykn Badge number'n barbaadi..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {['all', 'Ofiisara Seeraa', 'Qindeessaa KTAS', 'Abbaa Seeraa', 'Admin Abbaa Seeraa'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setStaffRoleFilter(role as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        staffRoleFilter === role
                          ? 'bg-teal-500 text-slate-950 shadow'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {role === 'all' ? 'Hunda' : role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto bg-slate-950 rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                    <tr>
                      <th className="py-3 px-4">Hojjaataa / Maqaa</th>
                      <th className="py-3 px-4">Email & Bilbila</th>
                      <th className="py-3 px-4">Gahee (Role)</th>
                      <th className="py-3 px-4">Dhaddacha / Kutaa</th>
                      <th className="py-3 px-4">Lakk. Badge</th>
                      <th className="py-3 px-4 text-center">Haala (Status)</th>
                      <th className="py-3 px-4 text-right">Tarkaanfii</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredStaffList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500 font-mono">
                          Hojjaataan madaallii kana waliin wal-simu hin argamne.
                        </td>
                      </tr>
                    ) : (
                      filteredStaffList.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-amber-400">
                                {st.role.includes('Judge') || st.role.includes('Seeraa') ? '⚖️' : st.role.includes('KTAS') ? '💻' : '👔'}
                              </span>
                              <span>{st.fullName}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-300 font-mono text-[11px]">{st.email}</div>
                            <div className="text-slate-500 text-[10px]">{st.phone}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              st.role.includes('Admin') ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                              st.role.includes('Ofiisara') ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                              st.role.includes('KTAS') ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                              'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {st.role}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">{st.benchName}</td>

                          <td className="py-3.5 px-4 font-mono text-amber-400 text-[11px]">
                            {st.badgeNumber}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <select
                              value={st.status}
                              onChange={(e) => handleToggleStaffStatus(st.id, e.target.value as any)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${
                                st.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                st.status === 'On Leave' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              <option value="Active">✓ Active</option>
                              <option value="On Leave">⏳ On Leave</option>
                              <option value="Suspended">⛔ Suspended</option>
                            </select>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleRemoveStaffMember(st.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
                              title="Hojjaataa Haqui"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Mana Murtii Aanaa Gurbicha Roster Database • Active Staff: {staffList.filter(s => s.status === 'Active').length}
              </span>
              <button
                onClick={() => setShowStaffManagementModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs"
              >
                Cufi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">{selectedFile.title}</h3>
              <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X /></button>
            </div>
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-slate-300 font-mono text-sm overflow-y-auto max-h-[60vh]">
              {selectedFile.sinqeeReceipt ? `Receipt ID: ${selectedFile.sinqeeReceipt}\n\n` : ''}
              This is a read-only preview of the document "${selectedFile.title}". 
              Type: {selectedFile.type}. 
              Provided by: {selectedFile.providedBy}. 
              Status: {selectedFile.status}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
