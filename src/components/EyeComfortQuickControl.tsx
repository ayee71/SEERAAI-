import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Eye, Palette, Check, Sparkles, ShieldAlert, Sliders } from 'lucide-react';
import { getUserSettings, saveUserSettings, UserSettings } from '../services/storage';

interface EyeComfortQuickControlProps {
  currentLang?: string;
}

export const EyeComfortQuickControl: React.FC<EyeComfortQuickControlProps> = ({ currentLang = 'om' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [brightness, setBrightness] = useState<number>(() => {
    const val = (settings as any).uiBrightness;
    return val ? parseFloat(val) : 1.0;
  });
  const [eyeProtectionMode, setEyeProtectionMode] = useState<boolean>(() => {
    return localStorage.getItem('seera_eye_protection') === 'true';
  });
  const [accentTheme, setAccentTheme] = useState<string>(() => {
    return localStorage.getItem('seera_accent_theme') || 'amber';
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Apply brightness filter and eye protection to document root
  useEffect(() => {
    const root = document.documentElement;
    let finalBrightness = brightness;
    if (eyeProtectionMode) {
      finalBrightness = Math.min(brightness, 0.92);
      root.style.filter = `brightness(${finalBrightness}) sepia(0.18)`;
    } else {
      root.style.filter = `brightness(${finalBrightness})`;
    }
    
    const updated = { ...settings, uiBrightness: finalBrightness } as any;
    setSettings(updated);
    saveUserSettings(updated);
    localStorage.setItem('seera_eye_protection', String(eyeProtectionMode));
    localStorage.setItem('seera_accent_theme', accentTheme);
  }, [brightness, eyeProtectionMode, accentTheme]);

  const presets = [
    { label: currentLang === 'om' ? 'Halkan (Eye-Care)' : 'Night Eye-Care', val: 0.82, protection: true },
    { label: currentLang === 'om' ? 'Dizaayinii Bartee' : 'Standard', val: 1.0, protection: false },
    { label: currentLang === 'om' ? 'Ifaa Guddaa (Bright)' : 'High Brightness', val: 1.25, protection: false },
  ];

  const themes = [
    { id: 'amber', name: 'Gold / Amber', bg: 'bg-amber-500', text: 'text-amber-300' },
    { id: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-500', text: 'text-emerald-300' },
    { id: 'indigo', name: 'Indigo Blue', bg: 'bg-indigo-500', text: 'text-indigo-300' },
    { id: 'slate', name: 'Midnight Slate', bg: 'bg-slate-500', text: 'text-slate-300' },
  ];

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-amber-300 hover:text-amber-200 text-xs font-semibold cursor-pointer transition-all shadow-sm group"
        title={currentLang === 'om' ? 'Ifiinsaa & Halluu Ija Eeguu (Brightness & Eye Comfort)' : 'Brightness & Eye Comfort Controls'}
      >
        <span className="text-sm">👁️</span>
        <span className="hidden md:inline font-mono text-[11px] text-amber-400">
          {Math.round(brightness * 100)}%
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-4 z-50 text-slate-100 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base">🛡️</span>
              <div>
                <h4 className="text-xs font-bold text-slate-100">
                  {currentLang === 'om' ? 'Eegumsa Ija & Ifiinsaa' : 'Eye Care & Brightness'}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {currentLang === 'om' ? 'Miidhaa ijarraa ittisuuf qindeessi' : 'Protect eyes from strain'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded-md bg-slate-800"
            >
              ✕
            </button>
          </div>

          {/* Brightness Slider */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1">
                <span>☀️</span> {currentLang === 'om' ? 'Sadarkaa Ifiinsaa (Brightness)' : 'Screen Brightness'}
              </span>
              <span className="font-mono font-bold text-amber-400">{Math.round(brightness * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.60"
              max="1.40"
              step="0.02"
              value={brightness}
              onChange={(e) => {
                setBrightness(parseFloat(e.target.value));
                setEyeProtectionMode(false);
              }}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>60% (Dark)</span>
              <span>100% (Normal)</span>
              <span>140% (Max)</span>
            </div>
          </div>

          {/* Eye Protection / Blue Light Shield Toggle */}
          <div className="mb-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">🌙</span>
              <div>
                <div className="text-xs font-bold text-slate-200">
                  {currentLang === 'om' ? 'Sirna Eegumsa Ija Halkan' : 'Eye Strain Shield'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {currentLang === 'om' ? 'Halluu miidhaa hin qabne fayyadami' : 'Warm amber tint filter'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setEyeProtectionMode(!eyeProtectionMode)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                eyeProtectionMode 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {eyeProtectionMode ? (currentLang === 'om' ? 'Banaa' : 'Active') : (currentLang === 'om' ? 'Cufaa' : 'Off')}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5 mb-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {currentLang === 'om' ? 'Filannoowwan Saffisaa' : 'Quick Presets'}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setBrightness(p.val);
                    setEyeProtectionMode(p.protection);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all text-center border cursor-pointer ${
                    Math.abs(brightness - p.val) < 0.05 && eyeProtectionMode === p.protection
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Themes */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {currentLang === 'om' ? 'Halluu Appii (Accent Theme)' : 'Theme Accent'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {themes.map((th) => (
                <button
                  key={th.id}
                  onClick={() => setAccentTheme(th.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all border cursor-pointer ${
                    accentTheme === th.id
                      ? 'bg-slate-800 border-amber-500/50 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${th.bg}`} />
                  <span className="truncate">{th.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
