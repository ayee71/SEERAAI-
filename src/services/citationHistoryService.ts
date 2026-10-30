/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CitationHistoryItem {
  id: string;
  title: string;
  statuteOrArticle?: string;
  category: 'proclamation' | 'cassation' | 'code' | 'directive' | 'constitution' | 'general';
  lawContext?: string;
  keyPrinciple?: string;
  targetTab: string; // e.g. 'legislationRepository' | 'cassation' | 'explainLaw' | 'docAnalysis'
  targetQuery?: string;
  openedAt: string;
}

const STORAGE_KEY = 'seera_ai_citation_history_10';
const MAX_HISTORY_ITEMS = 10;

/**
 * Initial curated critical legal precedents & statutes for immediate access
 */
const DEFAULT_SAMPLE_CITATIONS: CitationHistoryItem[] = [
  {
    id: 'sample_cit_1',
    title: 'Seera Hariiroo Hawaasaa Keeyyata 1731 (Civil Code Art. 1731)',
    statuteOrArticle: 'Art. 1731',
    category: 'code',
    lawContext: 'Waliigalteen seeraan hundeeffame kakuu fi dirqama seeraa qaamolee gidduutti qaba (Freedom and binding effect of contract).',
    keyPrinciple: 'Pacta sunt servanda - Waliigalteen seeraan ragga\'e akka seeraatti ilaallama.',
    targetTab: 'explainLaw',
    targetQuery: 'Seera Hariiroo Hawaasaa Keeyyata 1731 bu\'uura waliigaltee fi dirqama qaamolee',
    openedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'sample_cit_2',
    title: 'Dhaddacha Ijoo Murtii Lakk. 45210 (Jildii 14)',
    statuteOrArticle: 'Cassation File No. 45210, Vol 14',
    category: 'cassation',
    lawContext: 'Galmee manaa fi qabeenya hin sochoonee galmeessuu ilaalchisee seerri keeyyata 1723 SDFHH dirqisiisaa ta\'uu isaa.',
    keyPrinciple: 'Waliigalteen gurgurtaa manaa yoo qaama dhimmi ilaaluun hin galmoofne bu\'aa seeraa hin qabaatu.',
    targetTab: 'cassation',
    targetQuery: '45210',
    openedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'sample_cit_3',
    title: 'Labsii Hojjetaa fi Hojjechiisaa Lakk. 1156/2019 Keeyyata 27',
    statuteOrArticle: 'Proc. 1156/2019 Art. 27',
    category: 'proclamation',
    lawContext: 'Sababoota waliigaltee hojii akeekkachiisa malee addaan kutan (Summary dismissal conditions under Ethiopian Labor Law).',
    keyPrinciple: 'Hojjetaan balleessaa ulfaataa yoo raawwate seeraan akeekkachiisa malee hojiirraa gaggeessuun ni danda\'ama.',
    targetTab: 'legislationRepository',
    targetQuery: '1156/2019',
    openedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'sample_cit_4',
    title: 'Heera Mootummaa RDFI Keeyyata 40 (FDRE Constitution Art. 40)',
    statuteOrArticle: 'Art. 40',
    category: 'constitution',
    lawContext: 'Mirga abbaa qabeenyummaa lafaa fi qabeenya uumamaa (Right to property and public land ownership).',
    keyPrinciple: 'Lafti qabeenya waliinii ummataa fi mootummaa waan ta\'eef gurguramuu ykn jijjiiramuu hin danda\'u.',
    targetTab: 'explainLaw',
    targetQuery: 'Heera Mootummaa RDFI Keeyyata 40 mirga qabeenyaa',
    openedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'sample_cit_5',
    title: 'Seera Deebisanii Dhaabuu Daldalaa (Commercial Code 2021) Art. 78',
    statuteOrArticle: 'Com. Code Art. 78',
    category: 'code',
    lawContext: 'Itti gaafatamummaa daayirektarootaa fi hojjettoota dhaabbata daldalaa.',
    keyPrinciple: 'Hojii gaggeessitootni dantaa kubbaaniyyaaf amanamaa ta\'uun qabeenya eeguu qabu.',
    targetTab: 'legislationRepository',
    targetQuery: 'Commercial Code',
    openedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
];

/**
 * Get the last 10 citations opened by the user
 */
export function getCitationHistory(): CitationHistoryItem[] {
  if (typeof window === 'undefined') return DEFAULT_SAMPLE_CITATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with sample precedents for rich immediate UX
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_CITATIONS));
      return DEFAULT_SAMPLE_CITATIONS;
    }
    const items: CitationHistoryItem[] = JSON.parse(raw);
    return items.slice(0, MAX_HISTORY_ITEMS);
  } catch (e) {
    console.error('Failed to get citation history', e);
    return DEFAULT_SAMPLE_CITATIONS;
  }
}

/**
 * Add an opened legal article, statute, or precedent to the top of citation history
 * (capped strictly at 10 items)
 */
export function addCitationToHistory(
  citation: Omit<CitationHistoryItem, 'id' | 'openedAt'>
): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCitationHistory();

    // Check if this article or title already exists to avoid duplicates
    const filtered = existing.filter(
      (item) =>
        item.title.toLowerCase().trim() !== citation.title.toLowerCase().trim() &&
        (!citation.statuteOrArticle || item.statuteOrArticle !== citation.statuteOrArticle)
    );

    const newItem: CitationHistoryItem = {
      ...citation,
      id: `cit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      openedAt: new Date().toISOString(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch event so UI subscribers update instantly
    window.dispatchEvent(
      new CustomEvent('seera:citation_history_updated', {
        detail: updated,
      })
    );
  } catch (e) {
    console.error('Failed to add citation to history', e);
  }
}

/**
 * Remove a specific citation from history
 */
export function removeCitationFromHistory(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCitationHistory();
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent('seera:citation_history_updated', {
        detail: updated,
      })
    );
  } catch (e) {
    console.error('Failed to remove citation from history', e);
  }
}

/**
 * Clear all citation history
 */
export function clearCitationHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(
      new CustomEvent('seera:citation_history_updated', {
        detail: [],
      })
    );
  } catch (e) {
    console.error('Failed to clear citation history', e);
  }
}

/**
 * Reset to default curated precedents
 */
export function resetCitationHistoryToDefault(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_CITATIONS));
    window.dispatchEvent(
      new CustomEvent('seera:citation_history_updated', {
        detail: DEFAULT_SAMPLE_CITATIONS,
      })
    );
  } catch (e) {
    console.error('Failed to reset citation history', e);
  }
}

/**
 * Subscribe to citation history changes
 */
export function subscribeCitationHistory(
  callback: (items: CitationHistoryItem[]) => void
): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<CitationHistoryItem[]>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getCitationHistory());
    }
  };

  window.addEventListener('seera:citation_history_updated', handler);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      callback(getCitationHistory());
    }
  });

  return () => {
    window.removeEventListener('seera:citation_history_updated', handler);
  };
}
