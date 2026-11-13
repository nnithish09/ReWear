/** Turns a Firestore/Firebase error into a message that is safe and useful to show. */
export function getFirestoreErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return (
        'Firestore rejected this request (permission denied). Publish the latest firestore.rules in ' +
        'Firebase Console → Firestore Database → Rules, then try again.'
      );
    case 'unauthenticated':
      return 'Your session is not active. Please sign in again.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Could not reach Firestore. Check your internet connection and try again.';
    case 'invalid-argument':
    case 'resource-exhausted':
      return 'The item could not be saved because it is too large or contains invalid data.';
    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
}
