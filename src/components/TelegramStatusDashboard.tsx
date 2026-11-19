import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { RefreshCw, CheckCircle2, AlertTriangle, Shield, Send, Activity, Terminal, Play, Radio, MessageSquare, Zap, Cpu } from 'lucide-react';
import { auth } from '../services/firebase';

interface TelegramStatusDashboardProps {
  currentLang: Language;
}

export const TelegramStatusDashboard: React.FC<TelegramStatusDashboardProps> = ({ currentLang }) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState(false);
  const [pollingStarting, setPollingStarting] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [miniAppTesting, setMiniAppTesting] = useState(false);
  const [miniAppTestResult, setMiniAppTestResult] = useState<any>(null);
  const [bridgeTestToken, setBridgeTestToken] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const lastCheckedErrorIdRef = React.useRef<string | null>(null);

  const getAuthHeaders = async (includeJson = false): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    } catch {
      // Ignore if unauthenticated
    }
    return headers;
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status', { headers: await getAuthHeaders(false) });
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);

        // Check for new error logs in recentLogs
        if (data.recentLogs && data.recentLogs.length > 0) {
          const latestError = data.recentLogs.find((log: any) => log.status === 'error' || log.status === 'failed');
          if (latestError && latestError.id !== lastCheckedErrorIdRef.current) {
            lastCheckedErrorIdRef.current = latestError.id;
            setToastMessage({
              text: currentLang === 'om' 
                ? `⚠️ Dogoggorri Telegram Bot uumameera: ${latestError.error}` 
                : `⚠️ Telegram webhook error detected: ${latestError.error}`,
              type: 'error'
            });
            setTimeout(() => setToastMessage(null), 6000);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Telegram status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleStartPolling = async () => {
    setPollingStarting(true);
    try {
      const res = await fetch('/api/telegram/start-polling', { method: 'POST', headers: await getAuthHeaders(false) });
      const data = await res.json();
      if (res.ok && data.ok) {
        setToastMessage({
          text: currentLang === 'om'
            ? '✓ Sirni Long-Polling eegalameera! Bot @AyebeBot amma kallattiin deebisa.'
            : '✓ Telegram Long-Polling started! @AyebeBot is now actively answering.',
          type: 'success'
        });
        fetchStatus();
      } else {
        throw new Error(data.error || 'Failed to start polling');
      }
    } catch (err: any) {
      setToastMessage({
        text: `⚠️ ${err.message}`,
        type: 'error'
      });
    } finally {
      setPollingStarting(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleTestConnectivity = async () => {
    setTestingConn(true);
    try {
      const res = await fetch('/api/telegram/test-connectivity', { headers: await getAuthHeaders(false) });
      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage({
          text: currentLang === 'om'
            ? `✓ Bot Telegram @${data.bot?.username || 'AyebeBot'} waliin walqunnamtiin mirkanaa'eera!`
            : `✓ Successfully verified connectivity with @${data.bot?.username || 'AyebeBot'}!`,
          type: 'success'
        });
        fetchStatus();
      } else {
        throw new Error(data.message || 'Connectivity check failed');
      }
    } catch (err: any) {
      setToastMessage({
        text: `⚠️ Connectivity test error: ${err.message}`,
        type: 'error'
      });
    } finally {
      setTestingConn(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleResyncWebhook = async () => {
    setResyncing(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      } catch {
        // Ignore token lookup error when signed out
      }
      if (bridgeTestToken.trim()) {
        headers['x-telegram-setup-secret'] = bridgeTestToken.trim();
      }
      const res = await fetch('/api/telegram/setup-webhook', {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setToastMessage({
          text: currentLang === 'om'
            ? '✓ Serverless Webhook Bot milkaa\'inaan haaromfamee mirkanaa\'eera!'
            : '✓ Telegram Serverless Webhook configured & verified!',
          type: 'success'
        });
        fetchStatus();
      } else {
        throw new Error(data.error || 'Failed to resync webhook');
      }
    } catch (err: any) {
      setToastMessage({
        text: `⚠️ Webhook Setup: ${err.message}`,
        type: 'error'
      });
    } finally {
      setResyncing(false);
      setTimeout(() => setToastMessage(null), 6000);
    }
  };

  const handleTestMiniAppBridge = async () => {
    setMiniAppTesting(true);
    setMiniAppTestResult(null);
    try {
      const res = await fetch('/api/telegram/test-miniapp-bridge', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          question: 'Labsii hojjataa lakk 1156/2019 waa\'ee mirga boqonnaa maal jedha?',
          language: currentLang,
          telegramUserId: 99887766,
          ...(bridgeTestToken.trim() ? { bridgeToken: bridgeTestToken.trim() } : {})
        })
      });

      const data = await res.json();
      setMiniAppTestResult(data);
      if (res.ok && data.ok) {
        setToastMessage({
          text: currentLang === 'om'
            ? '✓ Qorannoon Mini App Bridge milkaa\'eera! Deebiin AI argameera.'
            : '✓ Mini App Bridge API test succeeded! AI legal response retrieved.',
          type: 'success'
        });
      } else {
        throw new Error(data.error || 'Request failed');
      }
    } catch (err: any) {
      setToastMessage({
        text: `⚠️ MiniApp Bridge test failed: ${err.message}`,
        type: 'error'
      });
    } finally {
      setMiniAppTesting(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const isPolling = Boolean(statusData?.pollingActive || statusData?.mode === 'polling');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-24 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-top-3 ${
          toastMessage.type === 'error' 
            ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' 
            : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
        }`}>
          <span>{toastMessage.type === 'error' ? '⚠️' : '✨'}</span>
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Telegram Bot Monitoring & Mini App Gateway</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {currentLang === 'om' ? 'To\'annoo Bot Telegram & Mini App API' : 'የቴሌግራም ቦት እና ሚኒ አፕ ሁኔታ መቆጣጠሪያ'}
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            {currentLang === 'om' 
              ? 'Haala qunnamtii @AyebeBot, sirna long-polling, webhook, fi API Mini App (/api/miniapp/legal-ask) asitti hordofaa.' 
              : 'የ @AyebeBot ግንኙነት፣ የሎንግ ፖሊንግ ሁኔታ፣ ዌብሁክ እና የሚኒ አፕ ኤፒአይን እዚህ ይቆጣጠሩ።'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleStartPolling}
            disabled={pollingStarting}
            className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 ${
              isPolling
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${pollingStarting ? 'animate-spin' : ''}`} />
            <span>{pollingStarting ? 'Starting...' : isPolling ? 'Polling Active (Restart)' : 'Activate Polling'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestConnectivity}
            disabled={testingConn}
            className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${testingConn ? 'animate-spin' : ''}`} />
            <span>{testingConn ? 'Testing...' : 'Test Bot Connection'}</span>
          </button>

          <button
            type="button"
            onClick={handleResyncWebhook}
            disabled={resyncing}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resyncing ? 'animate-spin' : ''}`} />
            <span>{resyncing ? 'Re-syncing...' : 'Re-sync Webhook'}</span>
          </button>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bot Profile & Mode */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Bot Profile</span>
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-1">
            <div className="text-lg font-bold text-white">@{statusData?.bot?.username || 'AyebeBot'}</div>
            <div className="text-xs text-slate-400">{statusData?.bot?.name || 'Ayeledha'}</div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Engine Mode:</span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
              isPolling
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : statusData?.mode === 'webhook'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {isPolling
                ? '● Long-Polling (Live)'
                : statusData?.mode === 'webhook'
                  ? '● Serverless Webhook'
                  : 'Stopped'}
            </span>
          </div>
        </div>

        {/* Webhook & Pending Updates */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Gateway Status</span>
            <Terminal className="w-5 h-5 text-sky-400" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-amber-300 truncate bg-slate-950 p-2.5 rounded-xl border border-slate-800" title={statusData?.webhook?.url || ''}>
              {isPolling
                ? 'Long-Polling Outbound (Active)'
                : statusData?.webhook?.url || 'No HTTPS webhook registered yet'}
            </div>
            <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
              <span>Pending Updates:</span>
              <span className="text-white font-bold">{statusData?.webhook?.pendingUpdateCount ?? 0}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>{statusData?.serverless ? 'Serverless Secret Token' : 'Direct Connection'}</span>
            <span className="text-emerald-400 font-bold">
              {statusData?.webhookSecretConfigured ? 'SHA-256 Verified' : 'Verified Outbound'}
            </span>
          </div>
        </div>

        {/* Last Error Status */}
        <div className={`border rounded-3xl p-6 space-y-4 shadow-xl ${
          statusData?.engineStatus?.lastError || statusData?.webhook?.lastErrorMessage
            ? 'bg-rose-950/20 border-rose-500/40' 
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Health Status</span>
            {statusData?.engineStatus?.lastError || statusData?.webhook?.lastErrorMessage ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-white">
              {statusData?.engineStatus?.lastError ? (
                <span className="text-rose-300">{statusData.engineStatus.lastError}</span>
              ) : statusData?.webhook?.lastErrorMessage ? (
                <span className="text-rose-300">{statusData.webhook.lastErrorMessage}</span>
              ) : (
                <span className="text-emerald-400">System Healthy & Operational</span>
              )}
            </div>
            {(statusData?.engineStatus?.lastErrorDate || statusData?.webhook?.lastErrorDate) && (
              <div className="text-[10px] text-slate-500 font-mono">
                {statusData?.engineStatus?.lastErrorDate || statusData?.webhook?.lastErrorDate}
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            Auto-refresh every 10s
          </div>
        </div>
      </div>

      {/* Mini App Bridge API Interactive Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase">
              <Zap className="w-3.5 h-3.5" />
              <span>Telegram Mini App Bridge Endpoint</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              POST /api/miniapp/legal-ask
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl">
              {currentLang === 'om'
                ? 'Serverless Telegram bot fi Mini App bridge endpoint. Bearer token MINIAPP_BRIDGE_SECRET (Settings → Secrets keessatti guutamu) fayyadama.'
                : 'Serverless Telegram bot & Mini App bridge endpoint. Uses Bearer MINIAPP_BRIDGE_SECRET configured in Settings → Secrets.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestMiniAppBridge}
            disabled={miniAppTesting}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Cpu className={`w-4 h-4 ${miniAppTesting ? 'animate-spin' : ''}`} />
            <span>{miniAppTesting ? 'Calling AI Bridge...' : 'Test Mini App Bridge API'}</span>
          </button>
        </div>

        {/* Optional Secret Token Verification Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="password"
            value={bridgeTestToken}
            onChange={(e) => setBridgeTestToken(e.target.value)}
            placeholder={
              currentLang === 'om'
                ? 'Yoo barbaaddan MINIAPP_BRIDGE_SECRET keessan mirkaneessuuf asitti galchaa (optional)...'
                : 'Optional: enter your MINIAPP_BRIDGE_SECRET to verify token match...'
            }
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Settings -> Secrets Readiness Checklist */}
        {statusData?.secretsStatus && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {currentLang === 'om' ? 'Haala Secrets Server (Settings → Secrets)' : 'Server Secrets Readiness'}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Mode: {statusData.secretsStatus.TELEGRAM_BOT_MODE}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {[
                { key: 'GEMINI_API_KEY', label: 'GEMINI_API_KEY', required: true },
                { key: 'TELEGRAM_BOT_TOKEN', label: 'TELEGRAM_BOT_TOKEN', required: true },
                { key: 'TELEGRAM_WEBHOOK_URL', label: 'TELEGRAM_WEBHOOK_URL', required: true },
                { key: 'MINIAPP_BRIDGE_SECRET', label: 'MINIAPP_BRIDGE_SECRET', required: true },
                { key: 'TELEGRAM_WEBHOOK_SECRET', label: 'TELEGRAM_WEBHOOK_SECRET', required: false },
                { key: 'TELEGRAM_SETUP_SECRET', label: 'TELEGRAM_SETUP_SECRET', required: false },
                { key: 'TELEGRAM_SERVERLESS_TOKEN', label: 'TELEGRAM_SERVERLESS_TOKEN', required: false },
                { key: 'OPENAI_API_KEY', label: 'OPENAI_API_KEY', required: false },
              ].map((item) => {
                const isSet = Boolean(statusData.secretsStatus[item.key]);
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <span className="font-mono text-[11px] text-slate-300 truncate">{item.label}</span>
                    <span
                      className={`text-[10px] font-mono font-semibold shrink-0 ${
                        isSet
                          ? 'text-emerald-400'
                          : item.required
                            ? 'text-amber-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {isSet ? 'Configured' : item.required ? 'Recommended' : 'Optional'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Endpoint Specs Snippet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Request Headers</div>
            <div className="text-sky-300">Content-Type: application/json</div>
            <div className="text-amber-300">Authorization: Bearer &lt;YOUR_MINIAPP_BRIDGE_SECRET&gt;</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Request Body JSON</div>
            <div className="text-slate-300">
              {'{'}
              <br />
              &nbsp;&nbsp;"question": "Gaaffii seeraa keessan...",
              <br />
              &nbsp;&nbsp;"language": "om",
              <br />
              &nbsp;&nbsp;"telegramUserId": 12345
              <br />
              {'}'}
            </div>
          </div>
        </div>

        {/* Live Test Result */}
        {miniAppTestResult && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 text-xs space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-amber-300 font-bold">
              <span>Live Bridge Response (Status: OK)</span>
              <span className="text-[10px] text-slate-400 font-mono">Model: {miniAppTestResult.metadata?.modelUsed}</span>
            </div>
            <div className="text-slate-200 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {miniAppTestResult.answer}
            </div>
            {miniAppTestResult.sources && miniAppTestResult.sources.length > 0 && (
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="font-bold text-slate-300">Maddoota Seeraa:</span>
                <span>{miniAppTestResult.sources.join(' • ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity / Telegram Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              {currentLang === 'om' ? 'Galmeewwan Telegram (telegram_logs)' : 'የቴሌግራም የምዝግብ ማስታወሻዎች'}
            </h3>
            <p className="text-xs text-slate-400">Firestore telegram_logs collection audit trail</p>
          </div>
          <button
            type="button"
            onClick={fetchStatus}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading Telegram audit logs...</div>
          ) : !statusData?.recentLogs || statusData.recentLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No logs recorded in Firestore yet. Send a message to @AyebeBot to test!</div>
          ) : (
            statusData.recentLogs.map((log: any) => {
              const isErr = log.status === 'error' || log.status === 'failed';
              const displayTime = log.timestamp && !isNaN(new Date(log.timestamp).getTime())
                ? new Date(log.timestamp).toLocaleTimeString()
                : 'Recent';
              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isErr
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                        isErr ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {log.status}
                      </span>
                      {log.mode && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          {log.mode}
                        </span>
                      )}
                      <span className="font-mono text-slate-400 text-[11px]">User: @{log.username || log.sender || 'Anonymous'}</span>
                    </div>
                    {log.error && (
                      <div className="text-rose-300 font-mono text-[11px] pt-1">Error: {log.error}</div>
                    )}
                    {(log.bodySummary || log.textSummary) && (
                      <div className="text-slate-400 text-[11px] font-mono truncate max-w-xl">Query: {log.bodySummary || log.textSummary}</div>
                    )}
                    {log.answerSummary && (
                      <div className="text-emerald-400/80 text-[11px] font-mono truncate max-w-xl">Deebii: {log.answerSummary}</div>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 shrink-0">
                    {displayTime}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
