// Every number the app shows is computed here, in code. The AI never does math.

// Parse a user-typed amount like "$1,200.50". Returns null for blank, NaN for junk.
export function parseAmount(text) {
  const cleaned = String(text ?? '').replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

// Hours of work this costs — only when a valid hourly wage is set.
export function hoursOfWork(price, hourlyWage) {
  if (!(price > 0) || !(hourlyWage > 0)) return null;
  return Math.round((price / hourlyWage) * 10) / 10;
}

export const formatMoney = (n) => `$${Number(n || 0).toFixed(Number.isInteger(n) ? 0 : 2)}`;
