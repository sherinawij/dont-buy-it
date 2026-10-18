// Achievement cards, DERIVED from item records — never stored, never written,
// and never change savings. Deterministic keys mean no duplicates. Owner: P1.
//
// Achievement = { key, type: 'skipped' | 'slept_on_it' | 'milestone' | 'alternative',
//   itemId?, itemName?, category?, amountAvoided: number | null,
//   plantStage, mood, line, earnedAt }
// Keys: skipped_<itemId>, slept_<itemId>, milestone_<stage>, alt_<itemId>

// STUB: P1 implements. Returns newest first.
export function deriveAchievements(items, now = Date.now()) {
  return [];
}

export function findAchievement(items, key) {
  return deriveAchievements(items).find((a) => a.key === key) ?? null;
}
