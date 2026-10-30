import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { subscribeToRealtimeAnalytics, RealtimeAnalyticsEvent, isOwnerAccount } from '../services/realtimeTracker';

interface LiveAnalyticsDashboardProps {
  currentLang: Language;
}

export const LiveAnalyticsDashboard: React.FC<LiveAnalyticsDashboardProps> = ({ currentLang }) => {
  const [events, setEvents] = useState<RealtimeAnalyticsEvent[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  useEffect(() => {
    // Attach real-time onSnapshot listener - updates live without needing to refresh
    const unsubscribe = subscribeToRealtimeAnalytics((liveEvents) => {
      setEvents(liveEvents);
      setIsLiveConnected(true);
    });

    return () => unsubscribe();
  }, []);

  // Compute live real-time statistics (excluding owner)
  const externalEvents = events.filter((e) => !isOwnerAccount(undefined, e.userName));
  const totalVisits = externalEvents.filter((e) => e.actionType === 'visit').length;
  const totalExplains = externalEvents.filter((e) => e.actionType === 'explain_law').length;
  const totalAnalyses = externalEvents.filter((e) => e.actionType === 'doc_analysis' || e.actionType === 'risk_analysis' || e.actionType === 'summarize').length;
  const totalCassation = externalEvents.filter((e) => e.actionType === 'cassation' || e.actionType === 'cassation_lookup').length;
  const totalTranslations = externalEvents.filter((e) => e.actionType === 'translate').length;

  // Unique visitors count based on userId or userName
  const uniqueUsers = new Set(externalEvents.map((e) => e.userId || e.userName)).size;

  const filteredEvents = externalEvents.filter((e) => {
    const matchesAction = filterAction === 'all' || e.actionType === filterAction;
    if (!matchesAction) return false;
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (e.userName && e.userName.toLowerCase().includes(q)) ||
      (e.details && e.details.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q)) ||
      (e.actionType && e.actionType.toLowerCase().includes(q))
    );
  });

  const formatEventTime = (event: RealtimeAnalyticsEvent): string => {
    if (!event.createdAt) return 'Amma (Just now)';
    try {
      if ('seconds' in event.createdAt) {
        const date = new Date(event.createdAt.seconds * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {}
    return 'Amma';
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'explain_law':
        return { emoji: '⚖️', label: 'Ibsa Seeraa (Explain Law)', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'doc_analysis':
      case 'risk_analysis':
        return { emoji: '📄', label: 'Xiinxala Sanadaa (Doc Analysis)', bg: 'bg-red-500/20 text-red-300 border-red-500/40' };
      case 'summarize':
        return { emoji: '📊', label: 'Cuunfaa Sanadaa (Summary)', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'cassation':
      case 'cassation_lookup':
        return { emoji: '🏛️', label: 'Dhaddacha Ijoo (Cassation)', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'translate':
        return { emoji: '🌐', label: 'Hiikkaa Seeraa (Translation)', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
      case 'template':
        return { emoji: '📝', label: 'Unka Waliigaltee (Templates)', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'glossary':
        return { emoji: '📖', label: 'Galmee Jechootaa (Glossary)', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      default:
        return { emoji: '👥', label: 'Seensa Appii (Visit / Browse)', bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
                <span>Baayyina Fayyadamtootaa & Hojiilee Live (Real-Time Analytics)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Osoo fuula haaromsuun (reload) hin barbaachisin, namoonni yeroo ammaa seenaa jiraniifi maal akka fayyadaman kallattiin mul'isa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>🟢 Real-Time Live Sync Active</span>
            </span>
          </div>
        </div>

        {/* 5 Real-Time Live Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
          {/* Card 1: Total Users */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-lg">👥</span>
              <span className="text-[10px] uppercase font-bold text-slate-500">Visitors</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-amber-300 font-mono">{uniqueUsers || events.length}</div>
              <div className="text-[10px] text-slate-400">Namoota Seenan</div>
            </div>
          </div>

          {/* Card 2: Legal Explanations */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-lg">⚖️</span>
              <span className="text-[10px] uppercase font-bold text-amber-500/80">Explains</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-amber-400 font-mono">{totalExplains}</div>
              <div className="text-[10px] text-slate-400">Ibsa Seeraa</div>
            </div>
          </div>

          {/* Card 3: Document Analyses */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-lg">📄</span>
              <span className="text-[10px] uppercase font-bold text-red-400/80">Analyses</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-red-300 font-mono">{totalAnalyses}</div>
              <div className="text-[10px] text-slate-400">Xiinxala Sanadaa</div>
            </div>
          </div>

          {/* Card 4: Cassation Precedents */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-lg">🏛️</span>
              <span className="text-[10px] uppercase font-bold text-emerald-400/80">Cassation</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-emerald-300 font-mono">{totalCassation}</div>
              <div className="text-[10px] text-slate-400">Dhaddacha Ijoo</div>
            </div>
          </div>

          {/* Card 5: Translations */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-lg">🌐</span>
              <span className="text-[10px] uppercase font-bold text-sky-400/80">Translate</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-sky-300 font-mono">{totalTranslations}</div>
              <div className="text-[10px] text-slate-400">Hiikkaa Seeraa</div>
            </div>
          </div>

          {/* Card 6: Total Event Actions Stream */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-lg">⚡</span>
              <span className="text-[10px] uppercase font-bold text-purple-400/80">Total Activity</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-purple-300 font-mono">{events.length}</div>
              <div className="text-[10px] text-slate-400">Gochaalee Waliigalaa</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls for Real-Time Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: 'Hunda (All Activities)', emoji: '⚡' },
              { id: 'explain_law', label: 'Ibsa Seeraa', emoji: '⚖️' },
              { id: 'doc_analysis', label: 'Xiinxala Sanadaa', emoji: '📄' },
              { id: 'cassation', label: 'Dhaddacha Ijoo', emoji: '🏛️' },
              { id: 'translate', label: 'Hiikkaa', emoji: '🌐' },
              { id: 'visit', label: 'Seensa (Visits)', emoji: '👥' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterAction(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                  filterAction === tab.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Maqaa ykn qabiyyee barbaadi..."
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
            />
          </div>
        </div>

        {/* Live Activity Stream Cards */}
        <div className="space-y-2.5 pt-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800/80 text-slate-500 text-xs">
              <span className="text-2xl block mb-2">📡</span>
              <span>Yeroo ammaa gochi galmaa'e hin jiru. Namoonni yemmuu seenanii fi qoratan asitti kallattiin mul'atu.</span>
            </div>
          ) : (
            filteredEvents.map((item, idx) => {
              const badge = getActionBadge(item.actionType);
              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">{badge.emoji}</span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-200">
                          {item.userName || 'Ogeessa Seeraa'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {item.category && item.category !== 'General' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 font-mono text-amber-300">
                            {item.category}
                          </span>
                        )}
                        {item.referrer && item.referrer !== 'Direct' && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            via: <strong className="text-amber-400">{item.referrer}</strong>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">
                        {item.details || 'Fayyadamaa jira'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-[11px] font-mono text-slate-500 sm:self-center">
                    {formatEventTime(item)}
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
