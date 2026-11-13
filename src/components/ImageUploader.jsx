import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, RefreshCw, Trash2, Undo2, UploadCloud } from 'lucide-react';
import ItemImage from './ItemImage';
import {
  ACCEPTED_EXTENSIONS,
  ImageProcessingError,
  MAX_ORIGINAL_BYTES,
  formatBytes,
  processImage,
  validateImageFile,
} from '../utils/imageProcessing';

/**
 * Drag-and-drop / file-picker image field.
 *
 * - `existingItem`: the saved item being edited (null when adding).
 * - `onChange({ dataUrl, removed, busy })` reports the state the form needs:
 *     dataUrl  – compressed Base64 data URL of a newly chosen image (or null)
 *     removed  – the user explicitly removed the existing image
 *     busy     – an image is still being compressed (form must not submit)
 */
export default function ImageUploader({ existingItem = null, onChange }) {
  const inputRef = useRef(null);
  const mountedRef = useRef(true);
  const objectUrlRef = useRef(null);

  const [processed, setProcessed] = useState(null); // { dataUrl, width, height, compressedBytes, originalBytes }
  const [pendingPreview, setPendingPreview] = useState(null); // object URL shown while compressing
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [removed, setRemoved] = useState(false);
  const [dragging, setDragging] = useState(false);

  const hasExistingImage = Boolean(
    existingItem && (existingItem.imageBase64 || existingItem.imageUrl)
  );

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPendingPreview(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    onChange({ dataUrl: processed ? processed.dataUrl : null, removed, busy: processing });
  }, [processed, removed, processing, onChange]);

  const handleFile = async (file) => {
    if (!file || processing) return; // one image at a time
    setError('');

    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    releaseObjectUrl();
    objectUrlRef.current = URL.createObjectURL(file);
    setPendingPreview(objectUrlRef.current); // preview appears immediately
    setProcessing(true);
    setProgress(0.02);

    try {
      const result = await processImage(file, {
        onProgress: (value) => mountedRef.current && setProgress(value),
      });
      if (!mountedRef.current) return;
      setProcessed(result);
      setRemoved(false);
    } catch (processingError) {
      if (!mountedRef.current) return;
      setProcessed(null);
      setError(
        processingError instanceof ImageProcessingError
          ? processingError.message
          : 'Something went wrong while processing this image. Please try another one.'
      );
    } finally {
      if (mountedRef.current) {
        setProcessing(false);
        releaseObjectUrl();
      }
    }
  };

  const openPicker = () => !processing && inputRef.current?.click();

  const handleInputChange = (event) => {
    const [file] = event.target.files || [];
    event.target.value = ''; // allow re-selecting the same file
    handleFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (processing) return;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) handleFile(files[0]);
  };

  const handleRemove = () => {
    setProcessed(null);
    setError('');
    if (hasExistingImage) setRemoved(true);
  };

  const showNew = Boolean(processed) || processing;
  const showExisting = !showNew && hasExistingImage && !removed;
  const showDropzone = !showNew && !showExisting;

  const previewSrc = processing ? pendingPreview : processed?.dataUrl;

  return (
    <div>
      <p className="label">Clothing image</p>

      <input
        ref={inputRef}
        type="file"
        accept={`image/jpeg,image/png,image/webp,${ACCEPTED_EXTENSIONS}`}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Choose a clothing image"
      />

      {showDropzone && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 text-center transition ${
            dragging ? 'border-clay bg-clay-soft/60' : 'border-line bg-cream/60 hover:border-clay/60'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-clay-dark shadow-soft">
            <UploadCloud className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <div>
            <p className="text-sm font-medium">Drag &amp; drop a photo here</p>
            <p className="mt-0.5 text-xs text-muted">or choose one from your device</p>
          </div>
          <button type="button" onClick={openPicker} className="btn-secondary !py-2">
            <ImagePlus className="h-4 w-4" /> Upload image
          </button>
          {removed && hasExistingImage && (
            <button
              type="button"
              onClick={() => setRemoved(false)}
              className="btn-ghost !px-2 !py-1.5 text-xs"
            >
              <Undo2 className="h-3.5 w-3.5" /> Keep current image
            </button>
          )}
        </div>
      )}

      {(showNew || showExisting) && (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className="relative overflow-hidden rounded-xl border border-line"
        >
          {showExisting ? (
            <ItemImage item={existingItem} alt="Current clothing image" className="aspect-[4/5] w-full" />
          ) : (
            <img
              src={previewSrc}
              alt="Selected clothing preview"
              className="aspect-[4/5] w-full bg-cream object-cover"
            />
          )}

          {processing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/45 px-6 text-canvas backdrop-blur-[1px]">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm font-medium">Compressing image… {Math.round(progress * 100)}%</p>
              <div
                className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-white/30"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {processed && !processing && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-[#4C6648]" role="status">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Ready to save · {processed.width}×{processed.height}px · {formatBytes(processed.compressedBytes)}
            <span className="text-muted"> (original {formatBytes(processed.originalBytes)})</span>
          </span>
        </p>
      )}

      {showExisting && (
        <p className="mt-2 text-xs text-muted">Current image — it is kept unless you change or remove it.</p>
      )}

      {(showNew || showExisting) && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={openPicker} disabled={processing} className="btn-secondary flex-1 !py-2">
            <RefreshCw className="h-4 w-4" /> Change image
          </button>
          <button type="button" onClick={handleRemove} disabled={processing} className="btn-secondary !py-2 text-[#B4483F]">
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        </div>
      )}

      {error && (
        <p className="field-error mt-2" role="alert">
          {error}
        </p>
      )}

      <p className="mt-3 text-xs text-muted">
        JPG, PNG or WEBP · up to {formatBytes(MAX_ORIGINAL_BYTES)}. Photos are resized to 800px and compressed
        automatically before saving.
      </p>
    </div>
  );
}
