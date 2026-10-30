import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { 
  getAnsweredQAsFromStorage, 
  AnsweredLegalQA 
} from '../services/legalQnARepository';
import { 
  getSocialMediaLegalPosts, 
  SocialMediaLegalPost 
} from '../services/socialMediaLegalRepository';
import { AudioSpeakButton } from './AudioSpeakButton';
import { 
  MessageSquare, 
  Search, 
  Scale, 
  Copy, 
  CheckCircle2, 
  Share2, 
  Award, 
  Bookmark, 
  Sparkles, 
  ExternalLink,
  BookOpen,
  Filter,
  Check
} from 'lucide-react';

interface LegalQnARepositoryViewProps {
  currentLang: Language;
  onNavigateToExplain?: (query: string) => void;
}

export const LegalQnARepositoryView: React.FC<LegalQnARepositoryViewProps> = ({
  currentLang,
  onNavigateToExplain,
}) => {
  const [qnaList, setQnaList] = useState<AnsweredLegalQA[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialMediaLegalPost[]>([]);
  const [activeTab, setActiveTab] = useState<'qna' | 'stampedPosts'>('qna');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setQnaList(getAnsweredQAsFromStorage());
    setSocialPosts(getSocialMediaLegalPosts());
  }, []);

  const filteredQnAs = qnaList.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.question.toLowerCase().includes(q) ||
      item.answerContent.om.toLowerCase().includes(q) ||
      item.answerContent.am.toLowerCase().includes(q) ||
      item.answerContent.en.toLowerCase().includes(q) ||
      item.referencedStatutes.some((s) => s.toLowerCase().includes(q))
    );
  });

  const filteredPosts = socialPosts.filter((post) => {
    if (selectedCategory !== 'all' && post.category !== selectedCategory) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.title.om.toLowerCase().includes(q) ||
      post.content.om.toLowerCase().includes(q) ||
      post.statutoryCitations.some((c) => c.toLowerCase().includes(q)) ||
      post.author.toLowerCase().includes(q)
    );
  });

  const handleCopyQA = (item: AnsweredLegalQA) => {
    const text = `❓ GAAFFII SEERAA: ${item.question}\n\n💡 DEEBII SEERAA:\n${item.answerContent[currentLang] || item.answerContent.om}\n\n📜 LABSIILEE/KEEYYATTOOTA CAQASAMAN:\n${item.referencedStatutes.join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyPost = (post: SocialMediaLegalPost) => {
    const text = `📌 ${post.title[currentLang] || post.title.om}\n\n${post.content[currentLang] || post.content.om}\n\n⚖️ SEEROOTA CAQASAMAN: ${post.statutoryCitations.join(', ')}\n— ${post.author}`;
    navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om'
                  ? 'Kuusaa Gaaffii & Deebii Seeraa (Legal Q&A & Certified Posts)'
                  : currentLang === 'am'
                  ? 'የሕግ ጥያቄዎችና መልሶች ማከማቻ እና የተረጋገጡ ማስታወሻዎች'
                  : 'Answered Legal Q&A Repository & Certified Posts'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {currentLang === 'om'
                  ? 'Gaaffiileef deebiiwwan seeraa AI fi Ogeessaan kennaman, seerota caqasamaniin waliin otomaatikiin kuufamanii fi Maxxansoota Chaappaa Qaban'
                  : 'Automatically archived answered legal questions with cited statutes and certified stamped social media legal posts'}
              </p>
            </div>
          </div>

          {/* Subtab Switcher */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('qna')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'qna'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>💬</span>
              <span>Gaaffii & Deebii Kuufaman ({qnaList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stampedPosts')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'stampedPosts'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>📜</span>
              <span>Maxxansoota Chaappaa Qaban & Social Media ({socialPosts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter & Search Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              currentLang === 'om'
                ? 'Barbaadi: Gaaffii seeraa, Kireeffataa, Hojjetaa ari\'uu, Lafa, Waliigaltee, Labsii 1156...'
                : 'Search legal question, tenant rights, labor dismissal, land compensation...'
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kallaattii Seeraa:</span>
          {['all', 'labor', 'property', 'contract', 'criminal', 'family', 'commercial'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold uppercase transition-all cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-amber-300 border-amber-500/60'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recommended Legal Professional Matching Selected Category */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⭐</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om' ? 'Ogeessa Seeraa Gorfamu (Recommended Legal Professional)' : currentLang === 'am' ? 'የሚመከር የሕግ ባለሙያ (Recommended Legal Professional)' : 'Recommended Legal Professional'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentLang === 'om'
                  ? 'Ogeessa seeraa damee kanaan speshalaayizii ta\'e fi gorsa dhuunfaa kennu'
                  : 'በዚህ የሕግ ዘርፍ የተካኑ ባለሙያ እና ቀጥተኛ የሕግ ምክር'}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
            ✓ CASSATION & ADVOCACY VERIFIED
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 text-xs text-slate-300">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-lg shrink-0 overflow-hidden">
              👨‍a
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-100 text-sm font-serif-legal">
                  Minishaaw Getaahun Kaasaa
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 border border-slate-800 text-[10px] font-mono">
                  Advocate / Attorney
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-950 text-emerald-400 border border-slate-800 text-[10px] font-mono">
                  10+ Yrs Exp
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-serif-legal">
                Specialized in Cassation Precedents, Civil Contracts, Labor Disputes, Usufruct Real Estate Litigation, and Legal Defense.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['civil', 'contract', 'labor', 'property', 'criminal'].map((tag) => (
                  <span
                    key={tag}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase border ${
                      selectedCategory === tag || selectedCategory === 'all'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-slate-950 text-slate-500 border-slate-850'
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            <a
              href="https://t.me/minishaw"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-sky-950 hover:bg-sky-900 border border-sky-500/40 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm flex-1 md:flex-initial justify-center"
            >
              <span>✈️</span>
              <span>Telegram Consultation</span>
            </a>
            <a
              href="tel:+251913901421"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md flex-1 md:flex-initial justify-center"
            >
              <span>📞</span>
              <span>+251913901421</span>
            </a>
          </div>
        </div>
      </div>

      {/* Q&A Tab Content */}
      {activeTab === 'qna' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>Gaaffiilee Deebiin Kennameef: <strong className="text-amber-400">{filteredQnAs.length}</strong></span>
            <span>Status: <strong className="text-emerald-400">✓ Auto-Archived with Statutes</strong></span>
          </div>

          {filteredQnAs.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">Gaaffiin seeraa kuufamaa kanaan wal-simatu hin argamne.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredQnAs.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 shadow-xl transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-mono font-bold text-[10px] uppercase border border-amber-500/30">
                          {item.category}
                        </span>
                        {item.isVerifiedByExpert && (
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 font-mono font-bold text-[10px] uppercase border border-emerald-500/40 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Seeraan Mirkanaa'aa</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">{item.timestamp}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-100 font-serif-legal">
                        ❓ GAAFFII: {item.question}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyQA(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {copiedId === item.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Waraabbame!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Waraabbadhu</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Answer Box */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>DEEBII SEERAA & IBSA (Grounded Legal Answer):</span>
                      </div>
                      <AudioSpeakButton
                        text={`${item.question}. Deebiin: ${item.answerContent[currentLang] || item.answerContent.om}`}
                        label="Deebii Dubbisi"
                        variant="pill"
                      />
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {item.answerContent[currentLang] || item.answerContent.om}
                    </p>
                  </div>

                  {/* Statutes & Cassation References */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800 text-xs">
                    <span className="text-slate-400 text-[11px] font-bold">Seerota Caqasaman:</span>
                    {item.referencedStatutes.map((st, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-mono text-[11px] border border-amber-500/30"
                      >
                        📜 {st}
                      </span>
                    ))}
                    {item.referencedCassations?.map((cs, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 font-mono text-[11px] border border-purple-500/30"
                      >
                        ⚖️ {cs}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stamped Posts Tab Content */}
      {activeTab === 'stampedPosts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>Maxxansoota Chaappaa Qaban: <strong className="text-purple-400">{filteredPosts.length}</strong></span>
            <span>Channel: <strong className="text-emerald-400">Official Telegram & Facebook Legal Feed</strong></span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-6 shadow-xl transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px] uppercase border border-purple-500/40">
                        {post.sourcePlatform.toUpperCase()}
                      </span>
                      {post.hasOfficialStamp && (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] uppercase border border-amber-500/40 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>Chaappaa Qaba (Certified Stamp)</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">{post.publishedDate}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 font-serif-legal">
                      {post.title[currentLang] || post.title.om}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold">
                      Maxxansaa: {post.author}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <AudioSpeakButton
                      text={`${post.title[currentLang] || post.title.om}. ${post.content[currentLang] || post.content.om}`}
                      label="Dubbisi"
                      variant="compact"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyPost(post)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedId === post.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Waraabbame!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Waraabbadhu</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Main Content */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                  {post.content[currentLang] || post.content.om}
                </div>

                {/* Stamp Seal Card */}
                {post.hasOfficialStamp && post.stampSealDetails && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 font-mono">
                    <div className="space-y-0.5">
                      <span className="font-bold block">🏵️ {post.stampSealDetails.issuingOffice}</span>
                      <span className="text-[10px] text-amber-400/80">Lakk. Eeyyamaa: {post.stampSealDetails.licenseNumber}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold">✓ Official Certified Seal</span>
                  </div>
                )}

                {/* Statutory Citations */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 text-[11px] font-bold">Seerota Caqasaman:</span>
                    {post.statutoryCitations.map((cit, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[10px]">
                        {cit}
                      </span>
                    ))}
                  </div>

                  {post.externalLink && (
                    <a
                      href={post.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 text-[11px]"
                    >
                      <span>Channel’tti Bannuu</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
