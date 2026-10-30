import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Plus, Trash2, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Language } from '../i18n/translations';
import {
  FilingDeadline,
  getSavedDeadlines,
  saveDeadlines,
  requestNotificationPermission,
  triggerDesktopNotification,
} from '../services/filingReminderService';

interface FilingReminderModalProps {
  currentLang: Language;
  onClose: () => void;
}

export const FilingReminderModal: React.FC<FilingReminderModalProps> = ({ currentLang, onClose }) => {
  const [deadlines, setDeadlines] = useState<FilingDeadline[]>([]);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [courtroom, setCourtroom] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [courtName, setCourtName] = useState('Mana Murtii Waliigalaa Oromiyaa');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [description, setDescription] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    setDeadlines(getSavedDeadlines());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
    if (granted) {
      triggerDesktopNotification(
        'SEERAAI Filing Reminders Enabled',
        'You will receive local desktop notifications 24 and 48 hours before your court filing deadlines.'
      );
    } else {
      alert('Notification permission was denied or not supported by browser.');
    }
  };

  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseTitle || !deadlineDate) return;

    const newDeadline: FilingDeadline = {
      id: `deadline_${Date.now()}`,
      caseTitle,
      caseNumber: caseNumber || 'N/A',
      courtroom: courtroom || 'N/A',
      judgeName: judgeName || 'N/A',
      courtName,
      deadlineDate: new Date(deadlineDate).toISOString(),
      description,
    };

    const updated = [newDeadline, ...deadlines];
    setDeadlines(updated);
    saveDeadlines(updated);

    setCaseTitle('');
    setCaseNumber('');
    setCourtroom('');
    setJudgeName('');
    setDescription('');
    setDeadlineDate('');
  };

  const handleDelete = (id: string) => {
    const updated = deadlines.filter((d) => d.id !== id);
    setDeadlines(updated);
    saveDeadlines(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {currentLang === 'om' ? 'Qopheessaa Beellama Dhiyeessa (Filing Reminders)' : 'Automated Filing Reminders'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' ? 'Sa’aatii 24 fi 48 dura beeksisa desktop kennuu' : '24h & 48h desktop notifications for court deadlines'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {!permissionGranted && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-200 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Beeksisa desktop (Desktop Notifications) argachuuf eeyyama browsers kennuu qabdu.'
                    : 'Enable browser notifications to receive automatic 24h & 48h deadline alerts.'}
                </p>
              </div>
              <button
                onClick={handleEnableNotifications}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow"
              >
                {currentLang === 'om' ? 'Eeyyama Kenni' : 'Enable Notifications'}
              </button>
            </div>
          )}

          <form onSubmit={handleAddDeadline} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-amber-400 text-xs uppercase tracking-wider font-mono">
              {currentLang === 'om' ? 'Beellama Haaraa Galchaa' : 'Add New Filing Deadline'}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Maqaa Galmee / Dhimma' : 'Case Title'}
                </label>
                <input
                  type="text"
                  required
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  placeholder="Obbo Kabbadaa c. Abbaa Biyyee"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Lakkoofsa Galmee' : 'Case Number'}
                </label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="OR/CASS/8892/18"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Mana Murtii' : 'Court Name'}
                </label>
                <select
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Mana Murtii Waliigalaa Oromiyaa">Mana Murtii Waliigalaa Oromiyaa</option>
                  <option value="Mana Murtii Ol'aanaa Finfinnee">Mana Murtii Ol'aanaa Finfinnee</option>
                  <option value="Mana Murtii Waliigalaa Federaalaa">Mana Murtii Waliigalaa Federaalaa (Cassation)</option>
                  <option value="Mana Murtii Sadarkaa Jalqabaa">Mana Murtii Sadarkaa Jalqabaa</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Kutaa / Dhaddacha' : 'Courtroom'}
                </label>
                <input
                  type="text"
                  value={courtroom}
                  onChange={(e) => setCourtroom(e.target.value)}
                  placeholder="Bench 4"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Maqaa Abbaa Seeraa' : 'Judge Name'}
                </label>
                <input
                  type="text"
                  value={judgeName}
                  onChange={(e) => setJudgeName(e.target.value)}
                  placeholder="Obbo Abbabaa"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Guyyaa & Sa’aatii Beellamaa' : 'Deadline Date & Time'}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {currentLang === 'om' ? 'Ibsa Dhimma Dhiyeessuu' : 'Description / Filing Requirements'}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Iyyata Ol-iyyannoo fi ragaa dhiyeessuu"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{currentLang === 'om' ? 'Beellama Galmee Dabali' : 'Add Filing Deadline'}</span>
            </button>
          </form>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {currentLang === 'om' ? 'Beellamoota Galmee Jiran (Active Deadlines)' : 'Active Filing Deadlines'}
            </h4>
            {deadlines.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No filing deadlines currently scheduled.</p>
            ) : (
              <div className="space-y-2">
                {deadlines.map((d) => {
                  const targetTime = new Date(d.deadlineDate).getTime();
                  const hoursLeft = Math.max(0, Math.round((targetTime - Date.now()) / (1000 * 60 * 60)));
                  return (
                    <div key={d.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400 text-xs">{d.caseTitle}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono">
                            {d.courtName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{d.description || 'No description'}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            {new Date(d.deadlineDate).toLocaleString()}
                          </span>
                          <span className="text-amber-300 font-bold">
                            ⏳ {hoursLeft} hours remaining (24h/48h alerts active)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
