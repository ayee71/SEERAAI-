import React, { useState, useEffect } from 'react';
import { Volume2, Square, Loader2 } from 'lucide-react';
import { playOromoSpeech, stopOromoSpeech } from '../utils/oromoSpeechNormalizer';

interface AudioSpeakButtonProps {
  text: string;
  label?: string;
  className?: string;
  variant?: 'compact' | 'standard' | 'pill';
}

export const AudioSpeakButton: React.FC<AudioSpeakButtonProps> = ({
  text,
  label,
  className = '',
  variant = 'compact',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        stopOromoSpeech();
      }
    };
  }, [isPlaying]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      stopOromoSpeech();
      setIsPlaying(false);
    } else {
      if (!text || !text.trim()) return;
      playOromoSpeech(text, {
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    }
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm ${
          isPlaying
            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
            : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40'
        } ${className}`}
        title={isPlaying ? 'Dhaabi (Stop Audio)' : 'Afaan Oromootiin Dhaggeeffadhu (Listen in Oromo)'}
      >
        {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
        <span>{isPlaying ? 'Dhaabi' : (label || 'Sagaleen Dubbisi')}</span>
      </button>
    );
  }

  if (variant === 'standard') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
          isPlaying
            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
            : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400'
        } ${className}`}
        title={isPlaying ? 'Dhaabi (Stop Audio)' : 'Afaan Oromootiin Dhaggeeffadhu (Listen in Oromo)'}
      >
        {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
        <span>{isPlaying ? 'Dhaabi' : (label || 'Sagaleen Dhaggeeffadhu')}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
        isPlaying
          ? 'bg-rose-600 text-white border-rose-500 animate-pulse ring-2 ring-rose-400'
          : 'bg-slate-950 hover:bg-slate-800 text-emerald-400 border-slate-700 hover:text-emerald-300'
      } ${className}`}
      title={isPlaying ? 'Dhaabi (Stop Audio)' : 'Sagaleen Dubbisi (Listen in Oromo)'}
    >
      {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  );
};
