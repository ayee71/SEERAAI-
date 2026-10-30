import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { resolveCourtLink, getAllCourtLinks, CourtLinkDetails } from '../utils/courtLinkUtils';
import { Globe, Search, ArrowRight, Copy, Check, ExternalLink, ShieldCheck, Landmark, Sparkles, Building2 } from 'lucide-react';

interface CourtDomainLauncherBarProps {
  currentLang: Language;
  onSelectCourtFolder?: (court: CourtLinkDetails) => void;
  className?: string;
}

export const CourtDomainLauncherBar: React.FC<CourtDomainLauncherBarProps> = ({
  currentLang,
  onSelectCourtFolder,
  className = ''
}) => {
  const [addressInput, setAddressInput] = useState('court://mmwo.serai');
  const [activeResolved, setActiveResolved] = useState<CourtLinkDetails | null>(() => resolveCourtLink('court://mmwo.serai'));
  const [isCopied, setIsCopied] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');

  const allCourtLinks = getAllCourtLinks();

  const handleLaunchDomain = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const resolved = resolveCourtLink(addressInput);
    if (resolved) {
      setActiveResolved(resolved);
      setAddressInput(resolved.fullHttpUrl);
      if (onSelectCourtFolder) {
        onSelectCourtFolder(resolved);
      }
    }
  };

  const handleCopyLink = () => {
    if (!activeResolved) return;
    navigator.clipboard.writeText(activeResolved.fullHttpUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const filteredCatalog = allCourtLinks.filter(c => {
    if (selectedLevelFilter !== 'all' && c.level !== selectedLevelFilter) return false;
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      return (
        c.courtName.toLowerCase().includes(q) ||
        c.domainHandle.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.zoneOrCity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Interactive Domain URL Address Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 shadow-2xl space-y-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-amber-300 font-bold">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>🌐 TARREE LINKI MANNEEN MURTII (COURT VIRTUAL DOMAIN ROUTER)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCatalogModal(true)}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>
              {currentLang === 'om' ? 'Manneen Murtii Hunda Tarreessi' : 'View All Court Domains'}
            </span>
          </button>
        </div>

        <form onSubmit={handleLaunchDomain} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-3 flex items-center gap-1.5 text-slate-400 text-xs font-mono select-none">
              <Globe className="w-4 h-4 text-amber-400" />
            </div>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="e.g. court://mmagurbicha.serai ykn mmaadaamaa.serai"
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-24 py-2.5 text-xs text-amber-300 font-mono focus:outline-none transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="absolute right-2 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer border border-slate-700"
              title="Copy Court URL"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>{currentLang === 'om' ? 'Fooldara Seeni' : 'Open Court Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Launch Buttons for Popular Courts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar text-[11px]">
          <span className="text-slate-500 font-mono text-[10px] uppercase shrink-0 mr-1">Fakkeenya:</span>
          {[
            { name: 'Gurbicha', domain: 'court://mmagurbicha.serai' },
            { name: 'Adaamaa', domain: 'court://mmaadaamaa.serai' },
            { name: 'Shawaa Bahaa', domain: 'court://mmoshawaabahaa.serai' },
            { name: 'Oromiyaa Supreme', domain: 'court://mmwo.serai' },
            { name: 'Federaalaa Cassation', domain: 'court://mmwf.serai' }
          ].map((quick) => (
            <button
              key={quick.domain}
              type="button"
              onClick={() => {
                setAddressInput(quick.domain);
                const res = resolveCourtLink(quick.domain);
                if (res) {
                  setActiveResolved(res);
                  if (onSelectCourtFolder) onSelectCourtFolder(res);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 font-mono text-[10px] whitespace-nowrap transition-all cursor-pointer flex items-center gap-1"
            >
              <span>🏛️</span>
              <span>{quick.name} ({quick.domain.replace('court://', '')})</span>
            </button>
          ))}
        </div>

        {/* Resolved Court Active Banner */}
        {activeResolved && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-sm shrink-0">
                🏛️
              </div>
              <div>
                <div className="font-bold text-white text-xs font-serif-legal">
                  {activeResolved.courtName}
                </div>
                <div className="text-[10px] text-amber-300 font-mono flex items-center gap-2">
                  <span>URL: {activeResolved.fullHttpUrl}</span>
                  <span>• {activeResolved.zoneOrCity}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onSelectCourtFolder) onSelectCourtFolder(activeResolved);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{currentLang === 'om' ? 'Kaffana Mana Murtii' : 'Enter Folder'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Catalog Modal displaying Link registry for ALL courts */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                  🌐
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif-legal">
                    {currentLang === 'om' ? 'Kuusaa Linkii Manneen Murtii Oromiyaa fi Federaalaa' : 'Oromia & Federal Court Domain Registry'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Total Registered Court Subdomains: {allCourtLinks.length}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder={currentLang === 'om' ? 'Maqaa mana murtii ykn linkii barbaadi...' : 'Search court name or domain link...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All Levels' },
                  { id: 'first_instance', label: 'Aanaa (MMA)' },
                  { id: 'high_court', label: 'Ol\'aanaa (MMO)' },
                  { id: 'supreme_court', label: 'Waliigala (MMWO)' },
                  { id: 'cassation', label: 'Ijibbaata (MMWF)' }
                ].map(flt => (
                  <button
                    key={flt.id}
                    type="button"
                    onClick={() => setSelectedLevelFilter(flt.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedLevelFilter === flt.id
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Court Domain Cards List with Subtle Fade-In Animation */}
            <div 
              key={`catalog-list-${selectedLevelFilter}-${catalogSearch}`}
              className="flex-1 overflow-y-auto pr-1 space-y-2.5 py-1 animate-folder-fade-in"
            >
              {filteredCatalog.map((court, cIdx) => (
                <div
                  key={court.slug}
                  style={{ animationDelay: `${Math.min(cIdx * 20, 180)}ms` }}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group animate-folder-fade-in"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs group-hover:text-amber-300 transition-colors">
                        {court.courtName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                        court.level === 'supreme_court' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        court.level === 'cassation' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                        court.level === 'high_court' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {court.level.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-amber-400 font-bold flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-amber-300">
                        {court.fullHttpUrl}
                      </span>
                      <span className="text-slate-500 font-sans text-[10px]">({court.zoneOrCity} • {court.seat})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(court.fullHttpUrl);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Copy Court Domain"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAddressInput(court.fullHttpUrl);
                        setActiveResolved(court);
                        setShowCatalogModal(false);
                        if (onSelectCourtFolder) onSelectCourtFolder(court);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{currentLang === 'om' ? 'Seeni' : 'Select'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-400">
              <span>💡 Akkaataa maqaa mana murtii keessaniitiin linkiin addaa qophaa'eera.</span>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                Cufi (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
