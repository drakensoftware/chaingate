import { Xpriv } from './Xpriv';
import { HDWallet, HDKeySource, HDWalletRestoreData } from '../HDWallet';
import type { WalletSerialized } from '../../../WalletSerialized';

/**
 * HD wallet created from an extended private key (xpriv).
 *
 * @example
 * ```ts
 * const wallet = new XprivWallet(new Xpriv('xprv9s21ZrQH143K...'));
 * const key = await wallet.derive("m/44'/60'/0'/0/0");
 * ```
 */
export class XprivWallet extends HDWallet<Xpriv> {
  public readonly walletType = 'xpriv' as const;

  /** @param xpriv - The extended private key. */
  constructor(xpriv: Xpriv, restoreData?: HDWalletRestoreData) {
    super(xpriv, restoreData);
  }

  /** @internal */
  protected getKeySource(): HDKeySource {
    return { xpriv: this.secret.key };
  }

  /** Returns the {@link Xpriv}. Prompts for password if encrypted. */
  async getXpriv(): Promise<Xpriv> {
    if (!this.secret.encrypted) return this.secret;
    return this.secret.withDecrypted(() => new Xpriv(this.secret.key));
  }

  /** @internal */
  protected doSerialize(): WalletSerialized {
    return { type: 'xpriv', xpriv: this.secret.key };
  }
}
