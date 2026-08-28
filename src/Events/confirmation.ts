/**
 * On-demand confirmation checks used by the broadcasted-transaction classes.
 *
 * `check()` runs the lookup at most once at a time (a request made while one
 * is in flight is coalesced into a re-check afterwards). Lookups that throw are
 * retried a bounded number of times; a lookup that simply reports "not
 * confirmed yet" is left to the next event.
 *
 * @internal
 */

export interface ConfirmationChecker {
  /** Runs (or schedules) a confirmation lookup. */
  check(): void;
  /** Cancels any pending retry; later results are ignored. */
  stop(): void;
}

const RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 45_000];

export function createConfirmationChecker<T>(
  lookup: () => Promise<T | null>,
  onConfirmed: (result: T) => void,
  retryDelaysMs: readonly number[] = RETRY_DELAYS_MS,
): ConfirmationChecker {
  let stopped = false;
  let inFlight = false;
  let recheck = false;
  let retries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const run = (): void => {
    if (stopped) return;
    if (inFlight) {
      recheck = true;
      return;
    }
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    inFlight = true;
    lookup().then(
      (result) => {
        inFlight = false;
        retries = 0;
        if (stopped) return;
        if (result !== null) {
          stopped = true;
          onConfirmed(result);
          return;
        }
        if (recheck) {
          recheck = false;
          run();
        }
      },
      () => {
        inFlight = false;
        if (stopped) return;
        recheck = false;
        const delay = retryDelaysMs[retries];
        if (delay === undefined) return;
        retries += 1;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          run();
        }, delay);
      },
    );
  };

  return {
    check: run,
    stop: () => {
      stopped = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    },
  };
}
