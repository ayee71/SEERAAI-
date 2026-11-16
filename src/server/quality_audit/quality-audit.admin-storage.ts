import { getSafeAdminFirestore } from "../firebase-admin-config.js";
import type { QualityAuditReport, AuditFinding, AuditEvidence, ExpertReview } from "./quality-audit.types.js";

export async function saveQualityAuditAdmin(
  report: QualityAuditReport,
  authenticatedUserId: string
): Promise<string> {
  const adminDb = getSafeAdminFirestore();
  if (!adminDb) {
    throw new Error("Database unavailable");
  }

  if (!authenticatedUserId) {
    throw new Error("Authentication required");
  }

  const ref = adminDb.collection("quality_audits").doc(report.id);
  const existing = await ref.get();

  if (existing.exists) {
    throw new Error("Audit ID already exists. Create a new version.");
  }

  await ref.set({
    ...report,
    ownerId: authenticatedUserId,
    createdAt: new Date().toISOString(), // Use ISO string for consistency in server-side admin logs
    serverTimestamp: new Date().toISOString()
  });

  return report.id;
}

export async function getLatestQualityAuditAdmin(): Promise<QualityAuditReport | null> {
  const adminDb = getSafeAdminFirestore();
  if (!adminDb) return null;

  const snap = await adminDb.collection("quality_audits")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data() as QualityAuditReport;
}

export async function addExpertReviewAdmin(
  auditId: string,
  review: ExpertReview
): Promise<void> {
  const adminDb = getSafeAdminFirestore();
  if (!adminDb) throw new Error("Database unavailable");

  const ref = adminDb.collection("quality_audits").doc(auditId);
  const snap = await ref.get();

  if (!snap.exists) throw new Error("Audit not found");

  const data = snap.data() as QualityAuditReport;
  const expertReviews = data.expertReviews || [];
  expertReviews.push(review);

  await ref.update({
    expertReviews,
    updatedAt: new Date().toISOString()
  });
}
