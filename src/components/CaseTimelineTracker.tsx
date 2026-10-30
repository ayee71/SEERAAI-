import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Filter, 
  FileText, 
  Scale, 
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  CalendarCheck,
  CalendarX,
  Timer
} from 'lucide-react';
import { Language } from '../i18n/translations';

export type MilestoneStage = 
  | 'date_filed' 
  | 'pleading_response' 
  | 'evidence_deadline' 
  | 'preliminary_ruling' 
  | 'witness_hearing' 
  | 'next_hearing' 
  | 'judgment' 
  | 'custom';

export interface CaseMilestone {
  id: string;
  stage: MilestoneStage;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  courtRoom?: string;
  notes?: string;
  isCompleted?: boolean;
}

export interface CaseFileTimeline {
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  courtName: string;
  bench: string;
  milestones: CaseMilestone[];
}

const STORAGE_KEY = 'seera_case_timelines_data_v1';

const DEFAULT_CASES: CaseFileTimeline[] = [
  {
    caseId: 'case_01',
    caseNumber: 'Galmee Lakk. 249062/2016',
    caseTitle: 'Falmii Lafa Magaalaa fi Mormii Murtee (Land & 3rd Party Opposition)',
    courtName: 'Mana Murtii Olaanaa Federaalaa / Oromiyaa',
    bench: 'Dhaddacha Dhimma Hariiroo Hawaasaa (Civil Division)',
    milestones: [
      {
        id: 'm1',
        stage: 'date_filed',
        title: 'Iyyata Himannaa Galmeessuu (Date Filed)',
        date: '2026-09-01',
        courtRoom: 'Galmee Qajeelchaa 01',
        notes: 'Iyyanni himataa SDFHH Kwt 80 bu\'uura godhachuun dhiyaate.',
        isCompleted: true,
      },
      {
        id: 'm2',
        stage: 'evidence_deadline',
        title: 'Ragaa Dhiyeessuu (Evidence Submission Deadline)',
        date: '2026-09-25',
        courtRoom: 'Kutaa Ragaalee',
        notes: 'Sanadoota ragaa lafaa fi waraqaa ragaa abbaa qabeenyummaa dhiyeessuu.',
        isCompleted: true,
      },
      {
        id: 'm3',
        stage: 'preliminary_ruling',
        title: 'Murtii Mormii Duraa (Preliminary Ruling on Jurisdiction)',
        date: '2026-10-05',
        courtRoom: 'Dhaddacha 3ffaa',
        notes: 'Mormii aangoo mana murtii (SDFHH Kwt 244) irratti murtii kennuuf.',
        isCompleted: false, // In the past -> missed/overdue!
      },
      {
        id: 'm4',
        stage: 'next_hearing',
        title: 'Dhaddacha Itti Aanu (Next Hearing - Framing of Issues)',
        date: '2026-10-15',
        time: '09:00 AM',
        courtRoom: 'Dhaddacha 3ffaa',
        notes: 'Qabxii falmii qindeessuu (Issue Framing - SDFHH Kwt 246/247).',
        isCompleted: false, // Near future -> upcoming!
      },
      {
        id: 'm5',
        stage: 'witness_hearing',
        title: 'Dhaddacha Dhageettii Ragaa (Witness Hearing)',
        date: '2026-10-28',
        time: '10:30 AM',
        courtRoom: 'Dhaddacha 3ffaa',
        notes: 'Ragaalee namaa sadii (3) dhiyeessanii dhaggeeffachiisuu.',
        isCompleted: false,
      },
      {
        id: 'm6',
        stage: 'judgment',
        title: 'Murtii Dhumaa Kennuu (Final Judgment / Ruling)',
        date: '2026-11-20',
        time: '02:00 PM',
        courtRoom: 'Dhaddacha 3ffaa',
        notes: 'Murtii dhumaa galmee labsachuu.',
        isCompleted: false,
      },
    ],
  },
  {
    caseId: 'case_02',
    caseNumber: 'Galmee Lakk. 11840/2017',
    caseTitle: 'Falmii Hojjetaa fi Hojjechiisaa (Labor Severance Dispute)',
    courtName: 'Mana Murtii Sadarkaa Jalqabaa',
    bench: 'Dhaddacha Hojii fi Hawaasummaa (Labor Bench)',
    milestones: [
      {
        id: 'm20',
        stage: 'date_filed',
        title: 'Himanni Hojii Dhiyaate (Date Filed)',
        date: '2026-09-15',
        courtRoom: 'Galmee 04',
        notes: 'Labsii 1156/2019 bu\'uureffachuun himannaa kaffaltii gaggeessaa dhiyaate.',
        isCompleted: true,
      },
      {
        id: 'm21',
        stage: 'pleading_response',
        title: 'Deebiin Dhiyaatu (Statement of Defence Due)',
        date: '2026-10-02',
        courtRoom: 'Dhaddacha 2ffaa',
        notes: 'Dhaabbatni hojjechiisaa deebii barreeffamaa akka dhiyeessu.',
        isCompleted: false, // Missed!
      },
      {
        id: 'm22',
        stage: 'next_hearing',
        title: 'Dhaddacha Itti Aanu (Next Oral Hearing)',
        date: '2026-10-14',
        time: '09:30 AM',
        courtRoom: 'Dhaddacha 2ffaa',
        notes: 'Falmii afaaniif beellama qabame.',
        isCompleted: false, // Upcoming!
      },
    ],
  },
];

interface CaseTimelineTrackerProps {
  currentLang: Language;
}

export const CaseTimelineTracker: React.FC<CaseTimelineTrackerProps> = ({ currentLang }) => {
  // Load saved cases or defaults
  const [cases, setCases] = useState<CaseFileTimeline[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved case timelines', e);
    }
    return DEFAULT_CASES;
  });

  const [activeCaseId, setActiveCaseId] = useState<string>(cases[0]?.caseId || 'case_01');
  const [filterMode, setFilterMode] = useState<'all' | 'upcoming' | 'missed' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Form State
  const [formStage, setFormStage] = useState<MilestoneStage>('next_hearing');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formCourtRoom, setFormCourtRoom] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
    } catch (e) {
      console.warn('Could not persist case timelines', e);
    }
  }, [cases]);

  // Active case
  const activeCase = useMemo(() => {
    return cases.find(c => c.caseId === activeCaseId) || cases[0];
  }, [cases, activeCaseId]);

  // Today reference (normalized to YYYY-MM-DD string)
  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, []);

  // Helper to categorize milestone deadline
  const getDeadlineStatus = (m: CaseMilestone): { status: 'completed' | 'missed' | 'upcoming'; diffDays: number } => {
    if (m.isCompleted) {
      return { status: 'completed', diffDays: 0 };
    }
    const today = new Date(todayStr);
    const mDate = new Date(m.date);
    const diffTime = mDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'missed', diffDays };
    }
    return { status: 'upcoming', diffDays };
  };

  // Sorted milestones chronologically
  const sortedMilestones = useMemo(() => {
    if (!activeCase) return [];
    return [...activeCase.milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [activeCase]);

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    return sortedMilestones.filter(m => {
      const { status } = getDeadlineStatus(m);
      if (filterMode === 'all') return true;
      return status === filterMode;
    });
  }, [sortedMilestones, filterMode]);

  // Counts
  const counts = useMemo(() => {
    let upcoming = 0;
    let missed = 0;
    let completed = 0;
    sortedMilestones.forEach(m => {
      const { status } = getDeadlineStatus(m);
      if (status === 'upcoming') upcoming++;
      else if (status === 'missed') missed++;
      else if (status === 'completed') completed++;
    });
    return { upcoming, missed, completed, total: sortedMilestones.length };
  }, [sortedMilestones]);

  // Toggle milestone completion
  const handleToggleComplete = (id: string) => {
    setCases(prev => prev.map(c => {
      if (c.caseId !== activeCaseId) return c;
      return {
        ...c,
        milestones: c.milestones.map(m => {
          if (m.id === id) {
            return { ...m, isCompleted: !m.isCompleted };
          }
          return m;
        }),
      };
    }));
  };

  // Delete milestone
  const handleDeleteMilestone = (id: string) => {
    setCases(prev => prev.map(c => {
      if (c.caseId !== activeCaseId) return c;
      return {
        ...c,
        milestones: c.milestones.filter(m => m.id !== id),
      };
    }));
  };

  // Open Add modal with preset
  const openAddWithPreset = (stage: MilestoneStage, defaultTitleOm: string, defaultTitleAm: string, defaultTitleEn: string) => {
    setEditingMilestoneId(null);
    setFormStage(stage);
    setFormTitle(
      currentLang === 'om' ? defaultTitleOm : currentLang === 'am' ? defaultTitleAm : defaultTitleEn
    );
    // default date to today or 7 days ahead
    const d = new Date();
    if (stage === 'evidence_deadline') d.setDate(d.getDate() + 7);
    else if (stage === 'next_hearing') d.setDate(d.getDate() + 14);
    else if (stage === 'witness_hearing') d.setDate(d.getDate() + 21);
    else if (stage === 'judgment') d.setDate(d.getDate() + 30);
    setFormDate(d.toISOString().split('T')[0]);
    setFormTime('09:00 AM');
    setFormCourtRoom('Dhaddacha 1ffaa');
    setFormNotes('');
    setShowAddModal(true);
  };

  // Open Edit modal
  const openEditMilestone = (m: CaseMilestone) => {
    setEditingMilestoneId(m.id);
    setFormStage(m.stage);
    setFormTitle(m.title);
    setFormDate(m.date);
    setFormTime(m.time || '');
    setFormCourtRoom(m.courtRoom || '');
    setFormNotes(m.notes || '');
    setShowAddModal(true);
  };

  // Save modal milestone
  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    if (editingMilestoneId) {
      setCases(prev => prev.map(c => {
        if (c.caseId !== activeCaseId) return c;
        return {
          ...c,
          milestones: c.milestones.map(m => {
            if (m.id === editingMilestoneId) {
              return {
                ...m,
                stage: formStage,
                title: formTitle.trim(),
                date: formDate,
                time: formTime.trim() || undefined,
                courtRoom: formCourtRoom.trim() || undefined,
                notes: formNotes.trim() || undefined,
              };
            }
            return m;
          }),
        };
      }));
    } else {
      const newMilestone: CaseMilestone = {
        id: 'm_' + Date.now(),
        stage: formStage,
        title: formTitle.trim(),
        date: formDate,
        time: formTime.trim() || undefined,
        courtRoom: formCourtRoom.trim() || undefined,
        notes: formNotes.trim() || undefined,
        isCompleted: false,
      };

      setCases(prev => prev.map(c => {
        if (c.caseId !== activeCaseId) return c;
        return {
          ...c,
          milestones: [...c.milestones, newMilestone],
        };
      }));
    }

    setShowAddModal(false);
  };

  // Copy timeline docket summary
  const handleCopyTimelineSummary = () => {
    if (!activeCase) return;
    const lines = [
      `🏛️ CASE DOCKET TIMELINE: ${activeCase.caseNumber}`,
      `📌 Title: ${activeCase.caseTitle}`,
      `⚖️ Court: ${activeCase.courtName} | ${activeCase.bench}`,
      `----------------------------------------`,
      ...sortedMilestones.map(m => {
        const { status, diffDays } = getDeadlineStatus(m);
        const tag = status === 'completed' 
          ? '[COMPLETED]' 
          : status === 'missed' 
          ? `[OVERDUE by ${Math.abs(diffDays)}d ⚠️]` 
          : `[UPCOMING in ${diffDays}d ⏰]`;
        return `${m.date} ${m.time ? `@ ${m.time} ` : ''}| ${tag} ${m.title} (${m.courtRoom || 'Main Bench'})`;
      }),
      `----------------------------------------`,
      `Generated via Seera AI Court Bench Timeline Tracker`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden text-left">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>
                  {currentLang === 'om' ? 'Tooftaa Hordoffii Yeroo Galmee' : currentLang === 'am' ? 'የጉዳይ የጊዜ ሰሌዳ መከታተያ' : 'Case Timeline Tracker'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono border border-slate-700">
                  {activeCase?.caseNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentLang === 'om'
                  ? 'Beellamoota, ragaa dhiyeessuu, fi murtiiwwan galmee yeroon hordofaa; beellamoonni dhiyaatan keelloon (amber), kanneen darban diimaan (red) calaqqisu.'
                  : currentLang === 'am'
                  ? 'የክርክር ቀናት፣ የማስረጃ ማቅረቢያና የፍርድ ጊዜዎችን በቅደም ተከተል ይከታተሉ፤ የሚመጡ ቀነ-ገደቦች በቢጫ (amber) እና ያለፉት በቀይ (red) ጎልተው ይታያሉ።'
                  : 'Track key case dates on a horizontal timeline with automated deadline detection: upcoming in amber, missed in red.'}
              </p>
            </div>
          </div>
        </div>

        {/* Case Switcher & Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={activeCaseId}
            onChange={(e) => setActiveCaseId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          >
            {cases.map(c => (
              <option key={c.caseId} value={c.caseId}>
                {c.caseNumber} - {c.caseTitle.slice(0, 32)}...
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleCopyTimelineSummary}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Copy timeline summary"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedSummary ? (currentLang === 'om' ? 'Waraabame!' : 'ኮፒ ተደርጓል!') : (currentLang === 'om' ? 'Waraabi' : 'ኮፒ')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingMilestoneId(null);
              setFormStage('next_hearing');
              setFormTitle('');
              setFormDate(todayStr);
              setFormTime('09:00 AM');
              setFormCourtRoom('Dhaddacha 1ffaa');
              setFormNotes('');
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{currentLang === 'om' ? 'Guyyaa Haaraa Galchi' : currentLang === 'am' ? 'አዲስ ቀን አስገባ' : 'Add Milestone'}</span>
          </button>
        </div>
      </div>

      {/* Case Details Badge Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Dhimma Falmii (Case Matter)</span>
          <span className="font-semibold text-slate-200">{activeCase?.caseTitle}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Mana Murtii (Court)</span>
          <span className="text-slate-300">{activeCase?.courtName}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Dhaddacha (Bench)</span>
          <span className="text-amber-400 font-medium">{activeCase?.bench}</span>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
          {currentLang === 'om' ? 'Milestones Ijoo Galchi (Filed, In Review, Judgment Pending):' : currentLang === 'am' ? 'ዋና ዋና ደረጃዎችን በፍጥነት አስገባ (Filed, In Review, Judgment Pending)፦' : 'Quick Set Milestones (Filed, In Review, Judgment Pending):'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openAddWithPreset('date_filed', 'Filed (Galmee Galmeeffame)', 'Filed (ክስ የቀረበበት)', 'Filed (Case Filed)')}
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-blue-400" />
            <span>📁 Filed</span>
          </button>

          <button
            type="button"
            onClick={() => openAddWithPreset('evidence_deadline', 'In Review (Xiinxala Irra Jiru / Evidence Due)', 'In Review (በግምገማ ላይ)', 'In Review (Under Review / Evidence)')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>⏳ In Review</span>
          </button>

          <button
            type="button"
            onClick={() => openAddWithPreset('judgment', 'Judgment Pending (Murtii Eegamaa Jiru)', 'Judgment Pending (ፍርድ እየጠበቀ)', 'Judgment Pending (Verdict Due)')}
            className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarCheck className="w-3 h-3 text-purple-400" />
            <span>⚖️ Judgment Pending</span>
          </button>

          <button
            type="button"
            onClick={() => openAddWithPreset('next_hearing', 'Dhaddacha Itti Aanu (Next Hearing)', 'ቀጣይ የችሎት ቀን', 'Next Hearing')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>Next Hearing</span>
          </button>
        </div>
      </div>

      {/* Filter Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterMode === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentLang === 'om' ? 'Hundumaa' : currentLang === 'am' ? 'ሁሉም' : 'All'} ({counts.total})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('upcoming')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'upcoming' 
                ? 'bg-amber-500 text-slate-950 shadow-sm' 
                : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{currentLang === 'om' ? 'Kanneen Dhiyaatan (Amber)' : currentLang === 'am' ? 'የሚመጡ (ቢጫ)' : 'Upcoming'} ({counts.upcoming})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('missed')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'missed' 
                ? 'bg-rose-500 text-white shadow-sm' 
                : 'text-rose-400 hover:bg-rose-950/40'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>{currentLang === 'om' ? 'Kanneen Darban (Red)' : currentLang === 'am' ? 'ያለፉ (ቀይ)' : 'Missed'} ({counts.missed})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'completed' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-emerald-400 hover:bg-emerald-950/40'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{currentLang === 'om' ? 'Raawwatan' : currentLang === 'am' ? 'የተጠናቀቁ' : 'Completed'} ({counts.completed})</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Amber = Upcoming</span>
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Red = Missed / Overdue</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Green = Completed</span>
          </span>
        </div>
      </div>

      {/* =========================================================================
          HORIZONTAL TIMELINE VISUALIZATION
          ========================================================================= */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3">
          <span className="font-mono uppercase font-bold text-slate-300 flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-amber-400" />
            <span>{currentLang === 'om' ? 'Sarara Yeroo Dalgee (Horizontal Timeline Track)' : currentLang === 'am' ? 'አግድም የጊዜ መስመር' : 'Horizontal Timeline Track'}</span>
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            ← {currentLang === 'om' ? 'Gara mirgaa fi bitaatti as harkisaa' : 'Scroll horizontally to view milestones'} →
          </span>
        </div>

        {filteredMilestones.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            {currentLang === 'om' 
              ? 'Beellamni akkaataa filannootti hin argamne.' 
              : 'በተመረጠው ማጣሪያ መሰረት የተገኘ ቀን የለም።'}
          </div>
        ) : (
          <div className="relative overflow-x-auto pb-6 pt-4 scrollbar-thin scrollbar-thumb-slate-800">
            {/* The Horizontal Line Connector */}
            <div className="absolute top-[48px] left-6 right-6 h-1.5 bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 rounded-full opacity-40"></div>

            <div className="flex items-start gap-8 min-w-max px-6">
              {filteredMilestones.map((m, index) => {
                const { status, diffDays } = getDeadlineStatus(m);
                const isMissed = status === 'missed';
                const isUpcoming = status === 'upcoming';
                const isCompleted = status === 'completed';

                return (
                  <div key={m.id} className="relative flex flex-col items-center group w-64">
                    {/* Node Pin / Badge */}
                    <div className="relative z-10 mb-4">
                      {isMissed && (
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50 animate-pulse">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                      )}

                      {isUpcoming && (
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-950/50 ring-4 ring-amber-500/20">
                          <Clock className="w-6 h-6" />
                        </div>
                      )}

                      {isCompleted && (
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      )}

                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300 flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                    </div>

                    {/* Milestone Card */}
                    <div className={`w-full rounded-2xl p-4 border transition-all text-left flex flex-col justify-between space-y-3 ${
                      isMissed 
                        ? 'bg-rose-950/30 border-rose-500/50 hover:border-rose-400 shadow-lg shadow-rose-950/20' 
                        : isUpcoming 
                        ? 'bg-amber-950/30 border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-950/20' 
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="space-y-1.5">
                        {/* Status Chip */}
                        <div className="flex items-center justify-between gap-1">
                          {isMissed && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold text-[10px] uppercase flex items-center gap-1 shadow-sm">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>MISSED / DARBEE JIRA</span>
                            </span>
                          )}

                          {isUpcoming && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-bold text-[10px] uppercase flex items-center gap-1 shadow-sm">
                              <Clock className="w-2.5 h-2.5" />
                              <span>UPCOMING / DHIYAATEERA</span>
                            </span>
                          )}

                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 font-mono font-bold text-[10px] uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>COMPLETED</span>
                            </span>
                          )}

                          {/* Countdown badge */}
                          {!isCompleted && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isMissed 
                                ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {isMissed 
                                ? `-${Math.abs(diffDays)}d` 
                                : diffDays === 0 
                                ? "Today!" 
                                : `+${diffDays}d`}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                          {m.title}
                        </h4>

                        {/* Date & Time */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{m.date}</span>
                          {m.time && <span>• {m.time}</span>}
                        </div>

                        {/* Court room */}
                        {m.courtRoom && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Scale className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{m.courtRoom}</span>
                          </div>
                        )}

                        {/* Notes */}
                        {m.notes && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 italic pt-1 border-t border-slate-800/60">
                            "{m.notes}"
                          </p>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(m.id)}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                            m.isCompleted 
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                              : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{m.isCompleted ? (currentLang === 'om' ? 'Bani' : 'ይክፈቱ') : (currentLang === 'om' ? 'Xumuri' : 'አጠናቅቅ')}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditMilestone(m)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Edit Milestone"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="p-1 rounded hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete Milestone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>
                  {editingMilestoneId 
                    ? (currentLang === 'om' ? 'Beellama Gulaali' : 'ቀኑን አርትዕ') 
                    : (currentLang === 'om' ? 'Guyyaa Galmee Haaraa Galchi' : 'አዲስ የጉዳይ ቀን አስገባ')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMilestone} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {currentLang === 'om' ? 'Gosa Beellamaa / Sadarkaa' : 'የደረጃ ዓይነት'} *
                </label>
                <select
                  value={formStage}
                  onChange={(e) => setFormStage(e.target.value as MilestoneStage)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="next_hearing">Dhaddacha Itti Aanu (Next Hearing)</option>
                  <option value="evidence_deadline">Ragaa Dhiyeessuu (Evidence Submission Deadline)</option>
                  <option value="date_filed">Guyyaa Himanni Dhiyaate (Date Filed)</option>
                  <option value="pleading_response">Deebiin Dhiyaatu (Pleading Statement of Defence Due)</option>
                  <option value="preliminary_ruling">Murtii Mormii Duraa (Preliminary Objection Ruling)</option>
                  <option value="witness_hearing">Dhaddacha Dhageettii Ragaa (Witness Hearing)</option>
                  <option value="judgment">Guyyaa Murtii Dhumaa (Final Judgment / Ruling)</option>
                  <option value="custom">Guyyaa Biroo (Custom Milestone)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {currentLang === 'om' ? 'Mata Duree Beellamaa' : 'የቀኑ ርዕስ / መግለጫ'} *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="fkn: Dhaddacha Dhageettii Ragaa Abbaa Qabeenyummaa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {currentLang === 'om' ? 'Guyyaa (Date)' : 'ቀን'} *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {currentLang === 'om' ? 'Sa\'aatii (Time)' : 'ሰዓት'}
                  </label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="09:30 AM"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {currentLang === 'om' ? 'Dhaddacha / Kutaa (Courtroom)' : 'የችሎት ክፍል'}
                </label>
                <input
                  type="text"
                  value={formCourtRoom}
                  onChange={(e) => setFormCourtRoom(e.target.value)}
                  placeholder="fkn: Dhaddacha 3ffaa, Fuula 2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {currentLang === 'om' ? 'Yaada Dabalataa (Legal Notes)' : 'ተጨማሪ ማስታወሻ'}
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Iyyata SDFHH Kwt 246 bu'uuraan dhiyaatu..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
                >
                  {currentLang === 'om' ? 'Dhiisi' : 'ሰርዝ'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-950/40"
                >
                  {editingMilestoneId 
                    ? (currentLang === 'om' ? 'Haaromsi' : 'አድስ') 
                    : (currentLang === 'om' ? 'Galchi' : 'አስቀምጥ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
