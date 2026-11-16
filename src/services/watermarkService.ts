export interface WatermarkOptions {
  text?: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
  courtName?: string;
  userName?: string;
  role?: string;
}

import gurbichaCourtLogo from '../assets/images/gurbicha_court_logo.png';

export interface WatermarkOptions {
  caseNumber?: string;
  courtName?: string;
  timestamp?: string;
}

export const applyCourtWatermarkPDF = (doc: any, options: WatermarkOptions = {}) => {
  try {
    const { caseNumber, courtName = 'MANA MURTII AANAA GURBICHA', timestamp = new Date().toLocaleString() } = options;
    
    // Add Logo (Seal)
    doc.addImage(gurbichaCourtLogo, 'PNG', 10, 10, 20, 20);
    
    // Header Text
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text('Mana Murtii Ol/Go/Baha Oromiyaatti', 40, 15);
    doc.setFontSize(14);
    doc.setTextColor(194, 65, 12); // Orange-ish
    doc.text('MANA MURTII AANAA GURBICHA', 40, 22);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Gurbicha District Court', 40, 28);
    
    // Footer Watermark
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`CASE: ${caseNumber || 'N/A'} | PRINTED: ${timestamp}`, 10, 285);
    doc.text('OFFICIAL LEGAL DOCUMENT - AUTHORIZED COPY', 10, 290);
  } catch (e) {
    console.error('Watermark error:', e);
  }
};

export const applyCourtWatermarkToPDF = applyCourtWatermarkPDF;

export const drawCanvasWatermark = (canvas: HTMLCanvasElement, text: string) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.save();
  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
  ctx.fillText(text, 20, 20);
  ctx.restore();
};
