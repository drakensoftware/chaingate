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
  readonly apiKey: string;
  /** @internal */
  readonly global: ChainGateGlobal;

  constructor(
    client: Client,
    network: UtxoNetwork,
    baseUrl: string,
    apiKey: string,
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
    return `${this.baseUrl}/utxo/${this.network}/logo?api_key=${this.apiKey}`;
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
}
