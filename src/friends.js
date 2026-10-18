// Friend search, requests and friendships. Owner: P1 (social features).
//
// friendships/{uidA_uidB}  (the two uids sorted, so a pair can only ever have ONE doc)
//   { members: [uidA, uidB], requester, recipient, status: 'pending' | 'accepted', createdAt, updatedAt }
// - Send: creates a 'pending' doc. If they already asked you, sending accepts instead.
// - Accept: only the recipient can flip 'pending' → 'accepted'.
// - Reject / cancel / remove: either person deletes the doc (you can ask again later).
// Every action is safe to repeat. firestore.rules enforces all of this independently of the UI.
import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const me = () => auth.currentUser.uid;

// One deterministic id per pair, whoever asks first.
export const pairId = (a, b) => [a, b].sort().join('_');
const friendshipRef = (otherUid) => doc(db, 'friendships', pairId(me(), otherUid));

// ---------- Public profiles (display name + username only) ----------
const profileCache = new Map();

export async function getProfile(uid) {
  if (profileCache.has(uid)) return profileCache.get(uid);
  const snap = await getDoc(doc(db, 'profiles', uid));
  const profile = snap.exists() ? { uid, username: snap.data().username, displayName: snap.data().displayName } : null;
  if (profile) profileCache.set(uid, profile);
  return profile;
}

// Username prefix search (case-insensitive). Never returns emails or anything private.
export async function searchUsers(text) {
  const prefix = String(text ?? '').trim().toLowerCase().replace(/^@/, '');
  if (prefix.length < 2 || !/^[a-z0-9_]+$/.test(prefix)) return [];
  const q = query(
    collection(db, 'profiles'),
    where('usernameLower', '>=', prefix),
    where('usernameLower', '<=', `${prefix}`),
    orderBy('usernameLower'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== me()) // don't suggest yourself
    .map((d) => ({ uid: d.id, username: d.data().username, displayName: d.data().displayName }));
}

// ---------- My friendships, live ----------
// callback receives [{ id, uid, username, displayName, status, direction: 'incoming' | 'outgoing' | 'friends' }]
export function subscribeFriendships(callback, onError) {
  const q = query(collection(db, 'friendships'), where('members', 'array-contains', me()));
  return onSnapshot(
    q,
    async (snap) => {
      try {
        const rows = await Promise.all(
          snap.docs.map(async (d) => {
            const f = d.data();
            const uid = f.members.find((m) => m !== me());
            const profile = (await getProfile(uid)) ?? { username: 'unknown', displayName: 'Someone' };
            const direction = f.status === 'accepted' ? 'friends' : f.requester === me() ? 'outgoing' : 'incoming';
            return { id: d.id, uid, username: profile.username, displayName: profile.displayName, status: f.status, direction };
          })
        );
        rows.sort((a, b) => a.username.localeCompare(b.username));
        callback(rows);
      } catch (e) {
        onError?.(e);
      }
    },
    onError
  );
}

// ---------- Actions (all idempotent) ----------
// Returns what happened: 'sent' | 'already-sent' | 'accepted' | 'already-friends'
export async function sendFriendRequest(otherUid) {
  if (otherUid === me()) throw Object.assign(new Error('That’s you'), { code: 'app/self' });
  return runTransaction(db, async (tx) => {
    const ref = friendshipRef(otherUid);
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const f = snap.data();
      if (f.status === 'accepted') return 'already-friends';
      if (f.requester === me()) return 'already-sent';
      // They already asked me: sending back simply accepts.
      tx.update(ref, { status: 'accepted', updatedAt: serverTimestamp() });
      return 'accepted';
    }
    tx.set(ref, {
      members: [me(), otherUid].sort(),
      requester: me(),
      recipient: otherUid,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return 'sent';
  });
}

// Returns 'accepted' | 'already-friends' | 'gone' (they cancelled).
export async function acceptFriendRequest(otherUid) {
  return runTransaction(db, async (tx) => {
    const ref = friendshipRef(otherUid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return 'gone';
    if (snap.data().status === 'accepted') return 'already-friends';
    tx.update(ref, { status: 'accepted', updatedAt: serverTimestamp() });
    return 'accepted';
  });
}

// Decline an incoming request, cancel an outgoing one, or remove a friend. Safe to repeat.
export async function removeFriendship(otherUid) {
  return runTransaction(db, async (tx) => {
    const ref = friendshipRef(otherUid);
    const snap = await tx.get(ref);
    if (snap.exists()) tx.delete(ref);
  });
}

export function friendsErrorMessage(e) {
  if (e?.code === 'unavailable') return 'You seem to be offline. Check your connection and try again.';
  if (e?.code === 'permission-denied') return 'Not allowed. Make sure you’re signed in and have picked a username.';
  if (e?.code === 'app/self') return 'That’s you!';
  return 'Something went wrong. Please try again.';
}
