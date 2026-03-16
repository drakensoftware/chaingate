import { Wallet } from '../Wallet';
import type { WalletSerialized } from '../WalletSerialized';

/** Base class for read-only wallets. No private keys, no encryption. */
export abstract class ViewOnlyWallet extends Wallet {
  /** @inheritdoc */
  public abstract override serialize(): Promise<WalletSerialized>;
}
