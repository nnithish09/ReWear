import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ItemImage from '../components/ItemImage';
import { useAuth } from '../hooks/useAuth';
import { deleteClothing, getClothingById, updateClothing } from '../services/clothingService';
import { getFirestoreErrorMessage } from '../utils/firebaseErrors';
import { STATUSES, STATUS_STYLES } from '../utils/constants';
import { formatDate, formatDateTime } from '../utils/format';

function Detail({ label, value }) {
  return (
    <div className="rounded-xl bg-cream/70 px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}

export default function ClothingDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClothingById(user.uid, id)
      .then((result) => {
        if (!cancelled) setItem(result);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getFirestoreErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.uid, id]);

  const handleStatusChange = async (status) => {
    if (status === item.status || statusSaving) return;
    setStatusSaving(true);
    try {
      await updateClothing(user.uid, id, { ...item, status }); // images are untouched
      setItem((current) => ({ ...current, status, updatedAt: new Date() }));
      toast.success(`Marked as ${status.toLowerCase()}.`);
    } catch (error) {
      toast.error(`Could not update status: ${getFirestoreErrorMessage(error)}`);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteClothing(user.uid, id);
      toast.success(`"${item.itemName}" was deleted.`);
      navigate('/wardrobe', { replace: true });
    } catch (error) {
      toast.error(`Could not delete the item: ${getFirestoreErrorMessage(error)}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24" role="status" aria-label="Loading item">
        <Loader2 className="h-8 w-8 animate-spin text-clay" />
      </div>
    );
  }

  if (!item) {
    return (
      <EmptyState
        title="Item not found"
        message={loadError || "This item doesn't exist or has been deleted."}
        actionLabel="Back to wardrobe"
        actionTo="/wardrobe"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Link to="/wardrobe" className="btn-ghost !px-2 !py-1.5 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to wardrobe
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <ItemImage
            item={item}
            alt={item.itemName}
            className="aspect-[4/5] w-full"
            iconSize="h-20 w-20"
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`badge ${STATUS_STYLES[item.status] || ''}`}>{item.status}</span>
            <span className="text-sm text-muted">{item.category}</span>
          </div>
          <h1 className="mt-2 text-4xl">{item.itemName}</h1>
          {item.brand && <p className="mt-1 text-muted">by {item.brand}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-3">
            <Detail label="Category" value={item.category} />
            <Detail label="Brand" value={item.brand} />
            <Detail label="Color" value={item.color} />
            <Detail label="Size" value={item.size} />
            <Detail label="Occasion" value={item.occasion} />
            <Detail label="Purchase date" value={formatDate(item.purchaseDate)} />
            <Detail label="Date added" value={formatDateTime(item.createdAt)} />
            <Detail label="Last updated" value={formatDateTime(item.updatedAt)} />
          </dl>

          {item.description && (
            <div className="mt-5">
              <h2 className="text-lg">Description</h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{item.description}</p>
            </div>
          )}

          <div className="mt-6">
            <p className="label">Availability</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Availability">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  role="radio"
                  aria-checked={item.status === status}
                  disabled={statusSaving}
                  onClick={() => handleStatusChange(status)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                    item.status === status
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-line bg-white text-muted hover:border-clay/50 hover:text-ink'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={`/wardrobe/${id}/edit`} className="btn-primary">
              <Pencil className="h-4 w-4" /> Edit item
            </Link>
            <button className="btn-secondary text-[#B4483F]" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this item?"
        message={`"${item.itemName}" will be permanently removed from your wardrobe. This can't be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
