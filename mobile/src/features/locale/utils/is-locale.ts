import type { Locale } from '../types';

export function isLocale(value: unknown): value is Locale {
  return value === 'uk' || value === 'en';
}
