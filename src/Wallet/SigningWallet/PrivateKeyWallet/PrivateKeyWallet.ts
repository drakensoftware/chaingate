import { SigningWallet } from '../SigningWallet';
import type { WalletSerialized } from '../../WalletSerialized';
import { PrivateKey } from './PrivateKey';
import { PublicKey } from '../../ViewOnlyWallet/PublicKeyWallet/PublicKey';
import { bytesToHex } from '../../../utils';

/**
 * Wallet backed by a single private key (no HD derivation).
 *
 * @example
 * ```ts
 * const wallet = new PrivateKeyWallet(new PrivateKey('deadbeef...'));
 * console.log(wallet.publicKey);
 * ```
 */
export class PrivateKeyWallet extends SigningWallet<PrivateKey> {
  public readonly walletType = 'privateKey' as const;
  private readonly _publicKey: string;

  /** @param privateKey - The private key. */
  constructor(privateKey: PrivateKey) {
    super(privateKey);
    // Store the public key hex eagerly (before any encryption) so it's always available.
    // When restoring an already-encrypted wallet, the factory must supply the publicKey separately.
    this._publicKey = privateKey.encrypted ? '' : bytesToHex(privateKey.publicKey);
  }

  /** Compressed public key as hex. Available even when encrypted. */
  get publicKey(): string {
    return this._publicKey;
  }

  /** Returns the {@link PrivateKey}. Prompts for password if encrypted. */
  async getPrivateKey(): Promise<PrivateKey> {
    if (!this.secret.encrypted) return this.secret;
    return this.secret.withDecrypted(() => new PrivateKey(new Uint8Array(this.secret.raw)));
  }

  /** Returns the corresponding {@link PublicKey}. */
  async getPublicKey(): Promise<PublicKey> {
    if (this._publicKey) return new PublicKey(this._publicKey);
    return this.secret.withDecrypted(() => new PublicKey(this.secret.publicKey));
  }

  /** @internal */
  protected doSerialize(): WalletSerialized {
    return {
      type: 'privateKey',
      privateKey: this.secret.hex,
      publicKey: this._publicKey || undefined,
    };
  }
}
