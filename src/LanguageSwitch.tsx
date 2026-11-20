import { useSyncExternalStore } from 'react';
import { getLanguage, setLanguage, subscribeToLanguage } from './language';
import './language.css';

const vietnamese = () => 'vi' as const;

export function useWebsiteLanguage() {
  return useSyncExternalStore(subscribeToLanguage, getLanguage, vietnamese);
}

export default function LanguageSwitch() {
  const language = useWebsiteLanguage();
  const next = language === 'vi' ? 'en' : 'vi';
  return <button
    type="button"
    className="language-switch"
    onClick={() => setLanguage(next)}
    aria-label={next === 'en' ? 'Đổi ngôn ngữ sang tiếng Anh' : 'Switch language to Vietnamese'}
  >
    <span lang={next}>{next === 'en' ? 'English' : 'Tiếng Việt'}</span>
  </button>;
}
