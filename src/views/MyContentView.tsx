import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Search,
  Trash2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Filter,
  Calendar,
  FileDown,
  Database,
  WifiOff,
  Wifi,
  Folder,
  FolderPlus,
  Star,
  Tag,
  Plus,
  X,
  FolderOpen,
  Edit3,
  RefreshCw,
  Clock,
  ShieldCheck,
  History,
  Mic,
  Sparkles,
  Eye,
  Scale,
  UploadCloud,
  Loader2,
  FileText,
  MessageCircle,
  Gavel,
} from 'lucide-react';

import { DiscussionPanel } from '../components/DiscussionPanel';
import { Language, translations } from '../i18n/translations';
import {
  getSavedDocumentsAsync,
  deleteDocument,
  updateDocument,
  getUserSettings,
  SavedLegalDocument,
  LegalFolder,
  getFolders,
  createFolder,
  deleteFolder,
  moveDocumentToFolder,
  toggleBookmarkDocument,
  autoCategorizeDocumentsIntoFolders,
  shareFolder,
  saveDocument,
} from '../services/storage';
import { processDocumentOffThread } from '../services/documentExtractionService';
import { convertMediaFileToText, extractDocumentMetadata } from '../services/api';
import {
  isBiometricSessionUnlocked,
  setBiometricSessionUnlocked,
  verifyHighSecurityBiometrics,
} from '../utils/biometric';
import { getOfflineTranslationsFromDB, clearOfflineTranslationsFromDB, CachedTranslation, QueuedDocumentEdit } from '../services/indexedDb';
import { backgroundSyncManager } from '../services/backgroundSync';
import { PdfExportModal } from '../components/PdfExportModal';
import { LegalCitationHighlighter } from '../components/LegalCitationHighlighter';
import { EditDocumentModal } from '../components/EditDocumentModal';
import { DocumentVersionHistoryModal } from '../components/DocumentVersionHistoryModal';
import { DocumentVoiceNoteModal } from '../components/DocumentVoiceNoteModal';
import { DecisionIntegrityModal } from '../components/DecisionIntegrityModal';
import { LegalArgumentComparatorModal } from '../components/LegalArgumentComparatorModal';
import { DocumentSmartSummaryModal } from '../components/DocumentSmartSummaryModal';
import { DocumentQuickPreviewModal } from '../components/DocumentQuickPreviewModal';
import { TelegramImportModal } from '../components/TelegramImportModal';
import { directExportSavedDocument } from '../services/legalDocumentExport';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';
import { SavedCitationsModal } from '../components/SavedCitationsModal';
import { getLocalSavedCitations } from '../services/citationLibraryService';
import { Bell, CalendarPlus, Share2 } from 'lucide-react';


const LITIGATION_STAGES = [
  { id: 'filing', om: 'Iyyannoo', am: 'አቤቱታ', en: 'Filing', color: 'bg-slate-500' },
  { id: 'summons', om: 'Waamicha', am: 'መጥሪያ', en: 'Summons', color: 'bg-blue-500' },
  { id: 'pleading', om: 'Deebii', am: 'መልስ', en: 'Pleading', color: 'bg-indigo-500' },
  { id: 'evidence', om: 'Ragaa', am: 'ማስረጃ', en: 'Evidence', color: 'bg-purple-500' },
  { id: 'deliberation', om: 'Madaallii', am: 'ምርመራ', en: 'Deliberation', color: 'bg-amber-500' },
  { id: 'verdict', om: 'Murtii', am: 'ውሳኔ', en: 'Verdict', color: 'bg-emerald-500' },
];

interface MyContentViewProps {
  currentLang: Language;
  onOpenDoc?: (doc: SavedLegalDocument) => void;
}

export const MyContentView: React.FC<MyContentViewProps> = ({ currentLang, onOpenDoc }) => {
  const t = translations[currentLang];
  const [docs, setDocs] = useState<SavedLegalDocument[]>([]);
  const [folders, setFolders] = useState<LegalFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all'); // 'all' | 'bookmarked' | folderId
  const [offlineTranslations, setOfflineTranslations] = useState<CachedTranslation[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'translations'>('documents');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<SavedLegalDocument | null>(null);
  const [selectedTranslation, setSelectedTranslation] = useState<CachedTranslation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfModalDoc, setPdfModalDoc] = useState<SavedLegalDocument | null>(null);
  const [exportModalMode, setExportModalMode] = useState<'pdf' | 'word'>('pdf');
  const [editingDoc, setEditingDoc] = useState<SavedLegalDocument | null>(null);
  const [versionModalDoc, setVersionModalDoc] = useState<SavedLegalDocument | null>(null);
  const [voiceNoteModalDoc, setVoiceNoteModalDoc] = useState<SavedLegalDocument | null>(null);
  const [integrityModalDoc, setIntegrityModalDoc] = useState<SavedLegalDocument | null>(null);
  const [smartSummaryDoc, setSmartSummaryDoc] = useState<SavedLegalDocument | null>(null);
  const [exportingDocId, setExportingDocId] = useState<string | null>(null);
  const [exportToast, setExportToast] = useState<string | null>(null);

  // High-Security Biometric Protection State
  const [pendingProtectedDoc, setPendingProtectedDoc] = useState<SavedLegalDocument | null>(null);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<'view' | 'edit' | 'pdf' | 'word' | 'version' | 'preview' | null>(null);
  const [isBiometricVerifying, setIsBiometricVerifying] = useState(false);
  const [biometricPromptError, setBiometricPromptError] = useState<string | null>(null);

  // Offline edit queue and synchronization state
  const [queuedEdits, setQueuedEdits] = useState<QueuedDocumentEdit[]>([]);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // New folder & Batch operations state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('amber');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<SavedLegalDocument | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [sharingFolder, setSharingFolder] = useState<LegalFolder | null>(null);
  const [sharedWithInput, setSharedWithInput] = useState('');
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);

  const handleQuickShare = async (doc: SavedLegalDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const token = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    const shareUrl = `${window.location.origin}/#share?docId=${doc.id}&token=${token}&secure=true`;
    await navigator.clipboard.writeText(shareUrl);
    setSyncToast(
      currentLang === 'om'
        ? `Hidda qoodinsaa (Quick Share Link) qabiyyee "${doc.title}" koppii ta'eera!`
        : currentLang === 'am'
        ? `የሰነዱ ማጋራሪያ ሊንክ ተኮርጅቷል!`
        : `Secure read-only share link copied to clipboard!`
    );
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Litigation Tracker & Reminder State
  const [reminders, setReminders] = useState<{ docId: string; title: string; date: string }[]>([]);
  const [showReminderToast, setShowReminderToast] = useState<{ title: string; time: string } | null>(null);

  // Batch Upload State
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, statusOm: '', statusEn: '' });
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isBatchRenaming, setIsBatchRenaming] = useState(false);
  const [batchRenameProgress, setBatchRenameProgress] = useState('');
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const handleBatchAiRename = async () => {
    if (selectedDocIds.length === 0) return;
    setIsBatchRenaming(true);
    let renamedCount = 0;

    for (const id of selectedDocIds) {
      const doc = docs.find(d => d.id === id);
      if (!doc) continue;
      setBatchRenameProgress(`Renaming "${doc.title.substring(0, 15)}..."`);
      try {
        const metadata = await extractDocumentMetadata(doc.content.substring(0, 4000));
        const cName = metadata.caseName || doc.caseName || 'Case';
        const dStr = metadata.date || doc.extractedDate || new Date().toISOString().split('T')[0];
        const dType = metadata.docType || doc.docType || 'LegalDoc';
        
        const standardizedTitle = `${cName.replace(/\s+/g, '_')}_${dStr}_${dType.replace(/\s+/g, '_')}`;

        updateDocument(doc.id, {
          title: standardizedTitle,
          caseName: cName,
          extractedDate: dStr,
          docType: dType
        });
        renamedCount++;
      } catch (err) {
        console.error('Batch rename failed for doc:', doc.id, err);
      }
    }

    setIsBatchRenaming(false);
    setBatchRenameProgress('');
    setSelectedDocIds([]);
    loadData();
    setSyncToast(
      currentLang === 'om'
        ? `Sanadoonni ${renamedCount} maqaa dhangii seeraatiin (AI) milkaa'inaan jijjiiramaniiru!`
        : `Successfully standardized filenames for ${renamedCount} documents using AI!`
    );
    setTimeout(() => setSyncToast(null), 4000);
  };

  const loadData = async () => {
    const loadedDocs = await getSavedDocumentsAsync();
    setDocs(loadedDocs);
    const loadedFolders = getFolders();
    setFolders(loadedFolders);
    const loadedTrans = await getOfflineTranslationsFromDB();
    setOfflineTranslations(loadedTrans);
  };

  useEffect(() => {
    loadData();

    // Subscribe to background sync utility: updates local state silently without page refresh
    const unsubscribeDocs = backgroundSyncManager.subscribe((syncedDocs) => {
      setDocs(syncedDocs);
    });

    // Subscribe to offline edit queue changes
    const unsubscribeQueue = backgroundSyncManager.subscribeQueue((queue) => {
      setQueuedEdits(queue);
    });

    const handleSyncComplete = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      const count = customEvent.detail?.count || 1;
      setSyncToast(`Hojiin fooyya'iinsaa (${count}) milkaa'inaan kuusaa keessaniin wal simateera!`);
      setTimeout(() => setSyncToast(null), 4000);
      loadData();
    };

    const handleOnline = () => {
      setIsOnline(true);
      backgroundSyncManager.syncQueuedEdits();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('seera_queued_edits_synced', handleSyncComplete);

    // Initial Reminder Check
    checkUpcomingHearings();

    return () => {
      unsubscribeDocs();
      unsubscribeQueue();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('seera_queued_edits_synced', handleSyncComplete);
    };
  }, []);

  useEffect(() => {
    // Check reminders when docs change
    checkUpcomingHearings();
  }, [docs]);

  const checkUpcomingHearings = () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const upcoming = docs.filter(d => {
      if (!d.hearingDate) return false;
      const hDate = new Date(d.hearingDate);
      return hDate > now && hDate <= tomorrow;
    });

    if (upcoming.length > 0) {
      const first = upcoming[0];
      setShowReminderToast({
        title: first.title,
        time: new Date(first.hearingDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  };

  const handleUpdateLitigation = (docId: string, stage: string) => {
    updateDocument(docId, { litigationStage: stage as any });
    loadData();
  };

  const handleUpdateHearingDate = (docId: string, date: string) => {
    updateDocument(docId, { hearingDate: date });
    loadData();
  };

  const handleCalculateDeadline = (docId: string, serviceDate: string, type: 'appeal' | 'defense' | 'set_aside' | 'other') => {
    if (!serviceDate) return;
    const date = new Date(serviceDate);
    let days = 30;
    let label = { 
      om: 'Darbiinsa Yeroo Ol-iyyannoo', 
      am: 'የይግባኝ ጊዜ ገደብ', 
      en: 'Appeal Filing Deadline' 
    };
    
    if (type === 'defense') {
      days = 15;
      label = { 
        om: 'Darbiinsa Yeroo Deebii', 
        am: 'የመከላከያ መልስ ጊዜ ገደብ', 
        en: 'Defense Filing Deadline' 
      };
    } else if (type === 'set_aside') {
      days = 30;
      label = { 
        om: 'Darbiinsa Yeroo Murtii Diiguu', 
        am: 'ውሳኔን የመሻሪያ ጊዜ ገደብ', 
        en: 'Set-Aside Deadline' 
      };
    }

    const deadline = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
    updateDocument(docId, { 
      serviceDate, 
      filingDeadline: { 
        date: deadline.toISOString(), 
        label, 
        type 
      } 
    });
    loadData();
  };

  const exportToCalendar = (doc: SavedLegalDocument) => {
    if (!doc.hearingDate) return;
    
    const title = encodeURIComponent(`Court Hearing: ${doc.title}`);
    const date = new Date(doc.hearingDate);
    const dateStr = date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = new Date(date.getTime() + 3600000); // +1 hour
    const endStr = end.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${endStr}&details=SEERAAI Legal Reminder for Case ID: ${doc.id}&sf=true&output=xml`;
    
    // For iCal
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${dateStr}
DTEND:${endStr}
SUMMARY:Court Hearing: ${doc.title}
DESCRIPTION:SEERAAI Legal Reminder for Case ID: ${doc.id}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hearing_${doc.id}.ics`;
    
    // Provide options to user
    if (confirm(currentLang === 'om' ? 'Google Calendar irratti galmeessuu barbaadduu? (Lakkii yoo jettan faayila .ics buuftu)' : 'Do you want to add to Google Calendar? (Cancel will download .ics file)')) {
      window.open(googleUrl, '_blank');
    } else {
      a.click();
    }
    URL.revokeObjectURL(url);
  };

  const handleForceSync = async () => {
    setIsSyncingNow(true);
    try {
      const res = await backgroundSyncManager.syncQueuedEdits();
      if (res.syncedCount > 0) {
        setSyncToast(`Sanadoonni ${res.syncedCount} ofumaan kuusaa keessaniin wal simataniiru!`);
        setTimeout(() => setSyncToast(null), 4000);
      }
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmarkDocument(id);
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isBookmarked: !d.isBookmarked } : d))
    );
  };

  const handleMoveFolder = (docId: string, folderId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const targetFolder = folderId === 'none' ? undefined : folderId;
    moveDocumentToFolder(docId, targetFolder);
    setDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, folderId: targetFolder } : d))
    );
  };

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const folder = createFolder(newFolderName.trim(), newFolderColor);
    setFolders(getFolders());
    setSelectedFolder(folder.id);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleAutoCategorize = () => {
    const res = autoCategorizeDocumentsIntoFolders();
    loadData();
    setSyncToast(
      currentLang === 'om'
        ? `Sanadoonni ${res.categorizedCount} foldaroota saayinsii seeraatiin offiin qindaa'aniiru!`
        : `Auto-categorized ${res.categorizedCount} saved documents into legal folders!`
    );
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleGroupByCaseFiles = () => {
    let currentFolders = getFolders();
    const currentDocs = docs;
    let count = 0;
    let created = 0;

    currentDocs.forEach((doc: SavedLegalDocument) => {
      if (doc.caseName && doc.caseName.trim()) {
        const caseNameClean = doc.caseName.trim();
        let folder = currentFolders.find(f => f.name.toLowerCase() === caseNameClean.toLowerCase());
        if (!folder) {
          folder = createFolder(caseNameClean, 'blue');
          currentFolders = getFolders();
          created++;
        }
        if (folder && doc.folderId !== folder.id) {
          moveDocumentToFolder(doc.id, folder.id);
          count++;
        }
      }
    });

    loadData();
    setSyncToast(
      currentLang === 'om'
        ? `Galmeewwan man-murtii ${count} fi foldaroota case ${created} milkaa'inaan qindaa'aniiru!`
        : `Grouped ${count} court documents into ${created} case file folders!`
    );
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleDeleteFolderConfirm = (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Foldara "${folderName}" haquu barbaadduu? Sanadoonni keessa jiran hin haqqaman.`)) {
      deleteFolder(folderId);
      setFolders(getFolders());
      if (selectedFolder === folderId) setSelectedFolder('all');
      loadData();
    }
  };

  const handleShareFolder = async () => {
    if (!sharingFolder) return;
    const userIds = sharedWithInput.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const token = await shareFolder(sharingFolder, userIds);
      alert(`Folder shared successfully! Access Token: ${token}`);
      setSharingFolder(null);
      setSharedWithInput('');
    } catch (e) {
      console.error(e);
      alert('Failed to share folder.');
    }
  };

  const processUploadedFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsBatchUploading(true);
    setBatchProgress({ current: 0, total: files.length, statusOm: 'Sanadoota qindeessaa jira...', statusEn: 'Preparing batch upload...' });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBatchProgress(prev => ({ 
        ...prev, 
        current: i + 1, 
        statusOm: `Sanada "${file.name}" irraa ragaa baasaa jira...`, 
        statusEn: `Extracting entities from "${file.name}"...` 
      }));

      try {
        // 1. Process file (resize/base64)
        const processed = await processDocumentOffThread(file, { maxWidth: 1600, maxHeight: 1600 });
        if (!processed.success) throw new Error(processed.error);

        let text = processed.text || '';

        // 2. OCR if needed (for images/PDFs)
        if (!text && processed.base64) {
          const ocrRes = await convertMediaFileToText({
            fileData: processed.base64,
            mimeType: processed.mimeType,
            fileName: file.name
          });
          text = ocrRes.extractedText;
        }

        // 3. Extract metadata using AI
        let caseName = '';
        let extractedDate = '';
        let docType = '';
        let folderId = undefined;

        if (text) {
          try {
            const metadata = await extractDocumentMetadata(text.substring(0, 5000)); // Limit text for token efficiency
            caseName = metadata.caseName;
            extractedDate = metadata.date;
            docType = metadata.docType;

            // 4. Auto-categorize based on docType
            const lowerDocType = docType.toLowerCase();
            if (lowerDocType.includes('contract') || lowerDocType.includes('waliigaltee')) folderId = 'folder_contracts';
            else if (lowerDocType.includes('judgment') || lowerDocType.includes('murtii')) folderId = 'folder_explanations';
            else if (lowerDocType.includes('petition') || lowerDocType.includes('iyyannoo')) folderId = 'folder_petitions';
            else if (lowerDocType.includes('claim') || lowerDocType.includes('himata')) folderId = 'folder_petitions';
          } catch (err) {
            console.error('Metadata extraction failed for', file.name, err);
          }
        }

        // 5. Save document
        saveDocument({
          title: caseName || file.name.split('.')[0],
          content: text || 'No text extracted.',
          prompt: `Batch Upload: ${file.name}`,
          taskType: 'general',
          outputLanguages: [currentLang],
          tags: docType ? [docType] : [],
          caseName,
          extractedDate,
          docType,
          folderId,
          fileDataUrl: processed.base64 ? `data:${processed.mimeType};base64,${processed.base64}` : undefined,
          mimeType: processed.mimeType
        });

      } catch (err) {
        console.error('Error processing file:', file.name, err);
      }
    }

    setIsBatchUploading(false);
    loadData();
    setSyncToast(currentLang === 'om' ? `Sanadoonni ${files.length} milkaa'inaan fe'amaniiru!` : `Successfully uploaded ${files.length} documents!`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processUploadedFiles(files);
    e.target.value = ''; // Reset input
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show file drop overlay if it's actually files being dragged
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processUploadedFiles(files);
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    setSelectedDocIds(prev => prev.length === filteredDocs.length ? [] : filteredDocs.map(d => d.id));
  };

  const handleBatchDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedDocIds.length} documents?`)) {
      selectedDocIds.forEach(deleteDocument);
      setSelectedDocIds([]);
      loadData();
    }
  };
  const handleBatchTag = () => {
    if (!currentTagInput.trim()) return;
    const tag = currentTagInput.trim();
    selectedDocIds.forEach(id => {
      const doc = docs.find(d => d.id === id);
      if (doc) {
        updateDocument(id, { tags: [...new Set([...doc.tags, tag])] });
      }
    });
    setSelectedDocIds([]);
    setCurrentTagInput('');
    setIsTagModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Sanada kana haquu barbaadduu? / ይህንን ሰነድ መሰረዝ ይፈልጋሉ? / Delete this document?')) {
      deleteDocument(id);
      loadData();
      if (selectedDoc?.id === id) setSelectedDoc(null);
    }
  };

  const handleClearTranslations = async () => {
    if (confirm('Hiikkaawwan kuufaman hunda haquu barbaadduu? / Clear cached translations?')) {
      await clearOfflineTranslationsFromDB();
      setOfflineTranslations([]);
      setSelectedTranslation(null);
    }
  };

  const handleCopy = async (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportTxt = (title: string, content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDirectExport = async (
    doc: SavedLegalDocument,
    format: 'pdf' | 'word',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();

    if (requiresBiometricProtection(doc) && !isBiometricSessionUnlocked()) {
      setPendingProtectedDoc(doc);
      setPendingProtectedAction(format);
      setBiometricPromptError(null);
      return;
    }

    const exportKey = `${doc.id}_${format}`;
    setExportingDocId(exportKey);
    setExportToast(
      format === 'pdf'
        ? (currentLang === 'om' ? 'PDF qopheessaa jira...' : 'PDF በማዘጋጀት ላይ...')
        : (currentLang === 'om' ? 'Word (.docx) qopheessaa jira...' : 'የዎርድ ሰነድ በማዘጋጀት ላይ...')
    );

    try {
      const settings = getUserSettings();
      await directExportSavedDocument(doc, format, settings.lawFirmBranding, (msg) => {
        setExportToast(msg);
      });
      setExportToast(
        format === 'pdf'
          ? (currentLang === 'om' ? `Sanadni PDF "${doc.title}" milkaa'inaan buufameera!` : `PDF ሰነድ "${doc.title}" በተሳካ ሁኔታ ወርዷል!`)
          : (currentLang === 'om' ? `Sanadni Word (.docx) "${doc.title}" milkaa'inaan baafameera!` : `የዎርድ (.docx) ሰነድ "${doc.title}" በተሳካ ሁኔታ ወርዷል!`)
      );
      setTimeout(() => setExportToast(null), 4000);
    } catch (err: any) {
      console.error('Direct export failed:', err);
      setExportToast(
        currentLang === 'om'
          ? `Dogoggora baasii sanadaa: ${err.message || 'Homaa hin raawwatamne'}`
          : `የሰነድ ማውረድ ስህተት፡ ${err.message || 'አልተሳካም'}`
      );
      setTimeout(() => setExportToast(null), 5000);
    } finally {
      setExportingDocId(null);
    }
  };

  const requiresBiometricProtection = (doc: SavedLegalDocument): boolean => {
    const settings = getUserSettings();
    if (doc.isHighSecurity) return true;
    if (settings.biometricDocumentProtection && (doc.taskType === 'contract' || doc.tags?.includes('confidential'))) {
      return true;
    }
    return false;
  };

  const executeWithBiometricCheck = async (
    doc: SavedLegalDocument,
    action: 'view' | 'edit' | 'pdf' | 'word' | 'version' | 'preview'
  ) => {
    if (requiresBiometricProtection(doc) && !isBiometricSessionUnlocked()) {
      setPendingProtectedDoc(doc);
      setPendingProtectedAction(action);
      setBiometricPromptError(null);
      return;
    }

    if (action === 'view') {
      setSelectedDoc(doc);
      if (onOpenDoc) onOpenDoc(doc);
    } else if (action === 'edit') {
      setEditingDoc(doc);
    } else if (action === 'pdf') {
      setExportModalMode('pdf');
      setPdfModalDoc(doc);
    } else if (action === 'word') {
      setExportModalMode('word');
      setPdfModalDoc(doc);
    } else if (action === 'version') {
      setVersionModalDoc(doc);
    } else if (action === 'preview') {
      setPreviewDoc(doc);
    }
  };

  const handleVerifyBiometricsAndProceed = async () => {
    if (!pendingProtectedDoc) return;
    setIsBiometricVerifying(true);
    setBiometricPromptError(null);

    try {
      const res = await verifyHighSecurityBiometrics(pendingProtectedDoc.title);
      if (res.success) {
        setBiometricSessionUnlocked(true);
        const targetDoc = pendingProtectedDoc;
        const targetAction = pendingProtectedAction;
        setPendingProtectedDoc(null);
        setPendingProtectedAction(null);

        if (targetAction === 'view') {
          setSelectedDoc(targetDoc);
          if (onOpenDoc) onOpenDoc(targetDoc);
        } else if (targetAction === 'edit') {
          setEditingDoc(targetDoc);
        } else if (targetAction === 'pdf') {
          setExportModalMode('pdf');
          setPdfModalDoc(targetDoc);
        } else if (targetAction === 'word') {
          setExportModalMode('word');
          setPdfModalDoc(targetDoc);
        } else if (targetAction === 'version') {
          setVersionModalDoc(targetDoc);
        } else if (targetAction === 'preview') {
          setPreviewDoc(targetDoc);
        }
      } else {
        setBiometricPromptError(
          res.error || (
            currentLang === 'om'
              ? 'Mirkaneessi asxaa qubaa hin milkoofne. Irra deebi\'aa yaalaa.'
              : currentLang === 'am'
              ? 'የባዮሜትሪክ ማረጋገጫ አልተሳካም። እባክዎ እንደገና ይሞክሩ።'
              : 'Biometric verification failed. Please try again.'
          )
        );
      }
    } catch (err: any) {
      setBiometricPromptError(err?.message || 'Biometric verification error');
    } finally {
      setIsBiometricVerifying(false);
    }
  };

  const handleToggleHighSecurity = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    const newStatus = !doc.isHighSecurity;
    const updated = updateDocument(id, { isHighSecurity: newStatus });
    if (updated) {
      setDocs((prev) => prev.map((d) => (d.id === id ? updated : d)));
      if (selectedDoc?.id === id) {
        setSelectedDoc(updated);
      }
    }
  };

  const filteredDocs = docs.filter((d) => {
    const matchesTask = selectedTask === 'all' || d.taskType === selectedTask;
    if (!matchesTask) return false;

    if (selectedFolder === 'bookmarked') {
      if (!d.isBookmarked) return false;
    } else if (selectedFolder !== 'all') {
      if (d.folderId !== selectedFolder) return false;
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const filteredTranslations = offlineTranslations.filter((tr) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      tr.sourceText.toLowerCase().includes(q) ||
      tr.translatedText.toLowerCase().includes(q) ||
      tr.sourceLang.toLowerCase().includes(q)
    );
  });

  return (
    <div 
      className="relative min-h-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
    >
      {/* Visual File Drop Overlay */}
      {isDraggingFiles && (
        <div className="fixed inset-0 z-[100] bg-indigo-600/30 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-indigo-400 m-4 rounded-3xl pointer-events-none animate-in zoom-in duration-150">
          <div className="bg-slate-900/90 p-8 rounded-2xl border border-indigo-400 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center animate-bounce">
              <UploadCloud className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">Drop files to Batch Upload</h3>
              <p className="text-slate-400 text-sm mt-1">Sanadoota mara asitti gadi dhiisaa (PDF, Word, Images, Text)</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 pb-16">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
          <Bookmark className="w-7 h-7 text-amber-400" />
          <span>{t.nav.myContent} & Offline Storage</span>
        </h1>
        <p className="mt-1 text-slate-400 text-sm">
          Sanadoota, waliigalteewwan, hiikkaawwanii fi qabiyyee seeraa IndexedDB keessatti kuufaman (Offline Caching).
        </p>
      </div>

      {/* Hearing Reminder Toast */}
      {showReminderToast && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-200 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300 shadow-2xl ring-2 ring-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center animate-bounce shadow-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-rose-300">BEELLAMA DHADDACHAA (Court Hearing)</div>
              <div className="text-sm">"{showReminderToast.title}" sa'aatii <span className="font-mono font-bold text-white bg-rose-500/40 px-1.5 rounded">{showReminderToast.time}</span> irratti qabameera.</div>
            </div>
          </div>
          <button
            onClick={() => setShowReminderToast(null)}
            className="p-2 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Toast Notice when sync completes */}
      {syncToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center justify-between text-xs animate-in fade-in duration-200 shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{syncToast}</span>
          </div>
          <button
            onClick={() => setSyncToast(null)}
            className="text-slate-400 hover:text-slate-200 cursor-pointer text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Offline Edits Queue Status Bar (when pending edits exist) */}
      {queuedEdits.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <span>Hojiiwwan Fooyya'iinsaa Offline ({queuedEdits.length}) Eegaa Jiru</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  Background Queue Active
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Gulaalliin intarneeta malee hojjattan {queuedEdits.length} kuufameera; akkuma intarneettiin deebi'een ofumaan kuusaa keessaniin wal simata.
              </div>
            </div>
          </div>

          <button
            onClick={handleForceSync}
            disabled={isSyncingNow}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
            <span>{isSyncingNow ? 'Sync Ta\'aa Jira...' : 'Amma Sync Godhi'}</span>
          </button>
        </div>
      )}

      {/* Enhanced Offline Mode Sync Status Indicator & Manual Re-sync */}
      <SyncStatusIndicator
        currentLang={currentLang}
        variant="card"
        onSyncComplete={() => loadData()}
      />

      {/* Sub-Tabs: Documents vs Translations */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveSubTab('documents')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'documents'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          Saved Legal Documents ({docs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('translations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'translations'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          Recent Offline Translations ({offlineTranslations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('citations' as any)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === ('citations' as any)
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Gavel className="w-3.5 h-3.5 text-amber-400" />
          <span>{currentLang === 'om' ? 'Wabiilee & Murtiiwwan Koo' : 'Saved Citations & Precedents'} ({getLocalSavedCitations().length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('discussion' as any)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === ('discussion' as any)
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-500/30'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>💬 Collaboration Discussion</span>
        </button>
      </div>

      {activeSubTab === ('citations' as any) && (
        <SavedCitationsModal
          isOpen={true}
          onClose={() => setActiveSubTab('documents')}
          currentLang={currentLang}
        />
      )}


      {activeSubTab === ('discussion' as any) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>💬</span>
                <span>Document Manager Collaborative Discussion Panel</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time comment threads, colleague tagging (@handle), and live review sessions.
              </p>
            </div>
          </div>
          <div className="min-h-[500px]">
            <DiscussionPanel targetId="document-manager-main-hub" title="Document Manager Library Hub" />
          </div>
        </div>
      )}

      {/* Folder Structure & Bookmark Filter Bar */}
      {activeSubTab === 'documents' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Foldaroota fi Sanadoota Filataman (Folders & Categories)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTelegramModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow"
                title="Sync documents from Telegram channel archives (@wakolegalstudio)"
              >
                <span>✈️</span>
                <span>Sync from Telegram Archive</span>
              </button>

              <button
                onClick={handleAutoCategorize}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow"
                title="Automatically organize saved & annotated documents into matching folders"
              >
                <span>🤖</span>
                <span>Auto-Categorize</span>
              </button>

              <button
                onClick={handleGroupByCaseFiles}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow"
                title="Group related court documents and case files together by Case Name / ID"
              >
                <span>⚖️</span>
                <span>Group Case Files</span>
              </button>

              <button
                onClick={() => setIsCreatingFolder(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Foldara Haaraa</span>
              </button>

              <div className="relative group">
                <input
                  type="file"
                  multiple
                  onChange={handleBatchUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                />
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Batch Upload</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedFolder('all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFolder === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Hunda ({docs.length})</span>
            </button>

            <button
              onClick={() => setSelectedFolder('bookmarked')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFolder === 'bookmarked'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-950 text-amber-400 hover:bg-slate-800 border border-amber-500/30'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>★ Bookmarked ({docs.filter((d) => d.isBookmarked).length})</span>
            </button>

            {folders.map((folder) => {
              const count = docs.filter((d) => d.folderId === folder.id).length;
              const isHovered = hoveredFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  onDragOver={(e) => { e.preventDefault(); setHoveredFolderId(folder.id); }}
                  onDragLeave={() => setHoveredFolderId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const docId = e.dataTransfer.getData('text/plain');
                    if (docId) {
                      moveDocumentToFolder(docId, folder.id);
                      setDocs(prev => prev.map(d => d.id === docId ? { ...d, folderId: folder.id } : d));
                      setSyncToast(
                        currentLang === 'om'
                          ? `Sanadni foldara "${folder.name}" tti jijjiirameera!`
                          : `Moved document to folder "${folder.name}"!`
                      );
                      setTimeout(() => setSyncToast(null), 3000);
                    }
                    setHoveredFolderId(null);
                  }}
                  className={`relative group inline-flex items-center shrink-0 rounded-xl transition-all ${
                    isHovered ? 'bg-amber-500/25 ring-2 ring-amber-400 scale-105 shadow-xl' : ''
                  }`}
                >
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedFolder === folder.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span>{folder.name} ({count})</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteFolderConfirm(folder.id, folder.name, e)}
                    className="ml-1 p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Foldara kana haqi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSharingFolder(folder);
                    }}
                    className="ml-1 p-1 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                    title="Foldara kana qoodi (Share)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.common.searchPlaceholder}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
            />
          </div>
          {/* Tag Filter */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <Tag className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            {Array.from(new Set(docs.flatMap(d => d.tags))).map(tag => (
              <button
                key={tag}
                onClick={() => setSearch(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  search === tag
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {activeSubTab === 'documents' && (
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            {['all', 'contract', 'explain_law', 'translate', 'social_facebook', 'social_telegram'].map((task) => (
              <button
                key={task}
                onClick={() => setSelectedTask(task)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedTask === task
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {task === 'all'
                  ? 'Hunda / All'
                  : task === 'contract'
                  ? 'Waliigaltee / Contract'
                  : task === 'explain_law'
                  ? 'Seera Ibsi / Explain'
                  : task === 'translate'
                  ? 'Hiikkaa / Translate'
                  : 'Social'}
              </button>
            ))}
          </div>
        )}

        {activeSubTab === 'translations' && offlineTranslations.length > 0 && (
          <button
            onClick={handleClearTranslations}
            className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Clear Cached Translations
          </button>
        )}
      </div>

      {/* Quick Preview Modal / Side-Panel */}
      {previewDoc && (
        <DocumentQuickPreviewModal
          doc={previewDoc}
          currentLang={currentLang}
          onClose={() => setPreviewDoc(null)}
          onSavedAsNew={(newDoc) => {
            loadData();
            setPreviewDoc(null);
          }}
        />
      )}

      {/* Tag Modal */}
      {isTagModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Add Tag</h2>
            <input 
              value={currentTagInput} 
              onChange={(e) => setCurrentTagInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 mb-4"
              placeholder="Enter tag name..."
            />
            <div className="flex gap-2">
              <button onClick={() => setIsTagModalOpen(false)} className="flex-1 py-2 bg-slate-800 text-slate-200 rounded-xl font-bold">Cancel</button>
              <button onClick={handleBatchTag} className="flex-1 py-2 bg-amber-500 text-slate-950 rounded-xl font-bold">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Folder Modal */}
      {sharingFolder && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Share Folder: {sharingFolder.name}</h2>
            <input 
              value={sharedWithInput} 
              onChange={(e) => setSharedWithInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 mb-4"
              placeholder="Enter comma separated user IDs..."
            />
            <div className="flex gap-2">
              <button onClick={() => setSharingFolder(null)} className="flex-1 py-2 bg-slate-800 text-slate-200 rounded-xl font-bold">Cancel</button>
              <button onClick={handleShareFolder} className="flex-1 py-2 bg-amber-500 text-slate-950 rounded-xl font-bold">Share</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Upload Progress Modal */}
      {isBatchUploading && (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white">Batch Processing Documents</h2>
              <p className="text-slate-400 text-sm">
                {currentLang === 'om' ? batchProgress.statusOm : batchProgress.statusEn}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-indigo-300">
                <span>Progress</span>
                <span>{batchProgress.current} / {batchProgress.total}</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">AI Entity Extraction Active</p>
            </div>
          </div>
        </div>
      )}

      {/* Batch Action Toolbar */}
      {selectedDocIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3.5 bg-slate-950 border border-amber-500/30 rounded-2xl mb-4 text-xs shadow-lg animate-in fade-in">
          <span className="font-bold text-amber-300">{selectedDocIds.length} selected</span>
          <button onClick={handleBatchDelete} className="px-3 py-1.5 rounded-xl bg-red-900/30 text-red-300 hover:bg-red-900/50 font-bold transition-all cursor-pointer">Delete</button>
          <button onClick={() => setIsTagModalOpen(true)} className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold transition-all cursor-pointer">Add Tag</button>
          <button
            onClick={handleBatchAiRename}
            disabled={isBatchRenaming}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow disabled:opacity-50"
            title="AI Entity Extraction Batch Filename Standardization (CaseName_Date_DocType)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBatchRenaming ? (batchRenameProgress || 'Renaming...') : 'AI Batch Rename (Standardize)'}</span>
          </button>
        </div>
      )}

      {/* Grid of Documents or Translations */}
      {activeSubTab === 'documents' ? (
        filteredDocs.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 text-sm">
            <p>{t.common.emptyContent}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', doc.id);
                }}
                onClick={() => executeWithBiometricCheck(doc, 'view')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                  selectedDoc?.id === doc.id
                    ? 'bg-slate-900 border-amber-500 shadow-xl'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedDocIds.includes(doc.id)}
                    onChange={() => toggleSelectDoc(doc.id)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        {doc.taskType}
                      </span>
                      <select
                        value={doc.folderId || 'none'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleMoveFolder(doc.id, e.target.value, e as any)}
                        className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-amber-300 font-mono focus:border-amber-500 outline-none cursor-pointer"
                        title="Move to Folder"
                      >
                        <option value="none">📁 No Folder</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      {doc.isHighSecurity && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-bold">
                          <span>🔒</span>
                          <span>High-Security</span>
                        </span>
                      )}
                      {queuedEdits.some((q) => q.docId === doc.id) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-1 animate-pulse" title="Fooyya'iinsi offline eegaa jira">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Queue Offline</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.outputLanguages.map((l) => (
                        <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase font-mono">
                          {l}
                        </span>
                      ))}
                      {/* High Security Toggle */}
                      <button
                        onClick={(e) => handleToggleHighSecurity(doc.id, e)}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          doc.isHighSecurity ? 'text-rose-400 bg-rose-500/10 border border-rose-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={doc.isHighSecurity ? 'High-Security Biometric Protected' : 'Set as High-Security Document'}
                      >
                        <span className="text-xs">{doc.isHighSecurity ? '🔒' : '🔓'}</span>
                      </button>
                      {/* Bookmark Toggle Star */}
                      <button
                        onClick={(e) => handleToggleBookmark(doc.id, e)}
                        className="p-1 rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                        title={doc.isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                      >
                        <Star className={`w-4 h-4 ${doc.isBookmarked ? 'fill-amber-400 text-amber-400' : 'text-slate-500 hover:text-amber-300'}`} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-100 text-sm sm:text-base line-clamp-1">
                    {doc.caseName || doc.title}
                  </h3>
                  {doc.caseName && doc.caseName !== doc.title && (
                    <p className="text-[10px] text-slate-400 mt-0.5 italic">Original: {doc.title}</p>
                  )}
                  {doc.docType && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-indigo-400" />
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-tighter bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        {doc.docType}
                      </span>
                      {doc.extractedDate && (
                        <span className="text-[10px] text-slate-500 ml-1">
                          {new Date(doc.extractedDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Interactive Document Custom Tags & Labels */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {doc.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                        <span>{tag}</span>
                        <button
                          onClick={() => {
                            const newTags = doc.tags.filter(t => t !== tag);
                            updateDocument(doc.id, { tags: newTags });
                            setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, tags: newTags } : d));
                          }}
                          className="text-amber-400 hover:text-red-400 font-bold ml-0.5 cursor-pointer"
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    <div className="relative group/tag inline-block">
                      <button
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer border border-slate-700 shadow-xs"
                        title="Add Custom Label / Tag"
                      >
                        <span>+ Tag</span>
                      </button>
                      <div className="absolute left-0 bottom-full mb-1 hidden group-hover/tag:flex flex-col gap-1 p-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-20 min-w-[130px]">
                        {['Urgent', 'Appeal', 'Evidence', 'Confidential', 'Contract', 'Verdict'].map((preset) => (
                          !doc.tags.includes(preset) && (
                            <button
                              key={preset}
                              onClick={() => {
                                const newTags = [...doc.tags, preset];
                                updateDocument(doc.id, { tags: newTags });
                                setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, tags: newTags } : d));
                              }}
                              className="text-left text-[10px] text-slate-300 hover:text-amber-300 hover:bg-slate-900 px-2.5 py-1 rounded transition-colors"
                            >
                              + {preset}
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Case Progress Tracker */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                      <span className="text-slate-400">Case Progress Tracker</span>
                      <span className="text-amber-400">
                        {Math.round(((LITIGATION_STAGES.findIndex(s => s.id === (doc.litigationStage || 'filing')) + 1) / LITIGATION_STAGES.length) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                      {LITIGATION_STAGES.map((stage, idx) => {
                        const currentIndex = LITIGATION_STAGES.findIndex(s => s.id === (doc.litigationStage || 'filing'));
                        const isActive = idx <= currentIndex;
                        return (
                          <div 
                            key={stage.id}
                            className={`h-full flex-1 transition-all duration-500 ${isActive ? stage.color : 'bg-slate-900/50'}`}
                            title={stage[currentLang]}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {LITIGATION_STAGES.map((stage) => (
                        <button
                          key={stage.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateLitigation(doc.id, stage.id);
                          }}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap transition-all border ${
                            doc.litigationStage === stage.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                          }`}
                        >
                          {stage[currentLang]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-400 line-clamp-3 leading-relaxed border-l-2 border-slate-800 pl-3 italic">
                    {doc.content}
                  </p>

                  {/* Hearing Date & Auto-Reminder UI */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase">
                        <CalendarPlus className="w-3.5 h-3.5 text-amber-500" />
                        <span>Beellama Dhaddachaa</span>
                      </div>
                      {doc.hearingDate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportToCalendar(doc);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[9px] font-bold hover:bg-blue-500/20 transition-all cursor-pointer"
                        >
                          <Share2 className="w-2.5 h-2.5" />
                          <span>Calendar</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="datetime-local"
                        value={doc.hearingDate ? doc.hearingDate.slice(0, 16) : ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleUpdateHearingDate(doc.id, e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:border-amber-500 outline-none w-full font-mono"
                      />
                    </div>
                    {doc.hearingDate && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 justify-center">
                        <Bell className="w-2.5 h-2.5" />
                        <span>Notified 24h before hearing</span>
                      </div>
                    )}
                  </div>

                  {/* Legal Filing Deadline Calculator (Request 6) */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                      <Scale className="w-3.5 h-3.5" />
                      <span>Deadline Calculator (SDFHH)</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Service / Order Date</label>
                        <input 
                          type="date"
                          value={doc.serviceDate || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleCalculateDeadline(doc.id, e.target.value, doc.filingDeadline?.type || 'appeal')}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:border-amber-500 outline-none w-full font-mono"
                        />
                      </div>
                      
                      <div className="flex gap-1">
                        {(['appeal', 'defense', 'set_aside'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (doc.serviceDate) handleCalculateDeadline(doc.id, doc.serviceDate, type);
                            }}
                            className={`flex-1 py-1 rounded-md text-[8px] font-black uppercase transition-all border ${
                              doc.filingDeadline?.type === type 
                                ? 'bg-amber-500 text-slate-950 border-amber-500' 
                                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                            }`}
                          >
                            {type.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {doc.filingDeadline && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-1 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-rose-400 uppercase">{doc.filingDeadline.label[currentLang]}</span>
                          <span className="text-[10px] font-mono font-bold text-white bg-rose-500 px-1.5 rounded">
                            {new Date(doc.filingDeadline.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[8px] text-slate-500 italic">
                          {Math.ceil((new Date(doc.filingDeadline.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleQuickShare(doc, e)}
                      className="p-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-800 text-sky-300 transition-colors cursor-pointer"
                      title="Quick Share (Secure Read-Only Link)"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSmartSummaryDoc(doc);
                      }}
                      className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors cursor-pointer"
                      title="Cuunfaa Seeraa (Smart Executive Summary)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeWithBiometricCheck(doc, 'preview');
                      }}
                      className="px-2 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      title={currentLang === 'om' ? 'Dur-argii & Expand (Quick Preview & Annotate)' : currentLang === 'am' ? 'ፈጣን ቅድመ-ዕይታ እና ማስታወሻ' : 'Expand / Quick Preview & Annotate'}
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-extrabold uppercase tracking-tighter">Expand</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIntegrityModalDoc(doc);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 transition-colors cursor-pointer"
                      title="Decision Integrity Checker (Cross-reference citations)"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeWithBiometricCheck(doc, 'edit');
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Fooyyessi / Edit Document (Offline Queue Support)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeWithBiometricCheck(doc, 'version');
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-colors relative cursor-pointer"
                      title="Tarree Seenaa Fooyya'iinsaa (Version History & Compare)"
                    >
                      <History className="w-3.5 h-3.5" />
                      {doc.versions && doc.versions.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400"></span>
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeWithBiometricCheck(doc, 'word');
                      }}
                      className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-800 text-blue-300 transition-colors cursor-pointer"
                      title="Export to Word (.docx)"
                    >
                      <span>📄</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeWithBiometricCheck(doc, 'pdf');
                      }}
                      className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 transition-colors cursor-pointer"
                      title="Download as PDF"
                    >
                      <span>📥</span>
                    </button>

                    <button
                      onClick={(e) => handleCopy(doc.content, doc.id, e)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={t.actions.copy}
                    >
                      {copiedId === doc.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={(e) => handleExportTxt(doc.title, doc.content, e)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={t.actions.exportTxt}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDelete(doc.id, e)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 text-red-400"
                      title={t.actions.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Folder Mover & Assignment */}
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Folder className="w-3 h-3 text-amber-400" />
                    <select
                      value={doc.folderId || 'none'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleMoveFolder(doc.id, e.target.value, e)}
                      className="bg-slate-950 text-[10px] text-slate-300 border border-slate-800 rounded px-2 py-0.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="none">📁 Foldara Hin Qabu</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {doc.isBookmarked && (
                    <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>Bookmarked</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredTranslations.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 text-sm">
            <p>Hiikkaawwan offline kuufaman hin jiran. / No cached offline translations found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTranslations.map((tr) => (
              <div
                key={tr.id}
                onClick={() => setSelectedTranslation(tr)}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {tr.sourceLang.toUpperCase()} → {tr.targetLangs[0]?.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(tr.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 text-sm line-clamp-1">
                    {tr.title || 'Hiikkaa Seeraa (Legal Translation)'}
                  </h3>

                  <div className="mt-2 text-xs text-slate-400 space-y-1">
                    <p className="line-clamp-2"><strong className="text-slate-300">Source:</strong> {tr.sourceText}</p>
                    <p className="line-clamp-2"><strong className="text-emerald-400">Result:</strong> {tr.translatedText}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] text-slate-500">
                    {new Date(tr.timestamp).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleCopy(tr.translatedText, tr.id, e)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={t.actions.copy}
                    >
                      {copiedId === tr.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => handleExportTxt('Hiikkaa_Seeraa', tr.translatedText, e)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={t.actions.exportTxt}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Expanded Document Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-100 text-base">{selectedDoc.title}</h3>
                  <button
                    onClick={(e) => {
                      handleToggleBookmark(selectedDoc.id, e);
                      setSelectedDoc((prev) =>
                        prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null
                      );
                    }}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedDoc.isBookmarked
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-400'
                    }`}
                    title={selectedDoc.isBookmarked ? 'Bookmarked!' : 'Bookmark Document'}
                  >
                    <Star className={`w-3.5 h-3.5 ${selectedDoc.isBookmarked ? 'fill-slate-950 text-slate-950' : 'text-slate-400'}`} />
                  </button>

                  <button
                    onClick={(e) => handleToggleHighSecurity(selectedDoc.id, e)}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                      selectedDoc.isHighSecurity
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-rose-400'
                    }`}
                    title={selectedDoc.isHighSecurity ? 'High-Security Biometric Protected' : 'Set as High-Security Document'}
                  >
                    <span>{selectedDoc.isHighSecurity ? '🔒' : '🔓'}</span>
                    <span className="text-[11px] font-mono">
                      {selectedDoc.isHighSecurity ? 'High-Security' : 'Standard'}
                    </span>
                  </button>
                </div>
                <span className="text-xs text-slate-400">{new Date(selectedDoc.createdAt).toLocaleString()}</span>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cufi / ዝጋ / Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] text-sm text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-amber-500/20">
              <LegalCitationHighlighter text={selectedDoc.content} currentLang={currentLang} />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    handleToggleBookmark(selectedDoc.id, e);
                    setSelectedDoc((prev) =>
                      prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null
                    );
                  }}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
                    selectedDoc.isBookmarked
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/40'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${selectedDoc.isBookmarked ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
                  <span>{selectedDoc.isBookmarked ? '★ Bookmarked' : 'Add Bookmark'}</span>
                </button>

                <button
                  onClick={() => {
                    setEditingDoc(selectedDoc);
                    setSelectedDoc(null);
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fooyyessi / Edit</span>
                </button>

                <button
                  onClick={() => {
                    setSmartSummaryDoc(selectedDoc);
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Generate concise multi-language executive summary"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Smart Summary</span>
                </button>

                <button
                  onClick={() => {
                    setPreviewDoc(selectedDoc);
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-300 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Interactive PDF-style canvas drawing and text highlighting annotations"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{currentLang === 'om' ? 'Dur-argii & Mallattoo' : currentLang === 'am' ? 'ቅድመ-ዕይታ & ማስታወሻ' : 'Preview & Annotate'}</span>
                </button>

                <button
                  onClick={() => {
                    setVersionModalDoc(selectedDoc);
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="View revision history and restore previous versions"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seenaa (Versions)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleQuickShare(selectedDoc, e)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-md cursor-pointer"
                  title="Generate secure read-only share link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Quick Share</span>
                </button>
                <button
                  onClick={() => {
                    setExportModalMode('word');
                    setPdfModalDoc(selectedDoc);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span>📄</span>
                  <span>Word (.docx) Baasi</span>
                </button>
                <button
                  onClick={() => {
                    setExportModalMode('pdf');
                    setPdfModalDoc(selectedDoc);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span>📥</span>
                  <span>PDF (.pdf) Buusi</span>
                </button>
                <button
                  onClick={() => handleDirectExport(selectedDoc, 'pdf')}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md cursor-pointer font-extrabold"
                  title="Download structured case summary PDF including case notes, timelines, and legal content"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-950" />
                  <span>Download Case Summary</span>
                </button>
                <button
                  onClick={(e) => handleCopy(selectedDoc.content, selectedDoc.id, e)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === selectedDoc.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === selectedDoc.id ? t.actions.copied : t.actions.copy}</span>
                </button>
                <button
                  onClick={(e) => handleExportTxt(selectedDoc.title, selectedDoc.content, e)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.actions.exportTxt}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Translation Modal */}
      {selectedTranslation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div>
                <h3 className="font-bold text-slate-100 text-base">{selectedTranslation.title || 'Offline Cached Translation'}</h3>
                <span className="text-xs text-slate-400">{new Date(selectedTranslation.timestamp).toLocaleString()}</span>
              </div>
              <button
                onClick={() => setSelectedTranslation(null)}
                className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cufi / ዝጋ / Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              <div>
                <strong className="text-xs uppercase font-mono text-slate-400 block mb-1">Source Text ({selectedTranslation.sourceLang.toUpperCase()}):</strong>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">{selectedTranslation.sourceText}</div>
              </div>
              <div>
                <strong className="text-xs uppercase font-mono text-emerald-400 block mb-1">Translated Text ({selectedTranslation.targetLangs[0]?.toUpperCase()}):</strong>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-100">{selectedTranslation.translatedText}</div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button
                onClick={(e) => handleCopy(selectedTranslation.translatedText, selectedTranslation.id, e)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === selectedTranslation.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Translation</span>
              </button>
              <button
                onClick={(e) => handleExportTxt('Hiikkaa_Seeraa', selectedTranslation.translatedText, e)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export TXT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      {pdfModalDoc && (
        <PdfExportModal
          isOpen={!!pdfModalDoc}
          onClose={() => setPdfModalDoc(null)}
          currentLang={currentLang}
          title={pdfModalDoc.title}
          taskType={pdfModalDoc.taskType}
          content={pdfModalDoc.content}
          separatedVersions={pdfModalDoc.separatedVersions}
          outputLanguages={pdfModalDoc.outputLanguages}
          initialMode={exportModalMode}
        />
      )}

      {/* Create New Folder Modal */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">Foldara Haaraa Uumi / Create Folder</h3>
              </div>
              <button
                onClick={() => setIsCreatingFolder(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Maqaa Foldaraa / Folder Name:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="fkn: Waliigaltee Manaa, Dhaddacha Ijoo, Iyyannoo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Halluu / Color Tag:
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'amber', label: 'Bilaachaa / Amber', class: 'bg-amber-500' },
                    { id: 'blue', label: 'Cuquliisa / Blue', class: 'bg-blue-500' },
                    { id: 'emerald', label: 'Magariisa / Green', class: 'bg-emerald-500' },
                    { id: 'purple', label: 'Waangoo / Purple', class: 'bg-purple-500' },
                    { id: 'rose', label: 'Diimaa / Rose', class: 'bg-rose-500' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewFolderColor(c.id)}
                      className={`w-7 h-7 rounded-full ${c.class} flex items-center justify-center transition-all cursor-pointer ${
                        newFolderColor === c.id ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {newFolderColor === c.id && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  Dhiisi / Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer"
                >
                  Foldara Uumi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Document Modal with Offline Background Sync Support */}
      {editingDoc && (
        <EditDocumentModal
          doc={editingDoc}
          currentLang={currentLang}
          onClose={() => setEditingDoc(null)}
          onSaved={(updated) => {
            setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          }}
        />
      )}

      {/* Version History & Side-by-Side Comparison Modal */}
      {versionModalDoc && (
        <DocumentVersionHistoryModal
          doc={versionModalDoc}
          currentLang={currentLang}
          onClose={() => setVersionModalDoc(null)}
          onRestored={(updated) => {
            setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            setVersionModalDoc(null);
          }}
        />
      )}

      {/* High-Security Biometric Verification Modal */}
      {pendingProtectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🔐
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                🔒 High-Security Legal Document
              </span>
              <h3 className="font-bold text-lg text-slate-100">
                {currentLang === 'om'
                  ? 'Mirkaneessa Asxaa Qubaa / FaceID'
                  : currentLang === 'am'
                  ? 'የጣት አሻራ / FaceID ማረጋገጫ'
                  : 'Biometric WebAuthn Unlock Required'}
              </h3>
              <p className="text-xs text-amber-300 font-semibold line-clamp-1">
                "{pendingProtectedDoc.title}"
              </p>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                {currentLang === 'om'
                  ? 'Sanadni kun qabiyyee seeraa iccitii ol\'aanaa qaba. Banuu fi dubbisuuf sensorii asxaa qubaa (Touch ID) yookiin Face ID fayyadamaa.'
                  : currentLang === 'am'
                  ? 'ይህ ሰነድ ከፍተኛ ሚስጥራዊ የሕግ መረጃ የያዘ ነው። ሰነዱን ለመክፈት እባክዎ የጣት አሻራዎን ወይም Face ID ይጠቀሙ።'
                  : 'This legal document contains confidential contents. Please authenticate using your device Touch ID, Face ID, or Windows Hello sensor.'}
              </p>
            </div>

            {biometricPromptError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                ⚠️ {biometricPromptError}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isBiometricVerifying}
                onClick={handleVerifyBiometricsAndProceed}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow disabled:opacity-60"
              >
                <span>{isBiometricVerifying ? '⏳' : '👆'}</span>
                <span>
                  {isBiometricVerifying
                    ? (currentLang === 'om' ? 'Mirkaneessaa jira...' : currentLang === 'am' ? 'በማረጋገጥ ላይ...' : 'Authenticating WebAuthn...')
                    : (currentLang === 'om' ? 'Asxaa Qubaa / FaceID\'n Bani' : currentLang === 'am' ? 'በጣት አሻራ / FaceID ክፈት' : 'Unlock via Biometrics (FaceID/Fingerprint)')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingProtectedDoc(null);
                  setPendingProtectedAction(null);
                  setBiometricPromptError(null);
                }}
                className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {currentLang === 'om' ? 'Dhiisi / Cufi' : currentLang === 'am' ? 'ሰርዝ' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {integrityModalDoc && (
        <DecisionIntegrityModal
          documentTitle={integrityModalDoc.title}
          documentContent={integrityModalDoc.content}
          currentLang={currentLang}
          onClose={() => setIntegrityModalDoc(null)}
        />
      )}

      {smartSummaryDoc && (
        <DocumentSmartSummaryModal
          doc={smartSummaryDoc}
          currentLang={currentLang}
          onClose={() => setSmartSummaryDoc(null)}
        />
      )}

      {previewDoc && (
        <DocumentQuickPreviewModal
          doc={previewDoc}
          currentLang={currentLang}
          onClose={() => setPreviewDoc(null)}
          onSavedAsNew={(newDoc) => {
            loadData();
            setSyncToast(
              currentLang === 'om'
                ? `Sanadni bifa haarawaan qophaa'e "${newDoc.title}" kuusameera!`
                : currentLang === 'am'
                ? `አዲሱ ማስታወሻ የተያዘበት ሰነድ "${newDoc.title}" ተቀምጧል!`
                : `Annotated document "${newDoc.title}" saved successfully!`
            );
            setTimeout(() => setSyncToast(null), 4000);
          }}
        />
      )}

      {isTelegramModalOpen && (
        <TelegramImportModal
          language={currentLang}
          onClose={() => setIsTelegramModalOpen(false)}
          onImportComplete={(count) => {
            setIsTelegramModalOpen(false);
            loadData();
            setSyncToast(
              currentLang === 'om'
                ? `Galmeewwan Telegram ${count}+ milkaa'inaan fe'amaniiru!`
                : `Successfully imported ${count}+ Telegram archive documents!`
            );
            setTimeout(() => setSyncToast(null), 4000);
          }}
        />
      )}
      {/* Floating Discussion Button */}
      <button
        type="button"
        onClick={() => setIsDiscussionOpen(true)}
        className="fixed right-6 bottom-24 p-3 bg-amber-500 text-slate-950 rounded-full shadow-2xl hover:scale-105 transition-all z-40"
        title="Marii (Discussion)"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Discussion Overlay */}
      {isDiscussionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-end">
                <button onClick={() => setIsDiscussionOpen(false)} className="text-slate-400 hover:text-slate-200 text-xl font-bold p-2">✕</button>
            </div>
            <DiscussionPanel targetId="my-content-general" />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

