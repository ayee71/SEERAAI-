import { useState, useEffect } from 'react';
import { Language, translations, loadLanguage } from '../i18n/translations';

export const useTranslation = () => {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seera_user_settings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          return settings.appLanguage || 'om';
        } catch {
          return 'om';
        }
      }
    }
    return 'om';
  });

  useEffect(() => {
    const handleUpdate = (e: any) => {
      setLang(e.detail);
    };
    // Custom event dispatched when language changes globally
    window.addEventListener('seera:translations_updated', handleUpdate);
    
    // Also listen for storage changes
    const handleStorage = () => {
      const saved = localStorage.getItem('seera_user_settings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          if (settings.appLanguage && settings.appLanguage !== lang) {
            setLang(settings.appLanguage);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('seera:translations_updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [lang]);

  return {
    t: translations[lang],
    lang,
    setLanguage: async (newLang: Language) => {
      await loadLanguage(newLang);
      setLang(newLang);
      window.dispatchEvent(new CustomEvent('seera:translations_updated', { detail: newLang }));
    }
  };
};
