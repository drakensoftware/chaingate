import bitcoreCash from 'bitcore-lib-cash';
import * as bchaddrjs from 'bchaddrjs';
import type { MarketsResponse } from '../../Client';
import type { TTLCache } from '../../utils/TTLCache';
import { bytesToHex } from '../../utils/encoding';
import { UnsupportedOperationError } from '../../errors';
import { signUtxoMessage, recoverUtxoPublicKey } from '../../utils/messageSigning';
import { NetworkDescriptor } from './NetworkDescriptor';
import type { NetworkInfoInternal, UtxoNetworkParams, BchAddressType } from './types';

/** A {@link NetworkDescriptor} for Bitcoin Cash specifically. */
export class BchNetworkDescriptor extends NetworkDescriptor<BchAddressType> {
  declare readonly id: 'bitcoincash';
  declare readonly networkParams: UtxoNetworkParams;

  /** @internal */
  constructor(info: NetworkInfoInternal, marketsCache: TTLCache<MarketsResponse>, apiKey: string) {
    super('bitcoincash', info, marketsCache, apiKey);
  }

  /**
   * Derives a Bitcoin Cash address from a compressed public key.
   *
   * @param publicKey - Compressed (33-byte) secp256k1 public key.
   * @param addressType - `'cashaddr'` or `'legacy'`. Defaults to the network's
   *   {@link defaultAddressType} (`'cashaddr'`).
   */
  public override publicKeyToAddress(publicKey: Uint8Array, addressType?: BchAddressType): string {
    const type = addressType ?? this.defaultAddressType;

    const publicKeyBch = new bitcoreCash.PublicKey(bytesToHex(publicKey));
    const cashAddr = bitcoreCash.Address.fromPublicKey(
      publicKeyBch,
      bitcoreCash.Networks.mainnet,
    ).toCashAddress();

    switch (type) {
      case 'cashaddr':
        return cashAddr;
      case 'legacy':
        return bchaddrjs.toLegacyAddress(cashAddr);
      default:
        throw new UnsupportedOperationError(`Unsupported BCH address type: ${type as string}`);
    }
  }

  /**
   * Signs a message using the Bitcoin Cash message signing standard.
   *
   * @param message - The message to sign (string or raw bytes).
   * @param privateKey - The 32-byte secp256k1 private key.
   * @returns The signature as a base64 string (65 bytes).
   */
  public signMessage(message: string | Uint8Array, privateKey: Uint8Array): string {
    return signUtxoMessage(message, privateKey, '\x18Bitcoin Signed Message:\n');
  }

  /**
   * Verifies a Bitcoin Cash signed message by recovering the public key and
   * comparing the derived address against the expected address.
   *
   * @param message - The original message.
   * @param signature - The base64-encoded signature (65 bytes).
   * @param address - The expected signer address (CashAddr or legacy format).
   * @returns `true` if the signature is valid.
   */
  public verifyMessage(message: string, signature: string, address: string): boolean {
    try {
      const publicKeyRaw = recoverUtxoPublicKey(
        message,
        signature,
        '\x18Bitcoin Signed Message:\n',
      );

      // Derive CashAddr from the recovered public key
      const derivedCashAddr = this.publicKeyToAddress(publicKeyRaw, 'cashaddr');
      const derivedLegacy = this.publicKeyToAddress(publicKeyRaw, 'legacy');

      // Normalize the input address to both formats for comparison
      return derivedCashAddr === address || derivedLegacy === address;
    } catch {
      return false;
    }
  }
}
