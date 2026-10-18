// Item rules: the app's real write paths keep working, while inflated, malformed or re-counted
// amounts are blocked. These amounts feed Home's jar, Sprout and the friends leaderboard.
// Runs on LOCAL Firebase emulators (see tests/friends-rules.test.mjs for the command).
import { signInAnonymously } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  allowed, check, createItem, decideItem, denied, failed, phone, registerGuest, updateItem,
} from './helpers.mjs';

const s = Date.now() % 100000;
const A = phone('iA'), B = phone('iB'), G = phone('iGuest');
await registerGuest(A, `ia${s}@t.dev`);
await registerGuest(B, `ib${s}@t.dev`);
await signInAnonymously(G.auth);
const a = A.auth.currentUser.uid;
const items = (p) => collection(p.db, 'users', p.auth.currentUser.uid, 'items');

console.log('== The app\'s real write paths still work (Add → debate → decide) ==');
const hoodie = await allowed('guest creates an item (Add screen)', () => createItem(G, { name: 'Hoodie', price: 60, estimatedPrice: 65, category: 'clothing' }));
await allowed('debate saves messages + criteria', () => updateItem(G, hoodie, { messages: [{ role: 'sprout', text: 'NO' }, { role: 'user', text: 'pls' }], criteriaMet: ['frequent_use'] }));
await allowed('"Don\'t buy it" records the decision', () => decideItem(G, hoodie, { status: 'resisted', outcome: 'sprout_won' }));
await allowed('debate can still save messages after deciding', () => updateItem(G, hoodie, { messages: [{ role: 'sprout', text: 'YOU DID IT' }], criteriaMet: ['frequent_use'] }));
const charger = await allowed('manual fallback item with no estimate', () => createItem(G, { name: 'Charger', price: 45 }));
await allowed('"Buy anyway" after a concession', () => decideItem(G, charger, { status: 'bought', outcome: 'user_won' }));
const pills = await allowed('estimate-only essential item', () => createItem(G, { name: 'Ibuprofen', estimatedPrice: 9, essential: true }));
await allowed('essential bought', () => decideItem(G, pills, { status: 'bought', outcome: 'essential' }));
const cam = await allowed('item for the (stretch) alternative path', () => createItem(G, { name: 'Camera', price: 500 }));
await allowed('alternative with a lower price', () => decideItem(G, cam, { status: 'bought', outcome: 'alternative', chosenAlternative: 'used', alternativePrice: 320 }));
await allowed('settings doc still writable', () => setDoc(doc(G.db, 'users', G.auth.currentUser.uid), { hourlyWage: 20 }, { merge: true }));
await allowed('other private sub-collections still owner-only and writable', () => setDoc(doc(G.db, 'users', G.auth.currentUser.uid, 'misc', 'x'), { ok: true }));

console.log('\n== Amounts can\'t be inflated or faked ==');
const base = { name: 'X', category: 'other', link: null, essential: false, messages: [], criteriaMet: [], outcome: null, decidedAt: null };
await denied('cannot create an item that is already "resisted"', () => addDoc(items(A), { ...base, price: 10, estimatedPrice: null, status: 'resisted' }));
await denied('cannot create a billion-dollar item', () => addDoc(items(A), { ...base, price: 1e9, estimatedPrice: null, status: 'debating' }));
await denied('cannot use a text price', () => addDoc(items(A), { ...base, price: '60', estimatedPrice: null, status: 'debating' }));
await denied('cannot use a negative price', () => addDoc(items(A), { ...base, price: -5, estimatedPrice: null, status: 'debating' }));
await denied('cannot use an unknown status', () => addDoc(items(A), { ...base, price: 5, estimatedPrice: null, status: 'saved' }));
const shoes = await createItem(A, { name: 'Shoes', price: 120 });
await denied('cannot decide with an unknown outcome', () => decideItem(A, shoes, { status: 'resisted', outcome: 'jackpot' }));
await decideItem(A, shoes, { status: 'resisted', outcome: 'sprout_won' });
await denied('a decided item cannot go back to debating (no re-counting)', () => updateItem(A, shoes, { status: 'debating' }));
await denied('a decided item cannot switch decision', () => decideItem(A, shoes, { status: 'bought', outcome: 'overridden' }));
await denied('a decided item\'s price cannot be raised later', () => updateItem(A, shoes, { price: 999999 }));
await denied('a decided item\'s estimate cannot be changed later', () => updateItem(A, shoes, { estimatedPrice: 5000 }));
check('the decided item is unchanged', (await getDoc(doc(A.db, 'users', a, 'items', shoes))).data().price === 120);

console.log('\n== Nobody can touch someone else\'s items ==');
await denied('another account cannot read my items', () => getDoc(doc(B.db, 'users', a, 'items', shoes)));
await denied('another account cannot add items to my catalog', () => createItem({ ...B, auth: { currentUser: { uid: a } } }, { name: 'Gift', price: 1000 }));
await denied('another account cannot edit my items', () => updateDoc(doc(B.db, 'users', a, 'items', shoes), { messages: [] }));
await denied('another account cannot write my settings', () => setDoc(doc(B.db, 'users', a), { hourlyWage: 1 }, { merge: true }));

console.log(failed() ? `\n${failed()} FAILED` : '\nAll item rule checks passed');
process.exit(failed() ? 1 : 0);
