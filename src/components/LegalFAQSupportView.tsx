import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, ExternalLink, ShieldCheck, PhoneCall, Mail } from 'lucide-react';
import { Language } from '../i18n/translations';

interface LegalFAQSupportViewProps {
  currentLang: Language;
}

interface FAQItem {
  question: { om: string; am: string; en: string };
  answer: { om: string; am: string; en: string };
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: 'General & Access',
    question: {
      om: 'Appii kana bilbila kiyya irratti akkamitti fe\'uu (Install) danda\'a?',
      am: 'ይህንን መተግበሪያ በስልኬ ላይ እንዴት መጫን (Install) እችላለሁ?',
      en: 'How can I install this app on my phone as a native app?',
    },
    answer: {
      om: 'Google Chrome dhaan linkii appii kanaa banachuun menuu irraa "Add to Home Screen" ykn "Install App" tuquun akka appii idileetti fayyadamuu dandeessu. Kanaan alatti Google Play Store irraas tajaajila TWA tiin argachuu dandeessu.',
      am: 'በ Google Chrome አገናኙን በመክፈት ከምናሌው ላይ "Add to Home Screen" ወይም "Install App" በመጫን እንደ መደበኛ መተግበሪያ መጠቀም ይችላሉ።',
      en: 'Open the app link in Google Chrome, tap the menu, and select "Add to Home Screen" or "Install App" for full offline progressive web app support.',
    },
  },
  {
    category: 'General & Access',
    question: {
      om: 'Tajaajilli appii kanaa kaffaltii qabaa?',
      am: 'ይህ መተግበሪያ ክፍያ ይጠይቃል?',
      en: 'Is this app free to use for legal research and drafting?',
    },
    answer: {
      om: 'Lakkii. Platformiin SeeraAI (SAI Ethio) tajaajila qorannoo seeraa, waliigaltee qopheessuu, xiinxala sanadaa, fi murteewwan dhaddacha ijoo kaffaltii tokko malee BILISAAN hawaasaa fi ogeeyyii seeraaf dhiheessa.',
      am: 'አይደለም። የSeeraAI መድረክ የሕግ ምርምር፣ የውል ዝግጅት፣ የሰነድ ትንተና እና የሰበር ውሳኔዎችን ያለ ምንም ክፍያ በነጻ ለማህበረሰቡ እና ለሕግ ባለሙያዎች ያቀርባል።',
      en: 'No. The SeeraAI platform provides 100% free public access to legal research, contract drafting, document analysis, and cassation precedents for citizens and legal professionals.',
    },
  },
  {
    category: 'Legal AI & Accuracy',
    question: {
      om: 'Deebiin AI kennamu seerota haaraa fi rogummaa qaban qofa irratti hundaa\'aa?',
      am: 'በ AI የሚሰጠው መልስ አሁን ባሉት ወቅታዊ እና ተስማሚ ሕጎች ላይ ብቻ የተመሠረተ ነውን?',
      en: 'Does the AI ensure answers rely strictly on active, current Ethiopian laws?',
    },
    answer: {
      om: 'Eeyyee. System Instruction cimaan keenya seerota haqaman (fkn. Koodii Daldalaa moofaa 1960) akka hin fayyadamne dhorkuun seerota haaraa fkn Labsii Hojjetaa 1156/2019 fi Koodii Daldalaa 1243/2021 qofa irratti akka hundaa\'u godha.',
      am: 'አዎ። ጥብቅ የሲስተም መመሪያችን የተሻሩ ሕጎችን እንዳይጠቀም በመከልከል አዳዲስ ሕጎችን (ለምሳሌ አዋጅ ቁጥር 1156/2011 እና 1243/2013) ብቻ እንዲከተል አድርጓል።',
      en: 'Yes. Our system instructions strictly prohibit repealed laws and enforce current active legislation like Labor Proclamation 1156/2019 and Commercial Code 1243/2021.',
    },
  },
  {
    category: 'Troubleshooting',
    question: {
      om: 'Yeroo intarneetiin dhabamu (Offline) appichi ni hojjetaa?',
      am: 'ኢንተርኔት በማይኖርበት ጊዜ (Offline) መተግበሪያው ይሰራል?',
      en: 'Does the app work when internet connection is lost (Offline mode)?',
    },
    answer: {
      om: 'Eeyyee! Kuusaa Dhaddacha Ijoo (Cassation Library), Sanadoota Kuusaman (Saved Documents), fi Galmee Jechootaa intarneeta malee guutummaatti offline dhaan fayyadamuu dandeessu.',
      am: 'አዎ! የሰበር መዛግብትን (Cassation Library)፣ የተቀመጡ ሰነዶችን (Saved Documents) እና የህግ መዝገበ-ቃላትን ያለኢንተርኔት (Offline) መጠቀም ይችላሉ።',
      en: 'Yes! The Cassation Library, Saved Documents, and Legal Glossary work fully offline with local database caching.',
    },
  },
];

export const LegalFAQSupportView: React.FC<LegalFAQSupportViewProps> = ({ currentLang }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaq = FAQ_ITEMS.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.question[currentLang]?.toLowerCase().includes(q) ||
      item.answer[currentLang]?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <HelpCircle className="w-40 h-40 text-amber-400" />
        </div>

        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <span>❓</span>
            <span>FAQ & Gaaffiiwwan Irra Deddeebi'iin Gaafataman</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100">
            {currentLang === 'om' ? 'Gargaarsa fi Gaaffiiwwan Yeroo Hunda Gaafataman (FAQ & Support)' : 'እገዛ እና ተደጋጋሚ ጥያቄዎች (FAQ & Support)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            {currentLang === 'om'
              ? 'Yeroo rakkoon Isin qunnamu furmaata argachuuf odeeffannoo fi kallattii armaan gadii hordofaa.'
              : 'ችግር በሚገጥምበት ጊዜ ፈጣን መፍትሄ ለማግኘት ከዚህ በታች ያሉትን መመሪያዎች ይከተሉ።'}
          </p>

          <div className="pt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={currentLang === 'om' ? 'Gaaffii barbaaddan asitti barreessaa...' : 'ጥያቄዎን እዚህ ይፈልጉ...'}
              className="w-full sm:w-96 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-100 font-serif-legal flex items-center gap-2">
          <span>📚</span>
          <span>Gaaffiiwwan Ijoo (Frequently Asked Questions)</span>
        </h2>

        <div className="space-y-3">
          {filteredFaq.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden transition-all shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {item.category}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200">
                      {item.question[currentLang] || item.question.om}
                    </h3>
                  </div>
                  <span className="p-2 rounded-xl bg-slate-800 text-slate-300 shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40">
                    {item.answer[currentLang] || item.answer.om}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Support Pathway / Contact Box */}
      <div className="rounded-3xl border border-amber-500/30 bg-slate-900 p-6 sm:p-8 space-y-4 shadow-2xl">
        <h3 className="text-base font-bold text-slate-100 font-serif-legal flex items-center gap-2">
          <span>📞</span>
          <span>Kallattii Furmaata Rakkoo & Gargaarsa Addaa (Support Pathway)</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          {currentLang === 'om'
            ? 'Rakkoo teeknikaa ykn gaaffii seeraa addaa qabduu? Kallattiin ogeessota keenya waliin walqunnamuun deebii argachuu dandeessu:'
            : 'የቴክኒክ ችግር ወይም ልዩ የህግ ጥያቄ አለዎት? ከዚህ በታች ባሉት አማራጮች በቀጥታ ማግኘት ይችላሉ፡'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <a
            href="https://t.me/ayelebeharmee"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex items-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Telegram Support</div>
              <div className="text-[11px] text-sky-400 font-mono">@ayelebeharmee</div>
            </div>
          </a>

          <a
            href="mailto:support@saiethio.com"
            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex items-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Email Legal Support</div>
              <div className="text-[11px] text-amber-400 font-mono">support@saiethio.com</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};
