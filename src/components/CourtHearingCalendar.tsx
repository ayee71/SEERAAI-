import React, { useState } from 'react';
import { CourtHearingEvent, getStoredHearingEvents } from '../services/courtSchedulingService';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface CourtHearingCalendarProps {
  currentLang: Language;
}

export const CourtHearingCalendar: React.FC<CourtHearingCalendarProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const [currentDate, setCurrentDate] = useState(new Date());
  const hearings = getStoredHearingEvents();

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const getHearingsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return hearings.filter(h => h.hearingDate === dateStr);
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-800 rounded"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
          <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-800 rounded"><ChevronRight className="w-5 h-5 text-slate-400"/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) return <div key={index} className="h-20 bg-slate-950 rounded"></div>;
          
          const dayHearings = getHearingsForDay(day);
          return (
            <div key={index} className="h-20 bg-slate-800 rounded p-1 border border-slate-700 overflow-y-auto">
              <div className="text-[10px] text-slate-500">{day.getDate()}</div>
              {dayHearings.map(h => (
                <div key={h.id} className="text-[9px] bg-blue-500/20 text-blue-200 p-0.5 rounded mt-0.5 truncate">
                  {h.hearingTime} {h.caseTitle}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
