import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface QRScannerModalProps {
  currentLang: Language;
  onClose: () => void;
  onScanSuccess?: (caseIdOrUrl: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  currentLang,
  onClose,
  onScanSuccess
}) => {
  const t = translations[currentLang];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  // Initialize camera stream and BarcodeDetector if supported
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        setIsScanning(true);
        setScanError(null);
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Use Native BarcodeDetector API if available in Chrome/Edge/Android
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const scanLoop = async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  handleCodeDetected(rawValue);
                  return;
                }
              } catch (e) {
                // Keep trying
              }
            }
            animationFrameId = requestAnimationFrame(scanLoop);
          };
          scanLoop();
        }
      } catch (err) {
        console.warn('Camera access error or unsupported:', err);
        setHasCamera(false);
        setIsScanning(false);
      }
    };

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCodeDetected = (code: string) => {
    setScannedResult(code);
    setIsScanning(false);

    // Extract caseId if it's a URL
    let targetCaseId = code;
    try {
      if (code.includes('caseId=')) {
        const urlParams = new URLSearchParams(code.split('?')[1]);
        const cid = urlParams.get('caseId');
        if (cid) targetCaseId = cid;
      }
    } catch {}

    if (onScanSuccess) {
      onScanSuccess(targetCaseId);
    } else {
      // Default navigation to case status or case view
      if (code.startsWith('http://') || code.startsWith('https://')) {
        window.location.href = code;
      } else {
        window.location.assign(`/?tab=caseStatus&caseId=${encodeURIComponent(targetCaseId)}`);
      }
    }
  };

  // Handle manual file upload scan
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if ('BarcodeDetector' in window) {
      const img = new Image();
      img.onload = async () => {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0) {
            handleCodeDetected(barcodes[0].rawValue);
          } else {
            setScanError(currentLang === 'om' ? 'Koodiin QR suuraa kana keessaa hin argamne.' : 'No QR code found in image.');
          }
        } catch {
          setScanError(currentLang === 'om' ? 'Sakatta\'iinsi suuraa hin milkaa\'ine.' : 'Failed to scan image.');
        }
      };
      img.src = URL.createObjectURL(file);
    } else {
      setScanError(currentLang === 'om' ? 'Maaloo koodii galmee asitti galchaa.' : 'Please enter case ID manually below.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCodeInput.trim()) {
      handleCodeDetected(manualCodeInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-amber-500/40 rounded-[2.5rem] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Scanner Koodii QR Mana Murtii' : 'Court QR Code Scanner'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">Real-time Public & Client Case Verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Camera Scanner Box */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 aspect-square flex items-center justify-center shadow-inner">
          {hasCamera ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="p-6 text-center space-y-3">
              <Camera className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                {currentLang === 'om' ? 'Kaameraan hin argamne ykn eeyyamni hin kennamne.' : 'Camera not available or access denied.'}
              </p>
            </div>
          )}

          {/* Scanner Overlay Line */}
          {isScanning && (
            <div className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-bounce pointer-events-none" />
          )}

          {/* Scanned Success Screen */}
          {scannedResult && (
            <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
              <h4 className="text-base font-bold text-white">QR Code Scanned Successfully!</h4>
              <p className="text-xs font-mono text-amber-300 bg-slate-900 p-3 rounded-xl border border-slate-800 max-w-full break-all">
                {scannedResult}
              </p>
              <button
                onClick={() => handleCodeDetected(scannedResult)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg cursor-pointer transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Gara Galmeettii Dabrsi (View Case)</span>
              </button>
            </div>
          )}
        </div>

        {scanError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Manual Code Input or File Upload */}
        <div className="space-y-3 relative z-10">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={manualCodeInput}
              onChange={(e) => setManualCodeInput(e.target.value)}
              placeholder="fkn. OR-CASE-2026-8819 ykn URL..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Barbaadi</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Suuraa QR koodii komputera irraa fe'i:</span>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold cursor-pointer transition-all border border-slate-700">
              <Upload className="w-3.5 h-3.5" />
              <span>Suuraa Fe'i</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;
