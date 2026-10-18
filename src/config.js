// Tunable constants and Sprout's canned lines. Owner: P1.
// Others import these; don't rename or remove exports without telling the team.

// The CODE decides when Sprout gives up: this many rubric criteria met → concede.
// Never shown in the UI.
export const CONCEDE_AT = 3;

// On this user turn (without a concession) Sprout makes its final plea and stops arguing.
export const FINAL_PLEA_TURN = 7;

// Plant growth. Stage = the higher of the two (see plantStageFor in calc.js).
export const PLANT_STAGE_THRESHOLDS = [0, 25, 75, 150, 300]; // $ of spending avoided
export const DECISION_STAGE_THRESHOLDS = [0, 1, 3, 6, 10]; // number of positive decisions

// Home reacts to events that happened in the last 10 minutes.
export const REACTION_WINDOW_MS = 10 * 60 * 1000;

// Deciding at least a day after adding an item earns "Slept on it". No timers involved.
export const SLEPT_ON_IT_MS = 24 * 60 * 60 * 1000;

// Category enum — must match the server's analyze schema exactly.
export const CATEGORIES = {
  clothing: { label: 'Clothing', emoji: '👕' },
  electronics: { label: 'Electronics', emoji: '🔌' },
  food: { label: 'Food', emoji: '🍎' },
  health: { label: 'Health', emoji: '💊' },
  hygiene: { label: 'Hygiene', emoji: '🧼' },
  home: { label: 'Home', emoji: '🏠' },
  beauty: { label: 'Beauty', emoji: '💄' },
  entertainment: { label: 'Entertainment', emoji: '🎮' },
  hobby: { label: 'Hobby', emoji: '🎨' },
  baby: { label: 'Baby', emoji: '🍼' },
  school_work: { label: 'School & work', emoji: '🎒' },
  other: { label: 'Other', emoji: '🛍️' },
};
export const categoryInfo = (id) => CATEGORIES[id] ?? CATEGORIES.other;

// Alternative types the server may suggest on concession. searchSuffix builds the Google link.
export const ALT_TYPES = {
  used: { label: 'Buy it used', emoji: '♻️', searchSuffix: 'used' },
  refurbished: { label: 'Get it refurbished', emoji: '🔧', searchSuffix: 'refurbished' },
  repair: { label: 'Repair the old one', emoji: '🪛', searchSuffix: 'repair' },
  borrow: { label: 'Borrow one', emoji: '🤝', searchSuffix: 'borrow' },
  rent: { label: 'Rent it', emoji: '📅', searchSuffix: 'rent' },
  eco: { label: 'Lower-waste option', emoji: '🌍', searchSuffix: 'eco friendly' },
};

// Escalation stage for a given user turn (1-based). Turn 0 = opening line.
export function stageForTurn(turn) {
  if (turn <= 1) return 'alarm';
  if (turn === 2) return 'pleading';
  if (turn === 3) return 'bargaining';
  if (turn === 4) return 'meltdown';
  return 'last_stand';
}

// Used when the backend is unreachable, so the demo never breaks.
export const CANNED_LINES = {
  opening_want: ['NO. Absolutely not. Put the phone down.', 'Oh no. Oh NO. What is THAT and why are we looking at it?'],
  opening_essential: ['That’s a genuine need — go for it! If you can, check for a store brand or a refill option.'],
  alarm: ['NO. Absolutely not. Put the phone down.', 'Excuse me?! We are NOT doing this today.'],
  pleading: ['Please. I’m begging you. Think of the landfills.', 'I have roots in this planet. Please don’t do this to me.'],
  bargaining: ['What if you just… looked at it for a week? Borrowed one? Anything?', 'Okay okay — what if you bought it USED? Meet me halfway!'],
  meltdown: ['I’m going to faint. I’m actually going to faint. *dramatic leaf flop*', 'I’m writing a sad poem about the landfill. It’s called “Because Of You.”'],
  last_stand: ['ALL OF IT. The landfills, the savings goal, my FEELINGS. Please reconsider!', 'This is my LAST STAND. I will not go quietly into that shopping cart!'],
  final_plea: ['I’ve said everything I can. I just want you to have more than stuff. Your call — I’ll still be here.'],
  resumed: ['You’re BACK? For THIS? I thought we were past this.'],
  concede: ['FINE. You win. I hate that you’re right. At least look at a used one first?'],
  essential: ['Totally needed. No fight from me!'],
};

// Achievement card titles + Sprout lines (cards are derived from items, never stored).
export const ACHIEVEMENT_TYPES = {
  skipped: { title: 'Skipped it!', line: 'YOU DID IT. I’M SO PROUD. I’M GROWING.' },
  slept_on_it: { title: 'Slept on it', line: 'You waited before deciding. Patience looks good on you.' },
  milestone: { title: 'Sprout grew!', line: 'Look at me! Look at my LEAVES!' },
  alternative: { title: 'Smarter swap', line: 'A cheaper, lower-waste choice. I could cry.' },
};

// Sprout's speech bubble on Home, chosen by src/sproutState.js.
export const HOME_LINES = {
  idle: ['I’m watching your cart. Lovingly. Suspiciously.', 'Every “no” helps me grow. Just saying.'],
  debating: ['There’s still something we need to talk about…'],
  resisted: ['We did it! Look at me, I’m thriving!'],
  bought: ['Okay! Enjoy it. Back to growing together.'],
  milestone: ['I GREW! This is the best day of my life!'],
  panicking: ['WAIT. What are you about to buy?!'],
};
