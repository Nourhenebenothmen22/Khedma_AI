import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from '../../public/locales/en/translation.json';
import translationFR from '../../public/locales/fr/translation.json';
import translationAR from '../../public/locales/ar/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  fr: {
    translation: translationFR
  },
  ar: {
    translation: translationAR
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Apply direction on initialization
const currentLang = i18n.language || 'en';
const dir = currentLang.startsWith('ar') ? 'rtl' : 'ltr';
document.documentElement.dir = dir;
document.documentElement.lang = currentLang;

i18n.on('languageChanged', (lng) => {
  const dir = lng.startsWith('ar') ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

export default i18n;
