import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import ItemImage from './ItemImage';
import { STATUS_STYLES } from '../utils/constants';

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLES[status] || ''}`}>{status}</span>;
}

function ActionButtons({ item, onDelete }) {
  return (
    <div className="flex gap-1.5">
      <Link
        to={`/wardrobe/${item.id}/edit`}
        aria-label={`Edit ${item.itemName}`}
        className="rounded-lg bg-white/90 p-2 text-ink shadow-soft transition hover:bg-white hover:text-clay"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        onClick={() => onDelete(item)}
        aria-label={`Delete ${item.itemName}`}
        className="rounded-lg bg-white/90 p-2 text-ink shadow-soft transition hover:bg-white hover:text-[#B4483F]"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ClothingCard({ item, view = 'grid', onDelete }) {
  const details = [item.color, item.size && `Size ${item.size}`, item.occasion].filter(Boolean);

  if (view === 'list') {
    return (
      <div className="card group flex items-center gap-4 p-3 transition duration-200 hover:shadow-lift">
        <Link to={`/wardrobe/${item.id}`} className="flex min-w-0 flex-1 items-center gap-4">
          <ItemImage
            item={item}
            alt={item.itemName}
            className="h-20 w-20 shrink-0 rounded-xl"
            iconSize="h-7 w-7"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-sans text-base font-semibold">{item.itemName}</h3>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">
              {item.category}
              {item.brand ? ` · ${item.brand}` : ''}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">{details.join(' · ')}</p>
          </div>
        </Link>
        {onDelete && <ActionButtons item={item} onDelete={onDelete} />}
      </div>
    );
  }

  return (
    <div className="card group overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative">
        <Link to={`/wardrobe/${item.id}`} aria-label={`View ${item.itemName}`}>
          <ItemImage
            item={item}
            alt={item.itemName}
            className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.03]"
          />
        </Link>
        <div className="absolute left-3 top-3">
          <StatusBadge status={item.status} />
        </div>
        {onDelete && (
          <div className="absolute right-3 top-3 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <ActionButtons item={item} onDelete={onDelete} />
          </div>
        )}
      </div>
      <Link to={`/wardrobe/${item.id}`} className="block p-4">
        <h3 className="truncate font-sans text-base font-semibold">{item.itemName}</h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {item.category}
          {item.brand ? ` · ${item.brand}` : ''}
        </p>
        <p className="mt-2 truncate text-xs text-muted">{details.join(' · ')}</p>
      </Link>
    </div>
  );
}
