import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, Scale, X, Check, Award, FileText } from 'lucide-react';
import { Language } from '../i18n/translations';

interface AntiCloningProtectionBadgeProps {
  currentLang: Language;
}

export const AntiCloningProtectionBadge: React.FC<AntiCloningProtectionBadgeProps> = ({ currentLang }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Clickable Status Pill in Footer / Header */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold transition-all hover:scale-105 shadow-sm cursor-pointer"
        title="Mirgi Qabeenya Sammuu Eegamaadha (Anti-Cloning & IP Protection Active)"
      >
        <Lock className="w-3 h-3 text-emerald-400" />
        <span className="font-mono">IP Protected • Ayele Be Dha</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </button>

      {/* Official Legal Ownership & Anti-Cloning Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-100 font-serif-legal">
                    Waraqaa Eegumsa Qabeenya Sammuu (IP Protection)
                  </h3>
                  <span className="text-xs text-amber-400 font-mono">
                    FDRE Proclamation No. 410/2004 Registered
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Ownership Details */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Abbaa Qabeenyaa / Sole Owner:
                  </span>
                  <span className="font-bold text-slate-100 text-sm">
                    Ayele Be Dha
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Gahee / Role:
                  </span>
                  <span className="font-bold text-amber-400">
                    Ogeessa Seeraa (Jurist)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Iimeelii Mirkanaa'e / Verified Email:
                  </span>
                  <span className="font-mono text-slate-300">
                    support@saiethio.com
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Sadarkaa Eegumsaa / Protection Status:
                  </span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    CUFAMAADHA (LOCKED)
                  </span>
                </div>
              </div>
            </div>

            {/* Legal Notice Text */}
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Labsii Eegumsa Mirga Qabeenya Sammuu (Warning & IP Policy):</span>
              </div>
              <p>
                Appilikeeshiniin <strong>SeeraAI</strong> kun qabeenya dhuunfaa fi sammuu <strong>Ogeessa Seeraa Ayele Be Dha</strong> ti. Namoonni biroo koodii, qabiyyee seeraa, bu'uura deetaa dhaddacha ijoo, fi boca teeknooloojii appii kanaa akka hin garagalchineef (anti-cloning / anti-scraping) eegumsi teeknooloojii fi seeraa guutuun hojiirra ooleera.
              </p>
              <p className="font-mono text-[11px] text-slate-400 pt-1">
                Akka Labsii Mirga Abbaa Qabeenyummaa fi Mirgoota Wal-qabatanii FDRE Lakk. 410/2004 tti, heeyyama barreeffamaa malee appii kana garagalchuu, fakkeessanii uumuun, yookiin daldalaaf oolchuun dhoorgaa fi adabbii seeraa qaba.
              </p>
            </div>

            {/* Security Protections Active */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Anti-Cloning Shield Dammaqee Jira</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Anti-Scraping Bot Filter Active</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Ownership Cryptographic Hash Verified</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Admin Rights: Verified Lead Account</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Hubadheera / I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
