/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Language } from '../i18n/translations';
import { applyCourtWatermarkToPDF, WatermarkOptions } from './watermarkService';

export interface CaseMilestoneItem {
  stepNumber: number;
  stageName: string;
  stageCode: string;
  date: string;
  status: 'completed' | 'current' | 'pending';
  details: string;
  legalBasis?: string;
}

export interface CaseSummaryData {
  id: string;
  caseNumber: string;
  title: string;
  filingDate: string;
  type: string;
  author: string;
  status: string;
  isVerified?: boolean;
  courtName?: string;
  bench?: string;
  signatures?: string[];
  hearingDate?: string;
  closedDate?: string;
  stage?: string;
  stageProperties?: {
    currentStage?: string;
    isHearingActive?: boolean;
    decisionDrafted?: boolean;
    decisionApproved?: boolean;
    partiesNotified?: boolean;
  };
  progressHistory?: CaseMilestoneItem[];
}

/**
 * Builds standard procedural progress milestones based on case status and dates
 */
export function buildCaseProgressHistory(data: CaseSummaryData, lang: Language = 'om'): CaseMilestoneItem[] {
  const isClosed = data.status === 'Closed' || data.stage === 'closed';
  const isHearing = data.status === 'Hearing' || data.stage === 'hearing' || Boolean(data.hearingDate);
  const isReview = data.status === 'Pending Review' || data.stage === 'review';

  if (lang === 'am') {
    return [
      {
        stepNumber: 1,
        stageName: 'የክስ አቤቱታ እና ምዝገባ (Filing & Pleadings)',
        stageCode: 'PLEADINGS',
        date: data.filingDate || '2026-10-12',
        status: 'completed',
        details: 'የመጀመሪያ ክስ እና የተያያዙ ማስረጃዎች በማህደር ተመዝግበዋል።',
        legalBasis: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ ቁ. 80 እና 222',
      },
      {
        stepNumber: 2,
        stageName: 'የመጥሪያ እና የመጀመሪያ ግምገማ (Review & Summons)',
        stageCode: 'REVIEW',
        date: data.filingDate ? getOffsetDate(data.filingDate, 3) : '2026-10-15',
        status: isReview || isHearing || isClosed ? 'completed' : 'current',
        details: data.stageProperties?.partiesNotified
          ? 'ለተከሳሽ ጥሪ ተላልፎ መልስ እንዲቀርብ ታዟል።'
          : 'ሰነዶች በሬጅስትራር እየተመረመሩ ይገኛሉ።',
        legalBasis: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ ቁ. 95 እና 244',
      },
      {
        stepNumber: 3,
        stageName: 'የችሎት ክርክር እና የጭብጥ አመራረጥ (Hearing & Trial)',
        stageCode: 'HEARING',
        date: data.hearingDate || (data.filingDate ? getOffsetDate(data.filingDate, 7) : '2026-10-20'),
        status: isClosed ? 'completed' : isHearing ? 'current' : 'pending',
        details: isHearing
          ? 'ጭብጥ ተይዞ የሰው እና የሰነድ ማስረጃዎች በችሎት እየተደመጡ ነው።'
          : 'የችሎት ቀጠሮ በመጠባበቅ ላይ ይገኛል።',
        legalBasis: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ ቁ. 246 - 257',
      },
      {
        stepNumber: 4,
        stageName: 'የመጨረሻ ውሳኔ እና ማህደር መዝጋት (Judgment & Disposition)',
        stageCode: 'CLOSED',
        date: data.closedDate || (isClosed ? '2026-10-16' : 'በመጠባበቅ ላይ'),
        status: isClosed ? 'completed' : 'pending',
        details: isClosed
          ? 'የዳኝነት ውሳኔ ተሰጥቶ በማህደር ጸድቋል፤ መዝገቡ ተዘግቷል።'
          : 'የውሳኔ ረቂቅ እና ማጽደቅ ሂደት ይቀራል።',
        legalBasis: 'የፍትሐብሔር ሥነ-ሥርዓት ሕግ ቁ. 180 እና 183',
      },
    ];
  }

  // Afaan Oromoo / Default
  return [
    {
      stepNumber: 1,
      stageName: 'Iyyannoo Himannaa & Galmeessuu (Filing & Pleadings)',
      stageCode: 'PLEADINGS',
      date: data.filingDate || '2026-10-12',
      status: 'completed',
      details: 'Himannaan jalqabaa fi ragaaleen dhiyaatan galmee qajeelchaatti galmaa\'aniiru.',
      legalBasis: 'SDFHH Kwt 80 & 222',
    },
    {
      stepNumber: 2,
      stageName: 'Qorannoo Sanadaa & Waamicha (Review & Summons)',
      stageCode: 'REVIEW',
      date: data.filingDate ? getOffsetDate(data.filingDate, 3) : '2026-10-15',
      status: isReview || isHearing || isClosed ? 'completed' : 'current',
      details: data.stageProperties?.partiesNotified
        ? 'Waamichi himatamaa ergamee deebiin akka dhiyaatu beellamameera.'
        : 'Sanadoonni seera qabeessummaan isaanii qoratamaa jiru.',
      legalBasis: 'SDFHH Kwt 95 & 244',
    },
    {
      stepNumber: 3,
      stageName: 'Dhaddacha & Qorannoo Ragaalee (Hearing & Trial Proceedings)',
      stageCode: 'HEARING',
      date: data.hearingDate || (data.filingDate ? getOffsetDate(data.filingDate, 7) : '2026-10-20'),
      status: isClosed ? 'completed' : isHearing ? 'current' : 'pending',
      details: isHearing
        ? 'Ijoon falmii qabamee dhaddachi ragaalee namaa fi sanadaa dhaggeeffachaa jira.'
        : 'Dhaddachaaf beellamni eeggamaa jira.',
      legalBasis: 'SDFHH Kwt 246 - 257',
    },
    {
      stepNumber: 4,
      stageName: 'Murtii Dhumaa & Cufama Galmee (Final Judgment & Closure)',
      stageCode: 'CLOSED',
      date: data.closedDate || (isClosed ? '2026-10-16' : 'Eeggachaa Jira'),
      status: isClosed ? 'completed' : 'pending',
      details: isClosed
        ? 'Murtiin dhumaa kennamee chaappaan mana murtiitiin galmeen cufeera.'
        : 'Wixineen murtii fi mallattoon dhaddachaa hin xumuramne.',
      legalBasis: 'SDFHH Kwt 180 & 183',
    },
  ];
}

function getOffsetDate(baseDate: string, daysToAdd: number): string {
  try {
    const d = new Date(baseDate);
    if (isNaN(d.getTime())) return baseDate;
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().slice(0, 10);
  } catch {
    return baseDate;
  }
}

/**
 * Formatted plain text export suitable for sharing or archival text files
 */
export function generateCaseSummaryText(data: CaseSummaryData, lang: Language = 'om'): string {
  const courtName = data.courtName || 'MANA MURTII AANAA ADAAMAA / ADAMA WOREDA COURT';
  const bench = data.bench || 'Dhaddacha Hariiroo Hawaasaa (Civil Bench)';
  const history = data.progressHistory || buildCaseProgressHistory(data, lang);
  const now = new Date().toISOString();

  const divider = '='.repeat(72);
  const subDivider = '-'.repeat(72);

  const lines: string[] = [
    divider,
    `⚖️  SEERAAI - OFFICIAL COURT CASE SUMMARY & DOSSIER`,
    `   SIRNA GUDUUNFAA GALMEE FI ADEEMSA HOJII MANA MURTII`,
    divider,
    `Institution : ${courtName}`,
    `Bench / Div : ${bench}`,
    `Generated   : ${now}`,
    `Archive ID  : SEERA-ARCHIVE-${data.id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    subDivider,
    `1. METADATA GALMEE (CASE METADATA)`,
    subDivider,
    `  • Lakkoofsa Galmee (Case No.)   : ${data.caseNumber}`,
    `  • Mata-duree (Case Title)       : ${data.title}`,
    `  • Guyyaa Galmaa'e (Filing Date) : ${data.filingDate}`,
    `  • Gosa Galmee (Document Type)   : ${data.type}`,
    `  • Qopheessaa / Abbaa Alangaa    : ${data.author}`,
    `  • Haala Ammaa (Workflow Status) : ${data.status}`,
    `  • Mirkaneessa (Verification)    : ${data.isVerified ? 'VERIFIED (Chaappaan Mirkanaa\'eera)' : 'PENDING REVIEW'}`,
    `  • Beellama Dhaddachaa (Hearing) : ${data.hearingDate || 'Hin murtoofne (N/A)'}`,
    `  • Guyyaa Cufame (Closed Date)   : ${data.closedDate || (data.status === 'Closed' ? 'Closed' : 'Active / In Progress')}`,
    data.signatures && data.signatures.length > 0
      ? `  • Mallattoolee (Signatures)     : ${data.signatures.join(' | ')}`
      : `  • Mallattoo Abbaa Seeraa        : Mirkanaa'eera (Official Digital Registry)`,
    subDivider,
    `2. ADEEMSA HOJII FI SEENA GALMEE (PROGRESS HISTORY & MILESTONES)`,
    subDivider,
  ];

  history.forEach((item) => {
    const statusIcon = item.status === 'completed' ? '[✓ COMPLETED]' : item.status === 'current' ? '[⏳ IN PROGRESS]' : '[○ PENDING]';
    lines.push(`  Step ${item.stepNumber}: ${item.stageName}`);
    lines.push(`    Status      : ${statusIcon}`);
    lines.push(`    Date        : ${item.date}`);
    if (item.legalBasis) {
      lines.push(`    Legal Basis : ${item.legalBasis}`);
    }
    lines.push(`    Details     : ${item.details}`);
    lines.push('');
  });

  lines.push(
    subDivider,
    `3. MIRKANEESSA SEERAA (LEGAL CERTIFICATION & NOTICE)`,
    subDivider,
    `Sanadni guduunfaa kun bu'uura galmee SeeraAI fi qajeelfama mana murtichaatiin`,
    `sirna kompiitaraan qophaa'ee kan bahedha. Ragaan kun galmee qulqullaa'aa`,
    `dhaddachaa waliin wal-qixa seera qabeessummaa qabaata.`,
    ``,
    `  Galmeessaa Dhaddachaa (Registrar): ________________________`,
    `  Abbaa Seeraa Dura Taa'aa (Judge)  : ________________________`,
    `  Chaappaa Mana Murtii (Official Stamp): [ SEAL CERTIFIED ]`,
    divider
  );

  return lines.join('\n');
}

/**
 * Generates an official, beautifully styled PDF document for case archiving
 */
export function generateCaseSummaryPDF(data: CaseSummaryData, lang: Language = 'om', watermarkOptions?: WatermarkOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const courtName = (data.courtName || 'MANA MURTII AANAA ADAAMAA').toUpperCase();
  const benchName = data.bench || 'Dhaddacha Dhimma Hariiroo Hawaasaa (Civil Division)';
  const history = data.progressHistory || buildCaseProgressHistory(data, lang);

  // Outer decorative border
  doc.setDrawColor(217, 119, 6); // Amber border
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(15, 23, 42); // Deep slate inner line
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

  // Top header banner box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(10, 10, pageWidth - 20, 24, 'F');

  // Emblem and Title
  doc.setTextColor(245, 158, 11); // Amber
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(courtName, pageWidth / 2, 17, { align: 'center' });

  doc.setTextColor(203, 213, 225); // Slate-300
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(benchName, pageWidth / 2, 23, { align: 'center' });
  doc.text('SEERAAI - SIRNA IJAARSA FI GUDUUNFAA GALMEE MANA MURTII', pageWidth / 2, 28, { align: 'center' });

  // Document Title Banner
  doc.setFillColor(245, 158, 11); // Amber bar
  doc.rect(10, 34, pageWidth - 20, 7, 'F');
  doc.setTextColor(15, 23, 42); // Dark text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    lang === 'am'
      ? 'የክስ ማጠቃለያ እና የሂደት ሰነድ (CASE SUMMARY & PROGRESS DOSSIER)'
      : 'GABATEE GUDUUNFAA GALMEE FI ADEEMSA HOJII (CASE SUMMARY & PROGRESS DOSSIER)',
    pageWidth / 2,
    38.8,
    { align: 'center' }
  );

  let currentY = 46;

  // Case Metadata Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. ODUU FI METADATA GALMEE (CASE METADATA):', 14, currentY);
  currentY += 3;

  const metadataRows = [
    [
      { content: 'Lakkoofsa Galmee (Case No.):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.caseNumber, styles: { fontStyle: 'bold' as const, textColor: [180, 83, 9] as [number, number, number] } },
      { content: 'Gosa Galmee (Type):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.type },
    ],
    [
      { content: 'Mata-Duree (Case Title):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.title, colSpan: 3 },
    ],
    [
      { content: 'Guyyaa Galmaa\'e (Filing Date):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.filingDate },
      { content: 'Qopheessaa (Author / Officer):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.author },
    ],
    [
      { content: 'Haala Hojii (Workflow Status):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { 
        content: data.status, 
        styles: { 
          fontStyle: 'bold' as const, 
          textColor: (data.status === 'Closed' ? [16, 185, 129] : [217, 119, 6]) as [number, number, number],
        } 
      },
      { content: 'Mirkaneessa (Verification):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.isVerified ? 'VERIFIED (Chaappaa Qaba)' : 'Pending Review' },
    ],
    [
      { content: 'Beellama Dhaddachaa (Hearing Date):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.hearingDate || 'Hin Murtoofne (N/A)' },
      { content: 'Guyyaa Cufamaa (Closed Date):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.closedDate || (data.status === 'Closed' ? 'Closed' : 'Active / In Progress') },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    body: metadataRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 47 },
      2: { cellWidth: 46 },
      3: { cellWidth: 47 },
    },
    margin: { left: 12, right: 12 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 2. Progress History & Procedural Milestones Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. ADEEMSA HOJII FI SEENA GALMEE (PROGRESS HISTORY & MILESTONES):', 14, currentY);
  currentY += 3;

  const milestoneRows = history.map((m) => [
    `Sad. ${m.stepNumber}`,
    m.stageName,
    m.date,
    m.legalBasis || 'SDFHH',
    m.status.toUpperCase(),
    m.details,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Sadarkaa', 'Adeemsa Hojii (Stage)', 'Guyyaa (Date)', 'Bu\'uura Seeraa', 'Haala (Status)', 'Qabiyyee fi Ibsa (Details)']],
    body: milestoneRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [245, 158, 11],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 26 },
      4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 64 },
    },
    margin: { left: 12, right: 12 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Signatures, Stamp & Archival Certification Section
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(12, currentY, pageWidth - 12, currentY);
  currentY += 5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. MIRKANEESSA CHARTER MANA MURTII (OFFICIAL ATTESTATION & SIGNATURES):', 14, currentY);
  currentY += 6;

  // Left Signature Block
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Galmeessaa Dhaddachaa (Court Registrar):', 16, currentY);
  doc.text('Maqaa: ________________________________', 16, currentY + 6);
  doc.text('Mallattoo: ____________________________', 16, currentY + 12);
  doc.text(`Guyyaa: ${new Date().toISOString().slice(0, 10)}`, 16, currentY + 18);

  // Center Stamp Seal
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.6);
  doc.circle(pageWidth / 2, currentY + 10, 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('CHAAPPAA SEERAA', pageWidth / 2, currentY + 8, { align: 'center' });
  doc.text('OFFICIAL SEAL', pageWidth / 2, currentY + 12, { align: 'center' });
  doc.text('SEERAAI VERIFIED', pageWidth / 2, currentY + 15, { align: 'center' });

  // Right Signature Block
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('Abbaa Seeraa Dhaddachaa (Presiding Judge):', 125, currentY);
  doc.text(`Maqaa: ${data.author || 'Abbaa Seeraa'}`, 125, currentY + 6);
  doc.text('Mallattoo: ____________________________', 125, currentY + 12);
  doc.text('Koodii Mirkaneessaa: SEERA-VER-' + data.id.toUpperCase(), 125, currentY + 18);

  // Footer Disclaimer
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Guduunfaan kun seera qabeessummaan kan bahe bu\'uura galmee seeraa SeeraAI tiin. Eegumsa mirga abbaa qabeenyummaa fi iccitii eeguun dhimma mana murtii qofaaf oola.',
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  // Apply dynamic server-side / court session watermark
  applyCourtWatermarkToPDF(doc, {
    courtName: data.courtName,
    userName: data.author,
    ...watermarkOptions,
  });

  return doc;
}

/**
 * Triggers automatic browser download of the case summary PDF
 */
export function downloadCaseSummaryPDF(data: CaseSummaryData, lang: Language = 'om', watermarkOptions?: WatermarkOptions): void {
  const doc = generateCaseSummaryPDF(data, lang, watermarkOptions);
  const cleanCaseNo = data.caseNumber.replace(/[\/\\]/g, '_').replace(/\s+/g, '_');
  doc.save(`SeeraAI_Case_Summary_${cleanCaseNo}.pdf`);
}

/**
 * Triggers automatic browser download of the case summary Plain Text format
 */
export function downloadCaseSummaryText(data: CaseSummaryData, lang: Language = 'om'): void {
  const text = generateCaseSummaryText(data, lang);
  const cleanCaseNo = data.caseNumber.replace(/[\/\\]/g, '_').replace(/\s+/g, '_');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `SeeraAI_Case_Summary_${cleanCaseNo}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a consolidated batch summary for multiple selected cases as PDF
 */
export function downloadBatchCaseSummariesPDF(items: CaseSummaryData[], lang: Language = 'om'): void {
  if (items.length === 0) return;
  items.forEach(item => downloadCaseSummaryPDF(item, lang));
}

/**
 * Generates and downloads a consolidated batch summary for multiple selected cases as TXT
 */
export function downloadBatchCaseSummariesText(items: CaseSummaryData[], lang: Language = 'om'): void {
  if (items.length === 0) return;
  const textBundle = items.map((item, idx) => {
    return `[CASE RECORD ${idx + 1} OF ${items.length}]\n` + generateCaseSummaryText(item, lang) + '\n';
  }).join('\n' + '='.repeat(72) + '\n\n');

  const blob = new Blob([textBundle], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `SeeraAI_Batch_Case_Summaries_${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CaseBriefData {
  id: string;
  caseNumber: string;
  title: string;
  claimantName?: string;
  respondentName?: string;
  claimSubject?: string;
  filingDate: string;
  type?: string;
  courtName?: string;
  benchId?: string;
  benchName?: string;
  assignedJudge?: string;
  assignedJudges?: string[];
  priority?: string;
  status: string;
  notes?: string;
  activityLogs?: { title: string; description: string; performedBy: string; timestamp: string }[];
  courtOrders?: { orderRefNo: string; orderTitle: string; issuedAt: string; status: string }[];
}

/**
 * Generates an official, beautifully styled Case Brief PDF document for legal review
 */
export function generateCaseBriefPDF(brief: CaseBriefData, lang: Language = 'om', watermarkOptions?: WatermarkOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const courtName = (brief.courtName || 'MANA MURTII AANAA ADAAMAA').toUpperCase();
  const benchName = brief.benchName || 'Dhaddacha Hariiroo Hawaasaa (Civil Bench)';

  // Outer decorative border
  doc.setDrawColor(217, 119, 6); // Amber border
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(15, 23, 42); // Deep slate inner line
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

  // Header Banner Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(10, 10, pageWidth - 20, 24, 'F');

  doc.setTextColor(245, 158, 11); // Amber
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(courtName, pageWidth / 2, 17, { align: 'center' });

  doc.setTextColor(203, 213, 225); // Slate-300
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(benchName, pageWidth / 2, 23, { align: 'center' });
  doc.text('SEERAAI - OFFICIAL CASE BRIEF FOR LEGAL REVIEW', pageWidth / 2, 28, { align: 'center' });

  // Document Sub-title Bar
  doc.setFillColor(245, 158, 11); // Amber bar
  doc.rect(10, 34, pageWidth - 20, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    lang === 'am'
      ? 'የክስ አጭር መግለጫ እና የሕግ ትንተና (OFFICIAL LEGAL CASE BRIEF)'
      : 'GUDUUNFAA QAACILAA FI WARAQAA DEEGGARSAA SEERAA (OFFICIAL LEGAL CASE BRIEF)',
    pageWidth / 2,
    38.8,
    { align: 'center' }
  );

  let currentY = 46;

  // Section 1: Core Case & Parties Summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. GAHEE QAAMOLEE FI RAMADDII DHADDACHAA (PARTIES & BENCH DOSSIER):', 14, currentY);
  currentY += 3;

  const judgesText = brief.assignedJudges && brief.assignedJudges.length > 0 
    ? brief.assignedJudges.join(', ')
    : (brief.assignedJudge || 'Pending Assignment');

  const partiesRows = [
    [
      { content: 'Lakk. Galmee (Case No.):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: brief.caseNumber, styles: { fontStyle: 'bold' as const, textColor: [180, 83, 9] as [number, number, number] } },
      { content: 'Sadarkaa Ariifannaa (Priority):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: (brief.priority || 'Medium').toUpperCase(), styles: { fontStyle: 'bold' as const, textColor: (brief.priority?.toLowerCase() === 'urgent' ? [225, 29, 72] : [180, 83, 9]) as [number, number, number] } },
    ],
    [
      { content: 'Himataa (Plaintiff / Claimant):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: brief.claimantName || 'Obbo Kabbadaa Mulaatuu' },
      { content: 'Himatamaa (Respondent):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: brief.respondentName || 'Adde Tsaggaaye Waaqgari' },
    ],
    [
      { content: 'Dhaddacha (Assigned Bench):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: benchName },
      { content: 'Abbaa Seeraa / Koree (Judge):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: judgesText },
    ],
    [
      { content: 'Guyyaa Galmaa\'e (Filing Date):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: brief.filingDate },
      { content: 'Haala Ammaa (Current Stage):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: brief.status, styles: { fontStyle: 'bold' as const, textColor: [16, 185, 129] as [number, number, number] } },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    body: partiesRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 47 },
      2: { cellWidth: 46 },
      3: { cellWidth: 47 },
    },
    margin: { left: 12, right: 12 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Section 2: Statement of Claim & Facts Brief
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. QABXIILII FALMII FI QULQULLINA SUTEE (STATEMENT OF CLAIM & BRIEF):', 14, currentY);
  currentY += 3;

  const claimBriefText = brief.claimSubject || brief.title;
  const notesText = brief.notes || 'Galmeen kun bu\'uura SDFHH kwt 80 tiin galmaa\'ee, sakatta\'iinsa seeraa fi ragaalee dhihaatan irratti hundaa\'ee xiinxalamaa jira.';

  autoTable(doc, {
    startY: currentY,
    head: [['Dhimma Ijoo Falmii (Subject & Grounds)', 'Yaada Seeraa & Hubachiisa (Legal Context & Notes)']],
    body: [[claimBriefText, notesText]],
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [245, 158, 11],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 93 },
      1: { cellWidth: 93 },
    },
    margin: { left: 12, right: 12 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Section 3: Timestamped Activity Logs & Procedural History
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. SEENAA TARKAANFII FI SEENA GALMEE (TIMESTAMPED ACTIVITY LOGS):', 14, currentY);
  currentY += 3;

  const logsData = brief.activityLogs && brief.activityLogs.length > 0
    ? brief.activityLogs.map(l => [
        new Date(l.timestamp).toISOString().slice(0, 16).replace('T', ' '),
        l.title,
        l.performedBy,
        l.description
      ])
    : [
        [new Date(brief.filingDate).toISOString().slice(0, 10), 'Galmeen Baname', 'Ofiisara Seeraa', `Himannaan lakk. ${brief.caseNumber} galmaa'ee jira.`],
        [new Date().toISOString().slice(0, 10), 'Dhaddachatti Ramadame', 'Qindeessaa KTAS', `Abbaa Seeraa (${judgesText}) tiif ramadameera.`]
      ];

  autoTable(doc, {
    startY: currentY,
    head: [['Guyyaa & Sa\'aatii', 'Tarkaanfii (Action)', 'Raawwataa', 'Ibsa Raawwii (Description)']],
    body: logsData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [245, 158, 11],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center' },
      1: { cellWidth: 42 },
      2: { cellWidth: 32 },
      3: { cellWidth: 80 },
    },
    margin: { left: 12, right: 12 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Signature Block & Legal Certification
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(12, currentY, pageWidth - 12, currentY);
  currentY += 5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. MIRKANEESSA OGUMMAA SEERAA (LEGAL REVIEW ATTESTATION):', 14, currentY);
  currentY += 6;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Qorataa Seeraa / Legal Analyst:', 16, currentY);
  doc.text('Maqaa: ________________________________', 16, currentY + 6);
  doc.text('Mallattoo: ____________________________', 16, currentY + 12);

  doc.text('Presiding Judge / Bench Chair:', 125, currentY);
  doc.text(`Maqaa: ${judgesText.split(',')[0]}`, 125, currentY + 6);
  doc.text('Mallattoo: ____________________________', 125, currentY + 12);

  // Apply Court Watermark
  applyCourtWatermarkToPDF(doc, {
    courtName: brief.courtName,
    userName: judgesText.split(',')[0],
    ...watermarkOptions,
  });

  return doc;
}

export function downloadCaseBriefPDF(brief: CaseBriefData, lang: Language = 'om', watermarkOptions?: WatermarkOptions): void {
  const doc = generateCaseBriefPDF(brief, lang, watermarkOptions);
  const cleanCaseNo = brief.caseNumber.replace(/[\/\\]/g, '_').replace(/\s+/g, '_');
  doc.save(`SeeraAI_Case_Brief_${cleanCaseNo}.pdf`);
}

export interface CaseWorkHistoryPDFData {
  caseNumber: string;
  claimSubject?: string;
  courtName?: string;
  benchName?: string;
  filingDate?: string;
  legalOfficerName?: string;
  legalOfficerRole?: string;
  assignedJudgeName?: string;
  assignedJudgeBench?: string;
  activityLogs: {
    title: string;
    description: string;
    performedBy: string;
    performedByRole?: string;
    timestamp: string;
    action?: string;
  }[];
}

export function generateCaseWorkHistoryPDF(data: CaseWorkHistoryPDFData, lang: Language = 'om', watermarkOptions?: WatermarkOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const courtName = (data.courtName || 'MANA MURTII AANAA ADAAMAA / OROMIA COURT').toUpperCase();
  const benchName = data.benchName || 'Dhaddacha Hariiroo Hawaasaa (Civil Bench)';

  // Decorative border
  doc.setDrawColor(217, 119, 6); // Amber border
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(15, 23, 42); // Deep slate inner line
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

  // Top header banner box
  doc.setFillColor(15, 23, 42);
  doc.rect(10, 10, pageWidth - 20, 24, 'F');

  // Emblem graphics & Court Logo Title
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`${courtName}`, pageWidth / 2, 17, { align: 'center' });

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(benchName, pageWidth / 2, 23, { align: 'center' });
  doc.text('SEERAAI - OFFICIAL CASE WORK HISTORY & AUDIT TRAIL', pageWidth / 2, 28, { align: 'center' });

  // Document Title Banner
  doc.setFillColor(245, 158, 11);
  doc.rect(10, 34, pageWidth - 20, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    lang === 'am'
      ? 'የክስ ሥራ ሂደት እና የዳኞች እንቅስቃሴ መዝገብ (OFFICIAL CASE WORK HISTORY)'
      : 'WARAQAA SEENAA HOJII GALMEE FI HOJII ABBAA SEERAA (CASE WORK HISTORY DOSSIER)',
    pageWidth / 2,
    38.8,
    { align: 'center' }
  );

  let currentY = 46;

  // Section 1: Personnel & Case Overview
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. ODEEFFANNOO GALMEE FI OFIISARA SEERAA / ABBAA SEERAA:', 14, currentY);
  currentY += 3;

  const personnelRows = [
    [
      { content: 'Lakk. Galmee (Case No.):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.caseNumber, styles: { fontStyle: 'bold' as const, textColor: [180, 83, 9] as [number, number, number] } },
      { content: 'Guyyaa Galmaa\'e:', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.filingDate || new Date().toISOString().slice(0, 10) },
    ],
    [
      { content: 'Dhimma Galmee (Subject):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: data.claimSubject || 'Dhimma Falmii Hariiroo Hawaasaa', colSpan: 3 },
    ],
    [
      { content: 'Ofiisara Seeraa (Legal Officer):', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `${data.legalOfficerName || 'Ofiisara Seeraa'} (${data.legalOfficerRole || 'Registrar/Officer'})` },
      { content: 'Abbaa Seeraa Ramadame:', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `${data.assignedJudgeName || 'Abbaa Seeraa'} (${data.assignedJudgeBench || benchName})`, styles: { fontStyle: 'bold' as const, textColor: [16, 185, 129] as [number, number, number] } },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    body: personnelRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 47 },
      2: { cellWidth: 46 },
      3: { cellWidth: 47 },
    },
    margin: { left: 12, right: 12 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Section 2: Chronological Activity Log for both Legal Officer and Judge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. TARREE HOJIILEI OFIISARA SEERAA FI ABBAA SEERAA (WORK LOG TIMELINE):', 14, currentY);
  currentY += 3;

  const logsRows = data.activityLogs && data.activityLogs.length > 0
    ? data.activityLogs.map((log, idx) => {
        const dateStr = log.timestamp ? new Date(log.timestamp).toISOString().slice(0, 16).replace('T', ' ') : '2026-10-28';
        return [
          `${idx + 1}`,
          dateStr,
          log.title,
          `${log.performedBy}\n(${log.performedByRole || 'Staff'})`,
          log.description
        ];
      })
    : [
        ['1', new Date().toISOString().slice(0, 10), 'Himannaa Galmeessuu', `${data.legalOfficerName || 'Ofiisara Seeraa'}\n(Registrar)`, 'Himannaan banee dhaddachatti qajeelchameera.'],
        ['2', new Date().toISOString().slice(0, 10), 'Ramaddii Abbaa Seeraa', 'Qindeessaa KTAS\n(Coordinator)', `Abbaa Seeraa ${data.assignedJudgeName || 'Caalaa'} tiif ramadameera.`]
      ];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Guyyaa & Sa\'aatii', 'Mata Duree Hojii', 'Raawwataa (Officer/Judge)', 'Qabiyyee Hojii (Details)']],
    body: logsRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [245, 158, 11],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 32, halign: 'center' },
      2: { cellWidth: 40, fontStyle: 'bold' },
      3: { cellWidth: 38 },
      4: { cellWidth: 66 },
    },
    margin: { left: 12, right: 12 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  // Official Seal & Signature Section
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(12, currentY, pageWidth - 12, currentY);
  currentY += 5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. MIRKANEESSA CHARTER MANA MURTII (ATTESTATION & OFFICIAL SEAL):', 14, currentY);
  currentY += 6;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Ofiisara Seeraa / Registrar:', 16, currentY);
  doc.text(`Maqaa: ${data.legalOfficerName || 'Ofiisara Seeraa'}`, 16, currentY + 6);
  doc.text('Mallattoo: ____________________________', 16, currentY + 12);

  // Center Seal Graphic
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.6);
  doc.circle(pageWidth / 2, currentY + 8, 11);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('CHAAPPAA SEERAA', pageWidth / 2, currentY + 6, { align: 'center' });
  doc.text('MANA MURTII', pageWidth / 2, currentY + 10, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('Abbaa Seeraa Dhaddachaa (Presiding Judge):', 125, currentY);
  doc.text(`Maqaa: ${data.assignedJudgeName || 'Abbaa Seeraa'}`, 125, currentY + 6);
  doc.text('Mallattoo: ____________________________', 125, currentY + 12);

  applyCourtWatermarkToPDF(doc, {
    courtName: data.courtName,
    userName: data.assignedJudgeName || data.legalOfficerName,
    ...watermarkOptions,
  });

  return doc;
}

export function downloadCaseWorkHistoryPDF(data: CaseWorkHistoryPDFData, lang: Language = 'om', watermarkOptions?: WatermarkOptions): void {
  const doc = generateCaseWorkHistoryPDF(data, lang, watermarkOptions);
  const cleanCaseNo = data.caseNumber.replace(/[\/\\]/g, '_').replace(/\s+/g, '_');
  doc.save(`SeeraAI_Case_WorkHistory_${cleanCaseNo}.pdf`);
}

