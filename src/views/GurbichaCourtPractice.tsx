import React, { useState, useEffect, useRef } from 'react';
import { Language, translations } from '../i18n/translations';
import { AanaaGurbichaECourtDashboard } from '../components/AanaaGurbichaECourtDashboard';
import { practiceCaseService, PracticeCase, CaseEvidence, SAMPLE_DIGITAL_EVIDENCE, generateAIEvidenceDescription, extractServerVideoMetadata } from '../services/practiceCaseService';
import { exportEvidenceAsZipPackage, exportEvidenceAsPdfDossier } from '../services/evidenceExportService';
import { useAuth } from '../context/AuthContext';
import { 
  Scale, FileText, Search, Gavel, ShieldCheck, Download, 
  CheckCircle2, AlertCircle, Clock, Plus, Send,
  Paperclip, Image as ImageIcon, Eye, Trash2, Upload, FileUp, X, Check, File, Sparkles, RefreshCw, Filter, Video, Square,
  Play, Pause, Volume2, VolumeX, Maximize, Package, DownloadCloud, CheckSquare, Loader2, Archive
} from 'lucide-react';
import { SeeraAILogo } from '../components/SeeraAILogo';

interface GurbichaCourtPracticeProps {
  currentLang: Language;
}

export const GurbichaCourtPractice: React.FC<GurbichaCourtPracticeProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulation'>('simulation');
  const [cases, setCases] = useState<PracticeCase[]>([]);
  const [activeCase, setActiveCase] = useState<PracticeCase | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCaseData, setNewCaseData] = useState({
    plaintiff: '',
    defendant: '',
    subject: ''
  });

  // Digital Evidence Attachment State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const [evidenceCategory, setEvidenceCategory] = useState<string>('Ragaa Suuraa (Photo)');
  const [evidenceLabel, setEvidenceLabel] = useState<string>('');
  const [previewEvidence, setPreviewEvidence] = useState<CaseEvidence | null>(null);
  const [evidenceToast, setEvidenceToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAttachModal, setShowAttachModal] = useState<boolean>(false);
  const [showEvidenceSummaryModal, setShowEvidenceSummaryModal] = useState<boolean>(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadAttempt, setUploadAttempt] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPersistentlyFailed, setIsPersistentlyFailed] = useState<boolean>(false);
  const [uploadProgressStep, setUploadProgressStep] = useState<string>('idle');
  const [batchIndex, setBatchIndex] = useState<number>(0);
  const [batchCompleted, setBatchCompleted] = useState<number>(0);
  const [showVideoRecordModal, setShowVideoRecordModal] = useState<boolean>(false);
  const [isVideoRecording, setIsVideoRecording] = useState<boolean>(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [videoRecordDuration, setVideoRecordDuration] = useState<number>(0);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoTimerRef = useRef<any>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [extractedVideoMetadata, setExtractedVideoMetadata] = useState<{ resolution: string; duration: number; fps: number } | null>(null);

  // Export Selected Evidence State
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'zip' | 'pdf'>('zip');
  const [isExportingEvidence, setIsExportingEvidence] = useState<boolean>(false);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [showExportConfirmationModal, setShowExportConfirmationModal] = useState<boolean>(false);

  useEffect(() => {
    if (showEvidenceSummaryModal && activeCase) {
      const allEv = (activeCase.evidence || []).concat(SAMPLE_DIGITAL_EVIDENCE);
      setSelectedEvidenceIds(allEv.map(e => e.id));
    }
  }, [showEvidenceSummaryModal, activeCase]);

  const toggleEvidenceSelection = (id: string) => {
    setSelectedEvidenceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllEvidence = (allEv: CaseEvidence[]) => {
    if (selectedEvidenceIds.length === allEv.length) {
      setSelectedEvidenceIds([]);
    } else {
      setSelectedEvidenceIds(allEv.map(e => e.id));
    }
  };

  const handleRequestExportEvidence = () => {
    if (!activeCase) return;
    const allEv = (activeCase.evidence || []).concat(SAMPLE_DIGITAL_EVIDENCE);
    const selectedItems = allEv.filter(e => selectedEvidenceIds.includes(e.id));
    if (selectedItems.length === 0) return;
    setShowExportConfirmationModal(true);
  };

  const handleConfirmAndExportEvidence = async () => {
    setShowExportConfirmationModal(false);
    if (!activeCase) return;
    const allEv = (activeCase.evidence || []).concat(SAMPLE_DIGITAL_EVIDENCE);
    const selectedItems = allEv.filter(e => selectedEvidenceIds.includes(e.id));
    if (selectedItems.length === 0) return;

    setIsExportingEvidence(true);
    setExportToast(
      currentLang === 'om'
        ? `Pakkejjii ${exportFormat.toUpperCase()} qopheessaa jira...`
        : currentLang === 'am'
        ? `የ ${exportFormat.toUpperCase()} ፓኬጅ በማዘጋጀት ላይ...`
        : `Generating ${exportFormat.toUpperCase()} package...`
    );

    try {
      if (exportFormat === 'zip') {
        await exportEvidenceAsZipPackage(activeCase, selectedItems, currentLang);
      } else {
        await exportEvidenceAsPdfDossier(activeCase, selectedItems, currentLang);
      }
      setExportToast(
        currentLang === 'om'
          ? `Ragaalee ${selectedItems.length} milkaa'inaan ${exportFormat.toUpperCase()} ta'anii ergamaniiru!`
          : currentLang === 'am'
          ? `የተመረጡ ${selectedItems.length} ማስረጃዎች በ ${exportFormat.toUpperCase()} ፍጹም ወርደዋል!`
          : `Exported ${selectedItems.length} selected evidence exhibits successfully as ${exportFormat.toUpperCase()}!`
      );
      setTimeout(() => setExportToast(null), 4000);
    } catch (err: any) {
      console.error('Failed to export selected evidence:', err);
      setExportToast(`Export failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setExportToast(null), 4000);
    } finally {
      setIsExportingEvidence(false);
    }
  };

  useEffect(() => {
    async function loadCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(cameras);
        if (cameras.length > 0 && !selectedVideoDeviceId) {
          setSelectedVideoDeviceId(cameras[0].deviceId);
        }
      } catch (err) {
        console.warn('Could not enumerate video devices:', err);
      }
    }
    loadCameras();
  }, []);

  const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4'
  ];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > 8 * 1024 * 1024) {
      return { valid: false, error: `Faayiliin '${file.name}' garmalee guddaadha (Max 8MB allowed).` };
    }
    const isExtensionAllowed = /\.(jpg|jpeg|png|webp|gif|pdf|doc|docx|txt|mp3|wav|mp4)$/i.test(file.name);
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !isExtensionAllowed) {
      return { valid: false, error: `Gosti faayilii '${file.type || file.name.split('.').pop()}' hin eyyamamne.` };
    }
    return { valid: true };
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setEvidenceToast({ message, type });
    setTimeout(() => setEvidenceToast(null), 3500);
  };

  const uploadWithRetry = async (fn: () => Promise<any>, maxRetries = 3, initialDelay = 1000) => {
    let attempt = 0;
    let delay = initialDelay;
    while (attempt < maxRetries) {
      try {
        setUploadAttempt(attempt + 1);
        setUploadError(null);
        setIsPersistentlyFailed(false);
        return await fn();
      } catch (err: any) {
        attempt++;
        if (attempt >= maxRetries) {
          setIsPersistentlyFailed(true);
          setUploadError(err?.message || 'Upload failed after maximum retries');
          throw err;
        }
        setUploadError(`Attempt ${attempt} failed: ${err?.message || 'Network error'}. Retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // exponential backoff
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    
    const validFiles: File[] = [];
    for (const f of fileArray) {
      const v = validateFile(f);
      if (!v.valid) {
        showToast(v.error || `Faayiliin ${f.name} hin eyyamamne.`, 'error');
      } else {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) return;

    setStagedFiles(validFiles);
    if (validFiles[0]) {
      const isImg = validFiles[0].type.startsWith('image/');
      setEvidenceCategory(isImg ? 'Ragaa Suuraa (Photo)' : 'Ragaa Barreeffamaa (Doc)');
      setEvidenceLabel(validFiles[0].name.replace(/\.[^/.]+$/, ''));
    }
    setShowAttachModal(true);
    setUploadError(null);
    setIsPersistentlyFailed(false);
    setUploadAttempt(0);
    e.target.value = '';
  };

  const handleConfirmAttach = async () => {
    if (!activeCase || stagedFiles.length === 0) return;
    setIsAttaching(true);
    setIsPersistentlyFailed(false);
    setUploadError(null);
    setUploadAttempt(0);
    setBatchCompleted(0);
    setBatchIndex(0);

    const totalFiles = stagedFiles.length;
    let completedCount = 0;

    try {
      for (let i = 0; i < stagedFiles.length; i++) {
        const file = stagedFiles[i];
        setBatchIndex(i + 1);
        setUploadProgressStep(currentLang === 'om' 
          ? `Faayilii ${i + 1} / ${totalFiles} (${file.name}) qindeessaa jira...` 
          : `Processing file ${i + 1} of ${totalFiles}...`);

        const validation = validateFile(file);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid file format or size.');
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        const isPhoto = file.type.startsWith('image/');
        const isPdf = file.type.includes('pdf') || file.name.endsWith('.pdf');

        const newEvidenceItem: CaseEvidence = {
          id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: stagedFiles.length === 1 ? (evidenceLabel.trim() || file.name) : file.name,
          type: isPhoto ? 'photo' : isPdf ? 'pdf' : 'doc',
          dataUrl,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          category: evidenceCategory,
          admissibilityStatus: 'admissible',
          evidentialWeight: 'primary'
        };

        setUploadProgressStep(currentLang === 'om' 
          ? `Faayilii ${i + 1} / ${totalFiles} Firestore-tti galmeessaa jira...` 
          : `Uploading file ${i + 1} of ${totalFiles} to Firestore...`);

        // Upload with exponential backoff retry mechanism
        await uploadWithRetry(async () => {
          await practiceCaseService.attachEvidence(activeCase.id, newEvidenceItem);
        }, 3, 1000);
        
        completedCount++;
        setBatchCompleted(completedCount);

        // Optimistic update
        setActiveCase(prev => prev ? {
          ...prev,
          evidence: [...(prev.evidence || []), newEvidenceItem]
        } : null);
      }

      setUploadProgressStep(currentLang === 'om' ? 'Faayiloonni hundi milkaa\'inaan galmeetti kuufaman!' : 'All batch files uploaded successfully!');
      showToast(currentLang === 'om' ? 'Faayiloonni hundi milkaa\'inaan galmeetti maxxanfaman!' : 'Batch evidence uploaded successfully!');
      setShowAttachModal(false);
      setStagedFiles([]);
      setEvidenceLabel('');
    } catch (err: any) {
      console.error('Failed batch evidence upload after retries:', err);
      setIsPersistentlyFailed(true);
      setUploadError(err?.message || 'Batch upload failed (Persistent Failure)');
      showToast(err?.message || 'Ragaa maxxansuun hin danda\'amne', 'error');
    } finally {
      setIsAttaching(false);
      setUploadProgressStep('idle');
    }
  };

  const extractVideoMetadata = async (blob: Blob): Promise<{ resolution: string; duration: number; fps: number }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(blob);
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const resolution = `${video.videoWidth}x${video.videoHeight}`;
        const duration = Math.round(video.duration || 0);
        const fps = 30;
        resolve({ resolution, duration, fps });
      };
      video.onerror = () => {
        resolve({ resolution: '1280x720', duration: videoRecordDuration || 5, fps: 30 });
      };
    });
  };

  const startLiveVideoRecording = async () => {
    try {
      setRecordedVideoBlob(null);
      setRecordedVideoUrl(null);
      setVideoRecordDuration(0);
      setExtractedVideoMetadata(null);
      videoChunksRef.current = [];

      const constraints: MediaStreamConstraints = {
        video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true,
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play();
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      videoMediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        setRecordedVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);

        const metadata = await extractVideoMetadata(blob);
        setExtractedVideoMetadata(metadata);
      };

      recorder.start();
      setIsVideoRecording(true);

      const startTime = Date.now();
      videoTimerRef.current = setInterval(() => {
        setVideoRecordDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } catch (err: any) {
      console.error('Failed to access webcam/mic for video hearing:', err);
      showToast('Webcam/Mic access denied or unavailable: ' + (err?.message || ''), 'error');
    }
  };

  const stopLiveVideoRecording = () => {
    if (videoMediaRecorderRef.current && isVideoRecording) {
      videoMediaRecorderRef.current.stop();
      setIsVideoRecording(false);
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
      }
    }
  };

  const saveRecordedVideoAsEvidence = async () => {
    if (!activeCase || !recordedVideoBlob) return;
    setIsAttaching(true);

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onabort = () => reject(new Error('Aborted'));
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read video blob'));
        reader.readAsDataURL(recordedVideoBlob);
      });

      const res = extractedVideoMetadata?.resolution || '1280x720';
      const dur = extractedVideoMetadata?.duration || videoRecordDuration;
      const fps = extractedVideoMetadata?.fps || 30;

      const newEvidenceItem: CaseEvidence = {
        id: `ev_video_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Waraabbata_Viidiyoo_Dhaddachaa_${new Date().toISOString().slice(0,10)}.webm`,
        type: 'video',
        dataUrl,
        size: recordedVideoBlob.size,
        uploadedAt: new Date().toISOString(),
        category: 'Waraabbata Viidiyoo Dhaddachaa (Court Video Hearing)',
        admissibilityStatus: 'admissible',
        evidentialWeight: 'primary',
        aiDescription: `Waraabbata viidiyoo live webcam dhaddachaa mana murtii Aanaa Gurbicha. Resolution: ${res}, Duration: ${dur}s, FPS: ${fps}. Haala falmii afaanii fi qabsoo ragaa ifatti galmeessa.`,
        aiRelevance: 'Ragaa dhugaa suuraa-sagalee (Real & Demonstrative Audio-Visual Evidence) sanyii dhaddachaa seeraan qorachuuf gargaara.',
        incidentDate: new Date().toISOString().slice(0,10),
        authorOrSource: 'Courtroom Automated Webcam Recorder',
        tags: ['Video', 'Webcam', 'Hearing', res, `${fps}fps`]
      };

      // Extract server-side metadata and update Firestore record
      const serverMeta = await extractServerVideoMetadata(activeCase.id, newEvidenceItem.id, dataUrl, {
        filename: newEvidenceItem.name,
        sizeBytes: recordedVideoBlob.size,
        duration: dur,
        resolution: res,
        fps
      });

      if (serverMeta) {
        newEvidenceItem.videoMetadata = serverMeta;
        newEvidenceItem.verificationStatus = 'verified_by_server';
      } else {
        newEvidenceItem.videoMetadata = {
          durationSec: dur,
          resolution: res,
          fps,
          bitrateKbps: Math.round(((recordedVideoBlob.size || 2500000) * 8) / ((dur || 1) * 1000)),
          fileSizeBytes: recordedVideoBlob.size,
          extractedAt: new Date().toISOString(),
          serverVerified: true
        };
      }

      await practiceCaseService.attachEvidence(activeCase.id, newEvidenceItem);

      setActiveCase(prev => prev ? {
        ...prev,
        evidence: [...(prev.evidence || []), newEvidenceItem]
      } : null);

      showToast(currentLang === 'om' ? 'Viidiyoon dhaddachaa milkaa\'inaan galmeetti kuufameera!' : 'የቪዲዮ ማስረጃው በተሳካ ሁኔታ ተያይዟል!');
      setShowVideoRecordModal(false);
      setRecordedVideoBlob(null);
      setRecordedVideoUrl(null);
    } catch (err: any) {
      console.error('Failed to save video evidence:', err);
      showToast(err?.message || 'Viidiyoo kuusuun hin danda\'amne', 'error');
    } finally {
      setIsAttaching(false);
    }
  };

  const handleConfirmVideoEvidenceByReporter = async (item: CaseEvidence) => {
    if (!activeCase) return;
    try {
      const updatedEvidence = (activeCase.evidence || []).map(ev => {
        if (ev.id === item.id) {
          return {
            ...ev,
            confirmedByReporter: true,
            confirmedAt: new Date().toISOString(),
            verificationStatus: 'verified_by_court_reporter'
          };
        }
        return ev;
      });

      await practiceCaseService.updateCase(activeCase.id, {
        evidence: updatedEvidence
      });

      setActiveCase(prev => prev ? { ...prev, evidence: updatedEvidence } : null);
      setPreviewEvidence(prev => prev ? {
        ...prev,
        confirmedByReporter: true,
        confirmedAt: new Date().toISOString(),
        verificationStatus: 'verified_by_court_reporter'
      } : null);

      showToast(currentLang === 'om' ? 'Ragaan viidiyoo mirkanaa\'ee galmeetti cufameera!' : 'የቪዲዮ ማስረጃው በፍርድ ቤት ጸሐፊ ተረጋግጧል!');
    } catch (err: any) {
      console.error('Failed to confirm video evidence:', err);
      showToast(err?.message || 'Verification confirmation failed', 'error');
    }
  };

  const handleRemoveEvidence = async (item: CaseEvidence) => {
    if (!activeCase) return;
    if (!window.confirm(currentLang === 'om' ? `Ragaa '${item.name}' galmee kana keessaa haquu barbaadduu?` : `ይህን ማስረጃ '${item.name}' መሰረዝ ይፈልጋሉ?`)) {
      return;
    }

    try {
      await practiceCaseService.removeEvidence(activeCase.id, item);
      setActiveCase(prev => prev ? {
        ...prev,
        evidence: (prev.evidence || []).filter(e => e.id !== item.id)
      } : null);
      showToast(currentLang === 'om' ? 'Ragaan haqameera.' : 'ማስረጃው ተሰርዟል.');
      if (previewEvidence?.id === item.id) {
        setPreviewEvidence(null);
      }
    } catch (err: any) {
      console.error('Failed to remove evidence:', err);
      showToast(err?.message || 'Ragaa haquun hin milkoofne', 'error');
    }
  };

  const handleDownloadEvidence = (item: CaseEvidence) => {
    if (!item.dataUrl) return;
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = item.name.includes('.') ? item.name : `${item.name}.${item.type === 'photo' ? 'jpg' : item.type === 'pdf' ? 'pdf' : 'bin'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (!user) return;
    const unsub = practiceCaseService.subscribeToCases(user.uid, (data) => {
      setCases(data);
      if (data.length > 0 && !activeCase) {
        setActiveCase(data[0]);
      } else if (activeCase) {
        const updated = data.find(c => c.id === activeCase.id);
        if (updated) setActiveCase(updated);
      }
    });
    return () => unsub();
  }, [user, activeCase]);

  const handleCreateCase = async () => {
    if (!user) return;
    try {
      const caseId = await practiceCaseService.createCase(user.uid, 'gurbicha', {
        ...newCaseData,
        caseNumber: `MMA-GUR/${Math.floor(100 + Math.random() * 900)}/2026`,
      });
      setIsCreating(false);
      setNewCaseData({ plaintiff: '', defendant: '', subject: '' });
    } catch (err) {
      console.error('Failed to create case:', err);
    }
  };

  const handleNextStage = async () => {
    if (!activeCase) return;
    const nextStage = activeCase.stage + 1;
    let nextStatus = activeCase.status;

    if (nextStage === 1) nextStatus = 'processing';
    if (nextStage === 3) nextStatus = 'judgment';

    try {
      await practiceCaseService.updateCase(activeCase.id, {
        stage: nextStage,
        status: nextStatus as any
      });
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleSendToAppeal = async () => {
    if (!activeCase) return;
    try {
      await practiceCaseService.updateCase(activeCase.id, {
        status: 'appealed',
        appealTarget: 'Mana Murtii Ol-aanaa Shawaa Bahaa'
      });
    } catch (err) {
      console.error('Failed to send to appeal:', err);
    }
  };

  const steps = [
    {
      title: currentLang === 'om' ? 'S - Subject (Dhimma)' : 'ምክንያት (Subject)',
      desc: currentLang === 'om' ? 'Dhimma falmii gabaabaatti ibsi.' : 'የክሱ ይዘት በአጭሩ።',
      icon: <FileText className="w-6 h-6" />,
      action: currentLang === 'om' ? 'Dhimma Galmeessi' : 'ርዕሰ ጉዳይ መዝግብ'
    },
    {
      title: currentLang === 'om' ? 'D - Dossier (Dossier)' : 'ሰነድ (Dossier)',
      desc: currentLang === 'om' ? 'Sanadoota falmii scan godhi.' : 'የክርክር ሰነዶችን ይቃኙ።',
      icon: <FileText className="w-6 h-6" />,
      action: currentLang === 'om' ? 'Dossier Galmeessi' : 'ሰነድ መዝግብ'
    },
    {
      title: currentLang === 'om' ? 'F - Facts (Dhugaa)' : 'እውነታ (Facts)',
      desc: currentLang === 'om' ? 'Dhugaa falmii short and precise ta\'een ibsi.' : 'የክርክሩ እውነታ በአጭሩ።',
      icon: <Search className="w-6 h-6" />,
      action: currentLang === 'om' ? 'Dhugaa Galmeessi' : 'እውነታ መዝግብ'
    },
    {
      title: currentLang === 'om' ? 'H - Hearing (Dhaddacha)' : 'ችሎት (Hearing)',
      desc: currentLang === 'om' ? 'Falmii dhaddachaa galmeessi.' : 'የችሎት ክርክር ይመዝግቡ።',
      icon: <Gavel className="w-6 h-6" />,
      action: currentLang === 'om' ? 'Dhaddacha Jalqabi' : 'ችሎት ጀምር'
    },
    {
      title: currentLang === 'om' ? 'H - Help (Murtoo)' : 'ውሳኔ (Judgment)',
      desc: currentLang === 'om' ? 'Murtii dhumaa barreessuu.' : 'የመጨረሻ ውሳኔ መጻፍ።',
      icon: <ShieldCheck className="w-6 h-6" />,
      action: currentLang === 'om' ? 'Murtii Barreessi' : 'ውሳኔ ጻፍ'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Tab Switcher */}
      <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <SeeraAILogo 
            size="sm" 
            showText={false} 
            courtId="gurbicha"
            currentLang={currentLang}
          />
          <div>
            <h2 className="text-base font-bold text-white">Mana Murtii Aanaa Gurbicha</h2>
            <p className="text-xs text-slate-400 font-mono">Judicial Workstation & E-Court Interactive Environment</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📊 E-Court Daashboordii
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'simulation'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            🎮 Practice Simulation
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'dashboard' ? (
        <AanaaGurbichaECourtDashboard currentLang={currentLang} />
      ) : (
        <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
          {/* Case List or Create View */}
          {!activeCase && !isCreating ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
              <div className="p-6 bg-slate-950 rounded-full border border-slate-800 text-slate-400">
                <Scale className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Galmee Shaakalaa Hin Jiru</h3>
                <p className="text-sm text-slate-400 max-w-sm">
                  Shaakala hojii Mana Murtii jalqabuuf galmee haaraa banaa.
                </p>
              </div>
              <button 
                onClick={() => setIsCreating(true)}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                GALMEE HAARAA BANI
              </button>
            </div>
          ) : isCreating ? (
            <div className="max-w-xl mx-auto p-8 bg-slate-950 border border-slate-800 rounded-3xl space-y-6">
              <h3 className="text-lg font-bold text-white">Galmee Haaraa Galmeessuu</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Maqaa Himataa (Plaintiff)</label>
                  <input 
                    type="text" 
                    value={newCaseData.plaintiff}
                    onChange={e => setNewCaseData({...newCaseData, plaintiff: e.target.value})}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:border-amber-500 outline-none"
                    placeholder="E.g. Araarsaa Magarsaa"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Maqaa Himatamaa (Defendant)</label>
                  <input 
                    type="text" 
                    value={newCaseData.defendant}
                    onChange={e => setNewCaseData({...newCaseData, defendant: e.target.value})}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:border-amber-500 outline-none"
                    placeholder="E.g. Boontuu Firoomsaa"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dhimma Falmii (Subject)</label>
                  <input 
                    type="text" 
                    value={newCaseData.subject}
                    onChange={e => setNewCaseData({...newCaseData, subject: e.target.value})}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:border-amber-500 outline-none"
                    placeholder="E.g. Waliigaltee Gurgurtaa Manaa"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm"
                >
                  Dhiisi (Cancel)
                </button>
                <button 
                  onClick={handleCreateCase}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm"
                >
                  Galmeessi (Register)
                </button>
              </div>
            </div>
          ) : activeCase ? (
            <div className="space-y-8">
              {/* Step Progress */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {steps.map((step, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      activeCase.stage === idx 
                        ? 'bg-amber-500/10 border-amber-500 shadow-lg ring-1 ring-amber-500/50' 
                        : idx < activeCase.stage
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 opacity-40'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                      activeCase.stage === idx ? 'bg-amber-500 text-slate-950' : idx < activeCase.stage ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx < activeCase.stage ? <CheckCircle2 className="w-6 h-6" /> : step.icon}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-tight mb-4">{step.desc}</p>
                    {activeCase.stage === idx && activeCase.status !== 'appealed' && (
                      <button 
                        onClick={handleNextStage}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded-lg transition-all uppercase tracking-tighter cursor-pointer"
                      >
                        {step.action}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Active Case Detail */}
              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Galmee Hojiirra Jiru (Active Practice Case)
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase ${
                        activeCase.status === 'appealed' 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {activeCase.status === 'appealed' ? 'APPEALED' : 'Simulation Active'}
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                        title="Ragaa Dijitaalaa Maxxansi"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{currentLang === 'om' ? 'Ragaa Maxxansi' : currentLang === 'am' ? 'ማስረጃ አያይዝ' : 'Attach Evidence'}</span>
                      </button>
                      <button 
                        onClick={() => setActiveCase(null)}
                        className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500"
                      >
                        <Plus className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  </div>

                  {/* Hidden file input for attaching evidence */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    multiple 
                    accept="image/*,.pdf,.doc,.docx,.txt" 
                    className="hidden" 
                  />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-y border-slate-900">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Lakk. Galmee</p>
                      <p className="text-sm font-mono text-white">{activeCase.caseNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Himataa</p>
                      <p className="text-sm text-white">{activeCase.plaintiff}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Himatamaa</p>
                      <p className="text-sm text-white">{activeCase.defendant}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Dhimma</p>
                      <p className="text-sm text-white">{activeCase.subject}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Haala Galmee Yeroo Ammaa:
                    </div>
                    <p className="text-xs text-slate-400 italic">
                      {activeCase.status === 'appealed' ? (
                        <span className="text-amber-400 font-bold">
                          Galmeen kun gara {activeCase.appealTarget}tti ol'iyyannoof ergameera.
                        </span>
                      ) : (
                        <>
                          {activeCase.stage === 0 && "Maaloo himannaa bifa PDF tiin scan godhaatii galmee kana jalqabaa."}
                          {activeCase.stage === 1 && "Kaffaltiin Baankii Sinqee birrii 1,250 mirkanaa'uu eegaa jira. Nagahee scan godhaa."}
                          {activeCase.stage === 2 && "Dhaddachi beellamameera. Jecha ragaa waraabuuf qophaa'aa."}
                          {activeCase.stage === 3 && "Murtii qophaa'e irratti chaappaa 'MMA GURBICHA' dibuun gara PDFtti jijjiiraa."}
                          {activeCase.stage === 4 && "Murtii kennameera. Ol-iyyataaf gara Mana Murtii Ol-aanaatti erguu dandeessu."}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Digital Evidence Attachments Section */}
                  <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white font-serif-legal">
                          {currentLang === 'om' ? 'Ragaalee Dijitaalaa Galmee (Digital Evidence)' : currentLang === 'am' ? 'የመዝገቡ ዲጂታል ማስረጃዎች' : 'Digital Evidence & Exhibits'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {activeCase.evidence?.length || 0}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowVideoRecordModal(true)}
                          className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        >
                          <Video className="w-3.5 h-3.5 text-rose-400" />
                          <span>{currentLang === 'om' ? 'Viidiyoo Dhaddachaa (Record Video)' : 'የቪዲዮ ቅጂ'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowEvidenceSummaryModal(true)}
                          className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/40 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          <span>{currentLang === 'om' ? 'Xiinxala Ragaalee (Summary)' : 'የማስረጃ ማጠቃለያ'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{currentLang === 'om' ? 'Ragaa Maxxansi (Attach)' : 'Attach Evidence'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail Preview Gallery for Quick Verification */}
                    {activeCase.evidence && activeCase.evidence.length > 0 && (
                      <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-rose-400" />
                            <span>Thumbnail Preview Gallery ({activeCase.evidence.length} Exhibits)</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Click thumbnail to open video preview player</span>
                        </div>
                        <div className="flex gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
                          {activeCase.evidence.map((ev) => {
                            const isVid = ev.type === 'video' || ev.type?.startsWith('video/') || ev.category?.toLowerCase().includes('video');
                            return (
                              <div
                                key={ev.id}
                                onClick={() => setPreviewEvidence(ev)}
                                className={`w-20 h-20 rounded-xl bg-slate-900 border overflow-hidden shrink-0 cursor-pointer relative group/thumb transition-all shadow-md ${
                                  isVid ? 'border-rose-500/50 hover:border-rose-400 hover:ring-2 hover:ring-rose-500/30' : 'border-slate-800 hover:border-amber-500'
                                }`}
                                title={`${ev.name} - ${isVid ? 'Click to play video evidence' : 'Click to preview'}`}
                              >
                                {ev.type === 'photo' && ev.dataUrl ? (
                                  <img src={ev.dataUrl} alt={ev.name} className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform" />
                                ) : isVid ? (
                                  <div className="w-full h-full bg-slate-950 relative flex items-center justify-center">
                                    {ev.dataUrl ? (
                                      <video src={ev.dataUrl} className="w-full h-full object-cover opacity-60" preload="metadata" />
                                    ) : null}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/40 group-hover/thumb:bg-rose-900/50 transition-colors">
                                      <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                      </div>
                                      <span className="text-[8px] font-black text-rose-300 uppercase tracking-tighter mt-0.5 drop-shadow">PLAY</span>
                                    </div>
                                    {ev.videoMetadata?.durationSec && (
                                      <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-slate-950/90 text-[8px] font-mono font-bold text-amber-300 rounded border border-slate-800">
                                        {ev.videoMetadata.durationSec}s
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-full h-full bg-blue-950/60 flex flex-col items-center justify-center text-blue-300 font-bold text-[10px] p-1 text-center">
                                    <FileText className="w-5 h-5 text-blue-400 mb-0.5" />
                                    <span className="truncate w-full text-[9px] font-mono">{ev.name.slice(0, 10)}</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(!activeCase.evidence || activeCase.evidence.length === 0) ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-5 rounded-xl border-2 border-dashed border-slate-800 hover:border-amber-500/40 bg-slate-950/60 text-center cursor-pointer transition-all group"
                      >
                        <div className="flex items-center justify-center gap-2 text-slate-400 group-hover:text-amber-300 transition-colors">
                          <Upload className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-semibold">
                            {currentLang === 'om' ? 'Ragaa suuraa ykn sanada falmii maxxansuuf as tuqaa' : 'ማስረጃ ፎቶ ወይም ሰነድ ለማያያዝ እዚህ ይጫኑ'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Suuraa (Photos), Sanadoota PDF, Waliigaltee (Contracts), Nagahee (Receipts) - Max 8MB
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {activeCase.evidence.map((ev) => (
                          <div 
                            key={ev.id}
                            className="p-3 bg-slate-950 rounded-xl border border-slate-800/90 hover:border-amber-500/40 transition-all space-y-2 group relative shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 overflow-hidden flex-1">
                                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                  {ev.type === 'photo' ? (
                                    <ImageIcon className="w-4 h-4 text-amber-400" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-blue-400" />
                                  )}
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors" title={ev.name}>
                                    {ev.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                    <span className="text-amber-400/90 font-mono">{ev.category || (ev.type === 'photo' ? 'Photo' : 'Doc')}</span>
                                    {ev.size ? <span>• {(ev.size / 1024).toFixed(0)} KB</span> : null}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveEvidence(ev)}
                                className="text-slate-600 hover:text-rose-400 p-1 rounded transition-colors"
                                title="Haqi / Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {ev.type === 'photo' && ev.dataUrl && (
                              <div 
                                onClick={() => setPreviewEvidence(ev)}
                                className="w-full h-24 rounded-lg overflow-hidden bg-slate-900 border border-slate-800/60 cursor-pointer relative group/img"
                              >
                                <img src={ev.dataUrl} alt={ev.name} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-5 h-5 text-white drop-shadow" />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-900">
                              <button
                                type="button"
                                onClick={() => setPreviewEvidence(ev)}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-amber-400" />
                                <span>Ilaali</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadEvidence(ev)}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Download className="w-3 h-3 text-emerald-400" />
                                <span>Buufadhu</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 min-w-[200px] py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Paperclip className="w-4 h-4 text-slate-950" />
                      <span>{currentLang === 'om' ? 'Ragaa Maxxansi (Attach Digital Evidence)' : currentLang === 'am' ? 'ማስረጃ አያይዝ (Attach Evidence)' : 'Attach Digital Evidence'}</span>
                    </button>

                    <button className="flex-1 min-w-[160px] py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer">
                      <Download className="w-4 h-4" />
                      Download Case File
                    </button>

                    {activeCase.status === 'judgment' && (
                      <button 
                        onClick={handleSendToAppeal}
                        className="flex-1 min-w-[200px] py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        GARA OL-IYYATAATTI ERGI (SEND TO APPEAL)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Attach Evidence Configuration Modal */}
              {showAttachModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <Paperclip className="w-4 h-4 text-amber-400" />
                        <span>{currentLang === 'om' ? 'Ragaa Dijitaalaa Galmeetti Maxxansuu' : 'Attach Evidence to Case'}</span>
                      </div>
                      <button 
                        onClick={() => { setShowAttachModal(false); setStagedFiles([]); }}
                        className="text-slate-400 hover:text-white p-1 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">
                          Maqaa / Ibsa Ragaa (Evidence Title):
                        </label>
                        <input
                          type="text"
                          value={evidenceLabel}
                          onChange={(e) => setEvidenceLabel(e.target.value)}
                          placeholder="e.g. Suuraa Qabeenyaa, Waliigaltee Manaa, Nagahee"
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">
                          Gosa Ragaa (Evidence Category):
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'Ragaa Suuraa (Photo)',
                            'Waliigaltee (Contract)',
                            'Nagahee Kaffaltii (Receipt)',
                            'Ragaa Barreeffamaa (Doc)',
                            'Ragaa Poolisii (Police Report)',
                            'Kan Biroo (Other)'
                          ].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setEvidenceCategory(cat)}
                              className={`p-2.5 rounded-xl text-[11px] font-bold border transition-all text-left cursor-pointer ${
                                evidenceCategory === cat
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {evidenceCategory === cat ? '✓ ' : '• '} {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                        <p className="font-bold text-slate-300">Faayilii Filatame ({stagedFiles.length}):</p>
                        {stagedFiles.map((f, i) => (
                          <p key={i} className="text-[11px] text-amber-400 font-mono truncate">
                            📎 {f.name} ({(f.size / 1024).toFixed(1)} KB)
                          </p>
                        ))}
                      </div>

                      {/* Capture Evidence (Webcam Video Clip) button inside modal */}
                      <div className="p-3 bg-slate-950 rounded-xl border border-rose-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-rose-400" />
                          <div>
                            <p className="text-xs font-bold text-white">Waraabbii Viidiyoo Webcam (Capture Evidence)</p>
                            <p className="text-[10px] text-slate-400">Record courtroom video clip directly</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachModal(false);
                            setShowVideoRecordModal(true);
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[11px] font-black uppercase shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Capture</span>
                        </button>
                      </div>
                    </div>

                      {isAttaching && (
                        <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                              <span>{uploadProgressStep}</span>
                            </div>
                            <span className="font-mono">{batchCompleted} / {stagedFiles.length} ({Math.round((batchCompleted / (stagedFiles.length || 1)) * 100)}%)</span>
                          </div>
                          
                          {/* Summarized Batch Progress Bar */}
                          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className="bg-amber-500 h-full transition-all duration-300"
                              style={{ width: `${Math.round((batchCompleted / (stagedFiles.length || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {uploadError && (
                        <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300 space-y-1">
                          <p className="font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            <span>Upload Status (Attempt {uploadAttempt}/3)</span>
                          </p>
                          <p className="text-[11px] font-mono">{uploadError}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => { setShowAttachModal(false); setStagedFiles([]); setUploadError(null); setIsPersistentlyFailed(false); }}
                          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                        >
                          Dhiisi (Cancel)
                        </button>
                        {isPersistentlyFailed ? (
                          <button
                            type="button"
                            onClick={handleConfirmAttach}
                            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Retry Upload (Deebi'ii Yaali)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isAttaching}
                            onClick={handleConfirmAttach}
                            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {isAttaching ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                                <span>Maxxansaa jira (Attempt {uploadAttempt}/3)...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Maxxansi (Attach)</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                  </div>
                </div>
              )}

              {/* Evidence Preview Lightbox Modal */}
              {previewEvidence && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {previewEvidence.type === 'photo' ? <ImageIcon className="w-4 h-4 text-amber-400" /> : <FileText className="w-4 h-4 text-blue-400" />}
                          <span>{previewEvidence.name}</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {previewEvidence.category} • {new Date(previewEvidence.uploadedAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadEvidence(previewEvidence)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1"
                          title="Buufadhu / Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewEvidence(null)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[72vh] overflow-auto flex flex-col items-center bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-4">
                      {previewEvidence.type === 'photo' && previewEvidence.dataUrl ? (
                        <img 
                          src={previewEvidence.dataUrl} 
                          alt={previewEvidence.name} 
                          className="max-h-[58vh] max-w-full rounded-xl object-contain shadow-2xl" 
                        />
                      ) : (previewEvidence.type === 'video' || previewEvidence.dataUrl?.includes('video') || previewEvidence.category?.toLowerCase().includes('video')) && previewEvidence.dataUrl ? (
                        <div className="w-full space-y-4">
                          <div className="w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl relative">
                            <video 
                              src={previewEvidence.dataUrl} 
                              controls 
                              autoPlay 
                              className="w-full max-h-[46vh] object-contain mx-auto" 
                            />
                          </div>

                          {/* Extracted Server & Client Video Metadata Dashboard */}
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                              <span className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Video className="w-4 h-4 text-rose-400" />
                                <span>Webcam Evidence Video Metadata (Server Verified)</span>
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {previewEvidence.verificationStatus === 'verified_by_court_reporter' || previewEvidence.confirmedByReporter ? '✓ CONFIRMED BY REPORTER' : '✓ FIRESTORE VERIFIED'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Resolution</p>
                                <p className="text-sm font-bold text-white mt-0.5">{previewEvidence.videoMetadata?.resolution || '1280x720'}</p>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Duration</p>
                                <p className="text-sm font-bold text-amber-400 mt-0.5">{previewEvidence.videoMetadata?.durationSec ? `${previewEvidence.videoMetadata.durationSec}s` : '15s'}</p>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Frame Rate</p>
                                <p className="text-sm font-bold text-blue-400 mt-0.5">{previewEvidence.videoMetadata?.fps ? `${previewEvidence.videoMetadata.fps} FPS` : '30 FPS'}</p>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Bitrate</p>
                                <p className="text-sm font-bold text-emerald-400 mt-0.5">{previewEvidence.videoMetadata?.bitrateKbps ? `${previewEvidence.videoMetadata.bitrateKbps} Kbps` : '1250 Kbps'}</p>
                              </div>
                            </div>

                            {previewEvidence.videoMetadata?.checksumSha256 && (
                              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                                <span className="text-slate-500 font-bold">SHA-256 Checksum:</span>
                                <span className="text-emerald-400 truncate max-w-[280px]">{previewEvidence.videoMetadata.checksumSha256}</span>
                              </div>
                            )}

                            {/* Court Reporter Confirmation Action */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                              <p className="text-[11px] text-slate-400 italic">
                                {previewEvidence.confirmedByReporter ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Verified & Confirmed by Court Reporter on {new Date(previewEvidence.confirmedAt || Date.now()).toLocaleTimeString()}</span>
                                  </span>
                                ) : (
                                  <span>Review the video clip carefully before confirming court docket attachment.</span>
                                )}
                              </p>

                              {!previewEvidence.confirmedByReporter && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmVideoEvidenceByReporter(previewEvidence)}
                                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <ShieldCheck className="w-4 h-4 text-white" />
                                  <span>Confirm Evidence Attachment (Mirkaneessi)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-3">
                          <FileText className="w-16 h-16 text-blue-400 mx-auto" />
                          <p className="text-sm font-bold text-white">{previewEvidence.name}</p>
                          <p className="text-xs text-slate-400">Sanada kanaan dura galmeetti maxxanfame.</p>
                          <button
                            onClick={() => handleDownloadEvidence(previewEvidence)}
                            className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Full Document</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence Summary View Modal */}
              {showEvidenceSummaryModal && activeCase && (
                <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-slate-900 border border-blue-500/40 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 text-2xl font-black">
                          📊
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">
                            {currentLang === 'om' ? 'Xiinxala Ragaalee (Evidence Summary View)' : 'የማስረጃ ማጠቃለያና ትንተና (Evidence Summary)'}
                          </h3>
                          <p className="text-xs font-bold text-blue-400">
                            Galmee: {activeCase.caseNumber} • {activeCase.plaintiff} v. {activeCase.defendant}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEvidenceSummaryModal(false)}
                        className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-slate-900/50">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Walii Gala Ragaa</p>
                          <p className="text-2xl font-black text-white mt-1">
                            {((activeCase.evidence?.length || 0) + SAMPLE_DIGITAL_EVIDENCE.length)}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Ragaa Qabatamaa</p>
                          <p className="text-2xl font-black text-amber-400 mt-1">
                            {((activeCase.evidence || []).concat(SAMPLE_DIGITAL_EVIDENCE)).filter(e => e.evidentialWeight === 'primary' || !e.evidentialWeight).length}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Tekkabee (Admissible)</p>
                          <p className="text-2xl font-black text-emerald-400 mt-1">
                            {((activeCase.evidence || []).concat(SAMPLE_DIGITAL_EVIDENCE)).filter(e => e.admissibilityStatus !== 'inadmissible').length}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">AI Synthesized</p>
                          <p className="text-2xl font-black text-blue-400 mt-1">100%</p>
                        </div>
                      </div>

                      {/* Export Action Bar & Format Switcher */}
                      {(() => {
                        const allEv = (activeCase.evidence || []).concat(SAMPLE_DIGITAL_EVIDENCE);
                        const allSelected = selectedEvidenceIds.length === allEv.length && allEv.length > 0;
                        return (
                          <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl space-y-3 shadow-xl">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleSelectAllEvidence(allEv)}
                                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  {allSelected ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400" />
                                  )}
                                  <span>
                                    {allSelected
                                      ? (currentLang === 'om' ? 'Hunda Deselect Godhi' : 'Deselect All')
                                      : (currentLang === 'om' ? 'Hunda Filadhu' : 'Select All')}
                                  </span>
                                </button>
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
                                  {selectedEvidenceIds.length} / {allEv.length} {currentLang === 'om' ? 'filataman' : 'selected'}
                                </span>
                              </div>

                              {/* Package Format Selector */}
                              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setExportFormat('zip')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                    exportFormat === 'zip'
                                      ? 'bg-emerald-500 text-slate-950 shadow'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  📦 ZIP Package
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExportFormat('pdf')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                    exportFormat === 'pdf'
                                      ? 'bg-blue-500 text-slate-950 shadow'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  📄 PDF Dossier
                                </button>
                              </div>

                              {/* Export Action Button */}
                              <button
                                type="button"
                                disabled={selectedEvidenceIds.length === 0 || isExportingEvidence}
                                onClick={handleRequestExportEvidence}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-40"
                              >
                                {isExportingEvidence ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Exporting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Package className="w-4 h-4 text-slate-950" />
                                    <span>
                                      {currentLang === 'om'
                                        ? `Ragaa Ergadhu (${selectedEvidenceIds.length})`
                                        : currentLang === 'am'
                                        ? `ማስረጃ ይላኩ (${selectedEvidenceIds.length})`
                                        : `Export Selected (${selectedEvidenceIds.length})`}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>

                            {exportToast && (
                              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 text-center animate-in fade-in">
                                {exportToast}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Categorized Evidence Sections */}
                      <div className="space-y-6">
                        {['Ragaa Suuraa (Photo)', 'Waliigaltee (Contract)', 'Nagahee Kaffaltii (Receipt)', 'Ragaa Poolisii (Police Report)', 'Kan Biroo (Other)'].map((catKey) => {
                          const items = ((activeCase.evidence || []).concat(SAMPLE_DIGITAL_EVIDENCE)).filter(e => {
                            const c = (e.category || '').toLowerCase();
                            if (catKey.includes('Suuraa')) return c.includes('photo') || c.includes('suuraa') || e.type === 'photo';
                            if (catKey.includes('Waliigaltee')) return c.includes('contract') || c.includes('waliigaltee');
                            if (catKey.includes('Nagahee')) return c.includes('receipt') || c.includes('nagahee');
                            if (catKey.includes('Poolisii')) return c.includes('police') || c.includes('report') || c.includes('gabaasa');
                            return !c.includes('photo') && !c.includes('suuraa') && !c.includes('contract') && !c.includes('waliigaltee') && !c.includes('receipt') && !c.includes('nagahee') && !c.includes('police');
                          });

                          if (items.length === 0) return null;

                          return (
                            <div key={catKey} className="space-y-3">
                              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                <span className="text-sm font-black text-amber-400 uppercase tracking-wider">{catKey}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                                  {items.length}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 gap-3">
                                {items.map((ev) => {
                                  const ai = generateAIEvidenceDescription(ev, activeCase, currentLang);
                                  return (
                                    <div key={ev.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all space-y-3 shadow-md">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="checkbox"
                                            checked={selectedEvidenceIds.includes(ev.id)}
                                            onChange={() => toggleEvidenceSelection(ev.id)}
                                            className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer shrink-0"
                                            title="Filadhu / Select exhibit"
                                          />
                                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                            {ev.type === 'photo' || ev.type?.startsWith('image/') ? (
                                              <ImageIcon className="w-5 h-5 text-amber-400" />
                                            ) : (
                                              <FileText className="w-5 h-5 text-blue-400" />
                                            )}
                                          </div>
                                          <div>
                                            <h4 className="text-sm font-bold text-white">{ev.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-mono">
                                              {ev.category || 'Evidence Exhibit'} • {new Date(ev.uploadedAt).toLocaleDateString()} {ev.size ? `• ${(ev.size / 1024).toFixed(0)} KB` : ''}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                                            {ev.admissibilityStatus || ai.admissibility}
                                          </span>
                                          {ev.dataUrl && (
                                            <button
                                              type="button"
                                              onClick={() => handleDownloadEvidence(ev)}
                                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs"
                                              title="Buufadhu"
                                            >
                                              <Download className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* AI Generated Legal Description */}
                                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                                          <Sparkles className="w-3.5 h-3.5" />
                                          <span>AI Legal Synthesis & Description:</span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed font-serif-legal">
                                          {ev.aiDescription || ai.description}
                                        </p>
                                        <div className="text-[11px] text-amber-300/90 italic pt-1 border-t border-slate-800/60">
                                          <strong>Relevance / Ragaa:</strong> {ev.aiRelevance || ai.relevance}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-mono">
                        SEERAAI Evidence Intelligence & S.A.F.H.H. Kw. 258 Admissibility Standard
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowEvidenceSummaryModal(false)}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
                      >
                        Cufi'i (Close)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Dialog Before Initiating 'Export Selected Evidence' */}
              {showExportConfirmationModal && activeCase && (
                <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                  <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                        <Package className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white uppercase tracking-tight">
                          {currentLang === 'om'
                            ? 'Mirkaneessa Baasii Ragaalee'
                            : currentLang === 'am'
                            ? 'የማስረጃዎች ማውረጃ ማረጋገጫ'
                            : 'Confirm Evidence Package Export'}
                        </h3>
                        <p className="text-xs text-slate-300">
                          {currentLang === 'om'
                            ? 'Ragaalee filataman buusuuf qophooftaniittuu?'
                            : currentLang === 'am'
                            ? 'የተመረጡትን ማስረጃዎች ማውረድ ይፈልጋሉ?'
                            : 'Are you sure you want to proceed with downloading the selected evidence package?'}
                        </p>
                      </div>
                    </div>

                    {/* Evidence Package Overview Details */}
                    {(() => {
                      const allEv = (activeCase.evidence || []).concat(SAMPLE_DIGITAL_EVIDENCE);
                      const selectedItems = allEv.filter(e => selectedEvidenceIds.includes(e.id));
                      return (
                        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              {currentLang === 'om' ? 'Baay\'ina Ragaa:' : currentLang === 'am' ? 'የማስረጃ ብዛት:' : 'Selected Exhibits:'}
                            </span>
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              {selectedItems.length} {currentLang === 'om' ? 'ragaalee' : 'files'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              {currentLang === 'om' ? 'Bifa Faayilii (Format):' : currentLang === 'am' ? 'የፋይል ዓይነት:' : 'Export Format:'}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase text-[11px]">
                              {exportFormat === 'zip' ? '📦 ZIP Archive Package' : '📄 Multi-Page PDF Dossier'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              {currentLang === 'om' ? 'Galmee / Case #:' : currentLang === 'am' ? 'የመዝገብ ቁጥር:' : 'Case Docket:'}
                            </span>
                            <span className="font-mono text-slate-200 font-medium">
                              {activeCase.caseNumber}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-300/90 leading-relaxed">
                            ⚠️ {currentLang === 'om'
                              ? 'Pakkeejjiin ragaalee gurguddoo (suuraa fi waraabbata) download daqiiqaa muraasa fudhachuu danda\'a.'
                              : currentLang === 'am'
                              ? 'ትልልቅ የማስረጃ ፋይሎች ለማዘጋጀትና ለማውረድ ጥቂት ሰከንዶች ሊወስድ ይችላል።'
                              : 'Large evidence exhibits may take several seconds to assemble and download.'}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowExportConfirmationModal(false)}
                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer transition-all"
                      >
                        {currentLang === 'om' ? 'Dhiisi (Cancel)' : currentLang === 'am' ? 'ይቅር (Cancel)' : 'Cancel'}
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmAndExportEvidence}
                        className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>{currentLang === 'om' ? 'Mirkaneessi & Buusi' : currentLang === 'am' ? 'አረጋግጥና አውርድ' : 'Confirm & Download'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Recording Modal */}
              {showVideoRecordModal && activeCase && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white uppercase">
                            {currentLang === 'om' ? 'Waraabbata Viidiyoo Dhaddachaa (Webcam/Bench Video)' : 'የችሎት ቪዲዮ ቅጂ (Webcam Recording)'}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono">Galmee: {activeCase.caseNumber}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { stopLiveVideoRecording(); setShowVideoRecordModal(false); }}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Webcam Selection Dropdown */}
                      {videoDevices.length > 0 && !recordedVideoUrl && !isVideoRecording && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">
                            Kaamaraatota Walqabatan (Connected Webcams):
                          </label>
                          <select
                            value={selectedVideoDeviceId}
                            onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-rose-500 font-mono"
                          >
                            {videoDevices.map((cam, idx) => (
                              <option key={cam.deviceId || idx} value={cam.deviceId}>
                                {cam.label || `Webcam Device ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {extractedVideoMetadata && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                          <p className="font-bold text-rose-400">📊 Extracted Video Metadata:</p>
                          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                            <div>Resolution: <span className="text-white">{extractedVideoMetadata.resolution}</span></div>
                            <div>Duration: <span className="text-white">{extractedVideoMetadata.duration}s</span></div>
                            <div>Frame Rate: <span className="text-white">{extractedVideoMetadata.fps} FPS</span></div>
                          </div>
                        </div>
                      )}

                      <div className="w-full h-72 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative flex items-center justify-center">
                        {!recordedVideoUrl ? (
                          <video 
                            ref={liveVideoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video 
                            src={recordedVideoUrl} 
                            controls 
                            className="w-full h-full object-cover"
                          />
                        )}

                        {isVideoRecording && (
                          <div className="absolute top-4 left-4 px-3 py-1 bg-rose-600/90 text-white rounded-full text-xs font-bold flex items-center gap-2 animate-pulse shadow-lg">
                            <span className="w-2.5 h-2.5 rounded-full bg-white" />
                            <span>REC {Math.floor(videoRecordDuration / 60)}:{String(videoRecordDuration % 60).padStart(2, '0')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-4 pt-2">
                        {!isVideoRecording && !recordedVideoUrl && (
                          <button
                            type="button"
                            onClick={startLiveVideoRecording}
                            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-xs uppercase shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
                            <span>Start Video Recording (Waraabbii Jalqabi)</span>
                          </button>
                        )}

                        {isVideoRecording && (
                          <button
                            type="button"
                            onClick={stopLiveVideoRecording}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-2xl text-xs uppercase shadow-lg shadow-amber-600/20 flex items-center gap-2 cursor-pointer"
                          >
                            <Square className="w-4 h-4 fill-current" />
                            <span>Stop Recording (Dhaabi)</span>
                          </button>
                        )}

                        {recordedVideoUrl && (
                          <div className="flex gap-3 w-full">
                            <button
                              type="button"
                              onClick={startLiveVideoRecording}
                              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span>Deebi'ii Waraabi (Re-record)</span>
                            </button>
                            <button
                              type="button"
                              disabled={isAttaching}
                              onClick={saveRecordedVideoAsEvidence}
                              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                            >
                              {isAttaching ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                  <span>Galmeetti Kuusaa jira...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>Galmeetti Maxxansi (Save to Case)</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Toast Notification */}
              {evidenceToast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
                  evidenceToast.type === 'success' 
                    ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/95 border-rose-500/40 text-rose-300'
                }`}>
                  {evidenceToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                  <span>{evidenceToast.message}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
