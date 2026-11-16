import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { getApps as getAdminApps } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import type {
  ExtractedLegalStructure,
  ExtractedPageEntry,
  IngestionJobRecord,
  LegalDocumentCategory,
  LegalJurisdiction,
  LegalLanguage,
  LegalSourceRecord,
  LegalSourceType,
  TelegramCoverageReport,
} from "./legalTypes";
import {
  calculateSha256,
  isAuthorizedLegalEditor,
  registerOrGetIngestedSource,
} from "./legalSourceWorkflowService";
import { expandLegalSynonymsAndConcepts } from "./questionUnderstanding";

const OCR_MODEL = "gemini-4-hydrogen";
const STAGING_DIR = path.join(os.tmpdir(), "seeraai-legal-storage");

export interface IndexedChunk {
  chunkId: string;
  sourceId: string;
  title: string;
  pageNumber: number;
  sectionIndex: number;
  text: string;
  tokens: string[];
  concepts: string[];
  jurisdiction: "federal" | "oromia";
  category?: LegalDocumentCategory;
  sourceType: LegalSourceType;
  status: string;
  isPublic: boolean;
  institutionId?: string;
  indexVersion: string;
}

const ingestionJobs = new Map<string, IngestionJobRecord>();
const indexedChunksBySource = new Map<string, IndexedChunk[]>();
const rawBinaryFiles = new Map<string, { fileName: string; mimeType: string; diskPath: string }>();
const telegramMessageKeys = new Map<string, string>(); // "channel:msgId" -> sourceId
const coverageLedger = new Map<string, TelegramCoverageReport>();

let currentIndexVersion = `idx_v${Date.now()}`;

export function getIndexVersion(): string {
  return currentIndexVersion;
}

export function bumpIndexVersion(): string {
  currentIndexVersion = `idx_v${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  return currentIndexVersion;
}

export function getIndexedChunksForSource(sourceId: string): IndexedChunk[] {
  return indexedChunksBySource.get(sourceId) || [];
}

export function getAllIndexedChunks(): IndexedChunk[] {
  const all: IndexedChunk[] = [];
  for (const list of indexedChunksBySource.values()) {
    all.push(...list);
  }
  return all;
}

export function listIngestionJobs(): IngestionJobRecord[] {
  return [...ingestionJobs.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getCoverageLedger(): TelegramCoverageReport[] {
  return [...coverageLedger.values()];
}

export function getStoredOriginalFilePath(sourceId: string): { fileName: string; mimeType: string; diskPath: string } | null {
  return rawBinaryFiles.get(sourceId) || null;
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

function ensureStagingDir() {
  if (!fs.existsSync(STAGING_DIR)) {
    fs.mkdirSync(STAGING_DIR, { recursive: true });
  }
}

/**
 * Persists uploaded binary to Firebase Storage when configured, or clean out-of-Firestore
 * staging storage on disk (never storing large base64 documents inside Firestore).
 */
async function persistBinaryOutOfFirestore(
  sourceId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `public_legal_repository/${sourceId}/${safeName}`;

  try {
    const apps = getAdminApps();
    if (apps.length > 0 && process.env.FIREBASE_STORAGE_BUCKET) {
      const { getStorage } = await import("firebase-admin/storage");
      const bucket = getStorage(apps[0]).bucket(process.env.FIREBASE_STORAGE_BUCKET);
      await bucket.file(storagePath).save(buffer, {
        metadata: { contentType: mimeType },
      });
    }
  } catch (err) {
    // Non-fatal in local/non-bucket dev environment; keep safe disk staging copy
    console.warn("[DocumentIngestion] Cloud Storage bucket upload skipped, staged locally:", err instanceof Error ? err.message : err);
  }

  ensureStagingDir();
  const diskPath = path.join(STAGING_DIR, `${sourceId}_${safeName}`);
  fs.writeFileSync(diskPath, buffer);
  rawBinaryFiles.set(sourceId, { fileName: safeName, mimeType, diskPath });
  return storagePath;
}

/**
 * Runs multimodal OCR via Gemini 4 Hydrogen for scanned pages or legal document images (§4).
 * Records honest confidence and flags low-confidence outputs for human review.
 */
async function runImageOcrWithGemini(
  buffer: Buffer,
  mimeType: string,
  pageHint?: number
): Promise<{ text: string; confidence: number; needsHumanReview: boolean; warning?: string }> {
  const ai = getAiClient();
  if (!ai) {
    return {
      text: "",
      confidence: 0.15,
      needsHumanReview: true,
      warning: `OCR requires human verification${pageHint ? ` (Page ${pageHint})` : ""}: server GEMINI_API_KEY not configured for vision OCR.`,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: OCR_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/png",
                data: buffer.toString("base64"),
              },
            },
            {
              text: "Transcribe verbatim all printed or handwritten legal text in this Ethiopian legal document image (may be Afaan Oromoo, Amharic, or English). Preserve article numbers, case numbers, dates, and court headings exactly. Do NOT invent or complete unreadable words—mark unclear words as [unclear]. Output ONLY the transcribed text followed on a new line by OCR_CONFIDENCE: <0.00-1.00>.",
            },
          ],
        },
      ],
    });

    const raw = response.text?.trim() || "";
    const confMatch = raw.match(/OCR_CONFIDENCE:\s*([01](?:\.\d+)?)/i);
    const cleaned = raw.replace(/OCR_CONFIDENCE:\s*[01](?:\.\d+)?/gi, "").trim();
    const confidence = confMatch ? Math.max(0, Math.min(1, parseFloat(confMatch[1]))) : cleaned.length > 60 ? 0.78 : 0.4;
    const unclearCount = (cleaned.match(/\[unclear\]/gi) || []).length;
    const adjustedConf = Math.max(0.1, confidence - unclearCount * 0.08);
    const needsHumanReview = adjustedConf < 0.7 || cleaned.length < 30;

    return {
      text: cleaned,
      confidence: Number(adjustedConf.toFixed(2)),
      needsHumanReview,
      warning: needsHumanReview
        ? `Low OCR confidence (${Math.round(adjustedConf * 100)}%)${pageHint ? ` on Page ${pageHint}` : ""}; flagged for human review.`
        : undefined,
    };
  } catch (err) {
    return {
      text: "",
      confidence: 0.1,
      needsHumanReview: true,
      warning: `OCR processing warning${pageHint ? ` (Page ${pageHint})` : ""}: ${err instanceof Error ? err.message : "OCR failed"}`,
    };
  }
}

function stripHtmlClean(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|p|div|li|tr|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Structured legal entity extraction (§4) across Afaan Oromoo, Amharic, and English.
 * Never fabricates missing fields; returns undefined where absent.
 */
export function extractStructuredLegalEntities(
  pages: ExtractedPageEntry[],
  ocrApplied: boolean,
  avgOcrConfidence?: number
): ExtractedLegalStructure {
  const fullText = pages.map((p) => p.text).join("\n\n");
  const warnings: string[] = [];

  for (const p of pages) {
    if (p.needsHumanReview) {
      warnings.push(`Page ${p.pageNumber} flagged for human review (OCR confidence: ${Math.round((p.ocrConfidence ?? 0.3) * 100)}%).`);
    }
  }

  const courtMatch = fullText.match(
    /(?:Mana Murtii[^\n.]{3,90}|Federal Supreme Court[^\n.]{0,60}|Oromia Supreme Court[^\n.]{0,60}|High Court[^\n.]{0,60}|የፌዴራል\s+ጠቅላይ\s+ፍርድ\s+ቤት[^\n.]{0,60}|የኦሮሚያ\s+ጠቅላይ\s+ፍርድ\s+ቤት[^\n.]{0,60})/i
  );
  const caseMatch = fullText.match(
    /(?:Galmee(?:\s*Lakk\.?)?|File\s*No\.?|Case\s*No\.?|መዝገብ\s*ቁጥር)\s*[:#-]?\s*([A-Za-z0-9/-]{3,20})/i
  );
  const dateMatch = fullText.match(
    /(?:Guyyaa\s*Murtii|Decision\s*Date|Date|ቀን)\s*[:#-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i
  );
  const partiesMatch = fullText.match(
    /(?:Ol['’]?iyyataa\s*(?:fi|\/|vs\.?)\s*Deebii\s*Kennaa|Iyyataa[^\n]{5,120}|Plaintiff[^\n]{5,120}|Applicant[^\n]{5,120}|ከሳሽ[^\n]{5,120})/i
  );

  const sectionExtract = (labels: RegExp): string | undefined => {
    const m = fullText.match(labels);
    if (!m || m.index === undefined) return undefined;
    const after = fullText.slice(m.index + m[0].length, m.index + m[0].length + 600).trim();
    return after.split(/\n{2,}/)[0]?.trim() || undefined;
  };

  const facts = sectionExtract(/(?:Dhugaa\s*Dhimmaa|Seenaa\s*Dhimmaa|Facts|ፍሬ\s*ነገር)\s*[:\-]?/i);
  const proceduralHistory = sectionExtract(/(?:Adeemsa\s*Falmii|Procedural\s*History|የክርክር\s*ሂደት)\s*[:\-]?/i);
  const legalReasoning = sectionExtract(/(?:Xiinxala\s*Seeraa|Sababa\s*Murtii|Reasoning|Analysis|ምክንያት)\s*[:\-]?/i);
  const holdingAndFinalOrder = sectionExtract(
    /(?:Murtii\s*Dhaddachaa|Ajaja\s*Xumuraa|Qajeeltoo\s*Dirqisiisaa|Holding|Final\s*Order|ውሳኔ)\s*[:\-]?/i
  );
  const dissentingOpinion = sectionExtract(/(?:Yaada\s*Addaa|Dissenting\s*Opinion|የልዩነት\s*ሀሳብ)\s*[:\-]?/i);

  const articles = new Set<string>();
  const artMatches = fullText.matchAll(/(?:Kwt\.?|Keeyyata|Art\.?|Article|አንቀጽ|አንቀፅ)\s*(\d+(?:\(\d+\))?)/gi);
  for (const m of artMatches) {
    if (m[1]) articles.add(m[1]);
  }

  const citedPrecedents = new Set<string>();
  const precMatches = fullText.matchAll(/(?:Galmee\s*Lakk\.?|Cassation\s*File\s*No\.?|መዝገብ\s*ቁጥር)\s*[:#-]?\s*(\d{4,8})/gi);
  for (const m of precMatches) {
    if (m[1]) citedPrecedents.add(m[1]);
  }

  const applicableLaws = new Set<string>();
  const lawMatches = fullText.matchAll(/(?:Labsii(?:\s*Lakk\.?)?|Proclamation(?:\s*No\.?)?|አዋጅ\s*ቁጥር)\s*([0-9]{2,4}\/[0-9]{4})/gi);
  for (const m of lawMatches) {
    if (m[1]) applicableLaws.add(`Proclamation ${m[1]}`);
  }

  const { detectedConcepts } = expandLegalSynonymsAndConcepts(fullText);
  const needsHumanReview = pages.some((p) => p.needsHumanReview) || fullText.trim().length < 25;

  return {
    courtName: courtMatch?.[0]?.trim(),
    caseNumber: caseMatch?.[1]?.trim(),
    decisionDate: dateMatch?.[1]?.trim(),
    parties: partiesMatch?.[0]?.trim(),
    legalIssues: detectedConcepts,
    facts,
    proceduralHistory,
    applicableLaw: [...applicableLaws],
    legalReasoning,
    holdingAndFinalOrder,
    dissentingOpinion,
    citedPrecedents: [...citedPrecedents],
    relevantArticles: [...articles],
    pageCount: pages.length,
    pageMap: pages,
    ocrApplied,
    ocrConfidence: avgOcrConfidence,
    needsHumanReview,
    warnings,
  };
}

/**
 * Extracts text & per-page map from PDF, DOCX, TXT, HTML, or Image buffers (§4).
 */
export async function extractDocumentContent(args: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  preExtractedText?: string;
}): Promise<{
  text: string;
  pages: ExtractedPageEntry[];
  ocrApplied: boolean;
  ocrConfidence?: number;
  needsHumanReview: boolean;
  structure: ExtractedLegalStructure;
}> {
  const lowerName = (args.fileName || "").toLowerCase();
  const mime = (args.mimeType || "").toLowerCase();

  if (args.preExtractedText && args.preExtractedText.trim().length > 20) {
    const pages = splitTextIntoLogicalPages(args.preExtractedText);
    const structure = extractStructuredLegalEntities(pages, false, 1.0);
    return {
      text: args.preExtractedText.trim(),
      pages,
      ocrApplied: false,
      ocrConfidence: 1.0,
      needsHumanReview: false,
      structure,
    };
  }

  // 1. PDF Extraction with page detection & scanned-page OCR fallback
  if (mime.includes("pdf") || lowerName.endsWith(".pdf")) {
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: args.buffer });
      const textResult = await parser.getText();
      const rawPages = Array.isArray(textResult?.pages) ? textResult.pages : [];
      const pages: ExtractedPageEntry[] = [];
      let ocrApplied = false;
      const confidences: number[] = [];

      if (rawPages.length === 0 && textResult?.text) {
        const clean = textResult.text.trim();
        pages.push({
          pageNumber: 1,
          text: clean,
          ocrApplied: clean.length < 30,
          ocrConfidence: clean.length < 30 ? 0.25 : 0.98,
          needsHumanReview: clean.length < 30,
        });
      } else {
        for (let i = 0; i < rawPages.length; i++) {
          const p = rawPages[i];
          const pageNo = p.num || i + 1;
          const pText = (p.text || "").trim();

          if (pText.length < 35) {
            // Scanned page detected -> try screenshot + Gemini OCR for first few scanned pages
            ocrApplied = true;
            let ocrRes: { text: string; confidence: number; needsHumanReview: boolean } = {
              text: pText,
              confidence: 0.25,
              needsHumanReview: true,
            };
            try {
              if (i < 5) {
                const shot = await parser.getScreenshot({ partial: [pageNo] });
                const imgBytes = shot?.pages?.[0]?.data;
                if (imgBytes && imgBytes.length > 0) {
                  const res = await runImageOcrWithGemini(Buffer.from(imgBytes), "image/png", pageNo);
                  ocrRes = {
                    text: res.text || pText,
                    confidence: res.confidence,
                    needsHumanReview: res.needsHumanReview,
                  };
                }
              }
            } catch {
              // Preserve low confidence flag rather than crashing ingestion
            }
            confidences.push(ocrRes.confidence);
            pages.push({
              pageNumber: pageNo,
              text: ocrRes.text,
              ocrApplied: true,
              ocrConfidence: ocrRes.confidence,
              needsHumanReview: ocrRes.needsHumanReview,
            });
          } else {
            confidences.push(0.98);
            pages.push({
              pageNumber: pageNo,
              text: pText,
              ocrApplied: false,
              ocrConfidence: 0.98,
              needsHumanReview: false,
            });
          }
        }
      }

      const avgConf =
        confidences.length > 0
          ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2))
          : 0.2;
      const combinedText = pages.map((p) => `[Page ${p.pageNumber}]\n${p.text}`).join("\n\n").trim();
      const structure = extractStructuredLegalEntities(pages, ocrApplied, avgConf);
      return {
        text: combinedText,
        pages,
        ocrApplied,
        ocrConfidence: avgConf,
        needsHumanReview: structure.needsHumanReview,
        structure,
      };
    } catch (err) {
      // Fallback: treat buffer text only if printable UTF-8 exists, else flag for review
      const fallbackText = args.buffer.toString("utf8").replace(/[^\x20-\x7E\u00A0-\uFFFF\n]/g, " ").trim();
      const snippet = fallbackText.length > 60 && !fallbackText.startsWith("%PDF") ? fallbackText : "";
      const pages: ExtractedPageEntry[] = [
        {
          pageNumber: 1,
          text: snippet,
          ocrApplied: true,
          ocrConfidence: 0.2,
          needsHumanReview: true,
        },
      ];
      const structure = extractStructuredLegalEntities(pages, true, 0.2);
      structure.warnings.push(`PDF parser warning: ${err instanceof Error ? err.message : "Could not parse binary PDF stream"}; flagged for manual/OCR review.`);
      return {
        text: snippet,
        pages,
        ocrApplied: true,
        ocrConfidence: 0.2,
        needsHumanReview: true,
        structure,
      };
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch {
          // ignore
        }
      }
    }
  }

  // 2. DOCX Extraction via mammoth (§4)
  if (mime.includes("wordprocessingml") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
    try {
      const res = await mammoth.extractRawText({ buffer: args.buffer });
      const text = (res.value || "").trim();
      const pages = splitTextIntoLogicalPages(text);
      const structure = extractStructuredLegalEntities(pages, false, 0.96);
      if (res.messages?.length) {
        structure.warnings.push(...res.messages.map((m) => m.message));
      }
      return {
        text,
        pages,
        ocrApplied: false,
        ocrConfidence: 0.96,
        needsHumanReview: text.length < 25,
        structure,
      };
    } catch (err) {
      const pages: ExtractedPageEntry[] = [{ pageNumber: 1, text: "", ocrApplied: false, ocrConfidence: 0.1, needsHumanReview: true }];
      const structure = extractStructuredLegalEntities(pages, false, 0.1);
      structure.warnings.push(`DOCX extraction failed: ${err instanceof Error ? err.message : String(err)}`);
      return { text: "", pages, ocrApplied: false, ocrConfidence: 0.1, needsHumanReview: true, structure };
    }
  }

  // 3. Images -> OCR (§4)
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|tiff?)$/i.test(lowerName)) {
    const ocr = await runImageOcrWithGemini(args.buffer, mime || "image/png", 1);
    const pages: ExtractedPageEntry[] = [
      {
        pageNumber: 1,
        text: ocr.text,
        ocrApplied: true,
        ocrConfidence: ocr.confidence,
        needsHumanReview: ocr.needsHumanReview,
      },
    ];
    const structure = extractStructuredLegalEntities(pages, true, ocr.confidence);
    if (ocr.warning) structure.warnings.push(ocr.warning);
    return {
      text: ocr.text,
      pages,
      ocrApplied: true,
      ocrConfidence: ocr.confidence,
      needsHumanReview: ocr.needsHumanReview,
      structure,
    };
  }

  // 4. HTML / TXT / JSON plain text
  const raw = args.buffer.toString("utf8");
  const cleanText = mime.includes("html") || lowerName.endsWith(".html") || lowerName.endsWith(".htm")
    ? stripHtmlClean(raw)
    : raw.trim();
  const pages = splitTextIntoLogicalPages(cleanText);
  const structure = extractStructuredLegalEntities(pages, false, 1.0);
  return {
    text: cleanText,
    pages,
    ocrApplied: false,
    ocrConfidence: 1.0,
    needsHumanReview: cleanText.length < 20,
    structure,
  };
}

function splitTextIntoLogicalPages(text: string): ExtractedPageEntry[] {
  const explicitPages = text.split(/\f|\[(?:Page|Fuula)\s+\d+\]/i).filter((p) => p.trim().length > 0);
  if (explicitPages.length > 1) {
    return explicitPages.map((p, idx) => ({
      pageNumber: idx + 1,
      text: p.trim(),
      ocrApplied: false,
      ocrConfidence: 0.98,
      needsHumanReview: false,
    }));
  }
  const chunkSize = 2400;
  const pages: ExtractedPageEntry[] = [];
  for (let i = 0, pNo = 1; i < text.length; i += chunkSize, pNo++) {
    pages.push({
      pageNumber: pNo,
      text: text.slice(i, i + chunkSize).trim(),
      ocrApplied: false,
      ocrConfidence: 0.98,
      needsHumanReview: false,
    });
  }
  if (pages.length === 0) {
    pages.push({ pageNumber: 1, text: text.trim(), ocrApplied: false, ocrConfidence: 0.98, needsHumanReview: text.trim().length < 15 });
  }
  return pages;
}

/**
 * Splits extracted pages into paragraph chunks for fast incremental BM25/concept vector indexing (§14).
 */
export function indexSourceChunks(source: LegalSourceRecord, pages: ExtractedPageEntry[]): IndexedChunk[] {
  const version = bumpIndexVersion();
  const chunks: IndexedChunk[] = [];

  for (const p of pages) {
    const paragraphs = p.text
      .split(/\n{2,}|(?=\n?(?:Kwt\.?|Keeyyata|Article)\s+\d+)/i)
      .map((s) => s.trim())
      .filter((s) => s.length >= 15);

    const blocks = paragraphs.length > 0 ? paragraphs : p.text.trim() ? [p.text.trim()] : [];
    blocks.forEach((block, sIdx) => {
      const tokens = [
        ...new Set(
          block
            .toLocaleLowerCase()
            .normalize("NFKC")
            .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
            .split(/\s+/)
            .filter((t) => t.length >= 2)
        ),
      ];
      const { detectedConcepts } = expandLegalSynonymsAndConcepts(block);
      chunks.push({
        chunkId: `${source.id}_p${p.pageNumber}_s${sIdx + 1}`,
        sourceId: source.id,
        title: source.title,
        pageNumber: p.pageNumber,
        sectionIndex: sIdx + 1,
        text: block,
        tokens,
        concepts: detectedConcepts,
        jurisdiction: source.jurisdiction,
        category: source.category,
        sourceType: source.sourceType,
        status: source.status,
        isPublic: source.isPublic !== false,
        institutionId: source.institutionId,
        indexVersion: version,
      });
    });
  }

  indexedChunksBySource.set(source.id, chunks);
  return chunks;
}

function mapCategoryToSourceType(category?: LegalDocumentCategory, fallback?: LegalSourceType): LegalSourceType {
  if (fallback) return fallback;
  if (!category) return "other";
  switch (category) {
    case "Federal Supreme Court Cassation Decisions":
      return "cassation_decision";
    case "Oromia Supreme Court Decisions":
    case "Oromia High Court Decisions":
      return "court_decision";
    case "Federal Laws and Proclamations":
      return "proclamation";
    case "Oromia Regional Laws and Regulations":
      return "regulation";
    case "Civil Code and Civil Procedure Materials":
      return "civil_code";
    case "Criminal Code and Criminal Procedure Materials":
      return "criminal_code";
    default:
      return "other";
  }
}

export interface IngestUploadInput {
  title?: string;
  category?: LegalDocumentCategory;
  sourceType?: LegalSourceType;
  jurisdiction?: LegalJurisdiction;
  issuingInstitution?: string;
  courtName?: string;
  decisionDate?: string;
  caseNumber?: string;
  proclamationNumber?: string;
  volume?: string;
  page?: string;
  legalSubject?: string;
  keywords?: string[];
  articleNumbers?: string[];
  verificationStatus?: "VERIFIED" | "UNVERIFIED" | "UNDER_REVIEW";
  isPublic?: boolean;
  institutionId?: string;
  fileName: string;
  mimeType: string;
  fileBase64?: string;
  textContent?: string;
  language?: LegalLanguage;
  officialSourceName?: string;
  officialSourceUrl?: string;
  channelHandle?: string;
  telegramPostUrl?: string;
  messageId?: string;
  originalDateTime?: string;
  uploaderUid: string;
  uploaderRole: string;
  uploaderEmail?: string;
}

/**
 * Queues & executes asynchronous extraction, OCR, deduplication, and incremental indexing (§3, §4, §14).
 */
export async function ingestUploadedDocument(
  db: Firestore | null,
  input: IngestUploadInput
): Promise<IngestionJobRecord> {
  if (!isAuthorizedLegalEditor(input.uploaderRole, input.uploaderEmail)) {
    throw new Error("UNAUTHORIZED: Caller lacks authorized legal knowledge uploader privileges.");
  }

  const buffer = input.fileBase64
    ? Buffer.from(input.fileBase64, "base64")
    : Buffer.from(input.textContent || "", "utf8");
  if (buffer.length === 0) {
    throw new Error("EMPTY_DOCUMENT: Uploaded file or text content is empty.");
  }

  const checksum = calculateSha256(buffer);
  const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();

  const job: IngestionJobRecord = {
    jobId,
    sourceOrigin: input.telegramPostUrl || input.channelHandle ? "telegram_export" : "upload",
    fileName: input.fileName || "legal_document.txt",
    mimeType: input.mimeType || "text/plain",
    fileSizeBytes: buffer.length,
    sha256Checksum: checksum,
    status: "processing",
    progressPct: 15,
    retries: 0,
    warnings: [],
    channelHandle: input.channelHandle,
    messageId: input.messageId,
    originalDateTime: input.originalDateTime,
    telegramPostUrl: input.telegramPostUrl,
    ocrApplied: false,
    needsHumanReview: false,
    chunkCount: 0,
    indexVersion: currentIndexVersion,
    createdAt: now,
    updatedAt: now,
    createdByUid: input.uploaderUid,
    institutionId: input.institutionId,
  };
  ingestionJobs.set(jobId, job);

  try {
    // Check stable Telegram key duplicate
    const tgKey = input.channelHandle && input.messageId
      ? `${input.channelHandle.replace(/^@/, "").toLowerCase()}:${input.messageId}`
      : null;
    if (tgKey && telegramMessageKeys.has(tgKey)) {
      job.status = "duplicate";
      job.progressPct = 100;
      job.sourceId = telegramMessageKeys.get(tgKey);
      job.warnings.push(`Duplicate Telegram message skipped (${tgKey}).`);
      job.updatedAt = new Date().toISOString();
      return job;
    }

    job.progressPct = 35;
    const extraction = await extractDocumentContent({
      buffer,
      fileName: job.fileName,
      mimeType: job.mimeType,
      preExtractedText: input.textContent,
    });
    job.progressPct = 70;
    job.ocrApplied = extraction.ocrApplied;
    job.ocrConfidence = extraction.ocrConfidence;
    job.needsHumanReview = extraction.needsHumanReview;
    job.warnings.push(...extraction.structure.warnings);

    const effectiveTitle = (input.title || extraction.structure.courtName || job.fileName).trim();
    const resolvedSourceType = mapCategoryToSourceType(input.category, input.sourceType);
    const resolvedJurisdiction: "federal" | "oromia" =
      input.jurisdiction === "oromia" || /oromia|oromiyaa|caffee/i.test(effectiveTitle + " " + (input.issuingInstitution || ""))
        ? "oromia"
        : "federal";

    const staged = await registerOrGetIngestedSource(db, {
      title: effectiveTitle,
      sourceType: resolvedSourceType,
      category: input.category,
      jurisdiction: resolvedJurisdiction,
      issuingInstitution:
        input.issuingInstitution?.trim() ||
        extraction.structure.courtName ||
        (resolvedJurisdiction === "oromia" ? "Oromia Regional Institution" : "FDRE Federal Institution"),
      courtName: input.courtName || extraction.structure.courtName,
      proclamationNumber: input.proclamationNumber,
      decisionNumber: input.caseNumber || extraction.structure.caseNumber,
      volume: input.volume,
      page: input.page || (extraction.pages.length > 0 ? `1-${extraction.pages.length}` : undefined),
      articleNumbers:
        input.articleNumbers && input.articleNumbers.length > 0
          ? input.articleNumbers
          : extraction.structure.relevantArticles,
      keywords: [...new Set([...(input.keywords || []), ...extraction.structure.legalIssues])],
      legalIssueSummary:
        input.legalSubject?.trim() ||
        extraction.structure.facts?.slice(0, 320) ||
        extraction.text.slice(0, 320) ||
        effectiveTitle,
      holdingOrRule:
        extraction.structure.holdingAndFinalOrder?.slice(0, 500) ||
        extraction.text.slice(0, 500) ||
        effectiveTitle,
      relevantText: extraction.text.slice(0, 120_000),
      language: input.language || "om",
      fileName: job.fileName,
      fileMimeType: job.mimeType,
      sha256Checksum: checksum,
      fileSizeBytes: buffer.length,
      dateGC: input.decisionDate || extraction.structure.decisionDate,
      originalDateTime: input.originalDateTime,
      importDate: now,
      officialSourceName: input.officialSourceName || (input.channelHandle ? `Telegram @${input.channelHandle.replace(/^@/, "")}` : undefined),
      officialSourceUrl: input.officialSourceUrl || input.telegramPostUrl,
      channelHandle: input.channelHandle,
      telegramPostUrl: input.telegramPostUrl,
      messageId: input.messageId,
      ocrApplied: extraction.ocrApplied,
      ocrConfidence: extraction.ocrConfidence,
      needsHumanReview: extraction.needsHumanReview,
      structuredExtraction: extraction.structure,
      verificationStatus: input.verificationStatus || (extraction.needsHumanReview ? "UNDER_REVIEW" : "UNVERIFIED"),
      isPublic: input.isPublic !== false,
      institutionId: input.institutionId,
      uploaderUid: input.uploaderUid,
      uploaderRole: input.uploaderRole,
      uploaderEmail: input.uploaderEmail,
    });

    if (staged.duplicate) {
      job.status = "duplicate";
      job.progressPct = 100;
      job.sourceId = staged.sourceId;
      job.warnings.push(staged.message || "Duplicate SHA-256 checksum detected.");
      job.updatedAt = new Date().toISOString();
      return job;
    }

    const storagePath = await persistBinaryOutOfFirestore(staged.sourceId, job.fileName, job.mimeType, buffer);
    if (staged.record) {
      staged.record.documentStoragePath = storagePath;
      const chunks = indexSourceChunks(staged.record, extraction.pages);
      job.chunkCount = chunks.length;
      job.indexVersion = currentIndexVersion;
    }

    if (tgKey) {
      telegramMessageKeys.set(tgKey, staged.sourceId);
    }

    job.sourceId = staged.sourceId;
    job.progressPct = 100;
    job.status = extraction.needsHumanReview ? "needs_review" : "completed";
    job.updatedAt = new Date().toISOString();

    if (db) {
      try {
        await db.collection("legal_ingestion_jobs").doc(jobId).set(job);
      } catch {
        // Offline / non-admin Firestore tolerated cleanly
      }
    }

    return job;
  } catch (err: any) {
    job.status = "failed";
    job.error = err?.message || String(err);
    job.updatedAt = new Date().toISOString();
    return job;
  }
}

export async function retryFailedIngestionJob(
  db: Firestore | null,
  jobId: string,
  caller: { uid: string; role: string; email?: string }
): Promise<IngestionJobRecord> {
  if (!isAuthorizedLegalEditor(caller.role, caller.email)) {
    throw new Error("UNAUTHORIZED: Caller lacks retry permission.");
  }
  const job = ingestionJobs.get(jobId);
  if (!job) {
    throw new Error(`NOT_FOUND: Ingestion job ${jobId} not found.`);
  }
  job.retries += 1;
  job.error = undefined;
  job.updatedAt = new Date().toISOString();

  if (job.sourceId) {
    const stored = rawBinaryFiles.get(job.sourceId);
    if (stored && fs.existsSync(stored.diskPath)) {
      const buf = fs.readFileSync(stored.diskPath);
      const extraction = await extractDocumentContent({
        buffer: buf,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
      });
      job.ocrApplied = extraction.ocrApplied;
      job.ocrConfidence = extraction.ocrConfidence;
      job.needsHumanReview = extraction.needsHumanReview;
      job.status = extraction.needsHumanReview ? "needs_review" : "completed";
      job.progressPct = 100;
      return job;
    }
  }
  job.status = "needs_review";
  job.warnings.push("Original file binary unavailable on disk for re-OCR; flagged for manual review.");
  return job;
}

/**
 * Parses and ingests Telegram Channel Exports (Desktop JSON or HTML export) (§2).
 * Records actual earliest/latest timestamps, chronological gaps, and unavailable media honestly.
 */
export async function ingestTelegramExport(
  db: Firestore | null,
  args: {
    channelHandle?: string;
    exportFormat: "json" | "html";
    content: string;
    institutionId?: string;
    isPublic?: boolean;
    uploaderUid: string;
    uploaderRole: string;
    uploaderEmail?: string;
  }
): Promise<{
  ok: boolean;
  jobs: IngestionJobRecord[];
  importedCount: number;
  duplicateCount: number;
  coverage: TelegramCoverageReport;
}> {
  if (!isAuthorizedLegalEditor(args.uploaderRole, args.uploaderEmail)) {
    throw new Error("UNAUTHORIZED: Caller lacks Telegram archive ingestion permission.");
  }

  interface ParsedTelegramRecord {
    messageId?: string;
    dateIso?: string;
    author?: string;
    text: string;
    fileName?: string;
    postUrl?: string;
    hasUnavailableMedia?: boolean;
  }

  const parsedRecords: ParsedTelegramRecord[] = [];
  let handle = (args.channelHandle || "").replace(/^@/, "").trim();
  const unavailableNotes: string[] = [];

  if (args.exportFormat === "json") {
    let data: any;
    try {
      data = JSON.parse(args.content);
    } catch {
      throw new Error("INVALID_JSON: Telegram JSON export could not be parsed.");
    }

    if (!handle && typeof data?.name === "string") {
      handle = data.name.trim().replace(/\s+/g, "_");
    }
    const messages = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : [];
    for (const msg of messages) {
      if (!msg || (msg.type && msg.type !== "message")) continue;
      const flatText = Array.isArray(msg.text)
        ? msg.text.map((part: any) => (typeof part === "string" ? part : part?.text || "")).join("")
        : String(msg.text || "");
      const titleText = msg.file || msg.title || "";
      const combined = `${titleText ? `[File: ${titleText}]\n` : ""}${flatText}`.trim();

      if (!combined && msg.media_type) {
        unavailableNotes.push(`Message ${msg.id || "unknown"} contains binary media (${msg.media_type}) not bundled inline in JSON export.`);
        continue;
      }
      if (!combined) continue;

      let dateIso: string | undefined;
      if (msg.date) {
        const d = new Date(msg.date);
        if (!Number.isNaN(d.getTime())) dateIso = d.toISOString();
      } else if (msg.date_unixtime) {
        const d = new Date(Number(msg.date_unixtime) * 1000);
        if (!Number.isNaN(d.getTime())) dateIso = d.toISOString();
      }

      const msgId = msg.id !== undefined ? String(msg.id) : undefined;
      // Only attach t.me link when we have an actual Telegram handle & numeric message ID (never fabricate!)
      const validHandle = handle && /^[a-zA-Z0-9_]{4,32}$/.test(handle) ? handle : undefined;
      const postUrl = validHandle && msgId && /^\d+$/.test(msgId)
        ? `https://t.me/${validHandle}/${msgId}`
        : undefined;

      parsedRecords.push({
        messageId: msgId,
        dateIso,
        author: typeof msg.from === "string" ? msg.from : undefined,
        text: combined,
        fileName: typeof msg.file === "string" ? msg.file : undefined,
        postUrl,
        hasUnavailableMedia: Boolean(msg.file && !msg.file_base64),
      });
    }
  } else {
    // HTML Telegram export parsing
    const blocks = args.content.split(/class="message\s/gi).slice(1);
    for (const block of blocks) {
      const idMatch = block.match(/id="message(\d+)"/i);
      const dateMatch = block.match(/title="([^"]+\d{4}[^"]*)"/i);
      const bodyMatch = block.match(/<div class="text">([\s\S]*?)<\/div>/i);
      const cleanBody = bodyMatch ? stripHtmlClean(bodyMatch[1]) : stripHtmlClean(block);
      if (!cleanBody || cleanBody.length < 10) continue;

      let dateIso: string | undefined;
      if (dateMatch?.[1]) {
        const normalized = dateMatch[1].replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1").split(" UTC")[0];
        const d = new Date(normalized);
        if (!Number.isNaN(d.getTime())) dateIso = d.toISOString();
      }
      const msgId = idMatch?.[1];
      const validHandle = handle && /^[a-zA-Z0-9_]{4,32}$/.test(handle) ? handle : undefined;
      parsedRecords.push({
        messageId: msgId,
        dateIso,
        text: cleanBody,
        postUrl: validHandle && msgId ? `https://t.me/${validHandle}/${msgId}` : undefined,
      });
    }
  }

  const jobs: IngestionJobRecord[] = [];
  let importedCount = 0;
  let duplicateCount = 0;

  for (let i = 0; i < parsedRecords.length; i++) {
    const rec = parsedRecords[i];
    if (rec.hasUnavailableMedia) {
      unavailableNotes.push(`Attachment "${rec.fileName}" referenced in message ${rec.messageId || i + 1} was not embedded; caption/metadata indexed only.`);
    }

    const firstLine = rec.text.split("\n")[0]?.trim() || "";
    const title = firstLine.length >= 8 && firstLine.length <= 140 ? firstLine : `Telegram Record ${rec.messageId || i + 1}`;
    const caseMatch = rec.text.match(/(?:Galmee(?:\s*Lakk\.?)?|File\s*No\.?|መዝገብ\s*ቁጥር)\s*[:#-]?\s*(\d{4,8})/i);
    const procMatch = rec.text.match(/(?:Labsii|Proclamation|አዋጅ)\s*(?:Lakk\.?|No\.?)?\s*(\d{2,4}\/\d{4})/i);

    const job = await ingestUploadedDocument(db, {
      title,
      category: caseMatch
        ? "Federal Supreme Court Cassation Decisions"
        : "Other verified legal materials",
      sourceType: caseMatch ? "cassation_decision" : procMatch ? "proclamation" : "other",
      jurisdiction: /oromia|oromiyaa|caffee|ኦሮሚያ/i.test(rec.text) ? "oromia" : "federal",
      issuingInstitution: rec.author || (handle ? `Telegram Channel @${handle}` : "Authorized Telegram Archive"),
      caseNumber: caseMatch?.[1],
      proclamationNumber: procMatch?.[1],
      decisionDate: rec.dateIso?.slice(0, 10),
      originalDateTime: rec.dateIso,
      messageId: rec.messageId,
      channelHandle: handle || "telegram_export",
      telegramPostUrl: rec.postUrl,
      officialSourceUrl: rec.postUrl,
      verificationStatus: "UNVERIFIED",
      isPublic: args.isPublic !== false,
      institutionId: args.institutionId,
      fileName: rec.fileName || `telegram_${handle || "export"}_${rec.messageId || i + 1}.txt`,
      mimeType: "text/plain",
      textContent: rec.text,
      uploaderUid: args.uploaderUid,
      uploaderRole: args.uploaderRole,
      uploaderEmail: args.uploaderEmail,
    });
    jobs.push(job);
    if (job.status === "duplicate") duplicateCount++;
    else if (job.status !== "failed") importedCount++;
  }

  // Honest coverage accounting (§2): compute real earliest, latest & chronological gaps
  const datedRecords = parsedRecords
    .map((r) => r.dateIso)
    .filter((d): d is string => Boolean(d))
    .sort();
  const earliestDate = datedRecords[0] || null;
  const latestDate = datedRecords[datedRecords.length - 1] || null;
  const missingPeriods: TelegramCoverageReport["missingPeriods"] = [];

  for (let i = 1; i < datedRecords.length; i++) {
    const prev = new Date(datedRecords[i - 1]).getTime();
    const curr = new Date(datedRecords[i]).getTime();
    const gapDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (gapDays > 30) {
      missingPeriods.push({
        from: datedRecords[i - 1],
        to: datedRecords[i],
        gapDays,
        note: `${gapDays}-day gap between exported records; older/deleted/non-exported messages in this interval are not verified as indexed.`,
      });
    }
  }

  const coverage: TelegramCoverageReport = {
    channelHandle: handle || "telegram_export",
    earliestDate,
    latestDate,
    recordCount: parsedRecords.length,
    missingPeriods,
    unavailableNotes: [...new Set(unavailableNotes)].slice(0, 50),
    incomplete: parsedRecords.length === 0 || missingPeriods.length > 0 || unavailableNotes.length > 0,
    lastUpdatedAt: new Date().toISOString(),
  };
  coverageLedger.set(coverage.channelHandle, coverage);

  return {
    ok: true,
    jobs,
    importedCount,
    duplicateCount,
    coverage,
  };
}
