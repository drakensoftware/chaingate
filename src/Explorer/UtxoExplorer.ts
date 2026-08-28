import type { Client } from '../Client/client';
import {
  getUtxoNetworkAddressBalance,
  getUtxoNetworkAddressHistory,
  getUtxoNetworkBlockByHash,
  getUtxoNetworkBlockByHeight,
  getUtxoNetworkFeeRate,
  getUtxoNetworkLatestBlock,
  getUtxoNetworkMempool,
  getUtxoNetworkTransactionDetails,
  getUtxoNetworkUtxosByAddress,
  postUtxoNetworkBroadcastTransaction,
  postUtxoNetworkEstimateTransactionSize,
} from '../Client';
import type {
  UtxoBlockResponse,
  UtxoBlockByHeightResponse,
  UtxoBroadcastTxResponse,
  UtxoEstimateSizeBody,
  UtxoEstimateSizeResponse,
  UtxoFeeRateResponse,
  UtxoLatestBlockResponse,
  UtxoMempoolResponseSchema,
  UtxoTxDetailsResponse,
} from '../Client';
import { Amount } from '../utils/Amount';
import type { AmountData } from '../utils/Amount';
import { NETWORKS_INFO } from '../ChainGate/networks';
import type { ChainGateGlobal } from '../ChainGate/ChainGate';
import type { EventStream, RawFrame, SubscribeRequest } from '../Events/EventStream';
import type {
  Subscription,
  UtxoBalanceEvent,
  UtxoBlockEvent,
  UtxoFullBlockEvent,
  UtxoMempoolTransactionEvent,
  UtxoPendingBalanceEvent,
  UtxoPendingTransactionEvent,
  UtxoTransactionEvent,
} from '../Events/types';
import { canonicalUtxoAddress } from '../Events/address';
import {
  mapUtxoBalance,
  mapUtxoBlock,
  mapUtxoFullBlock,
  mapUtxoMempoolTransaction,
  mapUtxoPendingBalance,
  mapUtxoPendingTransaction,
  mapUtxoTransaction,
} from '../Events/utxoEvents';

export type UtxoNetwork = 'bitcoin' | 'litecoin' | 'dogecoin' | 'bitcoincash' | 'bitcointestnet';

const UTXO_DECIMALS = 8;

export class UtxoExplorer {
  /** @internal */
  readonly client: Client;
  /** @internal */
  readonly network: UtxoNetwork;
  /** @internal */
  readonly baseUrl: string;
  /** @internal */
  readonly apiKey: string | undefined;
  /** @internal */
  readonly global: ChainGateGlobal;

  constructor(
    client: Client,
    network: UtxoNetwork,
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
   * Creates an Amount from a raw satoshi bigint value.
   * @internal
   */
  public amountFromSat(sat: bigint): Amount {
    return new Amount(sat, UTXO_DECIMALS, this.nativeData(), this.global.marketsCache);
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
   * Returns the confirmed and unconfirmed balance for a UTXO address.
   *
   * The `confirmed` and `unconfirmed` fields are returned as `Amount` instances.
   */
  public async getAddressBalance(address: string): Promise<{
    address: string;
    confirmed: Amount;
    unconfirmed: Amount;
  }> {
    const { data } = await getUtxoNetworkAddressBalance({
      client: this.client,
      path: { network: this.network },
      query: { address },
      throwOnError: true,
    });
    const meta = this.nativeData();
    const cache = this.global.marketsCache;
    return {
      address: data.address,
      confirmed: new Amount(BigInt(data.confirmedSat), UTXO_DECIMALS, meta, cache),
      unconfirmed: Amount.fromDecimal(data.unconfirmed, UTXO_DECIMALS, meta, cache),
    };
  }

  /**
   * Returns paginated transaction history for a UTXO address.
   *
   * Each transaction's `amount` and `addressBalance` are returned as `Amount` instances.
   */
  public async getAddressHistory(
    address: string,
    page?: string,
  ): Promise<{
    page: number;
    transactions: Array<{
      height: number;
      txid: string;
      amount: Amount;
      addressBalance: Amount;
    }>;
  }> {
    const { data } = await getUtxoNetworkAddressHistory({
      client: this.client,
      path: { network: this.network },
      query: { address, page },
      throwOnError: true,
    });
    const meta = this.nativeData();
    const cache = this.global.marketsCache;
    return {
      page: data.page,
      transactions: data.transactions.map((tx) => ({
        height: tx.height,
        txid: tx.txid,
        amount: new Amount(BigInt(tx.amount), UTXO_DECIMALS, meta, cache),
        addressBalance: new Amount(BigInt(tx.addressBalance), UTXO_DECIMALS, meta, cache),
      })),
    };
  }

  /**
   * Returns paginated unspent transaction outputs (UTXOs) for a UTXO address.
   *
   * Each UTXO's `amount` is returned as an `Amount` instance.
   */
  public async getUtxosByAddress(
    address: string,
    page?: string,
  ): Promise<{
    address: string;
    page: number;
    utxos: Array<{
      txid: string;
      n: number;
      amount: Amount;
      height: number;
      script: string;
    }>;
  }> {
    const { data } = await getUtxoNetworkUtxosByAddress({
      client: this.client,
      path: { network: this.network },
      query: { address, page },
      throwOnError: true,
    });
    const meta = this.nativeData();
    const cache = this.global.marketsCache;
    return {
      address: data.address,
      page: data.page,
      utxos: data.utxos.map((utxo) => ({
        txid: utxo.txid,
        n: utxo.n,
        amount: Amount.fromDecimal(utxo.amount, UTXO_DECIMALS, meta, cache),
        height: utxo.height,
        script: utxo.script,
      })),
    };
  }

  /**
   * Returns detailed information about a transaction by its ID.
   *
   * The `fee`, `feePerKb`, and all input/output `amount` fields are returned as `Amount` instances.
   */
  public async getTransactionDetails(transactionId: string): Promise<
    Omit<UtxoTxDetailsResponse, 'fee' | 'feePerKb' | 'inputs' | 'outputs'> & {
      fee: Amount;
      feePerKb: Amount;
      inputs: Array<{
        address?: string | null;
        amount: Amount;
        txId?: string | null;
        n?: number | null;
        script?: string | null;
        scriptSig?: string | null;
      }>;
      outputs: Array<{
        address: string;
        amount: Amount;
        n: number;
        script: string;
      }>;
    }
  > {
    const { data } = await getUtxoNetworkTransactionDetails({
      client: this.client,
      path: { network: this.network },
      query: { transactionId },
      throwOnError: true,
    });
    const meta = this.nativeData();
    const cache = this.global.marketsCache;
    return {
      ...data,
      fee: Amount.fromDecimal(data.fee, UTXO_DECIMALS, meta, cache),
      feePerKb: Amount.fromDecimal(data.feePerKb, UTXO_DECIMALS, meta, cache),
      inputs: data.inputs.map((input) => ({
        ...input,
        amount: Amount.fromDecimal(input.amount, UTXO_DECIMALS, meta, cache),
      })),
      outputs: data.outputs.map((output) => ({
        ...output,
        amount: Amount.fromDecimal(output.amount, UTXO_DECIMALS, meta, cache),
      })),
    };
  }

  /**
   * Returns block details for the given block hash.
   */
  public async getBlockByHash(blockHash: string): Promise<UtxoBlockResponse> {
    const { data } = await getUtxoNetworkBlockByHash({
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
  public async getBlockByHeight(blockHeight: string): Promise<UtxoBlockByHeightResponse> {
    const { data } = await getUtxoNetworkBlockByHeight({
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
  public async getLatestBlock(): Promise<UtxoLatestBlockResponse> {
    const { data } = await getUtxoNetworkLatestBlock({
      client: this.client,
      path: { network: this.network },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns fee rate estimates for 4 priority tiers in satoshis per KB.
   */
  public async getFeeRate(): Promise<UtxoFeeRateResponse> {
    const { data } = await getUtxoNetworkFeeRate({
      client: this.client,
      path: { network: this.network },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns paginated mempool transaction IDs.
   */
  public async getMempool(page?: string): Promise<UtxoMempoolResponseSchema> {
    const { data } = await getUtxoNetworkMempool({
      client: this.client,
      path: { network: this.network },
      query: { page },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the URL endpoint for the SVG logo of this UTXO network.
   */
  public getLogoUrl(): string {
    const suffix = this.apiKey ? `?api_key=${encodeURIComponent(this.apiKey)}` : '';
    return `${this.baseUrl}/utxo/${this.network}/logo${suffix}`;
  }

  /**
   * Broadcasts a signed raw transaction to the UTXO network.
   */
  public async broadcastTransaction(transactionRaw: string): Promise<UtxoBroadcastTxResponse> {
    const { data } = await postUtxoNetworkBroadcastTransaction({
      client: this.client,
      path: { network: this.network },
      body: { transactionRaw },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Estimates the byte size of a transaction given inputs and outputs.
   */
  public async estimateTransactionSize(
    body: UtxoEstimateSizeBody,
  ): Promise<UtxoEstimateSizeResponse> {
    const { data } = await postUtxoNetworkEstimateTransactionSize({
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
    return this.global.eventStreams.get('utxo', this.network, this.baseUrl, this.apiKey);
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
   * const btc = cg.explore(cg.networks.bitcoin);
   * const sub = btc.onBlock((block) => {
   *   console.log(`Block ${block.height} — ${block.numTxs} transactions`);
   * });
   *
   * // Stop receiving blocks:
   * sub.unsubscribe();
   * ```
   */
  public onBlock(callback: (block: UtxoBlockEvent) => void): Subscription {
    return this.subscribeEvents({ channel: 'blocks' }, undefined, mapUtxoBlock, callback);
  }

  /**
   * Calls `callback` with every new block in full: every transaction, each
   * input with the output it spends already resolved, and every output.
   *
   * Full blocks are large. Prefer {@link onBlock}, {@link onBalance} or
   * {@link onTransaction} unless you really need every transaction.
   */
  public onFullBlock(callback: (block: UtxoFullBlockEvent) => void): Subscription {
    const amount = (sat: bigint) => this.amountFromSat(sat);
    return this.subscribeEvents(
      { channel: 'blocks', full: true },
      undefined,
      (frame) => mapUtxoFullBlock(frame, amount),
      callback,
    );
  }

  /**
   * Calls `callback` with the new confirmed balance of `address` after every
   * block that changes it.
   *
   * @throws {@link EventSubscriptionError} if `address` is not valid for this network.
   *
   * @example
   * ```ts
   * btc.onBalance('bc1q...', async ({ confirmed }) => {
   *   console.log(confirmed.base(), confirmed.symbol, await confirmed.toCurrency('usd'));
   * });
   * ```
   */
  public onBalance(address: string, callback: (event: UtxoBalanceEvent) => void): Subscription {
    const canonical = canonicalUtxoAddress(this.network, address);
    const amount = (sat: bigint) => this.amountFromSat(sat);
    return this.subscribeEvents(
      { channel: 'balance', address: canonical },
      address,
      (frame) => mapUtxoBalance(frame, address, amount),
      callback,
    );
  }

  /**
   * Calls `callback` whenever the pending (mempool) balance delta of `address`
   * changes: a new pending transaction touches it, or one of its pending
   * transactions confirms or expires. Pending tracking may not be available on
   * every network; where it is not, no events arrive.
   *
   * @throws {@link EventSubscriptionError} if `address` is not valid for this network.
   */
  public onPendingBalance(
    address: string,
    callback: (event: UtxoPendingBalanceEvent) => void,
  ): Subscription {
    const canonical = canonicalUtxoAddress(this.network, address);
    const amount = (sat: bigint) => this.amountFromSat(sat);
    return this.subscribeEvents(
      { channel: 'balance', pending: true, address: canonical },
      address,
      (frame) => mapUtxoPendingBalance(frame, address, amount),
      callback,
    );
  }

  /**
   * Calls `callback` for every confirmed transaction that changes the balance
   * of `address` — one event per transaction, with the amount received or
   * spent and the resulting balance.
   *
   * @throws {@link EventSubscriptionError} if `address` is not valid for this network.
   *
   * @example
   * ```ts
   * btc.onTransaction('bc1q...', ({ txid, received, amount }) => {
   *   console.log(received ? 'Received' : 'Sent', amount.base(), amount.symbol, txid);
   * });
   * ```
   */
  public onTransaction(
    address: string,
    callback: (event: UtxoTransactionEvent) => void,
  ): Subscription {
    const canonical = canonicalUtxoAddress(this.network, address);
    const amount = (sat: bigint) => this.amountFromSat(sat);
    return this.subscribeEvents(
      { channel: 'history', address: canonical },
      address,
      (frame) => mapUtxoTransaction(frame, address, amount),
      callback,
    );
  }

  /**
   * Calls `callback` for every pending (unconfirmed) transaction that touches
   * `address`, as soon as it is seen in the mempool. Pending tracking may not
   * be available on every network; where it is not, no events arrive.
   *
   * @throws {@link EventSubscriptionError} if `address` is not valid for this network.
   */
  public onPendingTransaction(
    address: string,
    callback: (event: UtxoPendingTransactionEvent) => void,
  ): Subscription {
    const canonical = canonicalUtxoAddress(this.network, address);
    const amount = (sat: bigint) => this.amountFromSat(sat);
    return this.subscribeEvents(
      { channel: 'history', pending: true, address: canonical },
      address,
      (frame) => mapUtxoPendingTransaction(frame, address, amount),
      callback,
    );
  }

  /**
   * Calls `callback` for every pending (unconfirmed) transaction seen on this
   * network — the whole mempool, not just one address. Pending tracking may not
   * be available on every network; where it is not, no events arrive.
   */
  public onMempoolTransaction(
    callback: (event: UtxoMempoolTransactionEvent) => void,
  ): Subscription {
    const amount = (sat: bigint) => this.amountFromSat(sat);
    return this.subscribeEvents(
      { channel: 'mempool' },
      undefined,
      (frame) => mapUtxoMempoolTransaction(frame, amount),
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
