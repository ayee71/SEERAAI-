import React, { useState, useEffect } from 'react';

interface ReadingProgressBarProps {
  className?: string;
  showPercent?: boolean;
}

export const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({
  className = '',
  showPercent = false,
}) => {
  const [readingProgress, setReadingProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

      if (scrollHeight > 100) {
        const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
        setReadingProgress(progress);
        setIsVisible(scrollTop > 20);
      } else {
        setReadingProgress(0);
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible && readingProgress === 0) {
    return null;
  }

  return (
    <div
      className={`sticky top-16 z-40 w-full pointer-events-none transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      aria-hidden="true"
    >
      {/* Background Track */}
      <div className="w-full h-1 bg-slate-900/60 backdrop-blur-xs relative overflow-hidden">
        {/* Dynamic Progress Bar with Subtle Amber Glow */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(readingProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reading progress"
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-[width] duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Subtle percentage badge if enabled */}
      {showPercent && readingProgress > 5 && (
        <div className="absolute right-3 top-2 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700/60 text-[10px] font-mono text-amber-300 shadow-sm transition-opacity duration-200">
          {Math.round(readingProgress)}%
        </div>
      )}
    </div>
  );
};
