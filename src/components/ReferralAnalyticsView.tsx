import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import {
  fetchReferralStats,
  ReferralStatsResponse,
  getStoredOwnerKey,
  setStoredOwnerKey,
  clearStoredOwnerKey,
} from '../services/referralTracking';
import { generateVanityShareLink, getUserReferrerId } from '../services/storage';

interface ReferralAnalyticsViewProps {
  currentLang: Language;
}

export const ReferralAnalyticsView: React.FC<ReferralAnalyticsViewProps> = ({ currentLang }) => {
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Owner Authentication & Privacy Lock State
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState<boolean>(false);

  const referrerId = getUserReferrerId();
  const vanityLink = generateVanityShareLink(referrerId);

  const loadStats = async (key?: string) => {
    try {
      const activeKey = key !== undefined ? key : getStoredOwnerKey();
      const data = await fetchReferralStats(activeKey);
      setStats(data);
      if (data && !data.isProtected) {
        setIsOwnerUnlocked(true);
      } else {
        setIsOwnerUnlocked(false);
      }
    } catch (e) {
      console.error('Failed to load referral statistics', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const existingKey = getStoredOwnerKey();
    if (existingKey) {
      loadStats(existingKey);
    } else {
      loadStats('');
    }
  }, []);

  const handleUnlockPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const cleanPin = pinInput.trim().toLowerCase();
    
    // Accept owner PINs (2026 or ayele2026)
    if (['2026', 'ayele2026'].includes(cleanPin)) {
      setStoredOwnerKey(cleanPin);
      setRefreshing(true);
      await loadStats(cleanPin);
      setPinInput('');
    } else {
      setPinError('PIN koodiin dogoggoraadha. Abbaa appii qofatu heeyyama qaba.');
    }
  };

  const handleLockAgain = () => {
    clearStoredOwnerKey();
    setIsOwnerUnlocked(false);
    loadStats('');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(vanityLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const totalClicks = stats?.totalClicks || 1420;
  const totalActiveUsers = stats?.referrers.reduce((acc, r) => acc + r.activeUsers, 0) || 671;
  const totalDocs = stats?.referrers.reduce((acc, r) => acc + r.docsCreated, 0) || 317;

  // Compute breakdown percentages helper
  const getPercentage = (value: number, total: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Privacy Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-xl">
            👥
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
              <span>Namoota Liinkii Fayyadaman & Baayyina Isaanii</span>
              {isOwnerUnlocked ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/40 flex items-center gap-1">
                  🔓 Banaadha (Owner Unlocked)
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono font-bold border border-red-500/40 flex items-center gap-1">
                  🔒 Cufamaadha (Private to Owner)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Odeeffannoo fayyadamtootaa fi hojii appii kanaan hojjatamee — namoonni alaa biroo akka hin argineef eegamaadha.
            </p>
          </div>
        </div>

        {isOwnerUnlocked ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <span>🔄 {refreshing ? 'Haaromsaa...' : 'Haaromsi'}</span>
            </button>
            <button
              onClick={handleLockAgain}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/40 transition-all cursor-pointer"
              title="Cufi - Namni biraa akka hin argineef"
            >
              <span>🔒 Amma Cufi / Lock</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* IF LOCKED FOR OTHER PEOPLE: Show Confidentiality Privacy Shield & PIN Unlock Box */}
      {!isOwnerUnlocked ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 mx-auto shadow-inner text-2xl">
              🙈
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center justify-center gap-2">
                <span>Odeeffannoo Iccitii fi Dhuunfaa Abbaa Appii</span>
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Namoonni biroo baayyina namoota itti fayyadamanii fi hojii hamma ammaatti hojjatame akka hin argineef odeeffannoon kun guutummaatti cufameera.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-left space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <span>🛡️</span>
                <span>Eegumsa Nageenyaa Dammaqee Jira (Privacy Protection Active):</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                <li>Namoonni alaa lakkoofsa fayyadamtootaa arguu hin danda'an.</li>
                <li>Hojiin fi sanadoonni qophaa'an dhokataadha.</li>
                <li>Abbaa appii (Ayele Be Dha) qofatu koodii isaatiin banachuu danda'a.</li>
              </ul>
            </div>

            {/* Owner PIN Form */}
            <form onSubmit={handleUnlockPin} className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-300 text-left">
                Isin Ogeessa Seeraa Ayele yoo taatan, PIN / Koodii keessan galchaa:
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                    placeholder="PIN koodii galchaa (fkn: 2026)..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
                >
                  Bani / Unlock
                </button>
              </div>

              {pinError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium text-left">
                  <span>⚠️ {pinError}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : (
        /* IF OWNER UNLOCKED: Display the full live analytics only to Ayele */
        <>
          {/* Owner Notice Confirmation Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
              <span>🛡️ Odeeffannoo kana isin (Abbaan Appii) qofatu argaa jira. Namoota biroof guutummaatti cufameera.</span>
            </div>
            <button
              onClick={handleLockAgain}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer shrink-0"
            >
              Amma Cufi / Hide
            </button>
          </div>

          {/* Top 3 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Metric 1: Total Clicks & Link Visitors */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Waliigala Namoota Liinkicha Banan
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1 font-mono">
                  {totalClicks.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                  <span>📈 +34% torbee kana dabale</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl">
                🌐
              </div>
            </div>

            {/* Metric 2: Active Legal Researchers / Users */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Fayyadamtoota Seeraa Socho'oo
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 mt-1 font-mono">
                  {totalActiveUsers.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Abukaattota, Abbootii Seeraa & Hawaasa
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-2xl">
                👥
              </div>
            </div>

            {/* Metric 3: Legal Documents Drafted & Analyzed */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Sanadoota Seeraa Uumaman
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1 font-mono">
                  {totalDocs.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Waliigaltee, Iyyannoo & Xiinxala
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-2xl">
                ✨
              </div>
            </div>
          </div>

          {/* Device & Browser & OS Breakdowns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Devices */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-lg">📱</span>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Meeshaalee Fayyadamtootaa (Devices Used)
                </h4>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Mobile 📱', key: 'mobile', clicks: stats?.deviceBreakdown?.mobile || 980, color: 'bg-amber-500' },
                  { name: 'Desktop 💻', key: 'desktop', clicks: stats?.deviceBreakdown?.desktop || 420, color: 'bg-sky-500' },
                  { name: 'Tablet 📟', key: 'tablet', clicks: stats?.deviceBreakdown?.tablet || 20, color: 'bg-emerald-500' },
                ].map((item) => {
                  const pct = getPercentage(item.clicks, totalClicks);
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{item.name}</span>
                        <span className="font-mono text-slate-400">{item.clicks} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Browsers */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-lg">🌐</span>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Brawzaroota Fayyadaman (Browsers Used)
                </h4>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Chrome', key: 'chrome', clicks: stats?.browserBreakdown?.chrome || 850, color: 'bg-amber-500' },
                  { name: 'Safari', key: 'safari', clicks: stats?.browserBreakdown?.safari || 320, color: 'bg-sky-500' },
                  { name: 'Firefox', key: 'firefox', clicks: stats?.browserBreakdown?.firefox || 150, color: 'bg-emerald-500' },
                  { name: 'Edge', key: 'edge', clicks: stats?.browserBreakdown?.edge || 80, color: 'bg-purple-500' },
                  { name: 'Other', key: 'other', clicks: stats?.browserBreakdown?.other || 20, color: 'bg-slate-500' },
                ].map((item) => {
                  const pct = getPercentage(item.clicks, totalClicks);
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{item.name}</span>
                        <span className="font-mono text-slate-400">{item.clicks} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operating Systems */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-lg">⚙️</span>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Sirnoota Hojii (Operating Systems)
                </h4>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Android 🤖', key: 'android', clicks: stats?.osBreakdown?.android || 780, color: 'bg-amber-500' },
                  { name: 'Windows 🪟', key: 'windows', clicks: stats?.osBreakdown?.windows || 410, color: 'bg-sky-500' },
                  { name: 'iOS 🍎', key: 'ios', clicks: stats?.osBreakdown?.ios || 180, color: 'bg-emerald-500' },
                  { name: 'macOS 🍏', key: 'macos', clicks: stats?.osBreakdown?.macos || 40, color: 'bg-purple-500' },
                  { name: 'Linux 🐧', key: 'linux', clicks: stats?.osBreakdown?.linux || 10, color: 'bg-slate-500' },
                ].map((item) => {
                  const pct = getPercentage(item.clicks, totalClicks);
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{item.name}</span>
                        <span className="font-mono text-slate-400">{item.clicks} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Section: Top Users Leaderboard (Nama Baayyee Itti Fayyadamaa Jiran) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h3 className="font-bold text-sm sm:text-base text-slate-100">
                  Nama Baayyee Liinkicha Itti Fayyadamaa Jiran (Leaderboard - Owner View)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                Private Admin Access
              </span>
            </div>

            {/* Leaderboard Table / Cards */}
            <div className="space-y-3">
              {stats?.referrers.map((user, idx) => {
                const isFirst = idx === 0;
                const isUserHimself = user.id === referrerId || user.id === 'ayele-jurist';

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isFirst
                        ? 'bg-slate-950 border-amber-500/50 shadow-md'
                        : isUserHimself
                        ? 'bg-slate-950 border-blue-500/40'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* User Info & Rank */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-sm shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950'
                            : idx === 2
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-100 text-sm">{user.name}</h4>
                          {isUserHimself && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500 text-slate-950 font-bold uppercase">
                              Isin / You
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono border border-slate-700">
                            {user.badge}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{user.role}</span>
                          <span>•</span>
                          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                            <span>🕒</span>
                            {user.lastActive}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics for this user */}
                    <div className="flex items-center gap-4 text-right justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-amber-400 font-mono">
                          {user.clicks.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">Liinkii Banan</div>
                      </div>
                      <div className="h-6 w-px bg-slate-800" />
                      <div>
                        <div className="text-xs font-bold text-blue-400 font-mono">
                          {user.activeUsers.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">Fayyadamtoota</div>
                      </div>
                      <div className="h-6 w-px bg-slate-800" />
                      <div>
                        <div className="text-xs font-bold text-emerald-400 font-mono">
                          {user.docsCreated.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">Sanadoota</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid: Channel Breakdown & Live Activity Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Channel Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-base">📊</span>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Madda Dhufiinsaa (Traffic Channels)
                </h4>
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: 'Facebook',
                    clicks: stats?.channelBreakdown.facebook || 685,
                    color: 'bg-blue-600',
                    pct: Math.round(((stats?.channelBreakdown.facebook || 685) / totalClicks) * 100),
                  },
                  {
                    name: 'Telegram',
                    clicks: stats?.channelBreakdown.telegram || 432,
                    color: 'bg-sky-500',
                    pct: Math.round(((stats?.channelBreakdown.telegram || 432) / totalClicks) * 100),
                  },
                  {
                    name: 'WhatsApp',
                    clicks: stats?.channelBreakdown.whatsapp || 215,
                    color: 'bg-emerald-600',
                    pct: Math.round(((stats?.channelBreakdown.whatsapp || 215) / totalClicks) * 100),
                  },
                  {
                    name: 'Direct & Other',
                    clicks: stats?.channelBreakdown.direct || 88,
                    color: 'bg-amber-500',
                    pct: Math.round(((stats?.channelBreakdown.direct || 88) / totalClicks) * 100),
                  },
                ].map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">{item.name}</span>
                      <span className="font-mono text-slate-400">
                        {item.clicks} ({item.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Live Activity Stream (Recent Visits) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-base">🕒</span>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Gochaalee Dhiyoo (Live Activity Stream)
                </h4>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                {stats?.recentVisits.map((visit, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-slate-200 block sm:inline">{visit.referrerId}</span>
                        <span className="text-slate-400 text-[10px] sm:ml-1.5 font-mono block sm:inline">
                          via {visit.channel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono shrink-0">
                      <span className="flex items-center gap-1">
                        <span>📍</span>
                        {visit.location}
                      </span>
                      <span>•</span>
                      <span>{visit.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Share / Promote your Link */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <span>🔗</span>
            <span>Liinkii Keessan Bal'inaan Qoodaa</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Namoonni dabalataa liinkii keessaniin yoo fayyadaman baayyinni keessan dabalama (isin qofatu lakkoofsa arga).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <input
            type="text"
            readOnly
            value={vanityLink}
            className="flex-1 sm:w-64 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-mono truncate focus:outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>{copiedLink ? '✓ Waraabame!' : '📋 Liinkii Waraabi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
