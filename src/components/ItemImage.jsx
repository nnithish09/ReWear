import { useEffect, useMemo, useState } from 'react';
import { ImageOff, Shirt } from 'lucide-react';
import { getItemImageSources } from '../utils/imageSource';

/**
 * Clothing photo. Pass either `item` (uses imageBase64 → imageUrl → placeholder)
 * or a plain `src`. If a source fails to load, the next one is tried before
 * falling back to the placeholder.
 */
export default function ItemImage({ item, src, alt, className = '', iconSize = 'h-10 w-10' }) {
  const sources = useMemo(
    () => (item ? getItemImageSources(item) : src ? [src] : []),
    [item, src]
  );
  const [failedCount, setFailedCount] = useState(0);
  const [first, second] = sources;

  useEffect(() => setFailedCount(0), [first, second]);

  const current = sources[failedCount];

  if (!current) {
    const Icon = sources.length > 0 ? ImageOff : Shirt;
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-cream to-sand text-clay/70 ${className}`}
        role="img"
        aria-label={alt || 'No image'}
      >
        <Icon className={iconSize} strokeWidth={1.4} />
      </div>
    );
  }
  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedCount((count) => count + 1)}
      className={`object-cover ${className}`}
    />
  );
}
