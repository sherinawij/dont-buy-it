// POST /api/leaderboard — the signed-in user + their ACCEPTED friends, ranked by
// "Total spending avoided (self-reported)", all time.
//
// Security model:
// - Who you are comes from a verified Firebase ID token (Authorization: Bearer ...), never from the body.
// - Guests (anonymous) are refused: leaderboards need a real account.
// - Firestore adds up each person's amounts on the server (sum aggregation): no items are downloaded,
//   and only ONE number per person leaves: no items, prices, dates or chats.
// - Nothing is stored, so there's no total that could go stale or be faked; firestore.rules keep the
//   underlying amounts valid and stop a decision from being changed or re-counted.
// The Admin SDK is loaded on first use (not at import), so a setup problem returns a clear
// 503 message instead of crashing the whole serverless function.
let admin;
async function loadAdmin() {
  if (admin) return admin;
  try {
    const { adminDb, verifyIdToken } = await import('./firebaseAdmin.js');
    const db = adminDb(); // throws if FIREBASE_SERVICE_ACCOUNT is missing or invalid
    admin = { db, verifyIdToken };
    return admin;
  } catch (e) {
    console.error('Leaderboard setup failed:', e);
    const firstLine = String(e.message).split(/\r?\n/)[0];
    throw new HttpError(503, `Leaderboard isn’t set up on the server: ${firstLine}`);
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true; // our own message, safe to show
  }
}

const MAX_PARTICIPANTS = 50;

const round2 = (n) => Math.round(n * 100) / 100;

async function verifiedUser(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'Sign in to see the leaderboard.');
  // Load first, outside the try: a server setup problem must surface as its own clear 503,
  // not be mistaken for an expired sign-in.
  const { verifyIdToken } = await loadAdmin();
  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch {
    throw new HttpError(401, 'Your session expired. Please sign in again.');
  }
  // Same rule as firestore.rules registered(): an upgraded guest may still say 'anonymous'
  // but has an email; a pure guest has neither.
  if (decoded.firebase?.sign_in_provider === 'anonymous' && !decoded.email) {
    throw new HttpError(403, 'Create an account to use the leaderboard.');
  }
  return decoded.uid;
}

// Spending avoided for one person: the same number as the app's jar (src/calc.js totalSaved:
// price ?? estimatedPrice over items they chose not to buy). Each item counts once.
// One equality filter + two small fields: works with Firestore's automatic indexes (a sum
// aggregation with filters needed a composite index the project doesn't have). Runs on the
// server, so no items ever reach anyone's phone. Non-numbers (legacy data) count as 0.
const MAX_ITEM = 1000000; // same cap as firestore.rules
const amountOf = (d) => {
  const v = Number(d.price ?? d.estimatedPrice ?? 0);
  return Number.isFinite(v) && v > 0 ? Math.min(v, MAX_ITEM) : 0;
};
async function spendingAvoided(db, uid) {
  const snap = await db
    .collection('users').doc(uid).collection('items')
    .where('status', '==', 'resisted')
    .select('price', 'estimatedPrice')
    .get();
  return round2(snap.docs.reduce((sum, d) => sum + amountOf(d.data()), 0));
}

export async function leaderboard(body, req) {
  // Setup probe for deploys: POST {"check": true} reports whether the server side is configured.
  // Needs no sign-in and reveals nothing about users.
  if (body?.check === true) {
    const info = {
      environment: process.env.VERCEL_ENV ?? 'local', // production / preview / local
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null,
      // Variable NAMES only (never values), to spot a missing or misspelled key.
      firebaseVariables: Object.keys(process.env).filter((k) => /firebase/i.test(k)),
    };
    try {
      await loadAdmin();
      return { ok: true, ...info };
    } catch (e) {
      return { ok: false, error: e.message, ...info };
    }
  }
  const me = await verifiedUser(req);
  const { db } = await loadAdmin();

  // My accepted friends only. Pending requests and strangers never appear.
  const friendships = await db.collection('friendships').where('members', 'array-contains', me).get();
  const friendUids = friendships.docs
    .map((d) => d.data())
    .filter((f) => f.status === 'accepted')
    .map((f) => f.members.find((m) => m !== me))
    .filter(Boolean);
  const uids = [me, ...new Set(friendUids)].slice(0, MAX_PARTICIPANTS);

  let profiles, amounts;
  try {
    profiles = await db.getAll(...uids.map((uid) => db.collection('profiles').doc(uid)));
    amounts = await Promise.all(uids.map((uid) => spendingAvoided(db, uid)));
  } catch (e) {
    console.error('Leaderboard query failed:', e);
    // No user data in this message: just the Firestore error code and its first line.
    const firstLine = String(e.message).split(/\r?\n/)[0].slice(0, 200);
    throw new HttpError(503, `Leaderboard query failed (${e.code ?? 'error'}): ${firstLine}`);
  }

  const rows = uids.map((uid, i) => {
    const p = profiles[i].exists ? profiles[i].data() : null;
    return {
      isMe: uid === me,
      displayName: p?.displayName ?? (uid === me ? 'You' : 'Friend'),
      username: p?.username ?? '',
      amount: amounts[i],
      sortName: p?.usernameLower ?? '',
      sortId: uid,
    };
  });

  // Highest first. Ties: alphabetical by username, then a stable id, so the order never flickers.
  rows.sort((a, b) => b.amount - a.amount || a.sortName.localeCompare(b.sortName) || a.sortId.localeCompare(b.sortId));

  // Equal amounts share a rank (1, 1, 3).
  let rank = 0;
  const ranked = rows.map((r, i) => {
    if (i === 0 || r.amount !== rows[i - 1].amount) rank = i + 1;
    return { rank, displayName: r.displayName, username: r.username, amount: r.amount, isMe: r.isMe };
  });

  return {
    metric: 'spendingAvoided',
    label: 'Total spending avoided (self-reported)',
    period: 'all-time',
    rows: ranked,
  };
}
