import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  FileText, 
  Info,
  MoreVertical,
  Plus
} from 'lucide-react';
import { getSavedDeadlines, FilingDeadline } from '../services/filingReminderService';
import { Language, translations } from '../i18n/translations';

interface CourtScheduleViewProps {
  currentLang: Language;
}

type ViewMode = 'month' | 'week' | 'agenda';

export const CourtScheduleView: React.FC<CourtScheduleViewProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [deadlines, setDeadlines] = useState<FilingDeadline[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [hoveredEvent, setHoveredEvent] = useState<FilingDeadline | null>(null);

  useEffect(() => {
    setDeadlines(getSavedDeadlines());
  }, []);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const renderHeader = () => {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl mb-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold border border-amber-400 shadow-md">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-serif-legal">
              {currentLang === 'om' ? 'Kalandara Beellama Mana Murtii' : 'Court Hearing Calendar'}
            </h1>
            <p className="text-xs text-slate-400">
              {format(currentDate, 'MMMM yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(['month', 'week', 'agenda'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === mode
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-500 hover:border-amber-500/50 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={today}
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-500 hover:border-amber-500/50 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dayDeadlines = deadlines.filter(d => isSameDay(parseISO(d.deadlineDate), cloneDay));
        
        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] sm:min-h-[120px] p-2 border border-slate-800/40 relative transition-all group ${
              !isSameMonth(day, monthStart) ? 'bg-slate-950/20 text-slate-700' : 'bg-slate-900/40 text-slate-200 hover:bg-slate-800/40'
            } ${isToday(day) ? 'bg-amber-500/5 ring-1 ring-inset ring-amber-500/20' : ''} ${
              selectedDay && isSameDay(day, selectedDay) ? 'bg-amber-500/10' : ''
            }`}
            onClick={() => setSelectedDay(cloneDay)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-mono font-bold ${isToday(day) ? 'bg-amber-500 text-slate-950 w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
                {formattedDate}
              </span>
              {dayDeadlines.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30">
                  {dayDeadlines.length}
                </span>
              )}
            </div>

            <div className="space-y-1 overflow-y-auto max-h-[60px] sm:max-h-[80px]">
              {dayDeadlines.map((d) => (
                <div
                  key={d.id}
                  onMouseEnter={() => setHoveredEvent(d)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  className="relative group/event"
                >
                  <div className="text-[10px] p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 truncate cursor-pointer hover:bg-amber-500/20 transition-colors">
                    {d.caseTitle}
                  </div>
                  
                  {/* Tooltip */}
                  {hoveredEvent?.id === d.id && (
                    <div className="fixed z-[100] w-64 p-4 bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                         style={{ 
                           left: '50%', 
                           top: '50%', 
                           transform: 'translate(-50%, -50%)' 
                         }}>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                          <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
                            <Info className="w-4 h-4" />
                          </div>
                          <div className="font-bold text-xs text-white truncate">Case Details</div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-tight">
                              <div className="text-slate-400">Case No:</div>
                              <div className="text-slate-200 font-mono">{d.caseNumber}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-tight">
                              <div className="text-slate-400">Courtroom:</div>
                              <div className="text-slate-200">{d.courtroom}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <User className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-tight">
                              <div className="text-slate-400">Judge:</div>
                              <div className="text-slate-200">{d.judgeName}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-tight">
                              <div className="text-slate-400">Time:</div>
                              <div className="text-slate-200 font-mono">{format(parseISO(d.deadlineDate), 'HH:mm')}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">{rows}</div>;
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(weekStart);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-300">
        {days.map((day) => {
          const dayDeadlines = deadlines.filter(d => isSameDay(parseISO(d.deadlineDate), day));
          const formattedDate = format(day, 'd');
          const dayName = format(day, 'EEE');

          return (
            <div
              key={day.toString()}
              className={`min-h-[400px] p-3 border-r last:border-r-0 border-slate-800/40 transition-all ${
                isToday(day) ? 'bg-amber-500/5 ring-1 ring-inset ring-amber-500/20' : 'bg-slate-900/40'
              }`}
            >
              <div className="text-center mb-4 pb-2 border-b border-slate-800/60">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{dayName}</div>
                <div className={`text-lg font-black mt-1 ${isToday(day) ? 'text-amber-500' : 'text-slate-300'}`}>
                  {formattedDate}
                </div>
              </div>

              <div className="space-y-2">
                {dayDeadlines.map((d) => (
                  <div
                    key={d.id}
                    onMouseEnter={() => setHoveredEvent(d)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    className="relative group/event"
                  >
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer">
                      <div className="text-[10px] font-bold text-amber-500 mb-1">{format(parseISO(d.deadlineDate), 'HH:mm')}</div>
                      <div className="text-[11px] font-bold text-slate-100 line-clamp-2 leading-snug">{d.caseTitle}</div>
                    </div>

                    {/* Enhanced Tooltip with Quick Actions */}
                    {hoveredEvent?.id === d.id && (
                      <div className="fixed z-[100] w-72 p-5 bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
                           style={{ 
                             left: '50%', 
                             top: '50%', 
                             transform: 'translate(-50%, -50%)' 
                           }}>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
                                <Info className="w-4 h-4" />
                              </div>
                              <div className="font-bold text-sm text-white">Hearing Details</div>
                            </div>
                            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-500">{d.caseNumber}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-start gap-3">
                              <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Courtroom</div>
                                <div className="text-xs text-slate-200 font-medium">{d.courtroom}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                              <User className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Presiding Judge</div>
                                <div className="text-xs text-slate-200 font-medium">{d.judgeName}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Scheduled Time</div>
                                <div className="text-xs text-slate-200 font-mono">{format(parseISO(d.deadlineDate), 'PPPP p')}</div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
                            <button className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-all shadow-md">
                              Jump to Case
                            </button>
                            <button className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-all border border-slate-700">
                              Edit Event
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAgenda = () => {
    const sortedDeadlines = [...deadlines].sort((a, b) => new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime());
    
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {sortedDeadlines.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800">
            <CalendarIcon className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">No upcoming hearings scheduled.</p>
          </div>
        ) : (
          sortedDeadlines.map((d) => (
            <div key={d.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl hover:border-amber-500/40 transition-all shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex flex-col items-center justify-center min-w-[70px]">
                  <span className="text-[10px] font-bold text-amber-500 uppercase">{format(parseISO(d.deadlineDate), 'MMM')}</span>
                  <span className="text-xl font-black text-white">{format(parseISO(d.deadlineDate), 'dd')}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-100">{d.caseTitle}</h3>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      {format(parseISO(d.deadlineDate), 'HH:mm')}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-500" />
                      {d.courtName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1">
                    <span>Judge: {d.judgeName}</span>
                    <span>•</span>
                    <span>Courtroom: {d.courtroom}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-amber-300 hover:text-white hover:border-amber-500/40 transition-all">
                  View Details
                </button>
                <button className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-all">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {renderHeader()}
      
      {viewMode === 'month' && (
        <div className="animate-in fade-in duration-500">
          {renderDays()}
          {renderCells()}
        </div>
      )}

      {viewMode === 'week' && renderWeekView()}

      {viewMode === 'agenda' && renderAgenda()}

      {/* Quick Add Button */}
      <button className="fixed bottom-24 right-8 w-14 h-14 bg-amber-500 text-slate-950 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-40 border-4 border-slate-950">
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
};
