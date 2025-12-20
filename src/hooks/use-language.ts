/**
 * Hook for managing language with i18n and user settings sync
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserSettings } from './use-user-settings';

export function useLanguage() {
  const { i18n } = useTranslation();
  const { data: settings } = useUserSettings();

  // Sync language with user settings
  useEffect(() => {
    if (settings?.language && settings.language !== i18n.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings?.language, i18n]);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return {
    language: i18n.language,
    changeLanguage,
    isEnglish: i18n.language === 'en',
    isIndonesian: i18n.language === 'id',
  };
}
