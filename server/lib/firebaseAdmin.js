// Firebase Admin SDK, used ONLY by the leaderboard (to verify sign-ins and add up friends' totals
// without ever sending their items to anyone). The service-account key lives only in the server's env.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function init() {
  if (getApps().length) return getApps()[0];

  // Local tests: the Firebase emulators need no key.
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-dontbuyit' });
  }

  // FIREBASE_SERVICE_ACCOUNT = the service-account JSON, pasted as-is (or base64-encoded).
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  let account;
  try {
    account = JSON.parse(json);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON (paste the whole downloaded file)');
  }
  return initializeApp({ credential: cert(account) });
}

export const adminAuth = () => getAuth(init());
export const adminDb = () => getFirestore(init());
