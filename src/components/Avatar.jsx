import { useEffect, useState } from 'react';
import { getInitials } from '../utils/format';

export default function Avatar({ name, photoURL, size = 40 }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [photoURL]);

  const style = { width: size, height: size, fontSize: size * 0.38 };

  if (photoURL && !failed) {
    return (
      <img
        src={photoURL}
        alt={name || 'Profile'}
        style={style}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover ring-2 ring-white"
      />
    );
  }
  return (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-clay-soft font-semibold text-clay-dark ring-2 ring-white"
    >
      {getInitials(name)}
    </span>
  );
}
