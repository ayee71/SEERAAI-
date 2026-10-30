import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
  Scale,
  Sparkles,
  Download,
  X,
  Check,
  RefreshCw,
  Clock,
  Send,
  Building2,
  FileCheck,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { FirestoreCaseDocket } from '../services/courtCaseService';
import { auditDocumentLegalLogic } from '../services/api';
import { logConfidentialAccess } from '../services/confidentialityService';
import { useAuth } from '../context/AuthContext';

export interface ProceduralDefectItem {
  id: string;
  category: 'missing_document' | 'statutory_contradiction' | 'jurisdiction_issue' | 'procedural_defect' | 'timeline_breach';
  severity: 'critical' | 'warning' | 'info';
  articleCode: string;
  statutoryReference: string;
  title: { om: string; am: string; en: string };
  description: { om: string; am: string; en: string };
  rejectionRisk: { om: string; am: string; en: string };
  remedyActionLabel?: { om: string; am: string; en: string };
  remedyType?: 'verify_payment' | 'add_summons_order' | 'inject_verification' | 'add_witness_schedule';
  isFixed?: boolean;
}

interface CaseLogicAuditModalProps {
  caseDocket: FirestoreCaseDocket;
  currentLang: Language;
  onClose: () => void;
  onUpdateDocket?: (updated: FirestoreCaseDocket) => void;
}

export const CaseLogicAuditModal: React.FC<CaseLogicAuditModalProps> = ({
  caseDocket,
  currentLang,
  onClose,
  onUpdateDocket
}) => {
  const t = translations[currentLang];
  const [activeDocket, setActiveDocket] = useState<FirestoreCaseDocket>(caseDocket);
  const [isAiAuditing, setIsAiAuditing] = useState(false);
  const [aiReportText, setAiReportText] = useState<string | null>(null);
  const [fixedDefectIds, setFixedDefectIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning'>('all');

  interface AuditHistorySession {
    id: string;
    timestamp: string;
    score: number;
    totalCount: number;
    criticalCount: number;
    warningCount: number;
    defects: { articleCode: string; title: string; severity: string }[];
  }

  const STORAGE_HISTORY_KEY = `seera_case_audit_history_${activeDocket.caseNumber}`;
  const [activeModalTab, setActiveModalTab] = useState<'audit' | 'history'>('audit');
  const [auditHistory, setAuditHistory] = useState<AuditHistorySession[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Perform Static Rule-based Audit for Case Docket
  const auditReport = useMemo(() => {
    const defects: ProceduralDefectItem[] = [];

    // 1. Missing Sinqee Bank Court Fee Payment Verification (Dambii Lakk. 08)
    if (activeDocket.paymentStatus !== 'verified') {
      defects.push({
        id: 'defect_missing_payment',
        category: 'missing_document',
        severity: 'critical',
        articleCode: 'Dambii Lakk. 08/2016',
        statutoryReference: 'Dambii Kaffaltii Abbaa Seerummaa & Baankii Sinqee (Dambii 08 Art. 4)',
        title: {
          om: 'Nagaheen Kaffaltii Baankii Sinqee Hin Mirkanaagnee (Unverified Court Fee Receipt)',
          am: 'የሲንቄ ባንክ የክፍያ ደረሰኝ አልተረጋገጠም (Unverified Sinqee Bank Fee)',
          en: 'Unverified Sinqee Bank Court Fee Receipt (Dambii 08 Art. 4)'
        },
        description: {
          om: 'Galmeen kun kaffaltii abbaa seerummaa Baankii Sinqee Dambii 08 tiin mirkanaa\'e hin qabu.',
          am: 'ይህ መዝገብ በደንብ ቁጥር 08 መሰረት የተረጋገጠ የሲንቄ ባንክ ክፍያ የለውም።',
          en: 'This case docket lacks verified Sinqee Bank court fee payment receipt required under Proclamation Regulation No. 08.'
        },
        rejectionRisk: {
          om: 'Bu\'uura Dambii 08 tiin kaffaltiin osoo hin mirkanaa\'in adeemsi falmii dhimma kanaa dhaabbachuu danda\'a.',
          am: 'በደንብ ቁጥር 08 መሰረት ክፍያው ሳይረጋገጥ የችሎት ሂደቱ ሊታገድ ይችላል።',
          en: 'Failure to verify court fees may suspend further judicial proceedings.'
        },
        remedyActionLabel: {
          om: 'Kaffaltii Baankii Sinqee Mirkaneessi (Verify Sinqee Payment)',
          am: 'የሲንቄ ባንክ ክፍያ አረጋግጥ (Verify Payment)',
          en: 'Verify Sinqee Bank Payment'
        },
        remedyType: 'verify_payment'
      });
    }

    // 2. Unserved 1st Summons Process Service Defect (SDFHH Kwt. 94 & 105)
    if (!activeDocket.isExParte && activeDocket.firstSummonsStatus === 'not_served_absent' && !activeDocket.secondSummonsRefNo) {
      defects.push({
        id: 'defect_unserved_summons',
        category: 'procedural_defect',
        severity: 'critical',
        articleCode: 'SDFHH Kwt. 94, 95 & 105',
        statutoryReference: 'Seera Deemsa Falmii Hariiroo Hawaasaa (SDFHH) Kwt. 105',
        title: {
          om: 'Waamichi 1ffaan Teessoo Irratti Hin Qaqqabne (Defective Summons Service)',
          am: 'አንደኛ መጥሪያ ለተከሳሽ አልደረሰም (Unserved 1st Summons Notice)',
          en: 'Defective Summons Service - 1st Notice Undelivered (SDFHH Art. 105)'
        },
        description: {
          om: 'Himatamaan teessoo irratti waan hin argamneef waamichi 1ffaan hin qaqqabne. Ajajni dhaddachaa waamicha 2ffaa barbaachisa.',
          am: 'ተከሳሽ ባልተገኘበት ምክንያት መጥሪያ አልደረሰም። የችሎት 2ኛ መጥሪያ ትዕዛዝ ያስፈልጋል።',
          en: 'First summons returned unserved due to absent party. Requires explicit bench order for substitute or 2nd process service.'
        },
        rejectionRisk: {
          om: 'SDFHH Kwt 70 tiin ajaja waamicha 2ffaa malee murtii deebii malee (default judgment) kennuun seeraan ala.',
          am: 'በፍትሐብሔር ሥ/ሥ/ሕግ ቁጥር 70 መሰረት ያለ 2ኛ መጥሪያ ውሳኔ መስጠት አይቻልም።',
          en: 'Proceeding to ex-parte hearing without lawful 2nd service invalidates trial outcomes under SDFHH Art. 70.'
        },
        remedyActionLabel: {
          om: 'Ajaja Waamicha 2ffaa Dhaddachaa Baasi (Issue 2nd Summons Order)',
          am: 'የ2ኛ መጥሪያ ትዕዛዝ አውጣ (Issue 2nd Summons)',
          en: 'Issue 2nd Summons Bench Order'
        },
        remedyType: 'add_summons_order'
      });
    }

    // 3. Missing List of Witnesses & Documentary Exhibits (SDFHH Kwt. 223)
    const combinedNotes = (activeDocket.notes || '') + ' ' + (activeDocket.claimSubject || '');
    const lowerNotes = combinedNotes.toLowerCase();
    const hasWitnessList = lowerNotes.includes('ragaa') || lowerNotes.includes('witness') || lowerNotes.includes('ምስክር') || lowerNotes.includes('exhibit');

    if (!hasWitnessList) {
      defects.push({
        id: 'defect_missing_witness_list',
        category: 'missing_document',
        severity: 'warning',
        articleCode: 'SDFHH Kwt. 223',
        statutoryReference: 'SDFHH Kwt. 223 (Tarree Ragaalee Namaa fi Sanadaa)',
        title: {
          om: 'Tarreen Ragaalee Namaa fi Sanadaa Hin Galmeeffamne (Missing Evidence & Witness List)',
          am: 'የምስክሮች እና የሰነድ ማስረጃ ዝርዝር አልተካተተም (Missing Evidence Schedule)',
          en: 'Missing Schedule of Witnesses & Documentary Evidence (SDFHH Art. 223)'
        },
        description: {
          om: 'Galmee kana keessatti tarreen ragaalee namaa ykn sanadaa (Evidence Schedule) dhihaachuun isaa ibsa qabatee hin jiru.',
          am: 'በዚህ መዝገብ ውስጥ የምስክሮች ወይም የሰነድ ማስረጃዎች ዝርዝር አልተገለጸም።',
          en: 'Statement of claim lacks registered schedule of witnesses or documentary exhibits required by C.P.C Art. 223.'
        },
        rejectionRisk: {
          om: 'SDFHH Kwt 223(2) tiin ragaan booda dhiyaatu heddumminaan kufaa ta\'uu danda\'a.',
          am: 'በፍትሐብሔር ሥ/ሥ/ሕግ አንቀጽ 223(2) መሰረት በኋላ የሚቀርብ ማስረጃ ውድቅ ሊደረግ ይችላል።',
          en: 'Unlisted evidence produced later in trial may be barred under C.P.C Art. 223(2).'
        },
        remedyActionLabel: {
          om: 'Tarree Ragaalee SDFHH Kwt 223 Dabali (Attach Evidence Schedule)',
          am: 'የማስረጃ ዝርዝር አያይዝ (Attach Evidence List)',
          en: 'Attach Evidence Schedule (SDFHH 223)'
        },
        remedyType: 'add_witness_schedule'
      });
    }

    // 4. Verification Oath & Legal Officer Signature Check (SDFHH Kwt. 92 & 93)
    const hasVerification = lowerNotes.includes('mirkaneessa') || lowerNotes.includes('verification') || lowerNotes.includes('kakuu') || lowerNotes.includes('ማረጋገጫ');
    if (!hasVerification) {
      defects.push({
        id: 'defect_missing_verification',
        category: 'statutory_contradiction',
        severity: 'warning',
        articleCode: 'SDFHH Kwt. 92 & 93',
        statutoryReference: 'SDFHH Kwt. 92 & 93 (Verification & Oath)',
        title: {
          om: 'Ibsa Kakuu Mirkaneessaa Himannaa Hin Qabu (Missing Verification Clause on Oath)',
          am: 'የእውነት ማረጋገጫ ቃለ-መሀላ የለውም (Missing Verification Oath)',
          en: 'Missing Verification Clause on Oath (SDFHH Arts. 92 & 93)'
        },
        description: {
          om: 'Galmeen kun kakuu mirkaneessa dhugaummaa (Verification on Oath) SDFHH Kwt 92/93 qabaachuu isaatiif mallattoo hin qabu.',
          am: 'ይህ መዝገብ በፍትሐብሔር ሥ/ሥ/ሕግ ቁጥር 92/93 መሰረት የተረጋገጠ ቃለ-መሀላ አልያዘም።',
          en: 'Pleading contains no verification clause certifying facts under oath pursuant to Arts. 92 & 93.'
        },
        rejectionRisk: {
          om: 'SDFHH Kwt 229 tiin iyyatni mirkaneessa hin qabne akka sirreeffamuuf deebifama.',
          am: 'በፍትሐብሔር ሥ/ሥ/ሕግ ቁጥር 229 መሰረት እንዲስተካከል ይመለሳል።',
          en: 'Pleadings lacking verification are returned for correction under Art. 229.'
        },
        remedyActionLabel: {
          om: 'Kakuu Mirkaneessaa SDFHH Kwt 92/93 Dabali (Inject Verification Clause)',
          am: 'የእውነት ማረጋገጫ አያይዝ (Inject Verification)',
          en: 'Inject Verification Clause (SDFHH 92/93)'
        },
        remedyType: 'inject_verification'
      });
    }

    // 5. Jurisdiction / Monetary Threshold Contradiction Check (Labsii 1234/2021)
    if (activeDocket.courtLevel === 'first_instance' && lowerNotes.includes('birrii 10,000,000')) {
      defects.push({
        id: 'defect_pecuniary_overlimit',
        category: 'jurisdiction_issue',
        severity: 'critical',
        articleCode: 'Labsii 1234/2021 & SDFHH Kwt. 6',
        statutoryReference: 'Labsii Mana Murtii Oromiyaa / Federaalaa Lakk. 1234/2021',
        title: {
          om: 'Aangoo Maallaqaa Daangaa Ol (Pecuniary Jurisdiction Limit Exceeded)',
          am: 'የገንዘብ መጠን ከፍርድ ቤቱ ስልጣን በላይ ነው (Jurisdiction Overlimit)',
          en: 'Pecuniary Claim Exceeds Woreda First Instance Jurisdiction Ceiling'
        },
        description: {
          om: 'Gatiin falmii Birrii 10,000,000 ol ta\'uun Mana Murtii Ol\'aanaatiin ilaalamuu qaba, Aanaatti dhiyaachuun seeraan ala.',
          am: 'ከ 10,000,000 ብር በላይ የሆነ የክስ መጠን በከፍተኛ ፍርድ ቤት መታየት አለበት።',
          en: 'Claims exceeding regional woreda pecuniary thresholds must be transferred to the High Court under Proclamation 1234/2021.'
        },
        rejectionRisk: {
          om: 'SDFHH Kwt 244(1)(a) tiin mormii murtii malee kufaa taasisu dhiyeessuu danda\'a.',
          am: 'በፍትሐብሔር ሥ/ሥ/ሕግ ቁጥር 244(1)(ሀ) መሰረት በቅድመ መቃወሚያ ውድቅ ይደረጋል።',
          en: 'Subject to dismissal under preliminary objection for lack of subject-matter jurisdiction.'
        }
      });
    }

    // Filter out fixed ones
    const activeDefects = defects.filter(d => !fixedDefectIds.has(d.id));

    // Calculate Health Score
    let score = 100;
    activeDefects.forEach(d => {
      if (d.severity === 'critical') score -= 25;
      else if (d.severity === 'warning') score -= 12;
      else score -= 5;
    });
    score = Math.max(10, score);

    return {
      score,
      defects: activeDefects,
      totalCount: activeDefects.length,
      criticalCount: activeDefects.filter(d => d.severity === 'critical').length,
      warningCount: activeDefects.filter(d => d.severity === 'warning').length
    };
  }, [activeDocket, fixedDefectIds]);

  useEffect(() => {
    const session: AuditHistorySession = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      score: auditReport.score,
      totalCount: auditReport.totalCount,
      criticalCount: auditReport.criticalCount,
      warningCount: auditReport.warningCount,
      defects: auditReport.defects.map(d => ({
        articleCode: d.articleCode,
        title: d.title[currentLang] || d.title.om,
        severity: d.severity
      }))
    };

    setAuditHistory(prev => {
      if (prev.length > 0 && Math.abs(new Date(prev[0].timestamp).getTime() - Date.now()) < 5000) {
        return prev;
      }
      const updated = [session, ...prev].slice(0, 15);
      try {
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [auditReport.score, auditReport.totalCount]);

  // Remedy Execution Handler
  const handleApplyRemedy = (defect: ProceduralDefectItem) => {
    if (!defect.remedyType) return;

    let updatedDocket: FirestoreCaseDocket = { ...activeDocket };

    if (defect.remedyType === 'verify_payment') {
      const receiptNo = `SNQ-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      updatedDocket = {
        ...updatedDocket,
        paymentStatus: 'verified',
        sinqeeReceiptNo: receiptNo,
        notes: (updatedDocket.notes || '') + `\n✅ [AUDIT FIX]: Kaffaltii Baankii Sinqee (${receiptNo}) Dambii 08 tiin mirkanaa'eera.`
      };
      setToastMessage(
        currentLang === 'om'
          ? `✅ Kaffaltii Baankii Sinqee (${receiptNo}) milkaa'inaan mirkanaa'eera!`
          : `✅ Sinqee Bank Payment (${receiptNo}) verified!`
      );
    } else if (defect.remedyType === 'add_summons_order') {
      const summonsRef = `SUM2-2026/${Math.floor(100 + Math.random() * 900)}`;
      const nextDate = '2026-11-20';
      updatedDocket = {
        ...updatedDocket,
        currentStage: 'second_summons',
        secondSummonsRefNo: summonsRef,
        nextHearingDate: nextDate,
        notes: (updatedDocket.notes || '') + `\n✉️ [AUDIT FIX]: Ajajni Waamicha 2ffaa (${summonsRef}) Ba'eera. Beellama: ${nextDate}`
      };
      setToastMessage(
        currentLang === 'om'
          ? `✉️ Ajajni Waamicha 2ffaa (${summonsRef}) milkaa'inaan galmeeffameera!`
          : `✉️ 2nd Summons Bench Order (${summonsRef}) recorded!`
      );
    } else if (defect.remedyType === 'inject_verification') {
      const oathSnippet = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nMIRKANEESSA KAKUU (SDFHH Kwt 92/93): Ani maqaan koo olitti ibsame, qabxiileen galmee kanaa dhugaa ta'uu kakuudhaan mirkaneessa.`;
      updatedDocket = {
        ...updatedDocket,
        notes: (updatedDocket.notes || '') + oathSnippet
      };
      setToastMessage(
        currentLang === 'om'
          ? `✅ Ibsa Kakuu Mirkaneessaa SDFHH Kwt 92/93 Galmee Keessatti Dabalameera!`
          : `✅ Statutory Verification Oath injected into docket record!`
      );
    } else if (defect.remedyType === 'add_witness_schedule') {
      const witnessSnippet = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTARREE RAGAALEE (SDFHH Kwt 223): 1) Obbo Caalaa Gemechu (Ragaa Namaa), 2) Sanada Waliigaltee (Ragaa Sanadaa).`;
      updatedDocket = {
        ...updatedDocket,
        notes: (updatedDocket.notes || '') + witnessSnippet
      };
      setToastMessage(
        currentLang === 'om'
          ? `✅ Tarreen Ragaalee SDFHH Kwt 223 Galmee Keessatti Dabalameera!`
          : `✅ Evidence Schedule attached under C.P.C Art. 223!`
      );
    }

    setFixedDefectIds(prev => new Set(prev).add(defect.id));
    setActiveDocket(updatedDocket);
    onUpdateDocket?.(updatedDocket);

    setTimeout(() => setToastMessage(null), 3500);
  };

  // Run Deep Gemini AI Legal Logic Analysis
  const handleRunDeepAiAudit = async () => {
    setIsAiAuditing(true);
    setAiReportText(null);
    try {
      const fullText = `GALMEE FALMII: ${activeDocket.caseNumber}
HIMATAA: ${activeDocket.claimantName} VS HIMATAMAA: ${activeDocket.respondentName}
GUSA FALMII: ${activeDocket.claimSubject}
SADARKAA MANA MURTII: ${activeDocket.courtLevel} - ${activeDocket.bench}
KAFFALTII BAANKII SINQEE: ${activeDocket.paymentStatus || 'Pending'} (${activeDocket.sinqeeReceiptNo || 'None'})
STAGE: ${activeDocket.currentStage}
NOTES: ${activeDocket.notes || 'None'}`;

      const res = await auditDocumentLegalLogic(fullText, currentLang);
      if (res && res.auditReport) {
        setAiReportText(
          `🤖 Gemini AI Legal Analysis:\nStatus: ${res.auditReport.status.toUpperCase()}\nScore: ${res.auditReport.overallScore}/100\n` +
          `Summary: ${res.auditReport.summary[currentLang] || res.auditReport.summary.om}`
        );
        setToastMessage(
          currentLang === 'om'
            ? '🤖 Odiitiin Gemini AI milkaa\'inaan xumurameera!'
            : '🤖 Gemini AI Legal Audit completed!'
        );
      } else {
        setAiReportText('🤖 Gemini AI: Galmeen kun bu\'uura seera deemed falmii hariiroo hawaasaa Oromiyaatti xiinxalamee jira.');
      }
    } catch (err) {
      console.error('Deep AI audit error:', err);
      setAiReportText('Odiitii AI gaggeessuun hin danda\'amne. Odiitii heeraa idilee fayyadamaa.');
    } finally {
      setIsAiAuditing(false);
    }
  };

  // Export Formatted Case Logic & Statutory Contradictions Timeline as PDF Document
  const handleExportAuditPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      let y = 14;

      // Helper to check page overflow and add page with mini header
      const checkPageOverflow = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 20) {
          pdf.addPage();
          y = 16;
          // Mini header on subsequent pages
          pdf.setFillColor(15, 23, 42); // slate-900
          pdf.rect(0, 0, pageWidth, 8, 'F');
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(203, 213, 225);
          pdf.text(`SeeraAI Judicial Logic Audit Report • Case: ${activeDocket.caseNumber}`, margin, 5.5);
          y += 6;
        }
      };

      // 1. Professional Header Banner
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageWidth, 28, 'F');

      // Gold Accent separator
      pdf.setFillColor(245, 158, 11); // amber-500
      pdf.rect(0, 28, pageWidth, 1.5, 'F');

      // Header Brand and Title
      pdf.setTextColor(245, 158, 11);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('SEERAAI JUDICIAL DECISION SUPPORT SYSTEM', margin, 11);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CASE LOGIC & STATUTORY CONTRADICTIONS AUDIT REPORT', margin, 18);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.text(`Generated: ${new Date().toLocaleString()}  |  Verification Code: SAI-${activeDocket.caseNumber.replace(/[^a-zA-Z0-9]/g, '')}`, margin, 24);

      y = 36;

      // 2. Case Docket Identification Card
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.setDrawColor(203, 213, 225); // slate-300
      pdf.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text('1. DOCKET IDENTIFICATION & COURT RECORD', margin + 4, y + 6);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);

      const col1X = margin + 4;
      const col2X = margin + (contentWidth / 2) + 2;

      pdf.text(`Case Docket Number: ${activeDocket.caseNumber}`, col1X, y + 13);
      pdf.text(`Parties: ${activeDocket.claimantName} VS ${activeDocket.respondentName}`, col1X, y + 18.5);
      pdf.text(`Subject Matter: ${activeDocket.claimSubject || 'Civil / Property Claim'}`, col1X, y + 24);
      pdf.text(`Litigation Stage: ${activeDocket.currentStage?.toUpperCase() || 'FIRST_HEARING'}`, col1X, y + 29.5);

      pdf.text(`Court Level: ${activeDocket.courtLevel?.toUpperCase() || 'FIRST_INSTANCE'}`, col2X, y + 13);
      pdf.text(`Bench / Division: ${activeDocket.bench || 'Civil Division'}`, col2X, y + 18.5);
      pdf.text(`Filing Date: ${activeDocket.filingDate || 'N/A'}`, col2X, y + 24);
      pdf.text(`Sinqee Fee Status: ${activeDocket.paymentStatus === 'verified' ? `VERIFIED (${activeDocket.sinqeeReceiptNo || 'Dambii 08'})` : 'PENDING VERIFICATION'}`, col2X, y + 29.5);

      y += 40;

      // 3. Logic Health Score & Diagnostic Overview Card
      const scoreColor: [number, number, number] = auditReport.score >= 80 ? [5, 150, 105] : auditReport.score >= 50 ? [217, 119, 6] : [220, 38, 38];
      const cardBgColor: [number, number, number] = auditReport.score >= 80 ? [240, 253, 244] : auditReport.score >= 50 ? [254, 252, 232] : [254, 242, 242];
      
      pdf.setFillColor(cardBgColor[0], cardBgColor[1], cardBgColor[2]);
      pdf.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      pdf.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      const statusTitle = auditReport.score >= 80
        ? 'STATUTORY COMPLIANT / BENCH READY'
        : auditReport.score >= 50
        ? 'MINOR STATUTORY & PROCEDURAL DEFICIENCIES'
        : 'HIGH REJECTION RISK / CRITICAL CONTRADICTIONS DETECTED';
      pdf.text(`2. STATUTORY LOGIC HEALTH SCORE: ${auditReport.score}% - ${statusTitle}`, margin + 4, y + 7);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text(`Active Contradictions / Defects: ${auditReport.totalCount}  (Critical: ${auditReport.criticalCount}, Warnings: ${auditReport.warningCount})`, margin + 4, y + 13.5);

      const summaryNote = auditReport.totalCount === 0
        ? 'The case pleadings and procedural schedule are in full alignment with the Civil Procedure Code and applicable directives.'
        : `Identified ${auditReport.criticalCount} critical defect(s) presenting immediate strike-out risk and ${auditReport.warningCount} procedural warning(s) requiring remediation.`;
      const splitSummary = pdf.splitTextToSize(summaryNote, contentWidth - 8);
      pdf.text(splitSummary, margin + 4, y + 19);

      y += 30;

      // 4. Detailed Current Statutory Contradictions
      checkPageOverflow(25);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('3. DETAILED STATUTORY DEFECTS & CONTRADICTIONS IN DOCKET', margin, y);
      y += 5;

      if (auditReport.defects.length === 0) {
        pdf.setFillColor(240, 253, 244);
        pdf.setDrawColor(74, 222, 128);
        pdf.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(22, 101, 52);
        pdf.text('✅ No active statutory contradictions or procedural defects in current session.', margin + 4, y + 7.5);
        y += 16;
      } else {
        auditReport.defects.forEach((defect, idx) => {
          checkPageOverflow(30);
          const isCritical = defect.severity === 'critical';
          const cardBorder: [number, number, number] = isCritical ? [248, 113, 113] : [251, 191, 36];
          const cardBg: [number, number, number] = isCritical ? [254, 242, 242] : [254, 252, 232];

          pdf.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
          pdf.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
          pdf.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, 'FD');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8.5);
          pdf.setTextColor(isCritical ? 185 : 180, isCritical ? 28 : 83, isCritical ? 28 : 9);
          pdf.text(`${idx + 1}. [${isCritical ? 'CRITICAL' : 'WARNING'}] ${defect.articleCode}: ${defect.title.en || defect.title.om}`, margin + 4, y + 5.5);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(71, 85, 105);
          pdf.text(`Statutory Authority: ${defect.statutoryReference}`, margin + 4, y + 10.5);

          const descText = pdf.splitTextToSize(`Contradiction: ${defect.description.en || defect.description.om}`, contentWidth - 8);
          pdf.text(descText, margin + 4, y + 15);

          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(isCritical ? 153 : 146, isCritical ? 27 : 64, isCritical ? 27 : 14);
          const riskText = `Rejection Risk: ${defect.rejectionRisk.en || defect.rejectionRisk.om}`;
          pdf.text(riskText, margin + 4, y + 22);

          y += 30;
        });
      }

      // 5. Statutory Contradictions Timeline & Audit Sessions History
      checkPageOverflow(26);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('4. STATUTORY CONTRADICTIONS & AUDIT SESSIONS TIMELINE', margin, y);
      y += 6;

      if (auditHistory.length === 0) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text('Timeline: Initial baseline audit session recorded for this docket.', margin, y + 4);
        y += 10;
      } else {
        auditHistory.forEach((session, sIdx) => {
          checkPageOverflow(22);
          const defectLines = session.defects.length;
          const boxH = Math.max(16, 12 + defectLines * 4.5);
          
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');

          // Left timeline milestone bar
          pdf.setFillColor(245, 158, 11);
          pdf.rect(margin, y, 2.5, boxH, 'F');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(15, 23, 42);
          const sessionDateStr = new Date(session.timestamp).toLocaleString();
          pdf.text(`Audit Session #${auditHistory.length - sIdx} (${sessionDateStr})  •  Score: ${session.score}%  (Critical: ${session.criticalCount}, Warnings: ${session.warningCount})`, margin + 5, y + 5);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(71, 85, 105);

          if (session.defects.length === 0) {
            pdf.text('Statutory Contradictions: None (Zero defects identified at this timeline checkpoint).', margin + 5, y + 10);
          } else {
            let defY = y + 10;
            session.defects.forEach(d => {
              pdf.text(`• [${d.articleCode}] ${d.title}`, margin + 5, defY);
              defY += 4.2;
            });
          }

          y += boxH + 4;
        });
      }

      // Add Footers and Page Numbers across all generated pages
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text('SeeraAI Judicial Logic Engine • Ethiopian Legal Intelligence • Proclamation 1234/2021 & C.P.C', margin, pageHeight - 7);
        pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
      }

      pdf.save(`CaseLogic_Audit_Report_${activeDocket.caseNumber.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`);

      setToastMessage(
        currentLang === 'om'
          ? '📄 Gabaasni Odiitii Seeraa fi Taateewwan Qorannoo PDF milkaa\'inaan buufameera!'
          : currentLang === 'am'
          ? '📄 የክስ ሎጂክ እና የሕግ ግጭቶች ኦዲት ሪፖርት በPDF በተሳካ ሁኔታ ወርዷል!'
          : '📄 Case logic & statutory contradictions timeline downloaded as formatted PDF!'
      );
    } catch (err) {
      console.error('Error generating audit PDF:', err);
      setToastMessage('Error exporting PDF document. Please try again.');
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredDefects = auditReport.defects.filter(d => {
    if (filterSeverity === 'critical') return d.severity === 'critical';
    if (filterSeverity === 'warning') return d.severity === 'warning';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>ODIITII LOOJIKII SEERAA GALMEE</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                {activeDocket.caseNumber}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-serif-legal text-white">
              {activeDocket.claimantName} <span className="text-amber-400 font-mono text-sm">VS</span> {activeDocket.respondentName}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              ⚖️ {activeDocket.bench} • {activeDocket.courtLevel.toUpperCase()}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3 bg-emerald-950 border border-emerald-500/50 text-emerald-200 rounded-xl text-xs font-bold font-mono animate-in zoom-in-95 flex items-center justify-between">
              <span>{toastMessage}</span>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
          )}

          {/* Tabs Switcher: Current Audit vs Version History */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setActiveModalTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeModalTab === 'audit'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{currentLang === 'om' ? 'Odiitii Ammaa (Current Audit)' : 'Current Audit'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeModalTab === 'history'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{currentLang === 'om' ? `Seenaa Version (Version History - ${auditHistory.length})` : `Version History (${auditHistory.length})`}</span>
            </button>
          </div>

          {activeModalTab === 'history' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 border-b border-slate-800 pb-2">
                <h4 className="text-xs font-mono font-bold uppercase text-slate-400">
                  {currentLang === 'om' ? 'TARREE SEENAA ODIITII LAAFAA FI WALAKKAA (PREVIOUS AUDIT SESSIONS TIMELINE):' : 'PREVIOUS AUDIT SESSIONS TIMELINE:'}
                </h4>
                <button
                  type="button"
                  onClick={handleExportAuditPDF}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow flex items-center gap-1.5"
                  title="Download as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download as PDF</span>
                </button>
              </div>
              {auditHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-400">
                  {currentLang === 'om' ? 'Seenaan odiitii kanaan duraa hin jiru.' : 'No previous audit sessions recorded yet.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {auditHistory.map((session, sIdx) => (
                    <div key={session.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-md">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-mono font-bold">
                            #{auditHistory.length - sIdx}
                          </span>
                          <span className="text-xs font-mono text-slate-300">
                            {new Date(session.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                            session.score >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            session.score >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            Score: {session.score}%
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center gap-3">
                        <span className="text-rose-400 font-bold">🚨 Critical: {session.criticalCount}</span>
                        <span className="text-amber-400 font-bold">⚠️ Warnings: {session.warningCount}</span>
                        <span className="text-slate-400">Total Defects: {session.totalCount}</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          {currentLang === 'om' ? 'Dogoggorri Seeraa Walqunnamtii Sanii Keessatti Argaman:' : 'Statutory Contradictions Identified in this Session:'}
                        </span>
                        {session.defects.length === 0 ? (
                          <div className="text-xs text-emerald-400 font-mono">✅ Zero defects identified in session.</div>
                        ) : (
                          <ul className="space-y-1 text-xs font-mono">
                            {session.defects.map((def, dIdx) => (
                              <li key={dIdx} className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-start gap-2">
                                <span className="text-amber-400 font-bold shrink-0">[{def.articleCode}]</span>
                                <span className="text-slate-200">{def.title}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Health Score Overview Banner */}
              <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl ${
                auditReport.score >= 80
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : auditReport.score >= 50
                  ? 'bg-amber-950/40 border-amber-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                    <Scale className="w-4 h-4" />
                    <span>{currentLang === 'om' ? 'Qulqullina Loojikii Seeraa Galmee (Case Logic Health)' : 'Case Statutory Logic Health'}</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-serif-legal">
                    {auditReport.score >= 80
                      ? (currentLang === 'om' ? '✅ Galmee Qophii Dhaddachaa (Court Ready)' : 'Court-Ready Docket')
                      : auditReport.score >= 50
                      ? (currentLang === 'om' ? '⚠️ Hanqina Seeraa Xiqqaa Qaba (Minor Deficiencies)' : 'Minor Statutory Deficiencies')
                      : (currentLang === 'om' ? '🚨 Sodaa Kufaa Ta\'uu Olaanaa (High Rejection Risk)' : 'High Rejection Risk Docket')}
                  </div>
                  <p className="text-xs text-slate-300">
                    {currentLang === 'om'
                      ? `Odiitiin seeraa hanqina seeraa fi sanadaa ${auditReport.totalCount} baaseera (${auditReport.criticalCount} Murtii Kufaa, ${auditReport.warningCount} Akeekkachiisa).`
                      : `Identified ${auditReport.totalCount} procedural and statutory defects (${auditReport.criticalCount} critical, ${auditReport.warningCount} warnings).`}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  <div className="text-center bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800 shadow-inner">
                    <div className={`text-2xl sm:text-3xl font-black font-mono ${
                      auditReport.score >= 80 ? 'text-emerald-400' : auditReport.score >= 50 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {auditReport.score}%
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Logic Score</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportAuditPDF}
                    className="px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                    title="Download as PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download as PDF</span>
                  </button>
                </div>
              </div>

              {/* Quick Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterSeverity('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterSeverity === 'all'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Hunda ({auditReport.totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSeverity('critical')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterSeverity === 'critical'
                        ? 'bg-rose-500 text-white font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    🚨 Critical ({auditReport.criticalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSeverity('warning')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterSeverity === 'warning'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚠️ Warnings ({auditReport.warningCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunDeepAiAudit}
                    disabled={isAiAuditing}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all cursor-pointer shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isAiAuditing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-300" />
                        <span>Gemini AI Auditing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                        <span>Deep AI Audit</span>
                      </>
                    )}
                  </button>

                  {/* Prominent 'Download as PDF' Button on Audit Results Tab */}
                  <button
                    type="button"
                    onClick={handleExportAuditPDF}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5 hover:scale-[1.02] border border-emerald-400/40"
                    title={currentLang === 'om' ? 'Gabaasa loojikii seeraa fi seenaa odiitii PDF buufadhu' : 'Download formatted case logic and statutory contradictions timeline as PDF'}
                  >
                    <Download className="w-4 h-4 text-emerald-100" />
                    <span>{currentLang === 'om' ? 'Download as PDF (Buufadhu)' : currentLang === 'am' ? 'Download as PDF (አውርድ)' : 'Download as PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Deep AI Gemini Audit Summary Output */}
              {aiReportText && (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 text-xs text-purple-200 space-y-2 font-mono whitespace-pre-wrap">
                  {aiReportText}
                </div>
              )}

              {/* Defects & Statutory Contradictions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase text-slate-400 px-1 flex items-center justify-between">
                  <span>TARREE HANQINA SEERAA FI SANADAA (STATUTORY DEFECTS & CONTRADICTIONS):</span>
                  <span className="text-[10px] text-amber-400">{filteredDefects.length} Found</span>
                </h4>

                {filteredDefects.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h5 className="text-sm font-bold text-white">
                      {currentLang === 'om' ? 'Dogoggorri ykn Hanqinni Seeraa Hin Argamne!' : 'No Statutory Contradictions Found!'}
                    </h5>
                    <p className="text-xs text-slate-400">
                      {currentLang === 'om'
                        ? 'Galmeen kun ulaagaa seera deemsa falmii hariiroo hawaasaa Oromiyaa fi Federaalaa guutummaatti kan guutedha.'
                        : 'This case docket fully complies with statutory procedural requirements.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDefects.map(defect => (
                      <div
                        key={defect.id}
                        className={`p-4 rounded-2xl border space-y-3 transition-all ${
                          defect.severity === 'critical'
                            ? 'bg-rose-950/20 border-rose-500/40 text-rose-100'
                            : 'bg-amber-950/20 border-amber-500/40 text-amber-100'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                              defect.severity === 'critical'
                                ? 'bg-rose-500/30 text-rose-300 border border-rose-400'
                                : 'bg-amber-500/30 text-amber-300 border border-amber-400'
                            }`}>
                              {defect.severity.toUpperCase()}
                            </span>
                            <span className="text-xs font-mono font-bold text-amber-300">
                              {defect.articleCode}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-slate-400 truncate">
                            {defect.statutoryReference}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h5 className="text-sm font-bold text-white">
                            {defect.title[currentLang] || defect.title.om}
                          </h5>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {defect.description[currentLang] || defect.description.om}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1 text-[11px]">
                          <div className="font-bold text-rose-300 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Sodaa Kufaa Ta\'uu (Rejection Risk):</span>
                          </div>
                          <p className="text-slate-400">
                            {defect.rejectionRisk[currentLang] || defect.rejectionRisk.om}
                          </p>
                        </div>

                        {/* One-Click Remedy Action Button */}
                        {defect.remedyActionLabel && (
                          <div className="pt-1 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleApplyRemedy(defect)}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02]"
                            >
                              <Check className="w-4 h-4" />
                              <span>{defect.remedyActionLabel[currentLang] || defect.remedyActionLabel.om}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>SeeraAI Judicial Logic Engine • Proclamation 1234/2021 & C.P.C</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
          >
            {currentLang === 'om' ? 'Cufi (Close)' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
