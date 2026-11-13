import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

const AUTH_ERRORS = {
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/network-request-failed': 'Network error. Check your internet connection and try again.',
  'auth/popup-blocked': 'The sign-in popup was blocked. Allow popups for this site and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
  'auth/unauthorized-domain':
    'This domain is not authorized for sign-in. Add it under Firebase Console → Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase Console.',
};

/** Errors that mean the user simply closed the popup – not worth an error toast. */
export const SILENT_AUTH_ERRORS = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

export function getAuthErrorMessage(error) {
  return AUTH_ERRORS[error?.code] || error?.message || 'Something went wrong. Please try again.';
}

/** Creates users/{uid} on first sign-in; refreshes name/photo on later sign-ins. */
export async function ensureUserProfile(user, overrides = {}) {
  const profileRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(profileRef);
  const base = {
    name: overrides.name || user.displayName || (user.email ? user.email.split('@')[0] : 'ReWear user'),
    email: user.email || '',
    photoURL: user.photoURL || '',
    updatedAt: serverTimestamp(),
  };
  if (snapshot.exists()) {
    // Keep a name the user already has unless we were explicitly given a new one.
    const existing = snapshot.data();
    await setDoc(
      profileRef,
      { ...base, name: overrides.name || existing.name || base.name },
      { merge: true }
    );
  } else {
    await setDoc(profileRef, { ...base, createdAt: serverTimestamp() });
  }
}

export async function registerWithEmail({ name, email, password }) {
  await setPersistence(auth, browserLocalPersistence);
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  await ensureUserProfile(credential.user, { name: name.trim() });
  return credential.user;
}

export async function loginWithEmail({ email, password, remember = true }) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export function logoutUser() {
  return signOut(auth);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}
