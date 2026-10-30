export interface OutdatedDraftAlert {
  documentId: string;
  documentTitle: string;
  outdatedCitation: string;
  repealedRecord: any; // Type defined dynamically to avoid early import
  activeReplacement?: string;
  detectedAt: string;
}

import { getSavedDocuments } from './storage';
import { PROCLAMATION_DATABASE } from './citationValidator';
import { scanProclamationsInText } from './proclamationScanner';

export async function checkSavedDraftsForAmendments(): Promise<OutdatedDraftAlert[]> {
  const docs = getSavedDocuments();
  const alerts: OutdatedDraftAlert[] = [];

  for (const doc of docs) {
    const textToCheck = `${doc.title} ${doc.prompt} ${doc.content} ${Object.values(doc.separatedVersions || {}).join(' ')}`;
    const foundProcs = scanProclamationsInText(textToCheck);

    for (const proc of foundProcs) {
      const match = PROCLAMATION_DATABASE.find(
        (db) => db.procNum === proc.proclamationNumber || db.keywords.some((kw) => proc.raw.includes(kw))
      );

      if (match && match.status === 'repealed') {
        const alreadyExists = alerts.some((a) => a.documentId === doc.id && a.outdatedCitation === match.procNum);
        if (!alreadyExists) {
          alerts.push({
            documentId: doc.id,
            documentTitle: doc.title,
            outdatedCitation: match.procNum,
            repealedRecord: match,
            activeReplacement: match.activeReplacement,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return alerts;
}

let workerInterval: any = null;

export async function startDraftAmendmentBackgroundWorker(onAlertsDetected: (alerts: OutdatedDraftAlert[]) => void) {
  const alerts = await checkSavedDraftsForAmendments();
  if (alerts.length > 0) {
    onAlertsDetected(alerts);
  }

  if (!workerInterval) {
    workerInterval = setInterval(async () => {
      const updatedAlerts = await checkSavedDraftsForAmendments();
      if (updatedAlerts.length > 0) {
        onAlertsDetected(updatedAlerts);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('seera:outdated_draft_alert', { detail: updatedAlerts })
          );
        }
      }
    }, 5 * 60 * 1000);
  }
}

export function stopDraftAmendmentBackgroundWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}
