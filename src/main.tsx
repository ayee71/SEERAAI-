import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPrecedentServiceWorker } from './services/precedentOfflineSync';

import { AuthProvider } from './context/AuthContext.tsx';
import { BookmarkProvider } from './context/BookmarkContext.tsx';

// Handle Vite dynamic import chunk preload failures across new deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite Preload] Failed to load dynamic chunk, auto-refreshing page to sync latest bundle:', event);
    const lastReload = Number(sessionStorage.getItem('last_vite_preload_ts') || '0');
    if (Date.now() - lastReload > 15000) {
      sessionStorage.setItem('last_vite_preload_ts', String(Date.now()));
      window.location.reload();
    }
  });
}

// Clean up any rogue service workers from AI Studio frame
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isAiStudio = window.location.hostname.includes('aistudio.google.com') || window.self !== window.top;
  if (isAiStudio) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  } else {
    registerPrecedentServiceWorker();
  }
}


createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <BookmarkProvider>
      <App />
    </BookmarkProvider>
  </AuthProvider>
);
