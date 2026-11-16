import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { CourtNotification, subscribeToCourtNotifications, markNotificationAsRead } from '../services/courtNotificationService';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<CourtNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToCourtNotifications((newNotifs) => {
      setNotifications(newNotifs);
    });
    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
      <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-500" />
        Court Notifications (Last 24h)
      </h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500">No new notifications.</p>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              className={`p-3 rounded-lg border text-xs space-y-1 ${
                notif.isRead ? 'bg-slate-900 border-slate-800' : 'bg-slate-900 border-amber-500/30'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`font-bold ${notif.urgency === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                  {notif.title}
                </span>
                {!notif.isRead && (
                  <button onClick={() => handleMarkAsRead(notif.id)} className="text-[10px] text-emerald-400 hover:text-emerald-300">
                    Mark Read
                  </button>
                )}
              </div>
              <p className="text-slate-300">{notif.body}</p>
              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" />
                {new Date(notif.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
