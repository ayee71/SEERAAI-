import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { LegalEnactment } from '../data/legislationDatabase';
import { TelegramLegalPost } from './telegramLegalHarvesterService';
import { Language } from '../i18n/translations';

/**
 * Generates official HTML markup for a Legal Enactment (Statute).
 * Supports Afaan Oromoo, Amharic, and English.
 */
function generateStatuteHtml(item: LegalEnactment, lang: Language): string {
  const isOromia = item.jurisdiction === 'oromia';
  const title = item.title[lang] || item.title.om || item.title.en;
  const authority = item.authority[lang] || item.authority.om || item.authority.en;
  const summary = item.summary[lang] || item.summary.om || item.summary.en;
  const principles = item.keyPrinciples ? (item.keyPrinciples[lang] || item.keyPrinciples.om || item.keyPrinciples.en) : null;
  const articles = item.fullTextArticles || [];

  const gazetteHeaderOm = isOromia
    ? 'MAGALATA OROMIYAA • MEGELETA OROMIA'
    : 'FEDERAAL NEGAARIIT GAAZEEXAA • FEDERAL NEGARIT GAZETTE';
  const gazetteSubOm = isOromia
    ? 'WAJJIIRA CAFFEE OROMIYAATIIN KAN QOPHAA\'E • FINFINNEE'
    : 'MANA MAREE BAKKA BU\'OOTA UUMMATAA RDFI • ADDIS ABABA';

  const typeLabels: Record<string, { om: string; am: string; en: string }> = {
    proclamation: { om: 'LABSII', am: 'አዋጅ', en: 'PROCLAMATION' },
    regulation: { om: 'DAMBII', am: 'ደንብ', en: 'REGULATION' },
    directive: { om: 'QAJEELFAMA', am: 'መመሪያ', en: 'DIRECTIVE' },
    cassation_decision: { om: 'MURTII DHADDACHA IJIBBAATAA', am: 'የሰበር ችሎት ውሳኔ', en: 'CASSATION DECISION' },
  };

  const typeLabel = (typeLabels[item.type] && typeLabels[item.type][lang]) || item.type.toUpperCase();

  const articlesHtml = articles.length > 0
    ? articles.map((art) => {
        const artContent = art.content[lang] || art.content.om || art.content.en;
        return `
          <div style="margin-bottom: 18px; page-break-inside: avoid;">
            <div style="font-weight: 700; color: #047857; font-size: 11pt; margin-bottom: 4px; font-family: monospace;">
              ${art.articleNumber} ${art.title ? `• ${art.title}` : ''}
            </div>
            <div style="font-size: 10.5pt; line-height: 1.7; color: #1e293b; text-align: justify; white-space: pre-line;">
              ${artContent}
            </div>
          </div>
        `;
      }).join('')
    : `<p style="font-style: italic; color: #64748b; font-size: 10pt;">Qabiyyeen keeyyattoota seera kanaa cuunfaa gubbaatti ibsame keessatti argama.</p>`;

  const principlesHtml = principles
    ? `
      <div style="margin-top: 20px; margin-bottom: 24px; padding: 14px 18px; background-color: #faf5ff; border: 1.5px solid #d8b4fe; border-left: 5px solid #7e22ce; border-radius: 8px; page-break-inside: avoid;">
        <div style="font-weight: 700; font-size: 10pt; color: #6b21a8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
          💡 Yaada Seeraa Dirqisiisaa (Binding Legal Principle):
        </div>
        <div style="font-size: 10pt; line-height: 1.65; color: #3b0764; font-family: Georgia, serif; font-style: italic;">
          "${principles}"
        </div>
      </div>
    `
    : '';

  return `
    <div style="font-family: 'Times New Roman', 'Noto Sans Ethiopic', serif; color: #0f172a; background: #ffffff; padding: 36px 40px; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
      
      <!-- Official Header -->
      <div style="text-align: center; border-bottom: 2.5px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px;">
        <div style="font-size: 11pt; font-weight: 700; letter-spacing: 1.5px; color: #475569; text-transform: uppercase;">
          ${isOromia ? 'Mootummaa Naannoo Oromiyaa' : 'Federal Democratic Republic of Ethiopia'}
        </div>
        <div style="font-size: 18pt; font-weight: 800; color: #0f172a; margin: 4px 0; letter-spacing: 1px;">
          ${gazetteHeaderOm}
        </div>
        <div style="font-size: 8.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
          ${gazetteSubOm}
        </div>
      </div>

      <!-- Reference & Metadata Banner -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 1px dashed #94a3b8; padding-bottom: 8px; font-size: 9.5pt;">
        <tr>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a; width: 50%;">
            <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-family: monospace;">
              ${typeLabel} LAKK. ${item.number}
            </span>
          </td>
          <td style="padding: 4px 0; text-align: right; color: #475569;">
            <strong>Bara:</strong> ${item.yearEC} B.A. (${item.yearGC} G.C.) • <strong>Sadarkaa:</strong> <span style="color: #047857; font-weight: 700;">${item.status.toUpperCase()}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 4px 0; color: #475569; font-size: 8.5pt;">
            <strong>Qaama Baase:</strong> ${authority}
          </td>
        </tr>
      </table>

      <!-- Enactment Main Title -->
      <div style="text-align: center; margin: 20px 0 24px 0; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; padding: 12px 0;">
        <h1 style="font-size: 13pt; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; line-height: 1.45;">
          ${title}
        </h1>
      </div>

      <!-- Executive Legal Summary -->
      <div style="margin-bottom: 22px; padding: 12px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="font-weight: 700; font-size: 9.5pt; color: #334155; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
          Cuunfaa fi Kaayyoo Seerichaa (Executive Statutory Summary):
        </div>
        <p style="font-size: 10pt; line-height: 1.65; color: #1e293b; margin: 0; text-align: justify;">
          ${summary}
        </p>
      </div>

      <!-- Binding Principles (if any) -->
      ${principlesHtml}

      <!-- Full-Text Articles Section -->
      <div style="margin-top: 24px;">
        <div style="font-size: 11pt; font-weight: 800; color: #0f172a; text-transform: uppercase; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 16px;">
          Keeyyattoota Seeraa (Statutory Articles & Enacted Provisions)
        </div>
        ${articlesHtml}
      </div>

      <!-- Official Certification & Offline Notice Footer -->
      <div style="margin-top: 40px; padding-top: 16px; border-top: 2px solid #0f172a; page-break-inside: avoid; font-size: 8.5pt; color: #64748b;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-weight: 700; color: #0f172a;">SEERAAI • Ethiopian Legal Intelligence & Judicial Decision Support</div>
            <div>Sanada Seeraa Toora Intarneetii Malee (Offline) Dubbisuuf Qophaa'e</div>
            <div style="margin-top: 3px; font-size: 8pt; color: #94a3b8;">
              Maddi: Kuusaa Seeraa Biyyoolessaa • Date of Export: ${new Date().toLocaleDateString()}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; border: 1.5px dashed #047857; color: #047857; font-weight: 700; padding: 4px 8px; border-radius: 4px; font-size: 8pt;">
              ✓ SEERAAI OFFICIAL ARCHIVE
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates official HTML markup for a Telegram Legal Harvested Document.
 */
function generateTelegramDocHtml(post: TelegramLegalPost, lang: Language): string {
  const title = post.extractedTitle || post.referenceNumber;
  const summary = post.summary[lang] || post.summary.om || post.summary.en;
  const principles = (post.corePrinciples && (post.corePrinciples[lang] || post.corePrinciples.om || post.corePrinciples.en))
    || (post.keyPrinciples && (post.keyPrinciples[lang] || post.keyPrinciples.om || post.keyPrinciples.en))
    || '';

  return `
    <div style="font-family: 'Times New Roman', 'Noto Sans Ethiopic', serif; color: #0f172a; background: #ffffff; padding: 36px 40px; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
      
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2.5px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px;">
        <div style="font-size: 11pt; font-weight: 700; letter-spacing: 1.5px; color: #475569; text-transform: uppercase;">
          SEERAAI • TELEGRAM LEGAL ARCHIVE
        </div>
        <div style="font-size: 16pt; font-weight: 800; color: #0f172a; margin: 4px 0;">
          SANADA SEERAA FI MURTII TELEGRAM IRRAA WARAABBAME
        </div>
        <div style="font-size: 8.5pt; color: #64748b;">
          Channel: @${post.channelHandle} • Post #${(post as any).messageId || post.id} • Category: ${post.category.toUpperCase()}
        </div>
      </div>

      <!-- Reference -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 9.5pt;">
        <strong>Lakkoofsa Galmee / Ref:</strong> <span style="font-family: monospace; font-weight: 700; color: #0284c7;">${post.referenceNumber}</span> • <strong>Guyyaa:</strong> ${new Date(post.publishDate || (post as any).date || Date.now()).toLocaleDateString()}
      </div>

      <!-- Title -->
      <div style="text-align: center; margin: 18px 0; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; padding: 10px 0;">
        <h1 style="font-size: 12pt; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase;">
          ${title}
        </h1>
      </div>

      <!-- Summary -->
      <div style="margin-bottom: 20px; padding: 12px 16px; background-color: #f1f5f9; border-radius: 6px;">
        <div style="font-weight: 700; font-size: 9pt; color: #475569; text-transform: uppercase; margin-bottom: 4px;">Cuunfaa Seeraa:</div>
        <p style="font-size: 10pt; line-height: 1.6; color: #1e293b; margin: 0;">${summary}</p>
      </div>

      <!-- Binding Principles -->
      ${principles ? `
        <div style="margin-bottom: 20px; padding: 12px 16px; background-color: #faf5ff; border: 1.5px solid #d8b4fe; border-radius: 6px;">
          <div style="font-weight: 700; font-size: 9pt; color: #7e22ce; text-transform: uppercase; margin-bottom: 4px;">Yaada Seeraa Dirqisiisaa:</div>
          <p style="font-size: 10pt; line-height: 1.6; color: #3b0764; font-style: italic; margin: 0;">"${principles}"</p>
        </div>
      ` : ''}

      <!-- Key Articles -->
      ${post.keyArticles && post.keyArticles.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <div style="font-weight: 700; font-size: 9.5pt; color: #0f172a; margin-bottom: 8px;">Keeyyattoota Rogummaa Qaban:</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${post.keyArticles.map(a => `<span style="font-family: monospace; font-size: 9pt; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; border: 1px solid #bae6fd;">📌 ${a}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Raw Text -->
      <div style="margin-top: 20px;">
        <div style="font-weight: 700; font-size: 9.5pt; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Barreeffama Guutuu:</div>
        <div style="font-size: 10pt; line-height: 1.7; color: #1e293b; white-space: pre-wrap; font-family: sans-serif; background: #fafafa; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
          ${post.rawText}
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 36px; padding-top: 14px; border-top: 2px solid #0f172a; font-size: 8pt; color: #64748b; display: flex; justify-content: space-between;">
        <span>SEERAAI • Telegram Archive Integration</span>
        <span>Exported for Offline Legal Analysis</span>
      </div>
    </div>
  `;
}

/**
 * Clean sanitization for filename
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').substring(0, 80);
}

/**
 * Exports a LegalEnactment (statute/proclamation/regulation) as a multi-page, high-res PDF.
 */
export async function exportStatuteToPdf(
  item: LegalEnactment,
  lang: Language = 'om',
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Preparing statute document for PDF rendering...');

  // Create an off-screen container with crisp print styling
  const container = document.createElement('div');
  container.id = 'statute-pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.zIndex = '-9999';
  container.innerHTML = generateStatuteHtml(item, lang);
  document.body.appendChild(container);

  try {
    onProgress?.('Capturing high-resolution print pages...');
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800,
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

        // Watermark on each page
        ctx.save();
        ctx.translate(pageCanvas.width / 2, pageCanvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.font = 'bold 84px sans-serif';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.04)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SEERAAI STATUTE ARCHIVE', 0, 0);
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

      // Page numbers in footer
      const currPageNum = pageIndex + 1;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(120, 120, 120);

      const footerLeft = `SEERAAI • ${item.number} • ${item.jurisdiction.toUpperCase()}`;
      const footerRight = `Page ${currPageNum} of ${totalPages}`;

      pdf.setDrawColor(210, 215, 220);
      pdf.setLineWidth(0.2);
      pdf.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

      pdf.text(footerLeft, marginX, pageHeight - 6);
      pdf.text(footerRight, pageWidth - marginX - pdf.getTextWidth(footerRight), pageHeight - 6);

      currentTop += sliceHeight;
      pageIndex++;
    }

    onProgress?.('Saving PDF...');
    const filename = `${sanitizeFilename(item.number)}_${item.type}_${lang}.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Opens a clean, dedicated browser print dialog for the statute without UI chrome.
 */
export function printStatute(item: LegalEnactment, lang: Language = 'om'): void {
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';

  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) {
    // Fallback to window.print()
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${item.number} - ${item.title[lang] || item.title.om}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            body {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        ${generateStatuteHtml(item, lang)}
      </body>
    </html>
  `);
  doc.close();

  // Wait for resources to load, then trigger print
  setTimeout(() => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch (e) {
      console.warn('Print iframe error, fallback to window.print():', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 3000);
    }
  }, 350);
}

/**
 * Exports a Telegram harvested legal document as PDF.
 */
export async function exportTelegramDocToPdf(
  post: TelegramLegalPost,
  lang: Language = 'om',
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Preparing Telegram legal document for PDF rendering...');

  const container = document.createElement('div');
  container.id = 'telegram-pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.zIndex = '-9999';
  container.innerHTML = generateTelegramDocHtml(post, lang);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 10;
    const marginY = 10;
    const printableWidth = pageWidth - marginX * 2;
    const printableHeight = pageHeight - marginY * 2;

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

      const currPageNum = pageIndex + 1;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(130, 130, 130);
      pdf.text(`SEERAAI • Telegram Archive • @${post.channelHandle} • Page ${currPageNum} of ${totalPages}`, marginX, pageHeight - 6);

      currentTop += sliceHeight;
      pageIndex++;
    }

    const filename = `${sanitizeFilename(post.referenceNumber || post.channelHandle)}_TelegramDoc.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Prints a Telegram harvested legal document.
 */
export function printTelegramDoc(post: TelegramLegalPost, lang: Language = 'om'): void {
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';

  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${post.referenceNumber} - Telegram Archive</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { margin: 0; padding: 0; background: #ffffff; color: #0f172a; }
        </style>
      </head>
      <body>
        ${generateTelegramDocHtml(post, lang)}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 3000);
    }
  }, 350);
}
