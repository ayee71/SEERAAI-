import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { applyCourtWatermarkToPDF, drawCanvasWatermark } from './watermarkService';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  HeadingLevel,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';

export interface LegalExportSection {
  lang: string;
  title: string;
  text: string;
}

export interface LegalExportOptions {
  title: string;
  taskType: string;
  refNumber: string;
  gregorianDate: string;
  ethiopianDate: string;
  sections: LegalExportSection[];
  branding: {
    firmNameOm?: string;
    firmNameAm?: string;
    firmNameEn?: string;
    advocateName?: string;
    roleTitle?: string;
    licenseNumber?: string;
    officeAddress?: string;
    phone?: string;
    facebookPage?: string;
    email?: string;
    showSealOnPdf?: boolean;
  };
  includeLetterhead?: boolean;
  includeSignatureBlock?: boolean;
  includeWatermark?: boolean;
  printElementId?: string;
}

/**
 * Clean sanitization for filename
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').substring(0, 80);
}

/**
 * Strips out risk rating breakdown, risk score indexes, and audit telemetry
 * so that when downloading, only the asked question and the clean legal answer/provisions are exported.
 */
export function sanitizeContentForExport(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText;
  
  // Remove Risk Rating Blocks if present
  cleaned = cleaned.replace(/#{1,4}\s*(?:SADARKAA\s*BALAA\s*SEERAA|OVERALL\s*RISK\s*RATING|የህግ\s*ስጋት\s*ደረጃ)[\s\S]*?(?=(?:#{1,4}\s*[^\n]+|\n\n[A-Z0-9]|$))/gi, '');
  cleaned = cleaned.replace(/\*\*Rating:\*\*[\s\S]*?\n/gi, '');
  cleaned = cleaned.replace(/\*\*Risk\s*Index:\*\*[\s\S]*?\n/gi, '');
  cleaned = cleaned.replace(/\*\*Executive\s*Assessment:\*\*[\s\S]*?\n\n/gi, '');
  cleaned = cleaned.replace(/Qabxii\s*\d+\s*\(HiikaSADARKAA[\s\S]*?\n/gi, '');
  cleaned = cleaned.replace(/SADARKAA\s*BALAA\s*SEERAA[\s\S]*?(?=\n\n|\n[A-Z]|$)/gi, '');
  
  return cleaned.trim();
}

/**
 * Export to PDF preserving the exact legal-print-wrapper styling,
 * letterhead, double-borders, seals, and signatures.
 */
export async function exportLegalDocumentToPdf(
  elementOrId: HTMLElement | string,
  filename: string,
  onProgress?: (status: string) => void
): Promise<void> {
  const targetElement =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;

  if (!targetElement) {
    throw new Error('Legal print container element not found for PDF export.');
  }

  onProgress?.('Preparing document for high-resolution rendering...');

  // Render element to high-res canvas (scale: 2 ensures 300dpi-equivalent print clarity)
  const canvas = await html2canvas(targetElement, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 800,
    onclone: (clonedDoc) => {
      // Ensure print styles are fully expanded and visible in the clone
      const clonedContainer = clonedDoc.getElementById('legal-print-container');
      if (clonedContainer) {
        clonedContainer.style.width = '800px';
        clonedContainer.style.maxWidth = '800px';
        clonedContainer.style.margin = '0 auto';
        clonedContainer.style.backgroundColor = '#ffffff';
        clonedContainer.style.boxShadow = 'none';

        // Remove header text/letterhead elements and signature blocks as requested
        const headers = clonedContainer.querySelectorAll('.legal-letterhead, .letterhead-header, .legal-signatory-block');
        headers.forEach((el) => el.remove());
      }
    },
  });

  onProgress?.('Generating PDF pages...');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210; // A4 mm
  const pageHeight = 297; // A4 mm
  const marginX = 10;
  const marginY = 10;
  const printableWidth = pageWidth - marginX * 2; // 190 mm
  const printableHeight = pageHeight - marginY * 2; // 277 mm

  // Height in pixels per page on the canvas
  const canvasPageHeight = Math.floor((canvas.width * printableHeight) / printableWidth);
  const totalPages = Math.ceil(canvas.height / canvasPageHeight);

  let currentTop = 0;
  let pageIndex = 0;

  while (currentTop < canvas.height) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const sliceHeight = Math.min(canvasPageHeight, canvas.height - currentTop);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const ctx = pageCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Draw SEERAAI background watermark on page canvas
      ctx.save();
      ctx.translate(pageCanvas.width / 2, pageCanvas.height / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.font = 'bold 96px sans-serif';
      ctx.fillStyle = 'rgba(100, 116, 139, 0.05)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SEERAAI', 0, 0);
      ctx.restore();

      ctx.drawImage(
        canvas,
        0,
        currentTop,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      const pageImgData = pageCanvas.toDataURL('image/png');
      const sliceHeightMm = (sliceHeight * printableWidth) / canvas.width;
      pdf.addImage(pageImgData, 'PNG', marginX, marginY, printableWidth, sliceHeightMm, undefined, 'FAST');
    }

    // Render Professional Legal Footer with Dynamic Page Number ("Page X of Y")
    const currPageNum = pageIndex + 1;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);

    const footerTextLeft = 'CONFIDENTIAL - SEERA AI ORO ETHIOPIA';
    const footerTextRight = `Page ${currPageNum} of ${totalPages}`;

    // Draw thin footer divider line
    pdf.setDrawColor(210, 215, 220);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    pdf.text(footerTextLeft, marginX, pageHeight - 7);
    pdf.text(footerTextRight, pageWidth - marginX - pdf.getTextWidth(footerTextRight), pageHeight - 7);

    currentTop += sliceHeight;
    pageIndex++;
  }

  // Apply dynamic court watermark stamp with active institution and timestamp
  applyCourtWatermarkToPDF(pdf);

  onProgress?.('Saving PDF file...');
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/**
 * Export to native Word document (.docx) using docx library,
 * reproducing letterhead, metadata, titles, body sections, and signature blocks.
 */
export async function exportLegalDocumentToDocx(
  options: LegalExportOptions,
  filename: string,
  onProgress?: (status: string) => void
): Promise<void> {
  const {
    title,
    taskType,
    refNumber,
    gregorianDate,
    ethiopianDate,
    sections,
    branding,
    includeLetterhead = false,
    includeSignatureBlock = false,
  } = options;

  onProgress?.('Creating structured Word document...');

  const docChildren: any[] = [];

  // 1. Official Letterhead
  if (includeLetterhead) {
    const firmOm = branding.firmNameOm || 'OGEESSA SEERAA';
    const firmSub = `${branding.firmNameAm || 'የሕግ ባለሙያ'} • ${branding.firmNameEn || 'LEGAL EXPERT'}`;
    const contactInfo = branding.facebookPage
      ? `Facebook: ${branding.facebookPage}`
      : branding.phone
      ? `Tel: ${branding.phone}`
      : 'Facebook: facebook.com/ayele.bedha';
    const credentials = `${branding.advocateName || 'Ayele Be Dha (Ogeessa Seeraa)'} (${branding.licenseNumber || 'FDRE-JURIST/2026'}) | ${branding.officeAddress || 'Finfinnee, Ethiopia'} | ${contactInfo}`;

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: firmOm.toUpperCase(),
            bold: true,
            size: 26, // 13pt
            font: 'Times New Roman',
            color: '0F172A',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: firmSub,
            bold: true,
            size: 20, // 10pt
            font: 'Noto Sans Ethiopic',
            color: '334155',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        border: {
          bottom: {
            color: '0F172A',
            space: 4,
            style: BorderStyle.SINGLE,
            size: 16, // 2pt border
          },
        },
        children: [
          new TextRun({
            text: credentials,
            size: 16, // 8pt
            font: 'Times New Roman',
            color: '64748B',
          }),
        ],
      })
    );
  }

  // 2. Reference & Date Metadata Table
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: 'DOCUMENT REF: ', bold: true, size: 18 }),
                  new TextRun({ text: refNumber, size: 18, font: 'Courier New' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'CATEGORY: ', bold: true, size: 18 }),
                  new TextRun({ text: taskType.toUpperCase(), size: 18 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: 'DATE: ', bold: true, size: 18 }),
                  new TextRun({ text: gregorianDate, size: 18 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'ETHIOPIAN DATE: ', bold: true, size: 18 }),
                  new TextRun({ text: ethiopianDate, size: 18, font: 'Noto Sans Ethiopic' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  docChildren.push(metaTable);

  // 3. Document Title
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240 },
      border: {
        top: { color: '0F172A', space: 6, style: BorderStyle.SINGLE, size: 12 },
        bottom: { color: '0F172A', space: 6, style: BorderStyle.SINGLE, size: 12 },
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 28, // 14pt
          font: 'Times New Roman',
          color: '0F172A',
        }),
      ],
    })
  );

  // 4. Body Sections with Trilingual Headers
  sections.forEach((sec, idx) => {
    if (sections.length > 1) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 200, after: 120 },
          border: {
            left: { color: '0F172A', space: 8, style: BorderStyle.SINGLE, size: 24 },
            bottom: { color: 'E2E8F0', space: 4, style: BorderStyle.SINGLE, size: 6 },
          },
          children: [
            new TextRun({
              text: `  ${sec.title.toUpperCase()}  `,
              bold: true,
              size: 22,
              font: sec.lang === 'am' ? 'Noto Sans Ethiopic' : 'Times New Roman',
              color: '0F172A',
            }),
            new TextRun({
              text: `[${sec.lang === 'om' ? 'Afaan Oromoo' : sec.lang === 'am' ? 'አማርኛ' : 'English'}]`,
              size: 16,
              color: '64748B',
              italics: true,
            }),
          ],
        })
      );
    }

    // Split text into paragraphs (sanitizing out risk scores/ratings)
    const cleanText = sanitizeContentForExport(sec.text);
    const paragraphs = cleanText.split(/\n\s*\n/);
    paragraphs.forEach((pText) => {
      const trimmed = pText.trim();
      if (!trimmed) return;

      const isHeading =
        trimmed.startsWith('KEEYYATA') ||
        trimmed.startsWith('አንቀጽ') ||
        trimmed.startsWith('ARTICLE') ||
        trimmed.startsWith('CLAUSE') ||
        trimmed.startsWith('#') ||
        /^[0-9]+\.\s/.test(trimmed);

      docChildren.push(
        new Paragraph({
          alignment: isHeading ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
          spacing: { before: isHeading ? 140 : 60, after: 80, line: 320 }, // 1.33 line spacing
          children: [
            new TextRun({
              text: trimmed.replace(/^#+\s*/, ''),
              bold: isHeading,
              size: 22, // 11pt
              font: sec.lang === 'am' ? 'Noto Sans Ethiopic' : 'Times New Roman',
              color: '1E293B',
            }),
          ],
        })
      );
    });
  });

  // 5. Formal Legal Signatory Block
  if (includeSignatureBlock) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 360, after: 140 },
        border: {
          top: { color: '0F172A', space: 6, style: BorderStyle.SINGLE, size: 12 },
        },
        children: [
          new TextRun({
            text: 'MALLATTOO QAAMOLEE FI RAGAALEE / የተዋዋዮች እና የምስክሮች ፊርማ / EXECUTION & ATTESTATION',
            bold: true,
            size: 18,
            font: 'Times New Roman',
            color: '0F172A',
          }),
        ],
      })
    );

    // Parties Table
    const partiesTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [new TextRun({ text: 'Gargala 1ffaa / 1ኛ ተዋዋይ / Party 1:', bold: true, size: 18 })],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [new TextRun({ text: 'Maqaa / ስም: ____________________________', size: 18 })],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [new TextRun({ text: 'Mallattoo / ፊርማ: _______________________', size: 18 })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Guyyaa / ቀን: __________________________', size: 18 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [new TextRun({ text: 'Gargala 2ffaa / 2ኛ ተዋዋይ / Party 2:', bold: true, size: 18 })],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [new TextRun({ text: 'Maqaa / ስም: ____________________________', size: 18 })],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [new TextRun({ text: 'Mallattoo / ፊርማ: _______________________', size: 18 })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Guyyaa / ቀን: __________________________', size: 18 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    docChildren.push(partiesTable);

    // Witnesses Table
    const witnessesTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 40 },
                  children: [new TextRun({ text: 'Ragaa 1ffaa / 1ኛ ምስክር / Witness 1 (Civil Code 1727):', bold: true, size: 16 })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Maqaa: ________________ Mallattoo: ___________', size: 16 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 40 },
                  children: [new TextRun({ text: 'Ragaa 2ffaa / 2ኛ ምስክር / Witness 2 (Civil Code 1727):', bold: true, size: 16 })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Maqaa: ________________ Mallattoo: ___________', size: 16 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    docChildren.push(witnessesTable);
  }

  // Build Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~20mm
              bottom: 1134,
              left: 1134,
              right: 1134,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'SEERAAI',
                    size: 64, // 32pt background watermark
                    color: 'E2E8F0',
                    bold: true,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'SeeraAI Legal Assistant • FDRE Standard Document • Page ',
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  onProgress?.('Packing and saving Word .docx file...');
  const blob = await Packer.toBlob(doc);
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Export to Word-compatible HTML format (.doc) preserving 100% of exact CSS formatting,
 * including letterhead, seals, watermarks, and Ethiopic fonts.
 */
export function exportLegalDocumentToWordHtml(
  elementOrId: HTMLElement | string,
  filename: string,
  title: string,
  includeWatermark: boolean = true
): void {
  const targetElement =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;

  if (!targetElement) {
    throw new Error('Element not found for Word export.');
  }

  let watermarkMarkup = '';
  if (includeWatermark) {
    watermarkMarkup = `<div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 36pt; font-weight: 800; color: rgba(15, 23, 42, 0.05); pointer-events: none; text-transform: uppercase; letter-spacing: 0.25em; white-space: nowrap; z-index: 0;">CONFIDENTIAL - SEERA AI ORO ETHIOPIA</div>`;
  }

  const wordHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 595.3pt 841.9pt; /* A4 */
      margin: 54.0pt 54.0pt 54.0pt 54.0pt;
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      font-family: 'Inter', 'Noto Sans Ethiopic', 'Times New Roman', Georgia, serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #0f172a;
      position: relative;
    }
    .legal-print-wrapper {
      position: relative;
      background: #ffffff;
      color: #0f172a;
    }
    .legal-content-body {
      font-size: 11pt;
      line-height: 1.65;
      text-align: justify;
      color: #1e293b;
      white-space: pre-wrap;
    }
    .legal-lang-header {
      background-color: #f1f5f9;
      border-left: 5px solid #0f172a;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-weight: bold;
    }
    .legal-signatory-block {
      border-top: 2px solid #0f172a;
      margin-top: 30px;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${watermarkMarkup}
    ${targetElement.innerHTML}
  </div>
</body>
</html>`;

  const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = sanitizeFilename(filename);
  a.download = safeName.endsWith('.doc') || safeName.endsWith('.docx') ? safeName : `${safeName}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Shares or opens a generated file blob using Web Share API with Files
 * so Android/Mobile pops up the native system "Open with..." bottom sheet dialog.
 */
export async function openFileWithNativeChooser(
  blob: Blob,
  filename: string,
  title: string = 'Sanada Seeraa / Legal Document'
): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;

  const file = new File([blob], filename, { type: blob.type || 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text: `⚖️ ${title} - SeeraAI Legal Document`,
        files: [file],
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native file chooser share failed:', err);
      }
    }
  }

  // Fallback: Open Blob URL in a new window/tab or trigger download
  const fileUrl = URL.createObjectURL(blob);
  const newWin = window.open(fileUrl, '_blank');
  if (!newWin) {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.click();
  }
  return false;
}

/**
 * Direct 1-click export of a SavedLegalDocument directly as PDF or Word file
 */
export async function directExportSavedDocument(
  doc: {
    id: string;
    title: string;
    content: string;
    taskType?: string;
    createdAt?: string;
    outputLanguages?: string[];
    separatedVersions?: { om?: string; am?: string; en?: string };
  },
  format: 'pdf' | 'word',
  branding?: any,
  onProgress?: (status: string) => void
): Promise<void> {
  const safeFilename = sanitizeFilename(doc.title || 'Legal_Document');
  const sanitizedContent = sanitizeContentForExport(doc.content || '');
  const refCode = `ETH-LAW/${new Date(doc.createdAt || Date.now()).getFullYear()}/${(doc.id || 'DOC').slice(-6).toUpperCase()}`;
  const gregorianDate = new Date(doc.createdAt || Date.now()).toLocaleDateString();
  const ethiopianDate = new Date(doc.createdAt || Date.now()).toLocaleDateString('am-ET');

  if (format === 'word') {
    onProgress?.('Generating Microsoft Word document...');
    const options: LegalExportOptions = {
      title: doc.title,
      taskType: doc.taskType || 'contract',
      refNumber: refCode,
      gregorianDate,
      ethiopianDate,
      sections: [
        {
          lang: (doc.outputLanguages?.[0] as any) || 'om',
          title: doc.title,
          text: sanitizedContent,
        },
      ],
      branding: branding || {
        firmNameOm: 'SAI ETHIO • OGEESSA SEERAA',
        firmNameAm: 'የሕግ ባለሙያ',
        firmNameEn: 'LEGAL EXPERT & ADVOCATE',
        advocateName: 'Ayele Be Dha',
        roleTitle: 'Ogeessa Seeraa',
        licenseNumber: 'FDRE-JURIST/2026',
        officeAddress: 'Finfinnee, Ethiopia',
        showSealOnPdf: true,
      },
      includeLetterhead: true,
      includeSignatureBlock: true,
    };
    await exportLegalDocumentToDocx(options, `${safeFilename}.docx`, onProgress);
    return;
  }

  // Direct PDF export
  onProgress?.('Preparing official printable legal document...');
  const printContainer = document.createElement('div');
  printContainer.id = 'direct-export-legal-container';
  printContainer.style.position = 'fixed';
  printContainer.style.left = '-9999px';
  printContainer.style.top = '0';
  printContainer.style.width = '800px';
  printContainer.style.padding = '40px 48px';
  printContainer.style.background = '#ffffff';
  printContainer.style.color = '#0f172a';
  printContainer.style.fontFamily = 'serif';
  printContainer.style.fontSize = '12pt';
  printContainer.style.lineHeight = '1.7';
  printContainer.style.boxSizing = 'border-box';
  printContainer.style.zIndex = '-1000';

  const firmName = branding?.firmNameOm || 'SAI ETHIO • OGEESSA SEERAA';
  const advocateName = branding?.advocateName || 'Ayele Be Dha (Ogeessa Seeraa)';
  const licenseNumber = branding?.licenseNumber || 'FDRE-JURIST/2026';
  const officeAddress = branding?.officeAddress || 'Finfinnee / Addis Ababa, Ethiopia';

  printContainer.innerHTML = `
    <div style="border: 2px solid #0f172a; padding: 24px; position: relative;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="font-size: 20pt; font-weight: bold; letter-spacing: 1px; color: #0f172a;">${firmName}</div>
        <div style="font-size: 10pt; color: #475569; margin-top: 4px;">FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA • LEGAL DOCUMENT</div>
        <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">Advocate: ${advocateName} | Lic: ${licenseNumber} | ${officeAddress}</div>
      </div>

      <!-- Metadata Table -->
      <table style="width: 100%; font-size: 9pt; margin-bottom: 20px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
        <tr>
          <td style="text-align: left; font-weight: bold; color: #334155;">REF NO: <span style="font-family: monospace; font-weight: normal;">${refCode}</span></td>
          <td style="text-align: right; color: #334155;">DATE: ${gregorianDate} (${ethiopianDate})</td>
        </tr>
      </table>

      <!-- Document Title -->
      <div style="text-align: center; margin: 20px 0; border-top: 1px solid #0f172a; border-bottom: 1px solid #0f172a; padding: 8px 0;">
        <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; color: #0f172a;">${doc.title}</div>
      </div>

      <!-- Document Content -->
      <div style="font-size: 11pt; line-height: 1.8; text-align: justify; color: #1e293b; white-space: pre-wrap; margin-bottom: 36px; min-height: 250px;">
${sanitizedContent}
      </div>

      <!-- Signatory & Seal Block -->
      <div style="margin-top: 40px; border-top: 1px solid #0f172a; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 9pt; color: #64748b; max-width: 320px;">
          <div>Mirkaneessa Seeraa / Legal Certification</div>
          <div>Guca Seeraa Biyyoolessaa RDFI fi Naannoo Oromiyaa</div>
          <div style="margin-top: 4px; font-size: 8pt; color: #94a3b8;">Sanada seera-qabeessa • SeeraAI Assistant</div>
        </div>

        <div style="text-align: center;">
          <div style="display: inline-block; width: 80px; height: 80px; border: 2px dashed #b45309; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #b45309; font-size: 8pt; font-weight: bold; text-align: center; margin-bottom: 6px; padding: 4px;">
            <span>ASXAA SEERAA<br/>SEAL</span>
          </div>
          <div style="font-size: 9pt; font-weight: bold; color: #0f172a;">${advocateName}</div>
          <div style="font-size: 8pt; color: #64748b;">Mallattoo / Signature: __________________</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(printContainer);

  try {
    await exportLegalDocumentToPdf(printContainer, `${safeFilename}.pdf`, onProgress);
  } finally {
    if (document.body.contains(printContainer)) {
      document.body.removeChild(printContainer);
    }
  }
}

