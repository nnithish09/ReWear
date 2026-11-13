import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getFirestoreErrorMessage } from '../src/utils/firebaseErrors.js';
import { buildImageChange } from '../src/utils/imageChange.js';
import { getItemImageSources, isUsableImageData } from '../src/utils/imageSource.js';
import { createSingleFlight } from '../src/utils/singleFlight.js';
import { formatBytes } from '../src/utils/imageProcessing.js';

describe('image source priority (imageBase64 → imageUrl → placeholder)', () => {
  const data = 'data:image/jpeg;base64,AAAA';

  test('imageBase64 wins, imageUrl is the fallback', () => {
    assert.deepEqual(getItemImageSources({ imageBase64: data, imageUrl: 'https://x/a.jpg' }), [data, 'https://x/a.jpg']);
  });
  test('legacy records with only imageUrl keep working', () => {
    assert.deepEqual(getItemImageSources({ imageUrl: ' https://x/a.jpg ' }), ['https://x/a.jpg']);
  });
  test('no image at all → empty list (placeholder is shown)', () => {
    assert.deepEqual(getItemImageSources({}), []);
    assert.deepEqual(getItemImageSources(null), []);
    assert.deepEqual(getItemImageSources({ imageUrl: '   ' }), []);
  });
  test('invalid imageBase64 is ignored in favour of imageUrl', () => {
    assert.deepEqual(getItemImageSources({ imageBase64: 'garbage', imageUrl: 'https://x/a.jpg' }), ['https://x/a.jpg']);
    assert.deepEqual(getItemImageSources({ imageBase64: 42 }), []);
  });
  test('isUsableImageData', () => {
    assert.equal(isUsableImageData(data), true);
    assert.equal(isUsableImageData('data:text/plain;base64,AA'), false);
    assert.equal(isUsableImageData('data:image/png,notbase64'), false);
    assert.equal(isUsableImageData('data:image/jpeg;base64,' + 'A'.repeat(460800)), false); // over the limit
    assert.equal(isUsableImageData(undefined), false);
  });
});

describe('buildImageChange', () => {
  test('a new image is passed through unchanged (nothing is discarded)', () => {
    const dataUrl = 'data:image/jpeg;base64,' + 'Q'.repeat(1000);
    assert.equal(buildImageChange({ dataUrl, removed: false }).imageBase64, dataUrl);
  });
  test('a new image wins over a previous removal', () => {
    assert.deepEqual(Object.keys(buildImageChange({ dataUrl: 'data:image/jpeg;base64,AA', removed: true })), ['imageBase64']);
  });
  test('explicit removal and no-change', () => {
    assert.deepEqual(buildImageChange({ dataUrl: null, removed: true }), { remove: true });
    assert.deepEqual(buildImageChange({ dataUrl: null, removed: false }), {});
  });
});

describe('createSingleFlight (duplicate-submit protection)', () => {
  test('a second call while the first is running is skipped', async () => {
    const run = createSingleFlight();
    let executions = 0;
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    const task = async () => {
      executions += 1;
      await gate;
      return 'saved';
    };
    const first = run(task);
    const second = run(task); // same tick, e.g. a double click
    const third = run(task);
    release();
    const results = await Promise.all([first, second, third]);
    assert.equal(executions, 1);
    assert.deepEqual(results.map((r) => r.skipped), [false, true, true]);
    assert.equal(results[0].value, 'saved');
  });

  test('the lock is released after success and after failure', async () => {
    const run = createSingleFlight();
    await run(async () => 1);
    assert.equal((await run(async () => 2)).value, 2);
    await assert.rejects(() => run(async () => { throw new Error('boom'); }), /boom/);
    assert.equal((await run(async () => 3)).value, 3);
  });
});

describe('getFirestoreErrorMessage', () => {
  test('permission-denied tells the user to publish the rules', () => {
    assert.match(getFirestoreErrorMessage({ code: 'permission-denied' }), /publish the latest firestore\.rules/i);
  });
  test('other known codes and fallbacks', () => {
    assert.match(getFirestoreErrorMessage({ code: 'unauthenticated' }), /sign in/i);
    assert.match(getFirestoreErrorMessage({ code: 'unavailable' }), /internet/i);
    assert.equal(getFirestoreErrorMessage(new Error('custom')), 'custom');
    assert.ok(getFirestoreErrorMessage(null).length > 0);
  });
});

test('formatBytes', () => {
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(10 * 1024 * 1024), '10.0 MB');
});
