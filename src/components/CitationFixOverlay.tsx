import React from 'react';

interface CitationFixOverlayProps {
  text: string;
  onFix: (range: { start: number, end: number, original: string }) => void;
}

export const CitationFixOverlay: React.FC<CitationFixOverlayProps> = ({ text, onFix }) => {
  if (!text) return null;

  // Regexes to detect broken/incomplete citations
  const missingNumRegex = /\b(Art|Article|Keeyyata|Kwt|አንቀጽ)\b(?!\.*?\s*\d+)/gi;
  const missingYearRegex = /\b(Labsii|Proclamation|Proc|አዋጅ)\s+(\d+)\b(?!\s*[\/\-]\s*\d{4})/gi;
  const incompleteProcRegex = /\b(Labsii|Proclamation|Proc|አዋጅ)\b(?!\s*\d+)/gi;

  const issues: { start: number, end: number, original: string, message: string }[] = [];
  let match;

  [missingNumRegex, missingYearRegex, incompleteProcRegex].forEach(regex => {
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const original = match[0];
      let message = 'Incomplete Citation';
      if (original.match(/Art|Article|Keeyyata|Kwt|አንቀጽ/i)) message = 'Missing Article Number';
      if (original.match(/Labsii|Proclamation|Proc|አዋጅ/i)) message = 'Missing Proclamation Year/Number';
      
      issues.push({ 
        start: match.index, 
        end: match.index + original.length, 
        original,
        message 
      });
    }
  });

  if (issues.length === 0) return null;

  // Sort by start position
  issues.sort((a, b) => a.start - b.start);

  return (
    <div className="absolute inset-0 p-3.5 text-sm leading-relaxed pointer-events-none whitespace-pre-wrap break-words overflow-hidden font-sans text-transparent select-none z-0">
      {(() => {
        const elements = [];
        let lastIndex = 0;

        for (const issue of issues) {
          if (issue.start < lastIndex) continue; // Skip overlaps

          // Add text before the issue
          elements.push(text.substring(lastIndex, issue.start));

          // Add the highlighted issue with a "Fix" button
          elements.push(
            <span 
              key={issue.start}
              className="relative inline-block"
            >
              <span className="bg-rose-500/20 border-b-2 border-rose-500/50 text-transparent">
                {issue.original}
              </span>
              <button
                onClick={() => onFix({ start: issue.start, end: issue.end, original: issue.original })}
                className="absolute -top-6 left-0 pointer-events-auto bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg hover:bg-rose-500 transition-all flex items-center gap-1 whitespace-nowrap"
                title={issue.message}
              >
                <span>🛠️ Fix</span>
              </button>
            </span>
          );

          lastIndex = issue.end;
        }

        elements.push(text.substring(lastIndex));
        return elements;
      })()}
    </div>
  );
};
