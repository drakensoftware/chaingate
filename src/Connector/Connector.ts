import type { Wallet } from '../Wallet/Wallet';
import type { NetworkDescriptor } from '../ChainGate/networks';

/** Options for resolving a wallet address. */
export interface AddressOptions {
  /** Address index (for HD wallets). Defaults to `0`. */
  index?: number;
  /** Base derivation path override. When omitted, the network's default for the
   *  selected address type is used. */
  derivationPath?: string;
}

/**
 * Base class for network connectors. A connector bridges a {@link Wallet} with
 * a blockchain network, providing address derivation, transaction broadcasting,
 * and other network-specific operations.
 *
 * @typeParam TWallet - The wallet type accepted by this connector.
 * @typeParam TExplorer - The explorer type used for API calls.
 * @typeParam TNetwork - The network descriptor type for this connector.
 */
export abstract class Connector<
  TWallet extends Wallet,
  TExplorer,
  TNetwork extends NetworkDescriptor = NetworkDescriptor,
> {
  protected readonly wallet: TWallet;
  protected readonly explorer: TExplorer;
  protected readonly network: TNetwork;

  /** @internal */
  constructor(wallet: TWallet, explorer: TExplorer, network: TNetwork) {
    this.wallet = wallet;
    this.explorer = explorer;
    this.network = network;
  }

  /**
   * Returns the address for this wallet on this network.
   */
  public abstract address(options?: AddressOptions): Promise<string>;
}
