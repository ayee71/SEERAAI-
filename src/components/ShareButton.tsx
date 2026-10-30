import React, { useState } from 'react';
import { Share2, Check, Copy, ExternalLink, Sparkles, X, Globe, Smartphone, UserCheck, Edit3 } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { ShareableAppState, createPersonalizedUrl, getSavedCreatorName, saveCreatorName } from '../services/shareUrl';

interface ShareButtonProps {
  currentLang: Language;
  currentState: ShareableAppState;
  className?: string;
  variant?: 'navbar' | 'compact' | 'primary';
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  currentLang,
  currentState,
  className = '',
  variant = 'navbar',
}) => {
  const t = translations[currentLang];
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [shareType, setShareType] = useState<'current' | 'app'>('current');
  const [creatorName, setCreatorName] = useState<string>(getSavedCreatorName());

  const getShareUrl = () => {
    return createPersonalizedUrl(
      creatorName.trim() || undefined,
      shareType === 'app' ? 'home' : currentState.tab,
      currentLang
    );
  };

  const handleCopyLink = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    const url = getShareUrl();
    const creatorCredit = creatorName ? ` (Kan qopheesse: ${creatorName})` : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareType === 'app' ? `SeeraAI - Legal AI Platform${creatorCredit}` : `SeeraAI - ${currentState.tab}`,
          text: shareType === 'app'
            ? `SeeraAI - Trilingual Ethiopian Legal AI Platform${creatorCredit}`
            : currentState.query
            ? `Qorannoo Seeraa: "${currentState.query.substring(0, 80)}..."${creatorCredit}`
            : `SeeraAI - Ethiopian Legal AI Platform${creatorCredit}`,
          url,
        });
        return;
      } catch (e) {
        // User cancelled or share failed, fallback to copy
      }
    }
    handleCopyLink();
  };

  const getTabLabel = (tab: string) => {
    const nav = t.nav as Record<string, string>;
    return nav[tab] || tab;
  };

  return (
    <div className="relative inline-block">
      {variant === 'navbar' && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-emerald-950/40'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:text-amber-400 hover:border-amber-500/40'
            } ${className}`}
            title={t.shareState.copyLink}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-bold">{t.shareState.linkCopied}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{t.shareState.copyLink}</span>
                <span className="sm:hidden">{t.actions.share}</span>
              </>
            )}
          </button>

          {/* Details / modal trigger icon */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-amber-400 text-xs transition-all cursor-pointer"
            title={t.shareState.shareTitle}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {variant === 'primary' && (
        <button
          type="button"
          onClick={handleCopyLink}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-xs tracking-wide transition-all shadow-md cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 hover:border-amber-500/50'
          } ${className}`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4 text-amber-400" />}
          <span>{copied ? t.shareState.linkCopied : t.shareState.copyLink}</span>
        </button>
      )}

      {/* Share Details Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl z-50 text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                {t.shareState.shareTitle}
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Name / Brand Customizer */}
          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Maqaa Keessaniin Qoodaa:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">?by={creatorName || '...'}</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={creatorName}
                onChange={(e) => {
                  setCreatorName(e.target.value);
                  saveCreatorName(e.target.value);
                }}
                placeholder="Maqaa keessan (fkn: Abukaattoo Tolasaa)"
                className="w-full pl-3 pr-8 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-200 font-medium focus:outline-none focus:border-amber-400"
              />
              <Edit3 className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Namni liinkii kana banu maqaa keessan <strong>"{creatorName || 'Ogeessa Seeraa'}"</strong> jedhu fuula gubbaatti arga.
            </p>
          </div>

          {/* Share Type Selector */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={() => setShareType('app')}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                shareType === 'app'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Appilikeeshinii Guutuu</span>
            </button>
            <button
              type="button"
              onClick={() => setShareType('current')}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                shareType === 'current'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fuula Ammaa ({getTabLabel(currentState.tab)})</span>
            </button>
          </div>

          {/* URL Input Box with Copy Button */}
          <div className="mt-3 relative">
            <input
              type="text"
              readOnly
              value={getShareUrl()}
              className="w-full pl-3 pr-20 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-amber-300/90 font-mono select-all focus:outline-none focus:border-amber-500/70"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
              }`}
            >
              {copied ? 'Waraabame!' : 'Waraabi'}
            </button>
          </div>

          {/* Social Preview Card Preview */}
          <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold block">
                Suuraa & Liinkii Qoodamu (Link Preview):
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                Aye Harmee Ayee Be
              </span>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md">
              <img
                src="/og-image.jpg"
                alt="Aye Harmee Ayee Be - Lady Justice Legal Emblem"
                className="w-full h-32 object-cover"
              />
              <div className="p-2.5 space-y-0.5">
                <span className="text-[10px] text-slate-500 block font-mono truncate">
                  ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app
                </span>
                <h5 className="text-xs font-bold text-slate-200 line-clamp-1">
                  SeeraAI • {creatorName || 'Ayele Be Dha'} | Sirna Seeraa Itoophiyaa
                </h5>
                <p className="text-[10px] text-slate-400 line-clamp-1">
                  Aye Harmee Ayee Be • Trilingual Ethiopian Legal AI Platform
                </p>
              </div>
            </div>

            {/* Quick Share to Facebook, Telegram & Email */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const url = getShareUrl();
                  const fbUrl = `${url}${url.includes('?') ? '&' : '?'}utm_source=facebook`;
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fbUrl)}`, '_blank');
                }}
                className="py-1.5 px-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <span>📘 Facebook</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = getShareUrl();
                  const tgUrl = `${url}${url.includes('?') ? '&' : '?'}utm_source=telegram`;
                  const text = encodeURIComponent(`⚖️ SeeraAI - Sirna Seeraa Afaan-Sadee (Aye Harmee Ayee Be)\n${tgUrl}`);
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(tgUrl)}&text=${text}`, '_blank');
                }}
                className="py-1.5 px-2 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <span>✈️ Telegram</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = getShareUrl();
                  const emailUrl = `${url}${url.includes('?') ? '&' : '?'}utm_source=email`;
                  const subject = encodeURIComponent('Affeerraa SeeraAI - Sirna Qorannoo fi Tajaajila Seeraa');
                  const body = encodeURIComponent(
                    `Akkam jirtu,\n\nAppilikeeshinii fi sirna qorannoo seeraa afaan-sadee (Afaan Oromoo, Amharic, English) SeeraAI jedhamu kan ogeessota seeraatiif qophaa'e akka fayyadamtaniif affeeramtaniittu.\n\nLiinkii kanaan seenaa:\n${emailUrl}\n\nNagaa wajjin,\n${creatorName || 'Ayele Be Dha'}`
                  );
                  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                }}
                className="py-1.5 px-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <span>✉️ Email</span>
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800/70">
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span>✓ Liinkii Uummataa (Public Shared)</span>
            </span>
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <button
                type="button"
                onClick={handleNativeShare}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Bilbilaan Qoodi (Share)...</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                <span>Liinkii Waraabi (Copy Link)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
