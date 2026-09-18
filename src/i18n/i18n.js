import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';

export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    shortCode: 'EN',
    flag: '',
    badge: 'Default'
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeName: 'हिंदी',
    shortCode: 'HI',
    flag: '',
    badge: 'लोकप्रिय'
  },
  {
    code: 'mr',
    label: 'Marathi',
    nativeName: 'मराठी',
    shortCode: 'MR',
    flag: '',
    badge: 'प्रादेशिक'
  }
];

export const getStoredLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem('slipzo_language') || localStorage.getItem('i18nextLng');
    if (stored && ['en', 'hi', 'mr'].includes(stored)) {
      return stored;
    }
  } catch (err) {
    console.warn('Could not read stored language:', err);
  }
  return 'en';
};

const initialLanguage = getStoredLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr }
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Keep localStorage in sync whenever language changes
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('slipzo_language', lng);
      localStorage.setItem('i18nextLng', lng);
      window.dispatchEvent(new CustomEvent('slipzo-language-changed', { detail: lng }));
    } catch (err) {
      console.warn('Could not persist language to localStorage:', err);
    }
  }
});

export const changeAppLanguage = async (languageCode) => {
  if (!['en', 'hi', 'mr'].includes(languageCode)) return;
  await i18n.changeLanguage(languageCode);
  if (typeof window !== 'undefined') {
    localStorage.setItem('slipzo_language', languageCode);
    localStorage.setItem('i18nextLng', languageCode);
  }
  return languageCode;
};

export default i18n;
