import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link2, Copy, Check, ExternalLink, Smartphone, Download, ShieldCheck, X, Sparkles, Landmark, Globe } from 'lucide-react';
import { Language } from '../i18n/translations';

interface MMurtiiShortLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
}

export const MMurtiiShortLinkModal: React.FC<MMurtiiShortLinkModalProps> = ({
  isOpen,
  onClose,
  currentLang,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);

  if (!isOpen) return null;

  // Active Origin and Short Link URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app';
  const shortUrl = `${origin}/mmurtii`;
  const vanityAlias = 'mmurtii.oro';
  const fullPreviewUrl = `${origin}/?ref=mmurtii`;

  const copyToClipboard = async (text: string, type: 'link' | 'alias') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedAlias(true);
        setTimeout(() => setCopiedAlias(false), 2500);
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedAlias(true);
        setTimeout(() => setCopiedAlias(false), 2500);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MMurtii - Mana Murtii AI',
          text: 'MMurtii: Sirna Qorannoo fi Tajaajila Seeraa Mana Murtii • Aye Harmee Ayee Be',
          url: shortUrl,
        });
      } catch {}
    } else {
      copyToClipboard(shortUrl, 'link');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-sky-400 to-amber-500"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Cufi (Close)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Badge */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Liinkii Gabaabaa & Qoodiinsa MMurtii' : currentLang === 'am' ? 'የፍርድ ቤት አጭር ሊንክ (MMurtii)' : 'MMurtii Court Short Link & Alias'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                mmurtii
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentLang === 'om'
                ? 'Bakka liinkii dheeraa Cloud Run, karaa gabaabaa "mmurtii" kanaan fayyadamaa.'
                : currentLang === 'am'
                ? 'ረጅሙን የCloud Run ሊንክ በአጭሩ "mmurtii" በመጠቀም ይክፈቱ።'
                : 'Use the dedicated vanity alias "mmurtii" to access the court system without long URLs.'}
            </p>
          </div>
        </div>

        {/* Quick Vanity Alias Pill */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Maqaa Gabaabaa (Vanity Alias)</span>
              <span className="text-sm font-mono font-bold text-amber-300 select-all">{vanityAlias}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(vanityAlias, 'alias')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {copiedAlias ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAlias ? 'Koppii Ta\'e!' : 'Koppii'}</span>
          </button>
        </div>

        {/* Direct Functional Short URL */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 mb-5">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Liinkii Qajeelaa (Direct Shortcut URL)
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shortUrl}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-mono text-sky-300 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(shortUrl, 'link')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Waraabame!' : 'Waraabi'}</span>
            </button>
          </div>
        </div>

        {/* QR Code Scan Area */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-950/90 border border-amber-500/20 mb-5">
          <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center shrink-0">
            <QRCodeSVG
              value={shortUrl}
              size={120}
              level="H"
              includeMargin={false}
              fgColor="#0f172a"
            />
          </div>
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-amber-400">
              <Smartphone className="w-4 h-4" />
              <span>Bilbilaan Iskaan Godhaa (Scan with Camera)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Kaameeraa bilbila keessaniin koodii kana yoo iskaan gootan, liinkicha barreesuu osoo hin barbaachisin kallattiin gara <strong>MMurtii</strong>tti isin geessa.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer underline underline-offset-2"
              >
                <span>Liinkii kana namoota biroof ergaa (Share)...</span>
              </button>
            </div>
          </div>
        </div>

        {/* Practice Court Credentials Card for mmurtii.com */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/40 mb-5 shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>🎓 Shaakala Mana Murtii (mmurtii.com Practice Portal)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Practice Mode
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
            Hojii mana murtii qabatamaan shaakalaaf (practice): Akkawuntota shaakalaa armaan gadiitti qophaa'an fayyadamuun kallattiin seenuudhaan shaakalaa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-amber-300 font-bold">🏛️ Admin Shaakalaa</div>
              <div className="text-slate-300">Email: <span className="text-emerald-400">admin@mmurtii.com</span></div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-amber-300 font-bold">⚖️ Abbaa Seeraa Shaakalaa</div>
              <div className="text-slate-300">Email: <span className="text-emerald-400">judge@mmurtii.com</span></div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-amber-300 font-bold">📋 Galmeessaa / Registrar</div>
              <div className="text-slate-300">Email: <span className="text-emerald-400">registrar@mmurtii.com</span></div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-amber-300 font-bold">📑 Calaaqqisaa / Clerk</div>
              <div className="text-slate-300">Email: <span className="text-emerald-400">clerk@mmurtii.com</span></div>
            </div>
          </div>
        </div>

        {/* PWA Home Screen Installation Guide */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Download className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
              {currentLang === 'om' ? 'Gara Iskiriinii Jalqabaatti Dabaluu (Home Screen App)' : 'ወደ ስልክ ስክሪን ጫን (Install App)'}
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {currentLang === 'om' ? (
              <>
                Liinkii dheeraa gonkumaa barreesuu dhiisuuf: Browser keessan irraa tuqaalee sadii (⋮) tuquun <strong>"Add to Home screen"</strong> ykn <strong>"Appilikeeshinii Galchi"</strong> filadhaa. Maqaa <strong>"MMurtii"</strong> jedhuun akkuma appii dhugaatti bilbila keessan irratti ni ta'a.
              </>
            ) : (
              <>
                ይህንን ሲስተም እንደ መደበኛ መተግበሪያ በስልክዎ ላይ ለመጫን፡ በብራውዘርዎ የላይኛው ጥግ ሶስቱን ነጥቦች (⋮) በመንካት <strong>"Add to Home screen"</strong> የሚለውን ይምረጡ። በስም <strong>"MMurtii"</strong> ሆኖ ይቀመጣል።
              </>
            )}
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Nageenyi Isaa Eeggamaadha (Active & Verified)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all cursor-pointer"
          >
            Cufi (Done)
          </button>
        </div>

      </div>
    </div>
  );
};
