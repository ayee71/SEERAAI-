import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  X, 
  Upload, 
  Check, 
  Sparkles, 
  Tag, 
  Scale, 
  Shield, 
  FileText, 
  AlertCircle, 
  RefreshCw, 
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Lock,
  Share2,
  Copy,
  ExternalLink,
  QrCode,
  Globe,
  Eye,
  Calendar
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { PhysicalCaseEvidence, savePhysicalEvidenceToCase } from '../services/courtCaseService';

export interface EvidenceCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  caseId: string;
  caseNumber: string;
  claimantName?: string;
  respondentName?: string;
  activeJudgeName?: string;
  onEvidenceSaved?: (evidence: PhysicalCaseEvidence) => void;
}

export const EvidenceCaptureModal: React.FC<EvidenceCaptureModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  caseId,
  caseNumber,
  claimantName = 'Obbo Baqqalaa Gammachuu',
  respondentName = 'Adde Birhaanee Asfaawu',
  activeJudgeName = 'Abbaa Seeraa Caalaa',
  onEvidenceSaved
}) => {
  // Capture modes
  const [captureSource, setCaptureSource] = useState<'camera' | 'upload'>('camera');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoDataUrl, setCapturedPhotoDataUrl] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<PhysicalCaseEvidence['category']>('document');
  const [exhibitNumber, setExhibitNumber] = useState<string>('Exhibit P-1');
  const [tenderedBy, setTenderedBy] = useState<PhysicalCaseEvidence['tenderedBy']>('plaintiff');
  const [tenderedByName, setTenderedByName] = useState<string>(claimantName);
  const [description, setDescription] = useState<string>('');
  const [legalRelevance, setLegalRelevance] = useState<string>('');
  const [statutoryBasis, setStatutoryBasis] = useState<string>('Civil Procedure Code Art. 258 / SDFHH Kwt 258');
  const [admissibilityStatus, setAdmissibilityStatus] = useState<PhysicalCaseEvidence['admissibilityStatus']>('tendered');
  const [locationTag, setLocationTag] = useState<string>('Dhaddacha 1ffaa / Courtroom 1');
  
  // Status
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Secure Legal Consultation Share State
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [consultExpiry, setConsultExpiry] = useState<'24h' | '7d' | '30d' | 'permanent'>('7d');
  const [consultRecipientRole, setConsultRecipientRole] = useState<string>('Senior Legal Advocate / Gorsaa Seeraa');
  const [consultRecipientEmail, setConsultRecipientEmail] = useState<string>('');
  const [shareLinkCopied, setShareLinkCopied] = useState<boolean>(false);
  const [generatedShareToken, setGeneratedShareToken] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState<boolean>(false);

  useEffect(() => {
    if (showShareModal && !generatedShareToken) {
      const randomPart = Math.random().toString(36).substring(2, 10);
      const timePart = Date.now().toString(36);
      setGeneratedShareToken(`seeraai_consult_${timePart}_${randomPart}`);
    }
  }, [showShareModal, generatedShareToken]);

  const getConsultationUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://seeraai.et';
    const params = new URLSearchParams({
      token: generatedShareToken || `seeraai_${caseId.slice(0, 6)}`,
      case: caseId,
      docket: caseNumber,
      exhibit: exhibitNumber,
      role: consultRecipientRole,
      exp: consultExpiry,
      mode: 'read_only'
    });
    return `${origin}/evidence/consult?${params.toString()}`;
  };

  const handleCopyShareLink = () => {
    const url = getConsultationUrl();
    navigator.clipboard.writeText(url);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    const url = getConsultationUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `[SEERAAI Legal Consultation] ${exhibitNumber} - ${caseNumber}`,
          text: `Read-only legal consultation link for court exhibit ${exhibitNumber} (${title || 'Physical Evidence'}). Case: ${caseNumber}`,
          url
        });
      } catch (err) {
        // Canceled or fallback
      }
    } else {
      handleCopyShareLink();
    }
  };

  // Video / Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-generate next exhibit label based on tenderer
  useEffect(() => {
    if (tenderedBy === 'plaintiff') {
      setExhibitNumber(`Exhibit P-${Math.floor(Math.random() * 8) + 1}`);
      setTenderedByName(claimantName);
    } else if (tenderedBy === 'defendant') {
      setExhibitNumber(`Exhibit D-${Math.floor(Math.random() * 8) + 1}`);
      setTenderedByName(respondentName);
    } else if (tenderedBy === 'prosecutor') {
      setExhibitNumber(`Exhibit PP-${Math.floor(Math.random() * 8) + 1}`);
      setTenderedByName('Abbaa Alangaa Mootummaa');
    } else if (tenderedBy === 'witness') {
      setExhibitNumber(`Exhibit W-${Math.floor(Math.random() * 8) + 1}`);
      setTenderedByName('Ragaa Dhaddachaa');
    } else {
      setExhibitNumber(`Exhibit C-${Math.floor(Math.random() * 8) + 1}`);
      setTenderedByName(activeJudgeName);
    }
  }, [tenderedBy, claimantName, respondentName, activeJudgeName]);

  // Start Device Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // prefer rear camera for documents / evidence
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Hayyama kaameraa dhoowwameera (Camera permission denied). Browser settings keessatti hayyama kennaa ykn faayila upload godhaa.'
          : 'Kaameraa banuun hin danda\'amne. Bakka kana faayila suuraa filachuun upload godhaa.'
      );
      setIsCameraActive(false);
      setCaptureSource('upload');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Launch camera when modal opens
  useEffect(() => {
    if (isOpen && captureSource === 'camera' && !capturedPhotoDataUrl) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, captureSource, capturedPhotoDataUrl]);

  // Snap Photo
  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add Courtroom Digital Watermark with Timestamp and Case Ref
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(0, canvas.height - 52, canvas.width, 52);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`SEERAAI EVIDENCE ARCHIVE • CASE: ${caseNumber}`, 20, canvas.height - 30);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${new Date().toLocaleString()} • ${exhibitNumber} • Tendered: ${tenderedByName}`, 20, canvas.height - 12);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhotoDataUrl(dataUrl);
    stopCamera();

    // Default title if empty
    if (!title) {
      setTitle(`Ragaa Qabatamaa (${exhibitNumber}) - ${new Date().toLocaleDateString()}`);
    }
    if (!description) {
      setDescription(`Ragaan qabatamaa suuraa kaameeraatiin waraabbamee dhaddacha galmee ${caseNumber} irratti dhiyaate.`);
    }
    if (!legalRelevance) {
      setLegalRelevance(`S.A.F.H.H. Kwt 258 bu'uureffachuun ragaa hundee dubbii mirkaneessu ta'ee galmeeffameera.`);
    }
  };

  // Retake Photo
  const handleRetake = () => {
    setCapturedPhotoDataUrl(null);
    startCamera();
  };

  // Handle Local File Upload as photo evidence
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedPhotoDataUrl(dataUrl);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  // AI Assist: Generate description and relevance
  const handleGenerateAIDescription = () => {
    if (currentLang === 'am') {
      setDescription(`ይህ የገሃድ ማስረጃ በፋይል ቁጥር ${caseNumber} ውስጥ በቀረበው ክርክር ላይ የቦታውን፣ የሰነዱን ወይም የቁሳቁሱን ትክክለኛ ገጽታ የሚያሳይ ነው።`);
      setLegalRelevance(`በፍትሐብሔር ሥነ-ሥርዓት ሕግ ቁጥር 258 መሠረት የፍሬ-ነገር ማረጋገጫ ሆኖ ያገለግላል።`);
    } else if (currentLang === 'en') {
      setDescription(`Physical exhibit photographed under court supervision in case ${caseNumber}. Demonstrates material condition and provenance.`);
      setLegalRelevance(`Tendered pursuant to Civil Procedure Code Art. 258 as primary real evidence corroborating oral arguments.`);
    } else {
      setDescription(`Ragaan qabatamaa suuraa kaameeraatiin waraabbame kun haala fi qabiyyee dhimma galmee lakk. ${caseNumber} keessatti falmiin irratti ka\'e ifatti agarsiisa.`);
      setLegalRelevance(`Akkaataa S.A.F.H.H. Keeyyata 258tti ragaa qabatamaa (Real Evidence) ta\'ee falmii gareewwanii mirkaneessuuf dhiyaate.`);
    }
  };

  // Save to Case File
  const handleSaveEvidence = async () => {
    if (!capturedPhotoDataUrl) {
      alert('Mee dura suuraa kaameeraadhaan kaasaa ykn upload godhaa!');
      return;
    }
    if (!title.trim()) {
      alert('Mata duree ragaa (Title) guutaa!');
      return;
    }

    setIsSaving(true);
    try {
      const result = await savePhysicalEvidenceToCase(caseId, {
        caseNumber,
        title: title.trim(),
        category,
        photoDataUrl: capturedPhotoDataUrl,
        description: description.trim(),
        legalRelevance: legalRelevance.trim(),
        exhibitNumber,
        tenderedBy,
        tenderedByName,
        custodianOfficer: activeJudgeName,
        capturedBy: activeJudgeName,
        capturedLocation: locationTag,
        admissibilityStatus,
        statutoryBasis
      });

      if (result.success) {
        setSuccessToast(result.message);
        onEvidenceSaved?.(result.evidence);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (e: any) {
      console.error('Failed to save physical evidence:', e);
      alert('Ragaa galmeessuun hin danda\'amne: ' + (e.message || String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Ragaa Qabatamaa Kaameeraadhaan Waraabuu</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {caseNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' 
                  ? 'Suuraa ragaa qabatamaa kaameeraan kaasuun battalumatti galmee dhaddachaa keessatti kuusi' 
                  : 'Capture physical real evidence with device camera and link to case file'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1">
          {/* Source Tabs */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCaptureSource('camera');
                  if (!capturedPhotoDataUrl) startCamera();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  captureSource === 'camera'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Kaameeraa Qajeelaa (Live Camera)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCaptureSource('upload');
                  stopCamera();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  captureSource === 'upload'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Faayila Suuraa Olkaa'i (Upload Photo)</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Chain of Custody Timestamped</span>
            </div>
          </div>

          {/* Camera Viewport & Photo Preview Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>1. Waraabbata Suuraa (Evidence Camera Frame)</span>
                {capturedPhotoDataUrl && (
                  <span className="text-emerald-400 text-[10px] font-black">✓ WARAABBAMEERA</span>
                )}
              </label>

              {/* Viewport Box */}
              <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden flex items-center justify-center group shadow-inner">
                {/* Mode A: Live Camera Active */}
                {captureSource === 'camera' && !capturedPhotoDataUrl && (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder crosshairs for court evidence calibration */}
                    <div className="absolute inset-6 border border-dashed border-amber-400/40 rounded-xl pointer-events-none flex items-center justify-center">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-amber-400 absolute top-0 left-0" />
                      <div className="w-6 h-6 border-t-2 border-r-2 border-amber-400 absolute top-0 right-0" />
                      <div className="w-6 h-6 border-b-2 border-l-2 border-amber-400 absolute bottom-0 left-0" />
                      <div className="w-6 h-6 border-b-2 border-r-2 border-amber-400 absolute bottom-0 right-0" />
                      <span className="text-[10px] font-mono font-bold text-amber-400/80 bg-slate-950/70 px-2 py-0.5 rounded border border-amber-400/30">
                        EVIDENCE ALIGNMENT FRAME
                      </span>
                    </div>

                    {/* Snap Button Overlay */}
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleSnapPhoto}
                        className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xl shadow-amber-500/50 cursor-pointer active:scale-95 transition-transform"
                      >
                        <Camera className="w-4 h-4 fill-current" />
                        <span>Suuraa Kaasi (Capture Photo)</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Mode B: Photo Snapped / Preview */}
                {capturedPhotoDataUrl && (
                  <div className="relative w-full h-full">
                    <img
                      src={capturedPhotoDataUrl}
                      alt="Captured Evidence"
                      className="w-full h-full object-contain bg-slate-950"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowShareModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600/95 hover:bg-blue-500 text-white border border-blue-400/40 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer transition-all active:scale-95"
                        title="Generate secure read-only link for external legal consultation"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Qoodi (Share)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRetake}
                        className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Irra Deebi'i (Retake)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode C: File Upload Area */}
                {captureSource === 'upload' && !capturedPhotoDataUrl && (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-300">Suuraa ragaa qabatamaa filadhaa</p>
                      <p className="text-[11px] text-slate-500">JPG, PNG, WebP hanga 15MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer"
                    >
                      Browse Device Photos
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Error Banner if camera failed */}
                {cameraError && captureSource === 'camera' && !capturedPhotoDataUrl && (
                  <div className="p-4 text-center space-y-2 bg-slate-950/90 m-4 rounded-xl border border-rose-500/40">
                    <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                    <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setCaptureSource('upload')}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
                    >
                      Switch to File Upload
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden canvas for snapshot rendering */}
              <canvas ref={canvasRef} className="hidden" />

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>Qajeelfama Kaameeraa Dhaddachaa:</span>
                  <span className="font-mono text-amber-400">SDFHH Kwt 258</span>
                </div>
                <p>Suuraan kaafamu mallattoo, iddoo qabatamaa, fi ibsa qabeenya falmii irratti ka'e ifatti calaqqisiisuu qaba.</p>
              </div>
            </div>

            {/* Form Fields: Metadata, Tenderer, Exhibit Number */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>2. Ibsa fi Odeeffannoo Ragaa (Evidence Metadata)</span>
                <button
                  type="button"
                  onClick={handleGenerateAIDescription}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Assist</span>
                </button>
              </label>

              {/* Title & Exhibit Number */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Mata Duree Ragaa (Title) *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Fkn: Waraqaa Ragaa Lafaa, Meeshaa Qabame..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-amber-400 font-mono">Exhibit #</label>
                  <input
                    type="text"
                    value={exhibitNumber}
                    onChange={(e) => setExhibitNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Category & Admissibility Status */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Gosa Ragaa (Category)</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="document">📄 Sanada Barreeffamaa (Documentary)</option>
                    <option value="spatial_land">🗺️ Qabeenya Lafaa & Manaa (Spatial / Land)</option>
                    <option value="weapon_object">🗡️ Meeshaa / Qabeenya Falmii (Object / Weapon)</option>
                    <option value="financial_receipt">💳 Nagahee Kaffaltii (Receipt / Bank Slip)</option>
                    <option value="forensic">🔬 Ragaa Saayinsii (Forensic Item)</option>
                    <option value="other">📦 Ragaa Biroo (Other Physical Item)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Haala Fudhatamaa (Status)</label>
                  <select
                    value={admissibilityStatus}
                    onChange={(e) => setAdmissibilityStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="tendered">📋 Dhiyaateera (Tendered)</option>
                    <option value="admitted">✅ Fudhatama Argate (Admitted)</option>
                    <option value="marked_for_id">🏷️ Eenyummaa Qofaan Galmaa'e (Marked for ID)</option>
                    <option value="objected">⚠️ Mormiin Ka'eera (Objected)</option>
                    <option value="rejected">❌ Kuffifameera (Rejected)</option>
                  </select>
                </div>
              </div>

              {/* Tendered By & Name */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Garee Dhiyeesse (Tenderer)</label>
                  <select
                    value={tenderedBy}
                    onChange={(e) => setTenderedBy(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="plaintiff">Himataa (Plaintiff)</option>
                    <option value="defendant">Himatamaa (Defendant)</option>
                    <option value="prosecutor">Abbaa Alangaa (Prosecutor)</option>
                    <option value="witness">Ragaa (Witness)</option>
                    <option value="court">Mana Murtii (Court Initiated)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Maqaa Dhiyeessaa (Name)</label>
                  <input
                    type="text"
                    value={tenderedByName}
                    onChange={(e) => setTenderedByName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Ibsa Ragaa (Physical Description)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ibsa qabatamaa suuraa kanaan agarsiifamu..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              {/* Legal Relevance */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Rogummaa Seeraa (Legal Relevance & Statutory Basis)</label>
                <textarea
                  rows={2}
                  value={legalRelevance}
                  onChange={(e) => setLegalRelevance(e.target.value)}
                  placeholder="S.A.F.H.H. Kwt 258 bu'uureffachuun ragaan kun..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>{locationTag}</span>
            <span className="text-slate-600">|</span>
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Custodian: {activeJudgeName}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {capturedPhotoDataUrl && (
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Generate secure read-only link for external legal consultation"
              >
                <Share2 className="w-4 h-4 text-blue-400" />
                <span>Qoodi (Share)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Dhiisi (Cancel)
            </button>

            <button
              type="button"
              onClick={handleSaveEvidence}
              disabled={isSaving || !capturedPhotoDataUrl}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Galmeessaa jira...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Galmeetti Kuusi (Save Evidence)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
        )}

        {/* 🔗 SECURE READ-ONLY LEGAL CONSULTATION SHARE MODAL */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
            <div className="bg-slate-900 border-2 border-blue-500/50 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 relative">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold shadow-inner">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <span>Qoodiinsa Seeraa (Secure Consultation Link)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Gorsitoota seeraa alaa ykn ogeessota qorannoof hayyama dubbisaa qofa (read-only) kennaa.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Security & Docket Info Badge */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-blue-500/30 flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400">{caseNumber}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    READ-ONLY RESTRICTED
                  </span>
                </div>
                <div className="text-slate-300 font-bold text-xs mt-0.5">
                  {exhibitNumber}: {title || 'Ragaa Qabatamaa (Physical Real Evidence)'}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                  <Lock className="w-3 h-3 text-blue-400" />
                  <span>Sanadni kun eegumsa seeraatiin iccitummaan isaa kan eegamedha; jijjiiramuu hin danda'u.</span>
                </div>
              </div>

              {/* Consultation Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Yeroo Daangaa (Access Duration)</span>
                  </label>
                  <select
                    value={consultExpiry}
                    onChange={(e) => setConsultExpiry(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="24h">Sa'aatii 24 (Urgent Sidebar Consultation)</option>
                    <option value="7d">Guyyoota 7 (Pending Hearing Consultation)</option>
                    <option value="30d">Guyyoota 30 (Appellate / Cassation Review)</option>
                    <option value="permanent">Hundee Galmee (Permanent Read-Only Archive)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-400" />
                    <span>Qaama Gorsaa (Target Recipient)</span>
                  </label>
                  <select
                    value={consultRecipientRole}
                    onChange={(e) => setConsultRecipientRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="Senior Legal Advocate / Abukaattoo">Senior Legal Advocate / Abukaattoo</option>
                    <option value="Forensic / Technical Expert">Forensic / Technical Expert</option>
                    <option value="Appellate / Cassation Counsel">Appellate / Cassation Counsel</option>
                    <option value="Independent Legal Assessor">Independent Legal Assessor</option>
                  </select>
                </div>
              </div>

              {/* Share URL Box */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>Linkii Qoodiinsaa Eegame (Secure Consultation URL)</span>
                  {shareLinkCopied && (
                    <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
                      ✓ Linkiin Koppii Ta'eera! (Copied!)
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getConsultationUrl()}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Koppii</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                    title="Share via Device Apps"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQrCode(!showQrCode)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      showQrCode ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title="Toggle Courtroom QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* QR Code Courtroom Fast-Scan Box */}
              {showQrCode && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-2 text-center animate-in fade-in">
                  <div className="p-3 bg-white rounded-xl shadow-inner inline-block">
                    {/* Visual QR Pattern SVG */}
                    <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                      <rect width="100" height="100" fill="white" />
                      {/* Corner Position Detection Patterns */}
                      <rect x="10" y="10" width="24" height="24" stroke="black" strokeWidth="4" fill="none" />
                      <rect x="16" y="16" width="12" height="12" fill="black" />
                      <rect x="66" y="10" width="24" height="24" stroke="black" strokeWidth="4" fill="none" />
                      <rect x="72" y="16" width="12" height="12" fill="black" />
                      <rect x="10" y="66" width="24" height="24" stroke="black" strokeWidth="4" fill="none" />
                      <rect x="16" y="72" width="12" height="12" fill="black" />
                      {/* Data dots simulating encoded consultation token */}
                      <rect x="42" y="12" width="6" height="6" fill="black" />
                      <rect x="52" y="12" width="6" height="6" fill="black" />
                      <rect x="42" y="24" width="6" height="6" fill="black" />
                      <rect x="48" y="32" width="6" height="6" fill="black" />
                      <rect x="12" y="42" width="6" height="6" fill="black" />
                      <rect x="24" y="48" width="6" height="6" fill="black" />
                      <rect x="42" y="48" width="16" height="16" fill="black" />
                      <rect x="66" y="42" width="6" height="6" fill="black" />
                      <rect x="78" y="48" width="6" height="6" fill="black" />
                      <rect x="66" y="66" width="8" height="8" fill="black" />
                      <rect x="80" y="72" width="8" height="8" fill="black" />
                      <rect x="48" y="72" width="8" height="8" fill="black" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Mobaayilaan iskaan gochuun battalumatti dhaddacha keessatti banaa
                  </span>
                </div>
              )}

              {/* Watermark & Legal Audit Notice */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Eegumsa Iccitii Dhaddachaa (Chain of Custody Legal Notice)</span>
                </div>
                <p className="leading-relaxed">
                  Linkiin kun gorsa seeraa alaa qofaaf kan qophaa'edha. Qaamni linkii kanaan fayyadamu ragaa kana jijjiiruu, haquu ykn dhimma seeraatiin ala dhiyeessuu hin danda'u.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase cursor-pointer"
                >
                  Xumuri (Done)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
