import React, { lazy } from 'react';
import { RefreshCw } from 'lucide-react';
import { Language } from '../i18n/translations';

/**
 * safeLazy: A robust wrapper around React.lazy that handles dynamic import failures
 * (chunk load errors, stale deployments, network drops) by attempting a clean reload
 * or providing a user-friendly retry interface.
 */
export function safeLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<any>,
  exportName?: string
) {
  return lazy(async () => {
    try {
      const module = await importFn();
      if (exportName && module[exportName]) {
        return { default: module[exportName] };
      }
      return module.default ? module : { default: module };
    } catch (error: any) {
      console.warn(`[safeLazy] Dynamic import failed for ${exportName || 'module'}:`, error);

      // Check if this error is chunk load failure (stale deployment, network drop, MIME type mismatch)
      const errorMsg = String(error?.message || error || '');
      const isChunkError = 
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('Importing a module script failed') ||
        errorMsg.includes('error loading dynamically imported module') ||
        errorMsg.includes('text/html') ||
        errorMsg.includes('is not a valid JavaScript MIME type') ||
        error?.name === 'TypeError';

      if (typeof window !== 'undefined' && isChunkError) {
        const reloadKey = `seera_chunk_reload_${exportName || 'app'}`;
        const lastReload = Number(sessionStorage.getItem(reloadKey) || '0');
        const now = Date.now();

        // If not reloaded in the last 20 seconds, attempt a single clean reload
        if (now - lastReload > 20000) {
          sessionStorage.setItem(reloadKey, String(now));
          console.info(`[safeLazy] Auto-recovering stale chunk for ${exportName || 'module'}. Refreshing view...`);
          if ('caches' in window) {
            try {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            } catch {}
          }
          window.location.reload();
          // Return pending promise during reload
          return new Promise(() => {});
        }
      }

      // Safe, non-crashing fallback view with retry button
      return {
        default: (props: any) => {
          const lang: Language = props?.currentLang || 'om';
          const isOm = lang === 'om';
          const isAm = lang === 'am';

          return (
            <div className="min-h-[45vh] flex flex-col items-center justify-center p-6 my-8 text-center bg-slate-900/90 border border-amber-500/30 rounded-3xl max-w-xl mx-auto shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2 font-serif-legal">
                {isOm
                  ? 'Kutaa Seeraa Haaromsuun Barbaachisa'
                  : isAm
                  ? 'ይህ የሕግ ክፍል እንደገና መጫን ይፈልጋል'
                  : 'Legal Module Refresh Required'}
              </h3>
              <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
                {isOm
                  ? 'Kutaan appii kun dogoggora networkii irraan kan ka\'e guutummaatti hin fe\'amne. Maaloo deebisaatii yaalaa.'
                  : isAm
                  ? 'በኔትወርክ ችግር ምክንያት ይህ ክፍል አልተጫነም። እባክዎ እንደገና ይሞክሩ።'
                  : 'A network interruption prevented this module from loading. Please retry to continue your legal work.'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                {isOm ? 'DEEBISII YAALI' : isAm ? 'እንደገና ይሞክሩ' : 'RETRY LOADING'}
              </button>
            </div>
          );
        },
      };
    }
  });
}
