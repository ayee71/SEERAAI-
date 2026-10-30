import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, ExternalLink, Download, Share2 } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { createShareableUrl } from '../services/shareUrl';

interface CourtEntryQRModalProps {
  currentLang: Language;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  onClose: () => void;
}

export const CourtEntryQRModal: React.FC<CourtEntryQRModalProps> = ({
  currentLang,
  caseId,
  caseNumber,
  caseTitle,
  onClose,
}) => {
  const t = translations[currentLang];
  
  const shareUrl = createShareableUrl({
    tab: 'caseStatus',
    caseId,
    lang: currentLang
  });

  const handleDownloadQR = () => {
    const svg = document.getElementById('case-qr-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 100;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        ctx.fillStyle = 'black';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Case: ${caseNumber}`, canvas.width / 2, img.height + 50);
        ctx.font = '12px sans-serif';
        ctx.fillText('SeeraAI Court Entry System', canvas.width / 2, img.height + 75);
      }
      
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_Entry_${caseNumber}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-amber-500/30 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-serif-legal">Court Entry QR</h3>
              <p className="text-xs text-slate-400 font-mono">Case: {caseNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-6 space-y-6 relative z-10">
          <div className="p-4 bg-white rounded-3xl shadow-xl">
            <QRCodeSVG 
              id="case-qr-svg"
              value={shareUrl} 
              size={200}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: 'https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app/logo.png',
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-slate-200">{caseTitle}</p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[280px] mx-auto">
              Scan this QR to view your live case status and hearing schedule on your personal device.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10">
          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer border border-slate-700"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download</span>
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `SeeraAI Court Entry - ${caseNumber}`,
                  text: `View live case status for ${caseTitle}`,
                  url: shareUrl
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText(shareUrl);
                alert('Link copied to clipboard!');
              }
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-lg"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Link</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-800/50 text-center relative z-10">
          <a 
            href={shareUrl} 
            target="_blank" 
            rel="noreferrer"
            className="text-[10px] text-amber-500/70 hover:text-amber-500 underline flex items-center justify-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Preview Client Portal View</span>
          </a>
        </div>
      </div>
    </div>
  );
};
