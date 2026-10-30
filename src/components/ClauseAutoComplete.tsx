import React, { useState, useMemo } from 'react';
import { Sparkles, Check, ChevronRight, FileText, Globe } from 'lucide-react';
import { Language } from '../i18n/translations';

export interface ClauseItem {
  id: string;
  title: { om: string; am: string; en: string };
  content: { om: string; am: string; en: string };
  category: 'contract' | 'general';
}

export const STANDARD_ETHIOPIAN_CLAUSES: ClauseItem[] = [
  {
  id: 'force_majeure',
  title: {
    om: 'Hala Dirqisiisaa (Force Majeure)',
    am: 'ኃይል አሸናፊ (Force Majeure)',
    en: 'Force Majeure (Acts of God / External Events)'
  },
  content: {
    om: 'Hala Dirqisiisaa: Balaan uumamaa, lolaan, dhibeen ykn haalli kamiyyuu harka namaa ol ta\'e yoo mudate, qaamni miidhaaf saaxilame hanga haalli sun turutti gaafatamummaa irraa bilisa ta\'a.',
    am: 'ኃይል አሸናፊ: የተፈጥሮ አደጋ፣ ጦርነት ወይም ከሰው ቁጥጥር ውጭ የሆነ ድንገተኛ ሁኔታ ሲከሰት ተዋዋይ ወገኖች በውል የተጣለባቸውን ግዴታ ሳይወጡ ቢቀሩ ተጠያቂ አይሆኑም።',
    en: 'Force Majeure: Neither party shall be liable for any failure or delay in performance under this Agreement due to acts of God, war, civil unrest, natural disasters, or other unforeseeable events beyond reasonable control.'
  },
  category: 'contract'
},
{
  id: 'governing_law',
  title: {
    om: 'Seera Bulchaa (Governing Law & Jurisdiction)',
    am: 'የሚመለከተው ሕግ እና ፍርድ ቤት',
    en: 'Governing Law and Jurisdiction'
  },
  content: {
    om: 'Seera Bulchaa fi Manni Murtii: Waliigalteen kun seera Jamhuuriyaa Federaalawaa Dimokiraatawaa Itoophiyaatiin kan bulfamu yoo ta\'u, manni murtii abbaa aboo qabu Finfinnee keessatti dhimma kana ilaala.',
    am: 'የሚመለከተው ሕግ: ይህ ውል በኢፌዴሪ ሕጎች የሚመራ ሲሆን አከራካሪ ጉዳዮች በአዲስ አበባ ብቁ የፍርድ አካላት ይታያሉ።',
    en: 'Governing Law: This Agreement shall be governed by, construed, and enforced in accordance with the laws of the Federal Democratic Republic of Ethiopia. Any legal proceedings shall be submitted to the competent courts in Addis Ababa.'
  },
  category: 'contract'
},
{
  id: 'termination',
  title: {
    om: 'Addaan Kutuu Waliigaltee (Termination)',
    am: 'ውል ማቋረጥ (Termination & Notice)',
    en: 'Termination and Notice'
  },
  content: {
    om: 'Addaan Kutuu Waliigaltee: Paatiin kamiyyuu guyyaa 30 dura beeksisa barreeffamaa kennuun waliigaltee kana addaan kutuu danda\'a. Haa ta\'u malee kafaltiin hanga guyyaa sanatti ture kaffalamuu qaba.',
    am: 'ውል ማቋረጥ: ማንኛውም ወገን የ30 ቀናት የጽሁፍ ቅድመ ማስጠንቀቂያ በመስጠት ውሉን ማቋረጥ ይችላል። ሆኖም እስከ ማቋረጫው ቀን ድረስ ያለው ግዴታ መወጣት አለበት።',
    en: 'Termination: Either party may terminate this Agreement by giving thirty (30) days prior written notice to the other party. All accrued and unpaid financial obligations up to the date of termination shall remain enforceable.'
  },
  category: 'contract'
},
{
  id: 'dispute_resolution',
  title: {
    om: 'Marii fi Araara (Dispute Resolution)',
    am: 'የክርክር መፍታት ስነ-ስርዓት (Dispute Resolution)',
    en: 'Dispute Resolution through Consultation'
  },
  content: {
    om: 'Marii fi Araara: Walitti bu\'iinsi ykn mormiin waligaltee kana irraa ka\'u kamiyyuu jalqabamariin (Negotiation) guyyaa 15 keessatti furamuuf qabsoo godhamuu qaba. Yoo furamuu baate mana murtii deemama.',
    am: 'የክርክር መፍታት: ከዚህ ውል መፈጠር ጋር ተያይዞ የሚነሱ አለመግባባቶች በመጀመሪያ በውይይትና በድርድር ለመፍታት ጥረት ይደረጋል።',
    en: 'Dispute Resolution: Any dispute arising out of or relating to this contract shall first be settled amicably through good-faith consultation within fifteen (15) business days before resorting to formal litigation or arbitration.'
  },
  category: 'contract'
},
{
  id: 'confidentiality',
  title: {
    om: 'Iccitii Eeguu (Confidentiality)',
    am: 'የምስጢር ጥበቃ (Confidentiality)',
    en: 'Confidentiality and Non-Disclosure'
  },
  content: {
    om: 'Iccitii Eeguu: Paatiwwan lamaan odeeffannoo daldalaa, ragaa fi xalayaa waljijjiiran hunda iccitiin qabachuuf dirqama qabu; hayyama malee qaama sadaffaaf dabarsanii kennuu hin danda\'an.',
    am: 'የምስጢር ጥበቃ: ተዋዋይ ወገኖች በዚህ ውል አፈጻጸም ወቅት ያገኙትን ማንኛውም የንግድ እና የህግ ምስጢር መጠበቅ አለባቸው፤ ያለ ሌላኛው ወገን ፈቃድ ለሶስተኛ አካል አያሳልፉም።',
    en: 'Confidentiality: Both parties agree to hold all confidential information in strict confidence and shall not disclose such information to any third party without prior written consent, except as required by Ethiopian law.'
  },
  category: 'contract'
},
{
  id: 'labor_proclamation',
  title: {
    om: 'Labsii Hojjetaa fi Hojjechiisaa 1156/2019',
    am: 'የአሰሪና ሰራተኛ አዋጅ ቁጥር 1156/2011',
    en: 'Labor Proclamation No. 1156/2019 Compliance'
  },
  content: {
    om: 'Waliigalteen kun Labsii Lakkoofsa 1156/2019 bu\'uura godhatee mirga boqonnaa waggaa, kaffaltii yeroo dabalataa (Overtime), fi haala eegumsa fayyaa hojjettootaa guututti eega.',
    am: 'ይህ የስራ ውል በአዋጅ ቁጥር 1156/2011 መሰረት ዓመታዊ ፈቃድን፣ የትርፍ ሰዓት ክፍያን እና የሰራተኞችን ደህንነት የሚጠብቅ ይሆናል።',
    en: 'Labor Standards: This employment agreement fully complies with Ethiopian Labor Proclamation No. 1156/2019 regarding statutory working hours, annual leave entitlements, overtime rates, and occupational safety standards.'
  },
  category: 'contract'
}
];

interface ClauseAutoCompleteProps {
  currentLang: Language;
  query: string;
  onSelectClause: (clauseText: string) => void;
  onClose?: () => void;
}

export const ClauseAutoComplete: React.FC<ClauseAutoCompleteProps> = ({
  currentLang,
  query,
  onSelectClause,
  onClose,
}) => {
  const [selectedLanguageTab, setSelectedLanguageTab] = useState<Language>(currentLang);

  const filteredClauses = useMemo(() => {
    if (!query || query.trim().length === 0) {
      return STANDARD_ETHIOPIAN_CLAUSES;
    }
    const q = query.toLowerCase();
    return STANDARD_ETHIOPIAN_CLAUSES.filter(
      (c) =>
        c.title.om.toLowerCase().includes(q) ||
        c.title.am.toLowerCase().includes(q) ||
        c.title.en.toLowerCase().includes(q) ||
        c.content.om.toLowerCase().includes(q) ||
        c.content.am.toLowerCase().includes(q) ||
        c.content.en.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl p-3 space-y-3 z-50 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-300">
            {currentLang === 'om' ? 'Keeyyattoota Seeraa Itoophiyaa (Auto-Complete Clauses):' : currentLang === 'am' ? 'መደበኛ የኢትዮጵያ ውል አንቀጾች (Auto-Complete Clauses):' : 'Standard Ethiopian Contract Clauses:'}
          </span>
        </div>

        {/* Language Tabs for Clauses */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['om', 'am', 'en'] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setSelectedLanguageTab(lang)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                selectedLanguageTab === lang
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'om' ? 'Oromoo' : lang === 'am' ? 'አማርኛ' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredClauses.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            {currentLang === 'om' ? 'Keeyyatni argame hin jiru.' : 'ምንም አንቀጽ አልተገኘም።'}
          </div>
        ) : (
          filteredClauses.map((clause) => {
            const titleText = clause.title[selectedLanguageTab] || clause.title.en;
            const contentText = clause.content[selectedLanguageTab] || clause.content.en;
            return (
              <div
                key={clause.id}
                onClick={() => onSelectClause(contentText)}
                className="group p-2.5 rounded-xl bg-slate-950/80 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5">
                    <span>📄</span>
                    <span>{titleText}</span>
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-mono opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <span>Gali (Insert)</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed font-sans">
                  {contentText}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
        <span>💡 Keeyyata tokko cuqaasuun gara prompt keetti dabali.</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-amber-400 hover:underline font-semibold"
          >
            Cufi (Close)
          </button>
        )}
      </div>
    </div>
  );
};
