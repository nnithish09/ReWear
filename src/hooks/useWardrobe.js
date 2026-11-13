import { useEffect, useMemo, useState } from 'react';
import { subscribeToWardrobe } from '../services/clothingService';
import { useAuth } from './useAuth';

/**
 * Subscribes to the signed-in user's wardrobe in real time and derives
 * dashboard statistics from the live Firestore documents.
 */
export function useWardrobe() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToWardrobe(
      uid,
      (nextItems) => {
        setItems(nextItems);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
    return unsubscribe; // detach the listener on unmount or when the user changes
  }, [uid]);

  const stats = useMemo(() => {
    const counts = {};
    let available = 0;
    let donated = 0;
    let discarded = 0;
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
      if (item.status === 'Available') available += 1;
      else if (item.status === 'Donated') donated += 1;
      else if (item.status === 'Discarded') discarded += 1;
    });
    const categoryCounts = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return {
      total: items.length,
      available,
      donated,
      discarded,
      categories: categoryCounts.length,
      categoryCounts,
    };
  }, [items]);

  return { items, loading, error, stats };
}

export default useWardrobe;
