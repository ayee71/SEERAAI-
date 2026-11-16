import type {
  LegalCitation,
  LegalContextPackage,
  LegalEngineDependencies,
  LegalSource,
  SynthesizeLegalParams,
  SynthesizedLegalResult,
} from './types.js';

function onlyVerified<T extends LegalSource>(sources: T[]): T[] {
  return (sources ?? []).filter((source) => source.reviewStatus === 'verified' && source.text?.trim());
}

function toCitation(source: LegalSource): LegalCitation {
  return {
    id: source.id,
    title: source.title,
    sourceType: source.sourceType,
    caseNumber: source.caseNumber,
    volume: source.volume,
    decisionYear: source.decisionYear,
    page: source.page,
    court: source.court,
    sourceUrl: source.sourceUrl,
  };
}

/**
 * Asynchronous legal answer pipeline. Only administrator/judicially verified sources
 * are supplied as authorities to the language model. Unreviewed Telegram imports are excluded.
 */
export async function synthesizeAuthoritativeLegalAnswer(
  params: SynthesizeLegalParams,
  dependencies: LegalEngineDependencies,
): Promise<SynthesizedLegalResult> {
  const query = params.fullQuery.trim();
  if (!params.userId.trim()) throw new Error('Fayyadamaan mirkanaaʼe hin jiru.');
  if (!query) throw new Error('Gaaffii seeraa duwwaa taʼe hin fudhannu.');
  if (query.length > 12_000) throw new Error('Gaaffiin baayʼee dheeraa dha; gabaabsi.');

  const collected = await dependencies.detectTopicAndCollectSources(query, params.userId);
  const verifiedContext: LegalContextPackage = {
    topic: collected.topic,
    matchedCassations: onlyVerified(collected.matchedCassations),
    masterFiles: onlyVerified(collected.masterFiles),
    statutes: onlyVerified(collected.statutes ?? []),
    otherSources: onlyVerified(collected.otherSources ?? []),
  };

  const originalCount =
    (collected.matchedCassations?.length ?? 0) +
    (collected.masterFiles?.length ?? 0) +
    (collected.statutes?.length ?? 0) +
    (collected.otherSources?.length ?? 0);
  const verifiedCount =
    verifiedContext.matchedCassations.length +
    verifiedContext.masterFiles.length +
    (verifiedContext.statutes?.length ?? 0) +
    (verifiedContext.otherSources?.length ?? 0);

  const answer = await dependencies.buildOromoContent(query, verifiedContext, params.userId);
  if (!answer?.trim()) throw new Error('Sirni AI deebii hin deebisne.');

  const citations = [
    ...verifiedContext.matchedCassations,
    ...verifiedContext.masterFiles,
    ...(verifiedContext.statutes ?? []),
    ...(verifiedContext.otherSources ?? []),
  ].map(toCitation);

  return {
    text: answer.trim(),
    topic: collected.topic,
    citations,
    excludedUnverifiedCount: Math.max(0, originalCount - verifiedCount),
    warning: citations.length === 0
      ? 'Maddi seeraa mirkanaaʼe hin argamne. Deebiin kun murtii ykn seera mirkanaaʼe irratti hin hundaaʼu; akka yaada waliigalaatti qofa ilaali.'
      : undefined,
  };
}
