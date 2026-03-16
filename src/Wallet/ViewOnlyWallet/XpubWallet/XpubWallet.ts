import { HDKey } from '@scure/bip32';
import { ViewOnlyWallet } from '../ViewOnlyWallet';
import type { WalletSerialized } from '../../WalletSerialized';
import { DerivedPublicKey } from '../../DerivedPublicKey';
import { bytesToHex } from '../../../utils';
import { HDKeyNullError } from '../../errors';

/**
 * Read-only HD wallet from an extended public key (xpub). Supports derivation (non-hardened only).
 *
 * @example
 * ```ts
 * const wallet = new XpubWallet('xpub6CUGRUo...');
 * const derived = await wallet.derive("m/0/0");
 * console.log(derived.publicKeyHex);
 * ```
 */
export class XpubWallet extends ViewOnlyWallet {
  public readonly walletType = 'xpub' as const;
  private readonly _xpub: string;
  private readonly _publicKey: string;

  /** @param xpub - The extended public key string. */
  constructor(xpub: string) {
    super();
    this._xpub = xpub;
    const master = HDKey.fromExtendedKey(xpub);
    if (!master.publicKey) throw new HDKeyNullError('publicKey');
    this._publicKey = bytesToHex(master.publicKey);
  }

  /** Compressed master public key as hex string. */
  get publicKey(): string {
    return this._publicKey;
  }

  /**
   * Derives a public key at the given path (non-hardened only).
   *
   * @param derivationPath - e.g. `"m/0/0"`.
   */
  public async derive(derivationPath: string): Promise<DerivedPublicKey> {
    const master = HDKey.fromExtendedKey(this._xpub);
    const derived = derivationPath ? master.derive(derivationPath) : master;
    if (!derived.publicKey) throw new HDKeyNullError('publicKey');
    return new DerivedPublicKey({
      publicKey: derived.publicKey,
      xpub: derived.publicExtendedKey,
    });
  }

  /** @inheritdoc */
  public async serialize(): Promise<WalletSerialized> {
    return { type: 'xpub', xpub: this._xpub };
  }
}
