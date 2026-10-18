// The hidden "solid argument" rubric. The ids MUST match src/rubric.js in the app.
// Gemini only reports which criteria the user's latest message supports;
// the APP counts them and decides when Sprout concedes.
export const RUBRIC = [
  {
    id: 'replaces_broken',
    meaning: 'It replaces something the user owns that is broken, worn out, lost or stolen, and they say what is wrong with it.',
    counts: ['my charger’s cable split and won’t charge anymore', 'my only winter boots have a hole in the sole and my socks get soaked'],
    doesNotCount: ['my old one is kind of old', 'I need a new one', 'mine is getting worn'],
  },
  {
    id: 'frequent_use',
    meaning: 'A specific, recurring use: what they will do with it and how often.',
    counts: ['I bike 20 minutes to work every weekday', 'I play in a rec league twice a week'],
    doesNotCount: ['I’ll use it a lot', 'I’ll wear it all the time', 'I use stuff like this constantly'],
  },
  {
    id: 'no_duplicate',
    meaning: 'They name what they currently own (or don’t) and why nothing they have already does this job.',
    counts: ['the only jacket I own is a cotton hoodie and it soaks through in rain', 'I don’t own any charger that fits USB-C'],
    doesNotCount: ['I don’t have one like this', 'it’s different from my other ones'],
  },
  {
    id: 'compared_options',
    meaning: 'They actually compared specific alternatives: used, refurbished, borrowing, repair, or other models/prices.',
    counts: ['refurbished ones on Back Market are $40 but have no warranty', 'I asked my roommate to borrow theirs and they need it daily'],
    doesNotCount: ['I looked around', 'this is the best one', 'I did my research'],
  },
  {
    id: 'planned_budget',
    meaning: 'A concrete money plan: where the money comes from or how it fits a budget they set.',
    counts: ['I set aside $50 from each paycheque for the last month for this', 'it fits my $100 fun budget and I’ve only spent $20 this month'],
    doesNotCount: ['I can afford it', 'it’s worth it', 'it’s on sale', 'I deserve it'],
  },
];

export const RUBRIC_IDS = RUBRIC.map((c) => c.id);
