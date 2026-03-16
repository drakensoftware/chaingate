import type { WalletSerialized, WalletType } from './WalletSerialized';

/**
 * Base class for all wallet types. Use {@link supports} to check capabilities at runtime.
 */
export abstract class Wallet {
  /** The wallet type identifier (e.g. `'phrase'`, `'xpub'`). */
  public abstract readonly walletType: WalletType;

  /**
   * Serializes the wallet for storage. Restore later with {@link deserializeWallet}.
   */
  public abstract serialize(): Promise<WalletSerialized>;
}
