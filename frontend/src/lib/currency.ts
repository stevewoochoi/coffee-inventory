export type Currency = 'JPY' | 'KRW' | 'USD';

export const SUPPORTED_CURRENCIES: Currency[] = ['JPY', 'KRW', 'USD'];

const SYMBOL_MAP: Record<Currency, string> = {
  JPY: '¥',  // ¥
  KRW: '₩',  // ₩
  USD: '$',
};

export function normalizeCurrency(value: unknown): Currency {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if (upper === 'JPY' || upper === 'KRW' || upper === 'USD') return upper;
  }
  return 'JPY';
}

export function getCurrencySymbol(currency: unknown): string {
  return SYMBOL_MAP[normalizeCurrency(currency)];
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: unknown,
  fallback: string = '-'
): string {
  if (amount == null || Number.isNaN(amount)) return fallback;
  const symbol = getCurrencySymbol(currency);
  const rounded = currency && normalizeCurrency(currency) === 'USD'
    ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(amount).toLocaleString();
  return `${symbol}${rounded}`;
}
