// All Firestore reads/writes live here so screens stay simple.
// Layout: users/{uid} holds settings; users/{uid}/items/{itemId} holds the catalog.
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
