import type { UtxoExplorer } from '../../Explorer/UtxoExplorer';

/** Default polling interval for confirmation checks (in milliseconds). */
const DEFAULT_POLL_INTERVAL_MS = 10_000;

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
 * transaction is confirmed on-chain.
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
  private confirmationDetails: UtxoConfirmationDetails | null = null;
  private polling = false;
  private cancelled = false;
  private callbacks: Array<(details: UtxoConfirmationDetails) => void> = [];

  /** @internal */
  constructor(transactionId: string, explorer: UtxoExplorer) {
    this.transactionId = transactionId;
    this.explorer = explorer;
  }

  /**
   * Registers a callback to be invoked when the transaction is confirmed.
   *
   * - If the transaction is already confirmed, the callback fires immediately.
   * - Multiple callbacks can be registered; they all fire once on confirmation.
   * - Polling starts automatically on the first call and stops after confirmation
   *   or when the returned `cancel` function is called.
   *
   * @param callback - Function invoked with confirmation details.
   * @returns A function that, when called, removes this callback and stops
   *          polling if no other callbacks remain.
   */
  public onConfirmed(callback: (details: UtxoConfirmationDetails) => void): () => void {
    if (this.confirmationDetails) {
      Promise.resolve().then(() => callback(this.confirmationDetails!));
      return () => {};
    }

    this.callbacks.push(callback);

    if (!this.polling && !this.cancelled) {
      this.polling = true;
      this.cancelled = false;
      this.poll();
    }

    let removed = false;
    return () => {
      if (removed) return;
      removed = true;

      const idx = this.callbacks.indexOf(callback);
      if (idx !== -1) this.callbacks.splice(idx, 1);

      if (this.callbacks.length === 0) {
        this.cancelled = true;
        this.polling = false;
      }
    };
  }

  /** Polls the explorer for transaction confirmation. */
  private async poll(): Promise<void> {
    while (!this.cancelled) {
      try {
        const details = await this.explorer.getTransactionDetails(this.transactionId);
        if (details.blockHeight != null) {
          this.explorer.global.utxoCache.confirmTransaction(this.transactionId);
          this.confirmationDetails = {
            transactionId: this.transactionId,
            blockHeight: details.blockHeight,
          };
          this.fireCallbacks();
          return;
        }
      } catch {
        // Transaction may not be indexed yet — keep polling.
      }

      if (this.cancelled) return;
      await sleep(DEFAULT_POLL_INTERVAL_MS);
    }
  }

  /** Invokes all registered callbacks and clears the list. */
  private fireCallbacks(): void {
    const details = this.confirmationDetails!;
    for (const cb of this.callbacks) {
      try {
        cb(details);
      } catch {
        // Swallow errors from user callbacks.
      }
    }
    this.callbacks = [];
    this.polling = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
