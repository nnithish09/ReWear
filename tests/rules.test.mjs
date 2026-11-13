import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { calls, reset } from './mocks/firestore.mjs';
import { addClothing, updateClothing } from '../src/services/clothingService.js';
import { CATEGORIES, OCCASIONS, STATUSES } from '../src/utils/constants.js';
import { MAX_DATA_URL_LENGTH } from '../src/utils/imageProcessing.js';
import {
  fakeJpegDataUrl,
  formValues,
  item,
  itemSection,
  profile,
  rulesText,
  storedItem,
  updateRuleViolations,
  violationsOfItem,
} from './helpers/rules.mjs';

beforeEach(reset);

const stripCommentsAndStrings = (text) =>
  text.replace(/\/\/.*$/gm, '').replace(/'[^']*'/g, "''");

describe('firestore.rules – structure and safety', () => {
  test('starts with rules_version 2 and targets Cloud Firestore', () => {
    assert.match(rulesText, /^rules_version = '2';/);
    assert.match(rulesText, /service cloud\.firestore/);
  });

  test('brackets, braces and parentheses are balanced (syntax sanity check, not a compiler)', () => {
    const code = stripCommentsAndStrings(rulesText);
    for (const [open, close] of [['{', '}'], ['(', ')'], ['[', ']']]) {
      const opens = code.split(open).length - 1;
      const closes = code.split(close).length - 1;
      assert.equal(opens, closes, `unbalanced ${open}${close}`);
    }
  });

  test('never grants unrestricted access', () => {
    assert.doesNotMatch(rulesText, /if\s+true/);
    assert.doesNotMatch(rulesText, /allow[^;]*:\s*if\s+request\.auth\s*!=\s*null\s*;/);
  });

  test('requires authentication and ownership of the users/{userId} path', () => {
    assert.match(rulesText, /request\.auth != null/);
    assert.match(rulesText, /request\.auth\.uid == userId/);
    assert.match(rulesText, /match \/users\/\{userId\}/);
    assert.match(rulesText, /match \/wardrobe\/\{itemId\}/);
    // wardrobe must be nested inside users/{userId}
    assert.ok(rulesText.indexOf('match /users/{userId}') < rulesText.indexOf('match /wardrobe/{itemId}'));
  });

  test('every wardrobe operation is owner-only', () => {
    const wardrobe = rulesText.slice(rulesText.indexOf('match /wardrobe/{itemId}'));
    for (const operation of ['read, delete', 'create', 'update']) {
      assert.match(wardrobe, new RegExp(`allow ${operation}:\\s*if isOwner\\(userId\\)`));
    }
  });

  test('create/update pin timestamps to the server clock and keep createdAt immutable', () => {
    assert.match(rulesText, /request\.resource\.data\.createdAt == request\.time/);
    assert.match(rulesText, /request\.resource\.data\.updatedAt == request\.time/);
    assert.match(rulesText, /request\.resource\.data\.createdAt == resource\.data\.createdAt/);
  });
});

describe('firestore.rules – consistent with the application', () => {
  test('categories, occasions and statuses match the app constants exactly', () => {
    assert.deepEqual([...item.categories].sort(), [...CATEGORIES].sort());
    assert.deepEqual([...item.occasions].sort(), [...OCCASIONS].sort());
    assert.deepEqual([...item.statuses].sort(), [...STATUSES].sort());
  });

  test('imageBase64 is optional, a string and capped at 460800 characters = the app limit', () => {
    assert.ok(item.allowed.includes('imageBase64'));
    assert.ok(!item.required.includes('imageBase64'));
    assert.equal(item.maxLength.imageBase64, 460800);
    assert.equal(MAX_DATA_URL_LENGTH, item.maxLength.imageBase64);
    assert.match(itemSection, /!\('imageBase64' in data\) \|\| \(data\.imageBase64 is string/);
  });

  test('legacy imageUrl stays optional so old records remain valid', () => {
    assert.ok(item.allowed.includes('imageUrl'));
    assert.ok(!item.required.includes('imageUrl'));
  });

  test('required fields are a subset of allowed fields', () => {
    for (const field of item.required) assert.ok(item.allowed.includes(field), field);
    for (const field of ['createdAt', 'updatedAt', 'itemName', 'category', 'color', 'size', 'status']) {
      assert.ok(item.required.includes(field), `${field} should be required`);
    }
  });

  test('profile document fields cover what authService writes', () => {
    for (const field of ['name', 'email', 'photoURL', 'createdAt', 'updatedAt']) {
      assert.ok(profile.allowed.includes(field), field);
    }
    assert.deepEqual([...profile.required].sort(), ['email', 'name']);
  });
});

describe('payloads written by clothingService satisfy the rules model', () => {
  test('CREATE with image', async () => {
    await addClothing('user-1', formValues, { imageBase64: fakeJpegDataUrl() });
    assert.deepEqual(violationsOfItem(calls[0].data), []);
  });

  test('CREATE without image', async () => {
    await addClothing('user-1', formValues, {});
    assert.deepEqual(violationsOfItem(calls[0].data), []);
  });

  test('CREATE with an image right at the limit', async () => {
    const prefix = 'data:image/jpeg;base64,';
    await addClothing('user-1', formValues, { imageBase64: prefix + 'A'.repeat(MAX_DATA_URL_LENGTH - prefix.length) });
    assert.deepEqual(violationsOfItem(calls[0].data), []);
  });

  test('UPDATE without image change, with replacement, and with removal', async () => {
    const withImages = { ...storedItem, imageBase64: fakeJpegDataUrl(), imageUrl: 'https://example.com/old.jpg' };
    await updateClothing('user-1', 'a', formValues);
    await updateClothing('user-1', 'a', formValues, { imageBase64: fakeJpegDataUrl(1000) });
    await updateClothing('user-1', 'a', formValues, { remove: true });
    assert.deepEqual(updateRuleViolations(withImages, calls[0].data), []);
    assert.deepEqual(updateRuleViolations(withImages, calls[1].data), []);
    assert.deepEqual(updateRuleViolations(withImages, calls[2].data), []);
    // legacy record with imageUrl only still passes after an unrelated edit
    assert.deepEqual(updateRuleViolations({ ...storedItem, imageUrl: 'https://example.com/a.jpg' }, calls[0].data), []);
  });
});

describe('rules model rejects bad data (proves the checks are real)', () => {
  const valid = async () => {
    await addClothing('user-1', formValues, {});
    return { ...calls[0].data };
  };

  test('unexpected field', async () => {
    assert.ok(violationsOfItem({ ...(await valid()), isAdmin: true }).length > 0);
  });
  test('invalid category / occasion / status', async () => {
    const data = await valid();
    assert.ok(violationsOfItem({ ...data, category: 'Hats' }).length > 0);
    assert.ok(violationsOfItem({ ...data, occasion: 'Beach' }).length > 0);
    assert.ok(violationsOfItem({ ...data, status: 'Lost' }).length > 0);
  });
  test('image too long or not a string', async () => {
    const data = await valid();
    assert.ok(violationsOfItem({ ...data, imageBase64: 'x'.repeat(460801) }).length > 0);
    assert.ok(violationsOfItem({ ...data, imageBase64: 12345 }).length > 0);
  });
  test('missing required field / client-supplied createdAt string', async () => {
    const data = await valid();
    const { color, ...withoutColor } = data;
    assert.ok(violationsOfItem(withoutColor).length > 0);
    assert.ok(violationsOfItem({ ...data, createdAt: '2020-01-01' }).length > 0);
  });
  test('update that rewrites createdAt is rejected', async () => {
    await updateClothing('user-1', 'a', formValues);
    assert.ok(updateRuleViolations(storedItem, { ...calls[0].data, createdAt: new Date() }).length > 0);
  });
});
