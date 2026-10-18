// Security-rule tests for accounts, profiles and usernames, run against LOCAL Firebase emulators
// (no real accounts or data are touched). Run from the repo root:
//   npx firebase-tools emulators:exec --only auth,firestore --project demo-dontbuyit "node tests/social-rules.test.mjs"
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator, EmailAuthProvider, getAuth, linkWithCredential, signInAnonymously,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, runTransaction, serverTimestamp, setDoc, writeBatch,
} from 'firebase/firestore';

let failures = 0;
const check = (label, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};
const allowed = async (label, fn) => {
  try { await fn(); check(label, true); } catch (e) { console.log('      ', e.code || e.message); check(label, false); }
};
const denied = async (label, fn) => {
  try { await fn(); check(label + ' (was allowed!)', false); } catch (e) { check(label, e.code === 'permission-denied' || e.code === 'app/username-taken'); }
};

// Each "phone" is its own Firebase app instance talking to the emulators.
function phone(name) {
  const app = initializeApp({ projectId: 'demo-dontbuyit', apiKey: 'demo-key' }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { auth, db };
}

// Mirrors saveProfile() in src/profile.js (that file imports React Native modules, so it can't run in Node).
async function saveProfile({ auth, db }, username, displayName) {
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

const stamp = Date.now();
const A = phone('A');
const B = phone('B');

console.log('== Guests (anonymous) ==');
await signInAnonymously(A.auth);
const guestUid = A.auth.currentUser.uid;
await allowed('guest writes own private item', () => setDoc(doc(A.db, 'users', guestUid, 'items', 'hoodie'), { name: 'Hoodie', status: 'resisted', price: 60 }));
await allowed('guest reads own private item', () => getDoc(doc(A.db, 'users', guestUid, 'items', 'hoodie')));
await denied('guest cannot claim a username', () => saveProfile(A, 'guesty', 'Guest'));
await denied('guest cannot read profiles', () => getDoc(doc(A.db, 'profiles', 'someone')));

console.log('\n== Register = upgrade the guest in place ==');
await linkWithCredential(A.auth.currentUser, EmailAuthProvider.credential(`alice${stamp}@test.dev`, 'secret123'));
await A.auth.currentUser.getIdToken(true);
const claims = (await A.auth.currentUser.getIdTokenResult()).claims;
console.log('       token sign_in_provider after linking:', claims.firebase?.sign_in_provider);
check('uid unchanged after registering', A.auth.currentUser.uid === guestUid);
check('guest data still there after registering', (await getDoc(doc(A.db, 'users', guestUid, 'items', 'hoodie'))).exists());
await allowed('registered user claims "Alice_' + stamp % 1000 + '"', () => saveProfile(A, `Alice_${stamp % 1000}`, 'Alice'));
const aliceLower = `alice_${stamp % 1000}`;

console.log('\n== A second account ==');
await signInAnonymously(B.auth);
await linkWithCredential(B.auth.currentUser, EmailAuthProvider.credential(`bob${stamp}@test.dev`, 'secret123'));
await B.auth.currentUser.getIdToken(true);
const bobUid = B.auth.currentUser.uid;
await denied('same username with different capitals is taken', () => saveProfile(B, `ALICE_${stamp % 1000}`, 'Bob'));
await denied('cannot overwrite someone else\'s username doc', () => setDoc(doc(B.db, 'usernames', aliceLower), { uid: bobUid }));
await denied('cannot point own profile at a name you don\'t hold', () =>
  setDoc(doc(B.db, 'profiles', bobUid), { username: `alice_${stamp % 1000}`, usernameLower: aliceLower, displayName: 'Bob' }));
await denied('cannot write someone else\'s profile', () =>
  setDoc(doc(B.db, 'profiles', guestUid), { username: 'hacked', usernameLower: 'hacked', displayName: 'x' }));
await allowed('bob claims his own username', () => saveProfile(B, `bob_${stamp % 1000}`, 'Bob'));
await denied('cannot hoard extra usernames', () => setDoc(doc(B.db, 'usernames', `spare_${stamp % 1000}`), { uid: bobUid }));
await denied('profile cannot carry extra fields (e.g. email)', async () => {
  const batch = writeBatch(B.db);
  batch.set(doc(B.db, 'profiles', bobUid), { username: `bob_${stamp % 1000}`, usernameLower: `bob_${stamp % 1000}`, displayName: 'Bob', email: 'bob@test.dev' });
  await batch.commit();
});
await allowed('accounts can read each other\'s public profile', () => getDoc(doc(B.db, 'profiles', guestUid)));
await denied('accounts cannot read each other\'s private items', () => getDoc(doc(B.db, 'users', guestUid, 'items', 'hoodie')));
await denied('cannot release someone else\'s username', () => deleteDoc(doc(B.db, 'usernames', aliceLower)));

console.log('\n== Changing username frees the old one ==');
await allowed('alice renames herself', () => saveProfile(A, `Alicia_${stamp % 1000}`, 'Alicia'));
check('old name doc is gone', !(await getDoc(doc(A.db, 'usernames', aliceLower))).exists());
await allowed('bob can now take the old name', () => saveProfile(B, `alice_${stamp % 1000}`, 'Bob'));

console.log('\n== Sign out / sign in ==');
await signOut(A.auth);
await signInWithEmailAndPassword(A.auth, `alice${stamp}@test.dev`, 'secret123');
check('signing back in restores the same account', A.auth.currentUser.uid === guestUid);
let wrong = null;
try { await signInWithEmailAndPassword(A.auth, `alice${stamp}@test.dev`, 'nope'); } catch (e) { wrong = e.code; }
check(`wrong password is rejected (${wrong})`, wrong === 'auth/invalid-credential' || wrong === 'auth/wrong-password');

console.log(failures ? `\n${failures} FAILED` : '\nAll rule checks passed');
process.exit(failures ? 1 : 0);
