/**
 * Case Status Calculation and Workflow Analytics Utilities
 * Automatically derives 'Drafting', 'Pending Review', 'Hearing', or 'Closed'
 * from case metadata (signatures, timestamps, and stage properties).
 */

export type CaseWorkflowStatus = 'Drafting' | 'Pending Review' | 'Hearing' | 'Partially Heard' | 'Closed';

export interface CaseTimestamps {
  created?: string;
  filed?: string;
  hearingScheduled?: string;
  closed?: string;
  lastModified?: string;
}

export interface CaseStageProperties {
  currentStage?: 'draft' | 'review' | 'hearing' | 'closed' | string;
  isHearingActive?: boolean;
  decisionDrafted?: boolean;
  decisionApproved?: boolean;
  partiesNotified?: boolean;
}

export interface CaseMetadata {
  id?: string;
  title?: string;
  caseNumber?: string;
  type?: 'Claim' | 'Evidence' | 'Decision' | 'Witness' | 'Motion' | string;
  author?: string;
  isVerified?: boolean;
  
  // Signatures
  signatures?: string[];
  hasJudgeSignature?: boolean;
  hasRegistrarSignature?: boolean;
  signedBy?: string[];
  
  // Timestamps
  timestamps?: CaseTimestamps;
  filingDate?: string;
  hearingDate?: string;
  closedDate?: string;
  lastModified?: string;

  // Stage Properties
  stage?: 'draft' | 'review' | 'hearing' | 'closed' | string;
  stageProperties?: CaseStageProperties;
  
  // Explicit status override if provided
  caseStatus?: CaseWorkflowStatus;
}

/**
 * Automatically calculates the current caseStatus ('Drafting', 'Pending Review', 'Hearing', or 'Closed')
 * by analyzing case metadata such as signatures, timestamps, and stage properties.
 *
 * Evaluation Hierarchy:
 * 1. Closed: Final judgment signed, closed timestamp/date recorded, decision approved, or case resolved.
 * 2. Hearing: Active hearing stage, scheduled hearing date/timestamp, or court session (Witness testimony, Motion).
 * 3. Pending Review: Submitted/filed, awaiting judge review/signature, evidence audit, or clerk review.
 * 4. Drafting: In-progress drafting, initial petition, unsigned, or pre-filing stage.
 */
export function calculateCaseStatus(metadata: Partial<CaseMetadata>): CaseWorkflowStatus {
  if (!metadata) return 'Drafting';

  const stage = (metadata.stage || metadata.stageProperties?.currentStage || '').toLowerCase().trim();
  const signatures = metadata.signatures || metadata.signedBy || [];
  
  const hasJudgeSign = 
    metadata.hasJudgeSignature || 
    signatures.some(s => {
      const lower = s.toLowerCase();
      return lower.includes('judge') || lower.includes('abbaa seeraa') || lower.includes('ዳኛ');
    });

  const hasRegistrarSign = 
    metadata.hasRegistrarSignature || 
    signatures.some(s => {
      const lower = s.toLowerCase();
      return lower.includes('registrar') || lower.includes('galmee') || lower.includes('ሬጂስትራር');
    });

  const hasBothKeySignatures = (hasJudgeSign && hasRegistrarSign) || signatures.length >= 2;

  // 1. CLOSED:
  // - Stage is closed/resolved
  // - Closed timestamp or closedDate exists
  // - Decision approved by bench
  // - Decision type with verified status or judge signature
  if (
    stage === 'closed' || 
    stage === 'resolved' || 
    stage === 'dismissed' ||
    Boolean(metadata.closedDate) || 
    Boolean(metadata.timestamps?.closed) ||
    metadata.stageProperties?.decisionApproved ||
    (metadata.type === 'Decision' && (metadata.isVerified || hasJudgeSign)) ||
    (hasBothKeySignatures && metadata.isVerified && metadata.type !== 'Witness' && metadata.type !== 'Claim')
  ) {
    return 'Closed';
  }

  // 2. HEARING:
  // - Stage is hearing/trial
  // - Active court bench proceedings or hearing timestamp scheduled
  // - Witness deposition or Motion/Oral arguments in court
  const hasHearingTimestamp = Boolean(metadata.hearingDate) || Boolean(metadata.timestamps?.hearingScheduled);
  if (stage === 'partially_heard') {
    return 'Partially Heard';
  }
  if (
    stage === 'hearing' || 
    stage === 'trial' || 
    stage === 'dhaddacha' ||
    metadata.stageProperties?.isHearingActive ||
    metadata.type === 'Witness' || 
    metadata.type === 'Motion' ||
    hasHearingTimestamp
  ) {
    return 'Hearing';
  }

  // 3. PENDING REVIEW:
  // - Stage is review or pending_review
  // - Evidence document filed and awaiting audit/approval
  // - Document has filing timestamp and is submitted, awaiting judicial signature
  const hasFilingTimestamp = Boolean(metadata.filingDate) || Boolean(metadata.timestamps?.filed);
  const isReviewStage = stage === 'review' || stage === 'pending_review' || stage === 'under_review';
  if (
    isReviewStage || 
    metadata.type === 'Evidence' ||
    (hasFilingTimestamp && signatures.length > 0 && !hasJudgeSign) ||
    (metadata.isVerified && !hasJudgeSign && metadata.type !== 'Decision')
  ) {
    return 'Pending Review';
  }

  // 4. DRAFTING:
  // - Default for claims, initial petitions, or draft stage
  if (
    stage === 'draft' || 
    stage === 'drafting' || 
    metadata.type === 'Claim' || 
    metadata.stageProperties?.decisionDrafted ||
    metadata.caseStatus === 'Drafting'
  ) {
    return 'Drafting';
  }

  // Fallback to explicit status if specified, otherwise default to Drafting
  return metadata.caseStatus || 'Drafting';
}

/**
 * Returns visual color styles and badges for a given status
 */
export function getCaseStatusColorConfig(status: CaseWorkflowStatus) {
  switch (status) {
    case 'Closed':
      return {
        label: 'Closed',
        labelOm: 'Cufameera (Closed)',
        pillClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dotClass: 'bg-emerald-400',
        icon: '✅'
      };
    case 'Hearing':
      return {
        label: 'Hearing',
        labelOm: 'Dhaddacha (Hearing)',
        pillClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        dotClass: 'bg-blue-400',
        icon: '🏛️'
      };
    case 'Partially Heard':
      return {
        label: 'Partially Heard',
        labelOm: 'Gartokkoon Dhaga’ame',
        pillClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        dotClass: 'bg-indigo-400',
        icon: '⚖️'
      };
    case 'Pending Review':
      return {
        label: 'Pending Review',
        labelOm: 'Qorannoo Eegaa (Pending Review)',
        pillClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dotClass: 'bg-amber-400 animate-pulse',
        icon: '⏳'
      };
    case 'Drafting':
    default:
      return {
        label: 'Drafting',
        labelOm: 'Wixinee (Drafting)',
        pillClass: 'bg-slate-800 text-slate-300 border-slate-700',
        dotClass: 'bg-slate-400',
        icon: '📝'
      };
  }
}
