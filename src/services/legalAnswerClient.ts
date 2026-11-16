import { getAuth } from "firebase/auth";
import type {
  IngestionJobRecord,
  LegalAnswerRequest,
  LegalAnswerResponse,
  LegalDocumentCategory,
  LegalJurisdiction,
  LegalSearchRequest,
  LegalSearchResponse,
  LegalSourceType,
  TelegramCoverageReport,
} from "../types/legalAnswer";

async function getOptionalAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const user = getAuth().currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn("Auth token retrieval notice:", err);
  }
  return headers;
}

export async function askSEERAAILegalQuestion(
  input: LegalAnswerRequest
): Promise<LegalAnswerResponse> {
  const headers = await getOptionalAuthHeaders();
  const response = await fetch("/api/legal/ask", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok && !data?.answer) {
    throw new Error(data?.error || "Legal answer request failed.");
  }
  return data as LegalAnswerResponse;
}

export async function searchSEERAAILegalSources(
  input: LegalSearchRequest
): Promise<LegalSearchResponse> {
  const headers = await getOptionalAuthHeaders();
  const response = await fetch("/api/legal/search", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Legal search request failed.");
  }
  return data as LegalSearchResponse;
}

export interface BatchIngestionFilePayload {
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
  fileName: string;
  mimeType: string;
  fileBase64?: string;
  textContent?: string;
  language?: "om" | "am" | "en";
  officialSourceName?: string;
  officialSourceUrl?: string;
}

export async function uploadLegalIngestionFiles(
  files: BatchIngestionFilePayload[]
): Promise<{ ok: boolean; jobs: IngestionJobRecord[] }> {
  const headers = await getOptionalAuthHeaders();
  const res = await fetch("/api/legal/ingestion/upload", {
    method: "POST",
    headers,
    body: JSON.stringify({ files }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Document ingestion failed.");
  }
  return data;
}

export async function importTelegramChannelExport(payload: {
  channelHandle?: string;
  exportFormat: "json" | "html";
  content: string;
  isPublic?: boolean;
}): Promise<{
  ok: boolean;
  jobs: IngestionJobRecord[];
  importedCount: number;
  duplicateCount: number;
  coverage: TelegramCoverageReport;
}> {
  const headers = await getOptionalAuthHeaders();
  const res = await fetch("/api/legal/ingestion/telegram-export", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Telegram export ingestion failed.");
  }
  return data;
}

export async function fetchIngestionJobsAndCoverage(): Promise<{
  ok: boolean;
  jobs: IngestionJobRecord[];
  coverage: TelegramCoverageReport[];
}> {
  const headers = await getOptionalAuthHeaders();
  const res = await fetch("/api/legal/ingestion/jobs", { headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Failed to load ingestion jobs.");
  }
  return data;
}

export async function retryIngestionJobRequest(
  jobId: string
): Promise<{ ok: boolean; job: IngestionJobRecord }> {
  const headers = await getOptionalAuthHeaders();
  const res = await fetch(`/api/legal/ingestion/jobs/${encodeURIComponent(jobId)}/retry`, {
    method: "POST",
    headers,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Retry failed.");
  }
  return data;
}

export async function updateLegalSourceMetadataRequest(
  sourceId: string,
  updates: Record<string, unknown>
): Promise<{ ok: boolean; source: any }> {
  const headers = await getOptionalAuthHeaders();
  const res = await fetch(`/api/legal/sources/${encodeURIComponent(sourceId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(updates),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Metadata update failed.");
  }
  return data;
}

export async function archiveLegalSourceRequest(
  sourceId: string,
  reason: string
): Promise<{ ok: boolean; sourceId: string; status: string }> {
  const headers = await getOptionalAuthHeaders();
  const res = await fetch(`/api/legal/sources/${encodeURIComponent(sourceId)}/archive`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Archive failed.");
  }
  return data;
}

export async function fetchLegalSourceContent(sourceId: string): Promise<{
  ok: boolean;
  source: any;
  chunks: Array<{ chunkId: string; pageNumber: number; sectionIndex: number; text: string }>;
  hasOriginalBinary: boolean;
  downloadUrl?: string;
}> {
  const headers = await getOptionalAuthHeaders();
  const res = await fetch(`/api/legal/sources/${encodeURIComponent(sourceId)}/content`, {
    headers,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Unable to load source content.");
  }
  return data;
}
