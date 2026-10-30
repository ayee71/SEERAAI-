import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface AuthLog {
  id: string;
  userId: string;
  attemptType: 'success' | 'failed';
  timestamp: any;
  details?: string;
}

export const SessionSecurityReportComponent: React.FC = () => {
  const { user } = useAuth();
  const [successfulLogs, setSuccessfulLogs] = useState<AuthLog[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const logsRef = collection(db, 'auth_logs');
    const q = query(
        logsRef,
        where('userId', '==', user.uid),
        where('attemptType', '==', 'success'),
        orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData: AuthLog[] = [];
      snapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() } as AuthLog);
      });
      setSuccessfulLogs(logsData);
    });

    return () => unsubscribe();
  }, [user]);

  const clearSessions = async () => {
    if (!user) return;
    setIsClearing(true);
    setActionMessage(null);
    try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            activeSessions: {}
        });
        setActionMessage('All active browser sessions cleared successfully. Other devices must re-authenticate.');
    } catch (e: any) {
        console.error('Error clearing sessions:', e);
        setActionMessage('Failed to clear sessions: ' + (e.message || 'Error'));
    } finally {
        setIsClearing(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mt-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>📋</span>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Security Report</h4>
        </div>
        <button
            onClick={clearSessions}
            disabled={isClearing}
            className="text-xs text-rose-400 hover:text-rose-300 font-bold border border-rose-900 bg-rose-950/20 hover:bg-rose-950/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
            <span>🗑️</span>
            <span>{isClearing ? 'Clearing...' : 'Clear All Active Sessions'}</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-amber-300 flex items-center gap-2 font-mono">
          <span>ℹ️</span>
          <span>{actionMessage}</span>
        </div>
      )}

      <div className="space-y-2">
        {successfulLogs.map((log) => (
          <div key={log.id} className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-300 font-mono">
                {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Recent unlock event'}
            </span>
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold flex items-center gap-1 border border-emerald-500/30">
                <span>🟢</span>
                <span>Unlocked</span>
            </span>
          </div>
        ))}
        {successfulLogs.length === 0 && (
          <p className="text-xs text-slate-600 italic">No recent successful unlock events.</p>
        )}
      </div>
    </div>
  );
};
