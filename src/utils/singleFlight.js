/**
 * Guarantees that an async task (e.g. a Firestore save) never runs twice at the
 * same time. Unlike checking a React state flag, the lock is released/acquired
 * synchronously, so two clicks in the same tick cannot both get through.
 */
export function createSingleFlight() {
  let running = false;
  return async function run(task) {
    if (running) return { skipped: true, value: undefined };
    running = true;
    try {
      return { skipped: false, value: await task() };
    } finally {
      running = false;
    }
  };
}
