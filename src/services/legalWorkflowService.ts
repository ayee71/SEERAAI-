// Legal Workflow definitions based on the Ethiopian Civil Procedure Code, Criminal Procedure Code,
// and Oromia Regional Courts Establishment Proclamation No. 216/2011.

import { CourtLevelType } from './courtInstitutionService';

export type LegalProcedureType = 'civil' | 'criminal' | 'labor' | 'land' | 'commercial' | 'family';

export interface WorkflowStage {
  id: string;
  nameOm: string;
  nameAm: string;
  nameEn: string;
  code: string; // e.g. 'DRAFTING', 'REVIEW', 'APPROVAL', 'FINAL_FILING'
  order: number;
  descriptionOm: string;
  descriptionAm: string;
  descriptionEn: string;
  legalBasis: string; // Legal reference, e.g. 'Labsii 216/2011 Kw. 18' or 'Civ. Pro. Code Art. 222'
  assignedRoles: ('judge' | 'assistant_judge' | 'registrar' | 'auditor' | 'legal_expert')[];
  requiredChecklistOm: string[];
}

export interface CustomLegalWorkflow {
  id: string;
  institutionId: string;
  courtName: string;
  courtLevel: CourtLevelType;
  title: string;
  titleAm: string;
  titleEn: string;
  procedureType: LegalProcedureType;
  description: string;
  stages: WorkflowStage[];
  assignedUserIds: string[]; // List of CourtUser IDs assigned to this workflow
  assignedBenches: string[];
  createdAt: string;
  updatedAt: string;
  createdByAdminEmail: string;
  isSystemStandard?: boolean;
}

// Case item progressing through a defined workflow
export interface WorkflowCaseRecord {
  id: string;
  institutionId: string;
  workflowId: string;
  fileNumber: string; // Lakkoofsa Galmee
  caseTitle: string;
  caseType: LegalProcedureType;
  bench: string;
  currentStageId: string;
  currentStageCode: string;
  assignedJudgeOrStaffId: string;
  assignedJudgeName: string;
  status: 'in_progress' | 'completed' | 'on_hold' | 'appealed';
  progressPercentage: number;
  history: {
    stageId: string;
    stageName: string;
    completedAt: string;
    completedBy: string;
    notes: string;
  }[];
  startedAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------------------------------------------
// Standard Law-Grounded Workflows for the Three Court Levels (Sadarkaa Sadeenuu)
// -------------------------------------------------------------------------------------------------

export const STANDARD_LEGAL_WORKFLOWS: CustomLegalWorkflow[] = [
  // 1. MANA MURTII SADARKAA JALQABAA (First Instance Courts - District/Aanaa)
  {
    id: 'wf_std_first_instance_civil',
    institutionId: 'all',
    courtName: 'Manneen Murtii Sadarkaa Jalqabaa / Aanaa (First Instance)',
    courtLevel: 'first_instance',
    title: 'Adeemsa Qorannoo fi Mirkaneessa Falmii Hariiroo Hawaasaa (Civil Workflow)',
    titleAm: 'የመጀመሪያ ደረጃ ፍርድ ቤት የፍትሐብሔር ክርክር ሂደት',
    titleEn: 'First Instance Civil Dispute Processing Workflow',
    procedureType: 'civil',
    description: 'Qophii Iyyannoo -> Qorannoo Dhaaddachaa -> Dhugaa-baasa Ragaalee -> Mirkaneessa Murtee (Labsii 216/2011 & C.P.C Art. 222-250)',
    assignedUserIds: [],
    assignedBenches: ['Dhaddacha Hariiroo Hawaasaa (Civil Bench)', 'Dhaddacha Dhimma Hojjataa'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdByAdminEmail: 'system@court.oromia.gov.et',
    isSystemStandard: true,
    stages: [
      {
        id: 'stg_first_draft',
        nameOm: '1. Qophii fi Simannaa Iyyannoo (Drafting & Registry)',
        nameAm: 'ረቂቅ ክስ እና የሬጅስትራር ምዝገባ',
        nameEn: 'Pleading Drafting & Registry Intake',
        code: 'DRAFTING',
        order: 1,
        descriptionOm: 'Iyyannoon seeratti qindaa\'ee galmaa\'uufi lakkoofsi galmee kennamuu.',
        descriptionAm: 'የክስ አቤቱታ ተዘጋጅቶ መዝገብ መለያ ቁጥር መሰጠት።',
        descriptionEn: 'Filing verification, verification of court fees, and assigning official case docket number.',
        legalBasis: 'C.P.C Art. 222 & Labsii 216/2011',
        assignedRoles: ['registrar', 'legal_expert'],
        requiredChecklistOm: [
          'Waraqaan beenyaa/Taaksii kaffalamuu mirkaneessuu',
          'Ragaalee barruu (annexes) hundi lakkoofsaan galmaa\'uu',
          'Waraqaa waamichaa (summons) qopheessuu',
        ],
      },
      {
        id: 'stg_first_review',
        nameOm: '2. Qorannoo Bu\'uura Seeraa & Deebii (Legal Review & Response)',
        nameAm: 'የሕግ ክለሳ እና የመልስ ምዝገባ',
        nameEn: 'Legal Screening & Preliminary Objections Review',
        code: 'REVIEW',
        order: 2,
        descriptionOm: 'Falmii duraa (preliminary objection) fi deebii mormitootaa qorachuu.',
        descriptionAm: 'የመጀመሪያ ደረጃ መቃወሚያዎች እና የመልስ ማስረጃዎች ምርመራ።',
        descriptionEn: 'Review jurisdiction, limitation periods, cause of action, and preliminary defenses.',
        legalBasis: 'C.P.C Art. 244-246',
        assignedRoles: ['assistant_judge', 'legal_expert'],
        requiredChecklistOm: [
          'Aangoo seeraa fi bakkaa (Jurisdiction) mirkaneessuu',
          'Falmii duraa jiraachuu ykn dhabamuu galmeessuu',
          'Qabxiilee falmii (Issues to be framed) tarreessuu',
        ],
      },
      {
        id: 'stg_first_approval',
        nameOm: '3. Qorannoo Ragaalee & Dhugaa-baasa (Evidence Examination & Hearing)',
        nameAm: 'የማስረጃ ምርመራ እና የችሎት ማረጋገጫ',
        nameEn: 'Hearing, Witness Examination & Bench Evaluation',
        code: 'EVALUATION',
        order: 3,
        descriptionOm: 'Dhaddachatti ragaa namaafi barruu dhagahuu, madaallii ragaa gochuu.',
        descriptionAm: 'የምስክሮች ቃል መስማት እና የማስረጃ ሚዛን ማከናወን።',
        descriptionEn: 'Formal bench hearing, cross-examination, and weighing evidence.',
        legalBasis: 'C.P.C Art. 257-270',
        assignedRoles: ['judge', 'assistant_judge'],
        requiredChecklistOm: [
          'Dhugaa-baatoota kakuu seeraa jalatti dhagahuu',
          'Mormii ragaalee irratti dhiyaateef murtii kennuu',
          'Waliigaltee fi araara yaaluu (conciliation attempt)',
        ],
      },
      {
        id: 'stg_first_filing',
        nameOm: '4. Mirkaneessa Murtee & Galmee Cufuu (Judgment & Final Filing)',
        nameAm: 'ውሳኔ ማጽደቅ እና የመዝገብ የመጨረሻ ምዝገባ',
        nameEn: 'Final Judgment Signature, Seal & Archives Filing',
        code: 'FINAL_FILING',
        order: 4,
        descriptionOm: 'Murtee dhumaa mallatteessuu, chaappaa dhaddachaa gochuu, galmee cufuu.',
        descriptionAm: 'የመጨረሻ ፍርድ ማጽደቅ፣ ማኅተም ማድረግ እና መዝገቡን ማጠናቀቅ።',
        descriptionEn: 'Delivery of judgment, seal application, issuing decree copies, and final archival.',
        legalBasis: 'C.P.C Art. 180-184 & Labsii 216/2011',
        assignedRoles: ['judge', 'registrar', 'auditor'],
        requiredChecklistOm: [
          'Murtee bu\'uura seeraatiin qindaa\'e Abbaan Seeraa mallatteessuu',
          'Koppii murtee abbootii dhimmaaf qopheessuu',
          'Galmee gara kuusaa gabaasaa (Archives) dabarsuu',
        ],
      },
    ],
  },

  // 2. MANA MURTII OLAANAA (High Courts - Zonal Level / Godina)
  {
    id: 'wf_std_high_court_appeals',
    institutionId: 'all',
    courtName: 'Manneen Murtii Olaanaa Godinaalee (Zonal High Courts)',
    courtLevel: 'high_court',
    title: 'Adeemsa Ol-iyyannoo fi Falmii Qabeenyaa (Appellate & High Civil Workflow)',
    titleAm: 'የከፍተኛ ፍርድ ቤት የይግባኝ እና የከፍተኛ ጉዳዮች ሂደት',
    titleEn: 'High Court Appellate & Major Property Litigation Workflow',
    procedureType: 'land',
    description: 'Qophii Ol-iyyannoo -> Qorannoo Galmee Jalqabaa -> Madaallii Murtii -> Mirkaneessa Murtee Ol-iyyannoo (C.P.C Art. 320-350)',
    assignedUserIds: [],
    assignedBenches: ['Dhaddacha Ol-iyyannoo Hariiroo Hawaasaa', 'Dhaddacha Lafaafi Qabeenya Dhaabbataa'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdByAdminEmail: 'system@court.oromia.gov.et',
    isSystemStandard: true,
    stages: [
      {
        id: 'stg_high_draft',
        nameOm: '1. Qophii & Qorannoo Iyyata Ol-iyyannoo (Memorandum of Appeal Filing)',
        nameAm: 'የይግባኝ አቤቱታ ረቂቅ እና ቅበላ',
        nameEn: 'Memorandum of Appeal Intake & Registry Scrutiny',
        code: 'DRAFTING',
        order: 1,
        descriptionOm: 'Iyyanni ol-iyyannoo yeroo seeraan eeyyamame keessatti dhiyaachuu qorachuu.',
        descriptionAm: 'ይግባኙ በሕጉ በተፈቀደው የጊዜ ገደብ መቅረቡን ማረጋገጥ።',
        descriptionEn: 'Check limitation of 30 days for appeal, fee payments, and appeal memorandum annexes.',
        legalBasis: 'C.P.C Art. 323-326',
        assignedRoles: ['registrar', 'legal_expert'],
        requiredChecklistOm: [
          'Koppii murtii mana murtii jalaa dhiyaachuu mirkaneessuu',
          'Yeroo guyyaa 30 (Statute of Limitation) qorachuu',
          'Kaffaltii qabsiisa ol-iyyannoo mirkaneessuu',
        ],
      },
      {
        id: 'stg_high_review',
        nameOm: '2. Qorannoo Galmee Jalqabaa & Xiinxala Dogoggoraa (Record Review)',
        nameAm: 'የስር መዝገብ ክለሳ እና የህግ ስህተት ምርመራ',
        nameEn: 'Lower Court Record Scrutiny & Issue Identification',
        code: 'REVIEW',
        order: 2,
        descriptionOm: 'Galmee mana murtii jalaa waamsisuun dogoggorri ragaa fi seeraa jiraachuu sakatta\'uu.',
        descriptionAm: 'የስር ፍርድ ቤት መዝገብ አስቀርቦ የማስረጃ እና የህግ ስህተቶችን መመርመር።',
        descriptionEn: 'Request and scrutinize lower court trial docket, evaluate alleged procedural or substantive errors.',
        legalBasis: 'C.P.C Art. 337-341',
        assignedRoles: ['assistant_judge', 'legal_expert'],
        requiredChecklistOm: [
          'Galmee jalaa guutummaatti simachuu',
          'Qabxii bu\'uuraa ol-iyyannoof sababa ta\'e adda baasuu',
          'Deebii ol-deebisaa (Respondent reply) simachuu',
        ],
      },
      {
        id: 'stg_high_approval',
        nameOm: '3. Falmii Dhaddachaa & Madaallii Murtee (Appellate Hearing & Approval)',
        nameAm: 'የይግባኝ ክርክር እና የውሳኔ ረቂቅ ማጽደቅ',
        nameEn: 'Oral Arguments & Bench Deliberation',
        code: 'APPROVAL',
        order: 3,
        descriptionOm: 'Abbootii seeraa sadiin (3 Judges Bench) falmii dhageeffachuu fi murtii qopheessuu.',
        descriptionAm: 'በሶስት ዳኞች ችሎት ክርክር ማዳመጥ እና የውሳኔ ረቂቅ ማዘጋጀት።',
        descriptionEn: 'Full 3-judge bench oral hearing, deliberation, drafting affirm/reverse/modify judgment.',
        legalBasis: 'Labsii 216/2011 Kw. 20 & C.P.C Art. 343',
        assignedRoles: ['judge', 'assistant_judge'],
        requiredChecklistOm: [
          'Kora Abbootii Seeraa sadeenii guutuu ta\'uu (Quorum of 3)',
          'Falmii afaanii lamaan isaaniiyyuu dhaggeeffachuu',
          'Yaada addaa (Dissenting opinion) yoo jiraate galmeessuu',
        ],
      },
      {
        id: 'stg_high_filing',
        nameOm: '4. Labsii Murtee & Galmee Jalatti Deebisuu (Remand / Final Filing)',
        nameAm: 'የይግባኝ ውሳኔ ማሳወቅ እና መዝገብ መዝጋት',
        nameEn: 'Pronouncement, Remand Order & Final Filing',
        code: 'FINAL_FILING',
        order: 4,
        descriptionOm: 'Murtii ol-iyyannoo lallabuu, ajaja raawwii mana murtii jalaatti erguu, galmee kuusuu.',
        descriptionAm: 'የይግባኝ ውሳኔ ይፋ ማድረግ፣ ትዕዛዝ ለስር ፍርድ ቤት ማስተላለፍ እና መዝገብ ማጠናቀቅ።',
        descriptionEn: 'Pronounce appellate decision, remit file or remand to lower court, register final disposition.',
        legalBasis: 'C.P.C Art. 348-350',
        assignedRoles: ['judge', 'registrar', 'auditor'],
        requiredChecklistOm: [
          'Murtiin galmee jalaa ragga\'uu, diigamuu, ykn fooyya\'uu isaa ifa gochuu',
          'Galmee mana murtii jalaatiif deebisuu (remand transmission)',
          'Sirna galmee dijitaalaatti qabachuu',
        ],
      },
    ],
  },

  // 3. DHADDACHA IJIBBAATAA (Cassation Division - Supreme Court / Finfinnee)
  {
    id: 'wf_std_cassation_supreme',
    institutionId: 'all',
    courtName: 'Dhaddacha Ijibbaataa Mana Murtii Waliigalaa Oromiyaa (Supreme Cassation)',
    courtLevel: 'cassation',
    title: 'Adeemsa Dogoggora Bu\'uura Seeraa Dhaddacha Ijibbaataa (Cassation Workflow)',
    titleAm: 'የኦሮሚያ ጠቅላይ ፍርድ ቤት የሰበር ችሎት መሰረታዊ የህግ ስህተት ሂደት',
    titleEn: 'Supreme Cassation Fundamental Error of Law Workflow',
    procedureType: 'commercial',
    description: 'Qophii Iyyata Ijibbaataa -> Qorannoo Abbootii Seeraa 3 (Preliminary Bench) -> Dhaddacha Guutuu Abbootii Seeraa 5 -> Precedent Murteessuu (Labsii 216/2011)',
    assignedUserIds: [],
    assignedBenches: ['Dhaddacha Ijibbaataa (Cassation Bench)', 'Dhaddacha Falmii Daldalaa fi Invastimantii'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdByAdminEmail: 'system@court.oromia.gov.et',
    isSystemStandard: true,
    stages: [
      {
        id: 'stg_cas_draft',
        nameOm: '1. Qophii Iyyannoo Ijibbaataa (Cassation Petition Drafting)',
        nameAm: 'የሰበር አቤቱታ ረቂቅ እና ምዝገባ',
        nameEn: 'Cassation Petition Lodging & Scrutiny',
        code: 'DRAFTING',
        order: 1,
        descriptionOm: 'Dogoggorri bu\'uura seeraa maaliyyuu ta\'uu isaa ifatti adda baasuun dhiyaachuu.',
        descriptionAm: 'መሰረታዊ የህግ ስህተት በግልጽ ተለይቶ በሰበር አቤቱታ መቅረቡ።',
        descriptionEn: 'Formulate specific fundamental error of law (dogoggora bu\'uura seeraa) with cited code articles.',
        legalBasis: 'Labsii 216/2011 Kw. 24(1) & Heera Mootummaa',
        assignedRoles: ['registrar', 'legal_expert'],
        requiredChecklistOm: [
          'Murtii dhumaa (Final non-appealable decision) ta\'uu mirkaneessuu',
          'Keeyyattoota seeraa dogoggorri irratti raawwatame tarreessuu',
          'Guyyaa 90 keessatti dhiyaachuu mirkaneessuu',
        ],
      },
      {
        id: 'stg_cas_review',
        nameOm: '2. Qorannoo Jalqabaa Abbootii Seeraa 3 (Preliminary Screening Bench)',
        nameAm: 'የ3 ዳኞች የመጀመሪያ ደረጃ የሰበር ክለሳ (ማጣሪያ)',
        nameEn: '3-Judge Preliminary Admissibility Bench',
        code: 'REVIEW',
        order: 2,
        descriptionOm: 'Abbootiin seeraa sadii dhimmi kun dogoggora bu\'uura seeraa qabaachuufi dhabuu sakatta\'u.',
        descriptionAm: '3 ዳኞች ጉዳዩ መሰረታዊ የህግ ስህተት አለው የለውም ብለው ማጣራት።',
        descriptionEn: '3 judges screen admissibility: determine if substantial legal issue requires full bench hearing.',
        legalBasis: 'Labsii 216/2011 Kw. 24(2)',
        assignedRoles: ['judge', 'assistant_judge'],
        requiredChecklistOm: [
          'Dogoggorri bu\'uura seeraa jiraachuu isaa \'Gahaadha\' jechuun murteessuu',
          'Yoo sababa hin qabne ta\'e \'Kufaa\' godhanii galmee cufuu',
          'Yoo gahaa ta\'e mormataan deebii akka kennu ajajuu',
        ],
      },
      {
        id: 'stg_cas_approval',
        nameOm: '3. Dhaddacha Guutuu Abbootii Seeraa 5 (Full 5-Judge Hearing & Approval)',
        nameAm: 'የ5 ዳኞች ሙሉ የሰበር ችሎት እና ውሳኔ ማጽደቅ',
        nameEn: 'Full 5-Judge Bench Hearing & Binding Precedent Determination',
        code: 'APPROVAL',
        order: 3,
        descriptionOm: 'Abbootiin Seeraa shanan (5) falmii guutuu dhaga\'uun murtii precedent ta\'u mirkaneessu.',
        descriptionAm: '5 ዳኞች ሙሉ ክርክር አድምጠው አስገዳጅ የህግ ትርጉም (Precedent) ማጽደቅ።',
        descriptionEn: 'Full quorum of 5 judges deliberate, approve and sign binding precedent interpretation.',
        legalBasis: 'Labsii 216/2011 Kw. 24(4)',
        assignedRoles: ['judge'],
        requiredChecklistOm: [
          'Kora Abbootii Seeraa shanan (5 Judges) mirkaneessuu',
          'Tartiiba seeraa biyyaalessaa fi naannichaa walsimsiisuu',
          'Murtii dirqisiisaa (Binding Legal Precedent) qopheessuu',
        ],
      },
      {
        id: 'stg_cas_filing',
        nameOm: '4. Galmee Murtee Ijibbaataa & Maxxansa Kuusaa (Precedent Archival & Filing)',
        nameAm: 'የሰበር ውሳኔ ምዝገባ እና በቅጽ መጽሐፍ ማሳተም',
        nameEn: 'Official Law Report Gazette Filing & Case Closure',
        code: 'FINAL_FILING',
        order: 4,
        descriptionOm: 'Murtee dhaddacha ijibbaataa kitaaba murtiiwwan dirqisiisoo irratti maxxansuuf galmeessuu.',
        descriptionAm: 'የሰበር ውሳኔውን በአስገዳጅ የፍርድ ቤት ውሳኔዎች መጽሔት ላይ ማሳተም እና መዝገብ መዝጋት።',
        descriptionEn: 'Publish precedent into official Oromia Law Reports, index in database, close master registry.',
        legalBasis: 'Labsii 216/2011 Kw. 25',
        assignedRoles: ['judge', 'auditor', 'registrar'],
        requiredChecklistOm: [
          'Lakkoofsa addaa galmee ijibbaataa (Cassation Docket No) kennuu',
          'Kuusaa SeeraAI fi maxxaansa biyyaalessaa irratti maxxansuu',
          'Ajaja dhumaa qaama raawwachiisaaf dabarsuu',
        ],
      },
    ],
  },
];

const WORKFLOW_STORAGE_KEY = 'seera_custom_court_workflows';
const CASE_RECORDS_STORAGE_KEY = 'seera_court_workflow_cases';

// Helper: load workflows for an institution or all
export function getWorkflowsForInstitution(institutionId: string): CustomLegalWorkflow[] {
  if (typeof window === 'undefined') return STANDARD_LEGAL_WORKFLOWS;
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(STANDARD_LEGAL_WORKFLOWS));
      return STANDARD_LEGAL_WORKFLOWS;
    }
    const list: CustomLegalWorkflow[] = JSON.parse(raw);
    // Return all standard workflows plus any custom ones created for this institution
    return list.filter(w => w.institutionId === 'all' || w.institutionId === institutionId);
  } catch {
    return STANDARD_LEGAL_WORKFLOWS;
  }
}

export function getAllWorkflows(): CustomLegalWorkflow[] {
  if (typeof window === 'undefined') return STANDARD_LEGAL_WORKFLOWS;
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(STANDARD_LEGAL_WORKFLOWS));
      return STANDARD_LEGAL_WORKFLOWS;
    }
    const list: CustomLegalWorkflow[] = JSON.parse(raw);
    // Ensure standards are present
    const missing = STANDARD_LEGAL_WORKFLOWS.filter(s => !list.some(l => l.id === s.id));
    if (missing.length > 0) {
      const merged = [...list, ...missing];
      localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return list;
  } catch {
    return STANDARD_LEGAL_WORKFLOWS;
  }
}

export function saveWorkflow(workflow: CustomLegalWorkflow): void {
  if (typeof window === 'undefined') return;
  const list = getAllWorkflows();
  const existingIdx = list.findIndex(w => w.id === workflow.id);
  let updated: CustomLegalWorkflow[];
  if (existingIdx >= 0) {
    updated = [...list];
    updated[existingIdx] = { ...workflow, updatedAt: new Date().toISOString() };
  } else {
    updated = [workflow, ...list];
  }
  localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(updated));
}

export function deleteWorkflow(workflowId: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getAllWorkflows();
  const target = list.find(w => w.id === workflowId);
  if (target?.isSystemStandard) {
    return false; // Cannot delete system standard
  }
  const filtered = list.filter(w => w.id !== workflowId);
  localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// Assign workflow to specific user account(s)
export function assignWorkflowToUsers(workflowId: string, userIds: string[]): boolean {
  const list = getAllWorkflows();
  const wf = list.find(w => w.id === workflowId);
  if (!wf) return false;
  wf.assignedUserIds = Array.from(new Set([...(wf.assignedUserIds || []), ...userIds]));
  wf.updatedAt = new Date().toISOString();
  saveWorkflow(wf);
  return true;
}

// Remove user from workflow
export function unassignUserFromWorkflow(workflowId: string, userId: string): boolean {
  const list = getAllWorkflows();
  const wf = list.find(w => w.id === workflowId);
  if (!wf) return false;
  wf.assignedUserIds = (wf.assignedUserIds || []).filter(id => id !== userId);
  wf.updatedAt = new Date().toISOString();
  saveWorkflow(wf);
  return true;
}

// Get workflows assigned to a specific user
export function getWorkflowsAssignedToUser(userId: string, institutionId: string): CustomLegalWorkflow[] {
  const all = getWorkflowsForInstitution(institutionId);
  return all.filter(w => (w.assignedUserIds || []).includes(userId) || w.isSystemStandard);
}

// Load case tracking records
export function getWorkflowCases(institutionId?: string): WorkflowCaseRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CASE_RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const list: WorkflowCaseRecord[] = JSON.parse(raw);
    if (institutionId) {
      return list.filter(c => c.institutionId === institutionId);
    }
    return list;
  } catch {
    return [];
  }
}

export function saveWorkflowCase(caseRec: WorkflowCaseRecord): void {
  if (typeof window === 'undefined') return;
  const list = getWorkflowCases();
  const existingIdx = list.findIndex(c => c.id === caseRec.id);
  let updated: WorkflowCaseRecord[];
  if (existingIdx >= 0) {
    updated = [...list];
    updated[existingIdx] = { ...caseRec, updatedAt: new Date().toISOString() };
  } else {
    updated = [caseRec, ...list];
  }
  localStorage.setItem(CASE_RECORDS_STORAGE_KEY, JSON.stringify(updated));
}
