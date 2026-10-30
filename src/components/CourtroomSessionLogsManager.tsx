import React, { useState } from 'react';
import { 
  Mic, 
  Video, 
  FileText, 
  Play, 
  Pause, 
  Link as LinkIcon, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Clock, 
  User, 
  Volume2, 
  ShieldCheck, 
  Tag, 
  Gavel,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  FileCheck,
  RefreshCw,
  ExternalLink,
  Printer,
  FileDown
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { verifyTestimonyInFirestore } from '../services/courtCaseService';
import { downloadCourtTranscriptPDF, downloadBatchCourtTranscriptsPDF } from '../services/courtTranscriptPdfService';

export interface CourtroomSessionRecord {
  id: string;
  caseNumber: string;
  sessionTitle: string;
  sessionDate: string;
  sessionType: 'witness_testimony' | 'preliminary_hearing' | 'cross_examination' | 'oral_argument' | 'court_ruling';
  witnessName?: string;
  recordingUrl?: string;
  audioDuration?: string;
  transcriptText: string;
  timestamps: { time: string; speaker: string; text: string }[];
  keyLegalTakeaways: string[];
  loggedBy: string;
  isOfficialRecord: boolean;
  isVerified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

interface CourtroomSessionLogsManagerProps {
  currentLang: Language;
  caseNumber?: string;
  caseTitle?: string;
  initialRecords?: CourtroomSessionRecord[];
  userRole?: string;
  judgeName?: string;
}

export const CourtroomSessionLogsManager: React.FC<CourtroomSessionLogsManagerProps> = ({
  currentLang,
  caseNumber = 'CR-2026/089',
  caseTitle = 'Himannaa Waliigaltee Bittaa fi Gurgurtaa Manaa',
  initialRecords,
  userRole,
  judgeName
}) => {
  const t = translations[currentLang];

  const defaultRecords: CourtroomSessionRecord[] = [
    {
      id: 'log-001',
      caseNumber,
      sessionTitle: 'Jecha Dhugaa Ba\'umsa Ragaa 1ffaa (Witness Testimony - Dr. Tadesse Bekele)',
      sessionDate: '2026-10-18 09:30 AM',
      sessionType: 'witness_testimony',
      witnessName: 'Dr. Tadesse Bekele (Ogeessa Fayyaa & Ragaa)',
      recordingUrl: 'https://court.oromia.et/recordings/session-cr-2026-089-01.m4a',
      audioDuration: '14m 22s',
      transcriptText: 'Ragaan kun waliigalteen bittaa fi gurgurtaa manaa guyyaa 2025-05-10 raawwatame jedhee mirkaneesseera. Mallattoon sanada irratti jiruus kan mallatteessaa ta\'uu isaa jecha kenneera.',
      timestamps: [
        { time: '00:02:15', speaker: 'Abbaa Seeraa', text: 'Kabajamoo Ragaa, guyyaa waliigaltechee irratti argamtanii turtanii?' },
        { time: '00:02:45', speaker: 'Dr. Tadesse (Ragaa 1ffaa)', text: 'Eeyyee, qabaa waliigaltee sana irratti fuula dura koon mallatteessan.' },
        { time: '00:06:10', speaker: 'Abukaattoo Himatamaa', text: 'Gatiin manichaa kaffalamuu isaa ijaan argitanii?' },
        { time: '00:06:35', speaker: 'Dr. Tadesse (Ragaa 1ffaa)', text: 'Nagaheen kaffaltii baankii kaffaltii birrii 1.5M agarsiisu sanadaatti qabatamuun koo mirkanaa\'eera.' }
      ],
      keyLegalTakeaways: [
        'Ragaan 1ffaan waliigalteen raawwatamuu fi kaffaltiin baankii raawwatamuu mirkaneesseera.',
        'SDFHH Keeyyata 137 bu\'uureffachuun sanadni ragaa fudhatama argateera.'
      ],
      loggedBy: 'Gargaaraa Abbaa Seeraa Tolasaa',
      isOfficialRecord: true
    },
    {
      id: 'log-002',
      caseNumber,
      sessionTitle: 'Dhaddacha Mormii Sadarkaa Duraa (Oral Arguments on Preliminary Objection)',
      sessionDate: '2026-10-20 10:45 AM',
      sessionType: 'preliminary_hearing',
      recordingUrl: 'https://court.oromia.et/recordings/session-cr-2026-089-02.mp4',
      audioDuration: '28m 10s',
      transcriptText: 'Abukaattoon himatamaa mormii darbiinsa yeroo (SDFHH Kwt 244) dhiyeesseera. Abukaattoon himataa immoo darbiinsi yeroo citee ture jechuun deebii kenneera.',
      timestamps: [
        { time: '00:04:10', speaker: 'Abukaattoo Himatamaa', text: 'Himannaan kun waggaa 3 booda waan dhiyaateef SDFHH Kwt 244(1)(a) dhaan darbiinsa yerootiin cufamuu qaba.' },
        { time: '00:11:20', speaker: 'Abukaattoo Himataa', text: 'Himatamaan kaffaltii gartokkoo bara 2025 keessa waan raawwateef Koodii Siivilii Kwt 1850 dhaan darbiinsi yeroo citeera.' }
      ],
      keyLegalTakeaways: [
        'Koodii Siivilii Kwt 1850 bu\'uureffachuun cituun darbiinsa yeroo (Interruption of Prescription) madaalamuu qaba.'
      ],
      loggedBy: 'Registrar Galmee',
      isOfficialRecord: true
    }
  ];

  const [records, setRecords] = useState<CourtroomSessionRecord[]>(initialRecords || defaultRecords);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Session Log Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CourtroomSessionRecord['sessionType']>('witness_testimony');
  const [newWitness, setNewWitness] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDuration, setNewDuration] = useState('10m 00s');
  const [newTranscript, setNewTranscript] = useState('');
  const [newTakeaways, setNewTakeaways] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredRecords = records.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.sessionTitle.toLowerCase().includes(q) ||
      r.transcriptText.toLowerCase().includes(q) ||
      (r.witnessName && r.witnessName.toLowerCase().includes(q)) ||
      r.timestamps.some(t => t.text.toLowerCase().includes(q) || t.speaker.toLowerCase().includes(q))
    );
  });

  const handleCopyQuote = (quoteText: string, time: string, recordId: string) => {
    const textToCopy = `"[Court Transcript ${time}] ${quoteText}" - Case: ${caseNumber}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedTextId(`${recordId}-${time}`);
    setTimeout(() => setCopiedTextId(null), 2500);
  };

  const [isVerifyingId, setIsVerifyingId] = useState<string | null>(null);

  const handleVerifyTestimony = async (recordId: string) => {
    if (!judgeName) return;
    
    setIsVerifyingId(recordId);
    const record = records.find(r => r.id === recordId);
    
    try {
      const res = await verifyTestimonyInFirestore(
        caseNumber, 
        recordId, 
        judgeName, 
        record?.witnessName
      );
      
      if (res.success) {
        setRecords(prev => prev.map(r => 
          r.id === recordId 
            ? { ...r, isVerified: true, verifiedAt: new Date().toISOString(), verifiedBy: judgeName } 
            : r
        ));
        setSuccessMsg(
          currentLang === 'om'
            ? `Ragaan (${record?.witnessName || recordId}) mirkanaa'eera. Haalli galmee gara 'Gartokkoon Dhaga’ame' tti jijjiirameera.`
            : `Testimony by ${record?.witnessName || 'witness'} verified. Case status updated to Partially Heard.`
        );
      }
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setIsVerifyingId(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleExportSinglePDF = (rec: CourtroomSessionRecord) => {
    downloadCourtTranscriptPDF({
      caseNumber: rec.caseNumber || caseNumber,
      caseTitle,
      sessionTitle: rec.sessionTitle,
      sessionDate: rec.sessionDate,
      sessionType: rec.sessionType,
      witnessName: rec.witnessName,
      transcriptText: rec.transcriptText,
      timestamps: rec.timestamps,
      keyLegalTakeaways: rec.keyLegalTakeaways,
      judgeName: judgeName || rec.verifiedBy || 'Honorable Bench Judge',
      loggedBy: rec.loggedBy,
      isVerified: rec.isVerified,
      verifiedBy: rec.verifiedBy,
      verifiedAt: rec.verifiedAt,
      currentLang,
    });
  };

  const handleExportAllTranscriptsPDF = () => {
    downloadBatchCourtTranscriptsPDF(
      caseNumber,
      records.map((rec) => ({
        caseNumber: rec.caseNumber || caseNumber,
        caseTitle,
        sessionTitle: rec.sessionTitle,
        sessionDate: rec.sessionDate,
        sessionType: rec.sessionType,
        witnessName: rec.witnessName,
        transcriptText: rec.transcriptText,
        timestamps: rec.timestamps,
        keyLegalTakeaways: rec.keyLegalTakeaways,
        judgeName: judgeName || rec.verifiedBy || 'Honorable Bench Judge',
        loggedBy: rec.loggedBy,
        isVerified: rec.isVerified,
        verifiedBy: rec.verifiedBy,
        verifiedAt: rec.verifiedAt,
        currentLang,
      }))
    );
  };

  const handleCreateNewLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTranscript.trim()) return;

    const newRecord: CourtroomSessionRecord = {
      id: `log-${Date.now()}`,
      caseNumber,
      sessionTitle: newTitle,
      sessionDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      sessionType: newType,
      witnessName: newWitness || undefined,
      recordingUrl: newUrl || `https://court.oromia.et/recordings/session-${Date.now()}.m4a`,
      audioDuration: newDuration,
      transcriptText: newTranscript,
      timestamps: [
        { time: '00:01:00', speaker: newWitness || 'Hirmaattota Dhaddachaa', text: newTranscript.slice(0, 120) }
      ],
      keyLegalTakeaways: newTakeaways ? newTakeaways.split('\n').filter(Boolean) : ['Waraabbata Dhaddachaa Mirkanaa\'e.'],
      loggedBy: 'Abbaa Seeraa / Katabaa Dhaddachaa',
      isOfficialRecord: true
    };

    setRecords([newRecord, ...records]);
    setShowAddForm(false);
    setNewTitle('');
    setNewWitness('');
    setNewUrl('');
    setNewTranscript('');
    setNewTakeaways('');
    setSuccessMsg(
      currentLang === 'om'
        ? 'Galmeen sagalee/viidiyoo dhaddachaa milkaa\'inaan galmeeffamee qaqqabiinsa murtii qopheessituuf qophaa\'eera!'
        : 'Courtroom session log recorded successfully!'
    );
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-2xl font-bold shrink-0 shadow-inner">
            🎙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                Official Courtroom Recording Index
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                Case: {caseNumber}
              </span>
            </div>
            <h3 className="text-lg font-bold font-serif-legal text-white mt-0.5">
              {currentLang === 'om' ? 'Galmee Sagalee, Viidiyoo & Jecha Ragaa Dhaddachaa' : 'Courtroom Recorded Session Logs & Witness Transcripts'}
            </h3>
            <p className="text-xs text-slate-300">
              Abbootiin seeraa qorannoo murtii fi qophii sababa seeraa irratti jecha ragaa fi waraabbata sagalee dhaddachaa salphaatti sakatta'anii caqasuu danda'u.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Generate Court Transcript Button */}
          <button
            type="button"
            onClick={handleExportAllTranscriptsPDF}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-all border border-emerald-400/30"
            title="Export all ongoing session transcripts to PDF"
          >
            <Printer className="w-4 h-4 text-emerald-200" />
            <span>{currentLang === 'om' ? '📜 Transkriptii Dhaddachaa PDF Uumi' : currentLang === 'am' ? '📜 የችሎት ቃለ-ጉባዔ PDF አዘጋጅ' : '📄 Generate Court Transcript'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>{currentLang === 'om' ? '+ Waraabbata Sagalee Haaraa Qabsiisi' : '+ Link Recorded Session'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form: Add/Link New Courtroom Session Recording Log */}
      {showAddForm && (
        <form onSubmit={handleCreateNewLog} className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-amber-300 font-mono uppercase flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-amber-400" />
              <span>Galmee Waraabbata Sagalee/Viidiyoo Haaraa Qabsiisuu</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕ Cufi
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Mata Duree Session / Dhaddachaa *</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="fkn. Jecha Dhugaa Ba'umsa Ragaa 2ffaa (Obbo Toleeraa)"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Gosa Session (Type)</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="witness_testimony">Jecha Ragaa (Witness Testimony)</option>
                <option value="preliminary_hearing">Mormii Sadarkaa Duraa (Preliminary Hearing)</option>
                <option value="cross_examination">Gaaffii fi Deebii Cross-Examination</option>
                <option value="oral_argument">Falmii Afaanii (Oral Arguments)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Maqaa Ragaa / Hirmaattotaa</label>
              <input
                type="text"
                value={newWitness}
                onChange={e => setNewWitness(e.target.value)}
                placeholder="fkn. Dr. Tadesse Bekele"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Linkii Audio/Video (URL)</label>
              <input
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://court.oromia.et/recordings/..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Dheerina Sagalee (Duration)</label>
              <input
                type="text"
                value={newDuration}
                onChange={e => setNewDuration(e.target.value)}
                placeholder="fkn. 15m 30s"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Barreeffama Waraabbata Jecha Ragaa (Transcript Text) *</label>
            <textarea
              rows={3}
              value={newTranscript}
              onChange={e => setNewTranscript(e.target.value)}
              placeholder="Jecha ragaan dhaddacha irratti kenne bifa barreeffamaatiin..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Qabxii Seeraa Murteessaa (Key Legal Takeaways - 1 per line)</label>
            <textarea
              rows={2}
              value={newTakeaways}
              onChange={e => setNewTakeaways(e.target.value)}
              placeholder="fkn. Ragaan kaffaltii birrii 1.5M raawwatamuu mirkaneesseera"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Galmee Sagalee Dhaddachaa Qabsiisi</span>
          </button>
        </form>
      )}

      {/* Search Bar for Transcripts */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={currentLang === 'om' ? 'Jecha ragaa, maqaa, ykn barreeffama transcript keessaa barbaadi...' : 'Search transcripts by witness name, keyword or timestamp...'}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
        />
      </div>

      {/* Recorded Session Logs List */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
            {currentLang === 'om' ? 'Galmeen sagalee ykn transcript barbaacha kana waliin wal-simu hin argamne.' : 'No courtroom session recordings match your query.'}
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const isPlaying = isPlayingId === rec.id;

            return (
              <div key={rec.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 hover:border-slate-700 transition-all shadow-md">
                {/* Log Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                        {rec.sessionType.toUpperCase().replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> {rec.sessionDate}
                      </span>
                      {rec.isOfficialRecord && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> OFFICIAL
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white font-serif-legal">
                      {rec.sessionTitle}
                    </h4>
                    {rec.witnessName && (
                      <div className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ragaa: {rec.witnessName}</span>
                      </div>
                    )}
                  </div>

                  {/* Audio Player Controller Simulation */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsPlayingId(isPlaying ? null : rec.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        isPlaying 
                          ? 'bg-rose-500 text-white animate-pulse shadow-lg' 
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlaying ? 'Dhaabi (Pause)' : `Taphadhu (${rec.audioDuration || 'Play'})`}</span>
                    </button>

                    {rec.recordingUrl && (
                      <a
                        href={rec.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        title="Direct Audio Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {/* Generate Single Transcript PDF Button */}
                    <button
                      type="button"
                      onClick={() => handleExportSinglePDF(rec)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 hover:border-amber-500/50 flex items-center gap-1.5 transition-all cursor-pointer shadow"
                      title="Export this session transcript to PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>{currentLang === 'om' ? 'Transcript PDF' : 'PDF Export'}</span>
                    </button>

                    {/* JUDICIAL VERIFICATION BUTTON */}
                    {(userRole === 'judge' || userRole === 'court_admin') && (
                      <button
                        type="button"
                        disabled={rec.isVerified || isVerifyingId === rec.id}
                        onClick={() => handleVerifyTestimony(rec.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
                          rec.isVerified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                        }`}
                      >
                        {isVerifyingId === rec.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : rec.isVerified ? (
                          <FileCheck className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {rec.isVerified 
                            ? (currentLang === 'om' ? 'Mirkanaa\'eera' : 'Verified') 
                            : (currentLang === 'om' ? 'Mirkaneessi' : 'Verify Transcript')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Simulated Waveform & Audio Player Status when Playing */}
                {isPlaying && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
                      <Volume2 className="w-4 h-4 animate-bounce" />
                      <span>Waraabbata Sagalee Dhaddachaa Taphaati... [00:02:45 / {rec.audioDuration}]</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[40, 70, 30, 90, 60, 100, 50, 80, 40, 60, 30].map((h, i) => (
                        <div key={i} className="w-1 bg-amber-400 rounded-full animate-pulse" style={{ height: `${h * 0.2}px` }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcript Summary */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Gabaasa Jecha Ragaa (Transcript Summary):
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-900 p-3 rounded-xl border border-slate-800/80">
                    {rec.transcriptText}
                  </p>
                </div>

                {/* Timestamps & Verbatim Excerpts */}
                {rec.timestamps.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                      Waraabbata Qaqqabiinsa Yeroo (Timestamped Verbatim Dialogue):
                    </span>

                    <div className="space-y-1.5">
                      {rec.timestamps.map((ts, idx) => {
                        const copyKey = `${rec.id}-${ts.time}`;
                        const isCopied = copiedTextId === copyKey;

                        return (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/60 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors">
                            <div className="flex items-start gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-400 font-mono text-[10px] font-bold border border-slate-800 shrink-0">
                                {ts.time}
                              </span>
                              <div>
                                <span className="font-bold text-amber-300 font-sans mr-1">{ts.speaker}:</span>
                                <span className="text-slate-300 leading-relaxed font-sans">{ts.text}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyQuote(ts.text, ts.time, rec.id)}
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 transition-colors shrink-0 cursor-pointer"
                              title="Wabii Murtii Qopheessituuf Garagalchi (Copy Citation for Judgment Drafting)"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Key Legal Takeaways */}
                {rec.keyLegalTakeaways.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1 text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Qabxii Seeraa Madaalamaa (Key Legal Takeaways for Judge):</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                      {rec.keyLegalTakeaways.map((point, pIdx) => (
                        <li key={pIdx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CourtroomSessionLogsManager;
