import * as btc from '@scure/btc-signer';
import type { UtxoNetwork } from '../../Explorer/UtxoExplorer';
import type { MarketsResponse } from '../../Client';
import type { TTLCache } from '../../utils/TTLCache';
import { UnsupportedOperationError } from '../../errors';
import { signUtxoMessage, recoverUtxoPublicKey } from '../../utils/messageSigning';
import { NetworkDescriptor } from './NetworkDescriptor';
import type { NetworkInfoInternal, UtxoNetworkParams, UtxoAddressType } from './types';
import type { DetailedUtxoAddressType } from './types';

/** Sign header prefix per UTXO network, matching the Bitcoin message signing standard. */
const SIGN_HEADERS: Record<string, string> = {
  bitcoin: '\x18Bitcoin Signed Message:\n',
  bitcointestnet: '\x18Bitcoin Signed Message:\n',
  litecoin: '\x19Litecoin Signed Message:\n',
  dogecoin: '\x19Dogecoin Signed Message:\n',
};

/** A {@link NetworkDescriptor} whose {@link id} is a UTXO network. */
export class UtxoNetworkDescriptor extends NetworkDescriptor<UtxoAddressType> {
  declare readonly id: UtxoNetwork;
  declare readonly networkParams: UtxoNetworkParams;

  /** @internal */
  constructor(
    id: UtxoNetwork,
    info: NetworkInfoInternal,
    marketsCache: TTLCache<MarketsResponse>,
    apiKey: string,
  ) {
    super(id, info, marketsCache, apiKey);
  }

  /**
   * Derives a UTXO address from a compressed public key.
   *
   * @param publicKey - Compressed (33-byte) secp256k1 public key.
   * @param addressType - `'segwit'`, `'legacy'`, or `'taproot'`. Defaults to
   *   the network's {@link defaultAddressType}.
   */
  public override publicKeyToAddress(publicKey: Uint8Array, addressType?: UtxoAddressType): string {
    const type = addressType ?? this.defaultAddressType;

    switch (type) {
      case 'segwit': {
        const payment = btc.p2wpkh(publicKey, this.networkParams);
        if (!payment.address) {
          throw new UnsupportedOperationError('Failed to derive segwit address.');
        }
        return payment.address;
      }
      case 'taproot': {
        // p2tr expects the x-only key (32 bytes). Strip the 0x02/0x03 prefix
        // from a compressed 33-byte key.
        const xOnly = publicKey.length === 33 ? publicKey.slice(1) : publicKey;
        const payment = btc.p2tr(xOnly, undefined, this.networkParams);
        if (!payment.address) {
          throw new UnsupportedOperationError('Failed to derive taproot address.');
        }
        return payment.address;
      }
      case 'legacy': {
        const payment = btc.p2pkh(publicKey, this.networkParams);
        if (!payment.address) {
          throw new UnsupportedOperationError('Failed to derive legacy address.');
        }
        return payment.address;
      }
      default:
        throw new UnsupportedOperationError(`Unsupported address type: ${type as string}`);
    }
  }

  /**
   * Signs a message using the Bitcoin message signing standard.
   *
   * @param message - The message to sign (string or raw bytes).
   * @param privateKey - The 32-byte secp256k1 private key.
   * @returns The signature as a base64 string (65 bytes).
   *
   * @example
   * ```ts
   * const key = await wallet.derive("m/84'/0'/0'/0/0");
   * const sig = cg.networks.bitcoin.signMessage('Hello', key.privateKey.raw);
   * ```
   */
  public signMessage(message: string | Uint8Array, privateKey: Uint8Array): string {
    const prefix = SIGN_HEADERS[this.id] ?? '\x18Bitcoin Signed Message:\n';
    return signUtxoMessage(message, privateKey, prefix);
  }

  /**
   * Verifies a Bitcoin-style signed message by recovering the public key and
   * comparing the derived address against the expected address.
   *
   * @param message - The original message.
   * @param signature - The base64-encoded signature (65 bytes).
   * @param address - The expected signer address.
   * @returns `true` if the signature is valid.
   *
   * @example
   * ```ts
   * const valid = cg.networks.bitcoin.verifyMessage('Hello', sig, 'bc1q...');
   * ```
   */
  public verifyMessage(message: string, signature: string, address: string): boolean {
    const prefix = SIGN_HEADERS[this.id] ?? '\x18Bitcoin Signed Message:\n';
    try {
      const publicKeyRaw = recoverUtxoPublicKey(message, signature, prefix);

      const detailedType = this.identifyAddressType(address);

      const addressTypeMap: Record<string, UtxoAddressType> = {
        'legacy-p2pkh': 'legacy',
        'legacy-p2pk': 'legacy',
        'segwit-p2wpkh': 'segwit',
        'taproot-p2tr': 'taproot',
      };
      const simpleType = addressTypeMap[detailedType];
      if (!simpleType) return false;

      const derivedAddress = this.publicKeyToAddress(publicKeyRaw, simpleType);
      return derivedAddress === address;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether a string is a valid address for this UTXO network.
   *
   * @param address - The address string to validate.
   * @returns `true` if the address is valid for this network.
   */
  public override isValidAddress(address: string): boolean {
    return this.identifyAddressType(address) !== 'unknown';
  }

  /**
   * Identifies the address type of a UTXO address by decoding it.
   *
   * @param address - The address to identify.
   * @returns The detailed address type, or `'unknown'` if the format is not recognized.
   *
   * @example
   * ```ts
   * cg.networks.bitcoin.identifyAddressType('bc1q...');
   * // → 'segwit-p2wpkh'
   *
   * cg.networks.bitcoin.identifyAddressType('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
   * // → 'legacy-p2pkh'
   * ```
   */
  public identifyAddressType(address: string): DetailedUtxoAddressType {
    try {
      const addr = btc.Address(this.networkParams).decode(address);
      switch (addr.type) {
        case 'pkh':
          return 'legacy-p2pkh';
        case 'sh':
          return 'legacy-p2sh';
        case 'pk':
          return 'legacy-p2pk';
        case 'ms':
          return 'legacy-p2ms';
        case 'wpkh':
          return 'segwit-p2wpkh';
        case 'wsh':
          return 'segwit-p2wsh';
        case 'tr':
          return 'taproot-p2tr';
        case 'tr_ns':
          return 'taproot-n-of-n';
        case 'tr_ms':
          return 'taproot-m-of-n';
        default:
          return 'unknown';
      }
    } catch {
      return 'unknown';
    }
  }
}
