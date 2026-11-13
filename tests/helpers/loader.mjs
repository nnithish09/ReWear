/**
 * Node module-resolution hook for the tests:
 *  - swaps the real Firebase SDK + app Firebase config for in-memory mocks
 *    (no network, no real Firestore is ever touched), and
 *  - lets Node resolve the extensionless relative imports used by the Vite source.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const mocksDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'mocks');
const mockUrl = (file) => pathToFileURL(path.join(mocksDir, file)).href;

const PACKAGE_MOCKS = {
  'firebase/firestore': 'firestore.mjs',
  'firebase/auth': 'auth.mjs',
};

export async function resolve(specifier, context, nextResolve) {
  if (PACKAGE_MOCKS[specifier]) {
    return { url: mockUrl(PACKAGE_MOCKS[specifier]), shortCircuit: true };
  }
  if (/firebase\/firebaseConfig$/.test(specifier)) {
    return { url: mockUrl('firebaseConfig.mjs'), shortCircuit: true };
  }
  if (specifier.startsWith('.') && !path.extname(specifier) && context.parentURL?.startsWith('file:')) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    for (const candidate of [`${base}.js`, path.join(base, 'index.js')]) {
      if (fs.existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
