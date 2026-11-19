import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Scale,
  Square,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import {
  StreamLegalSource,
  StreamPhase,
  sanitizeStreamTextPreservingWhitespace,
} from '../services/legalStreamClient';

export type StreamingStatus = 'idle' | 'grounding' | 'streaming' | 'completed' | 'stopped' | 'error';

export interface StreamingLegalResponseProps {
  currentLang: Language;
  query: string;
  status: StreamingStatus;
  phaseLabel?: string;
  phase?: StreamPhase;
  streamedText: string;
  sources: StreamLegalSource[];
  modelUsed?: string;
  elapsedMs: number;
  errorMessage?: string | null;
  fallbackUsed?: boolean;
  onStop?: () => void;
  onRetry?: () => void;
  onOpenFullReader?: () => void;
  onSelectFollowUp?: (followUpPrompt: string) => void;
}

const SECTION_HEADING_REGEX =
  /^(?:\d{1,2}\.\s+|(?:AFAN OROMOO|አማርኛ|ENGLISH)$|(?:Ibsa Gabaabaa|Xiinxala Seeraa|Murtiiwwan Dhaddacha|Furmaata|Akeekkachiisa|አጭር ማብራሪያ|የሕግ ትንታኔ|አስገዳጅ የሰበር|የመፍትሔ|ማሳሰቢያ|Executive Summary|Legal Analysis|Binding Cassation|Actionable Remedies|Mandatory Disclaimer))/i;

function renderTextWithTelegramLinks(line: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = line.split(urlRegex);
  return parts.map((part, idx) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline decoration-sky-500/40 underline-offset-2 font-mono text-[12px] break-all"
        >
          <span>{part}</span>
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const StreamingLegalResponse: React.FC<StreamingLegalResponseProps> = ({
  currentLang,
  query,
  status,
  phaseLabel,
  streamedText,
  sources,
  modelUsed,
  elapsedMs,
  errorMessage,
  fallbackUsed = false,
  onStop,
  onRetry,
  onOpenFullReader,
  onSelectFollowUp,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  const isActive = status === 'grounding' || status === 'streaming';
  const cleanedText = useMemo(
    () => sanitizeStreamTextPreservingWhitespace(streamedText),
    [streamedText]
  );

  const wordCount = useMemo(() => {
    const trimmed = cleanedText.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [cleanedText]);

  // Reset auto-scroll when a new stream starts
  useEffect(() => {
    if (status === 'grounding') {
      setAutoScroll(true);
    }
  }, [status, query]);

  // Keep viewport pinned to latest streamed line unless user manually scrolled up
  useEffect(() => {
    if (!autoScroll || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    el.scrollTop = el.scrollHeight;
  }, [cleanedText, autoScroll, status]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 48) {
      if (autoScroll) setAutoScroll(false);
    } else if (!autoScroll) {
      setAutoScroll(true);
    }
  };

  const handleJumpToLatest = () => {
    setAutoScroll(true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleCopy = async () => {
    if (!cleanedText.trim()) return;
    try {
      await navigator.clipboard.writeText(cleanedText.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const statusText = useMemo(() => {
    if (status === 'grounding') {
      return (
        phaseLabel ||
        (currentLang === 'am'
          ? 'ሕጎችን እና የሰበር ውሳኔዎችን በማጣራት ላይ'
          : currentLang === 'en'
            ? 'Grounding statutes & Cassation precedents'
            : 'Heera & Dhaddacha Ijibbaataa sakatta\'aa jira')
      );
    }
    if (status === 'streaming') {
      return (
        phaseLabel ||
        (currentLang === 'am'
          ? 'የሕግ ትንታኔ በቀጥታ እየተጻፈ ነው'
          : currentLang === 'en'
            ? 'Streaming judicial analysis'
            : 'Xiinxala seeraa kallattiidhaan barreeffamaa jira')
      );
    }
    if (status === 'stopped') {
      return currentLang === 'am'
        ? 'በተጠቃሚ ተቋርጧል'
        : currentLang === 'en'
          ? 'Stopped by user'
          : 'Fayyadamaan dhaabame';
    }
    if (status === 'error') {
      return currentLang === 'am'
        ? 'ስህተት ተፈጥሯል'
        : currentLang === 'en'
          ? 'Stream interrupted'
          : 'Tamsaasni addaan cite';
    }
    return currentLang === 'am'
      ? 'የተረጋገጠ የሕግ ትንታኔ ተጠናቋል'
      : currentLang === 'en'
        ? 'Verified judicial analysis ready'
        : 'Xiinxalli seeraa xumurameera';
  }, [status, phaseLabel, currentLang]);

  const followUpPrompts = useMemo(() => {
    if (currentLang === 'am') {
      return [
        'ከዚህ ጉዳይ ጋር የተያያዘ የይርጋ ጊዜ እና የፍርድ ቤት ስልጣንን አብራራ።',
        'በችሎት ፊት የሚቀርብ የመከላከያ መልስ ረቂቅ ነጥቦችን አዘጋጅ።',
      ];
    }
    if (currentLang === 'en') {
      return [
        'Explain statutory limitation periods and court jurisdiction for this issue.',
        'Draft key courtroom pleading points and evidentiary burdens.',
      ];
    }
    return [
      'Darbiinsa yeroo fi aangoo mana murtii dhimma kanaa ibsi.',
      'Qabxiiwwan ijoo iyyannoo fi ragaalee mana murtiitti dhiyaatan tarreessi.',
    ];
  }, [currentLang]);

  const lines = useMemo(() => cleanedText.split('\n'), [cleanedText]);

  return (
    <section
      aria-label="Streaming Legal Analysis Response"
      aria-busy={isActive}
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col animate-stream-panel-fade"
    >
      {/* Top Status & Telemetry Strip (Zero-pill unboxed typography with tabular-nums) */}
      <header className="px-4 sm:px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isActive ? (
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full bg-amber-400 motion-safe:animate-pulse shrink-0"
            />
          ) : status === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Scale className="w-4 h-4 text-amber-400 shrink-0" />
          )}

          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-100 truncate">
              {statusText}
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>{(elapsedMs / 1000).toFixed(1)}s</span>
              <span aria-hidden="true">·</span>
              <span>
                {wordCount} {currentLang === 'om' ? 'jechoota' : currentLang === 'am' ? 'ቃላት' : 'words'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {sources.length} {currentLang === 'om' ? 'wabiilee' : currentLang === 'am' ? 'ምንጮች' : 'sources'}
              </span>
              {modelUsed && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400/90">
                    {fallbackUsed ? 'SEERAAI Grounded Archive' : modelUsed}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isActive && onStop && (
            <button
              type="button"
              onClick={onStop}
              className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>
                {currentLang === 'am' ? 'አቁም' : currentLang === 'en' ? 'Stop' : 'Dhaabi'}
              </span>
            </button>
          )}

          {!isActive && cleanedText.trim().length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">
                      {currentLang === 'om' ? 'Waraabame' : currentLang === 'am' ? 'ተቀድቷል' : 'Copied'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentLang === 'om' ? 'Waraabi' : currentLang === 'am' ? 'ቅዳ' : 'Copy'}</span>
                  </>
                )}
              </button>

              {onOpenFullReader && (
                <button
                  type="button"
                  onClick={onOpenFullReader}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {currentLang === 'om'
                      ? 'PDF / Reader Bani'
                      : currentLang === 'am'
                        ? 'ሙሉ ሰነድ / PDF'
                        : 'Open Full Reader'}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Progressive Grounded Citations Reference List (Appears before first token finishes!) */}
      {sources.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800/80 bg-slate-950/30 animate-stream-line-fade">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {currentLang === 'am'
                ? 'የተረጋገጡ የሕግ እና የሰበር ምንጮች'
                : currentLang === 'en'
                  ? 'Grounded Statutory & Cassation Authorities'
                  : 'Maddoota Seeraa & Dhaddacha Ijibbaataa Mirkanaa\'an'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {sources.slice(0, 4).map((src, idx) => (
              <div
                key={src.id}
                style={{ animationDelay: `${idx * 45}ms` }}
                className="flex items-baseline justify-between gap-2 py-1 border-b border-slate-800/50 last:border-b-0 sm:last:border-b animate-stream-line-fade"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[11px] text-amber-400 font-semibold">
                    {src.fileNumber
                      ? `Galmee ${src.fileNumber}`
                      : src.proclamationNumber || 'Statute'}
                  </span>
                  <span className="text-slate-500 mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-300 truncate">{src.title}</span>
                </div>
                {src.telegramPostUrl && (
                  <a
                    href={src.telegramPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-sky-400 hover:text-sky-300 shrink-0 font-mono inline-flex items-center gap-1"
                    title={`Open ${src.channelHandle || '@seeraai_ethio'} post`}
                  >
                    <span>Telegram</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streaming Prose Viewport */}
      <div className="relative flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          aria-live="polite"
          className="px-4 sm:px-6 py-5 max-h-[540px] overflow-y-auto scroll-smooth text-[14px] leading-relaxed text-slate-200 select-text"
        >
          {status === 'grounding' && cleanedText.length === 0 ? (
            <div className="py-10 space-y-3 animate-stream-line-fade" role="status">
              <div className="h-3.5 bg-slate-800 rounded w-3/4 motion-safe:animate-pulse" />
              <div className="h-3.5 bg-slate-800/80 rounded w-full motion-safe:animate-pulse" />
              <div className="h-3.5 bg-slate-800/60 rounded w-5/6 motion-safe:animate-pulse" />
              <p className="text-xs text-slate-400 pt-2">
                {currentLang === 'am'
                  ? 'የሕግ ድንጋጌዎችን እና የቴሌግራም ማህደር መዝገቦችን በማገናኘት ላይ...'
                  : currentLang === 'en'
                    ? 'Matching Civil/Labor statutes and Cassation File Numbers (@seeraai_ethio/125+)...'
                    : "Labsiilee fi galmeewwan Dhaddacha Ijibbaataa (@seeraai_ethio/125+) walitti fidaa jira..."}
              </p>
            </div>
          ) : status === 'error' && cleanedText.length === 0 ? (
            <div className="py-8 text-center space-y-3 animate-stream-line-fade">
              <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-200 max-w-md mx-auto">
                {errorMessage || 'Streaming analysis encountered an error.'}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {currentLang === 'om' ? 'Irra Deebi\'i Yaali' : currentLang === 'am' ? 'እንደገና ሞክር' : 'Retry'}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {lines.map((line, index) => {
                const isLastLine = index === lines.length - 1;
                const trimmedLine = line.trim();

                if (!trimmedLine) {
                  return <div key={index} className="h-1.5" />;
                }

                if (/^━+$/.test(trimmedLine)) {
                  return <hr key={index} className="border-slate-800 my-3 animate-stream-line-fade" />;
                }

                const isHeading =
                  SECTION_HEADING_REGEX.test(trimmedLine) && trimmedLine.length < 130;

                if (isHeading) {
                  return (
                    <h4
                      key={index}
                      className="font-serif-legal text-[15px] font-bold text-amber-300 border-b border-slate-800/80 pb-1.5 pt-2 first:pt-0 animate-stream-line-fade"
                    >
                      {trimmedLine}
                      {isLastLine && status === 'streaming' && (
                        <span
                          aria-hidden="true"
                          className="inline-block w-1.5 h-4 bg-amber-400 align-middle ml-1 motion-safe:animate-pulse"
                        />
                      )}
                    </h4>
                  );
                }

                const isBullet = /^[•\-]\s+/.test(trimmedLine);

                return (
                  <p
                    key={index}
                    className={
                      isBullet
                        ? 'pl-4 text-slate-200 leading-relaxed animate-stream-line-fade'
                        : 'text-slate-200 leading-relaxed animate-stream-line-fade'
                    }
                  >
                    {renderTextWithTelegramLinks(line)}
                    {isLastLine && status === 'streaming' && (
                      <span
                        aria-hidden="true"
                        className="inline-block w-1.5 h-4 bg-amber-400 align-middle ml-1 motion-safe:animate-pulse"
                      />
                    )}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating "Jump to latest" control when user scrolls up mid-stream */}
        {!autoScroll && isActive && (
          <button
            type="button"
            onClick={handleJumpToLatest}
            className="absolute bottom-3 right-4 px-3 py-1.5 rounded-lg bg-slate-950/95 hover:bg-slate-800 text-amber-300 border border-amber-500/40 shadow-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer animate-stream-line-fade"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>
              {currentLang === 'om' ? 'Gara Gadiitti Bu\'i' : currentLang === 'am' ? 'ወደ መጨረሻ ውረድ' : 'Jump to latest'}
            </span>
          </button>
        )}
      </div>

      {/* Follow-up Question Prompts after completion */}
      {!isActive && cleanedText.trim().length > 0 && onSelectFollowUp && (
        <footer className="px-4 sm:px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2 animate-stream-line-fade">
          <span className="text-[11px] font-medium text-slate-400">
            {currentLang === 'am'
              ? 'ተከታይ ጥያቄ ይጠይቁ፡'
              : currentLang === 'en'
                ? 'Continue analysis:'
                : 'Gaaffii itti aanu gaafadhu:'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {followUpPrompts.map((fp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectFollowUp(fp)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-[11px] text-slate-300 hover:text-amber-200 transition-colors text-left cursor-pointer"
              >
                {fp}
              </button>
            ))}
          </div>
        </footer>
      )}
    </section>
  );
};
export default StreamingLegalResponse;
