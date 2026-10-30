import React from 'react';
import { 
  calculateCaseStatus, 
  CaseWorkflowStatus, 
  CaseMetadata, 
  getCaseStatusColorConfig 
} from '../utils/caseStatus';

export type WorkflowPhase = CaseWorkflowStatus;

export interface WorkflowStatusBadgeProps {
  caseStatus?: WorkflowPhase | string;
  metadata?: Partial<CaseMetadata>;
  className?: string;
}

export const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({ 
  caseStatus, 
  metadata,
  className = '' 
}) => {
  const resolvedStatus: CaseWorkflowStatus = metadata 
    ? calculateCaseStatus(metadata) 
    : ((caseStatus as CaseWorkflowStatus) || 'Drafting');

  const config = getCaseStatusColorConfig(resolvedStatus);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono border shadow-sm ${config.pillClass} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};
