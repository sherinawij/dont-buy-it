// Every number the app shows is computed here, in code. The AI never does math. Owner: P4.
import { PLANT_STAGE_THRESHOLDS, DECISION_STAGE_THRESHOLDS, SLEPT_ON_IT_MS } from './config';

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

// Price used everywhere: what the user typed, else the AI's estimate.
export const priceOf = (item) => item.price ?? item.estimatedPrice ?? 0;

// "Spending avoided" (self-reported): only items the user explicitly chose not to buy.
// This is NOT money deposited anywhere.
export const totalSaved = (items) =>
  items.filter((i) => i.status === 'resisted').reduce((sum, i) => sum + priceOf(i), 0);

const isSleptOn = (i) => i.decidedAt != null && i.createdAt != null && i.decidedAt - i.createdAt >= SLEPT_ON_IT_MS;

// Positive decisions: resisted, slept on, or chose an alternative. Each item counts once.
export const positiveDecisions = (items) =>
  items.filter((i) => i.status === 'resisted' || i.outcome === 'alternative' || isSleptOn(i)).length;

// Highest stage index whose threshold has been reached.
const stageFrom = (value, thresholds) => thresholds.filter((t) => value >= t).length - 1;

// Sprout's stage 0..4 = the higher of the money stage and the decisions stage.
export const plantStageFor = (totalAvoided, decisions) =>
  Math.max(stageFrom(totalAvoided, PLANT_STAGE_THRESHOLDS), stageFrom(decisions, DECISION_STAGE_THRESHOLDS));

// TODO (P4): goalProgress, remainingBudget, weeklyStats
