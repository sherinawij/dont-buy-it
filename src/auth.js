// Accounts on top of the existing anonymous sign-in. Owner: P1 (social features).
//
// - Everyone starts as a GUEST (Firebase anonymous user). The app works fully as a guest.
// - Register = upgrade the guest IN PLACE with email + password (linkWithCredential).
//   The uid stays the same, so this phone's items, savings and Sprout carry over.
// - Sign in = switch to an existing account. The guest's data is NOT merged into it.
// - Sign out = back to a fresh guest (the root layout signs in anonymously again).
// Passwords go straight to Firebase Auth; this app never stores or sees them afterwards.
import { useEffect, useState } from 'react';
import {
  EmailAuthProvider, linkWithCredential, onIdTokenChanged, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { auth } from './firebase';

export const isGuest = (user = auth.currentUser) => !user || user.isAnonymous;

// Tiny change notifier: linking a credential doesn't count as a new sign-in, so we
// nudge listeners ourselves after register to refresh "guest vs account" in the UI.
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

// React hook: the current Firebase user, re-rendering on sign-in, sign-out and upgrades.
export function useAuthUser() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    listeners.add(bump);
    const unsubscribe = onIdTokenChanged(auth, bump);
    return () => {
      listeners.delete(bump);
      unsubscribe();
    };
  }, []);
  const user = auth.currentUser;
  return { user, guest: isGuest(user) };
}

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

// Basic checks before we bother Firebase. Returns an error message or null.
export function validateCredentials(email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) return 'Enter a valid email address.';
  if (String(password ?? '').length < 6) return 'Passwords need at least 6 characters.';
  return null;
}

// Create an account from the current guest: keeps the same uid and all its data.
export async function register(email, password) {
  const user = auth.currentUser;
  if (!user || !user.isAnonymous) throw Object.assign(new Error('Already signed in'), { code: 'app/already-registered' });
  const credential = EmailAuthProvider.credential(normalizeEmail(email), password);
  await linkWithCredential(user, credential);
  // Fresh ID token so security rules immediately see this as a real account, not a guest.
  await user.getIdToken(true);
  notify();
}

// Switch to an existing account. The root layout remounts every screen for the new uid.
export async function signIn(email, password) {
  await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
}

// Back to a fresh guest. The account's data stays safely in the account.
export async function signOutUser() {
  await signOut(auth);
}

// Friendly messages for the errors people actually hit.
export function authErrorMessage(e) {
  switch (e?.code) {
    case 'auth/invalid-email':
      return 'That email address doesn’t look right.';
    case 'auth/missing-password':
    case 'auth/weak-password':
      return 'Passwords need at least 6 characters.';
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Email or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.';
    case 'auth/network-request-failed':
      return 'You seem to be offline. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-token-expired':
    case 'auth/requires-recent-login':
      return 'Your session expired. Please sign in again.';
    case 'auth/operation-not-allowed':
      return 'Email sign-in isn’t switched on for this app yet.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
