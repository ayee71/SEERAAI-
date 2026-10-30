import React, { useState, useMemo } from 'react';
import { CassationPrecedent } from '../data/cassationPrecedents';
import { 
  BookOpen, 
  Scale, 
  ShieldAlert, 
  Gavel, 
  Home, 
  Briefcase, 
  FileText, 
  Users, 
  Landmark, 
  ChevronRight, 
  Hash,
  Info 
} from 'lucide-react';
import { Language } from '../i18n/translations';

interface CassationBaafataProps {
  categories: { id: string; label: string }[];
  precedents: CassationPrecedent[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  onSelectArticle: (article: string) => void;
  onSelectRuling?: (fileNumber: string) => void;
  currentLang: Language;
}

export const CassationBaafata: React.FC<CassationBaafataProps> = ({
  categories,
  precedents,
  selectedCategory,
  onSelectCategory,
  onSelectArticle,
  onSelectRuling,
  currentLang,
}) => {
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  // Group precedents by article for the selected category
  const articleGroups = useMemo(() => {
    if (selectedCategory === 'all') return [];
    
    const catPrecedents = precedents.filter(p => p.category === selectedCategory);
    const groups: { [key: string]: CassationPrecedent[] } = {};

    catPrecedents.forEach(p => {
      p.statutoryProvisions.forEach(prov => {
        const matches = prov.match(/(?:Art\.|Art|Kwt\.|Kwt|K\.|K|Keeyyata|Anqats)\s*(\d+)/i);
        if (matches && matches[1]) {
          const artNum = matches[1];
          if (!groups[artNum]) groups[artNum] = [];
          if (!groups[artNum].some(existing => existing.id === p.id)) {
            groups[artNum].push(p);
          }
        }
      });
    });

    return Object.entries(groups)
      .sort(([a], [b]) => parseInt(a) - parseInt(b));
  }, [selectedCategory, precedents]);

  // Pre-calculate category counts for efficiency
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    precedents.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [precedents]);

  const getIcon = (id: string) => {
    switch (id) {
      case 'sdfhh': return <Scale className="w-5 h-5 text-amber-400" />;
      case 'sdfy': return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'civil': return <BookOpen className="w-5 h-5 text-emerald-400" />;
      case 'criminal': return <Gavel className="w-5 h-5 text-red-400" />;
      case 'administrative': return <Landmark className="w-5 h-5 text-sky-400" />;
      case 'property': return <Home className="w-5 h-5 text-orange-400" />;
      case 'labor': return <Briefcase className="w-5 h-5 text-yellow-400" />;
      case 'contract': return <FileText className="w-5 h-5 text-indigo-400" />;
      case 'family': return <Users className="w-5 h-5 text-pink-400" />;
      case 'commercial': return <Landmark className="w-5 h-5 text-blue-400" />;
      default: return <Landmark className="w-5 h-5 text-slate-400" />;
    }
  };

  const thematicGroups = [
    { 
      id: 'late_appeals', 
      label: currentLang === 'om' ? 'Ol-iyyannoo Yeroo Darbe' : 'Late Appeals', 
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      article: '323',
      description: currentLang === 'om' ? 'Murtiilee iyyannoo yeroon irra darbe irratti kennaman' : 'Rulings on admissibility of out-of-time appeals'
    },
    { 
      id: 'jurisdiction', 
      label: currentLang === 'om' ? 'Aangoo Abbaa Seerummaa' : 'Jurisdiction', 
      icon: <Scale className="w-5 h-5 text-sky-400" />,
      article: '6',
      description: currentLang === 'om' ? 'Murtiilee aangoo mana murtii irratti kennaman' : 'Rulings on material and pecuniary jurisdiction'
    },
    { 
      id: 'execution', 
      label: currentLang === 'om' ? 'Raawwachiisa Murtii' : 'Execution', 
      icon: <Gavel className="w-5 h-5 text-emerald-400" />,
      article: '372',
      description: currentLang === 'om' ? 'Murtiilee raawwachiisa murtii irratti kennaman' : 'Rulings on execution of court decrees'
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. View Header with Integrated Menu (Thematic Folders) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-3xl bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/20">
              <Landmark className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-serif-legal tracking-tight">Baafata Murteewwanii</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Cassation Master Index Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-black border border-emerald-500/30 uppercase tracking-wider">
              Live Database
            </span>
          </div>
        </div>

        {/* Thematic Directory Row - This is the primary "Menu" entry for common issues */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {thematicGroups.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onSelectCategory('sdfhh'); 
                onSelectArticle(theme.article);
              }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all text-left group shadow-lg"
            >
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-amber-500/20 transition-colors shrink-0">
                {theme.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-100 group-hover:text-amber-300 transition-colors uppercase tracking-tight">{theme.label}</h4>
                <p className="text-[9px] text-slate-500 font-bold truncate mt-0.5">{theme.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Telegram Archive Cassation Decisions (Murtiilee Dhaddacha Ijibbaataatiin Laatame) */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">✈️</span>
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Murtiilee Dhaddacha Ijibbaataatiin Laatame (Telegram Archive & Master Files)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30">
              {precedents.filter(p => p.id.startsWith('file-') || p.courtName?.om?.includes('Telegram')).length} Telegram Decisions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {precedents
              .filter(p => p.id.startsWith('file-') || p.courtName?.om?.includes('Telegram'))
              .slice(0, 6)
              .map(p => (
                <div
                  key={p.id}
                  onClick={() => onSelectRuling?.(p.fileNumber)}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 text-left cursor-pointer transition-all group shadow-md space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30">
                      Lakk. Galmee {p.fileNumber}
                    </span>
                    <span className="text-[9px] font-mono text-amber-400">
                      {p.volume ? `Vol. ${p.volume}` : 'Telegram Master'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                    {p.parties.om}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    <strong>Hikkoo / Holding:</strong> {p.bindingPrinciple.om}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-900">
                    <span className="uppercase text-amber-500/80 font-bold">{p.category}</span>
                    <span>Bara {p.yearEC}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 2. Browse by Legal Area */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Hash className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Browse by Legal Area (Gosa Seeraan)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.filter(c => c.id !== 'all').map((cat) => {
            const isActive = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  setExpandedArticle(null);
                  setTimeout(() => {
                    const el = document.getElementById('index-directory-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className={`group text-left p-5 rounded-3xl border transition-all flex flex-col gap-4 h-full relative overflow-hidden ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-500 shadow-2xl shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                }`}
              >
                {isActive && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />}
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl transition-colors ${isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-amber-500/70 border border-slate-800'}`}>
                    {getIcon(cat.id)}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono font-bold text-slate-500">Cases</span>
                    <span className={`text-lg font-black font-mono ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {count.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className={`text-xs font-black tracking-tight uppercase ${isActive ? 'text-amber-300' : 'text-slate-100 group-hover:text-amber-400'}`}>
                    {cat.label.split('(')[0].trim()}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight">
                    {cat.label.includes('(') ? cat.label.split('(')[1].replace(')', '') : ''}
                  </p>
                </div>
                <div className={`mt-auto flex items-center gap-1.5 text-[9px] font-black uppercase transition-all ${isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400'}`}>
                  <span>Open Index</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${isActive ? 'translate-x-1' : ''}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Article Navigation with Nested Rulings */}
      {selectedCategory !== 'all' && (
        <div id="index-directory-section" className="mt-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 scroll-mt-24">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500 text-slate-950">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                  {categories.find(c => c.id === selectedCategory)?.label.split('(')[0]}: Article Index
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sectioned Precedents</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                {articleGroups.length} Indexed Articles
              </span>
            </div>
          </div>
          
          {articleGroups.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
              <div className="w-10 h-10 text-slate-700 mx-auto mb-3 flex items-center justify-center text-2xl">🏛️</div>
              <p className="text-slate-500 text-sm font-medium">No article-specific precedents indexed for this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articleGroups.map(([art, group]) => (
                <div key={art} className="group/item flex flex-col gap-2">
                  <button
                    onClick={() => setExpandedArticle(expandedArticle === art ? null : art)}
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all text-left ${
                      expandedArticle === art
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-xl shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 text-amber-300 hover:border-amber-500/40 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${expandedArticle === art ? 'bg-slate-950 text-amber-500' : 'bg-slate-950 text-slate-500'}`}>
                        {art}
                      </div>
                      <span className="text-xs font-black uppercase tracking-tight">K. {art}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono border ${expandedArticle === art ? 'bg-slate-950/20 border-slate-950/20 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        {group.length}
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${expandedArticle === art ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {expandedArticle === art && (
                    <div className="mx-2 flex flex-col gap-2 p-3 rounded-2xl bg-slate-950/50 border border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-300">
                      {group.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => onSelectRuling?.(p.fileNumber)}
                          className="group/card text-left px-4 py-3 rounded-xl hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-amber-500 group-hover/card:text-amber-400 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Lakk. {p.fileNumber}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                              VOL. {p.volume}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 font-bold leading-snug line-clamp-2">
                            {p.parties.om}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest pt-1 border-t border-slate-900">
                            <span>📅 {p.yearEC} B.A.</span>
                            <span>•</span>
                            <span className="text-amber-500/60 uppercase font-black">Binding</span>
                          </div>
                        </div>
                      ))}
                      
                      <button 
                        onClick={() => onSelectArticle(art)}
                        className="w-full py-2 mt-1 text-[9px] font-black text-center text-slate-500 hover:text-amber-400 uppercase tracking-widest transition-colors border-t border-slate-900"
                      >
                        Search All Cases for Art {art} →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
