import type { EvmExplorer } from '../../Explorer/EvmExplorer';
import { canonicalEvmAddress } from '../../Events/address';
import { createConfirmationChecker } from '../../Events/confirmation';
import type { RawFrame } from '../../Events/EventStream';

/** Polling interval used only when the real-time event stream is unavailable. */
const FALLBACK_POLL_INTERVAL_MS = 4_000;

/** Details passed to the confirmation callback. */
export interface EvmConfirmationDetails {
  /** Transaction hash. */
  transactionId: string;
  /** Block number the transaction was included in. */
  blockHeight: number;
  /** Whether the transaction succeeded or was reverted by the EVM. */
  status: 'success' | 'reverted';
}

/**
 * Represents a transaction that has been signed and broadcast to the network.
 *
 * Use {@link onConfirmed} to register a callback that fires when the
 * transaction is confirmed on-chain. Confirmation is detected through the
 * network's real-time events (the sender address's transaction activity), so
 * the callback fires as soon as the block that includes the transaction is
 * finalized — no polling.
 *
 * @example
 * ```ts
 * const broadcasted = await tx.signAndBroadcast();
 * console.log('TX sent:', broadcasted.transactionId);
 *
 * const cancel = broadcasted.onConfirmed((details) => {
 *   console.log('Confirmed in block', details.blockHeight);
 *   console.log('Status:', details.status);
 * });
 *
 * // Stop waiting for confirmation at any time:
 * cancel();
 * ```
 */
export class BroadcastedEvmTransaction {
  /** The transaction hash returned by the network. */
  public readonly transactionId: string;

  private readonly explorer: EvmExplorer;
  private readonly fromAddress: string | null;
  private confirmationDetails: EvmConfirmationDetails | null = null;
  private callbacks: Array<(details: EvmConfirmationDetails) => void> = [];
  /** Stops the active confirmation watcher, when one is running. */
  private stopWatching: (() => void) | null = null;

  /** @internal */
  constructor(transactionId: string, explorer: EvmExplorer, fromAddress: string | null = null) {
    this.transactionId = transactionId;
    this.explorer = explorer;
    this.fromAddress = fromAddress;
  }

  /**
   * Registers a callback to be invoked when the transaction is confirmed.
   *
   * - If the transaction is already confirmed, the callback fires immediately
   *   (asynchronously, in the next microtask).
   * - Multiple callbacks can be registered; they all fire once on confirmation.
   * - Confirmation tracking starts on the first call and stops after
   *   confirmation or once every callback has been cancelled.
   *
   * @param callback - Function invoked with confirmation details.
   * @returns A function that, when called, removes this callback and stops
   *          tracking if no other callbacks remain.
   */
  public onConfirmed(callback: (details: EvmConfirmationDetails) => void): () => void {
    // Already confirmed — fire immediately, return a no-op cancel.
    if (this.confirmationDetails) {
      Promise.resolve().then(() => callback(this.confirmationDetails!));
      return () => {};
    }

    this.callbacks.push(callback);
    if (!this.stopWatching) this.stopWatching = this.watch();

    let removed = false;
    return () => {
      if (removed) return;
      removed = true;

      const idx = this.callbacks.indexOf(callback);
      if (idx !== -1) this.callbacks.splice(idx, 1);

      if (this.callbacks.length === 0 && this.stopWatching) {
        const stop = this.stopWatching;
        this.stopWatching = null;
        stop();
      }
    };
  }

  /**
   * Follows the sender address's confirmed activity: each new block in which
   * the address appears triggers one transaction lookup. A lookup also runs
   * once the subscription is acknowledged (and again after every reconnection)
   * to cover a confirmation that happened in between. Without a sender
   * address, every new block triggers a lookup instead; when the event stream
   * cannot be used at all, polling takes over.
   */
  private watch(): () => void {
    const stops: Array<() => void> = [];
    const seenHeights = new Set<number>();
    let stopped = false;
    let polling = false;

    const stopAll = (): void => {
      if (stopped) return;
      stopped = true;
      for (const stop of stops.splice(0)) stop();
    };

    const complete = (details: EvmConfirmationDetails): void => {
      if (stopped) return;
      stopAll();
      this.stopWatching = null;
      this.confirmationDetails = details;
      this.fireCallbacks();
    };

    const checker = createConfirmationChecker(() => this.lookup(), complete);
    stops.push(() => checker.stop());

    const fallbackToPolling = (): void => {
      if (stopped || polling) return;
      polling = true;
      stops.push(this.poll(complete));
    };

    try {
      const address = this.watchedAddress();
      const sub = address
        ? this.explorer.events.subscribe(
            { channel: 'history', address },
            {
              onEvent: (frame) => {
                const height = eventHeight(frame);
                if (height === null || seenHeights.has(height)) return;
                seenHeights.add(height);
                checker.check();
              },
              onResubscribed: () => checker.check(),
            },
          )
        : this.explorer.events.subscribe(
            { channel: 'blocks' },
            { onEvent: () => checker.check(), onResubscribed: () => checker.check() },
          );
      stops.push(() => sub.unsubscribe());
      sub.ready.then(() => checker.check(), fallbackToPolling);
    } catch {
      // No WebSocket implementation available in this runtime.
      fallbackToPolling();
    }

    return stopAll;
  }

  /** The sender address in canonical form, or `null` when unknown or invalid. */
  private watchedAddress(): string | null {
    if (!this.fromAddress) return null;
    try {
      return canonicalEvmAddress(this.fromAddress);
    } catch {
      return null;
    }
  }

  /** Looks the transaction up; `null` while it is still pending. */
  private async lookup(): Promise<EvmConfirmationDetails | null> {
    const details = await this.explorer.getTransactionDetails(this.transactionId);
    // status is null/undefined while pending, 0 or 1 once mined.
    if (details.status == null) return null;
    return {
      transactionId: this.transactionId,
      blockHeight: details.blockHeight,
      status: details.status === 1 ? 'success' : 'reverted',
    };
  }

  /** Polls the explorer until confirmed or cancelled (fallback path only). */
  private poll(complete: (details: EvmConfirmationDetails) => void): () => void {
    let cancelled = false;
    const run = async (): Promise<void> => {
      while (!cancelled) {
        try {
          const details = await this.lookup();
          if (details) {
            if (!cancelled) complete(details);
            return;
          }
        } catch {
          // Transaction may not be available yet — keep polling.
        }
        if (cancelled) return;
        await sleep(FALLBACK_POLL_INTERVAL_MS);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }

  /** Invokes all registered callbacks and clears the list. */
  private fireCallbacks(): void {
    const details = this.confirmationDetails!;
    const callbacks = this.callbacks;
    this.callbacks = [];
    for (const cb of callbacks) {
      try {
        cb(details);
      } catch {
        // Swallow errors from user callbacks to avoid breaking other listeners.
      }
    }
  }
}

/** Block height carried by a confirmed-history event, if well-formed. */
function eventHeight(frame: RawFrame): number | null {
  const data = frame.data;
  if (typeof data !== 'object' || data === null) return null;
  const { height } = data as RawFrame;
  return typeof height === 'number' ? height : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
