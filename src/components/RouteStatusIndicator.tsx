import React, { useState } from 'react';
import { Copy, Check, Power } from 'lucide-react';

export const RouteStatusIndicator: React.FC = () => {
  const [isCopied, setIsCopied] = useState(false);
  const [activeRoutes, setActiveRoutes] = useState<Record<string, boolean>>({
    'mmurtii.oro': false,
    'mmurtii.serai': false,
  });

  const toggleRoute = (route: string) => {
    setActiveRoutes(prev => ({
      ...prev,
      [route]: !prev[route]
    }));
  };

  const handleCopy = (route: string) => {
    const url = `${window.location.origin}/?route=${route}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {Object.entries(activeRoutes).map(([name, connected]) => (
        <div key={name} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all ${connected ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900 border-slate-700'}`}>
          <button
            onClick={() => toggleRoute(name)}
            className={`p-1 rounded-full transition-all cursor-pointer ${connected ? 'text-emerald-400' : 'text-slate-500 hover:text-amber-400'}`}
            title={connected ? "Deactivate Route" : "Activate Route"}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          
          <span className={`relative flex h-2 w-2`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'}`}></span>
          </span>
          <span className={`text-[10px] font-mono font-bold ${connected ? 'text-emerald-300' : 'text-slate-400'}`}>{name}</span>
          <button 
            onClick={() => handleCopy(name)}
            className="ml-1 p-1 hover:bg-slate-700 rounded transition-all cursor-pointer"
            title="Copy Secure Link"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
          </button>
        </div>
      ))}
    </div>
  );
};
