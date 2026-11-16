import { Language } from '../i18n/translations';
import { CaseEvidence } from './practiceCaseService';

export interface ExtractedEvidenceMetadata {
  filingDate: string;
  evidenceCategory: string;
  documentOrigin: string;
  evidentialWeight: 'primary' | 'corroborative' | 'secondary';
  admissibilityStatus: 'admissible' | 'conditional' | 'objection_pending';
  aiSummary: string;
  statutoryBasis: string;
  keyEntities: string[];
}

export async function extractEvidenceMetadata(payload: {
  fileName: string;
  fileType: string;
  textContent?: string;
  base64Data?: string;
  caseId?: string;
  caseNumber?: string;
  institutionId?: string;
  language?: Language;
}): Promise<ExtractedEvidenceMetadata | null> {
  try {
    const res = await fetch('/api/evidence/extract-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }

    const data = await res.json();
    return data.metadata || null;
  } catch (err) {
    console.error('[extractEvidenceMetadata error]:', err);
    return null;
  }
}
