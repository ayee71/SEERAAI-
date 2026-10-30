export interface WatermarkOptions {
  text?: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
  courtName?: string;
  userName?: string;
  role?: string;
}

export const applyCourtWatermarkPDF = (doc: any, caseNumberOrOptions: string | WatermarkOptions = '') => {
  try {
    const text = typeof caseNumberOrOptions === 'string' 
      ? `OFFICIAL COURT COPY - ${caseNumberOrOptions}` 
      : (caseNumberOrOptions.text || `OFFICIAL COURT COPY - ${caseNumberOrOptions.courtName || 'SEERAAI'}`);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(text, 14, 285);
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
