import React, { useState, useEffect, useRef } from 'react';
import { Language, translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { generateLegalContent } from '../services/api';
import { getAppBaseUrl } from '../services/shareUrl';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Share2,
  Copy,
  Check,
  Users,
  MessageSquare,
  FileText,
  Scale,
  Sparkles,
  ExternalLink,
  Shield,
  Clock,
  Maximize2,
  Download,
  Send,
  HelpCircle,
  Gavel,
  RefreshCw,
  Plus,
  BookOpen,
  Paperclip,
  File,
  Type,
  X,
  Eye
} from 'lucide-react';
import { LegalCitationFinder } from '../components/LegalCitationFinder';
import { VoiceDictation, SUPPORTED_SPEECH_DIALECTS } from '../components/VoiceDictation';
import { transcribeSpeechAudio } from '../services/api';

interface LegalMeetingRoomViewProps {
  currentLang: Language;
  initialRoomId?: string;
  initialTopic?: string;
  onNavigateTab?: (tab: string) => void;
}

interface Participant {
  id: string;
  name: string;
  role: 'Judge' | 'Advocate' | 'Plaintiff' | 'Defendant' | 'Witness' | 'Clerk' | 'Observer';
  isAudioOn: boolean;
  isVideoOn: boolean;
  joinedAt: string;
}

interface MeetingMessage {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
  isAi?: boolean;
  attachment?: {
    name: string;
    url: string;
    type: 'pdf' | 'word' | 'image' | 'text';
  };
}

export const LegalMeetingRoomView: React.FC<LegalMeetingRoomViewProps> = ({
  currentLang,
  initialRoomId,
  initialTopic,
  onNavigateTab,
}) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();

  // Read room from URL or props or default
  const [roomId, setRoomId] = useState<string>(() => {
    if (initialRoomId) return initialRoomId;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('room') || p.get('meeting') || p.get('meet') || p.get('conference') || p.get('targetId') || 'seera-collab-room-01';
    }
    return 'seera-collab-room-01';
  });

  const [topic, setTopic] = useState<string>(() => {
    if (initialTopic) return initialTopic;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('topic') || (currentLang === 'om' ? 'Marii Falmii Seeraa & Qophii Sanadaa' : currentLang === 'am' ? 'የሕግ ክርክር እና የሰነድ ዝግጅት ስብሰባ' : 'Legal Case Conference & Document Review');
    }
    return 'Legal Case Conference';
  });

  // Participant Identity (Supports Guests entering directly via Chrome/Edge)
  const defaultDisplayName = profile?.visitorName || profile?.appUsername || user?.displayName || (typeof localStorage !== 'undefined' ? localStorage.getItem('seera_meeting_guest_name') : '') || '';
  const [userName, setUserName] = useState<string>(defaultDisplayName);
  const [userRole, setUserRole] = useState<'Judge' | 'Advocate' | 'Plaintiff' | 'Defendant' | 'Witness' | 'Clerk' | 'Observer'>('Advocate');
  const [isJoined, setIsJoined] = useState<boolean>(Boolean(defaultDisplayName));

  // Meeting active tab inside sidebar
  const [activeSidebarTab, setActiveSidebarTab] = useState<'notes' | 'ai' | 'citations' | 'chat' | 'participants'>('notes');

  // Shared Case Notes State
  const [caseNotes, setCaseNotes] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(`seera_meeting_notes_${roomId}`) || '';
    }
    return '';
  });
  const [caseNumber, setCaseNumber] = useState<string>('Lakk. Galmee 249062/2017');
  const [courtName, setCourtName] = useState<string>('Mana Murtii Waliigalaa Federaalaa / Oromiyaa');
  const [isNotesSaved, setIsNotesSaved] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [dictationLang, setDictationLang] = useState<Language>(currentLang);

  // In-Meeting AI Assistant State
  const [aiQuery, setAiQuery] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiAnswers, setAiAnswers] = useState<Array<{ query: string; answer: string; timestamp: string }>>([]);

  // In-Meeting Chat State
  const [chatMessages, setChatMessages] = useState<MeetingMessage[]>([
    {
      id: 'm1',
      senderName: 'SEERAAI Legal Bot',
      senderRole: 'AI Judicial Co-Counsel',
      text: currentLang === 'om'
        ? "Baga nagaan dhuftan! Iddoon walgahii kun Chrome, Edge fi browser hunda irratti qajeeltoo seeraan deeggarameera. Gaaffii seeraa, qabiyyee keeyyataa fi murtii ijibbaataa battalatti as keessaa gaafachuu dandeessu."
        : currentLang === 'am'
        ? "እንኳን ደህና መጡ! ይህ የስብሰባ ክፍል በ Chrome፣ Edge እና በሁሉም ብሮውዘሮች ላይ ያለምንም እንከን ይሰራል። የሕግ ጥያቄዎችን፣ የሕግ አንቀጾችን እና የሰበር ውሳኔዎችን በቀጥታ እዚህ መጠየቅ ይችላሉ።"
        : "Welcome! This legal conference room is optimized for Chrome, Edge, and all browsers. Ask statutory articles, Cassation precedents, and judicial guidance on the fly.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAi: true,
    },
  ]);
  const [newChatMessage, setNewChatMessage] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Participants list
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: 'p1',
      name: userName || 'Ogeessa Seeraa (Legal Counsel)',
      role: userRole,
      isAudioOn: true,
      isVideoOn: true,
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Copy Feedback Toasts
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Direct WebRTC Jitsi Meeting URL
  const sanitizedRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, '-').substring(0, 32);
  const jitsiMeetingUrl = `https://meet.jit.si/SEERAAI-LegalCollab-${sanitizedRoom}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;

  // Hidden File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Modal State
  const [previewAttachment, setPreviewAttachment] = useState<MeetingMessage['attachment'] | null>(null);

  // Permanent Shareable Link resolving to the current live application
  const liveBase = getAppBaseUrl();
  const shareableMeetingUrl = `${liveBase}/?room=${encodeURIComponent(roomId)}&topic=${encodeURIComponent(topic)}&tab=meeting`;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Save notes locally
  const handleSaveNotes = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`seera_meeting_notes_${roomId}`, caseNotes);
      setIsNotesSaved(true);
      setTimeout(() => setIsNotesSaved(false), 2500);
    }
  };

  // Join meeting as guest / user
  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('seera_meeting_guest_name', userName.trim());
    }
    setParticipants((prev) => [
      ...prev.filter((p) => p.name !== userName.trim()),
      {
        id: `p_${Date.now()}`,
        name: userName.trim(),
        role: userRole,
        isAudioOn: true,
        isVideoOn: true,
        joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setIsJoined(true);
  };

  // Copy shareable meeting link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableMeetingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  // Copy full meeting invitation message
  const handleCopyInviteText = async () => {
    const inviteText = currentLang === 'om'
      ? `⚖️ WAAMICHA WALGAHII & MARII SEERAA (SEERAAI LEGAL CONFERENCE)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 Mata Duree: ${topic}\n🏛️ Dhimma/Galmee: ${caseNumber}\n🔗 Linkii Banuuf (Chrome / Edge / Browser Kamiyyuu):\n${shareableMeetingUrl}\n\nQajeelfama: Linkii kana tuquun kallattiin browser keessaniin seenuu dandeessu. Appii biraa fe'uun hin barbaachisu.`
      : currentLang === 'am'
      ? `⚖️ የሕግ ስብሰባ እና የክርክር ውይይት ጥሪ (SEERAAI LEGAL CONFERENCE)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 ርዕስ፡ ${topic}\n🏛️ የመዝገብ ቁጥር፡ ${caseNumber}\n🔗 ለመግባት ይህን ማስፈንጠሪያ ይጫኑ (Chrome / Edge / በማናቸውም ብሮውዘር)፡\n${shareableMeetingUrl}\n\nማሳሰቢያ፡ ይህን ማስፈንጠሪያ በመጫን በቀጥታ በስልክዎ ወይም በኮምፒውተርዎ ብሮውዘር መሳተፍ ይችላሉ። ተጨማሪ አፕሊኬሽን መጫን አያስፈልግም።`
      : `⚖️ SEERAAI LEGAL CASE CONFERENCE & LIVE COLLABORATION\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 Topic: ${topic}\n🏛️ Case File: ${caseNumber}\n🔗 Direct Join Link (Chrome, Edge, Safari, Any Browser):\n${shareableMeetingUrl}\n\nInstructions: Click the link above to join immediately in your browser. No downloads or installations required.`;

    try {
      await navigator.clipboard.writeText(inviteText);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      // fallback
    }
  };

  // Ask In-Meeting Legal AI Co-Counsel
  const handleAskInMeetingAI = async (customPrompt?: string) => {
    const queryToAsk = customPrompt || aiQuery;
    if (!queryToAsk.trim()) return;

    setIsAiLoading(true);
    try {
      const res = await generateLegalContent({
        prompt: queryToAsk,
        taskType: 'explain_law',
        outputLanguages: [currentLang],
        modelTier: 'gemini-3.8-flash',
      });

      const answerText = res?.content || (currentLang === 'om' ? 'Ragaan seeraa gahaa hin jiru.' : 'በቂ የሕግ መረጃ የለም።');
      setAiAnswers((prev) => [
        {
          query: queryToAsk,
          answer: answerText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setAiQuery('');
    } catch (err: any) {
      setAiAnswers((prev) => [
        {
          query: queryToAsk,
          answer: currentLang === 'om' ? `Dogoggorri uumameera: ${err?.message || 'Qorannoon seeraa hin milkoofne'}` : `ስህተት ተከስቷል: ${err?.message || 'ትንታኔ ማግኘት አልተቻለም'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Send message to meeting chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    const msg: MeetingMessage = {
      id: `msg_${Date.now()}`,
      senderName: userName || 'Legal Participant',
      senderRole: userRole,
      text: newChatMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, msg]);
    setNewChatMessage('');
  };

  // Handle File Selection for Chat
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const type: 'pdf' | 'word' | 'image' | 'text' = 
        file.type.includes('pdf') ? 'pdf' :
        file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx') ? 'word' :
        file.type.includes('image') ? 'image' : 'text';
      
      // Simulate an upload URL
      const url = URL.createObjectURL(file);

      const msg: MeetingMessage = {
        id: `msg_file_${Date.now()}_${Math.random()}`,
        senderName: userName || 'Legal Participant',
        senderRole: userRole,
        text: currentLang === 'om' ? `Sanada fe'eera: ${file.name}` : `ሰነድ ተልኳል: ${file.name}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachment: {
          name: file.name,
          url: url,
          type: type
        }
      };

      setChatMessages((prev) => [...prev, msg]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate AI Formal Minutes
  const handleGenerateFormalMinutes = async () => {
    if (!caseNotes.trim()) return;

    setIsAiLoading(true);
    setActiveSidebarTab('ai'); // Switch to AI tab to show progress
    
    try {
      const prompt = `You are a high-level Judicial Clerk. Create a formal "Courtroom Minutes" (Qaboo Guyyaa Dhaddachaa) based on the following raw meeting notes. 
      Include:
      1. Case Heading (Galmee, Mana Murtii, Guyyaa)
      2. Procedural History / Current Context (Haala Falmii)
      3. Key Arguments Raised (Qabxiiwwan Falmii Ijoo)
      4. Statutory References cited (Keeyyattoota Seeraa Caqasaman)
      5. Decisions or Next Steps (Murtoo ykn Beellama Itti Aanu)
      
      Use a highly professional, legal tone in ${currentLang === 'om' ? 'Afaan Oromoo' : currentLang === 'am' ? 'Amharic' : 'English'}.
      
      RAW NOTES:
      """
      ${caseNotes}
      """
      `;

      const res = await generateLegalContent({
        prompt,
        taskType: 'summarize',
        outputLanguages: [currentLang],
        modelTier: 'gemini-3.8-flash',
      });

      const formalMinutes = res?.content || (currentLang === 'om' ? 'Qaboo guyyaa formal uumuun hin danda\'amne.' : 'መደበኛ ቃለ-ጉባኤ ማዘጋጀት አልተቻለም።');
      
      setAiAnswers((prev) => [
        {
          query: "✨ Formal Minutes Generated",
          answer: formalMinutes,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Minutes generation failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Open in dedicated Browser Window / Tab (Chrome / Edge native window)
  const handleOpenDedicatedTab = () => {
    if (typeof window !== 'undefined') {
      window.open(jitsiMeetingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 space-y-4 animate-in fade-in duration-200">
      {/* Top Banner & Browser Access Indicator */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>LIVE MEETING & COURTROOM SESSION</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700 text-xs font-mono">
              <span>🌐 Chrome • Edge • Safari Ready</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">Room: {sanitizedRoom}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif-legal font-bold text-amber-300">
            {topic}
          </h1>
          <p className="text-xs text-slate-400">
            {currentLang === 'om'
              ? 'Walgahii marii seeraa kallattii: Namni linkii kana qabu hundi Chrome, Edge fi browser kamiyyuu irraa kallattiin hirmaachuu danda\'a.'
              : currentLang === 'am'
              ? 'የቀጥታ የሕግ ክርክር እና የውይይት ክፍል፡ ይህን ማስፈንጠሪያ የያዘ ማንኛውም ሰው በ Chrome፣ Edge እና በሁሉም ብሮውዘሮች በቀጥታ መሳተፍ ይችላል።'
              : 'Direct legal case conference room: Anyone with this link can join directly via Chrome, Edge, Safari, or mobile browser.'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <a
            href="https://meet.google.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
            title="Official Google Meet Dhaddacha Haaraa"
          >
            <Video className="w-4 h-4 text-slate-950" />
            <span>Google Meet Official</span>
            <ExternalLink className="w-3 h-3 text-slate-950" />
          </a>

          <button
            onClick={handleCopyLink}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
            title="Linkii Walgahii Garagalchi"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
            <span>{copiedLink ? 'Linkiin Garagaleera!' : 'Linkii Garagalchi'}</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
            title="Qoodi (Telegram, WhatsApp, Facebook)"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>Qoodi</span>
          </button>

          <button
            onClick={handleOpenDedicatedTab}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
            title="Chrome/Edge Fuula Haaraa irratti Bani"
          >
            <ExternalLink className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Fuula Haaraa</span>
          </button>
        </div>
      </div>

      {/* Guest Name Modal if not joined yet */}
      {!isJoined && (
        <div className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl max-w-lg mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-2xl">
            ⚖️
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-serif-legal">
              {currentLang === 'om' ? 'Iddoo Walgahii Seeraa Seenuu' : currentLang === 'am' ? 'ወደ ስብሰባው ክፍል ይግቡ' : 'Join Legal Meeting Room'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {currentLang === 'om'
                ? 'Maaloo maqaa fi gahee hojii keessan galchuun walgahii kana irratti kallattiin hirmaadhaa.'
                : currentLang === 'am'
                ? 'እባክዎ ስምዎን እና የስራ ድርሻዎን በማስገባት በቀጥታ ስብሰባውን ይቀላቀሉ።'
                : 'Please enter your name and role to enter this legal session directly.'}
            </p>
          </div>

          <form onSubmit={handleJoinMeeting} className="space-y-3 text-left">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                {currentLang === 'om' ? 'Maqaa Guutuu' : currentLang === 'am' ? 'ሙሉ ስም' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Fkn: Abukaattoo Tolasaa Dabalaa"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                {currentLang === 'om' ? 'Gahee Dhaddachaa / Hojii' : currentLang === 'am' ? 'የፍርድ ቤት ሚና' : 'Courtroom / Legal Role'}
              </label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="Advocate">Abukaattoo (Advocate / Legal Counsel)</option>
                <option value="Judge">Abbaa Seeraa (Judge / Bench Presiding)</option>
                <option value="Plaintiff">Himataa (Plaintiff / Claimant)</option>
                <option value="Defendant">Himatamaa (Defendant / Respondent)</option>
                <option value="Witness">Ragaa (Witness)</option>
                <option value="Clerk">Barreessaa Dhaddachaa (Court Clerk)</option>
                <option value="Observer">Hordoftuu (Observer)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg mt-2"
            >
              🚀 {currentLang === 'om' ? 'Walgahii Seeni (Join Meeting)' : currentLang === 'am' ? 'ስብሰባውን ተቀላቀል' : 'Join Legal Meeting'}
            </button>
          </form>
        </div>
      )}

      {/* Main Grid: Left = Video Stream; Right = Collaborative Panels */}
      {isJoined && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Video Container (7 of 12 cols on desktop) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="relative w-full aspect-video sm:aspect-[16/10] bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
              {/* Live WebRTC / Jitsi Meeting Iframe with full permissions for Chrome & Edge */}
              <iframe
                title="Legal Meeting Video"
                src={jitsiMeetingUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; ambient-light-sensor"
                className="w-full h-full border-0"
              />
            </div>

            {/* Quick Meeting Controls & Direct Join Options */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-[11px]">End-to-End Encrypted Live Judicial Channel</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenDedicatedTab}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Chrome ykn Edge keessatti guutummaatti bani"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Chrome/Edge Fuula Guutuu</span>
                </button>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Qoodi Link</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Case Minutes, In-Meeting AI, Live Chat (5 of 12 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[650px] overflow-hidden">
            {/* Tab Navigation Header */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950/70 p-1.5 gap-1 shrink-0">
              <button
                onClick={() => setActiveSidebarTab('notes')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSidebarTab === 'notes'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Qaboo Guyyaa</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('ai')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSidebarTab === 'ai'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('citations')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSidebarTab === 'citations'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Barbaacha Wabii Seeraa (Citation Finder)"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Wabii</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('chat')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSidebarTab === 'chat'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('participants')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSidebarTab === 'participants'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Hirmaattota"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{participants.length}</span>
              </button>
            </div>

            {/* TAB 1: Shared Meeting Agenda & Case Minutes */}
            {activeSidebarTab === 'notes' && (
              <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Lakk. Galmee</label>
                      <input
                        type="text"
                        value={caseNumber}
                        onChange={(e) => setCaseNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Dhaddacha / Mana Murtii</label>
                      <input
                        type="text"
                        value={courtName}
                        onChange={(e) => setCourtName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                      <span>Qabiyyee Marii & Qaboo Guyyaa Dhaddachaa</span>
                      {isNotesSaved && <span className="text-emerald-400 text-[10px] font-mono ml-2">Olkaawwameera ✓</span>}
                    </label>

                    {/* Microphone Voice-to-Text Dictation Tool for Real-time Transcription */}
                    <VoiceDictation
                      onTextChange={(text) => setCaseNotes((prev) => (prev ? prev + ' ' + text : text))}
                      currentLang={currentLang}
                      dictationLang={dictationLang}
                      onDictationLangChange={setDictationLang}
                    />
                  </div>

                  <textarea
                    value={caseNotes}
                    onChange={(e) => setCaseNotes(e.target.value)}
                    placeholder="Qabiyyee ijoo marii, falmii dhiyaate, keeyyata caqasame, fi murtoo/araara waliigalame asitti barreessaa ykn sagalee keessaniin galchaa..."
                    className="flex-1 w-full min-h-[220px] p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs leading-relaxed focus:outline-none focus:border-amber-500 font-sans resize-none"
                  />
                </div>

                {/* Save and Multi-Format Export Toolbar (TXT, Word, Image/Print, PDF) */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800 flex-wrap">
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Olkaawi</span>
                  </button>

                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Export TXT */}
                    <button
                      onClick={() => {
                        const blob = new Blob([`SEERAAI - QABOO GUYYAA MARII SEERAA\nMata Duree: ${topic}\nGalmee: ${caseNumber}\nMana Murtii: ${courtName}\nGuyyaa: ${new Date().toLocaleDateString()}\n\n${caseNotes}`], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Qaboo_Guyyaa_${sanitizedRoom}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                      title="Download as Text"
                    >
                      <Download className="w-3 h-3 text-sky-400" />
                      <span>TXT</span>
                    </button>

                    {/* Export Word (.doc / HTML) */}
                    <button
                      onClick={() => {
                        const htmlContent = `<html><head><meta charset="utf-8"><title>${topic}</title></head><body style="font-family:serif; padding:20px;"><h2>SEERAAI - QABOO GUYYAA MARII SEERAA</h2><p><b>Mata Duree:</b> ${topic}</p><p><b>Galmee:</b> ${caseNumber}</p><p><b>Mana Murtii:</b> ${courtName}</p><p><b>Guyyaa:</b> ${new Date().toLocaleDateString()}</p><hr/><p style="white-space:pre-wrap;">${caseNotes}</p></body></html>`;
                        const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Qaboo_Guyyaa_${sanitizedRoom}.doc`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                      title="Download as MS Word"
                    >
                      <span>📄 Word</span>
                    </button>

                    {/* Export Image / Print View */}
                    <button
                      onClick={() => {
                        const w = window.open('', '_blank');
                        if (w) {
                          w.document.write(`<html><head><title>${topic}</title><style>body{font-family:sans-serif;padding:30px;color:#111;}h2{color:#b45309;}</style></head><body><h2>SEERAAI - QABOO GUYYAA MARII SEERAA</h2><p><b>Mata Duree:</b> ${topic}</p><p><b>Galmee:</b> ${caseNumber}</p><p><b>Mana Murtii:</b> ${courtName}</p><hr/><pre style="white-space:pre-wrap;font-family:sans-serif;">${caseNotes}</pre><script>window.print();</script></body></html>`);
                          w.document.close();
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                      title="Print / Save as PDF or Image"
                    >
                      <span>🖨️ PDF/Print</span>
                    </button>

                    {/* AI Minutes Generator */}
                    <button
                      onClick={handleGenerateFormalMinutes}
                      disabled={!caseNotes.trim() || isAiLoading}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{currentLang === 'om' ? 'Minutes Uumi' : 'ቃለ-ጉባኤ አዘጋጅ'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: In-Meeting AI Legal Co-Counsel */}
            {activeSidebarTab === 'ai' && (
              <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>SEERAAI In-Meeting Legal Co-Counsel</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Walgahii keessatti keeyyata seeraa fi murtii ijibbaataa battalatti barbaadaa.
                    </p>
                  </div>
                </div>

                {/* Quick Action Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleAskInMeetingAI("Labsii Hojjetaa 1156/2019 Keeyyata 27 jalatti hariiroo hojii battalumatti addaan kutuun maali?")}
                    className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 text-[10px] cursor-pointer"
                  >
                    ⚖️ Kwt. 27 Hojjetaa
                  </button>
                  <button
                    onClick={() => handleAskInMeetingAI("SDFHH Keeyyata 6 bu'uura godhachuun ilaalcha deebii (review of judgment) dhiyeessuuf ulaagaalee maaltu barbaachisa?")}
                    className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-300 text-[10px] cursor-pointer"
                  >
                    🏛️ SDFHH Kwt. 6
                  </button>
                  <button
                    onClick={() => handleAskInMeetingAI("Murtiin Dhaddacha Ijibbaataa Federaalaa Lakk. Galmee 249062 dhimma ilaalcha deebii fi mormii garee sadaffaa Kwt 358 irratti qajeeltoo maali kenne?")}
                    className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-300 text-[10px] cursor-pointer"
                  >
                    📌 Murtii Galmee 249062
                  </button>
                </div>

                {/* AI Answers Feed */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {aiAnswers.length === 0 && (
                    <div className="text-center py-12 text-slate-500 space-y-2">
                      <Scale className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="text-xs">
                        Gaaffii seeraa keessan asitti barreessaa. AI'n heera, labsii fi murtii ijibbaataa qoratee deebii sirrii kenna.
                      </p>
                    </div>
                  )}

                  {aiAnswers.map((item, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold border-b border-slate-900 pb-1">
                        <span>❓ {item.query}</span>
                        <span className="text-slate-500 font-mono">{item.timestamp}</span>
                      </div>
                      <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {item.answer}
                      </div>
                    </div>
                  ))}

                  {isAiLoading && (
                    <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 text-center space-y-2 animate-pulse">
                      <RefreshCw className="w-5 h-5 mx-auto text-amber-400 animate-spin" />
                      <p className="text-xs text-amber-300 font-medium">
                        Seera fi murtii ijibbaataa qorachaa jira...
                      </p>
                    </div>
                  )}
                </div>

                {/* Input Prompt Box */}
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAskInMeetingAI();
                    }}
                    placeholder="Gaaffii seeraa walgahii keessatti gaafadhu..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => handleAskInMeetingAI()}
                    disabled={isAiLoading || !aiQuery.trim()}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer shadow"
                  >
                    Gaafadhu
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: In-Meeting Legal Citation Finder */}
            {activeSidebarTab === 'citations' && (
              <div className="flex-1 flex flex-col p-3 overflow-y-auto">
                <LegalCitationFinder
                  currentLang={currentLang}
                  isEmbedded={true}
                  onInsertCitation={(citationText) => {
                    setCaseNotes((prev) => (prev ? prev + '\n\n• ' + citationText : '• ' + citationText));
                    setActiveSidebarTab('notes');
                  }}
                  onNavigateTab={onNavigateTab}
                />
              </div>
            )}

            {/* TAB 4: Live In-Meeting Chat */}
            {activeSidebarTab === 'chat' && (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl text-xs space-y-1 ${
                        msg.isAi
                          ? 'bg-amber-500/10 border border-amber-500/20 text-slate-200'
                          : msg.senderName === userName
                          ? 'bg-slate-800 border border-slate-700 text-slate-100 ml-4'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-amber-300">
                          {msg.senderName} <span className="text-slate-400 font-normal">({msg.senderRole})</span>
                        </span>
                        <span className="text-slate-500 font-mono">{msg.timestamp}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      
                      {msg.attachment && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`p-1.5 rounded bg-slate-800 border border-slate-700 ${
                              msg.attachment.type === 'pdf' ? 'text-rose-400' :
                              msg.attachment.type === 'word' ? 'text-blue-400' :
                              msg.attachment.type === 'image' ? 'text-emerald-400' : 'text-slate-400'
                            }`}>
                              <File className="w-4 h-4" />
                            </div>
                            <span className="truncate text-[11px] font-mono">{msg.attachment.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {msg.attachment.type === 'image' && (
                              <button
                                onClick={() => setPreviewAttachment(msg.attachment)}
                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer"
                                title="Milaalumsa (Preview)"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <a
                              href={msg.attachment.url}
                              download={msg.attachment.name}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 cursor-pointer"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer shadow transition-all"
                    title="Sanada Dabali (Attach Document)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    placeholder="Ergaa marii barreessi..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!newChatMessage.trim()}
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold cursor-pointer shadow"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: Participants Roster */}
            {activeSidebarTab === 'participants' && (
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-amber-300">
                    Hirmaattota Walgahii ({participants.length})
                  </h3>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nama Afeerii</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.name === userName && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                              Ati
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.role} • Seeneera: {p.joinedAt}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                        <Mic className="w-3.5 h-3.5" />
                        <Video className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share / Invite Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <h3 className="text-base font-bold text-amber-300 font-serif-legal">
                  Linkii Walgahii Qoodi (Share Meeting Link)
                </h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Linkii kana fayyadamuun hirmaattonni, abukaattonni, ykn maamiltoonni Google Chrome, Microsoft Edge, Safari, ykn bilbila kamirraayyuu kallattiin walgahii kana seenuu danda'u:
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs text-amber-400 font-mono truncate select-all">
                {shareableMeetingUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
              >
                {copiedLink ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            {/* Quick 1-Click Social Sharing Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareableMeetingUrl)}&text=${encodeURIComponent(`⚖️ Walgahii Seeraa SEERAAI: ${topic}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/60 text-sky-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-all"
              >
                <span>✈️</span>
                <span>Telegram</span>
              </a>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`⚖️ SEERAAI Legal Conference:\n${topic}\n\nJoin link (Chrome/Edge):\n${shareableMeetingUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-all"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareableMeetingUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/60 text-blue-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-all"
              >
                <span>📘</span>
                <span>Facebook</span>
              </a>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={handleCopyInviteText}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedInvite ? 'Waamichi Garagaleera!' : 'Waamicha Guutuu Garagalchi'}</span>
              </button>

              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow"
              >
                Cufi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <a
              href={previewAttachment.url}
              download={previewAttachment.name}
              className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-sky-400 transition-all shadow-xl border border-slate-700"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setPreviewAttachment(null)}
              className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-all shadow-xl border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="max-w-5xl w-full max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl border border-slate-800 bg-slate-950">
            {previewAttachment.type === 'image' ? (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="p-10 text-center space-y-4">
                <FileText className="w-20 h-20 mx-auto text-amber-500/50" />
                <h3 className="text-xl font-bold text-slate-100">{previewAttachment.name}</h3>
                <p className="text-slate-400">Preview not available for this file type. Please download to view.</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-slate-400 text-xs font-mono">{previewAttachment.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default LegalMeetingRoomView;
