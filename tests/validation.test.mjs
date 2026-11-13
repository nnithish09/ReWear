import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isValidEmail,
  validateClothing,
  validateEmail,
  validateLogin,
  validatePassword,
  validateRegistration,
} from '../src/utils/validation.js';
import { EMPTY_CLOTHING } from '../src/utils/constants.js';

const valid = {
  ...EMPTY_CLOTHING,
  itemName: 'Navy linen shirt',
  category: 'Shirts',
  color: 'Navy',
  size: 'M',
  occasion: 'Casual',
  status: 'Available',
};

describe('validateClothing', () => {
  test('accepts a complete valid item (brand, date, description optional)', () => {
    assert.deepEqual(validateClothing(valid), {});
  });

  test('requires name, category, color, size and occasion', () => {
    const errors = validateClothing({ ...valid, itemName: '  ', category: '', color: '', size: '', occasion: '' });
    for (const field of ['itemName', 'category', 'color', 'size', 'occasion']) assert.ok(errors[field], field);
  });

  test('requires a valid availability status', () => {
    assert.ok(validateClothing({ ...valid, status: '' }).status);
    assert.ok(validateClothing({ ...valid, status: 'Lost' }).status);
    for (const status of ['Available', 'Donated', 'Discarded']) assert.equal(validateClothing({ ...valid, status }).status, undefined);
  });

  test('rejects categories and occasions outside the allowed lists', () => {
    assert.ok(validateClothing({ ...valid, category: 'Hats' }).category);
    assert.ok(validateClothing({ ...valid, occasion: 'Beach' }).occasion);
  });

  test('enforces the same length limits as the security rules', () => {
    assert.ok(validateClothing({ ...valid, itemName: 'x'.repeat(101) }).itemName);
    assert.ok(validateClothing({ ...valid, brand: 'x'.repeat(61) }).brand);
    assert.ok(validateClothing({ ...valid, description: 'x'.repeat(1001) }).description);
    assert.deepEqual(validateClothing({ ...valid, itemName: 'x'.repeat(100), description: 'x'.repeat(1000) }), {});
  });

  test('purchase date: optional, must be a real date and not in the future', () => {
    assert.equal(validateClothing({ ...valid, purchaseDate: '' }).purchaseDate, undefined);
    assert.equal(validateClothing({ ...valid, purchaseDate: '2025-01-31' }).purchaseDate, undefined);
    assert.ok(validateClothing({ ...valid, purchaseDate: 'not-a-date' }).purchaseDate);
    const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    assert.ok(validateClothing({ ...valid, purchaseDate: future }).purchaseDate);
  });

  test('image URLs are no longer required or validated (images are uploaded)', () => {
    assert.equal(validateClothing({ ...valid, imageUrl: 'not a url' }).imageUrl, undefined);
  });
});

describe('authentication form validation', () => {
  test('email', () => {
    assert.equal(isValidEmail('a@b.co'), true);
    for (const bad of ['', 'a', 'a@b', 'a b@c.com', '@c.com']) assert.equal(isValidEmail(bad), false, bad);
    assert.ok(validateEmail(''));
    assert.equal(validateEmail(' me@example.com '), '');
  });

  test('password needs 8+ characters with a letter and a number', () => {
    assert.ok(validatePassword(''));
    assert.ok(validatePassword('short1'));
    assert.ok(validatePassword('onlyletters'));
    assert.ok(validatePassword('12345678'));
    assert.equal(validatePassword('goodpass1'), '');
  });

  test('login', () => {
    assert.deepEqual(Object.keys(validateLogin({ email: '', password: '' })).sort(), ['email', 'password']);
    assert.deepEqual(validateLogin({ email: 'a@b.co', password: 'x' }), {});
  });

  test('registration, including confirm-password mismatch', () => {
    const ok = { name: 'Asha K', email: 'a@b.co', password: 'goodpass1', confirmPassword: 'goodpass1' };
    assert.deepEqual(validateRegistration(ok), {});
    assert.ok(validateRegistration({ ...ok, name: 'A' }).name);
    assert.ok(validateRegistration({ ...ok, confirmPassword: 'different1' }).confirmPassword);
    assert.ok(validateRegistration({ ...ok, confirmPassword: '' }).confirmPassword);
  });
});
