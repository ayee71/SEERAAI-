import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Clock } from 'lucide-react';

interface CourtroomAttendanceProps {
  currentLang: 'om' | 'am' | 'en';
}

export const CourtroomAttendanceSummaryCard: React.FC<CourtroomAttendanceProps> = ({ currentLang }) => {
  const [upcomingAppointments, setUpcomingAppointments] = useState(3);
  const [overdueFilings, setOverdueFilings] = useState(1);
  const [urgentDeadlines, setUrgentDeadlines] = useState(2);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
          <Calendar className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-100">
          {currentLang === 'om' ? 'Guduunfaa Beellama Mana Murtii' : 'የፍርድ ቤት ቀጠሮ ማጠቃለያ'}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            {currentLang === 'om' ? 'Beellama' : 'ቀጠሮዎች'}
          </p>
          <p className="text-2xl font-black text-white">{upcomingAppointments}</p>
        </div>
        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
          <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold">
            {currentLang === 'om' ? 'Kan Darbe' : 'ያለፉ'}
          </p>
          <p className="text-2xl font-black text-red-500">{overdueFilings}</p>
        </div>
      </div>

      {urgentDeadlines > 0 && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-xs font-bold text-red-200">
            {urgentDeadlines} {currentLang === 'om' ? 'Beellama Hatattamaa' : 'አስቸኳይ የመጨረሻ ቀናት'}
          </p>
        </div>
      )}
    </div>
  );
};
