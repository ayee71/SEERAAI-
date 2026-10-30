import React, { useState, useEffect, useRef } from 'react';
import { Eye, Image as ImageIcon, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProgressiveLegalImageLoaderProps {
  fullSrc: string;
  lowResSrc?: string;
  alt: string;
  className?: string;
  externalDocUrl?: string;
}

export const ProgressiveLegalImageLoader: React.FC<ProgressiveLegalImageLoaderProps> = ({
  fullSrc,
  lowResSrc,
  alt,
  className = '',
  externalDocUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState<boolean>(false);
  const [isFullLoaded, setIsFullLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  // Lazy loading via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              observer.disconnect();
            }
          });
        },
        { rootMargin: '150px' }
      );
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      // Fallback if IntersectionObserver not available
      setIsInView(true);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl bg-slate-950 flex flex-col items-center justify-center min-h-[220px] ${className}`}
    >
      {/* Top Status Bar */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between text-[10px] font-mono pointer-events-none">
        <span
          className={`px-2 py-0.5 rounded-full font-bold border backdrop-blur-md flex items-center gap-1 shadow ${
            isFullLoaded
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
              : isInView
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              : 'bg-slate-900/80 text-slate-400 border-slate-700'
          }`}
        >
          {isFullLoaded ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>HD Legal Scan (Full Size)</span>
            </>
          ) : isInView ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
              <span>Fetching Legal Scan...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-3 h-3 text-slate-400" />
              <span>Low-Res Preview</span>
            </>
          )}
        </span>

        {externalDocUrl && (
          <span className="px-2 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800 text-[9px]">
            saorethio1.com
          </span>
        )}
      </div>

      {/* Low-Resolution Thumbnail placeholder */}
      {!isFullLoaded && lowResSrc && (
        <img
          src={lowResSrc}
          alt={`Thumbnail: ${alt}`}
          className="absolute inset-0 w-full h-full object-contain filter blur-xs scale-102 opacity-70 transition-opacity duration-300"
        />
      )}

      {/* Lazy Full Size Image loaded once scrolled into view */}
      {isInView && (
        <img
          src={fullSrc}
          alt={alt}
          onLoad={() => setIsFullLoaded(true)}
          onError={() => setLoadError(true)}
          className={`max-w-full max-h-[460px] object-contain rounded-xl shadow-lg transition-all duration-500 ${
            isFullLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-98'
          }`}
        />
      )}

      {/* Loading Spinner Shimmer before full scan completes */}
      {isInView && !isFullLoaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-xs space-y-2 z-5">
          <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-[10px] text-amber-300 font-mono">Progressive Scan Loading...</span>
        </div>
      )}

      {/* Error Fallback */}
      {loadError && (
        <div className="p-4 text-center text-xs text-rose-300 bg-rose-950/40 border border-rose-500/40 rounded-xl m-4 space-y-1">
          <AlertCircle className="w-5 h-5 mx-auto text-rose-400" />
          <p className="font-bold">Legal Scan currently unavailable</p>
          <p className="text-[10px] text-slate-400">Falling back to low-resolution thumbnail.</p>
        </div>
      )}
    </div>
  );
};
