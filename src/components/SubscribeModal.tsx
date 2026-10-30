import React, { useState } from 'react';
import { Language } from '../i18n/translations';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { Crown, Lock, CheckCircle2, Shield, Sparkles, X, ArrowRight, Star } from 'lucide-react';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: Language;
  featureName?: string;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
  isOpen,
  onClose,
  currentLang = 'om',
  featureName,
}) => {
  const { isPremiumSubscriber, upgradeToPremium } = usePremiumAccess();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubscribeNow = async () => {
    setLoading(true);
    try {
      await upgradeToPremium();
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (e) {
      alert(currentLang === 'om' ? 'Haaromsuun hin milkoofne. Maaloo irra deebi\'aa yaalaa.' : 'Subscription update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl space-y-6 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-2xl shadow-inner">
            <Crown className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase border border-amber-500/30">
                Premium Subscriber Only
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Star className="w-3 h-3 fill-emerald-400" /> Firestore Verified
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-serif-legal text-white mt-0.5">
              {currentLang === 'om'
                ? 'Miseensa Premium Ta\'aa (Subscribe)'
                : currentLang === 'am'
                ? 'የፕሪሚየም አባል ይሁኑ (Subscribe)'
                : 'Unlock Premium Subscriber Access'}
            </h3>
          </div>
        </div>

        {/* Feature targeted */}
        {featureName && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
            <span className="font-semibold block">{currentLang === 'om' ? 'Tajaajila Cufame:' : 'የተቆለፈው አገልግሎት:'}</span>
            <span className="text-slate-300">{featureName}</span>
          </div>
        )}

        {/* Value Proposition List */}
        <div className="space-y-2.5 text-xs text-slate-300">
          <p className="text-slate-400 text-xs">
            {currentLang === 'om'
              ? 'Koodiin fi tajaajilli kun profile Firestore keessatti gahee `role: "premium"` qofaaf banaadha:'
              : 'ይህ የኮድ እና የአገልግሎት ክፍል በFirestore ፕሮፋይል ውስጥ `role: "premium"` ላላቸው ብቻ የተፈቀደ ነው፡'}
          </p>
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            {[
              {
                om: 'Model AI Deep Thinking fi Qorannoo Murtii Gadi-fagoo',
                am: 'የላቀ AI Deep Thinking እና ጥልቅ የሰበር ውሳኔዎች ትንተና',
                en: 'Deep Thinking AI model & supreme court outcome simulator'
              },
              {
                om: 'Mallattoo Dijitaalaa SHA-256 & Seeli Mana Murtii (Labsii 1072/2018)',
                am: 'SHA-256 ዲጂታል ፊርማ እና የፍርድ ቤት ማህተም',
                en: 'Cryptographic SHA-256 document signing & tamper verification'
              },
              {
                om: 'Dhaddacha Karaa Viidiyoo Google Meet Official Uumuu',
                am: 'ኦፊሴላዊ የጎግል ሚት (Google Meet) ችሎት ማደራጃ',
                en: 'Official Google Meet virtual courtroom direct session builder'
              },
              {
                om: 'Kaffaltii Platformii %100 Bilisa (Fee Exemption & Waiver)',
                am: 'ከፕላትፎርም የሂደት ክፍያ 100% ነፃ መሆን',
                en: '100% Waived processing fee on all legal pleadings'
              }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{item[currentLang as 'om' | 'am' | 'en'] || item.om}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 space-y-2">
          {success ? (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {currentLang === 'om'
                  ? 'Miseensummaan Premium Milkaa\'inaan Mirkanaa\'eera!'
                  : 'የፕሪሚየም አባልነትዎ በተሳካ ሁኔታ ተረጋግጧል!'}
              </span>
            </div>
          ) : (
            <button
              onClick={handleSubscribeNow}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs tracking-wide uppercase flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-950" />
                  <span>
                    {currentLang === 'om'
                      ? 'Miseensa Premium Ta\'i (Activate in Firestore)'
                      : currentLang === 'am'
                      ? 'ፕሪሚየም አባልነትን አግብር (Activate in Firestore)'
                      : 'Activate Premium Role in Firestore'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          <p className="text-[11px] text-center text-slate-500">
            {currentLang === 'om'
              ? 'Gatiin kaffaltii bilisa; herreegi keessan battalatti Firestore keessatti "role: premium" ta\'a.'
              : 'ማሳሰቢያ፡ ይህ እርምጃ የመለያዎን ሁኔታ በFirestore ውስጥ ወደ "role: premium" ይቀይረዋል።'}
          </p>
        </div>
      </div>
    </div>
  );
};
