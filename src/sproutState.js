// Decides what Sprout looks like on Home, from recorded items only. Owner: P4.
// Growth persists because it's derived from Firestore; reactions expire after REACTION_WINDOW_MS.
// Pure function: no storage, no timers. Home re-runs it with a fresh `now` to let moods expire.
import { HOME_LINES, REACTION_WINDOW_MS } from './config';
import { totalSaved, positiveDecisions, plantStageFor } from './calc';

const stageOf = (items) => plantStageFor(totalSaved(items), positiveDecisions(items));

// The catalog as it looked just before time t: later decisions are undone.
const itemsBefore = (items, t) =>
  items.map((i) => (i.decidedAt != null && i.decidedAt >= t ? { ...i, status: 'debating', outcome: null, decidedAt: null } : i));

// Same line for the same situation, so the bubble doesn't flicker on every re-render.
const pick = (lines, seed) => lines[Math.abs(seed) % lines.length];

// → { stage: 0..4, mood, line, milestoneKey: string | null }
export function getSproutState(items, now = Date.now()) {
  const stage = stageOf(items);

  // Most recent decision inside the reaction window (if any).
  const recent = items
    .filter((i) => i.decidedAt != null && now - i.decidedAt < REACTION_WINDOW_MS)
    .sort((a, b) => b.decidedAt - a.decidedAt)[0];

  if (recent) {
    // Did a decision inside the window push Sprout up a stage? Then it's a milestone.
    if (stageOf(itemsBefore(items, now - REACTION_WINDOW_MS)) < stage) {
      return { stage, mood: 'ecstatic', line: pick(HOME_LINES.milestone, stage), milestoneKey: `milestone_${stage}` };
    }
    if (recent.status === 'resisted') {
      return { stage, mood: 'ecstatic', line: pick(HOME_LINES.resisted, items.length), milestoneKey: null };
    }
    if (recent.status === 'bought') {
      // Calm and supportive. No guilt after a purchase, ever.
      return { stage, mood: 'happy', line: pick(HOME_LINES.bought, items.length), milestoneKey: null };
    }
  }

  if (items.some((i) => i.status === 'debating')) {
    return { stage, mood: 'nervous', line: pick(HOME_LINES.debating, items.length), milestoneKey: null };
  }
  return { stage, mood: 'smug', line: pick(HOME_LINES.idle, items.length), milestoneKey: null };
}
