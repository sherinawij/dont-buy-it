// "Who counts as a real account?" with the token shapes seen on real Firebase.
// A guest upgraded to email/password can keep sign_in_provider 'anonymous' in its token while
// also carrying an email; it must be treated as an account. A pure guest (no email) must not.
// Runs on LOCAL emulators using mock tokens (no accounts are created).
import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, writeBatch } from 'firebase/firestore';
import { allowed, check, denied, failed } from './helpers.mjs';

function dbWithToken(name, token) {
  const db = getFirestore(initializeApp({ projectId: 'demo-dontbuyit', apiKey: 'demo-key' }, name));
  connectFirestoreEmulator(db, '127.0.0.1', 8080, { mockUserToken: token });
  return db;
}

const s = Date.now() % 100000;
const upgradedUid = `upgraded${s}`;
const upgraded = dbWithToken('tUpgraded', { sub: upgradedUid, user_id: upgradedUid, email: `u${s}@t.dev`, firebase: { sign_in_provider: 'anonymous' } });
const guestUid = `guest${s}`;
const guest = dbWithToken('tGuest', { sub: guestUid, user_id: guestUid, firebase: { sign_in_provider: 'anonymous' } });

// Claim a username the same way src/profile.js saveProfile does (one batch).
const claim = (db, uid, name) => {
  const b = writeBatch(db);
  b.set(doc(db, 'usernames', name), { uid });
  b.set(doc(db, 'profiles', uid), { username: name, usernameLower: name, displayName: 'Test', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return b.commit();
};

console.log('== Upgraded guest (token says anonymous, but has an email) ==');
await allowed('can read their own profile', () => getDoc(doc(upgraded, 'profiles', upgradedUid)));
await allowed('can claim a username', () => claim(upgraded, upgradedUid, `up_${s}`));
check('profile is readable after claiming', (await getDoc(doc(upgraded, 'profiles', upgradedUid))).exists());

console.log('\n== Pure guest (anonymous, no email) ==');
await denied('cannot read profiles', () => getDoc(doc(guest, 'profiles', upgradedUid)));
await denied('cannot claim a username', () => claim(guest, guestUid, `gu_${s}`));
await allowed('can still use their own private data', () => getDoc(doc(guest, 'users', guestUid)));

console.log(failed() ? `\n${failed()} FAILED` : '\nAll token-claim checks passed');
process.exit(failed() ? 1 : 0);
