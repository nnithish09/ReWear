/**
 * Exercises the compression/retry LOGIC of src/utils/imageProcessing.js with fake
 * browser APIs (canvas, createImageBitmap, FileReader), so size/quality behaviour can be
 * controlled precisely. Real-browser behaviour must still be checked in Chrome/Edge.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import {
  ImageProcessingError,
  MAX_DATA_URL_LENGTH,
  MAX_ORIGINAL_BYTES,
  processImage,
  validateImageFile,
} from '../src/utils/imageProcessing.js';

const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const makeFile = (name, type, magic = JPEG_MAGIC, extra = 64) =>
  new File([Uint8Array.from([...magic, ...new Array(extra).fill(0)])], name, { type });

// ---- fake browser environment -------------------------------------------------
const env = { width: 3000, height: 2000, bytesPerPixelAtQ1: 1, requests: [], draws: [], closed: 0, blobMode: 'ok', sizes: [] };

class FakeCanvas {
  constructor() { this.width = 0; this.height = 0; }
  getContext() {
    return {
      set fillStyle(value) { env.draws.push(['fillStyle', value]); },
      fillRect: () => env.draws.push(['fillRect']),
      drawImage: (_source, _x, _y, w, h) => env.draws.push(['drawImage', w, h]),
    };
  }
  toBlob(callback, type, quality) {
    env.requests.push({ width: this.width, height: this.height, type, quality });
    setTimeout(() => {
      if (env.blobMode === 'null') return callback(null);
      const size = env.sizes.length ? env.sizes.shift() : Math.round(this.width * this.height * quality * env.bytesPerPixelAtQ1);
      callback(new Blob([new Uint8Array(size)], { type: 'image/jpeg' }));
    }, 0);
  }
}

class FakeFileReader {
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onload();
    });
  }
}

const saved = {};
beforeEach(() => {
  Object.assign(env, { width: 3000, height: 2000, bytesPerPixelAtQ1: 1, requests: [], draws: [], closed: 0, blobMode: 'ok', sizes: [] });
  for (const key of ['document', 'HTMLCanvasElement', 'createImageBitmap', 'FileReader', 'Image']) saved[key] = globalThis[key];
  globalThis.document = { createElement: () => new FakeCanvas() };
  globalThis.HTMLCanvasElement = FakeCanvas;
  globalThis.FileReader = FakeFileReader;
  globalThis.createImageBitmap = async () => ({ width: env.width, height: env.height, close: () => (env.closed += 1) });
});
afterEach(() => {
  for (const key of Object.keys(saved)) {
    if (saved[key] === undefined) delete globalThis[key];
    else globalThis[key] = saved[key];
  }
});

// ---- tests -----------------------------------------------------------------------
describe('validateImageFile', () => {
  test('accepts JPG, PNG and WEBP', () => {
    assert.equal(validateImageFile(makeFile('a.jpg', 'image/jpeg')), '');
    assert.equal(validateImageFile(makeFile('a.png', 'image/png', PNG_MAGIC)), '');
    assert.equal(validateImageFile(makeFile('a.webp', 'image/webp')), '');
  });
  test('rejects unsupported types', () => {
    for (const [name, type] of [['a.gif', 'image/gif'], ['a.pdf', 'application/pdf'], ['a.txt', 'text/plain'], ['a.svg', 'image/svg+xml']]) {
      assert.match(validateImageFile(makeFile(name, type)), /Unsupported file type/);
    }
  });
  test('rejects files over 10 MB, accepts exactly 10 MB', () => {
    const big = new File([new Uint8Array(MAX_ORIGINAL_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' });
    assert.match(validateImageFile(big), /maximum allowed size is 10\.0 MB/);
    const exact = new File([new Uint8Array(MAX_ORIGINAL_BYTES)], 'ok.jpg', { type: 'image/jpeg' });
    assert.equal(validateImageFile(exact), '');
  });
  test('rejects empty files and missing files', () => {
    assert.match(validateImageFile(new File([], 'a.jpg', { type: 'image/jpeg' })), /empty/);
    assert.ok(validateImageFile(null));
  });
});

describe('processImage – resize and encode', () => {
  test('resizes 3000×2000 to 800×533, preserving the aspect ratio', async () => {
    const result = await processImage(makeFile('a.jpg', 'image/jpeg'));
    assert.equal(result.width, 800);
    assert.equal(result.height, 533);
    assert.ok(Math.abs(result.width / result.height - 3000 / 2000) < 0.01);
    assert.equal(env.closed, 1, 'decoded bitmap is released');
  });

  test('portrait images are limited on the height', async () => {
    env.width = 1200; env.height = 3000;
    const result = await processImage(makeFile('a.jpg', 'image/jpeg'));
    assert.equal(result.height, 800);
    assert.equal(result.width, 320);
  });

  test('never upscales small images', async () => {
    env.width = 300; env.height = 200;
    const result = await processImage(makeFile('a.jpg', 'image/jpeg'));
    assert.deepEqual([result.width, result.height], [300, 200]);
  });

  test('outputs a complete JPEG data URL within the limit', async () => {
    const { dataUrl } = await processImage(makeFile('a.png', 'image/png', PNG_MAGIC));
    assert.ok(dataUrl.startsWith('data:image/jpeg;base64,'));
    assert.ok(dataUrl.length <= MAX_DATA_URL_LENGTH);
    assert.match(dataUrl.slice('data:image/jpeg;base64,'.length), /^[A-Za-z0-9+/]*={0,2}$/);
    assert.ok(env.requests.every((request) => request.type === 'image/jpeg'));
  });

  test('transparent areas are painted white before the image is drawn', async () => {
    await processImage(makeFile('a.png', 'image/png', PNG_MAGIC));
    assert.deepEqual(env.draws.slice(0, 3).map((entry) => entry[0]), ['fillStyle', 'fillRect', 'drawImage']);
    assert.deepEqual(env.draws[0], ['fillStyle', '#ffffff']);
  });

  test('reports progress from low to 1', async () => {
    const seen = [];
    await processImage(makeFile('a.jpg', 'image/jpeg'), { onProgress: (value) => seen.push(value) });
    assert.ok(seen.length >= 2);
    assert.equal(seen.at(-1), 1);
    assert.deepEqual([...seen], [...seen].sort((a, b) => a - b));
  });
});

describe('processImage – size limit and retries', () => {
  test('first attempt is quality 0.85 at 800px', async () => {
    env.bytesPerPixelAtQ1 = 0.1;
    await processImage(makeFile('a.jpg', 'image/jpeg'));
    assert.equal(env.requests.length, 1);
    assert.equal(env.requests[0].quality, 0.85);
    assert.equal(Math.max(env.requests[0].width, env.requests[0].height), 800);
  });

  test('over the limit → lowers quality progressively and retries', async () => {
    env.bytesPerPixelAtQ1 = 1; // 800×533: q0.85 ≈ 483k chars (too big), q0.75 ≈ 426k chars (fits)
    const result = await processImage(makeFile('a.jpg', 'image/jpeg'));
    assert.deepEqual(env.requests.map((request) => request.quality), [0.85, 0.75]);
    assert.ok(result.dataUrl.length <= MAX_DATA_URL_LENGTH);
  });

  test('boundary: the largest blob that still fits (460,799 chars) is accepted', async () => {
    env.sizes = [345582]; // 23-char prefix + 4 × ceil(345582 / 3) = 460,799 characters
    const result = await processImage(makeFile('a.jpg', 'image/jpeg'));
    assert.equal(result.dataUrl.length, 460799);
    assert.equal(env.requests.length, 1);
  });

  test('boundary: one byte more (460,803 chars) is rejected and retried at lower quality', async () => {
    env.sizes = [345583, 1000];
    const result = await processImage(makeFile('a.jpg', 'image/jpeg'));
    assert.equal(env.requests.length, 2);
    assert.ok(result.dataUrl.length <= MAX_DATA_URL_LENGTH);
    assert.equal(result.compressedBytes, 1000);
  });

  test('still too big at the lowest quality → shrinks the dimensions and retries', async () => {
    env.bytesPerPixelAtQ1 = 3;
    const result = await processImage(makeFile('a.jpg', 'image/jpeg'));
    assert.ok(Math.max(result.width, result.height) < 800);
    assert.ok(result.dataUrl.length <= MAX_DATA_URL_LENGTH);
    assert.ok(env.requests.length > 5);
  });

  test('impossible to fit → clear error and NO data URL is returned', async () => {
    env.bytesPerPixelAtQ1 = 500;
    await assert.rejects(
      () => processImage(makeFile('a.jpg', 'image/jpeg')),
      (error) => error instanceof ImageProcessingError && /smaller or simpler image/.test(error.message)
    );
    assert.equal(env.closed, 1, 'bitmap released even on failure');
  });
});

describe('processImage – errors', () => {
  test('rejects before decoding anything for invalid files', async () => {
    await assert.rejects(() => processImage(makeFile('a.gif', 'image/gif')), /Unsupported file type/);
    assert.equal(env.requests.length, 0);
  });

  test('a renamed text file is rejected by its signature', async () => {
    const fake = new File([new TextEncoder().encode('this is not an image')], 'fake.jpg', { type: 'image/jpeg' });
    await assert.rejects(() => processImage(fake), /not a valid JPG, PNG or WEBP/);
  });

  test('unreadable / corrupt image (decoder fails, <img> fallback fails) → friendly error', async () => {
    globalThis.createImageBitmap = async () => { throw new Error('decode failed'); };
    globalThis.Image = class { set src(_value) { setTimeout(() => this.onerror(), 0); } };
    await assert.rejects(() => processImage(makeFile('a.jpg', 'image/jpeg')), /could not be read.*corrupted/s);
  });

  test('falls back to <img> decoding when createImageBitmap is unavailable', async () => {
    delete globalThis.createImageBitmap;
    globalThis.Image = class {
      set src(_value) { this.naturalWidth = 1000; this.naturalHeight = 500; setTimeout(() => this.onload(), 0); }
    };
    const result = await processImage(makeFile('a.jpg', 'image/jpeg'));
    assert.deepEqual([result.width, result.height], [800, 400]);
  });

  test('zero-sized image → friendly error', async () => {
    env.width = 0; env.height = 0;
    await assert.rejects(() => processImage(makeFile('a.jpg', 'image/jpeg')), /could not be read/);
  });

  test('canvas cannot produce a JPEG → friendly error (no raw browser message)', async () => {
    env.blobMode = 'null';
    await assert.rejects(() => processImage(makeFile('a.jpg', 'image/jpeg')), /could not convert this image to JPEG/);
  });

  test('browser without canvas.toBlob → clear "unsupported browser" error', async () => {
    globalThis.HTMLCanvasElement = class {};
    await assert.rejects(() => processImage(makeFile('a.jpg', 'image/jpeg')), /does not support the image features/);
  });

  test('errors never contain image data', async () => {
    env.bytesPerPixelAtQ1 = 500;
    await assert.rejects(() => processImage(makeFile('a.jpg', 'image/jpeg')), (error) => !error.message.includes('base64'));
  });
});
