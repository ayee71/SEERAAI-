import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent, analyzeLegalDocument } from '../services/api';
import { LegalCitationHighlighter } from '../components/LegalCitationHighlighter';
import { PdfExportModal } from '../components/PdfExportModal';
import { processDocumentOffThread } from '../services/documentExtractionService';
import { 
  Calculator, 
  Receipt, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Copy, 
  Check, 
  Printer, 
  Scale, 
  Landmark, 
  ShieldCheck, 
  Coins, 
  UserCheck, 
  Building,
  RefreshCw,
  Mic,
  ExternalLink,
  Radio,
  Sliders,
  Play,
  Pause,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Filter,
  Tag,
  Video,
  Share2,
  History,
  Clock
} from 'lucide-react';
import { CourtroomAudioRecorder } from '../components/CourtroomAudioRecorder';
import { buildShareableFindingUrl, getAppBaseUrl } from '../services/shareUrl';

interface JudicialExpertToolsViewProps {
  currentLang: Language;
  initialTool?: ExpertTool;
}

export type ExpertTool = 
  | 'summons_generator' 
  | 'judgment_redraft'
  | 'court_audio_recorder'
  | 'court_fees_calculator'
  | 'issue_framing'
  | 'limitation_checker'
  | 'evidence_evaluator'
  | 'document_hash_verifier';

export interface FeeTariffBracket {
  range: string;
  rate: string;
  amount: number;
}

export interface CourtFeeCalculationResult {
  claimCategory: string;
  claimAmount: number;
  courtLevel: 'first_instance' | 'high_court' | 'supreme_cassation';
  defendantsCount: number;
  documentsPageCount: number;
  hasAdvocatePower: boolean;
  isPauperPlea: boolean;
  
  baseFilingFee: number;
  bracketBreakdown: FeeTariffBracket[];
  summonsFee: number;
  registryStampFee: number;
  copyingFee: number;
  powerOfAttorneyFee: number;
  totalBeforeWaiver: number;
  finalTotalPayable: number;
  
  pecuniaryJurisdiction: 'first_instance' | 'high_court';
  jurisdictionNote: string;
  applicableLaw: string;
}

/**
 * Calculates court filing fees and incidental litigation tariffs according to
 * the Oromia Regional State Court Service Fees Regulation (Dambii Kaffaltii Tajaajila Manneen Murtii Oromiyaa)
 * and relevant Civil Procedure Code provisions (SDFHH Arts. 213, 215, 231, 244(1)(c), 467-479).
 */
export function calculateOromiaCourtFees(params: {
  claimCategory: string;
  claimAmount: number;
  courtLevel: 'first_instance' | 'high_court' | 'supreme_cassation';
  defendantsCount: number;
  documentsPageCount: number;
  hasAdvocatePower: boolean;
  isPauperPlea: boolean;
}): CourtFeeCalculationResult {
  const {
    claimCategory,
    claimAmount,
    courtLevel,
    defendantsCount,
    documentsPageCount,
    hasAdvocatePower,
    isPauperPlea,
  } = params;

  let baseFilingFee = 0;
  const bracketBreakdown: FeeTariffBracket[] = [];

  if (claimCategory === 'pecuniary') {
    const amt = Math.max(0, claimAmount);

    if (amt <= 1000) {
      baseFilingFee = amt > 0 ? Math.max(25, Math.round(amt * 0.025)) : 25;
      bracketBreakdown.push({
        range: 'Birrii 0 - 1,000',
        rate: '2.5% (Gadi aanaan 25 ETB)',
        amount: baseFilingFee,
      });
    } else {
      // Bracket 1: Up to 1,000 ETB
      const b1 = 25;
      bracketBreakdown.push({
        range: 'Birrii 0 - 1,000',
        rate: 'Gadi aanaan bu\'uuraa',
        amount: b1,
      });
      let runningFee = b1;

      // Bracket 2: 1,001 - 5,000 ETB (Span 4,000) @ 2.5%
      const b2Amt = Math.min(Math.max(0, amt - 1000), 4000);
      if (b2Amt > 0) {
        const fee2 = Math.round(b2Amt * 0.025);
        runningFee += fee2;
        bracketBreakdown.push({
          range: 'Birrii 1,001 - 5,000',
          rate: '2.5%',
          amount: fee2,
        });
      }

      // Bracket 3: 5,001 - 20,000 ETB (Span 15,000) @ 2.0%
      const b3Amt = Math.min(Math.max(0, amt - 5000), 15000);
      if (b3Amt > 0) {
        const fee3 = Math.round(b3Amt * 0.02);
        runningFee += fee3;
        bracketBreakdown.push({
          range: 'Birrii 5,001 - 20,000',
          rate: '2.0%',
          amount: fee3,
        });
      }

      // Bracket 4: 20,001 - 50,000 ETB (Span 30,000) @ 1.5%
      const b4Amt = Math.min(Math.max(0, amt - 20000), 30000);
      if (b4Amt > 0) {
        const fee4 = Math.round(b4Amt * 0.015);
        runningFee += fee4;
        bracketBreakdown.push({
          range: 'Birrii 20,001 - 50,000',
          rate: '1.5%',
          amount: fee4,
        });
      }

      // Bracket 5: 50,001 - 100,000 ETB (Span 50,000) @ 1.0%
      const b5Amt = Math.min(Math.max(0, amt - 50000), 50000);
      if (b5Amt > 0) {
        const fee5 = Math.round(b5Amt * 0.01);
        runningFee += fee5;
        bracketBreakdown.push({
          range: 'Birrii 50,001 - 100,000',
          rate: '1.0%',
          amount: fee5,
        });
      }

      // Bracket 6: 100,001 - 500,000 ETB (Span 400,000) @ 0.75%
      const b6Amt = Math.min(Math.max(0, amt - 100000), 400000);
      if (b6Amt > 0) {
        const fee6 = Math.round(b6Amt * 0.0075);
        runningFee += fee6;
        bracketBreakdown.push({
          range: 'Birrii 100,001 - 500,000',
          rate: '0.75%',
          amount: fee6,
        });
      }

      // Bracket 7: 500,001 - 1,000,000 ETB (Span 500,000) @ 0.50%
      const b7Amt = Math.min(Math.max(0, amt - 500000), 500000);
      if (b7Amt > 0) {
        const fee7 = Math.round(b7Amt * 0.005);
        runningFee += fee7;
        bracketBreakdown.push({
          range: 'Birrii 500,001 - 1,000,000',
          rate: '0.50%',
          amount: fee7,
        });
      }

      // Bracket 8: Above 1,000,000 ETB @ 0.25%
      const b8Amt = Math.max(0, amt - 1000000);
      if (b8Amt > 0) {
        const fee8 = Math.round(b8Amt * 0.0025);
        runningFee += fee8;
        bracketBreakdown.push({
          range: 'Birrii 1,000,000 ol',
          rate: '0.25%',
          amount: fee8,
        });
      }

      // Cap at statutory limit of 35,000 ETB
      baseFilingFee = Math.min(35000, runningFee);
    }
  } else if (claimCategory === 'family_divorce') {
    baseFilingFee = 75;
    bracketBreakdown.push({
      range: 'Dhimma Maatii & Gaa\'ela Diiguu',
      rate: 'Tarifa Dhaabbataa (Fixed Tariff)',
      amount: 75,
    });
  } else if (claimCategory === 'succession_heirship') {
    baseFilingFee = 100;
    bracketBreakdown.push({
      range: 'Waraqaa Dhaaltummaa Mirkaneeffachuu',
      rate: 'Tarifa Dhaabbataa (Fixed Tariff)',
      amount: 100,
    });
  } else if (claimCategory === 'declaration') {
    baseFilingFee = 100;
    bracketBreakdown.push({
      range: 'Mirga Mirkaneeffachuu / Beekkamtii',
      rate: 'Tarifa Dhaabbataa (Declaratory Action)',
      amount: 100,
    });
  } else if (claimCategory === 'injunction') {
    baseFilingFee = 60;
    bracketBreakdown.push({
      range: 'Ajaja Dhorkaa Yeroo (SDFHH Kwt 154)',
      rate: 'Tarifa Dhaabbataa (Interlocutory Injunction)',
      amount: 60,
    });
  } else if (claimCategory === 'rural_land') {
    baseFilingFee = 80;
    bracketBreakdown.push({
      range: 'Falmii Qabiyyee Lafa Baadiyyaa (Gatiin Hin Murtoofne)',
      rate: 'Tarifa Dhaabbataa (Land Holding Dispute)',
      amount: 80,
    });
  } else if (claimCategory === 'appeal_filing') {
    baseFilingFee = 150;
    bracketBreakdown.push({
      range: 'Iyyata Ol-Iyyannoo (SDFHH Kwt 327)',
      rate: 'Tarifa Dhaabbataa Mana Murtii Ol\'aanaa',
      amount: 150,
    });
  } else if (claimCategory === 'cassation_filing') {
    baseFilingFee = 250;
    bracketBreakdown.push({
      range: 'Iyyata Dhaddacha Ijibbaataa',
      rate: 'Tarifa Dhaabbataa Dhaddacha Ijibbaataa Oromiyaa',
      amount: 250,
    });
  } else if (claimCategory === 'execution_decree') {
    if (claimAmount > 0) {
      baseFilingFee = Math.min(3000, Math.max(50, Math.round(claimAmount * 0.01)));
      bracketBreakdown.push({
        range: `Raawwii Murtii Qabeenyaa (${claimAmount.toLocaleString()} ETB)`,
        rate: '1.0% (Gadi aanaan 50 ETB, Ol-aanaan 3,000 ETB)',
        amount: baseFilingFee,
      });
    } else {
      baseFilingFee = 80;
      bracketBreakdown.push({
        range: 'Raawwii Murtii Qabeenya Hin Taane',
        rate: 'Tarifa Dhaabbataa (Eviction / Handover)',
        amount: 80,
      });
    }
  } else {
    baseFilingFee = 100;
    bracketBreakdown.push({
      range: 'Falmii Qabeenya Hin Taane / Gatiin Hin Murtoofne',
      rate: 'Tarifa Dhaabbataa (Inestimable Value)',
      amount: 100,
    });
  }

  // Summons service fee: 20 ETB per party to summon
  const summonsFee = Math.max(1, defendantsCount) * 20;

  // File registry and stamp duty: 15 ETB
  const registryStampFee = 15;

  // Document copying & registry archive charge: 2 ETB per page
  const copyingFee = Math.max(0, documentsPageCount) * 2;

  // Power of Attorney validation stamp: 25 ETB if advocate represents
  const powerOfAttorneyFee = hasAdvocatePower ? 25 : 0;

  const totalBeforeWaiver = Math.round(
    baseFilingFee + summonsFee + registryStampFee + copyingFee + powerOfAttorneyFee
  );

  const finalTotalPayable = isPauperPlea ? 0 : totalBeforeWaiver;

  // Pecuniary jurisdiction threshold in Oromia (Proclamation No. 216/2011)
  const pecuniaryJurisdiction: 'first_instance' | 'high_court' =
    claimAmount > 500000 ? 'high_court' : 'first_instance';

  const jurisdictionNote =
    claimCategory === 'pecuniary'
      ? claimAmount > 500000
        ? 'Hangi falmii kun Birrii 500,000 ol waan ta\'eef, akkaataa Labsii Manneen Murtii Oromiyaa Lakk. 216/2011tiin aangoon sadarkaa duraa kan Mana Murtii Ol\'aanaati (First Instance Jurisdiction of High Court).'
        : 'Hangi falmii kun Birrii 500,000 gadi waan ta\'eef, akkaataa Labsii Manneen Murtii Oromiyaatiin aangoon sadarkaa duraa kan Mana Murtii Sadarkaa Jalqabaati (Aanaa).'
      : courtLevel === 'high_court'
      ? 'Manni Murtii Ol\'aanaa dhimmoota ol-iyyannoo fi aangoo addaa qorata.'
      : courtLevel === 'supreme_cassation'
      ? 'Manni Murtii Waliigalaa Oromiyaa dhaddacha ijibbaataatiin dogoggora bu\'uura seeraa qorata.'
      : 'Mana Murtii Sadarkaa Jalqabaa (Aanaa).';

  return {
    claimCategory,
    claimAmount,
    courtLevel,
    defendantsCount,
    documentsPageCount,
    hasAdvocatePower,
    isPauperPlea,
    baseFilingFee: Math.round(baseFilingFee),
    bracketBreakdown,
    summonsFee,
    registryStampFee,
    copyingFee,
    powerOfAttorneyFee,
    totalBeforeWaiver,
    finalTotalPayable,
    pecuniaryJurisdiction,
    jurisdictionNote,
    applicableLaw:
      'Dambii Kaffaltii Tajaajila Manneen Murtii Mootummaa Naannoo Oromiyaa Lakk. 08/2016 fi SDFHH Kwt 213, 215, 231, 244(1)(c), 467-479',
  };
}

export const JudicialExpertToolsView: React.FC<JudicialExpertToolsViewProps> = ({ 
  currentLang, 
  initialTool = 'court_fees_calculator' 
}) => {
  const [activeTool, setActiveTool] = useState<ExpertTool>(initialTool);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Upload loading states
  const [isUploadingPlaint, setIsUploadingPlaint] = useState(false);
  const [isUploadingDefense, setIsUploadingDefense] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [isUploadingJudgment, setIsUploadingJudgment] = useState(false);

  const plaintFileRef = useRef<HTMLInputElement | null>(null);
  const defenseFileRef = useRef<HTMLInputElement | null>(null);
  const evidenceFileRef = useRef<HTMLInputElement | null>(null);
  const judgmentFileRef = useRef<HTMLInputElement | null>(null);

  // Form states for existing tools
  const [plaintText, setPlaintText] = useState('');
  const [defenseText, setDefenseText] = useState('');
  const [claimType, setClaimType] = useState('contract');
  const [causeOfActionDate, setCauseOfActionDate] = useState('');
  const [testimonyText, setTestimonyText] = useState('');
  const [judgmentData, setJudgmentData] = useState({
    caseCategory: 'civil',
    courtName: 'Mana Murtii Ol’aanaa / Waliigalaa',
    caseDetails: '',
    legalBasis: '',
    originalVerdict: '',
  });
  const [summonsData, setSummonsData] = useState({
    courtName: '',
    caseNumber: '',
    parties: '',
    orderType: 'summons',
  });

  // COURT FEES CALCULATOR STATES
  const [feeCategory, setFeeCategory] = useState<string>('pecuniary');
  const [feeClaimAmount, setFeeClaimAmount] = useState<number>(150000);
  const [feeCourtLevel, setFeeCourtLevel] = useState<'first_instance' | 'high_court' | 'supreme_cassation'>('first_instance');
  const [feeDefendantsCount, setFeeDefendantsCount] = useState<number>(1);
  const [feePagesCount, setFeePagesCount] = useState<number>(5);
  const [feeHasAdvocatePower, setFeeHasAdvocatePower] = useState<boolean>(true);
  const [feeIsPauper, setFeeIsPauper] = useState<boolean>(false);
  const [feeCourtName, setFeeCourtName] = useState<string>('Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa');
  const [feeCaseNumber, setFeeCaseNumber] = useState<string>('Lakk. Galmee 31405/2016');
  const [feePlaintiff, setFeePlaintiff] = useState<string>('Obbo Caalaa Tolasaa');
  const [feeDefendant, setFeeDefendant] = useState<string>('Obbo Dheeressaa Baay\'isaa');
  const [feeNotes, setFeeNotes] = useState<string>('');
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  // DOCUMENT HASH VERIFIER STATES
  const [hashDocId, setHashDocId] = useState<string>('saiethio_master_archive');
  const [hashClientHash, setHashClientHash] = useState<string>('');
  const [hashFileContent, setHashFileContent] = useState<string>('');
  const [hashVerificationResult, setHashVerificationResult] = useState<any>(null);
  const [isVerifyingHash, setIsVerifyingHash] = useState<boolean>(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const [copiedHashCert, setCopiedHashCert] = useState(false);

  const handleVerifyDocumentHash = async () => {
    setIsVerifyingHash(true);
    setHashError(null);
    setHashVerificationResult(null);

    try {
      const response = await fetch('/api/verify-document-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: hashDocId !== 'custom' ? hashDocId : undefined,
          clientHash: hashClientHash.trim() || undefined,
          fileContent: hashFileContent.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Mirkaneessi hafuura sanadaa hin milkoofne.');
      }

      setHashVerificationResult(data);
    } catch (err: any) {
      console.error('Document hash verification error:', err);
      setHashError(err.message || 'Hojiin mirkaneessa hash hin milkoofne.');
    } finally {
      setIsVerifyingHash(false);
    }
  };

  // LIVE LEGAL NEWS TICKER FEED STATES (@seeraai_ethio)
  const [liveLegalFeed, setLiveLegalFeed] = useState<Array<{
    id: string;
    title: string;
    headline: string;
    postUrl: string;
    category?: string;
    fileNumber?: string;
    publishDate?: string;
    summary?: string;
  }>>([]);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [selectedFeedItem, setSelectedFeedItem] = useState<any | null>(null);

  interface MeetingHistoryItem {
    id: string;
    title: string;
    url: string;
    joinedAt: string;
  }

  const [meetingHistory, setMeetingHistory] = useState<MeetingHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('seera-meeting-history');
      return raw ? JSON.parse(raw) : [
        {
          id: 'mh-1',
          title: 'Walgahii Dhaddacha Ijibbaataa #01 (Cassation Bench)',
          url: 'https://meet.google.com/new',
          joinedAt: new Date(Date.now() - 1000 * 60 * 30).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ];
    } catch {
      return [];
    }
  });

  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedKioskUrl, setCopiedKioskUrl] = useState(false);
  const [audioRecordingElapsed, setAudioRecordingElapsed] = useState<number>(0);
  const [audioRecordingStatus, setAudioRecordingStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');

  const formatMmSs = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleAudioTimerUpdate = (e: any) => {
      if (e.detail) {
        if (typeof e.detail.duration === 'number') setAudioRecordingElapsed(e.detail.duration);
        if (e.detail.state) setAudioRecordingStatus(e.detail.state);
      }
    };
    window.addEventListener('seera:court_audio_timer_update', handleAudioTimerUpdate);
    return () => window.removeEventListener('seera:court_audio_timer_update', handleAudioTimerUpdate);
  }, []);

  const kioskDirectUrl = useMemo(() => {
    return `${getAppBaseUrl()}/kiosk`;
  }, []);

  const handleCopyKioskLink = async () => {
    try {
      await navigator.clipboard.writeText(kioskDirectUrl);
      setCopiedKioskUrl(true);
      setTimeout(() => setCopiedKioskUrl(false), 2500);
    } catch {
      // fallback
    }
  };

  const recordMeetingJoin = (title: string, url: string) => {
    try {
      const newItem: MeetingHistoryItem = {
        id: `mh_${Date.now()}`,
        title,
        url,
        joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const updated = [newItem, ...meetingHistory.filter(m => m.url !== url)].slice(0, 5);
      setMeetingHistory(updated);
      localStorage.setItem('seera-meeting-history', JSON.stringify(updated));
    } catch {}
  };

  const handleShareToolsConfig = async () => {
    try {
      const shareUrl = buildShareableFindingUrl('judicial', '', currentLang);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      // fallback
    }
  };

  // JUDICIAL TICKER SCROLL SPEED & SETTINGS STATES
  // Speed levels: 0 = Paused (0x), 1 = Slow (0.5x), 2 = Normal (1.0x), 3 = Fast (1.5x), 4 = Very Fast (2.0x)
  const [tickerSpeed, setTickerSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('seeraai_judicial_ticker_speed');
      return saved !== null ? parseInt(saved, 10) : 2; // Default: 2 (Normal)
    } catch {
      return 2;
    }
  });

  const [isTickerPaused, setIsTickerPaused] = useState<boolean>(() => {
    try {
      return localStorage.getItem('seeraai_judicial_ticker_paused') === 'true';
    } catch {
      return false;
    }
  });

  const [pauseOnHover, setPauseOnHover] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('seeraai_judicial_ticker_pause_hover');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isFeedHovered, setIsFeedHovered] = useState<boolean>(false);
  const [showFeedSettings, setShowFeedSettings] = useState<boolean>(false);
  const tickerContainerRef = useRef<HTMLDivElement>(null);

  // Compute duration in seconds based on speed level
  const tickerDuration = useMemo(() => {
    switch (tickerSpeed) {
      case 1: return 85; // Slow
      case 2: return 45; // Normal
      case 3: return 26; // Fast
      case 4: return 14; // Very Fast
      default: return 45;
    }
  }, [tickerSpeed]);

  const handleSpeedChange = (newSpeed: number) => {
    const val = Math.max(0, Math.min(4, newSpeed));
    setTickerSpeed(val);
    try {
      localStorage.setItem('seeraai_judicial_ticker_speed', String(val));
      if (val === 0) {
        setIsTickerPaused(true);
        localStorage.setItem('seeraai_judicial_ticker_paused', 'true');
      } else {
        setIsTickerPaused(false);
        localStorage.setItem('seeraai_judicial_ticker_paused', 'false');
      }
    } catch {}
  };

  const toggleTickerPause = () => {
    setIsTickerPaused(prev => {
      const next = !prev;
      try {
        localStorage.setItem('seeraai_judicial_ticker_paused', String(next));
      } catch {}
      return next;
    });
  };

  const togglePauseOnHover = () => {
    setPauseOnHover(prev => {
      const next = !prev;
      try {
        localStorage.setItem('seeraai_judicial_ticker_pause_hover', String(next));
      } catch {}
      return next;
    });
  };

  const scrollTickerManual = (direction: 'left' | 'right') => {
    if (tickerContainerRef.current) {
      const amount = direction === 'left' ? -280 : 280;
      tickerContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const getSpeedLabel = (speed: number) => {
    switch (speed) {
      case 0:
        return currentLang === 'om' ? 'Dhaabi (0x)' : currentLang === 'am' ? 'ቆሟል (0x)' : 'Paused (0x)';
      case 1:
        return currentLang === 'om' ? 'Suuta (0.5x)' : currentLang === 'am' ? 'ዝግታ (0.5x)' : 'Slow (0.5x)';
      case 2:
        return currentLang === 'om' ? 'Giddu-galeessa (1.0x)' : currentLang === 'am' ? 'መደበኛ (1.0x)' : 'Normal (1.0x)';
      case 3:
        return currentLang === 'om' ? 'Saffisaa (1.5x)' : currentLang === 'am' ? 'ፈጣን (1.5x)' : 'Fast (1.5x)';
      case 4:
        return currentLang === 'om' ? 'Baay\'ee Saffisaa (2.0x)' : currentLang === 'am' ? 'በጣም ፈጣን (2.0x)' : 'Very Fast (2.0x)';
      default:
        return currentLang === 'om' ? 'Giddu-galeessa (1.0x)' : 'Normal (1.0x)';
    }
  };

  // JUDICIAL TICKER CATEGORY FILTERING STATES
  // Categories: 'all' | 'cassation' | 'proclamations' | 'court_updates' | 'land' | 'labor'
  const [selectedFeedCategory, setSelectedFeedCategory] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('seeraai_judicial_ticker_category');
      return saved || 'all';
    } catch {
      return 'all';
    }
  });

  const feedCategories = useMemo(() => [
    {
      id: 'all',
      labelOm: 'Hunda (All)',
      labelAm: 'ሁሉም (All)',
      labelEn: 'All Updates',
      icon: '🌟',
      badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    },
    {
      id: 'cassation',
      labelOm: 'Dhaddacha Ijibbaataa',
      labelAm: 'የሰበር ችሎት',
      labelEn: 'Cassation Bench',
      icon: '⚖️',
      badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    },
    {
      id: 'proclamations',
      labelOm: 'Labsiiwwan Haaraa',
      labelAm: 'አዳዲስ አዋጆች',
      labelEn: 'New Proclamations',
      icon: '📜',
      badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    },
    {
      id: 'court_updates',
      labelOm: 'Oduu Mana Murtii',
      labelAm: 'የፍርድ ቤት ዜናዎች',
      labelEn: 'Court Updates',
      icon: '🏛️',
      badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
    },
    {
      id: 'land',
      labelOm: 'Lafa & Qabiyyee',
      labelAm: 'የመሬትና ይዞታ',
      labelEn: 'Land & Property',
      icon: '🌾',
      badgeColor: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
    },
    {
      id: 'labor',
      labelOm: 'Hojjetaa & Hojjechiisaa',
      labelAm: 'አሰሪና ሰራተኛ',
      labelEn: 'Labor & Employment',
      icon: '💼',
      badgeColor: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    },
  ], []);

  const handleCategoryChange = (catId: string) => {
    setSelectedFeedCategory(catId);
    try {
      localStorage.setItem('seeraai_judicial_ticker_category', catId);
    } catch {}
  };

  const getCategoryBadge = (catKey?: string) => {
    const k = (catKey || '').toLowerCase();
    if (k.includes('cass')) {
      return {
        label: currentLang === 'om' ? 'CASSATION BENCH' : currentLang === 'am' ? 'የሰበር ችሎት' : 'CASSATION BENCH',
        color: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
      };
    }
    if (k.includes('proc')) {
      return {
        label: currentLang === 'om' ? 'LABSII HAARAA' : currentLang === 'am' ? 'አዲስ አዋጅ' : 'NEW PROCLAMATION',
        color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
      };
    }
    if (k.includes('court')) {
      return {
        label: currentLang === 'om' ? 'COURT UPDATE' : currentLang === 'am' ? 'የፍርድ ቤት ዜና' : 'COURT UPDATE',
        color: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
      };
    }
    if (k.includes('land')) {
      return {
        label: currentLang === 'om' ? 'LAND & PROPERTY' : currentLang === 'am' ? 'መሬትና ይዞታ' : 'LAND & PROPERTY',
        color: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
      };
    }
    if (k.includes('labor')) {
      return {
        label: currentLang === 'om' ? 'LABOR & EMPLOYMENT' : currentLang === 'am' ? 'አሰሪና ሰራተኛ' : 'LABOR & EMPLOYMENT',
        color: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
      };
    }
    return {
      label: (catKey || 'SEERAAI').toUpperCase(),
      color: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    };
  };

  useEffect(() => {
    let isMounted = true;
    const fetchLiveFeed = async () => {
      try {
        const url = selectedFeedCategory !== 'all'
          ? `/api/telegram/live-legal-feed?limit=30&category=${selectedFeedCategory}`
          : '/api/telegram/live-legal-feed?limit=30';
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted && data.ok && Array.isArray(data.feed)) {
          setLiveLegalFeed(data.feed);
        }
      } catch (err) {
        console.warn('Failed to fetch live legal feed:', err);
      } finally {
        if (isMounted) setIsFeedLoading(false);
      }
    };
    fetchLiveFeed();
    const interval = setInterval(fetchLiveFeed, 60000); // refresh every 60s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedFeedCategory]);

  // Client-side category filtered feed ensuring instantaneous responsiveness
  const displayedFeed = useMemo(() => {
    if (selectedFeedCategory === 'all') return liveLegalFeed;
    return liveLegalFeed.filter((item) => {
      const cat = (item.category || '').toLowerCase();
      const tags = (item as any).tags || [];
      const hasTag = (tag: string) => tags.some((t: string) => t.toLowerCase().includes(tag));

      if (selectedFeedCategory === 'cassation') {
        return cat === 'cassation' || cat.includes('cass') || hasTag('cassation') || hasTag('ijibbaataa');
      }
      if (selectedFeedCategory === 'proclamations') {
        return cat === 'proclamations' || cat === 'proclamation' || cat.includes('proc') || hasTag('labsii') || hasTag('proclamation');
      }
      if (selectedFeedCategory === 'court_updates') {
        return cat === 'court_updates' || cat.includes('court') || hasTag('qajeelfama') || hasTag('dhaddacha') || hasTag('e-filing');
      }
      if (selectedFeedCategory === 'land') {
        return cat === 'land' || cat.includes('land') || hasTag('lafa') || hasTag('qabiyyee');
      }
      if (selectedFeedCategory === 'labor') {
        return cat === 'labor' || hasTag('hojjetaa') || hasTag('beenyaa');
      }
      return cat === selectedFeedCategory;
    });
  }, [liveLegalFeed, selectedFeedCategory]);

  // Compute item count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: liveLegalFeed.length };
    feedCategories.forEach(c => {
      if (c.id === 'all') return;
      counts[c.id] = liveLegalFeed.filter(item => {
        const cat = (item.category || '').toLowerCase();
        if (c.id === 'cassation') return cat === 'cassation' || cat.includes('cass');
        if (c.id === 'proclamations') return cat === 'proclamations' || cat === 'proclamation';
        if (c.id === 'court_updates') return cat === 'court_updates' || cat.includes('court');
        if (c.id === 'land') return cat === 'land';
        if (c.id === 'labor') return cat === 'labor';
        return cat === c.id;
      }).length;
    });
    return counts;
  }, [liveLegalFeed, feedCategories]);

  // Compute live fee calculation results
  const feeCalculation = useMemo(() => {
    return calculateOromiaCourtFees({
      claimCategory: feeCategory,
      claimAmount: feeClaimAmount,
      courtLevel: feeCourtLevel,
      defendantsCount: feeDefendantsCount,
      documentsPageCount: feePagesCount,
      hasAdvocatePower: feeHasAdvocatePower,
      isPauperPlea: feeIsPauper,
    });
  }, [
    feeCategory,
    feeClaimAmount,
    feeCourtLevel,
    feeDefendantsCount,
    feePagesCount,
    feeHasAdvocatePower,
    feeIsPauper,
  ]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'plaint' | 'defense' | 'evidence' | 'judgment'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'plaint') setIsUploadingPlaint(true);
    else if (target === 'defense') setIsUploadingDefense(true);
    else if (target === 'evidence') setIsUploadingEvidence(true);
    else if (target === 'judgment') setIsUploadingJudgment(true);

    try {
      const processed = await processDocumentOffThread(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
        enhanceContrast: true,
      });

      if (!processed.success) {
        throw new Error(processed.error || 'Failed to process document');
      }

      let extractedText = processed.text || '';

      if (!extractedText && processed.base64) {
        const res = await analyzeLegalDocument({
          fileData: processed.base64,
          mimeType: processed.mimeType,
          fileName: file.name,
          analysisType: 'plain_explanation',
          outputLanguages: [currentLang],
          customInstructions: `Extract and transcribe all text from this legal document (${file.name}) accurately in full detail for judicial review.`,
        });
        extractedText = res.analysis || '';
      }

      if (extractedText) {
        if (target === 'plaint') {
          setPlaintText((prev) => (prev ? prev + '\n\n' + extractedText : extractedText));
        } else if (target === 'defense') {
          setDefenseText((prev) => (prev ? prev + '\n\n' + extractedText : extractedText));
        } else if (target === 'evidence') {
          setTestimonyText((prev) => (prev ? prev + '\n\n' + extractedText : extractedText));
        } else if (target === 'judgment') {
          setJudgmentData((prev) => ({
            ...prev,
            caseDetails: prev.caseDetails ? prev.caseDetails + '\n\n' + extractedText : extractedText,
          }));
        }
      } else {
        alert(
          currentLang === 'om'
            ? 'Galmeerraa barreeffama dubbisuu hin danda\'amne.'
            : 'Could not extract text from document.'
        );
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      alert('Error: ' + (err.message || 'Unknown error'));
    } finally {
      if (target === 'plaint') setIsUploadingPlaint(false);
      else if (target === 'defense') setIsUploadingDefense(false);
      else if (target === 'evidence') setIsUploadingEvidence(false);
      else if (target === 'judgment') setIsUploadingJudgment(false);
      e.target.value = '';
    }
  };

  const handleRunTool = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    let prompt = '';

    if (activeTool === 'court_fees_calculator') {
      prompt = `
You are a Senior Judicial Registrar, Court Fee Assessor, and Civil Procedure Expert for the Oromia Regional State Court System (Manneen Murtii Mootummaa Naannoo Oromiyaa).

TASK: Provide an authoritative Judicial Fee Assessment and Procedural Audit under the Oromia Regional State Court Service Fees Regulation (Dambii Kaffaltii Tajaajila Manneen Murtii Oromiyaa Lakk. 08/2016) and the Civil Procedure Code (SDFHH Arts. 213, 215, 229, 231, 244(1)(c), and 467-479).

ASSESSMENT INPUTS:
- Court Name: ${feeCourtName}
- Case / Suit Number: ${feeCaseNumber}
- Plaintiff / Applicant: ${feePlaintiff}
- Defendant / Respondent: ${feeDefendant}
- Claim Category: ${feeCategory}
- Subject Matter Valuation / Claim Amount: ${feeCategory === 'pecuniary' || feeCategory === 'execution_decree' ? feeClaimAmount.toLocaleString() + ' ETB' : 'Non-monetary / Inestimable'}
- Court Level: ${feeCourtLevel}
- Defendants / Parties to Summon: ${feeDefendantsCount}
- Document Pages Filed / Copied: ${feePagesCount}
- Power of Attorney Stamp: ${feeHasAdvocatePower ? 'Yes (+25 ETB)' : 'No'}
- Pauper Application (Iyyata Deegaa / SDFHH Kwt 467): ${feeIsPauper ? 'YES (Fee Waiver Requested)' : 'No'}
- Valuation & Incidental Notes / Opponent Objection:
"""
${feeNotes || 'No specific valuation disputes reported. Standard assessment requested.'}
"""

DETERMINED CALCULATOR STATUTORY FIGURES:
- Base Filing Fee: ${feeCalculation.baseFilingFee.toLocaleString()} ETB
- Summons Service Fee: ${feeCalculation.summonsFee.toLocaleString()} ETB
- Registry & Stamp Duty: ${feeCalculation.registryStampFee.toLocaleString()} ETB
- Document Copying Charge: ${feeCalculation.copyingFee.toLocaleString()} ETB
- Power of Attorney Fee: ${feeCalculation.powerOfAttorneyFee.toLocaleString()} ETB
- Total Statutory Tariffs Before Waiver: ${feeCalculation.totalBeforeWaiver.toLocaleString()} ETB
- Final Net Payable by Applicant: ${feeCalculation.finalTotalPayable.toLocaleString()} ETB (${feeIsPauper ? 'WAIVED under Pauper Status' : 'Payable to Court Revenue Account'})

PROVIDE A THOROUGH, AUTHORITATIVE JUDICIAL ASSESSMENT REPORT IN AFAAN OROMOO:
1. QORANNOO TARIFA SEERAA (Statutory Tariff Verification):
   - Explain the progressive brackets and statutory fee calculation under Oromia Court Service Fees Regulation Lakk. 08/2016.
2. AANGOO DHADDACHAA FI HANGA FALMII (Jurisdictional Threshold Analysis):
   - Analyze whether the claim fits Woreda Court or High Court original jurisdiction under Oromia Courts Proclamation No. 216/2011 (500,000 ETB pecuniary limit).
3. MORMII SADARKAA DURAA KAFFALTII GALMEE IRRATTI (Preliminary Objection on Court Fees - SDFHH Art. 244(1)(c)):
   - Detail the procedural protocol if the defendant raises an objection that the claim was deliberately undervalued to pay less fee or change jurisdiction.
   - Explain the judge's power under SDFHH Art. 231 to order payment of the fee deficit within a given deadline prior to rejection of the plaint.
4. QORANNOO IYYATA DEEGAA (Pauper Application Protocol - SDFHH Arts. 467-479):
   - Explain the mandatory evidentiary tests (Kebele indigent proof, cross-examination on property, statutory rights of the applicant).
5. AJAJA QORANNOO KAFFALTII REGISTRAR (Final Official Registry Assessment Order & Bank Payment Slip Instruction).

Format with professional legal clarity and statutory citations.
`;
    } else if (activeTool === 'issue_framing') {
      prompt = `
You are a Senior High Court Judge and Legal Expert in Ethiopian Civil Procedure.
TASK: Automatic Framing of Issues (SDFHH Arts. 246 & 247).
Based on the following Plaint and Defense, identify and frame the mandatory Issues of Fact and Issues of Law.

PLAINT (IYYATA HIMATAA):
"""
${plaintText}
"""

DEFENSE (DEEBII HIMATAMAA):
"""
${defenseText}
"""

OUTPUT FORMAT:
1. Summary of Non-Contested Facts (Qabxiiwwan hin falmisiifne).
2. Framed Issues of Fact (Qabxiiwwan falmisiisoo dhugaa).
3. Framed Issues of Law (Qabxiiwwan falmisiisoo seeraa).
4. Statutory Reasoning (Bu'uura seeraa).
`;
    } else if (activeTool === 'limitation_checker') {
      prompt = `
You are a Statute of Limitations (Yirgaa) Expert for Ethiopian Law.
TASK: Analyze if the claim is barred by limitation based on the Ethiopian Civil Code.

CLAIM TYPE: ${claimType}
CAUSE OF ACTION ACCRUAL DATE: ${causeOfActionDate}
CURRENT DATE: ${new Date().toLocaleDateString()}

Analyze:
1. Relevant Limitation Period (e.g., Art. 1845 - 10 years, Art. 2143 - 2 years).
2. Exact Expiry Date.
3. Verdict: [✅ ALLOWED / ⚠️ BARRED BY LIMITATION].
4. Legal Justification with Articles.
`;
    } else if (activeTool === 'evidence_evaluator') {
      prompt = `
You are a Judicial Evidence Analyst.
TASK: Evaluate the consistency and credibility of the provided witness testimonies / evidence.

EVIDENCE/TESTIMONY DATA:
"""
${testimonyText}
"""

OUTPUT:
1. Key Contradictions (Wal-faallessummaa ragaa).
2. Material Facts Proved (Dhugaawwan mirkanaa'an).
3. Material Facts Not Proved (Dhugaawwan hin mirkanoofne).
4. Judicial Recommendation for Weight of Evidence (Madaallii ulfaatina ragaa).
`;
    } else if (activeTool === 'summons_generator') {
      prompt = `
You are a Court Registrar and Legal Clerk for an Ethiopian High Court.
TASK: Generate a formal ${summonsData.orderType} document.

DETAILS:
- COURT: ${summonsData.courtName}
- CASE NO: ${summonsData.caseNumber}
- PARTIES: ${summonsData.parties}

Based on Ethiopian Civil Procedure formalities, draft a professional, standard ${summonsData.orderType}.
Ensure it includes:
1. Formal header with Coat of Arms placeholder.
2. Clear instruction to the recipient.
3. Relevant statutory citations (e.g., for summons: SDFHH Arts. 94-110; for injunctions: SDFHH Arts. 154-159).
4. Signature and Seal placeholders.

GENERATE IN ${currentLang === 'om' ? 'Afaan Oromoo' : currentLang === 'am' ? 'Amharic' : 'English'}.
`;
    } else if (activeTool === 'judgment_redraft') {
      prompt = `
You are an eminent Appellate Judge, Legal Drafting Expert, and Master of Afaan Oromoo Legal Terminology (Seer-luga Afaan Oromoo).
TASK: Redraft and polish a judicial decision (Murtii Abbaa Seeraa) for either a Civil or Criminal case, ensuring complete legal accuracy, consistency with Ethiopian federal/regional laws and Supreme Court Cassation precedents, and immaculate Afaan Oromoo legal prose.

CASE CATEGORY: ${judgmentData.caseCategory === 'civil' ? 'Dhimma Hariiroo Hawaasaa (Civil)' : 'Dhimma Yakkaa (Criminal)'}
COURT: ${judgmentData.courtName}
CASE DETAILS & EVIDENCE / PROCEEDINGS:
"""
${judgmentData.caseDetails}
"""

APPLICABLE LAWS / PROCLAMATIONS / ARTICLES:
"""
${judgmentData.legalBasis}
"""

ORIGINAL DRAFT / VERDICT NOTES:
"""
${judgmentData.originalVerdict}
"""

REQUIREMENTS FOR THE REDRAFTED JUDGMENT:
1. Formal Judicial Header (Mata-duree Mana Murtichaa, Lakk. Galmee, Maqaa Paartilee).
2. Seenaa Dhimmichaa (Background of the case, Plaint/Charges, Defense/Pleas).
3. Qabxiiwwan Falmii / Dhimmoota Murtii Argachuu Qaban (Framed Issues for determination).
4. Xiinxala Seeraa fi Ragaa (Legal and Evidentiary Analysis - citing exact articles of Ethiopian Civil Code, Criminal Code, Criminal Procedure Code, or Civil Procedure Code).
5. Murtii / Ajaja Dhumaa (Binding Final Judgment and Orders).
6. Written in professional, flawless Afaan Oromoo legal terminology (Seer-luga seeraan eeggate, qubee fi guca seeraa sirrii).

GENERATE THE COMPLETE JUDGMENT IN AFAAN OROMOO.
`;
    }

    try {
      const res = await generateLegalContent({
        prompt,
        taskType: 'explain_law',
        outputLanguages: [currentLang],
      });
      setResult(res.content);
    } catch (err: any) {
      setError(err.message || 'Hojiin kun hin milkoofne.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyVoucherDetails = () => {
    const voucherText = `
======================================================
  WARAQAA QORANNOO FI MIRKANEESSA KAFFALTII MANA MURTII
       (Official Court Fee Assessment Voucher)
======================================================
Mana Murtii: ${feeCourtName}
Lakk. Galmee: ${feeCaseNumber}
Guyyaa: ${new Date().toLocaleDateString()}
Koodii Kaffaltii: OEB-FEE-${Math.abs(feeCourtName.length * 103 + feeClaimAmount % 9999)}

Himataa: ${feePlaintiff}
Himatamaa: ${feeDefendant}
Gosa Falmii: ${feeCategory}
Gatii/Hanga Falmii: ${feeCategory === 'pecuniary' ? feeClaimAmount.toLocaleString() + ' ETB' : 'Gatiin hin murtoofne'}

BAASIIWWAN TARREEFFAMAAN:
1. Kaffaltii Himannaa (Filing Fee): ${feeCalculation.baseFilingFee.toLocaleString()} ETB
2. Kaffaltii Waamichaa (${feeDefendantsCount} parties): ${feeCalculation.summonsFee.toLocaleString()} ETB
3. Kaffaltii Chaappaa fi Galmee: ${feeCalculation.registryStampFee.toLocaleString()} ETB
4. Kaffaltii Waraabbii Sanadaa (${feePagesCount} pages): ${feeCalculation.copyingFee.toLocaleString()} ETB
5. Kaffaltii Waraqaa Bakkummaa: ${feeCalculation.powerOfAttorneyFee.toLocaleString()} ETB
------------------------------------------------------
Waliigala Kaffaltii: ${feeCalculation.totalBeforeWaiver.toLocaleString()} ETB
Kaffaltii Qulqulluu (Net Payable): ${feeCalculation.finalTotalPayable.toLocaleString()} ETB ${feeIsPauper ? '(Bilisummaa Kaffaltii Deegaa - SDFHH Kwt 467)' : ''}

HERREGA BAANKII MANA MURTICHAA:
- Baankii Daldala Itoophiyaa (CBE): 1000023489102
- Baankii Oromiyaa (OB): 13498271001
- Telebirr Merchant ID: 882910

Bu'uura Seeraa: Dambii Kaffaltii Tajaajila Manneen Murtii Oromiyaa Lakk. 08/2016
======================================================
`;
    navigator.clipboard.writeText(voucherText);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2500);
  };

  const printVoucher = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-10 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Scale className="w-4 h-4 text-amber-400" />
            <span>Judicial Expert & Bench Tools</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif-legal font-bold text-slate-100 flex items-center gap-3">
            <span>{currentLang === 'om' ? 'Meeshaalee Ogeessa Seeraa & Abbaa Seeraa' : 'Judicial & Legal Professional Tools'}</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-3xl">
            {currentLang === 'om' 
              ? 'Hojii mana murtii saffisiisuuf: Shallaggii Kaffaltii Mana Murtii (Court Fees Calculator), Qabxii falmii qabuu, Yirgaa herreguu, madaallii ragaa fi murtii seeraa qopheessuu.'
              : 'Accelerate judicial workflows: Oromia Court Fees Calculator, AI-powered issue framing, statute of limitation calculations, and evidentiary analysis.'}
          </p>
        </div>
      </div>

      {/* Prominent Direct Join Video Conference Card */}
      <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>DIRECT LEGAL VIDEO CONFERENCE (LOGIN MALEE)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                🌐 Chrome • Edge • Moobaayila Ready
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-serif-legal font-bold text-slate-100">
              {currentLang === 'om' ? 'Walgahii Viidiyoo Dhaddacha Seeraa (Kallattiin Seeni)' : currentLang === 'am' ? 'የቀጥታ የሕግ ክርክር የቪዲዮ ስብሰባ (በቀጥታ ይግቡ)' : 'Live Legal Video Conference & Collaboration'}
            </h3>
          </div>

          {/* Quick Share & Courtroom Audio Toolbar */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Primary Audio Recording Button */}
              <button
                id="seera-audio-recording-btn"
                type="button"
                onClick={() => {
                  setActiveTool('court_audio_recorder');
                  if (audioRecordingStatus === 'idle') {
                    window.dispatchEvent(new CustomEvent('seera:court_audio_recording_toggle', { detail: { action: 'start' } }));
                  }
                  window.scrollTo({ top: 600, behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-rose-400 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-rose-500/20 cursor-pointer transition-all active:scale-95 ring-2 ring-rose-400/40"
                title="Capture courtroom hearing audio directly into active case context with auto metadata"
              >
                <Mic className="w-4 h-4 text-slate-950 animate-pulse shrink-0" />
                <span>{currentLang === 'om' ? '🎙️ Audio Recording' : currentLang === 'am' ? '🎙️ ድምፅ መቅረጫ' : '🎙️ Audio Recording'}</span>
              </button>

              {/* Secondary Pause/Resume Session Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  if (audioRecordingStatus === 'recording') {
                    window.dispatchEvent(new CustomEvent('seera:court_audio_recording_toggle', { detail: { action: 'pause' } }));
                  } else if (audioRecordingStatus === 'paused') {
                    window.dispatchEvent(new CustomEvent('seera:court_audio_recording_toggle', { detail: { action: 'resume' } }));
                  } else {
                    setActiveTool('court_audio_recorder');
                    window.dispatchEvent(new CustomEvent('seera:court_audio_recording_toggle', { detail: { action: 'start' } }));
                  }
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow border ${
                  audioRecordingStatus === 'recording'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                    : audioRecordingStatus === 'paused'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 animate-pulse'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title={
                  audioRecordingStatus === 'recording'
                    ? 'Dhaabi Yeroof (Pause Recording without ending file)'
                    : audioRecordingStatus === 'paused'
                    ? 'Itti Fufsiisi (Resume Recording)'
                    : 'Qophidha (Pause/Resume Standby)'
                }
              >
                {audioRecordingStatus === 'recording' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentLang === 'om' ? 'Dhaabi Yeroof' : 'Pause'}</span>
                  </>
                ) : audioRecordingStatus === 'paused' ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{currentLang === 'om' ? 'Itti Fufsiisi' : 'Resume'}</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-slate-500" />
                    <span>{currentLang === 'om' ? 'Dhaabi / Fufsiisi' : 'Pause / Resume'}</span>
                  </>
                )}
              </button>

              {/* Visual MM:SS Duration & Metadata State Badge */}
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-rose-500/50 text-rose-400 font-mono font-black text-xs flex items-center gap-1.5 shadow-inner" title="Elapsed Audio Recording Time & Metadata State">
                <span className={`w-2 h-2 rounded-full ${
                  audioRecordingStatus === 'recording' 
                    ? 'bg-rose-500 animate-ping' 
                    : audioRecordingStatus === 'paused' 
                    ? 'bg-amber-400' 
                    : 'bg-slate-600'
                }`} />
                <span>
                  {audioRecordingStatus === 'paused' ? 'PAUSED' : 'REC'} {formatMmSs(audioRecordingElapsed)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShareToolsConfig}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Share current judicial tools configuration link"
            >
              <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{currentLang === 'om' ? 'Qoodi' : currentLang === 'am' ? 'አጋራ' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareToolsConfig}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Copy shareable link to clipboard"
            >
              {copiedShareLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-bold">{currentLang === 'om' ? 'Linkii Garagaleera!' : currentLang === 'am' ? 'ሊንኩ ተቀድቷል!' : 'Link Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{currentLang === 'om' ? 'Linkii Qoodamuu Garagalchi' : currentLang === 'am' ? 'የሚጋራውን ሊንክ ቅዳ' : 'Copy Shareable Link'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* PRIMARY GIANT 1-CLICK INSTANT JOIN BUTTON */}
        <div className="space-y-3">
          <a
            href="https://meet.google.com/new"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => recordMeetingJoin('Google Meet Direct Session', 'https://meet.google.com/new')}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 transition-all cursor-pointer ring-4 ring-emerald-400/40 transform hover:-translate-y-0.5"
            title="Kallattiin Seenasaa - Login malee"
          >
            <Video className="w-6 h-6 text-slate-950 shrink-0 animate-bounce" />
            <span className="tracking-wide">
              {currentLang === 'om'
                ? '🚀 KALLATTIIN WALGAHII SEENI (1-CLICK DIRECT JOIN - LOGIN MALEE)'
                : currentLang === 'am'
                ? '🚀 በቀጥታ ስብሰባውን ይቀላቀሉ (ያለ መግቢያ - DIRECT JOIN)'
                : '🚀 1-CLICK DIRECT JOIN MEETING (NO LOGIN NEEDED)'}
            </span>
            <ExternalLink className="w-5 h-5 text-slate-950 shrink-0" />
          </a>

          {/* Secondary Direct Server Option */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-slate-300 font-mono">
              ✅ Google Meet & Open WebRTC: Akkaawuntii, eeyyama ykn password tokko malee namni hundi kallattiin seena.
            </p>
            <a
              href="https://meet.ffrn.de/SEERAAI-LegalCollab-seera-collab-room-01#config.prejoinPageEnabled=false&config.requireDisplayName=false"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordMeetingJoin('Open WebRTC Direct Session', 'https://meet.ffrn.de/SEERAAI-LegalCollab-seera-collab-room-01')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-500/40 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>🌐 Open WebRTC Server Seeni</span>
              <ExternalLink className="w-3 h-3 text-sky-400" />
            </a>
          </div>

          {/* Courtroom Kiosk Direct Link Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                🏛️
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <span>Link Kiosk Mana Murtii (Courtroom Screen Kiosk)</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-mono font-bold">1-CLICK KIOSK</span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono truncate" title={kioskDirectUrl}>
                  {kioskDirectUrl}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyKioskLink}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all"
              >
                {copiedKioskUrl ? (
                  <>
                    <Check className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>Kiosk Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>Copy Kiosk Link</span>
                  </>
                )}
              </button>
              <a
                href={kioskDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span>🚀 Launch Kiosk</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Meetings List (Displays last 5 Jitsi meetings joined from local storage 'seera-meeting-history') */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <History className="w-4 h-4 text-amber-400" />
            <span>
              {currentLang === 'om'
                ? 'Seenaa Walgahiiwwan Recent Jitsi Meetings'
                : currentLang === 'am'
                ? 'የቅርብ ጊዜ የJitsi ስብሰባዎች ታሪክ (Recent Meetings)'
                : 'Recent Jitsi Meetings History'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {meetingHistory.length} / 5 {currentLang === 'om' ? 'kuufaman' : 'saved'}
          </span>
        </div>

        {meetingHistory.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {meetingHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2 hover:border-slate-700 transition-all"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-200 truncate" title={item.title}>
                    {item.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{item.joinedAt}</span>
                  </div>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => recordMeetingJoin(item.title, item.url)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] flex items-center gap-1 shrink-0 transition-colors"
                  title="Re-Join Meeting"
                >
                  <Video className="w-3 h-3" />
                  <span>Re-Join</span>
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-mono py-2 text-center">
            {currentLang === 'om' ? 'Seenaan walgahii yeroo ammaa hin kuufamne.' : 'No recent meetings recorded in local storage yet.'}
          </div>
        )}
      </div>

      {/* Live Legal Feed Ticker (@seeraai_ethio Telegram News Ticker) */}
      <div className="rounded-2xl border border-amber-500/30 bg-slate-900 shadow-xl overflow-hidden transition-all">
        {/* Main Ticker Row */}
        <div className="p-3 sm:p-3.5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Channel & Live Badge */}
          <div className="flex items-center justify-between md:justify-start gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-red-500/20 to-amber-500/10 border border-amber-500/40 text-amber-300 font-bold text-xs">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <span className="uppercase tracking-wider font-mono font-bold text-[11px]">LIVE LEGAL FEED</span>
              <span className="text-[10px] text-slate-400 font-normal">@seeraai_ethio</span>
            </div>

            {/* Mobile-visible quick play/pause & settings button */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTickerPause}
                className={`p-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                  isTickerPaused || tickerSpeed === 0
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={isTickerPaused ? 'Itti fufi (Resume)' : 'Dhaabi (Pause)'}
              >
                {isTickerPaused || tickerSpeed === 0 ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setShowFeedSettings(!showFeedSettings)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                  showFeedSettings
                    ? 'bg-amber-500/25 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isTickerPaused ? '0x' : `${tickerSpeed === 1 ? '0.5x' : tickerSpeed === 2 ? '1x' : tickerSpeed === 3 ? '1.5x' : '2x'}`}</span>
              </button>
            </div>
          </div>

          {/* Scrolling Ticker Track */}
          <div 
            ref={tickerContainerRef}
            onMouseEnter={() => setIsFeedHovered(true)}
            onMouseLeave={() => setIsFeedHovered(false)}
            className="flex-1 w-full overflow-x-auto no-scrollbar relative min-h-[36px] flex items-center"
          >
            {isFeedLoading ? (
              <div className="text-xs text-slate-400 animate-pulse font-mono flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Oduu fi Murtiiwwan Seeraa Haaraa @seeraai_ethio fe'aa jira...</span>
              </div>
            ) : displayedFeed.length > 0 ? (
              <div 
                className={`flex items-center gap-3 w-max py-0.5 text-xs ${
                  !isTickerPaused && tickerSpeed > 0 ? 'animate-live-ticker' : ''
                }`}
                style={{
                  ['--ticker-duration' as any]: `${tickerDuration}s`,
                  animationPlayState: (pauseOnHover && isFeedHovered) || isTickerPaused || tickerSpeed === 0 ? 'paused' : 'running',
                }}
              >
                {/* Render feed items - doubled for continuous seamless loop */}
                {[...displayedFeed, ...displayedFeed].map((item, idx) => {
                  const itemTitle = typeof item.title === 'object' && item.title !== null
                    ? ((item.title as any)[currentLang] || (item.title as any).om || (item.title as any).en || '')
                    : (item.title || item.headline || 'Murtii Seeraa');
                  const catBadge = getCategoryBadge(item.category);
                  return (
                    <div
                      key={`${item.id || 'feed'}-${idx}`}
                      onClick={() => setSelectedFeedItem(item)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer text-slate-200 group shrink-0 shadow-sm hover:border-amber-500/40"
                    >
                      <span className={`px-2 py-0.5 rounded-md border font-bold font-mono text-[10px] ${catBadge.color}`}>
                        {catBadge.label}
                      </span>
                      <span className="font-medium group-hover:text-amber-300 transition-colors max-w-xs truncate">
                        {itemTitle}
                      </span>
                      {item.fileNumber && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          #{item.fileNumber}
                        </span>
                      )}
                      <a
                        href={item.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 text-[10px] ml-1 font-mono hover:underline"
                        title="Telegram Post Banadhu"
                      >
                        <span>Post</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-mono flex items-center gap-2 py-1">
                <span>{currentLang === 'om' ? 'Oduun kutaa filatameef yeroo ammaa hin argamne.' : currentLang === 'am' ? 'በዚህ ምድብ ውስጥ የተገኘ ዜና የለም።' : 'No news found in this category.'}</span>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('all')}
                  className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  {currentLang === 'om' ? 'Hunda Mul\'isi (Show All)' : currentLang === 'am' ? 'ሁሉንም አሳይ' : 'Show All'}
                </button>
              </div>
            )}
          </div>

          {/* Desktop Speed & Navigation Controls */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-800">
            {/* Step Left/Right manual buttons */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => scrollTickerManual('left')}
                className="p-1.5 rounded-l-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Bitaatti deemi (Scroll Left)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollTickerManual('right')}
                className="p-1.5 rounded-r-lg bg-slate-950 hover:bg-slate-800 border-y border-r border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Mirgatti deemi (Scroll Right)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={toggleTickerPause}
              className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 ${
                isTickerPaused || tickerSpeed === 0
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title={isTickerPaused ? 'Itti fufi (Resume ticker)' : 'Dhaabi (Pause ticker)'}
            >
              {isTickerPaused || tickerSpeed === 0 ? (
                <Play className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Feed Settings Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFeedSettings(!showFeedSettings)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                showFeedSettings
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-amber-300'
              }`}
              title="Qindaa'ina Ticker & Kutaalee (Live Legal Feed Settings)"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold">
                {isTickerPaused ? '⏸️ 0x' : `${tickerSpeed === 1 ? '0.5x' : tickerSpeed === 2 ? '1.0x' : tickerSpeed === 3 ? '1.5x' : '2.0x'}`}
              </span>
              <span className="text-[10px] text-slate-400 hidden lg:inline">
                {currentLang === 'om' ? 'Qindaa\'ina' : currentLang === 'am' ? 'ማስተካከያ' : 'Settings'}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Category Selector Pills Bar */}
        <div className="px-3 sm:px-4 py-2 border-t border-slate-800/80 bg-slate-950/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold uppercase tracking-wider text-[10px]">
              {currentLang === 'om' ? 'Kutaa:' : currentLang === 'am' ? 'ምድብ:' : 'Category:'}
            </span>
          </div>
          {feedCategories.map((cat) => {
            const isSelected = selectedFeedCategory === cat.id;
            const count = categoryCounts[cat.id] ?? 0;
            const label = currentLang === 'om' ? cat.labelOm : currentLang === 'am' ? cat.labelAm : cat.labelEn;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/25 border border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20 font-bold'
                    : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Legal Feed Settings Drawer / Panel */}
        {showFeedSettings && (
          <div className="border-t border-amber-500/20 bg-slate-950/95 p-4 sm:p-5 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>
                    {currentLang === 'om' 
                      ? 'Qindaa\'ina Ticker & Kutaalee Oduu Seeraa (Feed Controls)' 
                      : currentLang === 'am' 
                        ? 'የቀጥታ ሕግ ዜና ማስተካከያና የምድብ መራጭ (Feed Controls)' 
                        : 'Live Legal Feed Ticker & Category Controls'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
                    Judges Bench Control
                  </span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedSettings(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 cursor-pointer"
              >
                ✕ {currentLang === 'om' ? 'Cufi' : currentLang === 'am' ? 'ዝጋ' : 'Close'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category Filter Section */}
              <div className="space-y-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentLang === 'om' ? 'Filannoo Kutaalee Telegram' : currentLang === 'am' ? 'የቴሌግራም ምድብ መራጭ' : 'Telegram Category Filter'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {displayedFeed.length} {currentLang === 'om' ? 'murtiiwwan' : 'records'}
                  </span>
                </div>

                {/* Dropdown Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                    {currentLang === 'om' ? 'Kutaa Filadhu (Category Dropdown)' : currentLang === 'am' ? 'ምድብ ይምረጡ (Dropdown)' : 'Select Category (Dropdown)'}
                  </label>
                  <select
                    value={selectedFeedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    {feedCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {currentLang === 'om' ? cat.labelOm : currentLang === 'am' ? cat.labelAm : cat.labelEn} ({categoryCounts[cat.id] ?? 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Chips Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                  {feedCategories.map((cat) => {
                    const isSelected = selectedFeedCategory === cat.id;
                    const count = categoryCounts[cat.id] ?? 0;
                    const label = currentLang === 'om' ? cat.labelOm : currentLang === 'am' ? cat.labelAm : cat.labelEn;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{cat.icon}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                            isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {count}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium mt-1 truncate block">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Speed & Velocity Controls Section */}
              <div className="space-y-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentLang === 'om' ? 'Saffisa Naanna\'aa Ticker' : currentLang === 'am' ? 'የዜና መዘዋወሪያ ፍጥነት' : 'Ticker Velocity & Speed'}</span>
                  </div>
                  <span className="text-amber-400 font-bold font-mono text-[11px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                    {getSpeedLabel(isTickerPaused ? 0 : tickerSpeed)}
                  </span>
                </div>

                {/* Dropdown Control */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                    {currentLang === 'om' ? 'Filannoo Saffisaa (Speed Preset)' : currentLang === 'am' ? 'የፍጥነት አማራጭ' : 'Speed Preset (Dropdown)'}
                  </label>
                  <select
                    value={isTickerPaused ? 0 : tickerSpeed}
                    onChange={(e) => handleSpeedChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value={0}>⏸️ {currentLang === 'om' ? 'Dhaabi (Paused - 0x)' : currentLang === 'am' ? 'አቁም (Paused - 0x)' : 'Paused (0x)'}</option>
                    <option value={1}>🐢 {currentLang === 'om' ? 'Suuta (Slow - 0.5x)' : currentLang === 'am' ? 'ዝግታ (Slow - 0.5x)' : 'Slow (0.5x)'}</option>
                    <option value={2}>⚖️ {currentLang === 'om' ? 'Giddu-galeessa (Normal - 1.0x)' : currentLang === 'am' ? 'መደበኛ (Normal - 1.0x)' : 'Normal (1.0x)'}</option>
                    <option value={3}>⚡ {currentLang === 'om' ? 'Saffisaa (Fast - 1.5x)' : currentLang === 'am' ? 'ፈጣን (Fast - 1.5x)' : 'Fast (1.5x)'}</option>
                    <option value={4}>🚀 {currentLang === 'om' ? 'Baay\'ee Saffisaa (Very Fast - 2.0x)' : currentLang === 'am' ? 'በጣም ፈጣን (Very Fast - 2.0x)' : 'Very Fast (2.0x)'}</option>
                  </select>
                </div>

                {/* Slider Control */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
                    <span>{currentLang === 'om' ? 'Islaayidara Saffisaa' : currentLang === 'am' ? 'ተንሸራታች' : 'Speed Slider'}</span>
                    <span className="text-slate-300">{tickerDuration}s loop</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={isTickerPaused ? 0 : tickerSpeed}
                    onChange={(e) => handleSpeedChange(Number(e.target.value))}
                    className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                    title="Adjust ticker scroll speed"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5 pt-0.5">
                    <span>⏸️ 0x</span>
                    <span>🐢 0.5x</span>
                    <span className="text-amber-400 font-bold">⚖️ 1x</span>
                    <span>⚡ 1.5x</span>
                    <span>🚀 2x</span>
                  </div>
                </div>

                {/* Pause on Hover Toggle */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pauseOnHover}
                      onChange={togglePauseOnHover}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-[11px]">
                      {currentLang === 'om' 
                        ? 'Yeroo irra qubatan dhaabi (Pause on hover)' 
                        : currentLang === 'am' 
                          ? 'ሲያነቡ በጊዜያዊነት አቁም (Pause on hover)' 
                          : 'Pause on hover'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={toggleTickerPause}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-amber-300 cursor-pointer flex items-center gap-1"
                  >
                    {isTickerPaused || tickerSpeed === 0 ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{isTickerPaused || tickerSpeed === 0 ? 'Resume' : 'Pause'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tool Tabs - Judicial & Document Verification Tools */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {[
          { id: 'court_fees_calculator', label: 'Shallaggii Kaffaltii (Fees)', icon: <Coins className="w-4 h-4 text-amber-400" /> },
          { id: 'document_hash_verifier', label: 'Document Verification (Mirkaneessa)', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
          { id: 'issue_framing', label: 'Qabxii Falmii (Issues)', icon: '🎯' },
          { id: 'limitation_checker', label: 'Darbiinsa Yeroo (Limitation)', icon: '⏳' },
          { id: 'evidence_evaluator', label: 'Madaallii Ragaa (Evidence)', icon: '🛡️' },
          { id: 'summons_generator', label: 'Waamicha/Ajaja (Summons)', icon: '✉️' },
          { id: 'judgment_redraft', label: 'Murtii (Judgment)', icon: '⚖️' },
          { id: 'court_audio_recorder', label: 'Audio Recording (Sagalee)', icon: <Mic className="w-4 h-4 text-rose-400" /> },
        ].map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              setActiveTool(tool.id as ExpertTool);
              setResult(null);
            }}
            className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col sm:flex-row items-center gap-2.5 cursor-pointer ${
              activeTool === tool.id
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="text-xl">{tool.icon}</div>
            <span className="text-[11px] font-bold tracking-tight">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Tool Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {activeTool === 'court_audio_recorder' ? (
          <div className="lg:col-span-12 animate-in fade-in zoom-in duration-500">
            <CourtroomAudioRecorder currentLang={currentLang} className="min-h-[700px]" />
          </div>
        ) : (
          <>
            {/* Left Input Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
                    <span>📝</span>
                    <span>{activeTool.replace(/_/g, ' ')} Inputs</span>
                  </h3>
                  {activeTool === 'court_fees_calculator' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                      Dambii Lakk. 08/2016
                    </span>
                  )}
                </div>

                {/* COURT FEES CALCULATOR TOOL INPUTS */}
                {activeTool === 'court_fees_calculator' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Mana Murtii (Court)</label>
                        <input
                          type="text"
                          value={feeCourtName}
                          onChange={(e) => setFeeCourtName(e.target.value)}
                          placeholder="fkn: Mana Murtii Aanaa Adaamaa"
                          className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Lakk. Galmee (Case No.)</label>
                        <input
                          type="text"
                          value={feeCaseNumber}
                          onChange={(e) => setFeeCaseNumber(e.target.value)}
                          placeholder="fkn: 31405/2016"
                          className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Himataa (Plaintiff/Appellant)</label>
                        <input
                          type="text"
                          value={feePlaintiff}
                          onChange={(e) => setFeePlaintiff(e.target.value)}
                          placeholder="Maqaa Himataa"
                          className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Himatamaa (Defendant/Respondent)</label>
                        <input
                          type="text"
                          value={feeDefendant}
                          onChange={(e) => setFeeDefendant(e.target.value)}
                          placeholder="Maqaa Himatamaa"
                          className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Gosa Himannaa (Claim Type / Nature)</label>
                      <select
                        value={feeCategory}
                        onChange={(e) => setFeeCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="pecuniary">Falmii Qabeenyaa / Qarshii (Pecuniary / Monetary Valuation)</option>
                        <option value="non_pecuniary">Falmii Qabeenya Hin Taane / Gatiin Hin Murtoofne (Inestimable Value)</option>
                        <option value="family_divorce">Dhimma Maatii & Gaa'ela Diiguu (Family / Divorce Suit - 75 ETB)</option>
                        <option value="success_heirship">Waraqaa Dhaaltummaa Mirkaneeffachuu (Succession / Heirship - 100 ETB)</option>
                        <option value="declaration">Mirga Mirkaneeffachuu / Beekkamtii (Declaratory Judgment - 100 ETB)</option>
                        <option value="injunction">Ajaja Dhorkaa Yeroo (Preliminary Injunction - 60 ETB)</option>
                        <option value="rural_land">Falmii Qabiyyee Lafa Baadiyyaa (Rural Land Dispute - 80 ETB)</option>
                        <option value="appeal_filing">Iyyata Ol-Iyyannoo (Appellate Memorandum - 150 ETB)</option>
                        <option value="cassation_filing">Iyyata Dhaddacha Ijibbaataa (Cassation Application - 250 ETB)</option>
                        <option value="execution_decree">Iyyata Raawwii Murtii (Execution of Judgment Decree)</option>
                      </select>
                    </div>

                    {(feeCategory === 'pecuniary' || feeCategory === 'execution_decree') && (
                      <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-amber-400 uppercase">
                            Hanga Falmii / Qarshii (Claim Amount in ETB)
                          </label>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {feeClaimAmount.toLocaleString()} ETB
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={feeClaimAmount}
                          onChange={(e) => setFeeClaimAmount(Number(e.target.value) || 0)}
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500 font-bold"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[10000, 50000, 150000, 500000, 1000000, 3000000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setFeeClaimAmount(preset)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                                feeClaimAmount === preset
                                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`} ETB
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Sadarkaa Mana Murtii</label>
                        <select
                          value={feeCourtLevel}
                          onChange={(e) => setFeeCourtLevel(e.target.value as any)}
                          className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="first_instance">Sadarkaa Jalqabaa (Aanaa)</option>
                          <option value="high_court">Mana Murtii Ol'aanaa</option>
                          <option value="supreme_cassation">Dhaddacha Ijibbaataa</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Himatamtoota (Summons)</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={feeDefendantsCount}
                          onChange={(e) => setFeeDefendantsCount(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Fuula Sanadaa (Pages)</label>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={feePagesCount}
                          onChange={(e) => setFeePagesCount(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={feeHasAdvocatePower}
                          onChange={(e) => setFeeHasAdvocatePower(e.target.checked)}
                          className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span>Waraqaa Bakkummaa Abukaattoo (Power of Attorney Stamp +25 ETB)</span>
                      </label>
                      <label className="flex items-center gap-2.5 text-xs text-emerald-400 cursor-pointer font-bold">
                        <input
                          type="checkbox"
                          checked={feeIsPauper}
                          onChange={(e) => setFeeIsPauper(e.target.checked)}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span>Iyyata Deegaa (In Forma Pauperis / Fee Waiver - SDFHH Kwt 467)</span>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Yaada / Falmii Kaffaltii (Valuation Dispute)</label>
                      <textarea
                        value={feeNotes}
                        onChange={(e) => setFeeNotes(e.target.value)}
                        placeholder="Himatamaan mormii tilmaama kaffaltii hin guunne kaasee yoo jiraate..."
                        rows={2}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* DOCUMENT HASH VERIFIER TOOL INPUTS */}
                {activeTool === 'document_hash_verifier' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed space-y-1.5">
                      <div className="font-bold flex items-center gap-2 text-emerald-400">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span>Mirkaneessa Hafuura Sanadaa (Cryptographic SHA-256)</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Sanada kooppiin dhiyaate galmee eegaa (official archive) waliin tokko ta'uu isaa checksum SHA-256 tiin mirkaneessi (Labsii Summa Eelektrooniiksii Lakk. 1072/2018).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">
                        1. Sanada Galmee Eegaa Filadhu (Official Registry Document)
                      </label>
                      <select
                        value={hashDocId}
                        onChange={(e) => setHashDocId(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="saiethio_master_archive">Galmee Seeraa Oromiyaa & Ijibbaataa Master Archive (#125+)</option>
                        <option value="employment_contract">Standard Employment Contract (Labsii Hojjetaa 1156/2011)</option>
                        <option value="lease_contract">Urban Land & Building Lease Contract (Labsii 721/2004)</option>
                        <option value="real_estate_sale">Real Estate Title Transfer Agreement</option>
                        <option value="defective_court_pleading">Non-Compliant Civil Pleading Audit Sample</option>
                        <option value="debt_claim_missing_accrual">Debt Recovery Pleading Audit Sample</option>
                        <option value="custom">-- Custom Direct Hash or External File Copy --</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">
                        2. Qabiyyee Sanadaa (Pasted Document Content / Text Copy)
                      </label>
                      <textarea
                        value={hashFileContent}
                        onChange={(e) => setHashFileContent(e.target.value)}
                        placeholder="Barreeffama galmee kooppii keessanii asitti galchaa..."
                        rows={5}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">
                        3. Hash Koodii Kooppii (Optional Client SHA-256 Hash Override)
                      </label>
                      <input
                        type="text"
                        value={hashClientHash}
                        onChange={(e) => setHashClientHash(e.target.value)}
                        placeholder="fkn: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284ddd200126d9069e"
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyDocumentHash}
                      disabled={isVerifyingHash}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4.5 h-4.5 text-emerald-200" />
                      <span>{isVerifyingHash ? '🔍 Mirkaneessaa Jira...' : '🔍 Mirkaneessi (Verify Hash against Official Registry)'}</span>
                    </button>
                    {hashError && <p className="text-xs text-rose-400 font-bold text-center">⚠️ {hashError}</p>}
                  </div>
                )}

                {/* ISSUE FRAMING INPUTS */}
                {activeTool === 'issue_framing' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase">1. Plaint (Iyyata Himataa)</label>
                        <div>
                          <input
                            type="file"
                            ref={plaintFileRef}
                            onChange={(e) => handleFileUpload(e, 'plaint')}
                            accept=".pdf,.doc,.docx,image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => plaintFileRef.current?.click()}
                            disabled={isUploadingPlaint}
                            className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>{isUploadingPlaint ? '⏳ Loading...' : '📎 PDF / Word / Suuraa Galchi'}</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={plaintText}
                        onChange={(e) => setPlaintText(e.target.value)}
                        placeholder="Barreeffama iyyata himataa asitti galchaa ykn galmee PDF/Word/Suuraa oli fe'aa..."
                        rows={6}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase">2. Defense (Deebii Himatamaa)</label>
                        <div>
                          <input
                            type="file"
                            ref={defenseFileRef}
                            onChange={(e) => handleFileUpload(e, 'defense')}
                            accept=".pdf,.doc,.docx,image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => defenseFileRef.current?.click()}
                            disabled={isUploadingDefense}
                            className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>{isUploadingDefense ? '⏳ Loading...' : '📎 PDF / Word / Suuraa Galchi'}</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={defenseText}
                        onChange={(e) => setDefenseText(e.target.value)}
                        placeholder="Barreeffama deebii himatamaa asitti galchaa ykn galmee PDF/Word/Suuraa oli fe'aa..."
                        rows={6}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* LIMITATION CHECKER INPUTS */}
                {activeTool === 'limitation_checker' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Gosa Himannaa (Claim Type)</label>
                      <select
                        value={claimType}
                        onChange={(e) => setClaimType(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="contract">Waliigaltee (Contract - 10 Years)</option>
                        <option value="tort">Badii Yakkaa Malee (Tort/Extra-Contractual - 2 Years)</option>
                        <option value="property">Qabeenya Dhaabbataa (Immovable Property)</option>
                        <option value="labor">Dhimma Hojjetaa (Labor - 6 Months/1 Year)</option>
                        <option value="succession">Dhaala (Succession)</option>
                        <option value="maintenance">Qallaba (Maintenance)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Guyyaa Sababni Himannaa dhalate (Cause of Action Date)</label>
                      <input
                        type="date"
                        value={causeOfActionDate}
                        onChange={(e) => setCauseOfActionDate(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* EVIDENCE EVALUATOR INPUTS */}
                {activeTool === 'evidence_evaluator' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Testimony or Documentary Evidence</label>
                      <div>
                        <input
                          type="file"
                          ref={evidenceFileRef}
                          onChange={(e) => handleFileUpload(e, 'evidence')}
                          accept=".pdf,.doc,.docx,image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => evidenceFileRef.current?.click()}
                          disabled={isUploadingEvidence}
                          className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>{isUploadingEvidence ? '⏳ Loading...' : '📎 PDF / Word / Suuraa Galchi'}</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={testimonyText}
                      onChange={(e) => setTestimonyText(e.target.value)}
                      placeholder="Ragaalee namaa ykn barreeffamaa wal-bira qabuu barbaaddan asitti galchaa ykn galmee oli fe'aa..."
                      rows={14}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* SUMMONS GENERATOR INPUTS */}
                {activeTool === 'summons_generator' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Gosa Unkaa (Order Type)</label>
                      <select
                        value={summonsData.orderType}
                        onChange={(e) => setSummonsData({ ...summonsData, orderType: e.target.value })}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="summons">Waamicha (Summons)</option>
                        <option value="injunction">Ajaja Dhorkaa (Temporary Injunction)</option>
                        <option value="attachment">Ajaja Qabsiisa Qabeenyaa (Attachment)</option>
                        <option value="warrant">Waraqaa Qabiinsaa (Warrant of Arrest)</option>
                        <option value="judgment_execution">Ajaja Raawwii Murtii (Execution Order)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Mana Murtii (Court Name)</label>
                      <input
                        type="text"
                        value={summonsData.courtName}
                        onChange={(e) => setSummonsData({ ...summonsData, courtName: e.target.value })}
                        placeholder="fkn: Mana Murtii Waliigalaa Oromiyaa"
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Lakk. Galmee (Case No.)</label>
                      <input
                        type="text"
                        value={summonsData.caseNumber}
                        onChange={(e) => setSummonsData({ ...summonsData, caseNumber: e.target.value })}
                        placeholder="fkn: 12345/2016"
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Qaamolee (Parties Involved)</label>
                      <textarea
                        value={summonsData.parties}
                        onChange={(e) => setSummonsData({ ...summonsData, parties: e.target.value })}
                        placeholder="fkn: Obbo Gamme Vs Obbo Tolasaa"
                        rows={3}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* JUDGMENT REDRAFT INPUTS */}
                {activeTool === 'judgment_redraft' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Gosa Dhimmaa (Case Category)</label>
                      <select
                        value={judgmentData.caseCategory}
                        onChange={(e) => setJudgmentData({ ...judgmentData, caseCategory: e.target.value })}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="civil">Dhimma Hariiroo Hawaasaa (Civil Case)</option>
                        <option value="criminal">Dhimma Yakkaa (Criminal Case)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Mana Murtii (Court Name)</label>
                      <input
                        type="text"
                        value={judgmentData.courtName}
                        onChange={(e) => setJudgmentData({ ...judgmentData, courtName: e.target.value })}
                        placeholder="fkn: Mana Murtii Waliigalaa Oromiyaa"
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase">Gabaasa Dhimmichaa & Ragaa (Case Details & Evidence)</label>
                        <div>
                          <input
                            type="file"
                            ref={judgmentFileRef}
                            onChange={(e) => handleFileUpload(e, 'judgment')}
                            accept=".pdf,.doc,.docx,image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => judgmentFileRef.current?.click()}
                            disabled={isUploadingJudgment}
                            className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>{isUploadingJudgment ? '⏳ Loading...' : '📎 PDF / Word / Suuraa Galchi'}</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={judgmentData.caseDetails}
                        onChange={(e) => setJudgmentData({ ...judgmentData, caseDetails: e.target.value })}
                        placeholder="Himannaa, deebii, falmii fi ragaalee dhiyaatan ibsaa ykn galmee oli fe'aa..."
                        rows={4}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Seera Dhimmichaa waliin Ragummaa Qabu (Legal Basis / Articles)</label>
                      <input
                        type="text"
                        value={judgmentData.legalBasis}
                        onChange={(e) => setJudgmentData({ ...judgmentData, legalBasis: e.target.value })}
                        placeholder="fkn: Labsii, Seera Farra Yakkaa, Seera Hariiroo Hawaasaa..."
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">Murtii Jalqabaa / Yaada Murtii (Original Notes / Verdict)</label>
                      <textarea
                        value={judgmentData.originalVerdict}
                        onChange={(e) => setJudgmentData({ ...judgmentData, originalVerdict: e.target.value })}
                        placeholder="Murtii abbaan seeraa kenne ykn yaada murtii kennamuuf karoorfame..."
                        rows={4}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* Run Button for General Tools */}
                {activeTool !== 'document_hash_verifier' && (
                  <div className="pt-4">
                    <button
                      onClick={handleRunTool}
                      disabled={isLoading}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Scale className="w-4 h-4" />
                      <span>
                        {isLoading 
                          ? '⏳ Xiinxalaa Jira...' 
                          : activeTool === 'court_fees_calculator'
                          ? '⚖️ Qorannoo Seeraa & AI Qorannoo Kaffaltii Baasi'
                          : `🔍 Run ${activeTool.replace(/_/g, ' ')} AI`}
                      </span>
                    </button>
                    {error && <p className="text-xs text-rose-400 text-center font-bold mt-2">⚠️ {error}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Result or Official Voucher */}
            <div className="lg:col-span-7 space-y-6">
              {activeTool === 'court_fees_calculator' && (
                /* Live Instant Calculation & Official Fee Voucher */
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
                  {/* Header and Quick Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-100 font-serif-legal">
                          Nagahee Qorannoo Kaffaltii Mana Murtii
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Tarifa Dambii Kaffaltii Tajaajila Manneen Murtii Oromiyaa
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyVoucherDetails}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                      >
                        {copiedVoucher ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedVoucher ? 'Koppii Ta\'eera!' : 'Koppii Godhi'}</span>
                      </button>
                      <button
                        onClick={printVoucher}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Maxxansi</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Net Total Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                        Waliigala Kaffaltii Qulqulluu (Net Filing Fee Payable)
                      </span>
                      <div className="text-3xl sm:text-4xl font-mono font-black text-white mt-1">
                        {feeCalculation.finalTotalPayable.toLocaleString()} <span className="text-lg font-normal text-amber-400">ETB</span>
                      </div>
                      {feeIsPauper ? (
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                          ✓ Bilisummaa Kaffaltii Deegaa (In Forma Pauperis - SDFHH Kwt 467)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 block mt-1">
                          Kaffaltii dursaa dhimma dhiyaateef seeraan murtaa'e
                        </span>
                      )}
                    </div>

                    <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 block">Koodii Kaffaltii / Ref Code:</span>
                      <span className="text-sm font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 block">
                        OEB-FEE-2026-{Math.abs(feeCourtName.length * 107 + (feeClaimAmount % 9999))}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Guyyaa: {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Jurisdiction Advisory Card */}
                  <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                    feeCalculation.pecuniaryJurisdiction === 'high_court'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                  }`}>
                    <Landmark className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
                    <div className="space-y-1">
                      <span className="font-bold uppercase tracking-wider block">
                        {feeCalculation.pecuniaryJurisdiction === 'high_court' 
                          ? '⚠️ Hubachiisa Aangoo Dhaddachaa (High Court Jurisdiction)' 
                          : '✓ Aangoo Dhaddacha Sadarkaa Jalqabaa (Woreda Jurisdiction)'}
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        {feeCalculation.jurisdictionNote}
                      </p>
                    </div>
                  </div>

                  {/* Itemized Tariffs Breakdown Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tarreeffama Kaffaltii Seeraa (Itemized Statutory Tariffs)</span>
                    </h4>
                    <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-3">Gosa Baasii / Kutaa Tarifa</th>
                            <th className="p-3">Bu'uura Shallaggii</th>
                            <th className="p-3 text-right">Gatii (ETB)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono text-[11px]">
                          {feeCalculation.bracketBreakdown.map((b, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="p-3 font-sans text-slate-300">
                                {idx === 0 ? 'Kaffaltii Himannaa (Filing Fee)' : `↳ Dabalata: ${b.range}`}
                              </td>
                              <td className="p-3 text-slate-400">{b.rate}</td>
                              <td className="p-3 text-right text-amber-300 font-bold">{b.amount.toLocaleString()} ETB</td>
                            </tr>
                          ))}
                          <tr className="hover:bg-slate-900/50">
                            <td className="p-3 font-sans text-slate-300">Kaffaltii Waamichaa (Summons Fee)</td>
                            <td className="p-3 text-slate-400">{feeDefendantsCount} Paartilee × 20 ETB</td>
                            <td className="p-3 text-right text-amber-300 font-bold">{feeCalculation.summonsFee.toLocaleString()} ETB</td>
                          </tr>
                          <tr className="hover:bg-slate-900/50">
                            <td className="p-3 font-sans text-slate-300">Galmee fi Chaappaa (Registry & Stamp Duty)</td>
                            <td className="p-3 text-slate-400">Tarifa Dhaabbataa</td>
                            <td className="p-3 text-right text-amber-300 font-bold">{feeCalculation.registryStampFee.toLocaleString()} ETB</td>
                          </tr>
                          <tr className="hover:bg-slate-900/50">
                            <td className="p-3 font-sans text-slate-300">Waraabbii Sanadaa (File Archive Copy)</td>
                            <td className="p-3 text-slate-400">{feePagesCount} Fuula × 2 ETB</td>
                            <td className="p-3 text-right text-amber-300 font-bold">{feeCalculation.copyingFee.toLocaleString()} ETB</td>
                          </tr>
                          {feeHasAdvocatePower && (
                            <tr className="hover:bg-slate-900/50">
                              <td className="p-3 font-sans text-slate-300">Chaappaa Waraqaa Bakkummaa (Power of Attorney)</td>
                              <td className="p-3 text-slate-400">Mirkaneessa Sanadaa</td>
                              <td className="p-3 text-right text-amber-300 font-bold">{feeCalculation.powerOfAttorneyFee.toLocaleString()} ETB</td>
                            </tr>
                          )}
                          <tr className="bg-slate-900 font-bold font-sans">
                            <td className="p-3 text-slate-100" colSpan={2}>Waliigala Kaffaltii (Gross Total)</td>
                            <td className="p-3 text-right text-white font-mono text-xs">{feeCalculation.totalBeforeWaiver.toLocaleString()} ETB</td>
                          </tr>
                          {feeIsPauper && (
                            <tr className="bg-emerald-950/30 text-emerald-400 font-bold">
                              <td className="p-3" colSpan={2}>Bilisummaa Kaffaltii Deegaa (Pauper Exemption - SDFHH Kwt 467)</td>
                              <td className="p-3 text-right font-mono text-xs">-{feeCalculation.totalBeforeWaiver.toLocaleString()} ETB</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment Details & Bank Accounts */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Herreega Baankii Kaffaltiin Ittiin Raawwatamu (Court Revenue Deposit Accounts):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-bold">Baankii Daldala Itoophiyaa (CBE)</span>
                        <span className="font-mono text-amber-300 font-bold text-xs mt-0.5 block">1000023489102</span>
                        <span className="text-[9px] text-slate-500">Mootummaa Naannoo Oromiyaa</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-bold">Baankii Oromiyaa (OB)</span>
                        <span className="font-mono text-amber-300 font-bold text-xs mt-0.5 block">13498271001</span>
                        <span className="text-[9px] text-slate-500">Kaffaltii Tajaajila Mana Murtii</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-bold">Telebirr Merchant / Short Code</span>
                        <span className="font-mono text-emerald-400 font-bold text-xs mt-0.5 block">882910</span>
                        <span className="text-[9px] text-slate-500">Oromia Court E-Payment</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Result Report (Shown when Run AI is triggered) */}
              {result && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">📋</span>
                      <div>
                        <h3 className="text-lg font-bold text-slate-100 font-serif-legal">
                          Gabaasa Qorannoo Seeraa (Judicial Legal Audit)
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Xiinxala Labsii fi SDFHH: {activeTool.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(result || '');
                          alert(currentLang === 'om' ? 'Barreeffamni qabameera!' : 'Text copied!');
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </button>
                      <button
                        onClick={() => setShowPdfModal(true)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF Export</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans legal-content-body">
                    <LegalCitationHighlighter text={result} currentLang={currentLang} />
                  </div>
                </div>
              )}

              {/* DOCUMENT HASH VERIFICATION CERTIFICATE DISPLAY */}
              {activeTool === 'document_hash_verifier' && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
                  {hashVerificationResult ? (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      {/* Status Header Badge */}
                      <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        hashVerificationResult.match
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                      }`}>
                        <div className="flex items-center gap-3.5">
                          <div className={`p-3 rounded-2xl ${hashVerificationResult.match ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {hashVerificationResult.match ? <ShieldCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                          </div>
                          <div>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase ${
                              hashVerificationResult.match ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              {hashVerificationResult.status}
                            </span>
                            <h3 className="text-lg font-bold font-serif-legal text-white mt-1">
                              {hashVerificationResult.match 
                                ? 'SANADICHA SIRRII FI HAQAAMTI GUUTUU'
                                : 'SANADICHA JIJJIIRRAMEERA / MISMATCH'}
                            </h3>
                            <p className="text-xs text-slate-300">
                              {hashVerificationResult.match 
                                ? 'Sanadni kun galmee eegaa official archive ragaa amanamummaa qabu waliin 100% tokko ta\'uun mirkanaa\'eera.'
                                : 'Hafuura Sanadaa (SHA-256 Hash) galmee eegaa official archive waliin wal-hin-gitu. Sanadni kun jijjiirrama qabaachuu danda\'a.'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const certText = `
Waraqaa Mirkaneessa Hafuura Sanadaa (Cryptographic Hash Certificate)
Document: ${hashVerificationResult.name} (ID: ${hashVerificationResult.documentId})
Status: ${hashVerificationResult.status}
Verified At: ${hashVerificationResult.verifiedAt}
Signer: ${hashVerificationResult.signer}
Expected Hash: ${hashVerificationResult.expectedHash}
Calculated Hash: ${hashVerificationResult.calculatedHash}
`;
                            navigator.clipboard.writeText(certText);
                            setCopiedHashCert(true);
                            setTimeout(() => setCopiedHashCert(false), 2000);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer whitespace-nowrap"
                        >
                          {copiedHashCert ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedHashCert ? 'Koppii Ta\'eera!' : 'Waraqaa Koppii Godhi'}</span>
                        </button>
                      </div>

                      {/* Verification Audit Details Grid */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Odeeffannoo Mirkaneessa Cryptographic (Audit Metadata)</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Maqaa Sanadaa</span>
                            <span className="font-bold text-slate-200">{hashVerificationResult.name}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Document ID</span>
                            <span className="font-mono text-amber-300 font-bold">{hashVerificationResult.documentId}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Algorithm Hash</span>
                            <span className="font-mono text-emerald-400 font-bold">{hashVerificationResult.algorithm || 'SHA-256'}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Guyyaa Mirkaneessaa</span>
                            <span className="font-mono text-slate-300">{new Date(hashVerificationResult.verifiedAt).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Hash Comparison Box */}
                        <div className="space-y-3 pt-2 border-t border-slate-800">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              1. Official Registry Expected SHA-256 Hash:
                            </span>
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300 font-bold break-all select-all">
                              {hashVerificationResult.expectedHash}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              2. Calculated Document Copy SHA-256 Hash:
                            </span>
                            <div className={`p-2.5 rounded-xl border text-xs font-mono font-bold break-all select-all ${
                              hashVerificationResult.match
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                            }`}>
                              {hashVerificationResult.calculatedHash}
                            </div>
                          </div>
                        </div>

                        {/* Legal Note */}
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
                          <span className="font-bold text-slate-300 block">Bu'uura Seeraa:</span>
                          <p>
                            Bu'uura Labsii Summa Eelektrooniiksii fi Ragaa Elektrooniiksii Lakk. 1072/2018 Kwt 6 & 14 n, galmeen hafuura cryptographic hash SHA-256 mirkanaa'e ragaa guutuu abbaa seeraaf ta'ee tajaajila.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[380px] flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h3 className="text-base font-bold text-slate-200 font-serif-legal">
                          Mirkaneessa Sanadaa Cryptographic
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Bitaa irraa sanada galmee eegaa filadhu ykn barreeffama galmee kooppii keessanii galchuun button 'Mirkaneessi' cuqaasi.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback empty view when activeTool is NOT court fees calculator / hash verifier and NO result */}
              {activeTool !== 'court_fees_calculator' && activeTool !== 'document_hash_verifier' && !result && (
                <div className="h-full min-h-[400px] rounded-3xl border-2 border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center justify-center text-center p-10">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-400">Result Awaits Data</h3>
                  <p className="mt-2 text-xs text-slate-600 max-w-xs">
                    Enter the case details on the left and run the AI analyzer to generate judicial insights.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected Feed Item Details Modal */}
      {selectedFeedItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {(() => {
                  const b = getCategoryBadge(selectedFeedItem.category);
                  return (
                    <span className={`px-2 py-0.5 rounded-md border font-bold font-mono text-xs ${b.color}`}>
                      {b.label}
                    </span>
                  );
                })()}
                <span className="text-xs text-slate-400 font-mono">@seeraai_ethio</span>
              </div>
              <button
                onClick={() => setSelectedFeedItem(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100 font-serif-legal">
                {typeof selectedFeedItem.title === 'object' && selectedFeedItem.title !== null
                  ? ((selectedFeedItem.title as any)[currentLang] || (selectedFeedItem.title as any).om || (selectedFeedItem.title as any).en || '')
                  : (selectedFeedItem.title || 'Murtii Seeraa')}
              </h3>
              {selectedFeedItem.fileNumber && (
                <div className="text-xs font-mono text-amber-300 font-bold">
                  Galmee Lakk. #{selectedFeedItem.fileNumber}
                </div>
              )}
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap pt-2">
                {typeof selectedFeedItem.summary === 'object' && selectedFeedItem.summary !== null
                  ? ((selectedFeedItem.summary as any)[currentLang] || (selectedFeedItem.summary as any).om || (selectedFeedItem.summary as any).en || '')
                  : (selectedFeedItem.summary || selectedFeedItem.rawText || '')}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <a
                href={selectedFeedItem.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
              >
                <span>Telegram Post Banadhu</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setSelectedFeedItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cufi
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfModal && result && (
        <PdfExportModal
          isOpen={showPdfModal}
          currentLang={currentLang}
          title={`Judicial Report: ${activeTool}`}
          content={result}
          taskType="explain_law"
          outputLanguages={[currentLang]}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
};
