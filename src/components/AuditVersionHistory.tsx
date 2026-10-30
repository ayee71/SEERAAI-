import React, { useMemo, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { DossierAuditRecord } from '../services/dossierAuditService';
import { Language } from '../i18n/translations';
import { Clock, ArrowLeftRight as GitDiff, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

interface AuditVersionHistoryProps {
  history: DossierAuditRecord[];
  currentLang: Language;
  onSelectAudit: (audit: DossierAuditRecord) => void;
}

export const AuditVersionHistory: React.FC<AuditVersionHistoryProps> = ({
  history,
  currentLang,
  onSelectAudit,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'diff'>('timeline');
  const [selectedAuditA, setSelectedAuditA] = useState<string | null>(null);
  const [selectedAuditB, setSelectedAuditB] = useState<string | null>(null);

  // Helper to extract articles from text
  const extractArticles = (text: string): string[] => {
    // Matches "Keeyyata X", "Article X", "አንቀጽ X"
    const regex = /(?:Keeyyata|Article|አንቀጽ|Kwt|Art)\s*(\d+)/gi;
    const matches = Array.from(text.matchAll(regex));
    return Array.from(new Set(matches.map(m => m[1])));
  };

  // Prepare data for the chart
  const chartData = useMemo(() => {
    if (!history.length) return [];
    
    // Reverse to show oldest to newest in evolution
    const sortedHistory = [...history].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
      return dateA - dateB;
    });

    return sortedHistory.map((audit, index) => {
      const articles = extractArticles(audit.auditResult);
      const date = audit.createdAt?.toDate?.()?.toLocaleDateString() || `Session ${index + 1}`;
      
      const entry: any = {
        name: date,
        violations: articles.length,
        articles: articles.join(', '),
        fullDate: audit.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'
      };

      // Also count frequency of top articles if we want more granular mapping
      articles.forEach(art => {
        entry[`Art_${art}`] = 1;
      });

      return entry;
    });
  }, [history]);

  const auditA = history.find(h => h.id === selectedAuditA);
  const auditB = history.find(h => h.id === selectedAuditB);

  const getDiff = (textA: string, textB: string) => {
    const artsA = extractArticles(textA);
    const artsB = extractArticles(textB);
    
    const added = artsB.filter(x => !artsA.includes(x));
    const removed = artsA.filter(x => !artsB.includes(x));
    const common = artsA.filter(x => artsB.includes(x));

    return { added, removed, common };
  };

  const diff = auditA && auditB ? getDiff(auditA.auditResult, auditB.auditResult) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
        <button
          onClick={() => setViewMode('timeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            viewMode === 'timeline' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          {currentLang === 'om' ? 'Evolution Timeline' : 'Evolution Timeline'}
        </button>
        <button
          onClick={() => setViewMode('diff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            viewMode === 'diff' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <GitDiff className="w-4 h-4" />
          {currentLang === 'om' ? 'Compare Audits' : 'Compare Audits'}
        </button>
      </div>

      {viewMode === 'timeline' ? (
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                {currentLang === 'om' ? 'Statutory Contradiction Frequency' : 'Statutory Contradiction Frequency'}
              </h3>
              <span className="text-xs text-slate-500 italic">Tracking Article Violations Over Time</span>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10}
                    label={{ value: 'Violations', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                    itemStyle={{ color: '#fbbf24' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Line 
                    type="monotone" 
                    dataKey="violations" 
                    name="Article Violations"
                    stroke="#fbbf24" 
                    strokeWidth={3} 
                    dot={{ fill: '#fbbf24', r: 6 }} 
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((audit) => (
              <div 
                key={audit.id} 
                onClick={() => onSelectAudit(audit)}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-mono text-slate-500">
                      {audit.createdAt?.toDate?.()?.toLocaleString() || 'Recent'}
                    </span>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                    {extractArticles(audit.auditResult).length} Violations
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors truncate">
                  {audit.fileName}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-1">
                  {extractArticles(audit.auditResult).slice(0, 4).map(art => (
                    <span key={art} className="bg-slate-800 px-1.5 rounded text-slate-400">Art. {art}</span>
                  ))}
                  {extractArticles(audit.auditResult).length > 4 && <span>...</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Baseline Audit</label>
              <select 
                value={selectedAuditA || ''} 
                onChange={(e) => setSelectedAuditA(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200"
              >
                <option value="">-- Select Audit A --</option>
                {history.map(h => (
                  <option key={h.id} value={h.id}>{h.createdAt?.toDate?.()?.toLocaleString() || 'Recent'} - {h.fileName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Comparison Audit</label>
              <select 
                value={selectedAuditB || ''} 
                onChange={(e) => setSelectedAuditB(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200"
              >
                <option value="">-- Select Audit B --</option>
                {history.map(h => (
                  <option key={h.id} value={h.id}>{h.createdAt?.toDate?.()?.toLocaleString() || 'Recent'} - {h.fileName}</option>
                ))}
              </select>
            </div>
          </div>

          {auditA && auditB && diff && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-300">Baseline Audit</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{auditA.createdAt?.toDate?.()?.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 h-96 overflow-y-auto text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {auditA.auditResult}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-300">Comparison Audit</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{auditB.createdAt?.toDate?.()?.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 h-96 overflow-y-auto text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {auditB.auditResult}
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h4 className="text-base font-bold text-slate-100 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Statutory Contradiction Delta
                </h4>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Resolved / Removed</div>
                    <div className="flex flex-wrap gap-2">
                      {diff.removed.length ? diff.removed.map(art => (
                        <span key={art} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Art. {art}</span>
                      )) : <span className="text-[10px] text-slate-600 italic">None</span>}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
                    <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">New Contradictions</div>
                    <div className="flex flex-wrap gap-2">
                      {diff.added.length ? diff.added.map(art => (
                        <span key={art} className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">Art. {art}</span>
                      )) : <span className="text-[10px] text-slate-600 italic">None</span>}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Persistent Violations</div>
                    <div className="flex flex-wrap gap-2">
                      {diff.common.length ? diff.common.map(art => (
                        <span key={art} className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-[10px] font-bold">Art. {art}</span>
                      )) : <span className="text-[10px] text-slate-600 italic">None</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(!selectedAuditA || !selectedAuditB) && (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl text-slate-500">
              <GitDiff className="w-10 h-10 mb-4 opacity-20" />
              <p className="text-sm font-medium">Select two audit sessions to compare their results side-by-side.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
