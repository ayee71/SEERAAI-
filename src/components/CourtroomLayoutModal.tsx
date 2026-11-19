import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  Save, 
  Check, 
  RotateCcw, 
  MapPin, 
  Scale, 
  Shield, 
  UserCheck, 
  Briefcase, 
  User, 
  FileText, 
  Info, 
  AlertCircle,
  Eye,
  CheckCircle2,
  Lock,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { 
  CourtroomSeatingLayout, 
  CourtroomSeatAssignment, 
  saveCourtroomSeatingLayout, 
  fetchCourtroomSeatingLayout 
} from '../services/courtCaseService';

export interface CourtroomLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  caseId: string;
  caseNumber: string;
  claimantName?: string;
  respondentName?: string;
  activeJudgeName?: string;
  onLayoutSaved?: (layout: CourtroomSeatingLayout) => void;
}

export const CourtroomLayoutModal: React.FC<CourtroomLayoutModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  caseId,
  caseNumber,
  claimantName = 'Obbo Baqqalaa Gammachuu',
  respondentName = 'Adde Birhaanee Asfaawu',
  activeJudgeName = 'Abbaa Seeraa Caalaa',
  onLayoutSaved
}) => {
  const [layout, setLayout] = useState<CourtroomSeatingLayout | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string>('judge_bench_center');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [courtroomName, setCourtroomName] = useState<string>('Dhaddacha 1ffaa - Mana Murtii Aanaa Adaamaa');

  // Load layout on open
  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      const data = await fetchCourtroomSeatingLayout(caseId, caseNumber, activeJudgeName);
      setLayout(data);
      if (data.courtroomName) setCourtroomName(data.courtroomName);
    };
    loadData();
  }, [isOpen, caseId, caseNumber, activeJudgeName]);

  const selectedSeat = layout?.seats.find(s => s.seatId === selectedSeatId) || layout?.seats[0];

  // Update specific seat assignment
  const handleUpdateSeat = (field: keyof CourtroomSeatAssignment, value: any) => {
    if (!layout || !selectedSeat) return;
    const updatedSeats = layout.seats.map(s => {
      if (s.seatId === selectedSeat.seatId) {
        return { ...s, [field]: value };
      }
      return s;
    });
    setLayout({ ...layout, seats: updatedSeats });
  };

  // Reset to Ethiopian Standard Courtroom Seating
  const handleResetToStandard = () => {
    if (!layout) return;
    const standardSeats: CourtroomSeatAssignment[] = [
      {
        seatId: 'judge_bench_center',
        role: 'judge',
        name: activeJudgeName,
        organization: 'Mana Murtii Waliigalaa / Aanaa (Presiding Bench)',
        attendanceStatus: 'present',
        notes: 'Presiding Judge / Abbaa Seeraa Murteessaa'
      },
      {
        seatId: 'registrar_desk',
        role: 'registrar',
        name: 'Obbo Tolasaa Fiqaaduu',
        organization: 'Waajjira Galmee Dhaddachaa',
        attendanceStatus: 'present',
        notes: 'Court Clerk & Recording Officer'
      },
      {
        seatId: 'prosecutor_table',
        role: 'prosecutor',
        name: 'Obbo Kabbadaa Dheeressaa',
        organization: 'Waajjira Abbaa Alangaa Aanaa',
        attendanceStatus: 'present',
        notes: 'Public Prosecutor / Abbaa Alangaa Mootummaa'
      },
      {
        seatId: 'plaintiff_table',
        role: 'plaintiff',
        name: claimantName,
        organization: 'Himataa / Plaintiff & Counsel',
        attendanceStatus: 'present',
        notes: 'Accompanied by Defense Advocate'
      },
      {
        seatId: 'defendant_table',
        role: 'defendant',
        name: respondentName,
        organization: 'Himatamaa / Defendant & Counsel',
        attendanceStatus: 'present',
        notes: 'In-person respondent'
      },
      {
        seatId: 'witness_stand',
        role: 'witness',
        name: 'Obbo Gurmeessaa Baqqalaa',
        organization: 'Ragaa Dhaddachaa (Key Witness)',
        attendanceStatus: 'present',
        notes: 'Under sworn oath (Kakuu Seeraa)'
      },
      {
        seatId: 'police_escort',
        role: 'escort',
        name: 'Saajin Alamu Dheeressaa',
        organization: 'Poolisii Oromiyaa (Security Escort)',
        attendanceStatus: 'present',
        notes: 'Courtroom Security & Order Marshal'
      }
    ];

    setLayout({ ...layout, seats: standardSeats });
  };

  // Save Layout to Case
  const handleSaveLayout = async () => {
    if (!layout) return;
    setIsSaving(true);
    try {
      const result = await saveCourtroomSeatingLayout(caseId, {
        ...layout,
        courtroomName,
        caseNumber,
        judgeName: activeJudgeName
      });

      if (result.success) {
        setSuccessToast(result.message);
        onLayoutSaved?.(result.layout);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (e: any) {
      console.error('Failed to save layout:', e);
      alert('Teessuma dhaddachaa galmeessuun hin danda\'amne: ' + (e.message || String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !layout) return null;

  // Helper color mappings for courtroom positions
  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'judge':
        return {
          bg: 'bg-amber-500/20',
          border: 'border-amber-500/60',
          ring: 'ring-amber-500/30',
          badge: 'bg-amber-500 text-slate-950',
          text: 'text-amber-400',
          icon: Scale,
          title: 'Abbaa Seeraa (Bench)'
        };
      case 'prosecutor':
        return {
          bg: 'bg-rose-500/20',
          border: 'border-rose-500/60',
          ring: 'ring-rose-500/30',
          badge: 'bg-rose-500 text-white',
          text: 'text-rose-400',
          icon: Shield,
          title: 'Abbaa Alangaa'
        };
      case 'plaintiff':
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-500/60',
          ring: 'ring-blue-500/30',
          badge: 'bg-blue-500 text-white',
          text: 'text-blue-400',
          icon: Briefcase,
          title: 'Himataa & Abukaattoo'
        };
      case 'defendant':
        return {
          bg: 'bg-purple-500/20',
          border: 'border-purple-500/60',
          ring: 'ring-purple-500/30',
          badge: 'bg-purple-500 text-white',
          text: 'text-purple-400',
          icon: User,
          title: 'Himatamaa & Abukaattoo'
        };
      case 'witness':
        return {
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-500/60',
          ring: 'ring-emerald-500/30',
          badge: 'bg-emerald-500 text-slate-950',
          text: 'text-emerald-400',
          icon: UserCheck,
          title: 'Ragaa (Witness Stand)'
        };
      case 'registrar':
        return {
          bg: 'bg-cyan-500/20',
          border: 'border-cyan-500/60',
          ring: 'ring-cyan-500/30',
          badge: 'bg-cyan-500 text-slate-950',
          text: 'text-cyan-400',
          icon: FileText,
          title: 'Qindeessaa Dhaddachaa'
        };
      default:
        return {
          bg: 'bg-slate-800/60',
          border: 'border-slate-700',
          ring: 'ring-slate-700',
          badge: 'bg-slate-700 text-white',
          text: 'text-slate-300',
          icon: Users,
          title: 'Eegduu / Uummata'
        };
    }
  };

  const getSeatData = (id: string) => layout.seats.find(s => s.seatId === id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Caasaa Teessuma Dhaddachaa (Courtroom Layout)</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {caseNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Abbaa Seeraa, Abbaa Alangaa, Himataa, Himatamaa fi Ragaalee teessuma dhaddachaa irratti qindeessi'
                  : 'Visually map seating positions of Judge, Prosecutor, Plaintiff, Defendant, and Witnesses'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1">
          {/* Courtroom Room Title & Presets Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2.5 flex-1">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                value={courtroomName}
                onChange={(e) => setCourtroomName(e.target.value)}
                placeholder="Maqaa Dhaddachaa / Courtroom Name..."
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 w-full max-w-md focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToStandard}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset to Ethiopian procedural standard arrangement"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Qophii Seera Qabeessaa (Reset Default)</span>
              </button>
            </div>
          </div>

          {/* Grid Layout: Visual Spatial Floor Plan (Left 60%) vs Inspector Editor (Right 40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 🏛️ VISUAL COURTROOM FLOOR PLAN MAP */}
            <div className="lg:col-span-7 bg-slate-950 rounded-3xl p-5 border-2 border-slate-800 shadow-inner space-y-5 relative select-none">
              <div className="text-center pb-2 border-b border-slate-800/80">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                  NORTH / BENCH ELEVATION (FLOOR PLAN)
                </span>
              </div>

              {/* SECTION 1: PRESIDING JUDICIAL BENCH & REGISTRAR */}
              <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    BARRUU OLAANAA ABBAA SEERAA (JUDICIAL BENCH)
                  </span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                    ELEVATED ROSTRUM
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* Bench Seat (Center) */}
                  {(() => {
                    const s = getSeatData('judge_bench_center');
                    const style = getRoleStyle('judge');
                    const isSelected = selectedSeatId === 'judge_bench_center';
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedSeatId('judge_bench_center')}
                        className={`col-span-8 p-3 rounded-xl border-2 text-left transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-amber-500/25 border-amber-400 shadow-xl ring-2 ring-amber-400/40'
                            : 'bg-slate-950/80 border-amber-500/30 hover:border-amber-400/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1">
                            <span>⚖️</span>
                            <span>{s?.role.toUpperCase()} (BENCH)</span>
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${s?.attendanceStatus === 'present' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                            {s?.attendanceStatus}
                          </span>
                        </div>
                        <p className="text-xs font-black text-white truncate">{s?.name || activeJudgeName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s?.organization || 'Presiding Judicial Bench'}</p>
                      </button>
                    );
                  })()}

                  {/* Registrar Desk (Right of Bench) */}
                  {(() => {
                    const s = getSeatData('registrar_desk');
                    const isSelected = selectedSeatId === 'registrar_desk';
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedSeatId('registrar_desk')}
                        className={`col-span-4 p-3 rounded-xl border-2 text-left transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-cyan-500/25 border-cyan-400 shadow-xl ring-2 ring-cyan-400/40'
                            : 'bg-slate-950/80 border-cyan-500/30 hover:border-cyan-400/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1">
                            <span>📜</span>
                            <span>CLERK</span>
                          </span>
                        </div>
                        <p className="text-xs font-black text-white truncate">{s?.name || 'Clerk'}</p>
                        <p className="text-[10px] text-slate-400 truncate">Waajjira Galmee</p>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* SECTION 2: WELL OF THE COURT - WITNESS STAND (CENTER) */}
              <div className="py-2 flex items-center justify-center">
                {(() => {
                  const s = getSeatData('witness_stand');
                  const isSelected = selectedSeatId === 'witness_stand';
                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedSeatId('witness_stand')}
                      className={`max-w-md w-full p-3 rounded-2xl border-2 text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-emerald-500/25 border-emerald-400 shadow-xl ring-2 ring-emerald-400/40 scale-105'
                          : 'bg-slate-900 border-emerald-500/30 hover:border-emerald-400/80'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-base">🎙️</span>
                        <span className="text-[11px] font-mono font-black text-emerald-400 uppercase tracking-wider">
                          DAABBOO RAGAA (WITNESS STAND / KAKUU SEERAA)
                        </span>
                      </div>
                      <p className="text-xs font-black text-white">{s?.name || 'Obbo Gurmeessaa Baqqalaa'}</p>
                      <p className="text-[10px] text-slate-400">{s?.notes || 'Under Sworn Oath (SDFHH Kwt 258)'}</p>
                    </button>
                  );
                })()}
              </div>

              {/* SECTION 3: COUNSEL & LITIGANT TABLES (PROSECUTOR / PLAINTIFF VS DEFENDANT) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left Table: Public Prosecutor or Plaintiff Table */}
                <div className="space-y-3">
                  {/* Public Prosecutor Table */}
                  {(() => {
                    const s = getSeatData('prosecutor_table');
                    const isSelected = selectedSeatId === 'prosecutor_table';
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedSeatId('prosecutor_table')}
                        className={`w-full p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/25 border-rose-400 shadow-xl ring-2 ring-rose-400/40'
                            : 'bg-slate-900 border-rose-500/30 hover:border-rose-400/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1">
                            <span>🛡️</span>
                            <span>ABBAA ALANGAA (PROSECUTOR)</span>
                          </span>
                          <span className="text-[9px] font-bold text-rose-300 bg-rose-500/20 px-1.5 rounded">
                            {s?.attendanceStatus}
                          </span>
                        </div>
                        <p className="text-xs font-black text-white truncate">{s?.name || 'Obbo Kabbadaa'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s?.organization || 'Waajjira Abbaa Alangaa'}</p>
                      </button>
                    );
                  })()}

                  {/* Plaintiff Litigant & Counsel Table */}
                  {(() => {
                    const s = getSeatData('plaintiff_table');
                    const isSelected = selectedSeatId === 'plaintiff_table';
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedSeatId('plaintiff_table')}
                        className={`w-full p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/25 border-blue-400 shadow-xl ring-2 ring-blue-400/40'
                            : 'bg-slate-900 border-blue-500/30 hover:border-blue-400/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-blue-400 flex items-center gap-1">
                            <span>💼</span>
                            <span>HIMATAA (PLAINTIFF)</span>
                          </span>
                          <span className="text-[9px] font-bold text-blue-300 bg-blue-500/20 px-1.5 rounded">
                            {s?.attendanceStatus}
                          </span>
                        </div>
                        <p className="text-xs font-black text-white truncate">{s?.name || claimantName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s?.notes || 'Himataa & Abukaattoo'}</p>
                      </button>
                    );
                  })()}
                </div>

                {/* Right Table: Defendant & Counsel Table */}
                <div className="space-y-3">
                  {/* Defendant Table */}
                  {(() => {
                    const s = getSeatData('defendant_table');
                    const isSelected = selectedSeatId === 'defendant_table';
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedSeatId('defendant_table')}
                        className={`w-full p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/25 border-purple-400 shadow-xl ring-2 ring-purple-400/40'
                            : 'bg-slate-900 border-purple-500/30 hover:border-purple-400/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-purple-400 flex items-center gap-1">
                            <span>👤</span>
                            <span>HIMATAMAA (DEFENDANT)</span>
                          </span>
                          <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 rounded">
                            {s?.attendanceStatus}
                          </span>
                        </div>
                        <p className="text-xs font-black text-white truncate">{s?.name || respondentName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s?.notes || 'Himatamaa & Abukaattoo'}</p>
                      </button>
                    );
                  })()}

                  {/* Security Escort / Police Marshal */}
                  {(() => {
                    const s = getSeatData('police_escort');
                    const isSelected = selectedSeatId === 'police_escort';
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedSeatId('police_escort')}
                        className={`w-full p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-700 border-amber-400 shadow-xl ring-2 ring-amber-400/40'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-slate-300 flex items-center gap-1">
                            <span>👮</span>
                            <span>POOLISII DHADDACHAA (SECURITY)</span>
                          </span>
                        </div>
                        <p className="text-xs font-black text-white truncate">{s?.name || 'Saajin Alamu'}</p>
                        <p className="text-[10px] text-slate-400 truncate">Courtroom Security Marshal</p>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* SECTION 4: BAR RAIL & PUBLIC GALLERY */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>BARRIER RAIL (DAANGAA DHADDACHAA)</span>
                <span>PUBLIC GALLERY (TEESSUMA UUMMATAA)</span>
              </div>
            </div>

            {/* 📝 SEAT INSPECTOR & ASSIGNMENT EDITOR (Right Column) */}
            <div className="lg:col-span-5 bg-slate-950/80 rounded-3xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Qindeessaa Teessumaa</h4>
                    <p className="text-[11px] text-slate-400 font-mono">Seat ID: {selectedSeat?.seatId}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {selectedSeat?.role.toUpperCase()}
                </span>
              </div>

              {selectedSeat ? (
                <div className="space-y-3.5">
                  {/* Attendee Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Maqaa Guutuu (Full Name) *</label>
                    <input
                      type="text"
                      value={selectedSeat.name}
                      onChange={(e) => handleUpdateSeat('name', e.target.value)}
                      placeholder="Maqaa nama teessuma kana qabatuu..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Gahee Seeraa (Courtroom Role)</label>
                    <select
                      value={selectedSeat.role}
                      onChange={(e) => handleUpdateSeat('role', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="judge">Abbaa Seeraa (Judge / Bench)</option>
                      <option value="prosecutor">Abbaa Alangaa (Prosecutor)</option>
                      <option value="plaintiff">Himataa (Plaintiff / Claimant)</option>
                      <option value="defendant">Himatamaa (Defendant / Respondent)</option>
                      <option value="witness">Ragaa (Witness / Deponent)</option>
                      <option value="registrar">Qindeessaa Dhaddachaa (Court Clerk)</option>
                      <option value="advocate">Abukaattoo Seeraa (Defense Advocate)</option>
                      <option value="escort">Poolisii / Eegduu (Security Marshal)</option>
                      <option value="observer">Taajjabdoota (Observer / Public)</option>
                    </select>
                  </div>

                  {/* Attendance Status */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Haala Argamaa (Attendance Status)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'present', label: 'Argama (Present)', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
                        { id: 'absent', label: 'Hafiinsa (Absent)', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
                        { id: 'represented', label: 'Bakka Bu\'iinsa (Represented)', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
                        { id: 'excused', label: 'Hayyamame (Excused)', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' }
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleUpdateSeat('attendanceStatus', st.id)}
                          className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            selectedSeat.attendanceStatus === st.id
                              ? st.color + ' ring-1 ring-current font-black'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Organization / Office */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Dhaabbata / Kutaa Hojii (Organization / Chamber)</label>
                    <input
                      type="text"
                      value={selectedSeat.organization || ''}
                      onChange={(e) => handleUpdateSeat('organization', e.target.value)}
                      placeholder="Fkn: Mana Murtii Aanaa, Waajjira Daldalaa..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Notes / Submissions */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Yaada / Qaboo Teessumaa (Procedural Notes)</label>
                    <textarea
                      rows={2}
                      value={selectedSeat.notes || ''}
                      onChange={(e) => handleUpdateSeat('notes', e.target.value)}
                      placeholder="Fkn: Kakuu seeraa fudhateera, waraqaa eenyummaa mirkaneesseera..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-8">Teessuma tokko filachuun qindeessaa.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Presiding Judicial Chamber Isolation • Signed Audit Log</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Dhiisi (Cancel)
            </button>

            <button
              type="button"
              onClick={handleSaveLayout}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
            >
              {isSaving ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Galmeessaa jira...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Teessuma Dhaddachaa Kuusi (Save Layout)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};
