/**
 * In-memory cache of the next nonce to use per (chainId, address).
 *
 * Bridges the gap between broadcasting a transaction and the network
 * reflecting it: when we send tx N, the cache records that the next nonce is
 * `N + 1` so a follow-up build does not collide even if the node
 * has not yet observed the broadcast.
 */
export class EvmNonceCache {
  private nextNonce = new Map<string, bigint>();

  private key(chainId: number, address: string): string {
    return `${chainId}:${address.toLowerCase()}`;
  }

  /** Returns the cached next nonce for an address, or `undefined` if untracked. */
  get(chainId: number, address: string): bigint | undefined {
    return this.nextNonce.get(this.key(chainId, address));
  }

  /**
   * Records that `usedNonce` was just consumed by a broadcast. The cache
   * advances to `usedNonce + 1` but never goes backwards.
   */
  recordUsed(chainId: number, address: string, usedNonce: bigint): void {
    const k = this.key(chainId, address);
    const next = usedNonce + 1n;
    const prev = this.nextNonce.get(k);
    if (prev === undefined || next > prev) {
      this.nextNonce.set(k, next);
    }
  }
}
