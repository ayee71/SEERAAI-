import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Language, translations } from '../i18n/translations';
import { sendKioskLinkEmail, generateTrilingualInvitation } from '../services/emailWorker';
import { CourtroomNewsCard, CourtNewsItem } from '../components/CourtroomNewsCard';
import { Newspaper, Mic, Download, Trash2, Printer, FileText, Check, Sparkles, Clock, Search, RefreshCw, Copy } from 'lucide-react';
import { downloadCourtTranscriptPDF } from '../services/courtTranscriptPdfService';
import { AanaaGurbichaECourtDashboard } from '../components/AanaaGurbichaECourtDashboard';
import { CourtHearingCalendar } from '../components/CourtHearingCalendar';

interface ControlDashboardViewProps {
  currentLang: Language;
}

export const ControlDashboardView: React.FC<ControlDashboardViewProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const { user } = useAuth();
  const [session, setSession] = useState<{
    vkLink?: string;
    googleMeetLink?: string;
    courtLogoUrl?: string;
    autoJoin?: boolean;
    institutionName?: string;
    status: 'active' | 'inactive';
    logs: { timestamp: any; message: string; type?: string }[];
    config?: any;
    lastScreenCapture?: string;
    lastUpdated?: any;
  } | null>(null);

  const [googleMeetLink, setGoogleMeetLink] = useState('https://meet.google.com/abc-defg-hij');
  const [courtLogoUrl, setCourtLogoUrl] = useState('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=300&q=80');
  const [theme, setTheme] = useState<'dark' | 'midnight' | 'gold' | 'light'>('dark');
  const [volume, setVolume] = useState<number>(50);
  const [targetSession, setTargetSession] = useState('Mana Murtii Waliigalaa Oromiyaa');
  const [autoJoin, setAutoJoin] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const [vkLink, setVkLink] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [invitationStatus, setInvitationStatus] = useState<string | null>(null);
  const [configJson, setConfigJson] = useState(
    JSON.stringify({ theme: 'dark', volume: 50, targetSession: 'Mana Murtii Waliigalaa Oromiyaa', googleMeetLink: 'https://meet.google.com/abc-defg-hij', courtLogoUrl: '' }, null, 2)
  );
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState('Mana Murtii Waliigalaa Oromiyaa');
  const [qrCopyToast, setQrCopyToast] = useState<string | null>(null);
  const [hardRefreshStatus, setHardRefreshStatus] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'ws' | 'diag' | 'system' | 'transcript' | 'error'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [feedActionStatus, setFeedActionStatus] = useState<string | null>(null);
  const [transcriptItems, setTranscriptItems] = useState<{ id: string; timestamp: string; speaker: string; text: string }[]>([
    { id: 'tr-1', timestamp: '09:30:15 AM', speaker: 'Abbaa Seeraa / Bench Judge', text: 'Dhaddachi lakk. CR-2026/089 banameera. Ragaan 1ffaan jecha isaanii haa dhiyeessan.' },
    { id: 'tr-2', timestamp: '09:32:40 AM', speaker: 'Dr. Tadesse Bekele (Ragaa 1ffaa)', text: 'Waliigalteen bittaa fi gurgurtaa manaa guyyaa 2025-05-10 raawwatamee kaffaltiin baankii kaffalamuu mirkaneessa.' },
    { id: 'tr-3', timestamp: '09:36:12 AM', speaker: 'Abukaattoo Himatamaa', text: 'Gaaffii fi deebii cross-examination: Nagaheen kaffaltii DARA malee maaliif raawwatame?' },
    { id: 'tr-4', timestamp: '09:40:05 AM', speaker: 'Abbaa Seeraa / Bench Judge', text: 'SDFHH Kwt 137 bu\'uureffachuun ragaan sanadaa galmeetti qabatamee beellamni xumuraaf darbeera.' }
  ]);
  const [highlightedNewsId, setHighlightedNewsId] = useState<string | null>(null);
  const [dashboardMode, setDashboardMode] = useState<'court_dashboard' | 'kiosk_control' | 'ethiopian_calendar'>('court_dashboard');
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  // Deep Link URL Detection for News Cards
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paramNewsId = urlParams.get('newsId');
      const hash = window.location.hash.replace('#news-', '');
      const targetNewsId = paramNewsId || (hash ? hash : null);
      if (targetNewsId) {
        setHighlightedNewsId(targetNewsId);
        setTimeout(() => {
          const el = document.getElementById(`news-${targetNewsId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 350);
      }
    }
  }, []);

  const courtNewsItems: CourtNewsItem[] = [
    {
      id: 'news-summons-directive-2026',
      title: currentLang === 'om' 
        ? 'Qajeelfama Haaraa: Kaffaltii Sinqee Booda Waamicha Himatamaa Ofiisara Seeraatiin Erguu' 
        : 'አዲስ መመሪያ፡ ከሲንቄ ክፍያ ማረጋገጫ በኋላ የፍርድ ቤት መጥሪያ በህግ ኦፊሰር ስለመላክ',
      category: 'directive',
      date: '28 Onkoloolessa 2026',
      source: 'Mana Murtii Waliigalaa Oromiyaa (Oromia Supreme Court)',
      summary: currentLang === 'om'
        ? 'Galmeen erga himannaan dhihaatee kaffaltiin baankii sinqee (Dambii Lakk. 08) mirkanaa\'ee booda, ofisarri seeraa battalatti waamicha himatamaa teessoo himatamaatti erguu qaba.'
        : 'ክስ ከቀረበና የሲንቄ ባንክ ክፍያ ከተረጋገጠ በኋላ፣ የህግ ኦፊሰሩ ወዲያውኑ የተከሳሽ መጥሪያ ወደ አድራሻው መላክ አለበት።',
      fullBody: currentLang === 'om'
        ? 'Akka Seera Deemsa Falmii Hariiroo Hawaasaa (SDFHH) Kwt 94-110 tti, himataan kaffaltii erga raawwateen booda ofisarri seeraa guyyoota 3 keessatti waamicha himatamaa qopheessee karaa ofiisara deemsaa (process server), poostaa ykn beeksisaan qaqqabsiisuu qaba.'
        : 'በፍትሐብሔር ሥነ-ሥርዓት ሕግ ቁጥር 94-110 መሠረት ከፍርድ ቤት ክፍያ በኋላ የህግ ኦፊሰሩ በ3 ቀናት ውስጥ መጥሪያውን ማድረስ አለበት።',
      badge: 'Qajeelfama / Directive',
      isUrgent: true,
    },
    {
      id: 'news-cassation-art244-ruling',
      title: currentLang === 'om'
        ? 'Murtii Dhaddacha Ijibbaataa: Mormii Sadarkaa Duraa (SDFHH Kwt 244) fi Aangoo MMWF'
        : 'የሰበር ችሎት አስገዳጅ ውሳኔ፡ የመጀመሪያ ደረጃ መቃወሚያ (የፍ/ሥ/ሥ/ሕ/ቁ 244)',
      category: 'precedent',
      date: '20 Onkoloolessa 2026',
      source: 'Dhaddacha Ijibbaataa Federaalaa (Federal Cassation Division, Vol. 25)',
      summary: currentLang === 'om'
        ? 'Mormiin sadarkaa duraa yeroo darbiinsaa fi aangoo mana murtii ilaalchisee deebii dura dhihaachuu qaba; manni murtiis falmii ijoo dura murtii itti kennuu qaba.'
        : 'የይርጋ እና የሥልጣን የመጀመሪያ ደረጃ መቃወሚያ ከመከላከያ መልስ በፊት መቅረብ እና መወሰን አለበት።',
      badge: 'Murtii Ijibbaataa / Precedent',
    },
    {
      id: 'news-kiosk-live-dockets-launch',
      title: currentLang === 'om'
        ? 'Sirna Kiosk Dhaddachaa fi E-Court Virtual Meeting Bal\'inaan Hojiirra Oole'
        : 'የችሎት ኪዮስክ እና የቨርቹዋል ችሎት ስብሰባ በይፋ ሥራ ጀመረ',
      category: 'technology',
      date: '15 Onkoloolessa 2026',
      source: 'Komiishinii Dijitaalawaa Haqaa (Digital Justice Commission)',
      summary: currentLang === 'om'
        ? 'Abbootiin dhimmaa fi abukaattonni karaa Kiosk fi QR kodii saffisaan beellama, sagantaa dhaddachaa fi viidiyoo Google Meet irratti hirmaachuu danda\'u.'
        : 'ተከራካሪዎች በኪዮስክ እና በQR ኮድ በኩል የቀጠሮ ዝርዝርና የቪዲዮ ችሎትን በቀጥታ መከታተል ይችላሉ።',
      badge: 'Teknolojii / Tech Update',
    }
  ];

  const kioskUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/kiosk`
    : 'https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app/kiosk';

  // QR Code URL via QRServer API with fallback
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(kioskUrl)}&color=f59e0b&bgcolor=0f172a&margin=10`;

  // Real-Time Streaming Listener for Kiosk Session & Activity Logs
  useEffect(() => {
    const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSession(data as any);
        if (data.googleMeetLink) {
          setGoogleMeetLink(data.googleMeetLink);
        } else if (data.vkLink && !googleMeetLink) {
          setGoogleMeetLink(data.vkLink);
        }
        if (data.courtLogoUrl) {
          setCourtLogoUrl(data.courtLogoUrl);
        }
        if (data.institutionName) {
          setInstitutionName(data.institutionName);
          setTargetSession(data.institutionName);
        }
        if (data.autoJoin !== undefined) {
          setAutoJoin(data.autoJoin);
        }
        if (data.config) {
          if (data.config.theme) setTheme(data.config.theme);
          if (data.config.volume !== undefined) setVolume(data.config.volume);
          if (data.config.targetSession) setTargetSession(data.config.targetSession);
          if (data.config.googleMeetLink) setGoogleMeetLink(data.config.googleMeetLink);
          if (data.config.courtLogoUrl) setCourtLogoUrl(data.config.courtLogoUrl);
          setConfigJson(JSON.stringify(data.config, null, 2));
        }
      } else {
        await setDoc(docRef, {
          vkLink: 'https://meet.google.com/abc-defg-hij',
          googleMeetLink: 'https://meet.google.com/abc-defg-hij',
          institutionName: 'Mana Murtii Waliigalaa Oromiyaa',
          courtLogoUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=300&q=80',
          autoJoin: false,
          status: 'inactive',
          config: {
            theme: 'dark',
            volume: 50,
            targetSession: 'Mana Murtii Waliigalaa Oromiyaa',
            googleMeetLink: 'https://meet.google.com/abc-defg-hij',
            courtLogoUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=300&q=80'
          },
          lastUpdated: serverTimestamp(),
          logs: [{ timestamp: new Date().toISOString(), message: 'Kiosk session initialized with Google Meet & Court Logo support' }]
        });
      }
      setLoading(false);
    }, (err) => {
      console.error('Error listening to courtroom session:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSession = async (updates: any) => {
    try {
      const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
      await updateDoc(docRef, { ...updates, lastUpdated: serverTimestamp() });
      setSession(prev => (prev ? { ...prev, ...updates } : prev));
    } catch (err) {
      console.error('Failed to update courtroom session:', err);
    }
  };

  const handleSendEmail = async () => {
    if (!email) return;
    setEmailStatus(currentLang === 'om' ? 'Ergamaa jira...' : 'በመላክ ላይ...');
    try {
      await sendKioskLinkEmail(email, kioskUrl, institutionName || 'Courtroom');
      setEmailStatus(currentLang === 'om' ? 'Milkaa’inaan ergameera!' : 'በተሳካ ሁኔታ ተላክቷል!');
      setTimeout(() => setEmailStatus(null), 3000);
    } catch (e) {
      setEmailStatus('Error sending email');
    }
  };

  const handleSendInvitation = (method: 'email' | 'telegram' | 'sms' | 'facebook') => {
    const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const message = generateTrilingualInvitation(kioskUrl, institutionName || 'Courtroom', accessCode);

    if (method === 'email') {
      if (email) {
        sendKioskLinkEmail(email, kioskUrl, institutionName || 'Courtroom');
        setInvitationStatus('Email sent to ' + email);
      } else {
        navigator.clipboard.writeText(message);
        setInvitationStatus('Invitation copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(message);
      setInvitationStatus(`${method.toUpperCase()} invitation message copied!`);
    }
    setTimeout(() => setInvitationStatus(null), 3000);
  };

  const handlePushVisualConfig = async () => {
    try {
      setConfigStatus(currentLang === 'om' ? 'Qindaa’ina haaromsaa jira...' : 'ቅንብሩ እየተዘመነ ነው...');
      const updatedConfig = {
        theme,
        targetSession,
        volume,
        googleMeetLink,
        courtLogoUrl,
        autoJoin
      };

      const jsonString = JSON.stringify(updatedConfig, null, 2);
      setConfigJson(jsonString);

      await updateSession({
        vkLink: googleMeetLink,
        googleMeetLink: googleMeetLink,
        courtLogoUrl: courtLogoUrl,
        institutionName: targetSession,
        autoJoin: autoJoin,
        config: updatedConfig,
        logs: arrayUnion({
          timestamp: new Date().toISOString(),
          message: `Kiosk visual configuration updated: Google Meet (${googleMeetLink}), Court Logo set`
        })
      });

      setConfigStatus(currentLang === 'om' ? 'Qindaa’inni Kiosk milkaa’inaan ergameera!' : 'የኪዮስክ ቅንብር በተሳካ ሁኔታ ተላክቷል!');
      setTimeout(() => setConfigStatus(null), 3500);
    } catch (e) {
      console.error('Failed to update kiosk config:', e);
      setConfigStatus('Failed to update config');
    }
  };

  const handlePushRawJson = async () => {
    try {
      const parsedConfig = JSON.parse(configJson);
      setConfigStatus(currentLang === 'om' ? 'Qindaa’ina JSON ergaa jira...' : 'የJSON ቅንብር እየተላከ ነው...');

      if (parsedConfig.googleMeetLink) setGoogleMeetLink(parsedConfig.googleMeetLink);
      if (parsedConfig.courtLogoUrl) setCourtLogoUrl(parsedConfig.courtLogoUrl);
      if (parsedConfig.targetSession) {
        setTargetSession(parsedConfig.targetSession);
        setInstitutionName(parsedConfig.targetSession);
      }
      if (parsedConfig.theme) setTheme(parsedConfig.theme);
      if (parsedConfig.volume !== undefined) setVolume(parsedConfig.volume);
      if (parsedConfig.autoJoin !== undefined) setAutoJoin(parsedConfig.autoJoin);

      await updateSession({
        vkLink: parsedConfig.googleMeetLink || parsedConfig.vkLink || googleMeetLink,
        googleMeetLink: parsedConfig.googleMeetLink || parsedConfig.vkLink || googleMeetLink,
        courtLogoUrl: parsedConfig.courtLogoUrl || courtLogoUrl,
        institutionName: parsedConfig.targetSession || institutionName,
        autoJoin: parsedConfig.autoJoin !== undefined ? parsedConfig.autoJoin : autoJoin,
        config: parsedConfig,
        logs: arrayUnion({
          timestamp: new Date().toISOString(),
          message: `Kiosk raw JSON config updated`
        })
      });
      setConfigStatus(currentLang === 'om' ? 'JSON Qindaa’inni ergameera!' : 'የJSON ቅንብር ተላክቷል!');
      setTimeout(() => setConfigStatus(null), 3500);
    } catch (e) {
      setConfigStatus('Invalid JSON syntax');
    }
  };

  const handleCopyKioskUrl = async () => {
    try {
      await navigator.clipboard.writeText(kioskUrl);
      setQrCopyToast(currentLang === 'om' ? 'Liinkiin Kiosk waraabbameera!' : 'የኪዮስክ ሊንክ ተቀድቷል!');
      setTimeout(() => setQrCopyToast(null), 3000);
    } catch {
      setQrCopyToast('Copied: ' + kioskUrl);
    }
  };

  const handlePrintStaffNotice = () => {
    const printWin = window.open('', '_blank', 'width=700,height=800');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Courtroom Kiosk Access Notice - ${institutionName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; color: #0f172a; }
            .card { border: 2px solid #0f172a; border-radius: 16px; padding: 30px; max-w: 500px; margin: 0 auto; }
            h1 { font-size: 20px; margin-bottom: 8px; color: #b45309; }
            p { font-size: 13px; color: #475569; line-height: 1.5; }
            .qr-frame { margin: 20px auto; width: 220px; height: 220px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 12px; }
            .qr-frame img { width: 100%; height: 100%; object-fit: contain; }
            .url-box { font-family: monospace; font-size: 11px; background: #f1f5f9; padding: 10px; border-radius: 8px; word-break: break-all; margin-top: 15px; }
            .footer { margin-top: 25px; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🏛️ ${institutionName}</h1>
            <p><strong>Courtroom Kiosk Mobile Quick Access / Dhaddacha Kiosk</strong></p>
            <p>Court staff & judicial officers: Scan this QR code with your mobile camera to launch the interactive courtroom kiosk interface immediately.</p>
            <div class="qr-frame">
              <img src="${qrCodeApiUrl}" alt="Kiosk QR Code" />
            </div>
            <div class="url-box">${kioskUrl}</div>
            <div class="footer">Generated via SAI Ethio SeeraAI Legal Platform • Confidential Judicial Access</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleHardRefresh = async () => {
    setHardRefreshStatus(currentLang === 'om' ? 'Ergamaa jira...' : 'በመላክ ላይ...');
    try {
      // Send WebSocket Hard Refresh signal via REST API
      const res = await fetch('/api/kiosk/hard-refresh', { method: 'POST' });
      const json = await res.json();

      // Also set Firestore hardRefreshTrigger for fallback
      const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
      await updateDoc(docRef, {
        hardRefreshTrigger: serverTimestamp(),
        logs: arrayUnion({ timestamp: new Date(), message: 'Hard Refresh signal sent via WebSocket & Firestore' })
      });

      setHardRefreshStatus(currentLang === 'om'
        ? `Haromsaa WSS ergameera! (${json.broadcastCount || 0} client(s))`
        : `የሃርድ ሪፍሬሽ መልእክት ተላክቷል! (${json.broadcastCount || 0} client(s))`);
      setTimeout(() => setHardRefreshStatus(null), 4000);
    } catch (err) {
      console.error('Failed to trigger hard refresh:', err);
      setHardRefreshStatus('Error sending hard refresh signal');
    }
  };

  const handleRefreshLogs = async () => {
    setHardRefreshStatus(currentLang === 'om' ? 'Loogota haaromsaa jira...' : 'ሎጎችን በማደስ ላይ...');
    try {
      const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
      await updateDoc(docRef, {
        refreshLogsTrigger: serverTimestamp(),
        logs: arrayUnion({ timestamp: new Date(), message: 'Manual Log Refresh triggered via Dashboard', type: 'command' })
      });

      setHardRefreshStatus(currentLang === 'om'
        ? 'Gaaffiin haaromsa loogotaa ergameera!'
        : 'የሎግ ማደሻ መልእክት ተላክቷል!');
      setTimeout(() => setHardRefreshStatus(null), 4000);
    } catch (err) {
      console.error('Failed to trigger log refresh:', err);
      setHardRefreshStatus('Error sending log refresh signal');
    }
  };

  const handleClearLogs = async () => {
    try {
      const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
      await updateDoc(docRef, {
        logs: [{
          timestamp: new Date().toISOString(),
          message: 'Logs cleared by administrator'
        }]
      });
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  };

  const handleExportLogs = () => {
    if (!session?.logs) return;
    const blob = new Blob([JSON.stringify(session.logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiosk_session_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearTranscriptFeed = async () => {
    setTranscriptItems([]);
    await handleClearLogs();
    setFeedActionStatus(currentLang === 'om' ? 'Transcript feed fi session logs qulqullaa\'eera!' : 'Transcript feed and session logs cleared successfully!');
    setTimeout(() => setFeedActionStatus(null), 3500);
  };

  const handleDownloadTranscriptFeed = () => {
    if (transcriptItems.length > 0) {
      downloadCourtTranscriptPDF({
        caseNumber: targetSession || 'CR-2026/089',
        caseTitle: 'Courtroom Control Dashboard Live Transcript Feed',
        sessionTitle: 'Real-Time Courtroom Speech Transcript Stream',
        sessionDate: new Date().toLocaleDateString(),
        sessionType: 'courtroom_live_transcript',
        witnessName: 'Multiple Courtroom Participants',
        transcriptText: transcriptItems.map((item) => `[${item.timestamp}] ${item.speaker}: ${item.text}`).join('\n\n'),
        timestamps: transcriptItems.map((item) => ({
          time: item.timestamp,
          speaker: item.speaker,
          text: item.text,
        })),
        keyLegalTakeaways: [
          'Live transcript feed recorded in Courtroom Control Dashboard.',
          'Official Real-Time Recording Index.',
        ],
        courtName: institutionName || 'Mana Murtii Waliigalaa Oromiyaa',
        judgeName: user?.displayName || 'Honorable Bench Judge',
        loggedBy: user?.email || 'Control Dashboard Admin',
        isVerified: true,
        currentLang,
      });
      setFeedActionStatus(currentLang === 'om' ? 'Transcript PDF bu\'ee jira!' : 'Transcript PDF downloaded successfully!');
    } else {
      handleExportLogs();
      setFeedActionStatus(currentLang === 'om' ? 'Logs JSON bu\'ee jira!' : 'Session logs exported successfully!');
    }
    setTimeout(() => setFeedActionStatus(null), 3500);
  };

  if (loading) {
    return (
      <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-amber-400 font-mono text-xs animate-pulse">Loading Kiosk Control Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-8 max-w-6xl mx-auto text-slate-100">
      {/* Top View Mode Navigation Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-xl text-slate-950 font-bold text-lg">
            🏛️
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Mana Murtii Aanaa Gurbicha</h2>
            <p className="text-[11px] text-slate-400 font-mono">E-Court & Judicial Management Suite</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDashboardMode('court_dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dashboardMode === 'court_dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            📊 Aanaa Gurbicha Daashboordii
          </button>
          <button
            type="button"
            onClick={() => setDashboardMode('kiosk_control')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dashboardMode === 'kiosk_control'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ⚙️ Kiosk Control & Stream
          </button>
          <button
            type="button"
            onClick={() => setDashboardMode('ethiopian_calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dashboardMode === 'ethiopian_calendar'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            📅 Ethiopian Calendar
          </button>
        </div>
      </div>

      {dashboardMode === 'court_dashboard' ? (
        <AanaaGurbichaECourtDashboard currentLang={currentLang} />
      ) : dashboardMode === 'ethiopian_calendar' ? (
        <div className="p-6">
          <CourtHearingCalendar currentLang={currentLang} />
        </div>
      ) : (
        <>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-2xl shrink-0">
            ⚙️
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-legal text-amber-400">
              {t.courtroomControl.title} (Kiosk Control Dashboard)
            </h2>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'To’annoo Kiosk dhaddacha mana murtii, push configuration, fi QR kodii saffisaa'
                : 'የፍርድ ቤት ኪዮስክ ቁጥጥር፣ የቅንብር ዝመና እና ፈጣን የQR ኮድ'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${
              session?.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${session?.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>Kiosk Status: {session?.status === 'active' ? 'ACTIVE' : 'INACTIVE'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stream Link, Control Actions, and Quick Access QR Code */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stream & Live Link Control */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 font-serif-legal flex items-center gap-2">
              <span>📹</span>
              <span>Live Meeting / Video Stream Link (VK / Conference Link)</span>
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">{t.courtroomControl.linkPlaceholder}</label>
              <input
                type="text"
                value={vkLink}
                onChange={(e) => setVkLink(e.target.value)}
                placeholder="https://vk.com/call/join/... or WebRTC meeting URL"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => updateSession({ vkLink })}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                {t.courtroomControl.updateLink}
              </button>

              <button
                type="button"
                onClick={() => updateSession({ status: 'active' })}
                className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                  session?.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t.courtroomControl.activate}
              </button>

              <button
                type="button"
                onClick={() => updateSession({ status: 'inactive' })}
                className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                  session?.status === 'inactive' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t.courtroomControl.deactivate}
              </button>
            </div>
          </div>

          {/* Quick Access QR Code Section */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-amber-400 font-serif-legal flex items-center gap-2">
                <span>📱</span>
                <span>Quick Access QR Code (Dhaddacha Mobile QR)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Court Staff Scan
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentLang === 'om'
                ? 'Hojjettoonni mana murtii fi abbootiin seeraa kaameraa mobaayila isaaniitiin QR kodii kana skaanii gochuun kallattiin gara Kiosk dhaddachaatti seenuu danda’u.'
                : 'የፍርድ ቤት ሰራተኞች እና ዳኞች የስልክ ካሜራቸውን በመጠቀም ይህንን QR ኮድ በማንበብ በቀጥታ ወደ ችሎቱ ኪዮስክ መግባት ይችላሉ።'}
            </p>

            {qrCopyToast && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-in fade-in">
                ✓ {qrCopyToast}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-900 border border-slate-800">
              {/* QR Code Container */}
              <div className="w-44 h-44 bg-slate-950 p-2.5 rounded-2xl border border-amber-500/40 shadow-xl shrink-0 flex items-center justify-center">
                <img
                  src={qrCodeApiUrl}
                  alt="Kiosk Session QR Code"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    // Fallback to text preview if offline
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* QR Actions & Details */}
              <div className="space-y-3 flex-1 min-w-0 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block uppercase">Direct Kiosk URL:</span>
                  <div className="font-mono text-[11px] text-amber-300 bg-slate-950 p-2 rounded-lg border border-slate-800 truncate">
                    {kioskUrl}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyKioskUrl}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    <span>📋</span>
                    <span>Copy Link</span>
                  </button>

                  <a
                    href={kioskUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1 border border-slate-700"
                  >
                    <span>🔗</span>
                    <span>Open Kiosk</span>
                  </a>

                  <button
                    type="button"
                    onClick={handlePrintStaffNotice}
                    className="px-3 py-1.5 rounded-xl bg-sky-950 hover:bg-sky-900 text-sky-300 font-bold text-xs border border-sky-500/40 cursor-pointer flex items-center gap-1"
                  >
                    <span>🖨️</span>
                    <span>Print Notice</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Diagnostics & Emergency Reset Controls */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 font-serif-legal flex items-center gap-2">
              <span>🛠️</span>
              <span>Hardware Diagnostics & Kiosk Reset</span>
            </h3>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleHardRefresh}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>⚡</span>
                <span>Hard Refresh (WebSocket Signal)</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setHardRefreshStatus(currentLang === 'om' ? 'Capturing...' : 'ፎቶ እየተነሳ ነው...');
                  try {
                    // Send WebSocket Screen Capture signal via REST API
                    const res = await fetch('/api/kiosk/trigger-capture', { method: 'POST' });
                    const json = await res.json();
                    
                    const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
                    await updateDoc(docRef, {
                      captureTrigger: serverTimestamp(),
                      logs: arrayUnion({ timestamp: new Date(), message: 'Remote screen capture triggered via Dashboard', type: 'command' })
                    });

                    setHardRefreshStatus(currentLang === 'om' 
                      ? `Capture signal ergameera! (${json.broadcastCount || 0} active)` 
                      : `የፎቶ ትዕዛዝ ተልኳል! (${json.broadcastCount || 0} active)`);
                    setTimeout(() => setHardRefreshStatus(null), 4000);
                  } catch (err) {
                    setHardRefreshStatus('Error sending capture signal');
                  }
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>📸</span>
                <span>Trigger Remote Screen Capture</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setHardRefreshStatus(currentLang === 'om' ? 'Rebooting...' : 'ዳግም እየተነሳ ነው...');
                  try {
                    // Send WebSocket Hard Refresh signal via REST API
                    const res = await fetch('/api/kiosk/hard-refresh', { method: 'POST' });
                    const json = await res.json();
                    
                    const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
                    await updateDoc(docRef, {
                      resetTrigger: serverTimestamp(),
                      logs: arrayUnion({ timestamp: new Date(), message: 'Remote Reboot command issued via Dashboard', type: 'command' })
                    });

                    setHardRefreshStatus(currentLang === 'om' 
                      ? `Reboot signal ergameera! (${json.broadcastCount || 0} active)` 
                      : `ሪቡት መልእክት ተላክቷል! (${json.broadcastCount || 0} active)`);
                    setTimeout(() => setHardRefreshStatus(null), 4000);
                  } catch (err) {
                    setHardRefreshStatus('Error sending reboot signal');
                  }
                }}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>🔌</span>
                <span>Remote Reboot/Reset Kiosk</span>
              </button>

              <button
                type="button"
                onClick={() => updateSession({ diagnosticsTrigger: serverTimestamp() })}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>🔍</span>
                <span>Run Hardware Diagnostics</span>
              </button>

              <button
                type="button"
                onClick={() => updateSession({ resetTrigger: serverTimestamp() })}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>Reset Kiosk Session</span>
              </button>
            </div>

            {/* Screen Capture Preview Section */}
            {session?.lastScreenCapture && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>🖼️</span>
                    <span>Live Kiosk Screen Preview (Last Verified View)</span>
                  </h4>
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = session.lastScreenCapture!;
                      link.download = `kiosk_capture_${Date.now()}.jpg`;
                      link.click();
                    }}
                    className="text-[10px] text-sky-400 hover:underline"
                  >
                    Download Full View
                  </button>
                </div>
                <div className="relative aspect-video w-full bg-black rounded-xl border border-slate-800 overflow-hidden shadow-inner group">
                  <img 
                    src={session.lastScreenCapture} 
                    alt="Kiosk Screen Capture" 
                    className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                    <span className="text-[9px] font-mono text-slate-300">
                      Captured At: {session.lastUpdated?.toDate ? session.lastUpdated.toDate().toLocaleString() : new Date().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {hardRefreshStatus && (
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-bold animate-in fade-in flex items-center gap-2">
                <span>⚡</span>
                <span>{hardRefreshStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Push Configuration & Invitation Service */}
        <div className="lg:col-span-5 space-y-6">
          {/* Interactive Kiosk Configuration Panel */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm">🎛️</span>
                <h3 className="text-sm font-bold text-amber-400 font-serif-legal">
                  {currentLang === 'om' ? 'Qindaa’ina Kiosk & Google Meet' : 'የኪዮስክ እና የGoogle Meet ቅንብር'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-300 transition-all cursor-pointer"
              >
                {showRawJson ? '⚙️ Visual Form Mode' : '💻 JSON Developer Mode'}
              </button>
            </div>

            {!showRawJson ? (
              <div className="space-y-4 text-xs">
                {/* 1. Google Meet / Live Video Stream Link */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-amber-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>📹</span>
                      <span>Link Google Meet / Meeting URL:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setGoogleMeetLink('https://meet.google.com/abc-defg-hij')}
                      className="text-[10px] text-sky-400 hover:underline font-normal cursor-pointer"
                    >
                      Preset Example
                    </button>
                  </label>
                  <input
                    type="url"
                    value={googleMeetLink}
                    onChange={(e) => setGoogleMeetLink(e.target.value)}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* 2. Workplace / Court Institution Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <span>🏛️</span>
                    <span>{currentLang === 'om' ? 'Maqaa Mana Murtii / Dhaabbata:' : 'የፍርድ ቤት / ተቋም ስም:'}</span>
                  </label>
                  <input
                    type="text"
                    value={targetSession}
                    onChange={(e) => {
                      setTargetSession(e.target.value);
                      setInstitutionName(e.target.value);
                    }}
                    placeholder="Mana Murtii Waliigalaa Oromiyaa"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* 3. Court Logo Selection & Custom Image URL */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <span>🖼️</span>
                    <span>{currentLang === 'om' ? 'Loogoo Mana Murtii / Custom Logo URL:' : 'የፍርድ ቤት ሎጎ / ምስል:'}</span>
                  </label>

                  {/* Preset Logo Thumbnails */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCourtLogoUrl('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=300&q=80')}
                      className={`p-2 rounded-xl border text-[10px] font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        courtLogoUrl.includes('photo-1589829545856') ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">🏛️</span>
                      <span className="truncate w-full text-center">High Court</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCourtLogoUrl('/assets/images/seeraai_authoritative_logo_1792935506374.jpg')}
                      className={`p-2 rounded-xl border text-[10px] font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        courtLogoUrl.includes('seeraai_authoritative_logo') ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">⚖️</span>
                      <span className="truncate w-full text-center">Lady Justice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCourtLogoUrl('https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=300&q=80')}
                      className={`p-2 rounded-xl border text-[10px] font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        courtLogoUrl.includes('photo-1505664194779') ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">📜</span>
                      <span className="truncate w-full text-center">Federal Seal</span>
                    </button>
                  </div>

                  {/* Custom URL Input & Live Logo Preview */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="url"
                      value={courtLogoUrl}
                      onChange={(e) => setCourtLogoUrl(e.target.value)}
                      placeholder="Paste Custom Image Logo URL (https://...)"
                      className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-[11px] focus:border-amber-500 focus:outline-none"
                    />
                    {courtLogoUrl && (
                      <div className="w-10 h-10 rounded-xl border border-amber-500/40 bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                        <img
                          src={courtLogoUrl}
                          alt="Court Logo Preview"
                          className="w-full h-full object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Kiosk Theme & Audio Volume */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {currentLang === 'om' ? 'Mosaajii Theme:' : 'የኪዮስክ ጭብጥ (Theme):'}
                    </label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as any)}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="dark">🌙 Dark Slate</option>
                      <option value="midnight">🌌 Midnight Blue</option>
                      <option value="gold">🏆 Legal Gold</option>
                      <option value="light">☀️ High Contrast</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {currentLang === 'om' ? `Sagalee (Volume: ${volume}%):` : `ድምፅ (Volume: ${volume}%):`}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer mt-1"
                    />
                  </div>
                </div>

                {/* 5. Auto-Join Switch */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-200 block text-xs">
                      {currentLang === 'om' ? 'Auto-Join Google Meet' : 'Google Meet በራሱ ይክፈት'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {currentLang === 'om' ? 'Kiosk battalatti gara Google Meet re-direct godha' : 'ኪዮስክ በቀጥታ ወደ ስብሰባው ይወስዳል'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoJoin}
                    onChange={(e) => setAutoJoin(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {/* Push Configuration Button */}
                <button
                  type="button"
                  onClick={handlePushVisualConfig}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <span>🚀</span>
                  <span>{currentLang === 'om' ? 'Qindaa’ina Kiosk Ergi (Push Config)' : 'ቅንብር ወደ ኪዮስክ ላክ (Push Config)'}</span>
                </button>
              </div>
            ) : (
              /* Developer Raw JSON Editor */
              <div className="space-y-3">
                <textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  rows={8}
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none leading-relaxed"
                />

                <button
                  type="button"
                  onClick={handlePushRawJson}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Push Raw JSON Config
                </button>
              </div>
            )}

            {configStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-bold text-center animate-in fade-in">
                ✓ {configStatus}
              </div>
            )}
          </div>

          {/* Invitation Service */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 font-serif-legal flex items-center gap-2">
              <span>📩</span>
              <span>Trilingual Kiosk Invitation Service</span>
            </h3>

            <div className="space-y-2.5">
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Institution Name (e.g. Oromia High Court)"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Recipient Email (ayeledha@gmail.com)"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendInvitation('email')}
                  className="bg-sky-600 hover:bg-sky-500 py-2 rounded-xl text-xs text-white font-bold transition-all cursor-pointer"
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => handleSendInvitation('telegram')}
                  className="bg-sky-500 hover:bg-sky-400 py-2 rounded-xl text-xs text-white font-bold transition-all cursor-pointer"
                >
                  Telegram
                </button>
                <button
                  type="button"
                  onClick={() => handleSendInvitation('sms')}
                  className="bg-slate-700 hover:bg-slate-600 py-2 rounded-xl text-xs text-white font-bold transition-all cursor-pointer"
                >
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() => handleSendInvitation('facebook')}
                  className="bg-blue-700 hover:bg-blue-600 py-2 rounded-xl text-xs text-white font-bold transition-all cursor-pointer"
                >
                  Facebook
                </button>
              </div>

              {invitationStatus && (
                <p className="text-xs text-emerald-400 font-bold animate-in fade-in pt-1">
                  ✓ {invitationStatus}
                </p>
              )}
            </div>
          </div>

          {/* Real-Time Session Logs & Live Transcript Stream */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            {/* Header Aligned with Existing Dashboard Layout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <Mic className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-serif-legal flex items-center gap-2">
                    <span>{currentLang === 'om' ? '🎙️ Waraabbata Jecha Dhaddachaa (Live Transcript Feed)' : '🎙️ የችሎት የቀጥታ ቃለ-ጉባዔ stream (Live Transcript Feed)'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentLang === 'om' ? 'Waraabbata sagalee dhaddachaa real-time irratti darbu fi logs to’annoo kiosk' : 'የችሎቱ የቀጥታ ድምፅ ትራንስክሪፕት እና የኪዮስክ ሲስተም ሎጎች'}
                  </p>
                </div>
              </div>

              {/* Header Quick-Action Buttons Aligned with Layout */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1.5 mr-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE TRANSCRIPT
                </span>

                {/* Download Quick-Action Button */}
                <button
                  type="button"
                  onClick={handleDownloadTranscriptFeed}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl border border-emerald-400/30 shadow transition-all cursor-pointer flex items-center gap-1.5"
                  title="Download transcript feed & session logs as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                {/* Refresh Logs Button */}
                <button
                  type="button"
                  onClick={handleRefreshLogs}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl border border-amber-400/30 shadow transition-all cursor-pointer flex items-center gap-1.5"
                  title="Force-fetch latest events from courtroom kiosk"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Logs</span>
                </button>

                {/* Clear Feed Button */}
                <button
                  type="button"
                  onClick={handleClearTranscriptFeed}
                  className="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 hover:text-white text-xs font-bold rounded-xl border border-rose-500/30 shadow transition-all cursor-pointer flex items-center gap-1.5"
                  title="Clear transcript feed items & session logs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                  <span>Clear Feed</span>
                </button>
              </div>
            </div>

            {/* Action Feedback Toast */}
            {feedActionStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-in fade-in flex items-center justify-between">
                <span>✓ {feedActionStatus}</span>
                <span className="text-[10px] font-mono text-emerald-400">UPDATED</span>
              </div>
            )}

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px]">
                {(['all', 'transcript', 'ws', 'diag', 'system', 'error'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setLogFilter(filter as any)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold capitalize transition-all cursor-pointer ${
                      logFilter === filter
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter === 'transcript' ? 'Transcripts' : filter === 'ws' ? 'WebSocket' : filter === 'diag' ? 'Diagnostics' : filter}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search transcripts or logs..."
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-[11px] font-mono w-36 focus:w-48 focus:border-amber-500 focus:outline-none transition-all"
              />
            </div>

            {/* Live Transcript Dialogue Feed Display */}
            {(logFilter === 'all' || logFilter === 'transcript') && transcriptItems.length > 0 && (
              <div className="space-y-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800/90 max-h-48 overflow-y-auto">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block flex items-center justify-between">
                  <span>📜 Live Verbatim Transcript Stream ({transcriptItems.length} entries):</span>
                  <span className="text-[9px] text-slate-500 font-normal">Auto-Synced</span>
                </span>
                <div className="space-y-1.5">
                  {transcriptItems.map((item) => (
                    <div key={item.id} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                            {item.timestamp}
                          </span>
                          <span className="font-bold text-slate-200 text-[11px]">{item.speaker}:</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed pl-1">{item.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`[${item.timestamp}] ${item.speaker}: ${item.text}`);
                          setFeedActionStatus('Copied transcript quote');
                          setTimeout(() => setFeedActionStatus(null), 2000);
                        }}
                        className="p-1 text-slate-500 hover:text-amber-300 transition-colors shrink-0"
                        title="Copy Quote"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Log Output Stream Box */}
            {(logFilter !== 'transcript') && (
              <div
                ref={logsContainerRef}
                className="h-64 overflow-y-auto bg-slate-950/90 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] space-y-2.5 shadow-inner"
              >
                {session?.logs && session.logs.length > 0 ? (
                  [...session.logs]
                    .filter((log) => {
                      const msg = (log.message || '').toLowerCase();
                      const type = (log.type || '').toLowerCase();
                      if (logSearch && !msg.includes(logSearch.toLowerCase())) return false;
                      if (logFilter === 'ws') return msg.includes('websocket') || msg.includes('ws');
                      if (logFilter === 'diag') return msg.includes('diagnostics') || msg.includes('cpu');
                      if (logFilter === 'system') return msg.includes('refresh') || msg.includes('reset') || msg.includes('initialized') || type === 'command';
                      if (logFilter === 'error') return msg.includes('error') || msg.includes('failed') || type === 'error';
                      return true;
                    })
                    .reverse() // Most recent first for history
                    .map((log, i) => {
                      const msg = log.message || '';
                      const type = log.type || 'info';
                      let msgColor = 'text-slate-300';
                      let badge = '📌';
                      let rowClass = 'border-slate-800/40';

                      if (msg.toLowerCase().includes('websocket') || msg.toLowerCase().includes('wss')) {
                        msgColor = 'text-sky-300';
                        badge = '⚡';
                      } else if (msg.toLowerCase().includes('diagnostics') || msg.toLowerCase().includes('cpu')) {
                        msgColor = 'text-purple-300';
                        badge = '🔍';
                      } else if (msg.toLowerCase().includes('refresh') || msg.toLowerCase().includes('reset') || type === 'command') {
                        msgColor = 'text-amber-300';
                        badge = '🔄';
                      } else if (msg.toLowerCase().includes('identified') || msg.toLowerCase().includes('connected')) {
                        msgColor = 'text-emerald-300';
                        badge = '🏛️';
                      } else if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') || type === 'error') {
                        msgColor = 'text-rose-400';
                        badge = '⚠️';
                        rowClass = 'bg-rose-500/5 border-rose-500/10';
                      }

                      const timeFormatted = log.timestamp?.seconds
                        ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                        : typeof log.timestamp === 'string'
                        ? new Date(log.timestamp).toLocaleString()
                        : new Date().toLocaleString();

                      return (
                        <div key={i} className={`flex items-start gap-3 border-b pb-2.5 transition-colors ${rowClass}`}>
                           <div className="flex flex-col gap-0.5 shrink-0 min-w-[130px]">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{timeFormatted.split(',')[0]}</span>
                              <span className="text-amber-400/80 font-bold">{timeFormatted.split(',')[1]}</span>
                           </div>
                           <span className="shrink-0 text-xs">{badge}</span>
                           <div className="flex-1">
                              <span className={`${msgColor} leading-snug break-words font-medium`}>{msg}</span>
                              {type === 'error' && (
                                <div className="mt-1 px-2 py-0.5 rounded bg-rose-500/10 text-[9px] text-rose-300 border border-rose-500/20 inline-block uppercase font-bold">
                                   System Error Event
                                </div>
                              )}
                           </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 opacity-60">
                     <Clock className="w-8 h-8" />
                     <p className="italic text-xs font-serif-legal">No activity logs recorded for this session yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Courtroom News & Legal Bulletins Section with Share Button */}
      <div className="pt-6 border-t border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-lg">
              📰
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Oduu & Qajeelfamoota Dhaddachaa (Courtroom News & Bulletins)' : 'የችሎት ዜና እና መመሪያዎች (News Cards)'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' 
                  ? 'Qajeelfamoota haaraa, murtiiwwan ijibbaataa fi beeksisa dhaddachaa deep linkiin share godhaa.' 
                  : 'የቅርብ ጊዜ የችሎት ዜናዎችን፣ የሰበር ውሳኔዎችን እና መመሪያዎችን ያጋሩ።'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-amber-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl self-start sm:self-auto">
            {courtNewsItems.length} {currentLang === 'om' ? 'Oduulee Argaman' : 'News Available'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courtNewsItems.map(news => (
            <CourtroomNewsCard
              key={news.id}
              news={news}
              currentLang={currentLang}
              isHighlighted={highlightedNewsId === news.id}
              onSelect={(selected) => setHighlightedNewsId(selected.id)}
            />
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default ControlDashboardView;
