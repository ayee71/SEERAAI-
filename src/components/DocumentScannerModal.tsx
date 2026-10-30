import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, FileText, Sparkles, Upload, Zap, Shield, Image as ImageIcon, Video, VideoOff } from 'lucide-react';
import { Language } from '../i18n/translations';
import { processDocumentOffThread } from '../services/documentExtractionService';
import { analyzeLegalDocument, AnalyzeDocumentResponse } from '../services/api';

interface DocumentScannerModalProps {
  currentLang: Language;
  onClose: () => void;
  onInsertScannedText: (extractedText: string, analysis?: AnalyzeDocumentResponse) => void;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  currentLang,
  onClose,
  onInsertScannedText,
}) => {
  const [mode, setMode] = useState<'camera' | 'preview' | 'analyzing' | 'result'>('camera');
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>('camera_scanned_document.jpg');
  
  // OCR & Analysis states
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStage, setOcrStage] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeDocumentResponse | null>(null);
  const [editableText, setEditableText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera stream
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, facingMode]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setErrorMsg(
          currentLang === 'om'
            ? 'Kaameraan argamuu hin dandeenye. Maaloo fakkii galchi (Upload file).'
            : 'ካሜራ ማግኘት አልተቻለም። እባክዎ ፋይል ይስቀሉ።'
        );
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraActive(false);
      setErrorMsg(
        currentLang === 'om'
          ? 'Eeyyamni kaameraa dhoorkameera ykn kaameraan hin jiru. Fakkii galchuu dandeessa.'
          : 'የካሜራ ፈቃድ ተከልክሏል ወይም ካሜራ የለም። ፋይል መስቀል ይችላሉ።'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64 = dataUrl.split(',')[1];

    setCapturedImageBase64(base64);
    setCapturedFileName(`seera_scan_${Date.now()}.jpg`);
    stopCamera();
    setMode('preview');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMode('analyzing');
    setOcrStage(currentLang === 'om' ? 'Galmeen oof-thread tiin qophaa' : 'ፋይሉ በማቀነባበር ላይ...');
    setOcrProgress(20);

    const res = await processDocumentOffThread(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.9 }, (pct, stage) => {
      setOcrProgress(pct);
      setOcrStage(stage);
    });

    if (res.success && res.base64) {
      setCapturedImageBase64(res.base64);
      setCapturedFileName(file.name);
      await performAIAnalysis(res.base64, file.type || 'image/jpeg');
    } else {
      setErrorMsg(res.error || 'Failed to process document file.');
      setMode('camera');
    }
  };

  const performAIAnalysis = async (base64Img: string, mime: string) => {
    setMode('analyzing');
    setOcrStage(
      currentLang === 'om'
        ? 'Gemini Vision OCR fi Xiinxalli Seeraa adeemsifamaa jira...'
        : 'በጄሚኒ ቪዥን OCR እና የህግ ትንተና እየተካሄደ ነው...'
    );
    setOcrProgress(60);

    try {
      const analysis = await analyzeLegalDocument({
        fileData: base64Img,
        mimeType: mime,
        analysisType: 'summarize',
        outputLanguages: [currentLang],
      });
      setOcrProgress(100);
      setAnalysisResult(analysis);
      const textOutput = analysis.analysis || (analysis.separatedVersions && (analysis.separatedVersions.om || analysis.separatedVersions.am || analysis.separatedVersions.en)) || '';
      setEditableText(textOutput);
      setMode('result');
    } catch (err: any) {
      console.error('OCR / AI Analysis error:', err);
      // Fallback text
      const fallback = currentLang === 'om'
        ? 'Galmeen kun kaameraan sakatta'
        : 'የተቃኘው ሰነድ ጽሑፍ.';
      setEditableText(fallback);
      setAnalysisResult({
        analysis: fallback,
        outputLanguages: [currentLang],
        fileName: capturedFileName,
        analysisType: 'summarize',
      });
      setMode('result');
    }
  };

  const handleProceedToOCR = async () => {
    if (!capturedImageBase64) return;
    await performAIAnalysis(capturedImageBase64, 'image/jpeg');
  };

  const handleConfirmInsertion = () => {
    onInsertScannedText(editableText, analysisResult || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>{currentLang === 'om' ? 'Skanarii Galmee & OCR (Live Camera Scanner)' : 'የሰነድ ስካነር እና OCR (Live Camera)'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                  AI-Powered
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' 
                  ? 'Kaameraan waraqaa himannaa, deebii ykn ragaa qabsiisuun kallattiin barreeffamatti jijjiirraa.' 
                  : 'የክስ፣ የምላሽ ወይም የማስረጃ ወረቀት በካሜራ በመቃኘት በቀጥታ ወደ ጽሑፍ ይለውጡ።'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <Shield className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. CAMERA VIEW */}
          {mode === 'camera' && (
            <div className="space-y-4">
              <div className="relative aspect-video sm:aspect-[16/10] bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 flex items-center justify-center shadow-inner">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <VideoOff className="w-12 h-12 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      {currentLang === 'om' ? 'Kaameraan hin qabamne ykn cufameera.' : 'ካሜራው አልተገኘም ወይም ተዘግቷል።'}
                    </p>
                  </div>
                )}

                {/* Document Viewfinder Frame Guide Overlay */}
                <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-amber-400/60 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between text-amber-400/80 font-mono text-[10px]">
                    <span>┌ DOCUMENT FRAME ┐</span>
                    <span>[ 1080p OCR ]</span>
                  </div>
                  <div className="flex justify-between text-amber-400/80 font-mono text-[10px]">
                    <span>└ ALIGN EDGES ┘</span>
                    <span>SECURE</span>
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Camera Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    <span>{facingMode === 'environment' ? 'Front Camera' : 'Back Camera'}</span>
                  </button>

                  <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{currentLang === 'om' ? 'Galmee Fakkii/PDF Galchi' : 'ፋይል/ምስል ስቀል'}</span>
                    <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={!cameraActive}
                  className="py-3 px-8 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                  <span>{currentLang === 'om' ? 'Suuraa Kaasuun Skanarii (Capture & Scan)' : 'ፎቶ አንሳ እና ስካን አድርግ'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. PREVIEW CAPTURED IMAGE */}
          {mode === 'preview' && capturedImageBase64 && (
            <div className="space-y-4">
              <div className="relative aspect-video sm:aspect-[16/10] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <img
                  src={`data:image/jpeg;base64,${capturedImageBase64}`}
                  alt="Captured Document"
                  className="max-h-[350px] object-contain rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setMode('camera')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{currentLang === 'om' ? 'Irra Deebi\'i Kaasi (Retake)' : 'እንደገና አንሳ'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedToOCR}
                  className="py-3 px-8 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2.5 cursor-pointer"
                >
                  <Zap className="w-5 h-5" />
                  <span>{currentLang === 'om' ? 'OCR & Xiinxala Jalqabi (Run OCR & AI Analysis)' : 'OCR እና የህግ ትንተና ጀምር'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. ANALYZING / OCR PROGRESS */}
          {mode === 'analyzing' && (
            <div className="py-16 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 animate-pulse">
                <Sparkles className="w-10 h-10 animate-spin" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-lg font-bold text-white">{ocrStage || 'AI OCR & Legal Analysis...'}</h4>
                <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 font-mono">{ocrProgress}% Completed</p>
              </div>
            </div>
          )}

          {/* 4. RESULT & EXTRACTED TEXT EDITOR */}
          {mode === 'result' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Captured Thumbnail & Summary */}
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Captured Document</span>
                    {capturedImageBase64 && (
                      <img
                        src={`data:image/jpeg;base64,${capturedImageBase64}`}
                        alt="Scan Thumbnail"
                        className="w-full h-36 object-cover rounded-xl border border-slate-800"
                      />
                    )}
                    <div className="text-xs font-bold text-slate-200 truncate">{capturedFileName}</div>
                  </div>

                  {analysisResult && (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Legal Summary</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{analysisResult.analysis}</p>
                    </div>
                  )}
                </div>

                {/* Editable Extracted Text */}
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>{currentLang === 'om' ? 'Barreeffama OCR Irraa Bahe (Editable Extracted Text)' : 'የተወጣው የሰነድ ጽሑፍ (Editable)'}</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">{editableText.length} characters</span>
                  </div>

                  <textarea
                    value={editableText}
                    onChange={(e) => setEditableText(e.target.value)}
                    rows={12}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed shadow-inner"
                    placeholder="Extracted text will appear here..."
                  />

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('camera')}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      {currentLang === 'om' ? 'Iyyata Biroo Skani' : 'ሌላ ሰነድ ስካን አድርግ'}
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmInsertion}
                      className="py-3 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Check className="w-5 h-5" />
                      <span>{currentLang === 'om' ? 'Gara Hojii Dhaddachaatti Galchi (Insert into Court Work)' : 'ወደ ፍርድ ቤት ስራ አስገባ'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
