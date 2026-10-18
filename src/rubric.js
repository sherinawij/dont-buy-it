// The hidden "solid argument" rubric. Owner: P1.
// The server keeps the same ids in server/lib/rubric.js — keep them identical.
// Labels appear ONLY as chips for criteria the user has already earned.
export const RUBRIC = [
  { id: 'replaces_broken', label: 'Replaces something broken' },
  { id: 'frequent_use', label: 'You’ll really use it' },
  { id: 'no_duplicate', label: 'Nothing like it at home' },
  { id: 'compared_options', label: 'Compared your options' },
  { id: 'planned_budget', label: 'Planned for it' },
];

export const RUBRIC_IDS = RUBRIC.map((c) => c.id);

export const labelFor = (id) => RUBRIC.find((c) => c.id === id)?.label ?? id;
