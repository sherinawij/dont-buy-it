// Public profiles + unique usernames. Owner: P1 (social features).
//
// profiles/{uid}            → { username, usernameLower, displayName, createdAt, updatedAt }
//                             Visible to other signed-in accounts (for friend search). No email, no money.
// usernames/{usernameLower} → { uid }   One doc per name = usernames are unique, ignoring case.
// Both are written together in ONE transaction, and firestore.rules re-checks everything.
import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export const USERNAME_RULE = '3–20 characters: letters, numbers or _';

// Returns an error message, or null if the username is acceptable.
export function validateUsername(username) {
  const name = String(username ?? '').trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return `Usernames are ${USERNAME_RULE}.`;
  return null;
}

export function validateDisplayName(displayName) {
  const name = String(displayName ?? '').trim();
  if (name.length < 1 || name.length > 40) return 'Display names are 1–40 characters.';
  return null;
}

const profileRef = (uid) => doc(db, 'profiles', uid);
const usernameRef = (lower) => doc(db, 'usernames', lower);

// Live: calls back with my profile (or null if I haven't picked a username yet).
// Unlike a one-off read, it waits through brief connection drops instead of failing.
export function subscribeMyProfile(callback, onError) {
  return onSnapshot(profileRef(auth.currentUser.uid), (snap) => callback(snap.exists() ? snap.data() : null), onError);
}

export async function getMyProfile() {
  const snap = await getDoc(profileRef(auth.currentUser.uid));
  return snap.exists() ? snap.data() : null;
}

// Claim (or change) my username and display name, atomically.
// Throws { code: 'app/username-taken' } if someone else already has it (any capitalisation).
export async function saveProfile({ username, displayName }) {
  const uid = auth.currentUser.uid;
  const cleanName = String(username).trim();
  const lower = cleanName.toLowerCase();
  const display = String(displayName).trim();

  await runTransaction(db, async (tx) => {
    const nameSnap = await tx.get(usernameRef(lower));
    if (nameSnap.exists() && nameSnap.data().uid !== uid) {
      throw Object.assign(new Error('Username taken'), { code: 'app/username-taken' });
    }
    const profileSnap = await tx.get(profileRef(uid));
    const oldLower = profileSnap.exists() ? profileSnap.data().usernameLower : null;

    if (!nameSnap.exists()) tx.set(usernameRef(lower), { uid });
    // Changing names frees the old one for someone else.
    if (oldLower && oldLower !== lower) tx.delete(usernameRef(oldLower));
    tx.set(profileRef(uid), {
      username: cleanName,
      usernameLower: lower,
      displayName: display,
      createdAt: profileSnap.exists() ? profileSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export function profileErrorMessage(e) {
  if (e?.code === 'app/username-taken') return 'That username is taken. Try another one.';
  if (e?.code === 'unavailable') return 'You seem to be offline. Check your connection and try again.';
  if (e?.code === 'permission-denied') return 'Couldn’t save. Make sure you’re signed in to an account.';
  return 'Couldn’t save your profile. Please try again.';
}
