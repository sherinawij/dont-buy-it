// Security-rule tests for friend requests and friendships, on LOCAL Firebase emulators.
// Run both rule test files from the repo root:
//   npx firebase-tools emulators:exec --only auth,firestore --project demo-dontbuyit "node tests/social-rules.test.mjs && node tests/friends-rules.test.mjs"
import { signInAnonymously } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import {
  acceptFriendRequest, allowed, check, denied, failed, pairId, phone, registerGuest, removeFriendship, saveProfile,
  sendFriendRequest,
} from './helpers.mjs';

const s = Date.now() % 100000;
const A = phone('fA'), B = phone('fB'), C = phone('fC'), G = phone('fGuest'), N = phone('fNoProfile');
const a = await registerGuest(A, `a${s}@t.dev`); await saveProfile(A, `amy_${s}`, 'Amy');
const b = await registerGuest(B, `b${s}@t.dev`); await saveProfile(B, `ben_${s}`, 'Ben');
const c = await registerGuest(C, `c${s}@t.dev`); await saveProfile(C, `cal_${s}`, 'Cal');
const n = await registerGuest(N, `n${s}@t.dev`); // registered but no username yet
await signInAnonymously(G.auth);
const AB = pairId(a, b);

console.log('== Who can send requests ==');
await denied('guests cannot send requests', () => sendFriendRequest(G, a));
await denied('accounts without a username cannot send requests', () => sendFriendRequest(N, a));
await denied('cannot send a request to someone without a profile', () => sendFriendRequest(A, n));
await denied('cannot friend yourself', () =>
  setDoc(doc(A.db, 'friendships', `${a}_${a}`), { members: [a, a], requester: a, recipient: a, status: 'pending' }));
await denied('cannot create a request already "accepted"', () =>
  setDoc(doc(A.db, 'friendships', AB), { members: [a, b].sort(), requester: a, recipient: b, status: 'accepted' }));
await denied('cannot send a request pretending to be someone else', () =>
  setDoc(doc(C.db, 'friendships', AB), { members: [a, b].sort(), requester: a, recipient: b, status: 'pending' }));

console.log('\n== Request → accept ==');
check('Amy sends Ben a request', (await allowed('send', () => sendFriendRequest(A, b))) === 'sent');
check('sending again is a harmless no-op', (await sendFriendRequest(A, b)) === 'already-sent');
await denied('a raw duplicate write is blocked', () =>
  setDoc(doc(A.db, 'friendships', AB), { members: [a, b].sort(), requester: a, recipient: b, status: 'pending' }));
await denied('the requester cannot accept their own request', () => updateDoc(doc(A.db, 'friendships', AB), { status: 'accepted' }));
await denied('outsiders cannot read the request', () => getDoc(doc(C.db, 'friendships', AB)));
await denied('outsiders cannot list someone else\'s friendships', () =>
  getDocs(query(collection(C.db, 'friendships'), where('members', 'array-contains', a))));
check('Ben sees the incoming request', (await getDocs(query(collection(B.db, 'friendships'), where('members', 'array-contains', b)))).size === 1);
await denied('recipient cannot change other fields while accepting', () =>
  updateDoc(doc(B.db, 'friendships', AB), { status: 'accepted', requester: b }));
check('Ben accepts', (await allowed('accept', () => acceptFriendRequest(B, a))) === 'accepted');
check('accepting again is a harmless no-op', (await acceptFriendRequest(B, a)) === 'already-friends');
check('sending to an existing friend says already friends', (await sendFriendRequest(A, b)) === 'already-friends');
await denied('accepted friendships cannot be edited back to pending', () => updateDoc(doc(B.db, 'friendships', AB), { status: 'pending' }));
check('both see the friendship', (await getDoc(doc(A.db, 'friendships', AB))).data().status === 'accepted'
  && (await getDoc(doc(B.db, 'friendships', AB))).data().status === 'accepted');

console.log('\n== Mutual request auto-accepts ==');
check('Cal → Amy', (await sendFriendRequest(C, a)) === 'sent');
check('Amy → Cal accepts instead of duplicating', (await sendFriendRequest(A, c)) === 'accepted');

console.log('\n== Remove / decline / cancel ==');
await denied('outsiders cannot delete someone else\'s friendship', () => deleteDoc(doc(C.db, 'friendships', AB)));
check('Ben removes Amy', (await allowed('remove', () => removeFriendship(B, a))) === 'removed');
check('removing again is a harmless no-op', (await removeFriendship(A, b)) === 'nothing');
check('Amy can ask Ben again later', (await sendFriendRequest(A, b)) === 'sent');
check('Ben declines', (await removeFriendship(B, a)) === 'removed');
check('Ben now asks Amy himself', (await sendFriendRequest(B, a)) === 'sent');
check('a stale "Accept" from Ben (now the requester) is a harmless no-op', (await acceptFriendRequest(B, a)) === 'already-sent');
check('Amy accepts Ben’s request', (await acceptFriendRequest(A, b)) === 'accepted');

console.log(failed() ? `\n${failed()} FAILED` : '\nAll friendship rule checks passed');
process.exit(failed() ? 1 : 0);
