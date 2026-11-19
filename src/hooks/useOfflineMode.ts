import { useState, useEffect, useCallback } from 'react';
import { offlineModeService, OfflineModeState } from '../services/offlineModeService';

export function useOfflineMode() {
  const [state, setState] = useState<OfflineModeState>(() => offlineModeService.getState());

  useEffect(() => {
    return offlineModeService.subscribe(setState);
  }, []);

  const setOfflineMode = useCallback((enabled: boolean) => {
    return offlineModeService.setOfflineMode(enabled);
  }, []);

  const toggleOfflineMode = useCallback(() => {
    return offlineModeService.toggleOfflineMode();
  }, []);

  return {
    ...state,
    setOfflineMode,
    toggleOfflineMode,
  };
}
