export type { Language } from './i18n/translations';

export interface CasePrecedent {
  id: string;
  caseNumber: string;
  titleOm: string;
  titleAm: string;
  titleEn?: string;
  volume: number;
  yearAli: number;
  yearGc: number;
  court: string;
  summaryOm: string;
  summaryAm: string;
  summaryEn?: string;
  legalIssueOm: string;
  legalIssueAm?: string;
  legalIssueEn?: string;
  holdingOm: string;
  holdingAm: string;
  holdingEn?: string;
  category: string;
  tags: string[];
}
