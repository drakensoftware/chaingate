import { Seed } from './Seed';
import { HDWallet, HDKeySource, HDWalletRestoreData } from '../HDWallet';
import type { WalletSerialized } from '../../../WalletSerialized';

/**
 * HD wallet created from a binary seed.
 *
 * @example
 * ```ts
 * const wallet = new SeedWallet(new Seed(hexSeedString));
 * const key = await wallet.derive("m/44'/60'/0'/0/0");
 * ```
 */
export class SeedWallet extends HDWallet<Seed> {
  public readonly walletType = 'seed' as const;

  /** @param seed - The seed. */
  constructor(seed: Seed, restoreData?: HDWalletRestoreData) {
    super(seed, restoreData);
  }

  /** @internal */
  protected getKeySource(): HDKeySource {
    return { seed: this.secret.raw };
  }

  /** Returns the {@link Seed}. Prompts for password if encrypted. */
  async getSeed(): Promise<Seed> {
    if (!this.secret.encrypted) return this.secret;
    return this.secret.withDecrypted(() => new Seed(new Uint8Array(this.secret.raw)));
  }

  /** @internal */
  protected doSerialize(): WalletSerialized {
    return { type: 'seed', seed: this.secret.hex };
  }
}
