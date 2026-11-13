import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ClothingForm from '../components/ClothingForm';
import SaveErrorBanner from '../components/SaveErrorBanner';
import { useAuth } from '../hooks/useAuth';
import { addClothing } from '../services/clothingService';
import { getFirestoreErrorMessage } from '../utils/firebaseErrors';

export default function AddClothing() {
  const { user } = useAuth();
  const [saveError, setSaveError] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);

  // Resolves to true ONLY after Firestore has confirmed the write.
  const handleSubmit = async (values, imageChange) => {
    setSaveError(null);
    try {
      const id = await addClothing(user.uid, values, imageChange);
      const name = values.itemName.trim();
      setLastAdded({ id, name });
      toast.success(`"${name}" was added to your wardrobe.`);
      return true;
    } catch (error) {
      setSaveError(error);
      toast.error(`Could not save the item: ${getFirestoreErrorMessage(error)}`);
      return false;
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link to="/wardrobe" className="btn-ghost !px-2 !py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to wardrobe
        </Link>
        <h1 className="mt-2 text-3xl">Add clothing</h1>
        <p className="text-sm text-muted">
          Fields marked * are required. The form clears after each successful save so you can add several pieces.
        </p>
      </div>

      {lastAdded && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-sage/50 bg-sage-soft px-4 py-3 text-sm text-[#4C6648]">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" /> "{lastAdded.name}" is saved in your wardrobe.
          </span>
          <Link to={`/wardrobe/${lastAdded.id}`} className="font-medium underline">View item</Link>
          <Link to="/wardrobe" className="font-medium underline">Open wardrobe</Link>
        </div>
      )}

      <SaveErrorBanner error={saveError} />

      <ClothingForm onSubmit={handleSubmit} submitLabel="Add to wardrobe" resetOnSuccess />
    </div>
  );
}
