// In-memory stand-in for 'firebase/firestore' that records every call it receives.
export const calls = [];
export const control = { failWith: null, docs: {}, list: [], snapshotError: null, unsubscribed: 0 };

export function reset() {
  calls.length = 0;
  control.failWith = null;
  control.docs = {};
  control.list = [];
  control.snapshotError = null;
  control.unsubscribed = 0;
}

const SERVER_TIMESTAMP = Object.freeze({ __op: 'serverTimestamp' });
const DELETE_FIELD = Object.freeze({ __op: 'deleteField' });
export const isServerTimestamp = (value) => value === SERVER_TIMESTAMP;
export const isDeleteField = (value) => value === DELETE_FIELD;

export const serverTimestamp = () => SERVER_TIMESTAMP;
export const deleteField = () => DELETE_FIELD;
export const collection = (_db, ...segments) => ({ type: 'collection', path: segments.join('/') });
export const doc = (_db, ...segments) => ({ type: 'doc', path: segments.join('/') });
export const orderBy = (field, direction) => ({ field, direction });
export const query = (ref) => ref;

function maybeFail() {
  if (control.failWith) throw control.failWith;
}
const wrap = (entry) => ({ id: entry.id, data: () => entry.data });

let counter = 0;
export async function addDoc(ref, data) {
  calls.push({ op: 'addDoc', path: ref.path, data });
  maybeFail();
  counter += 1;
  return { id: `new-id-${counter}` };
}
export async function setDoc(ref, data, options) {
  calls.push({ op: 'setDoc', path: ref.path, data, options });
  maybeFail();
}
export async function updateDoc(ref, data) {
  calls.push({ op: 'updateDoc', path: ref.path, data });
  maybeFail();
}
export async function deleteDoc(ref) {
  calls.push({ op: 'deleteDoc', path: ref.path });
  maybeFail();
}
export async function getDoc(ref) {
  calls.push({ op: 'getDoc', path: ref.path });
  const found = control.docs[ref.path];
  return found
    ? { exists: () => true, id: found.id, data: () => found.data }
    : { exists: () => false };
}
export async function getDocs(ref) {
  calls.push({ op: 'getDocs', path: ref.path });
  return { docs: control.list.map(wrap) };
}
export function onSnapshot(ref, onNext, onError) {
  calls.push({ op: 'onSnapshot', path: ref.path });
  if (control.snapshotError) onError?.(control.snapshotError);
  else onNext({ docs: control.list.map(wrap) });
  return () => {
    control.unsubscribed += 1;
  };
}
