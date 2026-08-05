const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "GH₵";

export function formatPrice(amount: number): string {
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${CURRENCY} ${value}`;
}

export function formatSavings(price: number, compareAt: number): string {
  const pct = Math.max(0, Math.round((1 - price / compareAt) * 100));
  return `${pct}% off`;
}

export function formatOrderDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
