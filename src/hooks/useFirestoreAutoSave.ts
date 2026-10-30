import { useState, useEffect, useRef, useCallback } from 'react';
import { saveDocumentToFirestore, saveDraftToFirestore, FirestoreDocumentData } from '../services/firestoreDraftService';
import { getUserSettings } from '../services/storage';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface UseFirestoreAutoSaveOptions {
  docId: string;
  data: Partial<FirestoreDocumentData>;
  collectionName?: 'user_documents' | 'document_drafts';
  debounceMs?: number; // Defaults to 5000ms (5 seconds)
  enabled?: boolean;
  onSaveSuccess?: (lastSavedAt: Date) => void;
  onSaveError?: (error: Error) => void;
}

export function useFirestoreAutoSave({
  docId,
  data,
  collectionName = 'user_documents',
  debounceMs = 5000,
  enabled = true,
  onSaveSuccess,
  onSaveError,
}: UseFirestoreAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References to keep track of previous saved content & timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef(data);
  const isFirstRender = useRef(true);

  // Keep latest data ref updated
  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  const performSave = useCallback(
    async (overrideData?: Partial<FirestoreDocumentData>) => {
      if (!docId) return;
      const dataToSave = overrideData || latestDataRef.current;
      setSaveStatus('saving');
      setErrorMessage(null);

      try {
        if (collectionName === 'user_documents') {
          await saveDocumentToFirestore(docId, dataToSave);
        } else {
          await saveDraftToFirestore(docId, dataToSave);
        }

        const now = new Date();
        setLastSavedAt(now);
        setSaveStatus('saved');
        if (onSaveSuccess) onSaveSuccess(now);
      } catch (err: any) {
        console.error('Firestore auto-save error:', err);
        const msg = err?.message || 'Failed to auto-save to Firestore';
        setErrorMessage(msg);
        setSaveStatus('error');
        if (onSaveError) onSaveError(err instanceof Error ? err : new Error(msg));
      }
    },
    [docId, collectionName, onSaveSuccess, onSaveError]
  );

  // Trigger 5-second debounce on data change
  useEffect(() => {
    const settings = getUserSettings();
    if (!enabled || !docId || settings.offlineModeEnabled) return;

    // Skip trigger on initial mounting render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Do not trigger if title and content/prompt are both empty
    const { title, content, prompt, context } = data;
    if (!title?.trim() && !content?.trim() && !prompt?.trim() && !context?.trim()) {
      return;
    }

    setSaveStatus('pending');

    // Clear existing debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new 5-second debounce timer
    timerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [docId, data.title, data.content, data.prompt, data.context, debounceMs, enabled, performSave]);

  const forceSaveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    await performSave();
  }, [performSave]);

  return {
    saveStatus,
    lastSavedAt,
    errorMessage,
    forceSaveNow,
  };
}
