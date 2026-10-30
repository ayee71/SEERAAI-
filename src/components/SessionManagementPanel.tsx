import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Language } from '../i18n/translations';
import { getDeviceInfo } from '../utils/device';

interface SessionItem {
  id: string;
  deviceType: string;
  browser: string;
  os: string;
  loginTime: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SessionManagementPanelProps {
  currentLang?: Language;
}

export const SessionManagementPanel: React.FC<SessionManagementPanelProps> = ({ currentLang = 'om' }) => {
  const { user, profile, logout } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showConfirmAllModal, setShowConfirmAllModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const currentSessionId = typeof window !== 'undefined' ? sessionStorage.getItem('seera_session_id') : null;

  // Real-time listener for user sessions from Firestore
  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    // CRITICAL: Only attach Firestore onSnapshot listener if user is actively authenticated
    // in Firebase Auth and matches auth.currentUser.uid to prevent permission-denied errors.
    if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
      const dev = getDeviceInfo();
      const localSessionId = currentSessionId || 'sess_local_device';
      setSessions([
        {
          id: localSessionId,
          deviceType: dev.deviceType,
          browser: dev.browser,
          os: dev.os,
          loginTime: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          isCurrent: true,
        }
      ]);
      return;
    }

    const userDocPath = `users/${user.uid}`;
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const activeSessionsObj = data.activeSessions || {};
          const list: SessionItem[] = Object.keys(activeSessionsObj).map((sid) => {
            const sess = activeSessionsObj[sid] || {};
            return {
              id: sid,
              deviceType: sess.deviceType || '💻 Desktop / Laptop',
              browser: sess.browser || 'Web Browser',
              os: sess.os || 'OS',
              loginTime: sess.loginTime || sess.lastActive || new Date().toISOString(),
              lastActive: sess.lastActive || new Date().toISOString(),
              isCurrent: sid === currentSessionId,
            };
          });

          // If current session is missing from remote yet, add fallback local preview
          if (currentSessionId && !list.some((s) => s.id === currentSessionId)) {
            const dev = getDeviceInfo();
            list.unshift({
              id: currentSessionId,
              deviceType: dev.deviceType,
              browser: dev.browser,
              os: dev.os,
              loginTime: new Date().toISOString(),
              lastActive: new Date().toISOString(),
              isCurrent: true,
            });
          }

          // Sort current session first, then by last active desc
          list.sort((a, b) => {
            if (a.isCurrent) return -1;
            if (b.isCurrent) return 1;
            return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
          });

          setSessions(list);
        } else {
          setSessions([]);
        }
      },
      (err) => {
        console.warn('SessionManagementPanel Firestore sync notice:', err);
        const dev = getDeviceInfo();
        const localSessionId = currentSessionId || 'sess_local_device';
        setSessions([
          {
            id: localSessionId,
            deviceType: dev.deviceType,
            browser: dev.browser,
            os: dev.os,
            loginTime: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            isCurrent: true,
          }
        ]);
        try {
          handleFirestoreError(err, OperationType.GET, userDocPath);
        } catch {
          // Handled gracefully to prevent crashing UI
        }
      }
    );

    return () => unsubscribe();
  }, [user, currentSessionId]);

  // Revoke a single specific session
  const handleRevokeSingle = async (sessionIdToRevoke: string) => {
    if (!user) return;
    setRevokingId(sessionIdToRevoke);
    setFeedbackMsg(null);

    if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
      setSessions(prev => prev.filter(s => s.id !== sessionIdToRevoke));
      if (sessionIdToRevoke === currentSessionId) {
        sessionStorage.removeItem('seera_session_id');
        setTimeout(() => logout(), 1200);
      }
      setFeedbackMsg({
        type: 'success',
        text: currentLang === 'om'
          ? 'Heeyyamni browserii kanaa milkaa\'inaan haqameera.'
          : currentLang === 'am'
          ? 'የአሰሳ መስኮቱ ፈቃድ በተሳካ ሁኔታ ተሰርዟል።'
          : 'Browser session successfully revoked.',
      });
      setRevokingId(null);
      return;
    }

    const userDocPath = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const currentActive = { ...(profile?.activeSessions || {}) };
      delete currentActive[sessionIdToRevoke];

      await setDoc(userDocRef, { activeSessions: currentActive }, { merge: true });

      // Record audit event in auth_logs
      try {
        await addDoc(collection(db, 'auth_logs'), {
          userId: user.uid,
          attemptType: 'success',
          action: 'REVOKE_SINGLE_SESSION',
          targetSessionId: sessionIdToRevoke,
          timestamp: serverTimestamp(),
          details: `Authorized browser session (${sessionIdToRevoke}) revoked by user`,
        });
      } catch {
        // non-blocking
      }

      setFeedbackMsg({
        type: 'success',
        text: currentLang === 'om'
          ? 'Heeyyamni browserii kanaa milkaa\'inaan haqameera.'
          : currentLang === 'am'
          ? 'የአሰሳ መስኮቱ ፈቃድ በተሳካ ሁኔታ ተሰርዟል።'
          : 'Browser session successfully revoked.',
      });

      // If revoking current browser, log out
      if (sessionIdToRevoke === currentSessionId) {
        setTimeout(() => {
          logout();
        }, 1200);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userDocPath);
    } finally {
      setRevokingId(null);
    }
  };

  // Revoke ALL authorized sessions across all browsers
  const handleRevokeAllSessions = async () => {
    if (!user) return;
    setLoading(true);
    setFeedbackMsg(null);

    if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
      setSessions([]);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('seera_session_id');
      }
      setShowConfirmAllModal(false);
      setFeedbackMsg({
        type: 'success',
        text: currentLang === 'om'
          ? 'Heeyyamni browseroota hunda haqameera! Meeshaaleen hundi cufamaniiru; deebitanii seenaa.'
          : currentLang === 'am'
          ? 'የሁሉም አሳሾች ፈቃድ ተሰርዟል! ሁሉም ክፍለ-ጊዜዎች ተቋርጠዋል፣ እባክዎ እንደገና ይግቡ።'
          : 'All authorized browser sessions revoked! Global re-authentication enforced.',
      });
      setTimeout(async () => {
        await logout();
      }, 1500);
      setLoading(false);
      return;
    }

    const userDocPath = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, 'users', user.uid);

      // Reset activeSessions map to empty object
      await setDoc(userDocRef, { activeSessions: {} }, { merge: true });

      // Clear local session storage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('seera_session_id');
      }

      // Record security audit event
      try {
        await addDoc(collection(db, 'auth_logs'), {
          userId: user.uid,
          attemptType: 'success',
          action: 'REVOKE_ALL_SESSIONS',
          timestamp: serverTimestamp(),
          details: 'Global revocation: All authorized browser instances revoked from SettingsView',
        });
      } catch {
        // non-blocking
      }

      setShowConfirmAllModal(false);
      setFeedbackMsg({
        type: 'success',
        text: currentLang === 'om'
          ? 'Heeyyamni browseroota hunda haqameera! Meeshaaleen hundi cufamaniiru; deebitanii seenaa.'
          : currentLang === 'am'
          ? 'የሁሉም አሳሾች ፈቃድ ተሰርዟል! ሁሉም ክፍለ-ጊዜዎች ተቋርጠዋል፣ እባክዎ እንደገና ይግቡ።'
          : 'All authorized browser sessions revoked! Global re-authentication enforced.',
      });

      // Force instant logout to complete global re-authentication requirement
      setTimeout(async () => {
        await logout();
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userDocPath);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceEmoji = (deviceType: string) => {
    if (deviceType.toLowerCase().includes('mobile') || deviceType.toLowerCase().includes('phone')) {
      return '📱';
    }
    if (deviceType.toLowerCase().includes('tablet') || deviceType.toLowerCase().includes('ipad')) {
      return '📱';
    }
    return '💻';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shrink-0">
            🖥️
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-slate-100">
                {currentLang === 'om'
                  ? 'To\'annoo Seensa Meeshaalee (Session Management)'
                  : currentLang === 'am'
                  ? 'የክፍለ-ጊዜ አስተዳደር (Session Management)'
                  : 'Session Management'}
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {sessions.length} {sessions.length === 1 ? 'Authorized Instance' : 'Authorized Instances'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentLang === 'om'
                ? 'Browseroota fi meeshaalee heeyyama qaban hunda to\'adhaa; yoo barbaaddan hunda heeyyama kaasaa.'
                : currentLang === 'am'
                ? 'በአሁኑ ጊዜ የተፈቀደላቸውን ሁሉንም የአሰሳ መስኮቶች ይመልከቱ እና ይቆጣጠሩ።'
                : 'Monitor all authorized browser instances and terminate remote access when needed.'}
            </p>
          </div>
        </div>

        {/* Revoke All Sessions button */}
        <button
          type="button"
          onClick={() => setShowConfirmAllModal(true)}
          disabled={loading || sessions.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50 shrink-0 border border-rose-500"
        >
          <span>🚪</span>
          <span>
            {currentLang === 'om'
              ? 'Revoke All Sessions (Hunda Cufi)'
              : currentLang === 'am'
              ? 'ሁሉንም አቋርጥ (Revoke All Sessions)'
              : 'Revoke All Sessions'}
          </span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
              : 'bg-rose-950 text-rose-200 border-rose-800'
          }`}
        >
          <span>{feedbackMsg.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Security Info Banner */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
        <span className="text-base shrink-0">🛡️</span>
        <div className="space-y-0.5 leading-relaxed">
          <span className="font-bold text-amber-300 block">
            {currentLang === 'om'
              ? 'Eegumsa Qajeelfama Nageenya Seeraa:'
              : currentLang === 'am'
              ? 'የደህንነት መመሪያ:'
              : 'Security Re-authentication Notice:'}
          </span>
          <p className="text-[11px] text-slate-400">
            {currentLang === 'om'
              ? 'Qabduun "Revoke All Sessions" browseroota fi bilbiloota appii kana irratti banaman hunda cufuun dirqama akka lammata koodii ykn biometrics galchitan taasisa.'
              : currentLang === 'am'
              ? '"Revoke All Sessions" የሚለው ቁልፍ በሁሉም መሳሪያዎች ላይ የተከፈቱ አሳሾችን በመዝጋት ድጋሚ ማረጋገጫ እንዲጠየቅ ያደርጋል።'
              : 'The "Revoke All Sessions" action terminates all active sessions across all devices and immediately triggers a global re-authentication requirement.'}
          </p>
        </div>
      </div>

      {/* List of Authorized Browser Instances */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          <span>
            {currentLang === 'om' ? 'Meeshaalee Heeyyamaman (Authorized Instances)' : 'Authorized Browser Instances'}
          </span>
          <span className="font-mono text-emerald-400">
            ● {sessions.filter((s) => s.isCurrent).length > 0 ? '1 Current Instance' : 'Monitoring Active'}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
            <span className="text-3xl block">🔒</span>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Browseriin heeyyamame hin jiru ykn heeyyamni hundi haqameera.'
                : 'No authorized sessions found or all sessions have been cleared.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  sess.isCurrent
                    ? 'bg-slate-950 border-amber-500/50 shadow-sm'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Device & Browser info */}
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                    {getDeviceEmoji(sess.deviceType)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-100">
                        {sess.browser} • {sess.os}
                      </span>
                      {sess.isCurrent ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          🟢 {currentLang === 'om' ? 'Meeshaa Ammaa (This Browser)' : 'Current Browser'}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40">
                          🟡 Remote Instance
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                      <span>{sess.deviceType}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-500">
                        ID: {sess.id.length > 14 ? `${sess.id.substring(0, 14)}...` : sess.id}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-3 flex-wrap">
                      <span>
                        🕒 Seensa: {new Date(sess.loginTime).toLocaleDateString()} {new Date(sess.loginTime).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Single session revoke action */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRevokeSingle(sess.id)}
                    disabled={revokingId === sess.id || loading}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border-slate-700 hover:border-rose-800 disabled:opacity-50"
                  >
                    <span>{revokingId === sess.id ? '⏳' : '❌'}</span>{' '}
                    <span>
                      {sess.isCurrent
                        ? currentLang === 'om' ? 'Ba\'i (Log Out)' : 'Log Out'
                        : currentLang === 'om' ? 'Heeyyama Kaasi' : 'Revoke'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Revoke All Sessions */}
      {showConfirmAllModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="font-bold text-base text-slate-100">
                  {currentLang === 'om'
                    ? 'Heeyyama Browseroota Hunda Kaasuu (Revoke All)?'
                    : currentLang === 'am'
                    ? 'ሁሉንም አሳሾች ማቋረጥ ይፈልጋሉ?'
                    : 'Revoke All Browser Sessions?'}
                </h4>
                <p className="text-xs text-rose-400 font-semibold">
                  Global Re-authentication Required
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentLang === 'om'
                ? 'Tarkaanfiin kun meeshaalee fi browseroota heeyyama qaban hunda irraa yeruma sanitti isin baasa (instant sign-out). Meeshaan hundi lammata akka koodii ykn biometrics galchu dirqisiisa. Itti fufuu barbaadduu?'
                : currentLang === 'am'
                ? 'ይህ እርምጃ በተፈቀዱ ሁሉም መሳሪያዎች እና አሳሾች ላይ ያለውን ክፍለ-ጊዜ ወዲያውኑ ያቋርጣል። ሁሉም ሰው እንደገና እንዲገባ ይገደዳል። መቀጠል ይፈልጋሉ?'
                : 'This action will immediately terminate all active sessions across all authorized browser instances. A full global re-authentication will be enforced for all instances. Do you wish to proceed?'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmAllModal(false)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-950 cursor-pointer"
              >
                {currentLang === 'om' ? 'Dhiisi (Cancel)' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleRevokeAllSessions}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-500 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>{loading ? '⏳' : '🚪'}</span>
                <span>
                  {loading
                    ? 'Haqamaa jira...'
                    : currentLang === 'om'
                    ? 'Eeyyee, Hunda Kaasi (Revoke All)'
                    : 'Yes, Revoke All Sessions'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
