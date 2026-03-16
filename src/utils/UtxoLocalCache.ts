/**
 * A UTXO that is tracked locally (either as spent or as a new unspent change output).
 */
export interface CachedUtxo {
  txid: string;
  n: number;
  amount: bigint;
  script: Uint8Array;
}

/**
 * Local cache that tracks spent and unspent UTXOs between broadcast and API indexing.
 *
 * When a transaction is broadcast, the API may still return the spent inputs
 * (stale) and may not yet know about the new change outputs. This cache bridges
 * that gap so that successive transactions can be built immediately.
 *
 * - **Spent**: UTXOs consumed by a local broadcast. Filtered out even if the
 *   API still returns them.
 * - **Unspent**: Change outputs created by a local broadcast. Included even if
 *   the API does not know about them yet.
 *
 * When a broadcasted transaction is confirmed, {@link confirmTransaction} should
 * be called to clean up the cache entries (the API has caught up).
 */
export class UtxoLocalCache {
  /** "txid:n" → broadcastTxId that consumed the UTXO. */
  private spent = new Map<string, string>();

  /** address → locally created unspent UTXOs. */
  private unspent = new Map<string, CachedUtxo[]>();

  /**
   * Marks a UTXO as spent by a broadcast transaction.
   *
   * If the UTXO was a locally cached unspent (e.g. a change output from a
   * previous broadcast), it is also removed from the unspent set.
   */
  markSpent(txid: string, n: number, broadcastTxId: string): void {
    this.spent.set(`${txid}:${n}`, broadcastTxId);

    // Remove from unspent if present (tx2 spending tx1's change).
    for (const [address, utxos] of this.unspent) {
      const idx = utxos.findIndex((u) => u.txid === txid && u.n === n);
      if (idx !== -1) {
        utxos.splice(idx, 1);
        if (utxos.length === 0) this.unspent.delete(address);
        break;
      }
    }
  }

  /** Returns `true` if the UTXO has been marked as spent by a local broadcast. */
  isSpent(txid: string, n: number): boolean {
    return this.spent.has(`${txid}:${n}`);
  }

  /** Adds a new unspent UTXO (typically a change output from a local broadcast). */
  addUnspent(address: string, utxo: CachedUtxo): void {
    const list = this.unspent.get(address) ?? [];
    list.push(utxo);
    this.unspent.set(address, list);
  }

  /** Returns a copy of locally cached unspent UTXOs for the given address. */
  getUnspent(address: string): CachedUtxo[] {
    return [...(this.unspent.get(address) ?? [])];
  }

  /**
   * Cleans up cache entries for a confirmed broadcast transaction.
   *
   * Once the API has indexed the transaction, the local overrides are no longer
   * needed:
   * - Spent entries consumed by this broadcast are removed.
   * - Unspent entries created by this broadcast are removed.
   */
  confirmTransaction(broadcastTxId: string): void {
    // Remove spent entries that were consumed by this broadcast.
    for (const [key, txId] of this.spent) {
      if (txId === broadcastTxId) this.spent.delete(key);
    }

    // Remove unspent entries created by this broadcast.
    for (const [address, utxos] of this.unspent) {
      const filtered = utxos.filter((u) => u.txid !== broadcastTxId);
      if (filtered.length === 0) {
        this.unspent.delete(address);
      } else {
        this.unspent.set(address, filtered);
      }
    }
  }
}
