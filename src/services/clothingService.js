import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { isUsableImageData } from '../utils/imageSource';

/** Every wardrobe query is scoped to the signed-in user's UID. */
const wardrobeCollection = (uid) => collection(db, 'users', uid, 'wardrobe');
const wardrobeDoc = (uid, itemId) => doc(db, 'users', uid, 'wardrobe', itemId);

/**
 * Every call is scoped to the signed-in user. Firestore attaches the auth token
 * from auth.currentUser, so refuse to run until it matches the UID in the path –
 * otherwise the request would go out unauthenticated and be denied by the rules.
 */
function assertOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const offlineError = new Error('You appear to be offline.');
    offlineError.code = 'unavailable';
    throw offlineError;
  }
}

function requireUid(uid) {
  if (!uid || auth?.currentUser?.uid !== uid) {
    throw new Error('You must be signed in to manage your wardrobe. Please sign in again.');
  }
}

/** Only these fields are ever written, so documents always match the security rules. */
function pickFields(values) {
  return {
    itemName: (values.itemName || '').trim(),
    category: values.category,
    color: values.color,
    size: values.size || '',
    brand: (values.brand || '').trim(),
    occasion: values.occasion,
    description: (values.description || '').trim(),
    status: values.status,
    purchaseDate: values.purchaseDate || '',
  };
}

function toDate(value) {
  return value && typeof value.toDate === 'function' ? value.toDate() : null;
}

function mapClothing(snapshot) {
  // "estimate" gives a local time for server timestamps still pending a round-trip.
  const data = snapshot.data({ serverTimestamps: 'estimate' });
  return {
    id: snapshot.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/**
 * `imageChange.imageBase64` is a complete JPEG data URL produced by
 * utils/imageProcessing (already limited to 450 KiB). It is saved inside the
 * same Firestore document – no Firebase Storage involved.
 */
function assertValidImageData(dataUrl) {
  if (!isUsableImageData(dataUrl)) {
    throw new Error('The image is invalid or exceeds the size limit and was not saved.');
  }
}

export async function addClothing(uid, values, imageChange = {}) {
  requireUid(uid);
  assertOnline();
  const data = { ...pickFields(values) };
  if (imageChange.imageBase64) {
    assertValidImageData(imageChange.imageBase64);
    data.imageBase64 = imageChange.imageBase64;
  }
  const ref = await addDoc(wardrobeCollection(uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getClothing(uid) {
  requireUid(uid);
  const snapshot = await getDocs(query(wardrobeCollection(uid), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(mapClothing);
}

export async function getClothingById(uid, itemId) {
  requireUid(uid);
  const snapshot = await getDoc(wardrobeDoc(uid, itemId));
  return snapshot.exists() ? mapClothing(snapshot) : null;
}

/**
 * Updates only the clothing fields (plus updatedAt). Image fields are touched
 * only when `imageChange` says so:
 *  - { imageBase64 }  → replace the image
 *  - { remove: true } → delete imageBase64 and the legacy imageUrl
 *  - nothing          → image fields are left exactly as stored
 */
export async function updateClothing(uid, itemId, values, imageChange = {}) {
  requireUid(uid);
  assertOnline();
  const data = { ...pickFields(values), updatedAt: serverTimestamp() };
  if (imageChange.imageBase64) {
    assertValidImageData(imageChange.imageBase64);
    data.imageBase64 = imageChange.imageBase64;
  } else if (imageChange.remove) {
    data.imageBase64 = deleteField();
    data.imageUrl = deleteField();
  }
  await updateDoc(wardrobeDoc(uid, itemId), data);
}

export async function deleteClothing(uid, itemId) {
  requireUid(uid);
  await deleteDoc(wardrobeDoc(uid, itemId));
}

/**
 * Real-time listener. Returns the unsubscribe function – callers must invoke it
 * on cleanup.
 */
export function subscribeToWardrobe(uid, onData, onError) {
  requireUid(uid);
  const wardrobeQuery = query(wardrobeCollection(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    wardrobeQuery,
    (snapshot) => onData(snapshot.docs.map(mapClothing)),
    (error) => onError?.(error)
  );
}
