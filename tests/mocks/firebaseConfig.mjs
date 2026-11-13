// Stand-in for src/firebase/firebaseConfig.js (which needs Vite's import.meta.env).
export const app = { options: { projectId: 'rewear-e70d6' } };
export const db = { __mock: 'firestore-db' };
export const auth = { currentUser: { uid: 'user-1', email: 'user@example.com' } };
export const firebaseInitError = null;
