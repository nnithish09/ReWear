import { MAX_DATA_URL_LENGTH } from './imageProcessing';

/** True for a complete, size-limited image data URL (cheap check – no regex over the payload). */
export function isUsableImageData(value) {
  return (
    typeof value === 'string' &&
    value.length <= MAX_DATA_URL_LENGTH &&
    value.startsWith('data:image/') &&
    value.includes(';base64,')
  );
}

/**
 * Image candidates for an item, in priority order:
 * 1. imageBase64 (if valid), 2. legacy imageUrl. When both exist, the URL is the
 * fallback used if the Base64 data fails to render.
 */
export function getItemImageSources(item) {
  const sources = [];
  if (isUsableImageData(item?.imageBase64)) sources.push(item.imageBase64);
  if (typeof item?.imageUrl === 'string' && item.imageUrl.trim()) sources.push(item.imageUrl.trim());
  return sources;
}
