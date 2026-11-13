/**
 * Client-side image pipeline: validate → decode → resize → JPEG → Base64 data URL.
 * Uses only native browser APIs (File, createImageBitmap/Image, Canvas, FileReader).
 */

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp';
export const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_DATA_URL_LENGTH = 460800; // 450 KiB – conservative limit vs. Firestore's 1 MiB document cap
export const MAX_DIMENSION = 800;

const DIMENSION_STEPS = [800, 700, 600, 500, 400, 320];
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];
const DATA_URL_PREFIX = 'data:image/jpeg;base64,';

/** Error whose message is always safe and friendly to show to the user. */
export class ImageProcessingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an error message, or '' when the file passes the basic checks. */
export function validateImageFile(file) {
  if (!file) return 'No file was selected.';
  const hasKnownExtension = /\.(jpe?g|png|webp)$/i.test(file.name || '');
  if (file.type ? !ACCEPTED_TYPES.includes(file.type) : !hasKnownExtension) {
    return 'Unsupported file type. Please choose a JPG, PNG or WEBP image.';
  }
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_ORIGINAL_BYTES) {
    return `This image is ${formatBytes(file.size)}. The maximum allowed size is ${formatBytes(MAX_ORIGINAL_BYTES)}.`;
  }
  return '';
}

/** Checks the file's magic bytes so renamed non-images are rejected early. */
async function hasImageSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return isJpeg || isPng || isWebp;
}

const CORRUPT_MESSAGE = 'This image could not be read. The file may be corrupted — try a different one.';

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close?.(),
      };
    } catch {
      // fall through to the <img> decoder
    }
  }
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, release() {} });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new ImageProcessingError(CORRUPT_MESSAGE));
    };
    image.src = objectUrl;
  });
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.type === 'image/jpeg') resolve(blob);
          else reject(new ImageProcessingError('Your browser could not convert this image to JPEG.'));
        },
        'image/jpeg',
        quality
      );
    } catch {
      reject(new ImageProcessingError('Your browser could not convert this image to JPEG.'));
    }
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new ImageProcessingError('The compressed image could not be encoded.'));
    reader.readAsDataURL(blob);
  });
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Compresses `file` to a JPEG data URL no longer than MAX_DATA_URL_LENGTH.
 * `onProgress(0..1)` is called as compression attempts proceed.
 * Resolves to { dataUrl, width, height, compressedBytes, originalBytes }.
 */
export async function processImage(file, { onProgress } = {}) {
  const validationMessage = validateImageFile(file);
  if (validationMessage) throw new ImageProcessingError(validationMessage);

  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined' || !HTMLCanvasElement.prototype.toBlob) {
    throw new ImageProcessingError('Your browser does not support the image features needed for uploads.');
  }

  let signatureOk = false;
  try {
    signatureOk = await hasImageSignature(file);
  } catch {
    throw new ImageProcessingError(CORRUPT_MESSAGE);
  }
  if (!signatureOk) {
    throw new ImageProcessingError('This file is not a valid JPG, PNG or WEBP image.');
  }

  onProgress?.(0.05);
  const decoded = await decodeImage(file);
  if (!decoded.width || !decoded.height) {
    decoded.release();
    throw new ImageProcessingError(CORRUPT_MESSAGE);
  }

  try {
    const longestSide = Math.max(decoded.width, decoded.height);
    const totalAttempts = DIMENSION_STEPS.length * QUALITY_STEPS.length;
    let attempt = 0;
    let previousSide = 0;

    for (const maxSide of DIMENSION_STEPS) {
      const effectiveSide = Math.min(maxSide, longestSide);
      if (effectiveSide === previousSide) {
        attempt += QUALITY_STEPS.length;
        continue; // image is already smaller than this step – nothing new to try
      }
      previousSide = effectiveSide;

      const scale = effectiveSide / longestSide; // proportional: aspect ratio preserved
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new ImageProcessingError('Your browser could not prepare the image for compression.');
      context.fillStyle = '#ffffff'; // transparent PNG/WEBP areas become white instead of black
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        attempt += 1;
        onProgress?.(Math.min(0.95, 0.05 + (attempt / totalAttempts) * 0.9));
        await nextTick(); // let the UI repaint between heavy steps

        const blob = await canvasToJpegBlob(canvas, quality);
        const dataUrl = await blobToDataUrl(blob);
        // The exact length of the final string is what counts – never accept anything above the limit.
        if (dataUrl.startsWith(DATA_URL_PREFIX) && dataUrl.length <= MAX_DATA_URL_LENGTH) {
          onProgress?.(1);
          return {
            dataUrl,
            width,
            height,
            compressedBytes: blob.size,
            originalBytes: file.size,
          };
        }
      }
    }
    throw new ImageProcessingError(
      'This image is too detailed to compress below the 450 KB limit. Please choose a smaller or simpler image.'
    );
  } finally {
    decoded.release();
  }
}
