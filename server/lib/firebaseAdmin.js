// Server-side Firebase access, used ONLY by the leaderboard: verify who's asking, then add up
// friends' totals without ever sending their items to anyone. The service-account key lives only
// in the server's env.
//
// Sign-in tokens are verified with `jose` (Google's public keys + issuer/audience/expiry checks,
// as Firebase documents for third-party JWT libraries) instead of firebase-admin/auth, because
// that module can't load on Vercel's Node runtime (it require()s an ES-module-only package).
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

const emulator = () => Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
let projectId;

function init() {
  if (getApps().length) return getApps()[0];

  // Local tests: the Firebase emulators need no key.
  if (emulator()) {
    projectId = process.env.GCLOUD_PROJECT || 'demo-dontbuyit';
    return initializeApp({ projectId });
  }

  // FIREBASE_SERVICE_ACCOUNT = the service-account JSON, pasted as-is (or base64-encoded).
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  let account;
  try {
    account = JSON.parse(json);
  } catch {
    // Never echo the value: Node's JSON errors quote part of the input.
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON (paste the whole downloaded file)');
  }
  projectId = account.project_id;
  if (!projectId) throw new Error('FIREBASE_SERVICE_ACCOUNT has no project_id');
  return initializeApp({ credential: cert(account) });
}

let db;
export const adminDb = () => {
  if (!db) {
    db = getFirestore(init());
    // REST instead of gRPC: friendlier to serverless functions (uses the service-account key;
    // the local emulator keeps the default transport, which needs no credentials).
    if (!emulator()) db.settings({ preferRest: true });
  }
  return db;
};

// Google's public keys for Firebase ID tokens (cached and rotated by jose).
const GOOGLE_KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// Returns the token's claims ({ uid, email, firebase: { sign_in_provider } ... }) or throws.
export async function verifyIdToken(token) {
  init(); // sets projectId (and fails clearly if the server isn't configured)
  if (emulator()) {
    // The Auth emulator issues unsigned tokens; this branch only exists for local tests.
    const claims = decodeJwt(token);
    return { ...claims, uid: claims.sub };
  }
  const { payload } = await jwtVerify(token, GOOGLE_KEYS, {
    algorithms: ['RS256'],
    issuer: `https://securetoken.google.com/${projectId}`, // issued by Firebase Auth…
    audience: projectId, // …for THIS project
  }); // also checks the signature and that the token hasn't expired
  if (!payload.sub) throw new Error('Token has no user');
  return { ...payload, uid: payload.sub };
}
