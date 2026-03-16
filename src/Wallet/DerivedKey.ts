import { PrivateKey } from './SigningWallet/PrivateKeyWallet/PrivateKey';
import { DerivedPublicKey, DerivedPublicKeyData } from './DerivedPublicKey';

/** @internal */
export interface DerivedKeyData extends DerivedPublicKeyData {
  privateKey: Uint8Array;
  xpriv: string;
}

/**
 * A full key pair (public + private) derived from an HD wallet.
 * Returned by {@link HDWallet.derive}.
 */
export class DerivedKey extends DerivedPublicKey {
  private readonly _privateData: { privateKey: Uint8Array; xpriv: string };
  private _cachedPrivateKey?: PrivateKey;

  /** @internal */
  constructor(data: DerivedKeyData) {
    super({ publicKey: data.publicKey, xpub: data.xpub });
    this._privateData = { privateKey: data.privateKey, xpriv: data.xpriv };
  }

  /** The derived private key as a {@link PrivateKey}. */
  get privateKey(): PrivateKey {
    return (this._cachedPrivateKey ??= new PrivateKey(this._privateData.privateKey));
  }

  /** The extended private key (xpriv). */
  get xpriv(): string {
    return this._privateData.xpriv;
  }

  /** Zeros out the private key in memory. */
  zeroize(): void {
    this._privateData.privateKey.fill(0);
    this._cachedPrivateKey?.zeroize();
  }
}
