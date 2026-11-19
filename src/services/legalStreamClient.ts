import { Language } from '../i18n/translations';
import { getApiHeaders } from './api';
import type {
  AnswerQualityChecklist,
  CassationComparison,
  LegalQuestionAnalysis,
  ResearchMode,
  RetrievedLegalSource,
} from '../types/legalAnswer';

export type StreamPhase = 'grounding' | 'streaming' | 'finalizing';

export interface StreamLegalSource {
  id: string;
  title: string;
  sourceType: 'cassation_decision' | 'proclamation' | 'civil_procedure';
  jurisdiction: string;
  fileNumber?: string;
  proclamationNumber?: string;
  volume?: string;
  articles?: string;
  channelHandle?: string;
  telegramPostUrl?: string;
  summary: string;
}

export interface StreamIntelligencePayload {
  mode: ResearchMode;
  questionAnalysis?: LegalQuestionAnalysis;
  cassationComparisons?: CassationComparison[];
  contraryAuthorities?: RetrievedLegalSource[];
  indexVersion?: string;
}

export interface StreamConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamLegalAnalysisParams {
  prompt: string;
  context?: string;
  language?: Language;
  outputLanguages?: Language[] | 'all';
  responseFormat?: 'direct_full' | 'bullets' | 'provisions_only' | 'advice_steps';
  modelTier?: string;
  isThinkingMode?: boolean;
  researchMode?: ResearchMode;
  jurisdiction?: 'federal' | 'oromia' | 'both' | 'unknown';
  conversationHistory?: StreamConversationTurn[];
}

export interface StreamDonePayload {
  modelUsed: string;
  outputLanguages: Language[];
  detectedInputLang: Language;
  sourceCount: number;
  durationMs: number;
  fallbackUsed: boolean;
  fullText: string;
  separatedVersions: {
    om?: string;
    am?: string;
    en?: string;
  };
  mode?: ResearchMode;
  questionAnalysis?: LegalQuestionAnalysis;
  cassationComparisons?: CassationComparison[];
  contraryAuthorities?: RetrievedLegalSource[];
  qualityChecklist?: AnswerQualityChecklist;
}

export interface StreamCallbacks {
  onPhase?: (phase: StreamPhase, label: string) => void;
  onSources?: (sources: StreamLegalSource[]) => void;
  onIntelligence?: (intel: StreamIntelligencePayload) => void;
  onChunk?: (delta: string, accumulated: string, model?: string) => void;
  onDone?: (payload: StreamDonePayload) => void;
  onError?: (error: Error) => void;
}

export function sanitizeStreamTextPreservingWhitespace(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/^[ \t]*\*[ \t]+/gm, '• ')
    .replace(/[*#]/g, '')
    .replace(/\[(?:STRICT|MANDATORY|DIRECTIVE|INSTRUCTION)[^\]]*\]/gi, '');
}

export async function streamLegalAnalysis(
  params: StreamLegalAnalysisParams,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<StreamDonePayload | null> {
  const headers = await getApiHeaders();
  headers['Accept'] = 'text/event-stream';

  const res = await fetch('/api/legal/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    let message = `Streaming request failed (HTTP ${res.status})`;
    if (contentType.includes('application/json')) {
      const errJson = await res.json().catch(() => null);
      if (errJson?.error) message = errJson.error;
    } else {
      const text = await res.text().catch(() => '');
      if (text) message = text;
    }
    const error = new Error(message);
    callbacks.onError?.(error);
    throw error;
  }

  if (!res.body) {
    const error = new Error('ReadableStream is not supported by this browser response.');
    callbacks.onError?.(error);
    throw error;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulated = '';
  let finalPayload: StreamDonePayload | null = null;

  const processEventBlock = (block: string) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length === 0) return;
    const rawData = dataLines.join('\n');

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      parsed = { raw: rawData };
    }

    if (eventName === 'phase') {
      callbacks.onPhase?.(parsed.phase || 'streaming', parsed.label || '');
    } else if (eventName === 'sources') {
      callbacks.onSources?.(Array.isArray(parsed.sources) ? parsed.sources : []);
    } else if (eventName === 'intelligence') {
      callbacks.onIntelligence?.(parsed as StreamIntelligencePayload);
    } else if (eventName === 'chunk') {
      const delta = typeof parsed.delta === 'string' ? parsed.delta : '';
      if (delta) {
        accumulated += delta;
        callbacks.onChunk?.(delta, accumulated, parsed.model);
      }
    } else if (eventName === 'done') {
      finalPayload = parsed as StreamDonePayload;
      callbacks.onDone?.(finalPayload);
    } else if (eventName === 'error') {
      const err = new Error(parsed?.message || 'Streaming error occurred.');
      callbacks.onError?.(err);
      throw err;
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || '';
      for (const frame of frames) {
        processEventBlock(frame);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      processEventBlock(buffer);
    }

    return finalPayload;
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError') {
      return null;
    }
    callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Ignore if already released
    }
  }
}
