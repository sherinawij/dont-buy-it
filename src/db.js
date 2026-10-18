// All Firestore reads/writes live here so screens stay simple.
// Layout: users/{uid} holds settings; users/{uid}/items/{itemId} holds the catalog.
import {
  addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// The root layout only renders screens after sign-in, so currentUser is always set here.
export const uid = () => auth.currentUser.uid;

const userRef = () => doc(db, 'users', uid());

// Create the user doc the first time this anonymous user opens the app.
export async function ensureUserDoc() {
  const snap = await getDoc(userRef());
  if (!snap.exists()) {
    await setDoc(userRef(), { createdAt: serverTimestamp() });
  }
}

// Settings are all optional; missing values come back as null.
export async function getSettings() {
  const data = (await getDoc(userRef())).data() || {};
  return {
    hourlyWage: data.hourlyWage ?? null,
    savingsGoal: data.savingsGoal ?? null,
    goalAmount: data.goalAmount ?? null,
    discretionaryBudget: data.discretionaryBudget ?? null,
  };
}

export async function saveSettings(settings) {
  await setDoc(userRef(), settings, { merge: true });
}

// ---------- Items (the catalog) ----------
// Item shape returned to screens:
// { id, name, category, price, estimatedPrice, link, essential,
//   messages: [{ role: 'user' | 'sprout', text }], criteriaMet: [ids],
//   status: 'debating' | 'resisted' | 'bought',
//   outcome: 'sprout_won' | 'user_won' | 'overridden' | 'essential' | 'alternative' | null,
//   chosenAlternative?, alternativePrice?,   // stretch only
//   createdAt: ms, decidedAt: ms | null }
// Timestamps are converted to plain milliseconds so calc code stays simple.

const itemsCol = () => collection(db, 'users', uid(), 'items');
const itemRef = (id) => doc(db, 'users', uid(), 'items', id);

function fromSnap(snap) {
  // 'estimate' gives a local time while a serverTimestamp is still being written.
  const d = snap.data({ serverTimestamps: 'estimate' });
  return {
    ...d,
    id: snap.id,
    createdAt: d.createdAt?.toMillis?.() ?? null,
    decidedAt: d.decidedAt?.toMillis?.() ?? null,
  };
}

// Returns the new item id.
export async function createItem(item) {
  const ref = await addDoc(itemsCol(), {
    name: item.name,
    category: item.category ?? 'other',
    price: item.price ?? null,
    estimatedPrice: item.estimatedPrice ?? null,
    link: item.link ?? null,
    essential: Boolean(item.essential),
    messages: item.messages ?? [],
    criteriaMet: item.criteriaMet ?? [],
    status: 'debating',
    outcome: null,
    createdAt: serverTimestamp(),
    decidedAt: null,
  });
  return ref.id;
}

export async function getItem(id) {
  const snap = await getDoc(itemRef(id));
  return snap.exists() ? fromSnap(snap) : null;
}

// For in-progress debates: messages, criteriaMet, etc.
export async function updateItem(id, patch) {
  await updateDoc(itemRef(id), patch);
}

// Final decision. decision: { status, outcome, chosenAlternative?, alternativePrice? }
export async function decideItem(id, decision) {
  await updateDoc(itemRef(id), { ...decision, decidedAt: serverTimestamp() });
}

// Live catalog, newest first. Returns the unsubscribe function.
// onError (optional) lets a screen show a friendly message instead of spinning forever.
export function subscribeItems(callback, onError) {
  const q = query(itemsCol(), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map(fromSnap)), onError);
}

// Last few items as light context for Sprout ("That's your THIRD hoodie this month").
export async function getRecentHistory(count = 10) {
  const snap = await getDocs(query(itemsCol(), orderBy('createdAt', 'desc'), limit(count)));
  return snap.docs.map((s) => {
    const { name, category, status, outcome } = s.data();
    return { name, category, status, outcome };
  });
}
