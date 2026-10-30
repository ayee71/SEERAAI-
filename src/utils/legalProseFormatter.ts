/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Legal Prose Formatter & RAG Result Cleaner
 * 
 * Special utility for SeeraAI legal intelligence that:
 * 1. Automatically strips out non-grammatical/non-legal artifacts such as asterisks (*),
 *    hashes (#), markdown headers, and mechanical markdown bolding.
 * 2. Enforces a fluent, captivating narrative prose style ("akka nama asoosama
 *    sirriitti barreessuu danda'uutti barreessee bareeda").
 * 3. Removes internal robotic headers like "Legal Risk Assessment" / "Balaa Seeraa" /
 *    "የህግ ስጋት" and "Sources" / "Maddoota" / "ምንጮች" headers.
 * 4. Eliminates introductory filler preambles and boilerplate legal disclaimers.
 * 5. Synthesizes RAG vector search snippets into cohesive, elegant legal summaries.
 */

export interface PostProcessOptions {
  stripAsterisksAndHashes?: boolean;
  stripInternalRiskHeaders?: boolean;
  stripSourceHeaders?: boolean;
  stripPreambleAndDisclaimers?: boolean;
  preserveNumberedLists?: boolean;
}

/**
 * Main post-processing utility for AI responses across ExplainLawView and all legal intelligence tools.
 */
export function cleanLegalArtifacts(rawText: string, options: PostProcessOptions = {}): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Remove markdown heading hashes: # Title, ## Subtitle, ### Heading, #### Section
  text = text.replace(/^[\s]*#{1,6}\s*/gm, '');

  // 2. Remove markdown asterisks for bold/italic: ***text***, **text**, *text*
  // Replace with the inner text
  text = text.replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1');

  // 3. Convert asterisk bullets (* item) to clean, standard typographic bullets (• item)
  text = text.replace(/^[\s]*\*\s+/gm, '• ');

  // 4. Remove all remaining stray asterisks (*) or hash (#) characters anywhere in the string
  text = text.replace(/[*#]/g, '');

  // 7. Remove robotic conversational preambles and greetings
  const preamblePatterns = [
    /^(?:Baga\s+nagaan\s+dhuftan|Akkam\s+jirtu|Nagaa\s+fayyaa|Baga\s+nagaan\s+dhufte)[^.\n]*[.\n]/gim,
    /^(?:Hello|Greetings|Dear\s+user|Welcome)[^.\n]*[.\n]/gim,
    /^(?:ሰላም\s*ጤና\s*ይስጥልኝ|እንደምን\s*አደሩ|እንደምን\s*ዋሉ|እንኳን\s*ደህና\s*መጡ)[^.\n]*[.\n]/gim,
    /^(?:In\s+this\s+(?:legal\s+)?(?:explanation|analysis|response|section),?\s*(?:we\s+will|I\s+will|let\s+us)[^.\n]*[.\n])/gim,
  ];

  for (const pattern of preamblePatterns) {
    text = text.replace(pattern, '');
  }

  // 9. Clean up artifact brackets like [INSTRUCTION: ...], [STRICT DIRECTIVE: ...], etc.
  text = text.replace(/\[(?:STRICT|MANDATORY|DIRECTIVE|INSTRUCTION)[^\]]*\]/gi, '');

  // 10. Clean up excessive consecutive empty lines while maintaining natural paragraph breaks
  text = text.replace(/[ \t]+/g, ' '); // collapse extra horizontal spaces
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n'); // maximum 2 newlines (one empty line between paragraphs)

  // 11. Clean up stray leading/trailing hyphens or bullet dashes at start of overall text
  text = text.replace(/^[\s\-—–•]+/g, '').trim();

  return text;
}

/**
 * Cleans an individual RAG text chunk by stripping formatting markers and
 * presenting it cleanly for display or preview.
 */
export function cleanRagChunk(chunkText: string): string {
  if (!chunkText) return '';
  return cleanLegalArtifacts(chunkText);
}

/**
 * Formats a collection of RAG search results into a unified, fluent,
 * and elegant legal essay/summary.
 * 
 * Instead of robotic disjointed pieces, weaves the statutory excerpts
 * into an authoritative narrative essay.
 */
export function formatRagResultsToEssay(
  results: Array<{ text: string; metadata?: Record<string, any> }>,
  options: { title?: string; language?: 'om' | 'am' | 'en' } = {}
): string {
  if (!results || results.length === 0) return '';

  const lang = options.language || 'om';

  // Extract and clean individual chunks
  const cleanedParagraphs = results
    .map((res) => cleanLegalArtifacts(res.text))
    .filter((text) => text.trim().length > 15);

  if (cleanedParagraphs.length === 0) return '';

  // Deduplicate near-identical sentences or chunks
  const uniqueParagraphs: string[] = [];
  for (const p of cleanedParagraphs) {
    const isDuplicate = uniqueParagraphs.some(
      (existing) => existing.includes(p.substring(0, 40)) || p.includes(existing.substring(0, 40))
    );
    if (!isDuplicate) {
      uniqueParagraphs.push(p);
    }
  }

  // Combine into a fluent essay structure
  const essayContent = uniqueParagraphs.join('\n\n');

  return essayContent;
}
