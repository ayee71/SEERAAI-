import React from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
  enabled?: boolean;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, query, className, enabled = true }) => {
  if (!text) return null;
  if (!enabled || !query || !query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="bg-amber-400 text-slate-950 font-bold px-1 py-0.5 rounded shadow-sm mx-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};
