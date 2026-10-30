import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Language } from '../i18n/translations';
import { applyCourtWatermarkToPDF } from './watermarkService';

export interface CourtTranscriptPdfOptions {
  caseNumber: string;
  caseTitle?: string;
  sessionTitle: string;
  sessionDate: string;
  sessionType: string;
  witnessName?: string;
  transcriptText: string;
  timestamps: { time: string; speaker: string; text: string }[];
  keyLegalTakeaways?: string[];
  courtName?: string;
  judgeName?: string;
  loggedBy?: string;
  isVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  currentLang?: Language;
}

/**
 * Exports ongoing courtroom session transcription logs to an official court PDF document.
 */
export function downloadCourtTranscriptPDF(options: CourtTranscriptPdfOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // 1. Official Header Top Double Line
  doc.setLineWidth(1);
  doc.setDrawColor(217, 119, 6); // Amber border
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 2;
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // 2. Court Institution Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  const courtHeading = options.courtName || 'MANA MURTII NAANNOO OROMIYAA / OROMIA REGIONAL COURT';
  doc.text(courtHeading, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('OFFICIAL COURTROOM SESSION TRANSCRIPT', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Waraabbata Jecha Ragaa fi Sagalee Dhaddachaa', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // 3. Metadata Header Card Table
  const metaRows = [
    [
      { content: `Case Number: ${options.caseNumber}`, styles: { fontStyle: 'bold' } },
      { content: `Session Date: ${options.sessionDate}`, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: `Session Title: ${options.sessionTitle}` },
      { content: `Session Type: ${options.sessionType.replace('_', ' ').toUpperCase()}` },
    ],
    [
      { content: `Witness / Deponent: ${options.witnessName || 'N/A'}` },
      { content: `Presiding Judge: ${options.judgeName || 'Honorable Bench Judge'}` },
    ],
    [
      { content: `Official Status: ${options.isVerified ? 'VERIFIED OFFICIAL COURT RECORD' : 'UNVERIFIED DRAFT'}` },
      { content: `Logged By: ${options.loggedBy || 'Court Registrar'}` },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    body: metaRows as any,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - margin * 2) / 2 },
      1: { cellWidth: (pageWidth - margin * 2) / 2 },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 4. Case Summary / Subject
  if (options.caseTitle) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Dhimma / Case Subject:', margin, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const splitTitle = doc.splitTextToSize(options.caseTitle, pageWidth - margin * 2);
    doc.text(splitTitle, margin, currentY);
    currentY += splitTitle.length * 4.5 + 4;
  }

  // 5. Full Transcript Summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('1. GABAASA JECHA RAGAA (TRANSCRIPT SUMMARY)', margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const splitSummary = doc.splitTextToSize(options.transcriptText, pageWidth - margin * 2);
  doc.text(splitSummary, margin, currentY);
  currentY += splitSummary.length * 4 + 6;

  // Page break check if needed
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = margin;
  }

  // 6. Verbatim Timestamped Dialogue Table
  if (options.timestamps && options.timestamps.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('2. WARAABBATA QAQQABIINSA YEROO (TIMESTAMPED VERBATIM DIALOGUE)', margin, currentY);
    currentY += 4;

    const tsTableHead = [['Time', 'Speaker', 'Verbatim Transcript Dialogue']];
    const tsTableData = options.timestamps.map((t) => [t.time, t.speaker, t.text]);

    autoTable(doc, {
      startY: currentY,
      head: tsTableHead,
      body: tsTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [15, 23, 42],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Page break check
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = margin;
  }

  // 7. Key Legal Takeaways
  if (options.keyLegalTakeaways && options.keyLegalTakeaways.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('3. QABXII SEERAA MURTEESSAA (KEY LEGAL TAKEAWAYS FOR JUDGE)', margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    options.keyLegalTakeaways.forEach((point) => {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margin;
      }
      const bulletText = `• ${point}`;
      const splitPoint = doc.splitTextToSize(bulletText, pageWidth - margin * 2 - 4);
      doc.text(splitPoint, margin + 2, currentY);
      currentY += splitPoint.length * 4 + 1.5;
    });
    currentY += 4;
  }

  // 8. Judicial Verification & Signature Seal
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = margin;
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('MIRKANEESSA SEERAA FI CHAAPPAA DHADDACHAA (JUDICIAL VERIFICATION & SEAL)', margin, currentY);
  currentY += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Waraabbanni jecha ragaa kun bu'uureffamuun galmee dhaddachaa lakk. ${options.caseNumber} keessatti mirkanaa'eera.`,
    margin,
    currentY
  );
  currentY += 12;

  // Signature columns
  const col1X = margin + 10;
  const col2X = pageWidth / 2 + 10;

  doc.line(col1X, currentY, col1X + 50, currentY);
  doc.line(col2X, currentY, col2X + 50, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Abbaa Seeraa / Bench Judge', col1X, currentY);
  doc.text('Katabaa / Registrar', col2X, currentY);
  currentY += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(options.judgeName || 'Official Bench Judge', col1X, currentY);
  doc.text(options.loggedBy || 'Court Registrar', col2X, currentY);

  // 9. Watermarking
  applyCourtWatermarkToPDF(doc, {
    text: 'OROMIA REGIONAL COURT OFFICIAL TRANSCRIPT',
    fontSize: 22,
    opacity: 0.08,
  });

  // 10. Save PDF
  const cleanCaseNo = options.caseNumber.replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `Court_Transcript_${cleanCaseNo}_${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Bulk exports all courtroom session logs for a given case into a unified master PDF document.
 */
export function downloadBatchCourtTranscriptsPDF(
  caseNumber: string,
  sessionLogs: CourtTranscriptPdfOptions[]
): void {
  if (!sessionLogs || sessionLogs.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  sessionLogs.forEach((log, index) => {
    if (index > 0) {
      doc.addPage();
    }

    let currentY = margin;

    // Header
    doc.setLineWidth(0.8);
    doc.setDrawColor(217, 119, 6);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(log.courtName || 'MANA MURTII NAANNOO OROMIYAA / OROMIA COURT', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(`MASTER COURTROOM TRANSCRIPT LOG - SESSION #${index + 1}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;

    // Table
    autoTable(doc, {
      startY: currentY,
      body: [
        [`Case No: ${log.caseNumber}`, `Date: ${log.sessionDate}`],
        [`Title: ${log.sessionTitle}`, `Type: ${log.sessionType}`],
        [`Witness: ${log.witnessName || 'N/A'}`, `Judge: ${log.judgeName || 'Honorable Bench'}`],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Transcript
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Transcript Summary:', margin, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const splitTxt = doc.splitTextToSize(log.transcriptText, pageWidth - margin * 2);
    doc.text(splitTxt, margin, currentY);
    currentY += splitTxt.length * 4 + 5;

    // Dialogue table
    if (log.timestamps && log.timestamps.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Time', 'Speaker', 'Verbatim Dialogue']],
        body: log.timestamps.map((t) => [t.time, t.speaker, t.text]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 35 }, 2: { cellWidth: 'auto' } },
        margin: { left: margin, right: margin },
      });
    }
  });

  applyCourtWatermarkToPDF(doc, { text: 'OROMIA REGIONAL COURT MASTER TRANSCRIPT LOG' });
  doc.save(`Master_Transcripts_${caseNumber.replace(/[/\\?%*:|"<>]/g, '_')}_${Date.now()}.pdf`);
}
