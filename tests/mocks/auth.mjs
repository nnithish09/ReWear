// In-memory stand-in for 'firebase/auth' that records every call it receives.
export const authCalls = [];
export const authControl = { failWith: null };

export function resetAuth() {
  authCalls.length = 0;
  authControl.failWith = null;
}

const record = (op, args) => {
  authCalls.push({ op, args });
  if (authControl.failWith) throw authControl.failWith;
};

export const browserLocalPersistence = { type: 'LOCAL' };
export const browserSessionPersistence = { type: 'SESSION' };

export class GoogleAuthProvider {
  setCustomParameters(params) {
    this.params = params;
  }
}

export const setPersistence = async (_auth, persistence) => record('setPersistence', [persistence.type]);
export const createUserWithEmailAndPassword = async (_auth, email, password) => {
  record('createUser', [email, password]);
  return { user: { uid: 'new-user', email, displayName: null, photoURL: null } };
};
export const signInWithEmailAndPassword = async (_auth, email, password) => {
  record('signIn', [email, password]);
  return { user: { uid: 'user-1', email, displayName: 'Existing User', photoURL: null } };
};
export const signInWithPopup = async (_auth, provider) => {
  record('popup', [provider.params]);
  return { user: { uid: 'google-user', email: 'g@example.com', displayName: 'Google User', photoURL: 'https://x/p.jpg' } };
};
export const updateProfile = async (_user, profile) => record('updateProfile', [profile]);
export const sendPasswordResetEmail = async (_auth, email) => record('reset', [email]);
export const signOut = async () => record('signOut', []);
