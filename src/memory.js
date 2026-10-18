// In-memory store for the item currently being debated. Owner: P3.
// After analysis, only its local URI lives here: never Firestore or AsyncStorage.
// Restarting the app clears these drafts, so a resumed catalog item needs no photo.
/** @type {Map<string, {photoUri: string | null, suggestedReplies: string[]}>} */
const drafts = new Map();

// draft: { photoUri, suggestedReplies }
export function setDraft(itemId, draft) {
  drafts.set(itemId, { photoUri: draft.photoUri ?? null, suggestedReplies: draft.suggestedReplies ?? [] });
}

export function getDraft(itemId) {
  return drafts.get(itemId) ?? null;
}
