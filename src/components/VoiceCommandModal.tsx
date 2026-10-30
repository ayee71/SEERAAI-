import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, X, Volume2, Command, ArrowRight } from 'lucide-react';
import { Language } from '../i18n/translations';
import { normalizeHarargeeDictation } from '../utils/harargeePhonetics';

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string, query?: string) => void;
  currentLang: Language;
}

export const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  currentLang,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [selectedLangCode, setSelectedLangCode] = useState<string>('om-ET');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setTranscript('');
      setFeedbackMessage(null);
    } else {
      startListening();
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen, selectedLangCode]);

  const processCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    setFeedbackMessage(`Fakkeenya: "${rawText}" (Lolaasifamaa jira...)`);

    // Normalize Harargee / Afaan Oromoo phonetics
    const cleanText = selectedLangCode.startsWith('om') ? normalizeHarargeeDictation(text) : text;

    // Command matching
    if (text.includes('cassation') || text.includes('murtii ijibbaataa') || text.includes('ibsa murtii') || text.includes('precedent')) {
      const query = text.replace(/seeraai|find|cassation|precedent|murtii|jibbaataa|barbaadi|ilaali/gi, '').trim();
      setFeedbackMessage(currentLang === 'om' ? `Gara Murtii Ijibbaataatti dabarsaa jira...` : `Navigating to Cassation Precedents...`);
      setTimeout(() => {
        onNavigateTab('cassation');
        onClose();
      }, 1000);
      return;
    }

    if (text.includes('translate') || text.includes('hiika') || text.includes('hikti')) {
      setFeedbackMessage(currentLang === 'om' ? 'Gara Baankii Hiikaa Seeraatti dabarsaa jira...' : 'Navigating to Legal Translation...');
      setTimeout(() => {
        onNavigateTab('translate');
        onClose();
      }, 1000);
      return;
    }

    if (text.includes('explain') || text.includes('ibsa seeraa') || text.includes('gorsaa')) {
      setFeedbackMessage(currentLang === 'om' ? 'Gara Ibsaa Seeraatti dabarsaa jira...' : 'Navigating to Explain Law...');
      setTimeout(() => {
        onNavigateTab('explainLaw');
        onClose();
      }, 1000);
      return;
    }

    if (text.includes('home') || text.includes('mana') || text.includes('jalqaba')) {
      setFeedbackMessage(currentLang === 'om' ? 'Gara Fuula Jalqabaatti deebi\'aa jira...' : 'Navigating to Home...');
      setTimeout(() => {
        onNavigateTab('home');
        onClose();
      }, 1000);
      return;
    }

    if (text.includes('setting') || text.includes('qindeessuu')) {
      setFeedbackMessage(currentLang === 'om' ? 'Gara Qindeeffamaatti dabarsaa jira...' : 'Navigating to Settings...');
      setTimeout(() => {
        onNavigateTab('settings');
        onClose();
      }, 1000);
      return;
    }

    if (text.includes('create') || text.includes('waliigaltee') || text.includes('barreessi')) {
      setFeedbackMessage(currentLang === 'om' ? 'Gara Qopheessa Wixineetti dabarsaa jira...' : 'Navigating to Document Drafting...');
      setTimeout(() => {
        onNavigateTab('create');
        onClose();
      }, 1000);
      return;
    }

    // Default fallback: Search in command palette or library
    setFeedbackMessage(currentLang === 'om' ? `Barbaacha: "${cleanText}"` : `Searching for "${cleanText}"...`);
    setTimeout(() => {
      onNavigateTab('cassation');
      onClose();
    }, 1200);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedbackMessage('Browser Speech Recognition not supported in this environment.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLangCode;

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
        if (event.results[0].isFinal) {
          processCommand(current);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Voice command error:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setFeedbackMessage(currentLang === 'om' ? 'Dhaggeeffachaa jira... (Dubbadhu)' : 'Listening for voice command...');
    } catch (err) {
      console.warn('Failed to start recognition:', err);
      setIsListening(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl text-slate-100 relative overflow-hidden">
        
        {/* Glow Ambient Effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              🎙️
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {currentLang === 'om' ? 'Ajaja Sagalee (Voice Command)' : 'SeeraAI Voice Command'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' ? 'Dubbiin gara fuulaatti ykn barbaachaatti darbi' : 'Navigate or search using spoken language'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Selector */}
        <div className="flex items-center justify-center gap-2 my-4">
          {[
            { code: 'om-ET', label: 'Afaan Oromoo' },
            { code: 'am-ET', label: 'አማርኛ' },
            { code: 'en-US', label: 'English' },
          ].map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setSelectedLangCode(l.code);
                if (recognitionRef.current) {
                  try { recognitionRef.current.stop(); } catch {}
                }
                setTimeout(() => startListening(), 200);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                selectedLangCode === l.code
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Listening Orb & Transcript */}
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isListening 
              ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.5)] animate-pulse' 
              : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
          }`}>
            <span className="text-3xl">{isListening ? '🎙️' : '🎧'}</span>
            {isListening && (
              <span className="absolute inset-0 rounded-full border border-rose-400 animate-ping opacity-50" />
            )}
          </div>

          <div className="space-y-1 max-w-sm">
            <p className="text-xs font-mono text-amber-400">
              {feedbackMessage || (currentLang === 'om' ? 'Fakkeenya: "SeeraAI, find cassation precedent for land tenure"' : 'Speak a command...')}
            </p>
            <div className="min-h-[50px] p-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-200 font-medium flex items-center justify-center">
              {transcript || (currentLang === 'om' ? 'Sagalee kee eeggachaa jira...' : 'Listening...') }
            </div>
          </div>
        </div>

        {/* Footer Examples */}
        <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
          <div className="font-bold text-slate-300 flex items-center gap-1">
            <span>💡</span> {currentLang === 'om' ? 'Fkn Ajajootaa (Example Voice Commands):' : 'Example Commands:'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-300">
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">"SeeraAI, find cassation precedent..."</div>
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">"SeeraAI, open legal translation"</div>
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">"SeeraAI, explain labor law"</div>
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">"SeeraAI, go to home"</div>
          </div>
        </div>

      </div>
    </div>
  );
};
