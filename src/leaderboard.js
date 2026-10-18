// Fetches the friends-only leaderboard from our backend. Owner: P1 (social features).
// We send the Firebase ID token so the SERVER verifies who you are; the app never sends a user id.
import { auth } from './firebase';
import { authErrorMessage } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
const TIMEOUT_MS = 20000;

// → { label, period, rows: [{ rank, displayName, username, amount, isMe }] }
// Throws an Error whose message is safe to show.
export async function fetchLeaderboard() {
  if (!API_URL) throw new Error('The leaderboard isn’t set up on this build (no API URL).');
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Create an account to use the leaderboard.');

  let token;
  try {
    token = await user.getIdToken(); // refreshed automatically if it expired
  } catch (e) {
    throw new Error(authErrorMessage(e)); // e.g. "Your session expired. Please sign in again."
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_URL}/api/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}',
      signal: controller.signal,
    });
  } catch {
    throw new Error('Couldn’t reach the leaderboard. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 401/403/503 carry a specific, safe message from our server (e.g. "Leaderboard query failed (...)").
    const specific = [401, 403, 503].includes(res.status) && data.error;
    throw new Error(specific || 'The leaderboard is unavailable right now. Try again soon.');
  }
  return data;
}
