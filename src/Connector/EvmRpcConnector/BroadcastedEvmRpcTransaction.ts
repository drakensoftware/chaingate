import type { EvmRpcExplorer } from './EvmRpcExplorer';

/** Default polling interval for confirmation checks (in milliseconds). */
const DEFAULT_POLL_INTERVAL_MS = 4_000;

/** Details passed to the confirmation callback. */
export interface EvmRpcConfirmationDetails {
  /** Transaction hash. */
  transactionId: string;
  /** Block number the transaction was included in. */
  blockHeight: number;
  /** Whether the transaction succeeded or was reverted by the EVM. */
  status: 'success' | 'reverted';
}

/**
 * Represents a transaction that has been signed and broadcast to an EVM
 * network via a direct JSON-RPC connection.
 *
 * Use {@link onConfirmed} to register a callback that fires when the
 * transaction is confirmed on-chain. If the transaction is already confirmed
 * at the time of registration, the callback fires immediately.
 *
 * `onConfirmed` returns a `cancel` function to stop polling.
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
export class BroadcastedEvmRpcTransaction {
  /** The transaction hash returned by the network. */
  public readonly transactionId: string;

  private readonly explorer: EvmRpcExplorer;
  private confirmationDetails: EvmRpcConfirmationDetails | null = null;
  private polling = false;
  private cancelled = false;
  private callbacks: Array<(details: EvmRpcConfirmationDetails) => void> = [];

  /** @internal */
  constructor(transactionId: string, explorer: EvmRpcExplorer) {
    this.transactionId = transactionId;
    this.explorer = explorer;
  }

  /**
   * Registers a callback to be invoked when the transaction is confirmed.
   *
   * - If the transaction is already confirmed, the callback fires immediately
   *   (asynchronously, in the next microtask).
   * - Multiple callbacks can be registered; they all fire once on confirmation.
   * - Polling starts automatically on the first call and stops after confirmation
   *   or when the returned `cancel` function is called.
   *
   * @param callback - Function invoked with confirmation details.
   * @returns A function that, when called, removes this callback and stops
   *          polling if no other callbacks remain.
   */
  public onConfirmed(callback: (details: EvmRpcConfirmationDetails) => void): () => void {
    // Already confirmed — fire immediately, return a no-op cancel.
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

    // Return a cancel function scoped to this specific callback.
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;

      const idx = this.callbacks.indexOf(callback);
      if (idx !== -1) this.callbacks.splice(idx, 1);

      // If no callbacks remain, stop polling.
      if (this.callbacks.length === 0) {
        this.cancelled = true;
        this.polling = false;
      }
    };
  }

  /** Polls the RPC node for transaction confirmation until confirmed or cancelled. */
  private async poll(): Promise<void> {
    while (!this.cancelled) {
      try {
        const receipt = await this.explorer.getTransactionReceipt(this.transactionId);
        if (receipt) {
          this.confirmationDetails = {
            transactionId: this.transactionId,
            blockHeight: receipt.blockNumber,
            status: receipt.status === 1 ? 'success' : 'reverted',
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
        // Swallow errors from user callbacks to avoid breaking other listeners.
      }
    }
    this.callbacks = [];
    this.polling = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
