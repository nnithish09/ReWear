import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { CATEGORIES, COLORS, EMPTY_CLOTHING, OCCASIONS, SIZES, STATUSES } from '../utils/constants';
import { validateClothing } from '../utils/validation';
import { todayISO } from '../utils/format';
import { buildImageChange } from '../utils/imageChange';
import { createSingleFlight } from '../utils/singleFlight';

function Field({ label, htmlFor, error, required, children, hint }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="text-clay"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Shared by the Add and Edit pages.
 * `onSubmit(values, imageChange)` must resolve to `true` on success; when
 * `resetOnSuccess` is set the form is cleared afterwards.
 * `imageChange` is `{ imageBase64 }` (new/replacement image), `{ remove: true }`
 * (explicit removal) or `{}` (leave the stored image untouched).
 */
export default function ClothingForm({
  initialValues,
  onSubmit,
  submitLabel = 'Save item',
  resetOnSuccess = false,
  cancelTo = '/wardrobe',
}) {
  const [values, setValues] = useState({ ...EMPTY_CLOTHING, ...initialValues });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [image, setImage] = useState({ dataUrl: null, removed: false, busy: false });
  const [uploaderKey, setUploaderKey] = useState(0);
  const handleImageChange = useCallback((next) => setImage(next), []);
  const [saveOnce] = useState(createSingleFlight); // synchronous lock against double submits

  useEffect(() => {
    setValues({ ...EMPTY_CLOTHING, ...initialValues });
  }, [initialValues]);

  const setField = (name) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (image.busy) return; // wait for compression to finish
    const validationErrors = validateClothing(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstField = Object.keys(validationErrors)[0];
      document.getElementById(firstField)?.focus();
      return;
    }
    const imageChange = buildImageChange(image);

    setSubmitting(true);
    const outcome = await saveOnce(async () => {
      try {
        return (await onSubmit(values, imageChange)) === true;
      } catch {
        return false; // a thrown error is a failed save – keep everything the user entered
      }
    });
    if (outcome.skipped) return; // a save is already running
    setSubmitting(false);

    // Clear the form ONLY after a confirmed successful save.
    if (outcome.value && resetOnSuccess) {
      setValues({ ...EMPTY_CLOTHING });
      setErrors({});
      setImage({ dataUrl: null, removed: false, busy: false });
      setUploaderKey((key) => key + 1); // remounts the uploader, clearing its preview
    }
  };

  const cls = (name) => `input ${errors[name] ? 'input-error' : ''}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <Field label="Clothing name" htmlFor="itemName" error={errors.itemName} required>
            <input
              id="itemName"
              className={cls('itemName')}
              value={values.itemName}
              onChange={setField('itemName')}
              placeholder="e.g. Navy linen shirt"
              maxLength={100}
            />
          </Field>
        </div>

        <Field label="Category" htmlFor="category" error={errors.category} required>
          <select id="category" className={cls('category')} value={values.category} onChange={setField('category')}>
            <option value="">Select category</option>
            {CATEGORIES.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </Field>

        <Field label="Brand" htmlFor="brand" error={errors.brand}>
          <input
            id="brand"
            className={cls('brand')}
            value={values.brand}
            onChange={setField('brand')}
            placeholder="e.g. Zara"
            maxLength={60}
          />
        </Field>

        <Field label="Color" htmlFor="color" error={errors.color} required>
          <select id="color" className={cls('color')} value={values.color} onChange={setField('color')}>
            <option value="">Select color</option>
            {COLORS.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </Field>

        <Field label="Size" htmlFor="size" error={errors.size} required>
          <select id="size" className={cls('size')} value={values.size} onChange={setField('size')}>
            <option value="">Select size</option>
            {SIZES.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </Field>

        <Field label="Occasion" htmlFor="occasion" error={errors.occasion} required>
          <select id="occasion" className={cls('occasion')} value={values.occasion} onChange={setField('occasion')}>
            <option value="">Select occasion</option>
            {OCCASIONS.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </Field>

        <Field label="Purchase date" htmlFor="purchaseDate" error={errors.purchaseDate}>
          <input
            id="purchaseDate"
            type="date"
            max={todayISO()}
            className={cls('purchaseDate')}
            value={values.purchaseDate}
            onChange={setField('purchaseDate')}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Availability" htmlFor="status" error={errors.status} required>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Availability">
              {STATUSES.map((entry) => (
                <button
                  type="button"
                  key={entry}
                  role="radio"
                  aria-checked={values.status === entry}
                  onClick={() => setValues((current) => ({ ...current, status: entry }))}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    values.status === entry
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-line bg-white text-muted hover:border-clay/50 hover:text-ink'
                  }`}
                >
                  {entry}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="description" error={errors.description}>
            <textarea
              id="description"
              rows={4}
              className={cls('description')}
              value={values.description}
              onChange={setField('description')}
              placeholder="Fabric, fit, care notes, styling ideas…"
              maxLength={1000}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <ImageUploader key={uploaderKey} existingItem={initialValues} onChange={handleImageChange} />
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1" disabled={submitting || image.busy}>
            {submitting || image.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? 'Saving…' : image.busy ? 'Compressing image…' : submitLabel}
          </button>
          <Link to={cancelTo} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
