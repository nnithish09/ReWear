/**
 * Reads firestore.rules and derives its constraints from the real file, so the
 * tests fail if the rules and the application ever drift apart.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeleteField, isServerTimestamp } from '../mocks/firestore.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const rulesText = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

function section(start, end) {
  const from = rulesText.indexOf(start);
  const to = rulesText.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `section ${start} … ${end} not found in firestore.rules`);
  return rulesText.slice(from, to);
}
const quoted = (text) => [...text.matchAll(/'([^']*)'/g)].map((match) => match[1]);
function list(sectionText, pattern) {
  const match = sectionText.match(pattern);
  assert.ok(match, `pattern ${pattern} not found in firestore.rules`);
  return quoted(match[1]);
}

export const itemSection = section('function validItem', 'match /users/{userId}');
export const profileSection = section('function validProfile', '// Shape of users/{uid}/wardrobe');

export const item = {
  allowed: list(itemSection, /hasOnly\(\[([\s\S]*?)\]\)/),
  required: list(itemSection, /hasAll\(\[([\s\S]*?)\]\)/),
  categories: list(itemSection, /data\.category in \[([\s\S]*?)\]/),
  occasions: list(itemSection, /data\.occasion in \[([\s\S]*?)\]/),
  statuses: list(itemSection, /data\.status in \[([\s\S]*?)\]/),
  maxLength: {},
  nonEmpty: [...itemSection.matchAll(/data\.(\w+)\.size\(\) > 0/g)].map((match) => match[1]),
};
for (const match of itemSection.matchAll(/data(?:\.(\w+)|\['(\w+)'\])\.size\(\) <= (\d+)/g)) {
  item.maxLength[match[1] || match[2]] = Number(match[3]);
}

export const profile = {
  allowed: list(profileSection, /hasOnly\(\[([\s\S]*?)\]\)/),
  required: list(profileSection, /hasAll\(\[([\s\S]*?)\]\)/),
};

const isTimestamp = (value) => isServerTimestamp(value) || value instanceof Date;
const isString = (value) => typeof value === 'string';

/** JS model of validItem() in firestore.rules. Returns a list of violated constraints. */
export function violationsOfItem(data) {
  const problems = [];
  const keys = Object.keys(data);
  keys.filter((key) => !item.allowed.includes(key)).forEach((key) => problems.push(`unexpected field ${key}`));
  item.required.filter((key) => !keys.includes(key)).forEach((key) => problems.push(`missing field ${key}`));

  for (const [field, max] of Object.entries(item.maxLength)) {
    if (!(field in data)) continue; // optional fields (imageUrl, imageBase64) may be absent
    if (!isString(data[field])) problems.push(`${field} must be a string`);
    else if (data[field].length > max) problems.push(`${field} longer than ${max}`);
  }
  for (const field of item.nonEmpty) {
    if (isString(data[field]) && data[field].length === 0) problems.push(`${field} must not be empty`);
  }
  if (!item.categories.includes(data.category)) problems.push('invalid category');
  if (!item.occasions.includes(data.occasion)) problems.push('invalid occasion');
  if (!item.statuses.includes(data.status)) problems.push('invalid status');
  if (!isTimestamp(data.createdAt)) problems.push('createdAt must be a timestamp');
  if (!isTimestamp(data.updatedAt)) problems.push('updatedAt must be a timestamp');
  return problems;
}

/** Document as Firestore would store it after updateDoc(patch) (deleteField removes a key). */
export function applyUpdate(existing, patch) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(patch)) {
    if (isDeleteField(value)) delete merged[key];
    else merged[key] = value;
  }
  return merged;
}

/** The update rule also pins createdAt and requires updatedAt == request.time. */
export function updateRuleViolations(existing, patch) {
  const problems = violationsOfItem(applyUpdate(existing, patch));
  if ('createdAt' in patch) problems.push('createdAt must not change');
  if (!isServerTimestamp(patch.updatedAt)) problems.push('updatedAt must be request.time');
  return problems;
}

/** A complete, valid stored document used as the "existing" record in update tests. */
export const storedItem = {
  itemName: 'Puma Running Shoes',
  category: 'Shoes',
  color: 'White',
  size: 'UK 8',
  brand: 'Puma',
  occasion: 'Sports',
  description: 'Comfortable.',
  status: 'Available',
  purchaseDate: '2026-01-05',
  createdAt: new Date('2026-01-06T10:00:00Z'),
  updatedAt: new Date('2026-01-06T10:00:00Z'),
};

/** Form values as ClothingForm hands them to the pages. */
export const formValues = {
  itemName: '  Puma Running Shoes ',
  category: 'Shoes',
  color: 'White',
  size: 'UK 8',
  brand: ' Puma ',
  occasion: 'Sports',
  purchaseDate: '2026-01-05',
  description: 'Comfortable white running shoes.',
  status: 'Available',
};

export const fakeJpegDataUrl = (length = 50000) => `data:image/jpeg;base64,${'A'.repeat(length)}`;
