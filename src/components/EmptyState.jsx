import { Link } from 'react-router-dom';
import { Plus, Shirt } from 'lucide-react';

export default function EmptyState({
  title = 'Your wardrobe is empty',
  message = 'Add your first clothing item to start building your digital wardrobe.',
  actionLabel = 'Add your first item',
  actionTo = '/wardrobe/add',
  icon: Icon = Shirt,
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-clay-soft text-clay-dark">
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">{message}</p>
      {actionLabel && (
        <Link to={actionTo} className="btn-primary mt-6">
          <Plus className="h-4 w-4" /> {actionLabel}
        </Link>
      )}
    </div>
  );
}
