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

// How much of the savings goal the avoided spending could cover: 0..1, or null if no goal is set.
export function goalProgress(total, goalAmount) {
  if (!(goalAmount > 0)) return null;
  return Math.min(1, Math.max(0, total / goalAmount));
}

const startOfMonth = (now) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

// Estimated fun money left this month. ONLY counts non-essential purchases logged in this app,
// so it's a rough estimate, not a bank balance. Can go negative. null when no budget is set.
export function remainingBudget(items, budget, now = Date.now()) {
  if (!(budget > 0)) return null;
  const monthStart = startOfMonth(now);
  const spent = items
    .filter((i) => i.status === 'bought' && !i.essential && i.createdAt >= monthStart)
    .reduce((sum, i) => sum + (i.alternativePrice ?? priceOf(i)), 0);
  return budget - spent;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Time-of-day bucket for a timestamp (phone's local time).
export function timeOfDay(ms) {
  const h = new Date(ms).getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

// The key that appears most often in a list, or null for an empty list.
function mostCommon(keys) {
  const counts = {};
  keys.forEach((k) => (counts[k] = (counts[k] || 0) + 1));
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] ?? null;
}

// Stats for the last 7 days. An item belongs to the week if it was decided
// (or, if still open, added) in that window.
export function weeklyStats(items, now = Date.now()) {
  const week = items.filter((i) => (i.decidedAt ?? i.createdAt) >= now - WEEK_MS);
  const wants = week.filter((i) => !i.essential); // essentials are never a "temptation" or a debate
  const resisted = week.filter((i) => i.status === 'resisted');
  return {
    savedThisWeek: totalSaved(week),
    resisted: resisted.length,
    bought: week.filter((i) => i.status === 'bought').length,
    debating: week.filter((i) => i.status === 'debating').length,
    // Sprout wins when the user walks away or picks a smarter alternative.
    sproutWins: wants.filter((i) => i.status === 'resisted' || i.outcome === 'alternative').length,
    // The user wins by convincing Sprout, or by tapping "Buy anyway".
    userWins: wants.filter((i) => i.outcome === 'user_won' || i.outcome === 'overridden').length,
    topCategory: mostCommon(wants.map((i) => i.category ?? 'other')),
    peakTime: mostCommon(wants.filter((i) => i.createdAt != null).map((i) => timeOfDay(i.createdAt))),
  };
}
