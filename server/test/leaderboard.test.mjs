// Leaderboard tests against LOCAL Firebase emulators, calling the real server code.
// Run from the repo root:
//   npx firebase-tools emulators:exec --only auth,firestore --project demo-dontbuyit "node server/test/leaderboard.test.mjs"
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import {
  acceptFriendRequest, check, failed, phone, registerGuest, removeFriendship, saveProfile, sendFriendRequest,
} from '../../tests/helpers.mjs';
import { endpoint } from '../lib/http.js';
import { leaderboard } from '../lib/leaderboard.js';

// Call the endpoint exactly like Vercel would, with a fake request/response.
async function call(token) {
  const res = {
    code: 0, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; },
    json(o) { this.body = o; return this; },
    end() { return this; },
  };
  const req = { method: 'POST', body: {}, headers: token ? { authorization: `Bearer ${token}` } : {} };
  await endpoint(leaderboard)(req, res);
  return res;
}
const token = (p) => p.auth.currentUser.getIdToken();
const item = (p, id, data) => setDoc(doc(p.db, 'users', p.auth.currentUser.uid, 'items', id), data);

const s = Date.now() % 100000;
const [amy, ben, cal, dee, eve] = ['amy', 'ben', 'cal', 'dee', 'eve'].map((n) => phone(`lb_${n}`));
for (const [p, n] of [[amy, 'amy'], [ben, 'ben'], [cal, 'cal'], [dee, 'dee'], [eve, 'eve']]) {
  await registerGuest(p, `${n}${s}@t.dev`);
  await saveProfile(p, `${n}_${s}`, n[0].toUpperCase() + n.slice(1));
}

// Amy: 60 + 120 (estimate only) count; the bought charger and the undecided lamp don't.
await item(amy, 'hoodie', { name: 'Hoodie', status: 'resisted', price: 60, estimatedPrice: 65 });
await item(amy, 'shoes', { name: 'Shoes', status: 'resisted', price: null, estimatedPrice: 120 });
await item(amy, 'charger', { name: 'Charger', status: 'bought', price: 45 });
await item(amy, 'lamp', { name: 'Lamp', status: 'debating', price: 30 });
await item(ben, 'a', { status: 'resisted', price: 50 });
await item(ben, 'b', { status: 'resisted', price: 25 });
await item(eve, 'a', { status: 'resisted', price: 75 }); // ties with Ben
await item(cal, 'a', { status: 'resisted', price: 500 }); // only a pending request
await item(dee, 'a', { status: 'resisted', price: 1000 }); // a stranger

const benUid = ben.auth.currentUser.uid;
const eveUid = eve.auth.currentUser.uid;
const amyUid = amy.auth.currentUser.uid;
await sendFriendRequest(amy, benUid); await acceptFriendRequest(ben, amyUid);
await sendFriendRequest(eve, amyUid); await acceptFriendRequest(amy, eveUid);
await sendFriendRequest(cal, amyUid); // pending: must NOT appear

console.log('== Amy\'s leaderboard ==');
let r = await call(await token(amy));
console.log('      ', JSON.stringify(r.body?.rows));
check('HTTP 200', r.code === 200);
const rows = r.body.rows;
check('only Amy + accepted friends (no pending Cal, no stranger Dee)', rows.length === 3
  && rows.map((x) => x.displayName).join(',') === 'Amy,Ben,Eve');
check('Amy = 60 + 120 (resisted only; uses estimate when no price)', rows[0].amount === 180 && rows[0].isMe && rows[0].rank === 1);
check('tie: Ben and Eve both rank 2, ordered by username', rows[1].rank === 2 && rows[2].rank === 2 && rows[1].username < rows[2].username);
check('only public fields leave the server', rows.every((x) => Object.keys(x).sort().join() === 'amount,displayName,isMe,rank,username'));
check('the metric is labelled honestly', r.body.label === 'Total spending avoided (self-reported)' && r.body.period === 'all-time');

console.log('\n== Other views ==');
r = await call(await token(ben));
check('Ben sees only Amy and himself (Eve isn\'t his friend)', r.body.rows.map((x) => x.displayName).join(',') === 'Amy,Ben');
r = await call(await token(dee));
check('a stranger sees only themself', r.body.rows.length === 1 && r.body.rows[0].isMe && r.body.rows[0].amount === 1000);

console.log('\n== Consistency ==');
await updateDoc(doc(amy.db, 'users', amyUid, 'items', 'hoodie'), { messages: [{ role: 'user', text: 'again' }] });
r = await call(await token(amy));
check('re-saving a decided item does not double-count', r.body.rows[0].amount === 180);
await item(ben, 'c', { status: 'resisted', price: 200 });
r = await call(await token(amy));
check('new "Don\'t buy it" shows up on refresh (Ben now first)', r.body.rows[0].displayName === 'Ben' && r.body.rows[0].amount === 275);
await removeFriendship(amy, eveUid);
r = await call(await token(amy));
check('removing a friend removes them from the leaderboard', !r.body.rows.some((x) => x.displayName === 'Eve'));

console.log('\n== Access control ==');
check('no token → 401', (await call(null)).code === 401);
check('garbage token → 401', (await call('not-a-real-token')).code === 401);
const guest = phone('lb_guest');
await signInAnonymously(guest.auth);
const g = await call(await token(guest));
check('guest (anonymous) token → 403', g.code === 403);

console.log(failed() ? `\n${failed()} FAILED` : '\nAll leaderboard checks passed');
process.exit(failed() ? 1 : 0);
