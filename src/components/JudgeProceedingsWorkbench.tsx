import React, { useState, useRef, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { 
  Scale, 
  Gavel, 
  FileText, 
  Mic, 
  MicOff, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Building, 
  Landmark, 
  Users, 
  Send, 
  FileCheck, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Clock,
  Search,
  RotateCcw,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Mail,
  HelpCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import { CitationEnabledEditor } from './CitationEnabledEditor';
import { VoiceDictation, SUPPORTED_SPEECH_DIALECTS, SUPPORTED_SPEECH_DIALECTS_STRINGS } from './VoiceDictation';
import { CourtFeeCalculator } from './CourtFeeCalculator';
import { calculateOromiaCourtFee, CourtFeeCalculationResult } from '../services/courtFeeCalculatorService';
import { useAuth } from '../context/AuthContext';

export type CourtLevelMode = 'firstInstance' | 'highCourt' | 'cassation';

interface JudgeProceedingsWorkbenchProps {
  currentLang: Language;
  courtLevel?: CourtLevelMode;
  activeCaseNumber?: string;
  onSaveToCaseFile?: (record: any) => void;
}

export interface FramedIssue {
  id: string;
  type: 'fact' | 'law';
  issueText: string;
  evidenceRequired: string;
  burdenOfProof: 'himataa' | 'himatamaa' | 'garee_lamaan';
  status: 'pending' | 'clarified';
  needsThirdPartyClarification?: boolean;
}

export interface ThirdPartySummonsOrder {
  id: string;
  targetType: 'government_office' | 'witness' | 'expert' | 'lower_court';
  recipientName: string;
  departmentOrOffice: string;
  woredaOrZone: string;
  dispatchRefNo: string;
  deadlineDate: string;
  issueToClarify: string;
  documentsDemanded: string;
  status: 'drafted' | 'dispatched' | 'response_received';
  stampIncluded: boolean;
  notes?: string;
  receivedReportSummary?: string;
}

export interface OralHearingStatement {
  id: string;
  speakerRole: 'Himataa' | 'Himatamaa' | 'Abukaattoo Himataa' | 'Abukaattoo Himatamaa' | 'Ragaa' | 'Abbaa Seeraa' | 'Ol-Iyyataa' | 'Deebii-Kennaa' | 'Iyyataa Ijibbaataa';
  speakerName: string;
  statement: string;
  timestamp: string;
  isAudioTranscribed?: boolean;
}

export const JudgeProceedingsWorkbench: React.FC<JudgeProceedingsWorkbenchProps> = ({
  currentLang,
  courtLevel = 'firstInstance',
  activeCaseNumber,
  onSaveToCaseFile
}) => {
  const t = translations[currentLang];

  // Active Court Level: 'firstInstance' | 'highCourt' | 'cassation'
  const [activeCourtLevel, setActiveCourtLevel] = useState<CourtLevelMode>(courtLevel);

  // Active procedural step:
  // 1. pleadings / appeal_memo
  // 2. preliminary_objection / summons_respondent
  // 3. oral_hearing
  // 4. issues
  // 5. summons_orders
  // 6. final_judgment
  const [activeStep, setActiveStep] = useState<
    'pleadings' | 'preliminary_objection' | 'oral_hearing' | 'issues' | 'summons_orders' | 'final_judgment'
  >('pleadings');

  // Case Metadata
  const [courtName, setCourtName] = useState('Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa');
  const [benchName, setBenchName] = useState('Dhaddacha Dhimmoota Hariiroo Hawaasaa fi Lafa');
  const [caseNo, setCaseNo] = useState(activeCaseNumber || 'Lakk. 24891/2016');
  const [judgeName, setJudgeName] = useState('Abbaa Seeraa Geetaachoo Toleeraa');
  const [hearingDate, setHearingDate] = useState('2026-10-14');

  // Parties
  const [plaintiffName, setPlaintiffName] = useState('Obbo Baqqalaa Gammachuu');
  const [plaintiffAdvocate, setPlaintiffAdvocate] = useState('Abukaattoo Tashoomaa Nagaash');
  const [defendantName, setDefendantName] = useState('Obbo Alamuu Dheeressaa');
  const [defendantAdvocate, setDefendantAdvocate] = useState('Abukaattoo Caalaa Fayyisaa');

  // STEP 1: Pleadings
  const [claimText, setClaimText] = useState('');
  const [claimEvidenceList, setClaimEvidenceList] = useState('');
  const [defenseText, setDefenseText] = useState('');
  const [defenseEvidenceList, setDefenseEvidenceList] = useState('');

  // Automated CourtFeeCalculator for Case Pleadings (Oromia 2015 Regulation)
  const { profile } = useAuth();
  const isPremiumUser = Boolean(profile?.subscriptionPlan === 'unlimited' || profile?.subscriptionPlan === 'pro' || profile?.isPremium === true);
  const [showPleadingFeeCalc, setShowPleadingFeeCalc] = useState(false);
  const [pleadingCourtFee, setPleadingCourtFee] = useState<CourtFeeCalculationResult | null>(() => {
    return calculateOromiaCourtFee({
      claimCategory: courtLevel === 'cassation' ? 'cassation' : courtLevel === 'highCourt' ? 'appeal' : 'monetary',
      courtLevel: courtLevel === 'cassation' ? 'cassation' : courtLevel === 'highCourt' ? 'high_court' : 'first_instance',
      claimAmountETB: 50000,
      isPremiumUser: Boolean(profile?.subscriptionPlan === 'unlimited' || profile?.subscriptionPlan === 'pro' || profile?.isPremium === true),
    });
  });

  // High Court Appellate Specific Workflow States (SDFHH Kwt 337 & 338)
  const [appellateAdmitDecision, setAppellateAdmitDecision] = useState<'admitted' | 'dismissed'>('admitted');
  const [appellateAdmitReason, setAppellateAdmitReason] = useState(
    'Ol-iyyataani murtii mana murtii jalaa irratti dogoggora madaallii ragaa teeknikaa fi bu\'uura seeraa Kwt 2091 agarsiisee waan jiruuf: Ijoon qabatee ni dhiheessisa jechuun deebii-kennaan akka dhiyaatu ajajameera.'
  );

  // High Court Summons to Respondent (Waamicha 1ffaa fi 2ffaa - SDFHH Kwt 338, 339, 105)
  const [firstSummonsDelivered, setFirstSummonsDelivered] = useState<boolean>(false);
  const [firstSummonsRefNo, setFirstSummonsRefNo] = useState('MMO/SHB/WAAM-01/16');
  const [firstSummonsDate, setFirstSummonsDate] = useState('2026-10-18');
  
  const [secondSummonsIssued, setSecondSummonsIssued] = useState<boolean>(true);
  const [secondSummonsDelivered, setSecondSummonsDelivered] = useState<boolean>(true);
  const [secondSummonsRefNo, setSecondSummonsRefNo] = useState('MMO/SHB/WAAM-02/16');
  const [secondSummonsDate, setSecondSummonsDate] = useState('2026-10-25');
  const [secondSummonsMethod, setSecondSummonsMethod] = useState<'maxxansaa' | 'gandaan' | 'gazexaadhaan'>('maxxansaa');

  // STEP 2: Preliminary Objections, Art. 245(1) & Interlocutory Ruling
  const [hasPreliminaryObjection, setHasPreliminaryObjection] = useState(true);
  const [objectionGrounds, setObjectionGrounds] = useState<string[]>([]);
  const [objectionDetail, setObjectionDetail] = useState('');
  const [plaintiffObjectionResponse, setPlaintiffObjectionResponse] = useState('');
  const [interlocutoryRulingType, setInterlocutoryRulingType] = useState<
    'overruled' | 'sustained_dismissed' | 'amendment_ordered' | 'transferred'
  >('overruled');
  const [interlocutoryRulingText, setInterlocutoryRulingText] = useState('');
  const [interlocutoryRulingDate, setInterlocutoryRulingDate] = useState('2026-10-14');

  // STEP 3: Oral Hearing & Voice-to-Text
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeakerRole, setVoiceSpeakerRole] = useState<any>('Himataa');
  const [voiceSpeakerName, setVoiceSpeakerName] = useState('');
  const [currentSpokenTranscript, setCurrentSpokenTranscript] = useState('');
  const [audioUploadStatus, setAudioUploadStatus] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [oralStatements, setOralStatements] = useState<OralHearingStatement[]>([]);

  // STEP 4: Framing of Issues
  const [framedIssues, setFramedIssues] = useState<FramedIssue[]>([]);
  const [newIssueText, setNewIssueText] = useState('');
  const [newIssueType, setNewIssueType] = useState<'fact' | 'law'>('fact');
  const [newIssueEvidence, setNewIssueEvidence] = useState('');
  const [newIssueBurden, setNewIssueBurden] = useState<'himataa' | 'himatamaa' | 'garee_lamaan'>('himataa');
  const [newIssueNeedsThirdParty, setNewIssueNeedsThirdParty] = useState<boolean>(true);

  // STEP 5: Third Party Summons & Court Inquiries (Lafa/Qonnaa)
  const [summonsList, setSummonsList] = useState<ThirdPartySummonsOrder[]>([]);
  const [summonsRecipient, setSummonsRecipient] = useState('');
  const [summonsDept, setSummonsDept] = useState('');
  const [summonsLocation, setSummonsLocation] = useState('');
  const [summonsRefNo, setSummonsRefNo] = useState('');
  const [summonsDeadline, setSummonsDeadline] = useState('2026-10-28');
  const [summonsIssueToClarify, setSummonsIssueToClarify] = useState('');
  const [summonsDocs, setSummonsDocs] = useState('');
  const [thirdPartyReportSummary, setThirdPartyReportSummary] = useState('');

  // STEP 6: Final Judgment & Decree
  const [judgmentCourtName, setJudgmentCourtName] = useState('');
  const [judgmentBench, setJudgmentBench] = useState('');
  const [judgmentSummaryOfFacts, setJudgmentSummaryOfFacts] = useState('');
  const [judgmentPreliminaryObjectionsSummary, setJudgmentPreliminaryObjectionsSummary] = useState('');
  const [judgmentAnalysisOfEvidence, setJudgmentAnalysisOfEvidence] = useState('');
  const [judgmentApplicableLaws, setJudgmentApplicableLaws] = useState('');
  const [judgmentOperativeOrder, setJudgmentOperativeOrder] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Hearing Summary Generator State
  const [showDraftSummaryModal, setShowDraftSummaryModal] = useState(false);
  const [draftSummaryText, setDraftSummaryText] = useState('');
  const [isGeneratingDraftSummary, setIsGeneratingDraftSummary] = useState(false);

  const handleDraftHearingSummary = () => {
    setIsGeneratingDraftSummary(true);
    setShowDraftSummaryModal(true);

    setTimeout(() => {
      const summary = `====================================================================
GUDUUNFAA QABXEE FALMII DHADDACHAA (PRELIMINARY SESSION HEARING SUMMARY)
====================================================================
Mana Murtii: ${courtName}
Dhaddacha: ${benchName}
Lakk. Galmee: ${caseNo}
Guyyaa Dhaddachaa: ${hearingDate || new Date().toISOString().slice(0, 10)}
Abbaa Seeraa: ${judgeName}

WAL FALMITOOTA (PARTIES TO THE CASE):
- ${plaintiffName} (${plaintiffAdvocate})
- ${defendantName} (${defendantAdvocate})

1. QABIYYEE FALMII DHIYAATE (Pleadings Summary):
- Himannaa/Iyyata: ${claimText.slice(0, 300) || 'Himannaa dhiyaate'}
- Deebii Himatamaa: ${defenseText.slice(0, 300) || 'Deebii dhiyaate'}

2. JECHA AFAANII DHADDACHA IRRATTI GALMEEFFAME (Oral Hearing Statements - ${oralStatements.length} Records):
${oralStatements.map((s, idx) => `   [${idx + 1}] ${s.speakerRole} (${s.speakerName}): ${s.statement}`).join('\n') || '   - Jechi afaanii galmeeffameera.'}

3. MORMII SADARKAA DURAA FI JAL-MURTII (Preliminary Objections):
- Mormon Dhiyaateeraa: ${hasPreliminaryObjection ? 'Eeyyee' : 'Lakkii'}
- Jal-Murtii Dhaddachaa: ${interlocutoryRulingText.slice(0, 200) || 'Mormiin kufaa ta\'ee hundee dhimmaatti darbameera.'}

4. IJOO DUBBII QABAME (Framed Issues - ${framedIssues.length} Issues):
${framedIssues.map((i, idx) => `   [${idx + 1}] (${i.type.toUpperCase()}) ${i.issueText} [Ba'aa Mirkaneessuu: ${i.burdenOfProof}]`).join('\n') || '   - Ijoon dubbii qabameera.'}

5. AJAJA DHADDACHAA FI TARKANFII BOODAA (Court Orders & Next Steps):
${summonsList.map((s, idx) => `   [${idx + 1}] ${s.recipientName}: ${s.issueToClarify}`).join('\n') || '   - Ajajni qaama 3ffaa ergameera.'}

XUMURA & TARKAANFII DHADDACHAA BOODAA:
Galmeen kun ragaalee dhiyaatan madaaluu fi gabaasa qaama 3ffaa eeguuf beellama dhufuuf qabameera.
====================================================================`;

      setDraftSummaryText(summary);
      setIsGeneratingDraftSummary(false);
    }, 800);
  };

  // Multilingual Speech-to-Text Dictation State
  const [selectedSpeechDialect, setSelectedSpeechDialect] = useState('om-ET');
  const [activeDictationTarget, setActiveDictationTarget] = useState<'claimText' | 'defenseText' | 'oralHearing' | 'judgmentOrder'>('claimText');

  // Apply court profile whenever court level changes
  const applyCourtProfile = (level: CourtLevelMode) => {
    setActiveCourtLevel(level);

    if (level === 'firstInstance') {
      // 1. First Instance Court Profile (Trial Jurisdiction)
      setCourtName('Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa');
      setBenchName('Dhaddacha Dhimma Lafaafi Hariiroo Hawaasaa');
      setCaseNo(activeCaseNumber || 'Lakk. Galmee 24891/2016');
      setJudgeName('Abbaa Seeraa Geetaachoo Toleeraa');
      setPlaintiffName('Obbo Baqqalaa Gammachuu (Himataa)');
      setPlaintiffAdvocate('Abukaattoo Tashoomaa Nagaash');
      setDefendantName('Obbo Alamuu Dheeressaa (Himatamaa)');
      setDefendantAdvocate('Abukaattoo Caalaa Fayyisaa');

      setClaimText(
        `1. Himataan lafa qonnaa hektaara 2.5 Aanaa Adaamaa Ganda Qarsaa keessatti argamu abbaa qabiyyummaa seera qabeessaan kan qabatan yoo ta'u, lakk. waraqaa qabiyyummaa 8492/2004 qabu.\n2. Himatamaan guyyaa 12/03/2015 irraa eegalee daangaa sarbee lafa hektaara 1.2 qabachuun himataan akka hin qonnee dhoorkeera.\n3. Kanaafuu, himatamaan lafa qabatee jiru gadhiisee akka gadi-lakkisu, manca'iinsa callaa bara darbee Birrii 120,000 fi baasii fi kasaaraa akka danda'u ajajni akka laatamu.`
      );
      setClaimEvidenceList(
        'Waraqaa Ragaa Abbaa Qabiyyummaa Lakk. 8492/2004, Ragaalee namaa sadii (Obbo Dajanee, Obbo Kabbadaa, Aadde Tolashii)'
      );
      setDefenseText(
        `1. Himatamaan lafa himataan ibse kan seeraan ala qabate hin qabu. Lafichi qabiyyee dhaalmaa abbaa isaanii irraa dhufe dha.\n2. Himataan waraqaa ragaa sobaa dhiheeffate malee daangaan lafa isaa kan himatamaa waliin wal hin qunnamu.\n3. Himatamaan falmii sadarkaa duraa qaba (Aangoo fi darbiinsa yeroo). Himannaan kufaa ta'ee baasiifi kasaaraan himataa irratti akka murtaa'u.`
      );
      setDefenseEvidenceList(
        'Waraqaa cancala ragaa lafaa bara 1991, Xalayaa maatii Obbo Dheeressaa, Ragaa namaa Obbo Mokonnon'
      );

      setHasPreliminaryObjection(true);
      setObjectionGrounds(['Aangoo Mana Murtii (Jurisdiction)', 'Darbiinsa Yeroo (Limitation / Kwt 244(1)(f))']);
      setObjectionDetail(
        `Himatamaan mormii sadarkaa duraa lama dhiheessa:\n1. Falmiin lafa qonnaa duraan koree dhimma lafaa gandaatti dhiyaatee hin murtoofne, kanaafuu manni murtichaa yeroodhaaf aangoo hin qabu.\n2. Himataan waggaa 10 oliif callisee turee kan himate waan ta'eef, akkaataa SDFHH Kwt 244(1)(f)tiin darbiinsa yeroon kan daangeffamee dha.`
      );
      setPlaintiffObjectionResponse(
        `Akkaataa SDFHH Keeyyata 245(1)tiin yaada himataan dhiheeffate:\n1. Aangoo ilaalchisee: Falmiin kun mirga qabiyyummaa fi sarbama qabiyyee waan ta'eef bu'uura Labsii Lakk. 248/2015 Kwt 38 fi SDFHH Kwt 15tiin aangoon kan Mana Murtii Aanaa Adaamaati.\n2. Darbiinsa yeroo ilaalchisee: Himatamaan dhiibbaa fi humnaan qabachuun isaa kan eegale bara 2015 waan ta'eef, darbiinsi yeroo waggaa 2 hin dabarre; qabiyyeen lafaa ammoo darbiinsa yeroon hin daangeffamu. Kanaafuu mormiin dhiyaate kufaa ta'ee falmiin hundee dhimmaatti akka darbu iyyanna.`
      );
      setInterlocutoryRulingType('overruled');
      setInterlocutoryRulingText(
        `JAL-MURTII DHADDACHAA (Mormii Sadarkaa Duraa Irratti):\n\nManni murtichaa mormii sadarkaa duraa himatamaa fi deebii himataan akkaataa SDFHH Kwt 245(1)tiin kenne qoratee jira.\n1. Aangoo ilaalchisee: Dhimmi dhiyaate falmii mirga abbaa qabiyyummaa lafaa ta'uun isaa mirkanaa'eera. Labsii Lakk. 248/2015 Kwt 38(1) jalatti manneen murtii idilee aangoo guutuu qabu. Mormiin kun kufaa ta'eera.\n2. Darbiinsa yeroo ilaalchisee: Mirgi abbaa qabiyyummaa fi dhiibbaan bara 2015 dhufe ragaadhaan qulqullaa'uu qaba malee sadarkaa kanatti himannaa hin kuffisu.\n\nAJAJNI LAATAME: Mormiiwwan sadarkaa duraa dhiyaatan kufaa ta'anii, gareewwan dhimma hundee irratti akka wal-falman fi ijoon dubbii akka qabamu ajajameera.`
      );

      setOralStatements([
        {
          id: 'oral_1',
          speakerRole: 'Himataa',
          speakerName: 'Obbo Baqqalaa Gammachuu',
          statement: 'Ani lafa kana bara 2004 irraa eegalee kaffaltii gibiraa kaffalaa itti fayyadamaa ture. Himatamaan bara darbe humnaan dhufee daangaa kootti dabalate.',
          timestamp: '09:42 AM',
          isAudioTranscribed: true
        },
        {
          id: 'oral_2',
          speakerRole: 'Himatamaa',
          speakerName: 'Obbo Alamuu Dheeressaa',
          statement: 'Lafichi kan abbaa kootiiti. Waraqaan ragaa inni dhiheesse daangaa qabiyyee kootii sarbee jiru malee ani lafa isaa hin tuqne.',
          timestamp: '09:50 AM',
          isAudioTranscribed: true
        },
        {
          id: 'oral_3',
          speakerRole: 'Abbaa Seeraa',
          speakerName: 'Abbaa Seeraa Geetaachoo Toleeraa',
          statement: 'Gareewwan lamaanuu ragaa Waajjira Lafaa fi Qonnaa Aanaa Adaamaa irraa kaartaa fi galmee qabiyyummaa akka dhiheessan ajajameera.',
          timestamp: '10:05 AM',
          isAudioTranscribed: false
        }
      ]);

      setFramedIssues([
        {
          id: 'issue_1',
          type: 'fact',
          issueText: 'Lafri hektaara 1.2 falmiirra jiru daangaa qabiyyee himataa moo kan himatamaa jalatti qulqullaa\'ee argama?',
          evidenceRequired: 'Xalayaa fi kaartaa teeknikaalaa Waajjira Lafaa fi Qonnaa Aanaa Adaamaa, Ragaalee namaa',
          burdenOfProof: 'himataa',
          status: 'pending',
          needsThirdPartyClarification: true
        },
        {
          id: 'issue_2',
          type: 'fact',
          issueText: 'Himatamaan daangaa sarbee qabiyyee himataa irratti midhaa callaa geessiseeraa? Hangamii?',
          evidenceRequired: 'Ragaalee namaa sadii fi gabaasa madaallii qonnaa',
          burdenOfProof: 'himataa',
          status: 'pending',
          needsThirdPartyClarification: true
        },
        {
          id: 'issue_3',
          type: 'law',
          issueText: 'Bu\'uura SDFHH Kwt 246 fi Labsii Lakk. 248/2015tiin himatamaan laficha gadi-lakkisee beenyaa kaffaluuf dirqama qabaa?',
          evidenceRequired: 'Bu\'uura seera hariiroo hawaasaa fi labsii lafa baadiyyaa',
          burdenOfProof: 'himataa',
          status: 'clarified',
          needsThirdPartyClarification: false
        }
      ]);

      setSummonsList([
        {
          id: 'summons_1',
          targetType: 'government_office',
          recipientName: 'Waajjira Bulchiinsa fi Itti Fayyadama Lafaa fi Qonnaa',
          departmentOrOffice: 'Kutaa Teeknikaa fi Qabiyyummaa Lafaa',
          woredaOrZone: 'Aanaa Adaamaa, Godina Shawaa Bahaa',
          dispatchRefNo: 'MM/AD/842/2016',
          deadlineDate: '2026-10-24',
          issueToClarify: 'Lafa Aanaa Adaamaa Ganda Qarsaa keessatti argamu ilaalchisee waraqaan qabiyyummaa lakk. 8492/2004 fi lakk. 1102/1991 eessaa akka qabame, kaartaa fi daangaan qabiyyee gareewwanii ogeessa teeknikaatiin lafarratti qulqullaa\'ee gabaasni akka dhiyaatu.',
          documentsDemanded: 'Koppii kaartaa kaadastiraa, sanada mirkanaa\'aa qabiyyee lafaa, fi gabaasa ogeessa qonnaa fi lafaa',
          status: 'dispatched',
          stampIncluded: true,
          notes: 'Xalayaan teessoo waajjirichaatiin ergamee beellamaaf eegamaa jira.',
          receivedReportSummary: 'Gabaasni ogeessa lafaa daangaan sarbamuu mirkaneessee jira.'
        }
      ]);
      setSummonsRecipient('Waajjira Bulchiinsa fi Itti Fayyadama Lafaa fi Qonnaa');
      setSummonsDept('Kutaa Qorannaa Lafaa fi Kaartaa');
      setSummonsLocation('Aanaa Adaamaa, Godina Shawaa Bahaa');
      setSummonsRefNo('MM/AD/845/2016');
      setSummonsIssueToClarify('Qabiyyee lafaa fi daangaa himatamaan qabatee jiru seera qabeessa ta\'uu fi dhiisuu isaa sanada galmee lafaa keessaa qulqulleessee akka ergu.');
      setSummonsDocs('Kaartaa lafaa, waraqaa ragaa abbaa qabiyyummaa, fi yaada ogeessaa');
      setThirdPartyReportSummary('Gabaasni Waajjira Lafaa fi Qonnaa Aanaa Adaamaa daangaan sarbamuu mirkaneessee jira.');

      setJudgmentCourtName('MANA MURTII SADARKAA JALQABAA AANAA ADAAMAA');
      setJudgmentBench('Dhaddacha Dhimma Lafaafi Hariiroo Hawaasaa');
      setJudgmentSummaryOfFacts(
        `Galmeen kun kan hundeeffame iyyata himataan Obbo Baqqalaa Gammachuu himatamaa Obbo Alamuu Dheeressaa irratti dhiheessan irratti hirkateeti. Himataan lafa qonnaa hektaara 2.5 Aanaa Adaamaa Ganda Qarsaa keessaa hektaara 1.2 himatamaan humnaan sarbee qabatee waan jiruuf akka gadi-lakkisu, callaa boqqoolloo manca'e Birrii 120,000 fi baasii kasaaraa akka danda'u gaafatan.`
      );
      setJudgmentPreliminaryObjectionsSummary(
        `Himatamaan mormii sadarkaa duraa aangoo fi darbiinsa yeroo dhiheesse ture; himataan akkaataa SDFHH Kwt 245(1)tiin deebii erga kennee booda manni murtichaa mormiiwwan kana kufaa gochuun hundee dhimmaatti darbee jira.`
      );
      setJudgmentAnalysisOfEvidence(
        `Manni murtichaa xalayaa fi gabaasa teeknikaalaa Waajjira Bulchiinsa fi Itti Fayyadama Lafaa fi Qonnaa Aanaa Adaamaa Lakk. WBLQ/142/16 ta'een dhiyaate, akkasumas jecha ragaalee namaa Obbo Dajanee fi Obbo Kabbadaa kakuudhaan mirkaneeffateera. Gabaasni Waajjira Lafaa fi Qonnaa akka ifa godhutti, lafti falmiirra jiru guutummaatti daangaa waraqaa ragaa lakk. 8492/2004 himataa keessatti kan qabame ta'uu fi himatamaan daangaa ce'uu isaa ogeessi mirkaneessee jira. Ragaan himatamaan dhiheesse gama biraatiin sarbama daangaa kana kan hin qulqulleessine dha.`
      );
      setJudgmentApplicableLaws(
        `Bu'uura Labsii Lakk. 248/2015 Kwt 38(1), Seera Hariiroo Hawaasaa Kwt 1149, 1206 fi Seera Deebii Falmii Hariiroo Hawaasaa Kwt 182, 246 fi 247.`
      );
      setJudgmentOperativeOrder(
        `MURTII FI AJAJA DHADDACHAA:
1. Himannaan himataa bu'uura seeraa fi ragaa qabaachuun isaa waan mirkanaa'eef guutummaatti fudhatameera.
2. Himatamaan Obbo Alamuu Dheeressaa lafa qonnaa hektaara 1.2 Aanaa Adaamaa Ganda Qarsaa keessatti sarbee qabatee jiru guyyoota 15 keessatti himataa Obbo Baqqalaa Gammachuuf qulqullinaan akka gadhiisu ajajameera.
3. Himatamaan manca'iinsa oomisha callaa waggaa darbeef tilmaama ogeessa qonnaatiin mirkanaa'e Birrii 95,000 (Kuma sagaaltamii shan) himataaf akka kaffalu murtaa'eera.
4. Himatamaan baasii fi kasaaraa falmii Birrii 5,000 himataaf akka deebisu murtaa'eera.
5. MIRGA OL-IYYANNOO: Gareen murtii kanaan hin quufne guyyaa murtichi dubbifamee asitti beellama guyyaa 30 keessatti Mana Murtii Ol'aanaa Godina Shawaa Bahaatti ol-iyyannoo dhiheeffachuuf mirga qabaachuun isaa ibsameera.
Galmeen cufamee gara mankuusaatti deebi'eera.`
      );

    } else if (level === 'highCourt') {
      // 2. High Court Profile (Appellate & High Trial Jurisdiction - Exactly Matching User's Procedural Flow)
      setCourtName('Mana Murtii Ol\'aanaa Godina Shawaa Bahaa');
      setBenchName('Dhaddacha Ol-Iyyannoo Dhimmoota Hariiroo Hawaasaa fi Lafa');
      setCaseNo(activeCaseNumber || 'Lakk. Galmee Ol-Iyyannoo 09842/2016 (Murtii Jalaa Lakk. 24891/2016)');
      setJudgeName('Abbaa Seeraa Dheeressaa Baay\'isaa');
      setPlaintiffName('Obbo Alamuu Dheeressaa (Ol-Iyyataa / Appellant)');
      setPlaintiffAdvocate('Abukaattoo Caalaa Fayyisaa');
      setDefendantName('Obbo Baqqalaa Gammachuu (Deebii-Kennaa / Respondent)');
      setDefendantAdvocate('Abukaattoo Tashoomaa Nagaash');

      // Step 1: Komii Ol-Iyyannoo (SDFHH Kwt 337)
      setClaimText(
        `KOMII OL-IYYANNOO (Memorandum of Appeal - SDFHH Kwt 327):\n1. Manni Murtii Sadarkaa Jalqabaa Aanaa Adaamaa galmee lakk. 24891/2016 irratti murtii kenneen dogoggora seeraa fi ragaa raawwateera.\n2. Ragaa barreeffamaa waraqaa cancala bara 1991 ol-iyyataa osoo hin madaalin dhiisee gabaasa ogeessa lafaa tokko qofa irratti hirkachuun laficha himataaf murteessuun seeraan ala.\n3. Beenyaan manca'iinsa callaa Birrii 95,000 murtaa'es oomisha hektaara 1.2 irratti gabaasa dhugaa hin qabne dha.\nKAA'UMSA: Murtiin mana murtii jalaa diigamee falmiin akka irra deebiin qulqullaa'u ykn himannaan deebii-kennaa kufaa akka ta'u iyyanna.`
      );
      setClaimEvidenceList(
        'Koppii Murtii Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa, Waraqaa cancala ragaa bara 1991, Kaffaltii qabsiisaa ol-iyyataa'
      );
      
      setAppellateAdmitDecision('admitted');
      setAppellateAdmitReason(
        'Manni murtichaa komii ol-iyyataa qoratee yaada ol-iyyataa erga caqasee booda: Madaallii ragaa teeknikaa fi bu\'uura seera hariiroo hawaasaa Kwt 2091 irratti qabxiin qorannoo barbaadu waan jiruuf: "IJOON QABATEE NI DHIHEESSISA" jechuun deebii-kennaan akka dhihaatuuf waamichi akka darbu ajajameera (SDFHH Kwt 338).'
      );

      // Step 2: Waamicha Deebii-Kennaa (1ffaa & 2ffaa)
      setFirstSummonsDelivered(false);
      setFirstSummonsRefNo('MMO/SHB/WAAM-01/16');
      setFirstSummonsDate('2026-10-18');

      setSecondSummonsIssued(true);
      setSecondSummonsDelivered(true);
      setSecondSummonsRefNo('MMO/SHB/WAAM-02/16');
      setSecondSummonsDate('2026-10-25');
      setSecondSummonsMethod('maxxansaa');

      setDefenseText(
        `DEEBII DEEBII-KENNAA OL-IYYANNOO (Respondent's Counter-Brief - SDFHH Kwt 335):\n1. Deebii-kennaan waamichi lammaffaa (2ffaa) maxxansaa mana jireenyaatiin erga dhaqqabee booda dhiyaateera.\n2. Murtiin mana murtii jalaa bu'uura ragaa teeknikaalaa ogeessa Waajjira Lafaa fi Qonnaa Aanaa Adaamaatiin mirkanaa'ee seeraan kan kenname dha.\n3. Ol-iyyataani daangaa sarbee qabachuun isaa ragaa barreeffamaa fi namaatiin ifatti mirkanaa'eera.\n4. Beenyaan murtaa'es gabaasa ogeessa qonnaa gatii gabaa naannootti qoratee dhiheesse bu'uureffateeti.\nKAA'UMSA: Murtiin mana murtii jalaa akkaataa SDFHH Kwt 341tiin mirkanaa'ee ol-iyyannoon kun kufaa akka ta'u.`
      );
      setDefenseEvidenceList(
        'Galmee mana murtii jalaa lakk. 24891/2016, Waraqaa abbaa qabiyyummaa lakk. 8492/2004'
      );

      // Step 3: Falmii Afaanii (SDFHH Kwt 340)
      setOralStatements([
        {
          id: 'oral_hc_1',
          speakerRole: 'Ol-Iyyataa',
          speakerName: 'Obbo Alamuu Dheeressaa',
          statement: 'Manni murtii jalaa qabiyyee abbaa koo dhaalmaan na gahe osoo hin tilmaamin ogeessa lafaa tokko qofa irratti hirkachuun na miidheera.',
          timestamp: '10:30 AM',
          isAudioTranscribed: true
        },
        {
          id: 'oral_hc_2',
          speakerRole: 'Deebii-Kennaa',
          speakerName: 'Obbo Baqqalaa Gammachuu',
          statement: 'Waajjirri Lafaa fi Qonnaa lafarratti kaartaa kaadastiraatiin safaree daangaan ol-iyyataa kan himataa keessa ce\'uu isaa mirkaneesseera.',
          timestamp: '10:45 AM',
          isAudioTranscribed: true
        },
        {
          id: 'oral_hc_3',
          speakerRole: 'Abbaa Seeraa',
          speakerName: 'Abbaa Seeraa Dheeressaa Baay\'isaa',
          statement: 'Ijoon daangaa fi beenyaa qaama sadaffaa (Waajjira Lafaa fi Qonnaa Godinaa) irraa qulqullaa\'uuf ajajni dhiyeessaa akka darbu murtaa\'eera.',
          timestamp: '11:00 AM',
          isAudioTranscribed: false
        }
      ]);

      // Step 4: Framing Issues (with 3rd Party Clarification needed)
      setFramedIssues([
        {
          id: 'issue_hc_1',
          type: 'fact',
          issueText: 'Manni Murtii Sadarkaa Jalqabaa Aanaa Adaamaa ragaa barreeffamaa fi gabaasa teeknikaalaa ogeessa lafaa madaaluu irratti dogoggora bu\'uuraa raawwateeraa?',
          evidenceRequired: 'Galmee mana murtii jalaa lakk. 24891/2016, Kaartaa teeknikaalaa Waajjira Lafaa Godinaa',
          burdenOfProof: 'himataa',
          status: 'clarified',
          needsThirdPartyClarification: true
        },
        {
          id: 'issue_hc_2',
          type: 'law',
          issueText: 'Manni murtii jalaa beenyaa callaa Birrii 95,000 murteesse bu\'uura seera hariiroo hawaasaa Kwt 2091 fi 2102 tiin madaallii qorannoo sirrii hordofeeraa?',
          evidenceRequired: 'Gabaasa gatii gabaa fi bu\'aa qulqullinaa Waajjira Qonnaa Godina Shawaa Bahaa',
          burdenOfProof: 'himataa',
          status: 'clarified',
          needsThirdPartyClarification: true
        }
      ]);

      // Step 5: Ajaja Qaama Sadaffaa & Bu'aa Ajajaa
      setSummonsList([
        {
          id: 'summons_hc_1',
          targetType: 'lower_court',
          recipientName: 'Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa',
          departmentOrOffice: 'Kutaa Dhaddacha Hariiroo Hawaasaa fi Mankuusa',
          woredaOrZone: 'Magaalaa Adaamaa',
          dispatchRefNo: 'MMO/SHB/1402/2016',
          deadlineDate: '2026-10-22',
          issueToClarify: 'Galmee falmii lakk. 24891/2016 guutummaatti qorannoo ol-iyyannoof dhaddacha Mana Murtii Ol\'aanaa Godina Shawaa Bahaatti akka dhiyaatu.',
          documentsDemanded: 'Galmee falmii duraanii ragaalee sanadootaa fi jecha ragaa qabate',
          status: 'response_received',
          stampIncluded: true,
          notes: 'Galmeen jalaa dhiyaatee qoratameera.',
          receivedReportSummary: 'Galmeen duraanii lakk. 24891/2016 guutummaan dhaddachatti dhiyaateera.'
        },
        {
          id: 'summons_hc_2',
          targetType: 'government_office',
          recipientName: 'Waajjira Bulchiinsa fi Itti Fayyadama Lafaa fi Qonnaa Godina Shawaa Bahaa',
          departmentOrOffice: 'Kutaa Ol-Iyyannoo fi Qulqullina Kaartaa',
          woredaOrZone: 'Magaalaa Adaamaa',
          dispatchRefNo: 'MMO/SHB/1403/2016',
          deadlineDate: '2026-10-25',
          issueToClarify: 'Kaartaa kaadastiraa Aanaa Adaamaa Ganda Qarsaa irratti wal-dhabdeen daangaa qabiyyummaa gidduu jiru sadarkaa godinatti qulqullaa\'ee akka gabaasamu.',
          documentsDemanded: 'Kaartaa master pilaanii fi gabaasa ogeessa godinichaa',
          status: 'response_received',
          stampIncluded: true,
          receivedReportSummary: 'Ogeessi teeknikaa godinichaa lafarratti argamuun kaartaa kaadastiraa mirkaneeffateera. Lafti hektaara 1.2 qabiyyee waraqaa lakk. 8492/2004 keessatti argamuun isaa mirkanaa\'eera.'
        }
      ]);
      setSummonsRecipient('Waajjira Bulchiinsa fi Itti Fayyadama Lafaa Godina Shawaa Bahaa');
      setSummonsDept('Kutaa Mankuusa Galmee');
      setSummonsLocation('Adaamaa');
      setSummonsRefNo('MMO/SHB/1404/2016');
      setSummonsIssueToClarify('Galmee duraanii fi qulqullina kaartaa dhiyeessuu.');
      setSummonsDocs('Galmee guutuu fi sanadoota ragaa');
      setThirdPartyReportSummary(
        `Gabaasa Bu'aa Qulqullinaa Waajjira Bulchiinsa fi Itti Fayyadama Lafaa fi Qonnaa Godina Shawaa Bahaa Lakk. WBLQ/GOD/490/16:\n1. Ogeessi teeknikaa godinichaa lafarratti argamuun kaartaa kaadastiraa mirkaneeffatee jira. Lafti hektaara 1.2 qabiyyee waraqaa lakk. 8492/2004 deebii-kennaa keessatti argamuun isaa mirkanaa'eera.\n2. Manca'iinsa callaa ilaalchisee ogeessi qonnaa baasii facaasaa fi goolabaa shallagee gatii qulqulluun Birrii 75,000 ta'uu bu'aa ajajaa dhiheessee jira.`
      );

      // Step 6: Murtee Ol-Iyyannoo
      setJudgmentCourtName('MANA MURTII OL\'AANAA GODINA SHAWAA BAHAA');
      setJudgmentBench('Dhaddacha Ol-Iyyannoo Hariiroo Hawaasaa fi Lafa');
      setJudgmentSummaryOfFacts(
        `Galmeen kun kan dhiyaate murtii Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa galmee lakk. 24891/2016 irratti lafaa fi beenyaa manca'iinsa callaa Obbo Alamuu Dheeressaa irratti murteesse mormuun ol-iyyata dhiyaate irratti hirkateeti. Manni murtichaa jalqaba irratti komii ol-iyyataa qoratee yaada ol-iyyataa erga caqasee booda "ijoon qabatee ni dhiheessisa" jechuun deebii-kennaaf waamicha ergeera. Waamichi jalqabaa yoo qaqqabuu baatu waamicha lammaffaa maxxansaa mana jireenyaatiin ergamee falmiin gareewwanii dhagahameera.`
      );
      setJudgmentPreliminaryObjectionsSummary(
        `Manni murtichaa jalqaba irratti komii ol-iyyataa qoratee "ijoon qabatee ni dhiheessisa" erga jedhee booda, deebii-kennaan waamicha 2ffaa maxxansaatiin dhiyaatee mormii darbiinsa yeroo dhiheessus, ol-iyyataani yeroo koppii murtii eegaa ture bu'uura SDFHH Kwt 323tiin waan shallagamuuf mormiin kun kufaa ta'ee hundee dhimmaatti darbee jira.`
      );
      setJudgmentAnalysisOfEvidence(
        `Dhaddachi ol-iyyannoo galmee mana murtii jalaa lakk. 24891/2016 fidisiisee qoratee jira. Akkasumas ijoo qaama sadaffaa irraa qulqullaa'uu qabuuf Waajjira Bulchiinsa fi Itti Fayyadama Lafaa fi Qonnaa Godina Shawaa Bahaatti ajajni ergamee bu'aan ajajaa dhiyaateera. Bu'aa ajajaa Lakk. WBLQ/GOD/490/16 akka ifa godhutti, ogeessi godinichaa kaartaa mirkaneessee lafti hektaara 1.2 waraqaa ragaa lakk. 8492/2004 deebii-kennaa keessatti kan argamu ta'uu mirkaneesseera. Haa ta'u malee, tilmaama callaa manca'ee ilaalchisee bu'aan ajaja ogeessa qonnaa baasii facaasaa hir'isee gatii qulqulluu Birrii 75,000 ta'uu mirkaneessee waan jiruuf tilmaamni sun fooyya'uu qaba.`
      );
      setJudgmentApplicableLaws(
        `Bu'uura Seera Deebii Falmii Hariiroo Hawaasaa Keeyyata 337, 338, 340, 341, 343, 348 fi Labsii Lakk. 248/2015 Kwt 38.`
      );
      setJudgmentOperativeOrder(
        `MURTII OL-IYYANNOO (APPELLATE JUDGMENT):
1. Murtiin Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa galmee lakk. 24891/2016 irratti qabiyyee lafaa hektaara 1.2 deebii-kennaaf gadhiisiisuu ilaalchisee kenne bu'uura SDFHH Kwt 341tiin MIRKANAA'EERA.
2. Beenyaan manca'iinsa callaa Birrii 95,000 ture bu'aa ajaja qulqullina ogeessa Waajjira Qonnaa Godinaatiin mirkanaa'e bu'uureffachuun Birrii 75,000 (Kuma torbaatamii shan) akka ta'u FOOYYA'EERA.
3. Baasiin kasaaraa falmii ol-iyyannoo garee hundaaf of danda'uun murtaa'eera.
4. MIRGA IJIBBAATAA: Gareen murtii kanaan dogoggorri bu'uura seeraa raawwatameera jedhu Dhaddacha Ijibbaataa Mana Murtii Waliigala Oromiyaatti dhiheeffachuuf mirga qaba.
Galmeen ol-iyyannoo cufamee gara mankuusaatti deebi'eera.`
      );

    } else if (level === 'cassation') {
      // 3. Cassation Division Profile (Supreme Judicial Precedent)
      setCourtName('Mana Murtii Waliigala Oromiyaa - Dhaddacha Ijibbaataa');
      setBenchName('Dhaddacha Ijibbaataa Dhimmoota Hariiroo Hawaasaa fi Lafa (5 Judges)');
      setCaseNo(activeCaseNumber || 'Lakk. Galmee Ijibbaataa 184920/2016 (Murtii Ol-aanaa Lakk. 09842/2016)');
      setJudgeName('Abbootii Seeraa Shanan: Dagafaa Fiqaaduu (Pirezidaantii Dhaddachaa), Kabbadaa Dirribaa, Zawudituu Abbabaa, Caaltuu Mokonnon, fi Tashoomaa Nagaash');
      setPlaintiffName('Obbo Alamuu Dheeressaa (Iyyataa Ijibbaataa / Petitioner)');
      setPlaintiffAdvocate('Abukaattoo Caalaa Fayyisaa');
      setDefendantName('Obbo Baqqalaa Gammachuu (Deebii-Kennaa / Respondent)');
      setDefendantAdvocate('Abukaattoo Tashoomaa Nagaash');

      setClaimText(
        `IYYATA IJIBBAATAA (Cassation Petition on Fundamental Error of Law - Labsii 216/2011 Kwt 27):\n1. Manni Murtii Ol'aanaa Godina Shawaa Bahaa galmee ol-iyyannoo lakk. 09842/2016 irratti Labsii Lakk. 248/2015 Kwt 38 fi Seera Hariiroo Hawaasaa Kwt 1149 hiikuu irratti DOGOGGORA BU'UURAA SEERAA raawwateera.\n2. Lafa qonnaa dhaalmaan dhufe irratti mirgi qabiyyummaa bu'uura seeraan osoo hin mirkanaa'in ragaa teeknikaalaa ogeessa lafaa qofaan daangaa murteessuun seera qabiyyee biyyoolessaa faallessa.\n3. Beenyaan callaa manca'ees bu'uura SDFHH Kwt 246tiin ragaan falmiin afaanii irratti osoo hin dhagahamin murtaa'uun isaa mirga falmuu sarbeera.\nKAA'UMSA: Murtiin manneen murtii jalaa dogoggora bu'uura seeraa waan qabuuf diigamee seeraan akka hiikamu iyyanna.`
      );
      setClaimEvidenceList(
        'Koppii Murtii Dhaddacha Ol-Iyyannoo Mana Murtii Ol\'aanaa Shawaa Bahaa, Koppii Murtii Mana Murtii Jalqabaa Adaamaa'
      );
      setDefenseText(
        `DEEBII DEEBII-KENNAA DHADDACHA IJIBBAATAA:\n1. Dhimmichi falmii firii dubbii fi madaallii ragaa malee dogoggora bu'uura seeraa hin qabu; bu'uura Labsii 216/2011 Kwt 27tiin manni murtii ijibbaataa firii dubbii hin madaalu.\n2. Waraqaan ragaa abbaa qabiyyummaa lakk. 8492/2004 seeraan laatamee fi kaartaan kaadastiraa mirkanaa'ee waan dhiyaateef seera hiikuu irratti dogoggorri uumame hin jiru.\nKAA'UMSA: Iyyanni ijibbaataa kufaa ta'ee murtiin manneen murtii jalaa akka mirkanaa'u.`
      );
      setDefenseEvidenceList(
        'Galmeewwan manneen murtii jalaa lamaan, Ragaa abbaa qabiyyummaa mirkanaa\'aa'
      );

      setHasPreliminaryObjection(true);
      setObjectionGrounds(['Qorannoo Calallii Duraa (Pre-Screening: Dogoggora Bu\'uura Seeraa Qabaachuu fi Dhiisuu)']);
      setObjectionDetail(
        `Koree Calallii Dhaddacha Ijibbaataa (Abbootii Seeraa Sadii): Iyyanni dhiyaate qabiyyee lafaa fi beenyaa irratti Labsii Lakk. 248/2015 Kwt 38 hiikuun wal-qabatee dogoggorri bu'uura seeraa jiraachuu fi dhiisuu isaa qorachuun hayyamuu qaba.`
      );
      setPlaintiffObjectionResponse(
        `Iyyataan: Labsii Lakk. 248/2015 Kwt 38(1) hiikuu irratti manneen murtii naannichaa murteewwan wal-faallessan waan kennaniif Dhaddachi Ijibbaataa qajeelfama dirqisiisaa akka kennuuf calallichi hayyamamuu qaba.`
      );
      setInterlocutoryRulingType('overruled');
      setInterlocutoryRulingText(
        `JAL-MURTII CALALLII DHADDACHA IJIBBAATAA:\nDhaddachi Calallii Ijibbaataa Abbootii Seeraa Sadiitiin hundeeffame iyyata dhiyaate qorachuun: Labsii Lakk. 248/2015 Kwt 38 fi Seera Hariiroo Hawaasaa Kwt 1149 wal-qabsiisuun daangaa fi mirga qabiyyummaa ragaa ogeessa teeknikaatiin murteessuu irratti dogoggorri bu'uura seeraa qoratamuu qabu jiraachuu waan amaneef, IYYANNI KUN DHADDACHA GUUTUU ABBOOTII SEERAA SHANANIITTI AKKA DHAGA'AMU HAYYAMAMEERA.`
      );

      setOralStatements([
        {
          id: 'oral_cas_1',
          speakerRole: 'Iyyataa Ijibbaataa',
          speakerName: 'Abukaattoo Caalaa Fayyisaa',
          statement: 'Dhaddachi kabajamaa: Ogeessi lafaa qaama teeknikaa malee qaama daangaa seeraa murteessu miti. Manni murtii ragaa teeknikaa qofa irratti hirkachuun mirga seeraa abbaa qabiyyummaa dhaalmaa sarbuun dogoggora bu\'uura seeraati.',
          timestamp: '11:15 AM',
          isAudioTranscribed: true
        },
        {
          id: 'oral_cas_2',
          speakerRole: 'Deebii-Kennaa',
          speakerName: 'Abukaattoo Tashoomaa Nagaash',
          statement: 'Kaartaan kaadastiraa labsii lafa baadiyyaatiin ragaa qabatamaa daangaa ti. Manni murtii jalaa seera hin cabsine; ragaa seera qabeessatti fayyadamuu dha.',
          timestamp: '11:28 AM',
          isAudioTranscribed: true
        }
      ]);

      setFramedIssues([
        {
          id: 'issue_cas_1',
          type: 'law',
          issueText: 'Labsii Lakk. 248/2015 Kwt 38(1) fi Seera Hariiroo Hawaasaa Kwt 1149 jalatti, manni murtii falmii daangaa qabiyyee lafaa irratti ragaa teeknikaalaa Waajjira Lafaa fi Qonnaa irratti qofa hirkatee murteessuun dogoggora bu\'uura seeraa ta\'aa?',
          evidenceRequired: 'Xiinxala labsii lafa baadiyyaa fi murteewwan precedents duraanii',
          burdenOfProof: 'himataa',
          status: 'clarified',
          needsThirdPartyClarification: false
        },
        {
          id: 'issue_cas_2',
          type: 'law',
          issueText: 'Manni Murtii Ol\'aanaa beenyaa callaa Birrii 75,000 murteesse bu\'uura SDFHH Kwt 246tiin ragaa afaanii osoo hin dhagahin murteessuun isaa sirrii dhaa?',
          evidenceRequired: 'Bu\'uura seera hariiroo hawaasaa Kwt 2091',
          burdenOfProof: 'himataa',
          status: 'clarified',
          needsThirdPartyClarification: false
        }
      ]);

      setSummonsList([
        {
          id: 'summons_cas_1',
          targetType: 'lower_court',
          recipientName: 'Mana Murtii Ol\'aanaa Godina Shawaa Bahaa',
          departmentOrOffice: 'Dhaddacha Ol-Iyyannoo Hariiroo Hawaasaa',
          woredaOrZone: 'Magaalaa Adaamaa',
          dispatchRefNo: 'MMWO/DH-IJ/891/2016',
          deadlineDate: '2026-10-25',
          issueToClarify: 'Galmee ol-iyyannoo lakk. 09842/2016 fi galmee sadarkaa jalqabaa lakk. 24891/2016 guutummaatti qorannoo Dhaddacha Ijibbaataatiif akka ergamu.',
          documentsDemanded: 'Galmeewwan sadarkaa duraanii hunda',
          status: 'dispatched',
          stampIncluded: true
        }
      ]);
      setSummonsRecipient('Mana Murtii Ol\'aanaa Godina Shawaa Bahaa');
      setSummonsDept('Kutaa Mankuusa Galmee');
      setSummonsLocation('Adaamaa');
      setSummonsRefNo('MMWO/DH-IJ/893/2016');
      setSummonsIssueToClarify('Galmeewwan manneen murtii jalaa hunda fiduu.');
      setSummonsDocs('Galmee guutuu fi sanadoota ragaa');

      setJudgmentCourtName('MANA MURTII WALIIGALA OROMIYAA - DHADDACHA IJIBBAATAA');
      setJudgmentBench('Dhaddacha Ijibbaataa Dhimmoota Hariiroo Hawaasaa fi Lafa');
      setJudgmentSummaryOfFacts(
        `Dhaddachi Ijibbaataa Mana Murtii Waliigala Oromiyaa Abbootii Seeraa Shanan: Dagafaa Fiqaaduu, Kabbadaa Dirribaa, Zawudituu Abbabaa, Caaltuu Mokonnon, fi Tashoomaa Nagaash ta\'uun dhimma galmee lakk. 184920/2016 irratti iyyata ijibbaataa Obbo Alamuu Dheeressaa dhiyaate qoratee jira.`
      );
      setJudgmentPreliminaryObjectionsSummary(
        `Koreen calallii ijibbaataa dhimmi kun Labsii Lakk. 248/2015 Kwt 38(1) hiikuu irratti qabxii seeraa bu\'uuraa waan qabuuf akka dhaga\'amu murteessee dhaddacha guutuutti dabarsee jira.`
      );
      setJudgmentAnalysisOfEvidence(
        `XIINXALA SEERAA FI QAJEELFAMA DIRQISIISAA DHADDACHA IJIBBAATAA:
1. Kaartaan kaadastiraa fi waraqaan ragaa abbaa qabiyyummaa Labsii Lakk. 248/2015 bu\'uureffatee Waajjira Bulchiinsa fi Itti Fayyadama Lafaa fi Qonnaatiin kenname hanga seeraan haqamutti ragaa guutuu abbaa qabiyyummaati (Conclusive Evidence).
2. Manni murtii jalaa ragaa teeknikaalaa ogeessa lafaa irratti hirkachuun daangaa qabiyyee waraqaa ragaa lakk. 8492/2004 keessatti argamu mirkaneessuun isaa dogoggora bu'uura seeraa hin qabu.
3. Haa ta'u malee, beenyaa manca'iinsa callaa ilaalchisee manni murtii ol-aanaa firii dubbii haaraa irratti ragaan osoo hin dhagahamin tilmaama callaa fooyyessuun isaa SDFHH Kwt 246 fi 343 kan faallesse waan ta'eef tilmaamni mana murtii jalqabaa mirkanaa'uu qaba.`
      );
      setJudgmentApplicableLaws(
        `Bu'uura Heera Mootummaa Naannoo Oromiyaa, Labsii Lakk. 216/2011 Kwt 27, Labsii Lakk. 248/2015 Kwt 38(1), fi Seera Deebii Falmii Hariiroo Hawaasaa Kwt 351+.`
      );
      setJudgmentOperativeOrder(
        `MURTII DIRQISIISAA DHADDACHA IJIBBAATAA (BINDING CASSATION PRECEDENT):
1. Murtiin Mana Murtii Sadarkaa Jalqabaa Aanaa Adaamaa fi Mana Murtii Ol'aanaa Godina Shawaa Bahaa qabiyyee lafaa hektaara 1.2 deebii-kennaaf gadhiisiisuu ilaalchisee kenname bu'uura seeraa qabaachuun isaa mirkanaa'eera.
2. QAJEELFAMA SEERAA DIRQISIISAA: Waraqaan ragaa abbaa qabiyyummaa lafaa fi kaartaan teeknikaalaa ogeessa Waajjira Lafaa fi Qonnaatiin mirkanaa'ee dhiyaate hanga seeraan alatti haqametti ragaa guutuu ta'ee manneen murtii hunda biratti fudhatama qabaachuu qaba jechuun qajeelfamni dirqisiisaan laatameera.
3. Beenyaan callaa manca'ee Birrii 95,000 Mana Murtii Sadarkaa Jalqabaatiin murtaa'ee ture guutummaatti MIRKANAA'EERA. Murtiin mana murtii ol-aanaa beenyaa kanaan wal-qabatee kenne DIIGAMEERA.
4. Murtiin kun bu'uura Labsii 216/2011 Kwt 27tiin manneen murtii Oromiyaa hunda irratti DIRQISIISAA DHA.
Dhaddachi cufameera.`
      );
    }
  };

  useEffect(() => {
    applyCourtProfile(courtLevel);
  }, [courtLevel]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Web Speech API Voice Recognition
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(currentLang === 'om' ? 'Meensaan dubbii (Speech Recognition) braawzara kanaan hin deeggaramu.' : 'Speech Recognition not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLang === 'om' ? 'om-ET' : currentLang === 'am' ? 'am-ET' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentSpokenTranscript(transcript);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleAddSpokenStatement = () => {
    if (!currentSpokenTranscript.trim()) return;
    const newEntry: OralHearingStatement = {
      id: 'oral_' + Date.now(),
      speakerRole: voiceSpeakerRole,
      speakerName: voiceSpeakerName || plaintiffName,
      statement: currentSpokenTranscript.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAudioTranscribed: true
    };
    setOralStatements(prev => [...prev, newEntry]);
    setCurrentSpokenTranscript('');
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioUploadStatus(file.name + ' fe\'amaa jira...');
    setTimeout(() => {
      setAudioUploadStatus(file.name + ' waraabbamee gara barreeffamatti jijjiirameera!');
      const newEntry: OralHearingStatement = {
        id: 'oral_upload_' + Date.now(),
        speakerRole: voiceSpeakerRole,
        speakerName: (voiceSpeakerName || plaintiffName) + ' (Sagalee File)',
        statement: `[Sagalee Waraabbame: ${file.name}] Jecha falmii dhiyaate: Falmii dhaddachaa irratti ragaan dhiyaate qulqullina qabaachuun isaa mirkanaa'eera.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAudioTranscribed: true
      };
      setOralStatements(prev => [...prev, newEntry]);
      setTimeout(() => setAudioUploadStatus(null), 4000);
    }, 1200);
  };

  // Add Framed Issue
  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueText.trim()) return;
    const newIssue: FramedIssue = {
      id: 'issue_' + Date.now(),
      type: newIssueType,
      issueText: newIssueText.trim(),
      evidenceRequired: newIssueEvidence.trim() || 'Ragaa barreeffamaa fi namaa',
      burdenOfProof: newIssueBurden,
      status: 'pending',
      needsThirdPartyClarification: newIssueNeedsThirdParty
    };
    setFramedIssues(prev => [...prev, newIssue]);
    setNewIssueText('');
    setNewIssueEvidence('');
  };

  const handleDeleteIssue = (id: string) => {
    setFramedIssues(prev => prev.filter(i => i.id !== id));
  };

  // Add Summons Order
  const handleAddSummonsOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summonsRecipient.trim()) return;
    const newOrder: ThirdPartySummonsOrder = {
      id: 'summons_' + Date.now(),
      targetType: activeCourtLevel === 'cassation' || activeCourtLevel === 'highCourt' ? 'lower_court' : 'government_office',
      recipientName: summonsRecipient,
      departmentOrOffice: summonsDept,
      woredaOrZone: summonsLocation,
      dispatchRefNo: summonsRefNo || `MM/DISP/${Math.floor(100 + Math.random() * 900)}/2016`,
      deadlineDate: summonsDeadline,
      issueToClarify: summonsIssueToClarify,
      documentsDemanded: summonsDocs,
      status: 'dispatched',
      stampIncluded: true,
      notes: 'Ajaja dhaddachaa seera qabeessa.'
    };
    setSummonsList(prev => [newOrder, ...prev]);
    alert(currentLang === 'om' ? 'Ajajni Waamichaa milkaa\'inaan uumameera!' : 'Summons order created!');
  };

  const handleDeleteSummons = (id: string) => {
    setSummonsList(prev => prev.filter(s => s.id !== id));
  };

  // Export PDF Summons Letter
  const handleExportSummonsPDF = (order: ThirdPartySummonsOrder) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(courtName.toUpperCase(), 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.text(benchName, 105, 27, { align: 'center' });
    doc.text('AADAAN SEERAA FI HEERA MOOTUMMAA NI KABAJAMA', 105, 33, { align: 'center' });

    doc.line(20, 37, 190, 37);

    doc.setFontSize(10);
    doc.text(`Lakk. Xalayaa: ${order.dispatchRefNo}`, 20, 46);
    doc.text(`Lakk. Galmee: ${caseNo}`, 20, 52);
    doc.text(`Guyyaa: ${hearingDate}`, 150, 46);

    doc.text(`Gara: ${order.recipientName}`, 20, 64);
    doc.text(`Kutaa: ${order.departmentOrOffice}`, 20, 70);
    doc.text(`Teessoo: ${order.woredaOrZone}`, 20, 76);

    doc.setFontSize(11);
    doc.text('Dhimma: Ajaja Qulqullina Ijoo Dubbii fi Sanada Ragaa Dhiyeessuu', 105, 88, { align: 'center' });

    doc.setFontSize(10);
    const bodyText = `Galmee falmii ${plaintiffName} fi ${defendantName} gidduu jiruun wal-qabateen, manni murtichaa sadarkaa ${activeCourtLevel === 'firstInstance' ? 'Jalqabaa' : activeCourtLevel === 'highCourt' ? 'Ol\'aanaa' : 'Ijibbaataa'}tti ijoo dubbii qabee qulqulleessaa jira.\n\nKanaafuu, waajjirri/qaamni keessan:\n1. IJOO QULQULLAA'UU QABU:\n${order.issueToClarify}\n\n2. SANADOOTA / RAGAALEE DHIYAATAN:\n${order.documentsDemanded}\n\nOgeessa dhimmi ilaallatu waliin sanadoota kana beellama guyyaa ${order.deadlineDate} sa'aatii 3:00 irratti dhaddacha dhimma lafaa Mana Murtii keenyatti dhiyaatanii akka dhiheessitan manni murtichaa ajajeera.`;

    const splitText = doc.splitTextToSize(bodyText, 170);
    doc.text(splitText, 20, 98);

    doc.text('Chaappaa Mana Murtii:', 25, 220);
    doc.circle(50, 240, 18);
    doc.text('[CHAAPPAA]', 40, 241);

    doc.text('Mallattoo Abbaa Seeraa:', 130, 220);
    doc.text(judgeName, 130, 235);
    doc.text('Abbaa Seeraa Dhaddachaa', 130, 242);

    doc.save(`Ajaja_Waamichaa_${order.dispatchRefNo.replace(/[\/\\]/g, '_')}.pdf`);
  };

  // Export PDF Judgment Document
  const handleExportJudgmentPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(judgmentCourtName, 105, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.text(judgmentBench, 105, 25, { align: 'center' });
    doc.line(20, 29, 190, 29);

    doc.setFontSize(9);
    doc.text(`Lakk. Galmee: ${caseNo}`, 20, 36);
    doc.text(`Guyyaa Murtii: ${hearingDate}`, 150, 36);
    doc.text(`Abbaa Seeraa: ${judgeName}`, 20, 42);

    doc.text(`Garee 1ffaa: ${plaintiffName}`, 20, 49);
    doc.text(`Garee 2ffaa: ${defendantName}`, 20, 55);

    doc.setFontSize(11);
    doc.text(
      activeCourtLevel === 'cassation'
        ? 'MURTII DIRQISIISAA DHADDACHA IJIBBAATAA'
        : activeCourtLevel === 'highCourt'
        ? 'MURTII DHADDACHA OL-IYYANNOO (APPELLATE JUDGMENT)'
        : 'MURTII FI AJAJA DHADDACHAA',
      105,
      66,
      { align: 'center' }
    );

    let y = 75;

    doc.setFontSize(10);
    doc.text('1. Qabiyyee Falmii Gareewwanii:', 20, y);
    y += 5;
    doc.setFontSize(8.5);
    const facts = doc.splitTextToSize(judgmentSummaryOfFacts, 170);
    doc.text(facts, 20, y);
    y += facts.length * 4.5 + 4;

    doc.setFontSize(10);
    doc.text('2. Mormiiwwan Sadarkaa Duraa fi Jal-Murtii (245(1)):', 20, y);
    y += 5;
    doc.setFontSize(8.5);
    const pre = doc.splitTextToSize(judgmentPreliminaryObjectionsSummary, 170);
    doc.text(pre, 20, y);
    y += pre.length * 4.5 + 4;

    doc.setFontSize(10);
    doc.text('3. Ijoo Dubbii fi Madaallii Ragaalee (Waajjira Lafaa/Qonnaa):', 20, y);
    y += 5;
    doc.setFontSize(8.5);
    const ev = doc.splitTextToSize(judgmentAnalysisOfEvidence, 170);
    doc.text(ev, 20, y);
    y += ev.length * 4.5 + 4;

    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(10);
    doc.text('4. Bu\'uura Seeraa:', 20, y);
    y += 5;
    doc.setFontSize(8.5);
    const laws = doc.splitTextToSize(judgmentApplicableLaws, 170);
    doc.text(laws, 20, y);
    y += laws.length * 4.5 + 4;

    doc.setFontSize(10);
    doc.text('5. Murtii Dhumaa fi Ajaja Raawwii:', 20, y);
    y += 5;
    doc.setFontSize(8.5);
    const orders = doc.splitTextToSize(judgmentOperativeOrder, 170);
    doc.text(orders, 20, y);
    y += orders.length * 4.5 + 8;

    if (y > 230) {
      doc.addPage();
      y = 30;
    }

    doc.text('Chaappaa Mana Murtii:', 25, y);
    doc.circle(45, y + 16, 12);
    doc.text('[CHAAPPAA]', 37, y + 17);

    doc.text('Mallattoo Abbootii Seeraa:', 120, y);
    doc.text(judgeName, 120, y + 13);
    doc.text(
      activeCourtLevel === 'cassation'
        ? 'Abbootii Seeraa Shanan Dhaddacha Ijibbaataa'
        : 'Abbaa Seeraa Dhaddachaa',
      120,
      y + 19
    );

    doc.save(`Murtii_${activeCourtLevel}_${caseNo.replace(/[\/\s]/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 py-4">
      {/* =========================================================================
          THREE COURT LEVELS SELECTOR & HEADER
          ========================================================================= */}
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Court Level Mode Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Sadarkaa Mana Murtii (Court Level):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => applyCourtProfile('firstInstance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeCourtLevel === 'firstInstance'
                  ? 'bg-blue-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>1. Sadarkaa Jalqabaa (Trial)</span>
            </button>

            <button
              type="button"
              onClick={() => applyCourtProfile('highCourt')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeCourtLevel === 'highCourt'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>2. Mana Murtii Ol'aanaa (Appeal)</span>
            </button>

            <button
              type="button"
              onClick={() => applyCourtProfile('cassation')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeCourtLevel === 'cassation'
                  ? 'bg-rose-500 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>3. Dhaddacha Ijibbaataa (Cassation)</span>
            </button>
          </div>
        </div>

        {/* Level Specific Details */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${
              activeCourtLevel === 'firstInstance'
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                : activeCourtLevel === 'highCourt'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
            }`}>
              {activeCourtLevel === 'firstInstance' ? <Scale className="w-8 h-8" /> : activeCourtLevel === 'highCourt' ? <Landmark className="w-8 h-8" /> : <Gavel className="w-8 h-8" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-0.5 rounded-full font-mono text-xs font-bold uppercase tracking-wider border ${
                  activeCourtLevel === 'firstInstance'
                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    : activeCourtLevel === 'highCourt'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {activeCourtLevel === 'firstInstance'
                    ? 'Dhaddacha Jalqabaa • Falmii Hundee & Ragaa'
                    : activeCourtLevel === 'highCourt'
                    ? 'Dhaddacha Ol-Iyyannoo • Komii Qorachuu, Waamicha 1ffaa/2ffaa & Bu\'aa Ajajaa'
                    : 'Dhaddacha Ijibbaataa • Dogoggora Bu\'uura Seeraa'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {activeCourtLevel === 'firstInstance'
                    ? 'SDFHH Kwt 244-247'
                    : activeCourtLevel === 'highCourt'
                    ? 'SDFHH Kwt 337, 338, 339, 340 & 341-348'
                    : 'Labsii 216/2011 Kwt 27 & SDFHH 351+'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {courtName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                {benchName} • Galmee Lakk. <span className="text-amber-400 font-bold font-mono">{caseNo}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDraftHearingSummary}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-purple-400/40"
              title="Draft AI session hearing summary document from case logs and records"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Draft Hearing Summary</span>
            </button>

            <button
              type="button"
              onClick={handleExportJudgmentPDF}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                activeCourtLevel === 'firstInstance'
                  ? 'bg-blue-500 hover:bg-blue-400 text-slate-950'
                  : activeCourtLevel === 'highCourt'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {activeCourtLevel === 'cassation'
                  ? 'Murtii Dirqisiisaa PDF'
                  : activeCourtLevel === 'highCourt'
                  ? 'Murtii Ol-Iyyannoo PDF'
                  : 'Murtii Jalqabaa PDF'}
              </span>
            </button>
            <div className="text-right pl-3 border-l border-slate-800 text-xs">
              <span className="text-slate-400 block">Abbaa Seeraa / Pirezidaantii:</span>
              <span className="text-amber-300 font-bold truncate block max-w-[200px]">{judgeName}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Case Details Mini-Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 uppercase font-mono block text-[10px]">
              {activeCourtLevel === 'cassation' ? 'Iyyataa Ijibbaataa' : activeCourtLevel === 'highCourt' ? 'Ol-Iyyataa (Appellant)' : 'Himataa (Plaintiff)'}
            </span>
            <span className="text-slate-200 font-bold truncate block">{plaintiffName}</span>
            <span className="text-slate-400 text-[11px] block">{plaintiffAdvocate}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 uppercase font-mono block text-[10px]">
              {activeCourtLevel === 'firstInstance' ? 'Himatamaa (Defendant)' : 'Deebii-Kennaa (Respondent)'}
            </span>
            <span className="text-slate-200 font-bold truncate block">{defendantName}</span>
            <span className="text-slate-400 text-[11px] block">{defendantAdvocate}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 uppercase font-mono block text-[10px]">
              {activeCourtLevel === 'highCourt' ? 'Calallii & Waamicha' : 'Mormii Sadarkaa Duraa'}
            </span>
            <span className="font-bold inline-flex items-center gap-1 text-amber-400">
              {activeCourtLevel === 'highCourt' ? '✓ Ijoon Qabamee Dhihaate' : hasPreliminaryObjection ? '⚡ Dhiyaateera' : 'Hin Dhiyaanne'}
            </span>
            <span className="text-slate-400 text-[11px] block">
              {activeCourtLevel === 'highCourt' 
                ? (firstSummonsDelivered ? 'Waamichi 1ffaa: Dhaqqabe' : 'Waamichi 2ffaa: Maxxansaa')
                : `Jal-murtii: ${interlocutoryRulingType === 'overruled' ? 'Hayyamame / Kufaa Ta\'e' : 'Cufame'}`}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 uppercase font-mono block text-[10px]">
              {activeCourtLevel === 'highCourt' ? 'Bu\'aa Ajaja Waajjiraalee' : 'Ajaja Waajjiraalee'}
            </span>
            <span className="text-emerald-400 font-bold block">{summonsList.length} Ergaman</span>
            <span className="text-slate-400 text-[11px] block">
              {activeCourtLevel === 'highCourt' ? 'Bu\'aan Dhiyaateera ✓' : `Ijoo: ${framedIssues.length} Qabaman`}
            </span>
          </div>
        </div>

        {/* Universal Speech-to-Text Dictation Toolbar for Judge Workbench */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-amber-500/30 mt-6 shadow-xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
              🎙️ Sagalee Gara Barreeyfamaatti Jijjiiruu (Judge Speech Dictation):
            </span>
            <select
              value={selectedSpeechDialect}
              onChange={(e) => setSelectedSpeechDialect(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
            >
              {SUPPORTED_SPEECH_DIALECTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.flag} {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Dirree Galmee (Target):</span>
            <select
              value={activeDictationTarget}
              onChange={(e: any) => setActiveDictationTarget(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-amber-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-bold"
            >
              <option value="claimText">1. Himannaa / Appeal Memo</option>
              <option value="defenseText">2. Deebii Himatamaa</option>
              <option value="oralHearing">3. Jecha Ragaa / Oral Statement</option>
              <option value="judgmentOrder">4. Murtii / Operative Order</option>
            </select>

            <VoiceDictation
              dialectCode={selectedSpeechDialect}
              onTextChange={(spoken) => {
                if (activeDictationTarget === 'claimText') {
                  setClaimText(prev => (prev ? prev + ' ' + spoken : spoken));
                } else if (activeDictationTarget === 'defenseText') {
                  setDefenseText(prev => (prev ? prev + ' ' + spoken : spoken));
                } else if (activeDictationTarget === 'oralHearing') {
                  setOralStatements(prev => [
                    {
                      id: `stmt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                      speakerRole: voiceSpeakerRole,
                      speakerName: voiceSpeakerName || voiceSpeakerRole,
                      statement: spoken,
                      timestamp: new Date().toLocaleTimeString(),
                      isAudioTranscribed: true,
                    },
                    ...prev
                  ]);
                } else if (activeDictationTarget === 'judgmentOrder') {
                  setJudgmentOperativeOrder(prev => (prev ? prev + ' ' + spoken : spoken));
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Six Step Judicial Stepper Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <button
          type="button"
          onClick={() => setActiveStep('pleadings')}
          className={`flex-1 min-w-[150px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeStep === 'pleadings'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>
            {activeCourtLevel === 'highCourt'
              ? '1. Komii Ol-Iyyannoo & Calallii (337)'
              : activeCourtLevel === 'cassation'
              ? '1. Iyyata Ijibbaataa & Deebii'
              : '1. Himannaa & Deebii'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep('preliminary_objection')}
          className={`flex-1 min-w-[170px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeStep === 'preliminary_objection'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>
            {activeCourtLevel === 'highCourt'
              ? '2. Waamicha Deebii-Kennaa (1ffaa & 2ffaa)'
              : activeCourtLevel === 'cassation'
              ? '2. Calallii Ijibbaataa (351)'
              : '2. Mormii Duraa (245(1))'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep('oral_hearing')}
          className={`flex-1 min-w-[160px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeStep === 'oral_hearing'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>
            {activeCourtLevel === 'highCourt'
              ? '3. Falmii Afaanii Caqasuu (340)'
              : activeCourtLevel === 'cassation'
              ? '3. Falmii Afaanii (Dhaddacha 5)'
              : '3. Falmii Afaanii (Sagalee)'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep('issues')}
          className={`flex-1 min-w-[150px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeStep === 'issues'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {activeCourtLevel === 'highCourt'
              ? '4. Ijoo & Qulqullina Qaama Sadaffaa'
              : activeCourtLevel === 'cassation'
              ? '4. Ijoo Seeraa Bu\'uuraa'
              : '4. Ijoo Dubbii (246)'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep('summons_orders')}
          className={`flex-1 min-w-[170px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeStep === 'summons_orders'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>
            {activeCourtLevel === 'highCourt'
              ? '5. Ajaja Waajjiraalee & Bu\'aa Qulqullinaa'
              : activeCourtLevel === 'firstInstance'
              ? '5. Ajaja Waamichaa (Lafa/Qonnaa)'
              : '5. Ajaja Galmee Jalaa & Qaama 3ffaa'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep('final_judgment')}
          className={`flex-1 min-w-[150px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeStep === 'final_judgment'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Gavel className="w-4 h-4" />
          <span>
            {activeCourtLevel === 'highCourt'
              ? '6. Murtee Ol-Iyyannoo (341-348)'
              : activeCourtLevel === 'cassation'
              ? '6. Murtii Dirqisiisaa'
              : '6. Murtii Dhumaa'}
          </span>
        </button>
      </div>

      {/* =========================================================================
          STEP 1: KOMII OL-IYYANNOO & CALALLII DURAA (SDFHH Kwt 337 & 338)
          ========================================================================= */}
      {activeStep === 'pleadings' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <span>
                    {activeCourtLevel === 'highCourt'
                      ? 'Kutaa 1: Komii Ol-Iyyannoo Qorachuu & Yaada Ol-Iyyataa Caqasuu (SDFHH Kwt 337)'
                      : activeCourtLevel === 'cassation'
                      ? 'Kutaa 1: Iyyata Ijibbaataa fi Deebii'
                      : 'Kutaa 1: Himannaa fi Deebii Himannaa (Pleadings)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {activeCourtLevel === 'highCourt'
                    ? 'Manni murtichaa jalqaba irratti komii ol-iyyataa qoratee yaada ol-iyyataa erga caqasee booda, dhimmi kun ijoon qabatee ni dhiheessisa moo kufaa ta\'a kan jedhu murteessa.'
                    : 'Qabiyyee falmii gareewwanii asitti qindeessaa.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep('preliminary_objection')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <span>Gara Waamicha Deebii-Kennaatti</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* In High Court: Preliminary Hearing & Decision to Admit / Dismiss (SDFHH 337/338) */}
            {activeCourtLevel === 'highCourt' && (
              <div className="bg-slate-950 p-6 rounded-2xl border-2 border-amber-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                      337
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-amber-300">
                        Qorannoo Komii Ol-Iyyannoo & Yaada Ol-Iyyataan Dhiheeffate
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Akkaataa SDFHH Kwt 337tiin manni murtichaa komii fi yaada ol-iyyataa caqasa.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-mono">Murtee Calallii:</label>
                    <select
                      value={appellateAdmitDecision}
                      onChange={(e) => setAppellateAdmitDecision(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 text-xs text-amber-400 font-bold px-3 py-1.5 rounded-xl focus:outline-none"
                    >
                      <option value="admitted">Ijoon Qabatee Ni Dhiheessisa (Admitted - SDFHH 338)</option>
                      <option value="dismissed">Kufaa Gochuu (Dismissed - SDFHH 337)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-slate-400 block">
                    Yaada fi Murtee Abbaa Seeraa (Ijoon Qabatee Ni Dhiheessisa):
                  </label>
                  <textarea
                    rows={3}
                    value={appellateAdmitReason}
                    onChange={(e) => setAppellateAdmitReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                  />
                </div>

                {appellateAdmitDecision === 'admitted' ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Ijoon qabamee ni dhiheessisa jechuun murtaa'eera. Deebii-kennaan akka dhiyaatuuf waamichi ni darba.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveStep('preliminary_objection')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                    >
                      Waamicha Ergi →
                    </button>
                  </div>
                ) : (
                  <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-300 font-bold">
                    Ol-iyyannoon kun bu'uura SDFHH Kwt 337tiin qabxii seeraa gahaa waan hin qabneef battalatti kufaa ta'eera.
                  </div>
                )}
              </div>
            )}

            {/* Automated Court Fee Assessment Bar (Oromia 2015 Regulation) */}
            <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    ⚖️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        Shallaggii Kaffaltii Abbaa Seerummaa (Court Filing Fee)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                        Dambii 2015
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Bu'uura Dambii Kaffaltii Tajaajila Abbaa Seerummaa Manneen Murtii Mootummaa Naannoo Oromiyaa Bara 2015/2016.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPleadingFeeCalc(!showPleadingFeeCalc)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow"
                  >
                    {showPleadingFeeCalc ? 'Calculator Cufi' : '⚖️ Shallaggiitti Fayyadami'}
                  </button>
                </div>
              </div>

              {pleadingCourtFee && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-300">
                      Kaffaltii Mootummaa ({pleadingCourtFee.courtLevelName}):
                    </span>
                    <span className="font-mono font-bold text-white text-sm bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                      {pleadingCourtFee.totalGovernmentFee.toLocaleString()} ETB
                    </span>
                  </div>

                  {pleadingCourtFee.isExempt && (
                    <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Dhiifama Seeraa (%100 Exempt): {pleadingCourtFee.exemptionReason}</span>
                    </div>
                  )}

                  {/* Dual User Display: Standard vs Premium Users */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className={`p-3 rounded-xl border ${
                      !isPremiumUser 
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' 
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>Fayyadamaa Idilee (Standard User)</span>
                        {!isPremiumUser && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black">YOUR TIER</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Kaffaltii Platformii: +{pleadingCourtFee.standardPlatformProcessingFee} ETB
                      </div>
                      <div className="text-sm font-black font-mono text-white mt-1">
                        {pleadingCourtFee.standardUserTotal.toLocaleString()} <span className="text-[10px] font-normal">ETB</span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      isPremiumUser 
                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-200' 
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-purple-300">Fayyadamaa Premium (Legal Pro Tier)</span>
                        {isPremiumUser && <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500 text-white font-black">YOUR TIER</span>}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                        Kaffaltii Platformii: 0 ETB (%100 Waived)
                      </div>
                      <div className="text-sm font-black font-mono text-purple-200 mt-1">
                        {pleadingCourtFee.premiumUserTotal.toLocaleString()} <span className="text-[10px] font-normal">ETB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const feeText = `\n\n---\n⚖️ SHALLAGGII KAFFALTII ABBAA SEERUMMAA (DAMBII BARA 2015):\n` +
                          `1. Sadarkaa Mana Murtii: ${pleadingCourtFee.courtLevelName}\n` +
                          `2. Gosa Dhimmaa: ${pleadingCourtFee.claimCategory === 'monetary' ? 'Dhimma Maallaqaa' : pleadingCourtFee.claimCategory === 'non_monetary' ? 'Dhimma Gatii Hin Qabne' : 'Ol\'iyyannoo'}\n` +
                          `3. Gatii Dhimmaa: ${pleadingCourtFee.claimAmountETB.toLocaleString()} ETB\n` +
                          `4. Kaffaltii Mootummaa: ${pleadingCourtFee.totalGovernmentFee.toLocaleString()} ETB ${pleadingCourtFee.isExempt ? `(Dhiifama: ${pleadingCourtFee.exemptionReason})` : ''}\n` +
                          `5. Eeyyama: ${isPremiumUser ? 'Premium (%100 Waived Platform Fee)' : 'Standard User'}\n` +
                          `6. Waliigala: ${(isPremiumUser ? pleadingCourtFee.premiumUserTotal : pleadingCourtFee.standardUserTotal).toLocaleString()} ETB\n` +
                          `Bu'uura Seeraa: Dambii Kaffaltii Tajaajila Abbaa Seerummaa Manneen Murtii Mootummaa Naannoo Oromiyaa Bara 2015/2016.`;
                        setClaimText(prev => prev ? `${prev}${feeText}` : feeText);
                        alert(currentLang === 'om' ? 'Shallaggiin kaffaltii abbaa seerummaa dhimma falmiitti dabalameera!' : 'Court fee attached to pleading!');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📎 Sanada Falmiitti Dabali (Attach to Pleading)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Expandable Calculator Form */}
              {showPleadingFeeCalc && (
                <div className="pt-2 animate-in fade-in">
                  <CourtFeeCalculator
                    currentLang={currentLang}
                    initialAmount={pleadingCourtFee?.claimAmountETB || 50000}
                    initialCourtLevel={
                      activeCourtLevel === 'cassation'
                        ? 'cassation'
                        : activeCourtLevel === 'highCourt'
                        ? 'high_court'
                        : 'first_instance'
                    }
                    initialCategory={
                      activeCourtLevel === 'cassation'
                        ? 'cassation'
                        : activeCourtLevel === 'highCourt'
                        ? 'appeal'
                        : 'monetary'
                    }
                    onApplyFeeToDocument={(feeText, res) => {
                      setPleadingCourtFee(res);
                      setClaimText(prev => prev ? `${prev}${feeText}` : feeText);
                      setShowPleadingFeeCalc(false);
                    }}
                    onClose={() => setShowPleadingFeeCalc(false)}
                  />
                </div>
              )}
            </div>

            {/* Memorandum of Appeal & Respondent Brief Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Claim / Appeal Memo */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                      {activeCourtLevel === 'highCourt' ? 'Komii Ol-Iyyannoo (Memorandum of Appeal)' : 'Qabiyyee Iyyataa'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(claimText, 'claim_copy')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedId === 'claim_copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Kophii</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <CitationEnabledEditor
                    label="Qabiyyee Barreeffamaa:"
                    value={claimText}
                    onChange={setClaimText}
                    placeholder="Enter claim text here..."
                    currentLang={currentLang}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 block">Tarree Ragaalee / Murteewwan Dhiyaatan:</label>
                  <input
                    type="text"
                    value={claimEvidenceList}
                    onChange={(e) => setClaimEvidenceList(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Deebii-Kennaa Brief / Deebii */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                      {activeCourtLevel === 'highCourt' ? 'Deebii Deebii-Kennaa (Respondent\'s Brief)' : 'Deebii Himannaa'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(defenseText, 'defense_copy')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedId === 'defense_copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Kophii</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <CitationEnabledEditor
                    label="Qabiyyee Deebii:"
                    value={defenseText}
                    onChange={setDefenseText}
                    placeholder="Enter defense text here..."
                    currentLang={currentLang}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 block">Ragaalee Deebii:</label>
                  <input
                    type="text"
                    value={defenseEvidenceList}
                    onChange={(e) => setDefenseEvidenceList(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: WAAMICHA DEEBII-KENNAA (1ffaa & 2ffaa) YOO QAQQABUU BAATE
          ========================================================================= */}
      {activeStep === 'preliminary_objection' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30 mb-2">
                  <span>
                    {activeCourtLevel === 'highCourt'
                      ? '📜 Waamicha Deebii-Kennaa • SDFHH Kwt 338, 339 & 105'
                      : '⚖️ SDFHH Kwt 244 fi 245(1)'}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {activeCourtLevel === 'highCourt'
                    ? 'Waamicha Deebii-Kennaa: Waamicha 1ffaa & Waamicha 2ffaa (Yoo Qaqqabuu Baate)'
                    : 'Mormii Sadarkaa Duraa, Yaada Garee (245(1)) fi Jal-Murtii'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {activeCourtLevel === 'highCourt'
                    ? 'Deebii-kennaan akka dhiyaatuuf waamichi ni ergama; yoo waamichi jalqabaa qaqqabuu baate waamichi lammaffaa (2ffaa) fi maxxansaa gandaatiin ergama.'
                    : 'Akkaataa SDFHH Kwt 245(1)tiin yaada dhiyaate irratti jal-murtiin laatama.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveStep('oral_hearing')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <span>Gara Falmii Afaaniitti</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* High Court Summons Console (Waamicha 1ffaa fi 2ffaa) */}
            {activeCourtLevel === 'highCourt' ? (
              <div className="space-y-6">
                {/* 1. Waamicha 1ffaa (First Summons to Respondent) */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        1ffaa
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Waamicha 1ffaa Deebii-Kennaaf Ergame (First Summons)
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400">
                          Lakk. Bahii: <strong className="text-amber-400">{firstSummonsRefNo}</strong> • Beellama: {firstSummonsDate}
                        </span>
                      </div>
                    </div>

                    {/* Delivery Status Selector for 1st Summons */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">Haala Dhaqqabuu:</span>
                      <select
                        value={firstSummonsDelivered ? 'delivered' : 'not_delivered'}
                        onChange={(e) => setFirstSummonsDelivered(e.target.value === 'delivered')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none ${
                          firstSummonsDelivered
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        }`}
                      >
                        <option value="not_delivered">❌ Hin Qaqqabne / Hin Argamne (Not Delivered)</option>
                        <option value="delivered">✓ Qaqqabeera (Delivered to Respondent)</option>
                      </select>
                    </div>
                  </div>

                  {firstSummonsDelivered ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Waamichi 1ffaa deebii-kennaa dhaqqabeera. Deebii-kennaan dhaddachatti dhiyaachuuf beellamameera.</span>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border-2 border-amber-500/40 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4" />
                        <span>HUBADHA: Waamichi 1ffaa deebii-kennaa hin qaqqabne (Hin argamne ykn teessoo jijjiire)!</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Akkaataa Seera Deebii Falmii Hariiroo Hawaasaa Keeyyata 339 fi 105/106tiin, waamichi jalqabaa yoo qaqqabuu baate <strong>Waamicha Lammaffaa (2ffaa) fi Maxxansaa Gandaan</strong> baasuun dirqama dha.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Waamicha Lammaffaa (Second Summons & Substituted Service) */}
                {!firstSummonsDelivered && (
                  <div className="bg-slate-950 p-6 rounded-2xl border-2 border-amber-500/50 space-y-4 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                          2ffaa
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-amber-300">
                            Waamicha Lammaffaa (2ffaa) & Maxxansaa (Substituted Service - SDFHH 105)
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400">
                            Waamicha lammaffaa mana jireenyaa fi waajjira gandaatti maxxansuun ergame.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">Akkaataa Dhaqqabuu:</span>
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                          ✓ Maxxansaan Dhaqqabeera
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-400 block">Lakk. Xalayaa Bahii (2ffaa):</label>
                        <input
                          type="text"
                          value={secondSummonsRefNo}
                          onChange={(e) => setSecondSummonsRefNo(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-400 block">Beellama Haaraa (2ffaa):</label>
                        <input
                          type="date"
                          value={secondSummonsDate}
                          onChange={(e) => setSecondSummonsDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-400 block">Mala Waamicha Lammaffaa:</label>
                        <select
                          value={secondSummonsMethod}
                          onChange={(e) => setSecondSummonsMethod(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                        >
                          <option value="maxxansaa">Maxxansaa Mana Jireenyaa fi Waajjira Gandaa (SDFHH 105)</option>
                          <option value="gandaan">Koree Nageenya Gandaatiin Dhaqqabsiisuu</option>
                          <option value="gazexaadhaan">Gazexaadhaan / Beeksisaan</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <span className="font-bold text-slate-300 block">Qabiyyee Ajaja Waamicha Lammaffaa:</span>
                      <p className="text-slate-400 leading-relaxed font-sans">
                        "Deebii-kennaa Obbo Baqqalaa Gammachuutiif: Waamichi duraan ergame waan isin hin qaqqabneef, bu'uura SDFHH Keeyyata 105tiin kophiin ol-iyyannoo fi waamichi kun mana jireenyaa keessan fi waajjira gandaatti maxxanfamee jira. Beellama guyyaa {secondSummonsDate} sa'aatii 3:30 irratti deebii keessan qabattanii akka dhiyaattan ajajameera."
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[11px] text-emerald-400 font-bold">
                        ✓ Deebii-kennaan waamicha lammaffaatiin beellama beekee deebii isaa dhiheeffateera.
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStep('oral_hearing')}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
                      >
                        <span>Gara Falmii Dhaddachaatti Darbi</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* First Instance & Cassation regular objection screen */
              <div className="space-y-6">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Akaakuu Mormii Sadarkaa Duraa Dhiyaatee:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['Aangoo Mana Murtii (Jurisdiction)', 'Darbiinsa Yeroo (Limitation)', 'Dhimma Murtii Dhumaa Argate (Res Judicata)', 'Dandeettii Falmuu Dhabuu'].map(ground => (
                      <span key={ground} className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                        ✓ {ground}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] font-mono text-slate-400 block mb-1.5">Qabiyyee Mormii:</label>
                    <textarea
                      rows={3}
                      value={objectionDetail}
                      onChange={(e) => setObjectionDetail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border-2 border-blue-500/30 space-y-3">
                  <h4 className="text-sm font-bold text-blue-300">Akkaataa SDFHH Kwt 245(1)tiin Yaada Falmii</h4>
                  <textarea
                    rows={3}
                    value={plaintiffObjectionResponse}
                    onChange={(e) => setPlaintiffObjectionResponse(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3: FALMII AFAANII DHADDACHAA (SDFHH Kwt 340)
          ========================================================================= */}
      {activeStep === 'oral_hearing' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Mic className="w-6 h-6 text-amber-500" />
                  <span>
                    {activeCourtLevel === 'highCourt'
                      ? 'Falmii Dhaddachaa Caqasuu (Hearing Oral Arguments - SDFHH Kwt 340)'
                      : 'Dhagahama Dhimmaa fi Falmii Afaanii (Oral Hearing Voice-to-Text)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Falmii afaanii gareewwanii (Ol-iyyataa fi Deebii-kennaa) maaykirofooniin waraabuun barreeffamatti jijjiiraa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={audioInputRef}
                  onChange={handleAudioFileUpload}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sagalee File Ol-Fe'i</span>
                </button>
              </div>
            </div>

            {audioUploadStatus && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-xl font-bold animate-in fade-in">
                {audioUploadStatus}
              </div>
            )}

            {/* Recording Console */}
            <div className="bg-slate-950 p-6 rounded-2xl border-2 border-amber-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">Nama Dubbatu:</span>
                  <select
                    value={voiceSpeakerRole}
                    onChange={(e) => {
                      const role = e.target.value as any;
                      setVoiceSpeakerRole(role);
                      if (role === 'Ol-Iyyataa' || role === 'Himataa') setVoiceSpeakerName(plaintiffName);
                      else if (role === 'Deebii-Kennaa' || role === 'Himatamaa') setVoiceSpeakerName(defendantName);
                      else if (role === 'Abukaattoo Himataa') setVoiceSpeakerName(plaintiffAdvocate);
                      else if (role === 'Abukaattoo Himatamaa') setVoiceSpeakerName(defendantAdvocate);
                      else if (role === 'Abbaa Seeraa') setVoiceSpeakerName(judgeName);
                      else setVoiceSpeakerName('Ragaa Dhaddachaa');
                    }}
                    className="bg-slate-900 border border-slate-700 text-xs text-amber-400 font-bold px-3 py-1.5 rounded-xl focus:outline-none"
                  >
                    <option value="Ol-Iyyataa">Ol-Iyyataa ({plaintiffName})</option>
                    <option value="Deebii-Kennaa">Deebii-Kennaa ({defendantName})</option>
                    <option value="Abukaattoo Himataa">Abukaattoo Ol-Iyyataa</option>
                    <option value="Abukaattoo Himatamaa">Abukaattoo Deebii-Kennaa</option>
                    <option value="Abbaa Seeraa">Abbaa Seeraa Ol-Iyyannoo</option>
                  </select>

                  <input
                    type="text"
                    value={voiceSpeakerName}
                    onChange={(e) => setVoiceSpeakerName(e.target.value)}
                    placeholder="Maqaa dubbataa..."
                    className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isListening ? 'Waraabaa Jira (Dhaabi)...' : 'Sagalee Waraabi (Voice to Text)'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={currentSpokenTranscript}
                  onChange={(e) => setCurrentSpokenTranscript(e.target.value)}
                  placeholder="Jechi afaaniin dubbatamu battalumatti asitti barreeffamaan mullata..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentSpokenTranscript('')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium"
                  >
                    Qulqulleessi
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSpokenStatement}
                    disabled={!currentSpokenTranscript.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Galmee Falmii Afaaniitti Dabali</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List of Statements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Qaboo Yaa'ii Jecha Falmii Dhaddachaa ({oralStatements.length})
                </h4>
              </div>

              <div className="space-y-2.5">
                {oralStatements.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[10px] border border-amber-500/20 font-bold">
                          {entry.speakerRole}
                        </span>
                        <span className="text-xs font-bold text-white">{entry.speakerName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{entry.timestamp}</span>
                        {entry.isAudioTranscribed && (
                          <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20">
                            🎙️ Transcribed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans pl-1">
                        "{entry.statement}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopy(entry.statement, entry.id)}
                        className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
                        title="Copy Statement"
                      >
                        {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOralStatements(oralStatements.filter(s => s.id !== entry.id))}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Haqi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 4: FRAMING OF ISSUES & 3RD PARTY CLARIFICATION
          ========================================================================= */}
      {activeStep === 'issues' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30 mb-2">
                  <span>⚖️ SDFHH Keeyyata 246/247 & 340</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {activeCourtLevel === 'highCourt'
                    ? 'Ijoo Ol-Iyyannoo fi Qulqullina Qaama Sadaffaa'
                    : 'Ijoo Dubbii Baasuu fi Ragaa Irratti Caqasamu'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ijoo falmii qindeessuun, ijoo qaama sadaffaa (Waajjira Lafaa, Qonnaa, ykn Mana Murtii Jalaa) irraa qulqullaa'uu qabu adda baasaa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveStep('summons_orders')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Gara Ajaja Waajjiraaleetti</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Issue Form */}
            <form onSubmit={handleAddIssue} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                + Ijoo Haaraa Qabi:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Qabiyyee Ijoo:</label>
                  <input
                    type="text"
                    required
                    value={newIssueText}
                    onChange={(e) => setNewIssueText(e.target.value)}
                    placeholder="fkn. Manni murtii jalaa Labsii Lakk. 248/2015 hiikuu irratti dogoggora seeraa raawwateeraa?"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Gosa Ijoo:</label>
                  <select
                    value={newIssueType}
                    onChange={(e) => setNewIssueType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="fact">Ijoo Firii Dubbii (Fact)</option>
                    <option value="law">Ijoo Seeraa (Law)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Ragaan / Sanadni Irratti Caqasamu:</label>
                  <input
                    type="text"
                    value={newIssueEvidence}
                    onChange={(e) => setNewIssueEvidence(e.target.value)}
                    placeholder="fkn. Xalayaa Waajjira Lafaa, Kaartaa, Galmee Jalaa"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Ba'aa Ragaa:</label>
                  <select
                    value={newIssueBurden}
                    onChange={(e) => setNewIssueBurden(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="himataa">Ol-Iyyataa / Himataa Irratti</option>
                    <option value="himatamaa">Deebii-Kennaa / Himatamaa Irratti</option>
                    <option value="garee_lamaan">Garee Lamaan Irratti</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIssueNeedsThirdParty}
                      onChange={(e) => setNewIssueNeedsThirdParty(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="text-[11px] text-amber-300 font-bold">
                      Ijoon Qaama Sadaffaa Irraa Qulqullaa'a
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ijoo Galmeessi</span>
                </button>
              </div>
            </form>

            {/* Display Issues */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Tarree Ijoo Qabamanii ({framedIssues.length})
              </h4>

              <div className="space-y-3">
                {framedIssues.map((issue, idx) => (
                  <div
                    key={issue.id}
                    className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold font-mono text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          issue.type === 'fact' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {issue.type === 'fact' ? 'Firii Dubbii' : 'Seeraa'}
                        </span>
                        {issue.needsThirdPartyClarification && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold font-mono">
                            🏛️ Qaama 3ffaa (Lafa/Qonnaa)
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">
                          Ba'aa: <strong className="text-amber-300 font-mono uppercase">{issue.burdenOfProof}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          issue.status === 'clarified' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {issue.status === 'clarified' ? '✓ Qulqullaa\'eera' : '⏳ Qulqullinaaf Eegamaa Jira'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteIssue(issue.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Haqi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-bold text-white leading-relaxed">
                      {issue.issueText}
                    </p>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 text-xs flex items-start gap-2">
                      <span className="text-amber-400 font-mono font-bold shrink-0">Ragaan Irratti Caqasamu:</span>
                      <span className="text-slate-300">{issue.evidenceRequired}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 5: AJAJA WAJJIRAALEETTI ERGUU & BU'AA AJAJAA DHIYEESSISUU
          ========================================================================= */}
      {activeStep === 'summons_orders' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30 mb-2">
                  <span>🏛️ Ajaja Qaama Sadaffaa & Bu'aa Qulqullinaa</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Building className="w-6 h-6 text-emerald-400" />
                  <span>
                    Ajaja Waajjiraalee Dhimmi Ilaallatuutti Erguu fi Bu'aa Ajajaa (Reports Returned)
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ijoon qaama sadaffaa irraa qulqullaa'uu qabu waan jiruuf, waajjiraalee dhimmi ilaallatuuf (Lafa, Qonnaa, Mana Murtii Jalaa) ajaja erguun bu'aa isaa asitti qindeessaa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveStep('final_judgment')}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <span>Gara Murtee Dhumaatti</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Received Reports & Clarifications Console (Bu'aa Ajajaa) */}
            <div className="bg-slate-950 p-6 rounded-2xl border-2 border-emerald-500/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    ✓
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">
                      Bu'aa Ajaja Waajjiraalee Dhimmi Ilaallatu Irraa Dhiyaate (Returned Official Findings)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Gabaasa fi ragaa qabatamaa Waajjira Lafaa, Qonnaa, ykn Mana Murtii Jalaa irraa dhiyaate.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/20">
                  Bu'aan Dhiyaateera ✓
                </span>
              </div>

              <textarea
                rows={5}
                value={thirdPartyReportSummary}
                onChange={(e) => setThirdPartyReportSummary(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                placeholder="Gabaasa bu'aa ajajaa waajjirichi dhiyeesse asitti galchaa..."
              />
            </div>

            {/* Summons Creation Form */}
            <form onSubmit={handleAddSummonsOrder} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  + Xalayaa Ajaja Qulqullinaa Haaraa Ergi:
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Lakk. Bahii: <strong className="text-amber-300">{summonsRefNo || 'MMO/SHB/--'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Qaama Ajajni Itti Darbu:</label>
                  <input
                    type="text"
                    required
                    value={summonsRecipient}
                    onChange={(e) => setSummonsRecipient(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Kutaa / Waajjira:</label>
                  <input
                    type="text"
                    value={summonsDept}
                    onChange={(e) => setSummonsDept(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Teessoo:</label>
                  <input
                    type="text"
                    value={summonsLocation}
                    onChange={(e) => setSummonsLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">
                    Ijoo Qaamicha Irraa Qulqullaa'uu Qabu:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={summonsIssueToClarify}
                    onChange={(e) => setSummonsIssueToClarify(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">
                    Sanadoota fi Ragaalee Dhiyaachuu Qaban:
                  </label>
                  <textarea
                    rows={3}
                    value={summonsDocs}
                    onChange={(e) => setSummonsDocs(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-400 font-mono">Guyyaa Beellamaa:</label>
                  <input
                    type="date"
                    value={summonsDeadline}
                    onChange={(e) => setSummonsDeadline(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Xalayaa Ajajaa Uumi & Ergi</span>
                </button>
              </div>
            </form>

            {/* List of Issued Summons */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Tarree Xalayoota Ajajaa Ergaman ({summonsList.length})
              </h4>

              <div className="grid grid-cols-1 gap-4">
                {summonsList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-emerald-400" />
                          <h5 className="font-bold text-white text-sm">{item.recipientName}</h5>
                          <span className="text-xs font-mono text-slate-400">({item.departmentOrOffice})</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Teessoo: {item.woredaOrZone} • Lakk. Bahii: <strong className="text-amber-400">{item.dispatchRefNo}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Beellama: {item.deadlineDate}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExportSummonsPDF(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF Xalayaa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSummons(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Haqi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-mono uppercase text-amber-400 block mb-1">
                          Ijoo Qulqullaa'uu Qabu:
                        </span>
                        <p className="text-slate-300 leading-relaxed font-sans">{item.issueToClarify}</p>
                      </div>

                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-1">
                          Sanada / Ragaa Dhiyaachuu Qabu:
                        </span>
                        <p className="text-slate-300 leading-relaxed font-sans">{item.documentsDemanded}</p>
                      </div>
                    </div>

                    {item.receivedReportSummary && (
                      <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-300">
                        <span className="font-bold block mb-1">Bu'aa Ajajaa Dhiyaate:</span>
                        <p className="leading-relaxed">{item.receivedReportSummary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 6: MURTII DHUMAA OL-IYYANNOO (SDFHH Kwt 341-348)
          ========================================================================= */}
      {activeStep === 'final_judgment' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                  activeCourtLevel === 'highCourt'
                    ? 'bg-amber-500 text-slate-950'
                    : activeCourtLevel === 'firstInstance'
                    ? 'bg-blue-500 text-slate-950'
                    : 'bg-rose-500 text-white'
                }`}>
                  <Gavel className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {activeCourtLevel === 'highCourt'
                      ? 'Murtii Dhaddacha Ol-Iyyannoo (Final Appellate Judgment & Decree)'
                      : activeCourtLevel === 'cassation'
                      ? 'Murtii Dirqisiisaa Dhaddacha Ijibbaataa'
                      : 'Murtii fi Ajaja Dhumaa Dhaddachaa'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeCourtLevel === 'highCourt'
                      ? 'Qorannoo komii ol-iyyataa, waamicha 1ffaa fi 2ffaa, falmii afaanii, bu\'aa ajaja Waajjira Lafaa/Qonnaa, fi murtee dhumaa (Mirkaneessuu, Fooyyessuu, ykn Diiguu).'
                      : 'Seensa, falmii, madaallii ragaalee, bu\'uura seeraa, fi ajaja murtii dhumaa.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJudgmentPDF}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Murtii PDF Baasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCopy(`${judgmentCourtName}\n${judgmentBench}\nLakk. Galmee: ${caseNo}\n\n${judgmentSummaryOfFacts}\n\n${judgmentAnalysisOfEvidence}\n\n${judgmentApplicableLaws}\n\n${judgmentOperativeOrder}`, 'full_judgment_copy');
                    alert(currentLang === 'om' ? 'Murtiin guutuu kophameera!' : 'Full judgment copied!');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2"
                >
                  {copiedId === 'full_judgment_copy' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>Kophii Guutuu</span>
                </button>
              </div>
            </div>

            {/* Official Judgment Editor */}
            <div className="space-y-5 bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Maqaa Mana Murtichaa:</label>
                  <input
                    type="text"
                    value={judgmentCourtName}
                    onChange={(e) => setJudgmentCourtName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-bold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 block">Dhaddacha:</label>
                  <input
                    type="text"
                    value={judgmentBench}
                    onChange={(e) => setJudgmentBench(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* 1. Pleadings & Appeal Memo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-400 block">
                  1. Qabiyyee Komii Ol-Iyyannoo & Calallii Duraa (SDFHH Kwt 337):
                </label>
                <textarea
                  rows={3}
                  value={judgmentSummaryOfFacts}
                  onChange={(e) => setJudgmentSummaryOfFacts(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                />
              </div>

              {/* 2. Summons Process (Waamicha 1ffaa & 2ffaa) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-blue-400 block">
                  2. Adeemsa Waamicha Deebii-Kennaa (Waamicha 1ffaa, 2ffaa Maxxansaa & Deebii):
                </label>
                <textarea
                  rows={2}
                  value={judgmentPreliminaryObjectionsSummary}
                  onChange={(e) => setJudgmentPreliminaryObjectionsSummary(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              {/* 3. Evidentiary Analysis & Third Party Reports */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-400 block">
                  3. Ijoo Ol-Iyyannoo fi Madaallii Bu'aa Ajaja Waajjiraalee (Lafaa & Qonnaa):
                </label>
                <textarea
                  rows={4}
                  value={judgmentAnalysisOfEvidence}
                  onChange={(e) => setJudgmentAnalysisOfEvidence(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>

              {/* 4. Statutory Provisions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-400 block">
                  4. Bu'uura Seeraa (Applicable Statutes - SDFHH Kwt 341-348):
                </label>
                <input
                  type="text"
                  value={judgmentApplicableLaws}
                  onChange={(e) => setJudgmentApplicableLaws(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* 5. Final Operative Decision */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                    5. Murtee Dhumaa Ol-Iyyannoo (Mirkaneessuu / Fooyyessuu / Diiguu):
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ✓ Mirgi Ijibbaataa ibsameera
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={judgmentOperativeOrder}
                  onChange={(e) => setJudgmentOperativeOrder(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-amber-500/40 rounded-xl p-4 text-xs text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed font-mono"
                />
              </div>

              {/* Signature Block */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Mirkaneessa Dhaddachaa</span>
                  <div className="text-sm font-bold text-white">{judgeName}</div>
                  <div className="text-xs text-amber-400 font-mono">
                    Dhaddacha Ol-Iyyannoo Godina Shawaa Bahaa • {hearingDate}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-500/50 flex items-center justify-center text-[10px] font-mono text-amber-400 text-center font-bold">
                    CHAAPPAA<br/>DHADDACHAA
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-emerald-400 font-bold block">✓ Seeraan Qophaa'eera</span>
                    <span className="text-slate-400 text-[11px]">Galmeen cufameera</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Draft Hearing Summary Modal */}
      {showDraftSummaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Guduunfaa Qabxii Dhaddachaa (Draft Hearing Summary)</h3>
                  <p className="text-xs text-slate-400 font-mono">Preliminary Session Document Engine</p>
                </div>
              </div>
              <button
                onClick={() => setShowDraftSummaryModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isGeneratingDraftSummary ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs text-purple-300 font-bold">Galmee fi sagalee dhaddachaa irraa guduunfaa qopheessaa jira...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={14}
                  value={draftSummaryText}
                  onChange={(e) => setDraftSummaryText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed"
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-emerald-400 font-mono">✓ AI Session Summary Generated</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(draftSummaryText, 'draft_summary')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      {copiedId === 'draft_summary' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'draft_summary' ? 'Waraabbameera' : 'Waraabbi (Copy)'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const blob = new Blob([draftSummaryText], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Hearing_Summary_${caseNo.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Buufadhu (.txt)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
