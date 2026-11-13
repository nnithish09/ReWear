import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { authCalls, authControl, resetAuth } from './mocks/auth.mjs';
import { calls, control, reset } from './mocks/firestore.mjs';
import {
  SILENT_AUTH_ERRORS,
  getAuthErrorMessage,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerWithEmail,
  resetPassword,
} from '../src/services/authService.js';
import { profile } from './helpers/rules.mjs';

beforeEach(() => {
  reset();
  resetAuth();
});

const ops = () => authCalls.map((call) => call.op);

describe('authService (mocked Firebase Auth)', () => {
  test('registerWithEmail: persists session, creates account, sets name, writes users/{uid}', async () => {
    await registerWithEmail({ name: ' Asha K ', email: ' asha@example.com ', password: 'goodpass1' });
    assert.deepEqual(ops(), ['setPersistence', 'createUser', 'updateProfile']);
    assert.equal(authCalls[0].args[0], 'LOCAL');
    assert.equal(authCalls[1].args[0], 'asha@example.com'); // trimmed
    assert.equal(authCalls[2].args[0].displayName, 'Asha K');

    const write = calls.find((call) => call.op === 'setDoc');
    assert.equal(write.path, 'users/new-user');
    assert.equal(write.data.name, 'Asha K');
    assert.ok('createdAt' in write.data, 'createdAt is set for a new profile');
  });

  test('profile documents only contain fields the rules allow', async () => {
    await registerWithEmail({ name: 'Asha K', email: 'a@b.co', password: 'goodpass1' });
    await loginWithGoogle();
    for (const write of calls.filter((call) => call.op === 'setDoc')) {
      for (const key of Object.keys(write.data)) assert.ok(profile.allowed.includes(key), `${key} not allowed by rules`);
      for (const key of profile.required) assert.ok(key in write.data, `${key} missing`);
    }
  });

  test('existing profile is merged without overwriting createdAt', async () => {
    control.docs['users/google-user'] = { id: 'google-user', data: { name: 'Saved Name', email: 'g@example.com' } };
    await loginWithGoogle();
    const write = calls.find((call) => call.op === 'setDoc');
    assert.ok(!('createdAt' in write.data));
    assert.equal(write.data.name, 'Saved Name');
    assert.deepEqual(write.options, { merge: true });
  });

  test('loginWithEmail honours "remember me"', async () => {
    await loginWithEmail({ email: 'a@b.co', password: 'x', remember: true });
    await loginWithEmail({ email: 'a@b.co', password: 'x', remember: false });
    const persistence = authCalls.filter((call) => call.op === 'setPersistence').map((call) => call.args[0]);
    assert.deepEqual(persistence, ['LOCAL', 'SESSION']);
  });

  test('loginWithGoogle opens the popup with account selection and creates the profile', async () => {
    await loginWithGoogle();
    assert.deepEqual(ops(), ['setPersistence', 'popup']);
    assert.deepEqual(authCalls[1].args[0], { prompt: 'select_account' });
    assert.ok(calls.some((call) => call.op === 'setDoc' && call.path === 'users/google-user'));
  });

  test('logout and password reset', async () => {
    await logoutUser();
    await resetPassword(' me@example.com ');
    assert.deepEqual(ops(), ['signOut', 'reset']);
    assert.equal(authCalls[1].args[0], 'me@example.com');
  });

  test('failures propagate to the caller', async () => {
    authControl.failWith = Object.assign(new Error('x'), { code: 'auth/wrong-password' });
    await assert.rejects(() => loginWithEmail({ email: 'a@b.co', password: 'x' }), (e) => e.code === 'auth/wrong-password');
  });

  test('error messages are friendly; closing the Google popup is silent', () => {
    assert.match(getAuthErrorMessage({ code: 'auth/invalid-credential' }), /Incorrect email or password/);
    assert.match(getAuthErrorMessage({ code: 'auth/email-already-in-use' }), /already exists/);
    assert.match(getAuthErrorMessage({ code: 'auth/popup-blocked' }), /popup/i);
    assert.match(getAuthErrorMessage({ code: 'auth/unauthorized-domain' }), /Authorized domains/);
    assert.ok(SILENT_AUTH_ERRORS.includes('auth/popup-closed-by-user'));
    assert.ok(SILENT_AUTH_ERRORS.includes('auth/cancelled-popup-request'));
  });
});
