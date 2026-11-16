import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Language } from '../i18n/translations';
import {
  Archive,
  Building2,
  Check,
  Copy,
  ExternalLink,
  HelpCircle,
  Layout,
  RefreshCw,
} from 'lucide-react';
import { fetchTelegramChannelFeed } from '../services/telegramLegalHarvesterService';

interface HomeViewProps {
  currentLang: Language;
  onNavigate: (tab: string) => void;
}

interface TelegramFeedItemView {
  id: string;
  title: string;
  text: string;
  date: string;
  url: string;
}

interface TelegramFeedResponse {
  items?: unknown[];
}

interface HomeLabels {
  feedTitle: string;
  feedSubtitle: string;
  loading: string;
  noPosts: string;
  fetchError: string;
  invalidResponse: string;
  copy: string;
  copied: string;
  copyFailed: string;
  openPost: string;
  noTitle: string;
  channel: string;
}

const TELEGRAM_CHANNEL_URL = 'https://t.me/seeraai_ethio';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function firstText(value: unknown, keys: string[]): string {
  const record = asRecord(value);
  if (!record) return '';

  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return '';
}

function safeExternalUrl(value: string): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeTelegramItem(
  rawItem: unknown,
  index: number,
  noTitle: string,
): TelegramFeedItemView {
  const plainText = typeof rawItem === 'string' ? rawItem.trim() : '';
  const text =
    firstText(rawItem, ['text', 'message', 'content', 'body', 'caption', 'description']) ||
    plainText;
  const title =
    firstText(rawItem, ['title', 'headline']) ||
    text.split(/\r?\n/).find((line) => line.trim())?.trim().slice(0, 100) ||
    noTitle;
  const id =
    firstText(rawItem, ['id', 'message_id', 'messageId', 'postId']) ||
    `telegram-post-${index}-${title.slice(0, 24)}`;
  const date = firstText(rawItem, [
    'date',
    'created_at',
    'createdAt',
    'publishedAt',
    'timestamp',
  ]);
  const suppliedUrl = firstText(rawItem, [
    'url',
    'link',
    'permalink',
    'telegramUrl',
  ]);

  return {
    id: `${id}-${index}`,
    title,
    text: text || title,
    date,
    url: safeExternalUrl(suppliedUrl) || TELEGRAM_CHANNEL_URL,
  };
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentLang,
  onNavigate,
}) => {
  const languageCode = String(currentLang).toLowerCase();

  const labels = useMemo<HomeLabels>(() => {
    if (languageCode.startsWith('am')) {
      return {
        feedTitle: 'የሕግ መረጃና የፍርድ ውሳኔዎች ቴሌግራም',
        feedSubtitle: 'የቅርብ ጊዜ ልጥፎች • ለማዘመን ይጫኑ',
        loading: 'የቴሌግራም ልጥፎች በመጫን ላይ...',
        noPosts: 'በአሁኑ ጊዜ የሚታይ ልጥፍ የለም።',
        fetchError: 'የቴሌግራም መረጃን ማምጣት አልተቻለም። እንደገና ይሞክሩ።',
        invalidResponse: 'ከቴሌግራም የተመለሰው መረጃ በትክክል አልተዘጋጀም።',
        copy: 'ቅዳ',
        copied: 'ተቀድቷል',
        copyFailed: 'መቅዳት አልተቻለም',
        openPost: 'የቴሌግራም ልጥፉን ክፈት',
        noTitle: 'የቴሌግራም ልጥፍ',
        channel: 'ምንጭ',
      };
    }

    if (languageCode.startsWith('en')) {
      return {
        feedTitle: 'SEERAAI TELEGRAM LEGAL UPDATES',
        feedSubtitle: 'Latest channel posts • Refresh to update',
        loading: 'Loading Telegram posts...',
        noPosts: 'There are no posts to display right now.',
        fetchError: 'Could not load Telegram posts. Please try again.',
        invalidResponse: 'The Telegram service returned an unexpected response.',
        copy: 'Copy post',
        copied: 'Copied',
        copyFailed: 'Copy failed',
        openPost: 'Open Telegram post',
        noTitle: 'Telegram post',
        channel: 'Source',
      };
    }

    return {
      feedTitle: 'ODUU FI MURTIILEE TELEGRAM @SEERAAI_ETHIO',
      feedSubtitle: 'Maxxansa haaraa • haaromsuuf cuqaasi',
      loading: 'Maxxansi Telegram fe’amaa jira...',
      noPosts: 'Ammaaf maxxansi agarsiifamu hin jiru.',
      fetchError: 'Maxxansa Telegram fiduun hin milkoofne. Irra deebi’ii yaali.',
      invalidResponse: 'Deebiin tajaajila Telegram irraa dhufe sirnaan hin qindaa’in.',
      copy: 'Garagalchi',
      copied: 'Garagalfame',
      copyFailed: 'Garagalchuun hin milkoofne',
      openPost: 'Maxxansa Telegram bani',
      noTitle: 'Maxxansa Telegram',
      channel: 'Madda',
    };
  }, [languageCode]);

  const [telegramFeed, setTelegramFeed] = useState<TelegramFeedItemView[]>([]);
  const [isSyncingFeed, setIsSyncingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [copiedFeedId, setCopiedFeedId] = useState<string | null>(null);
  const [copyErrorId, setCopyErrorId] = useState<string | null>(null);

  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRefreshTelegramFeed = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsSyncingFeed(true);
    setFeedError(null);

    try {
      const response = (await fetchTelegramChannelFeed(
        'seeraai_ethio',
        4,
      )) as TelegramFeedResponse | null;

      if (!isMountedRef.current || requestId !== requestIdRef.current) return;

      if (!response || !Array.isArray(response.items)) {
        setFeedError(labels.invalidResponse);
        return;
      }

      setTelegramFeed(
        response.items.map((item, index) =>
          normalizeTelegramItem(item, index, labels.noTitle),
        ),
      );
    } catch (error) {
      console.warn('Telegram feed fetch error:', error);
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setFeedError(labels.fetchError);
      }
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setIsSyncingFeed(false);
      }
    }
  }, [labels]);

  useEffect(() => {
    isMountedRef.current = true;
    void handleRefreshTelegramFeed();

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, [handleRefreshTelegramFeed]);

  const handleCopyFeed = async (item: TelegramFeedItemView) => {
    const textToCopy = [item.title, item.text, item.url]
      .filter(Boolean)
      .join('\n\n');

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API is unavailable in this browser context.');
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopyErrorId(null);
      setCopiedFeedId(item.id);

      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedFeedId((current) => (current === item.id ? null : current));
      }, 2000);
    } catch (error) {
      console.warn('Telegram post copy error:', error);
      setCopiedFeedId(null);
      setCopyErrorId(item.id);
    }
  };

  const primaryCards = [
    {
      id: 'templates',
      title: "Sanadoota Qophaa'an & Unkaalee",
      subtitle: 'Prepared Documents & Templates',
      icon: <Layout className="h-6 w-6 text-amber-400" aria-hidden="true" />,
      action: () => onNavigate('templates'),
      border: 'border-amber-500/40',
    },
    {
      id: 'courtDocuments',
      title: 'Kuusaa Sanadoota Mana Murtii (External Storage)',
      subtitle: 'Court Document External Storage',
      icon: <Building2 className="h-6 w-6 text-emerald-400" aria-hidden="true" />,
      action: () => onNavigate('personnelFolder'),
      border: 'border-emerald-500/40',
    },
    {
      id: 'telegramArchive',
      title: 'Arkaba Telegram (Galmee 1,500+)',
      subtitle: 'Telegram Archive & Case Database',
      icon: <Archive className="h-6 w-6 text-sky-400" aria-hidden="true" />,
      action: () => onNavigate('social'),
      border: 'border-sky-500/40',
    },
    {
      id: 'helpFaq',
      title: 'Gargaarsa Seeraa & FAQ (Search Grounding)',
      subtitle: 'Legal Aid & Search Grounding',
      icon: <HelpCircle className="h-6 w-6 text-amber-300" aria-hidden="true" />,
      action: () => onNavigate('faq'),
      border: 'border-amber-400/50',
    },
  ];

  return (
    <main className="animate-in fade-in space-y-6 pb-20">
      {/* Primary navigation cards */}
      <section aria-label="Primary navigation" className="space-y-4">
        {primaryCards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={card.action}
            className={`group flex w-full items-center justify-between rounded-[2rem] border ${card.border} bg-slate-900/90 p-5 text-left shadow-xl transition-all hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`}
          >
            <span className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 shadow-inner transition-colors group-hover:border-indigo-500/50">
                {card.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-white transition-colors group-hover:text-indigo-300 sm:text-lg">
                  {card.title}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                  {card.subtitle}
                </span>
              </span>
            </span>
            <span
              aria-hidden="true"
              className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-slate-400 transition-all group-hover:bg-indigo-600 group-hover:text-white"
            >
              ›
            </span>
          </button>
        ))}
      </section>

      {/* Telegram channel feed: displays actual API results, not sample content */}
      <section
        aria-labelledby="telegram-feed-heading"
        aria-busy={isSyncingFeed}
        className="relative space-y-4 overflow-hidden rounded-[2.5rem] border border-indigo-500/40 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-indigo-500/20 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className={`h-3 w-3 shrink-0 rounded-full ${isSyncingFeed ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`}
            />
            <div className="min-w-0">
              <h2
                id="telegram-feed-heading"
                className="text-sm font-black uppercase tracking-wider text-white"
              >
                {labels.feedTitle}
              </h2>
              <p className="mt-1 font-mono text-[10px] text-indigo-300">
                {labels.feedSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleRefreshTelegramFeed()}
            disabled={isSyncingFeed}
            aria-label="Refresh Telegram feed"
            title="Refresh Telegram feed"
            className="shrink-0 rounded-xl border border-indigo-500/30 bg-slate-900 p-2.5 text-indigo-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-4 w-4 ${isSyncingFeed ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {feedError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-sm text-rose-200"
          >
            {feedError}
          </div>
        )}

        {isSyncingFeed && telegramFeed.length === 0 && (
          <p role="status" className="rounded-2xl bg-slate-950/60 p-5 text-sm text-slate-300">
            {labels.loading}
          </p>
        )}

        {!isSyncingFeed && telegramFeed.length === 0 && !feedError && (
          <p className="rounded-2xl border border-indigo-500/20 bg-slate-950/60 p-5 text-sm text-slate-300">
            {labels.noPosts}
          </p>
        )}

        <div className="space-y-3">
          {telegramFeed.map((item) => (
            <article
              key={item.id}
              className="space-y-3 rounded-2xl border border-indigo-500/30 bg-slate-950/80 p-5 shadow-inner"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-indigo-500/40 bg-indigo-900/60 px-3 py-1 font-mono text-[10px] font-bold text-indigo-300">
                  {labels.channel}: @seeraai_ethio
                </span>
                {item.date && (
                  <time className="font-mono text-[10px] text-slate-400">
                    {item.date}
                  </time>
                )}
              </div>

              <h3 className="text-sm font-bold leading-snug text-white">
                {item.title}
              </h3>

              <p className="max-h-32 overflow-hidden whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">
                {item.text}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900 pt-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopyFeed(item)}
                    className="flex items-center gap-1.5 font-bold text-indigo-400 transition hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    {copiedFeedId === item.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>
                      {copiedFeedId === item.id
                        ? labels.copied
                        : copyErrorId === item.id
                          ? labels.copyFailed
                          : labels.copy}
                    </span>
                  </button>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-bold text-amber-400 transition hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <span>{labels.openPost}</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
