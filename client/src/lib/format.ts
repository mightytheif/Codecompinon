
/**
 * Formats a number as currency with the specified locale and currency
 */
export function formatPrice(
  amount: number, 
  locale: string = "en-SA", 
  currency: string = "SAR", 
  maximumFractionDigits: number = 0
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(amount);
}
