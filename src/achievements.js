// Achievement cards, DERIVED from item records — never stored, never written,
// and never change savings. Deterministic keys mean no duplicates. Owner: P1.
//
// Achievement = { key, type: 'skipped' | 'slept_on_it' | 'milestone' | 'alternative',
//   itemId?, itemName?, category?, amountAvoided: number | null, detail: string | null,
//   title, plantStage, mood, line, earnedAt }
// Keys: skipped_<itemId>, slept_<itemId>, milestone_<stage>, alt_<itemId>
import { ACHIEVEMENT_TYPES, SLEPT_ON_IT_MS } from './config';
import { formatMoney, priceOf, totalSaved, positiveDecisions, plantStageFor } from './calc';

const DAY_MS = 24 * 60 * 60 * 1000;
export const STAGE_NAMES = ['Seed', 'Sprout', 'Small plant', 'Bushy', 'Flowering'];

function card(type, fields) {
  const { title, line } = ACHIEVEMENT_TYPES[type];
  return { type, title, line, amountAvoided: null, detail: null, ...fields };
}

// Returns newest first.
export function deriveAchievements(items, now = Date.now()) {
  // Replay decisions in the order they happened, so we know Sprout's stage at each one
  // and which decision first reached each new stage (that's a milestone).
  const decided = items
    .filter((i) => i.decidedAt != null && i.status !== 'debating')
    .sort((a, b) => a.decidedAt - b.decidedAt);

  const result = [];
  const soFar = [];
  let highestStage = 0;

  for (const item of decided) {
    soFar.push(item);
    // Same stage math as Home (calc.js), so cards and Sprout always agree.
    const stage = plantStageFor(totalSaved(soFar), positiveDecisions(soFar));
    const base = { itemId: item.id, itemName: item.name, category: item.category, plantStage: stage, earnedAt: item.decidedAt };

    // 1) Chose "Don't buy it": the price is spending avoided (self-reported), not money deposited.
    if (item.status === 'resisted') {
      result.push(card('skipped', { ...base, key: `skipped_${item.id}`, mood: 'ecstatic', amountAvoided: priceOf(item) }));
    }

    // 2) Decided at least a day after adding it. Worked out from timestamps — no timers involved.
    const waited = item.createdAt != null ? item.decidedAt - item.createdAt : 0;
    if (waited >= SLEPT_ON_IT_MS) {
      const days = Math.floor(waited / DAY_MS);
      result.push(card('slept_on_it', {
        ...base, key: `slept_${item.id}`, mood: 'happy', detail: `Waited ${days} ${days === 1 ? 'day' : 'days'} before deciding`,
      }));
    }

    // 3) (Stretch) Went with a cheaper alternative. Only counts an amount if the user entered a lower price.
    if (item.outcome === 'alternative') {
      const saved = typeof item.alternativePrice === 'number' ? priceOf(item) - item.alternativePrice : null;
      result.push(card('alternative', {
        ...base, key: `alt_${item.id}`, mood: 'happy', amountAvoided: saved > 0 ? saved : null,
        detail: item.chosenAlternative ? `Chose: ${item.chosenAlternative}` : null,
      }));
    }

    // 4) Each stage Sprout reaches for the first time is a milestone, earned by this decision.
    while (highestStage < stage) {
      highestStage += 1;
      result.push(card('milestone', {
        ...base, key: `milestone_${highestStage}`, plantStage: highestStage, mood: 'ecstatic',
        detail: `Sprout reached stage ${highestStage + 1}: ${STAGE_NAMES[highestStage]}`,
      }));
    }
  }

  return result.sort((a, b) => b.earnedAt - a.earnedAt);
}

export function findAchievement(items, key) {
  return deriveAchievements(items).find((a) => a.key === key) ?? null;
}

// Text version, used if sharing the image isn't possible on this phone.
export function shareMessage(a) {
  const parts = [`🌱 ${a.title}`];
  if (a.itemName && a.type !== 'milestone') parts.push(a.itemName);
  if (a.amountAvoided != null) parts.push(`${formatMoney(a.amountAvoided)} of spending avoided`);
  if (a.detail) parts.push(a.detail);
  return `${parts.join(' — ')}\nSprout says: “${a.line}”\n#DontBuyIt`;
}
