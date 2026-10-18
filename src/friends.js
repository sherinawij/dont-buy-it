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
// Short-lived cache so a friends list doesn't re-read every profile on each change,
// while renamed friends still show their new name within a minute.
const PROFILE_TTL_MS = 60 * 1000;
const profileCache = new Map(); // uid → { profile, at }

export async function getProfile(uid) {
  const hit = profileCache.get(uid);
  if (hit && Date.now() - hit.at < PROFILE_TTL_MS) return hit.profile;
  const snap = await getDoc(doc(db, 'profiles', uid));
  const profile = snap.exists() ? { uid, username: snap.data().username, displayName: snap.data().displayName } : null;
  profileCache.set(uid, { profile, at: Date.now() });
  return profile;
}

// Last character in Firestore's string order: '<= prefix + END' matches every name starting with prefix.
const END = String.fromCharCode(0xf8ff);

// Username prefix search (case-insensitive). Never returns emails or anything private.
export async function searchUsers(text) {
  const prefix = String(text ?? '').trim().toLowerCase().replace(/^@/, '');
  if (prefix.length < 2 || !/^[a-z0-9_]+$/.test(prefix)) return [];
  const q = query(
    collection(db, 'profiles'),
    where('usernameLower', '>=', prefix),
    where('usernameLower', '<=', prefix + END),
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
  const myUid = me();
  const q = query(collection(db, 'friendships'), where('members', 'array-contains', myUid));
  let latest = 0; // snapshots resolve profiles asynchronously; only the newest one may update the screen
  return onSnapshot(
    q,
    async (snap) => {
      const seq = ++latest;
      try {
        const rows = await Promise.all(
          snap.docs.map(async (d) => {
            const f = d.data();
            const uid = f.members.find((m) => m !== myUid);
            // A failed lookup (e.g. a network blip) shows a placeholder instead of breaking the whole list.
            const profile = (await getProfile(uid).catch(() => null)) ?? { username: 'unknown', displayName: 'Someone' };
            const direction = f.status === 'accepted' ? 'friends' : f.requester === myUid ? 'outgoing' : 'incoming';
            return { id: d.id, uid, username: profile.username, displayName: profile.displayName, status: f.status, direction };
          })
        );
        if (seq !== latest) return; // a newer snapshot arrived meanwhile
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

// Returns 'accepted' | 'already-friends' | 'already-sent' | 'gone' (they cancelled).
export async function acceptFriendRequest(otherUid) {
  return runTransaction(db, async (tx) => {
    const ref = friendshipRef(otherUid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return 'gone';
    if (snap.data().status === 'accepted') return 'already-friends';
    // Stale screen: the pending request is now MINE to them, so there's nothing for me to accept.
    if (snap.data().recipient !== me()) return 'already-sent';
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
