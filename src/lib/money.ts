export const centsToUsd = (cents: number) => (cents || 0) / 100;

export const formatCents = (cents: number, currency = "USD", locale = "en-US") =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(centsToUsd(cents));

/** Parses "1.25", "$1.25", "1,25" into integer cents. */
export const parseAmountToCents = (input: string): number => {
  const cleaned = String(input).replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
};
