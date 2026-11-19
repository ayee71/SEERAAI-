import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Scale, FileText, ChevronRight, ExternalLink, BookOpen, Hash, Tag, RotateCcw } from 'lucide-react';
import { findGlobalCitationReferences, CitationReferenceMatch } from '../services/unifiedLegalDatabaseService';
import { OfficialLegalSourceInfo } from '../services/legalCitationTooltipScanner';

interface CitationLinkedInstancesPanelProps {
  currentLang: 'om' | 'am' | 'en';
}

type DocTypeFilter = 'all' | 'precedent' | 'master_index' | 'statute';

export const CitationLinkedInstancesPanel: React.FC<CitationLinkedInstancesPanelProps> = ({ currentLang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [citationKey, setCitationKey] = useState<string | null>(null);
  const [citationInfo, setCitationInfo] = useState<OfficialLegalSourceInfo | null>(null);
  const [instances, setInstances] = useState<CitationReferenceMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search input & document type filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocType, setSelectedDocType] = useState<DocTypeFilter>('all');

  useEffect(() => {
    const handleOpen = (e: any) => {
      const { citationKey, info } = e.detail;
      setCitationKey(citationKey);
      setCitationInfo(info);
      setIsOpen(true);
      setSearchQuery('');
      setSelectedDocType('all');
      fetchInstances(citationKey);
    };

    window.addEventListener('seera:open_citation_panel' as any, handleOpen);
    return () => window.removeEventListener('seera:open_citation_panel' as any, handleOpen);
  }, []);

  const fetchInstances = async (key: string) => {
    setIsLoading(true);
    try {
      const results = await findGlobalCitationReferences(key);
      setInstances(results);
    } catch (err) {
      console.error('Failed to fetch citation instances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const closePanel = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedDocType('all');
  };

  const labels = {
    title: {
      om: 'Galmeewwan Walqabatan',
      am: 'ተያያዥ መዝገቦች',
      en: 'Linked Legal Instances'
    },
    searchPlaceholder: {
      om: 'Lakk. galmee ykn gosa sanadaatiin calali...',
      am: 'በመዝገብ ቁጥር ወይም በሰነድ ዓይነት ይፈልጉ...',
      en: 'Filter by case number or document type...'
    },
    allTypes: {
      om: 'Hunda',
      am: 'ሁሉም',
      en: 'All'
    },
    precedents: {
      om: 'Murtiilee Ijibbaataa',
      am: 'የሰበር ውሳኔዎች',
      en: 'Precedents'
    },
    masterIndex: {
      om: 'Baafata Master',
      am: 'ማስተር ማውጫ',
      en: 'Master Index'
    },
    statutes: {
      om: 'Labsii / Seera',
      am: 'አዋጆች / ሕጎች',
      en: 'Statutes'
    },
    noResults: {
      om: 'Galmeen murtii ijibbaataa keewwata kana caqase hin argamne.',
      am: 'ይህንን አንቀጽ የሚጠቅስ የሰበር ውሳኔ አልተገኘም።',
      en: 'No cassation precedents found referencing this citation.'
    },
    noFilterMatches: {
      om: 'Calaltuu filatameen galmeen walsimu hin argamne.',
      am: 'በተመረጠው ማጣሪያ ተዛማጅ መዝገብ አልተገኘም።',
      en: 'No instances match your search criteria.'
    },
    clearFilter: {
      om: 'Calaltuu Qulqulleessi',
      am: 'ማጣሪያ አጽዳ',
      en: 'Reset filters'
    },
    loading: {
      om: 'Galmeewwan barbaadaa jira...',
      am: 'መዝገቦችን በመፈለግ ላይ...',
      en: 'Searching linked instances...'
    },
    viewPrecedent: {
      om: 'Murtii Ilaali',
      am: 'ውሳኔውን እይ',
      en: 'View Precedent'
    },
    caseNumberBadge: {
      om: 'Lakk. Galmee',
      am: 'መ.ቁ.',
      en: 'Case No.'
    },
    filterStats: {
      om: (filtered: number, total: number) => `Galmee ${filtered} / ${total} mul'achaa jira`,
      am: (filtered: number, total: number) => `ከ${total} ውስጥ ${filtered} መዝገቦች እየታዩ ነው`,
      en: (filtered: number, total: number) => `Showing ${filtered} of ${total} instances`
    }
  };

  // Filter linked instances by case number, document type, and category
  const filteredInstances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return instances.filter(instance => {
      // 1. Document Type Pill Filter
      if (selectedDocType !== 'all') {
        if (instance.type !== selectedDocType) return false;
      }

      // 2. Search Query (Case Number or Document Type / Category / Title / Summary)
      if (!q) return true;

      const caseNumber = (instance.metadata?.fileNumber || '').toString().toLowerCase();
      const docType = (instance.type || '').toLowerCase();
      const category = (instance.metadata?.category || '').toLowerCase();
      const citation = (instance.citation || '').toLowerCase();
      const title = (
        (instance.title.om || '') + ' ' +
        (instance.title.am || '') + ' ' +
        (instance.title.en || '')
      ).toLowerCase();
      const summary = (
        (instance.summary.om || '') + ' ' +
        (instance.summary.am || '') + ' ' +
        (instance.summary.en || '')
      ).toLowerCase();

      // Check match against case number directly
      const matchesCaseNumber = caseNumber.includes(q) || citation.includes(q);

      // Check match against document type keywords (trilingual: precedent, master, statute, ijibbaata, seber, etc.)
      const matchesDocType = 
        docType.includes(q) ||
        category.includes(q) ||
        (docType === 'precedent' && (
          q.includes('precedent') || 
          q.includes('ijibbaata') || 
          q.includes('ሰበር') || 
          q.includes('murtii') ||
          q.includes('decision')
        )) ||
        (docType === 'master_index' && (
          q.includes('master') || 
          q.includes('baafata') || 
          q.includes('ማውጫ') || 
          q.includes('index')
        )) ||
        (docType === 'statute' && (
          q.includes('statute') || 
          q.includes('seera') || 
          q.includes('labsii') || 
          q.includes('አዋጅ') || 
          q.includes('ሕግ')
        ));

      // Check match against title or summary keywords
      const matchesText = title.includes(q) || summary.includes(q);

      return matchesCaseNumber || matchesDocType || matchesText;
    });
  }, [instances, searchQuery, selectedDocType]);

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'precedent':
        return {
          label: currentLang === 'om' ? 'Murtii Ijibbaataa' : currentLang === 'am' ? 'የሰበር ውሳኔ' : 'Cassation Precedent',
          icon: Scale,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        };
      case 'master_index':
        return {
          label: currentLang === 'om' ? 'Baafata Master' : currentLang === 'am' ? 'ማስተር ማውጫ' : 'Master Index',
          icon: BookOpen,
          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
        };
      case 'statute':
        return {
          label: currentLang === 'om' ? 'Labsii / Seera' : currentLang === 'am' ? 'አዋጅ / ሕግ' : 'Statute',
          icon: FileText,
          color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
        };
      default:
        return {
          label: type,
          icon: Tag,
          color: 'bg-slate-700/50 text-slate-300 border-slate-600'
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-slate-900 border-l border-slate-800 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
            <Scale className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{labels.title[currentLang]}</h3>
            <p className="text-[10px] text-amber-400/90 font-mono uppercase tracking-wider">{citationKey}</p>
          </div>
        </div>
        <button 
          onClick={closePanel}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          title="Cufi (Close)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Citation Summary */}
      {citationInfo && (
        <div className="p-3.5 bg-amber-500/5 border-b border-slate-800/80">
          <h4 className="text-xs font-bold text-amber-400 mb-1 leading-snug">
            {citationInfo.officialTitle[currentLang]}
          </h4>
          <p className="text-[11px] text-slate-300 leading-relaxed italic line-clamp-2">
            {citationInfo.officialSource[currentLang]}
          </p>
        </div>
      )}

      {/* Search Input & Document Type Filter */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={labels.searchPlaceholder[currentLang]}
            className="w-full bg-slate-900 border border-slate-700/70 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800"
              title="Qulqulleessi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Doc Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
          {[
            { key: 'all' as DocTypeFilter, label: labels.allTypes[currentLang] },
            { key: 'precedent' as DocTypeFilter, label: labels.precedents[currentLang], icon: Scale },
            { key: 'master_index' as DocTypeFilter, label: labels.masterIndex[currentLang], icon: BookOpen },
            { key: 'statute' as DocTypeFilter, label: labels.statutes[currentLang], icon: FileText }
          ].map((tab) => {
            const active = selectedDocType === tab.key;
            const count = tab.key === 'all' 
              ? instances.length 
              : instances.filter(i => i.type === tab.key).length;
            
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedDocType(tab.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all border ${
                  active 
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm' 
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.icon && <tab.icon className="w-3 h-3" />}
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  active ? 'bg-amber-500/30 text-amber-200 font-bold' : 'bg-slate-700/70 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Counter */}
        {instances.length > 0 && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-0.5 pt-0.5">
            <span>{labels.filterStats[currentLang](filteredInstances.length, instances.length)}</span>
            {(searchQuery || selectedDocType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDocType('all');
                }}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 underline underline-offset-2"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>{labels.clearFilter[currentLang]}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium animate-pulse">{labels.loading[currentLang]}</p>
          </div>
        ) : instances.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
              <Search className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              {labels.noResults[currentLang]}
            </p>
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="text-center py-16 px-6 bg-slate-800/20 rounded-2xl border border-slate-800">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-700">
              <Search className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-xs text-slate-300 font-medium mb-1">
              {labels.noFilterMatches[currentLang]}
            </p>
            <p className="text-[11px] text-slate-500 mb-4">
              "{searchQuery}"
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDocType('all');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium border border-slate-700 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{labels.clearFilter[currentLang]}</span>
            </button>
          </div>
        ) : (
          filteredInstances.map((instance) => {
            const badge = getDocTypeBadge(instance.type);
            const BadgeIcon = badge.icon;
            const fileNumber = instance.metadata?.fileNumber;

            return (
              <div 
                key={instance.id}
                className="group bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3.5 hover:border-amber-500/40 hover:bg-slate-800/80 transition-all cursor-pointer shadow-sm hover:shadow-md"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('seera:navigate', {
                    detail: { tab: 'cassation', query: fileNumber || instance.id }
                  }));
                  closePanel();
                }}
              >
                {/* Top Badges: Citation + Case Number + Doc Type */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Doc Type Badge */}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.color}`}>
                      <BadgeIcon className="w-2.5 h-2.5" />
                      <span>{badge.label}</span>
                    </span>

                    {/* Case Number Badge */}
                    {fileNumber && (
                      <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" />
                        <span>{labels.caseNumberBadge[currentLang]}: {fileNumber}</span>
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>

                {/* Title */}
                <h5 className="text-[13px] font-bold text-slate-100 group-hover:text-amber-300 transition-colors mb-1.5 line-clamp-2 leading-snug">
                  {instance.title[currentLang]}
                </h5>

                {/* Summary */}
                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed mb-3">
                  {instance.summary[currentLang]}
                </p>
                
                {/* Footer Metadata */}
                <div className="pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono truncate max-w-[190px]">
                    {instance.citation}
                  </span>
                  <span className="font-bold text-amber-400 flex items-center gap-1 group-hover:underline">
                    {labels.viewPrecedent[currentLang]}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-500 text-center flex items-center justify-center gap-2">
        <Scale className="w-3 h-3 text-amber-500/70" />
        <span>SEERAAI PRO • Global Citation Intelligence</span>
      </div>
    </div>
  );
};
