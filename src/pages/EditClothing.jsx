import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ClothingForm from '../components/ClothingForm';
import SaveErrorBanner from '../components/SaveErrorBanner';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { getClothingById, updateClothing } from '../services/clothingService';
import { getFirestoreErrorMessage } from '../utils/firebaseErrors';

export default function EditClothing() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState(null);

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

  const handleSubmit = async (values, imageChange) => {
    setSaveError(null);
    try {
      await updateClothing(user.uid, id, values, imageChange);
      toast.success('Changes saved.');
      navigate(`/wardrobe/${id}`);
      return true;
    } catch (error) {
      setSaveError(error);
      toast.error(`Could not update the item: ${getFirestoreErrorMessage(error)}`);
      return false;
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
      <div>
        <Link to={`/wardrobe/${id}`} className="btn-ghost !px-2 !py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to item
        </Link>
        <h1 className="mt-2 text-3xl">Edit clothing</h1>
        <p className="text-sm text-muted">Update the details for “{item.itemName}”.</p>
      </div>
      <SaveErrorBanner error={saveError} />

      <ClothingForm
        initialValues={item}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        cancelTo={`/wardrobe/${id}`}
      />
    </div>
  );
}
