import React, { useState } from 'react';
import { 
  Target, 
  Sparkles, 
  BookOpen, 
  Scale, 
  Building2, 
  Share2, 
  Volume2, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  Filter,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Layers,
  FileText
} from 'lucide-react';
import { Language } from '../i18n/translations';

interface InteractiveAppGuideBoxesProps {
  currentLang?: Language;
  onNavigate?: (tab: string) => void;
  initialSelectedBox?: string | null;
}

export type GuideBoxId = 
  | 'kaayyoo' 
  | 'fooyyainsa' 
  | 'haala_itti_fayyadama' 
  | 'abbootii_seeraa' 
  | 'dhaabbilee_branding' 
  | 'publer_guide'
  | 'sagaleessuu_tts';

interface GuideBoxItem {
  id: GuideBoxId;
  titleOm: string;
  subtitleOm: string;
  icon: string;
  badge: string;
  badgeColor: string;
  borderColor: string;
  hoverColor: string;
  summaryOm: string;
}

export const InteractiveAppGuideBoxes: React.FC<InteractiveAppGuideBoxesProps> = ({
  currentLang = 'om',
  onNavigate,
  initialSelectedBox = null,
}) => {
  // If user clicks a box, selectedBox holds that box ID, so only THAT content is shown!
  const [selectedBox, setSelectedBox] = useState<GuideBoxId | null>(
    (initialSelectedBox as GuideBoxId) || null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const boxes: GuideBoxItem[] = [
    {
      id: 'kaayyoo',
      titleOm: 'Kaayyoo & Mul\'ata SeeraAI',
      subtitleOm: 'Mul\'ata bu\'uuraa, kaayyoo kalaqaa fi madda rakkoo furamu',
      icon: '🎯',
      badge: 'Kaayyoo Bu\'uuraa',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      borderColor: 'border-amber-500/30 hover:border-amber-500',
      hoverColor: 'from-amber-950/40 to-slate-900',
      summaryOm: 'Seera Itoophiyaa ammayyeessuu, walqixxummaa afaanota sadeenii mirkaneessuu fi ogeeyyiif dhimmoota falmii daqiiqaa muraasa keessatti qulqulleessuu.'
    },
    {
      id: 'fooyyainsa',
      titleOm: 'Fooyyainsa Haaraa Taasifame',
      subtitleOm: 'Dandeettiiwwan dhiheenyatti app kana irratti fooyya\'anii fi dabalaman',
      icon: '🚀',
      badge: 'Fooyyainsa Haaraa',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500',
      hoverColor: 'from-emerald-950/40 to-slate-900',
      summaryOm: 'TTS Lexicon Afaan Oromoo, Jecha \'Darbiinsa Yeroo\', Walitti hidhamiinsa Publer.com, Header dhaabbilee, fi Haala Galmee (Status Badges).'
    },
    {
      id: 'haala_itti_fayyadama',
      titleOm: 'Haala Itti Fayyadama Appichaa',
      subtitleOm: 'Tarkaanfiiwwan salphaa appii kanaan itti gargaaraman',
      icon: '📱',
      badge: 'Qajeelfama Hojii',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      borderColor: 'border-cyan-500/30 hover:border-cyan-500',
      hoverColor: 'from-cyan-950/40 to-slate-900',
      summaryOm: 'Galmee qopheessuu, koodii seeraa sakatta\'uu, sagalee gara barreeffamatti jijjiiruu fi qorannoo murtii ijibbaataa gaggeessuu.'
    },
    {
      id: 'abbootii_seeraa',
      titleOm: 'Iddoo Hojii Abbootii Seeraa & Manneen Murtii',
      subtitleOm: 'Dhaddacha, murtii fi galmee to\'achuuf meeshaalee qophaa\'an',
      icon: '⚖️',
      badge: 'Abbootii Seeraaf',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      borderColor: 'border-purple-500/30 hover:border-purple-500',
      hoverColor: 'from-purple-950/40 to-slate-900',
      summaryOm: 'Sakatta\'iinsa Darbiinsa Yeroo (Limitation Checker), Caasaa manneen murtii Oromiyaa, murtii qopheessuu fi Workflow Status to\'achuu.'
    },
    {
      id: 'dhaabbilee_branding',
      titleOm: 'Header & Logo Dhuunfaa Dhaabbilee',
      subtitleOm: 'Manni murtii ykn dhaabbanni kamuu header dhuunfaa isaa galchuuf',
      icon: '🏛️',
      badge: 'Asxaa Dhaabbilee',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      borderColor: 'border-rose-500/30 hover:border-rose-500',
      hoverColor: 'from-rose-950/40 to-slate-900',
      summaryOm: 'Asxaa (logo), Maqaa Mana Murtii/Hojii, Teessoo fi Lakk. Xalayaa galchuun sanadoota hunda irratti chaappaa dhuunfaan dura-ilaaluu (Preview).'
    },
    {
      id: 'publer_guide',
      titleOm: 'Publer Social Media Integration',
      subtitleOm: 'Akkaataa SeeraAI Publer (https://publer.com) waliin itti wal-qabatu',
      icon: '🌐',
      badge: 'Miidiyaa Hawaasaa',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      borderColor: 'border-indigo-500/30 hover:border-indigo-500',
      hoverColor: 'from-indigo-950/40 to-slate-900',
      summaryOm: 'Beeksisa mana murtii, labsiilee fi xalayaalee al-tokkotti toora miidiyaa hawaasaa irratti beellamanii maxxansuuf tajaajila Publer API fayyadamuu.'
    },
    {
      id: 'sagaleessuu_tts',
      titleOm: 'Sagaleessuu & Jechoota Seeraa (TTS Lexicon)',
      subtitleOm: 'Qooqaa fi sagalee sirrii jechoota seeraa Afaan Oromootiin dubbisuuf',
      icon: '🎙️',
      badge: 'Qooqa & Dubbisa',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      borderColor: 'border-teal-500/30 hover:border-teal-500',
      hoverColor: 'from-teal-950/40 to-slate-900',
      summaryOm: 'Jechoota seeraa akka \'Oromiyaa\', \'Abukaattoo\', \'Darbiinsa Yeroo\' sagalee sirriin dubbisuu fi ogeeyyiin jecha haaraa dabaluu danda\'uu.'
    }
  ];

  const filteredBoxes = boxes.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return b.titleOm.toLowerCase().includes(q) || 
           b.subtitleOm.toLowerCase().includes(q) || 
           b.summaryOm.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
              <span>📦</span>
              <span>Sanduuqa Qajeelfamaa fi Fooyyainsa Appii SeeraAI</span>
            </div>

            {selectedBox && (
              <button
                type="button"
                onClick={() => setSelectedBox(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>⬅️</span>
                <span>Sanduuqawwan Hunda Agarsiisi (Show All Boxes)</span>
              </button>
            )}
          </div>

          <div>
            <h2 className="text-xl sm:text-3xl font-serif-legal font-bold text-white tracking-tight">
              {selectedBox === 'kaayyoo'
                ? '🎯 Kaayyoo & Mul\'ata SeeraAI Qofa'
                : selectedBox === 'fooyyainsa'
                ? '🚀 Fooyyainsa Haaraa Appii Irratti Taasifame'
                : selectedBox === 'haala_itti_fayyadama'
                ? '📱 Haala Itti Fayyadama Appichaa (Step-by-Step)'
                : selectedBox === 'abbootii_seeraa'
                ? '⚖️ Iddoo Hojii Abbootii Seeraa & Manneen Murtii'
                : selectedBox === 'dhaabbilee_branding'
                ? '🏛️ Asxaa & Header Dhuunfaa Dhaabbilee'
                : selectedBox === 'publer_guide'
                ? '🌐 Akkaataa Publer Waliin Itti Hojjetamu'
                : selectedBox === 'sagaleessuu_tts'
                ? '🎙️ Sagaleessuu & Jechoota Seeraa (TTS Lexicon)'
                : 'Qajeelfama & Fooyyainsa Appii SeeraAI'}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {selectedBox 
                ? 'Sanduuqa kana filattanii qabiyyee isaa qofa addatti baafattanii dubbisaa jirtu. Sanduuqa biraa ilaaluuf armaan olitti "Sanduuqawwan Hunda Agarsiisi" kan jedhu cuqaasaa.'
                : 'Sanduuqawwan armaan gadii keessaa isa barbaaddan (fakkeenyaaf "Kaayyoo", "Fooyyainsa", "Haala Itti Fayyadama") cuqaasuun (click) qabiyyee isaa qofa addatti baafattanii ilaaluu dandeessu.'
              }
            </p>
          </div>

          {/* Quick Search Bar */}
          {!selectedBox && (
            <div className="pt-2">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sanduuqawwan keessaa barbaadaa (fkn. Kaayyoo, Publer, Header...)"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          VIEW A: ALL BOXES GRID (When no box is selected)
          ========================================================================= */}
      {!selectedBox && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Sanduuqa tokko cuqaasaatii qabiyyee isaa qofa ilaalaa:</span>
            <span>Sanduuqawwan: {filteredBoxes.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBoxes.map((box) => (
              <div
                key={box.id}
                onClick={() => setSelectedBox(box.id)}
                className={`p-6 rounded-3xl bg-slate-900/90 border ${box.borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
              >
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                      {box.icon}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${box.badgeColor}`}>
                      {box.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                      {box.titleOm}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {box.subtitleOm}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                    {box.summaryOm}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
                  <span>Cuqaasiitii Qofaasaa Ilaali ➔</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW B: EXCLUSIVE BOX VIEW (User clicks a box, only that box is shown)
          ========================================================================= */}
      {selectedBox === 'kaayyoo' && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-3xl">
                🎯
              </span>
              <div>
                <span className="text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
                  Qabiyyee Sanduuqa 1ffaa
                </span>
                <h3 className="text-2xl font-serif-legal font-bold text-white">
                  Kaayyoo & Mul'ata SeeraAI
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedBox(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 self-start cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cufi / Sanduuqawwan Hunda</span>
            </button>
          </div>

          {/* Deep Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <span>🌟</span>
                <span>Mul'ata Guddaa (Our Vision)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                Sirna haqaa fi seeraa Itoophiyaa teeknooloojii Artifishal Intelijensii (AI) sadarkaa olaanaatiin ammayyeessuu, walqixxummaa afaanota gurguddoo sadeenii (<strong>Afaan Oromoo</strong>, <strong>Amaariffa</strong>, fi <strong>Ingiliffa</strong>) guutummaatti mirkaneessuu, fi lammiileen hundi osoo daangaa afaaniitiin hin danqamin haqaa fi seera akka qaqqabatan gochuudha.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <span>🎯</span>
                <span>Kaayyoo Bu'uuraa (Core Mission)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                Ogeessota seeraa (abbootii seeraa, abbootii alangaa, abukaattoota) fi lammiilee gargaaruun:
                yeroo barbaacha seeraa guyyoota irraa gara <strong>sekondii 3tti</strong> gabaabsuu, baasii qaalii waraqaa fi tajaajilaa hir'isuu, fi balaa seeraa (legal risks) qophii waliigaltee fi himannaa keessatti mudatu dhabamsiisuudha.
              </p>
            </div>
          </div>

          {/* Madda Rakkoo fi Furmaata */}
          <div className="space-y-4 pt-2">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <span>📋</span>
              <span>Rakkoolee Seeraa Jiran fi Furmaata SeeraAI Kanneen Qofa:</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-rose-400 text-xs font-mono font-bold">1. Rakkoo: Barbaacha Murtii Dhaddacha Ijoo</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jildiiwwan 25+ keessaa lakk. galmeen barbaaduun guyyoota qisaasa ture.
                </p>
                <div className="pt-2 text-emerald-400 text-xs font-semibold">
                  ✅ Furmaata: AI'n sekondii 3 keessatti jildiin, keeyyataan fi murtii walfakkaatuun fida.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-rose-400 text-xs font-mono font-bold">2. Rakkoo: Danqaa Afaanii fi Hiikkaa</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Labsiileen fi murtiiwwan afaan tokkoon qofa bahuun hubannoo seeraa gufachiisaa ture.
                </p>
                <div className="pt-2 text-emerald-400 text-xs font-semibold">
                  ✅ Furmaata: Afaan Oromoo, Amaariffaa fi Ingiliffaan walqixxummaa hiikkaa qulqulluu qaba.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-rose-400 text-xs font-mono font-bold">3. Rakkoo: Dogoggora Loojikii Sanadaa</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Koodii SDFHH cabsuu, keeyyanni darbiinsa yeroo irra darbuu fi gaaffiin qulqulluu dhabamuu.
                </p>
                <div className="pt-2 text-emerald-400 text-xs font-semibold">
                  ✅ Furmaata: Legal Logic Auditor sanada keessan dura qoratee dogoggora ofumaan sirreessa.
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            {onNavigate && (
              <button
                onClick={() => onNavigate('legislationRepository')}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>📚</span>
                <span>Kuusaa Seeraa Ilaalaa</span>
              </button>
            )}
            <button
              onClick={() => setSelectedBox('fooyyainsa')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer border border-slate-700"
            >
              <span>Gara Sanduuqa Fooyyainsaatti Darbaa ➔</span>
            </button>
          </div>
        </div>
      )}

      {selectedBox === 'fooyyainsa' && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-3xl">
                🚀
              </span>
              <div>
                <span className="text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                  Qabiyyee Sanduuqa 2ffaa
                </span>
                <h3 className="text-2xl font-serif-legal font-bold text-white">
                  Fooyyainsa Haaraa Appii Kana Irratti Taasifame
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedBox(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 self-start cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cufi / Sanduuqawwan Hunda</span>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Dhiheenyatti gaaffii fi yaada ogeessotaa bu'uura godhachuun dandeettiiwwan gurguddoon armaan gadii appii kana irratti fooyya'anii guutamaniiru:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span>1. 🎙️</span>
                  <span>Sagaleessuu Afaan Oromoo (Custom TTS Lexicon)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jechoota seeraa fi maqoota Oromiyaa kanneen duraan dogoggoraan dubbifamaa turan (fkn: "Afaan Oromoo", "Oromiyaa", "Abukaattoo", "Darbiinsa Yeroo") sagalee qulqulluun akka dubbifamaniif kuusaan sagaleessaa (phonetic dictionary) qindaa'eera. Ogeessonnis jecha haaraa dabalachuuf qophiin jira.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span>2. ⏳</span>
                  <span>Sirreeffama Jecha 'Darbiinsa Yeroo'</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Iddoo hojii Abbootii Seeraa (Judicial Tools) irratti jechi duraan afaan Amaariffaatiin "Yirgaa" jedhamee ture gara jecha seeraa Afaan Oromoo sirrii <strong>"Darbiinsa Yeroo (Limitation)"</strong>tti jijjiirameera.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <span>3. ✈️</span>
                  <span>Walitti Qabamiinsa Telegram (Telegram Channel & Sync Integration)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sanadoota, labsiilee fi murtiiwwan ijibbaataa kallattiin gara channaalii Telegram (<a href="https://t.me/wakolegalstudio" target="_blank" rel="noreferrer" className="text-sky-400 underline">@wakolegalstudio</a>)tti erguu fi kuusaa galmeewwanii fe'uuf Telegram Connect qindaa'eera.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span>4. 🏛️</span>
                  <span>Header fi Asxaa Dhuunfaa Dhaabbilee (Institution Header)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Manni murtii, manni hojii mootummaa ykn dhaabbanni dhuunfaa kamiyyuu asxaa (logo) fi teessoo mataa isaa galchee sanada xalayaa irratti maxxansee akka dura-ilaalu (Preview) dandeessisu qophaa'eera.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span>5. 🏷️</span>
                  <span>Haala Galmee (Workflow Status Badges)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Galmee fi sanadoota mana murtii sadarkaa isaaniitiin adda baasuuf (<strong>Drafting - Daalacha</strong>, <strong>Pending Review - Boora/Amber</strong>, <strong>Hearing - Cuquliisa/Blue</strong>, <strong>Closed - Magariisa/Emerald</strong>) halluudhaan adda baafamanii mul'atu.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span>6. ⚖️</span>
                  <span>Mallattoo SeeraAI Qulqulleessuu</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fuula duraa irratti asxaa haqa Itoophiyaa jala barreeffamni "SEERAAI Emblem" jedhu kan ture haqamee asxaan bareedina qofaan akka mul'atu ta'eera.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setSelectedBox('haala_itti_fayyadama')}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>📱</span>
              <span>Haala Itti Fayyadamaa Ilaalaa ➔</span>
            </button>
            <button
              onClick={() => setSelectedBox(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer"
            >
              <span>Sanduuqawwan Hundatti Deebi'aa</span>
            </button>
          </div>
        </div>
      )}

      {selectedBox === 'haala_itti_fayyadama' && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-3xl">
                📱
              </span>
              <div>
                <span className="text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                  Qabiyyee Sanduuqa 3ffaa
                </span>
                <h3 className="text-2xl font-serif-legal font-bold text-white">
                  Haala Itti Fayyadama Appii SeeraAI (Tarkaanfiiwwan 5)
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedBox(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 self-start cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cufi / Sanduuqawwan Hunda</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  step: 'Tarkaanfii 1',
                  title: 'Seensa & Filannoo Afaanii',
                  desc: 'Appicha yemmuu bantanu mirga gubbaatti afaan barbaaddan (Afaan Oromoo, Amaariffa, Ingiliffa) filachuun itti fayyadamuu dandeessu. Akkasumas akaawuntii keessaniin seenuun sanadoota qusachuu dandeessu.',
                  icon: '🌐'
                },
                {
                  step: 'Tarkaanfii 2',
                  title: 'Kuusaa Seeraa & Murtii Dhaddacha Ijoo Barbaaduu',
                  desc: 'Iddoo "Kuusaa Labsiilee & Dambiilee" ykn "Murtii Ijibbaataa" deemtanii lakk. galmee, lakk. labsii ykn dhimma falmii (fakkeenyaaf "waliigaltee lafaa", "darbiinsa yeroo") barreessuun sekondii 3 keessatti argattu.',
                  icon: '🔍'
                },
                {
                  step: 'Tarkaanfii 3',
                  title: 'Himannaa, Deebii fi Waliigaltee Qopheessuu',
                  desc: 'Kutaa "Qopheessi" (Create Document) seenuun uunkaa himannaa, iyyannoo, deebii ykn waliigaltee hojii fi daldalaa filattanii odeeffannoo guuttanii qulqullinaan AI\'n isiniif barreessa.',
                  icon: '✍️'
                },
                {
                  step: 'Tarkaanfii 4',
                  title: 'Odiitii Loojikii Seeraa (Legal Logic Auditor)',
                  desc: 'Sanada qopheessitan erga xumurtanii booda "Audit Document" cuqaasuun hanqina seera deemsa falmii, keeyyattoota dhabaman fi balaa seeraa yeroma sana adda baasa.',
                  icon: '🛡️'
                },
                {
                  step: 'Tarkaanfii 5',
                  title: 'Sagalee fi Suuraa gara Barreeffamatti Jijjiiruu',
                  desc: 'Kutaa "Voice to Text" cuqaasuun maayikroofooniin dubbachuu dandeessu. Akkasumas sanada waraqaa suuraa kaasuun "Image & Document OCR"n gara barreeffamatti jijjiiruu dandeessu.',
                  icon: '🎙️'
                }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-4">
                  <span className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xl shrink-0">
                    {item.icon}
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-xs font-mono font-bold uppercase">{item.step}:</span>
                      <h4 className="text-white font-bold text-sm">{item.title}</h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            {onNavigate && (
              <button
                onClick={() => onNavigate('create')}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>✍️</span>
                <span>Sanada Haaraa Qopheessuu Jalqabaa</span>
              </button>
            )}
            <button
              onClick={() => setSelectedBox(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer"
            >
              <span>Sanduuqawwan Hundatti Deebi'aa</span>
            </button>
          </div>
        </div>
      )}

      {selectedBox === 'abbootii_seeraa' && (
        <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/30 text-3xl">
                ⚖️
              </span>
              <div>
                <span className="text-purple-400 text-xs font-mono font-bold uppercase tracking-wider">
                  Qabiyyee Sanduuqa 4ffaa
                </span>
                <h3 className="text-2xl font-serif-legal font-bold text-white">
                  Iddoo Hojii Abbootii Seeraa & Manneen Murtii
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedBox(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 self-start cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cufi / Sanduuqawwan Hunda</span>
            </button>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              Iddoon hojii kun addatti Abbootii Seeraa, Abbootii Alangaa fi Gargaartota Dhaddachaaf kan qindaa'e yoo ta'u meeshaalee armaan gadii of keessaa qaba:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-purple-300 font-bold text-sm flex items-center gap-2">
                  <span>⏳</span>
                  <span>Sakatta'iinsa Darbiinsa Yeroo (Limitation Checker)</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dhimmi seera deemsa falmii ykn koodii siiviilii dhiyaate yeroon beellamaa fi darbiinsi yeroo irra darbuu fi dhiisuu isaa guyyoota fi seera hordofee madaala.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-purple-300 font-bold text-sm flex items-center gap-2">
                  <span>🏛️</span>
                  <span>Dhaddacha & Hordoffii Galmee (Workflow Tracker)</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Galmee himannaa, ragaa fi murtii sadarkaa Workflow Badges (Drafting, Pending Review, Hearing, Closed) kanaan hordofuu fi qindeessuu.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-purple-300 font-bold text-sm flex items-center gap-2">
                  <span>🏢</span>
                  <span>Caasaa Manneen Murtii Oromiyaa (Courts Directory)</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Manneen Murtii Aanaa, Ol-aanaa fi Waliigalaa Oromiyaa Godinaalee 21 fi Magaalota hunda keessatti argaman tarreefaman argachuu.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-purple-300 font-bold text-sm flex items-center gap-2">
                  <span>📜</span>
                  <span>Murtii Dhumaa & Sababa Seeraa Qopheessuu</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Abbootiin Seeraa ragaalee fi mormii dhaga'ame bu'uura godhachuun qabxii murtii fi sababa seeraa qulqullinaan akka qopheessaniif gargaara.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            {onNavigate && (
              <button
                onClick={() => onNavigate('courtWork')}
                className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>🏛️</span>
                <span>Iddoo Hojii Mana Murtiitti Gali</span>
              </button>
            )}
            <button
              onClick={() => setSelectedBox(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer"
            >
              <span>Sanduuqawwan Hundatti Deebi'aa</span>
            </button>
          </div>
        </div>
      )}

      {selectedBox === 'dhaabbilee_branding' && (
        <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 text-3xl">
                🏛️
              </span>
              <div>
                <span className="text-rose-400 text-xs font-mono font-bold uppercase tracking-wider">
                  Qabiyyee Sanduuqa 5ffaa
                </span>
                <h3 className="text-2xl font-serif-legal font-bold text-white">
                  Header & Asxaa (Logo) Dhuunfaa Dhaabbilee Galchuu
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedBox(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 self-start cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cufi / Sanduuqawwan Hunda</span>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Manni murtii aanaa/ol-aanaa, manni hojii mootummaa, ykn waajjirri abukaattoo kamiyyuu xalayaa fi galmee barreessu irratti asxaa fi maqaa dhuunfaa isaa akka itti galchu tartiibni isaa:
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <span className="text-rose-400 font-mono font-bold text-sm">1.</span>
                <div>
                  <h4 className="text-white font-bold text-sm">Gara 'Settings' (Qindaa'ina) Deemaa</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Gubbaa mirgaa irraa Mallattoo Qindaa'inaa (Settings) cuqaasaa.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <span className="text-rose-400 font-mono font-bold text-sm">2.</span>
                <div>
                  <h4 className="text-white font-bold text-sm">Kutaa 'Institution Branding' Argadhaa</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Asxaa (logo image) keessan upload godhaa, Maqaa Dhaabbataa, Teessoo fi Lakk. Bilbilaa guutaa.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <span className="text-rose-400 font-mono font-bold text-sm">3.</span>
                <div>
                  <h4 className="text-white font-bold text-sm">Qophii Xalayaa Irratti 'Preview Document Header' Cuqaasaa</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Sanada qopheessitan irratti batanii "Preview Header" cuqaasuun akkuma waraqaa ragaan bahuutti dura-ilaaltu.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            {onNavigate && (
              <button
                onClick={() => onNavigate('settings')}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>⚙️</span>
                <span>Gara Qindaa'ina Header Dhaabbataatti Gali</span>
              </button>
            )}
            <button
              onClick={() => setSelectedBox(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer"
            >
              <span>Sanduuqawwan Hundatti Deebi'aa</span>
            </button>
          </div>
        </div>
      )}

      {selectedBox === 'publer_guide' && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-3xl">
                🌐
              </span>
              <div>
                <span className="text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
                  Qabiyyee Sanduuqa 6ffaa
                </span>
                <h3 className="text-2xl font-serif-legal font-bold text-white">
                  Akkaataa Publer (https://publer.com) Waliin Itti Hojjetamu
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedBox(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 self-start cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cufi / Sanduuqawwan Hunda</span>
            </button>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            <div className="p-5 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-2">
              <div className="flex items-center gap-2 text-sky-300 font-bold">
                <span>✈️</span>
                <span>Telegram Channel (t.me/wakolegalstudio) maaliif fayyada?</span>
              </div>
              <p>
                <strong>Telegram (@wakolegalstudio)</strong> kuusaa galmeewwan seeraa, murtiiwwan ijibbaataa Jildii 1-25+, fi barruulee seeraa haaraa saffisaan sinkii fi qoodachuuf tajaajila. "Telegram Connect" cuqaasuun galmeewwan 1,500+ al-tokkotti fe'achuun intarneetiin ala (Offline) fayyadamuun ni danda'ama.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-white font-bold text-sm">Akkaataa Itti Fayyadamaa (Tartiiba):</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-sky-400 font-mono font-bold text-xs">Tarkaanfii 1:</span>
                  <h5 className="text-white font-bold text-xs">Channaalii Telegram Bani</h5>
                  <p className="text-[11px] text-slate-400">
                    Toora <a href="https://t.me/wakolegalstudio" target="_blank" rel="noreferrer" className="text-sky-400 underline">t.me/wakolegalstudio</a> deemtanii channaalii seeraa hordofaa.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-sky-400 font-mono font-bold text-xs">Tarkaanfii 2:</span>
                  <h5 className="text-white font-bold text-xs">Telegram Connect Cuqaasuu</h5>
                  <p className="text-[11px] text-slate-400">
                    Kutaa Sanadoota Galmee (Document Filings) irratti "Telegram Connect" cuqaasaa.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-sky-400 font-mono font-bold text-xs">Tarkaanfii 3:</span>
                  <h5 className="text-white font-bold text-xs">Fe'iinsa & Sync Raawwachuu</h5>
                  <p className="text-[11px] text-slate-400">
                    "Start Telegram Import" cuqaasuun murtiiwwan 1,500+ kuusaa dhuunfaatti fe'adhaa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            <a
              href="https://t.me/wakolegalstudio"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>✈️</span>
              <span>Channaalii Telegram @wakolegalstudio Bani</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => setSelectedBox(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer"
            >
              <span>Sanduuqawwan Hundatti Deebi'aa</span>
            </button>
          </div>
        </div>
      )}

      {selectedBox === 'sagaleessuu_tts' && (
        <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-3.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 text-3xl">
                🎙️
              </span>
              <div>
                <span className="text-teal-400 text-xs font-mono font-bold uppercase tracking-wider">
                  Qabiyyee Sanduuqa 7ffaa
                </span>
                <h3 className="text-2xl font-serif-legal font-bold text-white">
                  Sagaleessuu & Jechoota Seeraa (TTS Custom Lexicon)
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedBox(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 self-start cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cufi / Sanduuqawwan Hunda</span>
            </button>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            <p>
              Afaan Oromoo sagaleen sirriitti akka dubbifamuuf jechoonni seeraa fi maqoota addaa kuusaa <code>src/services/ttsLexicon.ts</code> keessatti sagalee qubeessuu (phonetic respelling) waliin qindaa'aniiru:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-teal-400 font-bold block text-sm">"Afaan Oromoo"</span>
                <span className="text-slate-400 text-xs font-mono">Sagalee: Ah-faan Oh-roh-moh</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-teal-400 font-bold block text-sm">"Oromiyaa"</span>
                <span className="text-slate-400 text-xs font-mono">Sagalee: Oh-roh-mee-yah</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-teal-400 font-bold block text-sm">"Abukaattoo"</span>
                <span className="text-slate-400 text-xs font-mono">Sagalee: Ah-boo-kaat-toh</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-teal-400 font-bold block text-sm">"Darbiinsa Yeroo"</span>
                <span className="text-slate-400 text-xs font-mono">Sagalee: Dar-been-sah Yeh-roh</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-teal-400 font-bold block text-sm">"Dhaddacha"</span>
                <span className="text-slate-400 text-xs font-mono">Sagalee: Dhad-dah-chah</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-teal-400 font-bold block text-sm">"Abbaa Seeraa"</span>
                <span className="text-slate-400 text-xs font-mono">Sagalee: Ab-baa Seh-raa</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/30 text-xs text-teal-200">
              💡 <strong>Yaada Ogeessotaa:</strong> Ogeessonni seeraa kutaa "Expert Legal Review" keessatti jecha haaraa dabalchuuf yaada dhiyeessuu danda'u. Adminis mirkaneessee kuusaa guutuutti dabala.
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            {onNavigate && (
              <button
                onClick={() => onNavigate('settings')}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>⚙️</span>
                <span>Qindaa'ina Sagalee (TTS Preferences)</span>
              </button>
            )}
            <button
              onClick={() => setSelectedBox(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer"
            >
              <span>Sanduuqawwan Hundatti Deebi'aa</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
