import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import i18n from '@/i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the localized item name based on the current i18n locale.
 * Falls back to the default `name` field if no translation is available.
 */
export function getLocalizedName(
  name: string | null | undefined,
  nameEn: string | null | undefined,
  nameJa: string | null | undefined,
  nameKo: string | null | undefined,
): string {
  const lang = i18n.language?.substring(0, 2);
  if (lang === 'en' && nameEn) return nameEn;
  if (lang === 'ja' && nameJa) return nameJa;
  if (lang === 'ko' && nameKo) return nameKo;
  return name || '';
}
