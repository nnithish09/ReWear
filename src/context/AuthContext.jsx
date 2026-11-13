import { createContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Firebase restores the persisted session here, so refreshes keep users signed in.
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) setProfile(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Live copy of users/{uid} (name, photo, ...). Re-subscribes when the user changes.
  useEffect(() => {
    if (!user || !db) return undefined;
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => setProfile(snapshot.exists() ? snapshot.data() : null),
      () => setProfile(null)
    );
    return unsubscribe;
  }, [user]);

  const value = useMemo(() => {
    const displayName =
      profile?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'there');
    const photoURL = profile?.photoURL || user?.photoURL || '';
    return { user, profile, loading, displayName, photoURL, email: user?.email || '' };
  }, [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
