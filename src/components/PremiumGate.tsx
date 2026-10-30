import React, { useState } from 'react';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { SubscribeModal } from './SubscribeModal';
import { Lock, Crown, Sparkles, ShieldAlert } from 'lucide-react';
import { Language } from '../i18n/translations';

interface PremiumGateProps {
  children: React.ReactNode;
  featureTitle?: string;
  featureDescription?: string;
  currentLang?: Language;
  compact?: boolean;
  blurIntensity?: 'sm' | 'md' | 'lg';
  /**
   * When true (default), prevents the real sensitive children DOM from rendering
   * for non-premium users to ensure sensitive code/data is not accessible in browser DevTools.
   */
  secureCodeProtection?: boolean;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({
  children,
  featureTitle,
  featureDescription,
  currentLang = 'om',
  compact = false,
  blurIntensity = 'sm',
  secureCodeProtection = true,
}) => {
  const { isPremiumSubscriber, userRole } = usePremiumAccess();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // If user has the 'premium' role in Firestore profile, render children directly with zero restrictions!
  if (isPremiumSubscriber) {
    return <>{children}</>;
  }

  // Non-Premium Users: Apply 'blur-sm' filter and 'grayscale' filter, overlaying lock icon & Subscribe button
  const blurClass = 'blur-sm grayscale';

  if (compact) {
    return (
      <>
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowSubscribeModal(true);
          }}
          className="relative inline-block cursor-pointer group"
          title="Subscribe to unlock this premium feature"
        >
          {/* Blurred & Grayscale element */}
          <div className={`${blurClass} pointer-events-none select-none opacity-40 transition-all group-hover:opacity-30`}>
            {secureCodeProtection ? (
              <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs font-mono">
                [Locked: Premium Role Required]
              </span>
            ) : (
              children
            )}
          </div>

          {/* Compact Subscribe Lock Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 rounded-xl border border-amber-500/50 px-2.5 py-1 gap-1.5 shadow-lg group-hover:border-amber-400 group-hover:bg-slate-950/90 transition-all">
            <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSubscribeModal(true);
              }}
              className="text-[10px] font-black text-amber-300 uppercase tracking-wider font-mono hover:underline cursor-pointer"
            >
              Subscribe
            </button>
          </div>
        </div>

        <SubscribeModal
          isOpen={showSubscribeModal}
          onClose={() => setShowSubscribeModal(false)}
          currentLang={currentLang}
          featureName={featureTitle}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 bg-slate-950/90 shadow-2xl my-3 group">
        {/* Background Blurred & Grayscale Content (blur-sm & grayscale applied) */}
        <div
          className={`${blurClass} pointer-events-none select-none opacity-25 filter grayscale contrast-125 min-h-[160px] p-6`}
          aria-hidden="true"
        >
          {secureCodeProtection ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-slate-700/50 rounded-xl w-3/4" />
              <div className="h-4 bg-slate-800/60 rounded-lg w-full" />
              <div className="h-4 bg-slate-800/60 rounded-lg w-5/6" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="h-10 bg-slate-800/50 rounded-xl" />
                <div className="h-10 bg-slate-800/50 rounded-xl" />
              </div>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Prominent 'Subscribe' Lock Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950/85 via-slate-900/95 to-slate-950/98 backdrop-blur-[2px] space-y-3.5">
          {/* Lock Icon with Aura */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 text-amber-300 flex items-center justify-center text-2xl shadow-xl shadow-amber-500/10 group-hover:scale-110 group-hover:border-amber-400 transition-all duration-300">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow">
              ★
            </div>
          </div>

          <div className="space-y-1 max-w-md">
            <div className="flex items-center justify-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase border border-amber-500/30">
                Firestore Role: {userRole || 'Standard'} (Non-Premium)
              </span>
            </div>

            <h4 className="text-base sm:text-lg font-bold font-serif-legal text-white mt-1">
              {featureTitle || (
                currentLang === 'om'
                  ? 'Tajaajila Premium Qofaaf (Subscribe Required)'
                  : currentLang === 'am'
                  ? 'የፕሪሚየም አባላት አገልግሎት ብቻ (Subscribe)'
                  : 'Premium Role Required to Access'
              )}
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed">
              {featureDescription || (
                currentLang === 'om'
                  ? 'Koodiin fi tajaajilli kun profile Firestore keessatti gahee `role: "premium"` qofaaf banaadha. Itti fayyadamuuf butoona "Subscribe" tuquun mirkanaa\'aa.'
                  : currentLang === 'am'
                  ? 'ይህ አገልግሎት በFirestore ፕሮፋይል ውስጥ `role: "premium"` ላላቸው አባላት ብቻ የተፈቀደ ነው።'
                  : 'This section requires a verified "premium" role in your Firestore document. Click Subscribe below to unlock.'
              )}
            </p>
          </div>

          {/* Interactive 'Subscribe' Lock Action Button */}
          <button
            onClick={() => setShowSubscribeModal(true)}
            className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Lock className="w-4 h-4 text-slate-950" />
            <span>
              {currentLang === 'om' ? 'Subscribe (Miseensa Ta\'i)' : currentLang === 'am' ? 'Subscribe (ይግዙ)' : 'Subscribe to Unlock'}
            </span>
            <Crown className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      </div>

      {/* Subscription Activation Modal */}
      <SubscribeModal
        isOpen={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        currentLang={currentLang}
        featureName={featureTitle}
      />
    </>
  );
};
