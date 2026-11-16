import { REFINED_CASE_ANALYSIS_SYSTEM_PROMPT } from './caseAnalysisPrompt.js';

export interface CaseAnalysisRequest {
  fileText: string;
  files?: Array<{ data: string; mimeType: string; name: string }>;
  caseContext?: string;
}

export interface CaseAnalysisResult {
  fullReport: string;
  structuredData: any;
}

/**
 * SEERAAI - Refined Court Case Analysis Engine
 * Implements the 11-phase analysis protocol.
 */
export async function runRefinedCaseAnalysis(
  params: CaseAnalysisRequest,
  generateText: (input: { systemPrompt: string; userPrompt: string; responseMimeType?: string }) => Promise<string>
): Promise<CaseAnalysisResult> {
  const { fileText, caseContext = '' } = params;

  if (!fileText.trim()) {
    throw new Error('Barreeffama galmee hin argamne. Maaloo galmee fe\'aa ykn OCR dubbisaa.');
  }

  const userPrompt = `
GAFFII FI HAALA DHIMMAA (CONTEXT):
${caseContext || 'Xiinxala galmee mana murtii guutuu.'}

QABIYYEE GALMEE (EXTRACTED TEXT):
--------------------------------------------------
${fileText.slice(0, 50000)} // Chunking to fit context window
--------------------------------------------------

Maaloo xiinxala seeraa guutuu, kutaa 11 (Phases) hordofuun dhiyeessi.
Xumura irratti bifa JSON schema gaafatameen deebii dabalataa kenni.
`;

  // First pass: Generate the full prose report in Afaan Oromoo
  const fullReport = await generateText({
    systemPrompt: REFINED_CASE_ANALYSIS_SYSTEM_PROMPT,
    userPrompt: userPrompt,
  });

  // Second pass: Extract structured data (JSON)
  // We do this separately to ensure high fidelity for the prose report first,
  // or we can request the model to return both if the provider supports structured outputs reliably.
  // For Gemini 3/Flash, we can request JSON specifically.
  
  const jsonPrompt = `${userPrompt}\n\nMaaloo bu'aa xiinxalaa kana bifa JSON schema qofa dhiyeessi.`;
  const jsonResponse = await generateText({
    systemPrompt: REFINED_CASE_ANALYSIS_SYSTEM_PROMPT,
    userPrompt: jsonPrompt,
    responseMimeType: 'application/json',
  });

  let structuredData = {};
  try {
    structuredData = JSON.parse(jsonResponse);
  } catch (e) {
    console.error('Failed to parse structured case analysis data:', e);
    structuredData = { error: 'Failed to generate structured data' };
  }

  return {
    fullReport,
    structuredData,
  };
}
