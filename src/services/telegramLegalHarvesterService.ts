import { LegalEnactment, Jurisdiction, LegislationType, LegalCategory } from '../data/legislationDatabase';
import {
  ParsedTelegramLegalContent,
  TelegramChannelMetadata,
  MONITORED_CHANNELS,
  SEED_TELEGRAM_LEGAL_DOCS,
  fetchPublicTelegramChannelMessages,
  parseTelegramLegalMessage,
  storeTelegramLegalContentInFirestore,
  retrieveStoredTelegramLegalDocs,
  batchIngestTelegramChannel,
  subscribeToStoredTelegramDocs
} from './telegramLegalService';

export type TelegramLegalPost = ParsedTelegramLegalContent & {
  isIngested?: boolean;
  extractedTitle?: {
    om: string;
    am: string;
    en: string;
  };
  corePrinciples?: {
    om: string;
    am: string;
    en: string;
  };
};

export type TelegramChannelConfig = TelegramChannelMetadata & {
  id?: string;
  name?: string;
  verifiedPublic?: boolean;
  lastScrapedTime?: string;
  totalPostsFound?: number;
};

export const MONITORED_TELEGRAM_CHANNELS: TelegramChannelConfig[] = MONITORED_CHANNELS.map(ch => ({
  ...ch,
  id: ch.handle,
  name: ch.title,
  verifiedPublic: ch.isPublic,
  lastScrapedTime: ch.lastSyncDate,
  totalPostsFound: ch.totalHarvestedCount
}));

export const HARVESTED_TELEGRAM_LEGAL_POSTS: TelegramLegalPost[] = SEED_TELEGRAM_LEGAL_DOCS.map(doc => ({
  ...doc,
  isIngested: true,
  extractedTitle: doc.title,
  corePrinciples: doc.keyPrinciples
}));

/**
 * Retrieve harvested posts (reads from Firestore and local cache)
 */
export async function getStoredHarvestedPostsAsync(): Promise<TelegramLegalPost[]> {
  const docs = await retrieveStoredTelegramLegalDocs();
  return docs.map(d => ({
    ...d,
    isIngested: true,
    extractedTitle: d.title,
    corePrinciples: d.keyPrinciples
  }));
}

export function getStoredHarvestedPosts(): TelegramLegalPost[] {
  return SEED_TELEGRAM_LEGAL_DOCS.map(d => ({
    ...d,
    isIngested: true,
    extractedTitle: d.title,
    corePrinciples: d.keyPrinciples
  }));
}

export function saveHarvestedPosts(posts: TelegramLegalPost[]): void {
  // Saved via telegramLegalService store mechanisms
}

/**
 * Ingest a Telegram legal post directly into Firestore and central repository
 */
export async function ingestTelegramPostToDatabase(
  post: TelegramLegalPost
): Promise<{ success: boolean; enactment: LegalEnactment; message: string }> {
  const result = await storeTelegramLegalContentInFirestore(post);
  return {
    success: true,
    enactment: {
      id: post.id,
      type: post.type,
      jurisdiction: post.jurisdiction,
      number: post.referenceNumber,
      title: post.title || post.extractedTitle || { om: post.referenceNumber, am: post.referenceNumber, en: post.referenceNumber },
      authority: {
        om: post.channelTitle,
        am: post.channelTitle,
        en: post.channelTitle
      },
      yearEC: post.yearEC || 2016,
      yearGC: post.yearGC || 2024,
      category: post.category,
      summary: post.summary,
      keyPrinciples: post.keyPrinciples || post.corePrinciples,
      status: 'active',
      lastUpdatedDate: post.publishDate,
      sourceUrl: post.postUrl,
      tags: [...post.tags, 'Telegram Ingested']
    },
    message: result.message
  };
}

/**
 * Scrape/Harvest and parse from public Telegram channel (e.g. https://t.me/wakoyeb)
 */
export async function harvestFromTelegramChannel(
  channelInput: string,
  searchKeyword?: string
): Promise<{ success: boolean; postsFound: TelegramLegalPost[]; message: string }> {
  const rawMsgs = await fetchPublicTelegramChannelMessages(channelInput, searchKeyword);
  const parsed = rawMsgs.map(m => {
    const p = parseTelegramLegalMessage(m);
    return {
      ...p,
      isIngested: false,
      extractedTitle: p.title,
      corePrinciples: p.keyPrinciples
    };
  });

  return {
    success: true,
    postsFound: parsed,
    message: `Telegram channel "${channelInput}" irraa seeroonni fi murtiileen ${parsed.length} qoratamanii argamaniiru!`
  };
}

export {
  fetchPublicTelegramChannelMessages,
  parseTelegramLegalMessage,
  storeTelegramLegalContentInFirestore,
  retrieveStoredTelegramLegalDocs,
  batchIngestTelegramChannel,
  subscribeToStoredTelegramDocs
};
