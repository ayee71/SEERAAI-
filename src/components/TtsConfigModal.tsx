import React, { useState } from 'react';
import { Volume2, X, Check, Sliders, Mic, ShieldCheck, RefreshCw } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { getUserSettings, saveUserSettings } from '../services/storage';
import { playOromoSpeech, stopOromoSpeech } from '../utils/oromoSpeechNormalizer';

interface TtsConfigModalProps {
  currentLang: Language;
  onClose: () => void;
}

export const TtsConfigModal: React.FC<TtsConfigModalProps> = ({ currentLang, onClose }) => {
  const t = translations[currentLang];
  const settings = getUserSettings();

  const [gender, setGender] = useState<'male' | 'female'>(settings.ttsVoiceGender || 'male');
  const [age, setAge] = useState<'35' | 'older' | 'young'>(settings.ttsVoiceAge || '35');
  const [tone, setTone] = useState<'authoritative' | 'calm' | 'formal' | 'warm'>(settings.ttsTone || 'authoritative');
  const [rate, setRate] = useState<number>(settings.ttsRate || 0.90);
  const [harargeeOpt, setHarargeeOpt] = useState<boolean>(settings.harargeeDialectTts ?? true);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const handleSave = () => {
    saveUserSettings({
      ttsVoiceGender: gender,
      ttsVoiceAge: age,
      ttsTone: tone,
      ttsRate: rate,
      harargeeDialectTts: harargeeOpt,
    });
    setSavedMsg(
      currentLang === 'om'
        ? 'Qindaa’inni Sagalee (TTS Voice Profile) milkaa’inaan kuufameera!'
        : 'TTS Voice Profile settings saved successfully!'
    );
    setTimeout(() => {
      setSavedMsg(null);
      onClose();
    }, 1500);
  };

  const handlePreviewSpeech = () => {
    // Save temporarily for preview
    saveUserSettings({
      ttsVoiceGender: gender,
      ttsVoiceAge: age,
      ttsTone: tone,
      ttsRate: rate,
      harargeeDialectTts: harargeeOpt,
    });

    const sampleText = currentLang === 'om'
      ? 'Labsii Bulchiinsa Lafa Baadiyyaa Naannoo Oromiyaa Lakk. 248/2015. Kennaan lafa baadiyyaa maatiif qofa karaa seera qabeessaan raawwatama.'
      : currentLang === 'am'
      ? 'የኦሮሚያ ክልል የገጠር መሬት አስተዳደር አዋጅ ቁጥር 248/2015። የገጠር መሬት ስጦታ ለቤተሰብ ብቻ በሕጋዊ መንገድ ይፈጸማል።'
      : 'Oromia Rural Land Administration Proclamation No. 248/2015. Rural land gifts are executed legally strictly among family members.';

    if (isPlayingPreview) {
      stopOromoSpeech();
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    playOromoSpeech(sampleText, {
      onStart: () => setIsPlayingPreview(true),
      onEnd: () => setIsPlayingPreview(false),
      onError: () => setIsPlayingPreview(false),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {currentLang === 'om' ? 'Qindaa’ina Sagalee Dubbisaa (TTS Voice Profiles)' : 'የድምፅ ማንበቢያ መገለጫዎች (TTS Profiles)'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Gosa sagalee, umrii, fi suphaa afaan oromoo filadhu.'
                  : 'Select voice profile, gender, age, and dialect phonology for legal reading.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopOromoSpeech();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in zoom-in-95 duration-200">
            <Check className="w-4 h-4 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="space-y-5 text-xs">
          {/* Voice Gender Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-200">
              {currentLang === 'om' ? 'Gosa Sagalee (Voice Gender):' : 'የድምፅ ጾታ (Voice Gender):'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                  gender === 'male'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>👨</span>
                <span>{currentLang === 'om' ? 'Sagalee Dhiiraa (Male Baritone)' : 'የወንድ ድምፅ (Male)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('female')}
                className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                  gender === 'female'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>👩</span>
                <span>{currentLang === 'om' ? 'Sagalee Dubartii (Female)' : 'የሴት ድምፅ (Female)'}</span>
              </button>
            </div>
          </div>

          {/* Voice Age Profile */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-200">
              {currentLang === 'om' ? 'Umrii Sagalee (Voice Age Profile):' : 'የድምፅ ዕድሜ መገለጫ (Age Profile):'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'young', label: currentLang === 'om' ? 'Dargaggeessa (20-30)' : ' ወጣት (Young)' },
                { id: '35', label: currentLang === 'om' ? 'Giddu-galeessa (Waggaa 35)' : 'ዕድሜ 35 (Mature 35)' },
                { id: 'older', label: currentLang === 'om' ? 'Hayyuu / Beekaa (Older)' : 'የሰለጠነ (Senior Expert)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAge(item.id as any)}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    age === item.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Tone & Cadence */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-200">
              {currentLang === 'om' ? 'Haala Dubbisaa (Voice Tone / Style):' : 'የንባብ ቃና (Voice Tone):'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'authoritative', label: currentLang === 'om' ? '⚖️ Abbaa Seeraa (Authoritative)' : 'ህጋዊ / ስልጣናዊ' },
                { id: 'calm', label: currentLang === 'om' ? '🧘 Tasgabbiidhaan (Calm & Clear)' : 'ረጋ ያለ' },
                { id: 'formal', label: currentLang === 'om' ? '📜 Ogeessa Seeraa (Formal Legal)' : 'ფორማማ' },
                { id: 'warm', label: currentLang === 'om' ? '🤝 Michuu / Gaarii (Warm)' : 'ወዳጅነት ያለው' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTone(item.id as any)}
                  className={`p-2.5 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                    tone === item.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Speed Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-200">
              <span>{currentLang === 'om' ? 'Saffisa Dubbisaa (Speech Rate):' : 'የንባብ ፍጥነት (Speech Rate):'}</span>
              <span className="font-mono text-amber-400">{rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-950 cursor-pointer"
            />
          </div>

          {/* Harargee Dialect & Custom Lexicon Optimization Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="font-bold text-slate-200">
                {currentLang === 'om' ? 'Sirna-luga Harargee & Lexicon Seeraa' : 'የሐረርጌ አፋን ኦሮሞ እና የህግ መዝገበ ቃላት'}
              </div>
              <div className="text-[11px] text-slate-400">
                {currentLang === 'om'
                  ? 'Jechoota seeraa (Oromiyaa, Caffee, Idjibbaata, Gadaa) sirriitti akka sagaleessan godha.'
                  : 'Enables custom phonetic lexicon for legal terminology and Harargee phonology.'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={harargeeOpt}
              onChange={(e) => setHarargeeOpt(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handlePreviewSpeech}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Volume2 className={`w-4 h-4 ${isPlayingPreview ? 'animate-pulse text-amber-400' : ''}`} />
            <span>{isPlayingPreview ? (currentLang === 'om' ? 'Dhaabi (Stop)' : 'አቁም') : (currentLang === 'om' ? 'Sagalee Yaali (Preview)' : 'ድምፅ ሞክር')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopOromoSpeech();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              {currentLang === 'om' ? 'Haqi' : 'ሰርዝ'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{currentLang === 'om' ? 'Kuusi (Save)' : 'አስቀምጥ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
