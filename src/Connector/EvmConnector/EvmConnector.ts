import { BaseEvmConnector } from './BaseEvmConnector';
import type { CreateEvmTransactionParams } from './BaseEvmConnector';
import type { AddressOptions } from '../Connector';
import { EvmExplorer } from '../../Explorer/EvmExplorer';
import type { Wallet } from '../../Wallet/Wallet';
import type { EvmAddressHistoryResponse, EvmAddressTxCountResponse } from '../../Client';
import { Amount } from '../../utils/Amount';
import type { BaseValue } from '../../utils/Amount';
import type { EvmNetworkDescriptor } from '../../ChainGate/networks';
import { EvmTransaction } from './EvmTransaction';
import { encodeErc20Transfer } from '../../utils/abiEncode';
import { deferredSubscription } from '../../Events/deferredSubscription';
import type {
  Subscription,
  EvmBalanceEvent,
  EvmBlockEvent,
  EvmContractInteractionEvent,
  EvmFullBlockEvent,
  EvmMempoolTransactionEvent,
  EvmPendingBalanceEvent,
  EvmPendingTransactionEvent,
  EvmTransactionEvent,
} from '../../Events/types';

/**
 * Connector for Ethereum (and EVM-compatible) networks.
 *
 * For network-level operations (blocks, gas, broadcasting, contract calls,
 * tokens, NFTs, logos) use {@link EvmExplorer} via
 * `cg.explore(cg.networks.ethereum)`.
 *
 * @example
 * ```ts
 * const cg = new ChainGate();
 * const eth = cg.connect(cg.networks.ethereum, wallet);
 *
 * // Get the default address (index 0)
 * const addr = await eth.address();
 *
 * // Get address at index 3
 * const addr3 = await eth.address({ index: 3 });
 *
 * // Query balance (uses the wallet's default address)
 * const balance = await eth.addressBalance();
 *
 * // Query balance at a specific index
 * const balance3 = await eth.addressBalance({ index: 3 });
 * ```
 */
export class EvmConnector extends BaseEvmConnector<
  EvmExplorer,
  EvmNetworkDescriptor,
  EvmTransaction
> {
  /** @internal */
  constructor(wallet: Wallet, explorer: EvmExplorer, network: EvmNetworkDescriptor) {
    super(wallet, explorer, network);
  }

  protected override createTransaction(
    params: CreateEvmTransactionParams,
  ): Promise<EvmTransaction> {
    return EvmTransaction.create({ explorer: this.explorer, ...params });
  }

  /** Returns the confirmed and unconfirmed balance for this wallet's address. */
  public async addressBalance(options?: AddressOptions): Promise<{
    address: string;
    confirmed: Amount;
    unconfirmed: Amount;
  }> {
    const addr = await this.address(options);
    return this.explorer.getAddressBalance(addr);
  }

  /**
   * Returns paginated transaction history for this wallet's address.
   *
   * @param page - Pagination cursor.
   */
  public async addressHistory(
    page?: string,
    options?: AddressOptions,
  ): Promise<EvmAddressHistoryResponse> {
    const addr = await this.address(options);
    return this.explorer.getAddressHistory(addr, page);
  }

  /**
   * Returns all ERC-20/ERC-721/ERC-1155 token balances for this wallet's address.
   *
   * Each balance is an {@link Amount}. Use `isToken` and `isNFT` to distinguish types.
   */
  public async addressTokenBalances(options?: AddressOptions): Promise<Amount[]> {
    const addr = await this.address(options);
    return this.explorer.getAddressTokenBalances(addr);
  }

  /** Returns the nonce (transaction count) for this wallet's address. */
  public async addressTransactionCount(
    options?: AddressOptions,
  ): Promise<EvmAddressTxCountResponse> {
    const addr = await this.address(options);
    return this.explorer.getAddressTransactionCount(addr);
  }

  /**
   * Creates an ERC-20 token transfer transaction.
   *
   * Token decimals are resolved automatically, so only the amount
   * in human-readable units is required.
   *
   * @param contractAddress - Token contract address (with `0x` prefix).
   * @param amount - Amount of tokens in human-readable units.
   * @param toAddress - Recipient address.
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   */
  public async transferToken(
    contractAddress: string,
    amount: BaseValue,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<EvmTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const [fromAddress, tokenData] = await Promise.all([
      this.address(options),
      this.explorer.getTokenData(contractAddress),
    ]);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const decimals = tokenData.decimals ?? 0;
    const tokenAmount = Amount.fromDecimal(
      amount,
      decimals,
      { symbol: tokenData.symbol ?? '', name: tokenData.name ?? '', network: this.network.id },
      this.explorer.global.marketsCache,
    );
    const data = encodeErc20Transfer(toAddress, tokenAmount.min());

    return this.createTransaction({
      fromAddress,
      toAddress: contractAddress,
      valueWei: 0n,
      data,
      getPrivateKey,
    });
  }

  // ---------------------------------------------------------------------------
  // Real-time events
  // ---------------------------------------------------------------------------

  /** Calls `callback` for every new block on this network. See {@link EvmExplorer.onBlock}. */
  public onBlock(callback: (block: EvmBlockEvent) => void): Subscription {
    return this.explorer.onBlock(callback);
  }

  /** Calls `callback` with every new block in full. See {@link EvmExplorer.onFullBlock}. */
  public onFullBlock(callback: (block: EvmFullBlockEvent) => void): Subscription {
    return this.explorer.onFullBlock(callback);
  }

  /**
   * Calls `callback` for every pending transaction seen on this network.
   * See {@link EvmExplorer.onMempoolTransaction}.
   */
  public onMempoolTransaction(callback: (event: EvmMempoolTransactionEvent) => void): Subscription {
    return this.explorer.onMempoolTransaction(callback);
  }

  /**
   * Calls `callback` with the new confirmed balance of this wallet's address
   * after every block in which it was active. The address is derived from the
   * wallet (see {@link address}) and exposed as `subscription.address` once known.
   *
   * @example
   * ```ts
   * const sub = eth.onBalance(({ confirmed, height }) => {
   *   console.log(`Block ${height}:`, confirmed.base(), 'ETH');
   * });
   * await sub.ready;
   * console.log('Following', sub.address);
   * ```
   */
  public onBalance(
    callback: (event: EvmBalanceEvent) => void,
    options?: AddressOptions,
  ): Subscription {
    return deferredSubscription(this.address(options), (address) =>
      this.explorer.onBalance(address, callback),
    );
  }

  /**
   * Calls `callback` whenever the pending (mempool) native-balance delta of
   * this wallet's address changes. See {@link EvmExplorer.onPendingBalance}.
   */
  public onPendingBalance(
    callback: (event: EvmPendingBalanceEvent) => void,
    options?: AddressOptions,
  ): Subscription {
    return deferredSubscription(this.address(options), (address) =>
      this.explorer.onPendingBalance(address, callback),
    );
  }

  /**
   * Calls `callback` for every confirmed transaction in which this wallet's
   * address appears. See {@link EvmExplorer.onTransaction}.
   */
  public onTransaction(
    callback: (event: EvmTransactionEvent) => void,
    options?: AddressOptions,
  ): Subscription {
    return deferredSubscription(this.address(options), (address) =>
      this.explorer.onTransaction(address, callback),
    );
  }

  /**
   * Calls `callback` for every pending transaction sent from or to this
   * wallet's address. See {@link EvmExplorer.onPendingTransaction}.
   */
  public onPendingTransaction(
    callback: (event: EvmPendingTransactionEvent) => void,
    options?: AddressOptions,
  ): Subscription {
    return deferredSubscription(this.address(options), (address) =>
      this.explorer.onPendingTransaction(address, callback),
    );
  }

  /**
   * Calls `callback` each time this wallet's address interacts with a contract
   * it had not interacted with before. See {@link EvmExplorer.onContractInteraction}.
   */
  public onContractInteraction(
    callback: (event: EvmContractInteractionEvent) => void,
    options?: AddressOptions,
  ): Subscription {
    return deferredSubscription(this.address(options), (address) =>
      this.explorer.onContractInteraction(address, callback),
    );
  }

  /**
   * Registers a listener for errors of this network's real-time event
   * connection. See {@link EvmExplorer.onError}.
   *
   * @returns A function that removes the listener.
   */
  public onError(callback: (error: Error) => void): () => void {
    return this.explorer.onError(callback);
  }
}
