/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CassationPrecedent } from '../data/cassationPrecedents';
import { Language } from '../i18n/translations';
import { applyCourtWatermarkToPDF } from './watermarkService';

export interface BibliographyExportOptions {
  query?: string;
  notes?: string;
  advocateName?: string;
  caseReference?: string;
  citationStyle?: 'standard' | 'formal_court' | 'oscola' | 'apa';
}

/**
 * Formats a list of Cassation precedents into structured Markdown
 */
export function generateCassationBibliographyMarkdown(
  precedents: CassationPrecedent[],
  lang: Language = 'om',
  options?: BibliographyExportOptions
): string {
  const currentDate = new Date().toLocaleDateString(
    lang === 'om' ? 'om-ET' : lang === 'am' ? 'am-ET' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const title =
    lang === 'om'
      ? 'WABII MURTIIWWAN IJIBBAATAA MANA MURTII WALIIGALAA'
      : lang === 'am'
      ? 'የፌዴራል/የክልል ጠቅላይ ፍርድ ቤት ሰበር ውሳኔዎች ማጣቀሻ ቢብሊዮግራፊ'
      : 'SUPREME COURT CASSATION PRECEDENTS BIBLIOGRAPHY';

  const isOm = lang === 'om';
  const isAm = lang === 'am';

  let md = `# ${title}\n\n`;
  md += `> **${isOm ? 'Guyyaa Qophaa\'e' : isAm ? 'የተዘጋጀበት ቀን' : 'Generated Date'}:** ${currentDate}\n`;
  if (options?.query) {
    md += `> **${isOm ? 'Mata-duree Barbaacha' : isAm ? 'የፍለጋ ጭብጥ' : 'Search Query / Topic'}:** "${options.query}"\n`;
  }
  if (options?.caseReference) {
    md += `> **${isOm ? 'Lakk. Galmee / Dhimma' : isAm ? 'የመዝገብ ቁጥር' : 'Case Reference'}:** ${options.caseReference}\n`;
  }
  if (options?.advocateName) {
    md += `> **${isOm ? 'Abukaatoo / Qorataa' : isAm ? 'የሕግ ባለሙያ' : 'Advocate / Legal Researcher'}:** ${options.advocateName}\n`;
  }
  md += `> **${isOm ? 'Baay\'ina Murtiiwwan Wabiif Dhiyaatanii' : isAm ? 'የተጠቀሱ የሰበር ውሳኔዎች ብዛት' : 'Total Cited Precedents'}:** ${precedents.length}\n\n`;

  md += `---\n\n`;

  md += `## ${isOm ? 'I. TARREE MURTIIWWAN IJIBBAATAA' : isAm ? 'I. የሰበር ውሳኔዎች ዝርዝር' : 'I. CITED CASSATION PRECEDENTS LIST'}\n\n`;

  if (precedents.length === 0) {
    md += `*${isOm ? 'Murtii Ijibbaataa wabiif dhiyaate hin jiru.' : isAm ? 'የተጠቀሰ የሰበር ውሳኔ የለም።' : 'No Cassation Precedents cited.'}*\n\n`;
    return md;
  }

  precedents.forEach((item, index) => {
    const fileNum = item.fileNumber;
    const vol = item.volume ? `Jildii ${item.volume} / Vol. ${item.volume}` : '';
    const yr = item.yearEC ? `${item.yearEC} A.L.I (${item.yearGC} G.C.)` : `${item.yearGC}`;
    const court = item.courtName ? item.courtName[lang] || item.courtName.en || '' : 'Supreme Court Cassation Division';
    const parties = item.parties ? item.parties[lang] || item.parties.en || '' : '';
    const issue = item.legalIssue ? item.legalIssue[lang] || item.legalIssue.en || '' : '';
    const principle = item.bindingPrinciple ? item.bindingPrinciple[lang] || item.bindingPrinciple.en || '' : '';
    const statutory = item.statutoryProvisions && item.statutoryProvisions.length > 0 ? item.statutoryProvisions.join(', ') : 'N/A';

    md += `### ${index + 1}. Lakk. Galmee / File No. ${fileNum} (${vol})\n`;
    md += `- **${isOm ? 'Mana Murtii' : isAm ? 'ፍርድ ቤት' : 'Court Division'}:** ${court}\n`;
    md += `- **${isOm ? 'Bara' : isAm ? 'ዓመተ ምህረት' : 'Year'}:** ${yr}\n`;
    if (parties) {
      md += `- **${isOm ? 'Falmiilee' : isAm ? 'ተከራካሪ ወገኖች' : 'Litigating Parties'}:** ${parties}\n`;
    }
    if (issue) {
      md += `- **${isOm ? 'Iyyaanoo / Gaaffii Seeraa' : isAm ? 'የሕግ ጭብጥ' : 'Legal Issue'}:** ${issue}\n`;
    }
    if (principle) {
      md += `- **${isOm ? 'Qajeeltoo Dirqisiisaa (Binding Ratio)' : isAm ? 'አስገዳጅ የሕግ ትርጉም' : 'Binding Principle / Ratio Decidendi'}:** ${principle}\n`;
    }
    md += `- **${isOm ? 'Keeyyattoota Seeraa Wabii' : isAm ? 'የተጠቀሱ የሕግ አንቀጾች' : 'Cited Statutory Provisions'}:** ${statutory}\n\n`;
  });

  md += `---\n\n`;
  md += `## ${isOm ? 'II. FORMAL CITATION CLAUSES' : isAm ? 'II. የመንደርደሪያ ሕጋዊ አጻጻፎች' : 'II. FORMAL COURT CITATION CLAUSES'}\n\n`;

  precedents.forEach((item, index) => {
    const fileNum = item.fileNumber;
    const vol = item.volume ? `Jildii ${item.volume}` : '';
    const principle = item.bindingPrinciple ? item.bindingPrinciple[lang] || item.bindingPrinciple.en || '' : '';

    if (isOm) {
      md += `${index + 1}. "Akka murtii Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Federaalaa Lakk. Galmee **${fileNum}** (${vol}) irratti hiika dirqisiisaa kennameen: *${principle}*"\n\n`;
    } else if (isAm) {
      md += `${index + 1}. "በፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት በመዝገብ ቁጥር **${fileNum}** (${vol}) በተሰጠው አስገዳጅ የሕግ ትርጉም መሠረት፡ *${principle}*"\n\n`;
    } else {
      md += `${index + 1}. "Pursuant to the binding interpretation of the Supreme Court Cassation Division in File No. **${fileNum}** (${vol}): *${principle}*"\n\n`;
    }
  });

  md += `\n---\n*${isOm ? 'SeeraAI Legal Intelligence Platform • Mirkaneessa Wabii Seeraa' : 'SeeraAI Legal Intelligence Platform • Certified Bibliography'}*\n`;

  return md;
}

/**
 * Downloads a Markdown string as a .md file
 */
export function downloadMarkdownBibliography(markdownContent: string, filename: string = 'Cassation_Precedents_Bibliography.md'): void {
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a formal PDF bibliography document
 */
export function generateCassationBibliographyPDF(
  precedents: CassationPrecedent[],
  lang: Language = 'om',
  options?: BibliographyExportOptions
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isOm = lang === 'om';
  const isAm = lang === 'am';

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, 'F');

  // Decorative Accent Bar
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 38, 210, 2, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const headerTitle = isOm
    ? 'MANA MURTII WALIIGALAA • WABII MURTIIWWAN IJIBBAATAA'
    : isAm
    ? 'የጠቅላይ ፍርድ ቤት ሰበር ውሳኔዎች ማጣቀሻ ቢብሊዮግራፊ'
    : 'SUPREME COURT CASSATION PRECEDENTS BIBLIOGRAPHY';
  doc.text(headerTitle, 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('SEERAAI LEGAL RESEARCH & JUDICIAL DECISION SUPPORT ENGINE', 14, 23);

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Date: ${currentDate} | Total Cited: ${precedents.length}`, 14, 30);

  // Metadata block
  let currentY = 48;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  if (options?.query) {
    doc.text(`Topic / Search Context: "${options.query}"`, 14, currentY);
    currentY += 6;
  }
  if (options?.advocateName) {
    doc.text(`Prepared By / Advocate: ${options.advocateName}`, 14, currentY);
    currentY += 6;
  }
  if (options?.caseReference) {
    doc.text(`Case Reference File: ${options.caseReference}`, 14, currentY);
    currentY += 6;
  }

  currentY += 4;

  // Prepare table rows
  const tableData = precedents.map((p, idx) => {
    const fileInfo = `File No: ${p.fileNumber}\nVolume: ${p.volume || 'N/A'}\nYear: ${p.yearEC ? `${p.yearEC} E.C.` : `${p.yearGC} G.C.`}`;
    const parties = p.parties ? (p.parties[lang] || p.parties.en || '') : 'N/A';
    const issue = p.legalIssue ? (p.legalIssue[lang] || p.legalIssue.en || '') : 'N/A';
    const principle = p.bindingPrinciple ? (p.bindingPrinciple[lang] || p.bindingPrinciple.en || '') : 'N/A';
    const articles = p.statutoryProvisions && p.statutoryProvisions.length > 0 ? p.statutoryProvisions.join('\n') : 'N/A';

    return [
      `${idx + 1}`,
      fileInfo,
      `Parties: ${parties}\n\nIssue: ${issue}`,
      `Binding Ratio:\n${principle}`,
      articles,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [[
      '#',
      'Cassation Ref',
      'Case & Legal Issue',
      'Binding Principle (Ratio Decidendi)',
      'Statute'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [245, 158, 11], // amber-500
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 50 },
      3: { cellWidth: 72 },
      4: { cellWidth: 24 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    margin: { left: 14, right: 14, bottom: 20 },
  });

  // Footer / Watermark application across pages
  applyCourtWatermarkToPDF(doc, { text: 'OFFICIAL CASSATION BIBLIOGRAPHY' });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      `Page ${i} of ${pageCount} — SeeraAI Supreme Court Cassation Bibliography Audit`,
      14,
      288
    );
  }

  // Save the PDF
  const sanitizeFilename = options?.query
    ? options.query.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)
    : 'citations';
  doc.save(`Cassation_Precedents_Bibliography_${sanitizeFilename}.pdf`);
}
