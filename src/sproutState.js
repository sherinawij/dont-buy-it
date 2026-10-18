// Decides what Sprout looks like on Home, from recorded items only. Owner: P4.
// Growth persists because it's derived from Firestore; reactions expire after REACTION_WINDOW_MS.
import { HOME_LINES } from './config';
import { totalSaved, positiveDecisions, plantStageFor } from './calc';

// → { stage: 0..4, mood, line, milestoneKey: string | null }
// STUB: P4 implements the mood priority (milestone → resisted → bought → debating → idle).
export function getSproutState(items, now = Date.now()) {
  const stage = plantStageFor(totalSaved(items), positiveDecisions(items));
  return { stage, mood: 'smug', line: HOME_LINES.idle[0], milestoneKey: null };
}
