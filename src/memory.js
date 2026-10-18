// In-memory store for the item currently being debated. Owner: P3.
// The photo lives ONLY here (never uploaded or saved), so it disappears when the app closes.
const drafts = {};

// draft: { photoUri, suggestedReplies }
export function setDraft(itemId, draft) {
  drafts[itemId] = draft;
}

export function getDraft(itemId) {
  return drafts[itemId] ?? null;
}
