/**
 * Harargee Dialect & Qubee Phonetic Normalization Utility for Afaan Oromoo Dictation
 */

export function normalizeHarargeeDictation(text: string): string {
  if (!text) return '';

  let normalized = text;

  // Common speech recognition corrections and Harargee dialect / Qubee adjustments
  const replacements: [RegExp, string][] = [
    // Standard legal & common word corrections in Harargee dictation
    [/\b(seeraa|seera)\b/gi, 'seera'],
    [/\b(murtii|murti)\b/gi, 'murtii'],
    [/\b(waliigaltee|waliigalti)\b/gi, 'waliigaltee'],
    [/\b(hojjetaa|hojjeta)\b/gi, 'hojjetaa'],
    [/\b(hojjechiisaa|hojjechiisa)\b/gi, 'hojjechiisaa'],
    [/\b(falmii|falmi)\b/gi, 'falmii'],
    [/\b(obbo)\b/gi, 'Obbo'],
    [/\b(aadde)\b/gi, 'Aadde'],
    
    // Phonetic Qubee sound normalizations common in speech engines
    // Ensure long vowels where context requires
    [/\b(ni)\s+/gi, 'ni '],
    [/\b(kan)\s+/gi, 'kan '],
  ];

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized;
}
