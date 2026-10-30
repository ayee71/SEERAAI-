import { Language } from '../i18n/translations';
import { getUserSettings } from './storage';
import { auth } from './firebase';

export interface GenerateRequest {
  prompt: string;
  context?: string;
  taskType?: 'contract' | 'explain_law' | 'social_facebook' | 'social_telegram' | 'summarize' | 'general';
  outputLanguages: Language[] | 'all';
  modelTier?: string; // More flexible model tier
}

export interface GenerateResponse {
  content: string;
  separatedVersions: {
    om?: string;
    am?: string;
    en?: string;
  };
  detectedInputLang: Language;
  outputLanguages: Language[];
}

export interface TranslateRequest {
  sourceText: string;
  sourceLang: Language | 'auto';
  targetLang: Language;
  mode?: 'translate' | 'proofread_rewrite';
}

export interface TranslateResponse {
  translatedText: string;
  sourceLang: Language;
  targetLang: Language;
  isRewrite: boolean;
}

export interface DictionaryResponse {
  term: string;
  om?: {
    term: string;
    definition: string;
    usage: string;
  };
  am?: {
    term: string;
    definition: string;
    usage: string;
  };
  en?: {
    term: string;
    definition: string;
    usage: string;
  };
  primaryProclamationOrCode?: string;
  raw?: string;
}

export async function getApiHeaders(): Promise<Record<string, string>> {
  const settings = getUserSettings();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.customApiKey && settings.customApiKey.trim().length > 5) {
    headers['X-Custom-Api-Key'] = settings.customApiKey.trim();
  }
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve Firebase ID token for API headers:', err);
  }
  return headers;
}

async function safeParseResponse(res: Response, fallbackMessage: string): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(
      text.includes('<!doctype')
        ? 'Tajaajilli yeroof hin deebisne. Maaloo irra deebi\'aa yaalaa. / Please try again.'
        : text || fallbackMessage
    );
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}

export async function detectLanguage(text: string): Promise<Language> {
  try {
    const res = await fetch('/api/detect', {
      method: 'POST',
      headers: await getApiHeaders(),
      body: JSON.stringify({ text }),
    });
    const data = await safeParseResponse(res, 'Detection failed');
    return data.detectedLanguage || 'om';
  } catch (e) {
    // Fallback simple detection
    if (/[\u1200-\u137F]/.test(text)) return 'am';
    if (/\b(keeyyata|labsii|seera|waan|mootummaa|waliigalte|akka|dhaddacha)\b/i.test(text)) return 'om';
    return 'en';
  }
}
import { cleanLegalArtifacts } from '../utils/legalProseFormatter';

export function cleanTextFormatting(text: string): string {
  if (!text) return '';
  return cleanLegalArtifacts(text);
}

export async function generateLegalContent(req: GenerateRequest): Promise<GenerateResponse> {
  const settings = getUserSettings();
  const payload = {
    ...req,
    modelTier: req.modelTier || settings.aiModelTier || 'deep_thinking',
  };
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify(payload),
  });

  const data: GenerateResponse = await safeParseResponse(res, 'Generation failed');
  if (data) {
    if (data.content) data.content = cleanTextFormatting(data.content);
    if (data.separatedVersions) {
      if (data.separatedVersions.om) data.separatedVersions.om = cleanTextFormatting(data.separatedVersions.om);
      if (data.separatedVersions.am) data.separatedVersions.am = cleanTextFormatting(data.separatedVersions.am);
      if (data.separatedVersions.en) data.separatedVersions.en = cleanTextFormatting(data.separatedVersions.en);
    }
  }
  return data;
}

export async function translateLegalText(req: TranslateRequest): Promise<TranslateResponse> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify(req),
  });

  const data: TranslateResponse = await safeParseResponse(res, 'Translation failed');
  if (data && data.translatedText) {
    data.translatedText = cleanTextFormatting(data.translatedText);
  }
  return data;
}

export interface AnalyzeDocumentRequest {
  fileData?: string | null;
  mimeType?: string;
  fileText?: string;
  fileName?: string;
  files?: { fileData: string; mimeType: string; fileName?: string }[];
  analysisType?: 'risk_analysis' | 'compliance' | 'plain_explanation' | 'translate_document' | 'summarize' | 'extract_text';
  outputLanguages: Language[] | 'all';
  customInstructions?: string;
  modelTier?: string; // Flexible model tier
}

export interface AnalyzeDocumentResponse {
  analysis: string;
  separatedVersions?: {
    om?: string;
    am?: string;
    en?: string;
  };
  outputLanguages: Language[];
  fileName: string;
  analysisType: string;
  modelUsed?: string;
  detectedInputLang?: Language;
}

export async function analyzeLegalDocument(req: AnalyzeDocumentRequest): Promise<AnalyzeDocumentResponse> {
  const settings = getUserSettings();
  const payload = {
    ...req,
    modelTier: req.modelTier || settings.aiModelTier || 'gemini-flash-lite-latest',
  };

  try {
    const res = await fetch('/api/analyze-document', {
      method: 'POST',
      headers: await getApiHeaders(),
      body: JSON.stringify(payload),
    });

    const data: AnalyzeDocumentResponse = await safeParseResponse(res, 'Document analysis failed');
    if (data) {
      if (data.analysis) data.analysis = cleanTextFormatting(data.analysis);
      if (data.separatedVersions) {
        if (data.separatedVersions.om) data.separatedVersions.om = cleanTextFormatting(data.separatedVersions.om);
        if (data.separatedVersions.am) data.separatedVersions.am = cleanTextFormatting(data.separatedVersions.am);
        if (data.separatedVersions.en) data.separatedVersions.en = cleanTextFormatting(data.separatedVersions.en);
      }
    }
    return data;
  } catch (err: any) {
    console.error('API Error in analyzeLegalDocument:', err);
    if (err?.name === 'TypeError' || err?.message?.includes('Failed to fetch') || err?.message?.includes('network')) {
      const fallbackText = req.fileText || `[SANADA SEERAA - OFFLINE EXTRACTION FALLBACK]\nMadda Sanadaa: ${req.fileName || 'document'}\nGuyyaa: ${new Date().toLocaleDateString()}\nQabiyyee: Sanadichi milkaa'inaan fe'ameera. Walqunnamtiin server yeroof cufamee yoo ta'e, barreeffaman kun qabiyyee galmee keessan irraa fudhatameera.`;
      return {
        analysis: fallbackText,
        separatedVersions: {
          om: fallbackText,
          am: fallbackText,
          en: fallbackText,
        },
        outputLanguages: Array.isArray(req.outputLanguages) ? req.outputLanguages : ['om'],
        fileName: req.fileName || 'document',
        analysisType: req.analysisType || 'extract_text',
        modelUsed: 'offline-fallback',
      };
    }
    throw err;
  }
}

export interface DocumentQuestionRequest {
  documentText?: string;
  templateContext?: {
    title?: string;
    lawBasis?: string;
    category?: string;
    formData?: Record<string, string>;
  };
  question: string;
  language?: Language;
  modelTier?: string; // Flexible model tier
}

export interface DocumentQuestionResponse {
  answer: string;
  modelUsed?: string;
  question: string;
  language: string;
}

export async function askDocumentQuestion(req: DocumentQuestionRequest): Promise<DocumentQuestionResponse> {
  const settings = getUserSettings();
  const payload = {
    ...req,
    modelTier: req.modelTier || settings.aiModelTier || 'gemini-flash-lite-latest',
  };

  const res = await fetch('/api/qa-document', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify(payload),
  });

  return await safeParseResponse(res, 'Document Q&A failed');
}

export async function lookupLegalTerm(term: string): Promise<DictionaryResponse> {
  const res = await fetch('/api/legal-dictionary', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({ term }),
  });

  return await safeParseResponse(res, 'Dictionary lookup failed');
}

export interface LegalLogicSuggestion {
  proclamationTitle: string;
  proclamationNumber?: string;
  articleOrSection: string;
  legalConcept: string;
  reasoning: string;
  cassationQuery: string;
}

export interface LegalLogicSearchResponse {
  concepts: string[];
  suggestions: LegalLogicSuggestion[];
  rawAnalysis: string;
}

export async function performLegalLogicSearch(
  text: string,
  lang: Language = 'om'
): Promise<LegalLogicSearchResponse> {
  const prompt = `You are an expert Ethiopian AI Legal Logic Agent. Analyze the following legal text or dictated case details and identify the underlying legal concepts, relevant FDRE Proclamations, specific Civil/Labor/Criminal/Commercial Code articles, and Cassation decision precedents that apply to this scenario.

Text to Analyze:
"""
${text}
"""

Format your response in three clearly structured sections in ${lang === 'om' ? 'Afaan Oromoo' : lang === 'am' ? 'Amharic' : 'English'}:
1. 🧠 Core Identified Legal Concepts (Qabxiiwwan Seeraa Adda Ba'an)
2. 📜 Applicable Proclamations & Articles (Labsiilee fi Keeyyattoota Seeraa Ilaallatan)
3. 🏛️ Key Cassation Precedent Angle (Yaada Murtee Dhaddacha Ijoo)

Provide concrete proclamation numbers (e.g., Labsii Lakk. 1156/2019, Koodii Siivilii Keeyyata 1723, Labsii 979/2016) and practical legal advice.`;

  const settings = getUserSettings();
  const payload = {
    prompt,
    taskType: 'explain_law',
    outputLanguages: [lang],
    modelTier: settings.aiModelTier || 'gemini-flash-lite-latest',
  };

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await safeParseResponse(res, 'Legal logic search failed');
  return {
    concepts: [text.substring(0, 60)],
    suggestions: [],
    rawAnalysis: data.content || data.separatedVersions?.[lang] || 'Result generated.',
  };
}

export async function auditDocumentLegalLogic(
  text: string,
  lang: Language = 'om',
  modelTier?: string
): Promise<any> {
  const settings = getUserSettings();
  const res = await fetch('/api/audit-legal-logic', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({
      text,
      language: lang,
      modelTier: modelTier || settings.aiModelTier || 'gemini-flash-lite-latest',
    }),
  });

  return await safeParseResponse(res, 'Procedural legal logic audit failed');
}

export interface TranscribeAudioRequest {
  audioData: string; // base64
  mimeType?: string;
  language?: Language | 'auto';
  legalMode?: boolean;
}

export interface TranscribeAudioResponse {
  transcription: string;
  detectedLanguage: Language;
  modelUsed?: string;
}

export async function transcribeSpeechAudio(req: TranscribeAudioRequest): Promise<TranscribeAudioResponse> {
  try {
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: await getApiHeaders(),
      body: JSON.stringify(req),
    });

    return await safeParseResponse(res, 'Transcription failed');
  } catch (err: any) {
    if (err?.name === 'TypeError' || err?.message?.includes('Failed to fetch')) {
      throw new Error('Walqunnamtiin network addaan cite. Maaloo irra deebi\'aa yaalaa. / Network connection issue, please retry.');
    }
    throw err;
  }
}

export interface OcrConvertRequest {
  fileData: string; // base64
  mimeType: string;
  fileName?: string;
  language?: Language | 'auto';
  extractMode?: 'full' | 'legal' | 'table';
}

export interface OcrConvertResponse {
  extractedText: string;
  detectedLanguage: Language;
  fileName: string;
  modelUsed?: string;
  wordCount: number;
}

export async function convertMediaFileToText(req: OcrConvertRequest): Promise<OcrConvertResponse> {
  try {
    const res = await fetch('/api/ocr-convert', {
      method: 'POST',
      headers: await getApiHeaders(),
      body: JSON.stringify(req),
    });

    return await safeParseResponse(res, 'OCR text extraction failed');
  } catch (err: any) {
    console.error('API Error in convertMediaFileToText:', err);
    if (err?.name === 'TypeError' || err?.message?.includes('Failed to fetch')) {
      throw new Error('Walqunnamtiin network addaan cite. Maaloo irra deebi\'aa yaalaa. / Network connection issue, please retry.');
    }
    throw err;
  }
}

export interface ExtractedMetadata {
  caseName: string;
  date: string;
  docType: string;
}

export async function extractDocumentMetadata(text: string, modelTier?: string): Promise<ExtractedMetadata> {
  const settings = getUserSettings();
  try {
    const res = await fetch('/api/extract-metadata', {
      method: 'POST',
      headers: await getApiHeaders(),
      body: JSON.stringify({
        text,
        modelTier: modelTier || settings.aiModelTier || 'gemini-flash-lite-latest',
      }),
    });
    const data = await safeParseResponse(res, 'Metadata extraction failed');
    return {
      caseName: data.caseName || '',
      date: data.date || '',
      docType: data.docType || '',
    };
  } catch (err) {
    console.warn('extractDocumentMetadata error:', err);
    return { caseName: '', date: '', docType: '' };
  }
}

export interface LegalCitationSuggestion {
  id: string;
  lawTitle: string;
  proclamationNumber: string;
  articleNumber: string;
  category: string;
  jurisdiction: 'federal' | 'oromia';
  badgeEmoji?: string;
  title: string;
  summary: string;
  insertText: string;
  cassationRef?: string;
  matchedKeyword?: string;
  relevanceScore?: number;
}

export async function findLegalCitations(
  text: string,
  language: Language = 'om',
  maxResults: number = 8
): Promise<LegalCitationSuggestion[]> {
  if (!text || text.trim().length === 0) return [];
  try {
    const res = await fetch('/api/citations/finder', {
      method: 'POST',
      headers: await getApiHeaders(),
      body: JSON.stringify({ text, language, maxResults }),
    });
    const data = await safeParseResponse(res, 'Citation scanning failed');
    return data.suggestions || [];
  } catch (err) {
    console.warn('findLegalCitations error:', err);
    return [];
  }
}
