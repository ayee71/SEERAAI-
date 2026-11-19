import { Router, Request, Response } from "express";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { getSafeAdminAuth, getSafeAdminFirestore } from "../firebase-admin-config";
import { answerLegalQuestion } from "./legalAnswerService";
import { searchLegalSources } from "./legalSearch";
import {
  stageLegalSource,
  reviewLegalSource,
  listWorkflowLegalSources,
  updateLegalSourceMetadata,
  getLegalSourceById,
  isAuthorizedLegalEditor,
} from "./legalSourceWorkflowService";
import {
  ingestUploadedDocument,
  ingestTelegramExport,
  retryFailedIngestionJob,
  listIngestionJobs,
  getCoverageLedger,
  getIndexedChunksForSource,
  getStoredOriginalFilePath,
} from "./documentIngestionPipeline";
import type {
  LegalAnswerRequest,
  LegalDocumentCategory,
  LegalJurisdiction,
  LegalLanguage,
  LegalSearchRequest,
  ResearchMode,
} from "./legalTypes";

const router = Router();

const ALLOWED_LANGUAGES = new Set(["om", "am", "en"]);
const ALLOWED_JURISDICTIONS = new Set(["federal", "oromia", "both", "unknown"]);
const ALLOWED_MODES = new Set(["fast", "deep"]);

function parseRequest(body: unknown): LegalAnswerRequest | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;

  if (typeof value.question !== "string") return null;

  const language =
    typeof value.language === "string" && ALLOWED_LANGUAGES.has(value.language)
      ? (value.language as LegalLanguage)
      : undefined;

  const jurisdiction =
    typeof value.jurisdiction === "string" && ALLOWED_JURISDICTIONS.has(value.jurisdiction)
      ? (value.jurisdiction as LegalJurisdiction)
      : undefined;

  const mode =
    typeof value.mode === "string" && ALLOWED_MODES.has(value.mode)
      ? (value.mode as ResearchMode)
      : undefined;

  return {
    question: value.question,
    language,
    jurisdiction,
    mode,
    relevantDate: typeof value.relevantDate === "string" ? value.relevantDate : undefined,
    facts: typeof value.facts === "string" ? value.facts : undefined,
    includeUnverifiedWarnings: Boolean(value.includeUnverifiedWarnings),
  };
}

async function resolveOptionalCallerIdentity(req: Request): Promise<{
  uid: string;
  institutionId?: string;
  role?: string;
  email?: string;
}> {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return { uid: "guest" };

  try {
    const decoded = await getSafeAdminAuth().verifyIdToken(match[1].trim());
    return {
      uid: decoded.uid,
      institutionId: typeof decoded.institutionId === "string" ? decoded.institutionId : undefined,
      role: typeof decoded.role === "string" ? decoded.role : typeof decoded.courtRole === "string" ? decoded.courtRole : undefined,
      email: typeof decoded.email === "string" ? decoded.email.toLowerCase() : undefined,
    };
  } catch {
    return { uid: "guest" };
  }
}

async function authenticateLegalEditorRequest(req: Request): Promise<
  | { ok: true; uid: string; email: string; role: string; institutionId?: string }
  | { ok: false; status: number; error: string; message: string }
> {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      ok: false,
      status: 401,
      error: "UNAUTHENTICATED",
      message: "Authentication Bearer token is required.",
    };
  }

  let decoded: any;
  try {
    decoded = await getSafeAdminAuth().verifyIdToken(match[1].trim());
  } catch {
    return {
      ok: false,
      status: 401,
      error: "INVALID_TOKEN",
      message: "Invalid or expired Firebase ID token.",
    };
  }

  if (decoded.firebase?.sign_in_provider === "anonymous" || decoded.email_verified !== true) {
    return {
      ok: false,
      status: 403,
      error: "EMAIL_NOT_VERIFIED",
      message: "Verified non-anonymous Firebase account is required.",
    };
  }

  const email = String(decoded.email || "").toLowerCase();
  let role = String(decoded.role || decoded.courtRole || (decoded.admin === true ? "admin" : ""));
  let institutionId = typeof decoded.institutionId === "string" ? decoded.institutionId : undefined;

  const db = getSafeAdminFirestore();
  if ((!role || !institutionId) && db) {
    try {
      const courtUserSnap = await db.collection("court_users").doc(decoded.uid).get();
      if (courtUserSnap.exists && courtUserSnap.data()?.status === "active") {
        if (!role) role = String(courtUserSnap.data()?.role || "");
        if (!institutionId && typeof courtUserSnap.data()?.institutionId === "string") {
          institutionId = courtUserSnap.data()?.institutionId;
        }
      }
    } catch {
      // Fallback to verified claims only
    }
  }

  if (!isAuthorizedLegalEditor(role, email)) {
    return {
      ok: false,
      status: 403,
      error: "PERMISSION_DENIED",
      message: "Only authorized legal repository editors and administrators may modify legal sources.",
    };
  }

  return { ok: true, uid: decoded.uid, email, role: role || "admin", institutionId };
}

router.post("/ask", async (req: Request, res: Response) => {
  const requestId = randomUUID();

  try {
    const caller = await resolveOptionalCallerIdentity(req);
    const parsed = parseRequest(req.body);
    if (!parsed) {
      return res.status(400).json({ ok: false, error: "INVALID_REQUEST", requestId });
    }

    if (parsed.question.trim().length < 4) {
      return res.status(400).json({ ok: false, error: "QUESTION_TOO_SHORT", requestId });
    }

    const db = getSafeAdminFirestore();
    const result = await answerLegalQuestion(
      db,
      { ...parsed, callerInstitutionId: caller.institutionId },
      requestId
    );

    if (db) {
      try {
        await db.collection("legal_ai_audit").add({
          requestId,
          uid: caller.uid,
          mode: result.mode || "deep",
          language: result.language,
          jurisdiction: result.jurisdiction,
          verification: result.verification,
          sourceIds: result.citations.map((item) => item.sourceId),
          latencyMs: result.latencyMs,
          createdAt: new Date().toISOString(),
        });
      } catch {
        console.error("[SEERAAI audit write failed]", requestId);
      }
    }

    return res.status(result.ok ? 200 : 503).json(result);
  } catch (error) {
    console.error("[SEERAAI route error]", {
      requestId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return res.status(500).json({ ok: false, error: "LEGAL_ANSWER_FAILED", requestId });
  }
});

router.post("/search", async (req: Request, res: Response) => {
  const requestId = randomUUID();
  try {
    const caller = await resolveOptionalCallerIdentity(req);
    const body = req.body as Partial<LegalSearchRequest>;

    if (
      !body.query &&
      !body.topics?.length &&
      !body.caseNumber &&
      !body.legalArticle &&
      !body.court &&
      !body.keyword
    ) {
      return res.status(400).json({ ok: false, error: "QUERY_REQUIRED", requestId });
    }

    const db = getSafeAdminFirestore();
    const result = await searchLegalSources(db, {
      query: body.query || "",
      languages: body.languages,
      jurisdiction: body.jurisdiction,
      dateRange: body.dateRange,
      topics: body.topics,
      sourceTypes: body.sourceTypes,
      category: body.category as LegalDocumentCategory | undefined,
      caseNumber: body.caseNumber,
      legalArticle: body.legalArticle,
      court: body.court,
      keyword: body.keyword,
      verificationFilter: body.verificationFilter,
      mode: body.mode,
      includeTelegramArchive: body.includeTelegramArchive,
      callerInstitutionId: caller.institutionId,
      maxResults: body.maxResults || 20,
    });

    return res.status(result.ok ? 200 : 500).json(result);
  } catch (error) {
    console.error("[SEERAAI search route error]", error);
    return res.status(500).json({ ok: false, error: "SEARCH_FAILED", requestId });
  }
});

router.get("/sources", async (req: Request, res: Response) => {
  try {
    const db = getSafeAdminFirestore();
    const requestedStatus = req.query.status as any;
    let effectiveStatus: any = "PUBLISHED";
    let callerInstitutionId: string | undefined;

    if (requestedStatus && requestedStatus !== "PUBLISHED" && requestedStatus !== "VERIFIED") {
      const editorCheck = await authenticateLegalEditorRequest(req);
      if (!editorCheck.ok) {
        return res.status(editorCheck.status).json({
          ok: false,
          error: editorCheck.error,
          message: editorCheck.message,
        });
      }
      effectiveStatus = requestedStatus;
      callerInstitutionId = editorCheck.institutionId;
    } else {
      const caller = await resolveOptionalCallerIdentity(req);
      callerInstitutionId = caller.institutionId;
      if (requestedStatus) effectiveStatus = requestedStatus;
    }

    const sources = await listWorkflowLegalSources(db, {
      status: effectiveStatus,
      jurisdiction: req.query.jurisdiction as any,
      sourceType: req.query.sourceType as any,
      category: req.query.category as any,
      searchTerm: req.query.search as string,
      callerInstitutionId,
    });
    return res.json({ ok: true, count: sources.length, sources });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/sources/upload", async (req: Request, res: Response) => {
  try {
    const editorCheck = await authenticateLegalEditorRequest(req);
    if (!editorCheck.ok) {
      return res.status(editorCheck.status).json({
        ok: false,
        error: editorCheck.error,
        message: editorCheck.message,
      });
    }

    const db = getSafeAdminFirestore();
    const result = await stageLegalSource(db, {
      ...req.body,
      institutionId: req.body?.isPublic === false ? editorCheck.institutionId || req.body?.institutionId : undefined,
      uploaderUid: editorCheck.uid,
      uploaderRole: editorCheck.role,
      uploaderEmail: editorCheck.email,
    });

    return res.status(result.ok ? 201 : 400).json(result);
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.post("/sources/:id/review", async (req: Request, res: Response) => {
  try {
    const editorCheck = await authenticateLegalEditorRequest(req);
    if (!editorCheck.ok) {
      return res.status(editorCheck.status).json({
        ok: false,
        error: editorCheck.error,
        message: editorCheck.message,
      });
    }

    const db = getSafeAdminFirestore();
    const result = await reviewLegalSource(db, {
      sourceId: req.params.id,
      action: req.body.action,
      reviewerUid: editorCheck.uid,
      reviewerRole: editorCheck.role,
      reviewerEmail: editorCheck.email,
      reviewNotes: req.body.reviewNotes,
      enforceTwoPersonReview: true,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.patch("/sources/:id", async (req: Request, res: Response) => {
  try {
    const editorCheck = await authenticateLegalEditorRequest(req);
    if (!editorCheck.ok) {
      return res.status(editorCheck.status).json({
        ok: false,
        error: editorCheck.error,
        message: editorCheck.message,
      });
    }

    const db = getSafeAdminFirestore();
    const result = await updateLegalSourceMetadata(db, {
      sourceId: req.params.id,
      ...req.body,
      editorUid: editorCheck.uid,
      editorRole: editorCheck.role,
      editorEmail: editorCheck.email,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.post("/sources/:id/archive", async (req: Request, res: Response) => {
  try {
    const editorCheck = await authenticateLegalEditorRequest(req);
    if (!editorCheck.ok) {
      return res.status(editorCheck.status).json({
        ok: false,
        error: editorCheck.error,
        message: editorCheck.message,
      });
    }

    const db = getSafeAdminFirestore();
    const result = await reviewLegalSource(db, {
      sourceId: req.params.id,
      action: "ARCHIVE",
      reviewerUid: editorCheck.uid,
      reviewerRole: editorCheck.role,
      reviewerEmail: editorCheck.email,
      reviewNotes: req.body?.reason || "Archived by authorized administrator.",
      enforceTwoPersonReview: false,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.get("/sources/:id/content", async (req: Request, res: Response) => {
  try {
    const caller = await resolveOptionalCallerIdentity(req);
    const db = getSafeAdminFirestore();
    const source = await getLegalSourceById(db, req.params.id);

    if (!source) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Legal source not found." });
    }

    if (source.isPublic === false || source.institutionId) {
      if (!caller.institutionId || caller.institutionId !== source.institutionId) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Institutional confidentiality restriction." });
      }
    }

    const chunks = getIndexedChunksForSource(source.id);
    const fileInfo = getStoredOriginalFilePath(source.id);

    if (req.query.download === "1" && fileInfo && fs.existsSync(fileInfo.diskPath)) {
      res.setHeader("Content-Type", fileInfo.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${fileInfo.fileName}"`);
      return res.sendFile(fileInfo.diskPath);
    }

    return res.json({
      ok: true,
      source,
      chunks: chunks.map((c) => ({
        chunkId: c.chunkId,
        pageNumber: c.pageNumber,
        sectionIndex: c.sectionIndex,
        text: c.text,
      })),
      hasOriginalBinary: Boolean(fileInfo && fs.existsSync(fileInfo.diskPath)),
      downloadUrl: fileInfo ? `/api/legal/sources/${source.id}/content?download=1` : source.officialSourceUrl || source.telegramPostUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Multi-file & single-file ingestion pipeline endpoint (§3, §4, §14)
router.post("/ingestion/upload", async (req: Request, res: Response) => {
  try {
    const editorCheck = await authenticateLegalEditorRequest(req);
    if (!editorCheck.ok) {
      return res.status(editorCheck.status).json({
        ok: false,
        error: editorCheck.error,
        message: editorCheck.message,
      });
    }

    const db = getSafeAdminFirestore();
    const filesInput = Array.isArray(req.body?.files) ? req.body.files : [req.body];
    if (!filesInput || filesInput.length === 0) {
      return res.status(400).json({ ok: false, error: "NO_FILES_SUPPLIED" });
    }

    const jobs = [];
    for (const item of filesInput.slice(0, 20)) {
      const job = await ingestUploadedDocument(db, {
        ...item,
        institutionId: item?.isPublic === false ? editorCheck.institutionId || item?.institutionId : undefined,
        uploaderUid: editorCheck.uid,
        uploaderRole: editorCheck.role,
        uploaderEmail: editorCheck.email,
      });
      jobs.push(job);
    }

    return res.status(201).json({ ok: true, jobs });
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

// Telegram channel JSON/HTML export ingestion endpoint (§2)
router.post("/ingestion/telegram-export", async (req: Request, res: Response) => {
  try {
    const editorCheck = await authenticateLegalEditorRequest(req);
    if (!editorCheck.ok) {
      return res.status(editorCheck.status).json({
        ok: false,
        error: editorCheck.error,
        message: editorCheck.message,
      });
    }

    const { channelHandle, exportFormat = "json", content, isPublic = true } = req.body || {};
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ ok: false, error: "EXPORT_CONTENT_REQUIRED" });
    }

    const db = getSafeAdminFirestore();
    const result = await ingestTelegramExport(db, {
      channelHandle,
      exportFormat: exportFormat === "html" ? "html" : "json",
      content,
      isPublic: Boolean(isPublic),
      institutionId: isPublic ? undefined : editorCheck.institutionId,
      uploaderUid: editorCheck.uid,
      uploaderRole: editorCheck.role,
      uploaderEmail: editorCheck.email,
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.get("/ingestion/jobs", async (req: Request, res: Response) => {
  const editorCheck = await authenticateLegalEditorRequest(req);
  if (!editorCheck.ok) {
    return res.status(editorCheck.status).json({
      ok: false,
      error: editorCheck.error,
      message: editorCheck.message,
    });
  }
  return res.json({
    ok: true,
    jobs: listIngestionJobs(),
    coverage: getCoverageLedger(),
  });
});

router.post("/ingestion/jobs/:jobId/retry", async (req: Request, res: Response) => {
  try {
    const editorCheck = await authenticateLegalEditorRequest(req);
    if (!editorCheck.ok) {
      return res.status(editorCheck.status).json({
        ok: false,
        error: editorCheck.error,
        message: editorCheck.message,
      });
    }
    const db = getSafeAdminFirestore();
    const job = await retryFailedIngestionJob(db, req.params.jobId, {
      uid: editorCheck.uid,
      role: editorCheck.role,
      email: editorCheck.email,
    });
    return res.json({ ok: true, job });
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.get("/ingestion/coverage", async (req: Request, res: Response) => {
  const editorCheck = await authenticateLegalEditorRequest(req);
  if (!editorCheck.ok) {
    return res.status(editorCheck.status).json({
      ok: false,
      error: editorCheck.error,
      message: editorCheck.message,
    });
  }
  return res.json({ ok: true, coverage: getCoverageLedger() });
});

export default router;
