# SeeraAI – Legal Decisions Library (backend module)

This is an additive TypeScript backend module for importing, storing, revising, and searching legal decisions. It is not a replacement for the existing SeeraAI application or Firebase project.

## What it does

- Stores original PDF/DOC/DOCX files in a **private Cloud Storage bucket**.
- Stores extracted text in Cloud Storage and bounded text chunks in Firestore (not the complete PDF/Word bytes in Firestore).
- Deduplicates exact file content using SHA-256.
- Preserves Telegram provenance (chat, message, file and sender identifiers).
- Imports Telegram files only from an allow-listed sender.
- Saves edits as immutable numbered revisions; it never overwrites the source decision.
- Provides a review/approval function with a reviewer UID, role, note, timestamp, and audit history.
- Sends text and metadata to the existing search/vector index through an injected `indexLegalContent` adapter.
- Provides an async legal-answer pipeline that excludes unverified imported sources from authoritative citations.

## Dependencies

Use the same versions already pinned in the SeeraAI backend where possible:

```bash
npm install firebase-admin @google-cloud/storage
npm install -D typescript @types/node
```

The Telegram module uses the Node.js built-in `fetch`, available in supported modern Node.js releases. Use the Node version already selected by the SeeraAI backend.

## Firebase initialization

Pass the existing Admin SDK instances into the functions. Do not create a new Firebase project or change the current project ID.

```ts
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { LegalContentDependencies } from './legal-content/types.js';

const legalContentDependencies: LegalContentDependencies = {
  db: getFirestore(),
  bucket: getStorage().bucket(),
  maxFileBytes: 25 * 1024 * 1024,
  indexLegalContent: async ({ id, title, text, metadata }) => {
    // TODO: call the existing SeeraAI search/vector-index service here.
    // Do not use localStorage or saveLocalRepository() in backend code.
    await existingLegalSearchIndexer.upsert({ id, title, text, metadata });
  },
};
```

`existingLegalSearchIndexer` is an integration point, not a variable supplied by this module. Replace it with the actual search service already used by SeeraAI. If the app does not yet have a server-side indexer, leave `indexLegalContent` out until it is implemented; documents will still be stored, and Firestore `textChunks` will be available for building the index.

## Telegram import integration

Add a document handler to the existing Telegraf bot. Do not create a second bot unless that is your intended architecture.

```ts
import { importTelegramLegalDocument } from './legal-content/telegram.service.js';

bot.on('document', async (ctx) => {
  const document = ctx.message.document;
  const senderId = String(ctx.from.id);

  const result = await importTelegramLegalDocument({
    descriptor: document,
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    senderId,
    allowedTelegramUserIds: (process.env.LEGAL_TELEGRAM_ALLOWED_USERS ?? '')
      .split(',').map((value) => value.trim()).filter(Boolean),
    chatId: ctx.chat.id,
    messageId: ctx.message.message_id,
    caption: ctx.message.caption,
    uploadedBy: `telegram:${senderId}`,
    extractText: async (buffer, fileName, mimeType) => {
      // Connect your existing PDF/DOC/DOCX text extractor here.
      // For scanned PDFs, run OCR and return the extracted text.
      return await extractLegalText(buffer, fileName, mimeType);
    },
    dependencies: legalContentDependencies,
  });

  await ctx.reply(result.message);
});
```

Environment variables:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
LEGAL_TELEGRAM_ALLOWED_USERS=123456789,987654321
```

Never put the bot token in frontend code, source control, or client-visible configuration. Telegram's standard hosted Bot API currently permits downloads up to 20 MB; this module uses that cap even though the general upload validation default is 25 MB.

## Browser upload integration

The browser must send the selected file to an authenticated backend endpoint using multipart/form-data. The backend must:

1. Verify Firebase ID token.
2. Check the user's institution and role (RBAC) before accepting a legal document.
3. Check allowed MIME type, extension, file signature, and file-size limits.
4. Extract text server-side, using OCR for scanned PDFs.
5. Call `storeTelegramLegalContentInFirestore()` (the name is retained for compatibility, but it can store uploads from other sources too) with `source.kind = 'upload'`.

Do not trust a `uploadedBy`, `reviewStatus`, `institutionId`, or role value sent by the browser. Derive the user identity and permissions from the verified Firebase token and server-side authorization records.

## Reviewing / approving a stored decision

Use `setLegalDocumentReviewStatus()` after your existing Firebase Auth and institution-RBAC middleware has verified the reviewer. The function accepts only `admin`, `judge`, or `legal_expert` roles, logs each review action, and re-indexes verified content. Do not take the role or UID directly from the client request. Adapt the allowed roles to the permissions in the existing SeeraAI policy.

```ts
import { setLegalDocumentReviewStatus } from './legal-content/review.service.js';

const result = await setLegalDocumentReviewStatus({
  documentId,
  status: 'verified', // or 'rejected'
  reviewer: { uid: authenticatedUser.uid, role: authenticatedUser.role },
  reviewNote: 'Madda murtii fi lakkoofsa galmee sakatta'eera.',
}, legalContentDependencies);
```

## Editing a stored decision

Call `saveLegalDocumentRevision()` only after server-side authorization. Require a reviewer/editor role, record the actual Firebase UID, and keep a meaningful change note. The first imported file stays at `originalStoragePath`; edits go under `versions/vN/`.

A new revision is not automatically an authoritative court decision. Keep review status controlled by an authorized person and preserve the provenance of the original source.

## Connecting the answer engine

```ts
import { synthesizeAuthoritativeLegalAnswer } from './legal-content/legal-engine.service.js';

const result = await synthesizeAuthoritativeLegalAnswer(
  { fullQuery: userQuestion, userId: authenticatedUid },
  {
    detectTopicAndCollectSources: async (query) => {
      // Adapt the current SeeraAI detector and database/search retrieval here.
      return await detectTopicAndCollectSources(query);
    },
    buildOromoContent: async (query, context) => {
      // Build the existing OpenAI/Gemini prompt from the verified context only.
      // The prompt must instruct the model not to invent laws, article numbers,
      // cassation file numbers, volume numbers, years, page numbers or quotations.
      return await buildOromoContent(query, context);
    },
  },
);
```

The `LegalSource` objects returned by the retrieval adapter must set `reviewStatus` accurately. Documents imported from Telegram default to `pending_review`; use the review function above before promoting a document to `verified`. Only `verified` materials become citations and are supplied to the answer generator. `pending_review` Telegram imports are excluded until an authorized reviewer verifies them.

## Required security and production work

- Keep the current Firebase project and existing RBAC model; do not replace existing Firestore or Storage rules blindly.
- Cloud Storage objects must remain private. Do not call `makePublic()` or create permanent public download URLs for court files.
- Restrict backend endpoints by Firebase Auth, institution, and role. Add audit logs for upload, read, edit, approve, reject, export, and delete.
- Malware-scan files and validate file signatures before production use.
- Add a review/approval workflow before a Telegram import can be treated as an authoritative cassation decision.
- Configure retention, backup, and access policies suitable for judicial records.
- Firestore is not a full-text search engine. Connect `indexLegalContent` to the existing server-side search/vector provider for reliable semantic retrieval.

## Firestore collections created

```text
legalDocuments/{sha256}
  textChunks/{chunkNumber}
  versions/{versionId}
```

The metadata document points to private Cloud Storage paths. It does not contain the full file bytes or the entire extracted text.
