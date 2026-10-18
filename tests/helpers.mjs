// Shared helpers for the security-rule tests (LOCAL Firebase emulators only).
// The app's own modules import React Native, so the few client calls we need are mirrored here.
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, EmailAuthProvider, getAuth, linkWithCredential, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, runTransaction, serverTimestamp } from 'firebase/firestore';

let failures = 0;
export const failed = () => failures;

export function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
}
export async function allowed(label, fn) {
  try {
    const out = await fn();
    check(label, true);
    return out;
  } catch (e) {
    console.log('      ', e.code || e.message);
    check(label, false);
  }
}
export async function denied(label, fn) {
  try {
    await fn();
    check(label + ' (was allowed!)', false);
  } catch (e) {
    check(label, e.code === 'permission-denied' || String(e.code).startsWith('app/'));
  }
}

// Each "phone" is its own Firebase app instance talking to the emulators.
export function phone(name) {
  const app = initializeApp({ projectId: 'demo-dontbuyit', apiKey: 'demo-key' }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { auth, db };
}

// Guest → registered account (same flow as src/auth.js register()).
export async function registerGuest(p, email) {
  await signInAnonymously(p.auth);
  await linkWithCredential(p.auth.currentUser, EmailAuthProvider.credential(email, 'secret123'));
  await p.auth.currentUser.getIdToken(true);
  return p.auth.currentUser.uid;
}

// Mirrors saveProfile() in src/profile.js.
export async function saveProfile({ auth, db }, username, displayName) {
  const uid = auth.currentUser.uid;
  const lower = username.toLowerCase();
  await runTransaction(db, async (tx) => {
    const nameRef = doc(db, 'usernames', lower);
    const nameSnap = await tx.get(nameRef);
    if (nameSnap.exists() && nameSnap.data().uid !== uid) throw Object.assign(new Error('taken'), { code: 'app/username-taken' });
    const profRef = doc(db, 'profiles', uid);
    const prof = await tx.get(profRef);
    const oldLower = prof.exists() ? prof.data().usernameLower : null;
    if (!nameSnap.exists()) tx.set(nameRef, { uid });
    if (oldLower && oldLower !== lower) tx.delete(doc(db, 'usernames', oldLower));
    tx.set(profRef, {
      username, usernameLower: lower, displayName,
      createdAt: prof.exists() ? prof.data().createdAt : serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
}

// Mirrors src/friends.js.
export const pairId = (a, b) => [a, b].sort().join('_');

export async function sendFriendRequest({ auth, db }, otherUid) {
  const me = auth.currentUser.uid;
  return runTransaction(db, async (tx) => {
    const ref = doc(db, 'friendships', pairId(me, otherUid));
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const f = snap.data();
      if (f.status === 'accepted') return 'already-friends';
      if (f.requester === me) return 'already-sent';
      tx.update(ref, { status: 'accepted', updatedAt: serverTimestamp() });
      return 'accepted';
    }
    tx.set(ref, {
      members: [me, otherUid].sort(), requester: me, recipient: otherUid, status: 'pending',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return 'sent';
  });
}

export async function acceptFriendRequest({ auth, db }, otherUid) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, 'friendships', pairId(auth.currentUser.uid, otherUid));
    const snap = await tx.get(ref);
    if (!snap.exists()) return 'gone';
    if (snap.data().status === 'accepted') return 'already-friends';
    tx.update(ref, { status: 'accepted', updatedAt: serverTimestamp() });
    return 'accepted';
  });
}

export async function removeFriendship({ auth, db }, otherUid) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, 'friendships', pairId(auth.currentUser.uid, otherUid));
    const snap = await tx.get(ref);
    if (snap.exists()) tx.delete(ref);
    return snap.exists() ? 'removed' : 'nothing';
  });
}
