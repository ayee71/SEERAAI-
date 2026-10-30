import React, { useState } from 'react';
import { Language } from '../i18n/translations';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Download, 
  Bell, 
  FileText, 
  Landmark, 
  User, 
  Check, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateCaseAttendanceRecord } from '../services/courtCaseService';

import { 
  CourtHearingEvent, 
  getStoredHearingEvents, 
  saveHearingEvent, 
  updateHearingStatus, 
  deleteHearingEvent 
} from '../services/courtSchedulingService';
import { downloadIcsFile } from '../services/calendarService';

interface CourtSchedulingManagerProps {
  currentLang: Language;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

export const CourtSchedulingManager: React.FC<CourtSchedulingManagerProps> = ({ currentLang }) => {
  const { user } = useAuth();
  const [hearings, setHearings] = useState<CourtHearingEvent[]>(getStoredHearingEvents());
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calendar View State: Month, Week, Day, List
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedHearing, setSelectedHearing] = useState<CourtHearingEvent | null>(null);

  // New Hearing Form State
  const [caseNumber, setCaseNumber] = useState('OR/CC/');
  const [caseTitle, setCaseTitle] = useState('');
  const [hearingDate, setHearingDate] = useState(new Date().toISOString().split('T')[0]);
  const [hearingTime, setHearingTime] = useState('09:00');
  const [courtName, setCourtName] = useState('Mana Murtii Waliigalaa Oromiyaa');
  const [bench, setBench] = useState('Dhaddacha Hariiroo Hawaasaa');
  const [judgeName, setJudgeName] = useState('');
  const [hearingType, setHearingType] = useState<CourtHearingEvent['hearingType']>('First Hearing');
  const [litigants, setLitigants] = useState('');
  const [notes, setNotes] = useState('');
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateHearing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseNumber.trim() || !caseTitle.trim()) return;

    saveHearingEvent({
      caseNumber,
      caseTitle,
      hearingDate,
      hearingTime,
      courtName,
      bench,
      judgeName: judgeName || 'Abbaa Seeraa Beellamame',
      hearingType,
      status: 'Scheduled',
      litigants: litigants || 'Himatamaa fi Himataa',
      reminderSent: false,
      notes,
      allowSelfRegistration
    });

    setHearings(getStoredHearingEvents());
    setShowAddModal(false);
    showToast(currentLang === 'om' ? 'Beellamni galmeeffamee jira!' : 'Hearing scheduled successfully!');
    
    // Reset form
    setCaseNumber('OR/CC/');
    setCaseTitle('');
    setLitigants('');
    setNotes('');
  };

  const handleSendReminder = (h: CourtHearingEvent) => {
    updateHearingStatus(h.id, h.status, true);
    setHearings(getStoredHearingEvents());
    showToast(
      currentLang === 'om' 
        ? `SMS & Email yaadachiisaa ${h.caseNumber}f ergamera!` 
        : `Automated SMS & Email reminder dispatched for ${h.caseNumber}!`
    );
  };

  const handleExportIcs = (h: CourtHearingEvent) => {
    downloadIcsFile({
      title: `Beellama Murtii: ${h.caseNumber} - ${h.caseTitle}`,
      description: `Dhaddacha: ${h.bench} (${h.courtName}). Gahee: ${h.hearingType}. Abbaa Seeraa: ${h.judgeName}. ${h.notes || ''}`,
      location: `${h.courtName}, ${h.bench}`,
      startTime: `${h.hearingDate}T${h.hearingTime}:00`,
      endTime: `${h.hearingDate}T${parseInt(h.hearingTime.split(':')[0]) + 1}:${h.hearingTime.split(':')[1]}:00`
    });
    showToast(currentLang === 'om' ? 'Fayiliin Kalendaraa (.ics) buufameera!' : 'Calendar (.ics) downloaded!');
  };

  const handleDelete = (id: string) => {
    if (window.confirm(currentLang === 'om' ? 'Beellama kana haquu feeta?' : 'Delete this hearing event?')) {
      deleteHearingEvent(id);
      setHearings(getStoredHearingEvents());
      showToast(currentLang === 'om' ? 'Beellamni haqameera.' : 'Hearing event deleted.');
    }
  };

  // Calendar Navigation Helpers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered hearings
  const filteredHearings = hearings.filter(h => {
    if (filterStatus === 'All') return true;
    return h.status === filterStatus;
  });

  // Calendar Month Matrix Generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthWeeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    currentWeek.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      monthWeeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    monthWeeks.push(currentWeek);
  }

  // Week Days Generation (Sunday to Saturday)
  const getStartOfWeek = (d: Date) => {
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay());
    return start;
  };

  const weekStart = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    return day;
  });

  const formatDateYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const currentDayYMD = formatDateYMD(currentDate);

  const getHearingsForDate = (ymdString: string) => {
    return filteredHearings.filter(h => h.hearingDate === ymdString);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider mb-1">
            <CalendarIcon className="w-4 h-4" />
            <span>{currentLang === 'om' ? 'Qindeessaa Beellama & Kalendara' : 'Court Scheduling & Calendar Visualization'}</span>
          </div>
          <h2 className="text-xl font-bold text-white font-serif-legal">
            {currentLang === 'om' ? 'Kalandara Beellama Mana Murtii & Yaadachiisa' : 'Court Hearing Calendar & Visual Scheduler'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {currentLang === 'om' 
              ? 'Beellamoota ji\'aan, torbeedhaan fi guyyaadhaan calali; yaadachiisa SMS/Email abbootii dhimmaaf ergi.'
              : 'Visualize upcoming legal appointments & hearings by month, week, and day with automated reminder dispatch.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{currentLang === 'om' ? 'Beellama Haaraa Qabadhu' : 'Schedule New Hearing'}</span>
          </button>
        </div>
      </div>

      {/* Calendar Controls & View Toggle Bar (Month / Week / Day / List) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-md">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            {currentLang === 'om' ? 'Har\'a (Today)' : 'ዛሬ'}
          </button>
          <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm font-bold text-white font-mono px-2">
            {currentDate.toLocaleDateString(currentLang === 'om' ? 'en-US' : 'en-US', {
              month: 'long',
              year: 'numeric',
              ...(viewMode === 'day' ? { day: 'numeric' } : {})
            })}
          </span>
        </div>

        {/* View Mode Switcher: Month, Week, Day, List */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'month' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {currentLang === 'om' ? 'Ji\'a (Month)' : 'ወር (Month)'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'week' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {currentLang === 'om' ? 'Torbee (Week)' : 'ሳምንት (Week)'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'day' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {currentLang === 'om' ? 'Guyyaa (Day)' : 'ቀን (Day)'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'list' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {currentLang === 'om' ? 'Tarree (List)' : 'ዝርዝር (List)'}
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Notified">Notified</option>
            <option value="Completed">Completed</option>
            <option value="Postponed">Postponed</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: MONTH CALENDAR GRID
          ========================================================================= */}
      {viewMode === 'month' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-3">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[11px] font-bold text-amber-400/90 pb-2 border-b border-slate-800">
            {['Dil / Sun', 'Wix / Mon', 'Kib / Tue', 'Roob / Wed', 'Kam / Thu', 'Jim / Fri', 'San / Sat'].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1.5">
            {monthWeeks.flat().map((dayNum, idx) => {
              if (dayNum === null) {
                return (
                  <div key={idx} className="min-h-[105px] rounded-2xl bg-slate-950/30 border border-slate-800/40 p-2 opacity-30" />
                );
              }

              const dString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayHearings = getHearingsForDate(dString);
              const isToday = dString === formatDateYMD(new Date());

              return (
                <div 
                  key={idx}
                  className={`min-h-[105px] rounded-2xl p-2 flex flex-col justify-between border transition-all ${
                    isToday 
                      ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30' 
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
                    }`}>
                      {dayNum}
                    </span>
                    {dayHearings.length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                        {dayHearings.length}
                      </span>
                    )}
                  </div>

                  {/* Hearing Badges in Cell */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayHearings.slice(0, 2).map(h => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setSelectedHearing(h)}
                        className="w-full text-left px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-200 truncate font-sans block cursor-pointer transition-colors"
                        title={`${h.hearingTime} - ${h.caseTitle}`}
                      >
                        <span className="text-amber-400 font-mono mr-1">{h.hearingTime}</span>
                        <span>{h.caseTitle}</span>
                      </button>
                    ))}
                    {dayHearings.length > 2 && (
                      <span className="text-[9px] font-mono text-slate-400 block px-1">
                        +{dayHearings.length - 2} more...
                      </span>
                    )}
                  </div>

                  <div className="text-[9px] text-right font-mono text-slate-600">
                    {dayHearings.length > 0 ? `${dayHearings.length} court events` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: WEEK CALENDAR VIEW
          ========================================================================= */}
      {viewMode === 'week' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const ymd = formatDateYMD(day);
              const dayHearings = getHearingsForDate(ymd);
              const isToday = ymd === formatDateYMD(new Date());

              return (
                <div 
                  key={idx}
                  className={`rounded-2xl p-3 border flex flex-col space-y-3 min-h-[380px] ${
                    isToday ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="border-b border-slate-800 pb-2 text-center">
                    <span className="text-[11px] font-mono font-bold text-amber-400 block">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={`text-base font-bold font-mono inline-block px-2 py-0.5 rounded-full mt-0.5 ${
                      isToday ? 'bg-amber-500 text-slate-950' : 'text-white'
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* List of hearings on this day */}
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {dayHearings.length === 0 ? (
                      <span className="text-[10px] text-slate-600 block text-center pt-8">No hearings</span>
                    ) : (
                      dayHearings.map(h => (
                        <div 
                          key={h.id}
                          onClick={() => setSelectedHearing(h)}
                          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-amber-400 font-bold">{h.hearingTime}</span>
                            <span className="text-slate-400">{h.status}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">{h.caseTitle}</h4>
                          <span className="text-[10px] text-slate-400 block font-mono">{h.bench}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: DAY AGENDA VIEW
          ========================================================================= */}
      {viewMode === 'day' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-amber-400 uppercase font-bold">
                {currentLang === 'om' ? 'Beellama Guyyaa' : 'የቀኑ ችሎት ዝርዝር'}
              </span>
              <h3 className="text-xl font-bold text-white font-serif-legal">
                {currentDate.toLocaleDateString(currentLang === 'om' ? 'en-US' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
              {getHearingsForDate(currentDayYMD).length} Hearings Scheduled
            </span>
          </div>

          <div className="space-y-3">
            {getHearingsForDate(currentDayYMD).length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {currentLang === 'om' ? 'Guyyaa kanatti beellamni hin galmoofne.' : 'በዚህ ቀን የተመዘገበ ችሎት የለም።'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setHearingDate(currentDayYMD);
                    setShowAddModal(true);
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{currentLang === 'om' ? 'Beellama Guyyaa Kanaaf Qabadhu' : 'Schedule on this date'}</span>
                </button>
              </div>
            ) : (
              getHearingsForDate(currentDayYMD).map(h => (
                <div 
                  key={h.id}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-400 font-mono text-xs font-bold border border-slate-800">
                        ⏰ {h.hearingTime}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{h.caseNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {h.hearingType}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white font-serif-legal">{h.caseTitle}</h4>
                    <p className="text-xs text-slate-400">
                      <strong>Dhaddacha:</strong> {h.courtName} • {h.bench} | <strong>Abbaa Seeraa:</strong> {h.judgeName}
                    </p>
                    <p className="text-xs text-slate-400">
                      <strong>Abbootii Dhimmaa:</strong> {h.litigants}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(h)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        h.reminderSent 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{h.reminderSent ? 'Yaadachiisi (Sent)' : 'SMS/Email Ergi'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportIcs(h)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Export ICS"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: COMPREHENSIVE LIST / CARDS VIEW
          ========================================================================= */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHearings.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500">
              <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">{currentLang === 'om' ? 'Beellamni hin argamne.' : 'No scheduled hearings found.'}</p>
            </div>
          ) : (
            filteredHearings.map((h) => (
              <div 
                key={h.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl space-y-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                      {h.caseNumber}
                    </span>
                    <h3 className="text-base font-bold text-white font-serif-legal pt-1">{h.caseTitle}</h3>
                    {h.allowSelfRegistration && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {currentLang === 'om' ? 'Of-guutu: Baname' : 'Auto-fill: Active'}
                      </span>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    h.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    h.status === 'Notified' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                    h.status === 'Postponed' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {h.status}
                  </span>
                </div>

                {h.allowSelfRegistration && (
                   <div className="flex items-center gap-2 text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
                     <button
                       onClick={async () => {
                         const userId = user?.uid || (user as any)?.id || 'anon_user';
                         if (userId) {
                           await updateCaseAttendanceRecord(h.id, userId);
                           showToast(currentLang === 'om' ? 'Galmeen keessan milkaa\'inaan godhameera!' : 'Self-registration successful!');
                         }
                       }}
                       className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all cursor-pointer"
                     >
                       {currentLang === 'om' ? 'Of-guutu (Register)' : 'Register Attendance'}
                     </button>
                   </div>
                )}

                {/* Hearing Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <div className="space-y-1">
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Guyyaa & Saatii (Date & Time)</span>
                    <div className="flex items-center gap-1.5 font-medium text-white">
                      <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>{h.hearingDate} @ {h.hearingTime}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Gosa Dhaddachaa (Type)</span>
                    <span className="font-medium text-amber-300">{h.hearingType}</span>
                  </div>
                  <div className="space-y-1 col-span-2 pt-1 border-t border-slate-800/60">
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Mana Murtii & Dhaddacha</span>
                    <span className="font-medium text-slate-200">{h.courtName} • {h.bench}</span>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Abbootii Dhimmaa / Litigants</span>
                    <span className="font-medium text-slate-300">{h.litigants}</span>
                  </div>
                </div>

                {h.notes && (
                  <p className="text-xs text-slate-400 italic">
                    "{h.notes}"
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(h)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        h.reminderSent 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{h.reminderSent ? 'Yaadachiisi (Sent)' : 'SMS/Email Ergi'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportIcs(h)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Export ICS Calendar"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={h.status}
                      onChange={(e) => {
                        updateHearingStatus(h.id, e.target.value as any);
                        setHearings(getStoredHearingEvents());
                      }}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Notified">Notified</option>
                      <option value="Completed">Completed</option>
                      <option value="Postponed">Postponed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDelete(h.id)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Hearing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Hearing Detail Modal */}
      {selectedHearing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                  {selectedHearing.caseNumber} • {selectedHearing.hearingType}
                </span>
                <h3 className="text-base font-bold text-white font-serif-legal">{selectedHearing.caseTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHearing(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p><strong>Guyyaa & Saatii:</strong> {selectedHearing.hearingDate} @ {selectedHearing.hearingTime}</p>
              <p><strong>Mana Murtii:</strong> {selectedHearing.courtName} ({selectedHearing.bench})</p>
              <p><strong>Abbaa Seeraa:</strong> {selectedHearing.judgeName}</p>
              <p><strong>Abbootii Dhimmaa:</strong> {selectedHearing.litigants}</p>
              {selectedHearing.notes && <p className="italic text-slate-400">"{selectedHearing.notes}"</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleExportIcs(selectedHearing)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download .ICS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSendReminder(selectedHearing);
                  setSelectedHearing(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Send SMS/Email</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Hearing Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif-legal">
                    {currentLang === 'om' ? 'Beellama Dhaddachaa Haaraa Qabadhu' : 'Schedule New Court Hearing'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {currentLang === 'om' ? 'Galmee fi guyyaa dhaddachaa galmeessi' : 'Register case hearing date & time'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHearing} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Lakkoofsa Galmee (Case Number)</label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Mata Duree Galmee (Case Title)</label>
                  <input
                    type="text"
                    value={caseTitle}
                    onChange={(e) => setCaseTitle(e.target.value)}
                    placeholder="Fkn: Himataa vs Himatamaa"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Guyyaa Dhaddachaa (Hearing Date)</label>
                  <input
                    type="date"
                    value={hearingDate}
                    onChange={(e) => setHearingDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Saatii (Hearing Time)</label>
                  <input
                    type="time"
                    value={hearingTime}
                    onChange={(e) => setHearingTime(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Gosa Dhaddachaa (Hearing Type)</label>
                  <select
                    value={hearingType}
                    onChange={(e) => setHearingType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="First Hearing">First Hearing (Beellama Jalqabaa)</option>
                    <option value="Evidence Submission">Evidence Submission (Ragaa Qabsiisuu)</option>
                    <option value="Witness Examination">Witness Examination (Ragaa Dhaggeeffachuu)</option>
                    <option value="Oral Arguments">Oral Arguments (Falmii Afaanii)</option>
                    <option value="Judgment Delivery">Judgment Delivery (Murtii Kennuu)</option>
                    <option value="Mention">Mention (Qormaata / Beellama Gabaabaa)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Abbaa Seeraa (Judge Name)</label>
                  <input
                    type="text"
                    value={judgeName}
                    onChange={(e) => setJudgeName(e.target.value)}
                    placeholder="Obbo / Aadde..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Abbootii Dhimmaa (Litigants / Parties)</label>
                <input
                  type="text"
                  value={litigants}
                  onChange={(e) => setLitigants(e.target.value)}
                  placeholder="Fkn: Obbo Galataa vs Bulchiinsa Magaalaa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Yaadannoo / Qajeelcha (Notes)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sanadoota dhiyaachuu qaban ykn qajeelfama dhaddachaa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <input
                  type="checkbox"
                  id="allowSelfRegistration"
                  checked={allowSelfRegistration}
                  onChange={(e) => setAllowSelfRegistration(e.target.checked)}
                  className="w-4 h-4 text-amber-500 bg-slate-800 border-slate-700 rounded focus:ring-amber-500"
                />
                <label htmlFor="allowSelfRegistration" className="text-slate-300 font-semibold cursor-pointer">
                  {currentLang === 'om' ? 'Of-guutu (Auto-fill) hayyami' : 'Enable Auto-fill/Self-register'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  {currentLang === 'om' ? 'Haqi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow"
                >
                  {currentLang === 'om' ? 'Galmeessi' : 'Save Hearing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
