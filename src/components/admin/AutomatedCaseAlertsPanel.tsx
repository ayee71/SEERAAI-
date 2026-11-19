import React, { useState } from 'react';
import { Bell, Mail, Smartphone, AlertCircle, Save } from 'lucide-react';
import { Language } from '../../i18n/translations';

export const AutomatedCaseAlertsPanel: React.FC<{ currentLang: Language }> = ({ currentLang }) => {
  const [alerts, setAlerts] = useState({
    caseStatusChange: { email: true, sms: false },
    upcomingDeadlines: { email: true, sms: true },
    urgentHearing: { email: true, sms: true },
  });

  const toggleAlert = (key: keyof typeof alerts, channel: 'email' | 'sms') => {
    setAlerts(prev => ({
      ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] }
    }));
  };

  const isOm = currentLang === 'om';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white font-serif-legal">
            {isOm ? 'Beeksisa Galmee Automateed' : 'Automated Case Alerts'}
          </h3>
          <p className="text-xs text-slate-400">
            {isOm ? 'Haala galmee fi beellama irratti ergaa argachuu filadhaa' : 'Configure notifications for case status and deadlines'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(alerts).map(([key, channels]) => (
          <div key={key} className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="text-sm font-semibold text-slate-200 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={channels.email} onChange={() => toggleAlert(key as any, 'email')} className="accent-amber-500" />
                <Mail className="w-4 h-4" /> Email
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={channels.sms} onChange={() => toggleAlert(key as any, 'sms')} className="accent-amber-500" />
                <Smartphone className="w-4 h-4" /> SMS
              </label>
            </div>
          </div>
        ))}
      </div>
      
      <button className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
        <Save className="w-4 h-4" /> {isOm ? 'Haala Qabsiisi' : 'Save Configuration'}
      </button>
    </div>
  );
};
