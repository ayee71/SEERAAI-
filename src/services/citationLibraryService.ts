/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LegalCitationSuggestion } from './api';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, deleteDoc, getDocs, collection, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

export interface SavedCitationItem {
  id: string;
  userId?: string;
  lawTitle: string;
  proclamationNumber: string;
  articleNumber: string;
  category: string;
  jurisdiction: 'federal' | 'oromia';
  badgeEmoji?: string;
  title: string;
  summary: string;
  insertText: string;
  cassationRef?: string;
  matchedKeyword?: string;
  savedAt: string;
  notes?: string;
  caseName?: string;
  tags?: string[];
}

const STORAGE_KEY = 'seera_saved_citations_library';

/**
 * Gets all saved citations from local storage
 */
export function getLocalSavedCitations(): SavedCitationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves local citations array
 */
function setLocalSavedCitations(items: SavedCitationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('seera:saved_citations_updated', { detail: items }));
  } catch (err) {
    console.warn('Failed to save citations locally:', err);
  }
}

/**
 * Check if a citation ID is saved
 */
export function isCitationSavedInLibrary(id: string): boolean {
  const local = getLocalSavedCitations();
  return local.some((item) => item.id === id);
}

/**
 * Save a citation to the user's Library
 */
export async function saveCitationToLibrary(
  suggestion: LegalCitationSuggestion,
  caseName: string = '',
  notes: string = ''
): Promise<SavedCitationItem> {
  const local = getLocalSavedCitations();
  const existingIdx = local.findIndex((item) => item.id === suggestion.id);

  const currentUser = auth.currentUser;
  const userId = currentUser ? currentUser.uid : undefined;

  const newItem: SavedCitationItem = {
    id: suggestion.id,
    userId,
    lawTitle: suggestion.lawTitle || '',
    proclamationNumber: suggestion.proclamationNumber || '',
    articleNumber: suggestion.articleNumber || '',
    category: suggestion.category || 'general',
    jurisdiction: suggestion.jurisdiction || 'federal',
    badgeEmoji: suggestion.badgeEmoji || '📜',
    title: suggestion.title || '',
    summary: suggestion.summary || '',
    insertText: suggestion.insertText || '',
    cassationRef: suggestion.cassationRef || '',
    matchedKeyword: suggestion.matchedKeyword || '',
    savedAt: new Date().toISOString(),
    notes: notes.trim(),
    caseName: caseName.trim(),
    tags: [suggestion.category, suggestion.jurisdiction].filter(Boolean),
  };

  if (existingIdx >= 0) {
    local[existingIdx] = { ...local[existingIdx], ...newItem };
  } else {
    local.unshift(newItem);
  }

  setLocalSavedCitations(local);

  // Sync to Firestore if authenticated
  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'saved_citations', suggestion.id);
      await setDoc(
        docRef,
        {
          ...newItem,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[CitationLibrary] Firestore save notice:', err);
    }
  }

  return newItem;
}

/**
 * Remove a saved citation from Library
 */
export async function removeCitationFromLibrary(id: string): Promise<void> {
  const local = getLocalSavedCitations().filter((item) => item.id !== id);
  setLocalSavedCitations(local);

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'saved_citations', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('[CitationLibrary] Firestore delete notice:', err);
    }
  }
}

/**
 * Fetch all saved citations (syncs Firestore with LocalStorage)
 */
export async function fetchSavedCitationsFromLibrary(): Promise<SavedCitationItem[]> {
  const local = getLocalSavedCitations();
  const currentUser = auth.currentUser;

  if (!currentUser) return local;

  try {
    const colRef = collection(db, 'users', currentUser.uid, 'saved_citations');
    const snapshot = await getDocs(colRef);
    const remoteList: SavedCitationItem[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      remoteList.push({
        id: docSnap.id,
        userId: currentUser.uid,
        lawTitle: data.lawTitle || '',
        proclamationNumber: data.proclamationNumber || '',
        articleNumber: data.articleNumber || '',
        category: data.category || 'general',
        jurisdiction: data.jurisdiction || 'federal',
        badgeEmoji: data.badgeEmoji || '📜',
        title: data.title || '',
        summary: data.summary || '',
        insertText: data.insertText || '',
        cassationRef: data.cassationRef || '',
        matchedKeyword: data.matchedKeyword || '',
        savedAt: data.savedAt || new Date().toISOString(),
        notes: data.notes || '',
        caseName: data.caseName || '',
        tags: data.tags || [],
      });
    });

    if (remoteList.length > 0) {
      // Merge remote list into local
      const mergedMap = new Map<string, SavedCitationItem>();
      local.forEach((item) => mergedMap.set(item.id, item));
      remoteList.forEach((item) => mergedMap.set(item.id, item));

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );

      setLocalSavedCitations(mergedList);
      return mergedList;
    }
  } catch (err) {
    console.warn('[CitationLibrary] Firestore fetch notice:', err);
  }

  return local;
}

/**
 * Update case notes or caseName on a saved citation
 */
export async function updateSavedCitationMetadata(
  id: string,
  notes: string,
  caseName?: string
): Promise<SavedCitationItem | null> {
  const local = getLocalSavedCitations();
  const idx = local.findIndex((item) => item.id === id);

  if (idx < 0) return null;

  local[idx].notes = notes;
  if (caseName !== undefined) {
    local[idx].caseName = caseName;
  }

  setLocalSavedCitations(local);

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'saved_citations', id);
      await setDoc(
        docRef,
        {
          notes,
          ...(caseName !== undefined ? { caseName } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[CitationLibrary] Firestore update metadata notice:', err);
    }
  }

  return local[idx];
}
