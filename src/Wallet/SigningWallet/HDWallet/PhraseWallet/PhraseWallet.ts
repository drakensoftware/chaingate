import { Phrase } from './Phrase';
import { HDWallet, HDKeySource, HDWalletRestoreData } from '../HDWallet';
import type { WalletSerialized } from '../../../WalletSerialized';

/**
 * HD wallet created from a mnemonic phrase.
 *
 * @example
 * ```ts
 * const wallet = new PhraseWallet(new Phrase('abandon abandon ... about'));
 * const key = await wallet.derive("m/44'/60'/0'/0/0");
 * ```
 */
export class PhraseWallet extends HDWallet<Phrase> {
  public readonly walletType = 'phrase' as const;

  /** @param phrase - The mnemonic phrase. */
  constructor(phrase: Phrase, restoreData?: HDWalletRestoreData) {
    super(phrase, restoreData);
  }

  /** @internal */
  protected getKeySource(): HDKeySource {
    return { seed: this.secret.getSeed().raw };
  }

  /** Returns the {@link Phrase}. Prompts for password if encrypted. */
  async getPhrase(): Promise<Phrase> {
    if (!this.secret.encrypted) return this.secret;
    return this.secret.withDecrypted(() => new Phrase(this.secret.words.join(' ')));
  }

  /** @internal */
  protected doSerialize(): WalletSerialized {
    return { type: 'phrase', phrase: this.secret.words.join(' ') };
  }
}
