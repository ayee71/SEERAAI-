import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPrecedentServiceWorker } from './services/precedentOfflineSync';

import { AuthProvider } from './context/AuthContext.tsx';
import { BookmarkProvider } from './context/BookmarkContext.tsx';

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
