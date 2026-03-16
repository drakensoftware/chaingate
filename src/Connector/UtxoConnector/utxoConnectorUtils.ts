/**
 * Shared utilities for UTXO-family connectors (UtxoConnector, BchConnector).
 *
 * These functions are extracted to avoid code duplication between connectors
 * that share identical logic for private key extraction.
 * @internal
 */

import type { Wallet } from '../../Wallet/Wallet';
import { HDWallet } from '../../Wallet/SigningWallet/HDWallet/HDWallet';
import { PrivateKeyWallet } from '../../Wallet/SigningWallet/PrivateKeyWallet/PrivateKeyWallet';
import { UnsupportedOperationError } from '../../errors';

/**
 * Creates a function that extracts the private key from the wallet.
 * @internal
 */
export function createPrivateKeyGetter(
  wallet: Wallet,
  index: number,
  derivationPath: string,
): () => Promise<Uint8Array> {
  if (wallet instanceof HDWallet) {
    const fullPath = `${derivationPath}/${index}`;
    return async () => {
      const derived = await wallet.derive(fullPath);
      return new Uint8Array(derived.privateKey.raw);
    };
  }

  if (wallet instanceof PrivateKeyWallet) {
    return async () => {
      const pk = await wallet.getPrivateKey();
      return new Uint8Array(pk.raw);
    };
  }

  throw new UnsupportedOperationError(
    `Wallet type '${wallet.walletType}' does not support signing transactions. ` +
      `A signing wallet (HD or private key) is required.`,
  );
}
