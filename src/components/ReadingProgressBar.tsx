import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { ArrowUp, ArrowDown, BookOpen, Clock } from 'lucide-react';

interface ReadingProgressBarProps {
  currentLang?: Language;
  showPercent?: boolean;
  className?: string;
  targetRef?: React.RefObject<HTMLElement | null>;
  documentTitle?: string;
}

export const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({
  currentLang = 'om',
  showPercent = true,
  className = '',
  targetRef,
  documentTitle,
}) => {
  const [readingProgress, setReadingProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [estimatedMinutesLeft, setEstimatedMinutesLeft] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const calculateProgress = () => {
      let scrollTop = 0;
      let scrollHeight = 0;
      let clientHeight = 0;

      if (targetRef && targetRef.current) {
        const el = targetRef.current;
        scrollTop = el.scrollTop;
        scrollHeight = el.scrollHeight;
        clientHeight = el.clientHeight;
      } else {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = document.documentElement.clientHeight;
      }

      const totalScrollableableDistance = scrollHeight - clientHeight;

      if (totalScrollableableDistance > 120) {
        const progress = Math.min(100, Math.max(0, (scrollTop / totalScrollableableDistance) * 100));
        setReadingProgress(progress);
        setIsVisible(scrollTop > 20);

        // Estimate remaining reading time (approx 200 words per minute / scroll height ratio)
        const remainingPixels = totalScrollableableDistance - scrollTop;
        const estMinutes = Math.max(1, Math.ceil((remainingPixels / scrollHeight) * 5));
        setEstimatedMinutesLeft(estMinutes);
      } else {
        setReadingProgress(0);
        setIsVisible(false);
        setEstimatedMinutesLeft(null);
      }
    };

    if (targetRef && targetRef.current) {
      const el = targetRef.current;
      el.addEventListener('scroll', calculateProgress, { passive: true });
      calculateProgress();
      return () => el.removeEventListener('scroll', calculateProgress);
    } else {
      window.addEventListener('scroll', calculateProgress, { passive: true });
      window.addEventListener('resize', calculateProgress, { passive: true });
      calculateProgress();
      return () => {
        window.removeEventListener('scroll', calculateProgress);
        window.removeEventListener('resize', calculateProgress);
      };
    }
  }, [targetRef]);

  const scrollToTop = () => {
    if (targetRef && targetRef.current) {
      targetRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (targetRef && targetRef.current) {
      targetRef.current.scrollTo({ top: targetRef.current.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  if (!isVisible && readingProgress === 0) {
    return null;
  }

  const getLabel = () => {
    if (currentLang === 'om') return 'Dubbisa';
    if (currentLang === 'am') return 'ንባብ';
    return 'Reading';
  };

  return (
    <div
      className={`sticky top-16 z-40 w-full transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Track with Glass Blur */}
      <div className="w-full h-1.5 bg-slate-900/80 backdrop-blur-md relative overflow-hidden shadow-inner border-y border-slate-800/40">
        {/* Multi-tone Glowing Legal Gradient Progress Line */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(readingProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${getLabel()} ${Math.round(readingProgress)}%`}
          className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-400 shadow-[0_0_12px_rgba(245,158,11,0.6)] transition-[width] duration-150 ease-out rounded-r-full relative"
          style={{ width: `${readingProgress}%` }}
        >
          {/* Animated trailing pulse dot */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-pulse" />
        </div>
      </div>

      {/* Floating Reading Badge & Quick Controls */}
      {showPercent && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative pointer-events-auto">
          <div className="absolute right-6 top-2.5 flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 text-xs font-mono text-amber-300 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200">
              <BookOpen className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="font-bold tracking-wide">
                {getLabel()}: {Math.round(readingProgress)}%
              </span>

              {documentTitle && (
                <span className="hidden sm:inline-block max-w-[140px] truncate text-[11px] text-slate-400 border-l border-slate-700 pl-2">
                  {documentTitle}
                </span>
              )}

              {estimatedMinutesLeft && (
                <span className="hidden md:flex items-center gap-1 text-[11px] text-emerald-400 border-l border-slate-700 pl-2 font-sans">
                  <Clock className="w-3 h-3" />
                  <span>~{estimatedMinutesLeft}m</span>
                </span>
              )}

              {/* Quick Jump Action Buttons */}
              <div className="flex items-center gap-1 border-l border-slate-700 pl-2 ml-1">
                <button
                  type="button"
                  onClick={scrollToTop}
                  title={currentLang === 'om' ? 'Gara Gubbaatti' : 'Scroll to top'}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={scrollToBottom}
                  title={currentLang === 'om' ? 'Gara Jalaatti' : 'Scroll to bottom'}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingProgressBar;
