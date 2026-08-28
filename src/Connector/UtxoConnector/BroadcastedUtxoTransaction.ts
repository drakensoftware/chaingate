import type { UtxoExplorer } from '../../Explorer/UtxoExplorer';
import { canonicalUtxoAddress } from '../../Events/address';
import { createConfirmationChecker } from '../../Events/confirmation';
import type { RawFrame } from '../../Events/EventStream';

/** Polling interval used only when the real-time event stream is unavailable. */
const FALLBACK_POLL_INTERVAL_MS = 10_000;

/** Details passed to the confirmation callback. */
export interface UtxoConfirmationDetails {
  /** Transaction hash. */
  transactionId: string;
  /** Block height the transaction was included in. */
  blockHeight: number;
}

/**
 * Represents a UTXO transaction that has been signed and broadcast to the network.
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
 * });
 *
 * // Stop waiting at any time:
 * cancel();
 * ```
 */
export class BroadcastedUtxoTransaction {
  /** The transaction ID returned by the network. */
  public readonly transactionId: string;

  private readonly explorer: UtxoExplorer;
  private readonly senderAddresses: readonly string[] | null;
  private confirmationDetails: UtxoConfirmationDetails | null = null;
  private callbacks: Array<(details: UtxoConfirmationDetails) => void> = [];
  /** Stops the active confirmation watcher, when one is running. */
  private stopWatching: (() => void) | null = null;

  /** @internal */
  constructor(
    transactionId: string,
    explorer: UtxoExplorer,
    senderAddresses: readonly string[] | null = null,
  ) {
    this.transactionId = transactionId;
    this.explorer = explorer;
    this.senderAddresses = senderAddresses;
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
  public onConfirmed(callback: (details: UtxoConfirmationDetails) => void): () => void {
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
   * Follows the sender address's confirmed transactions: the event that
   * carries this transaction id confirms it without any extra request. A
   * lookup runs once the subscription is acknowledged (and again after every
   * reconnection) to cover a confirmation that happened in between. When the
   * sender addresses are unknown, every new block triggers a lookup instead;
   * when the event stream cannot be used at all, polling takes over.
   */
  private watch(): () => void {
    const txid = this.transactionId;
    const wanted = txid.toLowerCase();
    const stops: Array<() => void> = [];
    let stopped = false;
    let polling = false;

    const stopAll = (): void => {
      if (stopped) return;
      stopped = true;
      for (const stop of stops.splice(0)) stop();
    };

    const complete = (blockHeight: number): void => {
      if (stopped) return;
      stopAll();
      this.stopWatching = null;
      this.explorer.global.utxoCache.confirmTransaction(txid);
      this.confirmationDetails = { transactionId: txid, blockHeight };
      this.fireCallbacks();
    };

    const checker = createConfirmationChecker(async () => {
      const details = await this.explorer.getTransactionDetails(txid);
      return details.blockHeight != null ? details.blockHeight : null;
    }, complete);
    stops.push(() => checker.stop());

    const fallbackToPolling = (): void => {
      if (stopped || polling) return;
      polling = true;
      stops.push(this.poll(complete));
    };

    try {
      const addresses = this.watchedAddresses();
      for (const address of addresses) {
        const sub = this.explorer.events.subscribe(
          { channel: 'history', address },
          {
            onEvent: (frame) => {
              const height = confirmedHeight(frame, wanted);
              if (height !== null) complete(height);
            },
            onResubscribed: () => checker.check(),
          },
        );
        stops.push(() => sub.unsubscribe());
        sub.ready.then(() => checker.check(), fallbackToPolling);
      }

      if (addresses.length === 0) {
        const sub = this.explorer.events.subscribe(
          { channel: 'blocks' },
          { onEvent: () => checker.check(), onResubscribed: () => checker.check() },
        );
        stops.push(() => sub.unsubscribe());
        sub.ready.then(() => checker.check(), fallbackToPolling);
      }
    } catch {
      // No WebSocket implementation available in this runtime.
      fallbackToPolling();
    }

    return stopAll;
  }

  /** Sender addresses in canonical form; unparsable ones are skipped. */
  private watchedAddresses(): string[] {
    if (!this.senderAddresses) return [];
    const addresses = new Set<string>();
    for (const address of this.senderAddresses) {
      try {
        addresses.add(canonicalUtxoAddress(this.explorer.network, address));
      } catch {
        // Skip addresses the event stream cannot follow.
      }
    }
    return [...addresses];
  }

  /** Polls the explorer until confirmed or cancelled (fallback path only). */
  private poll(complete: (blockHeight: number) => void): () => void {
    let cancelled = false;
    const run = async (): Promise<void> => {
      while (!cancelled) {
        try {
          const details = await this.explorer.getTransactionDetails(this.transactionId);
          if (details.blockHeight != null) {
            if (!cancelled) complete(details.blockHeight);
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
        // Swallow errors from user callbacks.
      }
    }
  }
}

/** Height carried by a confirmed-history event for the wanted transaction, if it is one. */
function confirmedHeight(frame: RawFrame, txid: string): number | null {
  const data = frame.data;
  if (typeof data !== 'object' || data === null) return null;
  const { txid: eventTxid, height } = data as RawFrame;
  if (typeof eventTxid !== 'string' || eventTxid.toLowerCase() !== txid) return null;
  return typeof height === 'number' ? height : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
