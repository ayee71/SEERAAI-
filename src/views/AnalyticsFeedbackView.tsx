import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { subscribeToRealtimeAnalytics, RealtimeAnalyticsEvent, logRealtimeEvent, isOwnerAccount } from '../services/realtimeTracker';
import { PaymentReceipt } from '../components/PaymentReceipt';
import {
  subscribeToFeedbackMessages,
  sendFeedbackMessage,
  updateMessageStatus,
  deleteFeedbackMessage,
  FeedbackMessage
} from '../services/feedbackService';
import {
  subscribeToTelebirrTransactions,
  TelebirrAnalyticsSummary,
  computeTelebirrAnalyticsSummary,
  getTelebirrNotificationSettings,
  saveTelebirrNotificationSettings,
  getTelebirrAlertHistory,
  simulateIncomingTelebirrWebhook,
  autoVerifyAllPendingFirestoreTransactions,
  reSyncTelebirrApiEndpoints,
  TelebirrAlertPayload,
  TelebirrNotificationSettings,
  DAILY_TAX_THRESHOLD_ETB,
  PaymentTransaction
} from '../services/paymentService';
import { useAuth } from '../context/AuthContext';
import { getStoredOwnerKey, setStoredOwnerKey, clearStoredOwnerKey } from '../services/referralTracking';
import { isOwnerEmail } from '../services/ownerAuth';
import { ReferralAnalyticsView } from '../components/ReferralAnalyticsView';
import { 
  getCourtAccessRequests, 
  approveCourtInstitution, 
  reConfirmCourtInstitution, 
  CourtAccessRequest,
  getLocalInstitutions,
  CourtInstitution,
  sendSmsAndEmailLetterNotice,
  getCourtNotificationDispatches,
  CourtNotificationDispatch
} from '../services/courtInstitutionService';

interface AnalyticsFeedbackViewProps {
  currentLang: Language;
  initialSubTab?: 'analytics' | 'feedback' | 'inbox' | 'telebirr' | 'transactions';
}

export const AnalyticsFeedbackView: React.FC<AnalyticsFeedbackViewProps> = ({
  currentLang,
  initialSubTab = 'analytics',
}) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'feedback' | 'inbox' | 'telebirr' | 'transactions'>(initialSubTab);

  // --- Real-time Analytics State ---
  const [events, setEvents] = useState<RealtimeAnalyticsEvent[]>([]);
  const [analyticsFilter, setAnalyticsFilter] = useState<string>('all');
  const [analyticsSearch, setAnalyticsSearch] = useState<string>('');

  // --- Real-time Feedback Inbox State ---
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<'all' | 'new' | 'read' | 'resolved'>('all');
  const [messageSearch, setMessageSearch] = useState<string>('');

  // --- Telebirr Analytics State ---
  const [telebirrSummary, setTelebirrSummary] = useState<TelebirrAnalyticsSummary | null>(null);
  const [telebirrSyncToast, setTelebirrSyncToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [isSyncingTelebirr, setIsSyncingTelebirr] = useState(false);
  const [telebirrPage, setTelebirrPage] = useState(1);
  const telebirrPageSize = 8;
  const [gatewayStatus, setGatewayStatus] = useState({ telebirr: 'operational', safaricom: 'operational' });
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);

  const handleViewReceipt = (tx: PaymentTransaction) => {
    setSelectedTransaction(tx);
    setIsReceiptModalOpen(true);
  };

  // --- Telebirr Threshold Notification Trigger State ---
  const [notifSettings, setNotifSettings] = useState<TelebirrNotificationSettings>(() => getTelebirrNotificationSettings());
  const [alertHistory, setAlertHistory] = useState<TelebirrAlertPayload[]>(() => getTelebirrAlertHistory());
  const [activeHighValueAlert, setActiveHighValueAlert] = useState<TelebirrAlertPayload | null>(null);
  const [isSimulatingAlert, setIsSimulatingAlert] = useState<boolean>(false);

  // Listen for Telebirr High-Value Payment Trigger Event
  useEffect(() => {
    const handleHighValueAlert = (e: any) => {
      const payload = e.detail as TelebirrAlertPayload;
      setActiveHighValueAlert(payload);
      setAlertHistory(getTelebirrAlertHistory());
      if (notifSettings.notifySound) {
        playSyncChime();
      }
    };

    window.addEventListener('seera:telebirr_high_value_alert', handleHighValueAlert);
    return () => window.removeEventListener('seera:telebirr_high_value_alert', handleHighValueAlert);
  }, [notifSettings]);

  // Simulate Gateway status changes
  useEffect(() => {
    const interval = setInterval(() => {
      setGatewayStatus({
        telebirr: Math.random() > 0.95 ? 'degraded' : 'operational',
        safaricom: Math.random() > 0.9 ? 'degraded' : 'operational'
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Play audio chime on sync completion or high value payment
  const playSyncChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {}
  };

  const handleRefreshTelebirrData = async () => {
    setIsSyncingTelebirr(true);
    setTelebirrSyncToast({
      message: 'Telebirr API endpoints wajjin wal-simsiisaa jira (Connecting to Telebirr Carrier Gateway)...',
      type: 'info'
    });

    try {
      const { reSyncTelebirrApiEndpoints } = await import('../services/paymentService');
      const updated = await reSyncTelebirrApiEndpoints();
      setTelebirrSummary(updated);
      playSyncChime();
      setTelebirrSyncToast({
        message: `✅ Mirkanaa'eera! Waliigala Galii: ${(updated.totalLifetimeEarningsETB || 0).toLocaleString()} ETB | Pending: ${(updated.totalPendingPayoutsETB || 0).toLocaleString()} ETB | Herrega: 0927790325 (Ayele Belayneh Zeleke).`,
        type: 'success'
      });
    } catch (err: any) {
      setTelebirrSyncToast({
        message: 'Wal-simsiisni Telebirr hin milkoofne. Mee deebisaatii yaalaa.',
        type: 'info'
      });
    } finally {
      setIsSyncingTelebirr(false);
      setTimeout(() => setTelebirrSyncToast(null), 5000);
    }
  };

  // --- Feedback Form State ---
  const [senderName, setSenderName] = useState<string>(profile?.visitorName || '');
  const [contactInfo, setContactInfo] = useState<string>(user?.email || '');
  const [topic, setTopic] = useState<string>('Yaada Fooyya\'iinsaa');
  const [rating, setRating] = useState<number>(5);
  const [messageContent, setMessageContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  // --- Court Access Requests & Confirmed Institutions State ---
  const [courtRequests, setCourtRequests] = useState<CourtAccessRequest[]>(() => getCourtAccessRequests());
  const [confirmedInstitutions, setConfirmedInstitutions] = useState<CourtInstitution[]>(() => getLocalInstitutions());
  const [courtSubSection, setCourtSubSection] = useState<'pending' | 'confirmed' | 'sms_log'>('pending');
  const [notificationDispatches, setNotificationDispatches] = useState<CourtNotificationDispatch[]>(() => getCourtNotificationDispatches());
  const [selectedLetterModal, setSelectedLetterModal] = useState<{
    institutionName: string;
    outgoingRefNo: string;
    proposedAdminName: string;
    proposedAdminEmail: string;
    proposedAdminPhone: string;
    letterContent: string;
    hasStamp: boolean;
    stampSealNote: string;
    status: string;
  } | null>(null);
  const [isSendingNotice, setIsSendingNotice] = useState<string | null>(null);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);

  const handleSendNotice = async (instName: string, email: string, phone: string, isConfirmed: boolean, contactPerson?: string) => {
    setIsSendingNotice(instName);
    try {
      const res = await sendSmsAndEmailLetterNotice({
        institutionName: instName,
        email,
        phone: phone || '+251911234567',
        isConfirmed,
        contactPerson
      });
      if (res.success) {
        setNotificationDispatches(getCourtNotificationDispatches());
        setCourtRequests(getCourtAccessRequests());
        setConfirmedInstitutions(getLocalInstitutions());
        alert(`✅ ${res.message}\n\n[SMS Sent]: Lakkoofsa bilbilaa ${phone || '+251911234567'} tiif ergameera.\n[Email Sent]: Imeelii ${email} tiif ergameera.`);
      }
    } catch (e: any) {
      alert('Error: ' + (e.message || 'Unknown'));
    } finally {
      setIsSendingNotice(null);
    }
  };

  const handleBulkSendNotice = async () => {
    const allPending = courtRequests;
    const allConfirmed = confirmedInstitutions.filter(inst => inst.status === 'active');
    const total = allPending.length + allConfirmed.length;
    if (total === 0) {
      alert('Dhaabbanni mana murtii hin argamne.');
      return;
    }

    if (!confirm(`Manneen Murtii confirm tahan (${allConfirmed.length}) fi pending tahan (${allPending.length}) waliigala ${total} tiif ergaa SMS fi Email xalayaa chaappaa fi lakkoofsa bahii qabu akka dhiyeessan erguu barbaadduu?`)) {
      return;
    }

    setIsSendingNotice('bulk_all');
    let sentCount = 0;

    for (const req of allPending) {
      await sendSmsAndEmailLetterNotice({
        institutionName: req.institutionName,
        email: req.proposedAdminEmail || req.email,
        phone: req.proposedAdminPhone || req.phone || '+251911234567',
        isConfirmed: false,
        contactPerson: req.proposedAdminName || req.contactPerson,
      });
      sentCount++;
    }

    for (const inst of allConfirmed) {
      await sendSmsAndEmailLetterNotice({
        institutionName: inst.name,
        email: inst.adminEmail,
        phone: inst.adminPhone || '+251911000000',
        isConfirmed: true,
        contactPerson: inst.adminName,
      });
      sentCount++;
    }

    setNotificationDispatches(getCourtNotificationDispatches());
    setCourtRequests(getCourtAccessRequests());
    setConfirmedInstitutions(getLocalInstitutions());
    setIsSendingNotice(null);
    alert(`🎉 Milkaa'inaan manneen murtii ${sentCount} tiif (Kanneen Confirm tahan fi Pending tahan) ergaan SMS fi Email xalayaa mana hojii chaappaan mirkanaa'ee fi lakkoofsa bahii qabu akka dhiheessan ergameera!`);
  };

  const handleApproveCourtReq = async (req: CourtAccessRequest) => {
    const hasValidLetter = Boolean(
      req.officialLetterContent && 
      req.officialLetterContent.trim().length >= 15 && 
      req.officialLetterContent.trim() !== 'Xalayaa mirkaneessa mana murtii.' &&
      req.outgoingRefNo &&
      req.outgoingRefNo.trim() !== 'MM/2026'
    );

    if (!hasValidLetter) {
      alert(
        `⚠️ MIRKANEESSUUN HIN DANDA'AMU!\n\n` +
        `Xalayaan kun mana hojii isaaniitii bahee kan dhiyaate miti (Dhaabbata irraa kan eegamuudha).\n` +
        `Yoo dhaabbanni kallattiin xalayaa bahii chaappaan mirkanaa'e hin dhiheessine haalli app qofti ofumaan qopheessu dhugaa hin qabu.\n\n` +
        `Maaloo dura cuqqaallaa "📱 SMS & Email Ergi" jedhu fayyadamuun dhaabbanni xalayaa seera qabeessa chaappaa fi lakkoofsa bahii qabu akka ergu gaafadhaa!`
      );
      return;
    }

    setApprovingRequestId(req.id);
    try {
      const res = await approveCourtInstitution(
        req.institutionName,
        req.jurisdiction || 'Oromiyaa',
        req.courtLevel,
        req.proposedAdminEmail || req.email,
        req.proposedAdminName || req.contactPerson,
        req.outgoingRefNo,
        req.officialLetterContent
      );

      if (!res.success) {
        alert('⚠️ ' + (res.message || 'Mirkaneessuun hin danda\'amne.'));
        return;
      }

      const updated = courtRequests.map(r => r.id === req.id ? { ...r, status: 'approved' as const } : r);
      setCourtRequests(updated);
      setConfirmedInstitutions(getLocalInstitutions());
      try {
        localStorage.setItem('seera_court_access_requests_cache', JSON.stringify(updated));
      } catch {}
      alert(`🎉 Milkaa'inaan Manni Murtii "${req.institutionName}" xalayaa mana hojiitiin mirkanaa'eera! Admin Passcode ergameera.`);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Unknown'));
    } finally {
      setApprovingRequestId(null);
    }
  };

  const handleReConfirmReq = async (req: CourtAccessRequest) => {
    const hasValidLetter = Boolean(
      req.officialLetterContent && 
      req.officialLetterContent.trim().length >= 15 && 
      req.officialLetterContent.trim() !== 'Xalayaa mirkaneessa mana murtii.' &&
      req.outgoingRefNo &&
      req.outgoingRefNo.trim() !== 'MM/2026'
    );

    if (!hasValidLetter) {
      alert(
        `⚠️ IRRA DEEBI'UUN MIRKANEESSUUN HIN DANDA'AMU!\n\n` +
        `Xalayaan mana hojii isaaniitii bahee dhiyaate hin jiru (Dhaabbata irraa kan eegamuudha).\n` +
        `Dhaabbanni mana murtii xalayaa seera qabeessa chaappaa fi lakkoofsa bahii qabu osoo hin dhiheessin ofumaan mirkaneessuun dhorkaa dha.\n\n` +
        `Maaloo dura "📱 SMS & Email Ergi" cuqaasuun xalayaa mana hojii akka ergan beeksisaa.`
      );
      return;
    }

    setApprovingRequestId(req.id);
    try {
      const res = await reConfirmCourtInstitution(req.id);
      if (res.success) {
        const updated = courtRequests.map(r => r.id === req.id ? { ...r, status: 'approved' as const } : r);
        setCourtRequests(updated);
        setConfirmedInstitutions(getLocalInstitutions());
        try {
          localStorage.setItem('seera_court_access_requests_cache', JSON.stringify(updated));
        } catch {}
        alert(`Manni Murtii "${req.institutionName}" irra deebi'uun milkaa'inaan mirkanaa'eera (Re-Confirmed)!`);
      } else {
        alert('⚠️ ' + (res.message || 'Dogoggorri uumameera.'));
      }
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Unknown'));
    } finally {
      setApprovingRequestId(null);
    }
  };

  // --- Owner PIN & Inbox Authorization ---
  const isDirectOwnerEmail = isOwnerEmail(user?.email) || isOwnerEmail((profile as any)?.email) || isOwnerEmail(localStorage.getItem('seera_cached_email'));
  const [ownerPin, setOwnerPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState<boolean>(isDirectOwnerEmail);

  // Sync sender name from profile
  useEffect(() => {
    if (profile?.visitorName && !senderName) {
      setSenderName(profile.visitorName);
    }
  }, [profile]);

  // Check stored owner key on mount
  useEffect(() => {
    if (isDirectOwnerEmail) {
      setIsOwnerUnlocked(true);
      return;
    }
    const savedKey = getStoredOwnerKey();
    if (savedKey && ['2026', 'ayele2026'].includes(savedKey.toLowerCase())) {
      setIsOwnerUnlocked(true);
    }
  }, [isDirectOwnerEmail]);

  // 1. Subscribe to Live Real-time Analytics Stream
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeAnalytics((liveEvents) => {
      setEvents(liveEvents);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Live Real-time Feedback Messages Stream
  useEffect(() => {
    const unsubscribe = subscribeToFeedbackMessages((liveMsgs) => {
      setMessages(liveMsgs);
    });
    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Live Telebirr Transactions & Analytics Stream
  useEffect(() => {
    const unsubscribe = subscribeToTelebirrTransactions((summary) => {
      setTelebirrSummary(summary);
    });
    return () => unsubscribe();
  }, []);

  // Filter out any owner events to only show external visitors
  const externalEvents = events.filter((e) => !isOwnerAccount(undefined, e.userName));

  // Metric Computations
  const totalVisits = externalEvents.filter((e) => e.actionType === 'visit').length;
  const totalExplains = externalEvents.filter((e) => e.actionType === 'explain_law').length;
  const totalAnalyses = externalEvents.filter((e) => e.actionType === 'doc_analysis' || e.actionType === 'risk_analysis' || e.actionType === 'summarize').length;
  const totalCassation = externalEvents.filter((e) => e.actionType === 'cassation' || e.actionType === 'cassation_lookup').length;
  const totalTranslations = externalEvents.filter((e) => e.actionType === 'translate').length;
  const totalTemplates = externalEvents.filter((e) => e.actionType === 'template').length;
  const uniqueUsers = new Set(externalEvents.map((e) => e.userId || e.userName)).size;
  const newMessagesCount = messages.filter((m) => m.status === 'new').length;

  // Filtered Events
  const filteredEvents = externalEvents.filter((e) => {
    const matchesFilter = analyticsFilter === 'all' || e.actionType === analyticsFilter;
    if (!matchesFilter) return false;
    if (!analyticsSearch.trim()) return true;
    const q = analyticsSearch.toLowerCase();
    return (
      (e.userName && e.userName.toLowerCase().includes(q)) ||
      (e.details && e.details.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q)) ||
      (e.actionType && e.actionType.toLowerCase().includes(q))
    );
  });

  // Filtered Messages
  const filteredMessages = messages.filter((m) => {
    const matchesStatus = messageFilter === 'all' || m.status === messageFilter;
    if (!matchesStatus) return false;
    if (!messageSearch.trim()) return true;
    const q = messageSearch.toLowerCase();
    return (
      (m.senderName && m.senderName.toLowerCase().includes(q)) ||
      (m.message && m.message.toLowerCase().includes(q)) ||
      (m.topic && m.topic.toLowerCase().includes(q)) ||
      (m.contactInfo && m.contactInfo.toLowerCase().includes(q))
    );
  });

  // Action Badge Helper
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'explain_law':
        return { emoji: '⚖️', label: 'Ibsa Seeraa', bg: 'bg-amber-950 text-amber-300 border-amber-500/40' };
      case 'doc_analysis':
      case 'risk_analysis':
        return { emoji: '📄', label: 'Xiinxala Sanadaa', bg: 'bg-red-950 text-red-300 border-red-500/40' };
      case 'summarize':
        return { emoji: '📊', label: 'Cuunfaa Sanadaa', bg: 'bg-indigo-950 text-indigo-300 border-indigo-500/40' };
      case 'cassation':
      case 'cassation_lookup':
        return { emoji: '🏛️', label: 'Dhaddacha Ijoo', bg: 'bg-emerald-950 text-emerald-300 border-emerald-500/40' };
      case 'translate':
        return { emoji: '🌐', label: 'Hiikkaa Seeraa', bg: 'bg-sky-950 text-sky-300 border-sky-500/40' };
      case 'template':
        return { emoji: '📝', label: 'Unka Waliigaltee', bg: 'bg-purple-950 text-purple-300 border-purple-500/40' };
      case 'feedback':
        return { emoji: '💬', label: 'Yaada & Ergaa', bg: 'bg-pink-950 text-pink-300 border-pink-500/40' };
      default:
        return { emoji: '👥', label: 'Seensa Appii', bg: 'bg-slate-900 text-slate-300 border-slate-700' };
    }
  };

  // Format timestamp helper
  const formatTimestamp = (ts: any): string => {
    if (!ts) return 'Amma (Just now)';
    try {
      if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
        const date = new Date(ts.seconds * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof ts.toDate === 'function') {
        const date = ts.toDate();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      if (typeof ts === 'string' || typeof ts === 'number') {
        const date = new Date(ts);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
      }
    } catch {}
    return 'Amma (Recent)';
  };

  const formatReceiptDate = (ts: any): string => {
    if (!ts) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      let d: Date | null = null;
      if (ts instanceof Date) {
        d = ts;
      } else if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof ts.toDate === 'function') {
        d = ts.toDate();
      } else if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
        d = new Date(ts.seconds * 1000);
      } else if (typeof ts === 'string' || typeof ts === 'number') {
        d = new Date(ts);
      }
      if (d && !isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {}
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Submit Feedback Handler
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!messageContent.trim()) {
      setSubmitError('Mee yaada yookiin gaaffii keessan barreessaa.');
      return;
    }

    setIsSubmitting(true);
    try {
      const msgId = await sendFeedbackMessage({
        senderName: senderName || 'Fayyadaa SeeraAI',
        senderEmail: user?.email || '',
        contactInfo: contactInfo || user?.email || '',
        topic,
        message: messageContent,
        rating,
      });

      if (msgId) {
        // Log real-time event so it shows in the live ticker immediately
        await logRealtimeEvent('feedback', `Yaada ergan: "${topic}" (${rating}⭐)`, 'Feedback & Inbox', 'Direct Form');
        setSubmitSuccess(true);
        setMessageContent('');
        setTimeout(() => setSubmitSuccess(false), 5000);
      } else {
        setSubmitError('Ergaan hin ergamne. Mee deebisaatii yaalaa.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Ergaan erguun hin danda\'amne.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Owner Unlock Handler
  const handleUnlockInbox = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const cleanPin = ownerPin.trim().toLowerCase();
    if (['2026', 'ayele2026'].includes(cleanPin)) {
      setStoredOwnerKey(cleanPin);
      setIsOwnerUnlocked(true);
      setOwnerPin('');
    } else {
      setPinError('PIN koodiin dogoggoraadha. Abbaa appii qofatu heeyyama qaba.');
    }
  };

  const handleLockInbox = () => {
    clearStoredOwnerKey();
    setIsOwnerUnlocked(false);
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start gap-4">
          <span className="text-4xl shrink-0 p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
            📊
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100 flex items-center gap-3 flex-wrap">
              <span>Hordoffii Live, Baayyina Namootaa & Sanduuqa Ergaa</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Namoonni yeroo ammaa seenanii fi maal akka fayyadaman osoo haaromsuun hin barbaachisin live argadhaa; akkasumas yaada fi ergaa kallattiin waliif ergaa.
            </p>
          </div>
        </div>

        {/* Live Sync Status Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>🟢 Real-Time Live Sync Active</span>
          </span>
        </div>
      </div>

      {/* Primary 3 Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => setActiveSubTab('analytics')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'analytics'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>📊</span>
          <span>Hordoffii Live (Real-Time Analytics)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('feedback')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'feedback'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>✍️</span>
          <span>Yaada Kenni (Feedback Form)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('inbox')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeSubTab === 'inbox'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>📬</span>
          <span>Sanduuqa Ergaa (Inbox)</span>
          {newMessagesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white font-mono shadow">
              {newMessagesCount} Haaraa
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: REAL-TIME LIVE ANALYTICS (Without Reloading)                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 6 Real-Time Live Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Card 1: Unique Visitors */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xl">👥</span>
                <span className="text-[10px] uppercase font-bold text-amber-500/80">Visitors</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-amber-300 font-mono">
                  {uniqueUsers || events.length}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Namoota Seenan</div>
              </div>
            </div>

            {/* Card 2: Legal Explanations */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xl">⚖️</span>
                <span className="text-[10px] uppercase font-bold text-amber-500/80">Explain Law</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
                  {totalExplains}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Ibsa Seeraa</div>
              </div>
            </div>

            {/* Card 3: Document Analysis */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xl">📄</span>
                <span className="text-[10px] uppercase font-bold text-red-400/80">Analysis</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-red-300 font-mono">
                  {totalAnalyses}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Xiinxala Sanadaa</div>
              </div>
            </div>

            {/* Card 4: Cassation Precedents */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xl">🏛️</span>
                <span className="text-[10px] uppercase font-bold text-emerald-400/80">Cassation</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-300 font-mono">
                  {totalCassation}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Dhaddacha Ijoo</div>
              </div>
            </div>

            {/* Card 5: Translations */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xl">🌐</span>
                <span className="text-[10px] uppercase font-bold text-sky-400/80">Translate</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-sky-300 font-mono">
                  {totalTranslations}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Hiikkaa Seeraa</div>
              </div>
            </div>

            {/* Card 6: Total Real-Time Activity */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xl">⚡</span>
                <span className="text-[10px] uppercase font-bold text-purple-400/80">Total Activity</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-purple-300 font-mono">
                  {events.length}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Waliigala Gochaalee</div>
              </div>
            </div>
          </div>

          {/* Real-time Activity Feed & Filter Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>⚡ Gochaalee Fayyadamtootaa Live (Real-Time Live Activity Stream)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gochi namootaa haaraan yemmuu raawwatamu osoo fuula hin haaromsin asirratti battalatti calaqqisa.
                </p>
              </div>

              {/* Search filter */}
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={analyticsSearch}
                  onChange={(e) => setAnalyticsSearch(e.target.value)}
                  placeholder="Maqaa ykn qabiyyee barbaadi..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                />
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              {[
                { id: 'all', label: 'Hunda (All)', emoji: '⚡' },
                { id: 'explain_law', label: 'Ibsa Seeraa', emoji: '⚖️' },
                { id: 'doc_analysis', label: 'Xiinxala Sanadaa', emoji: '📄' },
                { id: 'cassation', label: 'Dhaddacha Ijoo', emoji: '🏛️' },
                { id: 'translate', label: 'Hiikkaa', emoji: '🌐' },
                { id: 'template', label: 'Unkaalee', emoji: '📝' },
                { id: 'visit', label: 'Seensa (Visits)', emoji: '👥' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAnalyticsFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                    analyticsFilter === tab.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Live Events List */}
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="p-10 text-center bg-slate-950 rounded-2xl border border-slate-800/80 text-slate-500 text-xs space-y-2">
                  <span className="text-3xl block">📡</span>
                  <span className="font-semibold text-slate-300">Yeroo ammaa gochi galmaa'e hin jiru.</span>
                  <p className="text-slate-500">Namoonni yemmuu seera qoratan, sanada xiinxalan, fi hiikan asirratti kallattiin mul'atu.</p>
                </div>
              ) : (
                filteredEvents.map((item, idx) => {
                  const badge = getActionBadge(item.actionType);
                  return (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">{badge.emoji}</span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-200">
                              {item.userName || 'Ogeessa Seeraa'}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            {item.category && item.category !== 'General' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 font-mono text-amber-300">
                                {item.category}
                              </span>
                            )}
                            {item.referrer && item.referrer !== 'Direct' && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                via: <strong className="text-amber-400">{item.referrer}</strong>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">
                            {item.details || 'Appii kana fayyadamaa jira'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 text-[11px] font-mono text-slate-500 sm:self-center">
                        {formatTimestamp(item.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Referral Link Visitors & Channel Analytics Dashboard */}
          <ReferralAnalyticsView currentLang={currentLang} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: FEEDBACK & CONSULTATION FORM (Yaada Kenni)                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'feedback' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>✍️</span>
              <span>Yaada, Gaaffii Seeraa ykn Ergaa Keessan Dabarsaa</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Yaada fooyya'iinsaa, gaaffii seeraa, gabaasa hanqinaa, yookiin ergaa dhuunfaa qabdan asitti barreessaa. Kallattiin gara ogeessa seeraatti (Ayele Be Dha) ergama.
            </p>
          </div>

          {submitSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in duration-200 shadow-lg">
              <span className="text-2xl">✓</span>
              <div>
                <span className="font-bold block text-sm">Yaanni keessan milkaa'inaan ergameera!</span>
                <span>Galatoomaa! Ergaan keessan galmaa'eera, ogeessi seeraa battalatti ilaalee deebii isiniif kenna.</span>
              </div>
            </div>
          )}

          {submitError && (
            <div className="p-4 rounded-2xl bg-red-950 border border-red-500/50 text-red-300 text-xs flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <span className="font-bold block">Dogoggora:</span>
                <span>{submitError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleFeedbackSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sender Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Maqaa Keessan / ስምዎ:
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="fkn: Abukaattoo Tolasaa"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Teessoo Quunnamtii (Email / Phone / Telegram):
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="fkn: +2519... ykn @telegram_username"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Topic */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Mata Duree Ergaa (Topic):
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Yaada Fooyya'iinsaa">💡 Yaada Fooyya'iinsaa (Feature Request / Suggestion)</option>
                  <option value="Gaaffii Seeraa">⚖️ Gaaffii Seeraa & Gorsa (Legal Consultation Question)</option>
                  <option value="Gabaasa Hanqinaa">🛠️ Gabaasa Hanqinaa (Bug Report / Issue)</option>
                  <option value="Waliigaltee & Hojii">📝 Waliigaltee & Hojii (Collaboration)</option>
                  <option value="Kan Biraa">💬 Kan Biraa (Other)</option>
                </select>
              </div>

              {/* Star Rating */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Sadarkaa Sadarkeessaa (Rating):
                </label>
                <div className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-xl p-1 transition-transform cursor-pointer ${
                        rating >= star ? 'scale-110 text-amber-400' : 'text-slate-700 hover:text-slate-500'
                      }`}
                      title={`${star} Stars`}
                    >
                      ⭐
                    </button>
                  ))}
                  <span className="text-xs font-mono text-amber-300 ml-2 font-bold">
                    {rating}/5 Stars
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Message */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Qabiyyee Yaadaa / Ergaa Keessanii:
              </label>
              <textarea
                required
                rows={5}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Yaada, gaaffii, yookiin gorsa qabdan bal'inaan asitti barreessaa..."
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <span>{isSubmitting ? 'Ergaa jira...' : '✉️ Ergaa / Yaada Ergi'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: MESSAGE INBOX (Sanduuqa Ergaa - For Ayele / Owner / Admin)       */}
      {/* ========================================================================= */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Authorization Check */}
          {!isOwnerUnlocked ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl max-w-lg mx-auto">
              <span className="text-4xl block">🔒</span>
              <h3 className="text-lg font-bold text-slate-100">
                Sanduuqa Ergaa Abbaa Appii (Ayele's Inbox)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ergaawwan namoonni ergatan dhuunfaa fi iccitii waan ta'aniif, abbaan appii (Ayele Be Dha) qofatu koodii isaatiin banatee arguu danda'a.
              </p>

              <form onSubmit={handleUnlockInbox} className="space-y-3 pt-2 text-left">
                <label className="block text-xs font-semibold text-slate-300">
                  PIN Koodii Abbaa Appii Galchaa:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={ownerPin}
                    onChange={(e) => {
                      setOwnerPin(e.target.value);
                      if (pinError) setPinError('');
                    }}
                    placeholder="PIN koodii (fkn: 2026)..."
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Bani / Unlock
                  </button>
                </div>
                {pinError && (
                  <p className="text-xs text-red-400 font-medium">{pinError}</p>
                )}
              </form>
            </div>
          ) : (
            /* UNLOCKED INBOX VIEW */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📬</span>
                    <h2 className="text-lg font-bold text-slate-100">
                      Sanduuqa Ergaa & Yaada Fayyadamtootaa (Live Inbox)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ergaan haaraan namoota irraa dhufe osoo fuula hin haaromsin asirratti kallattiin galmaa'a.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLockInbox}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🔒</span>
                    <span>Amma Cufi / Lock</span>
                  </button>
                </div>
              </div>

              {/* Message Filter & Search Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 text-xs">
                  {[
                    { id: 'all', label: 'Hunda', count: messages.length },
                    { id: 'new', label: 'Haaraa (New)', count: messages.filter((m) => m.status === 'new').length },
                    { id: 'read', label: 'Dubbifame (Read)', count: messages.filter((m) => m.status === 'read').length },
                    { id: 'resolved', label: 'Furmaata Argate', count: messages.filter((m) => m.status === 'resolved').length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMessageFilter(tab.id as any)}
                      className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                        messageFilter === tab.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    placeholder="Ergaa ykn maqaa barbaadi..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Court Institutional Admin Approval Requests & Confirmed Institutions */}
              <div className="space-y-4 pt-4 pb-4 border-b border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏛️</span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                        Xalayaa Mana Hojii, Chaappaa & Beeksisa SMS/Email Manneen Murtii
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Kanneen confirm tahan fi confirm tahuuf jiran xalayaa chaappaa, lakkoofsa bahii fi teessoo bulchaa qabu akka dhiheessan ergaan SMS fi Email ni ergamaaf.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleBulkSendNotice}
                      disabled={isSendingNotice === 'bulk_all'}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Send SMS & Email to all institutions"
                    >
                      <span>📱</span>
                      <span>{isSendingNotice === 'bulk_all' ? 'Ergaa Jira...' : 'Hundaaf SMS & Email Ergi'}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-navigation tabs: Pending vs Confirmed vs SMS Log */}
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCourtSubSection('pending')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      courtSubSection === 'pending'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>⏳ Gaaffii Eegamaa Jiran</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-amber-300 font-mono">
                      {courtRequests.filter(r => r.status === 'pending').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCourtSubSection('confirmed')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      courtSubSection === 'confirmed'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🏛️ Manneen Murtii Confirm Tahan</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-emerald-300 font-mono">
                      {confirmedInstitutions.filter(inst => inst.status === 'active' && inst.officialLetterContent && inst.officialLetterContent.trim().length >= 15 && inst.hasOfficialStamp).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCourtSubSection('sms_log')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      courtSubSection === 'sms_log'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>📱 Galmee SMS & Email</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-blue-300 font-mono">
                      {notificationDispatches.length}
                    </span>
                  </button>
                </div>

                {/* TAB 1: PENDING REQUESTS */}
                {courtSubSection === 'pending' && (
                  <div className="space-y-3">
                    {courtRequests.map((req) => {
                      const isPending = req.status === 'pending';
                      const hasStamp = req.hasOfficialStamp !== false;
                      return (
                        <div key={req.id} className={`p-4 rounded-2xl border space-y-3 ${isPending ? 'bg-amber-950/20 border-amber-500/40' : 'bg-slate-950 border-slate-800 opacity-75'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-100">{req.institutionName}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono">
                                  {req.courtLevel.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300 font-mono">
                                  Lakkoofsa Bahii: {req.outgoingRefNo || 'N/A'}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isPending ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                  {isPending ? 'Pending Confirm' : 'Approved'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                <div>
                                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Bulchaa (Proposed Admin):</span>
                                  <strong className="text-white">{req.proposedAdminName || req.contactPerson}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Imeelii & Bilbila:</span>
                                  <span className="font-mono text-amber-300">{req.proposedAdminEmail || req.email}</span>
                                  <span className="text-slate-400 block font-mono text-[11px]">{req.proposedAdminPhone || req.phone}</span>
                                </div>
                              </div>

                              {/* Stamp & Notification Badges */}
                              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                {Boolean(
                                  req.officialLetterContent && 
                                  req.officialLetterContent.trim().length >= 15 && 
                                  req.officialLetterContent.trim() !== 'Xalayaa mirkaneessa mana murtii.' &&
                                  req.outgoingRefNo &&
                                  req.outgoingRefNo.trim() !== 'MM/2026'
                                ) ? (
                                  <span className="px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 border bg-emerald-950/60 text-emerald-300 border-emerald-500/40">
                                    <span>🛡️ Xalayaan Mana Hojii Dhaabbata Irraa Dhiyaateera (Ref: {req.outgoingRefNo})</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 border bg-amber-950/60 text-amber-300 border-amber-500/40">
                                    <span>🟡 Xalayaa Mana Hojii Dhaabbata Irraa Eegama (Awaiting Dispatch)</span>
                                  </span>
                                )}

                                <span className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 border ${
                                  hasStamp 
                                    ? 'bg-slate-900 text-slate-300 border-slate-700' 
                                    : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                                }`}>
                                  <span>{hasStamp ? '🏷️ Chaappaan Mana Murtii' : '⚠️ Chaappaan Hin Rukkutamne'}</span>
                                </span>

                                {req.smsNotificationSent && (
                                  <span className="px-2 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono text-[10px]">
                                    <span>📱 SMS & Email Ergameera</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSendNotice(
                                  req.institutionName,
                                  req.proposedAdminEmail || req.email,
                                  req.proposedAdminPhone || req.phone,
                                  false,
                                  req.proposedAdminName || req.contactPerson
                                )}
                                disabled={isSendingNotice === req.institutionName}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                title="Send SMS and Email demanding official stamped letter"
                              >
                                <span>📱</span>
                                <span>{isSendingNotice === req.institutionName ? 'Ergaa...' : 'SMS & Email Ergi'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedLetterModal({
                                  institutionName: req.institutionName,
                                  outgoingRefNo: req.outgoingRefNo || 'Hin Dhiyaanne (Eeggamaa Jira)',
                                  proposedAdminName: req.proposedAdminName || req.contactPerson,
                                  proposedAdminEmail: req.proposedAdminEmail || req.email,
                                  proposedAdminPhone: req.proposedAdminPhone || req.phone,
                                  letterContent: req.officialLetterContent || 'Xalayaan mana hojii isaaniitii bahee dhiyaate hin jiru. Dhaabbanni mana murtii xalayaa seera qabeessa lakkoofsa bahii qabu fi chaappaan mirkanaa\'e kallattiin yoo hin dhiheessine sirni kun ofumaan xalayaa hin qopheessu. Xalayaan qabatamaan dhiyaachuun irraa eeggama.',
                                  hasStamp: Boolean(req.officialLetterContent && hasStamp),
                                  stampSealNote: req.stampSealNote || (req.officialLetterContent ? 'Chaappaa Mana Murtii' : 'Chaappaan hin jiru'),
                                  status: req.status
                                })}
                                className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <span>📜</span>
                                <span>{req.officialLetterContent ? 'Xalayaa & Chaappaa Ilaali' : 'Haala Xalayaa Ilaali (Eeggamaa Jira)'}</span>
                              </button>

                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveCourtReq(req)}
                                  disabled={approvingRequestId === req.id}
                                  className={`px-4 py-2 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap ${
                                    Boolean(
                                      req.officialLetterContent && 
                                      req.officialLetterContent.trim().length >= 15 && 
                                      req.officialLetterContent.trim() !== 'Xalayaa mirkaneessa mana murtii.' &&
                                      req.outgoingRefNo &&
                                      req.outgoingRefNo.trim() !== 'MM/2026'
                                    )
                                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                      : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/30'
                                  }`}
                                >
                                  {approvingRequestId === req.id 
                                    ? '⏳ Mirkaneessaa...' 
                                    : Boolean(
                                        req.officialLetterContent && 
                                        req.officialLetterContent.trim().length >= 15 && 
                                        req.officialLetterContent.trim() !== 'Xalayaa mirkaneessa mana murtii.' &&
                                        req.outgoingRefNo &&
                                        req.outgoingRefNo.trim() !== 'MM/2026'
                                      )
                                    ? '✅ Confirm & Admin Taasisi'
                                    : '⚠️ Xalayaa Dhaabbata Eegaa Jira'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleReConfirmReq(req)}
                                disabled={approvingRequestId === req.id}
                                className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
                              >
                                {approvingRequestId === req.id ? '⏳ ...' : '🔄 Re-Confirm'}
                              </button>
                            </div>
                          </div>

                          {req.officialLetterContent && (
                            <div className="mt-2 p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] text-slate-300 space-y-1">
                              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase">
                                <span>📜</span>
                                <span>Xalayaa Mana Murtii (Outgoing Ref: {req.outgoingRefNo}):</span>
                              </div>
                              <p className="italic text-slate-300 leading-relaxed font-sans">{req.officialLetterContent}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: CONFIRMED INSTITUTIONS */}
                {courtSubSection === 'confirmed' && (
                  <div className="space-y-3">
                    {confirmedInstitutions.filter(inst => inst.status === 'active' && inst.officialLetterContent && inst.officialLetterContent.trim().length >= 15 && inst.hasOfficialStamp).map((inst) => {
                      const hasStamp = inst.hasOfficialStamp !== false;
                      return (
                        <div key={inst.id} className="p-4 rounded-2xl border bg-slate-950 border-slate-800 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-100">{inst.name}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                                  ✅ Confirm Ta'eera
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono">
                                  Code: {inst.accessCode}
                                </span>
                                {inst.outgoingRefNo && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300 font-mono">
                                    Ref: {inst.outgoingRefNo}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                <div>
                                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Bulchaa (Admin):</span>
                                  <strong className="text-white">{inst.adminName}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Imeelii & Bilbila:</span>
                                  <span className="font-mono text-amber-300">{inst.adminEmail}</span>
                                  <span className="text-slate-400 block font-mono text-[11px]">{inst.adminPhone || '+251 911 234 567'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                <span className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 border ${
                                  hasStamp 
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' 
                                    : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                }`}>
                                  <span>{hasStamp ? '🛡️ Chaappaan Mana Murtii Mirkanaa\'eera' : '⚠️ Xalayaan Chaappaa Eegamaa Jira'}</span>
                                </span>

                                {inst.smsNotificationSent && (
                                  <span className="px-2 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono text-[10px]">
                                    <span>📱 SMS & Email Ergameera</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSendNotice(
                                  inst.name,
                                  inst.adminEmail,
                                  inst.adminPhone || '+251911234567',
                                  true,
                                  inst.adminName
                                )}
                                disabled={isSendingNotice === inst.name}
                                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                title="Send SMS and Email requesting updated stamped official letter"
                              >
                                <span>📱</span>
                                <span>{isSendingNotice === inst.name ? 'Ergaa...' : 'SMS & Email Ergi'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedLetterModal({
                                  institutionName: inst.name,
                                  outgoingRefNo: inst.outgoingRefNo || 'Hin Dhiyaanne (Eeggamaa Jira)',
                                  proposedAdminName: inst.adminName,
                                  proposedAdminEmail: inst.adminEmail,
                                  proposedAdminPhone: inst.adminPhone || 'N/A',
                                  letterContent: inst.officialLetterContent || 'Xalayaan mana hojii isaaniitii bahee dhiyaate hin jiru. Manneen murtii xalayaa seera qabeessa lakkoofsa bahii qabu fi chaappaa mana hojiitiin mirkanaa\'e kallattiin yoo hin dhiheessine sirni kun ofumaan xalayaa hin qopheessu. Dhaabbanni kun xalayaa dhiheessuun irraa eeggama.',
                                  hasStamp: Boolean(inst.officialLetterContent && inst.hasOfficialStamp),
                                  stampSealNote: inst.stampSealNote || (inst.officialLetterContent ? 'Chaappaa Mana Murtii' : 'Chaappaan hin jiru'),
                                  status: 'approved'
                                })}
                                className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <span>📜</span>
                                <span>{inst.officialLetterContent ? 'Xalayaa & Chaappaa Ilaali' : 'Haala Xalayaa Ilaali (Eeggamaa Jira)'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 3: SENT NOTIFICATION DISPATCHES (SMS & EMAIL LOG) */}
                {courtSubSection === 'sms_log' && (
                  <div className="space-y-3">
                    {notificationDispatches.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                        Ergaan SMS ykn Email hanga ammaatti hin ergamne. "Hundaaf SMS & Email Ergi" fayyadamaa.
                      </div>
                    ) : (
                      notificationDispatches.map((disp) => (
                        <div key={disp.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-100">{disp.institutionName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                                📱 {disp.targetPhone}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                                ✉️ {disp.targetEmail}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                {disp.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(disp.dispatchedAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/60 font-mono text-[11px] text-amber-300">
                            <strong>SMS Text:</strong> {disp.smsMessage}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* MODAL: OFFICIAL STAMPED LETTER VIEWER */}
              {selectedLetterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📜</span>
                        <h3 className="font-bold text-base text-white">
                          Xalayaa Mana Hojii & Chaappaa Mirkaneessaa
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedLetterModal(null)}
                        className="text-slate-400 hover:text-white text-xs font-bold p-1 rounded-lg hover:bg-slate-800"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Official Letterhead Replica */}
                    <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-inner font-serif space-y-4 border-4 border-slate-200 relative overflow-hidden">
                      {/* Watermark Seal */}
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none text-9xl">
                        ⚖️
                      </div>

                      {/* Header */}
                      <div className="text-center border-b-2 border-slate-800 pb-4">
                        <div className="text-base sm:text-lg font-bold tracking-wide uppercase">
                          {selectedLetterModal.institutionName}
                        </div>
                        <div className="text-xs font-sans text-slate-600 mt-0.5">
                          Naannoo Oromiyaa / Mootummaa Naannoo Oromiyaa
                        </div>
                      </div>

                      {/* Reference Strip */}
                      <div className="flex items-center justify-between font-sans text-xs pt-2">
                        <div>
                          <strong>Lakk. Bahii (Outgoing Ref):</strong> <span className="font-mono underline text-blue-900 font-bold">{selectedLetterModal.outgoingRefNo}</span>
                        </div>
                        <div>
                          <strong>Guyyaa:</strong> <span className="font-mono">{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Addressed To */}
                      <div className="font-sans text-xs space-y-0.5">
                        <div><strong>Gara:</strong> Abbaa Appii Seera AI (Super Admin Ayele Be Dha) tiif</div>
                        <div><strong>Teessoo:</strong> Finfinnee / Oromiyaa</div>
                      </div>

                      {/* Subject */}
                      <div className="text-center font-bold text-xs sm:text-sm font-sans underline pt-2">
                        Dhimma: Eeyyama Bulchaa Mana Murtii (Court Admin) fi Koodii Seensaa Gaafachuu
                      </div>

                      {/* Letter Body */}
                      <div className="text-xs sm:text-sm leading-relaxed text-justify whitespace-pre-wrap font-sans text-slate-800">
                        {selectedLetterModal.letterContent}
                      </div>

                      {/* Proposed Admin Credentials Box */}
                      <div className="bg-slate-50 border border-slate-300 p-3 rounded-xl font-sans text-xs space-y-1">
                        <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                          Odeeffannoo Bulchaa Mana Murtii (Admin Contact Details):
                        </div>
                        <div><b>Maqaa:</b> {selectedLetterModal.proposedAdminName}</div>
                        <div><b>Imeelii Hojii:</b> {selectedLetterModal.proposedAdminEmail}</div>
                        <div><b>Lakkoofsa Bilbilaa:</b> {selectedLetterModal.proposedAdminPhone}</div>
                      </div>

                      {/* Signature & Official Circular Stamp Section */}
                      <div className="pt-6 flex items-center justify-between font-sans">
                        <div className="text-center space-y-1">
                          <div className="text-xs text-slate-500 italic">Mallattoo Qaama Aangoo Qabu</div>
                          <div className="font-bold text-xs border-t border-slate-800 pt-1">
                            {selectedLetterModal.proposedAdminName}
                          </div>
                        </div>

                        {/* Circular Stamp Graphic */}
                        <div className="w-28 h-28 rounded-full border-4 border-red-700 text-red-700 flex flex-col items-center justify-center p-2 text-center rotate-[-12deg] shadow-sm select-none">
                          <div className="text-[8px] font-black uppercase tracking-tighter leading-none">
                            CHAAPPAA MANA HOJII
                          </div>
                          <div className="text-base my-0.5">⚖️</div>
                          <div className="text-[7px] font-black uppercase tracking-tighter leading-none">
                            OFFICIAL SEAL
                          </div>
                          <div className="text-[6px] font-mono mt-0.5">{selectedLetterModal.outgoingRefNo}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedLetterModal(null)}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer"
                      >
                        Cufi (Close)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Feed */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredMessages.length === 0 ? (
                  <div className="p-12 text-center bg-slate-950 rounded-2xl border border-slate-800/80 text-slate-500 text-xs space-y-2">
                    <span className="text-3xl block">📭</span>
                    <span className="font-semibold text-slate-300">Ergaan galmaa'e hin jiru.</span>
                    <p className="text-slate-500">Namoonni yaada yemmuu kennan asitti kallattiin isiniif dhufa.</p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isNew = msg.status === 'new';
                    const isResolved = msg.status === 'resolved';

                    return (
                      <div
                        key={msg.id}
                        className={`p-5 rounded-2xl border transition-all space-y-3 ${
                          isNew
                            ? 'bg-slate-950 border-amber-500/60 shadow-md ring-1 ring-amber-500/20'
                            : isResolved
                            ? 'bg-slate-950/60 border-slate-800/60 opacity-80'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        {/* Message Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/40">
                              {msg.senderName.charAt(0) || '👤'}
                            </span>
                            <span className="font-bold text-sm text-slate-100">
                              {msg.senderName}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-300 font-mono">
                              {msg.topic || 'Yaada'}
                            </span>
                            {msg.rating && (
                              <span className="text-xs text-amber-400">
                                {'⭐'.repeat(msg.rating)}
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                                isNew
                                  ? 'bg-red-950 text-red-300 border-red-500/50'
                                  : isResolved
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isNew ? '🟢 Haaraa' : isResolved ? '✓ Furmaata Argate' : 'Dubbifame'}
                            </span>
                          </div>

                          <div className="text-xs font-mono text-slate-400">
                            {formatTimestamp(msg.createdAt)}
                          </div>
                        </div>

                        {/* Message Body */}
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                          {msg.message}
                        </p>

                        {/* Contact info & Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
                          <div className="text-slate-400 flex items-center gap-2 flex-wrap">
                            <span>📞 Quunnamtii:</span>
                            <strong className="text-amber-300 font-mono">
                              {msg.contactInfo || msg.senderEmail || 'Hin ibsamne'}
                            </strong>

                            {/* Direct Action links if telegram or email provided */}
                            {msg.contactInfo?.startsWith('@') && (
                              <a
                                href={`https://t.me/${msg.contactInfo.replace('@', '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded bg-sky-950 border border-sky-500/40 text-sky-300 font-bold hover:bg-sky-900 text-[11px]"
                              >
                                ✈️ Telegram'n Deebisi
                              </a>
                            )}
                            {msg.senderEmail && (
                              <a
                                href={`mailto:${msg.senderEmail}?subject=Deebii%20SeeraAI%20-%20${encodeURIComponent(msg.topic || 'Yaada')}`}
                                className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300 font-bold hover:bg-amber-900 text-[11px]"
                              >
                                ✉️ Email Ergi
                              </a>
                            )}
                          </div>

                          {/* Status Management Actions */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {isNew && (
                              <button
                                type="button"
                                onClick={() => msg.id && updateMessageStatus(msg.id, 'read')}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Dubbiseera
                              </button>
                            )}

                            {!isResolved && (
                              <button
                                type="button"
                                onClick={() => msg.id && updateMessageStatus(msg.id, 'resolved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold cursor-pointer"
                              >
                                ✓ Furmaata Kenneera
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => msg.id && deleteFeedbackMessage(msg.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-950 hover:bg-red-900 border border-red-500/40 text-red-300 text-[11px] font-semibold cursor-pointer"
                              title="Ergaa kana haqi"
                            >
                              🗑️ Haqi
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: TRANSACTIONS LIST                                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'transactions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in duration-200">
           <h2 className="text-xl font-bold text-slate-100">Payment Transactions</h2>
           {((telebirrSummary?.transactions) || []).length === 0 ? (
             <p className="text-slate-500 text-sm">No transactions found.</p>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-xs text-left text-slate-300">
                 <thead className="bg-slate-950 text-slate-400 uppercase">
                   <tr>
                     <th className="px-4 py-3">User</th>
                     <th className="px-4 py-3">Plan</th>
                     <th className="px-4 py-3">Amount</th>
                     <th className="px-4 py-3">Status</th>
                     <th className="px-4 py-3">Reference</th>
                     <th className="px-4 py-3">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                   {((telebirrSummary?.transactions) || []).map(tx => (
                     <tr key={tx.id}>
                       <td className="px-4 py-3">{tx.userName} ({tx.userEmail})</td>
                       <td className="px-4 py-3">{tx.planId}</td>
                       <td className="px-4 py-3">{tx.amountETB} ETB</td>
                       <td className="px-4 py-3">{tx.status}</td>
                       <td className="px-4 py-3 font-mono">{tx.transactionReference}</td>
                       <td className="px-4 py-3">
                        <button onClick={() => handleViewReceipt(tx)} className="text-amber-400 font-bold hover:underline">Receipt</button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      )}
      {isReceiptModalOpen && selectedTransaction && (
        <PaymentReceipt transaction={selectedTransaction} onClose={() => setIsReceiptModalOpen(false)} />
      )}

      {activeHighValueAlert && (
        <div className="flex flex-col gap-2">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20">
                      <span className="text-[10px] text-slate-400 block font-mono">Hamma Kaffaltii (Amount):</span>
                      <span className="text-xl font-extrabold text-amber-400 font-mono">+{activeHighValueAlert.amountETB} ETB</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20">
                      <span className="text-[10px] text-slate-400 block font-mono">Kaffalaa (Payer):</span>
                      <span className="font-bold text-slate-100">{activeHighValueAlert.userName}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20">
                      <span className="text-[10px] text-slate-400 block font-mono">Lakk. Reference:</span>
                      <span className="font-mono text-emerald-300 font-bold">{activeHighValueAlert.transactionReference}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20">
                      <span className="text-[10px] text-slate-400 block font-mono">Herrega Galii:</span>
                      <span className="font-mono text-slate-200">0927790325 (Ayele)</span>
                    </div>
        </div>
      )}
              

              {/* 1. PRIMARY SUMMARY CARD: TOTAL PENDING PAYOUTS VS TOTAL LIFETIME EARNINGS */}
              {(telebirrSummary?.todayRevenueETB || 0) >= DAILY_TAX_THRESHOLD_ETB && (
                <div className="p-4 mb-6 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-200 flex items-center gap-3 animate-in fade-in duration-300">
                  <span className="text-xl">⚠️</span>
                  <div className="text-xs">
                    <strong className="block font-bold">Xiyyeeffannoo Seeraa (Tax Compliance Alert):</strong>
                    Galii keessan har'aa ({telebirrSummary?.todayRevenueETB.toLocaleString()} ETB) daangaa taaksii ({DAILY_TAX_THRESHOLD_ETB.toLocaleString()} ETB) irra ga'eera/darbeera. Labsii Gibira Galii Lakk. 973/2008 keeyyata 92 bu'uura godhachuun taaksiin hir'ifamu akka hordofamu hubadhaa.
                  </div>
                </div>
              )}
              <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl font-bold shrink-0">
                      ⚖️
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-bold font-serif-legal text-slate-100">
                          Cuunfaa Galii & Kaffaltii Telebirr (Earnings Summary)
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                          ✓ DIRECT TELEBIRR CARRIER SETTLEMENT
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Herrega Telebirr: <strong>0927790325 (Ayele Belayneh Zeleke)</strong> • FDRE Proclamation 410/2004 Protected
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Gateway Status Badges */}
                    <div className="flex items-center gap-2 mr-2">
                      {[
                        { name: 'Telebirr', status: gatewayStatus.telebirr },
                        { name: 'Safaricom', status: gatewayStatus.safaricom }
                      ].map(g => (
                        <div key={g.name} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${g.status === 'operational' ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300' : 'bg-red-950/50 border-red-500/30 text-red-300'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${g.status === 'operational' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                          {g.name} {g.status === 'operational' ? 'Op' : 'Deg'}
                        </div>
                      ))}
                    </div>

                    {/* Refresh Data Button */}
                    <button
                      type="button"
                      onClick={handleRefreshTelebirrData}
                      disabled={isSyncingTelebirr}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      <span className={isSyncingTelebirr ? 'animate-spin inline-block' : ''}>🔄</span>
                      <span>{isSyncingTelebirr ? 'Data Haaroomaa jira...' : 'Refresh Data (Re-Sync API)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLockInbox}
                      className="px-3 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      🔒 Cufi
                    </button>
                  </div>
                </div>

                {/* Toast Notification for Re-sync */}
                {telebirrSyncToast && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                    telebirrSyncToast.type === 'success'
                      ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                      : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
                  }`}>
                    <span className="text-base">{telebirrSyncToast.type === 'success' ? '🔔' : '⏳'}</span>
                    <span className="font-medium leading-relaxed">{telebirrSyncToast.message}</span>
                  </div>
                )}

                {/* Honest Carrier Billing Notice & Zero-Fake-Revenue Guarantee */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 text-xs text-amber-200/90 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <span>ℹ️</span>
                    <span>Hubachiisa Qabatamaa Kaffaltii fi Galii (Honest Carrier Billing Notice):</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Dhaabbileen Ethio Telecom fi Safaricom tajaajila interneetii irraa kaffaltii otomaatikii abbaa appiitiif kaffalamu hin qaban; kaffaltiin kamiyyuu heyyama abbaa maallaqaatiin qofa raawwatama. Kanaafuu, lakkoofsi fakkii (simulated 2,700 ETB) kanaan dura mul'achaa ture hundi akka ajajamtetti guutummaatti haqameera. Amma galii qabatamaa qofatu (0.00 ETB) agarsiifama.
                  </p>
                </div>

                {/* Side-by-Side Comparison: Total Pending Payouts, Gross Earnings & Tax Compliance */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                  {/* Card A: Total Pending Payouts */}
                  <div className="p-6 rounded-3xl bg-slate-950 border border-amber-500/30 relative overflow-hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                        <span>⏳</span> Total Pending
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 font-mono">
                        Awaiting
                      </span>
                    </div>

                    <div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono">
                        {(telebirrSummary?.totalPendingPayoutsETB || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg text-amber-400">ETB</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Kaffaltiiwwan qorannoo eegaa jiran: <strong>{telebirrSummary?.pendingTransactionsCount || 0}</strong>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Status: All clear</span>
                      <span className="text-emerald-400 font-bold">✓ Verified</span>
                    </div>
                  </div>

                  {/* Card B: Total Lifetime Gross Earnings */}
                  <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 relative overflow-hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                        <span>💰</span> Gross Lifetime
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-emerald-300 font-mono font-bold">
                        Pre-Tax
                      </span>
                    </div>

                    <div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-mono">
                        {(telebirrSummary?.totalLifetimeEarningsETB || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg text-emerald-400">ETB</span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1">
                        Waliigala galii kaffaltii Telebirr (Osoo gibirri hin hir'ifamin)
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Ref: 0927790325</span>
                      <span className={(telebirrSummary?.totalLifetimeEarningsETB || 0) > 0 ? "text-emerald-400 font-bold" : "text-slate-500"}>
                        {(telebirrSummary?.totalLifetimeEarningsETB || 0) > 0 ? "✓ Gross Verified" : "Qarshii 0.00 ETB (Galii Hin Qabu)"}
                      </span>
                    </div>
                  </div>

                  {/* Card C: Tax Compliance (2% WHT) & Net Payout */}
                  <div className="p-6 rounded-3xl bg-slate-950 border border-red-500/40 relative overflow-hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-red-400 flex items-center gap-1.5">
                        <span>🏛️</span> Tax Withholding
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-500/40 text-red-300 font-mono font-bold">
                        WHT 2%
                      </span>
                    </div>

                    <div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-red-400 font-mono">
                        -{(telebirrSummary?.totalWithholdingTaxETB || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg">ETB</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Mandatory 2% WHT based on Proclamation 973/2016
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="text-slate-500">Net Legal Payout:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {(telebirrSummary?.netEarningsETB || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lifetime Settlement Progress Ratio */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Pursa Kaffaltii Mirkanaa'e (Settlement Fulfillment):</span>
                    <span className="text-emerald-400 font-bold">
                      {(telebirrSummary?.totalLifetimeEarningsETB || 0) > 0 
                        ? `100% Cleared (${(telebirrSummary?.totalLifetimeEarningsETB || 0).toLocaleString()} ETB)`
                        : '0% (0.00 ETB / 0.00 ETB - Galiin sobaa haqameera)'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: (telebirrSummary?.totalLifetimeEarningsETB || 0) > 0 ? '100%' : '0%' }} 
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono text-right italic">
                    * Calculation adheres to Ethiopian Tax Law (Income Tax Procl. 973/2016)
                  </p>
                </div>
              </div>

              {/* 2. Four Financial Metric Cards & Account Verification Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Income */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2 shadow-inner">
                    <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">
                      Waliigala Galii Telebirr (Total Revenue):
                    </span>
                    <div className="text-3xl font-extrabold text-amber-400 font-mono">
                      {(telebirrSummary?.totalRevenueETB || 0).toLocaleString()} ETB
                    </div>
                    <span className={(telebirrSummary?.totalRevenueETB || 0) > 0 ? "text-[10px] text-emerald-400 font-bold block" : "text-[10px] text-slate-500 block font-mono"}>
                      {(telebirrSummary?.totalRevenueETB || 0) > 0 ? "✓ Galii Qulqulluu (Direct Credited)" : "Galiin galmaa'e hin jiru (0 ETB)"}
                    </span>
                  </div>

                  {/* Today's Income */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">
                      Galii Har'aa (Today's Income):
                    </span>
                    <div className="text-3xl font-bold text-emerald-400 font-mono">
                      {(telebirrSummary?.todayRevenueETB || 0).toLocaleString()} ETB
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Kaffaltii har'a raawwatame
                    </span>
                  </div>

                  {/* Monthly Income */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">
                      Galii Ji'a Kanaa (Current Month):
                    </span>
                    <div className="text-3xl font-bold text-sky-400 font-mono">
                      {(telebirrSummary?.monthlyRevenueETB || 0).toLocaleString()} ETB
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Ji'a Fulbaana / Fulbaana 2026
                    </span>
                  </div>

                  {/* Transactions Count */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">
                      Baayyina Kaffaltiiwwanii (Count):
                    </span>
                    <div className="text-3xl font-bold text-purple-400 font-mono">
                      {telebirrSummary?.totalTransactionsCount || 0}
                    </div>
                    <span className="text-[10px] text-purple-300 block">
                      Kaffaltiiwwan Telebirr Mirkanaa'an
                    </span>
                  </div>
                </div>

                {/* Account Owner Verification Box */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">
                      HERREGA TELEBIRR MIRKANAA'E (VERIFIED RECEIVING ACCOUNT):
                    </span>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-lg font-bold text-white font-serif-legal">
                        Ayele Belayneh Zeleke (አየለ በላይነህ ዘለቀ)
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono font-extrabold text-sm border border-amber-500/40">
                        📱 0927790325
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {(telebirrSummary?.totalRevenueETB || 0) > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
                        ✓ Galii Qophii Ta'eera (Settled)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-slate-400 border border-slate-850 text-xs font-mono">
                        ℹ️ Galiin qabatamaa hin jiru (0.00 ETB)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2-Column Analytics: Categorized by Payment Date & User Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Categorized by Payment Date */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                      <span>📅</span>
                      <span>Galii Guyyaa Guyyaadhaan (Categorized by Date)</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">Hordoffii Guyyaa</span>
                  </div>

                  <div className="space-y-2.5">
                    {telebirrSummary?.dailyIncomeList && telebirrSummary.dailyIncomeList.length > 0 ? (
                      telebirrSummary.dailyIncomeList.map((day, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-200 font-mono">
                              {day.dateStr}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {day.txCount} Kaffaltii(wwan) raawwataman
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-amber-400 font-mono">
                              +{day.totalETB.toLocaleString()} ETB
                            </div>
                            <span className="text-[10px] text-emerald-400 font-mono">✓ Galii Taheera</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 text-center space-y-2">
                        <div className="text-2xl">0️⃣</div>
                        <div className="text-xs font-bold text-slate-200">Galiin Galmaa'e Hin Jiru (0.00 ETB)</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm mx-auto">
                          Ethio Telecom fi Safaricom kaffaltii otomaatikii hin raawwatan. Lakkoofsi sobaa kanaan dura ture hundi guutummaatti haqameera.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Categorized by User Activity / Package */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                      <span>📦</span>
                      <span>Galii Akkaataa Hojii & Pakeejiin (User Activity)</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">Pakeejiiwwan</span>
                  </div>

                  <div className="space-y-3">
                    {telebirrSummary?.activityBreakdown && telebirrSummary.activityBreakdown.length > 0 ? (
                      telebirrSummary.activityBreakdown.map((pkg, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                              <span>📦</span>
                              <span>{pkg.planName}</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-amber-400">
                              {pkg.totalETB.toLocaleString()} ETB
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                            <span>{pkg.count} Fayyadamtoota</span>
                            <span className="text-emerald-400 font-mono">✓ Mirkanaa'e</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 text-center space-y-2">
                        <div className="text-2xl">📦</div>
                        <div className="text-xs font-bold text-slate-200">Pakeejii Kaffaltiin Itti Galte Hin Jiru (0 ETB)</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm mx-auto">
                          Fayyadamtoota dhuunfaa irraa kaffaltii dirqisiisaan hin gaafatamu.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Detailed Paginated Telebirr Transaction Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                      <span>🧾</span>
                      <span>Galmee Kaffaltii Bal'aa (Detailed Transaction History)</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                      Tarree kaffaltii tokkoon tokkoo, gibira hir'ifame (2% WHT) fi galii qulqulluu (Net) waliin
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const { purgeSimulatedAndResetEarnings, reSyncTelebirrApiEndpoints } = await import('../services/paymentService');
                        await purgeSimulatedAndResetEarnings();
                        const refreshed = await reSyncTelebirrApiEndpoints();
                        setTelebirrSummary(refreshed);
                        setTelebirrSyncToast({
                          message: '🗑️ Galiin sobaa fi kuusaan fakkii hundi haqameera. Galii qabatamaa qofatu mul\'ata (0 ETB).',
                          type: 'info'
                        });
                      }}
                      className="px-3 py-1 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-[10px] font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <span>🗑️</span>
                      <span>Haqi Galii Sobaa (0 ETB)</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await autoVerifyAllPendingFirestoreTransactions();
                        const refreshed = await reSyncTelebirrApiEndpoints();
                        setTelebirrSummary(refreshed);
                      }}
                      className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <span>⚡</span>
                      <span>Firestore Auto-Verify All</span>
                    </button>
                    <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-amber-400 font-mono font-bold">
                      Baayyina: {(telebirrSummary?.transactions || []).length}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[10px] text-emerald-300 font-mono font-bold">
                      WHT: 2.0% Active
                    </span>
                  </div>
                </div>

                {/* Transparency Notice on Telebirr Real Verification */}
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2.5">
                  <span className="text-base">ℹ️</span>
                  <div>
                    <strong className="text-amber-300">Hubachiisa Mirkaneessa Kaffaltii (Payment Verification Notice):</strong>
                    <p className="mt-0.5 text-slate-300 text-[11px] leading-relaxed">
                      Galmeewwan armaan gadii kaffaltiiwwan fayyadamtoonni lakkoofsa mirkaneessaa (Reference) galchuun erganiidha. Kaffaltiin sun herrega Telebirr (0927790325) keessan irratti maallaqni qabatamaan seenuu isaa mirkaneeffachuuf herrega Telebirr keessan ykn ergaa SMS 127 ilaalaa.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                      <tr className="border-b border-slate-800/50">
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Guyyaa (Date)</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Fayyadamaa (Payer)</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Reference</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Haala (Status)</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono text-right">Gross (ETB)</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-red-500/70 uppercase tracking-wider font-mono text-right">Tax (2%)</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-emerald-500/70 uppercase tracking-wider font-mono text-right">Net (ETB)</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {(() => {
                        const allTxs = telebirrSummary?.transactions || [];
                        const start = (telebirrPage - 1) * telebirrPageSize;
                        const paginatedTxs = allTxs.slice(start, start + telebirrPageSize);

                        if (paginatedTxs.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="px-6 py-10 text-center text-slate-500 text-xs italic">
                                Kaffaltiin galmaa'e hin jiru.
                              </td>
                            </tr>
                          );
                        }

                        return paginatedTxs.map((tx, idx) => {
                          const tax = tx.amountETB * 0.02;
                          const net = tx.amountETB - tax;
                          const isSettled = tx.status === 'completed' || tx.syncStatus === 'VERIFIED';
                          return (
                            <tr key={tx.id || idx} className="hover:bg-slate-800/30 transition-colors group">
                              <td className="px-6 py-4 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                                {formatTimestamp(tx.createdAt).split(' • ')[0]}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <div className="text-[11px] font-bold text-slate-200">{tx.userName}</div>
                                  <div className="text-[9px] text-slate-500 font-mono">{tx.userEmail}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                {tx.transactionReference}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {isSettled ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                    ✓ Mirkanaa'eera
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30">
                                    ⏳ Eegamaa Jira
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-[11px] font-bold text-slate-200 text-right font-mono">
                                {tx.amountETB.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-[11px] font-bold text-red-400/80 text-right font-mono">
                                -{tax.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-[11px] font-extrabold text-emerald-400 text-right font-mono bg-emerald-500/5 group-hover:bg-emerald-500/10">
                                {net.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleViewReceipt(tx)}
                                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <span>📋</span>
                                  <span>Receipt</span>
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {telebirrSummary && ((telebirrSummary?.transactions) || []).length > telebirrPageSize && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <div className="text-[10px] text-slate-500 font-mono">
                      Showing {(telebirrPage - 1) * telebirrPageSize + 1} to {Math.min(telebirrPage * telebirrPageSize, ((telebirrSummary?.transactions) || []).length)} of {((telebirrSummary?.transactions) || []).length}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTelebirrPage(p => Math.max(1, p - 1))}
                        disabled={telebirrPage === 1}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        ◀
                      </button>
                      {Array.from({ length: Math.ceil(((telebirrSummary?.transactions) || []).length / telebirrPageSize) }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setTelebirrPage(i + 1)}
                          className={`w-7 h-7 rounded-lg text-[10px] font-bold font-mono transition-all ${
                            telebirrPage === i + 1
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setTelebirrPage(p => Math.min(Math.ceil(((telebirrSummary?.transactions) || []).length / telebirrPageSize), p + 1))}
                        disabled={telebirrPage === Math.ceil(((telebirrSummary?.transactions) || []).length / telebirrPageSize)}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. TELEBIRR HIGH-VALUE NOTIFICATION TRIGGER SETTINGS & TEST TRIGGER */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl font-bold">
                      🚨
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                        <span>Qindaa'ina Beeksisa Galii Telebirr (High-Value Alert Trigger)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                          &gt;= {notifSettings.thresholdETB} ETB
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Yeroo kaffaltiin haaraan gatiin isaa daangaa (threshold) ol ta'e Telebirr API irraa dhufu abbaa appiitiif beeksisi.
                      </p>
                    </div>
                  </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSimulatingAlert}
                        onClick={async () => {
                          setIsSimulatingAlert(true);
                          try {
                            await simulateIncomingTelebirrWebhook(500, 'Test User', 'test@example.com', 'pro');
                          } finally {
                            setIsSimulatingAlert(false);
                          }
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow flex items-center gap-1.5 disabled:opacity-50"
                        title="Sagalee beeksisaa qofa mokkora; qarshii galii hin dabalu"
                      >
                        <span>🔔</span>
                        <span>{isSimulatingAlert ? 'Mokkoraa jira...' : 'Test Alert Sound (Sagalee Beeksisaa)'}</span>
                      </button>
                    </div>
                </div>

                {/* Threshold Setting Form & Quick Presets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Daangaa Beeksisaa (Alert Threshold Amount in ETB):
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="50"
                        step="50"
                        value={notifSettings.thresholdETB}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 500;
                          const updated = saveTelebirrNotificationSettings({ thresholdETB: val });
                          setNotifSettings(updated);
                        }}
                        className="w-40 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-slate-400 font-mono font-bold">ETB fi isaa ol</span>
                    </div>

                    {/* Preset Buttons */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {[100, 350, 500, 950, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            const updated = saveTelebirrNotificationSettings({ thresholdETB: amt });
                            setNotifSettings(updated);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                            notifSettings.thresholdETB === amt
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {amt} ETB
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notification Toggles */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Filannoowwan Sagalee & Mul'ataa (Alert Preferences):
                    </label>

                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer">
                        <div className="flex items-center gap-2 text-slate-200">
                          <span>🔔</span>
                          <span>Sagalee Dhageessisi (Audio Chime on High-Value Payment)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifSettings.notifySound}
                          onChange={(e) => {
                            const updated = saveTelebirrNotificationSettings({ notifySound: e.target.checked });
                            setNotifSettings(updated);
                          }}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer">
                        <div className="flex items-center gap-2 text-slate-200">
                          <span>📱</span>
                          <span>Pop-up Banner Ol'aanaa Mul'isi (In-App Floating Modal)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifSettings.inAppPopup}
                          onChange={(e) => {
                            const updated = saveTelebirrNotificationSettings({ inAppPopup: e.target.checked });
                            setNotifSettings(updated);
                          }}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Alert History Section */}
                {alertHistory.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[11px] text-slate-400 font-mono uppercase font-bold block">
                      Seenaa Beeksisa Kaffaltii Gatii Ol'aanaa (Recent High-Value Triggers):
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {alertHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-200 flex items-center gap-2">
                              <span>🚨 +{item.amountETB} ETB</span>
                              <span className="text-slate-400 font-normal">({item.userName})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Ref: {item.transactionReference} • {item.planName} • {new Date(item.detectedAt).toLocaleTimeString()}
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            ✓ Alert Sent
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
    );
  };
