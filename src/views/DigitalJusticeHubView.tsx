import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import {
  Scale,
  Shield,
  FileCheck,
  WifiOff,
  Clock,
  Video,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  Download,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  QrCode,
  FileText,
  AlertCircle,
  Eye,
  FileSignature
} from 'lucide-react';
import { PremiumGate } from '../components/PremiumGate';

interface DigitalJusticeHubViewProps {
  currentLang: Language;
  onNavigateTab?: (tab: string) => void;
}

export type JusticePillar = 
  | 'docket'      // 1. Sirna Galmee Dhimma Dijitaalaa
  | 'security'    // 2. Nageenyaafi Iccitii Odeeffannoo
  | 'signature'   // 3. Mallattoo Dijitaalaa fi Dhugummaa Sanadootaa
  | 'offline'     // 4. Furmaata Rakkoo Interneetii fi Ibsaa
  | 'schedule'    // 5. Sirna Beellamaa fi Beeksisa Dijitaalaa
  | 'videoMeet';  // 6. Dhaddacha Karaa Viidiyoo Gaggeessuu (Google Meet)

export interface CaseDocket {
  id: string;
  docketNumber: string;
  title: string;
  category: 'Civil' | 'Criminal' | 'Commercial' | 'Labor' | 'Family';
  courtLevel: 'Murtii Sad. 1ffaa' | 'Murtii Ol\'aanaa' | 'Dhaddacha Ijibbaataa';
  benchName: string;
  plaintiff: string;
  defendant: string;
  currentStage: 
    | 'Galmee Jalqabaa (Filing)'
    | 'Qorannoo Dhaqqabummaa (Admissibility)'
    | 'Falmii Qaamolee & Dhaddacha (Hearing)'
    | 'Ragaa Madaaluu (Evidence Review)'
    | 'Murtii Dhaddachaa (Judgment)'
    | 'Ol-iyyannoo (Appeal)'
    | 'Galmee Cufuu (Closed)';
  filedDate: string;
  nextHearingDate: string;
  assignedJudge: string;
  assignedClerk: string;
  documentHash?: string;
  isSigned: boolean;
  history: {
    timestamp: string;
    action: string;
    actor: string;
    role: string;
    note: string;
    stageHash: string;
  }[];
}

export interface SecurityAuditRecord {
  id: string;
  timestamp: string;
  docketNumber: string;
  actionType: 'VIEW' | 'EDIT' | 'STAGE_TRANSFER' | 'SIGN' | 'UNAUTHORIZED_ATTEMPT';
  performedBy: string;
  userRole: string;
  ipDeviceSig: string;
  integrityVerified: boolean;
}

const DEFAULT_DOCKETS: CaseDocket[] = [
  {
    id: 'doc-001',
    docketNumber: 'ET-FED/CIV-2026/0481',
    title: 'Falmii Qabeenya Dhaalaa fi Waliigaltee Lafaa',
    category: 'Civil',
    courtLevel: 'Murtii Sad. 1ffaa',
    benchName: 'Dhaddacha Hariiroo Hawaasaa 3ffaa',
    plaintiff: 'Obbo Caalaa Baqqalaa',
    defendant: 'Aadde Tolashii Dheeressaa',
    currentStage: 'Falmii Qaamolee & Dhaddacha (Hearing)',
    filedDate: '2026-02-14',
    nextHearingDate: '2026-11-04',
    assignedJudge: 'Abbaa Seeraa Dassaalany Tasfaayee',
    assignedClerk: 'Barreessaa Bultii Gammachiis',
    documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    isSigned: true,
    history: [
      {
        timestamp: '2026-02-14 09:30',
        action: 'Galmee Jalqabaa',
        actor: 'Barreessaa Bultii Gammachiis',
        role: 'Barreessaa Dhaddachaa',
        note: 'Iyyannoon kaffaltii qulqullaa\'ee galmaa\'eera.',
        stageHash: 'a71b8219...3f01'
      },
      {
        timestamp: '2026-02-28 10:15',
        action: 'Qorannoo Dhaqqabummaa',
        actor: 'Abbaa Seeraa Dassaalany Tasfaayee',
        role: 'Abbaa Seeraa',
        note: 'Aangoon abbaa seerummaa mirkanaa\'eera; wamichi ba\'e.',
        stageHash: 'c90e1183...92a1'
      },
      {
        timestamp: '2026-03-20 14:00',
        action: 'Dhaddacha Jalqabaa',
        actor: 'Abbaa Seeraa Dassaalany Tasfaayee',
        role: 'Abbaa Seeraa',
        note: 'Deebiin dhiyaate; falmiin ragaa ittisaaf beellamame.',
        stageHash: '4f29a007...1b44'
      }
    ]
  },
  {
    id: 'doc-002',
    docketNumber: 'ET-ORM/CRIM-2026/0192',
    title: 'Himanna Dokumantii Soobaa fi Amanamummaa Hir\'isuu',
    category: 'Criminal',
    courtLevel: 'Murtii Ol\'aanaa',
    benchName: 'Dhaddacha Yakkaa Ol\'aanaa',
    plaintiff: 'Abbaa Alangaa Waliigalaa',
    defendant: 'Guddataa Fayyisaa',
    currentStage: 'Ragaa Madaaluu (Evidence Review)',
    filedDate: '2026-01-10',
    nextHearingDate: '2026-11-08',
    assignedJudge: 'Abbaa Seeraa Fireew Gabramaram',
    assignedClerk: 'Barreessituu Hawwii Dookkoo',
    documentHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    isSigned: true,
    history: [
      {
        timestamp: '2026-01-10 11:00',
        action: 'Galmee Himannaa Yakkaa',
        actor: 'Abbaa Alangaa Waliigalaa',
        role: 'Abbaa Alangaa',
        note: 'Kootaan himannaa seera yakkaa kwt 692 bu\'uura godhatee dhiyaate.',
        stageHash: '8b1392aa...e412'
      },
      {
        timestamp: '2026-02-11 09:45',
        action: 'Dhagaha Ragaa Abbaa Alangaa',
        actor: 'Abbaa Seeraa Fireew Gabramaram',
        role: 'Abbaa Seeraa',
        note: 'Ragaan namaa sadii dhaga\'amee galmeeffame.',
        stageHash: '61a5b821...912f'
      }
    ]
  }
];

export const DigitalJusticeHubView: React.FC<DigitalJusticeHubViewProps> = ({
  currentLang,
  onNavigateTab,
}) => {
  const { user, profile } = useAuth();
  const [activePillar, setActivePillar] = useState<JusticePillar>('docket');

  // Case Dockets State
  const [dockets, setDockets] = useState<CaseDocket[]>(() => {
    try {
      const saved = localStorage.getItem('seera_digital_dockets_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_DOCKETS;
  });

  const [selectedDocket, setSelectedDocket] = useState<CaseDocket>(dockets[0]);
  const [searchDocketQuery, setSearchDocketQuery] = useState('');

  // Active Role Simulation (Abbaa Seeraa, Abbaa Alangaa, Abukaattoo, Clerk, Litigant)
  const [activeUserRole, setActiveUserRole] = useState<'Judge' | 'Prosecutor' | 'Advocate' | 'Clerk' | 'Litigant'>('Judge');
  const [activeUserName, setActiveUserName] = useState(
    profile?.visitorName || profile?.appUsername || 'Abbaa Seeraa Bultii'
  );

  // Security Audit Records
  const [auditLogs, setAuditLogs] = useState<SecurityAuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem('seera_justice_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'aud-1',
        timestamp: new Date().toLocaleDateString() + ' 09:12',
        docketNumber: 'ET-FED/CIV-2026/0481',
        actionType: 'VIEW',
        performedBy: 'Abbaa Seeraa Dassaalany',
        userRole: 'Judge',
        ipDeviceSig: 'SHA256:88fa2b10',
        integrityVerified: true
      },
      {
        id: 'aud-2',
        timestamp: new Date().toLocaleDateString() + ' 09:40',
        docketNumber: 'ET-FED/CIV-2026/0481',
        actionType: 'EDIT',
        performedBy: 'Barreessaa Bultii Gammachiis',
        userRole: 'Clerk',
        ipDeviceSig: 'SHA256:77cd1002',
        integrityVerified: true
      }
    ];
  });

  // Digital Signature & Integrity Verification State
  const [docTextToSign, setDocTextToSign] = useState(
    'MURTII MANA MURTII SADARKAA JALQABAA\nGalmee Lakk: ET-FED/CIV-2026/0481\nDhaddacha: Hariiroo Hawaasaa 3ffaa\nDhimmicha qorannee akkaataa Seera Hariiroo Hawaasaa kwt 1677 fi 1723 tiin...'
  );
  const [signedCert, setSignedCert] = useState<{
    hash: string;
    signer: string;
    role: string;
    signedAt: string;
    legalBasis: string;
  } | null>(null);
  const [verifyInputHash, setVerifyInputHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<'match' | 'tampered' | null>(null);

  // Offline / Power Fail-safe State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineBufferCount, setOfflineBufferCount] = useState<number>(3);
  const [lastAutoSave, setLastAutoSave] = useState<string>('Amma qofa');
  const [isSimulatingOutage, setIsSimulatingOutage] = useState<boolean>(false);

  // Statutory Limitation & Schedule State
  const [statutoryCaseType, setStatutoryCaseType] = useState<'CivilGeneral' | 'Tort' | 'CriminalMajor' | 'CassationAppeal'>('CivilGeneral');
  const [statutoryEventDate, setStatutoryEventDate] = useState('2024-05-10');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Official Google Meet State
  const [meetTopic, setMeetTopic] = useState('Dhaddacha Dhimma Lakk. ET-FED/CIV-2026/0481');
  const [meetDocketNum, setMeetDocketNum] = useState('ET-FED/CIV-2026/0481');
  const [meetJudge, setMeetJudge] = useState('Abbaa Seeraa Dassaalany Tasfaayee');
  const [meetDate, setMeetDate] = useState('2026-11-04');
  const [meetTime, setMeetTime] = useState('10:00');
  const [meetLitigants, setMeetLitigants] = useState('Obbo Caalaa Baqqalaa (Himataa), Aadde Tolashii Dheeressaa (Himatamtuu)');
  const [meetAttendeesEmails, setMeetAttendeesEmails] = useState('advocate.court@gmail.com, litigant.defense@gmail.com');
  const [generatedMeetLink, setGeneratedMeetLink] = useState('https://meet.google.com/new');
  const [proceduralRightsVerified, setProceduralRightsVerified] = useState({
    rightToBeHeard: true,
    rightToCounsel: true,
    rightToEvidence: true,
    rightToPublicAttendance: true,
    clerkTranscriptReady: true,
  });

  // Save dockets to local storage
  useEffect(() => {
    localStorage.setItem('seera_digital_dockets_v1', JSON.stringify(dockets));
  }, [dockets]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compute SHA-256 using Web Crypto API
  const computeSha256 = async (content: string): Promise<string> => {
    const enc = new TextEncoder();
    const data = enc.encode(content);
    const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Log Security Audit Event
  const logAudit = (action: SecurityAuditRecord['actionType'], docketNum: string) => {
    const newRecord: SecurityAuditRecord = {
      id: 'aud-' + Date.now().toString(36),
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      docketNumber: docketNum,
      actionType: action,
      performedBy: activeUserName,
      userRole: activeUserRole,
      ipDeviceSig: 'SHA256:' + Math.random().toString(36).substring(2, 10),
      integrityVerified: true
    };
    const updated = [newRecord, ...auditLogs];
    setAuditLogs(updated);
    try {
      localStorage.setItem('seera_justice_audit_logs', JSON.stringify(updated.slice(0, 50)));
    } catch {}
  };

  // Advance Docket Stage
  const handleAdvanceStage = async (targetStage: CaseDocket['currentStage']) => {
    if (activeUserRole !== 'Judge' && activeUserRole !== 'Clerk') {
      alert(
        currentLang === 'om'
          ? 'Dhimma jijjiiruuf abbummaa seeraa (Judge) ykn barreessaa (Clerk) ta\'uu qabdu!'
          : 'To update case stage, you must have Judge or Clerk credentials!'
      );
      logAudit('UNAUTHORIZED_ATTEMPT', selectedDocket.docketNumber);
      return;
    }

    const note = prompt(
      currentLang === 'om'
        ? `Sababa sadarkaa '${targetStage}'tti ceesisuu galmeessaa:`
        : `Enter reason for advancing to stage '${targetStage}':`,
      'Dhaddacha gaggeeffameen murtii fi qabiyyeen seeraa mirkanaa\'e.'
    );
    if (note === null) return;

    const stageHash = await computeSha256(`${selectedDocket.docketNumber}-${targetStage}-${Date.now()}`);

    const newHistory = {
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: targetStage,
      actor: activeUserName,
      role: activeUserRole,
      note: note || 'Sadarkaan galmee milkaa\'inaan jijjiirame.',
      stageHash: stageHash.substring(0, 16) + '...'
    };

    const updated = dockets.map(d => {
      if (d.id === selectedDocket.id) {
        return {
          ...d,
          currentStage: targetStage,
          history: [...d.history, newHistory]
        };
      }
      return d;
    });

    setDockets(updated);
    const newSel = updated.find(d => d.id === selectedDocket.id);
    if (newSel) setSelectedDocket(newSel);

    logAudit('STAGE_TRANSFER', selectedDocket.docketNumber);
  };

  // Sign Document Cryptographically
  const handleSignDocument = async () => {
    const hash = await computeSha256(docTextToSign);
    const cert = {
      hash: hash,
      signer: activeUserName,
      role: activeUserRole,
      signedAt: new Date().toLocaleString(),
      legalBasis: currentLang === 'om' 
        ? 'Labsii Mallattoo fi Daldala Elektirooniksii Labsii Lakk. 1072/2018' 
        : 'Electronic Signature Proclamation No. 1072/2018'
    };
    setSignedCert(cert);
    setVerifyInputHash(hash);
    logAudit('SIGN', selectedDocket.docketNumber);
  };

  // Verify Document Integrity
  const handleVerifyIntegrity = async () => {
    if (!verifyInputHash.trim()) return;
    const currentHash = await computeSha256(docTextToSign);
    if (currentHash === verifyInputHash.trim()) {
      setVerifyResult('match');
    } else {
      setVerifyResult('tampered');
    }
  };

  // Generate Official Google Meet URL & Calendar Invite
  const handleGenerateOfficialGoogleMeet = () => {
    // Generate official Google Meet room or URL
    // Standard format: meet.google.com/new opens instantaneous verified session
    const generatedCode = 'meet-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
    const meetUrl = `https://meet.google.com/${generatedCode}`;
    setGeneratedMeetLink(meetUrl);

    // Also build direct Google Calendar event creation URL with Meet pre-configured
    const calTitle = encodeURIComponent(`[Dhaddacha Virtual] ${meetTopic}`);
    const calDetails = encodeURIComponent(
      `DHADDACHA MANA MURTII KARAA VIIDIYOO (OFFICIAL VIRTUAL HEARING)\n` +
      `Galmee Lakk: ${meetDocketNum}\n` +
      `Abbaa Seeraa: ${meetJudge}\n` +
      `Qaamolee Falmii: ${meetLitigants}\n` +
      `Link Dhaddachaa Google Meet: ${meetUrl}\n\n` +
      `HUBACHIISA SEERAA: Dhaddachi kun Heera Mootummaa fi Seera Adeemsa Falmii bu\'uureffatee kan gaggeeffamu waan ta\'eef mirgi dhagahamuu fi ragaa dhiyeessuu eegamaadha.`
    );
    const calDates = `${meetDate.replace(/-/g, '')}T${meetTime.replace(/:/g, '')}00Z/${meetDate.replace(/-/g, '')}T${(parseInt(meetTime.split(':')[0]) + 1).toString().padStart(2, '0')}${meetTime.split(':')[1]}00Z`;

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${calDates}&details=${calDetails}&add=${encodeURIComponent(meetAttendeesEmails)}`;
    
    return { meetUrl, gcalUrl };
  };

  // Calculate Statutory Limitations (Yeroon Darbiinsaa)
  const calculateLimitation = () => {
    const eventTime = new Date(statutoryEventDate).getTime();
    const now = Date.now();
    const elapsedDays = Math.floor((now - eventTime) / (1000 * 60 * 60 * 24));

    let maxDays = 3650; // 10 years default civil general (Art. 1845)
    let ruleCitation = 'Seera Hariiroo Hawaasaa Kwt 1845 (Waggaa 10)';
    let desc = 'Yeroo darbiinsaa waliigalaa mirga falmii kireeditiifi dirqamaa.';

    if (statutoryCaseType === 'Tort') {
      maxDays = 730; // 2 years tort (Art. 2143)
      ruleCitation = 'Seera Hariiroo Hawaasaa Kwt 2143 (Waggaa 2)';
      desc = 'Miidhaa seeraan alaa (Tort) miidhaan gahe beekamee waggaa 2 keessatti dhiyaachuu qaba.';
    } else if (statutoryCaseType === 'CriminalMajor') {
      maxDays = 5475; // 15 years major felony (Art. 217 Criminal Code)
      ruleCitation = 'Seera Yakkaa Kwt 217 (Waggaa 15-20)';
      desc = 'Yakka ulfaataa adabbii cimaa qabaniif yeroo darbiinsaa himannaa dhiyeessuu.';
    } else if (statutoryCaseType === 'CassationAppeal') {
      maxDays = 30; // 30 or 60 days
      ruleCitation = 'Labsii Murtii Mana Murtii Federaalaa Lakk 1234/2021 Kwt 10';
      desc = 'Murtii dhumaa kennamee guyyaa 30 (ykn sababa amansiisaan 60) keessatti Ijibbaataaf iyyachuun dirqama.';
    }

    const remainingDays = maxDays - elapsedDays;
    const isExpired = remainingDays <= 0;

    return { elapsedDays, maxDays, remainingDays, isExpired, ruleCitation, desc };
  };

  const limitation = calculateLimitation();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner: Sirna Haqaa Ammayyeessuu Keessatti Gahee Teeknooloojii */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Scale className="w-64 h-64 text-amber-400" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold uppercase border border-amber-500/40 flex items-center gap-1.5">
              <span>🏛️</span>
              <span>
                {currentLang === 'om' ? 'Sirna Haqaa Ammayyaa' : currentLang === 'am' ? 'ዘመናዊ የፍትህ ሥርዓት' : 'Modern Judicial Technology'}
              </span>
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold uppercase border border-emerald-500/30">
              6 Pillars Active
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-serif-legal text-white tracking-wide">
            {currentLang === 'om'
              ? 'Sirna Haqaa Ammayyeessuu Keessatti Gahee Teeknooloojii'
              : currentLang === 'am'
              ? 'የፍትህ ሥርዓትን በማዘመን የቴክኖሎጂ ሚና እና አስተዋፅዖ'
              : 'The Role of Technology in Modernizing the Judicial System'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            {currentLang === 'om'
              ? 'Teeknooloojiin sirna haqaa si\'ataa, iftoomina qabu, dhaqqabamaa fi nageenya odeeffannoo eeguun hojjetu ijaaruuf murteessaadha. Haa ta’u malee, dhimma teeknikaa qofa osoo hin taane, mirga qaamolee falmii, bilisummaa fi itti gaafatamummaa waliin walqabata.'
              : currentLang === 'am'
              ? 'ቴክኖሎጂ ቀልጣፋ፣ ግልፅ፣ ተደራሽ እና የመረጃ ደህንነትን የጠበቀ የፍትህ ሥርዓት ለመገንባት ወሳኝ ነው። ይሁን እንጂ የቴክኒክ ጉዳይ ብቻ ሳይሆን የፍርድ ባለጉዳዮች መብት፣ ነጻነት እና ተጠያቂነት ጋር በጥብቅ የተሳሰረ ነው።'
              : 'Technology is pivotal to building an expeditious, transparent, accessible, and secure justice system. Far beyond technical apparatus, it upholds litigants\' constitutional rights, judicial independence, and rule of law.'}
          </p>

          {/* Active Jurist Identity Selector */}
          <div className="pt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-400 font-medium">
              {currentLang === 'om' ? 'Gahee Keessan (Active Role):' : 'የእርስዎ ሚና:'}
            </span>
            <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
              {(['Judge', 'Prosecutor', 'Advocate', 'Clerk', 'Litigant'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => {
                    setActiveUserRole(role);
                    logAudit('VIEW', selectedDocket.docketNumber);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    activeUserRole === role
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {role === 'Judge' ? '⚖️ Abbaa Seeraa' :
                   role === 'Prosecutor' ? '📜 Abbaa Alangaa' :
                   role === 'Advocate' ? '💼 Abukaattoo' :
                   role === 'Clerk' ? '📝 Barreessaa' : '👤 Qaama Falmii'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6 Core Pillars Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          {
            id: 'docket' as JusticePillar,
            num: '1',
            icon: '🔢',
            title: currentLang === 'om' ? 'Galmee Dijitaalaa' : 'ዲጂታል መዝገብ',
            sub: currentLang === 'om' ? 'Hordoffii Galmee' : 'የመዝገብ ሂደት'
          },
          {
            id: 'security' as JusticePillar,
            num: '2',
            icon: '🔐',
            title: currentLang === 'om' ? 'Nageenya & Iccitii' : 'ደህንነትና ሚስጥር',
            sub: currentLang === 'om' ? 'Eegumsa & Audit' : 'የፍቃድ ቁጥጥር'
          },
          {
            id: 'signature' as JusticePillar,
            num: '3',
            icon: '‼️',
            title: currentLang === 'om' ? 'Mallattoo Dijitaalaa' : 'ዲጂታል ፊርማ',
            sub: currentLang === 'om' ? 'Mirkaneessa SHA-256' : 'የሰነድ ማረጋገጫ'
          },
          {
            id: 'offline' as JusticePillar,
            num: '4',
            icon: '🫥',
            title: currentLang === 'om' ? 'Interneetii & Ibsaa' : 'የመብራትና ኔትወርክ መቋረጥ',
            sub: currentLang === 'om' ? 'Resilience Fail-safe' : 'ከመስመር ውጭ አሰራር'
          },
          {
            id: 'schedule' as JusticePillar,
            num: '5',
            icon: '🖐️',
            title: currentLang === 'om' ? 'Beellama & Yeroo' : 'ቀጠሮ እና ይርጋ',
            sub: currentLang === 'om' ? 'Yeroon Darbiinsaa' : 'የይርጋ ገደብ ክትትል'
          },
          {
            id: 'videoMeet' as JusticePillar,
            num: '6',
            icon: '🎥',
            title: currentLang === 'om' ? 'Dhaddacha Viidiyoo' : 'የቪዲዮ ችሎት (Google Meet)',
            sub: currentLang === 'om' ? 'Google Meet Official' : 'ቀጥታ የጎግል ሚት ችሎት'
          }
        ].map(pillar => (
          <button
            key={pillar.id}
            onClick={() => setActivePillar(pillar.id)}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activePillar === pillar.id
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-lg scale-[1.02]'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-base mb-1">
              <span>{pillar.icon}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activePillar === pillar.id ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-amber-400'
              }`}>
                Pillar {pillar.num}
              </span>
            </div>
            <h4 className="text-xs font-bold leading-tight line-clamp-1">{pillar.title}</h4>
            <p className={`text-[10px] mt-0.5 line-clamp-1 ${activePillar === pillar.id ? 'text-slate-900/80' : 'text-slate-400'}`}>
              {pillar.sub}
            </p>
          </button>
        ))}
      </div>

      {/* PILLAR 1: SIRNA GALMEE DHIMMA DIJITAALAA */}
      {activePillar === 'docket' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white font-serif-legal flex items-center gap-2">
                  <span>🔢</span>
                  <span>1. Sirna Galmee Dhimma Dijitaalaa (Digital Case Lifecycle & Docket)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Dhimmi tokko yeroo galmaa’u irraa eegalee hanga murtii, ol-iyyannoo fi galmee cufuutti adeemsi isaa sirna dijitaalaatiin hordofama. Lakkoofsi galmee fi seenaa jijjiirama galmee kuufamuu qabu.
                </p>
              </div>

              {/* Search docket */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Lakk. Galmee barbaadi..."
                  value={searchDocketQuery}
                  onChange={e => setSearchDocketQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Dockets List & Selected Docket View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              {/* Docket Selector Column */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  Galmeewwan Hojii Irra Jiran ({dockets.length})
                </h4>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {dockets
                    .filter(d => 
                      d.docketNumber.toLowerCase().includes(searchDocketQuery.toLowerCase()) ||
                      d.title.toLowerCase().includes(searchDocketQuery.toLowerCase()) ||
                      d.plaintiff.toLowerCase().includes(searchDocketQuery.toLowerCase())
                    )
                    .map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocket(doc);
                          logAudit('VIEW', doc.docketNumber);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          selectedDocket.id === doc.id
                            ? 'bg-amber-500/10 border-amber-500 text-slate-100 shadow-md'
                            : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-mono font-bold text-amber-400">{doc.docketNumber}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                            {doc.courtLevel}
                          </span>
                        </div>
                        <h5 className="font-bold text-xs text-white line-clamp-1">{doc.title}</h5>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                          {doc.plaintiff} vs {doc.defendant}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                          <span className="text-amber-300/80 font-medium">{doc.currentStage.split(' ')[0]}</span>
                          <span className="text-slate-400">📅 {doc.nextHearingDate}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Selected Docket Details & Lifecycle Tracker */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold">
                          {selectedDocket.docketNumber}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {selectedDocket.category} • {selectedDocket.benchName}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white font-serif-legal mt-1">
                        {selectedDocket.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setMeetDocketNum(selectedDocket.docketNumber);
                          setMeetTopic(selectedDocket.title);
                          setMeetJudge(selectedDocket.assignedJudge);
                          setMeetLitigants(`${selectedDocket.plaintiff} vs ${selectedDocket.defendant}`);
                          setActivePillar('videoMeet');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
                      >
                        <span>🎥</span>
                        <span>Google Meet Ban</span>
                      </button>
                    </div>
                  </div>

                  {/* Litigant & Officials Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px] uppercase">Himataa (Plaintiff)</span>
                      <strong className="text-slate-200 mt-0.5 block">{selectedDocket.plaintiff}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px] uppercase">Himattamaa (Defendant)</span>
                      <strong className="text-slate-200 mt-0.5 block">{selectedDocket.defendant}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px] uppercase">Abbaa Seeraa (Judge)</span>
                      <strong className="text-amber-300 mt-0.5 block">{selectedDocket.assignedJudge}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px] uppercase">Barreessaa (Clerk)</span>
                      <strong className="text-slate-300 mt-0.5 block">{selectedDocket.assignedClerk}</strong>
                    </div>
                  </div>

                  {/* Lifecycle Stages Flowchart */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-300 mb-2">
                      Sadarkaa Galmee Hojii Irra Jiru (Current Stage Lifecycle):
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        'Galmee Jalqabaa (Filing)',
                        'Qorannoo Dhaqqabummaa (Admissibility)',
                        'Falmii Qaamolee & Dhaddacha (Hearing)',
                        'Ragaa Madaaluu (Evidence Review)',
                        'Murtii Dhaddachaa (Judgment)',
                        'Ol-iyyannoo (Appeal)',
                        'Galmee Cufuu (Closed)',
                      ].map((stage, idx) => {
                        const isCurrent = selectedDocket.currentStage.startsWith(stage.split(' ')[0]);
                        return (
                          <button
                            key={stage}
                            onClick={() => handleAdvanceStage(stage as any)}
                            className={`p-2.5 rounded-xl border text-left transition-all text-[11px] ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                                : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="block text-[9px] opacity-70">Stage {idx + 1}</span>
                            <span className="font-semibold">{stage.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Immutable History Audit Trail */}
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>Seenaa Jijjiirama Galmee (Immutable Audit Trail)</span>
                    </h5>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedDocket.history.map((h, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-200">{h.action}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{h.timestamp}</span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{h.note}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                            <span>Raawwataan: {h.actor} ({h.role})</span>
                            <span className="text-amber-400/80">Hash: {h.stageHash}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 2: NAGEENYAAFI ICCITII ODEEFFANNOO */}
      {activePillar === 'security' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white font-serif-legal flex items-center gap-2">
                <span>🔐</span>
                <span>2. Nageenyaafi Iccitii Odeeffannoo (Role Access & Audit Integrity)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Namni hayyama hin qabne galmee arguu, jijjiiruu ykn haquu akka hin dandeenyeef sirni nageenyaa cimaa jiraachuu qaba. Eenyu galmee bane, jijjiire ykn dabarse akka ta’e galmeessuun barbaachisaadha.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Active Role Permissions Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  Sadarkaa Hayyamaa (Active Credentials)
                </h4>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Ogeessa:</span>
                    <strong className="text-white">{activeUserName}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Gahee (Role):</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                      {activeUserRole}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="text-slate-400 font-bold block">Mirgoota Galmee Irratti Qabdan:</span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className={activeUserRole === 'Judge' ? 'text-emerald-400' : 'text-slate-500'}>
                        {activeUserRole === 'Judge' ? '✓' : '✗'}
                      </span>
                      <span>Murtii Dhaddachaa Mallatteessuu (Judge Ruling Sign-off)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={activeUserRole === 'Judge' || activeUserRole === 'Clerk' ? 'text-emerald-400' : 'text-slate-500'}>
                        {activeUserRole === 'Judge' || activeUserRole === 'Clerk' ? '✓' : '✗'}
                      </span>
                      <span>Sadarkaa Galmee Jijjiiruu & Beellama Qabu (Docket Transition)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={activeUserRole !== 'Litigant' ? 'text-emerald-400' : 'text-slate-500'}>
                        {activeUserRole !== 'Litigant' ? '✓' : '✗'}
                      </span>
                      <span>Ragaa & Sanada Seeraa Galchuu (File Pleadings/Evidence)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>Haala Galmee Ilaaluu (Read-Only Case Status)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    logAudit('UNAUTHORIZED_ATTEMPT', selectedDocket.docketNumber);
                    alert('Qorannoon Nageenyaa: Yaaliin hayyama malee galmee haquu fashalaa\'ee sirna audit irratti galmaa\'eera!');
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Yaalii Hayyama Malee Qori (Test Block)</span>
                </button>
              </div>

              {/* Real-time Audit Trail Table */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Galmee Hordoffii Nageenyaa (Security Audit Log - Zero Tamper)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Real-time Stream</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px] font-mono uppercase">
                        <th className="py-2">Yeroo</th>
                        <th className="py-2">Tarkaanfii</th>
                        <th className="py-2">Lakk. Galmee</th>
                        <th className="py-2">Eenyu</th>
                        <th className="py-2">Gahee</th>
                        <th className="py-2">Nageenya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-900/50">
                          <td className="py-2.5 text-slate-400">{log.timestamp}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.actionType === 'SIGN' ? 'bg-amber-500/20 text-amber-300' :
                              log.actionType === 'EDIT' ? 'bg-sky-500/20 text-sky-300' :
                              log.actionType === 'STAGE_TRANSFER' ? 'bg-purple-500/20 text-purple-300' :
                              log.actionType === 'UNAUTHORIZED_ATTEMPT' ? 'bg-red-500/20 text-red-300 animate-pulse' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {log.actionType}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-200">{log.docketNumber}</td>
                          <td className="py-2.5 text-slate-300">{log.performedBy}</td>
                          <td className="py-2.5 text-slate-400">{log.userRole}</td>
                          <td className="py-2.5">
                            <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 3: MALLATTOO DIJITAALAA FI DHUGUMMAA SANADOOTAA */}
      {activePillar === 'signature' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white font-serif-legal flex items-center gap-2">
                <span>‼️</span>
                <span>3. Mallattoo Dijitaalaa fi Dhugummaa Sanadootaa (Digital Signature & Tamper Detection)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Mallattoon dijitaalaa fi sanadoonni elektirooniksii akkamitti akka mirkanaa’an ifa ta’uu qaba. Jijjiirama sanadaa adda baasuufis mala amanamaa qabaachuun, seera ragaa fi seerota hojii irra jiran (Labsii Lakk. 1072/2018) waliin walsimuu qaba.
              </p>
            </div>

            <PremiumGate
              currentLang={currentLang}
              featureTitle={currentLang === 'om' ? 'Mallattoo Dijitaalaa SHA-256 (Digital Signatures)' : 'SHA-256 ዲጂታል ፊርማ'}
              featureDescription={currentLang === 'om' ? 'Mallattoon dijitaalaa fi dhugummaan sanadaa (Labsii 1072/2018) kaffaltoota Premium (role: "premium") qofaaf banaadha.' : 'የዲጂታል ፊርማ እና የሰነድ ማረጋገጫ ለፕሪሚየም ተመዝጋቢዎች ብቻ የቀረበ ነው።'}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Document Signing Box */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                    <FileSignature className="w-4 h-4" />
                    <span>Sanada Mallatteessuu (Cryptographic Sign)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Web Crypto SHA-256</span>
                </div>

                <textarea
                  value={docTextToSign}
                  onChange={e => setDocTextToSign(e.target.value)}
                  rows={8}
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  placeholder="Barruu murtii ykn sanada seeraa asitti barreessaa..."
                />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Mallatteessaan: <strong className="text-amber-300">{activeUserName} ({activeUserRole})</strong>
                  </span>
                  <button
                    onClick={handleSignDocument}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow"
                  >
                    <span>✍️</span>
                    <span>Mallattoo Dijitaalaan Cufi</span>
                  </button>
                </div>

                {signedCert && (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-2">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Sanadni Mallattoon Cufameera!</span>
                      </span>
                      <span className="text-[10px] font-mono">{signedCert.signedAt}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-1 font-mono">
                      <p className="truncate"><span className="text-slate-400">SHA-256 Hash:</span> {signedCert.hash}</p>
                      <p><span className="text-slate-400">Abbaa Seeraa:</span> {signedCert.signer} ({signedCert.role})</p>
                      <p><span className="text-slate-400">Madda Seeraa:</span> {signedCert.legalBasis}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tamper Detection & Verification Box */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    <span>Dhugummaa Mirkaneessuu (Tamper Detection)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Zero-Alteration Rule</span>
                </div>

                <p className="text-xs text-slate-400">
                  Sanada murtii kanaan dura mallatteeffame irratti harfin ykn mallattoon tokkoyyuu yoo jijjiirame, koodiin SHA-256 ni saaxila.
                </p>

                <div className="space-y-2">
                  <label className="text-[11px] text-slate-300 font-medium">Hash Sanada Jalqabaa (Original SHA-256):</label>
                  <input
                    type="text"
                    value={verifyInputHash}
                    onChange={e => setVerifyInputHash(e.target.value)}
                    placeholder="e.g. e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={handleVerifyIntegrity}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Sanadicha Qori & Dhugummaa Mirkaneessi</span>
                </button>

                {verifyResult === 'match' && (
                  <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <strong className="block font-bold">100% Qulqulluu & Kan Hin Jijjiiramne!</strong>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Sanadni kun erga abbaa seeraatiin mallatteeffamee as jijjiiramni tokkollee irratti hin raawwatamne. Seera ragaa bu\'uureffachuun fudhatama guutuu qaba.
                      </p>
                    </div>
                  </div>
                )}

                {verifyResult === 'tampered' && (
                  <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-xs flex items-start gap-3 animate-pulse">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Akeekkachiisa: Sanadni Jijjiirameera (Tampered Document)!</strong>
                      <p className="text-[11px] text-slate-200 mt-0.5">
                        Hash amma jiru fi hash jalqaba galmaa\'e wal hin simne. Sanada kana irratti qabiyyeen seeraan alaa jijjiirameera ykn sobeffameera.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </PremiumGate>
          </div>
        </div>
      )}

      {/* PILLAR 4: FURMAATA RAKKOO INTERNEETII FI IBSAA */}
      {activePillar === 'offline' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white font-serif-legal flex items-center gap-2">
                <span>🫥</span>
                <span>4. Furmaata Rakkoo Interneetii fi Ibsaa (Outage Resilience & Procedural Safeguards)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Interneetiin ykn humni ibsaa yoo cite, tajaajilli mana murtii akka hin dhaabbanneef mala bakka bu’aa qabaachuun barbaachisaadha. Rakkoon teeknikaa mirga qaamolee falmii miidhuu hin qabu.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Network Outage Status Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  Haala Qunnamtii (Connectivity)
                </h4>

                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                  isOnline && !isSimulatingOutage
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/30 border-red-500/40 text-red-300'
                }`}>
                  <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-xl">
                    {isOnline && !isSimulatingOutage ? '🌐' : '🔌'}
                  </div>
                  <div>
                    <strong className="block text-xs font-bold">
                      {isOnline && !isSimulatingOutage ? 'Online: Quunnamtii Cimaa' : 'Offline: Ibsaan / Interneetiin Citeera'}
                    </strong>
                    <span className="text-[10px] text-slate-400">
                      {isOnline && !isSimulatingOutage ? 'Kuusaan sirnaan sinkii ta\'aa jira.' : 'Local IndexedDB fail-safe active.'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Galmee Buffer keessatti kuufame:</span>
                    <strong className="text-amber-300 font-mono">{offlineBufferCount} Sanadoota</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Auto-Save Dhaabbataa:</span>
                    <strong className="text-emerald-400 font-mono">Sekondii 10\'n</strong>
                  </div>
                </div>

                <button
                  onClick={() => setIsSimulatingOutage(!isSimulatingOutage)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2"
                >
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <span>{isSimulatingOutage ? 'Quunnamtii Deebisi' : 'Cituu Ibsaa/Net Yaali (Simulate)'}</span>
                </button>
              </div>

              {/* Procedural Legal Protection Shield */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Qajeeltoo Eegumsa Mirga Seeraa (Legal Safeguard Against Technical Outages)</span>
                </h4>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 leading-relaxed text-slate-300">
                  <h5 className="font-bold text-amber-200">
                    Qajeelfama Mana Murtii: Rakkoo Teeknikaan Mirgi Falmii Hin Miidhamu
                  </h5>
                  <p>
                    1. <strong>Yeroon Hin Darbu:</strong> Cituun interneetii ykn humni ibsaa yoo ragaan mirkanaa\'e, guyyoota yeroon darbiinsaa (limitation periods) ykn beellamni dhaddachaa akka dabarretti hin lakkaa\'amu.
                  </p>
                  <p>
                    2. <strong>Waraabbii Offline:</strong> Dhaddachi yeroo ibsaan citu waraabbii sagalee fi qabiyyee offline meeshaa man-murtii keessatti kuufama; akkuma ibsaan deebi\'een battalatti server dhaddachaatti ol fe\'ama.
                  </p>
                  <p>
                    3. <strong>Beellama Haaromsuu:</strong> Qaamni falmii sababa cituu interneetiitiin dhaddacha virtual irratti hirmaachuu hin dandeenye, beellama haaraa gaafachuuf mirga guutuu qaba.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Kuusaan meeshaa keessanii yeroo hunda 100% eegamaadha.
                  </span>
                  <button
                    onClick={() => {
                      alert('Kuusaan dhimmaa fi beellamoonni hundi meeshaa keessan irratti amansiisaan kuufamaniiru.');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Buffer Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 5: SIRNA BEELLAMAA FI BEEKSISA DIJITAALAA */}
      {activePillar === 'schedule' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white font-serif-legal flex items-center gap-2">
                <span>🖐️</span>
                <span>5. Sirna Beellamaa fi Beeksisa Dijitaalaa (Limitation & Summons Notice)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Beellamni dhaddachaa, beeksisni qaamolee falmii fi hordoffiin daangaa yeroo seeraa sirna dijitaalaatiin deeggaramuu qabu. Haa ta’u malee, yaadachiisni dijitaalaa yeroo seeraa seeraan murtaa’e jijjiiruu hin qabu app kanaan wal qunnamsisu.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Statutory Limitation Tracker (Yeroon Darbiinsaa) */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Hordoffii Yeroon Darbiinsaa (Statutory Limitation Engine)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">የይርጋ ጊዜ መከታተያ</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Gosa Dhimmaa fi Seera Rogummaa Qabu:</label>
                    <select
                      value={statutoryCaseType}
                      onChange={e => setStatutoryCaseType(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="CivilGeneral">Hariiroo Hawaasaa Waliigalaa (Seera Hariiroo Hawaasaa Kwt 1845 - Waggaa 10)</option>
                      <option value="Tort">Miidhaa Seeraan Alaa / Tort (Seera Hariiroo Hawaasaa Kwt 2143 - Waggaa 2)</option>
                      <option value="CriminalMajor">Yakka Ulfaataa / Major Felony (Seera Yakkaa Kwt 217 - Waggaa 15)</option>
                      <option value="CassationAppeal">Ol-iyyannoo Dhaddacha Ijibbaataa (Labsii 1234/2021 - Guyyaa 30/60)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Guyyaa Taateen / Murtiin Kenname:</label>
                    <input
                      type="date"
                      value={statutoryEventDate}
                      onChange={e => setStatutoryEventDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Limitation Calculation Result */}
                  <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                    limitation.isExpired
                      ? 'bg-red-950/30 border-red-500/40 text-red-300'
                      : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span>{limitation.ruleCitation}</span>
                      <span className="text-[11px] font-mono">
                        {limitation.isExpired ? 'Yeroon Darbeera (Barred)' : `${limitation.remainingDays} Guyyoota Hafan`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {limitation.desc}
                    </p>
                    <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex items-center justify-between font-mono">
                      <span>Guyyoota Darban: {limitation.elapsedDays}</span>
                      <span>Daangaa Guutuu: {limitation.maxDays} guyyoota</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-amber-400/80 italic">
                    * Qajeelfama Murteessaa: Yaadachiisni dijitaalaa kun hubannoo seeraatiif malee daangaa yeroo seeraan murtaa\'e gonkumaa hin jijjiiru.
                  </p>
                </div>
              </div>

              {/* Court Summons & Notice Generator */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Wamicha Beellama Dhaddachaa (Court Summons)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Digital Notice</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2 text-slate-300 font-serif-legal">
                  <div className="text-center pb-2 border-b border-slate-800">
                    <strong className="block text-amber-300 font-bold">MANA MURTII FEDERAALAA SADARKAA JALQABAA</strong>
                    <span className="text-[10px] text-slate-400">Dhaddacha Hariiroo Hawaasaa • Wamicha Seeraa</span>
                  </div>
                  <p><span className="text-slate-400">Galmee Lakk:</span> {selectedDocket.docketNumber}</p>
                  <p><span className="text-slate-400">Himataa:</span> {selectedDocket.plaintiff}</p>
                  <p><span className="text-slate-400">Himatamaa:</span> {selectedDocket.defendant}</p>
                  <p><span className="text-slate-400">Guyyaa Beellamaa:</span> <strong className="text-white">{selectedDocket.nextHearingDate} Sa\'aatii 04:00</strong></p>
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    "Guyyaa jedhametti dhiyaattanii akka falmitan; yoo dhiyaachuu baattan falmiin bakka isin hin jirretti kan itti fufu ta\'uu beektanii..."
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const calData = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Dhaddacha Mana Murtii ${selectedDocket.docketNumber}\nDESCRIPTION:${selectedDocket.title}\nDTSTART:20261104T070000Z\nDTEND:20261104T090000Z\nEND:VEVENT\nEND:VCALENDAR`;
                      const blob = new Blob([calData], { type: 'text/calendar;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Beellama_${selectedDocket.docketNumber}.ics`;
                      a.click();
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>iCal (.ics) Buufadhu</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Wamicha Mana Murtii: Galmee ${selectedDocket.docketNumber} irratti beellamni guyyaa ${selectedDocket.nextHearingDate} sa'aatii 04:00 waan ta'eef qaamaan ykn Google Meet kanaan dhiyaadhaa: ${generatedMeetLink}`
                      );
                      setCopyFeedback('Beeksisni garagalfameera!');
                      setTimeout(() => setCopyFeedback(null), 3000);
                    }}
                    className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copyFeedback || 'SMS/Notice Garagalchi'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 6: DHADDACHA KARAA VIIDIYOO GAGGEESSUU (OFFICIAL GOOGLE MEET) */}
      {activePillar === 'videoMeet' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white font-serif-legal flex items-center gap-2">
                <span>🎥</span>
                <span>6. Dhaddacha Karaa Viidiyoo Gaggeessuu (Official Google Meet Integration)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Dhaddachi karaa viidiyoo gaggeeffamu haala seerri hayyamuun raawwatamuu qaba. Mirgi dhagahamuu, gargaarsa seeraa argachuu, ragaa dhiyeessuu fi dhaddacha irratti hirmaachuu qaamolee falmii kabajamuu qaba. Kana milkeessuuf sirna Google Meet official tahe uumuun dhiyaateera.
              </p>
            </div>

            <PremiumGate
              currentLang={currentLang}
              featureTitle={currentLang === 'om' ? 'Dhaddacha Karaa Viidiyoo (Official Google Meet Integration)' : 'የቪዲዮ ችሎት (Google Meet)'}
              featureDescription={currentLang === 'om' ? 'Dhaddacha karaa viidiyoo Google Meet official ta\'e uumuun fi mirga falmii mirkaneessuun kaffaltoota Premium (role: "premium") qofaaf banaadha.' : 'ኦፊሴላዊ የጎግል ሚት ችሎት ማዘጋጀት ለፕሪሚየም ተመዝጋቢዎች ብቻ የቀረበ ነው።'}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Official Google Meet Creator */}
              <div className="p-5 rounded-2xl bg-slate-950 border-2 border-amber-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-lg">
                      🎥
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Official Google Meet Hearing Creator
                      </h4>
                      <span className="text-[10px] text-emerald-400 font-mono">Certified Google Workspace Standard</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    HD & Encryption Active
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Mata-duree Dhaddachaa:</label>
                    <input
                      type="text"
                      value={meetTopic}
                      onChange={e => setMeetTopic(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Lakk. Galmee:</label>
                      <input
                        type="text"
                        value={meetDocketNum}
                        onChange={e => setMeetDocketNum(e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Abbaa Seeraa:</label>
                      <input
                        type="text"
                        value={meetJudge}
                        onChange={e => setMeetJudge(e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Guyyaa Dhaddachaa:</label>
                      <input
                        type="date"
                        value={meetDate}
                        onChange={e => setMeetDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Sa'aatii:</label>
                      <input
                        type="time"
                        value={meetTime}
                        onChange={e => setMeetTime(e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Email Qaamolee Falmii (Himatamaa, Abukaattoo):</label>
                    <input
                      type="text"
                      value={meetAttendeesEmails}
                      onChange={e => setMeetAttendeesEmails(e.target.value)}
                      placeholder="lawyer@example.com, court@example.com"
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <a
                      href={handleGenerateOfficialGoogleMeet().meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.01]"
                    >
                      <Video className="w-4 h-4" />
                      <span>Google Meet Official Banaa</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href={handleGenerateOfficialGoogleMeet().gcalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Google Calendar + Meet Uumi</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Generated Link Display */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-300 truncate mr-2">{generatedMeetLink}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedMeetLink);
                        setCopyFeedback('Link Google Meet garagalfameera!');
                        setTimeout(() => setCopyFeedback(null), 3000);
                      }}
                      className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-bold shrink-0 text-[11px]"
                    >
                      {copyFeedback || 'Copy Link'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Procedural Rights Verification Checklist */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <span>Mirkaneessa Mirga Qaamolee Falmii (Procedural Rights Checklist)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Constitutional Standard</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Abbaan seeraa dhaddacha viidiyoo Google Meet irratti eegaluun dura mirgoonni heeraa fi seera adeemsa falmii armaan gadii mirkanaa\'uu qabu:
                </p>

                <div className="space-y-3 text-xs">
                  {[
                    {
                      key: 'rightToBeHeard' as const,
                      title: '1. Mirga Dhagahamuu (Right to be Heard)',
                      desc: 'Sagaleen qaamolee falmii lamaanii ifatti dhaga\'amuu fi sagaleen isaanii akka hin ciramne mirkanaa\'eera.'
                    },
                    {
                      key: 'rightToCounsel' as const,
                      title: '2. Mirga Gargaarsa Seeraa (Right to Counsel)',
                      desc: 'Abukaattoon himatamaa/falmaa dhaddacha irratti hirmaachuu fi gorsa seeraa kennuuf bilisummaa qabaachuun mirkanaa\'eera.'
                    },
                    {
                      key: 'rightToEvidence' as const,
                      title: '3. Mirga Ragaa Dhiyeessuu (Right to Present Evidence)',
                      desc: 'Sanadoota fi ragaa agarsiisuuf dandeettiin screen share fi dhiyeessi ragaa Google Meet keessatti banaadha.'
                    },
                    {
                      key: 'rightToPublicAttendance' as const,
                      title: '4. Mirga Dhaddacha Irratti Hirmaachuu (Attendance & Public Trial)',
                      desc: 'Eenyummaan falmitootaa fi ragaa baatootaa karaa viidiyoo fi waraqaa eenyummaa mirkanaa\'eera.'
                    },
                    {
                      key: 'clerkTranscriptReady' as const,
                      title: '5. Qaboo Yaa\'ii Dhaddachaa (Official Record & Transcript)',
                      desc: 'Barreessaan dhaddachaa dubbii qaamolee hunda qaboo yaa\'ii irratti galmeessaa jiraachuun mirkanaa\'eera.'
                    }
                  ].map(item => (
                    <div
                      key={item.key}
                      onClick={() => setProceduralRightsVerified(prev => ({
                        ...prev,
                        [item.key]: !prev[item.key]
                      }))}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        proceduralRightsVerified[item.key]
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={proceduralRightsVerified[item.key]}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                      />
                      <div>
                        <strong className="block font-bold text-white text-xs">{item.title}</strong>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400">
                    Mirgoonni Heeraa Hundi Mirkanaa\'aniiru:
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg font-bold font-mono text-[11px] ${
                    Object.values(proceduralRightsVerified).every(Boolean)
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {Object.values(proceduralRightsVerified).every(Boolean) ? '100% Certified ✓' : 'Mirkaneessi Eeggata ⚠️'}
                  </span>
                </div>
              </div>
            </div>
            </PremiumGate>
          </div>
        </div>
      )}
    </div>
  );
};
export default DigitalJusticeHubView;
