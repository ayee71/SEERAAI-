import React, { useState } from 'react';
import { Database, ExternalLink, X, Globe, Send, AlertTriangle } from 'lucide-react';
import { Language } from '../i18n/translations';
import { getBuildStatusSummary, VERIFIED_TELEGRAM_ARCHIVE_URL } from '../services/dynamicAssetLoader';

interface ExternalDatasetNoticeBannerProps {
  currentLang: Language;
}

export const ExternalDatasetNoticeBanner: React.FC<ExternalDatasetNoticeBannerProps> = ({ currentLang }) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const buildInfo = getBuildStatusSummary();

  if (dismissed) return null;

  const labels = {
    om: {
      tag: 'Kuusaa Sanadoota Alaa (1.45 GB)',
      msg: `Hanga appii (${buildInfo.publishLimit}) eeguuf, galmeewwan seeraa 1,500+ Telegram Archive irratti qophaa'aniiru.`,
      btnTelegram: 'Telegram Archive (1,500+)',
      btnOptions: 'Madda Filadhu',
      status: `Build: ${buildInfo.version} (${buildInfo.bundleSize})`,
    },
    am: {
      tag: 'የውጭ የሕግ መዛግብት (1.45 GB)',
      msg: `የአፕሊኬሽኑን የ${buildInfo.publishLimit} ገደብ ለመጠበቅ፣ 1,500+ የሕግ ሰነዶች በቴሌግራም አርካይቭ ላይ ይገኛሉ።`,
      btnTelegram: 'ቴሌግራም አርካይቭ (1,500+)',
      btnOptions: 'ምንጭ ምረጥ',
      status: `ስሪት: ${buildInfo.version} (${buildInfo.bundleSize})`,
    },
    en: {
      tag: 'External Legal Dataset (1.45 GB)',
      msg: `To stay under the ${buildInfo.publishLimit} limit, 1,500+ legal documents are hosted on the Telegram Archive.`,
      btnTelegram: 'Telegram Archive (1,500+)',
      btnOptions: 'Dataset Sources',
      status: `Build: ${buildInfo.version} (${buildInfo.bundleSize})`,
    },
  }[currentLang] || {
    tag: 'External Legal Dataset (1.45 GB)',
    msg: `To stay under the ${buildInfo.publishLimit} limit, 1,500+ legal documents are hosted on the Telegram Archive.`,
    btnTelegram: 'Telegram Archive (1,500+)',
    btnOptions: 'Dataset Sources',
    status: `Build: ${buildInfo.version} (${buildInfo.bundleSize})`,
  };

  const handleOpenTelegram = () => {
    window.open(VERIFIED_TELEGRAM_ARCHIVE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <aside 
        aria-label="External dataset notice"
        className="bg-slate-900/95 border-b border-amber-500/40 px-4 py-2 text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md z-30"
      >
        <div className="flex items-center gap-2.5 text-left">
          <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
            <Globe className="w-4 h-4 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-400">{labels.tag}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                {labels.status}
              </span>
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5">{labels.msg}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleOpenTelegram}
            className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer active:scale-95"
            title="Open Verified Telegram Archive (1,500+ Documents)"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{labels.btnTelegram}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOptionsModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{labels.btnOptions}</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Dataset Sources & DNS Explanation Modal */}
      {showOptionsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>📚</span>
                <span>Maddoota Kuusaa Seeraa (Legal Archives)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Option 1: Verified Telegram Channel */}
              <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-200">1. Telegram Master Archive (@saiorethio1)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">100% Active</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Sanadoota 1,500+ (Murtiiwwan Dhaddacha Ijoo, Labsiilee, fi wixineewwan) kallattiin kan qabatedha. Dogoggora DNS malee daqiiqaa hunda banaadha.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenTelegram();
                    setShowOptionsModal(false);
                  }}
                  className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Chaanala Telegram Bani (@saiorethio1)</span>
                </button>
              </div>

              {/* Option 2: GitHub Legal Archive & Profile */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>🐙</span>
                    <span>2. GitHub Legal Archive (@ayeledha)</span>
                  </span>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono font-bold">GitHub</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Yoo <strong>"404 Page not found"</strong> isiniif fide, repository maqaa <code>seeraai</code> jedhu account GitHub keessan irratti create hin goone jechuudha. Profile keessan banuun haala salphaan ilaaluu dandeessu.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => window.open('https://github.com/ayeledha', '_blank', 'noopener,noreferrer')}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
                  >
                    <span>👤 Profile (@ayeledha)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open('https://github.com/new', '_blank', 'noopener,noreferrer')}
                    className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer shadow"
                  >
                    <span>➕ Repo Uumi (New)</span>
                  </button>
                </div>
              </div>

              {/* Option 3: External Domain saorethio1.com */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">3. Domain saorethio1.com</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">DNS Note</span>
                </div>
                <p className="text-slate-400 text-[10px]">
                  Domain kun yeroof intarneeta irratti hin galmoofne (NXDOMAIN). Cuqaastiin isaa gara GitHub fi Telegram t.me/saiorethio1 tti isin qajeelcha.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOptionsModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
            >
              Cufi (Close)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
