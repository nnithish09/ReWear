/**
 * Translates the uploader state into the instruction sent to the service:
 *  - a freshly compressed image  → { imageBase64 }
 *  - the user removed the image  → { remove: true }
 *  - nothing changed             → {} (stored image fields stay untouched)
 */
export function buildImageChange({ dataUrl, removed }) {
  if (dataUrl) return { imageBase64: dataUrl };
  if (removed) return { remove: true };
  return {};
}
