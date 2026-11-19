import type { LegalContentDependencies, ParsedTelegramLegalContent, StoreLegalContentResult } from './types.js';

export async function storeTelegramLegalContentInFirestore(
  _parsed: ParsedTelegramLegalContent,
  _deps: LegalContentDependencies,
): Promise<StoreLegalContentResult> {
  throw new Error('Not implemented: storeTelegramLegalContentInFirestore');
}
