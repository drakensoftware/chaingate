import { ViewOnlyWallet } from '../ViewOnlyWallet';
import type { WalletSerialized } from '../../WalletSerialized';
import { PublicKey } from './PublicKey';

/**
 * Read-only wallet from a single public key. No derivation, no signing.
 *
 * @example
 * ```ts
 * const wallet = new PublicKeyWallet(new PublicKey('02deadbeef...'));
 * console.log(wallet.publicKey);
 * ```
 */
export class PublicKeyWallet extends ViewOnlyWallet {
  public readonly walletType = 'publicKey' as const;
  private readonly _publicKey: PublicKey;

  /**
   * @param publicKey - The public key entity.
   */
  constructor(publicKey: PublicKey) {
    super();
    this._publicKey = publicKey;
  }

  /** The public key as hex. */
  get publicKey(): string {
    return this._publicKey.hex;
  }

  /** Returns the {@link PublicKey} entity. */
  getPublicKey(): PublicKey {
    return this._publicKey;
  }

  /** @inheritdoc */
  public async serialize(): Promise<WalletSerialized> {
    return { type: 'publicKey', publicKey: this._publicKey.hex };
  }
}
