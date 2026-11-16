import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import type { QualityAuditReport } from "./quality-audit.types.js";

export async function saveQualityAudit(
  db: Firestore,
  report: QualityAuditReport,
  authenticatedUserId: string
): Promise<string> {
  if (!authenticatedUserId) {
    throw new Error("Authentication barbaachisa: Bakka kana jiraachuu kee mirkaneessi.");
  }

  if (!report.id || typeof report.id !== "string") {
    throw new Error("Audit ID sirrii ta'e hin dhihaanne.");
  }

  const ref = doc(db, "quality_audits", report.id);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    throw new Error("Audit ID duraan jira. Version haaraa uumi.");
  }

  await setDoc(ref, {
    ...report,
    ownerId: authenticatedUserId,
    createdAt: serverTimestamp()
  });

  return report.id;
}
