// Cross-platform test runner: `npm test` (needs Node.js 20 or newer, no extra packages).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const files = fs
  .readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => path.join(testsDir, name));

const result = spawnSync(
  process.execPath,
  ['--import', pathToFileURL(path.join(testsDir, 'register.mjs')).href, '--test', '--test-reporter=spec', ...files],
  { stdio: 'inherit' }
);
process.exit(result.status ?? 1);
