// Fixed value lists shared by the prompts, the Gemini schemas and validation.
// CATEGORIES must match CATEGORIES in the app's src/config.js.
export const CATEGORIES = [
  'clothing', 'electronics', 'food', 'health', 'hygiene', 'home',
  'beauty', 'entertainment', 'hobby', 'baby', 'school_work', 'other',
];

// Alternative types Sprout may push when it concedes. The APP turns these into search links.
export const ALT_TYPES = ['used', 'refurbished', 'repair', 'borrow', 'rent', 'eco'];

// Escalation stage for a user turn (1-based). Same mapping as stageForTurn in src/config.js.
export function stageForTurn(turn) {
  if (turn <= 1) return 'alarm';
  if (turn === 2) return 'pleading';
  if (turn === 3) return 'bargaining';
  if (turn === 4) return 'meltdown';
  return 'last_stand';
}
