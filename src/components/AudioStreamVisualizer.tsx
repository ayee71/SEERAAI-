import React, { useState, useEffect, useRef } from 'react';
import { Mic, Waves, Activity } from 'lucide-react';

interface AudioStreamVisualizerProps {
  isStreaming: boolean;
  transcript: string;
}

export const AudioStreamVisualizer: React.FC<AudioStreamVisualizerProps> = ({ isStreaming, transcript }) => {
  const [amplitude, setAmplitude] = useState<number[]>(Array(20).fill(5));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStreaming) {
      interval = setInterval(() => {
        setAmplitude(prev => prev.map(() => Math.random() * 40 + 5));
      }, 100);
    } else {
      setAmplitude(Array(20).fill(5));
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-inner space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <Mic className={`w-4 h-4 ${isStreaming ? 'animate-pulse' : ''}`} />
          {isStreaming ? 'LIVE TRANSCRIPTION STREAM' : 'STREAM IDLE'}
        </div>
        <div className="flex gap-0.5 items-end h-8">
          {amplitude.map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-sm transition-all duration-100 ${isStreaming ? 'bg-emerald-500' : 'bg-slate-700'}`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>
      
      <div className="min-h-[100px] max-h-[200px] overflow-y-auto bg-slate-900 rounded-xl p-3 text-sm text-slate-200 font-mono border border-slate-800/50">
        {transcript ? (
          <p className="animate-in fade-in duration-300">{transcript}</p>
        ) : (
          <p className="text-slate-600 italic">Waiting for audio stream...</p>
        )}
      </div>
    </div>
  );
};
