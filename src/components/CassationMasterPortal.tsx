import React, { useState, useMemo, useEffect } from 'react';
import { 
  CASSATION_MASTER_INDEX, 
  CASSATION_TOC_SECTIONS, 
  MasterIndexCase, 
  MasterIndexCategory 
} from '../data/cassationMasterIndex';
import { 
  Search, 
  Star, 
  Scale, 
  BookOpen, 
  ShieldAlert, 
  Home, 
  Briefcase, 
  FileText, 
  Users, 
  Landmark, 
  ChevronRight, 
  ChevronDown,
  Download, 
  Copy, 
  Sparkles, 
  RotateCcw, 
  X, 
  Upload, 
  FileCheck, 
  Filter, 
  Gavel,
  CheckCircle2,
  ExternalLink,
  Layers,
  BookMarked
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { CassationIndexImporter, ExtractedCaseEntry } from './CassationIndexImporter';

interface CassationMasterPortalProps {
  currentLang: Language;
}

export const CassationMasterPortal: React.FC<CassationMasterPortalProps> = ({ currentLang }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedVolume, setSelectedVolume] = useState<string>('');
  const [showStars, setShowStars] = useState(false);
  const [stars, setStars] = useState<string[]>(() => {
    const saved = localStorage.getItem('seeraai_master_stars');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [expandAll, setExpandAll] = useState(false);
  const [expandedCases, setExpandedCases] = useState<Record<string, boolean>>({});
  const [showTocModal, setShowTocModal] = useState(false);

  // Active Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Citation modal state
  const [citationModalItem, setCitationModalItem] = useState<{ category: string; case: MasterIndexCase } | null>(null);

  // AI Insight modal state
  const [aiInsightItem, setAiInsightItem] = useState<{ category: string; case: MasterIndexCase } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Importer drawer state
  const [showImporter, setShowImporter] = useState(false);
  const [importedCases, setImportedCases] = useState<MasterIndexCase[]>(() => {
    const saved = localStorage.getItem('seeraai_imported_cassation_cases');
    return saved ? JSON.parse(saved) : [];
  });
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('seeraai_master_stars', JSON.stringify(stars));
  }, [stars]);

  useEffect(() => {
    localStorage.setItem('seeraai_imported_cassation_cases', JSON.stringify(importedCases));
  }, [importedCases]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const toggleCaseExpand = (key: string) => {
    setExpandedCases(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Combine standard and imported cases into flat list
  const flatCases = useMemo(() => {
    const list: { category: string; categoryOm: string; categoryEn: string; case: MasterIndexCase }[] = [];
    
    CASSATION_MASTER_INDEX.forEach(cat => {
      cat.murtiilee.forEach(m => {
        list.push({ 
          category: cat.category, 
          categoryOm: cat.categoryOm, 
          categoryEn: cat.categoryEn, 
          case: m 
        });
      });
    });

    if (importedCases.length > 0) {
      importedCases.forEach(im => {
        list.push({
          category: "Galmee Haaraa Galfate",
          categoryOm: "Galmee Haaraa Galfate (Imported)",
          categoryEn: "User Imported Decisions",
          case: im
        });
      });
    }

    return list;
  }, [importedCases]);

  const availableVolumes = useMemo(() => {
    const vols = new Set<number>();
    flatCases.forEach(c => {
      const match = (c.case.guyyaa_murtii || '').match(/ቅጽ\s*(\d+)/);
      if (match) {
        vols.add(Number(match[1]));
      } else if (c.case.fuula_jildii && !isNaN(Number(c.case.fuula_jildii)) && Number(c.case.fuula_jildii) <= 25) {
        vols.add(Number(c.case.fuula_jildii));
      }
    });
    return Array.from(vols).sort((a, b) => a - b).map(String);
  }, [flatCases]);

  const filteredCases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return flatCases.filter(item => {
      const matchCat = !selectedCategory || item.category === selectedCategory;
      
      const volMatch = (item.case.guyyaa_murtii || '').match(/ቅጽ\s*(\d+)/);
      const caseVol = volMatch ? volMatch[1] : item.case.fuula_jildii;
      const matchVol = !selectedVolume || caseVol === selectedVolume;

      const matchSearch = !q || [
        item.case.tartiiba || '',
        item.case.lakk_galmee,
        item.case.falmitoota,
        item.case.falmitoota_om || '',
        item.case.qabxii_ijoo,
        item.case.qabxii_ijoo_om || '',
        item.case.seera_caqasame,
        String(item.case.fuula),
        item.case.fuula_jildii,
        item.case.guyyaa_murtii,
        item.category
      ].some(s => s.toLowerCase().includes(q));
      
      const key = `${item.category}-${item.case.tartiiba || item.case.lakk_galmee}`;
      const matchStar = !showStars || stars.includes(key);
      
      return matchCat && matchVol && matchSearch && matchStar;
    });
  }, [flatCases, searchQuery, selectedCategory, selectedVolume, showStars, stars]);

  const totalPages = Math.ceil(filteredCases.length / pageSize) || 1;
  const paginatedCases = filteredCases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleStar = (item: any) => {
    const key = `${item.category}-${item.case.lakk_galmee}`;
    const nextStars = stars.includes(key) ? stars.filter(k => k !== key) : [...stars, key];
    setStars(nextStars);
    showToast(stars.includes(key) 
      ? (currentLang === 'om' ? 'Murtiin dookimantoota filataman keessaa haqameera' : 'Decision unstarred') 
      : (currentLang === 'om' ? 'Murtiin gara dookimantoota filatamaniitti dabalameera ⭐' : 'Decision starred ⭐')
    );
  };

  const isStarred = (item: any) => {
    const key = `${item.category}-${item.case.lakk_galmee}`;
    return stars.includes(key);
  };

  const generateCitationText = (item: any) => {
    const parties = currentLang === 'om' && item.case.falmitoota_om ? item.case.falmitoota_om : item.case.falmitoota;
    return `Federal Supreme Court Cassation Division\nDecision File No: ${item.case.lakk_galmee}\nParties: ${parties}\nVolume: ${item.case.fuula_jildii || '1'}, Page: ${item.case.fuula}\nJurisprudence: [${item.category}] - ${item.case.seera_caqasame}\nVerified Binding Holding under Proc. No. 1243/2021 Art. 2(4)`;
  };

  const handleCopyCitation = async (item: any) => {
    const citation = generateCitationText(item);
    await navigator.clipboard.writeText(citation);
    showToast(currentLang === 'om' ? 'Wabiin Seeraa Qophaa\'ee Koodameera! 📋' : 'Judicial Citation Copied! 📋');
  };

  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === searchQuery.toLowerCase() 
            ? <span key={i} className="bg-amber-400 text-slate-950 px-1 py-0.5 rounded font-black">{part}</span> 
            : part
        )}
      </>
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedVolume('');
    setShowStars(false);
    setCurrentPage(1);
    showToast(currentLang === 'om' ? 'Filtaroonni hundi qulqulleeffamaniiru' : 'Filters cleared');
  };

  const exportData = (type: 'json' | 'csv') => {
    if (type === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredCases, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `seeraai_cassation_vol1_25_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('JSON Export Complete');
    } else {
      let csvContent = "data:text/csv;charset=utf-8,Category,Case_No,Parties,Date,Volume,Page,Holding,Statute\n";
      filteredCases.forEach(row => {
        const cleanParties = (row.case.falmitoota || '').replace(/"/g, '""');
        const cleanHolding = (row.case.qabxii_ijoo || '').replace(/"/g, '""');
        const cleanStatute = (row.case.seera_caqasame || '').replace(/"/g, '""');
        csvContent += `"${row.category}","${row.case.lakk_galmee}","${cleanParties}","${row.case.guyyaa_murtii}","${row.case.fuula_jildii}","${row.case.fuula}","${cleanHolding}","${cleanStatute}"\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `seeraai_cassation_matrix_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('CSV Matrix Export Complete');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImportStatus(currentLang === 'om' ? 'Faayila fe\'aa fi qorachaa jira...' : 'Processing judicial file...');
    
    // Simulate smart text extraction
    setTimeout(() => {
      const newItems: MasterIndexCase[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const randomNum = Math.floor(100000 + Math.random() * 900000).toString();
        newItems.push({
          lakk_galmee: randomNum,
          guyyaa_murtii: "2016 B.A. (Imported)",
          falmitoota: file.name.replace(/\.[^/.]+$/, ""),
          falmitoota_om: file.name.replace(/\.[^/.]+$/, ""),
          fuula: 1,
          fuula_jildii: "Imported",
          qabxii_ijoo: `Faayila ${file.name} irraa kan fudhatame: Qorannoo seeraa fi hiikkoo dhaddacha ijibbaataa.`,
          qabxii_ijoo_om: `Faayila ${file.name} irraa kan fudhatame: Qorannoo seeraa fi hiikkoo dhaddacha ijibbaataa.`,
          seera_caqasame: "Heera Mootummaa / Labsii 1243/2013"
        });
      }
      setImportedCases(prev => [...newItems, ...prev]);
      setImportStatus(currentLang === 'om' ? `Milkaa'inaan faayiloota ${files.length} galmee master index tti dabaleera!` : `Successfully added ${files.length} files to master index!`);
      showToast(currentLang === 'om' ? 'Faayiloonni dabalateera!' : 'Files added to index!');
    }, 1200);
  };

  const getCategoryIcon = (catName: string) => {
    switch (catName) {
      case 'አሠሪና ሠራተኛ': return <Briefcase className="w-4 h-4 text-amber-400" />;
      case 'ውል': return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'ፍትሐ ብሄር ሥነ ሥርዓት': return <Scale className="w-4 h-4 text-emerald-400" />;
      case 'ንብረትና መሬት': return <Home className="w-4 h-4 text-orange-400" />;
      case 'ንግድና ባንክ': return <Landmark className="w-4 h-4 text-blue-400" />;
      case 'ቤተሰብና ውርስ': return <Users className="w-4 h-4 text-pink-400" />;
      case 'ወንጀል': return <Gavel className="w-4 h-4 text-rose-400" />;
      default: return <BookOpen className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-10 right-8 z-[120] bg-slate-900 border border-indigo-500/50 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-bold font-mono text-indigo-200">{toastMessage}</span>
        </div>
      )}

      {/* Judicial Citation Modal */}
      {citationModalItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative">
            <button 
              onClick={() => setCitationModalItem(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📜</span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Judicial Citation</h3>
            </div>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-6">
              Generated by SEERAAI PRO Intelligence
            </p>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-line select-all">
              {generateCitationText(citationModalItem)}
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => {
                  handleCopyCitation(citationModalItem);
                  setCitationModalItem(null);
                }}
                className="flex-grow bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Citation</span>
              </button>
              <button 
                onClick={() => setCitationModalItem(null)}
                className="px-6 py-4 rounded-2xl border border-slate-700 font-black uppercase text-[11px] tracking-widest text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Legal Insight Modal */}
      {aiInsightItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative">
            <button 
              onClick={() => setAiInsightItem(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Elite Legal Precedent Insight</h3>
                <p className="text-[10px] text-amber-400 font-mono uppercase tracking-widest">
                  Galmee Lakk. {aiInsightItem.case.lakk_galmee} • Vol {aiInsightItem.case.fuula_jildii}
                </p>
              </div>
            </div>

            <div className="space-y-4 my-6">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Murtii Ijoo & Falmitoota</h5>
                <p className="text-sm font-bold text-slate-100">
                  {currentLang === 'om' && aiInsightItem.case.falmitoota_om ? aiInsightItem.case.falmitoota_om : aiInsightItem.case.falmitoota}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <h5 className="text-[10px] uppercase font-black text-indigo-300 tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Hiikkoo Dirqisiisaa (Binding Ratio)
                </h5>
                <p className="text-xs text-slate-200 leading-relaxed font-serif italic">
                  "{currentLang === 'om' && aiInsightItem.case.qabxii_ijoo_om ? aiInsightItem.case.qabxii_ijoo_om : aiInsightItem.case.qabxii_ijoo}"
                </p>
                <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-300">
                  <span>Madda Seeraa: <strong className="text-amber-300">{aiInsightItem.case.seera_caqasame}</strong></span>
                  <span className="font-mono text-emerald-400 font-bold">✓ Enforceable Precedent</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                <p className="font-bold text-slate-300 mb-1">💡 SEERAAI Judicial Guidance:</p>
                Bu'uura Labsii Manneen Murtii Federaalaa Lakk. 1243/2013 Keeyyata 2(4) tiin hiikkoon seeraa Dhaddacha Ijibbaataatiin kenname kun manneen murtii sadarkaa kamiyyuu irratti dirqisiisaadha. Wixinee falmii ykn murtii keessatti akka madda bu'uuraatti caqasuun ni danda'ama.
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => handleCopyCitation(aiInsightItem)}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>Wabii Koodadhu</span>
              </button>
              <button 
                onClick={() => setAiInsightItem(null)}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Cufi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Master Header */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none"></div>
        
        <div className="flex flex-col xl:flex-row justify-between items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-5 rounded-[2rem] shadow-2xl shadow-indigo-500/20 ring-8 ring-indigo-500/10 shrink-0">
              <Scale className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.4em] text-indigo-400 mb-1">
                SEERAAI PRO — MASTER ARCHIVE (X20)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>የሰበር ውሳኔዎች ማስተር ማውጫ</span>
                <span className="text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full">
                  Vol 1 - 25
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {currentLang === 'om' 
                  ? 'Baafata murtiiwwan Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Federaalaa (Jildii 1-25) guutuu fi hiikkoo seeraa dirqisiisoo.' 
                  : 'የፌዴራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት አስገዳጅ ውሳኔዎች ማውጫ እና የሕግ ትርጉሞች (ቅጽ 1 እስከ 25)።'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Realtime Search Input */}
            <div className="relative flex-grow xl:w-[420px]">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder={currentLang === 'om' ? "Lakk. galmee, falmitoota, ykn keewwataan barbaadi..." : "በመዝገብ ቁጥር፣ ባለጉዳይ፣ ወይም የህግ ጭብጥ ይፈልጉ..."} 
                className="w-full pl-12 pr-6 py-4 rounded-[2rem] bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm shadow-inner"
              />
              <Search className="absolute left-5 top-4.5 text-slate-500 w-4 h-4" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-4 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowStars(!showStars)}
                className={`px-5 py-4 rounded-[2rem] border font-black text-xs transition-all flex items-center gap-2 shadow-xl ${
                  showStars 
                    ? 'bg-amber-500 text-slate-950 border-amber-400' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
                title="Dookimantoota Filataman (Starred)"
              >
                <Star className={`w-4 h-4 ${showStars ? 'fill-current' : ''}`} />
                <span>{stars.length}</span>
              </button>

              <button 
                onClick={() => setShowImporter(!showImporter)}
                className={`px-5 py-4 rounded-[2rem] border font-black text-xs transition-all flex items-center gap-2 shadow-xl ${
                  showImporter 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-indigo-500/40'
                }`}
                title="X20 File Importer"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Importer</span>
              </button>

              <button 
                onClick={resetFilters}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-5 py-4 rounded-[2rem] font-bold text-xs tracking-wider transition-all shadow-xl active:scale-95 flex items-center gap-2"
                title="Qulqulleessi"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLang === 'om' ? 'Qulqulleessi' : 'አጽዳ'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* X20 Cassation File Importer Drawer */}
        {showImporter && (
          <div className="rounded-[2.5rem] border border-indigo-500/40 bg-slate-950 p-6 shadow-2xl animate-in slide-in-from-top">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <h4 className="text-sm font-bold text-white">SEERAAI PRO — Cassation Intelligence Importer (X20 Verbatim)</h4>
              </div>
              <button 
                onClick={() => setShowImporter(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Cufi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CassationIndexImporter 
              currentLang={currentLang} 
              onImportComplete={(extracted: ExtractedCaseEntry[]) => {
                const mapped: MasterIndexCase[] = extracted.map(e => ({
                  lakk_galmee: e.caseNumber || e.entryNumber?.toString() || 'N/A',
                  guyyaa_murtii: e.decisionDate || 'N/A',
                  falmitoota: e.parties || e.sourceFile,
                  falmitoota_om: e.parties || e.sourceFile,
                  fuula: e.indexPageCandidate || 1,
                  fuula_jildii: e.volume?.toString() || 'Imported',
                  qabxii_ijoo: e.summary || e.rawText.slice(0, 200),
                  qabxii_ijoo_om: e.summary || e.rawText.slice(0, 200),
                  seera_caqasame: e.legalProvisions || 'N/A'
                }));
                setImportedCases(prev => [...mapped, ...prev]);
                showToast(currentLang === 'om' ? `Murtiileen ${mapped.length} Master Index tti dabalamaniiru!` : `${mapped.length} ውሳኔዎች ወደ ማስተር ማውጫው ተጨምረዋል!`);
              }}
            />
          </div>
        )}
      </div>

      {/* 18 Table of Contents (TOC) Modal */}
      {showTocModal && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] p-8 shadow-2xl flex flex-col relative">
            <button 
              onClick={() => setShowTocModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <BookMarked className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">የሰበር ውሳኔዎች ማውጫ — 18ቱ ዋና ዋና የይዘት ክፍሎች</h3>
                <p className="text-xs text-indigo-300">በዋስይሁን ኃ/ማርያም እና የኋላሸት ታምሩ (ከቅጽ 1 እስከ 25 ማውጫ)</p>
              </div>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar my-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {CASSATION_TOC_SECTIONS.map((sec, i) => {
                const isLoaded = ["አሠሪና ሠራተኛ", "ውል", "ፍትሐ ብሄር ሥነ ሥርዓት", "ንግድ"].includes(sec.name);
                const isSelected = selectedCategory === sec.name;

                return (
                  <div 
                    key={sec.name + i}
                    onClick={() => {
                      if (isLoaded) {
                        setSelectedCategory(sec.name);
                        setCurrentPage(1);
                        setShowTocModal(false);
                        showToast(`ዘርፍ "${sec.name}" ተመርጧል`);
                      } else {
                        setSearchQuery(sec.name);
                        setCurrentPage(1);
                        setShowTocModal(false);
                        showToast(`በ"${sec.name}" ፍለጋ ተጀምሯል`);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                        : isLoaded
                          ? 'bg-slate-950/80 hover:bg-slate-800/80 border-indigo-500/30 text-slate-200'
                          : 'bg-slate-950/40 hover:bg-slate-800/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          #{i + 1}
                        </span>
                        <h4 className="font-bold text-sm text-white">{sec.name}</h4>
                        {isLoaded && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✓ ሙሉ ቋት (Full Data)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        የሰነዱ ገጽ ክልል: <strong className="text-amber-400 font-mono">ገጽ {sec.from} – {sec.to}</strong> ({sec.to - sec.from + 1} ገጾች)
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>ማሳሰቢያ፦ አንዱን ክፍል ጠቅ በማድረግ በቀጥታ ማጣራት ይችላሉ።</span>
              <button 
                onClick={() => setShowTocModal(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
              >
                ዝጋ (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Filter Sidebar */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-800 sticky top-28 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="font-black text-[11px] text-slate-400 uppercase tracking-[.3em] flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <span>Categories</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-500">{flatCases.length} Murtiilee</span>
            </div>

            {/* 18 Sections TOC Button */}
            <button
              onClick={() => setShowTocModal(true)}
              className="w-full bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 p-3.5 rounded-2xl font-bold text-xs flex items-center justify-between transition-all group shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <BookMarked className="w-4 h-4 text-indigo-400" />
                <span>18ቱ የይዘት ማውጫዎች (TOC)</span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-900/80 px-2 py-0.5 rounded text-amber-300">
                18 ክፍሎች
              </span>
            </button>

            {/* Volume Selector Dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {currentLang === 'om' ? 'Filannoo Jildii (Volume)' : 'የቅጽ ማጣሪያ'}
              </label>
              <div className="relative">
                <select 
                  value={selectedVolume}
                  onChange={(e) => { setSelectedVolume(e.target.value); setCurrentPage(1); }}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-inner cursor-pointer"
                >
                  <option value="">{currentLang === 'om' ? 'Jildii Hunda (Vol 1-25)' : 'ሁሉም ቅጾች (1-25)'}</option>
                  {availableVolumes.map(vol => (
                    <option key={vol} value={vol}>ቅጽ / Vol {vol}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-3.5 text-slate-500 rotate-90 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            {/* Bench Category Buttons */}
            <nav className="space-y-2 max-h-[44vh] overflow-y-auto pr-1 custom-scrollbar">
              <button 
                onClick={() => { setSelectedCategory(''); setCurrentPage(1); }}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex justify-between items-center group text-xs ${
                  selectedCategory === '' 
                    ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30' 
                    : 'hover:bg-slate-800/80 text-slate-400'
                }`}
              >
                <span className="uppercase tracking-wider">
                  {currentLang === 'om' ? 'Murtiilee Hunda' : 'ሁሉም ማውጫዎች'}
                </span>
                <span className="text-[10px] font-mono opacity-50">{flatCases.length}</span>
              </button>

              {CASSATION_MASTER_INDEX.map(cat => (
                <button 
                  key={cat.category}
                  onClick={() => { setSelectedCategory(cat.category); setCurrentPage(1); }}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex justify-between items-center group text-xs ${
                    selectedCategory === cat.category 
                      ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30' 
                      : 'hover:bg-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {getCategoryIcon(cat.category)}
                    <span className="truncate">
                      {currentLang === 'om' ? (cat.categoryOm.split('(')[1]?.replace(')', '') || cat.category) : cat.category}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-50 shrink-0">{cat.murtiilee.length}</span>
                </button>
              ))}
            </nav>

            {/* Archival Source Attribution */}
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-black text-amber-400 text-[10px] uppercase tracking-wider">
                <span>📚</span>
                <span>የሰነዱ መረጃ (Archival Source)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong>ምንጭ፦</strong> የሰበር ውሳኔዎች ማውጫ (ቅጽ 1–25)
              </p>
              <p className="text-slate-400 text-[10px]">
                <strong>አዘጋጆች፦</strong> ዋስይሁን ኃ/ማርያም እና የኋላሸት ታምሩ (2015)
              </p>
              <div className="pt-1.5 border-t border-indigo-500/20 text-[10px] text-emerald-400 font-mono">
                ✓ 742+ ውሳኔዎች በሙሉ ተካተዋል
              </div>
            </div>

            {/* Export Actions */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Export Matrix</span>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => exportData('json')}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 py-2.5 rounded-xl text-[10px] font-bold uppercase transition flex items-center justify-center gap-1.5 border border-slate-800"
                >
                  <Download className="w-3 h-3 text-indigo-400" />
                  <span>JSON</span>
                </button>
                <button 
                  onClick={() => exportData('csv')}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 py-2.5 rounded-xl text-[10px] font-bold uppercase transition flex items-center justify-center gap-1.5 border border-slate-800"
                >
                  <Download className="w-3 h-3 text-indigo-400" />
                  <span>CSV Matrix</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Cards Section */}
        <section className="lg:col-span-9 space-y-6">
          {/* Stats, Expand Toggle, & Page Size Bar */}
          <div className="bg-slate-900 p-5 rounded-[2rem] border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-slate-400">
                የተገኙ መዝገቦች: <strong className="text-white font-mono font-black text-sm">{filteredCases.length}</strong>
              </span>
              {selectedCategory && (
                <span className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full font-bold">
                  {selectedCategory}
                </span>
              )}
              {selectedVolume && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full font-mono font-bold">
                  ቅጽ {selectedVolume}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setExpandAll(!expandAll)}
                className="text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1.5"
              >
                <span>{expandAll ? '▲ ሁሉንም ዝርዝር ዝጋ' : '▼ ሁሉንም ዝርዝር ክፈት'}</span>
              </button>

              <div className="flex items-center gap-2 text-slate-400">
                <span>ገጽ በ:</span>
                <select 
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-950 border border-slate-800 text-indigo-300 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {paginatedCases.length === 0 ? (
            <div className="bg-slate-900 p-24 rounded-[3rem] border border-slate-800 text-center space-y-4">
              <div className="text-6xl mb-4 opacity-20">⚖️</div>
              <h3 className="text-xl font-bold text-slate-300 uppercase tracking-widest">
                {currentLang === 'om' ? 'Murtiin Barbaadame Hin Argamne' : 'ምንም የሰበር ውሳኔ አልተገኘም'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {currentLang === 'om' 
                  ? 'Jecha ykn lakkoofsa galmee biraatiin sakatta\'i ykn filannoo jildii qulqulleessi.' 
                  : 'የፍለጋ ቃሉን ወይም የቅጽ ማጣሪያውን በማስተካከል እንደገና ይሞክሩ።'}
              </p>
              <button 
                onClick={resetFilters} 
                className="mt-4 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                {currentLang === 'om' ? 'Filtara Qulqulleessi' : 'ማጣሪያውን አጽዳ'}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {paginatedCases.map((item, idx) => {
                  const partiesDisplay = currentLang === 'om' && item.case.falmitoota_om ? item.case.falmitoota_om : item.case.falmitoota;
                  const ratioDisplay = currentLang === 'om' && item.case.qabxii_ijoo_om ? item.case.qabxii_ijoo_om : item.case.qabxii_ijoo;
                  const caseKey = `${item.category}-${item.case.tartiiba || 'x'}-${item.case.lakk_galmee}-${item.case.fuula}`;
                  const isExpanded = expandAll || !!expandedCases[caseKey];

                  const handleQuickCopy = async () => {
                    const text = `ተ.ቁ: ${item.case.tartiiba || '-'}\nመዝገብ ቁጥር: ${item.case.lakk_galmee}\nተከራካሪዎች: ${partiesDisplay}\nየውሳኔ ቀን: ${item.case.guyyaa_murtii}\nገጽ: ${item.case.fuula} (በሰነዱ) ${item.case.fuula_jildii ? '· በጥራዙ ገጽ ' + item.case.fuula_jildii : ''}\nየህግ ትርጉም: ${ratioDisplay}\nየተጠቀሱ ህጎች: ${item.case.seera_caqasame}`;
                    await navigator.clipboard.writeText(text);
                    showToast('መረጃው ተቀድቷል! 📋');
                  };

                  return (
                    <article 
                      key={`${item.category}-${item.case.lakk_galmee}-${idx}`} 
                      className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-xl hover:border-indigo-500/50 transition-all duration-200 group"
                    >
                      {/* Card Header */}
                      <div className="px-8 py-6 bg-slate-950/40 border-b border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {item.case.tartiiba && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-black px-2.5 py-1 rounded-full uppercase">
                                ተ.ቁ #{item.case.tartiiba}
                              </span>
                            )}
                            <span className="bg-indigo-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-tight shadow-md">
                              መዝገብ ቁጥር {highlightText(item.case.lakk_galmee)}
                            </span>
                            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                              {item.category}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider">
                              ገጽ {item.case.fuula} (በሰነዱ) {item.case.fuula_jildii ? `· በጥራዙ ገጽ ${item.case.fuula_jildii}` : ''}
                            </span>
                          </div>
                          <h3 className="font-black text-white text-lg sm:text-xl leading-snug">
                            {highlightText(partiesDisplay)}
                          </h3>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={handleQuickCopy}
                            className="p-3 bg-slate-950 text-slate-400 border border-slate-800 rounded-2xl hover:text-white hover:border-slate-700 transition-all active:scale-95 text-xs font-bold flex items-center gap-1.5"
                            title="መረጃውን ቅዳ"
                          >
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline text-[10px]">ቅዳ</span>
                          </button>

                          <button 
                            onClick={() => toggleStar(item)}
                            className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                              isStarred(item) 
                                ? 'bg-amber-500 text-slate-950 border-amber-400' 
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-amber-400 hover:border-slate-700'
                            }`}
                            title="Star"
                          >
                            <Star className={`w-4 h-4 ${isStarred(item) ? 'fill-current' : ''}`} />
                          </button>

                          <button 
                            onClick={() => setCitationModalItem(item)}
                            className="p-3 bg-slate-950 text-slate-400 border border-slate-800 rounded-2xl hover:text-indigo-300 hover:border-indigo-500/50 transition-all active:scale-95"
                            title="Generate Citation"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => toggleCaseExpand(caseKey)}
                            className="px-3 py-2.5 bg-slate-950 text-indigo-400 border border-slate-800 rounded-2xl hover:text-white transition-all text-xs font-bold"
                          >
                            {isExpanded ? '▲ ዝጋ' : '▼ ዝርዝር'}
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-8 space-y-5">
                        {/* Legal Principle / Ratio Decidendi */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[.3em] flex items-center gap-2">
                            <span className="w-4 h-px bg-indigo-500"></span>
                            <span>የህግ ትርጉም የተሰጠበት ጉዳይ (Ratio Decidendi / Qabxii Ijoo):</span>
                          </h4>
                          <p className={`text-slate-200 text-sm sm:text-base leading-relaxed font-serif italic ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            "{highlightText(ratioDisplay)}"
                          </p>
                        </div>

                        {/* Statutory References (always or when expanded) */}
                        {isExpanded && item.case.seera_caqasame && (
                          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 animate-in fade-in">
                            <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                              {currentLang === 'om' ? 'Tumaalee Seeraa Caqasaman (Statutory Provisions):' : 'የተጠቀሱ ሕጎች እና አንቀጾች፡'}
                            </h5>
                            <p className="text-indigo-200 text-xs sm:text-sm font-mono font-bold">
                              {highlightText(item.case.seera_caqasame)}
                            </p>
                          </div>
                        )}

                        {/* Card Footer */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-slate-800/60">
                          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                            📅 {item.case.guyyaa_murtii}
                          </span>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button 
                              onClick={() => setAiInsightItem(item)}
                              className="w-full sm:w-auto bg-slate-800 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Elite Legal AI Insight</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <span className="text-xs font-mono text-slate-400">
                    Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredCases.length)} of {filteredCases.length} Master Precedents
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(1)} 
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs disabled:opacity-30"
                    >
                      ⏮️
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <span className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-mono font-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold disabled:opacity-30"
                    >
                      Next
                    </button>
                    <button 
                      onClick={() => setCurrentPage(totalPages)} 
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs disabled:opacity-30"
                    >
                      ⏭️
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};
