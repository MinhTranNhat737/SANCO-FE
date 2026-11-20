import { english } from './messages-en.ts';

export type Language = 'vi' | 'en';

const preferenceKey = 'sanco-language';
const listeners = new Set<() => void>();

export function translate(language: Language, message: string, ...values: (string | number | null | undefined)[]): string {
  const template = language === 'en' ? (english.get(message) ?? message) : message;
  return values.length ? template.replace(/\{(\d+)\}/g, (token, index) => String(Number(index) < values.length ? values[Number(index)] : token)) : template;
}

export function getLanguage(): Language {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'vi';
}

export function t(message: string, ...values: (string | number | null | undefined)[]): string {
  return translate(getLanguage(), message, ...values);
}

export function subscribeToLanguage(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setLanguage(language: Language) {
  document.documentElement.lang = language;
  updatePageTitle();
  try { localStorage.setItem(preferenceKey, language); } catch { /* Use the language for this visit. */ }
  listeners.forEach(listener => listener());
}

export function initializeLanguage() {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get('lang');
  if (requested === 'en' || requested === 'vi') {
    setLanguage(requested);
    url.searchParams.delete('lang');
    history.replaceState(history.state, '', url);
    return;
  }
  try {
    if (localStorage.getItem(preferenceKey) === 'en') document.documentElement.lang = 'en';
  } catch { /* Vietnamese is the default. */ }
  updatePageTitle();
}

export function languageTag() {
  return getLanguage() === 'en' ? 'en-US' : 'vi-VN';
}

export function guidePath(path: string, language = getLanguage()) {
  return language === 'en' ? `/en${path}` : path;
}


let vietnameseTitle: string | undefined;

function updatePageTitle() {
  vietnameseTitle ??= document.title;
  if (!vietnameseTitle) return;
  const englishTitle = window.location.pathname.startsWith('/bi-kip')
    ? 'Chess & Xiangqi Lessons | Sân Cờ'
    : 'Sân Cờ – Play Chess, Xiangqi, and Board Games Online';
  document.title = getLanguage() === 'en' ? englishTitle : vietnameseTitle;
}
