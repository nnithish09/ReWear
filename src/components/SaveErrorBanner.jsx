import { AlertTriangle } from 'lucide-react';
import { app, auth } from '../firebase/firebaseConfig';
import { getFirestoreErrorMessage } from '../utils/firebaseErrors';

/** Inline, persistent explanation of a failed save (toasts disappear too quickly). */
export default function SaveErrorBanner({ error }) {
  if (!error) return null;
  const permissionDenied = error.code === 'permission-denied';

  return (
    <div role="alert" className="rounded-xl border border-blush bg-blush-soft px-4 py-3 text-sm text-[#8A4B45]">
      <p className="flex items-start gap-2 font-medium">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Your item was not saved. Everything you entered is still here — fix the problem and try again.</span>
      </p>
      <p className="mt-1.5 pl-6">{getFirestoreErrorMessage(error)}</p>
      {permissionDenied && (
        <ul className="mt-2 list-disc space-y-0.5 pl-10 text-xs">
          <li>Open Firebase Console → Firestore Database → Rules and publish the file <code>firestore.rules</code> from this project.</li>
          <li>The first line of the published rules must be <code>rules_version = '2';</code> followed by the comment "v3".</li>
          <li>Signed-in user ID: <code>{auth?.currentUser?.uid || 'none'}</code></li>
          <li>Firebase project: <code>{app?.options?.projectId || 'unknown'}</code> (must be rewear-e70d6)</li>
        </ul>
      )}
    </div>
  );
}
