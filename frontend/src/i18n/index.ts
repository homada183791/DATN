import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

const STORAGE_KEY = 'judgehub_lang';

const savedLang = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) as 'vi' | 'en' | null;
  } catch {
    return null;
  }
})();

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: savedLang ?? 'vi',
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false, // React đã tự chống XSS, không cần i18next escape thêm
  },
});

// Lưu lại lựa chọn ngôn ngữ mỗi khi đổi, để lần sau vào lại vẫn giữ đúng
i18n.on('languageChanged', (lng: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // bỏ qua nếu localStorage không khả dụng (chế độ riêng tư...)
  }
});

export default i18n;