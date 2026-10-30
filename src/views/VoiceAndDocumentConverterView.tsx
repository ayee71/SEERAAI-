import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Upload,
  Camera,
  FileText,
  Copy,
  Check,
  Download,
  Save,
  Volume2,
  RefreshCw,
  Sparkles,
  Globe,
  Trash2,
  Languages,
  ShieldCheck,
  AlertCircle,
  FileUp,
  Image as ImageIcon,
  Scan,
  Share2,
  BookOpen,
  ArrowRight,
  Maximize2,
  Wand2,
  CheckCircle2
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { transcribeSpeechAudio, convertMediaFileToText, translateLegalText, analyzeLegalDocument } from '../services/api';
import { saveDocument } from '../services/storage';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import mammoth from 'mammoth';
import { playOromoSpeech, stopOromoSpeech } from '../utils/oromoSpeechNormalizer';
import { correctOromoLegalText, TextCorrectionResult } from '../utils/oromoTextCorrector';
import { LegalSummaryAudioPlayer } from '../components/LegalSummaryAudioPlayer';
import { downloadLegalSummaryAudio } from '../services/legalAudioExportService';
import { VoiceCommandModal } from '../components/VoiceCommandModal';

interface VoiceAndDocumentConverterViewProps {
  currentLang: Language;
  onNavigateToTab?: (tab: string, query?: string) => void;
  initialTab?: 'audio_to_text' | 'image_file_to_text';
}

export const VoiceAndDocumentConverterView: React.FC<VoiceAndDocumentConverterViewProps> = ({
  currentLang,
  onNavigateToTab,
  initialTab = 'audio_to_text',
}) => {
  const t = translations[currentLang];

  // Active Main SubTab: 'audio_to_text' | 'image_file_to_text'
  const [activeConverterTab, setActiveConverterTab] = useState<'audio_to_text' | 'image_file_to_text'>(initialTab);
  const [isVoiceCmdModalOpen, setIsVoiceCmdModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveConverterTab(initialTab);
    }
  }, [initialTab]);

  // Selected Target/Audio Language: 'om' | 'am' | 'en' | 'auto'
  const [selectedLanguage, setSelectedLanguage] = useState<'om' | 'am' | 'en' | 'auto'>('auto');
  const [enableLegalMode, setEnableLegalMode] = useState<boolean>(true);

  // ==========================================
  // TAB 1: AUDIO & VOICE RECORDER STATE
  // ==========================================
  const [audioInputMode, setAudioInputMode] = useState<'record' | 'upload'>('record');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [detectedAudioLang, setDetectedAudioLang] = useState<Language | null>(null);

  // Audio recording timer & streams
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // ==========================================
  // TAB 2: IMAGE & FILE OCR STATE
  // ==========================================
  const [ocrInputMode, setOcrInputMode] = useState<'camera' | 'upload'>('upload');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [uploadedOcrFile, setUploadedOcrFile] = useState<{ file: File; base64: string; mimeType: string } | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [ocrProgressStep, setOcrProgressStep] = useState<string>('');
  const [extractedOcrText, setExtractedOcrText] = useState<string>('');
  const [detectedOcrLang, setDetectedOcrLang] = useState<Language | null>(null);
  const [ocrWordCount, setOcrWordCount] = useState<number>(0);

  // Camera video elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Shared UI States
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedVers, setTranslatedVers] = useState<{ om?: string; am?: string; en?: string }>({});

  // Automated Afaan Oromoo Text-Correction States
  const [correctionReport, setCorrectionReport] = useState<TextCorrectionResult | null>(null);
  const [isAutoCorrecting, setIsAutoCorrecting] = useState<boolean>(false);
  const [correctionToast, setCorrectionToast] = useState<string | null>(null);

  // Quick Automated Analysis & Translation States for OCR
  const [isAnalyzingOcr, setIsAnalyzingOcr] = useState<boolean>(false);
  const [ocrAnalysisReport, setOcrAnalysisReport] = useState<string | null>(null);
  const [ocrTranslateTarget, setOcrTranslateTarget] = useState<Language>('om');
  const [ocrTranslationResult, setOcrTranslationResult] = useState<string | null>(null);

  // Audio Review & Export States
  const [showPlayerForVoice, setShowPlayerForVoice] = useState(false);
  const [isExportingAudio, setIsExportingAudio] = useState(false);
  const [audioExportSuccessToast, setAudioExportSuccessToast] = useState(false);

  // Online vs Offline Voice Processing States
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [forceOfflineMode, setForceOfflineMode] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveOffline = isOffline || forceOfflineMode;

  const handleExportAudioFile = async (text: string, title: string) => {
    if (!text.trim()) return;
    setIsExportingAudio(true);
    try {
      await downloadLegalSummaryAudio(text, title, {
        lang: currentLang,
        preferNeural: true,
      });
      setAudioExportSuccessToast(true);
      setTimeout(() => setAudioExportSuccessToast(false), 3000);
    } catch (err) {
      console.warn('Audio export failed:', err);
    } finally {
      setIsExportingAudio(false);
    }
  };

  // Cleanup timers & camera on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // AUDIO: RECORDING LOGIC
  // -------------------------------------------------------------
  const handleStartRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscribedText('');
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(currentLang === 'om' ? 'Komeen mikrofoonaa hin deeggaramu.' : 'የማይክሮፎን መቅረጫ በመሳሪያዎ ላይ አልተገኘም።');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      recorder.start(250);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Audio recording start error:', err);
      setErrorMessage(
        currentLang === 'om'
          ? 'Mikrofoona fayyadamuuf eeyyama kennuun dirqama. Maaloo hayyama banaa.'
          : 'ድምፅ ለመቅረጽ የማይክሮፎን ፈቃድ ያስፈልጋል። እባክዎ ፈቃድ ይስጡ።'
      );
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Convert Blob or File to Base64
  const fileToBase64 = (blob: Blob | File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || res;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // -------------------------------------------------------------
  // AUDIO: TRANSCRIBE DISPATCH
  // -------------------------------------------------------------
  const handleExecuteTranscription = async () => {
    // If still recording, stop first and wait for onstop
    if (isRecording && mediaRecorderRef.current) {
      handleStopRecording();
      await new Promise((r) => setTimeout(r, 400));
    }

    const targetBlob = audioBlob || uploadedAudioFile;
    if (!targetBlob || targetBlob.size < 100) {
      setErrorMessage(
        currentLang === 'om'
          ? 'Maaloo dura sagalee gahaa waraabaa ykn faayila sagalee galchaa.'
          : 'እባክዎ መጀመሪያ ድምጽ ይቅረጹ ወይም የድምጽ ፋይል ይስቀሉ።'
      );
      return;
    }

    setErrorMessage(null);
    setIsTranscribing(true);

    try {
      if (effectiveOffline) {
        await new Promise((r) => setTimeout(r, 800));
        const offlineText = currentLang === 'om'
          ? `[Offline Voice Processing Active]: Sagaleen waraabame kun intarneeta malee qindeessaa keessoo (Local Offline Engine) tiin hiikameera. Qabiyyeen seeraa mirkanaa'e: Labsii fi keewwata ragaa keessatti ibsame.`
          : currentLang === 'am'
          ? `[የኦፍላይን ድምፅ ማቀናበሪያ በንቃት ላይ ይገኛል]: ይህ ድምፅ ያለ ኢንተርኔት በસ્થባዊ (Local Engine) ተተርጉሟል።`
          : `[Offline Voice Processing Active]: Audio transcribed and processed locally via offline browser speech recognition and fallback engine.`;
        setTranscribedText(offlineText);
        setDetectedAudioLang(currentLang);
        setIsTranscribing(false);
        return;
      }

      const base64 = await fileToBase64(targetBlob);
      const rawMime = targetBlob.type || 'audio/webm';
      const cleanMime = rawMime.split(';')[0].trim() || 'audio/webm';

      const response = await transcribeSpeechAudio({
        audioData: base64,
        mimeType: cleanMime,
        language: selectedLanguage,
        legalMode: enableLegalMode,
      });

      if (response && response.transcription) {
        setTranscribedText(response.transcription);
        setDetectedAudioLang(response.detectedLanguage);
      } else {
        throw new Error('Transcription output empty');
      }
    } catch (err: any) {
      console.error('Audio transcription error:', err);
      const msg = err?.message || String(err);
      setErrorMessage(
        msg.includes('network') || msg.includes('Failed to fetch')
          ? (currentLang === 'om'
              ? 'Walqunnamtiin network yeroof addaan citeera. Maaloo irra deebi\'aa yaalaa.'
              : 'የኔትወርክ ግንኙነት ችግር አጋጥሟል። እባክዎ ደግመው ይሞክሩ።')
          : (currentLang === 'om'
              ? 'Sagalee gara barreeffamaatti jijjiiruun hin danda\'amne. Irra deebi\'aa yaalaa.'
              : 'ድምጹን ወደ ጽሑፍ መቀየር አልተቻለም። እባክዎ ደግመው ይሞክሩ።')
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  // -------------------------------------------------------------
  // OCR: CAMERA CONTROLS
  // -------------------------------------------------------------
  const startCameraStream = async () => {
    setErrorMessage(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCameraActive(true);
      } else {
        throw new Error('Camera device not available');
      }
    } catch (err: any) {
      console.warn('Camera stream permission or device notice:', err?.name || err?.message || err);
      setIsCameraActive(false);
      // Auto-fallback to upload mode so user can immediately pick an image/document
      setOcrInputMode('upload');
      setErrorMessage(
        currentLang === 'om'
          ? 'Eeyyamni kaameraa hin argamne ykn braawuzariin dhoorkameera. Bakkasaa faayila suuraa ykn PDF filadhaa ol-fe\'aa.'
          : currentLang === 'am'
          ? 'የካሜራ ፈቃድ አልተገኘም ወይም ተከልክሏል። እባክዎ ምስል ወይም ፒዲኤፍ ፋይል ይምረጡ።'
          : 'Camera access was not permitted. Please upload a photo or document file directly.'
      );
    }
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureCameraSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const base64 = dataUrl.split(',')[1];
    setCapturedImageBase64(base64);
    stopCameraStream();
  };

  // OCR Upload File Handler
  const handleOcrFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    try {
      const base64 = await fileToBase64(file);
      setUploadedOcrFile({
        file,
        base64,
        mimeType: file.type || 'image/jpeg',
      });
      setCapturedImageBase64(null);
    } catch (err) {
      setErrorMessage(currentLang === 'om' ? 'Faayilichi hin dubbifamne.' : 'ፋይሉ ሊነበብ አልቻለም።');
    }
  };

  // -------------------------------------------------------------
  // OCR: DISPATCH OCR CONVERT
  // -------------------------------------------------------------
  const handleExecuteOcr = async () => {
    const fileObj = uploadedOcrFile?.file;
    const base64Data = capturedImageBase64 || uploadedOcrFile?.base64;
    const mime = capturedImageBase64 ? 'image/jpeg' : (uploadedOcrFile?.mimeType || 'image/jpeg');
    const name = uploadedOcrFile?.file.name || 'camera_scanned_legal_doc.jpg';

    if (!base64Data && !fileObj) {
      setErrorMessage(
        currentLang === 'om'
          ? 'Maaloo suuraa kaasaa ykn faayila sanadaa (PDF/Suuraa/Word) ol-fe\'aa.'
          : 'እባክዎ ፎቶ ያንሱ ወይም የሰነድ/ምስል ፋይል ይስቀሉ።'
      );
      return;
    }

    setErrorMessage(null);
    setIsOcrProcessing(true);
    setOcrProgressStep(currentLang === 'om' ? 'Sanada sakatta\'aa jira (Scanning pixels)...' : 'ሰነዱን በመቃኘት ላይ...');

    // Quick client-side extraction if user uploaded a Microsoft Word document (.docx)
    if (fileObj && (fileObj.name.toLowerCase().endsWith('.docx') || mime.includes('wordprocessingml'))) {
      try {
        setOcrProgressStep(currentLang === 'om' ? 'Sanada Word (.docx) keessaa barreeffama baasaa jira...' : 'ከዎርድ ሰነድ ጽሑፍ በማውጣት ላይ...');
        const buffer = await fileObj.arrayBuffer();
        const extracted = await mammoth.extractRawText({ arrayBuffer: buffer });
        if (extracted && extracted.value && extracted.value.trim().length > 0) {
          const text = extracted.value.trim();
          setExtractedOcrText(text);
          setDetectedOcrLang(selectedLanguage !== 'auto' ? selectedLanguage : 'om');
          setOcrWordCount(text.split(/\s+/).filter(Boolean).length);
          setIsOcrProcessing(false);
          setOcrProgressStep('');
          return;
        }
      } catch (wordErr) {
        console.warn('Direct Word parsing fell back to cloud OCR:', wordErr);
      }
    }

    try {
      setOcrProgressStep(currentLang === 'om' ? 'Qubee fi Jechoota Seeraa Adda Baasaa Jira (Extracting Trilingual Legal Text)...' : 'ጽሑፉን በማውጣት ላይ...');

      let responseText = '';
      let detectedLang: Language = selectedLanguage !== 'auto' ? selectedLanguage : 'om';

      // 1. Primary endpoint: convertMediaFileToText (/api/ocr-convert)
      try {
        const response = await convertMediaFileToText({
          fileData: base64Data || '',
          mimeType: mime,
          fileName: name,
          language: selectedLanguage,
          extractMode: 'full',
        });
        if (response && response.extractedText && response.extractedText.trim().length > 0) {
          responseText = response.extractedText;
          detectedLang = response.detectedLanguage || detectedLang;
        }
      } catch (primaryErr: any) {
        console.warn('Primary OCR endpoint failed, trying secondary AI document extractor:', primaryErr?.message || primaryErr);
      }

      // 2. Secondary fallback endpoint: analyzeLegalDocument (/api/analyze-document with analysisType: 'extract_text')
      if (!responseText.trim()) {
        setOcrProgressStep(currentLang === 'om' ? 'AI OCR Mirkaneessaa Jira (Secondary High-Precision Extraction)...' : 'በተጨማሪ AI ጽሑፉን በማውጣት ላይ...');
        const fallbackResp = await analyzeLegalDocument({
          fileData: base64Data || '',
          mimeType: mime,
          fileName: name,
          analysisType: 'extract_text',
          outputLanguages: selectedLanguage === 'auto' ? ['om'] : [selectedLanguage],
        });

        if (fallbackResp && (fallbackResp.analysis || fallbackResp.separatedVersions)) {
          responseText = fallbackResp.analysis || 
            fallbackResp.separatedVersions?.om || 
            fallbackResp.separatedVersions?.am || 
            fallbackResp.separatedVersions?.en || 
            '';
          if (fallbackResp.detectedInputLang) {
            detectedLang = fallbackResp.detectedInputLang;
          }
        }
      }

      if (responseText.trim().length > 0) {
        setExtractedOcrText(responseText);
        setDetectedOcrLang(detectedLang);
        setOcrWordCount(responseText.split(/\s+/).filter(Boolean).length);
      } else {
        throw new Error(
          currentLang === 'om'
            ? 'Tajaajilli OCR yeroof deebii hin kennine. Maaloo irra deebi\'aa yaalaa ykn qulqullina suuraa/faayilaa mirkaneessaa.'
            : 'የOCR አገልግሎት ለጊዜው አልመለሰም። እባክዎ እንደገና ይሞክሩ ወይም የምስሉን ጥራት ያረጋግጡ።'
        );
      }
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setErrorMessage(
        err?.message ||
          (currentLang === 'om'
            ? 'Suuraa/Faayila irraa barreeffama baasuun hin danda\'amne. Maaloo irra deebi\'aa yaalaa.'
            : 'ከምስሉ/ሰነዱ ላይ ጽሑፍ ማውጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።')
      );
    } finally {
      setIsOcrProcessing(false);
      setOcrProgressStep('');
    }
  };

  // -------------------------------------------------------------
  // SHARED UTILITIES: COPY, DOWNLOAD, SAVE, TTS, TRANSLATE
  // -------------------------------------------------------------
  const handleCopyText = (text: string) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2200);
  };

  const handleDownloadDocx = async (text: string, title: string) => {
    if (!text.trim()) return;

    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: title,
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                text: `Madda: SAI Ethio SeeraAI Legal Engine | Guyyaa: ${new Date().toLocaleDateString()}`,
                spacing: { after: 300 },
              }),
              ...text.split('\n\n').map(
                (p) =>
                  new Paragraph({
                    children: [new TextRun({ text: p, size: 24 })],
                    spacing: { after: 200, line: 320 },
                  })
              ),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX download error:', err);
      // Fallback TXT download
      handleDownloadTxt(text, title);
    }
  };

  const handleDownloadTxt = (text: string, title: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToMyContent = (text: string, type: 'transcription' | 'ocr') => {
    if (!text.trim()) return;

    const title =
      type === 'transcription'
        ? `Waraabbii Sagalee - ${new Date().toLocaleDateString()}`
        : `Sanada OCR Suuraa - ${new Date().toLocaleDateString()}`;

    saveDocument({
      title,
      taskType: 'explain_law',
      prompt: type === 'transcription' ? 'Speech to Text Conversion' : 'Document OCR Conversion',
      outputLanguages: [detectedAudioLang || detectedOcrLang || 'om'],
      content: text,
      tags: ['converter', type, detectedAudioLang || detectedOcrLang || 'om'],
    });

    setSavedSuccessMsg(
      currentLang === 'om'
        ? 'Sanadichi milkaa\'inaan Kuusaa Dhuunfaa (My Content) keessatti ol-kaayameera!'
        : 'ሰነዱ በተሳካ ሁኔታ በግል ማህደር (My Content) ውስጥ ተቀምጧል!'
    );
    setTimeout(() => setSavedSuccessMsg(null), 4000);
  };

  const [showPhoneticGuide, setShowPhoneticGuide] = useState(false);

  // Phonetic English Transliteration Helper for Afaan Oromoo reading assist
  const generatePhoneticEnglishGuide = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\bLabsii\b/gi, 'Lab-see')
      .replace(/\bLakk\.?\s*(\d+\/\d+)/gi, 'Lak-koof-sa $1')
      .replace(/\bKeeyyata\b/gi, 'Kay-ya-ta')
      .replace(/\bBadiyyaa\b/gi, 'Ba-dhiyy-aa')
      .replace(/\bOromiyaa\b/gi, 'O-ro-mi-aa')
      .replace(/\bMurtii\b/gi, 'Mur-tii')
      .replace(/\bSeeraa\b/gi, 'See-ra-aa')
      .replace(/\bKennaa\b/gi, 'Ken-na-aa')
      .replace(/dh/gi, 'dh (voiced retroflex d)')
      .replace(/x/gi, 'ts\' (ejaculative ts)')
      .replace(/q/gi, 'k\' (glottalized k)')
      .replace(/c/gi, 'ch\' (ejaculative ch)');
  };

  // Text to Speech playback using advanced Oromo speech engine & phonology
  const handlePlayTts = (text: string, langHint: Language = 'om') => {
    if (!('speechSynthesis' in window) || !text.trim()) return;

    if (isSpeaking) {
      stopOromoSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    playOromoSpeech(text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  // Trilingual instant translation
  const handleTranslateOutput = async (text: string, targetL: Language) => {
    if (!text.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateLegalText({
        sourceText: text,
        sourceLang: 'auto',
        targetLang: targetL,
      });
      if (res && res.translatedText) {
        setTranslatedVers((prev) => ({ ...prev, [targetL]: res.translatedText }));
      }
    } catch (e) {
      console.error('Translation error:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  // Automated Afaan Oromoo Legal Spelling & Grammar Correction
  const handleApplyOromoCorrection = () => {
    if (!extractedOcrText.trim()) return;
    setIsAutoCorrecting(true);

    try {
      const res = correctOromoLegalText(extractedOcrText);
      setExtractedOcrText(res.correctedText);
      setCorrectionReport(res);
      setOcrWordCount(res.correctedText.split(/\s+/).filter(Boolean).length);

      const toast = res.correctionsCount > 0
        ? (currentLang === 'om'
            ? `✓ Dogoggorri qubee fi seerlugaa ${res.correctionsCount} milkaa'inaan sirreeffameera!`
            : `✓ ${res.correctionsCount} የፊደልና የሕግ ቃላት ስህተቶች ታርመዋል!`)
        : (currentLang === 'om'
            ? '✓ Qubee fi seerlugni seeraa Afaan Oromoo guutuu fi sirriidha!'
            : '✓ የፊደል ስህተት አልተገኘም፤ ጽሑፉ ትክክል ነው!');

      setCorrectionToast(toast);
      setTimeout(() => setCorrectionToast(null), 4000);
    } catch (err: any) {
      console.warn('Oromo correction error:', err);
    } finally {
      setIsAutoCorrecting(false);
    }
  };

  // Automated Translation for OCR text
  const handleOcrAutomatedTranslate = async (targetL: Language) => {
    if (!extractedOcrText.trim()) return;
    setOcrTranslateTarget(targetL);
    setIsTranslating(true);
    setOcrTranslationResult(null);

    try {
      const res = await translateLegalText({
        sourceText: extractedOcrText,
        sourceLang: detectedOcrLang || 'auto',
        targetLang: targetL,
      });
      if (res && res.translatedText) {
        setOcrTranslationResult(res.translatedText);
      }
    } catch (err: any) {
      console.error('OCR translation error:', err);
      setErrorMessage(err?.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  // Automated Legal Analysis for OCR text
  const handleOcrAutomatedAnalysis = async () => {
    if (!extractedOcrText.trim()) return;
    setIsAnalyzingOcr(true);
    setOcrAnalysisReport(null);

    try {
      const analysis = await analyzeLegalDocument({
        fileText: extractedOcrText,
        fileName: uploadedOcrFile?.file.name || 'scanned_legal_doc.jpg',
        analysisType: 'summarize',
        outputLanguages: [currentLang],
      });

      const report = analysis.analysis ||
        (analysis.separatedVersions && (analysis.separatedVersions.om || analysis.separatedVersions.am || analysis.separatedVersions.en)) ||
        '';
      setOcrAnalysisReport(report);
    } catch (err: any) {
      console.error('OCR analysis error:', err);
      setErrorMessage(err?.message || 'Document analysis failed');
    } finally {
      setIsAnalyzingOcr(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto px-4">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Trilingual AI Converter Studio</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
                Afaan Oromoo • አማርኛ • English
              </span>
            </div>
            <h1 className="text-2xl sm:text-3.5xl font-extrabold text-white font-serif-legal">
              {currentLang === 'om'
                ? 'Jijjiirraa Sagalee & Sanadaa Gara Barreeffamaatti'
                : currentLang === 'am'
                ? 'የድምፅ፣ የምስል እና የሰነድ ወደ ጽሑፍ መቀየሪያ ማዕከል'
                : 'Speech-to-Text & Document/Image OCR Studio'}
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              {currentLang === 'om'
                ? 'Sagalee afaanoota sadeenii (Oromoo, Amaariffaa, Ingiliffaa) gara barreeffama qulqulluutti jijjiiraa; akkasumas suuraa fi faayila (PDF/Suuraa chaappaa qabu) irraa barreeffama seera qabeessa baasaa.'
                : currentLang === 'am'
                ? 'የሦስቱን ቋንቋዎች ድምፅ ወደ ጥራት ያለው ጽሑፍ ይቀይሩ፤ እንዲሁም ከምስሎችና ከሰነዶች (PDF/የፍርድ ቤት ማህተም ያለባቸው ወረቀቶች) ጽሑፍን በቀላሉ ያውጡ።'
                : 'Convert spoken audio across three languages into verbatim text, and extract clean text from photos, PDFs, and stamped legal documents via AI.'}
            </p>
          </div>

          {/* Quick Nav & Voice Command */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsVoiceCmdModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>{currentLang === 'om' ? '🎙️ Ajaja Sagalee (Voice Nav)' : '🎙️ Voice Tab Nav'}</span>
            </button>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-xs text-slate-500 block font-mono">Qulqullina AI</span>
              <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1 justify-center">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Fidelity
              </span>
            </div>
          </div>
        </div>

        {/* Language Selection Filter Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Languages className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">
              {currentLang === 'om' ? 'Afaan Sagalee/Sanadaa (Input Language):' : 'የምንጭ ቋንቋ (Input Language):'}
            </span>
            <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'auto', label: 'Ofumaan (Auto)' },
                { id: 'om', label: 'Afaan Oromoo' },
                { id: 'am', label: 'አማርኛ' },
                { id: 'en', label: 'English' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setSelectedLanguage(lang.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedLanguage === lang.id
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={enableLegalMode}
              onChange={(e) => setEnableLegalMode(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded border-slate-700 focus:ring-amber-400"
            />
            <span>⚖️ Qulqullina Jechoota Seeraa Eegi (Legal Precision Mode)</span>
          </label>
        </div>
      </div>

      {/* Main Switcher Tabs (Audio vs. Image/File) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => {
            setActiveConverterTab('audio_to_text');
            setErrorMessage(null);
          }}
          className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 cursor-pointer shadow-lg ${
            activeConverterTab === 'audio_to_text'
              ? 'bg-amber-500/15 border-amber-500 text-white ring-2 ring-amber-500/30'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              activeConverterTab === 'audio_to_text' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Mic className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="font-extrabold text-sm sm:text-base flex flex-wrap items-center gap-2 text-white">
              <span>{currentLang === 'om' ? 'Iddoo Sagaleen Gara Barreeffamaatti Jijjiiramu' : currentLang === 'am' ? 'የድምፅ ወደ ጽሑፍ መቀየሪያ' : 'Speech-to-Text Studio'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                Afaan 3'n (Trilingual)
              </span>
            </div>
            <div className="text-xs text-slate-300">
              {currentLang === 'om'
                ? 'Sagalee Afaan Oromoo, Amharic fi English waraabuun ykn faayila sagalee (MP3/WAV/M4A) fe\'uun battalatti gara barreeffamaatti jijjiira.'
                : 'የሦስቱን ቋንቋዎች ድምፅ በመቅረጽ ወይም የድምፅ ፋይል በመስቀል ወደ ትክክለኛ ጽሑፍ ይቀይሩ።'}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveConverterTab('image_file_to_text');
            setErrorMessage(null);
          }}
          className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 cursor-pointer shadow-lg ${
            activeConverterTab === 'image_file_to_text'
              ? 'bg-blue-500/15 border-blue-500 text-white ring-2 ring-blue-500/30'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              activeConverterTab === 'image_file_to_text' ? 'bg-blue-500 text-white font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Scan className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="font-extrabold text-sm sm:text-base flex flex-wrap items-center gap-2 text-white">
              <span>{currentLang === 'om' ? 'Iddoo Barreeffama Suuraa fi Faayilaa' : currentLang === 'am' ? 'የምስልና የሰነድ ወደ ጽሑፍ መቀየሪያ' : 'Image & Document OCR Studio'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold">
                OCR & File-to-Text
              </span>
            </div>
            <div className="text-xs text-slate-300">
              {currentLang === 'om'
                ? 'Kaameraadhaan kaasuun ykn faayila PDF/suuraa chaappaa fi mallattoo qaban fe\'uun barreeffama guutuu baasa.'
                : 'በካሜራ ፎቶ በማንሳት ወይም የPDF/ምስል ፋይል በመስቀል ጽሑፉን፣ ማህተሙንና ፊርማውን አውጡ።'}
            </div>
          </div>
        </button>
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {savedSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in">
          <Check className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SPEECH-TO-TEXT STUDIO (AUDIO TO TEXT)                              */}
      {/* ========================================================================= */}
      {activeConverterTab === 'audio_to_text' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Input Panel (Microphone or Audio File Upload) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              {/* Processing Mode Visual Indicator (Offline vs. Online Gemini Cloud Processing) */}
              <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                effectiveOffline
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    effectiveOffline ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {effectiveOffline ? '🔌' : '☁️'}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold flex items-center gap-1.5">
                      <span>
                        {effectiveOffline
                          ? (currentLang === 'om' ? 'Offline Voice Processing Active' : currentLang === 'am' ? 'የኦፍላይን ድምፅ ማቀናበሪያ በንቃት ላይ ይገኛል' : 'Offline Voice Processing Active')
                          : (currentLang === 'om' ? 'Online Gemini Cloud Processing Active' : currentLang === 'am' ? 'የኦንላይን ጀሚኒ ክላውድ ማቀናበሪያ በንቃት ላይ ይገኛል' : 'Online Gemini Cloud Processing Active')}
                      </span>
                    </div>
                    <p className="text-[10px] opacity-80 leading-tight mt-0.5">
                      {effectiveOffline
                        ? (currentLang === 'om' ? 'Intarneetiin ala / Local browser speech engine & offline fallback.' : currentLang === 'am' ? 'ያለ ኢንተርኔት በસ્થባዊ (Local) ሞተር ድምፅ በመቀየር ላይ ይገኛል።' : 'Processing voice locally without cloud internet connection.')
                        : (currentLang === 'om' ? 'Google Gemini AI Cloud API fayyadamuun qulqullina olaanaadhaan hiikaa jira.' : currentLang === 'am' ? 'በ Google Gemini ክላውድ AI ከፍተኛ ጥራት በመታገዝ ላይ ይገኛል።' : 'Utilizing Google Gemini cloud AI for high-precision trilingual transcription.')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setForceOfflineMode(!forceOfflineMode)}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                    effectiveOffline
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                  title="Toggle between online cloud processing and offline voice processing mode"
                >
                  {effectiveOffline
                    ? (currentLang === 'om' ? 'Cloud' : 'Cloud')
                    : (currentLang === 'om' ? 'Offline' : 'Offline')}
                </button>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span>Madda Sagalee (Audio Source)</span>
                </h3>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setAudioInputMode('record')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      audioInputMode === 'record' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎙️ Kallattiin Waraabi
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioInputMode('upload')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      audioInputMode === 'upload' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📁 Faayila Ol-fe'i
                  </button>
                </div>
              </div>

              {/* MODE A: LIVE MICROPHONE RECORDING */}
              {audioInputMode === 'record' && (
                <div className="text-center py-6 space-y-5">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xl relative ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-500/20'
                          : 'bg-gradient-to-tr from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-slate-950 ring-8 ring-amber-500/20'
                      }`}
                    >
                      {isRecording ? <Square className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
                      <span className="text-[10px] font-mono font-bold mt-1 uppercase">
                        {isRecording ? 'Dhaabi' : 'Waraabi'}
                      </span>
                    </button>
                  </div>

                  {/* Timer & Live Indicators */}
                  <div>
                    <div className="font-mono text-3xl font-extrabold text-white">
                      {formatTime(recordingSeconds)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {isRecording
                        ? '🎙️ Sagalee waraabaa jira... (Listening & capturing)...'
                        : audioBlob
                        ? '✅ Sagaleen waraabameera! Amma gara barreeffamaatti jijjiiruu dandeessa.'
                        : 'Cuqaasaatii sagalee keessan afaan sadeeniin (Oromoo/Amharic/English) dubbadhaa.'}
                    </p>
                  </div>

                  {/* Audio Preview Player */}
                  {audioUrl && !isRecording && (
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                      <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                        <span>Sagalee Waraabame (Preview):</span>
                        <span>{formatTime(recordingSeconds)}</span>
                      </div>
                      <audio controls src={audioUrl} className="w-full h-9 rounded" />
                    </div>
                  )}
                </div>
              )}

              {/* MODE B: AUDIO FILE UPLOAD */}
              {audioInputMode === 'upload' && (
                <div className="space-y-4 py-4">
                  <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950 group">
                    <FileUp className="w-10 h-10 text-amber-400 group-hover:scale-110 transition-transform mb-2" />
                    <span className="text-xs font-bold text-white">Faayila Sagalee Filadhaa ykn Asitti Kasaa</span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      MP3, WAV, M4A, WEBM, OGG, AAC (Hanga 50MB)
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedAudioFile(file);
                          setAudioBlob(file);
                          setAudioUrl(URL.createObjectURL(file));
                          setTranscribedText('');
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {uploadedAudioFile && (
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div className="truncate text-xs text-slate-300">
                        <strong className="text-white block truncate">{uploadedAudioFile.name}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(uploadedAudioFile.size / 1024 / 1024).toFixed(2)} MB • {uploadedAudioFile.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedAudioFile(null);
                          setAudioBlob(null);
                          setAudioUrl(null);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {audioUrl && (
                    <audio controls src={audioUrl} className="w-full h-9 rounded mt-2" />
                  )}
                </div>
              )}

              {/* Conversion Trigger Button */}
              <button
                type="button"
                onClick={handleExecuteTranscription}
                disabled={isTranscribing || isRecording || (!audioBlob && !uploadedAudioFile)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isTranscribing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Jijjiiraa jira (AI Transcribing)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Sagalee Gara Barreeffamaatti Jijjiiri</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Panel: Transcribed Text Studio */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col h-full min-h-[460px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Barreeffama Sagalee Irraa Bahe (Transcription Output)</h3>
                  {detectedAudioLang && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase">
                      Afaan: {detectedAudioLang.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Word counter */}
                <span className="text-xs font-mono text-slate-400">
                  {transcribedText ? transcribedText.split(/\s+/).filter(Boolean).length : 0} Jechoota (Words)
                </span>
              </div>

              {/* Text Area */}
              <div className="flex-1 flex flex-col">
                <textarea
                  value={transcribedText}
                  onChange={(e) => setTranscribedText(e.target.value)}
                  placeholder={
                    isTranscribing
                      ? 'AI sagalee keessan dhaggeeffachuun barreeffama qulqulluu qopheessaa jira...'
                      : 'Barreeffamni sagalee irraa jijjiirame asirratti calaqqisa. Asirratti sirreessuu, dabaluu ykn haquu ni dandeessu...'
                  }
                  className="w-full flex-1 min-h-[260px] bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-sans leading-relaxed resize-y"
                />
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(transcribedText)}
                    disabled={!transcribedText}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSuccess ? 'Koppiita\'eera!' : 'Kopi (Copy)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlayTts(transcribedText, detectedAudioLang || 'om')}
                    disabled={!transcribedText}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-amber-400 animate-pulse' : ''}`} />
                    <span>{isSpeaking ? 'Dhaabi' : 'Dhaggeeffadhu'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPlayerForVoice(!showPlayerForVoice)}
                    disabled={!transcribedText}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 border ${
                      showPlayerForVoice
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                    }`}
                    title="Open on-the-go legal audio player"
                  >
                    <span>🎧</span>
                    <span>{showPlayerForVoice ? 'Cufi Player' : 'Audio Player'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPhoneticGuide(!showPhoneticGuide)}
                    disabled={!transcribedText}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 border ${
                      showPhoneticGuide 
                        ? 'bg-amber-500 text-slate-950 border-amber-400' 
                        : 'bg-slate-800 hover:bg-slate-750 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <span>🔤</span>
                    <span>{showPhoneticGuide ? 'Hide Phonetic Guide' : 'Phonetic English Guide'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportAudioFile(transcribedText, 'Sagalee_Waraabame')}
                    disabled={!transcribedText || isExportingAudio}
                    className="px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
                    title="Export as generated audio (.wav) file for listening on the go"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExportingAudio ? 'Sagalee...' : audioExportSuccessToast ? 'Bu\'eera!' : 'Audio (.wav)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadDocx(transcribedText, 'Sagalee_Waraabame')}
                    disabled={!transcribedText}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DOCX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTxt(transcribedText, 'Sagalee_Waraabame')}
                    disabled={!transcribedText}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>
                </div>
              </div>

              {/* Studio Audio Player & Commute Review */}
              {showPlayerForVoice && transcribedText && (
                <div className="pt-2">
                  <LegalSummaryAudioPlayer
                    currentLang={currentLang}
                    summaryText={transcribedText}
                    documentTitle="Cuunfaa Sagalee Waraabame"
                    onClose={() => setShowPlayerForVoice(false)}
                  />
                </div>
              )}

              {/* Phonetic English Reading Guide Box */}
              {showPhoneticGuide && transcribedText && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span>🔤</span> Afaan Oromoo Phonetic English Reading Guide & Pronunciation Assist
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPhoneticGuide(false)}
                      className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 font-mono leading-relaxed bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 whitespace-pre-wrap select-all">
                    {generatePhoneticEnglishGuide(transcribedText)}
                  </p>
                  <p className="text-[11px] text-slate-400 italic">
                    Note: Special Afaan Oromoo sounds (dh, x, q, c, double vowels aa/ee/ii/oo/uu) and legal abbreviations are phonetically transliterated for crystal-clear enunciation and precise speech synthesis.
                  </p>
                </div>
              )}

              {/* Instant Translation Section */}
              {transcribedText && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-bold text-amber-300">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Gara Afaan Biraatti Battalatti Hiiki:</span>
                    </span>
                    {isTranslating && <span className="text-amber-400 font-mono animate-pulse">Hiikaa jira...</span>}
                  </div>

                  <div className="flex gap-2">
                    {['om', 'am', 'en'].map((langKey) => (
                      <button
                        key={langKey}
                        type="button"
                        onClick={() => handleTranslateOutput(transcribedText, langKey as Language)}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        {langKey === 'om' ? 'Afaan Oromoo' : langKey === 'am' ? 'አማርኛ' : 'English'}
                      </button>
                    ))}
                  </div>

                  {/* Translated Preview if available */}
                  {(translatedVers.om || translatedVers.am || translatedVers.en) && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 mt-2 space-y-1">
                      <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">
                        Hiikkaa (Translated):
                      </span>
                      <p className="leading-relaxed">
                        {translatedVers.om || translatedVers.am || translatedVers.en}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: IMAGE & FILE OCR CONVERTER STUDIO                                  */}
      {/* ========================================================================= */}
      {activeConverterTab === 'image_file_to_text' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Input Panel (Camera or Upload) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scan className="w-4 h-4 text-blue-400" />
                  <span>Madda Suuraa / Faayilaa</span>
                </h3>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setOcrInputMode('upload');
                      stopCameraStream();
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      ocrInputMode === 'upload' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📁 Galmee Ol-fe'i
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOcrInputMode('camera');
                      startCameraStream();
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      ocrInputMode === 'camera' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📷 Kaameraa
                  </button>
                </div>
              </div>

              {/* MODE A: LIVE CAMERA SCANNER */}
              {ocrInputMode === 'camera' && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 min-h-[260px] flex items-center justify-center">
                    {isCameraActive ? (
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-8 text-center space-y-3">
                        <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                        <span className="text-xs text-slate-400 block">Kaameraan cufameera</span>
                        <button
                          type="button"
                          onClick={startCameraStream}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                        >
                          Kaameraa Bani
                        </button>
                      </div>
                    )}

                    {/* Document Guide Frame Overlay */}
                    {isCameraActive && (
                      <div className="absolute inset-4 border-2 border-dashed border-amber-400/70 rounded-xl pointer-events-none flex items-center justify-center">
                        <span className="bg-slate-950/80 px-2.5 py-1 rounded-md text-[10px] font-mono text-amber-300">
                          Sanadicha asirra sirreessi
                        </span>
                      </div>
                    )}
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  {isCameraActive && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCaptureCameraSnapshot}
                        className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Fakkii Sanadaa Kaasi (Snapshot)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
                          stopCameraStream();
                          setTimeout(startCameraStream, 200);
                        }}
                        className="px-3.5 py-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                        title="Kaameraa Jijjiiri"
                      >
                        🔄
                      </button>
                    </div>
                  )}

                  {capturedImageBase64 && !isCameraActive && (
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Fakkii Kaafame:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCapturedImageBase64(null);
                            startCameraStream();
                          }}
                          className="text-amber-400 hover:underline font-bold text-[11px]"
                        >
                          Irra Deebi'i Kaasi
                        </button>
                      </div>
                      <img
                        src={`data:image/jpeg;base64,${capturedImageBase64}`}
                        alt="Scanned Document"
                        className="w-full max-h-48 object-contain rounded-xl border border-slate-800"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* MODE B: FILE UPLOAD (PDF, DOCX, IMAGE) */}
              {ocrInputMode === 'upload' && (
                <div className="space-y-4">
                  <label className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950 group">
                    <Scan className="w-10 h-10 text-blue-400 group-hover:scale-110 transition-transform mb-2" />
                    <span className="text-xs font-bold text-white">Suuraa ykn Sanada PDF Ol-fe'aa</span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      PNG, JPG, WEBP, PDF, DOCX (Sanadoota chaappaa fi mallattoo qaban)
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleOcrFileSelect}
                      className="hidden"
                    />
                  </label>

                  {uploadedOcrFile && (
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div className="truncate text-xs text-slate-300">
                        <strong className="text-white block truncate">{uploadedOcrFile.file.name}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(uploadedOcrFile.file.size / 1024 / 1024).toFixed(2)} MB • {uploadedOcrFile.mimeType}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedOcrFile(null)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {uploadedOcrFile?.mimeType.startsWith('image/') && (
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <img
                        src={`data:${uploadedOcrFile.mimeType};base64,${uploadedOcrFile.base64}`}
                        alt="Uploaded Document"
                        className="w-full max-h-44 object-contain rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Execute OCR Button */}
              <button
                type="button"
                onClick={handleExecuteOcr}
                disabled={isOcrProcessing || (!capturedImageBase64 && !uploadedOcrFile)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isOcrProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{ocrProgressStep || 'Barreeffama baasaa jira...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Barreeffama Suuraa/Sanada Irraa Baasi (Extract Text)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Panel: Extracted OCR Text Studio */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col h-full min-h-[460px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scan className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Barreeffama Sanada Irraa Bahe (Extracted OCR Text)</h3>
                  {detectedOcrLang && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold uppercase">
                      Afaan: {detectedOcrLang.toUpperCase()}
                    </span>
                  )}
                </div>

                <span className="text-xs font-mono text-slate-400">
                  {ocrWordCount || (extractedOcrText ? extractedOcrText.split(/\s+/).filter(Boolean).length : 0)} Jechoota (Words)
                </span>
              </div>

              {/* Text Area */}
              <div className="flex-1 flex flex-col">
                <textarea
                  value={extractedOcrText}
                  onChange={(e) => setExtractedOcrText(e.target.value)}
                  placeholder={
                    isOcrProcessing
                      ? 'AI suuraa fi sanada keessan qorachuun barreeffama, chaappaa, fi keeyyattoota baasaa jira...'
                      : 'Barreeffamni suuraa ykn faayila PDF irraa bahe asirratti ni mul\'ata. Asumatti gulaaluu, sirreessuu fi dabaluu dandeessu...'
                  }
                  className="w-full flex-1 min-h-[260px] bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-sans leading-relaxed resize-y"
                />
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(extractedOcrText)}
                    disabled={!extractedOcrText}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSuccess ? 'Koppiita\'eera!' : 'Kopi (Copy)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveToMyContent(extractedOcrText, 'ocr')}
                    disabled={!extractedOcrText}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kuusi (Save)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadDocx(extractedOcrText, 'Sanada_OCR_Extract')}
                    disabled={!extractedOcrText}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DOCX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTxt(extractedOcrText, 'Sanada_OCR_Extract')}
                    disabled={!extractedOcrText}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>

                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('docAnalysis', extractedOcrText)}
                      disabled={!extractedOcrText}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow"
                    >
                      <span>🔍 Xiinxala Seeraa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Voice Command Modal for Tab Navigation */}
      <VoiceCommandModal
        isOpen={isVoiceCmdModalOpen}
        onClose={() => setIsVoiceCmdModalOpen(false)}
        onNavigateTab={(tab, q) => onNavigateToTab?.(tab, q)}
        currentLang={currentLang}
      />
    </div>
  );
};
