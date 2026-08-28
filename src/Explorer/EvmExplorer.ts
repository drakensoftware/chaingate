import type { Client } from '../Client/client';
import {
  getEvmNetworkAddressBalance,
  getEvmNetworkAddressHistory,
  getEvmNetworkAddressTokenBalances,
  getEvmNetworkAddressTransactionCount,
  getEvmNetworkBlockByHash,
  getEvmNetworkBlockByHeight,
  getEvmNetworkEstimateGas,
  getEvmNetworkFeeRate,
  getEvmNetworkLatestBlock,
  getEvmNetworkNetworkStatus,
  getEvmNetworkNftMetadata,
  getEvmNetworkNonce,
  getEvmNetworkTokenData,
  getEvmNetworkTransactionDetails,
  postEvmNetworkBroadcastTransaction,
  postEvmNetworkCallSmartContractFunction,
} from '../Client';
import type {
  EvmAddressHistoryResponse,
  EvmAddressTxCountResponse,
  EvmBlockResponse,
  EvmBlockByHeightResponse,
  EvmBroadcastTxResponse,
  EvmCallContractBody,
  EvmCallContractResponse,
  EvmEstimateGasResponse,
  EvmFeeRateResponse,
  EvmLatestBlockResponse,
  EvmNetworkStatusResponse,
  EvmNftMetadataResponse,
  EvmNonceResponse,
  EvmTokenDataResponse,
  EvmTxDetailsResponse,
} from '../Client';
import { Amount } from '../utils/Amount';
import type { AmountData } from '../utils/Amount';
import { NETWORKS_INFO } from '../ChainGate/networks';
import type { ChainGateGlobal } from '../ChainGate/ChainGate';
import type { EventStream, RawFrame, SubscribeRequest } from '../Events/EventStream';
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
} from '../Events/types';
import { canonicalEvmAddress } from '../Events/address';
import {
  mapEvmBalance,
  mapEvmBlock,
  mapEvmContractInteraction,
  mapEvmFullBlock,
  mapEvmMempoolTransaction,
  mapEvmPendingBalance,
  mapEvmPendingTransaction,
  mapEvmTransaction,
} from '../Events/evmEvents';

export type EvmNetwork = 'ethereum' | 'avalanche';

const EVM_DECIMALS = 18;

export class EvmExplorer {
  /** @internal */
  readonly client: Client;
  /** @internal */
  readonly network: EvmNetwork;
  /** @internal */
  readonly baseUrl: string;
  /** @internal */
  readonly apiKey: string | undefined;
  /** @internal */
  readonly global: ChainGateGlobal;

  constructor(
    client: Client,
    network: EvmNetwork,
    baseUrl: string,
    apiKey: string | undefined,
    global: ChainGateGlobal,
  ) {
    this.client = client;
    this.network = network;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.global = global;
  }

  /**
   * Creates an Amount from a raw wei bigint value.
   * @internal
   */
  public amountFromWei(wei: bigint): Amount {
    return new Amount(wei, EVM_DECIMALS, this.nativeData(), this.global.marketsCache);
  }

  /** Returns the native coin data for this network. */
  private nativeData(): AmountData {
    const info = NETWORKS_INFO[this.network];
    return {
      symbol: info.nativeToken.symbol,
      name: info.nativeToken.name,
      network: this.network,
    };
  }

  /**
   * Returns the confirmed and unconfirmed balance for an EVM address.
   *
   * The `confirmed` and `unconfirmed` fields are returned as `Amount` instances
   * with native token metadata (symbol, name, network).
   */
  public async getAddressBalance(address: string): Promise<{
    address: string;
    confirmed: Amount;
    unconfirmed: Amount;
  }> {
    const { data } = await getEvmNetworkAddressBalance({
      client: this.client,
      path: { network: this.network },
      query: { address },
      throwOnError: true,
    });
    const ad = this.nativeData();
    const cache = this.global.marketsCache;
    return {
      address: data.address,
      confirmed: new Amount(BigInt(data.confirmedWei), EVM_DECIMALS, ad, cache),
      unconfirmed: Amount.fromDecimal(data.unconfirmed, EVM_DECIMALS, ad, cache),
    };
  }

  /**
   * Returns paginated transaction history for an EVM address, including decoded
   * contract events (transfers, mints, approvals, etc.).
   */
  public async getAddressHistory(
    address: string,
    page?: string,
  ): Promise<EvmAddressHistoryResponse> {
    const { data } = await getEvmNetworkAddressHistory({
      client: this.client,
      path: { network: this.network },
      query: { address, page },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns all ERC-20/ERC-721/ERC-1155 token balances for an EVM address.
   *
   * Each balance is returned as an {@link Amount} instance. Use `isToken` and
   * `isNFT` to distinguish token types, and access `contractAddress` or
   * `ownedTokens` accordingly.
   */
  public async getAddressTokenBalances(address: string): Promise<Amount[]> {
    const { data } = await getEvmNetworkAddressTokenBalances({
      client: this.client,
      path: { network: this.network },
      query: { address },
      throwOnError: true,
    });
    return data.tokens.map((token) => {
      const decimals = token.token.decimals ?? 0;
      const ad: AmountData = {
        symbol: token.token.symbol ?? '',
        name: token.token.name ?? '',
        network: this.network,
        contractAddress: token.contractAddress,
        ownedTokens: token.ownedTokens?.map((nft) => ({ id: nft.id, uri: nft.uri })),
      };
      return new Amount(BigInt(token.balance), decimals, ad, this.global.marketsCache);
    });
  }

  /**
   * Returns the nonce (transaction count) for an EVM address.
   */
  public async getAddressTransactionCount(address: string): Promise<EvmAddressTxCountResponse> {
    const { data } = await getEvmNetworkAddressTransactionCount({
      client: this.client,
      path: { network: this.network },
      query: { address },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the next nonce to use when sending a transaction from an EVM address.
   */
  public async getNonce(address: string): Promise<EvmNonceResponse> {
    const { data } = await getEvmNetworkNonce({
      client: this.client,
      path: { network: this.network },
      query: { address },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns detailed information about a transaction by its hash.
   *
   * The `amount` field is returned as an `Amount` instance with native token metadata.
   */
  public async getTransactionDetails(transactionId: string): Promise<
    Omit<EvmTxDetailsResponse, 'amount'> & {
      amount: Amount;
    }
  > {
    const { data } = await getEvmNetworkTransactionDetails({
      client: this.client,
      path: { network: this.network },
      query: { transactionId },
      throwOnError: true,
    });
    return {
      ...data,
      amount: Amount.fromDecimal(
        data.amount,
        EVM_DECIMALS,
        this.nativeData(),
        this.global.marketsCache,
      ),
    };
  }

  /**
   * Returns block details for the given block hash.
   */
  public async getBlockByHash(blockHash: string): Promise<EvmBlockResponse> {
    const { data } = await getEvmNetworkBlockByHash({
      client: this.client,
      path: { network: this.network },
      query: { blockHash },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns block details for the given block height.
   */
  public async getBlockByHeight(blockHeight: string): Promise<EvmBlockByHeightResponse> {
    const { data } = await getEvmNetworkBlockByHeight({
      client: this.client,
      path: { network: this.network },
      query: { blockHeight },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the latest block number and hash.
   */
  public async getLatestBlock(): Promise<EvmLatestBlockResponse> {
    const { data } = await getEvmNetworkLatestBlock({
      client: this.client,
      path: { network: this.network },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Estimates the gas required for a transaction.
   */
  public async estimateGas(params: {
    addressFrom: string;
    addressTo: string;
    nonce: string;
    amount: string;
    data?: string;
  }): Promise<EvmEstimateGasResponse> {
    const { data } = await getEvmNetworkEstimateGas({
      client: this.client,
      path: { network: this.network },
      query: params,
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the current fee rate recommendations (low, normal, high, maximum).
   *
   * Each tier contains EIP-1559 fee parameters (`maxFeePerGasGwei`,
   * `maxPriorityFeePerGasGwei`) and an estimated confirmation time.
   */
  public async getFeeRate(): Promise<EvmFeeRateResponse> {
    const { data } = await getEvmNetworkFeeRate({
      client: this.client,
      path: { network: this.network },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns current network status including block time, gas usage, and fee predictions.
   */
  public async getNetworkStatus(): Promise<EvmNetworkStatusResponse> {
    const { data } = await getEvmNetworkNetworkStatus({
      client: this.client,
      path: { network: this.network },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the URL endpoint for the SVG logo of this EVM network.
   */
  public getLogoUrl(): string {
    const suffix = this.apiKey ? `?api_key=${encodeURIComponent(this.apiKey)}` : '';
    return `${this.baseUrl}/evm/${this.network}/logo${suffix}`;
  }

  /**
   * Returns metadata and on-chain information for a token contract.
   */
  public async getTokenData(contractAddress: string): Promise<EvmTokenDataResponse> {
    const { data } = await getEvmNetworkTokenData({
      client: this.client,
      path: { network: this.network },
      query: { contractAddress },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the URL endpoint for a token contract logo (PNG or SVG).
   */
  public getTokenLogoUrl(address: string): string {
    const params = new URLSearchParams({ address });
    if (this.apiKey) params.set('api_key', this.apiKey);
    return `${this.baseUrl}/evm/${this.network}/tokenLogo?${params.toString()}`;
  }

  /**
   * Returns the full decoded metadata for a specific NFT token.
   */
  public async getNftMetadata(
    contractAddress: string,
    tokenId: string,
  ): Promise<EvmNftMetadataResponse> {
    const { data } = await getEvmNetworkNftMetadata({
      client: this.client,
      path: { network: this.network },
      query: { contractAddress, tokenId },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the URL endpoint for a specific NFT token image.
   */
  public getNftImageUrl(contractAddress: string, tokenId: string): string {
    const params = new URLSearchParams({ contractAddress, tokenId });
    if (this.apiKey) params.set('api_key', this.apiKey);
    return `${this.baseUrl}/evm/${this.network}/nft/metadata/image?${params.toString()}`;
  }

  /**
   * Returns the URL endpoint for a specific NFT token animation/video.
   */
  public getNftAnimationUrl(contractAddress: string, tokenId: string): string {
    const params = new URLSearchParams({ contractAddress, tokenId });
    if (this.apiKey) params.set('api_key', this.apiKey);
    return `${this.baseUrl}/evm/${this.network}/nft/metadata/animation?${params.toString()}`;
  }

  /**
   * Broadcasts a signed raw transaction to the EVM network.
   */
  public async broadcastTransaction(transactionRaw: string): Promise<EvmBroadcastTxResponse> {
    const { data } = await postEvmNetworkBroadcastTransaction({
      client: this.client,
      path: { network: this.network },
      body: { transactionRaw },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Executes a read-only (eth_call) call against a smart contract.
   */
  public async callSmartContract(body: EvmCallContractBody): Promise<EvmCallContractResponse> {
    const { data } = await postEvmNetworkCallSmartContractFunction({
      client: this.client,
      path: { network: this.network },
      body,
      throwOnError: true,
    });
    return data;
  }

  // ---------------------------------------------------------------------------
  // Real-time events
  // ---------------------------------------------------------------------------

  /**
   * The real-time event connection of this network, shared by every explorer
   * and connector created from the same {@link ChainGate} instance.
   * @internal
   */
  get events(): EventStream {
    return this.global.eventStreams.get('evm', this.network, this.baseUrl, this.apiKey);
  }

  private subscribeEvents<T>(
    request: SubscribeRequest,
    address: string | undefined,
    map: (frame: RawFrame) => T,
    callback: (event: T) => void,
  ): Subscription {
    const sub = this.events.subscribe(request, { onEvent: (frame) => callback(map(frame)) });
    const subscription: Subscription = { unsubscribe: () => sub.unsubscribe(), ready: sub.ready };
    return address === undefined ? subscription : { ...subscription, address };
  }

  /**
   * Calls `callback` for every new block, as soon as it is finalized.
   *
   * @example
   * ```ts
   * const eth = cg.explore(cg.networks.ethereum);
   * const sub = eth.onBlock((block) => {
   *   console.log(`Block ${block.height} — ${block.numTxs} transactions`);
   * });
   *
   * // Stop receiving blocks:
   * sub.unsubscribe();
   * ```
   */
  public onBlock(callback: (block: EvmBlockEvent) => void): Subscription {
    return this.subscribeEvents({ channel: 'blocks' }, undefined, mapEvmBlock, callback);
  }

  /**
   * Calls `callback` with every new block in full — the standard JSON-RPC
   * block object with every transaction inline, exactly as the chain returns
   * it (quantities are `0x`-hex strings).
   *
   * Full blocks are large. Prefer {@link onBlock}, {@link onBalance},
   * {@link onTransaction} or {@link onContractInteraction} unless you really
   * need every transaction.
   */
  public onFullBlock(callback: (block: EvmFullBlockEvent) => void): Subscription {
    return this.subscribeEvents(
      { channel: 'blocks', full: true },
      undefined,
      mapEvmFullBlock,
      callback,
    );
  }

  /**
   * Calls `callback` with the new confirmed balance of `address` after every
   * block in which the address was active.
   *
   * @throws {@link EventSubscriptionError} if `address` is not a valid EVM address.
   *
   * @example
   * ```ts
   * eth.onBalance('0x...', async ({ confirmed, height }) => {
   *   console.log(`Block ${height}:`, confirmed.base(), 'ETH', await confirmed.toCurrency('usd'));
   * });
   * ```
   */
  public onBalance(address: string, callback: (event: EvmBalanceEvent) => void): Subscription {
    const canonical = canonicalEvmAddress(address);
    const amount = (wei: bigint) => this.amountFromWei(wei);
    return this.subscribeEvents(
      { channel: 'balance', address: canonical },
      address,
      (frame) => mapEvmBalance(frame, address, amount),
      callback,
    );
  }

  /**
   * Calls `callback` whenever the pending (mempool) native-balance delta of
   * `address` changes: a new pending transaction touches it, or one of its
   * pending transactions is mined or expires. Gas is not included and token
   * transfers are not visible until mined. Pending tracking may not be
   * available on every network; where it is not, no events arrive.
   *
   * @throws {@link EventSubscriptionError} if `address` is not a valid EVM address.
   */
  public onPendingBalance(
    address: string,
    callback: (event: EvmPendingBalanceEvent) => void,
  ): Subscription {
    const canonical = canonicalEvmAddress(address);
    const amount = (wei: bigint) => this.amountFromWei(wei);
    return this.subscribeEvents(
      { channel: 'balance', pending: true, address: canonical },
      address,
      (frame) => mapEvmPendingBalance(frame, address, amount),
      callback,
    );
  }

  /**
   * Calls `callback` for every confirmed transaction in which `address`
   * appears — as sender, recipient, or in an emitted event. The event carries
   * the block height and the transaction's position in the block; use
   * {@link getAddressHistory} to load the decoded transaction.
   *
   * @throws {@link EventSubscriptionError} if `address` is not a valid EVM address.
   *
   * @example
   * ```ts
   * eth.onTransaction('0x...', async ({ height }) => {
   *   const history = await eth.getAddressHistory('0x...');
   *   console.log(`Activity in block ${height}`, history.transactions[0]);
   * });
   * ```
   */
  public onTransaction(
    address: string,
    callback: (event: EvmTransactionEvent) => void,
  ): Subscription {
    const canonical = canonicalEvmAddress(address);
    return this.subscribeEvents(
      { channel: 'history', address: canonical },
      address,
      (frame) => mapEvmTransaction(frame, address),
      callback,
    );
  }

  /**
   * Calls `callback` for every pending (unconfirmed) transaction sent from or
   * to `address`, as soon as it is seen in the mempool. Pending tracking may
   * not be available on every network; where it is not, no events arrive.
   *
   * @throws {@link EventSubscriptionError} if `address` is not a valid EVM address.
   */
  public onPendingTransaction(
    address: string,
    callback: (event: EvmPendingTransactionEvent) => void,
  ): Subscription {
    const canonical = canonicalEvmAddress(address);
    const amount = (wei: bigint) => this.amountFromWei(wei);
    return this.subscribeEvents(
      { channel: 'history', pending: true, address: canonical },
      address,
      (frame) => mapEvmPendingTransaction(frame, address, amount),
      callback,
    );
  }

  /**
   * Calls `callback` for every pending (unconfirmed) transaction seen on this
   * network — the whole mempool, not just one address. Pending tracking may not
   * be available on every network; where it is not, no events arrive.
   */
  public onMempoolTransaction(callback: (event: EvmMempoolTransactionEvent) => void): Subscription {
    const amount = (wei: bigint) => this.amountFromWei(wei);
    return this.subscribeEvents(
      { channel: 'mempool' },
      undefined,
      (frame) => mapEvmMempoolTransaction(frame, amount),
      callback,
    );
  }

  /**
   * Calls `callback` each time `address` interacts with a contract it had not
   * interacted with before.
   *
   * @throws {@link EventSubscriptionError} if `address` is not a valid EVM address.
   */
  public onContractInteraction(
    address: string,
    callback: (event: EvmContractInteractionEvent) => void,
  ): Subscription {
    const canonical = canonicalEvmAddress(address);
    return this.subscribeEvents(
      { channel: 'contract_interactions', address: canonical },
      address,
      (frame) => mapEvmContractInteraction(frame, address),
      callback,
    );
  }

  /**
   * Registers a listener for errors of this network's real-time event
   * connection: {@link RateLimitError} / {@link RateLimitQuotaError} when the
   * server closes it for rate limiting, {@link EventSubscriptionError} when a
   * subscription is refused, {@link EventStreamError} for any other failure.
   * The connection reconnects on its own; this is for visibility only.
   *
   * @returns A function that removes the listener.
   */
  public onError(callback: (error: Error) => void): () => void {
    return this.events.onError(callback);
  }
}
