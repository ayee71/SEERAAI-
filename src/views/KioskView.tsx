import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Language, translations } from '../i18n/translations';
import { handleFirestoreError, OperationType } from '../utils/firebaseError';
import html2canvas from 'html2canvas';

interface KioskViewProps {
  currentLang: Language;
}

interface CourtSessionData {
  vkLink?: string;
  googleMeetLink?: string;
  courtLogoUrl?: string;
  autoJoin?: boolean;
  status?: 'active' | 'inactive';
  institutionName?: string;
  config?: {
    targetSession?: string;
    courtLogoUrl?: string;
    volume?: number;
    theme?: string;
  };
  lastScreenCapture?: string;
  captureTrigger?: any;
}

export const KioskView: React.FC<KioskViewProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const [session, setSession] = useState<CourtSessionData | null>(null);
  const [institutionName, setInstitutionName] = useState<string>('');
  const [isIdentified, setIsIdentified] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const kioskContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedName = localStorage.getItem('seera_kiosk_institution');
    if (storedName) {
      setInstitutionName(storedName);
      setIsIdentified(true);
    }
  }, []);

  const handleRemoteCapture = async () => {
    if (!kioskContentRef.current) return;
    try {
      console.log('[Kiosk] Executing remote screen capture...');
      const canvas = await html2canvas(kioskContentRef.current, {
        backgroundColor: '#020617', // slate-950
        scale: 1,
        logging: false,
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Reduced quality to stay under 1MB

      const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
      await updateDoc(docRef, {
        lastScreenCapture: dataUrl,
        lastUpdated: serverTimestamp(),
        logs: arrayUnion({
          timestamp: new Date().toISOString(),
          message: 'Remote screen capture completed successfully',
          type: 'info'
        })
      });
      console.log('[Kiosk] Screen capture uploaded to Firestore');
    } catch (err) {
      console.error('[Kiosk] Screen capture failed:', err);
      try {
        const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
        await updateDoc(docRef, {
          logs: arrayUnion({
            timestamp: new Date().toISOString(),
            message: `Screen capture failed: ${err instanceof Error ? err.message : String(err)}`,
            type: 'error'
          })
        });
      } catch (e) { /* ignore */ }
    }
  };

  const handleIdentify = async () => {
    if (institutionName.trim()) {
      localStorage.setItem('seera_kiosk_institution', institutionName.trim());
      setIsIdentified(true);
      try {
        const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
        await updateDoc(docRef, {
          institutionName: institutionName.trim(),
          logs: arrayUnion({
            timestamp: new Date().toISOString(),
            message: `Kiosk Connected & Identified: ${institutionName.trim()}`,
            type: 'info'
          })
        });
      } catch (e) {
        console.error('Failed to log kiosk identification:', e);
      }
    }
  };

  // WebSocket Connection for Real-Time Remote Control (Hard Refresh & Commands)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/kiosk-ws`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = async () => {
          console.log('[Kiosk WebSocket] Connected to courtroom control server');
          setWsConnected(true);
          try {
            const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
            await updateDoc(docRef, {
              logs: arrayUnion({
                timestamp: new Date().toISOString(),
                message: `WebSocket Connection Active (${window.location.host})`,
                type: 'info'
              })
            });
          } catch (e) {
            // ignore
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'HARD_REFRESH' || data.action === 'reload') {
              console.warn('[Kiosk WebSocket] Received HARD_REFRESH command! Reloading browser session...');
              window.location.reload();
            } else if (data.type === 'SCREEN_CAPTURE' || data.action === 'capture') {
              handleRemoteCapture();
            }
          } catch (e) {
            console.error('[Kiosk WebSocket] Error parsing message:', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = (err) => {
          console.warn('[Kiosk WebSocket] Connection error:', err);
          ws?.close();
        };
      } catch (e) {
        console.error('[Kiosk WebSocket] Setup error:', e);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    const docRef = doc(db, 'courtroom_sessions', 'main-courtroom');
    const unsubscribe = onSnapshot(docRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSession(data as any);
        if (data.status === 'active' && data.vkLink) {
          window.location.href = data.vkLink;
        }
        // Check for hard refresh or reset trigger in Firestore (fail-safe)
        if (data.hardRefreshTrigger || data.resetTrigger) {
          console.warn('[Firestore] hardRefreshTrigger or resetTrigger detected, reloading...');
          window.location.reload();
        }
        // Check for screen capture trigger (fail-safe for WebSocket)
        if (data.captureTrigger) {
          // If the trigger is fresh (last 10 seconds), capture
          const triggerTime = data.captureTrigger.toDate ? data.captureTrigger.toDate().getTime() : 0;
          const now = Date.now();
          if (now - triggerTime < 10000) {
             handleRemoteCapture();
             // Reset trigger to avoid loop
             await updateDoc(docRef, { captureTrigger: null });
          }
        }
        // Check for diagnostics trigger
        if (data.diagnosticsTrigger) {
          const report = `CPU Cores: ${navigator.hardwareConcurrency || 'N/A'}, Online: ${navigator.onLine}, WS: ${wsConnected ? 'Active' : 'Disconnected'}`;
          await updateDoc(docRef, {
            logs: arrayUnion({ timestamp: serverTimestamp(), message: `Diagnostics: ${report}`, type: 'info' }),
            diagnosticsTrigger: null
          });
        }
        // Check for log refresh trigger
        if (data.refreshLogsTrigger) {
          const statusReport = `Status: ${data.status || 'N/A'}, WS: ${wsConnected ? 'Connected' : 'Disconnected'}, UA: ${navigator.userAgent.slice(0, 50)}...`;
          await updateDoc(docRef, {
            logs: arrayUnion({ 
              timestamp: serverTimestamp(), 
              message: `Forced Log Refresh: ${statusReport}`, 
              type: 'info' 
            }),
            refreshLogsTrigger: null
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'courtroom_sessions/main-courtroom');
    });
    return () => unsubscribe();
  }, [wsConnected]);

  return (
    <div ref={kioskContentRef} className="relative flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-100 p-6 overflow-hidden">
      {/* Top-Right Visual WebSocket Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 text-xs font-mono font-bold shadow-lg backdrop-blur-md transition-all">
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-md transition-all duration-300 ${
            wsConnected
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-emerald-950/40'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-300 shadow-rose-950/40'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            {wsConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                wsConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="tracking-wide font-semibold">
            {wsConnected ? 'WS: CONNECTED' : 'WS: DISCONNECTED'}
          </span>
        </div>
      </div>

      {!isIdentified ? (
        <div className="flex flex-col items-center justify-center w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-center space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 text-3xl">
            🏛️
          </div>
          <h2 className="text-xl font-bold font-serif-legal text-amber-400">
            {currentLang === 'om' ? 'Sektoo / ID Dhaddacha Galchuun' : 'የፍርድ ቤት / ተቋም ስም ያስገቡ'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {currentLang === 'om'
              ? 'Maqaa mana hojii seeraa keessanii galchuun waliin qunnamtii Kiosk mirkaneessaa.'
              : 'የኪዮስክ ግንኙነትን ለማረጋገጥ የማስቻያ ቦታዎን / የተቋምዎን ስም ያስገቡ።'}
          </p>
          <input
            type="text"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            placeholder="Official Workplace Name (e.g. Oromia High Court)"
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={handleIdentify}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            Confirm Connection
          </button>
        </div>
      ) : (
        <div className="text-center space-y-6 max-w-xl w-full p-8 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Court Logo / Emblem Display */}
          <div className="flex flex-col items-center space-y-3">
            {(session?.courtLogoUrl || session?.config?.courtLogoUrl) ? (
              <div className="w-20 h-20 rounded-2xl border-2 border-amber-500/40 bg-slate-950 p-1.5 shadow-xl flex items-center justify-center overflow-hidden">
                <img
                  src={session?.courtLogoUrl || session?.config?.courtLogoUrl}
                  alt="Court Logo"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 text-4xl">
                🏛️
              </div>
            )}

            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
              🏛️ {session?.institutionName || session?.config?.targetSession || institutionName}
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-serif-legal text-amber-400">
            {t.courtroomKiosk.title}
          </h1>

          <p className="text-base sm:text-lg font-medium text-slate-300">
            {session?.status === 'active' ? t.courtroomKiosk.active : t.courtroomKiosk.waiting}
          </p>

          {/* Google Meet / Virtual Courtroom Joining Card */}
          {(session?.googleMeetLink || session?.vkLink) ? (
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <span>📹</span>
                  <span>Google Meet / Virtual Courtroom Link</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              </div>

              <div className="font-mono text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800 truncate">
                {session?.googleMeetLink || session?.vkLink}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <a
                  href={session?.googleMeetLink || session?.vkLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>📹</span>
                  <span>{currentLang === 'om' ? 'Google Meet Seenuu (Join Meeting)' : 'ወደ Google Meet ይግቡ (Join Meeting)'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(session?.googleMeetLink || session?.vkLink || '');
                      alert(currentLang === 'om' ? 'Liinkiin waraabbameera!' : 'ሊንኩ ተቀድቷል!');
                    }
                  }}
                  className="px-3.5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-800 cursor-pointer"
                  title="Copy Meeting Link"
                >
                  📋
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 italic">
              {currentLang === 'om'
                ? 'Liinkiin Google Meet barbaadamu Kiosk Control Dashboard irraa qindaa’aa jira...'
                : 'የGoogle Meet ሊንክ ከኪዮስክ ኮንትሮል ዳሽቦርድ በመጠበቅ ላይ ይገኛል...'}
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-6 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 items-center justify-center">
                {session?.status === 'active' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${session?.status === 'active' ? 'bg-emerald-400' : 'bg-amber-500'}`} />
              </span>
              Session Status: <span className="font-semibold text-slate-200">{session?.status === 'active' ? 'ACTIVE' : 'WAITING'}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 items-center justify-center">
                {wsConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${wsConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-500'}`} />
              </span>
              WebSocket: <span className="font-semibold text-slate-200">{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskView;

