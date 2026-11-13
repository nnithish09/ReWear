import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { calls, control, isDeleteField, isServerTimestamp, reset } from './mocks/firestore.mjs';
import { auth } from './mocks/firebaseConfig.mjs';
import {
  addClothing,
  deleteClothing,
  getClothing,
  getClothingById,
  subscribeToWardrobe,
  updateClothing,
} from '../src/services/clothingService.js';
import { fakeJpegDataUrl, formValues } from './helpers/rules.mjs';

beforeEach(() => {
  reset();
  auth.currentUser = { uid: 'user-1' };
});

describe('addClothing (CREATE)', () => {
  test('writes to users/{uid}/wardrobe with the authenticated UID', async () => {
    const id = await addClothing('user-1', formValues, {});
    assert.equal(calls.length, 1);
    assert.equal(calls[0].op, 'addDoc');
    assert.equal(calls[0].path, 'users/user-1/wardrobe');
    assert.match(id, /^new-id-/);
  });

  test('stores the details trimmed, with server timestamps', async () => {
    await addClothing('user-1', formValues, {});
    const data = calls[0].data;
    assert.equal(data.itemName, 'Puma Running Shoes');
    assert.equal(data.brand, 'Puma');
    assert.ok(isServerTimestamp(data.createdAt));
    assert.ok(isServerTimestamp(data.updatedAt));
  });

  test('saves imageBase64 together with the details in ONE write', async () => {
    const image = fakeJpegDataUrl();
    await addClothing('user-1', formValues, { imageBase64: image });
    assert.equal(calls.filter((call) => call.op === 'addDoc').length, 1);
    assert.equal(calls[0].data.imageBase64, image); // not truncated or altered
    assert.equal(calls[0].data.itemName, 'Puma Running Shoes');
  });

  test('without an image no image field is written', async () => {
    await addClothing('user-1', formValues, {});
    assert.ok(!('imageBase64' in calls[0].data));
    assert.ok(!('imageUrl' in calls[0].data));
  });

  test('stray form/state fields are never written', async () => {
    await addClothing('user-1', { ...formValues, id: 'x', createdAt: 1, imageUrl: 'http://x', junk: true }, {});
    assert.deepEqual(Object.keys(calls[0].data).sort(), [
      'brand', 'category', 'color', 'createdAt', 'description', 'itemName',
      'occasion', 'purchaseDate', 'size', 'status', 'updatedAt',
    ]);
  });

  for (const [label, bad] of [
    ['an oversize image', fakeJpegDataUrl(470000)],
    ['a non-image string', 'hello world'],
    ['a blob: URL', 'blob:http://localhost/abc'],
    ['a remote URL', 'https://example.com/a.jpg'],
  ]) {
    test(`refuses ${label} and creates NO record`, async () => {
      await assert.rejects(() => addClothing('user-1', formValues, { imageBase64: bad }), /invalid or exceeds/);
      assert.equal(calls.length, 0);
    });
  }

  test('propagates Firestore failures (e.g. permission-denied) so the UI can keep the form', async () => {
    control.failWith = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
    await assert.rejects(() => addClothing('user-1', formValues, {}), (error) => error.code === 'permission-denied');
  });
});

describe('authentication guard', () => {
  test('no write happens when nobody is signed in', async () => {
    auth.currentUser = null;
    await assert.rejects(() => addClothing('user-1', formValues, {}), /signed in/);
    assert.equal(calls.length, 0);
  });

  test('no write happens when the UID does not match the signed-in user', async () => {
    await assert.rejects(() => addClothing('someone-else', formValues, {}), /signed in/);
    await assert.rejects(() => deleteClothing('someone-else', 'x'), /signed in/);
    await assert.rejects(() => updateClothing('someone-else', 'x', formValues), /signed in/);
    await assert.rejects(() => getClothing('someone-else'), /signed in/);
    assert.equal(calls.length, 0);
  });

  test('refuses to write while the browser is offline', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
    try {
      await assert.rejects(() => addClothing('user-1', formValues, {}), (error) => error.code === 'unavailable');
      assert.equal(calls.length, 0);
    } finally {
      if (original) Object.defineProperty(globalThis, 'navigator', original);
      else delete globalThis.navigator;
    }
  });
});

describe('updateClothing (UPDATE)', () => {
  test('uses updateDoc on the correct document and bumps updatedAt', async () => {
    await updateClothing('user-1', 'item-9', formValues);
    assert.equal(calls[0].op, 'updateDoc');
    assert.equal(calls[0].path, 'users/user-1/wardrobe/item-9');
    assert.ok(isServerTimestamp(calls[0].data.updatedAt));
  });

  test('never touches createdAt or image fields when the image is unchanged', async () => {
    await updateClothing('user-1', 'item-9', formValues);
    const keys = Object.keys(calls[0].data);
    for (const forbidden of ['createdAt', 'imageBase64', 'imageUrl']) assert.ok(!keys.includes(forbidden), forbidden);
  });

  test('replaces the image', async () => {
    const image = fakeJpegDataUrl(2000);
    await updateClothing('user-1', 'item-9', formValues, { imageBase64: image });
    assert.equal(calls[0].data.imageBase64, image);
  });

  test('removes the image with deleteField() on imageBase64 and legacy imageUrl', async () => {
    await updateClothing('user-1', 'item-9', formValues, { remove: true });
    assert.ok(isDeleteField(calls[0].data.imageBase64));
    assert.ok(isDeleteField(calls[0].data.imageUrl));
  });

  test('refuses an invalid replacement image', async () => {
    await assert.rejects(
      () => updateClothing('user-1', 'item-9', formValues, { imageBase64: fakeJpegDataUrl(470000) }),
      /invalid or exceeds/
    );
    assert.equal(calls.length, 0);
  });
});

describe('READ and DELETE', () => {
  test('deleteClothing uses deleteDoc on the right path', async () => {
    await deleteClothing('user-1', 'item-9');
    assert.deepEqual(calls[0], { op: 'deleteDoc', path: 'users/user-1/wardrobe/item-9' });
  });

  test('getClothing maps documents and converts timestamps to Dates', async () => {
    const stamp = { toDate: () => new Date('2026-02-02T00:00:00Z') };
    control.list = [{ id: 'a', data: { itemName: 'Shirt', imageBase64: 'data:image/jpeg;base64,AA', createdAt: stamp, updatedAt: stamp } }];
    const items = await getClothing('user-1');
    assert.equal(items[0].id, 'a');
    assert.equal(items[0].imageBase64, 'data:image/jpeg;base64,AA');
    assert.ok(items[0].createdAt instanceof Date);
  });

  test('getClothingById returns null for a missing document', async () => {
    assert.equal(await getClothingById('user-1', 'nope'), null);
  });

  test('subscribeToWardrobe delivers items, reports errors and returns an unsubscribe function', () => {
    control.list = [{ id: 'a', data: { itemName: 'Shirt' } }];
    let received = null;
    const unsubscribe = subscribeToWardrobe('user-1', (items) => (received = items));
    assert.equal(received[0].id, 'a');
    assert.equal(calls[0].path, 'users/user-1/wardrobe');
    unsubscribe();
    assert.equal(control.unsubscribed, 1);

    control.snapshotError = new Error('denied');
    let failure = null;
    subscribeToWardrobe('user-1', () => {}, (error) => (failure = error));
    assert.equal(failure.message, 'denied');
  });
});
