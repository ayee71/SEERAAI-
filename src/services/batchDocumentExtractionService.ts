import { generateLegalContent } from './api';
import { saveDocument, SavedLegalDocument } from './storage';
import { Language } from '../i18n/translations';
import { utf8ToBase64 } from '../utils/encoding';

export interface CategorizedDocumentItem {
  id: string;
  fileName: string;
  fileSizeFormatted: string;
  mimeType: string;
  fileBase64?: string;
  extractedText: string;
  caseName: string;
  referenceNumber: string;
  extractedDate: string;
  docType: string;
  courtName: string;
  summary: string;
  tags: string[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Reads a single file as text or Base64 data string
 */
export async function readFileAsTextOrBase64(file: File): Promise<{ text: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string || '';
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        resolve({ text: result, base64: utf8ToBase64(result) });
      } else {
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve({ text: `[File Content from ${file.name}]`, base64 });
      }
    };
    reader.onerror = (err) => reject(err);

    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
}

/**
 * AI Entity Extraction for a court document file
 */
export async function extractEntitiesFromDocument(
  fileName: string,
  rawText: string,
  currentLang: Language = 'om'
): Promise<{
  caseName: string;
  referenceNumber: string;
  extractedDate: string;
  docType: string;
  courtName: string;
  summary: string;
  tags: string[];
}> {
  const prompt = `Analyze this legal court document file "${fileName}". Extract the structured legal entities in JSON format.
Content snippet/text:
${rawText.slice(0, 3000)}

Strict Requirement: Return ONLY a valid JSON object without markdown fences, with these exact keys:
{
  "caseName": "Extracted case name or parties involved (e.g. 'Malkaa Toluu vs Obbo Guddataa' or 'Prosecutor vs Gemechu')",
  "referenceNumber": "File or Case Number if found (e.g. '154211/2016')",
  "extractedDate": "Date mentioned in doc (e.g. '24/02/2016 E.C.' or '2024-05-12')",
  "docType": "Document type (e.g. 'Himannaa / Statement of Claim', 'Waamicha / Summons', 'Murtii / Verdict', 'Ol-iyyannoo / Appeal', 'Waliigaltee / Contract', 'Aangoo Abukaattummaa / Power of Attorney')",
  "courtName": "Court name if present (e.g. 'Mana Murtii Waliigalaa Oromiyaa' or 'Federal High Court')",
  "summary": "Concise 1-2 sentence executive summary of the document",
  "tags": ["Tag1", "Tag2"]
}`;

  try {
    const res = await generateLegalContent({
      prompt,
      taskType: 'explain_law',
      outputLanguages: [currentLang],
      modelTier: 'gemini-flash-lite-latest',
    });

    const jsonText = res.content
      ? res.content.replace(/```json/g, '').replace(/```/g, '').trim()
      : '';

    const parsed = JSON.parse(jsonText);
    return {
      caseName: parsed.caseName || 'Galmee Court File',
      referenceNumber: parsed.referenceNumber || 'N/A',
      extractedDate: parsed.extractedDate || new Date().toISOString().split('T')[0],
      docType: parsed.docType || 'Sanada Seeraa / Court Doc',
      courtName: parsed.courtName || 'Mana Murtii',
      summary: parsed.summary || 'Sanada seeraa olkaa\'ame.',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Batch Processed'],
    };
  } catch (e) {
    console.warn('AI entity extraction fallback for:', fileName, e);
    // Local fallback rules
    const nameLower = fileName.toLowerCase();
    let guessedType = 'Sanada Seeraa / Legal Document';
    if (nameLower.includes('claim') || nameLower.includes('himannaa')) guessedType = 'Himannaa (Statement of Claim)';
    else if (nameLower.includes('summons') || nameLower.includes('waamicha')) guessedType = 'Waamicha (Court Summons)';
    else if (nameLower.includes('verdict') || nameLower.includes('murtii')) guessedType = 'Murtii (Court Verdict)';
    else if (nameLower.includes('contract') || nameLower.includes('waliigaltee')) guessedType = 'Waliigaltee (Contract)';
    else if (nameLower.includes('appeal') || nameLower.includes('ol-iyyannoo')) guessedType = 'Ol-iyyannoo (Appeal)';

    return {
      caseName: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      referenceNumber: 'N/A',
      extractedDate: new Date().toISOString().split('T')[0],
      docType: guessedType,
      courtName: 'Mana Murtii / Court',
      summary: `Sanada seeraa "${fileName}" olkaa'ame.`,
      tags: ['Batch Upload'],
    };
  }
}

/**
 * Processes multiple files simultaneously in batch
 */
export async function processBatchCourtFiles(
  files: File[],
  currentLang: Language,
  onProgress?: (index: number, total: number, item: CategorizedDocumentItem) => void
): Promise<CategorizedDocumentItem[]> {
  const results: CategorizedDocumentItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const initialItem: CategorizedDocumentItem = {
      id: `batch_doc_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      fileName: file.name,
      fileSizeFormatted: formatFileSize(file.size),
      mimeType: file.type || 'application/pdf',
      extractedText: '',
      caseName: 'Processing...',
      referenceNumber: '...',
      extractedDate: '...',
      docType: 'Analyzing...',
      courtName: '...',
      summary: 'AI is extracting legal entities...',
      tags: ['Batch'],
      status: 'processing',
    };

    if (onProgress) onProgress(i, files.length, initialItem);

    try {
      const { text, base64 } = await readFileAsTextOrBase64(file);
      initialItem.fileBase64 = base64;
      initialItem.extractedText = text;

      const entities = await extractEntitiesFromDocument(file.name, text || file.name, currentLang);

      initialItem.caseName = entities.caseName;
      initialItem.referenceNumber = entities.referenceNumber;
      initialItem.extractedDate = entities.extractedDate;
      initialItem.docType = entities.docType;
      initialItem.courtName = entities.courtName;
      initialItem.summary = entities.summary;
      initialItem.tags = entities.tags;
      initialItem.status = 'completed';
    } catch (err: any) {
      initialItem.status = 'error';
      initialItem.errorMessage = err.message || 'Processing failed';
    }

    results.push(initialItem);
    if (onProgress) onProgress(i + 1, files.length, initialItem);
  }

  return results;
}

/**
 * Saves all categorized batch items directly to SavedLegalDocument storage
 */
export async function saveCategorizedBatchDocuments(
  items: CategorizedDocumentItem[]
): Promise<SavedLegalDocument[]> {
  const savedList: SavedLegalDocument[] = [];

  for (const item of items) {
    if (item.status === 'completed') {
      const savedDoc = saveDocument({
        title: `${item.docType}: ${item.caseName}`,
        taskType: 'general',
        prompt: `Batch Upload: ${item.fileName} | Case: ${item.caseName}`,
        outputLanguages: ['om'],
        content: `━━━━━━━━━━━━━━━━━━━━
SANADA SEERAA BATCH UPLOAD
━━━━━━━━━━━━━━━━━━━━
📄 Sanada: ${item.fileName}
🏛️ Mana Murtii: ${item.courtName}
⚖️ Dhimma/Case Name: ${item.caseName}
🔢 Lakk. Galmee: ${item.referenceNumber}
📅 Guyyaa: ${item.extractedDate}
📌 Gosa Sanadaa: ${item.docType}

GUDUNFAA / SUMMARY:
${item.summary}

BARREEFFAMA GUUTUU:
${item.extractedText || 'Sanada PDF/Image olkaa\'ame.'}`,
        tags: [...item.tags, item.docType, item.caseName, 'Batch Upload'],
        caseName: item.caseName,
        extractedDate: item.extractedDate,
        docType: item.docType,
      });

      savedList.push(savedDoc);
    }
  }

  return savedList;
}
