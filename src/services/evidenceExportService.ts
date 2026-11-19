import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { CaseEvidence, PracticeCase, generateAIEvidenceDescription } from './practiceCaseService';
import { Language } from '../i18n/translations';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const base64 = parts[1];
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.warn('Failed to convert dataUrl to Uint8Array:', err);
    return null;
  }
}

function getMimeExtension(dataUrl?: string, defaultName?: string): string {
  if (defaultName && defaultName.includes('.')) {
    const ext = defaultName.split('.').pop()?.toLowerCase();
    if (ext && ext.length <= 4) return ext;
  }
  if (!dataUrl) return 'txt';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'jpg';
  if (dataUrl.startsWith('data:image/png')) return 'png';
  if (dataUrl.startsWith('data:image/webp')) return 'webp';
  if (dataUrl.startsWith('data:application/pdf')) return 'pdf';
  if (dataUrl.startsWith('data:video/mp4')) return 'mp4';
  if (dataUrl.startsWith('data:video/webm')) return 'webm';
  return 'bin';
}

/**
 * Generates a unified Court Evidence Dossier PDF
 */
export async function generateEvidenceDossierPdf(
  caseData: PracticeCase,
  selectedItems: CaseEvidence[],
  lang: Language = 'om'
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // --- Page 1: Official Court Header & Summary ---
  // Top Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setFillColor(245, 158, 11); // amber-500 line
  doc.rect(0, 31, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('MANA MURTII AANAA GURBICHA - E-COURT', pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(251, 191, 36);
  doc.text('OFFICIAL DIGITAL EVIDENCE DOSSIER / DOSIYE RIGAA LAKKOOFSAA', pageWidth / 2, 19, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`SEERAAI Evidence Intelligence • S.A.F.H.H. Kw. 258 • Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 26, { align: 'center' });

  let y = 38;

  // Case Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Lakk. Galmee (Case No): ${caseData.caseNumber || 'CASE-2026-0042'}`, margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Himataa (Plaintiff): ${caseData.plaintiff || 'Obsaa Dabbale'}`, margin + 5, y + 15);
  doc.text(`Himatamaa (Defendant): ${caseData.defendant || 'Caalaan Tolera'}`, margin + 5, y + 21);
  doc.text(`Dhimma (Subject): ${caseData.subject || 'Falmii Dhaala fi Qabeenyaa'}`, margin + 5, y + 27);
  doc.text(`Baay'ina Ragaalee (Total Selected Exhibits): ${selectedItems.length}`, margin + 5, y + 33);

  y += 46;

  // Index Table Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Tarree Ragaalee Filataman (Selected Exhibits Index)', margin, y);
  y += 6;

  // Render Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('#', margin + 3, y + 5.5);
  doc.text('Maqaa Ragaa (Exhibit Name)', margin + 12, y + 5.5);
  doc.text('Kategorii (Category)', margin + 95, y + 5.5);
  doc.text('Fudhatamummaa (Admissibility)', margin + 140, y + 5.5);

  y += 8;

  selectedItems.forEach((ev, idx) => {
    const ai = generateAIEvidenceDescription(ev, caseData, lang);
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 241, isEven ? 255 : 245, isEven ? 255 : 249);
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text(`${idx + 1}`, margin + 3, y + 5);
    const shortName = ev.name.length > 40 ? ev.name.substring(0, 38) + '...' : ev.name;
    doc.text(shortName, margin + 12, y + 5);
    doc.text(ev.category || 'Exhibit', margin + 95, y + 5);

    const statusStr = (ev.admissibilityStatus || ai.admissibility || 'Admissible').toUpperCase();
    if (statusStr.includes('INADMISSIBLE')) {
      doc.setTextColor(225, 29, 72);
    } else if (statusStr.includes('CONDITIONAL') || statusStr.includes('OBJECTION')) {
      doc.setTextColor(217, 119, 6);
    } else {
      doc.setTextColor(16, 185, 129);
    }
    doc.text(statusStr, margin + 140, y + 5);

    y += 7;

    if (y > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }
  });

  y += 10;

  // --- Per Exhibit Detailed Pages ---
  for (let i = 0; i < selectedItems.length; i++) {
    const ev = selectedItems[i];
    const ai = generateAIEvidenceDescription(ev, caseData, lang);

    doc.addPage();
    y = 15;

    // Exhibit Header Bar
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(251, 191, 36);
    doc.text(`EXHIBIT #${i + 1}: ${ev.name}`, margin + 4, y + 8);

    y += 18;

    // Metadata Grid
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Kategorii: ${ev.category || 'General Evidence'}`, margin, y);
    doc.text(`Guyyaa Maxxanfame: ${new Date(ev.uploadedAt).toLocaleString()}`, margin + 90, y);
    y += 5;
    doc.text(`Sadarkaa Fudhatamummaa: ${(ev.admissibilityStatus || ai.admissibility || 'Admissible').toUpperCase()}`, margin, y);
    doc.text(`Ulfaatina Ragaa (Evidential Weight): ${(ev.evidentialWeight || 'primary').toUpperCase()}`, margin + 90, y);

    y += 10;

    // Embedded Media Section if Image
    if (ev.dataUrl && (ev.type === 'photo' || ev.dataUrl.startsWith('data:image/'))) {
      try {
        const imgFormat = ev.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        const imgWidth = 140;
        const imgHeight = 80;
        const imgX = (pageWidth - imgWidth) / 2;

        // Draw image frame
        doc.setDrawColor(203, 213, 225);
        doc.rect(imgX - 2, y - 2, imgWidth + 4, imgHeight + 4);
        doc.addImage(ev.dataUrl, imgFormat, imgX, y, imgWidth, imgHeight);

        y += imgHeight + 10;
      } catch (imgErr) {
        console.warn('Failed to embed image in PDF:', imgErr);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 20, 'F');
        doc.setTextColor(100, 116, 139);
        doc.text('[Image preview embedded in original ZIP file package]', margin + 10, y + 12);
        y += 25;
      }
    } else if (ev.videoMetadata || ev.type === 'video') {
      // Video Metadata Card in PDF
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(225, 29, 72);
      doc.text('📹 WEBCAM BENCH VIDEO EVIDENCE METADATA', margin + 5, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Resolution: ${ev.videoMetadata?.resolution || '1280x720'}`, margin + 5, y + 14);
      doc.text(`Duration: ${ev.videoMetadata?.durationSec ? `${ev.videoMetadata.durationSec}s` : '15s'}`, margin + 65, y + 14);
      doc.text(`FPS: ${ev.videoMetadata?.fps || 30}`, margin + 120, y + 14);

      doc.text(`SHA-256 Checksum: ${ev.videoMetadata?.checksumSha256 || '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'}`, margin + 5, y + 22);

      y += 36;
    }

    // AI Legal Analysis Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(148, 163, 184);
    doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text('✦ Xiinxala Seeraa AI (AI Legal Synthesis & Description):', margin + 4, y + 7);

    doc.setFont('serif', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const descText = ev.aiDescription || ai.description;
    const splitDesc = doc.splitTextToSize(descText, contentWidth - 8);
    doc.text(splitDesc.slice(0, 3), margin + 4, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`Relevance: ${ev.aiRelevance || ai.relevance}`, margin + 4, y + 32);

    y += 44;
  }

  // --- Add Page Numbers & Footer Watermark on all pages ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`SEERAAI E-Court System • Page ${p} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text(`Verified Stamp: ${caseData.caseNumber || 'CASE-2026-0042'}`, margin, pageHeight - 8);
  }

  return doc;
}

/**
 * Bundles selected evidence into a downloadable ZIP package
 */
export async function exportEvidenceAsZipPackage(
  caseData: PracticeCase,
  selectedItems: CaseEvidence[],
  lang: Language = 'om'
): Promise<void> {
  const zip = new JSZip();

  const caseNumSanitized = sanitizeFilename(caseData.caseNumber || 'CASE-2026-0042');
  const mainFolder = zip.folder(`Court_Evidence_Package_${caseNumSanitized}`);

  // 1. Generate Manifest PDF inside ZIP
  const pdfDoc = await generateEvidenceDossierPdf(caseData, selectedItems, lang);
  const pdfArrayBuffer = pdfDoc.output('arraybuffer');
  mainFolder?.file(`00_COURT_EVIDENCE_DOSSIER_MANIFEST.pdf`, pdfArrayBuffer);

  // 2. Generate JSON Metadata Manifest
  const jsonManifest = {
    caseNumber: caseData.caseNumber,
    plaintiff: caseData.plaintiff,
    defendant: caseData.defendant,
    subject: caseData.subject,
    generatedAt: new Date().toISOString(),
    totalExhibits: selectedItems.length,
    exhibits: selectedItems.map((ev, i) => ({
      exhibitNumber: i + 1,
      id: ev.id,
      name: ev.name,
      category: ev.category,
      uploadedAt: ev.uploadedAt,
      admissibilityStatus: ev.admissibilityStatus || 'admissible',
      evidentialWeight: ev.evidentialWeight || 'primary',
      aiDescription: ev.aiDescription,
      aiRelevance: ev.aiRelevance,
      videoMetadata: ev.videoMetadata
    }))
  };
  mainFolder?.file(`00_EVIDENCE_MANIFEST_INDEX.json`, JSON.stringify(jsonManifest, null, 2));

  // 3. Add Individual Evidence Files
  const exhibitsFolder = mainFolder?.folder(`Exhibits_Media`);

  selectedItems.forEach((ev, idx) => {
    const ext = getMimeExtension(ev.dataUrl, ev.name);
    const cleanName = sanitizeFilename(ev.name.replace(/\.[^/.]+$/, ''));
    const fileName = `Exhibit_${String(idx + 1).padStart(2, '0')}_${cleanName}.${ext}`;

    if (ev.dataUrl && ev.dataUrl.includes(',')) {
      const bytes = dataUrlToUint8Array(ev.dataUrl);
      if (bytes) {
        exhibitsFolder?.file(fileName, bytes);
      } else {
        exhibitsFolder?.file(`${cleanName}_details.txt`, `Exhibit Name: ${ev.name}\nCategory: ${ev.category}\nAI Analysis: ${ev.aiDescription}`);
      }
    } else {
      const textContent = `MANA MURTII AANAA GURBICHA - EVIDENCE EXHIBIT RECORD
Exhibit #${idx + 1}: ${ev.name}
Category: ${ev.category || 'General'}
Uploaded: ${ev.uploadedAt}
Admissibility: ${ev.admissibilityStatus || 'Admissible'}

AI LEGAL ANALYSIS:
${ev.aiDescription || 'No description provided.'}

RELEVANCE:
${ev.aiRelevance || 'Relevant to case proceedings.'}
`;
      exhibitsFolder?.file(`Exhibit_${String(idx + 1).padStart(2, '0')}_${cleanName}.txt`, textContent);
    }
  });

  // Generate and trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Court_Evidence_Package_${caseNumSanitized}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
}

/**
 * Exports selected evidence as a standalone PDF dossier
 */
export async function exportEvidenceAsPdfDossier(
  caseData: PracticeCase,
  selectedItems: CaseEvidence[],
  lang: Language = 'om'
): Promise<void> {
  const pdfDoc = await generateEvidenceDossierPdf(caseData, selectedItems, lang);
  const caseNumSanitized = sanitizeFilename(caseData.caseNumber || 'CASE-2026-0042');
  pdfDoc.save(`Court_Evidence_Dossier_${caseNumSanitized}.pdf`);
}
