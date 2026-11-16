import path from 'node:path';
import type {
  LegalContentDependencies,
  LegalFileMime,
  ParsedTelegramLegalContent,
  TelegramDocumentDescriptor,
  TelegramDownloadResult,
} from './types.js';
import { storeTelegramLegalContentInFirestore } from './legal-content.service.js';

const TELEGRAM_BOT_API_MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

function mimeFromNameAndHeader(fileName: string, headerMime?: string): LegalFileMime {
  const extension = path.extname(fileName).toLowerCase();
  const known: Record<string, LegalFileMime> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  const expected = known[extension];
  if (!expected) throw new Error('Telegram irraa PDF, DOC ykn DOCX qofatu fudhatama.');
  if (headerMime && headerMime !== 'application/octet-stream' && headerMime !== expected) {
    throw new Error('MIME type faayilaa maqaa faayilaa waliin hin walsimu.');
  }
  return expected;
}

async function telegramApi<T>(token: string, method: string, body?: object): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Telegram API request failed (${response.status}).`);
  const result = await response.json() as { ok: boolean; result?: T; description?: string };
  if (!result.ok || !result.result) throw new Error(result.description ?? 'Telegram API faayila hin kennine.');
  return result.result;
}

/** Download a Telegram document using getFile. Standard hosted Bot API currently limits downloads to 20 MB. */
export async function downloadTelegramDocument(
  descriptor: TelegramDocumentDescriptor,
  botToken: string,
  maxBytes = TELEGRAM_BOT_API_MAX_DOWNLOAD_BYTES,
): Promise<TelegramDownloadResult> {
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN hin argamne.');
  if (!descriptor.file_id) throw new Error('Telegram file_id hin jiru.');
  if (descriptor.file_size && descriptor.file_size > maxBytes) {
    throw new Error(`Faayilli Telegram daangaa ${Math.floor(maxBytes / 1024 / 1024)} MB caaleera.`);
  }

  const telegramFile = await telegramApi<{ file_path?: string; file_size?: number }>(
    botToken,
    'getFile',
    { file_id: descriptor.file_id },
  );
  if (!telegramFile.file_path) throw new Error('Telegram file_path hin kennine.');
  if (telegramFile.file_size && telegramFile.file_size > maxBytes) {
    throw new Error(`Faayilli Telegram daangaa ${Math.floor(maxBytes / 1024 / 1024)} MB caaleera.`);
  }

  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${telegramFile.file_path}`;
  const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Telegram file download failed (${response.status}).`);
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > maxBytes) throw new Error('Hammi faayilaa daangaa hayyamame caaleera.');

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length || buffer.length > maxBytes) throw new Error('Faayilli duwwaa ykn daangaa ol taʼe.');

  const fileName = descriptor.file_name || path.basename(telegramFile.file_path) || 'telegram-document.pdf';
  return {
    buffer,
    fileName,
    mimeType: mimeFromNameAndHeader(fileName, descriptor.mime_type),
    fileId: descriptor.file_id,
    fileUniqueId: descriptor.file_unique_id,
    fileSize: buffer.length,
  };
}

/**
 * Call this only after checking that the Telegram sender is allowed to import files.
 * extractText must use the app's PDF/DOC/DOCX parser and OCR fallback for scanned PDFs.
 */
export async function importTelegramLegalDocument(args: {
  descriptor: TelegramDocumentDescriptor;
  botToken: string;
  senderId: string;
  allowedTelegramUserIds: string[];
  chatId?: string | number;
  messageId?: number;
  caption?: string;
  uploadedBy: string;
  extractText: (buffer: Buffer, fileName: string, mimeType: LegalFileMime) => Promise<string>;
  dependencies: LegalContentDependencies;
}): Promise<Awaited<ReturnType<typeof storeTelegramLegalContentInFirestore>>> {
  if (!args.allowedTelegramUserIds.includes(args.senderId)) {
    throw new Error('Fayyadamaan Telegram kun faayila galchuuf eeyyama hin qabu.');
  }

  const downloaded = await downloadTelegramDocument(args.descriptor, args.botToken);
  const extractedText = await args.extractText(downloaded.buffer, downloaded.fileName, downloaded.mimeType);
  const parsed: ParsedTelegramLegalContent = {
    title: args.caption?.trim() || path.parse(downloaded.fileName).name,
    fileName: downloaded.fileName,
    mimeType: downloaded.mimeType,
    fileBuffer: downloaded.buffer,
    extractedText,
    source: {
      kind: 'telegram',
      label: 'Telegram document',
      telegramChatId: args.chatId === undefined ? undefined : String(args.chatId),
      telegramMessageId: args.messageId,
      telegramFileId: downloaded.fileId,
      telegramFileUniqueId: downloaded.fileUniqueId,
      senderId: args.senderId,
    },
    uploadedBy: args.uploadedBy,
    reviewStatus: 'pending_review',
  };

  return storeTelegramLegalContentInFirestore(parsed, args.dependencies);
}
