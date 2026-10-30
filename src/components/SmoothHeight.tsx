import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';

interface SmoothHeightProps {
  children: React.ReactNode;
  duration?: number;
  className?: string;
  triggerKey?: any; // Optional key (e.g. selectedCategory) to trigger smooth cross-fade + height transition
}

/**
 * SmoothHeight provides a silky smooth height transition animation when content changes,
 * such as when filtering categories or toggling judicial bench interpretations.
 * Prevents layout jumps and enhances responsiveness.
 */
export const SmoothHeight: React.FC<SmoothHeightProps> = ({
  children,
  duration = 320,
  className = '',
  triggerKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [opacityClass, setOpacityClass] = useState<string>('opacity-100');

  // Handle subtle cross-fade on category toggle
  useEffect(() => {
    if (triggerKey !== undefined) {
      setOpacityClass('opacity-80 scale-[0.998]');
      const frame = requestAnimationFrame(() => {
        setOpacityClass('opacity-100 scale-100');
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [triggerKey]);

  useLayoutEffect(() => {
    if (!contentRef.current) return;

    // Set initial height
    const initialHeight = contentRef.current.offsetHeight;
    setHeight(initialHeight);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.target.getBoundingClientRect().height;
        setHeight((prev) => {
          if (typeof prev === 'number' && Math.abs(prev - newHeight) > 1) {
            setIsTransitioning(true);
            return newHeight;
          }
          return prev === 'auto' ? newHeight : prev;
        });
      }
    });

    resizeObserver.observe(contentRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, duration + 50);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, duration]);

  return (
    <div
      ref={containerRef}
      style={{
        height: height === 'auto' ? 'auto' : `${height}px`,
        transition: `height ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
        overflow: isTransitioning ? 'hidden' : 'visible',
      }}
      className={`transition-[height] will-change-[height] ${className}`}
    >
      <div
        ref={contentRef}
        className={`w-full transition-all duration-200 ease-out ${opacityClass}`}
      >
        {children}
      </div>
    </div>
  );
};
